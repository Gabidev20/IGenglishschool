/* ==========================================================================
   IGenglishschool — Teacher accounts + cloud sync (Supabase)
   --------------------------------------------------------------------------
   Loaded after utils.js/supabaseConfig.js and before the app modules.

   TWO MODES
   ---------
   • supabaseConfig.js empty  -> LOCAL MODE. No login, everything saved in
     this browser, exactly as the site behaved before accounts existed.
   • supabaseConfig.js filled -> CLOUD MODE. A teacher signs in with email +
     password; her students, class log, reports, custom games and curriculum
     edits live in her own Supabase rows and follow her to any device.

   HOW IT SYNCS
   ------------
   The app renders straight out of localStorage, synchronously, the moment
   its scripts run — so this layer never puts the network in front of a
   render. Instead:

     boot   -> the workspace id is read synchronously from localStorage, so
               the right teacher's cached data is on screen immediately;
     then   -> the cloud copy is pulled in the background and, if it differs,
               the affected views re-render;
     write  -> IGStore.onWrite mirrors every change up, debounced.

   That means the site keeps working with no connection, and a flaky network
   can never lose a lesson's worth of stars.
   ========================================================================== */

const IGCloud = (() => {
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js';
  const PUSH_DELAY_MS = 900;

  let client = null;
  let teacher = null;            // { id, email, name }
  let ready = false;
  const statusListeners = [];

  const enabled = () => Boolean(window.IG_SUPABASE && window.IG_SUPABASE.configured);

  // The app's tables can live either in their own schema (`igenglish.students`)
  // or in `public` behind a prefix (`public.igenglish_students`) — the second
  // form needs no API configuration at all, which matters when the Supabase
  // project is shared with another site. Everything below names tables
  // logically and lets this one helper resolve them.
  let layout = null;   // { schema, prefix } — resolved once, then cached

  const tbl = (name) => (layout ? layout.prefix : ((window.IG_SUPABASE && window.IG_SUPABASE.tablePrefix) || '')) + name;

  // The two SQL files put the tables in different places:
  //   supabase-schema-public.sql -> public.igenglish_students
  //   supabase-schema.sql        -> igenglish.students
  // Asking the teacher to remember which one she ran is a question the app
  // can answer itself in one round trip — so it does, and remembers.
  const LAYOUT_CACHE_KEY = 'hopscotch_supabase_layout';

  function configuredLayout() {
    return {
      schema: (window.IG_SUPABASE && window.IG_SUPABASE.schema) || 'public',
      prefix: (window.IG_SUPABASE && window.IG_SUPABASE.tablePrefix) || '',
    };
  }

  function layoutCandidates() {
    const configured = configuredLayout();
    const alternative = configured.prefix
      ? { schema: 'igenglish', prefix: '' }          // configured for B -> try A
      : { schema: 'public', prefix: 'igenglish_' };  // configured for A -> try B
    return [configured, alternative];
  }

  // A "missing table/schema" answer means "look elsewhere"; anything else
  // (no network, bad key, RLS) is a real failure and must not be masked.
  function isMissingTable(error) {
    const msg = String((error && error.message) || '');
    return /relation .* does not exist|could not find the table|schema must be one of|does not exist.*schema/i.test(msg);
  }

  async function probeLayout(candidate) {
    const sb = window.supabase.createClient(window.IG_SUPABASE.url, window.IG_SUPABASE.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ig-english-auth' },
      db: { schema: candidate.schema },
    });
    const { error } = await sb.from(candidate.prefix + 'students').select('teacher_id').limit(1);
    if (error && isMissingTable(error)) return null;
    if (error) throw error;                 // a real problem — surface it
    return sb;
  }

  async function resolveLayout() {
    try {
      const cached = JSON.parse(localStorage.getItem(LAYOUT_CACHE_KEY));
      if (cached && cached.schema) { layout = cached; return; }
    } catch (e) {}

    let lastRealError = null;
    for (const candidate of layoutCandidates()) {
      try {
        const sb = await probeLayout(candidate);
        if (sb) {
          layout = candidate;
          client = sb;
          try { localStorage.setItem(LAYOUT_CACHE_KEY, JSON.stringify(candidate)); } catch (e) {}
          const configured = configuredLayout();
          if (candidate.schema !== configured.schema || candidate.prefix !== configured.prefix) {
            console.info(
              `[IGenglishschool] As tabelas foram encontradas em `
              + `${candidate.schema}.${candidate.prefix}* — usando essa configuração. `
              + `Para deixar explícito, ajuste supabaseConfig.js.`
            );
          }
          return;
        }
      } catch (e) { lastRealError = e; }
    }
    if (lastRealError) throw lastRealError;
    throw new Error(
      'Não encontrei as tabelas no Supabase. Rode o supabase-schema-public.sql '
      + '(ou o supabase-schema.sql) no SQL Editor e recarregue.'
    );
  }

  // Turns the two setup mistakes everyone makes into instructions.
  function describeError(err) {
    const msg = String((err && err.message) || err || '');
    const schema = (window.IG_SUPABASE && window.IG_SUPABASE.schema) || 'public';
    if (/schema must be one of|does not exist.*schema|search_path/i.test(msg)) {
      return new Error(
        `O schema "${schema}" não está liberado na API. No Supabase: `
        + `Settings → API → Exposed schemas → acrescente "${schema}" → Save.`
      );
    }
    if (/relation .* does not exist|could not find the table/i.test(msg)) {
      const prefix = (window.IG_SUPABASE && window.IG_SUPABASE.tablePrefix) || '';
      const file = prefix ? 'supabase-schema-public.sql' : 'supabase-schema.sql';
      return new Error(
        `As tabelas ainda não existem${prefix ? '' : ` no schema "${schema}"`}. `
        + `Rode o ${file} no SQL Editor do Supabase.`
      );
    }
    return err instanceof Error ? err : new Error(msg || 'Erro desconhecido.');
  }

  function notifyStatus() {
    statusListeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  // -------------------------------------------------------------------------
  // SCRIPT LOADING — the SDK is only fetched when accounts are actually in use
  // -------------------------------------------------------------------------
  function loadSDK() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SUPABASE_CDN;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load the Supabase library. Check the connection.'));
      document.head.appendChild(s);
    });
  }

  async function getClient() {
    if (client) return client;
    await loadSDK();
    const schema = layout ? layout.schema : ((window.IG_SUPABASE && window.IG_SUPABASE.schema) || 'public');
    client = window.supabase.createClient(window.IG_SUPABASE.url, window.IG_SUPABASE.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // A shared project may already have another site storing its session
        // under the default key. Keep ours separate so the two never fight
        // over the same slot in localStorage.
        storageKey: 'ig-english-auth',
      },
      // All tables live in their own schema (see supabase-schema.sql), so
      // this project can share one free-tier Supabase database with another
      // site without either touching the other's tables.
      db: { schema },
    });
    return client;
  }

  // -------------------------------------------------------------------------
  // TABLE MAP — which logical storage key belongs to which table
  // -------------------------------------------------------------------------
  // Keys NOT listed here stay on this device on purpose: the active student
  // and the in-progress session score are "where am I right now" state, not
  // records worth syncing between a teacher's laptop and her phone.
  const LOCAL_ONLY = new Set(['active_student']);
  const isLocalOnly = (key) => LOCAL_ONLY.has(key) || key.startsWith('currentSession_');

  // Which Supabase row a logical key is written into. Keys with a table of
  // their own name it; EVERYTHING ELSE shares the curriculum_overrides row.
  //
  // That catch-all is the important part. pushKey used to fall off the end
  // for any key it did not recognise, so the sticker book, the Wheel's
  // challenges and anything added later were silently device-only — saved,
  // never synced, and gone when the teacher signed in somewhere else. The
  // overrides row already carries a free-form jsonb column, and pull() already
  // writes every key it finds there straight back into IGStore, so routing
  // the strays through it costs no schema change at all.
  const OVERRIDES_BUCKET = 'curriculum_v1';
  function bucketFor(key) {
    if (key === 'students' || key === 'custom_games') return key;
    if (key.startsWith('progress_') || key.startsWith('sessions_') || key.startsWith('reports_')) return key;
    return OVERRIDES_BUCKET;
  }

  // The keys that ride along inside the overrides row.
  function looseKeys() {
    return IGStore.keys().filter(k => !isLocalOnly(k) && k !== 'curriculum_v1' && bucketFor(k) === OVERRIDES_BUCKET);
  }

  // -------------------------------------------------------------------------
  // PULL — cloud -> localStorage
  // -------------------------------------------------------------------------
  async function pull() {
    const sb = await getClient();
    const tid = teacher.id;

    const [students, progress, sessions, reports, games, overrides] = await Promise.all([
      sb.from(tbl('students')).select('*').eq('teacher_id', tid).order('sort_order'),
      sb.from(tbl('student_progress')).select('*').eq('teacher_id', tid),
      sb.from(tbl('class_sessions')).select('*').eq('teacher_id', tid),
      sb.from(tbl('reports')).select('*').eq('teacher_id', tid),
      sb.from(tbl('custom_games')).select('*').eq('teacher_id', tid),
      sb.from(tbl('curriculum_overrides')).select('*').eq('teacher_id', tid).maybeSingle(),
    ]);

    const firstError = [students, progress, sessions, reports, games, overrides].find(r => r.error);
    if (firstError) throw describeError(firstError.error);

    // A brand-new teacher has no rows at all. Seeding from the cloud would
    // wipe the default student list she is about to see, so the first sync
    // pushes the local starting point up instead of pulling emptiness down.
    if ((students.data || []).length === 0) {
      await pushEverything();
      return { seeded: true };
    }

    IGStore.silently(() => {
      IGStore.setJSON('students', (students.data || []).map(rowToStudent));

      (progress.data || []).forEach(row => {
        IGStore.setJSON(`progress_${row.student_id}`, {
          stars: row.stars || 0, xp: row.xp || 0,
          stickers: Array.isArray(row.stickers) ? row.stickers : [],
        });
      });

      const byStudent = {};
      (sessions.data || []).forEach(row => {
        (byStudent[row.student_id] = byStudent[row.student_id] || []).push(rowToSession(row));
      });
      Object.entries(byStudent).forEach(([sid, list]) => {
        list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        IGStore.setJSON(`sessions_${sid}`, list);
      });

      const reportsByStudent = {};
      (reports.data || []).forEach(row => {
        (reportsByStudent[row.student_id] = reportsByStudent[row.student_id] || []).push(row.data);
      });
      Object.entries(reportsByStudent).forEach(([sid, list]) => IGStore.setJSON(`reports_${sid}`, list));

      IGStore.setJSON('custom_games', (games.data || []).map(rowToGame));

      const doc = overrides.data || {};
      if (doc.doc) IGStore.setJSON('curriculum_v1', doc.doc);
      const lessons = doc.lesson_doc || {};
      Object.entries(lessons).forEach(([key, value]) => IGStore.setJSON(key, value));
    });

    return { seeded: false };
  }

  function rowToStudent(row) {
    return {
      id: row.id, name: row.name, age: row.age,
      levelId: row.level_id, tier: row.tier, levelLabel: row.level_label,
      color: row.color, avatar: row.avatar,
    };
  }
  function rowToSession(row) {
    return {
      id: row.id, date: row.date, present: row.present,
      topicLabel: row.topic_label || '', notes: row.notes || '',
      stats: row.stats || { xp: 0, stars: 0 },
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
  }
  function rowToGame(row) {
    return {
      id: row.id, title: row.title, type: row.type,
      words: Array.isArray(row.words) ? row.words : [],
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
  }

  // -------------------------------------------------------------------------
  // PUSH — localStorage -> cloud, one logical key at a time
  // -------------------------------------------------------------------------
  async function pushKey(key) {
    if (!ready || !teacher || isLocalOnly(key)) return;
    const sb = await getClient();
    const tid = teacher.id;

    if (key === 'students') {
      const list = IGStore.getJSON('students', []) || [];
      const rows = list.map((s, i) => ({
        id: s.id, teacher_id: tid, name: s.name, age: s.age ?? null,
        level_id: s.levelId || null, tier: s.tier || null, level_label: s.levelLabel || null,
        color: s.color || null, avatar: s.avatar || null, sort_order: i,
        updated_at: new Date().toISOString(),
      }));
      if (rows.length) await sb.from(tbl('students')).upsert(rows, { onConflict: 'teacher_id,id' });
      // Students removed locally must disappear from the cloud too.
      const keepIds = list.map(s => s.id);
      let del = sb.from(tbl('students')).delete().eq('teacher_id', tid);
      if (keepIds.length) del = del.not('id', 'in', `(${keepIds.map(id => `"${id}"`).join(',')})`);
      await del;
      return;
    }

    if (key.startsWith('progress_')) {
      const sid = key.slice('progress_'.length);
      const p = IGStore.getJSON(key, null);
      if (!p) return;
      await sb.from(tbl('student_progress')).upsert({
        teacher_id: tid, student_id: sid,
        stars: p.stars || 0, xp: p.xp || 0,
        stickers: p.stickers || [], updated_at: new Date().toISOString(),
      }, { onConflict: 'teacher_id,student_id' });
      return;
    }

    if (key.startsWith('sessions_')) {
      const sid = key.slice('sessions_'.length);
      const list = IGStore.getJSON(key, []) || [];
      const rows = list.map(s => ({
        id: s.id, teacher_id: tid, student_id: sid, date: s.date,
        present: Boolean(s.present), topic_label: s.topicLabel || null,
        notes: s.notes || null, stats: s.stats || {},
      }));
      if (rows.length) await sb.from(tbl('class_sessions')).upsert(rows, { onConflict: 'teacher_id,id' });
      return;
    }

    if (key.startsWith('reports_')) {
      const sid = key.slice('reports_'.length);
      const list = IGStore.getJSON(key, []) || [];
      const rows = list.map(r => ({
        teacher_id: tid, student_id: sid, quarter_id: r.quarterId,
        data: r, updated_at: new Date().toISOString(),
      }));
      if (rows.length) await sb.from(tbl('reports')).upsert(rows, { onConflict: 'teacher_id,student_id,quarter_id' });
      return;
    }

    if (key === 'custom_games') {
      const list = IGStore.getJSON('custom_games', []) || [];
      const rows = list.map(g => ({
        id: g.id, teacher_id: tid, title: g.title, type: g.type,
        words: g.words || [], updated_at: new Date().toISOString(),
      }));
      if (rows.length) await sb.from(tbl('custom_games')).upsert(rows, { onConflict: 'teacher_id,id' });
      const keepIds = list.map(g => g.id);
      let del = sb.from(tbl('custom_games')).delete().eq('teacher_id', tid);
      if (keepIds.length) del = del.not('id', 'in', `(${keepIds.map(id => `"${id}"`).join(',')})`);
      await del;
      return;
    }

    // The catch-all. Reached by curriculum_v1, the per-topic reading/practice
    // overrides, and every other key without a table of its own.
    const lessonDoc = {};
    looseKeys().forEach(k => { lessonDoc[k] = IGStore.getJSON(k, null); });
    await sb.from(tbl('curriculum_overrides')).upsert({
      teacher_id: tid,
      doc: IGStore.getJSON('curriculum_v1', {}) || {},
      lesson_doc: lessonDoc,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'teacher_id' });
  }

  async function pushEverything() {
    const keys = IGStore.keys().filter(k => !isLocalOnly(k));
    // Everything sharing the overrides row is pushed once, not once per key.
    const seen = new Set();
    for (const key of keys) {
      const bucket = bucketFor(key);
      if (seen.has(bucket)) continue;
      seen.add(bucket);
      try { await pushKey(bucket); } catch (e) { console.error('push failed for ' + bucket, e); }
    }
  }

  // Debounced queue: a lesson can award stars a dozen times a minute and
  // each one must not become its own round trip.
  const pending = new Set();
  let flushTimer = null;
  let syncing = false;
  let lastError = null;

  function queue(key) {
    if (!ready || isLocalOnly(key)) return;
    const bucket = bucketFor(key);
    pending.add(bucket);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, PUSH_DELAY_MS);
  }

  async function flush() {
    if (!ready || pending.size === 0 || syncing) return;
    const batch = [...pending];
    pending.clear();
    syncing = true;
    notifyStatus();
    try {
      for (const key of batch) await pushKey(key);
      lastError = null;
    } catch (e) {
      // Put the work back — the local copy is still correct and authoritative.
      batch.forEach(k => pending.add(k));
      lastError = e;
      console.error('Cloud sync failed', e);
    } finally {
      syncing = false;
      notifyStatus();
    }
  }

  // -------------------------------------------------------------------------
  // AUTH
  // -------------------------------------------------------------------------
  async function signIn(email, password) {
    const sb = await getClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password, name) {
    const sb = await getClient();
    const { data, error } = await sb.auth.signUp({
      email, password, options: { data: { name } },
    });
    if (error) throw error;
    return data;
  }

  async function resetPassword(email) {
    const sb = await getClient();
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
    if (error) throw error;
  }

  async function signOut() {
    try {
      await flush();
      const sb = await getClient();
      await sb.auth.signOut();
    } catch (e) { console.error(e); }
    try {
      localStorage.removeItem('hopscotch_workspace');
      localStorage.removeItem(LAYOUT_CACHE_KEY);
    } catch (e) {}
    window.location.reload();
  }

  async function currentSession() {
    const sb = await getClient();
    const { data } = await sb.auth.getSession();
    return data ? data.session : null;
  }

  // -------------------------------------------------------------------------
  // BOOT — called by auth.js once the app has rendered
  // -------------------------------------------------------------------------
  // The profile row is written here, by the app, rather than by a trigger on
  // auth.users. In a database shared with another site, adding (or worse,
  // dropping and recreating) a trigger on auth.users would reach straight
  // into the other site's sign-up flow.
  async function ensureTeacherRow() {
    try {
      const sb = await getClient();
      await sb.from(tbl('teachers')).upsert({
        id: teacher.id,
        name: teacher.name,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (e) {
      // A missing profile row costs nothing — every other table keys off
      // auth.uid() directly — so never block the lesson on it.
      console.error('Could not save the teacher profile row', e);
    }
  }

  async function start(session) {
    teacher = {
      id: session.user.id,
      email: session.user.email,
      name: (session.user.user_metadata && session.user.user_metadata.name) || session.user.email,
    };
    ready = true;
    await loadSDK();
    IGStore.onWrite(queue);
    notifyStatus();

    await resolveLayout();
    await ensureTeacherRow();
    const result = await pull();
    // Re-render whatever the freshly pulled data affects.
    if (typeof ContentStore !== 'undefined') ContentStore.refresh();
    if (typeof initStudents === 'function') initStudents();
    if (typeof renderGameMaker === 'function') {
      const root = document.getElementById('gameMakerRoot');
      if (root) renderGameMaker(root);
    }
    return result;
  }

  return {
    enabled, getClient, signIn, signUp, signOut, resetPassword, currentSession,
    start, flush,
    get teacher() { return teacher; },
    get syncing() { return syncing; },
    get lastError() { return lastError; },
    get pendingCount() { return pending.size; },
    onStatus(fn) { statusListeners.push(fn); },
  };
})();

window.IGCloud = IGCloud;
