/* ==========================================================================
   IGenglishschool — Easy content for young learners
   The student page's Practice, Dictation and Speaking used the general
   exam bank (ordinal numbers, past simple…), far too hard for a six-year-
   old. Kids and juniors get this instead: animals, colours, shapes,
   numbers, the house, and very short sentences with the verb to be.

   The topics are added to EXAM_TOPICS in the same shape as the others, so
   every practice game (Quiz Race, Match-up, Memory, Sentence Builder,
   Sort It) and the teacher's test maker can use them too.
   Loaded after examMaker.js.
   ========================================================================== */

// [en, pt, emoji]
const KID_VOCAB = {
  animals: [
    ['cat', 'gato', '🐱'], ['dog', 'cachorro', '🐶'], ['fish', 'peixe', '🐟'], ['bird', 'pássaro', '🐦'],
    ['lion', 'leão', '🦁'], ['tiger', 'tigre', '🐯'], ['elephant', 'elefante', '🐘'], ['monkey', 'macaco', '🐵'],
    ['frog', 'sapo', '🐸'], ['rabbit', 'coelho', '🐰'], ['horse', 'cavalo', '🐴'], ['cow', 'vaca', '🐮'],
    ['pig', 'porco', '🐷'], ['duck', 'pato', '🦆'], ['bear', 'urso', '🐻'], ['penguin', 'pinguim', '🐧'],
    ['turtle', 'tartaruga', '🐢'], ['snake', 'cobra', '🐍'], ['giraffe', 'girafa', '🦒'], ['panda', 'panda', '🐼'],
  ],
  colors: [
    ['red', 'vermelho', '🔴'], ['blue', 'azul', '🔵'], ['green', 'verde', '🟢'], ['yellow', 'amarelo', '🟡'],
    ['orange', 'laranja', '🟠'], ['purple', 'roxo', '🟣'], ['pink', 'rosa', '🩷'], ['black', 'preto', '⚫'],
    ['white', 'branco', '⚪'], ['brown', 'marrom', '🟤'],
  ],
  shapes: [
    ['circle', 'círculo', '⭕'], ['square', 'quadrado', '🟥'], ['triangle', 'triângulo', '🔺'], ['star', 'estrela', '⭐'],
    ['heart', 'coração', '❤️'], ['diamond', 'losango', '🔷'], ['rectangle', 'retângulo', '▬'], ['oval', 'oval', '🥚'],
  ],
  numbers: [
    ['one', 'um', '1️⃣'], ['two', 'dois', '2️⃣'], ['three', 'três', '3️⃣'], ['four', 'quatro', '4️⃣'],
    ['five', 'cinco', '5️⃣'], ['six', 'seis', '6️⃣'], ['seven', 'sete', '7️⃣'], ['eight', 'oito', '8️⃣'],
    ['nine', 'nove', '9️⃣'], ['ten', 'dez', '🔟'],
  ],
  house: [
    ['bedroom', 'quarto', '🛏️'], ['bathroom', 'banheiro', '🛁'], ['kitchen', 'cozinha', '🍳'],
    ['living room', 'sala de estar', '🛋️'], ['dining room', 'sala de jantar', '🍽️'], ['yard', 'quintal', '🌳'],
    ['bed', 'cama', '🛏️'], ['sofa', 'sofá', '🛋️'], ['chair', 'cadeira', '🪑'], ['door', 'porta', '🚪'],
    ['window', 'janela', '🪟'], ['TV', 'televisão', '📺'], ['lamp', 'abajur', '💡'], ['clock', 'relógio', '⏰'],
    ['toilet', 'vaso sanitário', '🚽'], ['shower', 'chuveiro', '🚿'],
  ],
};

// The verb to be, the way a young learner meets it.
const KID_BE = [
  { s: 'I', v: 'am', c: ['happy', 'six years old', 'at school', 'hungry', 'a student', 'tired'] },
  { s: 'You', v: 'are', c: ['my friend', 'happy', 'tall', 'funny'] },
  { s: 'He', v: 'is', c: ['my brother', 'happy', 'tall', 'sad', 'my dad'] },
  { s: 'She', v: 'is', c: ['my sister', 'happy', 'my teacher', 'my mom', 'small'] },
  { s: 'It', v: 'is', c: ['a cat', 'a dog', 'red', 'big', 'small', 'a ball', 'sunny'] },
  { s: 'We', v: 'are', c: ['friends', 'at home', 'happy'] },
  { s: 'They', v: 'are', c: ['my friends', 'dogs', 'cats', 'happy', 'red'] },
];
const kidBeSentence = (row, c) => `${row.s} ${row.v} ${c}.`;

