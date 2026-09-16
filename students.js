/* ==========================================================================
   IGenglishschool — Student Management (CRUD + localStorage persistence)
   ========================================================================== */

// Logical keys — IGStore namespaces them per signed-in teacher.
const STUDENTS_KEY = 'students';
const ACTIVE_STUDENT_KEY = 'active_student';
const PROGRESS_KEY_PREFIX = 'progress_';

const DEFAULT_STUDENTS = [
  { id: 's1', name: 'Arthur', age: 3, levelId: 'a0', tier: 'kids', levelLabel: 'Kids (A0)', color: '#FF6B6B', avatar: '🚗' },
  { id: 's2', name: 'Tom', age: 5, levelId: 'a0', tier: 'kids', levelLabel: 'Kids (A0)', color: '#4ECDC4', avatar: '🚀' },
  { id: 's3', name: 'Ravi', age: 6, levelId: 'a0', tier: 'kids', levelLabel: 'Kids (A0)', color: '#FFE66D', avatar: '🦖' },
  { id: 's4', name: 'Théo', age: 7, levelId: 'a1', tier: 'juniors', levelLabel: 'Juniors (A1)', color: '#2EC4B6', avatar: '🦖' },
  { id: 's5', name: 'Jasmine', age: 7, levelId: 'a1', tier: 'juniors', levelLabel: 'Juniors (A1)', color: '#FF9F1C', avatar: '🌸' },
  { id: 's6', name: 'Letícia', age: 8, levelId: 'a1', tier: 'juniors', levelLabel: 'Juniors (A1)', color: '#A06CD5', avatar: '🌸' },
  { id: 's7', name: 'Aninha', age: 10, levelId: 'a1', tier: 'juniors', levelLabel: 'Juniors (A1)', color: '#FF758F', avatar: '🎨' },
  { id: 's8', name: 'João Teles', age: 11, levelId: 'a2', tier: 'teens', levelLabel: 'Teens (A2)', color: '#1D3557', avatar: '⚽' },
  { id: 's9', name: 'Beatriz', age: 11, levelId: 'a2', tier: 'teens', levelLabel: 'Teens (A2)', color: '#457B9D', avatar: '🎧' },
  { id: 's10', name: 'Sofia', age: 11, levelId: 'a2', tier: 'teens', levelLabel: 'Teens (A2)', color: '#E63946', avatar: '⭐' },
  { id: 's11', name: 'Ana Clara', age: 12, levelId: 'a2', tier: 'teens', levelLabel: 'Teens (A2)', color: '#3A86FF', avatar: '📚' },
  { id: 's12', name: 'Heloize', age: 14, levelId: 'b1b2', tier: 'teens', levelLabel: 'Advanced (B1/B2)', color: '#6D597A', avatar: '🌙' },
];

// The 4 curriculum levels a student can be placed at. Editing a student's
// level here also drives which tier (kids/juniors/teens) their Live Class
// routine bar and curriculum tab defaults to.
const LEVEL_OPTIONS = [
  { id: 'a0', label: 'Kids A0', tier: 'kids', levelLabel: 'Kids (A0)' },
  { id: 'a1', label: 'Juniors A1', tier: 'juniors', levelLabel: 'Juniors (A1)' },
  { id: 'a2', label: 'Teens A2', tier: 'teens', levelLabel: 'Teens (A2)' },
  { id: 'b1', label: 'Teens B1', tier: 'teens', levelLabel: 'Teens (B1)' },
  { id: 'b1b2', label: 'Advanced B2/C1', tier: 'teens', levelLabel: 'Advanced (B2/C1)' },
];
function levelOption(levelId) {
  return LEVEL_OPTIONS.find(o => o.id === levelId) || LEVEL_OPTIONS[0];
}

// Backfills `levelId` for student records saved before this field existed,
// inferring it from the old tier/levelLabel so nothing already in a
// teacher's localStorage breaks.
function normalizeStudent(s) {
  if (s.levelId) return s;
  let levelId = 'a0';
  if (s.tier === 'juniors') levelId = 'a1';
  else if (s.tier === 'teens') levelId = /B1|Advanced/i.test(s.levelLabel || '') ? 'b1b2' : 'a2';
  return { ...s, levelId };
}

