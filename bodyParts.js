/* ==========================================================================
   IGenglishschool — Body Parts: the boy and the girl, the sixteen parts and
   the word bank. Loaded before games.js; the game lives in GameEngine.

   One 300 x 420 drawing of a barefoot child (a boy in a T-shirt and shorts,
   or a girl in a top and skirt), so every part can be seen — knees and toes
   too. The child is built part by part: what is not built yet shows as a
   pale outline, so the learner sees where each part goes.

   Every shape carries data-part="…", so a tap on the drawing tells the game
   which part it is. Tiny parts (eyes, nose, fingers, toes…) get a bigger
   invisible hit area on top, so small fingers can find them.

   A part's card is the same child, cropped around that part with a ring on
   it — the picture always matches the big drawing.
   ========================================================================== */

const BD_OUT = '#2e2b2e';
const BD_SKIN = '#f1c6a0';
const BD_RING = '#f05d77';

const BD_KIDS = {
  boy: { en: 'Boy', pt: 'Menino', icon: '👦', shirt: '#3d7bd9', bottom: '#f2bd2c', hair: '#6b4a2b' },
  girl: { en: 'Girl', pt: 'Menina', icon: '👧', shirt: '#f27aa5', bottom: '#8e5fc2', hair: '#5a3520' },
};

// rings: [cx, cy, rx, ry] around the part on the big drawing (girlRings
// where her drawing differs). crop: [x, y, size] — the square the card shows.
const BODY_PARTS = [
  { id: 'head', en: 'Head', pt: 'Cabeça', emoji: '🙂', rings: [[150, 88, 60, 58]], crop: [84, 24, 132] },
  { id: 'hair', en: 'Hair', pt: 'Cabelo', emoji: '💇', rings: [[150, 54, 52, 24]], girlRings: [[150, 96, 64, 72]], crop: [92, 18, 116], girlCrop: [78, 30, 144] },
  { id: 'eyes', en: 'Eyes', pt: 'Olhos', emoji: '👀', plural: true, rings: [[132, 94, 15, 15], [168, 94, 15, 15]], crop: [112, 56, 76] },
  { id: 'ears', en: 'Ears', pt: 'Orelhas', emoji: '👂', plural: true, rings: [[100, 96, 16, 19], [200, 96, 16, 19]], crop: [84, 40, 132] },
  { id: 'nose', en: 'Nose', pt: 'Nariz', emoji: '👃', rings: [[150, 107, 13, 14]], crop: [116, 72, 68] },
  { id: 'mouth', en: 'Mouth', pt: 'Boca', emoji: '👄', rings: [[150, 125, 23, 13]], crop: [114, 88, 72] },
  { id: 'neck', en: 'Neck', pt: 'Pescoço', emoji: '🦒', rings: [[150, 143, 22, 14]], crop: [96, 92, 108] },
  { id: 'shoulders', en: 'Shoulders', pt: 'Ombros', emoji: '🤷', plural: true, rings: [[110, 164, 20, 19], [190, 164, 20, 19]], crop: [78, 100, 144] },
  { id: 'arms', en: 'Arms', pt: 'Braços', emoji: '💪', plural: true, rings: [[93, 210, 19, 46], [207, 210, 19, 46]], crop: [50, 130, 200] },
  { id: 'hands', en: 'Hands', pt: 'Mãos', emoji: '👐', plural: true, rings: [[79, 262, 22, 22], [221, 262, 22, 22]], crop: [36, 220, 86] },
  { id: 'fingers', en: 'Fingers', pt: 'Dedos', emoji: '🖐️', plural: true, rings: [[79, 280, 18, 13], [221, 280, 18, 13]], crop: [44, 238, 70] },
  { id: 'tummy', en: 'Tummy', pt: 'Barriga', emoji: '🫃', rings: [[150, 222, 36, 30]], crop: [88, 160, 124] },
  { id: 'legs', en: 'Legs', pt: 'Pernas', emoji: '🦵', plural: true, rings: [[132, 334, 19, 52], [168, 334, 19, 52]], crop: [78, 268, 144] },
  { id: 'knees', en: 'Knees', pt: 'Joelhos', emoji: '🦵', plural: true, rings: [[132, 336, 14, 14], [168, 336, 14, 14]], crop: [108, 296, 84] },
  { id: 'feet', en: 'Feet', pt: 'Pés', emoji: '🦶', plural: true, rings: [[126, 389, 27, 16], [174, 389, 27, 16]], crop: [88, 326, 124] },
  { id: 'toes', en: 'Toes', pt: 'Dedos do pé', emoji: '🦶', plural: true, rings: [[126, 397, 22, 9], [174, 397, 22, 9]], crop: [108, 354, 84] },
];
const bodyPartById = id => BODY_PARTS.find(p => p.id === id);

