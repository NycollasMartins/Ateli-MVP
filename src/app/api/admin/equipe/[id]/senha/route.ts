import { db } from '@/lib/supabase';
import { exigirAdmin } from '@/lib/auth';
import { enderecoDoPainel } from '@/lib/endereco';

export const dynamic = 'force-dynamic';

/**
 * Manda para a pessoa um e-mail com link para escolher outra senha.
 *
 * Antes daqui saía uma senha temporária na tela, para a administradora ditar.
 * Ditar senha é ruim de duas formas: fica anotada num papel e passa por quem
 * estiver por perto. Agora quem escolhe a senha é a dona dela, e ninguém mais
 * chega a vê-la.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const barrado = await exigirAdmin();
  if (barrado) return barrado;
  const { id } = await ctx.params;

  const { data, error: erroUsuario } = await db.auth.admin.getUserById(id);
  const email = data?.user?.email;
  if (erroUsuario || !email) {
    return Response.json({ erro: 'Não achei essa pessoa.' }, { status: 404 });
  }

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: `${enderecoDoPainel(req)}/definir-senha`,
  });

  if (error) {
    return Response.json(
      { erro: 'O e-mail não pôde ser enviado. Confira o SMTP nas opções de Authentication do Supabase.' },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, email });
}
