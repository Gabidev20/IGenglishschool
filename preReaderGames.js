/* ==========================================================================
   IGenglishschool — Games for children who can't read yet
   --------------------------------------------------------------------------
   Pictures, sound and touch only: every instruction is spoken (🔊 says it
   again), every answer is a picture.

     🐄 Old MacDonald     "Who says moo?" — tap the cow and it joins the
                          farm while its verse plays: the traditional tune
                          with karaoke, or the teacher's own recording
     🎈 Touch it!         "Touch the small red star!" "Touch three hearts!"
                          — colors, shapes, big/small and numbers together
     🍕 Pizza Shop        "I want a pizza with two tomatoes and cheese,
                          please!" — the order is spoken AND drawn
     🔊 Sound Detective   a sound plays (a dog, rain, a drum, a phone…):
                          which picture is it?
     🧠 Talking Memory    pairs of a picture and a 🔊 card that only
                          speaks: the pair is found by ear
   ========================================================================== */

const kgShuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const kgPick = a => a[Math.floor(Math.random() * a.length)];
const kgEmoji = (e, cls) => (typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML(e, cls || '') : `<span class="${cls || ''}">${e}</span>`);
const KG_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

// Speak; `then` runs when the voice has finished (or after a guess).
function kgSay(text, opts) {
  const o = opts || {};
  if (!text || !('speechSynthesis' in window)) { if (o.then) setTimeout(o.then, 600); return; }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = o.rate || 0.85; u.pitch = o.pitch || 1;
    if (o.then) {
      let done = false;
      const fin = () => { if (!done) { done = true; o.then(); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 900 + text.length * 110);       // never wait forever
    }
    window.speechSynthesis.speak(u);
  } catch (e) { if (o.then) setTimeout(o.then, 600); }
}
const kgSfx = name => { if (typeof IGSound !== 'undefined' && IGSound[name]) IGSound[name](); };

