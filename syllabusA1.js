/* ==========================================================================
   IGenglishschool — Syllabus A1: the school's A1 course as a track
   --------------------------------------------------------------------------
   The school's A1 syllabus (23 lessons in 5 modules, the same plan the
   teachers follow in class) as practice inside the platform, independent of
   the student's book. The content lives in syllabusA1Data.js (SYLLABUS_A1);
   this file turns it into:

     • 23 ordinary curriculum topics in LEVELS a1 (`syllabus: {track, n,
       module}`), so every existing game, the Quiz, Reading, Flashcards,
       Practice and Speak · Listen · Write work on them with no extra code;
     • three new activities only these lessons have: 💬 Real talk (the
       lesson's social skill, a dialogue to complete), 🛠️ Fix it (typical
       mistakes of Brazilian learners) and 🔊 Sounds (the pronunciation
       focus, by ear), plus a ⭐ Start tab with the goals (the student ticks
       "I can…"), the grammar, the chunks and the social skill, and a
       📚 Words tab with the lesson's whole vocabulary bank (`vocab`), which
       also feeds every game, Flashcards and Practice;
     • the track itself (openSyllabusTrack): the 23 lessons in order, with
       each student's progress per lesson and the next lesson to do.

   Who sees it: learners of 14+ at level A1. Every lesson is open from the
   start (the school's decision), so the grammar gate of studentAccess.js
   does not apply to these topics.

   Progress per student is stored under `syllabus_<studentId>`:
     { lessons: { 'syl-a1-01': { start: 100, quiz: 80, talk: 100, … } }, _t }
   Each value is the best score (0-100) of that activity. The student's link
   sends it to the teacher with the rest of the progress (share.js).

   Loaded AFTER adultContent.js / bookUnits.js and BEFORE contentStore.js,
   so the topics are part of the pristine curriculum the editor patches.
   ========================================================================== */

const SY_TRACK = 'a1';
const SY_LEVEL_ID = 'a1';
const SY_KEY_PREFIX = 'syllabus_';

// The activities of a lesson, in the order of the tabs. `need` = counts for
// "lesson complete"; the others are extra practice.
const SY_ACTS = [
  { id: 'start', icon: '⭐', label: 'Start', need: true },
  { id: 'words', icon: '📚', label: 'Words', need: true },
  { id: 'game',icon: '🎮', label: 'Games', need: true },
  { id: 'quiz', icon: '📝', label: 'Quiz', need: true },
  { id: 'talk', icon: '💬', label: 'Real talk', need: true },
  { id: 'fixit', icon: '🛠️', label: 'Fix it', need: true },
  { id: 'sounds', icon: '🔊', label: 'Sounds', need: true },
  { id: 'reading', icon: '📖', label: 'Reading', need: true },
  { id: 'skills', icon: '🗣️', label: 'Speak · Listen · Write', need: true },
];
const SY_DONE_AT = 60;   // a score from 60 counts the activity as done

const SY_MODULES = {
  1: 'Me and my people',
  2: 'Everyday life',
  3: 'Out and about',
  4: 'Then and now',
  5: 'Plans and experiences',
};

const syEsc = s => (typeof igEscapeHtml === 'function' ? igEscapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s));
const sySay = (text, rate) => { if (typeof lmSpeak === 'function') lmSpeak(String(text || '').replace(/_{2,}/g, '…'), rate || 0.85); };
const syShuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);

function syLessons() { return typeof SYLLABUS_A1 !== 'undefined' ? SYLLABUS_A1 : []; }
function syIsLesson(topic) { return Boolean(topic && topic.syllabus && topic.syllabus.track === SY_TRACK); }
// The live topic (a teacher may have edited it in the Content Editor).
function syTopic(id) {
  const level = typeof LEVELS !== 'undefined' ? LEVELS.find(l => l.id === SY_LEVEL_ID) : null;
  return (level && level.topics.find(t => t.id === id)) || syLessons().find(l => l.id === id) || null;
}

// Every word of a lesson: its vocabulary bank (vocab groups) when it has one,
// else the short `words` list.
function syAllWords(lesson) {
  if (!Array.isArray(lesson.vocab) || !lesson.vocab.length) return lesson.words || [];
  const seen = new Set();
  const out = [];
  lesson.vocab.forEach(g => (g.items || []).forEach(w => {
    const key = String(w.en || '').toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(w);
  }));
  return out;
}

