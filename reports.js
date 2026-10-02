/* ==========================================================================
   IGenglishschool — Quarterly Progress Report (editable builder)
   Fully editable report form, auto-filled from session history, with
   WhatsApp export, a printable A4 letterhead, and per-student history in
   localStorage.
   ========================================================================== */

const SKILL_KEYS = ['listening', 'speaking', 'reading', 'writing'];
const SKILL_LABELS = { listening: 'Listening', speaking: 'Speaking', reading: 'Reading', writing: 'Phonics / Writing' };
const SKILL_LEVELS = ['Em desenvolvimento', 'Consolidado', 'Excelente'];

// ---------------------------------------------------------------------------
// QUARTERS — calendar-based (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)
// ---------------------------------------------------------------------------
const QUARTER_LABELS = ['1º Trimestre', '2º Trimestre', '3º Trimestre', '4º Trimestre'];

function getQuarterOptions(count) {
  const now = new Date();
  let year = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) + 1;
  const options = [];
  for (let i = 0; i < (count || 6); i++) {
    options.push({ id: `${year}-Q${q}`, label: `${QUARTER_LABELS[q - 1]} / ${year}` });
    q--;
    if (q < 1) { q = 4; year--; }
  }
  return options;
}

function quarterDateRange(quarterId) {
  const [yearStr, qStr] = quarterId.split('-Q');
  const year = Number(yearStr);
  const q = Number(qStr);
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  return { start, end };
}

// ---------------------------------------------------------------------------
// PERSISTENCE — one array of saved reports per student, keyed by quarterId
// ---------------------------------------------------------------------------
function reportsKey(studentId) { return `reports_${studentId}`; }

function loadReports(studentId) {
  const list = IGStore.getJSON(reportsKey(studentId), []);
  return Array.isArray(list) ? list : [];
}
function saveReportsList(studentId, list) {
  IGStore.setJSON(reportsKey(studentId), list);
}
function findSavedReport(studentId, quarterId) {
  return loadReports(studentId).find(r => r.quarterId === quarterId);
}
function upsertReport(studentId, record) {
  const list = loadReports(studentId);
  const idx = list.findIndex(r => r.quarterId === record.quarterId);
  if (idx >= 0) list[idx] = record; else list.push(record);
  saveReportsList(studentId, list);
}

// ---------------------------------------------------------------------------
// ATTENDANCE BY PERIOD — the whole history of a student, period by period
// ---------------------------------------------------------------------------
// Many teachers kept attendance somewhere else (a notebook, a spreadsheet)
// before this site. Each period — "Jan–Jun 2025", "2º semestre 2025"… — is
// typed in once with its presences and absences, or counted from the class
// log when the lessons were recorded here. Kept per student (not per
// quarter), so every report for that student shows the full history.
function attendancePeriodsKey(studentId) { return `attendance_periods_${studentId}`; }

function loadAttendancePeriods(studentId) {
  const list = IGStore.getJSON(attendancePeriodsKey(studentId), []);
  return Array.isArray(list) ? list : [];
}
function saveAttendancePeriods(studentId, list) {
  IGStore.setJSON(attendancePeriodsKey(studentId), list);
}

function periodTotals(p) {
  const present = Math.max(0, Number(p.present) || 0);
  const absent = Math.max(0, Number(p.absent) || 0);
  const total = present + absent;
  return { present, absent, total, rate: total ? Math.round((present / total) * 100) : null };
}

function attendanceSummary(periods) {
  const t = periods.reduce((acc, p) => {
    const x = periodTotals(p);
    acc.present += x.present; acc.absent += x.absent;
    return acc;
  }, { present: 0, absent: 0 });
  const total = t.present + t.absent;
  return { ...t, total, rate: total ? Math.round((t.present / total) * 100) : null };
}

// Count presences / absences in the class log between two dates.
function countSessionsBetween(student, from, to) {
  const start = from ? new Date(from + 'T00:00:00').getTime() : -Infinity;
  const end = to ? new Date(to + 'T23:59:59').getTime() : Infinity;
  const list = loadSessions(student.id).filter(s => {
    const t = new Date(s.date).getTime();
    return t >= start && t <= end;
  });
  return { present: list.filter(s => s.present).length, absent: list.filter(s => !s.present).length, count: list.length };
}

const PT_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function periodAutoLabel(from, to) {
  const f = from ? new Date(from + 'T12:00:00') : null;
  const t = to ? new Date(to + 'T12:00:00') : null;
  if (!f && !t) return '';
  const fmt = d => `${PT_MONTHS[d.getMonth()]}/${d.getFullYear()}`;
  if (f && t) return f.getFullYear() === t.getFullYear()
    ? `${PT_MONTHS[f.getMonth()]}–${PT_MONTHS[t.getMonth()]} ${t.getFullYear()}`
    : `${fmt(f)} – ${fmt(t)}`;
  return fmt(f || t);
}

// ---------------------------------------------------------------------------
// AUTO-PULLED DATA — from the class session history (sessions.js) + progress
// ---------------------------------------------------------------------------
function computeQuarterStats(student, quarterId) {
  const { start, end } = quarterDateRange(quarterId);
  const all = loadSessions(student.id);
  const sessions = all.filter(s => {
    const t = new Date(s.date).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });

  const totalClasses = sessions.length;
  const presentCount = sessions.filter(s => s.present).length;
  const attendanceRate = totalClasses ? Math.round((presentCount / totalClasses) * 100) : 0;
  const topics = [...new Set(sessions.map(s => s.topicLabel).filter(Boolean))];
  const totalStars = sessions.reduce((sum, s) => sum + (s.stats ? s.stats.stars : 0), 0);
  const stickerCount = loadProgress(student.id).stickers.length;

  return { totalClasses, presentCount, attendanceRate, topics, totalStars, stickerCount };
}

