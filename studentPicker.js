/* ==========================================================================
   IGenglishschool — Student picker, and the "no Live Class" mode

   A teacher who does not use the Live Class cockpit can hide it for herself
   ("🙈 Esconder a Live Class", in the student list). The choice is saved in
   her own account (IGStore 'ui_prefs'), so the other teachers keep theirs.

   With it on:
   - the Live Class item and section are hidden (html.ig-hide-live);
   - the homework list stays in its own section instead of the cockpit;
   - the student card at the bottom of the side menu opens this picker:
     a search box, today's students first (with their time), ↑ ↓ Enter,
     and, once a student is chosen, the shortcuts the cockpit had (Today's
     Class, book, slides, class review, student file, Zoom / Canva, reports).
   - "Hoje" sends a click on a class here instead of to the Live Class.
   ========================================================================== */

const UI_PREFS_KEY = 'ui_prefs';
function igUiPrefs() {
  const p = typeof IGStore !== 'undefined' ? IGStore.getJSON(UI_PREFS_KEY, {}) : {};
  return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
}
function igHideLive() {
  const html = document.documentElement;
  return Boolean(igUiPrefs().hideLive) && !html.classList.contains('ig-student-mode') && !html.classList.contains('ig-public-game');
}
function igSetHideLive(on) {
  const p = igUiPrefs();
  p.hideLive = Boolean(on);
  IGStore.setJSON(UI_PREFS_KEY, p);
  applyHideLive();
}

let pkApplied = null;
function applyHideLive() {
  const on = igHideLive();
  document.documentElement.classList.toggle('ig-hide-live', on);
  if (pkApplied === on) return;
  pkApplied = on;
  // The homework list lives in the cockpit while a student is chosen; with
  // the cockpit hidden it goes back to its own section.
  if (on) {
    if (typeof parkHomeworkRoot === 'function') parkHomeworkRoot();
    if (typeof renderHomework === 'function') { try { renderHomework(document.getElementById('homeworkRoot')); } catch (e) { /* ignore */ } }
    const nav = document.querySelector('.nav-link[data-section="live-class"].active');
    if (nav) nav.classList.remove('active');
  } else if (typeof refreshLiveClassCockpit === 'function') {
    refreshLiveClassCockpit();
  }
}

// ---------------------------------------------------------------------------
// Who has class today (the weekly schedule on the dashboard)
// ---------------------------------------------------------------------------
function pkToday() {
  const out = new Map();     // id -> time ('' when no time)
  try {
    if (typeof dashToday === 'function' && typeof DASH_DAYS !== 'undefined' && typeof dashScheduleFor === 'function') {
      const dow = DASH_DAYS.find(d => d.dow === dashToday().getDay());
      if (typeof agClassesOn === 'function') agClassesOn(dashKey(dashToday())).forEach(c => { if (!out.has(c.sid)) out.set(c.sid, c.time || ''); });
      else if (dow) loadStudents().forEach(s => { const sc = dashScheduleFor(s.id); if (sc.days.includes(dow.id)) out.set(s.id, sc.time || ''); });
    }
  } catch (e) { /* no schedule */ }
  return out;
}
const pkFold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pkEsc = s => (typeof escapeHtmlLite === 'function' ? escapeHtmlLite(s) : String(s || ''));