const DEFAULT_STICKERS = [
  { id: 'star', emoji: '⭐', name: 'First Star', threshold: 5 },
  { id: 'rocket', emoji: '🚀', name: 'Space Explorer', threshold: 10 },
  { id: 'trophy', emoji: '🏆', name: 'Champion', threshold: 20 },
  { id: 'rainbow', emoji: '🌈', name: 'Rainbow Star', threshold: 30 },
  { id: 'crown', emoji: '👑', name: 'Word Royalty', threshold: 45 },
  { id: 'unicorn', emoji: '🦄', name: 'Legendary Learner', threshold: 60 },
  { id: 'diamond', emoji: '💎', name: 'Diamond Mind', threshold: 80 },
  { id: 'medal', emoji: '🥇', name: 'Gold Medalist', threshold: 100 },
];

// ---------------------------------------------------------------------------
// STICKER BOOK — the teacher can change the emoji, paste a photo, rename a
// sticker or move the star threshold. Stored as a patch so a sticker she
// never touched keeps whatever the app ships.
// ---------------------------------------------------------------------------
const STICKERS_KEY = 'sticker_book';

function loadStickerOverrides() {
  const raw = IGStore.getJSON(STICKERS_KEY, null);
  if (!raw || typeof raw !== 'object') return { patches: {}, added: [], deleted: [] };
  return {
    patches: raw.patches && typeof raw.patches === 'object' ? raw.patches : {},
    added: Array.isArray(raw.added) ? raw.added : [],
    deleted: Array.isArray(raw.deleted) ? raw.deleted : [],
  };
}

function saveStickerOverrides(ov) { IGStore.setJSON(STICKERS_KEY, ov); }

// The live sticker list. Use this everywhere instead of DEFAULT_STICKERS.
function getStickers() {
  const ov = loadStickerOverrides();
  const deleted = new Set(ov.deleted);
  const list = DEFAULT_STICKERS
    .filter(s => !deleted.has(s.id))
    .map(s => (ov.patches[s.id] ? { ...s, ...ov.patches[s.id] } : s))
    .concat(ov.added.filter(s => !deleted.has(s.id)).map(s => (ov.patches[s.id] ? { ...s, ...ov.patches[s.id] } : s)));
  return list.sort((a, b) => (a.threshold || 0) - (b.threshold || 0));
}

function stickerIsCustom(id) {
  const ov = loadStickerOverrides();
  if (ov.added.some(s => s.id === id)) return 'new';
  return ov.patches[id] ? 'edited' : 'original';
}

function resetStickers() { IGStore.remove(STICKERS_KEY); }

// ---------------------------------------------------------------------------
// PERSISTENCE
// ---------------------------------------------------------------------------
function loadStudents() {
  try {
    const raw = IGStore.getJSON(STUDENTS_KEY, null);
    if (Array.isArray(raw) && raw.length > 0) {
      const normalized = raw.map(normalizeStudent);
      if (normalized.some((s, i) => s !== raw[i])) saveStudents(normalized);
      return normalized;
    }
  } catch (e) {}
  saveStudents(DEFAULT_STUDENTS);
  return DEFAULT_STUDENTS.map(s => ({ ...s }));
}

function saveStudents(list) {
  IGStore.setJSON(STUDENTS_KEY, list);
}

function resetStudentsToDefault() {
  const fresh = DEFAULT_STUDENTS.map(s => ({ ...s }));
  saveStudents(fresh);
  return fresh;
}

function getActiveStudentId() {
  return IGStore.getRaw(ACTIVE_STUDENT_KEY);
}

function setActiveStudentId(id) {
  IGStore.setRaw(ACTIVE_STUDENT_KEY, id);
}

function loadProgress(studentId) {
  try {
    const p = IGStore.getJSON(PROGRESS_KEY_PREFIX + studentId, null);
    if (p) return { stars: 0, xp: 0, stickers: [], ...p };
  } catch (e) {}
  return { stars: 0, xp: 0, stickers: [] };
}

