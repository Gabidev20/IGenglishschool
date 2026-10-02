/* ==========================================================================
   IGenglishschool — Musical Instruments: drawings, sounds and word bank
   Loaded before games.js; the Instruments game lives in GameEngine. The
   sounds are synthesised with Web Audio (no audio files), and each one is
   played at its own volume — the loud instruments really are loud and the
   quiet ones really are quiet, so the child can hear the answer.
   ========================================================================== */

const IN_OUT = '#2e2b2e';

const INSTRUMENT_ART = {
  guitar: `
    <g transform="rotate(-35 60 60)" stroke="${IN_OUT}" stroke-width="2.5" stroke-linejoin="round">
      <rect x="56" y="8" width="8" height="58" fill="#6b4a2b"/>
      <rect x="52" y="0" width="16" height="13" rx="3" fill="#4a3220"/>
      <circle cx="60" cy="74" r="19" fill="#e0913a"/>
      <circle cx="60" cy="98" r="24" fill="#e0913a"/>
      <ellipse cx="60" cy="86" rx="17" ry="10" fill="#e0913a" stroke="none"/>
      <circle cx="60" cy="84" r="7" fill="#3a2a1a"/>
      <rect x="49" y="100" width="22" height="5" fill="#4a3220"/>
      <path d="M57.5,6 V102 M60,6 V102 M62.5,6 V102" stroke="#f3eee4" stroke-width=".8"/>
    </g>`,
  piano: `
    <g stroke="${IN_OUT}" stroke-width="2.5" stroke-linejoin="round">
      <rect x="18" y="94" width="8" height="18" fill="#2a2222"/><rect x="94" y="94" width="8" height="18" fill="#2a2222"/>
      <rect x="8" y="20" width="104" height="76" rx="5" fill="#3a2f2f"/>
      <rect x="16" y="28" width="88" height="22" rx="3" fill="#4d3f3f"/>
      <rect x="14" y="58" width="92" height="26" fill="#fff"/>
      ${Array.from({ length: 7 }, (_, i) => `<line x1="${14 + (i + 1) * 92 / 8}" y1="58" x2="${14 + (i + 1) * 92 / 8}" y2="84" stroke-width="1.5"/>`).join('')}
      ${[1, 2, 4, 5, 6].map(i => `<rect x="${14 + i * 92 / 8 - 3.5}" y="58" width="7" height="15" fill="${IN_OUT}" stroke="none"/>`).join('')}
    </g>`,
  drum: `
    <g stroke="${IN_OUT}" stroke-width="2.5" stroke-linejoin="round">
      <path d="M40,22 L60,48" stroke="#c9a77d" stroke-width="5" stroke-linecap="round"/><circle cx="39" cy="20" r="4" fill="#f3eee4"/>
      <path d="M86,20 L66,48" stroke="#c9a77d" stroke-width="5" stroke-linecap="round"/><circle cx="87" cy="18" r="4" fill="#f3eee4"/>
      <path d="M22,54 V94 A38,10 0 0 0 98,94 V54Z" fill="#e5484d"/>
      <path d="M22,62 L35,90 L48,62 L61,90 L74,62 L87,90 L98,64" fill="none" stroke="#ffd166" stroke-width="3"/>
      <ellipse cx="60" cy="54" rx="38" ry="10" fill="#f5f0e6"/>
    </g>`,
  violin: `
    <path d="M12,98 L108,38" stroke="#6b4a2b" stroke-width="3" stroke-linecap="round"/>
    <path d="M14,102 L110,42" stroke="#eee" stroke-width="1.5"/>
    <g transform="rotate(-30 60 66)" stroke="${IN_OUT}" stroke-width="2.5" stroke-linejoin="round">
      <rect x="57" y="10" width="6" height="50" fill="#3a2a1a"/>
      <circle cx="60" cy="9" r="5.5" fill="#6b4a2b"/>
      <ellipse cx="60" cy="68" rx="15" ry="13" fill="#a8562a"/>
      <ellipse cx="60" cy="94" rx="19" ry="16" fill="#a8562a"/>
      <rect x="47" y="72" width="26" height="14" fill="#a8562a" stroke="none"/>
      <path d="M52,76 q-3,6 0,12 M68,76 q3,6 0,12" fill="none" stroke-width="2"/>
      <rect x="54" y="98" width="12" height="4" fill="#3a2a1a"/>
      <path d="M58.5,10 V100 M61.5,10 V100" stroke="#f3eee4" stroke-width=".8"/>
    </g>`,
};

