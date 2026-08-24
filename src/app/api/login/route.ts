import { redirect } from 'next/navigation';
import { clienteDaSessao } from '@/lib/auth';
import { estaConfigurado } from '@/lib/configuracao';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // esta rota é o destino de um <form>, e formData() estoura sem tratamento
  // quando chega outra coisa — devolvia 500 cru, sem frase nenhuma
  const form = await req.formData().catch(() => null);
  if (!form) redirect('/login?erro=1');

  // sem as chaves, o cliente do Supabase nem chega a ser criado: melhor dizer
  // isso do que acusar a senha de quem digitou certo
  if (!estaConfigurado()) redirect('/login?config=1');

  const supabase = await clienteDaSessao();

  if (form.get('acao') === 'sair') {
    await supabase.auth.signOut();
    redirect('/login');
  }

  const email = String(form.get('email') ?? '').trim();
  const senha = String(form.get('senha') ?? '');
  const de = String(form.get('de') ?? '');

  if (!email || !senha) redirect('/login?erro=1');

  const { error } = await supabase.auth
    .signInWithPassword({ email, password: senha })
    .catch(() => ({ error: true }));
  if (error) redirect('/login?erro=1');

  // só volta para dentro do painel: `de` vem da barra de endereço
  redirect(de.startsWith('/painel') ? de : '/painel');
}
