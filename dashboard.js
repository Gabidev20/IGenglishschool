/* ==========================================================================
   IGenglishschool — Teacher Dashboard
   ==========================================================================
   The first thing on the home page, because it answers the three questions a
   teacher actually opens the site with:

     📅 This week   — who do I teach, on which day, and have I prepared it?
     📊 This month  — who showed up and who didn't?
     💰 Money       — who has paid, and what did the school spend?

   -------------------------------------------------------------------------
   WHERE THE DATA COMES FROM
   -------------------------------------------------------------------------
   Attendance is NOT typed in twice: the monthly grid reads the very same
   `sessions_<studentId>` records that "Today's Class" already saves after
   every lesson. Everything the dashboard adds on top lives in three new
   IGStore keys, so it all syncs to Supabase like the rest:

     student_schedules  { [studentId]: { perWeek, days[], time, fee } }
     lesson_prep        { "<studentId>|<YYYY-MM-DD>": true }
     finance_payments   { "<studentId>|<YYYY-MM>": { paid, amount, on } }
     finance_expenses   [ { id, name, amount, month, category } ]

   Dates are handled as plain 'YYYY-MM-DD' strings throughout. new Date('…')
   on a bare date parses as UTC, which in Brazil lands on the previous day —
   so every conversion here goes through dashDate()/dashKey(), never through
   the Date constructor on a string.
   ========================================================================== */

const DASH_SCHEDULE_KEY = 'student_schedules';
const DASH_PREP_KEY = 'lesson_prep';
const DASH_PAYMENTS_KEY = 'finance_payments';
const DASH_EXPENSES_KEY = 'finance_expenses';

const DASH_DAYS = [
  { id: 'mon', short: 'Seg', long: 'Segunda', dow: 1 },
  { id: 'tue', short: 'Ter', long: 'Terça', dow: 2 },
  { id: 'wed', short: 'Qua', long: 'Quarta', dow: 3 },
  { id: 'thu', short: 'Qui', long: 'Quinta', dow: 4 },
  { id: 'fri', short: 'Sex', long: 'Sexta', dow: 5 },
  { id: 'sat', short: 'Sáb', long: 'Sábado', dow: 6 },
];

const DASH_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Common school tools, offered as one-tap chips when adding an expense.
const DASH_EXPENSE_PRESETS = [
  { name: 'Zoom', emoji: '🎥' },
  { name: 'Canva', emoji: '🎨' },
  { name: 'Claude', emoji: '🤖' },
  { name: 'Internet', emoji: '🌐' },
  { name: 'Material', emoji: '🖍️' },
  { name: 'Vercel', emoji: '▲' },
];

