import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';
import { senhaTemporaria } from '@/lib/senha';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await estaLogado())) return naoAutorizado();

  const { data: usuarios, error } = await db.auth.admin.listUsers({ perPage: 200 });
  if (error) return Response.json({ erro: 'Não foi possível carregar a equipe.' }, { status: 500 });

  const { data: perfis } = await db.from('perfis').select('id, nome');
  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome]));

  const pessoas = usuarios.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? '',
      nome: (u.user_metadata?.nome as string | undefined)?.trim() || nomes.get(u.id) || '',
      criado_em: u.created_at,
      ultimo_acesso: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em));

  return Response.json({ pessoas });
}

export async function POST(req: Request) {
  if (!(await estaLogado())) return naoAutorizado();
  const c = await req.json().catch(() => ({}));

  const email = String(c.email ?? '').trim().toLowerCase();
  const nome = String(c.nome ?? '').trim();
  if (!email.includes('@')) return Response.json({ erro: 'Escreva um e-mail válido.' }, { status: 400 });
  if (!nome) return Response.json({ erro: 'Escreva o nome da pessoa.' }, { status: 400 });

  const senha = senhaTemporaria();
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (error) {
    const jaExiste = /already|registered|exists/i.test(error.message);
    return Response.json(
      { erro: jaExiste ? 'Esse e-mail já entra no painel.' : 'Não foi possível criar o acesso.' },
      { status: jaExiste ? 409 : 500 }
    );
  }

  // a senha volta uma vez só: não fica guardada em lugar nenhum legível
  return Response.json({ pessoa: { id: data.user.id, email, nome }, senha });
}