function saveProgress(studentId, progress) {
  IGStore.setJSON(PROGRESS_KEY_PREFIX + studentId, progress);
}

function checkStickerUnlocks(studentId, progress) {
  getStickers().forEach(s => {
    if (progress.stars >= s.threshold && !progress.stickers.includes(s.id)) {
      progress.stickers.push(s.id);
    }
  });
  return progress;
}

// "Today's Class" shows what the child earned in THIS lesson, so every star
// has to be logged there — not just the ones a game handed out. setStars and
// addStars are the only two places a star total ever changes, so logging the
// real difference here covers the games, the Live Scoreboard's +/- buttons
// and its exact-total box alike.
function recordStarDelta(studentId, delta) {
  if (!delta) return;
  if (typeof recordSessionProgress === 'function') recordSessionProgress(studentId, 0, delta);
}

// Set the star count outright. The +/- buttons nudge; the Scoreboard's
// number box uses this so a teacher can fix a total in one go.
// Stickers already earned are deliberately NOT taken back when the number
// goes down — a child who unlocked one should not watch it disappear.
function setStars(studentId, value) {
  const p = loadProgress(studentId);
  const before = p.stars;
  p.stars = Math.max(0, Math.round(Number(value) || 0));
  checkStickerUnlocks(studentId, p);
  saveProgress(studentId, p);
  recordStarDelta(studentId, p.stars - before);
  return p;
}

function addStars(studentId, delta) {
  const p = loadProgress(studentId);
  const before = p.stars;
  p.stars = Math.max(0, p.stars + delta);
  checkStickerUnlocks(studentId, p);
  saveProgress(studentId, p);
  // The clamp at 0 means the effective change can be smaller than the requested delta.
  recordStarDelta(studentId, p.stars - before);
  return p;
}

function addXP(studentId, delta) {
  const p = loadProgress(studentId);
  p.xp = Math.max(0, p.xp + delta);
  saveProgress(studentId, p);
  return p;
}

// Global hook other modules (games, practice arena) call after a win —
// guarded with `typeof` checks wherever it's invoked, since this file may
// not have loaded yet at that call site's definition time.
function awardProgress(xp, stars) {
  const id = getActiveStudentId();
  if (!id) return;
  if (xp) addXP(id, xp);
  if (stars) addStars(id, stars);   // addStars logs the stars to the session itself
  refreshHeaderForActiveStudent();
  // Only the XP is left to log — double-counting the stars here is exactly
  // the bug that made the Scoreboard's stars invisible in "Today's Class".
  if (typeof recordSessionProgress === 'function') recordSessionProgress(id, xp || 0, 0);
}

// Age-based split used by the Live Lesson cockpit's routine bar: ages 3-8
// get the Hello/Bye Bye song routine, older students get a chit-chat warm-up.
function isYoungLearner(student) {
  return student.age <= 8;
}

function getActiveStudent() {
  const students = loadStudents();
  return students.find(s => s.id === getActiveStudentId()) || students[0];
}

// ---------------------------------------------------------------------------
// HEADER — active student chip, dropdown, greeting banner
// ---------------------------------------------------------------------------
function tierMeta(tier) {
  return { kids: { icon: '🧸', label: 'Kids' }, juniors: { icon: '✏️', label: 'Juniors' }, teens: { icon: '🎧', label: 'Teens' } }[tier] || { icon: '🎓', label: '' };
}

