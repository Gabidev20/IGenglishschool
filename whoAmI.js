/* ==========================================================================
   IGenglishschool — Who am I?
   --------------------------------------------------------------------------
   A class guessing game for 2 or more players (or teams).

     🙈 Hot seat  one player does not look; the rest of the class sees the
                  character. The player asks yes/no questions ("Am I an
                  animal?") and the class answers with the model answer
                  ("Yes, you are."). Fewer questions = more points.
     🕵️ Clues     nobody sees the character. The teacher reveals "I…" clues
                  one at a time (and the students may ask "Are you…?"
                  questions). Whoever guesses first scores — the earlier the
                  clue, the more points.

   Ready-made decks (characters + clues + model questions) come built in;
   the teacher can copy any of them, or make her own with the characters she
   wants. Her decks live in IGStore ('whoami_decks') so they sync to the
   cloud with everything else.

   Questions are written from the guesser's side ("Am I…?", "Do I…?"). In
   Clues mode they are turned around automatically ("Are you…?").
   ========================================================================== */

const WAI_DECKS_KEY = 'whoami_decks';
const WAI_SETUP_KEY = 'whoami_setup';

// ---------------------------------------------------------------------------
// MODEL QUESTIONS — one set per kind of deck
// ---------------------------------------------------------------------------
const WAI_QUESTIONS = {
  animal: [
    'Am I big?', 'Am I small?', 'Am I a pet?', 'Am I a wild animal?', 'Am I a farm animal?',
    'Can I fly?', 'Can I swim?', 'Can I jump?', 'Can I climb trees?', 'Do I live in the water?',
    'Do I live in the jungle?', 'Do I live on a farm?', 'Do I have four legs?', 'Do I have a long tail?',
    'Do I have wings?', 'Do I have fur?', 'Do I have stripes?', 'Do I eat meat?', 'Do I eat plants?',
    'Am I brown?', 'Am I grey?', 'Am I dangerous?',
  ],
  job: [
    'Do I work in a hospital?', 'Do I work in a school?', 'Do I work outside?', 'Do I work in an office?',
    'Do I wear a uniform?', 'Do I help people?', 'Do I help animals?', 'Do I drive a vehicle?',
    'Do I use a computer?', 'Do I work with food?', 'Do I work at night?', 'Do I travel a lot?',
    'Is my job dangerous?', 'Do I need to study a lot?', 'Do I work with children?', 'Am I famous?',
  ],
  food: [
    'Am I a fruit?', 'Am I a vegetable?', 'Am I sweet?', 'Am I salty?', 'Am I hot?', 'Am I cold?',
    'Am I red?', 'Am I yellow?', 'Am I green?', 'Am I healthy?', 'Do I grow on a tree?',
    'Do people eat me for breakfast?', 'Do people cook me?', 'Am I a dessert?', 'Am I a drink?',
    'Am I round?', 'Am I made with milk?',
  ],
  person: [
    'Am I a man?', 'Am I a woman?', 'Am I a child?', 'Am I real?', 'Am I alive?', 'Am I famous?',
    'Am I from a story?', 'Am I a cartoon?', 'Am I good?', 'Am I bad?', 'Can I fly?', 'Can I do magic?',
    'Do I live in a castle?', 'Do I live in the forest?', 'Do I have a special object?', 'Am I an animal?',
    'Am I tall?', 'Do I wear a hat?',
  ],
  famous: [
    'Am I a man?', 'Am I a woman?', 'Am I alive?', 'Am I Brazilian?', 'Am I American?', 'Am I European?',
    'Was I born before 1900?', 'Am I a scientist?', 'Am I an artist?', 'Am I a musician?', 'Am I an athlete?',
    'Am I a politician?', 'Am I a writer?', 'Am I an actor?', 'Did I win a famous prize?',
    'Did I invent something?', 'Am I on TV?', 'Have I won a world championship?',
  ],
  thing: [
    'Am I big?', 'Am I small?', 'Am I in the kitchen?', 'Am I in the bedroom?', 'Am I in the classroom?',
    'Am I made of wood?', 'Am I made of plastic?', 'Am I made of metal?', 'Do I use electricity?',
    'Can you write with me?', 'Can you eat with me?', 'Can you play with me?', 'Do people use me every day?',
    'Am I soft?', 'Am I round?', 'Do I have buttons?',
  ],
  place: [
    'Am I a country?', 'Am I a city?', 'Am I in South America?', 'Am I in Europe?', 'Am I in Asia?',
    'Am I in Africa?', 'Am I in North America?', 'Am I near the sea?', 'Am I hot?', 'Am I cold?',
    'Do people speak English here?', 'Do people speak Spanish here?', 'Am I very big?',
    'Is my food famous?', 'Do I have a famous monument?', 'Is it a good place for a holiday?',
  ],
  general: [
    'Am I a person?', 'Am I an animal?', 'Am I a thing?', 'Am I real?', 'Am I big?', 'Am I small?',
    'Can I fly?', 'Can I swim?', 'Do I live in a house?', 'Am I famous?', 'Am I a man?', 'Am I a woman?',
    'Do people use me every day?', 'Am I in this room?', 'Am I colourful?',
  ],
};

