/* ==========================================================================
   IGenglishschool — Homework
   The teacher builds a small set of tasks for one student; the student opens
   their own profile and works through it; the result comes back to the
   teacher's list. Every task type here has a real completion signal — nothing
   is marked done just because somebody clicked "I did it".
   ========================================================================== */

const hwSay = (pt, en) => (typeof igSay === 'function' ? igSay(pt, en) : pt);

const HW_KEY = 'homework';

const HW_TASK_TYPES = [
  { id: 'exam', icon: '📝', label: 'Prova curta', hint: 'Questões geradas dos tópicos escolhidos' },
  { id: 'review', icon: '🔁', label: 'Revisar meus erros', hint: 'As questões que este aluno errou e ainda não dominou' },
  { id: 'dictation', icon: '🎧', label: 'Ditado', hint: 'Ouvir a frase e escrever' },
  { id: 'speaking', icon: '🎤', label: 'Speaking', hint: 'Ler frases em voz alta' },
  { id: 'writing', icon: '✍️', label: 'Writing', hint: 'Escrever um texto para a professora corrigir' },
  { id: 'study', icon: '📚', label: 'Estudar um tópico', hint: 'Vídeo, leitura e flashcards do tópico' },
  { id: 'book', icon: '📖', label: 'Páginas do livro', hint: 'Abre o livro do aluno direto na página' },
  { id: 'free', icon: '✏️', label: 'Tarefa livre', hint: 'Qualquer coisa escrita por você — o aluno marca quando terminar' },
];

// "8-9, 12" / "pág 8 a 10" -> [8, 9, 12] / [8, 9, 10]
function hwParsePages(text) {
  const out = [];
  String(text || '').toLowerCase().replace(/p[aá]g(inas?)?\.?|p\./g, ' ').split(/[,;]|\se\s/).forEach(part => {
    const m = part.match(/(\d+)\s*(?:-|–|a|até|to)\s*(\d+)/);
    if (m) {
      const a = Number(m[1]), b = Number(m[2]);
      for (let n = Math.min(a, b); n <= Math.max(a, b) && n - Math.min(a, b) < 40; n++) out.push(n);
    } else {
      (part.match(/\d+/g) || []).forEach(n => out.push(Number(n)));
    }
  });
  return [...new Set(out)];
}
const hwPagesLabel = pages => {
  if (!pages.length) return '';
  const consecutive = pages.every((n, i) => i === 0 || n === pages[i - 1] + 1);
  return pages.length > 1 && consecutive ? `p. ${pages[0]}–${pages[pages.length - 1]}` : `p. ${pages.join(', ')}`;
};
const hwTaskMeta = id => HW_TASK_TYPES.find(t => t.id === id) || HW_TASK_TYPES[0];

// Display only: the task labels, hints and titles above are stored in
// Portuguese; a 14+ learner sees them in English on screen.
const HW_TASK_EN = {
  exam: ['Short test', 'Questions from your topics'],
  review: ['Review my mistakes', 'The questions you got wrong and still need to practice'],
  dictation: ['Dictation', 'Listen to the sentence and write it'],
  speaking: ['Speaking', 'Read sentences out loud'],
  writing: ['Writing', 'Write a text for your teacher to correct'],
  study: ['Study a topic', 'Video, reading and flashcards for the topic'],
  book: ['Book pages', 'Opens your book on the right page'],
  free: ['Free task', 'A task from your teacher — mark it when you finish'],
};
function hwTaskName(t) {
  const meta = hwTaskMeta(t.type);
  const label = t.label || meta.label;
  const en = HW_TASK_EN[meta.id];
  if (en && label === meta.label) return hwSay(label, en[0]);
  const book = label.match(/^Livro (p\. .*)$/);
  if (book) return hwSay(label, `Book ${book[1]}`);
  return label;
}
const hwTaskHint = meta => hwSay(meta.hint, (HW_TASK_EN[meta.id] || [meta.hint, meta.hint])[1]);
function hwTitleText(hw) {
  const title = String(hw.title || '');
  if (title === 'Lição de casa') return hwSay(title, 'Homework');
  if (title.startsWith('Lição de casa · ')) return hwSay(title, 'Homework · ' + title.slice('Lição de casa · '.length));
  return title;
}
// hwDueLabel stays Portuguese (it is compared); this is what the screen shows.
function hwDueText(hw) {
  const pt = hwDueLabel(hw);
  if (!pt) return '';
  const fixed = { entregue: 'done', atrasada: 'late', 'para hoje': 'due today', 'para amanhã': 'due tomorrow' };
  if (fixed[pt]) return hwSay(pt, fixed[pt]);
  const days = pt.match(/^em (\d+) dias$/);
  return days ? hwSay(pt, `due in ${days[1]} days`) : pt;
}