// ---------------------------------------------------------------------------
// DATES — local, never UTC
// ---------------------------------------------------------------------------
function dashKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function dashDate(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function dashMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function dashToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

// Monday of the week `date` falls in.
function dashWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();                      // 0 = Sunday
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
}
function dashAddDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function dashMoney(value) {
  const n = Number(value) || 0;
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// STORE
// ---------------------------------------------------------------------------
function dashSchedules() {
  const raw = IGStore.getJSON(DASH_SCHEDULE_KEY, null);
  return (raw && typeof raw === 'object') ? raw : {};
}
function dashScheduleFor(studentId) {
  const s = dashSchedules()[studentId];
  return {
    days: Array.isArray(s && s.days) ? s.days.filter(d => DASH_DAYS.some(x => x.id === d)) : [],
    time: (s && s.time) || '',
    fee: Number(s && s.fee) || 0,
  };
}
function dashSaveSchedule(studentId, patch) {
  const all = dashSchedules();
  all[studentId] = { ...dashScheduleFor(studentId), ...patch };
  IGStore.setJSON(DASH_SCHEDULE_KEY, all);
}

function dashPrep() {
  const raw = IGStore.getJSON(DASH_PREP_KEY, null);
  return (raw && typeof raw === 'object') ? raw : {};
}
function dashIsPrepped(studentId, dateKey) { return Boolean(dashPrep()[`${studentId}|${dateKey}`]); }
function dashSetPrepped(studentId, dateKey, on) {
  const all = dashPrep();
  const k = `${studentId}|${dateKey}`;
  if (on) all[k] = true; else delete all[k];
  IGStore.setJSON(DASH_PREP_KEY, all);
}

function dashPayments() {
  const raw = IGStore.getJSON(DASH_PAYMENTS_KEY, null);
  return (raw && typeof raw === 'object') ? raw : {};
}
function dashPaymentFor(studentId, monthKey) {
  const p = dashPayments()[`${studentId}|${monthKey}`];
  return {
    paid: Boolean(p && p.paid),
    amount: Number(p && p.amount) || 0,
    on: (p && p.on) || '',
  };
}
function dashSavePayment(studentId, monthKey, patch) {
  const all = dashPayments();
  const k = `${studentId}|${monthKey}`;
  const next = { ...dashPaymentFor(studentId, monthKey), ...patch };
  if (!next.paid && !next.amount) delete all[k]; else all[k] = next;
  IGStore.setJSON(DASH_PAYMENTS_KEY, all);
}

function dashExpenses() {
  const raw = IGStore.getJSON(DASH_EXPENSES_KEY, null);
  return Array.isArray(raw) ? raw : [];
}
function dashSaveExpenses(list) { IGStore.setJSON(DASH_EXPENSES_KEY, list); }

// ---------------------------------------------------------------------------
// DERIVED — attendance out of the session log
// ---------------------------------------------------------------------------
// Every class the teacher has already logged for this student, newest last,
// as a map from date -> the session record.
function dashSessionsByDate(studentId) {
  const list = (typeof loadSessions === 'function') ? loadSessions(studentId) : [];
  const byDate = {};
  list.forEach(s => { if (s && s.date) byDate[s.date] = s; });
  return byDate;
}

function dashMonthStats(student, monthKey) {
  const byDate = dashSessionsByDate(student.id);
  let present = 0, absent = 0;
  Object.entries(byDate).forEach(([date, s]) => {
    if (!date.startsWith(monthKey)) return;
    if (s.present) present++; else absent++;
  });
  const total = present + absent;
  return { present, absent, total, rate: total ? Math.round((present / total) * 100) : null };
}

// The days of `monthKey` this student is scheduled for — used as the columns
// of the attendance grid so a day with no lesson is not shown as a gap.
function dashScheduledDatesInMonth(studentId, monthKey) {
  const sched = dashScheduleFor(studentId);
  if (!sched.days.length) return [];
  const [y, m] = monthKey.split('-').map(Number);
  const out = [];
  const d = new Date(y, m - 1, 1);
  while (d.getMonth() === m - 1) {
    const day = DASH_DAYS.find(x => x.dow === d.getDay());
    if (day && sched.days.includes(day.id)) out.push(dashKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------
let dashTab = 'week';
let dashWeekAnchor = dashToday();
let dashMonthAnchor = dashToday();

// ---------------------------------------------------------------------------
// RENDER — shell
// ---------------------------------------------------------------------------
function renderDashboard() {
  const root = document.getElementById('teacherDashboard');
  if (!root) return;

  const today = dashToday();

  root.innerHTML = `
    <div class="dash">
      <div class="dash-top">
        <div class="dash-title">
          <h2>${igEscapeHtml(dashGreeting())}</h2>
          <p>${igEscapeHtml(dashTodayLabel(today))}</p>
        </div>
        <button class="dash-sound" id="dashSoundBtn" type="button"
          title="Ligar ou desligar os sons de estrela e figurinha"></button>
      </div>

      <div class="dash-stats">${dashStatCardsHTML()}</div>

      <div class="dash-tabs" role="tablist">
        ${[['week', '📅', 'Semana'], ['month', '📊', 'Mês'], ['money', '💰', 'Financeiro']]
          .map(([id, icon, label]) => `
            <button class="dash-tab ${dashTab === id ? 'active' : ''}" data-dash-tab="${id}" role="tab">
              <span>${icon}</span> ${label}
            </button>`).join('')}
      </div>

      <div class="dash-pane" id="dashPane"></div>
    </div>
  `;

  const soundBtn = root.querySelector('#dashSoundBtn');
  const paintSound = () => {
    const off = IGSound.muted();
    soundBtn.textContent = off ? '🔇' : '🔊';
    soundBtn.classList.toggle('is-muted', off);
    soundBtn.setAttribute('aria-label', off ? 'Sons desligados' : 'Sons ligados');
  };
  paintSound();
  soundBtn.addEventListener('click', () => {
    IGSound.setMuted(!IGSound.muted());
    paintSound();
    if (!IGSound.muted()) IGSound.stars(2);   // a sample of what was just turned on
  });

  root.querySelectorAll('[data-dash-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      dashTab = btn.dataset.dashTab;
      root.querySelectorAll('[data-dash-tab]').forEach(b => b.classList.toggle('active', b === btn));
      dashPaintPane();
    });
  });

  dashPaintPane();
}

function dashGreeting() {
  const h = new Date().getHours();
  const when = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  // IGCloud.teacher is null in local mode (no Supabase configured, or signed
  // out) — the greeting still has to read naturally then.
  const t = (typeof IGCloud !== 'undefined') ? IGCloud.teacher : null;
  const name = (t && t.name) ? String(t.name).split(' ')[0] : '';
  return name ? `${when}, ${name}!` : `${when}!`;
}

function dashTodayLabel(today) {
  const day = DASH_DAYS.find(d => d.dow === today.getDay());
  const label = day ? day.long : 'Domingo';
  return `${label}, ${today.getDate()} de ${DASH_MONTHS[today.getMonth()]} de ${today.getFullYear()}`;
}

function dashStatCard(icon, value, label, tone) {
  return `
    <div class="dash-stat dash-stat--${tone}">
      <span class="dash-stat-icon">${icon}</span>
      <div>
        <strong>${igEscapeHtml(String(value))}</strong>
        <span>${igEscapeHtml(label)}</span>
      </div>
    </div>
  `;
}

function dashPaintPane() {
  const pane = document.getElementById('dashPane');
  if (!pane) return;
  if (dashTab === 'week') dashPaintWeek(pane);
  else if (dashTab === 'month') dashPaintMonth(pane);
  else dashPaintMoney(pane);
}

// ---------------------------------------------------------------------------
// 📅 WEEK
// ---------------------------------------------------------------------------
function dashPaintWeek(pane) {
  const students = loadStudents();
  const start = dashWeekStart(dashWeekAnchor);
  const todayKey = dashKey(dashToday());

  const columns = DASH_DAYS.map((day, i) => {
    const date = dashAddDays(start, i);
    const key = dashKey(date);
    const list = students.filter(s => dashScheduleFor(s.id).days.includes(day.id));
    list.sort((a, b) => (dashScheduleFor(a.id).time || '99').localeCompare(dashScheduleFor(b.id).time || '99'));
    return { day, date, key, list };
  });

  const totalClasses = columns.reduce((n, c) => n + c.list.length, 0);
  const totalPrepped = columns.reduce((n, c) => n + c.list.filter(s => dashIsPrepped(s.id, c.key)).length, 0);
  const noSchedule = students.filter(s => !dashScheduleFor(s.id).days.length);

  pane.innerHTML = `
    <div class="dash-pane-head">
      <div class="dash-nav">
        <button class="dash-nav-btn" data-week="-1" type="button" aria-label="Semana anterior">←</button>
        <span class="dash-nav-label">${igEscapeHtml(dashWeekLabel(start))}</span>
        <button class="dash-nav-btn" data-week="1" type="button" aria-label="Próxima semana">→</button>
        <button class="dash-nav-today" data-week="0" type="button">Hoje</button>
      </div>
      <div class="dash-pane-actions">
        <span class="dash-pill">${totalPrepped}/${totalClasses} preparadas</span>
        <button class="game-btn secondary" id="dashEditSchedule" type="button">⚙️ Horários &amp; valores</button>
      </div>
    </div>

    ${totalClasses === 0 ? `
      <div class="dash-empty">
        <span>🗓️</span>
        <p><strong>Nenhum aluno tem horário ainda.</strong><br/>
           Clique em <em>⚙️ Horários &amp; valores</em> e diga quantas vezes por semana cada aluno estuda.</p>
      </div>
    ` : `
      <div class="dash-week">
        ${columns.map(c => `
          <div class="dash-day ${c.key === todayKey ? 'is-today' : ''}">
            <div class="dash-day-head">
              <span class="dash-day-name">${c.day.short}</span>
              <span class="dash-day-num">${c.date.getDate()}</span>
            </div>
            <div class="dash-day-body">
              ${c.list.length === 0 ? '<p class="dash-day-empty">—</p>' : c.list.map(s => {
                const sched = dashScheduleFor(s.id);
                const done = dashIsPrepped(s.id, c.key);
                return `
                  <div class="dash-class ${done ? 'is-prepped' : ''}" style="--who:${igEscapeHtml(s.color || '#8e6d86')}">
                    <button class="dash-class-main" data-open-student="${igEscapeHtml(s.id)}" type="button">
                      <span class="dash-class-avatar">${igEscapeHtml(s.avatar || '🙂')}</span>
                      <span class="dash-class-text">
                        <span class="dash-class-name">${igEscapeHtml(s.name)}</span>
                        <span class="dash-class-meta">${sched.time ? igEscapeHtml(sched.time) + ' · ' : ''}${igEscapeHtml(s.levelLabel || '')}</span>
                      </span>
                    </button>
                    <label class="dash-check" title="Marcar como preparada">
                      <input type="checkbox" data-prep="${igEscapeHtml(s.id)}" data-date="${c.key}" ${done ? 'checked' : ''} />
                      <span>${done ? '✓ pronta' : 'preparar'}</span>
                    </label>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `}

    ${noSchedule.length ? `
      <p class="dash-note">Sem horário definido: ${noSchedule.map(s => igEscapeHtml(s.name)).join(', ')}</p>
    ` : ''}
  `;

  pane.querySelectorAll('[data-week]').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = Number(btn.dataset.week);
      dashWeekAnchor = step === 0 ? dashToday() : dashAddDays(dashWeekAnchor, step * 7);
      dashPaintWeek(pane);
    });
  });

  pane.querySelectorAll('[data-prep]').forEach(box => {
    box.addEventListener('change', () => {
      dashSetPrepped(box.dataset.prep, box.dataset.date, box.checked);
      dashPaintWeek(pane);
      renderDashboardStatsOnly();
    });
  });

  pane.querySelectorAll('[data-open-student]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Clicking a class makes that student active and opens the lesson
      // drawer — the same thing the teacher would do by hand next.
      setActiveStudentId(btn.dataset.openStudent);
      if (typeof refreshHeaderForActiveStudent === 'function') refreshHeaderForActiveStudent();
      if (typeof refreshSessionDrawerIfOpen === 'function') refreshSessionDrawerIfOpen();
      if (typeof openSessionDrawer === 'function') openSessionDrawer();
    });
  });

  const scheduleBtn = pane.querySelector('#dashEditSchedule');
  if (scheduleBtn) scheduleBtn.addEventListener('click', dashOpenScheduleEditor);
}

