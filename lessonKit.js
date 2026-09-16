/* ==========================================================================
   IGenglishschool — Lesson Kit
   ==========================================================================
   Everything a student needs to actually LEARN a topic on their own, not
   just play with its vocabulary:

     📺 Watch   — an explainer video, the topic's rule cards, key phrases
     📝 Quiz    — a fixed 10-question exercise with a score and a review
     🧩 Unscramble — build the sentence by tapping its words in order
     🎯 Sort It — drop each example under the rule it follows
                  (I → am, He/She/It → is, You/We/They → are)

   -------------------------------------------------------------------------
   WHERE THE CONTENT COMES FROM
   -------------------------------------------------------------------------
   Every one of those works for all 57 topics, because each resolver falls
   back through three layers:

     1. what the topic authored in topicsData.js  (best — real writing)
     2. what the teacher edited in the app        (ContentStore, same as the
                                                   rest of the curriculum)
     3. what can be generated from the topic's own words / reading text
        (always available, so a brand-new topic is never empty)

   Layers 1 and 2 are the same object: the new fields live ON the topic, so
   ContentStore's patch/merge and the Supabase sync carry them for free.

   -------------------------------------------------------------------------
   NEW OPTIONAL TOPIC FIELDS (all of them degrade gracefully)
   -------------------------------------------------------------------------
     video: {
       youtubeId: string,   // the 11-char id, NOT the whole URL
       title: string,
       channel?: string,
     }

     rules: [                // the heart of a grammar topic
       {
         label: string,       // 'I'            — what the rule applies to
         form: string,        // 'am'           — the form it takes
         hint?: string,       // one line in plain English
         examples: string[],  // full sentences that CONTAIN `form`
       },
     ]

     sort?: {                // overrides the Sort It game built from `rules`
       prompt: string,
       buckets: string[],
       items: [{ text: string, bucket: string }],
     }

     practiceSentences?: string[]   // extra sentences for Unscramble

     quiz?: [                // overrides/leads the generated 10
       { prompt, options: string[], correct: string, explain?: string },
     ]
   ========================================================================== */

