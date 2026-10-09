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
  root.classList.toggle('has-picker', !student);

  if (!student) {
    // The students are right here, one tap each — today's (from the weekly
    // schedule on the dashboard) first, so the usual pick is the first one.
    const all = typeof loadStudents === 'function' ? loadStudents() : [];
    let todayIds = [];
    try {
      if (typeof dashToday === 'function' && typeof DASH_DAYS !== 'undefined' && typeof dashScheduleFor === 'function') {
        const dow = DASH_DAYS.find(d => d.dow === dashToday().getDay());
        if (dow) todayIds = all.filter(s => dashScheduleFor(s.id).days.includes(dow.id)).map(s => s.id);
      }
    } catch (e) { todayIds = []; }
    const ordered = all.slice().sort((a, b) => todayIds.includes(b.id) - todayIds.includes(a.id));
    root.innerHTML = `
      <div class="cockpit-empty">
        <span class="cockpit-empty-icon">👋</span>
        <h3>Quem tem aula agora?</h3>
        <p>Toque no aluno para abrir a rotina, os slides, o Zoom e o registro da aula dele.</p>
        ${ordered.length ? `
          <div class="cockpit-pick-grid">
            ${ordered.map(s => `
              <button class="cockpit-pick" type="button" data-pick-student="${escapeHtmlLite(s.id)}" style="--accent-color:${escapeHtmlLite(s.color)}">
                <span class="cockpit-pick-avatar" style="background:${escapeHtmlLite(s.color)}">${escapeHtmlLite(s.avatar)}</span>
                <span class="cockpit-pick-name">${escapeHtmlLite(s.name)}</span>
                <small>${todayIds.includes(s.id) ? '📅 hoje · ' : ''}${escapeHtmlLite(s.levelLabel || '')}</small>
              </button>`).join('')}
          </div>` : `
          <button class="btn btn-primary" id="cockpitAddStudent" type="button">+ Cadastrar o primeiro aluno</button>`}
        <button class="btn btn-ghost" id="cockpitPickStudent" type="button" ${ordered.length ? '' : 'hidden'}>👤 Abrir a lista completa</button>
      </div>
    `;
    root.querySelectorAll('[data-pick-student]').forEach(btn => {
      btn.addEventListener('click', () => { if (typeof selectStudent === 'function') selectStudent(btn.dataset.pickStudent); });
    });
    const add = document.getElementById('cockpitAddStudent');
    if (add) add.addEventListener('click', () => { if (typeof openStudentForm === 'function') openStudentForm(); });
    const pick = document.getElementById('cockpitPickStudent');
    if (pick) pick.addEventListener('click', () => {
      // Open the same switcher in the header rather than building a second
      // picker — one list of students, one place to change it.
      const chip = document.getElementById('profileChipBtn');
      if (!chip) return;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Deferred by a tick on purpose: app.js closes the dropdown on any
      // document click outside the switcher, and THIS click is still bubbling
      // its way there. Clicking the chip synchronously opens the dropdown and
      // then the same event immediately closes it again.
      setTimeout(() => chip.click(), 0);
    });
    return;
  }

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

    ${cockpitContextHTML(student)}

    <div class="cockpit-actions">
      <button class="btn btn-primary" id="openSessionDrawerBtn">📋 Today's Class</button>
      <button class="btn btn-ghost" id="openReportsBtn">📊 Reports &amp; Progress</button>
      <button class="btn btn-ghost" id="openClassReviewBtn">🧠 Class review</button>
      <button class="btn btn-ghost" id="openStudentBookBtn">📖 Livro da aula</button>
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
  document.getElementById('openClassReviewBtn').addEventListener('click', openLatestClassReview);
  // The student's online book (livroOnline.js), done together in class:
  // opens at the page they stopped on and saves to this student.
  document.getElementById('openStudentBookBtn').addEventListener('click', () => {
    if (typeof LivroOnline !== 'undefined') LivroOnline.openClass(student.id);
  });
  wireCockpitContext(root, student);
  renderCockpitLinks(student);
}

