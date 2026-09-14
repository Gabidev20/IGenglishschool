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
  document.getElementById('rpPrintBtn').addEventListener('click', () => printReport(student, quarterId));
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
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const stats = d.autoStats || {};

  return `
    <div class="report-sheet">
      <div class="report-letterhead">
        <img src="logo.png" alt="IGenglishschool" class="report-letterhead-logo"
             data-fallback="IGenglishschool" onerror="igImageFallback(this)" />
        <p class="report-letterhead-title">Boletim Trimestral · Quarterly Progress Report</p>
      </div>

      <div class="report-print-card">
        <div class="report-print-header" style="--accent-color:${escapeAttrLite(student.color)}">
          <span class="report-print-avatar" style="background:${escapeAttrLite(student.color)}">${escapeHtmlLite(student.avatar)}</span>
          <div>
            <h2>${escapeHtmlLite(d.name)}</h2>
            <p>${escapeHtmlLite(String(d.age))} anos · ${escapeHtmlLite(d.levelLabel)} · ${escapeHtmlLite(d.period)}</p>
          </div>
        </div>

        <div class="report-print-section">
          <h4>Frequência &amp; Engajamento</h4>
          <p>${nl2brEscaped(d.attendanceText) || '—'}</p>
          ${(stats.totalClasses || stats.totalStars) ? `
            <ul class="report-print-stats">
              <li><strong>${stats.totalClasses || 0}</strong> aulas</li>
              <li><strong>${stats.attendanceRate || 0}%</strong> presença</li>
              <li><strong>${stats.totalStars || 0}</strong> estrelas</li>
              <li><strong>${stats.stickerCount || 0}</strong> stickers</li>
            </ul>` : ''}
        </div>

        <div class="report-print-section">
          <h4>Conteúdos &amp; Tópicos Trabalhados</h4>
          ${d.topics.length
            ? `<ul class="report-print-topics">${d.topics.map(t => `<li>${escapeHtmlLite(t)}</li>`).join('')}</ul>`
            : '<p>—</p>'}
        </div>

        <div class="report-print-section">
          <h4>Habilidades Avaliadas</h4>
          <table class="report-print-skills">
            <thead>
              <tr><th>Habilidade</th><th>Nível</th><th>Observação</th></tr>
            </thead>
            <tbody>
              ${SKILL_KEYS.map(k => `
                <tr>
                  <td class="skill-name">${escapeHtmlLite(SKILL_LABELS[k])}</td>
                  <td class="skill-level"><span class="skill-stars">${skillRatingIcon(d.skills[k].level)}</span> ${escapeHtmlLite(d.skills[k].level)}</td>
                  <td class="skill-comment">${escapeHtmlLite(d.skills[k].comment) || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="report-print-section">
          <h4>✨ Destaques do Aluno</h4>
          <p>${nl2brEscaped(d.strengths) || '—'}</p>
        </div>

        <div class="report-print-section">
          <h4>🎯 Próximos Passos</h4>
          <p>${nl2brEscaped(d.nextGoals) || '—'}</p>
        </div>

        <div class="report-print-note">
          <h4>💌 Mensagem da Teacher</h4>
          <p>${nl2brEscaped(d.teacherNote) || '—'}</p>
        </div>

        <div class="report-print-signature">
          <div class="report-signature-line"><span>Assinatura da Teacher</span></div>
          <p class="report-print-date">Emitido em ${escapeHtmlLite(today)}</p>
        </div>
      </div>
    </div>
  `;
}

function printReport(student, quarterId) {
  const d = gatherReportFormData();

  if (!d.name) {
    alert('Preencha o nome do aluno antes de imprimir.');
    return;
  }

  d.autoStats = quarterId ? computeQuarterStats(student, quarterId) : null;

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
