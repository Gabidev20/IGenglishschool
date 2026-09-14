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

window.igImageFallback = igImageFallback;
window.igLooksLikeImageUrl = igLooksLikeImageUrl;
window.igLooksLikeEmoji = igLooksLikeEmoji;
window.igNormalizeWord = igNormalizeWord;
