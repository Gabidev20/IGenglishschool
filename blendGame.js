/* ==========================================================================
   IGenglishschool — Blend it! (the blending game of IG Sound Steps)
   Children put together the sounds they know to BUILD and READ simple
   three-sound words: cat, hat, tap, pin, dog, sun, bug…
   Sound sets are cumulative, like the packs of the book:
     Set 1  s a t p i n      Set 2  + c k e h r      Set 3  + m d g o
     Set 4  + u l f b        Set 5  + j w v y        Set 6  + x z
   A word is offered in a set only if EVERY letter belongs to that set
   (decodable): blSelfCheck() proves it and runs when the page loads.
   Three modes, all spoken:
     🧩 Build it       a picture + 3 empty slots; tap or drag the letter tiles.
                       Each tile says its SOUND; when the word is complete the
                       tiles slide together and it is blended: "k… a… t… cat!"
     👀 Read it        a written word with a dot under each letter: tap the
                       letters to hear the sounds, press Blend, pick the picture
     🔁 Change a sound cat → hat: swap ONE tile to make the word of the picture
   The recordings are audios/sound-steps/game/s-<letter>.mp3 (one sound),
   w-<word>.mp3 (one word) — made by livros/_geradores/ss_game_audio.py from
   the two tables below, so the page and the recordings never disagree. If a
   clip cannot play, the browser's own voice (en-US) steps in.
   Every global here starts with bl / BL_ (all scripts share one scope).
   ========================================================================== */

const BL_STORE_KEY = 'blend_game';
const BL_ROUNDS = 8;
const BL_AUDIO_DIR = 'audios/sound-steps/game/';

// The sound sets of the book: the letters each one ADDS.
const BL_SETS = [
  { n: 1, add: 'satpin' },
  { n: 2, add: 'ckehr' },
  { n: 3, add: 'mdgo' },
  { n: 4, add: 'ulfb' },
  { n: 5, add: 'jwvy' },
  { n: 6, add: 'xz' },
];
const BL_VOWELS = 'aeiou';

// [sound, what the voice says] — the isolated sound, stretched the way the
// teacher models it. Read by ss_game_audio.py (keep one entry per line).
const BL_SOUNDS = [
  ['s', 'sss'], ['a', 'aaa'], ['t', 'tuh'], ['p', 'puh'], ['i', 'ih'], ['n', 'nnn'],
  ['c', 'kuh'], ['k', 'kuh'], ['e', 'eh'], ['h', 'hhh'], ['r', 'rrr'],
  ['m', 'mmm'], ['d', 'duh'], ['g', 'guh'], ['o', 'ah'],
  ['u', 'uh'], ['l', 'lll'], ['f', 'fff'], ['b', 'buh'],
  ['j', 'juh'], ['w', 'wuh'], ['v', 'vvv'], ['y', 'yuh'],
  ['x', 'ks'], ['z', 'zzz'], ['qu', 'kw'],
];

// [word, picture, set that first has all its letters] — picturable words only.
// Read by ss_game_audio.py (keep one entry per line).
const BL_WORDS = [
  ['pin', '📌', 1],
  ['pan', '🍳', 1],
  ['tap', '🚰', 1],
  ['tin', '🥫', 1],
  ['nap', '😴', 1],
  ['ant', '🐜', 1],
  ['cat', '🐱', 2],
  ['hat', '🎩', 2],
  ['cap', '🧢', 2],
  ['rat', '🐀', 2],
  ['hen', '🐔', 2],
  ['pen', '🖊️', 2],
  ['ten', '🔟', 2],
  ['pig', '🐷', 3],
  ['dog', '🐶', 3],
  ['map', '🗺️', 3],
  ['pot', '🍲', 3],
  ['gas', '⛽', 3],
  ['gem', '💎', 3],
  ['mad', '😠', 3],
  ['sad', '😢', 3],
  ['hot', '🥵', 3],
  ['sun', '☀️', 4],
  ['bus', '🚌', 4],
  ['bug', '🐛', 4],
  ['cup', '🥤', 4],
  ['mug', '☕', 4],
  ['hug', '🤗', 4],
  ['tub', '🛁', 4],
  ['bin', '🗑️', 4],
  ['bed', '🛏️', 4],
  ['bag', '👜', 4],
  ['leg', '🦵', 4],
  ['log', '🪵', 4],
  ['run', '🏃', 4],
  ['jet', '✈️', 5],
  ['web', '🕸️', 5],
  ['van', '🚐', 5],
  ['win', '🏆', 5],
  ['yum', '😋', 5],
  ['yes', '✅', 5],
  ['box', '📦', 6],
  ['fox', '🦊', 6],
  ['six', '6️⃣', 6],
  ['zip', '🤐', 6],
  ['zap', '⚡', 6],
  ['fix', '🔧', 6],
];

