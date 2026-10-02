/* ==========================================================================
   IGenglishschool — Weather: the scene, the six kinds of weather, their
   sounds and the word bank. Loaded before games.js; the game lives in
   GameEngine.

   One 400 x 260 scene — a house, a tree and a child. Dropping a weather on
   the sky changes everything at once: the sky, what falls from it, the
   ground, the tree, and what the child is wearing.
   ========================================================================== */

const WX_OUT = '#2e2b2e';

const WX_CLOUD = (x, y, s, fill) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-34,10 Q-40,-8 -22,-12 Q-18,-30 2,-26 Q14,-38 28,-24 Q44,-24 42,-6 Q52,6 38,14 H-28 Q-40,14 -34,10Z"
          fill="${fill}" stroke="${WX_OUT}" stroke-width="${2.2 / s}" stroke-linejoin="round"/>
  </g>`;

const WEATHERS = [
  { id: 'sunny', en: 'Sunny', pt: 'Ensolarado', emoji: '☀️', sky: '#8fd3f5', extra: "Let's wear sunglasses!",
    icon: `<g class="wx-spin" style="transform-origin:32px 32px">${Array.from({ length: 8 }, (_, i) => `<rect x="30" y="2" width="4" height="12" rx="2" fill="#f9b44a" transform="rotate(${i * 45} 32 32)"/>`).join('')}</g>
           <circle cx="32" cy="32" r="14" fill="#ffd166" stroke="${WX_OUT}" stroke-width="2"/>` },
  { id: 'rainy', en: 'Rainy', pt: 'Chuvoso', emoji: '🌧️', sky: '#8a9bab', extra: 'Take your umbrella!',
    icon: `${WX_CLOUD(32, 26, 0.75, '#9ea3a9')}${[20, 30, 40].map((x, i) => `<path d="M${x},40 l-3,8" stroke="#3d7bd9" stroke-width="3" stroke-linecap="round"/><path d="M${x + 5},${46 + (i % 2) * 4} l-3,8" stroke="#3d7bd9" stroke-width="3" stroke-linecap="round"/>`).join('')}` },
  { id: 'cloudy', en: 'Cloudy', pt: 'Nublado', emoji: '☁️', sky: '#b8c4cc', extra: 'The sky is grey.',
    icon: `${WX_CLOUD(40, 22, 0.55, '#d3d7db')}${WX_CLOUD(28, 38, 0.72, '#eef0f2')}` },
  { id: 'snowy', en: 'Snowy', pt: 'Com neve', emoji: '❄️', sky: '#c9d6df', extra: "Let's make a snowman!",
    icon: `${WX_CLOUD(32, 24, 0.72, '#eef3f7')}${[[18, 46], [32, 52], [46, 46], [25, 58], [40, 60]].map(([x, y]) => `<g transform="translate(${x} ${y})"><path d="M-4,0 H4 M0,-4 V4 M-3,-3 L3,3 M3,-3 L-3,3" stroke="#5aa7d6" stroke-width="1.6" stroke-linecap="round"/></g>`).join('')}` },
  { id: 'stormy', en: 'Stormy', pt: 'Tempestuoso', emoji: '⛈️', sky: '#4a5566', extra: "Let's stay inside!",
    icon: `${WX_CLOUD(32, 24, 0.75, '#5b6572')}<path d="M34,36 L24,50 H32 L26,62 L42,44 H34 L40,36Z" fill="#ffd166" stroke="${WX_OUT}" stroke-width="1.8" stroke-linejoin="round"/>` },
  { id: 'windy', en: 'Windy', pt: 'Ventando', emoji: '💨', sky: '#a9d8ee', extra: "Let's fly a kite!",
    icon: `<path d="M6,22 H38 Q48,22 48,14 Q48,6 40,8 M6,34 H52 Q60,34 60,42 Q60,50 52,48 M6,46 H30" fill="none" stroke="#5aa7d6" stroke-width="4" stroke-linecap="round"/>
           <path d="M44,52 Q52,44 58,54 Q50,58 44,52Z" fill="#5cae4a" stroke="${WX_OUT}" stroke-width="1.5"/>` },
];
const weatherById = id => WEATHERS.find(w => w.id === id);

function weatherIconSVG(id, cls) {
  return `<svg class="${cls || ''}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${weatherById(id).icon}</svg>`;
}

