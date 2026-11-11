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
     🍕 Pizza Shop        the Pizza Workshop's ingredients and steps ("Take
                          the pizza dough… Sprinkle the oregano!"), and
                          customers' orders, spoken AND drawn
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

// Numbers 1–10 for Touch it!: [emoji, one, many].
const KG_TT_THINGS = [
  ['🍎', 'apple', 'apples'], ['⭐', 'star', 'stars'], ['🎈', 'balloon', 'balloons'], ['🚗', 'car', 'cars'],
  ['🐶', 'dog', 'dogs'], ['🍌', 'banana', 'bananas'], ['🐤', 'chick', 'chicks'], ['⚽', 'ball', 'balls'],
];
const KG_TT_DIGIT_COLORS = ['#e5484d', '#f08a24', '#e0a800', '#3fae5a', '#3d7bd9', '#8e5fc2', '#f05d77', '#14a3a3', '#8b5e3c', '#2f6fb0'];
function kgTouchNumberHTML(it) {
  if (it.kind === 'digit') {
    return `<svg class="tt-svg" viewBox="0 0 100 100" aria-hidden="true"><text x="50" y="54" text-anchor="middle" dominant-baseline="middle" font-size="${it.n === 10 ? 58 : 74}" font-weight="900" font-family="var(--font-display), sans-serif" fill="${KG_TT_DIGIT_COLORS[(it.n - 1) % 10]}">${it.n}</text></svg>`;
  }
  if (it.kind === 'group') {
    return `<span class="tt-group tt-group--${it.n > 6 ? 'many' : it.n > 4 ? 'some' : 'few'}">${Array.from({ length: it.n }, () => kgEmoji(it.thing[0], 'tt-dot')).join('')}</span>`;
  }
  return `<span class="tt-one">${kgEmoji(it.thing[0], 'tt-one-img')}</span>`;
}
const kgTouchNumberName = it => (it.kind === 'digit' ? `number ${KG_NUM[it.n]}`
  : it.kind === 'group' ? `${KG_NUM[it.n]} ${it.n === 1 ? it.thing[1] : it.thing[2]}` : `${/^[aeiou]/.test(it.thing[1]) ? 'an' : 'a'} ${it.thing[1]}`);

