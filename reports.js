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
function reportsKey(studentId) { return `hopscotch_reports_${studentId}`; }

function loadReports(studentId) {
  try { return JSON.parse(localStorage.getItem(reportsKey(studentId))) || []; } catch (e) { return []; }
}
function saveReportsList(studentId, list) {
  localStorage.setItem(reportsKey(studentId), JSON.stringify(list));
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
    return `${student.name} showed great enthusiasm and a positive attitude in every class this term.`;
  }
  const sample = stats.topics.slice(0, 2).join(' and ');
  return `${student.name} demonstrated great enthusiasm during activities on ${sample}, with consistent participation and steady progress this term.`;
}

function suggestTeacherNote(student) {
  return `It has been a real pleasure teaching ${student.name} this term! Please keep encouraging a little practice at home — every bit helps. 💛`;
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
      : 'No classes logged yet for this quarter.',
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
      <h3 id="modalTitle">📊 Quarterly Progress Report</h3>
      <div class="report-controls no-print">
        <div class="gm-form-field">
          <label for="rpStudentSelect">Student</label>
          <select id="rpStudentSelect">
            ${students.map(s => `<option value="${s.id}" ${s.id === activeId ? 'selected' : ''}>${escapeHtmlLite(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="gm-form-field">
          <label for="rpQuarterSelect">Quarter</label>
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
  renderReportForm(document.getElementById('reportFormArea'), student, quarterId, quarterLabel);
  refreshSavedBadge(student, quarterId);
}

function refreshSavedBadge(student, quarterId) {
  const badge = document.getElementById('rpSavedBadge');
  if (!badge) return;
  const exists = Boolean(findSavedReport(student.id, quarterId));
  badge.textContent = exists ? '✅ Saved' : '🆕 Not saved yet';
  badge.className = 'report-saved-badge ' + (exists ? 'is-saved' : 'is-new');
}

// ---------------------------------------------------------------------------
// EDITABLE FORM
// ---------------------------------------------------------------------------
let rpTopics = [];

function renderReportForm(container, student, quarterId, quarterLabel) {
  const data = getFormDefaults(student, quarterId, quarterLabel);
  rpTopics = data.topics.slice();
  const isSaved = Boolean(data.id);
  const stats = data.autoStats || computeQuarterStats(student, quarterId);

  container.innerHTML = `
    <p class="report-saved-indicator no-print">${isSaved
      ? '✅ Showing the saved report for this quarter — edit anything and save again to update it.'
      : '🆕 Auto-filled from this quarter\'s class history — review and edit before saving.'}</p>

    <div class="report-auto-stats no-print">
      <div class="report-stat"><strong>${stats.totalClasses}</strong><span>Classes</span></div>
      <div class="report-stat"><strong>${stats.attendanceRate}%</strong><span>Attendance</span></div>
      <div class="report-stat"><strong>${stats.totalStars}</strong><span>Stars</span></div>
      <div class="report-stat"><strong>${stats.stickerCount}</strong><span>Stickers</span></div>
    </div>

    <div class="report-form-grid">
      <div class="gm-form-field"><label for="rpName">Student Name</label><input type="text" id="rpName" value="${escapeAttrLite(data.name)}" /></div>
      <div class="gm-form-field"><label for="rpAge">Age</label><input type="text" id="rpAge" value="${escapeAttrLite(data.age)}" /></div>
      <div class="gm-form-field"><label for="rpLevel">Level</label><input type="text" id="rpLevel" value="${escapeAttrLite(data.levelLabel)}" /></div>
      <div class="gm-form-field"><label for="rpPeriod">Period</label><input type="text" id="rpPeriod" value="${escapeAttrLite(data.period)}" /></div>
    </div>

    <div class="gm-form-field">
      <label for="rpAttendance">Frequência &amp; Engajamento</label>
      <input type="text" id="rpAttendance" value="${escapeAttrLite(data.attendanceText)}" />
    </div>

    <div class="gm-form-field">
      <label>Conteúdos &amp; Tópicos Trabalhados</label>
      <div class="report-tags" id="rpTopicsTags"></div>
      <div class="report-tag-input-row">
        <input type="text" id="rpTopicInput" placeholder="Add a topic and press Enter" />
        <button class="game-btn secondary" id="rpAddTopicBtn" type="button">+ Add</button>
      </div>
    </div>

    <div class="gm-form-field">
      <label>Habilidades Avaliadas</label>
      <div class="report-skills-grid">
        ${SKILL_KEYS.map(k => `
          <div class="report-skill-row">
            <span class="report-skill-label">${SKILL_LABELS[k]}</span>
            <select id="rpSkillLevel_${k}">
              ${SKILL_LEVELS.map(lv => `<option value="${lv}" ${lv === data.skills[k].level ? 'selected' : ''}>${lv}</option>`).join('')}
            </select>
            <input type="text" id="rpSkillComment_${k}" placeholder="Short comment (optional)" value="${escapeAttrLite(data.skills[k].comment)}" />
          </div>
        `).join('')}
      </div>
    </div>

    <div class="gm-form-field">
      <label for="rpStrengths">✨ Destaques do Aluno (Strengths)</label>
      <textarea id="rpStrengths" rows="3">${escapeHtmlLite(data.strengths)}</textarea>
    </div>

    <div class="gm-form-field">
      <label for="rpNextGoals">🎯 Próximos Passos (Next Goals)</label>
      <textarea id="rpNextGoals" rows="3" placeholder="What will we focus on next term?">${escapeHtmlLite(data.nextGoals)}</textarea>
    </div>

    <div class="gm-form-field">
      <label for="rpTeacherNote">💌 Teacher's Note</label>
      <textarea id="rpTeacherNote" rows="3">${escapeHtmlLite(data.teacherNote)}</textarea>
    </div>

    <div class="game-btn-row no-print" style="margin-top:10px">
      <button class="btn btn-primary" id="rpSaveBtn">💾 Salvar Relatório no Histórico</button>
      <button class="game-btn" id="rpWhatsAppBtn">📱 Copiar para WhatsApp</button>
      <button class="game-btn secondary" id="rpPrintBtn">🖨️ Salvar em PDF / Imprimir</button>
    </div>
    <p class="report-save-confirm no-print" id="rpSaveConfirm" hidden></p>

    <div id="reportPrintArea"></div>
  `;

  paintTopicTags();

  function addTopicFromInput() {
    const input = document.getElementById('rpTopicInput');
    const val = input.value.trim();
    if (!val) return;
    if (!rpTopics.includes(val)) rpTopics.push(val);
    input.value = '';
    paintTopicTags();
  }

  function paintTopicTags() {
    const el = document.getElementById('rpTopicsTags');
    el.innerHTML = rpTopics.length
      ? rpTopics.map((t, i) => `<span class="report-tag">${escapeHtmlLite(t)}<button type="button" data-remove-topic="${i}" aria-label="Remove ${escapeAttrLite(t)}">✕</button></span>`).join('')
      : `<span class="report-tags-empty">No topics added yet.</span>`;
    el.querySelectorAll('[data-remove-topic]').forEach(btn => {
      btn.addEventListener('click', () => { rpTopics.splice(Number(btn.dataset.removeTopic), 1); paintTopicTags(); });
    });
  }

  document.getElementById('rpAddTopicBtn').addEventListener('click', addTopicFromInput);
  document.getElementById('rpTopicInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTopicFromInput(); }
  });

  document.getElementById('rpSaveBtn').addEventListener('click', () => saveCurrentReport(student, quarterId, quarterLabel));
  document.getElementById('rpWhatsAppBtn').addEventListener('click', () => exportReportToWhatsApp());
  document.getElementById('rpPrintBtn').addEventListener('click', () => printReport(student));
}

function gatherReportFormData() {
  return {
    name: document.getElementById('rpName').value.trim(),
    age: document.getElementById('rpAge').value.trim(),
    levelLabel: document.getElementById('rpLevel').value.trim(),
    period: document.getElementById('rpPeriod').value.trim(),
    attendanceText: document.getElementById('rpAttendance').value.trim(),
    topics: rpTopics.slice(),
    skills: SKILL_KEYS.reduce((acc, k) => {
      acc[k] = {
        level: document.getElementById(`rpSkillLevel_${k}`).value,
        comment: document.getElementById(`rpSkillComment_${k}`).value.trim(),
      };
      return acc;
    }, {}),
    strengths: document.getElementById('rpStrengths').value.trim(),
    nextGoals: document.getElementById('rpNextGoals').value.trim(),
    teacherNote: document.getElementById('rpTeacherNote').value.trim(),
  };
}

// ---------------------------------------------------------------------------
// SAVE TO HISTORY
// ---------------------------------------------------------------------------
function saveCurrentReport(student, quarterId, quarterLabel) {
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
  if (confirmEl) {
    confirmEl.hidden = false;
    confirmEl.textContent = '✅ Report saved to history!';
    setTimeout(() => { if (confirmEl.isConnected) confirmEl.hidden = true; }, 2200);
  }
  refreshSavedBadge(student, quarterId);
}

// ---------------------------------------------------------------------------
// EXPORT — WhatsApp text
// ---------------------------------------------------------------------------
function exportReportToWhatsApp() {
  const d = gatherReportFormData();
  const skillLines = SKILL_KEYS
    .map(k => `• ${SKILL_LABELS[k]}: *${d.skills[k].level}*${d.skills[k].comment ? ' — ' + d.skills[k].comment : ''}`)
    .join('\n');

  const text = `📚 *IGenglishschool — Boletim Trimestral* 📚

👤 *${d.name}* (${d.age} anos) — ${d.levelLabel}
🗓️ ${d.period}

📈 *Frequência & Engajamento:*
${d.attendanceText}

📖 *Conteúdos trabalhados:*
${d.topics.length ? d.topics.map(t => `• ${t}`).join('\n') : '—'}

🎧 *Habilidades avaliadas:*
${skillLines}

✨ *Destaques do aluno:*
${d.strengths || '—'}

🎯 *Próximos passos:*
${d.nextGoals || '—'}

💌 *Mensagem da Teacher:*
${d.teacherNote || '—'}

Com carinho,
IGenglishschool 💛`;

  const btn = document.getElementById('rpWhatsAppBtn');
  const originalLabel = '📱 Copiar para WhatsApp';
  const done = () => {
    btn.textContent = '✅ Copiado!';
    setTimeout(() => { if (btn.isConnected) btn.textContent = originalLabel; }, 1500);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopyReportText(text, done));
  } else {
    fallbackCopyReportText(text, done);
  }
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
// EXPORT — printable A4 letterhead (built fresh from the live form so print
// output always matches what's on screen, regardless of how browsers print
// form controls)
// ---------------------------------------------------------------------------
function printReport(student) {
  const d = gatherReportFormData();
  const area = document.getElementById('reportPrintArea');

  area.innerHTML = `
    <div class="report-letterhead">
      <img src="logo.png" alt="IGenglishschool" class="report-letterhead-logo"
           onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'report-letterhead-logo-fallback',textContent:'IGenglishschool'}))" />
      <p class="report-letterhead-title">Quarterly Progress Report</p>
    </div>
    <div class="report-print-card">
      <div class="report-print-header" style="--accent-color:${student.color}">
        <span class="report-print-avatar" style="background:${student.color}">${student.avatar}</span>
        <div>
          <h2>${escapeHtmlLite(d.name)}</h2>
          <p>${escapeHtmlLite(String(d.age))} yrs · ${escapeHtmlLite(d.levelLabel)} · ${escapeHtmlLite(d.period)}</p>
        </div>
      </div>

      <div class="report-print-section">
        <h4>Frequência &amp; Engajamento</h4>
        <p>${escapeHtmlLite(d.attendanceText)}</p>
      </div>

      <div class="report-print-section">
        <h4>Conteúdos &amp; Tópicos Trabalhados</h4>
        <p>${d.topics.length ? d.topics.map(escapeHtmlLite).join(' · ') : '—'}</p>
      </div>

      <div class="report-print-section">
        <h4>Habilidades Avaliadas</h4>
        <table class="report-print-skills">
          ${SKILL_KEYS.map(k => `
            <tr>
              <td class="skill-name">${SKILL_LABELS[k]}</td>
              <td class="skill-level">${escapeHtmlLite(d.skills[k].level)}</td>
              <td class="skill-comment">${escapeHtmlLite(d.skills[k].comment)}</td>
            </tr>
          `).join('')}
        </table>
      </div>

      <div class="report-print-section">
        <h4>Destaques do Aluno</h4>
        <p>${escapeHtmlLite(d.strengths) || '—'}</p>
      </div>

      <div class="report-print-section">
        <h4>Próximos Passos</h4>
        <p>${escapeHtmlLite(d.nextGoals) || '—'}</p>
      </div>

      <div class="report-print-note">
        <p>${escapeHtmlLite(d.teacherNote)}</p>
      </div>
    </div>
  `;

  window.print();
}
