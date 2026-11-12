/* ==========================================================================
   IGenglishschool — Learner Data
   What each student actually did, and what they got wrong.

   Everything else in this file exists to serve two questions:
     "what should this student revise today?"   → the error bank (Leitner)
     "how is this student doing?"                → the activity log

   Both are per student and go through IGStore, so they are namespaced per
   teacher and ride along with the existing cloud sync.
   ========================================================================== */

const LD_LOG_PREFIX = 'log_';      // studentId -> [attempt]
const LD_BANK_PREFIX = 'bank_';    // studentId -> { key: card }
const LD_LOG_MAX = 4000;           // months of daily games, then it rolls

// Leitner boxes: a card climbs one box per correct answer and falls to the
// bottom on a wrong one. The gaps are the standard doubling ladder.
const LD_BOX_DAYS = [0, 1, 2, 4, 8, 16];
const LD_MASTERED_BOX = 4;

function ldToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function ldDayKey(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d)) return String(iso || '').slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Entering the link and finishing a game are logged too (for the days and
// times on "Meu progresso"), but they are not exercises: no right or wrong.
const LD_NOT_EXERCISE = ['visit', 'play'];
const ldIsExercise = a => LD_NOT_EXERCISE.indexOf(a.kind) === -1;
function ldPlusDays(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// STORAGE
// ---------------------------------------------------------------------------
function ldLoadLog(studentId) {
  if (!studentId) return [];
  const log = IGStore.getJSON(LD_LOG_PREFIX + studentId, []);
  return Array.isArray(log) ? log : [];
}
function ldSaveLog(studentId, log) {
  IGStore.setJSON(LD_LOG_PREFIX + studentId, log.slice(-LD_LOG_MAX));
}
function ldLoadBank(studentId) {
  if (!studentId) return {};
  const bank = IGStore.getJSON(LD_BANK_PREFIX + studentId, {});
  return bank && typeof bank === 'object' && !Array.isArray(bank) ? bank : {};
}
function ldSaveBank(studentId, bank) {
  IGStore.setJSON(LD_BANK_PREFIX + studentId, bank);
}

// Two questions are "the same card" when they ask the same thing and want the
// same answer — the generators produce fresh wordings of the same item all the
// time, and a card per wording would never be revised twice.
function ldCardKey(item) {
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
  return `${item.kind || 'q'}|${norm(item.prompt)}|${norm(item.correct)}`;
}

// ---------------------------------------------------------------------------
// RECORDING — every graded answer in the app funnels through here
// ---------------------------------------------------------------------------
// `item`  the question as the games and the exam runner know it
// `ok`    whether the student got it right
// `opts`  { studentId, source, skip Bank }
function ldRecord(item, ok, opts) {
  const o = opts || {};
  const studentId = o.studentId || (typeof getActiveStudentId === 'function' ? getActiveStudentId() : null);
  if (!studentId || !item) return null;

  const now = new Date().toISOString();
  const log = ldLoadLog(studentId);
  log.push({
    t: now,
    ok: Boolean(ok),
    kind: item.kind || 'q',
    topic: item.topic || item.topicLabel || '',
    source: o.source || 'practice',
    label: String(item.prompt || item.label || '').slice(0, 140),
  });
  ldSaveLog(studentId, log);

  if (o.skipBank) return null;

  // Only items the app can ask again go in the bank. A speaking attempt is
  // logged for the progress page but cannot be re-served as a card.
  const replayable = ['mc', 'gap', 'order', 'sort'].indexOf(item.kind) !== -1;
  if (!replayable) return null;

  const bank = ldLoadBank(studentId);
  const key = ldCardKey(item);
  const card = bank[key] || {
    key,
    item: {
      kind: item.kind, prompt: item.prompt, correct: item.correct,
      options: item.options, buckets: item.buckets, tokens: item.tokens,
      accept: item.accept, hint: item.hint, explain: item.explain,
      topic: item.topic || '',
    },
    box: 0, right: 0, wrong: 0, added: now,
  };

  if (ok) {
    card.right++;
    card.box = Math.min(LD_BOX_DAYS.length - 1, card.box + 1);
  } else {
    card.wrong++;
    card.box = 0;
  }
  card.last = now;
  card.due = ldPlusDays(LD_BOX_DAYS[card.box]);

  // A card answered right on the very first try was never a problem: it is
  // not worth carrying in a revision pile.
  if (ok && card.wrong === 0 && card.right === 1) {
    delete bank[key];
  } else {
    bank[key] = card;
  }
  ldSaveBank(studentId, bank);
  return card;
}

// Vocabulary practice logs the word, not a question shape.
function ldRecordWord(word, ok, topicLabel, studentId) {
  return ldRecord({ kind: 'word', prompt: word, correct: word, topic: topicLabel || '' }, ok,
    { studentId, source: 'vocabulary', skipBank: true });
}

// ---------------------------------------------------------------------------
// THE ERROR BANK
// ---------------------------------------------------------------------------
function ldDueCards(studentId, limit) {
  const now = Date.now();
  const bank = ldLoadBank(studentId);
  const cards = Object.keys(bank).map(k => bank[k])
    .filter(c => c && c.item && c.box < LD_MASTERED_BOX)
    .filter(c => !c.due || new Date(c.due).getTime() <= now)
    // The most-missed first: that is where a short revision pays best.
    .sort((a, b) => (b.wrong - b.right) - (a.wrong - a.right));
  return limit ? cards.slice(0, limit) : cards;
}

function ldBankSummary(studentId) {
  const bank = ldLoadBank(studentId);
  const cards = Object.keys(bank).map(k => bank[k]).filter(c => c && c.item);
  const now = Date.now();
  return {
    total: cards.length,
    due: cards.filter(c => c.box < LD_MASTERED_BOX && (!c.due || new Date(c.due).getTime() <= now)).length,
    mastered: cards.filter(c => c.box >= LD_MASTERED_BOX).length,
    byTopic: cards.reduce((acc, c) => {
      const t = (c.item && c.item.topic) || 'Outros';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {}),
  };
}

function ldForgetCard(studentId, key) {
  const bank = ldLoadBank(studentId);
  delete bank[key];
  ldSaveBank(studentId, bank);
}

// ---------------------------------------------------------------------------
// STATS for the student's own progress page
// ---------------------------------------------------------------------------
function ldStreak(log) {
  const days = new Set(log.map(a => ldDayKey(a.t)));
  if (!days.size) return 0;
  let streak = 0;
  const d = new Date();
  // Today not being there yet does not break a streak — the day is not over.
  if (!days.has(ldDayKey(d))) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = ldDayKey(d);
    if (!days.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function ldStats(studentId) {
  const all = ldLoadLog(studentId);
  const log = all.filter(ldIsExercise);
  const bank = ldBankSummary(studentId);
  const today = ldToday();
  const weekAgo = Date.now() - 6 * 864e5;
  const recent = log.filter(a => new Date(a.t).getTime() >= weekAgo);

  // One bar per day for the last week, oldest first.
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = ldDayKey(d);
    const day = log.filter(a => ldDayKey(a.t) === key);
    week.push({
      key,
      label: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()],
      total: day.length,
      right: day.filter(a => a.ok).length,
    });
  }

  const byTopic = {};
  log.forEach(a => {
    const t = a.topic || 'Geral';
    byTopic[t] = byTopic[t] || { total: 0, right: 0 };
    byTopic[t].total++;
    if (a.ok) byTopic[t].right++;
  });

  return {
    total: log.length,
    right: log.filter(a => a.ok).length,
    today: log.filter(a => ldDayKey(a.t) === today).length,
    weekTotal: recent.length,
    weekRight: recent.filter(a => a.ok).length,
    accuracy: log.length ? Math.round((log.filter(a => a.ok).length / log.length) * 100) : 0,
    weekAccuracy: recent.length ? Math.round((recent.filter(a => a.ok).length / recent.length) * 100) : 0,
    streak: ldStreak(all),
    activeDays: new Set(all.filter(a => new Date(a.t).getTime() >= weekAgo - 864e5).map(a => ldDayKey(a.t))).size,
    week,
    byTopic,
    bank,
    bestDay: week.reduce((best, d) => (d.total > (best ? best.total : -1) ? d : best), null),
  };
}

// ---------------------------------------------------------------------------
// REVISION — the due cards, served through the exam runner the app already has
// ---------------------------------------------------------------------------
function ldReviewExam(studentId, limit) {
  // Words and sentences missed in the games are revised in "My mistakes"
  // (mistakes.js); the exam runner only knows question shapes.
  const cards = ldDueCards(studentId).filter(c => ['vocab', 'sentence'].indexOf(c.item.kind) === -1).slice(0, limit || 10);
  if (!cards.length) return null;
  const items = cards.map(c => ({ ...c.item }));
  const parts = typeof exPartition === 'function' ? exPartition(items) : [];
  return {
    id: 'review-' + Date.now().toString(36),
    title: 'Revisão dos meus erros',
    group: '',
    topicIds: [],
    topicLabels: [...new Set(items.map(i => i.topic).filter(Boolean))],
    createdAt: new Date().toISOString(),
    count: items.length,
    parts,
    items: parts.length ? parts.reduce((all, p) => all.concat(p.items), []) : items,
    isReview: true,
  };
}

function openReviewSession(studentId) {
  const id = studentId || (typeof getActiveStudentId === 'function' ? getActiveStudentId() : null);
  if (!id) { alert('Escolha um aluno primeiro.'); return; }
  const exam = ldReviewExam(id, 10);
  if (!exam) {
    alert('Nada para revisar por enquanto — nenhum erro pendente. 🎉');
    return;
  }
  openExamRunner(exam, { studentId: id, source: 'review' });
}

// ---------------------------------------------------------------------------
// ACTIVITY — when the student came in and what they played
// ---------------------------------------------------------------------------
// The game on screen now: its title, plus the chosen tab (Balloon Pop…).
function ldCurrentGameName() {
  const title = document.querySelector('.modal #modalTitle, #modalTitle');
  const tab = document.querySelector('.modal .game-pick-btn.active');
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  let name = clean(title && title.textContent);
  const t = clean(tab && tab.textContent);
  if (t && t !== name) name = name ? `${name} · ${t}` : t;
  return name.slice(0, 80);
}

// kind 'visit' (opened the link) or 'play' (finished a game).
function ldNoteActivity(kind, label, extra) {
  try {
    const studentId = typeof getActiveStudentId === 'function' ? getActiveStudentId() : null;
    if (!studentId) return;
    const log = ldLoadLog(studentId);
    const now = Date.now();
    // The same thing again a moment later is the same visit / the same game.
    const gap = kind === 'visit' ? 30 * 60e3 : 60e3;
    for (let i = log.length - 1; i >= 0 && now - new Date(log[i].t).getTime() < gap; i--) {
      if (log[i].kind === kind && log[i].label === (label || '')) return;
    }
    log.push({ t: new Date(now).toISOString(), ok: true, kind, topic: '', source: 'activity', label: String(label || '').slice(0, 140), ...(extra || {}) });
    ldSaveLog(studentId, log);
  } catch (e) { /* the log must never break a game */ }
}

// The last days with something done, newest first: [{ key, date, items }]
// where items are { t, icon, text } — answers in a row from the same game
// become one line ("Balloon Pop · 8 answers, 6 right").
function ldActivityDays(studentId, maxDays) {
  const log = ldLoadLog(studentId).slice().sort((a, b) => new Date(a.t) - new Date(b.t));
  const byDay = new Map();
  log.forEach(a => {
    const key = ldDayKey(a.t);
    if (!byDay.has(key)) byDay.set(key, []);
    const items = byDay.get(key);
    const last = items[items.length - 1];
    if (a.kind === 'visit') { items.push({ t: a.t, kind: 'visit', text: a.label }); return; }
    if (a.kind === 'play') {
      // The answers just before belong to this game: fold them in.
      if (last && last.kind === 'answers' && new Date(a.t) - new Date(last.end) < 15 * 60e3) {
        last.kind = 'play'; last.text = a.label || last.text; last.end = a.t; last.stars = a.stars;
      } else items.push({ t: a.t, end: a.t, kind: 'play', text: a.label, n: 0, right: 0, stars: a.stars });
      return;
    }
    const topic = a.topic || a.source || '';
    if (last && last.kind === 'answers' && last.topic === topic && new Date(a.t) - new Date(last.end) < 15 * 60e3) {
      last.n++; if (a.ok) last.right++; last.end = a.t; return;
    }
    items.push({ t: a.t, end: a.t, kind: 'answers', topic, text: topic, n: 1, right: a.ok ? 1 : 0 });
  });
  return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, maxDays || 7)
    .map(([key, items]) => ({ key, date: new Date(items[0].t), items }));
}