function renderProfileList() {
  const students = loadStudents();
  const activeId = getActiveStudentId();
  const list = document.getElementById('profileList');
  // The student list scrolls on its own; the three action buttons live in a
  // pinned footer below it. With them inside the list, a teacher with a dozen
  // students had to scroll past everyone to reach "Add New Student" — and the
  // last students were cut off by the bottom of the window entirely.
  list.innerHTML = students.map(s => `
    <div class="profile-option-row">
      <button class="profile-option ${s.id === activeId ? 'active' : ''}" data-student="${s.id}" role="option">
        <span class="option-avatar" style="background:${s.color}">${s.avatar}</span>
        <span>
          <span class="option-name">${escapeHtmlLite(s.name)}</span>
          <span class="option-level">${escapeHtmlLite(s.levelLabel)}</span>
        </span>
      </button>
      <button class="profile-edit-btn" data-edit-student="${s.id}" aria-label="Edit ${escapeHtmlLite(s.name)}" title="Edit student">✏️</button>
    </div>
  `).join('') || '<p class="profile-empty">No students yet — add your first one below.</p>';

  const actions = document.getElementById('profileActions');
  actions.innerHTML = `
    <button class="profile-add-btn" id="addStudentQuickBtn">+ Add New Student</button>
    <button class="profile-manage-btn" id="reportsQuickBtn">📊 Relatório Trimestral</button>
    <button class="profile-manage-btn" id="manageStudentsBtn">⚙️ Manage All Students</button>
  `;

  list.querySelectorAll('[data-student]').forEach(btn => {
    btn.addEventListener('click', () => selectStudent(btn.dataset.student));
  });
  list.querySelectorAll('[data-edit-student]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeProfileDropdown();
      openStudentForm(students.find(s => s.id === btn.dataset.editStudent));
    });
  });
  actions.querySelector('#addStudentQuickBtn').addEventListener('click', () => {
    closeProfileDropdown();
    openStudentForm();
  });
  actions.querySelector('#reportsQuickBtn').addEventListener('click', () => {
    closeProfileDropdown();
    if (typeof openReportsModal === 'function') openReportsModal();
  });
  actions.querySelector('#manageStudentsBtn').addEventListener('click', () => {
    closeProfileDropdown();
    openStudentManager();
  });
}

function applyActiveStudent(student) {
  document.documentElement.style.setProperty('--accent-color', student.color);
  document.getElementById('profileAvatar').textContent = student.avatar;
  document.getElementById('profileName').textContent = student.name;
  document.getElementById('profileLevel').textContent = student.levelLabel;

  const greeting = document.getElementById('studentGreeting');
  if (greeting) {
    const meta = tierMeta(student.tier);
    greeting.style.setProperty('--accent-color', student.color);
    greeting.innerHTML = `<span class="greeting-avatar">${student.avatar}</span> Hi <strong>${escapeHtmlLite(student.name)}</strong>! Ready for some ${meta.label} English today? <span class="greeting-stars" id="greetingStars"></span>`;
    renderGreetingStars(student.id);
  }
}

function renderGreetingStars(studentId) {
  const el = document.getElementById('greetingStars');
  if (!el) return;
  const p = loadProgress(studentId);
  el.textContent = `⭐ ${p.stars}`;
}

// Updates the header chip + greeting banner. Safe to call frequently (every
// XP/star award does), since it only touches small text nodes.
function refreshHeaderForActiveStudent() {
  const students = loadStudents();
  const activeId = getActiveStudentId();
  const student = students.find(s => s.id === activeId) || students[0];
  if (student) applyActiveStudent(student);
}

// Full re-renders (cockpit routine bar, session drawer form) — these must
// ONLY run when the active student actually changes. Running them on every
// awardProgress() tick would wipe in-progress notes and reshuffle the
// warm-up question mid-lesson.
function onActiveStudentChanged() {
  refreshHeaderForActiveStudent();
  if (typeof refreshLiveClassCockpit === 'function') refreshLiveClassCockpit();
  if (typeof refreshSessionDrawerIfOpen === 'function') refreshSessionDrawerIfOpen();
}

function selectStudent(id) {
  setActiveStudentId(id);
  renderProfileList();
  onActiveStudentChanged();
  closeProfileDropdown();
}

