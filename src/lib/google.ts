import 'server-only';
import { google } from 'googleapis';
import { lerConfig, gravarConfig } from './supabase';
import { addDays } from 'date-fns';
import { moeda, dataLonga, dataLocal, isoDia } from './formato';
import type { Pedido, PedidoItem } from './tipos';
import { restanteDe } from './tipos';

const ESCOPOS = ['https://www.googleapis.com/auth/calendar'];
const CHAVE_TOKEN = 'google_tokens';
const CHAVE_CREDENCIAIS = 'google_credenciais';

type Tokens = { refresh_token?: string; access_token?: string; expiry_date?: number };

export type Credenciais = { client_id: string; client_secret: string };

/**
 * As credenciais do Google, guardadas no banco.
 *
 * Ficavam só no `.env`, o que obrigava a mexer em arquivo e republicar o
 * sistema para ligar a agenda de um ateliê. Agora elas entram pelo painel; o
 * `.env` continua valendo como reserva, para quem já tinha configurado assim.
 *
 * O `client_secret` nunca sai daqui para o navegador — quem pergunta pela tela
 * recebe só se existe ou não.
 */
export async function lerCredenciais(): Promise<Credenciais | null> {
  const guardadas = await lerConfig<Partial<Credenciais>>(CHAVE_CREDENCIAIS);
  const id = String(guardadas?.client_id ?? process.env.GOOGLE_CLIENT_ID ?? '').trim();
  const segredo = String(guardadas?.client_secret ?? process.env.GOOGLE_CLIENT_SECRET ?? '').trim();
  return id && segredo ? { client_id: id, client_secret: segredo } : null;
}

export async function gravarCredenciais(credenciais: Credenciais) {
  await gravarConfig(CHAVE_CREDENCIAIS, credenciais);
}

/** Apaga as credenciais e, junto, a conexão que dependia delas. */
export async function esquecerCredenciais() {
  await gravarConfig(CHAVE_CREDENCIAIS, {});
  await gravarConfig(CHAVE_TOKEN, {});
}

export const temCredenciais = async () => Boolean(await lerCredenciais());

/**
 * O endereço de volta do Google.
 *
 * Precisa bater letra por letra com o que está cadastrado no Google Cloud, e é
 * por isso que a tela da Agenda mostra este mesmo valor para copiar: montá-lo
 * aqui, a partir do endereço do painel, evita a variável de ambiente a mais e
 * o erro de digitar duas vezes a mesma coisa.
 */
export const enderecoDeVolta = (base: string) =>
  String(process.env.GOOGLE_REDIRECT_URI ?? '').trim() || `${base}/api/google/callback`;

async function oauth(voltarPara?: string) {
  const credenciais = await lerCredenciais();
  return new google.auth.OAuth2(
    credenciais?.client_id,
    credenciais?.client_secret,
    voltarPara
  );
}

/** Onde guardamos, por poucos minutos, o sorteio que prova que a volta é nossa. */
export const COOKIE_ESTADO = 'google_estado';

export async function urlAutorizacao(estado: string, voltarPara: string) {
  const cliente = await oauth(voltarPara);
  return cliente.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ESCOPOS,
    state: estado,
  });
}

export async function trocarCodigoPorTokens(code: string, voltarPara: string) {
  const cliente = await oauth(voltarPara);
  const { tokens } = await cliente.getToken(code);
  const anteriores = (await lerConfig<Tokens>(CHAVE_TOKEN)) ?? {};
  await gravarConfig(CHAVE_TOKEN, { ...anteriores, ...tokens });
}

export async function agendaConectada() {
  const t = await lerConfig<Tokens>(CHAVE_TOKEN);
  return Boolean(t?.refresh_token);
}

export async function desconectarAgenda() {
  await gravarConfig(CHAVE_TOKEN, {});
}

async function calendario() {
  const tokens = await lerConfig<Tokens>(CHAVE_TOKEN);
  if (!tokens?.refresh_token) return null;
  const cliente = await oauth();
  cliente.setCredentials(tokens);
  cliente.on('tokens', async (novos) => {
    const atuais = (await lerConfig<Tokens>(CHAVE_TOKEN)) ?? {};
    await gravarConfig(CHAVE_TOKEN, { ...atuais, ...novos });
  });
  return google.calendar({ version: 'v3', auth: cliente });
}

const CAL_ID = () => process.env.GOOGLE_CALENDAR_ID || 'primary';

/**
 * Início e fim do evento de retirada, como o Google os quer: `yyyy-MM-ddTHH:mm:ss`
 * sem fuso na string (o fuso vai à parte, em `timeZone`).
 *
 * A meia hora de duração pode cair no dia seguinte. Somar só na hora dava
 * `T24:15:00` para uma retirada às 23:45 — o Google recusa a data, o evento
 * nunca era criado e o painel só dizia que "a agenda não respondeu".
 */
