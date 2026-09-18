/* ==========================================================================
   IGenglishschool — Exam Maker
   The teacher types the topics of the next test; this builds a 10–20 question
   paper from them, prints it with an answer key, and turns the very same
   questions into games so the class can revise by playing.

   Everything is generated, never drawn from a fixed list of 20 questions, so
   "another version" is a real second paper — which is the whole point when a
   class sits the same test twice.
   ========================================================================== */

// ---------------------------------------------------------------------------
// SMALL HELPERS
// ---------------------------------------------------------------------------
function exShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function exPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function exPickN(arr, n) { return exShuffle(arr).slice(0, n); }
function exEsc(s) { return igEscapeHtml(String(s == null ? '' : s)); }
function exCap(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }

// What a typed answer has to match. Punctuation, capitals and curly
// apostrophes are the student's typing, not their English, so none of them
// may cost a mark.
function exNorm(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[‘’´`]/g, "'")
    .replace(/[.!?;,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// "didn't go" and "did not go" are the same answer. Rather than listing both
// on every single item, the contracted forms expand themselves.
const EX_CONTRACTIONS = [
  ["didn't", 'did not'], ["don't", 'do not'], ["doesn't", 'does not'],
  ["wasn't", 'was not'], ["weren't", 'were not'], ["isn't", 'is not'],
  ["aren't", 'are not'], ["can't", 'cannot'], ["couldn't", 'could not'],
  ["haven't", 'have not'], ["hasn't", 'has not'], ["won't", 'will not'],
];
function exAnswerVariants(correct, accept) {
  const out = new Set();
  const add = v => { const n = exNorm(v); if (n) out.add(n); };
  add(correct);
  (accept || []).forEach(add);
  Array.from(out).forEach(v => {
    EX_CONTRACTIONS.forEach(([short, long]) => {
      if (v.includes(short)) add(v.split(short).join(long));
      if (v.includes(long)) add(v.split(long).join(short));
    });
    // 1,250 and 1250 are the same number written twice.
    if (/\d[\d,.]*\d/.test(v)) add(v.replace(/[,.](?=\d{3}\b)/g, ''));
  });
  return Array.from(out);
}

// ---------------------------------------------------------------------------
// NUMBERS, ORDINALS, DATES
// ---------------------------------------------------------------------------
const EX_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen'];
const EX_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const EX_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// British reading, with the "and" before the last two digits: the coursebooks
// this school uses are British, and 1,005 is "one thousand and five" there.
function exCardinal(n) {
  n = Math.round(Number(n));
  if (!isFinite(n) || n < 0) return '';
  if (n < 20) return EX_ONES[n];
  if (n < 100) {
    const rest = n % 10;
    return rest ? `${EX_TENS[Math.floor(n / 10)]}-${EX_ONES[rest]}` : EX_TENS[Math.floor(n / 10)];
  }
  if (n < 1000) {
    const head = `${EX_ONES[Math.floor(n / 100)]} hundred`;
    const rest = n % 100;
    return rest ? `${head} and ${exCardinal(rest)}` : head;
  }
  const scales = [[1000000000, 'billion'], [1000000, 'million'], [1000, 'thousand']];
  for (const [value, name] of scales) {
    if (n >= value) {
      const head = `${exCardinal(Math.floor(n / value))} ${name}`;
      const rest = n % value;
      if (!rest) return head;
      return rest < 100 ? `${head} and ${exCardinal(rest)}` : `${head} ${exCardinal(rest)}`;
    }
  }
  return String(n);
}

const EX_ORDINAL_ONES = {
  1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh',
  8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth', 13: 'thirteenth',
  14: 'fourteenth', 15: 'fifteenth', 16: 'sixteenth', 17: 'seventeenth', 18: 'eighteenth',
  19: 'nineteenth', 20: 'twentieth', 30: 'thirtieth', 40: 'fortieth', 50: 'fiftieth',
  60: 'sixtieth', 70: 'seventieth', 80: 'eightieth', 90: 'ninetieth',
};
function exOrdinalWord(n) {
  n = Math.round(Number(n));
  if (EX_ORDINAL_ONES[n]) return EX_ORDINAL_ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10) * 10;
    return `${EX_TENS[tens / 10]}-${EX_ORDINAL_ONES[n % 10]}`;
  }
  return exCardinal(n);
}
function exOrdinalSuffix(n) {
  const last = n % 10, teen = n % 100;
  if (teen >= 11 && teen <= 13) return `${n}th`;
  return `${n}${last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`;
}
function exPad(n) { return String(n).padStart(2, '0'); }

// Years are not read like other numbers, which is exactly what the exercise
// is testing: 1996 is "nineteen ninety-six", 2006 is "two thousand and six".
function exYearWords(y) {
  const alt = [];
  let main;
  if (y >= 2000 && y <= 2009) {
    main = y === 2000 ? 'two thousand' : `two thousand and ${EX_ONES[y - 2000]}`;
    if (y !== 2000) alt.push(`two thousand ${EX_ONES[y - 2000]}`);
  } else if (y >= 2010) {
    const rest = y % 100;
    main = `twenty ${rest === 0 ? 'hundred' : exCardinal(rest)}`;
    alt.push(`two thousand and ${exCardinal(rest)}`, `two thousand ${exCardinal(rest)}`);
  } else {
    const head = Math.floor(y / 100), rest = y % 100;
    if (rest === 0) main = `${exCardinal(head)} hundred`;
    else if (rest < 10) main = `${exCardinal(head)} oh ${EX_ONES[rest]}`;
    else main = `${exCardinal(head)} ${exCardinal(rest)}`;
  }
  return { main, alt };
}

// ---------------------------------------------------------------------------
// VERBS
// ---------------------------------------------------------------------------
const EX_IRREGULAR = [
  ['go', 'went', 'ir'], ['see', 'saw', 'ver'], ['eat', 'ate', 'comer'], ['drink', 'drank', 'beber'],
  ['buy', 'bought', 'comprar'], ['bring', 'brought', 'trazer'], ['think', 'thought', 'pensar'],
  ['teach', 'taught', 'ensinar'], ['catch', 'caught', 'pegar'], ['take', 'took', 'levar'],
  ['make', 'made', 'fazer'], ['do', 'did', 'fazer'], ['have', 'had', 'ter'], ['get', 'got', 'conseguir'],
  ['give', 'gave', 'dar'], ['come', 'came', 'vir'], ['run', 'ran', 'correr'], ['swim', 'swam', 'nadar'],
  ['sing', 'sang', 'cantar'], ['write', 'wrote', 'escrever'], ['read', 'read', 'ler'],
  ['speak', 'spoke', 'falar'], ['break', 'broke', 'quebrar'], ['choose', 'chose', 'escolher'],
  ['drive', 'drove', 'dirigir'], ['ride', 'rode', 'andar de bicicleta'], ['fly', 'flew', 'voar'],
  ['know', 'knew', 'saber'], ['grow', 'grew', 'crescer'], ['throw', 'threw', 'jogar'],
  ['begin', 'began', 'começar'], ['find', 'found', 'encontrar'], ['feel', 'felt', 'sentir'],
  ['keep', 'kept', 'guardar'], ['sleep', 'slept', 'dormir'], ['leave', 'left', 'sair'],
  ['meet', 'met', 'encontrar'], ['pay', 'paid', 'pagar'], ['say', 'said', 'dizer'],
  ['sell', 'sold', 'vender'], ['tell', 'told', 'contar'], ['sit', 'sat', 'sentar'],
  ['stand', 'stood', 'ficar de pé'], ['win', 'won', 'ganhar'], ['wear', 'wore', 'vestir'],
  ['put', 'put', 'colocar'], ['send', 'sent', 'enviar'], ['spend', 'spent', 'gastar'],
  ['lose', 'lost', 'perder'], ['build', 'built', 'construir'], ['hear', 'heard', 'ouvir'],
  ['hold', 'held', 'segurar'], ['forget', 'forgot', 'esquecer'], ['become', 'became', 'tornar-se'],
  ['fall', 'fell', 'cair'], ['understand', 'understood', 'entender'],
].map(([base, past, pt]) => ({ base, past, pt, regular: false }));

const EX_REGULAR = [
  ['play', 'played', 'jogar'], ['watch', 'watched', 'assistir'], ['work', 'worked', 'trabalhar'],
  ['want', 'wanted', 'querer'], ['like', 'liked', 'gostar'], ['live', 'lived', 'morar'],
  ['study', 'studied', 'estudar'], ['try', 'tried', 'tentar'], ['carry', 'carried', 'carregar'],
  ['stop', 'stopped', 'parar'], ['plan', 'planned', 'planejar'], ['travel', 'travelled', 'viajar'],
  ['cook', 'cooked', 'cozinhar'], ['clean', 'cleaned', 'limpar'], ['help', 'helped', 'ajudar'],
  ['listen', 'listened', 'escutar'], ['open', 'opened', 'abrir'], ['close', 'closed', 'fechar'],
  ['start', 'started', 'começar'], ['finish', 'finished', 'terminar'], ['visit', 'visited', 'visitar'],
  ['walk', 'walked', 'caminhar'], ['talk', 'talked', 'conversar'], ['call', 'called', 'ligar'],
  ['answer', 'answered', 'responder'], ['ask', 'asked', 'perguntar'], ['arrive', 'arrived', 'chegar'],
  ['dance', 'danced', 'dançar'], ['decide', 'decided', 'decidir'], ['enjoy', 'enjoyed', 'aproveitar'],
  ['invite', 'invited', 'convidar'], ['learn', 'learned', 'aprender'], ['move', 'moved', 'mudar'],
  ['need', 'needed', 'precisar'], ['paint', 'painted', 'pintar'], ['practise', 'practised', 'praticar'],
  ['remember', 'remembered', 'lembrar'], ['share', 'shared', 'compartilhar'], ['stay', 'stayed', 'ficar'],
  ['use', 'used', 'usar'], ['wash', 'washed', 'lavar'], ['wait', 'waited', 'esperar'],
].map(([base, past, pt]) => ({ base, past, pt, regular: true }));

const EX_VERBS = EX_REGULAR.concat(EX_IRREGULAR);

// The three spelling rules a regular-verbs test always asks about, with the
// wrong form the students actually write.
const EX_SPELLING = [
  { base: 'study', past: 'studied', trap: 'studyed', why: 'consonant + y → -ied' },
  { base: 'carry', past: 'carried', trap: 'carryed', why: 'consonant + y → -ied' },
  { base: 'try', past: 'tried', trap: 'tryed', why: 'consonant + y → -ied' },
  { base: 'cry', past: 'cried', trap: 'cryed', why: 'consonant + y → -ied' },
  { base: 'stop', past: 'stopped', trap: 'stoped', why: 'one vowel + one consonant → double it' },
  { base: 'plan', past: 'planned', trap: 'planed', why: 'one vowel + one consonant → double it' },
  { base: 'travel', past: 'travelled', trap: 'traveled', why: 'British English doubles the -l' },
  { base: 'like', past: 'liked', trap: 'likeed', why: 'verb ends in -e → just add -d' },
  { base: 'dance', past: 'danced', trap: 'danceed', why: 'verb ends in -e → just add -d' },
  { base: 'arrive', past: 'arrived', trap: 'arriveed', why: 'verb ends in -e → just add -d' },
  { base: 'decide', past: 'decided', trap: 'decideed', why: 'verb ends in -e → just add -d' },
  { base: 'play', past: 'played', trap: 'plaied', why: 'vowel + y → just add -ed' },
  { base: 'enjoy', past: 'enjoyed', trap: 'enjoied', why: 'vowel + y → just add -ed' },
];

// ---------------------------------------------------------------------------
// SENTENCE FRAMES
// Written out rather than assembled from parts: "Tom went to the beach on
// Saturday" has to sound like something a person would say, and a random
// subject + random verb + random object does not.
// ---------------------------------------------------------------------------
const EX_FRAMES = [
  { s: 'Ana', p: 'she', b: 'watch', d: 'watched', r: 'a film last night', wh: { w: 'What', q: 'What did Ana watch last night?', a: 'A film.' } },
  { s: 'Tom', p: 'he', b: 'go', d: 'went', r: 'to the beach on Saturday', wh: { w: 'Where', q: 'Where did Tom go on Saturday?', a: 'To the beach.' } },
  { s: 'my brother', p: 'he', b: 'buy', d: 'bought', r: 'a new bike last week', wh: { w: 'What', q: 'What did your brother buy last week?', a: 'A new bike.' } },
  { s: 'the children', p: 'they', b: 'play', d: 'played', r: 'in the park yesterday', wh: { w: 'Where', q: 'Where did the children play yesterday?', a: 'In the park.' } },
  { s: 'Lucas', p: 'he', b: 'study', d: 'studied', r: 'English on Monday', wh: { w: 'When', q: 'When did Lucas study English?', a: 'On Monday.' } },
  { s: 'Júlia', p: 'she', b: 'visit', d: 'visited', r: 'her grandmother last Sunday', wh: { w: 'Who', q: 'Who did Júlia visit last Sunday?', a: 'Her grandmother.' } },
  { s: 'my parents', p: 'they', b: 'travel', d: 'travelled', r: 'to Chile in January', wh: { w: 'Where', q: 'Where did your parents travel in January?', a: 'To Chile.' } },
  { s: 'Maria', p: 'she', b: 'write', d: 'wrote', r: 'a letter to her friend', wh: { w: 'What', q: 'What did Maria write?', a: 'A letter.' } },
  { s: 'the team', p: 'they', b: 'win', d: 'won', r: 'the game on Friday', wh: { w: 'When', q: 'When did the team win the game?', a: 'On Friday.' } },
  { s: 'my father', p: 'he', b: 'cook', d: 'cooked', r: 'lunch for everybody', wh: { w: 'What', q: 'What did your father cook?', a: 'Lunch.' } },
  { s: 'Sofia', p: 'she', b: 'take', d: 'took', r: 'a lot of photos at the party', wh: { w: 'Where', q: 'Where did Sofia take a lot of photos?', a: 'At the party.' } },
  { s: 'Pedro', p: 'he', b: 'lose', d: 'lost', r: 'his keys yesterday', wh: { w: 'What', q: 'What did Pedro lose yesterday?', a: 'His keys.' } },
  { s: 'my mum', p: 'she', b: 'clean', d: 'cleaned', r: 'the kitchen in the morning', wh: { w: 'When', q: 'When did your mum clean the kitchen?', a: 'In the morning.' } },
  { s: 'the boys', p: 'they', b: 'see', d: 'saw', r: 'a great film at the cinema', wh: { w: 'Where', q: 'Where did the boys see a great film?', a: 'At the cinema.' } },
  { s: 'the class', p: 'it', b: 'start', d: 'started', r: 'at eight o\'clock', wh: { w: 'What time', q: 'What time did the class start?', a: 'At eight o\'clock.' } },
  { s: 'Bruno', p: 'he', b: 'sell', d: 'sold', r: 'his old guitar', wh: { w: 'What', q: 'What did Bruno sell?', a: 'His old guitar.' } },
  { s: 'my cousins', p: 'they', b: 'arrive', d: 'arrived', r: 'late on Friday night', wh: { w: 'When', q: 'When did your cousins arrive?', a: 'On Friday night.' } },
  { s: 'the dog', p: 'it', b: 'sleep', d: 'slept', r: 'under the table', wh: { w: 'Where', q: 'Where did the dog sleep?', a: 'Under the table.' } },
  { s: 'Helena', p: 'she', b: 'drink', d: 'drank', r: 'two glasses of water', wh: { w: 'What', q: 'What did Helena drink?', a: 'Two glasses of water.' } },
  { s: 'Rafael', p: 'he', b: 'meet', d: 'met', r: 'his new teacher on Tuesday', wh: { w: 'Who', q: 'Who did Rafael meet on Tuesday?', a: 'His new teacher.' } },
  { s: 'the students', p: 'they', b: 'finish', d: 'finished', r: 'the test before the bell', wh: { w: 'When', q: 'When did the students finish the test?', a: 'Before the bell.' } },
  { s: 'Gabriel', p: 'he', b: 'ride', d: 'rode', r: 'his bike to school', wh: { w: 'Where', q: 'Where did Gabriel ride his bike?', a: 'To school.' } },
  { s: 'Laura', p: 'she', b: 'dance', d: 'danced', r: 'at her cousin\'s wedding', wh: { w: 'Where', q: 'Where did Laura dance?', a: 'At her cousin\'s wedding.' } },
  { s: 'my sister', p: 'she', b: 'read', d: 'read', r: 'two books in July', wh: { w: 'What', q: 'What did your sister read in July?', a: 'Two books.' } },
  { s: 'the neighbours', p: 'they', b: 'paint', d: 'painted', r: 'their house green', wh: { w: 'What', q: 'What did the neighbours paint?', a: 'Their house.' } },
  { s: 'Carlos', p: 'he', b: 'forget', d: 'forgot', r: 'his homework at home', wh: { w: 'What', q: 'What did Carlos forget?', a: 'His homework.' } },
];

const exAff = f => `${exCap(f.s)} ${f.d} ${f.r}.`;
const exNeg = f => `${exCap(f.s)} didn't ${f.b} ${f.r}.`;
const exYesNo = f => `Did ${f.s} ${f.b} ${f.r}?`;

// ---------------------------------------------------------------------------
// ITEM BUILDERS
// Every generator returns one of these four shapes, and every part of the app
// — paper, answer key, interactive test and the five games — is written
// against the shapes, not against the topics.
// ---------------------------------------------------------------------------
function exMC(prompt, correct, wrongs, explain) {
  // A generator that builds a distractor by editing the right answer can land
  // back on it (replacing "read" with its identical past form, say). Two
  // identical buttons make the question unanswerable, so they are dropped.
  const seen = new Set([exNorm(correct)]);
  const options = [];
  (wrongs || []).forEach(w => {
    const key = exNorm(w);
    if (seen.has(key)) return;
    seen.add(key);
    options.push(w);
  });
  return { kind: 'mc', prompt, correct, options: exShuffle([correct].concat(options)), explain };
}
function exGap(prompt, correct, opts) {
  const o = opts || {};
  return { kind: 'gap', prompt, correct, accept: o.accept || [], hint: o.hint || '', explain: o.explain || '' };
}
function exOrder(sentence, explain) {
  // The tokens a student shuffles are words, but "at eight o'clock" has to
  // stay in one piece or the exercise stops being about word order.
  const tokens = sentence.replace(/([?.!])$/, ' $1').split(/\s+/).filter(Boolean);
  return { kind: 'order', prompt: 'Put the words in the right order.', tokens: exShuffle(tokens), correct: sentence, explain };
}
function exSort(text, bucket, buckets, explain) {
  return { kind: 'sort', prompt: text, correct: bucket, buckets, explain };
}

// ---------------------------------------------------------------------------
// THE TOPIC BANK
// `aliases` are matched against whatever the teacher typed, in English or in
// Portuguese, because "verbos irregulares" and "irregular verbs" are the same
// lesson and she should be able to type either.
// ---------------------------------------------------------------------------
const EXAM_TOPICS = [

  // ---- 1. Ordinal numbers and dates ---------------------------------------
  {
    id: 'ordinals',
    label: 'Ordinal numbers & dates',
    pt: 'Números ordinais e datas',
    aliases: ['ordinal', 'ordinals', 'ordinal number', 'ordinal numbers', 'numeros ordinais',
      'números ordinais', 'date', 'dates', 'datas', 'data', 'birthday', 'aniversario',
      'months', 'meses', 'calendar', 'calendario'],
    gens: [
      () => {
        const n = exPick([2, 3, 5, 8, 9, 12, 20, 21, 23, 30, 31]);
        const others = exPickN([1, 4, 6, 7, 11, 13, 15, 19, 22, 25, 29].filter(x => x !== n), 3);
        return exMC(`Which word is the ordinal number for ${n}?`, exOrdinalWord(n),
          others.map(exOrdinalWord), `${n} → ${exOrdinalSuffix(n)} → ${exOrdinalWord(n)}.`);
      },
      () => {
        const n = exPick([1, 2, 3, 4, 5, 8, 9, 11, 12, 15, 20, 21, 22, 30, 31]);
        return exGap(`Write the ordinal number in words: ${n} → ____`, exOrdinalWord(n),
          { accept: [exOrdinalSuffix(n)], explain: `${exOrdinalSuffix(n)} = ${exOrdinalWord(n)}.` });
      },
      () => {
        const d = exPick([1, 2, 3, 4, 5, 9, 11, 12, 15, 20, 21, 22, 23, 25, 30]);
        const m = Math.floor(Math.random() * 12);
        const wrongM = exPick(EX_MONTHS.filter(x => x !== EX_MONTHS[m]));
        const wrongD = exPick([1, 2, 3, 5, 12, 13, 20, 31].filter(x => x !== d));
        return exMC(`How do you say the date ${exPad(d)}/${exPad(m + 1)} in English?`,
          `the ${exOrdinalWord(d)} of ${EX_MONTHS[m]}`,
          [`the ${exOrdinalWord(wrongD)} of ${EX_MONTHS[m]}`,
            `the ${exOrdinalWord(d)} of ${wrongM}`,
            `the ${exCardinal(d)} of ${EX_MONTHS[m]}`],
          'We write the day as an ordinal number: the 5th → the fifth.');
      },
      () => {
        const d = exPick([3, 5, 7, 9, 12, 14, 18, 21, 24, 28]);
        const m = exPick(EX_MONTHS);
        return exGap(`My birthday is on the ____ (${d}) of ${m}.`, exOrdinalWord(d),
          { accept: [exOrdinalSuffix(d)], explain: `After "the" we need the ordinal: ${exOrdinalWord(d)}.` });
      },
      () => exMC('Choose the correct sentence.',
        'We start school on the seventh of February.',
        ['We start school in the seventh of February.',
          'We start school on the seven of February.',
          'We start school at the seventh of February.'],
        'Dates take "on": on the 7th of February.'),
      () => {
        const n = exPick([2, 4, 6, 7, 9, 10, 11, 12]);
        return exGap(`${EX_MONTHS[n - 1]} is the ____ month of the year.`, exOrdinalWord(n),
          { accept: [exOrdinalSuffix(n)], explain: `${EX_MONTHS[n - 1]} = month number ${n}.` });
      },
      () => {
        const who = exPick(['My sister', 'Tom', 'Ana', 'My best friend']);
        const d = exPick([1, 3, 12, 21, 30]);
        const m = exPick(EX_MONTHS);
        return exOrder(`${who} was born on the ${exOrdinalWord(d)} of ${m}.`,
          'Word order: subject + verb + on + the + ordinal + of + month.');
      },
      () => {
        const n = exPick([1, 2, 3, 11, 12, 13, 21, 22, 23]);
        return exGap(`Write the short form with a suffix: ${n} → ____`, exOrdinalSuffix(n),
          { explain: '1st, 2nd, 3rd — but 11th, 12th and 13th break the rule.' });
      },
    ],
    pairs: () => exPickN([1, 2, 3, 4, 5, 8, 9, 12, 20, 21, 30, 31], 8)
      .map(n => ({ left: exOrdinalSuffix(n), right: exOrdinalWord(n) })),
  },

  // ---- 2. Large numbers and years -----------------------------------------
  {
    id: 'bignumbers',
    label: 'Large numbers & years',
    pt: 'Números grandes e anos',
    aliases: ['large number', 'large numbers', 'big numbers', 'numeros grandes', 'números grandes',
      'thousands', 'millions', 'milhares', 'milhoes', 'milhões', 'year', 'years', 'anos', 'ano',
      'numbers', 'numeros', 'números'],
    gens: [
      () => {
        const n = exPick([1250, 3406, 7815, 2500, 9040, 6300, 4318]);
        const wrong = exPickN([n + 100, n + 1000, n - 300, n + 11].filter(x => x > 0), 3);
        return exMC(`How do you say ${n.toLocaleString('en-GB')}?`, exCardinal(n),
          wrong.map(exCardinal), `${n.toLocaleString('en-GB')} = ${exCardinal(n)}.`);
      },
      () => {
        const n = exPick([2500, 1005, 3040, 12600, 45300, 108000]);
        return exGap(`Write in words: ${n.toLocaleString('en-GB')} → ____`, exCardinal(n),
          { explain: `${exCardinal(n)}.` });
      },
      () => {
        const n = exPick([63420, 75200, 4150, 250000, 1300000, 340000]);
        return exGap(`Write in numbers: ${exCardinal(n)} → ____`, n.toLocaleString('en-GB'),
          { accept: [String(n)], explain: `${exCardinal(n)} = ${n.toLocaleString('en-GB')}.` });
      },
      () => {
        const y = exPick([1987, 1996, 1974, 1902, 1850, 1968]);
        const words = exYearWords(y);
        const others = exPickN([y + 11, y - 9, y + 20, y - 30], 3).map(v => exYearWords(v).main);
        return exMC(`How do you say the year ${y}?`, words.main, others,
          'Years before 2000 are read in two halves: 1987 → nineteen / eighty-seven.');
      },
      () => {
        const y = exPick([2001, 2004, 2006, 2009]);
        return exGap(`Complete: the year ${y} is read "two thousand ____ ${EX_ONES[y - 2000]}".`, 'and',
          { explain: `${y} → ${exYearWords(y).main}.` });
      },
      () => {
        const y = exPick([2012, 2015, 2018, 2021, 2024]);
        const w = exYearWords(y);
        return exGap(`Write the year in words: ${y} → ____`, w.main,
          { accept: w.alt, explain: `${y} → ${w.main} (or ${w.alt[0]}).` });
      },
      () => exMC('How many zeros are there in one million?', '6', ['3', '5', '9'],
        '1,000,000 — six zeros.'),
      () => {
        const n = exPick([105000, 250000, 1500000, 3000000]);
        const wrong = exPickN([n * 10, n / 10, n + 90000].filter(x => Number.isInteger(x) && x > 0), 3);
        return exMC(`Which number is "${exCardinal(n)}"?`, n.toLocaleString('en-GB'),
          wrong.map(x => x.toLocaleString('en-GB')), `${exCardinal(n)} = ${n.toLocaleString('en-GB')}.`);
      },
    ],
    pairs: () => exPickN([1250, 2500, 3040, 1005, 75200, 1000000, 340000, 4150], 6)
      .map(n => ({ left: n.toLocaleString('en-GB'), right: exCardinal(n) })),
  },

  // ---- 3. Past simple: affirmative & negative ------------------------------
  {
    id: 'pastsimple',
    label: 'Past simple: affirmative & negative',
    pt: 'Passado simples: afirmativa e negativa',
    aliases: ['past simple', 'simple past', 'passado simples', 'past', 'passado',
      'affirmative', 'afirmativa', 'affirmative form', 'negative', 'negativa', 'negative form',
      'didnt', "didn't", 'did not', 'past tense'],
    gens: [
      () => {
        const f = exPick(EX_FRAMES);
        return exGap(`${exCap(f.s)} ____ (${f.b}) ${f.r}.`, f.d,
          { explain: `${f.b} → ${f.d}.` });
      },
      () => {
        const f = exPick(EX_FRAMES);
        return exGap(`${exCap(f.s)} ____ (not / ${f.b}) ${f.r}.`, `didn't ${f.b}`,
          { explain: 'Negative = didn\'t + the base form of the verb.' });
      },
      () => {
        const f = exPick(EX_FRAMES);
        return exMC('Choose the correct sentence.', exNeg(f),
          [`${exCap(f.s)} didn't ${f.d} ${f.r}.`,
            `${exCap(f.s)} not ${f.d} ${f.r}.`,
            `${exCap(f.s)} doesn't ${f.b} ${f.r}.`],
          'After "didn\'t" the verb goes back to the base form.');
      },
      () => exOrder(exAff(exPick(EX_FRAMES)), 'Affirmative word order: subject + past verb + the rest.'),
      () => {
        const f = exPick(EX_FRAMES);
        return exGap(`Make it negative: ${exAff(f)} → ${exCap(f.s)} ____ ${f.r}.`, `didn't ${f.b}`,
          { explain: `${f.d} → didn't ${f.b}.` });
      },
      () => {
        const f = exPick(EX_FRAMES);
        const negative = Math.random() < 0.5;
        return exSort(negative ? exNeg(f) : exAff(f), negative ? 'Negative' : 'Affirmative',
          ['Affirmative', 'Negative'],
          negative ? "It has \"didn't\" + the base verb." : 'It has the past form of the verb.');
      },
      () => {
        const plural = exPick([true, false]);
        const subject = plural ? exPick(['The children', 'My friends', 'They', 'We']) : exPick(['Ana', 'He', 'My brother', 'The film']);
        const right = plural ? 'were' : 'was';
        return exMC(`${subject} ____ at home yesterday.`, right,
          [plural ? 'was' : 'were', 'are', 'did'],
          'The past of "to be": I/he/she/it → was, you/we/they → were.');
      },
      () => exGap(`I ____ (be) very tired last night.`, 'was',
        { explain: 'I → was.' }),
    ],
    pairs: () => exPickN(EX_FRAMES, 6).map(f => ({ left: exAff(f), right: exNeg(f) })),
  },

  // ---- 4. Regular and irregular verbs --------------------------------------
  {
    id: 'verbs',
    label: 'Regular & irregular verbs',
    pt: 'Verbos regulares e irregulares',
    aliases: ['regular', 'irregular', 'verb', 'verbs', 'verbo', 'verbos', 'regular verbs',
      'irregular verbs', 'verbos regulares', 'verbos irregulares', 'past forms', 'past participle',
      'lista de verbos', 'verb list'],
    gens: [
      () => {
        const v = exPick(EX_VERBS);
        return exGap(`Write the past simple: ${v.base} → ____`, v.past,
          { explain: `${v.base} → ${v.past} (${v.regular ? 'regular' : 'irregular'}).` });
      },
      () => {
        const v = exPick(EX_IRREGULAR);
        const wrongs = exPickN(EX_IRREGULAR.filter(x => x.past !== v.past), 2).map(x => x.past)
          .concat(`${v.base}ed`);
        return exMC(`What is the past simple of "${v.base}"?`, v.past, wrongs,
          `"${v.base}" is irregular: ${v.base} → ${v.past}.`);
      },
      () => {
        const v = exPick(EX_VERBS);
        return exSort(v.base, v.regular ? 'Regular' : 'Irregular', ['Regular', 'Irregular'],
          `${v.base} → ${v.past}.`);
      },
      () => {
        const s = exPick(EX_SPELLING);
        const wrongs = [s.trap, `${s.base}ed`, `${s.base}d`].filter((x, i, a) => x !== s.past && a.indexOf(x) === i);
        return exMC(`What is the past simple of "${s.base}"?`, s.past, exPickN(wrongs, 3), s.why + '.');
      },
      () => {
        const v = exPick(EX_IRREGULAR);
        return exGap(`Write the infinitive: ____ → ${v.past}`, v.base,
          { explain: `${v.base} → ${v.past}.` });
      },
      () => {
        // The sentence comes from the frames, not from a fixed template with
        // a random verb dropped in — "I used with my friends" is not English.
        const f = exPick(EX_FRAMES);
        return exGap(`${exCap(f.s)} ____ (${f.b}) ${f.r}.`, f.d,
          { explain: `${f.b} → ${f.d}.` });
      },
      () => {
        const s = exPick(EX_SPELLING.filter(x => x.why.includes('double')));
        return exMC('Which spelling rule is right?',
          `${s.base} → ${s.past}`, [`${s.base} → ${s.trap}`, `${s.base} → ${s.base}d`, `${s.base} → ${s.base}ied`],
          exCap(s.why) + '.');
      },
    ],
    pairs: () => exPickN(EX_IRREGULAR, 8).map(v => ({ left: v.base, right: v.past })),
    words: () => exPickN(EX_IRREGULAR, 10).map(v => ({ id: v.base, en: v.past, pt: v.pt, emoji: '📘' })),
  },

  // ---- 5. Question form and short answers ----------------------------------
  {
    id: 'questions',
    label: 'Questions & short answers',
    pt: 'Perguntas e respostas curtas',
    aliases: ['question', 'questions', 'question form', 'perguntas', 'pergunta', 'forma interrogativa',
      'interrogativa', 'short answer', 'short answers', 'respostas curtas', 'resposta curta',
      'yes no questions', 'yes/no', 'did you'],
    gens: [
      () => {
        const f = exPick(EX_FRAMES);
        return exGap(`____ ${f.s} ${f.b} ${f.r}?`, 'Did',
          { explain: 'Past simple questions start with Did + subject + base verb.' });
      },
      () => {
        const f = exPick(EX_FRAMES);
        const yes = exPick([true, false]);
        return exMC(`${exYesNo(f)}`, yes ? `Yes, ${f.p} did.` : `No, ${f.p} didn't.`,
          [yes ? `Yes, ${f.p} does.` : `No, ${f.p} doesn't.`,
            yes ? `Yes, ${f.p} ${f.d}.` : `No, ${f.p} not.`,
            yes ? `Yes, did ${f.p}.` : `No, ${f.p} did.`],
          `Short answers repeat the auxiliary: Yes, ${f.p} did. / No, ${f.p} didn't.`);
      },
      () => {
        const f = exPick(EX_FRAMES);
        return exGap(`${exYesNo(f)} — No, ${f.p} ____.`, "didn't",
          { explain: 'Negative short answer: No, + subject + didn\'t.' });
      },
      () => exOrder(exYesNo(exPick(EX_FRAMES)), 'Question word order: Did + subject + base verb + the rest?'),
      () => {
        const f = exPick(EX_FRAMES);
        return exMC('Which question is correct?', exYesNo(f),
          [`Did ${f.s} ${f.d} ${f.r}?`,
            `Do ${f.s} ${f.d} ${f.r}?`,
            `${exCap(f.s)} did ${f.b} ${f.r}?`],
          'After "Did" we use the base form, not the past form.');
      },
      () => {
        const f = exPick(EX_FRAMES.filter(x => x.p !== 'they' && x.p !== 'we'));
        return exGap(`____ ${f.s} happy with the result? — Yes, ${f.p} was.`, 'Was',
          { explain: 'With the verb "to be" there is no "did": Was she…? — Yes, she was.' });
      },
      () => {
        const f = exPick(EX_FRAMES);
        const asks = Math.random() < 0.5;
        return exSort(asks ? exYesNo(f) : exAff(f), asks ? 'Question' : 'Statement',
          ['Question', 'Statement'],
          asks ? 'It starts with "Did" and ends with a question mark.' : 'It tells us something.');
      },
    ],
    pairs: () => exPickN(EX_FRAMES, 6).map(f => ({
      left: exYesNo(f), right: exPick([`Yes, ${f.p} did.`, `No, ${f.p} didn't.`]),
    })),
  },

  // ---- 6. Wh- questions in the simple past ---------------------------------
  {
    id: 'whpast',
    label: 'Wh- questions (simple past)',
    pt: 'Perguntas com Wh- no passado',
    aliases: ['wh', 'wh questions', 'wh-questions', 'wh question', 'what where when who why how',
      'question words', 'palavras interrogativas', 'perguntas wh', 'wh no passado',
      'wh questions simple past', 'where when what who why'],
    gens: [
      () => {
        const f = exPick(EX_FRAMES.filter(x => x.wh));
        const wrongs = exPickN(['What', 'Where', 'When', 'Who', 'Why', 'What time'].filter(w => w !== f.wh.w), 3);
        return exMC(`${f.wh.q.replace(f.wh.w, '____')} — ${f.wh.a}`, f.wh.w, wrongs,
          `The answer is "${f.wh.a}", so the question word is "${f.wh.w}".`);
      },
      () => {
        const f = exPick(EX_FRAMES.filter(x => x.wh));
        return exGap(`${f.wh.q.replace(f.wh.w, '____')}`, f.wh.w,
          { hint: f.wh.a, explain: `Answer: ${f.wh.a} → ${f.wh.w}.` });
      },
      () => exOrder(exPick(EX_FRAMES.filter(x => x.wh)).wh.q,
        'Wh- word + did + subject + base verb + the rest?'),
      () => {
        const f = exPick(EX_FRAMES.filter(x => x.wh));
        const wrongs = exPickN(EX_FRAMES.filter(x => x.wh && x.wh.q !== f.wh.q), 3).map(x => x.wh.q);
        return exMC(`Which question gets this answer: "${f.wh.a}"`, f.wh.q, wrongs,
          `"${f.wh.a}" answers "${f.wh.q}".`);
      },
      () => {
        const f = exPick(EX_FRAMES.filter(x => x.wh));
        return exGap(f.wh.q.replace(' did ', ' ____ '), 'did',
          { explain: 'Wh- questions in the past also need "did" + the base form.' });
      },
      () => {
        const f = exPick(EX_FRAMES.filter(x => x.wh));
        return exMC('Which question is correct?', f.wh.q,
          [f.wh.q.replace(' did ', ' '), f.wh.q.replace(f.b, f.d), f.wh.q.replace('did', 'does')],
          'Wh- + did + subject + base verb.');
      },
      () => exMC('Complete: "____ did you feel after the test?"', 'How',
        ['Who', 'Where', 'What time'], '"How" asks about feelings or the way something happens.'),
    ],
    pairs: () => exPickN(EX_FRAMES.filter(x => x.wh), 6).map(f => ({ left: f.wh.q, right: f.wh.a })),
  },
];

// ---------------------------------------------------------------------------
// MORE TOPICS
// Lighter than the six above — three generators each — but they mean the
// teacher can type next month's revision list and still get a paper back.
// ---------------------------------------------------------------------------
EXAM_TOPICS.push(
  {
    id: 'presentsimple',
    label: 'Present simple',
    pt: 'Presente simples',
    aliases: ['present simple', 'presente simples', 'simple present', 'third person', 'terceira pessoa',
      'do does', 'rotina', 'daily routine'],
    gens: [
      () => {
        const v = exPick(['work', 'live', 'play', 'study', 'watch', 'go']);
        const third = { work: 'works', live: 'lives', play: 'plays', study: 'studies', watch: 'watches', go: 'goes' }[v];
        return exGap(`My sister ____ (${v}) every day.`, third,
          { explain: 'He/she/it adds -s (and -es after ch, sh, o, x; y → -ies).' });
      },
      () => exMC('Choose the correct sentence.', "He doesn't like coffee.",
        ["He don't like coffee.", "He doesn't likes coffee.", 'He not like coffee.'],
        'After does/doesn\'t the verb has no -s.'),
      () => exGap('____ your friends play football on Sundays?', 'Do',
        { explain: 'I/you/we/they → Do…?  he/she/it → Does…?' }),
    ],
  },
  {
    id: 'presentcontinuous',
    label: 'Present continuous',
    pt: 'Presente contínuo',
    aliases: ['present continuous', 'presente continuo', 'presente contínuo', 'ing', 'ing form',
      'gerundio', 'gerúndio', 'right now', 'present progressive', 'presente progressivo',
      'verbo ing', 'acontecendo agora'],
    gens: [
      () => {
        const v = exPick(EX_ING);
        const subj = exPick([['The boys', 'are'], ['My sister', 'is'], ['We', 'are'], ['Ana', 'is'], ['They', 'are']]);
        return exGap(`Look! ${subj[0]} ____ (${v[0]}) ${v[3]}.`, `${subj[1]} ${v[1]}`,
          { explain: `be + verb-ing: ${v[0]} → ${v[1]}.` });
      },
      () => exMC('Choose the correct sentence.', 'She is listening to music.',
        ['She listening to music.', 'She is listen to music.', 'She are listening to music.'],
        'am/is/are + verb-ing.'),
      () => exGap('What ____ you doing at the moment?', 'are', { explain: 'you → are.' }),
      () => {
        const v = exPick(EX_ING);
        return exGap(`Write the -ing form: ${v[0]} → ____`, v[1], { explain: v[2] });
      },
      () => {
        const v = exPick(EX_ING);
        const wrongs = [`${v[0]}ing`, `${v[0]}ying`, `${v[0]}eing`].filter(w => w !== v[1]);
        return exMC(`What is the -ing form of "${v[0]}"?`, v[1], exPickN(wrongs, 3), v[2]);
      },
      () => {
        const v = exPick(EX_ING);
        return exGap(`He ____ (not / ${v[0]}) ${v[3]} right now.`, `isn't ${v[1]}`,
          { explain: `Negative: isn't/aren't + verb-ing.` });
      },
      () => {
        const now = Math.random() < 0.5;
        const line = now
          ? exPick(['Look! The baby is sleeping.', 'They are playing in the garden right now.', 'I am doing my homework at the moment.'])
          : exPick(['She watches TV every evening.', 'We live in Brazil.', 'My brother plays football on Saturdays.']);
        return exSort(line, now ? 'Present continuous' : 'Present simple',
          ['Present simple', 'Present continuous'],
          now ? 'be + verb-ing, and it is happening now.' : 'A habit, not something happening now.');
      },
    ],
    pairs: () => exPickN(EX_ING, 8).map(v => ({ left: v[0], right: v[1] })),
  },
  {
    id: 'comparatives',
    label: 'Comparatives & superlatives',
    pt: 'Comparativos e superlativos',
    aliases: ['comparative', 'comparatives', 'superlative', 'superlatives', 'comparativo',
      'comparativos', 'superlativo', 'superlativos', 'bigger than', 'the best'],
    gens: [
      () => {
        const a = exPick([['big', 'bigger'], ['tall', 'taller'], ['happy', 'happier'], ['hot', 'hotter'], ['nice', 'nicer']]);
        return exGap(`An elephant is ____ (${a[0]}) than a dog.`, a[1],
          { explain: 'Short adjectives take -er: ' + a[0] + ' → ' + a[1] + '.' });
      },
      () => exMC('Choose the correct sentence.', 'This is the most expensive car in the shop.',
        ['This is the expensivest car in the shop.', 'This is more expensive car in the shop.',
          'This is the most expensivest car in the shop.'],
        'Long adjectives: the most + adjective.'),
      () => exMC('Complete: "Maths is ____ than English for me."', 'more difficult',
        ['difficulter', 'the most difficult', 'more difficulter'],
        'Long adjectives use more + adjective + than.'),
    ],
  },
  {
    id: 'plurals',
    label: 'Plural nouns',
    pt: 'Plural dos substantivos',
    aliases: ['plural', 'plurals', 'plurais', 'singular and plural', 'singular e plural', 'nouns'],
    gens: [
      () => {
        const w = exPick([['box', 'boxes'], ['baby', 'babies'], ['knife', 'knives'], ['city', 'cities'],
          ['watch', 'watches'], ['boy', 'boys'], ['leaf', 'leaves']]);
        return exGap(`Write the plural: ${w[0]} → ____`, w[1], { explain: `${w[0]} → ${w[1]}.` });
      },
      () => {
        const w = exPick([['child', 'children'], ['man', 'men'], ['woman', 'women'], ['foot', 'feet'],
          ['tooth', 'teeth'], ['person', 'people'], ['mouse', 'mice']]);
        return exMC(`What is the plural of "${w[0]}"?`, w[1], [`${w[0]}s`, `${w[0]}es`, `${w[0]}ies`],
          `"${w[0]}" is irregular: ${w[0]} → ${w[1]}.`);
      },
      () => exMC('Which plural is wrong?', 'childs', ['boxes', 'cities', 'knives'],
        'child → children.'),
    ],
  },
  {
    id: 'thereisare',
    label: 'There is / There are',
    pt: 'There is / There are',
    aliases: ['there is', 'there are', 'there was', 'there were', 'há', 'existe', 'tem'],
    gens: [
      () => {
        const plural = exPick([true, false]);
        const thing = plural ? exPick(['three chairs', 'two windows', 'some books']) : exPick(['a sofa', 'a big table', 'one picture']);
        return exGap(`____ ${thing} in the living room.`, plural ? 'There are' : 'There is',
          { explain: 'Singular → There is. Plural → There are.' });
      },
      () => exMC('Choose the correct sentence.', 'There were a lot of people at the party.',
        ['There was a lot of people at the party.', 'There are a lot of people at the party yesterday.',
          'There is a lot of people at the party yesterday.'],
        'Past + plural → there were.'),
      () => exGap('____ there any milk in the fridge?', 'Is', { explain: 'milk is uncountable → Is there…?' }),
    ],
  },
  {
    id: 'prepositions',
    label: 'Prepositions of place & time',
    pt: 'Preposições de lugar e tempo',
    aliases: ['preposition', 'prepositions', 'preposicao', 'preposição', 'preposicoes', 'preposições',
      'in on at', 'prepositions of place', 'prepositions of time', 'lugar', 'under behind'],
    gens: [
      () => {
        const p = exPick([['the table', 'on'], ['the box', 'in'], ['the door', 'behind'], ['the chairs', 'between']]);
        return exMC(`The cat is ____ ${p[0]}.`, p[1], exPickN(['on', 'in', 'behind', 'between', 'under'].filter(x => x !== p[1]), 3),
          'Look at the picture words: on = touching the top, in = inside.');
      },
      () => {
        const t = exPick([['Monday', 'on'], ['July', 'in'], ['7 o\'clock', 'at'], ['the morning', 'in'], ['night', 'at']]);
        return exGap(`We have English ____ ${t[0]}.`, t[1],
          { explain: 'at + hours, on + days, in + months and parts of the day.' });
      },
      () => exMC('Choose the correct sentence.', 'My birthday is in December.',
        ['My birthday is on December.', 'My birthday is at December.', 'My birthday is to December.'],
        'Months take "in".'),
    ],
  },
  {
    id: 'modals',
    label: 'Modals: can, should & must',
    pt: 'Modais: can, should e must',
    aliases: ['modal', 'modals', 'modais', 'verbos modais', 'can', 'cant', "can't", 'should',
      'shouldnt', "shouldn't", 'must', 'mustnt', "mustn't", 'can should must', 'ability',
      'habilidade', 'advice', 'conselho', 'obligation', 'obrigacao', 'obrigação', 'regras',
      'poder', 'dever'],
    gens: [
      () => exMC('Choose the correct sentence.', 'She can swim very well.',
        ['She cans swim very well.', 'She can swims very well.', 'She can to swim very well.'],
        'A modal takes the base verb: no -s, no "to".'),
      () => exGap('____ you play the guitar? — Yes, I can.', 'Can', { explain: 'Can + subject + base verb?' }),
      () => exGap("I'm sorry, I ____ (not / come) to your party.", "can't come",
        { explain: "can + not = can't, then the base verb." }),
      () => {
        const m = exPick(EX_MODAL_LINES);
        const wrongs = exPickN(['can', 'should', 'must', "mustn't", "shouldn't"].filter(x => x !== m.modal), 3);
        return exMC(`${m.text.replace('____', '____')} ${m.hint ? '(' + m.hint + ')' : ''}`.trim(),
          m.modal, wrongs, m.why);
      },
      () => {
        const m = exPick(EX_MODAL_LINES);
        return exGap(m.text, m.modal, { hint: m.hint, explain: m.why });
      },
      () => {
        const m = exPick(EX_MODAL_LINES);
        return exSort(m.text.replace('____', m.modal), m.kind, ['Ability', 'Advice', 'Obligation'], m.why);
      },
      () => exMC('Choose the correct sentence.', 'You must wear a helmet.',
        ['You must to wear a helmet.', 'You musts wear a helmet.', 'You must wearing a helmet.'],
        'must + base verb — never "must to".'),
      () => exGap("You look tired. You ____ (not / should) go to bed so late.", "shouldn't",
        { explain: "should + not = shouldn't + base verb." }),
    ],
    pairs: () => exPickN([
      ['can', 'ability'], ['should', 'advice'], ['must', 'obligation'], ["can't", 'not possible'],
      ["shouldn't", 'a bad idea'], ["mustn't", 'not allowed'], ['Can you…?', 'a request'],
    ], 6).map(v => ({ left: v[0], right: v[1] })),
  },
  {
    id: 'tenses',
    label: 'Which tense is it?',
    pt: 'Qual é o tempo verbal',
    aliases: ['tense', 'tenses', 'verb tense', 'verb tenses', 'tempo verbal', 'tempos verbais',
      'identificar o tempo verbal', 'identify the tense', 'which tense', 'qual tempo verbal',
      'identificar tempos verbais', 'revisao de tempos verbais', 'revisão de tempos verbais',
      'mixed tenses', 'tempos misturados'],
    gens: [
      () => {
        const l = exPick(EX_TENSE_LINES);
        const wrongs = exPickN(EX_TENSE_NAMES.filter(n => n !== l.tense), 3);
        return exMC(`Which tense is this sentence? "${l.s}"`, l.tense, wrongs, l.why);
      },
      () => {
        const l = exPick(EX_TENSE_LINES);
        return exSort(l.s, l.when, ['Past', 'Present', 'Future'], `${l.tense} → ${l.when.toLowerCase()}.`);
      },
      () => {
        const target = exPick(EX_TENSE_NAMES);
        const right = exPick(EX_TENSE_LINES.filter(l => l.tense === target));
        const wrongs = exPickN(EX_TENSE_LINES.filter(l => l.tense !== target), 3).map(l => l.s);
        return exMC(`Which sentence is in the ${target.toLowerCase()}?`, right.s, wrongs, right.why);
      },
      () => {
        const t = exPick(EX_TIME_WORDS);
        const wrongs = exPickN(EX_TIME_WORDS.filter(x => x.tense !== t.tense), 3).map(x => x.word);
        return exMC(`Which time expression goes with the ${t.tense.toLowerCase()}?`, t.word, wrongs,
          `"${t.word}" tells us it is ${t.tense.toLowerCase()}.`);
      },
      () => {
        const t = exPick(EX_TIME_WORDS);
        return exSort(t.word, t.when, ['Past', 'Present', 'Future'], `"${t.word}" → ${t.when.toLowerCase()}.`);
      },
      () => {
        const l = exPick(EX_TENSE_LINES.filter(x => x.tense === 'Present simple' || x.tense === 'Present continuous'));
        return exSort(l.s, l.tense, ['Present simple', 'Present continuous'], l.why);
      },
    ],
    pairs: () => exPickN(EX_TIME_WORDS, 7).map(t => ({ left: t.word, right: t.tense })),
  },
  {
    id: 'future',
    label: 'Future: going to & will',
    pt: 'Futuro com going to e will',
    aliases: ['going to', 'be going to', 'will', 'future', 'futuro', 'future forms', 'plans', 'planos',
      'will or going to', 'will e going to', 'futuro com will', 'futuro com going to', 'wont',
      "won't", 'predictions', 'previsoes', 'previsões'],
    gens: [
      () => {
        const f = exPick(EX_FUTURE_PLANS);
        return exGap(`${f.when} ${f.s} ____ (${f.v}) ${f.r}.`, `${f.be} going to ${f.v}`,
          { explain: 'A plan you already made: be + going to + base verb.' });
      },
      () => exMC('Choose the correct sentence.', 'He is going to buy a new phone.',
        ['He going to buy a new phone.', 'He is going to buys a new phone.', 'He is go to buy a new phone.'],
        'is/are + going to + base verb.'),
      () => exGap('What ____ you going to do at the weekend?', 'are', { explain: 'you → are going to.' }),
      () => exMC('"I\'m thirsty!" — "Don\'t worry, I ____ you some water."', 'will get',
        ['am going to get', 'will getting', 'get'],
        'A decision made at the moment of speaking takes "will".'),
      () => exMC('Look at those black clouds! It ____ rain.', 'is going to',
        ['will rains', 'goes to', 'is going'],
        'There is evidence in front of us, so we use "going to".'),
      () => exGap('____ you help me with my homework? — Yes, I will.', 'Will',
        { explain: 'Will + subject + base verb?' }),
      () => {
        const f = exPick(EX_FUTURE_PLANS);
        return exGap(`They ____ (not / arrive) before dinner.`, "won't arrive",
          { explain: "will + not = won't, then the base verb." });
      },
      () => exMC('Choose the correct sentence.', 'She will call you tomorrow.',
        ['She will to call you tomorrow.', 'She wills call you tomorrow.', 'She will calls you tomorrow.'],
        'will + base verb, with no "to" and no -s.'),
      () => {
        const willLine = Math.random() < 0.5;
        const line = willLine
          ? exPick(['I think it will be sunny tomorrow.', "Don't worry — I will help you.", 'She will be twelve next month.'])
          : exPick(['We are going to travel to Chile in July.', 'She is going to study medicine.', 'I am going to call you after dinner.']);
        return exSort(line, willLine ? 'will' : 'going to', ['going to', 'will'],
          willLine ? 'It uses will + base verb.' : 'It uses be + going to + base verb.');
      },
    ],
    pairs: () => exPickN([
      ['I will', "I'll"], ['she will', "she'll"], ['he will', "he'll"], ['we will', "we'll"],
      ['they will', "they'll"], ['you will', "you'll"], ['will not', "won't"], ['it will', "it'll"],
    ], 7).map(v => ({ left: v[0], right: v[1] })),
  },
);

// ---------------------------------------------------------------------------
// PRESENT CONTINUOUS, FUTURE, MODALS AND TENSE-SPOTTING
// ---------------------------------------------------------------------------
// base, -ing form, and the spelling rule the -ing form is testing.
// base, -ing form, the spelling rule, and something that verb can actually be
// doing — a shared complement would give us "We are sleeping in the garden".
const EX_ING = [
  ['play', 'playing', 'Most verbs just add -ing.', 'in the garden'],
  ['watch', 'watching', 'Most verbs just add -ing.', 'a film'],
  ['read', 'reading', 'Most verbs just add -ing.', 'a book'],
  ['eat', 'eating', 'Most verbs just add -ing.', 'lunch'],
  ['sleep', 'sleeping', 'Most verbs just add -ing.', 'on the sofa'],
  ['run', 'running', 'One vowel + one consonant → double the consonant.', 'in the park'],
  ['swim', 'swimming', 'One vowel + one consonant → double the consonant.', 'in the pool'],
  ['sit', 'sitting', 'One vowel + one consonant → double the consonant.', 'on the floor'],
  ['write', 'writing', 'Verb ends in -e → drop the -e.', 'a letter'],
  ['make', 'making', 'Verb ends in -e → drop the -e.', 'a cake'],
  ['dance', 'dancing', 'Verb ends in -e → drop the -e.', 'in the living room'],
  ['take', 'taking', 'Verb ends in -e → drop the -e.', 'photos'],
  ['study', 'studying', 'Verbs in -y keep the y and add -ing.', 'for the test'],
  ['cook', 'cooking', 'Most verbs just add -ing.', 'dinner'],
  ['listen', 'listening', 'Most verbs just add -ing.', 'to music'],
];

const EX_FUTURE_PLANS = [
  { when: 'Next summer', s: 'we', be: 'are', v: 'travel', r: 'to Portugal' },
  { when: 'On Saturday', s: 'my cousins', be: 'are', v: 'visit', r: 'the museum' },
  { when: 'Tonight', s: 'Ana', be: 'is', v: 'study', r: 'for the test' },
  { when: 'Next year', s: 'I', be: 'am', v: 'learn', r: 'to play the guitar' },
  { when: 'After school', s: 'they', be: 'are', v: 'play', r: 'volleyball' },
  { when: 'Tomorrow', s: 'my father', be: 'is', v: 'paint', r: 'the kitchen' },
];

// Each line has one blank and one modal that fits it, plus what that modal is
// doing there — which is the whole point of teaching can / should / must.
const EX_MODAL_LINES = [
  { text: 'She ____ play the piano very well.', modal: 'can', kind: 'Ability', why: '"Can" is for what somebody is able to do.' },
  { text: 'I ____ speak three languages.', modal: 'can', kind: 'Ability', why: '"Can" is for what somebody is able to do.' },
  { text: 'You look tired. You ____ go to bed early.', modal: 'should', kind: 'Advice', hint: 'advice', why: '"Should" gives advice.' },
  { text: 'You ____ drink more water when it is hot.', modal: 'should', kind: 'Advice', hint: 'advice', why: '"Should" gives advice.' },
  { text: 'Students ____ wear a uniform. It is a school rule.', modal: 'must', kind: 'Obligation', hint: 'a rule', why: '"Must" is for rules and obligations.' },
  { text: 'Drivers ____ stop at a red light.', modal: 'must', kind: 'Obligation', hint: 'a rule', why: '"Must" is for rules and obligations.' },
  { text: 'You ____ eat so much sugar — it is bad for you.', modal: "shouldn't", kind: 'Advice', hint: 'advice', why: '"Shouldn\'t" says something is a bad idea.' },
  { text: 'You ____ use your phone during the test.', modal: "mustn't", kind: 'Obligation', hint: 'not allowed', why: '"Mustn\'t" means it is not allowed.' },
];

const EX_TENSE_NAMES = ['Present simple', 'Present continuous', 'Past simple', 'Future: going to', 'Future: will'];

const EX_TENSE_LINES = [
  { s: 'She watches TV every evening.', tense: 'Present simple', when: 'Present', why: 'A habit, with "every evening".' },
  { s: 'We live in Brazil.', tense: 'Present simple', when: 'Present', why: 'Something that is always true.' },
  { s: 'My brother plays football on Saturdays.', tense: 'Present simple', when: 'Present', why: 'A habit, with "on Saturdays".' },
  { s: 'The shop opens at nine o\'clock.', tense: 'Present simple', when: 'Present', why: 'A timetable — present simple.' },
  { s: 'Look! The baby is sleeping.', tense: 'Present continuous', when: 'Present', why: 'be + verb-ing, happening now.' },
  { s: 'They are playing in the garden right now.', tense: 'Present continuous', when: 'Present', why: 'be + verb-ing, with "right now".' },
  { s: 'I am doing my homework at the moment.', tense: 'Present continuous', when: 'Present', why: 'be + verb-ing, with "at the moment".' },
  { s: 'She is wearing a red dress today.', tense: 'Present continuous', when: 'Present', why: 'be + verb-ing, happening today.' },
  { s: 'We visited our grandparents last Sunday.', tense: 'Past simple', when: 'Past', why: 'Past verb + "last Sunday".' },
  { s: 'He bought a new bike yesterday.', tense: 'Past simple', when: 'Past', why: 'Past verb + "yesterday".' },
  { s: 'The film started at eight o\'clock.', tense: 'Past simple', when: 'Past', why: 'The -ed ending shows the past simple.' },
  { s: "They didn't go to school on Monday.", tense: 'Past simple', when: 'Past', why: '"Didn\'t" + base verb is the past simple.' },
  { s: 'We are going to travel to Chile in July.', tense: 'Future: going to', when: 'Future', why: 'be + going to = a plan.' },
  { s: 'She is going to study medicine.', tense: 'Future: going to', when: 'Future', why: 'be + going to = a plan.' },
  { s: 'Look at those clouds! It is going to rain.', tense: 'Future: going to', when: 'Future', why: 'We can see the evidence → going to.' },
  { s: 'I am going to call you after dinner.', tense: 'Future: going to', when: 'Future', why: 'be + going to = a plan.' },
  { s: 'I think it will be sunny tomorrow.', tense: 'Future: will', when: 'Future', why: '"Will" for what we think or predict.' },
  { s: 'She will be twelve next month.', tense: 'Future: will', when: 'Future', why: 'will + base verb, with "next month".' },
  { s: "Don't worry — I will help you.", tense: 'Future: will', when: 'Future', why: 'A decision made right now → will.' },
  { s: 'They will arrive at six o\'clock.', tense: 'Future: will', when: 'Future', why: 'will + base verb.' },
];

const EX_TIME_WORDS = [
  { word: 'yesterday', tense: 'Past simple', when: 'Past' },
  { word: 'last week', tense: 'Past simple', when: 'Past' },
  { word: 'two days ago', tense: 'Past simple', when: 'Past' },
  { word: 'every day', tense: 'Present simple', when: 'Present' },
  { word: 'usually', tense: 'Present simple', when: 'Present' },
  { word: 'right now', tense: 'Present continuous', when: 'Present' },
  { word: 'at the moment', tense: 'Present continuous', when: 'Present' },
  { word: 'tomorrow', tense: 'Future: will', when: 'Future' },
  { word: 'next month', tense: 'Future: will', when: 'Future' },
  { word: 'next summer', tense: 'Future: going to', when: 'Future' },
];

// ---------------------------------------------------------------------------
// MATCHING WHAT THE TEACHER TYPED TO A TOPIC
// ---------------------------------------------------------------------------
function exNormTerm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // acentos fora
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Longer aliases win: "simple past" should beat the bare "past" that half the
// grammar topics share.
function exBestTopic(line) {
  const q = exNormTerm(line);
  if (!q) return null;
  let best = null;
  let bestScore = 0;
  EXAM_TOPICS.forEach(topic => {
    let score = 0;
    topic.aliases.forEach(alias => {
      const a = exNormTerm(alias);
      if (!a) return;
      const weight = a.split(' ').length;
      // A short single word has to match a whole word, or "cancel" would pull
      // in the modals topic through "can".
      const contains = weight === 1 && a.length <= 5
        ? new RegExp(`(^|\\s)${a}($|\\s)`).test(q)
        : q.includes(a);
      if (q === a) score += weight * 6;
      else if (contains) score += weight * 3;
      else if (a.includes(q) && q.length >= 4) score += 2;
    });
    if (score > bestScore) { bestScore = score; best = topic; }
  });
  return bestScore >= 3 ? best : null;
}

// One typed line per topic, but a comma or a semicolon inside a line splits it
// too — "past simple: negative, affirmative form" is how a teacher writes two
// things, not one.
function exMatchTopics(text) {
  const lines = String(text || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  const matched = [];
  const missed = [];
  const seen = new Set();
  const topics = [];
  lines.forEach(line => {
    const topic = exBestTopic(line);
    if (!topic) { missed.push(line); return; }
    matched.push({ line, topic });
    if (!seen.has(topic.id)) { seen.add(topic.id); topics.push(topic); }
  });
  return { matched, missed, topics };
}

// ---------------------------------------------------------------------------
// BUILDING THE PAPER
// ---------------------------------------------------------------------------
const EXAM_STORE_KEY = 'exams';
const EXAM_MIN = 10;
const EXAM_MAX = 20;

// As even a split as the count allows, with the remainder going to the topics
// the teacher typed first — those are the ones the test is really about.
function exDistribute(total, parts) {
  const base = Math.floor(total / parts);
  const extra = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

function exGenerate(topic, n) {
  const out = [];
  const seen = new Set();
  let queue = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 30 + 40) {
    // Each generator gets a turn before any of them gets a second one:
    // picking at random gave papers with three "put the words in order" and
    // no date question at all.
    if (!queue.length) queue = exShuffle(topic.gens.slice());
    let item;
    try { item = queue.shift()(); } catch (e) { continue; }
    if (!item || !item.prompt) continue;
    if (item.kind === 'mc' && item.options.length < 3) continue;
    const key = `${exNorm(item.prompt)}|${exNorm(item.correct)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    item.topic = topic.label;
    item.topicId = topic.id;
    out.push(item);
  }
  return out;
}

const EX_PART_META = {
  mc: { title: 'Multiple choice', instruction: 'Read and circle the correct option.' },
  gap: { title: 'Complete the sentences', instruction: 'Write the missing word or words on the line.' },
  order: { title: 'Word order', instruction: 'Put the words in the right order to make a sentence.' },
  sort: { title: 'Two groups', instruction: 'Write the right group next to each one.' },
};

// A paper reads like a paper: all the multiple choice together, then the
// gap-fills, and so on — not a random shuffle of four exercise types.
function exPartition(items) {
  // Sorting items are grouped by the two groups they sort between. A group
  // that ends up with a single item would print as a one-question exercise,
  // so it becomes what it already is — a two-option multiple choice.
  const sortGroups = {};
  items.filter(i => i.kind === 'sort').forEach(i => {
    const key = i.buckets.join(' / ');
    (sortGroups[key] = sortGroups[key] || []).push(i);
  });
  Object.keys(sortGroups).forEach(key => {
    if (sortGroups[key].length >= 2) return;
    sortGroups[key].forEach(item => {
      const names = item.buckets;
      item.kind = 'mc';
      item.options = exShuffle(names.slice());
      item.prompt = `${names.length > 2
        ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
        : names.join(' or ')}? — "${item.prompt}"`;
    });
    delete sortGroups[key];
  });

  const parts = [];
  const push = (kind, key, list, instruction) => {
    if (!list.length) return;
    parts.push({
      kind,
      key,
      title: EX_PART_META[kind].title,
      instruction: instruction || EX_PART_META[kind].instruction,
      items: list,
    });
  };
  push('mc', 'mc', items.filter(i => i.kind === 'mc'));
  push('gap', 'gap', items.filter(i => i.kind === 'gap'));
  push('order', 'order', items.filter(i => i.kind === 'order'));

  // Sorting items only belong in the same exercise when they share the two
  // groups: "Regular / Irregular" and "Question / Statement" are two tasks.
  Object.keys(sortGroups).forEach(key => {
    const names = sortGroups[key][0].buckets;
    const list = names.length > 2
      ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
      : names.join(' or ');
    push('sort', `sort:${key}`, sortGroups[key], `Write ${list} next to each one.`);
  });

  parts.forEach((p, i) => { p.letter = String.fromCharCode(65 + i); });
  let n = 0;
  parts.forEach(p => p.items.forEach(item => { item.n = ++n; }));
  return parts;
}

function exBuildExam(opts) {
  const topics = opts.topics.filter(Boolean);
  const count = Math.min(EXAM_MAX, Math.max(EXAM_MIN, Number(opts.count) || 12));
  if (!topics.length) return null;

  const quota = exDistribute(count, topics.length);
  let items = [];
  topics.forEach((topic, i) => { items = items.concat(exGenerate(topic, quota[i])); });

  // Topics overlap: "My brother plays football on Saturdays" is a fair
  // question for both Present continuous and Which tense is it, and the paper
  // must not ask it twice. Each topic only dedupes against itself.
  const seen = new Set();
  items = items.filter(item => {
    const key = `${exNorm(item.prompt)}|${exNorm(item.correct)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // A topic can run out of unique questions before its quota is met (a short
  // generator list plus bad luck). Top up from the others rather than handing
  // back a 9-question paper the teacher asked 12 questions for.
  let guard = 0;
  while (items.length < count && guard++ < 30) {
    const topic = exPick(topics);
    const extra = exGenerate(topic, 1)[0];
    if (!extra) continue;
    const key = `${exNorm(extra.prompt)}|${exNorm(extra.correct)}`;
    if (items.some(i => `${exNorm(i.prompt)}|${exNorm(i.correct)}` === key)) continue;
    items.push(extra);
  }
  items = items.slice(0, count);

  const parts = exPartition(items);
  return {
    id: 'ex' + Date.now().toString(36),
    title: (opts.title || '').trim() || 'English Test',
    group: (opts.group || '').trim(),
    topicIds: topics.map(t => t.id),
    topicLabels: topics.map(t => t.label),
    createdAt: new Date().toISOString(),
    count: items.length,
    parts,
    items: parts.reduce((all, p) => all.concat(p.items), []),
  };
}

// Saved papers, newest first — the teacher prints today's test again tomorrow
// for the student who was away.
function exLoadExams() {
  const list = IGStore.getJSON(EXAM_STORE_KEY, []);
  return Array.isArray(list) ? list : [];
}
function exSaveExam(exam) {
  const list = exLoadExams().filter(e => e.id !== exam.id);
  list.unshift(exam);
  IGStore.setJSON(EXAM_STORE_KEY, list.slice(0, 24));
}
function exDeleteExam(id) {
  IGStore.setJSON(EXAM_STORE_KEY, exLoadExams().filter(e => e.id !== id));
}

// ---------------------------------------------------------------------------
// THE PAPER, ON SCREEN AND ON PAPER
// ---------------------------------------------------------------------------
const EX_LETTERS = ['a', 'b', 'c', 'd', 'e'];

function exItemHTML(item, showAnswers) {
  const answer = `<span class="exam-answer">${exEsc(item.correct)}</span>`;
  const why = showAnswers && item.explain ? `<span class="exam-why">${exEsc(item.explain)}</span>` : '';

  if (item.kind === 'mc') {
    return `
      <li class="exam-q" value="${item.n}">
        <p class="exam-q-text">${exEsc(item.prompt)}</p>
        <ol class="exam-options">
          ${item.options.map((o, i) => `
            <li class="${showAnswers && o === item.correct ? 'is-key' : ''}">
              <span class="exam-opt-letter">${EX_LETTERS[i]})</span> ${exEsc(o)}
            </li>`).join('')}
        </ol>
        ${why}
      </li>`;
  }

  if (item.kind === 'gap') {
    // The blank in the prompt becomes the line the student writes on, so the
    // answer lands exactly where the missing words belong.
    const text = exEsc(item.prompt).replace(/_{2,}/,
      showAnswers ? `<span class="exam-answer">${exEsc(item.correct)}</span>` : '<span class="exam-line"></span>');
    const tail = /_{2,}/.test(item.prompt) ? '' : (showAnswers ? ` → ${answer}` : ' <span class="exam-line"></span>');
    return `
      <li class="exam-q" value="${item.n}">
        <p class="exam-q-text">${text}${tail}</p>
        ${item.hint ? `<p class="exam-hint">(${exEsc(item.hint)})</p>` : ''}
        ${why}
      </li>`;
  }

  if (item.kind === 'order') {
    return `
      <li class="exam-q" value="${item.n}">
        <p class="exam-q-text exam-tokens">${item.tokens.map(t => `<span>${exEsc(t)}</span>`).join('<i>/</i>')}</p>
        <p class="exam-write">${showAnswers ? answer : '<span class="exam-line long"></span>'}</p>
        ${why}
      </li>`;
  }

  // sort
  return `
    <li class="exam-q exam-q-inline" value="${item.n}">
      <span class="exam-q-text">${exEsc(item.prompt)}</span>
      <span class="exam-sort-slot">${showAnswers ? answer : '<span class="exam-line"></span>'}</span>
      ${why}
    </li>`;
}

function exPaperHTML(exam, showAnswers) {
  const date = new Date(exam.createdAt);
  return `
    <article class="exam-paper${showAnswers ? ' with-answers' : ''}">
      <header class="exam-paper-head">
        <div class="exam-paper-brand">IG English School</div>
        <h2>${exEsc(exam.title)}${showAnswers ? ' — <span class="exam-key-tag">Answer key</span>' : ''}</h2>
        <p class="exam-paper-topics">${exam.topicLabels.map(exEsc).join(' · ')}</p>
        <div class="exam-paper-meta">
          <span>Name: <b class="exam-line"></b></span>
          <span>${exEsc(exam.group || 'Class')}: <b class="exam-line short"></b></span>
          <span>Date: ${date.toLocaleDateString('pt-BR')}</span>
          <span class="exam-paper-score">Score: ____ / ${exam.count}</span>
        </div>
      </header>

      ${exam.parts.map(part => `
        <section class="exam-part">
          <h3>Part ${part.letter} — ${exEsc(part.title)} <span>(${part.items.length} ${part.items.length === 1 ? 'question' : 'questions'})</span></h3>
          <p class="exam-instruction">${exEsc(part.instruction)}</p>
          <ol class="exam-qs">${part.items.map(i => exItemHTML(i, showAnswers)).join('')}</ol>
        </section>
      `).join('')}

      ${showAnswers ? `
        <section class="exam-part exam-keylist">
          <h3>Quick key</h3>
          <ol class="exam-key-grid">
            ${exam.items.map(i => `<li><b>${i.n}.</b> ${exEsc(i.correct)}</li>`).join('')}
          </ol>
        </section>` : ''}
    </article>`;
}

// Printing reuses the report sheet's print root: the stylesheet already hides
// everything else on the page when that root is filled, and two competing
// print roots would only fight each other.
function exPrint(exam, showAnswers) {
  const root = typeof getPrintRoot === 'function'
    ? getPrintRoot()
    : (document.getElementById('reportPrintRoot') || document.body.appendChild(
        Object.assign(document.createElement('div'), { id: 'reportPrintRoot' })));
  root.innerHTML = `<div class="exam-print">${exPaperHTML(exam, showAnswers)}</div>`;
  setTimeout(() => {
    try { window.print(); }
    catch (e) { alert('O navegador bloqueou a impressão. Use Ctrl+P.'); }
  }, 60);
}

// ---------------------------------------------------------------------------
// THE EXAM MAKER PAGE
// ---------------------------------------------------------------------------
const EXAM_PLACEHOLDER = `ordinal numbers and dates
large numbers and years
past simple: negative, affirmative form
regular and irregular verbs
question form and short answers
wh questions using simple past`;

let examState = {
  text: '',
  count: 12,
  title: '',
  group: '',
  exam: null,
  showAnswers: false,
};

function renderExamMaker(container) {
  if (!container) return;
  const saved = exLoadExams();
  const match = exMatchTopics(examState.text);

  container.innerHTML = `
    <div class="exam-maker">
      <div class="exam-builder">
        <label class="exam-field">
          <span class="exam-label">Tópicos da prova <small>— um por linha (ou separados por vírgula)</small></span>
          <textarea id="examTopics" rows="6" placeholder="${exEsc(EXAM_PLACEHOLDER)}" spellcheck="false">${exEsc(examState.text)}</textarea>
        </label>

        <div class="exam-chips">
          <span class="exam-chips-label">Tópicos prontos:</span>
          ${EXAM_TOPICS.map(t => `<button type="button" class="exam-chip" data-add="${t.id}">+ ${exEsc(t.label)}</button>`).join('')}
        </div>

        <div class="exam-row">
          <label class="exam-field small">
            <span class="exam-label">Questões</span>
            <div class="exam-count">
              <input type="range" id="examCount" min="${EXAM_MIN}" max="${EXAM_MAX}" step="1" value="${examState.count}" />
              <output id="examCountOut">${examState.count}</output>
            </div>
          </label>
          <label class="exam-field small">
            <span class="exam-label">Título</span>
            <input type="text" id="examTitle" placeholder="English Test — Unit 4" value="${exEsc(examState.title)}" />
          </label>
          <label class="exam-field small">
            <span class="exam-label">Turma / aluno</span>
            <input type="text" id="examGroup" placeholder="Turma A2" value="${exEsc(examState.group)}" />
          </label>
        </div>

        <div class="exam-readout">
          ${match.topics.length ? match.topics.map(t => `<span class="exam-tag ok">✓ ${exEsc(t.label)}</span>`).join('') : ''}
          ${match.missed.map(m => `<span class="exam-tag miss" title="Não reconhecido — use os botões acima">? ${exEsc(m)}</span>`).join('')}
          ${!examState.text.trim() ? '<span class="exam-tag hint">Digite os tópicos ou clique nos botões acima.</span>' : ''}
        </div>

        <div class="exam-actions">
          <button class="btn btn-primary" id="examBuild" ${match.topics.length ? '' : 'disabled'}>✨ Gerar prova</button>
          ${examState.exam ? '<button class="btn btn-ghost" id="examRebuild">🔄 Outra versão</button>' : ''}
        </div>
      </div>

      <div id="examResult">${examState.exam ? exResultHTML(examState.exam) : ''}</div>

      ${saved.length ? `
        <div class="exam-saved">
          <h3>📁 Provas salvas</h3>
          <div class="exam-saved-list">
            ${saved.map(e => `
              <div class="exam-saved-card">
                <div>
                  <b>${exEsc(e.title)}</b>
                  <span>${e.count} questões · ${new Date(e.createdAt).toLocaleDateString('pt-BR')}</span>
                  <span class="exam-saved-topics">${e.topicLabels.map(exEsc).join(' · ')}</span>
                </div>
                <div class="exam-saved-actions">
                  <button class="game-btn" data-open="${e.id}">📄 Abrir</button>
                  <button class="game-btn secondary" data-play="${e.id}">🎮 Jogos</button>
                  <button class="game-btn secondary danger" data-del="${e.id}">🗑️</button>
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}
    </div>`;

  bindExamMaker(container);
}

function exResultHTML(exam) {
  return `
    <div class="exam-result">
      <div class="exam-result-bar">
        <span class="game-status-pill">📝 ${exam.count} questões · ${exam.parts.length} partes</span>
        <div class="game-btn-row">
          <button class="game-btn" data-action="play">🎮 Treinar jogando</button>
          <button class="game-btn" data-action="take">✍️ Fazer no computador</button>
          <button class="game-btn secondary" data-action="print">🖨️ Imprimir prova</button>
          <button class="game-btn secondary" data-action="printkey">🔑 Imprimir gabarito</button>
          <button class="game-btn secondary" data-action="answers">${examState.showAnswers ? '🙈 Esconder respostas' : '👁️ Ver respostas'}</button>
          <button class="game-btn secondary" data-action="save">💾 Salvar</button>
        </div>
      </div>
      <div class="exam-paper-wrap">${exPaperHTML(exam, examState.showAnswers)}</div>
    </div>`;
}

function exRepaintResult(container) {
  const mount = container.querySelector('#examResult');
  if (!mount) return;
  mount.innerHTML = examState.exam ? exResultHTML(examState.exam) : '';
  bindExamResult(container);
}

function bindExamResult(container) {
  const exam = examState.exam;
  if (!exam) return;
  const on = (action, fn) => {
    const btn = container.querySelector(`#examResult [data-action="${action}"]`);
    if (btn) btn.addEventListener('click', fn);
  };
  on('print', () => exPrint(exam, false));
  on('printkey', () => exPrint(exam, true));
  on('answers', () => { examState.showAnswers = !examState.showAnswers; exRepaintResult(container); });
  on('take', () => openExamRunner(exam));
  on('play', () => openExamGames(exam));
  on('save', () => {
    exSaveExam(exam);
    renderExamMaker(container);
  });
}

function bindExamMaker(container) {
  const topics = container.querySelector('#examTopics');
  const count = container.querySelector('#examCount');
  const countOut = container.querySelector('#examCountOut');
  const title = container.querySelector('#examTitle');
  const group = container.querySelector('#examGroup');

  // The readout of recognised topics is the only thing that has to follow
  // every keystroke, so the textarea is left alone and only that strip is
  // repainted — retyping the box under the teacher's cursor is unusable.
  let debounce = null;
  const refreshTags = () => {
    const m = exMatchTopics(topics.value);
    const readout = container.querySelector('.exam-readout');
    const build = container.querySelector('#examBuild');
    if (readout) {
      readout.innerHTML = `
        ${m.topics.map(t => `<span class="exam-tag ok">✓ ${exEsc(t.label)}</span>`).join('')}
        ${m.missed.map(x => `<span class="exam-tag miss" title="Não reconhecido — use os botões acima">? ${exEsc(x)}</span>`).join('')}
        ${!topics.value.trim() ? '<span class="exam-tag hint">Digite os tópicos ou clique nos botões acima.</span>' : ''}`;
    }
    if (build) build.disabled = m.topics.length === 0;
  };

  if (topics) {
    topics.addEventListener('input', () => {
      examState.text = topics.value;
      clearTimeout(debounce);
      debounce = setTimeout(refreshTags, 180);
    });
  }
  if (count) {
    count.addEventListener('input', () => {
      examState.count = Number(count.value);
      if (countOut) countOut.textContent = count.value;
    });
  }
  if (title) title.addEventListener('input', () => { examState.title = title.value; });
  if (group) group.addEventListener('input', () => { examState.group = group.value; });

  container.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const topic = EXAM_TOPICS.find(t => t.id === btn.dataset.add);
      if (!topic || !topics) return;
      const lines = topics.value.split('\n').map(s => s.trim()).filter(Boolean);
      if (lines.some(l => exBestTopic(l) === topic)) return;    // já está lá
      lines.push(topic.label);
      topics.value = lines.join('\n');
      examState.text = topics.value;
      refreshTags();
      topics.focus();
    });
  });

  const build = container.querySelector('#examBuild');
  const generate = () => {
    const m = exMatchTopics(examState.text);
    if (!m.topics.length) return;
    examState.exam = exBuildExam({
      topics: m.topics,
      count: examState.count,
      title: examState.title,
      group: examState.group,
    });
    examState.showAnswers = false;
    exRepaintResult(container);
    const res = container.querySelector('#examResult');
    if (res) res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  if (build) build.addEventListener('click', generate);
  const rebuild = container.querySelector('#examRebuild');
  if (rebuild) rebuild.addEventListener('click', generate);

  container.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const exam = exLoadExams().find(e => e.id === btn.dataset.open);
      if (!exam) return;
      examState.exam = exam;
      examState.showAnswers = false;
      exRepaintResult(container);
      container.querySelector('#examResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  container.querySelectorAll('[data-play]').forEach(btn => {
    btn.addEventListener('click', () => {
      const exam = exLoadExams().find(e => e.id === btn.dataset.play);
      if (exam) openExamGames(exam);
    });
  });
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const exam = exLoadExams().find(e => e.id === btn.dataset.del);
      if (!exam) return;
      if (!confirm(`Excluir "${exam.title}"?`)) return;
      exDeleteExam(exam.id);
      renderExamMaker(container);
    });
  });

  bindExamResult(container);
}

