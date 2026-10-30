/* ==========================================================================
   IGenglishschool — 🦖 Jump & Learn (a platform game that asks questions)
   --------------------------------------------------------------------------
   Run, jump over gaps, pipes, steps and snails, collect coins… and every
   so often a locked gate 🔒 blocks the way. It opens only with the right
   answer to a question about what the class is learning:
     "How do you say 20 in English?"      → twenty / twelve / two
     "How do you say “lápis” in English?" → pencil / pen / ruler
     "What is this? 🍎"                   → apple / banana / grapes
   The teacher (or the student) picks the subject: numbers, school
   objects, colors, animals, the body, feelings, weather, fruits, the
   house — or any topic of the curriculum.

   Controls: ← → (or A D) to run, ↑ / W / space to jump, P to pause;
   big touch buttons under the game. 5 hearts: a snail or a fall takes one.
   Wrong answers go to "My mistakes" like every other game.
   ========================================================================== */

// side: 'left' = the picture looks left (mirrored when running right);
// no side = it looks at you and is never mirrored.
const JL_AVATARS = [
  { id: 'dino', en: 'Dino', emoji: '🦖', side: 'left' },
  { id: 'frog', en: 'Frog', emoji: '🐸' },
  { id: 'monkey', en: 'Monkey', emoji: '🐵' },
  { id: 'dog', en: 'Dog', emoji: '🐶' },
  { id: 'cat', en: 'Cat', emoji: '🐱' },
  { id: 'fox', en: 'Fox', emoji: '🦊' },
];
const JL_NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const JL_TENS = { 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety', 100: 'one hundred' };
const JL_SETTINGS_KEY = 'ig_jump_settings';
// The avatars on offer: the student's own look first, when there is one.
function jlAvatarList() {
  const look = typeof myavCurrent === 'function' ? myavCurrent() : null;
  return look ? [{ id: 'me', en: 'Me', look }].concat(JL_AVATARS) : JL_AVATARS;
}
const jlAvatarById = id => jlAvatarList().find(a => a.id === id) || JL_AVATARS[0];
const jlAvatarHTML = (a, cls) => (a.look && typeof myavHTML === 'function' ? myavHTML(a.look, `${cls} myav--small`) : jlEmojiHTML(a.emoji, cls));
const JL_HEARTS = 5;

// The subjects: each gives words { en, pt, emoji?, image?, num? }.
const jlFromTriples = list => (list || []).map(([en, pt, emoji]) => ({ en, pt, emoji }));
const jlFromTopic = t => (t && t.words ? t.words : []).map(w => ({ en: w.en, pt: w.pt, emoji: w.emoji, image: w.image }));
const JL_SETS = [
  { id: 'numbers', en: 'Numbers 1–20', pt: 'Números', icon: '🔢', words: () =>
    JL_NUMBER_WORDS.slice(1).map((en, i) => ({ en, pt: String(i + 1), num: i + 1 })) },
  { id: 'bignumbers', en: 'Numbers to 100', pt: 'Dezenas', icon: '💯', words: () =>
    Object.entries(JL_TENS).map(([n, en]) => ({ en, pt: n, num: Number(n) }))
      .concat([10, 11, 12, 15, 20].map(n => ({ en: JL_NUMBER_WORDS[n], pt: String(n), num: n }))) },
  { id: 'school', en: 'School objects', pt: 'Material escolar', icon: '🎒', words: () =>
    typeof SCHOOL_OBJECTS_TOPIC !== 'undefined' ? jlFromTopic(SCHOOL_OBJECTS_TOPIC) : [] },
  { id: 'colors', en: 'Colors', pt: 'Cores', icon: '🎨', words: () =>
    typeof KID_VOCAB !== 'undefined' ? jlFromTriples(KID_VOCAB.colors) : [] },
  { id: 'animals', en: 'Animals', pt: 'Animais', icon: '🦁', words: () =>
    typeof KID_VOCAB !== 'undefined' ? jlFromTriples(KID_VOCAB.animals) : [] },
  { id: 'fruits', en: 'Fruits', pt: 'Frutas', icon: '🍎', words: () => jlFromTriples([
    ['apple', 'maçã', '🍎'], ['banana', 'banana', '🍌'], ['grapes', 'uvas', '🍇'], ['strawberry', 'morango', '🍓'],
    ['orange', 'laranja', '🍊'], ['watermelon', 'melancia', '🍉'], ['pear', 'pera', '🍐'], ['cherries', 'cerejas', '🍒'],
    ['pineapple', 'abacaxi', '🍍'], ['mango', 'manga', '🥭'], ['lemon', 'limão', '🍋'], ['peach', 'pêssego', '🍑'],
  ]) },
  { id: 'body', en: 'Body parts', pt: 'Corpo', icon: '🧍', words: () =>
    typeof BODY_TOPIC !== 'undefined' ? jlFromTopic(BODY_TOPIC) : [] },
  { id: 'feelings', en: 'Feelings', pt: 'Sentimentos', icon: '😊', words: () =>
    typeof FEELINGS_TOPIC !== 'undefined' ? jlFromTopic(FEELINGS_TOPIC) : [] },
  { id: 'weather', en: 'Weather', pt: 'Clima', icon: '🌦️', words: () =>
    typeof WEATHER_TOPIC !== 'undefined' ? jlFromTopic(WEATHER_TOPIC) : [] },
  { id: 'house', en: 'The house', pt: 'Casa', icon: '🏠', words: () =>
    typeof KID_VOCAB !== 'undefined' ? jlFromTriples(KID_VOCAB.house) : [] },
];

function jlLoadSettings() {
  const base = { avatar: 'dino', set: 'numbers', topic: null, questions: 8 };
  try { return { ...base, ...(JSON.parse(localStorage.getItem(JL_SETTINGS_KEY) || '{}') || {}) }; } catch (e) { return base; }
}
function jlSaveSettings(s) { try { localStorage.setItem(JL_SETTINGS_KEY, JSON.stringify(s)); } catch (e) {} }

// A curriculum topic, saved as { levelId, topicId, title }.
function jlTopicWords(ref) {
  if (!ref || typeof LEVELS === 'undefined') return [];
  const level = LEVELS.find(l => l.id === ref.levelId);
  const topic = level && (level.topics || []).find(t => t.id === ref.topicId);
  return topic ? (topic.words || []).filter(w => w.en).map(w => ({ en: w.en, pt: w.pt, emoji: w.emoji, image: w.image })) : [];
}

const JL_IMAGES = {};
function jlImage(key) {
  if (!key) return null;
  if (!JL_IMAGES[key]) {
    const img = new Image();
    if (/^(data:|https?:|\/)/.test(key)) img.src = key;
    else if (typeof IG_TWEMOJI_BASE !== 'undefined' && typeof igEmojiCode === 'function') {
      img.crossOrigin = 'anonymous';
      img.src = `${IG_TWEMOJI_BASE}${igEmojiCode(key)}.svg`;
    }
    JL_IMAGES[key] = img;
  }
  return JL_IMAGES[key];
}
const jlEmojiHTML = (e, cls) => (typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML(e, cls) : `<span class="${cls}">${e}</span>`);

function jlSay(text, rate) {
  if (!text || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = rate || 0.9;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// QUESTIONS — one per locked gate, every answer a different word.
// ---------------------------------------------------------------------------
function jlMakeQuestions(words, n) {
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const clean = words.filter(w => w && w.en);
  const seen = new Set();
  const uniq = clean.filter(w => { const k = String(w.en).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  if (uniq.length < 3) return [];
  const targets = [];
  while (targets.length < n) targets.push(...shuffle(uniq));
  return targets.slice(0, n).map(w => {
    const others = shuffle(uniq.filter(x => x.en !== w.en)).slice(0, 2);
    const options = shuffle([w, ...others]);
    const hasPic = Boolean(w.image || w.emoji);
    const hasPt = Boolean(w.pt) && String(w.pt).toLowerCase() !== String(w.en).toLowerCase();
    if (w.num != null) {
      // Numbers: the digit asks for the word, or the word asks for the digit.
      return Math.random() < 0.65
        ? { word: w, kind: 'num-to-word', prompt: `How do you say <b class="jl-big">${w.num}</b> in English?`, options: options.map(o => ({ label: o.en, ok: o === w })) }
        : { word: w, kind: 'word-to-num', prompt: `Which number is <b>“${igEscapeHtml(w.en)}”</b>?`, options: options.map(o => ({ label: String(o.num), ok: o === w, big: true })) };
    }
    const usePic = hasPic && (!hasPt || Math.random() < 0.5);
    return usePic
      ? { word: w, kind: 'picture', prompt: 'What is this?', picture: w, options: options.map(o => ({ label: o.en, ok: o === w })) }
      : { word: w, kind: 'pt', prompt: `How do you say <b>“${igEscapeHtml(w.pt)}”</b> in English?`, options: options.map(o => ({ label: o.en, ok: o === w })) };
  });
}

// ---------------------------------------------------------------------------
// THE LEVEL — a strip of tiles 13 high. 0 air · 1 ground · 2 brick ·
// 3 pipe · 4 locked gate · 5 ? block · 6 used block · 7 stone
// ---------------------------------------------------------------------------
const JL_H = 13, JL_TOP = 10;   // the ground's top row
function jlBuildLevel(nGates) {
  const cols = [];             // each: Uint8Array(JL_H)
  const coins = [], enemies = [], gates = [];
  const col = () => { const c = new Uint8Array(JL_H); for (let y = JL_TOP; y < JL_H; y++) c[y] = 1; cols.push(c); return c; };
  const flat = n => { for (let i = 0; i < n; i++) col(); };
  const gap = n => { for (let i = 0; i < n; i++) cols.push(new Uint8Array(JL_H)); };
  const x = () => cols.length;

  const pieces = {
    gap() { flat(2); const w = 2 + Math.floor(Math.random() * 2); const x0 = x(); gap(w);
      for (let i = 0; i < w + 1; i++) coins.push({ x: x0 - 0.5 + i, y: JL_TOP - 2.6 - Math.sin((i / w) * Math.PI) * 0.8 }); flat(2); },
    pipe() { flat(2); const h = 2; for (let k = 0; k < 2; k++) { const c = col(); for (let y = JL_TOP - h; y < JL_TOP; y++) c[y] = 3; }
      coins.push({ x: x() - 1.5, y: JL_TOP - h - 1.6 }); flat(3); },
    steps() { flat(1); [1, 2, 3, 3, 2, 1].forEach(h => { const c = col(); for (let y = JL_TOP - h; y < JL_TOP; y++) c[y] = 7; });
      coins.push({ x: x() - 3.5, y: JL_TOP - 4.6 }, { x: x() - 2.5, y: JL_TOP - 4.6 }); flat(2); },
    platform() { flat(2); const x0 = x(); flat(6);
      for (let i = 1; i < 5; i++) { cols[x0 + i][JL_TOP - 3] = 2; coins.push({ x: x0 + i + 0.5, y: JL_TOP - 4.4 }); } flat(1); },
    snail() { flat(3); enemies.push({ x: x() + 2, y: JL_TOP - 0.8, vx: -1.2 }); flat(7); },
    snailgap() { flat(2); enemies.push({ x: x() + 1, y: JL_TOP - 0.8, vx: -1.2 }); flat(4); gap(2); flat(3); },
  };
  const kinds = Object.keys(pieces);
  const pickTwo = () => { const a = kinds[Math.floor(Math.random() * kinds.length)]; let b; do { b = kinds[Math.floor(Math.random() * kinds.length)]; } while (b === a); return [a, b]; };

  flat(8);
  for (let g = 0; g < nGates; g++) {
    (g === 0 ? ['pipe', 'snail'] : pickTwo()).forEach(k => pieces[k]());
    // The gate: a ? block to bump and a tall locked wall that cannot be jumped.
    flat(3);
    const qx = x(); const qc = col(); qc[JL_TOP - 4] = 5;
    flat(1);
    const wx = x(); const wc = col(); for (let y = 1; y < JL_TOP; y++) wc[y] = 4;
    gates.push({ i: g, qx, qy: JL_TOP - 4, wx, solved: false });
    flat(2);
  }
  flat(6);
  const flagX = x();
  flat(12);
  const W = cols.length;
  const tiles = new Uint8Array(W * JL_H);
  cols.forEach((c, cx) => c.forEach((v, y) => { tiles[y * W + cx] = v; }));
  return { W, tiles, coins: coins.map(c => ({ ...c, taken: false })), enemies: enemies.map(e => ({ ...e, w: 0.9, h: 0.8, vy: 0, alive: true, squash: 0 })), gates, flagX };
}

// opts.words: play with exactly these words (e.g. the class's mistakes).
function openJumpGame(opts) {
  const settings = jlLoadSettings();
  const custom = opts && Array.isArray(opts.words) && opts.words.length >= 3 ? opts.words : null;
  if (custom) settings.set = 'custom';
  let stopGame = null;

  openModal(`
    <div class="modal-content-pad jl">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">${jlEmojiHTML('🦖', 'jl-head-img')}</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Jump &amp; Learn</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">Jump, run… and answer to open the gates! 🔒</span></p>
        </div>
      </div>
      <div id="jlMount"></div>
    </div>`, true);
  const mount = () => document.getElementById('jlMount');

  function wordsFor() {
    if (settings.set === 'custom' && custom) return custom.map(w => ({ en: w.en, pt: w.pt, emoji: w.emoji, image: w.image }));
    if (settings.set === 'topic') return jlTopicWords(settings.topic);
    const s = JL_SETS.find(x => x.id === settings.set) || JL_SETS[0];
    return s.words();
  }

  // ---- setup ---------------------------------------------------------------
  function setup() {
    if (stopGame) { stopGame(); stopGame = null; }
    const m = mount();
    if (!m) return;
    const sets = JL_SETS.filter(s => s.words().length >= 3);
    const topicLabel = settings.topic ? igEscapeHtml(settings.topic.title) : 'Choose a topic…';
    m.innerHTML = `
      <div class="mz-setup">
        <div class="mz-row">
          <span class="mz-row-label">Player</span>
          <div class="mz-opts">
            ${jlAvatarList().map(a => `
              <button type="button" class="mz-opt${settings.avatar === a.id ? ' on' : ''}" data-av="${a.id}">
                ${jlAvatarHTML(a, 'mz-av-img')}<small>${a.en}</small>
              </button>`).join('')}
          </div>
        </div>
        <div class="mz-row">
          <span class="mz-row-label">Questions about</span>
          <div class="mz-opts">
            ${sets.map(s => `
              <button type="button" class="mz-opt${settings.set === s.id ? ' on' : ''}" data-set="${s.id}">
                ${jlEmojiHTML(s.icon, 'mz-av-img')}<small>${s.en}</small><small class="mz-pt">${s.pt}</small>
              </button>`).join('')}
            ${custom ? `<button type="button" class="mz-opt${settings.set === 'custom' ? ' on' : ''}" data-set="custom">
              ${jlEmojiHTML('🔁', 'mz-av-img')}<small>${igEscapeHtml(opts.title || 'My words')}</small><small class="mz-pt">${custom.length} palavras</small>
            </button>` : ''}
            <button type="button" class="mz-opt${settings.set === 'topic' ? ' on' : ''}" data-set="topic">
              ${jlEmojiHTML('📚', 'mz-av-img')}<small>${topicLabel}</small><small class="mz-pt">Tópico do currículo</small>
            </button>
          </div>
        </div>
        ${settings.set === 'topic' ? `
          <div class="mz-row">
            <span class="mz-row-label"></span>
            <div class="jl-topic-pick">
              <input type="search" class="gs-search" id="jlTopicSearch" placeholder="🔍 family, animals, verb to be…" autocomplete="off" />
              <div class="gs-topics" id="jlTopicList"></div>
            </div>
          </div>` : ''}
        <div class="mz-row">
          <span class="mz-row-label">Gates 🔒</span>
          <div class="mz-opts">
            ${[5, 8, 12].map(n => `<button type="button" class="mz-opt mz-opt--wide${settings.questions === n ? ' on' : ''}" data-q="${n}">${n} questions</button>`).join('')}
          </div>
        </div>
        <p class="mz-keys">⌨️ ← → run · ↑ or space jump · P pause · 👆 buttons under the game · ❤️ ${JL_HEARTS} hearts</p>
        <button type="button" class="btn btn-primary mz-start" data-start>▶ Start!</button>
        <p class="jl-error" data-error></p>
      </div>`;
    // A custom list is for this time only: it is not remembered.
    const repaint = () => { jlSaveSettings(settings.set === 'custom' ? { ...settings, set: 'numbers' } : settings); setup(); };
    m.querySelectorAll('[data-av]').forEach(b => b.addEventListener('click', () => {
      settings.avatar = b.dataset.av; jlSay(jlAvatarById(b.dataset.av).en); repaint();
    }));
    m.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => { settings.set = b.dataset.set; repaint(); }));
    m.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { settings.questions = Number(b.dataset.q); repaint(); }));
    const search = m.querySelector('#jlTopicSearch');
    if (search) {
      const list = m.querySelector('#jlTopicList');
      const paintList = () => {
        const q = search.value.trim();
        const found = typeof gsMatchTopics === 'function' ? gsMatchTopics(q || (settings.topic && settings.topic.title) || 'a', 12) : [];
        list.innerHTML = found.length ? found.map(x => `
          <button class="gs-topic${settings.topic && settings.topic.topicId === x.topic.id && settings.topic.levelId === x.level.id ? ' on' : ''}" type="button" data-topic="${igEscapeHtml(x.level.id)}|${igEscapeHtml(x.topic.id)}">
            <span class="gs-topic-emoji">${igEscapeHtml(x.topic.emoji || '📘')}</span><b>${igEscapeHtml(x.topic.title)}</b><small>${igEscapeHtml(x.level.code || '')}</small>
          </button>`).join('') : '<p class="gs-hint">Type the name of the topic.</p>';
        list.querySelectorAll('[data-topic]').forEach(b => b.addEventListener('click', () => {
          const [levelId, topicId] = b.dataset.topic.split('|');
          const lv = LEVELS.find(l => l.id === levelId); const tp = lv && lv.topics.find(t => t.id === topicId);
          settings.topic = { levelId, topicId, title: tp ? tp.title : topicId };
          repaint();
        }));
      };
      search.addEventListener('input', paintList);
      paintList();
    }
    m.querySelector('[data-start]').addEventListener('click', () => {
      const qs = jlMakeQuestions(wordsFor(), settings.questions);
      if (!qs.length) { m.querySelector('[data-error]').textContent = 'Choose a subject with at least 3 words. 📚'; return; }
      jlSaveSettings(settings.set === 'custom' ? { ...settings, set: 'numbers' } : settings);
      play(qs);
    });
  }

  // ---- the game ----------------------------------------------------------------
  function play(questions) {
    const m = mount();
    if (!m) return;
    const level = jlBuildLevel(questions.length);
    const { W, tiles, coins, enemies, gates, flagX } = level;
    const H = JL_H;
    const avatar = jlAvatarById(settings.avatar);
    ['🐌', '🔒', '🏰', '🪙', avatar.emoji].forEach(jlImage);
    if (avatar.look && typeof myavPreload === 'function') myavPreload(avatar.look);

    const tile = (x, y) => (x < 0 || x >= W ? 7 : y < 0 || y >= H ? 0 : tiles[y * W + x]);
    const setTile = (x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) tiles[y * W + x] = v; };
    const solid = (x, y) => (x < 0 || x >= W) ? true : (y < 0 || y >= H) ? false : tiles[y * W + x] !== 0;

    const P = { x: 2, y: JL_TOP - 0.95, w: 0.8, h: 0.95, vx: 0, vy: 0, ground: false, face: 1,
      hearts: JL_HEARTS, coins: 0, inv: 0, coyote: 0, buffer: 0, cp: 2, squash: 0 };
    const input = { left: false, right: false, jump: false };
    let solvedCount = 0, mistakes = 0, paused = false, asking = null, done = false;
    const particles = [];
    const bump = { x: -1, t: 0 };
    openJumpGame.debug = { P, input, gates, tile };   // for tests in the console

    m.innerHTML = `
      <div class="jl-game">
        <div class="mz-scores">
          <span class="jl-hud">${jlAvatarHTML(avatar, 'mz-av-img')}<span class="jl-hearts" data-hearts></span></span>
          <span class="jl-hud">${jlEmojiHTML('🪙', 'jl-hud-img')}<b data-coins>0</b></span>
          <span class="jl-hud">🔒 <b data-gates>0/${questions.length}</b></span>
          <span class="mz-left"></span>
          <button type="button" class="game-btn secondary" data-pause title="Pause (P)">⏸ Pause</button>
          <button type="button" class="game-btn secondary" data-menu>⚙️ Menu</button>
        </div>
        <div class="jl-stage">
          <canvas class="jl-canvas" data-canvas></canvas>
          <div class="jl-ask" data-ask hidden></div>
        </div>
        <div class="jl-pad">
          <div class="jl-pad-dir">
            <button type="button" data-hold="left" aria-label="left">◀</button>
            <button type="button" data-hold="right" aria-label="right">▶</button>
          </div>
          <button type="button" class="jl-pad-jump" data-hold="jump" aria-label="jump">⤒ JUMP</button>
        </div>
      </div>`;
    const canvas = m.querySelector('[data-canvas]');
    const ctx = canvas.getContext('2d');
    const askEl = m.querySelector('[data-ask]');
    let S = 32, viewW = 20;
    function fit() {
      const w = Math.min(m.clientWidth || 700, 1000);
      const h = Math.max(240, Math.min(w * 0.56, window.innerHeight - 330));
      S = h / H; viewW = w / S;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();

    const paintHud = () => {
      m.querySelector('[data-hearts]').textContent = '❤️'.repeat(Math.max(0, P.hearts)) + '🤍'.repeat(Math.max(0, JL_HEARTS - P.hearts));
      m.querySelector('[data-coins]').textContent = P.coins;
      m.querySelector('[data-gates]').textContent = `${solvedCount}/${questions.length}`;
    };
    paintHud();

    // ---- controls --------------------------------------------------------------
    const KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'jump', w: 'jump', ' ': 'jump' };
    const onDown = e => {
      if (e.target.matches && e.target.matches('input, textarea, select')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (asking && /^[1-4]$/.test(k)) { const b = askEl.querySelectorAll('[data-opt]')[Number(k) - 1]; if (b) b.click(); return; }
      if (k === 'p') { e.preventDefault(); togglePause(); return; }
      const a = KEYS[k]; if (!a) return;
      e.preventDefault();
      if (a === 'jump' && !input.jump) P.buffer = 0.14;
      input[a] = true;
    };
    const onUp = e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; const a = KEYS[k]; if (a) input[a] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    m.querySelectorAll('[data-hold]').forEach(b => {
      const a = b.dataset.hold;
      const on = e => { e.preventDefault(); if (a === 'jump' && !input.jump) P.buffer = 0.14; input[a] = true; b.classList.add('on'); };
      const off = () => { input[a] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
      b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    function togglePause() {
      if (done || asking) return;
      paused = !paused;
      const b = m.querySelector('[data-pause]'); if (b) b.textContent = paused ? '▶ Play' : '⏸ Pause';
    }
    m.querySelector('[data-pause]').addEventListener('click', togglePause);
    m.querySelector('[data-menu]').addEventListener('click', setup);

    // ---- the question at a gate ---------------------------------------------------
    function ask(gate) {
      if (asking || gate.solved || done) return;
      const q = questions[gate.i];
      asking = { gate, q, tries: 0 };
      input.left = input.right = input.jump = false;
      const pic = q.picture ? (typeof igWordVisualHTML === 'function' ? igWordVisualHTML(q.picture, 'jl-ask-pic') : jlEmojiHTML(q.picture.emoji, 'jl-ask-pic')) : '';
      askEl.innerHTML = `
        <div class="jl-ask-card">
          <p class="jl-ask-n">🔒 ${gate.i + 1} / ${questions.length}</p>
          ${pic}
          <p class="jl-ask-q">${q.prompt}</p>
          <div class="jl-ask-opts">
            ${q.options.map((o, i) => `<button type="button" class="jl-opt${o.big ? ' big' : ''}" data-opt="${i}"><small>${i + 1}</small>${igEscapeHtml(o.label)}</button>`).join('')}
          </div>
        </div>`;
      askEl.hidden = false;
      if (q.kind === 'picture') jlSay('What is this?');
      askEl.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => answer(b, q.options[Number(b.dataset.opt)])));
    }
    function answer(btn, opt) {
      if (!asking || btn.disabled) return;
      const { gate, q } = asking;
      const word = { en: q.word.en, pt: q.word.pt, emoji: q.word.emoji, image: q.word.image };
      if (opt.ok) {
        btn.classList.add('ok');
        if (typeof IGSound !== 'undefined') IGSound.correct && IGSound.correct();
        if (typeof igMiss === 'function') igMiss(word, asking.tries === 0, 'Jump & Learn');
        jlSay(q.word.en);
        setTimeout(() => { askEl.hidden = true; askEl.innerHTML = ''; asking = null; open(gate); }, 900);
      } else {
        asking.tries++; mistakes++;
        btn.disabled = true; btn.classList.add('no');
        if (typeof IGSound !== 'undefined') IGSound.wrong && IGSound.wrong();
        if (asking.tries === 1 && typeof igMiss === 'function') igMiss(word, false, 'Jump & Learn');
      }
    }
    // The wall crumbles, the block gives coins, and this is the new start point.
    function open(gate) {
      gate.solved = true; solvedCount++;
      for (let y = 1; y < JL_TOP; y++) {
        if (tile(gate.wx, y) === 4) {
          setTile(gate.wx, y, 0);
          for (let k = 0; k < 3; k++) particles.push({ x: gate.wx + Math.random(), y: y + Math.random(), vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 8, life: 1.2, c: '#8a8f99' });
        }
      }
      setTile(gate.qx, gate.qy, 6);
      // Five coins jump out of the block and are counted at once.
      P.coins += 5;
      for (let k = 0; k < 5; k++) particles.push({ x: gate.qx + 0.35, y: gate.qy - 0.6, vx: (k - 2) * 1.6, vy: -9 - Math.random() * 3, life: 0.9, coin: true });
      P.cp = gate.wx - 1.5;
      if (typeof IGSound !== 'undefined') IGSound.pop && IGSound.pop();
      paintHud();
    }

    function hurt(fell) {
      if (P.inv > 0 && !fell) return;
      P.hearts--; paintHud();
      if (typeof IGSound !== 'undefined') IGSound.wrong && IGSound.wrong();
      if (P.hearts <= 0) { finish(false); return; }
      P.inv = 1.6;
      if (fell) { P.x = P.cp; P.y = JL_TOP - P.h - 0.5; P.vx = 0; P.vy = 0; }
      else { P.vy = -8; P.vx = -P.face * 5; }
    }

    // ---- physics -------------------------------------------------------------------
    const G = 40, JUMP = 17, RUN = 6;
    function moveX(o, dx) {
      o.x += dx;
      const top = Math.floor(o.y + 0.02), bot = Math.floor(o.y + o.h - 0.02);
      if (dx > 0) {
        const cx = Math.floor(o.x + o.w);
        for (let y = top; y <= bot; y++) if (solid(cx, y)) { o.x = cx - o.w - 0.001; o.vx = 0; return { x: cx, y }; }
      } else if (dx < 0) {
        const cx = Math.floor(o.x);
        for (let y = top; y <= bot; y++) if (solid(cx, y)) { o.x = cx + 1.001; o.vx = 0; return { x: cx, y }; }
      }
      return null;
    }
    function moveY(o, dy) {
      o.y += dy; o.ground = false;
      const l = Math.floor(o.x + 0.02), r = Math.floor(o.x + o.w - 0.02);
      if (dy > 0) {
        const cy = Math.floor(o.y + o.h);
        for (let x = l; x <= r; x++) if (solid(x, cy)) { o.y = cy - o.h; o.vy = 0; o.ground = true; return null; }
      } else if (dy < 0) {
        const cy = Math.floor(o.y);
        // Hit from below: the block nearest the middle of the head counts.
        const mid = Math.floor(o.x + o.w / 2);
        const order = [mid, l, r].filter((v, i, a) => a.indexOf(v) === i);
        for (const x of order) if (solid(x, cy)) { o.y = cy + 1.001; o.vy = 0; return { x, y: cy }; }
      }
      return null;
    }
    const gateAtWall = x => gates.find(g => g.wx === x && !g.solved);
    const gateAtBlock = (x, y) => gates.find(g => g.qx === x && g.qy === y && !g.solved);

    function step(dt) {
      if (paused || asking || done) return;
      // run
      const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (want) P.face = want;
      const target = want * RUN;
      const acc = P.ground ? 40 : 22;
      P.vx += Math.max(-acc * dt, Math.min(acc * dt, target - P.vx));
      // jump: a little forgiveness before the edge and before landing
      P.coyote = P.ground ? 0.1 : Math.max(0, P.coyote - dt);
      P.buffer = Math.max(0, P.buffer - dt);
      if (P.buffer > 0 && P.coyote > 0) { P.vy = -JUMP; P.buffer = 0; P.coyote = 0; P.squash = 0.15; }
      if (!input.jump && P.vy < -6) P.vy = -6;           // a short tap is a short hop
      P.vy = Math.min(20, P.vy + G * dt);
      const hx = moveX(P, P.vx * dt);
      if (hx && tile(hx.x, hx.y) === 4) { const g = gateAtWall(hx.x); if (g) ask(g); }
      const hy = moveY(P, P.vy * dt);
      if (hy) {
        const t = tile(hy.x, hy.y);
        if (t === 5) { bump.x = hy.x; bump.t = 0.2; const g = gateAtBlock(hy.x, hy.y); if (g) ask(g); }
        else if (t === 2 || t === 6) { bump.x = hy.x; bump.t = 0.15; }
      }
      if (P.inv > 0) P.inv -= dt;
      if (P.squash > 0) P.squash -= dt;
      if (bump.t > 0) bump.t -= dt;
      if (P.y > H + 1) hurt(true);
      if (P.x < 0) P.x = 0;

      // coins
      coins.forEach(c => {
        if (c.taken) return;
        if (Math.abs(P.x + P.w / 2 - c.x) < 0.7 && Math.abs(P.y + P.h / 2 - c.y) < 0.8) {
          c.taken = true; P.coins++; paintHud();
          if (typeof IGSound !== 'undefined') IGSound.pickup && IGSound.pickup();
        }
      });
      // snails: walk, turn at walls and edges; stomp them from above
      enemies.forEach(e => {
        if (!e.alive) { if (e.squash > 0) e.squash -= dt; return; }
        if (Math.abs(e.x - P.x) > viewW + 4) return;      // asleep until near
        e.vy = Math.min(20, e.vy + G * dt);
        const front = e.vx > 0 ? Math.floor(e.x + e.w + 0.05) : Math.floor(e.x - 0.05);
        if (e.ground && !solid(front, Math.floor(e.y + e.h + 0.1))) e.vx = -e.vx;
        const dir = Math.sign(e.vx) || -1;
        if (moveX(e, e.vx * dt)) e.vx = -dir * 1.2;      // a wall: turn round
        moveY(e, e.vy * dt);
        if (e.y > H + 1) e.alive = false;
        const over = P.x < e.x + e.w && P.x + P.w > e.x && P.y < e.y + e.h && P.y + P.h > e.y;
        if (!over) return;
        if (P.vy > 0 && P.y + P.h - e.y < 0.55) {
          e.alive = false; e.squash = 0.5; P.vy = -11; P.coins++; paintHud();
          if (typeof IGSound !== 'undefined') IGSound.pop && IGSound.pop();
        } else hurt(false);
      });
      particles.forEach(p => { p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
      for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
      if (P.x >= flagX) finish(true);
    }

    // ---- drawing --------------------------------------------------------------------
    let camX = 0;
    function draw(now) {
      const w = viewW * S, h = H * S;
      camX += ((Math.max(0, Math.min(W - viewW, P.x - viewW * 0.35))) - camX) * 0.2;
      // sky, far hills, clouds
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#7ec8f3'); g.addColorStop(1, '#d9f1ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = -1; i < viewW / 12 + 2; i++) {
        const hx = (Math.floor(camX * 0.4 / 12) + i) * 12;
        const sx = (hx - camX * 0.4) * S;
        ctx.fillStyle = '#9ed58a'; ctx.beginPath(); ctx.ellipse(sx + 4 * S, JL_TOP * S, 5 * S, 3.2 * S, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#b5e2a2'; ctx.beginPath(); ctx.ellipse(sx + 9 * S, JL_TOP * S, 3.5 * S, 2 * S, 0, Math.PI, 0); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = -1; i < viewW / 9 + 2; i++) {
        const cx = (Math.floor(camX * 0.2 / 9) + i) * 9;
        const sx = (cx - camX * 0.2) * S, sy = (1.5 + ((cx * 7) % 3)) * S;
        ctx.beginPath(); ctx.ellipse(sx, sy, 1.2 * S, 0.5 * S, 0, 0, Math.PI * 2); ctx.ellipse(sx + 0.9 * S, sy - 0.3 * S, 0.8 * S, 0.5 * S, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      ctx.translate(-camX * S, 0);
      const x0 = Math.max(0, Math.floor(camX) - 1), x1 = Math.min(W - 1, Math.ceil(camX + viewW) + 1);
      for (let x = x0; x <= x1; x++) for (let y = 0; y < H; y++) {
        const t = tiles[y * W + x];
        if (!t) continue;
        const px = x * S, by = (bump.t > 0 && bump.x === x && (t === 5 || t === 2 || t === 6)) ? -bump.t * S * 1.2 : 0;
        const py = y * S + by;
        if (t === 1) {
          const top = y === 0 || tiles[(y - 1) * W + x] === 0;
          ctx.fillStyle = '#b8783e'; ctx.fillRect(px, py, S + 0.5, S + 0.5);
          ctx.fillStyle = '#a3672f'; ctx.fillRect(px + S * 0.2, py + S * 0.55, S * 0.15, S * 0.15); ctx.fillRect(px + S * 0.65, py + S * 0.3, S * 0.12, S * 0.12);
          if (top) { ctx.fillStyle = '#5cbf4a'; ctx.fillRect(px, py, S + 0.5, S * 0.3); ctx.fillStyle = '#4aa83a'; ctx.fillRect(px, py + S * 0.26, S + 0.5, S * 0.06); }
        } else if (t === 2) {
          ctx.fillStyle = '#d8743a'; ctx.fillRect(px, py, S, S);
          ctx.strokeStyle = '#8f3f17'; ctx.lineWidth = Math.max(1, S * 0.06); ctx.strokeRect(px + 0.5, py + 0.5, S - 1, S - 1);
          ctx.beginPath(); ctx.moveTo(px, py + S / 2); ctx.lineTo(px + S, py + S / 2); ctx.moveTo(px + S / 2, py); ctx.lineTo(px + S / 2, py + S / 2); ctx.stroke();
        } else if (t === 3) {
          const capTop = tiles[(y - 1) * W + x] !== 3;
          const left = x > 0 && tiles[y * W + x - 1] === 3 ? 0 : 1;
          ctx.fillStyle = '#3fae5a'; ctx.fillRect(px, py, S, S);
          ctx.fillStyle = '#7ad66f'; if (left) ctx.fillRect(px + S * 0.15, py, S * 0.18, S);
          if (capTop) { ctx.fillStyle = '#2f9a48'; ctx.fillRect(px - (left ? S * 0.12 : 0), py, S * (1.12), S * 0.35); }
          ctx.strokeStyle = '#1f6b31'; ctx.lineWidth = 1.5; ctx.strokeRect(px + 0.5, py + 0.5, S - 1, S - 1);
        } else if (t === 4) {
          ctx.fillStyle = '#7d8592'; ctx.fillRect(px, py, S, S);
          ctx.strokeStyle = '#5b626d'; ctx.lineWidth = Math.max(1, S * 0.05); ctx.strokeRect(px + 1, py + 1, S - 2, S - 2);
          if (y === JL_TOP - 2) { const img = jlImage('🔒'); if (img && img.complete && img.naturalWidth) ctx.drawImage(img, px + S * 0.12, py + S * 0.12, S * 0.76, S * 0.76); }
        } else if (t === 5) {
          const pulse = 1 + Math.sin(now / 200) * 0.04;
          ctx.fillStyle = '#f8c630'; ctx.fillRect(px, py, S, S);
          ctx.strokeStyle = '#a8761b'; ctx.lineWidth = Math.max(1.5, S * 0.07); ctx.strokeRect(px + 1, py + 1, S - 2, S - 2);
          ctx.fillStyle = '#fff'; ctx.font = `900 ${S * 0.72 * pulse}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('?', px + S / 2, py + S * 0.54);
        } else if (t === 6) {
          ctx.fillStyle = '#a0683a'; ctx.fillRect(px, py, S, S);
          ctx.strokeStyle = '#6e4322'; ctx.lineWidth = 1.5; ctx.strokeRect(px + 0.5, py + 0.5, S - 1, S - 1);
        } else if (t === 7) {
          ctx.fillStyle = '#c9a77d'; ctx.fillRect(px, py, S, S);
          ctx.strokeStyle = '#8c6a44'; ctx.lineWidth = 1.5; ctx.strokeRect(px + 0.5, py + 0.5, S - 1, S - 1);
          ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(px + 2, py + 2, S - 4, S * 0.18);
        }
      }
      // where to go: a bouncing arrow over the next locked gate's ? block
      const next = gates.find(g => !g.solved);
      if (next && Math.abs(next.qx - P.x) < 8) {
        const ay = (next.qy - 1.2 + Math.sin(now / 180) * 0.2) * S;
        ctx.fillStyle = '#e5484d'; ctx.font = `900 ${S * 0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('▼', (next.qx + 0.5) * S, ay);
      }
      // coins
      coins.forEach(c => {
        if (c.taken || c.x < camX - 2 || c.x > camX + viewW + 2) return;
        const sw = Math.abs(Math.cos(now / 220 + c.x));
        ctx.fillStyle = '#ffd400'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(c.x * S, c.y * S, S * 0.3 * Math.max(0.2, sw), S * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      // the flag and the castle
      ctx.fillStyle = '#6b6f76'; ctx.fillRect((flagX + 0.45) * S, 2 * S, S * 0.1, (JL_TOP - 2) * S);
      ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo((flagX + 0.55) * S, 2.1 * S); ctx.lineTo((flagX + 2) * S, 2.7 * S); ctx.lineTo((flagX + 0.55) * S, 3.3 * S); ctx.fill();
      const castle = jlImage('🏰');
      if (castle && castle.complete && castle.naturalWidth) ctx.drawImage(castle, (flagX + 3) * S, (JL_TOP - 4) * S, 4 * S, 4 * S);
      // snails
      enemies.forEach(e => {
        if (!e.alive && e.squash <= 0) return;
        const img = jlImage('🐌');
        const ex = e.x * S, ey = e.y * S;
        ctx.save(); ctx.translate(ex + e.w * S / 2, ey + e.h * S);
        if (e.vx > 0) ctx.scale(-1, 1);
        if (!e.alive) ctx.scale(1.2, 0.35);
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -S * 0.55, -S * 1.05, S * 1.1, S * 1.1);
        ctx.restore();
      });
      // the player
      if (!(P.inv > 0 && Math.floor(now / 100) % 2)) {
        const sq = P.squash > 0 ? 1 + P.squash : 1;
        if (avatar.look && typeof myavDraw === 'function') {
          const run = P.ground && Math.abs(P.vx) > 0.5 ? Math.abs(Math.sin(now / 80)) * S * 0.08 : 0;
          myavDraw(ctx, avatar.look, (P.x + P.w / 2) * S, (P.y + P.h) * S - S * 0.66 * sq - run, S * 1.3, false);
        }
        const img = avatar.look ? null : jlImage(avatar.emoji);
        ctx.save(); ctx.translate((P.x + P.w / 2) * S, (P.y + P.h) * S);
        if (avatar.side === 'left' && P.face > 0) ctx.scale(-1, 1);   // looking where it runs
        ctx.scale(1 / sq, sq);
        const run = P.ground && Math.abs(P.vx) > 0.5 ? Math.abs(Math.sin(now / 80)) * S * 0.08 : 0;
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -S * 0.65, -S * 1.25 - run, S * 1.3, S * 1.3);
        ctx.restore();
      }
      particles.forEach(p => {
        if (p.coin) {
          ctx.globalAlpha = Math.min(1, p.life * 2);
          ctx.fillStyle = '#ffd400'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(p.x * S, p.y * S, S * 0.28, S * 0.28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.globalAlpha = 1;
        } else { ctx.fillStyle = p.c; ctx.fillRect(p.x * S, p.y * S, S * 0.25, S * 0.25); }
      });
      ctx.restore();
      if (paused) {
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff'; ctx.font = `900 ${S * 1.6}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Paused', w / 2, h / 2);
      }
    }

    // ---- loop ----------------------------------------------------------------------
    // The game runs on its own clock; the drawing follows when the browser
    // draws (a window covered by Zoom is not drawn, but must not freeze).
    let last = performance.now(), raf = 0;
    const clock = setInterval(() => {
      if (!canvas.isConnected) { cleanup(); return; }
      const now = performance.now();
      let left = Math.min(0.1, (now - last) / 1000); last = now;
      while (left > 0) { const dt = Math.min(1 / 60, left); left -= dt; step(dt); }
    }, 1000 / 60);
    function frame(now) {
      if (!canvas.isConnected) { cleanup(); return; }
      draw(now);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function finish(won) {
      if (done) return;
      done = true;
      if (typeof IGSound !== 'undefined') (won ? IGSound.win : IGSound.wrong) && (won ? IGSound.win() : IGSound.wrong());
      const stars = won ? (mistakes === 0 ? 3 : mistakes <= Math.ceil(questions.length / 3) ? 2 : 1) : 0;
      if (won && typeof awardProgress === 'function') awardProgress(10 + solvedCount * 2, stars >= 2 ? 1 : 0);
      jlSay(won ? 'You did it! Great job!' : 'Oh no! Try again!');
      const end = document.createElement('div');
      end.className = 'mz-end';
      end.innerHTML = `
        <div class="mz-end-card">
          <p class="mz-end-title">${won ? 'You did it! 🏰' : 'Oh no! 🐌'}</p>
          ${won ? `<p class="jl-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>` : ''}
          <p class="jl-end-line">🔒 ${solvedCount}/${questions.length} gates · ${jlEmojiHTML('🪙', 'jl-hud-img')} ${P.coins}${won && mistakes ? ` · ❌ ${mistakes}` : ''}</p>
          <div class="an-done-actions">
            <button type="button" class="btn btn-primary" data-again>🔄 Play again</button>
            <button type="button" class="game-btn secondary" data-menu2>⚙️ Menu</button>
          </div>
        </div>`;
      m.querySelector('.jl-stage').appendChild(end);
      end.querySelector('[data-again]').addEventListener('click', () => play(jlMakeQuestions(wordsFor(), settings.questions)));
      end.querySelector('[data-menu2]').addEventListener('click', setup);
    }

    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    function cleanup() {
      cancelAnimationFrame(raf);
      clearInterval(clock);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('resize', onResize);
    }
    if (stopGame) stopGame();
    stopGame = cleanup;
  }

  setup();
}
