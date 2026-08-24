-- ============================================================
-- Ateliê · Conferir o banco
--
-- NÃO MUDA NADA. Só lê e diz o que está no lugar e o que falta.
-- Cole no SQL Editor e rode sempre que ficar na dúvida sobre o que já rodou.
--
-- Lê apenas o catálogo do Postgres, então funciona mesmo num banco vazio.
-- ============================================================
with checagens as (

  -- ---------- Tabelas ----------
  select 1 as ordem, 'Tabela  servicos' as item,
    case when to_regclass('public.servicos') is null
      then 'FALTA — rode 001-tabelas.sql' else 'ok' end as situacao
  union all select 2, 'Tabela  pedidos',
    case when to_regclass('public.pedidos') is null
      then 'FALTA — rode 001-tabelas.sql' else 'ok' end
  union all select 3, 'Tabela  pedido_itens',
    case when to_regclass('public.pedido_itens') is null
      then 'FALTA — rode 001-tabelas.sql' else 'ok' end
  union all select 4, 'Tabela  notificacoes',
    case when to_regclass('public.notificacoes') is null
      then 'FALTA — rode 001-tabelas.sql' else 'ok' end
  union all select 5, 'Tabela  fechamentos',
    case when to_regclass('public.fechamentos') is null
      then 'FALTA — rode 001-tabelas.sql' else 'ok' end
  union all select 6, 'Tabela  config',
    case when to_regclass('public.config') is null
      then 'FALTA — rode 001-tabelas.sql' else 'ok' end
  union all select 7, 'Tabela  despesas',
    case when to_regclass('public.despesas') is null
      then 'FALTA — rode 003-despesas.sql' else 'ok' end
  union all select 8, 'Tabela  perfis',
    case when to_regclass('public.perfis') is null
      then 'FALTA — rode 004-usuarios.sql' else 'ok' end
  union all select 9, 'Tabela  pedido_fotos',
    case when to_regclass('public.pedido_fotos') is null
      then 'FALTA — rode 006-fotos.sql' else 'ok' end
  union all select 10, 'Tabela  despesas_fixas',
    case when to_regclass('public.despesas_fixas') is null
      then 'FALTA — rode 007-despesas-fixas.sql' else 'ok' end

  -- ---------- Colunas acrescentadas depois ----------
  union all select 20, 'Coluna  fechamentos.despesas_centavos',
    case when exists (select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'fechamentos'
          and column_name = 'despesas_centavos')
      then 'ok' else 'FALTA — rode 003-despesas.sql' end
  union all select 21, 'Coluna  despesas.despesa_fixa_id',
    case when exists (select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'despesas'
          and column_name = 'despesa_fixa_id')
      then 'ok' else 'FALTA — rode 007-despesas-fixas.sql' end
  union all select 22, 'Coluna  despesas.competencia',
    case when exists (select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'despesas'
          and column_name = 'competencia')
      then 'ok' else 'FALTA — rode 007-despesas-fixas.sql' end
  union all select 23, 'Trava   uma despesa fixa por mês',
    case when exists (select 1 from pg_indexes
        where schemaname = 'public' and indexname = 'idx_despesa_fixa_competencia')
      then 'ok' else 'FALTA — rode 007-despesas-fixas.sql' end
  -- Não basta o índice existir: se ele ainda tiver `where`, o Postgres não o
  -- aceita como alvo de ON CONFLICT e a despesa fixa nunca lança — em silêncio,
  -- sem erro na tela. É exatamente isso que o 009 conserta.
  union all select 24, 'Trava   índice da despesa fixa aceita ON CONFLICT',
    coalesce((select case when indexdef ilike '%where%'
        then 'FALTA — o índice ainda é parcial: despesa fixa NUNCA vai lançar. Rode 009-trava-despesa-fixa.sql'
        else 'ok' end
      from pg_indexes
      where schemaname = 'public' and indexname = 'idx_despesa_fixa_competencia'),
      'FALTA — rode 007 e 009')

  -- ---------- Login ----------
  union all select 30, 'Login   gatilho que cria o perfil',
    case when exists (select 1 from pg_trigger where tgname = 'ao_criar_usuario')
      then 'ok' else 'FALTA — rode 004-usuarios.sql' end
  union all select 31, 'Login   pessoas cadastradas',
    coalesce(
      (select case when count(*) = 0
        then 'NENHUMA — crie a primeira em Authentication > Users, com Auto Confirm'
        else count(*)::text || ' pessoa(s) — ok' end from auth.users),
      'não consegui ler auth.users')

  -- ---------- Arquivos ----------
  union all select 40, 'Balde   marca (logo, precisa ser ABERTO)',
    case
      when not exists (select 1 from storage.buckets where id = 'marca')
        then 'FALTA — rode 005-marca.sql'
      when (select public from storage.buckets where id = 'marca') then 'ok, aberto'
      else 'ATENCAO: está fechado — o logo não vai aparecer para a cliente' end
  union all select 41, 'Balde   pecas (fotos, precisa ser FECHADO)',
    case
      when not exists (select 1 from storage.buckets where id = 'pecas')
        then 'FALTA — rode 006-fotos.sql'
      when (select public from storage.buckets where id = 'pecas')
        then 'PERIGO: está ABERTO — fotos de clientes expostas. Rode 006-fotos.sql de novo'
      else 'ok, fechado' end

  -- ---------- Travas de conteúdo (008) ----------
  union all select 45, 'Trava   status e dinheiro do pedido',
    case
      when to_regclass('public.pedidos') is null then 'FALTA — rode 001-tabelas.sql'
      when (select count(*) from pg_constraint
            where contype = 'c'
              and conname in ('pedidos_status_valido', 'pedidos_dinheiro_coerente',
                              'despesas_valor_positivo', 'despesas_fixas_dia_valido')) = 4
        then 'ok'
      else 'FALTA — rode 008-travas.sql' end

  -- ---------- Segurança ----------
  union all select 50, 'Trava   RLS ligada em todas as tabelas',
    (select case
        when total = 0 then 'não dá para conferir — nenhuma tabela do Ateliê existe ainda'
        when abertas = 0 then 'ok, nas ' || total || ' tabela(s)'
        else 'PERIGO em: ' || nomes || ' — sem RLS, a chave pública lê esses dados' end
      from (
        select count(*) as total,
               count(*) filter (where not c.relrowsecurity) as abertas,
               string_agg(c.relname, ', ' order by c.relname)
                 filter (where not c.relrowsecurity) as nomes
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
          and c.relname in ('servicos', 'pedidos', 'pedido_itens', 'pedido_fotos',
                            'notificacoes', 'fechamentos', 'despesas', 'despesas_fixas',
                            'perfis', 'config')
      ) as r)

  -- ---------- É este o projeto? ----------
  -- Rodar o SQL no projeto errado é um erro fácil de cometer e difícil de ver:
  -- tudo dá certo, nada aparece no painel. Se este banco tiver tabelas que não
  -- são do Ateliê, quase certamente você está no projeto de outro sistema.
  union all select 60, 'Banco   é o projeto do Ateliê?',
    (select case
        when quantas = 0 then 'ok, só tabelas do Ateliê'
        else 'ATENCAO: este banco tem ' || quantas || ' tabela(s) de outro sistema — '
             || amostra || case when quantas > 6 then ' e outras' else '' end
             || '. Confira se está no projeto certo antes de rodar as migrações.' end
      from (
        select count(*) as quantas,
               string_agg(relname, ', ' order by relname)
                 filter (where posicao <= 6) as amostra
        from (
          select c.relname,
                 row_number() over (order by c.relname) as posicao
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relkind = 'r'
            and c.relname not in ('servicos', 'pedidos', 'pedido_itens', 'pedido_fotos',
                                  'notificacoes', 'fechamentos', 'despesas', 'despesas_fixas',
                                  'perfis', 'config')
        ) as estranhas
      ) as r)
)
select item, situacao from checagens order by ordem;
