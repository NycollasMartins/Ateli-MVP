/**
 * O endereço só funciona na máquina de quem instalou?
 *
 * O cartaz do QR vai impresso para a parede. Se `NEXT_PUBLIC_APP_URL` for
 * publicada com o valor de exemplo, todo cartaz aponta para um endereço que
 * ninguém alcança — e o painel não dá nenhum outro sinal, porque a variável
 * vence sobre o endereço real do site.
 */
function leAnfitriao(texto: string): string | null {
  try {
    const { hostname } = new URL(texto);
    return hostname || null;
  } catch {
    return null;
  }
}

const PRIVADOS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^192\.168\./,
  /^10\./,
  // 172.16.0.0 até 172.31.255.255
  /^172\.(1[6-9]|2\d|3[01])\./,
  /\.local$/i,
];

export function ehEnderecoDeTeste(endereco: string): boolean {
  const texto = String(endereco ?? '').trim();
  if (!texto) return false;

  // `new URL('localhost:3000')` não falha: o JavaScript lê `localhost:` como
  // esquema e `3000` como caminho, e o anfitrião sai vazio. Por isso só vale a
  // primeira leitura quando ela devolve um anfitrião de verdade.
  const anfitriao = leAnfitriao(texto) ?? leAnfitriao(`http://${texto}`);
  if (!anfitriao) return false;

  return PRIVADOS.some((p) => p.test(anfitriao));
}