// ---------------------------------------------------------------------------
// INTO THE CURRICULUM
// ---------------------------------------------------------------------------
// Ordered by `n`, after the level's other topics, so "the next topic"
// (recommend.js) after a lesson is the next lesson of the syllabus.
(function syAddLessons() {
  if (typeof LEVELS === 'undefined') return;
  const level = LEVELS.find(l => l.id === SY_LEVEL_ID);
  if (!level) return;
  syLessons().slice().sort((a, b) => a.n - b.n).forEach(l => {
    if (level.topics.some(t => t.id === l.id)) return;
    level.topics.push({
      ...l,
      // The whole vocabulary bank feeds every game, Flashcards and Practice.
      words: syAllWords(l),
      cefr: 'A1',
      audience: 'adult',
      description: `Syllabus A1 · Lesson ${l.n} · ${l.description}`,
      syllabus: { track: SY_TRACK, n: l.n, module: l.module },
    });
  });
})();

// The same lessons as Practice topics (homework, tests, the error bank),
// with the Fix it sentences as extra "Which sentence is correct?" items.
(function syAddExamTopics() {
  if (typeof EXAM_TOPICS === 'undefined' || typeof adultExamTopic !== 'function' || typeof exMC !== 'function') return;
  syLessons().forEach(l => {
    if (EXAM_TOPICS.some(x => x.id === l.id)) return;
    const t = adultExamTopic(SY_LEVEL_ID, { ...l, words: syAllWords(l) });
    t.label = `A1 · ${l.n} ${l.title}`;
    t.syllabus = true;
    (l.mistakes || []).forEach(m => {
      t.gens.push(() => exMC(`Which sentence is correct? (${m.wrong.replace(/[.?!]$/, '')} ✗)`, m.right,
        m.options.filter(o => o !== m.right), m.why));
    });
    (l.quiz || []).forEach(q => {
      t.gens.push(() => exMC(q.prompt, q.correct, q.options.filter(o => o !== q.correct), q.explain));
    });
    EXAM_TOPICS.push(t);
  });
})();

// ---------------------------------------------------------------------------
// PROGRESS — per student, per lesson, per activity
// ---------------------------------------------------------------------------
function syLoad(studentId) {
  const p = studentId ? IGStore.getJSON(SY_KEY_PREFIX + studentId, null) : null;
  return p && typeof p === 'object' && p.lessons ? p : { lessons: {} };
}
function syMark(studentId, lessonId, act, score) {
  if (!studentId || !lessonId || !act) return;
  const p = syLoad(studentId);
  const cur = p.lessons[lessonId] || {};
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  if ((cur[act] || 0) >= s && act in cur) return;
  p.lessons[lessonId] = { ...cur, [act]: Math.max(cur[act] || 0, s) };
  p._t = Date.now();
  IGStore.setJSON(SY_KEY_PREFIX + studentId, p);
}
// Two copies of the same student's progress (the link and the teacher):
// the best score of each activity wins.
function syMerge(a, b) {
  const out = { lessons: {}, can: {}, _t: Math.max((a && a._t) || 0, (b && b._t) || 0) };
  [a, b].forEach(p => Object.entries((p && p.lessons) || {}).forEach(([id, acts]) => {
    const cur = out.lessons[id] || (out.lessons[id] = {});
    Object.entries(acts || {}).forEach(([k, v]) => { cur[k] = Math.max(cur[k] || 0, Number(v) || 0); });
  }));
  // The "I can…" ticks can be undone, so the newest copy of each lesson wins.
  [a, b].forEach(p => Object.entries((p && p.can) || {}).forEach(([id, c]) => {
    if (c && (!out.can[id] || (c.t || 0) > (out.can[id].t || 0))) out.can[id] = c;
  }));
  return out;
}

// The student's own "I can…" ticks on the Start tab (self-assessment).
function syCanGet(studentId, lessonId) {
  const c = (syLoad(studentId).can || {})[lessonId];
  return c && Array.isArray(c.v) ? c.v : [];
}
function syCanSet(studentId, lessonId, list) {
  if (!studentId) return;
  const p = syLoad(studentId);
  p.can = { ...(p.can || {}), [lessonId]: { v: list.map(Boolean), t: Date.now() } };
  p._t = Date.now();
  IGStore.setJSON(SY_KEY_PREFIX + studentId, p);
}
function syLessonState(studentId, lessonId) {
  const acts = syLoad(studentId).lessons[lessonId] || {};
  const need = SY_ACTS.filter(a => a.need);
  const done = need.filter(a => (acts[a.id] || 0) >= SY_DONE_AT).length;
  return { acts, done, total: need.length, complete: done === need.length, started: Object.keys(acts).length > 0 };
}
// The first lesson not complete yet (the one to continue).
function syNextLesson(studentId) {
  const list = syLessons().slice().sort((a, b) => a.n - b.n);
  return list.find(l => !syLessonState(studentId, l.id).complete) || null;
}
function sySummary(studentId) {
  const list = syLessons();
  const complete = list.filter(l => syLessonState(studentId, l.id).complete).length;
  const next = syNextLesson(studentId);
  return { complete, total: list.length, next };
}

