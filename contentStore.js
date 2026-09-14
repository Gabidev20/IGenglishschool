/* ==========================================================================
   IGenglishschool — Content Store + Content & Games Editor
   --------------------------------------------------------------------------
   Loaded AFTER topicsData.js (the shipped curriculum) and BEFORE app.js.

   Every game in the app — Hangman, Memory, Match-up, Balloon Pop, Word
   Search, Word Match, Quick Quiz, Listen & Repeat — plays from a topic's
   `words` array. So making the curriculum editable makes every game
   editable, with one editor instead of eight.

   The teacher's changes are stored as a small PATCH document in
   localStorage, never as a copy of the whole curriculum: shipped topics
   that were never touched keep receiving updates, and "Restore original"
   is always one click away.

   LEVELS is mutated IN PLACE (length = 0 + push) rather than reassigned, so
   every module that already captured the array keeps working.
   ========================================================================== */

const CURRICULUM_KEY = 'curriculum_v1';

// Pristine, never-mutated copy of what topicsData.js shipped.
const BASE_LEVELS = JSON.parse(JSON.stringify(LEVELS));

const ContentStore = (() => {
  const listeners = [];

  function blankOverrides() {
    return { version: 1, deleted: [], patches: {}, added: {} };
  }

  function load() {
    try {
      const raw = IGStore.getJSON(CURRICULUM_KEY, null);
      if (raw && typeof raw === 'object') {
        return {
          version: 1,
          deleted: Array.isArray(raw.deleted) ? raw.deleted : [],
          patches: raw.patches && typeof raw.patches === 'object' ? raw.patches : {},
          added: raw.added && typeof raw.added === 'object' ? raw.added : {},
        };
      }
    } catch (e) { /* corrupt entry — fall through to a clean slate */ }
    return blankOverrides();
  }

  function persist(ov) {
    IGStore.setJSON(CURRICULUM_KEY, ov);
  }

  function key(levelId, topicId) { return `${levelId}:${topicId}`; }

  // -------------------------------------------------------------------------
  // MERGE — base curriculum + teacher patches -> the live LEVELS array
  // -------------------------------------------------------------------------
  function build() {
    const ov = load();
    const deleted = new Set(ov.deleted);

    return BASE_LEVELS.map(baseLevel => {
      const level = { ...baseLevel, topics: [] };

      baseLevel.topics.forEach(baseTopic => {
        const k = key(baseLevel.id, baseTopic.id);
        if (deleted.has(k)) return;
        const patch = ov.patches[k];
        level.topics.push(patch ? { ...baseTopic, ...patch } : baseTopic);
      });

      (ov.added[baseLevel.id] || []).forEach(topic => {
        const k = key(baseLevel.id, topic.id);
        if (deleted.has(k)) return;
        const patch = ov.patches[k];
        level.topics.push(patch ? { ...topic, ...patch } : topic);
      });

      return level;
    });
  }

  function apply() {
    const merged = build();
    LEVELS.length = 0;
    merged.forEach(l => LEVELS.push(l));
  }

  function notify() {
    listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  function refresh() {
    apply();
    notify();
  }

  // -------------------------------------------------------------------------
  // PUBLIC MUTATIONS
  // -------------------------------------------------------------------------
  function isShipped(levelId, topicId) {
    const lvl = BASE_LEVELS.find(l => l.id === levelId);
    return Boolean(lvl && lvl.topics.some(t => t.id === topicId));
  }

  function status(levelId, topicId) {
    const ov = load();
    if (!isShipped(levelId, topicId)) return 'new';
    return ov.patches[key(levelId, topicId)] ? 'edited' : 'original';
  }

  function saveTopic(levelId, topic) {
    const ov = load();
    const k = key(levelId, topic.id);
    ov.deleted = ov.deleted.filter(d => d !== k);
    if (isShipped(levelId, topic.id)) {
      ov.patches[k] = topic;
    } else {
      ov.added[levelId] = (ov.added[levelId] || []).filter(t => t.id !== topic.id);
      ov.added[levelId].push(topic);
      delete ov.patches[k];
    }
    persist(ov);
    refresh();
  }

  function deleteTopic(levelId, topicId) {
    const ov = load();
    const k = key(levelId, topicId);
    if (isShipped(levelId, topicId)) {
      if (!ov.deleted.includes(k)) ov.deleted.push(k);
      delete ov.patches[k];
    } else {
      ov.added[levelId] = (ov.added[levelId] || []).filter(t => t.id !== topicId);
      delete ov.patches[k];
    }
    persist(ov);
    refresh();
  }

  function resetTopic(levelId, topicId) {
    const ov = load();
    const k = key(levelId, topicId);
    delete ov.patches[k];
    ov.deleted = ov.deleted.filter(d => d !== k);
    persist(ov);
    refresh();
  }

  function resetAll() {
    IGStore.remove(CURRICULUM_KEY);
    refresh();
  }

  function countChanges() {
    const ov = load();
    return {
      edited: Object.keys(ov.patches).length,
      deleted: ov.deleted.length,
      added: Object.values(ov.added).reduce((a, list) => a + list.length, 0),
    };
  }

  function onChange(fn) { listeners.push(fn); }

  function exportJSON() { return JSON.stringify(load(), null, 2); }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('Not a valid backup file.');
    persist({
      version: 1,
      deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [],
      patches: parsed.patches || {},
      added: parsed.added || {},
    });
    refresh();
  }

  apply();

  return {
    apply, refresh, saveTopic, deleteTopic, resetTopic, resetAll,
    status, isShipped, countChanges, onChange, exportJSON, importJSON,
    BASE_LEVELS,
  };
})();

