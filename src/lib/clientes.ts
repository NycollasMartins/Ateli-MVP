import type { Pedido } from './tipos';
import { restanteDe } from './tipos';
import { telefoneLimpo } from './formato';

export type Cliente = {
  /** Só dígitos, sem DDI: é o que junta os pedidos da mesma pessoa. */
  chave: string;
  nome: string;
  telefone: string;
  email: string | null;
  /** Tudo que ela já mandou, inclusive cancelado, do mais novo para o mais velho. */
  pedidos: Pedido[];
  /** Quantas peças ela realmente trouxe: cancelado não conta como visita. */
  visitas: number;
  entregues: number;
  naBancada: number;
  /** Soma do que ela já pagou (só pedido entregue). */
  totalGasto: number;
  aReceber: number;
  /** ISO do primeiro e do último pedido. */
  desde: string;
  ultimoEm: string;
  /** As peças que ela já trouxe, da mais frequente para a menos. */
  pecas: string[];
};

/**
 * A mesma pessoa digita o telefone de um jeito diferente a cada visita.
 *
 * Tira a pontuação, o 55 do país e o 0 que se põe antes do DDD para discar
 * interurbano — muita gente anota o número assim. Sem tirar esse 0, a mesma
 * cliente vira duas: histórico partido ao meio, "1ª vez" para quem já veio
 * cinco vezes, e metade do que ela já gastou.
 */
export function chaveTelefone(t: string) {
  let n = telefoneLimpo(t);
  if (n.length > 11 && n.startsWith('55')) n = n.slice(2);
  if (n.length > 10 && n.startsWith('0')) n = n.slice(1);
  return n;
}

/** Junta os pedidos por telefone. O nome e o contato vêm do pedido mais recente. */
export function agruparClientes(pedidos: Pedido[]): Cliente[] {
  const porChave = new Map<string, Pedido[]>();

  for (const p of pedidos) {
    const chave = chaveTelefone(p.cliente_telefone);
    if (!chave) continue;
    porChave.set(chave, [...(porChave.get(chave) ?? []), p]);
  }

  const clientes: Cliente[] = [];

  for (const [chave, lista] of porChave) {
    // do mais novo para o mais antigo
    const ordenados = [...lista].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    const recente = ordenados[0];
    const validos = ordenados.filter((p) => p.status !== 'cancelado');
    const entregues = validos.filter((p) => p.status === 'entregue');
    const naBancada = validos.filter((p) => p.status === 'agendado' || p.status === 'pronto');

    const vezes = new Map<string, number>();
    validos.forEach((p) => vezes.set(p.peca, (vezes.get(p.peca) ?? 0) + 1));

    // se tudo dela foi cancelado, ainda assim há datas a mostrar
    const paraDatas = validos.length ? validos : ordenados;

    clientes.push({
      chave,
      nome: recente.cliente_nome,
      telefone: recente.cliente_telefone,
      email: ordenados.find((p) => p.cliente_email)?.cliente_email ?? null,
      pedidos: ordenados,
      visitas: validos.length,
      entregues: entregues.length,
      naBancada: naBancada.length,
      totalGasto: entregues.reduce((s, p) => s + p.valor_centavos, 0),
      aReceber: naBancada.reduce((s, p) => s + restanteDe(p), 0),
      desde: paraDatas[paraDatas.length - 1].criado_em,
      ultimoEm: paraDatas[0].criado_em,
      pecas: [...vezes.entries()].sort((a, b) => b[1] - a[1]).map(([peca]) => peca),
    });
  }

  return clientes.sort((a, b) => b.ultimoEm.localeCompare(a.ultimoEm));
}

/** Todos os outros pedidos desta cliente, do mais novo para o mais velho. */
export function historicoDe(pedido: Pedido, todos: Pedido[]): Pedido[] {
  const chave = chaveTelefone(pedido.cliente_telefone);
  if (!chave) return [];
  return todos
    .filter((p) => p.id !== pedido.id && chaveTelefone(p.cliente_telefone) === chave)
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));
}

/**
 * O que ela trouxe *antes* deste pedido. Pedido criado depois não é passado,
 * e cancelado não entra: ela não chegou a trazer a peça.
 */
export function anterioresA(pedido: Pedido, todos: Pedido[]): Pedido[] {
  return historicoDe(pedido, todos).filter(
    (p) => p.status !== 'cancelado' && p.criado_em < pedido.criado_em
  );
}

/** "3ª vez" — a posição deste pedido entre as visitas dela. */
export function ordemDoPedido(pedido: Pedido, todos: Pedido[]): number {
  return anterioresA(pedido, todos).length + 1;
}