// The shared window: a title, a mount, and a way to know it is still open.
function kgOpen(icon, title, sub) {
  openModal(`
    <div class="modal-content-pad pr">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">${kgEmoji(icon, 'pr-head-img')}</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">${title}</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">${sub}</span></p>
        </div>
      </div>
      <div id="kgMount"></div>
    </div>`, true);
  const token = {};
  const mount = document.getElementById('kgMount');
  mount._pr = token;
  return {
    el: () => { const m = document.getElementById('kgMount'); return m && m._pr === token ? m : null; },
  };
}
const kgStarsRow = (n, total) => `<div class="cg-stars">${Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}">⭐</i>`).join('')}</div>`;
function kgDone(m, stars, total, again, extra) {
  kgSfx('win');
  if (typeof awardProgress === 'function') awardProgress(stars * 2, stars >= total - 1 ? 1 : 0);
  m.innerHTML = `
    <div class="rv-done">
      <span class="rv-done-emoji">🎉</span>
      ${kgStarsRow(stars, total)}
      ${extra || ''}
      <button class="cg-big" data-again aria-label="Play again">🔄</button>
    </div>`;
  kgSay('Great job!');
  m.querySelector('[data-again]').addEventListener('click', again);
}

// ===========================================================================
// 🐄 OLD MACDONALD'S FARM
// ===========================================================================
const KG_FARM = [
  { id: 'cow', en: 'cow', emoji: '🐄', sound: 'moo' },
  { id: 'pig', en: 'pig', emoji: '🐖', sound: 'oink' },
  { id: 'duck', en: 'duck', emoji: '🦆', sound: 'quack' },
  { id: 'sheep', en: 'sheep', emoji: '🐑', sound: 'baa' },
  { id: 'horse', en: 'horse', emoji: '🐴', sound: 'neigh' },
  { id: 'dog', en: 'dog', emoji: '🐕', sound: 'woof' },
  { id: 'cat', en: 'cat', emoji: '🐈', sound: 'meow' },
  { id: 'chicken', en: 'chicken', emoji: '🐔', sound: 'cluck' },
];
// Where each animal stands in the field (% of the scene).
const KG_FARM_SPOTS = [[14, 70], [30, 80], [46, 72], [62, 82], [78, 72], [22, 56], [56, 58], [88, 58]];
// The song. The tune and words of "Old MacDonald Had a Farm" are traditional
// (public domain); the melody is played here by synthesised instruments, the
// words light up as they are sung (karaoke), and the voice says the
// animal's name and sound right on their notes — a speech voice cannot sing
// in tune. A verse the teacher recorded with her own voice is played instead.
const KG_NOTE = { D4: 293.66, E4: 329.63, G4: 392, A4: 440, B4: 493.88 };
// [word, note, beats, spoken] — `spoken` is said by the voice on that note;
// a word ending in ~ is one syllable of a longer word (Mac~Don~ald).
function kgSongLines(a) {
  const n = a.en, s = a.sound;
  const ar = /^[aeiou]/i.test(s) ? 'an' : 'a';      // with an oink oink
  const old = [['Old', 'G4', 1], ['Mac~', 'G4', 1], ['Don~', 'G4', 1], ['ald', 'D4', 1], ['had', 'E4', 1], ['a', 'E4', 1], ['farm,', 'D4', 2]];
  const eio = [['E', 'B4', 1], ['I', 'B4', 1], ['E', 'A4', 1], ['I', 'A4', 1], ['O!', 'G4', 2.5]];
  const farm = [['And', 'D4', 0.5], ['on', 'D4', 0.5], ['that', 'G4', 1], ['farm', 'G4', 1], ['he', 'D4', 1], ['had', 'E4', 1], ['a', 'E4', 1], [`${n},`, 'D4', 2, n]];
  const here = [['With', 'D4', 0.5], [ar, 'D4', 0.5], [s, 'G4', 1, `${s} ${s}`], [s, 'G4', 1], ['here,', 'G4', 1],
    ['and', 'D4', 0.5], [ar, 'D4', 0.5], [s, 'G4', 1, `${s} ${s}`], [s, 'G4', 1], ['there,', 'G4', 1]];
  const every = [['Here', 'G4', 0.5], [ar, 'G4', 0.5], [`${s},`, 'G4', 1, s], ['there', 'G4', 0.5], [ar, 'G4', 0.5], [`${s},`, 'G4', 1, s],
    ['ev~', 'G4', 0.5], ['ery~', 'G4', 0.5], ['where', 'G4', 0.5], [ar, 'G4', 0.5], [s, 'G4', 0.5, `${s} ${s}`], [s, 'G4', 1.5]];
  return [old, eio, farm, eio, here, every, old, eio];
}
// A syllable, and the space after it unless the word goes on (Mac~Don~ald).
const kgSyl = (l, j) => l[j][0].replace(/~$/, '') + (j < l.length - 1 && !/~$/.test(l[j][0]) ? ' ' : '');
const kgSongText = a => kgSongLines(a).map(l => l.map((w, j) => kgSyl(l, j)).join('')).join('\n');

// The karaoke: the line being sung, big, its words lighting up; the next line small.
function kgLyricsHTML(lines, li, wi) {
  const line = (l, k, cls) => `<p class="${cls}">${l.map((w, j) => `<span class="${k === li && j <= wi ? 'on' : ''}${k === li && j === wi ? ' now' : ''}">${igEscapeHtml(w[0].replace(/~$/, ''))}</span>${/~$/.test(w[0]) || j === l.length - 1 ? '' : ' '}`).join('')}</p>`;
  return `${line(lines[li] || [], li, 'fm-lyr-now')}${lines[li + 1] ? line(lines[li + 1], li + 1, 'fm-lyr-next') : ''}`;
}

// Plays one verse; returns { stop }. opts: { lyricsEl, voice (say the
// animal words), then, alive (() => still open?) }.
function kgSingVerse(a, opts) {
  const o = opts || {};
  const lines = kgSongLines(a);
  const BEAT = 0.4;
  const S = typeof IGSound !== 'undefined' && IGSound.note && !IGSound.muted() ? IGSound : null;
  const timers = [];
  const at = (beats, fn) => timers.push(setTimeout(() => { if (!o.alive || o.alive()) fn(); else stop(); }, beats * BEAT * 1000));
  let t = 0;
  lines.forEach((line, li) => line.forEach((w, wi) => {
    const [, note, beats, spoken] = w;
    const f = KG_NOTE[note];
    at(t, () => {
      if (S) { S.note(f, 0, beats * BEAT * 0.92, 'triangle', 0.16); S.note(f * 2, 0, beats * BEAT * 0.5, 'sine', 0.03); }
      if (o.lyricsEl) o.lyricsEl.innerHTML = kgLyricsHTML(lines, li, wi);
      if (spoken && o.voice !== false) kgSay(spoken, { rate: 1.15, pitch: 1.25 });
    });
    t += beats;
  }));
  // A bouncy bass and a soft tap on every beat, like a farm band.
  for (let b = 0; b < Math.ceil(t); b++) {
    at(b, () => {
      if (!S) return;
      S.note(b % 2 ? 146.83 : 98, 0, BEAT * 0.8, 'sine', 0.1);
      if (S.noise) S.noise(0, 0.03, 'highpass', 4000, 0, b % 2 ? 0.05 : 0.025);
    });
  }
  at(t + 0.4, () => { if (o.lyricsEl) o.lyricsEl.innerHTML = ''; if (o.then) o.then(); });
  function stop() { timers.forEach(clearTimeout); timers.length = 0; }
  return { stop, seconds: (t + 0.4) * BEAT };
}

// The teacher's own recordings: { cow: 'data:audio/…', … } — saved with her
// data (synced like the rest), small: 32 kbit/s.
const KG_FARM_VOICE_KEY = 'farm_voice';
const kgFarmVoices = () => { const v = typeof IGStore !== 'undefined' ? IGStore.getJSON(KG_FARM_VOICE_KEY, {}) : {}; return v && typeof v === 'object' ? v : {}; };
function kgSaveFarmVoice(id, dataUrl) {
  const all = kgFarmVoices();
  if (dataUrl) all[id] = dataUrl; else delete all[id];
  IGStore.setJSON(KG_FARM_VOICE_KEY, all);
}

// One verse, whichever way it exists: the teacher's recording, or the
// melody with karaoke. Returns { stop }.
function kgFarmVerse(a, opts) {
  const o = opts || {};
  const voice = kgFarmVoices()[a.id];
  if (!voice) return kgSingVerse(a, o);
  const audio = new Audio(voice);
  let done = false;
  const fin = () => { if (done) return; done = true; if (o.lyricsEl) o.lyricsEl.innerHTML = ''; if (o.then && (!o.alive || o.alive())) o.then(); };
  if (o.lyricsEl) o.lyricsEl.innerHTML = `<p class="fm-lyr-all">${igEscapeHtml(kgSongText(a)).replace(/\n/g, '<br>')}</p>`;
  audio.onended = fin; audio.onerror = () => { done = true; kgSingVerse(a, o); };
  audio.play().catch(() => { if (!done) { done = true; kgSingVerse(a, o); } });
  return { stop() { done = true; try { audio.pause(); } catch (e) {} } };
}


function kgFarmScene() {
  return `<svg class="fm-bg" viewBox="0 0 400 220" preserveAspectRatio="none" aria-hidden="true">
    <rect width="400" height="220" fill="#9fdcf7"/>
    <circle cx="350" cy="38" r="20" fill="#ffd166"/>
    <path d="M0,120 Q90,80 190,112 T400,104 V220 H0Z" fill="#9ed58a"/>
    <path d="M0,140 Q120,118 230,138 T400,132 V220 H0Z" fill="#7cc05f"/>
    <g transform="translate(250 54)">
      <path d="M0,40 L45,8 L90,40 V96 H0Z" fill="#c9435c" stroke="#2e2b2e" stroke-width="2"/>
      <path d="M-6,42 L45,4 L96,42" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
      <rect x="30" y="56" width="30" height="40" fill="#8b3a2b" stroke="#2e2b2e" stroke-width="2"/>
      <path d="M30,56 L60,96 M60,56 L30,96" stroke="#fff" stroke-width="3"/>
      <rect x="37" y="22" width="16" height="14" fill="#ffe08a" stroke="#2e2b2e" stroke-width="2"/>
    </g>
    ${Array.from({ length: 14 }, (_, i) => `<rect x="${i * 30 + 4}" y="150" width="7" height="34" fill="#f2e3c9" stroke="#8b6b45" stroke-width="1.5"/>`).join('')}
    <rect x="0" y="158" width="400" height="6" fill="#f2e3c9" stroke="#8b6b45" stroke-width="1.2"/>
    <rect x="0" y="172" width="400" height="6" fill="#f2e3c9" stroke="#8b6b45" stroke-width="1.2"/>
  </svg>`;
}

function openFarmGame() {
  const win = kgOpen('🐄', "Old MacDonald's Farm", 'Who says moo? Find the animal!');
  // Recording is for the teacher only (not on a student's link or a public game).
  const teacher = !window.IG_SHARE_MODE;
  let onFarm = [], target = null, busy = false, playing = null;
  const alive = () => Boolean(win.el());
  const stopSong = () => { if (playing) { playing.stop(); playing = null; } };

  function paint() {
    const m = win.el(); if (!m) return;
    const left = KG_FARM.filter(a => !onFarm.includes(a.id));
    m.innerHTML = `
      <div class="fm">
        <div class="fm-scene">
          ${kgFarmScene()}
          ${onFarm.map((id, i) => { const a = KG_FARM.find(x => x.id === id); const [x, y] = KG_FARM_SPOTS[i]; return `
            <button type="button" class="fm-animal" data-farm="${id}" style="left:${x}%;top:${y}%">${kgEmoji(a.emoji, 'fm-animal-img')}</button>`; }).join('')}
        </div>
        <div class="fm-lyrics" data-lyrics aria-live="polite"></div>
        ${left.length ? `
          <div class="fm-bar">
            <button class="cg-listen" data-hear aria-label="Listen again">🔊</button>
          </div>
          <div class="fm-cards">
            ${kgShuffle(left).map(a => `<button type="button" class="fm-card" data-pick="${a.id}" aria-label="${a.en}">${kgEmoji(a.emoji, 'fm-card-img')}</button>`).join('')}
          </div>` : `
          <div class="an-done-actions fm-end">
            <button type="button" class="btn btn-primary" data-sing>🎵 Sing the song</button>
            <button type="button" class="game-btn secondary" data-again>🔄 Again</button>
          </div>`}
        ${teacher ? `<div class="fm-teacher"><button type="button" class="game-btn secondary" data-voice>🎙️ Minha voz — gravar os versos</button></div>` : ''}
      </div>`;
    m.querySelectorAll('[data-farm]').forEach(b => b.addEventListener('click', () => {
      if (playing) return;
      const a = KG_FARM.find(x => x.id === b.dataset.farm);
      b.classList.remove('jump'); void b.offsetWidth; b.classList.add('jump');
      kgSay(`A ${a.en}! ${a.sound}, ${a.sound}!`);
    }));
    const hear = m.querySelector('[data-hear]');
    if (hear) hear.addEventListener('click', ask);
    m.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => pick(b)));
    const sing = m.querySelector('[data-sing]');
    if (sing) sing.addEventListener('click', singAll);
    const again = m.querySelector('[data-again]');
    if (again) again.addEventListener('click', () => { stopSong(); onFarm = []; target = null; paint(); next(); });
    const voice = m.querySelector('[data-voice]');
    if (voice) voice.addEventListener('click', () => { stopSong(); voicePanel(); });
  }
  const lyricsEl = () => win.el() && win.el().querySelector('[data-lyrics]');

  function ask() { if (target && !playing) kgSay(`Who says ${target.sound}? ${target.sound}! ${target.sound}!`); }
  function next() {
    const left = KG_FARM.filter(a => !onFarm.includes(a.id));
    if (!left.length) { kgSfx('win'); return; }
    target = kgPick(left);
    busy = false;
    ask();
  }
  function pick(btn) {
    if (busy || !target) return;
    const a = KG_FARM.find(x => x.id === btn.dataset.pick);
    if (a.id === target.id) {
      busy = true;
      kgSfx('correct');
      onFarm.push(a.id);
      paint();
      const el = win.el() && win.el().querySelector(`[data-farm="${a.id}"]`);
      if (el) el.classList.add('arrive');
      // The animal's verse, then the next question.
      setTimeout(() => {
        if (!alive()) return;
        playing = kgFarmVerse(a, { lyricsEl: lyricsEl(), alive, then: () => { playing = null; if (alive()) next(); } });
      }, 500);
    } else {
      kgSfx('wrong');
      btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 500);
      kgSay(`${a.sound}! I'm a ${a.en}. Who says ${target.sound}?`);
    }
  }
  // The whole song, one verse per animal; each one jumps when it is sung.
  function singAll() {
    if (playing) return;
    const order = onFarm.slice();
    const verse = i => {
      const m = win.el(); playing = null;
      if (!m || i >= order.length) { if (m) kgSfx('win'); return; }
      const a = KG_FARM.find(x => x.id === order[i]);
      const el = m.querySelector(`[data-farm="${a.id}"]`);
      if (el) { el.classList.remove('jump'); void el.offsetWidth; el.classList.add('jump'); }
      playing = kgFarmVerse(a, { lyricsEl: lyricsEl(), alive, then: () => verse(i + 1) });
    };
    verse(0);
  }

  // ---- 🎙️ the teacher records each verse with her own voice -----------------
  // While recording, the melody and the karaoke play, so she sings in time.
  function voicePanel() {
    const m = win.el(); if (!m) return;
    const can = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    let rec = null, stream = null, recId = null;
    const voices = kgFarmVoices();
    const stopAll = () => {
      stopSong();
      if (rec && rec.state !== 'inactive') rec.stop();
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    };
    const draw = () => {
      const box = win.el(); if (!box) { stopAll(); return; }
      const vs = kgFarmVoices();
      box.innerHTML = `
        <div class="fm-voice">
          <p class="fm-voice-tip">🎙️ Toque em <b>● Gravar</b> e cante o verso junto com a música (use fone de ouvido se puder).
            Quando houver gravação, o jogo usa <b>a sua voz</b> no lugar da melodia. Fica salvo na sua conta.</p>
          ${can ? '' : '<p class="fm-voice-tip">⚠️ Este navegador não grava áudio.</p>'}
          <div class="fm-lyrics" data-lyrics></div>
          <div class="fm-voice-list">
            ${KG_FARM.map(a => `
              <div class="fm-voice-row${recId === a.id ? ' rec' : ''}">
                ${kgEmoji(a.emoji, 'fm-voice-img')}<b>${a.en}</b><small>${a.sound} ${a.sound}</small>
                ${recId === a.id
                  ? '<button type="button" class="game-btn" data-stop>■ Parar</button>'
                  : `<button type="button" class="game-btn secondary" data-rec="${a.id}" ${!can || recId ? 'disabled' : ''}>● Gravar</button>`}
                ${vs[a.id] ? `<button type="button" class="game-btn secondary" data-play="${a.id}" ${recId ? 'disabled' : ''}>▶</button>
                  <button type="button" class="game-btn secondary danger" data-del="${a.id}" ${recId ? 'disabled' : ''} title="Apagar a gravação">🗑</button>`
                  : '<span class="fm-voice-none">melodia</span>'}
              </div>`).join('')}
          </div>
          <div class="an-done-actions"><button type="button" class="btn btn-primary" data-back ${recId ? 'disabled' : ''}>✅ Pronto — voltar ao jogo</button></div>
        </div>`;
      box.querySelectorAll('[data-rec]').forEach(b => b.addEventListener('click', () => record(KG_FARM.find(a => a.id === b.dataset.rec))));
      const st = box.querySelector('[data-stop]'); if (st) st.addEventListener('click', () => { if (rec && rec.state !== 'inactive') rec.stop(); });
      box.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => {
        stopSong();
        playing = kgFarmVerse(KG_FARM.find(a => a.id === b.dataset.play), { lyricsEl: box.querySelector('[data-lyrics]'), alive, then: () => { playing = null; } });
      }));
      box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        if (!confirm('Apagar a gravação deste verso? O jogo volta a usar a melodia.')) return;
        kgSaveFarmVoice(b.dataset.del, null); draw();
      }));
      box.querySelector('[data-back]').addEventListener('click', () => { stopAll(); paint(); if (target && onFarm.length < KG_FARM.length) ask(); });
    };
    async function record(a) {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { alert('Não consegui usar o microfone. Verifique a permissão do navegador.'); return; }
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mimeType = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
      rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        stopSong();
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        const fr = new FileReader();
        fr.onload = () => { kgSaveFarmVoice(a.id, fr.result); recId = null; kgSfx('correct'); draw(); };
        fr.readAsDataURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      };
      recId = a.id;
      draw();
      rec.start();
      // The melody (without the speaking voice) to sing along with; the
      // recording stops by itself at the end of the verse.
      playing = kgSingVerse(a, { lyricsEl: win.el() && win.el().querySelector('[data-lyrics]'), voice: false, alive,
        then: () => { playing = null; if (rec && rec.state !== 'inactive') rec.stop(); } });
    }
    draw();
  }

  paint();
  next();
}

