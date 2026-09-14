/* ==========================================================================
   IGenglishschool — Live Teacher Toolbar
   Wheel of Fortune · Live Scoreboard · Visual Timer & Bell · Sticker Book
   ========================================================================== */

const LiveTools = (() => {
  const CHALLENGES = [
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
    const size = canvas.width;
    const radius = size / 2;
    const n = CHALLENGES.length;
    const slice = (Math.PI * 2) / n;

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
      ctx2d.font = 'bold 12px Inter, sans-serif';
      const words = CHALLENGES[i].split(' ');
      let line = '';
      const lines = [];
      words.forEach(w => {
        if ((line + w).length > 16) { lines.push(line); line = w + ' '; }
        else line += w + ' ';
      });
      lines.push(line);
      lines.forEach((l, li) => ctx2d.fillText(l.trim(), radius - 14, (li - (lines.length - 1) / 2) * 13));
      ctx2d.restore();
    }
    ctx2d.restore();
  }

  function renderWheel(container) {
    container.innerHTML = `
      <div class="wheel-stage">
        <div class="wheel-pointer">▼</div>
        <canvas id="wheelCanvas" width="280" height="280"></canvas>
      </div>
      <div class="game-btn-row" style="justify-content:center;margin-top:18px">
        <button class="game-btn" id="spinWheelBtn">🎡 Spin!</button>
      </div>
      <div class="game-end-banner win" id="wheelResult" hidden></div>
    `;
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
          const n = CHALLENGES.length;
          const slice = (Math.PI * 2) / n;
          // The pointer sits at the TOP of the wheel (3π/2 in canvas angles,
          // where 0 is 3 o'clock). Reading the slice from angle 0 announced a
          // challenge a quarter-turn away from the one actually under the ▼.
          const POINTER_ANGLE = Math.PI * 1.5;
          const normalized = (((POINTER_ANGLE - rotation) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const index = Math.floor(normalized / slice) % n;
          banner.hidden = false;
          banner.innerHTML = `🎯 Your challenge: <p>${CHALLENGES[index]}</p>`;
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
    const activeId = getActiveStudentId();
    const student = students.find(s => s.id === activeId) || students[0];

    function paint() {
      const progress = loadProgress(student.id);
      container.innerHTML = `
        <div class="scoreboard-student" style="--accent-color:${student.color}">
          <span class="student-card-avatar" style="background:${student.color}">${student.avatar}</span>
          <div>
            <strong>${igEscapeHtml(student.name)}</strong>
            <span class="scoreboard-stars">⭐ ${progress.stars} stars</span>
          </div>
        </div>
        <div class="scoreboard-btn-row">
          <button class="game-btn secondary" data-delta="-1">−1 ⭐</button>
          <button class="game-btn" data-delta="1">+1 ⭐</button>
          <button class="game-btn" data-delta="5">+5 ⭐</button>
        </div>
      `;
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
    const activeId = getActiveStudentId();
    container.innerHTML = renderStickerBookHTML(activeId);
  }

  // -------------------------------------------------------------------------
  // MOUNT — each tool opens inside the shared modal
  // -------------------------------------------------------------------------
  const TOOL_META = {
    wheel: { title: '🎡 Wheel of Fortune', render: renderWheel },
    scoreboard: { title: '🏅 Live Scoreboard', render: renderScoreboard },
    timer: { title: '⏱️ Timer & Bell', render: renderTimer },
    stickers: { title: '📔 Sticker Book', render: renderStickers },
  };

  function openTool(toolId) {
    const meta = TOOL_META[toolId];
    if (!meta) return;
    openModal(`
      <div class="modal-content-pad">
        <h3 id="modalTitle">${meta.title}</h3>
        <div id="liveToolMount"></div>
      </div>
    `);
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
