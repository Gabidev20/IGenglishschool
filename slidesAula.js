/* ==========================================================================
   IGenglishschool — SLIDES DA AULA ("🖼️ Slides da aula" / "📝 Slides da aula")
   --------------------------------------------------------------------------
   A small Canva / Google-Slides-like tool INSIDE the site. The teacher opens
   a student's decks, edits slides (text, pasted images, shapes, emojis, pen),
   and presents them on Zoom's screen-share. The student can open the same
   decks, READ-ONLY, from their personal link — if the teacher turned the
   section on for that student ("Mostrar Slides da aula no link do aluno").

   DATA MODEL  (kind 'slides' in igenglish_student_activity, one row each)
     deck meta   id 'deck:<deckId>:meta'
       { v:1, title, slideIds:[…ordered], bg:{color|grad|img}, createdAt,
         updatedAt, deleted? }
     one slide   id 'deck:<deckId>:s:<slideId>'
       { v:1, bg: null | {color|grad:[c1,c2,deg]|img,fit}, objects:[…], updatedAt }
     Objects live in a 1280 x 720 space; array order = z-order.
       common  { id, type, x, y, w, h, r (deg), lock }
       text    { text, ff, fs, c, b, i, u, al, lh }      (emoji = a text object)
       image   { src: dataURL (<= 1600 px, ~250 KB) | book-page URL, op }
       shape   { shape: rect|rrect|ellipse|triangle|star|heart|arrow|line,
                 fill, stroke, sw, op }
       draw    { t: 'pen'|'hl', c, sw, p:[x,y,…] relative to the box, vw, vh }

   SAVING (teacher) — same pattern as the online book (livroOnline.js)
     1. every change goes to localStorage at once ('igslides:<studentId>:<recId>');
     2. ~1.5 s later the changed rows go to Supabase with HER login straight
        into igenglish_student_activity (RLS teacher_id = auth.uid()), after
        a pending-queue kept in localStorage (so a closed tab loses nothing);
     3. opening a student merges the cloud copy: per record, newest updatedAt
        wins. A deleted slide is simply no longer in the deck meta and its row
        is deleted; a deleted deck keeps a tiny meta with deleted:true (so no
        other device brings it back) and its slide rows are deleted.
     cloud.js never merges/deletes kind 'slides' (it only skips them).
   STUDENT: reads only through igenglish_slides_read(code) (SQL: supabase-
     slides-aula.sql) and NEVER writes (igenglish_share_write ignores 'slides').
     Without Supabase everything stays on this device.
   ========================================================================== */