// ---------------------------------------------------------------------------
// STORE
// ---------------------------------------------------------------------------
function hwLoad() {
  const list = IGStore.getJSON(HW_KEY, []);
  return Array.isArray(list) ? list : [];
}
// Room for a group's copies too (one per member, see GROUPS below).
function hwSave(list) { IGStore.setJSON(HW_KEY, list.slice(0, 400)); }
function hwUpsert(hw) {
  let list = hwLoad().filter(h => h.id !== hw.id);
  list.unshift(hw);
  list = hwWithGroupCopies(list, hw);
  hwSave(list);
}
// Deleting a group's homework deletes its members' copies with it.
function hwDelete(id) { hwSave(hwLoad().filter(h => h.id !== id && h.groupHw !== id)); }

// ---------------------------------------------------------------------------
// GROUPS — a group that shares one link (groupLink.js) has each member as a
// student of their own, and the member's link only shows homework saved under
// the member's id. So homework given to the group is copied to every member:
// one copy each (id `<group hw id>_m_<member id>`, `groupHw` = the group's
// id), so each member does it and is scored on their own. Re-saving the
// group's homework updates the copies and keeps what each member already did.
// ---------------------------------------------------------------------------
function hwGroupMembers(groupId) {
  if (typeof studentGroupId !== 'function' || typeof loadStudents !== 'function') return [];
  return loadStudents().filter(s => s.id !== groupId && studentGroupId(s.id) === groupId);
}
function hwCopyFor(groupHw, member, prev) {
  return {
    ...groupHw,
    id: `${groupHw.id}_m_${member.id}`, groupHw: groupHw.id, fromQuick: undefined,
    studentId: member.id, studentName: member.name,
    // A task left as it was keeps the member's own answer.
    tasks: groupHw.tasks.map(t => {
      const own = prev && prev.tasks.find(p => p.type === t.type && p.label === t.label);
      const { result, ...task } = t;
      return own ? { ...task, result: own.result } : task;
    }),
  };
}
// The list with `hw`'s member copies added or refreshed (unchanged list when
// `hw` is not a group's homework or is itself a copy).
function hwWithGroupCopies(list, hw) {
  if (!hw || hw.groupHw) return list;
  const members = hwGroupMembers(hw.studentId);
  if (!members.length) return list;
  const copies = members.map(m => hwCopyFor(hw, m, list.find(h => h.id === `${hw.id}_m_${m.id}`)));
  const ids = new Set(copies.map(c => c.id));
  // A member who left the group loses the copy they had not started.
  const rest = list.filter(h => !ids.has(h.id) && !(h.groupHw === hw.id && !h.tasks.some(t => t.result)));
  const at = rest.findIndex(h => h.id === hw.id);
  rest.splice(at + 1, 0, ...copies);
  return rest;
}
// Homework given to a group before copies existed: copy it now. Saves only
// when something changed, so it is cheap to call on every render.
function hwSyncGroupCopies() {
  const before = hwLoad();
  let list = before;
  before.filter(h => !h.groupHw && hwGroupMembers(h.studentId).length).forEach(h => { list = hwWithGroupCopies(list, h); });
  if (JSON.stringify(list) !== JSON.stringify(before)) hwSave(list);
}
function hwForStudent(studentId) { return hwLoad().filter(h => h.studentId === studentId); }
function hwPendingFor(studentId) {
  return hwForStudent(studentId).filter(h => h.tasks.some(t => !t.result));
}
function hwIsDone(hw) { return hw.tasks.every(t => Boolean(t.result)); }
function hwProgress(hw) {
  const done = hw.tasks.filter(t => t.result).length;
  return { done, total: hw.tasks.length, pct: Math.round((done / hw.tasks.length) * 100) };
}
// The score a finished homework earned, over the tasks that can be scored.
function hwScore(hw) {
  const scored = hw.tasks.filter(t => t.result && typeof t.result.pct === 'number');
  if (!scored.length) return null;
  return Math.round(scored.reduce((a, t) => a + t.result.pct, 0) / scored.length);
}

function hwDueLabel(hw) {
  if (!hw.dueDate) return '';
  const due = new Date(hw.dueDate + 'T23:59:59');
  const days = Math.ceil((due - Date.now()) / 864e5);
  if (hwIsDone(hw)) return 'entregue';
  if (days < 0) return 'atrasada';
  if (days === 0) return 'para hoje';
  if (days === 1) return 'para amanhã';
  return `em ${days} dias`;
}

