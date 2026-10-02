/* ==========================================================================
   IGenglishschool — Shared utilities
   Loaded FIRST, before every other script. Holds the few helpers that were
   previously copy-pasted (and subtly diverging) across games.js, app.js,
   learning.js and gamemaker.js.
   ========================================================================== */

// ---------------------------------------------------------------------------
// ESCAPING
// ---------------------------------------------------------------------------
function igEscapeHtml(str) {
  return String(str === null || str === undefined ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// IMAGE + EMOJI FALLBACK
// ---------------------------------------------------------------------------
// Every visual in the app is "a real photo, with the emoji as the fallback".
// The fallback used to be spliced into an inline `onerror="…'${emoji}'…"`
// string, which breaks the moment an emoji/label contains a quote — and
// teacher-authored words (Game Maker, Content Editor) can contain anything.
// The emoji now travels in a data attribute and this one handler renders it.
function igImageFallback(img) {
  const span = document.createElement('span');
  span.className = 'emoji-fallback';
  span.textContent = img.getAttribute('data-fallback') || '🖼️';
  const tag = img.getAttribute('data-fallback-tag');
  if (tag && tag !== 'span') {
    const el = document.createElement(tag);
    el.className = (img.getAttribute('data-fallback-class') || '') + ' emoji-fallback';
    el.textContent = span.textContent;
    img.replaceWith(el);
    return;
  }
  if (img.getAttribute('data-fallback-class')) {
    span.className = img.getAttribute('data-fallback-class') + ' emoji-fallback';
  }
  img.replaceWith(span);
}

// Renders `<img>` with the emoji fallback wired up, or the emoji directly
// when there's no image at all (so the browser never fires a doomed request).
// `lazy` is opt-in: it belongs on the long topic-card grid, where most cards
// start off-screen, but NOT on a game board — there every picture is on
// screen at once, and deferring them makes the cards pop in one by one in
// the middle of a lesson.
function igImageHTML(src, emoji, alt, opts) {
  if (!src) return `<span class="emoji-fallback">${igEscapeHtml(emoji || '🖼️')}</span>`;
  const o = typeof opts === 'string' ? { attrs: opts } : (opts || {});
  return `<img src="${igEscapeHtml(src)}" alt="${igEscapeHtml(alt || '')}"
    loading="${o.lazy ? 'lazy' : 'eager'}" decoding="async"
    data-fallback="${igEscapeHtml(emoji || '🖼️')}"
    onerror="igImageFallback(this)" ${o.attrs || ''} />`;
}

// Is this string actually usable as an <img src>? Teachers type into the
// wrong box all the time — an emoji or a bare word left in the "image URL"
// field would otherwise become an <img> that cannot load, and the picture
// would silently fall back to the default star. Anything that is not a real
// URL counts as "no image", so the emoji path takes over instead.
function igLooksLikeImageUrl(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  return /^(https?:\/\/|data:image\/|blob:|\/|\.{1,2}\/)/i.test(v);
}

// A short string with no ASCII letters or digits is an emoji, not a caption.
function igLooksLikeEmoji(value) {
  const v = String(value || '').trim();
  return v.length > 0 && v.length <= 8 && !/[A-Za-z0-9]/.test(v);
}

// Normalises a word so its visual is right whichever field was filled in.
// An emoji left in the `image` field is plainly what the teacher meant as
// the picture, so it REPLACES the emoji. Arbitrary text there is just a bad
// URL, so it is dropped and the existing emoji stands.
function igNormalizeWord(word) {
  const out = { ...word };
  const img = String(out.image || '').trim();
  if (img && !igLooksLikeImageUrl(img)) {
    const emoji = String(out.emoji || '').trim();
    if (igLooksLikeEmoji(img) || !emoji || emoji === '⭐') out.emoji = img;
    out.image = '';
  } else {
    out.image = img;
  }
  return out;
}

// The canonical "word visual": colour swatch > real photo > emoji.
// Used by games.js, app.js's arcade games, learning.js and the Game Maker
// preview so a word looks identical everywhere it appears.
function igWordVisualHTML(rawWord, extraClass) {
  const word = igNormalizeWord(rawWord);
  const cls = `word-visual ${extraClass || ''}`.trim();
  if (word.swatch) {
    return `<div class="${cls} swatch-visual" style="background:${igEscapeHtml(word.swatch)}"></div>`;
  }
  return `<div class="${cls}">${igImageHTML(word.image, word.emoji, word.en)}</div>`;
}

/* ==========================================================================
   SCOPED STORAGE
   ==========================================================================
   Every piece of teacher data — students, progress, class log, reports,
   custom games, curriculum edits — is namespaced by WORKSPACE, so two
   teachers signing in on the same computer never see each other's data, and
   signing out leaves nothing of the previous teacher on screen.

   The workspace is the signed-in teacher's Supabase user id, or the literal
   'local' when the site is running without Supabase (exactly as it did
   before there was any login).

   Writes stay synchronous localStorage writes — the whole app reads its data
   synchronously during render — and `onWrite` lets the cloud layer mirror
   them up to Supabase in the background.
   ========================================================================== */

const IG_STORE_NS = 'hopscotch';
const IG_WORKSPACE_KEY = 'hopscotch_workspace';
const IG_MIGRATED_FLAG = 'hopscotch_migrated_v2';

let igWorkspace = 'local';

function igWorkspaceId() { return igWorkspace; }

function igSetWorkspace(id) {
  igWorkspace = String(id || 'local');
  try { localStorage.setItem(IG_WORKSPACE_KEY, igWorkspace); } catch (e) {}
}

// Read back the workspace chosen on the previous visit. Synchronous on
// purpose: the app renders from storage the moment its scripts run, long
// before any network call could answer.
function igRestoreWorkspace() {
  try { igWorkspace = localStorage.getItem(IG_WORKSPACE_KEY) || 'local'; }
  catch (e) { igWorkspace = 'local'; }
  return igWorkspace;
}

function igStorageKey(logicalKey) {
  return `${IG_STORE_NS}:${igWorkspace}:${logicalKey}`;
}

// ---------------------------------------------------------------------------
// LOOKING INTO OTHER WORKSPACES
// ---------------------------------------------------------------------------
// Signing in for the first time moves the app from the `local` workspace to
// one named after the account — a fresh, empty one. Everything done before
// that login is still in localStorage, just under the old name. These helpers
// find it and copy it across, which is the difference between "my notes are
// gone" and "my notes are one click away".
function igListWorkspaces() {
  const found = new Set();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (!k.startsWith(IG_STORE_NS + ':')) continue;
      const parts = k.split(':');
      if (parts.length >= 3) found.add(parts[1]);
    }
  } catch (e) {}
  return Array.from(found);
}

