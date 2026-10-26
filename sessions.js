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
  // The student's link gets this class's words and phrases (speakingHub.js).
  if (typeof saRefreshSoon === 'function') saRefreshSoon();
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

// One bank per level, written with the grammar the learner already has:
// A0 "be" and likes, A1 present simple and can, A2 past and plans,
// B1 present perfect and opinions, B2/C1 hypotheticals and debate.
const WARMUP_QUESTIONS = {
  a0: [
    'How are you today?',
    "What's your favorite color?",
    "What's your favorite food?",
    'Do you have a pet? What is its name?',
    'Is it hot or cold today where you are?',
    'Do you like music? What kind?',
    'How many people are in your family?',
    "What's your favorite day of the week?",
    'Are you tired or happy today?',
    'Do you like coffee or tea?',
    "What's your favorite movie?",
    'What color is your phone?',
  ],
  a1: [
    'What do you usually do on Saturdays?',
    'What time do you get up during the week?',
    'What do you have for breakfast?',
    'Can you cook? What can you make?',
    'What do you do in your free time?',
    'Who is your best friend? What is he or she like?',
    'What is your favorite place in your city?',
    'What music do you listen to?',
    'How do you get to school or work?',
    'What do you like to watch on TV or online?',
    'What sports can you play?',
    'Describe your bedroom in three words.',
  ],
  a2: [
    'What did you do last weekend?',
    'What are you going to do after class today?',
    'Tell me about a good movie or series you watched recently.',
    'Where did you go on your last holiday?',
    'What was the best part of your week?',
    'Which is better: the beach or the mountains? Why?',
    'What did you eat yesterday?',
    'What are your plans for the next holiday?',
    'Who was your favorite teacher at school? Why?',
    'What is the most interesting app on your phone?',
    'Is your city bigger or smaller than you would like?',
    'What did you want to be when you were a child?',
  ],
  b1: [
    "What's something you've never done but would like to try?",
    'Have you ever met someone famous? What happened?',
    "What's a goal you're working on right now?",
    'If you could travel anywhere next month, where would you go?',
    "What's the best advice anyone has ever given you?",
    'Do you think social media makes people happier? Why or why not?',
    'Tell me about something that made you laugh this week.',
    'What skill would you like to learn this year, and why?',
    "What's a habit you'd like to change?",
    "How has your city changed since you were a child?",
    "What's a book, series or song you'd recommend to me?",
    'Would you rather work from home or in an office? Why?',
  ],
  b1b2: [
    'If you could change one thing about the world, what would it be?',
    'What would you have done differently if you had started learning English earlier?',
    'Is it better to be good at many things or excellent at one? Why?',
    'Should schools teach more practical skills? Which ones?',
    "What's an opinion you used to have that you've changed?",
    'How do you think artificial intelligence will change everyday life?',
    "What's something people often misunderstand about your generation?",
    'If you could have dinner with anyone, past or present, who would it be?',
    'Is it ever okay to tell a white lie? Give an example.',
    "What makes a city a great place to live?",
    'Do you think travel really changes people? How?',
    'What would your perfect day look like, from morning to night?',
  ],
};
const warmupDecks = {};
function drawWarmupQuestion(levelId) {
  const id = WARMUP_QUESTIONS[levelId] ? levelId : 'a1';
  if (!warmupDecks[id] || warmupDecks[id].length === 0) warmupDecks[id] = lsShuffle(WARMUP_QUESTIONS[id]);
  return warmupDecks[id].shift();
}

// The full "Lição de Casa" section lives inside the live-class cockpit while a
// student is open. The cockpit is rebuilt from a string, so the section's
// content is parked back in its own section first and moved in afterwards.
function parkHomeworkRoot() {
  const r = document.getElementById('homeworkRoot');
  const sec = document.getElementById('homework');
  if (!r || !sec) return;
  if (!sec.contains(r)) sec.appendChild(r);
  sec.style.display = '';
}
function seatHomeworkRoot() {
  const r = document.getElementById('homeworkRoot');
  const sec = document.getElementById('homework');
  const slot = document.getElementById('cockpitHwBody');
  if (!r || !sec || !slot) return;
  slot.appendChild(r);
  sec.style.display = 'none';
  if (typeof renderHomework === 'function') { try { renderHomework(r); } catch (e) { /* ignore */ } }
}

