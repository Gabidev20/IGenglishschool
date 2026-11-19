/* ==========================================================================
   IGenglishschool — Exam Maker: every topic of the site and of the books
   --------------------------------------------------------------------------
   examMaker.js ships a hand-written bank of exam topics. This file adds:
     • two hand-written topics: Past continuous and Weather forecast;
     • every topic of the site (topicsData.js, the coursebook units, the
       teacher's own topics) built from its words, sentences, rules and sort;
     • every unit of the online books (bookSpeaking.js: words + phrases).
   The chips appear in the Exam Maker grouped by level and by book, folded so
   the list stays short. Loaded after examMaker.js, contentStore.js and
   bookSpeaking.js. Every global here starts with exa / EXA_.
   ========================================================================== */

// ---------------------------------------------------------------------------
// 1. PAST CONTINUOUS (hand-written)
// ---------------------------------------------------------------------------
const EXA_PC_LINES = [
  { s: 'I', be: 'was', v: 'watch', ing: 'watching', r: 'TV at eight o\'clock' },
  { s: 'She', be: 'was', v: 'cook', ing: 'cooking', r: 'dinner when I arrived' },
  { s: 'They', be: 'were', v: 'play', ing: 'playing', r: 'soccer in the park' },
  { s: 'We', be: 'were', v: 'wait', ing: 'waiting', r: 'for the bus' },
  { s: 'He', be: 'was', v: 'swim', ing: 'swimming', r: 'in the ocean' },
  { s: 'It', be: 'was', v: 'rain', ing: 'raining', r: 'all morning' },
  { s: 'You', be: 'were', v: 'talk', ing: 'talking', r: 'very loudly' },
  { s: 'Ana', be: 'was', v: 'write', ing: 'writing', r: 'a letter' },
  { s: 'My friends', be: 'were', v: 'dance', ing: 'dancing', r: 'at the party' },
  { s: 'The dog', be: 'was', v: 'run', ing: 'running', r: 'in the garden' },
  { s: 'Tom and Mia', be: 'were', v: 'ride', ing: 'riding', r: 'their bikes' },
  { s: 'My mom', be: 'was', v: 'read', ing: 'reading', r: 'a book in the living room' },
  { s: 'The children', be: 'were', v: 'sleep', ing: 'sleeping', r: 'at ten o\'clock' },
  { s: 'I', be: 'was', v: 'study', ing: 'studying', r: 'for the test last night' },
];
const EXA_PC_WHEN = [
  { long: 'I was taking a shower', short: 'the phone rang' },
  { long: 'She was walking to school', short: 'it started to rain' },
  { long: 'We were having dinner', short: 'the lights went out' },
  { long: 'They were playing soccer', short: 'Dad arrived' },
  { long: 'He was sleeping', short: 'the dog barked' },
  { long: 'I was cooking', short: 'my friend called me' },
];
const EXA_PC_WHILE = [
  'I was reading while my brother was playing.',
  'She was cooking while he was cleaning the kitchen.',
  'We were talking while the teacher was writing on the board.',
  'They were singing while we were dancing.',
];
// A subject in the middle of a question: "you", "my friends", but "I" and "Ana".
const exaMid = s => (/^(I|Ana|Tom)\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const exaPcNeg = be => (be === 'was' ? "wasn't" : "weren't");

const EXA_PASTCONT_TOPIC = {
  id: 'pastcontinuous',
  label: 'Past continuous',
  pt: 'Passado contínuo (was/were + -ing)',
  aliases: ['past continuous', 'past progressive', 'passado continuo', 'passado contínuo',
    'past continuous tense', 'was were ing', 'was were + ing', 'when and while', 'when while'],
  gens: [
    () => { const l = exPick(EXA_PC_LINES);
      return exMC(`${l.s} ____ ${l.ing} ${l.r}.`, l.be, [l.be === 'was' ? 'were' : 'was', 'is', 'are'],
        `${l.s} → ${l.be}. (I / he / she / it → was; you / we / they → were)`); },
    () => { const l = exPick(EXA_PC_LINES);
      return exGap(`${l.s} ____ (${l.v}) ${l.r}.`, `${l.be} ${l.ing}`,
        { hint: 'was / were + -ing', explain: `${l.s} ${l.be} ${l.ing} ${l.r}.` }); },
    () => { const l = exPick(EXA_PC_LINES);
      return exGap(`${l.s} ____ (not / ${l.v}) ${l.r}.`, `${exaPcNeg(l.be)} ${l.ing}`,
        { hint: "wasn't / weren't + -ing", explain: `${l.s} ${exaPcNeg(l.be)} ${l.ing} ${l.r}.` }); },
    () => { const l = exPick(EXA_PC_LINES.filter(x => x.s !== 'I'));
      const subj = exaMid(l.s);
      return exMC(`____ ${subj} ${l.ing} ${l.r}?`, exCap(l.be), [l.be === 'was' ? 'Were' : 'Was', 'Did', 'Do'],
        `Questions: ${exCap(l.be)} + ${subj} + -ing?`); },
    () => { const l = exPick(EXA_PC_LINES);
      return exMC(`Write the -ing form: ${l.v} → ____`, l.ing,
        [`${l.v}ing`, `${l.v}eing`, `${l.v}${l.v.slice(-1)}ing`].filter(x => x !== l.ing),
        `${l.v} → ${l.ing}.`); },
    () => { const w = exPick(EXA_PC_WHEN);
      return exMC(`${w.long} ____ ${w.short}.`, 'when', ['while', 'because', 'and then'],
        'The long action (past continuous) + WHEN + the short action that interrupts it (past simple).'); },
    () => { const s = exPick(EXA_PC_WHILE);
      return exMC(`${s.replace(' while ', ' ____ ')}`, 'while', ['when', 'but', 'so'],
        'Two long actions at the same time → while.'); },
    () => { const w = exPick(EXA_PC_WHEN);
      const [subj, , ...rest] = w.long.split(' ');
      return exMC('Choose the correct sentence.', `${w.long} when ${w.short}.`,
        [`${w.long.replace(/\b(was|were) /, '')} when ${w.short}.`,
          `${w.long.replace(/\b(was|were)\b/, m => (m === 'was' ? 'were' : 'was'))} when ${w.short}.`,
          `${subj} is ${rest.join(' ')} when ${w.short}.`],
        'Past continuous (was/were + -ing) for the long action, past simple for the short one.'); },
    () => { const l = exPick(EXA_PC_LINES);
      return exOrder(`${l.s} ${l.be} ${l.ing} ${l.r}.`, `${l.s} + ${l.be} + ${l.ing}…`); },
    () => { const w = exPick(EXA_PC_WHEN);
      return exOrder(`${w.long} when ${w.short}.`, 'long action + when + short action'); },
    () => { const l = exPick(EXA_PC_LINES);
      return exGap(`What ____ ${exaMid(l.s)} doing at 8 p.m. yesterday?`,
        l.s === 'I' ? 'was' : l.be, { hint: 'was / were', explain: 'What + was/were + subject + doing?' }); },
    () => {
      const items = [
        { t: 'I was watching TV.', b: 'Past continuous' }, { t: 'I watched TV.', b: 'Past simple' },
        { t: 'They were playing soccer.', b: 'Past continuous' }, { t: 'They played soccer.', b: 'Past simple' },
        { t: 'She was sleeping.', b: 'Past continuous' }, { t: 'She slept a lot.', b: 'Past simple' },
        { t: 'We were eating pizza.', b: 'Past continuous' }, { t: 'We ate pizza.', b: 'Past simple' },
      ];
      const it = exPick(items);
      return exSort(it.t, it.b, ['Past simple', 'Past continuous'], 'Past continuous = was/were + -ing.');
    },
  ],
  pairs: () => exPickN(EXA_PC_LINES, 6).map(l => ({ left: l.v, right: `${l.be} ${l.ing}` })),
};

// ---------------------------------------------------------------------------
// 2. WEATHER FORECAST (hand-written, American English)
// ---------------------------------------------------------------------------
const EXA_WEATHER = [
  { w: 'sunny', e: '☀️', pt: 'ensolarado' }, { w: 'cloudy', e: '☁️', pt: 'nublado' },
  { w: 'rainy', e: '🌧️', pt: 'chuvoso' }, { w: 'stormy', e: '⛈️', pt: 'com tempestade' },
  { w: 'snowy', e: '❄️', pt: 'com neve' }, { w: 'windy', e: '💨', pt: 'com vento' },
  { w: 'foggy', e: '🌫️', pt: 'com neblina' }, { w: 'partly cloudy', e: '⛅', pt: 'parcialmente nublado' },
  { w: 'hot', e: '🥵', pt: 'quente' }, { w: 'cold', e: '🥶', pt: 'frio' },
];
const EXA_WEATHER_CLUES = [
  { s: "It's ____ today. Take your umbrella!", a: 'rainy' },
  { s: "It's ____ today. Wear your sunglasses!", a: 'sunny' },
  { s: "It's ____. I can't see the street very well.", a: 'foggy' },
  { s: "It's very ____. My kite is flying high!", a: 'windy' },
  { s: "It's ____. There's thunder and lightning!", a: 'stormy' },
  { s: "It's ____. Let's build a snowman!", a: 'snowy' },
  { s: "It's ____. I can't see the sun today.", a: 'cloudy' },
];
const EXA_TEMPS = [
  { t: 'It\'s 35 degrees Celsius.', a: 'hot' }, { t: 'It\'s 2 degrees Celsius.', a: 'cold' },
  { t: 'It\'s 95 degrees Fahrenheit.', a: 'hot' }, { t: 'It\'s 30 degrees Fahrenheit.', a: 'cold' },
];
const EXA_FORECAST_LINES = [
  "What's the weather like today?",
  "It's sunny and hot in Guaratuba.",
  'Tomorrow it will be cloudy and cool.',
  "Don't forget your umbrella!",
  'It will rain on Saturday.',
  "Look at those clouds! It's going to rain.",
  "What's the temperature right now?",
  "It's partly cloudy in the morning.",
];
const EXA_WEATHER_TOPIC = {
  id: 'weatherforecast',
  label: 'Weather forecast',
  pt: 'Previsão do tempo',
  aliases: ['weather forecast', 'weather', 'forecast', 'weather report', 'previsao do tempo',
    'previsão do tempo', 'tempo', 'clima', 'the weather', "what's the weather like", 'temperature', 'temperatura'],
  gens: [
    () => { const x = exPick(EXA_WEATHER.slice(0, 8));
      return exMC(`${x.e} What's the weather like? It's ____.`, x.w,
        exPickN(EXA_WEATHER.slice(0, 8).filter(y => y.w !== x.w), 3).map(y => y.w)); },
    () => { const c = exPick(EXA_WEATHER_CLUES);
      return exMC(c.s, c.a, exPickN(EXA_WEATHER_CLUES.filter(y => y.a !== c.a), 3).map(y => y.a)); },
    () => { const c = exPick(EXA_WEATHER_CLUES);
      return exGap(c.s, c.a, { hint: (EXA_WEATHER.find(y => y.w === c.a) || {}).e || '' }); },
    () => { const t = exPick(EXA_TEMPS);
      return exMC(`${t.t} It's ____.`, t.a, ['hot', 'cold', 'snowy', 'foggy'].filter(x => x !== t.a).slice(0, 3)); },
    () => { const x = exPick(EXA_WEATHER);
      return exMC(`What does "${x.w}" mean?`, x.pt, exPickN(EXA_WEATHER.filter(y => y.w !== x.w), 3).map(y => y.pt)); },
    () => exMC("What's the weather ____ today?", 'like', ['love', 'likes', 'do'],
      "What's the weather like? = Como está o tempo?"),
    () => { const d = exPick(['Tomorrow', 'On Saturday', 'Next week', 'Tonight']);
      const w = exPick(['sunny', 'cloudy', 'windy', 'cold', 'hot']);
      return exMC(`${d}, it ____ be ${w}.`, 'will', ['was', 'is', 'were'], 'A forecast talks about the future: it will be…'); },
    () => exMC("Look at those black clouds! It's ____ to rain.", 'going', ['go', 'will', 'went'],
      'We can see it coming → be going to.'),
    () => { const x = exPick([{ w: 'rain', n: 'rainy' }, { w: 'snow', n: 'snowy' }, { w: 'wind', n: 'windy' }, { w: 'sun', n: 'sunny' }, { w: 'cloud', n: 'cloudy' }, { w: 'fog', n: 'foggy' }]);
      return exGap(`${x.w} → It's ____.`, x.n, { hint: 'add -y', explain: `${x.w} → ${x.n}` }); },
    () => { const m = exPick([{ m: 'December', s: 'summer' }, { m: 'July', s: 'winter' }, { m: 'April', s: 'fall' }, { m: 'October', s: 'spring' }]);
      return exMC(`In Brazil, ${m.m} is in the ____.`, m.s, ['summer', 'winter', 'fall', 'spring'].filter(x => x !== m.s),
        'In Brazil: summer Dec–Mar, fall Mar–Jun, winter Jun–Sep, spring Sep–Dec.'); },
    () => exOrder(exPick(EXA_FORECAST_LINES)),
    () => { const it = exPick([
        { t: 'shorts', b: 'Hot day' }, { t: 'sunglasses', b: 'Hot day' }, { t: 'a T-shirt', b: 'Hot day' }, { t: 'sandals', b: 'Hot day' },
        { t: 'a coat', b: 'Cold day' }, { t: 'a scarf', b: 'Cold day' }, { t: 'gloves', b: 'Cold day' }, { t: 'boots', b: 'Cold day' }]);
      return exSort(it.t, it.b, ['Hot day', 'Cold day'], 'What do you wear?'); },
  ],
  pairs: () => exPickN(EXA_WEATHER, 6).map(x => ({ left: `${x.e} ${x.pt}`, right: x.w })),
  words: () => EXA_WEATHER.map(x => ({ id: `wf_${x.w.replace(/\s/g, '')}`, en: x.w, pt: x.pt, emoji: x.e })),
};

(function exaAddHandWritten() {
  if (typeof EXAM_TOPICS === 'undefined') return;
  [EXA_PASTCONT_TOPIC, EXA_WEATHER_TOPIC].forEach(t => { if (!EXAM_TOPICS.some(x => x.id === t.id)) EXAM_TOPICS.push(t); });
  if (typeof EX_GRAMMAR_LEVEL !== 'undefined') { EX_GRAMMAR_LEVEL.pastcontinuous = 'a2'; EX_GRAMMAR_LEVEL.weatherforecast = 'a1'; }
})();

// ---------------------------------------------------------------------------
// 3. EVERY SITE TOPIC AND EVERY BOOK UNIT
// ---------------------------------------------------------------------------
const EXA_BOOK_NAMES = {
  'little-steps': 'Little Steps', explorers: 'Explorers', adventurers: 'Adventurers',
  beyond: 'Beyond', a1: 'Speak Up! A1+', teens: 'Beyond Teens',
};
const exaRxEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exaHas = (s, w) => new RegExp(`(^|[^A-Za-z'])${exaRxEsc(w)}($|[^A-Za-z'])`, 'i').test(s);
const exaBlank = (s, w) => s.replace(new RegExp(`(^|[^A-Za-z'])${exaRxEsc(w)}(?=$|[^A-Za-z'])`, 'i'), '$1____');
const exaShortEnough = s => s.split(/\s+/).length >= 3 && s.split(/\s+/).length <= 12;

// A topic of topicsData.js shape → an exam topic.
function exaFromSiteTopic(levelId, topic, label, extra) {
  const words = (topic.words || []).filter(w => w && w.en && w.pt);
  const sentences = []
    .concat(topic.practiceSentences || [])
    .concat(...(topic.rules || []).map(r => r.examples || []))
    .map(s => String(s || '').trim()).filter(exaShortEnough);
  const others = (list, keep, key) => exPickN(list.filter(x => x[key] !== keep[key]), 3).map(x => x[key]);
  const gens = [];
  if (words.length >= 4) {
    gens.push(() => { const w = exPick(words); return exMC(`How do you say "${w.pt}" in English?`, w.en, others(words, w, 'en')); });
    gens.push(() => { const w = exPick(words); return exMC(`What does "${w.en}" mean?`, w.pt, others(words, w, 'pt')); });
    const pics = words.filter(w => w.emoji);
    if (pics.length >= 4) gens.push(() => { const w = exPick(pics); return exMC(`${w.emoji} What is it?`, w.en, others(pics, w, 'en')); });
  }
  if (sentences.length) {
    gens.push(() => exOrder(exPick(sentences)));
    const gappable = sentences.map(s => {
      const hit = words.find(w => exaHas(s, w.en));
      return hit ? { s, w: hit } : null;
    }).filter(Boolean);
    if (gappable.length) gens.push(() => { const g = exPick(gappable); return exGap(exaBlank(g.s, g.w.en), g.w.en, { hint: g.w.pt }); });
  }
  // The rules' own forms (was / were, a / an, is / are…) as the blank.
  const forms = Array.from(new Set((topic.rules || []).map(r => String(r.form || '').trim())
    .filter(f => /^[A-Za-z']+( [A-Za-z']+)?$/.test(f))));
  if (forms.length >= 2) {
    const formItems = [];
    (topic.rules || []).forEach(r => (r.examples || []).forEach(ex => {
      if (forms.includes(String(r.form).trim()) && exaHas(ex, r.form)) formItems.push({ s: ex, f: String(r.form).trim(), hint: r.label || '' });
    }));
    if (formItems.length) gens.push(() => { const it = exPick(formItems);
      return exMC(exaBlank(it.s, it.f), it.f, forms.filter(f => f !== it.f).slice(0, 3), it.hint); });
  }
  if (topic.sort && Array.isArray(topic.sort.items) && topic.sort.items.length && Array.isArray(topic.sort.buckets)) {
    gens.push(() => { const it = exPick(topic.sort.items); return exSort(it.text, it.bucket, topic.sort.buckets, topic.sort.prompt); });
  }
  if (!gens.length) return null;
  return Object.assign({
    id: `site-${topic.id}`, label, pt: topic.description || '', site: true, level: levelId,
    // Only its own name: a hand-written topic with the same subject wins what
    // the teacher types ("past continuous"), the chip still finds this one.
    aliases: [label.toLowerCase(), String(topic.id).replace(/[-_]/g, ' ')],
    gens,
    pairs: words.length >= 4 ? () => exPickN(words, 6).map(w => ({ left: w.pt, right: w.en })) : undefined,
    words: words.length ? () => words.map(w => ({ id: `site_${topic.id}_${w.id}`, en: w.en, pt: w.pt, emoji: w.emoji })) : undefined,
  }, extra || {});
}

