/* ==========================================================================
   IGenglishschool — Body Parts: the child, the sixteen parts and the word
   bank. Loaded before games.js; the game lives in GameEngine.

   One 300 x 420 drawing of a barefoot child in a T-shirt and shorts, so
   every part can be seen — knees and toes too. Every shape carries
   data-part="…", so a tap on the drawing tells the game which part it is.
   Tiny parts (eyes, nose, fingers, toes…) get a bigger invisible hit area
   on top, so small fingers can find them.

   A part's card is the same child, cropped around that part with a ring on
   it — the picture always matches the big drawing.
   ========================================================================== */

const BD_OUT = '#2e2b2e';
const BD_SKIN = '#f1c6a0';
const BD_RING = '#f05d77';

// rings: [cx, cy, rx, ry] around the part on the big drawing.
// crop:  [x, y, size] — the square the card shows.
// can:   what the part does ("I can see!") — said after the part.
const BODY_PARTS = [
  { id: 'head', en: 'Head', pt: 'Cabeça', emoji: '🙂', rings: [[150, 88, 60, 58]], crop: [84, 24, 132], can: 'I can nod!' },
  { id: 'hair', en: 'Hair', pt: 'Cabelo', emoji: '💇', rings: [[150, 54, 52, 24]], crop: [92, 18, 116], can: 'I can brush my hair!' },
  { id: 'eyes', en: 'Eyes', pt: 'Olhos', emoji: '👀', plural: true, rings: [[132, 94, 15, 15], [168, 94, 15, 15]], crop: [112, 56, 76], can: 'I can see!' },
  { id: 'ears', en: 'Ears', pt: 'Orelhas', emoji: '👂', plural: true, rings: [[100, 96, 16, 19], [200, 96, 16, 19]], crop: [84, 40, 132], can: 'I can hear!' },
  { id: 'nose', en: 'Nose', pt: 'Nariz', emoji: '👃', rings: [[150, 107, 13, 14]], crop: [116, 72, 68], can: 'I can smell!' },
  { id: 'mouth', en: 'Mouth', pt: 'Boca', emoji: '👄', rings: [[150, 125, 23, 13]], crop: [114, 88, 72], can: 'I can eat!' },
  { id: 'neck', en: 'Neck', pt: 'Pescoço', emoji: '🦒', rings: [[150, 143, 22, 14]], crop: [96, 92, 108], can: 'I can turn my head!' },
  { id: 'shoulders', en: 'Shoulders', pt: 'Ombros', emoji: '🤷', plural: true, rings: [[112, 160, 20, 17], [188, 160, 20, 17]], crop: [78, 100, 144], can: 'I can shrug!' },
  { id: 'arms', en: 'Arms', pt: 'Braços', emoji: '💪', plural: true, rings: [[93, 210, 19, 46], [207, 210, 19, 46]], crop: [50, 130, 200], can: 'I can hug!' },
  { id: 'hands', en: 'Hands', pt: 'Mãos', emoji: '👐', plural: true, rings: [[79, 262, 22, 22], [221, 262, 22, 22]], crop: [36, 220, 86], can: 'I can clap!' },
  { id: 'fingers', en: 'Fingers', pt: 'Dedos', emoji: '🖐️', plural: true, rings: [[79, 280, 18, 13], [221, 280, 18, 13]], crop: [44, 238, 70], can: 'I can count to ten!' },
  { id: 'tummy', en: 'Tummy', pt: 'Barriga', emoji: '🫃', rings: [[150, 222, 36, 30]], crop: [88, 160, 124], can: "I'm hungry!" },
  { id: 'legs', en: 'Legs', pt: 'Pernas', emoji: '🦵', plural: true, rings: [[132, 334, 19, 52], [168, 334, 19, 52]], crop: [78, 268, 144], can: 'I can run!' },
  { id: 'knees', en: 'Knees', pt: 'Joelhos', emoji: '🦵', plural: true, rings: [[132, 336, 14, 14], [168, 336, 14, 14]], crop: [108, 296, 84], can: 'I can bend my knees!' },
  { id: 'feet', en: 'Feet', pt: 'Pés', emoji: '🦶', plural: true, rings: [[126, 389, 27, 16], [174, 389, 27, 16]], crop: [88, 326, 124], can: 'I can walk!' },
  { id: 'toes', en: 'Toes', pt: 'Dedos do pé', emoji: '🦶', plural: true, rings: [[126, 397, 22, 9], [174, 397, 22, 9]], crop: [108, 354, 84], can: 'I can wiggle my toes!' },
];
const bodyPartById = id => BODY_PARTS.find(p => p.id === id);

