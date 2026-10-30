/* ==========================================================================
   IGenglishschool — 🧑‍🎨 My avatar
   The child builds their own character: who (a child in several skin
   tones, or an animal), a background colour, a hat and glasses. It shows
   at the top of their page and is "⭐ Me" in Maze Muncher and Jump & Learn.

   Where it lives: on the child's device (localStorage), and it travels to
   the teacher with the child's progress (share.js) into `student_looks`,
   so in class — with that student chosen — the games show it too.
   A look: { base: '🦊', bg: '#ffd166', hat: '👑' | '', glasses: '🕶️' | '' }
   ========================================================================== */

const MYAV_BASES = ['👧', '👦', '🧒', '👧🏻', '👦🏻', '👧🏽', '👦🏽', '👧🏾', '👦🏾', '👧🏿', '👦🏿',
  '🐱', '🐶', '🦊', '🐼', '🐯', '🦁', '🐰', '🐻', '🐨', '🐸', '🐵', '🐧', '🐢', '🤖'];
const MYAV_COLORS = ['#ffd166', '#ffadad', '#bde0fe', '#caffbf', '#e0c3fc', '#ffc6ff', '#fdffb6', '#9bf6ff', '#ffffff'];
const MYAV_HATS = ['', '👑', '🎩', '🧢', '🎓', '👒', '🎀', '🪖', '⛑️', '🌸'];
const MYAV_GLASSES = ['', '🕶️', '👓', '🥽'];
const MYAV_STORE_KEY = 'student_looks';        // teacher side: studentId -> look

function myavGet(studentId) {
  if (!studentId) return null;
  try {
    const all = typeof IGStore !== 'undefined' ? IGStore.getJSON(MYAV_STORE_KEY, {}) : {};
    if (all && all[studentId] && all[studentId].base) return all[studentId];
  } catch (e) { /* ignore */ }
  try { const l = JSON.parse(localStorage.getItem('ig_look_' + studentId) || 'null'); if (l && l.base) return l; } catch (e) { /* private mode */ }
  return null;
}
function myavSet(studentId, look) {
  try { localStorage.setItem('ig_look_' + studentId, JSON.stringify(look)); } catch (e) { /* private mode */ }
  if (typeof IGStore !== 'undefined') {
    const all = IGStore.getJSON(MYAV_STORE_KEY, {}) || {};
    all[studentId] = look;
    IGStore.setJSON(MYAV_STORE_KEY, all);
  }
}
// The student whose look the games may use: the active one (the teacher's
// chosen student in class, or the child on their own link).
const myavCurrent = () => myavGet(typeof getActiveStudentId === 'function' ? getActiveStudentId() : null);

const myavImg = (e, cls) => (typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML(e, cls) : `<span class="${cls}">${e}</span>`);
function myavHTML(look, cls) {
  if (!look) return '';
  return `<span class="myav ${cls || ''}" style="--myav-bg:${look.bg || '#ffd166'}">
    ${myavImg(look.base, 'myav-base')}
    ${look.glasses ? myavImg(look.glasses, 'myav-glasses') : ''}
    ${look.hat ? myavImg(look.hat, 'myav-hat') : ''}
  </span>`;
}

// On a game canvas: centred at (cx, cy), `size` wide; `flip` mirrors it.
const MYAV_IMAGES = {};
function myavImage(e) {
  if (!e) return null;
  if (!MYAV_IMAGES[e]) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    if (typeof IG_TWEMOJI_BASE !== 'undefined' && typeof igEmojiCode === 'function') img.src = `${IG_TWEMOJI_BASE}${igEmojiCode(e)}.svg`;
    MYAV_IMAGES[e] = img;
  }
  return MYAV_IMAGES[e];
}
function myavPreload(look) { if (look) [look.base, look.hat, look.glasses].forEach(myavImage); }
function myavDraw(ctx, look, cx, cy, size, flip) {
  if (!look) return;
  const ok = img => img && img.complete && img.naturalWidth;
  ctx.save();
  ctx.translate(cx, cy);
  if (flip) ctx.scale(-1, 1);
  ctx.beginPath(); ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = look.bg || '#ffd166'; ctx.fill();
  ctx.lineWidth = Math.max(1.5, size * 0.04); ctx.strokeStyle = '#2e2b2e'; ctx.stroke();
  const base = myavImage(look.base);
  if (ok(base)) ctx.drawImage(base, -size * 0.4, -size * 0.36, size * 0.8, size * 0.8);
  const gl = look.glasses && myavImage(look.glasses);
  if (ok(gl)) ctx.drawImage(gl, -size * 0.3, -size * 0.18, size * 0.6, size * 0.6);
  const hat = look.hat && myavImage(look.hat);
  if (ok(hat)) ctx.drawImage(hat, -size * 0.3, -size * 0.78, size * 0.6, size * 0.6);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// THE BUILDER
// ---------------------------------------------------------------------------
function openAvatarBuilder(studentId, onSave) {
  const look = { base: '🧒', bg: '#ffd166', hat: '', glasses: '', ...(myavGet(studentId) || {}) };
  const say = t => { try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = 0.9; window.speechSynthesis.speak(u); } catch (e) { /* no voice */ } };
  openModal(`
    <div class="modal-content-pad myav-builder">
      <h3 id="modalTitle">🧑‍🎨 My avatar</h3>
      <div id="myavMount"></div>
    </div>`, true);
  const paint = () => {
    const m = document.getElementById('myavMount'); if (!m) return;
    const row = (title, list, key, render) => `
      <p class="myav-row-title">${title}</p>
      <div class="myav-row">${list.map(v => `<button type="button" class="myav-opt${look[key] === v ? ' on' : ''}" data-k="${key}" data-v="${v}">${render(v)}</button>`).join('')}</div>`;
    m.innerHTML = `
      <div class="myav-preview">${myavHTML(look, 'myav--big')}</div>
      ${row('Who are you?', MYAV_BASES, 'base', v => myavImg(v, 'myav-opt-img'))}
      ${row('Color', MYAV_COLORS, 'bg', v => `<i class="myav-swatch" style="background:${v}"></i>`)}
      ${row('Hat', MYAV_HATS, 'hat', v => (v ? myavImg(v, 'myav-opt-img') : '🚫'))}
      ${row('Glasses', MYAV_GLASSES, 'glasses', v => (v ? myavImg(v, 'myav-opt-img') : '🚫'))}
      <div class="an-done-actions"><button type="button" class="btn btn-primary" data-save>✅ This is me!</button></div>`;
    m.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
      look[b.dataset.k] = b.dataset.v;
      if (typeof IGSound !== 'undefined') IGSound.pop && IGSound.pop();
      paint();
    }));
    m.querySelector('[data-save]').addEventListener('click', () => {
      myavSet(studentId, { base: look.base, bg: look.bg, hat: look.hat, glasses: look.glasses });
      if (typeof IGSound !== 'undefined') IGSound.win && IGSound.win();
      say('Looking good!');
      closeModal();
      if (typeof onSave === 'function') onSave();
    });
  };
  paint();
}