const SlidesAula = (() => {
  'use strict';

  const W = 1280;
  const H = 720;
  const MAX_SLIDES = 80;            // per deck
  const MAX_DECKS = 60;             // per student
  const MAX_OBJECTS = 150;          // per slide
  const SLIDE_WARN = 600000;        // chars of JSON: warn above this
  const SLIDE_MAX = 900000;         // chars of JSON: the database refuses above ~1 MB
  const IMG_MAX_SIDE = 1600;
  const IMG_TARGET = 250 * 1024;    // bytes per image (aim)

  const esc = s => (typeof igEscapeHtml === 'function' ? igEscapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10;
  const col = (c, d) => (/^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? String(c) : (d || '#2e2b2e'));
  const nowMs = () => Date.now();
  const rid = () => {
    let s = '';
    const a = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  };
  const SAFE_ID = /^[a-z0-9]{1,24}$/;
  const isShare = () => Boolean(window.IG_SHARE_MODE);

  // Only these image sources are ever rendered: our own compressed images and
  // the book's page images (relative paths). Never another site.
  const IMG_OK = /^(data:image\/(?:webp|jpeg|png|gif);base64,[A-Za-z0-9+/=]+|[A-Za-z0-9_\-./%]{1,200}\.(?:webp|png|jpe?g|gif))$/i;
  const safeSrc = u => {
    const s = String(u || '');
    return IMG_OK.test(s) && !s.startsWith('//') && !s.includes('..') ? s : '';
  };

  // -------------------------------------------------------------------------
  // PALETTES
  // -------------------------------------------------------------------------
  const FONTS = [
    { id: 'baloo', name: 'Baloo 2', css: "'Baloo 2', 'Comic Sans MS', system-ui, sans-serif" },
    { id: 'lexend', name: 'Lexend', css: "'Lexend', system-ui, sans-serif" },
    { id: 'andika', name: 'Andika', css: "'Andika', 'Comic Sans MS', system-ui, sans-serif" },
    { id: 'caveat', name: 'Caveat', css: "'Caveat', 'Segoe Script', cursive" },
    { id: 'inter', name: 'Inter', css: "'Inter', system-ui, sans-serif" },
    { id: 'serif', name: 'Serif', css: "Georgia, 'Times New Roman', serif" },
  ];
  const fontCss = id => (FONTS.find(f => f.id === id) || FONTS[0]).css;
  const SCHOOL = ['#8e6d86', '#a9b4a4', '#faefc2', '#f05d77', '#2e2b2e', '#ffffff', '#000000'];
  const BRIGHT = ['#e5403f', '#f39237', '#f6cf3a', '#5cad5a', '#3d8bd9', '#9461c0'];
  const PASTEL = ['#ffd6e0', '#ffe0c2', '#fff3b0', '#d3f3e1', '#d6e4ff', '#e5d4ff'];
  const GRADS = [
    ['#faefc2', '#f7a8c4', 135], ['#8e6d86', '#f05d77', 135], ['#a9b4a4', '#faefc2', 160],
    ['#3d8bd9', '#7fd3e6', 135], ['#2e2b2e', '#8e6d86', 160], ['#f6cf3a', '#f39237', 135],
  ];
  const SHAPES = [
    { id: 'rect', name: 'Retângulo' }, { id: 'rrect', name: 'Retângulo arredondado' },
    { id: 'ellipse', name: 'Círculo / elipse' }, { id: 'triangle', name: 'Triângulo' },
    { id: 'star', name: 'Estrela' }, { id: 'heart', name: 'Coração' },
    { id: 'arrow', name: 'Seta' }, { id: 'line', name: 'Linha' },
  ];
  const EMOJIS = ['😀', '😍', '🤩', '😎', '🤔', '😂', '👍', '👏', '🙌', '💪', '❤️', '⭐', '🌟', '✅', '❌', '❓',
    '🐶', '🐱', '🐰', '🦁', '🐘', '🐵', '🐸', '🐟', '🦋', '🐢', '🍎', '🍌', '🍕', '🍔', '🍦', '🥛',
    '🏫', '📚', '✏️', '🎒', '📝', '🎨', '🎵', '⚽', '🚗', '🏠', '☀️', '🌈', '🌧️', '🌳', '🌸', '🎂',
    '🇧🇷', '🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇪🇸', '🇫🇷', '🇮🇹', '🇩🇪', '🇯🇵', '🇨🇳', '🇲🇽'];

  const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&family=Andika:wght@400;700&family=Caveat:wght@500;700&display=swap';
  let fontsAsked = false;
  function ensureFonts() {
    if (fontsAsked) return;
    fontsAsked = true;
    try {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = FONT_LINK;
      document.head.appendChild(l);
    } catch (e) { /* offline: system fonts */ }
  }

  // -------------------------------------------------------------------------
  // NORMALIZING (anything that comes from storage or the cloud goes through here)
  // -------------------------------------------------------------------------
  function normBg(b) {
    if (!b || typeof b !== 'object') return null;
    const o = {};
    if (b.color) o.color = col(b.color, '#ffffff');
    if (Array.isArray(b.grad) && b.grad.length >= 2) o.grad = [col(b.grad[0], '#ffffff'), col(b.grad[1], '#ffffff'), clamp(num(b.grad[2], 135), 0, 360)];
    const s = safeSrc(b.img);
    if (s) { o.img = s; o.fit = b.fit === 'cover' ? 'cover' : 'contain'; }
    return Object.keys(o).length ? o : null;
  }

  function normObj(o) {
    if (!o || typeof o !== 'object' || !SAFE_ID.test(String(o.id || ''))) return null;
    const b = {
      id: String(o.id), type: o.type,
      x: num(o.x, 0), y: num(o.y, 0),
      w: clamp(num(o.w, 100), 4, 5000), h: clamp(num(o.h, 100), 4, 5000),
      r: num(o.r, 0), lock: Boolean(o.lock),
    };
    if (o.op != null && num(o.op, 1) < 1) b.op = clamp(num(o.op, 1), 0.05, 1);
    if (o.type === 'text') {
      return {
        ...b, text: String(o.text == null ? '' : o.text).slice(0, 4000),
        ff: FONTS.some(f => f.id === o.ff) ? o.ff : 'baloo', fs: clamp(num(o.fs, 48), 8, 600), c: col(o.c),
        b: Boolean(o.b), i: Boolean(o.i), u: Boolean(o.u),
        al: ['left', 'center', 'right'].includes(o.al) ? o.al : 'left', lh: clamp(num(o.lh, 1.2), 0.8, 3),
      };
    }
    if (o.type === 'image') {
      const src = safeSrc(o.src);
      return src ? { ...b, src } : null;
    }
    if (o.type === 'shape') {
      return {
        ...b, shape: SHAPES.some(s => s.id === o.shape) ? o.shape : 'rect',
        fill: o.fill === 'none' ? 'none' : col(o.fill, '#f05d77'),
        stroke: o.stroke === 'none' ? 'none' : col(o.stroke, '#2e2b2e'),
        sw: clamp(num(o.sw, 0), 0, 60),
      };
    }
    if (o.type === 'draw') {
      const p = Array.isArray(o.p) ? o.p.slice(0, 6000).map(Number).filter(Number.isFinite) : [];
      if (p.length < 2) return null;
      return { ...b, t: o.t === 'hl' ? 'hl' : 'pen', c: col(o.c), sw: clamp(num(o.sw, 6), 1, 80), p, vw: Math.max(1, num(o.vw, b.w)), vh: Math.max(1, num(o.vh, b.h)) };
    }
    return null;
  }

  const stamp = v => (typeof v === 'string' ? (Date.parse(v) || 0) : num(v, 0));
  function normSlide(s) {
    if (!s || typeof s !== 'object') return blankSlide();
    return {
      v: 1, bg: normBg(s.bg),
      objects: (Array.isArray(s.objects) ? s.objects : []).slice(0, MAX_OBJECTS).map(normObj).filter(Boolean),
      updatedAt: stamp(s.updatedAt),
    };
  }
  function normMeta(m) {
    if (!m || typeof m !== 'object') return null;
    return {
      v: 1,
      title: String(m.title || 'Apresentação').slice(0, 120),
      slideIds: (Array.isArray(m.slideIds) ? m.slideIds : []).map(String).filter(x => SAFE_ID.test(x)).slice(0, MAX_SLIDES),
      bg: normBg(m.bg) || { color: '#ffffff' },
      createdAt: stamp(m.createdAt), updatedAt: stamp(m.updatedAt),
      ...(m.deleted ? { deleted: true } : {}),
    };
  }
  const blankSlide = () => ({ v: 1, bg: null, objects: [], updatedAt: nowMs() });

  const metaId = d => `deck:${d}:meta`;
  const slideRecId = (d, s) => `deck:${d}:s:${s}`;
  const parseRecId = id => {
    const m = /^deck:([a-z0-9]{1,24}):(meta|s:([a-z0-9]{1,24}))$/.exec(String(id || ''));
    return m ? { deck: m[1], meta: m[2] === 'meta', slide: m[3] || null } : null;
  };

  // -------------------------------------------------------------------------
  // LOCAL STORAGE (the cache the teacher edits and the student link reads)
  // -------------------------------------------------------------------------
  const LS = 'igslides:';
  const QKEY = 'igslides-q';
  const mem = new Map();            // records that did not fit in localStorage
  const lsKey = (sid, id) => `${LS}${sid}:${id}`;

  function readRec(sid, id) {
    const k = lsKey(sid, id);
    if (mem.has(k)) return mem.get(k);
    try {
      const raw = localStorage.getItem(k);
      if (!raw) return null;
      const j = JSON.parse(raw);
      const p = parseRecId(id);
      return p && p.meta ? normMeta(j) : normSlide(j);
    } catch (e) { return null; }
  }
  function writeRec(sid, id, rec) {
    const k = lsKey(sid, id);
    try { localStorage.setItem(k, JSON.stringify(rec)); mem.delete(k); return true; }
    catch (e) { mem.set(k, rec); return false; }
  }
  function delRec(sid, id) {
    const k = lsKey(sid, id);
    mem.delete(k);
    try { localStorage.removeItem(k); } catch (e) { /* private mode */ }
  }
  function localIds(sid) {
    const pre = `${LS}${sid}:`;
    const out = new Set();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(pre)) out.add(k.slice(pre.length));
      }
    } catch (e) { /* ignore */ }
    mem.forEach((_, k) => { if (k.startsWith(pre)) out.add(k.slice(pre.length)); });
    return [...out].filter(id => parseRecId(id));
  }
  function localDecks(sid, withDeleted) {
    return localIds(sid).filter(id => /:meta$/.test(id)).map(id => {
      const m = readRec(sid, id);
      return m ? { id: parseRecId(id).deck, ...m } : null;
    }).filter(m => m && (withDeleted || !m.deleted)).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  // A slide that is missing everywhere still shows as a blank slide.
  function slideOf(sid, deckId, slideId) { return readRec(sid, slideRecId(deckId, slideId)) || blankSlide(); }

  // -------------------------------------------------------------------------
  // CLOUD SYNC (teacher) — instant local save, debounced upload, newest wins
  // -------------------------------------------------------------------------
  const missingErr = e => /could not find the function|could not find the table|does not exist|PGRST202|PGRST205|42883|42P01|404/i
    .test(String((e && (e.message || e.code)) || ''));

  const Sync = (() => {
    let mode = 'local';             // local | cloud | offline | nosql
    let timer = null, busy = false, again = false, status = 'idle';
    const listeners = new Set();

    const cloudOK = () => Boolean(typeof IGCloud !== 'undefined' && IGCloud.enabled && IGCloud.enabled()
      && IGCloud.teacher && IGCloud.pullSlideRows && IGCloud.saveSlideRow);
    const setStatus = s => { status = s; listeners.forEach(fn => { try { fn(s); } catch (e) { /* view gone */ } }); };
    const settled = () => (mode === 'cloud' ? 'saved' : mode === 'offline' ? 'offline' : 'local');

    function qLoad() { try { const q = JSON.parse(localStorage.getItem(QKEY) || '{}'); return q && typeof q === 'object' ? q : {}; } catch (e) { return {}; } }
    function qSave(q) {
      Object.keys(q).forEach(s => { if (!q[s].w.length && !q[s].d.length) delete q[s]; });
      try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch (e) { /* ignore */ }
    }
    function qEntry(q, sid) { if (!q[sid]) q[sid] = { w: [], d: [] }; return q[sid]; }

    function schedule() {
      if (!cloudOK() || mode === 'nosql') { setStatus('local'); return; }
      setStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(flush, 1500);
    }
    function mark(sid, id) {
      if (!cloudOK()) { setStatus('local'); return; }
      const q = qLoad(), e = qEntry(q, sid);
      if (!e.w.includes(id)) e.w.push(id);
      e.d = e.d.filter(x => x !== id);
      qSave(q); schedule();
    }
    // A slide (or a whole deck's rows) that must disappear from the cloud.
    function markDelete(sid, id) {
      delRec(sid, id);
      if (!cloudOK()) return;
      const q = qLoad(), e = qEntry(q, sid);
      e.w = e.w.filter(x => x !== id);
      if (!e.d.includes(id)) e.d.push(id);
      qSave(q); schedule();
    }

    async function flush() {
      clearTimeout(timer);
      if (!cloudOK() || mode === 'nosql') { setStatus('local'); return; }
      if (busy) { again = true; return; }
      busy = true;
      let q = qLoad();
      let toobig = false;
      try {
        for (const sid of Object.keys(q)) {
          const e = q[sid];
          // slides first, the deck meta last: a reader never sees a meta that
          // points at a slide the cloud does not have yet.
          const order = e.w.slice().sort((a, b) => (/:meta$/.test(a) ? 1 : 0) - (/:meta$/.test(b) ? 1 : 0));
          for (const id of order) {
            const rec = readRec(sid, id);
            if (!rec) { e.w = e.w.filter(x => x !== id); continue; }
            if (JSON.stringify(rec).length > 1000000) { e.w = e.w.filter(x => x !== id); toobig = true; continue; }
            await IGCloud.saveSlideRow(sid, id, rec);
            e.w = e.w.filter(x => x !== id);
            qSave(q);
            // a deleted deck: its slide rows go too
            const p = parseRecId(id);
            if (p && p.meta && rec.deleted) await IGCloud.deleteSlideRows(sid, { deckId: p.deck });
          }
          if (e.d.length) {
            await IGCloud.deleteSlideRows(sid, { ids: e.d.slice() });
            e.d = [];
          }
          qSave(q);
        }
        mode = 'cloud';
        setStatus(toobig ? 'toobig' : settled());
      } catch (err) {
        if (missingErr(err)) { mode = 'nosql'; setStatus('local'); }
        else { mode = 'offline'; setStatus('offline'); }
        console.warn('slides: envio', err);
      } finally {
        busy = false;
        if (again) { again = false; setTimeout(flush, 300); }
      }
    }

    // Deck list of one student: cloud metas merged into the local cache.
    async function pullMetas(sid) {
      if (!cloudOK()) { mode = 'local'; setStatus('local'); return false; }
      try {
        const rows = await IGCloud.pullSlideRows(sid, { metaOnly: true });
        let changed = false;
        const remote = new Set();
        (rows || []).forEach(row => {
          const p = parseRecId(row.id);
          if (!p || !p.meta) return;
          remote.add(row.id);
          const r = normMeta(row.payload), l = readRec(sid, row.id);
          if (!r) return;
          if (!l || r.updatedAt > l.updatedAt) {
            writeRec(sid, row.id, r); changed = true;
            // slides this meta no longer lists are gone
            if (l) l.slideIds.filter(x => !r.slideIds.includes(x)).forEach(x => delRec(sid, slideRecId(p.deck, x)));
            if (r.deleted) r.slideIds.forEach(x => delRec(sid, slideRecId(p.deck, x)));
          } else if (l.updatedAt > r.updatedAt) mark(sid, row.id);
        });
        // never uploaded (made before the cloud, or offline): send it
        localDecks(sid, true).forEach(d => {
          const id = metaId(d.id);
          if (remote.has(id)) return;
          d.slideIds.forEach(x => { if (readRec(sid, slideRecId(d.id, x))) mark(sid, slideRecId(d.id, x)); });
          mark(sid, id);
        });
        mode = 'cloud';
        const q = qLoad();
        if (q[sid] && (q[sid].w.length || q[sid].d.length)) flush(); else setStatus('saved');
        return changed;
      } catch (e) {
        if (missingErr(e)) { mode = 'nosql'; setStatus('local'); }
        else { mode = 'offline'; setStatus('offline'); }
        console.warn('slides: leitura da nuvem', e);
        return false;
      }
    }

    // The slides of one deck, merged the same way (per slide, newest wins).
    async function pullDeck(sid, deckId) {
      if (!cloudOK() || mode === 'nosql' || mode === 'offline') return false;
      try {
        const rows = await IGCloud.pullSlideRows(sid, { deckId });
        const meta = readRec(sid, metaId(deckId));
        let changed = false;
        (rows || []).forEach(row => {
          const p = parseRecId(row.id);
          if (!p || p.meta || !meta || !meta.slideIds.includes(p.slide)) return;
          const r = normSlide(row.payload), l = readRec(sid, row.id);
          if (!l || r.updatedAt > l.updatedAt) { writeRec(sid, row.id, r); changed = true; }
          else if (l.updatedAt > r.updatedAt) mark(sid, row.id);
        });
        if (meta) {
          const have = new Set((rows || []).map(r => r.id));
          meta.slideIds.forEach(x => { const id = slideRecId(deckId, x); if (!have.has(id) && readRec(sid, id)) mark(sid, id); });
          // orphans in the cache (slides the deck no longer lists)
          localIds(sid).forEach(id => { const p = parseRecId(id); if (p && p.deck === deckId && p.slide && !meta.slideIds.includes(p.slide)) delRec(sid, id); });
        }
        return changed;
      } catch (e) {
        if (!missingErr(e)) { mode = 'offline'; setStatus('offline'); }
        console.warn('slides: leitura do deck', e);
        return false;
      }
    }

    window.addEventListener('online', () => { if (mode === 'offline') { mode = 'cloud'; flush(); } });
    const leave = () => { const q = qLoad(); if (Object.keys(q).length) flush(); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave(); });
    window.addEventListener('pagehide', leave);

    return {
      mark, markDelete, flush, pullMetas, pullDeck,
      onStatus(fn) { listeners.add(fn); fn(status); return () => listeners.delete(fn); },
      get mode() { return mode; },
      get cloud() { return cloudOK(); },
    };
  })();

  const STATUS = {
    idle: ['', ''],
    saving: ['Salvando…', 'is-saving'],
    saved: ['Salvo ✓', 'is-ok'],
    local: ['Salvo neste aparelho ✓', 'is-ok'],
    offline: ['Sem internet — salvo neste aparelho', 'is-warn'],
    toobig: ['Slide pesado demais — salvo só neste aparelho', 'is-warn'],
  };
  function paintStatus(el, s) {
    if (!el) return;
    const [text, cls] = STATUS[s] || STATUS.idle;
    el.textContent = text;
    el.className = 'sl-status ' + cls;
  }

  // -------------------------------------------------------------------------
  // STUDENT'S READER (the family's link): never writes
  // -------------------------------------------------------------------------
  const linkCode = () => (typeof shareCodeInUrl === 'function' ? shareCodeInUrl() : null);
  const studentCloud = () => Boolean(isShare() && window.IG_SUPABASE && window.IG_SUPABASE.configured
    && typeof IGCloud !== 'undefined' && IGCloud.anonClient && linkCode());

  const StudentData = {
    // -> { decks:[{id,...meta}], hidden:boolean, error:boolean }
    async list(sid) {
      if (studentCloud()) {
        try {
          const sb = await IGCloud.anonClient();
          const { data, error } = await sb.rpc('igenglish_slides_read', { p_code: linkCode() });
          if (error) throw error;
          if (data && data.ok) {
            if (data.enabled === false) return { decks: [], hidden: true };
            const seen = new Set();
            (data.rows || []).forEach(row => {
              const p = parseRecId(row.id);
              if (!p || !p.meta) return;
              seen.add(p.deck);
              const m = normMeta(row.payload);
              if (m) writeRec(sid, row.id, m);
            });
            // decks the teacher deleted since the last visit disappear from the cache
            localDecks(sid, true).forEach(d => { if (!seen.has(d.id)) delRec(sid, metaId(d.id)); });
          }
        } catch (e) { console.warn('slides: leitura', e); return { decks: localDecks(sid), hidden: false, error: !localDecks(sid).length }; }
      }
      return { decks: localDecks(sid), hidden: false };
    },
    async open(sid, deckId) {
      if (studentCloud()) {
        try {
          const sb = await IGCloud.anonClient();
          const { data, error } = await sb.rpc('igenglish_slides_read', { p_code: linkCode(), p_deck: deckId });
          if (error) throw error;
          if (data && data.ok && data.enabled !== false) {
            (data.rows || []).forEach(row => {
              const p = parseRecId(row.id);
              if (!p || p.deck !== deckId) return;
              writeRec(sid, row.id, p.meta ? normMeta(row.payload) : normSlide(row.payload));
            });
          }
        } catch (e) { console.warn('slides: leitura do deck', e); }
      }
      const meta = readRec(sid, metaId(deckId));
      if (!meta || meta.deleted) return null;
      return { id: deckId, meta, slides: meta.slideIds.map(x => ({ id: x, ...slideOf(sid, deckId, x) })) };
    },
  };

  // -------------------------------------------------------------------------
  // WHO SEES THE SECTION (studentAccess.js record, rides in the student's link)
  // -------------------------------------------------------------------------
  function visibleFor(studentId) {
    try { return typeof saRecord === 'function' ? saRecord(studentId).slides === true : false; } catch (e) { return false; }
  }
  function setVisible(studentId, on) {
    if (typeof saWrite === 'function') saWrite(studentId, { slides: Boolean(on) });
  }

  // -------------------------------------------------------------------------
  // RENDERING — absolutely positioned DOM in a 1280 x 720 stage (shared by the
  // editor, thumbnails, the present mode and the student's reader)
  // -------------------------------------------------------------------------
  const blobCache = new Map();
  // Data-URL images are turned into blob URLs once, so repainting a slide (and
  // its thumbnail) does not decode the same base64 again and again.
  function imgSrc(src) {
    if (!/^data:/.test(src)) return src;
    let u = blobCache.get(src);
    if (u) return u;
    try {
      const i = src.indexOf(',');
      const mime = /^data:([^;]+)/.exec(src)[1];
      const bin = atob(src.slice(i + 1));
      const arr = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
      u = URL.createObjectURL(new Blob([arr], { type: mime }));
      blobCache.set(src, u);
      return u;
    } catch (e) { return src; }
  }

  function strokeD(p) {
    const n = Math.floor(p.length / 2);
    if (n === 1) return `M${p[0]} ${p[1]}l0.1 0`;
    if (n === 2) return `M${p[0]} ${p[1]}L${p[2]} ${p[3]}`;
    let d = `M${p[0]} ${p[1]}`;
    for (let i = 1; i < n - 1; i++) {
      const x = p[2 * i], y = p[2 * i + 1], nx = p[2 * i + 2], ny = p[2 * i + 3];
      d += `Q${x} ${y} ${r1((x + nx) / 2)} ${r1((y + ny) / 2)}`;
    }
    return d + `L${p[2 * n - 2]} ${p[2 * n - 1]}`;
  }
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  // Ramer–Douglas–Peucker on a flat [x, y, x, y…] list.
  function simplify(pts, eps) {
    const n = pts.length / 2;
    if (n < 3) return pts.map(v => r1(v));
    const keep = new Uint8Array(n); keep[0] = 1; keep[n - 1] = 1;
    const st = [[0, n - 1]];
    while (st.length) {
      const [a, b] = st.pop();
      let md = 0, mi = -1;
      for (let i = a + 1; i < b; i++) {
        const d = segDist(pts[2 * i], pts[2 * i + 1], pts[2 * a], pts[2 * a + 1], pts[2 * b], pts[2 * b + 1]);
        if (d > md) { md = d; mi = i; }
      }
      if (md > eps && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    const out = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(r1(pts[2 * i]), r1(pts[2 * i + 1]));
    return out;
  }

  function shapeInner(o) {
    const w = o.w, h = o.h, line = o.shape === 'line';
    const sw = line ? Math.max(2, o.sw || 6) : (o.sw || 0);
    const i = sw / 2;
    const stroke = (line || sw > 0) && o.stroke !== 'none' ? o.stroke : 'none';
    const fill = line ? 'none' : o.fill;
    const at = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
    switch (o.shape) {
      case 'rrect': return `<rect x="${i}" y="${i}" width="${Math.max(1, w - sw)}" height="${Math.max(1, h - sw)}" rx="${r1(Math.min(w, h) * 0.2)}" ${at}/>`;
      case 'ellipse': return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${Math.max(1, (w - sw) / 2)}" ry="${Math.max(1, (h - sw) / 2)}" ${at}/>`;
      case 'triangle': return `<polygon points="${w / 2},${i} ${w - i},${h - i} ${i},${h - i}" ${at}/>`;
      case 'star': {
        const pts = [];
        for (let k = 0; k < 10; k++) {
          const a = (-90 + k * 36) * Math.PI / 180, f = k % 2 ? 0.42 : 1;
          pts.push(r1(w / 2 + Math.cos(a) * (w - sw) / 2 * f) + ',' + r1(h / 2 + Math.sin(a) * (h - sw) / 2 * f));
        }
        return `<polygon points="${pts.join(' ')}" ${at}/>`;
      }
      case 'heart': {
        const X = v => r1(i + v / 100 * (w - sw)), Y = v => r1(i + v / 90 * (h - sw));
        return `<path d="M${X(50)} ${Y(90)}C${X(10)} ${Y(60)} ${X(0)} ${Y(35)} ${X(0)} ${Y(22)}C${X(0)} ${Y(8)} ${X(12)} ${Y(0)} ${X(26)} ${Y(0)}C${X(38)} ${Y(0)} ${X(46)} ${Y(7)} ${X(50)} ${Y(15)}C${X(54)} ${Y(7)} ${X(62)} ${Y(0)} ${X(74)} ${Y(0)}C${X(88)} ${Y(0)} ${X(100)} ${Y(8)} ${X(100)} ${Y(22)}C${X(100)} ${Y(35)} ${X(90)} ${Y(60)} ${X(50)} ${Y(90)}Z" ${at}/>`;
      }
      case 'arrow': {
        const P = [[0, .3], [.6, .3], [.6, 0], [1, .5], [.6, 1], [.6, .7], [0, .7]]
          .map(([a, b]) => r1(i + a * (w - sw)) + ',' + r1(i + b * (h - sw))).join(' ');
        return `<polygon points="${P}" ${at}/>`;
      }
      case 'line': return `<line x1="${i}" y1="${h / 2}" x2="${Math.max(i + 1, w - i)}" y2="${h / 2}" ${at}/>`;
      default: return `<rect x="${i}" y="${i}" width="${Math.max(1, w - sw)}" height="${Math.max(1, h - sw)}" ${at}/>`;
    }
  }

  function objHTML(o) {
    const pos = `left:${r1(o.x)}px;top:${r1(o.y)}px;`;
    const rot = o.r ? `transform:rotate(${r1(o.r)}deg);` : '';
    const op = o.op != null && o.op < 1 ? `opacity:${o.op};` : '';
    const lk = o.lock ? ' is-locked' : '';
    const box = `${pos}width:${r1(o.w)}px;height:${r1(o.h)}px;${rot}${op}`;
    switch (o.type) {
      case 'text':
        return `<div class="sl-o sl-ot${lk}" data-oid="${o.id}" style="${pos}width:${r1(o.w)}px;${rot}${op}font-family:${fontCss(o.ff)};font-size:${r1(o.fs)}px;color:${o.c};font-weight:${o.b ? 700 : 400};font-style:${o.i ? 'italic' : 'normal'};text-decoration:${o.u ? 'underline' : 'none'};text-align:${o.al};line-height:${o.lh}">${esc(o.text)}​</div>`;
      case 'image':
        return `<div class="sl-o sl-oi${lk}" data-oid="${o.id}" style="${box}"><img src="${esc(imgSrc(o.src))}" alt="" draggable="false"></div>`;
      case 'shape':
        return `<div class="sl-o sl-os${lk}" data-oid="${o.id}" style="${box}"><svg width="${r1(o.w)}" height="${r1(o.h)}" viewBox="0 0 ${r1(o.w)} ${r1(o.h)}" style="overflow:visible">${shapeInner(o)}</svg></div>`;
      case 'draw':
        return `<div class="sl-o sl-od${lk}" data-oid="${o.id}" style="${box}"><svg width="${r1(o.w)}" height="${r1(o.h)}" viewBox="0 0 ${r1(o.vw)} ${r1(o.vh)}" preserveAspectRatio="none" style="overflow:visible"><path d="${strokeD(o.p)}" fill="none" stroke="${o.c}" stroke-width="${o.sw}" stroke-linecap="round" stroke-linejoin="round"${o.t === 'hl' ? ' stroke-opacity=".45"' : ''}/></svg></div>`;
      default: return '';
    }
  }

  function bgStyle(bg) {
    bg = bg || { color: '#ffffff' };
    let s = `background-color:${col(bg.color, '#ffffff')};`;
    if (bg.grad) s = `background:linear-gradient(${bg.grad[2]}deg,${bg.grad[0]},${bg.grad[1]});`;
    if (bg.img && safeSrc(bg.img)) s += `background-image:url('${esc(imgSrc(bg.img))}');background-size:${bg.fit === 'cover' ? 'cover' : 'contain'};background-position:center;background-repeat:no-repeat;`;
    return s;
  }
  const bgOf = (deckMeta, slide) => (slide && slide.bg) || (deckMeta && deckMeta.bg) || { color: '#ffffff' };
  const layerHTML = objects => objects.map(objHTML).join('');

  // A scaled, non-interactive copy of a slide (thumbnails, deck cards).
  function miniHTML(deckMeta, slide, width) {
    const s = width / W;
    return `<div class="sl-mini" style="width:${width}px;height:${r1(width * H / W)}px"><div class="sl-stage" style="${bgStyle(bgOf(deckMeta, slide))}transform:scale(${s.toFixed(4)})"><div class="sl-layer">${layerHTML(slide.objects)}</div></div></div>`;
  }

  // Centre the 1280x720 stage inside `wrap`, as large as fits.
  function fitStage(wrap, stage, pad) {
    pad = pad || 0;
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    const k = Math.max(0.05, Math.min((cw - pad * 2) / W, (ch - pad * 2) / H));
    stage.style.transform = `translate(${r1((cw - W * k) / 2)}px,${r1((ch - H * k) / 2)}px) scale(${k.toFixed(4)})`;
    return k;
  }
  function watchFit(wrap, stage, pad, cb) {
    const run = () => { const k = fitStage(wrap, stage, pad); if (cb) cb(k); };
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(run); ro.observe(wrap); }
    else window.addEventListener('resize', run);
    run();
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', run); };
  }

  // -------------------------------------------------------------------------
  // VIEW STACK + the phone's back button (same idea as the online book)
  // -------------------------------------------------------------------------
  const stack = [];
  function pushView(el, hooks) {
    hooks = hooks || {};
    document.body.appendChild(el);
    const token = rid();
    stack.push({ el, token, onClose: hooks.onClose, onKey: hooks.onKey });
    document.documentElement.classList.add('sl-open');
    try { history.pushState({ sl: token }, ''); } catch (e) { /* sandboxed */ }
  }
  function closeTop() {
    const top = stack.pop();
    if (!top) return;
    closePop();
    try { if (top.onClose) top.onClose(); } catch (e) { console.error(e); }
    top.el.remove();
    if (!stack.length) document.documentElement.classList.remove('sl-open');
  }
  function back() {
    const top = stack[stack.length - 1];
    if (top && history.state && history.state.sl === top.token) history.back();
    else closeTop();
  }
  function closeAllViews() { while (stack.length) closeTop(); }
  window.addEventListener('popstate', () => {
    const t = history.state && history.state.sl;
    const keep = stack.findIndex(v => v.token === t);
    while (stack.length > keep + 1) closeTop();
  });
  window.addEventListener('keydown', e => {
    const top = stack[stack.length - 1];
    if (top && top.onKey) top.onKey(e);
  });
  const isOpen = () => stack.length > 0;
  const topRoot = () => (stack.length ? stack[stack.length - 1].el : null);

  // -------------------------------------------------------------------------
  // SMALL UI HELPERS
  // -------------------------------------------------------------------------
  function toast(root, msg, ms) {
    if (!root) return;
    let t = root.querySelector('.sl-toast');
    if (!t) { t = document.createElement('div'); t.className = 'sl-toast'; t.setAttribute('role', 'status'); root.appendChild(t); }
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._t);
    t._t = setTimeout(() => { t.hidden = true; }, ms || 2600);
  }

  let pop = null;
  function closePop() {
    if (!pop) return;
    document.removeEventListener('pointerdown', pop.out, true);
    pop.el.remove();
    pop = null;
  }
  function openPop(root, anchor, html, wire, cls) {
    if (pop && pop.anchor === anchor) { closePop(); return null; }
    closePop();
    const el = document.createElement('div');
    el.className = 'sl-pop' + (cls ? ' ' + cls : '');
    el.innerHTML = html;
    root.appendChild(el);
    const a = anchor.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = clamp(a.left, 8, Math.max(8, window.innerWidth - w - 8)) + 'px';
    const below = a.bottom + 6;
    el.style.top = (below + h > window.innerHeight - 8 ? Math.max(8, a.top - h - 6) : below) + 'px';
    const out = e => { if (!el.contains(e.target) && !anchor.contains(e.target)) closePop(); };
    setTimeout(() => document.addEventListener('pointerdown', out, true), 0);
    pop = { el, anchor, out };
    if (wire) wire(el);
    return el;
  }

  function colorPop(root, anchor, cur, onPick, opts) {
    opts = opts || {};
    const sw = c => `<button type="button" class="sl-sw${String(cur).toLowerCase() === c ? ' is-on' : ''}" data-c="${c}" style="background:${c}" aria-label="Cor ${c}" title="${c}"></button>`;
    openPop(root, anchor, `
      <p class="sl-pop-t">${esc(opts.title || 'Cor')}</p>
      <div class="sl-sws">${SCHOOL.map(sw).join('')}</div>
      <div class="sl-sws">${BRIGHT.map(sw).join('')}</div>
      <div class="sl-sws">${PASTEL.map(sw).join('')}</div>
      <div class="sl-pop-row">
        ${opts.none ? '<button type="button" class="sl-btn" data-none="1">🚫 Sem cor</button>' : ''}
        <label class="sl-custom">🎨 Outra cor <input type="color" value="${esc(/^#[0-9a-f]{6}$/i.test(cur) ? cur : '#8e6d86')}" aria-label="Escolher outra cor"></label>
      </div>`, el => {
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-c]');
        if (b) { onPick(b.dataset.c, false); closePop(); return; }
        if (e.target.closest('[data-none]')) { onPick('none', false); closePop(); }
      });
      el.querySelector('input[type=color]').addEventListener('input', e => onPick(e.target.value, true));
    }, 'sl-pop--color');
  }

  // A small text dialog inside our own view (renames, names of new decks).
  function ask(root, o) {
    return new Promise(resolve => {
      const d = document.createElement('div');
      d.className = 'sl-dlg';
      d.innerHTML = `<form class="sl-dlg-box" role="dialog" aria-label="${esc(o.title)}">
        <h4>${esc(o.title)}</h4>
        <input type="text" maxlength="120" value="${esc(o.value || '')}" aria-label="${esc(o.title)}" autocomplete="off" />
        <div class="sl-dlg-row"><button type="button" class="sl-btn" data-x="cancel">Cancelar</button><button type="submit" class="sl-btn sl-btn--ok">${esc(o.ok || 'OK')}</button></div></form>`;
      root.appendChild(d);
      const inp = d.querySelector('input');
      const done = v => { d.remove(); resolve(v); };
      d.querySelector('form').addEventListener('submit', e => { e.preventDefault(); done(inp.value.trim() || null); });
      d.querySelector('[data-x="cancel"]').addEventListener('click', () => done(null));
      d.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } });
      setTimeout(() => { inp.focus(); inp.select(); }, 30);
    });
  }

  const fmtDate = t => {
    try { return t ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; } catch (e) { return ''; }
  };
  const students = () => (typeof loadStudents === 'function' ? loadStudents() : []);
  const studentById = id => students().find(s => s.id === id) || null;

  // -------------------------------------------------------------------------
  // DECK OPERATIONS (teacher)
  // -------------------------------------------------------------------------
  function saveMeta(sid, deckId, meta) {
    const m = { ...meta, updatedAt: nowMs() };
    writeRec(sid, metaId(deckId), m);
    Sync.mark(sid, metaId(deckId));
    return m;
  }
  function newDeck(sid, title) {
    if (localDecks(sid).length >= MAX_DECKS) return null;
    const d = rid(), s = rid(), t = nowMs();
    writeRec(sid, slideRecId(d, s), blankSlide());
    Sync.mark(sid, slideRecId(d, s));
    saveMeta(sid, d, { v: 1, title: title || 'Apresentação', slideIds: [s], bg: { color: '#ffffff' }, createdAt: t, updatedAt: t });
    return d;
  }
  // The deck as the editor needs it: meta + every slide, cloud copy merged first.
  async function loadDeck(sid, deckId) {
    await Sync.pullDeck(sid, deckId);
    const meta = readRec(sid, metaId(deckId));
    if (!meta || meta.deleted) return null;
    const slides = {};
    meta.slideIds.forEach(x => { slides[x] = slideOf(sid, deckId, x); });
    return { meta, slides };
  }
  async function copyDeck(fromSid, deckId, toSid, title) {
    if (localDecks(toSid).length >= MAX_DECKS) return null;
    const src = await loadDeck(fromSid, deckId);
    if (!src) return null;
    const d = rid(), t = nowMs();
    // fresh slide ids too, so a copy never shares a row with its original
    const idMap = {};
    src.meta.slideIds.forEach(x => { idMap[x] = rid(); });
    src.meta.slideIds.forEach(x => {
      const copy = JSON.parse(JSON.stringify(src.slides[x]));
      copy.updatedAt = t;
      writeRec(toSid, slideRecId(d, idMap[x]), copy);
      Sync.mark(toSid, slideRecId(d, idMap[x]));
    });
    saveMeta(toSid, d, { ...src.meta, title: title || src.meta.title, slideIds: src.meta.slideIds.map(x => idMap[x]), createdAt: t, updatedAt: t });
    return d;
  }
  function deleteDeck(sid, deckId) {
    const meta = readRec(sid, metaId(deckId));
    if (!meta) return;
    // a tiny tombstone stays (deleted: true) so no other device brings it back
    meta.slideIds.forEach(x => delRec(sid, slideRecId(deckId, x)));
    saveMeta(sid, deckId, { ...meta, deleted: true });
  }

  // -------------------------------------------------------------------------
  // WHO SEES THE SECTION — the switch (deck list + the student's link window)
  // -------------------------------------------------------------------------
  function visNote(student, on) {
    const cloudOn = typeof IGCloud !== 'undefined' && IGCloud.enabled && IGCloud.enabled();
    return on
      ? `Ligado: ${esc(student.name)} vê a seção “Slides da aula” no link dele(a) — só para ler, sem editar.${cloudOn ? '' : ' (Sem Supabase isso vale só neste navegador.)'}`
      : `Desligado (padrão): ${esc(student.name)} NÃO vê esta seção no link. Ligue quando quiser mostrar os slides.`;
  }
  function visibilityHTML(student) {
    const on = visibleFor(student.id);
    return `<div class="sl-vis${on ? ' is-on' : ''}" data-sl-vis="${esc(student.id)}">
      <label class="sl-vis-l"><input type="checkbox" ${on ? 'checked' : ''} aria-label="Mostrar Slides da aula no link do aluno" />
        <span><b>📝 Mostrar “Slides da aula” no link do aluno</b><small data-ref="visnote">${visNote(student, on)}</small></span></label>
    </div>`;
  }
  function wireVisibility(scope, student) {
    scope.querySelectorAll(`[data-sl-vis="${CSS.escape(student.id)}"]`).forEach(box => {
      const cb = box.querySelector('input[type=checkbox]');
      cb.addEventListener('change', () => {
        setVisible(student.id, cb.checked);
        box.classList.toggle('is-on', cb.checked);
        box.querySelector('[data-ref="visnote"]').innerHTML = visNote(student, cb.checked);
      });
    });
  }

  // -------------------------------------------------------------------------
  // PRESENT — shows only the slide, for the screen-share
  // -------------------------------------------------------------------------
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  function enterFs(el) {
    try { const f = el.requestFullscreen || el.webkitRequestFullscreen; if (f) { const p = f.call(el); if (p && p.catch) p.catch(() => {}); } } catch (e) { /* no fullscreen */ }
  }
  function exitFs() {
    try { const f = document.exitFullscreen || document.webkitExitFullscreen; if (f && fsEl()) { const p = f.call(document); if (p && p.catch) p.catch(() => {}); } } catch (e) { /* ignore */ }
  }

  // getSlide(i) -> slide record; meta.slideIds.length slides.
  function openPresent(meta, getSlide, start) {
    const n = meta.slideIds.length;
    let i = clamp(start || 0, 0, n - 1);
    const root = document.createElement('div');
    root.className = 'sl-root sl-present';
    root.tabIndex = -1;
    root.innerHTML = `
      <div class="sl-pwrap"><div class="sl-stage"><div class="sl-layer"></div></div></div>
      <div class="sl-laser" hidden></div>
      <div class="sl-pcount" aria-live="polite"></div>
      <button type="button" class="sl-pexit" aria-label="Sair da apresentação (Esc)" title="Sair (Esc)">✕</button>`;
    const wrap = root.querySelector('.sl-pwrap'), stage = root.querySelector('.sl-stage'), layer = root.querySelector('.sl-layer');
    const count = root.querySelector('.sl-pcount'), laser = root.querySelector('.sl-laser');
    let laserOn = false, wasFs = false, idle = null, unFit = () => {};
    const show = () => {
      const s = getSlide(i);
      stage.setAttribute('style', bgStyle(bgOf(meta, s)));
      layer.innerHTML = layerHTML(s.objects);
      count.textContent = `${i + 1} / ${n}`;
      fitStage(wrap, stage, 0);
    };
    const go = d => { const j = clamp(i + d, 0, n - 1); if (j !== i) { i = j; show(); } };
    const wake = () => { root.classList.remove('is-idle'); clearTimeout(idle); idle = setTimeout(() => root.classList.add('is-idle'), 2200); };
    wrap.addEventListener('click', e => {
      const r = wrap.getBoundingClientRect();
      go((e.clientX - r.left) < r.width * 0.2 ? -1 : 1);
    });
    root.addEventListener('pointermove', e => {
      wake();
      if (laserOn) { laser.style.left = e.clientX + 'px'; laser.style.top = e.clientY + 'px'; }
    });
    root.querySelector('.sl-pexit').addEventListener('click', e => { e.stopPropagation(); back(); });
    const onFs = () => {
      if (fsEl() === root) wasFs = true;
      else if (wasFs) { wasFs = false; if (stack.length && stack[stack.length - 1].el === root) back(); }
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    pushView(root, {
      onClose() {
        document.removeEventListener('fullscreenchange', onFs);
        document.removeEventListener('webkitfullscreenchange', onFs);
        clearTimeout(idle);
        unFit();
        if (fsEl() === root) { wasFs = false; exitFs(); }
      },
      onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); go(1); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); go(-1); }
        else if (k === 'Home') { e.preventDefault(); i = 0; show(); }
        else if (k === 'End') { e.preventDefault(); i = n - 1; show(); }
        else if (k === 'l' || k === 'L') {
          laserOn = !laserOn; laser.hidden = !laserOn; root.classList.toggle('has-laser', laserOn);
          if (laserOn) { const r = wrap.getBoundingClientRect(); laser.style.left = (r.left + r.width / 2) + 'px'; laser.style.top = (r.top + r.height / 2) + 'px'; }
        } else if (k === 'Escape') { e.preventDefault(); back(); }
      },
    });
    unFit = watchFit(wrap, stage, 0);
    show();
    wake();
    enterFs(root);
    try { root.focus({ preventScroll: true }); } catch (e) { /* old browser */ }
    return root;
  }

  // -------------------------------------------------------------------------
  // READER (student's link) — thumbnails, prev/next, fullscreen, no editing
  // -------------------------------------------------------------------------
  function openViewer(deck) {
    const meta = deck.meta, list = deck.slides;
    const n = list.length;
    let i = 0, unFit = () => {};
    const root = document.createElement('div');
    root.className = 'sl-root sl-view';
    root.innerHTML = `
      <header class="sl-vtop">
        <button type="button" class="sl-ico" data-a="back" aria-label="Voltar" title="Voltar">←</button>
        <div class="sl-vtitle"><b>${esc(meta.title)}</b><small>${n} slide${n === 1 ? '' : 's'}${meta.updatedAt ? ' · ' + esc(fmtDate(meta.updatedAt)) : ''}</small></div>
        <button type="button" class="sl-ico" data-a="fs" aria-label="Tela cheia" title="Tela cheia (F)">⛶</button>
      </header>
      <div class="sl-vbody">
        <aside class="sl-vthumbs" aria-label="Slides">${list.map((s, k) => `
          <button type="button" class="sl-vth" data-go="${k}" aria-label="Slide ${k + 1}"><span class="sl-th-n">${k + 1}</span>${miniHTML(meta, s, 150)}</button>`).join('')}</aside>
        <main class="sl-vmain">
          <div class="sl-vwrap"><div class="sl-stage"><div class="sl-layer"></div></div></div>
          <div class="sl-vnav">
            <button type="button" class="sl-navbtn" data-a="prev" aria-label="Slide anterior">◀</button>
            <span class="sl-vcount" aria-live="polite"></span>
            <button type="button" class="sl-navbtn" data-a="next" aria-label="Próximo slide">▶</button>
          </div>
        </main>
      </div>`;
    const wrap = root.querySelector('.sl-vwrap');
    const stage = wrap.querySelector('.sl-stage'), layer = wrap.querySelector('.sl-layer');
    const count = root.querySelector('.sl-vcount');
    const show = () => {
      const s = list[i];
      stage.setAttribute('style', bgStyle(bgOf(meta, s)));
      layer.innerHTML = layerHTML(s.objects);
      count.textContent = `${i + 1} / ${n}`;
      root.querySelectorAll('.sl-vth').forEach((b, k) => b.classList.toggle('is-on', k === i));
      const cur = root.querySelector('.sl-vth.is-on');
      if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* old browser */ } }
      root.querySelector('[data-a="prev"]').disabled = i === 0;
      root.querySelector('[data-a="next"]').disabled = i === n - 1;
      fitStage(wrap, stage, 0);
    };
    const go = d => { const j = clamp(i + d, 0, n - 1); if (j !== i) { i = j; show(); } };
    const toggleFs = () => {
      if (fsEl() === root) exitFs();
      else if (root.requestFullscreen || root.webkitRequestFullscreen) enterFs(root);
      else root.classList.toggle('is-fs');
    };
    const onFs = () => root.classList.toggle('is-fs', fsEl() === root);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-a],[data-go]');
      if (!b) return;
      if (b.dataset.go != null) { i = Number(b.dataset.go); show(); return; }
      if (b.dataset.a === 'back') back();
      else if (b.dataset.a === 'prev') go(-1);
      else if (b.dataset.a === 'next') go(1);
      else if (b.dataset.a === 'fs') toggleFs();
    });
    // swipe on the slide (phones)
    let sx = null, sy = 0;
    wrap.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    wrap.addEventListener('pointerup', e => {
      if (sx == null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
      else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) go(e.clientX < wrap.getBoundingClientRect().left + wrap.clientWidth * 0.3 ? -1 : 1);
    });
    pushView(root, {
      onClose() {
        document.removeEventListener('fullscreenchange', onFs);
        document.removeEventListener('webkitfullscreenchange', onFs);
        unFit();
        if (fsEl() === root) exitFs();
      },
      onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ') { e.preventDefault(); go(1); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); go(-1); }
        else if (k === 'Home') { e.preventDefault(); i = 0; show(); }
        else if (k === 'End') { e.preventDefault(); i = n - 1; show(); }
        else if (k === 'f' || k === 'F') { e.preventDefault(); toggleFs(); }
        else if (k === 'Escape' && fsEl() !== root) { e.preventDefault(); back(); }
      },
    });
    unFit = watchFit(wrap, stage, 8);
    show();
    ensureFonts();
    return root;
  }

  // -------------------------------------------------------------------------
  // DECK LIST — the teacher's workshop and the student's read-only list
  // -------------------------------------------------------------------------
  function cardPreview(sid, d) {
    const first = d.slideIds[0] && readRec(sid, slideRecId(d.id, d.slideIds[0]));
    return first ? miniHTML(d, first, 220) : '<div class="sl-mini sl-mini--empty" style="width:220px;height:124px"><span>📝</span></div>';
  }

  function openHome(student, teacher) {
    const sid = student.id;
    ensureFonts();
    const root = document.createElement('div');
    root.className = 'sl-root sl-home' + (teacher ? '' : ' is-student');
    let unStatus = null, loading = !teacher, hidden = false, failed = false;
    const color = esc(student.color || '#8e6d86');

    const paint = () => {
      if (!root.isConnected) return;
      const decks = localDecks(sid);
      root.innerHTML = `
        <div class="sl-home-wrap">
          <header class="sl-home-head" style="--who:${color}">
            <button type="button" class="sl-ico" data-a="back" aria-label="Voltar" title="Voltar">←</button>
            <div class="sl-home-title">
              ${teacher
                ? `<h2>🖼️ Slides da aula <small>${esc(student.avatar || '🙂')} ${esc(student.name)}</small></h2><p>As apresentações de ${esc(student.name)} — cada aluno tem as suas.</p>`
                : `<h2>📝 Slides da aula <small>Class slides</small></h2><p>O que vimos na aula — toque para rever. Só leitura.</p>`}
            </div>
            ${teacher ? '<span class="sl-status" data-ref="status"></span>' : ''}
          </header>
          ${teacher ? visibilityHTML(student) : ''}
          ${teacher ? `<div class="sl-home-actions">
              <button type="button" class="sl-btn sl-btn--ok" data-a="new">✨ Nova apresentação</button>
              <button type="button" class="sl-btn" data-a="switch">🔄 Trocar aluno</button>
            </div>` : ''}
          ${loading ? '<p class="sl-empty">Abrindo os slides…</p>'
            : hidden ? '<p class="sl-empty">Os slides desta aula ainda não foram liberados. Peça para a teacher. 😊</p>'
              : failed ? '<p class="sl-empty">Não consegui abrir agora. Tente de novo em alguns minutos.</p>'
                : !decks.length ? `<p class="sl-empty">${teacher ? 'Nenhuma apresentação para este aluno ainda. Toque em “Nova apresentação” para começar.' : 'Ainda não há slides por aqui. Quando a teacher fizer slides na aula, eles aparecem aqui. ✨'}</p>`
                  : `<div class="sl-cards">${decks.map(d => `
            <article class="sl-card" data-deck="${d.id}">
              <button type="button" class="sl-card-prev" data-a="open" aria-label="Abrir ${esc(d.title)}">${teacher ? cardPreview(sid, d) : '<div class="sl-mini sl-mini--empty" style="width:220px;height:124px"><span>📝</span></div>'}</button>
              <div class="sl-card-body">
                <b>${esc(d.title)}</b>
                <small>${d.slideIds.length} slide${d.slideIds.length === 1 ? '' : 's'} · ${esc(fmtDate(d.updatedAt))}</small>
                ${teacher ? `<div class="sl-card-acts">
                  <button type="button" class="sl-btn sl-btn--ok" data-a="present" title="Apresentar em tela cheia">▶ Apresentar</button>
                  <button type="button" class="sl-btn" data-a="open" title="Editar os slides">✏️ Editar</button>
                  <button type="button" class="sl-btn sl-btn--ico" data-a="rename" aria-label="Renomear" title="Renomear">🏷️</button>
                  <button type="button" class="sl-btn sl-btn--ico" data-a="dup" aria-label="Duplicar" title="Duplicar">⧉</button>
                  <button type="button" class="sl-btn sl-btn--ico" data-a="copyto" aria-label="Copiar para outro aluno" title="Copiar para outro aluno">👥</button>
                  <button type="button" class="sl-btn sl-btn--ico sl-btn--danger" data-a="del" aria-label="Excluir" title="Excluir">🗑️</button>
                </div>` : '<span class="sl-card-go">Abrir ▶</span>'}
              </div>
            </article>`).join('')}</div>`}
        </div>`;
      if (teacher) {
        if (unStatus) unStatus();
        unStatus = Sync.onStatus(s => paintStatus(root.querySelector('[data-ref="status"]'), s));
        wireVisibility(root, student);
      }
    };

    root.addEventListener('click', async e => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'back') { back(); return; }
      if (a === 'switch') { closeAllViews(); openPicker(); return; }
      if (a === 'new') {
        const title = await ask(root, { title: 'Nome da apresentação', value: `Aula de ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, ok: 'Criar' });
        if (!title) return;
        const d = newDeck(sid, title);
        if (!d) { toast(root, `Limite de ${MAX_DECKS} apresentações por aluno. Exclua alguma antiga.`); return; }
        openEditor(student, d, paint);
        return;
      }
      const card = b.closest('[data-deck]');
      if (!card) return;
      const deckId = card.dataset.deck;
      const meta = readRec(sid, metaId(deckId));
      if (!meta) return;
      if (!teacher) {
        if (a === 'open') {
          const deck = await StudentData.open(sid, deckId);
          if (!deck) { toast(root, 'Não consegui abrir este slide agora.'); return; }
          openViewer(deck);
        }
        return;
      }
      if (a === 'open') openEditor(student, deckId, paint);
      else if (a === 'present') {
        const full = await loadDeck(sid, deckId);
        if (full) openPresent(full.meta, k => full.slides[full.meta.slideIds[k]], 0);
      } else if (a === 'rename') {
        const t = await ask(root, { title: 'Renomear apresentação', value: meta.title, ok: 'Salvar' });
        if (t) { saveMeta(sid, deckId, { ...meta, title: t }); paint(); }
      } else if (a === 'dup') {
        const nd = await copyDeck(sid, deckId, sid, `${meta.title} (cópia)`);
        if (!nd) toast(root, `Limite de ${MAX_DECKS} apresentações por aluno.`); else { paint(); toast(root, 'Duplicada ✓'); }
      } else if (a === 'copyto') {
        const others = students().filter(s => s.id !== sid);
        if (!others.length) { toast(root, 'Não há outro aluno cadastrado.'); return; }
        const d = document.createElement('div');
        d.className = 'sl-dlg';
        d.innerHTML = `<div class="sl-dlg-box" role="dialog" aria-label="Copiar para outro aluno">
          <h4>Copiar “${esc(meta.title)}” para…</h4>
          <div class="sl-dlg-list">${others.map(s => `<button type="button" class="sl-btn sl-dlg-pick" data-sid="${esc(s.id)}">${esc(s.avatar || '🙂')} ${esc(s.name)}</button>`).join('')}</div>
          <div class="sl-dlg-row"><button type="button" class="sl-btn" data-x="cancel">Cancelar</button></div></div>`;
        root.appendChild(d);
        d.addEventListener('click', async ev => {
          if (ev.target.closest('[data-x]') || ev.target === d) { d.remove(); return; }
          const p = ev.target.closest('[data-sid]');
          if (!p) return;
          d.remove();
          const to = studentById(p.dataset.sid);
          const nd = await copyDeck(sid, deckId, p.dataset.sid);
          toast(root, nd ? `Copiada para ${to ? to.name : 'o aluno'} ✓` : 'Não consegui copiar (limite de apresentações?).');
        });
      } else if (a === 'del') {
        if (confirm(`Excluir a apresentação “${meta.title}”? Isso apaga todos os slides dela e não dá para desfazer.`)) { deleteDeck(sid, deckId); paint(); }
      }
    });

    pushView(root, {
      onClose() { if (unStatus) unStatus(); Sync.flush(); },
      onKey(e) { if (e.key === 'Escape' && !root.querySelector('.sl-dlg')) back(); },
    });
    paint();
    if (teacher) {
      Sync.pullMetas(sid).then(changed => { if (changed) paint(); });
    } else {
      StudentData.list(sid).then(r => { loading = false; hidden = r.hidden; failed = Boolean(r.error); paint(); });
    }
  }

  // -------------------------------------------------------------------------
  // TEACHER ENTRY: pick who the slides are for
  // -------------------------------------------------------------------------
  function recentScore(s) {
    let t = 0;
    try {
      (typeof loadSessions === 'function' ? loadSessions(s.id) : []).forEach(x => {
        const d = Date.parse(x.date) || x.createdAt || 0;
        if (d > t) t = d;
      });
    } catch (e) { /* no class log */ }
    return Math.max(t, localDecks(s.id)[0] ? localDecks(s.id)[0].updatedAt : 0);
  }

  function openPicker() {
    if (isShare()) return;
    const list = students();
    if (!list.length) { alert('Cadastre um aluno primeiro.'); return; }
    const active = typeof getActiveStudentId === 'function' ? getActiveStudentId() : null;
    const rows = list.map(s => ({ s, t: recentScore(s), n: localDecks(s.id).length }))
      .sort((a, b) => (b.s.id === active) - (a.s.id === active) || b.t - a.t || String(a.s.name).localeCompare(String(b.s.name)));
    const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    openModal(`
      <div class="modal-content-pad lo-pick">
        <h3 id="modalTitle">🖼️ Slides da aula</h3>
        <p class="lo-pick-lead">Para qual aluno são os slides? Cada aluno tem as suas apresentações.</p>
        <input type="search" id="slPickSearch" class="lo-pick-search" placeholder="🔍 Buscar aluno…" autocomplete="off" />
        <div class="lo-pick-list" id="slPickList">
          ${rows.map(({ s, n }) => `
            <div class="lo-pick-item" data-q="${esc(norm(s.name))}">
              <button type="button" class="lo-pick-row" data-sid="${esc(s.id)}" style="--who:${esc(s.color || '#8e6d86')}">
                <span class="lo-pick-av">${esc(s.avatar || '🙂')}</span>
                <span class="lo-pick-txt"><b>${esc(s.name)}</b>
                  <small>${n ? n + ' apresentaç' + (n === 1 ? 'ão' : 'ões') : 'nenhuma apresentação ainda'}${s.id === active ? ' · aula atual' : ''} · ${visibleFor(s.id) ? '👁 visível no link' : 'escondido no link'}</small></span>
                <span class="lo-pick-go">▶</span>
              </button>
            </div>`).join('')}
        </div>
      </div>`, false);
    const search = document.getElementById('slPickSearch');
    search.addEventListener('input', () => {
      const q = norm(search.value);
      document.querySelectorAll('#slPickList .lo-pick-item').forEach(r => { r.hidden = Boolean(q) && !r.dataset.q.includes(q); });
    });
    search.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const first = [...document.querySelectorAll('#slPickList .lo-pick-item')].find(r => !r.hidden);
      if (first) first.querySelector('.lo-pick-row').click();
    });
    document.querySelectorAll('#slPickList .lo-pick-row').forEach(b => b.addEventListener('click', () => openForStudent(b.dataset.sid)));
    setTimeout(() => { try { search.focus({ preventScroll: true }); } catch (e) { /* old browser */ } }, 50);
  }

  function openForStudent(studentId) {
    if (isShare()) return;
    const student = studentById(studentId);
    if (!student) { alert('Escolha um aluno primeiro.'); return; }
    const ov = document.getElementById('modalOverlay');
    if (typeof closeModal === 'function' && ov && !ov.hidden) closeModal();
    openHome(student, true);
  }

  // The student's link: the tile "📝 Slides da aula" opens the read-only list.
  function openStudent(student) { openHome(student, false); }

  // -------------------------------------------------------------------------
  // IMAGES — pasted / dropped / uploaded, shrunk in the browser before saving
  // -------------------------------------------------------------------------
  async function loadBitmap(file) {
    if (typeof createImageBitmap === 'function') {
      try { const b = await createImageBitmap(file); return { el: b, w: b.width, h: b.height }; } catch (e) { /* fall back */ }
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve({ el: img, w: img.naturalWidth, h: img.naturalHeight, url }); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }
  // <= 1600 px on the longest side, WebP (JPEG where WebP cannot be made),
  // quality and size stepped down until it is about 250 KB.
  async function compressImage(file) {
    const bmp = await loadBitmap(file);
    if (!bmp.w || !bmp.h) throw new Error('empty');
    let scale = Math.min(1, IMG_MAX_SIDE / Math.max(bmp.w, bmp.h));
    let best = null;
    const bytesOf = url => Math.round((url.length - url.indexOf(',') - 1) * 3 / 4);
    for (let attempt = 0; attempt < 7; attempt++) {
      const cw = Math.max(1, Math.round(bmp.w * scale)), ch = Math.max(1, Math.round(bmp.h * scale));
      const cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const cx = cv.getContext('2d');
      cx.drawImage(bmp.el, 0, 0, cw, ch);
      for (const [type, q] of [['image/webp', 0.8], ['image/webp', 0.62], ['image/jpeg', 0.8], ['image/jpeg', 0.6]]) {
        let src = '';
        if (type === 'image/jpeg') {
          const c2 = document.createElement('canvas');
          c2.width = cw; c2.height = ch;
          const x2 = c2.getContext('2d');
          x2.fillStyle = '#fff'; x2.fillRect(0, 0, cw, ch); x2.drawImage(cv, 0, 0);
          src = c2.toDataURL(type, q);
        } else src = cv.toDataURL(type, q);
        if (!src.startsWith('data:' + type)) continue;         // this browser cannot make it
        const bytes = bytesOf(src);
        const res = { src, w: cw, h: ch, bytes };
        if (!best || bytes < best.bytes) best = res;
        if (bytes <= IMG_TARGET) { if (bmp.url) URL.revokeObjectURL(bmp.url); return res; }
      }
      scale *= 0.8;
    }
    if (bmp.url) URL.revokeObjectURL(bmp.url);
    if (!best) throw new Error('encode');
    return best;
  }

  // -------------------------------------------------------------------------
  // THE EDITOR (teacher only)
  // -------------------------------------------------------------------------
  const MIN_SIZE = 16;
  const SIZES = [16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 96, 128, 160, 200];
  const WIDTHS = [0, 2, 4, 8, 12, 20];
  const PLAIN = (() => { try { const d = document.createElement('div'); d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only'; } catch (e) { return false; } })();
  const isTyping = t => Boolean(t && t.closest && t.closest('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]'));
  const cloneObj = o => JSON.parse(JSON.stringify(o));

  async function openEditor(student, deckId, onExit) {
    if (window.innerWidth < 700) {
      alert('O editor de slides precisa de uma tela maior (computador ou tablet). No celular dá para ver e apresentar os slides, mas não editar. 🖥️');
      return;
    }
    const sid = student.id;
    ensureFonts();

    const root = document.createElement('div');
    root.className = 'sl-root sl-ed';
    root.innerHTML = '<div class="sl-loading"><span>🖼️</span><p>Abrindo os slides…</p></div>';
    let cleanup = null, keyHandler = null;
    pushView(root, { onClose() { if (cleanup) cleanup(); }, onKey(e) { if (keyHandler) keyHandler(e); } });

    let D = await loadDeck(sid, deckId);
    if (!D) { toast(root, 'Esta apresentação não existe mais.'); setTimeout(() => { if (stack.some(v => v.el === root)) back(); }, 600); return; }
    if (!root.isConnected) return;

    // ---- state ---------------------------------------------------------------
    let cur = D.meta.slideIds[0];
    let sel = [];
    let tool = 'select';              // select | pen | hl | eraser
    let editing = null;
    let live = {};                    // id -> temporary values while a gesture runs
    let k = 1;
    const hist = [], redoS = [];
    const penSpec = { pen: { c: '#2e2b2e', w: 6 }, hl: { c: '#f6cf3a', w: 30 } };
    let lastFont = 'baloo', lastColor = '#2e2b2e';
    let clip = null, clipTag = '', pasteN = 0;
    const pending = new Set();
    let metaPending = false, saveT = null, thumbT = null;
    const thumbDirty = new Set();
    let lastSnapKey = '', lastSnapT = 0;
    let unStatus = null, unFit = null;

    root.innerHTML = `
      <div class="sl-top">
        <button type="button" class="sl-ico" data-a="back" aria-label="Voltar" title="Voltar para as apresentações">←</button>
        <input class="sl-title" type="text" maxlength="120" aria-label="Nome da apresentação" value="${esc(D.meta.title)}" />
        <span class="sl-status" data-ref="status"></span>
        <span class="sl-top-gap"></span>
        <button type="button" class="sl-ico" data-a="undo" aria-label="Desfazer" title="Desfazer (Ctrl+Z)">↶</button>
        <button type="button" class="sl-ico" data-a="redo" aria-label="Refazer" title="Refazer (Ctrl+Y)">↷</button>
        <button type="button" class="sl-btn sl-btn--ok sl-present-btn" data-a="present" title="Apresentar em tela cheia">▶ Apresentar</button>
      </div>
      <div class="sl-toolbar" role="toolbar" aria-label="Ferramentas">
        <button type="button" class="sl-tool" data-t="select" title="Selecionar e mover (V)">↖<small>Selecionar</small></button>
        <button type="button" class="sl-tool" data-t="text" title="Adicionar texto">🔤<small>Texto</small></button>
        <button type="button" class="sl-tool" data-t="image" title="Adicionar imagem — ou cole com Ctrl+V / arraste um arquivo">🖼️<small>Imagem</small></button>
        <button type="button" class="sl-tool" data-t="shapes" title="Formas">⬛<small>Formas ▾</small></button>
        <button type="button" class="sl-tool" data-t="emoji" title="Emojis e adesivos">😀<small>Emojis ▾</small></button>
        <button type="button" class="sl-tool" data-t="draw" title="Desenhar (caneta e marca-texto)">✏️<small>Desenhar ▾</small></button>
        <button type="button" class="sl-tool" data-t="eraser" title="Apagar desenhos">🧽<small>Borracha</small></button>
        <button type="button" class="sl-tool" data-t="bg" title="Cor ou imagem de fundo">🎨<small>Fundo ▾</small></button>
        <button type="button" class="sl-tool" data-t="book" title="Usar uma página do livro online">📖<small>Livro</small></button>
        <input type="file" accept="image/*" multiple hidden data-ref="file" />
      </div>
      <div class="sl-ctx" data-ref="ctx" role="toolbar" aria-label="Formatação"></div>
      <div class="sl-body">
        <aside class="sl-side" aria-label="Slides">
          <div class="sl-side-acts">
            <button type="button" class="sl-btn" data-a="addslide" title="Novo slide em branco">➕ Novo</button>
            <button type="button" class="sl-btn sl-btn--ico" data-a="dupslide" aria-label="Duplicar slide" title="Duplicar este slide">⧉</button>
            <button type="button" class="sl-btn sl-btn--ico sl-btn--danger" data-a="delslide" aria-label="Excluir slide" title="Excluir este slide">🗑️</button>
          </div>
          <div class="sl-thumbs" data-ref="thumbs"></div>
        </aside>
        <main class="sl-canvas" data-ref="wrap">
          <div class="sl-stage" data-ref="stage" tabindex="-1">
            <div class="sl-bg" data-ref="bg"></div>
            <div class="sl-layer" data-ref="layer"></div>
            <div class="sl-over" data-ref="over"><div data-ref="sels"></div><div data-ref="guides"></div>
              <svg class="sl-live" viewBox="0 0 ${W} ${H}"><path data-ref="live" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <div class="sl-band" data-ref="band" hidden></div></div>
          </div>
          <div class="sl-hint" data-ref="hint"></div>
        </main>
      </div>`;

    const $ = n => root.querySelector(`[data-ref="${n}"]`);
    const wrapEl = $('wrap'), stageEl = $('stage'), bgEl = $('bg'), layerEl = $('layer');
    const selsEl = $('sels'), guidesEl = $('guides'), liveEl = $('live'), bandEl = $('band');
    const ctxEl = $('ctx'), thumbsEl = $('thumbs'), fileEl = $('file');

    // ---- getters ---------------------------------------------------------------
    const slide = () => D.slides[cur];
    const objs = () => slide().objects;
    const getObj = id => objs().find(o => o.id === id) || null;
    const selObjs = () => sel.map(getObj).filter(Boolean);
    const L = o => (live[o.id] ? { ...o, ...live[o.id] } : o);
    const elOf = id => layerEl.querySelector(`[data-oid="${id}"]`);
    const state = () => ({ meta: D.meta, slides: { ...D.slides }, cur });
    const dims = o => {
      if (o.type === 'text') { const el = elOf(o.id); return { w: o.w, h: el ? el.offsetHeight : Math.round(o.fs * o.lh) }; }
      return { w: o.w, h: o.h };
    };
    const rad = d => d * Math.PI / 180;
    function corners(o) {
      const d = dims(o), cx = o.x + d.w / 2, cy = o.y + d.h / 2, a = rad(o.r || 0), c = Math.cos(a), s = Math.sin(a);
      return [[-d.w / 2, -d.h / 2], [d.w / 2, -d.h / 2], [d.w / 2, d.h / 2], [-d.w / 2, d.h / 2]]
        .map(([x, y]) => ({ x: cx + x * c - y * s, y: cy + x * s + y * c }));
    }
    function aabb(list) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      list.forEach(o => corners(o).forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }));
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }

    // ---- saving + history ------------------------------------------------------
    function saveNow() {
      clearTimeout(saveT);
      pending.forEach(id => {
        const s = D.slides[id];
        if (!s) return;
        writeRec(sid, slideRecId(deckId, id), s);
        Sync.mark(sid, slideRecId(deckId, id));
      });
      pending.clear();
      if (metaPending) { writeRec(sid, metaId(deckId), D.meta); Sync.mark(sid, metaId(deckId)); metaPending = false; }
    }
    const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(saveNow, 250); };
    function touchSlide(id) { pending.add(id); thumbDirty.add(id); saveSoon(); scheduleThumbs(); }
    function setObjects(list, id) {
      id = id || cur;
      D.slides[id] = { ...D.slides[id], objects: list, updatedAt: nowMs() };
      touchSlide(id);
    }
    function setMeta(patch) { D.meta = { ...D.meta, ...patch, updatedAt: nowMs() }; metaPending = true; saveSoon(); }
    function pushHist(st) { hist.push(st); if (hist.length > 80) hist.shift(); redoS.length = 0; paintUndo(); }
    const snap = () => pushHist(state());
    function snapGrouped(key) {
      const t = nowMs();
      if (key !== lastSnapKey || t - lastSnapT > 900) snap();
      lastSnapKey = key; lastSnapT = t;
    }
    function restore(st) {
      const old = D.slides, t = nowMs();
      const slides = { ...st.slides };
      Object.keys({ ...old, ...slides }).forEach(id => {
        if (old[id] === slides[id]) return;
        if (slides[id]) { slides[id] = { ...slides[id], updatedAt: t }; pending.add(id); thumbDirty.add(id); }
        else Sync.markDelete(sid, slideRecId(deckId, id));
      });
      D = { meta: { ...st.meta, title: D.meta.title, updatedAt: t }, slides };
      metaPending = true; saveSoon();
      cur = D.meta.slideIds.includes(st.cur) ? st.cur : D.meta.slideIds[0];
      sel = []; editing = null; live = {};
      paintAll();
    }
    function undo() { if (editing) return; if (!hist.length) return; redoS.push(state()); restore(hist.pop()); paintUndo(); }
    function redo() { if (editing) return; if (!redoS.length) return; hist.push(state()); restore(redoS.pop()); paintUndo(); }

    // ---- painting --------------------------------------------------------------
    function paintUndo() {
      root.querySelector('[data-a="undo"]').disabled = !hist.length;
      root.querySelector('[data-a="redo"]').disabled = !redoS.length;
    }
    function paintStage() {
      const s = slide();
      bgEl.setAttribute('style', bgStyle(bgOf(D.meta, s)));
      layerEl.innerHTML = layerHTML(s.objects);
      stageEl.classList.toggle('is-empty', !s.objects.length);
      $('hint').hidden = Boolean(s.objects.length);
      $('hint').textContent = 'Slide em branco — use “Texto”, cole uma imagem (Ctrl+V) ou arraste um arquivo para cá.';
    }
    function paintThumbs() {
      thumbsEl.innerHTML = D.meta.slideIds.map((id, i) => `
        <div class="sl-th${id === cur ? ' is-on' : ''}" data-id="${id}" draggable="true" role="button" tabindex="0" aria-label="Slide ${i + 1}" title="Slide ${i + 1} — arraste para reordenar">
          <span class="sl-th-n">${i + 1}</span><div class="sl-th-m">${miniHTML(D.meta, D.slides[id], 148)}</div></div>`).join('');
      const on = thumbsEl.querySelector('.is-on');
      if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest' }); } catch (e) { /* old browser */ } }
    }
    function scheduleThumbs() {
      clearTimeout(thumbT);
      thumbT = setTimeout(() => {
        thumbDirty.forEach(id => {
          const th = thumbsEl.querySelector(`[data-id="${id}"] .sl-th-m`);
          if (th && D.slides[id]) th.innerHTML = miniHTML(D.meta, D.slides[id], 148);
        });
        thumbDirty.clear();
      }, 300);
    }
    const paintThumb = id => { thumbDirty.add(id || cur); scheduleThumbs(); };
    function paintAll() {
      paintStage(); paintThumbs(); paintSel(); paintCtx(); paintUndo(); paintTools();
      root.querySelector('.sl-title').value = D.meta.title;
    }
    function paintTools() {
      root.querySelectorAll('.sl-tool').forEach(b => {
        const t = b.dataset.t;
        b.classList.toggle('is-on', (t === 'select' && tool === 'select') || (t === 'draw' && (tool === 'pen' || tool === 'hl')) || (t === 'eraser' && tool === 'eraser'));
      });
      stageEl.dataset.tool = tool;
    }

    // selection overlay ------------------------------------------------------------
    const HPOS = { nw: [0, 0], n: [50, 0], ne: [100, 0], e: [100, 50], se: [100, 100], s: [50, 100], sw: [0, 100], w: [0, 50] };
    function paintSel() {
      selsEl.innerHTML = '';
      if (editing || tool !== 'select') return;
      const list = selObjs().map(L);
      if (!list.length) return;
      if (list.length === 1) {
        const o = list[0], d = dims(o);
        const hs = o.lock ? [] : (o.type === 'text' ? ['nw', 'ne', 'se', 'sw', 'e', 'w'] : Object.keys(HPOS));
        selsEl.innerHTML = `<div class="sl-sbox${o.lock ? ' is-locked' : ''}" style="left:${r1(o.x)}px;top:${r1(o.y)}px;width:${r1(d.w)}px;height:${r1(d.h)}px;${o.r ? `transform:rotate(${r1(o.r)}deg);` : ''}">
          ${hs.map(h => `<i class="sl-h" data-h="${h}" style="left:${HPOS[h][0]}%;top:${HPOS[h][1]}%"></i>`).join('')}
          ${o.lock ? '<b class="sl-lockbadge">🔒</b>' : '<i class="sl-h sl-hr" data-h="rot"></i>'}</div>`;
      } else {
        const b = aabb(list);
        selsEl.innerHTML = list.map(o => { const d = dims(o); return `<div class="sl-sbox sl-sbox--thin" style="left:${r1(o.x)}px;top:${r1(o.y)}px;width:${r1(d.w)}px;height:${r1(d.h)}px;${o.r ? `transform:rotate(${r1(o.r)}deg);` : ''}"></div>`; }).join('')
          + `<div class="sl-sbox sl-sbox--group" style="left:${r1(b.x)}px;top:${r1(b.y)}px;width:${r1(b.w)}px;height:${r1(b.h)}px"></div>`;
      }
    }
    function showGuides(gs) {
      guidesEl.innerHTML = (gs || []).map(g => g.v != null ? `<i class="sl-gv" style="left:${g.v}px"></i>` : `<i class="sl-gh" style="top:${g.h}px"></i>`).join('');
    }

    // live patch of one element while a gesture runs ----------------------------
    function patchEl(o0) {
      const o = L(o0), el = elOf(o.id);
      if (!el) return;
      if (o.type === 'shape') { el.outerHTML = objHTML(o); return; }
      el.style.left = r1(o.x) + 'px'; el.style.top = r1(o.y) + 'px';
      el.style.transform = o.r ? `rotate(${r1(o.r)}deg)` : '';
      if (o.type === 'text') { el.style.width = r1(o.w) + 'px'; el.style.fontSize = r1(o.fs) + 'px'; }
      else {
        el.style.width = r1(o.w) + 'px'; el.style.height = r1(o.h) + 'px';
        const sv = el.querySelector('svg');
        if (sv) { sv.setAttribute('width', r1(o.w)); sv.setAttribute('height', r1(o.h)); }
      }
    }
    function replaceEl(o) { const el = elOf(o.id); if (el) el.outerHTML = objHTML(o); }

    // ---- contextual toolbar ----------------------------------------------------
    const swb = (c, act, title) => `<button type="button" class="sl-swb" data-act="${act}" title="${title}" aria-label="${title}"><i style="background:${c === 'none' ? 'repeating-linear-gradient(45deg,#fff,#fff 3px,#e5403f 3px,#e5403f 4px)' : c}"></i></button>`;
    function paintCtx() {
      const list = selObjs();
      if (!list.length) {
        ctxEl.innerHTML = `<span class="sl-ctx-hint">${tool === 'pen' || tool === 'hl' ? '✏️ Desenhando — arraste sobre o slide. Escolha “↖ Selecionar” para voltar.' : tool === 'eraser' ? '🧽 Passe sobre um desenho para apagá-lo.' : 'Clique num objeto para formatar. Ctrl+V cola imagens. Duplo clique no slide cria um texto.'}</span>`;
        return;
      }
      const one = list.length === 1 ? list[0] : null;
      let h = '';
      if (one && one.type === 'text') {
        const o = one;
        h += `<select class="sl-sel" data-act="font" aria-label="Fonte">${FONTS.map(f => `<option value="${f.id}"${o.ff === f.id ? ' selected' : ''}>${f.name}</option>`).join('')}</select>
          <button type="button" class="sl-btn sl-btn--ico" data-act="fs-" aria-label="Diminuir letra" title="Diminuir letra">−</button>
          <input class="sl-num" type="number" min="8" max="600" value="${Math.round(o.fs)}" data-act="fs" aria-label="Tamanho da letra" />
          <button type="button" class="sl-btn sl-btn--ico" data-act="fs+" aria-label="Aumentar letra" title="Aumentar letra">+</button>
          ${swb(o.c, 'tcolor', 'Cor do texto')}
          <button type="button" class="sl-btn sl-btn--ico${o.b ? ' is-on' : ''}" data-act="bold" aria-label="Negrito" title="Negrito (Ctrl+B)"><b>B</b></button>
          <button type="button" class="sl-btn sl-btn--ico${o.i ? ' is-on' : ''}" data-act="italic" aria-label="Itálico" title="Itálico"><i>I</i></button>
          <button type="button" class="sl-btn sl-btn--ico${o.u ? ' is-on' : ''}" data-act="underline" aria-label="Sublinhado" title="Sublinhado"><u>U</u></button>
          ${['left', 'center', 'right'].map(a => `<button type="button" class="sl-btn sl-btn--ico${o.al === a ? ' is-on' : ''}" data-act="al-${a}" aria-label="Alinhar ${a}" title="Alinhar">${a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}</button>`).join('')}
          <select class="sl-sel sl-sel--s" data-act="lh" aria-label="Espaço entre linhas" title="Espaço entre linhas">${[1, 1.2, 1.5, 2].map(v => `<option value="${v}"${Math.abs(o.lh - v) < 0.05 ? ' selected' : ''}>${v}×</option>`).join('')}</select>
          <button type="button" class="sl-btn" data-act="edit" title="Editar o texto (Enter)">✎ Editar</button>`;
      }
      if (one && one.type === 'shape') {
        const o = one;
        h += `<span class="sl-lbl">Preencher</span>${o.shape === 'line' ? '' : swb(o.fill, 'fill', 'Cor de preenchimento')}
          <span class="sl-lbl">Contorno</span>${swb(o.stroke, 'stroke', 'Cor do contorno')}
          <select class="sl-sel sl-sel--s" data-act="sw" aria-label="Espessura do contorno" title="Espessura">${WIDTHS.map(v => `<option value="${v}"${Math.round(o.sw) === v ? ' selected' : ''}>${v ? v + ' px' : 'sem'}</option>`).join('')}</select>
          <label class="sl-lbl">Opacidade <input type="range" min="10" max="100" value="${Math.round((o.op == null ? 1 : o.op) * 100)}" data-act="op" aria-label="Opacidade" /></label>`;
      }
      if (one && one.type === 'image') {
        h += `<label class="sl-lbl">Opacidade <input type="range" min="10" max="100" value="${Math.round((one.op == null ? 1 : one.op) * 100)}" data-act="op" aria-label="Opacidade" /></label>
          <button type="button" class="sl-btn" data-act="fitslide" title="Ocupar o slide todo mantendo a proporção">⤢ Ajustar ao slide</button>`;
      }
      if (one && one.type === 'draw') {
        h += `${swb(one.c, 'dcolor', 'Cor do traço')}<span class="sl-lbl">Traço</span>
          <select class="sl-sel sl-sel--s" data-act="dsw" aria-label="Espessura do traço">${[3, 6, 10, 16, 30, 50].map(v => `<option value="${v}"${Math.round(one.sw) === v ? ' selected' : ''}>${v}</option>`).join('')}</select>`;
      }
      if (!one) h += `<span class="sl-ctx-hint">${list.length} objetos selecionados</span>`;
      h += `<span class="sl-ctx-gap"></span>
        <button type="button" class="sl-btn sl-btn--ico" data-act="centerH" aria-label="Centralizar na horizontal" title="Centralizar na horizontal">⬌</button>
        <button type="button" class="sl-btn sl-btn--ico" data-act="centerV" aria-label="Centralizar na vertical" title="Centralizar na vertical">⬍</button>
        <button type="button" class="sl-btn sl-btn--ico" data-act="front" aria-label="Trazer para a frente" title="Trazer para a frente">⤒</button>
        <button type="button" class="sl-btn sl-btn--ico" data-act="fwd" aria-label="Avançar uma camada" title="Avançar uma camada">↑</button>
        <button type="button" class="sl-btn sl-btn--ico" data-act="bwd" aria-label="Recuar uma camada" title="Recuar uma camada">↓</button>
        <button type="button" class="sl-btn sl-btn--ico" data-act="back" aria-label="Enviar para trás" title="Enviar para trás">⤓</button>
        <button type="button" class="sl-btn sl-btn--ico${list.every(o => o.lock) ? ' is-on' : ''}" data-act="lock" aria-label="Travar" title="Travar / destravar">🔒</button>
        <button type="button" class="sl-btn sl-btn--ico" data-act="dup" aria-label="Duplicar" title="Duplicar (Ctrl+D)">⧉</button>
        <button type="button" class="sl-btn sl-btn--ico sl-btn--danger" data-act="del" aria-label="Excluir" title="Excluir (Delete)">🗑️</button>`;
      ctxEl.innerHTML = h;
    }

    // applying a change to the selected objects ------------------------------------
    function setProps(patch, key, only) {
      const ids = new Set(sel);
      if (!ids.size) return;
      snapGrouped(key || Object.keys(patch).join());
      const next = objs().map(o => (ids.has(o.id) && (!only || only(o)) ? { ...o, ...patch } : o));
      setObjects(next);
      sel.forEach(id => { const o = getObj(id); if (o) replaceEl(o); });
      paintSel();
    }
    function mutateSel(fn, undoKey) {
      const ids = new Set(sel);
      if (undoKey) snapGrouped(undoKey); else snap();
      setObjects(objs().map(o => (ids.has(o.id) ? fn(o) : o)));
    }
    function layerOp(op) {
      if (!sel.length) return;
      snap();
      let list = objs().slice();
      const ids = sel.slice();
      if (op === 'front' || op === 'back') {
        const picked = list.filter(o => ids.includes(o.id)), rest = list.filter(o => !ids.includes(o.id));
        list = op === 'front' ? rest.concat(picked) : picked.concat(rest);
      } else if (op === 'fwd') {
        for (let i = list.length - 2; i >= 0; i--) if (ids.includes(list[i].id) && !ids.includes(list[i + 1].id)) [list[i], list[i + 1]] = [list[i + 1], list[i]];
      } else {
        for (let i = 1; i < list.length; i++) if (ids.includes(list[i].id) && !ids.includes(list[i - 1].id)) [list[i], list[i - 1]] = [list[i - 1], list[i]];
      }
      setObjects(list);
      paintStage(); paintSel();
    }
    function deleteSel() {
      if (!sel.length) return;
      snap();
      const ids = new Set(sel);
      setObjects(objs().filter(o => !ids.has(o.id)));
      sel = [];
      paintStage(); paintSel(); paintCtx();
    }
    function duplicateSel() {
      const list = selObjs();
      if (!list.length) return;
      if (objs().length + list.length > MAX_OBJECTS) { toast(root, 'Objetos demais neste slide.'); return; }
      snap();
      const copies = list.map(o => ({ ...cloneObj(o), id: rid(), x: o.x + 28, y: o.y + 28 }));
      setObjects(objs().concat(copies));
      sel = copies.map(o => o.id);
      paintStage(); paintSel(); paintCtx();
    }
    function moveSelBy(dx, dy, key) {
      const ids = new Set(sel);
      if (!ids.size) return;
      snapGrouped(key || 'nudge');
      setObjects(objs().map(o => (ids.has(o.id) && !o.lock ? { ...o, x: o.x + dx, y: o.y + dy } : o)));
      sel.forEach(id => { const o = getObj(id); if (o) patchEl(o); });
      paintSel();
    }
    function centerSel(axis) {
      const list = selObjs().filter(o => !o.lock);
      if (!list.length) return;
      const b = aabb(list);
      const dx = axis === 'h' ? W / 2 - (b.x + b.w / 2) : 0, dy = axis === 'v' ? H / 2 - (b.y + b.h / 2) : 0;
      moveSelBy(dx, dy, 'center' + axis);
    }

    // ---- adding things ---------------------------------------------------------
    function addObject(o, edit) {
      if (objs().length >= MAX_OBJECTS) { toast(root, 'Objetos demais neste slide. Use outro slide.'); return null; }
      snap();
      o.id = rid(); o.r = 0; o.lock = false;
      setObjects(objs().concat([o]));
      tool = 'select'; sel = [o.id];
      paintStage(); paintSel(); paintCtx(); paintTools();
      return o;
    }
    function addText(text, at) {
      const long = text && text.length > 40;
      const o = addObject({
        type: 'text', x: at ? clamp(at.x - 100, 20, W - 300) : (long ? 140 : 360), y: at ? clamp(at.y - 40, 20, H - 120) : (long ? 120 : 280),
        w: long ? 1000 : 560, h: 90, text: text || 'Escreva aqui', ff: lastFont, fs: long ? 44 : 72, c: lastColor,
        b: false, i: false, u: false, al: 'left', lh: 1.2,
      });
      if (o && !text) startEdit(o.id, true);
    }
    function addShape(shape) {
      const sz = { rect: [360, 220], rrect: [360, 220], ellipse: [260, 260], triangle: [280, 250], star: [280, 270], heart: [280, 250], arrow: [360, 180], line: [480, 24] }[shape] || [260, 200];
      addObject({
        type: 'shape', shape, x: (W - sz[0]) / 2 + (objs().length % 5) * 18, y: (H - sz[1]) / 2 + (objs().length % 5) * 18, w: sz[0], h: sz[1],
        fill: shape === 'line' ? 'none' : '#f05d77', stroke: shape === 'line' ? '#2e2b2e' : '#2e2b2e', sw: shape === 'line' ? 8 : 0,
      });
    }
    function addEmoji(em) {
      addObject({ type: 'text', x: 540 + (objs().length % 5) * 20, y: 260 + (objs().length % 5) * 20, w: 220, h: 200, text: em, ff: 'baloo', fs: 150, c: '#2e2b2e', b: false, i: false, u: false, al: 'center', lh: 1.1 });
    }
    async function addImageFiles(files, at) {
      let n = 0;
      for (const f of files) {
        if (objs().length >= MAX_OBJECTS) break;
        let r;
        try { r = await compressImage(f); } catch (e) { toast(root, 'Não consegui abrir esta imagem. Tente outro arquivo (JPG, PNG, WebP).'); continue; }
        const projected = JSON.stringify(slide()).length + r.src.length;
        if (projected > SLIDE_MAX) { toast(root, 'Este slide ficaria pesado demais. Coloque esta imagem em outro slide. 🖼️', 4200); continue; }
        const sc = Math.min(1, 900 / r.w, 520 / r.h);
        const w = Math.round(r.w * sc), h = Math.round(r.h * sc);
        const x = at ? clamp(at.x - w / 2, 0, W - w) : Math.round((W - w) / 2) + n * 24, y = at ? clamp(at.y - h / 2, 0, H - h) : Math.round((H - h) / 2) + n * 24;
        addObject({ type: 'image', src: r.src, x, y, w, h });
        n++;
        if (projected > SLIDE_WARN) toast(root, 'Este slide está ficando pesado. Prefira repartir as imagens em mais slides. ⚠️', 4200);
        else if (r.bytes > IMG_TARGET * 1.3) toast(root, 'Imagem grande — salva comprimida.');
      }
    }

    // ---- text editing in place --------------------------------------------------
    function startEdit(id, all) {
      const o = getObj(id);
      if (!o || o.type !== 'text' || o.lock) return;
      if (editing) commitEdit();
      editing = id; sel = [id];
      paintSel();
      const el = elOf(id);
      if (!el) { editing = null; return; }
      el.contentEditable = PLAIN ? 'plaintext-only' : 'true';
      el.classList.add('is-editing');
      el.spellcheck = false;
      el.textContent = o.text;
      el.focus();
      const rg = document.createRange(), s = window.getSelection();
      rg.selectNodeContents(el);
      if (!all) rg.collapse(false);
      s.removeAllRanges(); s.addRange(rg);
      el.onpaste = ev => { ev.preventDefault(); const t = (ev.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, t); };
      el.onblur = () => commitEdit();
      el.onkeydown = ev => {
        ev.stopPropagation();
        if (ev.key === 'Escape') { ev.preventDefault(); el.blur(); }
        else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'b') { ev.preventDefault(); }
      };
      paintCtx();
    }
    function commitEdit() {
      if (!editing) return;
      const id = editing;
      editing = null;
      const el = elOf(id), o = getObj(id);
      if (!el || !o) { paintStage(); paintSel(); return; }
      const text = String(el.innerText || '').replace(/​/g, '').replace(/ /g, ' ').replace(/\n$/, '');
      el.contentEditable = 'false'; el.classList.remove('is-editing'); el.onblur = null; el.onkeydown = null; el.onpaste = null;
      if (!text.trim()) {
        snap(); setObjects(objs().filter(x => x.id !== id)); sel = [];
      } else if (text !== o.text) {
        snap();
        setObjects(objs().map(x => (x.id === id ? { ...x, text, h: el.offsetHeight } : x)));
      }
      paintStage(); paintSel(); paintCtx();
    }

    // ---- pointer gestures ---------------------------------------------------------
    function pt(e) {
      const r = stageEl.getBoundingClientRect();
      return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
    }
    function track(e, move, up) {
      const pid = e.pointerId;
      try { stageEl.setPointerCapture(pid); } catch (er) { /* ignore */ }
      const mv = ev => { if (ev.pointerId === pid) move(ev, pt(ev)); };
      const end = ev => {
        if (ev.pointerId !== pid) return;
        window.removeEventListener('pointermove', mv);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        try { stageEl.releasePointerCapture(pid); } catch (er) { /* ignore */ }
        up(ev, ev.type === 'pointercancel');
      };
      window.addEventListener('pointermove', mv);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    }
    function commitLive(before) {
      pushHist(before);
      const lv = live;
      setObjects(objs().map(o => (lv[o.id] ? { ...o, ...lv[o.id] } : o)));
      live = {};
      sel.forEach(id => { const o = getObj(id); if (o) replaceEl(o); });
      paintSel(); paintCtx();
    }

    function snapMove(bb, dx, dy) {
      const th = 7 / k, guides = [];
      const others = objs().filter(o => !sel.includes(o.id));
      const tx = [0, W / 2, W], ty = [0, H / 2, H];
      others.forEach(o => { const b = aabb([o]); tx.push(b.x, b.x + b.w / 2, b.x + b.w); ty.push(b.y, b.y + b.h / 2, b.y + b.h); });
      const pick = (cands, targets) => {
        let best = null;
        cands.forEach(c => targets.forEach(t => { const d = t - c; if (Math.abs(d) < th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t }; }));
        return best;
      };
      const bx = pick([bb.x + dx, bb.x + bb.w / 2 + dx, bb.x + bb.w + dx], tx);
      const by = pick([bb.y + dy, bb.y + bb.h / 2 + dy, bb.y + bb.h + dy], ty);
      if (bx) { dx += bx.d; guides.push({ v: bx.t }); }
      if (by) { dy += by.d; guides.push({ h: by.t }); }
      return { dx, dy, guides };
    }

    function startMove(e, p0) {
      const items = selObjs().filter(o => !o.lock);
      if (!items.length) return;
      const base = items.map(o => ({ id: o.id, x: o.x, y: o.y }));
      const bb = aabb(items);
      const before = state();
      let moved = false;
      track(e, (ev, p) => {
        let dx = p.x - p0.x, dy = p.y - p0.y;
        if (!moved && Math.hypot(dx, dy) * k < 4) return;
        moved = true;
        if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
        const sn = ev.altKey ? { dx, dy, guides: [] } : snapMove(bb, dx, dy);
        showGuides(sn.guides);
        base.forEach(b => { live[b.id] = { x: r1(b.x + sn.dx), y: r1(b.y + sn.dy) }; patchEl(getObj(b.id)); });
        paintSel();
      }, (ev, cancel) => {
        showGuides([]);
        if (!moved || cancel) { live = {}; if (moved) { paintStage(); paintSel(); } return; }
        commitLive(before);
      });
    }

    function startHandle(e, h) {
      const o0 = getObj(sel[0]);
      if (!o0 || o0.lock) return;
      const before = state();
      const d0 = dims(o0), c0 = { x: o0.x + d0.w / 2, y: o0.y + d0.h / 2 }, th = rad(o0.r || 0);
      const cos = Math.cos(th), sin = Math.sin(th);
      if (h === 'rot') {
        let moved = false;
        track(e, (ev, p) => {
          let a = Math.atan2(p.y - c0.y, p.x - c0.x) * 180 / Math.PI + 90;
          if (ev.shiftKey) a = Math.round(a / 15) * 15;
          else { const n = Math.round(a / 90) * 90; if (Math.abs(a - n) < 3) a = n; }
          a = ((a % 360) + 540) % 360 - 180;
          moved = true;
          live[o0.id] = { r: r1(a) };
          patchEl(o0); paintSel();
        }, (ev, cancel) => { if (!moved || cancel) { live = {}; paintStage(); paintSel(); return; } commitLive(before); });
        return;
      }
      const sx = h.includes('e') ? 1 : h.includes('w') ? -1 : 0, sy = h.includes('s') ? 1 : h.includes('n') ? -1 : 0;
      const corner = sx !== 0 && sy !== 0;
      let moved = false;
      track(e, (ev, p) => {
        const dx = p.x - c0.x, dy = p.y - c0.y;
        const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;
        const ax = sx ? -sx * d0.w / 2 : 0, ay = sy ? -sy * d0.h / 2 : 0;
        let nw = sx ? Math.max(MIN_SIZE, (lx - ax) * sx) : d0.w;
        let nh = sy ? Math.max(MIN_SIZE, (ly - ay) * sy) : d0.h;
        const patch = {};
        let cxl, cyl;
        if (o0.type === 'text') {
          if (corner) { const f = clamp(nw / d0.w, 0.1, 12); nw = d0.w * f; patch.fs = r1(clamp(o0.fs * f, 8, 600)); }
          const el = elOf(o0.id);
          if (el) { el.style.width = r1(nw) + 'px'; if (patch.fs) el.style.fontSize = patch.fs + 'px'; nh = el.offsetHeight; }
          cxl = sx ? ax + sx * nw / 2 : 0;
          cyl = sy ? ay + sy * nh / 2 : -d0.h / 2 + nh / 2;
        } else {
          if (corner && (o0.type === 'image' || ev.shiftKey)) { const f = Math.max(nw / d0.w, nh / d0.h); nw = d0.w * f; nh = d0.h * f; }
          cxl = sx ? ax + sx * nw / 2 : 0;
          cyl = sy ? ay + sy * nh / 2 : 0;
        }
        const ncx = c0.x + cxl * cos - cyl * sin, ncy = c0.y + cxl * sin + cyl * cos;
        moved = true;
        live[o0.id] = { x: r1(ncx - nw / 2), y: r1(ncy - nh / 2), w: r1(nw), h: r1(nh), ...patch };
        patchEl(o0); paintSel();
      }, (ev, cancel) => {
        if (!moved || cancel) { live = {}; paintStage(); paintSel(); return; }
        commitLive(before);
      });
    }

    function startBand(e, p0) {
      const additive = e.shiftKey;
      if (!additive && sel.length) { sel = []; paintSel(); paintCtx(); }
      const start = sel.slice();
      let moved = false;
      track(e, (ev, p) => {
        const x = Math.min(p0.x, p.x), y = Math.min(p0.y, p.y), w = Math.abs(p.x - p0.x), h = Math.abs(p.y - p0.y);
        if (!moved && Math.hypot(w, h) * k < 4) return;
        moved = true;
        bandEl.hidden = false;
        bandEl.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
        const hit = objs().filter(o => { const b = aabb([o]); return b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y; }).map(o => o.id);
        sel = [...new Set(start.concat(hit))];
        paintSel();
      }, () => { bandEl.hidden = true; paintCtx(); });
    }

    function startDraw(e, p0) {
      const spec = penSpec[tool], kind = tool;
      const pts = [p0.x, p0.y];
      liveEl.setAttribute('stroke', spec.c); liveEl.setAttribute('stroke-width', spec.w);
      liveEl.setAttribute('stroke-opacity', kind === 'hl' ? '.45' : '1');
      liveEl.setAttribute('d', strokeD(pts));
      track(e, (ev, p) => {
        const n = pts.length;
        if (Math.hypot(p.x - pts[n - 2], p.y - pts[n - 1]) < 1.5 / k) return;
        pts.push(p.x, p.y);
        liveEl.setAttribute('d', strokeD(pts));
      }, (ev, cancel) => {
        liveEl.setAttribute('d', '');
        if (cancel) return;
        const sp = simplify(pts, 1.1);
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (let i = 0; i < sp.length; i += 2) { x0 = Math.min(x0, sp[i]); x1 = Math.max(x1, sp[i]); y0 = Math.min(y0, sp[i + 1]); y1 = Math.max(y1, sp[i + 1]); }
        const pad = spec.w / 2;
        const ox = x0 - pad, oy = y0 - pad, w = Math.max(4, x1 - x0 + spec.w), h = Math.max(4, y1 - y0 + spec.w);
        const keepTool = tool;
        const o = addObject({
          type: 'draw', t: kind, c: spec.c, sw: spec.w, x: r1(ox), y: r1(oy), w: r1(w), h: r1(h), vw: r1(w), vh: r1(h),
          p: sp.map((v, i) => r1(v - (i % 2 ? oy : ox))),
        });
        if (o) { tool = keepTool; sel = []; paintSel(); paintCtx(); paintTools(); }
      });
    }

    function hitDraw(o, p, r) {
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2, a = -rad(o.r || 0);
      const dx = p.x - cx, dy = p.y - cy;
      const lx = dx * Math.cos(a) - dy * Math.sin(a) + o.w / 2, ly = dx * Math.sin(a) + dy * Math.cos(a) + o.h / 2;
      const vx = lx * o.vw / o.w, vy = ly * o.vh / o.h, tol = r + o.sw / 2, q = o.p;
      if (q.length < 4) return Math.hypot(vx - q[0], vy - q[1]) <= tol;
      for (let i = 0; i + 3 < q.length; i += 2) if (segDist(vx, vy, q[i], q[i + 1], q[i + 2], q[i + 3]) <= tol) return true;
      return false;
    }
    function startErase(e, p0) {
      const hit = new Set();
      const test = p => {
        objs().forEach(o => {
          if (o.type !== 'draw' || hit.has(o.id) || o.lock) return;
          if (hitDraw(o, p, 10)) { hit.add(o.id); const el = elOf(o.id); if (el) el.style.display = 'none'; }
        });
      };
      test(p0);
      track(e, (ev, p) => test(p), () => {
        if (!hit.size) return;
        snap();
        setObjects(objs().filter(o => !hit.has(o.id)));
        sel = sel.filter(id => !hit.has(id));
        paintStage(); paintSel(); paintCtx();
      });
    }

    stageEl.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const ed = editing ? elOf(editing) : null;
      if (ed && ed.contains(e.target)) return;           // typing: let the browser place the caret
      if (editing) commitEdit();
      const ae = document.activeElement;
      if (ae && ae !== document.body && root.contains(ae) && ae.matches('input, select, textarea')) ae.blur();
      closePop();
      const p = pt(e);
      e.preventDefault();
      if (tool === 'pen' || tool === 'hl') { startDraw(e, p); return; }
      if (tool === 'eraser') { startErase(e, p); return; }
      const hEl = e.target.closest('[data-h]');
      if (hEl) { startHandle(e, hEl.dataset.h); return; }
      const oEl = e.target.closest('.sl-layer [data-oid]');
      if (oEl) {
        const id = oEl.dataset.oid;
        if (e.shiftKey) {
          sel = sel.includes(id) ? sel.filter(x => x !== id) : sel.concat([id]);
          paintSel(); paintCtx();
          return;
        }
        if (!sel.includes(id)) { sel = [id]; paintSel(); paintCtx(); }
        startMove(e, p);
        return;
      }
      startBand(e, p);
    });
    stageEl.addEventListener('dblclick', e => {
      if (tool !== 'select') return;
      const oEl = e.target.closest('.sl-layer [data-oid]');
      if (oEl) { const o = getObj(oEl.dataset.oid); if (o && o.type === 'text') startEdit(o.id, false); return; }
      if (e.target.closest('[data-h]')) return;
      addText(null, pt(e));
    });
    // files dropped on the slide
    stageEl.addEventListener('dragover', e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); stageEl.classList.add('is-drop'); } });
    stageEl.addEventListener('dragleave', () => stageEl.classList.remove('is-drop'));
    stageEl.addEventListener('drop', e => {
      stageEl.classList.remove('is-drop');
      const files = [...((e.dataTransfer && e.dataTransfer.files) || [])].filter(f => /^image\//.test(f.type));
      if (!files.length) return;
      e.preventDefault();
      addImageFiles(files, pt(e));
    });
    // the area around the slide counts as "empty"
    wrapEl.addEventListener('pointerdown', e => {
      if (e.target !== wrapEl) return;
      if (editing) commitEdit();
      sel = []; paintSel(); paintCtx(); closePop();
    });

    // ---- slides panel -----------------------------------------------------------
    function gotoSlide(id) {
      if (!D.slides[id] || id === cur) return;
      if (editing) commitEdit();
      cur = id; sel = []; live = {};
      paintStage(); paintSel(); paintCtx();
      thumbsEl.querySelectorAll('.sl-th').forEach(t => t.classList.toggle('is-on', t.dataset.id === id));
    }
    function addSlide() {
      if (D.meta.slideIds.length >= MAX_SLIDES) { toast(root, `Limite de ${MAX_SLIDES} slides por apresentação.`); return; }
      if (editing) commitEdit();
      snap();
      const id = rid(), ids = D.meta.slideIds.slice();
      ids.splice(ids.indexOf(cur) + 1, 0, id);
      D.slides[id] = blankSlide();
      setMeta({ slideIds: ids }); touchSlide(id);
      cur = id; sel = [];
      paintAll();
    }
    function dupSlide() {
      if (D.meta.slideIds.length >= MAX_SLIDES) { toast(root, `Limite de ${MAX_SLIDES} slides por apresentação.`); return; }
      if (editing) commitEdit();
      snap();
      const id = rid(), ids = D.meta.slideIds.slice();
      ids.splice(ids.indexOf(cur) + 1, 0, id);
      D.slides[id] = { ...cloneObj(slide()), updatedAt: nowMs() };
      setMeta({ slideIds: ids }); touchSlide(id);
      cur = id; sel = [];
      paintAll();
    }
    function delSlide() {
      if (editing) commitEdit();
      const ids = D.meta.slideIds;
      if (ids.length <= 1) {
        if (confirm('Este é o único slide da apresentação. Limpar o conteúdo dele?')) {
          snap(); D.slides[cur] = { ...blankSlide(), updatedAt: nowMs() }; touchSlide(cur); sel = []; paintAll();
        }
        return;
      }
      if (!confirm(`Excluir o slide ${ids.indexOf(cur) + 1}? Dá para desfazer com Ctrl+Z enquanto esta tela estiver aberta.`)) return;
      snap();
      const i = ids.indexOf(cur), next = ids.filter(x => x !== cur);
      const gone = cur;
      delete D.slides[gone];
      Sync.markDelete(sid, slideRecId(deckId, gone));
      pending.delete(gone);
      setMeta({ slideIds: next });
      cur = next[Math.min(i, next.length - 1)]; sel = [];
      paintAll();
    }
    function moveSlide(id, beforeId, after) {
      const ids = D.meta.slideIds.filter(x => x !== id);
      let at = ids.indexOf(beforeId);
      if (at < 0) return;
      if (after) at++;
      ids.splice(at, 0, id);
      if (ids.join() === D.meta.slideIds.join()) return;
      snap();
      setMeta({ slideIds: ids });
      paintThumbs();
    }
    thumbsEl.addEventListener('click', e => { const t = e.target.closest('.sl-th'); if (t) gotoSlide(t.dataset.id); });
    thumbsEl.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('sl-th')) { e.preventDefault(); gotoSlide(e.target.dataset.id); } });
    let dragId = null;
    thumbsEl.addEventListener('dragstart', e => {
      const t = e.target.closest('.sl-th');
      if (!t) return;
      dragId = t.dataset.id;
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'sl:' + dragId); } catch (er) { /* ignore */ }
    });
    thumbsEl.addEventListener('dragover', e => {
      if (!dragId) return;
      e.preventDefault();
      const t = e.target.closest('.sl-th');
      thumbsEl.querySelectorAll('.sl-th').forEach(x => x.classList.remove('is-over-a', 'is-over-b'));
      if (!t || t.dataset.id === dragId) return;
      const r = t.getBoundingClientRect();
      t.classList.add(e.clientY > r.top + r.height / 2 ? 'is-over-a' : 'is-over-b');
    });
    thumbsEl.addEventListener('drop', e => {
      if (!dragId) return;
      e.preventDefault();
      const t = e.target.closest('.sl-th');
      if (t && t.dataset.id !== dragId) { const r = t.getBoundingClientRect(); moveSlide(dragId, t.dataset.id, e.clientY > r.top + r.height / 2); }
      dragId = null;
      thumbsEl.querySelectorAll('.sl-th').forEach(x => x.classList.remove('is-over-a', 'is-over-b'));
    });
    thumbsEl.addEventListener('dragend', () => { dragId = null; thumbsEl.querySelectorAll('.sl-th').forEach(x => x.classList.remove('is-over-a', 'is-over-b')); });

    // ---- popovers: shapes, emojis, drawing, background ----------------------------
    function shapePop(anchor) {
      const icon = id => {
        const o = { shape: id, w: 40, h: id === 'line' ? 20 : 34, fill: '#8e6d86', stroke: '#2e2b2e', sw: id === 'line' ? 4 : 0 };
        return `<svg width="40" height="${o.h}" viewBox="0 0 40 ${o.h}">${shapeInner(o)}</svg>`;
      };
      openPop(root, anchor, `<p class="sl-pop-t">Formas</p><div class="sl-grid sl-grid--shapes">${SHAPES.map(s => `<button type="button" class="sl-gb" data-shape="${s.id}" title="${s.name}" aria-label="${s.name}">${icon(s.id)}</button>`).join('')}</div>`,
        el => el.addEventListener('click', e => { const b = e.target.closest('[data-shape]'); if (b) { closePop(); addShape(b.dataset.shape); } }));
    }
    function emojiPop(anchor) {
      openPop(root, anchor, `<p class="sl-pop-t">Emojis e adesivos</p><div class="sl-grid sl-grid--emoji">${EMOJIS.map(em => `<button type="button" class="sl-gb" data-em="${em}" aria-label="${em}">${em}</button>`).join('')}</div>`,
        el => el.addEventListener('click', e => { const b = e.target.closest('[data-em]'); if (b) { closePop(); addEmoji(b.dataset.em); } }), 'sl-pop--wide');
    }
    function drawPop(anchor) {
      const html = () => {
        const sp = penSpec[tool === 'hl' ? 'hl' : 'pen'];
        const sizes = tool === 'hl' ? [18, 30, 52] : [3, 6, 12];
        return `<p class="sl-pop-t">Desenhar</p>
          <div class="sl-pop-row"><button type="button" class="sl-btn${tool === 'pen' ? ' is-on' : ''}" data-dt="pen">✏️ Caneta</button><button type="button" class="sl-btn${tool === 'hl' ? ' is-on' : ''}" data-dt="hl">🖍️ Marca-texto</button></div>
          <div class="sl-sws">${SCHOOL.concat(BRIGHT).map(c => `<button type="button" class="sl-sw${sp.c === c ? ' is-on' : ''}" data-dc="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join('')}</div>
          <div class="sl-pop-row">${sizes.map(s => `<button type="button" class="sl-btn${sp.w === s ? ' is-on' : ''}" data-dw="${s}" aria-label="Espessura ${s}"><i class="sl-dot" style="width:${Math.min(s, 30)}px;height:${Math.min(s, 30)}px"></i></button>`).join('')}</div>`;
      };
      tool = tool === 'hl' ? 'hl' : 'pen';
      if (editing) commitEdit();
      sel = []; paintSel(); paintCtx(); paintTools();
      const el = openPop(root, anchor, html(), pe => {
        pe.addEventListener('click', e => {
          const t = e.target.closest('[data-dt]'), c = e.target.closest('[data-dc]'), w = e.target.closest('[data-dw]');
          if (t) tool = t.dataset.dt;
          else if (c) penSpec[tool === 'hl' ? 'hl' : 'pen'].c = c.dataset.dc;
          else if (w) penSpec[tool === 'hl' ? 'hl' : 'pen'].w = Number(w.dataset.dw);
          else return;
          pe.innerHTML = html(); paintTools(); paintCtx();
        });
      });
      return el;
    }
    function bgPop(anchor) {
      const s = slide(), bg = s.bg || D.meta.bg || { color: '#ffffff' };
      const cur0 = (bg.color || '#ffffff').toLowerCase();
      const sw = c => `<button type="button" class="sl-sw${!bg.grad && cur0 === c ? ' is-on' : ''}" data-bc="${c}" style="background:${c}" aria-label="Fundo ${c}"></button>`;
      openPop(root, anchor, `
        <p class="sl-pop-t">Fundo deste slide</p>
        <div class="sl-sws">${SCHOOL.map(sw).join('')}</div>
        <div class="sl-sws">${BRIGHT.map(sw).join('')}</div>
        <div class="sl-sws">${PASTEL.map(sw).join('')}</div>
        <div class="sl-sws">${GRADS.map((g, i) => `<button type="button" class="sl-sw" data-bg="${i}" style="background:linear-gradient(135deg,${g[0]},${g[1]})" aria-label="Degradê ${i + 1}"></button>`).join('')}</div>
        <div class="sl-pop-row">
          <label class="sl-custom">🎨 Outra cor <input type="color" value="${/^#[0-9a-f]{6}$/i.test(bg.color || '') ? bg.color : '#ffffff'}" aria-label="Escolher outra cor de fundo" /></label>
          ${bg.img ? '<button type="button" class="sl-btn" data-bx="noimg">Tirar imagem de fundo</button>' : ''}
        </div>
        <div class="sl-pop-row"><button type="button" class="sl-btn" data-bx="all">Usar este fundo em todos os slides</button></div>`, el => {
        const apply = (nb, key) => { snapGrouped(key || 'bg'); D.slides[cur] = { ...slide(), bg: nb, updatedAt: nowMs() }; touchSlide(cur); paintStage(); };
        el.addEventListener('click', e => {
          const c = e.target.closest('[data-bc]'), g = e.target.closest('[data-bg]'), x = e.target.closest('[data-bx]');
          const now = slide().bg || D.meta.bg || { color: '#ffffff' };
          if (c) { apply({ ...now, color: c.dataset.bc, grad: undefined }); closePop(); }
          else if (g) { const gr = GRADS[Number(g.dataset.bg)]; apply({ ...now, grad: gr }); closePop(); }
          else if (x && x.dataset.bx === 'noimg') { const nb = { ...now }; delete nb.img; delete nb.fit; apply(normBg(nb) || { color: '#ffffff' }); closePop(); }
          else if (x && x.dataset.bx === 'all') {
            snap();
            const nb = normBg(slide().bg || D.meta.bg) || { color: '#ffffff' };
            D.meta = { ...D.meta, bg: nb, updatedAt: nowMs() }; metaPending = true;
            D.meta.slideIds.forEach(id => { if (D.slides[id].bg) { D.slides[id] = { ...D.slides[id], bg: null, updatedAt: nowMs() }; touchSlide(id); } });
            saveSoon(); paintStage(); paintThumbs(); closePop(); toast(root, 'Fundo aplicado a todos os slides ✓');
          }
        });
        el.querySelector('input[type=color]').addEventListener('input', e => apply({ ...(slide().bg || D.meta.bg || {}), color: e.target.value, grad: undefined }, 'bgcolor'));
      });
    }

    // a page of the online book as background / image ----------------------------------
    function bookPicker() {
      if (typeof LivroOnline === 'undefined' || !LivroOnline.loadManifest) { toast(root, 'O livro online não está disponível.'); return; }
      const d = document.createElement('div');
      d.className = 'sl-dlg';
      d.innerHTML = `<div class="sl-dlg-box sl-dlg-box--wide" role="dialog" aria-label="Página do livro">
        <h4>📖 Usar uma página do livro</h4>
        <div class="sl-pop-row">${LivroOnline.BOOKS.map(b => `<button type="button" class="sl-btn" data-book="${b.id}">${esc(b.title)}</button>`).join('')}</div>
        <div class="sl-pop-row" data-ref="bm"></div>
        <div class="sl-bookpages" data-ref="bp"><p class="sl-ctx-hint">Escolha um livro.</p></div>
        <div class="sl-dlg-row" data-ref="bact" hidden>
          <button type="button" class="sl-btn sl-btn--ok" data-use="bg">Usar como fundo do slide</button>
          <button type="button" class="sl-btn" data-use="img">Inserir como imagem</button>
        </div>
        <div class="sl-dlg-row"><button type="button" class="sl-btn" data-x="cancel">Fechar</button></div></div>`;
      root.appendChild(d);
      let picked = null, dir = '', m = null, page = null;
      const bp = d.querySelector('[data-ref="bp"]'), bact = d.querySelector('[data-ref="bact"]');
      const loadBim = async (book, bim) => {
        page = null; bact.hidden = true;
        bp.innerHTML = '<p class="sl-ctx-hint">Abrindo…</p>';
        try {
          m = await LivroOnline.loadManifest(book, bim, false);
          dir = `${m._base != null ? m._base : ''}${m.book}/b${m.bimester || bim}/`;
          bp.innerHTML = m.pages.filter(p => p.kind !== 'stickers').map(p => `<button type="button" class="sl-bpg" data-p="${p.n}" title="Página ${p.n}"><img src="${esc(dir + (p.thumb || p.img))}" alt="Página ${p.n}" loading="lazy"><span>${p.n}</span></button>`).join('');
        } catch (e) { bp.innerHTML = '<p class="sl-ctx-hint">Este bimestre ainda não está no site.</p>'; }
      };
      d.addEventListener('click', e => {
        if (e.target.closest('[data-x]') || e.target === d) { d.remove(); return; }
        const b = e.target.closest('[data-book]');
        if (b) {
          picked = b.dataset.book;
          d.querySelector('[data-ref="bm"]').innerHTML = [1, 2, 3, 4].map(n => `<button type="button" class="sl-btn" data-bim="${n}">Bimestre ${n}</button>`).join('');
          loadBim(picked, 1);
          return;
        }
        const bm = e.target.closest('[data-bim]');
        if (bm && picked) { loadBim(picked, Number(bm.dataset.bim)); return; }
        const pg = e.target.closest('[data-p]');
        if (pg && m) {
          page = m.pages.find(p => p.n === Number(pg.dataset.p));
          bp.querySelectorAll('.sl-bpg').forEach(x => x.classList.toggle('is-on', x === pg));
          bact.hidden = false;
          return;
        }
        const use = e.target.closest('[data-use]');
        if (use && page) {
          const url = dir + page.img;
          d.remove();
          if (!safeSrc(url)) { toast(root, 'Não consegui usar esta página.'); return; }
          if (use.dataset.use === 'bg') {
            snap();
            D.slides[cur] = { ...slide(), bg: { color: '#ffffff', img: url, fit: 'contain' }, updatedAt: nowMs() };
            touchSlide(cur); paintStage();
          } else {
            const h = 680, w = Math.round(h / (m.aspect || 1.414));
            addObject({ type: 'image', src: url, x: Math.round((W - w) / 2), y: 20, w, h });
          }
        }
      });
    }

    // ---- toolbar + context events ----------------------------------------------------
    root.querySelector('.sl-toolbar').addEventListener('click', e => {
      const b = e.target.closest('[data-t]');
      if (!b) return;
      if (editing) commitEdit();
      const t = b.dataset.t;
      if (t === 'select') { tool = 'select'; closePop(); paintTools(); paintCtx(); paintSel(); }
      else if (t === 'text') { closePop(); addText(); }
      else if (t === 'image') fileEl.click();
      else if (t === 'shapes') { shapePop(b); }
      else if (t === 'emoji') { emojiPop(b); }
      else if (t === 'draw') { drawPop(b); }
      else if (t === 'eraser') { tool = 'eraser'; closePop(); sel = []; paintSel(); paintCtx(); paintTools(); }
      else if (t === 'bg') { bgPop(b); }
      else if (t === 'book') bookPicker();
    });
    fileEl.addEventListener('change', () => {
      const files = [...fileEl.files].filter(f => /^image\//.test(f.type));
      fileEl.value = '';
      if (files.length) addImageFiles(files);
    });

    ctxEl.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
      const a = b.dataset.act, one = selObjs()[0];
      const T = o => o.type === 'text';
      switch (a) {
        case 'bold': setProps({ b: !one.b }, 'bold', T); break;
        case 'italic': setProps({ i: !one.i }, 'italic', T); break;
        case 'underline': setProps({ u: !one.u }, 'underline', T); break;
        case 'al-left': case 'al-center': case 'al-right': setProps({ al: a.slice(3) }, 'al', T); break;
        case 'fs-': case 'fs+': {
          const cur0 = Math.round(one.fs);
          const next = a === 'fs+' ? (SIZES.find(s => s > cur0) || cur0 + 20) : ([...SIZES].reverse().find(s => s < cur0) || Math.max(8, cur0 - 4));
          setProps({ fs: next }, 'fs', T); break;
        }
        case 'tcolor': colorPop(root, b, one.c, (c) => { lastColor = c; setProps({ c }, 'tcolor', T); }, { title: 'Cor do texto' }); return;
        case 'fill': colorPop(root, b, one.fill, c => setProps({ fill: c }, 'fill', o => o.type === 'shape'), { title: 'Preenchimento', none: true }); return;
        case 'stroke': colorPop(root, b, one.stroke, c => setProps({ stroke: c, ...(c !== 'none' && !one.sw ? { sw: 4 } : {}) }, 'stroke', o => o.type === 'shape'), { title: 'Contorno', none: true }); return;
        case 'dcolor': colorPop(root, b, one.c, c => setProps({ c }, 'dcolor', o => o.type === 'draw'), { title: 'Cor do traço' }); return;
        case 'edit': startEdit(one.id, false); return;
        case 'fitslide': {
          const sc = Math.min(W / one.w, H / one.h);
          const w = one.w * sc, h = one.h * sc;
          mutateSel(o => ({ ...o, x: (W - w) / 2, y: (H - h) / 2, w, h, r: 0 }));
          paintStage(); paintSel(); break;
        }
        case 'centerH': centerSel('h'); break;
        case 'centerV': centerSel('v'); break;
        case 'front': case 'fwd': case 'bwd': case 'back': layerOp(a); break;
        case 'lock': { const all = selObjs().every(o => o.lock); setProps({ lock: !all }, 'lock'); paintCtx(); break; }
        case 'dup': duplicateSel(); break;
        case 'del': deleteSel(); break;
        default:
      }
      paintCtx();
    });
    ctxEl.addEventListener('change', e => {
      const t = e.target, a = t.dataset.act;
      if (!a) return;
      if (a === 'font') { lastFont = t.value; setProps({ ff: t.value }, 'font', o => o.type === 'text'); }
      else if (a === 'fs') { setProps({ fs: clamp(Number(t.value) || 48, 8, 600) }, 'fs', o => o.type === 'text'); }
      else if (a === 'lh') setProps({ lh: Number(t.value) }, 'lh', o => o.type === 'text');
      else if (a === 'sw') setProps({ sw: Number(t.value) }, 'sw', o => o.type === 'shape');
      else if (a === 'dsw') setProps({ sw: Number(t.value) }, 'dsw', o => o.type === 'draw');
      paintCtx();
    });
    ctxEl.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.act === 'op') setProps({ op: clamp(Number(t.value) / 100, 0.1, 1) }, 'op', o => o.type === 'shape' || o.type === 'image');
    });

    root.querySelector('.sl-title').addEventListener('change', e => {
      const v = e.target.value.trim() || 'Apresentação';
      e.target.value = v;
      setMeta({ title: v });
    });
    root.querySelector('.sl-title').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); });

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b || b.closest('.sl-ctx')) return;
      switch (b.dataset.a) {
        case 'back': back(); break;
        case 'undo': undo(); break;
        case 'redo': redo(); break;
        case 'addslide': addSlide(); break;
        case 'dupslide': dupSlide(); break;
        case 'delslide': delSlide(); break;
        case 'present':
          if (editing) commitEdit();
          saveNow();
          openPresent(D.meta, i => D.slides[D.meta.slideIds[i]], D.meta.slideIds.indexOf(cur));
          break;
        default:
      }
    });

    // ---- keyboard, clipboard --------------------------------------------------------
    keyHandler = e => {
      if (topRoot() !== root) return;
      const typing = isTyping(e.target);
      const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
      if (typing) return;
      if (mod && key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      else if (mod && key === 'd') { e.preventDefault(); duplicateSel(); }
      else if (mod && key === 'a') { e.preventDefault(); sel = objs().map(o => o.id); paintSel(); paintCtx(); }
      else if (mod && (key === 'c' || key === 'x')) {
        const list = selObjs();
        if (!list.length) return;
        clip = list.map(cloneObj); clipTag = 'igslides:' + rid(); pasteN = 0;
        try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(clipTag).catch(() => {}); } catch (er) { /* ignore */ }
        if (key === 'x') { e.preventDefault(); deleteSel(); } else toast(root, 'Copiado ✓', 1200);
      } else if (!mod && (key === 'delete' || key === 'backspace')) { if (sel.length) { e.preventDefault(); deleteSel(); } }
      else if (!mod && key === 'escape') {
        if (pop) closePop();
        else if (sel.length) { sel = []; paintSel(); paintCtx(); }
        else if (tool !== 'select') { tool = 'select'; paintTools(); paintCtx(); }
        else back();
      } else if (!mod && key === 'enter') {
        const o = selObjs()[0];
        if (sel.length === 1 && o && o.type === 'text') { e.preventDefault(); startEdit(o.id, false); }
      } else if (!mod && key === 'v' && !e.altKey) { tool = 'select'; paintTools(); paintCtx(); }
      else if (!mod && key.startsWith('arrow')) {
        e.preventDefault();
        const st = e.shiftKey ? 10 : 1;
        if (sel.length) moveSelBy(key === 'arrowleft' ? -st : key === 'arrowright' ? st : 0, key === 'arrowup' ? -st : key === 'arrowdown' ? st : 0);
        else {
          const ids = D.meta.slideIds, i = ids.indexOf(cur);
          const j = (key === 'arrowleft' || key === 'arrowup') ? i - 1 : i + 1;
          if (ids[j]) gotoSlide(ids[j]);
        }
      } else if (!mod && (key === 'pagedown' || key === 'pageup')) {
        e.preventDefault();
        const ids = D.meta.slideIds, j = ids.indexOf(cur) + (key === 'pagedown' ? 1 : -1);
        if (ids[j]) gotoSlide(ids[j]);
      }
    };
    function pasteClip() {
      if (!clip || !clip.length) return;
      if (objs().length + clip.length > MAX_OBJECTS) { toast(root, 'Objetos demais neste slide.'); return; }
      pasteN++;
      snap();
      const copies = clip.map(o => ({ ...cloneObj(o), id: rid(), x: o.x + 24 * pasteN, y: o.y + 24 * pasteN }));
      setObjects(objs().concat(copies));
      sel = copies.map(o => o.id);
      tool = 'select';
      paintStage(); paintSel(); paintCtx(); paintTools();
    }
    const onPaste = e => {
      if (topRoot() !== root || isTyping(e.target)) return;
      const cd = e.clipboardData;
      if (!cd) return;
      const files = [...(cd.files || [])].filter(f => /^image\//.test(f.type));
      if (!files.length) [...(cd.items || [])].forEach(it => { if (it.kind === 'file' && /^image\//.test(it.type)) { const f = it.getAsFile(); if (f) files.push(f); } });
      if (files.length) { e.preventDefault(); addImageFiles(files); return; }
      const text = cd.getData('text/plain') || '';
      if (clip && (!text || text === clipTag)) { e.preventDefault(); pasteClip(); return; }
      if (text.trim() && !text.startsWith('igslides:')) { e.preventDefault(); addText(text.trim().slice(0, 1500)); }
    };
    document.addEventListener('paste', onPaste);

    unStatus = Sync.onStatus(s => paintStatus($('status'), s));
    unFit = watchFit(wrapEl, stageEl, 14, kk => {
      k = kk;
      stageEl.style.setProperty('--hs', (13 / kk).toFixed(2) + 'px');
      stageEl.style.setProperty('--bw', (2 / kk).toFixed(2) + 'px');
      stageEl.style.setProperty('--ik', (1 / kk).toFixed(3));
    });
    const onFontsReady = () => { paintSel(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onFontsReady).catch(() => {});
    const onLeave = () => { if (editing) commitEdit(); saveNow(); };
    window.addEventListener('pagehide', onLeave);
    cleanup = () => {
      if (editing) commitEdit();
      saveNow();
      document.removeEventListener('paste', onPaste);
      window.removeEventListener('pagehide', onLeave);
      if (unFit) unFit();
      if (unStatus) unStatus();
      Sync.flush();
      clearTimeout(thumbT);
      if (onExit) setTimeout(onExit, 0);
    };
    paintAll();
    try { stageEl.focus({ preventScroll: true }); } catch (e) { /* old browser */ }
  }

  // -------------------------------------------------------------------------
  // WIRING — the header buttons (teacher only) and what the other files call
  // -------------------------------------------------------------------------
  function wireTeacherButtons() {
    if (window.IG_SHARE_MODE || window.IG_PUBLIC_GAME) return;
    ['headerSlidesBtn', 'slidesNavBtn'].forEach(id => {
      const b = document.getElementById(id);
      if (b && !b.dataset.slWired) { b.dataset.slWired = '1'; b.addEventListener('click', openPicker); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireTeacherButtons);
  else wireTeacherButtons();

  return {
    openPicker, openForStudent, openStudent,
    visibleFor, setVisible, visibilityHTML, wireVisibility,
    isOpen, closeAll: closeAllViews,
    // exposed for tests
    _t: { Sync, StudentData, readRec, writeRec, localDecks, localIds, normObj, normSlide, normMeta, compressImage, newDeck, copyDeck, deleteDeck, loadDeck, openEditor, openPresent, openViewer, objHTML, safeSrc, metaId, slideRecId, W, H },
  };
})();

window.SlidesAula = SlidesAula;
