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

(function addBookUnits() {
  if (typeof LEVELS === 'undefined') return;
  Object.entries(BOOK_UNITS).forEach(([levelId, topics]) => {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) return;
    topics.forEach(t => { if (!level.topics.some(x => x.id === t.id)) level.topics.unshift({ ...t }); });
  });
})();