function escapeHtmlLite(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function initStudents() {
  const students = loadStudents();
  let activeId = getActiveStudentId();
  if (!activeId || !students.find(s => s.id === activeId)) {
    activeId = students[0].id;
    setActiveStudentId(activeId);
  }
  renderProfileList();
  onActiveStudentChanged();
}

// ---------------------------------------------------------------------------
// STUDENT MANAGER MODAL (CRUD)
// ---------------------------------------------------------------------------
function openStudentManager() {
  const students = loadStudents();
  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">👥 Manage Students</h3>
      <div class="game-btn-row" style="margin-bottom:18px">
        <button class="game-btn" id="addStudentBtn">+ New Student</button>
        <button class="game-btn secondary danger" id="resetStudentsBtn">↺ Reset to Default List</button>
      </div>
      <div class="student-manager-grid" id="studentManagerGrid"></div>
    </div>
  `, true);

  paintStudentManagerGrid();

  document.getElementById('addStudentBtn').addEventListener('click', () => openStudentForm(null, openStudentManager));
  document.getElementById('resetStudentsBtn').addEventListener('click', () => {
    if (confirm('Reset the student list to the default 12 students? Custom students you added will be removed (progress stats are kept).')) {
      resetStudentsToDefault();
      const activeId = getActiveStudentId();
      if (!loadStudents().find(s => s.id === activeId)) setActiveStudentId(DEFAULT_STUDENTS[0].id);
      paintStudentManagerGrid();
      renderProfileList();
      onActiveStudentChanged();
    }
  });
}

function paintStudentManagerGrid() {
  const students = loadStudents();
  const grid = document.getElementById('studentManagerGrid');
  grid.innerHTML = students.map(s => `
    <div class="student-manager-card" style="--accent-color:${s.color}">
      <span class="student-card-avatar" style="background:${s.color}">${s.avatar}</span>
      <div class="student-card-info">
        <strong>${escapeHtmlLite(s.name)}</strong>
        <span>${s.age} yrs · ${escapeHtmlLite(s.levelLabel)}</span>
      </div>
      <div class="student-card-actions">
        <button class="gm-remove-row" data-edit-student="${s.id}" aria-label="Edit">✏️</button>
        <button class="gm-remove-row" data-delete-student="${s.id}" aria-label="Delete">🗑️</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-edit-student]').forEach(btn => {
    btn.addEventListener('click', () => openStudentForm(students.find(s => s.id === btn.dataset.editStudent), openStudentManager));
  });
  grid.querySelectorAll('[data-delete-student]').forEach(btn => {
    btn.addEventListener('click', () => {
      const student = students.find(s => s.id === btn.dataset.deleteStudent);
      if (!student) return;
      if (students.length <= 1) { alert("You need at least one student — add a new one before deleting this one."); return; }
      if (confirm(`Delete "${student.name}"? This can't be undone.`)) {
        const remaining = students.filter(s => s.id !== student.id);
        saveStudents(remaining);
        if (getActiveStudentId() === student.id) setActiveStudentId(remaining[0].id);
        paintStudentManagerGrid();
        renderProfileList();
        onActiveStudentChanged();
      }
    });
  });
}

