/* ==========================================================================
   IGenglishschool — Game Maker (CRUD)
   Teachers build custom games from their own words; persisted in localStorage.
   ========================================================================== */

const CUSTOM_GAMES_KEY = 'custom_games';
const MIN_WORDS = 3;
const MAX_WORDS = 10;

function loadCustomGames() {
  let games;
  try {
    games = IGStore.getJSON(CUSTOM_GAMES_KEY, []) || [];
  } catch (e) {
    return [];
  }
  if (!Array.isArray(games)) return [];

  // Repair games saved before the form told the two fields apart: an emoji
  // typed into the wide "image URL" box was stored as `image`, rendered as a
  // broken <img>, and fell back to the default star. Move it where it
  // belongs, once, and write the fix back so it stays fixed.
  let changed = false;
  games.forEach(g => {
    if (!Array.isArray(g.words)) { g.words = []; return; }
    g.words = g.words.map(w => {
      const fixed = igNormalizeWord(w);
      if (fixed.image !== (w.image || '') || fixed.emoji !== w.emoji) changed = true;
      return { ...fixed, emoji: String(fixed.emoji || '').trim() || '⭐' };
    });
  });
  if (changed) saveCustomGames(games);
  return games;
}

function saveCustomGames(games) {
  IGStore.setJSON(CUSTOM_GAMES_KEY, games);
}

function blankWord() {
  return { id: 'w' + Math.random().toString(36).slice(2, 9), en: '', image: '', emoji: '' };
}

function gameTypeMeta(typeId) {
  return WORD_GAME_TYPES.find(g => g.id === typeId) || WORD_GAME_TYPES[0];
}