// A unit of bookSpeaking.js (words + phrases, no translations) → an exam topic.
function exaFromBookUnit(bookId, n, unit) {
  const words = (unit.words || []).map(w => String(w).trim()).filter(w => /[a-z]/i.test(w) && !/^\//.test(w));
  const phrases = (unit.phrases || []).map(p => String(p).trim());
  const gens = [];
  const orderable = phrases.filter(exaShortEnough);
  if (orderable.length) gens.push(() => exOrder(exPick(orderable)));
  const gappable = phrases.map(p => { const w = words.find(x => exaHas(p, x)); return w ? { p, w } : null; }).filter(Boolean);
  if (gappable.length && words.length >= 4) {
    gens.push(() => { const g = exPick(gappable);
      return exMC(exaBlank(g.p, g.w), g.w, exPickN(words.filter(x => x !== g.w && !exaHas(g.p, x)), 3)); });
    gens.push(() => { const g = exPick(gappable); return exGap(exaBlank(g.p, g.w), g.w, { hint: g.w.charAt(0) + '…' }); });
  }
  if (!gens.length) return null;
  const book = EXA_BOOK_NAMES[bookId] || bookId;
  const label = `${book} · ${unit.title}`;
  return {
    id: `book-${bookId}-${n}`, label, pt: `Livro ${book}`, book: bookId, site: true,
    aliases: [label.toLowerCase(), `${book} ${unit.title}`.toLowerCase()],
    gens,
  };
}

function exaSyncSiteTopics() {
  if (typeof EXAM_TOPICS === 'undefined' || typeof exMC !== 'function') return;
  const have = new Set(EXAM_TOPICS.map(t => t.id));
  const usedLabels = new Set(EXAM_TOPICS.map(t => t.label.toLowerCase()));
  const add = t => { if (!t || have.has(t.id)) return; have.add(t.id); usedLabels.add(t.label.toLowerCase()); EXAM_TOPICS.push(t); };
  if (typeof LEVELS !== 'undefined') {
    LEVELS.forEach(level => (level.topics || []).forEach(topic => {
      if (!topic || !topic.id || topic.audience === 'adult' || topic.syllabus) return;
      if (have.has(`site-${topic.id}`)) return;
      let label = String(topic.title || topic.id);
      if (usedLabels.has(label.toLowerCase())) label = `${label} (${(level.code || level.id).toUpperCase()})`;
      if (usedLabels.has(label.toLowerCase())) label = `${label} · ${topic.id}`;
      try { add(exaFromSiteTopic(level.id, topic, label, /^book-/.test(topic.id) ? { coursebook: true } : null)); } catch (e) { /* one bad topic never breaks the list */ }
    }));
  }
  if (typeof BOOK_SPEAKING !== 'undefined') {
    Object.entries(BOOK_SPEAKING).forEach(([bookId, units]) => Object.entries(units || {}).forEach(([n, unit]) => {
      try { add(exaFromBookUnit(bookId, n, unit)); } catch (e) { /* skip */ }
    }));
  }
}

// The extra chip groups for examMaker.js's exChipGroups(): one folded group
// per level of the site, one per book.
function exaChipGroups() {
  exaSyncSiteTopics();
  const groups = [];
  if (typeof LEVELS !== 'undefined') {
    LEVELS.forEach(level => {
      const topics = EXAM_TOPICS.filter(t => t.site && !t.book && !t.coursebook && t.level === level.id);
      if (topics.length) groups.push({ label: `📚 Assuntos do site · ${(level.code || level.id).toUpperCase()}${level.title ? ` — ${level.title}` : ''}`, topics, folded: true });
    });
  }
  const units = EXAM_TOPICS.filter(t => t.coursebook);
  if (units.length) groups.push({ label: '📘 Unidades dos livros (Explore Our World…)', topics: units, folded: true });
  Object.keys(EXA_BOOK_NAMES).forEach(bookId => {
    const topics = EXAM_TOPICS.filter(t => t.book === bookId);
    if (topics.length) groups.push({ label: `📖 Livro ${EXA_BOOK_NAMES[bookId]}`, topics, folded: true });
  });
  return groups;
}

exaSyncSiteTopics();
if (typeof renderExamMaker === 'function' && document.getElementById('examMakerRoot')) {
  try { renderExamMaker(document.getElementById('examMakerRoot')); } catch (e) { console.error('exam topics', e); }
}
