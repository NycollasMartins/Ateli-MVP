-- ============================================================
-- Ateliê · TUDO
--
-- Os arquivos numerados, um atrás do outro, para colar de uma vez só.
--
-- Serve tanto para banco novo quanto para banco em uso: cada pedaço é seguro
-- de rodar de novo. Se preferir ir com calma, rode os numerados um a um — dá
-- no mesmo, e o erro fica mais fácil de localizar.
--
-- GERADO A PARTIR DOS ARQUIVOS NUMERADOS. Não edite este aqui: mexa no
-- numerado e gere de novo com `npm run supabase:tudo`.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 001-tabelas.sql
-- ────────────────────────────────────────────────────────────

-- ============================================================
-- Ateliê · 001 · Tabelas
--
-- Cria a estrutura do banco e tranca o acesso.
-- Pode rodar de novo sem medo: nada aqui apaga ou sobrescreve.
-- ============================================================
create extension if not exists "pgcrypto";

-- ---------- Tabela de preços ----------
create table if not exists servicos (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  categoria       text not null default 'Ajustes',
  descricao       text,
  preco_centavos  integer not null default 0,
  unidade         text not null default 'peça',
  prazo_dias      integer not null default 7,
  ativo           boolean not null default true,
  ordem           integer not null default 0,
  criado_em       timestamptz not null default now()
);

