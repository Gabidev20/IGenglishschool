/* ==========================================================================
   IGenglishschool — Live Lesson Cockpit, Session Logger & Quarterly Reports
   ========================================================================== */

function lsShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// SESSION PERSISTENCE
// ---------------------------------------------------------------------------
function sessionKey(studentId) { return `sessions_${studentId}`; }
function currentSessionKey(studentId) { return `currentSession_${studentId}`; }

function loadSessions(studentId) {
  const list = IGStore.getJSON(sessionKey(studentId), []);
  return Array.isArray(list) ? list : [];
}
function saveSessions(studentId, list) {
  IGStore.setJSON(sessionKey(studentId), list);
}

function loadCurrentSessionAccumulator(studentId) {
  try { return IGStore.getJSON(currentSessionKey(studentId), null) || { xp: 0, stars: 0 }; }
  catch (e) { return { xp: 0, stars: 0 }; }
}
function saveCurrentSessionAccumulator(studentId, acc) {
  IGStore.setJSON(currentSessionKey(studentId), acc);
}
function resetCurrentSessionAccumulator(studentId) {
  IGStore.remove(currentSessionKey(studentId));
}

// Called by students.js whenever a student's score moves — a game win, a
// practice round, or the Live Scoreboard's +/- buttons and exact-total box.
// "Today's Class" therefore always reflects what actually happened in the
// lesson, without any manual bookkeeping.
function recordSessionProgress(studentId, xp, stars) {
  const acc = loadCurrentSessionAccumulator(studentId);
  acc.xp += xp;
  acc.stars += stars;
  saveCurrentSessionAccumulator(studentId, acc);
  refreshSessionDrawerScoreIfOpen();
}

// ---------------------------------------------------------------------------
// LIVE LESSON COCKPIT — routine bar (songs for young learners, warm-up
// chit-chat for older students) + quick access to the drawer and reports.
// ---------------------------------------------------------------------------
const ROUTINE_SONGS = {
  hello: {
    title: 'Hello Song',
    youtubeId: 'tVlcKp3bWH8',
    blurb: "A cheerful call-and-response song where kids wave, clap and greet each other in fun new ways — perfect for kicking the lesson off with energy.",
  },
  byebye: {
    title: 'Bye Bye Goodbye Song',
    youtubeId: 'PraN5ZoSjiY',
    blurb: "An upbeat closing song that helps kids wind down and say goodbye in English through a happy, memorable routine.",
  },
};

const WARMUP_QUESTIONS = [
  'What was the highlight of your week?',
  'If you could travel anywhere right now, where would you go?',
  "What's a movie or show you've watched recently?",
  'If you could have any superpower, what would it be?',
  "What's your favorite way to spend a weekend?",
  'Tell me about something that made you laugh this week.',
  'If you could learn any new skill instantly, what would it be?',
  "What's a goal you're working on right now?",
  'Would you rather live in the mountains or by the beach? Why?',
  "What's the best meal you've eaten recently?",
];
let warmupDeck = [];
function drawWarmupQuestion() {
  if (warmupDeck.length === 0) warmupDeck = lsShuffle(WARMUP_QUESTIONS);
  return warmupDeck.shift();
}

