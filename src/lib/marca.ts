export const CHAVE_MARCA = 'marca';

export type Cores = {
  /** Base de corte: navegação e botões principais. */
  mata: string;
  /** Fita métrica: tempo e dinheiro. */
  fita: string;
  /** Giz: links e marcações. */
  giz: string;
  /** Alinhavo: o provisório e o que apaga. */
  linha: string;
};

export type Marca = {
  nome: string;
  logo_url: string | null;
  cores: Cores;
};

export const CORES_PADRAO: Cores = {
  mata: '#26362E',
  fita: '#E8B62C',
  giz: '#2F5FA8',
  linha: '#B4442E',
};

export const MARCA_PADRAO: Marca = {
  nome: 'Ateliê',
  logo_url: null,
  cores: CORES_PADRAO,
};

export const ROTULO_COR: Record<keyof Cores, { nome: string; explica: string }> = {
  mata: { nome: 'Base', explica: 'Menu lateral e botões principais' },
  fita: { nome: 'Fita', explica: 'Destaque de dinheiro e de datas' },
  giz: { nome: 'Giz', explica: 'Links e marcações' },
  linha: { nome: 'Alinhavo', explica: 'Pedido sem data e ações que apagam' },
};

// ---------------------------------------------------------------- cores

const HEX = /^#?([0-9a-f]{6})$/i;

/** Aceita `#26362E` ou `26362e`; devolve null se não for cor. */
export function lerHex(valor: string): [number, number, number] | null {
  const m = HEX.exec(String(valor ?? '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const normalizarHex = (valor: string, reserva: string) => {
  const rgb = lerHex(valor);
  return rgb ? `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase() : reserva;
};

const misturar = (rgb: [number, number, number], alvo: number, t: number) =>
  rgb.map((c) => Math.round(c + (alvo - c) * t)) as [number, number, number];

const clarear = (rgb: [number, number, number], t: number) => misturar(rgb, 255, t);
const escurecer = (rgb: [number, number, number], t: number) => misturar(rgb, 0, t);

/** O Tailwind precisa dos canais soltos para o `/50` de opacidade funcionar. */
const canais = (rgb: [number, number, number]) => rgb.join(' ');

/**
 * As variantes (claro, escuro) saem da cor base em vez de serem escolhidas.
 * Quem troca a marca escolhe quatro cores, não doze — e as proporções aqui
 * foram tiradas da paleta original, então o padrão continua igual ao de antes.
 */
export function variaveisDeCor(cores: Cores): Record<string, string> {
  const mata = lerHex(cores.mata) ?? lerHex(CORES_PADRAO.mata)!;
  const fita = lerHex(cores.fita) ?? lerHex(CORES_PADRAO.fita)!;
  const giz = lerHex(cores.giz) ?? lerHex(CORES_PADRAO.giz)!;
  const linha = lerHex(cores.linha) ?? lerHex(CORES_PADRAO.linha)!;

  return {
    '--cor-mata': canais(mata),
    '--cor-mata-claro': canais(clarear(mata, 0.075)),
    '--cor-mata-escuro': canais(escurecer(mata, 0.28)),
    '--cor-fita': canais(fita),
    // 0.45 e não menos: a `fita-escura` é texto sobre `fita/20` no selo
    // "Pronta", e abaixo disso o contraste não passa em AA.
    '--cor-fita-escura': canais(escurecer(fita, 0.45)),
    '--cor-giz': canais(giz),
    '--cor-giz-claro': canais(clarear(giz, 0.9)),
    '--cor-linha': canais(linha),
    '--cor-linha-clara': canais(clarear(linha, 0.9)),
  };
}

// ---------------------------------------------------------------- contraste

const PAPEL: [number, number, number] = [251, 251, 247];
const TINTA: [number, number, number] = [20, 32, 27];

/** Luminância relativa, como manda a norma de acessibilidade. */
function luminancia([r, g, b]: [number, number, number]) {
  const canal = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Quanto uma cor se destaca da outra. 1 = idênticas, 21 = preto no branco. */
export function contraste(a: [number, number, number], b: [number, number, number]) {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Mínimo da norma para texto de tamanho normal. */
export const CONTRASTE_MINIMO = 4.5;

/**
 * Contra o que cada cor precisa se destacar.
 *
 * `mata` é fundo escuro com texto claro por cima (menu, botões). `fita` é
 * fundo claro com texto escuro por cima (a fita métrica, os selos). `giz` e
 * `linha` aparecem como texto sobre o papel. Comparar todas contra a mesma
 * coisa acusaria o amarelo da fita, que é fundo e não texto.
 */
const CONTRA: Record<keyof Cores, { alvo: [number, number, number]; aviso: string }> = {
  mata: {
    alvo: PAPEL,
    aviso: 'Clara demais para o menu, onde o texto é branco por cima. Use um tom mais escuro.',
  },
  fita: {
    alvo: TINTA,
    aviso: 'Escura demais para a fita, onde o texto é escuro por cima. Use um tom mais claro.',
  },
  giz: { alvo: PAPEL, aviso: 'Clara demais: os links vão sumir no papel. Use um tom mais escuro.' },
  linha: { alvo: PAPEL, aviso: 'Clara demais: os avisos vão sumir no papel. Use um tom mais escuro.' },
};

/**
 * A cor escolhida deixa o texto legível?
 *
 * Cor bonita e ilegível é o jeito mais rápido de um ateliê estragar o próprio
 * painel sem perceber.
 */
export function avisoDeContraste(chave: keyof Cores, valor: string): string | null {
  const cor = lerHex(valor);
  if (!cor) return null;

  const { alvo, aviso } = CONTRA[chave];
  return contraste(cor, alvo) >= CONTRASTE_MINIMO ? null : aviso;
}

/** Bloco pronto para cair num `<style>` no topo da página. */
export function cssDaMarca(cores: Cores) {
  const pares = Object.entries(variaveisDeCor(cores))
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  return `:root{${pares}}`;
}