// Short sentences for Dictation and Speaking: the verb to be, and the
// vocabulary above in "It is a cat." / "The ball is red." shapes.
function kidSentences(n) {
  const out = new Set();
  KID_BE.forEach(row => row.c.forEach(c => out.add(kidBeSentence(row, c))));
  KID_VOCAB.animals.slice(0, 12).forEach(([w]) => out.add(`It is ${/^[aeiou]/.test(w) ? 'an' : 'a'} ${w}.`));
  KID_VOCAB.colors.slice(0, 8).forEach(([w]) => out.add(`The ball is ${w}.`));
  KID_VOCAB.shapes.slice(0, 5).forEach(([w]) => out.add(`It is a ${w}.`));
  ['two cats', 'three dogs', 'four birds', 'five fish'].forEach(x => out.add(`They are ${x}.`));
  ['bedroom', 'kitchen', 'bathroom', 'living room'].forEach(r => out.add(`I am in the ${r}.`));
  return exShuffle([...out]).slice(0, n || 8);
}

// The easy content is for readers (profiles.js): the youngest who can't
// read yet get picture games instead, and the older ones practise writing.
function igIsEasyLevel(student) {
  if (!student) return false;
  if (typeof studentProfile === 'function') return studentProfile(student) === 'reader';
  return Number(student.age) > 0 && Number(student.age) <= 9;
}

// ---------------------------------------------------------------------------
// Exam-style topics (the practice games read these)
// ---------------------------------------------------------------------------
function kidVocabTopic(id, label, pt, list, question) {
  return {
    id, label, pt, kids: true,
    aliases: [label.toLowerCase(), pt.toLowerCase()],
    gens: [
      // "What is this? 🐱" → cat
      () => {
        const [w, , e] = exPick(list);
        return exMC(`${question} ${e}`, w, exPickN(list.filter(x => x[0] !== w), 3).map(x => x[0]));
      },
      // "Which one is the cat?" → 🐱
      () => {
        const [w, , e] = exPick(list);
        return exMC(`Which one is "${w}"?`, e, exPickN(list.filter(x => x[0] !== w), 3).map(x => x[2]));
      },
      // "gato" → cat
      () => {
        const [w, p] = exPick(list);
        return exMC(`How do you say "${p}" in English?`, w, exPickN(list.filter(x => x[0] !== w), 3).map(x => x[0]));
      },
    ],
    pairs: () => exPickN(list, 6).map(([w, , e]) => ({ left: e, right: w })),
    words: () => list.map(([w, p, e]) => ({ id: `${id}_${w}`, en: w, pt: p, emoji: e })),
  };
}

const KID_TOPICS = [
  kidVocabTopic('kids-animals', 'Animals', 'Animais', KID_VOCAB.animals, 'What animal is this?'),
  kidVocabTopic('kids-colors', 'Colors', 'Cores', KID_VOCAB.colors, 'What color is this?'),
  kidVocabTopic('kids-shapes', 'Shapes', 'Formas', KID_VOCAB.shapes, 'What shape is this?'),
  kidVocabTopic('kids-numbers', 'Numbers 1–10', 'Números', KID_VOCAB.numbers, 'What number is this?'),
  kidVocabTopic('kids-house', 'Parts of the house', 'Partes da casa', KID_VOCAB.house, 'What is this?'),
  {
    id: 'kids-tobe', label: 'Verb to be (I am, she is…)', pt: 'Verbo to be', kids: true,
    aliases: ['verb to be', 'to be', 'verbo to be', 'am is are'],
    gens: [
      // "She ___ happy." → is
      () => {
        const row = exPick(KID_BE);
        return exMC(`${row.s} ___ ${exPick(row.c)}.`, row.v, ['am', 'is', 'are'].filter(v => v !== row.v));
      },
      () => {
        const row = exPick(KID_BE);
        const c = exPick(row.c);
        return exSort(`${row.s} ____ ${c}.`, row.v, ['am', 'is', 'are']);
      },
      () => {
        const row = exPick(KID_BE);
        return exOrder(kidBeSentence(row, exPick(row.c)));
      },
    ],
    pairs: () => exPickN(KID_BE, 6).map(row => ({ left: row.s, right: row.v })),
  },
];

if (typeof EXAM_TOPICS !== 'undefined') {
  KID_TOPICS.forEach(t => { if (!EXAM_TOPICS.some(x => x.id === t.id)) EXAM_TOPICS.push(t); });
}

// The Practice tile for a young learner.
function openKidsPractice() {
  openExamGames({
    id: 'kids', title: 'Practice · Treinar',
    topicIds: KID_TOPICS.map(t => t.id), topicLabels: KID_TOPICS.map(t => t.label),
    createdAt: new Date().toISOString(), count: 0, parts: [], items: [],
  });
}