/* ==========================================================================
   CONTENT & GAMES EDITOR — UI
   ========================================================================== */

const CE_MAX_WORDS = 40;

function ceId(prefix) {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function ceSlug(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32) || ceId('t');
}

let ceLevelId = null;
let ceScrollTop = 0;

function openContentEditor(levelId) {
  ceLevelId = levelId || (LEVELS[0] && LEVELS[0].id);
  const changes = ContentStore.countChanges();

  openModal(`
    <div class="modal-content-pad content-editor">
      <h3 id="modalTitle">🧩 Content &amp; Games Editor</h3>
      <p class="ce-intro">Every game plays from a topic's word bank — edit the words here and Hangman, Memory,
        Match-up, Balloon Pop, Word Search, Word Match, Quick Quiz and Listen &amp; Repeat all update at once.</p>

      <div class="ce-toolbar">
        <div class="ce-level-tabs" id="ceLevelTabs"></div>
        <div class="ce-toolbar-actions">
          <span class="ce-change-badge" id="ceChangeBadge">${changes.edited + changes.added + changes.deleted
            ? `✏️ ${changes.edited} edited · ➕ ${changes.added} added · 🗑️ ${changes.deleted} removed`
            : '✅ Using the original curriculum'}</span>
          <button class="game-btn secondary" id="ceExportBtn" type="button">⬇️ Backup</button>
          <button class="game-btn secondary" id="ceImportBtn" type="button">⬆️ Restore backup</button>
          <button class="game-btn secondary danger" id="ceResetAllBtn" type="button">↺ Reset everything</button>
        </div>
      </div>

      <div class="ce-list" id="ceTopicList"></div>
    </div>
  `, true);

  document.getElementById('ceExportBtn').addEventListener('click', ceExportBackup);
  document.getElementById('ceImportBtn').addEventListener('click', ceImportBackup);
  document.getElementById('ceResetAllBtn').addEventListener('click', () => {
    if (!confirm('Undo every change and restore the original curriculum?\n\nAll topics and word banks you added or edited here will be lost.')) return;
    ContentStore.resetAll();
    openContentEditor(ceLevelId);
  });

  ceRenderLevelTabs();
  ceRenderTopicList();
}

function ceRenderLevelTabs() {
  const el = document.getElementById('ceLevelTabs');
  if (!el) return;
  el.innerHTML = LEVELS.map(l => `
    <button class="ce-level-tab ${l.id === ceLevelId ? 'active' : ''}" data-level="${igEscapeHtml(l.id)}"
            style="--tab-color:${igEscapeHtml(l.color)}">
      ${igEscapeHtml(l.icon)} ${igEscapeHtml(l.code)}
      <span class="ce-level-count">${l.topics.length}</span>
    </button>
  `).join('');
  el.querySelectorAll('[data-level]').forEach(btn => {
    btn.addEventListener('click', () => {
      ceLevelId = btn.dataset.level;
      ceRenderLevelTabs();
      ceRenderTopicList();
    });
  });
}

