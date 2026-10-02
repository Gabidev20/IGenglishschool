/* ==========================================================================
   IGenglishschool — Homework
   The teacher builds a small set of tasks for one student; the student opens
   their own profile and works through it; the result comes back to the
   teacher's list. Every task type here has a real completion signal — nothing
   is marked done just because somebody clicked "I did it".
   ========================================================================== */

const HW_KEY = 'homework';

const HW_TASK_TYPES = [
  { id: 'exam', icon: '📝', label: 'Prova curta', hint: 'Questões geradas dos tópicos escolhidos' },
  { id: 'review', icon: '🔁', label: 'Revisar meus erros', hint: 'As questões que este aluno errou e ainda não dominou' },
  { id: 'dictation', icon: '🎧', label: 'Ditado', hint: 'Ouvir a frase e escrever' },
  { id: 'speaking', icon: '🎤', label: 'Speaking', hint: 'Ler frases em voz alta' },
  { id: 'writing', icon: '✍️', label: 'Writing', hint: 'Escrever um texto para a professora corrigir' },
  { id: 'study', icon: '📚', label: 'Estudar um tópico', hint: 'Vídeo, leitura e flashcards do tópico' },
];
const hwTaskMeta = id => HW_TASK_TYPES.find(t => t.id === id) || HW_TASK_TYPES[0];