function openTouchGame() {
  const win = kgOpen('🎈', 'Touch it!', 'Listen and touch! Colors, shapes, big and small, numbers');
  const ROUNDS = 8;
  let theme = null;
  let round = 0, stars = 0, board = [], task = null, locked = false, tapped = new Set(), missed = false;
  const SH = Object.keys(KG_SHAPES), CO = Object.keys(KG_COLORS);
  const rnd = () => ({ shape: kgPick(SH), color: kgPick(CO), size: Math.random() < 0.5 ? 'big' : 'small' });
  const name = (it, withSize) => (theme === 'numbers' ? kgTouchNumberName(it) : kgItemName(it, withSize));
  const face = it => (theme === 'numbers' ? kgTouchNumberHTML(it) : kgShapeSVG(it, 'tt-svg'));

  function makeShapesRound() {
    // Rounds 1–3: "the red star" · 4–6: "the small red star" · 7–8: "three hearts"
    if (round >= 6) {
      const shape = kgPick(SH), n = 2 + Math.floor(Math.random() * 2);
      const many = Array.from({ length: n + 1 }, () => ({ shape, color: kgPick(CO), size: Math.random() < 0.5 ? 'big' : 'small' }));
      const rest = Array.from({ length: 4 }, () => { let it; do { it = rnd(); } while (it.shape === shape); return it; });
      board = kgShuffle(many.concat(rest));
      task = { kind: 'count', n, say: `Touch ${KG_NUM[n]} ${shape}s!`, yes: `Yes! ${KG_NUM[n]} ${shape}s!`, match: it => it.shape === shape };
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
    board = kgShuffle(items);
    task = { kind: 'one', withSize, say: `Touch the ${kgItemName(target, withSize)}!`, yes: `Yes! The ${kgItemName(target, withSize)}!`, match: same };
  }

  // Numbers 1–10. Rounds 1–3: "Touch number seven!" (the digits) ·
  // 4–6: "Find four apples!" (cards with 1–10 things) · 7–8: "Touch six
  // stars!" (the child touches them one by one, counting out loud).
  function makeNumbersRound() {
    const n1to10 = () => 1 + Math.floor(Math.random() * 10);
    const near = n => [n - 1, n + 1].filter(k => k >= 1 && k <= 10);
    const spread = (n, size) => {
      const list = [n, ...near(n)];
      while (list.length < size) { const k = n1to10(); if (!list.includes(k)) list.push(k); }
      return kgShuffle(list);
    };
    if (round < 3) {
      const n = n1to10();
      board = spread(n, 8).map(k => ({ kind: 'digit', n: k }));
      task = { kind: 'one', say: `Touch number ${KG_NUM[n]}!`, yes: `Yes! Number ${KG_NUM[n]}!`, match: it => it.n === n };
      return;
    }
    if (round < 6) {
      const n = n1to10(), thing = kgPick(KG_TT_THINGS);
      board = spread(n, 4).map(k => ({ kind: 'group', n: k, thing }));
      const what = `${KG_NUM[n]} ${n === 1 ? thing[1] : thing[2]}`;
      task = { kind: 'one', say: `Find ${what}!`, yes: `Yes! ${what[0].toUpperCase()}${what.slice(1)}!`, match: it => it.n === n };
      return;
    }
    const thing = kgPick(KG_TT_THINGS), n = 3 + Math.floor(Math.random() * 6);   // 3–8
    const others = KG_TT_THINGS.filter(t => t !== thing);
    const items = Array.from({ length: Math.min(10, n + 2) }, () => ({ kind: 'thing', thing }))
      .concat(Array.from({ length: 2 }, () => ({ kind: 'thing', thing: kgPick(others) })));
    board = kgShuffle(items);
    task = { kind: 'count', n, say: `Touch ${KG_NUM[n]} ${thing[2]}!`, yes: `Yes! ${KG_NUM[n][0].toUpperCase()}${KG_NUM[n].slice(1)} ${thing[2]}!`, match: it => it.thing === thing };
  }

  function makeRound() {
    tapped = new Set(); missed = false;
    if (theme === 'numbers') makeNumbersRound(); else makeShapesRound();
  }

  function paint() {
    const m = win.el(); if (!m) return;
    m.innerHTML = `
      ${kgStarsRow(stars, ROUNDS)}
      <button class="cg-listen" data-hear aria-label="Listen again">🔊</button>
      <p class="pr-teacher-line">${igEscapeHtml(task.say)}</p>
      <div class="tt-board${theme === 'numbers' ? ' tt-board--numbers' : ''}">
        ${board.map((it, i) => `<button type="button" class="tt-item${tapped.has(i) ? ' got' : ''}" data-i="${i}" aria-label="${igEscapeHtml(name(it, true))}">${face(it)}${tapped.has(i) ? `<span class="tt-count">${[...tapped].indexOf(i) + 1}</span>` : ''}</button>`).join('')}
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
      kgSay(task.yes);
      setTimeout(() => { if (!win.el()) return; locked = false; next(); }, 1500);
    } else {
      missed = true;
      kgSfx('wrong');
      btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 500);
      kgSay(`That's ${theme === 'numbers' ? '' : 'a '}${name(it, task.kind === 'one' && task.withSize)}. ${task.say}`);
    }
  }
  function next() {
    const m = win.el(); if (!m) return;
    if (round >= ROUNDS) { kgDone(m, stars, ROUNDS, () => { round = 0; stars = 0; menu(); }); return; }
    makeRound(); paint(); kgSay(task.say);
  }
  // The theme first: shapes and colors, or numbers 1–10.
  function menu() {
    const m = win.el(); if (!m) return;
    m.innerHTML = `
      <div class="pz-menu">
        <button type="button" class="pz-mode tt-mode" data-theme="shapes">${kgShapeSVG({ shape: 'star', color: 'yellow', size: 'big' }, 'pz-mode-svg')}<b>🔷 Shapes & colors</b><small>Cores, formas, big e small</small></button>
        <button type="button" class="pz-mode tt-mode" data-theme="numbers">${kgTouchNumberHTML({ kind: 'digit', n: 7 }).replace('tt-svg', 'pz-mode-svg')}<b>🔢 Numbers 1–10</b><small>Números, quantidades e contar</small></button>
      </div>`;
    m.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => {
      theme = b.dataset.theme; round = 0; stars = 0; next();
    }));
  }
  menu();
}