// ---------------------------------------------------------------------------
// SEEDED RANDOM — the 10-question quiz has to be the SAME 10 questions every
// time a student opens it (that is what "an exercise" means, and it lets the
// teacher look at what was asked). So nothing here uses Math.random: every
// pick is derived from the topic's id.
// ---------------------------------------------------------------------------
function lkSeedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function lkRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lkShuffleSeeded(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const lkEsc = (s) => igEscapeHtml(s);

// ---------------------------------------------------------------------------
// RESOLVERS
// ---------------------------------------------------------------------------

// A YouTube id can be pasted as a bare id, a watch URL, a youtu.be link, an
// embed URL or a share link with tracking junk on the end. Teachers will do
// all five, so reduce whatever arrives to the 11-character id.
function lkYoutubeId(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  const m = v.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}

function lkVideo(topic) {
  const v = topic && topic.video;
  if (!v) return null;
  const id = lkYoutubeId(v.youtubeId || v.id || v.url);
  if (!id) return null;
  return {
    youtubeId: id,
    title: String(v.title || '').trim() || topic.title,
    channel: String(v.channel || '').trim(),
  };
}

// The rule cards. Grammar topics author them; everything else gets nothing
// here, and the Watch tab simply shows the grammar tip and key phrases
// instead — an empty rule list is a normal state, not a missing one.
function lkRules(topic) {
  const rules = (topic && Array.isArray(topic.rules)) ? topic.rules : [];
  return rules
    .map(r => ({
      label: String(r.label || '').trim(),
      form: String(r.form || '').trim(),
      hint: String(r.hint || '').trim(),
      examples: (Array.isArray(r.examples) ? r.examples : []).map(e => String(e || '').trim()).filter(Boolean),
    }))
    .filter(r => r.label && r.examples.length);
}

// Sort It's board. Authored `sort` wins; otherwise the rules ARE the board —
// one bucket per rule, and every example sentence becomes an item with its
// form blanked out, which is exactly the "I → am, he → is" drill.
function lkSort(topic) {
  if (topic && topic.sort && Array.isArray(topic.sort.items) && topic.sort.items.length >= 4) {
    const buckets = (topic.sort.buckets || []).map(b => String(b).trim()).filter(Boolean);
    const items = topic.sort.items
      .map(i => ({ text: String(i.text || '').trim(), bucket: String(i.bucket || '').trim() }))
      .filter(i => i.text && buckets.includes(i.bucket));
    if (buckets.length >= 2 && items.length >= 4) {
      return { prompt: String(topic.sort.prompt || '').trim() || 'Where does each one go?', buckets, items };
    }
  }

  const rules = lkRules(topic).filter(r => r.form);
  if (rules.length < 2) return null;

  // Some rule cards describe a PATTERN rather than a word you can drop into a
  // sentence — "-ed", "the most", "perfect continuous". Those read well on the
  // Watch tab but cannot be blanked out, so they produce no items. Buckets are
  // therefore taken from the items that actually got made, never from the rule
  // list, or the board would show a column nothing can ever land in.
  const items = [];
  rules.forEach(rule => {
    rule.examples.forEach(ex => {
      const blanked = lkBlankOut(ex, rule.form);
      if (blanked) items.push({ text: blanked, bucket: rule.form });
    });
  });

  const buckets = [...new Set(items.map(i => i.bucket))];
  if (buckets.length < 2 || items.length < 4) return null;
  return { prompt: 'Which one completes each sentence?', buckets, items };
}

// Replace the first whole-word occurrence of `form` with a blank. Returns ''
// when the form isn't actually in the sentence — an example that doesn't
// contain its own form would produce an unanswerable item.
function lkBlankOut(sentence, form) {
  const f = String(form || '').trim();
  if (!f) return '';
  const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^A-Za-z'])(${escaped})(?![A-Za-z'])`, 'i');
  if (!re.test(sentence)) return '';
  return sentence.replace(re, '$1____');
}

// Sentences for Unscramble. Real writing first (the reading text is authored
// per topic), then rule examples, then anything the topic added by hand.
// Filtered to lengths a student can actually rebuild by tapping.
function lkSentences(topic) {
  const out = [];
  const push = (s) => {
    const t = String(s || '').trim().replace(/\s+/g, ' ');
    if (!t) return;
    const words = t.split(' ');
    if (words.length < 3 || words.length > 9) return;
    if (out.some(x => x.toLowerCase() === t.toLowerCase())) return;
    out.push(t);
  };

  (Array.isArray(topic.practiceSentences) ? topic.practiceSentences : []).forEach(push);
  lkRules(topic).forEach(r => r.examples.forEach(push));
  if (topic.readingTime && topic.readingTime.text) {
    lkReadingSentences(topic).forEach(push);
  }
  return out;
}

// learning.js's splitter returns { text, glossaryWord, grammarTerm } objects,
// not strings — everything here wants the bare sentence.
function lkReadingSentences(topic) {
  if (!topic.readingTime || !topic.readingTime.text) return [];
  if (typeof lmSentencesFromText !== 'function') return [];
  return lmSentencesFromText(topic.readingTime.text)
    .map(s => (typeof s === 'string' ? s : (s && s.text) || ''))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// THE 10-QUESTION EXERCISE
// ---------------------------------------------------------------------------
// Built from whatever the topic actually has, in quality order. Authored
// questions lead; the generators behind them guarantee a full set of 10 for
// every topic in the curriculum, including ones added tomorrow.
const LK_QUIZ_LENGTH = 10;

function lkQuiz(level, topic) {
  const rnd = lkRng(lkSeedFrom(`${level ? level.id : ''}:${topic.id}:quiz`));
  const seen = new Set();
  const out = [];

  const add = (q) => {
    if (!q || out.length >= LK_QUIZ_LENGTH) return;
    const opts = (q.options || []).map(o => String(o).trim()).filter(Boolean);
    if (opts.length < 2) return;
    if (new Set(opts.map(o => o.toLowerCase())).size !== opts.length) return;
    if (!opts.includes(String(q.correct).trim())) return;
    const key = String(q.prompt).trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      prompt: String(q.prompt).trim(),
      options: lkShuffleSeeded(opts, rnd),
      correct: String(q.correct).trim(),
      explain: String(q.explain || '').trim(),
    });
  };

  lkAuthoredQuestions(topic).forEach(add);
  lkRuleQuestions(topic, rnd).forEach(add);
  lkReadingQuestions(topic).forEach(add);
  lkVocabQuestions(topic, rnd).forEach(add);
  lkGapQuestions(topic, rnd).forEach(add);
  lkSpellingQuestions(topic, rnd).forEach(add);

  return out;
}

function lkAuthoredQuestions(topic) {
  return (Array.isArray(topic.quiz) ? topic.quiz : [])
    .filter(q => q && q.prompt && Array.isArray(q.options));
}

// The best generated questions in the app: a real example sentence with its
// grammar form blanked out, answered from the topic's own set of forms.
function lkRuleQuestions(topic, rnd) {
  const rules = lkRules(topic).filter(r => r.form);
  const forms = [...new Set(rules.map(r => r.form))];
  if (forms.length < 2) return [];

  const qs = [];
  rules.forEach(rule => {
    rule.examples.forEach(ex => {
      const blanked = lkBlankOut(ex, rule.form);
      if (!blanked) return;
      const distractors = forms.filter(f => f.toLowerCase() !== rule.form.toLowerCase());
      qs.push({
        prompt: blanked,
        options: [rule.form, ...lkShuffleSeeded(distractors, rnd).slice(0, 3)],
        correct: rule.form,
        explain: rule.hint || `${rule.label} → ${rule.form}`,
      });
    });
  });
  return lkShuffleSeeded(qs, rnd);
}

function lkReadingQuestions(topic) {
  const qs = (topic.readingTime && topic.readingTime.questions) || [];
  return qs.filter(q => q && q.prompt && Array.isArray(q.options) && q.correct);
}

// Vocabulary both ways round. Only words that carry a translation take part —
// a wrong-looking option pair teaches nothing.
function lkVocabQuestions(topic, rnd) {
  const withPt = (topic.words || []).filter(w => w.en && w.pt);
  if (withPt.length < 4) return [];

  const qs = [];
  lkShuffleSeeded(withPt, rnd).forEach((w, i) => {
    const others = withPt.filter(o => o.id !== w.id);
    const pool = lkShuffleSeeded(others, rnd).slice(0, 3);
    if (pool.length < 3) return;
    if (i % 2 === 0) {
      qs.push({
        prompt: `What does "${w.en}" mean?`,
        options: [w.pt, ...pool.map(o => o.pt)],
        correct: w.pt,
      });
    } else {
      qs.push({
        prompt: `How do you say "${w.pt}" in English?`,
        options: [w.en, ...pool.map(o => o.en)],
        correct: w.en,
      });
    }
  });
  return qs;
}

// A word from the topic taken out of a sentence in its own reading text.
function lkGapQuestions(topic, rnd) {
  if (!topic.readingTime || !topic.readingTime.text) return [];
  const sentences = lkReadingSentences(topic);
  const words = (topic.words || []).map(w => String(w.en || '').trim()).filter(w => w && !w.includes(' '));
  if (words.length < 4) return [];

  const qs = [];
  sentences.forEach(sentence => {
    const hit = words.find(w => lkBlankOut(sentence, w));
    if (!hit) return;
    const distractors = lkShuffleSeeded(words.filter(w => w.toLowerCase() !== hit.toLowerCase()), rnd).slice(0, 3);
    if (distractors.length < 3) return;
    qs.push({
      prompt: lkBlankOut(sentence, hit),
      options: [hit, ...distractors],
      correct: hit,
    });
  });
  return lkShuffleSeeded(qs, rnd);
}

// Last resort, and still a real skill: which of these is spelled correctly?
function lkSpellingQuestions(topic, rnd) {
  const words = (topic.words || [])
    .map(w => String(w.en || '').trim())
    .filter(w => w.length >= 4 && /^[A-Za-z']+$/.test(w));

  const qs = [];
  lkShuffleSeeded(words, rnd).forEach(word => {
    const wrong = lkMisspell(word, rnd);
    if (wrong.length < 2) return;
    qs.push({
      prompt: 'Which spelling is correct?',
      options: [word, ...wrong],
      correct: word,
    });
  });
  // One is plenty — ten spelling questions in a row is not an exercise.
  return qs.slice(0, 1);
}

function lkMisspell(word, rnd) {
  const out = new Set();
  const lower = word.toLowerCase();
  const vowels = 'aeiou';

  // double a consonant
  for (let i = 1; i < word.length && out.size < 2; i++) {
    if (!vowels.includes(lower[i]) && lower[i] !== lower[i - 1]) {
      out.add(word.slice(0, i) + word[i] + word.slice(i));
      break;
    }
  }
  // swap a vowel
  for (let i = 0; i < word.length && out.size < 3; i++) {
    if (vowels.includes(lower[i])) {
      const alt = vowels[(vowels.indexOf(lower[i]) + 1 + Math.floor(rnd() * 3)) % vowels.length];
      if (alt !== lower[i]) out.add(word.slice(0, i) + alt + word.slice(i + 1));
      break;
    }
  }
  // swap two neighbours
  if (word.length > 3 && out.size < 3) {
    const i = 1;
    out.add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
  }
  return [...out].filter(w => w.toLowerCase() !== lower).slice(0, 3);
}

// ---------------------------------------------------------------------------
// 📺 WATCH — video + rules + key phrases
// ---------------------------------------------------------------------------
function renderWatchStation(container, level, topic) {
  const video = lkVideo(topic);
  const rules = lkRules(topic);
  const searchUrl = 'https://www.youtube.com/results?search_query='
    + encodeURIComponent(`${topic.title.replace(/^Grammar:\s*/i, '')} English lesson for students`);

  const videoHTML = video ? `
    <div class="watch-player">
      <iframe
        src="https://www.youtube-nocookie.com/embed/${lkEsc(video.youtubeId)}?rel=0&modestbranding=1"
        title="${lkEsc(video.title)}"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>
    <p class="watch-caption">
      <strong>${lkEsc(video.title)}</strong>
      ${video.channel ? `<span class="watch-channel">${lkEsc(video.channel)}</span>` : ''}
    </p>
  ` : `
    <div class="watch-empty">
      <span class="watch-empty-icon">📺</span>
      <p>No video picked for this topic yet. Open the <strong>🧩 Content &amp; Games Editor</strong>
         and paste any YouTube link to set one.</p>
    </div>
  `;

  container.innerHTML = `
    <div class="watch-station">
      <section class="watch-video">
        ${videoHTML}
        <a class="game-btn secondary watch-more" href="${lkEsc(searchUrl)}" target="_blank" rel="noopener">
          🔎 More videos on YouTube
        </a>
      </section>

      ${topic.grammarTip ? `
        <section class="watch-tip">
          <span class="watch-tip-icon">💡</span>
          <p>${lkEsc(topic.grammarTip)}</p>
        </section>
      ` : ''}

      ${rules.length ? `
        <section class="watch-rules">
          <h4 class="watch-h">📐 The rule</h4>
          <div class="rule-cards">
            ${rules.map(r => `
              <div class="rule-card">
                <div class="rule-card-head">
                  <span class="rule-label">${lkEsc(r.label)}</span>
                  <span class="rule-arrow">→</span>
                  <span class="rule-form">${lkEsc(r.form)}</span>
                </div>
                ${r.hint ? `<p class="rule-hint">${lkEsc(r.hint)}</p>` : ''}
                <ul class="rule-examples">
                  ${r.examples.slice(0, 3).map(e => `
                    <li><button class="rule-example" data-say="${lkEsc(e)}">${lkHighlight(e, r.form)}<span class="rule-say">🔊</span></button></li>
                  `).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <section class="watch-phrases">
        <h4 class="watch-h">🗣️ Key words &amp; phrases</h4>
        <div class="phrase-chips">
          ${(topic.words || []).slice(0, 16).map(w => `
            <button class="phrase-chip" data-say="${lkEsc(w.en)}">
              ${igWordVisualHTML(w, 'phrase-visual')}
              <span class="phrase-en">${lkEsc(w.en)}</span>
              ${w.pt ? `<span class="phrase-pt">${lkEsc(w.pt)}</span>` : ''}
            </button>
          `).join('')}
        </div>
      </section>

      <p class="watch-next">Ready? Try the <strong>🎮 Game</strong> tab to practise, then <strong>📝 Quiz</strong> to check yourself.</p>
    </div>
  `;

  container.querySelectorAll('[data-say]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof lmSpeak === 'function') lmSpeak(btn.dataset.say, 0.85);
    });
  });
}

// Bold the form inside its example so the pattern is visible at a glance.
function lkHighlight(sentence, form) {
  const safe = lkEsc(sentence);
  const f = String(form || '').trim();
  if (!f) return safe;
  const escaped = lkEsc(f).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(`(^|[^A-Za-z'])(${escaped})(?![A-Za-z'])`, 'i'), '$1<mark>$2</mark>');
}

// ---------------------------------------------------------------------------
// 📝 QUIZ — the 10-question exercise
// ---------------------------------------------------------------------------
function renderTopicQuiz(container, level, topic) {
  const questions = lkQuiz(level, topic);

  if (questions.length === 0) {
    container.innerHTML = `<p class="quiz-empty">This topic needs a few more words before an exercise can be built from it.</p>`;
    return;
  }

  let index = 0;
  let correct = 0;
  const answers = [];      // {q, chosen, right}

  function paintQuestion() {
    const q = questions[index];
    container.innerHTML = `
      <div class="ex-shell">
        <div class="ex-head">
          <span class="ex-count">Question ${index + 1} of ${questions.length}</span>
          <span class="ex-score">${correct} correct</span>
        </div>
        <div class="ex-bar"><div class="ex-bar-fill" style="width:${(index / questions.length) * 100}%"></div></div>

        <p class="ex-prompt">${lkEsc(q.prompt)}</p>
        <div class="ex-options">
          ${q.options.map((o, i) => `<button class="ex-option" data-opt="${i}">${lkEsc(o)}</button>`).join('')}
        </div>
        <p class="ex-feedback" id="exFeedback" hidden></p>
        <div class="game-btn-row ex-actions">
          <button class="btn btn-primary" id="exNext" hidden>${index + 1 === questions.length ? 'See my score →' : 'Next question →'}</button>
        </div>
      </div>
    `;

    const feedback = container.querySelector('#exFeedback');
    const nextBtn = container.querySelector('#exNext');

    container.querySelectorAll('.ex-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const chosen = q.options[Number(btn.dataset.opt)];
        const right = chosen === q.correct;
        answers.push({ q, chosen, right });
        if (right) correct++;

        container.querySelectorAll('.ex-option').forEach(b => {
          b.disabled = true;
          if (q.options[Number(b.dataset.opt)] === q.correct) b.classList.add('correct');
        });
        if (!right) btn.classList.add('wrong');

        feedback.hidden = false;
        feedback.className = `ex-feedback ${right ? 'good' : 'bad'}`;
        feedback.textContent = right
          ? (q.explain ? `Correct! ${q.explain}` : 'Correct! 🎉')
          : `Not quite — the answer is "${q.correct}".${q.explain ? ' ' + q.explain : ''}`;

        nextBtn.hidden = false;
        nextBtn.focus();
      });
    });

    nextBtn.addEventListener('click', () => {
      index++;
      if (index < questions.length) paintQuestion();
      else paintResult();
    });
  }

  function paintResult() {
    const pct = Math.round((correct / questions.length) * 100);
    const stars = correct === questions.length ? 3 : correct >= questions.length * 0.7 ? 2 : correct >= questions.length * 0.5 ? 1 : 0;
    const wrong = answers.filter(a => !a.right);

    if (typeof awardProgress === 'function') awardProgress(correct * 5, stars);

    container.innerHTML = `
      <div class="ex-shell">
        <div class="ex-result ${pct >= 70 ? 'good' : ''}">
          <span class="ex-result-emoji">${pct === 100 ? '🏆' : pct >= 70 ? '🎉' : '💪'}</span>
          <h3>${correct} / ${questions.length}</h3>
          <p>${pct === 100 ? 'Perfect score! You know this topic.'
              : pct >= 70 ? 'Well done — nearly there.'
              : 'Good try. Watch the video again and have another go.'}</p>
          ${stars ? `<p class="ex-stars">${'⭐'.repeat(stars)} <span>+${correct * 5} XP</span></p>` : `<p class="ex-stars"><span>+${correct * 5} XP</span></p>`}
        </div>

        ${wrong.length ? `
          <div class="ex-review">
            <h4 class="watch-h">📌 Review these</h4>
            ${wrong.map(a => `
              <div class="ex-review-item">
                <p class="ex-review-q">${lkEsc(a.q.prompt)}</p>
                <p class="ex-review-a"><span class="bad">${lkEsc(a.chosen)}</span> → <span class="good">${lkEsc(a.q.correct)}</span></p>
                ${a.q.explain ? `<p class="ex-review-why">${lkEsc(a.q.explain)}</p>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="game-btn-row ex-actions">
          <button class="btn btn-primary" id="exRetry">🔄 Try again</button>
        </div>
      </div>
    `;

    container.querySelector('#exRetry').addEventListener('click', () => {
      index = 0; correct = 0; answers.length = 0;
      paintQuestion();
    });
  }

  paintQuestion();
}
