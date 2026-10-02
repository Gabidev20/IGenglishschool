/* ==========================================================================
   IGenglishschool — Colors, for children who can't read yet
   No words to read anywhere: every choice is a picture and every prompt
   is spoken. Three modes —
     👂 Find it   the voice says "Red! Find red!", tap the red balloon
     🎤 Say it    a red balloon and an apple: say "red!" (microphone, or the
                 grown-up taps ✅)
     🧠 Memory    pairs of balloons; turning one over says its colour
   Mistakes go to "My mistakes" (mistakes.js) like every other game.
   ========================================================================== */

const CG_COLORS = [
  { en: 'red', pt: 'vermelho', hex: '#e5484d', thing: '🍎', emoji: '🔴' },
  { en: 'blue', pt: 'azul', hex: '#3d7bd9', thing: '🐳', emoji: '🔵' },
  { en: 'yellow', pt: 'amarelo', hex: '#f2bd2c', thing: '🍌', emoji: '🟡' },
  { en: 'green', pt: 'verde', hex: '#3fae5a', thing: '🐸', emoji: '🟢' },
  { en: 'orange', pt: 'laranja', hex: '#f08a24', thing: '🍊', emoji: '🟠' },
  { en: 'purple', pt: 'roxo', hex: '#8e5fc2', thing: '🍇', emoji: '🟣' },
  { en: 'pink', pt: 'rosa', hex: '#f27aa5', thing: '🐷', emoji: '🩷' },
  { en: 'brown', pt: 'marrom', hex: '#8b5e3c', thing: '🐻', emoji: '🟤' },
  { en: 'black', pt: 'preto', hex: '#2f2c33', thing: '🐈‍⬛', emoji: '⚫' },
  { en: 'white', pt: 'branco', hex: '#f7f5f0', thing: '☁️', emoji: '⚪' },
];

function cgBalloon(c, cls) {
  const dark = typeof hsShade === 'function' ? hsShade(c.hex, -0.25) : c.hex;
  return `<svg class="${cls || ''}" viewBox="0 0 100 130" aria-hidden="true">
    <path d="M50,96 Q46,112 52,128" fill="none" stroke="#9aa0ad" stroke-width="2"/>
    <ellipse cx="50" cy="50" rx="38" ry="45" fill="${c.hex}" stroke="${c.en === 'white' ? '#c9ccd2' : dark}" stroke-width="3"/>
    <path d="M44,93 L56,93 L50,101Z" fill="${dark}"/>
    <ellipse cx="36" cy="32" rx="9" ry="14" fill="#fff" opacity=".35" transform="rotate(-20 36 32)"/>
  </svg>`;
}

function cgSay(text) {
  if (!('speechSynthesis' in window)) return;
  try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; window.speechSynthesis.speak(u); } catch (e) {}
}

