import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';
import { ehPrazoUnidade } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

const PERMITIDOS = ['nome', 'categoria', 'descricao', 'preco_centavos', 'prazo_dias', 'prazo_unidade', 'ativo', 'ordem'] as const;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;
  const c = await req.json().catch(() => ({}));
  const mudancas: Record<string, unknown> = {};
  for (const campo of PERMITIDOS) if (campo in c) mudancas[campo] = c[campo];

  // O banco recusaria pela trava do 010, mas com um 500 sem explicação. Aqui a
  // tela recebe a frase que diz o que está errado.
  if ('prazo_unidade' in mudancas && !ehPrazoUnidade(mudancas.prazo_unidade)) {
    return Response.json({ erro: 'O prazo só pode ser em horas ou em dias.' }, { status: 400 });
  }
  if ('prazo_dias' in mudancas) {
    const n = Math.round(Number(mudancas.prazo_dias));
    if (!Number.isFinite(n) || n < 1) {
      return Response.json({ erro: 'O prazo precisa ser pelo menos 1.' }, { status: 400 });
    }
    mudancas.prazo_dias = n;
  }

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