// Phrases that are not words of the list (read by ss_game_audio.py).
const BL_PHRASES = [
  ['great', 'Great blending!'],
];

const BL_WORD_LIST = BL_WORDS.map(([w, e, s]) => ({ w, e, set: s }));

// ---------------------------------------------------------------------------
// WORDS AND SETS
// ---------------------------------------------------------------------------
function blLetters(setN) {
  return BL_SETS.filter(s => s.n <= setN).map(s => s.add).join('');
}
function blSetOf(word) {
  let top = 0;
  for (const ch of word) {
    const s = BL_SETS.find(x => x.add.includes(ch));
    if (!s) return 99;
    top = Math.max(top, s.n);
  }
  return top;
}
function blWordsFor(setN) { return BL_WORD_LIST.filter(x => x.set <= setN); }
const blIsVowel = ch => BL_VOWELS.includes(ch);
const blShuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const blSoundText = ch => { const s = BL_SOUNDS.find(x => x[0] === ch); return s ? s[1] : ch; };

// A tiny proof that every word is decodable in the set it is filed under.
function blSelfCheck() {
  const problems = [];
  const seenWord = new Set(), seenEmoji = new Set();
  BL_WORD_LIST.forEach(x => {
    if (x.w.length !== 3) problems.push(`${x.w}: not 3 letters`);
    if (blSetOf(x.w) !== x.set) problems.push(`${x.w}: filed in set ${x.set}, its letters need set ${blSetOf(x.w)}`);
    if (seenWord.has(x.w)) problems.push(`${x.w}: twice`);
    if (seenEmoji.has(x.e)) problems.push(`${x.w}: picture ${x.e} used twice`);
    seenWord.add(x.w); seenEmoji.add(x.e);
    [...x.w].forEach(ch => { if (!BL_SOUNDS.some(s => s[0] === ch)) problems.push(`${x.w}: no sound for ${ch}`); });
  });
  BL_SETS.forEach(s => { if (blWordsFor(s.n).length < 6) problems.push(`set ${s.n}: fewer than 6 words`); });
  return problems;
}
(() => { const p = blSelfCheck(); if (p.length) console.warn('Blend it! word list problems:', p); })();

// n words for a game of the set: the new letters first (about 70 %), then
// the older ones; a short list is used again, never twice in a row.
function blPickWords(setN, count) {
  const pool = blWordsFor(setN);
  const fresh = blShuffle(pool.filter(x => x.set === setN));
  const old = blShuffle(pool.filter(x => x.set < setN));
  let out = fresh.slice(0, Math.ceil(count * 0.7));
  out = out.concat(old).slice(0, count);
  while (out.length < count) {
    const more = blShuffle(pool).filter(x => x.w !== (out[out.length - 1] || {}).w);
    out = out.concat(more).slice(0, count);
  }
  return blShuffle(out);
}

