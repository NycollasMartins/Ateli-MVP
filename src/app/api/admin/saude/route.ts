import { db } from '@/lib/supabase';
import { estaLogado, naoAutorizado } from '@/lib/auth';
import { faltaConfigurar } from '@/lib/configuracao';
import { agendaConectada } from '@/lib/google';
import { ehEnderecoDeTeste } from '@/lib/endereco';
import type { Checagem } from '@/lib/saude';

export const dynamic = 'force-dynamic';

/** A tabela existe? Consulta que devolve erro em vez de estourar. */
async function tabelaExiste(nome: string) {
  const { error } = await db.from(nome).select('*', { count: 'exact', head: true }).limit(1);
  return !error;
}

async function baldeExiste(id: string) {
  const { data } = await db.storage.getBucket(id);
  return data ?? null;
}

/**
 * Junta num lugar só o que hoje está espalhado: o `conferir.sql` no Supabase,
 * o aviso de variáveis no login, o do Google na Agenda e o do endereço no QR.
 * Quem instala precisa de uma resposta, não de quatro lugares para procurar.
 */
export async function GET() {
  if (!(await estaLogado())) return naoAutorizado();

  const checagens: Checagem[] = [];

  // ---------- variáveis ----------
  for (const v of faltaConfigurar()) {
    checagens.push({
      item: `Chave ${v.nome}`,
      situacao: 'falta',
      recado: `Pegue em ${v.onde} e ponha no .env.local e nas variáveis do serviço.`,
    });
  }

  // ---------- banco ----------
  const tabelas: [string, string][] = [
    ['pedidos', '001-tabelas.sql'],
    ['servicos', '001-tabelas.sql'],
    ['despesas', '003-despesas.sql'],
    ['perfis', '004-usuarios.sql'],
    ['pedido_fotos', '006-fotos.sql'],
    ['despesas_fixas', '007-despesas-fixas.sql'],
  ];

  for (const [tabela, arquivo] of tabelas) {
    const existe = await tabelaExiste(tabela);
    checagens.push({
      item: `Tabela ${tabela}`,
      situacao: existe ? 'ok' : 'falta',
      recado: existe ? 'no lugar' : `Rode o supabase/${arquivo} — ou o tudo.sql de uma vez.`,
    });
  }

  // ---------- arquivos ----------
  const marca = await baldeExiste('marca');
  checagens.push({
    item: 'Lugar do logo',
    situacao: marca ? (marca.public ? 'ok' : 'atencao') : 'falta',
    recado: !marca
      ? 'Rode o supabase/005-marca.sql.'
      : marca.public
        ? 'aberto, como precisa ser'
        : 'Está fechado: o logo não vai aparecer para a cliente.',
  });

  const pecas = await baldeExiste('pecas');
  checagens.push({
    item: 'Lugar das fotos',
    situacao: pecas ? (pecas.public ? 'falta' : 'ok') : 'falta',
    recado: !pecas
      ? 'Rode o supabase/006-fotos.sql.'
      : pecas.public
        ? 'PERIGO: está aberto. Fotos de clientes expostas — rode o 006-fotos.sql de novo.'
        : 'fechado, como precisa ser',
  });

  // ---------- quem entra ----------
  const { data: pessoas } = await db.auth.admin.listUsers({ perPage: 2 });
  const quantas = pessoas?.users.length ?? 0;
  checagens.push({
    item: 'Quem entra no painel',
    situacao: quantas > 0 ? 'ok' : 'falta',
    recado:
      quantas > 0
        ? `${quantas === 1 ? '1 pessoa' : 'mais de uma pessoa'} cadastrada`
        : 'Crie a primeira em Authentication → Users, marcando Auto Confirm User.',
  });

  // ---------- lembretes ----------
  const temSegredo = Boolean(process.env.CRON_SECRET?.trim());
  checagens.push({
    item: 'Lembretes automáticos',
    situacao: temSegredo ? 'ok' : 'atencao',
    recado: temSegredo
      ? 'ligados'
      : 'Sem CRON_SECRET, os lembretes de 72h e 24h não rodam. O Google Agenda continua avisando.',
  });

  // ---------- agenda ----------
  const google = await agendaConectada();
  checagens.push({
    item: 'Google Agenda',
    situacao: google ? 'ok' : 'atencao',
    recado: google ? 'conectado' : 'Sem conexão, as retiradas ficam só aqui dentro.',
  });

  // ---------- endereço do QR ----------
  const endereco = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const deTeste = ehEnderecoDeTeste(endereco);
  checagens.push({
    item: 'Endereço do cartaz do QR',
    situacao: !endereco ? 'atencao' : deTeste ? 'falta' : 'ok',
    recado: !endereco
      ? 'Sem NEXT_PUBLIC_APP_URL, o QR usa o endereço da janela aberta.'
      : deTeste
        ? `Aponta para ${endereco}, que só funciona nesta máquina. Cartaz impresso assim não abre.`
        : endereco,
  });

  return Response.json({ checagens });
}
