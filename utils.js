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
window.igImageFallback = igImageFallback;

// Renders `<img>` with the emoji fallback wired up, or the emoji directly
// when there's no image at all (so the browser never fires a doomed request).
function igImageHTML(src, emoji, alt, extraAttrs) {
  if (!src) return `<span class="emoji-fallback">${igEscapeHtml(emoji || '🖼️')}</span>`;
  return `<img src="${igEscapeHtml(src)}" alt="${igEscapeHtml(alt || '')}" loading="lazy"
    data-fallback="${igEscapeHtml(emoji || '🖼️')}"
    onerror="igImageFallback(this)" ${extraAttrs || ''} />`;
}

// The canonical "word visual": colour swatch > real photo > emoji.
// Used by games.js, app.js's arcade games, learning.js and the Game Maker
// preview so a word looks identical everywhere it appears.
function igWordVisualHTML(word, extraClass) {
  const cls = `word-visual ${extraClass || ''}`.trim();
  if (word.swatch) {
    return `<div class="${cls} swatch-visual" style="background:${igEscapeHtml(word.swatch)}"></div>`;
  }
  return `<div class="${cls}">${igImageHTML(word.image, word.emoji, word.en)}</div>`;
}
