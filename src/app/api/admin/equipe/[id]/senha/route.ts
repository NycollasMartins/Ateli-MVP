import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';
import { senhaTemporaria } from '@/lib/senha';

export const dynamic = 'force-dynamic';

/**
 * Gera uma senha nova para quem esqueceu a sua.
 * Ela volta uma vez só, para a tela mostrar e a pessoa anotar — não fica
 * guardada em lugar nenhum que dê para ler depois.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await estaLogado())) return naoAutorizado();
  const { id } = await ctx.params;

  const senha = senhaTemporaria();
  const { error } = await db.auth.admin.updateUserById(id, { password: senha });
  if (error) return Response.json({ erro: 'Não foi possível gerar a senha.' }, { status: 500 });

  return Response.json({ senha });
}
