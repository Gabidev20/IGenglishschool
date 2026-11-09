/* ==========================================================================
   IGenglishschool — Ficha do aluno (the student's file)
   --------------------------------------------------------------------------
   One window with everything about a student:

     📇 Cadastro   — personal data, when classes started, and the contract
                     (plan, dates, monthly fee, payment day, signed, link to
                     the signed file). Saved here, the only new data.
     📚 Aulas      — every class logged, newest first, with attendance.
     🏠 Lição      — every homework, with progress and score.
     📈 Progresso  — the same progress panel the student sees.
     💰 Pagamentos — schedule, fee and the months paid or open.

   NEW DATA lives under its own key, so it syncs with the rest of the
   teacher's workspace and never reaches the student's link:
     student_files { [studentId]: { birthday, guardian, phone, email, start,
       goal, contract: { plan, start, end, fee, payDay, signed, link, notes } } }
   Everything else is READ from what the site already keeps (sessions.js,
   homework.js, studentProgress.js, dashboard.js, studentExtras.js).
   Teacher only. Loaded after dashboard.js.
   ========================================================================== */

const SF_KEY = 'student_files';
const SF_TABS = [
  ['data', '📇', 'Cadastro'],
  ['classes', '📚', 'Aulas'],
  ['homework', '🏠', 'Lição de casa'],
  ['progress', '📈', 'Progresso'],
  ['money', '💰', 'Pagamentos'],
];

const sfEsc = s => igEscapeHtml(String(s == null ? '' : s));
function sfAll() {
  const raw = IGStore.getJSON(SF_KEY, null);
  return raw && typeof raw === 'object' ? raw : {};
}
function sfGet(studentId) {
  const f = sfAll()[studentId] || {};
  return { ...f, contract: { ...(f.contract || {}) } };
}
function sfSave(studentId, file) {
  const all = sfAll();
  all[studentId] = { ...file, updatedAt: new Date().toISOString() };
  IGStore.setJSON(SF_KEY, all);
}

// 'YYYY-MM-DD' -> '09/11/2026' (never through new Date('…'), which is UTC).
function sfDate(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(key || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
function sfSessions(studentId) {
  return (typeof loadSessions === 'function' ? loadSessions(studentId) : [])
    .filter(s => s && s.date)
    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0)));
}
// Classes of a group member are logged on the group.
function sfClassOwner(student) {
  const gid = typeof studentGroupId === 'function' ? studentGroupId(student.id) : null;
  return gid || student.id;
}

function openStudentFile(studentId, tab) {
  const student = (typeof loadStudents === 'function' ? loadStudents() : []).find(s => s.id === studentId);
  if (!student) { alert('Escolha um aluno primeiro.'); return; }
  openModal(`<div class="modal-content-pad sf" id="sfRoot"></div>`, true);
  sfPaint(student, tab || 'data');
}

function sfPaint(student, tab) {
  const root = document.getElementById('sfRoot');
  if (!root) return;
  const file = sfGet(student.id);
  const sessions = sfSessions(sfClassOwner(student));
  const first = sessions.length ? sessions[sessions.length - 1].date : '';
  const start = file.start || first;
  const level = typeof igLevelText === 'function' ? igLevelText(student) : (student.levelLabel || '');
  const material = typeof saMaterialOf === 'function' ? saMaterialOf(student) : null;
  const book = typeof LivroOnline !== 'undefined' && LivroOnline.bookFor ? LivroOnline.bookFor(student) : null;
  const group = typeof studentGroupName === 'function' ? studentGroupName(student.id) : '';
  const facts = [
    student.age ? `${student.age} anos` : '',
    level,
    group ? `turma ${group}` : (typeof isGroupStudent === 'function' && isGroupStudent(student.id) ? 'turma' : 'individual'),
    start ? `desde ${sfDate(start)}` : '',
  ].filter(Boolean);

  root.innerHTML = `
    <div class="sf-head">
      <span class="sf-avatar" style="background:${sfEsc(student.color || '#8e6d86')}">${sfEsc(student.avatar || '🙂')}</span>
      <div class="sf-head-txt">
        <h3 id="modalTitle">${sfEsc(student.name)}</h3>
        <p>${facts.map(sfEsc).join(' · ')}</p>
        ${material || book ? `<p class="sf-book">📘 ${sfEsc(material || (book ? book : ''))}</p>` : ''}
      </div>
    </div>
    <div class="sf-tabs" role="tablist">
      ${SF_TABS.map(([id, icon, label]) => `
        <button type="button" role="tab" class="sf-tab${tab === id ? ' active' : ''}" aria-selected="${tab === id}" data-sf-tab="${id}">
          <span aria-hidden="true">${icon}</span> ${label}
        </button>`).join('')}
    </div>
    <div class="sf-pane" id="sfPane"></div>`;

  root.querySelectorAll('[data-sf-tab]').forEach(b => b.addEventListener('click', () => sfPaint(student, b.dataset.sfTab)));
  const pane = root.querySelector('#sfPane');
  if (tab === 'data') sfPaintData(pane, student, file, first);
  else if (tab === 'classes') sfPaintClasses(pane, student, sessions);
  else if (tab === 'homework') sfPaintHomework(pane, student);
  else if (tab === 'progress') {
    if (typeof paintStudentProgress === 'function') paintStudentProgress(pane, student);
    else pane.innerHTML = '<p class="quiz-empty">Progresso indisponível.</p>';
  } else if (tab === 'money') sfPaintMoney(pane, student, start);
}

