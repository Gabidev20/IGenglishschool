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
  // no-twemoji: this IS the fallback for a picture that could not load —
  // turning it back into a picture would loop while offline.
  span.className = 'emoji-fallback no-twemoji';
  span.textContent = img.getAttribute('data-fallback') || '🖼️';
  const tag = img.getAttribute('data-fallback-tag');
  if (tag && tag !== 'span') {
    const el = document.createElement(tag);
    el.className = (img.getAttribute('data-fallback-class') || '') + ' emoji-fallback no-twemoji';
    el.textContent = span.textContent;
    img.replaceWith(el);
    return;
  }
  if (img.getAttribute('data-fallback-class')) {
    span.className = img.getAttribute('data-fallback-class') + ' emoji-fallback no-twemoji';
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

/* ==========================================================================
   PICTURES A CHILD CAN READ
   --------------------------------------------------------------------------
   A word's picture has to say the word. Three things got in the way:
     • stock photos (a peach that could be anything);
     • native emoji, which Windows 10 draws in pieces — 🧑‍🎨 "painter"
       arrives as a person plus a palette, three figures standing in a row;
     • emoji that only point at the word (🔢 for every number from 11 to
       20, a clock for "eleven", a blouse for "skirt").
   So every word picture is chosen in this order:
     1. the site's own drawings (the house, the school bag, weather,
        prepositions, feelings, instruments) — made for these games;
     2. a drawn card for numbers, ordinals, days and months ("11", "3rd",
        "Mon", "Jan"), and real drawn shapes;
     3. the emoji, drawn the same on every device (Twemoji images);
     4. a photo, only when the word has nothing else.
   A picture the teacher chose herself (anything that is not one of the
   shipped Wikimedia photos) always wins.
   ========================================================================== */

// Twemoji graphics — CC-BY 4.0, credited in the page footers.
const IG_TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/';

function igEmojiCode(emoji) {
  const s = String(emoji || '');
  const clean = s.indexOf('‍') < 0 ? s.replace(/️/g, '') : s;
  return [...clean].map(c => c.codePointAt(0).toString(16)).join('-');
}

// <img> of the drawn emoji; falls back to the native character if the
// image cannot load (offline), via the same handler as photos.
function igEmojiImgHTML(emoji, cls) {
  const e = String(emoji || '').trim();
  if (!e) return '';
  return `<img class="${cls || 'ig-emoji'}" src="${IG_TWEMOJI_BASE}${igEmojiCode(e)}.svg" alt="${igEscapeHtml(e)}" draggable="false"
    decoding="async" data-fallback="${igEscapeHtml(e)}" onerror="igImageFallback(this)" />`;
}

const igSvgUri = (body, viewBox) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox || '0 0 100 100'}">${body}</svg>`);

// A number / day / month card: big, round, unmistakable.
function igGlyphCard(text, band) {
  const t = igEscapeHtml(String(text));
  const size = band ? (t.length <= 3 ? 30 : 24) : (t.length <= 2 ? 52 : t.length <= 3 ? 40 : 30);
  return igSvgUri(band
    ? `<rect x="6" y="10" width="88" height="84" rx="14" fill="#fff" stroke="#2e2b2e" stroke-width="4"/>
       <path d="M6 24a14 14 0 0 1 14-14h60a14 14 0 0 1 14 14v10H6z" fill="#e5484d" stroke="#2e2b2e" stroke-width="4"/>
       <circle cx="30" cy="10" r="4" fill="#2e2b2e"/><circle cx="70" cy="10" r="4" fill="#2e2b2e"/>
       <text x="50" y="76" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="800" text-anchor="middle" fill="#2e2b2e">${t}</text>`
    : `<rect x="6" y="6" width="88" height="88" rx="22" fill="#fff4d6" stroke="#2e2b2e" stroke-width="4"/>
       <text x="50" y="${50 + size * 0.36}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="800" text-anchor="middle" fill="#2e2b2e">${t}</text>`);
}

