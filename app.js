/* ==========================================================================
   IGenglishschool — Data + App Logic
   ========================================================================== */

// TIERS, LEVELS and the IMG() helper now live in topicsData.js (loaded
// before this file) — see that file's header comment for the data schema
// and how to add new topics/vocabulary.

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
  if (!image) return `<${tag} class="${className} emoji-fallback">${emoji}</${tag}>`;
  return `<img class="${className}" src="${image}" alt="${alt}" loading="lazy"
    onerror="this.replaceWith(Object.assign(document.createElement('${tag}'),{className:'${className} emoji-fallback',textContent:'${emoji}'}))" />`;
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

let activeTierId = TIERS[0].id;

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

function renderTopics() {
  const levelsInTier = LEVELS.filter(l => l.tier === activeTierId);
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
  renderLevelTabs();
  renderTopics();
}

levelTabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tier]');
  if (btn) setActiveTier(btn.dataset.tier);
});

topicsGridEl.addEventListener('click', (e) => {
  const card = e.target.closest('.topic-card');
  if (card) openTopicModal(card.dataset.level, card.dataset.topic);
});

renderLevelTabs();
renderTopics();

// ---------------------------------------------------------------------------
// MODAL SYSTEM (base container reused by topic details, games, lesson plans)
// ---------------------------------------------------------------------------
const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalEl = document.querySelector('.modal');

let activeGameType = 'hangman';

function openModal(html, wide) {
  modalBody.innerHTML = html;
  modalOverlay.hidden = false;
  modalEl.classList.toggle('modal--game', Boolean(wide));
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  GameEngine.stopAll();
  if (typeof stopLearningModules === 'function') stopLearningModules();
  if (typeof LiveTools !== 'undefined') LiveTools.stopAll();
  modalOverlay.hidden = true;
  modalBody.innerHTML = '';
  modalEl.classList.remove('modal--game');
  document.body.style.overflow = '';
}

modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
});

function openTopicModal(levelId, topicId) {
  const level = LEVELS.find(l => l.id === levelId);
  const topic = level.topics.find(t => t.id === topicId);
  activeGameType = 'hangman';

  openModal(`
    <div class="modal-media">
      ${mediaMarkup(topic.image, topic.emoji, topic.title, 'div', '')}
    </div>
    <div class="modal-content-pad">
      <span class="level-pill" style="background:${levelSoftVar(level.color)};color:${level.color}">${level.code} · ${level.name}</span>
      <h3 id="modalTitle">${topic.emoji} ${topic.title}</h3>
      <p>${topic.description}</p>

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

function getModalTabs(level) {
  const tabs = [
    { id: 'game', label: 'Game', icon: '🎮' },
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

  if (kind === 'lesson') { mountEl.innerHTML = renderLessonPlanHTML(level, topic); return; }
  if (kind === 'reading') { renderReadingModule(mountEl, level, topic); return; }
  if (kind === 'practice') { renderPracticeArena(mountEl, level, topic); return; }
  if (kind === 'phonics') { renderPhonicsStation(mountEl, level, topic); return; }
  if (kind === 'flashcards') { renderFlashcards(mountEl, level, topic); return; }

  // kind === 'game'
  mountEl.innerHTML = `
    <div class="game-picker">
      ${GAME_TYPES.map(g => `<button class="game-pick-btn ${g.id === activeGameType ? 'active' : ''}" data-game="${g.id}">${g.icon} ${g.label}</button>`).join('')}
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
