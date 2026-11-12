/* ==========================================================================
   IGenglishschool — Class review: examples at the student's level, and
   practice with spaced repetition (classReview.js holds the flashcards).

   1. EXAMPLES. A card's sentences come first from the class itself (the
      phrases and texts on the class sheet), then from the course: every
      topic's practice sentences and reading dialogue, the student's level
      first. Only then a ready-made pattern fills the gap, and for learners
      of 14+ those patterns are adult ones ("I need a new phone.", not
      "I can see a phone."). Old reviews get the extra examples on screen too.

   2. PRACTICE. Every word of every class review gets a memory schedule
      (Leitner boxes: again today, 1, 3, 7, 14, 30 days). "Practice" serves
      the words due today plus a few new ones, and the exercise gets harder
      as the word climbs: meaning → gap fill → put the sentence in order →
      type the word. A wrong answer sends it back to the start and it comes
      back later in the same round.

      The schedule is kept in the student's error bank (learnerData.js),
      under keys "rv|word" with no `item`, so it travels with the bank
      between the student's link and the teacher (share.js, cloud.js) while
      "My mistakes", the reports and the insights, which only read entries
      with an `item`, never see it.
   ========================================================================== */

const RP_LEVELS = ['a0', 'a1', 'a2', 'b1', 'b1b2'];
const RP_DAYS = [0, 1, 3, 7, 14, 30];
const RP_STRONG = 4;                 // box from which a word counts as "strong"
const RP_ROUND = 10;                 // words per practice round
const RP_NEW_MAX = 6;                // of which new at most

const rpSay = (pt, en) => (typeof igSay === 'function' ? igSay(pt, en) : pt);
const rpEsc = s => (typeof igEscapeHtml === 'function' ? igEscapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s));
const rpNorm = s => (typeof rvNorm === 'function' ? rvNorm(s) : String(s || '').toLowerCase().trim());
const rpShuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

function rpLevelIdx(student) {
  const i = RP_LEVELS.indexOf(student && student.levelId);
  return i < 0 ? 1 : i;
}
function rpGrown(student) {
  return typeof igGrownLook === 'function' ? igGrownLook(student) : Number(student && student.age) >= 14;
}
// Longest example that still reads easily at each level (in words).
const RP_MAX_WORDS = [8, 11, 15, 20, 26];