// ---------------------------------------------------------------------------
// QUICK HOMEWORK — written straight from Today's Class or from the cockpit
// card, no builder: each line becomes a free task ("Workbook page 12",
// "IG Beyond p. 6-7") on the student's own link. Nothing to select or send.
// ---------------------------------------------------------------------------
// A line that names pages ("pág 6 e 7", "página 6 do IG Beyond", "page 12")
// becomes a task that opens the student's online book right there; anything
// else stays a free task. A physical "workbook" stays free: it is not in the app.
function hwTaskFromLine(student, line) {
  const label = String(line || '').trim();
  const m = label.match(/(?:p[aá]g(?:ina)?s?\.?|pages?|\bp\.)\s*(\d+(?:\s*(?:-|–|a|até|to|e|,|;)\s*\d+)*)/i);
  const hasBook = typeof LivroOnline !== 'undefined' && student && LivroOnline.bookFor && LivroOnline.bookFor(student);
  if (m && hasBook && !/workbook|caderno/i.test(label)) {
    const pages = hwParsePages(m[1]);
    if (pages.length) return { type: 'book', label, pagesText: m[1], pages };
  }
  return { type: 'free', label };
}

function hwSyncClassHomework(student, session) {
  if (!student || !session) return;
  const id = 'hwcls_' + session.id;
  const lines = ((session.sheet && session.sheet.homework) || []).map(l => String(l).trim()).filter(Boolean);
  const prev = hwLoad().find(h => h.id === id);
  if (!lines.length) { if (prev) hwDelete(id); return; }
  const when = typeof sheetDateLabel === 'function' ? sheetDateLabel(session.date) : session.date;
  // A line left unchanged keeps whatever the student already did with it.
  const tasks = lines.map(l => (prev && prev.tasks.find(t => t.label === l)) || hwTaskFromLine(student, l));
  const now = new Date().toISOString();
  hwUpsert({
    ...(prev || {}), id, fromClass: session.id, studentId: student.id, studentName: student.name,
    title: `Lição de casa · ${when}`, note: (prev && prev.note) || '', dueDate: (prev && prev.dueDate) || '',
    topicsText: '', topicIds: [], topicLabels: [], tasks,
    createdAt: (prev && prev.createdAt) || now, sentAt: (prev && prev.sentAt) || now,
  });
}

// One loose "Lição de casa" per student, kept open until the student has done
// everything on it; adding a line just appends a task.
function hwQuickAdd(student, label) {
  const text = String(label || '').trim();
  if (!student || !text) return;
  const list = hwLoad();
  let hw = list.find(h => h.fromQuick === student.id && !hwIsDone(h));
  const now = new Date().toISOString();
  if (!hw) {
    hw = {
      id: 'hwq' + Date.now().toString(36), fromQuick: student.id, studentId: student.id, studentName: student.name,
      title: 'Lição de casa', note: '', dueDate: '', topicsText: '', topicIds: [], topicLabels: [], tasks: [],
      createdAt: now, sentAt: now,
    };
  }
  hw.tasks.push(hwTaskFromLine(student, text));
  hwUpsert(hw);
}

function hwRemoveTask(hwId, index) {
  const hw = hwLoad().find(h => h.id === hwId);
  if (!hw) return;
  hw.tasks.splice(index, 1);
  if (hw.tasks.length) hwUpsert(hw); else hwDelete(hwId);
}