// Words that differ from `w` in exactly one place (the Change a sound mode).
function blNeighbors(w, setN) {
  return blWordsFor(setN).filter(x => x.w !== w && [...x.w].filter((c, i) => c !== w[i]).length === 1);
}
// A walk through the words: cat → hat → hot…, one changed sound per round.
// A word is not used twice until the walk has nothing new left; then it
// jumps to a fresh starting word.
function blChain(setN, count) {
  const starts = blWordsFor(setN).filter(x => blNeighbors(x.w, setN).length);
  const rounds = [], used = new Set();
  let cur = blShuffle(starts)[0];
  while (cur && rounds.length < count) {
    used.add(cur.w);
    let opts = blNeighbors(cur.w, setN).filter(x => !used.has(x.w));
    if (!opts.length) {
      const fresh = starts.filter(x => !used.has(x.w));
      if (fresh.length) { cur = blShuffle(fresh)[0]; used.add(cur.w); opts = blNeighbors(cur.w, setN).filter(x => !used.has(x.w)); }
      if (!opts.length) { used.clear(); used.add(cur.w); opts = blNeighbors(cur.w, setN); }
    }
    // prefer words that use the newest letters of the set
    const newest = opts.filter(x => x.set === setN);
    const next = blShuffle(newest.length && Math.random() < 0.6 ? newest : opts)[0];
    rounds.push({ from: cur, to: next, pos: [...cur.w].findIndex((c, i) => c !== next.w[i]) });
    cur = next;
  }
  return rounds;
}

// ---------------------------------------------------------------------------
// PROGRESS (stars per set, and the set played last)
// ---------------------------------------------------------------------------
function blLoadProgress() {
  const p = IGStore.getJSON(BL_STORE_KEY, null);
  return p && typeof p === 'object' ? { last: p.last || 1, stars: p.stars || {} } : { last: 1, stars: {} };
}
function blSaveProgress(p) { IGStore.setJSON(BL_STORE_KEY, p); }

// ---------------------------------------------------------------------------
// AUDIO — clips first, the browser's voice if a clip cannot play
// ---------------------------------------------------------------------------
const BL_CLIPS = {};
let blCurrentClip = null;
let blRun = 0;                         // bumps whenever a screen changes: old timers stop
const blAlive = () => Boolean(document.getElementById('blMount'));

function blClip(name) {
  if (!BL_CLIPS[name]) {
    const a = new Audio(`${BL_AUDIO_DIR}${name}.mp3`);
    a.preload = 'auto';
    BL_CLIPS[name] = a;
  }
  return BL_CLIPS[name];
}
function blStopAudio() {
  if (blCurrentClip) { try { blCurrentClip.pause(); blCurrentClip.currentTime = 0; } catch (e) {} blCurrentClip = null; }
  if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
}
function blSpeak(text, rate) {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) { setTimeout(resolve, 600); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = rate || 0.7;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
      setTimeout(resolve, 2500);
    } catch (e) { setTimeout(resolve, 600); }
  });
}
// Plays one clip; resolves when it ends (or fails), so sounds can follow
// each other at a calm pace.
function blPlay(name, fallbackText) {
  blStopAudio();
  const a = blClip(name);
  blCurrentClip = a;
  return new Promise(resolve => {
    let done = false;
    const end = () => { if (done) return; done = true; a.removeEventListener('ended', end); resolve(); };
    a.addEventListener('ended', end);
    a.addEventListener('error', () => { if (done) return; blSpeak(fallbackText).then(end); }, { once: true });
    setTimeout(end, 3500);             // never wait forever
    try { a.currentTime = 0; } catch (e) {}
    const p = a.play();
    if (p && p.catch) p.catch(() => { if (!done) blSpeak(fallbackText).then(end); });
  });
}
const blSaySound = ch => blPlay(`s-${ch}`, blSoundText(ch));
const blSayWord = w => blPlay(`w-${w}`, w);
const blWait = ms => new Promise(r => setTimeout(r, ms));