function suggestStrengths(student, stats) {
  if (stats.topics.length === 0) {
    return `${student.name} demonstrou muito entusiasmo e uma atitude positiva em todas as aulas deste trimestre.`;
  }
  const sample = stats.topics.slice(0, 2).join(' e ');
  return `${student.name} demonstrou muito entusiasmo nas atividades de ${sample}, com participação constante e progresso contínuo neste trimestre.`;
}

function suggestTeacherNote(student) {
  return `Foi um prazer enorme dar aula para ${student.name} neste trimestre! Continue incentivando um pouquinho de prática em casa — cada minuto conta. 💛`;
}

// ---------------------------------------------------------------------------
// FORM DEFAULTS — loads a saved report for (student, quarter) if one exists,
// otherwise auto-fills fresh defaults from the class history.
// ---------------------------------------------------------------------------
function getFormDefaults(student, quarterId, quarterLabel) {
  const saved = findSavedReport(student.id, quarterId);
  if (saved) return saved;

  const stats = computeQuarterStats(student, quarterId);
  return {
    id: null,
    studentId: student.id,
    quarterId,
    quarterLabel,
    name: student.name,
    age: student.age,
    levelLabel: student.levelLabel,
    period: quarterLabel,
    attendanceText: stats.totalClasses
      ? `${stats.presentCount} de ${stats.totalClasses} aulas concluídas - ${stats.attendanceRate}% de frequência`
      : 'Nenhuma aula registrada neste trimestre ainda.',
    topics: stats.topics.slice(),
    skills: {
      listening: { level: 'Em desenvolvimento', comment: '' },
      speaking: { level: 'Em desenvolvimento', comment: '' },
      reading: { level: 'Em desenvolvimento', comment: '' },
      writing: { level: 'Em desenvolvimento', comment: '' },
    },
    strengths: suggestStrengths(student, stats),
    nextGoals: '',
    teacherNote: suggestTeacherNote(student),
    autoStats: stats,
    createdAt: null,
    updatedAt: null,
  };
}