// ---------------------------------------------------------------------------
// COCKPIT CONTEXT — what the teacher needs in the first minute of a lesson:
// what happened last time, the topic to open now, and the homework that is
// still waiting. All read-only shortcuts into screens that already exist.
// ---------------------------------------------------------------------------
function cockpitFindTopic(label) {
  const text = String(label || '').toLowerCase();
  if (!text) return null;
  for (const level of LEVELS) {
    for (const topic of level.topics) {
      if (text.includes(String(topic.title || '').toLowerCase())) return { level, topic };
    }
  }
  return null;
}

function cockpitTopicChoices(student) {
  const grown = typeof igIsGrownup === 'function' && igIsGrownup(student);
  const level = LEVELS.find(l => l.id === student.levelId) || LEVELS[0];
  return level ? level.topics.filter(t => (t.audience === 'adult' ? grown : true)).map(t => ({ level, topic: t })) : [];
}

function cockpitContextHTML(student) {
  const sessions = loadSessions(student.id).slice().sort((a, b) =>
    String(a.date).localeCompare(String(b.date)) || (a.createdAt || 0) - (b.createdAt || 0));
  const last = sessions[sessions.length - 1] || null;
  const lastTopic = last ? cockpitFindTopic(last.topicLabel) : null;
  const pending = (typeof hwForStudent === 'function' ? hwForStudent(student.id) : []).filter(h => !hwIsDone(h));
  const choices = cockpitTopicChoices(student);
  const fmtDate = d => { try { return new Date(d + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); } catch (e) { return d; } };
  const lastHw = last && last.sheet && Array.isArray(last.sheet.homework) ? last.sheet.homework : [];

  return `
    <div class="cockpit-context">
      <div class="cockpit-ctx-card">
        <p class="cockpit-ctx-label">🕘 Última aula</p>
        ${last ? `
          <p class="cockpit-ctx-main">${last.present ? '✅' : '❌ Faltou ·'} ${escapeHtmlLite(fmtDate(last.date))}
            ${last.topicLabel ? ` · <b>${escapeHtmlLite(last.topicLabel)}</b>` : ''}</p>
          ${last.notes ? `<p class="cockpit-ctx-note">📝 ${escapeHtmlLite(last.notes.length > 160 ? last.notes.slice(0, 160) + '…' : last.notes)}</p>` : ''}
          ${lastHw.length ? `<p class="cockpit-ctx-note">🏠 Lição pedida: ${lastHw.map(escapeHtmlLite).join(' · ')}</p>` : ''}
          ${lastTopic ? `<button class="game-btn secondary" type="button" data-open-topic="${escapeAttrLite(lastTopic.level.id)}|${escapeAttrLite(lastTopic.topic.id)}">↺ Revisar: ${escapeHtmlLite(lastTopic.topic.title)}</button>` : ''}
        ` : `<p class="cockpit-ctx-note">Nenhuma aula registrada ainda — use <b>📋 Today's Class</b> no fim da aula.</p>`}
      </div>

      <div class="cockpit-ctx-card">
        <p class="cockpit-ctx-label">📖 Tópico de hoje</p>
        ${choices.length ? `
          <div class="cockpit-topic-row">
            <select id="cockpitTopicSelect" aria-label="Tópico para abrir">
              ${choices.map(c => `<option value="${escapeAttrLite(c.level.id)}|${escapeAttrLite(c.topic.id)}" ${lastTopic && lastTopic.topic.id === c.topic.id && lastTopic.level.id === c.level.id ? 'selected' : ''}>${escapeHtmlLite(c.topic.emoji || '')} ${escapeHtmlLite(c.topic.title)}</option>`).join('')}
            </select>
            <button class="btn btn-primary" type="button" id="cockpitOpenTopic">▶ Abrir</button>
          </div>
          <p class="cockpit-ctx-note">Vídeo, jogos, quiz, leitura e speaking do tópico, prontos para compartilhar a tela.</p>
        ` : '<p class="cockpit-ctx-note">Este nível ainda não tem tópicos.</p>'}
      </div>

      <div class="cockpit-ctx-card">
        <p class="cockpit-ctx-label">🏠 Lição de casa</p>
        ${pending.length ? `
          <p class="cockpit-ctx-main"><b>${pending.length}</b> pendente${pending.length === 1 ? '' : 's'}: ${pending.slice(0, 2).map(h => escapeHtmlLite(h.title || 'Lição de casa')).join(' · ')}${pending.length > 2 ? '…' : ''}</p>
        ` : '<p class="cockpit-ctx-note">Nada pendente. 🎉</p>'}
        <button class="game-btn secondary" type="button" id="cockpitGoHomework">${pending.length ? '👀 Ver lições' : '✨ Passar uma lição'}</button>
      </div>
    </div>`;
}

function wireCockpitContext(root, student) {
  const openFromValue = (value) => {
    const [levelId, topicId] = String(value || '').split('|');
    if (levelId && topicId && typeof openTopicModal === 'function') openTopicModal(levelId, topicId);
  };
  root.querySelectorAll('[data-open-topic]').forEach(btn => btn.addEventListener('click', () => openFromValue(btn.dataset.openTopic)));
  const openBtn = root.querySelector('#cockpitOpenTopic');
  if (openBtn) openBtn.addEventListener('click', () => openFromValue(root.querySelector('#cockpitTopicSelect').value));
  const hw = root.querySelector('#cockpitGoHomework');
  if (hw) hw.addEventListener('click', () => {
    const section = document.getElementById('homework');
    if (section && section.classList.contains('is-collapsed') && typeof setSectionCollapsed === 'function') setSectionCollapsed(section, false);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
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
                ? `<a class="btn btn-link-${k}" data-open="${k}" href="${escapeAttrLite(url)}"
                       target="_blank" rel="noopener noreferrer">${meta.icon} ${escapeHtmlLite(meta.label)}</a>`
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
      root.querySelectorAll('[data-open]').forEach(link => {
        link.addEventListener('click', (e) => {
          // Cancel the anchor only when window.open already opened the tab.
          if (openClassLink(classLinkFor(link.dataset.open, student.id))) e.preventDefault();
        });
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
// The class being corrected, when the drawer is in edit mode (null = a new
// class). A class logged with the wrong date, topic or student is fixed in
// place instead of being logged twice.
let drawerEditingId = null;
let drawerShowAllHistory = false;

function openSessionDrawer() {
  drawerAttendance = 'present';
  drawerEditingId = null;
  document.getElementById('sessionDrawer').classList.add('open');
  paintSessionDrawer();
}

function editClassSession(sessionId) {
  const student = getActiveStudent();
  const session = student && loadSessions(student.id).find(x => x.id === sessionId);
  if (!session) return;
  drawerEditingId = session.id;
  drawerAttendance = session.present ? 'present' : 'absent';
  document.getElementById('sessionDrawer').classList.add('open');
  paintSessionDrawer();
  const body = document.getElementById('sessionDrawerBody');
  if (body) body.scrollTop = 0;
}

function cancelSessionEdit() {
  drawerEditingId = null;
  drawerAttendance = 'present';
  paintSessionDrawer();
}
function closeSessionDrawer() {
  document.getElementById('sessionDrawer').classList.remove('open');
}

function paintSessionDrawer() {
  const student = getActiveStudent();
  const body = document.getElementById('sessionDrawerBody');
  if (!body) return;

  if (!student) {
    body.innerHTML = `
      <div class="drawer-empty">
        <span>👋</span>
        <p>Escolha o aluno da aula no topo da página para registrar a presença,
           o conteúdo e as anotações de hoje.</p>
      </div>
    `;
    return;
  }

  const acc = loadCurrentSessionAccumulator(student.id);
  const todayStr = new Date().toISOString().slice(0, 10);
  const editing = drawerEditingId ? loadSessions(student.id).find(x => x.id === drawerEditingId) : null;
  if (drawerEditingId && !editing) drawerEditingId = null;
  const sheet = (editing && editing.sheet) || {};
  const fmtDay = d => { try { return new Date(d + 'T12:00').toLocaleDateString('pt-BR'); } catch (e) { return d; } };
  const others = loadStudents().filter(x => x.id !== student.id);

  // The picker inserts a label into the free-text field — it is a shortcut for
  // typing, not the only way to fill it in. A class is often "Unit 4 + revisão
  // do past simple", which no list of topics can hold.
  const topicLabelOf = (level, topic) => `${level.code} · ${topic.title}`;
  // Only what fits this student: their own level first, then the other
  // levels the teacher teaches; grown-up topics only for learners of 15+.
  const grown = typeof igIsGrownup === 'function' && igIsGrownup(student);
  const myLevels = typeof teacherLevelIds === 'function' ? teacherLevelIds() : LEVELS.map(l => l.id);
  const pickerLevels = LEVELS
    .filter(l => l.id === student.levelId || myLevels.includes(l.id))
    .sort((a, b) => (b.id === student.levelId) - (a.id === student.levelId));
  const topicOptionsHTML = pickerLevels.map(level => {
    const topics = level.topics.filter(t => (t.audience === 'adult' ? grown : true));
    if (!topics.length) return '';
    return `
    <optgroup label="${level.id === student.levelId ? '⭐ ' : ''}${level.code} · ${level.name}${level.id === student.levelId ? ' (nível do aluno)' : ''}">
      ${topics.map(t => `<option value="${escapeHtmlLite(topicLabelOf(level, t))}">${escapeHtmlLite(t.title)}</option>`).join('')}
    </optgroup>`;
  }).join('');

  // Everything the teacher can be offered: the curriculum, plus whatever she
  // has typed for this student before (her own wording comes back).
  const pastLabels = [...new Set(loadSessions(student.id)
    .map(x => (x.topicLabel || '').trim())
    .filter(Boolean))].reverse();
  const allLabels = [...new Set(pastLabels.concat(
    pickerLevels.flatMap(level => level.topics.filter(t => (t.audience === 'adult' ? grown : true)).map(t => topicLabelOf(level, t)))))];
  const datalistHTML = allLabels.map(l => `<option value="${escapeHtmlLite(l)}"></option>`).join('');
  const recentHTML = pastLabels.slice(0, 3)
    .map(l => `<button type="button" class="session-topic-chip" data-topic-chip="${escapeHtmlLite(l)}" title="${escapeHtmlLite(l)}">↺ ${escapeHtmlLite(l)}</button>`)
    .join('');

  body.innerHTML = `
    <div class="session-student-line" style="--accent-color:${student.color}">
      <span class="student-card-avatar" style="background:${student.color}">${student.avatar}</span>
      <strong>${escapeHtmlLite(student.name)}</strong>
    </div>

    ${editing ? `
      <div class="session-edit-banner">
        <p>✏️ <b>Editando a aula de ${escapeHtmlLite(fmtDay(editing.date))}</b>${sheet.classNumber ? ` (nº ${escapeHtmlLite(sheet.classNumber)})` : ''}.
           Corrija o que precisar e clique em <b>Salvar alterações</b>.</p>
        <button type="button" class="game-btn secondary" id="sessionEditCancel">Cancelar edição</button>
      </div>
      ${others.length ? `
        <div class="gm-form-field">
          <label for="sessionMoveTo">Aluno desta aula <span class="sheet-private-hint">(troque se registrou no aluno errado)</span></label>
          <select id="sessionMoveTo">
            <option value="${escapeAttrLite(student.id)}" selected>${escapeHtmlLite(student.name)}</option>
            ${others.map(o => `<option value="${escapeAttrLite(o.id)}">${escapeHtmlLite(o.name)}</option>`).join('')}
          </select>
        </div>` : ''}` : ''}

    <div class="gm-form-field">
      <label>Attendance</label>
      <div class="attendance-toggle">
        <button class="attendance-btn present ${drawerAttendance === 'present' ? 'active' : ''}" data-att="present">✅ Present</button>
        <button class="attendance-btn absent ${drawerAttendance === 'absent' ? 'active' : ''}" data-att="absent">❌ Absent</button>
      </div>
    </div>

    <div class="session-date-row">
      <div class="gm-form-field session-classno-field">
        <label for="sessionClassNo">Class nº</label>
        <input type="number" id="sessionClassNo" min="1" inputmode="numeric" value="${editing ? escapeAttrLite(sheet.classNumber || '') : nextClassNumber(student.id)}" />
      </div>
      <div class="gm-form-field">
        <label for="sessionDate">Class date</label>
        <input type="date" id="sessionDate" value="${editing ? escapeAttrLite(editing.date) : todayStr}" />
      </div>
    </div>

    <div class="gm-form-field">
      <label for="sessionTopic">In class · content worked on</label>
      <input type="text" id="sessionTopic" list="sessionTopicList" autocomplete="off"
             placeholder="Digite o conteúdo da aula…" value="${editing ? escapeAttrLite(editing.topicLabel || '') : ''}" />
      <datalist id="sessionTopicList">${datalistHTML}</datalist>
      <div class="session-topic-tools">
        <select id="sessionTopicPicker" aria-label="Inserir um tópico do curso">
          <option value="">➕ Inserir tópico do curso…</option>
          ${topicOptionsHTML}
        </select>
      </div>
      ${recentHTML ? `<div class="session-topic-recent">${recentHTML}</div>` : ''}
    </div>

    <div class="gm-form-field">
      <label>New words / expressions · Pronunciation</label>
      <div class="sheet-rows" id="sessionWords"></div>
      <button class="sheet-add-btn" id="sessionAddWord" type="button">➕ Adicionar palavra</button>
    </div>

    <div class="gm-form-field">
      <label>Homework</label>
      <div class="sheet-rows" id="sessionHomework"></div>
      <button class="sheet-add-btn" id="sessionAddHomework" type="button">➕ Adicionar tarefa</button>
    </div>

    <div class="gm-form-field">
      <label for="sessionNotes">Teacher's notes <span class="sheet-private-hint">(só para você — não vai na ficha)</span></label>
      <textarea id="sessionNotes" rows="4" placeholder="e.g. Great pronunciation of /p/ and /t/ sounds, practiced Simple Past regular verbs...">${editing ? escapeHtmlLite(editing.notes || '') : ''}</textarea>
    </div>

    <div class="session-score-summary">
      <span>⭐ ${editing ? 'Pontos desta aula' : 'Session score'}</span>
      <strong>${editing ? `${(editing.stats && editing.stats.xp) || 0} XP · ${(editing.stats && editing.stats.stars) || 0} stars` : `${acc.xp} XP · ${acc.stars} stars`}</strong>
    </div>

    <button class="btn btn-primary" id="saveSessionBtn" style="width:100%">${editing ? '💾 Salvar alterações' : '💾 Save Class Session'}</button>
    <button class="btn btn-ghost" id="saveSessionSheetBtn" style="width:100%;margin-top:8px">${editing ? '🖼️ Salvar alterações e gerar ficha' : '🖼️ Salvar e gerar ficha p/ WhatsApp'}</button>
    ${editing ? '<button class="btn btn-ghost session-delete-btn" id="deleteSessionBtn" style="width:100%;margin-top:8px">🗑️ Apagar esta aula</button>' : ''}

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

  // Picking a topic adds it to whatever is already written instead of
  // replacing it, so two topics in one class are a matter of picking twice.
  const topicInput = document.getElementById('sessionTopic');
  const addTopic = (label) => {
    const current = topicInput.value.trim();
    const parts = current ? current.split(/\s*\+\s*/) : [];
    if (parts.some(p => p.toLowerCase() === label.toLowerCase())) return;
    parts.push(label);
    topicInput.value = parts.join(' + ');
    topicInput.focus();
  };
  const picker = document.getElementById('sessionTopicPicker');
  if (picker) {
    picker.addEventListener('change', () => {
      if (picker.value) addTopic(picker.value);
      picker.selectedIndex = 0;
    });
  }
  body.querySelectorAll('[data-topic-chip]').forEach(btn => {
    btn.addEventListener('click', () => addTopic(btn.dataset.topicChip));
  });

  // Word and homework lists start with a few empty lines, like the paper
  // sheet; Enter on the last line opens the next one.
  const wordsEl = document.getElementById('sessionWords');
  const hwEl = document.getElementById('sessionHomework');
  // Editing: the saved lines first, then the usual blanks to add more.
  const savedWords = Array.isArray(sheet.words) ? sheet.words : [];
  const savedHw = Array.isArray(sheet.homework) ? sheet.homework : [];
  savedWords.forEach(w => addSheetWordRow(wordsEl, false, w));
  savedHw.forEach(h => addSheetHomeworkRow(hwEl, false, h));
  for (let i = savedWords.length; i < 3; i++) addSheetWordRow(wordsEl);
  for (let i = savedHw.length; i < 4; i++) addSheetHomeworkRow(hwEl);
  document.getElementById('sessionAddWord').addEventListener('click', () => addSheetWordRow(wordsEl, true));
  document.getElementById('sessionAddHomework').addEventListener('click', () => addSheetHomeworkRow(hwEl, true));

  document.getElementById('saveSessionBtn').addEventListener('click', () => saveClassSession(student));
  document.getElementById('saveSessionSheetBtn').addEventListener('click', () => {
    const saved = saveClassSession(student);
    if (saved) {
      const owner = loadStudents().find(x => x.id === saved.studentId) || student;
      closeSessionDrawer();
      openClassSheetModal(owner, saved);
    }
  });
  const cancelEdit = document.getElementById('sessionEditCancel');
  if (cancelEdit) cancelEdit.addEventListener('click', cancelSessionEdit);
  const del = document.getElementById('deleteSessionBtn');
  if (del) del.addEventListener('click', () => {
    if (!editing) return;
    if (!confirm(`Apagar a aula de ${fmtDay(editing.date)}${editing.topicLabel ? ` (${editing.topicLabel})` : ''}? Isso não pode ser desfeito.`)) return;
    if (typeof igMarkSessionDeleted === 'function') igMarkSessionDeleted(student.id, editing.id);
    saveSessions(student.id, loadSessions(student.id).filter(x => x.id !== editing.id));
    drawerEditingId = null;
    drawerAttendance = 'present';
    paintSessionDrawer();
    refreshLiveClassCockpit();
    if (typeof renderDashboardStatsOnly === 'function') renderDashboardStatsOnly();
  });
  renderSessionHistory(student.id);
}