function refreshLiveClassCockpit() {
  const root = document.getElementById('liveClassCockpit');
  if (!root) return;
  const student = getActiveStudent();
  const young = isYoungLearner(student);

  root.innerHTML = `
    <div class="cockpit-student-card" style="--accent-color:${student.color}">
      <span class="cockpit-avatar" style="background:${student.color}">${student.avatar}</span>
      <div class="cockpit-student-info">
        <h3>${escapeHtmlLite(student.name)}</h3>
        <p>${student.age} yrs · ${escapeHtmlLite(student.levelLabel)}</p>
      </div>
    </div>

    <div class="routine-bar">
      ${young ? `
        <p class="routine-label">🎵 Routine Songs</p>
        <div class="routine-songs-row">
          <button class="routine-song-btn" data-song="hello">👋 Hello Song</button>
          <button class="routine-song-btn" data-song="byebye">👋 Bye Bye Song</button>
        </div>
      ` : `
        <div class="warmup-card">
          <p class="routine-label">💬 Warm-up · Daily Chit-Chat <span class="warmup-timer-hint">~2 min</span></p>
          <p class="warmup-question" id="warmupQuestion">${drawWarmupQuestion()}</p>
          <button class="game-btn secondary" id="newWarmupBtn">🔄 New Question</button>
        </div>
      `}
    </div>

    <div class="cockpit-actions">
      <button class="btn btn-primary" id="openSessionDrawerBtn">📋 Today's Class</button>
      <button class="btn btn-ghost" id="openReportsBtn">📊 Reports &amp; Progress</button>
    </div>

    <div class="cockpit-links" id="cockpitLinks"></div>
  `;

  if (young) {
    root.querySelectorAll('.routine-song-btn').forEach(btn => {
      btn.addEventListener('click', () => openRoutineSongModal(btn.dataset.song));
    });
  } else {
    document.getElementById('newWarmupBtn').addEventListener('click', () => {
      document.getElementById('warmupQuestion').textContent = drawWarmupQuestion();
    });
  }

  document.getElementById('openSessionDrawerBtn').addEventListener('click', openSessionDrawer);
  document.getElementById('openReportsBtn').addEventListener('click', openReportsModal);
  renderCockpitLinks(student);
}

