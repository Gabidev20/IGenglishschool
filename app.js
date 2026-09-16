/* ==========================================================================
   IGenglishschool — Data + App Logic
   ========================================================================== */

// TIERS and LEVELS live in topicsData.js (the shipped curriculum) and are
// then merged with the teacher's own edits by contentStore.js — both load
// before this file. See topicsData.js's header for the data schema and how
// to add new topics/vocabulary.

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function levelSoftVar(hex) {
  return hex + '22';
}

// Renders a real photo with an onerror->emoji fallback, or — when a topic
// has no `image` at all (grammar topics and other abstract subjects) — the
// emoji directly, so the browser never issues a doomed request for it.
function mediaMarkup(image, emoji, alt, tag, className) {
  const safeEmoji = igEscapeHtml(emoji || '🖼️');
  if (!image) return `<${tag} class="${className} emoji-fallback">${safeEmoji}</${tag}>`;
  // The topic grid renders every level's cards at once, so these ARE worth
  // deferring — unlike the handful of pictures on a game board.
  return `<img class="${className}" src="${igEscapeHtml(image)}" alt="${igEscapeHtml(alt)}" loading="lazy"
    data-fallback="${safeEmoji}" data-fallback-tag="${tag}" data-fallback-class="${igEscapeHtml(className)}"
    onerror="igImageFallback(this)" />`;
}

// ---------------------------------------------------------------------------
// PROFILE SWITCHER (dropdown open/close chrome — student data/rendering
// lives in students.js, which owns #profileList and the header chip fields)
// ---------------------------------------------------------------------------
const profileSwitcher = document.getElementById('profileSwitcher');
const profileChipBtn = document.getElementById('profileChipBtn');

function openProfileDropdown() {
  profileSwitcher.classList.add('open');
  profileChipBtn.setAttribute('aria-expanded', 'true');
}
function closeProfileDropdown() {
  profileSwitcher.classList.remove('open');
  profileChipBtn.setAttribute('aria-expanded', 'false');
}

profileChipBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  profileSwitcher.classList.contains('open') ? closeProfileDropdown() : openProfileDropdown();
});

document.addEventListener('click', (e) => {
  if (!profileSwitcher.contains(e.target)) closeProfileDropdown();
});

initStudents();

// ---------------------------------------------------------------------------
// HAMBURGER / MOBILE NAV
// ---------------------------------------------------------------------------
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mainNav = document.getElementById('mainNav');

hamburgerBtn.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('mobile-open');
  hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
  mainNav.style.display = isOpen ? 'flex' : '';
  if (isOpen) {
    mainNav.style.position = 'fixed';
    mainNav.style.top = 'var(--header-h)';
    mainNav.style.left = '16px';
    mainNav.style.right = '16px';
    mainNav.style.flexDirection = 'column';
    mainNav.style.background = 'var(--surface)';
    mainNav.style.boxShadow = 'var(--shadow-lg)';
    mainNav.style.padding = '10px';
  } else {
    mainNav.removeAttribute('style');
  }
});

mainNav.addEventListener('click', (e) => {
  if (e.target.matches('.nav-link') && mainNav.classList.contains('mobile-open')) {
    mainNav.classList.remove('mobile-open');
    mainNav.removeAttribute('style');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }
});

// ---------------------------------------------------------------------------
// HEADER SCROLL STATE + ACTIVE NAV LINK
// ---------------------------------------------------------------------------
const siteHeader = document.getElementById('siteHeader');
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const observedSections = ['live-class', 'levels', 'games', 'songs', 'game-maker']
  .map(id => document.getElementById(id))
  .filter(Boolean);

window.addEventListener('scroll', () => {
  siteHeader.classList.toggle('scrolled', window.scrollY > 12);
}, { passive: true });

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => link.classList.toggle('active', link.dataset.section === entry.target.id));
    }
  });
}, { rootMargin: '-40% 0px -50% 0px' });

observedSections.forEach(section => sectionObserver.observe(section));

