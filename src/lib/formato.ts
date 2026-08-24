import { addDays, format, startOfWeek, endOfWeek, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PrazoUnidade } from './tipos';

export const moeda = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const moedaCurta = (centavos: number) => {
  const v = centavos / 100;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k`;
  return `R$ ${v.toFixed(0)}`;
};

/** Converte "2026-08-20" em Date local, sem o pulo de fuso do new Date(). */
export function dataLocal(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return null;
  const dt = new Date(a, m - 1, d, 12, 0, 0);
  return isValid(dt) ? dt : null;
}

export const isoDia = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * O dia de hoje no fuso do ateliê, como `yyyy-MM-dd`.
 *
 * `isoDia(new Date())` usa o fuso de quem está rodando: no navegador dá certo,
 * mas o servidor da Vercel roda em UTC e viraria o dia às 21h de Brasília.
 * Use esta no servidor.
 */
export const hojeNoAtelie = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

export const dataCurta = (iso: string | null) => {
  const d = dataLocal(iso);
  return d ? format(d, "dd 'de' MMM", { locale: ptBR }) : '—';
};

export const dataLonga = (iso: string | null) => {
  const d = dataLocal(iso);
  return d ? format(d, "EEEE, dd 'de' MMMM", { locale: ptBR }) : '—';
};

export const horaDe = (iso: string) => format(parseISO(iso), 'dd/MM HH:mm');

/** Semana comercial: segunda a domingo. */
export const inicioSemana = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
export const fimSemana = (d: Date) => endOfWeek(d, { weekStartsOn: 1 });

/**
 * Quantos dias faltam para a data. Negativo é dia que já passou.
 *
 * `referencia` existe para os testes poderem fixar o "hoje"; no uso normal é
 * o relógio, lido a cada chamada — nunca guardado.
 */
export function diasAte(iso: string | null, referencia = new Date()): number | null {
  const d = dataLocal(iso);
  if (!d) return null;
  const hoje = new Date(referencia);
  hoje.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - hoje.getTime()) / 86_400_000);
}

/**
 * O prazo escrito como se fala.
 *
 * Número negativo é peça que já passou do dia. Sem tratar, a tela escrevia
 * "em -7 dias" — e é justamente a peça atrasada que precisa saltar aos olhos.
 */
export function prazoEmPalavras(dias: number): string {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'era ontem';
  if (dias < 0) return `atrasada ${-dias} dias`;
  return `em ${dias} dias`;
}

/**
 * O prazo de um serviço da tabela, escrito como se fala.
 *
 * Barra de calça fica pronta em duas horas. Enquanto só havia dias, a tabela
 * dizia "1 dia" para ela — e a cliente ia embora achando que só voltaria no
 * dia seguinte por uma coisa que sai enquanto ela espera.
 */
export function prazoDoServico(quantidade: number, unidade: PrazoUnidade): string {
  const n = Math.max(1, Math.round(quantidade || 1));
  if (unidade === 'horas') return n === 1 ? '1 hora' : `${n} horas`;
  return n === 1 ? '1 dia' : `${n} dias`;
}

export function semanasAnteriores(qtd: number, base = new Date()) {
  const out: { inicio: Date; fim: Date; rotulo: string }[] = [];
  for (let i = qtd - 1; i >= 0; i--) {
    const ref = addDays(base, -7 * i);
    const inicio = inicioSemana(ref);
    out.push({ inicio, fim: fimSemana(ref), rotulo: format(inicio, 'dd/MM') });
  }
  return out;
}

export function telefoneLimpo(t: string) {
  return t.replace(/\D/g, '');
}

export function linkWhats(telefone: string, texto: string) {
  const n = telefoneLimpo(telefone);
  const comDDI = n.length <= 11 ? `55${n}` : n;
  return `https://wa.me/${comDDI}?text=${encodeURIComponent(texto)}`;
}
