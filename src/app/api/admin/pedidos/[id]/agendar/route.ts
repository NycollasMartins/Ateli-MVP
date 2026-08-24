import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';
import { sincronizarEvento, agendaConectada } from '@/lib/google';
import { mudouARetirada } from '@/lib/lembretes';
import { liberarLembretes } from '@/lib/lembretes-servidor';

export const dynamic = 'force-dynamic';

/** Aceita só inteiro de centavos não negativo, venha o que vier do navegador. */
const centavos = (v: unknown) => Math.max(0, Math.round(Number(v)) || 0);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;
  const corpo = await req.json().catch(() => ({}));

  if (!corpo.retirada_em) return Response.json({ erro: 'Escolha o dia da retirada.' }, { status: 400 });

  const valor = centavos(corpo.valor_centavos);

  const mudancas: Record<string, unknown> = {
    retirada_em: corpo.retirada_em,
    retirada_hora: corpo.retirada_hora ?? '10:00',
    valor_centavos: valor,
    observacoes: corpo.observacoes ?? null,
    status: 'agendado',
    atualizado_em: new Date().toISOString(),
  };
  // o sinal nunca passa do valor combinado: o resto é o que ela paga na retirada
  if ('sinal_centavos' in corpo) {
    mudancas.sinal_centavos = Math.min(valor, centavos(corpo.sinal_centavos));
  }

  const { data: antes } = await db
    .from('pedidos')
    .select('retirada_em, retirada_hora')
    .eq('id', id)
    .maybeSingle();

  const { data: pedido, error } = await db
    .from('pedidos')
    .update(mudancas)
    .eq('id', id)
    .select('*, pedido_itens(*)')
    .single();

  if (error || !pedido) return Response.json({ erro: 'Não foi possível marcar a retirada.' }, { status: 500 });

  // só quando a data muda mesmo: salvar uma anotação não deve fazer o painel
  // cobrar de novo um aviso de WhatsApp que já foi dado
  if (antes && mudouARetirada(antes, mudancas)) await liberarLembretes(id);

  if (!(await agendaConectada())) {
    return Response.json({
      pedido,
      aviso: 'Retirada marcada. Conecte o Google Agenda para o evento aparecer lá.',
    });
  }

  try {
    const eventoId = await sincronizarEvento(pedido, pedido.pedido_itens ?? []);
    if (eventoId && eventoId !== pedido.google_event_id) {
      await db.from('pedidos').update({ google_event_id: eventoId }).eq('id', id);
    }
  } catch {
    return Response.json({ pedido, aviso: 'Retirada marcada, mas a agenda do Google não respondeu agora.' });
  }

  return Response.json({ pedido });
}
