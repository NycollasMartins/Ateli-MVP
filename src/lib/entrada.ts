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
  ramal: 10,
  peca: 60,
  descricao: 2000,
} as const;

/** Texto aparado e cortado no limite. Devolve string vazia para nulo e lixo. */
export const texto = (valor: unknown, maximo: number) =>
  String(valor ?? '').trim().slice(0, maximo);

/**
 * Ramal: só os números, aparado no limite. Devolve vazio para o resto.
 *
 * O campo é opcional — o WhatsApp já é obrigatório e dá conta do contato — e
 * recusar o pedido inteiro por causa dele seria trocar o que o ateliê não pode
 * perder por um detalhe. Guardar "ramal 42 (de manhã)" também não serve: o que
 * se disca são os dígitos.
 */
export const ramal = (valor: unknown) =>
  String(valor ?? '').replace(/\D/g, '').slice(0, LIMITE.ramal);