// The number that goes in "Class 16" — one more than the highest number
// already used, or than the classes logged, whichever is larger. Always
// editable, since a student who joined mid-course may not start at 1.
function nextClassNumber(studentId) {
  const list = loadSessions(studentId);
  const highest = list.reduce((m, s) => Math.max(m, Number(s.sheet && s.sheet.classNumber) || 0), 0);
  return Math.max(highest, list.length) + 1;
}

function addSheetWordRow(container, focus, value) {
  const v = value || {};
  const row = document.createElement('div');
  row.className = 'sheet-row sheet-row--word';
  row.innerHTML = `
    <input type="text" class="sheet-word" placeholder="word / expression" autocomplete="off" value="${escapeAttrLite(v.word || '')}" />
    <input type="text" class="sheet-pron" placeholder="pronunciation" autocomplete="off" value="${escapeAttrLite(v.pron || '')}" />
    <button type="button" class="sheet-row-del" aria-label="Remover linha" title="Remover">✕</button>
  `;
  wireSheetRow(row, container, () => addSheetWordRow(container, true));
  container.appendChild(row);
  if (focus) row.querySelector('input').focus();
}

function addSheetHomeworkRow(container, focus, value) {
  const row = document.createElement('div');
  row.className = 'sheet-row sheet-row--hw';
  row.innerHTML = `
    <span class="sheet-row-no"></span>
    <input type="text" class="sheet-hw" placeholder="ex.: Workbook page 12" autocomplete="off" value="${escapeAttrLite(value || '')}" />
    <button type="button" class="sheet-row-del" aria-label="Remover linha" title="Remover">✕</button>
  `;
  wireSheetRow(row, container, () => addSheetHomeworkRow(container, true));
  container.appendChild(row);
  renumberSheetRows(container);
  if (focus) row.querySelector('input').focus();
}