// ---------------------------------------------------------------------------
// 📇 CADASTRO — the only part that saves
// ---------------------------------------------------------------------------
function sfPaintData(pane, student, file, firstClass) {
  const c = file.contract;
  const sched = typeof dashScheduleFor === 'function' ? dashScheduleFor(student.id) : { days: [], time: '', fee: 0 };
  const days = (sched.days || []).map(id => (DASH_DAYS.find(d => d.id === id) || {}).short).filter(Boolean).join(', ');
  const notes = typeof getStudentExtra === 'function' ? getStudentExtra(student.id).notes : '';
  const field = (id, label, value, type, extra) => `
    <label class="sf-field" for="${id}"><span>${label}</span>
      <input id="${id}" type="${type || 'text'}" value="${sfEsc(value || '')}" ${extra || ''} /></label>`;

  pane.innerHTML = `
    <form id="sfForm" class="sf-form">
      <fieldset class="sf-box">
        <legend>Dados do aluno</legend>
        <div class="sf-grid">
          ${field('sfBirthday', 'Data de nascimento', file.birthday, 'date')}
          ${field('sfGuardian', 'Responsável (se menor de idade)', file.guardian)}
          ${field('sfPhone', 'WhatsApp', file.phone, 'tel', 'placeholder="(92) 9…"')}
          ${field('sfEmail', 'E-mail', file.email, 'email')}
        </div>
        <label class="sf-field sf-wide" for="sfGoal"><span>Objetivo com o inglês</span>
          <textarea id="sfGoal" rows="2" placeholder="Ex.: viajar, trabalho, escola, intercâmbio…">${sfEsc(file.goal || '')}</textarea></label>
      </fieldset>

      <fieldset class="sf-box">
        <legend>Curso</legend>
        <div class="sf-grid">
          ${field('sfStart', 'Início das aulas', file.start || '', 'date')}
          <div class="sf-field"><span>Primeira aula registrada</span><output>${firstClass ? sfDate(firstClass) : '—'}</output></div>
          <div class="sf-field"><span>Dias e horário</span><output>${days ? sfEsc(`${days}${sched.time ? ' · ' + sched.time : ''}`) : '— (em Painel → Horários &amp; valores)'}</output></div>
          <div class="sf-field"><span>Observações da professora</span><output>${notes ? sfEsc(notes) : '— (no ✏️ do aluno)'}</output></div>
        </div>
      </fieldset>

      <fieldset class="sf-box">
        <legend>Contrato</legend>
        <div class="sf-grid">
          ${field('sfPlan', 'Plano', c.plan, 'text', 'placeholder="Ex.: 2 aulas por semana, 1 h"')}
          ${field('sfFee', 'Mensalidade (R$)', c.fee !== undefined && c.fee !== '' ? c.fee : (sched.fee || ''), 'number', 'min="0" step="0.01"')}
          ${field('sfCStart', 'Início do contrato', c.start, 'date')}
          ${field('sfCEnd', 'Término do contrato', c.end, 'date')}
          ${field('sfPayDay', 'Dia do pagamento', c.payDay, 'number', 'min="1" max="31"')}
          <label class="sf-field sf-check" for="sfSigned"><input id="sfSigned" type="checkbox" ${c.signed ? 'checked' : ''} /> <span>Contrato assinado</span></label>
        </div>
        ${field('sfLink', 'Link do contrato (Google Drive, PDF…)', c.link, 'url', 'placeholder="https://…"')}
        ${c.link && /^https?:\/\//i.test(c.link) ? `<p class="sf-link"><a href="${sfEsc(c.link)}" target="_blank" rel="noopener">📄 Abrir o contrato</a></p>` : ''}
        <label class="sf-field sf-wide" for="sfCNotes"><span>Observações do contrato</span>
          <textarea id="sfCNotes" rows="2" placeholder="Reposição, férias, desconto…">${sfEsc(c.notes || '')}</textarea></label>
        ${c.end ? sfContractNote(c.end) : ''}
      </fieldset>

      <div class="sf-actions">
        <button type="submit" class="btn btn-primary">Salvar ficha</button>
        <span class="sf-saved" id="sfSaved" role="status" aria-live="polite"></span>
      </div>
    </form>`;

  pane.querySelector('#sfForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = id => pane.querySelector('#' + id).value.trim();
    sfSave(student.id, {
      ...sfGet(student.id),
      birthday: v('sfBirthday'), guardian: v('sfGuardian'), phone: v('sfPhone'), email: v('sfEmail'),
      goal: v('sfGoal'), start: v('sfStart'),
      contract: {
        plan: v('sfPlan'), fee: v('sfFee'), start: v('sfCStart'), end: v('sfCEnd'), payDay: v('sfPayDay'),
        signed: pane.querySelector('#sfSigned').checked, link: v('sfLink'), notes: v('sfCNotes'),
      },
    });
    const saved = pane.querySelector('#sfSaved');
    saved.textContent = '✅ Ficha salva.';
    setTimeout(() => { saved.textContent = ''; }, 2200);
  });
}