// ===========================================================================
// 🍕 PIZZA SHOP — the same ingredients, drawings and steps as Teacher
// Gabi's Pizza Workshop (Oficina de Pizza): pizza dough, tomato sauce,
// cheese, sausage, olives, shredded chicken, onion rings and oregano.
//   🧑‍🍳 Let's make a pizza!  the workshop's 10 steps, spoken one by one:
//                            the child taps the right ingredient
//   🛎️ Pizza Shop            a customer orders ("…with two olives and
//                            onion rings, please!"), drawn AND spoken
// ===========================================================================
// The workshop's colours (pizza_pdf.py).
const KG_PZ_C = {
  plum: '#4A3347', crust: '#E8B862', crustD: '#CF9A45', dough: '#F6DFA8', dot: '#E8CB8A',
  red: '#D9455F', redD: '#A82E45', swirl: '#F27F93', redDot: '#F79AA9',
  cheese: '#FFE37A', cheeseD: '#D9B040', hole: '#F2C855',
  saus: '#C94A45', sausD: '#7A242A', sausRing: '#E07A72', sausDot: '#EE9A92',
  olive: '#3A2E3C', oliveHi: '#7A6A7C',
  chk: '#E9C79A', chkD: '#B58A55', chkLine: '#D1A472',
  oni: '#F0D2E6', oniD: '#A96E93', oniRing: '#D4A6C6',
  leaf: '#5E9A5A', leafD: '#3E6E3E',
};
// A little seeded random, so a piece always has the same wobbly shape.
function kgRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function kgBlob(cx, cy, rx, ry, seed, wob, n, rot) {
  const r = kgRand(seed), ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = 2 * Math.PI * i / n;
    const k = 1 + wob * (Math.sin(2 * a + ph[0]) * 0.6 + Math.sin(3 * a + ph[1]) * 0.5 + Math.sin(5 * a + ph[2]) * 0.3);
    const x = rx * k * Math.cos(a), y = ry * k * Math.sin(a);
    pts.push(`${(cx + x * Math.cos(rot) - y * Math.sin(rot)).toFixed(1)},${(cy + x * Math.sin(rot) + y * Math.cos(rot)).toFixed(1)}`);
  }
  return pts.join(' ');
}
// One piece of an ingredient, centred at (x, y), size s (about its radius).
function kgPiece(kind, x, y, s, seed, rot) {
  const C = KG_PZ_C, sw = Math.max(0.8, s * 0.09);
  const r = kgRand(seed || 1);
  if (kind === 'cheese') {
    let holes = '';
    for (let i = 0; i < 3; i++) { const a = r() * 6.28, d = r() * 0.5; holes += `<circle cx="${x + s * d * Math.cos(a)}" cy="${y + s * 0.8 * d * Math.sin(a)}" r="${s * 0.12}" fill="${C.hole}"/>`; }
    return `<polygon points="${kgBlob(x, y, s, s * 0.8, seed || 1, 0.16, 20, rot || 0)}" fill="${C.cheese}" stroke="${C.cheeseD}" stroke-width="${sw}"/>${holes}`;
  }
  if (kind === 'sausage') {
    const dots = [[-0.35, -0.3, 0.16], [0.3, -0.2, 0.14], [0, 0.35, 0.17], [-0.4, 0.25, 0.12], [0.4, 0.35, 0.11], [0.05, -0.1, 0.1]]
      .map(([dx, dy, q]) => `<circle cx="${x + s * dx}" cy="${y + s * dy}" r="${s * q}" fill="${C.sausDot}"/>`).join('');
    return `<circle cx="${x}" cy="${y}" r="${s}" fill="${C.saus}" stroke="${C.sausD}" stroke-width="${sw}"/><circle cx="${x}" cy="${y}" r="${s * 0.82}" fill="none" stroke="${C.sausRing}" stroke-width="${sw * 0.45}"/>${dots}`;
  }
  if (kind === 'olive') {
    return `<circle cx="${x}" cy="${y}" r="${s}" fill="${C.olive}" stroke="${C.plum}" stroke-width="${sw}"/>
      <path d="M${x - s * 0.72 * Math.cos(-1.3)},${y - s * 0.72 * Math.sin(-1.3)} A${s * 0.72},${s * 0.72} 0 0 0 ${x - s * 0.72 * Math.cos(1.3)},${y - s * 0.72 * Math.sin(1.3)}" fill="none" stroke="${C.oliveHi}" stroke-width="${sw * 0.6}"/>
      <circle cx="${x}" cy="${y}" r="${s * 0.4}" fill="#fff" stroke="${C.plum}" stroke-width="${sw * 0.6}"/>`;
  }
  if (kind === 'chicken') {
    let lines = '';
    for (let i = 0; i < 6; i++) {
      const a = (r() - 0.5) * 0.8 + (rot || 0), ox = (r() - 0.5) * 0.4 * s * 2, oy = (r() - 0.5) * 0.4 * s, L = s * 0.34;
      lines += `<line x1="${x + ox - L * Math.cos(a)}" y1="${y + oy - L * Math.sin(a)}" x2="${x + ox + L * Math.cos(a)}" y2="${y + oy + L * Math.sin(a)}" stroke="${C.chkLine}" stroke-width="${sw * 0.6}"/>`;
    }
    return `<polygon points="${kgBlob(x, y, s, s * 0.6, seed || 1, 0.18, 20, rot || 0)}" fill="${C.chk}" stroke="${C.chkD}" stroke-width="${sw}"/>${lines}`;
  }
  if (kind === 'onion') {
    return `<circle cx="${x}" cy="${y}" r="${s}" fill="${C.oni}" stroke="${C.oniD}" stroke-width="${sw}"/><circle cx="${x}" cy="${y}" r="${s * 0.8}" fill="none" stroke="${C.oniRing}" stroke-width="${sw * 0.5}"/><circle cx="${x}" cy="${y}" r="${s * 0.62}" fill="#fff" stroke="${C.oniD}" stroke-width="${sw * 0.7}"/>`;
  }
  if (kind === 'oregano') {   // a few little green leaves
    let leaves = '';
    for (let i = 0; i < 4; i++) {
      const a = r() * 6.28, d = r() * s * 0.8, ang = r() * 180;
      leaves += `<ellipse cx="${x + d * Math.cos(a)}" cy="${y + d * Math.sin(a)}" rx="${s * 0.34}" ry="${s * 0.17}" transform="rotate(${ang} ${x + d * Math.cos(a)} ${y + d * Math.sin(a)})" fill="${C.leaf}" stroke="${C.leafD}" stroke-width="${sw * 0.5}"/>`;
    }
    return leaves;
  }
  return '';
}
const kgSaucePath = (cx, cy, rad, seed) => {
  const C = KG_PZ_C;
  const swirl = [[0.62, 0.3], [0.38, 2.0], [0.78, 3.6]].map(([rr, a0]) => `<path d="M${Array.from({ length: 11 }, (_, q) => `${(cx + rad * rr * Math.cos(a0 + q * 0.16)).toFixed(1)},${(cy + rad * rr * Math.sin(a0 + q * 0.16)).toFixed(1)}`).join(' L')}" fill="none" stroke="${C.swirl}" stroke-width="${rad * 0.035}" stroke-linecap="round"/>`).join('');
  const dots = [[0.3, -0.35], [-0.4, 0.2], [0.1, 0.5], [-0.15, -0.55]].map(([dx, dy]) => `<circle cx="${cx + rad * dx}" cy="${cy + rad * dy}" r="${rad * 0.045}" fill="${C.redDot}"/>`).join('');
  return `<polygon points="${kgBlob(cx, cy, rad, rad, seed || 1, 0.025, 60, 0)}" fill="${C.red}" stroke="${C.redD}" stroke-width="${rad * 0.02}"/>${swirl}${dots}`;
};
const kgDoughPath = (cx, cy, rad) => {
  const C = KG_PZ_C, r = kgRand(3);
  let dots = '';
  for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = r() * rad * 0.8; dots += `<circle cx="${cx + d * Math.cos(a)}" cy="${cy + d * Math.sin(a)}" r="${rad * 0.012}" fill="${C.dot}"/>`; }
  return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${C.crust}" stroke="${C.plum}" stroke-width="${rad * 0.025}"/><circle cx="${cx}" cy="${cy}" r="${rad * 0.84}" fill="${C.dough}" stroke="${C.crustD}" stroke-width="${rad * 0.015}"/>${dots}`;
};
// The icon of each ingredient, like the workshop's cards (100 x 100).
function kgIngIcon(id, cls) {
  const C = KG_PZ_C;
  const inner = {
    dough: `${kgDoughPath(50, 46, 34)}<rect x="12" y="80" width="76" height="9" rx="4.5" fill="#B5814A" stroke="${C.plum}" stroke-width="1.2"/>`,
    sauce: `<path d="M18,40 H82 L74,84 H26Z" fill="#f3f3f1" stroke="${C.plum}" stroke-width="2"/><ellipse cx="50" cy="40" rx="32" ry="8" fill="${C.red}" stroke="${C.redD}" stroke-width="1.5"/><circle cx="80" cy="66" r="13" fill="${C.red}" stroke="${C.redD}" stroke-width="1.5"/><path d="M80,53 l-5,-5 m5,5 l5,-6 m-5,6 l0,-7" stroke="${C.leaf}" stroke-width="3" stroke-linecap="round"/>`,
    cheese: `<path d="M10,40 L62,20 L90,44 V78 H10Z" fill="${C.cheese}" stroke="${C.cheeseD}" stroke-width="2.4" stroke-linejoin="round"/><path d="M10,40 L62,20 L90,44 Z" fill="#FFF0A8" stroke="${C.cheeseD}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="34" cy="58" r="6" fill="${C.hole}"/><circle cx="62" cy="52" r="5" fill="${C.hole}"/><circle cx="74" cy="68" r="4" fill="${C.hole}"/>`,
    sausage: `<rect x="10" y="14" width="56" height="16" rx="8" fill="${C.saus}" stroke="${C.sausD}" stroke-width="2"/>${kgPiece('sausage', 30, 60, 18, 1)}${kgPiece('sausage', 62, 70, 18, 2)}${kgPiece('sausage', 76, 46, 16, 3)}`,
    olive: `${kgPiece('olive', 30, 40, 18, 1)}${kgPiece('olive', 66, 34, 18, 2)}${kgPiece('olive', 48, 70, 18, 3)}`,
    chicken: `${kgPiece('chicken', 34, 34, 22, 4, -0.2)}${kgPiece('chicken', 66, 52, 22, 7, 0.3)}${kgPiece('chicken', 38, 72, 20, 9, 0.1)}`,
    onion: `${kgPiece('onion', 36, 60, 26, 1)}${kgPiece('onion', 70, 36, 18, 2)}${kgPiece('onion', 74, 74, 13, 3)}`,
    oregano: `<path d="M50,90 L50,14" stroke="${C.leafD}" stroke-width="3" stroke-linecap="round"/>${[22, 34, 46, 58, 70].map((y, i) => `<ellipse cx="${i % 2 ? 62 : 38}" cy="${y}" rx="13" ry="6.5" transform="rotate(${i % 2 ? -30 : 30} ${i % 2 ? 62 : 38} ${y})" fill="${C.leaf}" stroke="${C.leafD}" stroke-width="1.6"/>`).join('')}<ellipse cx="50" cy="12" rx="6.5" ry="12" fill="${C.leaf}" stroke="${C.leafD}" stroke-width="1.6"/>`,
    oven: `<rect x="10" y="14" width="80" height="72" rx="10" fill="#8E6D86" stroke="${C.plum}" stroke-width="3"/><rect x="20" y="30" width="60" height="44" rx="6" fill="${C.plum}"/><circle cx="50" cy="52" r="15" fill="${C.crust}"/><circle cx="50" cy="52" r="11" fill="${C.red}"/><circle cx="24" cy="22" r="3.5" fill="#F05D77"/><circle cx="34" cy="22" r="3.5" fill="#FAEFC2"/>`,
  }[id] || '';
  return `<svg class="${cls || ''}" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
}

// The ingredients. `say` is how the order and the voice name them; `count`
// ingredients are counted in an order ("two olives"); a tap adds `per` pieces.
const KG_PZ_INGS = [
  { id: 'dough', en: 'pizza dough', pt: 'massa', layer: true },
  { id: 'sauce', en: 'tomato sauce', pt: 'molho de tomate', layer: true },
  { id: 'cheese', en: 'cheese', pt: 'queijo', per: 8, size: 15 },
  { id: 'sausage', en: 'sausage', pt: 'calabresa', count: true, one: 'slice of sausage', many: 'slices of sausage', per: 1, size: 12 },
  { id: 'olive', en: 'olives', pt: 'azeitonas', count: true, one: 'olive', many: 'olives', per: 1, size: 7 },
  { id: 'chicken', en: 'shredded chicken', pt: 'frango desfiado', per: 4, size: 12 },
  { id: 'onion', en: 'onion rings', pt: 'cebola em rodelas', count: true, one: 'onion ring', many: 'onion rings', per: 1, size: 10 },
  { id: 'oregano', en: 'oregano', pt: 'orégano', per: 5, size: 9 },
];
const kgPzIng = id => KG_PZ_INGS.find(i => i.id === id);
// The workshop's steps, word for word.
const KG_PZ_STEPS = [
  { id: 'dough', say: 'Take the pizza dough.' },
  { id: 'sauce', say: 'Spread the tomato sauce.' },
  { id: 'cheese', say: 'Put on the cheese.' },
  { id: 'sausage', say: 'Add the sausage.' },
  { id: 'olive', say: 'Put a little bit of olives.' },
  { id: 'chicken', say: 'Add the shredded chicken.' },
  { id: 'onion', say: 'Put the onion rings on top.' },
  { id: 'oregano', say: 'Sprinkle the oregano!' },
  { id: 'oven', say: 'Time to bake! Into the oven!' },
];
const KG_CUSTOMERS = ['👧', '🧒', '👦', '👩', '👨', '👵', '👴'];

function openShopGame() {
  const win = kgOpen('🍕', 'Pizza Shop', "Let's make a pizza! 🍕");
  let mode = null, step = 0, stars = 0, round = 0, tries = 0, order = null, customer = '👧';
  let pizza = { dough: false, sauce: false, pieces: [] };     // pieces: [{ kind, x, y, seed, rot }]
  let pieceSeed = 1;
  const ROUNDS = 5;
  const count = id => pizza.pieces.filter(p => p.kind === id).length;
  const has = id => (id === 'dough' ? pizza.dough : id === 'sauce' ? pizza.sauce : count(id) > 0);

  // Somewhere on the sauce, not right on top of the last pieces.
  function spot(size) {
    let best = null;
    for (let k = 0; k < 14; k++) {
      const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * (60 - size * 0.6);
      const p = { x: 100 + d * Math.cos(a), y: 100 + d * Math.sin(a) };
      const near = Math.min(99, ...pizza.pieces.slice(-12).map(q => Math.hypot(q.x - p.x, q.y - p.y)));
      if (!best || near > best.near) best = { ...p, near };
      if (near > size * 1.6) break;
    }
    return best;
  }
  function addPieces(id, n) {
    const ing = kgPzIng(id);
    for (let i = 0; i < n; i++) { const p = spot(ing.size); pizza.pieces.push({ kind: id, x: p.x, y: p.y, seed: pieceSeed++, rot: Math.random() * 3 }); }
  }
  function pizzaSVG(cls, hot) {
    const order = ['cheese', 'chicken', 'sausage', 'onion', 'olive', 'oregano'];
    const pieces = pizza.pieces.slice().sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
    return `<svg class="${cls}" viewBox="0 0 200 200" aria-hidden="true">
      ${pizza.dough ? kgDoughPath(100, 100, 92) : '<circle cx="100" cy="100" r="92" fill="#f7f3ee" stroke="#d9cfc7" stroke-width="2" stroke-dasharray="6 6"/>'}
      ${pizza.sauce ? kgSaucePath(100, 100, 72, 1) : ''}
      ${pieces.map(p => `<g data-off="${pizza.pieces.indexOf(p)}" class="pz-piece">${kgPiece(p.kind, p.x, p.y, kgPzIng(p.kind).size, p.seed, p.rot)}</g>`).join('')}
      ${hot ? '<g class="pz-steam"><path d="M70,40 q-8,-12 0,-24 M100,34 q-8,-12 0,-24 M130,40 q-8,-12 0,-24" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/></g>' : ''}
    </svg>`;
  }
  const shelf = ids => `<div class="pz-shelf">${ids.map(id => `<button type="button" class="pz-ing" data-ing="${id}" aria-label="${id === 'oven' ? 'oven' : kgPzIng(id).en}">${kgIngIcon(id, 'pz-ing-svg')}<small>${id === 'oven' ? 'oven' : igEscapeHtml(kgPzIng(id).en)}</small></button>`).join('')}</div>`;

  // ---- the menu ---------------------------------------------------------------
  function menu() {
    const m = win.el(); if (!m) return;
    mode = null;
    m.innerHTML = `
      <div class="pz-menu">
        <button type="button" class="pz-mode" data-mode="recipe">${kgIngIcon('oven', 'pz-mode-svg')}<b>🧑‍🍳 Let's make a pizza!</b><small>Os passos da oficina, um por um</small></button>
        <button type="button" class="pz-mode" data-mode="shop">${kgIngIcon('cheese', 'pz-mode-svg')}<b>🛎️ Pizza Shop</b><small>Monte a pizza do pedido do cliente</small></button>
      </div>`;
    m.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => (b.dataset.mode === 'recipe' ? startRecipe() : startShop())));
  }

  // ---- 🧑‍🍳 the workshop's steps ------------------------------------------------
  function startRecipe() { mode = 'recipe'; step = 0; stars = 0; tries = 0; pizza = { dough: false, sauce: false, pieces: [] }; paintRecipe(); kgSay(KG_PZ_STEPS[0].say); }
  function paintRecipe(hot) {
    const m = win.el(); if (!m) return;
    const s = KG_PZ_STEPS[step];
    m.innerHTML = `
      <div class="pz">
        <div class="pz-steps">${KG_PZ_STEPS.map((x, i) => `<i class="${i < step ? 'done' : i === step ? 'now' : ''}">${i + 1}</i>`).join('')}</div>
        ${s ? `<button type="button" class="pz-step" data-hear>🔊 <b>${step + 1}.</b> ${igEscapeHtml(s.say)}</button>` : ''}
        <div class="pz-pizza${hot ? ' baking' : ''}" data-pizza>${pizzaSVG('pz-base', hot)}</div>
        ${s ? shelf(KG_PZ_INGS.map(i => i.id).concat('oven')) : ''}
      </div>`;
    const h = m.querySelector('[data-hear]'); if (h) h.addEventListener('click', () => kgSay(s.say));
    m.querySelectorAll('[data-ing]').forEach(b => b.addEventListener('click', () => recipeTap(b.dataset.ing, b)));
  }
  function recipeTap(id, btn) {
    const s = KG_PZ_STEPS[step];
    if (!s) return;
    if (id !== s.id) {
      tries++;
      kgSfx('wrong');
      btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 500);
      kgSay(`Not yet! ${s.say}`);
      return;
    }
    if (tries === 0) stars++;
    tries = 0;
    kgSfx('pop');
    if (id === 'dough') pizza.dough = true;
    else if (id === 'sauce') pizza.sauce = true;
    else if (id === 'oven') { bake(); return; }
    else addPieces(id, { cheese: 8, sausage: 6, olive: 5, chicken: 6, onion: 5, oregano: 7 }[id]);
    step++;
    paintRecipe();
    kgSay(KG_PZ_STEPS[step].say);
  }
  // 9. Into the oven… 10. Ding! It's ready! My pizza is…
  function bake() {
    step = KG_PZ_STEPS.length;
    const m = win.el(); if (!m) return;
    m.innerHTML = `
      <div class="pz">
        <div class="pz-oven">${kgIngIcon('oven', 'pz-oven-svg')}</div>
        <p class="pz-step">🔥 Baking… <small>Assando…</small></p>
      </div>`;
    kgSay('Time to bake! Into the oven!');
    setTimeout(() => {
      const m2 = win.el(); if (!m2) return;
      kgSfx('bell');
      m2.innerHTML = `
        <div class="pz">
          <p class="pz-ding">🔔 Ding! It's ready!</p>
          <div class="pz-pizza served">${pizzaSVG('pz-base', true)}</div>
          <p class="pz-step">My pizza is… <small>(escolha uma)</small></p>
          <div class="pz-words">${['yummy', 'delicious', 'hot', 'amazing'].map(w => `<button type="button" class="pz-word" data-word="${w}">${w}</button>`).join('')}</div>
        </div>`;
      kgSay("Ding! It's ready! My pizza is…");
      m2.querySelectorAll('[data-word]').forEach(b => b.addEventListener('click', () => {
        kgSay(`My pizza is ${b.dataset.word}! Yummy! Enjoy your pizza!`, { then: () => { const m3 = win.el(); if (m3) kgDone(m3, Math.min(5, Math.round(stars / 9 * 5)), 5, startRecipe); } });
        b.classList.add('on');
      }));
    }, 2600);
  }

  // ---- 🛎️ the customer's order --------------------------------------------------
  function startShop() { mode = 'shop'; round = 0; stars = 0; nextOrder(); }
  function phraseFor(o) { return o.ing.count ? `${KG_NUM[o.n]} ${o.n === 1 ? o.ing.one : o.ing.many}` : o.ing.en; }
  const orderText = () => {
    const parts = order.map(phraseFor);
    return `I want a pizza with ${parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]}, please!`;
  };
  function nextOrder() {
    const m = win.el(); if (!m) return;
    if (round >= ROUNDS) { kgDone(m, stars, ROUNDS, startShop); return; }
    const counted = kgShuffle(KG_PZ_INGS.filter(i => i.count)).slice(0, round < 2 ? 1 : 2);
    order = counted.map(ing => ({ ing, n: 1 + Math.floor(Math.random() * (round < 1 ? 2 : 3)) }));
    kgShuffle(['cheese', 'chicken', 'oregano']).slice(0, 1 + Math.floor(Math.random() * 2)).forEach(id => order.push({ ing: kgPzIng(id), n: 1 }));
    order.sort((a, b) => KG_PZ_INGS.indexOf(a.ing) - KG_PZ_INGS.indexOf(b.ing));
    customer = kgPick(KG_CUSTOMERS); tries = 0;
    pizza = { dough: true, sauce: true, pieces: [] };       // the shop already has the base ready
    paintShop();
    kgSay(`Hello! ${orderText()}`);
  }
  function paintShop() {
    const m = win.el(); if (!m) return;
    m.innerHTML = `
      ${kgStarsRow(stars, ROUNDS)}
      <div class="pz">
        <div class="pz-customer">
          ${kgEmoji(customer, 'pz-face')}
          <button type="button" class="pz-bubble" data-hear title="Listen again">
            ${order.map(o => `<span class="pz-want">${Array.from({ length: o.ing.count ? o.n : 1 }, () => kgIngIcon(o.ing.id, 'pz-want-svg')).join('')}</span>`).join('<span class="pz-plus">+</span>')}
            <span class="pz-ear">🔊</span>
          </button>
        </div>
        <div class="pz-pizza" data-pizza>${pizzaSVG('pz-base')}</div>
        ${shelf(KG_PZ_INGS.filter(i => !i.layer).map(i => i.id))}
        <div class="an-done-actions">
          <button type="button" class="game-btn secondary" data-clear>🧽</button>
          <button type="button" class="btn btn-primary" data-serve>✅ Here you are!</button>
        </div>
        <p class="pr-teacher-line">${igEscapeHtml(orderText())}</p>
      </div>`;
    m.querySelector('[data-hear]').addEventListener('click', () => kgSay(orderText()));
    m.querySelectorAll('[data-ing]').forEach(b => b.addEventListener('click', () => shopAdd(b.dataset.ing)));
    m.querySelectorAll('[data-off]').forEach(g => g.addEventListener('click', () => { const i = Number(g.dataset.off); const k = pizza.pieces[i].kind; if (kgPzIng(k).count) pizza.pieces.splice(i, 1); else pizza.pieces = pizza.pieces.filter(p => p.kind !== k); kgSfx('drop'); paintShop(); }));
    m.querySelector('[data-clear]').addEventListener('click', () => { pizza.pieces = []; paintShop(); });
    m.querySelector('[data-serve]').addEventListener('click', serve);
  }
  function shopAdd(id) {
    const ing = kgPzIng(id);
    if (!ing.count && has(id)) return;                       // cheese, chicken, oregano: once is enough
    if (pizza.pieces.length > 40) return;
    addPieces(id, ing.per);
    kgSfx('pop');
    kgSay(ing.count ? `${KG_NUM[count(id)]} ${count(id) === 1 ? ing.one : ing.many}` : ing.en);
    paintShop();
  }
  function serve() {
    const ok = KG_PZ_INGS.filter(i => !i.layer).every(ing => {
      const want = order.find(o => o.ing.id === ing.id);
      return ing.count ? (want ? want.n : 0) === count(ing.id) : Boolean(want) === has(ing.id);
    });
    if (ok) {
      if (tries === 0) stars++;
      round++;
      kgSfx('correct');
      const pz = win.el() && win.el().querySelector('.pz-pizza');
      if (pz) pz.classList.add('served');
      kgSay('Thank you! Yummy!', { then: nextOrder });
    } else {
      tries++;
      kgSfx('wrong');
      const pz = win.el() && win.el().querySelector('.pz-pizza');
      if (pz) { pz.classList.add('shake'); setTimeout(() => pz.classList.remove('shake'), 500); }
      kgSay(`Hmm, no. ${orderText()}`);
    }
  }
  menu();
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

// Real recordings for the animals and things (sounds/*.mp3, from Wikimedia
// Commons — authors and licences below; CC BY / BY-SA ask for the credit,
// shown under the game). [seconds to play]: long ones stop early, gently.
const KG_SOUND_REC = { cow: 4, dog: 3, cat: 2, duck: 3.5, sheep: 3, rooster: 4.5, lion: 4.5, car: 3.5, train: 3.5, phone: 4.5, doorbell: 4.2, clock: 4 };
const KG_SOUND_CREDITS = [
  { id: 'cow', who: "MichaeltheFox8621", license: 'CC BY-SA 4.0', file: "Single Cow Moo.ogg" },
  { id: 'dog', who: "Amada44", license: 'CC BY-SA 3.0', file: "Barking of a dog.ogg" },
  { id: 'cat', who: "freemaster2", license: 'CC0', file: "Meow of a Siamese cat - freemaster2.wav" },
  { id: 'duck', who: "Jonathon Jongsma", license: 'CC BY-SA 3.0', file: "Anas platyrhynchos - Mallard XC62258.mp3" },
  { id: 'sheep', who: "earthcalling", license: 'Public domain', file: "Sheep bleating.ogg" },
  { id: 'rooster', who: "alys", license: 'Public domain', file: "Small rooster crowing.ogg" },
  { id: 'lion', who: "த*உழவன்", license: 'Public domain', file: "Lion raring-sound1TamilNadu178.ogg" },
  { id: 'car', who: "15HPanska_Ruttner_Jan", license: 'CC0', file: "Car Horn.wav" },
  { id: 'train', who: "Alex Alex Lep", license: 'Public domain', file: "Parovoz sound.ogg" },
  { id: 'phone', who: "CianMcCann", license: 'CC BY-SA 3.0', file: "Model 500 Telephone British ring.ogg" },
  { id: 'doorbell', who: "Are shyde", license: 'CC BY 4.0', file: "Doorbell.wav" },
  { id: 'clock', who: "Dub", license: 'CC BY-SA 3.0', file: "Alarmclock-mechanical.ogg" },
];
const KG_SOUND_AUDIO = {};
let kgSoundNow = null;
function kgStopRecording() {
  if (!kgSoundNow) return;
  const { a, t, f } = kgSoundNow;
  clearTimeout(t); clearInterval(f);
  try { a.pause(); a.currentTime = 0; } catch (e) { /* ignore */ }
  kgSoundNow = null;
}
// Play a recording for up to `max` seconds (fading out), or the old
// synthesised sound if the file cannot play.
function kgPlayRecording(id, max, fallback) {
  kgStopRecording();
  if (typeof IGSound !== 'undefined' && IGSound.muted && IGSound.muted()) return;
  let a = KG_SOUND_AUDIO[id];
  if (!a) { a = new Audio(`sounds/${id}.mp3`); a.preload = 'auto'; KG_SOUND_AUDIO[id] = a; }
  a.volume = 1;
  try { a.currentTime = 0; } catch (e) { /* ignore */ }
  const now = { a, t: 0, f: 0 };
  kgSoundNow = now;
  now.t = setTimeout(() => {            // the last 0.4 s fade away
    now.f = setInterval(() => { a.volume = Math.max(0, a.volume - 0.1); if (a.volume <= 0.05) kgStopRecording(); }, 40);
  }, Math.max(300, max * 1000 - 400));
  const p = a.play();
  if (p && p.catch) p.catch(() => { kgSoundNow = null; try { fallback(); } catch (e) { /* ignore */ } });
}
KG_SOUNDS.forEach(s => {
  if (!KG_SOUND_REC[s.id]) return;
  const synth = s.play;
  s.play = () => kgPlayRecording(s.id, KG_SOUND_REC[s.id], synth);
});

function openSoundGame() {
  const win = kgOpen('🔊', 'Sound Detective', 'Listen… what is it?');
  Object.keys(KG_SOUND_REC).forEach(id => { if (!KG_SOUND_AUDIO[id]) { const a = new Audio(`sounds/${id}.mp3`); a.preload = 'auto'; KG_SOUND_AUDIO[id] = a; } });
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
      </div>
      <details class="sd-credits"><summary>ℹ️ Sounds</summary>
        <p>Recordings from Wikimedia Commons: ${KG_SOUND_CREDITS.map(c => `${igEscapeHtml(c.id)} — ${igEscapeHtml(c.who)} (${igEscapeHtml(c.license)})`).join(' · ')}.</p>
      </details>`;
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
