/* ==========================================================================
   IGenglishschool — Supabase connection
   --------------------------------------------------------------------------
   COLE OS DOIS VALORES ABAIXO e recarregue a página.

   Onde achar:
     Painel do Supabase → seu projeto → Settings → API
       • Project URL                            →  SUPABASE_URL
       • Project API keys → chave "anon"/"public" →  SUPABASE_ANON_KEY

   A chave `anon` é PÚBLICA por natureza — está em todo site feito com
   Supabase e não dá acesso a nada sozinha. Quem protege os dados é o Row
   Level Security do supabase-schema.sql, que só casa com as linhas da
   professora logada. NUNCA cole aqui a chave `service_role`: essa ignora
   todas as regras de segurança.

   Enquanto este arquivo estiver vazio, o site roda como sempre rodou —
   uma professora, tudo salvo neste navegador, sem login.
   ========================================================================== */

const SUPABASE_URL = '';       // ex.: 'https://abcdefghijkl.supabase.co'
const SUPABASE_ANON_KEY = '';  // ex.: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...'

/* --------------------------------------------------------------------------
   SCHEMA
   --------------------------------------------------------------------------
   Este projeto pode DIVIDIR um banco Supabase com outro site — útil porque o
   plano gratuito só permite 2 projetos. As tabelas ficam todas no schema
   `igenglish`, isoladas do `public` que o outro site usa.

   Depois de rodar o supabase-schema.sql, é obrigatório liberar o schema na
   API, senão toda consulta falha com "schema must be one of the following":

     Settings → API → Exposed schemas → acrescente `igenglish` → Save

   Só mude o nome abaixo se você tiver editado o nome do schema no SQL.
   -------------------------------------------------------------------------- */
const SUPABASE_SCHEMA = 'igenglish';

// --------------------------------------------------------------------------
const IG_SUPABASE = {
  url: String(SUPABASE_URL || '').trim(),
  anonKey: String(SUPABASE_ANON_KEY || '').trim(),
  schema: String(SUPABASE_SCHEMA || 'public').trim() || 'public',
  get configured() {
    return this.url.startsWith('http') && this.anonKey.length > 20;
  },
};
window.IG_SUPABASE = IG_SUPABASE;
