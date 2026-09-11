/* ==========================================================================
   IGenglishschool — Game Engine
   Self-contained module exposing GameEngine.mount(container, topic, type)
   ========================================================================== */

const GAME_TYPES = [
  { id: 'hangman', label: 'Hangman', icon: '🎯' },
  { id: 'memory', label: 'Memory', icon: '🧠' },
  { id: 'matchup', label: 'Match-up', icon: '🔗' },
  { id: 'balloon', label: 'Balloon Pop', icon: '🎈' },
  { id: 'wordsearch', label: 'Word Search', icon: '🔍' },
];

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

  function wordVisualHTML(word, extraClass) {
    if (word.swatch) {
      return `<div class="word-visual swatch-visual ${extraClass || ''}" style="background:${word.swatch}"></div>`;
    }
    if (word.image) {
      return `<div class="word-visual ${extraClass || ''}">
        <img src="${word.image}" alt="${word.en}" loading="lazy"
             onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'emoji-fallback',textContent:'${word.emoji}'}))" />
      </div>`;
    }
    return `<div class="word-visual ${extraClass || ''}"><span class="emoji-fallback">${word.emoji}</span></div>`;
  }

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

  function renderHangman(container, topic) {
    const deckKey = `${topic.id}:hangman`;
    let state = null;

    function newRound(resetWholeDeck) {
      if (resetWholeDeck) resetDeck(deckKey);
      state = {
        word: drawFromDeck(deckKey, topic.words),
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
          <span class="game-status-pill">${topic.words.length - (decks[deckKey] ? decks[deckKey].length : 0)} / ${topic.words.length} words · ${remaining} tries left</span>
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
      return `<span class="memory-word-label">${card.word.en}</span>`;
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
        ${won ? `<div class="game-end-banner win">🎉 Great memory! <p>Solved in ${moves} moves.</p></div>` : ''}
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
      el.innerHTML = `<div class="balloon-body" style="background:${color}">${word.en}</div><div class="balloon-string"></div>`;

      // Correctness is judged live against the on-screen target, not at spawn
      // time, so it always matches what the balloon currently displays.
      el.addEventListener('click', () => popBalloon(el, word));
      const endTimer = setTimeout(() => {
        if (el.isConnected) {
          if (!ended && word.en === target.en) { misses++; updateHUD(); }
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

  function buildWordSearchGrid(words) {
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    const placements = [];

    const targets = words
      .map(w => ({ word: w, letters: w.en.toUpperCase().replace(/[^A-Z]/g, '') }))
      .filter(t => t.letters.length >= 3 && t.letters.length <= GRID_SIZE)
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
    let words, grid, placements, found, selecting, startCell, currentPath;

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

      const cells = container.querySelectorAll('.ws-cell');
      cells.forEach(cell => {
        cell.addEventListener('mousedown', onStart);
        cell.addEventListener('mouseenter', onEnter);
        cell.addEventListener('touchstart', onTouchStart, { passive: true });
      });
      container.querySelector('[data-action="restart"]').addEventListener('click', setup);

      if (won) {
        confettiFromElement(container.querySelector('.game-end-banner'));
        if (typeof awardProgress === 'function') awardProgress(15, 0);
      }
    }

    function onStart(e) {
      selecting = true;
      startCell = [Number(e.target.dataset.r), Number(e.target.dataset.c)];
      currentPath = [startCell];
      paint();
    }
    function onEnter(e) {
      if (!selecting) return;
      const r = Number(e.target.dataset.r), c = Number(e.target.dataset.c);
      extendPath(r, c);
    }
    function onTouchStart(e) {
      onStart({ target: e.target });
    }
    function extendPath(r, c) {
      const [sr, sc] = startCell;
      const dr = Math.sign(r - sr), dc = Math.sign(c - sc);
      const path = [];
      let cr = sr, cc = sc;
      path.push([cr, cc]);
      const steps = Math.max(Math.abs(r - sr), Math.abs(c - sc));
      const isStraight = (dr === 0 || dc === 0 || Math.abs(r - sr) === Math.abs(c - sc));
      if (!isStraight) return;
      for (let i = 1; i <= steps; i++) {
        cr = sr + dr * i; cc = sc + dc * i;
        path.push([cr, cc]);
      }
      currentPath = path;
      paint();
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

    container.addEventListener('mouseup', onEnd);
    container.addEventListener('touchend', onEnd);

    setup();
  }

  // -------------------------------------------------------------------------
  // MOUNT / TEARDOWN
  // -------------------------------------------------------------------------
  function stopAll() {
    clearAllTimers();
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
      case 'hangman': renderHangman(container, topic); break;
      case 'memory': renderMemory(container, topic); break;
      case 'matchup': renderMatchup(container, topic); break;
      case 'balloon': renderBalloon(container, topic); break;
      case 'wordsearch': renderWordSearch(container, topic); break;
      default: renderHangman(container, topic);
    }
  }

  return { mount, stopAll };
})();