-- ---------- Pedidos (vindos do formulário do QR) ----------
create table if not exists pedidos (
  id                uuid primary key default gen_random_uuid(),
  codigo            text unique not null,
  cliente_nome      text not null,
  cliente_telefone  text not null,
  cliente_email     text,
  peca              text not null,
  descricao         text,
  observacoes       text,
  urgente           boolean not null default false,
  status            text not null default 'novo',
  -- novo | agendado | pronto | entregue | cancelado
  retirada_em       date,
  retirada_hora     text default '10:00',
  valor_centavos    integer not null default 0,
  sinal_centavos    integer not null default 0,
  pago              boolean not null default false,
  pago_em           timestamptz,
  forma_pagamento   text,
  entregue_em       timestamptz,
  google_event_id   text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index if not exists idx_pedidos_status on pedidos(status);
create index if not exists idx_pedidos_retirada on pedidos(retirada_em);

-- ---------- Itens do pedido (serviços escolhidos) ----------
create table if not exists pedido_itens (
  id                    uuid primary key default gen_random_uuid(),
  pedido_id             uuid not null references pedidos(id) on delete cascade,
  servico_id            uuid references servicos(id) on delete set null,
  nome                  text not null,
  quantidade            integer not null default 1,
  preco_unit_centavos   integer not null default 0
);
create index if not exists idx_itens_pedido on pedido_itens(pedido_id);

-- ---------- Avisos já dados (evita repetir) ----------
-- Guarda tanto os lembretes do cron (72h, 24h) quanto as mensagens de
-- WhatsApp que você já mandou (whats_marcada, whats_vespera, whats_pronta).
create table if not exists notificacoes (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references pedidos(id) on delete cascade,
  tipo        text not null,
  canal       text not null default 'app',
  enviada_em  timestamptz not null default now(),
  unique (pedido_id, tipo)
);

-- ---------- Fechamento de caixa semanal ----------
create table if not exists fechamentos (
  id              uuid primary key default gen_random_uuid(),
  semana_inicio   date not null,
  semana_fim      date not null,
  total_centavos  integer not null default 0,
  pedidos_qtd     integer not null default 0,
  observacao      text,
  fechado_em      timestamptz not null default now(),
  unique (semana_inicio)
);

-- ---------- Configurações (tokens do Google, dados do ateliê) ----------
create table if not exists config (
  chave          text primary key,
  valor          jsonb not null,
  atualizado_em  timestamptz not null default now()
);

-- ---------- Segurança ----------
-- Nenhuma política liberada: só o servidor (service role) acessa.
-- Sem isto, os dados das suas clientes ficam legíveis pela chave pública.
alter table servicos      enable row level security;
alter table pedidos       enable row level security;
alter table pedido_itens  enable row level security;
alter table notificacoes  enable row level security;
alter table fechamentos   enable row level security;
alter table config        enable row level security;

-- ────────────────────────────────────────────────────────────
-- 002-tabela-de-precos.sql
-- ────────────────────────────────────────────────────────────

-- ============================================================
-- Ateliê · 002 · Tabela de preços inicial
--
-- Só um ponto de partida: depois é tudo editável em Painel → Tabela de preços.
--
-- Só preenche se a tabela estiver vazia. Ou seja: se você já mexeu nos preços,
-- rodar este arquivo de novo não faz nada e não duplica nada.
-- ============================================================
do $$
begin
  if not exists (select 1 from servicos) then
    insert into servicos (nome, categoria, descricao, preco_centavos, prazo_dias, ordem) values
      ('Barra de calça simples',        'Barras',    'Corte reto, feito na máquina',            2500,  5,  1),
      ('Barra de calça jeans original', 'Barras',    'Mantém a barra original do jeans',        4500,  7,  2),
      ('Barra de vestido ou saia',      'Barras',    'Acabamento invisível',                    4000,  7,  3),
      ('Ajuste de cós',                 'Ajustes',   'Apertar ou soltar a cintura',             3500,  7,  4),
      ('Ajuste lateral de camisa',      'Ajustes',   'Afinar o corpo da peça',                  4000,  7,  5),
      ('Ajuste de manga',               'Ajustes',   'Encurtar ou afinar',                      3500,  7,  6),
      ('Troca de zíper — calça',        'Consertos', 'Zíper incluso',                           4500,  7,  7),
      ('Troca de zíper — vestido',      'Consertos', 'Zíper invisível incluso',                 6500,  7,  8),
      ('Cerzido e remendo',             'Consertos', 'Reparo em rasgo ou furo',                 3000,  5,  9),
      ('Troca de forro',                'Consertos', 'Blazer, casaco ou saia',                 12000, 14, 10),
      ('Ajuste de vestido de festa',    'Festa',     'Prova marcada à parte',                  18000, 14, 11),
      ('Ajuste de vestido de noiva',    'Festa',     'Inclui até duas provas',                 45000, 21, 12),
      ('Customização de peça',          'Sob medida','Valor combinado na conversa',                0, 14, 13),
      ('Peça sob medida',               'Sob medida','Valor definido após medidas e tecido',       0, 21, 14),
      ('Bainha de cortina (por metro)', 'Casa',      'Preço por metro linear',                  3000, 10, 15);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 003-despesas.sql
-- ────────────────────────────────────────────────────────────

-- ============================================================
-- Ateliê · 003 · Despesas
--
-- O que você compra (linha, zíper, tecido, aluguel, luz) para o Financeiro
-- mostrar lucro, e não só receita.
--
-- Pode rodar de novo sem medo.
-- ============================================================

create table if not exists despesas (
  id              uuid primary key default gen_random_uuid(),
  descricao       text not null,
  categoria       text not null default 'Materiais',
  valor_centavos  integer not null default 0,
  -- data pura, sem hora: o dia do gasto não muda com fuso horário
  data            date not null default current_date,
  observacao      text,
  criado_em       timestamptz not null default now()
);
create index if not exists idx_despesas_data on despesas(data);

alter table despesas enable row level security;

-- o fechamento de caixa passa a guardar também quanto saiu na semana
alter table fechamentos add column if not exists despesas_centavos integer not null default 0;

-- ────────────────────────────────────────────────────────────
-- 004-usuarios.sql
-- ────────────────────────────────────────────────────────────

-- ============================================================
-- Ateliê · 004 · Quem entra no painel
--
-- Troca a senha única por login de verdade: cada pessoa do ateliê tem o
-- próprio e-mail e a própria senha, guardados pelo Supabase Auth.
--
-- O Supabase já cria a tabela `auth.users` sozinho. Aqui só guardamos o
-- nome de cada pessoa, para o painel ter como chamá-la pelo nome.
--
-- Pode rodar de novo sem medo.
-- ============================================================

create table if not exists perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null default '',
  criado_em  timestamptz not null default now()
);

alter table perfis enable row level security;

