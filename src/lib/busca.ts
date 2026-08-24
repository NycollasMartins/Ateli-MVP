/**
 * Busca do jeito que se digita com pressa.
 *
 * Duas coisas que a busca ingênua errava e que aparecem todo dia:
 *
 * - **Acento.** "conceicao" precisa achar "Conceição". Ninguém digita acento
 *   numa busca rápida, e no teclado do celular dá ainda mais trabalho.
 * - **Formato do telefone.** O número foi salvo como `(11) 98765-4321` e ela
 *   digita `11987654321`, copiado do WhatsApp.
 */
const semAcento = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const soDigitos = (texto: string) => texto.replace(/\D/g, '');

/**
 * Quantos dígitos o termo precisa ter para valer como busca de telefone.
 * Abaixo disso, digitar "2" traria meio ateliê.
 */
const MINIMO_DE_DIGITOS = 3;

export function casaComBusca(
  termo: string,
  textos: (string | null | undefined)[],
  telefones: (string | null | undefined)[] = []
): boolean {
  const alvo = semAcento(String(termo ?? ''));
  if (!alvo) return true;

  if (textos.some((t) => t && semAcento(t).includes(alvo))) return true;

  const digitos = soDigitos(alvo);
  if (digitos.length < MINIMO_DE_DIGITOS) return false;

  return telefones.some((t) => t && soDigitos(t).includes(digitos));
}