// ---------------------------------------------------------------------------
// THE PICKER
// ---------------------------------------------------------------------------
function openStudentPicker(startOnActions) {
  closeStudentPicker();
  if (typeof closeProfileDropdown === 'function') closeProfileDropdown();
  const wrap = document.createElement('div');
  wrap.className = 'sp-overlay';
  wrap.id = 'studentPicker';
  wrap.innerHTML = `<div class="sp-panel" role="dialog" aria-modal="true" aria-label="Escolher aluno"></div>`;
  document.body.appendChild(wrap);
  const panel = wrap.querySelector('.sp-panel');
  const lastFocus = document.activeElement;
  let query = '';
  let cursor = 0;
  let view = startOnActions && getActiveStudent() ? 'actions' : 'list';

  const close = () => { closeStudentPicker(); if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
  wrap.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });

  function rows() {
    const today = pkToday();
    const q = pkFold(query.trim());
    const all = loadStudents().filter(s => !q || pkFold(`${s.name} ${typeof igLevelText === 'function' ? igLevelText(s) : ''}`).includes(q));
    const byName = (a, b) => pkFold(a.name).localeCompare(pkFold(b.name));
    const todays = all.filter(s => today.has(s.id))
      .sort((a, b) => String(today.get(a.id) || '99').localeCompare(String(today.get(b.id) || '99')) || byName(a, b));
    const others = all.filter(s => !today.has(s.id)).sort(byName);
    return { todays, others, today };
  }

  function rowHTML(s, i, today) {
    const active = getActiveStudentId() === s.id;
    const t = today.get(s.id);
    return `<button class="sp-row${i === cursor ? ' is-cursor' : ''}${active ? ' is-active' : ''}" data-sp-pick="${pkEsc(s.id)}" role="option" aria-selected="${active}">
      <span class="sp-av" style="background:${pkEsc(s.color)}">${pkEsc(s.avatar)}</span>
      <span class="sp-name">${pkEsc(s.name)}<small>${pkEsc(typeof igLevelText === 'function' ? igLevelText(s) : '')}${typeof groupTagHTML === 'function' ? groupTagHTML(s.id) : ''}</small></span>
      ${today.has(s.id) ? `<span class="sp-when">📅 ${t ? pkEsc(t) : 'hoje'}</span>` : ''}
      ${active ? '<span class="sp-check" aria-hidden="true">✓</span>' : ''}
    </button>`;
  }

  function paintList() {
    const { todays, others, today } = rows();
    const flat = todays.concat(others);
    cursor = Math.max(0, Math.min(cursor, flat.length - 1));
    const active = getActiveStudent();
    panel.innerHTML = `
      <div class="sp-search">
        <span aria-hidden="true">🔎</span>
        <input type="search" id="spQuery" placeholder="Buscar aluno ou turma…" autocomplete="off" value="${pkEsc(query)}" aria-label="Buscar aluno"/>
        <kbd>Esc</kbd>
      </div>
      <div class="sp-list" role="listbox">
        ${todays.length ? `<p class="sp-group">Aula hoje</p>${todays.map((s, i) => rowHTML(s, i, today)).join('')}` : ''}
        ${others.length ? `<p class="sp-group">${todays.length ? 'Outros alunos' : 'Alunos'}</p>${others.map((s, i) => rowHTML(s, i + todays.length, today)).join('')}` : ''}
        ${flat.length ? '' : `<p class="sp-empty">Nenhum aluno com “${pkEsc(query)}”.</p>`}
      </div>
      <div class="sp-foot">
        ${active ? `<button class="sp-link" data-sp="actions">⚡ Atalhos de ${pkEsc(active.name)}</button><button class="sp-link" data-sp="none">✕ Nenhum aluno</button>` : ''}
        <button class="sp-link" data-sp="add">＋ Novo aluno</button>
        <button class="sp-link" data-sp="manage">⚙️ Gerenciar alunos</button>
        <button class="sp-link sp-link--right" data-sp="showlive" title="Só no seu login">👁️ Mostrar a Live Class</button>
      </div>`;
    const input = panel.querySelector('#spQuery');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.addEventListener('input', () => { query = input.value; cursor = 0; paintList(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(flat.length - 1, cursor + 1); moveCursor(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(0, cursor - 1); moveCursor(); }
      else if (e.key === 'Enter' && flat[cursor]) { e.preventDefault(); pick(flat[cursor].id); }
    });
    panel.querySelectorAll('[data-sp-pick]').forEach(b => b.addEventListener('click', () => pick(b.dataset.spPick)));
    wireFoot();
  }
  function moveCursor() {
    const list = panel.querySelectorAll('[data-sp-pick]');
    list.forEach((b, i) => b.classList.toggle('is-cursor', i === cursor));
    if (list[cursor]) list[cursor].scrollIntoView({ block: 'nearest' });
  }

  function pick(id) {
    if (typeof selectStudent === 'function') selectStudent(id);
    view = 'actions';
    paint();
  }

  // The cockpit's shortcuts, for the chosen student.
  function paintActions() {
    const s = getActiveStudent();
    if (!s) { view = 'list'; paint(); return; }
    const links = typeof CLASS_LINK_KINDS !== 'undefined' && typeof classLinkFor === 'function'
      ? Object.keys(CLASS_LINK_KINDS).map(k => ({ k, meta: CLASS_LINK_KINDS[k], url: classLinkFor(k, s.id) })).filter(l => l.url) : [];
    const t = pkToday().get(s.id);
    panel.innerHTML = `
      <div class="sp-who">
        <span class="sp-av sp-av--big" style="background:${pkEsc(s.color)}">${pkEsc(s.avatar)}</span>
        <div><b>${pkEsc(s.name)}</b><small>${pkEsc(typeof igLevelText === 'function' ? igLevelText(s) : '')}${t !== undefined ? ` · 📅 aula hoje${t ? ` às ${pkEsc(t)}` : ''}` : ''}</small></div>
        <button class="sp-link" data-sp="list">⇄ Trocar aluno</button>
      </div>
      <div class="sp-actions">
        <button class="sp-act sp-act--main" data-sp-act="class">📋<b>Today's Class</b><small>registrar a aula</small></button>
        <button class="sp-act" data-sp-act="book">📖<b>Livro da aula</b><small>fazer o livro juntos</small></button>
        <button class="sp-act" data-sp-act="slides">🖼️<b>Slides da aula</b><small>criar e apresentar</small></button>
        <button class="sp-act" data-sp-act="review">🧠<b>Class review</b><small>revisão da última aula</small></button>
        <button class="sp-act" data-sp-act="file">📇<b>Ficha do aluno</b><small>cadastro, aulas, pagamentos</small></button>
        <button class="sp-act" data-sp-act="homework">📝<b>Lição de casa</b><small>criar e ver lições</small></button>
        ${links.map(l => `<a class="sp-act" href="${pkEsc(l.url)}" target="_blank" rel="noopener noreferrer">${l.meta.icon}<b>${pkEsc(l.meta.label)}</b><small>abrir o link</small></a>`).join('')}
        <button class="sp-act" data-sp-act="reports">📊<b>Reports</b><small>boletim e progresso</small></button>
      </div>
      <div class="sp-foot">
        <button class="sp-link" data-sp="close">Fechar</button>
        <button class="sp-link sp-link--right" data-sp="showlive" title="Só no seu login">👁️ Mostrar a Live Class</button>
      </div>`;
    const first = panel.querySelector('[data-sp-act="class"]');
    if (first) first.focus();
    const run = fn => { close(); setTimeout(fn, 0); };
    const acts = {
      class: () => run(() => typeof openSessionDrawer === 'function' && openSessionDrawer()),
      book: () => run(() => typeof LivroOnline !== 'undefined' && LivroOnline.openClass(s.id)),
      slides: () => run(() => typeof SlidesAula !== 'undefined' && SlidesAula.openForStudent(s.id)),
      review: () => run(() => typeof openLatestClassReview === 'function' && openLatestClassReview()),
      file: () => run(() => typeof openStudentFile === 'function' && openStudentFile(s.id)),
      reports: () => run(() => typeof openReportsModal === 'function' && openReportsModal()),
      homework: () => run(() => {
        const sec = document.getElementById('homework');
        if (!sec) return;
        if (sec.classList.contains('is-collapsed') && typeof setSectionCollapsed === 'function') setSectionCollapsed(sec, false);
        sec.scrollIntoView({ behavior: 'smooth' });
      }),
    };
    panel.querySelectorAll('[data-sp-act]').forEach(b => b.addEventListener('click', () => acts[b.dataset.spAct]()));
    panel.querySelectorAll('a.sp-act').forEach(a => a.addEventListener('click', () => close()));
    wireFoot();
  }

  function wireFoot() {
    const on = (k, fn) => { const b = panel.querySelector(`[data-sp="${k}"]`); if (b) b.addEventListener('click', fn); };
    on('actions', () => { view = 'actions'; paint(); });
    on('list', () => { view = 'list'; paint(); });
    on('close', close);
    on('none', () => {
      if (typeof clearActiveStudent === 'function') clearActiveStudent();
      if (typeof renderProfileList === 'function') renderProfileList();
      if (typeof onActiveStudentChanged === 'function') onActiveStudentChanged();
      paint();
    });
    on('add', () => { close(); if (typeof openStudentForm === 'function') openStudentForm(); });
    on('manage', () => { close(); if (typeof openStudentManager === 'function') openStudentManager(); });
    on('showlive', () => {
      igSetHideLive(false);
      close();
      const sec = document.getElementById('live-class');
      if (sec) sec.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function paint() { if (view === 'actions') paintActions(); else paintList(); }
  paint();
}
function closeStudentPicker() {
  const el = document.getElementById('studentPicker');
  if (el) el.remove();
}

// ---------------------------------------------------------------------------
// WIRING
// ---------------------------------------------------------------------------
(function pkWire() {
  const chip = document.getElementById('profileChipBtn');
  // With the mode on, the student card opens the picker instead of the list
  // (capture: before app.js's own click handler).
  if (chip) {
    chip.addEventListener('click', e => {
      if (!igHideLive()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      openStudentPicker();
    }, true);
  }

  // The switch, at the bottom of the usual student list.
  if (typeof renderProfileList === 'function') {
    const orig = renderProfileList;
    // eslint-disable-next-line no-global-assign
    renderProfileList = function () {
      orig.apply(this, arguments);
      applyHideLive();
      const actions = document.getElementById('profileActions');
      if (actions && !actions.querySelector('#hideLiveBtn')) {
        const b = document.createElement('button');
        b.className = 'profile-manage-btn';
        b.id = 'hideLiveBtn';
        b.type = 'button';
        b.title = 'Esconde a seção Live Class só no seu login e troca esta lista por uma busca com atalhos do aluno';
        b.textContent = '🙈 Esconder a Live Class (só para mim)';
        b.addEventListener('click', () => {
          igSetHideLive(true);
          if (typeof closeProfileDropdown === 'function') closeProfileDropdown();
          openStudentPicker(true);
        });
        actions.appendChild(b);
      }
    };
  }

  // Ctrl+K / ⌘K: the picker from anywhere (with the mode on).
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k' && igHideLive()) {
      e.preventDefault();
      openStudentPicker();
    }
  });

  applyHideLive();
  if (typeof renderProfileList === 'function') { try { renderProfileList(); } catch (e) { /* not ready */ } }
})();