-- Toda pessoa criada no Auth ganha um perfil na hora.
-- `security definer` porque o gatilho roda por dentro do Auth, não pelo painel.
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Perfil para quem já tinha sido criado antes deste arquivo rodar.
insert into public.perfis (id, nome)
select u.id, coalesce(nullif(u.raw_user_meta_data ->> 'nome', ''), split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- 005-marca.sql
-- ────────────────────────────────────────────────────────────

-- ============================================================
-- Ateliê · 005 · Marca
--
-- Nome, cores e logo passam a vir do banco em vez de variável de ambiente,
-- para trocar de ateliê sem mexer no código nem republicar o site.
--
-- O nome e as cores ficam na tabela `config` (chave 'marca'), que já existe
-- desde o 001. Aqui só criamos onde o arquivo do logo vai morar.
--
-- Pode rodar de novo sem medo.
-- ============================================================

-- Balde público: o logo aparece no formulário aberto do QR e no cartaz
-- impresso, então precisa ser legível sem login. Só o servidor escreve nele,
-- usando a chave de serviço — por isso não há política de escrita aqui.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marca',
  'marca',
  true,
  1048576, -- 1 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ────────────────────────────────────────────────────────────
-- 006-fotos.sql
-- ────────────────────────────────────────────────────────────

-- ============================================================
-- Ateliê · 006 · Fotos da peça
--
-- Foto do que a cliente deixou: ela pode mandar junto com o pedido pelo QR,
-- e a costureira pode fotografar na bancada.
--
-- Pode rodar de novo sem medo.
-- ============================================================

create table if not exists pedido_fotos (
  id         uuid primary key default gen_random_uuid(),
  pedido_id  uuid not null references pedidos(id) on delete cascade,
  -- caminho dentro do balde. A URL não é guardada de propósito: ela é
  -- assinada na hora de mostrar e vence sozinha.
  caminho    text not null,
  origem     text not null default 'atelie', -- cliente | atelie
  criado_em  timestamptz not null default now()
);
create index if not exists idx_fotos_pedido on pedido_fotos(pedido_id);

alter table pedido_fotos enable row level security;

-- Balde fechado: foto de roupa de cliente não fica aberta na internet.
-- Quem escreve é só o servidor, com a chave de serviço; quem lê recebe uma
-- URL assinada que vence em uma hora.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pecas',
  'pecas',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ────────────────────────────────────────────────────────────
-- 007-despesas-fixas.sql
-- ────────────────────────────────────────────────────────────

-- ============================================================
-- Ateliê · 007 · Despesas que se repetem
--
-- Aluguel, luz, internet: o que sai todo mês no mesmo dia e não deveria
-- precisar ser digitado de novo.
--
-- O lançamento vira uma despesa comum, com data no dia certo — dá para
-- corrigir o valor ou apagar como qualquer outra.
--
-- Pode rodar de novo sem medo.
-- ============================================================

create table if not exists despesas_fixas (
  id              uuid primary key default gen_random_uuid(),
  descricao       text not null,
  categoria       text not null default 'Aluguel',
  valor_centavos  integer not null default 0,
  -- 1 a 31; num mês curto, cai no último dia
  dia_do_mes      integer not null default 5,
  ativa           boolean not null default true,
  -- não lança nada em mês anterior a este
  comeca_em       date not null default current_date,
  criado_em       timestamptz not null default now()
);

alter table despesas_fixas enable row level security;

-- de qual despesa fixa veio, e de qual mês
alter table despesas add column if not exists despesa_fixa_id uuid
  references despesas_fixas(id) on delete set null;
alter table despesas add column if not exists competencia date;

-- Trava que garante um lançamento por mês por despesa fixa. É o que deixa o
-- painel poder tentar lançar quantas vezes quiser sem duplicar nada.
create unique index if not exists idx_despesa_fixa_competencia
  on despesas (despesa_fixa_id, competencia)
  where despesa_fixa_id is not null;

-- ────────────────────────────────────────────────────────────
-- 008-travas.sql
-- ────────────────────────────────────────────────────────────

-- ============================================================
-- Ateliê · 008 · Travas de estado
--
-- Os cinco estados de um pedido existiam só como comentário. Sem trava, um
-- estado inventado é gravado e o pedido some de todos os filtros da tela: a
-- costureira perde a peça de vista e nenhum erro aparece.
--
-- Pode rodar de novo sem medo.
-- ============================================================

-- Se este arquivo falhar, é porque já existe pedido com estado fora da lista.
-- Rode isto para achar quais, corrija-os pelo painel, e rode de novo:
--
--   select id, codigo, status from pedidos
--    where status not in ('novo','agendado','pronto','entregue','cancelado');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_status_valido'
  ) then
    alter table pedidos
      add constraint pedidos_status_valido
      check (status in ('novo', 'agendado', 'pronto', 'entregue', 'cancelado'));
  end if;
end $$;

-- Dinheiro não é negativo, e o sinal nunca passa do valor combinado.
-- A aplicação já garante isso; aqui é a rede embaixo.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_dinheiro_coerente'
  ) then
    alter table pedidos
      add constraint pedidos_dinheiro_coerente
      check (
        valor_centavos >= 0
        and sinal_centavos >= 0
        and sinal_centavos <= valor_centavos
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'despesas_valor_positivo'
  ) then
    alter table despesas
      add constraint despesas_valor_positivo check (valor_centavos >= 0);
  end if;
end $$;

-- Dia do mês de uma despesa que se repete: 1 a 31.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'despesas_fixas_dia_valido'
  ) then
    alter table despesas_fixas
      add constraint despesas_fixas_dia_valido
      check (dia_do_mes between 1 and 31);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 009-trava-despesa-fixa.sql
-- ────────────────────────────────────────────────────────────