// ---------------------------------------------------------------------------
// The pieces of the child, back to front: [part, svg]. K is the paint — the
// real colours, or the pale outline of a part not built yet.
// ---------------------------------------------------------------------------
function bdPieces(K, kid) {
  const girl = kid === 'girl';
  const look = BD_KIDS[girl ? 'girl' : 'boy'];
  const st = w => `stroke="${K.out}" stroke-width="${w}"`;
  const limb = (d, w) => `<path d="${d}" fill="none" ${st(w + 4.5)} stroke-linecap="round"/><path d="${d}" fill="none" stroke="${K.skin}" stroke-width="${w}" stroke-linecap="round"/>`;
  const fingers = x => [-9, -3, 3, 9].map(dx => limb(`M${x + dx},268 V${dx === -9 || dx === 9 ? 280 : 284}`, 3.4)).join('');
  const toes = x => [-12, -6, 0, 6, 12].map((dx, i) => `<circle cx="${x + dx}" cy="396" r="${i === 0 || i === 4 ? 3.6 : 3.2}" fill="${K.skin}" ${st(1.6)}/>`).join('');
  const deco = svg => (K.real ? svg : '');

  return [
    girl ? ['hair', `<path d="M98,94 Q92,36 150,36 Q208,36 202,94 L208,166 Q194,174 184,158 L182,128 H118 L116,158 Q106,174 92,166Z" fill="${K.c(look.hair)}" ${st(2.4)} stroke-linejoin="round"/>`] : null,
    ['ears', `<circle cx="102" cy="96" r="12" fill="${K.skin}" ${st(2.4)}/><path d="M100,90 Q95,96 100,102" fill="none" ${st(1.6)}/>
              <circle cx="198" cy="96" r="12" fill="${K.skin}" ${st(2.4)}/><path d="M200,90 Q205,96 200,102" fill="none" ${st(1.6)}/>
              ${girl ? deco(`<circle cx="101" cy="111" r="3.5" fill="#ffd166" ${st(1.4)}/><circle cx="199" cy="111" r="3.5" fill="#ffd166" ${st(1.4)}/>`) : ''}`],
    ['neck', `<rect x="139" y="128" width="22" height="30" fill="${K.skin}" ${st(2.4)}/>`],
    ['arms', `${limb('M106,170 Q88,212 81,248', 17)}${limb('M194,170 Q212,212 219,248', 17)}`],
    ['fingers', `${fingers(79)}${fingers(221)}`],
    ['hands', `<circle cx="79" cy="260" r="13" fill="${K.skin}" ${st(2.4)}/><circle cx="221" cy="260" r="13" fill="${K.skin}" ${st(2.4)}/>
               <path d="M68,254 Q62,258 64,264" fill="none" ${st(2)}/><path d="M232,254 Q238,258 236,264" fill="none" ${st(2)}/>`],
    ['legs', `${limb('M132,292 V378', 20)}${limb('M168,292 V378', 20)}`],
    ['knees', `<ellipse cx="132" cy="336" rx="7.5" ry="6.5" fill="${K.c('#e8b08a')}"/><path d="M125,341 Q132,346 139,341" fill="none" ${st(1.6)} stroke-linecap="round"/>
               <ellipse cx="168" cy="336" rx="7.5" ry="6.5" fill="${K.c('#e8b08a')}"/><path d="M161,341 Q168,346 175,341" fill="none" ${st(1.6)} stroke-linecap="round"/>`],
    ['feet', `<ellipse cx="126" cy="388" rx="20" ry="10" fill="${K.skin}" ${st(2.4)}/><ellipse cx="174" cy="388" rx="20" ry="10" fill="${K.skin}" ${st(2.4)}/>`],
    ['toes', `${toes(126)}${toes(174)}`],
    // The tummy is the T-shirt (or top) and what is worn under it.
    ['tummy', `${girl
        ? `<path d="M116,252 H184 L198,300 H102Z" fill="${K.c(look.bottom)}" ${st(2.4)} stroke-linejoin="round"/>${deco(`<path d="M110,288 H190" stroke="#fff" stroke-width="3" stroke-dasharray="6 6"/>`)}`
        : `<path d="M116,254 H184 L189,300 H155 L150,282 L145,300 H111Z" fill="${K.c(look.bottom)}" ${st(2.4)} stroke-linejoin="round"/>`}
       <path d="M118,150 Q150,143 182,150 L186,186 L184,262 H116 L114,186Z" fill="${K.c(look.shirt)}" ${st(2.4)} stroke-linejoin="round"/>
       <path d="M136,150 Q150,162 164,150" fill="none" ${st(2)}/>
       ${deco(girl
        ? `<path d="M150,214 C134,203 136,189 144,189 C147,189 150,192 150,195 C150,192 153,189 156,189 C164,189 166,203 150,214Z" fill="#fff" stroke="${BD_OUT}" stroke-width="1.6" stroke-linejoin="round"/>`
        : `<path d="M150,186 l5,10 l11,1 l-8,7 l3,11 l-11,-6 l-11,6 l3,-11 l-8,-7 l11,-1Z" fill="#ffd166" stroke="${BD_OUT}" stroke-width="1.6" stroke-linejoin="round"/>`)}`],
    // The shoulders are where the sleeves sit.
    ['shoulders', `<path d="M119,150 Q104,150 96,170 L111,188 L116,184 Q117,166 119,150Z" fill="${K.c(look.shirt)}" ${st(2.4)} stroke-linejoin="round"/>
                   <path d="M181,150 Q196,150 204,170 L189,188 L184,184 Q183,166 181,150Z" fill="${K.c(look.shirt)}" ${st(2.4)} stroke-linejoin="round"/>`],
    ['head', `<circle cx="150" cy="92" r="46" fill="${K.skin}" ${st(2.6)}/>
              ${deco(`<ellipse pointer-events="none" cx="122" cy="114" rx="7" ry="4" fill="#f49ab0" opacity=".7"/><ellipse pointer-events="none" cx="178" cy="114" rx="7" ry="4" fill="#f49ab0" opacity=".7"/>`)}`],
    ['hair', girl
      ? `<path d="M103,92 Q98,38 150,38 Q202,38 197,92 Q192,64 150,66 Q108,64 103,92Z" fill="${K.c(look.hair)}" ${st(2.4)} stroke-linejoin="round"/>
         ${deco(`<path d="M180,52 L170,40 L168,58Z M180,52 L192,42 L194,60Z" fill="#e5484d" stroke="${BD_OUT}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="180" cy="51" r="4" fill="#e5484d" stroke="${BD_OUT}" stroke-width="1.8"/>`)}`
      : `<path d="M103,92 Q98,38 150,38 Q202,38 197,92 Q192,66 172,62 Q160,74 140,64 Q116,64 103,92Z" fill="${K.c(look.hair)}" ${st(2.4)} stroke-linejoin="round"/>`],
    ['eyes', `${deco(`<path pointer-events="none" d="M122,80 Q132,75 141,80 M159,80 Q168,75 178,80" fill="none" stroke="${BD_OUT}" stroke-width="2.4" stroke-linecap="round"/>`)}
              <circle cx="132" cy="94" r="8.5" fill="${K.c('#fff')}" ${st(2)}/><circle cx="133" cy="95" r="4.4" fill="${K.c(BD_OUT)}"/>${deco('<circle cx="134.5" cy="93.5" r="1.4" fill="#fff"/>')}
              <circle cx="168" cy="94" r="8.5" fill="${K.c('#fff')}" ${st(2)}/><circle cx="169" cy="95" r="4.4" fill="${K.c(BD_OUT)}"/>${deco('<circle cx="170.5" cy="93.5" r="1.4" fill="#fff"/>')}
              ${girl ? deco(`<path d="M123,89 l-5,-4 M125,86 l-3,-5 M177,89 l5,-4 M175,86 l3,-5" stroke="${BD_OUT}" stroke-width="2" stroke-linecap="round"/>`) : ''}`],
    ['nose', `<path d="M150,99 Q143,111 148,114 Q150,115 152,114 Q157,111 150,99Z" fill="${K.c('#e8a882')}" ${st(1.8)} stroke-linejoin="round"/>`],
    ['mouth', `<path d="M135,120 Q150,138 165,120 Q150,125 135,120Z" fill="${K.c('#7a2e2e')}" ${st(2.2)} stroke-linejoin="round"/>
               ${deco('<path d="M142,128 Q150,133 158,128 Q150,126 142,128Z" fill="#f27a8a"/>')}`],
  ].filter(Boolean);
}