// ---------------------------------------------------------------------------
// FEEDBACK — the same little sounds and confetti the other games use, kept
// local so this file does not reach inside the GameEngine closure.
// ---------------------------------------------------------------------------
function exPlayGood() { try { IGSound.note(523, 0, 0.12, 'triangle', 0.13); IGSound.note(784, 0.09, 0.18, 'triangle', 0.12); } catch (e) {} }
function exPlayBad() { try { IGSound.note(180, 0, 0.2, 'sawtooth', 0.1); } catch (e) {} }
function exPlayWin() { try { [523, 659, 784, 1047].forEach((f, i) => IGSound.note(f, i * 0.1, 0.32, 'triangle', 0.14)); } catch (e) {} }

const EX_CONFETTI = ['#f05d77', '#b8953a', '#a9b4a4', '#8e6d86', '#c9435c', '#6f7d68'];
function exConfetti(el) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  for (let i = 0; i < 22; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 90;
    piece.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    piece.style.setProperty('--rot', `${Math.random() * 360}deg`);
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = EX_CONFETTI[i % EX_CONFETTI.length];
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 1200);
  }
}

function exCheckTyped(item, value) {
  return exAnswerVariants(item.correct, item.accept).indexOf(exNorm(value)) !== -1;
}
function exJoinTokens(tokens) {
  return tokens.join(' ').replace(/\s+([?.!,])/g, '$1');
}
function exStarsFor(correct, total) {
  const pct = total ? correct / total : 0;
  return pct === 1 ? 3 : pct >= 0.7 ? 2 : pct >= 0.5 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// FRESH MATERIAL FROM THE SAME TOPICS
// The games are not limited to the twelve questions on the paper: they ask the
// generators for more of the same, so a student can keep playing until the
// topic sticks.
// ---------------------------------------------------------------------------
function exTopicsOf(exam) {
  return (exam.topicIds || []).map(id => EXAM_TOPICS.find(t => t.id === id)).filter(Boolean);
}

function exTopicKinds(topic) {
  if (!topic._kinds) {
    const kinds = new Set();
    topic.gens.forEach(gen => { try { const item = gen(); if (item) kinds.add(item.kind); } catch (e) {} });
    topic._kinds = kinds;
  }
  return topic._kinds;
}
function exAnyKind(topics, kinds) {
  return topics.some(t => kinds.some(k => exTopicKinds(t).has(k)));
}
function exAnyPairs(topics) {
  return topics.some(t => typeof t.pairs === 'function');
}

function exPool(topics, kinds, n) {
  const usable = topics.filter(t => kinds.some(k => exTopicKinds(t).has(k)));
  const from = usable.length ? usable : topics;
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < n * 40 + 120) {
    const topic = exPick(from);
    let item;
    try { item = exPick(topic.gens)(); } catch (e) { continue; }
    if (!item || kinds.indexOf(item.kind) === -1) continue;
    const key = `${exNorm(item.prompt)}|${exNorm(item.correct)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    item.topic = topic.label;
    out.push(item);
  }
  return out;
}

function exPairPool(topics, n, maxLen) {
  let all = [];
  topics.forEach(t => {
    if (typeof t.pairs !== 'function') return;
    try { all = all.concat(t.pairs().map(p => ({ ...p, topic: t.label }))); } catch (e) {}
  });
  const seen = new Set();
  const out = [];
  exShuffle(all).forEach(p => {
    const key = exNorm(p.left);
    if (!p.left || !p.right || seen.has(key)) return;
    seen.add(key);
    out.push(p);
  });
  // Memory asks for short pairs: a whole question on a face-down card is a
  // reading test, not a memory game. Longer pairs still fill the board when
  // there are not enough short ones.
  if (maxLen) {
    const fits = p => p.left.length <= maxLen && p.right.length <= maxLen;
    return out.filter(fits).concat(out.filter(p => !fits(p))).slice(0, n);
  }
  return out.slice(0, n);
}

// ---------------------------------------------------------------------------
// THE PRACTICE GAMES
// ---------------------------------------------------------------------------
const ExamGames = (() => {
  let timer = null;
  let mountEl = null;

  function stopAll() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  const TYPES = [
    { id: 'race', label: 'Quiz Race', icon: '⚡', can: t => exAnyKind(t, ['mc', 'gap']) },
    { id: 'match', label: 'Match-up', icon: '🔗', can: t => exAnyPairs(t) },
    { id: 'memory', label: 'Memory', icon: '🧠', can: t => exAnyPairs(t) },
    { id: 'builder', label: 'Sentence Builder', icon: '🧩', can: t => exAnyKind(t, ['order']) },
    { id: 'sorting', label: 'Sort It', icon: '🗂️', can: t => exAnyKind(t, ['sort']) },
  ];

  function head(status, extra) {
    return `
      <div class="game-toolbar">
        <span class="game-status-pill">${status}</span>
        <div class="game-btn-row">${extra || ''}<button class="game-btn secondary" data-action="restart">🔄 Recomeçar</button></div>
      </div>`;
  }

  function endBanner(container, correct, total, replay) {
    const stars = exStarsFor(correct, total);
    const pct = Math.round((correct / total) * 100);
    if (stars) { exPlayWin(); if (typeof awardProgress === 'function') awardProgress(correct * 4, stars); }
    else if (typeof awardProgress === 'function') awardProgress(correct * 4, 0);
    container.innerHTML = `
      <div class="game-end-banner ${pct >= 50 ? 'win' : 'lose'}">
        ${pct === 100 ? '🏆 Perfeito!' : pct >= 70 ? '🎉 Muito bem!' : '💪 Quase lá!'}
        <p>${correct} / ${total} (${pct}%)</p>
        <p>${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
        <div class="game-btn-row" style="justify-content:center;margin-top:12px">
          <button class="btn btn-primary" data-action="again">🔄 Jogar de novo</button>
        </div>
      </div>`;
    exConfetti(container.querySelector('.game-end-banner'));
    container.querySelector('[data-action="again"]').addEventListener('click', replay);
  }

  // ---- ⚡ Quiz Race ------------------------------------------------------
  function race(container, topics) {
    const deck = exPool(topics, ['mc', 'gap'], 10);
    if (!deck.length) { container.innerHTML = '<p class="quiz-empty">Sem questões para este jogo.</p>'; return; }
    let index = 0, correct = 0, streak = 0, best = 0, left = 30;

    function paint() {
      stopAll();
      const item = deck[index];
      container.innerHTML = `
        ${head(`⚡ ${index + 1}/${deck.length} · ${correct} certas · 🔥 ${streak}`)}
        <div class="exg-race">
          <div class="exg-timer"><div class="exg-timer-fill" id="exgBar"></div></div>
          <p class="exg-topic">${exEsc(item.topic)}</p>
          <p class="ex-prompt">${exEsc(item.prompt)}</p>
          ${item.kind === 'mc' ? `
            <div class="ex-options">
              ${item.options.map((o, i) => `<button class="ex-option" data-opt="${i}">${exEsc(o)}</button>`).join('')}
            </div>`
          : `
            <div class="exg-type-row">
              <input type="text" class="exg-input" id="exgInput" placeholder="Escreva a resposta…" autocomplete="off" spellcheck="false" />
              <button class="game-btn" data-action="check">Checar</button>
            </div>
            ${item.hint ? `<p class="exam-hint">💡 ${exEsc(item.hint)}</p>` : ''}`}
          <p class="ex-feedback" id="exgFb" hidden></p>
          <div class="game-btn-row ex-actions"><button class="btn btn-primary" id="exgNext" hidden>
            ${index + 1 === deck.length ? 'Ver resultado →' : 'Próxima →'}
          </button></div>
        </div>`;

      const bar = container.querySelector('#exgBar');
      left = 30;
      bar.style.width = '100%';
      timer = setInterval(() => {
        left -= 0.1;
        bar.style.width = `${Math.max(0, (left / 30) * 100)}%`;
        if (left <= 0) { stopAll(); resolve(false, null); }
      }, 100);

      function resolve(right, chosenEl) {
        stopAll();
        const fb = container.querySelector('#exgFb');
        const next = container.querySelector('#exgNext');
        if (right) {
          correct++; streak++; best = Math.max(best, streak);
          exPlayGood();
          exConfetti(chosenEl || container.querySelector('.ex-prompt'));
          if (typeof awardProgress === 'function') awardProgress(3, 0);
        } else {
          streak = 0;
          exPlayBad();
        }
        container.querySelectorAll('.ex-option').forEach(b => {
          b.disabled = true;
          if (item.options[Number(b.dataset.opt)] === item.correct) b.classList.add('correct');
        });
        if (!right && chosenEl && chosenEl.classList.contains('ex-option')) chosenEl.classList.add('wrong');
        const input = container.querySelector('#exgInput');
        if (input) { input.disabled = true; input.classList.add(right ? 'ok' : 'no'); }
        const check = container.querySelector('[data-action="check"]');
        if (check) check.disabled = true;

        fb.hidden = false;
        fb.className = `ex-feedback ${right ? 'good' : 'bad'}`;
        fb.textContent = right
          ? (item.explain ? `Boa! ${item.explain}` : 'Boa! 🎉')
          : `Resposta: "${item.correct}".${item.explain ? ' ' + item.explain : ''}`;
        next.hidden = false;
        next.focus();
      }

      container.querySelectorAll('.ex-option').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          resolve(item.options[Number(btn.dataset.opt)] === item.correct, btn);
        });
      });
      const check = container.querySelector('[data-action="check"]');
      if (check) {
        const input = container.querySelector('#exgInput');
        const submit = () => resolve(exCheckTyped(item, input.value), input);
        check.addEventListener('click', submit);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
        input.focus();
      }
      container.querySelector('#exgNext').addEventListener('click', () => {
        index++;
        if (index < deck.length) paint();
        else { stopAll(); endBanner(container, correct, deck.length, () => race(container, topics)); }
      });
      container.querySelector('[data-action="restart"]').addEventListener('click', () => race(container, topics));
    }
    paint();
  }

  // ---- 🔗 Match-up -------------------------------------------------------
  function match(container, topics) {
    const pairs = exPairPool(topics, 6);
    if (pairs.length < 3) { container.innerHTML = '<p class="quiz-empty">Sem pares para este jogo.</p>'; return; }
    let leftOrder = exShuffle(pairs), rightOrder = exShuffle(pairs);
    let picked = null, done = new Set(), tries = 0;

    function paint() {
      container.innerHTML = `
        ${head(`🔗 ${done.size}/${pairs.length} ligados`)}
        <div class="exg-match">
          <div class="exg-col">
            ${leftOrder.map((p, i) => `
              <button class="exg-cell ${done.has(p.left) ? 'done' : ''} ${picked === p.left ? 'picked' : ''}"
                      data-left="${i}" ${done.has(p.left) ? 'disabled' : ''}>${exEsc(p.left)}</button>`).join('')}
          </div>
          <div class="exg-col">
            ${rightOrder.map((p, i) => `
              <button class="exg-cell ${done.has(p.left) ? 'done' : ''}"
                      data-right="${i}" ${done.has(p.left) ? 'disabled' : ''}>${exEsc(p.right)}</button>`).join('')}
          </div>
        </div>`;

      container.querySelectorAll('[data-left]').forEach(btn => {
        btn.addEventListener('click', () => {
          picked = leftOrder[Number(btn.dataset.left)].left;
          paint();
        });
      });
      container.querySelectorAll('[data-right]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!picked) return;
          tries++;
          const target = rightOrder[Number(btn.dataset.right)];
          if (target.left === picked) {
            done.add(picked);
            picked = null;
            exPlayGood();
            exConfetti(btn);
            if (typeof awardProgress === 'function') awardProgress(4, 0);
            if (done.size === pairs.length) {
              endBanner(container, pairs.length, Math.max(tries, pairs.length), () => match(container, topics));
              return;
            }
          } else {
            exPlayBad();
            btn.classList.add('shake');
            picked = null;
            setTimeout(paint, 420);   // let the shake finish before repainting
            return;
          }
          paint();
        });
      });
      container.querySelector('[data-action="restart"]').addEventListener('click', () => match(container, topics));
    }
    paint();
  }

  // ---- 🧠 Memory ---------------------------------------------------------
  function memory(container, topics) {
    const pairs = exPairPool(topics, 6, 24);
    if (pairs.length < 3) { container.innerHTML = '<p class="quiz-empty">Sem pares para este jogo.</p>'; return; }
    const cards = exShuffle(pairs.flatMap((p, i) => ([
      { id: i, text: p.left }, { id: i, text: p.right },
    ])));
    const found = new Set();
    let open = [];
    let tries = 0;
    let busy = false;

    function paint() {
      container.innerHTML = `
        ${head(`🧠 ${found.size}/${pairs.length} pares · ${tries} tentativas`)}
        <div class="exg-mem">
          ${cards.map((c, i) => {
            const shown = found.has(c.id) || open.indexOf(i) !== -1;
            // The card cannot grow, so the type shrinks to whatever is on it.
            const size = !shown ? 'down' : c.text.length > 26 ? 'long' : c.text.length > 14 ? 'mid' : '';
            return `<button class="exg-card ${shown ? 'open' : ''} ${found.has(c.id) ? 'done' : ''} ${size}" data-card="${i}">
                      <span>${shown ? exEsc(c.text) : '?'}</span>
                    </button>`;
          }).join('')}
        </div>`;

      container.querySelectorAll('[data-card]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (busy) return;
          const i = Number(btn.dataset.card);
          if (found.has(cards[i].id) || open.indexOf(i) !== -1) return;
          open.push(i);
          if (open.length < 2) { paint(); return; }
          tries++;
          const [a, b] = open;
          // Two halves of the same pair — and not the very same card twice.
          const hit = cards[a].id === cards[b].id && cards[a].text !== cards[b].text;
          if (hit) {
            found.add(cards[a].id);
            open = [];
            exPlayGood();
            exConfetti(btn);          // before the repaint: this node is about to go
            if (typeof awardProgress === 'function') awardProgress(4, 0);
            if (found.size === pairs.length) {
              endBanner(container, pairs.length, Math.max(tries, pairs.length), () => memory(container, topics));
              return;
            }
            paint();
          } else {
            busy = true;
            exPlayBad();
            paint();                  // both faces stay up for a moment
            setTimeout(() => { open = []; busy = false; paint(); }, 850);
          }
        });
      });
      const restart = container.querySelector('[data-action="restart"]');
      if (restart) restart.addEventListener('click', () => memory(container, topics));
    }
    paint();
  }

  // ---- 🧩 Sentence Builder -----------------------------------------------
  function builder(container, topics) {
    const deck = exPool(topics, ['order'], 8);
    if (!deck.length) { container.innerHTML = '<p class="quiz-empty">Sem frases para este jogo.</p>'; return; }
    let index = 0, correct = 0;

    function paint() {
      const item = deck[index];

      // Token indexes, not the words themselves, so a sentence with "the"
      // twice still removes the tile the student actually tapped.
      const chosenIdx = [];
      function renderIdx() {
        container.innerHTML = `
          ${head(`🧩 ${index + 1}/${deck.length} · ${correct} certas`)}
          <div class="exg-builder">
            <p class="exg-topic">${exEsc(item.topic)}</p>
            <div class="exg-answer">${chosenIdx.length
              ? chosenIdx.map((tok, pos) => `<button class="exg-tile placed" data-remove="${pos}">${exEsc(item.tokens[tok])}</button>`).join('')
              : '<span class="exg-answer-empty">Toque nas palavras na ordem certa…</span>'}</div>
            <div class="exg-bank">
              ${item.tokens.map((t, i) => chosenIdx.indexOf(i) !== -1
                ? '' : `<button class="exg-tile" data-take="${i}">${exEsc(t)}</button>`).join('')}
            </div>
            <p class="ex-feedback" id="exgFb" hidden></p>
            <div class="game-btn-row ex-actions">
              <button class="game-btn secondary" data-action="clear">↩️ Limpar</button>
              <button class="btn btn-primary" data-action="check" ${chosenIdx.length === item.tokens.length ? '' : 'disabled'}>✔️ Checar</button>
            </div>
          </div>`;

        container.querySelectorAll('[data-take]').forEach(btn => {
          btn.addEventListener('click', () => { chosenIdx.push(Number(btn.dataset.take)); renderIdx(); });
        });
        container.querySelectorAll('[data-remove]').forEach(btn => {
          btn.addEventListener('click', () => { chosenIdx.splice(Number(btn.dataset.remove), 1); renderIdx(); });
        });
        container.querySelector('[data-action="clear"]').addEventListener('click', () => { chosenIdx.length = 0; renderIdx(); });
        container.querySelector('[data-action="restart"]').addEventListener('click', () => builder(container, topics));
        container.querySelector('[data-action="check"]').addEventListener('click', () => {
          const sentence = exJoinTokens(chosenIdx.map(i => item.tokens[i]));
          const right = exNorm(sentence) === exNorm(item.correct);
          const fb = container.querySelector('#exgFb');
          if (right) {
            correct++;
            exPlayGood();
            exConfetti(fb);
            if (typeof awardProgress === 'function') awardProgress(5, 0);
          } else exPlayBad();
          fb.hidden = false;
          fb.className = `ex-feedback ${right ? 'good' : 'bad'}`;
          fb.textContent = right ? `Perfeito! ${item.explain || ''}` : `Quase — a frase certa é: "${item.correct}"`;
          container.querySelectorAll('.exg-tile').forEach(b => { b.disabled = true; });
          container.querySelector('[data-action="check"]').outerHTML =
            `<button class="btn btn-primary" data-action="next">${index + 1 === deck.length ? 'Ver resultado →' : 'Próxima →'}</button>`;
          container.querySelector('[data-action="next"]').addEventListener('click', () => {
            index++;
            if (index < deck.length) paint();
            else endBanner(container, correct, deck.length, () => builder(container, topics));
          });
        });
      }
      renderIdx();
    }
    paint();
  }

  // ---- 🗂️ Sort It --------------------------------------------------------
  function sorting(container, topics) {
    const deck = exPool(topics, ['sort'], 10);
    if (!deck.length) { container.innerHTML = '<p class="quiz-empty">Sem itens para este jogo.</p>'; return; }
    let index = 0, correct = 0;
    const sorted = {};

    function paint() {
      const item = deck[index];
      item.buckets.forEach(b => { sorted[b] = sorted[b] || []; });
      container.innerHTML = `
        ${head(`🗂️ ${index + 1}/${deck.length} · ${correct} certas`)}
        <div class="exg-sort">
          <p class="exg-topic">${exEsc(item.topic)}</p>
          <p class="ex-prompt">${exEsc(item.prompt)}</p>
          <div class="exg-buckets">
            ${item.buckets.map(b => `<button class="exg-bucket" data-bucket="${exEsc(b)}">${exEsc(b)}</button>`).join('')}
          </div>
          <p class="ex-feedback" id="exgFb" hidden></p>
          <div class="exg-piles">
            ${item.buckets.map(b => `
              <div class="exg-pile"><h4>${exEsc(b)}</h4>
                <ul>${(sorted[b] || []).slice(-6).map(t => `<li>${exEsc(t)}</li>`).join('')}</ul>
              </div>`).join('')}
          </div>
        </div>`;

      container.querySelectorAll('[data-bucket]').forEach(btn => {
        btn.addEventListener('click', () => {
          const right = btn.dataset.bucket === item.correct;
          const fb = container.querySelector('#exgFb');
          if (right) {
            correct++;
            (sorted[item.correct] = sorted[item.correct] || []).push(item.prompt);
            exPlayGood();
            exConfetti(btn);
            if (typeof awardProgress === 'function') awardProgress(3, 0);
            index++;
            if (index >= deck.length) { endBanner(container, correct, deck.length, () => sorting(container, topics)); return; }
            paint();
          } else {
            exPlayBad();
            btn.classList.add('shake');
            setTimeout(() => btn.classList.remove('shake'), 400);
            fb.hidden = false;
            fb.className = 'ex-feedback bad';
            fb.textContent = item.explain ? `Não é aí. ${item.explain}` : 'Tente o outro grupo.';
          }
        });
      });
      container.querySelector('[data-action="restart"]').addEventListener('click', () => sorting(container, topics));
    }
    paint();
  }

  const RUNNERS = { race, match, memory, builder, sorting };

  function mount(type, topics) {
    stopAll();
    if (!mountEl) return;
    const clean = mountEl.cloneNode(false);
    mountEl.replaceWith(clean);
    mountEl = clean;
    (RUNNERS[type] || race)(mountEl, topics);
  }

  function open(exam) {
    const topics = exTopicsOf(exam);
    if (!topics.length) { alert('Esta prova não tem tópicos para treinar.'); return; }
    const available = TYPES.filter(t => t.can(topics));
    if (!available.length) { alert('Estes tópicos ainda não têm jogos.'); return; }
    let active = available[0].id;

    openModal(`
      <div class="modal-content-pad exam-games">
        <h3 id="modalTitle">🎮 Treinar jogando — ${exEsc(exam.title)}</h3>
        <p class="exam-games-sub">${exam.topicLabels.map(exEsc).join(' · ')} — as perguntas são novas a cada partida.</p>
        <div class="game-picker" id="examGamePicker">
          ${available.map(t => `<button class="game-pick-btn ${t.id === active ? 'active' : ''}" data-game="${t.id}">${t.icon} ${t.label}</button>`).join('')}
        </div>
        <div class="game-mount" id="examGameMount"></div>
      </div>`, true);

    mountEl = document.getElementById('examGameMount');
    document.querySelectorAll('#examGamePicker .game-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        active = btn.dataset.game;
        document.querySelectorAll('#examGamePicker .game-pick-btn').forEach(b => b.classList.toggle('active', b === btn));
        mount(active, topics);
      });
    });
    mount(active, topics);
  }

  return { open, stopAll };
})();

function openExamGames(exam) { ExamGames.open(exam); }

// ---------------------------------------------------------------------------
// THE PAPER, DONE ON SCREEN
// Same questions, same order, same numbering as the printed test — so a
// student who practised here recognises the sheet the teacher hands out.
// ---------------------------------------------------------------------------
function openExamRunner(exam) {
  openModal(`
    <div class="modal-content-pad exam-runner">
      <h3 id="modalTitle">✍️ ${exEsc(exam.title)}</h3>
      <div id="examRunnerMount" class="game-mount"></div>
    </div>`, true);

  const mount = document.getElementById('examRunnerMount');
  const items = exam.items;
  let index = 0;
  let correct = 0;
  const answers = [];

  function paint() {
    const item = items[index];
    mount.innerHTML = `
      <div class="ex-shell">
        <div class="ex-head">
          <span class="ex-count">Questão ${index + 1} de ${items.length}</span>
          <span class="ex-score">${correct} certas</span>
        </div>
        <div class="ex-bar"><div class="ex-bar-fill" style="width:${(index / items.length) * 100}%"></div></div>
        <p class="exg-topic">${exEsc(item.topic)}</p>
        ${bodyHTML(item)}
        <p class="ex-feedback" id="exFb" hidden></p>
        <div class="game-btn-row ex-actions">
          <button class="btn btn-primary" id="exNext" hidden>
            ${index + 1 === items.length ? 'Ver resultado →' : 'Próxima →'}
          </button>
        </div>
      </div>`;
    bind(item);
  }

  function bodyHTML(item) {
    if (item.kind === 'mc') {
      return `
        <p class="ex-prompt">${exEsc(item.prompt)}</p>
        <div class="ex-options">
          ${item.options.map((o, i) => `<button class="ex-option" data-opt="${i}">${exEsc(o)}</button>`).join('')}
        </div>`;
    }
    if (item.kind === 'order') {
      return `
        <p class="ex-prompt">${exEsc(item.prompt)}</p>
        <p class="exam-tokens">${item.tokens.map(t => `<span>${exEsc(t)}</span>`).join('<i>/</i>')}</p>
        <div class="exg-type-row">
          <input type="text" class="exg-input" id="exInput" placeholder="Escreva a frase…" autocomplete="off" spellcheck="false" />
          <button class="game-btn" data-action="check">Checar</button>
        </div>`;
    }
    if (item.kind === 'sort') {
      return `
        <p class="ex-prompt">${exEsc(item.prompt)}</p>
        <div class="ex-options">
          ${item.buckets.map(b => `<button class="ex-option" data-bucket="${exEsc(b)}">${exEsc(b)}</button>`).join('')}
        </div>`;
    }
    return `
      <p class="ex-prompt">${exEsc(item.prompt)}</p>
      ${item.hint ? `<p class="exam-hint">💡 ${exEsc(item.hint)}</p>` : ''}
      <div class="exg-type-row">
        <input type="text" class="exg-input" id="exInput" placeholder="Escreva a resposta…" autocomplete="off" spellcheck="false" />
        <button class="game-btn" data-action="check">Checar</button>
      </div>`;
  }

  function bind(item) {
    const fb = mount.querySelector('#exFb');
    const next = mount.querySelector('#exNext');

    function resolve(right, given, el) {
      answers.push({ item, given, right });
      if (right) { correct++; exPlayGood(); exConfetti(el || fb); }
      else exPlayBad();

      mount.querySelectorAll('.ex-option').forEach(b => {
        b.disabled = true;
        const value = b.dataset.bucket != null ? b.dataset.bucket : item.options[Number(b.dataset.opt)];
        if (value === item.correct) b.classList.add('correct');
      });
      if (!right && el && el.classList && el.classList.contains('ex-option')) el.classList.add('wrong');
      const input = mount.querySelector('#exInput');
      if (input) { input.disabled = true; input.classList.add(right ? 'ok' : 'no'); }
      const check = mount.querySelector('[data-action="check"]');
      if (check) check.disabled = true;

      fb.hidden = false;
      fb.className = `ex-feedback ${right ? 'good' : 'bad'}`;
      fb.textContent = right
        ? (item.explain ? `Certo! ${item.explain}` : 'Certo! 🎉')
        : `A resposta é "${item.correct}".${item.explain ? ' ' + item.explain : ''}`;
      next.hidden = false;
      next.focus();
    }

    mount.querySelectorAll('.ex-option[data-opt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = item.options[Number(btn.dataset.opt)];
        resolve(value === item.correct, value, btn);
      });
    });
    mount.querySelectorAll('.ex-option[data-bucket]').forEach(btn => {
      btn.addEventListener('click', () => resolve(btn.dataset.bucket === item.correct, btn.dataset.bucket, btn));
    });
    const check = mount.querySelector('[data-action="check"]');
    if (check) {
      const input = mount.querySelector('#exInput');
      const submit = () => {
        const value = input.value;
        const right = item.kind === 'order'
          ? exNorm(value) === exNorm(item.correct)
          : exCheckTyped(item, value);
        resolve(right, value, input);
      };
      check.addEventListener('click', submit);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
      input.focus();
    }

    next.addEventListener('click', () => {
      index++;
      if (index < items.length) paint();
      else result();
    });
  }

  function result() {
    const pct = Math.round((correct / items.length) * 100);
    const stars = exStarsFor(correct, items.length);
    const wrong = answers.filter(a => !a.right);
    if (typeof awardProgress === 'function') awardProgress(correct * 5, stars);
    exPlayWin();

    mount.innerHTML = `
      <div class="ex-shell">
        <div class="ex-result ${pct >= 70 ? 'good' : ''}">
          <span class="ex-result-emoji">${pct === 100 ? '🏆' : pct >= 70 ? '🎉' : '💪'}</span>
          <h3>${correct} / ${items.length}</h3>
          <p>${pct === 100 ? 'Gabaritou! Está pronto para a prova.'
            : pct >= 70 ? 'Muito bem — falta pouco.'
            : 'Vale treinar mais um pouco antes da prova.'}</p>
          <p class="ex-stars">${'⭐'.repeat(stars)} <span>+${correct * 5} XP</span></p>
        </div>
        ${wrong.length ? `
          <div class="ex-review">
            <h4 class="watch-h">📌 Rever estas</h4>
            ${wrong.map(a => `
              <div class="ex-review-item">
                <p class="ex-review-q">${a.item.n}. ${exEsc(a.item.prompt)}</p>
                <p class="ex-review-a"><span class="bad">${exEsc(a.given || '—')}</span> → <span class="good">${exEsc(a.item.correct)}</span></p>
                ${a.item.explain ? `<p class="ex-review-why">${exEsc(a.item.explain)}</p>` : ''}
              </div>`).join('')}
          </div>` : ''}
        <div class="game-btn-row ex-actions">
          <button class="btn btn-ghost" id="exToGames">🎮 Treinar jogando</button>
          <button class="btn btn-primary" id="exRetry">🔄 Refazer</button>
        </div>
      </div>`;
    exConfetti(mount.querySelector('.ex-result'));
    mount.querySelector('#exRetry').addEventListener('click', () => {
      index = 0; correct = 0; answers.length = 0; paint();
    });
    mount.querySelector('#exToGames').addEventListener('click', () => openExamGames(exam));
  }

  paint();
}

// ---------------------------------------------------------------------------
// PAGE INIT
// ---------------------------------------------------------------------------
renderExamMaker(document.getElementById('examMakerRoot'));
