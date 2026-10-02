/* ==========================================================================
   IGenglishschool — Printables
   Paper the teacher can hand out: bingo cards, flashcards to cut, a word
   search, a tracing sheet, a vocabulary list — all built from the word banks
   the curriculum already has — plus the end-of-level certificate.

   Everything prints through the same hidden root the reports use, so the
   existing @media print rule (hide the app, show that root) applies.
   ========================================================================== */

function prEsc(s) { return igEscapeHtml(String(s == null ? '' : s)); }

function prPrintRoot() {
  if (typeof getPrintRoot === 'function') return getPrintRoot();
  let root = document.getElementById('reportPrintRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'reportPrintRoot';
    document.body.appendChild(root);
  }
  return root;
}

function prPrint(html) {
  const root = prPrintRoot();
  root.innerHTML = `<div class="pr-print">${html}</div>`;
  setTimeout(() => {
    try { window.print(); }
    catch (e) { alert('O navegador bloqueou a impressão. Use Ctrl+P.'); }
  }, 60);
}

function prShuffle(a) {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// WORD SEARCH — its own generator, since the game's one lives inside the
// GameEngine closure and this has to run on paper, not on a canvas.
// ---------------------------------------------------------------------------
const PR_DIRS = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]];
const PR_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function prWordSearch(words, size) {
  const n = size || 12;
  const grid = Array.from({ length: n }, () => new Array(n).fill(''));
  const placed = [];

  const fits = (word, r, c, [dr, dc]) => {
    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) return false;
      if (grid[rr][cc] && grid[rr][cc] !== word[i]) return false;
    }
    return true;
  };

  prShuffle(words).forEach(raw => {
    const word = String(raw).toUpperCase().replace(/[^A-Z]/g, '');
    if (!word || word.length > n) return;
    for (let tries = 0; tries < 140; tries++) {
      const dir = PR_DIRS[Math.floor(Math.random() * PR_DIRS.length)];
      const r = Math.floor(Math.random() * n);
      const c = Math.floor(Math.random() * n);
      if (!fits(word, r, c, dir)) continue;
      for (let i = 0; i < word.length; i++) grid[r + dir[0] * i][c + dir[1] * i] = word[i];
      placed.push(raw);
      return;
    }
  });

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!grid[r][c]) grid[r][c] = PR_ALPHABET[Math.floor(Math.random() * 26)];
    }
  }
  return { grid, placed };
}

// ---------------------------------------------------------------------------
// SHEETS
// ---------------------------------------------------------------------------
function prHeader(title, subtitle) {
  return `
    <header class="pr-head">
      <div class="pr-brand">IG English School</div>
      <h2>${prEsc(title)}</h2>
      ${subtitle ? `<p class="pr-sub">${prEsc(subtitle)}</p>` : ''}
      <div class="pr-meta"><span>Name: <b class="pr-line"></b></span><span>Date: <b class="pr-line short"></b></span></div>
    </header>`;
}

function prBingoSheet(words, topicTitle, cards, dim) {
  const per = dim * dim;
  const usable = words.filter(w => w.en);
  const sheets = [];
  for (let i = 0; i < cards; i++) {
    const picked = prShuffle(usable).slice(0, per);
    sheets.push(`
      <section class="pr-bingo">
        <h3>BINGO — ${prEsc(topicTitle)} <span>card ${i + 1}</span></h3>
        <table class="pr-bingo-grid pr-dim-${dim}">
          ${Array.from({ length: dim }, (_, r) => `
            <tr>${Array.from({ length: dim }, (_, c) => {
              const w = picked[r * dim + c];
              return `<td>${w ? `<span class="pr-bingo-emoji">${prEsc(w.emoji || '⭐')}</span><span class="pr-bingo-word">${prEsc(w.en)}</span>` : ''}</td>`;
            }).join('')}</tr>`).join('')}
        </table>
      </section>`);
  }
  return prHeader(`Bingo — ${topicTitle}`, 'Cut along the lines. Call the words in English.') + sheets.join('');
}

function prFlashcardSheet(words, topicTitle, withPt) {
  return prHeader(`Flashcards — ${topicTitle}`, 'Cut out the cards. Fold if you want the meaning on the back.') + `
    <section class="pr-cards">
      ${words.map(w => `
        <div class="pr-card">
          <span class="pr-card-emoji">${prEsc(w.emoji || '⭐')}</span>
          <b>${prEsc(w.en)}</b>
          ${withPt && w.pt ? `<small>${prEsc(w.pt)}</small>` : ''}
        </div>`).join('')}
    </section>`;
}

