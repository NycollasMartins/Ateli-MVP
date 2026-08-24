import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { urlAutorizacao, COOKIE_ESTADO } from '@/lib/google';

export const dynamic = 'force-dynamic';

/**
 * Manda para a tela de permissão do Google levando um sorteio no bolso.
 *
 * O mesmo número vai no `state` da URL e num cookie curto. Na volta, os dois
 * têm de bater: é o que separa uma autorização que começou aqui de um link
 * pronto que alguém mandou para a costureira.
 */
export async function GET(req: Request) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    // relativo: o endereço que chega aqui é o interno quando há proxy na frente
    return new NextResponse(null, {
      status: 307,
      headers: { location: '/painel/agenda?erro=falta-credencial' },
    });
  }

  const estado = randomUUID();
  const resposta = NextResponse.redirect(urlAutorizacao(estado));

  resposta.cookies.set(COOKIE_ESTADO, estado, {
    httpOnly: true,
    sameSite: 'lax', // a volta do Google é navegação de topo; 'strict' perderia o cookie
    // atrás do proxy o endereço interno é http, mas o de fora é https:
    // quem sabe disso é o cabeçalho, não a URL que chega aqui
    secure: (req.headers.get('x-forwarded-proto') ?? new URL(req.url).protocol.replace(':', '')) === 'https',
    path: '/api/google',
    maxAge: 600,
  });

  return resposta;
}