// ===========================================================================
// 🎈 TOUCH IT! — colors, shapes, big/small, numbers
// ===========================================================================
const KG_SHAPES = {
  circle: '<circle cx="50" cy="50" r="42"/>',
  square: '<rect x="10" y="10" width="80" height="80" rx="10"/>',
  triangle: '<path d="M50,8 L94,90 H6Z"/>',
  star: '<path d="M50,6 L62,38 L96,39 L69,60 L79,93 L50,74 L21,93 L31,60 L4,39 L38,38Z"/>',
  heart: '<path d="M50,90 C12,62 2,32 24,16 C38,6 50,18 50,28 C50,18 62,6 76,16 C98,32 88,62 50,90Z"/>',
};
const KG_COLORS = { red: '#e5484d', blue: '#3d7bd9', green: '#3fae5a', yellow: '#f2bd2c', purple: '#8e5fc2', orange: '#f08a24' };
const kgShapeSVG = (it, cls) => `<svg class="${cls || ''}" viewBox="0 0 100 100" aria-hidden="true"><g fill="${KG_COLORS[it.color]}" stroke="#2e2b2e" stroke-width="4" stroke-linejoin="round" transform="${it.size === 'small' ? 'translate(25 25) scale(.5)' : ''}">${KG_SHAPES[it.shape]}</g></svg>`;
const kgItemName = (it, withSize) => `${withSize ? it.size + ' ' : ''}${it.color} ${it.shape}`;