function openColorsGame() {
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const colors = CG_COLORS.slice(0, 8);
  let mode = 'find';
  let round = 0, stars = 0, target = null, choices = [], locked = false;
  const ROUNDS = 8;
  let mem = null;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(() => { if (document.getElementById('cgMount')) fn(); }, ms));
  const asWord = c => ({ en: c.en, pt: c.pt, emoji: c.emoji });

  openModal(`
    <div class="modal-content-pad cg">
      <div class="cg-modes">
        <button class="cg-mode" data-mode="find" aria-label="Find the color">👂<span>🎈</span></button>
        <button class="cg-mode" data-mode="say" aria-label="Say the color">🎤<span>🎈</span></button>
        <button class="cg-mode" data-mode="memory" aria-label="Memory">🧠<span>🎈🎈</span></button>
      </div>
      <div id="cgMount"></div>
    </div>`, true);

  const mount = () => document.getElementById('cgMount');

  function stars8() { return `<div class="cg-stars">${Array.from({ length: ROUNDS }, (_, i) => `<i class="${i < stars ? 'on' : ''}">⭐</i>`).join('')}</div>`; }

  function finish() {
    IGSound.win();
    if (typeof awardProgress === 'function') awardProgress(stars * 2, stars >= ROUNDS - 2 ? 1 : 0);
    mount().innerHTML = `
      <div class="rv-done">
        <span class="rv-done-emoji">🎉</span>
        ${stars8()}
        <button class="cg-big" data-again aria-label="Play again">🔄</button>
      </div>`;
    cgSay('Great job!');
    mount().querySelector('[data-again]').addEventListener('click', () => start(mode));
  }

  // ---- 👂 find it ----------------------------------------------------------
  function findRound() {
    if (round >= ROUNDS) { finish(); return; }
    locked = false;
    target = shuffle(colors.filter(c => !target || c.en !== target.en))[0];
    choices = shuffle([target, ...shuffle(colors.filter(c => c.en !== target.en)).slice(0, 3)]);
    mount().innerHTML = `
      ${stars8()}
      <button class="cg-listen" data-hear aria-label="Listen again">🔊</button>
      <div class="cg-grid">
        ${choices.map((c, i) => `<button class="cg-choice" data-pick="${i}" aria-label="balloon">${cgBalloon(c, 'cg-balloon')}</button>`).join('')}
      </div>`;
    const hear = () => cgSay(`${target.en}! Find ${target.en}!`);
    mount().querySelector('[data-hear]').addEventListener('click', hear);
    mount().querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
      if (locked) return;
      const c = choices[Number(b.dataset.pick)];
      if (c.en === target.en) {
        locked = true;
        stars++; round++;
        igMiss(asWord(target), true, 'Colors');
        IGSound.pop();
        b.classList.add('popped');
        cgSay(`Yes! ${target.en}!`);
        later(findRound, 1300);
      } else {
        IGSound.wrong();
        igMiss(asWord(target), false, 'Colors');
        b.classList.add('shake');
        setTimeout(() => b.classList.remove('shake'), 500);
        cgSay(`That's ${c.en}. Find ${target.en}!`);
      }
    }));
    hear();
  }

  // ---- 🎤 say it ------------------------------------------------------------
  function sayRound() {
    if (round >= ROUNDS) { finish(); return; }
    target = shuffle(colors.filter(c => !target || c.en !== target.en))[0];
    const canRec = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    mount().innerHTML = `
      ${stars8()}
      <div class="cg-say">
        ${cgBalloon(target, 'cg-balloon cg-balloon--big')}
        <span class="cg-thing">${target.thing}</span>
      </div>
      <div class="cg-say-actions">
        <button class="cg-big cg-big--soft" data-hint aria-label="Hear the answer">🔊</button>
        ${canRec ? `<button class="cg-big" data-mic aria-label="Speak">🎤</button>` : ''}
        <button class="cg-big cg-big--ok" data-ok aria-label="I said it">✅</button>
      </div>
      <p class="cg-heard" id="cgHeard"></p>`;
    const good = () => {
      stars++; round++;
      igMiss(asWord(target), true, 'Colors');
      IGSound.correct();
      cgSay(`Yes! ${target.en}!`);
      later(sayRound, 1400);
    };
    mount().querySelector('[data-hint]').addEventListener('click', () => cgSay(target.en));
    mount().querySelector('[data-ok]').addEventListener('click', good);
    const mic = mount().querySelector('[data-mic]');
    if (mic) mic.addEventListener('click', () => {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new Ctor();
      rec.lang = 'en-US'; rec.maxAlternatives = 5; rec.interimResults = false;
      mic.classList.add('is-recording');
      rec.onresult = e => {
        const heard = [...e.results[0]].map(r => r.transcript.toLowerCase());
        if (heard.some(h => h.includes(target.en))) { good(); return; }
        IGSound.wrong();
        igMiss(asWord(target), false, 'Colors');
        const el = document.getElementById('cgHeard');
        if (el) el.textContent = `🤔 "${heard[0] || '…'}"`;
        cgSay(`Try again! ${target.en}!`);
      };
      rec.onend = () => mic.classList.remove('is-recording');
      rec.onerror = () => mic.classList.remove('is-recording');
      try { rec.start(); } catch (e) { /* busy */ }
    });
    cgSay('What color is it?');
  }

  // ---- 🧠 memory -------------------------------------------------------------
  function memoryStart() {
    const picked = shuffle(colors).slice(0, 4);
    mem = { cards: shuffle([...picked, ...picked].map((c, i) => ({ c, i }))), open: [], done: new Set(), busy: false };
    memoryPaint();
    cgSay('Find the pairs!');
  }
  function memoryPaint() {
    mount().innerHTML = `
      <div class="cg-mem">
        ${mem.cards.map((x, i) => {
          const up = mem.open.includes(i) || mem.done.has(i);
          return `<button class="cg-card${up ? ' up' : ''}${mem.done.has(i) ? ' done' : ''}" data-card="${i}" aria-label="card">
            ${up ? cgBalloon(x.c, 'cg-balloon') : '<span class="cg-back">❓</span>'}
          </button>`;
        }).join('')}
      </div>`;
    mount().querySelectorAll('[data-card]').forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.card);
      if (mem.busy || mem.open.includes(i) || mem.done.has(i)) return;
      mem.open.push(i);
      IGSound.flip();
      cgSay(mem.cards[i].c.en);
      memoryPaint();
      if (mem.open.length < 2) return;
      const [a, c] = mem.open;
      mem.busy = true;
      later(() => {
        if (mem.cards[a].c.en === mem.cards[c].c.en) {
          mem.done.add(a); mem.done.add(c);
          IGSound.match();
        } else {
          IGSound.wrong();
        }
        mem.open = []; mem.busy = false;
        if (mem.done.size === mem.cards.length) { stars = ROUNDS; finish(); return; }
        memoryPaint();
      }, 900);
    }));
  }

  function start(m) {
    mode = m;
    round = 0; stars = 0; target = null;
    timers.forEach(clearTimeout);
    document.querySelectorAll('.cg-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    if (m === 'find') findRound();
    else if (m === 'say') sayRound();
    else memoryStart();
  }

  document.querySelectorAll('.cg-mode').forEach(b => b.addEventListener('click', () => { IGSound.click(); start(b.dataset.mode); }));
  start('find');
}