-- ============================================================
-- Ateliê · 009 · Conserta a trava da despesa que se repete
--
-- O 007 criou a trava como índice PARCIAL:
--
--   create unique index ... on despesas (despesa_fixa_id, competencia)
--     where despesa_fixa_id is not null;
--
-- O Postgres só aceita um índice parcial como alvo de `on conflict` se a
-- consulta repetir o mesmo `where`. A biblioteca do Supabase manda só os nomes
-- das colunas, sem o `where`, então o banco recusaria com o erro 42P10 e o
-- lançamento automático nunca aconteceria.
--
-- A trava aqui é sem `where`. Continua correta: uma despesa lançada à mão tem
-- `despesa_fixa_id` e `competencia` nulos, e no Postgres nulo não conflita com
-- nulo — então dá para lançar quantas quiser na mão, como antes.
--
-- Pode rodar de novo sem medo.
-- ============================================================

drop index if exists idx_despesa_fixa_competencia;

create unique index if not exists idx_despesa_fixa_competencia
  on despesas (despesa_fixa_id, competencia);

-- ────────────────────────────────────────────────────────────
-- 010-papeis-prazo-e-pressa.sql
-- ────────────────────────────────────────────────────────────

-- ============================================================
-- Ateliê · 010 · Papéis de acesso, prazo em horas e a pressa
--
-- Três mudanças que vieram juntas:
--
--   1. Quem entra no painel passa a ter papel: admin vê tudo, funcionário não
--      vê o financeiro, a equipe nem o QR.
--   2. O prazo de um serviço podia ser só em dias. Barra de calça sai em duas
--      horas; obrigar a escrever "1 dia" mente para a cliente.
--   3. Pedido com pressa passa a registrar quem tem direito a não pagar por
--      ela e quanto foi cobrado a mais de quem não tem.
--
-- Pode rodar de novo sem medo.
-- ============================================================

-- ---------- 1. Papel de quem entra ----------
--
-- O papel mora em `raw_app_meta_data`, não em `raw_user_meta_data`. A
-- diferença decide a segurança do painel inteiro: a pessoa logada consegue
-- escrever no próprio `user_metadata`, e um funcionário se promoveria a admin
-- sozinho. O `app_metadata` só a chave de serviço escreve.
--
-- Quem já existia vira admin: é o único jeito de ninguém ficar trancado para
-- fora do painel que já usava.
update auth.users
   set raw_app_meta_data =
       coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('papel', 'admin')
 where raw_app_meta_data ->> 'papel' is null;

-- Espelho só para a tela de Equipe listar sem consultar o Auth duas vezes.
-- Quem manda no acesso continua sendo o `app_metadata` acima.
alter table perfis add column if not exists papel text not null default 'funcionario';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'perfis_papel_valido') then
    alter table perfis
      add constraint perfis_papel_valido check (papel in ('admin', 'funcionario'));
  end if;
end $$;

update perfis p
   set papel = coalesce(u.raw_app_meta_data ->> 'papel', 'funcionario')
  from auth.users u
 where u.id = p.id
   and p.papel is distinct from coalesce(u.raw_app_meta_data ->> 'papel', 'funcionario');

-- ---------- 2. Prazo em horas ----------
--
-- `prazo_dias` guarda a quantidade; a unidade agora vem em `prazo_unidade`.
-- O nome da coluna ficou do tempo em que só havia dias — renomear quebraria
-- todo pedido antigo sem ganhar nada.
alter table servicos add column if not exists prazo_unidade text not null default 'dias';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'servicos_prazo_unidade_valida') then
    alter table servicos
      add constraint servicos_prazo_unidade_valida check (prazo_unidade in ('dias', 'horas'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'servicos_prazo_positivo') then
    alter table servicos
      add constraint servicos_prazo_positivo check (prazo_dias > 0);
  end if;
end $$;

-- ---------- 3. Ramal e a pressa ----------
--
-- O formulário do QR pedia e-mail; passa a pedir o ramal, que é como se acha
-- alguém aqui dentro. A coluna do e-mail fica: apagá-la levaria junto o
-- contato dos pedidos que já foram feitos.
alter table pedidos add column if not exists cliente_ramal text;

-- Quem é ministro, ministra ou advogado tem a pressa sem pagar por ela.
-- Guardar a resposta é o que permite conferir depois por que um pedido saiu
-- na frente sem acréscimo.
alter table pedidos add column if not exists urgente_perfil text;
alter table pedidos add column if not exists acrescimo_centavos integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_urgente_perfil_valido') then
    alter table pedidos
      add constraint pedidos_urgente_perfil_valido
      check (urgente_perfil is null or urgente_perfil in ('ministro', 'advogado', 'outro'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_acrescimo_nao_negativo') then
    alter table pedidos
      add constraint pedidos_acrescimo_nao_negativo check (acrescimo_centavos >= 0);
  end if;
end $$;