// ---------------------------------------------------------------------------
// READY-MADE PICTURE GAMES — shown in the Games section (they are games to
// play, not something to build, so they no longer live inside the Game
// Maker). Hidden for a teacher of grown-ups only (.kids-only).
// ---------------------------------------------------------------------------
function renderReadyGames(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="gamemaker-ready kids-only">
      <button class="gamemaker-ready-card" type="button" data-open-backpack>
        <span class="gamemaker-ready-art">${backpackSVG('classic', '#3d7bd9', ['ruler', 'book', 'pencil', 'paintbrush', 'scissors'])}</span>
        <span class="gamemaker-ready-text">
          <b>🎒 Pack the Backpack</b>
          <small>School objects — escolha a mochila e a cor, depois arraste o material escolar para dentro.</small>
          <span class="game-btn">▶ Play</span>
        </span>
      </button>
      <button class="gamemaker-ready-card" type="button" data-open-house>
        <span class="gamemaker-ready-art">${houseOverviewSVG({ bedroom: { bed: '#8e5fc2', rug: '#e5484d', curtains: '#f27aa5' }, kitchen: { fridge: '#a3a8ae', stove: '#a3a8ae' }, yard: { tree: '#8b5e3c' } }, false)}</span>
        <span class="gamemaker-ready-text">
          <b>🏠 Parts of the House</b>
          <small>Bedroom, bathroom, kitchen, living room, dining room e yard — a criança escolhe o cômodo e arrasta os móveis e utensílios para dentro.</small>
          <span class="game-btn">▶ Play</span>
        </span>
      </button>
      <button class="gamemaker-ready-card" type="button" data-open-animals>
        <span class="gamemaker-ready-art">${animalFullSVG(animalById('lion'))}</span>
        <span class="gamemaker-ready-text">
          <b>🦁 Describing Animals</b>
          <small>A criança escolhe o animal e o descreve com figuras — big or small, a cor, long tail, long neck, mane, wings… O animal vai sendo montado e no final aparece no habitat dele com a frase.</small>
          <span class="game-btn">▶ Play</span>
        </span>
      </button>
      <button class="gamemaker-ready-card" type="button" data-open-feelings>
        <span class="gamemaker-ready-art">${faceSVG(feelingById('happy'))}</span>
        <span class="gamemaker-ready-text">
          <b>😊 Feelings</b>
          <small>Happy, sad, angry, tired, surprised, sleepy, sick, hungry, scared — a criança arrasta o rosto certo para o emoji em branco quando ouve "I'm sad!".</small>
          <span class="game-btn">▶ Play</span>
        </span>
      </button>
      <button class="gamemaker-ready-card" type="button" data-open-instruments>
        <span class="gamemaker-ready-art">${instrumentSVG('guitar')}</span>
        <span class="gamemaker-ready-text">
          <b>🎸 Musical Instruments</b>
          <small>Guitar, piano, drum e violin — ouvir o som de cada um ("I'm playing the piano") e separar em loud ou quiet.</small>
          <span class="game-btn">▶ Play</span>
        </span>
      </button>
      <button class="gamemaker-ready-card" type="button" data-open-prepositions>
        <span class="gamemaker-ready-art"><svg viewBox="0 0 400 260">${ppSceneInner(ppThingById('cat'), 'on')}</svg></span>
        <span class="gamemaker-ready-text">
          <b>📦 Prepositions of Place</b>
          <small>In, on, under, next to, between, behind, in front of — a criança move o gato, o cachorro, a borboleta… em volta da caixa.</small>
          <span class="game-btn">▶ Play</span>
        </span>
      </button>
      <button class="gamemaker-ready-card" type="button" data-open-weather>
        <span class="gamemaker-ready-art"><svg viewBox="0 0 400 260">${weatherSceneInner('rainy')}</svg></span>
        <span class="gamemaker-ready-text">
          <b>🌦️ Weather</b>
          <small>Sunny, rainy, cloudy, snowy, stormy, windy — a criança arrasta o clima para o céu e a cena inteira muda: chuva caindo, raios, neve, vento… e a roupa da criança também!</small>
          <span class="game-btn">▶ Play</span>
        </span>
      </button>
    </div>
  `;
  container.querySelectorAll('[data-open-backpack]').forEach(btn => btn.addEventListener('click', openBackpackGame));
  container.querySelectorAll('[data-open-house]').forEach(btn => btn.addEventListener('click', openHouseGame));
  container.querySelectorAll('[data-open-animals]').forEach(btn => btn.addEventListener('click', openAnimalGame));
  container.querySelectorAll('[data-open-feelings]').forEach(btn => btn.addEventListener('click', openFeelingsGame));
  container.querySelectorAll('[data-open-instruments]').forEach(btn => btn.addEventListener('click', openInstrumentsGame));
  container.querySelectorAll('[data-open-prepositions]').forEach(btn => btn.addEventListener('click', openPrepositionsGame));
  container.querySelectorAll('[data-open-weather]').forEach(btn => btn.addEventListener('click', openWeatherGame));
}

// ---------------------------------------------------------------------------
// GAME MAKER — list view
// ---------------------------------------------------------------------------
function renderGameMaker(container) {
  const games = loadCustomGames();

  container.innerHTML = `
    <div class="gamemaker-toolbar">
      <button class="btn btn-primary" id="newGameBtn">✨ Create New Game</button>
    </div>
    <div class="gamemaker-grid">
      ${games.length === 0 ? `
        <div class="gamemaker-empty">
          <span class="teaser-icon">🛠️</span>
          <p>No custom games yet. Create your first one — pick a game type, add your words, and it's ready to play.</p>
        </div>
      ` : games.map(g => gameCardHTML(g)).join('')}
    </div>
  `;

  container.querySelector('#newGameBtn').addEventListener('click', () => openGameForm(container));
  container.querySelectorAll('[data-test]').forEach(btn => {
    btn.addEventListener('click', () => testCustomGame(games.find(g => g.id === btn.dataset.test)));
  });
  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openGameForm(container, games.find(g => g.id === btn.dataset.edit)));
  });
  container.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const game = games.find(g => g.id === btn.dataset.delete);
      if (!game) return;
      if (confirm(`Delete "${game.title}"? This can't be undone.`)) {
        saveCustomGames(games.filter(g => g.id !== game.id));
        renderGameMaker(container);
      }
    });
  });
}