// Which activity of which lesson is on screen: a game won or a quiz finished
// there (they all end in awardProgress, which fires `ig:award`) counts it.
let syOnScreen = null;   // { lessonId, act, studentId }
function syActive(topic, act) {
  if (!syIsLesson(topic)) { syOnScreen = null; return; }
  const sid = typeof getActiveStudentId === 'function' ? getActiveStudentId() : null;
  syOnScreen = { lessonId: topic.id, act, studentId: sid };
  // Reading the Start page is the activity itself.
  if (act === 'start') syMark(sid, topic.id, 'start', 100);
}
document.addEventListener('ig:award', (e) => {
  if (!syOnScreen || !syOnScreen.studentId) return;
  const d = e.detail || {};
  const act = syOnScreen.act;
  if (!['game', 'quiz', 'reading', 'skills', 'practice', 'flashcards'].includes(act)) return;
  // The quiz reports its stars (0-3); a game or a skill that pays out counts as done.
  const score = act === 'quiz' && typeof d.stars === 'number' ? [40, 60, 80, 100][Math.min(3, d.stars)] : 100;
  syMark(syOnScreen.studentId, syOnScreen.lessonId, act, score);
});

// A graded answer of the new activities, into the student's log and error
// bank like every other exercise in the app.
function syRecord(topic, prompt, correct, options, ok, explain) {
  if (typeof ldRecord !== 'function') return;
  ldRecord({ kind: 'mc', prompt, correct, options, explain, topic: topic.title }, ok, { source: 'syllabus' });
}

// ---------------------------------------------------------------------------
// THE TABS OF A LESSON (app.js asks for them)
// ---------------------------------------------------------------------------
function syModalTabs() {
  const tabs = SY_ACTS.map(a => ({ id: a.id, label: a.label, icon: a.icon }));
  tabs.push({ id: 'practice', label: 'Practice', icon: '🏆', extra: true });
  tabs.push({ id: 'flashcards', label: 'Flashcards', icon: '🗂️', extra: true });
  if (!window.IG_SHARE_MODE) tabs.push({ id: 'lesson', label: 'Lesson Plan', icon: '📘', extra: true });
  return tabs;
}
// Panes only these lessons have. Returns true when it painted one.
function syRenderPane(kind, mountEl, level, topic) {
  syActive(topic, kind);
  if (kind === 'start') { syRenderStart(mountEl, topic); return true; }
  if (kind === 'words') { syRenderWords(mountEl, topic); return true; }
  if (kind === 'talk') { syRenderTalk(mountEl, topic); return true; }
  if (kind === 'fixit') { syRenderFixIt(mountEl, topic); return true; }
  if (kind === 'sounds') { syRenderSounds(mountEl, topic); return true; }
  return false;
}

// After openTopicModal: "← All lessons" and the lesson's progress in the header.
function syDecorateModal(topic) {
  if (!syIsLesson(topic)) return;
  const head = document.querySelector('#modalBody .modal-head-text');
  if (!head || head.querySelector('.syl-back')) return;
  // On a phone or tablet the lesson's nine tabs wrap instead of scrolling
  // out of sight, and a long lesson title may take two lines (style.css).
  const tabs = document.getElementById('modalTabs');
  if (tabs) tabs.classList.add('syl-tabs');
  const box = head.closest('.modal-head');
  if (box) box.classList.add('syl-head');
  const bar = document.createElement('div');
  bar.className = 'syl-modal-bar';
  bar.innerHTML = `
    <button type="button" class="syl-back">← All lessons</button>
    <span class="syl-modal-num">Lesson ${topic.syllabus.n} of ${syLessons().length} · Module ${topic.syllabus.module}</span>`;
  head.prepend(bar);
  bar.querySelector('.syl-back').addEventListener('click', () => openSyllabusTrack(syTrackStudent));
}

