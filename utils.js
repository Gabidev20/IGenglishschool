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
