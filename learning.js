/* ==========================================================================
   IGenglishschool — Learning Modules
   Reading Time · Practice Arena · Phonics & Blending Station · Flashcards
   ========================================================================== */

// ---------------------------------------------------------------------------
// SHARED HELPERS (small local copies — keeps this file self-contained)
// ---------------------------------------------------------------------------
function lmShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function lmEscape(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function lmWordVisual(word, sizeClass) {
  return igWordVisualHTML(word, sizeClass);
}
function lmSpeak(text, rate) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = rate || 0.9;
  window.speechSynthesis.speak(utter);
}

// ---------------------------------------------------------------------------
// TOPIC CATEGORY MAP — used to build grammatically-safe generated sentences
// regardless of whether a topic's words are nouns, adjectives or phrases.
// ---------------------------------------------------------------------------
const TOPIC_CATEGORY = {
  colors: { noun: 'color', article: 'a' },
  numbers: { noun: 'number', article: 'a' },
  animals: { noun: 'animal', article: 'an' },
  family: { noun: 'family member', article: 'a' },
  body: { noun: 'body part', article: 'a' },
  toys: { noun: 'toy', article: 'a' },
  food: { noun: 'food or drink', article: 'a' },
  routine: { noun: 'daily activity', article: 'a' },
  school: { noun: 'school item', article: 'a' },
  weather: { noun: 'weather word', article: 'a' },
  clothes: { noun: 'piece of clothing', article: 'a' },
  hobbies: { noun: 'hobby', article: 'a' },
  travel: { noun: 'travel word', article: 'a' },
  tech: { noun: 'piece of technology', article: 'a' },
  sports: { noun: 'sport', article: 'a' },
  environment: { noun: 'nature word', article: 'a' },
  health: { noun: 'health word', article: 'a' },
  shopping: { noun: 'shopping word', article: 'a' },
  careers: { noun: 'job', article: 'a' },
  culture: { noun: 'tradition', article: 'a' },
  media: { noun: 'media word', article: 'a' },
  ecoissues: { noun: 'environmental issue', article: 'an' },
  debate: { noun: 'debate word', article: 'a' },
  science: { noun: 'science word', article: 'a' },
  feelings: { noun: 'feeling', article: 'a' },
  verbtobe: { noun: 'form of "to be"', article: 'a' },
  presentcontinuous: { noun: 'verb form', article: 'a' },
  simplepast: { noun: 'past tense verb', article: 'a' },
  future: { noun: 'future expression', article: 'a' },
  comparatives: { noun: 'comparative word', article: 'a' },
  // Topics added alongside the Ordinal/Cardinal numbers, pronouns,
  // possessives, prepositions, 12-tenses and "describing …" units.
  fruitsfood: { noun: 'food', article: 'a' },
  cardinalnumbers: { noun: 'number', article: 'a' },
  ordinalnumbers: { noun: 'ordinal number', article: 'an' },
  objectpronouns: { noun: 'object pronoun', article: 'an' },
  possessives: { noun: 'possessive word', article: 'a' },
  prepositionsplace: { noun: 'preposition of place', article: 'a' },
  describingpeople: { noun: 'word to describe people', article: 'a' },
  describinganimals: { noun: 'word to describe animals', article: 'a' },
  describingplaces: { noun: 'word to describe places', article: 'a' },
  futurecontinuous: { noun: 'future continuous form', article: 'a' },
  twelvetenses: { noun: 'verb tense', article: 'a' },
};
function lmCategory(topic) {
  return TOPIC_CATEGORY[topic.id] || { noun: 'word', article: 'a' };
}

/* ==========================================================================
   1) READING TIME
   ========================================================================== */

// Custom content helpers — allows teachers to override with their own text
// Stored as { text, questions } — normalised here into the same shape
// buildReadingContent() returns, so every consumer (Reading Time's renderer
// AND the Practice Arena, which needs `sentences`) can treat both sources
// identically instead of crashing on the missing fields.
function getCustomReadingContent(topicId) {
  const key = `custom_reading_${topicId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  let parsed;
  try { parsed = JSON.parse(stored); } catch (e) { return null; }
  if (!parsed || typeof parsed.text !== 'string') return null;
  const questions = Array.isArray(parsed.questions) ? parsed.questions : (Array.isArray(parsed.quiz) ? parsed.quiz : []);
  return {
    authored: true,
    custom: true,
    text: parsed.text,
    sentences: lmSentencesFromText(parsed.text),
    quiz: questions.map(q => ({
      prompt: q.prompt,
      visual: null,
      options: Array.isArray(q.options) ? q.options.slice() : [],
      correct: q.correct,
    })),
  };
}
function saveCustomReadingContent(topicId, text, questions) {
  const key = `custom_reading_${topicId}`;
  localStorage.setItem(key, JSON.stringify({ text, questions }));
}
function getCustomPracticeContent(topicId) {
  const key = `custom_practice_${topicId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  // A corrupt entry must not take the whole Practice tab down with it.
  try { return JSON.parse(stored); } catch (e) { return null; }
}
function saveCustomPracticeContent(topicId, description, instructions) {
  const key = `custom_practice_${topicId}`;
  localStorage.setItem(key, JSON.stringify({ description, instructions }));
}

// Splits an authored passage into individual sentence objects with the same
// shape the generated path produces. The Practice Arena builds its
// word-order exercises from `sentences`, so EVERY content source has to
// expose that field — authored passages included.
function lmSentencesFromText(text) {
  return String(text || '')
    .split(/\n+/)
    .flatMap(line => line.split(/(?<=[.!?])\s+/))
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => ({ text: s, glossaryWord: null, grammarTerm: null }));
}