function blConfetti(el) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const colors = ['#f05d77', '#b8953a', '#a9b4a4', '#8e6d86', '#c9435c'];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 90;
    p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
    p.style.setProperty('--rot', `${Math.random() * 360}deg`);
    p.style.left = `${r.left + r.width / 2}px`;
    p.style.top = `${r.top + r.height / 2}px`;
    p.style.background = colors[i % colors.length];
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

// ---------------------------------------------------------------------------
// TILES — tap OR drag
// ---------------------------------------------------------------------------
const blTileHtml = (ch, extra) =>
  `<button type="button" class="bl-tile ${blIsVowel(ch) ? 'bl-v' : 'bl-c'} ${extra || ''}" data-ch="${ch}" aria-label="${ch}">${ch}</button>`;

// Makes a tray tile tappable and draggable. onTap(): tap (or keyboard);
// onDrop(slotIndex): dropped on a slot (-1 = anywhere else).
function blMakeDraggable(tile, onTap, onDrop) {
  let sx = 0, sy = 0, pid = null, moved = false, ghost = null;
  tile.addEventListener('pointerdown', e => {
    if (e.button > 0 || tile.classList.contains('used')) return;
    pid = e.pointerId; sx = e.clientX; sy = e.clientY; moved = false;
    try { tile.setPointerCapture(pid); } catch (err) {}
  });
  tile.addEventListener('pointermove', e => {
    if (pid !== e.pointerId) return;
    if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) {
      moved = true;
      ghost = tile.cloneNode(true);
      ghost.classList.add('bl-ghost');
      document.body.appendChild(ghost);
      tile.classList.add('dragging');
    }
    if (ghost) { ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; }
  });
  const end = (e, cancelled) => {
    if (pid !== e.pointerId) return;
    pid = null;
    if (ghost) {
      const under = document.elementFromPoint(e.clientX, e.clientY);
      ghost.remove(); ghost = null;
      tile.classList.remove('dragging');
      if (!cancelled) { const slot = under && under.closest ? under.closest('.bl-slot') : null; onDrop(slot ? Number(slot.dataset.slot) : -1); }
    } else if (!cancelled && !moved) onTap();
  };
  tile.addEventListener('pointerup', e => end(e, false));
  tile.addEventListener('pointercancel', e => end(e, true));
  tile.addEventListener('click', e => { if (e.detail === 0 && !tile.classList.contains('used')) onTap(); });   // keyboard
}

