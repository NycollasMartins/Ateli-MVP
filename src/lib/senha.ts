/**
 * Senha temporária legível em voz alta: sem letra que se confunde com número
 * (l, i, o, 0, 1) e em blocos, porque alguém vai ditar isso para outra pessoa.
 */
export function senhaTemporaria() {
  const letras = 'abcdefghjkmnpqrstuvwxyz';
  const numeros = '23456789';
  const sorteio = (fonte: string, qtd: number) =>
    Array.from({ length: qtd }, () => fonte[Math.floor(Math.random() * fonte.length)]).join('');
  return `${sorteio(letras, 4)}-${sorteio(letras, 4)}-${sorteio(numeros, 3)}`;
}

/** O Supabase recusa abaixo de 6; 8 é o mínimo que vale pedir. */
export const SENHA_MINIMA = 8;
