/* ==========================================================================
   IGenglishschool — 🎤 Say it! (speaking practice with pictures)
   --------------------------------------------------------------------------
   A picture appears; the child says the word; the microphone checks it.

   sayListen() is the shared listener (the ABC game uses the same idea):
   speech engines are unsure with one word, a child's accent adds more, so
   it listens for up to 8 seconds, checks every guess WHILE the child is
   speaking (interim results, 10 alternatives each) and accepts the first
   one close enough — same word, singular/plural, a number written as
   digits, or one letter off in a longer word. Used here and in the Body
   Parts game ("🎤 Say it").
   ========================================================================== */

const SAY_NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
// What engines often write instead of the word.
const SAY_SOUNDS_LIKE = {
  two: ['to', 'too', '2'], four: ['for', '4'], eight: ['ate', '8'], one: ['won', '1'], blue: ['blew'], pear: ['pair', 'pare'],
  red: ['read'], knees: ['knee'], eyes: ['i', 'eye'], ears: ['ear'], hair: ['hare'], tea: ['t'], sea: ['see', 'c'],
  sun: ['son'], night: ['knight'], right: ['write'], bee: ['be', 'b'], flower: ['flour'],
};

const sayNorm = t => String(t || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/^(the|a|an|it's|its|it is|this is|is|my)\s+/, '');
function sayDistance(a, b) {          // Levenshtein, small words only
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[m][n];
}
// Is what the engine heard the target word (or phrase)?
function sayMatches(target, heard) {
  const want = sayNorm(target), got = sayNorm(heard);
  if (!want || !got) return false;
  if (got === want || (` ${got} `).includes(` ${want} `)) return true;
  const forms = new Set([want, want + 's', want + 'es', want.replace(/(es|s)$/, ''), want.replace(/y$/, 'ies'), want.replace(/ies$/, 'y')]);
  (SAY_SOUNDS_LIKE[want] || []).forEach(x => forms.add(x));
  const n = SAY_NUMBERS.indexOf(want); if (n >= 0) forms.add(String(n));
  if (/^\d+$/.test(want) && SAY_NUMBERS[Number(want)]) forms.add(SAY_NUMBERS[Number(want)]);
  const tokens = got.split(' ');
  // single words: any token; phrases: any run of the same number of words
  const size = want.split(' ').length;
  for (let i = 0; i + size <= tokens.length; i++) {
    const piece = tokens.slice(i, i + size).join(' ');
    if (forms.has(piece)) return true;
    const tol = want.length >= 8 ? 2 : want.length >= 4 ? 1 : 0;
    if (tol && Math.abs(piece.length - want.length) <= tol && sayDistance(piece, want) <= tol) return true;
  }
  // Split or joined differently: "straw very", "paintbrush".
  const gc = got.replace(/ /g, ''), wc = want.replace(/ /g, '');
  if (wc.length >= 4 && (gc.includes(wc) || [...forms].some(f => f.length >= 4 && gc.includes(f.replace(/ /g, ''))))) return true;
  const tolC = wc.length >= 8 ? 2 : wc.length >= 4 ? 1 : 0;
  return Boolean(tolC) && Math.abs(gc.length - wc.length) <= tolC && sayDistance(gc, wc) <= tolC;
}

// Listen until the word is said (or 8 seconds). Returns { stop }.
// opts: { target, onOk, onListen(on), onFail(bestHeard|''), onBlocked }
function sayListen(opts) {
  const o = opts || {};
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) { if (o.onBlocked) o.onBlocked('unsupported'); return { stop() {} }; }
  const deadline = Date.now() + (o.seconds || 8) * 1000;
  let rec = null, stopped = false, best = '';
  const end = () => { if (o.onListen) o.onListen(false); };
  const startOne = () => {
    if (stopped) return;
    rec = new Ctor();
    rec.lang = 'en-US'; rec.maxAlternatives = 10; rec.interimResults = true; rec.continuous = false;
    rec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alts = [...e.results[i]].map(r => r.transcript);
        if (alts[0] && alts[0].trim()) best = alts[0].trim();
        if (alts.some(t => sayMatches(o.target, t))) { stopped = true; try { rec.abort(); } catch (x) {} end(); if (o.onOk) o.onOk(); return; }
      }
    };
    rec.onerror = ev => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') { stopped = true; end(); if (o.onBlocked) o.onBlocked(ev.error); }
    };
    rec.onend = () => {
      if (stopped) return;
      if (Date.now() < deadline) { try { startOne(); } catch (e) { setTimeout(startOne, 200); } return; }
      stopped = true; end();
      if (o.onFail) o.onFail(best);
    };
    try { rec.start(); } catch (e) { setTimeout(startOne, 250); }
  };
  if (o.onListen) o.onListen(true);
  startOne();
  return { stop() { stopped = true; end(); try { rec && rec.abort(); } catch (e) {} } };
}
const sayCanListen = () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