const INSTRUMENTS = [
  { id: 'guitar', en: 'Guitar', pt: 'Violão / guitarra', emoji: '🎸', loud: false },
  { id: 'piano', en: 'Piano', pt: 'Piano', emoji: '🎹', loud: true },
  { id: 'drum', en: 'Drum', pt: 'Tambor / bateria', emoji: '🥁', loud: true },
  { id: 'violin', en: 'Violin', pt: 'Violino', emoji: '🎻', loud: false },
];
const instrumentById = id => INSTRUMENTS.find(i => i.id === id);

function instrumentSVG(id, cls) {
  return `<svg class="${cls || ''}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${INSTRUMENT_ART[id]}</svg>`;
}

// A child playing it, for the "I'm playing the piano" screen (240 x 200).
function playerSVG(id, playing) {
  const skin = '#f1c6a0';
  const arm = (d) => `<path d="${d}" fill="none" stroke="${IN_OUT}" stroke-width="12" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${skin}" stroke-width="8" stroke-linecap="round"/>`;
  const kid = `
    <g stroke="${IN_OUT}" stroke-width="2.5">
      <rect x="96" y="84" width="48" height="72" rx="16" fill="#3d7bd9"/>
      <circle cx="120" cy="60" r="24" fill="${skin}"/>
      <path d="M96,56 Q100,30 120,32 Q142,30 144,56 Q132,44 120,46 Q106,44 96,56Z" fill="#6b4a2b"/>
    </g>
    <circle cx="111" cy="62" r="3" fill="${IN_OUT}"/><circle cx="129" cy="62" r="3" fill="${IN_OUT}"/>
    <path d="M110,72 Q120,80 130,72" fill="none" stroke="${IN_OUT}" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="104" cy="70" rx="5" ry="3" fill="#f49ab0" opacity=".7"/><ellipse cx="136" cy="70" rx="5" ry="3" fill="#f49ab0" opacity=".7"/>`;
  const legs = `<rect x="104" y="150" width="12" height="40" rx="5" fill="#2e3a5a" stroke="${IN_OUT}" stroke-width="2"/><rect x="124" y="150" width="12" height="40" rx="5" fill="#2e3a5a" stroke="${IN_OUT}" stroke-width="2"/>`;
  const notes = playing ? `<g class="in-notes">
      <text x="30" y="60" font-size="26" fill="#8e5fc2">♪</text><text x="196" y="50" font-size="30" fill="#f05d77">♫</text>
      <text x="200" y="110" font-size="22" fill="#3fae8a">♪</text><text x="26" y="120" font-size="22" fill="#f08a24">♫</text></g>` : '';
  const at = (x, y, s, r = 0) => `translate(${x} ${y}) rotate(${r}) scale(${s}) translate(-60 -60)`;
  const scenes = {
    piano: `${kid}${arm('M100,100 Q90,118 92,128')}${arm('M140,100 Q150,118 148,128')}
      <g transform="${at(120, 158, 1.12)}">${INSTRUMENT_ART.piano}</g>`,
    guitar: `${legs}${kid}<g transform="${at(122, 122, 0.95, 10)}">${INSTRUMENT_ART.guitar}</g>
      ${arm('M100,100 Q86,96 86,90')}${arm('M140,104 Q136,128 126,134')}`,
    drum: `${legs}${kid}<g transform="${at(120, 156, 0.95)}">${INSTRUMENT_ART.drum}</g>
      ${arm('M100,100 Q86,112 92,124')}${arm('M140,100 Q154,112 148,124')}`,
    violin: `${legs}${kid}<g transform="${at(100, 92, 0.75, -10)}">${INSTRUMENT_ART.violin}</g>
      ${arm('M100,100 Q80,104 70,96')}${arm('M140,100 Q150,96 152,82')}`,
  };
  return `<svg class="in-player${playing ? ' playing' : ''}" viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="120" cy="192" rx="80" ry="7" fill="#000" opacity=".08"/>
    <g class="in-scene">${id ? scenes[id] : `${legs}${kid}${arm('M100,100 Q86,120 90,140')}${arm('M140,100 Q154,120 150,140')}`}</g>
    ${notes}
  </svg>`;
}