// ---------------------------------------------------------------------------
// TILT CARDS (hero)
// ---------------------------------------------------------------------------
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(600px) rotateX(${y * -10}deg) rotateY(${x * 10}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ---------------------------------------------------------------------------
// SPIRAL CURRICULUM — tier tabs (Kids/Juniors/Teens) group the levels that
// share an age band; each topic card still shows its precise level code.
// ---------------------------------------------------------------------------
const levelTabsEl = document.getElementById('levelTabs');
const topicsGridEl = document.getElementById('topicsGrid');
const levelFilterBarEl = document.getElementById('levelFilterBar');

let activeTierId = TIERS[0].id;
let activeLevelFilter = 'all';

function renderLevelTabs() {
  levelTabsEl.innerHTML = TIERS.map(tier => `
    <button class="level-tab ${tier.id === activeTierId ? 'active' : ''}"
            style="--tab-color:${tier.color}"
            data-tier="${tier.id}" role="tab" aria-selected="${tier.id === activeTierId}">
      <span class="tab-icon">${tier.icon}</span>
      ${tier.label} <span class="tab-age">(${tier.ages})</span>
    </button>
  `).join('');
}

function renderLevelFilters() {
  const levelsInTier = LEVELS.filter(l => l.tier === activeTierId);
  const hasMultipleLevels = levelsInTier.length > 1;

  if (!hasMultipleLevels) {
    levelFilterBarEl.hidden = true;
    return;
  }

  levelFilterBarEl.hidden = false;
  levelFilterBarEl.innerHTML = `
    <button class="level-filter-btn ${activeLevelFilter === 'all' ? 'active' : ''}" data-level="all">
      All Levels
    </button>
    ${levelsInTier.map(level => `
      <button class="level-filter-btn ${activeLevelFilter === level.id ? 'active' : ''}"
              data-level="${level.id}"
              style="--filter-color:${level.color}">
        ${level.code} — ${level.name}
      </button>
    `).join('')}
  `;
}

function renderTopics() {
  let levelsInTier = LEVELS.filter(l => l.tier === activeTierId);

  if (activeLevelFilter !== 'all') {
    levelsInTier = levelsInTier.filter(l => l.id === activeLevelFilter);
  }

  const cards = [];
  levelsInTier.forEach(level => level.topics.forEach(topic => cards.push({ level, topic })));

  topicsGridEl.innerHTML = cards.map(({ level, topic }) => `
    <button class="topic-card" data-level="${level.id}" data-topic="${topic.id}">
      <span class="topic-media">
        ${mediaMarkup(topic.image, topic.emoji, topic.title, 'span', '')}
      </span>
      <span class="topic-body">
        <span class="level-pill" style="background:${levelSoftVar(level.color)};color:${level.color}">${level.code}</span>
        <h4>${topic.title}</h4>
        <p>${topic.description}</p>
      </span>
    </button>
  `).join('');
}

function setActiveTier(id) {
  activeTierId = id;
  activeLevelFilter = 'all';
  renderLevelTabs();
  renderLevelFilters();
  renderTopics();
}

levelTabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tier]');
  if (btn) setActiveTier(btn.dataset.tier);
});

levelFilterBarEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-level]');
  if (btn) {
    activeLevelFilter = btn.dataset.level;
    renderLevelFilters();
    renderTopics();
  }
});

topicsGridEl.addEventListener('click', (e) => {
  const card = e.target.closest('.topic-card');
  if (card) openTopicModal(card.dataset.level, card.dataset.topic);
});

renderLevelTabs();
renderLevelFilters();
renderTopics();

// ---------------------------------------------------------------------------
// MODAL SYSTEM (base container reused by topic details, games, lesson plans)
// ---------------------------------------------------------------------------
const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalEl = document.querySelector('.modal');

let activeGameType = 'hangman';

// Game/editor modals open in the large frame. The teacher can push them all
// the way to full screen for a projector or a shared screen, and that choice
// sticks across modals for the rest of the session.
const MODAL_FULLSCREEN_KEY = 'hopscotch_modal_fullscreen';
let modalFullscreen = localStorage.getItem(MODAL_FULLSCREEN_KEY) === '1';
const modalExpandBtn = document.getElementById('modalExpandBtn');

function applyModalFullscreen() {
  const on = modalFullscreen && modalEl.classList.contains('modal--game');
  modalEl.classList.toggle('modal--fullscreen', on);
  modalOverlay.classList.toggle('is-fullscreen', on);
  if (modalExpandBtn) {
    modalExpandBtn.textContent = modalFullscreen ? '🗗' : '⛶';
    modalExpandBtn.title = modalFullscreen ? 'Exit full screen (F)' : 'Full screen (F)';
    modalExpandBtn.hidden = !modalEl.classList.contains('modal--game');
  }
}

function toggleModalFullscreen() {
  modalFullscreen = !modalFullscreen;
  localStorage.setItem(MODAL_FULLSCREEN_KEY, modalFullscreen ? '1' : '0');
  applyModalFullscreen();
  window.dispatchEvent(new Event('resize'));
}

if (modalExpandBtn) modalExpandBtn.addEventListener('click', toggleModalFullscreen);

function openModal(html, wide) {
  modalBody.innerHTML = html;
  modalBody.scrollTop = 0;
  modalOverlay.hidden = false;
  modalEl.classList.toggle('modal--game', Boolean(wide));
  // Mirrored onto the overlay so the phone stylesheet can drop the backdrop
  // gutter for game modals only, without needing :has() — which this project
  // has already been bitten by once.
  modalOverlay.classList.toggle('has-game-modal', Boolean(wide));
  applyModalFullscreen();
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  GameEngine.stopAll();
  if (typeof stopLearningModules === 'function') stopLearningModules();
  if (typeof LiveTools !== 'undefined') LiveTools.stopAll();
  if (typeof ArcadeGames !== 'undefined') ArcadeGames.stopAll();
  modalOverlay.hidden = true;
  modalBody.innerHTML = '';
  modalEl.classList.remove('modal--game', 'modal--fullscreen');
  modalOverlay.classList.remove('is-fullscreen', 'has-game-modal');
  document.body.style.overflow = '';
}

modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (modalOverlay.hidden) return;
  const typing = e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]');
  if (e.key === 'Escape') {
    // Escape inside a text field should let the field handle it first —
    // closing the modal there would throw away whatever was being typed.
    if (typing) { e.target.blur(); return; }
    closeModal();
    return;
  }
  if (!typing && (e.key === 'f' || e.key === 'F') && modalEl.classList.contains('modal--game')) {
    toggleModalFullscreen();
  }
});