// ---------------------------------------------------------------------------
// READY-MADE DECKS
// audience: 'kids' — hidden when teaching a grown-up · 'adult' · 'all'
// clues go from hardest to easiest (Clues mode reveals them in this order)
// ---------------------------------------------------------------------------
const WAI_BUILTIN = [
  {
    id: 'b-animals', name: 'Animals', emoji: '🦁', audience: 'all', qset: 'animal',
    characters: [
      { emoji: '🦁', name: 'a lion', clues: ['I live in Africa.', 'I eat meat and I sleep a lot.', 'I have a big mane. I\'m the king of the jungle!'] },
      { emoji: '🐘', name: 'an elephant', clues: ['I\'m very heavy and I\'m grey.', 'I have very big ears.', 'I have a long trunk!'] },
      { emoji: '🦒', name: 'a giraffe', clues: ['I eat leaves from tall trees.', 'I\'m yellow with brown spots.', 'I have a very, very long neck!'] },
      { emoji: '🐒', name: 'a monkey', clues: ['I live in the jungle.', 'I can climb trees very well.', 'I love bananas!'] },
      { emoji: '🐶', name: 'a dog', clues: ['I\'m a pet.', 'I love to play with a ball.', 'I say "Woof, woof!"'] },
      { emoji: '🐱', name: 'a cat', clues: ['I\'m a pet and I sleep a lot.', 'I like milk and fish.', 'I say "Meow!"'] },
      { emoji: '🐟', name: 'a fish', clues: ['I can\'t walk.', 'I don\'t have legs, I have fins.', 'I live in the water and I swim all day!'] },
      { emoji: '🐸', name: 'a frog', clues: ['I like water and I eat insects.', 'I\'m green.', 'I can jump very high and I say "Ribbit!"'] },
      { emoji: '🐍', name: 'a snake', clues: ['I don\'t have legs.', 'I\'m long and some people are afraid of me.', 'I say "Ssssss!"'] },
      { emoji: '🐧', name: 'a penguin', clues: ['I live in a very cold place.', 'I\'m a bird, but I can\'t fly.', 'I\'m black and white and I swim very well!'] },
      { emoji: '🐰', name: 'a rabbit', clues: ['I\'m small and soft.', 'I have long ears.', 'I love carrots and I hop!'] },
      { emoji: '🐄', name: 'a cow', clues: ['I live on a farm.', 'I\'m black and white.', 'I give you milk and I say "Moo!"'] },
      { emoji: '🐴', name: 'a horse', clues: ['I live on a farm.', 'I can run very fast.', 'People ride on me!'] },
      { emoji: '🦈', name: 'a shark', clues: ['I live in the sea.', 'I\'m dangerous and I eat fish.', 'I have a lot of sharp teeth!'] },
      { emoji: '🦋', name: 'a butterfly', clues: ['I\'m an insect.', 'Before, I was a caterpillar.', 'I have beautiful colourful wings!'] },
      { emoji: '🐊', name: 'a crocodile', clues: ['I live in rivers.', 'I\'m green and long.', 'I have a big mouth with many teeth!'] },
    ],
  },
  {
    id: 'b-jobs', name: 'Jobs', emoji: '👩‍⚕️', audience: 'all', qset: 'job',
    characters: [
      { emoji: '👩‍⚕️', name: 'a doctor', clues: ['I studied for many years.', 'I work in a hospital.', 'I help sick people get better!'] },
      { emoji: '👩‍🏫', name: 'a teacher', clues: ['I work with children.', 'I use books and a board.', 'I work in a school and I teach!'] },
      { emoji: '🧑‍🚒', name: 'a firefighter', clues: ['My job is dangerous.', 'I drive a big red truck.', 'I put out fires!'] },
      { emoji: '👮', name: 'a police officer', clues: ['I wear a uniform.', 'I help people who are in danger.', 'I catch thieves!'] },
      { emoji: '🧑‍🍳', name: 'a chef', clues: ['I work in a restaurant.', 'I wear a tall white hat.', 'I cook delicious food!'] },
      { emoji: '🧑‍🌾', name: 'a farmer', clues: ['I get up very early.', 'I work outside with animals.', 'I grow fruit and vegetables!'] },
      { emoji: '🧑‍✈️', name: 'a pilot', clues: ['I travel a lot.', 'I work in the sky.', 'I fly planes!'] },
      { emoji: '🧑‍🚀', name: 'an astronaut', clues: ['I wear a special suit.', 'I travel in a rocket.', 'I go to space!'] },
      { emoji: '🦷', name: 'a dentist', clues: ['I work in a clinic.', 'People are sometimes afraid of me.', 'I look after your teeth!'] },
      { emoji: '🎤', name: 'a singer', clues: ['I travel a lot and some people are famous.', 'I use a microphone.', 'I sing songs!'] },
      { emoji: '🧑‍🎨', name: 'an artist', clues: ['I\'m very creative.', 'I use brushes and colours.', 'I paint pictures!'] },
      { emoji: '🐾', name: 'a vet', clues: ['I studied for many years.', 'I work in a clinic.', 'I help sick animals!'] },
      { emoji: '🧑‍💻', name: 'a programmer', clues: ['I often work at home or in an office.', 'I use a computer all day.', 'I write code for apps and websites!'] },
      { emoji: '🚌', name: 'a bus driver', clues: ['I work on the street all day.', 'I stop at many places.', 'I drive a big vehicle with a lot of passengers!'] },
    ],
  },
  {
    id: 'b-food', name: 'Food', emoji: '🍕', audience: 'all', qset: 'food',
    characters: [
      { emoji: '🍕', name: 'pizza', clues: ['I\'m from Italy.', 'I\'m round and hot.', 'I have cheese and tomato on top!'] },
      { emoji: '🍌', name: 'a banana', clues: ['I\'m a fruit.', 'Monkeys love me.', 'I\'m long and yellow!'] },
      { emoji: '🍎', name: 'an apple', clues: ['I grow on a tree.', 'I can be red or green.', 'Teachers love me! I\'m a red fruit.'] },
      { emoji: '🍦', name: 'ice cream', clues: ['I\'m a dessert.', 'I\'m very cold.', 'I melt in the sun!'] },
      { emoji: '🥕', name: 'a carrot', clues: ['I\'m a vegetable.', 'I grow under the ground.', 'I\'m orange and rabbits love me!'] },
      { emoji: '🎂', name: 'a cake', clues: ['I\'m sweet.', 'People eat me at parties.', 'I have candles on your birthday!'] },
      { emoji: '🍞', name: 'bread', clues: ['People eat me every day.', 'A baker makes me.', 'You make sandwiches with me!'] },
      { emoji: '🥚', name: 'an egg', clues: ['People eat me for breakfast.', 'I\'m white or brown.', 'A chicken gives me!'] },
      { emoji: '🧀', name: 'cheese', clues: ['I\'m made with milk.', 'I\'m yellow.', 'Mice love me!'] },
      { emoji: '🍉', name: 'a watermelon', clues: ['I\'m a big fruit.', 'I\'m green outside.', 'I\'m red inside with black seeds!'] },
      { emoji: '🍫', name: 'chocolate', clues: ['I\'m sweet.', 'I come from cocoa.', 'I\'m brown and I\'m an Easter favourite!'] },
      { emoji: '🍔', name: 'a hamburger', clues: ['I\'m fast food.', 'I have meat inside.', 'I\'m in a round bread with cheese and ketchup!'] },
    ],
  },
  {
    id: 'b-stories', name: 'Story Characters', emoji: '🧚', audience: 'kids', qset: 'person',
    characters: [
      { emoji: '👸', name: 'Cinderella', clues: ['I have two bad sisters.', 'A fairy helps me go to a party.', 'I lose a glass slipper at midnight!'] },
      { emoji: '🍎', name: 'Snow White', clues: ['I live with seven little friends.', 'A bad queen hates me.', 'I eat a poisoned apple!'] },
      { emoji: '🧺', name: 'Little Red Riding Hood', clues: ['I walk in the forest.', 'I visit my grandmother.', 'I wear a red hood and I meet a wolf!'] },
      { emoji: '🧚', name: 'Peter Pan', clues: ['I never grow up.', 'I have a fairy friend.', 'I can fly and I fight Captain Hook!'] },
      { emoji: '🤥', name: 'Pinocchio', clues: ['I\'m made of wood.', 'A man called Geppetto made me.', 'My nose grows when I tell a lie!'] },
      { emoji: '🎅', name: 'Santa Claus', clues: ['I live at the North Pole.', 'I have reindeer.', 'I bring presents at Christmas!'] },
      { emoji: '🐰', name: 'the Easter Bunny', clues: ['I come once a year.', 'I have long ears.', 'I bring chocolate eggs!'] },
      { emoji: '🦷', name: 'the Tooth Fairy', clues: ['I come at night when you sleep.', 'I can fly.', 'I take your tooth and leave money!'] },
      { emoji: '🐉', name: 'a dragon', clues: ['I\'m very big and I can fly.', 'I live in a cave or a castle.', 'Fire comes out of my mouth!'] },
      { emoji: '🏴‍☠️', name: 'a pirate', clues: ['I live on a ship.', 'I sometimes have a parrot.', 'I look for treasure!'] },
      { emoji: '🧙‍♀️', name: 'a witch', clues: ['I can do magic.', 'I wear a tall black hat.', 'I fly on a broom!'] },
      { emoji: '🦸', name: 'a superhero', clues: ['I wear a mask or a cape.', 'I have special powers.', 'I save people!'] },
      { emoji: '🧜‍♀️', name: 'a mermaid', clues: ['I live in the sea.', 'I can sing beautifully.', 'I\'m half girl, half fish!'] },
      { emoji: '🐺', name: 'the Big Bad Wolf', clues: ['I live in the forest.', 'I\'m always hungry.', 'I blow down the houses of the three little pigs!'] },
    ],
  },
  {
    id: 'b-things', name: 'Things at Home & School', emoji: '🎒', audience: 'kids', qset: 'thing',
    characters: [
      { emoji: '✏️', name: 'a pencil', clues: ['I\'m long and thin.', 'I\'m made of wood.', 'You write and draw with me!'] },
      { emoji: '🎒', name: 'a backpack', clues: ['You carry me on your back.', 'I have zips.', 'You put your books inside me!'] },
      { emoji: '📚', name: 'a book', clues: ['I have a lot of pages.', 'I have stories inside.', 'You read me!'] },
      { emoji: '✂️', name: 'scissors', clues: ['Be careful with me!', 'I have two holes for your fingers.', 'I cut paper!'] },
      { emoji: '🛏️', name: 'a bed', clues: ['I\'m in the bedroom.', 'I have a pillow.', 'You sleep on me!'] },
      { emoji: '📺', name: 'a TV', clues: ['I use electricity.', 'I\'m in the living room.', 'You watch cartoons on me!'] },
      { emoji: '🪥', name: 'a toothbrush', clues: ['I\'m in the bathroom.', 'You use me with toothpaste.', 'You clean your teeth with me!'] },
      { emoji: '🥄', name: 'a spoon', clues: ['I\'m in the kitchen.', 'I\'m made of metal.', 'You eat soup with me!'] },
      { emoji: '⚽', name: 'a ball', clues: ['I\'m a toy.', 'I\'m round.', 'You kick me or throw me!'] },
      { emoji: '☂️', name: 'an umbrella', clues: ['You don\'t use me every day.', 'You open and close me.', 'I keep you dry when it rains!'] },
      { emoji: '⏰', name: 'a clock', clues: ['I\'m on the wall.', 'I have two hands but no fingers.', 'I tell you the time!'] },
      { emoji: '🧸', name: 'a teddy bear', clues: ['I\'m soft.', 'I\'m a toy.', 'You hug me at night!'] },
    ],
  },
  {
    id: 'b-famous', name: 'Famous People', emoji: '🌟', audience: 'adult', qset: 'famous',
    characters: [
      { emoji: '🧠', name: 'Albert Einstein', clues: ['I was born in Germany in 1879.', 'I won the Nobel Prize in Physics.', 'My most famous equation is E = mc².'] },
      { emoji: '⚽', name: 'Pelé', clues: ['I was born in Minas Gerais.', 'I played for Santos and the New York Cosmos.', 'I won three World Cups with Brazil.'] },
      { emoji: '🎨', name: 'Frida Kahlo', clues: ['I was born in Mexico.', 'I painted many self-portraits.', 'I\'m famous for my flowers and my eyebrows.'] },
      { emoji: '🖼️', name: 'Leonardo da Vinci', clues: ['I was an inventor, a scientist and an artist.', 'I lived in Italy during the Renaissance.', 'I painted the Mona Lisa.'] },
      { emoji: '⚗️', name: 'Marie Curie', clues: ['I was born in Poland.', 'I won two Nobel Prizes.', 'I studied radioactivity.'] },
      { emoji: '🏎️', name: 'Ayrton Senna', clues: ['I was born in São Paulo in 1960.', 'I was champion three times.', 'I was a Formula 1 driver.'] },
      { emoji: '🎭', name: 'William Shakespeare', clues: ['I lived in England in the 16th century.', 'I wrote plays and poems.', 'I wrote Romeo and Juliet.'] },
      { emoji: '🕺', name: 'Michael Jackson', clues: ['I was born in the USA in 1958.', 'People called me the King of Pop.', 'I\'m famous for "Thriller" and the moonwalk.'] },
      { emoji: '✊', name: 'Nelson Mandela', clues: ['I spent 27 years in prison.', 'I won the Nobel Peace Prize.', 'I was the first black president of South Africa.'] },
      { emoji: '👑', name: 'Cleopatra', clues: ['I lived more than 2,000 years ago.', 'I spoke many languages.', 'I was the last queen of Egypt.'] },
      { emoji: '🎹', name: 'Wolfgang Amadeus Mozart', clues: ['I was born in Austria in 1756.', 'I started composing when I was five.', 'I was a famous classical composer.'] },
      { emoji: '✈️', name: 'Santos Dumont', clues: ['I was born in Minas Gerais.', 'I lived in Paris for many years.', 'Brazilians say I invented the aeroplane.'] },
      { emoji: '🍎', name: 'Isaac Newton', clues: ['I was born in England in 1643.', 'I studied light and mathematics.', 'An apple helped me think about gravity.'] },
      { emoji: '🎾', name: 'Serena Williams', clues: ['I was born in the USA.', 'My sister is also a champion.', 'I won 23 Grand Slam tennis titles.'] },
    ],
  },
  {
    id: 'b-places', name: 'Countries & Cities', emoji: '🌍', audience: 'adult', qset: 'place',
    characters: [
      { emoji: '🇧🇷', name: 'Brazil', clues: ['I\'m the biggest country in South America.', 'People speak Portuguese here.', 'I\'m famous for samba, football and Carnival.'] },
      { emoji: '🇯🇵', name: 'Japan', clues: ['I\'m an island country in Asia.', 'My capital is Tokyo.', 'I\'m famous for sushi and anime.'] },
      { emoji: '🇮🇹', name: 'Italy', clues: ['I\'m in Europe.', 'My shape looks like a boot.', 'I\'m famous for pizza, pasta and Rome.'] },
      { emoji: '🇪🇬', name: 'Egypt', clues: ['I\'m in Africa.', 'The Nile river runs through me.', 'I\'m famous for the pyramids.'] },
      { emoji: '🗼', name: 'Paris', clues: ['I\'m a European capital.', 'The Louvre museum is here.', 'The Eiffel Tower is here.'] },
      { emoji: '🗽', name: 'New York', clues: ['I\'m a very big city in the USA.', 'People call me the Big Apple.', 'The Statue of Liberty is here.'] },
      { emoji: '🇦🇺', name: 'Australia', clues: ['I\'m a country and a continent.', 'People speak English here.', 'Kangaroos and koalas live here.'] },
      { emoji: '🇲🇽', name: 'Mexico', clues: ['I\'m in North America.', 'People speak Spanish here.', 'I\'m famous for tacos and the Day of the Dead.'] },
      { emoji: '🇨🇳', name: 'China', clues: ['I have more than a billion people.', 'People use chopsticks here.', 'The Great Wall is here.'] },
      { emoji: '💂', name: 'London', clues: ['I\'m a European capital on the river Thames.', 'People drink a lot of tea here.', 'Big Ben and the red buses are here.'] },
      { emoji: '🇮🇳', name: 'India', clues: ['I\'m in Asia.', 'My food is famous for its spices.', 'The Taj Mahal is here.'] },
      { emoji: '🏖️', name: 'Rio de Janeiro', clues: ['I\'m a Brazilian city by the sea.', 'Copacabana beach is here.', 'Christ the Redeemer is here.'] },
    ],
  },
];