function dashWeekLabel(start) {
  const end = dashAddDays(start, 5);
  const sameMonth = start.getMonth() === end.getMonth();
  const a = `${start.getDate()} ${DASH_MONTHS[start.getMonth()].slice(0, 3)}`;
  const b = sameMonth ? `${end.getDate()}` : `${end.getDate()} ${DASH_MONTHS[end.getMonth()].slice(0, 3)}`;
  return `${a} – ${b}`;
}

// Rewrites just the four headline numbers. Ticking a checkbox or marking a
// payment changes them, but re-running renderDashboard() would rebuild the
// pane underneath the teacher's finger and need a scroll-position hack to
// hide it — so this touches nothing but the .dash-stats row.
function renderDashboardStatsOnly() {
  const root = document.getElementById('teacherDashboard');
  const strip = root && root.querySelector('.dash-stats');
  if (!strip) return;
  strip.innerHTML = dashStatCardsHTML();
}

function dashStatCardsHTML() {
  const students = loadStudents();
  const today = dashToday();
  const todayKey = dashKey(today);
  const todayDow = DASH_DAYS.find(d => d.dow === today.getDay());

  const todays = todayDow
    ? students.filter(s => dashScheduleFor(s.id).days.includes(todayDow.id))
    : [];
  const prepped = todays.filter(s => dashIsPrepped(s.id, todayKey)).length;

  const monthKey = dashMonthKey(today);
  const rates = students.map(s => dashMonthStats(s, monthKey)).filter(r => r.rate !== null);
  const avgRate = rates.length ? Math.round(rates.reduce((a, r) => a + r.rate, 0) / rates.length) : null;

  const due = students.reduce((sum, s) => {
    const fee = dashScheduleFor(s.id).fee;
    return sum + (dashPaymentFor(s.id, monthKey).paid ? 0 : fee);
  }, 0);

  return [
    dashStatCard('\u{1F4C5}', todays.length, todays.length === 1 ? 'aula hoje' : 'aulas hoje', 'a'),
    dashStatCard('✅', `${prepped}/${todays.length}`, 'preparadas', 'b'),
    dashStatCard('\u{1F4CA}', avgRate === null ? '—' : avgRate + '%', 'presença no mês', 'c'),
    dashStatCard('\u{1F4B0}', dashMoney(due), 'a receber', 'd'),
  ].join('');
}

