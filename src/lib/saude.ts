export type Situacao = 'ok' | 'atencao' | 'falta';

export type Checagem = {
  item: string;
  situacao: Situacao;
  /** O que fazer, quando não estiver ok. Frase curta, sem jargão. */
  recado: string;
};

export const ORDEM: Situacao[] = ['falta', 'atencao', 'ok'];

/** O pior estado da lista manda no resumo do alto da tela. */
export function resumoDaSaude(checagens: Checagem[]): Situacao {
  for (const s of ORDEM) if (checagens.some((c) => c.situacao === s)) return s;
  return 'ok';
}

export const contar = (checagens: Checagem[], situacao: Situacao) =>
  checagens.filter((c) => c.situacao === situacao).length;
