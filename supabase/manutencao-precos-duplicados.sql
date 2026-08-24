-- ============================================================
-- Ateliê · Manutenção · Tabela de preços duplicada
--
-- Rode SÓ se você desconfia que a tabela de preços tem serviços repetidos.
--
-- Por que isso pode ter acontecido: o antigo `schema.sql` terminava com um
-- `insert ... on conflict do nothing` sem índice único no nome. Sem o índice,
-- o "on conflict" não pegava nada, e cada vez que aquele arquivo era rodado os
-- 15 serviços iniciais entravam de novo. O arquivo atual
-- (002-tabela-de-precos.sql) só semeia se a tabela estiver vazia, então o
-- problema não se repete — mas quem rodou o antigo duas vezes já tem o estrago.
-- ============================================================

-- ---------- PASSO 1: ver se existe duplicado (não muda nada) ----------
select nome, count(*) as vezes, sum(case when ativo then 1 else 0 end) as ativos
from servicos
group by nome
having count(*) > 1
order by vezes desc, nome;

-- Se não voltou nenhuma linha, está tudo certo. Pode parar por aqui.


-- ---------- PASSO 2: esconder as cópias (só depois de olhar o passo 1) ----------
-- Descomente o bloco abaixo para rodar.
--
-- NÃO apaga nada: só desativa as cópias, que é como o painel já trata serviço
-- aposentado. Assim, se algum pedido antigo apontar para a cópia, o histórico
-- dele continua inteiro.
--
-- Mantém de cada nome o mais antigo — que é o que as clientes vêm vendo.

-- update servicos s
--    set ativo = false
--  where s.ativo
--    and exists (
--      select 1 from servicos anterior
--       where anterior.nome = s.nome
--         and anterior.criado_em < s.criado_em
--    );

-- Depois de rodar, confira em Painel > Tabela de preços: cada serviço deve
-- aparecer uma vez só. O que foi escondido continua no banco, e some do
-- formulário da cliente.
