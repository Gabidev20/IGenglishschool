/* ==========================================================================
   IGenglishschool — Speaking on the student's link: three ways to practise
   --------------------------------------------------------------------------
     🔊 Pronunciation    the "word to improve" column of Today's Class, with
                         the phonetics the teacher saw on the class sheet;
     📖 My book          words and phrases of the student's coursebook unit
                         (bookSpeaking.js);
     🧠 Class takeaway   the class's New words / expressions and Phrases /
                         texts.
   Each tab speaks through the same engine (SkillsModules.speaking): hear it,
   say it, see which words came through. A tab with nothing in it is not
   shown; with nothing at all, Speaking is the old one (the topics' sentences).

   The class log never travels to the student's device, so the teacher's side
   copies what the tabs need into the student's `student_access` record
   (studentAccess.js → saRefreshTaughtAll), which the link already receives:
     classes   [{ id, d, n, topic, pron: [{ w, ipa }], words: [], text }]
               newest first, only classes with something to practise;
     unitAuto  the unit the newest "Lesson 5 / Unit 5 / Mission 5…" in the
               class topics points at;
     speakUnit the teacher's own choice in the link window (wins).
   ========================================================================== */

const SP_MAX_CLASSES = 40;

function spEsc(s) { return igEscapeHtml(String(s == null ? '' : s)); }

// ---------------------------------------------------------------------------
// TEACHER SIDE — what goes into the record
// ---------------------------------------------------------------------------
function spSourceSessions(student) {
  if (typeof loadSessions !== 'function') return [];
  // A member of a group with one shared link follows the GROUP's classes.
  const srcId = (typeof studentGroupId === 'function' && studentGroupId(student.id)) || student.id;
  return loadSessions(srcId).slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))
      || (Number(b.sheet && b.sheet.classNumber) || 0) - (Number(a.sheet && a.sheet.classNumber) || 0));
}

function spClassesFor(student) {
  const out = [];
  spSourceSessions(student).forEach(s => {
    const sheet = s.sheet || {};
    const rows = Array.isArray(sheet.words) ? sheet.words : [];
    const pron = rows.map(r => {
      const sp = typeof ipaSplit === 'function' ? ipaSplit(r.pron) : { word: String(r.pron || '').trim(), ipa: '' };
      return sp.word ? { w: sp.word, ipa: sp.ipa || '' } : null;
    }).filter(Boolean);
    const words = rows.map(r => String(r.word || '').trim()).filter(Boolean);
    const text = String(sheet.text || '').trim();
    if (!pron.length && !words.length && !text) return;
    out.push({
      id: s.id, d: s.date || '', n: sheet.classNumber || '', topic: String(s.topicLabel || '').slice(0, 80),
      pron, words, text: text.slice(0, 1500),
    });
  });
  return out.slice(0, SP_MAX_CLASSES);
}

const SP_UNIT_RE = /\b(?:lesson|unit|level|mission|li[cç][aã]o|unidade)\s*(\d{1,2})\b/i;
function spUnitAuto(student) {
  const hit = spSourceSessions(student).map(s => SP_UNIT_RE.exec(String(s.topicLabel || ''))).find(Boolean);
  return hit ? Number(hit[1]) : null;
}

// The unit picker in the link window (studentAccess.js).
function spUnitPickerHTML(student) {
  const book = typeof LivroOnline !== 'undefined' ? LivroOnline.bookFor(student) : null;
  const units = book && typeof BOOK_SPEAKING !== 'undefined' ? BOOK_SPEAKING[book] : null;
  if (!units) return '';
  const rec = typeof saRecord === 'function' ? saRecord(student.id) : {};
  const auto = spUnitAuto(student);
  const autoTitle = auto && units[auto] ? units[auto].title : null;
  return `
    <p class="sa-group-label">🎤 Speaking · unidade do livro</p>
    <select id="saSpeakUnit" class="sa-unit-select">
      <option value="">⚙️ Automático — ${autoTitle ? spEsc(autoTitle) : 'pelo Today\'s Class (ainda sem "Lesson / Unit N")'}</option>
      ${Object.keys(units).map(n => `<option value="${n}" ${Number(rec.speakUnit) === Number(n) ? 'selected' : ''}>${spEsc(units[n].title)}</option>`).join('')}
    </select>`;
}

