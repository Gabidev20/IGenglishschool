/* ==========================================================================
   IGenglishschool — Units that follow the teacher's coursebooks
   --------------------------------------------------------------------------
   One topic per coursebook unit, built from the unit's SCOPE (vocabulary,
   grammar, sounds), never from its pages: the texts, sentences, quiz and
   games here are the site's own, so nothing of the book is reproduced.
   The book itself stays in the publisher's app; these topics are the extra
   practice — in class on a shared screen and at home on the student's link.

   Same schema as topicsData.js. `book` labels the topic with the book and
   unit so the teacher can find it. Loaded after topicsData.js and before
   contentStore.js.
   ========================================================================== */

const BOOK_UNITS = {
  a0: [
    {
      id: 'book-eow1-u4-house',
      book: 'Explore Our World 1 · Unit 4',
      title: 'My House (Unit 4)',
      emoji: '🏠',
      cefr: 'A0',
      description: 'Livro — Unit 4: rooms, "Is there…?", "He’s / She’s + -ing" and the /l/ sound',
      grammarTip: "Three small things this unit: (1) the rooms — \"It's a kitchen.\"; (2) asking about a room — \"Is there a sofa?\" — \"Yes, there is.\" / \"No, there isn't.\"; (3) what someone is doing now — \"She's sleeping.\" \"He's cooking.\" (she is / he is + -ing). Sound to practise: the L at the start — Living room, Lamp, Look, Live — tongue up behind the top teeth.",
      words: [
        { id: 'bedroom', en: 'bedroom', pt: 'quarto', emoji: '🛏️' },
        { id: 'bathroom', en: 'bathroom', pt: 'banheiro', emoji: '🛁' },
        { id: 'kitchen', en: 'kitchen', pt: 'cozinha', emoji: '🍳' },
        { id: 'livingroom', en: 'living room', pt: 'sala de estar', emoji: '🛋️' },
        { id: 'diningroom', en: 'dining room', pt: 'sala de jantar', emoji: '🍽️' },
        { id: 'lamp', en: 'lamp', pt: 'abajur / luminária', emoji: '💡' },
        { id: 'sofa', en: 'sofa', pt: 'sofá', emoji: '🛋️' },
        { id: 'sleeping', en: 'sleeping', pt: 'dormindo', emoji: '😴' },
        { id: 'cleaning', en: 'cleaning', pt: 'limpando', emoji: '🧹' },
        { id: 'cooking', en: 'cooking', pt: 'cozinhando', emoji: '👩‍🍳' },
        { id: 'takingabath', en: 'taking a bath', pt: 'tomando banho', emoji: '🛀' },
        { id: 'eating', en: 'eating', pt: 'comendo', emoji: '🍔' },
        { id: 'watchingtv', en: 'watching TV', pt: 'vendo TV', emoji: '📺' },
        { id: 'house', en: 'house', pt: 'casa', emoji: '🏡' },
        { id: 'apartment', en: 'apartment', pt: 'apartamento', emoji: '🏢' },
      ],
      // Short, one idea each: a four-year-old says them, hears them in the
      // dictation and rebuilds them in Unscramble.
      practiceSentences: [
        "It's a kitchen",
        "It's a big bedroom",
        'Is there a sofa',
        'Yes, there is',
        "No, there isn't",
        "She's sleeping",
        "He's cooking",
        "She's eating",
        "He's watching TV",
        'I live in a house',
        'Look at the lamp',
        'The lamp is yellow',
      ],
      readingTime: {
        text: "This is Lily's house.\nThe house is yellow.\nLily is in the bedroom. She's sleeping.\nDad is in the kitchen. He's cooking.\nIs there a lamp in the living room? Yes, there is!",
        questions: [
          { prompt: 'Where is Lily?', options: ['In the bedroom', 'In the kitchen', 'In the bathroom'], correct: 'In the bedroom' },
          { prompt: 'What is Dad doing?', options: ["He's cooking", "He's sleeping", "He's watching TV"], correct: "He's cooking" },
        ],
      },
      quiz: [
        { prompt: '🛏️ What room is it?', options: ['bedroom', 'kitchen', 'bathroom'], correct: 'bedroom', explain: "It's a bedroom." },
        { prompt: '🍳 What room is it?', options: ['living room', 'kitchen', 'dining room'], correct: 'kitchen', explain: "It's a kitchen." },
        { prompt: '🛁 What room is it?', options: ['bathroom', 'bedroom', 'kitchen'], correct: 'bathroom', explain: "It's a bathroom." },
        { prompt: '😴 What is she doing?', options: ["She's sleeping.", "She's eating.", "She's cooking."], correct: "She's sleeping." },
        { prompt: '👩‍🍳 What is he doing?', options: ["He's cooking.", "He's cleaning.", "He's sleeping."], correct: "He's cooking." },
        { prompt: '📺 What is he doing?', options: ["He's watching TV.", "He's taking a bath.", "He's eating."], correct: "He's watching TV." },
        { prompt: 'Is there a sofa? 🛋️ ✅', options: ['Yes, there is.', "No, there isn't."], correct: 'Yes, there is.', explain: '✅ = Yes, there is.' },
        { prompt: 'Is there a lamp? 💡 ❌', options: ['Yes, there is.', "No, there isn't."], correct: "No, there isn't.", explain: "❌ = No, there isn't." },
        { prompt: 'Where do you live? 🏡', options: ['I live in a house.', "It's a lamp.", "She's eating."], correct: 'I live in a house.' },
      ],
      // Sort It: what are you doing in each room? Joins both word sets.
      sort: {
        prompt: 'Which room? Qual cômodo?',
        buckets: ['bedroom', 'kitchen', 'bathroom', 'living room'],
        items: [
          { text: 'sleeping 😴', bucket: 'bedroom' },
          { text: 'cooking 👩‍🍳', bucket: 'kitchen' },
          { text: 'taking a bath 🛀', bucket: 'bathroom' },
          { text: 'watching TV 📺', bucket: 'living room' },
          { text: 'bed 🛏️', bucket: 'bedroom' },
          { text: 'stove 🍳', bucket: 'kitchen' },
          { text: 'bathtub 🛁', bucket: 'bathroom' },
          { text: 'sofa 🛋️', bucket: 'living room' },
        ],
      },
      writingPrompt: { prompt: 'Draw your house and say the rooms: "It\'s a kitchen…"', help: ["It's a…", 'Is there a…?', "She's / He's …ing."], words: 6 },
      video: { youtubeId: '07s34vmrq_M', title: 'My Home for Kids | Rooms and Furniture Vocabulary in English', channel: 'Myclass Yourclass' },
    },
  ],
};