function saySpeak(text, then) {
  if (!('speechSynthesis' in window)) { if (then) setTimeout(then, 500); return; }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.8;
    if (then) { let d = false; const f = () => { if (!d) { d = true; then(); } }; u.onend = f; u.onerror = f; setTimeout(f, 2500); }
    window.speechSynthesis.speak(u);
  } catch (e) { if (then) setTimeout(then, 500); }
}

// ---------------------------------------------------------------------------
// THE GAME
// ---------------------------------------------------------------------------
function openSayItGame() {
  const SETS = (typeof JL_SETS !== 'undefined' ? JL_SETS : []).filter(s => s.words().length >= 3);
  let setId = (SETS.find(s => s.id === 'animals') || SETS[0] || {}).id;
  const ROUNDS = 8;
  let words = [], round = 0, stars = 0, target = null, tries = 0, listening = null, autoMic = false, done = false;

  openModal(`
    <div class="modal-content-pad sy">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">${typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML('🎤', 'pr-head-img') : '🎤'}</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Say it!</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">Look, listen and say the word! 🎤</span></p>
        </div>
      </div>
      <div id="syMount"></div>
    </div>`, true);
  const mount = () => document.getElementById('syMount');
  const stopMic = () => { if (listening) { listening.stop(); listening = null; } };
  const watch = setInterval(() => { if (!mount()) { clearInterval(watch); stopMic(); } }, 1000);

  function setup() {
    stopMic();
    const m = mount(); if (!m) return;
    m.innerHTML = `
      <div class="mz-setup">
        <p class="mz-wait">What do you want to say?</p>
        <div class="mz-opts tm-sets">
          ${SETS.map(s => `<button type="button" class="mz-opt${s.id === setId ? ' on' : ''}" data-set="${s.id}">${typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML(s.icon, 'mz-av-img') : s.icon}<small>${igEscapeHtml(s.en)}</small></button>`).join('')}
        </div>
        ${sayCanListen() ? '' : '<p class="mz-keys">⚠️ Este navegador não reconhece voz: use o Chrome ou o Edge. Dá para jogar com o ✅.</p>'}
        <button type="button" class="btn btn-primary mz-start" data-start>▶ Start!</button>
      </div>`;
    m.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => { setId = b.dataset.set; setup(); }));
    m.querySelector('[data-start]').addEventListener('click', () => {
      const set = SETS.find(s => s.id === setId) || SETS[0];
      const list = set.words().filter(w => w.en);
      words = list.sort(() => Math.random() - 0.5).slice(0, ROUNDS);
      round = 0; stars = 0;
      next();
    });
  }

  const picture = w => (w.num != null ? `<span class="sy-num">${w.num}</span>`
    : typeof igWordVisualHTML === 'function' ? igWordVisualHTML(w, 'sy-pic') : `<span class="sy-pic">${w.emoji || '❓'}</span>`);

  function next() {
    stopMic();
    const m = mount(); if (!m) return;
    if (round >= Math.min(ROUNDS, words.length)) { finish(); return; }
    target = words[round]; tries = 0; done = false;
    m.innerHTML = `
      <div class="cg-stars">${Array.from({ length: Math.min(ROUNDS, words.length) }, (_, i) => `<i class="${i < stars ? 'on' : ''}">⭐</i>`).join('')}</div>
      <div class="sy-card">${picture(target)}</div>
      <div class="cg-say-actions">
        <button class="cg-big cg-big--soft" data-hear aria-label="Hear the word">🔊</button>
        ${sayCanListen() ? '<button class="cg-big" data-mic aria-label="Speak">🎤</button>' : ''}
        <button class="cg-big cg-big--ok" data-ok aria-label="I said it">✅</button>
      </div>
      <p class="cg-heard" data-status>${sayCanListen() ? 'Toque no 🎤 e diga a palavra' : ''}</p>
      <p class="sy-word" data-word hidden>${igEscapeHtml(target.en)}</p>`;
    const status = t => { const el = m.querySelector('[data-status]'); if (el) el.innerHTML = t; };
    const mic = m.querySelector('[data-mic]');
    const listen = () => {
      if (done || !mic || !mic.isConnected) return;
      stopMic();
      if (typeof abStopAudio === 'function') abStopAudio();
      listening = sayListen({
        target: target.en,
        onListen: on => { if (mic.isConnected) mic.classList.toggle('is-recording', on); if (on) status('🎤 Listening… <b>say it!</b>'); },
        onOk: () => good(),
        onFail: best => {
          tries++;
          if (best) { if (typeof IGSound !== 'undefined') IGSound.wrong(); status(`🤔 Ouvi “${igEscapeHtml(best)}”. Ouça 🔊 e tente de novo!`); }
          else status('🙉 Não ouvi nada. Toque no 🎤 e fale um pouco mais alto.');
          // After two tries the word itself appears, to help.
          if (tries >= 2) { const w = m.querySelector('[data-word]'); if (w) w.hidden = false; }
          if (typeof igMiss === 'function' && tries === 1) igMiss({ en: target.en, pt: target.pt, emoji: target.emoji, image: target.image }, false, 'Say it!');
        },
        onBlocked: () => status('⚠️ O microfone está bloqueado. Libere o microfone no navegador ou use o ✅.'),
      });
    };
    m.querySelector('[data-hear]').addEventListener('click', () => { stopMic(); saySpeak(target.en); });
    m.querySelector('[data-ok]').addEventListener('click', () => good(true));
    if (mic) mic.addEventListener('click', () => { autoMic = true; listen(); });
    if (mic && autoMic) setTimeout(listen, 500);
  }
  function good(byHand) {
    if (done) return;
    done = true;
    stopMic();
    if (!byHand || tries === 0) stars++;
    round++;
    if (typeof IGSound !== 'undefined') IGSound.correct();
    if (typeof igMiss === 'function') igMiss({ en: target.en, pt: target.pt, emoji: target.emoji, image: target.image }, tries === 0, 'Say it!');
    const m = mount();
    if (m) { const st = m.querySelector('[data-status]'); if (st) st.innerHTML = `⭐ <b>${igEscapeHtml(target.en)}</b>!`; const c = m.querySelector('.sy-card'); if (c) c.classList.add('ok'); }
    saySpeak(target.en, () => setTimeout(next, 400));
  }
  function finish() {
    stopMic();
    const m = mount(); if (!m) return;
    if (typeof IGSound !== 'undefined') IGSound.win();
    if (typeof awardProgress === 'function') awardProgress(stars * 2, stars >= words.length - 1 ? 1 : 0);
    m.innerHTML = `
      <div class="rv-done">
        <span class="rv-done-emoji">🎉</span>
        <div class="cg-stars">${Array.from({ length: words.length }, (_, i) => `<i class="${i < stars ? 'on' : ''}">⭐</i>`).join('')}</div>
        <div class="an-done-actions">
          <button class="btn btn-primary" data-again>🔄 Again</button>
          <button class="game-btn secondary" data-menu>⚙️ Menu</button>
        </div>
      </div>`;
    saySpeak('Great job!');
    m.querySelector('[data-again]').addEventListener('click', () => { words.sort(() => Math.random() - 0.5); round = 0; stars = 0; next(); });
    m.querySelector('[data-menu]').addEventListener('click', setup);
  }

  if (!SETS.length) { const m = mount(); if (m) m.innerHTML = '<p class="mz-wait">No words yet.</p>'; return; }
  setup();
}
