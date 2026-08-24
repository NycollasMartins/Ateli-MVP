import 'server-only';
/**
 * Freio simples por IP para as rotas abertas.
 * Vive na memória do processo: some a cada reinício e não é compartilhado
 * entre instâncias. Serve para conter engano e teclado nervoso, não ataque.
 */
const janelas = new Map<string, Map<string, number[]>>();

export function ipDe(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

/**
 * Esquece quem não aparece há mais de uma janela.
 *
 * Sem isto, todo IP que passou uma vez pelo formulário ficava guardado para
 * sempre. Num processo de vida longa — que é o caso fora da Vercel — a conta
 * é só de somar: o mapa cresce enquanto o servidor estiver de pé.
 */
function esquecerAntigos(janela: Map<string, number[]>, corte: number) {
  for (const [ip, marcas] of janela) {
    if (!marcas.length || marcas[marcas.length - 1] <= corte) janela.delete(ip);
  }
}

export function passouDoLimite(chave: string, ip: string, teto: number, segundos = 60) {
  const janela = janelas.get(chave) ?? new Map<string, number[]>();
  janelas.set(chave, janela);

  const agora = Date.now();
  const corte = agora - segundos * 1000;
  esquecerAntigos(janela, corte);

  const marcas = (janela.get(ip) ?? []).filter((t) => t > corte);
  marcas.push(agora);
  janela.set(ip, marcas);
  return marcas.length > teto;
}

/** Quantos IPs o freio está guardando agora. Existe para o teste provar que ele esvazia. */
export const ipsGuardados = (chave: string) => janelas.get(chave)?.size ?? 0;