// ---------------------------------------------------------------------------
// ⚙️ SCHEDULE EDITOR
// ---------------------------------------------------------------------------
function dashOpenScheduleEditor() {
  const students = loadStudents();

  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">⚙️</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Horários &amp; valores</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">Quantas vezes por semana cada aluno estuda, e quanto paga por mês</span></p>
        </div>
      </div>
      <div class="sched-head">
        <span>Aluno</span><span>Dias da semana</span><span>Hora</span><span>Mensalidade</span>
      </div>
      <div class="sched-rows">
        ${students.map(s => {
          const sc = dashScheduleFor(s.id);
          return `
            <div class="sched-row" data-student="${igEscapeHtml(s.id)}">
              <div class="sched-who">
                <span class="sched-avatar" style="background:${igEscapeHtml(s.color || '#8e6d86')}22">${igEscapeHtml(s.avatar || '🙂')}</span>
                <div>
                  <strong>${igEscapeHtml(s.name)}</strong>
                  <span>${igEscapeHtml(s.levelLabel || '')}</span>
                </div>
              </div>
              <div class="sched-days">
                ${DASH_DAYS.map(d => `
                  <button class="sched-day ${sc.days.includes(d.id) ? 'on' : ''}" type="button"
                          data-day="${d.id}" title="${d.long}">${d.short}</button>
                `).join('')}
              </div>
              <input class="gm-input sched-time" type="time" data-f="time" value="${igEscapeHtml(sc.time)}" />
              <input class="gm-input sched-fee" type="number" min="0" step="10" data-f="fee"
                     placeholder="0" value="${sc.fee || ''}" />
            </div>
          `;
        }).join('')}
      </div>
      <p class="ce-hint">Marque um dia para 1x por semana, dois dias para 2x, e assim por diante —
        o planejamento da semana se monta sozinho a partir daqui.</p>
      <div class="game-btn-row" style="margin-top:16px">
        <button class="btn btn-primary" id="schedSave">💾 Salvar</button>
        <button class="game-btn secondary" id="schedCancel">Cancelar</button>
      </div>
    </div>
  `, true);

  document.querySelectorAll('.sched-day').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('on'));
  });

  document.getElementById('schedCancel').addEventListener('click', closeModal);
  document.getElementById('schedSave').addEventListener('click', () => {
    document.querySelectorAll('.sched-row').forEach(row => {
      dashSaveSchedule(row.dataset.student, {
        days: [...row.querySelectorAll('.sched-day.on')].map(b => b.dataset.day),
        time: row.querySelector('[data-f="time"]').value,
        fee: Number(row.querySelector('[data-f="fee"]').value) || 0,
      });
    });
    closeModal();
    renderDashboard();
  });
}

// ---------------------------------------------------------------------------
// 📊 MONTH — attendance
// ---------------------------------------------------------------------------
function dashPaintMonth(pane) {
  const students = loadStudents();
  const monthKey = dashMonthKey(dashMonthAnchor);
  const todayKey = dashKey(dashToday());

  const rows = students.map(s => {
    const dates = dashScheduledDatesInMonth(s.id, monthKey);
    const byDate = dashSessionsByDate(s.id);
    // A class the teacher logged on an unscheduled day still counts — she
    // moved the lesson, and the record is the truth.
    Object.keys(byDate).forEach(d => { if (d.startsWith(monthKey) && !dates.includes(d)) dates.push(d); });
    dates.sort();
    return { student: s, dates, byDate, stats: dashMonthStats(s, monthKey) };
  });

  const anyData = rows.some(r => r.dates.length);

  pane.innerHTML = `
    <div class="dash-pane-head">
      <div class="dash-nav">
        <button class="dash-nav-btn" data-month="-1" type="button" aria-label="Mês anterior">←</button>
        <span class="dash-nav-label">${DASH_MONTHS[dashMonthAnchor.getMonth()]} ${dashMonthAnchor.getFullYear()}</span>
        <button class="dash-nav-btn" data-month="1" type="button" aria-label="Próximo mês">→</button>
        <button class="dash-nav-today" data-month="0" type="button">Hoje</button>
      </div>
      <div class="dash-legend">
        <span><i class="att att--yes"></i> presente</span>
        <span><i class="att att--no"></i> falta</span>
        <span><i class="att att--none"></i> sem registro</span>
      </div>
    </div>

    ${!anyData ? `
      <div class="dash-empty">
        <span>📊</span>
        <p><strong>Nada registrado neste mês ainda.</strong><br/>
           A presença vem sozinha do <em>Today's Class</em> — cada aula que você salva aparece aqui.</p>
      </div>
    ` : `
      <div class="dash-scroll">
        <table class="att-table">
          <thead>
            <tr>
              <th class="att-name">Aluno</th>
              <th>Aulas</th>
              <th>Presenças</th>
              <th>Faltas</th>
              <th>%</th>
              <th class="att-days">Dias do mês</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td class="att-name">
                  <span class="att-avatar" style="background:${igEscapeHtml(r.student.color || '#8e6d86')}22">${igEscapeHtml(r.student.avatar || '🙂')}</span>
                  ${igEscapeHtml(r.student.name)}
                </td>
                <td>${r.stats.total}</td>
                <td class="att-yes">${r.stats.present}</td>
                <td class="att-no">${r.stats.absent}</td>
                <td>${dashRateBadge(r.stats.rate)}</td>
                <td class="att-days">
                  ${r.dates.length === 0 ? '<span class="att-none-text">—</span>' : r.dates.map(d => {
                    const rec = r.byDate[d];
                    const state = !rec ? 'none' : (rec.present ? 'yes' : 'no');
                    const future = d > todayKey;
                    const title = `${dashDate(d).getDate()}/${dashDate(d).getMonth() + 1} — ` +
                      (!rec ? (future ? 'ainda vai acontecer' : 'sem registro') : (rec.present ? 'presente' : 'falta'));
                    return `<span class="att att--${state} ${future ? 'att--future' : ''}" title="${igEscapeHtml(title)}">${dashDate(d).getDate()}</span>`;
                  }).join('')}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;

  pane.querySelectorAll('[data-month]').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = Number(btn.dataset.month);
      if (step === 0) dashMonthAnchor = dashToday();
      else {
        const d = new Date(dashMonthAnchor);
        d.setDate(1);
        d.setMonth(d.getMonth() + step);
        dashMonthAnchor = d;
      }
      dashPaintMonth(pane);
    });
  });
}

function dashRateBadge(rate) {
  if (rate === null) return '<span class="rate rate--none">—</span>';
  const tone = rate >= 90 ? 'good' : rate >= 70 ? 'ok' : 'low';
  return `<span class="rate rate--${tone}">${rate}%</span>`;
}

// ---------------------------------------------------------------------------
// 💰 MONEY
// ---------------------------------------------------------------------------
function dashPaintMoney(pane) {
  const students = loadStudents();
  const monthKey = dashMonthKey(dashMonthAnchor);
  const monthLabel = `${DASH_MONTHS[dashMonthAnchor.getMonth()]} ${dashMonthAnchor.getFullYear()}`;

  const rows = students.map(s => {
    const fee = dashScheduleFor(s.id).fee;
    const pay = dashPaymentFor(s.id, monthKey);
    return { student: s, fee, pay, amount: pay.amount || fee };
  });

  const received = rows.filter(r => r.pay.paid).reduce((a, r) => a + r.amount, 0);
  const pending = rows.filter(r => !r.pay.paid).reduce((a, r) => a + r.fee, 0);
  const expenses = dashExpenses().filter(e => e.month === monthKey);
  const spent = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const balance = received - spent;

  pane.innerHTML = `
    <div class="dash-pane-head">
      <div class="dash-nav">
        <button class="dash-nav-btn" data-fmonth="-1" type="button" aria-label="Mês anterior">←</button>
        <span class="dash-nav-label">${igEscapeHtml(monthLabel)}</span>
        <button class="dash-nav-btn" data-fmonth="1" type="button" aria-label="Próximo mês">→</button>
        <button class="dash-nav-today" data-fmonth="0" type="button">Hoje</button>
      </div>
    </div>

    <div class="money-summary">
      ${dashMoneyCard('in', '↑', 'Recebido', dashMoney(received))}
      ${dashMoneyCard('pending', '⏳', 'A receber', dashMoney(pending))}
      ${dashMoneyCard('out', '↓', 'Despesas', dashMoney(spent))}
      ${dashMoneyCard(balance >= 0 ? 'balance' : 'negative', balance >= 0 ? '💚' : '⚠️', 'Saldo', dashMoney(balance))}
    </div>

    <div class="money-grid">
      <section class="money-col">
        <h4 class="money-h">🧾 Mensalidades — ${igEscapeHtml(monthLabel)}</h4>
        ${rows.length === 0 ? '<p class="dash-note">Nenhum aluno cadastrado.</p>' : `
          <div class="pay-rows">
            ${rows.map(r => `
              <div class="pay-row ${r.pay.paid ? 'is-paid' : ''}">
                <span class="pay-avatar" style="background:${igEscapeHtml(r.student.color || '#8e6d86')}22">${igEscapeHtml(r.student.avatar || '🙂')}</span>
                <div class="pay-who">
                  <strong>${igEscapeHtml(r.student.name)}</strong>
                  <span>${r.fee ? dashMoney(r.fee) + ' / mês' : 'sem mensalidade definida'}</span>
                </div>
                <input class="gm-input pay-amount" type="number" min="0" step="10"
                       data-pay-amount="${igEscapeHtml(r.student.id)}"
                       placeholder="${r.fee || 0}" value="${r.pay.amount || ''}" title="Valor pago" />
                <button class="pay-toggle ${r.pay.paid ? 'on' : ''}" type="button"
                        data-pay-toggle="${igEscapeHtml(r.student.id)}">
                  ${r.pay.paid ? '✓ pago' : 'marcar pago'}
                </button>
              </div>
            `).join('')}
          </div>
          <p class="ce-hint">Deixe o valor em branco para usar a mensalidade do aluno
            (que você define em <em>⚙️ Horários &amp; valores</em>).</p>
        `}
      </section>

      <section class="money-col">
        <h4 class="money-h">💳 Despesas da escola</h4>
        <div class="exp-add">
          <div class="exp-presets">
            ${DASH_EXPENSE_PRESETS.map(pr => `
              <button class="exp-preset" type="button" data-preset="${igEscapeHtml(pr.name)}">${pr.emoji} ${igEscapeHtml(pr.name)}</button>
            `).join('')}
          </div>
          <div class="exp-fields">
            <input class="gm-input" id="expName" type="text" placeholder="Nome (ex.: Zoom)" />
            <input class="gm-input" id="expAmount" type="number" min="0" step="1" placeholder="Valor" />
            <button class="game-btn" id="expAdd" type="button">+ Adicionar</button>
          </div>
          <p class="gm-form-error" id="expError" hidden></p>
        </div>

        ${expenses.length === 0 ? '<p class="dash-note">Nada lançado neste mês.</p>' : `
          <div class="exp-rows">
            ${expenses.map(e => `
              <div class="exp-row">
                <span class="exp-name">${igEscapeHtml(e.name)}</span>
                <span class="exp-amount">${dashMoney(e.amount)}</span>
                <button class="gm-remove-row" type="button" data-exp-remove="${igEscapeHtml(e.id)}" aria-label="Remover">✕</button>
              </div>
            `).join('')}
            <div class="exp-row exp-total">
              <span class="exp-name">Total</span>
              <span class="exp-amount">${dashMoney(spent)}</span>
              <span></span>
            </div>
          </div>
        `}
      </section>
    </div>
  `;

  pane.querySelectorAll('[data-fmonth]').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = Number(btn.dataset.fmonth);
      if (step === 0) dashMonthAnchor = dashToday();
      else {
        const d = new Date(dashMonthAnchor);
        d.setDate(1);
        d.setMonth(d.getMonth() + step);
        dashMonthAnchor = d;
      }
      dashPaintMoney(pane);
    });
  });

  pane.querySelectorAll('[data-pay-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.payToggle;
      const current = dashPaymentFor(sid, monthKey);
      const fee = dashScheduleFor(sid).fee;
      dashSavePayment(sid, monthKey, {
        paid: !current.paid,
        amount: current.amount || fee,
        on: current.paid ? '' : dashKey(dashToday()),
      });
      dashPaintMoney(pane);
      renderDashboardStatsOnly();
    });
  });

  pane.querySelectorAll('[data-pay-amount]').forEach(input => {
    input.addEventListener('change', () => {
      const sid = input.dataset.payAmount;
      dashSavePayment(sid, monthKey, { amount: Number(input.value) || 0 });
      dashPaintMoney(pane);
      renderDashboardStatsOnly();
    });
  });

  pane.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('expName').value = btn.dataset.preset;
      document.getElementById('expAmount').focus();
    });
  });

  const addExpense = () => {
    const name = document.getElementById('expName').value.trim();
    const amount = Number(document.getElementById('expAmount').value);
    const err = document.getElementById('expError');
    err.hidden = true;
    if (!name) { err.textContent = 'Dê um nome à despesa.'; err.hidden = false; return; }
    if (!(amount > 0)) { err.textContent = 'Informe um valor maior que zero.'; err.hidden = false; return; }
    const list = dashExpenses();
    list.push({ id: 'e' + Date.now().toString(36), name, amount, month: monthKey });
    dashSaveExpenses(list);
    dashPaintMoney(pane);
    renderDashboardStatsOnly();
  };
  pane.querySelector('#expAdd').addEventListener('click', addExpense);
  pane.querySelector('#expAmount').addEventListener('keydown', e => { if (e.key === 'Enter') addExpense(); });

  pane.querySelectorAll('[data-exp-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      dashSaveExpenses(dashExpenses().filter(e => e.id !== btn.dataset.expRemove));
      dashPaintMoney(pane);
      renderDashboardStatsOnly();
    });
  });
}

function dashMoneyCard(tone, icon, label, value) {
  return `
    <div class="money-card money-card--${tone}">
      <span class="money-card-icon">${icon}</span>
      <span class="money-card-label">${igEscapeHtml(label)}</span>
      <strong class="money-card-value">${igEscapeHtml(value)}</strong>
    </div>
  `;
}
