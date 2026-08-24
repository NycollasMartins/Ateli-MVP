import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PERMITIDOS = ['nome', 'categoria', 'descricao', 'preco_centavos', 'prazo_dias', 'ativo', 'ordem'] as const;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;
  const c = await req.json().catch(() => ({}));
  const mudancas: Record<string, unknown> = {};
  for (const campo of PERMITIDOS) if (campo in c) mudancas[campo] = c[campo];

  const { data, error } = await db.from('servicos').update(mudancas).eq('id', id).select().single();
  if (error) return Response.json({ erro: 'Não foi possível salvar.' }, { status: 500 });
  return Response.json({ servico: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;
  // desativa em vez de apagar: pedidos antigos continuam com o histórico certo
  await db.from('servicos').update({ ativo: false }).eq('id', id);
  return Response.json({ ok: true });
}