function igWorkspaceKeys(ws) {
  const prefix = `${IG_STORE_NS}:${ws}:`;
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length));
    }
  } catch (e) {}
  return out;
}

function igWorkspaceGet(ws, key) {
  try { return localStorage.getItem(`${IG_STORE_NS}:${ws}:${key}`); } catch (e) { return null; }
}

// A plain-language summary of what a workspace is holding, used to ask the
// teacher whether she wants it before touching anything.
function igWorkspaceStats(ws) {
  const keys = igWorkspaceKeys(ws);
  const json = (key, fallback) => {
    const raw = igWorkspaceGet(ws, key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  };
  const countIn = (prefix) => keys.filter(k => k.startsWith(prefix))
    .reduce((n, k) => n + (Array.isArray(json(k, [])) ? json(k, []).length : 0), 0);

  return {
    workspace: ws,
    keys: keys.length,
    students: (json('students', []) || []).length,
    sessions: countIn('sessions_'),
    games: (json('custom_games', []) || []).length,
    reports: countIn('reports_'),
    homework: (json('homework', []) || []).length,
    writing: countIn('writing_'),
    exams: (json('exams', []) || []).length,
    curriculum: igWorkspaceGet(ws, 'curriculum_v1') ? 1 : 0,
  };
}

// Is there anything in here worth carrying over?
function igWorkspaceHasContent(stats) {
  return stats.sessions > 0 || stats.games > 0 || stats.reports > 0
    || stats.homework > 0 || stats.writing > 0 || stats.exams > 0
    || stats.curriculum > 0 || stats.students > 0;
}

// How a key coming from the old workspace meets whatever the account already
// has under the same name. Returns the value to store, or null to leave the
// destination alone.
//
// "Skip anything already there" was not enough: the first cloud sync writes an
// EMPTY custom_games list into a new account, and an empty list is not a
// reason to throw away the games the teacher actually made. So lists are
// merged by id, objects are merged key by key, and only scalars stand aside.
function igMergeValue(srcRaw, dstRaw, key) {
  if (srcRaw === null) return null;
  if (dstRaw === null) return srcRaw;

  let src, dst;
  try { src = JSON.parse(srcRaw); } catch (e) { return null; }
  try { dst = JSON.parse(dstRaw); } catch (e) { return srcRaw; }

  if (Array.isArray(src) && Array.isArray(dst)) {
    if (!src.length) return null;
    if (!dst.length) return JSON.stringify(src);
    const idOf = (o) => (o && (o.id || o.code)) || JSON.stringify(o);
    const have = new Set(dst.map(idOf));
    const merged = dst.concat(src.filter(o => !have.has(idOf(o))));
    return merged.length === dst.length ? null : JSON.stringify(merged);
  }

  if (src && dst && typeof src === 'object' && typeof dst === 'object') {
    // Stars and XP are earned, never un-earned: keep whichever side is ahead.
    if (String(key).startsWith('progress_')) {
      return JSON.stringify({
        ...src, ...dst,
        xp: Math.max(src.xp || 0, dst.xp || 0),
        stars: Math.max(src.stars || 0, dst.stars || 0),
        stickers: Array.from(new Set((src.stickers || []).concat(dst.stickers || []))),
      });
    }
    return JSON.stringify({ ...src, ...dst });   // o que já está na conta manda
  }

  return null;
}

// Copy, never move: the source stays exactly as it was, so a bad import can
// always be repeated or ignored.
function igCopyWorkspace(from, to, overwrite) {
  let copied = 0;
  igWorkspaceKeys(from).forEach(key => {
    const target = `${IG_STORE_NS}:${to}:${key}`;
    try {
      const srcRaw = igWorkspaceGet(from, key);
      if (srcRaw === null) return;
      const dstRaw = localStorage.getItem(target);
      const value = overwrite ? srcRaw : igMergeValue(srcRaw, dstRaw, key);
      if (value === null || value === dstRaw) return;   // nada mudou, nao conta
      localStorage.setItem(target, value);
      copied++;
    } catch (e) {}
  });
  return copied;
}

const IGStore = (() => {
  const writeListeners = [];

  function getRaw(key) {
    try { return localStorage.getItem(igStorageKey(key)); } catch (e) { return null; }
  }

  function getJSON(key, fallback) {
    const raw = getRaw(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function notify(key, value) {
    writeListeners.forEach(fn => { try { fn(key, value); } catch (e) { console.error(e); } });
  }

  function setRaw(key, value) {
    try { localStorage.setItem(igStorageKey(key), value); } catch (e) { /* quota / private mode */ }
    notify(key, value);
  }

  function setJSON(key, value) { setRaw(key, JSON.stringify(value)); }

  function remove(key) {
    try { localStorage.removeItem(igStorageKey(key)); } catch (e) {}
    notify(key, null);
  }

  // Every logical key currently stored for this workspace.
  function keys() {
    const prefix = `${IG_STORE_NS}:${igWorkspace}:`;
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length));
      }
    } catch (e) {}
    return out;
  }

  function clearWorkspace() {
    keys().forEach(k => { try { localStorage.removeItem(igStorageKey(k)); } catch (e) {} });
  }

  // Used by the cloud pull: write without echoing back up to the server.
  let muted = false;
  function silently(fn) {
    muted = true;
    try { fn(); } finally { muted = false; }
  }

  return {
    getRaw, getJSON, setRaw, setJSON, remove, keys, clearWorkspace, silently,
    onWrite(fn) {
      writeListeners.push((key, value) => { if (!muted) fn(key, value); });
    },
  };
})();

