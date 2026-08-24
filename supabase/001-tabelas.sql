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