// ---------------------------------------------------------------------------
// MODAL — student + quarter pickers, then the editable form
// ---------------------------------------------------------------------------
function openReportsModal() {
  const students = loadStudents();
  const activeId = getActiveStudentId();
  const quarters = getQuarterOptions(6);

  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">📊 Boletim · Progress Report</h3>
      <div class="report-controls no-print">
        <div class="gm-form-field">
          <label for="rpStudentSelect">Aluno</label>
          <select id="rpStudentSelect">
            ${students.map(s => `<option value="${s.id}" ${s.id === activeId ? 'selected' : ''}>${escapeHtmlLite(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="gm-form-field">
          <label for="rpQuarterSelect">Trimestre</label>
          <select id="rpQuarterSelect">
            ${quarters.map((q, i) => `<option value="${q.id}" data-label="${escapeAttrLite(q.label)}" ${i === 0 ? 'selected' : ''}>${q.label}</option>`).join('')}
          </select>
        </div>
        <span class="report-saved-badge" id="rpSavedBadge"></span>
      </div>
      <div id="reportFormArea"></div>
    </div>
  `, true);

  document.getElementById('rpStudentSelect').addEventListener('change', renderReportFromControls);
  document.getElementById('rpQuarterSelect').addEventListener('change', renderReportFromControls);
  renderReportFromControls();
}

function renderReportFromControls() {
  const studentId = document.getElementById('rpStudentSelect').value;
  const quarterSelect = document.getElementById('rpQuarterSelect');
  const quarterId = quarterSelect.value;
  const quarterLabel = quarterSelect.selectedOptions[0].dataset.label;
  const student = loadStudents().find(s => s.id === studentId);
  if (!student) {
    document.getElementById('reportFormArea').innerHTML = '<p class="quiz-empty">Cadastre um aluno primeiro para fazer o relatório.</p>';
    return;
  }
  renderReportForm(document.getElementById('reportFormArea'), student, quarterId, quarterLabel);
  refreshSavedBadge(student, quarterId);
}

function refreshSavedBadge(student, quarterId) {
  const badge = document.getElementById('rpSavedBadge');
  if (!badge) return;
  const exists = Boolean(findSavedReport(student.id, quarterId));
  badge.textContent = exists ? '✅ Salvo' : '🆕 Ainda não salvo';
  badge.className = 'report-saved-badge ' + (exists ? 'is-saved' : 'is-new');
}

// ---------------------------------------------------------------------------
// EVERY PART OF THE REPORT IS EDITABLE
// What goes to the family must be exactly what the teacher wants, so the
// form holds everything the PDF and the WhatsApp text are made of: the
// title, each section's heading (and whether it is included at all), the
// numbers, the names of the skills, the topics, the signature and the date.
// Reports saved before this existed are read through rpNormalize(), which
// fills the new fields with what they used to show.
// ---------------------------------------------------------------------------
const RP_DEFAULT_TITLE = 'Boletim Trimestral · Quarterly Progress Report';
const RP_SECTIONS = [
  ['attendance', 'Frequência & Engajamento'],
  ['stats', 'Números do período'],
  ['periods', 'Histórico de Frequência por Período'],
  ['topics', 'Conteúdos & Tópicos Trabalhados'],
  ['skills', 'Habilidades Avaliadas'],
  ['strengths', '✨ Destaques do Aluno'],
  ['nextGoals', '🎯 Próximos Passos'],
  ['teacherNote', '💌 Mensagem da Teacher'],
  ['signature', 'Assinatura'],
];
const RP_DEFAULT_HEADINGS = Object.fromEntries(RP_SECTIONS);

function rpTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rpNormalize(data, student) {
  const d = { ...data };
  const grown = typeof igIsGrownup === 'function' && igIsGrownup(student);
  if (!Array.isArray(d.skills)) {
    const old = d.skills || {};
    d.skills = SKILL_KEYS.map(k => ({
      label: k === 'writing' && grown ? 'Writing' : SKILL_LABELS[k],
      level: (old[k] && old[k].level) || SKILL_LEVELS[0],
      comment: (old[k] && old[k].comment) || '',
    }));
  }
  const a = d.autoStats || {};
  d.stats = d.stats || {
    classes: a.totalClasses || 0, attendance: a.attendanceRate || 0,
    stars: a.totalStars || 0, stickers: a.stickerCount || 0,
  };
  d.show = { ...Object.fromEntries(RP_SECTIONS.map(([k]) => [k, true])), ...(d.show || {}) };
  d.headings = { ...RP_DEFAULT_HEADINGS, ...(d.headings || {}) };
  d.title = d.title || RP_DEFAULT_TITLE;
  d.signature = d.signature || 'Assinatura da Teacher';
  d.teacherName = d.teacherName != null ? d.teacherName
    : (typeof IGCloud !== 'undefined' && IGCloud.teacher && IGCloud.teacher.name && !/@/.test(IGCloud.teacher.name) ? IGCloud.teacher.name : '');
  d.issueDate = d.issueDate || rpTodayISO();
  d.topics = Array.isArray(d.topics) ? d.topics : [];
  return d;
}

function rpStatsFromSessions(student, quarterId) {
  const s = computeQuarterStats(student, quarterId);
  return { classes: s.totalClasses, attendance: s.attendanceRate, stars: s.totalStars, stickers: s.stickerCount };
}

// One section of the form: its heading (editable) and whether it goes into
// the report, then its fields.
function rpSectionHTML(d, key, inner, extraClass) {
  return `
    <section class="rp-sec${extraClass ? ' ' + extraClass : ''}${d.show[key] ? '' : ' is-off'}" data-sec="${key}">
      <div class="rp-sec-head">
        <input type="text" class="rp-sec-title" data-heading="${key}" value="${escapeAttrLite(d.headings[key])}" aria-label="Título da seção" title="Clique para mudar o título desta seção" />
        <label class="rp-sec-toggle" title="Mostrar esta seção no boletim">
          <input type="checkbox" data-show="${key}" ${d.show[key] ? 'checked' : ''} /> incluir no boletim
        </label>
      </div>
      <div class="rp-sec-body">${inner}</div>
    </section>`;
}

function rpSkillRowHTML(s) {
  const levels = SKILL_LEVELS.includes(s.level) ? SKILL_LEVELS : SKILL_LEVELS.concat([s.level]);
  return `
    <div class="report-skill-row rp-skill-row">
      <input type="text" class="rp-skill-label" value="${escapeAttrLite(s.label)}" placeholder="Habilidade" aria-label="Nome da habilidade" />
      <select class="rp-skill-level" aria-label="Nível">
        ${levels.map(lv => `<option value="${escapeAttrLite(lv)}" ${lv === s.level ? 'selected' : ''}>${escapeHtmlLite(lv)}</option>`).join('')}
      </select>
      <input type="text" class="rp-skill-comment" placeholder="Comentário (opcional)" value="${escapeAttrLite(s.comment)}" />
      <button type="button" class="gm-remove-row" data-del-skill aria-label="Remover habilidade" title="Remover">✕</button>
    </div>`;
}

function rpTopicRowHTML(t) {
  return `
    <div class="rp-topic-row">
      <input type="text" class="rp-topic" value="${escapeAttrLite(t)}" aria-label="Tópico" />
      <button type="button" class="gm-remove-row" data-del-topic aria-label="Remover tópico" title="Remover">✕</button>
    </div>`;
}

function renderReportForm(container, student, quarterId, quarterLabel) {
  const d = rpNormalize(getFormDefaults(student, quarterId, quarterLabel), student);
  const isSaved = Boolean(d.id);

  container.innerHTML = `
    <p class="report-saved-indicator no-print">${isSaved
      ? '✅ Este é o boletim salvo deste trimestre. Corrija o que quiser e clique em <b>Salvar</b> de novo.'
      : '🆕 Preenchido com as aulas do trimestre — revise e corrija tudo antes de salvar e mandar.'}
      <br><small>Tudo aqui pode ser editado: os títulos das seções, os números, as habilidades, a assinatura e a data. Desmarque <b>incluir no boletim</b> para tirar uma seção.</small></p>

    <div class="gm-form-field">
      <label for="rpTitle">Título do boletim</label>
      <input type="text" id="rpTitle" value="${escapeAttrLite(d.title)}" />
    </div>

    <div class="report-form-grid">
      <div class="gm-form-field"><label for="rpName">Nome do aluno</label><input type="text" id="rpName" value="${escapeAttrLite(d.name)}" /></div>
      <div class="gm-form-field"><label for="rpAge">Idade</label><input type="text" id="rpAge" value="${escapeAttrLite(d.age)}" /></div>
      <div class="gm-form-field"><label for="rpLevel">Nível</label><input type="text" id="rpLevel" value="${escapeAttrLite(d.levelLabel)}" /></div>
      <div class="gm-form-field"><label for="rpPeriod">Período</label><input type="text" id="rpPeriod" value="${escapeAttrLite(d.period)}" /></div>
    </div>

    ${rpSectionHTML(d, 'attendance', `
      <input type="text" id="rpAttendance" value="${escapeAttrLite(d.attendanceText)}" aria-label="Frequência e engajamento" />`)}

    ${rpSectionHTML(d, 'stats', `
      <div class="rp-stats">
        <label><input type="number" min="0" id="rpStatClasses" value="${escapeAttrLite(d.stats.classes)}" /> <span>aulas</span></label>
        <label><input type="number" min="0" max="100" id="rpStatAttendance" value="${escapeAttrLite(d.stats.attendance)}" /> <span>% presença</span></label>
        <label><input type="number" min="0" id="rpStatStars" value="${escapeAttrLite(d.stats.stars)}" /> <span>estrelas</span></label>
        <label><input type="number" min="0" id="rpStatStickers" value="${escapeAttrLite(d.stats.stickers)}" /> <span>figurinhas</span></label>
        <button class="game-btn secondary" type="button" id="rpRecalcStats" title="Contar de novo a partir das aulas registradas neste trimestre">↻ Recalcular das aulas</button>
      </div>`)}

    ${rpSectionHTML(d, 'periods', `
      <p class="report-periods-help no-print">Traga as presenças e faltas de cada período em que ${escapeHtmlLite(student.name)} teve aula —
        por exemplo <em>jan–jun</em> e depois <em>jul–dez</em>. Digite os números das suas anotações, ou use
        <b>↻ Contar</b> para somar as aulas registradas aqui no site naquele intervalo. Fica salvo no histórico do aluno e aparece em todos os boletins dele.</p>
      <div class="report-periods-table-wrap">
        <table class="report-periods-table">
          <thead>
            <tr><th>Período</th><th>De</th><th>Até</th><th>Presenças</th><th>Faltas</th><th>Aulas</th><th>Frequência</th><th>Observação</th><th class="no-print"></th></tr>
          </thead>
          <tbody id="rpPeriodsBody"></tbody>
          <tfoot id="rpPeriodsFoot"></tfoot>
        </table>
      </div>
      <div class="game-btn-row no-print">
        <button class="game-btn secondary" id="rpAddPeriodBtn" type="button">+ Adicionar período</button>
        <button class="game-btn secondary" id="rpAddSemesterBtn" type="button">+ Semestres deste ano</button>
      </div>`, 'report-periods')}

    ${rpSectionHTML(d, 'topics', `
      <div class="rp-topics" id="rpTopics">${d.topics.map(rpTopicRowHTML).join('')}</div>
      <div class="report-tag-input-row">
        <input type="text" id="rpTopicInput" placeholder="Novo tópico — escreva e aperte Enter" />
        <button class="game-btn secondary" id="rpAddTopicBtn" type="button">+ Adicionar</button>
      </div>`)}

    ${rpSectionHTML(d, 'skills', `
      <div class="report-skills-grid" id="rpSkills">${d.skills.map(rpSkillRowHTML).join('')}</div>
      <button class="game-btn secondary" id="rpAddSkillBtn" type="button">+ Adicionar habilidade</button>`)}

    ${rpSectionHTML(d, 'strengths', `<textarea id="rpStrengths" rows="3" aria-label="Destaques">${escapeHtmlLite(d.strengths)}</textarea>`)}
    ${rpSectionHTML(d, 'nextGoals', `<textarea id="rpNextGoals" rows="3" placeholder="No que vamos focar no próximo período?" aria-label="Próximos passos">${escapeHtmlLite(d.nextGoals)}</textarea>`)}
    ${rpSectionHTML(d, 'teacherNote', `<textarea id="rpTeacherNote" rows="3" aria-label="Mensagem da teacher">${escapeHtmlLite(d.teacherNote)}</textarea>`)}

    ${rpSectionHTML(d, 'signature', `
      <div class="report-form-grid">
        <div class="gm-form-field"><label for="rpTeacherName">Nome da professora</label><input type="text" id="rpTeacherName" value="${escapeAttrLite(d.teacherName)}" placeholder="ex.: Teacher Isa" /></div>
        <div class="gm-form-field"><label for="rpSignature">Texto da assinatura</label><input type="text" id="rpSignature" value="${escapeAttrLite(d.signature)}" /></div>
        <div class="gm-form-field"><label for="rpIssueDate">Data de emissão</label><input type="date" id="rpIssueDate" value="${escapeAttrLite(d.issueDate)}" /></div>
      </div>`)}

    <div class="game-btn-row no-print" style="margin-top:10px">
      <button class="btn btn-primary" id="rpSaveBtn">💾 Salvar boletim</button>
      <button class="game-btn" id="rpWhatsAppBtn">📱 Texto para WhatsApp</button>
      <button class="game-btn secondary" id="rpPrintBtn">🖨️ Salvar em PDF / Imprimir</button>
    </div>
    <p class="report-save-confirm no-print" id="rpSaveConfirm" hidden></p>
    <div class="rp-wa no-print" id="rpWhatsAppPanel" hidden></div>
  `;

  wireAttendancePeriods(student);

  // Section on/off: grey the section out so it is obvious it will not go.
  container.querySelectorAll('[data-show]').forEach(box => box.addEventListener('change', () => {
    box.closest('.rp-sec').classList.toggle('is-off', !box.checked);
  }));

  // Topics
  const topicsEl = container.querySelector('#rpTopics');
  const addTopic = () => {
    const input = container.querySelector('#rpTopicInput');
    const val = input.value.trim();
    if (!val) return;
    topicsEl.insertAdjacentHTML('beforeend', rpTopicRowHTML(val));
    input.value = '';
    input.focus();
  };
  container.querySelector('#rpAddTopicBtn').addEventListener('click', addTopic);
  container.querySelector('#rpTopicInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTopic(); }
  });
  topicsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-del-topic]'); if (b) b.closest('.rp-topic-row').remove(); });

  // Skills
  const skillsEl = container.querySelector('#rpSkills');
  container.querySelector('#rpAddSkillBtn').addEventListener('click', () => {
    skillsEl.insertAdjacentHTML('beforeend', rpSkillRowHTML({ label: '', level: SKILL_LEVELS[0], comment: '' }));
    skillsEl.lastElementChild.querySelector('input').focus();
  });
  skillsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-del-skill]'); if (b) b.closest('.rp-skill-row').remove(); });

  // Numbers
  container.querySelector('#rpRecalcStats').addEventListener('click', () => {
    const s = rpStatsFromSessions(student, quarterId);
    container.querySelector('#rpStatClasses').value = s.classes;
    container.querySelector('#rpStatAttendance').value = s.attendance;
    container.querySelector('#rpStatStars').value = s.stars;
    container.querySelector('#rpStatStickers').value = s.stickers;
  });

  container.querySelector('#rpSaveBtn').addEventListener('click', () => saveCurrentReport(student, quarterId, quarterLabel));
  container.querySelector('#rpWhatsAppBtn').addEventListener('click', () => openReportWhatsApp(student, quarterId, quarterLabel));
  container.querySelector('#rpPrintBtn').addEventListener('click', () => printReport(student, quarterId, quarterLabel));
}