// ---------------------------------------------------------------------------
// SOUNDS — Web Audio synthesis, ~1.2 s each. `loud` instruments play at a
// high volume, quiet ones softly.
// ---------------------------------------------------------------------------
const InstrumentSound = (() => {
  let ac = null;
  const ctx = () => {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  function piano(vol) {
    const c = ctx(), t0 = c.currentTime + 0.02;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const t = t0 + i * 0.24;
      [[f, 'triangle', 1], [f * 2, 'sine', 0.3]].forEach(([freq, type, m]) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = freq;
        env(g, t, vol * m, 0.01, 0.9);
        o.connect(g).connect(c.destination);
        o.start(t); o.stop(t + 1);
      });
    });
  }
  function drum(vol) {
    const c = ctx(), t0 = c.currentTime + 0.02;
    [0, 0.3, 0.6, 0.75, 0.9].forEach((dt, i) => {
      const t = t0 + dt;
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
      env(g, t, vol, 0.005, 0.32);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.4);
      if (i % 2) {               // a snare crack on the off-beats
        const len = Math.floor(c.sampleRate * 0.15);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let k = 0; k < len; k++) data[k] = Math.random() * 2 - 1;
        const n = c.createBufferSource(), ng = c.createGain(), hp = c.createBiquadFilter();
        n.buffer = buf; hp.type = 'highpass'; hp.frequency.value = 1500;
        env(ng, t, vol * 0.5, 0.003, 0.14);
        n.connect(hp).connect(ng).connect(c.destination);
        n.start(t);
      }
    });
  }
  function guitar(vol) {
    const c = ctx(), t0 = c.currentTime + 0.02;
    [0, 0.6].forEach(st => {
      [196, 246.94, 293.66, 392].forEach((f, i) => {
        const t = t0 + st + i * 0.035;
        const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.value = f;
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3200, t);
        lp.frequency.exponentialRampToValueAtTime(500, t + 0.8);
        env(g, t, vol, 0.004, 1.1);
        o.connect(lp).connect(g).connect(c.destination);
        o.start(t); o.stop(t + 1.2);
      });
    });
  }
  function violin(vol) {
    const c = ctx(), t0 = c.currentTime + 0.02;
    [659.25, 783.99, 880].forEach((f, i) => {
      const t = t0 + i * 0.45;
      const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
      const lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      lfo.frequency.value = 5.5; lg.gain.value = 6;
      lfo.connect(lg).connect(o.frequency);
      lp.type = 'lowpass'; lp.frequency.value = 2600;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.12);
      g.gain.setValueAtTime(vol, t + 0.38);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(lp).connect(g).connect(c.destination);
      o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
    });
  }
  const players = { piano, drum, guitar, violin };
  function play(id) {
    if (typeof IGSound !== 'undefined' && IGSound.muted()) return 1300;
    try {
      const inst = instrumentById(id);
      const vol = { piano: 0.32, drum: 0.75, guitar: 0.06, violin: 0.045 }[id];
      players[id](vol);
      return inst ? 1300 : 0;
    } catch (e) { return 0; }
  }
  return { play };
})();

function instrumentFor(word) {
  const key = String((word && word.en) || '').toLowerCase().trim().replace(/^(a|an|the)\s+/, '').replace(/s$/, '');
  return INSTRUMENTS.find(i => i.id === key) || null;
}
function isInstrumentsTopic(topic) {
  return (topic.words || []).filter(w => instrumentFor(w)).length >= 3;
}

const INSTRUMENTS_TOPIC = {
  id: 'instruments', title: 'Musical Instruments', emoji: '🎸',
  words: INSTRUMENTS.map(i => ({
    id: `in_${i.id}`, en: i.en, pt: i.pt, emoji: i.emoji,
    image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(instrumentSVG(i.id).replace(' class=""', '')),
  })),
};
