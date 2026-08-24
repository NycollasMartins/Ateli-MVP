import { NextResponse, type NextRequest } from 'next/server';
import { trocarCodigoPorTokens, enderecoDeVolta, COOKIE_ESTADO } from '@/lib/google';
import { enderecoDoPainel } from '@/lib/endereco';

export const dynamic = 'force-dynamic';

/**
 * Volta para a Agenda apagando o sorteio: ele vale para uma tentativa só.
 *
 * O `Location` é relativo de propósito. Atrás de um proxy — que é como o
 * sistema roda publicado — o endereço que chega até aqui é o interno, e um
 * absoluto montado a partir dele mandaria a costureira para o localhost do
 * contêiner.
 */
function voltar(busca: string) {
  const resposta = new NextResponse(null, {
    status: 307,
    headers: { location: `/painel/agenda?${busca}` },
  });
  resposta.cookies.set(COOKIE_ESTADO, '', { path: '/api/google', maxAge: 0 });
  return resposta;
}

export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get('state');
  const esperado = req.cookies.get(COOKIE_ESTADO)?.value;

  // Sem esta conferência, bastava a costureira logada abrir um link preparado
  // para o ateliê passar a escrever as retiradas na agenda de um estranho —
  // com nome, telefone e valor de cada cliente dentro do evento.
  if (!esperado || !estado || estado !== esperado) return voltar('erro=estado');

  const code = req.nextUrl.searchParams.get('code');
  if (!code) return voltar('erro=sem-codigo');

  try {
    // o mesmo endereço de volta usado ao pedir a autorização: o Google
    // confere os dois e recusa a troca se forem diferentes
    await trocarCodigoPorTokens(code, enderecoDeVolta(enderecoDoPainel(req)));
  } catch {
    return voltar('erro=falha');
  }

  return voltar('conectado=1');
}