const IG_NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  'one hundred': 100, hundred: 100,
};
const IG_ORDINALS = {
  first: '1st', second: '2nd', third: '3rd', fourth: '4th', fifth: '5th', sixth: '6th', seventh: '7th',
  eighth: '8th', ninth: '9th', tenth: '10th', eleventh: '11th', twelfth: '12th', thirteenth: '13th',
  twentieth: '20th', 'twenty-first': '21st', 'thirty-first': '31st',
};
const IG_DAYS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
const IG_MONTHS = {
  january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr', may: 'May', june: 'Jun',
  july: 'Jul', august: 'Aug', september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec',
};

// Shapes and the few objects no emoji draws properly.
const IG_DRAWN = {
  circle: '<circle cx="50" cy="50" r="38" fill="#3d7bd9" stroke="#2e2b2e" stroke-width="4"/>',
  square: '<rect x="14" y="14" width="72" height="72" fill="#e5484d" stroke="#2e2b2e" stroke-width="4"/>',
  triangle: '<path d="M50 10 L90 86 H10 Z" fill="#3fa34d" stroke="#2e2b2e" stroke-width="4" stroke-linejoin="round"/>',
  rectangle: '<rect x="6" y="28" width="88" height="44" fill="#f08a24" stroke="#2e2b2e" stroke-width="4"/>',
  oval: '<ellipse cx="50" cy="50" rx="42" ry="28" fill="#8e5ea2" stroke="#2e2b2e" stroke-width="4"/>',
  diamond: '<path d="M50 8 L88 50 L50 92 L12 50 Z" fill="#2bb3c0" stroke="#2e2b2e" stroke-width="4" stroke-linejoin="round"/>',
  star: '<path d="M50 8l12 26 28 3-21 19 6 28-25-14-25 14 6-28-21-19 28-3z" fill="#f4c430" stroke="#2e2b2e" stroke-width="4" stroke-linejoin="round"/>',
  heart: '<path d="M50 86 C14 62 6 40 18 24 C30 10 46 16 50 30 C54 16 70 10 82 24 C94 40 86 62 50 86Z" fill="#e5484d" stroke="#2e2b2e" stroke-width="4" stroke-linejoin="round"/>',
  cross: '<path d="M38 10h24v28h28v24H62v28H38V62H10V38h28z" fill="#e5484d" stroke="#2e2b2e" stroke-width="4" stroke-linejoin="round"/>',
  arrow: '<path d="M8 40h52V20l32 30-32 30V60H8z" fill="#3d7bd9" stroke="#2e2b2e" stroke-width="4" stroke-linejoin="round"/>',
  skirt: '<path d="M30 20h40l18 62H12z" fill="#f27aa5" stroke="#2e2b2e" stroke-width="4" stroke-linejoin="round"/><rect x="28" y="14" width="44" height="10" rx="3" fill="#c9435c" stroke="#2e2b2e" stroke-width="4"/><path d="M38 26l-8 52M50 26v54M62 26l8 52" stroke="#c9435c" stroke-width="3"/>',
  sweater: '<path d="M32 14 L18 20 L6 52 L18 56 L24 42 V88 H76 V42 L82 56 L94 52 L82 20 L68 14 Q50 26 32 14Z" fill="#3fa34d" stroke="#2e2b2e" stroke-width="4" stroke-linejoin="round"/><path d="M24 80h52M36 14q14 12 28 0" stroke="#2e2b2e" stroke-width="3" fill="none"/>',
  roof: '<rect x="22" y="50" width="56" height="40" fill="#f2e3c9" stroke="#2e2b2e" stroke-width="4"/><path d="M8 54 L50 14 L92 54Z" fill="#e5484d" stroke="#2e2b2e" stroke-width="5" stroke-linejoin="round"/><rect x="44" y="66" width="12" height="24" fill="#8b5e3c"/>',
  family: '<circle cx="26" cy="26" r="11" fill="#f1c6a0" stroke="#2e2b2e" stroke-width="3"/><path d="M12 92V56q0-14 14-14t14 14v36z" fill="#3d7bd9" stroke="#2e2b2e" stroke-width="3"/>'
    + '<circle cx="74" cy="26" r="11" fill="#f1c6a0" stroke="#2e2b2e" stroke-width="3"/><path d="M60 15q14-10 28 2v14q-6-10-14-10t-14 10z" fill="#8b5e3c"/><path d="M58 92l4-36q2-14 12-14t12 14l4 36z" fill="#e5484d" stroke="#2e2b2e" stroke-width="3"/>'
    + '<circle cx="50" cy="52" r="9" fill="#f1c6a0" stroke="#2e2b2e" stroke-width="3"/><path d="M40 92V74q0-12 10-12t10 12v18z" fill="#f4c430" stroke="#2e2b2e" stroke-width="3"/>',
  floor: '<path d="M6 56 L94 56 L94 92 L6 92Z" fill="#c9a77d" stroke="#2e2b2e" stroke-width="4"/><path d="M6 68h88M6 80h88M30 56v12M60 68v12M40 80v12M76 56v12" stroke="#8b5e3c" stroke-width="3"/><rect x="6" y="10" width="88" height="46" fill="#e8f1f6" stroke="#2e2b2e" stroke-width="4"/>',
};

