/* ==========================================================================
   IGenglishschool — Prepositions of place: the box scene, the things to
   move around it, and the word bank. Loaded before games.js; the game
   lives in GameEngine.

   The scene is 400 x 260: a big open box standing on two bricks (so there
   is room UNDER it), and a second, smaller box on the right (so there is
   something to be BETWEEN). Every preposition is a spot: where the thing
   stands (x, y = its feet), how big it is there, and whether it is drawn
   behind the box, inside it, or in front of it.
   ========================================================================== */

const PP_OUT = '#2e2b2e';

// Things are drawn in a 100 x 100 box, standing on y=96, centred on x=50.
const PP_THINGS = [
  { id: 'cat', en: 'cat', pt: 'gato', emoji: '🐱', draw: `
    <g stroke="${PP_OUT}" stroke-width="2.4" stroke-linejoin="round">
      <path d="M68,88 Q90,86 86,62 Q84,50 76,54" fill="none" stroke="${PP_OUT}" stroke-width="9" stroke-linecap="round"/>
      <path d="M68,88 Q90,86 86,62 Q84,50 76,54" fill="none" stroke="#f08a24" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="50" cy="74" rx="21" ry="22" fill="#f08a24"/>
      <path d="M36,32 L34,12 L48,24Z M64,32 L66,12 L52,24Z" fill="#f08a24"/>
      <circle cx="50" cy="40" r="18" fill="#f08a24"/>
      <path d="M40,66 h20 M38,76 h24" stroke="#c96a12" stroke-width="3"/>
      <ellipse cx="42" cy="92" rx="7" ry="4" fill="#f08a24"/><ellipse cx="58" cy="92" rx="7" ry="4" fill="#f08a24"/>
    </g>
    <ellipse cx="43" cy="38" rx="3" ry="4" fill="${PP_OUT}"/><ellipse cx="57" cy="38" rx="3" ry="4" fill="${PP_OUT}"/>
    <path d="M47,45 h6 l-3,3Z" fill="#f27a8a"/>
    <path d="M30,46 h10 M30,51 l10,-2 M70,46 h-10 M70,51 l-10,-2" stroke="${PP_OUT}" stroke-width="1.3"/>` },
  { id: 'dog', en: 'dog', pt: 'cachorro', emoji: '🐶', draw: `
    <g stroke="${PP_OUT}" stroke-width="2.4" stroke-linejoin="round">
      <path d="M68,84 Q84,78 82,62" fill="none" stroke="${PP_OUT}" stroke-width="8" stroke-linecap="round"/>
      <path d="M68,84 Q84,78 82,62" fill="none" stroke="#c98d4f" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="50" cy="74" rx="21" ry="22" fill="#c98d4f"/>
      <circle cx="50" cy="40" r="18" fill="#c98d4f"/>
      <ellipse cx="32" cy="42" rx="7" ry="14" fill="#7a5230" transform="rotate(15 32 42)"/>
      <ellipse cx="68" cy="42" rx="7" ry="14" fill="#7a5230" transform="rotate(-15 68 42)"/>
      <ellipse cx="50" cy="49" rx="10" ry="7" fill="#f1d2a7"/>
      <ellipse cx="42" cy="92" rx="7" ry="4" fill="#c98d4f"/><ellipse cx="58" cy="92" rx="7" ry="4" fill="#c98d4f"/>
    </g>
    <circle cx="43" cy="36" r="3" fill="${PP_OUT}"/><circle cx="57" cy="36" r="3" fill="${PP_OUT}"/>
    <ellipse cx="50" cy="45" rx="4" ry="3" fill="${PP_OUT}"/>
    <path d="M50,52 q0,6 -3,8 q3,2 6,0 q-3,-2 -3,-8" fill="#f27a8a"/>
    <circle cx="58" cy="72" r="6" fill="#7a5230" opacity=".7"/>` },
  { id: 'frog', en: 'frog', pt: 'sapo', emoji: '🐸', draw: `
    <g stroke="${PP_OUT}" stroke-width="2.4">
      <ellipse cx="30" cy="86" rx="15" ry="8" fill="#5cae4a"/><ellipse cx="70" cy="86" rx="15" ry="8" fill="#5cae4a"/>
      <ellipse cx="50" cy="74" rx="26" ry="20" fill="#5cae4a"/>
      <circle cx="38" cy="52" r="10" fill="#5cae4a"/><circle cx="62" cy="52" r="10" fill="#5cae4a"/>
      <circle cx="38" cy="51" r="5.5" fill="#fff"/><circle cx="62" cy="51" r="5.5" fill="#fff"/>
    </g>
    <circle cx="39" cy="52" r="3" fill="${PP_OUT}"/><circle cx="63" cy="52" r="3" fill="${PP_OUT}"/>
    <path d="M38,72 Q50,80 62,72" fill="none" stroke="${PP_OUT}" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="50" cy="82" rx="14" ry="7" fill="#9fd88a"/>` },
  { id: 'butterfly', en: 'butterfly', pt: 'borboleta', emoji: '🦋', draw: `
    <g stroke="${PP_OUT}" stroke-width="2.2">
      <ellipse cx="32" cy="46" rx="18" ry="22" fill="#f27aa5" transform="rotate(-20 32 46)"/>
      <ellipse cx="68" cy="46" rx="18" ry="22" fill="#f27aa5" transform="rotate(20 68 46)"/>
      <ellipse cx="34" cy="76" rx="13" ry="15" fill="#8e5fc2" transform="rotate(20 34 76)"/>
      <ellipse cx="66" cy="76" rx="13" ry="15" fill="#8e5fc2" transform="rotate(-20 66 76)"/>
      <ellipse cx="50" cy="60" rx="5" ry="26" fill="${PP_OUT}"/>
    </g>
    <circle cx="30" cy="44" r="6" fill="#ffd166"/><circle cx="70" cy="44" r="6" fill="#ffd166"/>
    <circle cx="34" cy="78" r="4" fill="#fff"/><circle cx="66" cy="78" r="4" fill="#fff"/>
    <path d="M48,36 Q42,22 36,20 M52,36 Q58,22 64,20" fill="none" stroke="${PP_OUT}" stroke-width="2"/>` },
  { id: 'flower', en: 'flower', pt: 'flor', emoji: '🌸', draw: `
    <g stroke="${PP_OUT}" stroke-width="2.2">
      <path d="M50,70 V36" stroke="#3f9e5a" stroke-width="4"/>
      <ellipse cx="40" cy="58" rx="10" ry="5" fill="#5cae4a" transform="rotate(-30 40 58)"/>
      <ellipse cx="60" cy="52" rx="10" ry="5" fill="#5cae4a" transform="rotate(30 60 52)"/>
      ${[0, 72, 144, 216, 288].map(a => `<circle cx="${50 + 13 * Math.cos((a - 90) * Math.PI / 180)}" cy="${28 + 13 * Math.sin((a - 90) * Math.PI / 180)}" r="10" fill="#e5484d"/>`).join('')}
      <circle cx="50" cy="28" r="8" fill="#ffd166"/>
      <path d="M32,70 H68 L63,96 H37Z" fill="#c8693a"/>
      <rect x="29" y="66" width="42" height="8" rx="3" fill="#a9532a"/>
    </g>` },
  { id: 'videogame', en: 'video game', pt: 'videogame', emoji: '🎮', draw: `
    <g stroke="${PP_OUT}" stroke-width="2.4" stroke-linejoin="round">
      <path d="M22,56 Q16,56 12,72 Q8,94 22,94 Q30,94 36,84 H64 Q70,94 78,94 Q92,94 88,72 Q84,56 78,56Z" fill="#8e5fc2"/>
      <rect x="25" y="68" width="16" height="6" rx="1.5" fill="#3a363d"/><rect x="30" y="63" width="6" height="16" rx="1.5" fill="#3a363d"/>
      <circle cx="66" cy="66" r="4" fill="#e5484d"/><circle cx="74" cy="72" r="4" fill="#3fae8a"/>
      <circle cx="58" cy="72" r="4" fill="#f2bd2c"/><circle cx="66" cy="78" r="4" fill="#3d7bd9"/>
    </g>
    <path d="M50,56 Q50,40 60,34" fill="none" stroke="${PP_OUT}" stroke-width="2.5"/>` },
  { id: 'computer', en: 'computer', pt: 'computador', emoji: '💻', draw: `
    <g stroke="${PP_OUT}" stroke-width="2.4" stroke-linejoin="round">
      <rect x="12" y="20" width="76" height="54" rx="4" fill="#3a363d"/>
      <rect x="18" y="26" width="64" height="42" rx="2" fill="#7cc2e6"/>
      <rect x="44" y="74" width="12" height="12" fill="#9ea3a9"/>
      <rect x="28" y="86" width="44" height="8" rx="3" fill="#9ea3a9"/>
    </g>
    <path d="M26,56 l12,-14 l10,10 l8,-6 l18,16" fill="none" stroke="#fff" stroke-width="2.5" opacity=".8"/>
    <circle cx="68" cy="36" r="5" fill="#ffd166"/>` },
];
const ppThingById = id => PP_THINGS.find(t => t.id === id);

