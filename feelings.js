/* ==========================================================================
   IGenglishschool — Feelings: faces and the word bank
   Loaded before games.js; the Feelings game lives in GameEngine. Every
   face is a 200 x 200 drawing: the same round face, with each feeling's
   eyes, mouth and extras (a tear, Zzz, a thermometer…) on top.
   ========================================================================== */

const FE_OUT = '#2e2b2e';
const FE_MOUTH = '#7a2e2e';
const feStroke = (d, w = 5, color = FE_OUT) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const feDot = (x, y, rx = 7, ry = 10) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${FE_OUT}"/>`;
const feBigEye = (x, y, px = 0, py = 0, pr = 6) => `<circle cx="${x}" cy="${y}" r="13" fill="#fff" stroke="${FE_OUT}" stroke-width="3"/><circle cx="${x + px}" cy="${y + py}" r="${pr}" fill="${FE_OUT}"/>`;
const feDrop = (x, y, s = 1, color = '#5aa7d6') => `<path d="M${x},${y} q${-8 * s},${16 * s} 0,${20 * s} q${8 * s},${-4 * s} 0,${-20 * s}Z" fill="${color}" stroke="${FE_OUT}" stroke-width="1.5"/>`;

const FEELINGS = [
  { id: 'happy', en: 'Happy', pt: 'Feliz', emoji: '😀', tint: '#ffd166',
    draw: () => `${feDot(72, 80)}${feDot(128, 80)}
      <ellipse cx="54" cy="112" rx="13" ry="7" fill="#f49ab0" opacity=".8"/><ellipse cx="146" cy="112" rx="13" ry="7" fill="#f49ab0" opacity=".8"/>
      <path d="M58,112 Q100,172 142,112 Q100,130 58,112Z" fill="${FE_MOUTH}" stroke="${FE_OUT}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M82,142 Q100,156 118,142 Q100,134 82,142Z" fill="#f27a8a"/>` },
  { id: 'sad', en: 'Sad', pt: 'Triste', emoji: '😢', tint: '#ffd166',
    draw: () => `${feStroke('M56,70 L84,60')}${feStroke('M144,70 L116,60')}
      ${feDot(72, 86, 7, 9)}${feDot(128, 86, 7, 9)}
      ${feStroke('M66,146 Q100,114 134,146', 6)}
      ${feDrop(64, 100, 1.1)}` },
  { id: 'angry', en: 'Angry', pt: 'Bravo', emoji: '😠', tint: '#ff9e80',
    draw: () => `${feStroke('M52,60 L88,78', 7)}${feStroke('M148,60 L112,78', 7)}
      ${feDot(74, 92, 7, 7)}${feDot(126, 92, 7, 7)}
      ${feStroke('M68,144 Q100,120 132,144', 6)}
      ${feStroke('M148,30 l12,12 M160,30 l-12,12', 4, '#c9435c')}` },
  { id: 'tired', en: 'Tired', pt: 'Cansado', emoji: '😩', tint: '#ffd166',
    draw: () => `${feStroke('M58,84 H88', 5)}${feStroke('M112,84 H142', 5)}
      <path d="M60,84 Q73,98 86,84Z" fill="${FE_OUT}"/><path d="M114,84 Q127,98 140,84Z" fill="${FE_OUT}"/>
      ${feStroke('M60,102 Q73,108 86,102', 3, '#b98fb0')}${feStroke('M114,102 Q127,108 140,102', 3, '#b98fb0')}
      ${feStroke('M74,140 Q87,132 100,140 Q113,148 126,140', 5)}
      ${feDrop(150, 52, 1)}` },
  { id: 'surprised', en: 'Surprised', pt: 'Surpreso', emoji: '😲', tint: '#ffd166',
    draw: () => `${feStroke('M56,54 Q72,42 88,54')}${feStroke('M112,54 Q128,42 144,54')}
      ${feBigEye(72, 82)}${feBigEye(128, 82)}
      <ellipse cx="100" cy="138" rx="15" ry="20" fill="${FE_MOUTH}" stroke="${FE_OUT}" stroke-width="4"/>` },
  { id: 'sleepy', en: 'Sleepy', pt: 'Com sono', emoji: '😴', tint: '#ffd166',
    draw: () => `${feStroke('M58,86 Q72,96 86,86', 5)}${feStroke('M114,86 Q128,96 142,86', 5)}
      <ellipse cx="100" cy="138" rx="8" ry="6" fill="${FE_MOUTH}" stroke="${FE_OUT}" stroke-width="3"/>
      <circle cx="122" cy="132" r="9" fill="#d8f0fa" stroke="#8fc9e0" stroke-width="2" opacity=".9"/>
      <text x="140" y="52" font-family="Arial, sans-serif" font-weight="900" font-size="26" fill="#3d7bd9">Z</text>
      <text x="160" y="32" font-family="Arial, sans-serif" font-weight="900" font-size="19" fill="#3d7bd9">z</text>
      <text x="174" y="16" font-family="Arial, sans-serif" font-weight="900" font-size="14" fill="#3d7bd9">z</text>` },
  { id: 'sick', en: 'Sick', pt: 'Doente', emoji: '🤒', tint: '#bfe0a0',
    draw: () => `${feStroke('M56,68 L84,74', 4)}${feStroke('M144,68 L116,74', 4)}
      ${feStroke('M60,88 Q72,82 84,88', 5)}${feStroke('M116,88 Q128,82 140,88', 5)}
      ${feStroke('M70,136 Q80,130 90,136 Q100,142 110,136', 5)}
      <g transform="rotate(-20 110 136)"><rect x="108" y="131" width="50" height="10" rx="5" fill="#fff" stroke="${FE_OUT}" stroke-width="2.5"/><rect x="128" y="134" width="24" height="4" rx="2" fill="#e5484d"/></g>
      ${feDrop(54, 46, 0.9)}${feDrop(146, 44, 0.9)}` },
  { id: 'hungry', en: 'Hungry', pt: 'Com fome', emoji: '🤤', tint: '#ffd166',
    draw: () => `${feBigEye(70, 84, 0, -6, 5)}${feBigEye(118, 84, 0, -6, 5)}
      ${feStroke('M62,122 Q100,152 138,122', 6)}
      <ellipse cx="126" cy="134" rx="10" ry="8" fill="#f27a8a" stroke="${FE_OUT}" stroke-width="3"/>
      ${feDrop(80, 136, 0.8, '#bfe3f5')}
      <circle cx="146" cy="50" r="4" fill="#fff" stroke="${FE_OUT}" stroke-width="2"/><circle cx="156" cy="38" r="6" fill="#fff" stroke="${FE_OUT}" stroke-width="2"/>
      <circle cx="176" cy="22" r="20" fill="#fff" stroke="${FE_OUT}" stroke-width="2.5"/>
      <path d="M163,22 Q176,6 189,22Z" fill="#e0913a" stroke="${FE_OUT}" stroke-width="1.5"/>
      <rect x="162" y="22" width="28" height="4" rx="2" fill="#5cae4a"/><rect x="162" y="26" width="28" height="5" rx="2" fill="#7a3f2a"/>
      <path d="M163,31 H189 Q189,38 176,38 Q163,38 163,31Z" fill="#e0913a" stroke="${FE_OUT}" stroke-width="1.5"/>` },
  { id: 'scared', en: 'Scared', pt: 'Com medo', emoji: '😨', tint: '#dbe9f6',
    draw: () => `${feStroke('M56,66 Q72,52 86,62', 5)}${feStroke('M144,66 Q128,52 114,62', 5)}
      ${feBigEye(72, 86, 0, 0, 3.5)}${feBigEye(128, 86, 0, 0, 3.5)}
      <path d="M66,136 Q100,124 134,136 Q134,156 100,156 Q66,156 66,136Z" fill="${FE_MOUTH}" stroke="${FE_OUT}" stroke-width="4"/>
      ${feStroke('M76,138 L82,146 L90,138 L98,146 L106,138 L114,146 L122,138', 2.5, '#fff')}
      ${feDrop(42, 70, 1)}${feDrop(158, 70, 1)}
      ${feStroke('M4,96 l8,-4 M2,110 h10 M4,124 l8,4 M196,96 l-8,-4 M198,110 h-10 M196,124 l-8,4', 3)}` },
];

const feelingById = id => FEELINGS.find(f => f.id === id);

// The face with nothing on it is `null`.
function faceSVG(feeling, cls) {
  const tint = feeling ? feeling.tint : '#ffd166';
  return `<svg class="${cls || ''}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="100" cy="102" r="86" fill="${tint}" stroke="${FE_OUT}" stroke-width="4"/>
    <ellipse cx="68" cy="44" rx="18" ry="9" fill="#fff" opacity=".35" transform="rotate(-25 68 44)"/>
    ${feeling ? `<g class="fe-features">${feeling.draw()}</g>` : ''}
  </svg>`;
}

function feelingFor(word) {
  const key = String((word && word.en) || '').toLowerCase().trim();
  return FEELINGS.find(f => f.en.toLowerCase() === key) || null;
}
function isFeelingsTopic(topic) {
  return (topic.words || []).filter(w => feelingFor(w)).length >= 3;
}

const FEELINGS_TOPIC = {
  id: 'feelings', title: 'Feelings', emoji: '😊',
  words: FEELINGS.map(f => ({
    id: `fe_${f.id}`, en: f.en, pt: f.pt, emoji: f.emoji,
    image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(faceSVG(f).replace(' class=""', '')),
  })),
};
