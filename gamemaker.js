/* ==========================================================================
   IGenglishschool — Game Maker (CRUD)
   Teachers build custom games from their own words; persisted in localStorage.
   ========================================================================== */

const CUSTOM_GAMES_KEY = 'hopscotch_custom_games';
const MIN_WORDS = 3;
const MAX_WORDS = 10;

function loadCustomGames() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_GAMES_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCustomGames(games) {
  localStorage.setItem(CUSTOM_GAMES_KEY, JSON.stringify(games));
}

function blankWord() {
  return { id: 'w' + Math.random().toString(36).slice(2, 9), en: '', image: '', emoji: '' };
}

function gameTypeMeta(typeId) {
  return GAME_TYPES.find(g => g.id === typeId) || GAME_TYPES[0];
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
    type: existing ? existing.type : GAME_TYPES[0].id,
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
          ${GAME_TYPES.map(g => `<option value="${g.id}" ${g.id === state.type ? 'selected' : ''}>${g.icon} ${g.label}</option>`).join('')}
        </select>
      </div>
      <div class="gm-form-field">
        <label>Words (${MIN_WORDS}-${MAX_WORDS}) — text is required, image URL and emoji are optional</label>
        <div class="gm-word-rows" id="gmWordRows"></div>
        <button class="game-btn secondary" id="gmAddWord" type="button">+ Add Word</button>
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
        <input type="text" class="gm-input" data-field="en" placeholder="Word (e.g. Dog)" value="${escapeAttr(w.en)}" />
        <input type="text" class="gm-input" data-field="image" placeholder="Image URL (optional)" value="${escapeAttr(w.image)}" />
        <input type="text" class="gm-input gm-input-emoji" data-field="emoji" placeholder="🐶" value="${escapeAttr(w.emoji)}" />
        <button class="gm-remove-row" data-remove="${i}" type="button" aria-label="Remove word" ${state.words.length <= 1 ? 'disabled' : ''}>✕</button>
      </div>
    `).join('');
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
    const cleanWords = state.words
      .map(w => ({ ...w, en: w.en.trim(), image: w.image.trim(), emoji: w.emoji.trim() || '⭐' }))
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
      <span class="level-pill" style="background:var(--primary-soft);color:var(--primary-dark)">${meta.icon} ${meta.label} · Custom Game</span>
      <h3 id="modalTitle">${igEscapeHtml(game.title)}</h3>
      <div class="game-picker" id="gmPlayPicker">
        ${GAME_TYPES.map(g => `<button class="game-pick-btn ${g.id === game.type ? 'active' : ''}" data-game="${g.id}" type="button">${g.icon} ${g.label}</button>`).join('')}
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