IG_DRAWN.drawing = '<rect x="10" y="8" width="66" height="84" rx="4" fill="#fff" stroke="#2e2b2e" stroke-width="4"/>'
  + '<circle cx="58" cy="26" r="8" fill="#f4c430"/><path d="M20 70 L36 52 L52 70Z" fill="none" stroke="#e5484d" stroke-width="4" stroke-linejoin="round"/><rect x="24" y="70" width="24" height="14" fill="none" stroke="#3d7bd9" stroke-width="4"/>'
  + '<path d="M60 92 L92 40 L98 44 L66 96Z" fill="#f4c430" stroke="#2e2b2e" stroke-width="3" stroke-linejoin="round"/><path d="M60 92 L66 96 L58 99Z" fill="#2e2b2e"/>';

const IG_ACTIVITY_EMOJI = [
  [/\bpaint(ing|ed|s)?\b/, '🧑‍🎨'],
  [/\bsing(ing|s)?\b|\bsang\b|\bsinger\b/, '🧑‍🎤'],
  [/\bcook(ing|ed|s)?\b/, '🧑‍🍳'],
  [/\bgardening\b/, '🧑‍🌾'],
  [/^(reading|read|reads|to read)$/, '📖'],
  [/\bstudy(ing)?\b|\bstudies\b|\bstudied\b/, '🧑‍🎓'],
  [/^(working|works|work)$/, '🧑‍💼'],
];

// Words that are spelt differently in the illustrated sets.
const IG_PICTURE_ALIASES = {
  television: 'tv', 'tv set': 'tv', 'paintbrush': 'paint brush', 'bathtub': 'bathtub',
  'cupboard': 'cupboard', 'garden': 'yard', 'backyard': 'yard', crayon: 'crayons', 'colored pencil': 'colored pencils',
  'coloured pencils': 'colored pencils', 'bath': 'bathtub', 'stairs': '', 'sleepy': 'sleepy', 'scared': 'scared',
};

let igPictureLibrary = null;
function igPictures() {
  if (igPictureLibrary) return igPictureLibrary;
  const lib = {};
  // Animals are left out on purpose: the drawn emoji animals are clearer
  // and match the rest of a mixed word list.
  ['HOUSE_TOPIC', 'SCHOOL_OBJECTS_TOPIC', 'FEELINGS_TOPIC', 'INSTRUMENTS_TOPIC']
    .forEach(name => {
      let topic = null;
      try { topic = (0, eval)(name); } catch (e) { topic = null; }
      (topic && topic.words || []).forEach(w => {
        const key = String(w.en || '').toLowerCase().trim();
        // Whole-room scenes are too busy at answer-button size; 🛏️ 🍳 🛁
        // say "bedroom, kitchen, bathroom" better there and on a card.
        if (/^(bedroom|bathroom|kitchen|living room|dining room|yard)$/.test(key)) return;
        if (key && w.image && !lib[key]) lib[key] = w.image;
      });
    });
  // Only cache once the illustrated sets exist (this can be asked early).
  if (Object.keys(lib).length) igPictureLibrary = lib;
  return lib;
}

