import { clienteDaSessao, estaLogado, naoAutorizado } from '@/lib/auth';
import { SENHA_MINIMA } from '@/lib/senha';

export const dynamic = 'force-dynamic';

/** Troca a senha de quem está logado agora. */
export async function PATCH(req: Request) {
  if (!(await estaLogado())) return naoAutorizado();

  const c = await req.json().catch(() => ({}));
  const senha = String(c.senha ?? '');

  if (senha.length < SENHA_MINIMA) {
    return Response.json(
      { erro: `A senha precisa de pelo menos ${SENHA_MINIMA} letras ou números.` },
      { status: 400 }
    );
  }

  const supabase = await clienteDaSessao();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return Response.json({ erro: 'Não foi possível trocar a senha.' }, { status: 500 });

  return Response.json({ ok: true });
}
