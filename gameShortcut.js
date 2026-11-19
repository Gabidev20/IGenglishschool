/* ==========================================================================
   IGenglishschool — 🎮 Games shortcut
   One menu with every game the teacher may want in the middle of a lesson:
   the class games (Who am I?, Drawing Challenge, the Wheel…), the picture
   games (Colors, ABC, Body Parts…) and any curriculum topic with its word
   games. Opened from the online book's bar (livroOnline.js), so a game is
   one tap away from the page being taught; closing the game goes straight
   back to the page.
   ========================================================================== */

const GS_CLASS_GAMES = [
  { icon: '🕵️', en: 'Who am I?', pt: 'Adivinhação', open: () => openWhoAmI() },
  { icon: '🏆', en: 'Live Quiz', pt: 'Quiz ao vivo · Zoom', open: () => openLiveQuiz() },
  { icon: '🦖', en: 'Jump & Learn', pt: 'Pule e responda', open: () => openJumpGame() },
  { icon: typeof mzPacIcon === 'function' ? mzPacIcon('gs-pac') : '🟡', en: 'Maze Muncher', pt: 'Come-come · 2 jogadores', open: () => openMazeGame() },
  { icon: '🎨', en: 'Drawing Challenge', pt: 'Desenhe e adivinhe', open: () => LiveTools.openTool('drawing') },
  { icon: '🎡', en: 'Wheel of Fortune', pt: 'Roleta', open: () => LiveTools.openTool('wheel') },
  { icon: '🏅', en: 'Scoreboard', pt: 'Placar', open: () => LiveTools.openTool('scoreboard') },
  { icon: '⏱️', en: 'Timer & Bell', pt: 'Cronômetro', open: () => LiveTools.openTool('timer') },
];

// Picture games: made for children, hidden for a teacher of grown-ups only.
const GS_PICTURE_GAMES = [
  { icon: '🔤', en: 'ABC', pt: 'Alfabeto', kw: 'alphabet letters', open: () => openAlphabetGame() },
  { icon: '🧩', en: 'Blend it!', pt: 'Juntar os sons', kw: 'blending phonics sounds cvc', open: () => openBlendGame() },
  { icon: '🎤', en: 'Say it!', pt: 'Falar a palavra', open: () => openSayItGame() },
  { icon: '🐄', en: 'Old MacDonald', pt: 'A fazenda', open: () => openFarmGame() },
  { icon: '🎈', en: 'Touch it!', pt: 'Ouça e toque', open: () => openTouchGame() },
  { icon: '🍕', en: 'Pizza Shop', pt: 'Monte a pizza', open: () => openShopGame() },
  { icon: '🔊', en: 'Sound Detective', pt: 'Que som é?', open: () => openSoundGame() },
  { icon: '🧠', en: 'Talking Memory', pt: 'Memória que fala', open: () => openTalkMemoryGame() },
  { icon: '🎨', en: 'Colors', pt: 'Cores', open: () => openColorsGame() },
  { icon: '🧍', en: 'Body Parts', pt: 'Corpo', open: () => openBodyGame() },
  { icon: '👨‍👩‍👧', en: 'Family', pt: 'Família', open: () => openFamilyGame() },
  { icon: '😊', en: 'Feelings', pt: 'Sentimentos', open: () => openFeelingsGame() },
  { icon: '🌦️', en: 'Weather', pt: 'Clima', open: () => openWeatherGame() },
  { icon: '🦁', en: 'Animals', pt: 'Animais', open: () => openAnimalGame() },
  { icon: '🎸', en: 'Music', pt: 'Instrumentos', open: () => openInstrumentsGame() },
  { icon: '🏠', en: 'House', pt: 'Casa', open: () => openHouseGame() },
  { icon: '📦', en: 'Where is it?', pt: 'Preposições', open: () => openPrepositionsGame() },
  { icon: '🎒', en: 'Backpack', pt: 'Material escolar', open: () => openBackpackGame() },
];

// Every curriculum topic, for the search: { levelId, topic, level }.
function gsAllTopics() {
  const out = [];
  (typeof LEVELS !== 'undefined' ? LEVELS : []).forEach(level => (level.topics || []).forEach(topic => {
    if ((topic.words || []).length) out.push({ level, topic });
  }));
  return out;
}