// ---------------------------------------------------------------------------
// STORAGE
// ---------------------------------------------------------------------------
function waiLoadCustomDecks() {
  const raw = IGStore.getJSON(WAI_DECKS_KEY, []);
  return Array.isArray(raw) ? raw.filter(d => d && Array.isArray(d.characters)) : [];
}
function waiSaveCustomDecks(list) { IGStore.setJSON(WAI_DECKS_KEY, list); }

function waiAdult() {
  return typeof igAdultContext === 'function' ? igAdultContext() : false;
}
// Built-in decks fitting who is being taught right now, then her own decks.
function waiAllDecks() {
  const adult = waiAdult();
  const builtin = WAI_BUILTIN.filter(d => !(adult && d.audience === 'kids'))
    .map(d => ({ ...d, builtin: true, questions: WAI_QUESTIONS[d.qset] || WAI_QUESTIONS.general }));
  const mine = waiLoadCustomDecks().filter(d => !(adult && d.audience === 'kids'));
  return [...mine, ...builtin];
}

// ---------------------------------------------------------------------------
// LANGUAGE HELPERS — model answers and turning "Am I" into "Are you"
// ---------------------------------------------------------------------------
// [question start, yes answer, no answer] — guesser asks about himself.
const WAI_ANSWERS_I = [
  [/^am i\b/i, 'Yes, you are.', 'No, you aren\'t.'],
  [/^do i\b/i, 'Yes, you do.', 'No, you don\'t.'],
  [/^can i\b/i, 'Yes, you can.', 'No, you can\'t.'],
  [/^was i\b/i, 'Yes, you were.', 'No, you weren\'t.'],
  [/^did i\b/i, 'Yes, you did.', 'No, you didn\'t.'],
  [/^have i\b/i, 'Yes, you have.', 'No, you haven\'t.'],
  [/^will i\b/i, 'Yes, you will.', 'No, you won\'t.'],
  [/^(is|was) (it|my)\b/i, 'Yes, it is.', 'No, it isn\'t.'],
  [/^(do|does|did) (people|you)\b/i, 'Yes, they do.', 'No, they don\'t.'],
  [/^can (people|you)\b/i, 'Yes, you can.', 'No, you can\'t.'],
];
// Asked to the character ("Are you…?") — the character answers.
const WAI_ANSWERS_YOU = [
  [/^are you\b/i, 'Yes, I am.', 'No, I\'m not.'],
  [/^do you\b/i, 'Yes, I do.', 'No, I don\'t.'],
  [/^can you\b/i, 'Yes, I can.', 'No, I can\'t.'],
  [/^were you\b/i, 'Yes, I was.', 'No, I wasn\'t.'],
  [/^did you\b/i, 'Yes, I did.', 'No, I didn\'t.'],
  [/^have you\b/i, 'Yes, I have.', 'No, I haven\'t.'],
  [/^will you\b/i, 'Yes, I will.', 'No, I won\'t.'],
  [/^(is|was) (it|your)\b/i, 'Yes, it is.', 'No, it isn\'t.'],
  [/^(do|does|did) people\b/i, 'Yes, they do.', 'No, they don\'t.'],
  [/^can people\b/i, 'Yes, they can.', 'No, they can\'t.'],
];
// The table of the mode being played is tried first, so a typed "Are you
// a cat?" in Hot seat or "Am I…?" in Clues still gets a sensible answer.
function waiModelAnswer(q, yes, youForm) {
  const tables = youForm ? [WAI_ANSWERS_YOU, WAI_ANSWERS_I] : [WAI_ANSWERS_I, WAI_ANSWERS_YOU];
  const text = String(q).trim();
  let hit = null;
  for (const t of tables) { hit = t.find(([re]) => re.test(text)); if (hit) break; }
  if (!hit) return yes ? 'Yes.' : 'No.';
  return yes ? hit[1] : hit[2];
}
// "Am I big?" → "Are you big?" · "Is my job…" → "Is your job…" ·
// "Can you write with me?" → "Can you write with it?"
function waiToYou(q) {
  let s = String(q).trim();
  const swaps = [
    [/^am i\b/i, 'Are you'], [/^do i\b/i, 'Do you'], [/^can i\b/i, 'Can you'], [/^was i\b/i, 'Were you'],
    [/^did i\b/i, 'Did you'], [/^have i\b/i, 'Have you'], [/^will i\b/i, 'Will you'],
  ];
  for (const [re, to] of swaps) if (re.test(s)) { s = s.replace(re, to); break; }
  return s.replace(/\bmy\b/gi, 'your').replace(/\bwith me\b/gi, 'with you').replace(/\bme\b/g, 'you')
    .replace(/\b(Can|Do) you (\w+) with you\b/, '$1 you $2 with it');
}