function prWordSearchSheet(words, topicTitle) {
  const list = words.map(w => w.en).filter(w => /^[A-Za-z\s-]+$/.test(w)).slice(0, 12);
  const { grid, placed } = prWordSearch(list, 13);
  return prHeader(`Word Search — ${topicTitle}`, 'Find every word from the list. They can go in any direction.') + `
    <section class="pr-ws">
      <table class="pr-ws-grid">
        ${grid.map(row => `<tr>${row.map(ch => `<td>${ch}</td>`).join('')}</tr>`).join('')}
      </table>
      <ul class="pr-ws-list">${placed.map(w => `<li>${prEsc(w)}</li>`).join('')}</ul>
    </section>`;
}

function prTracingSheet(words, topicTitle) {
  return prHeader(`Handwriting — ${topicTitle}`, 'Trace the word, then write it twice on your own.') + `
    <section class="pr-trace">
      ${words.slice(0, 8).map(w => `
        <div class="pr-trace-row">
          <span class="pr-trace-emoji">${prEsc(w.emoji || '⭐')}</span>
          <div class="pr-trace-lines">
            <span class="pr-trace-ghost">${prEsc(w.en)}</span>
            <span class="pr-trace-rule"></span>
            <span class="pr-trace-rule"></span>
          </div>
        </div>`).join('')}
    </section>`;
}

