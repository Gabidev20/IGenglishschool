/* ==========================================================================
   IGenglishschool — LIVRO ONLINE ("📖 Meu livro")
   --------------------------------------------------------------------------
   The student does the IG textbook on the site, on the real book pages: write,
   draw, color, circle, type and stick the bimester's stickers. Each student's
   work is saved under their own name, page by page.

   WHERE THINGS LIVE
     livro-online/books.json                   the books the site offers
     livro-online/<book>/b1/manifest.json      pages, units, audio, stickers
     livro-online/<book>/b1/p01.webp …         page images (t01.webp: thumbnails)
     (all made by livros/_geradores/build_livro_online.py)

   ONE PAGE OF WORK  (kind 'book', id '<book>:b1:p<NN>')
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

   PHASE 2 (not built yet)
     manifest.pages[i].interactive is reserved for an auto-checked exercise
     on that page. A renderer registered in LO_INTERACTIVE[type] will get
     mount(stageEl, page, work) and may keep its answers in work.answers.
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
  ];
  const COLORS = [
    ['#2e2b2e', 'preto'], ['#e5403f', 'vermelho'], ['#f39237', 'laranja'], ['#f6cf3a', 'amarelo'],
    ['#5cad5a', 'verde'], ['#3d8bd9', 'azul'], ['#9461c0', 'roxo'], ['#f05d77', 'rosa'],
    ['#f7a8c4', 'rosa-claro'], ['#8b5a2b', 'marrom'], ['#7fd3e6', 'azul-claro'], ['#9aa0a6', 'cinza'],
  ];
  const SIZES = { pen: [28, 55, 110], hl: [160, 330, 650], text: [300, 440, 640] };
  const TOOLS = [
    { id: 'hand', icon: '✋', label: 'Mover' },
    { id: 'pen', icon: '✏️', label: 'Lápis' },
    { id: 'hl', icon: '🖍️', label: 'Pintar' },
    { id: 'eraser', icon: '🧽', label: 'Apagar' },
    { id: 'text', icon: '🔤', label: 'Texto' },
    { id: 'sticker', icon: '⭐', label: 'Adesivos' },
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
  const manifestCache = {};
  function loadManifest(book) {
    if (!manifestCache[book]) {
      const get = base => fetch(`${base}${book}/b1/manifest.json`, { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); });
      manifestCache[book] = get(BASE)
        .catch(e => {
          const other = BASE ? '' : 'livro-online/';
          return get(other).then(j => { BASE = other; return j; }, () => { throw e; });
        })
        .catch(e => { delete manifestCache[book]; throw e; });
    }
    return manifestCache[book];
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
    const b = BOOKS.find(x => a >= x.min && a <= x.max);
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
  const pageId = (book, n) => `${book}:b1:p${String(n).padStart(2, '0')}`;
  const lsKey = (sid, id) => `igbook:${sid}:${id}`;
  const emptyPage = () => ({ v: 1, strokes: [], texts: [], stickers: [], done: false, updatedAt: 0 });
  function normalize(p) {
    if (!p || typeof p !== 'object') return emptyPage();
    return {
      v: 1,
      strokes: Array.isArray(p.strokes) ? p.strokes.filter(s => s && Array.isArray(s.p) && s.p.length >= 2) : [],
      texts: Array.isArray(p.texts) ? p.texts.filter(t => t && typeof t.v === 'string') : [],
      stickers: Array.isArray(p.stickers) ? p.stickers.filter(s => s && s.s) : [],
      done: Boolean(p.done),
      updatedAt: typeof p.updatedAt === 'string' ? (Date.parse(p.updatedAt) || 0) : num(p.updatedAt, 0),
      ...(p.answers ? { answers: p.answers } : {}),
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
    let lastStatus = 'idle';
    const dirty = new Set();
    const listeners = new Set();

    function status(s) { lastStatus = s; listeners.forEach(fn => { try { fn(s); } catch (e) { /* view gone */ } }); }
    function settled() { return mode === 'cloud' ? 'saved' : mode === 'offline' ? 'offline' : 'local'; }

    async function open(studentId, bookId, manifest) {
      // Switching student: whatever is still waiting goes up first, under the
      // student it belongs to.
      if (dirty.size) await flush();
      sid = studentId; book = bookId; dirty.clear();
      if (!adapter.possible()) { mode = 'local'; status('local'); return false; }
      try {
        const rows = await adapter.readAll(sid, `${bookId}:b1`);
        if (!rows) { mode = 'local'; status('local'); return false; }
        const remote = {};
        rows.forEach(row => { if (row && row.id) remote[row.id] = normalize(row.payload); });
        let changed = false;
        manifest.pages.forEach(pg => {
          const id = pageId(bookId, pg.n);
          const r = remote[id], l = readLocal(sid, id);
          if (r && (!l || r.updatedAt > l.updatedAt)) { writeLocal(sid, id, r); changed = true; }
          else if (l && (!r || l.updatedAt > r.updatedAt) && (hasWork(l) || l.done || r)) dirty.add(id);
        });
        mode = 'cloud';
        if (dirty.size) flush(); else status('saved');
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
        const row = await adapter.readOne(who, `${book}:b1`, id);
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
      loadManifest(book).then(m => open(sid, book, m)).catch(() => {});
    });
    const leave = () => { if (dirty.size) flush(); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave(); });
    window.addEventListener('pagehide', leave);

    return {
      open, mark, flush, refresh,
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

  function stickerBox(st, meta) {
    const k = clamp(num(st.k, 1), 0.4, 2.5);
    const w = (meta ? meta.w : 0.1) * W * k, h = (meta ? meta.h : 0.07) * H * k;
    return { x: num(st.x, 0) - w / 2, y: num(st.y, 0) - h / 2, w, h };
  }
  function stickerSVG(st, meta, book) {
    if (!meta) return '';
    const b = stickerBox(st, meta);
    return `<image class="lo-stk" href="${esc(BASE + book + '/b1/' + meta.img)}" x="${Math.round(b.x)}" y="${Math.round(b.y)}" width="${Math.round(b.w)}" height="${Math.round(b.h)}" preserveAspectRatio="none"/>`;
  }

  // Two layers: the ink multiplies onto the printed page (colouring keeps the
  // black outlines black); stickers and text sit on top as they would on paper.
  function overlayHTML(page, manifest) {
    if (!page || !hasWork(page)) return '';
    const sm = stickerMap(manifest);
    return `<svg class="lo-ink" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${page.strokes.map(strokeSVG).join('')}</svg>
      <svg class="lo-over" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${
      page.stickers.map(s => stickerSVG(s, sm[s.s], manifest.book)).join('')}${page.texts.map(textSVG).join('')}</svg>`;
  }
  const smCache = new WeakMap();
  function stickerMap(m) {
    if (!smCache.has(m)) { const o = {}; (m.stickers || []).forEach(s => { o[s.id] = s; }); smCache.set(m, o); }
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
    const sm = stickerMap(m);
    const ro = Boolean(o.readOnly);
    const pf = prefs();
    let idx = clamp(o.index || 0, 0, o.pages.length - 1);
    let pg = o.pages[idx];
    let data = emptyPage();
    let tool = ro ? 'hand' : (TOOLS.some(t => t.id === pf.tool) ? pf.tool : 'pen');
    let color = col(pf.color || '#2e2b2e');
    const size = { pen: clamp(pf.pen | 0, 0, 2) || 1, hl: clamp(pf.hl | 0, 0, 2) || 1, text: clamp(pf.text | 0, 0, 2) || 1 };
    let hist = [], redoStack = [];
    let selected = null;            // sticker instance id
    let penSeen = false;
    let z = 1, tx = 0, ty = 0, bw = 300, bh = 424;
    // SLIDES MODE (computers / landscape): the page is a slide inside a 16:9
    // frame; "Meia página" shows each page as two slides (top / bottom half).
    // Coordinates never change — only the part of the page on screen does.
    let slides = false;
    let view = pf.view === 'half' ? 'half' : 'full';
    let part = 'full';                       // 'full' | 'top' | 'bottom'
    let frame = { x: 0, y: 0, w: 300, h: 424, pad: 6 };
    const audio = new Audio();
    let audioBtn = null;

    const root = document.createElement('div');
    root.className = 'lo-root lo-ed' + (ro ? ' is-readonly' : '');
    root.innerHTML = `
      <div class="lo-top">
        <button class="lo-ico" data-a="back" type="button" aria-label="Voltar" title="Voltar">←</button>
        <div class="lo-top-title"><b data-ref="pnum"></b><span data-ref="ptitle"></span></div>
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
          <button type="button" class="lo-chip" data-a="present" title="Apresentar: esconde os botões da professora para compartilhar a tela">🖥️<span class="lo-chip-l"> Apresentar</span></button>
        </div>` : ''}
      <div class="lo-audio" data-ref="audio" hidden></div>
      <div class="lo-stage" data-ref="stage">
        <div class="lo-slidebox" data-ref="slidebox" aria-hidden="true"></div>
        <div class="lo-page" data-ref="page">
          <img data-ref="img" alt="" draggable="false" />
          <svg class="lo-ink" data-ref="ink" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><g data-ref="strokes"></g><path data-ref="live" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <svg class="lo-over" data-ref="over" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"></svg>
        </div>
        <div class="lo-zoom">
          <button type="button" data-a="zin" aria-label="Aumentar">＋</button>
          <button type="button" data-a="zout" aria-label="Diminuir">－</button>
          <button type="button" data-a="fit" aria-label="Página inteira" title="Página inteira">⤢</button>
          ${o.who ? '<button type="button" class="lo-present-exit" data-a="present" aria-label="Sair da apresentação" title="Sair da apresentação">🖥️</button>' : ''}
        </div>
        <div class="lo-toast" data-ref="toast" hidden></div>
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

    const $ = name => root.querySelector(`[data-ref="${name}"]`);
    const stage = $('stage'), pageEl = $('page'), img = $('img');
    const strokesG = $('strokes'), live = $('live'), over = $('over');
    let unStatus = null;

    pushView(root, () => {
      leavePage();
      audio.pause();
      window.removeEventListener('keydown', onKey);
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
    const band = () => (part === 'top' ? [0, 0.5] : part === 'bottom' ? [0.5, 1] : [0, 1]);
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
      pageEl.style.clipPath = part === 'top' ? 'inset(0 0 50% 0)' : part === 'bottom' ? 'inset(50% 0 0 0)' : '';
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
          <img src="${esc(BASE + book + '/b1/' + p.thumb)}" alt="" loading="lazy" draggable="false" /><small>${p.n}</small></button>`;
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
      let html = data.stickers.map(s => stickerSVG(s, sm[s.s], book)).join('') + data.texts.map(textSVG).join('');
      const st = selected && data.stickers.find(s => s.id === selected);
      if (st && sm[st.s] && tool === 'sticker') {
        const b = stickerBox(st, sm[st.s]);
        const r = 13 / pxPerUnit();
        html += `<rect class="lo-sel" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" vector-effect="non-scaling-stroke"/>
          <g class="lo-handle lo-handle--del"><circle cx="${b.x + b.w}" cy="${b.y}" r="${r}"/><text x="${b.x + b.w}" y="${b.y + r * 0.42}" font-size="${r * 1.2}">✕</text></g>
          <g class="lo-handle lo-handle--res"><circle cx="${b.x + b.w}" cy="${b.y + b.h}" r="${r}"/><text x="${b.x + b.w}" y="${b.y + b.h + r * 0.42}" font-size="${r * 1.1}">⤡</text></g>`;
      }
      over.innerHTML = html;
    }
    function render() { renderInk(); renderOver(); paintChrome(); }

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

    // ---- pages ----------------------------------------------------------------
    function leavePage() {
      closeSheet();
      if (!ro && o.sync) o.sync.flush();
    }
    function goto(i, wantPart) {
      if (i < 0 || i >= o.pages.length) return;
      leavePage();
      audio.pause();
      idx = i; pg = o.pages[idx];
      part = halfView() ? (wantPart === 'bottom' ? 'bottom' : 'top') : 'full';
      data = normalize(o.load(pg));
      hist = []; redoStack = []; selected = null;
      img.src = `${BASE}${book}/b1/${pg.img}`;
      img.alt = `Página ${pg.n}: ${pg.title || ''}`;
      const nxt = o.pages[idx + 1];
      if (nxt) { const pre = new Image(); pre.src = `${BASE}${book}/b1/${nxt.img}`; }
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
        o.sync.refresh(pageId(book, opened.n)).then(fresh => {
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

    // ---- audio ------------------------------------------------------------------
    function paintAudio() {
      const box = $('audio');
      const list = (pg.audio || []);
      if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }
      loadTracks(book).then(tracks => {
        if (o.pages[idx] !== pg) return;
        const items = list.map(a => {
          const t = tracks[a.track];
          const file = (t && t.file) || a.file;
          return (t || a.available) && file ? { file, title: (t && t.title ? t.title.split(/\. |\? /)[0] : a.title) || 'Audio' } : null;
        }).filter(Boolean);
        box.hidden = !items.length;
        box.innerHTML = items.map((a, i) => `<button type="button" class="lo-audio-btn" data-au="${i}">🎧 <span>Ouvir</span> <small>${esc(a.title)}</small></button>`).join('');
        box.querySelectorAll('[data-au]').forEach(btn => btn.addEventListener('click', () => {
          const a = items[Number(btn.dataset.au)];
          const src = `audios/${book}/${a.file}`;
          if (audioBtn === btn && !audio.paused) { audio.pause(); return; }
          if (!audio.src.endsWith(encodeURI(src))) audio.src = src;
          audioBtn = btn;
          audio.play().catch(() => toast('Não consegui tocar o áudio agora.'));
        }));
      });
    }
    const paintAudioState = () => {
      root.querySelectorAll('.lo-audio-btn').forEach(b => {
        const playing = b === audioBtn && !audio.paused;
        b.classList.toggle('is-playing', playing);
        const span = b.querySelector('span'); if (span) span.textContent = playing ? 'Pausar' : 'Ouvir';
      });
    };
    audio.addEventListener('play', paintAudioState);
    audio.addEventListener('pause', paintAudioState);
    audio.addEventListener('ended', paintAudioState);

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
      } else if (tool === 'hand') {
        opts.innerHTML = '<span class="lo-hint">✋ Arraste para mover a página. Dois dedos (ou a rodinha do mouse) para zoom.</span>';
      } else if (tool === 'sticker') {
        const here = m.stickers.filter(s => (s.pages || []).includes(pg.n));
        const rest = m.stickers.filter(s => !(s.pages || []).includes(pg.n));
        opts.innerHTML = `<div class="lo-tray" data-ref="tray">${here.concat(rest).map(s => `
          <button type="button" class="lo-tray-item${here.includes(s) ? ' is-here' : ''}" data-stk="${esc(s.id)}" title="${s.label ? 'Vai na ' + esc(s.label) : 'Adesivo livre'}">
            <img src="${esc(BASE + book + '/b1/' + s.img)}" alt="" draggable="false" /><small>${here.includes(s) ? 'aqui!' : esc(s.label || 'livre')}</small>
          </button>`).join('')}</div>`;
        wireTray(opts.querySelector('[data-ref="tray"]'));
      }
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
        if (!sm[s.s]) continue;
        const b = stickerBox(s, sm[s.s]);
        if (u.x >= b.x && u.x <= b.x + b.w && u.y >= b.y && u.y <= b.y + b.h) return s;
      }
      return null;
    }
    function hitHandle(u, which) {
      const st = selected && data.stickers.find(s => s.id === selected);
      if (!st || !sm[st.s]) return false;
      const b = stickerBox(st, sm[st.s]);
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
        if (s && editing) { editing.t.s = Number(s.dataset.tss); renderOver(); $('sheet').querySelectorAll('[data-tss]').forEach(x => x.classList.toggle('is-on', x === s)); }
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
      const pan = ro || tool === 'hand' || e.button === 1 || offBand || (penSeen && e.pointerType === 'touch' && drawTool());
      if (!pan && tool === 'sticker') {
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
      if (pan || tool === 'sticker') { act = { type: 'pan', sx: e.clientX, sy: e.clientY, tx0: tx, ty0: ty }; return; }
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
        act.st.k = Math.round(clamp(act.k0 * Math.hypot(u.x - act.st.x, u.y - act.st.y) / act.d0, 0.5, 2) * 100) / 100;
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
            const p = snapTo(sm[a.st.s], a.st.x, a.st.y, false);
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

    stage.addEventListener('pointerdown', e => {
      if (e.target.closest('.lo-zoom, .lo-textsheet, .lo-toast')) return;
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
      const t = e.target.closest('[data-tool]');
      if (t) {
        closeSheet();
        // Slides: colours/sizes live in a popover — tapping the active tool
        // again shows/hides it.
        const withOpts = ['pen', 'hl', 'text', 'sticker'].includes(t.dataset.tool);
        if (slides) root.classList.toggle('opts-open', withOpts && (t.dataset.tool !== tool || !root.classList.contains('opts-open')));
        tool = t.dataset.tool;
        if (tool !== 'sticker') selected = null;
        savePrefs({ ...prefs(), tool });
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
  function progressOf(manifest, getPage) {
    const pages = contentPages(manifest);
    const done = pages.filter(p => getPage(p).done).length;
    const started = pages.filter(p => hasWork(getPage(p))).length;
    const units = manifest.units.map(u => {
      const list = pages.filter(p => p.unit === u.n);
      return { ...u, total: list.length, done: list.filter(p => getPage(p).done).length };
    }).filter(u => u.total);
    return { total: pages.length, done, started, units };
  }

  function cardsHTML(manifest, getPage) {
    const pages = contentPages(manifest);
    return manifest.units.map(u => {
      const list = pages.filter(p => p.unit === u.n);
      if (!list.length) return '';
      const d = list.filter(p => getPage(p).done).length;
      return `
        <section class="lo-unit">
          <h3>${esc(u.title)} <small>${d}/${list.length} ✓</small></h3>
          <div class="lo-grid">
            ${list.map(p => {
              const w = getPage(p);
              return `
                <button type="button" class="lo-card${w.done ? ' is-done' : ''}" data-n="${p.n}">
                  <span class="lo-thumb">
                    <img src="${esc(BASE + manifest.book + '/b1/' + p.thumb)}" alt="" loading="lazy" draggable="false" />
                    ${overlayHTML(w, manifest)}
                    ${w.done ? '<span class="lo-check" aria-label="feita">✓</span>' : hasWork(w) ? '<span class="lo-dot" aria-label="começada">✏️</span>' : ''}
                    ${(p.audio || []).length ? '<span class="lo-has-audio" aria-label="tem áudio">🎧</span>' : ''}
                  </span>
                  <span class="lo-card-n">p. ${p.n}</span>
                  <span class="lo-card-t">${esc(p.title || '')}</span>
                </button>`;
            }).join('')}
          </div>
        </section>`;
    }).join('');
  }

  // ---- where each student stopped ----------------------------------------
  const LAST_KEY = 'igbook_last';
  function lastSeen() {
    try { const m = JSON.parse(localStorage.getItem(LAST_KEY) || '{}'); return m && typeof m === 'object' ? m : {}; } catch (e) { return {}; }
  }
  function rememberPage(sid, book, n) {
    const m = lastSeen();
    m[sid] = { book, n, t: Date.now() };
    try { localStorage.setItem(LAST_KEY, JSON.stringify(m)); } catch (e) { /* private mode */ }
  }
  // The page worked on most recently (at home or in class), else the last one
  // opened, else the first lesson page.
  function resumePage(sid, book, manifest) {
    const pages = contentPages(manifest);
    let best = null, t = 0;
    pages.forEach(p => { const w = readLocal(sid, pageId(book, p.n)); if (w && w.updatedAt > t) { t = w.updatedAt; best = p.n; } });
    if (best) return best;
    const l = lastSeen()[sid];
    if (l && l.book === book && pages.some(p => p.n === l.n)) return l.n;
    return (pages.find(p => p.kind === 'page') || pages[0]).n;
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
    pushView(root, () => { sync.flush(); if (unStatus) unStatus(); });

    let manifest;
    try { manifest = await loadManifest(book); } catch (e) {
      root.innerHTML = `<div class="lo-loading"><span>⚠️</span><p>Não consegui abrir o livro agora.</p>
        <small>Verifique a internet e tente de novo.</small><button type="button" class="btn btn-primary" data-a="back">← Voltar</button></div>`;
      root.querySelector('[data-a="back"]').addEventListener('click', back);
      return;
    }
    const sid = student.id;
    const getPage = p => readLocal(sid, pageId(book, p.n)) || emptyPage();
    const who = { name: student.name, book: manifest.title || info.title };

    const openAt = n => {
      const pages = contentPages(manifest);
      openEditor({
        manifest, pages, sync,
        index: Math.max(0, pages.findIndex(p => p.n === n)),
        load: p => getPage(p),
        save: (p, work) => { const id = pageId(book, p.n); writeLocal(sid, id, work); sync.mark(id); },
        onPage: p => rememberPage(sid, book, p.n),
        onLeave: () => setTimeout(paint, 0),
        who: teacher ? who : null,
        onSwitch: teacher ? () => { closeAllViews(); openClassPicker(); } : null,
      });
    };

    const paint = () => {
      if (!root.isConnected) return;
      const pr = progressOf(manifest, getPage);
      const resume = resumePage(sid, book, manifest);
      root.innerHTML = `
        <div class="lo-home-wrap">
          <header class="lo-home-head" style="--lo-color:${esc(manifest.color || '#8e6d86')}">
            <button type="button" class="lo-ico" data-a="back" aria-label="Voltar">←</button>
            <div class="lo-home-title">
              ${teacher
                ? `<h2>📖 ${esc(student.name)} <small>${esc(who.book)}</small></h2><p>Livro da aula · Bimestre 1 · salvo no livro de ${esc(student.name)}</p>`
                : `<h2>📖 My book <small>Meu livro</small></h2><p>${esc(who.book)} · Bimestre 1</p>`}
            </div>
            <span class="lo-status" data-ref="status"></span>
          </header>
          ${teacher ? `
            <div class="lo-home-actions">
              <button type="button" class="btn btn-primary" data-a="resume">▶ Continuar na p. ${resume}</button>
              <button type="button" class="btn btn-ghost" data-a="switch">🔄 Trocar aluno</button>
              <label class="lo-home-book">📚 Livro: ${bookSelectHTML(student, 'lo-home-booksel')}</label>
            </div>` : ''}
          <div class="lo-progress">
            <div class="lo-bar"><i style="width:${pr.total ? Math.round(pr.done / pr.total * 100) : 0}%"></i></div>
            <b>${pr.done} de ${pr.total} páginas feitas ${pr.done === pr.total && pr.total ? '🏆' : ''}</b>
          </div>
          <p class="lo-tip">${teacher
            ? `Toque numa página para fazer junto com ${esc(student.name)}. Tudo é salvo no livro de ${esc(student.name)} — e aparece no link do aluno.`
            : 'Toque numa página para fazer. ✏️ escrever e desenhar · 🖍️ pintar · 🔤 texto · ⭐ adesivos. Tudo é salvo sozinho.'}</p>
          ${cardsHTML(manifest, getPage)}
        </div>`;
      if (unStatus) unStatus();
      unStatus = sync.onStatus(s => paintStatus(root.querySelector('[data-ref="status"]'), s));
      root.querySelector('[data-a="back"]').addEventListener('click', back);
      const rs = root.querySelector('[data-a="resume"]');
      if (rs) rs.addEventListener('click', () => openAt(resume));
      const sw = root.querySelector('[data-a="switch"]');
      if (sw) sw.addEventListener('click', () => { sync.flush(); closeAllViews(); openClassPicker(); });
      const bs = root.querySelector('select[data-book-for]');
      if (bs) bs.addEventListener('change', () => {
        sync.flush();
        setBook(student.id, bs.value || null);
        closeAllViews();
        openBookHome(student, ctx);   // reopen with the new book (or the choice panel if none)
      });
      root.querySelectorAll('[data-n]').forEach(btn => btn.addEventListener('click', () => openAt(Number(btn.dataset.n))));
    };
    paint();
    const opened = sync.open(sid, book, manifest).then(changed => {
      if (changed && stack.length && stack[stack.length - 1].el === root) paint();
    });
    if (ctx.resume) {
      await opened;
      if (root.isConnected && stack[stack.length - 1].el === root) openAt(resumePage(sid, book, manifest));
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

  async function paintTeacher(mount, student) {
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
    let manifest;
    try { manifest = await loadManifest(book); } catch (e) {
      mount.innerHTML = head + '<p class="quiz-empty">Não consegui abrir o livro (a pasta <b>livro-online/</b> já foi enviada para o site?).</p>';
      wireChoose(mount, student); return;
    }
    // Same merge as the class mode: cloud copy into this browser's cache.
    await TeacherSync.open(student.id, book, manifest);
    if (!mount.isConnected) return;
    const getPage = p => readLocal(student.id, pageId(book, p.n)) || emptyPage();
    const pr = progressOf(manifest, getPage);
    const cloudOn = typeof IGCloud !== 'undefined' && IGCloud.enabled && IGCloud.enabled();
    const mode = TeacherSync.mode;
    const note = !cloudOn
      ? 'Sem Supabase: o livro fica salvo <b>neste navegador</b> (o mesmo que o link do aluno lê aqui).'
      : mode === 'offline' ? 'Não consegui falar com a nuvem agora — mostrando o que está neste aparelho. Verifique a internet.'
        : mode === 'nosql' ? 'A tabela de atividades dos alunos não existe ainda: rode o <b>supabase-share.sql</b> e depois o <b>supabase-livro-online.sql</b> no Supabase.'
          : !pr.started ? 'Nada feito ainda. Para o aluno salvar pelo link dele, o <b>supabase-livro-online.sql</b> precisa ter sido rodado no Supabase.' : '';
    mount.innerHTML = head + `
      <div class="lo-t-summary">
        <div class="lo-t-big"><b>${pr.done}/${pr.total}</b><small>páginas feitas</small></div>
        <div class="lo-t-big"><b>${pr.started}</b><small>com trabalho</small></div>
        <div class="lo-t-units">
          ${pr.units.map(u => `
            <div class="lo-t-unit"><span>${esc(u.title)}</span>
              <div class="lo-bar"><i style="width:${u.total ? Math.round(u.done / u.total * 100) : 0}%"></i></div>
              <small>${u.done}/${u.total}</small></div>`).join('')}
        </div>
      </div>
      <div class="game-btn-row lo-t-actions">
        <button type="button" class="btn btn-primary" id="loClassGo">▶ Fazer o livro com ${esc(student.name)} (p. ${resumePage(student.id, book, manifest)})</button>
        <label class="lo-t-ro"><input type="checkbox" id="loOnlyView" /> 👀 Abrir as páginas só para ver</label>
      </div>
      ${note ? `<p class="lo-t-note">${note}</p>` : ''}
      <p class="lo-t-hint">Toque numa página para fazer junto com ${esc(student.name)} (ou só ver, marcando a caixa acima).</p>
      <div class="lo-t-cards">${cardsHTML(manifest, getPage)}</div>`;
    wireChoose(mount, student);
    mount.querySelector('#loClassGo').addEventListener('click', () => openClass(student.id));
    mount.querySelectorAll('[data-n]').forEach(btn => btn.addEventListener('click', () => {
      const list = contentPages(manifest);
      const viewOnly = mount.querySelector('#loOnlyView').checked;
      openEditor({
        manifest, pages: list, readOnly: viewOnly, sync: viewOnly ? null : TeacherSync,
        index: list.findIndex(p => p.n === Number(btn.dataset.n)),
        load: p => getPage(p),
        save: (p, work) => { const id = pageId(book, p.n); writeLocal(student.id, id, work); TeacherSync.mark(id); },
        onPage: p => rememberPage(student.id, book, p.n),
        onLeave: () => setTimeout(() => paintTeacher(mount, student), 0),
        who: viewOnly ? null : { name: student.name, book: manifest.title },
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
    BOOKS, bookFor, bookByAge, setBook, openStudent, openTeacher, openClass, openClassPicker, loadManifest,
    // exposed for tests / phase 2
    _pageId: pageId, _readLocal: readLocal, _normalize: normalize, _simplify: simplify,
  };
})();

window.LivroOnline = LivroOnline;
window.LO_INTERACTIVE = LO_INTERACTIVE;
