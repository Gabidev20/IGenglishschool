/* ==========================================================================
   IGenglishschool — The alphabet: hear and say the 26 letters
   Three modes, all spoken, nothing to read:
     🔤 Tap        the 26 letters; tapping one says its name ("bee", "aitch")
                   — and ▶ A–Z says them all in order, lighting each one
     👂 Find it    the voice says a letter, tap it among four
     🎤 Say it     a letter on screen: say it (microphone, or the grown-up
                   taps ✅); 🔊 lets the child hear it first
   Every letter is a recording (alphabet/a.wav … z.wav, an American
   voice spelling the letter, silence trimmed): the browser's own voice read
   a lone "A" as the article "uh", sounded different on every device and
   often started late. The voice is only a fallback if a file can't play.
   ========================================================================== */

const AB_COLORS_LIST = ['#e5484d', '#f08a24', '#e0a800', '#3fae5a', '#3d7bd9', '#8e5fc2', '#f05d77', '#14a3a3'];

// [letter, what the voice reads, what the microphone may write for it —
// speech engines spell a lone letter many ways, and accents add more]
const AB_LETTERS = [
  ['A', 'ay', ['a', 'ay', 'eh', 'hey', 'hay', 'ey', 'ei', 'yay', 'eight', '8', 'ah']],
  ['B', 'bee', ['b', 'be', 'bee', 'bea', 'bi', 'bey', 'bae']],
  ['C', 'see', ['c', 'see', 'sea', 'si', 'cee', 'she', 'seat']],
  ['D', 'dee', ['d', 'dee', 'de', 'di', 'the', 'dean']],
  ['E', 'E', ['e', 'ee', 'he', 'ii', 'yi', 'eat']],
  ['F', 'F', ['f', 'eff', 'ef', 'if', 'half']],
  ['G', 'gee', ['g', 'gee', 'ji', 'jee', 'gi', 'jean']],
  ['H', 'aitch', ['h', 'aitch', 'age', 'each', 'itch', 'hatch', 'edge', 'eich']],
  ['I', 'eye', ['i', 'eye', 'aye', 'hi', 'ai', 'high']],
  ['J', 'jay', ['j', 'jay', 'jei', 'jade', 'gay']],
  ['K', 'kay', ['k', 'kay', 'okay', 'ok', 'cay', 'kei', 'kate', 'cake']],
  ['L', 'L', ['l', 'el', 'ell', 'elle', 'al', 'hell']],
  ['M', 'M', ['m', 'em', 'am', 'um', 'him']],
  ['N', 'N', ['n', 'en', 'and', 'in', 'an', 'end']],
  ['O', 'oh', ['o', 'oh', 'owe', 'ou', 'ow']],
  ['P', 'pee', ['p', 'pee', 'pea', 'pi', 'pe']],
  ['Q', 'queue', ['q', 'queue', 'cue', 'kiu', 'cute', 'que', 'kew', 'cu', 'kyu']],
  ['R', 'are', ['r', 'are', 'our', 'ar', 'or', 'hour']],
  ['S', 'S', ['s', 'ess', 'es', 'yes', 'as', 'is']],
  ['T', 'tea', ['t', 'tea', 'tee', 'ti']],
  ['U', 'you', ['u', 'you', 'yu', 'yo', 'ew', 'yoo']],
  ['V', 'vee', ['v', 'vee', 'we', 'vi']],
  ['W', 'double you', ['w', 'double you', 'double u', 'dabliu', 'double', 'dublin']],
  ['X', 'X', ['x', 'ex', 'eggs', 'axe', 'ax', 'ecks']],
  ['Y', 'why', ['y', 'why', 'wye', 'wai']],
  ['Z', 'zee', ['z', 'zee', 'zed', 'zi']],
].map(([letter, say, heard], i) => ({ letter, say, heard, color: AB_COLORS_LIST[i % AB_COLORS_LIST.length] }));

