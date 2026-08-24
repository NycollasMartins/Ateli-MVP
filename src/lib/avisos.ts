import { diasAte } from './formato';
import { jaAvisada, type TipoAviso } from './mensagens';
import type { Pedido } from './tipos';

export type Pendencia = { pedido: Pedido; tipo: TipoAviso; motivo: string };

/**
 * Qual notícia faz sentido mandar sobre este pedido **agora**.
 *
 * Independe de já ter sido mandada: serve tanto para o cartaz da Visão geral
 * quanto para o botão dentro do pedido, que precisa de um tipo mesmo quando
 * tudo já foi avisado ("avisar de novo").
 *
 * Existe num lugar só porque estava em dois: a lista aprendeu a tratar peça
 * atrasada e o painel do pedido não, então abrir uma peça que passou do dia
 * oferecia a mensagem da data — prometendo à cliente um dia que já passou.
 */
export function avisoSugerido(pedido: Pedido): { tipo: TipoAviso; motivo: string } | null {
  if (pedido.status !== 'agendado' && pedido.status !== 'pronto') return null;

  const dias = diasAte(pedido.retirada_em);
  if (dias === null) return null;

  if (dias < 0) {
    return {
      tipo: 'atrasada',
      motivo: pedido.status === 'pronto' ? 'pronta e não veio buscar' : 'passou do dia da retirada',
    };
  }

  if (pedido.status === 'pronto') return { tipo: 'pronta', motivo: 'peça pronta na bancada' };
  if (dias === 1) return { tipo: 'vespera', motivo: 'retirada amanhã' };

  return { tipo: 'marcada', motivo: 'ainda não sabe a data' };
}

/**
 * Quem ainda precisa de notícia: a sugestão de cada pedido, tirando o que já
 * foi mandado.
 *
 * A regra anterior exigia `dias >= 0` para sugerir a mensagem da data. Ou
 * seja: retirada marcada para sexta, ela não mandou o WhatsApp, sexta passa —
 * e a sugestão desaparecia, no caso mais urgente.
 */
export function pendenciasDeAviso(pedidos: Pedido[]): Pendencia[] {
  const pendentes: Pendencia[] = [];

  for (const pedido of pedidos) {
    const sugestao = avisoSugerido(pedido);
    if (sugestao && !jaAvisada(pedido, sugestao.tipo)) {
      pendentes.push({ pedido, ...sugestao });
    }
  }

  // o mais antigo primeiro: é quem está esperando há mais tempo
  return pendentes.sort((a, b) =>
    (a.pedido.retirada_em ?? '').localeCompare(b.pedido.retirada_em ?? '')
  );
}