function openTouchGame() {
  const win = kgOpen('🎈', 'Touch it!', 'Listen and touch! Colors, shapes, big and small, numbers');
  const ROUNDS = 8;
  let round = 0, stars = 0, board = [], task = null, locked = false, tapped = new Set(), missed = false;
  const SH = Object.keys(KG_SHAPES), CO = Object.keys(KG_COLORS);
  const rnd = () => ({ shape: kgPick(SH), color: kgPick(CO), size: Math.random() < 0.5 ? 'big' : 'small' });

  function makeRound() {
    // Rounds 1–3: "the red star" · 4–6: "the small red star" · 7–8: "three hearts"
    tapped = new Set(); missed = false;
    if (round >= 6) {
      const shape = kgPick(SH), n = 2 + Math.floor(Math.random() * 2);
      const many = Array.from({ length: n + 1 }, () => ({ shape, color: kgPick(CO), size: Math.random() < 0.5 ? 'big' : 'small' }));
      const rest = Array.from({ length: 4 }, () => { let it; do { it = rnd(); } while (it.shape === shape); return it; });
      board = kgShuffle(many.concat(rest));
      task = { kind: 'count', shape, n, say: `Touch ${KG_NUM[n]} ${shape}s!`, match: it => it.shape === shape };
      return;
    }
    const withSize = round >= 3;
    const target = rnd();
    const same = it => it.shape === target.shape && it.color === target.color && (!withSize || it.size === target.size);
    const items = [target];
    // Tricky neighbours: the same shape in another colour, the same colour
    // in another shape, and (later) the same thing in the other size.
    items.push({ ...target, color: kgPick(CO.filter(c => c !== target.color)) });
    items.push({ ...target, shape: kgPick(SH.filter(s => s !== target.shape)) });
    if (withSize) items.push({ ...target, size: target.size === 'big' ? 'small' : 'big' });
    while (items.length < 6) { const it = rnd(); if (!same(it)) items.push(it); }
    board = kgShuffle(withSize ? items : items.map(it => ({ ...it, size: it === target ? it.size : it.size })));
    task = { kind: 'one', target, withSize, say: `Touch the ${kgItemName(target, withSize)}!`, match: same };
  }

  function paint() {
    const m = win.el(); if (!m) return;
    m.innerHTML = `
      ${kgStarsRow(stars, ROUNDS)}
      <button class="cg-listen" data-hear aria-label="Listen again">🔊</button>
      <p class="pr-teacher-line">${igEscapeHtml(task.say)}</p>
      <div class="tt-board">
        ${board.map((it, i) => `<button type="button" class="tt-item${tapped.has(i) ? ' got' : ''}" data-i="${i}" aria-label="${kgItemName(it, true)}">${kgShapeSVG(it, 'tt-svg')}${tapped.has(i) ? `<span class="tt-count">${[...tapped].indexOf(i) + 1}</span>` : ''}</button>`).join('')}
      </div>`;
    m.querySelector('[data-hear]').addEventListener('click', () => kgSay(task.say));
    m.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => tap(Number(b.dataset.i), b)));
  }
  function tap(i, btn) {
    if (locked || tapped.has(i)) return;
    const it = board[i];
    if (task.match(it)) {
      if (task.kind === 'count') {
        tapped.add(i); kgSfx('pop');
        kgSay(KG_NUM[tapped.size]);
        if (tapped.size < task.n) { paint(); return; }
      }
      locked = true;
      if (!missed) stars++;
      round++;
      kgSfx('correct');
      btn.classList.add('popped');
      kgSay(task.kind === 'count' ? `Yes! ${KG_NUM[task.n]} ${task.shape}s!` : `Yes! The ${kgItemName(it, task.withSize)}!`);
      setTimeout(() => { if (!win.el()) return; locked = false; next(); }, 1500);
    } else {
      missed = true;
      kgSfx('wrong');
      btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 500);
      kgSay(`That's a ${kgItemName(it, task.kind === 'one' && task.withSize)}. ${task.say}`);
    }
  }
  function next() {
    const m = win.el(); if (!m) return;
    if (round >= ROUNDS) { kgDone(m, stars, ROUNDS, () => { round = 0; stars = 0; next(); }); return; }
    makeRound(); paint(); kgSay(task.say);
  }
  next();
}