function buildReadingContent(level, topic) {
  // Authored content (topicsData's readingTime/questions) takes priority —
  // it's real, level-appropriate writing with genuine comprehension
  // questions. Topics without it (older entries) fall back to the
  // auto-generated sentences below, unchanged.
  if (topic.readingTime && Array.isArray(topic.readingTime.questions)) {
    return {
      authored: true,
      text: topic.readingTime.text,
      sentences: lmSentencesFromText(topic.readingTime.text),
      quiz: topic.readingTime.questions.map(q => ({ prompt: q.prompt, visual: null, options: q.options.slice(), correct: q.correct })),
    };
  }

  const cat = lmCategory(topic);
  const words = topic.words.slice(0, Math.min(5, topic.words.length));
  const w = (i) => words[i % words.length];
  const title = topic.title.toLowerCase();

  let sentences;
  if (level.tier === 'kids') {
    sentences = [
      { text: `Today we learn about ${topic.title}!`, glossaryWord: null, grammarTerm: null },
      { text: `${w(0).en} is ${cat.article} ${cat.noun}.`, glossaryWord: w(0), grammarTerm: { text: 'is', label: 'Verb "to be": use "is" for he, she or it.' } },
      { text: `${w(1).en} is ${cat.article} ${cat.noun} too!`, glossaryWord: w(1), grammarTerm: null },
      { text: `I see ${w(2).en} and ${w(3).en}.`, glossaryWord: w(2), grammarTerm: { text: 'and', label: 'Conjunction: joins two words together.' } },
      { text: `Do you like ${w(0).en}? 🙂`, glossaryWord: null, grammarTerm: null },
    ];
  } else if (level.tier === 'juniors') {
    sentences = [
      { text: `Let's explore ${title} together.`, glossaryWord: null, grammarTerm: null },
      { text: `${w(0).en} and ${w(1).en} are two ${cat.noun}s we use every day.`, glossaryWord: w(0), grammarTerm: { text: 'are', label: 'Plural verb "to be": use "are" for you, we or they.' } },
      { text: `Yesterday, I learned about ${w(2).en} at school.`, glossaryWord: w(2), grammarTerm: { text: 'learned', label: 'Past tense: add -ed to a verb for things that already happened.' } },
      { text: `My friend likes ${w(3).en}, but I prefer ${w(0).en}.`, glossaryWord: w(3), grammarTerm: { text: 'but', label: 'Conjunction: shows a contrast between two ideas.' } },
      { text: `Can you name one more ${cat.noun}?`, glossaryWord: null, grammarTerm: null },
    ];
  } else {
    sentences = [
      { text: `When people talk about ${title}, ${w(0).en.toLowerCase()} and ${w(1).en.toLowerCase()} often come up first.`, glossaryWord: w(0), grammarTerm: null },
      { text: `Some students find ${w(2).en.toLowerCase()} easy, however others need more practice.`, glossaryWord: w(2), grammarTerm: { text: 'however', label: 'Connector: introduces a contrast, similar to "but".' } },
      { text: `If you study ${w(3).en.toLowerCase()} a little every day, you should remember it much faster.`, glossaryWord: w(3), grammarTerm: { text: 'should', label: 'Modal verb: gives advice or a recommendation.' } },
      { text: `In fact, understanding ${title} helps you talk about real life in English.`, glossaryWord: null, grammarTerm: { text: 'In fact', label: 'Idiomatic expression: used to add emphasis or a surprising detail.' } },
      { text: `What do you think — is ${w(0).en.toLowerCase()} more important than ${w(1).en.toLowerCase()}? Discuss with a partner.`, glossaryWord: null, grammarTerm: null },
    ];
  }

  return { authored: false, sentences, quiz: buildReadingQuiz(level, topic) };
}

function lmMakeTypo(word) {
  const letters = word.split('');
  if (letters.length < 2) return word + word[0];
  const i = Math.floor(Math.random() * (letters.length - 1));
  [letters[i], letters[i + 1]] = [letters[i + 1], letters[i]];
  return letters.join('');
}

// Swapping two neighbouring letters is a no-op when they're identical
// ("bee" -> "bee"), and two independent swaps can easily collide. Either
// case would put the correct spelling in the list twice and make the
// "which is the correct spelling?" question unanswerable — so build the
// decoys as a set that is guaranteed distinct from each other AND from the
// real word, falling back to a letter substitution when swaps run out.
function lmMakeDistinctTypos(word, count) {
  const out = [];
  const taken = new Set([word.toLowerCase()]);
  const push = (candidate) => {
    const key = candidate.toLowerCase();
    if (taken.has(key)) return false;
    taken.add(key);
    out.push(candidate);
    return true;
  };

  for (let attempt = 0; attempt < 40 && out.length < count; attempt++) {
    push(lmMakeTypo(word));
  }

  const VOWELS = 'aeiou';
  for (let i = 0; i < word.length && out.length < count; i++) {
    const ch = word[i];
    const lower = ch.toLowerCase();
    const vowelIdx = VOWELS.indexOf(lower);
    const swapped = vowelIdx >= 0
      ? VOWELS[(vowelIdx + 1 + i) % VOWELS.length]
      : ch + ch;
    const replacement = ch === ch.toUpperCase() && vowelIdx >= 0 ? swapped.toUpperCase() : swapped;
    push(word.slice(0, i) + replacement + word.slice(i + 1));
  }

  while (out.length < count) push(word + '_'.repeat(out.length + 1));
  return out.slice(0, count);
}