// ---------------------------------------------------------------------------
// The child, dressed for the weather (feet at y=238, centred on x=200).
// ---------------------------------------------------------------------------
function wxKid(id) {
  const skin = '#f1c6a0';
  const limb = (d, color, w = 9) => `<path d="${d}" fill="none" stroke="${WX_OUT}" stroke-width="${w + 4}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
  const look = {
    sunny: { top: '#f2bd2c', legs: skin, pants: '#3d7bd9', shoes: '#e5484d', short: true },
    rainy: { top: '#f2bd2c', legs: '#2e3a5a', pants: '#2e3a5a', shoes: '#3fae8a', coat: true },
    cloudy: { top: '#3d7bd9', legs: '#2e3a5a', pants: '#2e3a5a', shoes: '#9ea3a9' },
    snowy: { top: '#e5484d', legs: '#2e3a5a', pants: '#2e3a5a', shoes: '#6b4a2b', coat: true },
    stormy: { top: '#f2bd2c', legs: '#2e3a5a', pants: '#2e3a5a', shoes: '#3fae8a', coat: true },
    windy: { top: '#3fae8a', legs: '#2e3a5a', pants: '#2e3a5a', shoes: '#e5484d' },
    none: { top: '#c9a77d', legs: '#2e3a5a', pants: '#2e3a5a', shoes: '#9ea3a9' },
  }[id || 'none'];

  const legs = look.short
    ? `<rect x="188" y="196" width="24" height="12" rx="3" fill="${look.pants}" stroke="${WX_OUT}" stroke-width="2"/>${limb('M194,206 V232', skin, 8)}${limb('M206,206 V232', skin, 8)}`
    : `${limb('M194,200 V232', look.legs, 9)}${limb('M206,200 V232', look.legs, 9)}`;
  const shoes = `<ellipse cx="192" cy="236" rx="9" ry="5" fill="${look.shoes}" stroke="${WX_OUT}" stroke-width="2"/><ellipse cx="208" cy="236" rx="9" ry="5" fill="${look.shoes}" stroke="${WX_OUT}" stroke-width="2"/>`;
  const body = look.coat
    ? `<path d="M182,152 Q200,144 218,152 L224,212 H176Z" fill="${look.top}" stroke="${WX_OUT}" stroke-width="2.4" stroke-linejoin="round"/>
       <path d="M200,152 V210" stroke="${WX_OUT}" stroke-width="1.5"/>${[166, 180, 194].map(y => `<circle cx="204" cy="${y}" r="2" fill="${WX_OUT}"/>`).join('')}`
    : `<rect x="182" y="150" width="36" height="54" rx="12" fill="${look.top}" stroke="${WX_OUT}" stroke-width="2.4"/>`;

  // Arms: the right one holds the umbrella / waves; the left one holds the kite.
  const armR = id === 'rainy' || id === 'stormy' ? 'M216,160 Q228,150 230,132'
    : id === 'sunny' ? 'M216,160 Q232,150 236,134' : 'M216,160 Q226,176 224,192';
  const armL = id === 'windy' ? 'M184,160 Q170,150 162,138' : 'M184,160 Q174,176 176,192';
  const sleeve = id === 'sunny' ? skin : look.top;
  const hands = `${limb(armL, sleeve, 8)}${limb(armR, sleeve, 8)}`;

  const face = id === 'stormy'
    ? `<circle cx="193" cy="128" r="3.5" fill="#fff" stroke="${WX_OUT}" stroke-width="1.5"/><circle cx="207" cy="128" r="3.5" fill="#fff" stroke="${WX_OUT}" stroke-width="1.5"/>
       <circle cx="193" cy="128" r="1.4" fill="${WX_OUT}"/><circle cx="207" cy="128" r="1.4" fill="${WX_OUT}"/>
       <ellipse cx="200" cy="140" rx="4" ry="5" fill="#7a2e2e"/>`
    : `<circle cx="193" cy="128" r="2.6" fill="${WX_OUT}"/><circle cx="207" cy="128" r="2.6" fill="${WX_OUT}"/>
       <path d="M193,138 Q200,${id === 'cloudy' ? 141 : 145} 207,138" fill="none" stroke="${WX_OUT}" stroke-width="2.2" stroke-linecap="round"/>
       <ellipse cx="188" cy="135" rx="4" ry="2.5" fill="#f49ab0" opacity=".7"/><ellipse cx="212" cy="135" rx="4" ry="2.5" fill="#f49ab0" opacity=".7"/>`;
  const head = `<circle cx="200" cy="130" r="20" fill="${skin}" stroke="${WX_OUT}" stroke-width="2.4"/>`;
  const hair = id === 'windy'
    ? `<path d="M180,126 Q182,106 202,108 Q216,108 220,118 L236,112 L222,124 L238,124 L220,130 Q214,118 200,118 Q188,118 180,126Z" fill="#6b4a2b" stroke="${WX_OUT}" stroke-width="2"/>`
    : `<path d="M180,128 Q182,106 200,108 Q218,106 220,128 Q212,116 200,118 Q188,116 180,128Z" fill="#6b4a2b" stroke="${WX_OUT}" stroke-width="2"/>`;

  const extras = {
    sunny: `<path d="M186,126 H214" stroke="${WX_OUT}" stroke-width="2.5"/><rect x="185" y="123" width="12" height="8" rx="3" fill="${WX_OUT}"/><rect x="203" y="123" width="12" height="8" rx="3" fill="${WX_OUT}"/>
            <path d="M178,114 Q200,96 222,114Z" fill="#e5484d" stroke="${WX_OUT}" stroke-width="2"/><path d="M216,112 L236,116 L218,118Z" fill="#e5484d" stroke="${WX_OUT}" stroke-width="2"/>
            <path d="M236,134 l-6,-14 h12Z" fill="#f1d2a7" stroke="${WX_OUT}" stroke-width="1.6"/><circle cx="236" cy="118" r="6" fill="#f27aa5" stroke="${WX_OUT}" stroke-width="1.6"/>`,
    rainy: `<path d="M178,122 Q178,100 200,100 Q222,100 222,122 Q214,110 200,110 Q186,110 178,122Z" fill="${look.top}" stroke="${WX_OUT}" stroke-width="2"/>
            <path d="M231,132 V82" stroke="${WX_OUT}" stroke-width="3"/><path d="M231,134 q0,6 -5,6" fill="none" stroke="${WX_OUT}" stroke-width="3"/>
            <path d="M187,86 Q231,40 275,86 Q264,80 253,86 Q242,80 231,86 Q220,80 209,86 Q198,80 187,86Z" fill="#e5484d" stroke="${WX_OUT}" stroke-width="2.4" stroke-linejoin="round"/>`,
    cloudy: `<path d="M182,152 Q200,166 218,152" fill="none" stroke="${WX_OUT}" stroke-width="2"/><path d="M196,160 V172 M204,160 V172" stroke="#fff" stroke-width="2"/>`,
    snowy: `<path d="M180,118 Q180,98 200,98 Q220,98 220,118Z" fill="#3d7bd9" stroke="${WX_OUT}" stroke-width="2"/><rect x="178" y="114" width="44" height="8" rx="4" fill="#fff" stroke="${WX_OUT}" stroke-width="2"/>
            <circle cx="200" cy="96" r="6" fill="#fff" stroke="${WX_OUT}" stroke-width="2"/>
            <rect x="184" y="148" width="32" height="9" rx="4" fill="#f2bd2c" stroke="${WX_OUT}" stroke-width="2"/><path d="M190,148 V157 M198,148 V157 M206,148 V157" stroke="#3d7bd9" stroke-width="3"/>
            <path d="M208,156 L214,180 L204,180Z" fill="#f2bd2c" stroke="${WX_OUT}" stroke-width="2"/>
            <circle cx="176" cy="194" r="6" fill="#3d7bd9" stroke="${WX_OUT}" stroke-width="2"/><circle cx="224" cy="194" r="6" fill="#3d7bd9" stroke="${WX_OUT}" stroke-width="2"/>`,
    stormy: `<path d="M178,122 Q178,100 200,100 Q222,100 222,122 Q214,110 200,110 Q186,110 178,122Z" fill="${look.top}" stroke="${WX_OUT}" stroke-width="2"/>
             <path d="M231,132 V90" stroke="${WX_OUT}" stroke-width="3"/>
             <path d="M195,60 Q231,98 267,60 L256,74 L245,62 L231,78 L217,62 L206,74Z" fill="#e5484d" stroke="${WX_OUT}" stroke-width="2.4" stroke-linejoin="round"/>
             <path d="M231,90 L206,74 M231,90 L256,74 M231,90 L231,78" stroke="${WX_OUT}" stroke-width="1.5"/>`,
    windy: `<path d="M186,150 Q200,158 214,150 L240,140 L238,150 L250,146 L216,160 Q200,166 186,158Z" fill="#f27aa5" stroke="${WX_OUT}" stroke-width="2"/>
            <path d="M160,136 Q140,90 110,64" fill="none" stroke="${WX_OUT}" stroke-width="1.2"/>`,
    none: '',
  }[id || 'none'];

  return `<g class="wx-kid">${legs}${shoes}${body}${hands}${head}${hair}${face}${extras}</g>`;
}

// ---------------------------------------------------------------------------
// The whole scene. `id` = the weather on show (null = not chosen yet).
// ---------------------------------------------------------------------------
function weatherSceneInner(id) {
  const w = id && weatherById(id);
  const sky = w ? w.sky : '#dfe6ea';
  const snowy = id === 'snowy';
  const drops = (n, color, len, cls) => `<g class="${cls}">${Array.from({ length: n }, (_, i) => {
    const x = (i * 53) % 400 + (i % 3) * 7, y = (i * 37) % 150 + 20;
    return `<path d="M${x},${y} l-4,${len}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>`;
  }).join('')}</g>`;
  const flakes = cls => `<g class="${cls}">${Array.from({ length: 22 }, (_, i) => {
    const x = (i * 61) % 400 + 6, y = (i * 43) % 170 + 10, r = 2.5 + (i % 3);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#b7cbd8" stroke-width=".8"/>`;
  }).join('')}</g>`;

  const skyStuff = {
    none: `<g class="wx-hint">${WX_CLOUD(200, 60, 1.3, 'rgba(255,255,255,.55)')}<text x="200" y="70" text-anchor="middle" font-size="34" font-weight="900" fill="#9aa7b0" font-family="Arial, sans-serif">?</text></g>`,
    sunny: `<g class="wx-sun"><g class="wx-spin" style="transform-origin:330px 58px">${Array.from({ length: 12 }, (_, i) => `<rect x="327" y="10" width="6" height="16" rx="3" fill="#f9b44a" transform="rotate(${i * 30} 330 58)"/>`).join('')}</g>
              <circle cx="330" cy="58" r="28" fill="#ffd166" stroke="${WX_OUT}" stroke-width="2.4"/>
              <circle cx="321" cy="54" r="2.6" fill="${WX_OUT}"/><circle cx="339" cy="54" r="2.6" fill="${WX_OUT}"/><path d="M320,64 Q330,72 340,64" fill="none" stroke="${WX_OUT}" stroke-width="2.2" stroke-linecap="round"/></g>
            <g class="wx-birds"><path d="M90,50 q8,-8 16,0 q8,-8 16,0 M140,30 q6,-6 12,0 q6,-6 12,0" fill="none" stroke="${WX_OUT}" stroke-width="2.2" stroke-linecap="round"/></g>
            <g class="wx-drift">${WX_CLOUD(150, 70, 0.8, '#fff')}</g>`,
    cloudy: `<g class="wx-drift">${WX_CLOUD(90, 60, 1.2, '#e3e7ea')}${WX_CLOUD(250, 48, 1.4, '#d3d9de')}</g>
             <g class="wx-drift wx-drift--slow">${WX_CLOUD(170, 90, 1.0, '#eef1f3')}${WX_CLOUD(350, 92, 0.9, '#e3e7ea')}</g>`,
    rainy: `${drops(26, '#3d7bd9', 12, 'wx-fall')}${drops(26, '#5a8fd0', 12, 'wx-fall wx-fall--late')}
            ${WX_CLOUD(90, 50, 1.4, '#9ea3a9')}${WX_CLOUD(240, 40, 1.6, '#8e949b')}${WX_CLOUD(360, 56, 1.1, '#9ea3a9')}
            ${[[80, 246], [300, 250], [140, 252]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="4" fill="#7fb4ea" opacity=".7"/>`).join('')}`,
    snowy: `${flakes('wx-snow')}${flakes('wx-snow wx-snow--late')}
            ${WX_CLOUD(110, 44, 1.3, '#eef3f7')}${WX_CLOUD(300, 40, 1.4, '#e6edf2')}
            <g class="wx-snowman">
              <circle cx="300" cy="226" r="18" fill="#fff" stroke="${WX_OUT}" stroke-width="2.2"/><circle cx="300" cy="196" r="13" fill="#fff" stroke="${WX_OUT}" stroke-width="2.2"/>
              <circle cx="296" cy="193" r="1.8" fill="${WX_OUT}"/><circle cx="304" cy="193" r="1.8" fill="${WX_OUT}"/><path d="M300,197 l9,2 l-9,2Z" fill="#f08a24"/>
              <rect x="290" y="176" width="20" height="8" fill="${WX_OUT}"/><rect x="286" y="183" width="28" height="3" fill="${WX_OUT}"/>
              <path d="M286,216 L270,206 M314,216 L330,206" stroke="#6b4a2b" stroke-width="2.5" stroke-linecap="round"/></g>`,
    stormy: `<rect class="wx-flash" width="400" height="260" fill="#fff"/>
             ${drops(30, '#9fb6d0', 16, 'wx-fall wx-fall--fast')}
             ${WX_CLOUD(80, 46, 1.5, '#5b6572')}${WX_CLOUD(230, 38, 1.8, '#4f5865')}${WX_CLOUD(360, 50, 1.3, '#5b6572')}
             <path class="wx-bolt" d="M246,64 L224,112 H240 L226,150 L262,100 H246 L258,64Z" fill="#ffd166" stroke="${WX_OUT}" stroke-width="2.2" stroke-linejoin="round"/>`,
    windy: `<g class="wx-wind">${[[20, 50, 120], [180, 90, 150], [60, 130, 100], [250, 40, 110]].map(([x, y, l]) =>
              `<path d="M${x},${y} h${l} q14,0 14,-10 q0,-10 -10,-8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/>`).join('')}</g>
            <g class="wx-drift wx-drift--fast">${WX_CLOUD(120, 40, 0.8, '#fff')}${WX_CLOUD(330, 60, 0.7, '#fff')}</g>
            <g class="wx-leaves">${[[60, 160], [130, 120], [330, 150], [250, 180]].map(([x, y], i) => `<path d="M${x},${y} q8,-8 14,2 q-8,6 -14,-2Z" fill="${i % 2 ? '#f08a24' : '#5cae4a'}" stroke="${WX_OUT}" stroke-width="1.2"/>`).join('')}</g>
            <g class="wx-kite"><path d="M110,40 L126,62 L110,88 L94,62Z" fill="#e5484d" stroke="${WX_OUT}" stroke-width="2.2" stroke-linejoin="round"/>
              <path d="M110,40 V88 M94,62 H126" stroke="${WX_OUT}" stroke-width="1.2"/><path d="M126,62 L110,40 L110,62Z" fill="#f2bd2c"/>
              <path d="M110,88 q-6,10 4,16 q-8,8 2,16" fill="none" stroke="${WX_OUT}" stroke-width="1.5"/>
              ${[[106, 98], [114, 112]].map(([x, y]) => `<path d="M${x - 5},${y} l5,-3 l5,3 l-5,3Z" fill="#3d7bd9"/>`).join('')}</g>`,
  }[id || 'none'];

  const ground = snowy
    ? `<rect y="196" width="400" height="64" fill="#f4f8fb"/><path d="M0,198 Q100,186 200,196 T400,192 V206 H0Z" fill="#fff" stroke="#c9d9e4" stroke-width="1.5"/>`
    : `<rect y="196" width="400" height="64" fill="${id === 'stormy' ? '#6c9a52' : id === 'rainy' ? '#78ac5c' : '#8cc56c'}"/><path d="M0,198 Q100,188 200,196 T400,194 V204 H0Z" fill="${id === 'stormy' ? '#5f8a47' : '#7cb85a'}"/>`;
  const lit = id === 'stormy' || id === 'rainy' || id === 'cloudy';
  const house = `
    <g stroke="${WX_OUT}" stroke-width="2.4" stroke-linejoin="round">
      <rect x="30" y="140" width="96" height="66" fill="#f2e3c9"/>
      <path d="M22,142 L78,100 L134,142Z" fill="${snowy ? '#fff' : '#c9435c'}"/>
      ${snowy ? `<path d="M22,142 L78,100 L134,142 L128,146 L78,108 L28,146Z" fill="#e3edf3" stroke="none"/>` : ''}
      <rect x="68" y="170" width="20" height="36" fill="#8b5e3c"/>
      <rect x="40" y="154" width="20" height="18" fill="${lit ? '#ffe08a' : '#bfe3f5'}"/><rect x="98" y="154" width="20" height="18" fill="${lit ? '#ffe08a' : '#bfe3f5'}"/>
    </g>`;
  const tree = `
    <g class="${id === 'windy' || id === 'stormy' ? 'wx-sway' : ''}" style="transform-origin:345px 200px">
      <rect x="338" y="140" width="14" height="62" fill="#7a5230" stroke="${WX_OUT}" stroke-width="2.2"/>
      <circle cx="345" cy="120" r="34" fill="${snowy ? '#e9f1f6' : '#4f9a3e'}" stroke="${WX_OUT}" stroke-width="2.2"/>
      <circle cx="324" cy="140" r="20" fill="${snowy ? '#e9f1f6' : '#5cae4a'}" stroke="${WX_OUT}" stroke-width="2.2"/>
      <circle cx="366" cy="140" r="20" fill="${snowy ? '#e9f1f6' : '#5cae4a'}" stroke="${WX_OUT}" stroke-width="2.2"/>
    </g>`;
  return `<rect class="wx-sky" width="400" height="260" fill="${sky}"/>${ground}${house}${tree}${skyStuff}${wxKid(id)}`;
}

// ---------------------------------------------------------------------------
// The sound of each weather, played when it arrives (about two seconds).
// ---------------------------------------------------------------------------
function playWeatherSound(id) {
  if (typeof IGSound === 'undefined' || IGSound.muted()) return;
  const S = IGSound;
  try {
    if (id === 'sunny') {           // birds singing
      [[0, 2200, 3200], [0.18, 2600, 3600], [0.5, 2000, 3000], [0.66, 2400, 3400], [1.0, 2800, 3800]]
        .forEach(([t, a, b]) => S.slide(a, b, t, 0.12, 'sine', 0.06));
    } else if (id === 'rainy') {    // rain on the roof, with a few drips
      for (let i = 0; i < 8; i++) S.noise(i * 0.25, 0.5, 'lowpass', 1600, 1200, 0.16);
      [0.3, 0.8, 1.3, 1.7].forEach(t => S.slide(1400, 600, t, 0.08, 'sine', 0.05));
    } else if (id === 'cloudy') {   // a soft, grey hum
      S.note(220, 0, 1.6, 'sine', 0.06); S.note(277, 0.2, 1.4, 'sine', 0.05); S.note(330, 0.4, 1.2, 'sine', 0.04);
    } else if (id === 'snowy') {    // twinkling, quiet
      [1568, 2093, 1760, 2349, 1976, 2637].forEach((f, i) => S.note(f, i * 0.18, 0.5, 'sine', 0.035));
    } else if (id === 'stormy') {   // thunder: a crack, then the rumble
      S.noise(0, 0.12, 'highpass', 2500, 0, 0.35);
      S.noise(0.05, 2.2, 'lowpass', 420, 60, 0.75);
      S.noise(0.4, 1.6, 'lowpass', 200, 50, 0.55);
      for (let i = 0; i < 6; i++) S.noise(1.4 + i * 0.22, 0.4, 'lowpass', 1400, 1200, 0.1);
    } else if (id === 'windy') {    // a whoosh rising and falling
      S.noise(0, 1.0, 'bandpass', 300, 1400, 0.3);
      S.noise(0.8, 1.2, 'bandpass', 1300, 350, 0.28);
    }
  } catch (e) { /* audio blocked */ }
}

function weatherFor(word) {
  const key = String((word && word.en) || '').toLowerCase().trim();
  return WEATHERS.find(w => w.id === key) || null;
}
function isWeatherTopic(topic) {
  const label = `${topic.id || ''} ${topic.title || ''}`.toLowerCase();
  if (/weather|clima|tempo/.test(label) && (topic.words || []).some(w => weatherFor(w))) return true;
  return (topic.words || []).filter(w => weatherFor(w)).length >= 3;
}

const WEATHER_TOPIC = {
  id: 'weather', title: 'Weather', emoji: '🌦️',
  words: WEATHERS.map(w => ({
    id: `wx_${w.id}`, en: w.en, pt: w.pt, emoji: w.emoji,
    image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">${weatherSceneInner(w.id)}</svg>`),
  })),
};
const openWeatherGame = () => openReadyGame(WEATHER_TOPIC, 'weather', '🌦️ Weather');