// Days to the contract's end: a heads-up a month before.
function sfContractNote(endKey) {
  const end = typeof dashDate === 'function' ? dashDate(endKey) : new Date(endKey);
  const today = typeof dashToday === 'function' ? dashToday() : new Date();
  const days = Math.round((end - today) / 864e5);
  if (days < 0) return `<p class="sf-alert sf-alert--late">O contrato terminou em ${sfDate(endKey)}.</p>`;
  if (days <= 30) return `<p class="sf-alert">O contrato termina em ${days} ${days === 1 ? 'dia' : 'dias'} (${sfDate(endKey)}).</p>`;
  return '';
}

// ---------------------------------------------------------------------------
// 📚 AULAS
// ---------------------------------------------------------------------------
function sfPaintClasses(pane, student, sessions) {
  const present = sessions.filter(s => s.present !== false).length;
  const rate = sessions.length ? Math.round((present / sessions.length) * 100) : null;
  const owner = sfClassOwner(student);
  pane.innerHTML = `
    <div class="sf-sum">
      <span><b>${sessions.length}</b> ${sessions.length === 1 ? 'aula registrada' : 'aulas registradas'}</span>
      <span><b>${rate === null ? '—' : rate + '%'}</b> de presença</span>
      ${sessions.length ? `<span>primeira em <b>${sfDate(sessions[sessions.length - 1].date)}</b></span>` : ''}
    </div>
    ${owner !== student.id ? `<p class="sf-note">As aulas são registradas na turma <b>${sfEsc(typeof studentGroupName === 'function' ? studentGroupName(student.id) : '')}</b>.</p>` : ''}
    ${sessions.length ? `<ol class="sf-list">${sessions.map(s => {
      const hw = ((s.sheet && s.sheet.homework) || []).filter(Boolean);
      return `
        <li class="sf-row">
          <span class="sf-date">${sfDate(s.date)}</span>
          <div class="sf-row-main">
            <b>${s.topicLabel ? sfEsc(s.topicLabel) : 'Aula'}</b>
            ${s.present === false ? '<span class="sf-pill sf-pill--late">faltou</span>' : '<span class="sf-pill">presente</span>'}
            ${s.notes ? `<p>${sfEsc(s.notes)}</p>` : ''}
            ${hw.length ? `<p class="sf-hw">🏠 ${hw.map(sfEsc).join(' · ')}</p>` : ''}
          </div>
        </li>`;
    }).join('')}</ol>` : '<p class="quiz-empty">Nenhuma aula registrada ainda. Registre no 📋 Today\'s Class, no fim da aula.</p>'}`;
}