// ---------------------------------------------------------------------------
// ⭐ START — goals, grammar, chunks, social skill, sound of the lesson
// ---------------------------------------------------------------------------
function syRenderStart(mount, topic) {
  const goals = topic.goals || [];
  const rules = topic.rules || [];
  const chunks = topic.chunks || [];
  const soc = topic.social || {};
  const pron = topic.pron || {};
  const sid = syOnScreen && syOnScreen.studentId;
  const can = syCanGet(sid, topic.id);
  const hi =(ex, form) => syEsc(ex).replace(new RegExp(`(^|[^A-Za-z])(${String(form).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![A-Za-z])`, 'i'), '$1<mark>$2</mark>');
  mount.innerHTML = `
    <div class="syl-start">
      <section class="syl-card syl-goals">
        <h4>🎯 In this lesson</h4>
        <p class="syl-small">${sid ? 'Tick what you can do. Come back at the end of the lesson and tick again!' : 'The student ticks what they can do (choose the student at the top).'}</p>
        <div class="syl-can">
          ${goals.map((g, i) => `
            <label class="syl-can-item">
              <input type="checkbox" id="syCan${i}" data-can="${i}" ${can[i] ? 'checked' : ''} ${sid ? '' : 'disabled'} />
              <span>${syEsc(g)}</span>
            </label>`).join('')}
        </div>
        <p class="syl-can-count" aria-live="polite">${sid ? `${can.filter(Boolean).length} / ${goals.length}` : ''}</p>
      </section>
      <section class="syl-card">
        <h4>🧩 Grammar</h4>
        <p class="syl-tip">${syEsc(topic.grammarTip || '')}</p>
        <div class="syl-rules">
          ${rules.map(r => `
            <div class="syl-rule">
              <p class="syl-rule-head"><b>${syEsc(r.label)}</b> <span class="syl-form">${syEsc(r.form)}</span></p>
              ${r.hint ? `<p class="syl-rule-hint">${syEsc(r.hint)}</p>` : ''}
              <ul>${(r.examples || []).map(ex => `<li><button type="button" class="syl-say" data-say="${syEsc(ex)}" aria-label="Listen">🔊</button> ${hi(ex, r.form)}</li>`).join('')}</ul>
            </div>`).join('')}
        </div>
      </section>
      <section class="syl-card">
        <h4>💬 Useful chunks</h4>
        <p class="syl-small">Tap a chunk to see it in Portuguese.</p>
        <div class="syl-chunks">
          ${chunks.map(c => `
            <button type="button" class="syl-chunk" data-say="${syEsc(c.en)}">
              <b>${syEsc(c.en)}</b><small hidden>${syEsc(c.pt)}</small>
            </button>`).join('')}
        </div>
      </section>
      <div class="syl-two">
        <section class="syl-card syl-social">
          <h4>🤝 Social skill</h4>
          <p><b>${syEsc(soc.skill || '')}</b></p>
          <p class="syl-tip">${syEsc(soc.tip || '')}</p>
          <p class="syl-small">Practise it in 💬 Real talk.</p>
        </section>
        <section class="syl-card syl-pron">
          <h4>🔊 Sound of the lesson</h4>
          <p><b>${syEsc(pron.focus || '')}</b></p>
          <p class="syl-tip">${syEsc(pron.tip || '')}</p>
          <p class="syl-small">Train your ear in 🔊 Sounds.</p>
        </section>
      </div>
    </div>`;
  mount.querySelectorAll('[data-can]').forEach(box => box.addEventListener('change', () => {
    const list = goals.map((_, i) => Boolean(mount.querySelector(`#syCan${i}`).checked));
    syCanSet(sid, topic.id, list);
    mount.querySelector('.syl-can-count').textContent = `${list.filter(Boolean).length} / ${goals.length}${list.every(Boolean) ? ' 🎉' : ''}`;
  }));
  mount.querySelectorAll('.syl-say').forEach(b => b.addEventListener('click', () => sySay(b.dataset.say)));
  mount.querySelectorAll('.syl-chunk').forEach(b => b.addEventListener('click', () => {
    const pt = b.querySelector('small');
    pt.hidden = !pt.hidden;
    sySay(b.dataset.say);
  }));
}

// ---------------------------------------------------------------------------
// 📚 WORDS — the lesson's whole vocabulary bank, by group: tap a word to hear
// it and see it in Portuguese. Exploring most of them counts the activity.
// ---------------------------------------------------------------------------
function syRenderWords(mount, topic) {
  const lesson = syLessons().find(l => l.id === topic.id) || topic;
  const groups = Array.isArray(lesson.vocab) && lesson.vocab.length
    ? lesson.vocab : [{ title: 'Words', items: topic.words || [] }];
  const total = groups.reduce((n, g) => n + (g.items || []).length, 0);
  const sid = syOnScreen && syOnScreen.studentId;
  const seen = new Set();
  let counted = false;
  const visual = w => (typeof igWordVisualHTML === 'function' ? igWordVisualHTML(w, 'syl-word-pic') : syEsc(w.emoji || ''));

  mount.innerHTML = `
    <div class="syl-words">
      <div class="syl-words-head">
        <p class="syl-small">All the words of this lesson (${total}). Tap a word to hear it and see it in Portuguese.</p>
        <div class="game-btn-row">
          <label class="syl-words-toggle"><input type="checkbox" id="syWordsPt" /> Show Portuguese</label>
          <span class="game-status-pill" id="syWordsCount">0 / ${total}</span>
        </div>
      </div>
      ${groups.map((g, gi) => `
        <section class="syl-word-group">
          <h4>${syEsc(g.title)} <small>${(g.items || []).length}</small></h4>
          <div class="syl-word-grid">
            ${(g.items || []).map((w, wi) => `
              <button type="button" class="syl-word-card" data-w="${gi}:${wi}">
                <span class="syl-word-vis">${visual(w)}</span>
                <b>${syEsc(w.en)}</b>
                ${w.note ? `<i class="syl-word-note">${syEsc(w.note)}</i>` : ''}
                <small hidden>${syEsc(w.pt || '')}</small>
              </button>`).join('')}
          </div>
        </section>`).join('')}
      <p class="syl-small">Then practise them: 🎮 Games and, under ➕, 🗂️ Flashcards.</p>
    </div>`;

  const count = mount.querySelector('#syWordsCount');
  mount.querySelectorAll('.syl-word-card').forEach(card => card.addEventListener('click', () => {
    const [gi, wi] = card.dataset.w.split(':').map(Number);
    const w = groups[gi].items[wi];
    card.querySelector('small').hidden = false;
    card.classList.add('is-seen');
    sySay(w.en, 0.85);
    seen.add(card.dataset.w);
    count.textContent = `${seen.size} / ${total}`;
    if (!counted && seen.size >= Math.ceil(total * 0.6)) {
      counted = true;
      syMark(sid, topic.id, 'words', 100);
      count.textContent += ' ✅';
    }
  }));
  mount.querySelector('#syWordsPt').addEventListener('change', (e) => {
    mount.querySelectorAll('.syl-word-card small').forEach(s => { s.hidden = !e.target.checked && !s.closest('.is-seen'); });
  });
}

