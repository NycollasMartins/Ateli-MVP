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
