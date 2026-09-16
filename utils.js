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

  function muted() {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
  }
  function setMuted(on) {
    try { localStorage.setItem(MUTE_KEY, on ? '1' : '0'); } catch (e) { /* private mode */ }
  }

  function audio() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
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
    osc.connect(g).connect(c.destination);
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

  return { stars, starsDown, sticker, muted, setMuted, note };
})();

window.IGSound = IGSound;
