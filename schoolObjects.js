/* ==========================================================================
   IGenglishschool — School Objects: drawings, backpacks and the word bank
   Loaded before games.js. The Backpack game itself (choose a backpack,
   choose its colour, drag the school objects in) lives in GameEngine with
   the other games; this file holds what it draws with, plus a ready-made
   "School Objects" topic so the game can be opened straight from Games.
   ========================================================================== */

// Every object is drawn in a 100 x 100 box, standing up, so it can poke out
// of the top of the backpack once it is packed.
const SCHOOL_DRAW = {
  book: `
    <rect x="24" y="12" width="52" height="76" rx="4" fill="#c9435c"/>
    <rect x="24" y="12" width="11" height="76" rx="3" fill="#9e2f45"/>
    <rect x="42" y="26" width="26" height="14" rx="2" fill="#fff" opacity=".9"/>
    <rect x="42" y="46" width="26" height="3" rx="1.5" fill="#fff" opacity=".6"/>
    <rect x="42" y="53" width="18" height="3" rx="1.5" fill="#fff" opacity=".6"/>`,
  notebook: `
    <rect x="28" y="10" width="50" height="80" rx="5" fill="#3d7bd9"/>
    <rect x="42" y="28" width="28" height="18" rx="2" fill="#fff"/>
    <rect x="46" y="34" width="20" height="2" fill="#9db8e8"/>
    <rect x="46" y="39" width="14" height="2" fill="#9db8e8"/>
    ${[16, 25, 34, 43, 52, 61, 70, 79].map(y => `<circle cx="28" cy="${y}" r="3.6" fill="none" stroke="#5b5b66" stroke-width="2.4"/>`).join('')}`,
  pen: `
    <rect x="44" y="8" width="12" height="62" rx="5" fill="#2a5bd7"/>
    <rect x="44" y="8" width="12" height="22" rx="5" fill="#1d3f9a"/>
    <rect x="56" y="11" width="3.5" height="21" rx="1.7" fill="#1d3f9a"/>
    <path d="M45,70 L55,70 L52.5,84 L47.5,84Z" fill="#c9ccd6"/>
    <path d="M47.5,84 L52.5,84 L50,92Z" fill="#2e2b2e"/>`,
  pencil: `
    <rect x="44" y="8" width="12" height="9" rx="2" fill="#f49ab0"/>
    <rect x="44" y="16" width="12" height="6" fill="#b9bcc6"/>
    <rect x="44" y="22" width="12" height="52" fill="#f6c445"/>
    <rect x="48" y="22" width="4" height="52" fill="#e8b22c"/>
    <path d="M44,74 L56,74 L50,90Z" fill="#f1d2a0"/>
    <path d="M48,84.5 L52,84.5 L50,90Z" fill="#2e2b2e"/>`,
  mechpencil: `
    <rect x="46" y="5" width="8" height="9" rx="2" fill="#9aa0ad"/>
    <rect x="44" y="13" width="12" height="52" rx="4" fill="#8e6d86"/>
    <rect x="56" y="16" width="3.5" height="19" rx="1.7" fill="#c3c7d0"/>
    <rect x="44" y="48" width="12" height="17" fill="#5c4458"/>
    ${[51, 55, 59].map(y => `<rect x="44" y="${y}" width="12" height="1.6" fill="#7a5f76"/>`).join('')}
    <path d="M44,65 L56,65 L52,80 L48,80Z" fill="#c3c7d0"/>
    <rect x="49" y="80" width="2" height="7" fill="#9aa0ad"/>
    <rect x="49.3" y="87" width="1.4" height="5" fill="#2e2b2e"/>`,
  eraser: `
    <g transform="rotate(-12 50 52)">
      <rect x="20" y="38" width="60" height="28" rx="6" fill="#f49ab0"/>
      <path d="M56,38 H74 a6,6 0 0 1 6,6 V60 a6,6 0 0 1 -6,6 H56Z" fill="#4f86e8"/>
      <rect x="22" y="40" width="56" height="6" rx="3" fill="#fff" opacity=".35"/>
    </g>`,
  pencilcase: `
    <rect x="12" y="34" width="76" height="42" rx="16" fill="#f05d77"/>
    <rect x="12" y="34" width="76" height="14" rx="7" fill="#d9475f"/>
    <path d="M20,47 H80" stroke="#fff" stroke-width="2.5" stroke-dasharray="3.5 2.5"/>
    <rect x="66" y="44" width="7" height="17" rx="3.5" fill="#ffd166"/>
    <circle cx="69.5" cy="57" r="1.6" fill="#d9475f"/>
    <circle cx="32" cy="62" r="4" fill="#ffd166"/><circle cx="46" cy="64" r="3" fill="#fff" opacity=".7"/>`,
  sharpener: `
    <rect x="28" y="36" width="44" height="34" rx="5" fill="#3fae8a"/>
    <rect x="28" y="36" width="44" height="8" rx="4" fill="#fff" opacity=".25"/>
    <circle cx="40" cy="55" r="8.5" fill="#2e2b2e"/>
    <circle cx="40" cy="55" r="4.5" fill="#8a5a2b"/>
    <rect x="52" y="46" width="16" height="17" rx="2" fill="#d5d8df"/>
    <circle cx="60" cy="54.5" r="2.2" fill="#9aa0ad"/>`,
  ruler: `
    <rect x="38" y="4" width="24" height="92" rx="3" fill="#f3d36b" stroke="#d8b23e" stroke-width="1.5"/>
    ${Array.from({ length: 17 }, (_, i) => `<line x1="38" y1="${10 + i * 5}" x2="${i % 2 ? 44 : 49}" y2="${10 + i * 5}" stroke="#7a6320" stroke-width="1.2"/>`).join('')}`,
  crayons: [['#e5484d', 24], ['#3d7bd9', 44], ['#3fae8a', 64]].map(([c, x], i) => `
    <g transform="translate(0 ${i === 1 ? -6 : 0})">
      <path d="M${x},32 L${x + 13},32 L${x + 6.5},14Z" fill="${c}"/>
      <rect x="${x}" y="32" width="13" height="58" rx="2" fill="${c}"/>
      <rect x="${x}" y="42" width="13" height="34" fill="#fff" opacity=".4"/>
      <rect x="${x}" y="48" width="13" height="2" fill="${c}" opacity=".8"/>
      <rect x="${x}" y="68" width="13" height="2" fill="${c}" opacity=".8"/>
    </g>`).join(''),
  coloredpencils: [['#e5484d', 20, 4], ['#f6c445', 35, -4], ['#3fae8a', 50, 2], ['#8e6d86', 65, -2]].map(([c, x, dy]) => `
    <g transform="translate(0 ${dy})">
      <rect x="${x}" y="28" width="12" height="64" fill="${c}"/>
      <rect x="${x + 4}" y="28" width="4" height="64" fill="#000" opacity=".1"/>
      <path d="M${x},28 L${x + 12},28 L${x + 6},12Z" fill="#f1d2a0"/>
      <path d="M${x + 4},18 L${x + 8},18 L${x + 6},12Z" fill="${c}"/>
    </g>`).join(''),
  glue: `
    <path d="M46.5,7 L53.5,7 L56,22 L44,22Z" fill="#f08a24"/>
    <rect x="39" y="20" width="22" height="13" rx="3" fill="#f08a24"/>
    <rect x="32" y="31" width="36" height="60" rx="8" fill="#fff" stroke="#d9d9de" stroke-width="2"/>
    <rect x="33" y="46" width="34" height="27" fill="#f6c445"/>
    <path d="M50,51 C46,57 45,60 45,62 a5,5 0 0 0 10,0 C55,60 54,57 50,51Z" fill="#fff"/>`,
  scissors: `
    <path d="M53,58 L35,9 L41,7 L56,55Z" fill="#c3c7d0" stroke="#9aa0ad" stroke-width="1"/>
    <path d="M47,58 L65,9 L59,7 L44,55Z" fill="#d5d8df" stroke="#9aa0ad" stroke-width="1"/>
    <path d="M47,59 L40,67 M53,59 L60,67" stroke="#f05d77" stroke-width="6" stroke-linecap="round"/>
    <circle cx="37" cy="77" r="11" fill="none" stroke="#f05d77" stroke-width="6"/>
    <circle cx="63" cy="77" r="11" fill="none" stroke="#f05d77" stroke-width="6"/>
    <circle cx="50" cy="56" r="2.6" fill="#6b6f7a"/>`,
  paintbrush: `
    <rect x="46" y="38" width="8" height="56" rx="4" fill="#c9435c"/>
    <rect x="45" y="28" width="10" height="12" rx="1.5" fill="#c3c7d0"/>
    <path d="M45,29 C44,18 48,10 50,4 C52,10 56,18 55,29Z" fill="#8a5a2b"/>
    <path d="M47,15 C48,10 49,7 50,4 C51,7 52,10 53,15Z" fill="#4f86e8"/>`,
};

