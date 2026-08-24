import { db } from '@/lib/supabase';
import { exigirAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const centavos = (v: unknown) => Math.max(0, Math.round(Number(v)) || 0);

const PERMITIDOS = ['descricao', 'categoria', 'valor_centavos', 'data', 'observacao'] as const;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const barrado = await exigirAdmin();
  if (barrado) return barrado;
  const { id } = await ctx.params;
  const c = await req.json().catch(() => ({}));

  const mudancas: Record<string, unknown> = {};
  for (const campo of PERMITIDOS) if (campo in c) mudancas[campo] = c[campo];
  if ('valor_centavos' in mudancas) mudancas.valor_centavos = centavos(mudancas.valor_centavos);
  if ('descricao' in mudancas) {
    const d = String(mudancas.descricao ?? '').trim();
    if (!d) return Response.json({ erro: 'Escreva no que você gastou.' }, { status: 400 });
    mudancas.descricao = d;
  }

  const { data, error } = await db.from('despesas').update(mudancas).eq('id', id).select().single();
  if (error) return Response.json({ erro: 'Não foi possível salvar.' }, { status: 500 });
  return Response.json({ despesa: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const barrado = await exigirAdmin();
  if (barrado) return barrado;
  const { id } = await ctx.params;
  // despesa apagada some de vez: não há histórico de pedido preso a ela
  const { error } = await db.from('despesas').delete().eq('id', id);
  if (error) return Response.json({ erro: 'Não foi possível apagar.' }, { status: 500 });
  return Response.json({ ok: true });
}