function ceRenderTopicList() {
  const el = document.getElementById('ceTopicList');
  if (!el) return;
  const level = LEVELS.find(l => l.id === ceLevelId);
  if (!level) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <div class="ce-list-head">
      <h4>${igEscapeHtml(level.code)} · ${igEscapeHtml(level.name)} — ${level.topics.length} topics</h4>
      <button class="btn btn-primary" id="ceNewTopicBtn" type="button">✨ New Topic</button>
    </div>
    ${level.topics.map(t => {
      const state = ContentStore.status(level.id, t.id);
      const badge = state === 'new' ? '<span class="ce-badge is-new">➕ Added by you</span>'
        : state === 'edited' ? '<span class="ce-badge is-edited">✏️ Edited</span>' : '';
      return `
      <div class="ce-topic-row" data-topic="${igEscapeHtml(t.id)}">
        <span class="ce-topic-media">${igImageHTML(t.image, t.emoji, t.title)}</span>
        <div class="ce-topic-info">
          <strong>${igEscapeHtml(t.title)}</strong> ${badge}
          <span class="ce-topic-meta">${t.words.length} words${t.readingTime ? ' · 📖 reading' : ''}${t.grammarTip ? ' · 💡 tip' : ''}</span>
        </div>
        <div class="ce-topic-actions">
          <button class="game-btn" data-ce-play="${igEscapeHtml(t.id)}" type="button">▶️ Play</button>
          <button class="game-btn secondary" data-ce-edit="${igEscapeHtml(t.id)}" type="button">✏️ Edit</button>
          <button class="game-btn secondary" data-ce-dup="${igEscapeHtml(t.id)}" type="button">⧉ Duplicate</button>
          ${state !== 'original' && state !== 'new' ? '' : ''}
          ${state === 'edited' ? `<button class="game-btn secondary" data-ce-reset="${igEscapeHtml(t.id)}" type="button">↺ Restore</button>` : ''}
          <button class="game-btn secondary danger" data-ce-del="${igEscapeHtml(t.id)}" type="button">🗑️ Delete</button>
        </div>
      </div>`;
    }).join('') || '<p class="ce-empty">This level has no topics left. Add one with ✨ New Topic.</p>'}
  `;

  document.getElementById('ceNewTopicBtn').addEventListener('click', () => ceOpenTopicForm(level.id, null));

  el.querySelectorAll('[data-ce-edit]').forEach(b => b.addEventListener('click', () =>
    ceOpenTopicForm(level.id, level.topics.find(t => t.id === b.dataset.ceEdit))));

  el.querySelectorAll('[data-ce-play]').forEach(b => b.addEventListener('click', () =>
    ceOpenPlayTester(level, level.topics.find(t => t.id === b.dataset.cePlay))));

  el.querySelectorAll('[data-ce-dup]').forEach(b => b.addEventListener('click', () => {
    const src = level.topics.find(t => t.id === b.dataset.ceDup);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = ceSlug(src.id + 'copy') + Math.random().toString(36).slice(2, 5);
    copy.title = src.title + ' (copy)';
    ceOpenTopicForm(level.id, copy, true);
  }));

  el.querySelectorAll('[data-ce-reset]').forEach(b => b.addEventListener('click', () => {
    const t = level.topics.find(x => x.id === b.dataset.ceReset);
    if (!confirm(`Restore "${t.title}" to the original version?\n\nYour edits to this topic will be lost.`)) return;
    ContentStore.resetTopic(level.id, b.dataset.ceReset);
    openContentEditor(level.id);
  }));

  el.querySelectorAll('[data-ce-del]').forEach(b => b.addEventListener('click', () => {
    const t = level.topics.find(x => x.id === b.dataset.ceDel);
    if (!confirm(`Delete "${t.title}"?\n\nIt will disappear from the curriculum, from every game and from the class topic picker. You can bring it back later with "Reset everything".`)) return;
    ContentStore.deleteTopic(level.id, b.dataset.ceDel);
    openContentEditor(level.id);
  }));
}

// ---------------------------------------------------------------------------
// TOPIC FORM — title/emoji/description + the word bank every game reads
// ---------------------------------------------------------------------------
function ceOpenTopicForm(levelId, existing, forceNew) {
  const isNew = !existing || forceNew;
  const draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : {
        id: '', title: '', emoji: '📘', description: '', cefr: '',
        grammarTip: '', image: '', words: [], readingTime: null,
      };
  if (!Array.isArray(draft.words)) draft.words = [];
  if (draft.words.length === 0) {
    draft.words = [ceBlankWord(), ceBlankWord(), ceBlankWord(), ceBlankWord()];
  }
  const originalId = existing && !forceNew ? existing.id : null;

  openModal(`
    <div class="modal-content-pad content-editor">
      <h3 id="modalTitle">${isNew ? '✨ New Topic' : '✏️ Edit Topic'}</h3>

      <div class="ce-form-grid">
        <div class="gm-form-field ce-span-2">
          <label for="ceTitle">Topic title</label>
          <input type="text" id="ceTitle" placeholder="e.g. Animals &amp; Pets" value="${igEscapeHtml(draft.title)}" />
        </div>
        <div class="gm-form-field">
          <label for="ceEmoji">Emoji (fallback when a photo fails)</label>
          <input type="text" id="ceEmoji" maxlength="8" value="${igEscapeHtml(draft.emoji)}" />
        </div>
        <div class="gm-form-field">
          <label for="ceCefr">CEFR label</label>
          <input type="text" id="ceCefr" placeholder="A1" value="${igEscapeHtml(draft.cefr || '')}" />
        </div>
        <div class="gm-form-field ce-span-2">
          <label for="ceDescription">Short description (shown on the topic card)</label>
          <input type="text" id="ceDescription" value="${igEscapeHtml(draft.description || '')}" />
        </div>
        <div class="gm-form-field ce-span-2">
          <label for="ceImage">Cover photo URL (optional)</label>
          <input type="text" id="ceImage" placeholder="https://…" value="${igEscapeHtml(draft.image || '')}" />
        </div>
      </div>

      <div class="gm-form-field">
        <label for="ceGrammarTip">💡 Grammar tip (optional — shown at the top of Reading Time)</label>
        <textarea id="ceGrammarTip" rows="2">${igEscapeHtml(draft.grammarTip || '')}</textarea>
      </div>

      <div class="gm-form-field">
        <label>📖 Reading text (optional — one sentence per line)</label>
        <textarea id="ceReadingText" rows="4" placeholder="Leave empty to auto-generate from the words below.">${igEscapeHtml(draft.readingTime ? draft.readingTime.text : '')}</textarea>
      </div>

      <div class="gm-form-field">
        <label>📝 Comprehension questions</label>
        <div id="ceQuestions"></div>
        <button class="game-btn secondary" id="ceAddQuestion" type="button">+ Add question</button>
      </div>

      <div class="gm-form-field">
        <label>🎮 Word bank — this is what every game plays with (4–${CE_MAX_WORDS} words)</label>
        <div class="ce-word-head">
          <span></span><span>English</span><span>Português</span><span>Emoji</span><span>Photo URL</span><span>Colour</span><span></span>
        </div>
        <div class="ce-word-rows" id="ceWordRows"></div>
        <div class="game-btn-row" style="margin-top:10px">
          <button class="game-btn secondary" id="ceAddWord" type="button">+ Add word</button>
          <button class="game-btn secondary" id="ceFindPhotos" type="button">🔎 Find real photos</button>
        </div>
        <p class="ce-hint" id="ceFindStatus" hidden></p>
      </div>

      <p class="gm-form-error" id="ceFormError" hidden></p>

      <div class="game-btn-row" style="margin-top:18px">
        <button class="btn btn-primary" id="ceSaveBtn" type="button">💾 Save topic</button>
        <button class="game-btn secondary" id="ceBackBtn" type="button">← Back to list</button>
      </div>
    </div>
  `, true);

  ceRenderWordRows(draft);
  ceRenderQuestions(draft);

  document.getElementById('ceAddWord').addEventListener('click', () => {
    if (draft.words.length >= CE_MAX_WORDS) return;
    draft.words.push(ceBlankWord());
    ceRenderWordRows(draft);
  });

  document.getElementById('ceAddQuestion').addEventListener('click', () => {
    if (!draft.readingTime) draft.readingTime = { text: '', questions: [] };
    draft.readingTime.questions.push({ prompt: '', options: ['', '', ''], correct: '' });
    ceRenderQuestions(draft);
  });

  document.getElementById('ceFindPhotos').addEventListener('click', () => ceFindPhotos(draft));
  document.getElementById('ceBackBtn').addEventListener('click', () => openContentEditor(levelId));
  document.getElementById('ceSaveBtn').addEventListener('click', () => ceSaveTopic(levelId, draft, originalId, isNew));
}

function ceBlankWord() {
  return { id: ceId('w'), en: '', pt: '', emoji: '⭐', image: '', swatch: '' };
}

function ceRenderWordRows(draft) {
  const el = document.getElementById('ceWordRows');
  if (!el) return;

  el.innerHTML = draft.words.map((w, i) => `
    <div class="ce-word-row" data-index="${i}">
      <span class="ce-word-preview">${igWordVisualHTML({ ...w, swatch: w.swatch || null }, 'ce-word-visual')}</span>
      <input type="text" class="gm-input" data-field="en" placeholder="dog" value="${igEscapeHtml(w.en)}" />
      <input type="text" class="gm-input" data-field="pt" placeholder="cachorro" value="${igEscapeHtml(w.pt || '')}" />
      <input type="text" class="gm-input gm-input-emoji" data-field="emoji" maxlength="8" value="${igEscapeHtml(w.emoji || '')}" />
      <input type="text" class="gm-input" data-field="image" placeholder="https://… (link only)" value="${igEscapeHtml(w.image || '')}" />
      <input type="text" class="gm-input ce-input-swatch" data-field="swatch" placeholder="#ff0000" value="${igEscapeHtml(w.swatch || '')}" />
      <button class="gm-remove-row" data-ce-remove="${i}" type="button" aria-label="Remove word">✕</button>
    </div>
  `).join('');

  // The preview refreshes on `change`/blur, not on every keystroke — an
  // input listener would fire a network request for each character typed
  // into the photo URL field.
  el.querySelectorAll('.ce-word-row').forEach(row => {
    const idx = Number(row.dataset.index);
    row.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('input', () => { draft.words[idx][input.dataset.field] = input.value; });
      input.addEventListener('change', () => {
        draft.words[idx][input.dataset.field] = input.value;
        const preview = row.querySelector('.ce-word-preview');
        if (preview) preview.innerHTML = igWordVisualHTML({ ...draft.words[idx], swatch: draft.words[idx].swatch || null }, 'ce-word-visual');
      });
    });
  });

  el.querySelectorAll('[data-ce-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      draft.words.splice(Number(btn.dataset.ceRemove), 1);
      ceRenderWordRows(draft);
    });
  });
}

function ceRenderQuestions(draft) {
  const el = document.getElementById('ceQuestions');
  if (!el) return;
  const questions = (draft.readingTime && draft.readingTime.questions) || [];

  // While editing, which option is correct is tracked by INDEX. Tracking it
  // by its text instead means a blank new question (correct === '') matches
  // every still-blank option, so the first option the teacher types silently
  // becomes the right answer without them ticking anything.
  questions.forEach(q => {
    if (typeof q._correctIdx !== 'number') {
      const idx = q.options.indexOf(q.correct);
      q._correctIdx = (q.correct && idx >= 0) ? idx : -1;
    }
  });

  if (questions.length === 0) {
    el.innerHTML = `<p class="ce-hint">No comprehension questions yet — the app will generate some automatically.</p>`;
    return;
  }

  el.innerHTML = questions.map((q, i) => `
    <div class="ce-question" data-q="${i}">
      <div class="ce-question-head">
        <strong>Question ${i + 1}</strong>
        <button class="gm-remove-row" data-ce-qremove="${i}" type="button" aria-label="Remove question">✕</button>
      </div>
      <input type="text" class="gm-input" data-qfield="prompt" placeholder="What colour is the cat?" value="${igEscapeHtml(q.prompt)}" />
      <div class="ce-options">
        ${q.options.map((opt, oi) => `
          <label class="ce-option">
            <input type="radio" name="ceCorrect${i}" data-correct="${oi}" ${q._correctIdx === oi ? 'checked' : ''} />
            <input type="text" class="gm-input" data-option="${oi}" placeholder="Option ${oi + 1}" value="${igEscapeHtml(opt)}" />
          </label>
        `).join('')}
      </div>
      <p class="ce-hint">Tick the radio button next to the correct answer.</p>
    </div>
  `).join('');

  el.querySelectorAll('.ce-question').forEach(qEl => {
    const i = Number(qEl.dataset.q);
    qEl.querySelector('[data-qfield="prompt"]').addEventListener('input', (e) => {
      questions[i].prompt = e.target.value;
    });
    qEl.querySelectorAll('[data-option]').forEach(input => {
      input.addEventListener('input', () => {
        const oi = Number(input.dataset.option);
        questions[i].options[oi] = input.value;
        // `correct` follows the ticked INDEX, so retyping the answer's text
        // keeps it the answer and typing into another option doesn't steal it.
        if (questions[i]._correctIdx >= 0) questions[i].correct = questions[i].options[questions[i]._correctIdx];
      });
    });
    qEl.querySelectorAll('[data-correct]').forEach(radio => {
      radio.addEventListener('change', () => {
        questions[i]._correctIdx = Number(radio.dataset.correct);
        questions[i].correct = questions[i].options[questions[i]._correctIdx];
      });
    });
    qEl.querySelector('[data-ce-qremove]').addEventListener('click', () => {
      questions.splice(i, 1);
      ceRenderQuestions(draft);
    });
  });
}

// ---------------------------------------------------------------------------
// SAVE — validates before writing, so a broken topic can never reach a game
// ---------------------------------------------------------------------------
function ceSaveTopic(levelId, draft, originalId, isNew) {
  const errorEl = document.getElementById('ceFormError');
  const fail = (msg) => { errorEl.textContent = msg; errorEl.hidden = false; errorEl.scrollIntoView({ block: 'center' }); };

  draft.title = document.getElementById('ceTitle').value.trim();
  draft.emoji = document.getElementById('ceEmoji').value.trim() || '📘';
  draft.cefr = document.getElementById('ceCefr').value.trim();
  draft.description = document.getElementById('ceDescription').value.trim();
  draft.image = document.getElementById('ceImage').value.trim();
  draft.grammarTip = document.getElementById('ceGrammarTip').value.trim();
  const readingText = document.getElementById('ceReadingText').value.trim();

  if (!draft.title) return fail('Please give the topic a title.');

  const words = draft.words
    .map(w => {
      // An emoji typed into the photo column is moved back to the emoji
      // column rather than saved as an <img src> that can never load.
      const n = igNormalizeWord(w);
      return {
        id: w.id || ceId('w'),
        en: String(n.en || '').trim(),
        pt: String(n.pt || '').trim(),
        emoji: String(n.emoji || '').trim() || '⭐',
        image: String(n.image || '').trim(),
        swatch: String(n.swatch || '').trim(),
      };
    })
    .filter(w => w.en.length > 0)
    .map(w => {
      const clean = { id: w.id, en: w.en, emoji: w.emoji };
      if (w.pt) clean.pt = w.pt;
      if (w.image) clean.image = w.image;
      if (w.swatch) clean.swatch = w.swatch;
      return clean;
    });

  // 4 is the hard floor: Quick Quiz, Word Match and Listen & Repeat all build
  // a question from 1 answer + 3 distractors.
  if (words.length < 4) return fail(`Add at least 4 words — the games need one answer plus three wrong options. You have ${words.length}.`);

  const ids = new Set();
  for (const w of words) {
    if (ids.has(w.id)) w.id = ceId('w');
    ids.add(w.id);
  }
  draft.words = words;

  const questions = ((draft.readingTime && draft.readingTime.questions) || [])
    .map(q => {
      const picked = q._correctIdx >= 0 ? q.options[q._correctIdx] : '';
      return {
        prompt: String(q.prompt || '').trim(),
        options: q.options.map(o => String(o || '').trim()).filter(Boolean),
        correct: String(picked || '').trim(),
      };
    })
    .filter(q => q.prompt);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.options.length < 2) return fail(`Question ${i + 1} needs at least 2 answer options.`);
    if (new Set(q.options).size !== q.options.length) return fail(`Question ${i + 1} has two identical options — every option must be different.`);
    if (!q.correct) return fail(`Question ${i + 1}: tick which option is the correct answer.`);
    if (!q.options.includes(q.correct)) return fail(`Question ${i + 1}: the option you ticked as correct is empty.`);
  }

  if (readingText) {
    draft.readingTime = { text: readingText, questions };
  } else if (questions.length) {
    return fail('You added comprehension questions but no reading text — add the text, or remove the questions.');
  } else {
    delete draft.readingTime;
  }

  if (!draft.image) delete draft.image;
  if (!draft.grammarTip) delete draft.grammarTip;
  if (!draft.cefr) delete draft.cefr;
  if (!draft.description) draft.description = draft.title;

  if (isNew || !draft.id) {
    let id = ceSlug(draft.title);
    const level = LEVELS.find(l => l.id === levelId);
    const taken = new Set(level.topics.filter(t => t.id !== originalId).map(t => t.id));
    let candidate = id, n = 2;
    while (taken.has(candidate)) candidate = `${id}${n++}`;
    draft.id = candidate;
  }

  ContentStore.saveTopic(levelId, draft);
  openContentEditor(levelId);
}

// ---------------------------------------------------------------------------
// FIND REAL PHOTOS — fills empty photo URLs from Wikipedia/Wikimedia Commons
// ---------------------------------------------------------------------------
async function ceFindPhotos(draft) {
  const status = document.getElementById('ceFindStatus');
  const targets = draft.words.filter(w => w.en.trim() && !w.image.trim() && !w.swatch.trim());
  if (targets.length === 0) {
    status.hidden = false;
    status.textContent = 'Every word already has a photo or a colour.';
    return;
  }

  status.hidden = false;
  let found = 0;

  for (let i = 0; i < targets.length; i++) {
    const w = targets[i];
    status.textContent = `Searching real photos… ${i + 1}/${targets.length} (“${w.en}”)`;
    try {
      const term = w.en.trim().replace(/^(a|an|the)\s+/i, '');
      const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2'
        + '&prop=pageimages&piprop=thumbnail&pithumbsize=400&origin=*&redirects=1&titles='
        + encodeURIComponent(term.charAt(0).toUpperCase() + term.slice(1));
      const res = await fetch(url);
      const json = await res.json();
      const page = (json.query && json.query.pages || []).find(p => p.thumbnail);
      if (page) {
        // Use the URL exactly as returned — Wikimedia only serves thumbnail
        // widths it has already rendered, so rewriting the size 400s.
        w.image = page.thumbnail.source.split('?')[0];
        found++;
      }
    } catch (e) { /* offline or blocked — leave the emoji fallback in place */ }
  }

  ceRenderWordRows(draft);
  status.textContent = found
    ? `✅ Found ${found} photo${found === 1 ? '' : 's'}. Check them and edit any URL you don't like.`
    : '😕 No photos found — the emoji fallback will be used.';
}

