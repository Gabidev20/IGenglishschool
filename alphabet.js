/* ==========================================================================
   IGenglishschool — The alphabet: hear and say the 26 letters
   Three modes, all spoken, nothing to read:
     🔤 Tap        the 26 letters; tapping one says its name ("bee", "aitch")
                   — and ▶ A–Z says them all in order, lighting each one
     👂 Find it    the voice says a letter, tap it among four
     🎤 Say it     a letter on screen: say it (microphone, or the grown-up
                   taps ✅); 🔊 lets the child hear it first
   Every letter is a recording (audios/alphabet/a.wav … z.wav, an American
   voice spelling the letter, silence trimmed): the browser's own voice read
   a lone "A" as the article "uh", sounded different on every device and
   often started late. The voice is only a fallback if a file can't play.
   ========================================================================== */

const AB_COLORS_LIST = ['#e5484d', '#f08a24', '#e0a800', '#3fae5a', '#3d7bd9', '#8e5fc2', '#f05d77', '#14a3a3'];

// [letter, what the voice reads, what the microphone may hear for it]
const AB_LETTERS = [
  ['A', 'ay', ['a', 'ay', 'eh', 'hey', 'hay']],
  ['B', 'bee', ['b', 'be', 'bee']],
  ['C', 'see', ['c', 'see', 'sea', 'si']],
  ['D', 'dee', ['d', 'dee', 'di']],
  ['E', 'E', ['e', 'ee', 'he']],
  ['F', 'F', ['f', 'eff', 'ef', 'if']],
  ['G', 'gee', ['g', 'gee', 'ji', 'jee']],
  ['H', 'aitch', ['h', 'aitch', 'age', 'each', 'eight']],
  ['I', 'eye', ['i', 'eye', 'aye', 'hi']],
  ['J', 'jay', ['j', 'jay', 'jei']],
  ['K', 'kay', ['k', 'kay', 'okay', 'ok', 'cay', 'kei']],
  ['L', 'L', ['l', 'el', 'ell', 'elle']],
  ['M', 'M', ['m', 'em', 'am']],
  ['N', 'N', ['n', 'en', 'and', 'in']],
  ['O', 'oh', ['o', 'oh', 'owe', 'ou']],
  ['P', 'pee', ['p', 'pee', 'pea', 'pi']],
  ['Q', 'queue', ['q', 'queue', 'cue', 'kiu', 'cute']],
  ['R', 'are', ['r', 'are', 'our', 'ar', 'or']],
  ['S', 'S', ['s', 'ess', 'es', 'yes', 'as']],
  ['T', 'tea', ['t', 'tea', 'tee', 'ti']],
  ['U', 'you', ['u', 'you', 'yu', 'yo']],
  ['V', 'vee', ['v', 'vee', 'we', 'vi']],
  ['W', 'double you', ['w', 'double you', 'double u', 'dabliu', 'double']],
  ['X', 'X', ['x', 'ex', 'eggs', 'axe', 'ax']],
  ['Y', 'why', ['y', 'why', 'wye', 'wai']],
  ['Z', 'zee', ['z', 'zee', 'zed']],
].map(([letter, say, heard], i) => ({ letter, say, heard, color: AB_COLORS_LIST[i % AB_COLORS_LIST.length] }));

function abSay(text, rate) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = rate || 0.75;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// The recordings, loaded once and reused, so a tap sounds at once.
const AB_AUDIO = {};
function abAudio(name) {
  if (!AB_AUDIO[name]) {
    const a = new Audio(`audios/alphabet/${name}.wav`);
    a.preload = 'auto';
    AB_AUDIO[name] = a;
  }
  return AB_AUDIO[name];
}
let abCurrent = null;
function abStopAudio() {
  if (abCurrent) { try { abCurrent.pause(); abCurrent.currentTime = 0; } catch (e) {} abCurrent = null; }
  if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
}
// Plays a recording; resolves when it has finished (or failed), so letters
// can follow each other at the right pace.
function abPlay(name, fallbackText) {
  abStopAudio();
  const a = abAudio(name);
  abCurrent = a;
  return new Promise(resolve => {
    let done = false;
    const end = () => { if (done) return; done = true; a.removeEventListener('ended', end); resolve(); };
    a.addEventListener('ended', end);
    setTimeout(end, 2500);                       // never wait forever
    try { a.currentTime = 0; } catch (e) {}
    const p = a.play();
    if (p && p.catch) p.catch(() => { abSay(fallbackText); setTimeout(end, 900); });
  });
}
const abLetter = l => abPlay(l.letter.toLowerCase(), l.say);

