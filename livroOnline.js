/* ==========================================================================
   IGenglishschool — LIVRO ONLINE ("📖 Meu livro")
   --------------------------------------------------------------------------
   The student does the IG textbook on the site, on the real book pages: write,
   draw, color, circle, type and stick the bimester's stickers. Each student's
   work is saved under their own name, page by page.

   WHERE THINGS LIVE
     livro-online/books.json                   the books the site offers
     livro-online/<book>/index.json            the bimesters published (b1, b2…)
     livro-online/<book>/b<N>/manifest.json    pages, units, audio, stickers
     livro-online/<book>/b<N>/interactive.json auto-checked exercises (phase 2)
     livro-online/<book>/b<N>/p01.webp …       page images (t01.webp: thumbnails)
     (the same folders may also sit at the site root — both places are tried)
     (all made by livros/_geradores/build_livro_online.py)

   ONE PAGE OF WORK  (kind 'book', id '<book>:b<N>:p<NN>' — b1 ids unchanged)
     { v: 1,
       strokes:  [{ t: 'pen'|'hl', c: '#rrggbb', w: width, p: [x, y, x, y, …] }],
       texts:    [{ id, x, y, s: size, c: color, v: 'text' }],
       stickers: [{ id, s: stickerId, x, y, k: scale }],   // x, y = centre
       done: bool, updatedAt: ms }
     Coordinates are PAGE UNITS: x 0..10000 across the page width and
     y 0..14143 down the page (A4), so the work is vector, crisp at any zoom
     and the same on every device. Strokes are simplified before saving.

   SAVING (student)
     1. every change goes to localStorage at once ('igbook:<studentId>:<id>');
     2. 1.5 s after the last change (and when the page is left / hidden) the
        changed pages go to Supabase through igenglish_share_write(kind 'book');
     3. opening the book reads igenglish_book_read() and keeps, page by page,
        whichever copy is newer (updatedAt), so another device picks it up.
     Without Supabase, or before supabase-livro-online.sql is run, everything
     still works and stays on the device ("salvo neste aparelho").

   TEACHER IN CLASS ("📖 Livro da aula")
     The signed-in teacher opens a student's book from her own page (header
     button, phone menu, Live Class cockpit or the student's 📖 panel) and does
     the pages WITH the student on Zoom. Same editor, same payload, same row
     (kind 'book', id '<book>:b1:p<NN>', that student's id), written straight
     into igenglish_student_activity with her login (RLS teacher_id =
     auth.uid()); cloud.js never merges or deletes these rows. Without
     Supabase it uses the same local cache the student link reads. A page is
     re-read from the cloud when opened; per page, the newer updatedAt wins.

   PHASE 2 — auto-checked exercises
     interactive.json (made by livros/_geradores/build_interactive.py) gives
     pages choice / fill / match items in page millimetres; the 👆 Responder
     tool answers them, the page keeps { answers, score } in the same record
     (+ ixDone, xp). The teacher has 🔑 "Mostrar respostas". Other exercise
     types can still be plugged in through LO_INTERACTIVE[type].mount().
   ========================================================================== */

// Phase 2: { [type]: { mount(stage, page, work, api) } }. Empty on purpose.
const LO_INTERACTIVE = {};

