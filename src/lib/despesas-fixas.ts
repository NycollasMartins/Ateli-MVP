import { addMonths, lastDayOfMonth, startOfMonth } from 'date-fns';
import { dataLocal, isoDia } from './formato';
import type { DespesaFixa } from './tipos';

/** Quanto tempo para trás vale a pena recuperar, se a tela ficou meses sem ser aberta. */
const MESES_PARA_TRAS = 24;

/**
 * O dia do lançamento naquele mês. Quem marcou dia 31 quer dizer "último dia":
 * em fevereiro isso é 28, não 3 de março.
 */
export function diaDoMes(competencia: Date, dia: number) {
  const ultimo = lastDayOfMonth(competencia).getDate();
  const escolhido = Math.min(Math.max(1, dia), ultimo);
  return new Date(competencia.getFullYear(), competencia.getMonth(), escolhido, 12, 0, 0);
}

/** As datas que uma despesa fixa já deveria ter gerado até hoje. */
export function ocorrenciasAte(fixa: DespesaFixa, hoje: Date) {
  const inicio = dataLocal(fixa.comeca_em);
  if (!inicio) return [];

  // conta por mês: quem cadastra no dia 20 uma conta do dia 5 quer a deste mês
  const primeiro = startOfMonth(inicio);
  const limite = startOfMonth(addMonths(hoje, -MESES_PARA_TRAS));
  let competencia = primeiro > limite ? primeiro : limite;

  const fim = startOfMonth(hoje);
  const saida: { competencia: string; data: string }[] = [];

  while (competencia <= fim) {
    const quando = diaDoMes(competencia, fixa.dia_do_mes);
    // o dia ainda não chegou neste mês
    if (quando <= hoje) {
      saida.push({ competencia: isoDia(competencia), data: isoDia(quando) });
    }
    competencia = addMonths(competencia, 1);
  }

  return saida;
}