// ===========================================================================
// 🍕 PIZZA SHOP
// ===========================================================================
const KG_TOPPINGS = [
  { id: 'tomato', one: 'tomato', many: 'tomatoes', emoji: '🍅' },
  { id: 'mushroom', one: 'mushroom', many: 'mushrooms', emoji: '🍄' },
  { id: 'olive', one: 'olive', many: 'olives', emoji: '🫒' },
  { id: 'pepper', one: 'pepper', many: 'peppers', emoji: '🫑' },
  { id: 'onion', one: 'onion', many: 'onions', emoji: '🧅' },
  { id: 'cheese', one: 'cheese', many: 'cheese', emoji: '🧀', plain: true },   // "with cheese"
];
const KG_CUSTOMERS = ['👧', '🧒', '👦', '👩', '👨', '👵', '👴'];
// Where toppings sit on the pizza (% of the pizza box), filled in order.
const KG_PIZZA_SPOTS = [[50, 50], [30, 34], [68, 32], [30, 66], [70, 66], [50, 22], [50, 78], [18, 50], [82, 50], [38, 50], [62, 50], [50, 36]];

function openShopGame() {
  const win = kgOpen('🍕', 'Pizza Shop', 'Listen to the order and make the pizza!');
  const ROUNDS = 5;
  let round = 0, stars = 0, order = null, onPizza = [], customer = '👧', tries = 0;
  const phrase = (t, n) => (t.plain ? t.one : `${KG_NUM[n]} ${n === 1 ? t.one : t.many}`);

  function makeOrder() {
    const kinds = kgShuffle(KG_TOPPINGS.filter(t => !t.plain)).slice(0, round < 2 ? 1 : 2);
    order = kinds.map(t => ({ t, n: 1 + Math.floor(Math.random() * (round < 1 ? 2 : 3)) }));
    if (Math.random() < 0.6) order.push({ t: KG_TOPPINGS.find(t => t.plain), n: 1 });
    customer = kgPick(KG_CUSTOMERS); onPizza = []; tries = 0;
  }
  const orderText = () => {
    const parts = order.map(o => phrase(o.t, o.n));
    return `I want a pizza with ${parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]}, please!`;
  };

  function paint() {
    const m = win.el(); if (!m) return;
    m.innerHTML = `
      ${kgStarsRow(stars, ROUNDS)}
      <div class="pz">
        <div class="pz-customer">
          ${kgEmoji(customer, 'pz-face')}
          <button type="button" class="pz-bubble" data-hear title="Listen again">
            ${order.map(o => `<span class="pz-want">${Array.from({ length: o.t.plain ? 1 : o.n }, () => kgEmoji(o.t.emoji, 'pz-want-img')).join('')}</span>`).join('<span class="pz-plus">+</span>')}
            <span class="pz-ear">🔊</span>
          </button>
        </div>
        <div class="pz-pizza" data-pizza>
          <svg viewBox="0 0 100 100" class="pz-base" aria-hidden="true">
            <circle cx="50" cy="50" r="47" fill="#e8b46a" stroke="#a8742f" stroke-width="2"/>
            <circle cx="50" cy="50" r="39" fill="#e5484d"/>
            <circle cx="50" cy="50" r="39" fill="#f6d36b" opacity="${onPizza.some(id => id === 'cheese') ? 0.9 : 0}"/>
          </svg>
          ${onPizza.map((id, i) => id === 'cheese' ? '' : `<button type="button" class="pz-top" data-off="${i}" style="left:${KG_PIZZA_SPOTS[i % 12][0]}%;top:${KG_PIZZA_SPOTS[i % 12][1]}%">${kgEmoji(KG_TOPPINGS.find(t => t.id === id).emoji, 'pz-top-img')}</button>`).join('')}
        </div>
        <div class="pz-shelf">
          ${KG_TOPPINGS.map(t => `<button type="button" class="pz-ing" data-add="${t.id}" aria-label="${t.one}">${kgEmoji(t.emoji, 'pz-ing-img')}</button>`).join('')}
        </div>
        <div class="an-done-actions">
          <button type="button" class="game-btn secondary" data-clear>🧽</button>
          <button type="button" class="btn btn-primary" data-serve>✅ Here you are!</button>
        </div>
        <p class="pr-teacher-line">${igEscapeHtml(orderText())}</p>
      </div>`;
    m.querySelector('[data-hear]').addEventListener('click', () => kgSay(orderText()));
    m.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => add(b.dataset.add)));
    m.querySelectorAll('[data-off]').forEach(b => b.addEventListener('click', () => { onPizza.splice(Number(b.dataset.off), 1); kgSfx('drop'); paint(); }));
    m.querySelector('[data-clear]').addEventListener('click', () => { onPizza = []; paint(); });
    m.querySelector('[data-serve]').addEventListener('click', serve);
  }
  function add(id) {
    const t = KG_TOPPINGS.find(x => x.id === id);
    if (t.plain) {
      if (onPizza.includes(id)) return;
      onPizza.push(id); kgSfx('pop'); kgSay('cheese'); paint(); return;
    }
    if (onPizza.filter(x => x !== 'cheese').length >= 12) return;
    onPizza.push(id); kgSfx('pop');
    const n = onPizza.filter(x => x === id).length;
    kgSay(phrase(t, n));
    paint();
  }
  function serve() {
    const ok = KG_TOPPINGS.every(t => {
      const want = (order.find(o => o.t.id === t.id) || { n: 0 }).n;
      const got = onPizza.filter(x => x === t.id).length;
      return t.plain ? Boolean(want) === Boolean(got) : want === got;
    });
    if (ok) {
      if (tries === 0) stars++;
      round++;
      kgSfx('correct');
      const m = win.el();
      if (m) m.querySelector('.pz-pizza').classList.add('served');
      kgSay('Thank you! Yummy!', { then: next });
    } else {
      tries++;
      kgSfx('wrong');
      const pz = win.el() && win.el().querySelector('.pz-pizza');
      if (pz) { pz.classList.add('shake'); setTimeout(() => pz.classList.remove('shake'), 500); }
      kgSay(`Hmm, no. ${orderText()}`);
    }
  }
  function next() {
    const m = win.el(); if (!m) return;
    if (round >= ROUNDS) { kgDone(m, stars, ROUNDS, () => { round = 0; stars = 0; next(); }); return; }
    makeOrder(); paint(); kgSay(`Hello! ${orderText()}`);
  }
  next();
}

