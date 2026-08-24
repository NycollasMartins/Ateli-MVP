/**
 * Lê dinheiro digitado à mão e devolve centavos.
 *
 * A versão anterior apagava todos os pontos antes de converter, assumindo a
 * escrita brasileira (`1.234,56`). Quem digitasse `70.00` — o ponto é o único
 * separador que aparece em muito teclado de celular, e é o que usa quem está
 * acostumado com computador — recebia **R$ 7.000,00**, cem vezes mais, sem
 * nenhum aviso, no campo que decide quanto a cliente paga.
 *
 * A regra aqui não escolhe um formato: o **último separador manda**. Se o que
 * vem depois dele tem uma ou duas casas, ele é a vírgula decimal; qualquer
 * outra coisa é separador de milhar.
 *
 *   70        ->  R$ 70,00      1.234,56  ->  R$ 1.234,56
 *   70,00     ->  R$ 70,00      1,234.56  ->  R$ 1.234,56
 *   70.00     ->  R$ 70,00      1.234     ->  R$ 1.234,00
 *   70,5      ->  R$ 70,50      1.234.567 ->  R$ 1.234.567,00
 */
export function paraCentavos(texto: string): number {
  const limpo = String(texto ?? '').replace(/[^\d.,-]/g, '');
  if (!limpo) return 0;

  const negativo = limpo.startsWith('-');
  const digitos = limpo.replace(/-/g, '');

  const ultimoSeparador = Math.max(digitos.lastIndexOf(','), digitos.lastIndexOf('.'));
  const casasFinais = ultimoSeparador === -1 ? -1 : digitos.length - ultimoSeparador - 1;

  // uma ou duas casas depois do último separador: ele é o decimal
  const normalizado =
    casasFinais === 1 || casasFinais === 2
      ? digitos.slice(0, ultimoSeparador).replace(/[.,]/g, '') +
        '.' +
        digitos.slice(ultimoSeparador + 1)
      : digitos.replace(/[.,]/g, '');

  const n = Number(normalizado);
  if (!Number.isFinite(n)) return 0;

  return Math.round(n * 100) * (negativo ? -1 : 1);
}

/** Centavos de volta para o campo de digitação, no formato daqui. */
export const paraReais = (centavos: number) => (centavos / 100).toFixed(2).replace('.', ',');