// ---------------------------------------------------------------------------
// 💬 REAL TALK — the social skill: read the dialogue, choose the missing line
// ---------------------------------------------------------------------------
function syRenderTalk(mount, topic) {
  const soc = topic.social || {};
  const lines = soc.dialogue || [];
  if (!lines.length) { mount.innerHTML = '<p class="quiz-empty">This lesson has no dialogue yet.</p>'; return; }
  const people = [...new Set(lines.map(l => l.who))];
  let shown = 0, gaps = 0, right = 0, tries = 0;

  mount.innerHTML = `
    <div class="syl-talk">
      <div class="syl-card syl-talk-head">
        <p class="syl-kicker">Social skill</p>
        <h4>${syEsc(soc.skill || '')}</h4>
        <p class="syl-tip">${syEsc(soc.tip || '')}</p>
      </div>
      <div class="syl-chat" id="syChat" aria-live="polite"></div>
      <div class="syl-choices" id="syChoices"></div>
    </div>`;
  const chat = mount.querySelector('#syChat');
  const choices = mount.querySelector('#syChoices');

  const bubble = (l, text) => {
    const side = people.indexOf(l.who) % 2 ? 'right' : 'left';
    const el = document.createElement('div');
    el.className = `syl-bubble syl-bubble--${side}`;
    el.innerHTML = `<span class="syl-who">${syEsc(l.who)}</span><p>${text}</p>
      <button type="button" class="syl-say" aria-label="Listen">🔊</button>`;
    el.querySelector('.syl-say').addEventListener('click', () => sySay(el.querySelector('p').textContent));
    chat.appendChild(el);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return el;
  };

  function next() {
    if (shown >= lines.length) return finish();
    const l = lines[shown];
    if (!l.gap) {
      bubble(l, syEsc(l.line));
      shown++;
      choices.innerHTML = `<button type="button" class="btn btn-primary syl-next">Next ›</button>`;
      choices.querySelector('.syl-next').addEventListener('click', next);
      choices.querySelector('.syl-next').focus();
      return;
    }
    gaps++;
    const el = bubble(l, syEsc(l.line).replace('___', '<span class="syl-gap">______</span>'));
    let firstTry = true;
    choices.innerHTML = `<p class="syl-small">What does ${syEsc(l.who)} say?</p>` +
      syShuffle(l.options).map(o => `<button type="button" class="syl-option" data-o="${syEsc(o)}">${syEsc(o)}</button>`).join('');
    choices.querySelectorAll('.syl-option').forEach(btn => btn.addEventListener('click', () => {
      const ok = btn.dataset.o === l.gap;
      tries++;
      syRecord(topic, `${l.who}: ${l.line}`, l.gap, l.options, ok);
      if (!ok) {
        firstTry = false;
        btn.classList.add('wrong', 'shake');
        btn.disabled = true;
        if (typeof IGSound !== 'undefined') IGSound.wrong();
        return;
      }
      if (firstTry) right++;
      if (typeof IGSound !== 'undefined') IGSound.correct();
      el.querySelector('p').innerHTML = syEsc(l.line).replace('___', `<span class="syl-gap is-filled">${syEsc(l.gap)}</span>`);
      sySay(el.querySelector('p').textContent);
      shown++;
      setTimeout(next, 700);
    }));
  }

  function finish() {
    const score = gaps ? Math.round((right / gaps) * 100) : 100;
    syMark(syOnScreen && syOnScreen.studentId, topic.id, 'talk', score);
    if (typeof awardProgress === 'function') awardProgress(right * 5, score === 100 ? 2 : score >= 60 ? 1 : 0);
    choices.innerHTML = `
      <div class="syl-result">
        <p><b>${right} / ${gaps}</b> on the first try. ${score === 100 ? 'Perfect!' : score >= 60 ? 'Well done!' : 'Read it again and try once more.'}</p>
        <p class="syl-small">Now read the whole conversation aloud. Be ${syEsc(people[0])}, then be ${syEsc(people[1] || people[0])}.</p>
        <div class="game-btn-row">
          <button type="button" class="game-btn secondary" id="syTalkListen">🔊 Listen to all</button>
          <button type="button" class="btn btn-primary" id="syTalkAgain">🔄 Again</button>
        </div>
      </div>`;
    choices.querySelector('#syTalkListen').addEventListener('click', () => sySay(lines.map(l => (l.gap ? l.line.replace('___', l.gap) : l.line)).join(' ')));
    choices.querySelector('#syTalkAgain').addEventListener('click', () => syRenderTalk(mount, topic));
  }
  next();
}

