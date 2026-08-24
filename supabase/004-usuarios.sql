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