function buildReadingQuiz(level, topic) {
  const words = lmShuffle(topic.words);
  const q1w = words[0], q2w = words[1 % words.length], q3w = words[2 % words.length];
  const cat = lmCategory(topic);

  // Q1 — picture matching
  const q1Distractors = lmShuffle(words.filter(w => w.id !== q1w.id)).slice(0, 2);
  const q1Options = lmShuffle([q1w, ...q1Distractors]);
  const q1 = {
    prompt: `Which word matches this picture?`,
    visual: q1w,
    options: q1Options.map(o => o.en),
    correct: q1w.en,
  };

  // Q2 — odd one out (pick a word from a different topic as the intruder)
  const otherTopics = [];
  LEVELS.forEach(l => l.topics.forEach(t => { if (t.id !== topic.id) otherTopics.push(t); }));
  const q2Real = lmShuffle(words.filter(w => w.id !== q2w.id)).slice(0, 2);
  // The intruder has to be textually distinct from the two real options, or
  // the question would have two identical answers and no single right one.
  const q2Taken = new Set(q2Real.map(w => w.en.toLowerCase()));
  const intruderWord = lmShuffle(otherTopics)
    .flatMap(t => lmShuffle(t.words))
    .find(w => !q2Taken.has(w.en.toLowerCase())) || null;
  const q2Options = lmShuffle(intruderWord ? [...q2Real, intruderWord] : [...q2Real, q2w]);
  const q2 = {
    prompt: `Which word does NOT belong with "${topic.title}"?`,
    visual: null,
    options: q2Options.map(o => o.en),
    correct: intruderWord ? intruderWord.en : q2w.en,
  };

  // Q3 — picture matching for kids, spelling check for juniors/teens
  let q3;
  if (level.tier === 'kids') {
    const used = new Set([q1w.id, q2w.id]);
    const remaining = words.filter(w => !used.has(w.id));
    const q3Target = remaining[0] || q3w;
    const q3Distractors = lmShuffle(words.filter(w => w.id !== q3Target.id)).slice(0, 2);
    const q3Options = lmShuffle([q3Target, ...q3Distractors]);
    q3 = { prompt: `Which word matches this picture?`, visual: q3Target, options: q3Options.map(o => o.en), correct: q3Target.en };
  } else {
    const wrongSpellings = lmMakeDistinctTypos(q3w.en, 2);
    const q3Options = lmShuffle([q3w.en, ...wrongSpellings]);
    q3 = { prompt: `Which is the correct spelling?`, visual: q3w, options: q3Options, correct: q3w.en };
  }

  return [q1, q2, q3];
}

function grammarTipHTML(topic) {
  if (!topic.grammarTip) return '';
  return `<div class="grammar-tip-callout"><span class="grammar-tip-icon">💡</span><p><strong>Grammar Tip:</strong> ${lmEscape(topic.grammarTip)}</p></div>`;
}