// ---------------------------------------------------------------------------
// 🛠️ FIX IT — find the correct version of a typical mistake
// ---------------------------------------------------------------------------
function syRenderFixIt(mount, topic) {
  const items = syShuffle(topic.mistakes || []);
  if (!items.length) { mount.innerHTML = '<p class="quiz-empty">This lesson has no sentences to fix yet.</p>'; return; }
  let i = 0, right = 0;
  function paint() {
    if (i >= items.length) {
      const score = Math.round((right / items.length) * 100);
      syMark(syOnScreen && syOnScreen.studentId, topic.id, 'fixit', score);
      if (typeof awardProgress === 'function') awardProgress(right * 5, score === 100 ? 2 : score >= 60 ? 1 : 0);
      mount.innerHTML = `
        <div class="syl-fix">
          <div class="syl-result">
            <p class="syl-big">${right} / ${items.length}</p>
            <p>${score === 100 ? 'You fixed them all!' : score >= 60 ? 'Good eye!' : 'These mistakes are very common. Try again!'}</p>
            <button type="button" class="btn btn-primary" id="syFixAgain">🔄 Again</button>
          </div>
        </div>`;
      mount.querySelector('#syFixAgain').addEventListener('click', () => syRenderFixIt(mount, topic));
      return;
    }
    const m = items[i];
    mount.innerHTML = `
      <div class="syl-fix">
        <div class="syl-fix-head"><span class="game-status-pill">${i + 1} / ${items.length} · ✅ ${right}</span></div>
        <p class="syl-kicker">This sentence has a mistake</p>
        <p class="syl-wrong">${syEsc(m.wrong)}</p>
        <p class="syl-small">Which sentence is correct?</p>
        <div class="syl-options">
          ${syShuffle(m.options).map(o => `<button type="button" class="syl-option" data-o="${syEsc(o)}">${syEsc(o)}</button>`).join('')}
        </div>
        <div class="syl-why" hidden></div>
      </div>`;
    mount.querySelectorAll('.syl-option').forEach(btn => btn.addEventListener('click', () => {
      const ok = btn.dataset.o === m.right;
      if (ok) right++;
      syRecord(topic, `Fix it: ${m.wrong}`, m.right, m.options, ok, m.why);
      if (typeof IGSound !== 'undefined') { if (ok) IGSound.correct(); else IGSound.wrong(); }
      mount.querySelectorAll('.syl-option').forEach(b => {
        b.disabled = true;
        if (b.dataset.o === m.right) b.classList.add('correct');
      });
      if (!ok) btn.classList.add('wrong');
      const why = mount.querySelector('.syl-why');
      why.hidden = false;
      why.innerHTML = `
        <p><span class="syl-pt">PT</span> ${syEsc(m.why)}</p>
        <button type="button" class="btn btn-primary">${i + 1 === items.length ? 'See my score ›' : 'Next ›'}</button>`;
      sySay(m.right);
      const nextBtn = why.querySelector('button');
      nextBtn.addEventListener('click', () => { i++; paint(); });
      nextBtn.focus();
    }));
  }
  paint();
}