function waiEsc(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function waiSafeImage(url) {
  const v = String(url || '').trim();
  if (!v) return '';
  if (/^data:image\//i.test(v)) return v;
  try { const u = new URL(v); return (u.protocol === 'https:' || u.protocol === 'http:') ? v : ''; } catch (e) { return ''; }
}
function waiPicture(ch, cls) {
  const img = waiSafeImage(ch.image);
  if (img) return `<img class="${cls}" src="${waiEsc(img)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'${cls} wai-pic-emoji',textContent:'${waiEsc(ch.emoji || '❓')}'}))">`;
  return `<span class="${cls} wai-pic-emoji">${waiEsc(ch.emoji || '❓')}</span>`;
}

let waiVoiceOn = true;
function waiSay(text) {
  if (!waiVoiceOn || !('speechSynthesis' in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}
function waiStop() { try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) {} }

function waiShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function waiSound(name) { try { if (typeof IGSound !== 'undefined' && IGSound[name]) IGSound[name](); } catch (e) {} }

// ---------------------------------------------------------------------------
// OPEN — from the Games section; renderWhoAmI also runs inside Live Tools
// ---------------------------------------------------------------------------
function openWhoAmI() {
  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">🕵️</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Who am I?</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">Jogo de adivinhação para 2 ou mais jogadores</span></p>
        </div>
      </div>
      <div id="whoAmIMount"></div>
    </div>`, true);
  renderWhoAmI(document.getElementById('whoAmIMount'));
}

function renderWhoAmI(container) {
  if (!container) return;
  const saved = IGStore.getJSON(WAI_SETUP_KEY, null) || {};
  const S = {
    view: 'setup',
    deckId: saved.deckId || null,
    mode: saved.mode === 'clues' ? 'clues' : 'hotseat',
    maxQ: [10, 15, 20].includes(saved.maxQ) ? saved.maxQ : 20,
    players: Array.isArray(saved.players) && saved.players.length >= 2
      ? saved.players.map(n => ({ name: String(n), score: 0 }))
      : [{ name: 'Player 1', score: 0 }, { name: 'Player 2', score: 0 }],
    pickStudents: false,
    game: null,
    editing: null,   // deck being edited (a copy)
  };

  const deckById = id => waiAllDecks().find(d => d.id === id);
  const persistSetup = () => IGStore.setJSON(WAI_SETUP_KEY, {
    deckId: S.deckId, mode: S.mode, maxQ: S.maxQ, players: S.players.map(p => p.name),
  });

  function paint() {
    if (!container.isConnected) return;
    if (S.view === 'edit') paintEditor();
    else if (S.view === 'play') paintPlay();
    else if (S.view === 'end') paintEnd();
    else paintSetup();
  }

  // ======================================================================
  // SETUP
  // ======================================================================
  function paintSetup() {
    const decks = waiAllDecks();
    if (!decks.some(d => d.id === S.deckId)) S.deckId = decks[0] ? decks[0].id : null;
    const students = typeof loadStudents === 'function' ? loadStudents() : [];
    const inGame = new Set(S.players.map(p => p.name));

    container.innerHTML = `
      <div class="wai">
        <p class="wai-label">1. Escolha o jogo de personagens</p>
        <div class="wai-decks">
          ${decks.map(d => `
            <div class="wai-deck ${d.id === S.deckId ? 'active' : ''}" data-deck="${waiEsc(d.id)}" role="button" tabindex="0">
              <span class="wai-deck-emoji">${waiEsc(d.emoji || '🃏')}</span>
              <b>${waiEsc(d.name)}</b>
              <small>${d.characters.length} personagens · ${d.builtin ? 'pronto' : 'meu jogo'}</small>
              <span class="wai-deck-actions">
                ${d.builtin
                  ? `<button type="button" class="wai-mini" data-copy="${waiEsc(d.id)}" title="Fazer uma cópia para editar">📄 Copiar e editar</button>`
                  : `<button type="button" class="wai-mini" data-edit="${waiEsc(d.id)}">✏️ Editar</button>
                     <button type="button" class="wai-mini wai-mini--danger" data-del="${waiEsc(d.id)}" title="Apagar este jogo">🗑️</button>`}
              </span>
            </div>`).join('')}
          <button type="button" class="wai-deck wai-deck--new" data-new>
            <span class="wai-deck-emoji">➕</span>
            <b>Criar meu jogo</b>
            <small>com os personagens que você quiser</small>
          </button>
        </div>

        <p class="wai-label">2. Jogadores <small>(2 ou mais — podem ser times)</small></p>
        <div class="wai-players">
          ${S.players.map((p, i) => `
            <span class="wai-player-edit">
              <input type="text" value="${waiEsc(p.name)}" data-pname="${i}" maxlength="30" aria-label="Nome do jogador ${i + 1}">
              ${S.players.length > 2 ? `<button type="button" data-premove="${i}" aria-label="Remover jogador">✕</button>` : ''}
            </span>`).join('')}
          <button type="button" class="btn btn-ghost wai-small-btn" data-padd>➕ Jogador</button>
          ${students.length ? `<button type="button" class="btn btn-ghost wai-small-btn" data-pickst>👧 Meus alunos</button>` : ''}
        </div>
        ${S.pickStudents && students.length ? `
          <div class="wai-student-pick">
            ${students.map(s => `<button type="button" class="wai-chip ${inGame.has(s.name) ? 'on' : ''}" data-student="${waiEsc(s.name)}">${waiEsc(s.avatar || '🙂')} ${waiEsc(s.name)}</button>`).join('')}
          </div>` : ''}

        <p class="wai-label">3. Como jogar</p>
        <div class="wai-modes">
          <button type="button" class="wai-mode ${S.mode === 'hotseat' ? 'active' : ''}" data-mode="hotseat">
            <span>🙈</span><b>Hot seat</b>
            <small>Um jogador não olha; a turma vê o personagem. Ele faz perguntas de sim/não ("Am I an animal?") até adivinhar. Menos perguntas = mais pontos.</small>
          </button>
          <button type="button" class="wai-mode ${S.mode === 'clues' ? 'active' : ''}" data-mode="clues">
            <span>🕵️</span><b>Pistas</b>
            <small>Ninguém vê o personagem. A professora revela pistas ("I live in Africa…") e os alunos perguntam "Are you…?". Quem adivinhar primeiro ganha — quanto antes, mais pontos.</small>
          </button>
        </div>
        ${S.mode === 'hotseat' ? `
          <div class="wai-maxq">Perguntas por jogador:
            ${[10, 15, 20].map(n => `<button type="button" class="wai-chip ${S.maxQ === n ? 'on' : ''}" data-maxq="${n}">${n}</button>`).join('')}
          </div>` : ''}

        <p class="wai-error" id="waiErr" hidden></p>
        <div class="wai-start-row">
          <button type="button" class="btn btn-primary" data-start>▶ Começar o jogo</button>
        </div>
      </div>`;

    const readNames = () => container.querySelectorAll('[data-pname]').forEach(inp => {
      S.players[Number(inp.dataset.pname)].name = inp.value.trim();
    });

    container.querySelectorAll('[data-deck]').forEach(el => {
      const pick = (e) => { if (e.target.closest('button')) return; readNames(); S.deckId = el.dataset.deck; paint(); };
      el.addEventListener('click', pick);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
    });
    container.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
      readNames();
      const src = deckById(b.dataset.copy);
      if (!src) return;
      openEditor({
        id: null, name: `${src.name} (minha versão)`, emoji: src.emoji, audience: src.audience,
        questions: src.questions.slice(), characters: src.characters.map(c => ({ ...c, clues: (c.clues || []).slice() })),
      });
    }));
    container.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      readNames();
      const src = waiLoadCustomDecks().find(d => d.id === b.dataset.edit);
      if (src) openEditor(JSON.parse(JSON.stringify(src)));
    }));
    container.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const list = waiLoadCustomDecks();
      const d = list.find(x => x.id === b.dataset.del);
      if (!d || !confirm(`Apagar o jogo "${d.name}"? Isso não pode ser desfeito.`)) return;
      readNames();
      waiSaveCustomDecks(list.filter(x => x.id !== d.id));
      paint();
    }));
    container.querySelector('[data-new]').addEventListener('click', () => {
      readNames();
      openEditor({ id: null, name: '', emoji: '🃏', audience: 'all', questions: WAI_QUESTIONS.general.slice(), characters: [
        { emoji: '', name: '', clues: [] }, { emoji: '', name: '', clues: [] }, { emoji: '', name: '', clues: [] },
      ] });
    });
    container.querySelector('[data-padd]').addEventListener('click', () => {
      readNames();
      S.players.push({ name: `Player ${S.players.length + 1}`, score: 0 });
      paint();
      const last = container.querySelector(`[data-pname="${S.players.length - 1}"]`);
      if (last) { last.focus(); last.select(); }
    });
    container.querySelectorAll('[data-premove]').forEach(b => b.addEventListener('click', () => {
      readNames();
      S.players.splice(Number(b.dataset.premove), 1);
      paint();
    }));
    const pickBtn = container.querySelector('[data-pickst]');
    if (pickBtn) pickBtn.addEventListener('click', () => { readNames(); S.pickStudents = !S.pickStudents; paint(); });
    container.querySelectorAll('[data-student]').forEach(b => b.addEventListener('click', () => {
      readNames();
      const name = b.dataset.student;
      const idx = S.players.findIndex(p => p.name === name);
      if (idx >= 0) { if (S.players.length > 2) S.players.splice(idx, 1); }
      else {
        // The placeholder "Player N" slots make way for real names first.
        const placeholder = S.players.findIndex(p => /^Player \d+$/.test(p.name) || !p.name);
        if (placeholder >= 0) S.players[placeholder].name = name; else S.players.push({ name, score: 0 });
      }
      paint();
    }));
    container.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { readNames(); S.mode = b.dataset.mode; paint(); }));
    container.querySelectorAll('[data-maxq]').forEach(b => b.addEventListener('click', () => { readNames(); S.maxQ = Number(b.dataset.maxq); paint(); }));

    container.querySelector('[data-start]').addEventListener('click', () => {
      readNames();
      const err = container.querySelector('#waiErr');
      const deck = deckById(S.deckId);
      S.players.forEach((p, i) => { if (!p.name) p.name = `Player ${i + 1}`; });
      if (!deck) { err.textContent = 'Escolha um jogo de personagens.'; err.hidden = false; return; }
      if (S.players.length < 2) { err.textContent = 'São precisos pelo menos 2 jogadores.'; err.hidden = false; return; }
      persistSetup();
      startGame(deck);
    });
  }

  // ======================================================================
  // EDITOR
  // ======================================================================
  function openEditor(deck) {
    S.editing = deck;
    S.view = 'edit';
    paint();
  }

  function paintEditor() {
    const d = S.editing;
    container.innerHTML = `
      <div class="wai wai-editor">
        <div class="wai-editor-head">
          <input type="text" class="wai-emoji-input" data-f="emoji" value="${waiEsc(d.emoji)}" maxlength="8" aria-label="Emoji do jogo">
          <input type="text" class="wai-name-input" data-f="name" value="${waiEsc(d.name)}" placeholder="Nome do jogo (ex.: Unit 3 — Jobs)" maxlength="60">
          <select data-f="audience" aria-label="Para quem">
            <option value="all" ${d.audience === 'all' ? 'selected' : ''}>Todas as idades</option>
            <option value="kids" ${d.audience === 'kids' ? 'selected' : ''}>Crianças</option>
            <option value="adult" ${d.audience === 'adult' ? 'selected' : ''}>Teens e adultos</option>
          </select>
        </div>

        <p class="wai-label">Personagens <small>(emoji ou link de uma imagem, nome, e pistas — uma por linha, da mais difícil para a mais fácil)</small></p>
        <div class="wai-char-list">
          ${d.characters.map((c, i) => `
            <div class="wai-char-row" data-row="${i}">
              <span class="wai-char-num">${i + 1}</span>
              <div class="wai-char-main">
                <div class="wai-char-line">
                  <input type="text" class="wai-emoji-input" data-c="emoji" value="${waiEsc(c.emoji)}" placeholder="🙂" maxlength="8" aria-label="Emoji">
                  <input type="text" data-c="name" value="${waiEsc(c.name)}" placeholder="Nome (ex.: a lion, Pelé, Cinderella)" maxlength="60">
                  <button type="button" class="wai-mini wai-mini--danger" data-crm="${i}" aria-label="Remover personagem">🗑️</button>
                </div>
                <input type="url" data-c="image" value="${waiEsc(c.image || '')}" placeholder="Link de imagem (opcional) — https://…">
                <textarea data-c="clues" rows="3" placeholder="Pistas (opcional) — uma por linha. Ex.: I live in Africa.">${waiEsc((c.clues || []).join('\n'))}</textarea>
              </div>
            </div>`).join('')}
        </div>
        <div class="wai-editor-tools">
          <button type="button" class="btn btn-ghost wai-small-btn" data-cadd>➕ Personagem</button>
          <details class="wai-bulk">
            <summary>📋 Colar vários de uma vez</summary>
            <p class="wai-hint">Um por linha: emoji, nome e (se quiser) pistas separadas por <b>|</b><br>
            <code>🦁 a lion | I live in Africa. | I have a big mane!</code></p>
            <textarea rows="5" id="waiBulk" placeholder="🐶 a dog | I'm a pet. | I say woof!&#10;🐱 a cat&#10;Pelé | I played football."></textarea>
            <button type="button" class="btn btn-ghost wai-small-btn" data-bulk>Adicionar à lista</button>
          </details>
        </div>

        <p class="wai-label">Modelos de perguntas <small>(uma por linha, do ponto de vista de quem adivinha: "Am I…?", "Do I…?", "Can I…?")</small></p>
        <div class="wai-qsets">
          Inserir modelo:
          ${[['animal', '🐾 Animais'], ['person', '🧚 Personagens'], ['famous', '🌟 Famosos'], ['job', '👩‍⚕️ Profissões'], ['food', '🍕 Comida'], ['thing', '🎒 Objetos'], ['place', '🌍 Lugares'], ['general', '❓ Gerais']]
            .map(([k, label]) => `<button type="button" class="wai-chip" data-qset="${k}">${label}</button>`).join('')}
        </div>
        <textarea class="wai-questions" data-f="questions" rows="7">${waiEsc((d.questions || []).join('\n'))}</textarea>

        <p class="wai-error" id="waiErr" hidden></p>
        <div class="wai-start-row">
          <button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>
          <button type="button" class="btn btn-primary" data-save>💾 Salvar jogo</button>
        </div>
      </div>`;

    const collect = () => {
      d.emoji = container.querySelector('[data-f="emoji"]').value.trim();
      d.name = container.querySelector('[data-f="name"]').value.trim();
      d.audience = container.querySelector('[data-f="audience"]').value;
      d.questions = container.querySelector('[data-f="questions"]').value.split('\n').map(s => s.trim()).filter(Boolean);
      d.characters = [...container.querySelectorAll('.wai-char-row')].map(row => ({
        emoji: row.querySelector('[data-c="emoji"]').value.trim(),
        name: row.querySelector('[data-c="name"]').value.trim(),
        image: row.querySelector('[data-c="image"]').value.trim(),
        clues: row.querySelector('[data-c="clues"]').value.split('\n').map(s => s.trim()).filter(Boolean),
      }));
    };

    container.querySelector('[data-cadd]').addEventListener('click', () => {
      collect();
      d.characters.push({ emoji: '', name: '', clues: [] });
      paint();
      const rows = container.querySelectorAll('.wai-char-row [data-c="name"]');
      if (rows.length) rows[rows.length - 1].focus();
    });
    container.querySelectorAll('[data-crm]').forEach(b => b.addEventListener('click', () => {
      collect();
      d.characters.splice(Number(b.dataset.crm), 1);
      paint();
    }));
    container.querySelector('[data-bulk]').addEventListener('click', () => {
      const text = container.querySelector('#waiBulk').value;
      collect();
      d.characters = d.characters.filter(c => c.name);
      text.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
        const parts = line.split('|').map(s => s.trim());
        const head = parts.shift();
        // A leading emoji (anything that is not a letter or digit) is the picture.
        const m = head.match(/^([^\p{L}\p{N}\s]+)\s*(.*)$/u);
        d.characters.push({ emoji: m ? m[1] : '', name: m ? m[2] : head, clues: parts.filter(Boolean) });
      });
      paint();
    });
    container.querySelectorAll('[data-qset]').forEach(b => b.addEventListener('click', () => {
      collect();
      const add = WAI_QUESTIONS[b.dataset.qset] || [];
      const have = new Set(d.questions.map(q => q.toLowerCase()));
      d.questions = [...d.questions, ...add.filter(q => !have.has(q.toLowerCase()))];
      paint();
    }));
    container.querySelector('[data-cancel]').addEventListener('click', () => { S.editing = null; S.view = 'setup'; paint(); });
    container.querySelector('[data-save]').addEventListener('click', () => {
      collect();
      const err = container.querySelector('#waiErr');
      const chars = d.characters.filter(c => c.name);
      const badImg = chars.find(c => c.image && !waiSafeImage(c.image));
      if (!d.name) { err.textContent = 'Dê um nome ao jogo.'; err.hidden = false; return; }
      if (chars.length < 2) { err.textContent = 'Coloque pelo menos 2 personagens (com nome).'; err.hidden = false; return; }
      if (badImg) { err.textContent = `O link da imagem de "${badImg.name}" não parece válido — ele precisa começar com https://`; err.hidden = false; return; }
      const deck = {
        id: d.id || `wai-${Date.now().toString(36)}`,
        name: d.name, emoji: d.emoji || '🃏', audience: d.audience || 'all',
        questions: d.questions.length ? d.questions : WAI_QUESTIONS.general.slice(),
        characters: chars.map(c => {
          const out = { emoji: c.emoji || '❓', name: c.name, clues: c.clues };
          if (c.image) out.image = c.image;
          return out;
        }),
      };
      const list = waiLoadCustomDecks();
      const idx = list.findIndex(x => x.id === deck.id);
      if (idx >= 0) list[idx] = deck; else list.unshift(deck);
      waiSaveCustomDecks(list);
      S.deckId = deck.id;
      S.editing = null;
      S.view = 'setup';
      persistSetup();
      paint();
    });
  }

  // ======================================================================
  // PLAY
  // ======================================================================
  function startGame(deck) {
    S.players.forEach(p => { p.score = 0; });
    S.game = {
      deck,
      queue: waiShuffle(deck.characters),
      turn: 0,
      rounds: 0,
    };
    S.view = 'play';
    nextCharacter(true);
  }

  function nextCharacter(first) {
    const g = S.game;
    if (!g.queue.length) g.queue = waiShuffle(g.deck.characters);
    g.current = g.queue.shift();
    g.asked = [];        // { q, answer: 'yes'|'no'|'maybe'|null }
    g.cluesShown = 0;
    g.revealed = false;
    g.result = null;     // { who, points } or { nobody: true }
    g.shown = false;     // hot seat: is the card showing for the class?
    g.wrongGuesses = 0;
    if (!first && S.mode === 'hotseat') g.turn = (g.turn + 1) % S.players.length;
    paint();
  }

  const youForm = () => S.mode === 'clues';
  const displayQ = q => (youForm() ? waiToYou(q) : q);

  function hotseatPoints() {
    const used = S.game.asked.length + S.game.wrongGuesses;
    return Math.max(2, 10 - Math.floor(used / 2));
  }
  function cluePoints() {
    const total = (S.game.current.clues || []).length;
    return Math.max(1, total + 1 - S.game.cluesShown);
  }

  function paintScoreboard() {
    const g = S.game;
    return `<div class="wai-score">
      ${S.players.map((p, i) => `
        <div class="wai-score-item ${S.mode === 'hotseat' && i === g.turn ? 'current' : ''}">
          <span class="wai-score-name">${S.mode === 'hotseat' && i === g.turn ? '🙈 ' : ''}${waiEsc(p.name)}</span>
          <span class="wai-score-pts">
            <button type="button" data-adj="${i}" data-by="-1" aria-label="Tirar um ponto">−</button>
            <b>${p.score}</b>
            <button type="button" data-adj="${i}" data-by="1" aria-label="Dar um ponto">+</button>
          </span>
        </div>`).join('')}
    </div>`;
  }

  function paintCard() {
    const g = S.game, ch = g.current;
    const visible = g.revealed || (S.mode === 'hotseat' && g.shown);
    if (visible) {
      return `<div class="wai-card wai-card--open ${g.revealed ? 'wai-card--reveal' : ''}">
        ${waiPicture(ch, 'wai-card-pic')}
        <b class="wai-card-name">${waiEsc(ch.name)}</b>
        ${S.mode === 'hotseat' && !g.revealed ? `<button type="button" class="wai-mini" data-hide>🙈 Esconder</button>` : ''}
      </div>`;
    }
    return `<div class="wai-card wai-card--closed">
      <span class="wai-card-q">?</span>
      ${S.mode === 'hotseat'
        ? `<button type="button" class="wai-mini" data-show>👀 Mostrar para a turma</button>`
        : `<small>Personagem secreto</small>`}
    </div>`;
  }

  function paintClues() {
    const g = S.game, clues = g.current.clues || [];
    if (!clues.length) return `<p class="wai-hint">Este personagem não tem pistas — joguem só com perguntas.</p>`;
    return `<div class="wai-clues">
      ${clues.map((c, i) => i < g.cluesShown || g.revealed
        ? `<button type="button" class="wai-clue ${i < g.cluesShown ? '' : 'wai-clue--late'}" data-sayclue="${i}" title="Ouvir">💬 ${waiEsc(c)}</button>`
        : `<div class="wai-clue wai-clue--hidden">Pista ${i + 1}</div>`).join('')}
      ${!g.revealed && g.cluesShown < clues.length
        ? `<button type="button" class="btn btn-primary wai-small-btn" data-nextclue>💡 Mostrar pista ${g.cluesShown + 1} <small>(vale ${cluePoints() - 1 || 1} pts depois)</small></button>` : ''}
    </div>`;
  }

  function paintQuestions() {
    const g = S.game;
    const used = g.asked.length + g.wrongGuesses;
    const qs = (g.deck.questions || WAI_QUESTIONS.general);
    const askedSet = new Set(g.asked.map(a => a.q));
    return `
      <div class="wai-qpanel">
        <div class="wai-qhead">
          <b>❓ Perguntas ${S.mode === 'hotseat' ? `<span class="wai-qcount ${used >= S.maxQ ? 'over' : ''}">${used}/${S.maxQ}</span>` : `<span class="wai-qcount">${used}</span>`}</b>
          <small>${S.mode === 'hotseat' ? 'Clique na pergunta que o aluno fez' : 'Clique na pergunta que a turma fez'} e marque a resposta.</small>
        </div>
        <div class="wai-qbank">
          ${qs.map(q => `<button type="button" class="wai-q ${askedSet.has(q) ? 'used' : ''}" data-ask="${waiEsc(q)}">${waiEsc(displayQ(q))}</button>`).join('')}
        </div>
        <form class="wai-qform" data-qform>
          <input type="text" placeholder="${S.mode === 'hotseat' ? 'Outra pergunta… (ex.: Am I orange?)' : 'Outra pergunta… (ex.: Are you orange?)'}" maxlength="120" aria-label="Escrever outra pergunta">
          <button type="submit" class="btn btn-ghost wai-small-btn">Perguntar</button>
        </form>
        ${g.asked.length ? `<ol class="wai-log">
          ${g.asked.map((a, i) => `
            <li class="wai-log-item ${a.answer ? `is-${a.answer}` : 'pending'}">
              <span class="wai-log-q">${waiEsc(a.text)}</span>
              ${a.answer
                ? `<span class="wai-log-a">${a.answer === 'yes' ? '✅' : a.answer === 'no' ? '❌' : '🤷'} ${waiEsc(a.model)}</span>`
                : `<span class="wai-log-btns">
                     <button type="button" class="wai-yes" data-ans="${i}" data-v="yes">✅ Yes</button>
                     <button type="button" class="wai-no" data-ans="${i}" data-v="no">❌ No</button>
                     <button type="button" class="wai-maybe" data-ans="${i}" data-v="maybe">🤷 Sometimes</button>
                   </span>`}
            </li>`).reverse().join('')}
        </ol>` : ''}
      </div>`;
  }

  function paintActions() {
    const g = S.game;
    if (g.revealed) {
      const res = g.result || {};
      const msg = res.nobody ? 'Ninguém acertou desta vez!'
        : res.who != null ? `🎉 ${waiEsc(S.players[res.who].name)} acertou! +${res.points} pontos` : '';
      return `<div class="wai-result">
        <p class="wai-result-msg">${msg}</p>
        <p class="wai-result-say">"I'm ${waiEsc(g.current.name)}!"</p>
        <div class="wai-actions">
          <button type="button" class="btn btn-primary" data-next>➡️ ${S.mode === 'hotseat' ? `Vez de ${waiEsc(S.players[(g.turn + 1) % S.players.length].name)}` : 'Próximo personagem'}</button>
          <button type="button" class="btn btn-ghost" data-end>🏁 Terminar o jogo</button>
        </div>
      </div>`;
    }
    if (S.mode === 'hotseat') {
      const p = S.players[g.turn];
      return `<div class="wai-actions">
        <span class="wai-guess-label">${waiEsc(p.name)} tentou adivinhar:</span>
        <button type="button" class="btn btn-primary" data-right>🎯 Acertou! <small>(+${hotseatPoints()})</small></button>
        <button type="button" class="btn btn-ghost" data-wrong>❌ Errou</button>
        <button type="button" class="btn btn-ghost" data-giveup>🏳️ Desistir e revelar</button>
      </div>`;
    }
    return `<div class="wai-actions wai-actions--who">
      <span class="wai-guess-label">Quem acertou? <small>(+${cluePoints()} pts)</small></span>
      ${S.players.map((p, i) => `<button type="button" class="wai-chip wai-chip--player" data-winner="${i}">${waiEsc(p.name)}</button>`).join('')}
      <button type="button" class="btn btn-ghost" data-giveup>🏳️ Ninguém — revelar</button>
    </div>`;
  }

  function paintPlay() {
    const g = S.game;
    const p = S.players[g.turn];
    const banner = S.mode === 'hotseat'
      ? (g.revealed ? '' : `<div class="wai-banner">🙈 Vez de <b>${waiEsc(p.name)}</b> — não olhe a carta! Pergunte: <i>"Am I…?" "Do I…?" "Can I…?"</i></div>`)
      : (g.revealed ? '' : `<div class="wai-banner">🕵️ Quem sou eu? Ouçam as pistas e perguntem: <i>"Are you…?" "Do you…?" "Can you…?"</i></div>`);

    container.innerHTML = `
      <div class="wai wai-play">
        <div class="wai-topbar">
          <span class="wai-deckname">${waiEsc(g.deck.emoji)} ${waiEsc(g.deck.name)} · ${S.mode === 'hotseat' ? '🙈 Hot seat' : '🕵️ Pistas'}</span>
          <span>
            <button type="button" class="wai-mini" data-voice title="Voz em inglês">${waiVoiceOn ? '🔊' : '🔇'}</button>
            <button type="button" class="wai-mini" data-skip title="Trocar o personagem">🔀 Trocar</button>
            <button type="button" class="wai-mini" data-end>🏁 Terminar</button>
          </span>
        </div>
        ${paintScoreboard()}
        ${banner}
        <div class="wai-board">
          <div class="wai-board-left">
            ${paintCard()}
            ${S.mode === 'clues' ? paintClues() : ''}
          </div>
          <div class="wai-board-right">
            ${paintActions()}
            ${g.revealed ? '' : paintQuestions()}
          </div>
        </div>
      </div>`;
    bindPlay();
  }

  function reveal(result) {
    const g = S.game;
    g.revealed = true;
    g.result = result;
    g.rounds++;
    if (result && result.who != null) {
      S.players[result.who].score += result.points;
      waiSound('win');
    } else waiSound('reveal');
    paint();
    waiSay(`I'm ${g.current.name}!`);
    if (result && result.who != null && typeof waiConfetti === 'function') waiConfetti(container.querySelector('.wai-card'));
  }

  function bindPlay() {
    const g = S.game;
    const on = (sel, fn) => container.querySelectorAll(sel).forEach(el => el.addEventListener('click', fn));

    on('[data-adj]', e => {
      const b = e.currentTarget;
      const pl = S.players[Number(b.dataset.adj)];
      pl.score = Math.max(0, pl.score + Number(b.dataset.by));
      paint();
    });
    on('[data-voice]', () => { waiVoiceOn = !waiVoiceOn; if (!waiVoiceOn) waiStop(); paint(); });
    on('[data-skip]', () => { if (!g.revealed) g.queue.push(g.current); nextCharacter(true); });
    on('[data-end]', () => { waiStop(); S.view = 'end'; paint(); });
    on('[data-show]', () => { g.shown = true; waiSound('flip'); paint(); });
    on('[data-hide]', () => { g.shown = false; paint(); });
    on('[data-next]', () => nextCharacter(false));

    on('[data-nextclue]', () => {
      g.cluesShown++;
      waiSound('pop');
      paint();
      waiSay(g.current.clues[g.cluesShown - 1]);
    });
    on('[data-sayclue]', e => waiSay(g.current.clues[Number(e.currentTarget.dataset.sayclue)]));

    const ask = (q) => {
      const text = displayQ(q);
      g.asked.push({ q, text, answer: null, model: '' });
      waiSound('click');
      paint();
    };
    on('[data-ask]', e => ask(e.currentTarget.dataset.ask));
    const form = container.querySelector('[data-qform]');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const inp = form.querySelector('input');
      let q = inp.value.trim();
      if (!q) return;
      if (!/[?]$/.test(q)) q += '?';
      q = q.charAt(0).toUpperCase() + q.slice(1);
      // Typed questions are kept exactly as typed — they are already in the
      // form being played (Am I… in Hot seat, Are you… in Clues).
      g.asked.push({ q, text: q, answer: null, model: '' });
      waiSound('click');
      paint();
      const again = container.querySelector('[data-qform] input');
      if (again) again.focus();
    });
    on('[data-ans]', e => {
      const b = e.currentTarget;
      const a = g.asked[Number(b.dataset.ans)];
      a.answer = b.dataset.v;
      if (a.answer === 'maybe') a.model = 'Sometimes. / It depends.';
      else {
        a.model = waiModelAnswer(a.text, a.answer === 'yes', youForm());
      }
      waiSound(a.answer === 'yes' ? 'correct' : a.answer === 'no' ? 'wrong' : 'bell');
      paint();
      waiSay(a.model);
    });

    on('[data-right]', () => reveal({ who: g.turn, points: hotseatPoints() }));
    on('[data-wrong]', () => {
      g.wrongGuesses++;
      waiSound('wrong');
      waiSay('No, try again!');
      paint();
    });
    on('[data-winner]', e => reveal({ who: Number(e.currentTarget.dataset.winner), points: cluePoints() }));
    on('[data-giveup]', () => reveal({ nobody: true }));
  }

  // ======================================================================
  // END — podium
  // ======================================================================
  function paintEnd() {
    const ranked = S.players.map((p, i) => ({ ...p, i })).sort((a, b) => b.score - a.score);
    const top = ranked[0] ? ranked[0].score : 0;
    const medals = ['🥇', '🥈', '🥉'];
    container.innerHTML = `
      <div class="wai wai-end">
        <span class="wai-end-emoji">🏆</span>
        <h3>${top > 0 ? `${ranked.filter(p => p.score === top).map(p => waiEsc(p.name)).join(' & ')} ${ranked.filter(p => p.score === top).length > 1 ? 'win' : 'wins'}!` : 'Good game!'}</h3>
        <ol class="wai-podium">
          ${ranked.map((p, i) => `<li><span>${medals[i] || '⭐'}</span><b>${waiEsc(p.name)}</b><em>${p.score} pts</em></li>`).join('')}
        </ol>
        <div class="wai-actions">
          <button type="button" class="btn btn-primary" data-again>🔄 Jogar de novo</button>
          <button type="button" class="btn btn-ghost" data-setup>⚙️ Mudar jogo / jogadores</button>
        </div>
      </div>`;
    waiSound('win');
    if (top > 0) waiSay(`Congratulations, ${ranked[0].name}!`);
    container.querySelector('[data-again]').addEventListener('click', () => {
      const deck = deckById(S.deckId) || (S.game && S.game.deck);
      if (deck) startGame(deck);
    });
    container.querySelector('[data-setup]').addEventListener('click', () => { S.view = 'setup'; paint(); });
  }

  paint();
}

// A small confetti burst over an element, reusing the site's .confetti-piece.
function waiConfetti(el) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const colors = ['#f05d77', '#b8953a', '#a9b4a4', '#8e6d86', '#c9435c'];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 90;
    p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
    p.style.setProperty('--rot', `${Math.random() * 360}deg`);
    p.style.left = `${r.left + r.width / 2}px`;
    p.style.top = `${r.top + r.height / 2}px`;
    p.style.background = colors[i % colors.length];
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

window.openWhoAmI = openWhoAmI;
window.renderWhoAmI = renderWhoAmI;
window.waiStop = waiStop;