BOOK_UNITS.a1 = [
  {
    id: 'book-tz1-u3-lion',
    book: 'Time Zones 1 · Unit 3',
    title: "Where's the Lion? (Unit 3)",
    emoji: '🦁',
    cefr: 'A1',
    description: 'Livro — Unit 3: animals on land and in the water, There is / There are, Where’s / Where are, prepositions',
    grammarTip: "How many…? → \"There's one lion.\" / \"There are twenty animals.\" (one = there's · two or more = there are). Where…? → \"Where's the frog?\" \"It's on the rock.\" / \"Where are the monkeys?\" \"They're in front of the tree.\" Yes/No → \"Is the lion on the rock? — Yes, it is. / No, it isn't.\" · \"Are the fish in the water? — Yes, they are. / No, they aren't.\" Place words: in, on, under, next to, near, behind, in front of — and for a picture: on the left, in the middle, on the right. Pronunciation: THEY'RE is one sound, like \"there\" (They're behind the tree). THERE ARE is two words — you hear the R of \"are\" (There are two lions).",
    words: [
      { id: 'lion', en: 'lion', pt: 'leão', emoji: '🦁' },
      { id: 'monkey', en: 'monkey', pt: 'macaco', emoji: '🐒' },
      { id: 'bear', en: 'bear', pt: 'urso', emoji: '🐻' },
      { id: 'giraffe', en: 'giraffe', pt: 'girafa', emoji: '🦒' },
      { id: 'elephant', en: 'elephant', pt: 'elefante', emoji: '🐘' },
      { id: 'hippo', en: 'hippo', pt: 'hipopótamo', emoji: '🦛' },
      { id: 'frog', en: 'frog', pt: 'sapo', emoji: '🐸' },
      { id: 'dolphin', en: 'dolphin', pt: 'golfinho', emoji: '🐬' },
      { id: 'shark', en: 'shark', pt: 'tubarão', emoji: '🦈' },
      { id: 'fish', en: 'fish', pt: 'peixe', emoji: '🐟' },
      { id: 'penguin', en: 'penguin', pt: 'pinguim', emoji: '🐧' },
      { id: 'seal', en: 'seal', pt: 'foca', emoji: '🦭' },
      { id: 'owl', en: 'owl', pt: 'coruja', emoji: '🦉' },
      { id: 'rock', en: 'rock', pt: 'pedra', emoji: '🪨' },
      { id: 'tree', en: 'tree', pt: 'árvore', emoji: '🌳' },
      { id: 'seaweed', en: 'seaweed', pt: 'alga marinha', emoji: '🌿' },
      { id: 'leaves', en: 'leaves', pt: 'folhas', emoji: '🍃' },
      { id: 'hide', en: 'hide', pt: 'esconder(-se)', emoji: '🫣' },
      { id: 'in', en: 'in', pt: 'dentro de', emoji: '📦' },
      { id: 'on', en: 'on', pt: 'em cima de', emoji: '⬆️' },
      { id: 'under', en: 'under', pt: 'embaixo de', emoji: '⬇️' },
      { id: 'nextto', en: 'next to', pt: 'ao lado de', emoji: '↔️' },
      { id: 'behind', en: 'behind', pt: 'atrás de', emoji: '🙈' },
      { id: 'infrontof', en: 'in front of', pt: 'na frente de', emoji: '👀' },
      { id: 'fast', en: 'fast', pt: 'rápido', emoji: '🐆' },
      { id: 'slow', en: 'slow', pt: 'lento', emoji: '🐢' },
      { id: 'clever', en: 'clever', pt: 'esperto', emoji: '🤓' },
      { id: 'dangerous', en: 'dangerous', pt: 'perigoso', emoji: '⚠️' },
      { id: 'noisy', en: 'noisy', pt: 'barulhento', emoji: '📢' },
      { id: 'quiet', en: 'quiet', pt: 'quieto', emoji: '🤫' },
    ],
    // The is / are cards build the gap-fill questions and the Watch tab.
    rules: [
      {
        label: 'One animal: is', form: 'is', hint: "There's = there is. Where's = where is. One thing → is.",
        examples: ['There is one lion near the tree.', 'Where is the frog?', 'The monkey is behind the elephant.', 'Is the lion on the rock?'],
      },
      {
        label: 'Two or more: are', form: 'are', hint: 'Two or more things → are. They’re = they are.',
        examples: ['There are three giraffes.', 'Where are the monkeys?', 'The fish are in the water.', 'Are the bears near the tree?'],
      },
    ],
    // Sort It: the unit goal — animals on land and in the water.
    sort: {
      prompt: 'Where do they live? Onde eles vivem?',
      buckets: ['on land', 'in the water', 'both'],
      items: [
        { text: 'lion 🦁', bucket: 'on land' },
        { text: 'giraffe 🦒', bucket: 'on land' },
        { text: 'monkey 🐒', bucket: 'on land' },
        { text: 'elephant 🐘', bucket: 'on land' },
        { text: 'owl 🦉', bucket: 'on land' },
        { text: 'shark 🦈', bucket: 'in the water' },
        { text: 'dolphin 🐬', bucket: 'in the water' },
        { text: 'fish 🐟', bucket: 'in the water' },
        { text: 'frog 🐸', bucket: 'both' },
        { text: 'hippo 🦛', bucket: 'both' },
        { text: 'penguin 🐧', bucket: 'both' },
        { text: 'seal 🦭', bucket: 'both' },
      ],
    },
    practiceSentences: [
      "There's one lion near the tree",
      'There are two giraffes',
      'How many monkeys are there',
      "Where's the frog",
      "It's on the rock",
      'Where are the monkeys',
      "They're in front of the tree",
      'Is the lion on the rock',
      "No, it isn't",
      'Are the fish in the water',
      'Yes, they are',
      'The bear is next to the river',
      'On the left, there is a hippo',
      'In the middle, there are three elephants',
      'The owl hides in the tree',
      'Dolphins are clever and noisy',
    ],
    readingTime: {
      text: "Some animals are very good at hiding.\nThe frog is green. It hides on a green leaf.\nThe owl is brown. It hides in a brown tree.\nThere are many fish near the seaweed. They're the same color as the seaweed!\nAnd the lion? It's behind the tall grass. Can you see it?",
      questions: [
        { prompt: 'Where does the owl hide?', options: ['In a tree', 'In the water', 'Under a rock'], correct: 'In a tree' },
        { prompt: 'Why is it hard to see the fish?', options: ["They're the same color as the seaweed", "They're very fast", "They're under the sand"], correct: "They're the same color as the seaweed" },
      ],
    },
    quiz: [
      { prompt: '🐒 🐒 🐒 — How many monkeys are there?', options: ['There are three monkeys.', "There's three monkeys.", 'There are three monkey.'], correct: 'There are three monkeys.', explain: 'Two or more → there are + monkeys (plural).' },
      { prompt: '🦁 — How many lions are there?', options: ["There's one lion.", 'There are one lion.', 'There is one lions.'], correct: "There's one lion.", explain: "One → there's (there is)." },
      { prompt: 'The fish are ___ the water. 🐟🌊', options: ['in', 'on', 'under'], correct: 'in', explain: 'Inside the water → in.' },
      { prompt: 'The frog is ___ the rock. 🐸 (on top) 🪨', options: ['on', 'under', 'behind'], correct: 'on' },
      { prompt: '___ the lion on the rock? — Yes, it is.', options: ['Is', 'Are', 'Am'], correct: 'Is', explain: 'One lion → Is…? — Yes, it is.' },
      { prompt: '___ the fish in the water? — Yes, they are.', options: ['Are', 'Is', 'Does'], correct: 'Are', explain: 'Fish (many) → Are…? — Yes, they are.' },
      { prompt: 'Where ___ the monkeys?', options: ['are', 'is', 'am'], correct: 'are' },
      { prompt: 'There are many penguins. ___ on the ice.', options: ["They're", 'There are', "There's"], correct: "They're", explain: "They're = they are: it tells WHERE the penguins are." },
      { prompt: 'Which one is correct?', options: ["They're behind the tree.", 'There behind the tree.', 'Their behind the tree.'], correct: "They're behind the tree." },
      { prompt: 'The owl is the same color as the tree. It can ___ .', options: ['hide', 'swim', 'run'], correct: 'hide' },
      { prompt: 'Dolphins can learn tricks. They are very ___ .', options: ['clever', 'slow', 'quiet'], correct: 'clever' },
      { prompt: 'Sharks have big teeth. They are ___ .', options: ['dangerous', 'slow', 'quiet'], correct: 'dangerous' },
    ],
    writingPrompt: {
      prompt: 'Describe a picture of a park, a zoo or your bedroom. Say how many things there are and where they are (on the left, in the middle, on the right).',
      help: ['There is a… / There are…', "It's next to / behind / in front of…", 'On the left, there is…', 'In the middle, there are…'],
      words: 40,
    },
    video: { youtubeId: 'GgZ2_DvEdr8', title: 'Prepositions of Place | in, on, under, behind, between, etc', channel: 'LucyMax English' },
  },
];

(function addBookUnits() {
  if (typeof LEVELS === 'undefined') return;
  Object.entries(BOOK_UNITS).forEach(([levelId, topics]) => {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) return;
    topics.forEach(t => { if (!level.topics.some(x => x.id === t.id)) level.topics.unshift({ ...t }); });
  });
})();
