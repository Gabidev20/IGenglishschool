/* ==========================================================================
   IGenglishschool — Agenda (the week, like Google Calendar)

   The fixed schedule stays where it was (dashboard.js 'student_schedules':
   days of the week, a time, the fee) and gains, optionally:
     times: { mon: '18:00', wed: '19:30' }   a time per day
     dur:   60                                minutes
   One-off changes live apart, in 'class_moves', keyed by the class they
   change:  'studentId|2026-11-12' → { date, time, dur } (moved),
            { cancelled: true } (this one class off),
   and extra classes:  'studentId|+id' → { date, time, dur, extra: true }.

   agClassesOn(dateKey) is the one answer to "who has class that day, when":
   Hoje, the week, the student picker, the cockpit and attendance all ask it.

   The week view: hours down the side, Monday–Saturday across. Drag a class
   to move it, pull its bottom edge to change its length — then "Só nesta
   semana" or "Toda semana". Click a class for its card (Today's Class, plan,
   prepared, change, cancel); click an empty slot to add a class.
   The old list of the week is still there ("📋 Lista").
   ========================================================================== */

const AG_MOVES_KEY = 'class_moves';
const AG_VIEW_KEY = 'ig_agenda_view';      // 'grid' | 'list', per computer
const AG_DEFAULT_DUR = 60;
const AG_SNAP = 15;                         // minutes
const AG_HOUR_PX = 56;

