/* ==========================================================================
   IGenglishschool — What each student's link can open
   --------------------------------------------------------------------------
   A student's link used to offer every topic of their level. For a seven-
   year-old placed at A1 that meant Present Simple and Present Continuous
   next to Colors and Weather. Now each link opens only:

     • vocabulary topics of the student's level (young learners also keep
       the levels below — colours and numbers stay useful),
     • grammar topics the teacher has ALREADY taught them (from the class
       log), and
     • whatever the teacher ticks by hand in the link window.

   Stored per student under `student_access`:
     { custom: string[] | null,   // the teacher's own choice (null = automatic)
       taught: string[] }         // topic keys seen in the class log
   `taught` is refreshed on the teacher's side, because the class log never
   travels to the student's device.

   Keys:  t:<levelId>:<topicId>  a curriculum topic (Games list)
          g:<id>                  a ready-made picture game (Colors, Weather…)
          p:<id>                  a Practice topic (exam-style games)
   ========================================================================== */

const STUDENT_ACCESS_KEY = 'student_access';

const SA_READY_GAMES = [
  { id: 'colors', icon: '🎨', label: 'Colors' },
  { id: 'feelings', icon: '😊', label: 'Feelings' },
  { id: 'weather', icon: '🌦️', label: 'Weather' },
  { id: 'body', icon: '🧍', label: 'Body Parts' },
  { id: 'animals', icon: '🦁', label: 'Animals' },
  { id: 'music', icon: '🎸', label: 'Music' },
  { id: 'house', icon: '🏠', label: 'House' },
  { id: 'where', icon: '📦', label: 'Where is it?' },
  { id: 'backpack', icon: '🎒', label: 'Backpack' },
];

// Exam-style practice topics for grown-ups, by the level that meets them.
const SA_PRACTICE_LEVEL = {
  plurals: 'a0', thereisare: 'a1', presentsimple: 'a1', prepositions: 'a1', questions: 'a1', ordinals: 'a1',
  bignumbers: 'a1', pastsimple: 'a2', verbs: 'a2', whpast: 'a2', presentcontinuous: 'a1',
  comparatives: 'a2', future: 'a2', modals: 'a2', tenses: 'b1',
};

// ---------------------------------------------------------------------------
// STORAGE
// ---------------------------------------------------------------------------
function saLoadAll() {
  const map = IGStore.getJSON(STUDENT_ACCESS_KEY, {});
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}
function saRecord(studentId) {
  const r = saLoadAll()[studentId];
  return {
    custom: r && Array.isArray(r.custom) ? r.custom : null,
    taught: r && Array.isArray(r.taught) ? r.taught : [],
  };
}
function saWrite(studentId, patch) {
  const map = saLoadAll();
  map[studentId] = { ...saRecord(studentId), ...patch };
  IGStore.setJSON(STUDENT_ACCESS_KEY, map);
}

// ---------------------------------------------------------------------------
// WHAT EXISTS
// ---------------------------------------------------------------------------
const saIsGrammar = topic => Array.isArray(topic.rules) && topic.rules.length > 0;
const saTopicKey = (levelId, topicId) => `t:${levelId}:${topicId}`;
const saLevelIndex = id => (typeof LEVELS !== 'undefined' ? LEVELS.findIndex(l => l.id === id) : -1);

function saPracticeTopics(student) {
  const prof = typeof studentProfile === 'function' ? studentProfile(student) : 'writer';
  if (prof === 'reader' && typeof KID_TOPICS !== 'undefined') return KID_TOPICS;
  if (prof === 'writer' && typeof WRITER_TOPICS !== 'undefined') return WRITER_TOPICS;
  // Grown-ups: their everyday-English topics first, then the grammar.
  if (prof === 'adult' && typeof EXAM_TOPICS !== 'undefined') return EXAM_TOPICS.filter(t => t.adult).concat(EXAM_TOPICS.filter(t => SA_PRACTICE_LEVEL[t.id]));
  return [];
}

// Topic keys whose title appears in this student's class log.
function saComputeTaught(student) {
  if (typeof loadSessions !== 'function' || typeof LEVELS === 'undefined') return [];
  const labels = loadSessions(student.id).map(s => String(s.topicLabel || '').toLowerCase()).filter(Boolean);
  if (!labels.length) return [];
  const out = [];
  LEVELS.forEach(l => l.topics.forEach(t => {
    const title = String(t.title || '').toLowerCase();
    if (title && labels.some(x => x.includes(title))) out.push(saTopicKey(l.id, t.id));
  }));
  return out;
}

