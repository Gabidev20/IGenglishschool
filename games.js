/* ==========================================================================
   IGenglishschool — Game Engine
   Self-contained module exposing GameEngine.mount(container, topic, type)
   ========================================================================== */

// `needs` says what a game must have before it can be offered:
//   'words'     — a vocabulary bank. Every topic and custom game has one.
//   'sentences' — example sentences (lessonKit.js builds them from the
//                 topic's reading text and its rule examples).
//   'rules'     — a grammar rule set with two or more forms to sort between.
//   'clothes'   — a wardrobe topic: Dress Up dresses a doll, so it only makes
//                 sense where the words are actual garments.
// Custom games from the Game Maker only carry words, so the last three are kept
// away from them — see WORD_GAME_TYPES / gamesForTopic below.
const GAME_TYPES = [
  { id: 'hangman', label: 'Hangman', icon: '🎯', needs: 'words' },
  { id: 'memory', label: 'Memory', icon: '🧠', needs: 'words' },
  { id: 'matchup', label: 'Match-up', icon: '🔗', needs: 'words' },
  { id: 'balloon', label: 'Balloon Pop', icon: '🎈', needs: 'words' },
  { id: 'wordsearch', label: 'Word Search', icon: '🔍', needs: 'words' },
  { id: 'unscramble', label: 'Unscramble', icon: '🧩', needs: 'sentences' },
  { id: 'sortit', label: 'Sort It', icon: '🎯', needs: 'rules' },
  { id: 'dressup', label: 'Dress Up', icon: '🧥', needs: 'clothes' },
  { id: 'backpack', label: 'Backpack', icon: '🎒', needs: 'school' },
  { id: 'house', label: 'House', icon: '🏠', needs: 'house' },
  { id: 'animal', label: 'Animal Builder', icon: '🦁', needs: 'animals' },
  { id: 'feelings', label: 'Faces', icon: '😊', needs: 'feelings' },
  { id: 'instruments', label: 'Music', icon: '🎸', needs: 'instruments' },
  { id: 'prepositions', label: 'Where is it?', icon: '📦', needs: 'prepositions' },
  { id: 'weather', label: 'Weather', icon: '🌦️', needs: 'weather' },
  { id: 'body', label: 'Body Parts', icon: '🧍', needs: 'body' },
];

// Words that mark a topic as a wardrobe topic. Three hits is enough: a single
// "shoes" in a sports topic shouldn't summon a dressing-up doll.
const CLOTHES_HINTS = [
  'shirt', 't-shirt', 'tshirt', 'blouse', 'dress', 'skirt', 'trousers', 'pants',
  'jeans', 'shorts', 'coat', 'jacket', 'sweater', 'jumper', 'hoodie', 'scarf',
  'hat', 'cap', 'gloves', 'socks', 'shoes', 'sneakers', 'trainers', 'boots',
  'sandals', 'uniform', 'pyjamas', 'pajamas', 'raincoat', 'sunglasses',
];

function isClothesTopic(topic) {
  const label = `${topic.id || ''} ${topic.title || ''}`.toLowerCase();
  if (label.includes('cloth')) return true;
  const hits = (topic.words || [])
    .filter(w => CLOTHES_HINTS.includes(String(w.en || '').trim().toLowerCase()));
  return hits.length >= 3;
}

// The subset a bare word list can run — what the Game Maker offers.
const WORD_GAME_TYPES = GAME_TYPES.filter(g => g.needs === 'words');

// Which games THIS topic can actually offer. A vocabulary topic has no
// grammar rules to sort, so Sort It is simply not shown for it rather than
// being shown and then apologising.
// Picture-scene games and Balloon Pop are made for children. With a
// learner of 15+ (or a teacher of grown-ups only, nobody selected) the
// topic offers the word and sentence games instead.
const KIDS_ONLY_GAMES = ['balloon', 'dressup', 'backpack', 'house', 'animal', 'feelings', 'instruments', 'prepositions', 'weather', 'body'];

function gamesForTopic(topic) {
  const grown = typeof igAdultContext === 'function' && igAdultContext();
  return GAME_TYPES.filter(g => {
    if (grown && KIDS_ONLY_GAMES.includes(g.id)) return false;
    if (g.needs === 'sentences') {
      return typeof lkSentences === 'function' && lkSentences(topic).length >= 3;
    }
    if (g.needs === 'rules') {
      return typeof lkSort === 'function' && Boolean(lkSort(topic));
    }
    if (g.needs === 'clothes') {
      return isClothesTopic(topic);
    }
    if (g.needs === 'school') {
      return typeof isSchoolTopic === 'function' && isSchoolTopic(topic);
    }
    if (g.needs === 'house') {
      return typeof isHouseTopic === 'function' && isHouseTopic(topic);
    }
    if (g.needs === 'animals') {
      return typeof isAnimalTopic === 'function' && isAnimalTopic(topic);
    }
    if (g.needs === 'feelings') {
      return typeof isFeelingsTopic === 'function' && isFeelingsTopic(topic);
    }
    if (g.needs === 'instruments') {
      return typeof isInstrumentsTopic === 'function' && isInstrumentsTopic(topic);
    }
    if (g.needs === 'prepositions') {
      return typeof isPrepositionsTopic === 'function' && isPrepositionsTopic(topic);
    }
    if (g.needs === 'weather') {
      return typeof isWeatherTopic === 'function' && isWeatherTopic(topic);
    }
    if (g.needs === 'body') {
      return typeof isBodyTopic === 'function' && isBodyTopic(topic);
    }
    return (topic.words || []).length > 0;
  });
}