// ---------------------------------------------------------------------------
// THE SECTION — teacher list on top, the active student's own homework first
// ---------------------------------------------------------------------------
function renderHomework(container) {
  if (!container) return;
  hwSyncGroupCopies();
  // The teacher's list shows a group's homework once; each member's copy is
  // in that member's own panel.
  const all = hwLoad().filter(h => !h.groupHw);
  const activeId = typeof getActiveStudentId === 'function' ? getActiveStudentId() : null;
  const students = typeof loadStudents === 'function' ? loadStudents() : [];
  const active = students.find(s => s.id === activeId);
  const mine = activeId ? hwForStudent(activeId) : [];

  container.innerHTML = `
    <div class="hw-wrap">
      ${active ? `
        <div class="hw-student-panel">
          <div class="hw-student-head">
            <span class="hw-avatar" style="background:${igEscapeHtml(active.color || '#8e6d86')}">${igEscapeHtml(active.avatar || '🙂')}</span>
            <div>
              <h3>${hwSay('Lição de casa de ', 'Homework for ')}${igEscapeHtml(active.name)}</h3>
              <p>${mine.filter(h => !hwIsDone(h)).length} ${hwSay('pendente(s)', 'to do')} · ${mine.filter(hwIsDone).length} ${hwSay('entregue(s)', 'done')}</p>
            </div>
            <button class="game-btn" id="hwMyProgress">📈 ${hwSay('Meu progresso', 'My progress')}</button>
            <button class="game-btn secondary" id="hwShareLink">🔗 Link do aluno</button>
            <button class="game-btn secondary" id="hwStudentBook">📖 ${hwSay('Livro', 'Book')}</button>
            <button class="game-btn secondary" id="hwStudentSlides">🖼️ Slides</button>
          </div>
          ${mine.length ? `
            <div class="hw-card-grid">
              ${mine.map(h => hwCardHTML(h, true)).join('')}
            </div>` : `
            <p class="quiz-empty">${hwSay(`Nenhuma lição para ${igEscapeHtml(active.name)} ainda.`, `No homework for ${igEscapeHtml(active.name)} yet.`)}</p>`}
        </div>` : `
        <p class="hw-hint">👆 Escolha um aluno no topo da página para ver a lição de casa dele.</p>`}

      <div class="hw-teacher">
        <div class="hw-teacher-head">
          <h3>📋 Todas as lições</h3>
          <div class="game-btn-row">
            <button class="btn btn-primary" id="hwNew">✨ Nova lição de casa</button>
            <button class="game-btn secondary" id="hwDesk">🖊️ Corrigir textos</button>
          </div>
        </div>
        ${all.length ? `
          <div class="hw-card-grid">
            ${all.map(h => hwCardHTML(h, false)).join('')}
          </div>` : `
          <p class="quiz-empty">Nenhuma lição criada ainda. Monte a primeira em “Nova lição de casa”.</p>`}
      </div>
    </div>`;

  const newBtn = container.querySelector('#hwNew');
  if (newBtn) newBtn.addEventListener('click', () => openHomeworkBuilder(null, () => renderHomework(container)));
  const deskBtn = container.querySelector('#hwDesk');
  if (deskBtn) deskBtn.addEventListener('click', () => openWritingDesk());
  const progBtn = container.querySelector('#hwMyProgress');
  if (progBtn) progBtn.addEventListener('click', () => openStudentProgress(activeId));
  const linkBtn = container.querySelector('#hwShareLink');
  if (linkBtn) linkBtn.addEventListener('click', () => openShareLinkModal(activeId));
  const slidesBtn = container.querySelector('#hwStudentSlides');
  if (slidesBtn) slidesBtn.addEventListener('click', () => { if (typeof SlidesAula !== 'undefined') SlidesAula.openForStudent(activeId); });
  const bookBtn = container.querySelector('#hwStudentBook');
  if (bookBtn) bookBtn.addEventListener('click', () => { if (typeof LivroOnline !== 'undefined') LivroOnline.openTeacher(activeId); });

  container.querySelectorAll('[data-hw-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hw = hwLoad().find(h => h.id === btn.dataset.hwOpen);
      if (hw) openHomeworkRunner(hw, () => renderHomework(container));
    });
  });
  container.querySelectorAll('[data-hw-result]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hw = hwLoad().find(h => h.id === btn.dataset.hwResult);
      if (hw) openHomeworkResult(hw);
    });
  });
  container.querySelectorAll('[data-hw-share]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hw = hwLoad().find(h => h.id === btn.dataset.hwShare);
      if (hw) hwShare(hw, btn);
    });
  });
  container.querySelectorAll('[data-hw-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hw = hwLoad().find(h => h.id === btn.dataset.hwDel);
      if (!hw) return;
      if (!confirm(`Excluir a lição “${hw.title}”?`)) return;
      hwDelete(hw.id);
      renderHomework(container);
    });
  });
}

function hwCardHTML(hw, studentView) {
  const p = hwProgress(hw);
  const score = hwScore(hw);
  const done = hwIsDone(hw);
  return `
    <div class="hw-card ${done ? 'is-done' : ''}">
      <div class="hw-card-top">
        <b>${igEscapeHtml(hwTitleText(hw))}</b>
        ${studentView ? '' : `<span class="hw-who">${igEscapeHtml(hw.studentName || '')}</span>`}
      </div>
      <div class="hw-task-chips">
        ${hw.tasks.map(t => `<span class="hw-chip ${t.result ? 'ok' : ''}">${hwTaskMeta(t.type).icon} ${igEscapeHtml(hwTaskName(t))}</span>`).join('')}
      </div>
      <div class="hw-bar"><div class="hw-bar-fill" style="width:${p.pct}%"></div></div>
      <div class="hw-card-meta">
        <span>${p.done}/${p.total} ${hwSay('feitas', 'done')}${score !== null ? ` · ${score}%` : ''}</span>
        <span class="hw-due ${hwDueLabel(hw) === 'atrasada' ? 'late' : ''}">${hwDueText(hw)}</span>
      </div>
      <div class="hw-card-actions">
        ${done
          ? `<button class="game-btn secondary" data-hw-result="${hw.id}">📊 ${hwSay('Ver resultado', 'See result')}</button>`
          : `<button class="game-btn" data-hw-open="${hw.id}">▶️ ${studentView ? hwSay('Fazer agora', 'Do it now') : 'Abrir'}</button>`}
        ${studentView ? '' : `
          <button class="game-btn secondary" data-hw-share="${hw.id}">📱 Copiar</button>
          <button class="game-btn secondary danger" data-hw-del="${hw.id}">🗑️</button>`}
      </div>
    </div>`;
}

