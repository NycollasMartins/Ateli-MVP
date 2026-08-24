import { db } from '@/lib/supabase';
import { usuarioAtual, naoAutorizado } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Tira o acesso de alguém. Ninguém consegue tirar o próprio. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const eu = await usuarioAtual();
  if (!eu) return naoAutorizado();

  const { id } = await ctx.params;
  if (id === eu.id) {
    return Response.json({ erro: 'Você não pode tirar o seu próprio acesso.' }, { status: 400 });
  }

  const { data: usuarios } = await db.auth.admin.listUsers({ perPage: 200 });
  if ((usuarios?.users.length ?? 0) <= 1) {
    return Response.json({ erro: 'Precisa sobrar pelo menos uma pessoa no painel.' }, { status: 400 });
  }

  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return Response.json({ erro: 'Não foi possível tirar o acesso.' }, { status: 500 });
  return Response.json({ ok: true });
}
