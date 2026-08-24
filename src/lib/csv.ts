/**
 * CSV pensado para abrir no Excel em português: separador `;`, vírgula decimal
 * e BOM no começo, senão os acentos saem quebrados.
 */

const SEP = ';';

/** `-31,50` é dinheiro; `-HYPERLINK(...)` não é. */
const NUMERO = /^-?\d+(,\d{1,2})?$/;

/**
 * Uma célula de texto que começa com =, +, - ou @ é lida como fórmula pelo Excel.
 * O nome da cliente vem do formulário aberto do QR, então isso é entrada de
 * estranho: ganha um apóstrofo na frente e vira texto puro.
 *
 * Valor negativo passa direto: com o apóstrofo ele viraria texto e a planilha
 * não somaria mais a coluna.
 */
function seguro(texto: string) {
  if (NUMERO.test(texto)) return texto;
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
}

function celula(valor: string) {
  const t = seguro(String(valor ?? ''));
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** Centavos viram `1234,56`, que o Excel em pt-BR entende como número. */
export const centavosParaCSV = (c: number) => (c / 100).toFixed(2).replace('.', ',');

export function montarCSV(cabecalho: string[], linhas: string[][]) {
  const corpo = [cabecalho, ...linhas].map((l) => l.map(celula).join(SEP)).join('\r\n');
  return `﻿${corpo}\r\n`;
}

/** Entrega o arquivo para o navegador salvar. */
export function baixarCSV(nomeArquivo: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // dá tempo do download começar antes de soltar a memória
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