// ---------------------------------------------------------------------------
// THE GAME
// ---------------------------------------------------------------------------
function openBlendGame(opts) {
  const o = opts || {};
  const prog = blLoadProgress();
  let setN = Math.min(Math.max(Number(o.set) || prog.last || 1, 1), BL_SETS.length);
  let mode = null, round = 0, stars = 0, locked = false;
  let list = [], chain = [];
  let myRun = 0;
  const ok = () => myRun === blRun && blAlive();
  const newRun = () => { blRun++; myRun = blRun; blStopAudio(); };
  const mount = () => document.getElementById('blMount');
  const setLetters = n => (n > 1 ? '+ ' : '') + BL_SETS.find(x => x.n === n).add.split('').join(' ');

  openModal(`
    <div class="modal-content-pad bl">
      <h3 id="modalTitle" class="bl-title">🔤 Blend it!</h3>
      <div id="blMount"></div>
    </div>`, true);

  const starsRow = () => `<div class="cg-stars bl-stars">${Array.from({ length: BL_ROUNDS }, (_, i) => `<i class="${i < stars ? 'on' : ''}">⭐</i>`).join('')}</div>`;
  const bar = () => `
    <div class="bl-bar">
      <button type="button" class="bl-back" data-home aria-label="Back">⬅️</button>
      <span class="bl-pill">Set ${setN} <small>${setLetters(setN)}</small></span>
      ${starsRow()}
    </div>`;
  const pic = e => `<div class="bl-pic" id="blPic">${e}</div>`;
  const wireBack = () => { const b = mount().querySelector('[data-home]'); if (b) b.addEventListener('click', home); };
  const addStar = () => {
    stars++;
    const row = mount().querySelector('.bl-stars');
    if (row) row.querySelectorAll('i').forEach((el, i) => el.classList.toggle('on', i < stars));
  };

  // ---- start screen ---------------------------------------------------------
  function home() {
    newRun();
    mode = null;
    const p = blLoadProgress();
    mount().innerHTML = `
      <p class="bl-lead">Pick your sounds <small>Escolha os sons</small></p>
      <div class="bl-sets">
        ${BL_SETS.map(s => `
          <button type="button" class="bl-set ${s.n === setN ? 'on' : ''}" data-set="${s.n}" aria-label="Set ${s.n}">
            <b>Set ${s.n}</b><span>${setLetters(s.n)}</span>${p.stars[s.n] ? `<small>⭐ ${p.stars[s.n]}</small>` : ''}
          </button>`).join('')}
      </div>
      <div class="bl-modes">
        <button type="button" class="bl-mode" data-mode="build"><span>🧩</span><b>Build it</b><small>Montar a palavra</small></button>
        <button type="button" class="bl-mode" data-mode="read"><span>👀</span><b>Read it</b><small>Ler e juntar os sons</small></button>
        <button type="button" class="bl-mode" data-mode="change"><span>🔁</span><b>Change a sound</b><small>Trocar um som</small></button>
      </div>`;
    mount().querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => {
      setN = Number(b.dataset.set);
      mount().querySelectorAll('[data-set]').forEach(x => x.classList.toggle('on', x === b));
      blSaveProgress({ ...blLoadProgress(), last: setN });
      // The sounds of the set, one by one, so the child hears what is in it.
      const mine = BL_SETS.find(s => s.n === setN).add.split('');
      newRun(); const run = myRun;
      (async () => { for (const ch of mine.slice(0, 6)) { if (run !== blRun || !blAlive()) return; await blSaySound(ch); await blWait(150); } })();
    }));
    mount().querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => start(b.dataset.mode)));
  }

  function start(m) {
    newRun();
    mode = m; round = 0; stars = 0; locked = false;
    blSaveProgress({ ...blLoadProgress(), last: setN });
    if (m === 'change') {
      chain = blChain(setN, BL_ROUNDS);
      if (!chain.length) { home(); return; }
    } else list = blPickWords(setN, BL_ROUNDS);
    next();
  }
  function next() {
    if (!blAlive()) return;
    if (round >= BL_ROUNDS || (mode === 'change' && round >= chain.length)) { finish(); return; }
    if (mode === 'build') buildRound();
    else if (mode === 'read') readRound();
    else changeRound();
  }

  function finish() {
    newRun();
    IGSound.win();
    const p = blLoadProgress();
    p.last = setN; p.stars[setN] = (p.stars[setN] || 0) + stars;
    blSaveProgress(p);
    if (typeof awardProgress === 'function') awardProgress(stars * 2, stars >= BL_ROUNDS - 2 ? 1 : 0);
    mount().innerHTML = `
      <div class="rv-done">
        <span class="rv-done-emoji">🎉</span>
        <h4 class="rv-done-title">Great blending!</h4>
        ${starsRow()}
        <div class="bl-end">
          <button type="button" class="game-btn" data-again>🔄 Play again</button>
          <button type="button" class="game-btn secondary" data-other>🔤 Another set</button>
        </div>
      </div>`;
    blConfetti(mount().querySelector('.rv-done-emoji'));
    blPlay('p-great', 'Great blending!');
    mount().querySelector('[data-again]').addEventListener('click', () => start(mode));
    mount().querySelector('[data-other]').addEventListener('click', home);
  }

  // The letters of the tray: the ones the word needs + some from the set.
  const trayFor = (need, extra) => {
    const pool = blLetters(setN).split('').filter(c => !need.includes(c));
    return blShuffle(need.concat(blShuffle(pool).slice(0, extra)));
  };

  // Says the sounds one by one (each slot lights up), slides the tiles
  // together and says the whole word: "c… a… t… cat!"
  async function blendWord(word, slotsEl, run) {
    const alive = () => run === blRun && blAlive();
    const cells = [...slotsEl.querySelectorAll('.bl-slot, .bl-tile')];
    for (let i = 0; i < word.length; i++) {
      if (!alive()) return false;
      const c = cells[i];
      if (c) c.classList.add('say');
      await blSaySound(word[i]);
      if (c) c.classList.remove('say');
      await blWait(120);
    }
    if (!alive()) return false;
    slotsEl.classList.add('blend');
    await blWait(550);
    if (!alive()) return false;
    slotsEl.classList.add('said');
    await blSayWord(word);
    return alive();
  }

  const stopHint = () => mount().querySelectorAll('.hint').forEach(x => x.classList.remove('hint'));

  // ---- 🧩 build it -----------------------------------------------------------
  function buildRound() {
    newRun(); const run = myRun;
    const word = list[round];
    const w = word.w;
    const filled = [null, null, null];
    let misses = 0;
    locked = false;
    const tray = trayFor([...w], setN === 1 ? 2 : 3);
    mount().innerHTML = `
      ${bar()}
      ${pic(word.e)}
      <div class="bl-actions">
        <button type="button" class="bl-act" data-hear>🔊<span>Hear the word</span></button>
        <button type="button" class="bl-act" data-sounds>🔁<span>Sounds</span></button>
      </div>
      <div class="bl-slots" id="blSlots">${[0, 1, 2].map(i => `<button type="button" class="bl-slot" data-slot="${i}" aria-label="Slot ${i + 1}"></button>`).join('')}</div>
      <div class="bl-tray" id="blTray">${tray.map(ch => blTileHtml(ch)).join('')}</div>`;
    wireBack();
    const slotsEl = mount().querySelector('#blSlots');
    const slotEls = [...slotsEl.querySelectorAll('.bl-slot')];
    mount().querySelector('[data-hear]').addEventListener('click', () => { if (!locked) blSayWord(w); });
    mount().querySelector('[data-sounds]').addEventListener('click', async () => {
      if (locked) return;
      locked = true;
      for (let i = 0; i < 3; i++) {
        if (run !== blRun || !blAlive()) return;
        slotEls[i].classList.add('say'); await blSaySound(w[i]); slotEls[i].classList.remove('say'); await blWait(200);
      }
      if (run === blRun) locked = false;
    });
    slotEls.forEach((s, i) => s.addEventListener('click', () => { if (filled[i]) blSaySound(filled[i]); }));

    const nextEmpty = () => filled.findIndex(x => !x);
    const wrong = tile => {
      misses++;
      tile.classList.remove('shake'); void tile.offsetWidth; tile.classList.add('shake');
      setTimeout(() => tile.classList.remove('shake'), 500);
      if (misses >= 2) {
        stopHint();
        const want = w[nextEmpty()];
        const t = [...mount().querySelectorAll('.bl-tray .bl-tile')].find(x => x.dataset.ch === want && !x.classList.contains('used'));
        if (t) t.classList.add('hint');
        const s = slotEls[nextEmpty()]; if (s) s.classList.add('hint');
      }
    };
    const place = (tile, slotIdx) => {
      if (locked || run !== blRun) return;
      const idx = slotIdx >= 0 ? slotIdx : nextEmpty();
      if (idx < 0) return;
      const ch = tile.dataset.ch;
      if (filled[idx] || ch !== w[idx]) { wrong(tile); return; }
      filled[idx] = ch; misses = 0; stopHint();
      tile.classList.add('used');
      const slot = slotEls[idx];
      slot.innerHTML = ch;
      slot.classList.add('on', blIsVowel(ch) ? 'bl-v' : 'bl-c', 'glow');
      blSaySound(ch);
      if (filled.every(Boolean)) complete();
    };
    async function complete() {
      locked = true;
      await blWait(500);
      slotEls.forEach(s => s.classList.remove('glow'));
      const done = await blendWord(w, slotsEl, run);
      if (!done) return;
      IGSound.correct();
      blConfetti(mount().querySelector('#blPic'));
      addStar(); round++;
      await blWait(1100);
      if (ok() && run === blRun) next();
    }
    mount().querySelectorAll('.bl-tray .bl-tile').forEach(t => blMakeDraggable(t,
      () => place(t, -1),
      idx => { if (idx >= 0) place(t, idx); }));
    // The picture is named once, so the child knows what to build.
    blWait(350).then(() => { if (run === blRun && blAlive()) blSayWord(w); });
  }

  // ---- 👀 read it ---------------------------------------------------------------
  function readRound() {
    newRun(); const run = myRun;
    const word = list[round];
    const w = word.w;
    const lit = [false, false, false];
    let blended = false, misses = 0;
    locked = false;
    // two other pictures; never one that sounds like a trick (same first letter is fine, same picture is not)
    const others = blShuffle(blWordsFor(setN).filter(x => x.w !== w && x.e !== word.e)).slice(0, 2);
    const choices = blShuffle([word, ...others]);
    mount().innerHTML = `
      ${bar()}
      <p class="bl-prompt">Tap each letter 👆</p>
      <div class="bl-slots bl-readrow" id="blSlots">
        ${[...w].map((ch, i) => `<div class="bl-col">${blTileHtml(ch, 'bl-read').replace('<button', `<button data-i="${i}"`)}<i class="bl-dot" data-dot="${i}"></i></div>`).join('')}
      </div>
      <div class="bl-go-wrap"><button type="button" class="bl-go" data-go disabled><span>▶</span> Blend!</button></div>
      <div class="bl-choices" id="blChoices" hidden>
        ${choices.map((c, i) => `<button type="button" class="bl-choice" data-pick="${i}" aria-label="picture ${i + 1}">${c.e}</button>`).join('')}
      </div>`;
    wireBack();
    const slotsEl = mount().querySelector('#blSlots');
    const go = mount().querySelector('[data-go]');
    mount().querySelectorAll('.bl-read').forEach(t => t.addEventListener('click', () => {
      if (blended) return;
      const i = Number(t.dataset.i);
      blSaySound(w[i]);
      t.classList.add('glow'); setTimeout(() => t.classList.remove('glow'), 600);
      lit[i] = true;
      mount().querySelector(`[data-dot="${i}"]`).classList.add('on');
      if (lit.every(Boolean)) { go.disabled = false; go.classList.add('ready'); }
    }));
    go.addEventListener('click', async () => {
      if (blended || go.disabled) return;
      blended = true; go.disabled = true; go.classList.remove('ready');
      newRun(); const r = myRun;
      slotsEl.classList.add('blend');
      await blWait(600);
      if (r !== blRun || !blAlive()) return;
      slotsEl.classList.add('said');
      await blSayWord(w);
      if (r !== blRun || !blAlive()) return;
      mount().querySelector('.bl-prompt').textContent = 'Which picture? 🖼️';
      mount().querySelector('.bl-go-wrap').hidden = true;
      const box = mount().querySelector('#blChoices');
      box.hidden = false;
      box.classList.add('in');
    });
    mount().querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', async () => {
      if (locked || !blended) return;
      const c = choices[Number(b.dataset.pick)];
      if (c.w === w) {
        locked = true;
        b.classList.add('right');
        IGSound.correct();
        blConfetti(b);
        addStar(); round++;
        const r = myRun;
        await blSayWord(w);
        await blWait(500);
        if (r === blRun && blAlive()) next();
      } else {
        misses++;
        b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        setTimeout(() => b.classList.remove('shake'), 500);
        if (misses >= 2) {
          const right = mount().querySelector(`[data-pick="${choices.findIndex(x => x.w === w)}"]`);
          if (right) right.classList.add('hint');
        }
      }
    }));
  }

  // ---- 🔁 change a sound ---------------------------------------------------------------
  function changeRound() {
    newRun(); const run = myRun;
    const r = chain[round];
    const w = r.to.w;
    let misses = 0;
    locked = false;
    const tray = blShuffle([w[r.pos], r.from.w[r.pos], ...blShuffle(blLetters(setN).split('').filter(c => c !== w[r.pos] && c !== r.from.w[r.pos])).slice(0, 2)]);
    mount().innerHTML = `
      ${bar()}
      <div class="bl-change">
        <div class="bl-was">
          <div class="bl-pic bl-pic--small">${r.from.e}</div>
          <div class="bl-slots bl-readrow bl-was-row">${[...r.from.w].map(ch => blTileHtml(ch, 'bl-static')).join('')}</div>
        </div>
        <div class="bl-arrow">➜</div>
        <div class="bl-now">
          ${pic(r.to.e)}
          <div class="bl-slots" id="blSlots">
            ${[...w].map((ch, i) => i === r.pos
              ? `<button type="button" class="bl-slot" data-slot="${i}" aria-label="Change this sound">?</button>`
              : blTileHtml(ch, 'bl-static')).join('')}
          </div>
        </div>
      </div>
      <div class="bl-actions"><button type="button" class="bl-act" data-hear>🔊<span>Hear the word</span></button></div>
      <div class="bl-tray" id="blTray">${tray.map(ch => blTileHtml(ch)).join('')}</div>`;
    wireBack();
    const slotsEl = mount().querySelector('#blSlots');
    const slot = slotsEl.querySelector('.bl-slot');
    mount().querySelector('[data-hear]').addEventListener('click', () => { if (!locked) blSayWord(w); });
    mount().querySelectorAll('.bl-static').forEach(t => t.addEventListener('click', () => { if (!locked) blSaySound(t.dataset.ch); }));
    const place = (tile, idx) => {
      if (locked || run !== blRun) return;
      if (idx >= 0 && idx !== r.pos) { tile.classList.remove('shake'); void tile.offsetWidth; tile.classList.add('shake'); setTimeout(() => tile.classList.remove('shake'), 500); return; }
      const ch = tile.dataset.ch;
      if (ch !== w[r.pos]) {
        misses++;
        tile.classList.remove('shake'); void tile.offsetWidth; tile.classList.add('shake');
        setTimeout(() => tile.classList.remove('shake'), 500);
        if (misses >= 2) {
          stopHint();
          const t = [...mount().querySelectorAll('.bl-tray .bl-tile')].find(x => x.dataset.ch === w[r.pos]);
          if (t) t.classList.add('hint');
          slot.classList.add('hint');
        }
        return;
      }
      locked = true; stopHint();
      tile.classList.add('used');
      slot.outerHTML = blTileHtml(ch, 'bl-static glow');
      blSaySound(ch);
      (async () => {
        await blWait(500);
        const fresh = [...mount().querySelector('#blSlots').querySelectorAll('.bl-tile')];
        fresh.forEach(t => t.classList.remove('glow'));
        const done = await blendWord(w, mount().querySelector('#blSlots'), run);
        if (!done) return;
        IGSound.correct();
        blConfetti(mount().querySelector('.bl-now .bl-pic'));
        addStar(); round++;
        await blWait(1100);
        if (ok() && run === blRun) next();
      })();
    };
    mount().querySelectorAll('.bl-tray .bl-tile').forEach(t => blMakeDraggable(t,
      () => place(t, -1),
      idx => { if (idx >= 0) place(t, idx); }));
    // "cat … hat": hear the word we start from and the one we want.
    (async () => {
      await blWait(350);
      if (run !== blRun || !blAlive()) return;
      await blSayWord(r.from.w);
      await blWait(250);
      if (run !== blRun || !blAlive()) return;
      await blSayWord(w);
    })();
  }

  home();
}