function renderReadingModule(container, level, topic) {
  const customContent = getCustomReadingContent(topic.id);
  let content = customContent || buildReadingContent(level, topic);
  let isCustom = !!customContent;

  function renderContent() {
    if (content.authored || isCustom) {
      const lines = String(content.text || '').split('\n').filter(Boolean);
      container.innerHTML = `
        <button class="edit-content-btn" id="editReadingBtn" title="Edit this reading">✏️ Edit Content</button>
        ${grammarTipHTML(topic)}
        <div class="reading-passage reading-passage-authored">
          ${lines.map(line => `<p class="reading-line">${lmEscape(line)}</p>`).join('')}
        </div>
        <div class="reading-quiz">
          <h4>Quick Check 📝</h4>
          <div id="readingQuizList"></div>
        </div>
      `;
      renderQuizList(document.getElementById('readingQuizList'), content.quiz);
      document.getElementById('editReadingBtn').addEventListener('click', showEditPanel);
      return;
    }

    container.innerHTML = `
      <button class="edit-content-btn" id="editReadingBtn" title="Edit this reading">✏️ Edit Content</button>
      ${grammarTipHTML(topic)}
      <div class="reading-passage">
        ${content.sentences.map((s, i) => `<p class="reading-sentence" data-sentence="${i}">${renderSentenceHTML(s)}</p><div class="reading-note" data-note-for="${i}" hidden></div>`).join('')}
      </div>
      <div class="reading-quiz">
        <h4>Quick Check 📝</h4>
        <div id="readingQuizList"></div>
      </div>
    `;

    container.querySelectorAll('.glossary-word, .grammar-term').forEach(span => {
      span.addEventListener('click', () => {
        const sentenceEl = span.closest('.reading-sentence');
        const idx = sentenceEl.dataset.sentence;
        const note = container.querySelector(`.reading-note[data-note-for="${idx}"]`);
        const kind = span.classList.contains('glossary-word') ? 'glossary' : 'grammar';

        if (!note.hidden && note.dataset.kind === kind) {
          note.hidden = true;
          return;
        }
        note.dataset.kind = kind;
        if (kind === 'glossary') {
          const word = content.sentences[idx].glossaryWord;
          note.innerHTML = `${lmWordVisual(word, 'note-visual')}<span>${word.en} — ${lmCategory(topic).article} ${lmCategory(topic).noun}</span>`;
        } else {
          const term = content.sentences[idx].grammarTerm;
          note.innerHTML = `<span class="note-visual emoji-fallback" style="font-size:1.6rem">💡</span><span><strong>${term.text}</strong> — ${term.label}</span>`;
        }
        note.hidden = false;
      });
    });

    renderQuizList(document.getElementById('readingQuizList'), content.quiz);
    document.getElementById('editReadingBtn').addEventListener('click', showEditPanel);
  }

  function showEditPanel() {
    const modal = document.createElement('div');
    modal.className = 'edit-content-modal';
    modal.innerHTML = `
      <div class="edit-content-panel">
        <h4>✏️ Edit Reading Content</h4>
        <label>Reading Text (paste your story, dialogue, or article):</label>
        <textarea id="editReadingText" style="width:100%;height:150px;padding:8px;border:1px solid #ddd;border-radius:8px;font-family:monospace;font-size:0.9rem">${lmEscape(content.text || (content.sentences || []).map(s => s.text).join('\n'))}</textarea>
        <label style="margin-top:12px;display:block">Quick Check Questions (JSON format):</label>
        <textarea id="editReadingQuiz" style="width:100%;height:120px;padding:8px;border:1px solid #ddd;border-radius:8px;font-family:monospace;font-size:0.85rem">${lmEscape(JSON.stringify((content.quiz || []).map(q => ({ prompt: q.prompt, options: q.options, correct: q.correct })), null, 2))}</textarea>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button id="saveReadingBtn" style="flex:1;padding:10px;background:#6f7d68;color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer">💾 Save Content</button>
          <button id="resetReadingBtn" style="flex:1;padding:10px;background:#fff;color:#c9435c;border:2px solid #c9435c;border-radius:6px;font-weight:700;cursor:pointer">↺ Restore Original</button>
          <button id="cancelReadingBtn" style="flex:1;padding:10px;background:#ccc;color:#333;border:none;border-radius:6px;font-weight:700;cursor:pointer">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('saveReadingBtn').addEventListener('click', () => {
      const text = document.getElementById('editReadingText').value.trim();
      if (!text) { alert('The reading text cannot be empty.'); return; }
      let quiz;
      try {
        quiz = JSON.parse(document.getElementById('editReadingQuiz').value || '[]');
      } catch (e) {
        alert('Invalid JSON in questions field: ' + e.message);
        return;
      }
      if (!Array.isArray(quiz)) { alert('Questions must be a JSON array.'); return; }
      // A question whose `correct` isn't one of its own `options` can never
      // be answered right — reject it here instead of shipping a broken quiz.
      const bad = quiz.findIndex(q => !q || !Array.isArray(q.options) || q.options.length < 2 || !q.options.includes(q.correct));
      if (bad >= 0) {
        alert(`Question ${bad + 1} is invalid: it needs at least 2 "options" and a "correct" value that exactly matches one of them.`);
        return;
      }
      saveCustomReadingContent(topic.id, text, quiz);
      content = getCustomReadingContent(topic.id) || content;
      isCustom = true;
      document.body.removeChild(modal);
      renderContent();
    });
    document.getElementById('resetReadingBtn').addEventListener('click', () => {
      if (!confirm('Restore the original reading for this topic? Your custom text will be deleted.')) return;
      localStorage.removeItem(`custom_reading_${topic.id}`);
      content = buildReadingContent(level, topic);
      isCustom = false;
      document.body.removeChild(modal);
      renderContent();
    });
    document.getElementById('cancelReadingBtn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  renderContent();
}

function renderSentenceHTML(sentence) {
  let html = lmEscape(sentence.text);
  if (sentence.grammarTerm) {
    const re = new RegExp(`\\b(${sentence.grammarTerm.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
    html = html.replace(re, `<button class="grammar-term" type="button">$1</button>`);
  }
  if (sentence.glossaryWord) {
    const re = new RegExp(`\\b(${sentence.glossaryWord.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
    html = html.replace(re, `<button class="glossary-word" type="button">$1</button>`);
  }
  return html;
}

// Options are matched by INDEX, not by their text: authored quizzes (and
// generated spelling questions) can legitimately repeat a string, and
// matching on text would light up every duplicate button at once.
function renderQuizList(container, quiz) {
  const questions = (Array.isArray(quiz) ? quiz : []).filter(q => q && Array.isArray(q.options) && q.options.length);
  if (questions.length === 0) {
    container.innerHTML = `<p class="quiz-empty">No comprehension questions for this text yet.</p>`;
    return;
  }

  container.innerHTML = questions.map((q, i) => `
    <div class="quiz-question" data-q="${i}">
      <p class="quiz-prompt">${i + 1}. ${lmEscape(q.prompt)}</p>
      ${q.visual ? lmWordVisual(q.visual, 'quiz-visual') : ''}
      <div class="quiz-options">
        ${q.options.map((opt, oi) => `<button class="quiz-option" data-opt="${oi}">${lmEscape(opt)}</button>`).join('')}
      </div>
    </div>
  `).join('') + `<p class="quiz-result" id="quizResult" hidden></p>`;

  let answeredCount = 0;
  let correctCount = 0;

  container.querySelectorAll('.quiz-question').forEach((qEl, i) => {
    const q = questions[i];
    const correctIdx = q.options.findIndex(o => o === q.correct);
    qEl.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (qEl.classList.contains('answered')) return;
        qEl.classList.add('answered');
        answeredCount++;
        const chosen = Number(btn.dataset.opt);
        const isRight = correctIdx >= 0 ? chosen === correctIdx : q.options[chosen] === q.correct;
        if (isRight) { btn.classList.add('correct'); correctCount++; }
        else {
          btn.classList.add('wrong');
          const rightBtn = qEl.querySelector(`.quiz-option[data-opt="${correctIdx}"]`);
          if (rightBtn) rightBtn.classList.add('correct');
        }
        qEl.querySelectorAll('.quiz-option').forEach(b => { b.disabled = true; });

        if (answeredCount === questions.length) {
          const resultEl = container.querySelector('#quizResult');
          resultEl.hidden = false;
          resultEl.textContent = `You got ${correctCount}/${questions.length}! 🎉`;
          if (typeof awardProgress === 'function') awardProgress(correctCount * 5, correctCount === questions.length ? 1 : 0);
        }
      });
    });
  });
}

/* ==========================================================================
   2) PRACTICE ARENA (Duolingo-style)
   ========================================================================== */

function makeSentenceExercise(sentence) {
  const clean = sentence.text.replace(/[.,!?]/g, '');
  const tokens = clean.split(' ').filter(Boolean);
  return { type: 'sentence', tokens, display: sentence.text };
}
function makeListeningExercise(targetWord, topic) {
  const distractors = lmShuffle(topic.words.filter(w => w.id !== targetWord.id)).slice(0, 2);
  return { type: 'listening', target: targetWord, options: lmShuffle([targetWord, ...distractors]) };
}
function makeFillBlankExercise(topic, words) {
  const cat = lmCategory(topic);
  const target = words[Math.floor(Math.random() * words.length)];
  const distractors = lmShuffle(words.filter(w => w.id !== target.id)).slice(0, 2);
  // Grammar topics store verb forms and whole example sentences as "words",
  // where "My favorite past tense verb is …" reads as nonsense. Ask those
  // topics to recall the item instead of rating it.
  const isGrammar = /^Grammar:/i.test(topic.title || '');
  const before = isGrammar
    ? `Which ${cat.noun} fits here? →`
    : `My favorite ${cat.noun} is`;
  return {
    type: 'fillblank',
    before,
    after: isGrammar ? '' : '.',
    correct: target.en,
    options: lmShuffle([target, ...distractors]).map(w => w.en),
  };
}

// Spelling only works on a single, reasonably short word — a 30-character
// example sentence would produce an unplayable tile tray. Pick the best
// candidate from the topic rather than whatever happened to be at index 1.
function pickSpellableWord(words) {
  const scored = words
    .map(w => ({ w, len: w.en.replace(/[^A-Za-z]/g, '').length }))
    .filter(x => x.len >= 2 && x.len <= 12);
  if (scored.length) return lmShuffle(scored)[0].w;
  return words.reduce((best, w) =>
    w.en.replace(/[^A-Za-z]/g, '').length < best.en.replace(/[^A-Za-z]/g, '').length ? w : best, words[0]);
}

function makeSpellingExercise(word) {
  // Grammar banks hold whole example sentences; spell the first real word of
  // one rather than laying out 30 letter tiles nobody can solve.
  const cleaned = word.en.replace(/[^A-Za-z\s]/g, '').trim();
  const answer = (cleaned.replace(/\s/g, '').length <= 12 ? cleaned.replace(/\s/g, '') : (cleaned.split(/\s+/).find(t => t.length >= 3 && t.length <= 12) || cleaned.slice(0, 10)))
    .toUpperCase();
  const letters = answer.split('');
  const decoyPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l => !letters.includes(l));
  const decoys = lmShuffle(decoyPool).slice(0, 2);
  return { type: 'spelling', word, answer, letters, tiles: lmShuffle([...letters, ...decoys]) };
}

function buildPracticeSession(level, topic) {
  const reading = getCustomReadingContent(topic.id) || buildReadingContent(level, topic);
  const words = lmShuffle(topic.words);

  // Word-order exercises need a sentence of at least 4 tokens to be worth
  // doing. Every content source now exposes `sentences`, but an authored
  // passage may be short or made of long single lines — so fall back
  // through: long sentences -> any sentence -> a sentence built from the
  // topic's own vocabulary, which always exists.
  const all = Array.isArray(reading.sentences) ? reading.sentences : [];
  const usable = lmShuffle(all.filter(s => s && s.text && s.text.trim().split(/\s+/).length >= 4));
  const pool = usable.length ? usable : all.filter(s => s && s.text);
  const fallback = { text: `I can see ${words[0].en} and ${words[1 % words.length].en}.` };
  const s = (i) => pool.length ? pool[i % pool.length] : fallback;

  return [
    makeSentenceExercise(s(0)),
    makeListeningExercise(words[0 % words.length], topic),
    makeFillBlankExercise(topic, words),
    makeSpellingExercise(pickSpellableWord(words)),
    makeListeningExercise(words[2 % words.length], topic),
    makeSentenceExercise(s(1)),
  ];
}

function renderPracticeArena(container, level, topic) {
  const customPractice = getCustomPracticeContent(topic.id);
  const state = { exercises: buildPracticeSession(level, topic), index: 0, hearts: 5, xp: 0 };

  function paintShell() {
    if (state.hearts <= 0) return paintGameOver();
    if (state.index >= state.exercises.length) return paintComplete();
    container.innerHTML = `
      <button class="edit-content-btn" id="editPracticeBtn" title="Edit practice instructions">✏️ Edit Content</button>
      ${customPractice ? `<div class="practice-custom-instructions">${lmEscape(customPractice.instructions || '')}</div>` : ''}
      <div class="practice-header">
        <div class="practice-hearts">${'❤️'.repeat(state.hearts)}${'🖤'.repeat(5 - state.hearts)}</div>
        <div class="practice-progress">Question ${state.index + 1} / ${state.exercises.length}</div>
        <div class="practice-xp">⭐ ${state.xp} XP</div>
      </div>
      <div class="practice-exercise" id="practiceExercise"></div>
    `;
    renderExercise(document.getElementById('practiceExercise'), state.exercises[state.index], handleResult);
    document.getElementById('editPracticeBtn').addEventListener('click', showEditPracticePanel);
  }

  function showEditPracticePanel() {
    const modal = document.createElement('div');
    modal.className = 'edit-content-modal';
    modal.innerHTML = `
      <div class="edit-content-panel">
        <h4>✏️ Edit Practice Instructions</h4>
        <label>Custom Instructions (optional — appears above exercises):</label>
        <textarea id="editPracticeInstructions" style="width:100%;height:100px;padding:8px;border:1px solid #ddd;border-radius:8px;font-family:sans-serif;font-size:0.9rem">${customPractice?.instructions || ''}</textarea>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button id="savePracticeBtn" style="flex:1;padding:10px;background:#6f7d68;color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer">💾 Save</button>
          <button id="cancelPracticeBtn" style="flex:1;padding:10px;background:#ccc;color:#333;border:none;border-radius:6px;font-weight:700;cursor:pointer">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('savePracticeBtn').addEventListener('click', () => {
      const instructions = document.getElementById('editPracticeInstructions').value;
      saveCustomPracticeContent(topic.id, '', instructions);
      document.body.removeChild(modal);
      paintShell();
    });
    document.getElementById('cancelPracticeBtn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  function handleResult(correct) {
    if (correct) state.xp += 10; else state.hearts -= 1;
    setTimeout(() => { state.index += 1; paintShell(); }, 1100);
  }

  function paintGameOver() {
    container.innerHTML = `
      <div class="game-end-banner lose">💔 Out of hearts! <p>You earned ${state.xp} XP this round.</p></div>
      <div class="game-btn-row" style="margin-top:14px;justify-content:center"><button class="game-btn" id="practiceRetryBtn">🔄 Try Again</button></div>
    `;
    if (typeof awardProgress === 'function') awardProgress(state.xp, 0);
    container.querySelector('#practiceRetryBtn').addEventListener('click', () => renderPracticeArena(container, level, topic));
  }

  function paintComplete() {
    container.innerHTML = `
      <div class="game-end-banner win">🎉 Session Complete! <p>You earned ${state.xp} XP and 1 ⭐ star.</p></div>
      <div class="game-btn-row" style="margin-top:14px;justify-content:center"><button class="game-btn" id="practiceAgainBtn">🔄 Practice Again</button></div>
    `;
    if (typeof awardProgress === 'function') awardProgress(state.xp, 1);
    container.querySelector('#practiceAgainBtn').addEventListener('click', () => renderPracticeArena(container, level, topic));
  }

  paintShell();
}

function renderExercise(container, ex, onAnswered) {
  if (ex.type === 'sentence') return renderSentenceExercise(container, ex, onAnswered);
  if (ex.type === 'listening') return renderListeningExercise(container, ex, onAnswered);
  if (ex.type === 'fillblank') return renderFillBlankExercise(container, ex, onAnswered);
  if (ex.type === 'spelling') return renderSpellingExercise(container, ex, onAnswered);
}

function renderSentenceExercise(container, ex, onAnswered) {
  const scrambled = lmShuffle(ex.tokens);
  let answered = false;

  container.innerHTML = `
    <p class="practice-instruction">🧩 Put the sentence in the right order:</p>
    <div class="sentence-answer-row" id="answerRow"></div>
    <div class="sentence-tray" id="trayRow"></div>
    <button class="game-btn" id="checkSentenceBtn">✅ Check</button>
  `;

  const answerRow = document.getElementById('answerRow');
  const trayRow = document.getElementById('trayRow');
  let answer = [];
  let tray = scrambled.map((t, i) => ({ text: t, uid: i }));

  function paintTiles() {
    answerRow.innerHTML = answer.map(t => `<button class="word-tile placed" data-uid="${t.uid}">${lmEscape(t.text)}</button>`).join('') || `<span class="sentence-placeholder">Tap words below in order…</span>`;
    trayRow.innerHTML = tray.map(t => `<button class="word-tile" data-uid="${t.uid}">${lmEscape(t.text)}</button>`).join('');

    answerRow.querySelectorAll('.word-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        const uid = Number(btn.dataset.uid);
        const item = answer.find(a => a.uid === uid);
        answer = answer.filter(a => a.uid !== uid);
        tray.push(item);
        paintTiles();
      });
    });
    trayRow.querySelectorAll('.word-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        const uid = Number(btn.dataset.uid);
        const item = tray.find(a => a.uid === uid);
        tray = tray.filter(a => a.uid !== uid);
        answer.push(item);
        paintTiles();
      });
    });
  }
  paintTiles();

  document.getElementById('checkSentenceBtn').addEventListener('click', () => {
    if (answered || answer.length !== ex.tokens.length) return;
    answered = true;
    const given = answer.map(a => a.text.toLowerCase()).join(' ');
    const correct = given === ex.tokens.map(t => t.toLowerCase()).join(' ');
    answerRow.classList.add(correct ? 'is-correct' : 'is-wrong');
    if (!correct) {
      const hint = document.createElement('p');
      hint.className = 'practice-hint';
      hint.textContent = `Correct order: ${ex.display}`;
      container.appendChild(hint);
    }
    onAnswered(correct);
  });
}

