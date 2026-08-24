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