// ---------------------------------------------------------------------------
// DATA
// ---------------------------------------------------------------------------
function agMoves() {
  const raw = IGStore.getJSON(AG_MOVES_KEY, null);
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}
function agSaveMoves(m) { IGStore.setJSON(AG_MOVES_KEY, m); }
const agMin = hhmm => { const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const agHHMM = min => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const agDayOf = dateKey => { const d = dashDate(dateKey); return DASH_DAYS.find(x => x.dow === d.getDay()) || null; };
function agDurFor(studentId) { return Number(dashScheduleFor(studentId).dur) || AG_DEFAULT_DUR; }
function agTimeFor(studentId, dayId) {
  const sc = dashScheduleFor(studentId);
  return (sc.times && sc.times[dayId]) || sc.time || '';
}

// Everyone with a class on `dateKey`, by start time:
// [{ s, sid, date, time, start, dur, orig, key, moved, extra }]
function agClassesOn(dateKey) {
  const students = loadStudents();
  const byId = new Map(students.map(s => [s.id, s]));
  const moves = agMoves();
  const day = agDayOf(dateKey);
  const out = [];
  // The weekly classes of that day, unless moved away or cancelled.
  if (day) {
    students.forEach(s => {
      const sc = dashScheduleFor(s.id);
      if (!sc.days.includes(day.id)) return;
      const key = `${s.id}|${dateKey}`;
      const m = moves[key];
      if (m && (m.cancelled || (m.date && m.date !== dateKey))) return;
      const time = (m && m.time) || agTimeFor(s.id, day.id);
      out.push({ s, sid: s.id, date: dateKey, time, start: agMin(time), dur: (m && m.dur) || agDurFor(s.id), orig: dateKey, key, moved: Boolean(m && m.time), extra: false });
    });
  }
  // Classes moved here from another day, and extra classes.
  Object.keys(moves).forEach(key => {
    const m = moves[key];
    if (!m || m.cancelled || m.date !== dateKey) return;
    const [sid, from] = key.split('|');
    const s = byId.get(sid);
    if (!s || from === dateKey) return;
    out.push({ s, sid, date: dateKey, time: m.time || '', start: agMin(m.time), dur: m.dur || agDurFor(sid), orig: m.extra ? null : from, key, moved: !m.extra, extra: Boolean(m.extra) });
  });
  return out.sort((a, b) => (a.start == null) - (b.start == null) || (a.start || 0) - (b.start || 0) || a.s.name.localeCompare(b.s.name));
}

function agMoveOne(key, patch) {
  const m = agMoves();
  m[key] = { ...(m[key] || {}), ...patch };
  delete m[key].cancelled;
  if (patch.cancelled) m[key] = { cancelled: true };
  agSaveMoves(m);
}
function agClearMove(key) { const m = agMoves(); delete m[key]; agSaveMoves(m); }

// "Toda semana": the fixed schedule changes from now on.
function agMoveWeekly(c, toDate, time, dur) {
  const sc = dashScheduleFor(c.sid);
  const fromDay = agDayOf(c.orig || c.date);
  const toDay = agDayOf(toDate);
  if (!toDay) return;
  let days = sc.days.slice();
  const times = { ...(sc.times || {}) };
  if (fromDay && fromDay.id !== toDay.id) {
    days = days.filter(d => d !== fromDay.id);
    delete times[fromDay.id];
  }
  if (!days.includes(toDay.id)) days.push(toDay.id);
  times[toDay.id] = time;
  // One time for every day: keep it simple in the old "Hora" field too.
  const all = days.map(d => times[d] || sc.time);
  const same = all.length && all.every(t => t === all[0]);
  dashSaveSchedule(c.sid, same ? { days, time: all[0], times: {}, dur: dur || sc.dur || AG_DEFAULT_DUR }
    : { days, times, dur: dur || sc.dur || AG_DEFAULT_DUR });
  // This week's one-off change for that class is replaced by the new rule.
  if (c.key && !c.extra) agClearMove(c.key);
}

// ---------------------------------------------------------------------------
// THE WEEK GRID
// ---------------------------------------------------------------------------
function agView() { try { return localStorage.getItem(AG_VIEW_KEY) === 'list' ? 'list' : 'grid'; } catch (e) { return 'grid'; } }
function agSetView(v) { try { localStorage.setItem(AG_VIEW_KEY, v); } catch (e) { /* ignore */ } }

const dashPaintWeekList = dashPaintWeek;
// eslint-disable-next-line no-global-assign
dashPaintWeek = function (pane) {
  if (agView() === 'list') {
    dashPaintWeekList(pane);
    agAddViewSwitch(pane);
    return;
  }
  agPaintGrid(pane);
};

function agSwitchHTML(active) {
  return `<div class="ag-switch" role="group" aria-label="Visualização">
    <button type="button" data-ag-view="grid" class="${active === 'grid' ? 'on' : ''}">🗓️ Agenda</button>
    <button type="button" data-ag-view="list" class="${active === 'list' ? 'on' : ''}">📋 Lista</button>
  </div>`;
}
function agWireSwitch(pane) {
  pane.querySelectorAll('[data-ag-view]').forEach(b => b.addEventListener('click', () => { agSetView(b.dataset.agView); dashPaintWeek(pane); }));
}
function agAddViewSwitch(pane) {
  const actions = pane.querySelector('.dash-pane-actions');
  if (actions && !actions.querySelector('.ag-switch')) {
    actions.insertAdjacentHTML('afterbegin', agSwitchHTML('list'));
    agWireSwitch(pane);
  }
}

// Classes that overlap share the column width, side by side.
function agLanes(list) {
  const timed = list.filter(c => c.start != null).sort((a, b) => a.start - b.start);
  const lanes = new Map();
  let group = [];
  let groupEnd = -1;
  const flush = () => { const n = Math.max(1, ...group.map(c => lanes.get(c).lane + 1)); group.forEach(c => { lanes.get(c).of = n; }); group = []; };
  timed.forEach(c => {
    if (c.start >= groupEnd && group.length) flush();
    const used = new Set(group.filter(g => g.start + g.dur > c.start).map(g => lanes.get(g).lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    lanes.set(c, { lane, of: 1 });
    group.push(c);
    groupEnd = Math.max(groupEnd, c.start + c.dur);
  });
  if (group.length) flush();
  return lanes;
}

function agPaintGrid(pane) {
  const start = dashWeekStart(dashWeekAnchor);
  const todayKey = dashKey(dashToday());
  const cols = DASH_DAYS.map((day, i) => {
    const date = dashAddDays(start, i);
    const key = dashKey(date);
    return { day, date, key, list: agClassesOn(key) };
  });
  const all = cols.flatMap(c => c.list);
  const timed = all.filter(c => c.start != null);
  const firstH = Math.max(0, Math.min(7, ...timed.map(c => Math.floor(c.start / 60))));
  const lastH = Math.min(24, Math.max(21, ...timed.map(c => Math.ceil((c.start + c.dur) / 60))));
  const hours = [];
  for (let h = firstH; h < lastH; h++) hours.push(h);
  const top = min => ((min - firstH * 60) / 60) * AG_HOUR_PX;
  const prepped = all.filter(c => dashIsPrepped(c.sid, c.date)).length;
  const untimed = all.filter(c => c.start == null);
  const noSchedule = loadStudents().filter(s => !dashScheduleFor(s.id).days.length);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  pane.innerHTML = `
    <div class="dash-pane-head">
      <div class="dash-nav">
        <button class="dash-nav-btn" data-week="-1" type="button" aria-label="Semana anterior">←</button>
        <span class="dash-nav-label">${igEscapeHtml(dashWeekLabel(start))}</span>
        <button class="dash-nav-btn" data-week="1" type="button" aria-label="Próxima semana">→</button>
        <button class="dash-nav-today" data-week="0" type="button">Hoje</button>
      </div>
      <div class="dash-pane-actions">
        ${agSwitchHTML('grid')}
        <span class="dash-pill">${prepped}/${all.length} preparadas</span>
        <button class="game-btn secondary" id="dashEditSchedule" type="button">⚙️ Horários &amp; valores</button>
      </div>
    </div>
    <p class="ag-tip">Arraste uma aula para mudar o dia ou a hora · puxe a borda de baixo para mudar a duração · clique num espaço vazio para marcar uma aula.</p>
    <div class="ag-wrap">
      <div class="ag-grid" style="--ag-hour:${AG_HOUR_PX}px;--ag-rows:${hours.length}">
        <div class="ag-corner"></div>
        ${cols.map(c => `<div class="ag-dayhead${c.key === todayKey ? ' is-today' : ''}"><span>${c.day.short}</span><b>${c.date.getDate()}</b></div>`).join('')}
        <div class="ag-hours">${hours.map(h => `<span style="top:${top(h * 60)}px">${String(h).padStart(2, '0')}:00</span>`).join('')}</div>
        ${cols.map(c => {
          const lanes = agLanes(c.list);
          return `<div class="ag-col${c.key === todayKey ? ' is-today' : ''}" data-ag-date="${c.key}" style="height:${hours.length * AG_HOUR_PX}px">
            ${hours.map(h => `<i class="ag-line" style="top:${top(h * 60)}px"></i><i class="ag-line ag-line--half" style="top:${top(h * 60 + 30)}px"></i>`).join('')}
            ${c.key === todayKey && nowMin >= firstH * 60 && nowMin <= lastH * 60 ? `<i class="ag-now" style="top:${top(nowMin)}px"></i>` : ''}
            ${c.list.filter(x => x.start != null).map(x => {
              const ln = lanes.get(x) || { lane: 0, of: 1 };
              const done = dashIsPrepped(x.sid, x.date);
              const note = dashNoteFor(x.sid, x.date);
              const short = x.dur <= 30;
              return `<button class="ag-ev${done ? ' is-prepped' : ''}${x.moved ? ' is-moved' : ''}${x.extra ? ' is-extra' : ''}${short ? ' is-short' : ''}" type="button"
                  data-ag-key="${igEscapeHtml(x.key)}" data-ag-date="${x.date}"
                  style="--who:${igEscapeHtml(x.s.color || '#8e6d86')};top:${top(x.start)}px;height:${Math.max(18, (x.dur / 60) * AG_HOUR_PX - 2)}px;left:calc(${(ln.lane / ln.of) * 100}% + 2px);width:calc(${100 / ln.of}% - 4px)"
                  aria-label="${igEscapeHtml(`${x.s.name}, ${x.time}, ${x.dur} min`)}">
                <span class="ag-ev-name">${igEscapeHtml(x.s.avatar || '')} ${igEscapeHtml(x.s.name)}</span>
                <span class="ag-ev-time">${igEscapeHtml(x.time)}–${agHHMM(x.start + x.dur)}${x.moved ? ' · ↷' : ''}${x.extra ? ' · ＋' : ''}${done ? ' · ✓' : ''}${note ? ' · 📝' : ''}</span>
                <span class="ag-ev-resize" data-ag-resize aria-hidden="true"></span>
              </button>`;
            }).join('')}
          </div>`;
        }).join('')}
      </div>
    </div>
    ${untimed.length ? `<p class="dash-note">Sem hora definida nesta semana: ${[...new Set(untimed.map(c => c.s.name))].map(igEscapeHtml).join(', ')} — clique em ⚙️ Horários &amp; valores.</p>` : ''}
    ${noSchedule.length ? `<p class="dash-note">Sem horário definido: ${noSchedule.map(s => igEscapeHtml(s.name)).join(', ')}</p>` : ''}`;

  pane.querySelectorAll('[data-week]').forEach(btn => btn.addEventListener('click', () => {
    const step = Number(btn.dataset.week);
    dashWeekAnchor = step === 0 ? dashToday() : dashAddDays(dashWeekAnchor, step * 7);
    dashPaintWeek(pane);
  }));
  agWireSwitch(pane);
  const sb = pane.querySelector('#dashEditSchedule');
  if (sb) sb.addEventListener('click', dashOpenScheduleEditor);

  const find = (key, date) => cols.find(c => c.key === date).list.find(x => x.key === key);
  const repaint = () => { dashPaintWeek(pane); if (typeof renderDashboardStatsOnly === 'function') renderDashboardStatsOnly(); agRefreshOthers(); };
  agWireDrag(pane, { firstH, top, find, repaint, cols });
}

// Hoje and the cockpit read the schedule too.
function agRefreshOthers() {
  try { if (typeof renderToday === 'function') renderToday(); } catch (e) { /* ignore */ }
  try { if (typeof refreshLiveClassCockpit === 'function' && !getActiveStudent()) refreshLiveClassCockpit(); } catch (e) { /* ignore */ }
}

// ---------------------------------------------------------------------------
// DRAG, RESIZE, CLICK
// ---------------------------------------------------------------------------
function agWireDrag(pane, ctx) {
  const grid = pane.querySelector('.ag-grid');
  if (!grid) return;
  const colAt = x => [...grid.querySelectorAll('.ag-col')].find(c => { const r = c.getBoundingClientRect(); return x >= r.left && x < r.right; });
  const minAt = (col, y) => {
    const r = col.getBoundingClientRect();
    const raw = ctx.firstH * 60 + ((y - r.top) / AG_HOUR_PX) * 60;
    return Math.max(0, Math.min(24 * 60 - AG_SNAP, Math.round(raw / AG_SNAP) * AG_SNAP));
  };

  grid.querySelectorAll('.ag-ev').forEach(ev => {
    ev.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const c = ctx.find(ev.dataset.agKey, ev.dataset.agDate);
      if (!c) return;
      const resizing = Boolean(e.target.closest('[data-ag-resize]'));
      const sx = e.clientX, sy = e.clientY;
      const col0 = ev.closest('.ag-col');
      const offsetMin = minAt(col0, sy) - c.start;
      let moved = false;
      let target = { date: c.date, start: c.start, dur: c.dur };
      try { ev.setPointerCapture(e.pointerId); } catch (err) { /* some pens / old browsers */ }
      const onMove = m => {
        if (!moved && Math.hypot(m.clientX - sx, m.clientY - sy) < 5) return;
        moved = true;
        ev.classList.add('is-dragging');
        if (resizing) {
          const end = Math.max(c.start + AG_SNAP, minAt(col0, m.clientY));
          target.dur = end - c.start;
          ev.style.height = `${Math.max(18, (target.dur / 60) * AG_HOUR_PX - 2)}px`;
          ev.querySelector('.ag-ev-time').textContent = `${c.time}–${agHHMM(end)} · ${target.dur} min`;
        } else {
          const col = colAt(m.clientX) || col0;
          const start = Math.max(0, minAt(col, m.clientY) - offsetMin);
          target = { date: col.dataset.agDate, start: Math.round(start / AG_SNAP) * AG_SNAP, dur: c.dur };
          const dx = col.getBoundingClientRect().left - col0.getBoundingClientRect().left;
          ev.style.transform = `translate(${dx}px, ${ctx.top(target.start) - ctx.top(c.start)}px)`;
          ev.querySelector('.ag-ev-time').textContent = `${agHHMM(target.start)}–${agHHMM(target.start + c.dur)}`;
        }
      };
      const onUp = () => {
        ev.removeEventListener('pointermove', onMove);
        ev.removeEventListener('pointerup', onUp);
        ev.removeEventListener('pointercancel', onUp);
        if (!moved) { agOpenCard(ev, c, ctx); return; }
        const changed = target.date !== c.date || target.start !== c.start || target.dur !== c.dur;
        if (!changed) { ctx.repaint(); return; }
        agAskScope(ev, c, { date: target.date, time: agHHMM(target.start), dur: target.dur }, ctx);
      };
      ev.addEventListener('pointermove', onMove);
      ev.addEventListener('pointerup', onUp);
      ev.addEventListener('pointercancel', onUp);
    });
    ev.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const c = ctx.find(ev.dataset.agKey, ev.dataset.agDate); if (c) agOpenCard(ev, c, ctx); } });
  });

  // An empty slot: a new class there.
  grid.querySelectorAll('.ag-col').forEach(col => col.addEventListener('click', e => {
    if (e.target.closest('.ag-ev')) return;
    const start = Math.floor(minAt(col, e.clientY) / 30) * 30;
    agOpenNew(col, e, col.dataset.agDate, agHHMM(start), ctx);
  }));
}