// One-time move of data saved before workspaces existed into the 'local'
// workspace, so an existing teacher loses nothing when this ships.
function igMigrateLegacyStorage() {
  try {
    if (localStorage.getItem(IG_MIGRATED_FLAG)) return;
    const moves = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(`${IG_STORE_NS}:`)) continue;       // already scoped
      if (k === IG_WORKSPACE_KEY || k === IG_MIGRATED_FLAG) continue;
      if (k === 'hopscotch_modal_fullscreen') continue;    // per-device preference
      if (k.startsWith('hopscotch_')) moves.push([k, k.slice('hopscotch_'.length)]);
      else if (k.startsWith('custom_reading_') || k.startsWith('custom_practice_')) moves.push([k, k]);
    }
    moves.forEach(([oldKey, logical]) => {
      const value = localStorage.getItem(oldKey);
      const target = `${IG_STORE_NS}:local:${logical}`;
      if (value !== null && localStorage.getItem(target) === null) localStorage.setItem(target, value);
      localStorage.removeItem(oldKey);
    });
    localStorage.setItem(IG_MIGRATED_FLAG, '1');
  } catch (e) { /* private mode — nothing to migrate into anyway */ }
}

igMigrateLegacyStorage();
igRestoreWorkspace();

window.igImageFallback = igImageFallback;
window.igLooksLikeImageUrl = igLooksLikeImageUrl;
window.igLooksLikeEmoji = igLooksLikeEmoji;
window.igNormalizeWord = igNormalizeWord;
window.IGStore = IGStore;
window.igSetWorkspace = igSetWorkspace;
window.igWorkspaceId = igWorkspaceId;

