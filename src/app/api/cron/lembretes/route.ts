import { db } from '@/lib/supabase';
import { textoLembrete } from '@/lib/google';
import { isoDia, dataLocal, hojeNoAtelie } from '@/lib/formato';
import type { Pedido } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

async function mandarEmail(assunto: string, texto: string) {
  const chave = process.env.RESEND_API_KEY;
  const para = process.env.EMAIL_DESTINO;
  if (!chave || !para) return 'sem-email';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_REMETENTE ?? 'Ateliê <onboarding@resend.dev>',
        to: [para],
        subject: assunto,
        text: texto,
      }),
    });
    return r.ok ? 'enviado' : 'falhou';
  } catch {
    // sem isto, uma falha de rede derruba a rota inteira e os lembretes dos
    // outros pedidos daquele dia nem chegam a ser criados
    return 'falhou';
  }
}

/**
 * Só a tarefa agendada entra aqui.
 *
 * Não basta conferir o cabeçalho `x-vercel-cron`: ele não é removido de
 * requisição externa, então qualquer um poderia mandá-lo. E comparar com
 * `Bearer ${CRON_SECRET}` sem checar se o segredo existe aceitaria
 * `Bearer undefined` num projeto sem a variável preenchida.
 *
 * A Vercel manda `Authorization: Bearer $CRON_SECRET` sozinha quando a
 * variável está configurada, que é o que o README manda fazer.
 */
function podeRodar(req: Request) {
  const segredo = process.env.CRON_SECRET?.trim();
  if (!segredo) {
    console.warn('[ateliê] CRON_SECRET vazio: a rota de lembretes fica fechada até preencher.');
    return false;
  }

  const enviado = req.headers.get('authorization') ?? '';
  const esperado = `Bearer ${segredo}`;
  if (enviado.length !== esperado.length) return false;

  // comparação de tempo constante: não entrega o segredo letra a letra
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i++) {
    diferenca |= enviado.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diferenca === 0;
}

export async function GET(req: Request) {
  if (!podeRodar(req)) return Response.json({ erro: 'Sem permissão.' }, { status: 401 });

  // o dia é lido no fuso do ateliê: o servidor roda em UTC na Vercel
  const hoje = dataLocal(hojeNoAtelie())!;
  const alvos: { tipo: '72h' | '24h'; dia: string }[] = [
    { tipo: '72h', dia: isoDia(new Date(hoje.getTime() + 3 * 86_400_000)) },
    { tipo: '24h', dia: isoDia(new Date(hoje.getTime() + 1 * 86_400_000)) },
  ];

  const criados: string[] = [];
  const falharam: string[] = [];

  for (const alvo of alvos) {
    const { data: pedidos } = await db
      .from('pedidos')
      .select('*')
      .eq('retirada_em', alvo.dia)
      .in('status', ['agendado', 'pronto']);

    for (const pedido of (pedidos ?? []) as Pedido[]) {
      const { data: existe } = await db
        .from('notificacoes')
        .select('id')
        .eq('pedido_id', pedido.id)
        .eq('tipo', alvo.tipo)
        .maybeSingle();
      if (existe) continue;

      const texto = textoLembrete(pedido, alvo.tipo);
      const canal = await mandarEmail(
        alvo.tipo === '72h' ? 'Retirada em 3 dias' : 'Retirada amanhã',
        texto
      );

      // E-mail que não saiu não pode ficar anotado como dado: é justamente esta
      // linha que faz a rodada seguinte pular o pedido. Gravando o 'falhou', uma
      // queda de rede de um minuto apagava o lembrete para sempre, em silêncio.
      // Sem a linha, a próxima rodada tenta de novo.
      if (canal === 'falhou') {
        console.warn(`[ateliê] lembrete ${alvo.tipo} do pedido ${pedido.codigo} não saiu; tentarei de novo.`);
        falharam.push(`${pedido.codigo}:${alvo.tipo}`);
        continue;
      }

      await db.from('notificacoes').insert({ pedido_id: pedido.id, tipo: alvo.tipo, canal });
      criados.push(`${pedido.codigo}:${alvo.tipo}`);
    }
  }

  return Response.json({ ok: true, lembretes: criados, falharam });
}
