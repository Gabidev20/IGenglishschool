/* ==========================================================================
   IGenglishschool — Parts of the House: rooms, furniture and the word bank
   Loaded before games.js. The House game itself (pick a room on the house,
   then drag its furniture and utensils in) lives in GameEngine; this file
   holds what it draws with, plus a ready-made "Parts of the House" topic.

   Every room is a 400 x 260 scene (wall down to y=190, then the floor).
   Each object is drawn straight into the scene at its own place, and its
   `crop` is the box that frames it on its card.
   ========================================================================== */

function hsShade(hex, amt) {
  const n = parseInt(String(hex).slice(1), 16);
  const mix = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
const hsDk = c => hsShade(c, -0.28);
const hsLt = c => hsShade(c, 0.4);

// Furniture and utensils outside the bedroom come in these four.
const HOUSE_NEUTRALS = { beige: '#d6c1a0', brown: '#8b5e3c', grey: '#a3a8ae', black: '#3b3a40' };

// The bedroom is the child's own room: every object can be painted.
const HOUSE_COLORS = [
  { name: 'red', hex: '#e5484d' },
  { name: 'orange', hex: '#f08a24' },
  { name: 'yellow', hex: '#f2bd2c' },
  { name: 'green', hex: '#3fae8a' },
  { name: 'blue', hex: '#3d7bd9' },
  { name: 'purple', hex: '#8e5fc2' },
  { name: 'pink', hex: '#f27aa5' },
  { name: 'white', hex: '#f7f5f0' },
];

const N = HOUSE_NEUTRALS;

const HOUSE_ROOMS = [
  // ------------------------------------------------------------------ BEDROOM
  {
    id: 'bedroom', en: 'Bedroom', pt: 'Quarto', paint: true,
    bg: () => `
      <rect width="400" height="190" fill="#efe6f3"/>
      <rect y="190" width="400" height="70" fill="#d9b98f"/>
      ${[206, 224, 242].map(y => `<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#c7a578" stroke-width="1.5"/>`).join('')}
      <rect y="186" width="400" height="6" fill="#d8c6e0"/>
      <rect x="132" y="28" width="66" height="58" rx="3" fill="#cfe9f7" stroke="#fff" stroke-width="4"/>
      <line x1="165" y1="28" x2="165" y2="86" stroke="#fff" stroke-width="3"/>
      <line x1="132" y1="57" x2="198" y2="57" stroke="#fff" stroke-width="3"/>`,
    items: [
      { id: 'curtains', en: 'Curtains', pt: 'Cortinas', color: '#f27aa5', crop: '114 14 102 84',
        draw: c => `
          <rect x="118" y="20" width="94" height="4" rx="2" fill="#8b5e3c"/>
          <path d="M120,23 H144 Q138,58 148,92 H120Z" fill="${c}"/>
          <path d="M210,23 H186 Q192,58 182,92 H210Z" fill="${c}"/>
          <path d="M128,26 Q126,60 130,90 M202,26 Q204,60 200,90" stroke="${hsDk(c)}" stroke-width="2" fill="none" opacity=".5"/>` },
      { id: 'wardrobe', en: 'Wardrobe', pt: 'Guarda-roupa', color: '#3d7bd9', crop: '286 36 106 158',
        draw: c => `
          <rect x="292" y="42" width="94" height="9" rx="2" fill="${hsDk(c)}"/>
          <rect x="296" y="50" width="86" height="136" rx="4" fill="${c}"/>
          <line x1="339" y1="54" x2="339" y2="184" stroke="${hsDk(c)}" stroke-width="2.5"/>
          <circle cx="332" cy="120" r="3.5" fill="${hsDk(c)}"/><circle cx="346" cy="120" r="3.5" fill="${hsDk(c)}"/>
          <rect x="300" y="186" width="8" height="5" fill="${hsDk(c)}"/><rect x="370" y="186" width="8" height="5" fill="${hsDk(c)}"/>` },
      { id: 'bed', en: 'Bed', pt: 'Cama', color: '#8e5fc2', crop: '34 90 172 104',
        draw: c => `
          <rect x="40" y="96" width="16" height="80" rx="5" fill="${c}"/>
          <rect x="190" y="128" width="12" height="48" rx="4" fill="${c}"/>
          <rect x="40" y="152" width="162" height="18" rx="3" fill="${hsDk(c)}"/>
          <rect x="44" y="170" width="7" height="16" fill="${hsDk(c)}"/><rect x="191" y="170" width="7" height="16" fill="${hsDk(c)}"/>
          <rect x="56" y="140" width="134" height="13" rx="3" fill="#fbfaf7"/>
          <rect x="98" y="133" width="94" height="24" rx="5" fill="${hsLt(c)}"/>
          <path d="M104,140 H186" stroke="${c}" stroke-width="2" opacity=".5"/>` },
      { id: 'pillow', en: 'Pillow', pt: 'Travesseiro', color: '#f7f5f0', crop: '54 116 48 32',
        draw: c => `
          <rect x="60" y="124" width="36" height="17" rx="8" fill="${c}" stroke="${hsDk(c)}" stroke-width="1.5"/>
          <path d="M66,132 Q78,128 90,132" stroke="${hsDk(c)}" stroke-width="1.2" fill="none" opacity=".6"/>` },
      { id: 'teddy', en: 'Teddy bear', pt: 'Ursinho de pelúcia', color: '#f08a24', crop: '146 86 38 54',
        draw: c => `
          <circle cx="157" cy="97" r="4.5" fill="${c}"/><circle cx="173" cy="97" r="4.5" fill="${c}"/>
          <ellipse cx="165" cy="122" rx="12" ry="13" fill="${c}"/>
          <circle cx="165" cy="105" r="10" fill="${c}"/>
          <ellipse cx="165" cy="124" rx="6" ry="7" fill="${hsLt(c)}"/>
          <ellipse cx="165" cy="108" rx="4.5" ry="3.2" fill="${hsLt(c)}"/>
          <circle cx="161" cy="103" r="1.4" fill="#2e2b2e"/><circle cx="169" cy="103" r="1.4" fill="#2e2b2e"/>
          <circle cx="165" cy="107.5" r="1.4" fill="#2e2b2e"/>` },
      { id: 'bedsidetable', en: 'Bedside table', pt: 'Criado-mudo', color: '#f2bd2c', crop: '200 132 60 60',
        draw: c => `
          <rect x="205" y="138" width="50" height="6" rx="2" fill="${hsDk(c)}"/>
          <rect x="208" y="144" width="44" height="44" fill="${c}"/>
          <line x1="208" y1="164" x2="252" y2="164" stroke="${hsDk(c)}" stroke-width="2"/>
          <circle cx="230" cy="154" r="2.8" fill="${hsDk(c)}"/><circle cx="230" cy="175" r="2.8" fill="${hsDk(c)}"/>` },
      { id: 'lamp', en: 'Lamp', pt: 'Abajur', color: '#3fae8a', crop: '206 94 48 46',
        draw: c => `
          <ellipse cx="230" cy="136" rx="9" ry="3" fill="${hsDk(c)}"/>
          <rect x="228.5" y="118" width="3" height="18" fill="#9aa0ad"/>
          <path d="M218,100 H242 L249,120 H211Z" fill="${c}"/>
          <path d="M218,100 H242" stroke="${hsDk(c)}" stroke-width="2"/>` },
      { id: 'rug', en: 'Rug', pt: 'Tapete', color: '#e5484d', crop: '56 198 188 48',
        draw: c => `
          <ellipse cx="150" cy="222" rx="88" ry="18" fill="${c}"/>
          <ellipse cx="150" cy="222" rx="68" ry="12" fill="none" stroke="${hsLt(c)}" stroke-width="3" stroke-dasharray="6 4"/>` },
    ],
  },

  // ----------------------------------------------------------------- BATHROOM
  {
    id: 'bathroom', en: 'Bathroom', pt: 'Banheiro',
    bg: () => `
      <rect width="400" height="190" fill="#e4f1f4"/>
      ${Array.from({ length: 16 }, (_, i) => `<line x1="${i * 26}" y1="0" x2="${i * 26}" y2="190" stroke="#cfe3e8" stroke-width="1.5"/>`).join('')}
      ${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${i * 26}" x2="400" y2="${i * 26}" stroke="#cfe3e8" stroke-width="1.5"/>`).join('')}
      <rect y="190" width="400" height="70" fill="#d7dde0"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(i => `<line x1="${i * 32}" y1="190" x2="${i * 32 - 16}" y2="260" stroke="#c4cbcf" stroke-width="1.5"/>`).join('')}
      <line x1="0" y1="224" x2="400" y2="224" stroke="#c4cbcf" stroke-width="1.5"/>
      <rect x="350" y="78" width="46" height="3" rx="1.5" fill="#8b8f96"/>`,
    items: [
      { id: 'shower', en: 'Shower', pt: 'Chuveiro', color: N.grey, crop: '22 34 58 108',
        draw: c => `
          <rect x="30" y="46" width="5" height="92" rx="2" fill="${c}"/>
          <path d="M32,48 H58" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
          <path d="M50,46 H72 L67,57 H55Z" fill="${hsDk(c)}"/>
          ${[54, 59, 64, 69].map(x => `<line x1="${x}" y1="62" x2="${x - 2}" y2="84" stroke="#8fc9e0" stroke-width="2" stroke-dasharray="4 5"/>`).join('')}` },
      { id: 'bathtub', en: 'Bathtub', pt: 'Banheira', color: N.beige, crop: '10 126 150 68',
        draw: c => `
          <rect x="16" y="134" width="138" height="9" rx="4.5" fill="${hsDk(c)}"/>
          <path d="M20,142 H150 V160 Q150,186 124,186 H46 Q20,186 20,160Z" fill="${c}"/>
          <circle cx="38" cy="188" r="4" fill="${hsDk(c)}"/><circle cx="132" cy="188" r="4" fill="${hsDk(c)}"/>
          <circle cx="60" cy="130" r="6" fill="#fff" opacity=".9"/><circle cx="72" cy="127" r="4.5" fill="#fff" opacity=".9"/><circle cx="84" cy="131" r="5" fill="#fff" opacity=".9"/>` },
      { id: 'toilet', en: 'Toilet', pt: 'Vaso sanitário', color: N.beige, crop: '164 88 82 104',
        draw: c => `
          <rect x="198" y="96" width="34" height="40" rx="5" fill="${c}" stroke="${hsDk(c)}" stroke-width="1.5"/>
          <rect x="209" y="100" width="12" height="4" rx="2" fill="${hsDk(c)}"/>
          <rect x="172" y="133" width="70" height="9" rx="4.5" fill="${hsDk(c)}"/>
          <path d="M176,142 H238 Q238,166 216,170 L218,188 H196 L198,170 Q176,166 176,142Z" fill="${c}" stroke="${hsDk(c)}" stroke-width="1.5"/>` },
      { id: 'mirror', en: 'Mirror', pt: 'Espelho', color: N.brown, crop: '276 42 58 70',
        draw: c => `
          <rect x="282" y="48" width="46" height="58" rx="22" fill="${c}"/>
          <rect x="287" y="53" width="36" height="48" rx="17" fill="#dff1f7"/>
          <path d="M295,66 L303,58 M297,74 L311,60" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` },
      { id: 'washbasin', en: 'Sink', pt: 'Pia', color: N.beige, crop: '264 110 80 82',
        draw: c => `
          <rect x="297" y="150" width="16" height="38" rx="3" fill="${c}" stroke="${hsDk(c)}" stroke-width="1.5"/>
          <path d="M272,130 H338 Q336,153 305,153 Q274,153 272,130Z" fill="${c}" stroke="${hsDk(c)}" stroke-width="1.5"/>
          <path d="M305,130 V120 H314" stroke="#8b8f96" stroke-width="4" fill="none" stroke-linecap="round"/>` },
      { id: 'toothbrush', en: 'Toothbrush', pt: 'Escova de dentes', color: N.black, crop: '268 92 26 42',
        draw: c => `
          <rect x="279.5" y="100" width="3" height="24" rx="1.5" fill="${c}"/>
          <rect x="278.5" y="96" width="5" height="7" rx="1.5" fill="#fff" stroke="${c}" stroke-width="1"/>
          <path d="M275,116 H287 L286,130 H276Z" fill="${N.grey}"/>` },
      { id: 'soap', en: 'Soap', pt: 'Sabonete', color: N.beige, crop: '314 110 28 24',
        draw: c => `
          <rect x="320" y="123" width="17" height="8" rx="4" fill="${c}" stroke="${hsDk(c)}" stroke-width="1"/>
          <circle cx="324" cy="118" r="2.5" fill="none" stroke="#9ccfe0" stroke-width="1.2"/>
          <circle cx="331" cy="115" r="3.2" fill="none" stroke="#9ccfe0" stroke-width="1.2"/>` },
      { id: 'towel', en: 'Towel', pt: 'Toalha', color: N.grey, crop: '348 72 52 72',
        draw: c => `
          <path d="M356,79 H394 V138 H356Z" fill="${c}"/>
          <rect x="356" y="79" width="38" height="8" fill="${hsDk(c)}"/>
          <rect x="356" y="124" width="38" height="5" fill="${hsLt(c)}"/>` },
    ],
  },

  // ------------------------------------------------------------------ KITCHEN
  {
    id: 'kitchen', en: 'Kitchen', pt: 'Cozinha',
    bg: () => `
      <rect width="400" height="190" fill="#f6efe2"/>
      <rect x="156" y="78" width="244" height="48" fill="#ece3d2"/>
      <rect y="190" width="400" height="70" fill="#e9e2d6"/>
      ${Array.from({ length: 20 }, (_, i) => Array.from({ length: 2 }, (_, j) =>
        (i + j) % 2 ? `<rect x="${i * 20}" y="${190 + j * 35}" width="20" height="35" fill="#d8cfc0"/>` : '').join('')).join('')}
      <rect x="160" y="132" width="240" height="58" fill="#b08a63"/>
      <rect x="156" y="126" width="244" height="7" fill="#6f5642"/>
      ${[166, 212, 258, 304, 350].map(x => `<rect x="${x}" y="139" width="40" height="45" rx="2" fill="none" stroke="#8f6d4c" stroke-width="2"/>
        <circle cx="${x + 34}" cy="160" r="2.2" fill="#6f5642"/>`).join('')}
      <rect x="166" y="74" width="86" height="4" fill="#8f6d4c"/>
      <rect x="336" y="78" width="56" height="3" rx="1.5" fill="#6f5642"/>`,
    items: [
      { id: 'fridge', en: 'Fridge', pt: 'Geladeira', color: N.grey, crop: '10 50 80 146',
        draw: c => `
          <rect x="18" y="58" width="64" height="132" rx="7" fill="${c}"/>
          <rect x="18" y="104" width="64" height="3" fill="${hsDk(c)}"/>
          <rect x="70" y="72" width="5" height="22" rx="2.5" fill="${hsDk(c)}"/>
          <rect x="70" y="116" width="5" height="30" rx="2.5" fill="${hsDk(c)}"/>` },
      { id: 'stove', en: 'Stove', pt: 'Fogão', color: N.grey, crop: '82 112 78 82',
        draw: c => `
          <rect x="88" y="118" width="66" height="8" rx="2" fill="${hsDk(c)}"/>
          <rect x="90" y="126" width="62" height="64" rx="3" fill="${c}"/>
          ${[101, 114, 128, 141].map(x => `<circle cx="${x}" cy="135" r="3.2" fill="${hsDk(c)}"/>`).join('')}
          <rect x="98" y="144" width="46" height="36" rx="3" fill="${N.black}"/>
          <rect x="104" y="149" width="34" height="5" rx="2" fill="#fff" opacity=".35"/>` },
      { id: 'pan', en: 'Pan', pt: 'Panela', color: N.black, crop: '96 96 70 30',
        draw: c => `
          <path d="M102,106 H138 V111 Q138,117 132,117 H108 Q102,117 102,111Z" fill="${c}"/>
          <rect x="137" y="107" width="24" height="4" rx="2" fill="${N.brown}"/>` },
      { id: 'sink', en: 'Sink', pt: 'Pia', color: N.grey, crop: '166 98 74 40',
        draw: c => `
          <rect x="172" y="123" width="62" height="7" rx="2" fill="${c}"/>
          <path d="M196,123 V108 Q196,102 202,102 H212 Q216,102 216,108 V112" fill="none" stroke="${hsDk(c)}" stroke-width="4" stroke-linecap="round"/>
          <rect x="192" y="118" width="8" height="6" fill="${hsDk(c)}"/>` },
      { id: 'microwave', en: 'Microwave', pt: 'Micro-ondas', color: N.black, crop: '248 86 74 44',
        draw: c => `
          <rect x="254" y="92" width="62" height="34" rx="4" fill="${c}"/>
          <rect x="260" y="98" width="38" height="22" rx="2" fill="${hsLt(c)}" opacity=".55"/>
          ${[100, 106, 112].map(y => `<rect x="303" y="${y}" width="8" height="3" rx="1" fill="${hsLt(c)}"/>`).join('')}` },
      { id: 'plate', en: 'Plate', pt: 'Prato', color: N.beige, crop: '170 38 40 40',
        draw: c => `
          <circle cx="190" cy="58" r="16" fill="${c}" stroke="${hsDk(c)}" stroke-width="1.5"/>
          <circle cx="190" cy="58" r="10" fill="${hsLt(c)}"/>` },
      { id: 'cup', en: 'Cup', pt: 'Xícara', color: N.brown, crop: '214 48 38 30',
        draw: c => `
          <path d="M220,56 H238 V69 Q238,74 233,74 H225 Q220,74 220,69Z" fill="${c}"/>
          <path d="M238,60 Q245,60 245,65 Q245,70 238,70" fill="none" stroke="${c}" stroke-width="3"/>` },
      { id: 'fork', en: 'Fork', pt: 'Garfo', color: N.grey, crop: '336 76 24 54',
        draw: c => `
          <path d="M342,82 V92 Q342,97 348,97 Q354,97 354,92 V82 M348,82 V96" fill="none" stroke="${c}" stroke-width="2.2"/>
          <rect x="346.5" y="96" width="3" height="30" rx="1.5" fill="${c}"/>` },
      { id: 'spoon', en: 'Spoon', pt: 'Colher', color: N.grey, crop: '352 76 24 54',
        draw: c => `
          <ellipse cx="364" cy="90" rx="6" ry="9" fill="${c}"/>
          <rect x="362.5" y="97" width="3" height="29" rx="1.5" fill="${c}"/>` },
      { id: 'knife', en: 'Knife', pt: 'Faca', color: N.grey, crop: '368 76 24 54',
        draw: c => `
          <path d="M377,82 Q385,84 384,102 H377Z" fill="${c}"/>
          <rect x="376" y="101" width="6" height="25" rx="2" fill="${N.black}"/>` },
    ],
  },

  // -------------------------------------------------------------- LIVING ROOM
  {
    id: 'livingroom', en: 'Living room', pt: 'Sala de estar',
    bg: () => `
      <rect width="400" height="190" fill="#f2ebe1"/>
      <rect y="190" width="400" height="70" fill="#c9a77d"/>
      ${[208, 228, 248].map(y => `<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#b8956b" stroke-width="1.5"/>`).join('')}
      <rect y="186" width="400" height="5" fill="#e0d4c4"/>`,
    items: [
      { id: 'bookcase', en: 'Bookcase', pt: 'Estante', color: N.brown, crop: '8 42 64 152',
        draw: c => `
          <rect x="14" y="48" width="52" height="142" rx="2" fill="${c}"/>
          <rect x="18" y="52" width="44" height="134" fill="${hsDk(c)}"/>
          ${[82, 116, 150].map(y => `<rect x="18" y="${y}" width="44" height="4" fill="${c}"/>`).join('')}
          ${[[82, [[20, 20, '#c9435c'], [27, 24, '#3d7bd9'], [34, 18, '#f2bd2c'], [44, 22, '#3fae8a']]],
             [116, [[21, 22, '#8e5fc2'], [29, 18, '#f08a24'], [38, 24, '#3d7bd9']]],
             [150, [[22, 20, '#3fae8a'], [30, 24, '#c9435c'], [46, 18, '#f2bd2c']]],
             [186, [[20, 22, '#f08a24'], [28, 20, '#8e5fc2'], [36, 24, '#3d7bd9']]]]
            .map(([shelf, books]) => books.map(([x, h, col]) =>
              `<rect x="${x}" y="${shelf - h}" width="6" height="${h}" fill="${col}" opacity=".85"/>`).join('')).join('')}` },
      { id: 'picture', en: 'Picture', pt: 'Quadro', color: N.brown, crop: '118 34 68 54',
        draw: c => `
          <rect x="124" y="40" width="56" height="42" fill="${c}"/>
          <rect x="129" y="45" width="46" height="32" fill="#cfe5f2"/>
          <path d="M129,77 L144,58 L154,68 L162,60 L175,77Z" fill="#7fb069"/>
          <circle cx="166" cy="52" r="4" fill="#ffd166"/>` },
      { id: 'sofa', en: 'Sofa', pt: 'Sofá', color: N.grey, crop: '66 104 168 88',
        draw: c => `
          <rect x="82" y="112" width="138" height="42" rx="10" fill="${c}"/>
          <rect x="84" y="148" width="134" height="26" rx="6" fill="${hsShade(c, -0.12)}"/>
          <line x1="151" y1="150" x2="151" y2="172" stroke="${hsDk(c)}" stroke-width="2"/>
          <rect x="72" y="128" width="20" height="50" rx="8" fill="${hsDk(c)}"/>
          <rect x="210" y="128" width="20" height="50" rx="8" fill="${hsDk(c)}"/>
          <rect x="80" y="178" width="6" height="10" fill="${N.black}"/><rect x="216" y="178" width="6" height="10" fill="${N.black}"/>` },
      { id: 'cushion', en: 'Cushion', pt: 'Almofada', color: N.beige, crop: '88 108 44 44',
        draw: c => `
          <rect x="96" y="120" width="28" height="26" rx="7" fill="${c}" transform="rotate(-10 110 133)"/>
          <circle cx="110" cy="133" r="2" fill="${hsDk(c)}"/>` },
      { id: 'armchair', en: 'Armchair', pt: 'Poltrona', color: N.brown, crop: '232 110 86 84',
        draw: c => `
          <rect x="246" y="118" width="58" height="48" rx="10" fill="${c}"/>
          <rect x="248" y="156" width="54" height="20" rx="5" fill="${hsShade(c, -0.12)}"/>
          <rect x="238" y="138" width="16" height="42" rx="6" fill="${hsDk(c)}"/>
          <rect x="296" y="138" width="16" height="42" rx="6" fill="${hsDk(c)}"/>
          <rect x="244" y="180" width="5" height="9" fill="${N.black}"/><rect x="301" y="180" width="5" height="9" fill="${N.black}"/>` },
      { id: 'tv', en: 'TV', pt: 'Televisão', color: N.black, crop: '314 96 82 98',
        draw: c => `
          <rect x="320" y="150" width="70" height="40" rx="3" fill="${N.brown}"/>
          <line x1="355" y1="154" x2="355" y2="186" stroke="${hsDk(N.brown)}" stroke-width="2"/>
          <rect x="351" y="142" width="8" height="8" fill="${c}"/>
          <rect x="322" y="102" width="66" height="42" rx="3" fill="${c}"/>
          <rect x="326" y="106" width="58" height="34" rx="2" fill="#4a5a6b"/>
          <path d="M332,112 L344,112" stroke="#fff" stroke-width="2" opacity=".4" stroke-linecap="round"/>` },
      { id: 'coffeetable', en: 'Coffee table', pt: 'Mesa de centro', color: N.brown, crop: '94 186 116 44',
        draw: c => `
          <rect x="100" y="194" width="104" height="8" rx="3" fill="${c}"/>
          <rect x="108" y="202" width="5" height="22" fill="${hsDk(c)}"/><rect x="191" y="202" width="5" height="22" fill="${hsDk(c)}"/>` },
      { id: 'plant', en: 'Plant', pt: 'Planta', color: N.beige, crop: '336 182 60 72',
        draw: c => `
          <ellipse cx="356" cy="204" rx="7" ry="16" fill="#3f9e5a" transform="rotate(-30 356 214)"/>
          <ellipse cx="380" cy="204" rx="7" ry="16" fill="#3f9e5a" transform="rotate(30 380 214)"/>
          <ellipse cx="368" cy="198" rx="7" ry="18" fill="#52b36c"/>
          <path d="M354,224 H382 L378,250 H358Z" fill="${c}"/>
          <rect x="352" y="221" width="32" height="5" rx="2" fill="${hsDk(c)}"/>` },
    ],
  },

  // -------------------------------------------------------------- DINING ROOM
  {
    id: 'diningroom', en: 'Dining room', pt: 'Sala de jantar',
    bg: () => `
      <rect width="400" height="190" fill="#eee7d8"/>
      <rect y="120" width="400" height="70" fill="#e2d8c4"/>
      <rect y="118" width="400" height="4" fill="#cbbda3"/>
      <rect y="190" width="400" height="70" fill="#b98f62"/>
      ${[208, 228, 248].map(y => `<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#a87f54" stroke-width="1.5"/>`).join('')}`,
    items: [
      { id: 'chandelier', en: 'Chandelier', pt: 'Lustre', color: N.black, crop: '118 0 84 62',
        draw: c => `
          <line x1="160" y1="0" x2="160" y2="26" stroke="${c}" stroke-width="2"/>
          <path d="M132,40 Q160,58 188,40" fill="none" stroke="${c}" stroke-width="3"/>
          <circle cx="160" cy="30" r="5" fill="${c}"/>
          ${[132, 146, 160, 174, 188].map(x => `<circle cx="${x}" cy="${x === 160 ? 50 : (x === 146 || x === 174 ? 46 : 38)}" r="5" fill="#ffe08a"/>`).join('')}` },
      { id: 'cupboard', en: 'Cupboard', pt: 'Armário', color: N.brown, crop: '294 48 98 146',
        draw: c => `
          <rect x="300" y="52" width="86" height="8" rx="2" fill="${hsDk(c)}"/>
          <rect x="306" y="60" width="74" height="60" fill="${c}"/>
          <rect x="311" y="64" width="31" height="52" fill="#e6eef2"/><rect x="345" y="64" width="31" height="52" fill="#e6eef2"/>
          <circle cx="326" cy="80" r="9" fill="${N.beige}"/><circle cx="360" cy="80" r="9" fill="${N.beige}"/>
          <line x1="311" y1="96" x2="376" y2="96" stroke="${c}" stroke-width="3"/>
          <rect x="302" y="118" width="82" height="72" rx="2" fill="${c}"/>
          <line x1="343" y1="124" x2="343" y2="184" stroke="${hsDk(c)}" stroke-width="2"/>
          <circle cx="337" cy="150" r="3" fill="${hsDk(c)}"/><circle cx="349" cy="150" r="3" fill="${hsDk(c)}"/>` },
      { id: 'table', en: 'Table', pt: 'Mesa', color: N.brown, crop: '58 130 204 64',
        draw: c => `
          <rect x="66" y="138" width="188" height="8" rx="2" fill="${c}"/>
          <rect x="74" y="146" width="172" height="8" fill="${hsDk(c)}"/>
          <rect x="80" y="146" width="7" height="44" fill="${hsDk(c)}"/><rect x="233" y="146" width="7" height="44" fill="${hsDk(c)}"/>` },
      { id: 'chairs', en: 'Chairs', pt: 'Cadeiras', color: N.black, crop: '24 84 50 110',
        draw: c => `
          <rect x="34" y="92" width="7" height="98" rx="2" fill="${c}"/>
          <rect x="34" y="150" width="36" height="6" rx="2" fill="${c}"/>
          <rect x="63" y="156" width="5" height="34" fill="${c}"/>
          <rect x="279" y="92" width="7" height="98" rx="2" fill="${c}"/>
          <rect x="250" y="150" width="36" height="6" rx="2" fill="${c}"/>
          <rect x="252" y="156" width="5" height="34" fill="${c}"/>` },
      { id: 'vase', en: 'Vase', pt: 'Vaso', color: N.grey, crop: '138 88 46 52',
        draw: c => `
          <line x1="156" y1="112" x2="150" y2="98" stroke="#3f9e5a" stroke-width="2"/>
          <line x1="160" y1="112" x2="160" y2="94" stroke="#3f9e5a" stroke-width="2"/>
          <line x1="164" y1="112" x2="170" y2="98" stroke="#3f9e5a" stroke-width="2"/>
          <circle cx="150" cy="97" r="5" fill="#f27aa5"/><circle cx="160" cy="92" r="5" fill="#f2bd2c"/><circle cx="170" cy="97" r="5" fill="#e5484d"/>
          <path d="M153,110 H167 Q172,124 166,138 H154 Q148,124 153,110Z" fill="${c}"/>` },
      { id: 'bowl', en: 'Bowl', pt: 'Tigela', color: N.beige, crop: '96 118 40 24',
        draw: c => `
          <ellipse cx="116" cy="126" rx="14" ry="3" fill="#f08a24"/><circle cx="110" cy="124" r="4" fill="#e5484d"/><circle cx="120" cy="123" r="4" fill="#f2bd2c"/>
          <path d="M100,127 H132 Q130,138 116,138 Q102,138 100,127Z" fill="${c}" stroke="${hsDk(c)}" stroke-width="1.2"/>` },
      { id: 'glass', en: 'Glass', pt: 'Copo', color: N.grey, crop: '184 114 26 26',
        draw: c => `
          <path d="M190,118 H203 L201,138 H192Z" fill="${hsLt(c)}" stroke="${c}" stroke-width="1.5" opacity=".9"/>
          <path d="M191,126 H202 L201,137 H192Z" fill="#9ccfe0" opacity=".7"/>` },
      { id: 'candles', en: 'Candles', pt: 'Velas', color: N.beige, crop: '208 102 34 38',
        draw: c => `
          <rect x="215" y="116" width="6" height="22" fill="${c}"/><rect x="227" y="112" width="6" height="26" fill="${c}"/>
          <path d="M218,108 Q221,113 218,116 Q215,113 218,108Z" fill="#f08a24"/>
          <path d="M230,104 Q233,109 230,112 Q227,109 230,104Z" fill="#f08a24"/>` },
    ],
  },

  // --------------------------------------------------------------------- YARD
  {
    id: 'yard', en: 'Yard', pt: 'Quintal',
    bg: () => `
      <rect width="400" height="170" fill="#cdeaf7"/>
      <circle cx="355" cy="38" r="20" fill="#ffd166"/>
      <ellipse cx="120" cy="40" rx="26" ry="11" fill="#fff"/><ellipse cx="140" cy="33" rx="18" ry="11" fill="#fff"/>
      <ellipse cx="250" cy="58" rx="20" ry="8" fill="#fff"/>
      <rect y="166" width="400" height="94" fill="#9fd37f"/>
      <path d="M0,168 Q100,158 200,168 T400,168 V176 H0Z" fill="#8cc56c"/>`,
    items: [
      { id: 'fence', en: 'Fence', pt: 'Cerca', color: N.beige, crop: '0 118 130 64',
        draw: c => `
          <rect x="0" y="136" width="400" height="5" fill="${hsDk(c)}"/><rect x="0" y="156" width="400" height="5" fill="${hsDk(c)}"/>
          ${Array.from({ length: 19 }, (_, i) => `<path d="M${4 + i * 21},176 V128 L${11 + i * 21},120 L${18 + i * 21},128 V176Z" fill="${c}"/>`).join('')}` },
      { id: 'tree', en: 'Tree', pt: 'Árvore', color: N.brown, crop: '10 16 104 172',
        draw: c => `
          <rect x="56" y="110" width="15" height="74" rx="3" fill="${c}"/>
          <circle cx="63" cy="70" r="34" fill="#3f9e5a"/><circle cx="38" cy="92" r="22" fill="#52b36c"/><circle cx="90" cy="92" r="22" fill="#52b36c"/>
          <circle cx="50" cy="66" r="4" fill="#e5484d"/><circle cx="78" cy="80" r="4" fill="#e5484d"/><circle cx="62" cy="96" r="4" fill="#e5484d"/>` },
      { id: 'swing', en: 'Swing', pt: 'Balanço', color: N.grey, crop: '124 62 106 126',
        draw: c => `
          <path d="M134,186 L152,72 M170,186 L152,72 M206,186 L188,72 M224,186 L188,72" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
          <rect x="146" y="68" width="48" height="6" rx="3" fill="${hsDk(c)}"/>
          <line x1="162" y1="74" x2="162" y2="150" stroke="${N.black}" stroke-width="1.8"/><line x1="178" y1="74" x2="178" y2="150" stroke="${N.black}" stroke-width="1.8"/>
          <rect x="156" y="149" width="28" height="6" rx="2" fill="${N.brown}"/>` },
      { id: 'doghouse', en: 'Doghouse', pt: 'Casinha de cachorro', color: N.brown, crop: '314 108 82 84',
        draw: c => `
          <rect x="326" y="140" width="60" height="46" fill="${c}"/>
          <path d="M318,144 L356,112 L394,144Z" fill="${hsDk(c)}"/>
          <path d="M345,186 V166 Q356,152 367,166 V186Z" fill="${N.black}"/>` },
      { id: 'bench', en: 'Bench', pt: 'Banco', color: N.brown, crop: '234 160 82 46',
        draw: c => `
          <rect x="240" y="168" width="70" height="6" rx="2" fill="${c}"/>
          <rect x="240" y="180" width="70" height="7" rx="2" fill="${c}"/>
          <rect x="246" y="187" width="5" height="15" fill="${N.black}"/><rect x="299" y="187" width="5" height="15" fill="${N.black}"/>
          <rect x="246" y="174" width="5" height="6" fill="${N.black}"/><rect x="299" y="174" width="5" height="6" fill="${N.black}"/>` },
      { id: 'flowers', en: 'Flowers', pt: 'Flores', color: '#3f9e5a', crop: '14 200 104 50',
        draw: () => [[30, '#e5484d'], [52, '#f2bd2c'], [74, '#f27aa5'], [96, '#8e5fc2']].map(([x, col]) => `
          <line x1="${x}" y1="246" x2="${x}" y2="220" stroke="#3f9e5a" stroke-width="3"/>
          <ellipse cx="${x - 5}" cy="236" rx="5" ry="2.5" fill="#52b36c"/>
          ${[0, 72, 144, 216, 288].map(a => `<circle cx="${x + 6 * Math.cos(a * Math.PI / 180)}" cy="${214 + 6 * Math.sin(a * Math.PI / 180)}" r="4.5" fill="${col}"/>`).join('')}
          <circle cx="${x}" cy="214" r="3.5" fill="#ffd166"/>`).join('') },
      { id: 'wateringcan', en: 'Watering can', pt: 'Regador', color: N.grey, crop: '134 208 62 42',
        draw: c => `
          <path d="M150,220 H176 V244 H150Z" fill="${c}"/>
          <path d="M176,228 L192,214" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
          <path d="M150,226 Q138,226 140,236" fill="none" stroke="${hsDk(c)}" stroke-width="4"/>
          <path d="M152,220 Q163,206 174,220" fill="none" stroke="${hsDk(c)}" stroke-width="4"/>` },
      { id: 'ball', en: 'Ball', pt: 'Bola', color: '#e5484d', crop: '214 212 34 34',
        draw: () => `
          <circle cx="231" cy="229" r="13" fill="#e5484d"/>
          <path d="M218,229 H244" stroke="#fff" stroke-width="5"/>
          <circle cx="231" cy="229" r="13" fill="none" stroke="#b8323a" stroke-width="1.5"/>` },
    ],
  },
];

function houseRoomById(id) { return HOUSE_ROOMS.find(r => r.id === id); }

// One object on its own, framed by its crop — for cards and the word bank.
function houseItemSVG(item, color, cls) {
  return `<svg class="${cls || ''}" viewBox="${item.crop}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${item.draw(color || item.color)}</svg>`;
}

// A whole room with whatever has been put in it, in the room's own order
// (the fence behind the tree, the pillow on the bed).
function houseSceneInner(room, placed, newestId, selectedId) {
  return room.bg() + room.items.filter(i => placed && placed[i.id]).map(i =>
    `<g class="hs-item${i.id === newestId ? ' hs-new' : ''}${i.id === selectedId ? ' hs-selected' : ''}" data-placed="${i.id}">${i.draw(placed[i.id])}</g>`).join('');
}

function houseDataUri(viewBox, inner) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`);
}

// A topic gets the House game when it is about the house — by name, or
// because at least three of its words are rooms.
const HOUSE_ROOM_WORDS = ['bedroom', 'bathroom', 'kitchen', 'living room', 'dining room', 'yard', 'garden', 'backyard', 'garage', 'hall'];
function isHouseTopic(topic) {
  const label = `${topic.id || ''} ${topic.title || ''}`.toLowerCase();
  if (/parts of the house|rooms of the house|my house|the house|partes da casa|c[oô]modos/.test(label)) return true;
  return (topic.words || []).filter(w => HOUSE_ROOM_WORDS.includes(String(w.en || '').toLowerCase().trim())).length >= 3;
}

// The built-in word bank: the six rooms (each pictured fully furnished)
// and every object in them, so Memory, Hangman and the rest have pictures.
const HOUSE_TOPIC = (() => {
  const words = [];
  const seen = new Set();
  HOUSE_ROOMS.forEach(room => {
    const full = Object.fromEntries(room.items.map(i => [i.id, i.color]));
    words.push({ id: `hs_${room.id}`, en: room.en, pt: room.pt, emoji: '🏠', image: houseDataUri('0 0 400 260', houseSceneInner(room, full)) });
  });
  HOUSE_ROOMS.forEach(room => room.items.forEach(item => {
    if (seen.has(item.en)) return;
    seen.add(item.en);
    words.push({ id: `hs_${item.id}`, en: item.en, pt: item.pt, emoji: '🏠', image: houseDataUri(item.crop, item.draw(item.color)) });
  }));
  return { id: 'parts-of-the-house', title: 'Parts of the House', emoji: '🏠', words };
})();

// ---------------------------------------------------------------------------
// The house in cross-section — the first screen. Each room is drawn with
// what the child has already put in it, so the house fills up as they play.
// ---------------------------------------------------------------------------
const HOUSE_LAYOUT = {
  bedroom: [40, 92, 130, 80], bathroom: [170, 92, 130, 80],
  livingroom: [40, 172, 87, 88], diningroom: [127, 172, 86, 88], kitchen: [213, 172, 87, 88],
  yard: [308, 120, 88, 140],
};

function houseOverviewSVG(placedByRoom, showPt) {
  const cells = HOUSE_ROOMS.map(room => {
    const [x, y, w, h] = HOUSE_LAYOUT[room.id];
    const placed = placedByRoom[room.id] || {};
    const count = Object.keys(placed).length;
    const total = room.items.length;
    const label = showPt ? room.pt : room.en;
    return `
      <g class="hs-cell${count === total ? ' complete' : ''}" data-room="${room.id}" tabindex="0" role="button" aria-label="${room.en}">
        <svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice">${houseSceneInner(room, placed)}</svg>
        <rect class="hs-cell-hover" x="${x}" y="${y}" width="${w}" height="${h}"/>
        <rect x="${x + 4}" y="${y + h - 21}" width="${w - 8}" height="17" rx="8.5" fill="#fff" opacity=".94"/>
        <text x="${x + w / 2}" y="${y + h - 9}" text-anchor="middle" class="hs-cell-label">${label}</text>
        <rect x="${x + 4}" y="${y + 4}" width="${count === total ? 30 : 26}" height="14" rx="7" fill="${count === total ? '#3fae8a' : '#2e2b2e'}" opacity=".8"/>
        <text x="${x + (count === total ? 19 : 17)}" y="${y + 14.5}" text-anchor="middle" class="hs-cell-count">${count === total ? '⭐' : ''}${count}/${total}</text>
      </g>`;
  }).join('');
  return `<svg class="hs-house" viewBox="0 0 400 270" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="258" width="400" height="12" fill="#8cc56c"/>
    <path d="M26,94 L170,22 L314,94Z" fill="#c9435c"/>
    <rect x="232" y="34" width="20" height="36" fill="#9e2f45"/>
    <rect x="36" y="88" width="268" height="174" fill="#6b4f3a"/>
    ${cells}
    <path d="M40,172 H300" stroke="#6b4f3a" stroke-width="3"/>
    <path d="M170,92 V172 M127,172 V260 M213,172 V260" stroke="#6b4f3a" stroke-width="3"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
// Opening it from the Game Maker: the House first, then every other game
// this word bank can run.
// ---------------------------------------------------------------------------
function openHouseGame() {
  const topic = HOUSE_TOPIC;
  const games = gamesForTopic(topic).sort((a, b) => (a.id === 'house' ? -1 : b.id === 'house' ? 1 : 0));
  let active = 'house';
  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">🏠 Parts of the House</h3>
      <div class="game-picker" id="houseGamePicker">
        ${games.map(g => `<button class="game-pick-btn ${g.id === active ? 'active' : ''}" data-game="${g.id}">${g.icon} ${g.label}</button>`).join('')}
      </div>
      <div class="game-mount" id="houseGameMount"></div>
    </div>`, true);
  const mount = () => GameEngine.mount(document.getElementById('houseGameMount'), topic, active);
  document.querySelectorAll('#houseGamePicker .game-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      active = btn.dataset.game;
      document.querySelectorAll('#houseGamePicker .game-pick-btn').forEach(b => b.classList.toggle('active', b === btn));
      mount();
    });
  });
  mount();
}
