/* ==========================================================================
   IGenglishschool — 🟡 Maze Muncher (a Pac-Man for the class)
   --------------------------------------------------------------------------
   One or two players run through a maze eating the food the teacher chose:
   coins, fruits, vegetables, letters, numbers, colors, sweets. Every word
   food is spoken when it is eaten ("banana!", "B!", "seven!"), so the game
   is vocabulary practice disguised as a race.

     • avatars: dinosaur, monkey, butterfly, Pac-Man, frog — each player picks
     • 2 players at once on one screen: Player 1 = W A S D, Player 2 = arrows,
       and a touch pad for each one under the maze (tablets, the class TV)
     • friendly ghosts (0, 2 or 4): a touch sends the player back to start
     • when the food is gone, the one who ate more wins

   Everything is drawn on one canvas; the emoji come from Twemoji (utils.js)
   so they look the same on every device.
   ========================================================================== */

const MZ_MAP = [
  '#####################',
  '#.........#.........#',
  '#.###.###.#.###.###.#',
  '#...................#',
  '#.###.#.#####.#.###.#',
  '#.....#...#...#.....#',
  '#####.###.#.###.#####',
  '#.........G.........#',
  '#.###.#.#####.#.###.#',
  '#...#.#...#...#.#...#',
  '###.#.###.#.###.#.###',
  '#.......#...#.......#',
  '#.#####.#.#.#.#####.#',
  '#1.................2#',
  '#####################',
];

const MZ_AVATARS = [
  { id: 'pacman', en: 'Pac-Man', emoji: null },
  { id: 'dino', en: 'Dinosaur', emoji: '🦖' },
  { id: 'monkey', en: 'Monkey', emoji: '🐵' },
  { id: 'butterfly', en: 'Butterfly', emoji: '🦋' },
  { id: 'frog', en: 'Frog', emoji: '🐸' },
];

// say: spoken when eaten. draw: an emoji, or { text, color } for a bubble.
const MZ_FOODS = [
  { id: 'coins', en: 'Coins', pt: 'Moedas', icon: '🪙', items: () => [{ emoji: '🪙' }] },
  { id: 'fruits', en: 'Fruits', pt: 'Frutas', icon: '🍎', items: () => [
    ['🍎', 'apple'], ['🍌', 'banana'], ['🍇', 'grapes'], ['🍓', 'strawberry'], ['🍊', 'orange'],
    ['🍉', 'watermelon'], ['🍐', 'pear'], ['🍒', 'cherries'], ['🍍', 'pineapple'], ['🥭', 'mango'],
  ].map(([emoji, say]) => ({ emoji, say })) },
  { id: 'veggies', en: 'Vegetables', pt: 'Legumes', icon: '🥕', items: () => [
    ['🥕', 'carrot'], ['🌽', 'corn'], ['🥦', 'broccoli'], ['🍅', 'tomato'], ['🥔', 'potato'],
    ['🥒', 'cucumber'], ['🧅', 'onion'], ['🫑', 'pepper'],
  ].map(([emoji, say]) => ({ emoji, say })) },
  { id: 'letters', en: 'Letters', pt: 'Letras', icon: '🔤', items: () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l, i) => ({ text: l, color: MZ_BUBBLE[i % MZ_BUBBLE.length], letter: l })) },
  { id: 'numbers', en: 'Numbers', pt: 'Números', icon: '🔢', items: () =>
    ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
      .map((say, i) => ({ text: String(i + 1), color: MZ_BUBBLE[i % MZ_BUBBLE.length], say })) },
  { id: 'colors', en: 'Colors', pt: 'Cores', icon: '🎨', items: () => [
    ['#e5484d', 'red'], ['#3d7bd9', 'blue'], ['#f2bd2c', 'yellow'], ['#3fae5a', 'green'], ['#f08a24', 'orange'],
    ['#8e5fc2', 'purple'], ['#f27aa5', 'pink'], ['#8b5e3c', 'brown'], ['#2f2c33', 'black'], ['#ffffff', 'white'],
  ].map(([color, say]) => ({ dot: color, say })) },
  { id: 'sweets', en: 'Sweets', pt: 'Doces', icon: '🍬', items: () => [
    ['🍬', 'candy'], ['🍭', 'lollipop'], ['🍪', 'cookie'], ['🧁', 'cupcake'], ['🍩', 'donut'], ['🍫', 'chocolate'],
    ['🍦', 'ice cream'], ['🎂', 'cake'],
  ].map(([emoji, say]) => ({ emoji, say })) },
  { id: 'stars', en: 'Stars', pt: 'Estrelas', icon: '⭐', items: () => [{ emoji: '⭐' }] },
];
const MZ_BUBBLE = ['#e5484d', '#f08a24', '#e0a800', '#3fae5a', '#3d7bd9', '#8e5fc2', '#f05d77', '#14a3a3'];
const MZ_PLAYER_COLORS = ['#3d7bd9', '#e5484d'];
const MZ_SETTINGS_KEY = 'ig_maze_settings';