// Teacher side only: keep `taught` current for every student, so the link
// on the family's phone knows which grammar has already been covered.
function saRefreshTaughtAll() {
  if (window.IG_SHARE_MODE || typeof loadStudents !== 'function') return;
  const map = saLoadAll();
  let changed = false;
  loadStudents().forEach(s => {
    const taught = saComputeTaught(s);
    const prev = map[s.id] && Array.isArray(map[s.id].taught) ? map[s.id].taught : [];
    if (taught.join('|') !== prev.join('|')) {
      map[s.id] = { custom: map[s.id] && Array.isArray(map[s.id].custom) ? map[s.id].custom : null, taught };
      changed = true;
    }
  });
  if (changed) IGStore.setJSON(STUDENT_ACCESS_KEY, map);
}

// ---------------------------------------------------------------------------
// THE AUTOMATIC CHOICE
// ---------------------------------------------------------------------------
function saDefaultKeys(student) {
  if (!student || typeof LEVELS === 'undefined') return [];
  const prof = typeof studentProfile === 'function' ? studentProfile(student) : 'writer';
  const young = prof === 'prereader' || prof === 'reader';
  const grown = typeof igIsGrownup === 'function' && igIsGrownup(student);
  const taught = new Set(saRecord(student.id).taught.concat(window.IG_SHARE_MODE ? [] : saComputeTaught(student)));
  const own = Math.max(0, saLevelIndex(student.levelId));
  const keys = [];

  LEVELS.forEach((l, i) => {
    const inRange = young ? i <= own : i === own;
    l.topics.forEach(t => {
      const key = saTopicKey(l.id, t.id);
      if (taught.has(key)) { keys.push(key); return; }
      if (!inRange) return;
      if (t.audience === 'adult' && !grown) return;
      if (saIsGrammar(t)) return;              // grammar only once it was taught
      keys.push(key);
    });
  });

  if (young) SA_READY_GAMES.forEach(g => keys.push(`g:${g.id}`));

  const taughtTitles = [...taught].join(' ');
  saPracticeTopics(student).forEach(t => {
    if (prof === 'writer') {
      // Past simple and present continuous wait until they appear in class.
      if (t.id === 'easy-past' && !/past/.test(taughtTitles)) return;
      if (t.id === 'easy-prescont' && !/presentcontinuous/.test(taughtTitles)) return;
    }
    if (prof === 'adult' && saLevelIndex(t.level || SA_PRACTICE_LEVEL[t.id]) > own) return;
    keys.push(`p:${t.id}`);
  });
  return keys;
}

function saAllowedKeys(student) {
  const rec = saRecord(student.id);
  return new Set(rec.custom || saDefaultKeys(student));
}
function saIsCustom(student) { return Boolean(saRecord(student.id).custom); }

// What the student page reads.
function saAllowedTopics(student) {
  const allowed = saAllowedKeys(student);
  const grown = typeof igIsGrownup === 'function' && igIsGrownup(student);
  const list = [];
  (typeof LEVELS !== 'undefined' ? LEVELS : []).forEach(l => l.topics.forEach(t => {
    if (allowed.has(saTopicKey(l.id, t.id))) list.push({ ...t, levelId: l.id });
  }));
  // Grown-ups see their everyday-English topics first.
  if (grown) list.sort((a, b) => (b.audience === 'adult') - (a.audience === 'adult'));
  return list;
}
function saGameAllowed(student, id) { return saAllowedKeys(student).has(`g:${id}`); }
function saAllowedPractice(student) {
  const allowed = saAllowedKeys(student);
  return saPracticeTopics(student).filter(t => allowed.has(`p:${t.id}`));
}

