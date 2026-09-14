/* ==========================================================================
   IGenglishschool — Supabase connection
   --------------------------------------------------------------------------
   COLE OS DOIS VALORES ABAIXO e recarregue a página.

   ONDE ACHAR, no painel do Supabase:

     SUPABASE_URL
       Settings → Data API → "Project URL"
       (ou o botão "Connect" no topo)
       Fica assim:  https://abcdefghijkl.supabase.co

     SUPABASE_ANON_KEY
       Settings → API Keys
       Serve QUALQUER UMA das duas — o Supabase está no meio de uma troca e
       as duas funcionam:
         • "Publishable key"   → começa com  sb_publishable_...   (nova)
         • "anon" / "public"    → começa com  eyJhbGciOi...        (antiga)

   Essa chave é PÚBLICA por natureza — está em todo site feito com Supabase e
   não dá acesso a nada sozinha. Quem protege os dados é o Row Level Security
   do arquivo .sql, que só casa com as linhas da professora logada.

   ⚠️ NUNCA cole aqui a chave "service_role" nem uma "Secret key"
   (sb_secret_...): essas ignoram todas as regras de segurança.

   Enquanto este arquivo estiver vazio, o site roda como sempre rodou —
   uma professora, tudo salvo neste navegador, sem login.
   ========================================================================== */

const SUPABASE_URL = 'https://tyeohandmesleovcyidc.supabase.co/rest/v1/';       // ex.: 'https://abcdefghijkl.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_W2yITaI98F168LrHebRtUQ_FH_SCJBG';  // ex.: 'sb_publishable_...'  ou  'eyJhbGciOi...'

/* --------------------------------------------------------------------------
   ONDE AS TABELAS FICAM
   --------------------------------------------------------------------------
   Este projeto pode DIVIDIR um banco Supabase com outro site — útil porque o
   plano gratuito só permite 2 projetos. Há duas formas de separar as tabelas,
   e a configuração abaixo tem que combinar com o arquivo .sql que você rodou:

   OPÇÃO A — schema próprio  (arquivo: supabase-schema.sql)
       SUPABASE_SCHEMA       = 'igenglish'
       SUPABASE_TABLE_PREFIX = ''
     Mais limpo, mas EXIGE liberar o schema na API:
       Integrations → Data API → Settings → Exposed schemas → some `igenglish`
     (em painéis mais antigos: Settings → API → Exposed schemas)

   OPÇÃO B — prefixo no public  (arquivo: supabase-schema-public.sql)
       SUPABASE_SCHEMA       = 'public'
       SUPABASE_TABLE_PREFIX = 'igenglish_'
     As tabelas viram `public.igenglish_students` etc. Como o `public` já
     está liberado na API, NÃO precisa configurar nada no painel.

   Em qualquer uma das duas a proteção é a mesma: Row Level Security por
   professora. Muda só onde as tabelas moram.
   -------------------------------------------------------------------------- */
const SUPABASE_SCHEMA = 'public';
const SUPABASE_TABLE_PREFIX = 'igenglish_';

// --------------------------------------------------------------------------
const IG_SUPABASE = {
  url: String(SUPABASE_URL || '').trim(),
  anonKey: String(SUPABASE_ANON_KEY || '').trim(),
  schema: String(SUPABASE_SCHEMA || 'public').trim() || 'public',
  tablePrefix: String(typeof SUPABASE_TABLE_PREFIX === 'string' ? SUPABASE_TABLE_PREFIX : '').trim(),

  // Pasting the wrong key is the one mistake here with real consequences: a
  // secret key bypasses Row Level Security entirely, and this file ships to
  // every browser that opens the site. Catch it loudly instead of quietly
  // working with a key that exposes every teacher's data.
  get secretKeyPasted() {
    const k = this.anonKey;
    if (/^sb_secret_/i.test(k)) return true;
    // A service_role JWT is a normal-looking token whose payload says so.
    try {
      const body = k.split('.')[1];
      if (!body) return false;
      const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
      return /"role"\s*:\s*"service_role"/.test(json);
    } catch (e) { return false; }
  },

  get configured() {
    return this.url.startsWith('http') && this.anonKey.length > 20 && !this.secretKeyPasted;
  },
};
window.IG_SUPABASE = IG_SUPABASE;

if (IG_SUPABASE.secretKeyPasted) {
  console.error(
    '[IGenglishschool] A chave colada em supabaseConfig.js é SECRETA '
    + '(service_role / sb_secret_…). Ela ignora todas as regras de segurança e '
    + 'ficaria visível para qualquer pessoa que abrisse o site. Troque pela '
    + 'chave pública: Settings → API Keys → "Publishable key" ou "anon".'
  );
}