function refreshLiveClassCockpit() {
  const root = document.getElementById('liveClassCockpit');
  if (!root) return;
  parkHomeworkRoot();
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
                <small>${todayIds.includes(s.id) ? '📅 hoje · ' : ''}${escapeHtmlLite(igLevelText(s))}</small>
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
        <p>${student.age ? student.age + ' yrs · ' : ''}${escapeHtmlLite(igLevelText(student))}</p>
        ${typeof groupMemberNames === 'function' && groupMemberNames(student.id).length ? `<p class="cockpit-group-members">👥 ${groupMemberNames(student.id).map(escapeHtmlLite).join(' · ')}</p>` : ''}
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
          <p class="warmup-question" id="warmupQuestion">${drawWarmupQuestion(student.levelId)}</p>
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
      <button class="btn btn-ghost" id="openStudentSlidesBtn">🖼️ Slides da aula</button>
    </div>

    <div class="cockpit-links" id="cockpitLinks"></div>
  `;

  if (young) {
    root.querySelectorAll('.routine-song-btn').forEach(btn => {
      btn.addEventListener('click', () => openRoutineSongModal(btn.dataset.song));
    });
  } else {
    document.getElementById('newWarmupBtn').addEventListener('click', () => {
      document.getElementById('warmupQuestion').textContent = drawWarmupQuestion(student.levelId);
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
  // The student's decks (slidesAula.js): edit and present on screen-share.
  const slidesBtn = document.getElementById('openStudentSlidesBtn');
  if (slidesBtn) slidesBtn.addEventListener('click', () => {
    if (typeof SlidesAula !== 'undefined') SlidesAula.openForStudent(student.id);
  });
  wireCockpitContext(root, student);
  renderCockpitLinks(student);
  seatHomeworkRoot();
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
    </div>

    <div class="cockpit-hw" id="cockpitHwSlot">
      <div class="cockpit-hw-head">
        <h3>🏠 Lição de casa</h3>
        <div class="cockpit-hw-add">
          <input type="text" id="cockpitHwInput" placeholder="Escreva a lição (ex.: IG Beyond pág 6 e 7) e aperte Enter…" autocomplete="off" aria-label="Nova lição de casa" />
          <button class="btn btn-primary" type="button" id="cockpitHwAdd">➕ Passar</button>
        </div>
      </div>
      <div id="cockpitHwBody"></div>
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
  const hwInput = root.querySelector('#cockpitHwInput');
  const addHw = () => {
    if (!hwInput || !hwInput.value.trim() || typeof hwQuickAdd !== 'function') return;
    hwQuickAdd(student, hwInput.value);
    refreshLiveClassCockpit();
    const again = document.getElementById('cockpitHwInput');
    if (again) again.focus();
  };
  if (hwInput) hwInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addHw(); } });
  const hwAddBtn = root.querySelector('#cockpitHwAdd');
  if (hwAddBtn) hwAddBtn.addEventListener('click', addHw);
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
// Group classes: attendance per member id ('present' | 'absent').
let drawerGroupAtt = {};
// The class being corrected, when the drawer is in edit mode (null = a new
// class). A class logged with the wrong date, topic or student is fixed in
// place instead of being logged twice.
let drawerEditingId = null;
let drawerShowAllHistory = false;

function openSessionDrawer() {
  drawerAttendance = 'present';
  drawerGroupAtt = {};
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
  drawerGroupAtt = {};
  ((session.sheet && session.sheet.attendance) || []).forEach(a => { drawerGroupAtt[a.name] = a.present ? 'present' : 'absent'; });
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

  const groupList = typeof groupMemberNames === 'function' ? groupMemberNames(student.id) : [];
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

    ${typeof getStudentExtra === 'function' ? `
    <div class="gm-form-field">
      <label for="sessionStudentNotes">📝 Sobre o aluno <span class="sheet-private-hint">(só para você — objetivo, o que gosta…)</span></label>
      <textarea id="sessionStudentNotes" rows="2" placeholder="Objetivo do aluno, interesses…">${escapeHtmlLite(getStudentExtra(student.id).notes || '')}</textarea>
    </div>` : ''}

    ${groupList.length ? `
    <div class="gm-form-field">
      <label>Attendance · 👥 ${escapeHtmlLite(student.name)}</label>
      ${groupList.map(n => `
        <div class="session-group-row">
          <strong>${escapeHtmlLite(n)}</strong>
          <div class="attendance-toggle" data-group-member="${escapeAttrLite(n)}">
            <button type="button" class="attendance-btn present ${drawerGroupAtt[n] !== 'absent' ? 'active' : ''}" data-gatt="present">✅ Present</button>
            <button type="button" class="attendance-btn absent ${drawerGroupAtt[n] === 'absent' ? 'active' : ''}" data-gatt="absent">❌ Absent</button>
          </div>
        </div>`).join('')}
    </div>` : `
    <div class="gm-form-field">
      <label>Attendance</label>
      <div class="attendance-toggle">
        <button class="attendance-btn present ${drawerAttendance === 'present' ? 'active' : ''}" data-att="present">✅ Present</button>
        <button class="attendance-btn absent ${drawerAttendance === 'absent' ? 'active' : ''}" data-att="absent">❌ Absent</button>
      </div>
    </div>`}

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
      <label for="sessionText">Phrases / texts <span class="sheet-private-hint">(vai na ficha, em um bloco próprio)</span></label>
      <textarea id="sessionText" rows="4" placeholder="Frases maiores, diálogos ou um texto para o aluno ver na ficha…">${editing ? escapeHtmlLite(sheet.text || '') : ''}</textarea>
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
  body.querySelectorAll('[data-att]').forEach(btn => {
    btn.addEventListener('click', () => {
      drawerAttendance = btn.dataset.att;
      body.querySelectorAll('[data-att]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  body.querySelectorAll('[data-group-member]').forEach(box => {
    box.querySelectorAll('[data-gatt]').forEach(btn => btn.addEventListener('click', () => {
      drawerGroupAtt[box.dataset.groupMember] = btn.dataset.gatt;
      box.querySelectorAll('.attendance-btn').forEach(b => b.classList.toggle('active', b === btn));
    }));
  });
  const stNotesEl = document.getElementById('sessionStudentNotes');
  if (stNotesEl) stNotesEl.addEventListener('change', () => saveStudentExtra(student.id, { notes: stNotesEl.value.trim() }));

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

// Symbols the teacher may need when correcting a transcription by hand.
const IPA_SYMBOLS = ['ə', 'ɪ', 'æ', 'ʌ', 'ʊ', 'ɒ', 'ɔː', 'iː', 'uː', 'ɜː', 'ɑː', 'ʃ', 'ʒ', 'θ', 'ð', 'ŋ', 'tʃ', 'dʒ', 'ˈ', 'ˌ'];

function addSheetWordRow(container, focus, value) {
  const v = value || {};
  const row = document.createElement('div');
  row.className = 'sheet-row sheet-row--word';
  row.innerHTML = `
    <input type="text" class="sheet-word" placeholder="word / expression" autocomplete="off" value="${escapeAttrLite(v.word || '')}" />
    <div class="sheet-pron-wrap">
      <div class="sheet-pron-line">
        <input type="text" class="sheet-pron" placeholder="word to improve" autocomplete="off" spellcheck="false"
          title="Escreva a palavra e saia do campo: a fonética aparece. Você pode editar à mão — a correção fica salva." value="${escapeAttrLite(v.pron || '')}" />
        <button type="button" class="sheet-pron-btn sheet-pron-redo" tabindex="-1" title="Buscar a fonética de novo (ignora correção salva e estimativa)" aria-label="Buscar a fonética de novo">↻</button>
        <span class="sheet-pron-edit" title="Você pode editar a transcrição à mão. A correção fica salva e será usada nas próximas vezes." aria-label="Editável">✎</span>
      </div>
      <div class="sheet-pron-hint" hidden></div>
      <div class="sheet-ipa-bar" hidden>${IPA_SYMBOLS.map(s => `<button type="button" class="sheet-ipa-sym" data-sym="${s}" tabindex="-1">${s}</button>`).join('')}</div>
    </div>
    <button type="button" class="sheet-row-del" aria-label="Remover linha" title="Remover">✕</button>
  `;
  wireSheetRow(row, container, () => addSheetWordRow(container, true));
  wireAutoPronunciation(row);
  container.appendChild(row);
  if (focus) row.querySelector('input').focus();
}

// The right-hand column holds only the words the student must improve.
// Typing one and leaving the field puts its phonetic transcription right
// beside it ("home /həʊm/"). Any word gets one (api/ipa.js, then the local
// ipaG2p.js guess, flagged "aproximada"). The teacher can edit the text between
// the slashes at any time: the correction is remembered per word (ipa_custom)
// and used first from then on. A transcription typed by hand is left as is.
function wireAutoPronunciation(row) {
  if (typeof lookupIpaDetailed !== 'function') return;
  const pronEl = row.querySelector('.sheet-pron');
  const hint = row.querySelector('.sheet-pron-hint');
  const bar = row.querySelector('.sheet-ipa-bar');
  const redo = row.querySelector('.sheet-pron-redo');
  const idle = pronEl.placeholder;

  const setHint = (kind) => {
    if (kind === 'approx') {
      hint.hidden = false; hint.className = 'sheet-pron-hint is-approx';
      hint.textContent = '≈ aproximada — confira e corrija se precisar';
    } else if (kind === 'custom') {
      hint.hidden = false; hint.className = 'sheet-pron-hint is-custom';
      hint.textContent = '✓ sua correção (salva para as próximas vezes)';
    } else {
      hint.hidden = true; hint.textContent = '';
    }
  };
  const remember = (raw, word, ipa) => {
    pronEl.dataset.word = word;
    pronEl.dataset.filled = ipa || '';
    pronEl.dataset.last = raw;
  };

  // A row restored from a saved sheet already shows "word /ipa/".
  const first = ipaSplit(pronEl.value);
  if (first.ipa && first.word) {
    remember(pronEl.value.trim(), first.word, first.ipa);
    if (getIpaCustom(first.word) === first.ipa) setHint('custom');
    else if (first.ipa === ipaApprox(first.word)) setHint('approx');
  }

  async function lookup(word, fresh) {
    const raw = pronEl.value.trim();
    pronEl.dataset.word = word;
    pronEl.dataset.last = raw;
    pronEl.placeholder = 'buscando…';
    let r = null;
    try { r = await lookupIpaDetailed(word, { fresh }); } catch (e) { r = null; }
    pronEl.placeholder = idle;
    if (pronEl.value.trim() !== raw) return;                      // she kept typing: drop this answer
    if (r && r.ipa) {
      pronEl.value = word + ' ' + r.ipa;
      remember(pronEl.value.trim(), word, r.ipa);
      setHint(r.source === 'custom' ? 'custom' : r.approx ? 'approx' : null);
    } else {
      setHint(null);
    }
  }

  function process() {
    const raw = pronEl.value.trim();
    if (raw === (pronEl.dataset.last || '')) return;
    if (!raw) { remember('', '', ''); delete pronEl.dataset.word; setHint(null); return; }
    const sp = ipaSplit(raw);
    if (!sp.word) { pronEl.dataset.last = raw; return; }           // only "/…/": nothing to look up
    if (sp.ipa) {
      const sameWord = pronEl.dataset.word === sp.word;
      const untouched = !!pronEl.dataset.filled && sp.ipa === pronEl.dataset.filled;
      if (sameWord || !untouched) {
        // She typed or corrected the transcription: keep it and remember it for this word.
        if (!(sameWord && untouched)) { saveIpaCustom(sp.word, sp.ipa); setHint('custom'); }
        remember(raw, sp.word, sp.ipa);
        return;
      }
      // Same old transcription but a new word: look the new word up.
      pronEl.value = sp.word;
    }
    lookup(sp.word, false);
  }
  pronEl.addEventListener('change', process);
  pronEl.addEventListener('blur', () => {
    process();
    setTimeout(() => { if (document.activeElement !== pronEl) bar.hidden = true; }, 160);
  });
  pronEl.addEventListener('focus', () => { bar.hidden = false; });

  redo.addEventListener('click', () => {
    const word = ipaSplit(pronEl.value).word;
    if (!word) return;
    removeIpaCustom(word);
    pronEl.value = word;
    lookup(word, true);
  });

  // IPA symbol buttons: insert at the cursor without taking focus from the field.
  const keepFocus = (e) => { if (e.target.closest('.sheet-ipa-sym')) e.preventDefault(); };
  bar.addEventListener('pointerdown', keepFocus);
  bar.addEventListener('mousedown', keepFocus);
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('.sheet-ipa-sym');
    if (!b) return;
    const sym = b.dataset.sym;
    const s = pronEl.selectionStart == null ? pronEl.value.length : pronEl.selectionStart;
    const en = pronEl.selectionEnd == null ? s : pronEl.selectionEnd;
    pronEl.value = pronEl.value.slice(0, s) + sym + pronEl.value.slice(en);
    pronEl.focus();
    pronEl.setSelectionRange(s + sym.length, s + sym.length);
  });
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

// A group class counts as attended when at least one member came.
function sheetPresent(sheet) {
  return Array.isArray(sheet.attendance) && sheet.attendance.length
    ? sheet.attendance.some(a => a.present)
    : drawerAttendance === 'present';
}

function gatherSheetFields() {
  const words = [...document.querySelectorAll('#sessionWords .sheet-row')]
    .map(r => ({ word: r.querySelector('.sheet-word').value.trim(), pron: r.querySelector('.sheet-pron').value.trim() }))
    .filter(w => w.word || w.pron);
  const homework = [...document.querySelectorAll('#sessionHomework .sheet-hw')]
    .map(i => i.value.trim())
    .filter(Boolean);
  const classNumber = parseInt(document.getElementById('sessionClassNo').value, 10) || null;
  const textEl = document.getElementById('sessionText');
  const text = textEl ? textEl.value.trim() : '';
  const attendance = [...document.querySelectorAll('[data-group-member]')]
    .map(box => ({ name: box.dataset.groupMember, present: drawerGroupAtt[box.dataset.groupMember] !== 'absent' }));
  return { classNumber, words, homework, text, ...(attendance.length ? { attendance } : {}) };
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
    present: sheetPresent(sheet),
    topicLabel,
    notes,
    sheet,
    stats: { xp: acc.xp, stars: acc.stars },
    createdAt: Date.now(),
  };
  sessions.push(record);
  saveSessions(student.id, sessions);
  if (typeof hwSyncClassHomework === 'function') hwSyncClassHomework(student, record);
  resetCurrentSessionAccumulator(student.id);
  drawerAttendance = 'present';
  drawerGroupAtt = {};

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
  const record = { ...sessions[idx], ...fields, present: sheetPresent(fields.sheet), editedAt: Date.now() };
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

  if (typeof hwSyncClassHomework === 'function') {
    const owner = (targetId && targetId !== student.id && loadStudents().find(x => x.id === targetId)) || student;
    if (owner !== student) hwSyncClassHomework(student, { ...record, sheet: { homework: [] } });   // drops it from the old student
    hwSyncClassHomework(owner, record);
  }
  drawerEditingId = null;
  drawerAttendance = 'present';
  drawerGroupAtt = {};
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
