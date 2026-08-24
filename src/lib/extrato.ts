import { format } from 'date-fns';
import { dataLocal, isoDia } from './formato';
import { centavosParaCSV, montarCSV } from './csv';
import type { Despesa, Pedido } from './tipos';

export const COLUNAS = [
  'Tipo',
  'Data',
  'Descrição',
  'Cliente',
  'Forma ou categoria',
  'Valor',
] as const;

type Linha = { dia: string; tipo: 'Entrada' | 'Saída'; chave: string; colunas: string[] };

/**
 * As linhas do extrato, em ordem estável.
 *
 * Ordena por dia, depois entrada antes de saída, depois pela descrição. Sem o
 * desempate, baixar o mesmo período duas vezes podia gerar arquivos com as
 * linhas em ordens diferentes — e quem compara dois extratos vê diferença
 * onde não houve nenhuma.
 */
export function linhasDoExtrato(entregas: Pedido[], despesas: Despesa[]): string[][] {
  const linhas: Linha[] = [
    ...entregas.map((p): Linha => {
      const quando = new Date(p.entregue_em!);
      return {
        dia: isoDia(quando),
        tipo: 'Entrada',
        chave: p.codigo,
        colunas: [
          'Entrada',
          format(quando, 'dd/MM/yyyy'),
          `Pedido ${p.codigo} — ${p.peca}`,
          p.cliente_nome,
          p.forma_pagamento ?? '',
          centavosParaCSV(p.valor_centavos),
        ],
      };
    }),
    ...despesas.map((d): Linha => {
      // a data e a chave de ordenação saem da mesma normalização: se a coluna
      // vier com hora colada, ordenar pelo texto cru misturaria os dias
      const quando = dataLocal(d.data)!;
      return {
        dia: isoDia(quando),
        tipo: 'Saída',
        chave: d.descricao,
        colunas: [
          'Saída',
          format(quando, 'dd/MM/yyyy'),
          d.descricao,
          '',
          d.categoria,
          centavosParaCSV(-d.valor_centavos),
        ],
      };
    }),
  ];

  return linhas
    .sort(
      (a, b) =>
        a.dia.localeCompare(b.dia) ||
        a.tipo.localeCompare(b.tipo) ||
        a.chave.localeCompare(b.chave)
    )
    .map((l) => l.colunas);
}

export const nomeDoArquivo = (ini: Date, fim: Date) =>
  `atelie-${isoDia(ini)}-a-${isoDia(fim)}.csv`;

export const extratoEmCSV = (entregas: Pedido[], despesas: Despesa[]) =>
  montarCSV([...COLUNAS], linhasDoExtrato(entregas, despesas));