function renderListeningExercise(container, ex, onAnswered) {
  let answered = false;
  container.innerHTML = `
    <p class="practice-instruction">🎧 Listen and choose the right word:</p>
    <button class="game-btn" id="playAudioBtn">🔊 Play Sound</button>
    <div class="listening-options">
      ${ex.options.map(o => `<button class="listening-option" data-id="${o.id}">${lmWordVisual(o, 'listening-visual')}<span>${lmEscape(o.en)}</span></button>`).join('')}
    </div>
  `;
  document.getElementById('playAudioBtn').addEventListener('click', () => lmSpeak(ex.target.en));
  lmSpeak(ex.target.en);

  container.querySelectorAll('.listening-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const correct = btn.dataset.id === ex.target.id;
      btn.classList.add(correct ? 'correct' : 'wrong');
      if (!correct) {
        container.querySelector(`.listening-option[data-id="${ex.target.id}"]`).classList.add('correct');
      }
      container.querySelectorAll('.listening-option').forEach(b => b.disabled = true);
      onAnswered(correct);
    });
  });
}

function renderFillBlankExercise(container, ex, onAnswered) {
  let answered = false;
  container.innerHTML = `
    <p class="practice-instruction">✍️ Fill in the blank:</p>
    <p class="fillblank-sentence">${lmEscape(ex.before)} <span class="fillblank-slot">____</span>${lmEscape(ex.after)}</p>
    <div class="quiz-options">
      ${ex.options.map(o => `<button class="quiz-option" data-answer="${lmEscape(o)}">${lmEscape(o)}</button>`).join('')}
    </div>
  `;
  container.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const correct = btn.dataset.answer === ex.correct;
      btn.classList.add(correct ? 'correct' : 'wrong');
      if (!correct) container.querySelector(`.quiz-option[data-answer="${CSS.escape(ex.correct)}"]`).classList.add('correct');
      container.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);
      onAnswered(correct);
    });
  });
}