// `onDone` is called after Save/Delete/Cancel — pass `openStudentManager` when
// launched from the full grid so it returns there, or leave it as the default
// (just close) when launched from the quick header dropdown.
function openStudentForm(existing, onDone) {
  const isEdit = Boolean(existing);
  const returnTo = onDone || closeModal;
  const state = existing
    ? { ...existing }
    : { id: 'st' + Date.now().toString(36), name: '', age: 6, levelId: 'a0', color: '#8e6d86', avatar: '⭐' };

  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">${isEdit ? '✏️ Edit Student' : '+ New Student'}</h3>
      <div class="gm-form-field">
        <label for="stName">Name</label>
        <input type="text" id="stName" placeholder="e.g. Maya" value="${escapeAttrLite(state.name)}" />
      </div>
      <div class="gm-form-field">
        <label for="stAge">Age</label>
        <input type="text" id="stAge" inputmode="numeric" placeholder="e.g. 8" value="${escapeAttrLite(state.age)}" />
      </div>
      <div class="gm-form-field">
        <label for="stLevel">Level</label>
        <select id="stLevel">
          ${LEVEL_OPTIONS.map(o => `<option value="${o.id}" ${o.id === state.levelId ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
      <div class="gm-form-field">
        <label for="stAvatar">Avatar emoji</label>
        <input type="text" id="stAvatar" class="gm-input-emoji" style="max-width:100px" placeholder="⭐" value="${escapeAttrLite(state.avatar)}" />
      </div>
      <div class="gm-form-field">
        <label for="stColor">Accent color</label>
        <input type="color" id="stColor" value="${state.color}" style="height:44px;width:100%;padding:4px;border-radius:var(--radius-sm);border:2px solid var(--border);" />
      </div>
      <p class="gm-form-error" id="stFormError" hidden></p>
      <div class="game-btn-row" style="margin-top:18px">
        <button class="game-btn" id="stSaveBtn">💾 Save Student</button>
        <button class="game-btn secondary" id="stCancelBtn">Cancel</button>
        ${isEdit ? `<button class="game-btn secondary danger" id="stDeleteBtn">🗑️ Delete</button>` : ''}
      </div>
    </div>
  `);

  document.getElementById('stSaveBtn').addEventListener('click', () => {
    const name = document.getElementById('stName').value.trim();
    const age = parseInt(document.getElementById('stAge').value, 10);
    const levelId = document.getElementById('stLevel').value;
    const avatar = document.getElementById('stAvatar').value.trim() || '⭐';
    const color = document.getElementById('stColor').value;

    const errorEl = document.getElementById('stFormError');
    if (!name) return showFormErrorLite(errorEl, 'Please enter the student\'s name.');
    if (!age || age < 1 || age > 18) return showFormErrorLite(errorEl, 'Please enter a valid age (1-18).');

    const opt = levelOption(levelId);
    const students = loadStudents();
    const record = { id: state.id, name, age, levelId, tier: opt.tier, levelLabel: opt.levelLabel, avatar, color };
    const idx = students.findIndex(s => s.id === state.id);
    if (idx >= 0) students[idx] = record; else students.push(record);
    saveStudents(students);

    if (!getActiveStudentId()) setActiveStudentId(record.id);
    renderProfileList();
    onActiveStudentChanged();
    returnTo();
  });

  document.getElementById('stCancelBtn').addEventListener('click', returnTo);

  if (isEdit) {
    document.getElementById('stDeleteBtn').addEventListener('click', () => {
      const students = loadStudents();
      if (students.length <= 1) { alert("You need at least one student — add a new one before deleting this one."); return; }
      if (!confirm(`Delete "${state.name}"? This can't be undone.`)) return;
      const remaining = students.filter(s => s.id !== state.id);
      saveStudents(remaining);
      if (getActiveStudentId() === state.id) setActiveStudentId(remaining[0].id);
      renderProfileList();
      onActiveStudentChanged();
      returnTo();
    });
  }
}

function showFormErrorLite(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function escapeAttrLite(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// ---------------------------------------------------------------------------
// STICKER BOOK
// ---------------------------------------------------------------------------
function renderStickerBookHTML(studentId) {
  const progress = loadProgress(studentId);
  const stickers = getStickers();
  return `
    <div class="sticker-grid">
      ${stickers.map(s => {
        const unlocked = progress.stickers.includes(s.id);
        // A pasted photo wins over the emoji; igNormalizeWord means an emoji
        // typed into the photo box still shows as an emoji rather than a
        // broken image.
        const art = unlocked
          ? igWordVisualHTML({ en: s.name, emoji: s.emoji, image: s.image || '' }, 'sticker-visual')
          : '<span class="sticker-emoji">🔒</span>';
        return `
          <div class="sticker-slot ${unlocked ? 'unlocked' : 'locked'}" title="${escapeAttrLite(unlocked ? s.name : `Unlocks at ${s.threshold} stars`)}">
            ${art}
            <span class="sticker-name">${unlocked ? escapeHtmlLite(s.name) : `${s.threshold} ⭐`}</span>
          </div>
        `;
      }).join('')}
    </div>
    <p class="sticker-progress-note">${progress.stars} stars collected — keep playing to unlock more!</p>
  `;
}