// layer: 'back' (behind the box), 'in' (inside it), 'front' (in front).
// hot: where the child aims when dropping (scene coordinates).
const PREPOSITIONS = [
  { id: 'in', en: 'in', pt: 'dentro', x: 145, y: 92, s: 0.6, layer: 'in', hot: [145, 104], phrase: 'in the box' },
  { id: 'on', en: 'on', pt: 'em cima', x: 145, y: 70, s: 0.6, layer: 'front', hot: [140, 38], phrase: 'on the box' },
  { id: 'under', en: 'under', pt: 'embaixo', x: 145, y: 198, s: 0.5, layer: 'front', hot: [145, 172], phrase: 'under the box' },
  { id: 'nextto', en: 'next to', pt: 'ao lado', x: 36, y: 198, s: 0.6, layer: 'front', hot: [42, 168], phrase: 'next to the box' },
  { id: 'between', en: 'between', pt: 'entre', x: 264, y: 198, s: 0.55, layer: 'front', hot: [264, 172], phrase: 'between the boxes' },
  { id: 'behind', en: 'behind', pt: 'atrás', x: 200, y: 80, s: 0.55, layer: 'back', hot: [214, 44], phrase: 'behind the box' },
  { id: 'infront', en: 'in front of', pt: 'na frente', x: 145, y: 256, s: 0.8, layer: 'top', hot: [145, 228], phrase: 'in front of the box' },
];
const prepById = id => PREPOSITIONS.find(p => p.id === id);