// ===========================================================================
// 🔊 SOUND DETECTIVE
// ===========================================================================
function kgRing(times, f1, f2) { // a telephone: little trills
  const S = typeof IGSound !== 'undefined' && !IGSound.muted() ? IGSound : null; if (!S) return;
  for (let r = 0; r < times; r++) for (let k = 0; k < 10; k++) S.note(k % 2 ? f2 : f1, r * 0.9 + k * 0.045, 0.045, 'square', 0.05);
}
const KG_SOUNDS = [
  { id: 'dog', en: "It's a dog!", emoji: '🐕', play: () => kgSay('Woof! Woof! Woof!', { pitch: 0.7 }) },
  { id: 'cat', en: "It's a cat!", emoji: '🐈', play: () => kgSay('Meow! Meeeow!', { pitch: 1.5 }) },
  { id: 'cow', en: "It's a cow!", emoji: '🐄', play: () => kgSay('Mooooo! Moooo!', { pitch: 0.6, rate: 0.6 }) },
  { id: 'duck', en: "It's a duck!", emoji: '🦆', play: () => kgSay('Quack! Quack! Quack!', { pitch: 1.4 }) },
  { id: 'sheep', en: "It's a sheep!", emoji: '🐑', play: () => kgSay('Baaa! Baaaa!', { pitch: 1.3, rate: 0.7 }) },
  { id: 'rooster', en: "It's a rooster!", emoji: '🐓', play: () => kgSay('Cock-a-doodle-doo!', { pitch: 1.4 }) },
  { id: 'lion', en: "It's a lion!", emoji: '🦁', play: () => kgSay('Roooar! Roooar!', { pitch: 0.5, rate: 0.7 }) },
  { id: 'rain', en: "It's the rain!", emoji: '🌧️', play: () => typeof playWeatherSound === 'function' && playWeatherSound('rainy') },
  { id: 'thunder', en: "It's thunder!", emoji: '⛈️', play: () => typeof playWeatherSound === 'function' && playWeatherSound('stormy') },
  { id: 'wind', en: "It's the wind!", emoji: '💨', play: () => typeof playWeatherSound === 'function' && playWeatherSound('windy') },
  { id: 'bird', en: "It's a bird!", emoji: '🐦', play: () => typeof playWeatherSound === 'function' && playWeatherSound('sunny') },
  { id: 'drum', en: "It's a drum!", emoji: '🥁', play: () => typeof InstrumentSound !== 'undefined' && InstrumentSound.play('drum') },
  { id: 'piano', en: "It's a piano!", emoji: '🎹', play: () => typeof InstrumentSound !== 'undefined' && InstrumentSound.play('piano') },
  { id: 'guitar', en: "It's a guitar!", emoji: '🎸', play: () => typeof InstrumentSound !== 'undefined' && InstrumentSound.play('guitar') },
  { id: 'phone', en: "It's a phone!", emoji: '☎️', play: () => kgRing(2, 880, 1100) },
  { id: 'doorbell', en: "It's a doorbell!", emoji: '🔔', play: () => {
    const S = typeof IGSound !== 'undefined' && !IGSound.muted() ? IGSound : null; if (!S) return;
    S.note(659, 0, 0.7, 'sine', 0.22); S.note(1318, 0, 0.5, 'sine', 0.05); S.note(523, 0.55, 1.1, 'sine', 0.22); S.note(1046, 0.55, 0.8, 'sine', 0.05);
  } },
  { id: 'clock', en: "It's a clock!", emoji: '⏰', play: () => { for (let i = 0; i < 6; i++) setTimeout(() => kgSfx('tick'), i * 480); } },
  { id: 'car', en: "It's a car!", emoji: '🚗', play: () => {
    const S = typeof IGSound !== 'undefined' && !IGSound.muted() ? IGSound : null; if (!S) return;
    [0, 0.45].forEach(t => { S.note(392, t, 0.32, 'square', 0.07); S.note(494, t, 0.32, 'square', 0.06); });
  } },
  { id: 'train', en: "It's a train!", emoji: '🚂', play: () => kgSay('Choo choo! Choo choo!', { pitch: 0.8 }) },
];

