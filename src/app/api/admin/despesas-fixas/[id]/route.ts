import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';
import { lancarDespesasFixas } from '@/lib/despesas-fixas-servidor';

export const dynamic = 'force-dynamic';

const centavos = (v: unknown) => Math.max(0, Math.round(Number(v)) || 0);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;
  const c = await req.json().catch(() => ({}));

  const mudancas: Record<string, unknown> = {};
  if ('ativa' in c) mudancas.ativa = Boolean(c.ativa);
  if ('valor_centavos' in c) mudancas.valor_centavos = centavos(c.valor_centavos);
  if ('descricao' in c) {
    const d = String(c.descricao).trim();
    if (!d) return Response.json({ erro: 'Escreva o que se repete.' }, { status: 400 });
    mudancas.descricao = d;
  }
  if ('dia_do_mes' in c) {
    mudancas.dia_do_mes = Math.min(31, Math.max(1, Math.round(Number(c.dia_do_mes)) || 1));
  }

  const { data, error } = await db.from('despesas_fixas').update(mudancas).eq('id', id).select().single();
  if (error) return Response.json({ erro: 'Não foi possível salvar.' }, { status: 500 });

  if (mudancas.ativa === true) await lancarDespesasFixas();

  return Response.json({ fixa: data });
}

/**
 * Para de repetir daqui para frente. O que já foi lançado fica onde está:
 * são despesas que aconteceram de verdade, e apagá-las mudaria o lucro
 * de meses que já foram fechados.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;

  const { error } = await db.from('despesas_fixas').delete().eq('id', id);
  if (error) return Response.json({ erro: 'Não foi possível remover.' }, { status: 500 });
  return Response.json({ ok: true });
}