const igIsStockPhoto = src => /upload\.wikimedia\.org/i.test(String(src || ''));

// The best picture for a word: { image } or { emoji }.
function igBestPicture(word) {
  const key = String(word.en || '').toLowerCase().trim().replace(/^(a|an|the)\s+/, '');
  if (word.image && !igIsStockPhoto(word.image)) return { image: word.image };      // the teacher's own
  const lib = igPictures();
  const alias = Object.prototype.hasOwnProperty.call(IG_PICTURE_ALIASES, key) ? IG_PICTURE_ALIASES[key] : key;
  if (alias && lib[alias]) return { image: lib[alias] };
  if (Object.prototype.hasOwnProperty.call(IG_NUMBER_WORDS, key)) return { image: igGlyphCard(IG_NUMBER_WORDS[key]) };
  if (IG_ORDINALS[key]) return { image: igGlyphCard(IG_ORDINALS[key]) };
  if (IG_DAYS[key]) return { image: igGlyphCard(IG_DAYS[key], true) };
  if (IG_MONTHS[key]) return { image: igGlyphCard(IG_MONTHS[key], true) };
  if (key === 'today') return { image: igGlyphCard('Today', true) };
  // Prepositions: the clear box-and-ball diagram from the prepositions game
  // (the full scene is too small to read on a card).
  if (typeof prepositionFor === 'function' && typeof ppIconSVG === 'function') {
    const prep = prepositionFor({ en: key });
    if (prep) {
      const svg = ppIconSVG(prep.id).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      return { image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) };
    }
  }
  if (IG_DRAWN[key]) return { image: igSvgUri(IG_DRAWN[key]) };
  // Activities show someone DOING them, not just the tool: a palette does
  // not say "painting" to a five-year-old, a painter does.
  const isPerson = /[\u{1F466}-\u{1F469}\u{1F9D1}\u{1F9D2}\u{1F468}\u{1F469}\u{1F3C3}-\u{1F3CC}\u{1F6B4}-\u{1F6B6}\u{1F483}\u{1F57A}\u{1F938}-\u{1F93E}\u{1F9D7}]/u.test(word.emoji || '');
  if (!isPerson) {
    if (/\bdraw(ing|s)?\b|\bdrew\b/.test(key)) return { image: igSvgUri(IG_DRAWN.drawing) };
    for (const [re, emoji] of IG_ACTIVITY_EMOJI) if (re.test(key)) return { emoji };
  }
  if (word.emoji) return { emoji: word.emoji };
  if (word.image) return { image: word.image };
  return { emoji: '🖼️' };
}

// The canonical "word visual": colour swatch > the best picture (above).
// Used by games.js, app.js's arcade games, learning.js and the Game Maker
// preview so a word looks identical everywhere it appears.
function igWordVisualHTML(rawWord, extraClass) {
  const word = igNormalizeWord(rawWord);
  const cls = `word-visual ${extraClass || ''}`.trim();
  if (word.swatch) {
    return `<div class="${cls} swatch-visual" style="background:${igEscapeHtml(word.swatch)}"></div>`;
  }
  const pic = igBestPicture(word);
  if (pic.image) return `<div class="${cls}">${igImageHTML(pic.image, word.emoji, word.en)}</div>`;
  return `<div class="${cls}">${igEmojiImgHTML(pic.emoji, 'ig-emoji ig-emoji--word')}</div>`;
}