// ---------------------------------------------------------------------------
// TEACHER UI — the checklist inside the link window
// ---------------------------------------------------------------------------
function saEditorHTML(student) {
  const esc = s => igEscapeHtml(String(s == null ? '' : s));
  const allowed = saAllowedKeys(student);
  const taught = new Set(saComputeTaught(student));
  const own = Math.max(0, saLevelIndex(student.levelId));
  const grown = typeof igIsGrownup === 'function' && igIsGrownup(student);
  const prof = typeof studentProfile === 'function' ? studentProfile(student) : 'writer';
  const box = (key, label, extra) => `
    <label class="sa-item${taught.has(key) ? ' is-taught' : ''}">
      <input type="checkbox" data-sa-key="${esc(key)}" ${allowed.has(key) ? 'checked' : ''} />
      <span>${label}${extra || ''}</span>
    </label>`;

  const levels = (typeof LEVELS !== 'undefined' ? LEVELS : []).map((l, i) => {
    const topics = l.topics.filter(t => grown || t.audience !== 'adult');
    if (!topics.length) return '';
    const on = topics.filter(t => allowed.has(saTopicKey(l.id, t.id))).length;
    return `
      <details class="sa-level" ${i === own ? 'open' : ''}>
        <summary><b>${esc(l.code)} · ${esc(l.name)}</b>${i === own ? ' <span class="sa-badge">nível do aluno</span>' : ''} <small>${on} de ${topics.length} liberados</small></summary>
        <div class="sa-grid">
          ${topics.map(t => box(saTopicKey(l.id, t.id), `${esc(t.emoji || '')} ${esc(t.title)}`,
            `${saIsGrammar(t) ? ' <small class="sa-tag">gramática</small>' : ''}${taught.has(saTopicKey(l.id, t.id)) ? ' <small class="sa-tag sa-tag--ok">já dado</small>' : ''}`)).join('')}
        </div>
      </details>`;
  }).join('');

  const practice = saPracticeTopics(student);
  const young = prof === 'prereader' || prof === 'reader';

  return `
    <div class="sa-editor" id="saEditor">
      <div class="sa-head">
        <h4>📚 O que ${esc(student.name)} pode acessar no link</h4>
        <span class="sa-mode ${saIsCustom(student) ? 'is-custom' : ''}">${saIsCustom(student) ? '✋ escolhido por você' : '⚙️ automático'}</span>
      </div>
      <p class="sa-lead">No automático o link mostra o vocabulário do nível ${esc((LEVELS[own] || {}).code || '')}
        ${young ? 'e dos níveis anteriores' : ''} e só a gramática que já apareceu no registro das aulas
        (<span class="sa-tag sa-tag--ok">já dado</span>). Marque ou desmarque para escolher você mesma.</p>

      ${young ? `
        <p class="sa-group-label">🎮 Jogos com figuras</p>
        <div class="sa-grid">${SA_READY_GAMES.map(g => box(`g:${g.id}`, `${g.icon} ${esc(g.label)}`)).join('')}</div>` : ''}

      ${practice.length ? `
        <p class="sa-group-label">⚡ Treinos (Practice / Writing)</p>
        <div class="sa-grid">${practice.map(t => box(`p:${t.id}`, esc(t.label))).join('')}</div>` : ''}

      <p class="sa-group-label">📖 Tópicos do currículo (jogos, ditado e speaking)</p>
      ${levels}

      <div class="game-btn-row sa-actions">
        <button class="game-btn secondary" type="button" id="saTaughtOnly">✅ Só o que já foi dado</button>
        <button class="game-btn secondary" type="button" id="saAuto">⚙️ Voltar ao automático</button>
      </div>
      <p class="sa-saved" id="saSaved" aria-live="polite"></p>
    </div>`;
}

function saWireEditor(root, student, onChange) {
  const ed = root.querySelector('#saEditor');
  if (!ed) return;
  const saved = ed.querySelector('#saSaved');
  const flash = (t) => { saved.textContent = t; clearTimeout(saWireEditor._t); saWireEditor._t = setTimeout(() => { saved.textContent = ''; }, 1800); };
  const repaint = () => {
    const holder = ed.parentElement;
    const open = [...ed.querySelectorAll('details.sa-level')].map(d => d.open);
    ed.outerHTML = saEditorHTML(student);
    holder.querySelectorAll('#saEditor details.sa-level').forEach((d, i) => { if (open[i] != null) d.open = open[i]; });
    saWireEditor(holder, student, onChange);
  };

  ed.addEventListener('change', (e) => {
    const input = e.target.closest('[data-sa-key]');
    if (!input) return;
    const keys = saAllowedKeys(student);
    if (input.checked) keys.add(input.dataset.saKey); else keys.delete(input.dataset.saKey);
    saWrite(student.id, { custom: [...keys], taught: saComputeTaught(student) });
    flash('✅ Salvo — o link já mostra isso.');
    const mode = ed.querySelector('.sa-mode');
    if (mode) { mode.textContent = '✋ escolhido por você'; mode.classList.add('is-custom'); }
    if (onChange) onChange();
  });
  ed.querySelector('#saAuto').addEventListener('click', () => {
    saWrite(student.id, { custom: null, taught: saComputeTaught(student) });
    repaint();
    flash('⚙️ Automático outra vez.');
    if (onChange) onChange();
  });
  ed.querySelector('#saTaughtOnly').addEventListener('click', () => {
    const taught = saComputeTaught(student);
    const keep = [...saAllowedKeys(student)].filter(k => !k.startsWith('t:'));
    saWrite(student.id, { custom: keep.concat(taught), taught });
    repaint();
    flash(taught.length ? '✅ Só os tópicos que já estão no registro das aulas.' : 'Nenhum tópico no registro das aulas ainda.');
    if (onChange) onChange();
  });
}