// ---------------------------------------------------------------------------
// 🏠 LIÇÃO DE CASA
// ---------------------------------------------------------------------------
function sfPaintHomework(pane, student) {
  const list = (typeof hwForStudent === 'function' ? hwForStudent(student.id) : [])
    .slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const done = list.filter(h => typeof hwIsDone === 'function' && hwIsDone(h)).length;
  pane.innerHTML = `
    <div class="sf-sum">
      <span><b>${list.length}</b> ${list.length === 1 ? 'lição' : 'lições'}</span>
      <span><b>${done}</b> ${done === 1 ? 'entregue' : 'entregues'}</span>
      <span><b>${list.length - done}</b> ${list.length - done === 1 ? 'pendente' : 'pendentes'}</span>
    </div>
    ${list.length ? `<ol class="sf-list">${list.map(h => {
      const p = hwProgress(h);
      const score = typeof hwScore === 'function' ? hwScore(h) : null;
      const created = String(h.createdAt || h.sentAt || '').slice(0, 10);
      return `
        <li class="sf-row">
          <span class="sf-date">${sfDate(created)}</span>
          <div class="sf-row-main">
            <b>${sfEsc(typeof hwTitleText === 'function' ? hwTitleText(h) : h.title)}</b>
            <span class="sf-pill${p.done === p.total ? '' : ' sf-pill--open'}">${p.done}/${p.total} feitas${score !== null ? ` · ${score}%` : ''}</span>
            <p>${h.tasks.map(t => sfEsc(t.label || (typeof hwTaskMeta === 'function' ? hwTaskMeta(t.type).label : t.type))).join(' · ')}</p>
          </div>
          ${p.done ? `<button type="button" class="game-btn secondary" data-sf-hw="${sfEsc(h.id)}">Ver resultado</button>` : ''}
        </li>`;
    }).join('')}</ol>` : '<p class="quiz-empty">Nenhuma lição de casa ainda.</p>'}`;
  pane.querySelectorAll('[data-sf-hw]').forEach(b => b.addEventListener('click', () => {
    const hw = list.find(h => h.id === b.dataset.sfHw);
    if (hw && typeof openHomeworkResult === 'function') openHomeworkResult(hw);
  }));
}

// ---------------------------------------------------------------------------
// 💰 PAGAMENTOS — months from the start (or the last 6) to now
// ---------------------------------------------------------------------------
function sfPaintMoney(pane, student, start) {
  if (typeof dashPaymentFor !== 'function') { pane.innerHTML = '<p class="quiz-empty">Pagamentos indisponíveis.</p>'; return; }
  const file = sfGet(student.id);
  const fee = Number(file.contract.fee) || dashScheduleFor(student.id).fee || 0;
  const today = dashToday();
  const months = [];
  const from = start ? dashDate(start) : new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  while (d <= today && months.length < 36) { months.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
  const rows = months.reverse().map(m => ({ m, key: dashMonthKey(m), p: dashPaymentFor(student.id, dashMonthKey(m)) }));
  const open = rows.filter(r => !r.p.paid).length;
  pane.innerHTML = `
    <div class="sf-sum">
      <span>mensalidade <b>${fee ? dashMoney(fee) : '—'}</b></span>
      <span><b>${rows.length - open}</b> ${rows.length - open === 1 ? 'mês pago' : 'meses pagos'}</span>
      <span><b>${open}</b> em aberto</span>
    </div>
    <p class="sf-note">Para marcar um pagamento, use Painel → 💰 Financeiro.</p>
    <ol class="sf-list">${rows.map(r => `
      <li class="sf-row">
        <span class="sf-date">${DASH_MONTHS[r.m.getMonth()].slice(0, 3)}/${r.m.getFullYear()}</span>
        <div class="sf-row-main">
          <b>${r.p.paid ? dashMoney(r.p.amount || fee) : dashMoney(fee)}</b>
          ${r.p.paid ? `<span class="sf-pill">pago${r.p.on ? ' em ' + sfDate(r.p.on) : ''}</span>` : '<span class="sf-pill sf-pill--late">em aberto</span>'}
        </div>
      </li>`).join('')}</ol>`;
}