// A small card next to what was clicked.
function agPop(anchor, html, at) {
  agClosePop();
  const pop = document.createElement('div');
  pop.className = 'ag-pop';
  pop.id = 'agPop';
  pop.setAttribute('role', 'dialog');
  pop.innerHTML = html;
  document.body.appendChild(pop);
  const r = at || anchor.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let left = r.right + 10;
  if (left + w > window.innerWidth - 12) left = Math.max(12, r.left - w - 10);
  let topPx = Math.min(window.innerHeight - h - 12, Math.max(12, r.top - 10));
  pop.style.left = `${left}px`;
  pop.style.top = `${topPx}px`;
  const close = e => { if (!pop.contains(e.target) && !(anchor && anchor.contains(e.target))) agClosePop(); };
  setTimeout(() => document.addEventListener('mousedown', close), 0);
  pop._close = close;
  pop.addEventListener('keydown', e => { if (e.key === 'Escape') { agClosePop(); if (anchor && anchor.focus) anchor.focus(); } });
  const f = pop.querySelector('[autofocus], button, input, select, textarea');
  if (f) f.focus();
  return pop;
}
function agClosePop() {
  const p = document.getElementById('agPop');
  if (p) { document.removeEventListener('mousedown', p._close); p.remove(); }
}

const agDateLabel = key => { const d = dashDate(key); const day = DASH_DAYS.find(x => x.dow === d.getDay()); return `${day ? day.long : ''}, ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`; };