const PP_BOX = {
  // The big box on its bricks: inside (dark), then the front + side panels.
  // Open (flaps up, dark inside) only while something is IN it…
  open: `
    <path d="M78,76 L96,62 L230,62 L212,76Z" fill="#7a5230" stroke="${PP_OUT}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M96,62 L84,44 L216,44 L230,62Z" fill="#d9a066" stroke="${PP_OUT}" stroke-width="2.5" stroke-linejoin="round"/>`,
  // …closed otherwise, so ON means sitting on the lid.
  closed: `
    <path d="M78,76 L96,62 L230,62 L212,76Z" fill="#e3b073" stroke="${PP_OUT}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M140,76 L158,62" stroke="#c98d4f" stroke-width="7"/>`,
  front: `
    <path d="M212,76 L230,62 L230,122 L212,136Z" fill="#b97d43" stroke="${PP_OUT}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="78" y="76" width="134" height="60" fill="#d9a066" stroke="${PP_OUT}" stroke-width="2.5"/>
    <rect x="132" y="78" width="26" height="56" fill="#e8bf8c" opacity=".6"/>`,
  bricks: `
    ${[[84, 136], [186, 136]].map(([x, y]) => `
      <rect x="${x}" y="${y}" width="22" height="62" fill="#b8574a" stroke="${PP_OUT}" stroke-width="2"/>
      <path d="M${x},${y + 15} h22 M${x},${y + 31} h22 M${x},${y + 47} h22 M${x + 11},${y} v15 M${x + 6},${y + 15} v16 M${x + 16},${y + 31} v16 M${x + 9},${y + 47} v15" stroke="#8f3f35" stroke-width="1.5"/>`).join('')}`,
  second: `
    <path d="M300,138 L314,128 L384,128 L370,138Z" fill="#c98d4f" stroke="${PP_OUT}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M370,138 L384,128 L384,188 L370,198Z" fill="#b97d43" stroke="${PP_OUT}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="300" y="138" width="70" height="60" fill="#d9a066" stroke="${PP_OUT}" stroke-width="2.5"/>
    <rect x="326" y="138" width="18" height="60" fill="#e8bf8c" opacity=".6"/>`,
  room: `
    <rect width="400" height="260" fill="#eaf4fb"/>
    <rect y="150" width="400" height="110" fill="#e3c9a0"/>
    ${[176, 206, 236].map(y => `<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#d3b78b" stroke-width="1.5"/>`).join('')}
    <rect y="146" width="400" height="5" fill="#d0dce6"/>`,
};

// The class sits on an outer group so a CSS animation on it can't wipe out
// the placement transform on the inner one.
function ppPlaced(thing, prep, cls) {
  return `<g class="${cls || ''}"><g transform="translate(${prep.x} ${prep.y}) scale(${prep.s}) translate(-50 -96)">${thing.draw}</g></g>`;
}

// The whole scene, with `thing` at `prepId` (or nowhere), and the drop
// spots shown while the child is dragging.
function ppSceneInner(thing, prepId, opts) {
  const o = opts || {};
  const prep = prepId && prepById(prepId);
  const at = layer => (thing && prep && prep.layer === layer ? ppPlaced(thing, prep, `pp-thing${o.newest ? ' pp-new' : ''}`) : '');
  const hots = o.hots ? PREPOSITIONS.map(p => `<circle class="pp-hot" cx="${p.hot[0]}" cy="${p.hot[1]}" r="15"/>`).join('') : '';
  const top = prep && prep.id === 'in' ? PP_BOX.open : PP_BOX.closed;
  return `${PP_BOX.room}${at('back')}${PP_BOX.bricks}${top}${at('in')}${PP_BOX.front}${PP_BOX.second}${at('front')}${at('top')}${hots}`;
}

// A tiny diagram of the box with a dot where the thing goes — the
// preposition buttons in "Teacher says" mode.
function ppIconSVG(prepId) {
  const dots = { in: [30, 25], on: [30, 9], under: [30, 37], nextto: [8, 33], between: [50, 33], behind: [38, 6], infront: [30, 44] };
  const [x, y] = dots[prepId];
  const back = prepId === 'behind';
  return `<svg class="pp-icon" viewBox="0 0 64 48" aria-hidden="true">
    ${back ? `<circle cx="${x}" cy="${y + 4}" r="6" fill="#f05d77"/>` : ''}
    <rect x="16" y="14" width="28" height="18" fill="#d9a066" stroke="${PP_OUT}" stroke-width="1.8"/>
    <rect x="18" y="32" width="4" height="10" fill="#b8574a"/><rect x="38" y="32" width="4" height="10" fill="#b8574a"/>
    <rect x="54" y="30" width="10" height="12" fill="#d9a066" stroke="${PP_OUT}" stroke-width="1.5"/>
    ${back ? '' : `<circle cx="${x}" cy="${y}" r="6" fill="#f05d77" stroke="${PP_OUT}" stroke-width="1.5"/>`}
  </svg>`;
}

function prepositionFor(word) {
  const key = String((word && word.en) || '').toLowerCase().trim();
  return PREPOSITIONS.find(p => p.en === key) || null;
}
function isPrepositionsTopic(topic) {
  const label = `${topic.id || ''} ${topic.title || ''}`.toLowerCase();
  if (/preposition|preposi[cç][aã]o|preposi[cç][oõ]es/.test(label)) return true;
  return (topic.words || []).filter(w => prepositionFor(w)).length >= 4;
}

const PREPOSITIONS_TOPIC = {
  id: 'prepositions', title: 'Prepositions of Place', emoji: '📦',
  words: PREPOSITIONS.map(p => ({
    id: `pp_${p.id}`, en: p.en, pt: p.pt, emoji: '📦',
    image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">${ppSceneInner(PP_THINGS[0], p.id)}</svg>`),
  })),
};

