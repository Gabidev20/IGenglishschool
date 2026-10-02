-- ===========================================================================
-- IGenglishschool — Acesso do aluno/responsável por link
-- ---------------------------------------------------------------------------
-- Rode este arquivo DEPOIS do supabase-schema-public.sql, no mesmo projeto.
--
-- O QUE ELE CRIA
--   1. igenglish_student_links    — um código secreto por aluno
--   2. igenglish_student_activity — o que o aluno fez em casa
--   3. duas funções que o link usa:  share_read(código)  e  share_write(...)
--
-- COMO A SEGURANÇA FUNCIONA
--   As tabelas continuam fechadas: ninguém anônimo lê nem escreve nelas
--   diretamente. O site do aluno só enxerga o banco através das duas funções,
--   que são `security definer` e exigem o código do aluno. O código é longo e
--   aleatório (como um link do Google Drive): quem tem o link vê aquele aluno,
--   e só ele. A professora pode revogar quando quiser.
--
--   A função de escrita NUNCA apaga nada e NUNCA toca em outro aluno: ela só
--   acrescenta linhas na tabela de atividade daquele aluno.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. LINKS
-- ---------------------------------------------------------------------------
create table if not exists public.igenglish_student_links (
  code        text primary key,
  teacher_id  uuid not null references auth.users on delete cascade,
  student_id  text not null,
  student_name text,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz
);

create index if not exists igenglish_links_teacher_idx
  on public.igenglish_student_links (teacher_id);
create unique index if not exists igenglish_links_student_idx
  on public.igenglish_student_links (teacher_id, student_id) where not revoked;

-- ---------------------------------------------------------------------------
-- 2. O QUE O ALUNO FEZ EM CASA
-- ---------------------------------------------------------------------------
-- Fica separado das tabelas da professora de propósito: o navegador dela
-- reescreve as linhas dela inteiras a cada sincronização, e isso apagaria o
-- que o aluno tivesse mandado no meio do caminho. Aqui só o aluno escreve e
-- só a professora lê.
create table if not exists public.igenglish_student_activity (
  id          text not null,
  teacher_id  uuid not null references auth.users on delete cascade,
  student_id  text not null,
  kind        text not null,            -- attempt | homework_result | writing | progress
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  primary key (teacher_id, student_id, kind, id)
);

create index if not exists igenglish_activity_teacher_idx
  on public.igenglish_student_activity (teacher_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. RLS — a professora manda nas linhas dela; anônimo não toca em nada
-- ---------------------------------------------------------------------------
alter table public.igenglish_student_links    enable row level security;
alter table public.igenglish_student_activity enable row level security;

drop policy if exists igenglish_links_own on public.igenglish_student_links;
create policy igenglish_links_own on public.igenglish_student_links
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists igenglish_activity_own on public.igenglish_student_activity;
create policy igenglish_activity_own on public.igenglish_student_activity
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. LEITURA PELO LINK
-- ---------------------------------------------------------------------------
-- Devolve só o que a página do aluno precisa mostrar: ele mesmo, o progresso
-- dele, a lição de casa dele e os textos dele. Nada de outros alunos, nada
-- financeiro, nada de outras professoras.
create or replace function public.igenglish_share_read(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link    record;
  v_student jsonb;
  v_progress jsonb;
  v_data    jsonb;
  v_activity jsonb;
begin
  select * into v_link
  from public.igenglish_student_links
  where code = p_code and not revoked;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'link_invalid');
  end if;

  update public.igenglish_student_links
     set last_seen = now()
   where code = p_code;

  select to_jsonb(s) into v_student
  from public.igenglish_students s
  where s.teacher_id = v_link.teacher_id and s.id = v_link.student_id;

  if v_student is null then
    return jsonb_build_object('ok', false, 'error', 'student_missing');
  end if;

  select to_jsonb(p) into v_progress
  from public.igenglish_student_progress p
  where p.teacher_id = v_link.teacher_id and p.student_id = v_link.student_id;

  -- A lição de casa, o histórico e os textos viajam dentro do jsonb livre que
  -- o site já sincroniza — a coluna chama-se `lesson_doc` (ver
  -- supabase-schema-public.sql). Recortamos aqui a fatia deste aluno.
  select o.lesson_doc into v_data
  from public.igenglish_curriculum_overrides o
  where o.teacher_id = v_link.teacher_id;

  v_activity := coalesce((
    select jsonb_agg(jsonb_build_object('kind', a.kind, 'id', a.id, 'payload', a.payload))
    from public.igenglish_student_activity a
    where a.teacher_id = v_link.teacher_id and a.student_id = v_link.student_id
  ), '[]'::jsonb);

  return jsonb_build_object(
    'ok', true,
    'student', v_student,
    'progress', coalesce(v_progress, '{}'::jsonb),
    'homework', coalesce(
      (select jsonb_agg(h) from jsonb_array_elements(coalesce(v_data->'homework', '[]'::jsonb)) h
        where h->>'studentId' = v_link.student_id), '[]'::jsonb),
    'log',     coalesce(v_data->('log_'     || v_link.student_id), '[]'::jsonb),
    'bank',    coalesce(v_data->('bank_'    || v_link.student_id), '{}'::jsonb),
    'writing', coalesce(v_data->('writing_' || v_link.student_id), '[]'::jsonb),
    'review',  coalesce(v_data->('review_'  || v_link.student_id), '{}'::jsonb),
    'profile', v_data->'student_profiles'->(v_link.student_id),
    'activity', v_activity
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. ESCRITA PELO LINK
-- ---------------------------------------------------------------------------
-- Só acrescenta na tabela de atividade. Nunca apaga, nunca altera as tabelas
-- da professora, nunca alcança outro aluno.
create or replace function public.igenglish_share_write(p_code text, p_kind text, p_id text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
begin
  select * into v_link
  from public.igenglish_student_links
  where code = p_code and not revoked;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'link_invalid');
  end if;

  if p_kind not in ('attempt', 'homework_result', 'writing', 'progress') then
    return jsonb_build_object('ok', false, 'error', 'kind_invalid');
  end if;

  -- Um teto por aluno: um link que vazasse não pode encher o banco.
  if (select count(*) from public.igenglish_student_activity
       where teacher_id = v_link.teacher_id and student_id = v_link.student_id) > 5000 then
    return jsonb_build_object('ok', false, 'error', 'quota');
  end if;

  insert into public.igenglish_student_activity (id, teacher_id, student_id, kind, payload)
  values (p_id, v_link.teacher_id, v_link.student_id, p_kind, coalesce(p_payload, '{}'::jsonb))
  on conflict (teacher_id, student_id, kind, id)
  do update set payload = excluded.payload, created_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

-- Quem pode chamar: qualquer visitante, mas sempre precisando do código.
revoke all on function public.igenglish_share_read(text) from public;
revoke all on function public.igenglish_share_write(text, text, text, jsonb) from public;
grant execute on function public.igenglish_share_read(text)  to anon, authenticated;
grant execute on function public.igenglish_share_write(text, text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
select tablename, rowsecurity
  from pg_tables
 where schemaname = 'public' and tablename like 'igenglish_student_%'
 order by tablename;