// `turn` stands wide objects up when they go into the backpack, and
// `anchor` is the point of the drawing that sits on the backpack's rim line —
// small things sink deeper and only peek out.
const SCHOOL_OBJECTS = [
  { id: 'book', en: 'Book', pt: 'Livro', emoji: '📕', aliases: ['book', 'textbook'] },
  { id: 'notebook', en: 'Notebook', pt: 'Caderno', emoji: '📓', aliases: ['notebook', 'exercise book'] },
  { id: 'pen', en: 'Pen', pt: 'Caneta', emoji: '🖊️', aliases: ['pen'] },
  { id: 'pencil', en: 'Pencil', pt: 'Lápis', emoji: '✏️', aliases: ['pencil'] },
  { id: 'mechpencil', en: 'Mechanical pencil', pt: 'Lapiseira / grafite', emoji: '✏️', aliases: ['mechanical pencil', 'propelling pencil'] },
  { id: 'eraser', en: 'Eraser', pt: 'Borracha', emoji: '🧽', aliases: ['eraser', 'rubber'], turn: -72, anchor: 72 },
  { id: 'pencilcase', en: 'Pencil case', pt: 'Estojo', emoji: '👝', aliases: ['pencil case'], turn: -80, anchor: 78 },
  { id: 'sharpener', en: 'Sharpener', pt: 'Apontador', emoji: '✏️', aliases: ['sharpener', 'pencil sharpener'], anchor: 64 },
  { id: 'ruler', en: 'Ruler', pt: 'Régua', emoji: '📏', aliases: ['ruler'] },
  { id: 'crayons', en: 'Crayons', pt: 'Giz de cera', emoji: '🖍️', aliases: ['crayons', 'crayon', 'wax crayons'], plural: true },
  { id: 'coloredpencils', en: 'Colored pencils', pt: 'Lápis de cor', emoji: '🖍️', aliases: ['colored pencils', 'coloured pencils', 'colored pencil', 'coloured pencil', 'colouring pencils'], plural: true },
  { id: 'glue', en: 'Glue', pt: 'Cola', emoji: '🧴', aliases: ['glue', 'glue stick'], uncountable: true },
  { id: 'scissors', en: 'Scissors', pt: 'Tesoura', emoji: '✂️', aliases: ['scissors', 'pair of scissors'], plural: true },
  { id: 'paintbrush', en: 'Paint brush', pt: 'Pincel', emoji: '🖌️', aliases: ['paint brush', 'paintbrush', 'brush'] },
];