// ---------------------------------------------------------------------------
// One opener for all the ready-made games in the Game Maker: the game
// itself first, then every other game its word bank can run.
// ---------------------------------------------------------------------------
function openReadyGame(topic, firstGame, title) {
  const games = gamesForTopic(topic).sort((a, b) => (a.id === firstGame ? -1 : b.id === firstGame ? 1 : 0));
  let active = firstGame;
  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">${title}</h3>
      <div class="game-picker" id="readyGamePicker">
        ${games.map(g => `<button class="game-pick-btn ${g.id === active ? 'active' : ''}" data-game="${g.id}">${g.icon} ${g.label}</button>`).join('')}
      </div>
      <div class="game-mount" id="readyGameMount"></div>
    </div>`, true);
  const mount = () => GameEngine.mount(document.getElementById('readyGameMount'), topic, active);
  document.querySelectorAll('#readyGamePicker .game-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      active = btn.dataset.game;
      document.querySelectorAll('#readyGamePicker .game-pick-btn').forEach(b => b.classList.toggle('active', b === btn));
      mount();
    });
  });
  mount();
}
const openFeelingsGame = () => openReadyGame(FEELINGS_TOPIC, 'feelings', '😊 Feelings');
const openInstrumentsGame = () => openReadyGame(INSTRUMENTS_TOPIC, 'instruments', '🎸 Musical Instruments');
const openPrepositionsGame = () => openReadyGame(PREPOSITIONS_TOPIC, 'prepositions', '📦 Prepositions of Place');
