/* ==========================================================================
   IGenglishschool — Describing Animals: drawings, habitats and word bank
   Loaded before games.js. The Animal Builder game itself lives in
   GameEngine; this file holds what it draws with.

   Every animal is drawn in a 200 x 160 box standing on y=150, from parts:
   draw(parts, c1, c2) only draws a long neck, a mane, wings… when that part
   is in `parts`, and paints with c1 (main colour) / c2 (second colour) —
   or a pale "not coloured yet" grey while the child hasn't picked them.
   ========================================================================== */

const AN_OUT = '#2e2b2e';
const AN_BLANK = '#ecebe8';
const AN_BLANK2 = '#d3d0cb';

const anDk = c => hsShade(c, -0.3);
const anLt = c => hsShade(c, 0.35);
const anEye = (x, y, r = 4) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${AN_OUT}" stroke-width="1.4"/><circle cx="${x + r * 0.2}" cy="${y + r * 0.15}" r="${r * 0.52}" fill="${AN_OUT}" stroke="none"/>`;
// A thick coloured line with an outline — tails, trunks, long necks.
const anTube = (d, color, w) =>
  `<path d="${d}" fill="none" stroke="${AN_OUT}" stroke-width="${w + 4}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
const anBody = inner => `<g stroke="${AN_OUT}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${inner}</g>`;

const AN_COLORS = [
  { name: 'red', hex: '#e5484d' },
  { name: 'orange', hex: '#f08a24' },
  { name: 'yellow', hex: '#f2bd2c' },
  { name: 'green', hex: '#5cae4a' },
  { name: 'blue', hex: '#3d7bd9' },
  { name: 'pink', hex: '#f27aa5' },
  { name: 'brown', hex: '#8b5e3c' },
  { name: 'grey', hex: '#9ea3a9' },
  { name: 'black', hex: '#3a363d' },
  { name: 'white', hex: '#f7f5f0' },
];
const anHex = name => (AN_COLORS.find(c => c.name === name) || {}).hex;

// The body parts the child can choose from. `say` is how the sentence
// names it ("It has a long neck"); `icon` is the picture on the card.
const AN_PARTS = [
  { id: 'tail', en: 'long tail', say: 'a long tail',
    icon: `<circle cx="16" cy="44" r="11" fill="#c9a77d"/>${anTube('M24,40 Q36,14 46,30 Q54,44 58,18', '#c9a77d', 6)}` },
  { id: 'neck', en: 'long neck', say: 'a long neck',
    icon: `<ellipse cx="42" cy="54" rx="17" ry="7" fill="#f2bd2c" stroke="${AN_OUT}" stroke-width="2"/>${anTube('M34,52 L26,14', '#f2bd2c', 8)}<ellipse cx="22" cy="12" rx="9" ry="6" fill="#f2bd2c" stroke="${AN_OUT}" stroke-width="2"/>` },
  { id: 'trunk', en: 'long trunk', say: 'a long trunk',
    icon: `<circle cx="28" cy="22" r="15" fill="#9ea3a9" stroke="${AN_OUT}" stroke-width="2"/>${anTube('M22,32 Q18,52 30,56 Q36,57 36,50', '#9ea3a9', 8)}${anEye(32, 18, 3)}` },
  { id: 'mane', en: 'mane', say: 'a mane',
    icon: `${Array.from({ length: 12 }, (_, i) => `<circle cx="${32 + 20 * Math.cos(i * Math.PI / 6)}" cy="${32 + 20 * Math.sin(i * Math.PI / 6)}" r="9" fill="#b8772a"/>`).join('')}<circle cx="32" cy="32" r="21" fill="#b8772a"/><circle cx="32" cy="33" r="13" fill="#f2bd2c" stroke="${AN_OUT}" stroke-width="2"/>${anEye(27, 30, 2.5)}${anEye(37, 30, 2.5)}` },
  { id: 'feathers', en: 'feathers', say: 'feathers',
    icon: `<path d="M18,56 Q14,30 40,8 Q50,30 26,52Z" fill="#3d7bd9" stroke="${AN_OUT}" stroke-width="2"/><path d="M16,60 L38,12" stroke="${AN_OUT}" stroke-width="2"/>${[20, 28, 36].map(y => `<path d="M${36 - (y - 12) * 0.45},${y} l8,-4" stroke="#fff" stroke-width="1.5"/>`).join('')}` },
  { id: 'wings', en: 'wings', say: 'wings',
    icon: `<path d="M30,34 Q14,8 2,16 Q6,34 30,40Z" fill="#7fb4ea" stroke="${AN_OUT}" stroke-width="2"/><path d="M34,34 Q50,8 62,16 Q58,34 34,40Z" fill="#7fb4ea" stroke="${AN_OUT}" stroke-width="2"/><ellipse cx="32" cy="40" rx="6" ry="10" fill="#3d7bd9" stroke="${AN_OUT}" stroke-width="2"/>` },
  { id: 'legs2', en: 'two legs', say: 'two legs',
    icon: `<ellipse cx="32" cy="18" rx="16" ry="12" fill="#f27aa5" stroke="${AN_OUT}" stroke-width="2"/><path d="M26,28 V52 M38,28 V52" stroke="#f08a24" stroke-width="4" stroke-linecap="round"/><path d="M20,54 H30 M32,54 H44" stroke="#f08a24" stroke-width="4" stroke-linecap="round"/>` },
  { id: 'legs4', en: 'four legs', say: 'four legs',
    icon: `${[10, 20, 40, 50].map(x => `<rect x="${x}" y="30" width="6" height="24" rx="3" fill="#c9a77d" stroke="${AN_OUT}" stroke-width="1.8"/>`).join('')}<ellipse cx="32" cy="28" rx="26" ry="11" fill="#c9a77d" stroke="${AN_OUT}" stroke-width="2"/>` },
  { id: 'fins', en: 'fins', say: 'fins',
    icon: `<path d="M44,32 L62,14 L58,32 L62,50Z" fill="#3d7bd9" stroke="${AN_OUT}" stroke-width="2"/><path d="M20,22 Q30,6 40,22Z" fill="#3d7bd9" stroke="${AN_OUT}" stroke-width="2"/><ellipse cx="28" cy="32" rx="20" ry="12" fill="#7fb4ea" stroke="${AN_OUT}" stroke-width="2"/>${anEye(16, 30, 2.5)}` },
  { id: 'shell', en: 'shell', say: 'a shell',
    icon: `<path d="M6,46 Q8,12 32,10 Q56,12 58,46Z" fill="#6f9a3e" stroke="${AN_OUT}" stroke-width="2"/><path d="M22,20 L32,16 L42,20 L42,32 L32,36 L22,32Z M8,40 H56 M22,32 L12,40 M42,32 L52,40" fill="none" stroke="#3f6322" stroke-width="2"/>` },
];
const anPart = id => AN_PARTS.find(p => p.id === id);

