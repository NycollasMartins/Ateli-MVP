import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';
import { removerEvento, sincronizarEvento } from '@/lib/google';
import { apagarFotosDoPedido } from '@/lib/fotos-servidor';
import { mudouARetirada } from '@/lib/lembretes';
import { liberarLembretes } from '@/lib/lembretes-servidor';
import { ehStatus, STATUS_VALIDOS } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

/** Aceita só inteiro de centavos não negativo, venha o que vier do navegador. */
const centavos = (v: unknown) => Math.max(0, Math.round(Number(v)) || 0);

const PERMITIDOS = [
  'status',
  'valor_centavos',
  'sinal_centavos',
  'pago',
  'forma_pagamento',
  'observacoes',
  'entregue_em',
  'retirada_em',
  'retirada_hora',
] as const;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;
  const corpo = await req.json().catch(() => ({}));

  const mudancas: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  for (const campo of PERMITIDOS) if (campo in corpo) mudancas[campo] = corpo[campo];

  // sem esta trava, um estado inventado é gravado e o pedido some de todos os
  // filtros da tela — a costureira perde o pedido de vista sem nenhum erro
  if ('status' in mudancas && !ehStatus(mudancas.status)) {
    return Response.json(
      { erro: `Estado inválido. Use um destes: ${STATUS_VALIDOS.join(', ')}.` },
      { status: 400 }
    );
  }

  if ('valor_centavos' in mudancas) mudancas.valor_centavos = centavos(mudancas.valor_centavos);
  if ('sinal_centavos' in mudancas) {
    const sinal = centavos(mudancas.sinal_centavos);
    // o sinal nunca passa do valor combinado
    mudancas.sinal_centavos =
      'valor_centavos' in mudancas ? Math.min(sinal, mudancas.valor_centavos as number) : sinal;
  }

  if (corpo.status === 'entregue') {
    mudancas.entregue_em = corpo.entregue_em ?? new Date().toISOString();
    if (corpo.pago) mudancas.pago_em = new Date().toISOString();
  }

  // guarda a data antiga antes de sobrescrever, para saber se ela mudou
  const precisaConferir = 'retirada_em' in mudancas || 'retirada_hora' in mudancas;
  const { data: antes } = precisaConferir
    ? await db.from('pedidos').select('retirada_em, retirada_hora').eq('id', id).maybeSingle()
    : { data: null };

  const { data: pedido, error } = await db
    .from('pedidos')
    .update(mudancas)
    .eq('id', id)
    .select('*, pedido_itens(*)')
    .single();

  if (error || !pedido) return Response.json({ erro: 'Não foi possível salvar.' }, { status: 500 });

  // data nova, avisos antigos não valem mais: a cliente precisa ser avisada de novo
  if (antes && mudouARetirada(antes, mudancas)) await liberarLembretes(id);

  try {
    if (pedido.status === 'cancelado') {
      await removerEvento(pedido.google_event_id);
      await db.from('pedidos').update({ google_event_id: null }).eq('id', id);
    } else if (pedido.retirada_em && pedido.google_event_id) {
      await sincronizarEvento(pedido, pedido.pedido_itens ?? []);
    }
  } catch {
    return Response.json({ pedido, aviso: 'Salvei aqui, mas a agenda do Google não respondeu.' });
  }

  return Response.json({ pedido });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;
  const { data: pedido } = await db.from('pedidos').select('google_event_id').eq('id', id).maybeSingle();
  await removerEvento(pedido?.google_event_id ?? null);
  // o cascade apaga as linhas, mas não os arquivos: tem que ser antes
  await apagarFotosDoPedido(id);
  await db.from('pedidos').delete().eq('id', id);
  return Response.json({ ok: true });
}
