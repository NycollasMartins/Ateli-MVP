import { diasAte, inicioSemana, fimSemana } from './formato';
import { contaComoReceita, restanteDe, type Pedido } from './tipos';

export type Resumo = {
  /** Só pedido entregue, com data de entrega, na semana corrente. */
  caixaSemana: number;
  qtdSemana: number;
  /** Chegou pelo QR e ainda não tem data. */
  novos: Pedido[];
  /** Agendado ou pronto: o que está em cima da bancada. */
  naBancada: Pedido[];
  aReceber: number;
  sinaisNaMao: number;
  /** Atrasadas primeiro, depois as dos próximos três dias. */
  proximas: Pedido[];
  atrasadas: Pedido[];
  hojeEntregas: Pedido[];
};

/**
 * O que a Visão geral mostra.
 *
 * Recebe o dia em vez de olhar o relógio: assim dá para testar a virada da
 * semana e o comportamento com peça atrasada sem depender de quando roda.
 */
export function resumoDoPainel(pedidos: Pedido[], hoje = new Date()): Resumo {
  const ini = inicioSemana(hoje);
  const fim = fimSemana(hoje);

  const daSemana = pedidos.filter((p) => {
    if (!contaComoReceita(p)) return false;
    const entregue = new Date(p.entregue_em!);
    return entregue >= ini && entregue <= fim;
  });

  const naBancada = pedidos.filter((p) => p.status === 'agendado' || p.status === 'pronto');

  const comPrazo = naBancada
    .map((p) => ({ pedido: p, dias: diasAte(p.retirada_em, hoje) }))
    .filter((x): x is { pedido: Pedido; dias: number } => x.dias !== null);

  const porData = (a: Pedido, b: Pedido) =>
    (a.retirada_em ?? '').localeCompare(b.retirada_em ?? '');

  return {
    caixaSemana: daSemana.reduce((s, p) => s + p.valor_centavos, 0),
    qtdSemana: daSemana.length,
    novos: pedidos.filter((p) => p.status === 'novo'),
    naBancada,
    aReceber: naBancada.reduce((s, p) => s + restanteDe(p), 0),
    sinaisNaMao: naBancada.reduce((s, p) => s + p.sinal_centavos, 0),
    // inclui o que passou do dia: é o que mais precisa de atenção
    proximas: comPrazo.filter((x) => x.dias <= 3).map((x) => x.pedido).sort(porData),
    atrasadas: comPrazo.filter((x) => x.dias < 0).map((x) => x.pedido).sort(porData),
    hojeEntregas: comPrazo.filter((x) => x.dias === 0).map((x) => x.pedido),
  };
}