const LivroOnline = (() => {
  // Pages live in livro-online/; an upload through GitHub's web page can drop
  // that folder level and put the books at the site root, so fall back there.
  let BASE = 'livro-online/';
  const W = 10000;
  const H = 14143;
  const BOOKS = [
    { id: 'little-steps', title: 'IG Little Steps', ages: '3–6', min: 3, max: 6 },
    { id: 'explorers', title: 'IG Explorers', ages: '7–8', min: 7, max: 8 },
    { id: 'adventurers', title: 'IG Adventurers', ages: '9–11', min: 9, max: 11 },
    { id: 'beyond', title: 'IG Beyond', ages: '12–14', min: 12, max: 14 },
    // Adult / teen coursebook: ONE volume (no bimesters), assigned by hand only —
    // never chosen by age (bookByAge skips `manual` books).
    { id: 'a1', title: 'Speak Up! A1+', ages: '15+', min: null, max: null, manual: true, single: true },
    // Teens coursebook (A0–A1, 14+): one volume in teens/b1/, assigned by hand like A1+.
    { id: 'teens', title: 'Speak Up! Teens', ages: '14+', min: null, max: null, manual: true, single: true },
  ];
  const COLORS = [
    ['#2e2b2e', 'preto'], ['#e5403f', 'vermelho'], ['#f39237', 'laranja'], ['#f6cf3a', 'amarelo'],
    ['#5cad5a', 'verde'], ['#3d8bd9', 'azul'], ['#9461c0', 'roxo'], ['#f05d77', 'rosa'],
    ['#f7a8c4', 'rosa-claro'], ['#8b5a2b', 'marrom'], ['#7fd3e6', 'azul-claro'], ['#9aa0a6', 'cinza'],
  ];
  const SIZES = { pen: [28, 55, 110], hl: [160, 330, 650], text: [150, 240, 380] };
  const TOOLS = [
    { id: 'tap', icon: '👆', label: 'Responder' },   // only on pages with exercises
    { id: 'hand', icon: '✋', label: 'Mover' },
    { id: 'pen', icon: '✏️', label: 'Lápis' },
    { id: 'hl', icon: '🖍️', label: 'Pintar' },
    { id: 'eraser', icon: '🧽', label: 'Apagar' },
    { id: 'text', icon: '🔤', label: 'Texto' },
    { id: 'sticker', icon: '⭐', label: 'Adesivos' },
    { id: 'photo', icon: '📷', label: 'Foto' },
  ];
  const PREFS_KEY = 'igbook_prefs';

  const esc = s => (typeof igEscapeHtml === 'function' ? igEscapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const col = c => (/^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : '#2e2b2e');
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // -------------------------------------------------------------------------
  // BOOKS, MANIFESTS AND WHO GETS WHICH BOOK
  // -------------------------------------------------------------------------
  // Each bimester is its own folder: <base><book>/b<N>/ with manifest.json,
  // the page images, stickers/ and (optional) interactive.json. <base> is
  // 'livro-online/' or '' (site root) — whichever answers; each manifest keeps
  // the one it was found in (m._base), so b1 and b2 may even live apart.
  const manifestCache = {};
  const fetchJSON = url => fetch(url, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });
  // The A1 book was uploaded to GitHub in five batches, each landing in its own
  // folder (parte1…parte5, 42 pages each; manifest + index in parte5). Support
  // that layout so nothing has to be uploaded again.
  const A1_PARTS = [42, 84, 126, 168, 210].map((to, i) => ({ to, base: `parte${i + 1}/` }));
  function fromEitherBase(path) {
    const first = BASE, other = BASE ? '' : 'livro-online/';
    return fetchJSON(first + path).then(j => ({ j, base: first }),
      e => fetchJSON(other + path).then(j => ({ j, base: other }),
        () => (/^a1\//.test(path)
          ? fetchJSON('parte5/' + path).then(j => ({ j, base: 'parte5/' }), () => { throw e; })
          : Promise.reject(e))));
  }
  function loadManifest(book, bim, withIx) {
    bim = Number(bim) || 1;
    const key = `${book}:${bim}`;
    if (!manifestCache[key]) {
      manifestCache[key] = fromEitherBase(`${book}/b${bim}/manifest.json`)
        .then(({ j, base }) => {
          if (bim === 1 && (base === '' || base === 'livro-online/')) BASE = base;
          j._base = base;
          if (base === 'parte5/') j._split = A1_PARTS;
          j.book = j.book || book;
          j.bimester = Number(j.bimester) || bim;
          return withIx === false ? j : loadInteractive(j).then(() => j);
        })
        .catch(e => { delete manifestCache[key]; throw e; });
    }
    return manifestCache[key];
  }
  // PHASE 2: the auto-checked exercises of a bimester (interactive.json next to
  // the manifest) are attached to their pages as page.interactive.
  function loadInteractive(m) {
    return fetch(dirOf(m) + 'interactive.json', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null)).catch(() => null)
      .then(ix => {
        if (!ix || !ix.pages) return;
        m.pages.forEach(p => {
          const d = ix.pages[String(p.n)];
          if (d && Array.isArray(d.items) && d.items.length) p.interactive = d;
        });
      });
  }
  // Every published bimester of a book, oldest first. The list comes from
  // <book>/index.json (written by the build script); without it the app probes
  // b1, b2… until one is missing. A bimester whose files are not on the site
  // yet simply does not show.
  const bookCache = {};
  function loadBook(book) {
    if (!bookCache[book]) {
      bookCache[book] = fromEitherBase(`${book}/index.json`)
        .then(({ j }) => (j.bimesters || []).map(b => ({ n: Number(b.n), ix: b.interactive !== false })).filter(b => b.n > 0),
          () => null)
        .then(async list => {
          const out = [];
          if (list && list.length) {
            const got = await Promise.all(list.map(b => loadManifest(book, b.n, b.ix).catch(() => null)));
            got.forEach(m => { if (m) out.push(m); });
          } else {
            for (let n = 1; n <= 8; n++) {
              const m = await loadManifest(book, n).catch(() => null);
              if (!m) break;
              out.push(m);
            }
          }
          if (!out.length) throw new Error('no manifest for ' + book);
          return out.sort((a, b) => a.bimester - b.bimester);
        })
        .catch(e => { delete bookCache[book]; throw e; });
    }
    return bookCache[book];
  }
  const tracksCache = {};
  function loadTracks(book) {
    if (!tracksCache[book]) {
      tracksCache[book] = fetch(`audios/${book}/tracks.json`, { cache: 'no-cache' })
        .then(r => (r.ok ? r.json() : { tracks: [] }))
        .then(j => { const m = {}; (j.tracks || []).forEach(t => { if (t && t.id) m[t.id] = t; }); return m; })
        .catch(() => ({}));
    }
    return tracksCache[book];
  }

  const bookInfo = id => BOOKS.find(b => b.id === id) || null;
  function bookByAge(age) {
    const a = Number(age) || 0;
    const b = BOOKS.find(x => !x.manual && a >= x.min && a <= x.max);
    return b ? b.id : null;
  }
  // The teacher's choice rides in student_access (studentAccess.js), which
  // already reaches the student's link: null = automatic by age, 'none' = no book.
  function assignedRaw(studentId) {
    let rec = null;
    if (typeof saRecord === 'function') rec = saRecord(studentId);
    else { const m = IGStore.getJSON('student_access', {}) || {}; rec = m[studentId] || null; }
    return rec && typeof rec.book === 'string' ? rec.book : null;
  }
  function bookFor(student) {
    if (!student) return null;
    const a = assignedRaw(student.id);
    if (a === 'none') return null;
    if (a && bookInfo(a)) return a;
    return bookByAge(student.age);
  }
  function setBook(studentId, value) {
    const v = value && (value === 'none' || bookInfo(value)) ? value : null;
    if (typeof saWrite === 'function') saWrite(studentId, { book: v });
    else {
      const m = IGStore.getJSON('student_access', {}) || {};
      m[studentId] = { ...(m[studentId] || {}), book: v };
      IGStore.setJSON('student_access', m);
    }
  }

  // -------------------------------------------------------------------------
  // PAGE DATA
  // -------------------------------------------------------------------------
  const pageId = (book, n, bim) => `${book}:b${bim || 1}:p${String(n).padStart(2, '0')}`;
  // One-volume books (Speak Up! A1+): no "Bimestre" tabs/labels anywhere.
  const isSingle = m => Boolean(m && (m.single || (bookInfo(m.book) || {}).single));
  const pid = (m, n) => pageId(m.book, n, m.bimester || 1);
  const bookKey = m => `${m.book}:b${m.bimester || 1}`;
  // Page image / thumbnail URL of a manifest (handles the split A1 upload).
  function resUrl(m, file) {
    if (m && m._split) {
      const mm = /^[pt](\d+)\./.exec(String(file));
      if (mm) {
        const n = Number(mm[1]);
        const part = m._split.find(x => n <= x.to);
        if (part) return `${part.base}${m.book}/b${(m && m.bimester) || 1}/${file}`;
      }
    }
    return dirOf(m) + file;
  }
  function dirOf(m) { return `${m && m._base != null ? m._base : BASE}${m.book}/b${(m && m.bimester) || 1}/`; }
  const lsKey = (sid, id) => `igbook:${sid}:${id}`;
  // PHOTOS: a sticker with id 'photo' that carries its own (compressed) image:
  // { id, s:'photo', src:'data:image/…', pw, ph, x, y, k } — pw/ph are the size
  // as fractions of the page, like a sticker's meta w/h. Older code ignores them.
  const PHOTO_MAX_SRC = 400000, PHOTO_BUDGET = 250000, PHOTO_MAX_N = 4;
  const photoOk = s => typeof s.src === 'string' && s.src.startsWith('data:image/') && s.src.length <= PHOTO_MAX_SRC
    && Number(s.pw) > 0 && Number(s.pw) <= 3 && Number(s.ph) > 0 && Number(s.ph) <= 3;
  const metaFor = (sm, st) => (!st ? null : st.s === 'photo'
    ? (photoOk(st) ? { id: 'photo', w: Number(st.pw), h: Number(st.ph), img: st.src, photo: true } : null)
    : sm[st.s]);
  const emptyPage = () => ({ v: 1, strokes: [], texts: [], stickers: [], done: false, updatedAt: 0 });
  function normalize(p) {
    if (!p || typeof p !== 'object') return emptyPage();
    return {
      v: 1,
      strokes: Array.isArray(p.strokes) ? p.strokes.filter(s => s && Array.isArray(s.p) && s.p.length >= 2) : [],
      texts: Array.isArray(p.texts) ? p.texts.filter(t => t && typeof t.v === 'string') : [],
      stickers: Array.isArray(p.stickers) ? p.stickers.filter(s => s && s.s && (s.s !== 'photo' || photoOk(s))) : [],
      done: Boolean(p.done),
      updatedAt: typeof p.updatedAt === 'string' ? (Date.parse(p.updatedAt) || 0) : num(p.updatedAt, 0),
      ...(p.answers && typeof p.answers === 'object' ? { answers: p.answers } : {}),
      ...(p.score && typeof p.score === 'object' ? { score: { ok: num(p.score.ok, 0), total: num(p.score.total, 0) } } : {}),
      ...(p.ixDone ? { ixDone: true } : {}),
      ...(p.xp ? { xp: num(p.xp, 0) } : {}),
    };
  }
  function readLocal(sid, id) {
    try { const raw = localStorage.getItem(lsKey(sid, id)); return raw ? normalize(JSON.parse(raw)) : null; } catch (e) { return null; }
  }
  function writeLocal(sid, id, page) {
    try { localStorage.setItem(lsKey(sid, id), JSON.stringify(page)); return true; } catch (e) { return false; }
  }
  const hasWork = p => Boolean(p && (p.strokes.length || p.texts.length || p.stickers.length));
  const contentPages = m => m.pages.filter(p => p.kind !== 'stickers');

  // -------------------------------------------------------------------------
  // CLOUD SYNC — one engine, two ways in:
  //   StudentSync: the family's link, through the SQL functions (code-keyed);
  //   TeacherSync: the signed-in teacher doing the book WITH the student in
  //                class, writing the same row straight into her own table.
  // Both keep the same local cache ('igbook:<studentId>:<id>') and the same
  // rule: per page, the newer updatedAt wins.
  // -------------------------------------------------------------------------
  const missingErr = e => /could not find the function|could not find the table|does not exist|PGRST202|PGRST205|42883|42P01|404/i
    .test(String((e && (e.message || e.code)) || ''));

  function createSync(adapter) {
    let sid = null, book = null;
    let mode = 'local';        // local | cloud | offline | nosql
    let timer = null, busy = false, again = false;
    let lastManifest = null;
    let lastStatus = 'idle';
    const dirty = new Set();
    const listeners = new Set();

    function status(s) { lastStatus = s; listeners.forEach(fn => { try { fn(s); } catch (e) { /* view gone */ } }); }
    function settled() { return mode === 'cloud' ? 'saved' : mode === 'offline' ? 'offline' : 'local'; }

    // Merge one bimester (manifest) of one student: cloud copy into the local
    // cache, local-only/newer pages queued to go up. Called once per bimester.
    async function open(studentId, _book, manifest) {
      while (busy) await new Promise(r => setTimeout(r, 50));
      // Switching student: whatever is still waiting goes up first, under the
      // student it belongs to.
      if (dirty.size) await flush();
      if (studentId !== sid) dirty.clear();
      sid = studentId; book = manifest.book; lastManifest = manifest;
      if (!adapter.possible()) { mode = 'local'; status('local'); return false; }
      try {
        const rows = await adapter.readAll(sid, bookKey(manifest));
        if (!rows) { mode = 'local'; status('local'); return false; }
        const remote = {};
        rows.forEach(row => { if (row && row.id) remote[row.id] = normalize(row.payload); });
        let changed = false;
        manifest.pages.forEach(pg => {
          const id = pid(manifest, pg.n);
          const r = remote[id], l = readLocal(sid, id);
          if (r && (!l || r.updatedAt > l.updatedAt)) { writeLocal(sid, id, r); changed = true; }
          else if (l && (!r || l.updatedAt > r.updatedAt) && (hasWork(l) || l.done || r)) dirty.add(id);
        });
        mode = 'cloud';
        if (dirty.size) await flush(); else status('saved');
        return changed;
      } catch (e) {
        if (missingErr(e)) { mode = 'nosql'; status('local'); }
        else { mode = 'offline'; status('offline'); }
        console.warn('livro online: leitura da nuvem', e);
        return false;
      }
    }

    // A page just opened: the other side (student at home / teacher in class)
    // may have changed it since the book was opened. Returns the newer copy.
    async function refresh(id) {
      if (mode !== 'cloud' || !sid) return null;
      const who = sid;
      try {
        const row = await adapter.readOne(who, id.replace(/:p\d+$/, ''), id);
        if (!row || who !== sid) return null;
        const r = normalize(row.payload), l = readLocal(who, id);
        if (!l || r.updatedAt > l.updatedAt) { writeLocal(who, id, r); return r; }
      } catch (e) { /* stay with the local copy */ }
      return null;
    }

    function mark(id) {
      dirty.add(id);
      if (mode === 'local' || mode === 'nosql') { dirty.clear(); status('local'); return; }
      status('saving');
      clearTimeout(timer);
      timer = setTimeout(flush, 1500);
    }

    async function flush() {
      clearTimeout(timer);
      if (mode === 'local' || mode === 'nosql') { dirty.clear(); status('local'); return; }
      if (!dirty.size) { status(settled()); return; }
      if (busy) { again = true; return; }
      busy = true;
      const who = sid;
      try {
        for (const id of [...dirty]) {
          const payload = readLocal(who, id);
          if (!payload) { dirty.delete(id); continue; }
          if (JSON.stringify(payload).length > 290000) { dirty.delete(id); status('toobig'); continue; }
          const res = await adapter.write(who, id, payload);   // 'ok' | 'nosql' | 'toobig' | 'skip'; throws when offline
          if (res === 'nosql') { mode = 'nosql'; dirty.clear(); break; }
          dirty.delete(id);
          if (res === 'toobig') status('toobig');
          if (mode === 'offline') mode = 'cloud';
        }
        status(dirty.size ? 'offline' : settled());
      } catch (e) {
        if (missingErr(e)) { mode = 'nosql'; dirty.clear(); status('local'); }
        else { mode = 'offline'; status('offline'); }
        console.warn('livro online: envio', e);
      } finally {
        busy = false;
        if (again) { again = false; if (dirty.size) setTimeout(flush, 300); }
      }
    }

    window.addEventListener('online', () => {
      if (mode !== 'offline' || !sid) return;
      if (lastManifest) open(sid, book, lastManifest).catch(() => {});
    });
    const leave = () => { if (dirty.size) flush(); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave(); });
    window.addEventListener('pagehide', leave);

    return {
      open, mark, flush, refresh,
      isDirty(id) { return dirty.has(id); },
      onStatus(fn) { listeners.add(fn); fn(lastStatus); return () => listeners.delete(fn); },
      get mode() { return mode; },
    };
  }

  const linkCode = () => (typeof shareCodeInUrl === 'function' ? shareCodeInUrl() : null);
  const StudentSync = createSync({
    possible: () => Boolean(window.IG_SUPABASE && window.IG_SUPABASE.configured
      && typeof IGCloud !== 'undefined' && IGCloud.anonClient && linkCode()),
    async readAll(sid, bookKey) {
      const sb = await IGCloud.anonClient();
      const { data, error } = await sb.rpc('igenglish_book_read', { p_code: linkCode(), p_book: bookKey });
      if (error) throw error;
      return data && data.ok ? (data.pages || []) : null;
    },
    async readOne(sid, bookKey, id) {
      const sb = await IGCloud.anonClient();
      const { data, error } = await sb.rpc('igenglish_book_read', { p_code: linkCode(), p_book: bookKey });
      if (error) throw error;
      const rows = data && data.ok ? data.pages : [];
      return (rows || []).find(r => r && r.id === id) || null;
    },
    async write(sid, id, payload) {
      const sb = await IGCloud.anonClient();
      const { data, error } = await sb.rpc('igenglish_share_write', { p_code: linkCode(), p_kind: 'book', p_id: id, p_payload: payload });
      if (error) { if (missingErr(error)) return 'nosql'; throw error; }
      if (data && data.ok === false) {
        // kind_invalid = the database does not know the book yet (SQL not run).
        if (data.error === 'kind_invalid') return 'nosql';
        return data.error === 'too_large' ? 'toobig' : 'skip';
      }
      return 'ok';
    },
  });
  // Teacher in class: same rows, written with her own login (RLS:
  // teacher_id = auth.uid()); works before supabase-livro-online.sql too.
  const TeacherSync = createSync({
    possible: () => Boolean(typeof IGCloud !== 'undefined' && IGCloud.enabled && IGCloud.enabled()
      && IGCloud.teacher && IGCloud.saveBookPage),
    readAll: (sid, bookKey) => IGCloud.pullBookPages(sid, bookKey),
    readOne: (sid, bookKey, id) => IGCloud.pullBookPage(sid, id),
    async write(sid, id, payload) { await IGCloud.saveBookPage(sid, id, payload); return 'ok'; },
  });

  const STATUS = {
    idle: ['', ''],
    saving: ['Salvando…', 'is-saving'],
    saved: ['Salvo ✓', 'is-ok'],
    local: ['Salvo neste aparelho ✓', 'is-ok'],
    offline: ['Sem internet — salvo neste aparelho', 'is-warn'],
    toobig: ['Página cheia demais — salva só neste aparelho', 'is-warn'],
  };
  function paintStatus(el, s) {
    if (!el) return;
    const [text, cls] = STATUS[s] || STATUS.idle;
    el.textContent = text;
    el.className = 'lo-status ' + cls;
  }

  // -------------------------------------------------------------------------
  // RENDERING (shared by the editor, the thumbnails and the teacher's viewer)
  // -------------------------------------------------------------------------
  function strokeD(p) {
    const n = Math.floor(p.length / 2);
    if (n === 1) return `M${p[0]} ${p[1]}l0.1 0`;
    if (n === 2) return `M${p[0]} ${p[1]}L${p[2]} ${p[3]}`;
    let d = `M${p[0]} ${p[1]}`;
    for (let i = 1; i < n - 1; i++) {
      const x = p[2 * i], y = p[2 * i + 1], nx = p[2 * i + 2], ny = p[2 * i + 3];
      d += `Q${x} ${y} ${Math.round((x + nx) / 2)} ${Math.round((y + ny) / 2)}`;
    }
    return d + `L${p[2 * n - 2]} ${p[2 * n - 1]}`;
  }
  const strokeSVG = s => `<path d="${strokeD(s.p.map(Number))}" fill="none" stroke="${col(s.c)}" stroke-width="${num(s.w, 50)}" stroke-linecap="round" stroke-linejoin="round"${s.t === 'hl' ? ' stroke-opacity=".6"' : ''}/>`;

  function textSVG(t) {
    const s = num(t.s, 440), x = num(t.x, 0), y = num(t.y, 0);
    const lines = String(t.v || '').split('\n');
    return `<text class="lo-text" data-tid="${esc(t.id)}" x="${x}" y="${y}" font-size="${s}" fill="${col(t.c)}"
      stroke="#fff" stroke-width="${Math.round(s * 0.1)}" paint-order="stroke" stroke-linejoin="round"
      font-family="'Baloo 2', 'Comic Sans MS', system-ui, sans-serif" font-weight="700">${
      lines.map((l, i) => `<tspan x="${x}" dy="${i ? Math.round(s * 1.12) : Math.round(s * 0.92)}">${esc(l) || ' '}</tspan>`).join('')}</text>`;
  }

  // Downscale + re-encode a pasted/picked image so a page record stays small.
  let webpOk = null;
  async function compressPhoto(file) {
    let bmp, iw, ih;
    try { bmp = await createImageBitmap(file); iw = bmp.width; ih = bmp.height; }
    catch (e) {
      bmp = await new Promise((res, rej) => {
        const url = URL.createObjectURL(file), im = new Image();
        im.onload = () => { URL.revokeObjectURL(url); res(im); };
        im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
        im.src = url;
      });
      iw = bmp.naturalWidth; ih = bmp.naturalHeight;
    }
    if (!iw || !ih) throw new Error('empty image');
    if (webpOk === null) { try { webpOk = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch (e) { webpOk = false; } }
    const mime = webpOk ? 'image/webp' : 'image/jpeg';
    let best = null;
    for (const side of [900, 780, 700, 600, 540, 480]) {
      const f = Math.min(1, side / Math.max(iw, ih));
      const cw = Math.max(1, Math.round(iw * f)), ch = Math.max(1, Math.round(ih * f));
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const cx = cv.getContext('2d');
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, cw, ch);
      cx.drawImage(bmp, 0, 0, cw, ch);
      for (const q of (webpOk ? [0.78, 0.68, 0.58, 0.5, 0.45] : [0.75, 0.65, 0.55, 0.5, 0.45])) {
        const src = cv.toDataURL(mime, q);
        best = { src, w: cw, h: ch };
        if (src.length <= 110000) { if (bmp.close) bmp.close(); return best; }
      }
    }
    if (bmp.close) bmp.close();
    return best;
  }

  function stickerBox(st, meta) {
    const k = meta && meta.photo ? clamp(num(st.k, 1), 0.2, 4) : clamp(num(st.k, 1), 0.4, 2.5);
    const w = (meta ? meta.w : 0.1) * W * k, h = (meta ? meta.h : 0.07) * H * k;
    return { x: num(st.x, 0) - w / 2, y: num(st.y, 0) - h / 2, w, h };
  }
  function stickerSVG(st, meta, dir) {
    if (!meta) return '';
    const b = stickerBox(st, meta);
    return `<image class="lo-stk" href="${esc(stkSrc(dir, meta))}" x="${Math.round(b.x)}" y="${Math.round(b.y)}" width="${Math.round(b.w)}" height="${Math.round(b.h)}" preserveAspectRatio="none"/>`;
  }

  // Two layers: the ink multiplies onto the printed page (colouring keeps the
  // black outlines black); stickers and text sit on top as they would on paper.
  function overlayHTML(page, manifest) {
    if (!page || !hasWork(page)) return '';
    const sm = stickerMap(manifest);
    return `<svg class="lo-ink" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${page.strokes.map(strokeSVG).join('')}</svg>
      <svg class="lo-over" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${
      page.stickers.map(s => stickerSVG(s, metaFor(sm, s), dirOf(manifest))).join('')}${page.texts.map(textSVG).join('')}</svg>`;
  }
  // Board-game pawns: four colours, available on EVERY page and in every book
  // (any number of copies), for the printed board games with static pawns.
  const pawnSvg = (c, hi) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80"><g stroke="#2e2b2e" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="30" cy="70" rx="23" ry="7.5" fill="${c}"/><path d="M19 68 C21 52 25 46 26 40 L34 40 C35 46 39 52 41 68 Z" fill="${c}"/><ellipse cx="30" cy="40" rx="12" ry="4.6" fill="${c}"/><circle cx="30" cy="22" r="14" fill="${c}"/></g><path d="M22 18 Q24 11 31 10" fill="none" stroke="${hi}" stroke-width="4" stroke-linecap="round" opacity=".85"/><path d="M26 64 Q28 54 29 48" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round" opacity=".55"/></svg>`;
  const PAWNS = [
    ['pawn-green', 'Peão verde', '#3fae5a', '#d3f3d9'],
    ['pawn-blue', 'Peão azul', '#3b82d9', '#d4e6fb'],
    ['pawn-red', 'Peão vermelho', '#e5403f', '#fbd5d3'],
    ['pawn-purple', 'Peão roxo', '#8e5bc0', '#e6d8f4'],
  ].map(([id, label, c, hi]) => ({
    id, label, pawn: true, w: 0.052, h: 0.049,
    img: 'data:image/svg+xml;utf8,' + encodeURIComponent(pawnSvg(c, hi)),
  }));
  const allStickers = m => PAWNS.concat(m.stickers || []);
  const stkSrc = (dir, meta) => (String(meta.img).startsWith('data:') ? meta.img : dir + meta.img);
  const smCache = new WeakMap();
  function stickerMap(m) {
    if (!smCache.has(m)) { const o = {}; allStickers(m).forEach(s => { o[s.id] = s; }); smCache.set(m, o); }
    return smCache.get(m);
  }

  // Ramer–Douglas–Peucker on a flat [x, y, x, y…] list.
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function simplify(pts, eps) {
    const n = pts.length / 2;
    if (n < 3) return pts.map(Math.round);
    const keep = new Uint8Array(n); keep[0] = 1; keep[n - 1] = 1;
    const stack = [[0, n - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let md = 0, mi = -1;
      for (let i = a + 1; i < b; i++) {
        const d = segDist(pts[2 * i], pts[2 * i + 1], pts[2 * a], pts[2 * a + 1], pts[2 * b], pts[2 * b + 1]);
        if (d > md) { md = d; mi = i; }
      }
      if (md > eps && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
    }
    const out = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(Math.round(pts[2 * i]), Math.round(pts[2 * i + 1]));
    return out;
  }

  // -------------------------------------------------------------------------
  // FULL-SCREEN VIEWS + the phone's back button
  // -------------------------------------------------------------------------
  const stack = [];
  // Each view owns one history entry, tagged with a token of its own, so the
  // phone's back button closes exactly the views above the entry it lands on
  // — also after "Trocar aluno" closed everything without touching history.
  function pushView(el, onClose) {
    document.body.appendChild(el);
    const token = uid();
    stack.push({ el, onClose, token });
    document.documentElement.classList.add('lo-open');
    try { history.pushState({ lo: token }, ''); } catch (e) { /* sandboxed */ }
  }
  function closeTop() {
    const top = stack.pop();
    if (!top) return;
    try { if (top.onClose) top.onClose(); } catch (e) { console.error(e); }
    top.el.remove();
    if (!stack.length) document.documentElement.classList.remove('lo-open');
  }
  function back() {
    const top = stack[stack.length - 1];
    if (top && history.state && history.state.lo === top.token) history.back();
    else closeTop();
  }
  window.addEventListener('popstate', () => {
    const t = history.state && history.state.lo;
    if (history.state && history.state.sl) return;       // a slides view (slidesAula.js) sits on top of the book
    const keep = stack.findIndex(v => v.token === t);   // -1: none of ours -> close all
    while (stack.length > keep + 1) closeTop();
  });

  function prefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function savePrefs(p) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) { /* private mode */ } }

  // -------------------------------------------------------------------------
  // THE PAGE EDITOR (student) / VIEWER (teacher, readOnly)
  // -------------------------------------------------------------------------
  // o = { manifest, pages (navigable), index, readOnly, load(pg) -> page,
  //       save(pg, page), subtitle, onLeave() }
  function openEditor(o) {
    const m = o.manifest;
    const book = m.book;
    const dir = dirOf(m);
    const sm = stickerMap(m);
    const ro = Boolean(o.readOnly);
    const pf = prefs();
    let idx = clamp(o.index || 0, 0, o.pages.length - 1);
    let pg = o.pages[idx];
    let data = emptyPage();
    let tool = ro ? 'hand' : (TOOLS.some(t => t.id === pf.tool && t.id !== 'tap') ? pf.tool : 'pen');
    let color = col(pf.color || '#2e2b2e');
    // A size picked once stays picked (0 = the smallest is a valid choice);
    // only a first-ever visit starts in the middle.
    const savedSize = (v) => (v === undefined || v === null ? 1 : clamp(Number(v) | 0, 0, 2));
    const size = { pen: savedSize(pf.pen), hl: savedSize(pf.hl), text: savedSize(pf.text) };
    let hist = [], redoStack = [];
    let selected = null;            // sticker instance id
    let penSeen = false;
    let z = 1, tx = 0, ty = 0, bw = 300, bh = 424;
    // SLIDES MODE (computers / landscape): the page is a slide inside a 16:9
    // frame; "Meia página" shows each page as two slides (top / bottom half).
    // Coordinates never change — only the part of the page on screen does.
    let slides = false;
    let view = pf.view === 'full' ? 'full' : 'half';   // half by default: bigger text on screen-share
    let part = 'full';                       // 'full' | 'top' | 'bottom'
    let frame = { x: 0, y: 0, w: 300, h: 424, pad: 6 };
    const audio = new Audio();

    const root = document.createElement('div');
    root.className = 'lo-root lo-ed' + (ro ? ' is-readonly' : '');
    root.innerHTML = `
      <div class="lo-top">
        <button class="lo-ico" data-a="back" type="button" aria-label="Voltar" title="Voltar">←</button>
        <div class="lo-top-title"><b data-ref="pnum"></b><span data-ref="ptitle"></span></div>
        <span class="lo-score" data-ref="score" title="Exercícios com correção automática"></span>
        ${o.teacher ? '<button class="lo-ico lo-ixonly" data-a="showans" type="button" aria-label="Mostrar respostas" title="Mostrar respostas (só a teacher vê este botão)">🔑</button>' : ''}
        <div class="lo-viewtog lo-only-slides" role="group" aria-label="Como mostrar a página">
          <button type="button" data-a="view-full" title="Página inteira">📄<span class="lo-vt-l"> Página inteira</span></button>
          <button type="button" data-a="view-half" title="Meia página — letra maior">🔍<span class="lo-vt-l"> Meia página</span></button>
        </div>
        <button class="lo-ico lo-only-slides" data-a="fs" type="button" aria-label="Tela cheia" title="Tela cheia (F)">⛶</button>
        <button class="lo-ico lo-only-wide" data-a="slides" type="button" aria-label="Modo slides" title="Modo slides (página do tamanho da tela)">🎞️</button>
        ${ro ? `<span class="lo-badge" data-ref="rodone"></span>` : `
          <span class="lo-status" data-ref="status"></span>
          <button class="lo-ico" data-a="undo" type="button" aria-label="Desfazer" title="Desfazer (Ctrl+Z)">↶</button>
          <button class="lo-ico" data-a="redo" type="button" aria-label="Refazer" title="Refazer (Ctrl+Y)">↷</button>
          <button class="lo-ico" data-a="clear" type="button" aria-label="Limpar a página" title="Limpar a página">🗑️</button>`}
      </div>
      ${o.subtitle ? `<div class="lo-sub">${o.subtitle}</div>` : ''}
      ${o.who ? `
        <div class="lo-classbar">
          <span class="lo-who" title="Aluno e livro desta aula">👤 <b>${esc(o.who.name)}</b> · ${esc(o.who.book)}</span>
          ${o.onSwitch ? '<button type="button" class="lo-chip" data-a="switch" title="Trocar aluno">🔄<span class="lo-chip-l"> Trocar aluno</span></button>' : ''}
          <button type="button" class="lo-chip lo-chip--games" data-a="games" title="Jogos: abre um jogo e volta para esta página">🎮<span class="lo-chip-l"> Jogos</span></button>
          <button type="button" class="lo-chip lo-chip--dice" data-a="dice" title="Virtual dice and coin: how many spaces to move">🎲<span class="lo-chip-l"> Dice</span></button>
          <button type="button" class="lo-chip" data-a="slides" title="Slides da aula: abre as apresentações deste aluno">🖼️<span class="lo-chip-l"> Slides</span></button>
          <button type="button" class="lo-chip" data-a="present" title="Apresentar: esconde os botões da professora para compartilhar a tela">🖥️<span class="lo-chip-l"> Apresentar</span></button>
        </div>` : ''}
      <div class="lo-audio" data-ref="audio" hidden></div>
      <div class="lo-stage" data-ref="stage">
        <div class="lo-slidebox" data-ref="slidebox" aria-hidden="true"></div>
        <div class="lo-page" data-ref="page">
          <img data-ref="img" alt="" draggable="false" />
          <svg class="lo-ink" data-ref="ink" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><g data-ref="strokes"></g><path data-ref="live" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <svg class="lo-over" data-ref="over" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"></svg>
          <svg class="lo-ix" data-ref="ix" viewBox="0 0 210 297" preserveAspectRatio="none"></svg>
        </div>
        <div class="lo-zoom">
          <button type="button" data-a="zin" aria-label="Aumentar">＋</button>
          <button type="button" data-a="zout" aria-label="Diminuir">－</button>
          <button type="button" data-a="fit" aria-label="Página inteira" title="Página inteira">⤢</button>
          ${o.who ? '<button type="button" class="lo-games-fab" data-a="games" aria-label="Jogos" title="Jogos">🎮</button>' : ''}
          ${o.who ? '<button type="button" class="lo-games-fab lo-dice-fab" data-a="dice" aria-label="Dice" title="Dice and coin">🎲</button>' : ''}
          ${o.who ? '<button type="button" class="lo-present-exit" data-a="present" aria-label="Sair da apresentação" title="Sair da apresentação">🖥️</button>' : ''}
        </div>
        <div class="lo-toast" data-ref="toast" hidden></div>
        ${o.who ? `
        <div class="lo-dice" data-ref="dice" hidden role="dialog" aria-label="Dice and coin">
          <div class="lo-dice-head">
            <div class="lo-dice-tabs">
              <button type="button" data-dm="die" class="is-on">🎲 Dice</button>
              <button type="button" data-dm="coin">🪙 Coin</button>
            </div>
            <button type="button" class="lo-dice-x" data-a="dice" aria-label="Close">✕</button>
          </div>
          <button type="button" class="lo-dice-roll" data-ref="diceroll" aria-label="Roll">
            <span class="lo-die" data-ref="die"></span>
            <span class="lo-coin" data-ref="coin" hidden></span>
          </button>
          <div class="lo-dice-out" data-ref="diceout">Tap the dice to roll</div>
          <div class="lo-dice-hist" data-ref="dicehist"></div>
        </div>` : ''}
        ${ro ? '' : `
        <div class="lo-anssheet" data-ref="ans" hidden>
          <label for="loAnsIn" data-ref="ansq"></label>
          <div class="lo-ts-row">
            <input id="loAnsIn" data-ref="ansin" type="text" maxlength="80" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
            <button type="button" class="lo-chip" data-ans="cancel" aria-label="Cancelar">✕</button>
            <button type="button" class="lo-chip lo-chip--ok" data-ans="ok">OK ✓</button>
          </div>
        </div>`}
        ${ro ? '' : `
        <div class="lo-textsheet" data-ref="sheet" hidden>
          <textarea data-ref="ta" rows="2" maxlength="400" placeholder="Escreva aqui… / Write here…"></textarea>
          <div class="lo-ts-row">
            <div class="lo-ts-colors" data-ref="tscolors"></div>
            <button type="button" class="lo-chip" data-ts="del" aria-label="Apagar texto">🗑️</button>
            <button type="button" class="lo-chip lo-chip--ok" data-ts="ok">OK ✓</button>
          </div>
        </div>`}
      </div>
      ${ro ? '' : `
        <div class="lo-opts" data-ref="opts"></div>
        <div class="lo-tools" role="toolbar" aria-label="Ferramentas">
          ${TOOLS.map(t => `<button type="button" class="lo-tool" data-tool="${t.id}" aria-pressed="false"><span>${t.icon}</span><small>${t.label}</small></button>`).join('')}
        </div>`}
      <div class="lo-nav">
        <button type="button" class="lo-navbtn" data-a="prev" aria-label="Anterior">◀</button>
        <div class="lo-strip" data-ref="strip"></div>
        <span class="lo-slide-label" data-ref="slabel"></span>
        ${ro ? '<span class="lo-nav-mid" data-ref="navmid"></span>' : '<button type="button" class="lo-done" data-a="done"></button>'}
        <button type="button" class="lo-navbtn" data-a="next" aria-label="Próxima">▶</button>
      </div>`;

    // ---- virtual dice / coin (teacher class mode) --------------------------
    const dicePanel = root.querySelector('[data-ref="dice"]');
    if (dicePanel) {
      const dieEl = dicePanel.querySelector('[data-ref="die"]');
      const coinEl = dicePanel.querySelector('[data-ref="coin"]');
      const outEl = dicePanel.querySelector('[data-ref="diceout"]');
      const histEl = dicePanel.querySelector('[data-ref="dicehist"]');
      const rollBtn = dicePanel.querySelector('[data-ref="diceroll"]');
      const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
      const dieFace = n => `<i class="lo-pips">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<b class="${PIPS[n].includes(i) ? 'on' : ''}"></b>`).join('')}</i>`;
      let mode = 'die', rolling = false, hist = [];
      const rnd = n => { const a = new Uint32Array(1); (window.crypto || window.msCrypto).getRandomValues(a); return a[0] % n; };
      dieEl.innerHTML = dieFace(6);
      coinEl.textContent = '🪙';
      const paintHist = () => { histEl.textContent = hist.length ? 'Before: ' + hist.slice(-8).join(' · ') : ''; };
      const roll = () => {
        if (rolling) return;
        rolling = true;
        outEl.textContent = '…';
        const target = mode === 'die' ? dieEl : coinEl;
        target.classList.add('is-rolling');
        let tick = 0;
        const iv = setInterval(() => {
          if (mode === 'die') dieEl.innerHTML = dieFace(1 + rnd(6));
          else coinEl.textContent = tick % 2 ? '🟡' : '🪙';
          tick++;
        }, 90);
        setTimeout(() => {
          clearInterval(iv);
          target.classList.remove('is-rolling');
          if (mode === 'die') {
            const n = 1 + rnd(6);
            dieEl.innerHTML = dieFace(n);
            outEl.innerHTML = `Move <b>${n}</b> ${n === 1 ? 'space' : 'spaces'}`;
            hist.push(n);
          } else {
            const heads = rnd(2) === 0;
            coinEl.textContent = heads ? '👑' : '🌟';
            outEl.innerHTML = heads ? '<b>Heads</b>' : '<b>Tails</b>';
            hist.push(heads ? 'H' : 'T');
          }
          paintHist();
          rolling = false;
        }, 750);
      };
      rollBtn.addEventListener('click', roll);
      dicePanel.querySelectorAll('[data-dm]').forEach(b => b.addEventListener('click', () => {
        mode = b.dataset.dm;
        dicePanel.querySelectorAll('[data-dm]').forEach(x => x.classList.toggle('is-on', x === b));
        dieEl.hidden = mode !== 'die';
        coinEl.hidden = mode !== 'coin';
        outEl.textContent = mode === 'die' ? 'Tap the dice to roll' : 'Tap the coin to flip';
        hist = []; paintHist();
      }));
      // the ✕ closes the panel directly (clicks on the panel don't bubble up to the page handlers below)
      const closeBtn = dicePanel.querySelector('.lo-dice-x');
      if (closeBtn) closeBtn.addEventListener('click', () => { dicePanel.hidden = true; });
      // never let taps on the panel reach the page (drawing / panning)
      ['pointerdown', 'pointerup', 'click', 'wheel', 'touchstart'].forEach(ev => dicePanel.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
    }

    const $ = name => root.querySelector(`[data-ref="${name}"]`);
    const stage = $('stage'), pageEl = $('page'), img = $('img');
    const strokesG = $('strokes'), live = $('live'), over = $('over');
    let unStatus = null;

    pushView(root, () => {
      leavePage();
      audio.pause();
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('paste', onPaste);
      window.removeEventListener('resize', applyMode);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      if (fsElement() === root) exitFs();
      resizeObs.disconnect();
      if (unStatus) unStatus();
      if (o.onLeave) o.onLeave();
    });
    if (!ro && o.sync) unStatus = o.sync.onStatus(s => paintStatus($('status'), s));

    // ---- view: fit, zoom, pan ---------------------------------------------
    function stageRect() { return stage.getBoundingClientRect(); }
    // The band of the page on screen, as fractions of its height.
    // Where "Meia página" cuts the page: the middle, unless an exercise sits
    // across it — then the nearest gap that keeps every exercise in one half.
    let split = 0.5;
    function splitFor(p) {
      const items = (p && p.interactive && p.interactive.items) || [];
      if (!items.length) return 0.5;
      const spans = items.map(it => {
        const ys = [];
        (it.options || []).forEach(o => { ys.push(o.y, o.y + o.h); });
        if (it.type === 'fill') ys.push(it.y, it.y + it.h);
        (it.left || []).concat(it.right || []).forEach(d => { ys.push(d.y - 4, d.y + 4); });
        return ys.length ? [Math.min(...ys) - 1.5, Math.max(...ys) + 1.5] : null;
      }).filter(Boolean);
      const mid = 148.5;
      const inside = y => spans.some(([a, b]) => y > a && y < b);
      if (!inside(mid)) return 0.5;
      const cands = spans.flatMap(([a, b]) => [a, b]).filter(y => y >= 100 && y <= 200 && !inside(y))
        .sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
      return cands.length ? cands[0] / 297 : 0.5;
    }
    const band = () => (part === 'top' ? [0, split] : part === 'bottom' ? [split, 1] : [0, 1]);
    // Where the page may sit: the whole stage, or (slides) a 16:9 frame in it.
    function frameRect() {
      const r = stageRect();
      if (!slides) return { x: 0, y: 0, w: r.width, h: r.height, pad: 6 };
      const fw = Math.max(100, Math.min(r.width - 20, (r.height - 20) * 16 / 9));
      const fh = fw * 9 / 16;
      return { x: (r.width - fw) / 2, y: (r.height - fh) / 2, w: fw, h: fh, pad: 10 };
    }
    function computeBase() {
      frame = frameRect();
      const [b0, b1] = band();
      const frac = b1 - b0;
      bw = Math.max(100, Math.min(frame.w - 2 * frame.pad, (frame.h - 2 * frame.pad) * W / (H * frac)));
      bh = bw * H / W;
      const box = $('slidebox');
      if (box) {
        box.style.left = `${frame.x}px`; box.style.top = `${frame.y}px`;
        box.style.width = `${frame.w}px`; box.style.height = `${frame.h}px`;
      }
    }
    function clampView() {
      const f = frame;
      const [b0, b1] = band();
      const pw = bw * z, bandTop = b0 * bh * z, bandH = (b1 - b0) * bh * z;
      const mrg = slides ? 0 : 40;
      tx = pw <= f.w ? f.x + (f.w - pw) / 2 : clamp(tx, f.x + f.w - pw - mrg, f.x + mrg);
      const top = ty + bandTop;
      ty = (bandH <= f.h ? f.y + (f.h - bandH) / 2 : clamp(top, f.y + f.h - bandH - mrg, f.y + mrg)) - bandTop;
    }
    function applyView() {
      clampView();
      pageEl.style.width = `${bw * z}px`;
      pageEl.style.height = `${bh * z}px`;
      pageEl.style.transform = `translate(${tx}px, ${ty}px)`;
      pageEl.style.clipPath = part === 'top' ? `inset(0 0 ${((1 - split) * 100).toFixed(2)}% 0)` : part === 'bottom' ? `inset(${(split * 100).toFixed(2)}% 0 0 0)` : '';
      if (selected) renderOver();
    }
    // A short fade between slides (opacity only, so drawing is never blocked).
    function fadeIn() {
      if (!slides) return;
      pageEl.classList.remove('lo-fade');
      void pageEl.offsetWidth;
      pageEl.classList.add('lo-fade');
    }
    const halfView = () => slides && view === 'half';
    function showPart(p) {
      closeSheet();
      part = p;
      computeBase(); z = 1; applyView();
      fadeIn();
      paintChrome();
    }
    function next() {
      if (halfView() && part === 'top') showPart('bottom');
      else if (idx < o.pages.length - 1) goto(idx + 1);
    }
    function prev() {
      if (halfView() && part === 'bottom') showPart('top');
      else if (idx > 0) goto(idx - 1, halfView() ? 'bottom' : 'full');
    }
    const autoSlides = () => window.innerWidth >= 900 && window.innerWidth > window.innerHeight;
    function wantSlides() {
      const p = prefs().slides;
      return p === 'on' ? true : p === 'off' ? false : autoSlides();
    }
    function applyMode(force) {
      const want = wantSlides();
      if (want === slides && force !== true) return;
      slides = want;
      root.classList.toggle('is-slides', slides);
      root.classList.remove('opts-open');
      part = halfView() ? 'top' : 'full';
      paintStrip();
      computeBase(); z = 1; applyView();
      paintChrome();
    }
    function setView(v) {
      view = v === 'half' ? 'half' : 'full';
      savePrefs({ ...prefs(), view });
      showPart(halfView() ? (part === 'bottom' ? 'bottom' : 'top') : 'full');
    }
    // ---- fullscreen (the editor itself, so every tool keeps working) --------
    const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
    function exitFs() {
      try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* not in fullscreen */ }
    }
    function toggleFs() {
      if (fsElement()) { exitFs(); return; }
      const req = root.requestFullscreen || root.webkitRequestFullscreen;
      if (!req) { toast('Tela cheia não disponível neste navegador.'); return; }
      try {
        const r = req.call(root);
        if (r && r.catch) r.catch(() => toast('Tela cheia não disponível agora.'));
      } catch (e) { toast('Tela cheia não disponível agora.'); }
    }
    function onFs() { root.classList.toggle('is-fs', fsElement() === root); }

    // ---- the thumbnail strip (slides) -----------------------------------------
    function paintStrip() {
      const strip = $('strip');
      if (!strip) return;
      if (!slides) { strip.innerHTML = ''; return; }
      strip.innerHTML = o.pages.map((p, i) => {
        const d = normalize(o.load(p)).done;
        return `<button type="button" class="lo-sthumb${i === idx ? ' is-on' : ''}${d ? ' is-done' : ''}" data-goto="${i}" title="p. ${p.n}${p.title ? ' · ' + esc(p.title) : ''}">
          <img src="${esc(resUrl(m, p.thumb))}" alt="" loading="lazy" draggable="false" /><small>${p.n}</small></button>`;
      }).join('');
      markStrip();
    }
    function markStrip() {
      const strip = $('strip');
      if (!strip || !slides) return;
      strip.querySelectorAll('.lo-sthumb').forEach(b => {
        const i = Number(b.dataset.goto);
        b.classList.toggle('is-on', i === idx);
        if (i === idx) b.classList.toggle('is-done', Boolean(data.done));
      });
      const cur = strip.querySelector('.lo-sthumb.is-on');
      if (cur) {
        const sr = strip.getBoundingClientRect(), cr = cur.getBoundingClientRect();
        if (cr.left < sr.left || cr.right > sr.right) strip.scrollLeft += (cr.left - sr.left) - (sr.width - cr.width) / 2;
      }
    }
    function fit() { computeBase(); z = 1; tx = 0; ty = 0; applyView(); }
    function zoomAt(cx, cy, nz) {
      nz = clamp(nz, 1, 6);
      const px = (cx - tx) / (bw * z), py = (cy - ty) / (bh * z);
      z = nz;
      tx = cx - px * bw * z; ty = cy - py * bh * z;
      applyView();
    }
    const resizeObs = new ResizeObserver(() => {
      const oldW = bw * z;
      computeBase();
      if (oldW) { /* keep the zoom level, re-centre */ }
      applyView();
    });
    resizeObs.observe(stage);

    const pxPerUnit = () => (bw * z) / W;
    function toUnits(cx, cy) {
      const r = pageEl.getBoundingClientRect();
      return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H };
    }

    // ---- drawing the page ---------------------------------------------------
    function renderInk() { strokesG.innerHTML = data.strokes.map(strokeSVG).join(''); }
    function renderOver() {
      let html = data.stickers.map(s => stickerSVG(s, metaFor(sm, s), dir)).join('') + data.texts.map(textSVG).join('');
      const st = selected && data.stickers.find(s => s.id === selected);
      if (st && metaFor(sm, st) && stkTool()) {
        const b = stickerBox(st, metaFor(sm, st));
        const r = 13 / pxPerUnit();
        html += `<rect class="lo-sel" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" vector-effect="non-scaling-stroke"/>
          <g class="lo-handle lo-handle--del"><circle cx="${b.x + b.w}" cy="${b.y}" r="${r}"/><text x="${b.x + b.w}" y="${b.y + r * 0.42}" font-size="${r * 1.2}">✕</text></g>
          <g class="lo-handle lo-handle--res"><circle cx="${b.x + b.w}" cy="${b.y + b.h}" r="${r}"/><text x="${b.x + b.w}" y="${b.y + b.h + r * 0.42}" font-size="${r * 1.1}">⤡</text></g>`;
      }
      over.innerHTML = html;
    }
    function render() { renderInk(); renderOver(); renderIx(); paintChrome(); }

    function paintChrome() {
      const partLabel = part === 'top' ? ' · parte de cima' : part === 'bottom' ? ' · parte de baixo' : '';
      $('pnum').textContent = `p. ${pg.n}${partLabel}`;
      $('ptitle').textContent = pg.title || '';
      $('slabel').textContent = `p. ${pg.n} / ${o.pages[o.pages.length - 1].n}${partLabel}`;
      root.querySelector('[data-a="prev"]').disabled = idx <= 0 && part !== 'bottom';
      root.querySelector('[data-a="next"]').disabled = idx >= o.pages.length - 1 && part !== 'top';
      root.querySelector('[data-a="view-full"]').classList.toggle('is-on', view === 'full');
      root.querySelector('[data-a="view-half"]').classList.toggle('is-on', view === 'half');
      root.querySelector('[data-a="slides"]').classList.toggle('is-on', slides);
      const sc = $('score');
      if (hasIx()) {
        const s = ixScore();
        sc.textContent = `⭐ ${s.ok}/${s.total}`;
        sc.hidden = false;
        sc.classList.toggle('is-full', s.total > 0 && s.ok === s.total);
        $('slabel').textContent += `  ⭐ ${s.ok}/${s.total}`;
      } else sc.hidden = true;
      const sa = root.querySelector('[data-a="showans"]');
      if (sa) sa.classList.toggle('is-on', showAns);
      root.classList.toggle('ix-on', !ro && tool === 'tap' && hasIx());
      markStrip();
      if (ro) {
        $('rodone').textContent = data.done ? '✓ Feita' : (hasWork(data) ? '✏️ Em andamento' : '— Em branco');
        $('rodone').className = 'lo-badge' + (data.done ? ' is-done' : '');
        $('navmid').textContent = `${idx + 1} / ${o.pages.length}`;
        return;
      }
      const done = root.querySelector('[data-a="done"]');
      done.textContent = data.done ? '✓ Página feita!' : 'Terminei esta página ✓';
      done.classList.toggle('is-done', data.done);
      root.querySelector('[data-a="undo"]').disabled = !hist.length;
      root.querySelector('[data-a="redo"]').disabled = !redoStack.length;
      root.querySelectorAll('[data-tool]').forEach(b => {
        const on = b.dataset.tool === tool;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      stage.dataset.mode = tool;
    }

    // ---- changes, history, saving -------------------------------------------
    const snap = () => JSON.stringify(data);
    function remember(before) {
      hist.push(before === undefined ? snap() : before);
      if (hist.length > 60) hist.shift();
      redoStack = [];
    }
    function changed() {
      data.updatedAt = Date.now();
      if (o.save) o.save(pg, data);
      render();
    }
    function undo() {
      if (!hist.length) return;
      redoStack.push(snap());
      data = normalize(JSON.parse(hist.pop()));
      selected = null;
      changed();
    }
    function redo() {
      if (!redoStack.length) return;
      hist.push(snap());
      data = normalize(JSON.parse(redoStack.pop()));
      selected = null;
      changed();
    }

    function toast(text) {
      const t = $('toast');
      t.textContent = text;
      t.hidden = false;
      clearTimeout(toast._t);
      toast._t = setTimeout(() => { t.hidden = true; }, 1800);
    }

    // ---- PHASE 2: auto-checked exercises (interactive.json) ---------------------
    // Drawn in their own SVG layer in page millimetres (viewBox 210 x 297), so
    // they follow the page in every view (normal, slides, half page, zoom).
    // Active with the 👆 Responder tool; every other tool keeps working on top.
    let showAns = false;
    let ixSel = null;                 // match: { q, side, id } waiting for its pair
    const ixItems = () => (pg.interactive && Array.isArray(pg.interactive.items) ? pg.interactive.items : []);
    const hasIx = () => ixItems().length > 0;
    const f2 = v => Math.round(num(v, 0) * 100) / 100;
    const answerOf = q => (data.answers || {})[q] || null;
    const normAns = v => String(v == null ? '' : v).toLowerCase()
      .replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ').trim()
      .replace(/^["'(]+|["')]+$/g, '')
      .replace(/[.!?,;:]+$/, '').trim();
    function ixScore() {
      let ok = 0, total = 0;
      ixItems().forEach(it => { total += ixPoints(it); });
      ok = ixEarned(pg, data);
      return { ok, total };
    }

    // How many printed squares a fill-in row has (0 = not a row of squares).
    // One accepted answer of exactly that length must exist ("ucas" in 4 squares).
    let liveVal = '';
    function fillCells(it) {
      if (!it || it.type !== 'fill') return 0;
      const acc = (it.accept || []).map(x => normAns(x).replace(/\s/g, '')).filter(Boolean);
      if (!acc.length) return 0;
      if (acc.every(x => x.length === 1)) return 1;
      const w = num(it.w, 0), hh = num(it.h, 0);
      if (!w || !hh) return 0;
      const n = Math.round(w / hh);
      if (n < 2 || n > 12 || Math.abs(w / (n * hh) - 1) > 0.3) return 0;
      return acc.some(x => x.length === n) ? n : 0;
    }

    function renderIx() {
      const layer = $('ix');
      if (!layer) return;
      if (!hasIx()) { layer.innerHTML = ''; return; }
      const key = showAns && !!o.teacher;
      let h = '';
      ixItems().forEach(it => {
        const a = answerOf(it.id) || {};
        if (it.type === 'choice') {
          const picks = Array.isArray(a.v) ? a.v : [];
          (it.options || []).forEach((op, i) => {
            const x = f2(op.x), y = f2(op.y), w = f2(op.w), hh = f2(op.h);
            const picked = picks.includes(i) && op.ok;
            if (picked) h += `<ellipse class="lo-ix-ok" cx="${f2(x + w / 2)}" cy="${f2(y + hh / 2)}" rx="${f2(w / 2 + 1.2)}" ry="${f2(hh / 2 + 1.2)}"/>`;
            else if (key && op.ok) h += `<ellipse class="lo-ix-key" cx="${f2(x + w / 2)}" cy="${f2(y + hh / 2)}" rx="${f2(w / 2 + 1.2)}" ry="${f2(hh / 2 + 1.2)}"/>`;
            h += `<rect class="lo-ix-hit lo-ix-opt" data-q="${esc(it.id)}" data-o="${i}" x="${x}" y="${y}" width="${w}" height="${hh}" rx="1.5"/>`;
          });
        } else if (it.type === 'fill') {
          const x = f2(it.x), y = f2(it.y), w = f2(it.w), hh = f2(it.h);
          const fs = f2(it.size || Math.min(hh * 0.78, 6));
          const tx = f2(x + w / 2), ty = f2(y + hh * 0.5 + fs * 0.35);
          h += `<rect class="lo-ix-hit lo-ix-fill${a.ok ? ' is-ok' : a.v ? ' is-bad' : ''}${answering && answering.id === it.id ? ' is-active' : ''}" data-q="${esc(it.id)}" x="${x}" y="${y}" width="${w}" height="${hh}" rx="1"/>`;
          const cells = fillCells(it);
          const typing = answering && answering.id === it.id;
          if (cells > 1 && (typing || a.v)) {
            // One letter in each square of the printed row.
            const word = typing ? liveVal : String(a.v || '');
            const cls = typing ? ' is-live' : a.ok ? ' is-ok' : ' is-bad';
            [...word].slice(0, cells).forEach((ch, ci) => {
              h += `<text class="lo-ix-txt${cls}" x="${f2(x + (ci + 0.5) * w / cells)}" y="${ty}" font-size="${fs}" text-anchor="middle">${esc(ch)}</text>`;
            });
          } else if (a.v) h += `<text class="lo-ix-txt${a.ok ? ' is-ok' : ' is-bad'}" x="${tx}" y="${ty}" font-size="${fs}" text-anchor="middle">${esc(a.v)}</text>`;
          else if (key) h += `<text class="lo-ix-txt is-key" x="${tx}" y="${ty}" font-size="${fs}" text-anchor="middle">${esc((it.accept || [])[0] || '')}</text>`;
          if (a.v && !a.ok && key) h += `<text class="lo-ix-txt is-key" x="${tx}" y="${f2(y - 0.6)}" font-size="${f2(fs * 0.7)}" text-anchor="middle">${esc((it.accept || [])[0] || '')}</text>`;
        } else if (it.type === 'match') {
          const L = it.left || [], R = it.right || [];
          const pt = (side, id) => (side === 'l' ? L : R).find(d => d.id === id);
          const found = (a.v && typeof a.v === 'object') ? a.v : {};
          Object.keys(it.pairs || {}).forEach(l => {
            const r = it.pairs[l], p1 = pt('l', l), p2 = pt('r', r);
            if (!p1 || !p2) return;
            if (found[l] === r) h += `<line class="lo-ix-line" x1="${f2(p1.x)}" y1="${f2(p1.y)}" x2="${f2(p2.x)}" y2="${f2(p2.y)}"/>`;
            else if (key) h += `<line class="lo-ix-line is-key" x1="${f2(p1.x)}" y1="${f2(p1.y)}" x2="${f2(p2.x)}" y2="${f2(p2.y)}"/>`;
          });
          [['l', L], ['r', R]].forEach(([side, list]) => list.forEach(d => {
            const done = side === 'l' ? found[d.id] : Object.values(found).includes(d.id);
            const sel = ixSel && ixSel.q === it.id && ixSel.side === side && ixSel.id === d.id;
            h += `<circle class="lo-ix-hit lo-ix-dot${done ? ' is-ok' : ''}${sel ? ' is-sel' : ''}" data-q="${esc(it.id)}" data-side="${side}" data-id="${esc(d.id)}" cx="${f2(d.x)}" cy="${f2(d.y)}" r="${f2(d.r || 2.6)}"/>`;
          }));
        }
      });
      (pg.interactive.listen || []).forEach(l => {
        h += `<g class="lo-ix-hit lo-ix-listen" data-track="${esc(l.track)}" transform="translate(${f2(l.x)} ${f2(l.y)})"><circle r="${f2(l.r || 5)}"/><text y="${f2((l.r || 5) * 0.38)}" font-size="${f2((l.r || 5) * 1.05)}" text-anchor="middle">🔊</text></g>`;
      });
      layer.innerHTML = h;
    }

    function ixFlash(el, cls) {
      if (!el) return;
      el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), 600);
    }
    function ixCommit(q, val) {
      remember();
      data.answers = { ...(data.answers || {}), [q]: val };
      data.score = ixScore();
      const s = data.score;
      if (s.total && s.ok === s.total && !data.ixDone) {
        data.ixDone = true;
        data.done = true;
        let extra = '';
        // Adventurers counts XP in the book itself: +10 XP once per page.
        if (book === 'adventurers' && !data.xp && o.studentId && typeof addXP === 'function') {
          try { addXP(o.studentId, 10); data.xp = 10; extra = ' +10 XP'; } catch (e) { /* progress not loaded */ }
        }
        changed();
        celebrate(`🎉 Página completa! ${s.ok}/${s.total} ⭐${extra}`);
        return;
      }
      changed();
    }
    function celebrate(text) {
      toast(text);
      const box = document.createElement('div');
      box.className = 'lo-confetti';
      box.innerHTML = ['⭐', '🎉', '✨', '🌟', '🎊', '⭐', '✨', '🎉'].map((e, i) => `<span style="--i:${i}">${e}</span>`).join('');
      stage.appendChild(box);
      setTimeout(() => box.remove(), 1400);
    }
    const tryAgain = () => toast(['Try again! 💪', 'Quase! Tente de novo 🙂', 'Oops! Try again ✨'][Math.floor(Math.random() * 3)]);

    function playTrack(track) {
      loadTracks(book).then(tracks => {
        const t = tracks[track];
        const fromPage = (pg.audio || []).find(a => a.track === track);
        const file = (t && t.file) || (fromPage && fromPage.file);
        if (!file) { toast('Áudio indisponível.'); return; }
        const src = `audios/${book}/${file}`;
        if (!audio.paused && audio.src.endsWith(encodeURI(src))) { audio.pause(); return; }
        if (!audio.src.endsWith(encodeURI(src))) audio.src = src;
        audio.play().catch(() => toast('Não consegui tocar o áudio agora.'));
      });
    }

    function onIx(el) {
      if (el.dataset.track) { playTrack(el.dataset.track); return; }
      if (ro) return;
      const it = ixItems().find(x => x.id === el.dataset.q);
      if (!it) return;
      const a = answerOf(it.id) || { ok: false, t: 0 };
      if (it.type === 'choice') {
        if (a.ok) return;
        const i = Number(el.dataset.o);
        const op = (it.options || [])[i];
        if (!op) return;
        if (op.ok) {
          const picks = Array.isArray(a.v) ? a.v.slice() : [];
          if (!picks.includes(i)) picks.push(i);
          const need = it.options.map((x, j) => (x.ok ? j : -1)).filter(j => j >= 0);
          ixCommit(it.id, { ok: need.every(j => picks.includes(j)), v: picks, t: a.t || 0 });
          if (!need.every(j => picks.includes(j))) toast('✓ Isso! Tem mais…');
        } else {
          ixFlash(el, 'lo-shake');
          data.answers = { ...(data.answers || {}), [it.id]: { ...a, t: (a.t || 0) + 1 } };
          data.updatedAt = Date.now(); if (o.save) o.save(pg, data);
          tryAgain();
        }
      } else if (it.type === 'fill') {
        openAnswer(it);
      } else if (it.type === 'match') {
        const side = el.dataset.side, id = el.dataset.id;
        const found = { ...((a.v && typeof a.v === 'object') ? a.v : {}) };
        if (side === 'l' ? found[id] : Object.values(found).includes(id)) return;     // already matched
        if (!ixSel || ixSel.q !== it.id || ixSel.side === side) { ixSel = { q: it.id, side, id }; renderIx(); return; }
        const l = side === 'l' ? id : ixSel.id, r = side === 'r' ? id : ixSel.id;
        ixSel = null;
        if ((it.pairs || {})[l] === r) {
          found[l] = r;
          ixCommit(it.id, { ok: Object.keys(it.pairs).every(k => found[k] === it.pairs[k]), v: found, t: a.t || 0 });
        } else {
          renderIx();
          $('ix').querySelectorAll(`.lo-ix-dot[data-q="${CSS.escape(it.id)}"]`).forEach(d => {
            if ((d.dataset.side === 'l' && d.dataset.id === l) || (d.dataset.side === 'r' && d.dataset.id === r)) ixFlash(d, 'lo-shake');
          });
          data.answers = { ...(data.answers || {}), [it.id]: { ...a, v: found, t: (a.t || 0) + 1 } };
          data.updatedAt = Date.now(); if (o.save) o.save(pg, data);
          tryAgain();
        }
      }
    }

    // Fill-in: a big input in a sheet (16px+ so phones do not zoom), checked on OK.
    let answering = null;
    function openAnswer(it) {
      const sheet = $('ans'), input = $('ansin');
      if (!sheet) return;
      answering = it;
      const a = answerOf(it.id);
      const cells = fillCells(it);
      input.maxLength = cells || 80;
      // A wrong try is cleared so the next key press is simply the next try.
      input.value = a && a.v && (a.ok || !cells) ? a.v : '';
      liveVal = cells > 1 ? input.value : '';
      $('ansq').textContent = it.hint || (cells > 1 ? 'Escreva as letras / Write the letters' : cells === 1 ? 'Escreva a letra / Write the letter' : 'Escreva a resposta / Write the answer');
      sheet.hidden = false;
      renderIx();
      setTimeout(() => { try { input.focus({ preventScroll: true }); input.select(); } catch (e) { input.focus(); } }, 30);
      // The sheet sits at the top and the keyboard takes the bottom: slide the
      // page so the box being answered is in the free band between them, and
      // do it again once the keyboard has finished opening.
      [120, 450].forEach(ms => setTimeout(() => revealAnswerTarget(it), ms));
    }
    function revealAnswerTarget(it) {
      if (answering !== it) return;
      const sheet = $('ans'), el = $('ix') && $('ix').querySelector(`.lo-ix-fill[data-q="${CSS.escape(it.id)}"]`);
      if (!sheet || sheet.hidden || !el) return;
      const sr = stageRect(), sh = sheet.getBoundingClientRect(), r = el.getBoundingClientRect();
      const freeTop = sh.bottom + 10, freeBottom = sr.bottom - 10;
      if (freeBottom - freeTop < 40) return;
      const mid = (r.top + r.bottom) / 2;
      if (r.top >= freeTop && r.bottom <= freeBottom) return;            // already in the clear
      ty += (freeTop + (freeBottom - freeTop) * 0.4) - mid;
      applyView();
    }
    // "Uma letra em cada quadradinho": boxes whose every accepted answer is one character.
    const isLetterBox = it => fillCells(it) > 0;
    // The next letter box (in the page's order) that is not right yet.
    function nextLetterBox(from) {
      const list = ixItems().filter(isLetterBox);
      const i = list.findIndex(x => x.id === from.id);
      const order = list.slice(i + 1).concat(list.slice(0, i + 1));
      return order.find(x => x.id !== from.id && !(answerOf(x.id) || {}).ok) || null;
    }
    // One key press = the answer: check it, and move on to the next box with the keyboard still open.
    function submitLetter() {
      const input = $('ansin');
      if (!answering || !isLetterBox(answering)) return;
      const v = input.value.replace(/\s+/g, '').trim();
      const n = fillCells(answering);
      liveVal = v;
      if (n > 1) renderIx();                 // show the letters in the squares as they are typed
      if (!v || v.length < n) return;
      const it = answering;
      const a = answerOf(it.id) || { t: 0 };
      const ok = (it.accept || []).some(x => normAns(x) === normAns(v));
      if (ok) {
        ixCommit(it.id, { ok: true, v, t: a.t || 0 });
        const nxt = nextLetterBox(it);
        if (nxt) openAnswer(nxt); else closeAnswer(false);
      } else {
        ixCommit(it.id, { ok: false, v, t: (a.t || 0) + 1 });
        const el = $('ix').querySelector(`.lo-ix-fill[data-q="${CSS.escape(it.id)}"]`);
        if (el) ixFlash(el, 'lo-shake');
        tryAgain();
        input.value = '';
        liveVal = '';
        renderIx();
        try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
      }
    }
    function closeAnswer(check) {
      const sheet = $('ans'), input = $('ansin');
      if (!sheet || !answering) return;
      const it = answering;
      answering = null;
      liveVal = '';
      sheet.hidden = true;
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      renderIx();
      if (!check) return;
      const v = input.value.replace(/\s+/g, ' ').trim();
      const a = answerOf(it.id) || { t: 0 };
      if (!v) {
        if (a.v) { remember(); const rest = { ...(data.answers || {}) }; delete rest[it.id]; data.answers = rest; data.score = ixScore(); changed(); }
        return;
      }
      const ok = (it.accept || []).some(x => normAns(x) === normAns(v));
      if (ok) ixCommit(it.id, { ok: true, v, t: a.t || 0 });
      else {
        ixCommit(it.id, { ok: false, v, t: (a.t || 0) + 1 });
        const el = $('ix').querySelector(`.lo-ix-fill[data-q="${CSS.escape(it.id)}"]`);
        ixFlash(el, 'lo-shake');
        tryAgain();
      }
    }
    if (!ro) {
      $('ans').addEventListener('click', e => {
        const b = e.target.closest('[data-ans]');
        if (b) closeAnswer(b.dataset.ans === 'ok');
      });
      $('ansin').addEventListener('input', () => submitLetter());
      $('ansin').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); closeAnswer(true); }
        else if (e.key === 'Escape') { e.preventDefault(); closeAnswer(false); }
      });
    }

    // Entering a page: exercises on it -> the 👆 tool is picked for the child.
    function ixOnPage() {
      ixSel = null;
      showAns = false;
      if (answering) closeAnswer(false);
      root.classList.toggle('has-ix', hasIx());
      if (ro) return;
      if (hasIx()) { if (tool !== 'tap') { tool = 'tap'; } }
      else if (tool === 'tap') { const t = prefs().tool; tool = TOOLS.some(x => x.id === t && t !== 'tap') ? t : 'pen'; }
    }

    // ---- pages ----------------------------------------------------------------
    function leavePage() {
      closeSheet();
      if (answering) closeAnswer(false);
      if (!ro && o.sync) o.sync.flush();
    }
    // ---- live view -------------------------------------------------------------
    // The other side (student at home / teacher in class) may draw on the page that is open
    // right now: every few seconds take the newer cloud copy, unless this side is drawing,
    // typing, answering or has unsaved changes (a local, newer copy always wins).
    const liveTimer = setInterval(() => {
      if (!root.isConnected) { clearInterval(liveTimer); return; }
      if (ro || !o.sync || !o.sync.refresh || document.visibilityState === 'hidden') return;
      if (act || editing || answering || pinch || pts.size) return;
      const opened = pg, id = pid(m, opened.n);
      if (o.sync.isDirty && o.sync.isDirty(id)) return;
      o.sync.refresh(id).then(fresh => {
        if (!fresh || o.pages[idx] !== opened || act || editing || answering || pts.size) return;
        data = normalize(fresh);
        hist = []; redoStack = []; selected = null;
        render();
      }).catch(() => {});
    }, 4000);

    function goto(i, wantPart) {
      if (i < 0 || i >= o.pages.length) return;
      leavePage();
      audio.pause(); audio.removeAttribute('src'); audio.load();
      idx = i; pg = o.pages[idx];
      part = halfView() ? (wantPart === 'bottom' ? 'bottom' : 'top') : 'full';
      split = splitFor(pg);
      data = normalize(o.load(pg));
      hist = []; redoStack = []; selected = null;
      ixOnPage();
      img.src = resUrl(m, pg.img);
      img.alt = `Página ${pg.n}: ${pg.title || ''}`;
      const nxt = o.pages[idx + 1];
      if (nxt) { const pre = new Image(); pre.src = resUrl(m, nxt.img); }
      computeBase(); z = 1; applyView();
      fadeIn();
      render();
      paintOpts();
      paintAudio();
      mountInteractive();
      if (o.onPage) o.onPage(pg);
      // The same page may be open on the other side (student at home /
      // teacher in class): take the newer cloud copy if nothing was drawn yet.
      if (!ro && o.sync && o.sync.refresh) {
        const opened = pg;
        o.sync.refresh(pid(m, opened.n)).then(fresh => {
          if (!fresh || o.pages[idx] !== opened || hist.length || editing || act) return;
          data = normalize(fresh);
          selected = null;
          render();
          toast('🔄 Página atualizada');
        });
      }
    }

    function mountInteractive() {
      // Phase 2 hook — nothing is registered yet.
      const it = pg.interactive;
      if (it && it.type && LO_INTERACTIVE[it.type] && typeof LO_INTERACTIVE[it.type].mount === 'function') {
        try { LO_INTERACTIVE[it.type].mount(stage, pg, data, { readOnly: ro, changed }); } catch (e) { console.error(e); }
      }
    }

    // ---- audio: track chips + player (back / pause / forward / seek / speed) ----
    let audioItems = [];
    const fmtT = t => { t = Math.max(0, Math.floor(t || 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
    const curIdx = () => audioItems.findIndex(a => audio.src && audio.src.endsWith(encodeURI(`audios/${book}/${a.file}`)));
    function loadItem(i, andPlay) {
      const a = audioItems[i];
      if (!a) return;
      const src = `audios/${book}/${a.file}`;
      if (!audio.src.endsWith(encodeURI(src))) { audio.src = src; audio.playbackRate = rate; }
      if (andPlay) {
        audio.currentTime = 0;
        audio.play().catch(() => toast('Não consegui tocar o áudio agora.'));
      }
      paintAudioState();
    }
    let rate = 1, apMin = false;
    const RATES = [1, 0.75, 0.5];
    function paintAudio() {
      const box = $('audio');
      const list = (pg.audio || []);
      audioItems = [];
      if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }
      loadTracks(book).then(tracks => {
        if (o.pages[idx] !== pg) return;
        audioItems = list.map(a => {
          const t = tracks[a.track];
          const file = (t && t.file) || a.file;
          return (t || a.available) && file ? { file, title: (t && t.title ? t.title.split(/\. |\? /)[0] : a.title) || 'Audio' } : null;
        }).filter(Boolean);
        box.hidden = !audioItems.length;
        if (!audioItems.length) { box.innerHTML = ''; return; }
        box.innerHTML = `
          ${audioItems.length > 1 ? `<div class="lo-ap-tracks">${audioItems.map((a, i) => `<button type="button" class="lo-audio-btn" data-au="${i}">🎧 <small>${esc(a.title)}</small></button>`).join('')}</div>` : ''}
          <div class="lo-ap-bar" data-ref="apbar">
            <div class="lo-ap-head"><span class="lo-ap-title" data-ref="aptitle"></span>
              <button type="button" class="lo-ap-min" data-ap="min" aria-label="Minimizar o player" title="Minimizar / expandir">▾</button></div>
            <div class="lo-ap-row">
              <button type="button" class="lo-ap-b" data-ap="restart" aria-label="Voltar ao início" title="Voltar ao início">⏮</button>
              <button type="button" class="lo-ap-b" data-ap="back" aria-label="Voltar 5 segundos" title="Voltar 5 segundos">⏪<small>5s</small></button>
              <button type="button" class="lo-ap-b lo-ap-play" data-ap="play" aria-label="Tocar ou pausar" title="Tocar / pausar (espaço no áudio)">▶</button>
              <button type="button" class="lo-ap-b" data-ap="fwd" aria-label="Avançar 5 segundos" title="Avançar 5 segundos">⏩<small>5s</small></button>
              <span class="lo-ap-time" data-ref="aptime">0:00</span>
              <input type="range" class="lo-ap-seek" data-ref="apseek" min="0" max="1000" value="0" step="1" aria-label="Posição do áudio" />
              <span class="lo-ap-time" data-ref="apdur">0:00</span>
              <button type="button" class="lo-ap-b lo-ap-rate" data-ap="rate" aria-label="Velocidade" title="Velocidade">1×</button>
              <button type="button" class="lo-ap-b lo-ap-loop" data-ap="loop" aria-label="Repetir" title="Repetir o áudio">🔁</button>
            </div>
          </div>`;
        box.querySelectorAll('[data-au]').forEach(btn => btn.addEventListener('click', () => {
          const i = Number(btn.dataset.au);
          if (curIdx() === i && !audio.paused) { audio.pause(); return; }
          loadItem(i, curIdx() !== i || audio.ended || audio.currentTime < 0.05);
          if (curIdx() === i && audio.paused && audio.currentTime >= 0.05 && !audio.ended) audio.play().catch(() => {});
        }));
        const seek = box.querySelector('[data-ref="apseek"]');
        let scrubbing = false;
        const doAct = act => {
          if (act === 'play') {
            if (curIdx() < 0) { loadItem(0, true); return; }
            if (audio.paused) { if (audio.ended) audio.currentTime = 0; audio.play().catch(() => toast('Não consegui tocar o áudio agora.')); }
            else audio.pause();
          } else if (act === 'back') {
            if (curIdx() < 0) return;
            audio.currentTime = Math.max(0, audio.currentTime - 5); paintAudioState();
          } else if (act === 'fwd') {
            if (curIdx() < 0) loadItem(0, false);
            audio.currentTime = Math.min((audio.duration || 1e9) - 0.05, audio.currentTime + 5); paintAudioState();
          } else if (act === 'restart') {
            if (curIdx() < 0) return;
            audio.currentTime = 0; paintAudioState();
          } else if (act === 'rate') {
            rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
            audio.playbackRate = rate; paintAudioState();
          } else if (act === 'loop') {
            audio.loop = !audio.loop; paintAudioState();
          } else if (act === 'min') {
            apMin = !apMin; box.classList.toggle('is-min', apMin);
            const mb = box.querySelector('[data-ap="min"]'); if (mb) mb.textContent = apMin ? '▴' : '▾';
          }
        };
        box.querySelectorAll('[data-ap]').forEach(btn => btn.addEventListener('click', () => doAct(btn.dataset.ap)));
        seek.addEventListener('input', () => {
          if (curIdx() < 0) loadItem(0, false);
          scrubbing = true;
          if (audio.duration) audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
          paintAudioState(true);
        });
        seek.addEventListener('change', () => { scrubbing = false; paintAudioState(); });
        seek._scrub = () => scrubbing;
        // keep keyboard/space on the slider from triggering page shortcuts
        ['keydown'].forEach(ev => box.addEventListener(ev, e => e.stopPropagation()));
        box.classList.toggle('is-min', apMin);
        { const mb = box.querySelector('[data-ap="min"]'); if (mb) mb.textContent = apMin ? '▴' : '▾'; }
        paintAudioState();
      });
    }
    function paintAudioState(fromSeek) {
      const box = root.querySelector('[data-ref="audio"]');
      if (!box || box.hidden) return;
      const i = curIdx();
      const playing = i >= 0 && !audio.paused;
      box.querySelectorAll('.lo-audio-btn').forEach((b, k) => b.classList.toggle('is-playing', k === i && playing));
      const title = box.querySelector('[data-ref="aptitle"]');
      if (title) title.textContent = i >= 0 ? audioItems[i].title : (audioItems[0] ? audioItems[0].title : '');
      const playBtn = box.querySelector('[data-ap="play"]');
      if (playBtn) { playBtn.textContent = playing ? '⏸' : '▶'; playBtn.classList.toggle('is-playing', playing); }
      const dur = i >= 0 && audio.duration && isFinite(audio.duration) ? audio.duration : 0;
      const cur = i >= 0 ? audio.currentTime : 0;
      const seek = box.querySelector('[data-ref="apseek"]');
      const t = box.querySelector('[data-ref="aptime"]'), d = box.querySelector('[data-ref="apdur"]');
      if (seek) {
        if (!fromSeek) seek.value = dur ? Math.round(cur / dur * 1000) : 0;
        seek.style.setProperty('--p', (dur ? cur / dur * 100 : 0) + '%');
      }
      if (t) t.textContent = fmtT(cur);
      if (d) d.textContent = dur ? fmtT(dur) : '–:––';
      const rb = box.querySelector('[data-ap="rate"]'); if (rb) rb.textContent = (rate === 1 ? '1' : String(rate).replace('0.', '.')) + '×';
      const lb = box.querySelector('[data-ap="loop"]'); if (lb) lb.classList.toggle('is-on', audio.loop);
    }
    ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'durationchange', 'ratechange'].forEach(ev => audio.addEventListener(ev, () => paintAudioState()));

    // ---- tool options row ---------------------------------------------------
    function paintOpts() {
      if (ro) return;
      const opts = $('opts');
      const sw = (list) => list.map(([c, name]) => `<button type="button" class="lo-swatch${c === color ? ' is-on' : ''}" data-color="${c}" style="--sw:${c}" aria-label="${name}" title="${name}"></button>`).join('');
      const sizes = (kind) => SIZES[kind].map((v, i) => `<button type="button" class="lo-size${size[kind] === i ? ' is-on' : ''}" data-size="${kind}:${i}" aria-label="Tamanho ${i + 1}"><i style="--d:${[8, 14, 22][i]}px;--sw:${color}"></i></button>`).join('');
      if (tool === 'pen' || tool === 'hl') {
        opts.innerHTML = `<div class="lo-opt-group">${sizes(tool)}</div><div class="lo-opt-group lo-colors">${sw(COLORS)}</div>`;
      } else if (tool === 'text') {
        opts.innerHTML = `<div class="lo-opt-group">${sizes('text')}</div><div class="lo-opt-group lo-colors">${sw(COLORS)}</div><span class="lo-hint">Toque na página onde quer escrever.</span>`;
      } else if (tool === 'eraser') {
        opts.innerHTML = '<span class="lo-hint">🧽 Passe o dedo ou o mouse sobre o traço para apagar.</span>';
      } else if (tool === 'tap') {
        opts.innerHTML = '<span class="lo-hint">👆 Toque na resposta certa. Para escrever, toque na linha. As outras ferramentas também funcionam aqui.</span>';
      } else if (tool === 'hand') {
        opts.innerHTML = '<span class="lo-hint">✋ Arraste para mover a página. Dois dedos (ou a rodinha do mouse) para zoom.</span>';
      } else if (tool === 'photo') {
        opts.innerHTML = `<div class="lo-opt-group"><button type="button" class="lo-chip" data-photo="paste">📋 Colar foto</button><button type="button" class="lo-chip" data-photo="file">📁 Escolher arquivo</button></div><span class="lo-hint">Dica: Win+Shift+S para recortar a tela e depois Ctrl+V aqui. Toque na foto para mover, ⤡ para o tamanho.</span>`;
      } else if (tool === 'sticker') {
        const here = m.stickers.filter(s => (s.pages || []).includes(pg.n));
        const rest = m.stickers.filter(s => !(s.pages || []).includes(pg.n));
        opts.innerHTML = `<div class="lo-tray" data-ref="tray">${PAWNS.concat(here, rest).map(s => `
          <button type="button" class="lo-tray-item${here.includes(s) ? ' is-here' : ''}${s.pawn ? ' is-pawn' : ''}" data-stk="${esc(s.id)}" title="${s.pawn ? esc(s.label) + ' — para os jogos de tabuleiro (pode usar quantos quiser)' : s.label ? 'Vai na ' + esc(s.label) : 'Adesivo livre'}">
            <img src="${esc(stkSrc(dir, s))}" alt="" draggable="false" /><small>${here.includes(s) ? 'aqui!' : esc(s.label || 'livre')}</small>
          </button>`).join('')}</div>`;
        wireTray(opts.querySelector('[data-ref="tray"]'));
      }
    }

    // ---- photos (paste / file / drop) -------------------------------------------
    const stkTool = () => tool === 'sticker' || tool === 'photo';
    const photoMsgFull = 'Esta página já tem fotos demais — apague uma ou use uma menor';
    const fileIn = document.createElement('input');
    fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.hidden = true;
    root.appendChild(fileIn);
    fileIn.addEventListener('change', () => { const f = fileIn.files && fileIn.files[0]; if (f) addPhoto(f); });
    async function addPhoto(file) {
      if (ro) return;
      if (!file || !/^image\//.test(file.type || '')) { toast('Não consegui abrir esta imagem'); return; }
      const photos = data.stickers.filter(s => s.s === 'photo');
      if (photos.length >= PHOTO_MAX_N) { toast(photoMsgFull); return; }
      const forPg = pg;
      let r;
      try { r = await compressPhoto(file); } catch (err) { toast('Não consegui abrir esta imagem'); return; }
      if (forPg !== pg) return;                       // moved to another page meanwhile
      const used = data.stickers.reduce((n, s) => n + (s.s === 'photo' ? s.src.length : 0), 0);
      if (data.stickers.filter(s => s.s === 'photo').length >= PHOTO_MAX_N || used + r.src.length > PHOTO_BUDGET) { toast(photoMsgFull); return; }
      let pw = 0.34, ph = pw * W / (r.w / r.h) / H;
      if (ph > 0.45) { pw *= 0.45 / ph; ph = 0.45; }
      const c = visibleCentre(), n = photos.length % 4;
      remember();
      const st = { id: uid(), s: 'photo', src: r.src, pw: Math.round(pw * 1e4) / 1e4, ph: Math.round(ph * 1e4) / 1e4,
        x: Math.round(clamp(c.x + n * 300, 0, W)), y: Math.round(clamp(c.y + n * 250, 0, H)), k: 1 };
      data.stickers.push(st);
      selected = st.id;
      tool = 'photo';
      changed();
      paintOpts();
      toast('📷 Foto colocada! Arraste para mover.');
    }
    function imageFrom(dt) {
      if (!dt) return null;
      const items = [...(dt.items || [])].filter(i => i.kind === 'file' && /^image\//.test(i.type));
      if (items.length) return items[0].getAsFile();
      return [...(dt.files || [])].find(f => /^image\//.test(f.type)) || null;
    }
    async function pasteFromClipboard() {
      try {
        if (!navigator.clipboard || !navigator.clipboard.read) throw new Error('no');
        const list = await navigator.clipboard.read();
        for (const it of list) {
          const type = it.types.find(t => t.startsWith('image/'));
          if (type) { addPhoto(new File([await it.getType(type)], 'colada', { type })); return; }
        }
        toast('Não tem imagem copiada. Recorte com Win+Shift+S e tente de novo.');
      } catch (err) { toast('Aperte Ctrl+V para colar a foto'); }
    }
    function onPaste(e) {
      if (ro || (stack[stack.length - 1] && stack[stack.length - 1].el !== root)) return;
      if (typeof SlidesAula !== 'undefined' && SlidesAula.isOpen()) return;
      const t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
      const f = imageFrom(e.clipboardData);
      if (!f) return;
      e.preventDefault();
      addPhoto(f);
    }
    document.addEventListener('paste', onPaste);
    if (!ro) {
      stage.addEventListener('dragover', e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
      stage.addEventListener('drop', e => {
        const f = imageFrom(e.dataTransfer);
        if (f) { e.preventDefault(); addPhoto(f); }
      });
    }

    // ---- stickers ----------------------------------------------------------------
    function visibleCentre() {
      const r = stageRect();
      return toUnits(r.left + r.width / 2, r.top + r.height / 2);
    }
    function snapTo(meta, x, y, force) {
      const t = (meta.targets || []).filter(g => g.page === pg.n && g.x != null)
        .map(g => ({ x: g.x * W, y: g.y * H }))
        .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
      if (t && (force || Math.hypot(t.x - x, t.y - y) < 750)) return { x: t.x, y: t.y, snapped: true };
      return { x, y, snapped: false };
    }
    function placeSticker(meta, at) {
      let p;
      if (at) p = snapTo(meta, at.x, at.y, false);
      else {
        const c = visibleCentre();
        p = snapTo(meta, c.x, c.y, (meta.targets || []).some(g => g.page === pg.n && g.x != null && !data.stickers.some(s => s.s === meta.id)));
      }
      // Several stickers added by tapping don't pile on one spot: each lands a little to the side.
      if (!at && !p.snapped) { const n = data.stickers.length % 6; p = { ...p, x: p.x + n * 330, y: p.y + n * 250 }; }
      remember();
      const st = { id: uid(), s: meta.id, x: Math.round(clamp(p.x, 0, W)), y: Math.round(clamp(p.y, 0, H)), k: 1 };
      data.stickers.push(st);
      selected = st.id;
      changed();
      if (p.snapped) toast('⭐ Colou no lugar certo!');
    }
    function wireTray(tray) {
      tray.querySelectorAll('[data-stk]').forEach(btn => {
        btn.addEventListener('pointerdown', e => {
          if (e.button > 0) return;
          const meta = sm[btn.dataset.stk];
          const sx = e.clientX, sy = e.clientY;
          let ghost = null;
          const move = ev => {
            if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 12) {
              ghost = document.createElement('img');
              ghost.className = 'lo-ghost';
              ghost.src = btn.querySelector('img').src;
              root.appendChild(ghost);
            }
            if (ghost) { ghost.style.transform = `translate(${ev.clientX - 36}px, ${ev.clientY - 36}px)`; ev.preventDefault(); }
          };
          const up = ev => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', cancel);
            if (ghost) {
              ghost.remove();
              const r = stageRect();
              if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
                placeSticker(meta, toUnits(ev.clientX, ev.clientY));
              }
            } else placeSticker(meta, null);
          };
          const cancel = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', cancel);
            if (ghost) ghost.remove();
          };
          window.addEventListener('pointermove', move, { passive: false });
          window.addEventListener('pointerup', up);
          window.addEventListener('pointercancel', cancel);
        });
      });
    }
    function hitSticker(u) {
      for (let i = data.stickers.length - 1; i >= 0; i--) {
        const s = data.stickers[i];
        const mt = metaFor(sm, s);
        if (!mt) continue;
        const b = stickerBox(s, mt);
        if (u.x >= b.x && u.x <= b.x + b.w && u.y >= b.y && u.y <= b.y + b.h) return s;
      }
      return null;
    }
    function hitHandle(u, which) {
      const st = selected && data.stickers.find(s => s.id === selected);
      if (!st || !metaFor(sm, st)) return false;
      const b = stickerBox(st, metaFor(sm, st));
      const r = 22 / pxPerUnit();
      const hx = b.x + b.w, hy = which === 'del' ? b.y : b.y + b.h;
      return Math.hypot(u.x - hx, u.y - hy) <= r;
    }
    function hitText(u) {
      const els = over.querySelectorAll('text[data-tid]');
      for (let i = els.length - 1; i >= 0; i--) {
        let bb; try { bb = els[i].getBBox(); } catch (e) { continue; }
        const pad = 120;
        if (u.x >= bb.x - pad && u.x <= bb.x + bb.width + pad && u.y >= bb.y - pad && u.y <= bb.y + bb.height + pad) {
          return data.texts.find(t => t.id === els[i].dataset.tid) || null;
        }
      }
      return null;
    }

    // ---- eraser -------------------------------------------------------------------
    function eraseAt(u, act) {
      const r = 14 / pxPerUnit();
      const before = data.strokes.length;
      data.strokes = data.strokes.filter(s => {
        const p = s.p, lim = r + num(s.w, 50) / 2;
        if (p.length === 2) return Math.hypot(u.x - p[0], u.y - p[1]) > lim;
        for (let i = 0; i + 3 < p.length; i += 2) {
          if (segDist(u.x, u.y, p[i], p[i + 1], p[i + 2], p[i + 3]) <= lim) return false;
        }
        return true;
      });
      if (data.strokes.length !== before) { act.removed = true; renderInk(); }
    }

    // ---- text sheet ---------------------------------------------------------------
    let editing = null;
    function openSheet(t, isNew) {
      if (ro) return;
      const before = snap();
      if (isNew) data.texts.push(t);
      editing = { t, before };
      renderOver();
      const sheet = $('sheet'), ta = $('ta');
      sheet.hidden = false;
      ta.value = t.v;
      $('tscolors').innerHTML = COLORS.slice(0, 8).map(([c, n]) => `<button type="button" class="lo-swatch lo-swatch--sm${c === col(t.c) ? ' is-on' : ''}" data-tsc="${c}" style="--sw:${c}" aria-label="${n}"></button>`).join('')
        + SIZES.text.map((v, i) => `<button type="button" class="lo-chip lo-chip--sz${v === t.s ? ' is-on' : ''}" data-tss="${v}" style="font-size:${[0.8, 1.05, 1.35][i]}rem" aria-label="Tamanho ${i + 1}">A</button>`).join('');
      setTimeout(() => { try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); } }, 30);
    }
    function closeSheet() {
      if (!editing) return;
      const { t, before } = editing;
      editing = null;
      const sheet = $('sheet');
      if (sheet) sheet.hidden = true;
      if (!String(t.v).trim()) data.texts = data.texts.filter(x => x !== t);
      if (snap() !== before) { remember(before); changed(); } else renderOver();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }
    if (!ro) {
      const ta = $('ta');
      // Saved while typing too: a child who closes the tab without pressing
      // OK keeps the words (the undo step is recorded when the sheet closes).
      ta.addEventListener('input', () => {
        if (!editing) return;
        editing.t.v = ta.value;
        renderOver();
        data.updatedAt = Date.now();
        if (o.save) o.save(pg, data);
      });
      $('sheet').addEventListener('click', e => {
        const c = e.target.closest('[data-tsc]'), s = e.target.closest('[data-tss]'), b = e.target.closest('[data-ts]');
        if (c && editing) { editing.t.c = c.dataset.tsc; color = editing.t.c; renderOver(); $('sheet').querySelectorAll('[data-tsc]').forEach(x => x.classList.toggle('is-on', x === c)); }
        if (s && editing) { editing.t.s = Number(s.dataset.tss); const si = SIZES.text.indexOf(editing.t.s); if (si >= 0) { size.text = si; savePrefs({ ...prefs(), text: si }); } renderOver(); $('sheet').querySelectorAll('[data-tss]').forEach(x => x.classList.toggle('is-on', x === s)); }
        if (b && b.dataset.ts === 'ok') closeSheet();
        if (b && b.dataset.ts === 'del' && editing) { editing.t.v = ''; closeSheet(); }
      });
      ta.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeSheet(); } });
    }

    // ---- pointer input --------------------------------------------------------------
    const pts = new Map();
    let act = null;
    let raf = 0;
    const drawTool = () => tool === 'pen' || tool === 'hl' || tool === 'eraser';

    function startAction(e) {
      const u = toUnits(e.clientX, e.clientY);
      const [b0, b1] = band();
      const offBand = part !== 'full' && (u.y < b0 * H || u.y > b1 * H);
      const pan = ro || tool === 'hand' || tool === 'tap' || e.button === 1 || offBand || (penSeen && e.pointerType === 'touch' && drawTool());
      if (!pan && stkTool()) {
        if (hitHandle(u, 'del')) {
          remember();
          data.stickers = data.stickers.filter(s => s.id !== selected);
          selected = null; changed(); act = null; return;
        }
        if (hitHandle(u, 'res')) {
          const st = data.stickers.find(s => s.id === selected);
          act = { type: 'stk-res', st, before: snap(), d0: Math.max(1, Math.hypot(u.x - st.x, u.y - st.y)), k0: num(st.k, 1), moved: false };
          return;
        }
        const hit = hitSticker(u);
        if (hit) {
          selected = hit.id; renderOver();
          act = { type: 'stk-move', st: hit, before: snap(), start: u, ox: hit.x, oy: hit.y, moved: false };
          return;
        }
        if (selected) { selected = null; renderOver(); }
      }
      if (!pan && tool === 'text') {
        const hit = hitText(u);
        act = { type: 'text', target: hit, before: snap(), start: u, ox: hit ? hit.x : 0, oy: hit ? hit.y : 0, sx: e.clientX, sy: e.clientY, moved: false, tx0: tx, ty0: ty };
        return;
      }
      if (pan || stkTool()) { act = { type: 'pan', sx: e.clientX, sy: e.clientY, tx0: tx, ty0: ty }; return; }
      if (tool === 'eraser') { act = { type: 'erase', before: snap(), removed: false }; eraseAt(u, act); return; }
      const w = SIZES[tool][size[tool]];
      act = { type: 'draw', t: tool, c: color, w, p: [u.x, u.y] };
      live.setAttribute('stroke', color);
      live.setAttribute('stroke-width', w);
      if (tool === 'hl') live.setAttribute('stroke-opacity', '.6'); else live.removeAttribute('stroke-opacity');
      live.setAttribute('d', strokeD(act.p));
    }

    function moveAction(e) {
      if (!act) return;
      if (act.type === 'pan') {
        tx = act.tx0 + (e.clientX - act.sx); ty = act.ty0 + (e.clientY - act.sy); applyView(); return;
      }
      const u = toUnits(e.clientX, e.clientY);
      if (act.type === 'draw') {
        const n = act.p.length;
        const minStep = 1.2 / pxPerUnit();
        if (Math.hypot(u.x - act.p[n - 2], u.y - act.p[n - 1]) < minStep) return;
        act.p.push(u.x, u.y);
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (act && act.type === 'draw') live.setAttribute('d', strokeD(act.p.map(Math.round))); });
      } else if (act.type === 'erase') eraseAt(u, act);
      else if (act.type === 'stk-move') {
        act.st.x = Math.round(clamp(act.ox + u.x - act.start.x, 0, W));
        act.st.y = Math.round(clamp(act.oy + u.y - act.start.y, 0, H));
        act.moved = true; renderOver();
      } else if (act.type === 'stk-res') {
        act.st.k = Math.round(clamp(act.k0 * Math.hypot(u.x - act.st.x, u.y - act.st.y) / act.d0, act.st.s === 'photo' ? 0.2 : 0.5, act.st.s === 'photo' ? 4 : 2) * 100) / 100;
        act.moved = true; renderOver();
      } else if (act.type === 'text') {
        if (!act.moved && Math.hypot(e.clientX - act.sx, e.clientY - act.sy) < 8) return;
        act.moved = true;
        if (act.target) {
          act.target.x = Math.round(clamp(act.ox + u.x - act.start.x, 0, W - 200));
          act.target.y = Math.round(clamp(act.oy + u.y - act.start.y, 0, H - 200));
          renderOver();
        } else { tx = act.tx0 + (e.clientX - act.sx); ty = act.ty0 + (e.clientY - act.sy); applyView(); }
      }
    }

    function endAction(cancel) {
      const a = act; act = null;
      if (!a) return;
      if (a.type === 'draw') {
        live.setAttribute('d', '');
        if (cancel && a.p.length < 60) return;
        const p = simplify(a.p, Math.max(2, 0.45 / pxPerUnit()));
        remember();
        data.strokes.push({ t: a.t, c: a.c, w: a.w, p });
        changed();
      } else if (a.type === 'erase') {
        if (a.removed) { remember(a.before); changed(); }
      } else if (a.type === 'stk-move' || a.type === 'stk-res') {
        if (a.moved) {
          if (a.type === 'stk-move') {
            const p = snapTo(metaFor(sm, a.st), a.st.x, a.st.y, false);
            if (p.snapped) { a.st.x = Math.round(p.x); a.st.y = Math.round(p.y); a.st.k = 1; toast('⭐ Colou no lugar certo!'); }
          }
          remember(a.before); changed();
        }
      } else if (a.type === 'text' && !cancel) {
        if (!a.moved) {
          if (a.target) openSheet(a.target, false);
          else openSheet({ id: uid(), x: Math.round(clamp(a.start.x, 0, W - 400)), y: Math.round(clamp(a.start.y - SIZES.text[size.text] * 0.6, 0, H - 400)), s: SIZES.text[size.text], c: color, v: '' }, true);
        } else if (a.target) { remember(a.before); changed(); }
      }
    }

    function pinchInfo() {
      const [p1, p2] = [...pts.values()];
      const r = stageRect();
      return { d: Math.max(10, Math.hypot(p1.x - p2.x, p1.y - p2.y)), cx: (p1.x + p2.x) / 2 - r.left, cy: (p1.y + p2.y) / 2 - r.top };
    }
    let pinch = null;

    // The boxes of an exercise are printed small (6.5 mm = about 11 px on a phone):
    // a finger lands beside them. On the 👆 tool a tap goes to the nearest box
    // within ~22 px of the touch (inside a box wins; between boxes, the closer
    // centre wins) instead of needing a pixel-perfect hit.
    const IX_TOUCH_SLOP = 22;
    function nearestIxHit(cx, cy) {
      const layer = $('ix');
      if (!layer) return null;
      let best = null, bestScore = Infinity;
      layer.querySelectorAll('.lo-ix-hit:not(.lo-ix-listen)').forEach(el => {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        const dx = Math.max(r.left - cx, 0, cx - r.right), dy = Math.max(r.top - cy, 0, cy - r.bottom);
        const edge = Math.hypot(dx, dy);
        if (edge > IX_TOUCH_SLOP) return;
        const centre = Math.hypot(cx - (r.left + r.right) / 2, cy - (r.top + r.bottom) / 2);
        const score = edge * 1000 + centre;       // inside (edge 0) first, then nearest centre
        if (score < bestScore) { bestScore = score; best = el; }
      });
      return best;
    }

    stage.addEventListener('pointerdown', e => {
      if (e.target.closest('.lo-zoom, .lo-textsheet, .lo-toast, .lo-anssheet')) return;
      let ixHit = e.target.closest && e.target.closest('.lo-ix-hit');
      if (!ro && tool === 'tap' && hasIx() && !(ixHit && ixHit.classList.contains('lo-ix-listen'))) {
        ixHit = nearestIxHit(e.clientX, e.clientY) || ixHit;
      }
      if (ixHit && pts.size === 0 && (ixHit.classList.contains('lo-ix-listen') || (!ro && tool === 'tap'))) {
        e.preventDefault();
        onIx(ixHit);
        return;
      }
      if (e.pointerType === 'mouse' && e.button === 2) return;
      root.classList.remove('opts-open');
      if (e.pointerType === 'pen') penSeen = true;
      if (editing) closeSheet();
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* old browser */ }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      e.preventDefault();
      if (pts.size === 2) {
        endAction(true);
        const i = pinchInfo();
        pinch = { d0: i.d, z0: z, px: (i.cx - tx) / (bw * z), py: (i.cy - ty) / (bh * z) };
        return;
      }
      if (pts.size > 2 || pinch) return;
      startAction(e);
    });
    stage.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) {
        const i = pinchInfo();
        z = clamp(pinch.z0 * i.d / pinch.d0, 1, 6);
        tx = i.cx - pinch.px * bw * z; ty = i.cy - pinch.py * bh * z;
        applyView();
        return;
      }
      moveAction(e);
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pinch) { if (pts.size < 2) pinch = null; return; }
      endAction(e.type === 'pointercancel');
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('lostpointercapture', up);
    stage.addEventListener('wheel', e => {
      e.preventDefault();
      const r = stageRect();
      const dy = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      zoomAt(e.clientX - r.left, e.clientY - r.top, z * Math.exp(-dy * 0.0016));
    }, { passive: false });
    ['gesturestart', 'gesturechange'].forEach(t => stage.addEventListener(t, e => e.preventDefault()));
    stage.addEventListener('contextmenu', e => e.preventDefault());

    // ---- buttons ------------------------------------------------------------------
    root.addEventListener('click', e => {
      const pb = e.target.closest('[data-photo]');
      if (pb) {
        if (pb.dataset.photo === 'file') { fileIn.value = ''; fileIn.click(); }
        else pasteFromClipboard();
        return;
      }
      const t = e.target.closest('[data-tool]');
      if (t) {
        closeSheet();
        // Slides: colours/sizes live in a popover — tapping the active tool
        // again shows/hides it.
        const withOpts = ['pen', 'hl', 'text', 'sticker', 'photo'].includes(t.dataset.tool);
        if (slides) root.classList.toggle('opts-open', withOpts && (t.dataset.tool !== tool || !root.classList.contains('opts-open')));
        tool = t.dataset.tool;
        if (!stkTool()) selected = null;
        if (tool !== 'tap') savePrefs({ ...prefs(), tool });
        paintChrome(); paintOpts(); renderOver();
        return;
      }
      const sw = e.target.closest('[data-color]');
      if (sw) { color = sw.dataset.color; savePrefs({ ...prefs(), color }); paintOpts(); return; }
      const sz = e.target.closest('[data-size]');
      if (sz) { const [k, i] = sz.dataset.size.split(':'); size[k] = Number(i); savePrefs({ ...prefs(), [k]: size[k] }); paintOpts(); return; }
      const g = e.target.closest('[data-goto]');
      if (g) { goto(Number(g.dataset.goto)); return; }
      const a = e.target.closest('[data-a]');
      if (!a) return;
      const r = stageRect();
      switch (a.dataset.a) {
        case 'back': back(); break;
        case 'present': root.classList.toggle('is-present'); computeBase(); applyView(); break;
        case 'slides':
          // The student's own decks (slidesAula.js) open on top of the book.
          if (typeof SlidesAula !== 'undefined' && o.studentId) { if (o.sync) o.sync.flush(); SlidesAula.openForStudent(o.studentId); }
          break;
        case 'games':
          if (typeof openGamesMenu === 'function') {
            const t = root.querySelector('[data-ref="ptitle"]');
            openGamesMenu({ pageTitle: t ? t.textContent.trim() : '' });
          }
          break;
        case 'dice': { const dp = root.querySelector('[data-ref="dice"]'); if (dp) dp.hidden = !dp.hidden; break; }
        case 'showans': showAns = !showAns; renderIx(); paintChrome(); break;
        case 'view-full': setView('full'); break;
        case 'view-half': setView('half'); break;
        case 'fs': toggleFs(); break;
        case 'slides':
          {
            // A choice equal to the automatic one goes back to automatic.
            const pr = { ...prefs() };
            if (!slides === autoSlides()) delete pr.slides; else pr.slides = slides ? 'off' : 'on';
            savePrefs(pr);
            applyMode(true);
          }
          break;
        case 'switch':
          closeSheet();
          if (o.sync) o.sync.flush();
          o.onSwitch();
          break;
        case 'prev': prev(); break;
        case 'next': next(); break;
        case 'zin': zoomAt(r.width / 2, r.height / 2, z * 1.4); break;
        case 'zout': zoomAt(r.width / 2, r.height / 2, z / 1.4); break;
        case 'fit': fit(); break;
        case 'undo': undo(); break;
        case 'redo': redo(); break;
        case 'clear':
          if (!hasWork(data)) { toast('A página já está limpa.'); break; }
          if (confirm('Apagar tudo o que você fez nesta página?')) {
            remember();
            data.strokes = []; data.texts = []; data.stickers = []; selected = null;
            if (data.answers) { delete data.answers; delete data.score; delete data.ixDone; }
            changed();
          }
          break;
        case 'done':
          data.done = !data.done;
          changed();
          if (data.done) toast('🎉 Muito bem! Página feita.');
          break;
        default:
      }
    });

    function onKey(e) {
      if (stack[stack.length - 1] && stack[stack.length - 1].el !== root) return;
      if (typeof SlidesAula !== 'undefined' && SlidesAula.isOpen()) return;   // slides are on top
      const typing = e.target.matches && e.target.matches('input, textarea, select');
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!ro && mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (!ro && mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      else if (!mod && (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ')) { e.preventDefault(); next(); }
      else if (!mod && (e.key === 'ArrowLeft' || e.key === 'PageUp')) { e.preventDefault(); prev(); }
      else if (!mod && e.key === 'Home') { e.preventDefault(); goto(0); }
      else if (!mod && e.key === 'End') { e.preventDefault(); goto(o.pages.length - 1, halfView() ? 'bottom' : 'full'); }
      else if (!mod && !e.altKey && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); toggleFs(); }
      else if (e.key === 'Escape') { if (!fsElement()) back(); }
      else if (!ro && (e.key === 'Delete' || e.key === 'Backspace') && selected) {
        remember(); data.stickers = data.stickers.filter(s => s.id !== selected); selected = null; changed();
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', applyMode);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);

    applyMode(true);
    setTimeout(() => goto(idx), 0);
    return { root };
  }

  // -------------------------------------------------------------------------
  // BOOK HOME — units, thumbnails, ✓ (student) / progress (teacher)
  // -------------------------------------------------------------------------
  // Points of a page's auto-checked exercises (phase 2) and what was earned.
  const ixPoints = it => (it.type === 'match' ? Object.keys(it.pairs || {}).length : 1);
  function ixTotal(p) { return p && p.interactive ? p.interactive.items.reduce((n, it) => n + ixPoints(it), 0) : 0; }
  function ixEarned(p, w) {
    if (!p || !p.interactive) return 0;
    const a = (w && w.answers) || {};
    return p.interactive.items.reduce((n, it) => {
      const r = a[it.id];
      if (!r) return n;
      if (it.type === 'match') return n + Object.keys(r.v || {}).filter(k => (it.pairs || {})[k] === r.v[k]).length;
      return n + (r.ok ? 1 : 0);
    }, 0);
  }

  function progressOf(manifest, getPage) {
    const pages = contentPages(manifest);
    const done = pages.filter(p => getPage(p).done).length;
    const started = pages.filter(p => hasWork(getPage(p))).length;
    let ixOk = 0, ixAll = 0;
    const units = manifest.units.map(u => {
      const list = pages.filter(p => p.unit === u.n);
      let ok = 0, all = 0;
      list.forEach(p => { const t = ixTotal(p); if (t) { all += t; ok += ixEarned(p, getPage(p)); } });
      ixOk += ok; ixAll += all;
      return { ...u, total: list.length, done: list.filter(p => getPage(p).done).length, ixOk: ok, ixAll: all };
    }).filter(u => u.total);
    const modules = (manifest.modules || []).map(md => {
      const us = units.filter(u => (md.units || []).includes(u.n));
      return { n: md.n, title: md.title, total: us.reduce((a, u) => a + u.total, 0), done: us.reduce((a, u) => a + u.done, 0), ixOk: 0, ixAll: 0 };
    }).filter(md => md.total);
    return { total: pages.length, done, started, units, modules, ixOk, ixAll };
  }

  const normQ = v => String(v == null ? '' : v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function unitSectionHTML(manifest, getPage, u, list, noHead) {
    const d = list.filter(p => getPage(p).done).length;
    return `
        <section class="lo-unit">
          ${noHead ? '' : `<h3>${esc(u.title)} <small>${d}/${list.length} ✓</small></h3>`}
          <div class="lo-grid">
            ${list.map(p => {
              const w = getPage(p);
              const t = ixTotal(p);
              const e = t ? ixEarned(p, w) : 0;
              return `
                <button type="button" class="lo-card${w.done ? ' is-done' : ''}" data-n="${p.n}" data-q="${esc(normQ(`${p.n} p${p.n} ${p.title || ''} ${u.title}`))}">
                  <span class="lo-thumb">
                    <img src="${esc(resUrl(manifest, p.thumb))}" alt="" loading="lazy" draggable="false" />
                    ${overlayHTML(w, manifest)}
                    ${w.done ? '<span class="lo-check" aria-label="feita">✓</span>' : hasWork(w) ? '<span class="lo-dot" aria-label="começada">✏️</span>' : ''}
                    ${(p.audio || []).length ? '<span class="lo-has-audio" aria-label="tem áudio">🎧</span>' : ''}
                    ${t ? `<span class="lo-ixbadge${e === t ? ' is-full' : ''}" title="Exercícios com correção">${e || w.answers ? `⭐ ${e}/${t}` : '🎯'}</span>` : ''}
                  </span>
                  <span class="lo-card-n">p. ${p.n}</span>
                  <span class="lo-card-t">${esc(p.title || '')}</span>
                </button>`;
            }).join('')}
          </div>
        </section>`;
  }

  // Which modules of a one-volume book are open on the home (kept while repainting).
  const openMods = {};
  function cardsHTML(manifest, getPage, focusN) {
    const pages = contentPages(manifest);
    if (!manifest.modules) {
      return manifest.units.map(u => {
        const list = pages.filter(p => p.unit === u.n);
        return list.length ? unitSectionHTML(manifest, getPage, u, list) : '';
      }).join('');
    }
    // Speak Up! A1+: 210 pages -> collapsible MODULES (closed ones load no thumbnails) + a page finder.
    const key = bookKey(manifest);
    if (!openMods[key]) {
      const fp = pages.find(p => p.n === focusN);
      const md = fp && manifest.modules.find(m => (m.units || []).includes(fp.unit));
      openMods[key] = new Set([md ? md.n : (manifest.modules[1] || manifest.modules[0]).n]);
    }
    const open = openMods[key];
    const body = manifest.modules.map(md => {
      const lists = (md.units || []).map(n => manifest.units.find(u => u.n === n)).filter(Boolean)
        .map(u => ({ u, list: pages.filter(p => p.unit === u.n) })).filter(x => x.list.length);
      if (!lists.length) return '';
      const all = lists.reduce((a, x) => a.concat(x.list), []);
      const d = all.filter(p => getPage(p).done).length;
      return `
        <details class="lo-module" data-mod="${md.n}"${open.has(md.n) ? ' open' : ''}>
          <summary><span class="lo-mod-t">${esc(md.title)}</span>
            <span class="lo-bar lo-mod-bar"><i style="width:${Math.round(d / all.length * 100)}%"></i></span>
            <small>${d}/${all.length} ✓</small></summary>
          ${lists.map(x => unitSectionHTML(manifest, getPage, x.u, x.list, (md.units || []).length === 1)).join('')}
        </details>`;
    }).join('');
    return `<div class="lo-find"><input type="search" class="lo-find-in" placeholder="🔍 Buscar página (número ou título)…" autocomplete="off" aria-label="Buscar página" /></div>
      <div class="lo-modules">${body}</div>`;
  }
  // Open/close memory + page finder of the module list (no-op for the children's books).
  function wireModules(container, manifest) {
    const inp = container.querySelector('.lo-find-in');
    if (!inp) return;
    const open = openMods[bookKey(manifest)] || (openMods[bookKey(manifest)] = new Set());
    const mods = [...container.querySelectorAll('details.lo-module')];
    mods.forEach(d => d.addEventListener('toggle', () => {
      if (inp.value.trim()) return;       // opened/closed by the finder: don't remember
      if (d.open) open.add(Number(d.dataset.mod)); else open.delete(Number(d.dataset.mod));
    }));
    const cards = [...container.querySelectorAll('.lo-card')];
    const query = () => normQ(inp.value).trim().replace(/^p\.?\s*/, '');
    inp.addEventListener('input', () => {
      const q = query();
      cards.forEach(c => { c.hidden = Boolean(q) && !c.dataset.q.includes(q); });
      container.querySelectorAll('.lo-unit').forEach(u => { u.hidden = Boolean(q) && !u.querySelector('.lo-card:not([hidden])'); });
      mods.forEach(d => {
        const any = !q || d.querySelector('.lo-card:not([hidden])');
        d.hidden = !any;
        d.open = q ? Boolean(any) : open.has(Number(d.dataset.mod));
      });
    });
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const q = query();
      const hit = cards.find(c => !c.hidden && c.dataset.n === q) || cards.find(c => !c.hidden);
      if (hit && q) hit.click();
    });
  }

  // "Bimestre 1 · 2" tabs; the next bimester shows as "em breve".
  function bimTabsHTML(ms, cur, getPageFor) {
    if (ms.length === 1 && isSingle(cur)) return '';     // one volume: no bimesters
    const last = ms[ms.length - 1].bimester;
    const soon = last < 4 ? `<span class="lo-bim is-soon" aria-disabled="true">Bimestre ${last + 1} <small>em breve</small></span>` : '';
    return `<div class="lo-bims" role="tablist" aria-label="Bimestre">
      ${ms.map(m => {
        const pr = progressOf(m, getPageFor(m));
        return `<button type="button" role="tab" class="lo-bim${m === cur ? ' is-on' : ''}" data-bim="${m.bimester}" aria-selected="${m === cur}">Bimestre ${m.bimester} <small>${pr.done}/${pr.total} ✓</small></button>`;
      }).join('')}${soon}</div>`;
  }

  // ---- where each student stopped ----------------------------------------
  const LAST_KEY = 'igbook_last';
  function lastSeen() {
    try { const m = JSON.parse(localStorage.getItem(LAST_KEY) || '{}'); return m && typeof m === 'object' ? m : {}; } catch (e) { return {}; }
  }
  function rememberPage(sid, m, n) {
    const all = lastSeen();
    all[sid] = { book: m.book, bim: m.bimester || 1, n, t: Date.now() };
    try { localStorage.setItem(LAST_KEY, JSON.stringify(all)); } catch (e) { /* private mode */ }
  }
  function lastWork(sid, m) {
    let n = null, t = 0;
    contentPages(m).forEach(p => { const w = readLocal(sid, pid(m, p.n)); if (w && w.updatedAt > t) { t = w.updatedAt; n = p.n; } });
    return { n, t };
  }
  // The page worked on most recently (at home or in class), else the last one
  // opened, else the first lesson page.
  function resumePage(sid, m) {
    const lw = lastWork(sid, m);
    if (lw.n) return lw.n;
    const pages = contentPages(m);
    const l = lastSeen()[sid];
    if (l && l.book === m.book && (l.bim || 1) === (m.bimester || 1) && pages.some(p => p.n === l.n)) return l.n;
    if (isSingle(m)) return (pages.find(p => p.kind === 'opener') || pages[0]).n;   // lesson 1, not the contents
    return (pages.find(p => p.kind === 'page') || pages[0]).n;
  }
  // The latest bimester with work; else the one opened last; else the first.
  function resumeBimester(sid, ms) {
    let best = null, t = 0;
    ms.forEach(m => { const lw = lastWork(sid, m); if (lw.t > t) { t = lw.t; best = m; } });
    if (best) return best;
    const l = lastSeen()[sid];
    return (l && ms.find(m => m.book === l.book && m.bimester === (l.bim || 1))) || ms[0];
  }

  function closeAllViews() { while (stack.length) closeTop(); }

  // ---- the book home: the student's own (link) or the teacher's class mode --
  async function openBookHome(student, ctx) {
    ctx = ctx || {};
    const teacher = Boolean(ctx.teacher);
    const sync = teacher ? TeacherSync : StudentSync;
    const book = bookFor(student);
    if (!book) {
      if (teacher) openTeacher(student.id);
      else alert('A teacher ainda não escolheu um livro para você. 📖');
      return;
    }
    const info = bookInfo(book);
    const root = document.createElement('div');
    root.className = 'lo-root lo-home' + (teacher ? ' is-teacher' : '');
    root.innerHTML = '<div class="lo-loading"><span>📖</span><p>Abrindo o livro…</p></div>';
    let unStatus = null;
    // Homework (ctx.homework): when the book closes, say how many of the
    // homework's pages are marked done.
    let hwManifest = null;
    pushView(root, () => {
      sync.flush(); if (unStatus) unStatus();
      const hwk = ctx.homework;
      if (hwk && hwk.onClose && hwManifest) {
        const done = hwk.pages.filter(n => (readLocal(student.id, pid(hwManifest, n)) || {}).done).length;
        try { hwk.onClose({ done, total: hwk.pages.length }); } catch (e) { console.error(e); }
      } else if (hwk && hwk.onClose) {
        try { hwk.onClose({ done: 0, total: hwk.pages.length }); } catch (e) { console.error(e); }
      }
    });

    let ms;
    try { ms = await loadBook(book); } catch (e) {
      root.innerHTML = `<div class="lo-loading"><span>⚠️</span><p>Não consegui abrir o livro agora.</p>
        <small>Verifique a internet e tente de novo.</small><button type="button" class="btn btn-primary" data-a="back">← Voltar</button></div>`;
      root.querySelector('[data-a="back"]').addEventListener('click', back);
      return;
    }
    const sid = student.id;
    const getPageFor = m => p => readLocal(sid, pid(m, p.n)) || emptyPage();
    let cur = resumeBimester(sid, ms);
    const who = { name: student.name, book: cur.title || info.title };

    const openAt = (m, n, extra) => {
      const pages = contentPages(m);
      const getPage = getPageFor(m);
      const x = extra || {};
      openEditor({
        manifest: m, pages, sync, teacher, studentId: sid,
        index: Math.max(0, pages.findIndex(p => p.n === n)),
        subtitle: x.subtitle,
        load: p => getPage(p),
        save: (p, work) => { const id = pid(m, p.n); writeLocal(sid, id, work); sync.mark(id); },
        onPage: p => rememberPage(sid, m, p.n),
        // From homework the book was only a way to the page: closing the
        // page closes the book too, straight back to the homework.
        onLeave: () => setTimeout(x.leave || paint, 0),
        who: teacher ? { name: student.name, book: `${m.title || info.title}${ms.length > 1 ? ' · B' + m.bimester : ''}` } : null,
        onSwitch: teacher ? () => { closeAllViews(); openClassPicker(); } : null,
      });
    };

    const paint = () => {
      if (!root.isConnected) return;
      const getPage = getPageFor(cur);
      const pr = progressOf(cur, getPage);
      const resume = resumePage(sid, cur);
      root.innerHTML = `
        <div class="lo-home-wrap">
          <header class="lo-home-head" style="--lo-color:${esc(cur.color || '#8e6d86')}">
            <button type="button" class="lo-ico" data-a="back" aria-label="Voltar">←</button>
            <div class="lo-home-title">
              ${teacher
                ? `<h2>📖 ${esc(student.name)} <small>${esc(who.book)}</small></h2><p>Livro da aula${isSingle(cur) ? '' : ' · Bimestre ' + cur.bimester} · salvo no livro de ${esc(student.name)}</p>`
                : `<h2>📖 My book <small>Meu livro</small></h2><p>${esc(who.book)}${isSingle(cur) ? '' : ' · Bimestre ' + cur.bimester}</p>`}
            </div>
            <span class="lo-status" data-ref="status"></span>
          </header>
          ${bimTabsHTML(ms, cur, getPageFor)}
          ${teacher ? `
            <div class="lo-home-actions">
              <button type="button" class="btn btn-primary" data-a="resume">▶ Continuar na p. ${resume}</button>
              <button type="button" class="btn btn-ghost" data-a="switch">🔄 Trocar aluno</button>
              <label class="lo-home-book">📚 Livro: ${bookSelectHTML(student, 'lo-home-booksel')}</label>
            </div>` : ''}
          <div class="lo-progress">
            <div class="lo-bar"><i style="width:${pr.total ? Math.round(pr.done / pr.total * 100) : 0}%"></i></div>
            <b>${pr.done} de ${pr.total} páginas feitas ${pr.done === pr.total && pr.total ? '🏆' : ''}${pr.ixAll ? ` · ⭐ ${pr.ixOk}/${pr.ixAll} nos exercícios` : ''}</b>
          </div>
          <p class="lo-tip">${teacher
            ? `Toque numa página para fazer junto com ${esc(student.name)}. Tudo é salvo no livro de ${esc(student.name)} — e aparece no link do aluno. 🎯 = exercícios com correção automática.`
            : 'Toque numa página para fazer. ✏️ escrever e desenhar · 🖍️ pintar · 🔤 texto · ⭐ adesivos · 👆 🎯 exercícios com correção. Tudo é salvo sozinho.'}</p>
          ${cardsHTML(cur, getPage, resume)}
        </div>`;
      if (unStatus) unStatus();
      unStatus = sync.onStatus(s => paintStatus(root.querySelector('[data-ref="status"]'), s));
      root.querySelector('[data-a="back"]').addEventListener('click', back);
      const rs = root.querySelector('[data-a="resume"]');
      if (rs) rs.addEventListener('click', () => openAt(cur, resume));
      const sw = root.querySelector('[data-a="switch"]');
      if (sw) sw.addEventListener('click', () => { sync.flush(); closeAllViews(); openClassPicker(); });
      const bs = root.querySelector('select[data-book-for]');
      if (bs) bs.addEventListener('change', () => {
        sync.flush();
        setBook(student.id, bs.value || null);
        closeAllViews();
        openBookHome(student, ctx);   // reopen with the new book (or the choice panel if none)
      });
      root.querySelectorAll('[data-bim]').forEach(b => b.addEventListener('click', () => {
        const m = ms.find(x => x.bimester === Number(b.dataset.bim));
        if (m && m !== cur) { cur = m; paint(); }
      }));
      wireModules(root, cur);
      root.querySelectorAll('[data-n]').forEach(btn => btn.addEventListener('click', () => openAt(cur, Number(btn.dataset.n))));
    };
    paint();
    // Merge every bimester from the cloud, then (class mode) jump to where the
    // student stopped — the latest bimester with work.
    const opened = (async () => {
      let changed = false;
      for (const m of ms) changed = (await sync.open(sid, book, m)) || changed;
      return changed;
    })().then(changed => {
      if (changed) cur = resumeBimester(sid, ms);
      if (changed && stack.length && stack[stack.length - 1].el === root) paint();
    });
    if (ctx.homework) {
      await opened;
      const hwk = ctx.homework;
      const m = ms.find(x => x.bimester === Number(hwk.bim)) || resumeBimester(sid, ms);
      hwManifest = m;
      const pages = contentPages(m);
      const first = hwk.pages.find(n => pages.some(p => p.n === n));
      if (!root.isConnected || stack[stack.length - 1].el !== root) return;
      if (first == null) {
        alert(`Não encontrei a página ${hwk.pages.join(', ')} no seu livro. 📖`);
        paint();
        return;
      }
      openAt(m, first, {
        subtitle: `📚 Lição de casa: ${esc(hwk.label)} — faça e toque em “Terminei esta página ✓”`,
        leave: () => { if (root.isConnected && stack[stack.length - 1].el === root) back(); },
      });
      return;
    }
    if (ctx.resume) {
      await opened;
      cur = resumeBimester(sid, ms);
      if (root.isConnected && stack[stack.length - 1].el === root) openAt(cur, resumePage(sid, cur));
    }
  }

  // ---- student (the family's link) ------------------------------------------
  function openStudent(student) { return openBookHome(student, { teacher: false }); }

  // ---- teacher: "📖 Livro da aula" — pick who is in class now -------------
  function recentScore(s) {
    let t = 0;
    try {
      (typeof loadSessions === 'function' ? loadSessions(s.id) : []).forEach(x => {
        const d = Date.parse(x.date) || x.createdAt || 0;
        if (d > t) t = d;
      });
    } catch (e) { /* no class log */ }
    const l = lastSeen()[s.id];
    if (l && l.t > t) t = l.t;
    return t;
  }

  function openClassPicker() {
    const students = typeof loadStudents === 'function' ? loadStudents() : [];
    if (!students.length) { alert('Cadastre um aluno primeiro.'); return; }
    const active = typeof getActiveStudentId === 'function' ? getActiveStudentId() : null;
    const rows = students.map(s => ({ s, t: recentScore(s), book: bookFor(s) }))
      .sort((a, b) => (b.s.id === active) - (a.s.id === active) || b.t - a.t || String(a.s.name).localeCompare(String(b.s.name)));
    const fmt = t => { try { return new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); } catch (e) { return ''; } };
    const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    openModal(`
      <div class="modal-content-pad lo-pick">
        <h3 id="modalTitle">📖 Livro da aula</h3>
        <p class="lo-pick-lead">Com quem é a aula agora? O livro abre na última página que o aluno fez.</p>
        <input type="search" id="loPickSearch" class="lo-pick-search" placeholder="🔍 Buscar aluno…" autocomplete="off" />
        <div class="lo-pick-list" id="loPickList">
          ${rows.map(({ s, t, book }) => `
            <div class="lo-pick-item" data-q="${esc(norm(s.name))}">
              <button type="button" class="lo-pick-row" data-sid="${esc(s.id)}" style="--who:${esc(s.color || '#8e6d86')}">
                <span class="lo-pick-av">${esc(s.avatar || '🙂')}</span>
                <span class="lo-pick-txt"><b>${esc(s.name)}</b>
                  <small>${book ? esc(bookInfo(book).title) : 'sem livro — escolha ao lado'}${s.id === active ? ' · aula atual' : t ? ' · ' + esc(fmt(t)) : ''}</small></span>
                <span class="lo-pick-go">▶</span>
              </button>
              ${bookSelectHTML(s, 'lo-pick-book')}
            </div>`).join('')}
        </div>
      </div>`, false);

    const search = document.getElementById('loPickSearch');
    search.addEventListener('input', () => {
      const q = norm(search.value);
      document.querySelectorAll('#loPickList .lo-pick-item').forEach(r => { r.hidden = Boolean(q) && !r.dataset.q.includes(q); });
    });
    search.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const first = [...document.querySelectorAll('#loPickList .lo-pick-item')].find(r => !r.hidden);
      if (first) first.querySelector('.lo-pick-row').click();
    });
    document.querySelectorAll('#loPickList .lo-pick-row').forEach(btn => btn.addEventListener('click', () => openClass(btn.dataset.sid)));
    document.querySelectorAll('#loPickList select[data-book-for]').forEach(sel => sel.addEventListener('change', () => {
      setBook(sel.dataset.bookFor, sel.value || null);
      const st = students.find(x => x.id === sel.dataset.bookFor);
      const b = st ? bookFor(st) : null;
      const small = sel.closest('.lo-pick-item').querySelector('.lo-pick-txt small');
      if (small) small.textContent = (b ? bookInfo(b).title : 'sem livro') + ' · livro salvo ✓';
    }));
    setTimeout(() => { try { search.focus({ preventScroll: true }); } catch (e) { /* old browser */ } }, 50);
  }

  // The same "which book" choice everywhere the teacher meets a student.
  function bookSelectHTML(student, cls) {
    const raw = assignedRaw(student.id);
    const auto = bookByAge(student.age);
    return `<select class="${cls}" data-book-for="${esc(student.id)}" aria-label="Livro de ${esc(student.name)}">
      <option value="">⚙️ Pela idade${auto ? ' — ' + esc(bookInfo(auto).title) : ' — nenhum'}</option>
      ${BOOKS.map(b => `<option value="${b.id}" ${raw === b.id ? 'selected' : ''}>📘 ${esc(b.title)} (${b.ages})</option>`).join('')}
      <option value="none" ${raw === 'none' ? 'selected' : ''}>🚫 Sem livro</option>
    </select>`;
  }

  // Straight into the student's book at the page they stopped on; the student
  // also becomes the "current" student of the site (same as the cockpit).
  function openClass(studentId) {
    const student = (typeof loadStudents === 'function' ? loadStudents() : []).find(s => s.id === studentId);
    if (!student) return;
    if (typeof closeModal === 'function' && document.getElementById('modalOverlay') && !document.getElementById('modalOverlay').hidden) closeModal();
    if (typeof getActiveStudentId === 'function' && getActiveStudentId() !== studentId && typeof selectStudent === 'function') {
      try { selectStudent(studentId); } catch (e) { console.error(e); }
    }
    if (!bookFor(student)) { openTeacher(studentId); return; }
    openBookHome(student, { teacher: true, resume: true });
  }

  // ---- teacher: per-student panel (progress, book choice, every page) ------
  function openTeacher(studentId) {
    const student = (typeof loadStudents === 'function' ? loadStudents() : []).find(s => s.id === studentId);
    if (!student) { alert('Escolha um aluno primeiro.'); return; }
    openModal(`<div class="modal-content-pad"><div id="loTeacherMount"><p class="quiz-empty">Carregando o livro…</p></div></div>`, true);
    paintTeacher(document.getElementById('loTeacherMount'), student);
  }

  async function paintTeacher(mount, student, bimWanted) {
    if (!mount) return;
    const raw = assignedRaw(student.id);
    const book = bookFor(student);
    const auto = bookByAge(student.age);
    const head = `
      <div class="lo-t-head">
        <h3 id="modalTitle">📖 Livro online — ${esc(student.name)}</h3>
        <label class="lo-t-choose">Livro de ${esc(student.name)}:
          <select id="loBookSel">
            <option value="">⚙️ Automático pela idade${auto ? ' — ' + esc(bookInfo(auto).title) : ' — nenhum (' + esc(student.age || '?') + ' anos)'}</option>
            ${BOOKS.map(b => `<option value="${b.id}" ${raw === b.id ? 'selected' : ''}>${esc(b.title)} (${b.ages} anos)</option>`).join('')}
            <option value="none" ${raw === 'none' ? 'selected' : ''}>🚫 Sem livro online</option>
          </select>
        </label>
      </div>`;
    if (!book) {
      mount.innerHTML = head + '<p class="quiz-empty">Nenhum livro para este aluno. Escolha um acima — ele aparece como “📖 My book” no link do aluno e em “📖 Livro da aula”.</p>';
      wireChoose(mount, student);
      return;
    }
    mount.innerHTML = head + '<p class="quiz-empty">Carregando as páginas…</p>';
    wireChoose(mount, student);
    let ms;
    try { ms = await loadBook(book); } catch (e) {
      mount.innerHTML = head + '<p class="quiz-empty">Não consegui abrir o livro (a pasta <b>livro-online/</b> já foi enviada para o site?).</p>';
      wireChoose(mount, student); return;
    }
    // Same merge as the class mode: cloud copy into this browser's cache.
    for (const m of ms) await TeacherSync.open(student.id, book, m);
    if (!mount.isConnected) return;
    const getPageFor = m => p => readLocal(student.id, pid(m, p.n)) || emptyPage();
    const manifest = ms.find(m => m.bimester === Number(bimWanted)) || resumeBimester(student.id, ms);
    const getPage = getPageFor(manifest);
    const pr = progressOf(manifest, getPage);
    const cloudOn = typeof IGCloud !== 'undefined' && IGCloud.enabled && IGCloud.enabled();
    const mode = TeacherSync.mode;
    const note = !cloudOn
      ? 'Sem Supabase: o livro fica salvo <b>neste navegador</b> (o mesmo que o link do aluno lê aqui).'
      : mode === 'offline' ? 'Não consegui falar com a nuvem agora — mostrando o que está neste aparelho. Verifique a internet.'
        : mode === 'nosql' ? 'A tabela de atividades dos alunos não existe ainda: rode o <b>supabase-share.sql</b> e depois o <b>supabase-livro-online.sql</b> no Supabase.'
          : !pr.started ? (isSingle(manifest) ? 'Nada feito ainda neste livro.' : 'Nada feito ainda neste bimestre.') : '';
    mount.innerHTML = head + bimTabsHTML(ms, manifest, getPageFor) + `
      <div class="lo-t-summary">
        <div class="lo-t-big"><b>${pr.done}/${pr.total}</b><small>páginas feitas</small></div>
        <div class="lo-t-big"><b>${pr.started}</b><small>com trabalho</small></div>
        ${pr.ixAll ? `<div class="lo-t-big lo-t-big--ix"><b>⭐ ${pr.ixOk}/${pr.ixAll}</b><small>exercícios com correção</small></div>` : ''}
        <div class="lo-t-units">
          ${(pr.modules.length ? pr.modules : pr.units).map(u => `
            <div class="lo-t-unit"><span>${esc(u.title)}</span>
              <div class="lo-bar"><i style="width:${u.total ? Math.round(u.done / u.total * 100) : 0}%"></i></div>
              <small>${u.done}/${u.total}${u.ixAll ? ` · ⭐ ${u.ixOk}/${u.ixAll}` : ''}</small></div>`).join('')}
        </div>
      </div>
      <div class="game-btn-row lo-t-actions">
        <button type="button" class="btn btn-primary" id="loClassGo">▶ Fazer o livro com ${esc(student.name)} (p. ${resumePage(student.id, manifest)})</button>
        <label class="lo-t-ro"><input type="checkbox" id="loOnlyView" /> 👀 Abrir as páginas só para ver</label>
      </div>
      ${note ? `<p class="lo-t-note">${note}</p>` : ''}
      <p class="lo-t-hint">Toque numa página para fazer junto com ${esc(student.name)} (ou só ver, marcando a caixa acima). ⭐ = nota dos exercícios com correção automática.</p>
      <div class="lo-t-cards">${cardsHTML(manifest, getPage, resumePage(student.id, manifest))}</div>`;
    wireChoose(mount, student);
    wireModules(mount, manifest);
    mount.querySelectorAll('[data-bim]').forEach(b => b.addEventListener('click', () => paintTeacher(mount, student, Number(b.dataset.bim))));
    mount.querySelector('#loClassGo').addEventListener('click', () => openClass(student.id));
    mount.querySelectorAll('[data-n]').forEach(btn => btn.addEventListener('click', () => {
      const list = contentPages(manifest);
      const viewOnly = mount.querySelector('#loOnlyView').checked;
      openEditor({
        manifest, pages: list, readOnly: viewOnly, sync: viewOnly ? null : TeacherSync, teacher: true, studentId: student.id,
        index: list.findIndex(p => p.n === Number(btn.dataset.n)),
        load: p => getPage(p),
        save: (p, work) => { const id = pid(manifest, p.n); writeLocal(student.id, id, work); TeacherSync.mark(id); },
        onPage: p => rememberPage(student.id, manifest, p.n),
        onLeave: () => setTimeout(() => paintTeacher(mount, student, manifest.bimester), 0),
        who: viewOnly ? null : { name: student.name, book: `${manifest.title}${ms.length > 1 ? ' · B' + manifest.bimester : ''}` },
        onSwitch: viewOnly ? null : () => { closeAllViews(); if (typeof closeModal === 'function') closeModal(); openClassPicker(); },
        subtitle: viewOnly ? `👀 ${esc(student.name)} · ${esc(manifest.title)} — só leitura` : '',
      });
    }));
  }

  function wireChoose(mount, student) {
    const sel = mount.querySelector('#loBookSel');
    if (!sel) return;
    sel.addEventListener('change', () => {
      setBook(student.id, sel.value || null);
      paintTeacher(mount, student);
    });
  }

  // ---- the "📖 Livro da aula" buttons on the teacher's page ----------------
  function wireTeacherButtons() {
    if (window.IG_SHARE_MODE || window.IG_PUBLIC_GAME) return;
    ['headerBookBtn', 'bookNavBtn'].forEach(id => {
      const b = document.getElementById(id);
      if (b && !b.dataset.loWired) { b.dataset.loWired = '1'; b.addEventListener('click', openClassPicker); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireTeacherButtons);
  else wireTeacherButtons();

  return {
    resUrl, BOOKS, bookFor, bookByAge, setBook, openStudent, openTeacher, openClass, openClassPicker, loadManifest,
    // Homework: open the student's book right on the pages the teacher set.
    // hw = { pages: [8, 9], label: 'p. 8–9', bim, onClose({ done, total }) }
    openHomeworkPages: (student, hw) => openBookHome(student, { teacher: !window.IG_SHARE_MODE, homework: hw }),
    // exposed for tests / phase 2
    _pageId: pageId, _readLocal: readLocal, _normalize: normalize, _simplify: simplify,
  };
})();

window.LivroOnline = LivroOnline;
window.LO_INTERACTIVE = LO_INTERACTIVE;