function schoolObjectSVG(id, cls) {
  return `<svg class="${cls || ''}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${SCHOOL_DRAW[id]}</svg>`;
}

function schoolObjectDataUri(id) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${SCHOOL_DRAW[id]}</svg>`);
}

// "The Scissors", "a ruler", "Colored pencil" all find their drawing.
function schoolObjectFor(word) {
  const key = String((word && word.en) || '').toLowerCase().trim()
    .replace(/^(a|an|the|my)\s+/, '').replace(/\s+/g, ' ');
  if (!key) return null;
  const singular = key.replace(/(es|s)$/, '');
  return SCHOOL_OBJECTS.find(o => o.aliases.some(a => a === key || a === singular || a.replace(/s$/, '') === singular)) || null;
}

// A topic gets the Backpack game when it is about school objects — by name,
// or because at least three of its words are things that fit in a backpack.
function isSchoolTopic(topic) {
  const label = `${topic.id || ''} ${topic.title || ''}`.toLowerCase();
  if (/school (objects|supplies|things|items)|material escolar/.test(label)) return true;
  return (topic.words || []).filter(w => schoolObjectFor(w)).length >= 3;
}

// The built-in word bank, with each object's own drawing as its picture so
// Memory, Match-up and the rest show the same pencil the backpack does.
const SCHOOL_OBJECTS_TOPIC = {
  id: 'school-objects',
  title: 'School Objects',
  emoji: '🎒',
  words: SCHOOL_OBJECTS.map(o => ({
    id: `so_${o.id}`, en: o.en, pt: o.pt, emoji: o.emoji, image: schoolObjectDataUri(o.id),
  })),
};

// ---------------------------------------------------------------------------
// BACKPACKS — drawn in a 300 x 340 box. `back` goes behind the packed
// objects (the inside, handles), `front` in front of them (the body), so
// whatever is packed looks like it is really inside.
// ---------------------------------------------------------------------------
function bpShade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const BACKPACK_COLORS = [
  { name: 'red', pt: 'vermelha', hex: '#e5484d' },
  { name: 'blue', pt: 'azul', hex: '#3d7bd9' },
  { name: 'green', pt: 'verde', hex: '#3fae8a' },
  { name: 'yellow', pt: 'amarela', hex: '#f2bd2c' },
  { name: 'pink', pt: 'rosa', hex: '#f27aa5' },
  { name: 'purple', pt: 'roxa', hex: '#8e5fc2' },
  { name: 'orange', pt: 'laranja', hex: '#f08a24' },
  { name: 'black', pt: 'preta', hex: '#3a3740' },
];

const BACKPACK_STYLES = [
  {
    id: 'classic', en: 'classic backpack', label: 'Classic', pt: 'Mochila clássica',
    back: (c) => `
      <path d="M120,96 Q150,52 180,96" fill="none" stroke="${bpShade(c, -0.35)}" stroke-width="11" stroke-linecap="round"/>
      <ellipse cx="150" cy="112" rx="88" ry="22" fill="${bpShade(c, -0.5)}"/>`,
    front: (c) => `
      <rect x="40" y="176" width="28" height="104" rx="11" fill="${bpShade(c, -0.22)}"/>
      <rect x="232" y="176" width="28" height="104" rx="11" fill="${bpShade(c, -0.22)}"/>
      <path d="M62,112 Q150,134 238,112 L238,290 Q238,320 208,320 L92,320 Q62,320 62,290Z" fill="${c}"/>
      <path d="M68,121 Q150,141 232,121" fill="none" stroke="${bpShade(c, 0.35)}" stroke-width="4" stroke-dasharray="7 5"/>
      <rect x="88" y="198" width="124" height="96" rx="24" fill="${bpShade(c, 0.22)}"/>
      <path d="M102,214 H198" stroke="${bpShade(c, -0.3)}" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="186" y="211" width="9" height="20" rx="4.5" fill="#ffd166"/>`,
  },
  {
    id: 'rolling', en: 'rolling backpack', label: 'Rolling', pt: 'Mochila de rodinha',
    back: (c) => `
      <rect x="112" y="22" width="9" height="104" fill="#9aa0ad"/>
      <rect x="179" y="22" width="9" height="104" fill="#9aa0ad"/>
      <rect x="104" y="12" width="92" height="16" rx="8" fill="#5b5f6a"/>
      <ellipse cx="150" cy="122" rx="80" ry="20" fill="${bpShade(c, -0.5)}"/>`,
    front: (c) => `
      <path d="M70,122 Q150,142 230,122 L230,292 Q230,316 206,316 L94,316 Q70,316 70,292Z" fill="${c}"/>
      <rect x="70" y="160" width="160" height="14" fill="${bpShade(c, 0.3)}"/>
      <rect x="96" y="196" width="108" height="86" rx="20" fill="${bpShade(c, 0.22)}"/>
      <path d="M108,212 H192" stroke="${bpShade(c, -0.3)}" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="180" y="209" width="9" height="20" rx="4.5" fill="#ffd166"/>
      <circle cx="102" cy="318" r="17" fill="#3a3a42"/><circle cx="102" cy="318" r="6" fill="#9aa0ad"/>
      <circle cx="198" cy="318" r="17" fill="#3a3a42"/><circle cx="198" cy="318" r="6" fill="#9aa0ad"/>`,
  },
  {
    id: 'bear', en: 'teddy bear backpack', label: 'Teddy bear', pt: 'Mochila de ursinho',
    back: (c) => `
      <ellipse cx="150" cy="114" rx="84" ry="21" fill="${bpShade(c, -0.5)}"/>`,
    front: (c) => `
      <circle cx="70" cy="122" r="27" fill="${c}"/><circle cx="70" cy="122" r="14" fill="${bpShade(c, 0.35)}"/>
      <circle cx="230" cy="122" r="27" fill="${c}"/><circle cx="230" cy="122" r="14" fill="${bpShade(c, 0.35)}"/>
      <path d="M66,114 Q150,136 234,114 Q264,204 242,278 Q228,324 150,324 Q72,324 58,278 Q36,204 66,114Z" fill="${c}"/>
      <circle cx="116" cy="196" r="9" fill="#2e2b2e"/><circle cx="119" cy="193" r="3" fill="#fff"/>
      <circle cx="184" cy="196" r="9" fill="#2e2b2e"/><circle cx="187" cy="193" r="3" fill="#fff"/>
      <ellipse cx="96" cy="222" rx="13" ry="8" fill="#f49ab0" opacity=".7"/>
      <ellipse cx="204" cy="222" rx="13" ry="8" fill="#f49ab0" opacity=".7"/>
      <ellipse cx="150" cy="250" rx="46" ry="36" fill="${bpShade(c, 0.35)}"/>
      <ellipse cx="150" cy="234" rx="13" ry="9" fill="#2e2b2e"/>
      <path d="M150,243 V254 M138,256 Q150,266 162,256" fill="none" stroke="#2e2b2e" stroke-width="3.5" stroke-linecap="round"/>`,
  },
];

// Where packed objects stand, in the order they go in: middle first, then
// out to the sides, then a second row behind. [x, y, tilt]
const BACKPACK_SLOTS = [
  [150, 150, 0], [118, 154, -10], [182, 154, 10], [96, 160, -18], [204, 160, 16],
  [134, 142, -5], [166, 142, 6], [108, 146, -14], [192, 146, 12], [150, 136, 3],
  [124, 138, -8], [176, 138, 9], [88, 152, -22], [212, 152, 22],
];

function backpackSVG(styleId, color, packedIds, newestId) {
  const style = BACKPACK_STYLES.find(s => s.id === styleId) || BACKPACK_STYLES[0];
  const items = (packedIds || []).map((id, i) => {
    const obj = SCHOOL_OBJECTS.find(o => o.id === id);
    const [x, y, tilt] = BACKPACK_SLOTS[i % BACKPACK_SLOTS.length];
    const turn = (obj && obj.turn) || 0;
    const anchor = (obj && obj.anchor) || 80;
    return `<g class="${id === newestId ? 'bp-new' : ''}">
      <g transform="translate(${x} ${y}) rotate(${tilt}) scale(0.92) rotate(${turn} 0 ${-anchor + 50}) translate(-50 ${-anchor})">${SCHOOL_DRAW[id]}</g>
    </g>`;
  }).join('');
  return `<svg class="bp-svg" viewBox="0 0 300 340" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="150" cy="330" rx="110" ry="9" fill="#000" opacity=".08"/>
    ${style.back(color)}${items}${style.front(color)}
  </svg>`;
}

// ---------------------------------------------------------------------------
// Opening it from the Game Maker section (and the student's home screen): the
// Backpack first, then every other game this word bank can run.
// ---------------------------------------------------------------------------
function openBackpackGame() {
  const topic = SCHOOL_OBJECTS_TOPIC;
  const games = gamesForTopic(topic).sort((a, b) => (a.id === 'backpack' ? -1 : b.id === 'backpack' ? 1 : 0));
  let active = 'backpack';
  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">🎒 School Objects</h3>
      <div class="game-picker" id="schoolGamePicker">
        ${games.map(g => `<button class="game-pick-btn ${g.id === active ? 'active' : ''}" data-game="${g.id}">${g.icon} ${g.label}</button>`).join('')}
      </div>
      <div class="game-mount" id="schoolGameMount"></div>
    </div>`, true);
  const mount = () => GameEngine.mount(document.getElementById('schoolGameMount'), topic, active);
  document.querySelectorAll('#schoolGamePicker .game-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      active = btn.dataset.game;
      document.querySelectorAll('#schoolGamePicker .game-pick-btn').forEach(b => b.classList.toggle('active', b === btn));
      mount();
    });
  });
  mount();
}

