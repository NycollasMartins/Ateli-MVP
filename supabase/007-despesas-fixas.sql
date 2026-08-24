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