// ---------------------------------------------------------------------------
// 🔊 SOUNDS — the lesson's pronunciation focus, by ear
//   sort:  hear a word, put it in its sound group
//   pairs: hear one of two similar words, choose which
// ---------------------------------------------------------------------------
function syRenderSounds(mount, topic) {
  const p = topic.pron || {};
  const pairs = p.type === 'pairs';
  const rounds = pairs
    ? syShuffle(p.items || []).map(it => { const pickA = Math.random() < 0.5; return { say: pickA ? it.a : it.b, correct: pickA ? it.a : it.b, options: [it.a, it.b] }; })
    : syShuffle(p.items || []).map(it => ({ say: it.say || it.text, text: it.text, correct: it.bucket, options: p.buckets || [] }));
  if (!rounds.length) { mount.innerHTML = '<p class="quiz-empty">This lesson has no sound practice yet.</p>'; return; }
  if (!('speechSynthesis' in window)) {
    mount.innerHTML = '<p class="quiz-empty">This browser cannot play sounds. Try Chrome or Edge.</p>';
    return;
  }
  let i = 0, right = 0;
  function paint() {
    if (i >= rounds.length) {
      const score = Math.round((right / rounds.length) * 100);
      syMark(syOnScreen && syOnScreen.studentId, topic.id, 'sounds', score);
      if (typeof awardProgress === 'function') awardProgress(right * 3, score === 100 ? 2 : score >= 60 ? 1 : 0);
      mount.innerHTML = `
        <div class="syl-sounds">
          <div class="syl-result">
            <p class="syl-big">${right} / ${rounds.length}</p>
            <p>${score >= 80 ? 'Great ears!' : 'Listen again: your ears get better every time.'}</p>
            <button type="button" class="btn btn-primary" id="sySoundAgain">🔄 Again</button>
          </div>
        </div>`;
      mount.querySelector('#sySoundAgain').addEventListener('click', () => syRenderSounds(mount, topic));
      return;
    }
    const r = rounds[i];
    mount.innerHTML = `
      <div class="syl-sounds">
        <div class="syl-card syl-sounds-head">
          <p class="syl-kicker">${syEsc(p.focus || 'Sounds')}</p>
          <p class="syl-tip">${syEsc(p.tip || '')}</p>
        </div>
        <span class="game-status-pill">${i + 1} / ${rounds.length} · ✅ ${right}</span>
        <div class="syl-listen">
          <button type="button" class="lt-speaker" id="sySay" aria-label="Listen again">🔊</button>
          <button type="button" class="game-btn secondary" id="sySlow">🐢 Slow</button>
        </div>
        ${pairs ? '<p class="syl-small">Which word do you hear?</p>' : `<p class="syl-word">${syEsc(r.text)}</p><p class="syl-small">Listen. Which sound group is it in?</p>`}
        <div class="syl-options ${pairs ? 'syl-options--pair' : ''}">
          ${r.options.map(o => `<button type="button" class="syl-option" data-o="${syEsc(o)}">${syEsc(o)}</button>`).join('')}
        </div>
        <p class="syl-feedback" aria-live="polite">&nbsp;</p>
      </div>`;
    mount.querySelector('#sySay').addEventListener('click', () => sySay(r.say, 0.8));
    mount.querySelector('#sySlow').addEventListener('click', () => sySay(r.say, 0.5));
    let answered = false;
    mount.querySelectorAll('.syl-option').forEach(btn => btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const ok = btn.dataset.o === r.correct;
      if (ok) right++;
      syRecord(topic, pairs ? `Sounds: ${r.options.join(' or ')}?` : `Sounds: ${r.text}`, r.correct, r.options, ok);
      if (typeof IGSound !== 'undefined') { if (ok) IGSound.correct(); else IGSound.wrong(); }
      mount.querySelectorAll('.syl-option').forEach(b => { b.disabled = true; if (b.dataset.o === r.correct) b.classList.add('correct'); });
      if (!ok) btn.classList.add('wrong');
      mount.querySelector('.syl-feedback').textContent = ok ? '✅ Yes!' : `It was: ${pairs ? r.correct : `${r.text} → ${r.correct}`}`;
      setTimeout(() => { if (mount.isConnected) { i++; paint(); } }, ok ? 1100 : 2200);
    }));
    setTimeout(() => sySay(r.say, 0.8), 250);
  }
  paint();
}

