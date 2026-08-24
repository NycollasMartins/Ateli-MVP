import { isoDia } from './formato';
import { contaComoReceita, type Despesa, type Pedido } from './tipos';
import type { Periodo } from './periodo';

export type Balanco = {
  entregas: Pedido[];
  despesas: Despesa[];
  receita: number;
  gasto: number;
  lucro: number;
  /** Média por entrega. Zero quando não houve entrega. */
  ticket: number;
  /** Variação do lucro contra o período anterior, ou null quando não dá para comparar. */
  variacao: number | null;
};

/** O dia de uma despesa, tolerando a coluna vir com hora colada. */
const diaDaDespesa = (d: Despesa) => String(d.data ?? '').slice(0, 10);

export const entregasEntre = (pedidos: Pedido[], de: Date, ate: Date) =>
  pedidos.filter((p) => {
    if (!contaComoReceita(p)) return false;
    const entregue = new Date(p.entregue_em!);
    return entregue >= de && entregue <= ate;
  });

export function despesasEntre(despesas: Despesa[], de: Date, ate: Date) {
  const inicio = isoDia(de);
  const fim = isoDia(ate);
  // texto com texto não erra o dia por fuso; o corte protege do sufixo de hora,
  // que jogaria a despesa do último dia para fora do período
  return despesas.filter((d) => {
    const dia = diaDaDespesa(d);
    return dia >= inicio && dia <= fim;
  });
}

export const somaPedidos = (lista: Pedido[]) => lista.reduce((s, p) => s + p.valor_centavos, 0);
export const somaDespesas = (lista: Despesa[]) => lista.reduce((s, d) => s + d.valor_centavos, 0);

/**
 * Todos os números de dinheiro de um período.
 *
 * A variação compara com o período **anterior ao escolhido**, e só existe se
 * lá houve lucro: porcentagem sobre prejuízo ou sobre zero não quer dizer nada,
 * e mostrar "+900%" porque o mês passado deu um real é pior que não mostrar.
 */
export function balancoDoPeriodo(
  pedidos: Pedido[],
  despesas: Despesa[],
  periodo: Periodo
): Balanco {
  const entregas = entregasEntre(pedidos, periodo.ini, periodo.fim);
  const gastos = despesasEntre(despesas, periodo.ini, periodo.fim);

  const receita = somaPedidos(entregas);
  const gasto = somaDespesas(gastos);
  const lucro = receita - gasto;

  const lucroAntes =
    somaPedidos(entregasEntre(pedidos, periodo.anteriorIni, periodo.anteriorFim)) -
    somaDespesas(despesasEntre(despesas, periodo.anteriorIni, periodo.anteriorFim));

  return {
    entregas,
    despesas: gastos,
    receita,
    gasto,
    lucro,
    ticket: entregas.length ? Math.round(receita / entregas.length) : 0,
    variacao: lucroAntes > 0 ? Math.round(((lucro - lucroAntes) / lucroAntes) * 100) : null,
  };
}