function wireAttendancePeriods(student) {
  const body = document.getElementById('rpPeriodsBody');
  const foot = document.getElementById('rpPeriodsFoot');
  if (!body) return;
  let periods = loadAttendancePeriods(student.id);
  const persist = () => saveAttendancePeriods(student.id, periods);

  function paintFoot() {
    if (!periods.length) { foot.innerHTML = ''; return; }
    const sum = attendanceSummary(periods);
    foot.innerHTML = `<tr class="report-periods-total"><td colspan="3">Total de todos os períodos</td>
      <td>${sum.present}</td><td>${sum.absent}</td><td>${sum.total}</td><td>${sum.rate === null ? '—' : sum.rate + '%'}</td><td colspan="2"></td></tr>`;
  }

  function paint() {
    body.innerHTML = periods.length ? periods.map((p, i) => {
      const t = periodTotals(p);
      return `
        <tr data-row="${i}">
          <td><input type="text" data-f="label" value="${escapeAttrLite(p.label)}" placeholder="${escapeAttrLite(periodAutoLabel(p.from, p.to) || 'Ex.: jan–jun 2025')}" /></td>
          <td><input type="date" data-f="from" value="${escapeAttrLite(p.from || '')}" /></td>
          <td><input type="date" data-f="to" value="${escapeAttrLite(p.to || '')}" /></td>
          <td><input type="number" min="0" inputmode="numeric" data-f="present" value="${escapeAttrLite(p.present === '' || p.present == null ? '' : p.present)}" /></td>
          <td><input type="number" min="0" inputmode="numeric" data-f="absent" value="${escapeAttrLite(p.absent === '' || p.absent == null ? '' : p.absent)}" /></td>
          <td class="rp-total" data-out="total">${t.total || '—'}</td>
          <td class="rp-rate" data-out="rate">${t.rate === null ? '—' : t.rate + '%'}</td>
          <td><input type="text" data-f="note" value="${escapeAttrLite(p.note || '')}" placeholder="opcional" /></td>
          <td class="no-print rp-row-actions">
            <button type="button" class="gm-remove-row" data-count="${i}" title="Contar as aulas registradas no site entre as duas datas">↻ Contar</button>
            <button type="button" class="gm-remove-row" data-del="${i}" aria-label="Remover período">✕</button>
          </td>
        </tr>`;
    }).join('') : `<tr><td colspan="9" class="report-periods-empty">Nenhum período ainda — clique em <b>+ Adicionar período</b>.</td></tr>`;
    paintFoot();
  }

  body.addEventListener('input', (e) => {
    const input = e.target.closest('[data-f]');
    const row = e.target.closest('[data-row]');
    if (!input || !row) return;
    const p = periods[Number(row.dataset.row)];
    const f = input.dataset.f;
    p[f] = (f === 'present' || f === 'absent') ? (input.value === '' ? '' : Math.max(0, parseInt(input.value, 10) || 0)) : input.value;
    if (f === 'from' || f === 'to') {
      const labelInput = row.querySelector('[data-f="label"]');
      if (labelInput) labelInput.placeholder = periodAutoLabel(p.from, p.to) || 'Ex.: jan–jun 2025';
    }
    const t = periodTotals(p);
    row.querySelector('[data-out="total"]').textContent = t.total || '—';
    row.querySelector('[data-out="rate"]').textContent = t.rate === null ? '—' : t.rate + '%';
    persist();
    paintFoot();
  });

  body.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      const p = periods[Number(del.dataset.del)];
      if ((p.present || p.absent) && !confirm(`Remover o período "${p.label || periodAutoLabel(p.from, p.to) || 'sem nome'}"?`)) return;
      periods.splice(Number(del.dataset.del), 1);
      persist(); paint();
      return;
    }
    const count = e.target.closest('[data-count]');
    if (count) {
      const p = periods[Number(count.dataset.count)];
      if (!p.from && !p.to) { alert('Preencha as datas "De" e "Até" primeiro.'); return; }
      const c = countSessionsBetween(student, p.from, p.to);
      if (!c.count) { alert('Nenhuma aula registrada no site nesse intervalo. Digite os números das suas anotações.'); return; }
      if ((p.present || p.absent) && !confirm(`Substituir ${p.present || 0} presenças e ${p.absent || 0} faltas por ${c.present} e ${c.absent} (do registro de aulas)?`)) return;
      p.present = c.present; p.absent = c.absent;
      if (!p.label) p.label = periodAutoLabel(p.from, p.to);
      persist(); paint();
    }
  });

  document.getElementById('rpAddPeriodBtn').addEventListener('click', () => {
    periods.push({ id: 'per' + Date.now().toString(36), label: '', from: '', to: '', present: '', absent: '', note: '' });
    persist(); paint();
    const last = body.querySelector('tr:last-child [data-f="label"]');
    if (last) last.focus();
  });
  document.getElementById('rpAddSemesterBtn').addEventListener('click', () => {
    const y = new Date().getFullYear();
    [[`1º semestre ${y}`, `${y}-01-01`, `${y}-06-30`], [`2º semestre ${y}`, `${y}-07-01`, `${y}-12-31`]].forEach(([label, from, to]) => {
      if (periods.some(p => p.from === from && p.to === to)) return;
      const c = countSessionsBetween(student, from, to);
      periods.push({ id: 'per' + Date.now().toString(36) + periods.length, label, from, to,
        present: c.count ? c.present : '', absent: c.count ? c.absent : '', note: '' });
    });
    persist(); paint();
  });

  paint();
}