function renderSpellingExercise(container, ex, onAnswered) {
  let answered = false;
  let answer = [];
  let tray = ex.tiles.map((t, i) => ({ letter: t, uid: i }));

  container.innerHTML = `
    <p class="practice-instruction">🔤 Spell the word:</p>
    ${lmWordVisual(ex.word, 'spelling-visual')}
    <div class="sentence-answer-row" id="spellAnswerRow"></div>
    <div class="sentence-tray" id="spellTrayRow"></div>
    <button class="game-btn" id="checkSpellingBtn">✅ Check</button>
  `;

  const answerRow = document.getElementById('spellAnswerRow');
  const trayRow = document.getElementById('spellTrayRow');

  function paint() {
    answerRow.innerHTML = answer.map(t => `<button class="word-tile placed letter-tile" data-uid="${t.uid}">${t.letter}</button>`).join('') || `<span class="sentence-placeholder">Tap letters below…</span>`;
    trayRow.innerHTML = tray.map(t => `<button class="word-tile letter-tile" data-uid="${t.uid}">${t.letter}</button>`).join('');
    answerRow.querySelectorAll('.word-tile').forEach(btn => btn.addEventListener('click', () => {
      if (answered) return;
      const uid = Number(btn.dataset.uid);
      const item = answer.find(a => a.uid === uid);
      answer = answer.filter(a => a.uid !== uid);
      tray.push(item);
      paint();
    }));
    trayRow.querySelectorAll('.word-tile').forEach(btn => btn.addEventListener('click', () => {
      if (answered) return;
      const uid = Number(btn.dataset.uid);
      const item = tray.find(a => a.uid === uid);
      tray = tray.filter(a => a.uid !== uid);
      answer.push(item);
      paint();
    }));
  }
  paint();

  document.getElementById('checkSpellingBtn').addEventListener('click', () => {
    if (answered || answer.length !== ex.letters.length) return;
    answered = true;
    const given = answer.map(a => a.letter).join('');
    const correct = given === ex.letters.join('');
    answerRow.classList.add(correct ? 'is-correct' : 'is-wrong');
    if (!correct) {
      const hint = document.createElement('p');
      hint.className = 'practice-hint';
      hint.textContent = `Correct spelling: ${ex.answer || ex.word.en}`;
      container.appendChild(hint);
    }
    onAnswered(correct);
  });
}

