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
