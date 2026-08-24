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