// ---------------------------------------------------------------------------
// STORE
// ---------------------------------------------------------------------------
function hwLoad() {
  const list = IGStore.getJSON(HW_KEY, []);
  return Array.isArray(list) ? list : [];
}
function hwSave(list) { IGStore.setJSON(HW_KEY, list.slice(0, 200)); }
function hwUpsert(hw) {
  const list = hwLoad().filter(h => h.id !== hw.id);
  list.unshift(hw);
  hwSave(list);
}
function hwDelete(id) { hwSave(hwLoad().filter(h => h.id !== id)); }
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
// THE SECTION — teacher list on top, the active student's own homework first
// ---------------------------------------------------------------------------
function renderHomework(container) {
  if (!container) return;
  const all = hwLoad();
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
              <h3>Lição de casa de ${igEscapeHtml(active.name)}</h3>
              <p>${mine.filter(h => !hwIsDone(h)).length} pendente(s) · ${mine.filter(hwIsDone).length} entregue(s)</p>
            </div>
            <button class="game-btn" id="hwMyProgress">📈 Meu progresso</button>
            <button class="game-btn secondary" id="hwShareLink">🔗 Link do aluno</button>
          </div>
          ${mine.length ? `
            <div class="hw-card-grid">
              ${mine.map(h => hwCardHTML(h, true)).join('')}
            </div>` : `
            <p class="quiz-empty">Nenhuma lição para ${igEscapeHtml(active.name)} ainda.</p>`}
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
        <b>${igEscapeHtml(hw.title)}</b>
        ${studentView ? '' : `<span class="hw-who">${igEscapeHtml(hw.studentName || '')}</span>`}
      </div>
      <div class="hw-task-chips">
        ${hw.tasks.map(t => `<span class="hw-chip ${t.result ? 'ok' : ''}">${hwTaskMeta(t.type).icon} ${igEscapeHtml(t.label || hwTaskMeta(t.type).label)}</span>`).join('')}
      </div>
      <div class="hw-bar"><div class="hw-bar-fill" style="width:${p.pct}%"></div></div>
      <div class="hw-card-meta">
        <span>${p.done}/${p.total} feitas${score !== null ? ` · ${score}%` : ''}</span>
        <span class="hw-due ${hwDueLabel(hw) === 'atrasada' ? 'late' : ''}">${hwDueLabel(hw)}</span>
      </div>
      <div class="hw-card-actions">
        ${done
          ? `<button class="game-btn secondary" data-hw-result="${hw.id}">📊 Ver resultado</button>`
          : `<button class="game-btn" data-hw-open="${hw.id}">▶️ ${studentView ? 'Fazer agora' : 'Abrir'}</button>`}
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
    mount.querySelectorAll('[data-prompt]').forEach(input => {
      input.addEventListener('change', () => { state.tasks[Number(input.dataset.prompt)].promptId = input.value; });
    });

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
      <h3 id="modalTitle">📚 ${igEscapeHtml(hw.title)}</h3>
      <p class="modal-head-sub"><span class="modal-head-desc">${igEscapeHtml(hw.studentName || '')}${hw.dueDate ? ' · ' + hwDueLabel(hw) : ''}</span></p>
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
      <p class="lt-count-note">${p.done} de ${p.total} tarefas concluídas</p>
      <div class="hw-run-list">
        ${hw.tasks.map((t, i) => {
          const meta = hwTaskMeta(t.type);
          const r = t.result;
          return `
            <div class="hw-run-task ${r ? 'done' : ''}">
              <span class="hw-run-icon">${meta.icon}</span>
              <div class="hw-run-text">
                <b>${igEscapeHtml(t.label || meta.label)}</b>
                <small>${r ? (typeof r.pct === 'number' ? `feito · ${r.pct}%` : 'feito ✅') : meta.hint}</small>
              </div>
              <button class="game-btn ${r ? 'secondary' : ''}" data-run="${i}">${r ? '🔁 Refazer' : '▶️ Começar'}</button>
            </div>`;
        }).join('')}
      </div>
      ${p.done === p.total ? `
        <div class="game-end-banner win" style="margin-top:16px">
          🎉 Lição completa!
          <p>${hwScore(hw) !== null ? hwScore(hw) + '% de acerto' : 'Muito bem!'}</p>
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
      if (!exam) { alert('Esta lição não tem tópicos reconhecidos para gerar a prova.'); return; }
      openExamRunner(exam, { studentId, source: 'homework', onDone: r => done({ pct: r.pct, correct: r.correct, total: r.total }) });
      return;
    }

    if (task.type === 'review') {
      const exam = typeof ldReviewExam === 'function' ? ldReviewExam(studentId, 10) : null;
      if (!exam) {
        alert('Nada para revisar — este aluno não tem erros pendentes. 🎉');
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

    // study — the only task without a score: reading and watching is the task,
    // so the student says when it is done, and it is worth no percentage.
    if (task.type === 'study') {
      if (confirm('Abra o tópico, assista ao vídeo e veja os flashcards.\n\nJá terminou de estudar?')) {
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
      <h3 id="modalTitle">📊 ${igEscapeHtml(hw.title)}</h3>
      <p class="modal-head-sub"><span class="modal-head-desc">${igEscapeHtml(hw.studentName || '')}</span></p>
      <div class="ex-result ${score !== null && score >= 70 ? 'good' : ''}">
        <span class="ex-result-emoji">${score === null ? '✅' : score >= 90 ? '🏆' : score >= 70 ? '🎉' : '💪'}</span>
        <h3>${score === null ? 'Entregue' : score + '%'}</h3>
        <p>${hw.tasks.length} tarefa(s) concluída(s)</p>
      </div>
      <div class="hw-run-list">
        ${hw.tasks.map(t => {
          const meta = hwTaskMeta(t.type);
          const r = t.result || {};
          return `
            <div class="hw-run-task done">
              <span class="hw-run-icon">${meta.icon}</span>
              <div class="hw-run-text">
                <b>${igEscapeHtml(t.label || meta.label)}</b>
                <small>${typeof r.pct === 'number' ? `${r.pct}%${r.total ? ` · ${r.correct}/${r.total}` : ''}` : 'concluída'}
                  ${r.at ? ' · ' + new Date(r.at).toLocaleDateString('pt-BR') : ''}</small>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div class="game-btn-row ex-actions">
        <button class="game-btn secondary" id="hwResultClose">Fechar</button>
      </div>
    </div>`, true);
  document.getElementById('hwResultClose').addEventListener('click', closeModal);
}
