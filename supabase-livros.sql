-- ==========================================================================
-- IGenglishschool — Livros IG (área protegida para a professora)
-- --------------------------------------------------------------------------
-- O QUE FAZ
--   • Cria uma pasta PRIVADA no Supabase Storage chamada "igenglish-livros".
--   • Só os e-mails da lista abaixo, logados no site, conseguem ver/baixar.
--     Ninguém mais — nem quem criar conta no site, nem quem tiver um link
--     antigo (os links que o site gera expiram em 1 hora).
--
-- COMO USAR
--   1. Troque  SEU-EMAIL@AQUI.com  (lá embaixo) pelo e-mail com que você
--      entra no site. Para liberar outra professora, copie a linha e
--      coloque o e-mail dela.
--   2. Supabase → SQL Editor → New query → cole tudo → Run.
--   3. Supabase → Storage → igenglish-livros → Upload files → arraste os PDFs
--      da pasta  livros\para-enviar.
--
-- Pode rodar de novo quantas vezes quiser (não apaga nada).
-- Não mexe em nenhuma tabela do outro site que divide este banco.
-- ==========================================================================

-- 1) A pasta privada
insert into storage.buckets (id, name, public)
values ('igenglish-livros', 'igenglish-livros', false)
on conflict (id) do update set public = false;

-- 2) Quem pode ler os livros
create table if not exists public.igenglish_book_readers (
  email text primary key
);
-- Sem políticas = ninguém lê ou altera esta lista pela internet.
alter table public.igenglish_book_readers enable row level security;

create or replace function public.igenglish_can_read_books()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.igenglish_book_readers
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 3) A regra de acesso à pasta
drop policy if exists "igenglish livros: leitoras" on storage.objects;
create policy "igenglish livros: leitoras"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'igenglish-livros' and public.igenglish_can_read_books());

-- 4) ⬇️  TROQUE PELO SEU E-MAIL DE LOGIN NO SITE  ⬇️
insert into public.igenglish_book_readers (email) values
  ('SEU-EMAIL@AQUI.com')
on conflict do nothing;