// "Só nesta semana" or "Toda semana" — after a drag or a change in the card.
function agAskScope(anchor, c, to, ctx) {
  if (c.extra) { agMoveOne(c.key, { date: to.date, time: to.time, dur: to.dur, extra: true }); agClosePop(); ctx.repaint(); return; }
  const pop = agPop(anchor, `
    <p class="ag-pop-title">Mudar a aula de ${igEscapeHtml(c.s.name)}</p>
    <p class="ag-pop-sub">${igEscapeHtml(agDateLabel(c.date))} ${igEscapeHtml(c.time)} → <b>${igEscapeHtml(agDateLabel(to.date))} ${igEscapeHtml(to.time)}</b>${to.dur !== c.dur ? ` · ${to.dur} min` : ''}</p>
    <div class="ag-pop-actions ag-pop-actions--col">
      <button class="btn btn-primary" data-scope="one" autofocus>Só nesta semana</button>
      <button class="game-btn secondary" data-scope="all">Toda semana (horário fixo)</button>
      <button class="ag-link" data-scope="cancel">Cancelar</button>
    </div>`);
  pop.querySelector('[data-scope="one"]').addEventListener('click', () => {
    agMoveOne(c.key, { date: to.date, time: to.time, dur: to.dur });
    agClosePop(); ctx.repaint();
  });
  pop.querySelector('[data-scope="all"]').addEventListener('click', () => {
    agMoveWeekly(c, to.date, to.time, to.dur);
    agClosePop(); ctx.repaint();
  });
  pop.querySelector('[data-scope="cancel"]').addEventListener('click', () => { agClosePop(); ctx.repaint(); });
}