function gatherReportFormData() {
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const num = id => { const v = val(id); return v === '' ? '' : Math.max(0, Number(v) || 0); };
  const area = document.getElementById('reportFormArea') || document;
  const show = {}, headings = {};
  area.querySelectorAll('[data-show]').forEach(b => { show[b.dataset.show] = b.checked; });
  area.querySelectorAll('[data-heading]').forEach(i => { headings[i.dataset.heading] = i.value.trim() || RP_DEFAULT_HEADINGS[i.dataset.heading]; });
  return {
    title: val('rpTitle') || RP_DEFAULT_TITLE,
    name: val('rpName'),
    age: val('rpAge'),
    levelLabel: val('rpLevel'),
    period: val('rpPeriod'),
    attendanceText: val('rpAttendance'),
    stats: { classes: num('rpStatClasses'), attendance: num('rpStatAttendance'), stars: num('rpStatStars'), stickers: num('rpStatStickers') },
    topics: [...area.querySelectorAll('.rp-topic')].map(i => i.value.trim()).filter(Boolean),
    skills: [...area.querySelectorAll('.rp-skill-row')].map(r => ({
      label: r.querySelector('.rp-skill-label').value.trim(),
      level: r.querySelector('.rp-skill-level').value,
      comment: r.querySelector('.rp-skill-comment').value.trim(),
    })).filter(s => s.label),
    strengths: val('rpStrengths'),
    nextGoals: val('rpNextGoals'),
    teacherNote: val('rpTeacherNote'),
    teacherName: val('rpTeacherName'),
    signature: val('rpSignature'),
    issueDate: val('rpIssueDate') || rpTodayISO(),
    show,
    headings,
    periods: (() => {
      const sid = document.getElementById('rpStudentSelect') && document.getElementById('rpStudentSelect').value;
      return sid ? loadAttendancePeriods(sid).filter(p => p.label || p.from || p.present || p.absent) : [];
    })(),
  };
}

