import { db } from '@/lib/supabase';
import { usuarioAtual, naoAutorizado, proibido } from '@/lib/auth';
import { ehPapel, papelDe, type Papel } from '@/lib/acesso';

export const dynamic = 'force-dynamic';

/** Tira o acesso de alguém. Ninguém tira o próprio, e o último admin fica. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const eu = await usuarioAtual();
  if (!eu) return naoAutorizado();
  if (papelDe(eu) !== 'admin') return proibido();

  const { id } = await ctx.params;
  if (id === eu.id) {
    return Response.json({ erro: 'Você não pode tirar o seu próprio acesso.' }, { status: 400 });
  }

  const { data: usuarios } = await db.auth.admin.listUsers({ perPage: 200 });
  const pessoas = usuarios?.users ?? [];

  if (pessoas.length <= 1) {
    return Response.json({ erro: 'Precisa sobrar pelo menos uma pessoa no painel.' }, { status: 400 });
  }

  // Sem esta conferência, tirar o último administrador deixava o painel com
  // gente dentro e ninguém capaz de dar acesso a mais alguém — a tela de
  // Equipe é justamente uma das que só o administrador abre.
  const admins = pessoas.filter((p) => papelDe(p) === 'admin');
  if (admins.length <= 1 && admins.some((p) => p.id === id)) {
    return Response.json(
      { erro: 'Precisa sobrar pelo menos um administrador. Promova outra pessoa antes.' },
      { status: 400 }
    );
  }

  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return Response.json({ erro: 'Não foi possível tirar o acesso.' }, { status: 500 });
  return Response.json({ ok: true });
}

/** Troca o papel de alguém. Ninguém rebaixa a si mesmo nem o último admin. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const eu = await usuarioAtual();
  if (!eu) return naoAutorizado();
  if (papelDe(eu) !== 'admin') return proibido();

  const { id } = await ctx.params;
  const c = await req.json().catch(() => ({}));
  if (!ehPapel(c.papel)) return Response.json({ erro: 'Papel desconhecido.' }, { status: 400 });
  const papel: Papel = c.papel;

  // Rebaixar a si mesmo tranca a pessoa para fora desta própria tela, e ela
  // não teria como se promover de volta.
  if (id === eu.id && papel !== 'admin') {
    return Response.json(
      { erro: 'Você não pode tirar o seu próprio acesso de administrador.' },
      { status: 400 }
    );
  }

  if (papel !== 'admin') {
    const { data: usuarios } = await db.auth.admin.listUsers({ perPage: 200 });
    const admins = (usuarios?.users ?? []).filter((p) => papelDe(p) === 'admin');
    if (admins.length <= 1 && admins.some((p) => p.id === id)) {
      return Response.json(
        { erro: 'Precisa sobrar pelo menos um administrador. Promova outra pessoa antes.' },
        { status: 400 }
      );
    }
  }

  const { error } = await db.auth.admin.updateUserById(id, { app_metadata: { papel } });
  if (error) return Response.json({ erro: 'Não foi possível trocar o acesso.' }, { status: 500 });

  await db.from('perfis').update({ papel }).eq('id', id);
  return Response.json({ ok: true, papel });
}
