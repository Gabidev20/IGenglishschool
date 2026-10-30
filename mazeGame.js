/* ==========================================================================
   IGenglishschool — Maze Muncher (a Pac-Man for the class)
   --------------------------------------------------------------------------
   One or two players run through a maze eating the food the teacher chose:
   coins, fruits, vegetables, school objects, letters, numbers, colors,
   sweets. Every word
   food is spoken when it is eaten ("banana!", "B!", "seven!"), so the game
   is vocabulary practice disguised as a race.

     • avatars: dinosaur, monkey, butterfly, Pac-Man, frog — each player picks
     • 2 players at once on one screen: Player 1 = W A S D, Player 2 = arrows,
       and a touch pad for each one under the maze (tablets, the class TV)
     • spiders (0, 2 or 4): a touch costs one of 5 lives and sends the player
       back to start; ⏸ pauses everything (P or space)
     • online (Zoom): each student opens #jogo=maze&sala=CODE on their own
       computer, sees the maze live and steers with their own arrow keys
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
  { id: 'dino', en: 'Dinosaur', emoji: '🦖', side: 'left' },   // the picture looks left
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
  // School objects: the same drawings as the Backpack game (schoolObjects.js).
  { id: 'school', en: 'School objects', pt: 'Material escolar', icon: '🎒', items: () =>
    (typeof SCHOOL_OBJECTS_TOPIC !== 'undefined' && SCHOOL_OBJECTS_TOPIC.words.length
      ? SCHOOL_OBJECTS_TOPIC.words.map(w => ({ src: w.image, say: String(w.en).toLowerCase() }))
      : [['✏️', 'pencil'], ['🖊️', 'pen'], ['📕', 'book'], ['📓', 'notebook'], ['📏', 'ruler'], ['✂️', 'scissors'],
        ['🖍️', 'crayon'], ['🖌️', 'paint brush'], ['🎒', 'backpack']].map(([emoji, say]) => ({ emoji, say }))) },
  { id: 'stars', en: 'Stars', pt: 'Estrelas', icon: '⭐', items: () => [{ emoji: '⭐' }] },
];
const MZ_BUBBLE = ['#e5484d', '#f08a24', '#e0a800', '#3fae5a', '#3d7bd9', '#8e5fc2', '#f05d77', '#14a3a3'];
const MZ_PLAYER_COLORS = ['#3d7bd9', '#e5484d'];
const MZ_SETTINGS_KEY = 'ig_maze_settings';

// Images, loaded once and reused for every frame: an emoji (from Twemoji)
// or a picture's own address (the school objects' drawings).
const MZ_IMAGES = {};
function mzImage(emoji) {
  if (!emoji) return null;
  if (!MZ_IMAGES[emoji]) {
    const img = new Image();
    if (/^(data:|https?:|\/)/.test(emoji)) img.src = emoji;
    else if (typeof IG_TWEMOJI_BASE !== 'undefined' && typeof igEmojiCode === 'function') {
      img.crossOrigin = 'anonymous';
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

// Pac-Man himself: the game's icon everywhere (student tile, menus, Game
// Maker) and Player's avatar.
function mzPacIcon(cls) {
  return `<svg viewBox="0 0 40 40" class="${cls || 'mz-av-img'}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <path d="M20,20 L37,11 A19,19 0 1,0 37,29 Z" fill="#ffd400" stroke="#2e2b2e" stroke-width="2" stroke-linejoin="round"/>
    <path d="M9,13 A14,14 0 0,1 17,7" fill="none" stroke="#fff6b0" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="21" cy="11" r="2.8" fill="#2e2b2e"/></svg>`;
}

// The little picture of an avatar for the setup buttons and the score bar.
function mzAvatarHTML(id) {
  const a = MZ_AVATARS.find(x => x.id === id) || MZ_AVATARS[0];
  if (!a.emoji) return mzPacIcon('mz-av-img');
  return typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML(a.emoji, 'mz-av-img') : `<span class="mz-av-img">${a.emoji}</span>`;
}

// ===========================================================================
// THE MAZE ON SCREEN — shared by the teacher's game and the student's copy.
// `view` = { items: Map('x,y' -> item), players: [{ fx, fy, color, avatar,
// dir, face, moving, blink }], spiders: [{ fx, fy, tint, seed }], ready }
// ===========================================================================
const MZ_ROWS = MZ_MAP.length, MZ_COLS = MZ_MAP[0].length;
const mzWall = (x, y) => !MZ_MAP[y] || !MZ_MAP[y][x] || MZ_MAP[y][x] === '#';
const mzFind = ch => { for (let y = 0; y < MZ_ROWS; y++) { const x = MZ_MAP[y].indexOf(ch); if (x >= 0) return [x, y]; } return null; };
const MZ_DIR_LIST = ['up', 'down', 'left', 'right'];
const MZ_SPIDER_TINTS = ['#ff8fb1', '#7fd3ff', '#ffb347', '#b39ddb'];
const MZ_LIVES = 5;
// ❤️❤️❤️🤍🤍 — the lives left, as hearts.
const mzHearts = n => '❤️'.repeat(Math.max(0, n)) + '🤍'.repeat(Math.max(0, MZ_LIVES - n));

function mzRenderer(canvas, food) {
  const ctx = canvas.getContext('2d');
  let cell = 30;
  const COLS = MZ_COLS, ROWS = MZ_ROWS, wall = mzWall;

  function fit(spare) {
    const box = canvas.parentElement;
    const w = Math.min((box && box.clientWidth) || 600, 900);
    const room = Math.max(240, window.innerHeight - spare);
    cell = Math.max(14, Math.floor(Math.min(w / COLS, room / ROWS)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = COLS * cell * dpr; canvas.height = ROWS * cell * dpr;
    canvas.style.width = `${COLS * cell}px`; canvas.style.height = `${ROWS * cell}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // The walls never change: drawn once, then copied every frame.
  let mazeLayer = null, mazeCell = 0;
  function drawMaze() {
    if (!mazeLayer || mazeCell !== cell) {
      mazeLayer = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      mazeLayer.width = COLS * cell * dpr; mazeLayer.height = ROWS * cell * dpr;
      const c = mazeLayer.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = '#101a3a'; c.fillRect(0, 0, COLS * cell, ROWS * cell);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (!wall(x, y)) continue;
        const r = cell * 0.28, pad = cell * 0.08;
        c.fillStyle = '#2a3f7a'; c.fillRect(x * cell, y * cell, cell, cell);
        c.fillStyle = '#5b7fd6';
        const L = wall(x - 1, y), R = wall(x + 1, y), U = wall(x, y - 1), D = wall(x, y + 1);
        const nx = x * cell + (L ? 0 : pad), ny = y * cell + (U ? 0 : pad);
        const nw = cell - (L ? 0 : pad) - (R ? 0 : pad), nh = cell - (U ? 0 : pad) - (D ? 0 : pad);
        // A corner is round only where both of its sides face a corridor.
        const radii = [!L && !U ? r : 0, !R && !U ? r : 0, !R && !D ? r : 0, !L && !D ? r : 0];
        c.beginPath();
        if (c.roundRect) c.roundRect(nx, ny, nw, nh, radii); else c.rect(nx, ny, nw, nh);
        c.fill();
      }
      mazeCell = cell;
    }
    ctx.drawImage(mazeLayer, 0, 0, COLS * cell, ROWS * cell);
  }

  function drawItem(it, x, y, now) {
    const cx = (x + 0.5) * cell, cy = (y + 0.5) * cell;
    const bob = Math.sin(now / 300 + x + y) * cell * 0.04;
    if (it.src) {
      const s = cell * 0.86;
      const img = mzImage(it.src);
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, cx - s / 2, cy - s / 2 + bob, s, s);
    } else if (it.emoji) {
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
      ctx.fillStyle = '#fff'; ctx.font = `900 ${cell * (it.text.length > 1 ? 0.42 : 0.52)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.text, cx, cy + bob + cell * 0.03);
    }
  }

  function drawPlayer(p, now) {
    if (p.blink && Math.floor(now / 120) % 2) return;
    const cx = p.fx * cell, cy = p.fy * cell, s = cell * 0.92;
    // A ring in the player's colour says who is who.
    ctx.beginPath(); ctx.arc(cx, cy, cell * 0.48, 0, Math.PI * 2);
    ctx.fillStyle = p.color + '55'; ctx.fill();
    if (!p.avatar.emoji) {
      const open = p.moving ? (Math.sin(now / 70) + 1) / 2 * 0.7 + 0.05 : 0.35;
      const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[p.dir || p.face] || 0;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, s * 0.45, ang + open, ang + Math.PI * 2 - open);
      ctx.closePath(); ctx.fillStyle = '#ffd400'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#2e2b2e'; ctx.stroke();
      return;
    }
    const img = mzImage(p.avatar.emoji);
    // Only a picture drawn in profile is turned to face the way it moves.
    const flip = p.avatar.side === 'left' && (p.dir === 'left' || p.dir === 'right' ? p.dir : p.face) === 'right';
    const bounce = p.moving ? Math.abs(Math.sin(now / 110)) * cell * 0.06 : 0;
    ctx.save(); ctx.translate(cx, cy - bounce); if (flip) ctx.scale(-1, 1);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -s / 2, -s / 2, s, s);
    else { ctx.font = `${s * 0.85}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.avatar.emoji, 0, 0); }
    ctx.restore();
  }

  function drawSpider(g, now) {
    const cx = g.fx * cell, cy = g.fy * cell, s = cell * 0.86;
    // A light disc with a coloured rim: a black spider shows on the dark floor.
    ctx.beginPath(); ctx.arc(cx, cy, cell * 0.46, 0, Math.PI * 2); ctx.fillStyle = '#fff4f8'; ctx.fill();
    ctx.lineWidth = Math.max(2, cell * 0.08); ctx.strokeStyle = g.tint; ctx.stroke();
    const img = mzImage('🕷️');
    const wob = Math.sin(now / 160 + g.seed * 10) * cell * 0.05;
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, cx - s / 2, cy - s / 2 + wob, s, s);
    else { ctx.font = `${s * 0.85}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🕷️', cx, cy + wob); }
  }

  function draw(view, now) {
    drawMaze();
    view.items.forEach((it, key) => { const [x, y] = key.split(',').map(Number); drawItem(it, x, y, now); });
    view.spiders.forEach(g => drawSpider(g, now));
    view.players.forEach(p => drawPlayer(p, now));
    if (view.message) {
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 0, COLS * cell, ROWS * cell);
      ctx.fillStyle = '#fff'; ctx.font = `900 ${cell * (view.message.length > 8 ? 1.2 : 2)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(view.message, COLS * cell / 2, ROWS * cell / 2);
    }
  }

  return { fit, draw, get cell() { return cell; } };
}

// What the voice and the big word under the scores do when food is eaten.
function mzAnnounce(it, color, saidEl, speak) {
  const word = it.letter || it.say;
  if (word && speak) {
    if (it.letter && typeof abLetter === 'function' && typeof AB_LETTERS !== 'undefined') {
      const l = AB_LETTERS.find(x => x.letter === it.letter);
      if (l) abLetter(l); else mzSay(word);
    } else mzSay(word);
  }
  if (word && saidEl) {
    const pic = it.src ? `<img class="mz-said-img" src="${it.src}" alt="">`
      : it.emoji && typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML(it.emoji, 'mz-said-img') : '';
    saidEl.innerHTML = `<span style="color:${color}">${pic}${igEscapeHtml(it.letter || it.text || word)}</span>`;
    saidEl.classList.remove('pop'); void saidEl.offsetWidth; saidEl.classList.add('pop');
  }
}

const mzPadHTML = (i, color, avatarId, big) => `
  <div class="mz-pad${big ? ' mz-pad--big' : ''}" style="--pc:${color}" aria-label="Player ${i + 1}">
    <button type="button" data-pad="${i}:up" class="mz-pad-up" aria-label="up">▲</button>
    <button type="button" data-pad="${i}:left" class="mz-pad-left" aria-label="left">◀</button>
    <span class="mz-pad-mid">${mzAvatarHTML(avatarId)}</span>
    <button type="button" data-pad="${i}:right" class="mz-pad-right" aria-label="right">▶</button>
    <button type="button" data-pad="${i}:down" class="mz-pad-down" aria-label="down">▼</button>
  </div>`;

// ===========================================================================
// ONLINE ROOM — the teacher's game is the "host"; each student opens
// #jogo=maze&sala=CODE on their own computer, sees the maze live and steers
// with their own arrow keys. Over Zoom's remote control only one person can
// move at a time and every key goes there and back as video; here a key
// press reaches the teacher's game straight away.
// Supabase Realtime broadcast: no table, nothing stored.
// ===========================================================================
const mzOnlineReady = () => typeof IGCloud !== 'undefined' && IGCloud.anonClient && window.IG_SUPABASE && window.IG_SUPABASE.url && window.IG_SUPABASE.anonKey;

function mzNewRoomCode() {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
}
const mzRoomLink = code => `${location.origin}${location.pathname}#jogo=maze&sala=${code}`;
function mzRoomInHash() {
  const m = /[#&]sala=([A-Za-z0-9]{3,8})/.exec(location.hash || '');
  return m ? m[1].toUpperCase() : null;
}

// One channel per room. send() waits until the channel is open.
async function mzOpenChannel(code, onStatus) {
  await IGCloud.anonClient();                       // loads the Supabase library
  const sb = window.supabase.createClient(window.IG_SUPABASE.url, window.IG_SUPABASE.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 30 } },
  });
  const ch = sb.channel(`igmaze-${code}`, { config: { broadcast: { self: false, ack: false } } });
  const handlers = {};
  let open = false;
  const queue = [];
  ch.on('broadcast', { event: '*' }, msg => { const h = handlers[msg.event]; if (h) h(msg.payload || {}); });
  ch.subscribe(status => {
    open = status === 'SUBSCRIBED';
    if (open) queue.splice(0).forEach(([e, p]) => ch.send({ type: 'broadcast', event: e, payload: p }));
    if (onStatus) onStatus(status);
  });
  return {
    on(event, fn) { handlers[event] = fn; },
    send(event, payload) {
      if (!open) { if (queue.length < 20) queue.push([event, payload]); return; }
      ch.send({ type: 'broadcast', event, payload }).catch(() => {});
    },
    close() { try { sb.removeChannel(ch); } catch (e) {} },
  };
}

function openMazeGame() {
  const code = mzRoomInHash();
  if (code) { openMazeGuest(code); return; }
  const settings = mzLoadSettings();
  let stopGame = null;
  // The online room lives as long as this window: created on demand.
  const room = { code: null, net: null, status: '', seen: {}, onHello: null, onSteer: null };

  openModal(`
    <div class="modal-content-pad mz">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">${mzPacIcon('mz-head-pac')}</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Maze Muncher</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">Eat the food in the maze! · 1 or 2 players</span></p>
        </div>
      </div>
      <div id="mzMount"></div>
    </div>`, true);
  const mount = () => document.getElementById('mzMount');

  // When the window closes, the room closes with it.
  const watch = setInterval(() => {
    if (mount()) return;
    clearInterval(watch);
    if (room.net) { room.net.send('bye', {}); room.net.close(); }
    if (stopGame) stopGame();
  }, 1500);

  async function openRoom() {
    if (room.net || !mzOnlineReady()) return;
    room.code = mzNewRoomCode();
    room.status = 'connecting';
    try {
      room.net = await mzOpenChannel(room.code, s => { room.status = s; paintRoom(); });
    } catch (e) { room.status = 'error'; room.net = null; console.error('maze room', e); }
    room.net && room.net.on('hello', p => { room.seen[p.p] = Date.now(); if (room.onHello) room.onHello(p); else room.net.send('wait', {}); paintRoom(); });
    room.net && room.net.on('steer', p => { room.seen[p.p] = Date.now(); if (room.onSteer) room.onSteer(p); });
    paintRoom();
  }

  // The little panel with the code and the link (setup screen and game bar).
  function roomHTML() {
    if (!mzOnlineReady()) return '';
    if (!room.code) {
      return `<button type="button" class="game-btn secondary mz-room-btn" data-room-open>🌐 Play online (Zoom) — each student on their own computer</button>`;
    }
    const ok = room.status === 'SUBSCRIBED';
    const who = [0, 1].map(i => room.seen[i] && Date.now() - room.seen[i] < 30000
      ? `<span class="mz-room-on" style="--pc:${MZ_PLAYER_COLORS[i]}">● Player ${i + 1} online</span>` : '').join('');
    return `
      <div class="mz-room">
        <span class="mz-room-code" title="Room code">🌐 ${room.code}</span>
        <input class="mz-room-link" readonly value="${igEscapeHtml(mzRoomLink(room.code))}" aria-label="Link for the students" />
        <button type="button" class="game-btn secondary" data-room-copy>📋 Copy link</button>
        <span class="mz-room-status">${ok ? '✅ open' : room.status === 'error' || room.status === 'CHANNEL_ERROR' ? '⚠️ no connection' : '⏳ opening…'}</span>
        ${who}
      </div>`;
  }
  function paintRoom() {
    document.querySelectorAll('[data-room-slot]').forEach(slot => { slot.innerHTML = roomHTML(); wireRoom(slot); });
  }
  function wireRoom(scope) {
    const openBtn = scope.querySelector('[data-room-open]');
    if (openBtn) openBtn.addEventListener('click', openRoom);
    const copy = scope.querySelector('[data-room-copy]');
    if (copy) copy.addEventListener('click', () => {
      const text = mzRoomLink(room.code);
      const done = () => { copy.textContent = '✅ Copied!'; setTimeout(() => { if (copy.isConnected) copy.textContent = '📋 Copy link'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt('Copy the link:', text));
      else prompt('Copy the link:', text);
    });
  }
  // Who is online fades after a while without news.
  const roomTick = setInterval(() => { if (!mount()) clearInterval(roomTick); else if (room.code) paintRoom(); }, 10000);

  // ---- setup ---------------------------------------------------------------
  function setup() {
    if (stopGame) { stopGame(); stopGame = null; }
    room.onHello = null; room.onSteer = null;
    if (room.net) room.net.send('wait', {});
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
          <span class="mz-row-label">Spiders</span>
          <div class="mz-opts">
            ${[0, 2, 4].map(n => `<button type="button" class="mz-opt mz-opt--wide${settings.ghosts === n ? ' on' : ''}" data-ghosts="${n}">${n ? (typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML('🕷️', 'mz-opt-spider') : '🕷️').repeat(n / 2) + ' ' + n : '🚫 none'}</button>`).join('')}
            <button type="button" class="mz-opt mz-opt--wide${settings.speak ? ' on' : ''}" data-speak>🔊 Say the words</button>
          </div>
        </div>
        <div class="mz-row mz-row--room">
          <span class="mz-row-label">Online</span>
          <div class="mz-opts" data-room-slot>${roomHTML()}</div>
        </div>
        ${settings.ghosts ? `<p class="mz-keys">❤️ ${MZ_LIVES} lives each — a spider takes one. ⏸ P or space = pause.</p>` : ''}
        <button type="button" class="btn btn-primary mz-start" data-start>▶ Start!</button>
        <p class="mz-keys">⌨️ ${settings.players === 2 ? '<b style="color:' + MZ_PLAYER_COLORS[0] + '">Player 1: W A S D</b> · <b style="color:' + MZ_PLAYER_COLORS[1] + '">Player 2: ← ↑ → ↓</b>' : 'Arrows or W A S D'} · 👆 or the buttons under the maze</p>
        ${mzOnlineReady() ? `<p class="mz-keys">🎒 Student with a room code? <input class="mz-join-code" maxlength="6" placeholder="CODE" aria-label="Room code" /> <button type="button" class="game-btn secondary" data-join>Join</button></p>` : ''}
      </div>`;
    wireRoom(m);
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
    const join = m.querySelector('[data-join]');
    if (join) join.addEventListener('click', () => {
      const c = (m.querySelector('.mz-join-code').value || '').trim().toUpperCase();
      if (c.length >= 3) openMazeGuest(c);
    });
  }

  // ---- the game (on the teacher's computer: the one true game) -------------
  function play() {
    const m = mount();
    if (!m) return;
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
    const wall = mzWall;
    const two = settings.players === 2;
    const food = MZ_FOODS.find(f => f.id === settings.food) || MZ_FOODS[0];

    // Food on every open cell except the starts and the spiders' house; word
    // foods are fewer and bigger, so each one can be seen and heard.
    const cells = [];
    MZ_MAP.forEach((row, y) => [...row].forEach((c, x) => { if (c === '.') cells.push([x, y]); }));
    const isWordFood = food.id !== 'coins' && food.id !== 'stars';
    const shuffled = cells.slice().sort(() => Math.random() - 0.5);
    const placed = isWordFood ? shuffled.slice(0, two ? 46 : 36) : cells;
    const pool = food.items();
    const items = new Map();       // 'x,y' -> index in pool
    const order = pool.map((_, i) => i).sort(() => Math.random() - 0.5);
    placed.forEach((c, i) => items.set(c.join(','), food.id === 'letters' ? i % pool.length : order[i % order.length]));
    pool.forEach(it => { if (it.emoji || it.src) mzImage(it.emoji || it.src); });

    const mkPlayer = (i, start) => ({
      i, color: MZ_PLAYER_COLORS[i], avatar: MZ_AVATARS.find(a => a.id === settings.avatars[i]) || MZ_AVATARS[0],
      start, cell: start.slice(), to: start.slice(), t: 0, dir: null, want: null, face: i ? 'left' : 'right',
      score: 0, hurt: 0, speed: 4.6, lives: MZ_LIVES, out: false,
    });
    const players = [mkPlayer(0, mzFind('1'))];
    if (two) players.push(mkPlayer(1, mzFind('2')));
    players.forEach(p => { if (p.avatar.emoji) mzImage(p.avatar.emoji); });
    mzImage('🕷️');

    const spiderStart = mzFind('G');
    const spiders = Array.from({ length: settings.ghosts }, (_, i) => ({
      cell: spiderStart.slice(), to: spiderStart.slice(), t: 0, dir: ['left', 'right', 'up', 'down'][i % 4],
      speed: 2.9 + (i % 2) * 0.3, tint: MZ_SPIDER_TINTS[i % 4], wait: 1.5 + i * 1.2, seed: i,
    }));

    m.innerHTML = `
      <div class="mz-game">
        <div class="mz-scores">
          ${players.map(p => `
            <span class="mz-score" style="--pc:${p.color}">${mzAvatarHTML(p.avatar.id)}<b data-score="${p.i}">0</b>${spiders.length ? `<span class="mz-hearts" data-hearts="${p.i}">${mzHearts(p.lives)}</span>` : ''}</span>`).join('')}
          <span class="mz-left" data-left></span>
          <button type="button" class="game-btn secondary" data-pause title="Pause (P or space)">⏸ Pause</button>
          <button type="button" class="game-btn secondary" data-menu>⚙️ Menu</button>
        </div>
        ${room.code ? `<div class="mz-roombar" data-room-slot>${roomHTML()}</div>` : ''}
        <div class="mz-said" data-said aria-live="polite"></div>
        <canvas class="mz-canvas" data-canvas></canvas>
        <div class="mz-pads${two ? ' two' : ''}">
          ${players.map(p => mzPadHTML(p.i, p.color, p.avatar.id)).join('')}
        </div>
      </div>`;
    wireRoom(m);

    const canvas = m.querySelector('[data-canvas]');
    const screen = mzRenderer(canvas, food);
    const spare = room.code ? 370 : two ? 330 : 300;
    screen.fit(spare);

    // ---- controls ----------------------------------------------------------
    const steer = (p, d) => {
      if (!p || p.out || !DIRS[d]) return;
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
      if (k === 'p' || k === ' ') { e.preventDefault(); togglePause(); return; }
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
      const fx = (swipe.x - r.left) / screen.cell, fy = (swipe.y - r.top) / screen.cell;
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
    const chooseSpider = g => {
      const opts = Object.keys(DIRS).filter(d => canGo(g.cell, d) && d !== OPP[g.dir]);
      const all = opts.length ? opts : Object.keys(DIRS).filter(d => canGo(g.cell, d));
      // Now and then a spider heads for the nearest player; mostly it wanders.
      if (Math.random() < 0.35 && players.length) {
        const target = players.slice().sort((a, b) => Math.hypot(a.cell[0] - g.cell[0], a.cell[1] - g.cell[1]) - Math.hypot(b.cell[0] - g.cell[0], b.cell[1] - g.cell[1]))[0].cell;
        all.sort((a, b) => Math.hypot(g.cell[0] + DIRS[a][0] - target[0], g.cell[1] + DIRS[a][1] - target[1]) - Math.hypot(g.cell[0] + DIRS[b][0] - target[0], g.cell[1] + DIRS[b][1] - target[1]));
        return all[0];
      }
      return all[Math.floor(Math.random() * all.length)];
    };

    let over = false, startDelay = 1.2;
    const saidEl = m.querySelector('[data-said]');
    const leftEl = m.querySelector('[data-left]');
    const paintLeft = () => { leftEl.textContent = `${items.size} left`; };
    paintLeft();

    // ---- the online room: what the students' copies need -------------------
    const net = room.net;
    const setupMsg = () => ({
      food: food.id, speak: settings.speak, items: [...items.entries()],
      players: players.map(p => ({ avatar: p.avatar.id, score: p.score })),
      spiders: spiders.length,
    });
    if (net) {
      net.send('setup', setupMsg());
      room.onHello = () => net.send('setup', setupMsg());
      room.onSteer = p => steer(players[Number(p.p)], p.d);
    }
    const r2 = v => Math.round(v * 100) / 100;
    const stateMsg = () => ({
      p: players.map(p => { const [x, y] = pos(p); return [r2(x), r2(y), MZ_DIR_LIST.indexOf(p.dir), p.face === 'left' ? 1 : 0, p.to[0] !== p.cell[0] || p.to[1] !== p.cell[1] ? 1 : 0, p.score, p.hurt > 0 ? 1 : 0, p.lives, p.out ? 1 : 0]; }),
      g: spiders.map(g => { const [x, y] = pos(g); return [r2(x), r2(y)]; }),
      n: items.size, r: startDelay > 0 ? 1 : paused ? 2 : 0,
    });
    // Eight updates a second: smooth on the students' side, light on the network.
    const sync = net ? setInterval(() => { if (!over) net.send('s', stateMsg()); }, 125) : null;

    function eat(p) {
      const key = p.cell.join(',');
      if (!items.has(key)) return;
      const it = pool[items.get(key)];
      items.delete(key);
      p.score++;
      m.querySelector(`[data-score="${p.i}"]`).textContent = p.score;
      paintLeft();
      if (typeof IGSound !== 'undefined') IGSound.pop && IGSound.pop();
      mzAnnounce(it, p.color, saidEl, settings.speak);
      if (net) net.send('e', { k: key, p: p.i });
      if (!items.size) finish();
    }

    // A spider: one life less and back to the start. No lives left = out
    // of this game (the other player goes on).
    function hurt(p) {
      p.lives--;
      const hearts = m.querySelector(`[data-hearts="${p.i}"]`);
      if (hearts) hearts.textContent = mzHearts(p.lives);
      if (typeof IGSound !== 'undefined') IGSound.wrong && IGSound.wrong();
      p.cell = p.start.slice(); p.to = p.start.slice(); p.t = 0; p.dir = null; p.want = null;
      if (p.lives <= 0) {
        p.out = true;
        if (settings.speak) mzSay(two ? `Player ${p.i + 1} is out!` : 'Game over!');
        if (players.every(x => x.out)) finish();
        return;
      }
      p.hurt = 2;   // seconds of blinking, safe from spiders
    }

    // Pause: everything stops (on the students' screens too).
    let paused = false;
    function togglePause() {
      if (over) return;
      paused = !paused;
      const b = m.querySelector('[data-pause]');
      if (b) b.textContent = paused ? '▶ Play' : '⏸ Pause';
      if (net) net.send('s', stateMsg());
    }
    m.querySelector('[data-pause]').addEventListener('click', togglePause);

    // ---- the loop --------------------------------------------------------------
    // The game runs on its own clock, not on the drawing: a browser stops
    // drawing a window that is covered (Zoom on top of it, for instance),
    // and the game — and the students playing from home — must not stop.
    let last = performance.now(), raf = 0;
    const itemView = new Map();
    function tick() {
      if (!canvas.isConnected) { cleanup(); return; }
      const now = performance.now();
      let left = Math.min(0.5, (now - last) / 1000); last = now;
      while (left > 0) { const dt = Math.min(0.05, left); left -= dt; simulate(dt); }
    }
    function simulate(dt) {
      if (!over && !paused && startDelay <= 0) {
        players.forEach(p => {
          if (p.out) return;
          if (p.hurt > 0) p.hurt -= dt;
          if (stepEntity(p, dt, choosePlayer)) eat(p);
          if (p.dir === 'left' || p.dir === 'right') p.face = p.dir;
        });
        spiders.forEach(g => {
          if (g.wait > 0) { g.wait -= dt; return; }
          stepEntity(g, dt, chooseSpider);
        });
        spiders.forEach(g => players.forEach(p => {
          if (p.out || p.hurt > 0 || over) return;
          const [a, b] = pos(g), [c, d] = pos(p);
          if (Math.hypot(a - c, b - d) < 0.62) hurt(p);
        }));
      } else if (startDelay > 0) startDelay -= dt;
    }
    const clock = setInterval(tick, 1000 / 60);
    function frame(now) {
      if (!canvas.isConnected) { cleanup(); return; }
      itemView.clear();
      items.forEach((pi, key) => itemView.set(key, pool[pi]));
      screen.draw({
        items: itemView,
        players: players.filter(p => !p.out).map(p => {
          const [fx, fy] = pos(p);
          return { fx, fy, color: p.color, avatar: p.avatar, dir: p.dir, face: p.face,
            moving: p.dir && (p.to[0] !== p.cell[0] || p.to[1] !== p.cell[1]), blink: p.hurt > 0 };
        }),
        spiders: spiders.map(g => { const [fx, fy] = pos(g); return { fx, fy, tint: g.tint, seed: g.seed }; }),
        message: startDelay > 0 ? 'Ready?' : paused ? 'Paused' : '',
      }, now);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    if (settings.speak) mzSay(`Let's eat the ${food.en.toLowerCase()}!`);

    function finish() {
      over = true;
      if (typeof IGSound !== 'undefined') IGSound.win && IGSound.win();
      const best = Math.max(...players.map(p => p.score));
      const winners = players.filter(p => p.score === best);
      const title = !two ? (items.size ? 'Game over! 🕷️' : 'Great job! 🎉')
        : winners.length > 1 ? "It's a tie! 🤝" : `Player ${winners[0].i + 1} wins! 🏆`;
      if (typeof awardProgress === 'function' && !two) awardProgress(Math.min(30, players[0].score), items.size ? 0 : 1);
      if (net) { net.send('s', stateMsg()); net.send('end', { title, scores: players.map(p => p.score), win: winners.map(p => p.i) }); }
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
        mzSay(title.replace(/[^\w\s!']/g, ''));
        end.querySelector('[data-again]').addEventListener('click', play);
        end.querySelector('[data-menu2]').addEventListener('click', setup);
      }, 500);
    }

    m.querySelector('[data-menu]').addEventListener('click', setup);
    const onResize = () => screen.fit(spare);
    window.addEventListener('resize', onResize);
    function cleanup() {
      cancelAnimationFrame(raf);
      clearInterval(clock);
      if (sync) clearInterval(sync);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    }
    if (stopGame) stopGame();
    stopGame = cleanup;
  }

  setup();
}

// ===========================================================================
// THE STUDENT'S COPY — #jogo=maze&sala=CODE on the student's own computer.
// It draws what the teacher's game sends and sends back only the arrow
// keys of the player the student chose.
// ===========================================================================
function openMazeGuest(code) {
  let me = null;                 // 0 or 1: which player this computer steers
  let game = null;               // what the teacher's 'setup' said
  let net = null, raf = 0, screen = null, closed = false;
  let target = null, shown = null, lastState = 0, speak = true;
  const items = new Map();

  openModal(`
    <div class="modal-content-pad mz">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">${mzPacIcon('mz-head-pac')}</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Maze Muncher</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">🌐 Room ${igEscapeHtml(code)} · play with your teacher</span></p>
        </div>
      </div>
      <div id="mzMount"><p class="mz-wait">⏳ Connecting…</p></div>
    </div>`, true);
  const mount = () => document.getElementById('mzMount');

  const send = (e, p) => { if (net) net.send(e, p); };
  const hello = () => send('hello', { p: me == null ? -1 : me });

  // ---- screens ---------------------------------------------------------------
  function waitScreen(text) {
    cancelAnimationFrame(raf); raf = 0;
    const m = mount();
    if (m) m.innerHTML = `<p class="mz-wait">${text}</p>`;
  }

  function pickScreen() {
    cancelAnimationFrame(raf); raf = 0;
    const m = mount();
    if (!m || !game) return;
    m.innerHTML = `
      <div class="mz-setup">
        <p class="mz-wait">Who are you?</p>
        <div class="mz-opts mz-pick">
          ${game.players.map((p, i) => `
            <button type="button" class="mz-opt mz-opt--big" data-me="${i}" style="--pc:${MZ_PLAYER_COLORS[i]}">
              ${mzAvatarHTML(p.avatar)}<b style="color:${MZ_PLAYER_COLORS[i]}">Player ${i + 1}</b>
            </button>`).join('')}
        </div>
      </div>`;
    m.querySelectorAll('[data-me]').forEach(b => b.addEventListener('click', () => { me = Number(b.dataset.me); hello(); gameScreen(); }));
  }

  function gameScreen() {
    const m = mount();
    if (!m || !game) return;
    if (me == null || me >= game.players.length) { me = null; pickScreen(); return; }
    const food = MZ_FOODS.find(f => f.id === game.food) || MZ_FOODS[0];
    const pool = food.items();
    pool.forEach(it => { if (it.emoji || it.src) mzImage(it.emoji || it.src); });
    game.players.forEach(p => { const a = MZ_AVATARS.find(x => x.id === p.avatar); if (a && a.emoji) mzImage(a.emoji); });
    mzImage('🕷️');
    items.clear();
    game.items.forEach(([k, pi]) => items.set(k, pool[pi]));
    speak = game.speak !== false;
    const color = MZ_PLAYER_COLORS[me];
    m.innerHTML = `
      <div class="mz-game">
        <div class="mz-scores">
          ${game.players.map((p, i) => `<span class="mz-score${i === me ? ' me' : ''}" style="--pc:${MZ_PLAYER_COLORS[i]}">${mzAvatarHTML(p.avatar)}<b data-score="${i}">${p.score || 0}</b>${game.spiders ? `<span class="mz-hearts" data-hearts="${i}">${mzHearts(MZ_LIVES)}</span>` : ''}</span>`).join('')}
          <span class="mz-left" data-left>${items.size} left</span>
          <button type="button" class="game-btn secondary" data-switch>🔄 Player</button>
        </div>
        <div class="mz-said" data-said aria-live="polite"></div>
        <canvas class="mz-canvas" data-canvas></canvas>
        <p class="mz-keys">⌨️ <b style="color:${color}">← ↑ → ↓</b> or W A S D · you are <b style="color:${color}">Player ${me + 1}</b></p>
        <div class="mz-pads">${mzPadHTML(me, color, game.players[me].avatar, true)}</div>
      </div>`;
    const canvas = m.querySelector('[data-canvas]');
    screen = mzRenderer(canvas, food);
    screen.fit(320);
    m.querySelector('[data-switch]').addEventListener('click', () => { me = null; pickScreen(); });
    m.querySelectorAll('[data-pad]').forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault();
      steer(b.dataset.pad.split(':')[1]);
    }));
    shown = null;
    cancelAnimationFrame(raf);
    let last = performance.now();
    const frame = now => {
      if (!canvas.isConnected) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      draw(now, dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  // ---- steering: the arrow keys of THIS computer ------------------------------
  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  function steer(d) { if (me != null) send('steer', { p: me, d }); }
  const onKey = e => {
    if (!mount() || me == null) return;
    if (e.target.matches && e.target.matches('input, textarea, select')) return;
    const d = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!d) return;
    e.preventDefault();
    if (!e.repeat) steer(d);
  };
  window.addEventListener('keydown', onKey);

  // ---- drawing what the teacher's game sent -----------------------------------
  // Positions arrive 8 times a second; in between, each player keeps going
  // the way it was going, and the picture glides to the news.
  function draw(now, dt) {
    if (!screen || !target) return;
    const age = Math.min(0.2, (now - lastState) / 1000);
    const guess = (arr, speed) => arr.map(a => {
      const d = MZ_DIR_LIST[a[2]];
      const v = a[4] && d ? { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d] : [0, 0];
      return [a[0] + v[0] * speed * age, a[1] + v[1] * speed * age];
    });
    const goal = { p: guess(target.p, 4.6), g: target.g.map(a => [a[0], a[1]]) };
    if (!shown || shown.p.length !== goal.p.length || shown.g.length !== goal.g.length) shown = JSON.parse(JSON.stringify(goal));
    const k = Math.min(1, dt * 18);
    const glide = (s, t) => { if (Math.hypot(t[0] - s[0], t[1] - s[1]) > 1.6) { s[0] = t[0]; s[1] = t[1]; } else { s[0] += (t[0] - s[0]) * k; s[1] += (t[1] - s[1]) * k; } };
    shown.p.forEach((s, i) => glide(s, goal.p[i]));
    shown.g.forEach((s, i) => glide(s, goal.g[i]));
    screen.draw({
      items,
      players: target.p.map((a, i) => a[8] ? null : ({
        fx: shown.p[i][0], fy: shown.p[i][1], color: MZ_PLAYER_COLORS[i],
        avatar: MZ_AVATARS.find(x => x.id === game.players[i].avatar) || MZ_AVATARS[0],
        dir: MZ_DIR_LIST[a[2]] || null, face: a[3] ? 'left' : 'right', moving: Boolean(a[4]), blink: Boolean(a[6]),
      })).filter(Boolean),
      spiders: shown.g.map((s, i) => ({ fx: s[0], fy: s[1], tint: MZ_SPIDER_TINTS[i % 4], seed: i })),
      message: target.r === 1 ? 'Ready?' : target.r === 2 ? 'Paused' : target.p[me] && target.p[me][8] ? 'You are out!' : '',
    }, now);
  }

  // ---- the connection ------------------------------------------------------------
  (async () => {
    if (!mzOnlineReady()) { waitScreen('⚠️ The online game is not available on this site.'); return; }
    try {
      net = await mzOpenChannel(code, s => {
        if (s === 'SUBSCRIBED') { if (!game) waitScreen(`⏳ Waiting for the teacher to start…<br><small>Room ${igEscapeHtml(code)}</small>`); hello(); }
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') waitScreen('⚠️ No connection. Check the internet and open the link again.');
      });
    } catch (e) { waitScreen('⚠️ No connection. Check the internet and open the link again.'); return; }
    net.on('setup', g => {
      const fresh = !game || JSON.stringify(g.items.map(x => x[0]).sort()) !== JSON.stringify((game.items || []).map(x => x[0]).sort());
      game = g; target = null;
      if (me == null) pickScreen(); else if (fresh || !screen || !screen) gameScreen(); else gameScreen();
    });
    net.on('s', s => {
      if (!game || !mount()) return;
      target = s; lastState = performance.now();
      const m = mount();
      s.p.forEach((a, i) => {
        const el = m.querySelector(`[data-score="${i}"]`); if (el && el.textContent !== String(a[5])) el.textContent = a[5];
        const h = m.querySelector(`[data-hearts="${i}"]`); if (h && a[7] != null && h.dataset.n !== String(a[7])) { h.dataset.n = a[7]; h.textContent = mzHearts(a[7]); }
      });
      const left = m.querySelector('[data-left]');
      if (left) left.textContent = `${s.n} left`;
      // Missed something? Ask for the whole picture again.
      if (s.n !== items.size && me != null && !draw.asked) { draw.asked = true; hello(); setTimeout(() => { draw.asked = false; }, 2000); }
    });
    net.on('e', e => {
      const it = items.get(e.k);
      if (!it) return;
      items.delete(e.k);
      if (typeof IGSound !== 'undefined') IGSound.pop && IGSound.pop();
      mzAnnounce(it, MZ_PLAYER_COLORS[e.p] || '#333', mount() && mount().querySelector('[data-said]'), speak && e.p === me);
    });
    net.on('end', e => {
      const box = mount() && mount().querySelector('.mz-game');
      if (!box) return;
      if (typeof IGSound !== 'undefined') IGSound.win && IGSound.win();
      const end = document.createElement('div');
      end.className = 'mz-end';
      end.innerHTML = `
        <div class="mz-end-card">
          <p class="mz-end-title">${igEscapeHtml(e.title || '🎉')}</p>
          <div class="mz-end-scores">
            ${(game.players || []).map((p, i) => `<span class="mz-score big${(e.win || []).includes(i) && game.players.length > 1 ? ' win' : ''}" style="--pc:${MZ_PLAYER_COLORS[i]}">${mzAvatarHTML(p.avatar)}<b>${(e.scores || [])[i] || 0}</b></span>`).join('')}
          </div>
          <p class="mz-keys">The teacher starts the next game. 🎮</p>
        </div>`;
      box.appendChild(end);
    });
    net.on('wait', () => { game = null; target = null; waitScreen(`⏳ The teacher is choosing the next game…<br><small>Room ${igEscapeHtml(code)}</small>`); });
    net.on('bye', () => { game = null; target = null; waitScreen('👋 The teacher closed the game.'); });
  })();

  // When this window closes: stop listening.
  const watch = setInterval(() => {
    if (mount()) return;
    clearInterval(watch);
    closed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    if (net) net.close();
  }, 1000);
}
