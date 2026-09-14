-- ===========================================================================
-- IGenglishschool — Supabase schema
-- ===========================================================================
-- Feito para CONVIVER com outros projetos no mesmo banco Supabase.
--
-- Tudo vive num schema próprio (`igenglish`), então nenhuma tabela, função ou
-- policy encosta no que já existe em `public`. Não há prefixo em nome de
-- tabela porque o schema já é o namespace.
--
-- IMPORTANTE: este script NÃO cria trigger em `auth.users`. Um `drop trigger
-- if exists on_auth_user_created on auth.users` — presente na maioria dos
-- tutoriais — apagaria o trigger do OUTRO site que divide este banco e
-- quebraria os cadastros dele. A linha da professora em `igenglish.teachers`
-- é criada pelo próprio site no primeiro login.
--
-- COMO RODAR
--   SQL Editor → New query → colar tudo → Run.
--   Pode rodar de novo quando quiser: nada é duplicado.
--
-- DEPOIS DE RODAR, faça o passo que quase todo mundo esquece:
--   Settings → API → Exposed schemas → acrescente `igenglish` → Save.
--   Sem isso a API devolve "schema must be one of the following: public".
-- ===========================================================================

create schema if not exists igenglish;

-- ---------------------------------------------------------------------------
-- TEACHERS — perfil, uma linha por usuário autenticado
-- ---------------------------------------------------------------------------
create table if not exists igenglish.teachers (
  id          uuid primary key references auth.users on delete cascade,
  name        text,
  school      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- STUDENTS
-- ---------------------------------------------------------------------------
create table if not exists igenglish.students (
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
create index if not exists students_teacher_idx on igenglish.students (teacher_id);

-- ---------------------------------------------------------------------------
-- PROGRESS — estrelas / XP / stickers, uma linha por aluno
-- ---------------------------------------------------------------------------
create table if not exists igenglish.student_progress (
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
create table if not exists igenglish.class_sessions (
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
create index if not exists class_sessions_student_idx
  on igenglish.class_sessions (teacher_id, student_id);

-- ---------------------------------------------------------------------------
-- REPORTS — um boletim salvo por (aluno, trimestre)
-- ---------------------------------------------------------------------------
create table if not exists igenglish.reports (
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
create table if not exists igenglish.custom_games (
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
-- CURRICULUM OVERRIDES — o documento de edições do Editor de Conteúdos,
-- mais os textos de Reading/Practice personalizados. Uma linha por professora.
-- ---------------------------------------------------------------------------
create table if not exists igenglish.curriculum_overrides (
  teacher_id  uuid primary key references auth.users on delete cascade,
  doc         jsonb not null default '{}'::jsonb,
  lesson_doc  jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ===========================================================================
-- PERMISSÕES
-- ===========================================================================
-- O schema precisa ser visível para os papéis da API. Quem filtra as LINHAS
-- é o RLS abaixo — este grant só abre a porta do schema.
grant usage on schema igenglish to anon, authenticated, service_role;

grant all on all tables    in schema igenglish to anon, authenticated, service_role;
grant all on all sequences in schema igenglish to anon, authenticated, service_role;
grant all on all functions in schema igenglish to anon, authenticated, service_role;

alter default privileges in schema igenglish
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema igenglish
  grant all on sequences to anon, authenticated, service_role;

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
-- É isto que garante, no banco, que uma professora nunca lê nem altera os
-- dados de outra — nem de outro site que divida este mesmo projeto.
alter table igenglish.teachers              enable row level security;
alter table igenglish.students              enable row level security;
alter table igenglish.student_progress      enable row level security;
alter table igenglish.class_sessions        enable row level security;
alter table igenglish.reports               enable row level security;
alter table igenglish.custom_games          enable row level security;
alter table igenglish.curriculum_overrides  enable row level security;

drop policy if exists teachers_own on igenglish.teachers;
create policy teachers_own on igenglish.teachers
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists students_own on igenglish.students;
create policy students_own on igenglish.students
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists student_progress_own on igenglish.student_progress;
create policy student_progress_own on igenglish.student_progress
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists class_sessions_own on igenglish.class_sessions;
create policy class_sessions_own on igenglish.class_sessions
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists reports_own on igenglish.reports;
create policy reports_own on igenglish.reports
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists custom_games_own on igenglish.custom_games;
create policy custom_games_own on igenglish.custom_games
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists curriculum_overrides_own on igenglish.curriculum_overrides;
create policy curriculum_overrides_own on igenglish.curriculum_overrides
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ===========================================================================
-- CONFERÊNCIA
-- ===========================================================================
-- Deve listar 7 tabelas, todas com rowsecurity = true.
select tablename, rowsecurity
from pg_tables
where schemaname = 'igenglish'
order by tablename;