// "This is my nose." / "These are my eyes." — and the command.
const bodySentence = p => `${p.plural ? 'These are' : 'This is'} my ${p.en.toLowerCase()}.`;
const bodyCommand = p => `Touch your ${p.en.toLowerCase()}!`;

// ---------------------------------------------------------------------------
// The drawing. opts: { on: part id to light up, ring: draw its rings,
// hits: add the invisible tap areas, crop: [x, y, size], cls }.
// ---------------------------------------------------------------------------
function bodySVG(opts) {
  const o = opts || {};
  const on = o.on || null;
  // The part's attributes: what it is and, when it is the one on show, the
  // class that makes it wiggle.
  const P = id => `data-part="${id}"${on === id ? ' class="bd-on"' : ''}`;
  const limb = (id, d, w) => `<g ${P(id)}><path d="${d}" fill="none" stroke="${BD_OUT}" stroke-width="${w + 4.5}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${BD_SKIN}" stroke-width="${w}" stroke-linecap="round"/></g>`;
  const fingers = x => [-9, -3, 3, 9].map(dx => `<path d="M${x + dx},268 V${dx === -9 || dx === 9 ? 280 : 284}" stroke="${BD_OUT}" stroke-width="7.5" stroke-linecap="round"/><path d="M${x + dx},268 V${dx === -9 || dx === 9 ? 280 : 284}" stroke="${BD_SKIN}" stroke-width="4" stroke-linecap="round"/>`).join('');
  const toes = x => [-12, -6, 0, 6, 12].map((dx, i) => `<circle cx="${x + dx}" cy="396" r="${i === 0 || i === 4 ? 3.6 : 3.2}" fill="${BD_SKIN}" stroke="${BD_OUT}" stroke-width="1.6"/>`).join('');

  const figure = `
    <g ${P('ears')}>
      <circle cx="102" cy="96" r="12" fill="${BD_SKIN}" stroke="${BD_OUT}" stroke-width="2.4"/><path d="M100,90 Q95,96 100,102" fill="none" stroke="${BD_OUT}" stroke-width="1.6"/>
      <circle cx="198" cy="96" r="12" fill="${BD_SKIN}" stroke="${BD_OUT}" stroke-width="2.4"/><path d="M200,90 Q205,96 200,102" fill="none" stroke="${BD_OUT}" stroke-width="1.6"/>
    </g>
    <rect ${P('neck')} x="139" y="128" width="22" height="30" fill="${BD_SKIN}" stroke="${BD_OUT}" stroke-width="2.4"/>
    ${limb('arms', 'M106,170 Q88,212 81,248', 17)}
    ${limb('arms', 'M194,170 Q212,212 219,248', 17)}
    <g ${P('fingers')}>${fingers(79)}${fingers(221)}</g>
    <g ${P('hands')}>
      <circle cx="79" cy="260" r="13" fill="${BD_SKIN}" stroke="${BD_OUT}" stroke-width="2.4"/>
      <circle cx="221" cy="260" r="13" fill="${BD_SKIN}" stroke="${BD_OUT}" stroke-width="2.4"/>
      <path d="M68,254 Q62,258 64,264" fill="none" stroke="${BD_OUT}" stroke-width="2"/><path d="M232,254 Q238,258 236,264" fill="none" stroke="${BD_OUT}" stroke-width="2"/>
    </g>
    ${limb('legs', 'M132,292 V378', 20)}
    ${limb('legs', 'M168,292 V378', 20)}
    <g ${P('knees')}>
      <ellipse cx="132" cy="336" rx="7.5" ry="6.5" fill="#e8b08a"/><path d="M125,341 Q132,346 139,341" fill="none" stroke="${BD_OUT}" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse cx="168" cy="336" rx="7.5" ry="6.5" fill="#e8b08a"/><path d="M161,341 Q168,346 175,341" fill="none" stroke="${BD_OUT}" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <g ${P('feet')}>
      <ellipse cx="126" cy="388" rx="20" ry="10" fill="${BD_SKIN}" stroke="${BD_OUT}" stroke-width="2.4"/>
      <ellipse cx="174" cy="388" rx="20" ry="10" fill="${BD_SKIN}" stroke="${BD_OUT}" stroke-width="2.4"/>
    </g>
    <g ${P('toes')}>${toes(126)}${toes(174)}</g>
    <path d="M116,254 H184 L189,300 H155 L150,282 L145,300 H111Z" fill="#f2bd2c" stroke="${BD_OUT}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M112,152 Q150,142 188,152 L202,170 L190,188 L184,184 L184,262 H116 L116,184 L110,188 L98,170Z" fill="#3d7bd9" stroke="${BD_OUT}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M136,150 Q150,162 164,150" fill="none" stroke="${BD_OUT}" stroke-width="2"/>
    <path d="M150,186 l5,10 l11,1 l-8,7 l3,11 l-11,-6 l-11,6 l3,-11 l-8,-7 l11,-1Z" fill="#ffd166" stroke="${BD_OUT}" stroke-width="1.6" stroke-linejoin="round"/>
    <g ${P('head')}><circle cx="150" cy="92" r="46" fill="${BD_SKIN}" stroke="${BD_OUT}" stroke-width="2.6"/></g>
    <path ${P('hair')} d="M103,92 Q98,38 150,38 Q202,38 197,92 Q192,66 172,62 Q160,74 140,64 Q116,64 103,92Z" fill="#6b4a2b" stroke="${BD_OUT}" stroke-width="2.4" stroke-linejoin="round"/>
    <path pointer-events="none" d="M122,80 Q132,75 141,80 M159,80 Q168,75 178,80" fill="none" stroke="${BD_OUT}" stroke-width="2.4" stroke-linecap="round"/>
    <g ${P('eyes')}>
      <circle cx="132" cy="94" r="8.5" fill="#fff" stroke="${BD_OUT}" stroke-width="2"/><circle cx="133" cy="95" r="4.4" fill="${BD_OUT}"/><circle cx="134.5" cy="93.5" r="1.4" fill="#fff"/>
      <circle cx="168" cy="94" r="8.5" fill="#fff" stroke="${BD_OUT}" stroke-width="2"/><circle cx="169" cy="95" r="4.4" fill="${BD_OUT}"/><circle cx="170.5" cy="93.5" r="1.4" fill="#fff"/>
    </g>
    <path ${P('nose')} d="M150,99 Q143,111 148,114 Q150,115 152,114 Q157,111 150,99Z" fill="#e8a882" stroke="${BD_OUT}" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse pointer-events="none" cx="122" cy="114" rx="7" ry="4" fill="#f49ab0" opacity=".7"/><ellipse pointer-events="none" cx="178" cy="114" rx="7" ry="4" fill="#f49ab0" opacity=".7"/>
    <g ${P('mouth')}>
      <path d="M135,120 Q150,138 165,120 Q150,125 135,120Z" fill="#7a2e2e" stroke="${BD_OUT}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M142,128 Q150,133 158,128 Q150,126 142,128Z" fill="#f27a8a"/>
    </g>`;

  // Bigger, invisible tap areas for the small parts (on top of everything).
  const hit = (id, shapes) => `<g data-part="${id}">${shapes}</g>`;
  const T = 'fill="transparent"';
  const hits = !o.hits ? '' : `<g class="bd-hits">
    ${hit('tummy', `<ellipse cx="150" cy="226" rx="32" ry="28" ${T}/>`)}
    ${hit('shoulders', `<circle cx="112" cy="160" r="16" ${T}/><circle cx="188" cy="160" r="16" ${T}/>`)}
    ${hit('knees', `<circle cx="132" cy="337" r="13" ${T}/><circle cx="168" cy="337" r="13" ${T}/>`)}
    ${hit('fingers', `<rect x="64" y="270" width="30" height="20" ${T}/><rect x="206" y="270" width="30" height="20" ${T}/>`)}
    ${hit('toes', `<rect x="108" y="391" width="36" height="12" ${T}/><rect x="156" y="391" width="36" height="12" ${T}/>`)}
    ${hit('ears', `<circle cx="99" cy="96" r="14" ${T}/><circle cx="201" cy="96" r="14" ${T}/>`)}
    ${hit('eyes', `<circle cx="132" cy="94" r="12" ${T}/><circle cx="168" cy="94" r="12" ${T}/>`)}
    ${hit('nose', `<circle cx="150" cy="108" r="10" ${T}/>`)}
    ${hit('mouth', `<ellipse cx="150" cy="126" rx="19" ry="9" ${T}/>`)}
  </g>`;

  const part = on && bodyPartById(on);
  const sw = o.crop ? Math.max(2.5, o.crop[2] / 40) : 3.5;
  const rings = part && o.ring !== false ? `<g class="bd-rings">${part.rings.map(([cx, cy, rx, ry]) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${BD_RING}" fill-opacity=".14" stroke="${BD_RING}" stroke-width="${sw}" stroke-dasharray="${sw * 2} ${sw * 1.4}"/>`).join('')}</g>` : '';

  const vb = o.crop ? `${o.crop[0]} ${o.crop[1]} ${o.crop[2]} ${o.crop[2]}` : '0 0 300 420';
  return `<svg class="${o.cls || ''}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${o.crop ? `<rect x="${o.crop[0]}" y="${o.crop[1]}" width="${o.crop[2]}" height="${o.crop[2]}" fill="#eaf4fb"/>` : ''}
    <g class="bd-figure">${figure}</g>${rings}${hits}
  </svg>`;
}

// The card picture: the child cropped around the part, the part ringed.
const bodyPartThumbSVG = (id, cls) => bodySVG({ on: id, crop: bodyPartById(id).crop, cls });

// ---------------------------------------------------------------------------
// A clap for hands, stomps for feet — the rest just speak.
// ---------------------------------------------------------------------------
function playBodySound(id) {
  if (typeof IGSound === 'undefined' || IGSound.muted() || !IGSound.noise) return;
  const S = IGSound;
  try {
    if (id === 'hands' || id === 'fingers') {
      [0, 0.32].forEach(t => S.noise(t, 0.09, 'bandpass', 1800, 1200, 0.55));
    } else if (id === 'feet' || id === 'legs' || id === 'knees' || id === 'toes') {
      [0, 0.36].forEach(t => S.noise(t, 0.16, 'lowpass', 260, 70, 0.8));
    }
  } catch (e) { /* audio blocked */ }
}

// ---------------------------------------------------------------------------
// Words → parts. Singulars and the usual other names count too.
// ---------------------------------------------------------------------------
const BODY_ALIASES = {
  eye: 'eyes', ear: 'ears', shoulder: 'shoulders', arm: 'arms', hand: 'hands', finger: 'fingers',
  leg: 'legs', knee: 'knees', foot: 'feet', toe: 'toes', belly: 'tummy', stomach: 'tummy', tummies: 'tummy',
};
function bodyPartFor(word) {
  const key = String((word && word.en) || '').toLowerCase().trim().replace(/^(my|the|your)\s+/, '');
  return bodyPartById(key) || bodyPartById(BODY_ALIASES[key]) || null;
}
function isBodyTopic(topic) {
  const label = `${topic.id || ''} ${topic.title || ''}`.toLowerCase();
  const hits = (topic.words || []).filter(w => bodyPartFor(w)).length;
  if (/body|corpo/.test(label) && hits >= 2) return true;
  return hits >= 4;
}

const BODY_TOPIC = {
  id: 'body', title: 'Body Parts', emoji: '🧍',
  words: BODY_PARTS.map(p => ({
    id: `bd_${p.id}`, en: p.en, pt: p.pt, emoji: p.emoji,
    image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(bodyPartThumbSVG(p.id).replace(' class=""', '')),
  })),
};
const openBodyGame = () => openReadyGame(BODY_TOPIC, 'body', '🧍 Body Parts');
