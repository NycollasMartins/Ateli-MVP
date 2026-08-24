import { addDays, endOfMonth, startOfMonth, subDays, subMonths } from 'date-fns';
import { inicioSemana, fimSemana } from './formato';

export type TipoDePeriodo = 'semana' | 'mes';

export type Periodo = {
  ini: Date;
  fim: Date;
  /** O período imediatamente anterior a este, para comparar. */
  anteriorIni: Date;
  anteriorFim: Date;
};

/**
 * O intervalo que o Financeiro está mostrando.
 *
 * `recuo` é quantos períodos para trás: zero é agora, um é a semana ou o mês
 * anterior. A comparação de variação é sempre com o período imediatamente
 * anterior ao **escolhido**, não com o anterior a hoje — senão olhar julho
 * mostraria "+12% em relação ao mês passado" comparando com o mês corrente.
 */
export function periodoDe(hoje: Date, tipo: TipoDePeriodo, recuo: number): Periodo {
  const passos = Math.max(0, Math.floor(recuo));
  const semana = tipo === 'semana';

  const referencia = semana ? subDays(hoje, 7 * passos) : subMonths(hoje, passos);
  const ini = semana ? inicioSemana(referencia) : startOfMonth(referencia);
  const fim = semana ? fimSemana(referencia) : endOfMonth(referencia);

  // um dia antes do início já está no período anterior, qualquer que seja o mês
  const dentroDoAnterior = subDays(ini, 1);

  return {
    ini,
    fim,
    anteriorIni: semana ? inicioSemana(dentroDoAnterior) : startOfMonth(dentroDoAnterior),
    anteriorFim: semana ? fimSemana(dentroDoAnterior) : endOfMonth(dentroDoAnterior),
  };
}

/** Um passo para trás nunca some, e para frente nunca passa do presente. */
export const recuar = (recuo: number) => recuo + 1;
export const avancar = (recuo: number) => Math.max(0, recuo - 1);

/** Só existe "seguinte" se houver período depois deste. */
export const noPresente = (recuo: number) => recuo <= 0;

/**
 * Quantos dias o período cobre, contando as pontas.
 *
 * Mede por dia do calendário, não por instante: `fimSemana` devolve o último
 * milissegundo de domingo, e subtrair carimbos daria 6,99 dias.
 */
export function diasDoPeriodo(p: Periodo) {
  const meioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
  return Math.round((meioDia(p.fim) - meioDia(p.ini)) / 86_400_000) + 1;
}

/** O primeiro dia deste período é o dia seguinte ao último do anterior? */
export function encaixaNoAnterior(p: Periodo) {
  const seguinte = addDays(
    new Date(p.anteriorFim.getFullYear(), p.anteriorFim.getMonth(), p.anteriorFim.getDate()),
    1
  );
  return (
    seguinte.getFullYear() === p.ini.getFullYear() &&
    seguinte.getMonth() === p.ini.getMonth() &&
    seguinte.getDate() === p.ini.getDate()
  );
}