// A small picture for a quiz answer such as "In the bedroom": the topic
// word it mentions (longest match), so a child who cannot read yet can
// still choose. '' when the answer names no word of the topic.
function igOptionVisualHTML(optionText, topic) {
  const text = ` ${String(optionText || '').toLowerCase().replace(/[^a-z' ]+/g, ' ')} `;
  const words = (topic && topic.words || []).filter(w => w.en);
  const hit = words
    .map(w => ({ w, k: String(w.en).toLowerCase().trim() }))
    .filter(x => x.k.length > 1 && text.includes(` ${x.k} `))
    .sort((a, b) => b.k.length - a.k.length)[0];
  return hit ? igWordVisualHTML(hit.w, 'option-visual') : '';
}

// Every emoji typed into the page's text (tiles, buttons, quiz questions)
// drawn the same way, so nothing arrives in pieces on Windows. Inputs,
// text areas, menus and the games' own drawings are left alone.
const IG_TWEMOJI_SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'svg', 'SVG', 'NOSCRIPT', 'CODE', 'TITLE']);
const IG_PICTO = /\p{Extended_Pictographic}|⃣|[\u{1F1E6}-\u{1F1FF}]/u;
const igSegmenter = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

function igTwemojifyNode(textNode) {
  const value = textNode.nodeValue;
  if (!value || !IG_PICTO.test(value) || !igSegmenter) return;
  const parent = textNode.parentNode;
  if (!parent || IG_TWEMOJI_SKIP.has(parent.nodeName) || parent.closest && parent.closest('svg, [contenteditable="true"], .no-twemoji, textarea')) return;
  const frag = document.createDocumentFragment();
  let buffer = '';
  for (const { segment } of igSegmenter.segment(value)) {
    if (IG_PICTO.test(segment) && !/^[0-9#*]$/.test(segment) && !/^[©®™]$/.test(segment)) {
      if (buffer) { frag.appendChild(document.createTextNode(buffer)); buffer = ''; }
      const holder = document.createElement('span');
      holder.innerHTML = igEmojiImgHTML(segment, 'ig-emoji');
      frag.appendChild(holder.firstChild);
    } else {
      buffer += segment;
    }
  }
  if (buffer) frag.appendChild(document.createTextNode(buffer));
  parent.replaceChild(frag, textNode);
}

function igTwemojifyTree(root) {
  if (!root || !igSegmenter) return;
  if (root.nodeType === 3) { igTwemojifyNode(root); return; }
  if (root.nodeType !== 1 || IG_TWEMOJI_SKIP.has(root.nodeName)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (IG_PICTO.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(igTwemojifyNode);
}

(function igStartTwemoji() {
  if (typeof MutationObserver === 'undefined' || !igSegmenter) return;
  const start = () => {
    igTwemojifyTree(document.body);
    new MutationObserver(list => {
      list.forEach(m => {
        if (m.type === 'characterData') igTwemojifyNode(m.target);
        else m.addedNodes.forEach(igTwemojifyTree);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

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

// Classes the teacher deleted in Today's Class, waiting to be deleted from
// the cloud too (cloud.js). Kept on this device only, per workspace.
function igTombstoneKey() { return `hopscotch_session_tombstones_${igWorkspace}`; }
function igReadTombstones() {
  try { const m = JSON.parse(localStorage.getItem(igTombstoneKey()) || '{}'); return m && typeof m === 'object' ? m : {}; }
  catch (e) { return {}; }
}
function igSessionTombstones(studentId) { return (igReadTombstones()[studentId] || []).slice(); }
function igMarkSessionDeleted(studentId, sessionId) {
  const m = igReadTombstones();
  m[studentId] = [...new Set((m[studentId] || []).concat([sessionId]))];
  try { localStorage.setItem(igTombstoneKey(), JSON.stringify(m)); } catch (e) { /* private mode */ }
}
function igClearSessionTombstones(studentId, ids) {
  const m = igReadTombstones();
  m[studentId] = (m[studentId] || []).filter(id => !ids.includes(id));
  if (!m[studentId].length) delete m[studentId];
  try { localStorage.setItem(igTombstoneKey(), JSON.stringify(m)); } catch (e) { /* private mode */ }
}

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