/* ==========================================================================
   3) PHONICS & BLENDING STATION (Kids / Juniors tiers)
   ========================================================================== */

const CVC_WORDS = ['cat', 'dog', 'sun', 'hat', 'pig', 'bed', 'cup', 'bus', 'map', 'pen', 'log', 'mud', 'box', 'van', 'fox', 'jam', 'web', 'zip'];
const phonicsDecks = {};

function drawPhonicsWord(topicId) {
  if (!phonicsDecks[topicId] || phonicsDecks[topicId].length === 0) {
    phonicsDecks[topicId] = lmShuffle(CVC_WORDS);
  }
  return phonicsDecks[topicId].shift();
}

function renderPhonicsStation(container, level, topic) {
  let word = drawPhonicsWord(topic.id);
  // Tiles are tracked by uid, not by letter: a word with a repeated letter
  // ("egg") would otherwise disable every copy of it as soon as one is used.
  let placed = [null, null, null];
  let tiles = [];

  function makeTiles(w) {
    return lmShuffle(w.split('')).map((letter, i) => ({ letter, uid: i }));
  }

  function newWord() {
    word = drawPhonicsWord(topic.id);
    placed = [null, null, null];
    tiles = makeTiles(word);
    paint();
  }

  function paint() {
    container.innerHTML = `
      <div class="phonics-section">
        <h4>🔤 Phonetic Keyboard</h4>
        <p class="practice-instruction">Tap a letter to hear its sound.</p>
        <div class="phonics-keyboard" id="phonicsKeyboard">
          ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => `<button class="key-btn phonics-key" data-letter="${l}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="phonics-section">
        <h4>🧪 Blending Machine</h4>
        <p class="practice-instruction">Place the letters in order, then blend them into a word!</p>
        <div class="blend-slots" id="blendSlots">
          ${[0, 1, 2].map(i => `<button class="blend-slot" data-slot="${i}">${placed[i] ? placed[i].letter : '_'}</button>`).join('')}
        </div>
        <div class="sentence-tray" id="blendTray">
          ${tiles.map(t => `<button class="word-tile letter-tile" data-uid="${t.uid}" ${placed.some(p => p && p.uid === t.uid) ? 'disabled' : ''}>${t.letter}</button>`).join('')}
        </div>
        <div class="game-btn-row" style="margin-top:14px">
          <button class="game-btn" id="blendPlayBtn" ${placed.some(p => !p) ? 'disabled' : ''}>▶️ Blend It!</button>
          <button class="game-btn secondary" id="blendResetBtn">🔄 Reset Tiles</button>
          <button class="game-btn secondary" id="blendNextBtn">➡️ Next Word</button>
        </div>
      </div>
    `;

    container.querySelectorAll('.phonics-key').forEach(btn => {
      btn.addEventListener('click', () => lmSpeak(btn.dataset.letter, 0.7));
    });

    container.querySelectorAll('#blendTray .word-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const nextSlot = placed.findIndex(p => !p);
        if (nextSlot === -1) return;
        const uid = Number(btn.dataset.uid);
        placed[nextSlot] = tiles.find(t => t.uid === uid);
        paint();
      });
    });

    container.querySelectorAll('.blend-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = Number(btn.dataset.slot);
        if (!placed[slot]) return;
        placed[slot] = null;
        paint();
      });
    });

    document.getElementById('blendPlayBtn').addEventListener('click', () => {
      const spelled = placed.map(p => (p ? p.letter : ''));
      let i = 0;
      const speakNext = () => {
        if (i < spelled.length) { lmSpeak(spelled[i], 0.6); i++; setTimeout(speakNext, 550); }
        else setTimeout(() => lmSpeak(spelled.join(''), 0.8), 300);
      };
      speakNext();
    });
    document.getElementById('blendResetBtn').addEventListener('click', () => { placed = [null, null, null]; paint(); });
    document.getElementById('blendNextBtn').addEventListener('click', newWord);
  }

  tiles = makeTiles(word);
  paint();
}

/* ==========================================================================
   4) FLASHCARDS (Quick Peek / Blur Reveal)
   ========================================================================== */

function renderFlashcards(container, level, topic) {
  const words = topic.words;
  let index = 0;
  let mode = 'peek';
  let revealed = false;

  function paint() {
    revealed = false;
    const word = words[index];
    container.innerHTML = `
      <div class="flash-toolbar">
        <div class="flash-mode-toggle">
          <button class="flash-mode-btn ${mode === 'peek' ? 'active' : ''}" data-mode="peek">👀 Quick Peek</button>
          <button class="flash-mode-btn ${mode === 'blur' ? 'active' : ''}" data-mode="blur">🌫️ Blur Reveal</button>
        </div>
        <span class="game-status-pill">${index + 1} / ${words.length}</span>
      </div>
      <div class="flashcard-container">
        <div class="flashcard">
          <div class="flashcard-media ${mode === 'blur' ? 'blur-mode blurred' : 'peek-mode hidden-media'}" id="flashcardMedia">
            ${lmWordVisual(word, 'flashcard-visual')}
          </div>
          <div class="flashcard-word-overlay" id="flashcardWordOverlay" hidden>
            ${lmEscape(word.en.toUpperCase())}
            ${word.pt ? `<span class="flashcard-word-pt">${lmEscape(word.pt)}</span>` : ''}
          </div>
        </div>
        <div class="game-btn-row" style="justify-content:center;margin:14px 0">
          ${mode === 'peek' ? `<button class="game-btn" id="peekBtn">👀 Peek!</button>` : `<button class="game-btn" id="revealBlurBtn">🌫️ Reveal</button>`}
          <button class="game-btn secondary" id="showWordBtn">${revealed ? 'Word Revealed' : 'Show Word'}</button>
        </div>
      </div>
      <div class="game-btn-row" style="justify-content:center;margin-top:10px">
        <button class="game-btn secondary" id="prevBtn">⬅ Prev</button>
        <button class="game-btn secondary" id="nextBtn">Next ➡</button>
      </div>
    `;

    container.querySelectorAll('.flash-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => { mode = btn.dataset.mode; paint(); });
    });

    const media = document.getElementById('flashcardMedia');
    const wordOverlay = document.getElementById('flashcardWordOverlay');
    const showWordBtn = document.getElementById('showWordBtn');

    if (mode === 'peek') {
      document.getElementById('peekBtn').addEventListener('click', () => {
        media.classList.remove('hidden-media');
        setTimeout(() => media.classList.add('hidden-media'), 1000);
      });
    } else {
      document.getElementById('revealBlurBtn').addEventListener('click', () => {
        media.classList.remove('blurred');
      });
    }

    showWordBtn.addEventListener('click', (e) => {
      if (revealed) return;
      revealed = true;
      wordOverlay.hidden = false;
      showWordBtn.textContent = 'Word Revealed';
      lmSpeak(word.en, 0.9);
    });
    document.getElementById('prevBtn').addEventListener('click', () => { index = (index - 1 + words.length) % words.length; paint(); });
    document.getElementById('nextBtn').addEventListener('click', () => { index = (index + 1) % words.length; paint(); });
  }

  paint();
}

/* ==========================================================================
   TEARDOWN — called when the topic modal switches tabs or closes
   ========================================================================== */
function stopLearningModules() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
