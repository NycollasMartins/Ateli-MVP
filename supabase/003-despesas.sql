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
