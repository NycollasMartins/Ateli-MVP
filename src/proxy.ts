import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

    if (user) return resposta;
  } catch {
    // Sem variáveis de ambiente, ou Supabase fora do ar. Cai no barrado abaixo:
    // é a direção segura, e melhor que devolver 500 sem explicação.
  }

  return barrar(req);
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
