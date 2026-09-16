/* ==========================================================================
   IGenglishschool — Live Teacher Toolbar
   Wheel of Fortune · Live Scoreboard · Visual Timer & Bell · Sticker Book
   ========================================================================== */

/* ==========================================================================
   CANVA SLIDES — one deck per student
   --------------------------------------------------------------------------
   Deliberately OUTSIDE the LiveTools closure: the Live Class Cockpit
   (sessions.js) shows the same link for the active student, and both need to
   read and write the same place. Stored in its own IGStore key, so it syncs
   to Supabase with everything else.
   ========================================================================== */
const CANVA_KEY = 'canva_slides';

function canvaLinks() {
  const raw = IGStore.getJSON(CANVA_KEY, null);
  return (raw && typeof raw === 'object') ? raw : {};
}
function canvaLinkFor(studentId) { return String(canvaLinks()[studentId] || '').trim(); }
function saveCanvaLink(studentId, url) {
  const all = canvaLinks();
  const clean = String(url || '').trim();
  if (clean) all[studentId] = clean; else delete all[studentId];
  IGStore.setJSON(CANVA_KEY, all);
}

// Only http(s) gets through. A pasted `javascript:` URL would run in the page
// the moment it was clicked, and this field ends up in a shared Supabase row —
// so the check is a real one, not politeness.
function canvaIsValidUrl(value) {
  const v = String(value || '').trim();
  if (!v) return true;                          // empty just means "no deck yet"
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) { return false; }
}

// Open a deck, and actually open it.
//
// A bare `<a target="_blank">` is the obvious way to do this and it is what
// this started as — but a blocked popup, an in-app browser or a webview
// swallows that click silently: no error, no new tab, nothing happens. So try
// a real window.open, and when it comes back null (which is exactly what a
// blocked popup returns) fall back to navigating this tab. Leaving the school
// site is a worse outcome than a new tab, but it is a far better outcome than
// a button that does nothing.
function openCanvaLink(url) {
  const clean = String(url || '').trim();
  if (!clean || !canvaIsValidUrl(clean)) return false;
  let win = null;
  try { win = window.open(clean, '_blank', 'noopener,noreferrer'); } catch (e) { win = null; }
  if (!win) window.location.href = clean;
  return true;
}

