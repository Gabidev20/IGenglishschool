/* ==========================================================================
   IGenglishschool — "Hoje" (the day at a glance)
   --------------------------------------------------------------------------
   The top of the teacher's page, in the look of the school's other tools:
     • greeting and date;
     • today's classes on a timeline (8h–22h), with a "now" line, the next
       class, how many were already logged, and a button to log the next one;
     • four numbers: active students, groups and one-to-one students, classes
       logged this month, school fees still open;
     • "Pra resolver": students with no class logged for a while, open fees,
       today's classes not prepared, texts to correct, unread messages;
     • "Últimos registros": the latest class logs.

   READ ONLY. Everything comes from what the site already keeps:
   student_schedules / lesson_prep / finance_payments (dashboard.js),
   sessions_<id> (sessions.js), the writing inbox (skills.js, inbox.js).
   Buttons only open what already exists (Today's Class, the week, the money
   tab, the writing desk, the inbox). Loaded after dashboard.js.
   ========================================================================== */

const TD_FIRST_HOUR = 8;
const TD_LAST_HOUR = 22;
const TD_CLASS_MIN = 60;          // schedules have a start time only
const TD_STALE_DAYS = 10;         // "sem registro há N dias" from this many days
const TD_FEE_FROM_DAY = 10;       // open fees are flagged from this day of the month
const TD_TODO_SHOWN = 6;          // the most urgent first; the rest as "e mais N"
const TD_WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const TD_MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const tdEsc = s => igEscapeHtml(String(s == null ? '' : s));
const tdMinutes = hhmm => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const tdDaysBetween = (fromKey, toDate) => Math.round((toDate - dashDate(fromKey)) / 864e5);

// A group's members are students of their own but their classes are logged
// on the group: they are counted as students, never as classes.
function tdIsMember(s) { return typeof studentGroupId === 'function' && Boolean(studentGroupId(s.id)); }
function tdIsGroup(s) { return typeof isGroupStudent === 'function' && isGroupStudent(s.id); }
function tdLastSession(studentId) {
  const list = loadSessions(studentId).filter(x => x && x.date);
  if (!list.length) return null;
  return list.reduce((a, b) => (b.date > a.date || (b.date === a.date && (b.createdAt || 0) > (a.createdAt || 0)) ? b : a));
}

