-- ===========================================================================
-- IGenglishschool — Supabase schema (VARIANTE COM PREFIXO, sem configurar API)
-- ===========================================================================
-- Use ESTE arquivo se você não conseguiu (ou não quis) liberar um schema novo
-- em "Exposed schemas".
--
-- Aqui as tabelas ficam no schema `public` — que o seu outro site já usa e
-- que JÁ ESTÁ liberado na API — separadas por um prefixo no nome:
--
--     public.igenglish_students
--     public.igenglish_class_sessions
--     ...
--
-- Resultado: nada para configurar no painel. Roda e funciona.
--
-- Continua valendo a mesma proteção: Row Level Security por
-- `teacher_id = auth.uid()` em todas as tabelas. E, como antes, este script
-- NÃO cria nem apaga nada em `auth.users` — um `drop trigger` ali apagaria o
-- trigger do outro site.
--
-- COMO RODAR
--   SQL Editor → New query → colar tudo → Run. Pode repetir quando quiser.
--
-- DEPOIS, em supabaseConfig.js, use:
--   const SUPABASE_SCHEMA = 'public';
--   const SUPABASE_TABLE_PREFIX = 'igenglish_';
-- ===========================================================================

-- Se você já rodou o supabase-schema.sql e quer trocar para esta variante,
-- descomente a linha abaixo. O schema está vazio (nenhuma aula foi salva
-- ainda), então não se perde nada — e o outro site não sente nada.
-- drop schema if exists igenglish cascade;

-- ---------------------------------------------------------------------------
-- TEACHERS — perfil, uma linha por usuário autenticado
-- ---------------------------------------------------------------------------
create table if not exists public.igenglish_teachers (
  id          uuid primary key references auth.users on delete cascade,
  name        text,
  school      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- STUDENTS
-- ---------------------------------------------------------------------------
create table if not exists public.igenglish_students (
  id           text not null,
  teacher_id   uuid not null references auth.users on delete cascade,
  name         text not null,
  age          integer,
  level_id     text,
  tier         text,
  level_label  text,
  color        text,
  avatar       text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (teacher_id, id)
);
create index if not exists igenglish_students_teacher_idx
  on public.igenglish_students (teacher_id);

-- ---------------------------------------------------------------------------
-- PROGRESS — estrelas / XP / stickers, uma linha por aluno
-- ---------------------------------------------------------------------------
create table if not exists public.igenglish_student_progress (
  student_id  text not null,
  teacher_id  uuid not null references auth.users on delete cascade,
  stars       integer not null default 0,
  xp          integer not null default 0,
  stickers    jsonb   not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (teacher_id, student_id)
);

-- ---------------------------------------------------------------------------
-- CLASS SESSIONS — o diário de "Today's Class"
-- ---------------------------------------------------------------------------
create table if not exists public.igenglish_class_sessions (
  id           text not null,
  teacher_id   uuid not null references auth.users on delete cascade,
  student_id   text not null,
  date         date not null,
  present      boolean not null default true,
  topic_label  text,
  notes        text,
  stats        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  primary key (teacher_id, id)
);
create index if not exists igenglish_class_sessions_student_idx
  on public.igenglish_class_sessions (teacher_id, student_id);

-- ---------------------------------------------------------------------------
-- REPORTS — um boletim salvo por (aluno, trimestre)
-- ---------------------------------------------------------------------------
create table if not exists public.igenglish_reports (
  teacher_id  uuid not null references auth.users on delete cascade,
  student_id  text not null,
  quarter_id  text not null,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (teacher_id, student_id, quarter_id)
);

-- ---------------------------------------------------------------------------
-- CUSTOM GAMES — criados no Game Maker
-- ---------------------------------------------------------------------------
create table if not exists public.igenglish_custom_games (
  id          text not null,
  teacher_id  uuid not null references auth.users on delete cascade,
  title       text not null,
  type        text not null,
  words       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (teacher_id, id)
);

-- ---------------------------------------------------------------------------
-- CURRICULUM OVERRIDES — edições do Editor de Conteúdos + textos de
-- Reading/Practice personalizados. Uma linha por professora.
-- ---------------------------------------------------------------------------
create table if not exists public.igenglish_curriculum_overrides (
  teacher_id  uuid primary key references auth.users on delete cascade,
  doc         jsonb not null default '{}'::jsonb,
  lesson_doc  jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ===========================================================================
-- PERMISSÕES
-- ===========================================================================
-- Desde 2026 o Supabase não expõe tabelas novas do `public` à API
-- automaticamente: cada tabela precisa de GRANT explícito. Por isso os
-- comandos abaixo são obrigatórios, e são dados TABELA A TABELA — um
-- `grant on all tables in schema public` daria acesso às tabelas do seu
-- site financeiro também.
grant select, insert, update, delete on public.igenglish_teachers             to anon, authenticated, service_role;
grant select, insert, update, delete on public.igenglish_students             to anon, authenticated, service_role;
grant select, insert, update, delete on public.igenglish_student_progress     to anon, authenticated, service_role;
grant select, insert, update, delete on public.igenglish_class_sessions       to anon, authenticated, service_role;
grant select, insert, update, delete on public.igenglish_reports             to anon, authenticated, service_role;
grant select, insert, update, delete on public.igenglish_custom_games        to anon, authenticated, service_role;
grant select, insert, update, delete on public.igenglish_curriculum_overrides to anon, authenticated, service_role;

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
-- É isto que garante, no banco, que uma professora nunca lê nem altera os
-- dados de outra. Os GRANTs acima só abrem a porta; o RLS decide as linhas.
alter table public.igenglish_teachers              enable row level security;
alter table public.igenglish_students              enable row level security;
alter table public.igenglish_student_progress      enable row level security;
alter table public.igenglish_class_sessions        enable row level security;
alter table public.igenglish_reports               enable row level security;
alter table public.igenglish_custom_games          enable row level security;
alter table public.igenglish_curriculum_overrides  enable row level security;

drop policy if exists igenglish_teachers_own on public.igenglish_teachers;
create policy igenglish_teachers_own on public.igenglish_teachers
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists igenglish_students_own on public.igenglish_students;
create policy igenglish_students_own on public.igenglish_students
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists igenglish_progress_own on public.igenglish_student_progress;
create policy igenglish_progress_own on public.igenglish_student_progress
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists igenglish_sessions_own on public.igenglish_class_sessions;
create policy igenglish_sessions_own on public.igenglish_class_sessions
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists igenglish_reports_own on public.igenglish_reports;
create policy igenglish_reports_own on public.igenglish_reports
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists igenglish_games_own on public.igenglish_custom_games;
create policy igenglish_games_own on public.igenglish_custom_games
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists igenglish_curriculum_own on public.igenglish_curriculum_overrides;
create policy igenglish_curriculum_own on public.igenglish_curriculum_overrides
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ===========================================================================
-- CONFERÊNCIA
-- ===========================================================================
-- Deve listar 7 tabelas `igenglish_*`, todas com rowsecurity = true.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename like 'igenglish\_%'
order by tablename;
