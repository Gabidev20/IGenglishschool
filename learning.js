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
  if (word.swatch) return `<div class="word-visual ${sizeClass}" style="background:${word.swatch}"></div>`;
  if (word.image) {
    return `<div class="word-visual ${sizeClass}"><img src="${word.image}" alt="${lmEscape(word.en)}" loading="lazy"
      onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'emoji-fallback',textContent:'${word.emoji}'}))" /></div>`;
  }
  return `<div class="word-visual ${sizeClass}"><span class="emoji-fallback">${word.emoji}</span></div>`;
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
};
function lmCategory(topic) {
  return TOPIC_CATEGORY[topic.id] || { noun: 'word', article: 'a' };
}

/* ==========================================================================
   1) READING TIME
   ========================================================================== */

function buildReadingContent(level, topic) {
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

  return { sentences, quiz: buildReadingQuiz(level, topic) };
}

function lmMakeTypo(word) {
  const letters = word.split('');
  if (letters.length < 2) return word + word[0];
  const i = Math.floor(Math.random() * (letters.length - 1));
  [letters[i], letters[i + 1]] = [letters[i + 1], letters[i]];
  return letters.join('');
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
  const intruderTopic = lmShuffle(otherTopics)[0];
  const intruderWord = intruderTopic ? lmShuffle(intruderTopic.words)[0] : null;
  const q2Real = lmShuffle(words.filter(w => w.id !== q2w.id)).slice(0, 2);
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
    const wrongSpellings = [lmMakeTypo(q3w.en), lmMakeTypo(q3w.en)];
    const q3Options = lmShuffle([q3w.en, ...wrongSpellings]);
    q3 = { prompt: `Which is the correct spelling?`, visual: q3w, options: q3Options, correct: q3w.en };
  }

  return [q1, q2, q3];
}