// Where each animal lives — the background of the last screen, the spot
// the animal stands on, and how the sentence says it.
const AN_HABITATS = {
  savanna: { say: 'It lives in the savanna.', ground: 214,
    bg: () => `
      <rect width="400" height="260" fill="#fbe3b0"/>
      <circle cx="322" cy="62" r="32" fill="#f9b44a"/>
      <rect y="168" width="400" height="92" fill="#e2c46a"/>
      <path d="M0,172 Q100,158 200,170 T400,166 V182 H0Z" fill="#d4b257"/>
      <path d="M74,170 Q78,120 70,96 M74,120 Q90,104 104,98" stroke="#7a5230" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="80" cy="92" rx="52" ry="14" fill="#5f8f3a"/><ellipse cx="104" cy="84" rx="30" ry="10" fill="#6fa245"/>
      ${[30, 150, 260, 350, 210].map(x => `<path d="M${x},236 l4,-14 M${x + 6},236 l0,-16 M${x + 12},236 l-4,-13" stroke="#b8962f" stroke-width="2.5" stroke-linecap="round"/>`).join('')}` },
  jungle: { say: 'It lives in the jungle.', ground: 222,
    bg: () => `
      <rect width="400" height="260" fill="#cfe9b6"/>
      ${[[20, '#3f8f3a'], [120, '#2f7a33'], [230, '#3f8f3a'], [340, '#2f7a33']].map(([x, c]) => `<ellipse cx="${x}" cy="60" rx="80" ry="58" fill="${c}"/>`).join('')}
      ${[60, 170, 290, 370].map(x => `<rect x="${x}" y="40" width="14" height="190" fill="#6b4a2b"/>`).join('')}
      ${[[90, 30], [200, 20], [320, 36]].map(([x, y]) => `<path d="M${x},${y} Q${x + 10},${y + 60} ${x - 6},${y + 110}" stroke="#4f9a3e" stroke-width="3" fill="none"/><ellipse cx="${x - 6}" cy="${y + 112}" rx="6" ry="3" fill="#5cae4a"/>`).join('')}
      <rect y="200" width="400" height="60" fill="#6fa84a"/>
      ${[0, 70, 300, 360].map(x => `<path d="M${x},232 Q${x + 20},180 ${x + 44},214 Q${x + 26},214 ${x},232Z" fill="#3f8f3a"/>`).join('')}` },
  river: { say: 'It lives in the river.', ground: 206,
    bg: () => `
      <rect width="400" height="260" fill="#d4ecf7"/>
      <rect y="150" width="400" height="110" fill="#7cb85a"/>
      <path d="M0,214 Q120,200 240,214 T400,210 V260 H0Z" fill="#4f9fd0"/>
      <path d="M30,232 q20,-6 40,0 M180,244 q20,-6 40,0 M300,230 q20,-6 40,0" stroke="#bfe3f5" stroke-width="3" fill="none"/>
      ${[20, 34, 360, 374].map(x => `<path d="M${x},208 V170" stroke="#4d7a2a" stroke-width="3"/><ellipse cx="${x}" cy="170" rx="3.5" ry="9" fill="#7a5230"/>`).join('')}` },
  forest: { say: 'It lives in the forest.', ground: 222,
    bg: () => `
      <rect width="400" height="260" fill="#e3f2d8"/>
      ${[[40, 70], [130, 50], [300, 60], [380, 80]].map(([x, y]) => `<rect x="${x - 6}" y="${y + 40}" width="12" height="${180 - y}" fill="#7a5230"/><circle cx="${x}" cy="${y + 20}" r="38" fill="#4f9a3e"/>`).join('')}
      ${[200, 222, 244].map(x => `<rect x="${x}" y="30" width="10" height="200" fill="#8fbf4a"/>${[70, 110, 150, 190].map(y => `<rect x="${x - 1}" y="${y}" width="12" height="3" fill="#6f9a3e"/>`).join('')}<path d="M${x + 10},${90} q16,-8 24,0 q-12,6 -24,0Z" fill="#6fae3e"/>`).join('')}
      <rect y="206" width="400" height="54" fill="#7cb85a"/>` },
  ice: { say: 'It lives on the ice.', ground: 204,
    bg: () => `
      <rect width="400" height="260" fill="#dff1fb"/>
      <circle cx="80" cy="54" r="22" fill="#fff6c9"/>
      <path d="M200,170 L250,84 L290,120 L320,70 L380,170Z" fill="#f4fbff" stroke="#bcdcee" stroke-width="2"/>
      <path d="M250,84 L262,124 L290,120 M320,70 L326,120" stroke="#cfe6f3" stroke-width="2" fill="none"/>
      <rect y="168" width="400" height="44" fill="#5aa7d6"/>
      <path d="M0,198 H400 V260 H0Z" fill="#f4fbff"/>
      <path d="M0,198 Q60,190 120,198 T260,196 T400,198" stroke="#bcdcee" stroke-width="2" fill="none"/>` },
  sea: { say: 'It lives in the sea.', water: true,
    bg: () => `
      <rect width="400" height="260" fill="#2f7fb8"/>
      <rect width="400" height="150" fill="#4f9fd0"/><rect width="400" height="70" fill="#7cc2e6"/>
      <path d="M60,0 L110,260 L150,260 L90,0Z M240,0 L280,260 L300,260 L260,0Z" fill="#fff" opacity=".07"/>
      <path d="M0,236 Q100,224 200,236 T400,232 V260 H0Z" fill="#f2d49b"/>
      ${[30, 60, 340, 372].map(x => `<path d="M${x},240 Q${x - 10},210 ${x},190 Q${x + 10},170 ${x},150" stroke="#3f9e5a" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}
      ${[[300, 60, 5], [312, 40, 3.5], [306, 22, 2.5], [90, 90, 4], [98, 70, 2.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#d8f0fa" stroke-width="1.5"/>`).join('')}` },
  pond: { say: 'It lives in the pond.', ground: 226,
    bg: () => `
      <rect width="400" height="260" fill="#d4ecf7"/>
      <rect y="140" width="400" height="120" fill="#8cc56c"/>
      <ellipse cx="290" cy="196" rx="120" ry="34" fill="#5aa7d6"/>
      ${[[250, 192], [312, 204], [340, 186]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="5" fill="#4f9a3e"/>`).join('')}
      <circle cx="318" cy="202" r="4" fill="#f27aa5"/>
      ${[170, 182, 194].map(x => `<path d="M${x},196 V150" stroke="#4d7a2a" stroke-width="3"/><ellipse cx="${x}" cy="150" rx="3.5" ry="9" fill="#7a5230"/>`).join('')}` },
  past: { say: 'It lived a long, long time ago!', ground: 222,
    bg: () => `
      <rect width="400" height="260" fill="#f7c58a"/>
      <path d="M250,190 L310,70 L330,70 L390,190Z" fill="#7a5a44"/>
      <path d="M310,70 Q320,40 330,70Z" fill="#e5484d"/><path d="M314,72 L306,110 M326,72 L334,104" stroke="#f08a24" stroke-width="4"/>
      <circle cx="300" cy="40" r="10" fill="#bbb" opacity=".7"/><circle cx="318" cy="24" r="14" fill="#bbb" opacity=".6"/>
      <rect y="190" width="400" height="70" fill="#b7a26a"/>
      ${[20, 80, 200].map(x => `<path d="M${x},228 Q${x - 10},190 ${x - 26},180 M${x},228 Q${x + 4},186 ${x + 22},176 M${x},228 Q${x},184 ${x - 2},168" stroke="#4f8a32" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}` },
};

const ANIMALS = [
  { id: 'lion', en: 'Lion', pt: 'Leão', size: 'big', colors: ['yellow'], parts: ['tail', 'mane', 'legs4'], habitat: 'savanna',
    draw: (p, c1) => {
      const a = c1 || AN_BLANK, d = c1 ? '#b8772a' : AN_BLANK2;
      return anBody(`
        ${p.tail ? anTube('M146,92 Q172,98 172,70', a, 5) + `<ellipse cx="172" cy="64" rx="7" ry="9" fill="${d}"/>` : ''}
        ${p.legs4 ? [64, 80, 116, 132].map(x => `<rect x="${x}" y="104" width="13" height="44" rx="5" fill="${a}"/>`).join('') : ''}
        <ellipse cx="100" cy="96" rx="50" ry="27" fill="${a}"/>
        ${p.mane ? Array.from({ length: 14 }, (_, i) => `<circle cx="${56 + 27 * Math.cos(i * Math.PI / 7)}" cy="${72 + 27 * Math.sin(i * Math.PI / 7)}" r="9" fill="${d}"/>`).join('') + `<circle cx="56" cy="72" r="28" fill="${d}" stroke="none"/>` : ''}
        <circle cx="42" cy="55" r="6" fill="${a}"/><circle cx="70" cy="55" r="6" fill="${a}"/>
        <circle cx="56" cy="73" r="20" fill="${a}"/>
        ${anEye(49, 69)}${anEye(63, 69)}
        <path d="M52,78 H60 L56,83Z" fill="${AN_OUT}"/>
        <path d="M50,86 Q56,90 62,86" fill="none"/>`);
    } },
  { id: 'tiger', en: 'Tiger', pt: 'Tigre', size: 'big', colors: ['orange', 'black'], parts: ['tail', 'legs4'], habitat: 'jungle',
    draw: (p, c1, c2) => {
      const a = c1 || AN_BLANK, s = c2 || AN_BLANK2;
      return anBody(`
        ${p.tail ? anTube('M146,92 Q174,96 170,66', a, 6) : ''}
        ${p.legs4 ? [64, 80, 116, 132].map(x => `<rect x="${x}" y="104" width="13" height="44" rx="5" fill="${a}"/>`).join('') : ''}
        <ellipse cx="100" cy="96" rx="50" ry="27" fill="${a}"/>
        ${[78, 94, 110, 126].map(x => `<path d="M${x},71 Q${x + 6},84 ${x - 2},96" fill="none" stroke="${s}" stroke-width="5"/>`).join('')}
        <path d="M60,98 Q70,110 92,112" fill="none" stroke="${anLt(a)}" stroke-width="0"/>
        <circle cx="42" cy="55" r="7" fill="${a}"/><circle cx="70" cy="55" r="7" fill="${a}"/>
        <circle cx="56" cy="73" r="21" fill="${a}"/>
        <path d="M50,56 L52,63 M56,54 V62 M62,56 L60,63" stroke="${s}" stroke-width="3"/>
        <ellipse cx="56" cy="82" rx="10" ry="7" fill="#fff" stroke="none"/>
        ${anEye(49, 70)}${anEye(63, 70)}
        <path d="M52,79 H60 L56,84Z" fill="${AN_OUT}"/>`);
    } },
  { id: 'giraffe', en: 'Giraffe', pt: 'Girafa', size: 'big', colors: ['yellow', 'brown'], parts: ['neck', 'tail', 'legs4'], habitat: 'savanna',
    draw: (p, c1, c2) => {
      const a = c1 || AN_BLANK, s = c2 || AN_BLANK2;
      const [hx, hy] = p.neck ? [62, 20] : [78, 70];
      return anBody(`
        ${p.tail ? `<path d="M152,84 Q160,100 162,120" fill="none" stroke="${AN_OUT}" stroke-width="3"/><ellipse cx="162" cy="124" rx="4" ry="6" fill="${s}"/>` : ''}
        ${p.legs4 ? [88, 102, 126, 140].map(x => `<rect x="${x}" y="94" width="9" height="54" rx="3" fill="${a}"/>`).join('') : ''}
        <ellipse cx="116" cy="86" rx="42" ry="19" fill="${a}"/>
        ${p.neck ? `<path d="M82,82 L62,24 L76,20 L100,76Z" fill="${a}"/>${[[76, 44], [84, 62], [72, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${s}" stroke="none"/>`).join('')}` : ''}
        ${[[104, 80], [122, 92], [138, 80], [114, 96], [92, 90], [148, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${s}" stroke="none"/>`).join('')}
        <path d="M${hx + 4},${hy - 8} V${hy - 18} M${hx + 12},${hy - 6} V${hy - 16}" stroke="${AN_OUT}" stroke-width="2.5"/>
        <circle cx="${hx + 4}" cy="${hy - 19}" r="3" fill="${s}"/><circle cx="${hx + 12}" cy="${hy - 17}" r="3" fill="${s}"/>
        <ellipse cx="${hx + 18}" cy="${hy - 3}" rx="6" ry="3" fill="${a}"/>
        <ellipse cx="${hx}" cy="${hy}" rx="17" ry="11" fill="${a}"/>
        ${anEye(hx + 3, hy - 3, 3.5)}
        <circle cx="${hx - 12}" cy="${hy + 2}" r="1.6" fill="${AN_OUT}"/>`);
    } },
  { id: 'crocodile', en: 'Crocodile', pt: 'Crocodilo', size: 'big', colors: ['green'], parts: ['tail', 'legs4'], habitat: 'river',
    draw: (p, c1) => {
      const a = c1 || AN_BLANK;
      return anBody(`
        ${p.tail ? `<path d="M144,112 Q178,118 198,136 Q170,132 142,128Z" fill="${a}"/>` : ''}
        ${p.legs4 ? [70, 86, 118, 134].map(x => `<rect x="${x}" y="122" width="10" height="24" rx="4" fill="${a}"/><ellipse cx="${x + 6}" cy="146" rx="8" ry="3.5" fill="${a}"/>`).join('') : ''}
        <ellipse cx="100" cy="120" rx="48" ry="14" fill="${a}"/>
        ${[76, 90, 104, 118, 132].map(x => `<path d="M${x},107 l5,-7 l5,7Z" fill="${c1 ? anDk(a) : AN_BLANK2}"/>`).join('')}
        <path d="M60,110 Q40,107 10,114 Q8,124 14,127 L60,130Z" fill="${a}"/>
        ${[18, 26, 34, 42, 50].map(x => `<path d="M${x},121 l3,5 l3,-5Z" fill="#fff" stroke-width="1"/>`).join('')}
        <path d="M12,121 H58" fill="none"/>
        <circle cx="56" cy="106" r="7" fill="${a}"/>${anEye(56, 105, 3.5)}
        <circle cx="16" cy="114" r="1.6" fill="${AN_OUT}"/>`);
    } },
  { id: 'elephant', en: 'Elephant', pt: 'Elefante', size: 'big', colors: ['grey'], parts: ['trunk', 'legs4'], habitat: 'savanna',
    draw: (p, c1) => {
      const a = c1 || AN_BLANK;
      return anBody(`
        <path d="M166,84 L172,104" stroke="${AN_OUT}" stroke-width="2.5"/>
        ${p.legs4 ? [80, 100, 126, 146].map(x => `<rect x="${x}" y="104" width="17" height="44" rx="5" fill="${a}"/>`).join('') : ''}
        <ellipse cx="118" cy="86" rx="50" ry="33" fill="${a}"/>
        ${p.trunk ? anTube('M46,86 Q36,112 40,132 Q42,141 50,138', a, 11) : `<ellipse cx="42" cy="84" rx="6" ry="8" fill="${a}"/>`}
        <circle cx="64" cy="72" r="26" fill="${a}"/>
        <path d="M50,92 Q44,100 40,98" fill="none" stroke="#fff" stroke-width="4"/>
        <ellipse cx="84" cy="74" rx="17" ry="22" fill="${c1 ? hsShade(a, -0.12) : AN_BLANK2}"/>
        ${anEye(56, 66)}`);
    } },
  { id: 'frog', en: 'Frog', pt: 'Sapo', size: 'small', colors: ['green'], parts: ['legs4'], habitat: 'jungle',
    draw: (p, c1) => {
      const a = c1 || AN_BLANK;
      return anBody(`
        ${p.legs4 ? `
          <ellipse cx="70" cy="134" rx="20" ry="10" fill="${a}"/><ellipse cx="130" cy="134" rx="20" ry="10" fill="${a}"/>
          <ellipse cx="56" cy="146" rx="12" ry="4" fill="${a}"/><ellipse cx="144" cy="146" rx="12" ry="4" fill="${a}"/>` : ''}
        <ellipse cx="100" cy="118" rx="34" ry="24" fill="${a}"/>
        ${p.legs4 ? `<rect x="84" y="128" width="7" height="18" rx="3" fill="${a}"/><rect x="109" y="128" width="7" height="18" rx="3" fill="${a}"/>
          <ellipse cx="86" cy="147" rx="7" ry="3" fill="${a}"/><ellipse cx="114" cy="147" rx="7" ry="3" fill="${a}"/>` : ''}
        <ellipse cx="100" cy="124" rx="20" ry="12" fill="${c1 ? anLt(a) : '#f5f4f2'}" stroke="none"/>
        <circle cx="84" cy="96" r="11" fill="${a}"/><circle cx="116" cy="96" r="11" fill="${a}"/>
        ${anEye(84, 95, 6)}${anEye(116, 95, 6)}
        <path d="M84,112 Q100,122 116,112" fill="none"/>
        <circle cx="76" cy="112" r="3.5" fill="#f27aa5" stroke="none" opacity=".6"/><circle cx="124" cy="112" r="3.5" fill="#f27aa5" stroke="none" opacity=".6"/>`);
    } },
  { id: 'bird', en: 'Bird', pt: 'Pássaro', size: 'small', colors: ['blue'], parts: ['feathers', 'wings', 'legs2'], habitat: 'forest',
    draw: (p, c1) => {
      const a = c1 || AN_BLANK, d = c1 ? anDk(a) : AN_BLANK2;
      return anBody(`
        ${p.legs2 ? `<path d="M94,112 V144 M106,112 V144 M88,146 H100 M100,146 H112" stroke="#f08a24" stroke-width="3"/>` : ''}
        ${p.feathers ? [-28, -8, 12].map(r => `<ellipse cx="58" cy="96" rx="22" ry="7" fill="${d}" transform="rotate(${r} 74 96)"/>`).join('') : ''}
        <ellipse cx="100" cy="94" rx="31" ry="23" fill="${a}"/>
        ${p.feathers ? [[96, 100], [108, 104], [102, 110]].map(([x, y]) => `<path d="M${x - 5},${y} q5,5 10,0" fill="none" stroke="${d}" stroke-width="1.8"/>`).join('') : ''}
        ${p.wings ? `<path d="M96,88 Q74,52 58,62 Q66,92 104,98Z" fill="${d}"/>` : ''}
        ${p.feathers ? `<ellipse cx="120" cy="54" rx="3" ry="8" fill="${d}" transform="rotate(-20 120 60)"/><ellipse cx="126" cy="52" rx="3" ry="8" fill="${d}"/>` : ''}
        <circle cx="126" cy="70" r="16" fill="${a}"/>
        <path d="M140,66 L158,72 L140,78Z" fill="#f2bd2c"/>
        ${anEye(130, 66)}`);
    } },
  { id: 'toucan', en: 'Toucan', pt: 'Tucano', size: 'small', colors: ['black', 'orange'], parts: ['feathers', 'wings', 'legs2'], habitat: 'jungle',
    draw: (p, c1, c2) => {
      const a = c1 || AN_BLANK, b = c2 || AN_BLANK2;
      return anBody(`
        ${p.legs2 ? `<path d="M90,124 V142 M102,124 V142 M84,144 H96 M96,144 H108" stroke="#5a8fd0" stroke-width="3"/>` : ''}
        ${p.feathers ? `<path d="M80,116 L70,150 L86,150 L92,118Z" fill="${a}"/>` : ''}
        <ellipse cx="96" cy="96" rx="26" ry="32" fill="${a}"/>
        <ellipse cx="110" cy="80" rx="11" ry="13" fill="#fff"/>
        ${p.feathers ? [[92, 102], [98, 112], [88, 116]].map(([x, y]) => `<path d="M${x - 5},${y} q5,5 10,0" fill="none" stroke="#777" stroke-width="1.8"/>`).join('') : ''}
        ${p.wings ? `<ellipse cx="86" cy="98" rx="14" ry="24" fill="${c1 ? hsShade(a, 0.2) : AN_BLANK2}" transform="rotate(12 86 98)"/>` : ''}
        <circle cx="110" cy="66" r="15" fill="${a}"/>
        <path d="M122,58 Q158,54 172,72 Q152,82 122,76Z" fill="${b}"/>
        <path d="M124,67 Q150,66 168,72" fill="none" stroke-width="1.5"/>
        <circle cx="113" cy="63" r="6" fill="#5a8fd0" stroke="none"/>${anEye(113, 63, 3.5)}`);
    } },
  { id: 'panda', en: 'Panda', pt: 'Panda', size: 'big', colors: ['black', 'white'], parts: ['legs4'], habitat: 'forest',
    draw: (p, c1, c2) => {
      // c1 = black (patches, legs), c2 = white (body) — the order the child is likely to say it.
      const k = c1 || AN_BLANK2, w = c2 || AN_BLANK;
      return anBody(`
        ${p.legs4 ? `<ellipse cx="74" cy="140" rx="16" ry="10" fill="${k}"/><ellipse cx="126" cy="140" rx="16" ry="10" fill="${k}"/>` : ''}
        <ellipse cx="100" cy="112" rx="35" ry="33" fill="${w}"/>
        ${p.legs4 ? `<ellipse cx="72" cy="106" rx="9" ry="20" fill="${k}" transform="rotate(25 72 106)"/><ellipse cx="128" cy="106" rx="9" ry="20" fill="${k}" transform="rotate(-25 128 106)"/>` : ''}
        <circle cx="78" cy="42" r="10" fill="${k}"/><circle cx="122" cy="42" r="10" fill="${k}"/>
        <circle cx="100" cy="64" r="28" fill="${w}"/>
        <ellipse cx="88" cy="62" rx="7" ry="9" fill="${k}" transform="rotate(25 88 62)" stroke="none"/>
        <ellipse cx="112" cy="62" rx="7" ry="9" fill="${k}" transform="rotate(-25 112 62)" stroke="none"/>
        <circle cx="89" cy="61" r="2.6" fill="#fff" stroke="none"/><circle cx="111" cy="61" r="2.6" fill="#fff" stroke="none"/>
        <ellipse cx="100" cy="74" rx="5" ry="3.5" fill="${AN_OUT}"/>
        <path d="M95,80 Q100,84 105,80" fill="none"/>`);
    } },
  { id: 'penguin', en: 'Penguin', pt: 'Pinguim', size: 'small', colors: ['black', 'white'], parts: ['feathers', 'wings', 'legs2'], habitat: 'ice',
    draw: (p, c1, c2) => {
      const k = c1 || AN_BLANK2, w = c2 || AN_BLANK;
      return anBody(`
        ${p.legs2 ? `<ellipse cx="88" cy="146" rx="11" ry="5" fill="#f08a24"/><ellipse cx="112" cy="146" rx="11" ry="5" fill="#f08a24"/>` : ''}
        ${p.feathers ? `<path d="M94,136 L100,150 L106,136Z" fill="${k}"/>` : ''}
        <ellipse cx="100" cy="92" rx="32" ry="50" fill="${k}"/>
        ${p.wings ? `<ellipse cx="68" cy="98" rx="8" ry="26" fill="${k}" transform="rotate(16 68 98)"/><ellipse cx="132" cy="98" rx="8" ry="26" fill="${k}" transform="rotate(-16 132 98)"/>` : ''}
        <ellipse cx="100" cy="104" rx="22" ry="36" fill="${w}"/>
        ${p.feathers ? [[92, 100], [108, 100], [100, 114], [92, 126], [108, 126]].map(([x, y]) => `<path d="M${x - 4},${y} l4,4 l4,-4" fill="none" stroke="#bbb" stroke-width="1.6"/>`).join('') + `<path d="M94,44 Q100,34 106,44" fill="none" stroke-width="3"/>` : ''}
        <circle cx="90" cy="66" r="6" fill="#fff" stroke="none"/><circle cx="110" cy="66" r="6" fill="#fff" stroke="none"/>
        ${anEye(90, 66, 3.5)}${anEye(110, 66, 3.5)}
        <path d="M94,74 L106,74 L100,82Z" fill="#f08a24"/>`);
    } },
  { id: 'turtle', en: 'Turtle', pt: 'Tartaruga', size: 'small', colors: ['green'], parts: ['legs4', 'shell'], habitat: 'pond',
    draw: (p, c1) => {
      const a = c1 || AN_BLANK, d = c1 ? anDk(a) : AN_BLANK2;
      return anBody(`
        ${p.legs4 ? [68, 86, 110, 128].map(x => `<rect x="${x}" y="122" width="13" height="24" rx="6" fill="${a}"/>`).join('') : ''}
        <path d="M140,126 L156,132 L140,134Z" fill="${a}"/>
        ${p.shell
          ? `<path d="M58,130 Q60,80 100,78 Q140,80 142,130Z" fill="${c1 ? hsShade(a, -0.15) : AN_BLANK2}"/>
             <path d="M86,94 L100,88 L114,94 L114,110 L100,116 L86,110Z M64,118 H136 M86,110 L72,118 M114,110 L128,118 M100,88 V80 M86,94 L70,98 M114,94 L130,98" fill="none" stroke="${d}" stroke-width="2.2"/>
             <rect x="56" y="126" width="88" height="7" rx="3.5" fill="${a}"/>`
          : `<ellipse cx="100" cy="122" rx="40" ry="17" fill="${c1 ? anLt(a) : AN_BLANK}"/>`}
        <path d="M58,122 Q50,118 46,112" fill="none" stroke="${AN_OUT}" stroke-width="13"/><path d="M58,122 Q50,118 46,112" fill="none" stroke="${a}" stroke-width="9"/>
        <circle cx="42" cy="108" r="13" fill="${a}"/>
        ${anEye(38, 104, 3.5)}
        <path d="M32,114 Q38,118 44,114" fill="none"/>`);
    } },
  { id: 'dinosaur', en: 'Dinosaur', pt: 'Dinossauro', size: 'big', colors: ['green'], parts: ['neck', 'tail', 'legs4'], habitat: 'past',
    draw: (p, c1) => {
      const a = c1 || AN_BLANK, d = c1 ? anDk(a) : AN_BLANK2;
      const [hx, hy] = p.neck ? [42, 30] : [80, 82];
      return anBody(`
        ${p.tail ? `<path d="M146,92 Q182,104 198,134 Q172,120 142,112Z" fill="${a}"/>` : ''}
        ${p.legs4 ? [86, 102, 128, 144].map(x => `<rect x="${x}" y="106" width="15" height="42" rx="5" fill="${a}"/>`).join('') : ''}
        <ellipse cx="116" cy="96" rx="42" ry="25" fill="${a}"/>
        ${[[106, 84], [122, 80], [138, 88]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${d}" stroke="none"/>`).join('')}
        ${p.neck ? anTube('M90,92 Q78,46 46,34', a, 16) : ''}
        <ellipse cx="${hx}" cy="${hy}" rx="17" ry="11" fill="${a}"/>
        ${anEye(hx - 2, hy - 3, 3.5)}
        <path d="M${hx - 14},${hy + 3} Q${hx - 6},${hy + 8} ${hx + 2},${hy + 4}" fill="none"/>`);
    } },
  { id: 'capybara', en: 'Capybara', pt: 'Capivara', size: 'big', colors: ['brown'], parts: ['legs4'], habitat: 'river',
    draw: (p, c1) => {
      const a = c1 || AN_BLANK;
      return anBody(`
        ${p.legs4 ? [74, 90, 122, 138].map(x => `<rect x="${x}" y="116" width="12" height="32" rx="4" fill="${a}"/>`).join('') : ''}
        <ellipse cx="110" cy="100" rx="50" ry="30" fill="${a}"/>
        <ellipse cx="68" cy="74" rx="6" ry="5" fill="${a}"/>
        <rect x="28" y="76" width="54" height="40" rx="18" fill="${a}"/>
        ${anEye(54, 88, 3.5)}
        <ellipse cx="34" cy="94" rx="5" ry="4" fill="${AN_OUT}"/>
        <path d="M32,106 Q38,109 44,106" fill="none"/>`);
    } },
  { id: 'shark', en: 'Shark', pt: 'Tubarão', size: 'big', colors: ['grey'], parts: ['fins'], habitat: 'sea',
    draw: (p, c1) => {
      const a = c1 || AN_BLANK;
      return anBody(`
        ${p.fins ? `<path d="M96,64 L114,32 L124,66Z" fill="${a}"/><path d="M166,90 L196,58 L188,92 L196,124Z" fill="${a}"/>` : ''}
        <path d="M14,92 Q60,58 120,62 Q160,66 172,90 Q160,112 120,116 Q60,120 14,92Z" fill="${a}"/>
        <path d="M24,96 Q70,118 150,106 Q100,126 24,96Z" fill="#fff" stroke="none"/>
        ${p.fins ? `<path d="M88,104 L74,132 L108,110Z" fill="${a}"/>` : ''}
        ${[66, 72, 78].map(x => `<path d="M${x},84 Q${x - 3},92 ${x},100" fill="none" stroke-width="1.8"/>`).join('')}
        ${anEye(42, 84, 3.5)}
        <path d="M22,98 Q32,102 44,100" fill="none"/>`);
    } },
  { id: 'fish', en: 'Fish', pt: 'Peixe', size: 'small', colors: ['orange'], parts: ['fins'], habitat: 'sea',
    draw: (p, c1) => {
      const a = c1 || AN_BLANK, d = c1 ? anDk(a) : AN_BLANK2;
      return anBody(`
        ${p.fins ? `<path d="M138,90 L172,62 L166,90 L172,118Z" fill="${a}"/><path d="M80,66 Q100,42 122,68Z" fill="${a}"/><path d="M90,114 L98,132 L112,114Z" fill="${a}"/>` : ''}
        <ellipse cx="96" cy="90" rx="46" ry="28" fill="${a}"/>
        ${[[96, 84], [112, 84], [104, 96], [120, 96], [88, 96]].map(([x, y]) => `<path d="M${x},${y - 6} q6,6 0,12" fill="none" stroke="${d}" stroke-width="1.8"/>`).join('')}
        <path d="M76,70 Q86,90 76,110" fill="none" stroke="${d}"/>
        ${anEye(64, 84, 5)}
        <path d="M52,98 Q56,101 60,98" fill="none"/>`);
    } },
  { id: 'monkey', en: 'Monkey', pt: 'Macaco', size: 'small', colors: ['brown'], parts: ['tail', 'legs2'], habitat: 'jungle',
    draw: (p, c1) => {
      const a = c1 || AN_BLANK, f = '#f1d2a7';
      return anBody(`
        ${p.tail ? anTube('M114,114 Q152,124 150,92 Q148,68 130,74', a, 6) : ''}
        ${p.legs2 ? `<rect x="86" y="112" width="11" height="34" rx="5" fill="${a}"/><rect x="103" y="112" width="11" height="34" rx="5" fill="${a}"/>
          <ellipse cx="90" cy="147" rx="9" ry="4" fill="${f}"/><ellipse cx="110" cy="147" rx="9" ry="4" fill="${f}"/>` : ''}
        ${anTube('M84,88 Q70,100 72,116', a, 8)}${anTube('M116,88 Q130,100 128,116', a, 8)}
        <ellipse cx="100" cy="98" rx="22" ry="27" fill="${a}"/>
        <ellipse cx="100" cy="104" rx="12" ry="15" fill="${f}" stroke="none"/>
        <circle cx="78" cy="52" r="9" fill="${a}"/><circle cx="122" cy="52" r="9" fill="${a}"/>
        <circle cx="78" cy="52" r="5" fill="${f}" stroke="none"/><circle cx="122" cy="52" r="5" fill="${f}" stroke="none"/>
        <circle cx="100" cy="54" r="22" fill="${a}"/>
        <ellipse cx="100" cy="61" rx="15" ry="13" fill="${f}" stroke="none"/>
        ${anEye(94, 52, 3.5)}${anEye(106, 52, 3.5)}
        <circle cx="97" cy="62" r="1.3" fill="${AN_OUT}" stroke="none"/><circle cx="103" cy="62" r="1.3" fill="${AN_OUT}" stroke="none"/>
        <path d="M94,67 Q100,71 106,67" fill="none"/>`);
    } },
];

const animalById = id => ANIMALS.find(a => a.id === id);
const AN_ALIASES = { toucan: ['toucan', 'tucano'], dinosaur: ['dinosaur', 'dino'], capybara: ['capybara', 'capivara'], fish: ['fish', 'fishes'], bird: ['bird'] };

function animalFor(word) {
  const key = String((word && word.en) || '').toLowerCase().trim().replace(/^(a|an|the)\s+/, '');
  return ANIMALS.find(a => a.en.toLowerCase() === key || key === `${a.en.toLowerCase()}s` || (AN_ALIASES[a.id] || []).includes(key)) || null;
}

// The whole animal (every part, its real colours) — the picking grid and
// the word bank's pictures.
function animalFullSVG(animal, cls) {
  const parts = Object.fromEntries(animal.parts.map(p => [p, true]));
  return `<svg class="${cls || ''}" viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${animal.draw(parts, anHex(animal.colors[0]), anHex(animal.colors[1]))}</svg>`;
}

// The Animal Builder fits any topic with three or more of these animals.
function isAnimalTopic(topic) {
  return (topic.words || []).filter(w => animalFor(w)).length >= 3;
}

const ANIMALS_TOPIC = {
  id: 'describing-animals',
  title: 'Describing Animals',
  emoji: '🦁',
  words: ANIMALS.map(a => ({
    id: `an_${a.id}`, en: a.en, pt: a.pt, emoji: '🐾',
    image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(animalFullSVG(a).replace(' class=""', '')),
  })),
};

// ---------------------------------------------------------------------------
// Opening it from the Game Maker: the Animal Builder first, then every
// other game this word bank can run.
// ---------------------------------------------------------------------------
function openAnimalGame() {
  const topic = ANIMALS_TOPIC;
  const games = gamesForTopic(topic).sort((a, b) => (a.id === 'animal' ? -1 : b.id === 'animal' ? 1 : 0));
  let active = 'animal';
  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">🦁 Describing Animals</h3>
      <div class="game-picker" id="animalGamePicker">
        ${games.map(g => `<button class="game-pick-btn ${g.id === active ? 'active' : ''}" data-game="${g.id}">${g.icon} ${g.label}</button>`).join('')}
      </div>
      <div class="game-mount" id="animalGameMount"></div>
    </div>`, true);
  const mount = () => GameEngine.mount(document.getElementById('animalGameMount'), topic, active);
  document.querySelectorAll('#animalGamePicker .game-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      active = btn.dataset.game;
      document.querySelectorAll('#animalGamePicker .game-pick-btn').forEach(b => b.classList.toggle('active', b === btn));
      mount();
    });
  });
  mount();
}
