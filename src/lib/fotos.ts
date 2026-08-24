/** Regras das fotos da peça, iguais no navegador e no servidor. */

export const BALDE_FOTOS = 'pecas';

export const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB

/** HEIC do iPhone fica de fora: o navegador não consegue mostrar de volta. */
export const TIPOS_FOTO: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Quantas a cliente pode mandar pelo QR, e o teto por pedido no total. */
export const MAXIMO_CLIENTE = 3;
export const MAXIMO_POR_PEDIDO = 8;

/** Janela em que a cliente ainda pode anexar foto ao pedido que acabou de fazer. */
export const MINUTOS_PARA_ANEXAR = 30;

export type Foto = {
  id: string;
  url: string;
  origem: 'cliente' | 'atelie';
  criado_em: string;
};

export const tipoAceito = (tipo: string) => tipo in TIPOS_FOTO;

export const ACCEPT = Object.keys(TIPOS_FOTO).join(',');
