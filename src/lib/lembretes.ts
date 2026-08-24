type Retirada = { retirada_em?: unknown; retirada_hora?: unknown };

const dia = (v: unknown) => (v == null ? null : String(v).slice(0, 10));
const hora = (v: unknown) => (v == null ? null : String(v).slice(0, 5));

/**
 * A retirada mudou de dia ou de hora?
 *
 * Só compara o que veio no corpo: campo ausente significa "não mexi nisso",
 * e não "apague".
 */
export function mudouARetirada(antes: Retirada, depois: Retirada) {
  const mudouDia = 'retirada_em' in depois && dia(depois.retirada_em) !== dia(antes.retirada_em);
  const mudouHora =
    'retirada_hora' in depois && hora(depois.retirada_hora) !== hora(antes.retirada_hora);
  return mudouDia || mudouHora;
}