// ---------------------------------------------------------------------------
// TURNING THE TEACHER'S LINES INTO THINGS TO SAY
// ---------------------------------------------------------------------------
// "busy = ocupado", "get up - levantar (cedo)" → "busy", "get up".
function spSayable(s) {
  return String(s || '')
    .replace(/\/[^/]*\//g, ' ')
    .split(/\s(?:=|-|–|—|:)\s|\s*=\s*/)[0]
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// "Hi! / Hello!" are two things to say.
function spSplitAlt(s) { return String(s || '').split(/\s+\/\s+/); }

// Phrases / texts: one line per thing to say; long lines become sentences.
function spTextLines(text) {
  const out = [];
  String(text || '').split(/\n+/).forEach(line => {
    const clean = line
      .replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, '')
      .replace(/^[A-Z][A-Za-z]{0,12}:\s+/, '')          // "A: Hi!" → "Hi!"
      .trim();
    if (!/[a-z]/i.test(clean)) return;
    const parts = clean.length > 110 ? clean.split(/(?<=[.!?])\s+/) : [clean];
    parts.forEach(p => { const t = p.trim(); if (/[a-z]/i.test(t) && t.length <= 160) out.push(t); });
  });
  return out;
}

function spDayLabel(c) {
  let day = c.d;
  try { if (c.d) day = new Date(c.d + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); } catch (e) { /* keep */ }
  return [day, c.n ? `Class ${c.n}` : '', c.topic].filter(Boolean).join(' · ');
}

function spUniq(list) {
  const seen = new Set();
  return list.filter(x => { const k = String(x).toLowerCase(); if (!x || seen.has(k)) return false; seen.add(k); return true; });
}

// ---------------------------------------------------------------------------
// STUDENT SIDE — the three tabs
// ---------------------------------------------------------------------------
function spTabsFor(student) {
  const rec = typeof saRecord === 'function' ? saRecord(student.id) : {};
  const classes = Array.isArray(rec.classes) ? rec.classes : [];
  const book = typeof LivroOnline !== 'undefined' ? LivroOnline.bookFor(student) : null;
  const units = book && typeof BOOK_SPEAKING !== 'undefined' ? BOOK_SPEAKING[book] : null;
  const tabs = [];
  const pronClasses = classes.filter(c => c.pron && c.pron.length);
  if (pronClasses.length) tabs.push({ id: 'pron', icon: '🔊', label: 'Pronunciation', classes: pronClasses });
  if (units && Object.keys(units).length) {
    const pick = [rec.speakUnit, rec.unitAuto].map(Number).find(n => n && units[n]) || Number(Object.keys(units)[0]);
    tabs.push({ id: 'book', icon: '📖', label: 'My book', units, unit: pick });
  }
  const takeClasses = classes.filter(c => (c.words && c.words.length) || c.text);
  if (takeClasses.length) tabs.push({ id: 'take', icon: '🧠', label: 'Class takeaway', classes: takeClasses });
  return tabs;
}

function openSpeakingHub(student, fallbackLines) {
  const tabs = spTabsFor(student);
  if (!tabs.length) {
    openSpeakingModal({ studentId: student.id, source: 'home', lines: fallbackLines });
    return;
  }
  let active = tabs[0].id;
  const state = { pron: 0, take: 0, unit: null, bookMode: 'phrases' };

  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">🎤 Speaking</h3>
      <div class="game-picker spk-tabs" id="spTabs">
        ${tabs.map(t => `<button class="game-pick-btn ${t.id === active ? 'active' : ''}" data-sp-tab="${t.id}">${t.icon} ${t.label}</button>`).join('')}
      </div>
      <div id="spPane"></div>
    </div>`, true);

  const pane = document.getElementById('spPane');
  const tabBar = document.getElementById('spTabs');
  const base = { studentId: student.id, source: 'speaking-hub', max: 20 };
  const say = text => { if (typeof skSpeak === 'function') skSpeak(text, 0.9); };

  const daySelect = (list, at) => list.length > 1 ? `
    <label class="spk-pick"><span>Aula</span>
      <select id="spDay">${list.map((c, i) => `<option value="${i}" ${i === at ? 'selected' : ''}>${spEsc(spDayLabel(c))}</option>`).join('')}</select>
    </label>` : `<p class="spk-day">${spEsc(spDayLabel(list[0]))}</p>`;

  function wireSay() {
    pane.querySelectorAll('[data-say]').forEach(b => b.addEventListener('click', () => say(b.dataset.say)));
  }
  function wireDay(key) {
    const sel = pane.querySelector('#spDay');
    if (sel) sel.addEventListener('change', () => { state[key] = Number(sel.value) || 0; paint(); });
  }
  function engine(opts) {
    SkillsModules.speaking(pane.querySelector('#skMount'), { ...base, ...opts });
  }

  function paintPron(tab) {
    const c = tab.classes[Math.min(state.pron, tab.classes.length - 1)];
    const items = spUniq(c.pron.map(p => spSayable(p.w)));
    const hints = {};
    c.pron.forEach(p => { if (p.ipa) hints[spSayable(p.w)] = p.ipa; });
    pane.innerHTML = `
      <div class="spk-head">
        <p class="spk-lead">The words your teacher wants you to improve. Listen, then say them.<br><small>As palavras para melhorar a pronúncia: ouça e repita.</small></p>
        ${daySelect(tab.classes, state.pron)}
      </div>
      <div class="spk-chips">${c.pron.map(p => `<button type="button" class="spk-chip" data-say="${spEsc(spSayable(p.w))}">🔊 <b>${spEsc(p.w)}</b>${p.ipa ? ` <span class="spk-ipa">${spEsc(p.ipa)}</span>` : ''}</button>`).join('')}</div>
      <div id="skMount" class="game-mount"></div>`;
    wireSay();
    wireDay('pron');
    engine({ lines: items, hints, itemLabel: 'Palavra', topicLabel: 'Pronunciation' });
  }

  function paintBook(tab) {
    const n = state.unit || tab.unit;
    const u = tab.units[n] || tab.units[Object.keys(tab.units)[0]];
    const words = spUniq((u.words || []).flatMap(spSplitAlt).map(spSayable).filter(Boolean));
    const phrases = u.phrases || [];
    const mode = state.bookMode === 'words' || !phrases.length ? 'words' : 'phrases';
    pane.innerHTML = `
      <div class="spk-head">
        <p class="spk-lead">Words and phrases from your book.<br><small>Palavras e frases da unidade do seu livro.</small></p>
        <label class="spk-pick"><span>Unit</span>
          <select id="spUnit">${Object.keys(tab.units).map(k => `<option value="${k}" ${Number(k) === Number(n) ? 'selected' : ''}>${spEsc(tab.units[k].title)}</option>`).join('')}</select>
        </label>
      </div>
      <div class="spk-mode" role="group" aria-label="O que treinar">
        ${phrases.length ? `<button type="button" class="game-pick-btn ${mode === 'phrases' ? 'active' : ''}" data-mode="phrases">💬 Phrases (${phrases.length})</button>` : ''}
        ${words.length ? `<button type="button" class="game-pick-btn ${mode === 'words' ? 'active' : ''}" data-mode="words">🔤 Words (${words.length})</button>` : ''}
      </div>
      <div id="skMount" class="game-mount"></div>`;
    pane.querySelector('#spUnit').addEventListener('change', e => { state.unit = Number(e.target.value); paint(); });
    pane.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { state.bookMode = b.dataset.mode; paint(); }));
    engine({
      lines: mode === 'words' ? words : phrases,
      itemLabel: mode === 'words' ? 'Palavra' : 'Frase',
      topicLabel: `Book · ${u.title}`,
    });
  }

  function paintTake(tab) {
    const c = tab.classes[Math.min(state.take, tab.classes.length - 1)];
    const lines = spTextLines(c.text);
    const deck = spUniq((c.words || []).flatMap(spSplitAlt).map(spSayable)
      .concat(lines.map(l => l.split(/\s+=\s+/)[0])));   // "busy = ocupado": say only the English
    pane.innerHTML = `
      <div class="spk-head">
        <p class="spk-lead">What you took away from this class. Review it, then say it.<br><small>O que você levou da aula: revise e pratique falando.</small></p>
        ${daySelect(tab.classes, state.take)}
      </div>
      <div class="spk-review">
        ${c.words && c.words.length ? `
          <p class="spk-label">New words / expressions</p>
          <div class="spk-chips">${c.words.map(w => `<button type="button" class="spk-chip" data-say="${spEsc(spSayable(w))}">🔊 ${spEsc(w)}</button>`).join('')}</div>` : ''}
        ${lines.length ? `
          <p class="spk-label">Phrases / texts</p>
          <ul class="spk-lines">${lines.map(l => `<li><button type="button" class="spk-say" data-say="${spEsc(l)}" aria-label="Ouvir">🔊</button> ${spEsc(l)}</li>`).join('')}</ul>` : ''}
      </div>
      ${deck.length ? '<div id="skMount" class="game-mount"></div>' : ''}`;
    wireSay();
    wireDay('take');
    if (deck.length) engine({ lines: deck, itemLabel: 'Item', topicLabel: 'Class takeaway' });
  }

  function paint() {
    SkillsModules.stopAll();
    const tab = tabs.find(t => t.id === active);
    if (tab.id === 'pron') paintPron(tab);
    else if (tab.id === 'book') paintBook(tab);
    else paintTake(tab);
  }

  tabBar.querySelectorAll('[data-sp-tab]').forEach(b => {
    b.addEventListener('click', () => {
      active = b.dataset.spTab;
      tabBar.querySelectorAll('[data-sp-tab]').forEach(x => x.classList.toggle('active', x === b));
      paint();
    });
  });
  paint();
}