const BD_REAL = { real: true, out: BD_OUT, skin: BD_SKIN, c: color => color };
const BD_GHOST = { real: false, out: '#c3cdd5', skin: '#f8fbfd', c: () => '#f8fbfd' };

// Bigger, invisible tap areas for the small parts.
const BD_HITS = {
  tummy: '<ellipse cx="150" cy="226" rx="32" ry="28"/>',
  shoulders: '<circle cx="110" cy="164" r="15"/><circle cx="190" cy="164" r="15"/>',
  knees: '<circle cx="132" cy="337" r="13"/><circle cx="168" cy="337" r="13"/>',
  fingers: '<rect x="64" y="270" width="30" height="20"/><rect x="206" y="270" width="30" height="20"/>',
  toes: '<rect x="108" y="391" width="36" height="12"/><rect x="156" y="391" width="36" height="12"/>',
  ears: '<circle cx="99" cy="96" r="14"/><circle cx="201" cy="96" r="14"/>',
  eyes: '<circle cx="132" cy="94" r="12"/><circle cx="168" cy="94" r="12"/>',
  nose: '<circle cx="150" cy="108" r="10"/>',
  mouth: '<ellipse cx="150" cy="126" rx="19" ry="9"/>',
};

// ---------------------------------------------------------------------------
// The drawing. opts:
//   kid    'boy' | 'girl'
//   built  the parts on the body (array or Set); null = the whole child
//   on     the part to ring and wiggle;  fresh  the part that just arrived
//   ring   false = no ring;  hits  add the tap areas;  crop [x, y, size]
// ---------------------------------------------------------------------------
function bodySVG(opts) {
  const o = opts || {};
  const kid = o.kid === 'girl' ? 'girl' : 'boy';
  const built = o.built ? new Set(o.built) : null;
  const has = id => !built || built.has(id);
  const on = o.on || null;
  const P = id => {
    const cls = [on === id ? 'bd-on' : '', o.fresh === id ? 'bd-pop' : ''].filter(Boolean).join(' ');
    return `data-part="${id}"${cls ? ` class="${cls}"` : ''}`;
  };

  // The pale outline of the whole child, under what is built.
  const ghost = built ? `<g class="bd-ghost" pointer-events="none">${bdPieces(BD_GHOST, kid).map(([, svg]) => svg).join('')}</g>` : '';
  const real = bdPieces(BD_REAL, kid).filter(([id]) => has(id)).map(([id, svg]) => `<g ${P(id)}>${svg}</g>`).join('');
  const hits = !o.hits ? '' : `<g class="bd-hits" fill="transparent">${Object.keys(BD_HITS).filter(has)
    .map(id => `<g data-part="${id}">${BD_HITS[id]}</g>`).join('')}</g>`;

  const part = on && bodyPartById(on);
  const sw = o.crop ? Math.max(2.5, o.crop[2] / 40) : 3.5;
  const ringList = part ? (kid === 'girl' && part.girlRings) || part.rings : [];
  const rings = part && o.ring !== false ? `<g class="bd-rings">${ringList.map(([cx, cy, rx, ry]) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${BD_RING}" fill-opacity=".14" stroke="${BD_RING}" stroke-width="${sw}" stroke-dasharray="${sw * 2} ${sw * 1.4}"/>`).join('')}</g>` : '';

  const vb = o.crop ? `${o.crop[0]} ${o.crop[1]} ${o.crop[2]} ${o.crop[2]}` : '0 0 300 420';
  return `<svg class="${o.cls || ''}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${o.crop ? `<rect x="${o.crop[0]}" y="${o.crop[1]}" width="${o.crop[2]}" height="${o.crop[2]}" fill="#eaf4fb"/>` : ''}
    ${ghost}<g class="bd-figure">${real}</g>${rings}${hits}
  </svg>`;
}

// The card picture: the child cropped around the part, the part ringed.
function bodyPartThumbSVG(id, cls, kid) {
  const p = bodyPartById(id);
  return bodySVG({ on: id, kid, cls, crop: (kid === 'girl' && p.girlCrop) || p.crop });
}

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