function openSoundGame() {
  const win = kgOpen('🔊', 'Sound Detective', 'Listen… what is it?');
  const ROUNDS = 8;
  let round = 0, stars = 0, target = null, choices = [], missed = false, locked = false, used = [];

  function next() {
    const m = win.el(); if (!m) return;
    if (round >= ROUNDS) { kgDone(m, stars, ROUNDS, () => { round = 0; stars = 0; used = []; next(); }); return; }
    const pool = KG_SOUNDS.filter(s => !used.includes(s.id));
    target = kgPick(pool); used.push(target.id);
    choices = kgShuffle([target, ...kgShuffle(KG_SOUNDS.filter(s => s.id !== target.id)).slice(0, 2)]);
    missed = false; locked = false;
    m.innerHTML = `
      ${kgStarsRow(stars, ROUNDS)}
      <button class="cg-listen sd-listen" data-hear aria-label="Play the sound">🔊</button>
      <div class="cg-grid sd-grid">
        ${choices.map((s, i) => `<button type="button" class="cg-choice" data-pick="${i}" aria-label="${s.id}">${kgEmoji(s.emoji, 'sd-img')}</button>`).join('')}
      </div>`;
    m.querySelector('[data-hear]').addEventListener('click', play);
    m.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => pick(choices[Number(b.dataset.pick)], b)));
    setTimeout(play, 500);
  }
  function play() {
    const b = win.el() && win.el().querySelector('[data-hear]');
    if (b) { b.classList.remove('ringing'); void b.offsetWidth; b.classList.add('ringing'); }
    try { target.play(); } catch (e) {}
  }
  function pick(s, btn) {
    if (locked) return;
    if (s.id === target.id) {
      locked = true;
      if (!missed) stars++;
      round++;
      kgSfx('correct');
      btn.classList.add('popped');
      setTimeout(() => kgSay(target.en, { then: () => setTimeout(next, 400) }), 300);
    } else {
      missed = true;
      kgSfx('wrong');
      btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 500);
      kgSay(`No, ${s.en.replace("It's ", 'that is ').replace('!', '')}. Listen again!`, { then: () => setTimeout(play, 300) });
    }
  }
  next();
}