function openTopicModal(levelId, topicId) {
  const level = LEVELS.find(l => l.id === levelId);
  const topic = level.topics.find(t => t.id === topicId);
  activeGameType = 'hangman';

  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb">${mediaMarkup(topic.image, topic.emoji, topic.title, 'span', '')}</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">${igEscapeHtml(topic.title)}</h3>
          <p class="modal-head-sub">
            <span class="level-pill" style="background:${levelSoftVar(level.color)};color:${level.color}">${igEscapeHtml(level.code)} · ${igEscapeHtml(level.name)}</span>
            <span class="modal-head-desc">${igEscapeHtml(topic.description)}</span>
          </p>
        </div>
      </div>

      <div class="modal-tabs" id="modalTabs"></div>
      <div id="modalPaneContent"></div>
    </div>
  `, true);

  const tabs = getModalTabs(level);
  document.getElementById('modalTabs').innerHTML = tabs.map((t, i) => `
    <button class="modal-tab ${i === 0 ? 'active' : ''}" data-pane="${t.id}">${t.icon} ${t.label}</button>
  `).join('');

  renderModalPane(tabs[0].id, level, topic);

  document.getElementById('modalTabs').querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.getElementById('modalTabs').querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      GameEngine.stopAll();
      stopLearningModules();
      renderModalPane(tab.dataset.pane, level, topic);
    });
  });
}

// The order is the student's route through a topic, not a menu: watch the
// explanation, play with it, then test yourself. Lesson Plan is the teacher's
// tab and stays at the end.
function getModalTabs(level) {
  const tabs = [
    { id: 'watch', label: 'Watch', icon: '📺' },
    { id: 'game', label: 'Game', icon: '🎮' },
    { id: 'quiz', label: 'Quiz', icon: '📝' },
    { id: 'reading', label: 'Reading', icon: '📖' },
    { id: 'practice', label: 'Practice', icon: '🏆' },
  ];
  if (level.tier !== 'teens') tabs.push({ id: 'phonics', label: 'Phonics', icon: '🔤' });
  tabs.push({ id: 'flashcards', label: 'Flashcards', icon: '🗂️' });
  tabs.push({ id: 'lesson', label: 'Lesson Plan', icon: '📘' });
  return tabs;
}

function renderModalPane(kind, level, topic) {
  const mountEl = document.getElementById('modalPaneContent');

  if (kind === 'watch') { renderWatchStation(mountEl, level, topic); return; }
  if (kind === 'quiz') { renderTopicQuiz(mountEl, level, topic); return; }
  if (kind === 'lesson') { mountEl.innerHTML = renderLessonPlanHTML(level, topic); return; }
  if (kind === 'reading') { renderReadingModule(mountEl, level, topic); return; }
  if (kind === 'practice') { renderPracticeArena(mountEl, level, topic); return; }
  if (kind === 'phonics') { renderPhonicsStation(mountEl, level, topic); return; }
  if (kind === 'flashcards') { renderFlashcards(mountEl, level, topic); return; }

  // kind === 'game'
  // Unscramble needs example sentences and Sort It needs grammar rules, so
  // the picker is built from what this topic can actually run. If the last
  // game played isn't one of them, fall back to the first that is.
  const available = gamesForTopic(topic);
  if (!available.some(g => g.id === activeGameType)) activeGameType = available[0].id;

  mountEl.innerHTML = `
    <div class="game-picker">
      ${available.map(g => `<button class="game-pick-btn ${g.id === activeGameType ? 'active' : ''}" data-game="${g.id}">${g.icon} ${g.label}</button>`).join('')}
    </div>
    <div class="game-mount" id="gameMount"></div>
  `;

  mountEl.querySelectorAll('.game-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeGameType = btn.dataset.game;
      mountEl.querySelectorAll('.game-pick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      GameEngine.mount(document.getElementById('gameMount'), topic, activeGameType);
    });
  });

  GameEngine.mount(document.getElementById('gameMount'), topic, activeGameType);
}

// ---------------------------------------------------------------------------
// LESSON PLAN GENERATOR (6-step template, tailored per topic)
// ---------------------------------------------------------------------------
function renderLessonPlanHTML(level, topic) {
  const words = (topic.words || []).slice(0, 4).map(w => w.en);
  const wordList = words.length ? words.join(', ') : topic.title;
  const isYoung = level.tier !== 'teens';

  const warmupStep = isYoung
    ? `Sing the <strong>Hello Song</strong> from the Live Class Cockpit and flash last class's picture cards for a 1-minute review.`
    : `Start with the 2-minute chit-chat warm-up from the Live Class Cockpit, then review last class's key vocabulary.`;
  const songStep = isYoung
    ? `Chant ${wordList} together to a simple clap rhythm — a quick sing-song moment keeps energy high.`
    : `Work ${wordList} naturally into a short conversation or role-play with the student.`;

  const steps = [
    { icon: '☀️', title: 'Warm-up', text: warmupStep },
    { icon: '🎓', title: 'Presentation', text: `Introduce ${topic.title.toLowerCase()} with the picture cards. Say ${wordList} — students repeat each word 3 times.` },
    { icon: '✍️', title: 'Practice', text: `Open the Game tab and play Memory or Match-up together as a whole class before students try alone.` },
    { icon: '🎵', title: 'Song', text: songStep },
    { icon: '🎮', title: 'Game', text: `Let students choose their own game from the Game tab — Hangman and Balloon Pop work great for a quick review round.` },
    { icon: '🏠', title: 'Homework', text: `Ask students to find or draw 2 things at home related to ${wordList} and bring them to share next class.` },
  ];

  return `
    <div class="lesson-plan">
      <p class="lesson-plan-intro">A ready-to-teach 6-step plan for <strong>${topic.title}</strong> (${level.code} · ${level.name}).</p>
      <ol class="lesson-steps">
        ${steps.map((s, i) => `
          <li class="lesson-step">
            <span class="lesson-step-num">${i + 1}</span>
            <span class="lesson-step-icon">${s.icon}</span>
            <div class="lesson-step-body">
              <h4>${s.title}</h4>
              <p>${s.text}</p>
            </div>
          </li>
        `).join('')}
      </ol>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// GAME MAKER — page section init
// ---------------------------------------------------------------------------
renderGameMaker(document.getElementById('gameMakerRoot'));
LiveTools.initFab();

const reportsNavBtn = document.getElementById('reportsNavBtn');
if (reportsNavBtn) reportsNavBtn.addEventListener('click', () => openReportsModal());

// ---------------------------------------------------------------------------
// CONTENT & GAMES EDITOR — entry points, plus the re-render hook so an edit
// is reflected everywhere (topic cards, level counts, class topic picker)
// without a page reload.
// ---------------------------------------------------------------------------
// Open the editor on whatever the teacher is already looking at: the level
// they filtered to, otherwise the first level of the active age tier.
function currentEditorLevelId() {
  if (activeLevelFilter !== 'all') return activeLevelFilter;
  const first = LEVELS.find(l => l.tier === activeTierId);
  return first ? first.id : (LEVELS[0] && LEVELS[0].id);
}

['editorNavBtn', 'editGamesBtn', 'editCurriculumBtn'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', () => openContentEditor(currentEditorLevelId()));
});

ContentStore.onChange(() => {
  // A deleted level filter must not leave the grid stuck on an empty view.
  if (activeLevelFilter !== 'all' && !LEVELS.some(l => l.id === activeLevelFilter)) activeLevelFilter = 'all';
  renderLevelTabs();
  renderLevelFilters();
  renderTopics();
  if (typeof refreshSessionDrawerIfOpen === 'function') refreshSessionDrawerIfOpen();
});

// ---------------------------------------------------------------------------
// ARCADE GAMES — "Games" section Play Now buttons (Word Match / Quick Quiz /
// Listen & Repeat). Level-adaptive standalone mini-games, separate from the
// per-topic Game tab in the topic modal (games.js's GameEngine).
// ---------------------------------------------------------------------------
const arcadeGamesGrid = document.getElementById('arcadeGamesGrid');
if (arcadeGamesGrid) {
  arcadeGamesGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-arcade]');
    if (btn) ArcadeGames.open(btn.dataset.arcade);
  });
}

const ArcadeGames = (() => {

  // -------------------------------------------------------------------------
  // SHARED HELPERS (small local duplicates of games.js's private utilities —
  // kept self-contained here so this module doesn't need to reach into
  // GameEngine's internals)
  // -------------------------------------------------------------------------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pickN(arr, n) { return shuffle(arr).slice(0, n); }

  const arcadeWordVisual = (word, extraClass) => igWordVisualHTML(word, extraClass);

  let audioCtx = null;
  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
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
  function playCorrect() { try { tone(523, 0, 0.12); tone(784, 0.1, 0.18); } catch (e) {} }
  function playWrong() { try { tone(160, 0, 0.22, 'sawtooth', 0.12); } catch (e) {} }

  const CONFETTI_COLORS = ['#f05d77', '#b8953a', '#a9b4a4', '#8e6d86', '#c9435c'];
  function confettiBurst(x, y, subtle) {
    const count = subtle ? 12 : 24;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const angle = Math.random() * Math.PI * 2;
      const dist = (subtle ? 30 : 60) + Math.random() * (subtle ? 40 : 90);
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
  function confettiFromElement(el, subtle) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    confettiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, subtle);
  }

  let activeTimers = [];
  function trackTimer(id) { activeTimers.push(id); return id; }
  function clearAllTimers() {
    activeTimers.forEach(id => { clearInterval(id); clearTimeout(id); });
    activeTimers = [];
  }

  // -------------------------------------------------------------------------
  // MODAL SHELL — topic picker (scoped to the active student's tier) +
  // scoreboard + stage, shared by all 3 mini-games.
  // -------------------------------------------------------------------------
  // How many words one round of Quick Quiz / Listen & Repeat asks for.
  const ROUND_LENGTH = 10;

  const GAME_META = {
    wordmatch: { title: 'Word Match', icon: '🧩' },
    quickquiz: { title: 'Quick Quiz', icon: '🎯' },
    listen: { title: 'Listen & Repeat', icon: '🔊' },
  };

  let kind = null;
  let tier = 'kids';
  let topics = [];
  let topicKey = null;
  let stageEl = null;
  let cleanupCurrent = () => {};

  function currentTier() {
    const s = (typeof getActiveStudent === 'function') ? getActiveStudent() : null;
    return (s && s.tier) || 'kids';
  }

  function tierTopics(t) {
    return LEVELS.filter(l => l.tier === t)
      .flatMap(l => l.topics.map(topic => ({ ...topic, levelId: l.id, levelCode: l.code })));
  }

  function keyOf(t) { return `${t.levelId}:${t.id}`; }

  function setScoreLabel(text) {
    const pill = document.getElementById('arcadeScorePill');
    if (pill) pill.textContent = text;
  }

  function open(gameKind) {
    kind = gameKind;
    tier = currentTier();
    topics = tierTopics(tier);
    if (topics.length === 0) return;
    topicKey = keyOf(topics[0]);
    renderShell();
    mountGame();
  }

  function renderShell() {
    const meta = GAME_META[kind];
    const tm = (typeof tierMeta === 'function') ? tierMeta(tier) : { icon: '🎓', label: '' };

    openModal(`
      <div class="modal-content-pad arcade-modal">
        <div class="modal-head">
          <span class="modal-head-thumb modal-head-thumb--icon">${meta.icon}</span>
          <div class="modal-head-text">
            <h3 id="modalTitle">${meta.title}</h3>
            <p class="modal-head-sub">
              <span class="level-pill arcade-tier-pill" style="background:${levelSoftVar('#8e6d86')};color:#8e6d86">${tm.icon} ${tm.label}</span>
            </p>
          </div>
        </div>
        <div class="arcade-topic-picker" id="arcadeTopicPicker"></div>
        <div class="game-toolbar">
          <span class="game-status-pill" id="arcadeScorePill">Score: 0</span>
          <div class="game-btn-row">
            <button class="game-btn secondary" id="arcadeRestartBtn">🔄 Restart</button>
          </div>
        </div>
        <div class="arcade-stage" id="arcadeStage"></div>
      </div>
    `, true);

    stageEl = document.getElementById('arcadeStage');
    const pickerEl = document.getElementById('arcadeTopicPicker');

    pickerEl.innerHTML = topics.map(t => `
      <button class="arcade-topic-chip ${keyOf(t) === topicKey ? 'active' : ''}" data-key="${keyOf(t)}">${t.emoji} ${t.title}</button>
    `).join('');

    pickerEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.arcade-topic-chip');
      if (!btn || btn.dataset.key === topicKey) return;
      topicKey = btn.dataset.key;
      pickerEl.querySelectorAll('.arcade-topic-chip').forEach(b => b.classList.toggle('active', b.dataset.key === topicKey));
      mountGame();
    });

    document.getElementById('arcadeRestartBtn').addEventListener('click', mountGame);
  }

  function mountGame() {
    cleanupCurrent();
    clearAllTimers();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const topic = topics.find(t => keyOf(t) === topicKey);
    if (!topic || !stageEl) return;
    if (!topic.words || topic.words.length < 4) {
      stageEl.innerHTML = `<div class="game-end-banner lose">This topic doesn't have enough words for this game yet.</div>`;
      cleanupCurrent = () => {};
      return;
    }
    if (kind === 'wordmatch') cleanupCurrent = renderWordMatch(stageEl, topic, tier);
    else if (kind === 'quickquiz') cleanupCurrent = renderQuickQuiz(stageEl, topic, tier);
    else cleanupCurrent = renderListenRepeat(stageEl, topic, tier);
  }

  function stopAll() {
    clearAllTimers();
    cleanupCurrent();
    cleanupCurrent = () => {};
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  // -------------------------------------------------------------------------
  // 1) WORD MATCH — click-to-connect columns with an SVG line + green glow
  // -------------------------------------------------------------------------
  function renderWordMatch(container, topic, tierId) {
    let pairs, leftOrder, rightOrder, selectedLeft, selectedRight, connected, mistakes;

    const CONTEXT_TEMPLATES = [
      (w) => `I can see the ${w.toLowerCase()}.`,
      (w) => `Look at that ${w.toLowerCase()}!`,
      (w) => `This is my ${w.toLowerCase()}.`,
      (w) => `Do you like ${w.toLowerCase()}?`,
    ];
    function contextPhrase(en) {
      let sum = 0; for (const c of en) sum += c.charCodeAt(0);
      return CONTEXT_TEMPLATES[sum % CONTEXT_TEMPLATES.length](en);
    }

    function leftVisual(word) {
      return tierId === 'teens' ? `<span class="wordmatch-term">${word.en}</span>` : arcadeWordVisual(word);
    }
    function rightLabel(word) {
      return tierId === 'teens' ? contextPhrase(word.en) : word.en;
    }

    function setup() {
      pairs = pickN(topic.words, Math.min(6, topic.words.length));
      leftOrder = shuffle(pairs);
      rightOrder = shuffle(pairs);
      selectedLeft = null; selectedRight = null;
      connected = new Set();
      mistakes = 0;
      paint();
    }

    function paint() {
      const won = connected.size === pairs.length;
      container.innerHTML = `
        <div class="wordmatch-board" id="wmBoard">
          <svg class="wordmatch-lines" id="wmLines"></svg>
          <div class="wordmatch-col" id="wmLeftCol">
            ${leftOrder.map(w => `
              <button class="wordmatch-item ${connected.has(w.id) ? 'matched' : ''} ${selectedLeft === w.id ? 'selected' : ''}"
                      data-side="left" data-id="${w.id}" ${connected.has(w.id) ? 'disabled' : ''}>
                ${leftVisual(w)}
              </button>
            `).join('')}
          </div>
          <div class="wordmatch-col" id="wmRightCol">
            ${rightOrder.map(w => `
              <button class="wordmatch-item ${connected.has(w.id) ? 'matched' : ''} ${selectedRight === w.id ? 'selected' : ''}"
                      data-side="right" data-id="${w.id}" ${connected.has(w.id) ? 'disabled' : ''}>
                ${rightLabel(w)}
              </button>
            `).join('')}
          </div>
        </div>
        ${won ? `<div class="game-end-banner win">🎉 Perfect Match! <p>${mistakes === 0 ? 'Zero mistakes — amazing!' : `${mistakes} mistake(s) along the way.`}</p></div>` : ''}
        ${won ? `<div class="game-btn-row" style="margin-top:12px;justify-content:center"><button class="game-btn" data-action="wm-next">➡️ Next Round</button></div>` : ''}
      `;
      setScoreLabel(`${connected.size} / ${pairs.length} matched`);

      container.querySelectorAll('.wordmatch-item').forEach(btn => {
        btn.addEventListener('click', () => select(btn.dataset.side, btn.dataset.id));
      });
      drawLines();

      const nextBtn = container.querySelector('[data-action="wm-next"]');
      if (nextBtn) nextBtn.addEventListener('click', setup);

      if (won) {
        confettiFromElement(container.querySelector('.game-end-banner'));
        if (typeof awardProgress === 'function') awardProgress(15, mistakes === 0 ? 2 : 0);
      }
    }

    function drawLines() {
      const board = container.querySelector('#wmBoard');
      const svg = container.querySelector('#wmLines');
      if (!board || !svg) return;
      const boardRect = board.getBoundingClientRect();
      let html = '';
      connected.forEach(id => {
        const leftEl = board.querySelector(`.wordmatch-item[data-side="left"][data-id="${id}"]`);
        const rightEl = board.querySelector(`.wordmatch-item[data-side="right"][data-id="${id}"]`);
        if (!leftEl || !rightEl) return;
        const lr = leftEl.getBoundingClientRect(), rr = rightEl.getBoundingClientRect();
        const x1 = lr.right - boardRect.left, y1 = lr.top + lr.height / 2 - boardRect.top;
        const x2 = rr.left - boardRect.left, y2 = rr.top + rr.height / 2 - boardRect.top;
        html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="wordmatch-line" />`;
      });
      svg.innerHTML = html;
    }

    function select(side, id) {
      if (connected.has(id)) return;
      if (side === 'left') selectedLeft = (selectedLeft === id) ? null : id;
      else selectedRight = (selectedRight === id) ? null : id;

      if (selectedLeft && selectedRight) {
        if (selectedLeft === selectedRight) {
          connected.add(selectedLeft);
          playCorrect();
          selectedLeft = null; selectedRight = null;
          paint();
        } else {
          mistakes++;
          playWrong();
          const badLeft = selectedLeft, badRight = selectedRight;
          paint();
          const leftEl = container.querySelector(`.wordmatch-item[data-side="left"][data-id="${badLeft}"]`);
          const rightEl = container.querySelector(`.wordmatch-item[data-side="right"][data-id="${badRight}"]`);
          [leftEl, rightEl].forEach(el => el && el.classList.add('shake'));
          const t = setTimeout(() => { selectedLeft = null; selectedRight = null; paint(); }, 500);
          trackTimer(t);
          return;
        }
      } else {
        paint();
      }
    }

    const resizeHandler = () => drawLines();
    window.addEventListener('resize', resizeHandler);
    setup();
    return () => window.removeEventListener('resize', resizeHandler);
  }

  // -------------------------------------------------------------------------
  // 2) QUICK QUIZ — timed multiple-choice rounds through the topic's words
  // -------------------------------------------------------------------------
  function renderQuickQuiz(container, topic, tierId) {
    const TIME_BY_TIER = { kids: 30, juniors: 24, teens: 16 };
    const totalTime = TIME_BY_TIER[tierId] || 24;
    let deck, qIndex, correctCount, current, answered, timerId;

    function buildQuestion(word) {
      const distractors = shuffle(topic.words.filter(w => w.id !== word.id)).slice(0, 3);
      return { word, options: shuffle([word, ...distractors]) };
    }

    function setup() {
      // A round is a fixed length, not the whole bank: topic word banks run
      // to 20+ words and a 20-question quiz outlasts the lesson slot. Each
      // round draws a fresh random subset, so playing again is new material.
      deck = shuffle(topic.words).slice(0, ROUND_LENGTH);
      qIndex = 0;
      correctCount = 0;
      nextQuestion();
    }

    function nextQuestion() {
      if (qIndex >= deck.length) { paintSummary(); return; }
      current = buildQuestion(deck[qIndex]);
      answered = false;
      paint();
      startTimer();
    }

    function startTimer() {
      const bar = container.querySelector('.quiz-timerbar-fill');
      if (bar) {
        bar.style.transition = 'none';
        bar.style.width = '100%';
        requestAnimationFrame(() => {
          bar.style.transition = `width ${totalTime}s linear`;
          bar.style.width = '0%';
        });
      }
      timerId = trackTimer(setTimeout(() => { if (!answered) handleAnswer(null); }, totalTime * 1000));
    }

    function paint() {
      container.innerHTML = `
        <div class="quiz-progress-row">
          <span class="game-status-pill">Question ${qIndex + 1} / ${deck.length}</span>
          <span class="game-status-pill">✅ ${correctCount} correct</span>
        </div>
        <div class="quiz-timerbar"><div class="quiz-timerbar-fill"></div></div>
        <div class="quiz-question">
          ${arcadeWordVisual(current.word, 'quiz-visual')}
          <h4>What is this in English?</h4>
        </div>
        <div class="quiz-options">
          ${current.options.map(o => `<button class="quiz-option" data-id="${o.id}">${o.en}</button>`).join('')}
        </div>
      `;
      setScoreLabel(`${correctCount} / ${deck.length} correct`);
      container.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => handleAnswer(btn.dataset.id));
      });
    }

    function handleAnswer(id) {
      if (answered) return;
      answered = true;
      clearTimeout(timerId);
      const bar = container.querySelector('.quiz-timerbar-fill');
      if (bar) bar.style.transition = 'none';

      const correct = current.word.id === id;
      if (correct) {
        correctCount++;
        if (typeof awardProgress === 'function') awardProgress(8, 0);
      }

      container.querySelectorAll('.quiz-option').forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.id === current.word.id) btn.classList.add('correct');
        else if (btn.dataset.id === id) btn.classList.add('wrong', 'shake');
      });

      if (correct) { playCorrect(); confettiFromElement(container.querySelector('.quiz-options'), true); }
      else playWrong();

      setScoreLabel(`${correctCount} / ${deck.length} correct`);

      const row = document.createElement('div');
      row.className = 'game-btn-row';
      row.style.cssText = 'margin-top:14px;justify-content:center';
      row.innerHTML = `<button class="game-btn" data-action="quiz-next">${qIndex + 1 >= deck.length ? '🏁 See Results' : '➡️ Next Question'}</button>`;
      container.appendChild(row);
      row.querySelector('[data-action="quiz-next"]').addEventListener('click', () => { qIndex++; nextQuestion(); });
    }

    function paintSummary() {
      const pct = Math.round((correctCount / deck.length) * 100);
      const stars = pct === 100 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
      container.innerHTML = `
        <div class="game-end-banner ${pct >= 50 ? 'win' : 'lose'}">
          🏆 Quiz Complete! <p>${correctCount} / ${deck.length} correct (${pct}%)</p>
          <p>${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
        </div>
        <div class="game-btn-row" style="margin-top:14px;justify-content:center">
          <button class="game-btn" data-action="quiz-again">🔄 Play Again</button>
        </div>
      `;
      setScoreLabel(`${correctCount} / ${deck.length} correct`);
      if (stars > 0 && typeof awardProgress === 'function') awardProgress(0, stars);
      confettiFromElement(container.querySelector('.game-end-banner'));
      container.querySelector('[data-action="quiz-again"]').addEventListener('click', setup);
    }

    setup();
    return () => clearTimeout(timerId);
  }

  // -------------------------------------------------------------------------
  // 3) LISTEN & REPEAT — speechSynthesis pronunciation + choice/spelling
  // -------------------------------------------------------------------------
  function renderListenRepeat(container, topic, tierId) {
    let deck, qIndex, correctCount, current, mode, speed, answered;
    mode = tierId === 'teens' ? 'spelling' : 'choice';
    speed = tierId === 'kids' ? 0.7 : 1.0;

    const PHRASE_TEMPLATES = [
      (w) => `Can you say "${w}"?`,
      (w) => `Listen carefully to "${w}".`,
      (w) => `Try to repeat: "${w}".`,
      (w) => `Practice saying "${w}" out loud.`,
    ];
    function contextSentence(en) {
      let sum = 0; for (const c of en) sum += c.charCodeAt(0);
      return PHRASE_TEMPLATES[sum % PHRASE_TEMPLATES.length](en);
    }
    function simplePhonetic(en) {
      return en.toLowerCase().split(/\s+/).map(part => {
        const clean = part.replace(/[^a-z]/g, '');
        const groups = clean.match(/[^aeiouy]*[aeiouy]+[^aeiouy]*/g);
        return groups && groups.length ? groups.join('·') : clean;
      }).join(' ');
    }

    function speak(text, rate) {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = rate;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    }

    function optionsFor(word) {
      const distractors = shuffle(topic.words.filter(w => w.id !== word.id)).slice(0, 3);
      return shuffle([word, ...distractors]);
    }

    function setup() {
      deck = shuffle(topic.words).slice(0, ROUND_LENGTH);
      qIndex = 0;
      correctCount = 0;
      nextRound();
    }

    function nextRound() {
      if (qIndex >= deck.length) { paintSummary(); return; }
      current = deck[qIndex];
      answered = false;
      paint();
    }

    function paint() {
      const challengeHtml = mode === 'choice'
        ? `<div class="listen-options">
            ${optionsFor(current).map(o => `<button class="quiz-option" data-id="${o.id}">${o.en}</button>`).join('')}
          </div>`
        : `<div class="listen-spelling">
            <input type="text" class="listen-input" id="listenInput" placeholder="Type what you heard..." autocomplete="off" autocapitalize="off" spellcheck="false" />
            <button class="game-btn" data-action="listen-check">✔️ Check</button>
          </div>`;

      container.innerHTML = `
        <div class="quiz-progress-row">
          <span class="game-status-pill">Word ${qIndex + 1} / ${deck.length}</span>
          <span class="game-status-pill">✅ ${correctCount} correct</span>
        </div>
        <div class="listen-stage">
          <button class="listen-speaker-btn" id="listenSpeakBtn" aria-label="Play pronunciation">🔊</button>
          <div>
            <span class="listen-speed-toggle">
              <button class="listen-speed-btn ${speed === 0.7 ? 'active' : ''}" data-speed="0.7">🐢 Slow</button>
              <button class="listen-speed-btn ${speed === 1.0 ? 'active' : ''}" data-speed="1.0">🐇 Normal</button>
            </span>
            <span class="listen-mode-toggle">
              <button class="listen-mode-btn ${mode === 'choice' ? 'active' : ''}" data-mode="choice">🔘 Choose</button>
              <button class="listen-mode-btn ${mode === 'spelling' ? 'active' : ''}" data-mode="spelling">⌨️ Spell it</button>
            </span>
          </div>
        </div>
        ${challengeHtml}
        <div class="listen-feedback" id="listenFeedback" hidden></div>
      `;
      setScoreLabel(`${correctCount} / ${deck.length} correct`);

      const speakBtn = container.querySelector('#listenSpeakBtn');
      const doSpeak = () => {
        speak(current.en, speed);
        speakBtn.classList.add('speaking');
        setTimeout(() => speakBtn.classList.remove('speaking'), 500);
      };
      speakBtn.addEventListener('click', doSpeak);
      doSpeak();

      // Changing the speed or the answer mode used to repaint the whole
      // round, wiping the feedback panel and re-reading the word aloud even
      // after the student had already answered. Once answered, only the
      // toggle's own highlight changes.
      container.querySelectorAll('.listen-speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          speed = Number(btn.dataset.speed);
          if (answered) {
            container.querySelectorAll('.listen-speed-btn').forEach(b => b.classList.toggle('active', b === btn));
          } else {
            paint();
          }
        });
      });
      container.querySelectorAll('.listen-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (answered) return;
          mode = btn.dataset.mode;
          paint();
        });
      });

      if (mode === 'choice') {
        container.querySelectorAll('.listen-options .quiz-option').forEach(btn => {
          btn.addEventListener('click', () => checkAnswer(btn.dataset.id === current.id, btn));
        });
      } else {
        const input = container.querySelector('#listenInput');
        const checkBtn = container.querySelector('[data-action="listen-check"]');
        const submit = () => checkAnswer(input.value.trim().toLowerCase() === current.en.trim().toLowerCase(), null);
        checkBtn.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
      }
    }

    function checkAnswer(correct, btnEl) {
      if (answered) return;
      answered = true;
      if (correct) {
        correctCount++;
        if (typeof awardProgress === 'function') awardProgress(8, 0);
      }

      if (mode === 'choice') {
        container.querySelectorAll('.listen-options .quiz-option').forEach(b => {
          b.disabled = true;
          if (b.dataset.id === current.id) b.classList.add('correct');
          else if (b === btnEl) b.classList.add('wrong', 'shake');
        });
      } else {
        const input = container.querySelector('#listenInput');
        if (input) { input.disabled = true; input.classList.add(correct ? 'correct' : 'wrong'); }
        const checkBtn = container.querySelector('[data-action="listen-check"]');
        if (checkBtn) checkBtn.disabled = true;
      }

      if (correct) { playCorrect(); confettiFromElement(container.querySelector('.listen-stage'), true); }
      else playWrong();

      setScoreLabel(`${correctCount} / ${deck.length} correct`);

      const fb = container.querySelector('#listenFeedback');
      fb.hidden = false;
      fb.innerHTML = `
        <p class="listen-phonetic">🗣️ Sounds like: <strong>${simplePhonetic(current.en)}</strong></p>
        <p class="listen-phrase">💬 "${contextSentence(current.en)}"</p>
        <button class="game-btn" data-action="listen-next">${qIndex + 1 >= deck.length ? '🏁 See Results' : '➡️ Next Word'}</button>
      `;
      fb.querySelector('[data-action="listen-next"]').addEventListener('click', () => { qIndex++; nextRound(); });
    }

    function paintSummary() {
      const pct = Math.round((correctCount / deck.length) * 100);
      const stars = pct === 100 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
      container.innerHTML = `
        <div class="game-end-banner ${pct >= 50 ? 'win' : 'lose'}">
          🎧 Listening Complete! <p>${correctCount} / ${deck.length} correct (${pct}%)</p>
          <p>${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
        </div>
        <div class="game-btn-row" style="margin-top:14px;justify-content:center">
          <button class="game-btn" data-action="listen-again">🔄 Play Again</button>
        </div>
      `;
      setScoreLabel(`${correctCount} / ${deck.length} correct`);
      if (stars > 0 && typeof awardProgress === 'function') awardProgress(0, stars);
      confettiFromElement(container.querySelector('.game-end-banner'));
      container.querySelector('[data-action="listen-again"]').addEventListener('click', setup);
    }

    setup();
    return () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); };
  }

  return { open, stopAll };
})();
