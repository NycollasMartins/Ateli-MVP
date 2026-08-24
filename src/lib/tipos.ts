export type Status = 'novo' | 'agendado' | 'pronto' | 'entregue' | 'cancelado';

/** Os cinco estados válidos. Nada fora daqui pode ser gravado. */
export const STATUS_VALIDOS: Status[] = ['novo', 'agendado', 'pronto', 'entregue', 'cancelado'];

export const ehStatus = (v: unknown): v is Status =>
  typeof v === 'string' && (STATUS_VALIDOS as string[]).includes(v);

export const STATUS_LABEL: Record<Status, string> = {
  novo: 'Sem data',
  agendado: 'Retirada marcada',
  pronto: 'Pronta',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export type Servico = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  preco_centavos: number;
  unidade: string;
  /** A quantidade do prazo. A unidade vem separada, em `prazo_unidade`. */
  prazo_dias: number;
  prazo_unidade: PrazoUnidade;
  ativo: boolean;
  ordem: number;
};

/** Barra de calça sai em duas horas; escrever "1 dia" mentiria para a cliente. */
export type PrazoUnidade = 'dias' | 'horas';

export const PRAZO_UNIDADES: PrazoUnidade[] = ['horas', 'dias'];

export const ehPrazoUnidade = (v: unknown): v is PrazoUnidade =>
  v === 'dias' || v === 'horas';

/**
 * Quem pediu a peça com pressa.
 *
 * Ministro, ministra e advogado têm a pressa sem pagar por ela; o resto paga
 * o acréscimo. A resposta fica guardada no pedido porque é ela que explica,
 * depois, por que uma peça passou na frente sem custar mais.
 */
export type UrgentePerfil = 'ministro' | 'advogado' | 'outro';

export const URGENTE_PERFIS: UrgentePerfil[] = ['ministro', 'advogado', 'outro'];

export const ehUrgentePerfil = (v: unknown): v is UrgentePerfil =>
  typeof v === 'string' && (URGENTE_PERFIS as string[]).includes(v);

/** Quem tem direito à pressa sem acréscimo. */
export const isentoDeAcrescimo = (perfil: UrgentePerfil | null | undefined) =>
  perfil === 'ministro' || perfil === 'advogado';

/** O que se cobra pela pressa de quem não é isento. */
export const ACRESCIMO_PRESSA_CENTAVOS = 1000;

/**
 * Quanto a pressa custa neste pedido. Sem pressa, nada — mesmo que alguém
 * mande um perfil junto.
 */
export function acrescimoDaPressa(urgente: boolean, perfil: UrgentePerfil | null | undefined) {
  if (!urgente || isentoDeAcrescimo(perfil)) return 0;
  return ACRESCIMO_PRESSA_CENTAVOS;
}

export type PedidoItem = {
  id: string;
  pedido_id: string;
  servico_id: string | null;
  nome: string;
  quantidade: number;
  preco_unit_centavos: number;
};

export type Pedido = {
  id: string;
  codigo: string;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email: string | null;
  /** Ramal de quem deixou a peça: é assim que se acha alguém aqui dentro. */
  cliente_ramal: string | null;
  peca: string;
  descricao: string | null;
  observacoes: string | null;
  urgente: boolean;
  /** Quem pediu pressa: ministro e advogado não pagam por ela. */
  urgente_perfil: UrgentePerfil | null;
  /** O que foi cobrado a mais pela pressa, já somado ao `valor_centavos`. */
  acrescimo_centavos: number;
  status: Status;
  retirada_em: string | null;
  retirada_hora: string | null;
  valor_centavos: number;
  sinal_centavos: number;
  pago: boolean;
  pago_em: string | null;
  forma_pagamento: string | null;
  entregue_em: string | null;
  google_event_id: string | null;
  criado_em: string;
  atualizado_em: string;
  pedido_itens?: PedidoItem[];
  /** Avisos já mandados: lembretes do cron e mensagens de WhatsApp. */
  notificacoes?: { tipo: string }[];
  /** Só os ids, para a lista mostrar quantas fotos tem sem assinar URL. */
  pedido_fotos?: { id: string }[];
};

/** O que a cliente ainda deve: o valor combinado menos o sinal que ela já deixou. */
export const restanteDe = (p: Pick<Pedido, 'valor_centavos' | 'sinal_centavos'>) =>
  Math.max(0, p.valor_centavos - p.sinal_centavos);

export type Despesa = {
  id: string;
  descricao: string;
  categoria: string;
  valor_centavos: number;
  /** Dia da despesa em `yyyy-MM-dd`. */
  data: string;
  observacao: string | null;
  /** Preenchido quando a despesa nasceu de uma que se repete. */
  despesa_fixa_id: string | null;
  /** Mês a que o lançamento pertence, `yyyy-MM-01`. */
  competencia: string | null;
  criado_em: string;
};

export type DespesaFixa = {
  id: string;
  descricao: string;
  categoria: string;
  valor_centavos: number;
  /** 1 a 31. Em mês curto, cai no último dia. */
  dia_do_mes: number;
  ativa: boolean;
  comeca_em: string;
  criado_em: string;
};

export const CATEGORIAS_DESPESA = [
  'Materiais',
  'Aluguel',
  'Contas',
  'Máquinas',
  'Impostos',
  'Transporte',
  'Outros',
];

/**
 * O pedido entra no faturamento?
 *
 * Só entregue e com a data de entrega gravada. Pedido agendado é promessa, não
 * receita. Esta é a regra que decide todo número de dinheiro do painel — deixe
 * ela viver num lugar só, senão duas telas passam a mostrar totais diferentes.
 */
export const contaComoReceita = (p: Pick<Pedido, 'status' | 'entregue_em'>) =>
  p.status === 'entregue' && Boolean(p.entregue_em);

export type Fechamento = {
  id: string;
  semana_inicio: string;
  semana_fim: string;
  total_centavos: number;
  despesas_centavos: number;
  pedidos_qtd: number;
  observacao: string | null;
  fechado_em: string;
};

export const PECAS = [
  'Calça',
  'Jeans',
  'Camisa ou blusa',
  'Vestido',
  'Saia',
  'Blazer ou terno',
  'Jaqueta ou casaco',
  'Vestido de festa',
  'Vestido de noiva',
  'Cortina ou cama e mesa',
  'Outro',
];