// The class card.
function agOpenCard(anchor, c, ctx) {
  const done = dashIsPrepped(c.sid, c.date);
  const pop = agPop(anchor, `
    <div class="ag-pop-head" style="--who:${igEscapeHtml(c.s.color || '#8e6d86')}">
      <span class="ag-pop-av">${igEscapeHtml(c.s.avatar || '🙂')}</span>
      <div><p class="ag-pop-title">${igEscapeHtml(c.s.name)}</p>
      <p class="ag-pop-sub">${igEscapeHtml(agDateLabel(c.date))} · ${igEscapeHtml(c.time)}–${agHHMM(c.start + c.dur)} · ${igEscapeHtml(igLevelText(c.s))}${c.moved ? ' · ↷ remarcada' : ''}${c.extra ? ' · ＋ aula extra' : ''}</p></div>
      <button class="ag-x" data-ag="close" aria-label="Fechar">✕</button>
    </div>
    <div class="ag-pop-actions">
      <button class="btn btn-primary" data-ag="class">📋 Today's Class</button>
      <label class="ag-check"><input type="checkbox" data-ag="prep" ${done ? 'checked' : ''}/> preparada</label>
    </div>
    <textarea class="ag-plan" rows="3" data-ag="plan" placeholder="✏️ plano da aula…" aria-label="Plano da aula">${igEscapeHtml(dashNoteFor(c.sid, c.date))}</textarea>
    <details class="ag-change">
      <summary>🕒 Mudar dia, hora ou duração</summary>
      <div class="ag-fields">
        <label>Dia <input type="date" data-f="date" value="${c.date}"/></label>
        <label>Hora <input type="time" data-f="time" step="900" value="${igEscapeHtml(c.time)}"/></label>
        <label>Min <input type="number" data-f="dur" min="15" step="15" value="${c.dur}"/></label>
      </div>
      <button class="game-btn secondary" data-ag="apply">Aplicar…</button>
    </details>
    <div class="ag-pop-foot">
      ${c.moved ? '<button class="ag-link" data-ag="reset">↩ Voltar ao horário fixo</button>' : ''}
      <button class="ag-link ag-link--danger" data-ag="cancel">${c.extra ? '🗑️ Apagar esta aula' : '🚫 Cancelar só esta aula'}</button>
      <button class="ag-link" data-ag="file">📇 Ficha</button>
    </div>`);
  const on = (k, ev, fn) => { const el = pop.querySelector(`[data-ag="${k}"]`); if (el) el.addEventListener(ev, fn); };
  on('close', 'click', agClosePop);
  on('class', 'click', () => {
    agClosePop();
    if (typeof selectStudent === 'function') selectStudent(c.sid); else setActiveStudentId(c.sid);
    if (typeof openSessionDrawer === 'function') openSessionDrawer();
  });
  on('prep', 'change', e => { dashSetPrepped(c.sid, c.date, e.target.checked); ctx.repaint(); });
  let t = null;
  const plan = pop.querySelector('[data-ag="plan"]');
  const savePlan = () => { clearTimeout(t); dashSetNote(c.sid, c.date, plan.value); };
  plan.addEventListener('input', () => { clearTimeout(t); t = setTimeout(savePlan, 600); });
  plan.addEventListener('blur', savePlan);
  on('apply', 'click', () => {
    savePlan();
    const date = pop.querySelector('[data-f="date"]').value;
    const time = pop.querySelector('[data-f="time"]').value;
    const dur = Math.max(15, Number(pop.querySelector('[data-f="dur"]').value) || c.dur);
    if (!date || !time) return;
    if (!agDayOf(date)) { alert('A agenda vai de segunda a sábado.'); return; }
    if (date === c.date && time === c.time && dur === c.dur) { agClosePop(); return; }
    agAskScope(anchor, c, { date, time, dur }, ctx);
  });
  on('reset', 'click', () => { savePlan(); agClearMove(c.key); agClosePop(); ctx.repaint(); });
  on('cancel', 'click', () => {
    savePlan();
    if (!confirm(c.extra ? `Apagar a aula extra de ${c.s.name}?` : `Cancelar só a aula de ${c.s.name} de ${agDateLabel(c.date)}? O horário fixo continua.`)) return;
    if (c.extra) agClearMove(c.key); else agMoveOne(c.key, { cancelled: true });
    agClosePop(); ctx.repaint();
  });
  on('file', 'click', () => { savePlan(); agClosePop(); if (typeof openStudentFile === 'function') openStudentFile(c.sid); });
}