function gameCardHTML(game) {
  const meta = gameTypeMeta(game.type);
  return `
    <div class="gamemaker-card">
      <div class="gamemaker-card-head">
        <span class="gamemaker-type-badge">${meta.icon} ${meta.label}</span>
        <span class="gamemaker-word-count">${game.words.length} words</span>
      </div>
      <h3>${igEscapeHtml(game.title)}</h3>
      <div class="gamemaker-card-actions">
        <button class="game-btn" data-test="${game.id}">▶️ Test</button>
        <button class="game-btn secondary" data-edit="${game.id}">✏️ Edit</button>
        <button class="game-btn secondary danger" data-delete="${game.id}">🗑️ Delete</button>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// CREATE / EDIT FORM (in the shared modal)
// ---------------------------------------------------------------------------
function openGameForm(listContainer, existing) {
  const isEdit = Boolean(existing);
  const state = {
    id: existing ? existing.id : 'g' + Date.now().toString(36),
    title: existing ? existing.title : '',
    type: existing ? existing.type : WORD_GAME_TYPES[0].id,
    words: existing ? existing.words.map(w => ({ ...w })) : [blankWord(), blankWord(), blankWord()],
  };

  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">${isEdit ? '✏️ Edit Game' : '✨ Create a New Game'}</h3>
      <div class="gm-form-field">
        <label for="gmTitle">Game title</label>
        <input type="text" id="gmTitle" placeholder="e.g. Space Vocabulary" value="${escapeAttr(state.title)}" />
      </div>
      <div class="gm-form-field">
        <label for="gmType">Game type</label>
        <select id="gmType">
          ${WORD_GAME_TYPES.map(g => `<option value="${g.id}" ${g.id === state.type ? 'selected' : ''}>${g.icon} ${g.label}</option>`).join('')}
        </select>
      </div>
      <div class="gm-form-field">
        <label>Words (${MIN_WORDS}-${MAX_WORDS}) — only the English word is required</label>
        <div class="gm-word-head">
          <span aria-hidden="true"></span>
          <span>English word</span>
          <span>Emoji</span>
          <span>Photo URL (optional)</span>
          <span></span>
        </div>
        <div class="gm-word-rows" id="gmWordRows"></div>
        <button class="game-btn secondary" id="gmAddWord" type="button">+ Add Word</button>
        <p class="gm-hint">Paste an emoji in the <strong>Emoji</strong> box. The <strong>Photo URL</strong> box
          only accepts a real link starting with <code>https://</code> — leave it empty to use the emoji.</p>
      </div>
      <p class="gm-form-error" id="gmFormError" hidden></p>
      <div class="game-btn-row" style="margin-top:18px">
        <button class="game-btn" id="gmSaveBtn">💾 Save Game</button>
        <button class="game-btn secondary" id="gmCancelBtn">Cancel</button>
      </div>
    </div>
  `, true);

  const rowsEl = document.getElementById('gmWordRows');

  function paintRows() {
    rowsEl.innerHTML = state.words.map((w, i) => `
      <div class="gm-word-row" data-index="${i}">
        ${wordVisualHTML(w.image || w.emoji ? w : { emoji: '⭐' }, 'gm-word-preview')}
        <input type="text" class="gm-input" data-field="en" placeholder="Dog" value="${escapeAttr(w.en)}" />
        <input type="text" class="gm-input gm-input-emoji" data-field="emoji" placeholder="🐶" value="${escapeAttr(w.emoji)}" aria-label="Emoji" />
        <input type="text" class="gm-input" data-field="image" placeholder="https://… (optional)" value="${escapeAttr(w.image)}" aria-label="Photo URL" />
        <button class="gm-remove-row" data-remove="${i}" type="button" aria-label="Remove word" ${state.words.length <= 1 ? 'disabled' : ''}>✕</button>
      </div>
      <p class="gm-row-warning" data-warn-for="${i}" ${badUrl(w.image) ? '' : 'hidden'}>
        ⚠️ Not a link — this will be used as the emoji instead. For a real photo, paste a URL starting with https://
      </p>
    `).join('');
  }

  // Empty is fine (the emoji is used); anything non-empty that isn't a URL
  // is almost always an emoji typed into the wrong box.
  function badUrl(value) {
    const v = String(value || '').trim();
    return v.length > 0 && !igLooksLikeImageUrl(v);
  }

  function wordVisualHTML(word, cls) {
    return igWordVisualHTML({ ...word, emoji: word.emoji || '⭐', swatch: null }, cls);
  }

  paintRows();

  rowsEl.addEventListener('input', (e) => {
    const row = e.target.closest('.gm-word-row');
    if (!row) return;
    const idx = Number(row.dataset.index);
    const field = e.target.dataset.field;
    state.words[idx][field] = e.target.value;
    if (field === 'image' || field === 'emoji') {
      const preview = row.querySelector('.word-visual');
      preview.outerHTML = wordVisualHTML(state.words[idx], 'gm-word-preview');
      const warn = rowsEl.querySelector(`.gm-row-warning[data-warn-for="${idx}"]`);
      if (warn) warn.hidden = !badUrl(state.words[idx].image);
    }
  });

  rowsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn || btn.disabled) return;
    state.words.splice(Number(btn.dataset.remove), 1);
    paintRows();
  });

  document.getElementById('gmAddWord').addEventListener('click', () => {
    if (state.words.length >= MAX_WORDS) return;
    state.words.push(blankWord());
    paintRows();
  });

  document.getElementById('gmSaveBtn').addEventListener('click', () => {
    state.title = document.getElementById('gmTitle').value.trim();
    state.type = document.getElementById('gmType').value;
    // igNormalizeWord moves an emoji typed into the photo box back where it
    // belongs, so a mis-filled field can never reach a game as a broken <img>.
    const cleanWords = state.words
      .map(w => {
        const n = igNormalizeWord({ ...w, en: String(w.en || '').trim() });
        return { ...n, emoji: String(n.emoji || '').trim() || '⭐' };
      })
      .filter(w => w.en.length > 0);

    const errorEl = document.getElementById('gmFormError');
    if (!state.title) return showFormError(errorEl, 'Please give your game a title.');
    if (cleanWords.length < MIN_WORDS) return showFormError(errorEl, `Add at least ${MIN_WORDS} words (only ${cleanWords.length} filled in).`);

    const games = loadCustomGames();
    const record = { id: state.id, title: state.title, type: state.type, words: cleanWords, createdAt: existing ? existing.createdAt : Date.now() };
    const idx = games.findIndex(g => g.id === state.id);
    if (idx >= 0) games[idx] = record; else games.push(record);
    saveCustomGames(games);

    closeModal();
    if (listContainer) renderGameMaker(listContainer);
  });

  document.getElementById('gmCancelBtn').addEventListener('click', closeModal);
}