export function janelaDoEvento(dia: string, horaBruta: string | null) {
  const hora = (horaBruta || '10:00').padStart(5, '0').slice(0, 5);
  const [h, m] = hora.split(':').map(Number);

  const minutosDoFim = h * 60 + m + 30;
  const diaDoFim =
    minutosDoFim >= 24 * 60 ? isoDia(addDays(dataLocal(dia) ?? new Date(), 1)) : dia;
  const hh = String(Math.floor(minutosDoFim / 60) % 24).padStart(2, '0');
  const mm = String(minutosDoFim % 60).padStart(2, '0');

  return { inicio: `${dia}T${hora}:00`, fim: `${diaDoFim}T${hh}:${mm}:00` };
}

function corpoDoEvento(pedido: Pedido, itens: PedidoItem[]) {
  const servicos = itens.length
    ? itens.map((i) => `• ${i.nome} ×${i.quantidade} — ${moeda(i.preco_unit_centavos * i.quantidade)}`).join('\n')
    : '• (nenhum serviço marcado)';

  const descricao = [
    `Cliente: ${pedido.cliente_nome}`,
    `WhatsApp: ${pedido.cliente_telefone}`,
    pedido.cliente_ramal ? `Ramal: ${pedido.cliente_ramal}` : null,
    pedido.cliente_email ? `E-mail: ${pedido.cliente_email}` : null,
    ``,
    `Peça: ${pedido.peca}`,
    `Serviços:`,
    servicos,
    ``,
    `Valor: ${moeda(pedido.valor_centavos)}`,
    pedido.sinal_centavos ? `Sinal já pago: ${moeda(pedido.sinal_centavos)}` : null,
    pedido.sinal_centavos ? `Falta receber: ${moeda(restanteDe(pedido))}` : null,
    pedido.urgente ? '⚡ Pedido marcado como urgente' : null,
    pedido.acrescimo_centavos
      ? `Acréscimo pela pressa: ${moeda(pedido.acrescimo_centavos)}`
      : pedido.urgente
        ? 'Pressa sem acréscimo (ministro, ministra ou advogado)'
        : null,
    pedido.descricao ? `\nO que a cliente pediu:\n${pedido.descricao}` : null,
    pedido.observacoes ? `\nSuas anotações:\n${pedido.observacoes}` : null,
    ``,
    `Código do pedido: ${pedido.codigo}`,
  ]
    .filter(Boolean)
    .join('\n');

  const { inicio, fim } = janelaDoEvento(pedido.retirada_em!, pedido.retirada_hora);

  return {
    summary: `Retirada — ${pedido.cliente_nome} (${pedido.peca})`,
    description: descricao,
    location: 'Ateliê',
    start: { dateTime: inicio, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: fim, timeZone: 'America/Sao_Paulo' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup' as const, minutes: 3 * 24 * 60 },
        { method: 'email' as const, minutes: 3 * 24 * 60 },
        { method: 'popup' as const, minutes: 24 * 60 },
        { method: 'email' as const, minutes: 24 * 60 },
      ],
    },
  };
}

/** Cria ou atualiza o evento de retirada. Devolve o id do evento (ou null se a agenda não está conectada). */
export async function sincronizarEvento(pedido: Pedido, itens: PedidoItem[]): Promise<string | null> {
  const cal = await calendario();
  if (!cal || !pedido.retirada_em) return null;
  const corpo = corpoDoEvento(pedido, itens);

  if (pedido.google_event_id) {
    try {
      const r = await cal.events.update({
        calendarId: CAL_ID(),
        eventId: pedido.google_event_id,
        requestBody: corpo,
      });
      return r.data.id ?? pedido.google_event_id;
    } catch {
      // evento apagado na mão pelo usuário: cria de novo
    }
  }
  const r = await cal.events.insert({ calendarId: CAL_ID(), requestBody: corpo });
  return r.data.id ?? null;
}

export async function removerEvento(eventId: string | null) {
  if (!eventId) return;
  const cal = await calendario();
  if (!cal) return;
  try {
    await cal.events.delete({ calendarId: CAL_ID(), eventId });
  } catch {
    /* já não existe */
  }
}

export function textoLembrete(pedido: Pedido, tipo: '72h' | '24h') {
  const quando = tipo === '72h' ? 'em 3 dias' : 'amanhã';
  const cobranca = pedido.sinal_centavos
    ? `Falta receber ${moeda(restanteDe(pedido))} (${moeda(pedido.sinal_centavos)} de sinal já pagos).`
    : `Valor ${moeda(pedido.valor_centavos)}.`;
  return `Retirada ${quando}: ${pedido.cliente_nome} vem buscar ${pedido.peca.toLowerCase()} ${dataLonga(
    pedido.retirada_em
  )}, às ${pedido.retirada_hora}. ${cobranca} Código ${pedido.codigo}.`;
}
