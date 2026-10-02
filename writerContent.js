/* ==========================================================================
   IGenglishschool — ✍️ Writers: the older students (profiles.js)
   Typed practice with easy grammar — verb to be, past simple, present
   continuous and hobbies. Most answers are typed (gaps) or built (word
   order), which is where writing is practised. Added to EXAM_TOPICS like
   the kids' topics, so the practice games and the test maker use them.
   Loaded after kidsContent.js.
   ========================================================================== */

const WR_PAST = [
  { b: 'play', d: 'played', c: 'soccer with my friends' }, { b: 'watch', d: 'watched', c: 'a movie' },
  { b: 'visit', d: 'visited', c: 'my grandma' }, { b: 'cook', d: 'cooked', c: 'pasta' },
  { b: 'dance', d: 'danced', c: 'at the party' }, { b: 'study', d: 'studied', c: 'English' },
  { b: 'go', d: 'went', c: 'to the beach' }, { b: 'eat', d: 'ate', c: 'pizza' },
  { b: 'see', d: 'saw', c: 'a big dog' }, { b: 'have', d: 'had', c: 'a lot of fun' },
  { b: 'swim', d: 'swam', c: 'in the pool' }, { b: 'drink', d: 'drank', c: 'orange juice' },
  { b: 'make', d: 'made', c: 'a cake' }, { b: 'buy', d: 'bought', c: 'a new book' },
];
const WR_ING = [
  { b: 'read', g: 'reading', c: 'a book' }, { b: 'play', g: 'playing', c: 'soccer' },
  { b: 'watch', g: 'watching', c: 'TV' }, { b: 'eat', g: 'eating', c: 'pizza' },
  { b: 'dance', g: 'dancing', c: 'in the kitchen' }, { b: 'swim', g: 'swimming', c: 'in the pool' },
  { b: 'run', g: 'running', c: 'in the park' }, { b: 'write', g: 'writing', c: 'a letter' },
  { b: 'cook', g: 'cooking', c: 'dinner' }, { b: 'draw', g: 'drawing', c: 'a cat' },
  { b: 'sing', g: 'singing', c: 'a song' }, { b: 'sleep', g: 'sleeping', c: 'on the sofa' },
];
const WR_SUBJ = [
  { s: 'I', v: 'am' }, { s: 'You', v: 'are' }, { s: 'He', v: 'is' }, { s: 'She', v: 'is' },
  { s: 'We', v: 'are' }, { s: 'They', v: 'are' }, { s: 'My mom', v: 'is' }, { s: 'My friends', v: 'are' },
];
const WR_HOBBIES = [
  ['reading', 'ler', '📚'], ['swimming', 'nadar', '🏊'], ['dancing', 'dançar', '💃'], ['drawing', 'desenhar', '🎨'],
  ['singing', 'cantar', '🎤'], ['cooking', 'cozinhar', '🍳'], ['playing soccer', 'jogar futebol', '⚽'],
  ['playing video games', 'jogar videogame', '🎮'], ['skating', 'patinar', '🛼'], ['riding a bike', 'andar de bicicleta', '🚴'],
  ['painting', 'pintar', '🖌️'], ['watching movies', 'ver filmes', '🎬'],
];
const WR_IRREGULAR = new Set(['went', 'ate', 'saw', 'had', 'swam', 'drank', 'made', 'bought']);
const wrLower = s => (/^(I)$/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

const WRITER_TOPICS = [
  {
    id: 'easy-tobe', label: 'Verb to be', pt: 'Verbo to be', writers: true,
    aliases: ['to be', 'verb to be', 'am is are', 'verbo to be'],
    gens: [
      () => { const r = exPick(KID_BE); return exGap(`${r.s} ___ ${exPick(r.c)}.`, r.v, { hint: 'am · is · are' }); },
      () => { const r = exPick(KID_BE); return exGap(`${r.s} ___ not ${exPick(r.c)}.`, r.v, { hint: 'am · is · are' }); },
      () => {
        const r = exPick(KID_BE.filter(x => x.s !== 'I'));
        const q = r.v === 'is' ? 'Is' : 'Are';
        return exMC(`___ ${wrLower(r.s)} ${exPick(r.c)}?`, q, ['Am', 'Is', 'Are'].filter(x => x !== q));
      },
      () => { const r = exPick(KID_BE); return exOrder(kidBeSentence(r, exPick(r.c))); },
    ],
    pairs: () => exPickN(WR_SUBJ, 6).map(x => ({ left: x.s, right: x.v })),
  },
  {
    id: 'easy-past', label: 'Past simple', pt: 'Passado simples', writers: true,
    aliases: ['past simple', 'simple past', 'passado'],
    gens: [
      () => { const f = exPick(WR_PAST); return exGap(`Yesterday I ___ (${f.b}) ${f.c}.`, f.d, { hint: `${f.b} → ?` }); },
      () => { const f = exPick(WR_PAST); const s = exPick(['She', 'He', 'We', 'They', 'My dad']); return exGap(`Last weekend ${wrLower(s)} ___ (${f.b}) ${f.c}.`, f.d); },
      () => { const f = exPick(WR_PAST); return exMC(`Last Saturday we ___ ${f.c}.`, f.d, [f.b, `${f.b}ing`, WR_IRREGULAR.has(f.d) ? `${f.b}ed` : `${f.b}s`]); },
      () => { const f = exPick(WR_PAST); return exOrder(`I ${f.d} ${f.c} yesterday.`); },
      () => { const f = exPick(WR_PAST); return exSort(`${f.b} → ${f.d}`, WR_IRREGULAR.has(f.d) ? 'irregular' : 'regular', ['regular', 'irregular']); },
    ],
    pairs: () => exPickN(WR_PAST, 6).map(f => ({ left: f.b, right: f.d })),
  },
  {
    id: 'easy-prescont', label: 'Present continuous', pt: 'Presente contínuo', writers: true,
    aliases: ['present continuous', 'presente continuo', 'ing'],
    gens: [
      () => { const f = exPick(WR_ING); const x = exPick(WR_SUBJ); return exGap(`${x.s} ${x.v} ___ (${f.b}) ${f.c}.`, f.g, { hint: `${f.b} + ing` }); },
      () => { const f = exPick(WR_ING); const x = exPick(WR_SUBJ); return exGap(`${x.s} ___ ${f.g} ${f.c} now.`, x.v, { hint: 'am · is · are' }); },
      () => { const f = exPick(WR_ING); const x = exPick(WR_SUBJ); return exMC(`Look! ${x.s} ___ ${f.c}.`, `${x.v} ${f.g}`, [`${x.v} ${f.b}`, f.g, `${f.b}s`]); },
      () => { const f = exPick(WR_ING); const x = exPick(WR_SUBJ); return exOrder(`${x.s} ${x.v} ${f.g} ${f.c}.`); },
    ],
    pairs: () => exPickN(WR_ING, 6).map(f => ({ left: f.b, right: f.g })),
  },
  {
    id: 'easy-hobbies', label: 'Hobbies', pt: 'Hobbies', writers: true,
    aliases: ['hobbies', 'hobby', 'free time'],
    gens: [
      () => { const [w, , e] = exPick(WR_HOBBIES); return exMC(`What hobby is this? ${e}`, w, exPickN(WR_HOBBIES.filter(x => x[0] !== w), 3).map(x => x[0])); },
      () => { const [w, p, e] = exPick(WR_HOBBIES); return exGap(`I like ___ . ${e} (${p})`, w); },
      () => { const [w] = exPick(WR_HOBBIES); return exOrder(`My favorite hobby is ${w}.`); },
      () => { const [w] = exPick(WR_HOBBIES); return exOrder(`I don't like ${w}.`); },
    ],
    pairs: () => exPickN(WR_HOBBIES, 6).map(([w, , e]) => ({ left: e, right: w })),
    words: () => WR_HOBBIES.map(([w, p, e]) => ({ id: `hob_${w}`, en: w, pt: p, emoji: e })),
  },
];

if (typeof EXAM_TOPICS !== 'undefined') {
  WRITER_TOPICS.forEach(t => { if (!EXAM_TOPICS.some(x => x.id === t.id)) EXAM_TOPICS.push(t); });
}

// Practice games for writers (Quiz Race with typed gaps, Sentence Builder…).
// `only` = the topics opened up for this student (studentAccess.js).
function openWriterPractice(only) {
  const list = Array.isArray(only) && only.length ? only : WRITER_TOPICS;
  openExamGames({
    id: 'writers', title: 'Practice · Treinar',
    topicIds: list.map(t => t.id), topicLabels: list.map(t => t.label),
    createdAt: new Date().toISOString(), count: 0, parts: [], items: [],
  });
}

// Writing practice: ten typed / built answers in the exam runner. Works
// with any exam-style topics, so grown-ups get it from their own level.
function openWritingPractice(studentId, only) {
  const source = Array.isArray(only) && only.length ? only : WRITER_TOPICS;
  const items = [];
  const gens = source.flatMap(t => (t.gens || []).map(g => ({ g, t })));
  let guard = 0;
  while (items.length < 10 && guard++ < 80) {
    const { g, t } = exPick(gens);
    try {
      const it = g();
      if (it && (it.kind === 'gap' || it.kind === 'order')) items.push({ ...it, topic: t.label });
    } catch (e) { /* skip */ }
  }
  const parts = typeof exPartition === 'function' ? exPartition(items) : [];
  openExamRunner({
    id: 'writing-practice-' + Date.now().toString(36), title: 'Writing practice', group: '',
    topicIds: source.map(t => t.id), topicLabels: source.map(t => t.label),
    createdAt: new Date().toISOString(), count: items.length, parts,
    items: parts.length ? parts.reduce((all, p) => all.concat(p.items), []) : items,
  }, { studentId, source: 'practice' });
}

// Dictation / Speaking lines for writers.
function writerSentences(n) {
  const out = new Set();
  WR_PAST.forEach(f => out.add(`Yesterday I ${f.d} ${f.c}.`));
  WR_ING.forEach(f => out.add(`${exPick(['He', 'She'])} is ${f.g} ${f.c}.`));
  WR_HOBBIES.slice(0, 8).forEach(([w]) => out.add(`I like ${w}.`));
  KID_BE.forEach(r => out.add(kidBeSentence(r, r.c[0])));
  return exShuffle([...out]).slice(0, n || 8);
}

// What to write to the teacher, by profile.
const READER_PROMPTS = [
  { id: 'r-animal', prompt: 'Write about an animal you like.', help: ['I like…', 'It is…', 'It is (color).'], words: 8 },
  { id: 'r-color', prompt: 'What is your favorite color?', help: ['My favorite color is…', 'I have a … (color) …'], words: 8 },
  { id: 'r-me', prompt: 'Write about you.', help: ['I am … years old.', 'I am…', 'I like…'], words: 10 },
  { id: 'r-house', prompt: 'Write about your house.', help: ['My bedroom is…', 'I have a…'], words: 8 },
];
const WRITER_PROMPTS = [
  { id: 'w-hobbies', prompt: 'What are your hobbies?', help: ['I like …ing.', "I don't like…", 'My favorite hobby is…'], words: 25 },
  { id: 'w-weekend', prompt: 'What did you do last weekend?', help: ['On Saturday I…', 'I played…', 'I went to…'], words: 25 },
  { id: 'w-now', prompt: 'What are the people at home doing now?', help: ['My mom is …ing.', 'I am …ing.'], words: 20 },
  { id: 'w-friend', prompt: 'Describe your best friend.', help: ['He/She is…', 'He/She likes…'], words: 25 },
];
// Teens of 15+ and adults write about their own life, not their teddy bear.
const ADULT_PROMPTS = [
  { id: 'a-intro', prompt: 'Introduce yourself: where you are from, what you do and why you study English.', help: ["I'm from…", 'I work as / I study…', 'I study English because…'], words: 40 },
  { id: 'a-routine', prompt: 'Describe a typical day in your week.', help: ['I usually get up at…', 'Then I…', 'In the evening I…'], words: 40 },
  { id: 'a-weekend', prompt: 'What did you do last weekend? Write about it.', help: ['On Saturday I…', 'Then we went…', 'It was…'], words: 50 },
  { id: 'a-plans', prompt: 'What are your plans for next year?', help: ["I'm going to…", 'I would like to…', 'I hope…'], words: 50 },
  { id: 'a-email', prompt: 'Write a short email to a colleague to arrange a meeting.', help: ['Hi …,', 'Are you free on…?', 'Best regards,'], words: 40 },
  { id: 'a-trip', prompt: 'Describe the best trip you have ever taken.', help: ['I went to…', 'I stayed at…', 'The best part was…'], words: 60 },
];
function openProfileWriting(student) {
  const prof = typeof studentProfile === 'function' ? studentProfile(student) : 'writer';
  const task = exPick(prof === 'reader' ? READER_PROMPTS : prof === 'adult' ? ADULT_PROMPTS : WRITER_PROMPTS);
  openWritingModal({ studentId: student.id, promptId: task.id, promptText: task.prompt, help: task.help, words: task.words });
}

// Hobbies as a word bank, so the regular games (Hangman, Memory, Match-up…)
// can play with it from the student's Games list.
const HOBBIES_TOPIC = {
  id: 'hobbies', title: 'Hobbies', emoji: '🎨',
  words: WR_HOBBIES.map(([w, p, e]) => ({ id: `hob_${w.replace(/\s+/g, '_')}`, en: w, pt: p, emoji: e })),
};