function renderReadingModule(container, level, topic) {
  const content = buildReadingContent(level, topic);

  container.innerHTML = `
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

function renderQuizList(container, quiz) {
  container.innerHTML = quiz.map((q, i) => `
    <div class="quiz-question" data-q="${i}">
      <p class="quiz-prompt">${i + 1}. ${q.prompt}</p>
      ${q.visual ? lmWordVisual(q.visual, 'quiz-visual') : ''}
      <div class="quiz-options">
        ${q.options.map(opt => `<button class="quiz-option" data-answer="${lmEscape(opt)}">${lmEscape(opt)}</button>`).join('')}
      </div>
    </div>
  `).join('') + `<p class="quiz-result" id="quizResult" hidden></p>`;

  let answeredCount = 0;
  let correctCount = 0;

  container.querySelectorAll('.quiz-question').forEach((qEl, i) => {
    const correct = quiz[i].correct;
    qEl.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (qEl.classList.contains('answered')) return;
        qEl.classList.add('answered');
        answeredCount++;
        const isRight = btn.dataset.answer === correct;
        if (isRight) { btn.classList.add('correct'); correctCount++; }
        else {
          btn.classList.add('wrong');
          qEl.querySelectorAll('.quiz-option').forEach(b => { if (b.dataset.answer === correct) b.classList.add('correct'); });
        }
        qEl.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);

        if (answeredCount === quiz.length) {
          const resultEl = document.getElementById('quizResult');
          resultEl.hidden = false;
          resultEl.textContent = `You got ${correctCount}/${quiz.length}! 🎉`;
          if (typeof awardProgress === 'function') awardProgress(correctCount * 5, correctCount === quiz.length ? 1 : 0);
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
  return {
    type: 'fillblank',
    before: `My favorite ${cat.noun} is`,
    after: '.',
    correct: target.en,
    options: lmShuffle([target, ...distractors]).map(w => w.en),
  };
}
function makeSpellingExercise(word) {
  const letters = word.en.toUpperCase().replace(/[^A-Z]/g, '').split('');
  const decoyPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l => !letters.includes(l));
  const decoys = lmShuffle(decoyPool).slice(0, 2);
  return { type: 'spelling', word, letters, tiles: lmShuffle([...letters, ...decoys]) };
}

function buildPracticeSession(level, topic) {
  const reading = buildReadingContent(level, topic);
  const words = lmShuffle(topic.words);
  const longSentences = lmShuffle(reading.sentences.filter(s => s.text.split(' ').length >= 4));
  const s = (i) => longSentences[i % longSentences.length] || reading.sentences[i % reading.sentences.length];

  return [
    makeSentenceExercise(s(0)),
    makeListeningExercise(words[0 % words.length], topic),
    makeFillBlankExercise(topic, words),
    makeSpellingExercise(words[1 % words.length]),
    makeListeningExercise(words[2 % words.length], topic),
    makeSentenceExercise(s(1)),
  ];
}

function renderPracticeArena(container, level, topic) {
  const state = { exercises: buildPracticeSession(level, topic), index: 0, hearts: 5, xp: 0 };

  function paintShell() {
    if (state.hearts <= 0) return paintGameOver();
    if (state.index >= state.exercises.length) return paintComplete();
    container.innerHTML = `
      <div class="practice-header">
        <div class="practice-hearts">${'❤️'.repeat(state.hearts)}${'🖤'.repeat(5 - state.hearts)}</div>
        <div class="practice-progress">Question ${state.index + 1} / ${state.exercises.length}</div>
        <div class="practice-xp">⭐ ${state.xp} XP</div>
      </div>
      <div class="practice-exercise" id="practiceExercise"></div>
    `;
    renderExercise(document.getElementById('practiceExercise'), state.exercises[state.index], handleResult);
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
      hint.textContent = `Correct spelling: ${ex.word.en}`;
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
  let placed = [null, null, null];
  let tiles = [];

  function newWord() {
    word = drawPhonicsWord(topic.id);
    placed = [null, null, null];
    tiles = lmShuffle(word.split(''));
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
          ${[0, 1, 2].map(i => `<button class="blend-slot" data-slot="${i}">${placed[i] || '_'}</button>`).join('')}
        </div>
        <div class="sentence-tray" id="blendTray">
          ${tiles.map((t, i) => `<button class="word-tile letter-tile" data-uid="${i}" ${placed.includes(t) ? 'disabled' : ''}>${t}</button>`).join('')}
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

    let trayIndex = 0;
    container.querySelectorAll('#blendTray .word-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextSlot = placed.findIndex(p => !p);
        if (nextSlot === -1) return;
        placed[nextSlot] = btn.textContent;
        btn.disabled = true;
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
      let i = 0;
      const speakNext = () => {
        if (i < placed.length) { lmSpeak(placed[i], 0.6); i++; setTimeout(speakNext, 550); }
        else setTimeout(() => lmSpeak(placed.join(''), 0.8), 300);
      };
      speakNext();
    });
    document.getElementById('blendResetBtn').addEventListener('click', () => { placed = [null, null, null]; paint(); });
    document.getElementById('blendNextBtn').addEventListener('click', newWord);
  }

  tiles = lmShuffle(word.split(''));
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
      <div class="flashcard">
        <div class="flashcard-media ${mode === 'blur' ? 'blur-mode blurred' : 'peek-mode hidden-media'}" id="flashcardMedia">
          ${lmWordVisual(word, 'flashcard-visual')}
        </div>
        <div class="game-btn-row" style="justify-content:center;margin:14px 0">
          ${mode === 'peek' ? `<button class="game-btn" id="peekBtn">👀 Peek!</button>` : `<button class="game-btn" id="revealBlurBtn">🌫️ Reveal</button>`}
          <button class="game-btn secondary" id="showWordBtn">${revealed ? lmEscape(word.en) : 'Show Word'}</button>
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

    document.getElementById('showWordBtn').addEventListener('click', (e) => {
      revealed = true;
      e.target.textContent = word.en;
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