/* ==========================================================================
   IGSound — the two reward sounds the teacher triggers by hand
   --------------------------------------------------------------------------
   The games each carry their own private little synth (games.js, app.js's
   ArcadeGames, liveTools.js) because they were written self-contained. These
   two are different: they fire from students.js, which has no audio of its
   own, and they have to be reachable from anywhere — so they live here, in
   the file that loads first.

   Synthesised rather than loaded: no asset to 404, no delay on first play,
   and the whole thing is a few lines.

   Muting is a per-DEVICE preference (raw localStorage, not IGStore): a
   teacher who silences the tablet in a quiet classroom does not want that
   choice syncing to her laptop, and it must survive signing out.
   ========================================================================== */
const IGSound = (() => {
  const MUTE_KEY = 'hopscotch_sound_muted';
  let ctx = null;
  let master = null;

  function muted() {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
  }
  function setMuted(on) {
    try { localStorage.setItem(MUTE_KEY, on ? '1' : '0'); } catch (e) { /* private mode */ }
  }

  function audio() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) {
      ctx = new Ctor();
      // Everything goes through one gentle compressor: sounds can be fuller
      // and louder without clipping when several land at once.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4;
      comp.attack.value = 0.004; comp.release.value = 0.2;
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp).connect(ctx.destination);
    }
    // Browsers start the context suspended until a user gesture. Every caller
    // here IS a click, so resuming is allowed — but it returns a promise we
    // deliberately ignore, because the notes below are scheduled on the
    // context clock and will simply play a few ms later.
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  // One note. `start` is an offset in seconds from now, so a whole phrase can
  // be scheduled in a single synchronous pass.
  function note(freq, start, duration, type, gain) {
    const c = audio();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    osc.connect(g).connect(master);
    // Ramp from silence and back: a square wave switched on at full volume
    // clicks, and the click is the loudest part of a short note.
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(gain || 0.14, c.currentTime + start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + duration + 0.02);
  }

  // ⭐ Stars added by hand — a quick rising sparkle. More stars, more notes,
  // so +5 sounds bigger than +1 without being five times as long.
  const SPARKLE = [784, 988, 1175, 1568, 1976, 2349];   // G5 B5 D6 G6 B6 D7
  function stars(count) {
    if (muted()) return;
    const n = Math.max(1, Math.min(SPARKLE.length, Math.round(Math.abs(Number(count) || 1)) + 1));
    try {
      for (let i = 0; i < n; i++) note(SPARKLE[i], i * 0.055, 0.16, 'triangle', 0.13);
      note(SPARKLE[n - 1] * 2, n * 0.055, 0.22, 'sine', 0.07);
    } catch (e) { /* audio blocked — the stars still landed */ }
  }

  // ⭐ Stars taken away — the same shape falling, so a mis-click is audibly
  // different from an award rather than silent.
  function starsDown() {
    if (muted()) return;
    try {
      note(660, 0, 0.12, 'triangle', 0.10);
      note(494, 0.08, 0.16, 'triangle', 0.09);
    } catch (e) { /* ignore */ }
  }

  // 📔 A new sticker — a little fanfare, clearly a bigger moment than a star.
  function sticker() {
    if (muted()) return;
    try {
      // C5 E5 G5 C6, then the octave held underneath
      [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.09, 0.3, 'triangle', 0.15));
      note(1319, 0.36, 0.5, 'sine', 0.12);
      note(2093, 0.36, 0.45, 'sine', 0.05);
      note(262, 0.36, 0.6, 'sine', 0.06);
    } catch (e) { /* ignore */ }
  }

  // --------------------------------------------------------------------------
  // Game sound effects — one shared palette, so every game sounds like the
  // same app. All synthesised; all silent when the device is muted.
  // --------------------------------------------------------------------------

  // A burst of noise through a filter: card swishes, pops, drum hits.
  function noise(start, duration, filterType, freqFrom, freqTo, gain) {
    const c = audio();
    if (!c) return;
    const len = Math.max(1, Math.floor(c.sampleRate * duration));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    const t = c.currentTime + start;
    src.buffer = buf;
    f.type = filterType;
    f.frequency.setValueAtTime(freqFrom, t);
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + duration);
    f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }

  // A steady bed of noise that fades in, holds and fades out — rain, wind,
  // a rumble. Unlike noise() above, which is a percussive burst: chaining
  // bursts end to end is what made the old rain pulse like a machine.
  // `shape` = [attack, release] in seconds.
  function wash(start, duration, filterType, freq, gain, shape, q) {
    const c = audio();
    if (!c) return;
    const [attack, release] = shape || [0.4, 0.8];
    const len = Math.max(1, Math.floor(c.sampleRate * duration));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    const t = c.currentTime + start;
    src.buffer = buf;
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = q || 0.7;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, Math.max(t + attack, t + duration - release));
    g.gain.linearRampToValueAtTime(0.0001, t + duration);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  // A note whose pitch slides — boings, drops, whooshes.
  function slide(f1, f2, start, duration, type, gain) {
    const c = audio();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime + start;
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(f2, t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // A struck bell: a few inharmonic partials, each fading at its own pace.
  function bell(freq, start, gain) {
    [[1, 1, 1.6], [2.0, 0.55, 1.2], [2.76, 0.4, 0.9], [5.4, 0.22, 0.5], [8.9, 0.1, 0.3]]
      .forEach(([m, g, d]) => note(freq * m, start, d, 'sine', gain * g));
  }

  const play = fn => () => { if (muted()) return; try { fn(); } catch (e) { /* audio blocked */ } };

  const sfx = {
    // ✅ right answer: a bright two-note chime with a sparkle on top
    correct: play(() => {
      note(880, 0, 0.16, 'triangle', 0.16);
      note(1319, 0.08, 0.28, 'triangle', 0.16);
      note(2637, 0.1, 0.22, 'sine', 0.04);
    }),
    // ❌ wrong answer: a soft, friendly "boing" — never harsh
    wrong: play(() => {
      slide(330, 160, 0, 0.28, 'triangle', 0.18);
      slide(165, 90, 0.02, 0.26, 'sine', 0.12);
    }),
    // 🏆 finished: a little fanfare with a held chord and sparkles
    win: play(() => {
      [523, 659, 784].forEach((f, i) => note(f, i * 0.1, 0.18, 'triangle', 0.16));
      [1047, 1319, 1568].forEach(f => note(f, 0.3, 0.7, 'triangle', 0.1));
      note(262, 0.3, 0.8, 'sine', 0.1);
      [2093, 2637, 3136, 4186].forEach((f, i) => note(f, 0.42 + i * 0.07, 0.25, 'sine', 0.035));
    }),
    // 🃏 a card turning over: a quick paper swish and a soft tap
    flip: play(() => {
      noise(0, 0.11, 'bandpass', 1200, 4200, 0.22);
      note(1400, 0.06, 0.05, 'triangle', 0.05);
    }),
    // 🃏🃏 a pair found: two rising chimes
    match: play(() => {
      note(1047, 0, 0.16, 'triangle', 0.14);
      note(1568, 0.09, 0.32, 'triangle', 0.14);
      note(3136, 0.12, 0.2, 'sine', 0.03);
    }),
    // 🎈 a balloon popping
    pop: play(() => {
      noise(0, 0.09, 'highpass', 1800, 900, 0.45);
      slide(600, 120, 0, 0.1, 'sine', 0.15);
    }),
    // a tap on a letter / tile / option
    click: play(() => { note(1200, 0, 0.045, 'triangle', 0.08); noise(0, 0.025, 'highpass', 3000, 0, 0.05); }),
    // picking something up to drag it
    pickup: play(() => slide(500, 900, 0, 0.09, 'sine', 0.07)),
    // putting it down
    drop: play(() => { slide(260, 110, 0, 0.12, 'sine', 0.16); noise(0, 0.05, 'lowpass', 900, 0, 0.06); }),
    // the wheel's peg clacking past the pointer
    tick: play(() => { noise(0, 0.022, 'bandpass', 2600, 0, 0.22); note(1800, 0, 0.02, 'square', 0.025); }),
    // the last seconds of a countdown
    countdown: play(() => note(988, 0, 0.12, 'square', 0.06)),
    // a drum roll building up to a reveal
    drumroll: play(() => {
      for (let i = 0; i < 14; i++) noise(i * 0.055, 0.05, 'bandpass', 900 + i * 40, 0, 0.12 + i * 0.012);
    }),
    // ✨ the big reveal
    reveal: play(() => {
      noise(0, 0.08, 'highpass', 2500, 0, 0.12);
      [784, 988, 1175, 1568].forEach((f, i) => note(f, i * 0.06, 0.3, 'triangle', 0.12));
      [2349, 3136].forEach((f, i) => note(f, 0.26 + i * 0.08, 0.3, 'sine', 0.04));
    }),
    // 🔔 time's up — properly loud: three rings of a real-sounding bell,
    // then a cheerful two-note "done!"
    timerEnd: play(() => {
      [0, 0.45, 0.9].forEach(t => { bell(988, t, 0.28); bell(1319, t + 0.12, 0.2); });
      note(784, 1.55, 0.25, 'triangle', 0.22);
      note(1047, 1.75, 0.6, 'triangle', 0.24);
      note(523, 1.75, 0.7, 'sine', 0.14);
    }),
    // a soft bell for smaller moments
    bell: play(() => bell(1175, 0, 0.18)),
  };

  return { stars, starsDown, sticker, muted, setMuted, note, noise, wash, slide, ...sfx };
})();

window.IGSound = IGSound;