function abTile(l, attrs, cls) {
  return `<button class="ab-tile ${cls || ''}" style="--ab:${l.color}" ${attrs || ''} aria-label="${l.letter}">
    <b>${l.letter}</b><small>${l.letter.toLowerCase()}</small>
  </button>`;
}

function openAlphabetGame() {
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const byLetter = x => AB_LETTERS.find(l => l.letter === x);
  let mode = 'tap';
  let round = 0, stars = 0, target = null, choices = [], locked = false, playing = false;
  const ROUNDS = 8;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(() => { if (document.getElementById('abMount')) fn(); }, ms));
  const stopTimers = () => { timers.forEach(clearTimeout); timers.length = 0; playing = false; };

  openModal(`
    <div class="modal-content-pad cg ab">
      <h3 id="modalTitle" class="ab-title">🔤 ABC — The Alphabet</h3>
      <div class="cg-modes">
        <button class="cg-mode" data-mode="tap" aria-label="Tap and listen">🔤<span>👆</span></button>
        <button class="cg-mode" data-mode="find" aria-label="Find the letter">👂<span>🔤</span></button>
        <button class="cg-mode" data-mode="say" aria-label="Say the letter">🎤<span>🔤</span></button>
      </div>
      <div id="abMount"></div>
    </div>`, true);

  const mount = () => document.getElementById('abMount');
  const starsRow = () => `<div class="cg-stars">${Array.from({ length: ROUNDS }, (_, i) => `<i class="${i < stars ? 'on' : ''}">⭐</i>`).join('')}</div>`;

  function finish() {
    IGSound.win();
    if (typeof awardProgress === 'function') awardProgress(stars * 2, stars >= ROUNDS - 2 ? 1 : 0);
    mount().innerHTML = `
      <div class="rv-done">
        <span class="rv-done-emoji">🎉</span>
        ${starsRow()}
        <button class="cg-big" data-again aria-label="Play again">🔄</button>
      </div>`;
    abPlay('great-job', 'Great job!');
    mount().querySelector('[data-again]').addEventListener('click', () => start(mode));
  }

  // ---- 🔤 tap and listen -----------------------------------------------------
  function tapPaint() {
    mount().innerHTML = `
      <div class="ab-show" id="abShow"><span class="ab-hint">👆</span></div>
      <div class="ab-bar">
        <button class="game-btn secondary" data-az>▶ A – Z</button>
      </div>
      <div class="ab-grid">${AB_LETTERS.map(l => abTile(l, `data-letter="${l.letter}"`)).join('')}</div>`;
    const show = l => {
      const box = document.getElementById('abShow');
      if (box) box.innerHTML = `<span class="ab-big" style="--ab:${l.color}">${l.letter}<small>${l.letter.toLowerCase()}</small></span>`;
      mount().querySelectorAll('[data-letter]').forEach(b => b.classList.toggle('on', b.dataset.letter === l.letter));
    };
    const tap = l => { show(l); return abLetter(l); };
    mount().querySelectorAll('[data-letter]').forEach(b => b.addEventListener('click', () => {
      if (playing) stopTimers();
      tap(byLetter(b.dataset.letter));
    }));
    const az = mount().querySelector('[data-az]');
    az.addEventListener('click', () => {
      if (playing) { stopTimers(); az.textContent = '▶ A – Z'; return; }
      playing = true; az.textContent = '⏹ Stop';
      // Each letter waits for the one before it to finish, then a short pause.
      let i = 0;
      const next = () => {
        if (!playing || !document.getElementById('abMount')) return;
        if (i >= AB_LETTERS.length) { playing = false; az.textContent = '▶ A – Z'; return; }
        tap(AB_LETTERS[i++]).then(() => later(next, 450));
      };
      next();
    });
  }

  // ---- 👂 find it --------------------------------------------------------------
  function findRound() {
    if (round >= ROUNDS) { finish(); return; }
    locked = false;
    target = shuffle(AB_LETTERS.filter(l => !target || l.letter !== target.letter))[0];
    choices = shuffle([target, ...shuffle(AB_LETTERS.filter(l => l.letter !== target.letter)).slice(0, 3)]);
    mount().innerHTML = `
      ${starsRow()}
      <button class="cg-listen" data-hear aria-label="Listen again">🔊</button>
      <div class="cg-grid ab-choices">${choices.map((l, i) => abTile(l, `data-pick="${i}"`, 'ab-tile--big')).join('')}</div>`;
    const hear = () => abLetter(target);
    mount().querySelector('[data-hear]').addEventListener('click', hear);
    mount().querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
      if (locked) return;
      const l = choices[Number(b.dataset.pick)];
      if (l.letter === target.letter) {
        locked = true;
        stars++; round++;
        IGSound.pop();
        b.classList.add('popped');
        abLetter(target);
        later(findRound, 1300);
      } else {
        IGSound.wrong();
        b.classList.add('shake');
        setTimeout(() => b.classList.remove('shake'), 500);
        abLetter(l).then(() => later(hear, 400));
      }
    }));
    hear();
  }

  // ---- 🎤 say it -----------------------------------------------------------------
  function sayRound() {
    if (round >= ROUNDS) { finish(); return; }
    target = shuffle(AB_LETTERS.filter(l => !target || l.letter !== target.letter))[0];
    const canRec = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    mount().innerHTML = `
      ${starsRow()}
      <div class="ab-show"><span class="ab-big" style="--ab:${target.color}">${target.letter}<small>${target.letter.toLowerCase()}</small></span></div>
      <div class="cg-say-actions">
        <button class="cg-big cg-big--soft" data-hint aria-label="Hear the letter">🔊</button>
        ${canRec ? `<button class="cg-big" data-mic aria-label="Speak">🎤</button>` : ''}
        <button class="cg-big cg-big--ok" data-ok aria-label="I said it">✅</button>
      </div>
      <p class="cg-heard" id="abHeard"></p>`;
    let done = false;
    const good = () => {
      if (done) return;
      done = true;
      stars++; round++;
      IGSound.correct();
      abLetter(target);
      later(sayRound, 1400);
    };
    mount().querySelector('[data-hint]').addEventListener('click', () => abLetter(target));
    mount().querySelector('[data-ok]').addEventListener('click', good);
    const mic = mount().querySelector('[data-mic]');
    if (mic) mic.addEventListener('click', () => {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new Ctor();
      rec.lang = 'en-US'; rec.maxAlternatives = 5; rec.interimResults = false;
      mic.classList.add('is-recording');
      rec.onresult = e => {
        const heard = [...e.results[0]].map(r => r.transcript.toLowerCase().replace(/[.,!?]/g, '').trim());
        const ok = heard.some(h => target.heard.some(w => h === w || h.split(/\s+/).includes(w) || (w.includes(' ') && h.includes(w))));
        if (ok) { good(); return; }
        IGSound.wrong();
        const el = document.getElementById('abHeard');
        if (el) el.textContent = `🤔 "${heard[0] || '…'}"`;
        later(() => abLetter(target), 400);
      };
      rec.onend = () => mic.classList.remove('is-recording');
      rec.onerror = () => mic.classList.remove('is-recording');
      try { rec.start(); } catch (e) { /* busy */ }
    });
  }

  AB_LETTERS.forEach(l => abAudio(l.letter.toLowerCase()));
  abAudio('great-job');

  function start(m) {
    stopTimers();
    abStopAudio();
    mode = m; round = 0; stars = 0; target = null;
    document.querySelectorAll('.ab .cg-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    if (m === 'tap') tapPaint();
    else if (m === 'find') findRound();
    else sayRound();
  }

  document.querySelectorAll('.ab .cg-mode').forEach(b => b.addEventListener('click', () => start(b.dataset.mode)));
  start('tap');
}