function showFormError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function escapeAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// ---------------------------------------------------------------------------
// TEST a custom game (reuses the shared GameEngine)
// ---------------------------------------------------------------------------
function testCustomGame(game) {
  if (!game) return;
  const meta = gameTypeMeta(game.type);
  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">${meta.icon}</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">${igEscapeHtml(game.title)}</h3>
          <p class="modal-head-sub">
            <span class="level-pill" style="background:var(--primary-soft);color:var(--primary-dark)">${meta.label} · Custom Game</span>
          </p>
        </div>
      </div>
      <div class="game-picker" id="gmPlayPicker">
        ${WORD_GAME_TYPES.map(g => `<button class="game-pick-btn ${g.id === game.type ? 'active' : ''}" data-game="${g.id}" type="button">${g.icon} ${g.label}</button>`).join('')}
      </div>
      <div class="game-mount" id="gameMount"></div>
    </div>
  `, true);

  // A custom word bank works in every engine, not only the one it was saved
  // with — let the teacher switch without going back to edit the game.
  const picker = document.getElementById('gmPlayPicker');
  picker.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-game]');
    if (!btn) return;
    picker.querySelectorAll('.game-pick-btn').forEach(b => b.classList.toggle('active', b === btn));
    GameEngine.mount(
      document.getElementById('gameMount'),
      { id: `custom-${game.id}`, title: game.title, emoji: '🛠️', words: game.words },
      btn.dataset.game
    );
  });
  // Hangman prints `topic.title` as the category hint — a custom game has a
  // `title` of its own, so pass it through instead of letting it read
  // "Category: undefined".
  GameEngine.mount(
    document.getElementById('gameMount'),
    { id: `custom-${game.id}`, title: game.title, emoji: '🛠️', words: game.words },
    game.type
  );
}