function tdData() {
  const students = loadStudents();
  const today = dashToday();
  const todayKey = dashKey(today);
  const monthKey = dashMonthKey(today);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dow = DASH_DAYS.find(d => d.dow === today.getDay());

  // Today's classes, by start time.
  const todays = typeof agClassesOn === 'function' ? agClassesOn(todayKey)
    : (dow ? students.filter(s => dashScheduleFor(s.id).days.includes(dow.id)) : []).map(s => ({ s, time: dashScheduleFor(s.id).time, dur: TD_CLASS_MIN }));
  const classes = todays
    .map(c => {
      const s = c.s;
      const start = tdMinutes(c.time);
      return { s, start, time: c.time, dur: c.dur || TD_CLASS_MIN, logged: Boolean(dashSessionsByDate(s.id)[todayKey]), prepped: dashIsPrepped(s.id, todayKey) };
    })
    .sort((a, b) => (a.start == null) - (b.start == null) || (a.start || 0) - (b.start || 0));
  const next = classes.find(c => c.start != null && c.start + c.dur > nowMin && !c.logged)
    || classes.find(c => !c.logged) || null;

  // Who is "active": a schedule, or a class in the last 30 days (their own or their group's).
  const classesOf = s => loadSessions(tdIsMember(s) ? studentGroupId(s.id) : s.id);
  const recent = s => classesOf(s).some(x => x && x.date && tdDaysBetween(x.date, today) <= 30);
  const hasSchedule = s => dashScheduleFor(s.id).days.length > 0;
  const people = students.filter(s => !tdIsGroup(s) && (hasSchedule(s) || recent(s)));
  const units = students.filter(s => !tdIsMember(s) && (hasSchedule(s) || recent(s)));
  const loggedThisMonth = students.filter(s => !tdIsMember(s))
    .reduce((n, s) => n + loadSessions(s.id).filter(x => x && String(x.date || '').startsWith(monthKey)).length, 0);
  const openFees = students.filter(s => dashScheduleFor(s.id).fee > 0 && !dashPaymentFor(s.id, monthKey).paid);

  // Pra resolver
  const todo = [];
  students.filter(s => !tdIsMember(s)).forEach(s => {
    const last = tdLastSession(s.id);
    if (!last) return;
    const days = tdDaysBetween(last.date, today);
    if (days >= TD_STALE_DAYS) {
      const d = dashDate(last.date);
      todo.push({ tone: 'plum', sort: 1, id: s.id, kind: 'log', text: `${s.name} sem registro há ${days} dias`, sub: `Última aula em ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, btn: 'Registrar' });
    }
  });
  if (today.getDate() >= TD_FEE_FROM_DAY) {
    openFees.forEach(s => todo.push({ tone: 'coral', sort: 2, id: s.id, kind: 'fee', text: `Mensalidade de ${s.name} em aberto`, sub: `${dashMoney(dashScheduleFor(s.id).fee)} · ${DASH_MONTHS[today.getMonth()]}`, btn: 'Ver' }));
  }
  classes.filter(c => !c.prepped && !c.logged && c.start != null && c.start >= nowMin)
    .forEach(c => todo.push({ tone: 'gold', sort: 0, id: c.s.id, kind: 'prep', text: `Aula de ${c.s.name} às ${c.time} ainda não preparada`, sub: 'Hoje', btn: 'Ver a semana' }));
  const toCorrect = typeof skAllSubmissions === 'function'
    ? skAllSubmissions().filter(w => !w.audio && w.promptId !== 'chat' && !(w.correction && (w.correction.text || w.correction.note || w.correction.audio))).length : 0;
  if (toCorrect) todo.push({ tone: 'plum', sort: 3, kind: 'desk', text: `${toCorrect} ${toCorrect === 1 ? 'texto esperando' : 'textos esperando'} correção`, sub: 'Writing dos alunos', btn: 'Corrigir' });
  const unread = typeof inboxUnread === 'function' ? inboxUnread() : 0;
  if (unread) todo.push({ tone: 'coral', sort: 3, kind: 'inbox', text: `${unread} ${unread === 1 ? 'mensagem nova' : 'mensagens novas'} de alunos`, sub: 'Mensagens dos alunos', btn: 'Abrir' });
  todo.sort((a, b) => a.sort - b.sort);

  // Últimos registros
  const logs = students.filter(s => !tdIsMember(s))
    .flatMap(s => loadSessions(s.id).filter(x => x && x.date).map(x => ({ s, x })))
    .sort((a, b) => (b.x.date > a.x.date ? 1 : b.x.date < a.x.date ? -1 : (b.x.createdAt || 0) - (a.x.createdAt || 0)))
    .slice(0, 5);

  return { today, nowMin, classes, next, people, units, loggedThisMonth, openFees, todo, logs };
}

function tdGreeting() {
  const h = new Date().getHours();
  const when = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const t = typeof IGCloud !== 'undefined' ? IGCloud.teacher : null;
  const name = t && t.name ? String(t.name).replace(/^teacher\s+/i, '').split(' ')[0] : '';
  return name ? `${when}, ${name.charAt(0).toUpperCase()}${name.slice(1)}` : when;
}

function tdTimelineHTML(d) {
  const timed = d.classes.filter(c => c.start != null);
  const first = Math.min(TD_FIRST_HOUR, ...timed.map(c => Math.floor(c.start / 60)));
  const last = Math.max(TD_LAST_HOUR, ...timed.map(c => Math.ceil((c.start + (c.dur || TD_CLASS_MIN)) / 60)));
  const span = (last - first) * 60;
  const pos = min => ((min - first * 60) / span) * 100;
  const hours = [];
  for (let h = first; h <= last; h += 2) hours.push(h);
  const nowIn = d.nowMin >= first * 60 && d.nowMin <= last * 60;
  // Classes that overlap in time (14:30 and 15:00) go on rows of their own
  // instead of on top of each other: lane = its row, lanes = rows in its group.
  const lane = new Map(), lanes = new Map();
  let group = [], groupEnd = -1, rowsEnd = [];
  const closeGroup = () => { const n = Math.max(1, rowsEnd.length); group.forEach(c => lanes.set(c, n)); group = []; rowsEnd = []; };
  timed.slice().sort((a, b) => a.start - b.start).forEach(c => {
    if (c.start >= groupEnd) closeGroup();
    let row = rowsEnd.findIndex(end => end <= c.start);
    if (row === -1) { row = rowsEnd.length; rowsEnd.push(0); }
    rowsEnd[row] = c.start + (c.dur || TD_CLASS_MIN);
    lane.set(c, row); group.push(c);
    groupEnd = Math.max(groupEnd, c.start + (c.dur || TD_CLASS_MIN));
  });
  closeGroup();
  return `
    <div class="td-track">
      ${nowIn ? `<span class="td-now" style="left:${pos(d.nowMin).toFixed(2)}%"><i>agora</i></span>` : ''}
      ${timed.map(c => `
        <button type="button" class="td-class${c === d.next ? ' is-next' : ''}${c.logged ? ' is-logged' : ''}${lanes.get(c) > 1 ? ' td-class--lane' : ''}"
                style="left:${pos(c.start).toFixed(2)}%;width:${(((c.dur || TD_CLASS_MIN) / span) * 100).toFixed(2)}%;--lane:${lane.get(c) || 0};--lanes:${lanes.get(c) || 1}"
                data-td-open="${tdEsc(c.s.id)}" title="${tdEsc(`${c.time} · ${c.s.name}`)}">
          <b>${tdEsc(c.time)}</b>
          <span>${tdEsc(c.s.name)}</span>
          <small>${c.logged ? '✓ registrada' : tdEsc(typeof igLevelText === 'function' ? igLevelText(c.s).split(' · ')[0] : '')}</small>
        </button>`).join('')}
    </div>
    <div class="td-axis">${hours.map(h => `<span style="left:${pos(h * 60).toFixed(2)}%">${h}h</span>`).join('')}</div>`;
}

function renderToday() {
  const root = document.getElementById('todayRoot');
  if (!root || typeof loadStudents !== 'function' || typeof dashToday !== 'function') return;
  const d = tdData();
  const n = d.classes.length;
  const logged = d.classes.filter(c => c.logged).length;
  const dateLabel = `${TD_WEEKDAYS[d.today.getDay()]}, ${d.today.getDate()} de ${TD_MONTHS[d.today.getMonth()]}`;
  const monthName = TD_MONTHS[d.today.getMonth()];

  root.innerHTML = `
    <div class="td">
      <p class="td-date">${tdEsc(dateLabel)}</p>
      <h2 class="td-hello">${tdEsc(tdGreeting())}</h2>

      <div class="td-day">
        <div class="td-day-top">
          <h3>${n ? `${n} ${n === 1 ? 'aula' : 'aulas'} hoje` : 'Nenhuma aula hoje'}</h3>
          ${d.next ? `<p>Próxima: ${tdEsc(d.next.s.name)}${d.next.time ? ` às ${tdEsc(d.next.time)}` : ''}</p>` : n ? '<p>Todas registradas ✓</p>' : ''}
        </div>
        ${n ? tdTimelineHTML(d) : `
          <p class="td-empty">As aulas aparecem aqui quando os alunos têm dia e horário em <b>Horários &amp; valores</b> (Painel → Semana).</p>`}
        <div class="td-day-foot">
          <span>${n ? `<b>${logged} de ${n}</b> ${n === 1 ? 'registrada' : 'registradas'}` : ''}</span>
          <div class="td-actions">
            ${d.next ? `<button type="button" class="td-btn td-btn--coral" data-td-log="${tdEsc(d.next.s.id)}">✎ Registrar ${tdEsc(d.next.s.name)}</button>` : ''}
            <button type="button" class="td-btn td-btn--ghost" data-td-week>Ver a semana</button>
          </div>
        </div>
      </div>

      <div class="td-stats">
        <span><b>${d.people.length}</b> ${d.people.length === 1 ? 'aluno ativo' : 'alunos ativos'}</span>
        <span><b>${d.units.length}</b> turmas e individuais</span>
        <span><b>${d.loggedThisMonth}</b> ${d.loggedThisMonth === 1 ? 'aula registrada' : 'aulas registradas'} em ${tdEsc(monthName)}</span>
        <span><b>${d.openFees.length}</b> ${d.openFees.length === 1 ? 'mensalidade em aberto' : 'mensalidades em aberto'}</span>
      </div>

      <div class="td-grid">
        <section class="td-card">
          <h3>Pra resolver</h3>
          <p class="td-card-sub">Registros parados, mensalidades, aulas sem preparo, textos e mensagens</p>
          ${d.todo.length ? `<ul class="td-list">${d.todo.slice(0, TD_TODO_SHOWN).map((t, i) => `
            <li class="td-todo td-todo--${t.tone}">
              <div><b>${tdEsc(t.text)}</b><small>${tdEsc(t.sub)}</small></div>
              <button type="button" class="td-btn td-btn--ghost-light" data-td-todo="${i}">${tdEsc(t.btn)}</button>
            </li>`).join('')}</ul>${d.todo.length > TD_TODO_SHOWN ? `<p class="td-more">e mais ${d.todo.length - TD_TODO_SHOWN}</p>` : ''}` : '<p class="td-clear">Tudo em dia ✨</p>'}
        </section>
        <section class="td-card">
          <h3>Últimos registros</h3>
          <p class="td-card-sub">O que rolou nas aulas</p>
          ${d.logs.length ? `<ul class="td-list">${d.logs.map(({ s, x }) => {
            const dt = dashDate(x.date);
            return `
            <li class="td-log" data-td-open="${tdEsc(s.id)}">
              <span class="td-log-av" style="background:${tdEsc(s.color || '#8e6d86')}">${tdEsc(s.avatar || '🙂')}</span>
              <div><b>${tdEsc(s.name)}</b><small>${dt.getDate()}/${dt.getMonth() + 1}${x.present === false ? ' · faltou' : ''}</small>
              ${x.topicLabel ? `<span>${tdEsc(x.topicLabel)}</span>` : ''}</div>
            </li>`;
          }).join('')}</ul>` : '<p class="td-clear">Nenhuma aula registrada ainda.</p>'}
        </section>
      </div>
    </div>`;

  // Buttons open what already exists; nothing is saved from here.
  const open = id => { if (typeof selectStudent === 'function') selectStudent(id); };
  // The teacher's panel, on one of its tabs (week, money…).
  const goDash = tabId => {
    const sec = document.getElementById('dashboard');
    const tab = document.querySelector(`[data-dash-tab="${tabId}"]`);
    if (tab) tab.click();
    if (sec) { if (sec.classList.contains('is-collapsed') && typeof setSectionCollapsed === 'function') setSectionCollapsed(sec, false); sec.scrollIntoView({ behavior: 'smooth' }); }
  };
  const goWeek = () => goDash('week');
  const goLive = () => {
    // Live Class hidden by this teacher: the student's shortcuts instead.
    if (typeof igHideLive === 'function' && igHideLive() && typeof openStudentPicker === 'function') { openStudentPicker(true); return; }
    const sec = document.getElementById('live-class');
    if (sec) { if (sec.classList.contains('is-collapsed') && typeof setSectionCollapsed === 'function') setSectionCollapsed(sec, false); sec.scrollIntoView({ behavior: 'smooth' }); }
  };
  root.querySelectorAll('[data-td-open]').forEach(el => el.addEventListener('click', () => { open(el.dataset.tdOpen); goLive(); }));
  root.querySelectorAll('[data-td-log]').forEach(el => el.addEventListener('click', () => {
    open(el.dataset.tdLog);
    if (typeof openSessionDrawer === 'function') openSessionDrawer();
  }));
  root.querySelectorAll('[data-td-week]').forEach(el => el.addEventListener('click', goWeek));
  root.querySelectorAll('[data-td-todo]').forEach(el => el.addEventListener('click', () => {
    const t = d.todo[Number(el.dataset.tdTodo)];
    if (!t) return;
    if (t.kind === 'log') { open(t.id); if (typeof openSessionDrawer === 'function') openSessionDrawer(); }
    else if (t.kind === 'prep') goWeek();
    else if (t.kind === 'fee') goDash('money');
    else if (t.kind === 'desk') { if (typeof openWritingDesk === 'function') openWritingDesk(); }
    else if (t.kind === 'inbox') { const b = document.getElementById('inboxBtn'); if (b) b.click(); }
  }));
}

// Draw once the page is ready, again when data changes (the dashboard redraws
// its numbers on every class, schedule or payment), and every minute so the
// "agora" line and the greeting keep up.
renderToday();
// The teacher's name (for the greeting) arrives a moment after sign-in.
setTimeout(renderToday, 1500);
setTimeout(renderToday, 5000);
setInterval(renderToday, 60 * 1000);
window.addEventListener('focus', renderToday);
