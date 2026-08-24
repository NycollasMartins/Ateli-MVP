import { moeda, dataLonga, linkWhats } from './formato';
import { restanteDe } from './tipos';
import type { Pedido } from './tipos';

/** Os três momentos em que vale mandar mensagem para a cliente. */
export type TipoAviso = 'marcada' | 'vespera' | 'pronta' | 'atrasada';

/** Como fica guardado na tabela `notificacoes`, sem colidir com os lembretes do cron. */
export const CHAVE_AVISO: Record<TipoAviso, string> = {
  marcada: 'whats_marcada',
  vespera: 'whats_vespera',
  pronta: 'whats_pronta',
  atrasada: 'whats_atrasada',
};

export const ROTULO_AVISO: Record<TipoAviso, string> = {
  marcada: 'Avisar que a data está marcada',
  vespera: 'Lembrar que é amanhã',
  pronta: 'Avisar que a peça está pronta',
  atrasada: 'Chamar: passou do dia',
};

const primeiroNome = (n: string) => n.trim().split(/\s+/)[0] || 'tudo bem';

/**
 * Só nomeia a roupa quando a opção do formulário indica uma peça só —
 * "camisa ou blusa" viraria mensagem torta ou com o nome errado.
 * O gênero anda junto: sem ele sai "seu vestido fica pronta".
 */
const COMO_FALAR: Record<string, { como: string; masculino: boolean }> = {
  Calça: { como: 'sua calça', masculino: false },
  Jeans: { como: 'seu jeans', masculino: true },
  Vestido: { como: 'seu vestido', masculino: true },
  Saia: { como: 'sua saia', masculino: false },
  'Vestido de festa': { como: 'seu vestido de festa', masculino: true },
  'Vestido de noiva': { como: 'seu vestido de noiva', masculino: true },
};

const GENERICA = { como: 'sua peça', masculino: false };
const aPeca = (peca: string) => COMO_FALAR[peca.trim()] ?? GENERICA;

const maiusculaDe = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** O que ela ainda paga, escrito do jeito que se fala. Vazio quando o valor ainda não saiu. */
function cobranca(pedido: Pedido) {
  if (pedido.valor_centavos <= 0) return '';
  if (pedido.sinal_centavos > 0) {
    return `Fica ${moeda(pedido.valor_centavos)}, e você já deixou ${moeda(
      pedido.sinal_centavos
    )} de sinal: falta ${moeda(restanteDe(pedido))} na retirada.`;
  }
  return `Fica ${moeda(pedido.valor_centavos)}.`;
}

/** Texto pronto para a costureira revisar e mandar. */
export function textoParaCliente(pedido: Pedido, tipo: TipoAviso, nomeAtelie: string): string {
  const nome = primeiroNome(pedido.cliente_nome);
  const { como, masculino } = aPeca(pedido.peca);
  const pronta = masculino ? 'pronto' : 'pronta';
  const hora = pedido.retirada_hora || '10:00';

  const partes =
    tipo === 'marcada'
      ? [
          `Oi ${nome}! Aqui é do ${nomeAtelie}.`,
          `${maiusculaDe(como)} fica ${pronta} ${dataLonga(pedido.retirada_em)}, a partir das ${hora}.`,
          cobranca(pedido),
          'Qualquer coisa é só chamar por aqui.',
        ]
      : tipo === 'vespera'
        ? [
            `Oi ${nome}! Passando para lembrar que ${como} fica ${pronta} amanhã, a partir das ${hora}.`,
            cobranca(pedido),
            'Até amanhã!',
          ]
        : tipo === 'atrasada'
          ? [
              `Oi ${nome}! ${maiusculaDe(como)} está ${pronta} e ficou aqui esperando você desde ${dataLonga(pedido.retirada_em)}.`,
              cobranca(pedido),
              'Pode passar quando puder buscar.',
            ]
          : [
            `Oi ${nome}! ${maiusculaDe(como)} já está ${pronta}, pode buscar quando puder.`,
            cobranca(pedido),
          ];

  return partes.filter(Boolean).join(' ');
}

export const linkAviso = (pedido: Pedido, tipo: TipoAviso, nomeAtelie: string) =>
  linkWhats(pedido.cliente_telefone, textoParaCliente(pedido, tipo, nomeAtelie));

/** Já mandei esta mensagem para este pedido? */
export const jaAvisada = (pedido: Pedido, tipo: TipoAviso) =>
  (pedido.notificacoes ?? []).some((n) => n.tipo === CHAVE_AVISO[tipo]);