// ---------------------------------------------------------------------------
// THE TRACK — the 23 lessons in order, with progress
// ---------------------------------------------------------------------------
// `student`: whose progress to show. Defaults to the active student (the
// student on their own link, or the student of the class on the teacher's
// screen); with nobody selected the track opens without progress.
let syTrackStudent = null;   // whose track is open: "← All lessons" goes back to it
function openSyllabusTrack(student) {
  if (typeof openModal !== 'function') return;
  const st = student || (typeof getActiveStudent === 'function' ? getActiveStudent() : null);
  syTrackStudent = st;
  const sid = st ? st.id : null;
  const list = syLessons().slice().sort((a, b) => a.n - b.n);
  const sum = sySummary(sid);
  const next = sid ? sum.next : list[0];
  const byModule = {};
  list.forEach(l => (byModule[l.module] = byModule[l.module] || []).push(l));
  const dots = state => SY_ACTS.filter(a => a.need).map(a => {
    const v = state.acts[a.id];
    return `<span class="syl-dot${(v || 0) >= SY_DONE_AT ? ' is-done' : v != null ? ' is-tried' : ''}" title="${syEsc(a.label)}">${a.icon}</span>`;
  }).join('');

  openModal(`
    <div class="modal-content-pad syl-track">
      <header class="syl-track-head">
        <div>
          <p class="syl-kicker">IG English · Syllabus</p>
          <h3 id="modalTitle">A1 course · 23 lessons</h3>
          <p class="syl-small">${sid
            ? `${syEsc(st.name)}: <b>${sum.complete} of ${sum.total}</b> lessons complete.`
            : 'Choose the student of the class at the top to see their progress.'}
            Every lesson has games, a quiz, a real-life conversation, mistakes to fix, sounds, a text and speaking, listening and writing.</p>
        </div>
        ${next ? `<button type="button" class="btn btn-primary syl-continue" data-lesson="${syEsc(next.id)}">
          ${sid && syLessonState(sid, next.id).started ? 'Continue' : 'Start'}: Lesson ${next.n} ›</button>` : '<p class="syl-allDone">🏆 All lessons complete!</p>'}
      </header>
      ${sid ? `<div class="syl-progress" role="img" aria-label="${sum.complete} of ${sum.total} lessons complete"><span style="width:${Math.round((sum.complete / Math.max(1, sum.total)) * 100)}%"></span></div>` : ''}
      ${Object.keys(byModule).sort((a, b) => a - b).map(m => `
        <section class="syl-module">
          <h4><span>Module ${m}</span> ${syEsc(SY_MODULES[m] || '')}</h4>
          <div class="syl-lessons">
            ${byModule[m].map(l => {
              const state = syLessonState(sid, l.id);
              const isNext = next && next.id === l.id;
              return `
                <button type="button" class="syl-lesson${state.complete ? ' is-complete' : ''}${isNext ? ' is-next' : ''}" data-lesson="${syEsc(l.id)}">
                  <span class="syl-lesson-n">${state.complete ? '✓' : l.n}</span>
                  <span class="syl-lesson-body">
                    <b>${syEsc(l.emoji)} ${syEsc(l.title)}</b>
                    <small>${syEsc((l.social && l.social.skill) || l.description)}</small>
                    ${sid ? `<span class="syl-dots">${dots(state)}${syCanGet(sid, l.id).filter(Boolean).length ? `<span class="syl-can-mini" title="I can…">✔ ${syCanGet(sid, l.id).filter(Boolean).length}/${(l.goals || []).length}</span>` : ''}</span>` : ''}
                  </span>
                  ${isNext ? '<span class="syl-next-tag">next</span>' : ''}
                </button>`;
            }).join('')}
          </div>
        </section>`).join('')}
    </div>`, true);

  document.querySelectorAll('#modalBody [data-lesson]').forEach(btn => btn.addEventListener('click', () => syOpenLesson(btn.dataset.lesson)));
}

function syOpenLesson(lessonId) {
  const topic = syTopic(lessonId);
  if (!topic || typeof openTopicModal !== 'function') return;
  openTopicModal(SY_LEVEL_ID, lessonId);
}

// ---------------------------------------------------------------------------
// WHO GETS IT
// ---------------------------------------------------------------------------
// Learners of 14+ placed at A1 (the student link shows them the "My course" tile).
function syForStudent(student) {
  if (!student || student.levelId !== SY_LEVEL_ID) return false;
  return typeof igGrownLook === 'function' ? igGrownLook(student) : Number(student.age) >= 14;
}

// The teacher's entry: a banner above the curriculum grid while A1 is on
// screen and the teacher has grown-up students.
function syRenderTeacherEntry() {
  if (window.IG_SHARE_MODE) return;
  const grid = document.getElementById('topicsGrid');
  if (!grid) return;
  let el = document.getElementById('syTeacherEntry');
  const wanted = typeof teacherHasGrownups !== 'function' || teacherHasGrownups();
  const a1Shown = typeof curriculumTabs === 'function' && typeof activeTab === 'function'
    ? activeTab().levelIds.includes(SY_LEVEL_ID) && (typeof activeLevelFilter === 'undefined' || activeLevelFilter === 'all' || activeLevelFilter === SY_LEVEL_ID)
    : true;
  if (!wanted || !a1Shown || !syLessons().length) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'syTeacherEntry';
    el.className = 'syl-entry';
    grid.parentNode.insertBefore(el, grid);
  }
  el.innerHTML = `
    <div>
      <b>📚 Syllabus A1 · 23 lessons in order</b>
      <small>O curso A1 da escola: jogos, quiz, Real talk, Fix it, Sounds, leitura e skills em cada aula, com o progresso de cada aluno (14+).</small>
    </div>
    <button type="button" class="btn btn-primary" id="syOpenTrack">Abrir a trilha</button>`;
  el.querySelector('#syOpenTrack').addEventListener('click', () => openSyllabusTrack());
}