function wireSheetRow(row, container, addNext) {
  row.querySelector('.sheet-row-del').addEventListener('click', () => {
    row.remove();
    renumberSheetRows(container);
  });
  const inputs = row.querySelectorAll('input');
  inputs[inputs.length - 1].addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (row === container.lastElementChild) addNext();
    else row.nextElementSibling.querySelector('input').focus();
  });
}

function renumberSheetRows(container) {
  container.querySelectorAll('.sheet-row-no').forEach((el, i) => { el.textContent = `${i + 1}-`; });
}

function gatherSheetFields() {
  const words = [...document.querySelectorAll('#sessionWords .sheet-row')]
    .map(r => ({ word: r.querySelector('.sheet-word').value.trim(), pron: r.querySelector('.sheet-pron').value.trim() }))
    .filter(w => w.word || w.pron);
  const homework = [...document.querySelectorAll('#sessionHomework .sheet-hw')]
    .map(i => i.value.trim())
    .filter(Boolean);
  const classNumber = parseInt(document.getElementById('sessionClassNo').value, 10) || null;
  return { classNumber, words, homework };
}

function renderSessionHistory(studentId) {
  const el = document.getElementById('sessionHistoryList');
  if (!el) return;
  const all = loadSessions(studentId).slice().sort((a, b) =>
    String(a.date).localeCompare(String(b.date)) || (a.createdAt || 0) - (b.createdAt || 0)).reverse();
  if (all.length === 0) { el.innerHTML = `<p class="session-history-empty">No classes logged yet.</p>`; return; }
  const list = drawerShowAllHistory ? all : all.slice(0, 5);
  el.innerHTML = `<p class="session-history-label">${drawerShowAllHistory ? `Todas as aulas (${all.length})` : 'Recent classes'} <small>— ✏️ para corrigir</small></p>` + list.map(s => `
    <div class="session-history-item${s.id === drawerEditingId ? ' is-editing' : ''}">
      <span>${s.present ? '✅' : '❌'} ${s.sheet && s.sheet.classNumber ? `#${s.sheet.classNumber} · ` : ''}${s.date}</span>
      <span class="session-history-topic">${escapeHtmlLite(s.topicLabel || '—')}</span>
      <button type="button" class="session-history-sheet" data-edit-session="${escapeAttrLite(s.id)}"
              title="Editar esta aula" aria-label="Editar a aula de ${escapeAttrLite(s.date)}">✏️</button>
      <button type="button" class="session-history-sheet" data-sheet="${escapeAttrLite(s.id)}"
              title="Ver ficha da aula / enviar pelo WhatsApp" aria-label="Ficha da aula de ${escapeAttrLite(s.date)}">🖼️</button>
      <button type="button" class="session-history-sheet" data-review="${escapeAttrLite(s.id)}"
              title="Class review — flashcards desta aula" aria-label="Revisão da aula de ${escapeAttrLite(s.date)}">🧠</button>
    </div>
  `).join('') + (all.length > 5 ? `
    <button type="button" class="session-history-more" id="sessionHistoryMore">${drawerShowAllHistory ? '▲ Mostrar só as últimas 5' : `▼ Ver todas as ${all.length} aulas`}</button>` : '');
  const more = el.querySelector('#sessionHistoryMore');
  if (more) more.addEventListener('click', () => { drawerShowAllHistory = !drawerShowAllHistory; renderSessionHistory(studentId); });
  el.querySelectorAll('[data-edit-session]').forEach(btn => {
    btn.addEventListener('click', () => editClassSession(btn.dataset.editSession));
  });
  el.querySelectorAll('[data-review]').forEach(btn => {
    btn.addEventListener('click', () => {
      const student = getActiveStudent();
      const session = loadSessions(studentId).find(x => x.id === btn.dataset.review);
      if (!student || !session) return;
      closeSessionDrawer();
      openClassReviewEditor(student, session);
    });
  });
  el.querySelectorAll('[data-sheet]').forEach(btn => {
    btn.addEventListener('click', () => {
      const student = getActiveStudent();
      const session = loadSessions(studentId).find(x => x.id === btn.dataset.sheet);
      if (!student || !session) return;
      closeSessionDrawer();
      openClassSheetModal(student, session);
    });
  });
}

function saveClassSession(student) {
  const date = document.getElementById('sessionDate').value || new Date().toISOString().slice(0, 10);
  const notes = document.getElementById('sessionNotes').value.trim();
  // Free text now: whatever is in the box is what was worked on, whether it
  // came from the picker, from a past class, or straight off the keyboard.
  const topicLabel = document.getElementById('sessionTopic').value.trim();

  const sheet = gatherSheetFields();

  if (drawerEditingId) return saveEditedSession(student, { date, notes, topicLabel, sheet });

  const acc = loadCurrentSessionAccumulator(student.id);
  const sessions = loadSessions(student.id);
  const record = {
    id: 'sess' + Date.now().toString(36),
    date,
    present: drawerAttendance === 'present',
    topicLabel,
    notes,
    sheet,
    stats: { xp: acc.xp, stars: acc.stars },
    createdAt: Date.now(),
  };
  sessions.push(record);
  saveSessions(student.id, sessions);
  resetCurrentSessionAccumulator(student.id);
  drawerAttendance = 'present';

  paintSessionDrawer();
  // "Última aula" on the cockpit now shows this one.
  refreshLiveClassCockpit();

  const btn = document.getElementById('saveSessionBtn');
  if (btn) {
    btn.textContent = '✅ Saved!';
    setTimeout(() => { const b = document.getElementById('saveSessionBtn'); if (b) b.textContent = '💾 Save Class Session'; }, 1500);
  }
  return record;
}

// Saving in edit mode: the same record (same id, same points) with the
// corrected fields — and, when the teacher picked another student, moved to
// that student's class log.
function saveEditedSession(student, fields) {
  const sessions = loadSessions(student.id);
  const idx = sessions.findIndex(x => x.id === drawerEditingId);
  if (idx < 0) { drawerEditingId = null; paintSessionDrawer(); return null; }
  const record = { ...sessions[idx], ...fields, present: drawerAttendance === 'present', editedAt: Date.now() };
  const moveSel = document.getElementById('sessionMoveTo');
  const targetId = moveSel ? moveSel.value : student.id;

  if (targetId && targetId !== student.id) {
    const target = loadStudents().find(x => x.id === targetId);
    if (!target) return null;
    if (!confirm(`Mover esta aula de ${student.name} para ${target.name}?`)) return null;
    sessions.splice(idx, 1);
    saveSessions(student.id, sessions);
    const theirs = loadSessions(target.id);
    theirs.push(record);
    theirs.sort((a, b) => String(a.date).localeCompare(String(b.date)) || (a.createdAt || 0) - (b.createdAt || 0));
    saveSessions(target.id, theirs);
  } else {
    sessions[idx] = record;
    saveSessions(student.id, sessions);
  }

  drawerEditingId = null;
  drawerAttendance = 'present';
  paintSessionDrawer();
  refreshLiveClassCockpit();
  if (typeof renderDashboardStatsOnly === 'function') renderDashboardStatsOnly();

  const btn = document.getElementById('saveSessionBtn');
  if (btn) {
    const moved = targetId && targetId !== student.id;
    btn.textContent = moved ? '✅ Aula movida!' : '✅ Alterações salvas!';
    setTimeout(() => { const b = document.getElementById('saveSessionBtn'); if (b) b.textContent = '💾 Save Class Session'; }, 1800);
  }
  return { ...record, studentId: targetId || student.id };
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