// ---------------------------------------------------------------------------
// SAVE TO HISTORY
// ---------------------------------------------------------------------------
function saveCurrentReport(student, quarterId, quarterLabel, quiet) {
  const formData = gatherReportFormData();
  const existing = findSavedReport(student.id, quarterId);
  const record = {
    id: existing ? existing.id : 'rep' + Date.now().toString(36),
    studentId: student.id,
    quarterId,
    quarterLabel,
    ...formData,
    autoStats: computeQuarterStats(student, quarterId),
    createdAt: existing ? existing.createdAt : Date.now(),
    updatedAt: Date.now(),
  };
  upsertReport(student.id, record);

  const confirmEl = document.getElementById('rpSaveConfirm');
  if (confirmEl && !quiet) {
    confirmEl.hidden = false;
    confirmEl.textContent = '✅ Boletim salvo!';
    setTimeout(() => { if (confirmEl.isConnected) confirmEl.hidden = true; }, 2200);
  }
  refreshSavedBadge(student, quarterId);
  return record;
}

// ---------------------------------------------------------------------------
// EXPORT — WhatsApp text, shown in an editable box before it is copied
// ---------------------------------------------------------------------------
function buildReportWhatsAppText(d) {
  const on = k => d.show[k] !== false;
  const h = k => d.headings[k] || RP_DEFAULT_HEADINGS[k];
  const parts = [];
  parts.push(`📚 *IGenglishschool — ${d.title || RP_DEFAULT_TITLE}* 📚`);
  parts.push(`👤 *${d.name}*${d.age ? ` (${d.age} anos)` : ''}${d.levelLabel ? ` — ${d.levelLabel}` : ''}${d.period ? `\n🗓️ ${d.period}` : ''}`);
  if (on('attendance') && d.attendanceText) parts.push(`📈 *${h('attendance')}:*\n${d.attendanceText}`);
  if (on('stats')) {
    const s = d.stats || {};
    const bits = [];
    if (s.classes !== '' && s.classes != null) bits.push(`${s.classes} aulas`);
    if (s.attendance !== '' && s.attendance != null) bits.push(`${s.attendance}% de presença`);
    if (s.stars !== '' && s.stars != null) bits.push(`${s.stars} estrelas`);
    if (s.stickers !== '' && s.stickers != null) bits.push(`${s.stickers} figurinhas`);
    if (bits.length) parts.push(`🔢 *${h('stats')}:* ${bits.join(' · ')}`);
  }
  if (on('periods') && d.periods && d.periods.length) parts.push(periodsWhatsApp(d.periods, h('periods')).trim());
  if (on('topics')) parts.push(`📖 *${h('topics')}:*\n${d.topics.length ? d.topics.map(t => `• ${t}`).join('\n') : '—'}`);
  if (on('skills') && d.skills.length) parts.push(`🎧 *${h('skills')}:*\n${d.skills.map(s => `• ${s.label}: *${s.level}*${s.comment ? ' — ' + s.comment : ''}`).join('\n')}`);
  if (on('strengths')) parts.push(`*${h('strengths')}:*\n${d.strengths || '—'}`);
  if (on('nextGoals')) parts.push(`*${h('nextGoals')}:*\n${d.nextGoals || '—'}`);
  if (on('teacherNote')) parts.push(`*${h('teacherNote')}:*\n${d.teacherNote || '—'}`);
  parts.push(`Com carinho,\n${d.teacherName ? d.teacherName + ' · ' : ''}IGenglishschool 💛`);
  return parts.join('\n\n');
}

