import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { papelDe, soAdminPode } from '@/lib/acesso';

/**
 * Faz duas coisas a cada navegação: renova a sessão do Supabase (os cookies têm
 * prazo curto) e barra quem não estiver logado.
 *
 * Chamava-se `middleware` até o Next 15. O 16 renomeou a convenção para
 * `proxy`; o comportamento é o mesmo.
 */
export async function proxy(req: NextRequest) {
  let resposta = NextResponse.next({ request: req });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll(paraGravar) {
            paraGravar.forEach(({ name, value }) => req.cookies.set(name, value));
            resposta = NextResponse.next({ request: req });
            paraGravar.forEach(({ name, value, options }) =>
              resposta.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // getUser() confere o token com o servidor do Supabase; getSession() só lê o
    // cookie e aceitaria um cookie forjado.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Esconder o item do menu não basta: o endereço digitado à mão chega aqui.
      if (soAdminPode(req.nextUrl.pathname) && papelDe(user) !== 'admin') {
        return semAlcada(req);
      }
      return resposta;
    }
  } catch {
    // Sem variáveis de ambiente, ou Supabase fora do ar. Cai no barrado abaixo:
    // é a direção segura, e melhor que devolver 500 sem explicação.
  }

  return barrar(req);
}

/**
 * Logado, mas sem alçada para esta parte.
 *
 * Não é 401: mandar entrar de novo não daria acesso nenhum, e a pessoa ficaria
 * tentando a senha achando que errou. Vai para a Visão geral, que todo mundo vê.
 */
function semAlcada(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { erro: 'Esta parte do painel é só para quem tem acesso de administrador.' },
      { status: 403 }
    );
  }

  const inicio = new URL('/painel', req.url);
  inicio.searchParams.set('semAlcada', '1');
  return NextResponse.redirect(inicio);
}

/** Quem não está logado vai para o login; rota de API recebe JSON, não página de erro. */
function barrar(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ erro: 'Sessão expirada. Entre de novo.' }, { status: 401 });
  }

  const login = new URL('/login', req.url);
  login.searchParams.set('de', req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/painel/:path*', '/api/admin/:path*', '/api/google/:path*'],
};