const LiveTools = (() => {
  // Shipped starting point. The live list is whatever the teacher saved —
  // see wheelChallenges() — so these are only the defaults.
  const DEFAULT_CHALLENGES = [
    'Name 3 green animals',
    'Make a sentence using the Simple Past',
    'Spell the word CAT',
    'Say 3 colors in English',
    'Count from 1 to 10',
    'Name an animal that flies',
    'Ask a question with "Do you like...?"',
    "Describe today's weather in English",
    'Name 3 family members',
    'Give another word for "happy"',
  ];

  const WHEEL_KEY = 'wheel_challenges';
  const WHEEL_MIN = 2;
  // Past ~16 slices the labels stop being readable on the wheel.
  const WHEEL_MAX = 16;

  function wheelChallenges() {
    const saved = IGStore.getJSON(WHEEL_KEY, null);
    if (Array.isArray(saved) && saved.length >= WHEEL_MIN) return saved.slice(0, WHEEL_MAX);
    return DEFAULT_CHALLENGES;
  }
  function saveWheelChallenges(list) { IGStore.setJSON(WHEEL_KEY, list); }
  function resetWheelChallenges() { IGStore.remove(WHEEL_KEY); }
  function wheelIsCustom() { return Array.isArray(IGStore.getJSON(WHEEL_KEY, null)); }
  const WHEEL_COLORS = ['#f05d77', '#b8953a', '#a9b4a4', '#8e6d86', '#c9435c', '#6f7d68', '#f05d77', '#b8953a', '#a9b4a4', '#8e6d86'];

  let activeTimers = [];
  let wheelAnimId = null;
  function track(id) { activeTimers.push(id); return id; }
  function clearTimers() { activeTimers.forEach(id => { clearInterval(id); clearTimeout(id); }); activeTimers = []; }
  function stopAll() {
    clearTimers();
    if (wheelAnimId) { cancelAnimationFrame(wheelAnimId); wheelAnimId = null; }
  }

  // Small local audio helper (bell + confetti), consistent with the other modules.
  let audioCtx = null;
  function ctx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function tone(freq, start, duration, type = 'sine', gain = 0.16) {
    const c = ctx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(c.destination);
    osc.start(c.currentTime + start);
    g.gain.setValueAtTime(gain, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration);
    osc.stop(c.currentTime + start + duration);
  }
  function playBell() { try { tone(880, 0, 0.3); tone(1175, 0.15, 0.45); } catch (e) {} }
  function playTick() { try { tone(440, 0, 0.05, 'square', 0.05); } catch (e) {} }

  const CONFETTI_COLORS = ['#f05d77', '#b8953a', '#a9b4a4', '#8e6d86', '#c9435c'];
  function confettiBurst(x, y) {
    for (let i = 0; i < 24; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 90;
      el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      el.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      el.style.setProperty('--rot', `${Math.random() * 360}deg`);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }
  }

  // -------------------------------------------------------------------------
  // WHEEL OF FORTUNE
  // -------------------------------------------------------------------------
  function drawWheel(canvas, rotation) {
    const ctx2d = canvas.getContext('2d');
    const challenges = wheelChallenges();
    const size = canvas.width;
    const radius = size / 2;
    const n = challenges.length;
    const slice = (Math.PI * 2) / n;
    // Fewer slices can afford bigger type; a full wheel needs smaller.
    const fontPx = Math.max(8, Math.min(14, Math.round(130 / n) + 4));
    const lineH = fontPx + 1;
    const maxChars = Math.max(10, Math.round(22 - n * 0.4));

    ctx2d.clearRect(0, 0, size, size);
    ctx2d.save();
    ctx2d.translate(radius, radius);
    ctx2d.rotate(rotation);

    for (let i = 0; i < n; i++) {
      ctx2d.beginPath();
      ctx2d.moveTo(0, 0);
      ctx2d.arc(0, 0, radius - 4, i * slice, (i + 1) * slice);
      ctx2d.closePath();
      ctx2d.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx2d.fill();

      ctx2d.save();
      ctx2d.rotate(i * slice + slice / 2);
      ctx2d.textAlign = 'right';
      ctx2d.fillStyle = '#fff';
      ctx2d.font = 'bold ' + fontPx + 'px Inter, sans-serif';
      const words = String(challenges[i]).split(' ');
      let line = '';
      const lines = [];
      words.forEach(w => {
        if ((line + w).length > maxChars) { lines.push(line); line = w + ' '; }
        else line += w + ' ';
      });
      lines.push(line);
      lines.forEach((l, li) => ctx2d.fillText(l.trim(), radius - 14, (li - (lines.length - 1) / 2) * lineH));
      ctx2d.restore();
    }
    ctx2d.restore();
  }

  function renderWheel(container) {
    container.innerHTML = `
      <p class="lt-count-note">${wheelChallenges().length} challenges${wheelIsCustom() ? ' · your own list' : ''}</p>
      <div class="wheel-stage">
        <div class="wheel-pointer">▼</div>
        <canvas id="wheelCanvas" width="280" height="280"></canvas>
      </div>
      <div class="game-btn-row" style="justify-content:center;margin-top:18px">
        <button class="game-btn" id="spinWheelBtn">🎡 Spin!</button>
        <button class="game-btn secondary" id="editWheelBtn">✏️ Edit challenges</button>
      </div>
      <div class="game-end-banner win" id="wheelResult" hidden></div>
    `;

    document.getElementById('editWheelBtn').addEventListener('click', () => editWheel(container));
    const canvas = document.getElementById('wheelCanvas');
    let rotation = 0;
    drawWheel(canvas, rotation);

    document.getElementById('spinWheelBtn').addEventListener('click', () => {
      const banner = document.getElementById('wheelResult');
      banner.hidden = true;
      const spins = 5 + Math.random() * 3;
      const finalRotation = rotation + spins * Math.PI * 2;
      const duration = 3200;
      const start = performance.now();
      const from = rotation;

      function animate(now) {
        if (!canvas.isConnected) { wheelAnimId = null; return; }
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        rotation = from + (finalRotation - from) * eased;
        drawWheel(canvas, rotation);
        if (t < 1) {
          wheelAnimId = requestAnimationFrame(animate);
        } else {
          wheelAnimId = null;
          const challenges = wheelChallenges();
          const n = challenges.length;
          const slice = (Math.PI * 2) / n;
          // The pointer sits at the TOP of the wheel (3π/2 in canvas angles,
          // where 0 is 3 o'clock). Reading the slice from angle 0 announced a
          // challenge a quarter-turn away from the one actually under the ▼.
          const POINTER_ANGLE = Math.PI * 1.5;
          const normalized = (((POINTER_ANGLE - rotation) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const index = Math.floor(normalized / slice) % n;
          banner.hidden = false;
          banner.innerHTML = `🎯 Your challenge: <p>${igEscapeHtml(challenges[index])}</p>`;
          const rect = canvas.getBoundingClientRect();
          confettiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
      }
      wheelAnimId = requestAnimationFrame(animate);
    });
  }

  // -------------------------------------------------------------------------
  // LIVE SCOREBOARD (ties into the active student's star progress)
  // -------------------------------------------------------------------------
  function renderScoreboard(container) {
    const students = loadStudents();
    // Start on the active student, but let the teacher correct ANY student's
    // total without switching the whole app over to them first.
    let studentId = getActiveStudentId() || (students[0] && students[0].id);

    function paint() {
      const student = students.find(s => s.id === studentId) || students[0];
      if (!student) { container.innerHTML = '<p class="lt-count-note">No students yet.</p>'; return; }
      studentId = student.id;
      const progress = loadProgress(student.id);

      container.innerHTML = `
        <div class="gm-form-field">
          <label for="sbStudent">Student</label>
          <select id="sbStudent">
            ${students.map(st => `<option value="${igEscapeHtml(st.id)}" ${st.id === student.id ? 'selected' : ''}>${igEscapeHtml(st.name)} — ${igEscapeHtml(st.levelLabel || '')}</option>`).join('')}
          </select>
        </div>

        <div class="scoreboard-student" style="--accent-color:${student.color}">
          <span class="student-card-avatar" style="background:${student.color}">${student.avatar}</span>
          <div>
            <strong>${igEscapeHtml(student.name)}</strong>
            <span class="scoreboard-stars">⭐ ${progress.stars} stars</span>
          </div>
        </div>

        <div class="scoreboard-btn-row">
          <button class="game-btn secondary" data-delta="-5">−5 ⭐</button>
          <button class="game-btn secondary" data-delta="-1">−1 ⭐</button>
          <button class="game-btn" data-delta="1">+1 ⭐</button>
          <button class="game-btn" data-delta="5">+5 ⭐</button>
        </div>

        <div class="scoreboard-set-row">
          <label for="sbExact">Set the exact total</label>
          <div class="scoreboard-set-controls">
            <input type="number" id="sbExact" min="0" step="1" value="${progress.stars}" />
            <button class="game-btn" id="sbApply">Save</button>
          </div>
          <p class="lt-count-note">Stickers already unlocked stay unlocked, even if the total goes down.</p>
        </div>
      `;

      container.querySelector('#sbStudent').addEventListener('change', (e) => {
        studentId = e.target.value;
        paint();
      });

      container.querySelectorAll('[data-delta]').forEach(btn => {
        btn.addEventListener('click', () => {
          addStars(student.id, Number(btn.dataset.delta));
          if (Number(btn.dataset.delta) > 0) {
            const rect = btn.getBoundingClientRect();
            confettiBurst(rect.left + rect.width / 2, rect.top);
          }
          refreshHeaderForActiveStudent();
          paint();
        });
      });

      const exact = container.querySelector('#sbExact');
      const apply = () => {
        setStars(student.id, exact.value);
        refreshHeaderForActiveStudent();
        paint();
      };
      container.querySelector('#sbApply').addEventListener('click', apply);
      exact.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
    }
    paint();
  }

  // -------------------------------------------------------------------------
  // VISUAL TIMER & BELL
  // -------------------------------------------------------------------------
  function renderTimer(container) {
    const presets = [10, 15, 30, 60, 120, 300];
    let remaining = 0;
    let running = false;
    let intervalId = null;

    function format(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    let finished = false;

    function paint() {
      container.innerHTML = `
        <div class="timer-presets">
          ${presets.map(p => `<button class="game-btn secondary" data-preset="${p}">${p < 60 ? p + 's' : (p / 60) + 'm'}</button>`).join('')}
        </div>
        <div class="timer-display ${running ? 'running' : ''} ${finished ? 'finished' : ''}" id="timerDisplay">${finished ? "Time's Up! 🔔" : format(remaining)}</div>
        <div class="game-btn-row" style="justify-content:center">
          <button class="game-btn" id="timerStartBtn" ${remaining === 0 ? 'disabled' : ''}>${running ? '⏸ Pause' : '▶ Start'}</button>
          <button class="game-btn secondary" id="timerResetBtn">🔄 Reset</button>
        </div>
      `;
      container.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          clearInterval(intervalId);
          running = false;
          finished = false;
          remaining = Number(btn.dataset.preset);
          paint();
        });
      });
      document.getElementById('timerStartBtn').addEventListener('click', () => {
        if (remaining === 0) return;
        running = !running;
        if (running) {
          finished = false;
          intervalId = track(setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
              remaining = 0;
              running = false;
              finished = true;
              clearInterval(intervalId);
              playBell();
            }
            // paint() runs last and reads `finished`, so the bell message is
            // no longer written and then immediately overwritten with 00:00.
            paint();
          }, 1000));
        } else {
          clearInterval(intervalId);
        }
        paint();
      });
      document.getElementById('timerResetBtn').addEventListener('click', () => {
        clearInterval(intervalId);
        running = false;
        finished = false;
        remaining = 0;
        paint();
      });
    }
    paint();
  }

  // -------------------------------------------------------------------------
  // STICKER BOOK (reuses students.js's renderStickerBookHTML)
  // -------------------------------------------------------------------------
  function renderStickers(container) {
    const students = loadStudents();
    let studentId = getActiveStudentId() || (students[0] && students[0].id);

    function paint() {
      container.innerHTML = `
        <div class="gm-form-field">
          <label for="stStudent">Student</label>
          <select id="stStudent">
            ${students.map(st => `<option value="${igEscapeHtml(st.id)}" ${st.id === studentId ? 'selected' : ''}>${igEscapeHtml(st.name)}</option>`).join('')}
          </select>
        </div>
        ${stickerBookIsPersonal(studentId)
          ? '<p class="sticker-scope">🎨 Álbum personalizado deste aluno</p>'
          : '<p class="sticker-scope sticker-scope--shared">Álbum padrão — igual para todos os alunos</p>'}
        ${renderStickerBookHTML(studentId)}
        <div class="game-btn-row" style="justify-content:center;margin-top:14px">
          <button class="game-btn secondary" id="editStickersBtn">✏️ Edit stickers</button>
        </div>
      `;
      container.querySelector('#stStudent').addEventListener('change', (e) => { studentId = e.target.value; paint(); });
      container.querySelector('#editStickersBtn').addEventListener('click', () => editStickers(container, paint, studentId));
    }
    paint();
  }

  // -------------------------------------------------------------------------
  // EDITORS — the teacher's own challenges and stickers
  // -------------------------------------------------------------------------
  function editWheel(container) {
    let list = wheelChallenges().slice();

    function paint() {
      container.innerHTML = `
        <p class="lt-editor-intro">One challenge per row. They appear on the wheel exactly as written.</p>
        <div class="lt-rows" id="wheelRows"></div>
        <div class="game-btn-row" style="margin-top:10px">
          <button class="game-btn secondary" id="wheelAdd" type="button">+ Add challenge</button>
          <button class="game-btn secondary" id="wheelRestore" type="button">↺ Restore the original list</button>
        </div>
        <p class="gm-form-error" id="wheelErr" hidden></p>
        <div class="game-btn-row" style="margin-top:16px">
          <button class="btn btn-primary" id="wheelSave" type="button">💾 Save</button>
          <button class="game-btn secondary" id="wheelCancel" type="button">Cancel</button>
        </div>
      `;

      const rows = container.querySelector('#wheelRows');
      rows.innerHTML = list.map((text, i) => `
        <div class="lt-row" data-i="${i}">
          <span class="lt-row-num">${i + 1}</span>
          <input type="text" class="gm-input" value="${igEscapeHtml(text)}" placeholder="Name 3 animals" />
          <button class="gm-remove-row" data-remove="${i}" type="button" aria-label="Remove">✕</button>
        </div>
      `).join('');

      rows.querySelectorAll('.lt-row').forEach(row => {
        const i = Number(row.dataset.i);
        row.querySelector('input').addEventListener('input', (e) => { list[i] = e.target.value; });
      });
      rows.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => { list.splice(Number(btn.dataset.remove), 1); paint(); });
      });

      container.querySelector('#wheelAdd').addEventListener('click', () => {
        if (list.length >= WHEEL_MAX) {
          showError(`The wheel fits ${WHEEL_MAX} challenges — any more and the labels stop being readable.`);
          return;
        }
        list.push('');
        paint();
      });
      container.querySelector('#wheelRestore').addEventListener('click', () => {
        if (!confirm('Restore the original 10 challenges? Your own list will be lost.')) return;
        resetWheelChallenges();
        renderWheel(container);
      });
      container.querySelector('#wheelCancel').addEventListener('click', () => renderWheel(container));
      container.querySelector('#wheelSave').addEventListener('click', () => {
        const clean = list.map(t => String(t || '').trim()).filter(Boolean);
        if (clean.length < WHEEL_MIN) return showError(`Keep at least ${WHEEL_MIN} challenges.`);
        saveWheelChallenges(clean);
        renderWheel(container);
      });

      function showError(msg) {
        const el = container.querySelector('#wheelErr');
        el.textContent = msg;
        el.hidden = false;
      }
    }
    paint();
  }

  // `studentId` is who the teacher was looking at. The editor can write that
  // one child's book or the shared one, and the toggle at the top says which —
  // personalising Arthur's cars must never silently change Jasmine's book.
  function editStickers(container, done, studentId) {
    const students = loadStudents();
    const student = students.find(st => st.id === studentId);
    let scope = studentId ? 'student' : 'shared';
    let list = getStickers(scope === 'student' ? studentId : null).map(st => ({ ...st }));

    function targetId() { return scope === 'student' ? studentId : null; }

    function paint() {
      container.innerHTML = `
        ${student ? `
          <div class="sticker-scope-picker">
            <button class="sticker-scope-btn ${scope === 'student' ? 'on' : ''}" type="button" data-scope="student">
              🎨 Só para ${igEscapeHtml(student.name)}
            </button>
            <button class="sticker-scope-btn ${scope === 'shared' ? 'on' : ''}" type="button" data-scope="shared">
              👥 Para todos os alunos
            </button>
          </div>
        ` : ''}
        <p class="lt-editor-intro">${scope === 'student'
          ? `Monte o álbum de <strong>${igEscapeHtml(student.name)}</strong> com os personagens que ele gosta —
             troque o emoji, cole o link de uma imagem, renomeie a figurinha ou mude quantas estrelas ela custa.`
          : 'Este é o álbum padrão, usado por todos os alunos que ainda não têm um próprio.'}
          Deixe a foto em branco para usar o emoji.</p>
        <div class="lt-sticker-head"><span></span><span>Name</span><span>Emoji</span><span>Photo URL</span><span>Stars</span><span></span></div>
        <div class="lt-rows" id="stickerRows"></div>
        <div class="game-btn-row" style="margin-top:10px">
          <button class="game-btn secondary" id="stickerAdd" type="button">+ Add sticker</button>
          <button class="game-btn secondary" id="stickerRestore" type="button">${scope === 'student' ? '↺ Voltar ao álbum padrão' : '↺ Restaurar as figurinhas originais'}</button>
        </div>
        <p class="gm-form-error" id="stickerErr" hidden></p>
        <div class="game-btn-row" style="margin-top:16px">
          <button class="btn btn-primary" id="stickerSave" type="button">💾 Save</button>
          <button class="game-btn secondary" id="stickerCancel" type="button">Cancel</button>
        </div>
      `;

      const rows = container.querySelector('#stickerRows');
      rows.innerHTML = list.map((st, i) => `
        <div class="lt-sticker-row" data-i="${i}">
          <span class="lt-sticker-preview">${igWordVisualHTML({ en: st.name, emoji: st.emoji, image: st.image || '' }, 'sticker-visual')}</span>
          <input type="text" class="gm-input" data-f="name" value="${igEscapeHtml(st.name)}" placeholder="Champion" />
          <input type="text" class="gm-input gm-input-emoji" data-f="emoji" value="${igEscapeHtml(st.emoji || '')}" placeholder="🏆" />
          <input type="text" class="gm-input" data-f="image" value="${igEscapeHtml(st.image || '')}" placeholder="https://… (optional)" />
          <input type="number" class="gm-input" data-f="threshold" min="0" step="1" value="${Number(st.threshold) || 0}" />
          <button class="gm-remove-row" data-remove="${i}" type="button" aria-label="Remove">✕</button>
        </div>
      `).join('');

      rows.querySelectorAll('.lt-sticker-row').forEach(row => {
        const i = Number(row.dataset.i);
        row.querySelectorAll('[data-f]').forEach(input => {
          input.addEventListener('input', () => { list[i][input.dataset.f] = input.value; });
          input.addEventListener('change', () => {
            // Same forgiveness as the Game Maker: an emoji pasted into the
            // photo box is treated as the emoji, not a broken image.
            const fixed = igNormalizeWord({ en: list[i].name, emoji: list[i].emoji, image: list[i].image || '' });
            list[i].emoji = fixed.emoji;
            list[i].image = fixed.image;
            paint();
          });
        });
      });
      rows.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => { list.splice(Number(btn.dataset.remove), 1); paint(); });
      });

      container.querySelector('#stickerAdd').addEventListener('click', () => {
        const highest = list.reduce((m, st) => Math.max(m, Number(st.threshold) || 0), 0);
        list.push({ id: 'st' + Math.random().toString(36).slice(2, 9), name: 'New sticker', emoji: '🌟', image: '', threshold: highest + 20 });
        paint();
      });
      container.querySelectorAll('[data-scope]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.scope === scope) return;
          scope = btn.dataset.scope;
          // Reload from the layer now being edited, so switching does not
          // carry one book's rows into the other.
          list = getStickers(targetId()).map(st => ({ ...st }));
          paint();
        });
      });

      container.querySelector('#stickerRestore').addEventListener('click', () => {
        const msg = scope === 'student'
          ? `Voltar ${student ? student.name : 'este aluno'} para o álbum padrão? As figurinhas personalizadas dele serão perdidas.`
          : 'Restaurar as figurinhas originais? Todas as suas mudanças serão perdidas.';
        if (!confirm(msg)) return;
        resetStickers(targetId());
        if (done) done();
      });
      container.querySelector('#stickerCancel').addEventListener('click', () => { if (done) done(); });
      container.querySelector('#stickerSave').addEventListener('click', () => {
        const clean = list
          .map(st => {
            const fixed = igNormalizeWord({ en: st.name, emoji: st.emoji, image: st.image || '' });
            return {
              id: st.id,
              name: String(st.name || '').trim() || 'Sticker',
              emoji: String(fixed.emoji || '').trim() || '🌟',
              image: String(fixed.image || '').trim(),
              threshold: Math.max(0, Math.round(Number(st.threshold) || 0)),
            };
          });
        if (clean.length === 0) return showError('Keep at least one sticker.');

        // What this layer records is the difference from the layer UNDERNEATH
        // it: for a student that is the shared book, for the shared book it is
        // what the app ships. Diffing against DEFAULT_STICKERS either way would
        // make a student's book silently re-add stickers the teacher had
        // already removed for everyone.
        const base = scope === 'student' ? getStickers(null) : DEFAULT_STICKERS;
        const baseIds = new Set(base.map(d => d.id));
        const next = { patches: {}, added: [], deleted: [] };
        clean.forEach(st => {
          if (baseIds.has(st.id)) next.patches[st.id] = st;
          else next.added.push(st);
        });
        base.forEach(d => { if (!clean.some(st => st.id === d.id)) next.deleted.push(d.id); });

        saveStickerOverrides(next, targetId());
        if (done) done();
      });

      function showError(msg) {
        const el = container.querySelector('#stickerErr');
        el.textContent = msg;
        el.hidden = false;
      }
    }
    paint();
  }

  // The store lives at the top of this file, outside the closure — the Live
  // Class Cockpit shows the same link and has to reach it too.
  function renderCanva(container) {
    let editing = false;

    function paint() {
      const students = loadStudents();
      const withLink = students.filter(s => canvaLinkFor(s.id)).length;

      container.innerHTML = editing ? `
        <p class="lt-editor-intro">Cole o link de compartilhamento do Canva de cada aluno.
          No Canva: <strong>Compartilhar → Copiar link</strong>. Deixe em branco para remover.</p>
        <div class="canva-rows">
          ${students.map(s => `
            <div class="canva-row" data-student="${igEscapeHtml(s.id)}">
              <span class="canva-avatar" style="background:${igEscapeHtml(s.color || '#8e6d86')}22">${igEscapeHtml(s.avatar || '🙂')}</span>
              <div class="canva-who">
                <strong>${igEscapeHtml(s.name)}</strong>
                <span>${igEscapeHtml(s.levelLabel || '')}</span>
              </div>
              <input class="gm-input canva-input" type="url" inputmode="url"
                     placeholder="https://www.canva.com/design/…"
                     value="${igEscapeHtml(canvaLinkFor(s.id))}" />
            </div>
          `).join('')}
        </div>
        <p class="gm-form-error" id="canvaErr" hidden></p>
        <div class="game-btn-row" style="margin-top:16px">
          <button class="btn btn-primary" id="canvaSave" type="button">💾 Salvar</button>
          <button class="game-btn secondary" id="canvaCancel" type="button">Cancelar</button>
        </div>
      ` : `
        <p class="lt-count-note">${withLink} de ${students.length} alunos com slides</p>
        <div class="canva-grid">
          ${students.map(s => {
            const url = canvaLinkFor(s.id);
            return `
              <div class="canva-card ${url ? '' : 'is-empty'}" style="--who:${igEscapeHtml(s.color || '#8e6d86')}">
                <span class="canva-card-avatar">${igEscapeHtml(s.avatar || '🙂')}</span>
                <span class="canva-card-name">${igEscapeHtml(s.name)}</span>
                ${url
                  ? `<a class="canva-open" href="${igEscapeHtml(url)}" target="_blank" rel="noopener noreferrer" data-open="${igEscapeHtml(s.id)}">🎨 Abrir slides</a>`
                  : `<span class="canva-missing">sem link</span>`}
              </div>
            `;
          }).join('')}
        </div>
        <div class="game-btn-row" style="justify-content:center;margin-top:16px">
          <button class="game-btn secondary" id="canvaEdit" type="button">✏️ Editar links</button>
        </div>
      `;

      if (editing) {
        container.querySelector('#canvaCancel').addEventListener('click', () => { editing = false; paint(); });
        container.querySelector('#canvaSave').addEventListener('click', () => {
          const rows = [...container.querySelectorAll('.canva-row')];
          const bad = rows.find(r => !canvaIsValidUrl(r.querySelector('.canva-input').value));
          const err = container.querySelector('#canvaErr');
          if (bad) {
            err.textContent = 'Esse link não parece um endereço válido. Ele precisa começar com https://';
            err.hidden = false;
            bad.querySelector('.canva-input').focus();
            return;
          }
          rows.forEach(r => saveCanvaLink(r.dataset.student, r.querySelector('.canva-input').value));
          editing = false;
          paint();
        });
      } else {
        container.querySelector('#canvaEdit').addEventListener('click', () => { editing = true; paint(); });
        // The href stays for middle-click and "copy link address"; this
        // handler is what makes a normal click reliable when the browser
        // silently refuses to honour target="_blank".
        container.querySelectorAll('[data-open]').forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            openCanvaLink(canvaLinkFor(link.dataset.open));
          });
        });
      }
    }

    paint();
  }

  // -------------------------------------------------------------------------
  // MOUNT — each tool opens inside the shared modal
  // -------------------------------------------------------------------------
  const TOOL_META = {
    wheel: { title: '🎡 Wheel of Fortune', render: renderWheel },
    scoreboard: { title: '🏅 Live Scoreboard', render: renderScoreboard },
    timer: { title: '⏱️ Timer & Bell', render: renderTimer },
    stickers: { title: '📔 Sticker Book', render: renderStickers },
    canva: { title: '🎨 Canva Slides', render: renderCanva },
  };

  function openTool(toolId) {
    const meta = TOOL_META[toolId];
    if (!meta) return;
    // Wide frame: the Wheel and Sticker editors lay out in columns, and the
    // Scoreboard now lists every student.
    openModal(`
      <div class="modal-content-pad">
        <div class="modal-head">
          <span class="modal-head-thumb modal-head-thumb--icon">${meta.title.split(' ')[0]}</span>
          <div class="modal-head-text">
            <h3 id="modalTitle">${meta.title.replace(/^\S+\s/, '')}</h3>
            <p class="modal-head-sub"><span class="modal-head-desc">Live Class Tools</span></p>
          </div>
        </div>
        <div id="liveToolMount"></div>
      </div>
    `, true);
    meta.render(document.getElementById('liveToolMount'));
  }

  function initFab() {
    const fab = document.getElementById('liveToolbarFab');
    const panel = document.getElementById('liveToolbarPanel');
    const toolbar = document.getElementById('liveToolbar');
    if (!fab) return;

    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = toolbar.classList.toggle('open');
      fab.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', (e) => {
      if (!toolbar.contains(e.target)) toolbar.classList.remove('open');
    });
    panel.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        toolbar.classList.remove('open');
        openTool(btn.dataset.tool);
      });
    });
  }

  return { initFab, stopAll, openTool };
})();