function openReportWhatsApp(student, quarterId, quarterLabel) {
  // What is sent is what is saved: copying never leaves an unsaved version.
  saveCurrentReport(student, quarterId, quarterLabel, true);
  const panel = document.getElementById('rpWhatsAppPanel');
  if (!panel) return;
  const text = buildReportWhatsAppText(gatherReportFormData());
  panel.hidden = false;
  panel.innerHTML = `
    <p class="rp-wa-head"><b>📱 Texto para WhatsApp</b> — confira e corrija aqui antes de copiar. O que estiver nesta caixa é o que vai ser copiado.</p>
    <textarea id="rpWhatsAppText" rows="16">${escapeHtmlLite(text)}</textarea>
    <div class="game-btn-row">
      <button class="btn btn-primary" type="button" id="rpWaCopy">📋 Copiar texto</button>
      <button class="game-btn secondary" type="button" id="rpWaRegen" title="Montar o texto de novo a partir do formulário (perde as mudanças feitas nesta caixa)">↻ Gerar de novo do formulário</button>
      <button class="game-btn secondary" type="button" id="rpWaClose">Fechar</button>
    </div>`;
  const area = panel.querySelector('#rpWhatsAppText');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  panel.querySelector('#rpWaCopy').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const done = () => { btn.textContent = '✅ Copiado!'; setTimeout(() => { if (btn.isConnected) btn.textContent = '📋 Copiar texto'; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(area.value).then(done).catch(() => fallbackCopyReportText(area.value, done));
    } else {
      fallbackCopyReportText(area.value, done);
    }
  });
  panel.querySelector('#rpWaRegen').addEventListener('click', () => {
    saveCurrentReport(student, quarterId, quarterLabel, true);
    area.value = buildReportWhatsAppText(gatherReportFormData());
  });
  panel.querySelector('#rpWaClose').addEventListener('click', () => { panel.hidden = true; panel.innerHTML = ''; });
}

function periodsWhatsApp(periods, heading) {
  if (!periods || !periods.length) return '';
  const lines = periods.map(p => {
    const t = periodTotals(p);
    return `• ${p.label || periodAutoLabel(p.from, p.to) || 'Período'}: ${t.present} presença(s), ${t.absent} falta(s)${t.rate === null ? '' : ` — ${t.rate}%`}${p.note ? ` (${p.note})` : ''}`;
  });
  const sum = attendanceSummary(periods);
  if (periods.length > 1) lines.push(`• *Total:* ${sum.present} presença(s), ${sum.absent} falta(s)${sum.rate === null ? '' : ` — ${sum.rate}%`}`);
  return `\n🗓️ *${heading || 'Histórico por período'}:*\n${lines.join('\n')}\n`;
}

function fallbackCopyReportText(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) {}
  document.body.removeChild(ta);
}

// ---------------------------------------------------------------------------
// EXPORT — printable A4 letterhead
// ---------------------------------------------------------------------------
// The print sheet used to be rendered INSIDE the modal and revealed with
// `visibility`. That fails in two ways: the modal is a fixed-height,
// overflow:hidden flex box, so anything past the first page was clipped
// away; and an absolutely-positioned block does not paginate. It is now
// built as a direct child of <body>, in normal flow, with every sibling
// display:none'd for print — so it flows onto as many A4 pages as it needs.
// ---------------------------------------------------------------------------

const PRINT_ROOT_ID = 'reportPrintRoot';

