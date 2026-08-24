/**
 * Limites do que chega pelas rotas abertas.
 *
 * Sem teto, um nome de cem mil letras entra no banco e reaparece em toda
 * lista, na mensagem de WhatsApp, no evento do Google e no CSV. Nenhum destes
 * limites atrapalha quem preenche de verdade.
 */
export const LIMITE = {
  nome: 120,
  telefone: 30,
  email: 160,
  peca: 60,
  descricao: 2000,
} as const;

/** Texto aparado e cortado no limite. Devolve string vazia para nulo e lixo. */
export const texto = (valor: unknown, maximo: number) =>
  String(valor ?? '').trim().slice(0, maximo);

/**
 * E-mail com cara de e-mail, em minúsculas. Devolve vazio para o resto.
 *
 * O campo é opcional e o formulário já é `type="email"`, então o que chega
 * torto veio de fora dele. Guardar mesmo assim enchia o evento do Google e o
 * histórico da cliente com texto que não é endereço de ninguém — e recusar o
 * pedido inteiro por causa de um campo que ela nem precisava preencher seria
 * pior: o pedido é o que o ateliê não pode perder.
 */
export const email = (valor: unknown) => {
  const limpo = texto(valor, LIMITE.email).toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpo) ? limpo : '';
};