// A new class in an empty slot.
function agOpenNew(col, e, date, time, ctx) {
  const students = loadStudents().slice().sort((a, b) => a.name.localeCompare(b.name));
  const at = { left: e.clientX, right: e.clientX, top: e.clientY - 20 };
  const pop = agPop(col, `
    <p class="ag-pop-title">Nova aula</p>
    <p class="ag-pop-sub">${igEscapeHtml(agDateLabel(date))}</p>
    <div class="ag-fields">
      <label class="ag-field-wide">Aluno <select data-f="who" autofocus>
        <option value="">Escolha…</option>
        ${students.map(s => `<option value="${igEscapeHtml(s.id)}">${igEscapeHtml(s.name)}</option>`).join('')}
      </select></label>
      <label>Hora <input type="time" data-f="time" step="900" value="${time}"/></label>
      <label>Min <input type="number" data-f="dur" min="15" step="15" value="${AG_DEFAULT_DUR}"/></label>
    </div>
    <div class="ag-pop-actions ag-pop-actions--col">
      <button class="btn btn-primary" data-new="one">Só esta vez (aula extra)</button>
      <button class="game-btn secondary" data-new="all">Toda semana neste horário</button>
    </div>`, at);
  const val = k => pop.querySelector(`[data-f="${k}"]`).value;
  const go = weekly => {
    const sid = val('who');
    if (!sid) { pop.querySelector('[data-f="who"]').focus(); return; }
    const t = val('time') || time;
    const dur = Math.max(15, Number(val('dur')) || AG_DEFAULT_DUR);
    if (weekly) {
      const sc = dashScheduleFor(sid);
      const day = agDayOf(date);
      const times = { ...(sc.times || {}) };
      const days = sc.days.includes(day.id) ? sc.days : sc.days.concat(day.id);
      if (!sc.time) dashSaveSchedule(sid, { days, time: t, dur });
      else { times[day.id] = t; dashSaveSchedule(sid, { days, times, dur: sc.dur || dur }); }
    } else {
      const m = agMoves();
      m[`${sid}|+${Date.now().toString(36)}`] = { date, time: t, dur, extra: true };
      agSaveMoves(m);
    }
    agClosePop(); ctx.repaint();
  };
  pop.querySelector('[data-new="one"]').addEventListener('click', () => go(false));
  pop.querySelector('[data-new="all"]').addEventListener('click', () => go(true));
}