// ---------------------------------------------------------------------------
// PLAY TESTER — try the edited topic in any of the 5 game engines
// ---------------------------------------------------------------------------
function ceOpenPlayTester(level, topic) {
  let type = GAME_TYPES[0].id;

  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb">${igImageHTML(topic.image, topic.emoji, topic.title)}</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">${igEscapeHtml(topic.title)}</h3>
          <p class="modal-head-sub">
            <span class="level-pill" style="background:${level.color}22;color:${level.color}">${igEscapeHtml(level.code)} · ${igEscapeHtml(level.name)}</span>
          </p>
        </div>
      </div>
      <div class="game-picker" id="cePlayPicker">
        ${GAME_TYPES.map(g => `<button class="game-pick-btn ${g.id === type ? 'active' : ''}" data-game="${g.id}" type="button">${g.icon} ${g.label}</button>`).join('')}
      </div>
      <div class="game-mount" id="gameMount"></div>
      <div class="game-btn-row" style="margin-top:12px">
        <button class="game-btn secondary" id="ceBackFromPlay" type="button">← Back to the editor</button>
      </div>
    </div>
  `, true);

  const picker = document.getElementById('cePlayPicker');
  picker.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-game]');
    if (!btn) return;
    type = btn.dataset.game;
    picker.querySelectorAll('.game-pick-btn').forEach(b => b.classList.toggle('active', b === btn));
    GameEngine.mount(document.getElementById('gameMount'), topic, type);
  });

  document.getElementById('ceBackFromPlay').addEventListener('click', () => openContentEditor(level.id));
  GameEngine.mount(document.getElementById('gameMount'), topic, type);
}

// ---------------------------------------------------------------------------
// BACKUP / RESTORE
// ---------------------------------------------------------------------------
function ceExportBackup() {
  const blob = new Blob([ContentStore.exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `igenglishschool-content-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function ceImportBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        ContentStore.importJSON(String(reader.result));
        openContentEditor(ceLevelId);
      } catch (e) {
        alert('That file is not a valid content backup: ' + e.message);
      }
    };
    reader.readAsText(file);
  });
  input.click();
}