// ---------------------------------------------------------------------------
// 1. EXAMPLES
// ---------------------------------------------------------------------------
const RP_QUESTION_START = /^(do|does|did|is|are|was|were|can|could|will|would|have|has|should|what|where|when|who|why|how|which)\b/i;
function rpTidySentence(s) {
  let t = String(s || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/^[A-Z][\w .'-]{0,20}:\s+/, '');          // "Marta: Do you…" → "Do you…"
  if (!t) return '';
  if (!/[.!?…"”'’]$/.test(t)) t += RP_QUESTION_START.test(t) ? '?' : '.';
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function rpSplitSentences(text) {
  return String(text || '').split(/\n+/)
    .flatMap(line => line.replace(/^[A-Z][\w .'-]{0,20}:\s+/, '').split(/(?<=[.!?])\s+(?=[A-Z"“])/))
    .map(rpTidySentence)
    .filter(s => { const n = s.split(' ').length; return n >= 3 && n <= 28; });
}

let rpCorpusCache = null;
function rpCorpus() {
  if (rpCorpusCache) return rpCorpusCache;
  const out = [];
  const seen = new Set();
  const add = (s, lvl, topic) => {
    const t = rpTidySentence(s);
    const k = t.toLowerCase();
    if (!t || seen.has(k)) return;
    seen.add(k);
    out.push({ s: t, lvl, topic, words: t.split(' ').length });
  };
  (typeof LEVELS !== 'undefined' ? LEVELS : []).forEach(level => {
    const lvl = Math.max(0, RP_LEVELS.indexOf(level.id));
    (level.topics || []).forEach(t => {
      (t.practiceSentences || []).forEach(s => add(s, lvl, t.title));
      if (t.readingTime && t.readingTime.text) rpSplitSentences(t.readingTime.text).forEach(s => add(s, lvl, t.title));
    });
  });
  rpCorpusCache = out;
  return out;
}

const rpEscRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// The word itself, or with a regular ending: travel → travels, traveled…
// "popcorn / corn": either one.
const rpAlts = word => String(word || '').split(/\s*\/\s*/).map(x => x.trim().replace(/[.!?]+$/, '')).filter(Boolean);
function rpWordRe(word, exact) {
  const alts = rpAlts(word);
  if (!alts.length) return null;
  const one = w => `${rpEscRe(w)}${exact || /\s/.test(w) ? '' : '(?:s|es|ed|d|ing)?'}`;
  return new RegExp(`(^|[^A-Za-z'])(${alts.map(one).join('|')})(?![A-Za-z])`, 'i');
}

// Sentences from the class itself: the phrases / texts of the class sheet.
function rpClassText(session) {
  if (!session || !session.sheet) return [];
  return rpSplitSentences(session.sheet.text || '');
}

// Up to `max` real examples with the word, closest to the student's level.
function rpExamples(word, student, session, max) {
  const re = rpWordRe(word);
  if (!re) return [];
  const lvl = rpLevelIdx(student);
  const limit = RP_MAX_WORDS[lvl] || 15;
  const picked = [];
  const take = s => { if (picked.length < max && !picked.some(p => p.toLowerCase() === s.toLowerCase())) picked.push(s); };
  rpClassText(session).filter(s => re.test(s)).forEach(take);
  rpCorpus()
    .filter(c => c.words <= limit && c.lvl <= lvl + 1 && re.test(c.s))
    .sort((a, b) => Math.abs(a.lvl - lvl) - Math.abs(b.lvl - lvl) || a.words - b.words)
    .forEach(c => take(c.s));
  // Few examples at this level: a little longer, a level further.
  if (picked.length < 2) {
    rpCorpus()
      .filter(c => c.words <= limit + 6 && c.lvl <= lvl + 2 && re.test(c.s))
      .sort((a, b) => a.words - b.words)
      .forEach(c => take(c.s));
  }
  return picked;
}

// Ready-made sentences for learners of 14+, by level.
function rpAdultPatterns(word, lvl) {
  const w = String(word || '').trim();
  const k = rpNorm(w);
  const lw = /^[A-Z][a-z]/.test(w) && !/^[A-Z]{2}/.test(w) ? w.toLowerCase() : w;
  const art = /^[aeiou]/i.test(lw) ? 'an' : 'a';
  const S = typeof RV_SETS !== 'undefined' ? RV_SETS : {};
  const is = set => (S[set] || []).includes(k);
  const up = lvl >= 2;
  if (/^to\s/i.test(w) || k.split(' ').length >= 3) return [`${lw.charAt(0).toUpperCase()}${lw.slice(1)}${/[.!?]$/.test(lw) ? '' : '.'}`];
  if (is('feeling')) return [`I feel ${k} today.`, `Why are you ${k}?`, up ? `I was really ${k} last week.` : `Are you ${k} now?`];
  if (is('weather')) return [`It's ${k} today.`, `Is it ${k} in your city?`, up ? `It was ${k} all weekend.` : `I don't like it when it's ${k}.`];
  if (is('color')) return [`My favorite color is ${k}.`, `Do you have a ${k} T-shirt?`, `I don't like ${k} cars.`];
  if (is('family')) return [`This is my ${k}.`, `How old is your ${k}?`, up ? `I talked to my ${k} yesterday.` : `My ${k} lives near me.`];
  if (is('number')) return [`I have ${k} classes this week.`, `It costs ${k} dollars.`];
  if (is('place')) return [`Is there a ${k} near here?`, `I go to the ${k} every week.`, up ? `I went to the ${k} last weekend.` : `Where is the ${k}?`];
  if (is('uncountable')) return [`I like ${k}.`, `Do you want some ${k}?`, up ? `I'm trying to have less ${k}.` : `I don't have any ${k}.`];
  const base = k.replace(/^to\s+/, '');
  if ((S.verb || []).includes(base)) {
    return lvl <= 1
      ? [`I ${base} every day.`, `Do you ${base} on weekends?`, `I don't ${base} very often.`]
      : [`How often do you ${base}?`, `I'm going to ${base} this weekend.`, `I want to ${base} more this year.`];
  }
  if (is('adjective')) return [`It's very ${k}.`, `Is it ${k}?`, up ? `I think it's a bit too ${k}.` : `It isn't ${k}.`];
  if (/\s/.test(k) && !(typeof reviewLookup === 'function' && reviewLookup(w))) return [`${lw.charAt(0).toUpperCase()}${lw.slice(1)}${/[.!?]$/.test(lw) ? '' : '.'}`];
  // Any other word: noun or verb, we can't tell, so no made-up example.
  return null;
}
// For a word with no real example and no known kind: true, if plain.
const rpNeutral = w => [`I learned the word "${w}" in class.`, `Can you make a sentence with "${w}"?`];

// The sentences of a new card: the class and the course first, then patterns.
// Children keep their two short sayable sentences (classReview.js).
function rpSentencesFor(word, student, session) {
  if (!rpGrown(student)) {
    const kids = typeof reviewSentences === 'function' ? reviewSentences(word) : [];
    const real = rpExamples(word, student, session, 1).filter(s => s.split(' ').length <= 8);
    return [...new Set(real.concat(kids))].slice(0, 3);
  }
  const lvl = rpLevelIdx(student);
  const real = rpExamples(word, student, session, 3);
  const out = real.slice();
  const patterns = rpAdultPatterns(word, lvl);
  // Real sentences first; patterns only for kinds of words we know.
  const room = patterns ? (real.length >= 3 ? 1 : 4 - real.length) : (real.length ? 0 : 2);
  (patterns || rpNeutral(String(word).trim())).slice(0, room).forEach(s => { if (!out.some(o => o.toLowerCase() === s.toLowerCase())) out.push(s); });
  return out.slice(0, 4);
}

// Sentences a card shows: its own, plus real examples on screen for older
// cards that were made with two sentences only (nothing is saved).
function rpCardSentences(card, student) {
  let own = (card.sentences || []).filter(Boolean);
  // Cards made before this file got the children's patterns ("I can see an
  // interview."): for 14+ those untouched ones give way to the new examples.
  if (card.type !== 'phrase' && rpGrown(student) && typeof reviewSentences === 'function'
    && own.join('|') === reviewSentences(card.en).join('|')) own = rpSentencesFor(card.en, student, null);
  if (card.type === 'phrase' || !rpGrown(student) || own.length >= 4) return own;
  const more = rpExamples(card.en, student, null, 4).filter(s => !own.some(o => o.toLowerCase() === s.toLowerCase()));
  return own.concat(more).slice(0, 4);
}

// Longer chunks to remember: the class sheet's own sentences become cards.
function rpPhraseCards(session, student, max) {
  if (!rpGrown(student)) return [];
  const lvl = rpLevelIdx(student);
  return rpClassText(session)
    .filter(s => { const n = s.split(' ').length; return n >= 4 && n <= Math.max(12, RP_MAX_WORDS[lvl]); })
    .slice(0, max || 3)
    .map(s => ({ en: s, type: 'phrase' }));
}

// ---------------------------------------------------------------------------
// 2. MEMORY — the schedule of each word, in the error bank
// ---------------------------------------------------------------------------
const rpKey = en => `rv|${rpNorm(en)}`;
function rpMemory(studentId) {
  if (typeof ldLoadBank !== 'function' || !studentId) return {};
  const bank = ldLoadBank(studentId);
  const out = {};
  Object.keys(bank).forEach(k => { if (k.indexOf('rv|') === 0 && bank[k] && !bank[k].item) out[k] = bank[k]; });
  return out;
}
function rpSaveAnswer(studentId, card, ok) {
  if (typeof ldLoadBank !== 'function' || !studentId) return null;
  const bank = ldLoadBank(studentId);
  const key = rpKey(card.en);
  const now = new Date().toISOString();
  const m = bank[key] && !bank[key].item ? bank[key] : { key, box: 0, right: 0, wrong: 0, added: now };
  m.rv = { en: card.en, pt: card.pt || '', type: card.type || 'word' };
  if (ok) { m.right++; m.box = Math.min(RP_DAYS.length - 1, (m.box || 0) + 1); }
  else { m.wrong++; m.box = 0; }
  m.last = now;
  m.due = typeof ldPlusDays === 'function' ? ldPlusDays(RP_DAYS[m.box]) : now;
  bank[key] = m;
  ldSaveBank(studentId, bank);
  return m;
}
const rpIsDue = m => !m.due || new Date(m.due).getTime() <= Date.now();

// Every card of every class review of the student, newest class first.
function rpAllCards(studentId) {
  const reviews = typeof loadReviews === 'function' ? Object.values(loadReviews(studentId)) : [];
  const seen = new Set();
  const out = [];
  reviews.filter(r => r && Array.isArray(r.cards))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .forEach(r => r.cards.forEach(c => {
      const k = rpKey(c.en);
      if (!c.en || seen.has(k)) return;
      seen.add(k);
      out.push({ ...c, from: r.title || '', date: r.date || '' });
    }));
  return out;
}

// What the student has to review: { due, fresh, strong, total, next }.
function rpSummary(studentId) {
  const mem = rpMemory(studentId);
  const cards = rpAllCards(studentId);
  let due = 0, fresh = 0, strong = 0, next = null;
  cards.forEach(c => {
    const m = mem[rpKey(c.en)];
    if (!m) { fresh++; return; }
    if (m.box >= RP_STRONG) strong++;
    if (rpIsDue(m)) due++;
    else if (!next || new Date(m.due) < next) next = new Date(m.due);
  });
  return { due, fresh, strong, total: cards.length, next };
}

// The round: due words (weakest first), then new ones from the latest class.
function rpRound(studentId) {
  const mem = rpMemory(studentId);
  const cards = rpAllCards(studentId);
  const due = cards.filter(c => mem[rpKey(c.en)] && rpIsDue(mem[rpKey(c.en)]))
    .sort((a, b) => (mem[rpKey(a.en)].box - mem[rpKey(b.en)].box) || String(mem[rpKey(a.en)].due).localeCompare(String(mem[rpKey(b.en)].due)));
  const fresh = cards.filter(c => !mem[rpKey(c.en)]);
  const round = due.slice(0, RP_ROUND);
  fresh.slice(0, Math.max(0, Math.min(RP_NEW_MAX, RP_ROUND - round.length))).forEach(c => round.push(c));
  return round.map(c => ({ card: c, box: mem[rpKey(c.en)] ? mem[rpKey(c.en)].box : 0 }));
}

// ---------------------------------------------------------------------------
// 3. EXERCISES
// ---------------------------------------------------------------------------
// A sentence of the card with the word in it, for gap fills.
function rpGapSentence(card, student) {
  const re = rpWordRe(card.en, true);
  const all = rpCardSentences(card, student).concat(rpExamples(card.en, student, null, 4));
  const self = rpAlts(card.en).map(a => a.toLowerCase()).concat(String(card.en).toLowerCase().replace(/[.!?]+$/, ''));
  const fit = all.filter(s => re && re.test(s)
    && s.replace(re, '$1').trim().split(' ').length >= 2              // more than the word itself
    && !self.includes(s.toLowerCase().replace(/[.!?]+$/, ''))         // not the card's own text
    && !/["“][^"”]*["”]/.test(s));                                    // not "the word" in quotes
  return fit.length ? fit[Math.floor(Math.random() * fit.length)] : '';
}
function rpOrderSentence(card, student) {
  if (card.type === 'phrase') return card.en;
  const re = rpWordRe(card.en);
  const fit = rpCardSentences(card, student).filter(s => re && re.test(s) && s.split(' ').length >= 4 && s.split(' ').length <= 12);
  return fit.length ? fit[Math.floor(Math.random() * fit.length)] : '';
}
function rpDistractors(card, pool, field, n) {
  const want = String(card[field] || '').toLowerCase();
  const same = pool.filter(c => c[field] && String(c[field]).toLowerCase() !== want && (c.type || 'word') === (card.type || 'word'));
  let out = rpShuffle(same).map(c => (field === 'en' ? rpAlts(c.en)[0] || c.en : c[field]));
  if (out.length < n && typeof reviewVocab === 'function') {
    const extra = rpShuffle([...reviewVocab().values()].map(v => v[field]).filter(e => e && !/\bis for\b/i.test(e) && e.toLowerCase() !== want && e.split(' ').length <= 2));
    out = out.concat(extra);
  }
  return [...new Set(out)].slice(0, n);
}

// Which exercise for this card now: harder as the word climbs.
// Each exercise needs a clue: a meaning, a picture or a sentence. A card
// with none of them is ordered (an expression) or heard and written.
function rpPick(entry, student) {
  const { card, box } = entry;
  const grown = rpGrown(student);
  if (card.type === 'phrase') return box <= 1 ? 'order' : 'gapword';
  // "hotel" = "hotel": a meaning question would give the answer away.
  const hasPt = Boolean(card.pt) && rpNorm(card.pt) !== rpNorm(card.en);
  const hasPic = Boolean(card.image || (card.emoji && card.emoji !== '🖼️'));
  const gap = Boolean(rpGapSentence(card, student));
  const multi = (rpAlts(card.en)[0] || '').split(' ').length > 1;
  const noClue = multi ? 'orderwords' : 'listen';
  if (box === 0) return hasPt || hasPic ? 'meaning' : gap ? 'gap' : noClue;
  if (box === 1) return gap ? 'gap' : hasPt || hasPic ? 'meaning' : noClue;
  if (!grown) return gap ? 'gap' : hasPt || hasPic ? 'meaning' : noClue;
  if (box === 2 && rpOrderSentence(card, student)) return 'order';
  if (box === 2 && multi) return 'orderwords';
  return hasPt || hasPic || gap ? 'type' : noClue;
}

// ---------------------------------------------------------------------------
// 4. THE PRACTICE SCREEN
// ---------------------------------------------------------------------------
function openReviewPractice(student, opts) {
  const o = opts || {};
  if (!student) return;
  const preview = Boolean(o.preview);
  const pool = rpAllCards(student.id);
  let queue = rpRound(student.id);
  const total = queue.length;
  const results = [];             // { card, ok }
  const retried = new Set();
  let current = null;

  const say = text => { if (typeof rvSay === 'function') rvSay(text); };
  const pic = c => (typeof reviewPicHTML === 'function' ? reviewPicHTML(c, 'rv-pic rv-pic--small') : '');
  const sound = name => { try { IGSound[name](); } catch (e) { /* no sound */ } };

  function head() {
    const done = results.length;
    return `<div class="rp-top">
      <div class="rp-bar"><i style="width:${total ? Math.round(Math.min(done, total) / total * 100) : 0}%"></i></div>
      <span class="rp-count">${Math.min(done + 1, total)} / ${total}</span>
    </div>`;
  }

  function finish() {
    const body = document.getElementById('rpBody');
    if (!body) return;
    const right = results.filter(r => r.ok).length;
    const sum = rpSummary(student.id);
    const nextTxt = sum.due ? rpSay(`Ainda há ${sum.due} para hoje`, `${sum.due} still due today`)
      : sum.next ? rpSay(`Próxima revisão: ${sum.next.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`,
        `Next review: ${sum.next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`) : '';
    body.innerHTML = `
      <div class="rv-done">
        <span class="rv-done-emoji">${right >= Math.ceil(total * 0.8) ? '🏆' : '💪'}</span>
        <p class="rv-done-title">${right} / ${total}</p>
        <p class="rv-done-sub">${rpSay('Palavras firmes', 'Strong words')}: ${sum.strong} / ${sum.total}${nextTxt ? ` · ${rpEsc(nextTxt)}` : ''}</p>
        ${results.some(r => !r.ok) ? `<p class="rp-missed">${rpSay('Para rever', 'Keep an eye on')}: ${[...new Set(results.filter(r => !r.ok).map(r => r.card.en))].map(rpEsc).join(' · ')}</p>` : ''}
        <div class="an-done-actions">
          ${sum.due ? `<button class="game-btn" data-rp="again">🔁 ${rpSay('Mais uma rodada', 'One more round')}</button>` : ''}
          ${o.onBack ? `<button class="game-btn secondary" data-rp="back">◀ ${rpSay('Voltar', 'Back')}</button>` : ''}
        </div>
      </div>`;
    if (!preview && typeof awardProgress === 'function') awardProgress(5 + right * 2, right >= Math.ceil(total * 0.8) ? 1 : 0);
    sound('win');
    const again = body.querySelector('[data-rp="again"]');
    if (again) again.addEventListener('click', () => openReviewPractice(student, o));
    const back = body.querySelector('[data-rp="back"]');
    if (back) back.addEventListener('click', o.onBack);
  }

  function answer(ok, shownAnswer) {
    const { card } = current;
    results.push({ card, ok });
    if (!preview) {
      rpSaveAnswer(student.id, card, ok);
      if (typeof ldRecord === 'function') {
        ldRecord({ kind: 'word', prompt: card.en, correct: card.en, topic: 'Class review' }, ok,
          { studentId: student.id, source: 'class-review', skipBank: true });
      }
    }
    // A miss comes back later in the same round, once.
    if (!ok && !retried.has(card.en)) {
      retried.add(card.en);
      queue.splice(Math.min(queue.length, 3), 0, { card, box: 0 });
    }
    sound(ok ? 'correct' : 'wrong');
    const fb = document.getElementById('rpFeedback');
    if (!fb) return;
    const example = rpCardSentences(card, student)[0] || '';
    fb.innerHTML = `
      <div class="rp-fb ${ok ? 'ok' : 'no'}">
        <p class="rp-fb-title">${ok ? `✅ ${rpSay('Isso!', 'Right!')}` : `❌ ${rpSay('Quase!', 'Not quite')} — <b>${rpEsc(shownAnswer || card.en)}</b>`}</p>
        ${card.type !== 'phrase' && example ? `<button class="rv-sentence" data-say-ex>🔊 ${rpEsc(example)}</button>` : ''}
        ${!ok ? `<p class="rp-fb-note">${rpSay('Ela volta daqui a pouco.', 'You\'ll see it again in a moment.')}</p>` : ''}
        <button class="game-btn" data-rp="next">${rpSay('Continuar', 'Continue')} ▶</button>
      </div>`;
    fb.querySelector('[data-rp="next"]').addEventListener('click', next);
    fb.querySelector('[data-rp="next"]').focus();
    const ex = fb.querySelector('[data-say-ex]');
    if (ex) ex.addEventListener('click', () => say(example));
    document.querySelectorAll('#rpBody [data-opt], #rpBody [data-check], #rpBody .rp-tile, #rpBody input').forEach(b => { b.disabled = true; });
  }

  function choiceHTML(options) {
    return `<div class="rp-options">${options.map((op, i) => `<button class="rp-opt" data-opt="${i}">${rpEsc(op)}</button>`).join('')}</div>`;
  }
  function wireChoice(body, options, correct) {
    body.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => {
      const pickd = options[Number(b.dataset.opt)];
      const ok = pickd === correct;
      b.classList.add(ok ? 'ok' : 'no');
      if (!ok) body.querySelectorAll('[data-opt]').forEach(x => { if (options[Number(x.dataset.opt)] === correct) x.classList.add('ok'); });
      answer(ok, correct);
    }));
  }

  function render() {
    const body = document.getElementById('rpBody');
    if (!body) return;
    const { card } = current;
    const kind = rpPick(current, student);
    const base = `${head()}<div class="rp-ex">`;
    const end = `</div><div id="rpFeedback"></div>`;

    if (kind === 'meaning') {
      // English → meaning (Portuguese) when there is one; else picture → word.
      if (card.pt && rpNorm(card.pt) !== rpNorm(card.en)) {
        const opts = rpShuffle([card.pt].concat(rpDistractors(card, pool, 'pt', 3)));
        body.innerHTML = `${base}
          <p class="rp-q">${rpSay('O que significa?', 'What does it mean?')}</p>
          <p class="rp-word">${rpEsc(card.en)} <button class="rp-say" data-say-word aria-label="Listen">🔊</button></p>
          ${choiceHTML(opts)}${end}`;
        wireChoice(body, opts, card.pt);
      } else {
        const opts = rpShuffle([card.en].concat(rpDistractors(card, pool, 'en', 3)));
        body.innerHTML = `${base}
          <p class="rp-q">${rpSay('Qual é a palavra?', 'Which word is it?')}</p>
          <div class="rp-pic">${pic(card)}</div>
          ${choiceHTML(opts)}${end}`;
        wireChoice(body, opts, card.en);
      }
    } else if (kind === 'gap' || kind === 'gapword') {
      let sentence, correct;
      if (kind === 'gapword') {
        // A long phrase: hide one of its longer words.
        sentence = card.en;
        const words = sentence.split(' ').map(w => w.replace(/[^A-Za-z'’-]/g, '')).filter(w => w.length >= 4);
        correct = words.length ? words[Math.floor(Math.random() * words.length)] : sentence.split(' ')[0];
      } else {
        sentence = rpGapSentence(card, student);
        const m = rpWordRe(card.en, true).exec(sentence);
        correct = m ? m[2] : card.en;
      }
      const re = rpWordRe(correct, true);
      const gapped = rpEsc(sentence.replace(re, '$1\u0000')).replace('\u0000', '<span class="rp-gap">_____</span>');
      const grown = rpGrown(student);
      if (kind === 'gapword' && grown) {
        body.innerHTML = `${base}
          <p class="rp-q">${rpSay('Complete a frase', 'Complete the sentence')}</p>
          <p class="rp-sentence">${gapped}</p>
          <form class="rp-type" data-check><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Missing word"/><button class="game-btn" type="submit">${rpSay('Conferir', 'Check')}</button></form>${end}`;
        wireType(body, correct);
      } else {
        const opts = rpShuffle([correct].concat(rpDistractors({ ...card, en: correct }, pool, 'en', 3)));
        body.innerHTML = `${base}
          <p class="rp-q">${rpSay('Complete a frase', 'Complete the sentence')}</p>
          <p class="rp-sentence">${gapped}</p>
          ${choiceHTML(opts)}${end}`;
        wireChoice(body, opts, correct);
      }
    } else if (kind === 'order' || kind === 'orderwords') {
      const sentence = kind === 'orderwords' ? (rpAlts(card.en)[0] || card.en) : (rpOrderSentence(card, student) || card.en);
      const tokens = sentence.split(' ');
      let order = rpShuffle(tokens.map((t, i) => ({ t, i })));
      if (order.every((x, i) => x.i === i) && tokens.length > 1) order = order.reverse();
      const chosen = [];
      body.innerHTML = `${base}
        <p class="rp-q">${kind === 'orderwords' ? rpSay('Monte a expressão', 'Build the expression') : rpSay('Coloque a frase em ordem', 'Put the sentence in order')}</p>
        ${kind === 'orderwords' && card.pt ? `<p class="rp-word rp-word--pt">${rpEsc(card.pt)}</p>` : ''}
        <div class="rp-built" id="rpBuilt" aria-live="polite"></div>
        <div class="rp-tiles">${order.map((x, k) => `<button class="rp-tile" data-tile="${k}">${rpEsc(x.t)}</button>`).join('')}</div>
        <div class="rp-order-actions">
          <button class="game-btn secondary" data-undo>↩ ${rpSay('Desfazer', 'Undo')}</button>
          <button class="game-btn" data-check disabled>${rpSay('Conferir', 'Check')}</button>
        </div>${end}`;
      const built = body.querySelector('#rpBuilt');
      const check = body.querySelector('[data-check]');
      const paintBuilt = () => {
        built.innerHTML = chosen.map(k => `<span>${rpEsc(order[k].t)}</span>`).join(' ');
        body.querySelectorAll('[data-tile]').forEach(b => { b.hidden = chosen.includes(Number(b.dataset.tile)); });
        check.disabled = chosen.length !== tokens.length;
      };
      body.querySelectorAll('[data-tile]').forEach(b => b.addEventListener('click', () => { chosen.push(Number(b.dataset.tile)); sound('flip'); paintBuilt(); }));
      body.querySelector('[data-undo]').addEventListener('click', () => { chosen.pop(); paintBuilt(); });
      check.addEventListener('click', () => {
        const said = chosen.map(k => order[k].t).join(' ');
        answer(said.toLowerCase() === sentence.toLowerCase(), sentence);
      });
    } else if (kind === 'listen') {
      const target = rpAlts(card.en)[0] || card.en;
      body.innerHTML = `${base}
        <p class="rp-q">${rpSay('Ouça e escreva', 'Listen and write')}</p>
        <p class="rp-word"><button class="rp-say rp-say--big" data-say-word aria-label="Listen">🔊</button></p>
        <p class="rp-hint">${rpHint(target)}</p>
        <form class="rp-type" data-check><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer"/><button class="game-btn" type="submit">${rpSay('Conferir', 'Check')}</button></form>${end}`;
      wireType(body, card.en);
      say(target);
    } else {
      // Type the word: from its meaning or picture, with the sentence as a clue.
      const sentence = rpGapSentence(card, student);
      const m = sentence ? rpWordRe(card.en, true).exec(sentence) : null;
      const clue = sentence && m ? rpEsc(sentence.replace(rpWordRe(card.en, true), '$1\u0000')).replace('\u0000', '<span class="rp-gap">_____</span>') : '';
      body.innerHTML = `${base}
        <p class="rp-q">${rpSay('Escreva a palavra', 'Write the word')}</p>
        ${card.pt ? `<p class="rp-word rp-word--pt">${rpEsc(card.pt)}</p>` : card.image || card.emoji ? `<div class="rp-pic">${pic(card)}</div>` : ''}
        ${clue ? `<p class="rp-sentence">${clue}</p>` : ''}
        <p class="rp-hint">${rpHint(m ? m[2] : (rpAlts(card.en)[0] || card.en))}</p>
        <form class="rp-type" data-check><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer"/><button class="game-btn" type="submit">${rpSay('Conferir', 'Check')}</button></form>${end}`;
      wireType(body, m ? m[2] : card.en);
    }
    const sw = body.querySelector('[data-say-word]');
    if (sw) sw.addEventListener('click', () => say(card.en));
    const first = body.querySelector('input, .rp-opt, .rp-tile');
    if (first) first.focus();
  }

  // "Starts with p · 3 words" / "· 5 letters"
  function rpHint(target) {
    const t = String(target || '');
    const n = t.split(' ').length;
    return `${rpSay('Começa com', 'Starts with')} <b>${rpEsc(t.charAt(0))}</b> · ${n > 1 ? `${n} ${rpSay('palavras', 'words')}` : `${t.length} ${rpSay('letras', 'letters')}`}`;
  }

  function wireType(body, correct) {
    const form = body.querySelector('form[data-check]');
    const input = form.querySelector('input');
    const clean = s => String(s || '').toLowerCase().replace(/[’]/g, "'").replace(/[.!?,]+$/, '').replace(/\s+/g, ' ').trim();
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!input.value.trim()) { input.focus(); return; }
      const ok = rpAlts(correct).concat([correct]).some(a => clean(input.value) === clean(a));
      input.classList.add(ok ? 'ok' : 'no');
      answer(ok, correct);
    });
  }

  function next() {
    current = queue.shift();
    if (!current) { finish(); return; }
    render();
  }

  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">🔁</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">${rpSay('Prática da revisão', 'Review practice')}</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">${rpSay('As palavras das suas aulas, na hora certa de lembrar', 'Words from your classes, right when you are about to forget them')}</span></p>
        </div>
      </div>
      ${preview ? `<p class="rv-preview-note">👀 Pré-visualização — nada é salvo.${o.onBack ? ` <button class="rv-link" data-rp="edit">✏️ Voltar à edição</button>` : ''}</p>` : ''}
      <div id="rpBody"></div>
    </div>`, true);
  const edit = document.querySelector('[data-rp="edit"]');
  if (edit && o.onBack) edit.addEventListener('click', o.onBack);
  if (!queue.length) {
    const sum = rpSummary(student.id);
    document.getElementById('rpBody').innerHTML = `
      <div class="rv-done">
        <span class="rv-done-emoji">🌟</span>
        <p class="rv-done-title">${rpSay('Tudo em dia!', 'All caught up!')}</p>
        <p class="rv-done-sub">${sum.total ? `${rpSay('Palavras firmes', 'Strong words')}: ${sum.strong} / ${sum.total}` : rpSay('Ainda não há revisão de aula.', 'No class review yet.')}</p>
      </div>`;
    return;
  }
  next();
}
