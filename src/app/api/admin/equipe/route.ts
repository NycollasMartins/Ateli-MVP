import { db } from '@/lib/supabase';
import { exigirAdmin } from '@/lib/auth';
import { ehPapel, papelDe, type Papel } from '@/lib/acesso';
import { enderecoDoPainel } from '@/lib/endereco';

export const dynamic = 'force-dynamic';

/** Para onde o link do e-mail leva: a tela onde a pessoa escolhe a senha. */
const destinoDoConvite = (req: Request) => `${enderecoDoPainel(req)}/definir-senha`;

export async function GET() {
  const barrado = await exigirAdmin();
  if (barrado) return barrado;

  const { data: usuarios, error } = await db.auth.admin.listUsers({ perPage: 200 });
  if (error) return Response.json({ erro: 'Não foi possível carregar a equipe.' }, { status: 500 });

  const { data: perfis } = await db.from('perfis').select('id, nome');
  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome]));

  const pessoas = usuarios.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? '',
      nome: (u.user_metadata?.nome as string | undefined)?.trim() || nomes.get(u.id) || '',
      papel: papelDe(u),
      criado_em: u.created_at,
      ultimo_acesso: u.last_sign_in_at ?? null,
      // quem foi convidado e ainda não entrou aparece como pendente, para a
      // tela não deixar dúvida sobre o e-mail ter chegado ou não
      confirmado: Boolean(u.email_confirmed_at ?? u.confirmed_at),
    }))
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em));

  return Response.json({ pessoas });
}

/**
 * Convida alguém: o Supabase manda o e-mail e a pessoa escolhe a própria senha
 * no link. Ninguém aqui chega a ver a senha de ninguém — nem para ditar.
 */
export async function POST(req: Request) {
  const barrado = await exigirAdmin();
  if (barrado) return barrado;
  const c = await req.json().catch(() => ({}));

  const email = String(c.email ?? '').trim().toLowerCase();
  const nome = String(c.nome ?? '').trim();
  const papel: Papel = ehPapel(c.papel) ? c.papel : 'funcionario';

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ erro: 'Escreva um e-mail válido.' }, { status: 400 });
  }
  if (!nome) return Response.json({ erro: 'Escreva o nome da pessoa.' }, { status: 400 });

  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: destinoDoConvite(req),
  });

  if (error) {
    const jaExiste = /already|registered|exists/i.test(error.message);
    const semEnvio = /smtp|email|rate|limit/i.test(error.message);
    return Response.json(
      {
        erro: jaExiste
          ? 'Esse e-mail já entra no painel.'
          : semEnvio
            ? 'O convite não pôde ser enviado. Confira o SMTP nas opções de Authentication do Supabase.'
            : 'Não foi possível convidar essa pessoa.',
      },
      { status: jaExiste ? 409 : 500 }
    );
  }

  // O papel só vale no `app_metadata`, que a própria pessoa não consegue
  // escrever. Vai depois do convite porque é o convite que cria o usuário.
  await db.auth.admin.updateUserById(data.user.id, { app_metadata: { papel } });
  await db.from('perfis').update({ papel }).eq('id', data.user.id);

  return Response.json({ pessoa: { id: data.user.id, email, nome, papel } });
}