function prVocabSheet(words, topicTitle) {
  const shuffled = prShuffle(words);
  return prHeader(`Vocabulary — ${topicTitle}`, 'Match each picture to the word, then write the meaning.') + `
    <section class="pr-vocab">
      <table class="pr-vocab-table">
        <thead><tr><th></th><th>English</th><th>Português</th></tr></thead>
        <tbody>
          ${shuffled.map(w => `
            <tr>
              <td class="pr-vocab-emoji">${prEsc(w.emoji || '⭐')}</td>
              <td class="pr-vocab-blank"></td>
              <td class="pr-vocab-blank"></td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p class="pr-wordbank"><b>Word bank:</b> ${prShuffle(words).map(w => prEsc(w.en)).join(' · ')}</p>
    </section>`;
}

// ---------------------------------------------------------------------------
// THE PICKER
// ---------------------------------------------------------------------------
const PR_SHEETS = [
  { id: 'bingo', icon: '🎲', label: 'Bingo', hint: 'Cartelas para a turma toda' },
  { id: 'flashcards', icon: '🗂️', label: 'Flashcards', hint: 'Cartões para recortar' },
  { id: 'wordsearch', icon: '🔍', label: 'Caça-palavras', hint: 'Grade 13×13 com a lista' },
  { id: 'tracing', icon: '✏️', label: 'Caligrafia', hint: 'Cobrir o pontilhado e copiar' },
  { id: 'vocab', icon: '📋', label: 'Lista de vocabulário', hint: 'Escrever a palavra e o significado' },
];

function prAllTopics() {
  if (typeof LEVELS === 'undefined') return [];
  return LEVELS.flatMap(l => (l.topics || []).map(t => ({ ...t, levelId: l.id, levelTitle: l.title || l.label || l.id })));
}

function openPrintables() {
  const topics = prAllTopics().filter(t => (t.words || []).length >= 4);
  const state = {
    topicId: topics.length ? topics[0].id : '',
    custom: '',
    cards: 4,
    dim: 3,
    withPt: true,
  };

  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">🖨️ Materiais para imprimir</h3>
      <p class="lt-count-note">Tudo é montado a partir dos bancos de palavras do curso.</p>
      <div id="prMount"></div>
    </div>`, true);

  const mount = document.getElementById('prMount');

  function currentWords() {
    if (state.custom.trim()) {
      return state.custom.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean).slice(0, 24)
        .map(line => {
          const [en, pt] = line.split(/\s*[=\-–]\s*/);
          return { en: (en || line).trim(), pt: (pt || '').trim(), emoji: '⭐' };
        });
    }
    const topic = topics.find(t => t.id === state.topicId);
    return topic ? (topic.words || []).map(w => ({ en: w.en, pt: w.pt, emoji: w.emoji || '⭐' })) : [];
  }
  function currentTitle() {
    if (state.custom.trim()) return 'Minha lista';
    const topic = topics.find(t => t.id === state.topicId);
    return topic ? topic.title : '';
  }

  function paint() {
    const words = currentWords();
    mount.innerHTML = `
      <div class="exam-builder">
        <div class="exam-row">
          <label class="exam-field small">
            <span class="exam-label">Tópico do curso</span>
            <select id="prTopic" class="hw-select">
              ${topics.map(t => `<option value="${t.id}" ${t.id === state.topicId ? 'selected' : ''}>${prEsc(t.emoji || '')} ${prEsc(t.title)} — ${prEsc(t.levelTitle)}</option>`).join('')}
            </select>
          </label>
          <label class="exam-field small">
            <span class="exam-label">Cartelas de bingo</span>
            <input type="number" id="prCards" min="1" max="12" value="${state.cards}" />
          </label>
          <label class="exam-field small">
            <span class="exam-label">Tamanho da cartela</span>
            <select id="prDim" class="hw-select">
              <option value="3" ${state.dim === 3 ? 'selected' : ''}>3 × 3</option>
              <option value="4" ${state.dim === 4 ? 'selected' : ''}>4 × 4</option>
            </select>
          </label>
        </div>

        <label class="exam-field">
          <span class="exam-label">Ou use a minha lista <small>— uma por linha, "word = tradução"</small></span>
          <textarea id="prCustom" rows="3" placeholder="cat = gato&#10;dog = cachorro">${prEsc(state.custom)}</textarea>
        </label>

        <p class="exam-readout">
          <span class="exam-tag ok">${words.length} palavra(s) · ${prEsc(currentTitle())}</span>
          ${words.length < 4 ? '<span class="exam-tag miss">Escolha um tópico com pelo menos 4 palavras</span>' : ''}
        </p>

        <div class="pr-grid">
          ${PR_SHEETS.map(s => `
            <button class="pr-sheet" data-sheet="${s.id}" ${words.length < 4 ? 'disabled' : ''}>
              <span class="pr-sheet-icon">${s.icon}</span>
              <b>${s.label}</b>
              <small>${s.hint}</small>
            </button>`).join('')}
        </div>

        <div class="pr-preview" id="prPreview"></div>
      </div>`;
    bind();
  }

  function bind() {
    const topic = mount.querySelector('#prTopic');
    if (topic) topic.addEventListener('change', () => { state.topicId = topic.value; paint(); });
    const cards = mount.querySelector('#prCards');
    if (cards) cards.addEventListener('input', () => { state.cards = Math.min(12, Math.max(1, Number(cards.value) || 4)); });
    const dim = mount.querySelector('#prDim');
    if (dim) dim.addEventListener('change', () => { state.dim = Number(dim.value); });
    const custom = mount.querySelector('#prCustom');
    if (custom) {
      let deb = null;
      custom.addEventListener('input', () => {
        state.custom = custom.value;
        clearTimeout(deb);
        deb = setTimeout(() => {
          const readout = mount.querySelector('.exam-readout');
          const w = currentWords();
          if (readout) readout.innerHTML = `<span class="exam-tag ok">${w.length} palavra(s) · ${prEsc(currentTitle())}</span>`;
          mount.querySelectorAll('.pr-sheet').forEach(b => { b.disabled = w.length < 4; });
        }, 200);
      });
    }

    mount.querySelectorAll('[data-sheet]').forEach(btn => {
      btn.addEventListener('click', () => {
        const words = currentWords();
        const title = currentTitle();
        let html = '';
        if (btn.dataset.sheet === 'bingo') html = prBingoSheet(words, title, state.cards, state.dim);
        else if (btn.dataset.sheet === 'flashcards') html = prFlashcardSheet(words, title, state.withPt);
        else if (btn.dataset.sheet === 'wordsearch') html = prWordSearchSheet(words, title);
        else if (btn.dataset.sheet === 'tracing') html = prTracingSheet(words, title);
        else html = prVocabSheet(words, title);

        const preview = mount.querySelector('#prPreview');
        preview.innerHTML = `
          <div class="pr-preview-bar">
            <span class="game-status-pill">Pré-visualização</span>
            <button class="btn btn-primary" id="prDoPrint">🖨️ Imprimir</button>
          </div>
          <div class="pr-paper">${html}</div>`;
        preview.querySelector('#prDoPrint').addEventListener('click', () => prPrint(html));
        preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  paint();
}

// ---------------------------------------------------------------------------
// CERTIFICATE
// ---------------------------------------------------------------------------
function prCertificateHTML(student, opts) {
  const o = opts || {};
  const progress = typeof loadProgress === 'function' ? loadProgress(student.id) : { stars: 0, xp: 0 };
  const level = o.level || (typeof levelOption === 'function' ? levelOption(student.levelId).levelLabel : student.levelLabel);
  const date = new Date();
  return `
    <div class="pr-cert">
      <div class="pr-cert-border">
        <p class="pr-cert-school">IG English School</p>
        <h1>Certificate of Achievement</h1>
        <p class="pr-cert-intro">This certificate is proudly presented to</p>
        <p class="pr-cert-name">${prEsc(student.name)}</p>
        <p class="pr-cert-body">${prEsc(o.text || `for completing the ${level} level with dedication, curiosity and a lot of English.`)}</p>
        <div class="pr-cert-stats">
          <span><b>${progress.stars || 0}</b> stars</span>
          <span><b>${progress.xp || 0}</b> XP</span>
          <span><b>${prEsc(level)}</b></span>
        </div>
        <div class="pr-cert-sign">
          <div><span class="pr-cert-line"></span><small>${prEsc(o.teacher || 'Teacher')}</small></div>
          <div><span class="pr-cert-date">${date.toLocaleDateString('pt-BR')}</span><small>Date</small></div>
        </div>
        <p class="pr-cert-seal">🏅</p>
      </div>
    </div>`;
}

function openCertificate(studentId) {
  const students = typeof loadStudents === 'function' ? loadStudents() : [];
  const id = studentId || (typeof getActiveStudentId === 'function' ? getActiveStudentId() : null);
  const state = {
    id: id || (students[0] && students[0].id),
    // The signature she typed last time (synced, and sent to the student's
    // link), else the school's teacher.
    teacher: (typeof IGStore !== 'undefined' && IGStore.getJSON('cert_signature', '')) || 'Teacher Gabriela Oliveira',
    text: '',
    level: '',
  };

  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">🏅 Certificado</h3>
      <div id="prCertMount"></div>
    </div>`, true);

  const mount = document.getElementById('prCertMount');

  function paint() {
    const student = students.find(s => s.id === state.id);
    if (!student) { mount.innerHTML = '<p class="quiz-empty">Cadastre um aluno primeiro.</p>'; return; }
    const html = prCertificateHTML(student, { teacher: state.teacher, text: state.text, level: state.level });
    // On the student's own link the certificate is only seen and printed —
    // the student can't change the signature, the text or the level.
    if (window.IG_SHARE_MODE) {
      mount.innerHTML = `
        <div class="pr-cert-preview">${html}</div>
        <div class="exam-actions"><button class="btn btn-primary" id="prCertPrintOnly">🖨️ Print</button></div>`;
      mount.querySelector('#prCertPrintOnly').addEventListener('click', () => prPrint(html));
      return;
    }
    mount.innerHTML = `
      <div class="exam-builder">
        <div class="exam-row">
          <label class="exam-field small">
            <span class="exam-label">Aluno</span>
            <select id="prCertStudent" class="hw-select">
              ${students.map(s => `<option value="${s.id}" ${s.id === state.id ? 'selected' : ''}>${prEsc(s.avatar || '')} ${prEsc(s.name)}</option>`).join('')}
            </select>
          </label>
          <label class="exam-field small">
            <span class="exam-label">Nível no certificado</span>
            <input type="text" id="prCertLevel" placeholder="${prEsc(typeof levelOption === 'function' ? levelOption(student.levelId).levelLabel : '')}" value="${prEsc(state.level)}" />
          </label>
          <label class="exam-field small">
            <span class="exam-label">Assinatura</span>
            <input type="text" id="prCertTeacher" value="${prEsc(state.teacher)}" />
          </label>
        </div>
        <label class="exam-field">
          <span class="exam-label">Texto <small>— deixe em branco para o padrão</small></span>
          <input type="text" id="prCertText" placeholder="for finishing Unit 4 with the best attendance of the class." value="${prEsc(state.text)}" />
        </label>
        <div class="exam-actions">
          <button class="btn btn-primary" id="prCertPrint">🖨️ Imprimir certificado</button>
        </div>
      </div>
      <div class="pr-paper pr-paper--landscape">${html}</div>`;

    const on = (id2, ev, fn) => { const el = mount.querySelector(id2); if (el) el.addEventListener(ev, fn); };
    on('#prCertStudent', 'change', e => { state.id = e.target.value; paint(); });
    on('#prCertTeacher', 'input', e => { state.teacher = e.target.value; IGStore.setJSON('cert_signature', e.target.value.trim()); });
    on('#prCertLevel', 'input', e => { state.level = e.target.value; });
    on('#prCertText', 'input', e => { state.text = e.target.value; });
    on('#prCertPrint', 'click', () => {
      const s = students.find(x => x.id === state.id);
      prPrint(prCertificateHTML(s, { teacher: state.teacher, text: state.text, level: state.level }));
    });
  }

  paint();
}