// Twemoji images, loaded once per emoji and reused for every frame.
const MZ_IMAGES = {};
function mzImage(emoji) {
  if (!emoji) return null;
  if (!MZ_IMAGES[emoji]) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    if (typeof IG_TWEMOJI_BASE !== 'undefined' && typeof igEmojiCode === 'function') {
      img.src = `${IG_TWEMOJI_BASE}${igEmojiCode(emoji)}.svg`;
    }
    MZ_IMAGES[emoji] = img;
  }
  return MZ_IMAGES[emoji];
}

function mzSay(text) {
  if (!text || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

function mzLoadSettings() {
  const base = { players: 2, avatars: ['pacman', 'dino'], food: 'fruits', ghosts: 2, speak: true };
  try { return { ...base, ...(JSON.parse(localStorage.getItem(MZ_SETTINGS_KEY) || '{}') || {}) }; } catch (e) { return base; }
}
function mzSaveSettings(s) { try { localStorage.setItem(MZ_SETTINGS_KEY, JSON.stringify(s)); } catch (e) {} }

// The little picture of an avatar for the setup buttons and the score bar.
function mzAvatarHTML(id) {
  const a = MZ_AVATARS.find(x => x.id === id) || MZ_AVATARS[0];
  if (!a.emoji) return '<svg viewBox="0 0 40 40" class="mz-av-img" aria-hidden="true"><path d="M20,20 L36,10 A18,18 0 1,0 36,30 Z" fill="#ffd166" stroke="#2e2b2e" stroke-width="2"/><circle cx="22" cy="11" r="2.6" fill="#2e2b2e"/></svg>';
  return typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML(a.emoji, 'mz-av-img') : `<span class="mz-av-img">${a.emoji}</span>`;
}

function openMazeGame() {
  const settings = mzLoadSettings();
  let stopGame = null;

  openModal(`
    <div class="modal-content-pad mz">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">🟡</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Maze Muncher</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">Eat the food in the maze! · 1 or 2 players</span></p>
        </div>
      </div>
      <div id="mzMount"></div>
    </div>`, true);
  const mount = () => document.getElementById('mzMount');

  // ---- setup ---------------------------------------------------------------
  function setup() {
    if (stopGame) { stopGame(); stopGame = null; }
    const m = mount();
    if (!m) return;
    const avatarRow = p => `
      <div class="mz-row">
        <span class="mz-row-label" style="--pc:${MZ_PLAYER_COLORS[p]}">Player ${p + 1}</span>
        <div class="mz-opts">
          ${MZ_AVATARS.map(a => `
            <button type="button" class="mz-opt${settings.avatars[p] === a.id ? ' on' : ''}" data-av="${p}:${a.id}" style="--pc:${MZ_PLAYER_COLORS[p]}">
              ${mzAvatarHTML(a.id)}<small>${a.en}</small>
            </button>`).join('')}
        </div>
      </div>`;
    m.innerHTML = `
      <div class="mz-setup">
        <div class="mz-row">
          <span class="mz-row-label">Players</span>
          <div class="mz-opts">
            ${[1, 2].map(n => `<button type="button" class="mz-opt mz-opt--wide${settings.players === n ? ' on' : ''}" data-players="${n}">${n === 1 ? '🙋 1 player' : '🙋🙋 2 players'}</button>`).join('')}
          </div>
        </div>
        ${avatarRow(0)}
        ${settings.players === 2 ? avatarRow(1) : ''}
        <div class="mz-row">
          <span class="mz-row-label">Food</span>
          <div class="mz-opts">
            ${MZ_FOODS.map(f => `
              <button type="button" class="mz-opt${settings.food === f.id ? ' on' : ''}" data-food="${f.id}">
                ${typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML(f.icon, 'mz-av-img') : f.icon}<small>${f.en}</small><small class="mz-pt">${f.pt}</small>
              </button>`).join('')}
          </div>
        </div>
        <div class="mz-row">
          <span class="mz-row-label">Ghosts</span>
          <div class="mz-opts">
            ${[0, 2, 4].map(n => `<button type="button" class="mz-opt mz-opt--wide${settings.ghosts === n ? ' on' : ''}" data-ghosts="${n}">${n ? '👻'.repeat(n / 2) + ' ' + n : '🚫 none'}</button>`).join('')}
            <button type="button" class="mz-opt mz-opt--wide${settings.speak ? ' on' : ''}" data-speak>🔊 Say the words</button>
          </div>
        </div>
        <button type="button" class="btn btn-primary mz-start" data-start>▶ Start!</button>
        <p class="mz-keys">⌨️ ${settings.players === 2 ? '<b style="color:' + MZ_PLAYER_COLORS[0] + '">Player 1: W A S D</b> · <b style="color:' + MZ_PLAYER_COLORS[1] + '">Player 2: ← ↑ → ↓</b>' : 'Arrows or W A S D'} · 👆 or the buttons under the maze</p>
      </div>`;
    const repaint = () => { mzSaveSettings(settings); setup(); };
    m.querySelectorAll('[data-players]').forEach(b => b.addEventListener('click', () => { settings.players = Number(b.dataset.players); repaint(); }));
    m.querySelectorAll('[data-av]').forEach(b => b.addEventListener('click', () => {
      const [p, id] = b.dataset.av.split(':');
      settings.avatars[Number(p)] = id;
      mzSay((MZ_AVATARS.find(a => a.id === id) || {}).en);
      repaint();
    }));
    m.querySelectorAll('[data-food]').forEach(b => b.addEventListener('click', () => { settings.food = b.dataset.food; repaint(); }));
    m.querySelectorAll('[data-ghosts]').forEach(b => b.addEventListener('click', () => { settings.ghosts = Number(b.dataset.ghosts); repaint(); }));
    m.querySelector('[data-speak]').addEventListener('click', () => { settings.speak = !settings.speak; repaint(); });
    m.querySelector('[data-start]').addEventListener('click', () => { mzSaveSettings(settings); play(); });
  }

  // ---- the game --------------------------------------------------------------
  function play() {
    const m = mount();
    if (!m) return;
    const ROWS = MZ_MAP.length, COLS = MZ_MAP[0].length;
    const wall = (x, y) => !MZ_MAP[y] || !MZ_MAP[y][x] || MZ_MAP[y][x] === '#';
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
    const find = ch => { for (let y = 0; y < ROWS; y++) { const x = MZ_MAP[y].indexOf(ch); if (x >= 0) return [x, y]; } return null; };
    const two = settings.players === 2;
    const food = MZ_FOODS.find(f => f.id === settings.food) || MZ_FOODS[0];

    // Food on every open cell except the starts and the ghost house; word
    // foods are fewer and bigger, so each one can be seen and heard.
    const cells = [];
    MZ_MAP.forEach((row, y) => [...row].forEach((c, x) => { if (c === '.') cells.push([x, y]); }));
    const isWordFood = food.id !== 'coins' && food.id !== 'stars';
    const shuffled = cells.slice().sort(() => Math.random() - 0.5);
    const placed = isWordFood ? shuffled.slice(0, two ? 46 : 36) : cells;
    const pool = food.items();
    const items = new Map();
    let order = pool.slice().sort(() => Math.random() - 0.5);
    placed.forEach((c, i) => {
      if (food.id === 'letters') order = pool;      // letters go round A to Z
      items.set(c.join(','), order[i % order.length]);
    });
    pool.forEach(it => { if (it.emoji) mzImage(it.emoji); });

    const mkPlayer = (i, start) => ({
      i, color: MZ_PLAYER_COLORS[i], avatar: MZ_AVATARS.find(a => a.id === settings.avatars[i]) || MZ_AVATARS[0],
      start, cell: start.slice(), to: start.slice(), t: 0, dir: null, want: null, face: i ? 'left' : 'right',
      score: 0, hurt: 0, speed: 4.6,
    });
    const players = [mkPlayer(0, find('1'))];
    if (two) players.push(mkPlayer(1, find('2')));
    else players[0].start = players[0].cell = players[0].to = find('1');
    players.forEach(p => { if (p.avatar.emoji) mzImage(p.avatar.emoji); });
    mzImage('👻');

    const ghostStart = find('G');
    const GHOST_TINTS = ['#ff8fb1', '#7fd3ff', '#ffb347', '#b39ddb'];
    const ghosts = Array.from({ length: settings.ghosts }, (_, i) => ({
      cell: ghostStart.slice(), to: ghostStart.slice(), t: 0, dir: ['left', 'right', 'up', 'down'][i % 4],
      speed: 2.9 + (i % 2) * 0.3, tint: GHOST_TINTS[i % 4], wait: 1.5 + i * 1.2,
    }));

    m.innerHTML = `
      <div class="mz-game">
        <div class="mz-scores">
          ${players.map(p => `
            <span class="mz-score" style="--pc:${p.color}">${mzAvatarHTML(p.avatar.id)}<b data-score="${p.i}">0</b></span>`).join('')}
          <span class="mz-left" data-left></span>
          <button type="button" class="game-btn secondary" data-menu>⚙️ Menu</button>
        </div>
        <div class="mz-said" data-said aria-live="polite"></div>
        <canvas class="mz-canvas" data-canvas></canvas>
        <div class="mz-pads${two ? ' two' : ''}">
          ${players.map(p => `
            <div class="mz-pad" style="--pc:${p.color}" aria-label="Player ${p.i + 1}">
              <button type="button" data-pad="${p.i}:up" class="mz-pad-up" aria-label="up">▲</button>
              <button type="button" data-pad="${p.i}:left" class="mz-pad-left" aria-label="left">◀</button>
              <span class="mz-pad-mid">${mzAvatarHTML(p.avatar.id)}</span>
              <button type="button" data-pad="${p.i}:right" class="mz-pad-right" aria-label="right">▶</button>
              <button type="button" data-pad="${p.i}:down" class="mz-pad-down" aria-label="down">▼</button>
            </div>`).join('')}
        </div>
      </div>`;

    const canvas = m.querySelector('[data-canvas]');
    const ctx = canvas.getContext('2d');
    let cell = 30;
    function fit() {
      const w = Math.min(m.clientWidth || 600, 900);
      const room = Math.max(260, window.innerHeight - (two ? 330 : 300));
      cell = Math.max(14, Math.floor(Math.min(w / COLS, room / ROWS)));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = COLS * cell * dpr; canvas.height = ROWS * cell * dpr;
      canvas.style.width = `${COLS * cell}px`; canvas.style.height = `${ROWS * cell}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();

    // ---- controls ----------------------------------------------------------
    const steer = (p, d) => {
      if (!p) return;
      p.want = d;
      // Turning back can happen at once, in the middle of a corridor.
      if (p.dir && d === OPP[p.dir] && p.t > 0) {
        [p.cell, p.to] = [p.to, p.cell]; p.t = 1 - p.t; p.dir = d;
      }
    };
    const KEYS1 = { w: 'up', a: 'left', s: 'down', d: 'right' };
    const KEYS2 = { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' };
    const onKey = e => {
      if (e.target.matches && e.target.matches('input, textarea, select')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (KEYS1[k]) { e.preventDefault(); steer(players[0], KEYS1[k]); }
      else if (KEYS2[k]) { e.preventDefault(); steer(two ? players[1] : players[0], KEYS2[k]); }
    };
    window.addEventListener('keydown', onKey);
    m.querySelectorAll('[data-pad]').forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault();
      const [i, d] = b.dataset.pad.split(':');
      steer(players[Number(i)], d);
    }));
    // A swipe on the maze steers the player nearer to where it began.
    let swipe = null;
    canvas.addEventListener('pointerdown', e => { swipe = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => {
      if (!swipe) return;
      const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      const r = canvas.getBoundingClientRect();
      const fx = (swipe.x - r.left) / cell, fy = (swipe.y - r.top) / cell;
      swipe = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      const near = players.slice().sort((a, b) => Math.hypot(pos(a)[0] - fx, pos(a)[1] - fy) - Math.hypot(pos(b)[0] - fx, pos(b)[1] - fy))[0];
      steer(near, d);
    });

    // ---- movement: cell to cell, choosing at each cell ---------------------
    const pos = e => [e.cell[0] + (e.to[0] - e.cell[0]) * e.t + 0.5, e.cell[1] + (e.to[1] - e.cell[1]) * e.t + 0.5];
    const canGo = (c, d) => d && !wall(c[0] + DIRS[d][0], c[1] + DIRS[d][1]);
    function stepEntity(e, dt, choose) {
      if (e.to[0] === e.cell[0] && e.to[1] === e.cell[1]) {
        const d = choose(e);
        if (!d) return false;
        e.dir = d; e.to = [e.cell[0] + DIRS[d][0], e.cell[1] + DIRS[d][1]]; e.t = 0;
      }
      e.t += e.speed * dt;
      if (e.t >= 1) {
        const over = e.t - 1;
        e.cell = e.to.slice(); e.t = 0;
        const d = choose(e);
        if (d) { e.dir = d; e.to = [e.cell[0] + DIRS[d][0], e.cell[1] + DIRS[d][1]]; e.t = Math.min(over, 0.9); }
        return true;   // arrived on a new cell
      }
      return false;
    }
    const choosePlayer = p => {
      if (canGo(p.cell, p.want)) return p.want;
      if (canGo(p.cell, p.dir)) return p.dir;
      return null;
    };
    const chooseGhost = g => {
      const opts = Object.keys(DIRS).filter(d => canGo(g.cell, d) && d !== OPP[g.dir]);
      const all = opts.length ? opts : Object.keys(DIRS).filter(d => canGo(g.cell, d));
      // Now and then a ghost heads for the nearest player; mostly it wanders.
      if (Math.random() < 0.35 && players.length) {
        const target = players.slice().sort((a, b) => Math.hypot(a.cell[0] - g.cell[0], a.cell[1] - g.cell[1]) - Math.hypot(b.cell[0] - g.cell[0], b.cell[1] - g.cell[1]))[0].cell;
        all.sort((a, b) => Math.hypot(g.cell[0] + DIRS[a][0] - target[0], g.cell[1] + DIRS[a][1] - target[1]) - Math.hypot(g.cell[0] + DIRS[b][0] - target[0], g.cell[1] + DIRS[b][1] - target[1]));
        return all[0];
      }
      return all[Math.floor(Math.random() * all.length)];
    };

    let left = items.size;
    const saidEl = m.querySelector('[data-said]');
    const leftEl = m.querySelector('[data-left]');
    const paintLeft = () => { leftEl.textContent = `${left} left`; };
    paintLeft();

    function eat(p) {
      const key = p.cell.join(',');
      const it = items.get(key);
      if (!it) return;
      items.delete(key);
      left--; p.score++;
      m.querySelector(`[data-score="${p.i}"]`).textContent = p.score;
      paintLeft();
      if (typeof IGSound !== 'undefined') IGSound.pop && IGSound.pop();
      const word = it.letter || it.say;
      if (word && settings.speak) {
        if (it.letter && typeof abLetter === 'function' && typeof AB_LETTERS !== 'undefined') {
          const l = AB_LETTERS.find(x => x.letter === it.letter);
          if (l) abLetter(l); else mzSay(word);
        } else mzSay(word);
      }
      if (word) {
        saidEl.innerHTML = `<span style="color:${p.color}">${it.emoji && typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML(it.emoji, 'mz-said-img') : ''}${igEscapeHtml(it.letter || it.text || word)}</span>`;
        saidEl.classList.remove('pop'); void saidEl.offsetWidth; saidEl.classList.add('pop');
      }
      if (!left) finish();
    }

    function hurt(p) {
      p.hurt = 2;   // seconds of blinking, safe from ghosts
      p.cell = p.start.slice(); p.to = p.start.slice(); p.t = 0; p.dir = null; p.want = null;
      if (typeof IGSound !== 'undefined') IGSound.wrong && IGSound.wrong();
    }

    // ---- drawing -------------------------------------------------------------
    const WALL = '#5b7fd6', WALL_IN = '#2a3f7a', FLOOR = '#101a3a';
    function drawMaze() {
      ctx.fillStyle = FLOOR; ctx.fillRect(0, 0, COLS * cell, ROWS * cell);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (!wall(x, y)) continue;
        const r = cell * 0.28, pad = cell * 0.08;
        ctx.fillStyle = WALL_IN;
        ctx.fillRect(x * cell, y * cell, cell, cell);
        ctx.fillStyle = WALL;
        // Joined blocks: round only the corners that face a corridor.
        const nx = x * cell + (wall(x - 1, y) ? 0 : pad), ny = y * cell + (wall(x, y - 1) ? 0 : pad);
        const nw = cell - (wall(x - 1, y) ? 0 : pad) - (wall(x + 1, y) ? 0 : pad);
        const nh = cell - (wall(x, y - 1) ? 0 : pad) - (wall(x, y + 1) ? 0 : pad);
        // A corner is round only where both of its sides face a corridor.
        const L = wall(x - 1, y), R = wall(x + 1, y), U = wall(x, y - 1), D = wall(x, y + 1);
        const radii = [!L && !U ? r : 0, !R && !U ? r : 0, !R && !D ? r : 0, !L && !D ? r : 0];
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(nx, ny, nw, nh, radii); else ctx.rect(nx, ny, nw, nh);
        ctx.fill();
      }
    }
    function drawItem(it, x, y, now) {
      const cx = (x + 0.5) * cell, cy = (y + 0.5) * cell;
      const bob = Math.sin(now / 300 + x + y) * cell * 0.04;
      if (it.emoji) {
        const s = cell * (food.id === 'coins' || food.id === 'stars' ? 0.5 : 0.78);
        const img = mzImage(it.emoji);
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img, cx - s / 2, cy - s / 2 + bob, s, s);
        else { ctx.font = `${s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.emoji, cx, cy + bob); }
      } else if (it.dot) {
        ctx.beginPath(); ctx.arc(cx, cy + bob, cell * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = it.dot; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(cx, cy + bob, cell * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = it.color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `900 ${cell * (it.text.length > 1 ? 0.42 : 0.52)}px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.text, cx, cy + bob + cell * 0.03);
      }
    }
    function drawPlayer(p, now) {
      if (p.hurt > 0 && Math.floor(now / 120) % 2) return;   // blinking
      const [fx, fy] = pos(p);
      const cx = fx * cell, cy = fy * cell, s = cell * 0.92;
      // A ring in the player's colour says who is who.
      ctx.beginPath(); ctx.arc(cx, cy, cell * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = p.color + '55'; ctx.fill();
      if (!p.avatar.emoji) {
        const moving = p.dir && (p.to[0] !== p.cell[0] || p.to[1] !== p.cell[1]);
        const open = moving ? (Math.sin(now / 70) + 1) / 2 * 0.7 + 0.05 : 0.35;
        const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[p.dir || p.face] || 0;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, s * 0.45, ang + open, ang + Math.PI * 2 - open);
        ctx.closePath(); ctx.fillStyle = '#ffd166'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#2e2b2e'; ctx.stroke();
        return;
      }
      const img = mzImage(p.avatar.emoji);
      const flip = (p.dir || p.face) === 'left';
      const bounce = Math.abs(Math.sin(now / 110)) * cell * 0.06;
      ctx.save(); ctx.translate(cx, cy - bounce); if (flip) ctx.scale(-1, 1);
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -s / 2, -s / 2, s, s);
      else { ctx.font = `${s * 0.85}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.avatar.emoji, 0, 0); }
      ctx.restore();
    }
    function drawGhost(g, now) {
      const [fx, fy] = pos(g);
      const cx = fx * cell, cy = fy * cell, s = cell * 0.86;
      ctx.beginPath(); ctx.arc(cx, cy, cell * 0.42, 0, Math.PI * 2); ctx.fillStyle = g.tint + '66'; ctx.fill();
      const img = mzImage('👻');
      const wob = Math.sin(now / 160 + g.speed * 10) * cell * 0.05;
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, cx - s / 2, cy - s / 2 + wob, s, s);
      else { ctx.font = `${s * 0.85}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👻', cx, cy + wob); }
    }

    // ---- the loop --------------------------------------------------------------
    let last = performance.now(), raf = 0, over = false, startDelay = 1.2;
    function frame(now) {
      if (!canvas.isConnected) { cleanup(); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!over && startDelay <= 0) {
        players.forEach(p => {
          if (p.hurt > 0) p.hurt -= dt;
          if (stepEntity(p, dt, choosePlayer)) eat(p);
          if (p.dir) p.face = p.dir === 'left' || p.dir === 'right' ? p.dir : p.face;
        });
        ghosts.forEach(g => {
          if (g.wait > 0) { g.wait -= dt; return; }
          stepEntity(g, dt, chooseGhost);
        });
        ghosts.forEach(g => players.forEach(p => {
          if (p.hurt > 0) return;
          const [a, b] = pos(g), [c, d] = pos(p);
          if (Math.hypot(a - c, b - d) < 0.62) hurt(p);
        }));
      } else if (startDelay > 0) startDelay -= dt;
      drawMaze();
      items.forEach((it, key) => { const [x, y] = key.split(',').map(Number); drawItem(it, x, y, now); });
      ghosts.forEach(g => drawGhost(g, now));
      players.forEach(p => drawPlayer(p, now));
      if (startDelay > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, COLS * cell, ROWS * cell);
        ctx.fillStyle = '#fff'; ctx.font = `900 ${cell * 2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Ready?', COLS * cell / 2, ROWS * cell / 2);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    if (settings.speak) mzSay(`Let's eat the ${food.en.toLowerCase()}!`);

    function finish() {
      over = true;
      if (typeof IGSound !== 'undefined') IGSound.win && IGSound.win();
      const best = Math.max(...players.map(p => p.score));
      const winners = players.filter(p => p.score === best);
      const title = !two ? 'Great job! 🎉' : winners.length > 1 ? "It's a tie! 🤝" : `Player ${winners[0].i + 1} wins! 🏆`;
      if (typeof awardProgress === 'function' && !two) awardProgress(Math.min(30, players[0].score), 1);
      setTimeout(() => {
        const box = mount();
        if (!box) return;
        const end = document.createElement('div');
        end.className = 'mz-end';
        end.innerHTML = `
          <div class="mz-end-card">
            <p class="mz-end-title">${title}</p>
            <div class="mz-end-scores">
              ${players.map(p => `<span class="mz-score big${winners.includes(p) && two ? ' win' : ''}" style="--pc:${p.color}">${mzAvatarHTML(p.avatar.id)}<b>${p.score}</b></span>`).join('')}
            </div>
            <div class="an-done-actions">
              <button type="button" class="btn btn-primary" data-again>🔄 Play again</button>
              <button type="button" class="game-btn secondary" data-menu2>⚙️ Menu</button>
            </div>
          </div>`;
        box.querySelector('.mz-game').appendChild(end);
        if (typeof confettiBurst === 'function') { const r = canvas.getBoundingClientRect(); confettiBurst(r.left + r.width / 2, r.top + r.height / 3); }
        mzSay(title.replace(/[^\w\s!']/g, ''));
        end.querySelector('[data-again]').addEventListener('click', play);
        end.querySelector('[data-menu2]').addEventListener('click', setup);
      }, 500);
    }

    m.querySelector('[data-menu]').addEventListener('click', setup);
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    function cleanup() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    }
    if (stopGame) stopGame();
    stopGame = cleanup;
  }

  setup();
}