// ---------------------------------------------------------------------------
// CLASS LINKS on the cockpit — the deck and the Zoom room for the student on
// screen right now, each one click away and each pasteable in place. The full
// per-student table still lives in the 🧰 Live Class Tools panel.
// ---------------------------------------------------------------------------
function renderCockpitLinks(student) {
  const root = document.getElementById('cockpitLinks');
  if (!root || !student) return;
  let editingKind = null;

  function paint() {
    const kinds = Object.keys(CLASS_LINK_KINDS);

    root.innerHTML = editingKind ? (() => {
      const meta = CLASS_LINK_KINDS[editingKind];
      return `
        <div class="cockpit-link-edit">
          <label for="cockpitLinkInput">${meta.icon} ${escapeHtmlLite(meta.label)} — ${escapeHtmlLite(student.name)}</label>
          <div class="cockpit-link-fields">
            <input type="url" id="cockpitLinkInput" inputmode="url"
                   placeholder="${escapeAttrLite(meta.placeholder)}"
                   value="${escapeAttrLite(classLinkFor(editingKind, student.id))}" />
            <button class="game-btn" id="cockpitLinkSave" type="button">💾 Salvar</button>
            <button class="game-btn secondary" id="cockpitLinkCancel" type="button">Cancelar</button>
          </div>
          <p class="cockpit-link-hint">${meta.hint} Deixe em branco para remover.</p>
          <p class="gm-form-error" id="cockpitLinkErr" hidden></p>
        </div>
      `;
    })() : `
      <div class="cockpit-links-row">
        ${kinds.map(k => {
          const meta = CLASS_LINK_KINDS[k];
          const url = classLinkFor(k, student.id);
          return `
            <div class="cockpit-link">
              ${url
                ? `<button class="btn btn-link-${k}" data-open="${k}" type="button">${meta.icon} ${escapeHtmlLite(meta.label)}</button>`
                : `<button class="btn btn-ghost" data-add="${k}" type="button">${meta.icon} Adicionar ${escapeHtmlLite(meta.label)}</button>`}
              ${url ? `<button class="cockpit-link-edit-btn" data-edit="${k}" type="button"
                               aria-label="Trocar o link ${escapeAttrLite(meta.label)}" title="Trocar o link">✏️</button>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    if (editingKind) {
      const input = root.querySelector('#cockpitLinkInput');
      const save = () => {
        const value = input.value.trim();
        const err = root.querySelector('#cockpitLinkErr');
        if (!isValidLinkUrl(value)) {
          err.textContent = 'Esse link não parece um endereço válido. Ele precisa começar com https://';
          err.hidden = false;
          input.focus();
          return;
        }
        saveClassLink(editingKind, student.id, value);
        editingKind = null;
        paint();
      };
      root.querySelector('#cockpitLinkSave').addEventListener('click', save);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
      root.querySelector('#cockpitLinkCancel').addEventListener('click', () => { editingKind = null; paint(); });
      input.focus();
    } else {
      root.querySelectorAll('[data-open]').forEach(btn => {
        btn.addEventListener('click', () => openClassLink(classLinkFor(btn.dataset.open, student.id)));
      });
      root.querySelectorAll('[data-add], [data-edit]').forEach(btn => {
        btn.addEventListener('click', () => { editingKind = btn.dataset.add || btn.dataset.edit; paint(); });
      });
    }
  }

  paint();
}

function openRoutineSongModal(songId) {
  const song = ROUTINE_SONGS[songId];
  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">👋 ${song.title}</h3>
      <div class="video-embed-wrap">
        <iframe src="https://www.youtube-nocookie.com/embed/${song.youtubeId}?rel=0"
                title="${song.title}" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen></iframe>
      </div>
      <p class="song-blurb">${song.blurb}</p>
      <p class="song-note">🎶 Sing along with the on-screen lyrics in the video!</p>
    </div>
  `);
}

// ---------------------------------------------------------------------------
// "TODAY'S CLASS" DRAWER — attendance, date, topic, notes, auto-tallied score
// ---------------------------------------------------------------------------
let drawerAttendance = 'present';

function openSessionDrawer() {
  drawerAttendance = 'present';
  document.getElementById('sessionDrawer').classList.add('open');
  paintSessionDrawer();
}
function closeSessionDrawer() {
  document.getElementById('sessionDrawer').classList.remove('open');
}

function paintSessionDrawer() {
  const student = getActiveStudent();
  const body = document.getElementById('sessionDrawerBody');
  if (!body) return;
  const acc = loadCurrentSessionAccumulator(student.id);
  const todayStr = new Date().toISOString().slice(0, 10);

  const topicOptionsHTML = LEVELS.map(level => `
    <optgroup label="${level.code} · ${level.name}">
      ${level.topics.map(t => `<option value="${level.id}:${t.id}">${t.title}</option>`).join('')}
    </optgroup>
  `).join('');

  body.innerHTML = `
    <div class="session-student-line" style="--accent-color:${student.color}">
      <span class="student-card-avatar" style="background:${student.color}">${student.avatar}</span>
      <strong>${escapeHtmlLite(student.name)}</strong>
    </div>

    <div class="gm-form-field">
      <label>Attendance</label>
      <div class="attendance-toggle">
        <button class="attendance-btn present ${drawerAttendance === 'present' ? 'active' : ''}" data-att="present">✅ Present</button>
        <button class="attendance-btn absent ${drawerAttendance === 'absent' ? 'active' : ''}" data-att="absent">❌ Absent</button>
      </div>
    </div>

    <div class="gm-form-field">
      <label for="sessionDate">Class date</label>
      <input type="date" id="sessionDate" value="${todayStr}" />
    </div>

    <div class="gm-form-field">
      <label for="sessionTopic">Content worked on</label>
      <select id="sessionTopic">
        <option value="">— Select a topic —</option>
        ${topicOptionsHTML}
      </select>
    </div>

    <div class="gm-form-field">
      <label for="sessionNotes">Teacher's notes</label>
      <textarea id="sessionNotes" rows="4" placeholder="e.g. Great pronunciation of /p/ and /t/ sounds, practiced Simple Past regular verbs..."></textarea>
    </div>

    <div class="session-score-summary">
      <span>⭐ Session score</span>
      <strong>${acc.xp} XP · ${acc.stars} stars</strong>
    </div>

    <button class="btn btn-primary" id="saveSessionBtn" style="width:100%">💾 Save Class Session</button>

    <div class="session-history" id="sessionHistoryList"></div>
  `;

  // Toggling attendance updates just the two buttons — a full repaint here
  // would wipe out notes/topic the teacher already typed.
  body.querySelectorAll('.attendance-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      drawerAttendance = btn.dataset.att;
      body.querySelectorAll('.attendance-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('saveSessionBtn').addEventListener('click', () => saveClassSession(student));
  renderSessionHistory(student.id);
}

function renderSessionHistory(studentId) {
  const el = document.getElementById('sessionHistoryList');
  if (!el) return;
  const list = loadSessions(studentId).slice(-5).reverse();
  if (list.length === 0) { el.innerHTML = `<p class="session-history-empty">No classes logged yet.</p>`; return; }
  el.innerHTML = `<p class="session-history-label">Recent classes</p>` + list.map(s => `
    <div class="session-history-item">
      <span>${s.present ? '✅' : '❌'} ${s.date}</span>
      <span>${escapeHtmlLite(s.topicLabel || '—')}</span>
    </div>
  `).join('');
}

function saveClassSession(student) {
  const date = document.getElementById('sessionDate').value || new Date().toISOString().slice(0, 10);
  const topicValue = document.getElementById('sessionTopic').value;
  const notes = document.getElementById('sessionNotes').value.trim();

  let topicLabel = '';
  if (topicValue) {
    const [levelId, topicId] = topicValue.split(':');
    const level = LEVELS.find(l => l.id === levelId);
    const topic = level ? level.topics.find(t => t.id === topicId) : null;
    if (level && topic) topicLabel = `${level.code} · ${topic.title}`;
  }

  const acc = loadCurrentSessionAccumulator(student.id);
  const sessions = loadSessions(student.id);
  sessions.push({
    id: 'sess' + Date.now().toString(36),
    date,
    present: drawerAttendance === 'present',
    topicLabel,
    notes,
    stats: { xp: acc.xp, stars: acc.stars },
    createdAt: Date.now(),
  });
  saveSessions(student.id, sessions);
  resetCurrentSessionAccumulator(student.id);
  drawerAttendance = 'present';

  paintSessionDrawer();

  const btn = document.getElementById('saveSessionBtn');
  if (btn) {
    btn.textContent = '✅ Saved!';
    setTimeout(() => { const b = document.getElementById('saveSessionBtn'); if (b) b.textContent = '💾 Save Class Session'; }, 1500);
  }
}

// Called after every awardProgress() so the score line updates live without
// disturbing whatever the teacher is currently typing in the drawer.
function refreshSessionDrawerScoreIfOpen() {
  const drawer = document.getElementById('sessionDrawer');
  if (!drawer || !drawer.classList.contains('open')) return;
  // The drawer always shows the active student, so that is whose running
  // total it reads — stars given to someone else in the Scoreboard land in
  // that child's own session and show up when the drawer switches to them.
  const student = getActiveStudent();
  if (!student) return;
  const acc = loadCurrentSessionAccumulator(student.id);
  const scoreEl = drawer.querySelector('.session-score-summary strong');
  if (scoreEl) scoreEl.textContent = `${acc.xp} XP · ${acc.stars} stars`;
}

// Called when the active student changes — the drawer should always reflect
// whoever is currently selected, so it's fine (and correct) to fully repaint.
function refreshSessionDrawerIfOpen() {
  const drawer = document.getElementById('sessionDrawer');
  if (drawer && drawer.classList.contains('open')) paintSessionDrawer();
}

// The full Quarterly Report builder (editable form, PDF letterhead, WhatsApp
// export, history) lives in its own module — see reports.js.

document.getElementById('sessionDrawerCloseBtn').addEventListener('click', closeSessionDrawer);