// ===========================================================================
// 🧠 TALKING MEMORY — a picture card and a card that only speaks
// ===========================================================================
function openTalkMemoryGame() {
  const win = kgOpen('🧠', 'Talking Memory', 'Find the pairs by listening! 🔊 + 🖼️');
  const SETS = (typeof JL_SETS !== 'undefined' ? JL_SETS : []).filter(s => s.id !== 'bignumbers' && s.words().length >= 4);
  let setId = (SETS.find(s => s.id === 'animals') || SETS[0] || {}).id, pairs = 4;
  let cards = [], open = [], done = new Set(), busy = false, moves = 0;

  function setup() {
    const m = win.el(); if (!m) return;
    m.innerHTML = `
      <div class="mz-setup">
        <div class="mz-opts tm-sets">
          ${SETS.map(s => `<button type="button" class="mz-opt${s.id === setId ? ' on' : ''}" data-set="${s.id}">${kgEmoji(s.icon, 'mz-av-img')}<small>${igEscapeHtml(s.en)}</small></button>`).join('')}
        </div>
        <div class="mz-opts tm-sets">
          ${[4, 6].map(n => `<button type="button" class="mz-opt mz-opt--wide${pairs === n ? ' on' : ''}" data-pairs="${n}">${'🃏'.repeat(n / 2)} ${n * 2}</button>`).join('')}
        </div>
        <button type="button" class="btn btn-primary mz-start" data-start>▶ Start!</button>
      </div>`;
    m.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => { setId = b.dataset.set; setup(); }));
    m.querySelectorAll('[data-pairs]').forEach(b => b.addEventListener('click', () => { pairs = Number(b.dataset.pairs); setup(); }));
    m.querySelector('[data-start]').addEventListener('click', start);
  }
  function start() {
    const set = SETS.find(s => s.id === setId) || SETS[0];
    const words = kgShuffle(set.words().filter(w => w.en)).slice(0, pairs);
    cards = kgShuffle(words.flatMap((w, k) => [{ w, k, kind: 'pic' }, { w, k, kind: 'ear' }]));
    open = []; done = new Set(); busy = false; moves = 0;
    paint();
    kgSay('Find the pairs!');
  }
  const pic = w => (typeof igWordVisualHTML === 'function' ? igWordVisualHTML(w, 'tm-pic') : kgEmoji(w.emoji || '❓', 'tm-pic'));
  function paint() {
    const m = win.el(); if (!m) return;
    m.innerHTML = `
      <div class="tm-grid${cards.length > 8 ? ' wide' : ''}">
        ${cards.map((c, i) => {
          const up = open.includes(i) || done.has(i);
          const face = !up ? '<span class="tm-back">❓</span>'
            : c.kind === 'pic' || done.has(i) ? `${pic(c.w)}${c.kind === 'ear' ? '<span class="tm-ear-badge">🔊</span>' : ''}`
            : '<span class="tm-ear">🔊</span>';
          return `<button type="button" class="cg-card tm-card${up ? ' up' : ''}${done.has(i) ? ' done' : ''}${c.kind === 'ear' && up && !done.has(i) ? ' ear' : ''}" data-card="${i}" aria-label="card">${face}</button>`;
        }).join('')}
      </div>
      <div class="an-done-actions"><button type="button" class="game-btn secondary" data-menu>⚙️ Menu</button></div>`;
    m.querySelectorAll('[data-card]').forEach(b => b.addEventListener('click', () => flip(Number(b.dataset.card))));
    m.querySelector('[data-menu]').addEventListener('click', setup);
  }
  function flip(i) {
    if (busy || open.includes(i) || done.has(i)) return;
    open.push(i);
    kgSfx('flip');
    kgSay(String(cards[i].w.en));
    paint();
    if (open.length < 2) return;
    moves++;
    const [a, b] = open;
    busy = true;
    setTimeout(() => {
      if (!win.el()) return;
      if (cards[a].k === cards[b].k) {
        done.add(a); done.add(b); kgSfx('match');
        if (typeof igMiss === 'function') igMiss({ en: cards[a].w.en, pt: cards[a].w.pt, emoji: cards[a].w.emoji, image: cards[a].w.image }, true, 'Talking Memory');
      } else kgSfx('wrong');
      open = []; busy = false;
      if (done.size === cards.length) {
        const best = cards.length / 2;
        const st = moves <= best + 1 ? 3 : moves <= best * 2 ? 2 : 1;
        kgDone(win.el(), st, 3, start);
        return;
      }
      paint();
    }, 1100);
  }
  if (!SETS.length) { const m = win.el(); if (m) m.innerHTML = '<p class="mz-wait">No words yet.</p>'; return; }
  setup();
}