// Is this transcript the letter? "B", "bee.", "the letter b", "uh… be" all
// count; another letter's name does not.
function abHeardIs(l, transcript) {
  let t = String(transcript || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/^(the letter|letter|it's|its|it is|is it|this is)\s+/, '').trim();
  if (!t) return false;
  const tokens = t.split(' ');
  const compact = t.replace(/ /g, '');
  return l.heard.some(w => (w.includes(' ') ? t.includes(w) || compact === w.replace(/ /g, '') : tokens.includes(w)))
    || compact === l.letter.toLowerCase();
}

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
    const a = new Audio(`alphabet/${name}.wav`);
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
  let round = 0, stars = 0, target = null, choices = [], locked = false, playing = false, autoMic = false;
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
    stopListening();
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
  // Speech engines are poor at a lone letter: they write "bee", "be", "B.",
  // "the letter b"… and a child's accent adds more. So the microphone keeps
  // listening for up to 8 seconds, checks every guess WHILE the child is
  // speaking (interim results, 10 alternatives each) and accepts the first
  // one that is the letter. The 🔊 and ✅ buttons stop it first: the
  // letter's own recording must never be heard by the microphone.
  let listening = null;            // the running listening session, if any
  function stopListening() { if (listening) { listening.stop(); listening = null; } }

  function sayRound() {
    stopListening();
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
      <p class="cg-heard" id="abHeard">${canRec ? 'Toque no 🎤 e diga a letra' : ''}</p>`;
    let done = false;
    const status = t => { const el = document.getElementById('abHeard'); if (el) el.innerHTML = t; };
    const good = () => {
      if (done) return;
      done = true;
      stopListening();
      stars++; round++;
      IGSound.correct();
      status('⭐ Yes!');
      // The letter, then the next one — and the microphone opens by itself
      // (the permission was already given), so the child just keeps going.
      abLetter(target).then(() => later(sayRound, 500));
    };
    mount().querySelector('[data-hint]').addEventListener('click', () => { stopListening(); paintMic(false); abLetter(target); });
    mount().querySelector('[data-ok]').addEventListener('click', good);
    const mic = mount().querySelector('[data-mic]');
    const paintMic = on => { if (mic) mic.classList.toggle('is-recording', on); };

    function listen() {
      if (done || !mic || !mic.isConnected) return;
      stopListening();
      abStopAudio();
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const deadline = Date.now() + 8000;
      let rec = null, stopped = false, best = '';
      const session = {
        stop() { stopped = true; paintMic(false); try { rec && rec.abort(); } catch (e) {} },
      };
      listening = session;
      paintMic(true);
      status('🎤 Listening… <b>say the letter!</b>');
      const startOne = () => {
        if (stopped || done || !mic.isConnected) { paintMic(false); return; }   // closed or next round
        rec = new Ctor();
        rec.lang = 'en-US'; rec.maxAlternatives = 10; rec.interimResults = true; rec.continuous = false;
        rec.onresult = e => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const alts = [...e.results[i]].map(r => r.transcript);
            if (alts[0] && alts[0].trim()) best = alts[0].trim();
            if (alts.some(t => abHeardIs(target, t))) { good(); return; }
          }
        };
        rec.onerror = ev => {
          if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
            stopped = true; paintMic(false);
            status('⚠️ O microfone está bloqueado. Libere o microfone no navegador ou use o ✅.');
          }
        };
        // A pause ends one listening; within the 8 seconds, listen again.
        rec.onend = () => {
          if (stopped || done) return;
          if (Date.now() < deadline) { try { startOne(); } catch (e) { later(startOne, 200); } return; }
          paintMic(false); listening = null;
          if (best) { IGSound.wrong(); status(`🤔 Ouvi “${igEscapeHtml(best)}”. Ouça 🔊 e tente de novo!`); }
          else status('🙉 Não ouvi nada. Toque no 🎤 e fale um pouco mais alto.');
        };
        try { rec.start(); } catch (e) { later(startOne, 250); }
      };
      startOne();
    }
    if (mic) mic.addEventListener('click', () => { autoMic = true; listen(); });
    if (mic && autoMic) later(listen, 400);
  }

  AB_LETTERS.forEach(l => abAudio(l.letter.toLowerCase()));
  abAudio('great-job');

  function start(m) {
    stopTimers();
    abStopAudio();
    stopListening();
    mode = m; round = 0; stars = 0; target = null;
    document.querySelectorAll('.ab .cg-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    if (m === 'tap') tapPaint();
    else if (m === 'find') findRound();
    else sayRound();
  }

  document.querySelectorAll('.ab .cg-mode').forEach(b => b.addEventListener('click', () => start(b.dataset.mode)));
  start('tap');
}