function nl2brEscaped(text) {
  return escapeHtmlLite(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('<br />')
    .replace(/(<br \/>){3,}/g, '<br /><br />');
}

function getPrintRoot() {
  let root = document.getElementById(PRINT_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = PRINT_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

// Resolves once every <img> inside `root` has either loaded or failed, so we
// never call print() on a half-painted letterhead. Capped so a hung request
// can't block the teacher indefinitely.
function waitForImages(root, timeoutMs) {
  const images = Array.from(root.querySelectorAll('img'));
  if (images.length === 0) return Promise.resolve();
  const settled = images.map(img => (img.complete && img.naturalWidth > 0)
    ? Promise.resolve()
    : new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      }));
  return Promise.race([
    Promise.all(settled),
    new Promise(resolve => setTimeout(resolve, timeoutMs || 2500)),
  ]);
}

function skillRatingIcon(levelLabel) {
  if (levelLabel === 'Excelente') return '★★★';
  if (levelLabel === 'Consolidado') return '★★☆';
  return '★☆☆';
}

function buildReportPrintHTML(student, d) {
  const on = k => !d.show || d.show[k] !== false;
  const h = k => escapeHtmlLite((d.headings && d.headings[k]) || RP_DEFAULT_HEADINGS[k]);
  let issued = '';
  try {
    issued = new Date((d.issueDate || rpTodayISO()) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (e) { issued = d.issueDate || ''; }
  const s = d.stats || {};
  const statBits = [
    [s.classes, 'aulas'], [s.attendance === '' || s.attendance == null ? '' : `${s.attendance}%`, 'presença'],
    [s.stars, 'estrelas'], [s.stickers, 'figurinhas'],
  ].filter(([v]) => v !== '' && v != null);
  const skills = Array.isArray(d.skills) ? d.skills : [];

  return `
    <div class="report-sheet">
      <div class="report-letterhead">
        <img src="logo.png" alt="IGenglishschool" class="report-letterhead-logo"
             data-fallback="IGenglishschool" onerror="igImageFallback(this)" />
        <p class="report-letterhead-title">${escapeHtmlLite(d.title || RP_DEFAULT_TITLE)}</p>
      </div>

      <div class="report-print-card">
        <div class="report-print-header" style="--accent-color:${escapeAttrLite(student.color)}">
          <span class="report-print-avatar" style="background:${escapeAttrLite(student.color)}">${escapeHtmlLite(student.avatar)}</span>
          <div>
            <h2>${escapeHtmlLite(d.name)}</h2>
            <p>${[d.age ? `${escapeHtmlLite(String(d.age))} anos` : '', escapeHtmlLite(d.levelLabel), escapeHtmlLite(d.period)].filter(Boolean).join(' · ')}</p>
          </div>
        </div>

        ${on('attendance') || (on('stats') && statBits.length) ? `
        <div class="report-print-section">
          ${on('attendance') ? `<h4>${h('attendance')}</h4><p>${nl2brEscaped(d.attendanceText) || '—'}</p>` : `<h4>${h('stats')}</h4>`}
          ${on('stats') && statBits.length ? `
            <ul class="report-print-stats">
              ${statBits.map(([v, label]) => `<li><strong>${escapeHtmlLite(String(v))}</strong> ${label}</li>`).join('')}
            </ul>` : ''}
        </div>` : ''}

        ${on('periods') && d.periods && d.periods.length ? `
        <div class="report-print-section">
          <h4>${h('periods')}</h4>
          <table class="report-print-skills report-print-periods">
            <thead><tr><th>Período</th><th>Presenças</th><th>Faltas</th><th>Aulas</th><th>Frequência</th><th>Observação</th></tr></thead>
            <tbody>
              ${d.periods.map(p => { const t = periodTotals(p); return `
                <tr>
                  <td class="skill-name">${escapeHtmlLite(p.label || periodAutoLabel(p.from, p.to) || '—')}</td>
                  <td>${t.present}</td><td>${t.absent}</td><td>${t.total}</td>
                  <td>${t.rate === null ? '—' : t.rate + '%'}</td>
                  <td class="skill-comment">${escapeHtmlLite(p.note) || '—'}</td>
                </tr>`; }).join('')}
            </tbody>
            ${d.periods.length > 1 ? (() => { const sum = attendanceSummary(d.periods); return `
            <tfoot><tr><td class="skill-name">Total</td><td>${sum.present}</td><td>${sum.absent}</td><td>${sum.total}</td><td>${sum.rate === null ? '—' : sum.rate + '%'}</td><td></td></tr></tfoot>`; })() : ''}
          </table>
        </div>` : ''}

        ${on('topics') ? `
        <div class="report-print-section">
          <h4>${h('topics')}</h4>
          ${d.topics.length
            ? `<ul class="report-print-topics">${d.topics.map(t => `<li>${escapeHtmlLite(t)}</li>`).join('')}</ul>`
            : '<p>—</p>'}
        </div>` : ''}

        ${on('skills') && skills.length ? `
        <div class="report-print-section">
          <h4>${h('skills')}</h4>
          <table class="report-print-skills">
            <thead>
              <tr><th>Habilidade</th><th>Nível</th><th>Observação</th></tr>
            </thead>
            <tbody>
              ${skills.map(sk => `
                <tr>
                  <td class="skill-name">${escapeHtmlLite(sk.label)}</td>
                  <td class="skill-level"><span class="skill-stars">${skillRatingIcon(sk.level)}</span> ${escapeHtmlLite(sk.level)}</td>
                  <td class="skill-comment">${escapeHtmlLite(sk.comment) || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : ''}

        ${on('strengths') ? `
        <div class="report-print-section">
          <h4>${h('strengths')}</h4>
          <p>${nl2brEscaped(d.strengths) || '—'}</p>
        </div>` : ''}

        ${on('nextGoals') ? `
        <div class="report-print-section">
          <h4>${h('nextGoals')}</h4>
          <p>${nl2brEscaped(d.nextGoals) || '—'}</p>
        </div>` : ''}

        ${on('teacherNote') ? `
        <div class="report-print-note">
          <h4>${h('teacherNote')}</h4>
          <p>${nl2brEscaped(d.teacherNote) || '—'}</p>
        </div>` : ''}

        ${on('signature') ? `
        <div class="report-print-signature">
          <div class="report-signature-line">
            ${d.teacherName ? `<b class="report-signature-name">${escapeHtmlLite(d.teacherName)}</b>` : ''}
            <span>${escapeHtmlLite(d.signature || 'Assinatura da Teacher')}</span>
          </div>
          <p class="report-print-date">Emitido em ${escapeHtmlLite(issued)}</p>
        </div>` : ''}
      </div>
    </div>
  `;
}

function printReport(student, quarterId, quarterLabel) {
  const d = gatherReportFormData();

  if (!d.name) {
    alert('Preencha o nome do aluno antes de imprimir.');
    return;
  }
  // The PDF the family gets is the saved version, never a draft.
  if (quarterId) saveCurrentReport(student, quarterId, quarterLabel, true);

  const root = getPrintRoot();
  root.innerHTML = buildReportPrintHTML(student, d);

  const btn = document.getElementById('rpPrintBtn');
  const originalLabel = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Preparando…'; }

  const restoreButton = () => {
    if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = originalLabel; }
  };

  // The sheet is deliberately NOT torn down after printing: window.print()
  // returns as soon as the dialog is dismissed in some browsers and while
  // the preview is still rasterising in others, so clearing it here can
  // blank the output. It is display:none on screen and rebuilt from the
  // live form on every print, so leaving it in place costs nothing.
  window.addEventListener('afterprint', restoreButton, { once: true });

  waitForImages(root, 3000)
    .then(() => {
      // setTimeout, not requestAnimationFrame: rAF is paused in background
      // tabs, which would leave the button stuck on "Preparando…" forever.
      setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          alert('O navegador bloqueou a impressão. Use Ctrl+P para imprimir o boletim.');
        } finally {
          setTimeout(restoreButton, 400);
        }
      }, 60);
    })
    .catch(restoreButton);
}
