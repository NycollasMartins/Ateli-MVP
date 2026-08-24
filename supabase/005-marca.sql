-- ============================================================
-- Ateliê · 005 · Marca
--
-- Nome, cores e logo passam a vir do banco em vez de variável de ambiente,
-- para trocar de ateliê sem mexer no código nem republicar o site.
--
-- O nome e as cores ficam na tabela `config` (chave 'marca'), que já existe
-- desde o 001. Aqui só criamos onde o arquivo do logo vai morar.
--
-- Pode rodar de novo sem medo.
-- ============================================================

-- Balde público: o logo aparece no formulário aberto do QR e no cartaz
-- impresso, então precisa ser legível sem login. Só o servidor escreve nele,
-- usando a chave de serviço — por isso não há política de escrita aqui.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marca',
  'marca',
  true,
  1048576, -- 1 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