// A message the teacher can paste into WhatsApp — the homework itself lives in
// the app, but the reminder has to reach the family where they already are.
function hwShare(hw, btn) {
  const lines = [
    `📚 Lição de casa — ${hw.studentName}`,
    hw.title,
    hw.dueDate ? `Entregar até: ${new Date(hw.dueDate + 'T12:00').toLocaleDateString('pt-BR')}` : '',
    '',
    ...hw.tasks.map((t, i) => `${i + 1}. ${hwTaskMeta(t.type).icon} ${t.label || hwTaskMeta(t.type).label}`),
    '',
    hw.note ? `💬 ${hw.note}` : '',
    'Abra o site, escolha seu nome no topo e vá em "Lição".',
  ].filter(Boolean);
  const text = lines.join('\n');
  const done = () => {
    const old = btn.textContent;
    btn.textContent = '✅ Copiado!';
    setTimeout(() => { btn.textContent = old; }, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => alert(text));
  } else {
    alert(text);
  }
}

// ---------------------------------------------------------------------------
// BUILDER
// ---------------------------------------------------------------------------
function openHomeworkBuilder(existing, onSaved) {
  const students = typeof loadStudents === 'function' ? loadStudents() : [];
  const activeId = typeof getActiveStudentId === 'function' ? getActiveStudentId() : null;
  const state = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: 'hw' + Date.now().toString(36),
    studentId: activeId || (students[0] && students[0].id) || '',
    title: '',
    note: '',
    dueDate: '',
    topicsText: '',
    tasks: [],
    createdAt: new Date().toISOString(),
  };

  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">✨ Nova lição de casa</h3>
      <div id="hwBuilder"></div>
    </div>`, true);

  const mount = document.getElementById('hwBuilder');

  function paint() {
    const student = students.find(s => s.id === state.studentId);
    mount.innerHTML = `
      <div class="exam-builder">
        <div class="exam-row">
          <label class="exam-field small">
            <span class="exam-label">Aluno</span>
            <select id="hwStudent" class="hw-select">
              ${students.map(s => `<option value="${s.id}" ${s.id === state.studentId ? 'selected' : ''}>${igEscapeHtml(s.avatar || '')} ${igEscapeHtml(s.name)}</option>`).join('')}
            </select>
          </label>
          <label class="exam-field small">
            <span class="exam-label">Título</span>
            <input type="text" id="hwTitle" placeholder="Lição da semana" value="${igEscapeHtml(state.title)}" />
          </label>
          <label class="exam-field small">
            <span class="exam-label">Entregar até</span>
            <input type="date" id="hwDue" value="${igEscapeHtml(state.dueDate)}" />
          </label>
        </div>

        <label class="exam-field">
          <span class="exam-label">Tópicos <small>— usados pela prova, pelo ditado e pelo speaking</small></span>
          <textarea id="hwTopics" rows="3" placeholder="past simple&#10;regular and irregular verbs">${igEscapeHtml(state.topicsText)}</textarea>
        </label>
        <div class="exam-readout" id="hwTags"></div>

        <p class="exam-label">Tarefas</p>
        <div class="hw-type-grid">
          ${HW_TASK_TYPES.map(t => `
            <button type="button" class="hw-type" data-add-task="${t.id}">
              <span class="hw-type-icon">${t.icon}</span>
              <b>${t.label}</b>
              <small>${t.hint}</small>
            </button>`).join('')}
        </div>

        <div class="hw-task-list">
          ${state.tasks.length ? state.tasks.map((t, i) => `
            <div class="hw-task-row">
              <span class="hw-task-n">${i + 1}</span>
              <span class="hw-task-icon">${hwTaskMeta(t.type).icon}</span>
              <input type="text" class="hw-task-label" data-label="${i}" value="${igEscapeHtml(t.label || hwTaskMeta(t.type).label)}" />
              ${t.type === 'exam' ? `<input type="number" class="hw-task-n-input" data-count="${i}" min="4" max="20" value="${t.count || 8}" title="Quantas questões" />` : ''}
              ${t.type === 'book' ? `
                <input type="text" class="hw-task-pages" data-pages="${i}" value="${igEscapeHtml(t.pagesText || '')}" placeholder="pág 8-9" title="Páginas do livro — ex.: 8-9 ou 8, 10" />
                <select class="hw-select hw-task-bim" data-bim="${i}" title="Bimestre do livro">
                  <option value="">Bimestre atual</option>
                  ${[1, 2, 3, 4].map(b => `<option value="${b}" ${Number(t.bim) === b ? 'selected' : ''}>Bimestre ${b}</option>`).join('')}
                </select>` : ''}
              ${t.type === 'writing' ? `<select class="hw-select" data-prompt="${i}">
                  ${SkillsModules.prompts.map(p => `<option value="${p.id}" ${p.id === t.promptId ? 'selected' : ''}>${igEscapeHtml(p.prompt)}</option>`).join('')}
                </select>` : ''}
              <button class="game-btn secondary danger" data-del-task="${i}">✕</button>
            </div>`).join('') : '<p class="quiz-empty">Escolha as tarefas acima — de 2 a 4 é o tamanho certo para casa.</p>'}
        </div>

        <label class="exam-field">
          <span class="exam-label">Recado para o aluno</span>
          <input type="text" id="hwNote" placeholder="Capriche no writing! 😊" value="${igEscapeHtml(state.note)}" />
        </label>

        <div class="exam-actions">
          <button class="btn btn-primary" id="hwSave" ${state.tasks.length && state.studentId ? '' : 'disabled'}>💾 Enviar lição</button>
          <button class="game-btn secondary" id="hwCancel">Cancelar</button>
        </div>
      </div>`;
    bind();
    paintTags();
  }

  function matchedTopics() {
    if (typeof exMatchTopics !== 'function') return { topics: [], missed: [] };
    return exMatchTopics(state.topicsText);
  }

  function paintTags() {
    const el = mount.querySelector('#hwTags');
    if (!el) return;
    const m = matchedTopics();
    el.innerHTML = `
      ${m.topics.map(t => `<span class="exam-tag ok">✓ ${igEscapeHtml(t.label)}</span>`).join('')}
      ${m.missed.map(x => `<span class="exam-tag miss">? ${igEscapeHtml(x)}</span>`).join('')}
      ${!state.topicsText.trim() ? '<span class="exam-tag hint">Sem tópicos, a prova e o ditado usam frases gerais.</span>' : ''}`;
  }

  function bind() {
    const val = (id, key) => {
      const el = mount.querySelector(id);
      if (el) el.addEventListener('input', () => { state[key] = el.value; });
      return el;
    };
    val('#hwTitle', 'title');
    val('#hwNote', 'note');
    const due = mount.querySelector('#hwDue');
    if (due) due.addEventListener('change', () => { state.dueDate = due.value; });
    const sel = mount.querySelector('#hwStudent');
    if (sel) sel.addEventListener('change', () => { state.studentId = sel.value; });
    const topics = mount.querySelector('#hwTopics');
    if (topics) {
      let deb = null;
      topics.addEventListener('input', () => {
        state.topicsText = topics.value;
        clearTimeout(deb);
        deb = setTimeout(paintTags, 200);
      });
    }

    mount.querySelectorAll('[data-add-task]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.addTask;
        const task = { type, label: hwTaskMeta(type).label };
        if (type === 'exam') task.count = 8;
        if (type === 'writing') task.promptId = SkillsModules.prompts[0].id;
        state.tasks.push(task);
        paint();
      });
    });
    mount.querySelectorAll('[data-del-task]').forEach(btn => {
      btn.addEventListener('click', () => { state.tasks.splice(Number(btn.dataset.delTask), 1); paint(); });
    });
    mount.querySelectorAll('[data-label]').forEach(input => {
      input.addEventListener('input', () => { state.tasks[Number(input.dataset.label)].label = input.value; });
    });
    mount.querySelectorAll('[data-count]').forEach(input => {
      input.addEventListener('input', () => { state.tasks[Number(input.dataset.count)].count = Number(input.value) || 8; });
    });
    mount.querySelectorAll('[data-pages]').forEach(input => {
      input.addEventListener('input', () => {
        const t = state.tasks[Number(input.dataset.pages)];
        t.pagesText = input.value;
        t.pages = hwParsePages(input.value);
        // The task's name follows the pages until the teacher renames it.
        const row = input.closest('.hw-task-row');
        const label = row && row.querySelector('[data-label]');
        if (label && (!t.label || /^(Páginas do livro|Livro p\. .*)$/.test(t.label))) {
          t.label = t.pages.length ? `Livro ${hwPagesLabel(t.pages)}` : 'Páginas do livro';
          label.value = t.label;
        }
        paintSaveState();
      });
    });
    mount.querySelectorAll('[data-bim]').forEach(input => {
      input.addEventListener('change', () => { state.tasks[Number(input.dataset.bim)].bim = input.value ? Number(input.value) : null; });
    });
    mount.querySelectorAll('[data-prompt]').forEach(input => {
      input.addEventListener('change', () => { state.tasks[Number(input.dataset.prompt)].promptId = input.value; });
    });

    function paintSaveState() {
      const btn = mount.querySelector('#hwSave');
      const missingPages = state.tasks.some(t => t.type === 'book' && !(t.pages || []).length);
      if (btn) {
        btn.disabled = !(state.tasks.length && state.studentId) || missingPages;
        btn.title = missingPages ? 'Escreva as páginas do livro (ex.: 8-9)' : '';
      }
    }
    paintSaveState();

    mount.querySelector('#hwCancel').addEventListener('click', closeModal);
    mount.querySelector('#hwSave').addEventListener('click', () => {
      const student = students.find(s => s.id === state.studentId);
      const m = matchedTopics();
      const hw = {
        ...state,
        studentName: student ? student.name : '',
        title: state.title.trim() || 'Lição de casa',
        topicIds: m.topics.map(t => t.id),
        topicLabels: m.topics.map(t => t.label),
        sentAt: new Date().toISOString(),
      };
      hwUpsert(hw);
      closeModal();
      if (typeof onSaved === 'function') onSaved();
    });
  }

  paint();
}

// ---------------------------------------------------------------------------
// RUNNER — the student works through the tasks
// ---------------------------------------------------------------------------
function openHomeworkRunner(hw, onChanged) {
  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">📚 ${igEscapeHtml(hwTitleText(hw))}</h3>
      <p class="modal-head-sub"><span class="modal-head-desc">${igEscapeHtml(hw.studentName || '')}${hw.dueDate ? ' · ' + hwDueText(hw) : ''}</span></p>
      <div id="hwRun"></div>
    </div>`, true);

  const mount = document.getElementById('hwRun');

  function save() {
    hwUpsert(hw);
    if (typeof onChanged === 'function') onChanged();
  }

  function finishTask(index, result) {
    hw.tasks[index].result = { ...result, at: new Date().toISOString() };
    save();
    // The whole homework done gets its own fanfare, a beat after the task's.
    if (typeof hwIsDone === 'function' && hwIsDone(hw)) setTimeout(() => IGSound.sticker(), 900);
    // Back to the list so the student sees the tick and what is left.
    openHomeworkRunner(hw, onChanged);
  }

  function paint() {
    const p = hwProgress(hw);
    mount.innerHTML = `
      ${hw.note ? `<p class="hw-note">💬 ${igEscapeHtml(hw.note)}</p>` : ''}
      <div class="hw-bar big"><div class="hw-bar-fill" style="width:${p.pct}%"></div></div>
      <p class="lt-count-note">${hwSay(`${p.done} de ${p.total} tarefas concluídas`, `${p.done} of ${p.total} ${p.total === 1 ? 'task' : 'tasks'} done`)}</p>
      <div class="hw-run-list">
        ${hw.tasks.map((t, i) => {
          const meta = hwTaskMeta(t.type);
          const r = t.result;
          return `
            <div class="hw-run-task ${r ? 'done' : ''}">
              <span class="hw-run-icon">${meta.icon}</span>
              <div class="hw-run-text">
                <b>${igEscapeHtml(hwTaskName(t))}</b>
                <small>${r ? (typeof r.pct === 'number' ? `${hwSay('feito', 'done')} · ${r.pct}%` : hwSay('feito ✅', 'done ✅'))
                  : t.type === 'free' ? hwSay('Faça e depois toque em “Já fiz” para marcar como feita', 'Do it, then tap “I did it” to check it off')
                  : t.type === 'book' ? `${hwPagesLabel(t.pages || hwParsePages(t.pagesText))} · ${t.pagesDone ? hwSay(`${t.pagesDone} de ${(t.pages || []).length} feita(s) · `, `${t.pagesDone} of ${(t.pages || []).length} done · `) : ''}${hwSay('toque em “Terminei esta página ✓” em cada uma', 'tap “I finished this page ✓” on each page')}`
                  : hwTaskHint(meta)}</small>
              </div>
              <button class="game-btn ${r ? 'secondary' : ''}" data-run="${i}">${r ? hwSay('🔁 Refazer', '🔁 Do it again') : t.type === 'free' ? hwSay('✅ Já fiz', '✅ I did it') : hwSay('▶️ Começar', '▶️ Start')}</button>
            </div>`;
        }).join('')}
      </div>
      ${p.done === p.total ? `
        <div class="game-end-banner win" style="margin-top:16px">
          ${hwSay('🎉 Lição completa!', '🎉 Homework done!')}
          <p>${hwScore(hw) !== null ? hwScore(hw) + hwSay('% de acerto', '% correct') : hwSay('Muito bem!', 'Great job!')}</p>
        </div>` : ''}`;

    mount.querySelectorAll('[data-run]').forEach(btn => {
      btn.addEventListener('click', () => runTask(Number(btn.dataset.run)));
    });
  }

  function topicsOfHomework() {
    if (typeof EXAM_TOPICS === 'undefined') return [];
    return (hw.topicIds || []).map(id => EXAM_TOPICS.find(t => t.id === id)).filter(Boolean);
  }

  function runTask(i) {
    const task = hw.tasks[i];
    const studentId = hw.studentId;
    const done = result => finishTask(i, result);

    if (task.type === 'exam') {
      const topics = topicsOfHomework();
      const exam = topics.length && typeof exBuildExam === 'function'
        ? exBuildExam({ topics, count: Math.max(4, task.count || 8), min: 4, title: task.label || hw.title })
        : null;
      if (!exam) { alert(hwSay('Esta lição não tem tópicos reconhecidos para gerar a prova.', 'This homework has no topics for a test.')); return; }
      openExamRunner(exam, { studentId, source: 'homework', onDone: r => done({ pct: r.pct, correct: r.correct, total: r.total }) });
      return;
    }

    if (task.type === 'review') {
      const exam = typeof ldReviewExam === 'function' ? ldReviewExam(studentId, 10) : null;
      if (!exam) {
        alert(hwSay('Nada para revisar — este aluno não tem erros pendentes. 🎉', 'Nothing to review — you have no mistakes to practice. 🎉'));
        done({ pct: 100, correct: 0, total: 0, empty: true });
        return;
      }
      openExamRunner(exam, { studentId, source: 'homework-review', onDone: r => done({ pct: r.pct, correct: r.correct, total: r.total }) });
      return;
    }

    if (task.type === 'dictation') {
      openDictationModal({ studentId, source: 'homework', topicLabel: 'Listening', onDone: r => done(r) });
      return;
    }
    if (task.type === 'speaking') {
      openSpeakingModal({ studentId, source: 'homework', topicLabel: 'Speaking', onDone: r => done(r) });
      return;
    }
    if (task.type === 'writing') {
      openWritingModal({ studentId, promptId: task.promptId, onDone: r => done({ pct: null, submitted: true, text: r.text }) });
      return;
    }

    // book — straight to the page in the student's online book. Done when
    // every page of the task is marked "Terminei esta página ✓" there.
    if (task.type === 'book') {
      const pages = task.pages && task.pages.length ? task.pages : hwParsePages(task.pagesText);
      const student = (typeof loadStudents === 'function' ? loadStudents() : []).find(s => s.id === studentId);
      if (!pages.length || !student || typeof LivroOnline === 'undefined') { alert(hwSay('Esta tarefa não tem páginas do livro. 📖', 'This task has no book pages. 📖')); return; }
      if (!LivroOnline.bookFor(student)) { alert(hwSay('A teacher ainda não escolheu um livro para você. 📖', 'Your teacher has not chosen a book for you yet. 📖')); return; }
      closeModal();
      LivroOnline.openHomeworkPages(student, {
        pages, bim: task.bim, label: hwPagesLabel(pages),
        onClose: r => {
          if (r.total && r.done >= r.total) { done({ pct: null, pages: r.done }); return; }
          task.pagesDone = r.done;
          save();
          openHomeworkRunner(hw, onChanged);
        },
      });
      return;
    }

    // free — whatever the teacher wrote; the student says when it is done.
    if (task.type === 'free') {
      if (confirm(`${hwTaskName(task)}\n\n${hwSay('Já fez esta tarefa?', 'Did you do this task?')}`)) done({ pct: null, self: true });
      return;
    }

    // study — the only task without a score: reading and watching is the task,
    // so the student says when it is done, and it is worth no percentage.
    if (task.type === 'study') {
      if (confirm(hwSay('Abra o tópico, assista ao vídeo e veja os flashcards.\n\nJá terminou de estudar?', 'Open the topic, watch the video and look at the flashcards.\n\nDid you finish studying?'))) {
        done({ pct: null, studied: true });
      }
      return;
    }
  }

  paint();
}