const gsNorm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Topics whose title shares a real word with the text (the page title
// "What? Where? Who?" finds "Question words"… or at least "Who…").
function gsMatchTopics(text, limit) {
  const q = gsNorm(text);
  if (!q) return [];
  const words = q.split(' ').filter(w => w.length > 2);
  return gsAllTopics()
    .map(x => {
      const hay = gsNorm(`${x.topic.title} ${x.topic.description || ''} ${x.topic.id}`);
      let score = hay.includes(q) ? 10 : 0;
      words.forEach(w => { if (hay.includes(w)) score += 2; });
      return { ...x, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit || 12);
}

function openGamesMenu(ctx) {
  const c = ctx || {};
  const esc = s => igEscapeHtml(String(s == null ? '' : s));
  const grownOnly = typeof teacherAdultOnly === 'function' && teacherAdultOnly();
  const tile = (g, i, kind) => `
    <button class="gs-tile" type="button" data-gs="${kind}:${i}">
      <span class="gs-icon">${g.icon}</span><b>${esc(g.en)}</b><small>${esc(g.pt)}</small>
    </button>`;
  const topicRow = x => `
    <button class="gs-topic" type="button" data-topic="${esc(x.level.id)}|${esc(x.topic.id)}">
      <span class="gs-topic-emoji">${esc(x.topic.emoji || '📘')}</span>
      <b>${esc(x.topic.title)}</b>
      <small>${esc(x.level.code || '')}</small>
    </button>`;
  const suggested = c.pageTitle ? gsMatchTopics(c.pageTitle, 6) : [];

  openModal(`
    <div class="modal-content-pad gs">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">🎮</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Jogos</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">Escolha um jogo — ao fechar, você volta para ${esc(c.backTo || 'a página do livro')}.</span></p>
        </div>
      </div>

      <p class="gs-label">🕹️ Jogos da aula</p>
      <div class="gs-grid">${GS_CLASS_GAMES.map((g, i) => tile(g, i, 'class')).join('')}</div>

      ${grownOnly ? '' : `
        <p class="gs-label">🖼️ Jogos com figuras</p>
        <div class="gs-grid">${GS_PICTURE_GAMES.map((g, i) => tile(g, i, 'pic')).join('')}</div>`}

      <p class="gs-label">📚 Jogos de um tópico <small>(Hangman, Memory, Match-up, Word Search…)</small></p>
      <input class="gs-search" type="search" id="gsSearch" placeholder="🔍 Procure um tópico: family, animals, verb to be…" autocomplete="off" />
      <div class="gs-topics" id="gsTopics">
        ${suggested.length ? `<p class="gs-hint">Sugestões para “${esc(c.pageTitle)}”:</p>${suggested.map(topicRow).join('')}`
          : '<p class="gs-hint">Digite o nome do assunto da aula.</p>'}
      </div>
    </div>`, true);

  const body = document.querySelector('.gs');
  body.addEventListener('click', e => {
    const g = e.target.closest('[data-gs]');
    if (g) {
      const [kind, i] = g.dataset.gs.split(':');
      const game = (kind === 'class' ? GS_CLASS_GAMES : GS_PICTURE_GAMES)[Number(i)];
      try { game.open(); } catch (err) { console.error('game shortcut', err); }
      return;
    }
    const t = e.target.closest('[data-topic]');
    if (t) {
      const [levelId, topicId] = t.dataset.topic.split('|');
      openTopicModal(levelId, topicId);
    }
  });
  const search = document.getElementById('gsSearch');
  const list = document.getElementById('gsTopics');
  search.addEventListener('input', () => {
    const q = search.value.trim();
    if (!q) { list.innerHTML = suggested.length ? suggested.map(topicRow).join('') : '<p class="gs-hint">Digite o nome do assunto da aula.</p>'; return; }
    const found = gsMatchTopics(q, 20);
    list.innerHTML = found.length ? found.map(topicRow).join('') : '<p class="gs-hint">Nenhum tópico com esse nome.</p>';
  });
}

// ---------------------------------------------------------------------------
// 🔍 SUBJECTS — every topic of the site, one search away (online book bar).
// A topic opens its own page (lesson, words, games); a picture game whose
// name matches opens straight away. Empty search: the page's suggestions,
// then all the topics by level.
// ---------------------------------------------------------------------------
function openTopicSearch(ctx) {
  const c = ctx || {};
  const esc = s => igEscapeHtml(String(s == null ? '' : s));
  const grownOnly = typeof teacherAdultOnly === 'function' && teacherAdultOnly();
  const games = GS_CLASS_GAMES.map((g, i) => ({ g, key: `class:${i}` }))
    .concat(grownOnly ? [] : GS_PICTURE_GAMES.map((g, i) => ({ g, key: `pic:${i}` })));
  const topicRow = x => `
    <button class="gs-topic" type="button" data-topic="${esc(x.level.id)}|${esc(x.topic.id)}">
      <span class="gs-topic-emoji">${esc(x.topic.emoji || '📘')}</span>
      <b>${esc(x.topic.title)}</b>
      <small>${esc(x.level.code || '')}</small>
    </button>`;
  const gameRow = x => `
    <button class="gs-topic gs-topic--game" type="button" data-gs="${x.key}">
      <span class="gs-topic-emoji">${x.g.icon}</span>
      <b>${esc(x.g.en)}</b>
      <small>🎮 ${esc(x.g.pt)}</small>
    </button>`;
  const suggested = c.pageTitle ? gsMatchTopics(c.pageTitle, 4) : [];
  const browse = () => {
    const byLevel = {};
    gsAllTopics().forEach(x => { (byLevel[x.level.id] = byLevel[x.level.id] || { level: x.level, list: [] }).list.push(x); });
    return `${suggested.length ? `<p class="gs-hint">Sugestões para esta página:</p>${suggested.map(topicRow).join('')}` : ''}
      ${Object.values(byLevel).map(v => `<p class="gs-label ts-level">${esc(v.level.code || v.level.id)} <small>${esc(v.level.title || '')}</small></p>${v.list.map(topicRow).join('')}`).join('')}`;
  };
  const search = q => {
    const n = gsNorm(q);
    const g = games.filter(x => gsNorm(`${x.g.en} ${x.g.pt} ${x.g.kw || ''}`).includes(n));
    const t = gsMatchTopics(q, 30);
    if (!g.length && !t.length) return '<p class="gs-hint">Nenhum assunto com esse nome. Tente em inglês ou português: colors, cores, verb to be…</p>';
    return `${t.map(topicRow).join('')}${g.length ? `<p class="gs-hint">🎮 Jogos com esse nome:</p>${g.map(gameRow).join('')}` : ''}`;
  };

  openModal(`
    <div class="modal-content-pad gs ts">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">🔍</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Assuntos do site</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">Procure um assunto e abra a lição e os jogos — ao fechar, você volta para ${esc(c.backTo || 'a página do livro')}.</span></p>
        </div>
      </div>
      <input class="gs-search" type="search" id="tsSearch" placeholder="🔍 A or An, alphabet, family, verb to be…" autocomplete="off" />
      <div class="gs-topics ts-list" id="tsList">${browse()}</div>
    </div>`, true);

  const body = document.querySelector('.ts');
  body.addEventListener('click', e => {
    const g = e.target.closest('[data-gs]');
    if (g) {
      const [kind, i] = g.dataset.gs.split(':');
      const game = (kind === 'class' ? GS_CLASS_GAMES : GS_PICTURE_GAMES)[Number(i)];
      try { game.open(); } catch (err) { console.error('topic search', err); }
      return;
    }
    const t = e.target.closest('[data-topic]');
    if (t) { const [levelId, topicId] = t.dataset.topic.split('|'); openTopicModal(levelId, topicId); }
  });
  const input = document.getElementById('tsSearch');
  const list = document.getElementById('tsList');
  input.addEventListener('input', () => { const q = input.value.trim(); list.innerHTML = q ? search(q) : browse(); });
  setTimeout(() => input.focus(), 50);
}
