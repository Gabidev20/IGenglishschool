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
function gamesForTopic(topic) {
  return GAME_TYPES.filter(g => {
    if (g.needs === 'sentences') {
      return typeof lkSentences === 'function' && lkSentences(topic).length >= 3;
    }
    if (g.needs === 'rules') {
      return typeof lkSort === 'function' && Boolean(lkSort(topic));
    }
    if (g.needs === 'clothes') {
      return isClothesTopic(topic);
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

  // Web Audio synthesized feedback sounds (no external audio files needed)
  let audioCtx = null;
  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function tone(freq, start, duration, type = 'sine', gain = 0.16) {
    const c = ctx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(c.destination);
    osc.start(c.currentTime + start);
    g.gain.setValueAtTime(gain, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration);
    osc.stop(c.currentTime + start + duration);
  }
  function playCorrect() {
    try { tone(523, 0, 0.12); tone(784, 0.1, 0.18); } catch (e) {}
  }
  function playWrong() {
    try { tone(160, 0, 0.22, 'sawtooth', 0.12); } catch (e) {}
  }
  function playWin() {
    try { tone(523, 0, 0.14); tone(659, 0.12, 0.14); tone(784, 0.24, 0.3); } catch (e) {}
  }

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
          playWin();
          if (typeof awardProgress === 'function') awardProgress(10, 0);
        }
      } else {
        state.wrong++;
        playWrong();
        if (state.wrong >= MAX_WRONG) state.status = 'lost';
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
    }

    newRound(true);
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

      if (selectedLeft && selectedRight) {
        if (selectedLeft === selectedRight) {
          matchedIds.add(selectedLeft);
          playCorrect();
          selectedLeft = null; selectedRight = null;
          paint();
        } else {
          playWrong();
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
          if (!ended && spawnedForRound === roundIndex && word.en === target.en) { misses++; updateHUD(); }
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

    function setup() {
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

      if (won) {
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
          checked = null;
          paint();
        });
      });
      container.querySelectorAll('[data-unplace]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (checked === true) return;
          placed.splice(Number(btn.dataset.unplace), 1);
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
          playCorrect();
          confettiFromElement(container.querySelector('#usAnswer'));
          if (typeof awardProgress === 'function') awardProgress(10, 0);
          if (typeof lmSpeak === 'function') lmSpeak(target, 0.85);
        } else {
          playWrong();
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
          <div class="sort-card ${lastWrong ? 'shake' : ''}">${igEscapeHtml(item.text)}</div>
          ${lastWrong ? `<p class="sort-hint">That one takes <strong>${igEscapeHtml(lastWrong)}</strong>.</p>` : ''}

          <div class="sort-buckets">
            ${board.buckets.map(b => `
              <div class="sort-bucket">
                <button class="sort-bucket-btn" data-bucket="${igEscapeHtml(b)}">${igEscapeHtml(b)}</button>
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
          }
          paint();
        });
      });

      const restart = container.querySelector('[data-action="restart"]');
      if (restart) restart.addEventListener('click', () => renderSortIt(container, topic));
    }

    function finish() {
      const perfect = right === queue.length;
      if (perfect) { playWin(); if (typeof awardProgress === 'function') awardProgress(0, 2); }
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
    let activeColor = null;        // null = each garment keeps its own colour
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
    const colorFor = item => activeColor || item.color;

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
      worn[item.slot] = { id: item.id, color: colorFor(item) };
      item.conflicts.forEach(s => { delete worn[s]; });
      playCorrect();
      say(item.en);
      paint();
      checkMission();
    }

    function takeOff(slot) {
      if (!worn[slot]) return;
      delete worn[slot];
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
      ghost.innerHTML = previewSVG(item, fromDoll ? worn[item.slot].color : colorFor(item));
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
        if (Math.abs(e.clientX - startX) > 6 || Math.abs(e.clientY - startY) > 6) moved = true;
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
          if (!over || !moved) takeOff(item.slot);   // dragged off, or tapped
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
                  <g class="dressup-worn" data-worn="${s}">${DRESS_DRAW[worn[s].id](worn[s].color, gender)}</g>`).join('')}
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
            <div class="dressup-palette">
              <button class="dressup-swatch rainbow${activeColor === null ? ' active' : ''}" data-color="" title="Each piece keeps its own colour">🎨</button>
              ${DRESS_COLORS.map(c => `<button class="dressup-swatch${activeColor === c.hex ? ' active' : ''}" data-color="${c.hex}" style="background:${c.hex}" title="${c.name}" aria-label="${c.name}"></button>`).join('')}
            </div>
            <div class="dressup-rack">
              ${items.map(i => {
                const on = worn[i.slot] && worn[i.slot].id === i.id;
                return `
                  <button class="dressup-card${on ? ' worn' : ''}" data-item="${i.id}">
                    ${previewSVG(i, on ? worn[i.slot].color : colorFor(i))}
                    <span class="dressup-card-en">${igEscapeHtml(i.en)}</span>
                    <span class="dressup-card-pt">${igEscapeHtml(i.pt)}</span>
                    ${on ? '<span class="dressup-card-on">✓</span>' : ''}
                  </button>`;
              }).join('')}
            </div>
            <p class="dressup-tip">Drag a piece onto the doll — or just tap it. Tap what ${gender === 'girl' ? 'she' : 'he'}'s wearing to take it off.</p>
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

      container.querySelectorAll('[data-color]').forEach(btn => {
        btn.addEventListener('click', () => { activeColor = btn.dataset.color || null; paint(); });
      });

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
          beginDrag(ev, itemById(card.dataset.item), false);
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
      if (undress) undress.addEventListener('click', () => { worn = {}; playWrong(); paint(); });

      const mode = act('mode');
      if (mode) mode.addEventListener('click', () => {
        challenge = !challenge;
        if (challenge) newMission();
        paint();
      });

      const surprise = act('surprise');
      if (surprise) surprise.addEventListener('click', () => {
        worn = {};
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
      default: activeCleanup = renderHangman(container, topic);
    }
  }

  return { mount, stopAll };
})();