// ---------------------------------------------------------------------------
// RESULT — what the teacher sees when it comes back
// ---------------------------------------------------------------------------
function openHomeworkResult(hw) {
  const score = hwScore(hw);
  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">📊 ${igEscapeHtml(hwTitleText(hw))}</h3>
      <p class="modal-head-sub"><span class="modal-head-desc">${igEscapeHtml(hw.studentName || '')}</span></p>
      <div class="ex-result ${score !== null && score >= 70 ? 'good' : ''}">
        <span class="ex-result-emoji">${score === null ? '✅' : score >= 90 ? '🏆' : score >= 70 ? '🎉' : '💪'}</span>
        <h3>${score === null ? hwSay('Entregue', 'Done') : score + '%'}</h3>
        <p>${hwSay(`${hw.tasks.length} tarefa(s) concluída(s)`, `${hw.tasks.length} ${hw.tasks.length === 1 ? 'task' : 'tasks'} done`)}</p>
      </div>
      <div class="hw-run-list">
        ${hw.tasks.map(t => {
          const meta = hwTaskMeta(t.type);
          const r = t.result || {};
          return `
            <div class="hw-run-task done">
              <span class="hw-run-icon">${meta.icon}</span>
              <div class="hw-run-text">
                <b>${igEscapeHtml(hwTaskName(t))}</b>
                <small>${typeof r.pct === 'number' ? `${r.pct}%${r.total ? ` · ${r.correct}/${r.total}` : ''}` : hwSay('concluída', 'done')}
                  ${r.at ? ' · ' + new Date(r.at).toLocaleDateString(hwSay('pt-BR', 'en-US')) : ''}</small>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div class="game-btn-row ex-actions">
        <button class="game-btn secondary" id="hwResultClose">${hwSay('Fechar', 'Close')}</button>
      </div>
    </div>`, true);
  document.getElementById('hwResultClose').addEventListener('click', closeModal);
}