const GameEngine = (() => {

  // -------------------------------------------------------------------------
  // SHARED HELPERS
  // -------------------------------------------------------------------------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickN(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  const wordVisualHTML = (word, extraClass) => igWordVisualHTML(word, extraClass);

  // The shared sound palette (utils.js) — richer than single beeps, and it
  // respects the device's mute switch.
  function playCorrect() { IGSound.correct(); }
  function playWrong() { IGSound.wrong(); }
  function playWin() { IGSound.win(); }

  const CONFETTI_COLORS = ['#f05d77', '#b8953a', '#a9b4a4', '#8e6d86', '#c9435c'];
  function confettiBurst(x, y) {
    for (let i = 0; i < 24; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 90;
      el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      el.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      el.style.setProperty('--rot', `${Math.random() * 360}deg`);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }
  }

  function confettiFromElement(el) {
    const rect = el.getBoundingClientRect();
    confettiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  // Word decks: remaining-words-until-exhausted, keyed by "topicId:gameType"
  const decks = {};
  function drawFromDeck(key, words) {
    if (!decks[key] || decks[key].length === 0) {
      decks[key] = shuffle(words);
    }
    return decks[key].shift();
  }
  function resetDeck(key) {
    delete decks[key];
  }

  // Active intervals/animation frames that must be cleared on teardown
  let activeTimers = [];
  function trackTimer(id) { activeTimers.push(id); return id; }
  function clearAllTimers() {
    activeTimers.forEach(id => { clearInterval(id); clearTimeout(id); });
    activeTimers = [];
  }

  // -------------------------------------------------------------------------
  // 1) HANGMAN
  // -------------------------------------------------------------------------
  const MAX_WRONG = 6;
  const QWERTY = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');

  // Hangman is letter-by-letter, so a 16-letter phrase ("Nice to meet you")
  // is a chore rather than a game. Word banks legitimately hold phrases —
  // they're the right content for Memory, Match-up, Flashcards and the
  // quizzes — so Hangman just prefers the guessable ones, and only falls
  // back to the whole bank when a topic has nothing shorter (grammar topics
  // built entirely from example sentences).
  const HANGMAN_MAX_LETTERS = 10;

  function hangmanPlayableWords(words) {
    const short = words.filter(w => w.en.replace(/[^A-Za-z]/g, '').length <= HANGMAN_MAX_LETTERS);
    return short.length >= 4 ? short : words;
  }

  function renderHangman(container, topic) {
    const deckKey = `${topic.id}:hangman`;
    const playable = hangmanPlayableWords(topic.words);
    let state = null;

    function newRound(resetWholeDeck) {
      if (resetWholeDeck) resetDeck(deckKey);
      state = {
        word: drawFromDeck(deckKey, playable),
        guessed: new Set(),
        wrong: 0,
        status: 'playing',
      };
      paint();
    }

    function letters(word) {
      return word.en.toUpperCase().split('');
    }

    function isWon() {
      return letters(state.word).every(ch => !/[A-Z]/.test(ch) || state.guessed.has(ch));
    }

    function guess(letter) {
      if (state.status !== 'playing' || state.guessed.has(letter)) return;
      state.guessed.add(letter);
      const inWord = letters(state.word).includes(letter);
      if (inWord) {
        playCorrect();
        if (isWon()) {
          state.status = 'won';
          igMiss(state.word, true, 'Hangman');
          playWin();
          if (typeof awardProgress === 'function') awardProgress(10, 0);
        }
      } else {
        state.wrong++;
        playWrong();
        if (state.wrong >= MAX_WRONG) { state.status = 'lost'; igMiss(state.word, false, 'Hangman'); setTimeout(() => IGSound.wrong(), 250); }
      }
      paint();
    }

    function gallowsSVG(wrong) {
      const parts = [
        `<line x1="10" y1="150" x2="110" y2="150"/>`,
        `<line x1="35" y1="150" x2="35" y2="20"/>`,
        `<line x1="35" y1="20" x2="90" y2="20"/>`,
        `<line x1="90" y1="20" x2="90" y2="40"/>`,
      ];
      const figure = [
        `<circle class="figure" cx="90" cy="55" r="15"/>`,
        `<line class="figure" x1="90" y1="70" x2="90" y2="110"/>`,
        `<line class="figure" x1="90" y1="80" x2="70" y2="95"/>`,
        `<line class="figure" x1="90" y1="80" x2="110" y2="95"/>`,
        `<line class="figure" x1="90" y1="110" x2="72" y2="135"/>`,
        `<line class="figure" x1="90" y1="110" x2="108" y2="135"/>`,
      ];
      const shown = parts.concat(figure.slice(0, wrong));
      return `<svg class="gallows-svg" viewBox="0 0 140 160" width="150" height="170">${shown.join('')}</svg>`;
    }

    function paint() {
      const remaining = MAX_WRONG - state.wrong;
      const wordLetters = letters(state.word);
      const revealAll = state.status !== 'playing';

      const slots = wordLetters.map(ch => {
        if (!/[A-Z]/.test(ch)) return `<span class="hangman-letter-slot is-space"> </span>`;
        const show = state.guessed.has(ch) || revealAll;
        const revealedCls = state.guessed.has(ch) ? 'revealed' : '';
        return `<span class="hangman-letter-slot ${revealedCls}">${show ? ch : ''}</span>`;
      }).join('');

      const keyboard = QWERTY.map(letter => {
        const used = state.guessed.has(letter);
        const inWord = letters(state.word).includes(letter);
        let cls = '';
        if (used) cls = inWord ? 'correct' : 'wrong';
        return `<button class="key-btn ${cls}" data-letter="${letter}" ${used || state.status !== 'playing' ? 'disabled' : ''}>${letter}</button>`;
      }).join('');

      let banner = '';
      if (state.status === 'won') {
        banner = `<div class="game-end-banner win">🎉 You got it! <p>The word was <strong>${state.word.en}</strong>.</p></div>`;
      } else if (state.status === 'lost') {
        banner = `<div class="game-end-banner lose">😅 So close! <p>The word was <strong>${state.word.en}</strong>.</p></div>`;
      }

      container.innerHTML = `
        <div class="game-toolbar">
          <span class="game-status-pill">${playable.length - (decks[deckKey] ? decks[deckKey].length : 0)} / ${playable.length} words · ${remaining} tries left</span>
          <div class="game-btn-row">
            <button class="game-btn secondary" data-action="restart">🔄 New Game</button>
            <button class="game-btn" data-action="next">➡️ Next Word</button>
          </div>
        </div>
        <div class="hangman-layout">
          <div class="hangman-stage">
            ${gallowsSVG(state.wrong)}
          </div>
          <div>
            <div class="hangman-category">Category: ${topic.title}</div>
            ${wordVisualHTML(state.word, 'hangman-word-visual')}
            ${(() => { const h = hangmanHint(state.word, topic); return `
            <div class="hangman-hint">
              <p class="hangman-hint-en">💡 <b>Hint:</b> ${igEscapeHtml(h.en)}</p>
              <button type="button" class="game-btn secondary hangman-hint-btn" data-action="hint-pt" ${state.hintPt ? 'hidden' : ''}>🇧🇷 Ver dica em português</button>
              ${state.hintPt ? `<p class="hangman-hint-pt">🇧🇷 <b>Dica:</b> ${igEscapeHtml(h.pt)}</p>` : ''}
            </div>`; })()}
            <div class="hangman-word">${slots}</div>
            <div class="keyboard">${keyboard}</div>
            ${banner}
          </div>
        </div>
      `;

      container.querySelectorAll('.key-btn').forEach(btn => {
        btn.addEventListener('click', () => guess(btn.dataset.letter));
      });
      container.querySelector('[data-action="next"]').addEventListener('click', () => newRound(false));
      container.querySelector('[data-action="restart"]').addEventListener('click', () => newRound(true));
      const ptBtn = container.querySelector('[data-action="hint-pt"]');
      if (ptBtn) ptBtn.addEventListener('click', () => { state.hintPt = true; paint(); });
    }

    newRound(true);
  }

  // What each greeting / classroom phrase is for — a phrase has no "kind".
  const HANGMAN_CLUES = {
    'hello': 'You say it when you meet someone.', 'hi': 'A short, friendly way to say hello.',
    'good morning': 'You say it before lunch.', 'good afternoon': 'You say it after lunch.',
    'good evening': 'You say it when it gets dark, when you arrive.', 'good night': 'You say it when you go to bed.',
    'goodbye': 'You say it when you leave.', 'bye': 'A short way to say goodbye.',
    'see you later': 'You say it when you will see the person again today.', 'see you tomorrow': 'You say it when you will see the person the next day.',
    'welcome': 'You say it when someone arrives at your house or school.', 'please': 'A magic word when you ask for something.',
    'thank you': 'You say it when someone gives you something or helps you.', "you're welcome": 'The answer to "thank you".',
    'sorry': 'You say it when you make a mistake.', 'excuse me': 'You say it to ask for attention or to pass.',
    'yes': 'The opposite of "no".', 'no': 'The opposite of "yes".', 'nice to meet you': 'You say it when you meet someone for the first time.',
    'how are you?': 'You ask it to know if a person is OK.', 'how are you': 'You ask it to know if a person is OK.',
    'i am fine': 'An answer to "How are you?".', 'what is your name?': 'You ask it to know what to call someone.',
    'what is your name': 'You ask it to know what to call someone.', 'my name is...': 'You say it to tell people what to call you.',
    'my name is': 'You say it to tell people what to call you.', 'this is my friend': 'You say it to introduce your friend.',
  };

  // Otherwise, what KIND of thing the word is, from the topic it belongs to.
  function hangmanCategoryClue(topic, word) {
    const t = `${topic.id || ''} ${topic.title || ''}`.toLowerCase();
    const en = String(word.en || '').toLowerCase();
    if (typeof IG_DAYS !== 'undefined' && IG_DAYS[en]) return "It's a day of the week.";
    if (typeof IG_MONTHS !== 'undefined' && IG_MONTHS[en]) return "It's a month of the year.";
    if (typeof IG_NUMBER_WORDS !== 'undefined' && Object.prototype.hasOwnProperty.call(IG_NUMBER_WORDS, en)) return "It's a number.";
    if (word.swatch) return "It's a color.";
    if (/ing\b/.test(en) && !/(thing|ceiling|building|evening|morning|king|ring|spring|swing|living room|dining room)/.test(en)) {
      return "It's an action — something people do.";
    }
    const rules = [
      [/animal|pet|lion|zoo/, "It's an animal."],
      [/fruit|food|meal|restaurant/, 'You can eat it or drink it.'],
      [/cloth|wear|fashion/, 'You wear it.'],
      [/weather/, "It's about the weather."],
      [/house|room|home/, "It's a room or a thing in a house."],
      [/school|classroom|backpack/, 'You use it at school.'],
      [/family/, "It's a person in a family, or a feeling."],
      [/feeling|emotion|personality/, "It's how a person feels or is."],
      [/colou?r|shape/, "It's a color or a shape."],
      [/job|work|office/, "It's about work."],
      [/hobb|free time|sport/, 'People do it for fun.'],
      [/travel|airport|hotel/, "It's about travelling."],
      [/body|health|doctor/, "It's about the body or health."],
      [/routine|present|past|continuous|verb|can/, "It's an action — something people do."],
      [/preposition|where/, 'It says WHERE something is.'],
      [/pronoun|possessive/, 'It is used instead of a name.'],
    ];
    const hit = rules.find(([re]) => re.test(t));
    return hit ? hit[1] : `It's a word from "${String(topic.title || '').replace(/\s*\(Unit \d+\)\s*$/, '')}".`;
  }

  // A clue in English for the hangman word — a sentence from the topic with
  // the word hidden ("___, can I have some water?"), otherwise the topic,
  // the first letter and the length. The Portuguese clue (behind a button)
  // is the meaning.
  function hangmanHint(word, topic) {
    const en = String(word.en || '').trim();
    const blank = en.replace(/[A-Za-z]/g, '_');
    const esc = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${esc}\\b`, 'i');
    const pool = []
      .concat(Array.isArray(topic.practiceSentences) ? topic.practiceSentences : [])
      .concat(typeof lkSentences === 'function' ? lkSentences(topic) : [])
      .concat(topic.readingTime && topic.readingTime.text ? String(topic.readingTime.text).split('\n') : []);
    const line = pool
      .map(x => String(x).replace(/^[A-Z][a-z]+:\s*/, '').trim())
      .find(x => re.test(x) && x.toLowerCase() !== en.toLowerCase() && x.split(/\s+/).length >= 3);
    const letters = en.replace(/[^A-Za-z]/g, '').length;
    const shape = `It starts with "${en.charAt(0).toUpperCase()}" and has ${letters} letters.`;
    // A real clue first (what the word is), then a sentence it fits in,
    // then the first letter and the length.
    const meaning = HANGMAN_CLUES[en.toLowerCase().replace(/[.?!…]+$/, '')] || hangmanCategoryClue(topic, word);
    const context = line ? `${line.replace(re, blank)}${/[.?!]$/.test(line) ? '' : '.'}` : '';
    const enHint = [meaning, context, shape].filter(Boolean).join(' ');
    const pt = word.pt
      ? `significa "${word.pt}" — começa com "${en.charAt(0).toUpperCase()}" (${letters} letras).`
      : `começa com "${en.charAt(0).toUpperCase()}" e tem ${letters} letras.`;
    return { en: enHint, pt };
  }

  // -------------------------------------------------------------------------
  // 2) MEMORY GAME
  // -------------------------------------------------------------------------
  function renderMemory(container, topic) {
    const words = pickN(topic.words, Math.min(6, topic.words.length));

    let cards, flipped, matched, lock, moves;

    function setup() {
      const pool = [];
      words.forEach(w => {
        pool.push({ uid: `${w.id}-img`, matchId: w.id, kind: 'visual', word: w });
        pool.push({ uid: `${w.id}-txt`, matchId: w.id, kind: 'text', word: w });
      });
      cards = shuffle(pool);
      flipped = [];
      matched = new Set();
      lock = false;
      moves = 0;
      paint();
    }

    function cardFaceFront(card) {
      if (card.kind === 'visual') return wordVisualHTML(card.word);
      return `<span class="memory-word-label">${card.word.en.toUpperCase()}</span>`;
    }

    function paint() {
      const won = matched.size === cards.length;
      container.innerHTML = `
        <div class="game-toolbar">
          <span class="game-status-pill">${matched.size / 2} / ${words.length} pairs · ${moves} moves</span>
          <div class="game-btn-row">
            <button class="game-btn secondary" data-action="restart">🔄 Play Again</button>
          </div>
        </div>
        <div class="memory-grid-wrapper">
          <div class="memory-grid">
            ${cards.map((card, i) => `
              <button class="memory-card ${flipped.includes(i) || matched.has(i) ? 'flipped' : ''} ${matched.has(i) ? 'matched' : ''}" data-index="${i}">
                <div class="memory-card-inner">
                  <div class="memory-face back">❓</div>
                  <div class="memory-face front">${cardFaceFront(card)}</div>
                </div>
              </button>
            `).join('')}
          </div>
          ${won ? `<div class="game-end-banner win" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100">🎉 Great memory! <p>Solved in ${moves} moves.</p></div>` : ''}
        </div>
      `;

      container.querySelectorAll('.memory-card').forEach(btn => {
        btn.addEventListener('click', () => flipCard(Number(btn.dataset.index)));
      });
      container.querySelector('[data-action="restart"]').addEventListener('click', setup);

      if (won) {
        confettiFromElement(container.querySelector('.game-end-banner'));
        if (typeof awardProgress === 'function') awardProgress(15, 0);
      }
    }

    function flipCard(index) {
      if (lock || matched.has(index) || flipped.includes(index)) return;
      flipped.push(index);
      IGSound.flip();
      if (flipped.length === 1) { paint(); return; }

      moves++;
      lock = true;
      paint();

      const [a, b] = flipped;
      const isMatch = cards[a].matchId === cards[b].matchId;

      const timer = setTimeout(() => {
        if (isMatch) {
          matched.add(a); matched.add(b);
          playCorrect();
          if (matched.size === cards.length) setTimeout(playWin, 350);
        } else {
          playWrong();
          const els = [a, b].map(i => container.querySelector(`.memory-card[data-index="${i}"]`));
          els.forEach(el => el && el.classList.add('shake'));
        }
        flipped = [];
        lock = false;
        paint();
      }, isMatch ? 500 : 800);
      trackTimer(timer);
    }

    setup();
  }

  // -------------------------------------------------------------------------
  // 3) MATCH-UP
  // -------------------------------------------------------------------------
  const PAIR_COLORS = ['#f05d77', '#b8953a', '#a9b4a4', '#8e6d86', '#c9435c', '#6f7d68'];

  function renderMatchup(container, topic) {
    const words = pickN(topic.words, Math.min(6, topic.words.length));
    let leftOrder, rightOrder, selectedLeft, selectedRight, matchedIds;

    function setup() {
      leftOrder = shuffle(words);
      rightOrder = shuffle(words);
      selectedLeft = null;
      selectedRight = null;
      matchedIds = new Set();
      paint();
    }

    function colorFor(wordId) {
      const idx = words.findIndex(w => w.id === wordId);
      return PAIR_COLORS[idx % PAIR_COLORS.length];
    }

    function paint() {
      const won = matchedIds.size === words.length;
      container.innerHTML = `
        <div class="game-toolbar">
          <span class="game-status-pill">${matchedIds.size} / ${words.length} matched</span>
          <div class="game-btn-row">
            <button class="game-btn secondary" data-action="restart">🔄 Shuffle Again</button>
          </div>
        </div>
        <div class="matchup-board">
          <div class="matchup-col">
            ${leftOrder.map(w => `
              <button class="matchup-item ${matchedIds.has(w.id) ? 'matched' : ''} ${selectedLeft === w.id ? 'selected' : ''}"
                      data-side="left" data-id="${w.id}" ${matchedIds.has(w.id) ? 'disabled' : ''}
                      style="--pair-color:${colorFor(w.id)}">
                <span class="pair-dot"></span>${wordVisualHTML(w)}
              </button>
            `).join('')}
          </div>
          <div class="matchup-col">
            ${rightOrder.map(w => `
              <button class="matchup-item ${matchedIds.has(w.id) ? 'matched' : ''} ${selectedRight === w.id ? 'selected' : ''}"
                      data-side="right" data-id="${w.id}" ${matchedIds.has(w.id) ? 'disabled' : ''}
                      style="--pair-color:${colorFor(w.id)}">
                <span class="pair-dot"></span>${w.en}
              </button>
            `).join('')}
          </div>
        </div>
        ${won ? `<div class="game-end-banner win">🎉 Perfect matching!</div>` : ''}
      `;

      container.querySelectorAll('.matchup-item').forEach(btn => {
        btn.addEventListener('click', () => select(btn.dataset.side, btn.dataset.id));
      });
      container.querySelector('[data-action="restart"]').addEventListener('click', setup);

      if (won) {
        confettiFromElement(container.querySelector('.game-end-banner'));
        if (typeof awardProgress === 'function') awardProgress(15, 0);
      }
    }

    function select(side, id) {
      if (matchedIds.has(id) && (side === 'left' ? selectedLeft !== id : selectedRight !== id)) return;
      if (side === 'left') selectedLeft = (selectedLeft === id) ? null : id;
      else selectedRight = (selectedRight === id) ? null : id;
      if (!(selectedLeft && selectedRight)) IGSound.click();

      if (selectedLeft && selectedRight) {
        if (selectedLeft === selectedRight) {
          matchedIds.add(selectedLeft);
          igMiss(words.find(w => w.id === selectedLeft), true, 'Match-up');
          playCorrect();
          if (matchedIds.size === words.length) setTimeout(playWin, 350);
          selectedLeft = null; selectedRight = null;
          paint();
        } else {
          playWrong();
          igMiss(words.find(w => w.id === selectedLeft), false, 'Match-up');
          const badLeft = selectedLeft, badRight = selectedRight;
          paint();
          const leftEl = container.querySelector(`.matchup-item[data-side="left"][data-id="${badLeft}"]`);
          const rightEl = container.querySelector(`.matchup-item[data-side="right"][data-id="${badRight}"]`);
          [leftEl, rightEl].forEach(el => el && el.classList.add('shake'));
          const t = setTimeout(() => { selectedLeft = null; selectedRight = null; paint(); }, 500);
          trackTimer(t);
          return;
        }
      } else {
        paint();
      }
    }

    setup();
  }

  // -------------------------------------------------------------------------
  // 4) BALLOON POP — exactly ROUND_SIZE target words per round, then a
  // victory screen. Not deck-based/infinite like Hangman: the round has a
  // hard end so spawning always stops and progress is always summarized.
  // -------------------------------------------------------------------------
  const BALLOON_ROUND_SIZE = 10;

  function renderBalloon(container, topic) {
    const palette = ['#f05d77', '#b8953a', '#a9b4a4', '#8e6d86', '#c9435c'];
    let targetQueue, roundIndex, target, score, misses, spawnTimer, balloonSeq, ended;

    // Builds exactly BALLOON_ROUND_SIZE targets by concatenating fresh
    // shuffles of the topic's word bank (which is usually smaller than 10),
    // so a short list still produces a clean, bounded 10-word round instead
    // of repeating the very same word back-to-back where avoidable.
    function buildTargetQueue() {
      const queue = [];
      while (queue.length < BALLOON_ROUND_SIZE) queue.push(...shuffle(topic.words));
      return queue.slice(0, BALLOON_ROUND_SIZE);
    }

    function setup() {
      targetQueue = buildTargetQueue();
      roundIndex = 0;
      target = targetQueue[0];
      score = 0; misses = 0; ended = false;
      balloonSeq = 0;
      paintShell();
      spawnTimer = trackTimer(setInterval(spawnBalloon, 1400));
      spawnBalloon();
    }

    function restart() {
      clearInterval(spawnTimer);
      container.querySelectorAll('.balloon').forEach(b => b.remove());
      setup();
    }

    function paintShell() {
      container.innerHTML = `
        <div class="game-toolbar">
          <span class="game-status-pill">Word ${roundIndex + 1} of ${BALLOON_ROUND_SIZE} · ✅ ${score} · ❌ ${misses}</span>
          <div class="game-btn-row">
            <button class="game-btn secondary" data-action="restart">🔄 Restart</button>
          </div>
        </div>
        <div class="balloon-progress"><div class="balloon-progress-fill" style="width:${(roundIndex / BALLOON_ROUND_SIZE) * 100}%"></div></div>
        <div class="balloon-stage" id="balloonStage">
          <div class="balloon-target">Pop the balloon that says: <strong>${target.en}</strong></div>
        </div>
      `;
      container.querySelector('[data-action="restart"]').addEventListener('click', restart);
    }

    function updateHUD() {
      const label = container.querySelector('.balloon-target');
      if (label) label.innerHTML = `Pop the balloon that says: <strong>${target.en}</strong>`;
      const pill = container.querySelector('.game-status-pill');
      if (pill) pill.textContent = `Word ${roundIndex + 1} of ${BALLOON_ROUND_SIZE} · ✅ ${score} · ❌ ${misses}`;
      const fill = container.querySelector('.balloon-progress-fill');
      if (fill) fill.style.width = `${(roundIndex / BALLOON_ROUND_SIZE) * 100}%`;
    }

    // Grammar topics sometimes use a full example sentence as a "word" (e.g.
    // "If I won the lottery, I would buy a house") — far longer than the
    // balloon's default 74x88 size. Scale the balloon up and the font down
    // for longer text instead of letting it overflow illegibly.
    // Balloons are positioned absolutely, so their size is JS, not CSS. They
    // scale with the stage: on a projector or a big tablet the same balloon is
    // half again as large, while a small stage keeps the original numbers as
    // its floor.
    function balloonScale() {
      const stage = container.querySelector('#balloonStage');
      const h = stage ? stage.getBoundingClientRect().height : 0;
      if (!h) return 1;
      return Math.max(1, Math.min(1.75, h / 320));
    }

    function balloonSizeFor(text) {
      const len = text.length;
      const k = balloonScale();
      const base = len <= 12
        ? { width: 74, height: 88, font: 0.72 }
        : {
            width: Math.min(190, 74 + (len - 12) * 3.2),
            height: Math.min(120, 88 + (len - 12) * 0.6),
            font: Math.max(0.5, 0.72 - (len - 12) * 0.006),
          };
      return {
        width: Math.round(base.width * k),
        height: Math.round(base.height * k),
        font: Number((base.font * k).toFixed(2)),
      };
    }

    function spawnBalloon() {
      if (ended) return;
      const stage = container.querySelector('#balloonStage');
      if (!stage) return;
      const isTarget = Math.random() < 0.4 || stage.querySelectorAll('.balloon').length === 0;
      const word = isTarget ? target : topic.words[Math.floor(Math.random() * topic.words.length)];

      const el = document.createElement('div');
      el.className = 'balloon';
      const duration = 6 + Math.random() * 2;
      el.style.left = `${5 + Math.random() * 80}%`;
      el.style.animationDuration = `${duration}s`;
      const color = palette[(balloonSeq++) % palette.length];
      const size = balloonSizeFor(word.en);
      el.innerHTML = `<div class="balloon-body" style="background:${color};width:${size.width}px;height:${size.height}px;font-size:${size.font}rem">${word.en}</div><div class="balloon-string"></div>`;

      // Correctness is judged live against the on-screen target, not at spawn
      // time, so it always matches what the balloon currently displays.
      el.addEventListener('click', () => popBalloon(el, word));
      // A balloon only counts as "missed" if it was still showing the CURRENT
      // target when it floated off AND it was actually spawned for that
      // target. Without the second check, a stale balloon left over from the
      // previous word could be charged as a miss the moment the new target
      // happened to use the same text.
      const spawnedForRound = roundIndex;
      const endTimer = setTimeout(() => {
        if (el.isConnected) {
          if (!ended && spawnedForRound === roundIndex && word.en === target.en) { misses++; updateHUD(); IGSound.drop(); }
          el.remove();
        }
      }, duration * 1000);
      trackTimer(endTimer);

      stage.appendChild(el);
    }

    function popBalloon(el, word) {
      if (ended || el.classList.contains('popped')) return;
      const isCorrect = word.en === target.en;
      const rect = el.getBoundingClientRect();
      if (isCorrect) {
        score++;
        igMiss(target, true, 'Balloon Pop');
        if (typeof awardProgress === 'function') awardProgress(3, 0);
        playCorrect();
        confettiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
        el.classList.add('popped');
        setTimeout(() => el.remove(), 260);
        roundIndex++;
        if (roundIndex >= BALLOON_ROUND_SIZE) {
          endRound();
        } else {
          target = targetQueue[roundIndex];
          updateHUD();
        }
      } else {
        playWrong();
        igMiss(target, false, 'Balloon Pop');
        el.style.transition = 'transform 0.2s ease';
        el.style.transform = 'translateX(6px)';
        setTimeout(() => { if (el.isConnected) el.style.transform = 'translateX(-6px)'; }, 100);
        setTimeout(() => { if (el.isConnected) el.style.transform = ''; }, 200);
      }
    }

    function endRound() {
      ended = true;
      clearInterval(spawnTimer);
      container.querySelectorAll('.balloon').forEach(b => b.remove());
      const stars = misses === 0 ? 3 : misses <= 3 ? 2 : 1;
      if (typeof awardProgress === 'function') awardProgress(10, stars);
      paintVictory(stars);
    }

    function paintVictory(stars) {
      container.innerHTML = `
        <div class="balloon-victory">
          <h3>${misses === 0 ? 'Level Complete! ⭐' : 'Awesome Job! 🎉'}</h3>
          <p class="balloon-victory-score">${score} / ${BALLOON_ROUND_SIZE} <span>balloons popped</span></p>
          <p class="balloon-victory-misses">❌ ${misses} missed</p>
          <p class="balloon-victory-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
          <div class="game-btn-row" style="justify-content:center;margin-top:18px">
            <button class="game-btn" data-action="play-again">▶ Play Again</button>
            <button class="game-btn secondary" data-action="back-to-topic">← Back to Topic</button>
          </div>
        </div>
      `;
      playWin();
      confettiFromElement(container.querySelector('.balloon-victory'));
      container.querySelector('[data-action="play-again"]').addEventListener('click', restart);
      container.querySelector('[data-action="back-to-topic"]').addEventListener('click', () => {
        if (typeof closeModal === 'function') closeModal();
      });
    }

    setup();
  }

  // -------------------------------------------------------------------------
  // 5) WORD SEARCH
  // -------------------------------------------------------------------------
  const GRID_SIZE = 10;
  const DIRECTIONS = [
    { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 },
  ];

  // Grammar topics often use a full example sentence as a "word" (e.g. "If I
  // had more money, I would travel") — far longer than the GRID_SIZE grid
  // can place whole. Rather than dropping those entirely, fall back to the
  // longest single token that DOES fit, so every topic still has enough
  // placeable words regardless of how long its vocabulary entries are.
  function wordSearchKey(en) {
    const full = en.toUpperCase().replace(/[^A-Z]/g, '');
    if (full.length >= 3 && full.length <= GRID_SIZE) return full;
    const tokens = en.toUpperCase().split(/[^A-Z]+/).filter(Boolean);
    const fitting = tokens.filter(t => t.length >= 3 && t.length <= GRID_SIZE);
    if (fitting.length === 0) return null;
    fitting.sort((a, b) => b.length - a.length);
    return fitting[0];
  }

  function buildWordSearchGrid(words) {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    const placements = [];

    const targets = words
      .map(w => ({ word: w, letters: wordSearchKey(w.en) }))
      .filter(t => t.letters)
      .sort((a, b) => b.letters.length - a.letters.length);

    targets.forEach(t => {
      let placed = false;
      for (let attempt = 0; attempt < 60 && !placed; attempt++) {
        const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const maxRow = dir.dr >= 0 ? GRID_SIZE - (dir.dr * t.letters.length) : GRID_SIZE + 1;
        const startRow = dir.dr === -1
          ? Math.floor(Math.random() * (GRID_SIZE - t.letters.length)) + t.letters.length - 1
          : Math.floor(Math.random() * (GRID_SIZE - t.letters.length + 1));
        const startCol = dir.dc === -1
          ? Math.floor(Math.random() * (GRID_SIZE - t.letters.length)) + t.letters.length - 1
          : Math.floor(Math.random() * (GRID_SIZE - t.letters.length + 1));

        const cells = [];
        let ok = true;
        for (let i = 0; i < t.letters.length; i++) {
          const r = startRow + dir.dr * i;
          const c = startCol + dir.dc * i;
          if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) { ok = false; break; }
          const existing = grid[r][c];
          if (existing && existing !== t.letters[i]) { ok = false; break; }
          cells.push([r, c]);
        }
        if (ok) {
          cells.forEach(([r, c], i) => { grid[r][c] = t.letters[i]; });
          placements.push({ word: t.word, letters: t.letters, cells });
          placed = true;
        }
      }
    });

    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!grid[r][c]) grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }

    return { grid, placements };
  }

  function renderWordSearch(container, topic) {
    let words, grid, placements, found, selecting, startCell, currentPath, gridEl;
    let celebrated = false;   // the win (confetti + reward) happens once per board

    function setup() {
      celebrated = false;
      words = pickN(topic.words, Math.min(6, topic.words.length));
      ({ grid, placements } = buildWordSearchGrid(words));
      found = new Set();
      selecting = false;
      startCell = null;
      currentPath = [];
      paint();
    }

    function paint() {
      const won = found.size === placements.length;
      container.innerHTML = `
        <div class="game-toolbar">
          <span class="game-status-pill">${found.size} / ${placements.length} words found</span>
          <div class="game-btn-row">
            <button class="game-btn secondary" data-action="restart">🔄 New Puzzle</button>
          </div>
        </div>
        <div class="wordsearch-layout">
          <div class="wordsearch-grid" style="grid-template-columns:repeat(${GRID_SIZE}, 34px)">
            ${grid.map((row, r) => row.map((letter, c) => {
              const inFoundWord = placements.some(p => found.has(p.word.id) && p.cells.some(([pr, pc]) => pr === r && pc === c));
              const inCurrent = currentPath.some(([pr, pc]) => pr === r && pc === c);
              return `<div class="ws-cell ${inFoundWord ? 'found' : ''} ${inCurrent ? 'selecting' : ''}" data-r="${r}" data-c="${c}">${letter}</div>`;
            }).join('')).join('')}
          </div>
          <div class="ws-word-list">
            ${placements.map(p => `<div class="ws-word-item ${found.has(p.word.id) ? 'found' : ''}">${p.word.en}</div>`).join('')}
          </div>
        </div>
        ${won ? `<div class="game-end-banner win">🎉 All words found!</div>` : ''}
      `;

      gridEl = container.querySelector('.wordsearch-grid');
      container.querySelector('[data-action="restart"]').addEventListener('click', setup);

      if (won && !celebrated) {
        celebrated = true;
        confettiFromElement(container.querySelector('.game-end-banner'));
        if (typeof awardProgress === 'function') awardProgress(15, 0);
      }
    }

    // Highlighting the drag path used to call paint(), rebuilding all 100
    // cells on every pointer move — which also tore the element out from
    // under the pointer mid-drag. Only the `selecting` class changes while
    // dragging, so toggle that directly and leave the DOM alone.
    function paintSelection() {
      if (!gridEl) return;
      const inPath = new Set(currentPath.map(([r, c]) => `${r},${c}`));
      gridEl.querySelectorAll('.ws-cell').forEach(cell => {
        cell.classList.toggle('selecting', inPath.has(`${cell.dataset.r},${cell.dataset.c}`));
      });
    }

    function cellFromPoint(x, y) {
      const el = document.elementFromPoint(x, y);
      return el && el.classList && el.classList.contains('ws-cell') ? el : null;
    }

    // Pointer events cover mouse, pen AND touch with one code path — the old
    // handlers listened for touchstart but never touchmove, so the puzzle was
    // unplayable on a tablet.
    function onPointerDown(e) {
      const cell = e.target.closest && e.target.closest('.ws-cell');
      if (!cell) return;
      e.preventDefault();
      selecting = true;
      startCell = [Number(cell.dataset.r), Number(cell.dataset.c)];
      currentPath = [startCell];
      IGSound.click();
      paintSelection();
    }
    function onPointerMove(e) {
      if (!selecting) return;
      const cell = cellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      extendPath(Number(cell.dataset.r), Number(cell.dataset.c));
    }
    function extendPath(r, c) {
      const [sr, sc] = startCell;
      const dr = Math.sign(r - sr), dc = Math.sign(c - sc);
      const isStraight = (dr === 0 || dc === 0 || Math.abs(r - sr) === Math.abs(c - sc));
      if (!isStraight) return;
      const steps = Math.max(Math.abs(r - sr), Math.abs(c - sc));
      const path = [[sr, sc]];
      for (let i = 1; i <= steps; i++) path.push([sr + dr * i, sc + dc * i]);
      currentPath = path;
      paintSelection();
    }
    function onEnd() {
      if (!selecting) return;
      selecting = false;
      checkSelection();
    }
    function checkSelection() {
      const letters = currentPath.map(([r, c]) => grid[r][c]).join('');
      const reversed = letters.split('').reverse().join('');
      const match = placements.find(p => !found.has(p.word.id) && (p.letters === letters || p.letters === reversed));
      if (match) {
        found.add(match.word.id);
        playCorrect();
        if (found.size === placements.length) setTimeout(playWin, 350);
      } else if (currentPath.length > 1) {
        playWrong();
      }
      currentPath = [];
      paint();
    }

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onEnd);
    container.addEventListener('pointercancel', onEnd);
    // A drag that ends outside the grid should still be evaluated.
    window.addEventListener('pointerup', onEnd);

    setup();
    return () => window.removeEventListener('pointerup', onEnd);
  }

  // -------------------------------------------------------------------------
  // MOUNT / TEARDOWN
  // -------------------------------------------------------------------------
  // Games that attach listeners outside their own container (Word Search
  // binds a window-level pointerup so a drag ending off-grid still counts)
  // return a teardown function; keep it so the next mount can run it.
  let activeCleanup = null;

  // -------------------------------------------------------------------------
  // 6) UNSCRAMBLE — put the words back in order
  //    The one game that teaches WHERE a word goes rather than what it means,
  //    which is the real difficulty of English word order for a Portuguese
  //    speaker ("she is a teacher good" is the natural mistake to make).
  // -------------------------------------------------------------------------
  const UNSCRAMBLE_ROUND = 6;

  function renderUnscramble(container, topic) {
    const all = (typeof lkSentences === 'function' ? lkSentences(topic) : []);
    if (all.length < 3) {
      container.innerHTML = '<div class="game-end-banner lose">This topic has no example sentences yet.</div>';
      return;
    }

    const sentences = pickN(all, Math.min(UNSCRAMBLE_ROUND, all.length));
    let index = 0;
    let solved = 0;
    let placed = [];   // indexes into `tiles`, in the order the student tapped
    let tiles = [];
    let checked = null;

    function setup() {
      const words = sentences[index].split(/\s+/);
      // A shuffle that happens to land on the right answer teaches nothing.
      let order, guard = 0;
      do { order = shuffle(words); guard++; }
      while (words.length > 1 && order.join(' ') === words.join(' ') && guard < 20);
      tiles = order.map(w => ({ word: w }));
      placed = [];
      checked = null;
      paint();
    }

    function paint() {
      const target = sentences[index];
      const complete = placed.length === tiles.length;

      container.innerHTML = `
        <div class="game-toolbar">
          <span class="game-status-pill">Sentence ${index + 1} / ${sentences.length} · ${solved} solved</span>
          <div class="game-btn-row">
            <button class="game-btn secondary" data-action="clear">↺ Clear</button>
            <button class="game-btn secondary" data-action="hear">🔊 Hear it</button>
          </div>
        </div>

        <div class="us-board">
          <p class="us-instruction">Tap the words in the right order.</p>

          <div class="us-answer ${checked === true ? 'right' : checked === false ? 'wrong' : ''}" id="usAnswer">
            ${placed.length === 0
              ? '<span class="us-placeholder">Your sentence appears here</span>'
              : placed.map((t, pos) => `<button class="us-tile placed" data-unplace="${pos}">${igEscapeHtml(tiles[t].word)}</button>`).join('')}
          </div>

          <div class="us-bank">
            ${tiles.map((t, i) => `
              <button class="us-tile ${placed.includes(i) ? 'spent' : ''}" data-place="${i}" ${placed.includes(i) ? 'disabled' : ''}>${igEscapeHtml(t.word)}</button>
            `).join('')}
          </div>

          ${checked === false ? `<p class="us-hint">Not yet — it should read: <strong>${igEscapeHtml(target)}</strong></p>` : ''}
          ${checked === true ? '<p class="us-hint good">Perfect! 🎉</p>' : ''}

          <div class="game-btn-row us-actions">
            ${checked === true
              ? `<button class="btn btn-primary" data-action="next">${index + 1 === sentences.length ? 'Finish →' : 'Next sentence →'}</button>`
              : `<button class="btn btn-primary" data-action="check" ${complete ? '' : 'disabled'}>Check my answer</button>`}
          </div>
        </div>
      `;

      container.querySelectorAll('[data-place]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (checked === true) return;
          placed.push(Number(btn.dataset.place));
          IGSound.click();
          checked = null;
          paint();
        });
      });
      container.querySelectorAll('[data-unplace]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (checked === true) return;
          placed.splice(Number(btn.dataset.unplace), 1);
          IGSound.drop();
          checked = null;
          paint();
        });
      });

      const act = (name, fn) => {
        const el = container.querySelector(`[data-action="${name}"]`);
        if (el) el.addEventListener('click', fn);
      };
      act('clear', () => { placed = []; checked = null; paint(); });
      act('hear', () => { if (typeof lmSpeak === 'function') lmSpeak(target, 0.85); });
      act('check', () => {
        // Capitals and punctuation are not what this game is testing.
        const norm = (str) => str.toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();
        checked = norm(placed.map(i => tiles[i].word).join(' ')) === norm(target);
        if (checked) {
          solved++;
          igMiss(target, true, 'Unscramble');
          playCorrect();
          confettiFromElement(container.querySelector('#usAnswer'));
          if (typeof awardProgress === 'function') awardProgress(10, 0);
          if (typeof lmSpeak === 'function') lmSpeak(target, 0.85);
        } else {
          playWrong();
          igMiss(target, false, 'Unscramble');
        }
        paint();
      });
      act('next', () => {
        index++;
        if (index < sentences.length) { setup(); return; }
        finish();
      });
    }

    function finish() {
      const perfect = solved === sentences.length;
      if (perfect) { playWin(); if (typeof awardProgress === 'function') awardProgress(0, 1); }
      else IGSound.bell();
      container.innerHTML = `
        <div class="game-end-banner ${perfect ? 'win' : ''}">
          ${perfect ? '🎉 Every sentence in the right order!' : `You built ${solved} of ${sentences.length}.`}
          <p>Word order is the hardest part — play it again to lock it in.</p>
          <div class="game-btn-row" style="justify-content:center;margin-top:12px">
            <button class="btn btn-primary" data-action="again">🔄 Play again</button>
          </div>
        </div>
      `;
      container.querySelector('[data-action="again"]').addEventListener('click', () => {
        renderUnscramble(container, topic);
      });
    }

    setup();
  }

  // -------------------------------------------------------------------------
  // 7) SORT IT — which form does each sentence take?
  //    Built straight from the topic's rule cards, so for Verb To Be the
  //    buckets are am / is / are and every example sorts itself under the
  //    pronoun that governs it.
  // -------------------------------------------------------------------------
  const SORT_ROUND = 10;

  function renderSortIt(container, topic) {
    const board = (typeof lkSort === 'function' ? lkSort(topic) : null);
    if (!board) {
      container.innerHTML = '<div class="game-end-banner lose">This topic has no grammar rules to sort yet.</div>';
      return;
    }

    const queue = pickN(board.items, Math.min(SORT_ROUND, board.items.length));
    let index = 0, right = 0, streak = 0, lastWrong = null;
    const sorted = {};
    board.buckets.forEach(b => { sorted[b] = []; });

    function paint() {
      const item = queue[index];
      container.innerHTML = `
        <div class="game-toolbar">
          <span class="game-status-pill">${index} / ${queue.length} · ${right} right${streak > 1 ? ' · 🔥 ' + streak : ''}</span>
          <div class="game-btn-row">
            <button class="game-btn secondary" data-action="restart">🔄 Play Again</button>
          </div>
        </div>

        <div class="sort-board">
          <p class="sort-prompt">${igEscapeHtml(board.prompt)}</p>
          <div class="sort-card ${lastWrong ? 'shake' : ''}">
            <button type="button" class="sort-say" data-action="say-card" aria-label="Ouvir" title="Ouvir">🔊</button>
            ${sortCardPicture(item.text)}
            <span class="sort-card-text">${igEscapeHtml(sortCardText(item.text))}</span>
          </div>
          ${lastWrong ? `<p class="sort-hint">That one takes <strong>${igEscapeHtml(lastWrong)}</strong>.</p>` : ''}

          <div class="sort-buckets">
            ${board.buckets.map(b => `
              <div class="sort-bucket">
                <button class="sort-bucket-btn${sortPic(b) ? ' has-visual' : ''}" data-bucket="${igEscapeHtml(b)}">${sortPic(b)}<span>${igEscapeHtml(b)}</span></button>
                <ul class="sort-bucket-list">
                  ${sorted[b].map(t => '<li>' + igEscapeHtml(t) + '</li>').join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      container.querySelectorAll('[data-bucket]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.bucket === item.bucket) {
            right++; streak++; lastWrong = null;
            sorted[item.bucket].push(item.text.replace('____', item.bucket));
            playCorrect();
            const r = btn.getBoundingClientRect();
            confettiBurst(r.left + r.width / 2, r.top);
            if (typeof awardProgress === 'function') awardProgress(5, 0);
            index++;
            if (index >= queue.length) { finish(); return; }
          } else {
            streak = 0;
            lastWrong = item.bucket;
            playWrong();
            igMiss(item.text.replace('____', item.bucket), false, 'Sort It');
          }
          paint();
        });
      });

      const restart = container.querySelector('[data-action="restart"]');
      if (restart) restart.addEventListener('click', () => renderSortIt(container, topic));
      const say = container.querySelector('[data-action="say-card"]');
      if (say) say.addEventListener('click', () => ttsSay(item.text.replace(/____/g, '').replace(/[^\p{L}\p{N}'’ ,.?!-]/gu, '').trim()));
    }

    // The card's picture, BIG: the emoji written in the item ("cooking 🧑‍🍳")
    // or, when there is none, the topic word the item names.
    const SORT_PICTO = /\p{Extended_Pictographic}/u;
    function sortCardEmojis(text) {
      if (typeof Intl === 'undefined' || !Intl.Segmenter) return [];
      return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(String(text))]
        .map(s => s.segment).filter(s => SORT_PICTO.test(s));
    }
    function sortCardText(text) {
      const emojis = sortCardEmojis(text);
      let t = String(text);
      emojis.forEach(e => { t = t.split(e).join(''); });
      return t.replace(/\s{2,}/g, ' ').trim();
    }
    function sortCardPicture(text) {
      const emojis = sortCardEmojis(text);
      if (emojis.length) {
        return `<span class="sort-card-pic">${emojis.slice(0, 3).map(e => igEmojiImgHTML(e, 'ig-emoji sort-card-emoji')).join('')}</span>`;
      }
      const pic = typeof igOptionVisualHTML === 'function' ? igOptionVisualHTML(sortCardText(text), topic) : '';
      return pic ? `<span class="sort-card-pic">${pic}</span>` : '';
    }

    // A bucket that names a topic word ("kitchen") shows its picture, so a
    // child who cannot read still knows which room is which.
    function sortPic(bucket) {
      return typeof igOptionVisualHTML === 'function' ? igOptionVisualHTML(bucket, topic) : '';
    }

    function finish() {
      const perfect = right === queue.length;
      if (perfect) { playWin(); if (typeof awardProgress === 'function') awardProgress(0, 2); }
      else IGSound.bell();
      container.innerHTML = `
        <div class="game-end-banner win">
          ${perfect ? '🏆 Every single one in the right place!' : right + ' of ' + queue.length + ' sorted.'}
          <p>${igEscapeHtml(board.buckets.join(' · '))}</p>
          <div class="game-btn-row" style="justify-content:center;margin-top:12px">
            <button class="btn btn-primary" data-action="again">🔄 Play again</button>
          </div>
        </div>
      `;
      container.querySelector('[data-action="again"]').addEventListener('click', () => renderSortIt(container, topic));
    }

    paint();
  }

  // -------------------------------------------------------------------------
  // 8) DRESS UP — drag-and-drop wardrobe (clothes topics only)
  // -------------------------------------------------------------------------
  // The doll and every garment are drawn as SVG on one shared 300x500 grid, so
  // a coat path always lands on the same shoulders the shirt path uses. Each
  // garment owns a slot; wearing something fills its slot and evicts whatever
  // conflicts with it (a dress clears the shirt and the skirt, and vice versa).

  const DRESS_COLORS = [
    { name: 'red', hex: '#e2574c' },
    { name: 'orange', hex: '#ef8f45' },
    { name: 'yellow', hex: '#f2c94c' },
    { name: 'green', hex: '#5aa469' },
    { name: 'blue', hex: '#4a8fd4' },
    { name: 'purple', hex: '#8e6d86' },
    { name: 'pink', hex: '#f08fb0' },
    { name: 'brown', hex: '#8a5a3b' },
    { name: 'black', hex: '#3a3a40' },
    { name: 'white', hex: '#f2f2ef' },
  ];
  const DRESS_SKINS = ['#f7d7bd', '#edbb94', '#d09a6e', '#a9714a', '#7a4b2e'];
  const DRESS_HAIRS = ['#3a2a24', '#6b4327', '#b07a3c', '#e0bc6d', '#c9435c'];

  // Mix `hex` toward white (amt > 0) or black (amt < 0).
  function dressShade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const target = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map(v => Math.round((target - v) * p + v));
    return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function dressColorName(hex) {
    const found = DRESS_COLORS.find(c => c.hex.toLowerCase() === String(hex).toLowerCase());
    return found ? found.name : '';
  }

  // The body every garment has to fit, written down once so a sleeve and the
  // arm it covers cannot drift apart:
  //   head    ellipse (150, 86) r 46 × 50   → x 104..196, y 36..136
  //   torso   shoulders y 147, sides 106..194, waist 110..190 at y 272
  //   arms    x 84..107 and 193..216, y 158..282; hands centred at y 288
  //   legs    x 114..146 and 154..186, y 256..432
  //   feet    ellipses (126, 430) and (174, 430), r 22 × 13 → down to y 443
  // A garment that stops inside one of those numbers leaves bare skin showing,
  // which is what the first version did at the shoulders, the toes and the
  // top of the head.

  function dressFoot(x, c, sneaker) {
    const d = dressShade(c, -0.3);
    const sole = sneaker ? '#ffffff' : dressShade(c, -0.45);
    return `
      <path d="M${x - 24},412 Q${x - 24},404 ${x - 15},404 L${x - 2},404
               Q${x + 6},416 ${x + 15},424 Q${x + 24},431 ${x + 22},440
               Q${x + 21},447 ${x + 10},447 L${x - 15},447 Q${x - 24},447 ${x - 24},439 Z"
            fill="${c}" stroke="${d}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M${x - 24},438 Q${x - 24},447 ${x - 15},447 L${x + 10},447 Q${x + 21},447 ${x + 22},440 Z"
            fill="${sole}" stroke="${d}" stroke-width="2.5" stroke-linejoin="round"/>
      ${sneaker
        ? `<path d="M${x - 10},409 q13,9 18,20" stroke="${dressShade(c, 0.5)}" stroke-width="5" fill="none" stroke-linecap="round"/>`
        : `<path d="M${x - 16},414 h26" stroke="${dressShade(c, 0.3)}" stroke-width="4" stroke-linecap="round"/>`}
    `;
  }

  // Every garment: (colour, 'boy'|'girl') -> SVG markup on the shared grid.
  const DRESS_DRAW = {
    // Shoulder seams run out to x 82 / 218 — past the outer edge of the arms —
    // so the sleeve sits on the shoulder instead of beside it.
    shirt: (c) => `
      <path d="M132,139 C106,141 90,148 82,170 L78,210 Q77,216 84,217 L104,217 Q108,217 107,209
               L106,190 L106,268 Q150,280 194,268 L194,190 L193,209 Q192,217 196,217 L216,217
               Q223,216 222,210 L218,170 C210,148 194,141 168,139 Q150,158 132,139 Z"
            fill="${c}" stroke="${dressShade(c, -0.26)}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M132,139 Q150,158 168,139" fill="none" stroke="${dressShade(c, -0.26)}" stroke-width="3"/>`,

    // Long sleeves end at the wrist (hands are centred on y 288).
    coat: (c) => `
      <path d="M130,137 C104,140 86,148 78,172 L72,266 Q71,277 80,278 L106,278 Q112,278 111,270
               L110,196 L110,312 Q150,326 190,312 L190,196 L189,270 Q188,278 194,278 L220,278
               Q229,277 228,266 L222,172 C214,148 196,140 170,137 L150,166 Z"
            fill="${c}" stroke="${dressShade(c, -0.28)}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M150,166 L150,320" stroke="${dressShade(c, -0.28)}" stroke-width="3"/>
      <path d="M130,137 L150,166 L116,180 Z" fill="${dressShade(c, -0.14)}"/>
      <path d="M170,137 L150,166 L184,180 Z" fill="${dressShade(c, -0.14)}"/>
      <circle cx="150" cy="208" r="5" fill="${dressShade(c, 0.4)}"/>
      <circle cx="150" cy="246" r="5" fill="${dressShade(c, 0.4)}"/>`,

    dress: (c) => `
      <path d="M132,139 C106,141 90,148 82,170 L78,210 Q77,216 84,217 L104,217 Q108,217 107,209
               L106,190 L108,262 L78,362 Q150,388 222,362 L192,262 L194,190 L193,209
               Q192,217 196,217 L216,217 Q223,216 222,210 L218,170 C210,148 194,141 168,139
               Q150,158 132,139 Z"
            fill="${c}" stroke="${dressShade(c, -0.26)}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M107,262 Q150,274 193,262" fill="none" stroke="${dressShade(c, -0.26)}" stroke-width="3"/>
      <circle cx="150" cy="296" r="6" fill="${dressShade(c, 0.4)}"/>`,

    // Waist at y 248 covers the hips (the torso is 110..190 down there); the
    // inseam sits at 148/152 so no strip of leg shows on the inside.
    pants: (c) => `
      <path d="M106,248 L194,248 L196,300 L192,428 L152,428 L150,330 L148,428 L108,428 L104,300 Z"
            fill="${c}" stroke="${dressShade(c, -0.26)}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="104" y="244" width="92" height="16" rx="8" fill="${dressShade(c, -0.2)}"/>`,

    shorts: (c) => `
      <path d="M106,248 L194,248 L194,344 L152,344 L150,310 L148,344 L106,344 Z"
            fill="${c}" stroke="${dressShade(c, -0.26)}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="104" y="244" width="92" height="16" rx="8" fill="${dressShade(c, -0.2)}"/>`,

    skirt: (c) => `
      <path d="M108,250 L192,250 L216,350 Q150,376 84,350 Z"
            fill="${c}" stroke="${dressShade(c, -0.26)}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="104" y="244" width="92" height="16" rx="8" fill="${dressShade(c, -0.2)}"/>`,

    shoes: (c) => dressFoot(126, c, false) + dressFoot(174, c, false),
    sneakers: (c) => dressFoot(126, c, true) + dressFoot(174, c, true),

    // The crown is an arc of an ellipse 4px bigger than the head, so it clears
    // the top of the head (y 36) instead of slicing through it.
    // The crown is an arc of an ellipse big enough to clear the hair as well as
    // the head — a dome that only cleared the skull left a dark rim of hair
    // outlining the cap.
    hat: (c, g) => g === 'girl'
      ? `<ellipse cx="150" cy="74" rx="86" ry="19" fill="${dressShade(c, -0.1)}" stroke="${dressShade(c, -0.3)}" stroke-width="3"/>
         <path d="M106,70 A46,58 0 0 1 194,70 Z" fill="${c}" stroke="${dressShade(c, -0.3)}" stroke-width="3" stroke-linejoin="round"/>
         <path d="M106,70 Q150,84 194,70 L194,60 Q150,74 106,60 Z" fill="${dressShade(c, -0.32)}"/>
         <circle cx="188" cy="64" r="9" fill="${dressShade(c, -0.32)}"/>`
      : `<path d="M190,68 Q246,64 254,79 Q248,94 190,88 Z" fill="${dressShade(c, -0.2)}" stroke="${dressShade(c, -0.34)}" stroke-width="3" stroke-linejoin="round"/>
         <path d="M97,74 A54,58 0 0 1 203,74 Z" fill="${c}" stroke="${dressShade(c, -0.3)}" stroke-width="3" stroke-linejoin="round"/>
         <path d="M97,74 Q150,90 203,74 L203,64 Q150,80 97,64 Z" fill="${dressShade(c, -0.18)}"/>
         <circle cx="150" cy="29" r="7" fill="${dressShade(c, -0.3)}"/>`,

    headband: (c) => `
      <path d="M105,78 Q150,34 195,78" fill="none" stroke="${c}" stroke-width="13" stroke-linecap="round"/>
      <path d="M186,54 q23,-17 25,2 q-15,7 -25,-2 Z" fill="${dressShade(c, 0.15)}" stroke="${dressShade(c, -0.25)}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M186,54 q27,4 19,21 q-17,-4 -19,-21 Z" fill="${dressShade(c, 0.15)}" stroke="${dressShade(c, -0.25)}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="189" cy="60" r="6" fill="${dressShade(c, -0.25)}"/>`,

    // One strap over the shoulder and the bag on the opposite hip, where it
    // rests against the body — the old backpack floated beside the arm.
    bag: (c, g) => {
      const d = dressShade(c, -0.3);
      // Hip height, below y 300: any higher and the bag covers the hand, which
      // sits at (95 / 205, 288).
      return g === 'girl'
        ? `<path d="M178,150 Q138,232 100,304" fill="none" stroke="${d}" stroke-width="10" stroke-linecap="round"/>
           <rect x="56" y="300" width="64" height="54" rx="16" fill="${c}" stroke="${d}" stroke-width="3"/>
           <path d="M56,318 L56,316 Q56,300 72,300 L104,300 Q120,300 120,316 L120,318 Z" fill="${dressShade(c, -0.16)}"/>
           <circle cx="88" cy="326" r="6" fill="${dressShade(c, 0.45)}"/>`
        : `<path d="M122,150 Q162,232 200,304" fill="none" stroke="${d}" stroke-width="10" stroke-linecap="round"/>
           <rect x="180" y="300" width="64" height="56" rx="12" fill="${c}" stroke="${d}" stroke-width="3"/>
           <rect x="180" y="300" width="64" height="20" rx="10" fill="${dressShade(c, -0.16)}"/>
           <rect x="203" y="326" width="18" height="12" rx="5" fill="${dressShade(c, 0.45)}"/>`;
    },
  };

  // ---- hairstyles ---------------------------------------------------------
  // `back` paints behind the body (long hair falls behind the shoulders),
  // `front` paints over the head. Both are free choices for either doll.
  const DRESS_HAIR_STYLES = [
    {
      id: 'short', label: 'Short',
      front: h => `<path d="M105,88 Q104,30 150,30 Q196,30 195,88 Q184,56 150,56 Q118,56 105,88 Z" fill="${h}"/>`,
    },
    {
      id: 'spiky', label: 'Spiky',
      front: h => `<path d="M104,90 L110,50 L121,66 L129,38 L140,60 L150,32 L160,60 L171,38 L179,66 L190,50 L196,90
                            Q186,58 150,56 Q114,58 104,90 Z" fill="${h}"/>`,
    },
    {
      id: 'curly', label: 'Curly',
      front: h => `
        <circle cx="112" cy="58" r="19" fill="${h}"/>
        <circle cx="131" cy="38" r="21" fill="${h}"/>
        <circle cx="150" cy="31" r="21" fill="${h}"/>
        <circle cx="169" cy="38" r="21" fill="${h}"/>
        <circle cx="188" cy="58" r="19" fill="${h}"/>
        <path d="M104,92 Q102,42 150,42 Q198,42 196,92 Q186,62 150,60 Q114,62 104,92 Z" fill="${h}"/>`,
    },
    {
      id: 'long', label: 'Long',
      back: h => `<path d="M100,84 Q96,26 150,26 Q204,26 200,84 L210,246 Q197,258 186,246 L192,104
                           Q150,72 108,104 L114,246 Q103,258 90,246 Z" fill="${h}"/>`,
      front: h => `<path d="M104,90 Q100,30 150,30 Q200,30 196,90 Q189,58 166,52 Q148,74 121,66 Q109,66 104,90 Z" fill="${h}"/>`,
    },
    {
      id: 'bob', label: 'Bob',
      back: h => `<path d="M100,84 Q98,26 150,26 Q202,26 200,84 L203,156 Q188,172 175,156 L184,104
                           Q150,74 116,104 L125,156 Q112,172 97,156 Z" fill="${h}"/>`,
      front: h => `<path d="M104,90 Q100,30 150,30 Q200,30 196,90 Q189,58 166,52 Q148,74 121,66 Q109,66 104,90 Z" fill="${h}"/>`,
    },
    {
      id: 'ponytail', label: 'Ponytail',
      back: h => `<path d="M184,64 Q232,84 236,136 Q239,180 214,204 Q200,192 210,168 Q226,132 202,100 Q192,82 184,74 Z" fill="${h}"/>`,
      front: h => `<path d="M104,88 Q102,28 150,28 Q198,28 196,88 Q186,54 150,54 Q116,54 104,88 Z" fill="${h}"/>
                   <circle cx="190" cy="74" r="8" fill="${dressShade(h, -0.3)}"/>`,
    },
    {
      id: 'pigtails', label: 'Pigtails',
      back: h => `
        <path d="M112,70 Q74,88 70,132 Q68,168 88,180 Q100,166 92,142 Q86,112 108,88 Z" fill="${h}"/>
        <path d="M188,70 Q226,88 230,132 Q232,168 212,180 Q200,166 208,142 Q214,112 192,88 Z" fill="${h}"/>`,
      front: h => `<path d="M104,88 Q102,28 150,28 Q198,28 196,88 Q186,54 150,54 Q116,54 104,88 Z" fill="${h}"/>
                   <circle cx="110" cy="76" r="8" fill="${dressShade(h, -0.3)}"/>
                   <circle cx="190" cy="76" r="8" fill="${dressShade(h, -0.3)}"/>`,
    },
    {
      id: 'bun', label: 'Bun',
      front: h => `
        <circle cx="150" cy="26" r="22" fill="${h}"/>
        <path d="M105,88 Q104,34 150,34 Q196,34 195,88 Q184,58 150,58 Q118,58 105,88 Z" fill="${h}"/>
        <rect x="134" y="44" width="32" height="10" rx="5" fill="${dressShade(h, -0.3)}"/>`,
    },
  ];

  const DRESS_HAIR_DEFAULT = { boy: 'short', girl: 'long' };
  const dressHairStyle = id => DRESS_HAIR_STYLES.find(s => s.id === id) || DRESS_HAIR_STYLES[0];

  // slot      — only one garment at a time lives here
  // conflicts — slots emptied when this one is filled
  // plural    — "black shoes", never "a black shoes"
  const DRESS_ITEMS = [
    { id: 'shirt', en: 'shirt', pt: 'camisa', slot: 'top', conflicts: ['full'], who: 'both', cat: 'tops', color: '#4a8fd4', crop: '72 130 156 150' },
    { id: 'coat', en: 'coat', pt: 'casaco', slot: 'outer', conflicts: [], who: 'both', cat: 'tops', color: '#8a5a3b', crop: '66 128 168 200' },
    { id: 'dress', en: 'dress', pt: 'vestido', slot: 'full', conflicts: ['top', 'bottom'], who: 'girl', cat: 'tops', color: '#f08fb0', crop: '70 128 160 275' },
    { id: 'shorts', en: 'shorts', pt: 'shorts', slot: 'bottom', conflicts: ['full'], who: 'both', cat: 'bottoms', color: '#5aa469', plural: true, crop: '98 238 104 116' },
    { id: 'pants', en: 'pants', pt: 'calça', slot: 'bottom', conflicts: ['full'], who: 'both', cat: 'bottoms', color: '#3a3a40', plural: true, crop: '98 238 104 200' },
    { id: 'skirt', en: 'skirt', pt: 'saia', slot: 'bottom', conflicts: ['full'], who: 'girl', cat: 'bottoms', color: '#8e6d86', crop: '78 236 144 148' },
    { id: 'shoes', en: 'shoes', pt: 'sapatos', slot: 'feet', conflicts: [], who: 'both', cat: 'shoes', color: '#3a3a40', plural: true, crop: '96 396 108 58' },
    { id: 'sneakers', en: 'sneakers', pt: 'tênis', slot: 'feet', conflicts: [], who: 'both', cat: 'shoes', color: '#e2574c', plural: true, crop: '96 396 108 58' },
    { id: 'hat', en: 'hat', pt: 'chapéu', slot: 'head', conflicts: [], who: 'both', cat: 'extras', color: '#e2574c', crop: '62 18 188 78' },
    { id: 'headband', en: 'headband', pt: 'tiara', slot: 'hair', conflicts: [], who: 'girl', cat: 'extras', color: '#f2c94c', crop: '96 30 122 60' },
    { id: 'bag', en: 'bag', pt: 'bolsa', slot: 'bag', conflicts: [], who: 'both', cat: 'extras', color: '#ef8f45', crop: '46 140 210 226' },
  ];

  // Back to front. The doll paints first, then these on top of it.
  const DRESS_LAYERS = ['bottom', 'full', 'top', 'feet', 'outer', 'bag', 'hair', 'head'];
  const DRESS_CATS = [
    { id: 'all', label: 'All', icon: '✨' },
    { id: 'tops', label: 'Tops', icon: '👕' },
    { id: 'bottoms', label: 'Bottoms', icon: '👖' },
    { id: 'shoes', label: 'Shoes', icon: '👟' },
    { id: 'extras', label: 'Extras', icon: '🎒' },
  ];

  // The hairstyle is a free choice, not a property of the doll: `style` picks
  // one of DRESS_HAIR_STYLES, whose back half paints behind the shoulders.
  function dressBody(g, skin, hair, style) {
    const line = '#2e2b2e';
    const look = dressHairStyle(style);
    return `
      ${look.back ? look.back(hair) : ''}
      <rect x="136" y="122" width="28" height="38" rx="12" fill="${dressShade(skin, -0.14)}"/>
      <path d="M106,168 Q108,152 128,147 L172,147 Q192,152 194,168 L190,272 Q150,284 110,272 Z" fill="${skin}"/>
      <rect x="84" y="158" width="23" height="124" rx="11" fill="${skin}"/>
      <rect x="193" y="158" width="23" height="124" rx="11" fill="${skin}"/>
      <circle cx="95" cy="288" r="12" fill="${skin}"/>
      <circle cx="205" cy="288" r="12" fill="${skin}"/>
      <rect x="114" y="256" width="32" height="176" rx="15" fill="${skin}"/>
      <rect x="154" y="256" width="32" height="176" rx="15" fill="${skin}"/>
      <ellipse cx="126" cy="430" rx="22" ry="13" fill="${dressShade(skin, -0.1)}"/>
      <ellipse cx="174" cy="430" rx="22" ry="13" fill="${dressShade(skin, -0.1)}"/>
      <!-- A plain base layer, so an undressed doll is a doll in a vest, not a
           naked one. Every garment paints over it. -->
      <path d="M118,158 L136,150 L164,150 L182,158 L185,264 Q150,275 115,264 Z" fill="#f4f4f1" stroke="#dcdcd4" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M112,256 L188,256 L184,296 Q150,312 116,296 Z" fill="#f4f4f1" stroke="#dcdcd4" stroke-width="2.5" stroke-linejoin="round"/>
      <ellipse cx="105" cy="94" rx="9" ry="13" fill="${dressShade(skin, -0.08)}"/>
      <ellipse cx="195" cy="94" rx="9" ry="13" fill="${dressShade(skin, -0.08)}"/>
      <ellipse cx="150" cy="86" rx="46" ry="50" fill="${skin}"/>
      <ellipse cx="132" cy="90" rx="5.5" ry="6.5" fill="${line}"/>
      <ellipse cx="168" cy="90" rx="5.5" ry="6.5" fill="${line}"/>
      <circle cx="134" cy="87" r="2" fill="#ffffff"/>
      <circle cx="170" cy="87" r="2" fill="#ffffff"/>
      <ellipse cx="118" cy="106" rx="8" ry="5" fill="#f0a3a8" opacity="0.55"/>
      <ellipse cx="182" cy="106" rx="8" ry="5" fill="#f0a3a8" opacity="0.55"/>
      <path d="M137,110 Q150,123 163,110" fill="none" stroke="${line}" stroke-width="3.5" stroke-linecap="round"/>
      ${look.front(hair)}
    `;
  }

  // The little head used by the hairstyle buttons.
  function dressHairPreview(style, skin, hair) {
    const look = dressHairStyle(style);
    return `<svg class="dressup-hair-thumb" viewBox="60 12 180 130" xmlns="http://www.w3.org/2000/svg">
      ${look.back ? look.back(hair) : ''}
      <ellipse cx="105" cy="94" rx="9" ry="13" fill="${dressShade(skin, -0.08)}"/>
      <ellipse cx="195" cy="94" rx="9" ry="13" fill="${dressShade(skin, -0.08)}"/>
      <ellipse cx="150" cy="86" rx="46" ry="50" fill="${skin}"/>
      <ellipse cx="132" cy="90" rx="5" ry="6" fill="#2e2b2e"/>
      <ellipse cx="168" cy="90" rx="5" ry="6" fill="#2e2b2e"/>
      <path d="M137,110 Q150,121 163,110" fill="none" stroke="#2e2b2e" stroke-width="3.5" stroke-linecap="round"/>
      ${look.front(hair)}
    </svg>`;
  }

  function renderDressUp(container, topic) {
    let gender = null;
    let worn = {};                 // slot -> { id, color }
    let selectedSlot = null;       // the garment the palette paints
    let skin = DRESS_SKINS[0];
    let hair = DRESS_HAIRS[0];
    let hairStyle = DRESS_HAIR_DEFAULT.boy;
    let filter = 'all';
    let challenge = true;
    let mission = null;
    let outfits = 0;
    let celebrating = false;
    let dragEnd = null;            // tears down an in-flight drag on unmount

    const itemById = id => DRESS_ITEMS.find(i => i.id === id);
    const available = () => DRESS_ITEMS.filter(i => i.who === 'both' || i.who === gender);

    function say(text) {
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }

    function previewSVG(item, color) {
      return `<svg class="dressup-thumb" viewBox="${item.crop}" xmlns="http://www.w3.org/2000/svg">${DRESS_DRAW[item.id](color, gender || 'girl')}</svg>`;
    }

    // ---- style challenge ---------------------------------------------------
    function newMission() {
      const pool = available();
      const useDress = Math.random() < 0.35 && pool.some(i => i.slot === 'full');
      const slots = shuffle([...new Set(pool.map(i => i.slot))]
        .filter(s => (useDress ? s !== 'top' && s !== 'bottom' : s !== 'full')));
      mission = slots.slice(0, 3).map(s => {
        const it = pickN(pool.filter(i => i.slot === s), 1)[0];
        const col = pickN(DRESS_COLORS, 1)[0];
        return { id: it.id, slot: s, en: it.en, color: col.hex, colorName: col.name };
      });
    }

    const missionDone = m => {
      const w = worn[m.slot];
      return Boolean(w) && w.id === m.id && w.color.toLowerCase() === m.color.toLowerCase();
    };

    function checkMission() {
      if (!challenge || !mission || celebrating) return;
      if (!mission.every(missionDone)) return;
      celebrating = true;
      outfits++;
      playWin();
      const stage = container.querySelector('.dressup-stage');
      if (stage) confettiFromElement(stage);
      if (typeof awardProgress === 'function') awardProgress(12, 1);
      paint();
      say('Perfect outfit!');
      setTimeout(() => {
        celebrating = false;
        newMission();
        paint();
      }, 1900);
    }

    // ---- wearing -----------------------------------------------------------
    function wear(item) {
      worn[item.slot] = { id: item.id, color: item.color };
      item.conflicts.forEach(s => { delete worn[s]; if (selectedSlot === s) selectedSlot = null; });
      // A piece just put on is ready to be painted straight away.
      selectedSlot = item.slot;
      playCorrect();
      say(item.en);
      paint();
      checkMission();
    }

    function selectSlot(slot) {
      selectedSlot = selectedSlot === slot ? null : slot;
      if (selectedSlot) say(itemById(worn[slot].id).en);
      paint();
    }

    function takeOff(slot) {
      if (!worn[slot]) return;
      delete worn[slot];
      if (selectedSlot === slot) selectedSlot = null;
      playWrong();
      paint();
    }

    function outfitSentence() {
      const order = ['head', 'hair', 'outer', 'top', 'full', 'bottom', 'feet', 'bag'];
      const parts = order.filter(s => worn[s]).map(s => {
        const it = itemById(worn[s].id);
        const cn = dressColorName(worn[s].color);
        const noun = cn ? `${cn} ${it.en}` : it.en;
        if (it.plural) return noun;
        return `${/^[aeiou]/i.test(cn || it.en) ? 'an' : 'a'} ${noun}`;
      });
      const who = gender === 'girl' ? 'She' : 'He';
      if (!parts.length) return `${who} isn't wearing anything yet!`;
      const list = parts.length === 1
        ? parts[0]
        : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
      return `${who}'s wearing ${list}.`;
    }

    // ---- drag & drop (pointer events: one path for mouse, pen and touch) ----
    function beginDrag(ev, item, fromDoll) {
      ev.preventDefault();
      const stage = container.querySelector('.dressup-stage');
      if (!stage) return;
      const ghost = document.createElement('div');
      ghost.className = 'dressup-ghost';
      ghost.innerHTML = previewSVG(item, fromDoll ? worn[item.slot].color : item.color);
      document.body.appendChild(ghost);

      const startX = ev.clientX;
      const startY = ev.clientY;
      let moved = false;

      const place = (x, y) => { ghost.style.transform = `translate(${x - 54}px, ${y - 54}px)`; };
      place(startX, startY);

      const isOver = (x, y) => {
        const r = stage.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      };

      const onMove = e => {
        if (!moved && (Math.abs(e.clientX - startX) > 6 || Math.abs(e.clientY - startY) > 6)) { moved = true; IGSound.pickup(); }
        place(e.clientX, e.clientY);
        const over = isOver(e.clientX, e.clientY);
        stage.classList.toggle('is-target', over && !fromDoll);
        stage.classList.toggle('is-removing', moved && fromDoll && !over);
      };

      const finish = e => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', finish);
        window.removeEventListener('pointercancel', finish);
        dragEnd = null;
        ghost.remove();
        stage.classList.remove('is-target', 'is-removing');
        if (!e) return;                              // unmounted mid-drag
        const over = isOver(e.clientX, e.clientY);
        if (fromDoll) {
          if (!moved) selectSlot(item.slot);         // tapped: pick it to paint
          else if (!over) takeOff(item.slot);        // dragged off the doll
        } else if (over || !moved) {
          wear(item);                                // dropped on doll, or tapped
        }
      };

      dragEnd = () => finish(null);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
    }

    // ---- painting ----------------------------------------------------------
    function chooserHTML() {
      const card = (g, emoji, label, pt) => `
        <button class="dressup-choose-card" data-gender="${g}">
          <span class="dressup-choose-doll">
            <svg viewBox="0 10 300 445" xmlns="http://www.w3.org/2000/svg">
              ${dressBody(g, DRESS_SKINS[0], g === 'girl' ? DRESS_HAIRS[1] : DRESS_HAIRS[0], DRESS_HAIR_DEFAULT[g])}
              ${g === 'girl'
                ? DRESS_DRAW.dress('#f08fb0', g)
                : DRESS_DRAW.shorts('#3a3a40', g) + DRESS_DRAW.shirt('#4a8fd4', g)}
              ${DRESS_DRAW.sneakers('#f2f2ef', g)}
            </svg>
          </span>
          <span class="dressup-choose-name">${emoji} ${label}</span>
          <span class="dressup-choose-pt">${pt}</span>
        </button>`;
      return `
        <div class="dressup-chooser">
          <h3>Who are we dressing today?</h3>
          <p>Pick a character — then drag the clothes onto them.</p>
          <div class="dressup-choose-row">
            ${card('boy', '👦', 'The boy', 'o boneco')}
            ${card('girl', '👧', 'The girl', 'a boneca')}
          </div>
        </div>`;
    }

    function gameHTML() {
      const items = available().filter(i => filter === 'all' || i.cat === filter);
      const wornCount = Object.keys(worn).length;

      const missionHTML = !challenge || !mission ? '' : `
        <div class="dressup-mission${celebrating ? ' done' : ''}">
          <span class="dressup-mission-title">🎯 Style Challenge</span>
          <ul class="dressup-mission-list">
            ${mission.map(m => `
              <li class="${missionDone(m) ? 'ok' : ''}">
                <i style="background:${m.color}"></i>${igEscapeHtml(m.colorName)} ${igEscapeHtml(m.en)}
              </li>`).join('')}
          </ul>
        </div>`;

      return `
        <div class="game-toolbar">
          <div class="dressup-switch">
            <button class="dressup-gender${gender === 'boy' ? ' active' : ''}" data-gender="boy">👦 Boy</button>
            <button class="dressup-gender${gender === 'girl' ? ' active' : ''}" data-gender="girl">👧 Girl</button>
          </div>
          <span class="game-status-pill">👗 ${wornCount} on · 🏆 ${outfits} outfit${outfits === 1 ? '' : 's'}</span>
          <div class="game-btn-row">
            <button class="game-btn secondary" data-action="mode">${challenge ? '🎨 Free play' : '🎯 Challenge'}</button>
            <button class="game-btn secondary" data-action="surprise">🎲 Surprise</button>
            <button class="game-btn secondary" data-action="undress">🧺 Take it all off</button>
          </div>
        </div>

        <div class="dressup-layout">
          <div class="dressup-stage-wrap">
            ${missionHTML}
            <div class="dressup-stage">
              <svg class="dressup-doll" viewBox="0 0 300 500" xmlns="http://www.w3.org/2000/svg">
                <ellipse class="dressup-shadow" cx="150" cy="452" rx="92" ry="16"/>
                ${dressBody(gender, skin, hair, hairStyle)}
                ${DRESS_LAYERS.filter(s => worn[s]).map(s => `
                  <g class="dressup-worn${s === selectedSlot ? ' is-selected' : ''}" data-worn="${s}">${DRESS_DRAW[worn[s].id](worn[s].color, gender)}</g>`).join('')}
              </svg>
              <span class="dressup-drop-hint">Drop the clothes here 👗</span>
              ${celebrating ? '<div class="dressup-cheer">🎉 Perfect outfit!</div>' : ''}
            </div>
            <div class="dressup-looks">
              <span class="dressup-looks-label">Skin</span>
              ${DRESS_SKINS.map(s => `<button class="dressup-dot${s === skin ? ' active' : ''}" data-skin="${s}" style="background:${s}" aria-label="skin tone"></button>`).join('')}
              <span class="dressup-looks-label">Hair</span>
              ${DRESS_HAIRS.map(h => `<button class="dressup-dot${h === hair ? ' active' : ''}" data-hair="${h}" style="background:${h}" aria-label="hair colour"></button>`).join('')}
            </div>
            <div class="dressup-hairstyles">
              <span class="dressup-looks-label">Style</span>
              <div class="dressup-hair-row">
                ${DRESS_HAIR_STYLES.map(st => `
                  <button class="dressup-hair-btn${st.id === hairStyle ? ' active' : ''}" data-hairstyle="${st.id}" title="${st.label}">
                    ${dressHairPreview(st.id, skin, hair)}
                    <span>${st.label}</span>
                  </button>`).join('')}
              </div>
            </div>
          </div>

          <div class="dressup-wardrobe">
            <div class="dressup-tabs">
              ${DRESS_CATS.map(c => `<button class="dressup-tab${filter === c.id ? ' active' : ''}" data-cat="${c.id}">${c.icon} ${c.label}</button>`).join('')}
            </div>
            ${selectedSlot && worn[selectedSlot] ? (() => {
              const sel = itemById(worn[selectedSlot].id);
              return `
                <div class="dressup-paint active">
                  <span class="dressup-paint-label">🎨 Colour for the <b>${igEscapeHtml(sel.en.toLowerCase())}</b>:</span>
                  <div class="dressup-palette">
                    ${DRESS_COLORS.map(c => `<button class="dressup-swatch${worn[selectedSlot].color.toLowerCase() === c.hex.toLowerCase() ? ' active' : ''}" data-color="${c.hex}" style="background:${c.hex}" title="${c.name}" aria-label="${c.name}"></button>`).join('')}
                  </div>
                  <button class="dressup-paint-done" data-action="deselect">✓ Pronto</button>
                </div>`;
            })() : `
              <div class="dressup-paint">
                <span class="dressup-paint-label">👆 Toque numa roupa na boneca para escolher a cor dela.</span>
              </div>`}
            <div class="dressup-rack">
              ${items.map(i => {
                const on = worn[i.slot] && worn[i.slot].id === i.id;
                return `
                  <button class="dressup-card${on ? ' worn' : ''}" data-item="${i.id}">
                    ${previewSVG(i, on ? worn[i.slot].color : i.color)}
                    <span class="dressup-card-en">${igEscapeHtml(i.en)}</span>
                    <span class="dressup-card-pt">${igEscapeHtml(i.pt)}</span>
                    ${on ? '<span class="dressup-card-on">✓</span>' : ''}
                  </button>`;
              }).join('')}
            </div>
            <p class="dressup-tip">Drag a piece onto the doll — or just tap it. Tap what ${gender === 'girl' ? 'she' : 'he'}'s wearing to choose its colour; drag it off the doll to take it off.</p>
          </div>
        </div>

        <div class="dressup-say">
          <p>${igEscapeHtml(outfitSentence())}</p>
          <button class="game-btn" data-action="say">🔊 Say it</button>
        </div>`;
    }

    function paint() {
      const rack = container.querySelector('.dressup-rack');
      const scroll = rack ? rack.scrollTop : 0;
      container.innerHTML = gender ? gameHTML() : chooserHTML();
      bind();
      const newRack = container.querySelector('.dressup-rack');
      if (newRack) newRack.scrollTop = scroll;
    }

    function bind() {
      container.querySelectorAll('[data-gender]').forEach(btn => {
        btn.addEventListener('click', () => {
          const next = btn.dataset.gender;
          if (next === gender) return;
          const first = !gender;
          gender = next;
          if (first) {
            hair = gender === 'girl' ? DRESS_HAIRS[1] : DRESS_HAIRS[0];
            hairStyle = DRESS_HAIR_DEFAULT[gender];
          }
          // Girl-only pieces can't stay on the boy.
          Object.keys(worn).forEach(s => {
            const it = itemById(worn[s].id);
            if (it.who !== 'both' && it.who !== gender) delete worn[s];
          });
          newMission();
          paint();
        });
      });

      container.querySelectorAll('[data-cat]').forEach(btn => {
        btn.addEventListener('click', () => { filter = btn.dataset.cat; paint(); });
      });

      container.querySelectorAll('.dressup-palette [data-color]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!selectedSlot || !worn[selectedSlot]) return;
          worn[selectedSlot].color = btn.dataset.color;
          playCorrect();
          const it = itemById(worn[selectedSlot].id);
          const cn = dressColorName(btn.dataset.color);
          say(cn ? `${cn} ${it.en}` : it.en);
          paint();
          checkMission();
        });
      });
      const deselect = container.querySelector('[data-action="deselect"]');
      if (deselect) deselect.addEventListener('click', () => { selectedSlot = null; paint(); });

      container.querySelectorAll('[data-skin]').forEach(btn => {
        btn.addEventListener('click', () => { skin = btn.dataset.skin; paint(); });
      });
      container.querySelectorAll('[data-hair]').forEach(btn => {
        btn.addEventListener('click', () => { hair = btn.dataset.hair; paint(); });
      });
      container.querySelectorAll('[data-hairstyle]').forEach(btn => {
        btn.addEventListener('click', () => { hairStyle = btn.dataset.hairstyle; paint(); });
      });

      // A wardrobe card: drag it to the doll, or simply tap it.
      container.querySelectorAll('.dressup-card').forEach(card => {
        card.addEventListener('pointerdown', ev => {
          if (ev.button != null && ev.button !== 0) return;
          const item = itemById(card.dataset.item);
          // Already on the doll: tapping its card picks it to paint.
          if (worn[item.slot] && worn[item.slot].id === item.id) { selectSlot(item.slot); return; }
          beginDrag(ev, item, false);
        });
      });

      // Something already on: drag it away, or tap it, to take it off.
      container.querySelectorAll('[data-worn]').forEach(layer => {
        layer.addEventListener('pointerdown', ev => {
          if (ev.button != null && ev.button !== 0) return;
          const slot = layer.dataset.worn;
          if (!worn[slot]) return;
          beginDrag(ev, itemById(worn[slot].id), true);
        });
      });

      const act = name => container.querySelector(`[data-action="${name}"]`);

      const undress = act('undress');
      if (undress) undress.addEventListener('click', () => { worn = {}; selectedSlot = null; playWrong(); paint(); });

      const mode = act('mode');
      if (mode) mode.addEventListener('click', () => {
        challenge = !challenge;
        if (challenge) newMission();
        paint();
      });

      const surprise = act('surprise');
      if (surprise) surprise.addEventListener('click', () => {
        worn = {};
        selectedSlot = null;
        const pool = available();
        const useDress = gender === 'girl' && Math.random() < 0.4;
        const slots = useDress ? ['full', 'feet', 'head'] : ['top', 'bottom', 'feet'];
        if (Math.random() < 0.5) slots.push(gender === 'girl' ? 'hair' : 'outer');
        if (Math.random() < 0.5) slots.push('bag');
        slots.forEach(s => {
          const opts = pool.filter(i => i.slot === s);
          if (!opts.length) return;
          const it = pickN(opts, 1)[0];
          worn[s] = { id: it.id, color: pickN(DRESS_COLORS, 1)[0].hex };
        });
        playCorrect();
        paint();
        checkMission();
      });

      const sayBtn = act('say');
      if (sayBtn) sayBtn.addEventListener('click', () => say(outfitSentence()));
    }

    newMission();
    paint();

    return () => {
      if (dragEnd) dragEnd();
      document.querySelectorAll('.dressup-ghost').forEach(el => el.remove());
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }

  // -------------------------------------------------------------------------
  // BACKPACK — choose a backpack and its colour, then pack the school
  // objects. "School list" mode asks for five objects by name (pictures
  // only, so the child has to know what a sharpener looks like); free play
  // packs anything. Drawings live in schoolObjects.js.
  // -------------------------------------------------------------------------
  function renderBackpack(container, topic) {
    // The topic decides which objects are offered, in the teacher's wording.
    const seen = new Set();
    const objects = [];
    (topic.words || []).forEach(w => {
      const obj = schoolObjectFor(w);
      if (!obj || seen.has(obj.id)) return;
      seen.add(obj.id);
      objects.push({ ...obj, en: w.en || obj.en, pt: w.pt || obj.pt });
    });
    const objById = id => objects.find(o => o.id === id);

    let step = 'choose';
    let styleId = BACKPACK_STYLES[0].id;
    let color = BACKPACK_COLORS[1];
    let mode = 'list';
    let list = [];
    let packed = [];
    let newest = null;
    let shake = false;
    let done = false;
    let showNames = false;
    let msg = '';
    let lists = 0;
    let dragEnd = null;

    const style = () => BACKPACK_STYLES.find(s => s.id === styleId);
    const backpackPhrase = () => `${/^[aeiou]/i.test(color.name) ? 'An' : 'A'} ${color.name} ${style().en}`;

    function say(text) {
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }

    function newList() {
      list = pickN(objects, Math.min(5, objects.length)).map(o => o.id);
      packed = [];
      done = false;
      msg = '';
    }

    function celebrate(text) {
      done = true;
      playWin();
      if (typeof awardProgress === 'function') awardProgress(12, 1);
      msg = `🎉 ${text}`;
      paint();
      const stage = container.querySelector('.bp-stage');
      if (stage) confettiFromElement(stage);
      say(text);
    }

    function pack(obj) {
      if (!obj || done) return;
      if (packed.includes(obj.id)) { msg = `✓ ${obj.en} is already in the backpack.`; paint(); return; }
      if (mode === 'list' && !list.includes(obj.id)) {
        playWrong();
        shake = true;
        msg = `Oops! That's the ${obj.en.toLowerCase()} — it's not on your list.`;
        say(`That's the ${obj.en}`);
        paint();
        return;
      }
      packed.push(obj.id);
      newest = obj.id;
      playCorrect();
      say(obj.en);
      msg = `✅ ${obj.en}${mode === 'free' || showNames ? ` — ${obj.pt}` : ''}`;
      if (mode === 'list' && list.every(id => packed.includes(id))) {
        lists++;
        celebrate('Your backpack is ready for school!');
        return;
      }
      if (mode === 'free' && packed.length === objects.length) {
        celebrate('Wow! Everything is in the backpack!');
        return;
      }
      paint();
    }

    function unpack(id) {
      if (done && mode === 'list') return;
      packed = packed.filter(x => x !== id);
      done = false;
      msg = '';
      playWrong();
      paint();
    }

    // ---- drag & drop (pointer events: mouse, pen and touch alike) ---------
    function beginDrag(ev, obj) {
      ev.preventDefault();
      const stage = container.querySelector('.bp-stage');
      if (!stage) return;
      const ghost = document.createElement('div');
      ghost.className = 'bp-ghost';
      ghost.innerHTML = schoolObjectSVG(obj.id);
      document.body.appendChild(ghost);

      const startX = ev.clientX;
      const startY = ev.clientY;
      let moved = false;
      const place = (x, y) => { ghost.style.transform = `translate(${x - 45}px, ${y - 45}px)`; };
      place(startX, startY);
      const isOver = (x, y) => {
        const r = stage.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      };

      const onMove = e => {
        if (!moved && (Math.abs(e.clientX - startX) > 6 || Math.abs(e.clientY - startY) > 6)) { moved = true; IGSound.pickup(); }
        place(e.clientX, e.clientY);
        stage.classList.toggle('is-target', isOver(e.clientX, e.clientY));
      };
      const finish = e => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', finish);
        window.removeEventListener('pointercancel', finish);
        dragEnd = null;
        ghost.remove();
        stage.classList.remove('is-target');
        if (!e) return;                                   // unmounted mid-drag
        if (isOver(e.clientX, e.clientY) || !moved) pack(obj);   // dropped, or tapped
      };
      dragEnd = () => finish(null);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
    }

    // ---- painting ------------------------------------------------------------
    function chooserHTML() {
      return `
        <div class="bp-choose">
          <p class="bp-step">1 · Choose your backpack</p>
          <div class="bp-style-row">
            ${BACKPACK_STYLES.map(s => `
              <button class="bp-style-card${s.id === styleId ? ' active' : ''}" data-style="${s.id}">
                ${backpackSVG(s.id, color.hex, [])}
                <b>${igEscapeHtml(s.label)}</b>
                <small>${igEscapeHtml(s.pt)}</small>
              </button>`).join('')}
          </div>
          <p class="bp-step">2 · Choose the colour</p>
          <div class="bp-color-row">
            ${BACKPACK_COLORS.map(c => `
              <button class="bp-color${c.name === color.name ? ' active' : ''}" data-color="${c.name}" title="${c.pt}">
                <i style="background:${c.hex}"></i><span>${c.name}</span>
              </button>`).join('')}
          </div>
          <div class="bp-choose-foot">
            <button class="bp-say-btn" data-action="say-bag">🔊 ${igEscapeHtml(backpackPhrase())}</button>
            <button class="game-btn bp-go" data-action="go">🎒 Let's pack!</button>
          </div>
        </div>`;
    }

    function gameHTML() {
      const inList = mode === 'list';
      const labels = !inList || showNames;
      const total = inList ? list.length : objects.length;
      return `
        <div class="game-toolbar">
          <div class="bp-modes">
            <button class="bp-mode${inList ? ' active' : ''}" data-mode="list">📝 School list</button>
            <button class="bp-mode${!inList ? ' active' : ''}" data-mode="free">🎨 Free play</button>
          </div>
          <span class="game-status-pill">🎒 ${packed.length}/${total}${lists ? ` · 🏆 ${lists}` : ''}</span>
          <div class="game-btn-row">
            ${inList ? `<button class="game-btn secondary" data-action="names">${showNames ? '🙈 Esconder nomes' : '💡 Mostrar nomes'}</button>` : ''}
            <button class="game-btn secondary" data-action="change">🎨 Trocar mochila</button>
            <button class="game-btn secondary" data-action="empty">🧺 Esvaziar</button>
          </div>
        </div>

        <div class="bp-layout">
          <div class="bp-side">
            ${inList ? `
              <div class="bp-list${done ? ' done' : ''}">
                <span class="bp-list-title">📝 My school list</span>
                <ul>
                  ${list.map(id => {
                    const o = objById(id);
                    return `<li class="${packed.includes(id) ? 'ok' : ''}">
                      <button class="bp-list-say" data-say="${id}" aria-label="Listen: ${igEscapeHtml(o.en)}">🔊</button>
                      <span>${igEscapeHtml(o.en)}</span>
                    </li>`;
                  }).join('')}
                </ul>
              </div>` : ''}
            <div class="bp-stage${shake ? ' bp-shake' : ''}${done ? ' done' : ''}">
              ${backpackSVG(styleId, color.hex, packed, newest)}
              <span class="bp-drop-hint">Drop it here! 🎒</span>
            </div>
            <p class="bp-msg" aria-live="polite">${igEscapeHtml(msg) || '&nbsp;'}</p>
            ${done && inList ? `<button class="game-btn bp-next" data-action="next">📝 New list ▶</button>` : ''}
            ${packed.length ? `
              <div class="bp-inside">
                <span class="bp-inside-label">In my backpack:</span>
                ${packed.map(id => `<button class="bp-chip" data-out="${id}" title="Tirar da mochila">${schoolObjectSVG(id)}${igEscapeHtml(objById(id).en)}</button>`).join('')}
              </div>` : ''}
          </div>

          <div class="bp-shelf-wrap">
            <div class="bp-shelf">
              ${objects.map(o => {
                const isIn = packed.includes(o.id);
                return `
                  <button class="bp-card${isIn ? ' packed' : ''}${labels ? '' : ' no-label'}" data-obj="${o.id}" aria-label="${igEscapeHtml(o.en)}">
                    ${schoolObjectSVG(o.id, 'bp-thumb')}
                    ${labels ? `<span class="bp-card-en">${igEscapeHtml(o.en)}</span><span class="bp-card-pt">${igEscapeHtml(o.pt)}</span>` : ''}
                    ${isIn ? '<span class="bp-card-on">✓</span>' : ''}
                  </button>`;
              }).join('')}
            </div>
            <p class="bp-tip">Drag an object into the backpack — or just tap it.</p>
          </div>
        </div>`;
    }

    function paint() {
      container.innerHTML = step === 'choose' ? chooserHTML() : gameHTML();
      newest = null;     // the drop-in animation plays once, not on every repaint
      shake = false;
      bind();
    }

    function bind() {
      const act = name => container.querySelector(`[data-action="${name}"]`);

      container.querySelectorAll('[data-style]').forEach(btn => btn.addEventListener('click', () => {
        styleId = btn.dataset.style;
        paint();
        say(style().en);
      }));
      container.querySelectorAll('[data-color]').forEach(btn => btn.addEventListener('click', () => {
        color = BACKPACK_COLORS.find(c => c.name === btn.dataset.color) || color;
        paint();
        say(color.name);
      }));
      const sayBag = act('say-bag');
      if (sayBag) sayBag.addEventListener('click', () => say(backpackPhrase()));
      const go = act('go');
      if (go) go.addEventListener('click', () => {
        step = 'pack';
        if (mode === 'list' && !list.length) newList();
        paint();
        say(`${backpackPhrase()}! Let's pack!`);
      });

      container.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => {
        if (btn.dataset.mode === mode) return;
        mode = btn.dataset.mode;
        if (mode === 'list') newList();
        else { done = false; msg = ''; }
        paint();
      }));

      container.querySelectorAll('.bp-card').forEach(card => {
        card.addEventListener('pointerdown', ev => {
          if (ev.button != null && ev.button !== 0) return;
          const obj = objById(card.dataset.obj);
          if (!obj || packed.includes(obj.id) || done) return;
          beginDrag(ev, obj);
        });
      });
      container.querySelectorAll('[data-out]').forEach(btn => btn.addEventListener('click', () => unpack(btn.dataset.out)));
      container.querySelectorAll('[data-say]').forEach(btn => btn.addEventListener('click', () => say(objById(btn.dataset.say).en)));

      const names = act('names');
      if (names) names.addEventListener('click', () => { showNames = !showNames; paint(); });
      const change = act('change');
      if (change) change.addEventListener('click', () => { step = 'choose'; paint(); });
      const empty = act('empty');
      if (empty) empty.addEventListener('click', () => { packed = []; done = false; msg = ''; playWrong(); paint(); });
      const next = act('next');
      if (next) next.addEventListener('click', () => { newList(); paint(); });
    }

    if (objects.length === 0) {
      container.innerHTML = `<div class="game-end-banner lose">This topic has no school objects to pack.</div>`;
      return () => {};
    }
    paint();

    return () => {
      if (dragEnd) dragEnd();
      document.querySelectorAll('.bp-ghost').forEach(el => el.remove());
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }


  // -------------------------------------------------------------------------
  // HOUSE — the house in cross-section; pick a room, then put its furniture
  // and utensils in. In the bedroom every object can be painted, one at a
  // time: tap the object, then pick its colour. The other
  // rooms keep beige / brown / grey / black furniture. "Listen & find" says
  // one object at a time and shows pictures only. Drawings: houseRooms.js.
  // -------------------------------------------------------------------------
  function renderHouse(container) {
    const placedByRoom = {};          // roomId -> { itemId: colour }
    let roomId = null;                // null = the house overview
    let mode = 'free';
    let target = null;
    let selected = null;              // bedroom: the object the palette paints
    let showPt = false;
    let newest = null;
    let shake = false;
    let msg = '';
    let dragEnd = null;

    const room = () => houseRoomById(roomId);
    const placed = () => (placedByRoom[roomId] = placedByRoom[roomId] || {});
    const itemById = id => room().items.find(i => i.id === id);
    const missing = () => room().items.filter(i => !placed()[i.id]);
    const isDone = () => missing().length === 0;

    function say(text) {
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }

    const where = () => (roomId === 'yard' ? 'in the yard' : `in the ${room().en.toLowerCase()}`);
    const sentence = item => `Put the ${item.en.toLowerCase()} ${where()}!`;

    function nextTarget() {
      const left = missing();
      target = left.length ? pickN(left, 1)[0].id : null;
      if (target) say(sentence(itemById(target)));
    }

    function roomComplete() {
      playWin();
      if (typeof awardProgress === 'function') awardProgress(12, 1);
      msg = `🎉 The ${room().en.toLowerCase()} is ready!`;
      target = null;
      paint();
      const stage = container.querySelector('.hs-stage');
      if (stage) confettiFromElement(stage);
      say(`Great job! The ${room().en.toLowerCase()} is ready!`);
    }

    function place(item) {
      if (!item) return;
      if (placed()[item.id]) {
        // Already in the room: in the bedroom, that picks it for painting.
        if (room().paint) select(item.id);
        return;
      }
      if (mode === 'listen' && target && item.id !== target) {
        const want = itemById(target);
        igMiss({ en: want.en, pt: want.pt, image: houseDataUri(want.crop, want.draw(want.color)) }, false, 'House');
        playWrong();
        shake = true;
        msg = `Oops! That's the ${item.en.toLowerCase()}.`;
        say(`That's the ${item.en}. ${sentence(itemById(target))}`);
        paint();
        return;
      }
      placed()[item.id] = item.color;
      newest = item.id;
      // A new object in the bedroom is ready to be painted straight away.
      if (room().paint) selected = item.id;
      playCorrect();
      msg = `✅ ${item.en} — ${item.pt}`;
      if (isDone()) { roomComplete(); return; }
      if (mode === 'listen') {
        paint();
        setTimeout(() => { if (container.isConnected && roomId) { nextTarget(); paint(); } }, 900);
        say(item.en);
        return;
      }
      say(item.en);
      paint();
    }

    function select(id) {
      selected = selected === id ? null : id;
      if (selected) say(itemById(id).en);
      paint();
    }

    function paintSelected(hex) {
      const item = selected && itemById(selected);
      if (!item || !placed()[item.id]) return;
      placed()[item.id] = hex;
      playCorrect();
      msg = `🎨 ${houseColorName(hex)} ${item.en.toLowerCase()}`;
      say(`${houseColorName(hex)} ${item.en}`);
      paint();
    }

    function takeOut(id) {
      delete placed()[id];
      if (selected === id) selected = null;
      playWrong();
      msg = '';
      if (mode === 'listen' && !target) nextTarget();
      paint();
    }

    // Tapping something in the room: in the bedroom it picks that object
    // for painting; anywhere else it takes it back out.
    function tapPlaced(id) {
      if (room().paint) select(id);
      else takeOut(id);
    }

    function houseColorName(hex) {
      const c = HOUSE_COLORS.find(x => x.hex === hex);
      return c ? c.name : '';
    }

    // ---- drag & drop (pointer events: mouse, pen and touch alike) ---------
    function beginDrag(ev, item) {
      ev.preventDefault();
      const stage = container.querySelector('.hs-stage');
      if (!stage) return;
      const ghost = document.createElement('div');
      ghost.className = 'hs-ghost';
      ghost.innerHTML = houseItemSVG(item, placed()[item.id] || item.color);
      document.body.appendChild(ghost);
      const startX = ev.clientX;
      const startY = ev.clientY;
      let moved = false;
      const put = (x, y) => { ghost.style.transform = `translate(${x - 45}px, ${y - 45}px)`; };
      put(startX, startY);
      const isOver = (x, y) => {
        const r = stage.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      };
      const onMove = e => {
        if (!moved && (Math.abs(e.clientX - startX) > 6 || Math.abs(e.clientY - startY) > 6)) { moved = true; IGSound.pickup(); }
        put(e.clientX, e.clientY);
        stage.classList.toggle('is-target', isOver(e.clientX, e.clientY));
      };
      const finish = e => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', finish);
        window.removeEventListener('pointercancel', finish);
        dragEnd = null;
        ghost.remove();
        stage.classList.remove('is-target');
        if (!e) return;
        if (isOver(e.clientX, e.clientY) || !moved) place(item);
      };
      dragEnd = () => finish(null);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
    }

    // ---- painting ------------------------------------------------------------
    function overviewHTML() {
      const done = HOUSE_ROOMS.filter(r => Object.keys(placedByRoom[r.id] || {}).length === r.items.length).length;
      return `
        <div class="hs-overview">
          <div class="game-toolbar">
            <span class="game-status-pill">🏠 ${done}/${HOUSE_ROOMS.length} rooms ready</span>
            <div class="game-btn-row">
              <button class="game-btn secondary" data-action="pt">${showPt ? '🔤 Ver em inglês' : '🔤 Ver em português'}</button>
            </div>
          </div>
          <p class="hs-ask">Which room do you want to decorate? Tap a room! 👆</p>
          ${houseOverviewSVG(placedByRoom, showPt)}
          <div class="hs-room-list">
            ${HOUSE_ROOMS.map(r => `<button class="hs-room-chip" data-room="${r.id}">🔊 ${igEscapeHtml(r.en)} <small>${igEscapeHtml(r.pt)}</small></button>`).join('')}
          </div>
        </div>`;
    }

    function roomHTML() {
      const r = room();
      const listen = mode === 'listen';
      const t = target && itemById(target);
      const count = Object.keys(placed()).length;
      const sel = r.paint && selected && placed()[selected] ? itemById(selected) : null;
      const idx = HOUSE_ROOMS.findIndex(x => x.id === roomId);
      const next = HOUSE_ROOMS[(idx + 1) % HOUSE_ROOMS.length];
      return `
        <div class="game-toolbar">
          <div class="game-btn-row">
            <button class="game-btn secondary" data-action="house">🏠 House</button>
          </div>
          <div class="bp-modes">
            <button class="bp-mode${!listen ? ' active' : ''}" data-mode="free">🎨 Free play</button>
            <button class="bp-mode${listen ? ' active' : ''}" data-mode="listen">🎧 Listen &amp; find</button>
          </div>
          <span class="game-status-pill">${igEscapeHtml(r.en)} · ${count}/${r.items.length}</span>
          <div class="game-btn-row">
            <button class="game-btn secondary" data-action="empty">🧺 Esvaziar</button>
            <button class="game-btn secondary" data-action="next">${igEscapeHtml(next.en)} ▶</button>
          </div>
        </div>

        <div class="hs-title">
          <button class="hs-title-say" data-action="say-room" aria-label="Listen">🔊</button>
          <h4>${igEscapeHtml(r.en)}</h4><span>${igEscapeHtml(r.pt)}</span>
        </div>

        ${listen && t ? `
          <div class="hs-target">
            <button class="bp-list-say" data-action="say-target" aria-label="Listen again">🔊</button>
            <span>Put the <b>${igEscapeHtml(t.en.toLowerCase())}</b> ${where()}!</span>
          </div>` : ''}

        <div class="hs-layout">
          <div class="hs-stage${shake ? ' bp-shake' : ''}${isDone() ? ' done' : ''}">
            <svg class="hs-scene" viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg">${houseSceneInner(r, placed(), newest, selected)}</svg>
            <span class="bp-drop-hint">Drop it here! 🏠</span>
          </div>
          <div class="hs-shelf-wrap">
            ${r.paint ? (sel ? `
              <div class="hs-paint active">
                <div class="hs-paint-head">
                  ${houseItemSVG(sel, placed()[sel.id], 'hs-paint-thumb')}
                  <span class="hs-paint-label">🎨 Colour for the <b>${igEscapeHtml(sel.en.toLowerCase())}</b>:</span>
                </div>
                <div class="hs-palette">
                  ${HOUSE_COLORS.map(c => `<button class="dressup-swatch${placed()[sel.id] === c.hex ? ' active' : ''}" data-color="${c.hex}" style="background:${c.hex}" title="${c.name}" aria-label="${c.name}"></button>`).join('')}
                </div>
                <div class="hs-paint-actions">
                  <button class="game-btn secondary" data-action="deselect">✓ Pronto</button>
                  <button class="game-btn secondary danger" data-action="takeout">🗑️ Tirar do quarto</button>
                </div>
              </div>` : `
              <div class="hs-paint">
                <span class="hs-paint-label">👆 Toque num objeto do quarto para escolher a cor dele.</span>
              </div>`) : ''}
            <div class="hs-shelf">
              ${r.items.map(i => {
                const isIn = Boolean(placed()[i.id]);
                const canRepaint = r.paint && isIn;
                return `
                  <button class="bp-card hs-card${isIn ? ' packed' : ''}${canRepaint ? ' repaint' : ''}${sel && sel.id === i.id ? ' selected' : ''}${listen ? ' no-label' : ''}" data-item="${i.id}" aria-label="${igEscapeHtml(i.en)}">
                    ${houseItemSVG(i, placed()[i.id] || i.color, 'bp-thumb')}
                    ${listen ? '' : `<span class="bp-card-en">${igEscapeHtml(i.en)}</span><span class="bp-card-pt">${igEscapeHtml(i.pt)}</span>`}
                    ${isIn ? '<span class="bp-card-on">✓</span>' : ''}
                  </button>`;
              }).join('')}
            </div>
            <p class="bp-msg" aria-live="polite">${igEscapeHtml(msg) || '&nbsp;'}</p>
            <p class="bp-tip">${r.paint
              ? 'Drag an object into the room — or just tap it. Then tap it in the room and pick its colour.'
              : 'Drag an object into the room — or just tap it. Tap it in the room to take it out.'}</p>
          </div>
        </div>`;
    }

    function paint() {
      container.innerHTML = roomId ? roomHTML() : overviewHTML();
      newest = null;
      shake = false;
      bind();
    }

    function openRoom(id) {
      roomId = id;
      selected = null;
      msg = '';
      target = null;
      say(room().en);
      if (mode === 'listen' && !isDone()) setTimeout(() => { if (roomId === id) { nextTarget(); paint(); } }, 700);
      paint();
    }

    function bind() {
      const act = name => container.querySelector(`[data-action="${name}"]`);

      container.querySelectorAll('.hs-cell[data-room]').forEach(cell => {
        cell.addEventListener('click', () => openRoom(cell.dataset.room));
        cell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRoom(cell.dataset.room); } });
      });
      container.querySelectorAll('.hs-room-chip').forEach(btn => btn.addEventListener('click', () => {
        const r = houseRoomById(btn.dataset.room);
        say(r.en);
      }));
      const pt = act('pt');
      if (pt) pt.addEventListener('click', () => { showPt = !showPt; paint(); });

      if (!roomId) return;

      container.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => {
        if (btn.dataset.mode === mode) return;
        mode = btn.dataset.mode;
        msg = '';
        target = null;
        if (mode === 'listen') nextTarget();
        paint();
      }));

      container.querySelectorAll('.hs-card').forEach(card => {
        card.addEventListener('pointerdown', ev => {
          if (ev.button != null && ev.button !== 0) return;
          const item = itemById(card.dataset.item);
          if (!item) return;
          if (placed()[item.id]) {          // already in: bedroom picks it to paint
            if (room().paint) select(item.id);
            return;
          }
          beginDrag(ev, item);
        });
      });
      container.querySelectorAll('.hs-scene [data-placed]').forEach(g => {
        g.addEventListener('click', () => tapPlaced(g.dataset.placed));
      });
      container.querySelectorAll('.hs-palette [data-color]').forEach(btn => btn.addEventListener('click', () => paintSelected(btn.dataset.color)));
      const deselect = act('deselect');
      if (deselect) deselect.addEventListener('click', () => { selected = null; paint(); });
      const takeout = act('takeout');
      if (takeout) takeout.addEventListener('click', () => { if (selected) takeOut(selected); });

      const house = act('house');
      if (house) house.addEventListener('click', () => { roomId = null; target = null; msg = ''; paint(); });
      const next = act('next');
      if (next) next.addEventListener('click', () => {
        const idx = HOUSE_ROOMS.findIndex(x => x.id === roomId);
        openRoom(HOUSE_ROOMS[(idx + 1) % HOUSE_ROOMS.length].id);
      });
      const empty = act('empty');
      if (empty) empty.addEventListener('click', () => {
        placedByRoom[roomId] = {};
        selected = null;
        msg = '';
        playWrong();
        if (mode === 'listen') nextTarget();
        paint();
      });
      const sayRoom = act('say-room');
      if (sayRoom) sayRoom.addEventListener('click', () => say(room().en));
      const sayTarget = act('say-target');
      if (sayTarget) sayTarget.addEventListener('click', () => { if (target) say(sentence(itemById(target))); });
    }

    paint();

    return () => {
      if (dragEnd) dragEnd();
      document.querySelectorAll('.hs-ghost').forEach(el => el.remove());
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }


  // -------------------------------------------------------------------------
  // ANIMAL BUILDER — pick an animal, then describe it: big or small, its
  // colour(s), and its body parts. Every right answer builds a bit more of
  // the animal (it starts grey and bare); a wrong one is gently refused out
  // loud. Built for children who can't read yet: every choice is a picture
  // and every tap is spoken. The end shows the animal at home with its
  // sentence. Drawings and facts: animals.js.
  // -------------------------------------------------------------------------
  function renderAnimal(container, topic) {
    const seen = new Set();
    const animals = [];
    (topic.words || []).forEach(w => {
      const a = animalFor(w);
      if (a && !seen.has(a.id)) { seen.add(a.id); animals.push(a); }
    });

    let animal = null;               // null = the picking grid
    let size = null;
    let colors = [];                 // colour names found so far
    let parts = {};                  // parts found so far
    let finished = false;
    let wrong = null;                // the button to shake on the next paint
    let msg = '';
    const doneIds = new Set();

    function say(text) {
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }

    const article = word => (/^[aeiou]/i.test(word) ? 'an' : 'a');
    const name = () => animal.en.toLowerCase();
    const sizeDone = () => size === animal.size;
    const colorsDone = () => animal.colors.every(c => colors.includes(c));
    const partsDone = () => animal.parts.every(p => parts[p]);
    const allDone = () => sizeDone() && colorsDone() && partsDone();
    const joinAnd = list => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

    // c1 / c2 follow the animal's own colour order, whatever order they're found in.
    const c1 = () => (colors.includes(animal.colors[0]) ? anHex(animal.colors[0]) : null);
    const c2 = () => (animal.colors[1] && colors.includes(animal.colors[1]) ? anHex(animal.colors[1]) : null);

    function sentences() {
      const has = animal.parts.map(p => anPart(p).say);
      const lines = [
        { icon: animalFullSVG(animal, 'an-line-icon'), text: `It is ${article(name())} ${name()}.` },
        { icon: `<span class="an-line-dots">${animal.colors.map(c => `<i style="background:${anHex(c)}"></i>`).join('')}</span>`,
          text: `It is ${joinAnd([animal.size, ...animal.colors])}.` },
        { icon: `<span class="an-line-parts">${animal.parts.map(p => `<svg viewBox="0 0 64 64">${anPart(p).icon}</svg>`).join('')}</span>`,
          text: `It has ${joinAnd(has)}.` },
      ];
      if (!animal.parts.some(p => p === 'legs2' || p === 'legs4')) {
        lines.push({ icon: '<span class="an-line-emoji">🚫🦵</span>', text: 'It has no legs.' });
      }
      lines.push({ icon: `<svg class="an-line-icon an-line-home" viewBox="0 0 400 260">${AN_HABITATS[animal.habitat].bg()}</svg>`, text: AN_HABITATS[animal.habitat].say });
      return lines;
    }

    function finishCheck() {
      if (!allDone()) return;
      setTimeout(() => {
        if (!container.isConnected || !animal || finished) return;
        say(`Great job! Where does the ${name()} live?`);
      }, 1100);
    }

    function pickSize(s) {
      if (sizeDone()) return;
      if (s === animal.size) {
        size = s;
        playCorrect();
        msg = `✅ It is ${s}!`;
        say(`Yes! It is ${s}.`);
      } else {
        playWrong();
        wrong = `size-${s}`;
        msg = `❌ It is not ${s}.`;
        say(`No! ${article(name())} ${name()} is not ${s}.`);
      }
      paint();
      finishCheck();
    }

    function pickColor(cname) {
      if (colors.includes(cname)) return;
      if (animal.colors.includes(cname)) {
        colors.push(cname);
        playCorrect();
        const left = animal.colors.filter(c => !colors.includes(c)).length;
        msg = `✅ ${cname}!${left ? ' One more colour…' : ''}`;
        say(left ? `Yes! ${cname}. And…?` : `Yes! It is ${joinAnd(animal.colors)}.`);
      } else {
        playWrong();
        wrong = `color-${cname}`;
        msg = `❌ It is not ${cname}.`;
        say(`No! ${article(name())} ${name()} is not ${cname}.`);
      }
      paint();
      finishCheck();
    }

    function pickPart(id) {
      if (parts[id]) return;
      const part = anPart(id);
      if (animal.parts.includes(id)) {
        parts[id] = true;
        playCorrect();
        msg = `✅ It has ${part.say}!`;
        say(`Yes! It has ${part.say}.`);
      } else {
        playWrong();
        wrong = `part-${id}`;
        msg = `❌ It doesn't have ${part.say}.`;
        say(`No! ${article(name())} ${name()} doesn't have ${part.say}.`);
      }
      paint();
      finishCheck();
    }

    function start(id) {
      animal = animalById(id);
      size = null;
      colors = [];
      parts = {};
      finished = false;
      msg = '';
      paint();
      say(`${article(name())} ${name()}! Is it big or small?`);
    }

    function finish() {
      finished = true;
      doneIds.add(animal.id);
      playWin();
      if (typeof awardProgress === 'function') awardProgress(12, 1);
      paint();
      const scene = container.querySelector('.an-habitat');
      if (scene) confettiFromElement(scene);
      say(sentences().map(l => l.text).join(' '));
    }

    // ---- drawing helpers ------------------------------------------------------
    const sizeScale = s => (s === 'big' ? 1 : s === 'small' ? 0.6 : 0.82);

    function stageSVG() {
      const s = sizeScale(size);
      return `<svg class="an-stage-svg" viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
        ${AN_HABITATS[animal.habitat].water ? '' : '<ellipse cx="100" cy="151" rx="70" ry="5" fill="#000" opacity=".07"/>'}
        <g class="an-grow" style="transform: scale(${s})">${animal.draw(parts, c1(), c2())}</g>
      </svg>`;
    }

    function habitatSVG() {
      const h = AN_HABITATS[animal.habitat];
      const full = Object.fromEntries(animal.parts.map(p => [p, true]));
      const s = animal.size === 'big' ? 1.25 : 0.75;
      const place = h.water
        ? `translate(200 128) scale(${s}) translate(-100 -92)`
        : `translate(200 ${h.ground}) scale(${s}) translate(-100 -150)`;
      return `<svg class="an-habitat" viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg">
        ${h.bg()}
        <g transform="${place}"><g class="an-arrive">${animal.draw(full, c1(), c2())}</g></g>
      </svg>`;
    }

    // ---- screens ---------------------------------------------------------------
    function pickHTML() {
      return `
        <div class="an-pick">
          <p class="hs-ask">Choose an animal! 👆 ${doneIds.size ? `<span class="an-stars">⭐ ${doneIds.size}</span>` : ''}</p>
          <div class="an-grid">
            ${animals.map(a => `
              <button class="an-card${doneIds.has(a.id) ? ' done' : ''}" data-animal="${a.id}" aria-label="${igEscapeHtml(a.en)}">
                ${animalFullSVG(a, 'an-card-svg')}
                <span class="an-card-en">${igEscapeHtml(a.en)}</span>
                ${doneIds.has(a.id) ? '<span class="bp-card-on">⭐</span>' : ''}
              </button>`).join('')}
          </div>
        </div>`;
    }

    function buildHTML() {
      const slot = (filled, color) => `<i class="an-slot${filled ? ' on' : ''}"${filled && color ? ` style="background:${color}"` : ''}></i>`;
      const sizeBtn = s => `
        <button class="an-size-btn${size === s ? ' right' : ''}${wrong === `size-${s}` ? ' an-wrong' : ''}${sizeDone() && size !== s ? ' faded' : ''}" data-size="${s}" aria-label="${s}">
          <svg viewBox="0 0 200 160"><g style="transform: scale(${sizeScale(s)}); transform-origin: 100px 150px">${animal.draw(parts, c1(), c2())}</g></svg>
          <span>${s}</span>
        </button>`;
      return `
        <div class="game-toolbar">
          <div class="game-btn-row"><button class="game-btn secondary" data-action="animals">🐾 Animals</button></div>
          <span class="game-status-pill">${[sizeDone(), colorsDone(), partsDone()].filter(Boolean).length}/3 ✓</span>
        </div>
        <div class="an-layout">
          <div class="an-stage-wrap">
            <div class="an-stage">${stageSVG()}</div>
            <button class="an-name" data-action="say-name">🔊 ${igEscapeHtml(animal.en)}</button>
            <p class="bp-msg an-msg" aria-live="polite">${igEscapeHtml(msg) || '&nbsp;'}</p>
            ${allDone() ? `<button class="game-btn an-finish" data-action="finish">🌍 Where does it live? ▶</button>` : ''}
          </div>

          <div class="an-steps">
            <section class="an-step${sizeDone() ? ' done' : ''}">
              <button class="an-step-head" data-say="Is it big or small?"><b>1</b> 📏 big · small ${sizeDone() ? '✅' : ''}</button>
              <div class="an-size-row">${sizeBtn('big')}${sizeBtn('small')}</div>
            </section>

            <section class="an-step${colorsDone() ? ' done' : ''}">
              <button class="an-step-head" data-say="What colour is it?"><b>2</b> 🎨 colour
                <span class="an-slots">${animal.colors.map(c => slot(colors.includes(c), anHex(c))).join('')}</span> ${colorsDone() ? '✅' : ''}</button>
              <div class="an-colors">
                ${AN_COLORS.map(c => `
                  <button class="an-color${colors.includes(c.name) ? ' right' : ''}${wrong === `color-${c.name}` ? ' an-wrong' : ''}${colorsDone() && !colors.includes(c.name) ? ' faded' : ''}" data-color="${c.name}" aria-label="${c.name}">
                    <i style="background:${c.hex}"></i><span>${c.name}</span>
                  </button>`).join('')}
              </div>
            </section>

            <section class="an-step${partsDone() ? ' done' : ''}">
              <button class="an-step-head" data-say="What does it have?"><b>3</b> 🦒 It has…
                <span class="an-slots">${animal.parts.map(p => slot(parts[p])).join('')}</span> ${partsDone() ? '✅' : ''}</button>
              <div class="an-parts">
                ${AN_PARTS.map(p => `
                  <button class="an-part${parts[p.id] ? ' right' : ''}${wrong === `part-${p.id}` ? ' an-wrong' : ''}${partsDone() && !parts[p.id] ? ' faded' : ''}" data-part="${p.id}" aria-label="${p.en}">
                    <svg viewBox="0 0 64 64">${p.icon}</svg><span>${p.en}</span>
                    ${parts[p.id] ? '<span class="bp-card-on">✓</span>' : ''}
                  </button>`).join('')}
              </div>
            </section>
          </div>
        </div>`;
    }

    function doneHTML() {
      return `
        <div class="game-toolbar">
          <div class="game-btn-row"><button class="game-btn secondary" data-action="animals">🐾 Animals</button></div>
          <span class="game-status-pill">⭐ ${doneIds.size}/${animals.length}</span>
        </div>
        <div class="an-done">
          ${habitatSVG()}
          <div class="an-sentences">
            ${sentences().map(l => `
              <button class="an-line" data-line="${igEscapeHtml(l.text)}">
                ${l.icon}<span class="an-line-text">${igEscapeHtml(l.text)}</span><span class="an-line-say">🔊</span>
              </button>`).join('')}
          </div>
          <div class="an-done-actions">
            <button class="game-btn secondary" data-action="read">🔊 Read it all</button>
            <button class="game-btn" data-action="another">🐾 Another animal ▶</button>
          </div>
        </div>`;
    }

    function paint() {
      container.innerHTML = !animal ? pickHTML() : finished ? doneHTML() : buildHTML();
      wrong = null;
      bind();
    }

    function bind() {
      const act = n => container.querySelector(`[data-action="${n}"]`);
      container.querySelectorAll('[data-animal]').forEach(b => b.addEventListener('click', () => start(b.dataset.animal)));
      container.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => pickSize(b.dataset.size)));
      container.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', () => pickColor(b.dataset.color)));
      container.querySelectorAll('[data-part]').forEach(b => b.addEventListener('click', () => pickPart(b.dataset.part)));
      container.querySelectorAll('[data-say]').forEach(b => b.addEventListener('click', () => say(b.dataset.say)));
      container.querySelectorAll('[data-line]').forEach(b => b.addEventListener('click', () => say(b.dataset.line)));
      const back = act('animals');
      if (back) back.addEventListener('click', () => { animal = null; paint(); });
      const another = act('another');
      if (another) another.addEventListener('click', () => { animal = null; paint(); });
      const sayName = act('say-name');
      if (sayName) sayName.addEventListener('click', () => say(`${article(name())} ${name()}`));
      const fin = act('finish');
      if (fin) fin.addEventListener('click', finish);
      const read = act('read');
      if (read) read.addEventListener('click', () => say(sentences().map(l => l.text).join(' ')));
    }

    if (!animals.length) {
      container.innerHTML = `<div class="game-end-banner lose">This topic has no animals to build.</div>`;
      return () => {};
    }
    paint();
    return () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); };
  }


  // -------------------------------------------------------------------------
  // Shared by Feelings, Instruments and Prepositions: speaking, and a
  // pointer drag with a floating copy of what is being dragged.
  // -------------------------------------------------------------------------
  function ttsSay(text, rate) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = rate || 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  // `targets` is a list of elements that can be hovered; onDrop gets the
  // element under the pointer (or null), the pointer and whether it moved.
  function ghostDrag(ev, ghostHTML, targets, onDrop) {
    ev.preventDefault();
    const ghost = document.createElement('div');
    ghost.className = 'bp-ghost';
    ghost.innerHTML = ghostHTML;
    document.body.appendChild(ghost);
    const startX = ev.clientX, startY = ev.clientY;
    let moved = false;
    const put = (x, y) => { ghost.style.transform = `translate(${x - 45}px, ${y - 45}px)`; };
    put(startX, startY);
    const over = (x, y) => targets.find(t => {
      const r = t.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) || null;
    const onMove = e => {
      if (!moved && (Math.abs(e.clientX - startX) > 6 || Math.abs(e.clientY - startY) > 6)) { moved = true; IGSound.pickup(); }
      put(e.clientX, e.clientY);
      const hit = over(e.clientX, e.clientY);
      targets.forEach(t => t.classList.toggle('is-target', t === hit));
    };
    const finish = e => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      ghost.remove();
      targets.forEach(t => t.classList.remove('is-target'));
      if (e) onDrop(over(e.clientX, e.clientY), e, moved);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => finish(null);
  }

  const modeButtons = (mode, a, b) => `
    <div class="bp-modes">
      <button class="bp-mode${mode === a[0] ? ' active' : ''}" data-mode="${a[0]}">${a[1]}</button>
      <button class="bp-mode${mode === b[0] ? ' active' : ''}" data-mode="${b[0]}">${b[1]}</button>
    </div>`;

  // -------------------------------------------------------------------------
  // FEELINGS — a blank face; drag the right face onto it. "Teacher says":
  // the teacher says "I'm sad!" and anything dropped shows and is spoken.
  // "Listen & find": the game says it, the cards are pictures only.
  // -------------------------------------------------------------------------
  function renderFeelings(container, topic) {
    const seen = new Set();
    const feelings = [];
    (topic.words || []).forEach(w => { const f = feelingFor(w); if (f && !seen.has(f.id)) { seen.add(f.id); feelings.push(f); } });
    let mode = 'teacher', shown = null, target = null, score = 0, msg = '', shake = false, pop = false;
    let stopDrag = null;
    const sentence = f => `I'm ${f.en.toLowerCase()}.`;

    function newTarget() {
      const pool = feelings.filter(f => f.id !== target);
      target = pickN(pool, 1)[0].id;
      shown = null;
      msg = '';
      ttsSay(`I'm ${feelingById(target).en.toLowerCase()}!`);
    }

    function drop(f) {
      if (mode === 'teacher') {
        shown = f.id; pop = true; playCorrect();
        msg = '';
        ttsSay(sentence(f));
        paint();
        return;
      }
      if (f.id === target) {
        shown = f.id; pop = true; score++; playCorrect();
        msg = '⭐ Yes!';
        ttsSay(`Yes! ${sentence(f)}`);
        paint();
        const face = container.querySelector('.fe-stage');
        if (face) confettiFromElement(face);
        const was = target;
        setTimeout(() => { if (container.isConnected && mode === 'listen' && target === was) { newTarget(); paint(); } }, 1800);
      } else {
        playWrong(); shake = true;
        igMiss(igWordOf(topic, feelingById(target).en), false, 'Feelings');
        msg = `❌ That's ${f.en.toLowerCase()}.`;
        ttsSay(`No, that's ${f.en.toLowerCase()}. I'm ${feelingById(target).en.toLowerCase()}!`);
        paint();
      }
    }

    function paint() {
      const t = target && feelingById(target);
      const f = shown && feelingById(shown);
      const listen = mode === 'listen';
      container.innerHTML = `
        <div class="game-toolbar">
          ${modeButtons(mode, ['teacher', '👩‍🏫 Teacher says'], ['listen', '🎧 Listen & find'])}
          ${listen ? `<span class="game-status-pill">⭐ ${score}</span>` : `<button class="game-btn secondary" data-action="clear">🧽 Limpar</button>`}
        </div>
        ${listen && t ? `
          <div class="hs-target fe-target">
            <button class="bp-list-say" data-action="say-target" aria-label="Listen again">🔊</button>
            <span>I'm <b>${igEscapeHtml(t.en.toLowerCase())}</b>! Show me!</span>
          </div>` : ''}
        <div class="fe-layout">
          <div class="fe-side">
            <div class="fe-stage${shake ? ' bp-shake' : ''}${pop ? ' fe-pop' : ''}">${faceSVG(f, 'fe-face')}
              <span class="bp-drop-hint">Drop it here! 🙂</span>
            </div>
            ${f ? `<button class="fe-sentence" data-action="say-shown">🔊 ${igEscapeHtml(sentence(f))}</button>`
                : `<p class="fe-hint">👆 ${listen ? 'Listen and drag the face here!' : 'Drag a face here!'}</p>`}
            <p class="bp-msg" aria-live="polite">${igEscapeHtml(msg) || '&nbsp;'}</p>
          </div>
          <div class="fe-shelf">
            ${feelings.map(x => `
              <button class="fe-card${shown === x.id ? ' on' : ''}${listen ? ' no-label' : ''}" data-feeling="${x.id}" aria-label="${igEscapeHtml(x.en)}">
                ${faceSVG(x, 'fe-thumb')}
                ${listen ? '' : `<span class="bp-card-en">${igEscapeHtml(x.en)}</span><span class="bp-card-pt">${igEscapeHtml(x.pt)}</span>`}
              </button>`).join('')}
          </div>
        </div>`;
      shake = false; pop = false;
      bind();
    }

    function bind() {
      const act = n => container.querySelector(`[data-action="${n}"]`);
      container.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.mode === mode) return;
        mode = b.dataset.mode; shown = null; msg = ''; target = null; score = 0;
        if (mode === 'listen') newTarget();
        paint();
      }));
      const stage = container.querySelector('.fe-stage');
      container.querySelectorAll('[data-feeling]').forEach(card => card.addEventListener('pointerdown', ev => {
        if (ev.button != null && ev.button !== 0) return;
        const f = feelingById(card.dataset.feeling);
        stopDrag = ghostDrag(ev, faceSVG(f), [stage], (hit, e, moved) => {
          stopDrag = null;
          if (hit || !moved) drop(f);
        });
      }));
      const clear = act('clear');
      if (clear) clear.addEventListener('click', () => { shown = null; msg = ''; paint(); });
      const st = act('say-target');
      if (st) st.addEventListener('click', () => ttsSay(`I'm ${feelingById(target).en.toLowerCase()}!`));
      const ss = act('say-shown');
      if (ss) ss.addEventListener('click', () => ttsSay(sentence(feelingById(shown))));
    }

    if (!feelings.length) { container.innerHTML = `<div class="game-end-banner lose">This topic has no feelings to show.</div>`; return () => {}; }
    paint();
    return () => { if (stopDrag) stopDrag(); if (window.speechSynthesis) window.speechSynthesis.cancel(); };
  }

  // -------------------------------------------------------------------------
  // INSTRUMENTS — "Play": tap an instrument, a child plays it, it sounds,
  // and "I'm playing the piano." is said. "Loud or quiet?": drag each one
  // into the right box; tapping a card plays it so the child can listen.
  // -------------------------------------------------------------------------
  function renderInstruments(container, topic) {
    const seen = new Set();
    const insts = [];
    (topic.words || []).forEach(w => { const i = instrumentFor(w); if (i && !seen.has(i.id)) { seen.add(i.id); insts.push(i); } });
    let mode = 'play', current = null, sorted = {}, msg = '', shakeBin = null, sortDone = false;
    let stopDrag = null;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(() => { if (container.isConnected) fn(); }, ms));

    const speakerSVG = loud => `<svg class="in-speaker" viewBox="0 0 80 60" aria-hidden="true">
      <path d="M8,22 H20 L36,8 V52 L20,38 H8Z" fill="${loud ? '#f05d77' : '#9ea3a9'}" stroke="#2e2b2e" stroke-width="2.5" stroke-linejoin="round"/>
      ${loud
        ? `<path d="M44,20 Q52,30 44,40 M52,12 Q66,30 52,48 M60,4 Q80,30 60,56" fill="none" stroke="#f05d77" stroke-width="4" stroke-linecap="round"/>`
        : `<path d="M44,24 Q49,30 44,36" fill="none" stroke="#9ea3a9" stroke-width="3" stroke-linecap="round"/><text x="52" y="40" font-size="20">🤫</text>`}
    </svg>`;

    function playIt(inst, then) {
      const dur = InstrumentSound.play(inst.id);
      if (then) later(then, dur || 1200);
    }

    function choose(inst) {
      current = inst.id;
      paint();
      playIt(inst, () => ttsSay(`I'm playing the ${inst.en.toLowerCase()}.`));
      later(() => { const p = container.querySelector('.in-player'); if (p && current === inst.id) p.classList.remove('playing'); }, 4200);
    }

    function sortInto(inst, bin) {
      if (sorted[inst.id]) return;
      const right = inst.loud === (bin === 'loud');
      if (right) {
        sorted[inst.id] = bin;
        playCorrect();
        msg = `✅ The ${inst.en.toLowerCase()} is ${bin}!`;
        paint();
        playIt(inst, () => ttsSay(`The ${inst.en.toLowerCase()} is ${bin}!`));
        if (insts.every(i => sorted[i.id])) {
          sortDone = true;
          later(() => {
            playWin();
            if (typeof awardProgress === 'function') awardProgress(12, 1);
            msg = '🎉 Great listening!';
            paint();
            const bins = container.querySelector('.in-bins');
            if (bins) confettiFromElement(bins);
          }, 2600);
        }
      } else {
        playWrong();
        shakeBin = bin;
        msg = `❌ Listen again! The ${inst.en.toLowerCase()} is ${inst.loud ? 'loud' : 'quiet'}.`;
        paint();
        later(() => playIt(inst, () => ttsSay(`Listen! The ${inst.en.toLowerCase()} is ${inst.loud ? 'loud' : 'quiet'}.`)), 400);
      }
    }

    function playHTML() {
      const inst = current && instrumentById(current);
      return `
        <div class="in-play">
          <div class="in-stage">${playerSVG(current, Boolean(current))}</div>
          ${inst ? `<button class="fe-sentence" data-action="say-play">🔊 I'm playing the ${igEscapeHtml(inst.en.toLowerCase())}.</button>`
                 : `<p class="fe-hint">👆 Choose an instrument and listen!</p>`}
          <div class="in-row">
            ${insts.map(i => `
              <button class="in-card${current === i.id ? ' on' : ''}" data-play="${i.id}" aria-label="${igEscapeHtml(i.en)}">
                ${instrumentSVG(i.id, 'in-thumb')}
                <span class="bp-card-en">${igEscapeHtml(i.en)}</span><span class="bp-card-pt">${igEscapeHtml(i.pt)}</span>
              </button>`).join('')}
          </div>
        </div>`;
    }

    function sortHTML() {
      const binHTML = bin => `
        <div class="in-bin in-bin--${bin}${shakeBin === bin ? ' bp-shake' : ''}" data-bin="${bin}">
          <button class="in-bin-head" data-say="${bin}">${speakerSVG(bin === 'loud')}<b>${bin}</b></button>
          <div class="in-bin-items">
            ${insts.filter(i => sorted[i.id] === bin).map(i => `<span class="in-bin-item">${instrumentSVG(i.id)}</span>`).join('')}
          </div>
        </div>`;
      const left = insts.filter(i => !sorted[i.id]);
      return `
        <p class="hs-ask">Is it loud or quiet? Tap to listen, then drag it to the box! 👂</p>
        <div class="in-tray">
          ${left.length ? left.map(i => `
            <button class="in-card" data-drag="${i.id}" aria-label="${igEscapeHtml(i.en)}">
              ${instrumentSVG(i.id, 'in-thumb')}
              <span class="bp-card-en">${igEscapeHtml(i.en)}</span><span class="in-listen">🔊</span>
            </button>`).join('') : ''}
        </div>
        <div class="in-bins">${binHTML('loud')}${binHTML('quiet')}</div>
        <p class="bp-msg" aria-live="polite">${igEscapeHtml(msg) || '&nbsp;'}</p>
        ${sortDone ? `<div class="an-done-actions"><button class="game-btn" data-action="again">🔄 Play again</button></div>` : ''}`;
    }

    function paint() {
      container.innerHTML = `
        <div class="game-toolbar">
          ${modeButtons(mode, ['play', '🎵 Play'], ['sort', '🔊 Loud or quiet?'])}
          ${mode === 'sort' ? `<span class="game-status-pill">✓ ${Object.keys(sorted).length}/${insts.length}</span>` : ''}
        </div>
        ${mode === 'play' ? playHTML() : sortHTML()}`;
      shakeBin = null;
      bind();
    }

    function bind() {
      container.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.mode === mode) return;
        mode = b.dataset.mode; msg = ''; current = null;
        paint();
      }));
      container.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => choose(instrumentById(b.dataset.play))));
      const sp = container.querySelector('[data-action="say-play"]');
      if (sp) sp.addEventListener('click', () => ttsSay(`I'm playing the ${instrumentById(current).en.toLowerCase()}.`));
      container.querySelectorAll('[data-say]').forEach(b => b.addEventListener('click', () => ttsSay(b.dataset.say)));
      const bins = [...container.querySelectorAll('[data-bin]')];
      container.querySelectorAll('[data-drag]').forEach(card => card.addEventListener('pointerdown', ev => {
        if (ev.button != null && ev.button !== 0) return;
        const inst = instrumentById(card.dataset.drag);
        stopDrag = ghostDrag(ev, instrumentSVG(inst.id), bins, (hit, e, moved) => {
          stopDrag = null;
          if (!moved) { playIt(inst, () => ttsSay(inst.en)); return; }   // a tap = listen
          if (hit) sortInto(inst, hit.dataset.bin);
        });
      }));
      const again = container.querySelector('[data-action="again"]');
      if (again) again.addEventListener('click', () => { sorted = {}; sortDone = false; msg = ''; paint(); });
    }

    if (!insts.length) { container.innerHTML = `<div class="game-end-banner lose">This topic has no instruments.</div>`; return () => {}; }
    paint();
    return () => { if (stopDrag) stopDrag(); timers.forEach(clearTimeout); if (window.speechSynthesis) window.speechSynthesis.cancel(); };
  }

  // -------------------------------------------------------------------------
  // PREPOSITIONS — choose a thing, then move it around the box. Dropping it
  // snaps it to the nearest spot (the spots light up while dragging) and the
  // sentence is said: "The cat is under the box." "Teacher says": anything
  // goes, and the buttons move it for a demonstration. "Listen & find": the
  // game asks for one place at a time.
  // -------------------------------------------------------------------------
  function renderPrepositions(container, topic) {
    const fromTopic = PREPOSITIONS.filter(p => (topic.words || []).some(w => prepositionFor(w) === p));
    const preps = fromTopic.length >= 3 ? fromTopic : PREPOSITIONS;
    let thing = null, pos = null, mode = 'teacher', target = null, score = 0, msg = '', shake = false, newest = false;
    let stopDrag = null;
    const sentence = (t, p) => `The ${t.en} is ${p.phrase}.`;

    function newTarget() {
      const pool = preps.filter(p => p.id !== target && p.id !== pos);
      target = pickN(pool, 1)[0].id;
      msg = '';
      ttsSay(`Put the ${thing.en} ${prepById(target).phrase}!`);
    }

    function place(prepId) {
      const p = prepById(prepId);
      if (mode === 'teacher') {
        pos = prepId; newest = true; playCorrect();
        msg = '';
        ttsSay(sentence(thing, p));
        paint();
        return;
      }
      pos = prepId; newest = true;
      if (prepId === target) {
        score++; playCorrect();
        msg = `✅ ${sentence(thing, p)}`;
        ttsSay(`Yes! ${sentence(thing, p)}`);
        paint();
        const st = container.querySelector('.pp-stage');
        if (st) confettiFromElement(st);
        const was = target;
        setTimeout(() => { if (container.isConnected && mode === 'listen' && target === was) { newTarget(); paint(); } }, 2000);
      } else {
        playWrong(); shake = true;
        igMiss(sentence(thing, prepById(target)), false, 'Prepositions');
        msg = `❌ ${sentence(thing, p)}`;
        ttsSay(`Oops! ${sentence(thing, p)} Put the ${thing.en} ${prepById(target).phrase}!`);
        paint();
      }
    }

    function chooserHTML() {
      return `
        <p class="hs-ask">Choose! 👆</p>
        <div class="an-grid pp-grid">
          ${PP_THINGS.map(t => `
            <button class="an-card" data-thing="${t.id}" aria-label="${igEscapeHtml(t.en)}">
              <svg class="an-card-svg" viewBox="0 0 100 100">${t.draw}</svg>
              <span class="an-card-en">${igEscapeHtml(t.en)}</span>
            </button>`).join('')}
        </div>`;
    }

    function sceneHTML() {
      const listen = mode === 'listen';
      const t = target && prepById(target);
      const p = pos && prepById(pos);
      return `
        <div class="game-toolbar">
          <div class="game-btn-row"><button class="game-btn secondary" data-action="change">🔄 Trocar</button></div>
          ${modeButtons(mode, ['teacher', '👩‍🏫 Teacher says'], ['listen', '🎧 Listen & find'])}
          ${listen ? `<span class="game-status-pill">⭐ ${score}</span>` : ''}
        </div>
        ${listen && t ? `
          <div class="hs-target fe-target">
            <button class="bp-list-say" data-action="say-target" aria-label="Listen again">🔊</button>
            <span>Put the ${igEscapeHtml(thing.en)} <b>${igEscapeHtml(t.en)}</b> ${t.id === 'between' ? 'the boxes' : 'the box'}!</span>
          </div>` : ''}
        <div class="pp-stage${shake ? ' bp-shake' : ''}">
          <svg class="pp-scene" viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg">${ppSceneInner(thing, pos, { newest })}</svg>
        </div>
        <div class="pp-under">
          ${!pos ? `<button class="pp-tray" data-tray aria-label="${igEscapeHtml(thing.en)}"><svg viewBox="0 0 100 100">${thing.draw}</svg><span>Drag me! 👆</span></button>` : ''}
          ${p ? `<button class="fe-sentence" data-action="say-pos">🔊 ${igEscapeHtml(sentence(thing, p))}</button>`
              : `<p class="fe-hint">Drag the ${igEscapeHtml(thing.en)} to the box!</p>`}
        </div>
        <p class="bp-msg" aria-live="polite">${igEscapeHtml(msg) || '&nbsp;'}</p>
        ${listen ? '' : `
          <div class="pp-chips">
            ${preps.map(x => `<button class="pp-chip${pos === x.id ? ' on' : ''}" data-prep="${x.id}">${ppIconSVG(x.id)}<span>${igEscapeHtml(x.en)}</span></button>`).join('')}
          </div>`}`;
    }

    function paint() {
      container.innerHTML = thing ? sceneHTML() : chooserHTML();
      shake = false; newest = false;
      bind();
    }

    function startDrag(ev) {
      if (ev.button != null && ev.button !== 0) return;
      const stage = container.querySelector('.pp-stage');
      const svg = container.querySelector('.pp-scene');
      if (!stage || !svg) return;
      // While dragging: the thing leaves its spot and the drop spots light up.
      svg.innerHTML = ppSceneInner(thing, null, { hots: true });
      stopDrag = ghostDrag(ev, `<svg viewBox="0 0 100 100">${thing.draw}</svg>`, [stage], (hit, e, moved) => {
        stopDrag = null;
        if (!hit || !moved) { paint(); return; }
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
        let best = null, bestD = Infinity;
        preps.forEach(p => {
          const d = Math.hypot(p.hot[0] - loc.x, p.hot[1] - loc.y);
          if (d < bestD) { best = p; bestD = d; }
        });
        if (best && bestD < 90) place(best.id);
        else paint();
      });
    }

    function bind() {
      const act = n => container.querySelector(`[data-action="${n}"]`);
      container.querySelectorAll('[data-thing]').forEach(b => b.addEventListener('click', () => {
        thing = ppThingById(b.dataset.thing); pos = null; msg = ''; target = null; score = 0;
        ttsSay(`The ${thing.en}!`);
        if (mode === 'listen') newTarget();
        paint();
      }));
      container.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.mode === mode) return;
        mode = b.dataset.mode; msg = ''; target = null; score = 0;
        if (mode === 'listen') newTarget();
        paint();
      }));
      const tray = container.querySelector('[data-tray]');
      if (tray) tray.addEventListener('pointerdown', startDrag);
      container.querySelectorAll('.pp-scene .pp-thing').forEach(g => g.addEventListener('pointerdown', startDrag));
      container.querySelectorAll('[data-prep]').forEach(b => b.addEventListener('click', () => place(b.dataset.prep)));
      const change = act('change');
      if (change) change.addEventListener('click', () => { thing = null; pos = null; target = null; paint(); });
      const st = act('say-target');
      if (st) st.addEventListener('click', () => ttsSay(`Put the ${thing.en} ${prepById(target).phrase}!`));
      const sp = act('say-pos');
      if (sp) sp.addEventListener('click', () => ttsSay(sentence(thing, prepById(pos))));
    }

    paint();
    return () => { if (stopDrag) stopDrag(); if (window.speechSynthesis) window.speechSynthesis.cancel(); };
  }


  // -------------------------------------------------------------------------
  // WEATHER — drag a weather onto the sky and the whole scene changes: rain
  // falls, the tree bends in the wind, the child puts on a raincoat… with
  // its own sound. "Teacher says" takes anything; "Listen & find" asks
  // "What's the weather like? It's snowy!" with pictures only.
  // -------------------------------------------------------------------------
  function renderWeather(container, topic) {
    const seen = new Set();
    const list = [];
    (topic.words || []).forEach(w => { const x = weatherFor(w); if (x && !seen.has(x.id)) { seen.add(x.id); list.push(x); } });
    let mode = 'teacher', shown = null, target = null, score = 0, msg = '', shake = false;
    let stopDrag = null;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(() => { if (container.isConnected) fn(); }, ms));
    const its = w => `It's ${w.en.toLowerCase()}!`;

    function newTarget() {
      const pool = list.filter(w => w.id !== target);
      target = pickN(pool, 1)[0].id;
      shown = null;
      msg = '';
      ttsSay(`What's the weather like? ${its(weatherById(target))}`);
    }

    function show(w) {
      shown = w.id;
      playWeatherSound(w.id);
      paint();
      later(() => ttsSay(`${its(w)} ${w.extra}`), w.id === 'stormy' ? 900 : 300);
    }

    function drop(w) {
      if (mode === 'teacher') { msg = ''; show(w); return; }
      if (w.id === target) {
        score++;
        msg = '⭐ Yes!';
        show(w);
        playCorrect();
        const stage = container.querySelector('.wx-stage');
        if (stage) confettiFromElement(stage);
        const was = target;
        later(() => { if (mode === 'listen' && target === was) { newTarget(); paint(); } }, 3600);
      } else {
        playWrong();
        shake = true;
        igMiss(igWordOf(topic, weatherById(target).en), false, 'Weather');
        msg = `❌ That's ${w.en.toLowerCase()}.`;
        paint();
        ttsSay(`No, that's ${w.en.toLowerCase()}. ${its(weatherById(target))}`);
      }
    }

    function paint() {
      const w = shown && weatherById(shown);
      const t = target && weatherById(target);
      const listen = mode === 'listen';
      container.innerHTML = `
        <div class="game-toolbar">
          ${modeButtons(mode, ['teacher', '👩‍🏫 Teacher says'], ['listen', '🎧 Listen & find'])}
          ${listen ? `<span class="game-status-pill">⭐ ${score}</span>` : `<button class="game-btn secondary" data-action="clear">🔄 Limpar</button>`}
        </div>
        ${listen && t ? `
          <div class="hs-target fe-target">
            <button class="bp-list-say" data-action="say-target" aria-label="Listen again">🔊</button>
            <span>What's the weather like? It's <b>${igEscapeHtml(t.en.toLowerCase())}</b>!</span>
          </div>` : ''}
        <div class="wx-layout">
          <div class="wx-main">
            <div class="wx-stage wx--${shown || 'none'}${shake ? ' bp-shake' : ''}">
              <svg class="wx-scene" viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg">${weatherSceneInner(shown)}</svg>
              <span class="bp-drop-hint">Drop it in the sky! ☁️</span>
            </div>
            <div class="wx-under">
              ${w ? `<button class="fe-sentence" data-action="say-shown">🔊 ${igEscapeHtml(its(w))}</button>
                     <span class="wx-extra">${igEscapeHtml(w.extra)}</span>`
                  : `<p class="fe-hint">👆 ${listen ? 'Listen and drag the weather to the sky!' : 'What\'s the weather like today? Drag it to the sky!'}</p>`}
            </div>
            <p class="bp-msg" aria-live="polite">${igEscapeHtml(msg) || '&nbsp;'}</p>
          </div>
          <div class="wx-cards">
            ${list.map(x => `
              <button class="fe-card wx-card${shown === x.id ? ' on' : ''}${listen ? ' no-label' : ''}" data-weather="${x.id}" aria-label="${igEscapeHtml(x.en)}">
                ${weatherIconSVG(x.id, 'wx-thumb')}
                ${listen ? '' : `<span class="bp-card-en">${igEscapeHtml(x.en)}</span><span class="bp-card-pt">${igEscapeHtml(x.pt)}</span>`}
              </button>`).join('')}
          </div>
        </div>`;
      shake = false;
      bind();
    }

    function bind() {
      const act = n => container.querySelector(`[data-action="${n}"]`);
      container.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.mode === mode) return;
        mode = b.dataset.mode; shown = null; msg = ''; target = null; score = 0;
        if (mode === 'listen') newTarget();
        paint();
      }));
      const stage = container.querySelector('.wx-stage');
      container.querySelectorAll('[data-weather]').forEach(card => card.addEventListener('pointerdown', ev => {
        if (ev.button != null && ev.button !== 0) return;
        const w = weatherById(card.dataset.weather);
        stopDrag = ghostDrag(ev, weatherIconSVG(w.id), [stage], (hit, e, moved) => {
          stopDrag = null;
          if (hit || !moved) drop(w);
        });
      }));
      const clear = act('clear');
      if (clear) clear.addEventListener('click', () => { shown = null; msg = ''; paint(); });
      const st = act('say-target');
      if (st) st.addEventListener('click', () => ttsSay(`What's the weather like? ${its(weatherById(target))}`));
      const ss = act('say-shown');
      if (ss) ss.addEventListener('click', () => { const w = weatherById(shown); playWeatherSound(w.id); ttsSay(`${its(w)} ${w.extra}`); });
    }

    if (!list.length) { container.innerHTML = `<div class="game-end-banner lose">This topic has no weather words.</div>`; return () => {}; }
    paint();
    return () => { if (stopDrag) stopDrag(); timers.forEach(clearTimeout); if (window.speechSynthesis) window.speechSynthesis.cancel(); };
  }


  // -------------------------------------------------------------------------
  // BODY PARTS — build a boy or a girl part by part. "Build": tap (or drag)
  // a card and that part appears on the body, and the game says just its
  // name ("eyes"). Tapping a part already on the body says it again.
  // "Listen & find": the game says a part, the child finds its picture and
  // the body grows. "What's this?": a part lights up, the child picks its
  // word. 🎵 "Head, shoulders, knees and toes" lights the parts as it sings.
  // -------------------------------------------------------------------------
  function renderBody(container, topic) {
    const seen = new Set();
    const parts = [];
    (topic.words || []).forEach(w => { const p = bodyPartFor(w); if (p && !seen.has(p.id)) { seen.add(p.id); parts.push(p); } });
    const KID_KEY = 'ig_body_kid';
    let kid = 'boy';
    try { if (localStorage.getItem(KID_KEY) === 'girl') kid = 'girl'; } catch (e) {}
    let mode = 'build', built = new Set(), shown = null, fresh = null, target = null, score = 0, msg = '', shake = false, choices = [];
    let stopDrag = null, singing = false;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(() => { if (container.isConnected) fn(); }, ms));
    const sayPart = p => ttsSay(p.en.toLowerCase(), 0.8);
    const complete = () => parts.every(p => built.has(p.id));

    // The traditional song; each sung chunk lights its part.
    const SONG = [['head', 'Head,'], ['shoulders', 'shoulders,'], ['knees', 'knees'], ['toes', 'and toes,'], ['knees', 'knees'], ['toes', 'and toes.']];
    const SONG_ALL = [...SONG, ...SONG, ['eyes', 'And eyes'], ['ears', 'and ears'], ['mouth', 'and mouth'], ['nose', 'and nose.'], ...SONG];
    const canSing = ['head', 'shoulders', 'knees', 'toes', 'eyes', 'ears', 'mouth', 'nose'].every(id => seen.has(id));

    function stopSong() {
      if (!singing) return;
      singing = false;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }

    const figureHTML = () => bodySVG({
      kid, built: mode === 'what' ? null : built, on: shown, fresh, hits: true, cls: 'bd-figure-svg',
    });

    // Light a part up without redrawing everything (the song is fast).
    function light(id) {
      shown = id; fresh = null;
      const svg = container.querySelector('.bd-stage svg');
      if (!svg) return;
      svg.outerHTML = figureHTML();
      bindFigure();
    }

    function sing() {
      if (singing) { stopSong(); shown = null; paint(); return; }
      // The song needs the whole child.
      parts.forEach(p => built.add(p.id));
      singing = true; msg = ''; shown = null; fresh = null; paint();
      const done = () => { if (!singing) return; singing = false; shown = null; if (container.isConnected) paint(); };
      if (!('speechSynthesis' in window)) {
        SONG_ALL.forEach(([id], i) => later(() => { if (singing) light(id); }, i * 520));
        later(done, SONG_ALL.length * 520 + 400);
        return;
      }
      try {
        window.speechSynthesis.cancel();
        SONG_ALL.forEach(([id, text], i) => {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'en-US'; u.rate = 1.05; u.pitch = 1.15;
          u.onstart = () => { if (singing && container.isConnected) light(id); };
          if (i === SONG_ALL.length - 1) { u.onend = done; u.onerror = done; }
          window.speechSynthesis.speak(u);
        });
      } catch (e) { done(); }
    }

    // The whole child is ready: a little party.
    function celebrate() {
      later(() => {
        msg = mode === 'listen' ? `🎉 Great job! ⭐ ${score}` : '🎉 Great job!';
        shown = null; fresh = null;
        paint();
        playWin();
        const stage = container.querySelector('.bd-stage');
        if (stage) confettiFromElement(stage);
        ttsSay('Great job!');
      }, 1100);
    }

    // A part arrives on the body (or, if it is already there, lights up).
    function add(p) {
      stopSong();
      const isNew = !built.has(p.id);
      built.add(p.id);
      shown = p.id; fresh = isNew ? p.id : null; msg = '';
      playBodySound(p.id);
      if (isNew) IGSound.pop && IGSound.pop();
      paint();
      sayPart(p);
      if (isNew && complete()) celebrate();
    }

    function newTarget() {
      if (mode === 'what') {
        const pool = parts.filter(p => p.id !== target);
        target = pickN(pool, 1)[0].id;
        shown = target; msg = '';
        choices = shuffle([target, ...pickN(parts.filter(p => p.id !== target).map(p => p.id), Math.min(3, parts.length - 1))]);
        ttsSay("What's this?");
        return;
      }
      // Listen & find: a part that is not on the body yet.
      const pool = parts.filter(p => !built.has(p.id));
      target = pool.length ? pickN(pool, 1)[0].id : null;
      msg = ''; shown = null;
      if (target) later(() => sayPart(bodyPartById(target)), 250);
    }

    function wrong(p) {
      const t = bodyPartById(target);
      playWrong();
      shake = true;
      igMiss(igWordOf(topic, t.en), false, 'Body Parts');
      msg = `❌ ${p.en}`;
      paint();
      later(() => sayPart(t), 500);
    }

    // A card tapped or dropped on the body, or a word chosen.
    function pick(p) {
      if (mode === 'build') { add(p); return; }
      if (mode === 'listen') {
        if (!target) return;
        if (built.has(p.id)) { sayPart(p); return; }
        if (p.id !== target) { wrong(p); return; }
        score++;
        built.add(p.id);
        shown = p.id; fresh = p.id; msg = '⭐';
        playCorrect();
        playBodySound(p.id);
        paint();
        sayPart(p);
        target = null;
        if (complete()) { celebrate(); return; }
        later(() => { if (mode === 'listen' && !target) { newTarget(); paint(); } }, 1600);
        return;
      }
      // What's this?
      if (msg === '⭐') return;   // already right: the next one is on its way
      if (p.id !== target) { wrong(p); return; }
      score++;
      msg = '⭐';
      playCorrect();
      paint();
      sayPart(p);
      const stage = container.querySelector('.bd-stage');
      if (stage) confettiFromElement(stage);
      const was = target;
      later(() => { if (mode === 'what' && target === was) { newTarget(); paint(); } }, 1800);
    }

    const MODES = [['build', '🧩 Build'], ['listen', '🎧 Listen & find'], ['what', "❓ What's this?"]];

    function paint() {
      const build = mode === 'build', listen = mode === 'listen', what = mode === 'what';
      const t = target && bodyPartById(target);
      const p = shown && bodyPartById(shown);
      const showWord = p && (!what || msg === '⭐');
      const count = parts.filter(x => built.has(x.id)).length;
      container.innerHTML = `
        <div class="game-toolbar">
          <div class="bp-modes">${MODES.map(([id, label]) => `<button class="bp-mode${mode === id ? ' active' : ''}" data-mode="${id}">${label}</button>`).join('')}</div>
          <div class="bp-modes bd-kids">${Object.entries(BD_KIDS).map(([id, k]) => `<button class="bp-mode${kid === id ? ' active' : ''}" data-kid="${id}">${k.icon} ${k.en}</button>`).join('')}</div>
          ${build
            ? `${canSing ? `<button class="game-btn secondary" data-action="sing">${singing ? '⏹ Stop' : '🎵 Head, shoulders…'}</button>` : ''}
               <button class="game-btn secondary" data-action="clear">🔄 Limpar</button>`
            : `<span class="game-status-pill">⭐ ${score}</span>`}
        </div>
        ${listen && t ? `
          <div class="hs-target fe-target">
            <button class="bp-list-say" data-action="say-target" aria-label="Listen again">🔊</button>
            <span>Listen and find! 👂</span>
          </div>` : ''}
        ${what && t ? `
          <div class="hs-target fe-target">
            <button class="bp-list-say" data-action="say-what" aria-label="Listen again">🔊</button>
            <span>What's this?</span>
          </div>` : ''}
        <div class="bd-layout${what ? ' bd-layout--solo' : ''}">
          <div class="bd-main${what ? ' bd-main--what' : ''}">
            <div class="bd-stage${shake ? ' bp-shake' : ''}">
              ${figureHTML()}
              <span class="bp-drop-hint">Drop it on the body! 🧍</span>
            </div>
            <div class="bd-under">
              ${showWord ? `<button class="fe-sentence bd-word" data-action="say-shown">🔊 ${igEscapeHtml(p.en)}</button>`
                : singing ? `<p class="fe-hint">🎵 Sing and touch! 🎵</p>`
                : what ? ''
                : build && !count ? `<p class="fe-hint">👆 Tap a card to build the ${kid}!</p>`
                : listen && count < parts.length ? `<p class="fe-hint">🔊 Listen and tap the picture!</p>` : ''}
              ${!what && count ? `<span class="bd-count">${count} / ${parts.length}</span>` : ''}
            </div>
            ${what ? `
              <div class="bd-choices">
                ${choices.map(id => { const c = bodyPartById(id); return `
                  <button class="bd-choice${msg === '⭐' && id === target ? ' ok' : ''}" data-choice="${id}">
                    <b>${igEscapeHtml(c.en)}</b><small>${igEscapeHtml(c.pt)}</small>
                  </button>`; }).join('')}
              </div>` : ''}
            <p class="bp-msg" aria-live="polite">${igEscapeHtml(msg) || '&nbsp;'}</p>
            ${listen && complete() ? `<button class="game-btn" data-action="again">🔄 Play again</button>` : ''}
          </div>
          ${what ? '' : `
            <div class="bd-cards">
              ${parts.map(x => `
                <button class="fe-card bd-card${built.has(x.id) ? ' on' : ''}${listen ? ' no-label' : ''}" data-body="${x.id}" aria-label="${igEscapeHtml(x.en)}">
                  ${bodyPartThumbSVG(x.id, 'bd-thumb', kid)}
                  ${listen ? '' : `<span class="bp-card-en">${igEscapeHtml(x.en)}</span><span class="bp-card-pt">${igEscapeHtml(x.pt)}</span>`}
                </button>`).join('')}
            </div>`}
        </div>`;
      shake = false; fresh = null;
      bind();
    }

    // Taps on the drawing itself (light() redraws it, so this is separate):
    // a part already on the body just says its name.
    function bindFigure() {
      const svg = container.querySelector('.bd-stage svg');
      if (!svg) return;
      svg.addEventListener('click', ev => {
        if (mode === 'what' || singing) return;
        const el = ev.target.closest && ev.target.closest('[data-part]');
        if (!el || !built.has(el.dataset.part)) return;
        const p = bodyPartById(el.dataset.part);
        shown = p.id;
        playBodySound(p.id);
        paint();
        sayPart(p);
      });
    }

    function restart() {
      built = new Set(); shown = null; fresh = null; msg = ''; target = null; score = 0;
      if (mode !== 'build') newTarget();
      paint();
    }

    function bind() {
      const act = n => container.querySelector(`[data-action="${n}"]`);
      container.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.mode === mode) return;
        stopSong();
        mode = b.dataset.mode;
        restart();
      }));
      container.querySelectorAll('[data-kid]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.kid === kid) return;
        kid = b.dataset.kid;
        try { localStorage.setItem(KID_KEY, kid); } catch (e) {}
        IGSound.pickup && IGSound.pickup();
        paint();
      }));
      bindFigure();
      const stage = container.querySelector('.bd-stage');
      container.querySelectorAll('[data-body]').forEach(card => card.addEventListener('pointerdown', ev => {
        if (ev.button != null && ev.button !== 0) return;
        const p = bodyPartById(card.dataset.body);
        stopDrag = ghostDrag(ev, bodyPartThumbSVG(p.id, '', kid), [stage], (hit, e, moved) => {
          stopDrag = null;
          if (hit || !moved) pick(p);
        });
      }));
      container.querySelectorAll('[data-choice]').forEach(b => b.addEventListener('click', () => pick(bodyPartById(b.dataset.choice))));
      const singBtn = act('sing');
      if (singBtn) singBtn.addEventListener('click', sing);
      const clear = act('clear');
      if (clear) clear.addEventListener('click', () => { stopSong(); restart(); });
      const again = act('again');
      if (again) again.addEventListener('click', restart);
      const st = act('say-target');
      if (st) st.addEventListener('click', () => sayPart(bodyPartById(target)));
      const sw = act('say-what');
      if (sw) sw.addEventListener('click', () => ttsSay("What's this?"));
      const ss = act('say-shown');
      if (ss) ss.addEventListener('click', () => { const p = bodyPartById(shown); playBodySound(p.id); sayPart(p); });
    }

    if (!parts.length) { container.innerHTML = `<div class="game-end-banner lose">This topic has no body parts.</div>`; return () => {}; }
    paint();
    return () => { stopSong(); if (stopDrag) stopDrag(); timers.forEach(clearTimeout); if (window.speechSynthesis) window.speechSynthesis.cancel(); };
  }
  function stopAll() {
    clearAllTimers();
    if (activeCleanup) { try { activeCleanup(); } catch (e) {} activeCleanup = null; }
  }

  function mount(rawContainer, topic, type) {
    stopAll();
    // Swap in a listener-free clone: some games (word search) bind events
    // directly on the container, and this container is reused across
    // game-type switches within the same modal session.
    const container = rawContainer.cloneNode(false);
    rawContainer.replaceWith(container);

    if (!topic.words || topic.words.length === 0) {
      container.innerHTML = `<div class="game-end-banner lose">This topic doesn't have a word bank yet.</div>`;
      return;
    }
    switch (type) {
      case 'hangman': activeCleanup = renderHangman(container, topic); break;
      case 'memory': activeCleanup = renderMemory(container, topic); break;
      case 'matchup': activeCleanup = renderMatchup(container, topic); break;
      case 'balloon': activeCleanup = renderBalloon(container, topic); break;
      case 'wordsearch': activeCleanup = renderWordSearch(container, topic); break;
      case 'unscramble': activeCleanup = renderUnscramble(container, topic); break;
      case 'sortit': activeCleanup = renderSortIt(container, topic); break;
      case 'dressup': activeCleanup = renderDressUp(container, topic); break;
      case 'backpack': activeCleanup = renderBackpack(container, topic); break;
      case 'house': activeCleanup = renderHouse(container, topic); break;
      case 'animal': activeCleanup = renderAnimal(container, topic); break;
      case 'feelings': activeCleanup = renderFeelings(container, topic); break;
      case 'instruments': activeCleanup = renderInstruments(container, topic); break;
      case 'prepositions': activeCleanup = renderPrepositions(container, topic); break;
      case 'weather': activeCleanup = renderWeather(container, topic); break;
      case 'body': activeCleanup = renderBody(container, topic); break;
      default: activeCleanup = renderHangman(container, topic);
    }
  }

  return { mount, stopAll };
})();
