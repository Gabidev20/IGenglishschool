/* ==========================================================================
   IGenglishschool — Curriculum Data (topicsData)
   ==========================================================================
   This file is the SINGLE SOURCE OF TRUTH for the curriculum. It holds no
   rendering logic — only data — so new topics (from Canva decks, new
   vocabulary sets, new grammar points) can be added here without touching
   app.js, learning.js or games.js at all.

   -------------------------------------------------------------------------
   SCHEMA — read this before adding anything
   -------------------------------------------------------------------------

   TIERS (age bands used for the curriculum tabs):
     { id, label, ages, icon, color }
     - id: 'kids' | 'juniors' | 'teens' — must match one of these 3 values.

   LEVELS (the 4 curriculum levels; each belongs to exactly one tier):
     { id, code, name, tagline, tier, color, icon, topics: [...] }
     - id: short unique slug, e.g. 'a0'. Used everywhere to look the level up.
     - tier: which TIERS.id this level's topics show up under.
     - topics: an array of Topic objects (see below).

   TOPIC — every item inside a level's `topics` array:
     {
       id: string            // unique WITHIN this level (not globally)
       title: string          // shown on the topic card and modal header
       emoji: string           // fallback shown if `image` fails/omitted
       description: string     // one line, shown on the topic card
       cefr?: string           // e.g. 'A0', 'B1', 'B2-C1' — display-only label
       image?: string          // optional real photo URL (Wikimedia Commons)
                                // — omit it entirely for abstract topics
                                //   (e.g. grammar points); the emoji fallback
                                //   is a first-class, intentional choice,
                                //   not a degraded state.
                                // Topic covers are set from the topic's first
                                // word that has a photo.
       words: Word[]           // the vocabulary/example bank — powers EVERY
                                // game (Hangman, Memory, Match-up, Balloon
                                // Pop, Word Search, Word Match, Quick Quiz,
                                // Listen & Repeat), Reading Time (fallback),
                                // Practice Arena, Phonics, and Flashcards.
                                // 12-15 items is the sweet spot.
       grammarTip?: string     // shown as a callout at the top of the
                                // Reading Time tab (learning.js's
                                // grammarTipHTML) — a short, plain-English
                                // explanation of the topic's language point.
       readingTime?: {         // authored Reading Time content. When present,
                                // learning.js's buildReadingContent() uses
                                // this verbatim instead of auto-generating
                                // sentences from `words` — real, level-
                                // appropriate writing beats a template.
         text: string,          // sentences or dialogue lines separated by
                                 // '\n' — each line renders as its own <p>.
         questions: [            // exactly 2 comprehension questions,
           {                     // rendered by the existing renderQuizList()
             prompt: string,
             options: string[],  // 3 choices
             correct: string,    // must exactly match one of `options`
           },
         ],
       }
     }

   WORD — every item inside a topic's `words` array. This exact shape is
   reused everywhere in the app (games.js's wordVisualHTML, learning.js's
   lmWordVisual, gamemaker.js, app.js's ArcadeGames) — keep new entries
   consistent with it:
     {
       id: string             // unique WITHIN this topic
       en: string              // the English word/phrase students see
       emoji: string           // ALWAYS include this — it's the fallback
                                // shown automatically if `image` 404s, and
                                // the only visual for abstract entries.
       pt?: string             // Portuguese translation/definition — shown
                                // in Flashcards (learning.js) when a student
                                // reveals the word. Purely additive: every
                                // game already works from `en`/`emoji`/
                                // `image`/`swatch` alone.
       image?: string          // optional real photo URL.
                                // ONLY give a photo to a CONCRETE NOUN.
                                // Photo lookups on adjectives and abstract
                                // nouns are wrong far more often than they
                                // are right (Wikipedia's lead image for
                                // "one" is Elvis Presley, for "sunny" it is
                                // the actress Sunny Leone) — and a wrong
                                // picture teaches the wrong word. Those
                                // entries keep the emoji on purpose.
                                // Wikimedia only serves thumbnail widths it
                                // has already rendered: paste the URL
                                // exactly as you got it, never rewrite the
                                // "/500px-" part, or it answers 400.
       swatch?: string         // optional hex color — use INSTEAD of image
                                // for topics like Colors where a solid color
                                // swatch communicates the word better than
                                // any photo could.
     }

   Grammar topics (Verb To Be, Simple Past, etc.) use this SAME Word shape —
   each "word" is simply a key example/form (e.g. { en: 'Was' }) instead of a
   noun. This means grammar topics get Hangman/Memory/Reading/Practice for
   free, with zero changes to any rendering code.

   -------------------------------------------------------------------------
   THIS FILE IS THE *SHIPPED* CURRICULUM — NOT THE LIVE ONE
   -------------------------------------------------------------------------
   contentStore.js loads after this file and merges the teacher's own edits
   (from the 🧩 Content & Games Editor, stored in localStorage) on top of
   what's here, mutating LEVELS in place. So:
     - editing THIS file changes the defaults everyone starts from;
     - topics a teacher has edited in the app keep their edited version until
       they press "Restore" on that topic (or "Reset everything").
   Words/topics added here are picked up automatically by teachers who never
   touched them.

   -------------------------------------------------------------------------
   HOW TO ADD CONTENT FROM THE CANVA DECKS
   -------------------------------------------------------------------------
   1. Pick the right LEVEL (by tier + difficulty) or add a new one.
   2. Copy an existing topic object as a template and rename id/title/emoji.
   3. Fill `words` with 4-8 entries. Emoji is mandatory; image/swatch optional.
   4. If it's a new topic id, add a matching entry to TOPIC_CATEGORY in
      learning.js (a one-line map used to phrase Reading Time sentences and
      quiz questions correctly) — it already falls back gracefully if you
      skip this step, but the generated sentences read better with it.
   5. That's it — the topic automatically gets its card, its Game/Reading/
      Practice/Flashcards tabs (and Phonics too, if the level's tier isn't
      'teens'), and a generated Lesson Plan.
   ========================================================================== */

// Unused: the curriculum's photos come from Wikimedia Commons (free to use,
// and served at fixed pre-rendered widths), pasted into `image` verbatim.
// The 🧩 Content & Games Editor's "Find real photos" button fills new words
// the same way.

const TIERS = [
  { id: 'kids', label: 'Kids', ages: '3–6', icon: '🧸', color: '#a9b4a4' },
  { id: 'juniors', label: 'Juniors', ages: '7–10', icon: '✏️', color: '#faefc2' },
  { id: 'teens', label: 'Teens', ages: '11–15', icon: '🎧', color: '#8e6d86' },
];

const LEVELS = [
  {
    "id": "a0",
    "code": "A0",
    "name": "Starters",
    "tagline": "First steps into English",
    "tier": "kids",
    "color": "#6f7d68",
    "icon": "🌱",
    "topics": [
      {
        "id": "alphabet",
        "title": "Alphabet & Basic Phonics",
        "emoji": "🔤",
        "description": "Learn letters and simple 3-letter words",
        "cefr": "A0",
        "grammarTip": "Say each letter sound before the word, like 'C-A-T, cat'. Repeat simple 3-letter words often so children hear the sounds clearly.",
        "words": [
          {
            "id": "a_apple",
            "en": "A is for Apple",
            "pt": "A de Maçã",
            "emoji": "🍎",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Pink_lady_and_cross_section.jpg/500px-Pink_lady_and_cross_section.jpg"
          },
          {
            "id": "b_ball",
            "en": "B is for Ball",
            "pt": "B de Bola",
            "emoji": "⚽",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Many_balls.jpg/500px-Many_balls.jpg"
          },
          {
            "id": "c_cat",
            "en": "C is for Cat",
            "pt": "C de Gato",
            "emoji": "🐱",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Siam_lilacpoint.jpg/500px-Siam_lilacpoint.jpg"
          },
          {
            "id": "cat",
            "en": "cat",
            "pt": "gato",
            "emoji": "🐱",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Siam_lilacpoint.jpg/500px-Siam_lilacpoint.jpg"
          },
          {
            "id": "dog",
            "en": "dog",
            "pt": "cachorro",
            "emoji": "🐶",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Huskiesatrest.jpg/500px-Huskiesatrest.jpg"
          },
          {
            "id": "sun",
            "en": "sun",
            "pt": "sol",
            "emoji": "☀️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/The_Sun_in_white_light.jpg/500px-The_Sun_in_white_light.jpg"
          },
          {
            "id": "hat",
            "en": "hat",
            "pt": "chapéu",
            "emoji": "🎩",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Chapeaux_en_peau_de_castor.jpg/500px-Chapeaux_en_peau_de_castor.jpg"
          },
          {
            "id": "bed",
            "en": "bed",
            "pt": "cama",
            "emoji": "🛏️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/2008-04-12_Freilichtmuseum_Detmold_%2811%29.jpg/500px-2008-04-12_Freilichtmuseum_Detmold_%2811%29.jpg"
          },
          {
            "id": "pig",
            "en": "pig",
            "pt": "porco",
            "emoji": "🐷",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Pig_farm_Vampula_1.jpg/500px-Pig_farm_Vampula_1.jpg"
          },
          {
            "id": "cup",
            "en": "cup",
            "pt": "xícara",
            "emoji": "☕",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Cup_and_Saucer_LACMA_47.35.6a-b_%281_of_3%29.jpg/500px-Cup_and_Saucer_LACMA_47.35.6a-b_%281_of_3%29.jpg"
          },
          {
            "id": "bus",
            "en": "bus",
            "pt": "ônibus",
            "emoji": "🚌",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/LTZ1328-19-20241030-160332.jpg/500px-LTZ1328-19-20241030-160332.jpg"
          },
          {
            "id": "pen",
            "en": "pen",
            "pt": "caneta",
            "emoji": "🖊️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/a/ae/Carandache_Ecridor.jpg"
          },
          {
            "id": "box",
            "en": "box",
            "pt": "caixa",
            "emoji": "📦",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/L%C3%A5da_-_Livrustkammaren_-_107142.tif/lossy-page1-500px-L%C3%A5da_-_Livrustkammaren_-_107142.tif.jpg"
          }
        ],
        "readingTime": {
          "text": "The cat is on the bed.\nThe dog is in a box.\nA hat is on my head.\nThe sun is big and bright.",
          "questions": [
            {
              "prompt": "Where is the cat?",
              "options": [
                "On the bed",
                "In the box",
                "On the sun"
              ],
              "correct": "On the bed"
            },
            {
              "prompt": "What is in the box?",
              "options": [
                "A hat",
                "The dog",
                "The sun"
              ],
              "correct": "The dog"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Pink_lady_and_cross_section.jpg/500px-Pink_lady_and_cross_section.jpg"
      },
      {
        "id": "greetings",
        "title": "Greetings & Introductions",
        "emoji": "👋",
        "description": "Say hello, goodbye, and your name",
        "cefr": "A0",
        "grammarTip": "Use 'Hello' or 'Hi' any time of day, and 'Goodbye' or 'Bye' when leaving. Keep greetings short and repeat them often.",
        "words": [
          {
            "id": "hello",
            "en": "Hello",
            "pt": "Olá",
            "emoji": "👋"
          },
          {
            "id": "hi",
            "en": "Hi",
            "pt": "Oi",
            "emoji": "🙋"
          },
          {
            "id": "goodbye",
            "en": "Goodbye",
            "pt": "Tchau",
            "emoji": "👋"
          },
          {
            "id": "bye",
            "en": "Bye",
            "pt": "Tchau",
            "emoji": "👋"
          },
          {
            "id": "good_morning",
            "en": "Good morning",
            "pt": "Bom dia",
            "emoji": "🌞"
          },
          {
            "id": "good_night",
            "en": "Good night",
            "pt": "Boa noite",
            "emoji": "🌙"
          },
          {
            "id": "please",
            "en": "Please",
            "pt": "Por favor",
            "emoji": "🙏"
          },
          {
            "id": "thank_you",
            "en": "Thank you",
            "pt": "Obrigado",
            "emoji": "🙏"
          },
          {
            "id": "yes",
            "en": "Yes",
            "pt": "Sim",
            "emoji": "✅"
          },
          {
            "id": "no",
            "en": "No",
            "pt": "Não",
            "emoji": "❌"
          },
          {
            "id": "my_name_is",
            "en": "My name is...",
            "pt": "Meu nome é...",
            "emoji": "🧑"
          },
          {
            "id": "whats_your_name",
            "en": "What is your name?",
            "pt": "Qual é o seu nome?",
            "emoji": "❓"
          },
          {
            "id": "friend",
            "en": "Friend",
            "pt": "Amigo",
            "emoji": "🧑‍🤝‍🧑"
          }
        ],
        "readingTime": {
          "text": "Hi! My name is Ana.\nGood morning, friend!\nThank you, and please sit down.\nGoodbye! See you soon.",
          "questions": [
            {
              "prompt": "What does Ana say first?",
              "options": [
                "Hi",
                "Goodbye",
                "No"
              ],
              "correct": "Hi"
            },
            {
              "prompt": "What do you say when you leave?",
              "options": [
                "Please",
                "Goodbye",
                "Yes"
              ],
              "correct": "Goodbye"
            }
          ]
        }
      },
      {
        "id": "numbers",
        "title": "Numbers & Counting",
        "emoji": "🔢",
        "description": "Count from one to twenty and more",
        "cefr": "A0",
        "grammarTip": "Count objects one by one with your finger while saying the number. Use ordinal words like 'first' and 'second' when lining things up.",
        "words": [
          {
            "id": "one",
            "en": "one",
            "pt": "um",
            "emoji": "1️⃣"
          },
          {
            "id": "two",
            "en": "two",
            "pt": "dois",
            "emoji": "2️⃣"
          },
          {
            "id": "three",
            "en": "three",
            "pt": "três",
            "emoji": "3️⃣"
          },
          {
            "id": "four",
            "en": "four",
            "pt": "quatro",
            "emoji": "4️⃣"
          },
          {
            "id": "five",
            "en": "five",
            "pt": "cinco",
            "emoji": "5️⃣"
          },
          {
            "id": "ten",
            "en": "ten",
            "pt": "dez",
            "emoji": "🔟"
          },
          {
            "id": "fifteen",
            "en": "fifteen",
            "pt": "quinze",
            "emoji": "🔢"
          },
          {
            "id": "twenty",
            "en": "twenty",
            "pt": "vinte",
            "emoji": "🔢"
          },
          {
            "id": "fifty",
            "en": "fifty",
            "pt": "cinquenta",
            "emoji": "🔢"
          },
          {
            "id": "hundred",
            "en": "hundred",
            "pt": "cem",
            "emoji": "💯"
          },
          {
            "id": "first",
            "en": "first",
            "pt": "primeiro",
            "emoji": "🥇"
          },
          {
            "id": "second",
            "en": "second",
            "pt": "segundo",
            "emoji": "🥈"
          },
          {
            "id": "third",
            "en": "third",
            "pt": "terceiro",
            "emoji": "🥉"
          },
          {
            "id": "count",
            "en": "count",
            "pt": "contar",
            "emoji": "🧮"
          },
          {
            "id": "number",
            "en": "number",
            "pt": "número",
            "emoji": "🔢"
          }
        ],
        "readingTime": {
          "text": "I can count to ten.\nOne, two, three, let's go!\nThe first cup is red.\nThe second cup is blue.",
          "questions": [
            {
              "prompt": "What color is the first cup?",
              "options": [
                "Red",
                "Blue",
                "Green"
              ],
              "correct": "Red"
            },
            {
              "prompt": "What number comes after two?",
              "options": [
                "One",
                "Three",
                "Ten"
              ],
              "correct": "Three"
            }
          ]
        }
      },
      {
        "id": "colorsshapes",
        "title": "Colors & Shapes",
        "emoji": "🎨",
        "description": "Name colors and simple shapes",
        "cefr": "A0",
        "grammarTip": "Use 'This is a ___' to name a color or shape, like 'This is a red circle.' Point at real objects to practice.",
        "words": [
          {
            "id": "red",
            "en": "red",
            "pt": "vermelho",
            "emoji": "🔴"
          },
          {
            "id": "blue",
            "en": "blue",
            "pt": "azul",
            "emoji": "🔵"
          },
          {
            "id": "yellow",
            "en": "yellow",
            "pt": "amarelo",
            "emoji": "🟡"
          },
          {
            "id": "green",
            "en": "green",
            "pt": "verde",
            "emoji": "🟢"
          },
          {
            "id": "orange",
            "en": "orange",
            "pt": "laranja",
            "emoji": "🟠"
          },
          {
            "id": "purple",
            "en": "purple",
            "pt": "roxo",
            "emoji": "🟣"
          },
          {
            "id": "black",
            "en": "black",
            "pt": "preto",
            "emoji": "⚫"
          },
          {
            "id": "white",
            "en": "white",
            "pt": "branco",
            "emoji": "⚪"
          },
          {
            "id": "circle",
            "en": "circle",
            "pt": "círculo",
            "emoji": "⭕"
          },
          {
            "id": "square",
            "en": "square",
            "pt": "quadrado",
            "emoji": "⬜"
          },
          {
            "id": "triangle",
            "en": "triangle",
            "pt": "triângulo",
            "emoji": "🔺"
          },
          {
            "id": "star",
            "en": "star",
            "pt": "estrela",
            "emoji": "⭐"
          },
          {
            "id": "heart",
            "en": "heart",
            "pt": "coração",
            "emoji": "❤️"
          },
          {
            "id": "rectangle",
            "en": "rectangle",
            "pt": "retângulo",
            "emoji": "▭"
          }
        ],
        "readingTime": {
          "text": "The sun is yellow and round.\nThis is a red circle.\nThe leaf is green.\nI see a blue square.",
          "questions": [
            {
              "prompt": "What color is the sun?",
              "options": [
                "Yellow",
                "Blue",
                "Black"
              ],
              "correct": "Yellow"
            },
            {
              "prompt": "What shape is red?",
              "options": [
                "Square",
                "Circle",
                "Triangle"
              ],
              "correct": "Circle"
            }
          ]
        }
      },
      {
        "id": "familyfeelings",
        "title": "Family & Feelings",
        "emoji": "👨‍👩‍👧‍👦",
        "description": "Talk about family and how you feel",
        "cefr": "A0",
        "grammarTip": "Use 'This is my ___' for family members and 'I am ___' for feelings, like 'I am happy.' Point to pictures or people while saying these.",
        "words": [
          {
            "id": "mom",
            "en": "mom",
            "pt": "mãe",
            "emoji": "👩"
          },
          {
            "id": "dad",
            "en": "dad",
            "pt": "pai",
            "emoji": "👨"
          },
          {
            "id": "baby",
            "en": "baby",
            "pt": "bebê",
            "emoji": "👶"
          },
          {
            "id": "sister",
            "en": "sister",
            "pt": "irmã",
            "emoji": "👧"
          },
          {
            "id": "brother",
            "en": "brother",
            "pt": "irmão",
            "emoji": "👦"
          },
          {
            "id": "grandma",
            "en": "grandma",
            "pt": "vovó",
            "emoji": "👵"
          },
          {
            "id": "grandpa",
            "en": "grandpa",
            "pt": "vovô",
            "emoji": "👴"
          },
          {
            "id": "family",
            "en": "family",
            "pt": "família",
            "emoji": "👨‍👩‍👧‍👦"
          },
          {
            "id": "happy",
            "en": "happy",
            "pt": "feliz",
            "emoji": "😃"
          },
          {
            "id": "sad",
            "en": "sad",
            "pt": "triste",
            "emoji": "😢"
          },
          {
            "id": "angry",
            "en": "angry",
            "pt": "bravo",
            "emoji": "😠"
          },
          {
            "id": "scared",
            "en": "scared",
            "pt": "assustado",
            "emoji": "😨"
          },
          {
            "id": "tired",
            "en": "tired",
            "pt": "cansado",
            "emoji": "😴"
          },
          {
            "id": "love",
            "en": "love",
            "pt": "amor",
            "emoji": "❤️"
          }
        ],
        "readingTime": {
          "text": "This is my mom and dad.\nMy sister is happy today.\nMy brother is a little tired.\nI love my family very much.",
          "questions": [
            {
              "prompt": "How does the sister feel?",
              "options": [
                "Happy",
                "Sad",
                "Angry"
              ],
              "correct": "Happy"
            },
            {
              "prompt": "Who is a little tired?",
              "options": [
                "Mom",
                "Brother",
                "Grandma"
              ],
              "correct": "Brother"
            }
          ]
        }
      },
      {
        "id": "animals",
        "title": "Animals & Pets",
        "emoji": "🐶",
        "description": "Farm animals, pets and wild animals",
        "cefr": "A0",
        "grammarTip": "Use 'a' before a consonant sound (a dog, a cat) and 'an' before a vowel sound (an elephant). To talk about more than one animal, add -s: one dog, two dogs.",
        "words": [
          {
            "id": "dog",
            "en": "dog",
            "pt": "cachorro",
            "emoji": "🐶",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Huskiesatrest.jpg/500px-Huskiesatrest.jpg"
          },
          {
            "id": "cat",
            "en": "cat",
            "pt": "gato",
            "emoji": "🐱",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Siam_lilacpoint.jpg/500px-Siam_lilacpoint.jpg"
          },
          {
            "id": "rabbit",
            "en": "rabbit",
            "pt": "coelho",
            "emoji": "🐰",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Oryctolagus_cuniculus_Rcdo.jpg/500px-Oryctolagus_cuniculus_Rcdo.jpg"
          },
          {
            "id": "horse",
            "en": "horse",
            "pt": "cavalo",
            "emoji": "🐴",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Nokota_Horses_cropped.jpg/500px-Nokota_Horses_cropped.jpg"
          },
          {
            "id": "cow",
            "en": "cow",
            "pt": "vaca",
            "emoji": "🐮",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Cow_%28Fleckvieh_breed%29_Oeschinensee_Slaunger_2009-07-07.jpg/500px-Cow_%28Fleckvieh_breed%29_Oeschinensee_Slaunger_2009-07-07.jpg"
          },
          {
            "id": "pig",
            "en": "pig",
            "pt": "porco",
            "emoji": "🐷",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Pig_farm_Vampula_1.jpg/500px-Pig_farm_Vampula_1.jpg"
          },
          {
            "id": "sheep",
            "en": "sheep",
            "pt": "ovelha",
            "emoji": "🐑",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Flock_of_sheep.jpg/500px-Flock_of_sheep.jpg"
          },
          {
            "id": "chicken",
            "en": "chicken",
            "pt": "galinha",
            "emoji": "🐔",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Male_and_female_chicken_sitting_together.jpg/500px-Male_and_female_chicken_sitting_together.jpg"
          },
          {
            "id": "duck",
            "en": "duck",
            "pt": "pato",
            "emoji": "🦆",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Bucephala-albeola-010.jpg/500px-Bucephala-albeola-010.jpg"
          },
          {
            "id": "fish",
            "en": "fish",
            "pt": "peixe",
            "emoji": "🐟",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Balantiocheilos_melanopterus_-_Karlsruhe_Zoo_02_%28cropped%29.jpg/500px-Balantiocheilos_melanopterus_-_Karlsruhe_Zoo_02_%28cropped%29.jpg"
          },
          {
            "id": "bird",
            "en": "bird",
            "pt": "pássaro",
            "emoji": "🐦",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kleiber_Flug.jpg/500px-Kleiber_Flug.jpg"
          },
          {
            "id": "elephant",
            "en": "elephant",
            "pt": "elefante",
            "emoji": "🐘",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/African_Bush_Elephant.jpg/500px-African_Bush_Elephant.jpg"
          },
          {
            "id": "lion",
            "en": "lion",
            "pt": "leão",
            "emoji": "🦁",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/020_The_lion_king_Snyggve_in_the_Serengeti_National_Park_Photo_by_Giles_Laurent.jpg/500px-020_The_lion_king_Snyggve_in_the_Serengeti_National_Park_Photo_by_Giles_Laurent.jpg"
          },
          {
            "id": "monkey",
            "en": "monkey",
            "pt": "macaco",
            "emoji": "🐵",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ubud_Monkey_Family.jpg/500px-Ubud_Monkey_Family.jpg"
          },
          {
            "id": "turtle",
            "en": "turtle",
            "pt": "tartaruga",
            "emoji": "🐢",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Turtle_diversity.jpg/500px-Turtle_diversity.jpg"
          }
        ],
        "readingTime": {
          "text": "I have a dog. His name is Rex.\nRex is brown and he is very happy.\nMy sister has a cat. The cat is small and white.\nAt the farm we can see a cow, a horse and three ducks.\nI love animals!",
          "questions": [
            {
              "prompt": "What is the dog's name?",
              "options": [
                "Rex",
                "Max",
                "Bob"
              ],
              "correct": "Rex"
            },
            {
              "prompt": "What colour is the cat?",
              "options": [
                "brown",
                "white",
                "black"
              ],
              "correct": "white"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Huskiesatrest.jpg/500px-Huskiesatrest.jpg"
      },
      {
        "id": "fruitsfood",
        "title": "Fruits & Food",
        "emoji": "🍎",
        "description": "Fruits, snacks and everyday food words",
        "cefr": "A0",
        "grammarTip": "Say 'I like apples' for things you like in general, and 'I want an apple' for one single thing. Use 'I don't like…' to say what you do not enjoy.",
        "words": [
          {
            "id": "apple",
            "en": "apple",
            "pt": "maçã",
            "emoji": "🍎",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Pink_lady_and_cross_section.jpg/500px-Pink_lady_and_cross_section.jpg"
          },
          {
            "id": "banana",
            "en": "banana",
            "pt": "banana",
            "emoji": "🍌",
            "image": "https://upload.wikimedia.org/wikipedia/commons/d/de/Bananavarieties.jpg"
          },
          {
            "id": "orange",
            "en": "orange",
            "pt": "laranja",
            "emoji": "🍊",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Oranges_-_whole-halved-segment.jpg/500px-Oranges_-_whole-halved-segment.jpg"
          },
          {
            "id": "grape",
            "en": "grape",
            "pt": "uva",
            "emoji": "🍇",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Grapes%2C_Rostov-on-Don%2C_Russia.jpg/500px-Grapes%2C_Rostov-on-Don%2C_Russia.jpg"
          },
          {
            "id": "strawberry",
            "en": "strawberry",
            "pt": "morango",
            "emoji": "🍓",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Garden_strawberry_%28Fragaria_%C3%97_ananassa%29_single2.jpg/500px-Garden_strawberry_%28Fragaria_%C3%97_ananassa%29_single2.jpg"
          },
          {
            "id": "watermelon",
            "en": "watermelon",
            "pt": "melancia",
            "emoji": "🍉",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Taiwan_2009_Tainan_City_Organic_Farm_Watermelon_FRD_7962.jpg/500px-Taiwan_2009_Tainan_City_Organic_Farm_Watermelon_FRD_7962.jpg"
          },
          {
            "id": "lemon",
            "en": "lemon",
            "pt": "limão",
            "emoji": "🍋",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/P1030323.JPG/500px-P1030323.JPG"
          },
          {
            "id": "pineapple",
            "en": "pineapple",
            "pt": "abacaxi",
            "emoji": "🍍",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/%E0%B4%95%E0%B5%88%E0%B4%A4%E0%B4%9A%E0%B5%8D%E0%B4%9A%E0%B4%95%E0%B5%8D%E0%B4%95.jpg/500px-%E0%B4%95%E0%B5%88%E0%B4%A4%E0%B4%9A%E0%B5%8D%E0%B4%9A%E0%B4%95%E0%B5%8D%E0%B4%95.jpg"
          },
          {
            "id": "bread",
            "en": "bread",
            "pt": "pão",
            "emoji": "🍞",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Korb_mit_Br%C3%B6tchen.JPG/500px-Korb_mit_Br%C3%B6tchen.JPG"
          },
          {
            "id": "cheese",
            "en": "cheese",
            "pt": "queijo",
            "emoji": "🧀",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Cheese_platter.jpg/500px-Cheese_platter.jpg"
          },
          {
            "id": "egg",
            "en": "egg",
            "pt": "ovo",
            "emoji": "🥚",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Adolphe_Millot_oeufs-fixed.jpg/500px-Adolphe_Millot_oeufs-fixed.jpg"
          },
          {
            "id": "milk",
            "en": "milk",
            "pt": "leite",
            "emoji": "🥛",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Glass_of_Milk_%2833657535532%29.jpg/500px-Glass_of_Milk_%2833657535532%29.jpg"
          },
          {
            "id": "rice",
            "en": "rice",
            "pt": "arroz",
            "emoji": "🍚",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/20201102.Hengnan.Hybrid_rice_Sanyou-1.6.jpg/500px-20201102.Hengnan.Hybrid_rice_Sanyou-1.6.jpg"
          },
          {
            "id": "cake",
            "en": "cake",
            "pt": "bolo",
            "emoji": "🍰",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Pound_layer_cake.jpg/500px-Pound_layer_cake.jpg"
          }
        ],
        "readingTime": {
          "text": "I am hungry. I want an apple.\nMy mum has bread, cheese and milk.\nMy favourite fruit is the banana. It is yellow and sweet.\nMy brother likes cake, but he does not like rice.\nWe eat together every day.",
          "questions": [
            {
              "prompt": "What is the writer's favourite fruit?",
              "options": [
                "the apple",
                "the banana",
                "the orange"
              ],
              "correct": "the banana"
            },
            {
              "prompt": "What does the brother NOT like?",
              "options": [
                "cake",
                "rice",
                "milk"
              ],
              "correct": "rice"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Pink_lady_and_cross_section.jpg/500px-Pink_lady_and_cross_section.jpg"
      }
    ]
  },
  {
    "id": "a1",
    "code": "A1",
    "name": "Elementary",
    "tagline": "First grammar and everyday words",
    "tier": "juniors",
    "color": "#b8953a",
    "icon": "🚀",
    "topics": [
      {
        "id": "daysmonths",
        "title": "Days & Months",
        "emoji": "📅",
        "description": "Days of the week and months of the year",
        "cefr": "A1",
        "grammarTip": "We use capital letters for the names of days and months in English, like Monday and April. We often say 'on Monday' for days and 'in April' for months. Try saying today's day and this month out loud!",
        "words": [
          {
            "id": "mon",
            "en": "Monday",
            "pt": "segunda-feira",
            "emoji": "1️⃣"
          },
          {
            "id": "tue",
            "en": "Tuesday",
            "pt": "terça-feira",
            "emoji": "2️⃣"
          },
          {
            "id": "wed",
            "en": "Wednesday",
            "pt": "quarta-feira",
            "emoji": "3️⃣"
          },
          {
            "id": "thu",
            "en": "Thursday",
            "pt": "quinta-feira",
            "emoji": "4️⃣"
          },
          {
            "id": "fri",
            "en": "Friday",
            "pt": "sexta-feira",
            "emoji": "5️⃣"
          },
          {
            "id": "sat",
            "en": "Saturday",
            "pt": "sábado",
            "emoji": "6️⃣"
          },
          {
            "id": "sun",
            "en": "Sunday",
            "pt": "domingo",
            "emoji": "7️⃣"
          },
          {
            "id": "jan",
            "en": "January",
            "pt": "janeiro",
            "emoji": "❄️"
          },
          {
            "id": "feb",
            "en": "February",
            "pt": "fevereiro",
            "emoji": "💌"
          },
          {
            "id": "mar",
            "en": "March",
            "pt": "março",
            "emoji": "🌱"
          },
          {
            "id": "apr",
            "en": "April",
            "pt": "abril",
            "emoji": "☔"
          },
          {
            "id": "may",
            "en": "May",
            "pt": "maio",
            "emoji": "🌷"
          },
          {
            "id": "jun",
            "en": "June",
            "pt": "junho",
            "emoji": "☀️"
          },
          {
            "id": "jul",
            "en": "July",
            "pt": "julho",
            "emoji": "🎇"
          }
        ],
        "readingTime": {
          "text": "Today is Monday. Tomorrow is Tuesday. My birthday is in April. I love December because of Christmas. On Sunday, my family and I go to the park.",
          "questions": [
            {
              "prompt": "What day is it today in the story?",
              "options": [
                "Monday",
                "Tuesday",
                "Sunday"
              ],
              "correct": "Monday"
            },
            {
              "prompt": "In which month is the birthday?",
              "options": [
                "December",
                "April",
                "Sunday"
              ],
              "correct": "April"
            }
          ]
        }
      },
      {
        "id": "houserooms",
        "title": "House & Rooms",
        "emoji": "🏠",
        "description": "Rooms and things you find around the house",
        "cefr": "A1",
        "grammarTip": "We use 'in' for rooms inside a house, like 'in the kitchen' or 'in the bedroom'. We say 'in the garden' for the outside space. Try naming each room in your own house in English!",
        "words": [
          {
            "id": "house",
            "en": "house",
            "pt": "casa",
            "emoji": "🏠",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Katsura_Imperial_Villa_in_Spring.jpg/500px-Katsura_Imperial_Villa_in_Spring.jpg"
          },
          {
            "id": "kitchen",
            "en": "kitchen",
            "pt": "cozinha",
            "emoji": "🍳",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/La_cuisine_%28mus%C3%A9e_dart_nouveau%2C_Riga%29_%287563655820%29.jpg/500px-La_cuisine_%28mus%C3%A9e_dart_nouveau%2C_Riga%29_%287563655820%29.jpg"
          },
          {
            "id": "bedroom",
            "en": "bedroom",
            "pt": "quarto",
            "emoji": "🛏️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Berlin_Villa_Borsig_Tegel_asv2019-08_img09.jpg/500px-Berlin_Villa_Borsig_Tegel_asv2019-08_img09.jpg"
          },
          {
            "id": "bathroom",
            "en": "bathroom",
            "pt": "banheiro",
            "emoji": "🛁",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Modern_bath_rooms_and_appliances_-_a_few_suggestions_about_plumbing_valuable_to_home_builders_or_those_about_to_remodel_their_present_dwellings._%281903%29_%2814778178805%29.jpg/500px-thumbnail.jpg"
          },
          {
            "id": "livingroom",
            "en": "living room",
            "pt": "sala de estar",
            "emoji": "🛋️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Sittingroom-edit1.jpg/500px-Sittingroom-edit1.jpg"
          },
          {
            "id": "garden",
            "en": "garden",
            "pt": "jardim",
            "emoji": "🌳",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Brooklyn_Botanic_Garden_New_York_May_2015_010.jpg/500px-Brooklyn_Botanic_Garden_New_York_May_2015_010.jpg"
          },
          {
            "id": "door",
            "en": "door",
            "pt": "porta",
            "emoji": "🚪",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/L-door.png/500px-L-door.png"
          },
          {
            "id": "window",
            "en": "window",
            "pt": "janela",
            "emoji": "🪟"
          },
          {
            "id": "roof",
            "en": "roof",
            "pt": "telhado",
            "emoji": "🏚️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Tak_-_Ystad-2022.jpg/500px-Tak_-_Ystad-2022.jpg"
          },
          {
            "id": "stairs",
            "en": "stairs",
            "pt": "escada",
            "emoji": "🪜",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/At_Victoria_and_Albert_Museum_2025_018.jpg/500px-At_Victoria_and_Albert_Museum_2025_018.jpg"
          },
          {
            "id": "table",
            "en": "table",
            "pt": "mesa",
            "emoji": "🍽️"
          },
          {
            "id": "chair",
            "en": "chair",
            "pt": "cadeira",
            "emoji": "🪑",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Set_of_fourteen_side_chairs_MET_DP110780.jpg/500px-Set_of_fourteen_side_chairs_MET_DP110780.jpg"
          },
          {
            "id": "bed",
            "en": "bed",
            "pt": "cama",
            "emoji": "🛌",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/2008-04-12_Freilichtmuseum_Detmold_%2811%29.jpg/500px-2008-04-12_Freilichtmuseum_Detmold_%2811%29.jpg"
          }
        ],
        "readingTime": {
          "text": "This is my house. My bedroom is upstairs. The kitchen is next to the living room. We eat dinner at the table. I play in the garden with my dog.",
          "questions": [
            {
              "prompt": "Where does the family eat dinner?",
              "options": [
                "In the garden",
                "At the table",
                "In the bedroom"
              ],
              "correct": "At the table"
            },
            {
              "prompt": "Where does the child play with the dog?",
              "options": [
                "In the kitchen",
                "In the bedroom",
                "In the garden"
              ],
              "correct": "In the garden"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Katsura_Imperial_Villa_in_Spring.jpg/500px-Katsura_Imperial_Villa_in_Spring.jpg"
      },
      {
        "id": "clothesweather",
        "title": "Clothes & Weather",
        "emoji": "🌦️",
        "description": "Clothes to wear in different kinds of weather",
        "cefr": "A1",
        "grammarTip": "We use 'It's' to talk about the weather, like 'It's sunny' or 'It's rainy'. We choose our clothes to match the weather - a coat for cold days and a T-shirt for hot days.",
        "words": [
          {
            "id": "shirt",
            "en": "shirt",
            "pt": "camisa",
            "emoji": "👔",
            "image": "https://upload.wikimedia.org/wikipedia/commons/0/01/Charvet_shirt.jpg"
          },
          {
            "id": "tshirt",
            "en": "T-shirt",
            "pt": "camiseta",
            "emoji": "👕",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Leipzig2012.jpg/500px-Leipzig2012.jpg"
          },
          {
            "id": "dress",
            "en": "dress",
            "pt": "vestido",
            "emoji": "👗",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Afternoon_ensemble_MET_63.212a-b_CP4.jpg/500px-Afternoon_ensemble_MET_63.212a-b_CP4.jpg"
          },
          {
            "id": "shoes",
            "en": "shoes",
            "pt": "sapatos",
            "emoji": "👟",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Skor_fr%C3%A5n_1700-_till_1960-talet_-_Nordiska_Museet_-_NMA.0056302.jpg/500px-Skor_fr%C3%A5n_1700-_till_1960-talet_-_Nordiska_Museet_-_NMA.0056302.jpg"
          },
          {
            "id": "socks",
            "en": "socks",
            "pt": "meias",
            "emoji": "🧦",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/HandKnittedWhiteLaceSock.jpg/500px-HandKnittedWhiteLaceSock.jpg"
          },
          {
            "id": "hat",
            "en": "hat",
            "pt": "chapéu",
            "emoji": "🎩",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Chapeaux_en_peau_de_castor.jpg/500px-Chapeaux_en_peau_de_castor.jpg"
          },
          {
            "id": "coat",
            "en": "coat",
            "pt": "casaco",
            "emoji": "🧥"
          },
          {
            "id": "jacket",
            "en": "jacket",
            "pt": "jaqueta",
            "emoji": "🧥",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Jacket2-1.jpg/500px-Jacket2-1.jpg"
          },
          {
            "id": "sunny",
            "en": "sunny",
            "pt": "ensolarado",
            "emoji": "☀️"
          },
          {
            "id": "rainy",
            "en": "rainy",
            "pt": "chuvoso",
            "emoji": "🌧️"
          },
          {
            "id": "cloudy",
            "en": "cloudy",
            "pt": "nublado",
            "emoji": "☁️"
          },
          {
            "id": "windy",
            "en": "windy",
            "pt": "ventoso",
            "emoji": "💨"
          },
          {
            "id": "snowy",
            "en": "snowy",
            "pt": "nevando",
            "emoji": "❄️"
          },
          {
            "id": "hot",
            "en": "hot",
            "pt": "quente",
            "emoji": "🥵"
          }
        ],
        "readingTime": {
          "text": "Mia: What's the weather today?\nTom: It's sunny and hot!\nMia: Great! I will wear my T-shirt.\nTom: I will wear my hat too.\nMia: It's rainy tomorrow.\nTom: Then I need my coat!",
          "questions": [
            {
              "prompt": "What is the weather like today?",
              "options": [
                "Cold and rainy",
                "Sunny and hot",
                "Windy and snowy"
              ],
              "correct": "Sunny and hot"
            },
            {
              "prompt": "What will Tom wear tomorrow?",
              "options": [
                "A T-shirt",
                "A coat",
                "A dress"
              ],
              "correct": "A coat"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/0/01/Charvet_shirt.jpg"
      },
      {
        "id": "pronouns",
        "title": "Grammar: Personal Pronouns",
        "emoji": "🙋",
        "description": "Small words that stand for names of people",
        "cefr": "A1",
        "grammarTip": "Personal pronouns like I, you, he, she, it, we, and they replace a person's or thing's name so we don't repeat it. Possessive words like my, your, his, and her show that something belongs to someone, for example 'his dog' means the dog belongs to him.",
        "words": [
          {
            "id": "i",
            "en": "I",
            "pt": "eu",
            "emoji": "🙋"
          },
          {
            "id": "you",
            "en": "you",
            "pt": "você",
            "emoji": "👉"
          },
          {
            "id": "he",
            "en": "he",
            "pt": "ele",
            "emoji": "👦"
          },
          {
            "id": "she",
            "en": "she",
            "pt": "ela",
            "emoji": "👧"
          },
          {
            "id": "it",
            "en": "it",
            "pt": "ele/ela (coisa)",
            "emoji": "📦"
          },
          {
            "id": "we",
            "en": "we",
            "pt": "nós",
            "emoji": "👨‍👩‍👧‍👦"
          },
          {
            "id": "they",
            "en": "they",
            "pt": "eles/elas",
            "emoji": "👥"
          },
          {
            "id": "my",
            "en": "my",
            "pt": "meu/minha",
            "emoji": "🤚"
          },
          {
            "id": "your",
            "en": "your",
            "pt": "seu/sua",
            "emoji": "👉"
          },
          {
            "id": "his",
            "en": "his",
            "pt": "dele",
            "emoji": "👦"
          },
          {
            "id": "her",
            "en": "her",
            "pt": "dela",
            "emoji": "👧"
          },
          {
            "id": "our",
            "en": "our",
            "pt": "nosso/nossa",
            "emoji": "👨‍👩‍👧‍👦"
          },
          {
            "id": "their",
            "en": "their",
            "pt": "deles/delas",
            "emoji": "👥"
          }
        ],
        "readingTime": {
          "text": "I am Mia. You are my friend. He is my brother, Tom. She is my sister, Ana. We are a happy family. My dog is small, and his name is Rex.",
          "questions": [
            {
              "prompt": "Who is Tom?",
              "options": [
                "Mia's friend",
                "Mia's brother",
                "Mia's sister"
              ],
              "correct": "Mia's brother"
            },
            {
              "prompt": "In 'his name is Rex,' who does 'his' refer to?",
              "options": [
                "Mia",
                "Tom",
                "the dog"
              ],
              "correct": "the dog"
            }
          ]
        }
      },
      {
        "id": "verbtobe",
        "title": "Grammar: Verb To Be",
        "emoji": "🟰",
        "description": "Learn am, is, are, was, and were",
        "cefr": "A1",
        "grammarTip": "The verb 'to be' changes with each pronoun: I am, you/we/they are, he/she/it is. In the past, we use 'was' for I/he/she/it and 'were' for you/we/they, like 'I was happy' or 'They were tired.'",
        "words": [
          {
            "id": "iam",
            "en": "I am",
            "pt": "eu sou/estou",
            "emoji": "🟰"
          },
          {
            "id": "youare",
            "en": "You are",
            "pt": "você é/está",
            "emoji": "🟰"
          },
          {
            "id": "heis",
            "en": "He is",
            "pt": "ele é/está",
            "emoji": "🟰"
          },
          {
            "id": "sheis",
            "en": "She is",
            "pt": "ela é/está",
            "emoji": "🟰"
          },
          {
            "id": "itis",
            "en": "It is",
            "pt": "isso é/está",
            "emoji": "🟰"
          },
          {
            "id": "weare",
            "en": "We are",
            "pt": "nós somos/estamos",
            "emoji": "🟰"
          },
          {
            "id": "theyare",
            "en": "They are",
            "pt": "eles são/estão",
            "emoji": "🟰"
          },
          {
            "id": "imnot",
            "en": "I'm not",
            "pt": "eu não sou/estou",
            "emoji": "❌"
          },
          {
            "id": "yourenot",
            "en": "You aren't",
            "pt": "você não é/está",
            "emoji": "❌"
          },
          {
            "id": "ishe",
            "en": "Is he?",
            "pt": "ele é/está?",
            "emoji": "❓"
          },
          {
            "id": "areyou",
            "en": "Are you?",
            "pt": "você é/está?",
            "emoji": "❓"
          },
          {
            "id": "was",
            "en": "was",
            "pt": "era/estava",
            "emoji": "⏪"
          },
          {
            "id": "were",
            "en": "were",
            "pt": "eram/estavam",
            "emoji": "⏪"
          },
          {
            "id": "wasshe",
            "en": "Was she?",
            "pt": "ela era/estava?",
            "emoji": "❓"
          }
        ],
        "readingTime": {
          "text": "I am seven years old. You are my best friend. He is happy today. Is she at school? Yes, she is! Yesterday, I was at the park, and it was sunny.",
          "questions": [
            {
              "prompt": "How old is the speaker?",
              "options": [
                "Six",
                "Seven",
                "Eight"
              ],
              "correct": "Seven"
            },
            {
              "prompt": "What was the weather like yesterday?",
              "options": [
                "It was rainy",
                "It was sunny",
                "It was snowy"
              ],
              "correct": "It was sunny"
            }
          ]
        }
      },
      {
        "id": "simplepresent",
        "title": "Grammar: Simple Present",
        "emoji": "⏰",
        "description": "Verbs for daily routines and habits",
        "cefr": "A1",
        "grammarTip": "In the simple present, we add -s or -es to the verb after he, she, or it, like 'goes,' 'watches,' or 'plays.' We use this tense for daily routines and habits, for example 'Tom eats breakfast every day.'",
        "words": [
          {
            "id": "plays",
            "en": "plays",
            "pt": "joga/brinca",
            "emoji": "⚽"
          },
          {
            "id": "goes",
            "en": "goes",
            "pt": "vai",
            "emoji": "🚶"
          },
          {
            "id": "watches",
            "en": "watches",
            "pt": "assiste",
            "emoji": "📺"
          },
          {
            "id": "eats",
            "en": "eats",
            "pt": "come",
            "emoji": "🍽️"
          },
          {
            "id": "drinks",
            "en": "drinks",
            "pt": "bebe",
            "emoji": "🥤"
          },
          {
            "id": "reads",
            "en": "reads",
            "pt": "lê",
            "emoji": "📖"
          },
          {
            "id": "sleeps",
            "en": "sleeps",
            "pt": "dorme",
            "emoji": "😴"
          },
          {
            "id": "likes",
            "en": "likes",
            "pt": "gosta",
            "emoji": "❤️"
          },
          {
            "id": "washes",
            "en": "washes",
            "pt": "lava",
            "emoji": "🧼"
          },
          {
            "id": "brushes",
            "en": "brushes",
            "pt": "escova",
            "emoji": "🪥"
          },
          {
            "id": "getsup",
            "en": "gets up",
            "pt": "levanta",
            "emoji": "⏰"
          },
          {
            "id": "does",
            "en": "does",
            "pt": "faz",
            "emoji": "✅"
          },
          {
            "id": "studies",
            "en": "studies",
            "pt": "estuda",
            "emoji": "📚"
          }
        ],
        "readingTime": {
          "text": "Every morning, Tom gets up at seven. He brushes his teeth and eats breakfast. Then he goes to school. In the evening, he watches TV and reads a book before bed.",
          "questions": [
            {
              "prompt": "What time does Tom get up?",
              "options": [
                "Six o'clock",
                "Seven o'clock",
                "Eight o'clock"
              ],
              "correct": "Seven o'clock"
            },
            {
              "prompt": "What does Tom do in the evening?",
              "options": [
                "He eats breakfast",
                "He watches TV and reads",
                "He goes to school"
              ],
              "correct": "He watches TV and reads"
            }
          ]
        }
      },
      {
        "id": "simplepastintro",
        "title": "Grammar: Simple Past",
        "emoji": "⏳",
        "description": "Talk about things that happened before",
        "cefr": "A1",
        "grammarTip": "To talk about the past, many verbs add -ed, like 'walked,' 'played,' and 'cooked.' The verb 'to be' becomes 'was' or 'were' in the past, for example 'It was a fun day' or 'We were happy.'",
        "words": [
          {
            "id": "walked",
            "en": "walked",
            "pt": "andou",
            "emoji": "🚶"
          },
          {
            "id": "played",
            "en": "played",
            "pt": "jogou/brincou",
            "emoji": "⚽"
          },
          {
            "id": "watched",
            "en": "watched",
            "pt": "assistiu",
            "emoji": "📺"
          },
          {
            "id": "jumped",
            "en": "jumped",
            "pt": "pulou",
            "emoji": "🤸"
          },
          {
            "id": "cleaned",
            "en": "cleaned",
            "pt": "limpou",
            "emoji": "🧹"
          },
          {
            "id": "cooked",
            "en": "cooked",
            "pt": "cozinhou",
            "emoji": "🍳"
          },
          {
            "id": "was",
            "en": "was",
            "pt": "era/estava",
            "emoji": "⏪"
          },
          {
            "id": "were",
            "en": "were",
            "pt": "eram/estavam",
            "emoji": "⏪"
          },
          {
            "id": "wasnt",
            "en": "wasn't",
            "pt": "não era/estava",
            "emoji": "❌"
          },
          {
            "id": "werent",
            "en": "weren't",
            "pt": "não eram/estavam",
            "emoji": "❌"
          },
          {
            "id": "visited",
            "en": "visited",
            "pt": "visitou",
            "emoji": "🚗"
          },
          {
            "id": "helped",
            "en": "helped",
            "pt": "ajudou",
            "emoji": "🤝"
          },
          {
            "id": "opened",
            "en": "opened",
            "pt": "abriu",
            "emoji": "🚪"
          }
        ],
        "readingTime": {
          "text": "Yesterday was Saturday. I walked to the park with my mom. We played football and jumped a lot. In the afternoon, my dad cooked dinner and I helped him. It was a fun day!",
          "questions": [
            {
              "prompt": "What did the family play in the park?",
              "options": [
                "Football",
                "Basketball",
                "Tennis"
              ],
              "correct": "Football"
            },
            {
              "prompt": "Who cooked dinner?",
              "options": [
                "The mom",
                "The dad",
                "The child"
              ],
              "correct": "The dad"
            }
          ]
        }
      },
      {
        "id": "cancant",
        "title": "Grammar: Can / Can't",
        "emoji": "💪",
        "description": "Talk about what you can and can't do",
        "cefr": "A1",
        "grammarTip": "We use 'can' to talk about ability, things we are able to do, like 'I can swim.' For the negative, we use 'can't,' like 'I can't fly.' To ask a question, we put 'can' before the subject: 'Can you swim?'",
        "words": [
          {
            "id": "canswim",
            "en": "can swim",
            "pt": "sabe nadar",
            "emoji": "🏊"
          },
          {
            "id": "cantfly",
            "en": "can't fly",
            "pt": "não consegue voar",
            "emoji": "🙅"
          },
          {
            "id": "canrun",
            "en": "can run",
            "pt": "consegue correr",
            "emoji": "🏃"
          },
          {
            "id": "canjump",
            "en": "can jump",
            "pt": "consegue pular",
            "emoji": "🤸"
          },
          {
            "id": "cansing",
            "en": "can sing",
            "pt": "sabe cantar",
            "emoji": "🎤"
          },
          {
            "id": "candance",
            "en": "can dance",
            "pt": "sabe dançar",
            "emoji": "💃"
          },
          {
            "id": "cantdrive",
            "en": "can't drive",
            "pt": "não pode dirigir",
            "emoji": "🙅"
          },
          {
            "id": "canread",
            "en": "can read",
            "pt": "sabe ler",
            "emoji": "📖"
          },
          {
            "id": "cantcook",
            "en": "can't cook",
            "pt": "não sabe cozinhar",
            "emoji": "🙅"
          },
          {
            "id": "canride",
            "en": "can ride a bike",
            "pt": "sabe andar de bicicleta",
            "emoji": "🚲"
          },
          {
            "id": "canclimb",
            "en": "can climb",
            "pt": "consegue escalar",
            "emoji": "🧗"
          },
          {
            "id": "canyouswim",
            "en": "Can you swim?",
            "pt": "Você sabe nadar?",
            "emoji": "❓"
          },
          {
            "id": "cantswim",
            "en": "can't swim",
            "pt": "não sabe nadar",
            "emoji": "🙅"
          }
        ],
        "readingTime": {
          "text": "Tom: Can you swim, Mia?\nMia: Yes, I can! I can swim very well.\nTom: Can you ride a bike?\nMia: No, I can't. I can't ride a bike yet.\nTom: Birds can fly, but people can't fly.\nMia: That's true! Let's go swimming.",
          "questions": [
            {
              "prompt": "Can Mia swim?",
              "options": [
                "Yes, she can",
                "No, she can't",
                "She doesn't know"
              ],
              "correct": "Yes, she can"
            },
            {
              "prompt": "What can't Mia do yet?",
              "options": [
                "Swim",
                "Ride a bike",
                "Sing"
              ],
              "correct": "Ride a bike"
            }
          ]
        }
      },
      {
        "id": "cardinalnumbers",
        "title": "Cardinal Numbers (1–100)",
        "emoji": "🔢",
        "description": "Counting numbers: one, two, three… one hundred",
        "cefr": "A1",
        "grammarTip": "Cardinal numbers say HOW MANY: one, two, three. From 13 to 19 we add -teen (thirteen, fourteen). For the tens we add -ty (twenty, thirty). Between 21 and 99 we use a hyphen: twenty-one, forty-five.",
        "words": [
          {
            "id": "one",
            "en": "one",
            "pt": "um",
            "emoji": "1️⃣"
          },
          {
            "id": "five",
            "en": "five",
            "pt": "cinco",
            "emoji": "5️⃣"
          },
          {
            "id": "ten",
            "en": "ten",
            "pt": "dez",
            "emoji": "🔟"
          },
          {
            "id": "eleven",
            "en": "eleven",
            "pt": "onze",
            "emoji": "🕚"
          },
          {
            "id": "twelve",
            "en": "twelve",
            "pt": "doze",
            "emoji": "🕛"
          },
          {
            "id": "thirteen",
            "en": "thirteen",
            "pt": "treze",
            "emoji": "🔢"
          },
          {
            "id": "fifteen",
            "en": "fifteen",
            "pt": "quinze",
            "emoji": "🔢"
          },
          {
            "id": "twenty",
            "en": "twenty",
            "pt": "vinte",
            "emoji": "🔢"
          },
          {
            "id": "thirty",
            "en": "thirty",
            "pt": "trinta",
            "emoji": "🔢"
          },
          {
            "id": "forty",
            "en": "forty",
            "pt": "quarenta",
            "emoji": "🔢"
          },
          {
            "id": "fifty",
            "en": "fifty",
            "pt": "cinquenta",
            "emoji": "🔢"
          },
          {
            "id": "seventy",
            "en": "seventy",
            "pt": "setenta",
            "emoji": "🔢"
          },
          {
            "id": "ninety",
            "en": "ninety",
            "pt": "noventa",
            "emoji": "🔢"
          },
          {
            "id": "onehundred",
            "en": "one hundred",
            "pt": "cem",
            "emoji": "💯"
          }
        ],
        "readingTime": {
          "text": "There are thirty students in my class.\nMy grandmother is seventy years old.\nI have twelve pencils and fifteen crayons in my bag.\nThe book has one hundred pages.\nHow many brothers do you have? I have two.",
          "questions": [
            {
              "prompt": "How old is the grandmother?",
              "options": [
                "seventy",
                "thirty",
                "fifteen"
              ],
              "correct": "seventy"
            },
            {
              "prompt": "How many pages does the book have?",
              "options": [
                "twelve",
                "thirty",
                "one hundred"
              ],
              "correct": "one hundred"
            }
          ]
        }
      },
      {
        "id": "ordinalnumbers",
        "title": "Ordinal Numbers (1st–31st)",
        "emoji": "🥇",
        "description": "Order and dates: first, second, third…",
        "cefr": "A1",
        "grammarTip": "Ordinal numbers say the ORDER or position: first, second, third. Most are the cardinal number + -th (four → fourth, six → sixth). Only 1st, 2nd and 3rd are irregular. We use them for dates: 'My birthday is on the twelfth of May.'",
        "words": [
          {
            "id": "first",
            "en": "first",
            "pt": "primeiro",
            "emoji": "🥇"
          },
          {
            "id": "second",
            "en": "second",
            "pt": "segundo",
            "emoji": "🥈"
          },
          {
            "id": "third",
            "en": "third",
            "pt": "terceiro",
            "emoji": "🥉"
          },
          {
            "id": "fourth",
            "en": "fourth",
            "pt": "quarto",
            "emoji": "4️⃣"
          },
          {
            "id": "fifth",
            "en": "fifth",
            "pt": "quinto",
            "emoji": "5️⃣"
          },
          {
            "id": "sixth",
            "en": "sixth",
            "pt": "sexto",
            "emoji": "6️⃣"
          },
          {
            "id": "seventh",
            "en": "seventh",
            "pt": "sétimo",
            "emoji": "7️⃣"
          },
          {
            "id": "eighth",
            "en": "eighth",
            "pt": "oitavo",
            "emoji": "8️⃣"
          },
          {
            "id": "ninth",
            "en": "ninth",
            "pt": "nono",
            "emoji": "9️⃣"
          },
          {
            "id": "tenth",
            "en": "tenth",
            "pt": "décimo",
            "emoji": "🔟"
          },
          {
            "id": "twelfth",
            "en": "twelfth",
            "pt": "décimo segundo",
            "emoji": "📅"
          },
          {
            "id": "twentieth",
            "en": "twentieth",
            "pt": "vigésimo",
            "emoji": "📅"
          },
          {
            "id": "twentyfirst",
            "en": "twenty-first",
            "pt": "vigésimo primeiro",
            "emoji": "📅"
          },
          {
            "id": "thirtyfirst",
            "en": "thirty-first",
            "pt": "trigésimo primeiro",
            "emoji": "📅"
          }
        ],
        "readingTime": {
          "text": "January is the first month of the year and December is the twelfth.\nMy birthday is on the third of April.\nTom finished the race in second place.\nWe live on the tenth floor of a tall building.\nToday is the twenty-first of June.",
          "questions": [
            {
              "prompt": "Which month is the twelfth?",
              "options": [
                "January",
                "June",
                "December"
              ],
              "correct": "December"
            },
            {
              "prompt": "In which place did Tom finish the race?",
              "options": [
                "first",
                "second",
                "third"
              ],
              "correct": "second"
            }
          ]
        }
      },
      {
        "id": "objectpronouns",
        "title": "Grammar: Object Pronouns",
        "emoji": "🎯",
        "description": "me, you, him, her, it, us, them",
        "cefr": "A1",
        "grammarTip": "Subject pronouns do the action (I, you, he, she, it, we, they). Object pronouns RECEIVE the action and come after the verb or after a preposition: 'She helps me', 'I talk to him', 'Give it to us'.",
        "words": [
          {
            "id": "me",
            "en": "me",
            "pt": "me / mim",
            "emoji": "🙋"
          },
          {
            "id": "you_obj",
            "en": "you",
            "pt": "você / te",
            "emoji": "👉"
          },
          {
            "id": "him",
            "en": "him",
            "pt": "ele / o / lhe",
            "emoji": "👦"
          },
          {
            "id": "her_obj",
            "en": "her",
            "pt": "ela / a / lhe",
            "emoji": "👧"
          },
          {
            "id": "it_obj",
            "en": "it",
            "pt": "o / a (coisa)",
            "emoji": "📦"
          },
          {
            "id": "us",
            "en": "us",
            "pt": "nos",
            "emoji": "👨‍👩‍👧‍👦"
          },
          {
            "id": "them",
            "en": "them",
            "pt": "eles / elas / os",
            "emoji": "👥"
          },
          {
            "id": "callme",
            "en": "Call me",
            "pt": "Me ligue",
            "emoji": "📞"
          },
          {
            "id": "helpus",
            "en": "Help us",
            "pt": "Nos ajude",
            "emoji": "🤝"
          },
          {
            "id": "iseeher",
            "en": "I see her",
            "pt": "Eu a vejo",
            "emoji": "👀"
          },
          {
            "id": "welikethem",
            "en": "We like them",
            "pt": "Nós gostamos deles",
            "emoji": "💛"
          },
          {
            "id": "givehim",
            "en": "Give him the book",
            "pt": "Dê o livro a ele",
            "emoji": "📕"
          },
          {
            "id": "withyou",
            "en": "with you",
            "pt": "com você",
            "emoji": "🫂"
          }
        ],
        "readingTime": {
          "text": "My friend Ana is very kind. I like her a lot.\nShe always helps me with my homework.\nOur teacher gives us new books every month. We thank him after every class.\nThese are my cousins. I play with them on Sundays.\nDo you want to come with us?",
          "questions": [
            {
              "prompt": "In 'I like her a lot', who does 'her' refer to?",
              "options": [
                "the teacher",
                "Ana",
                "the cousins"
              ],
              "correct": "Ana"
            },
            {
              "prompt": "Which pronoun refers to the teacher?",
              "options": [
                "him",
                "them",
                "us"
              ],
              "correct": "him"
            }
          ]
        }
      },
      {
        "id": "possessives",
        "title": "Grammar: Possessives",
        "emoji": "🔑",
        "description": "my/mine, your/yours and the 's form",
        "cefr": "A1",
        "grammarTip": "Possessive adjectives come BEFORE a noun: 'my book', 'her dog'. Possessive pronouns stand ALONE: 'That book is mine'. For people we also add 's: 'Ana's bag'. Careful: 'its' shows possession, 'it's' means 'it is'.",
        "words": [
          {
            "id": "my",
            "en": "my",
            "pt": "meu / minha",
            "emoji": "🤚"
          },
          {
            "id": "mine",
            "en": "mine",
            "pt": "meu (sozinho)",
            "emoji": "🙋"
          },
          {
            "id": "your_poss",
            "en": "your",
            "pt": "seu / sua",
            "emoji": "👉"
          },
          {
            "id": "yours",
            "en": "yours",
            "pt": "seu (sozinho)",
            "emoji": "🫵"
          },
          {
            "id": "his_poss",
            "en": "his",
            "pt": "dele",
            "emoji": "👦"
          },
          {
            "id": "hers",
            "en": "hers",
            "pt": "dela (sozinho)",
            "emoji": "👧"
          },
          {
            "id": "its",
            "en": "its",
            "pt": "dele/dela (coisa)",
            "emoji": "📦"
          },
          {
            "id": "our",
            "en": "our",
            "pt": "nosso / nossa",
            "emoji": "👨‍👩‍👧‍👦"
          },
          {
            "id": "ours",
            "en": "ours",
            "pt": "nosso (sozinho)",
            "emoji": "🏠"
          },
          {
            "id": "their_poss",
            "en": "their",
            "pt": "deles / delas",
            "emoji": "👥"
          },
          {
            "id": "theirs",
            "en": "theirs",
            "pt": "deles (sozinho)",
            "emoji": "👪"
          },
          {
            "id": "anasbag",
            "en": "Ana's bag",
            "pt": "a bolsa da Ana",
            "emoji": "👜"
          },
          {
            "id": "thedogstail",
            "en": "the dog's tail",
            "pt": "o rabo do cachorro",
            "emoji": "🐕"
          },
          {
            "id": "whose",
            "en": "Whose is this?",
            "pt": "De quem é isto?",
            "emoji": "❓"
          }
        ],
        "readingTime": {
          "text": "This is my room and that is my sister's room.\nHer room is bigger than mine, but my window is nicer.\nWhose bag is on the table? It is Ana's bag, not yours.\nThe dog is sleeping in its bed.\nOur house is small, but we love it. Is that car theirs?",
          "questions": [
            {
              "prompt": "Whose room is bigger?",
              "options": [
                "the writer's room",
                "the sister's room",
                "Ana's room"
              ],
              "correct": "the sister's room"
            },
            {
              "prompt": "Whose bag is on the table?",
              "options": [
                "Ana's",
                "yours",
                "the dog's"
              ],
              "correct": "Ana's"
            }
          ]
        }
      },
      {
        "id": "prepositionsplace",
        "title": "Grammar: Prepositions of Place",
        "emoji": "📍",
        "description": "in, on, under, behind, between and more",
        "cefr": "A1",
        "grammarTip": "Prepositions of place say WHERE something is. Use 'in' for inside a closed space (in the box), 'on' for a surface (on the table) and 'at' for a point or place (at school). 'Between' needs two things; 'among' needs three or more.",
        "words": [
          {
            "id": "in",
            "en": "in",
            "pt": "dentro de / em",
            "emoji": "📦"
          },
          {
            "id": "on",
            "en": "on",
            "pt": "sobre / em cima de",
            "emoji": "🔛"
          },
          {
            "id": "under",
            "en": "under",
            "pt": "embaixo de",
            "emoji": "⬇️"
          },
          {
            "id": "behind",
            "en": "behind",
            "pt": "atrás de",
            "emoji": "🙈"
          },
          {
            "id": "infrontof",
            "en": "in front of",
            "pt": "na frente de",
            "emoji": "🚶"
          },
          {
            "id": "between",
            "en": "between",
            "pt": "entre (dois)",
            "emoji": "↔️"
          },
          {
            "id": "nextto",
            "en": "next to",
            "pt": "ao lado de",
            "emoji": "👫"
          },
          {
            "id": "above",
            "en": "above",
            "pt": "acima de",
            "emoji": "⬆️"
          },
          {
            "id": "below",
            "en": "below",
            "pt": "abaixo de",
            "emoji": "🔽"
          },
          {
            "id": "near",
            "en": "near",
            "pt": "perto de",
            "emoji": "📍"
          },
          {
            "id": "inside",
            "en": "inside",
            "pt": "dentro",
            "emoji": "🏠"
          },
          {
            "id": "outside",
            "en": "outside",
            "pt": "fora",
            "emoji": "🌳"
          },
          {
            "id": "opposite",
            "en": "opposite",
            "pt": "em frente a",
            "emoji": "🔁"
          },
          {
            "id": "atschool",
            "en": "at school",
            "pt": "na escola",
            "emoji": "🏫"
          }
        ],
        "readingTime": {
          "text": "My bag is on the chair and my shoes are under the bed.\nThe cat is sleeping inside the box.\nThere is a big tree behind our house and a small garden in front of it.\nThe bank is between the bakery and the post office.\nMy best friend sits next to me at school.",
          "questions": [
            {
              "prompt": "Where are the shoes?",
              "options": [
                "on the chair",
                "under the bed",
                "inside the box"
              ],
              "correct": "under the bed"
            },
            {
              "prompt": "Where is the bank?",
              "options": [
                "behind the house",
                "next to the tree",
                "between the bakery and the post office"
              ],
              "correct": "between the bakery and the post office"
            }
          ]
        }
      },
      {
        "id": "presentcontinuous",
        "title": "Grammar: Present Continuous",
        "emoji": "🏃",
        "description": "am/is/are + verb-ing — happening now",
        "cefr": "A1",
        "grammarTip": "Present Continuous = am/is/are + verb-ing. Use it for actions happening right now ('She is reading') or around now ('I am studying English this year'). Add -ing to the verb; drop a final silent -e (write → writing).",
        "words": [
          {
            "id": "amreading",
            "en": "I am reading",
            "pt": "Eu estou lendo",
            "emoji": "📖"
          },
          {
            "id": "isplaying",
            "en": "He is playing",
            "pt": "Ele está jogando",
            "emoji": "⚽"
          },
          {
            "id": "areeating",
            "en": "They are eating",
            "pt": "Eles estão comendo",
            "emoji": "🍽️"
          },
          {
            "id": "iswriting",
            "en": "She is writing",
            "pt": "Ela está escrevendo",
            "emoji": "✍️"
          },
          {
            "id": "arerunning",
            "en": "We are running",
            "pt": "Nós estamos correndo",
            "emoji": "🏃"
          },
          {
            "id": "isnotsleeping",
            "en": "It is not sleeping",
            "pt": "Não está dormindo",
            "emoji": "😴"
          },
          {
            "id": "areyoulistening",
            "en": "Are you listening?",
            "pt": "Você está ouvindo?",
            "emoji": "👂"
          },
          {
            "id": "working",
            "en": "working",
            "pt": "trabalhando",
            "emoji": "💼"
          },
          {
            "id": "studying",
            "en": "studying",
            "pt": "estudando",
            "emoji": "📚"
          },
          {
            "id": "singing",
            "en": "singing",
            "pt": "cantando",
            "emoji": "🎤"
          },
          {
            "id": "cooking_pc",
            "en": "cooking",
            "pt": "cozinhando",
            "emoji": "🍳"
          },
          {
            "id": "swimming_pc",
            "en": "swimming",
            "pt": "nadando",
            "emoji": "🏊"
          },
          {
            "id": "rightnow",
            "en": "right now",
            "pt": "agora mesmo",
            "emoji": "⏰"
          }
        ],
        "readingTime": {
          "text": "Look at my family right now!\nMy mother is cooking in the kitchen and my father is reading the newspaper.\nMy brother and I are playing a video game.\nThe dog is sleeping under the table. The birds are singing outside.\nWhat are you doing right now?",
          "questions": [
            {
              "prompt": "What is the mother doing?",
              "options": [
                "reading",
                "cooking",
                "singing"
              ],
              "correct": "cooking"
            },
            {
              "prompt": "Where is the dog sleeping?",
              "options": [
                "under the table",
                "in the kitchen",
                "outside"
              ],
              "correct": "under the table"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "a2",
    "code": "A2",
    "name": "Pre-Intermediate",
    "tagline": "Talking about the wider world",
    "tier": "teens",
    "color": "#8e6d86",
    "icon": "⚡",
    "topics": [
      {
        "id": "travel",
        "title": "Travel & Transportation",
        "emoji": "✈️",
        "description": "Getting around and exploring new places",
        "cefr": "A2",
        "grammarTip": "We often use prepositions like 'at', 'in', and 'on' with travel words: 'at the airport', 'on the platform', 'in the suitcase'. We also use 'go by' + transport, like 'go by train' or 'go by plane'. Try making your own sentence, such as 'I am going to the airport by taxi.'",
        "words": [
          {
            "id": "airport",
            "en": "airport",
            "pt": "aeroporto",
            "emoji": "🛫",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Airport_infrastructure.png/500px-Airport_infrastructure.png"
          },
          {
            "id": "ticket",
            "en": "ticket",
            "pt": "bilhete",
            "emoji": "🎫"
          },
          {
            "id": "passport",
            "en": "passport",
            "pt": "passaporte",
            "emoji": "🛂",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Passports-assorted.jpg/500px-Passports-assorted.jpg"
          },
          {
            "id": "suitcase",
            "en": "suitcase",
            "pt": "mala",
            "emoji": "🧳",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Suitcase1.jpg/500px-Suitcase1.jpg"
          },
          {
            "id": "trainstation",
            "en": "train station",
            "pt": "estação de trem",
            "emoji": "🚉",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Milan_CentralStation_016_4294.jpg/500px-Milan_CentralStation_016_4294.jpg"
          },
          {
            "id": "platform",
            "en": "platform",
            "pt": "plataforma",
            "emoji": "🚏"
          },
          {
            "id": "delay",
            "en": "delay",
            "pt": "atraso",
            "emoji": "⏰"
          },
          {
            "id": "boardingpass",
            "en": "boarding pass",
            "pt": "cartão de embarque",
            "emoji": "🎟️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Air_Canada_Boarding_Pass_20170911.jpg/500px-Air_Canada_Boarding_Pass_20170911.jpg"
          },
          {
            "id": "journey",
            "en": "journey",
            "pt": "viagem",
            "emoji": "🗺️"
          },
          {
            "id": "destination",
            "en": "destination",
            "pt": "destino",
            "emoji": "📍"
          },
          {
            "id": "backpack",
            "en": "backpack",
            "pt": "mochila",
            "emoji": "🎒",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Rucksack1.jpg/500px-Rucksack1.jpg"
          },
          {
            "id": "tourist",
            "en": "tourist",
            "pt": "turista",
            "emoji": "📸"
          },
          {
            "id": "flight",
            "en": "flight",
            "pt": "voo",
            "emoji": "✈️"
          },
          {
            "id": "map",
            "en": "map",
            "pt": "mapa",
            "emoji": "🧭",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/World_Map_1689.JPG/500px-World_Map_1689.JPG"
          }
        ],
        "readingTime": {
          "text": "Marta: Do you have your passport and boarding pass?\nLucas: Yes, they're in my backpack with my ticket.\nMarta: Great! Our flight is at gate 12, but there's a delay.\nLucas: Oh no! I hope we don't miss our connection.\nMarta: Don't worry, our journey to the destination is still on time.\nLucas: I can't wait to be a tourist in Rome!",
          "questions": [
            {
              "prompt": "What does Lucas have in his backpack?",
              "options": [
                "His passport and ticket",
                "His suitcase and map",
                "His camera and phone"
              ],
              "correct": "His passport and ticket"
            },
            {
              "prompt": "What is the problem with the flight?",
              "options": [
                "It is cancelled",
                "There is a delay",
                "They lost the tickets"
              ],
              "correct": "There is a delay"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Airport_infrastructure.png/500px-Airport_infrastructure.png"
      },
      {
        "id": "jobs",
        "title": "Jobs & Daily Work",
        "emoji": "💼",
        "description": "Different jobs and everyday work routines",
        "cefr": "A2",
        "grammarTip": "We use the present simple to talk about jobs and daily routines: 'He works at a hospital' or 'She starts her shift at 8 a.m.' Remember to add -s for he/she/it: 'work' becomes 'works'. Try describing your own daily routine using these job words.",
        "words": [
          {
            "id": "teacher",
            "en": "teacher",
            "pt": "professor(a)",
            "emoji": "👩‍🏫",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/A_public_high_school_teacher_in_a_classroom_in_the_United_States_08.jpg/500px-A_public_high_school_teacher_in_a_classroom_in_the_United_States_08.jpg"
          },
          {
            "id": "doctor",
            "en": "doctor",
            "pt": "médico(a)",
            "emoji": "🩺"
          },
          {
            "id": "engineer",
            "en": "engineer",
            "pt": "engenheiro(a)",
            "emoji": "👷",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Kitty_Joyner_-_Electrical_Engineer_-_GPN-2000-001933.jpg/500px-Kitty_Joyner_-_Electrical_Engineer_-_GPN-2000-001933.jpg"
          },
          {
            "id": "chef",
            "en": "chef",
            "pt": "chef de cozinha",
            "emoji": "👨‍🍳"
          },
          {
            "id": "office",
            "en": "office",
            "pt": "escritório",
            "emoji": "🏢"
          },
          {
            "id": "salary",
            "en": "salary",
            "pt": "salário",
            "emoji": "💰"
          },
          {
            "id": "schedule",
            "en": "schedule",
            "pt": "horário",
            "emoji": "🗓️"
          },
          {
            "id": "meeting",
            "en": "meeting",
            "pt": "reunião",
            "emoji": "🧑‍💼",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Sitzung_von_Wiki_Loves_Broadcast_im_Kontor_Hamburg.jpg/500px-Sitzung_von_Wiki_Loves_Broadcast_im_Kontor_Hamburg.jpg"
          },
          {
            "id": "colleague",
            "en": "colleague",
            "pt": "colega de trabalho",
            "emoji": "🤝"
          },
          {
            "id": "shift",
            "en": "shift",
            "pt": "turno",
            "emoji": "⏱️"
          },
          {
            "id": "boss",
            "en": "boss",
            "pt": "chefe",
            "emoji": "🧑‍💻"
          },
          {
            "id": "task",
            "en": "task",
            "pt": "tarefa",
            "emoji": "📝"
          },
          {
            "id": "break",
            "en": "break",
            "pt": "pausa",
            "emoji": "☕"
          },
          {
            "id": "deadline",
            "en": "deadline",
            "pt": "prazo",
            "emoji": "⏳"
          }
        ],
        "readingTime": {
          "text": "Ana: What does your mom do, Pedro?\nPedro: She's an engineer. She works long shifts at a big office.\nAna: Does she like her colleagues?\nPedro: Yes, but she never has a break during a busy meeting!\nAna: My dad is a chef. His schedule changes every week.\nPedro: That sounds tiring, but I bet his salary is good!",
          "questions": [
            {
              "prompt": "What is Pedro's mom's job?",
              "options": [
                "Teacher",
                "Engineer",
                "Chef"
              ],
              "correct": "Engineer"
            },
            {
              "prompt": "What is true about Pedro's mom during a meeting?",
              "options": [
                "She takes a long break",
                "She never has a break",
                "She goes home early"
              ],
              "correct": "She never has a break"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/A_public_high_school_teacher_in_a_classroom_in_the_United_States_08.jpg/500px-A_public_high_school_teacher_in_a_classroom_in_the_United_States_08.jpg"
      },
      {
        "id": "health",
        "title": "Health & The Human Body",
        "emoji": "🩺",
        "description": "Body parts, symptoms, and staying healthy",
        "cefr": "A2",
        "grammarTip": "When we talk about how we feel, we use 'have' with symptoms: 'I have a headache' or 'She has a fever.' We use 'should' to give health advice: 'You should rest' or 'You shouldn't skip breakfast.' Practice describing symptoms and giving advice with these words.",
        "words": [
          {
            "id": "headache",
            "en": "headache",
            "pt": "dor de cabeça",
            "emoji": "🤕"
          },
          {
            "id": "stomach",
            "en": "stomach",
            "pt": "estômago",
            "emoji": "🤢",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Gray1046.svg/500px-Gray1046.svg.png"
          },
          {
            "id": "fever",
            "en": "fever",
            "pt": "febre",
            "emoji": "🌡️"
          },
          {
            "id": "cough",
            "en": "cough",
            "pt": "tosse",
            "emoji": "🤧",
            "image": "https://upload.wikimedia.org/wikipedia/commons/f/f9/Toux_impromptue.jpg"
          },
          {
            "id": "medicine",
            "en": "medicine",
            "pt": "remédio",
            "emoji": "💊"
          },
          {
            "id": "nurse",
            "en": "nurse",
            "pt": "enfermeiro(a)",
            "emoji": "👩‍⚕️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Nurse_checks_blood_pressure.jpg/500px-Nurse_checks_blood_pressure.jpg"
          },
          {
            "id": "injury",
            "en": "injury",
            "pt": "lesão",
            "emoji": "🤕"
          },
          {
            "id": "bandage",
            "en": "bandage",
            "pt": "atadura",
            "emoji": "🩹"
          },
          {
            "id": "exercise",
            "en": "exercise",
            "pt": "exercício",
            "emoji": "🏃"
          },
          {
            "id": "healthy",
            "en": "healthy",
            "pt": "saudável",
            "emoji": "🥗"
          },
          {
            "id": "symptom",
            "en": "symptom",
            "pt": "sintoma",
            "emoji": "📋"
          },
          {
            "id": "rest",
            "en": "rest",
            "pt": "descanso",
            "emoji": "🛌"
          },
          {
            "id": "throat",
            "en": "throat",
            "pt": "garganta",
            "emoji": "😷",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Throat_Diagram.png/500px-Throat_Diagram.png"
          },
          {
            "id": "appointment",
            "en": "appointment",
            "pt": "consulta",
            "emoji": "📅"
          }
        ],
        "readingTime": {
          "text": "Sofia: I have a terrible headache and a sore throat.\nDoctor: Do you also have a fever or a cough?\nSofia: Yes, I have a small fever too.\nDoctor: You should take this medicine and get some rest.\nSofia: Should I still do exercise this week?\nDoctor: No, you shouldn't. Rest is more important right now.",
          "questions": [
            {
              "prompt": "What symptoms does Sofia have?",
              "options": [
                "A headache and sore throat",
                "A stomach ache and cough",
                "A bandage and injury"
              ],
              "correct": "A headache and sore throat"
            },
            {
              "prompt": "What does the doctor say about exercise?",
              "options": [
                "She should exercise every day",
                "She shouldn't exercise this week",
                "She must exercise twice"
              ],
              "correct": "She shouldn't exercise this week"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Gray1046.svg/500px-Gray1046.svg.png"
      },
      {
        "id": "hobbies",
        "title": "Hobbies & Free Time",
        "emoji": "🎨",
        "description": "Fun activities we do in our free time",
        "cefr": "A2",
        "grammarTip": "We use love/like/enjoy + verb-ing to talk about hobbies: 'I enjoy painting' or 'She loves cycling.' Notice the verb after these expressions always ends in -ing. Try making sentences about your own free-time activities.",
        "words": [
          {
            "id": "painting",
            "en": "painting",
            "pt": "pintura",
            "emoji": "🎨"
          },
          {
            "id": "guitar",
            "en": "guitar",
            "pt": "violão",
            "emoji": "🎸",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/GuitareClassique5.png/500px-GuitareClassique5.png"
          },
          {
            "id": "skateboard",
            "en": "skateboard",
            "pt": "skate",
            "emoji": "🛹",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Hainerberg_Skate_Park_Now_Open_%286317086%29.jpg/500px-Hainerberg_Skate_Park_Now_Open_%286317086%29.jpg"
          },
          {
            "id": "videogame",
            "en": "video game",
            "pt": "videogame",
            "emoji": "🎮",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Universum_TV_Multispiel_2006.jpg/500px-Universum_TV_Multispiel_2006.jpg"
          },
          {
            "id": "photography",
            "en": "photography",
            "pt": "fotografia",
            "emoji": "📷",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Photographer_Photographing_Nevada_Mountains.jpg/500px-Photographer_Photographing_Nevada_Mountains.jpg"
          },
          {
            "id": "boardgame",
            "en": "board game",
            "pt": "jogo de tabuleiro",
            "emoji": "🎲",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/US_Navy_110713-N-NT881-124_Personnel_Specialist_2nd_Class_James_Vail%2C_left%2C_and_Boatswain%27s_Mate_2nd_Class_Nathaniel_Eaton_play_board_games_with_ch.jpg/500px-US_Navy_110713-N-NT881-124_Personnel_Specialist_2nd_Class_James_Vail%2C_left%2C_and_Boatswain%27s_Mate_2nd_Class_Nathaniel_Eaton_play_board_games_with_ch.jpg"
          },
          {
            "id": "reading",
            "en": "reading",
            "pt": "leitura",
            "emoji": "📚"
          },
          {
            "id": "swimming",
            "en": "swimming",
            "pt": "natação",
            "emoji": "🏊",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Depart4x100.jpg/500px-Depart4x100.jpg"
          },
          {
            "id": "collecting",
            "en": "collecting",
            "pt": "colecionar",
            "emoji": "🗃️"
          },
          {
            "id": "dancing",
            "en": "dancing",
            "pt": "dança",
            "emoji": "💃",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Two_dancers.jpg/500px-Two_dancers.jpg"
          },
          {
            "id": "cycling",
            "en": "cycling",
            "pt": "ciclismo",
            "emoji": "🚴",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Cycliste_%C3%A0_place_d%27Italie-Paris_crop.jpg/500px-Cycliste_%C3%A0_place_d%27Italie-Paris_crop.jpg"
          },
          {
            "id": "drawing",
            "en": "drawing",
            "pt": "desenho",
            "emoji": "✏️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Da_Vinci_Vitruve_Luc_Viatour.jpg/500px-Da_Vinci_Vitruve_Luc_Viatour.jpg"
          },
          {
            "id": "karate",
            "en": "karate",
            "pt": "caratê",
            "emoji": "🥋",
            "image": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Hanashiro_Chomo.jpg"
          },
          {
            "id": "team",
            "en": "team",
            "pt": "time",
            "emoji": "👥"
          }
        ],
        "readingTime": {
          "text": "Ben: What do you like doing in your free time?\nMia: I enjoy painting and playing the guitar. What about you?\nBen: I love skateboarding with my team after school.\nMia: Do you also like video games?\nBen: Yes, but I prefer cycling and swimming outside.\nMia: That sounds fun! Maybe we can go cycling together this weekend.",
          "questions": [
            {
              "prompt": "What does Mia enjoy doing?",
              "options": [
                "Painting and guitar",
                "Skateboarding and karate",
                "Swimming and reading"
              ],
              "correct": "Painting and guitar"
            },
            {
              "prompt": "What does Ben suggest at the end?",
              "options": [
                "Playing video games together",
                "Going cycling together",
                "Joining a dance class"
              ],
              "correct": "Going cycling together"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/GuitareClassique5.png/500px-GuitareClassique5.png"
      },
      {
        "id": "environment",
        "title": "Environment & Animals",
        "emoji": "🌍",
        "description": "Nature, wildlife, and protecting our planet",
        "cefr": "A2",
        "grammarTip": "We often use 'should' and 'must' to talk about protecting the environment: 'We should recycle more' or 'We must protect endangered animals.' These modal verbs give advice or strong rules. Try writing one rule that could help the planet.",
        "words": [
          {
            "id": "pollution",
            "en": "pollution",
            "pt": "poluição",
            "emoji": "🏭",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Air_pollution3.jpg/500px-Air_pollution3.jpg"
          },
          {
            "id": "recycle",
            "en": "recycle",
            "pt": "reciclar",
            "emoji": "♻️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/RecyclingSymbolGreen.png/500px-RecyclingSymbolGreen.png"
          },
          {
            "id": "endangered",
            "en": "endangered",
            "pt": "em perigo de extinção",
            "emoji": "🐾"
          },
          {
            "id": "forest",
            "en": "forest",
            "pt": "floresta",
            "emoji": "🌳",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Aerial_view_of_the_Amazon_Rainforest.jpg/500px-Aerial_view_of_the_Amazon_Rainforest.jpg"
          },
          {
            "id": "ocean",
            "en": "ocean",
            "pt": "oceano",
            "emoji": "🌊",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Pacific_Ocean_as_viewed_from_GOES-18_on_September_23%2C_2023.jpg/500px-Pacific_Ocean_as_viewed_from_GOES-18_on_September_23%2C_2023.jpg"
          },
          {
            "id": "wildlife",
            "en": "wildlife",
            "pt": "vida selvagem",
            "emoji": "🦁",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Wildlife_at_Maasai_Mara_%28Lion%29.jpg/500px-Wildlife_at_Maasai_Mara_%28Lion%29.jpg"
          },
          {
            "id": "climate",
            "en": "climate",
            "pt": "clima",
            "emoji": "🌦️"
          },
          {
            "id": "habitat",
            "en": "habitat",
            "pt": "habitat",
            "emoji": "🏞️"
          },
          {
            "id": "plastic",
            "en": "plastic",
            "pt": "plástico",
            "emoji": "🥤",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Plastic_household_items.jpg/500px-Plastic_household_items.jpg"
          },
          {
            "id": "species",
            "en": "species",
            "pt": "espécie",
            "emoji": "🐢"
          },
          {
            "id": "protect",
            "en": "protect",
            "pt": "proteger",
            "emoji": "🛡️"
          },
          {
            "id": "rainforest",
            "en": "rainforest",
            "pt": "floresta tropical",
            "emoji": "🌴",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Chiapas_Rainforest_crop.jpg/500px-Chiapas_Rainforest_crop.jpg"
          },
          {
            "id": "pollute",
            "en": "pollute",
            "pt": "poluir",
            "emoji": "💨"
          },
          {
            "id": "conservation",
            "en": "conservation",
            "pt": "conservação",
            "emoji": "🌱"
          }
        ],
        "readingTime": {
          "text": "Every day, pollution damages our forests and oceans. Many endangered species, like sea turtles, are losing their natural habitat because of plastic waste. Scientists say the climate is changing faster than before, so wildlife conservation is more important than ever. We should recycle more and use less plastic at home. If people don't protect the rainforest soon, many animals could disappear forever. Small actions, like recycling, can really help our planet.",
          "questions": [
            {
              "prompt": "Why are sea turtles losing their habitat?",
              "options": [
                "Because of plastic waste",
                "Because of too many tourists",
                "Because of cold weather"
              ],
              "correct": "Because of plastic waste"
            },
            {
              "prompt": "According to the text, what should we do?",
              "options": [
                "Travel more by plane",
                "Recycle more and use less plastic",
                "Stop studying about animals"
              ],
              "correct": "Recycle more and use less plastic"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Air_pollution3.jpg/500px-Air_pollution3.jpg"
      },
      {
        "id": "personality",
        "title": "Feelings & Personality Descriptions",
        "emoji": "😊",
        "description": "Words to describe emotions and character",
        "cefr": "A2",
        "grammarTip": "We use 'be' + adjective to describe feelings and personality: 'I am nervous' or 'She is very generous.' Some feelings change quickly (nervous, worried), while personality words describe someone all the time (shy, honest). Try describing yourself with three of these adjectives.",
        "words": [
          {
            "id": "shy",
            "en": "shy",
            "pt": "tímido(a)",
            "emoji": "😳"
          },
          {
            "id": "confident",
            "en": "confident",
            "pt": "confiante",
            "emoji": "😎"
          },
          {
            "id": "generous",
            "en": "generous",
            "pt": "generoso(a)",
            "emoji": "🎁"
          },
          {
            "id": "curious",
            "en": "curious",
            "pt": "curioso(a)",
            "emoji": "🧐"
          },
          {
            "id": "nervous",
            "en": "nervous",
            "pt": "nervoso(a)",
            "emoji": "😬"
          },
          {
            "id": "friendly",
            "en": "friendly",
            "pt": "amigável",
            "emoji": "🙂"
          },
          {
            "id": "jealous",
            "en": "jealous",
            "pt": "com ciúmes",
            "emoji": "😒"
          },
          {
            "id": "patient",
            "en": "patient",
            "pt": "paciente",
            "emoji": "⏳"
          },
          {
            "id": "honest",
            "en": "honest",
            "pt": "honesto(a)",
            "emoji": "😇"
          },
          {
            "id": "stubborn",
            "en": "stubborn",
            "pt": "teimoso(a)",
            "emoji": "😤"
          },
          {
            "id": "cheerful",
            "en": "cheerful",
            "pt": "alegre",
            "emoji": "😄"
          },
          {
            "id": "embarrassed",
            "en": "embarrassed",
            "pt": "envergonhado(a)",
            "emoji": "🙈"
          },
          {
            "id": "proud",
            "en": "proud",
            "pt": "orgulhoso(a)",
            "emoji": "😌"
          },
          {
            "id": "worried",
            "en": "worried",
            "pt": "preocupado(a)",
            "emoji": "😟"
          }
        ],
        "readingTime": {
          "text": "Julia: Why are you so nervous today, Tom?\nTom: I have to give a presentation, and I'm quite shy.\nJulia: Don't worry, you're one of the most confident people I know!\nTom: Thanks, but sometimes I feel embarrassed speaking in front of the class.\nJulia: Just be honest and speak slowly. Everyone will be patient with you.\nTom: You're right. I feel less worried now.",
          "questions": [
            {
              "prompt": "Why is Tom nervous?",
              "options": [
                "He has a test",
                "He has to give a presentation",
                "He lost his homework"
              ],
              "correct": "He has to give a presentation"
            },
            {
              "prompt": "How does Julia describe Tom?",
              "options": [
                "Shy and jealous",
                "Confident",
                "Stubborn and proud"
              ],
              "correct": "Confident"
            }
          ]
        }
      },
      {
        "id": "pastcontinuous",
        "title": "Grammar: Past Continuous",
        "emoji": "⏳",
        "description": "Actions in progress in the past",
        "cefr": "A2",
        "grammarTip": "We use the past continuous (was/were + verb-ing) for an action in progress at a past moment: 'I was watching TV at 8 p.m.' We often use 'while' or 'when' to connect two past actions: 'I was cooking while she was studying' or 'The phone rang when I was sleeping.' 'While' usually joins two continuous actions, and 'when' often introduces a shorter, interrupting action.",
        "words": [
          {
            "id": "waswatching",
            "en": "was watching",
            "pt": "estava assistindo",
            "emoji": "📺"
          },
          {
            "id": "wascooking",
            "en": "was cooking",
            "pt": "estava cozinhando",
            "emoji": "🍳"
          },
          {
            "id": "wereplaying",
            "en": "were playing",
            "pt": "estavam jogando",
            "emoji": "⚽"
          },
          {
            "id": "wassleeping",
            "en": "was sleeping",
            "pt": "estava dormindo",
            "emoji": "😴"
          },
          {
            "id": "werestudying",
            "en": "were studying",
            "pt": "estavam estudando",
            "emoji": "📖"
          },
          {
            "id": "wasraining",
            "en": "was raining",
            "pt": "estava chovendo",
            "emoji": "🌧️"
          },
          {
            "id": "waswalking",
            "en": "was walking",
            "pt": "estava andando",
            "emoji": "🚶"
          },
          {
            "id": "weretalking",
            "en": "were talking",
            "pt": "estavam conversando",
            "emoji": "💬"
          },
          {
            "id": "wasreading",
            "en": "was reading",
            "pt": "estava lendo",
            "emoji": "📕"
          },
          {
            "id": "waslistening",
            "en": "was listening",
            "pt": "estava ouvindo",
            "emoji": "🎧"
          },
          {
            "id": "werewaiting",
            "en": "were waiting",
            "pt": "estavam esperando",
            "emoji": "⏱️"
          },
          {
            "id": "wasdriving",
            "en": "was driving",
            "pt": "estava dirigindo",
            "emoji": "🚗"
          },
          {
            "id": "wassinging",
            "en": "was singing",
            "pt": "estava cantando",
            "emoji": "🎤"
          },
          {
            "id": "wererunning",
            "en": "were running",
            "pt": "estavam correndo",
            "emoji": "🏃"
          }
        ],
        "readingTime": {
          "text": "Yesterday afternoon, Leo was doing his homework while his sister was practicing the piano. Suddenly, it started raining outside. Leo was listening to music when his mom called him for dinner. Meanwhile, his friends were playing football in the park, but they got wet. While everyone was eating dinner, the rain stopped and the sky became clear.",
          "questions": [
            {
              "prompt": "What was Leo doing when it started raining?",
              "options": [
                "He was doing homework",
                "He was playing football",
                "He was eating dinner"
              ],
              "correct": "He was doing homework"
            },
            {
              "prompt": "What were Leo's friends doing when it started raining?",
              "options": [
                "They were sleeping",
                "They were playing football",
                "They were listening to music"
              ],
              "correct": "They were playing football"
            }
          ]
        }
      },
      {
        "id": "presentperfectbasic",
        "title": "Grammar: Present Perfect Basic",
        "emoji": "✅",
        "description": "Life experiences with ever, never, already",
        "cefr": "A2",
        "grammarTip": "We use the present perfect (have/has + past participle) to talk about life experiences without saying exactly when they happened: 'I have visited Paris' or 'She has never eaten sushi.' We use 'ever' in questions ('Have you ever tried...?'), 'never' for zero experience, and 'already' when something happened sooner than expected. Remember: has = he/she/it, have = I/you/we/they.",
        "words": [
          {
            "id": "havebeen",
            "en": "have been",
            "pt": "já estive/fui",
            "emoji": "✈️"
          },
          {
            "id": "hasnevertried",
            "en": "has never tried",
            "pt": "nunca experimentou",
            "emoji": "🚫"
          },
          {
            "id": "havealreadyfinished",
            "en": "have already finished",
            "pt": "já terminei",
            "emoji": "✔️"
          },
          {
            "id": "hasvisited",
            "en": "has visited",
            "pt": "visitou",
            "emoji": "🗺️"
          },
          {
            "id": "haveneverseen",
            "en": "have never seen",
            "pt": "nunca vi",
            "emoji": "👀"
          },
          {
            "id": "hasjustarrived",
            "en": "has just arrived",
            "pt": "acabou de chegar",
            "emoji": "🚪"
          },
          {
            "id": "haveeaten",
            "en": "have eaten",
            "pt": "comi/comeu",
            "emoji": "🍽️"
          },
          {
            "id": "hasbroken",
            "en": "has broken",
            "pt": "quebrou",
            "emoji": "💥"
          },
          {
            "id": "havewon",
            "en": "have won",
            "pt": "ganhei/ganharam",
            "emoji": "🏆"
          },
          {
            "id": "hasread",
            "en": "has read",
            "pt": "leu",
            "emoji": "📖"
          },
          {
            "id": "havelost",
            "en": "have lost",
            "pt": "perdi/perderam",
            "emoji": "😞"
          },
          {
            "id": "hasforgotten",
            "en": "has forgotten",
            "pt": "esqueceu",
            "emoji": "🤔"
          },
          {
            "id": "havetraveled",
            "en": "have traveled",
            "pt": "viajei/viajaram",
            "emoji": "🧳"
          },
          {
            "id": "hasneverflown",
            "en": "has never flown",
            "pt": "nunca voou",
            "emoji": "🛬"
          }
        ],
        "readingTime": {
          "text": "Emma: Have you ever tried sushi, Noah?\nNoah: Yes, I have eaten sushi many times! Have you?\nEmma: No, I have never tried it, but I have already tasted Italian pizza.\nNoah: I have traveled to Italy too. It was amazing!\nEmma: Wow, has your sister ever visited Italy?\nNoah: No, she hasn't. She has never flown on a plane before!",
          "questions": [
            {
              "prompt": "Has Emma ever tried sushi?",
              "options": [
                "Yes, many times",
                "No, never",
                "Yes, once last year"
              ],
              "correct": "No, never"
            },
            {
              "prompt": "What has Noah's sister never done?",
              "options": [
                "Eaten pizza",
                "Flown on a plane",
                "Visited Italy with Noah"
              ],
              "correct": "Flown on a plane"
            }
          ]
        }
      },
      {
        "id": "futureforms",
        "title": "Grammar: Will vs Going To",
        "emoji": "🔮",
        "description": "Spontaneous decisions vs planned intentions",
        "cefr": "A2",
        "grammarTip": "We use 'going to' + verb for plans we already decided: 'I am going to travel this summer.' We use 'will' + verb for quick decisions we make while speaking: 'It's cold, I will close the window.' A good trick: 'going to' means already planned, and 'will' means decided right now.",
        "words": [
          {
            "id": "isgoingtotravel",
            "en": "is going to travel",
            "pt": "vai viajar",
            "emoji": "🧳"
          },
          {
            "id": "willhelp",
            "en": "will help",
            "pt": "vou ajudar",
            "emoji": "🤝"
          },
          {
            "id": "aregoingtostudy",
            "en": "are going to study",
            "pt": "vão estudar",
            "emoji": "📚"
          },
          {
            "id": "willanswer",
            "en": "will answer",
            "pt": "vou responder",
            "emoji": "☎️"
          },
          {
            "id": "isgoingtorain",
            "en": "is going to rain",
            "pt": "vai chover",
            "emoji": "🌧️"
          },
          {
            "id": "willcall",
            "en": "will call",
            "pt": "vou ligar",
            "emoji": "📞"
          },
          {
            "id": "amgoingtovisit",
            "en": "am going to visit",
            "pt": "vou visitar",
            "emoji": "🏠"
          },
          {
            "id": "willtry",
            "en": "will try",
            "pt": "vou tentar",
            "emoji": "💪"
          },
          {
            "id": "isgoingtomove",
            "en": "is going to move",
            "pt": "vai se mudar",
            "emoji": "📦"
          },
          {
            "id": "willopen",
            "en": "will open",
            "pt": "vou abrir",
            "emoji": "🚪"
          },
          {
            "id": "aregoingtobuild",
            "en": "are going to build",
            "pt": "vão construir",
            "emoji": "🏗️"
          },
          {
            "id": "willbring",
            "en": "will bring",
            "pt": "vou trazer",
            "emoji": "🎒"
          },
          {
            "id": "isgoingtostart",
            "en": "is going to start",
            "pt": "vai começar",
            "emoji": "▶️"
          },
          {
            "id": "willpay",
            "en": "will pay",
            "pt": "vou pagar",
            "emoji": "💳"
          }
        ],
        "readingTime": {
          "text": "Carlos: Look at those clouds! I think it is going to rain.\nDaniela: Really? Then I will bring an umbrella, just in case.\nCarlos: Next month, my family is going to travel to the coast.\nDaniela: That sounds fun! Oh, my phone is ringing. I will answer it now.\nCarlos: Okay. After the call, are you going to study with me?\nDaniela: Yes, I am going to visit the library first, then I'll come.",
          "questions": [
            {
              "prompt": "Why does Daniela decide to bring an umbrella?",
              "options": [
                "Because she planned it yesterday",
                "Because she sees it might rain",
                "Because Carlos told her to"
              ],
              "correct": "Because she sees it might rain"
            },
            {
              "prompt": "What has Carlos's family already planned?",
              "options": [
                "To travel to the coast",
                "To study at the library",
                "To build a new house"
              ],
              "correct": "To travel to the coast"
            }
          ]
        }
      },
      {
        "id": "modalverbs",
        "title": "Grammar: Should, Must, Have To",
        "emoji": "📏",
        "description": "Giving advice and talking about obligation",
        "cefr": "A2",
        "grammarTip": "We use 'should' for advice: 'You should rest.' We use 'must' for strong rules, often written ones: 'You must wear a seatbelt.' We use 'have to' for obligations from outside us, like school or parents: 'I have to study for the test.' 'Must' and 'have to' are similar, but 'should' is softer, just a suggestion.",
        "words": [
          {
            "id": "shouldrest",
            "en": "should rest",
            "pt": "deveria descansar",
            "emoji": "🛌"
          },
          {
            "id": "mustwear",
            "en": "must wear",
            "pt": "deve usar",
            "emoji": "🦺"
          },
          {
            "id": "havetostudy",
            "en": "have to study",
            "pt": "tenho que estudar",
            "emoji": "📖"
          },
          {
            "id": "shouldapologize",
            "en": "should apologize",
            "pt": "deveria pedir desculpas",
            "emoji": "🙏"
          },
          {
            "id": "mustnotrun",
            "en": "must not run",
            "pt": "não deve correr",
            "emoji": "🚫"
          },
          {
            "id": "hastofinish",
            "en": "has to finish",
            "pt": "tem que terminar",
            "emoji": "✅"
          },
          {
            "id": "shouldpractice",
            "en": "should practice",
            "pt": "deveria praticar",
            "emoji": "🎯"
          },
          {
            "id": "mustarrive",
            "en": "must arrive",
            "pt": "deve chegar",
            "emoji": "⏰"
          },
          {
            "id": "havetowait",
            "en": "have to wait",
            "pt": "tenho que esperar",
            "emoji": "⌛"
          },
          {
            "id": "shouldask",
            "en": "should ask",
            "pt": "deveria perguntar",
            "emoji": "❓"
          },
          {
            "id": "mustobey",
            "en": "must obey",
            "pt": "deve obedecer",
            "emoji": "📜"
          },
          {
            "id": "hastoclean",
            "en": "has to clean",
            "pt": "tem que limpar",
            "emoji": "🧹"
          },
          {
            "id": "shouldtry",
            "en": "should try",
            "pt": "deveria tentar",
            "emoji": "💪"
          },
          {
            "id": "mustnottalk",
            "en": "must not talk",
            "pt": "não deve falar",
            "emoji": "🤫"
          }
        ],
        "readingTime": {
          "text": "Coach: Remember, players must wear their helmets during practice.\nLiam: Yes, coach. Do we have to arrive early tomorrow?\nCoach: Yes, you must arrive at 7 a.m. sharp.\nLiam: Okay. I think I should practice my kicks more this week.\nCoach: Good idea. Also, you have to finish your homework before the game.\nLiam: I know. I must not forget my schoolwork again!",
          "questions": [
            {
              "prompt": "What must players wear during practice?",
              "options": [
                "Helmets",
                "Gloves",
                "Glasses"
              ],
              "correct": "Helmets"
            },
            {
              "prompt": "What time must the players arrive tomorrow?",
              "options": [
                "6 a.m.",
                "7 a.m.",
                "8 a.m."
              ],
              "correct": "7 a.m."
            }
          ]
        }
      },
      {
        "id": "comparatives",
        "title": "Grammar: Comparatives & Superlatives",
        "emoji": "📊",
        "description": "Comparing people, places, and things",
        "cefr": "A2",
        "grammarTip": "We add -er to short adjectives to compare two things, like 'bigger' or 'faster', and use 'more' for longer words, like 'more interesting'. For comparing three or more things, we use -est or 'most': 'the fastest', 'the most interesting'. Remember to use 'than' with comparatives: 'She is faster than me.'",
        "words": [
          {
            "id": "bigger",
            "en": "bigger",
            "pt": "maior",
            "emoji": "📏"
          },
          {
            "id": "smaller",
            "en": "smaller",
            "pt": "menor",
            "emoji": "🤏"
          },
          {
            "id": "faster",
            "en": "faster",
            "pt": "mais rápido",
            "emoji": "🏃"
          },
          {
            "id": "thefastest",
            "en": "the fastest",
            "pt": "o mais rápido",
            "emoji": "🥇"
          },
          {
            "id": "moreinteresting",
            "en": "more interesting",
            "pt": "mais interessante",
            "emoji": "🤓"
          },
          {
            "id": "themostinteresting",
            "en": "the most interesting",
            "pt": "o mais interessante",
            "emoji": "🌟"
          },
          {
            "id": "taller",
            "en": "taller",
            "pt": "mais alto",
            "emoji": "📐"
          },
          {
            "id": "thetallest",
            "en": "the tallest",
            "pt": "o mais alto",
            "emoji": "🏔️"
          },
          {
            "id": "cheaper",
            "en": "cheaper",
            "pt": "mais barato",
            "emoji": "💵"
          },
          {
            "id": "thecheapest",
            "en": "the cheapest",
            "pt": "o mais barato",
            "emoji": "🏷️"
          },
          {
            "id": "moreexpensive",
            "en": "more expensive",
            "pt": "mais caro",
            "emoji": "💎"
          },
          {
            "id": "themostexpensive",
            "en": "the most expensive",
            "pt": "o mais caro",
            "emoji": "👑"
          },
          {
            "id": "better",
            "en": "better",
            "pt": "melhor",
            "emoji": "👍"
          },
          {
            "id": "thebest",
            "en": "the best",
            "pt": "o melhor",
            "emoji": "🏆"
          },
          {
            "id": "worse",
            "en": "worse",
            "pt": "pior",
            "emoji": "👎"
          }
        ],
        "readingTime": {
          "text": "My town has three parks. Central Park is bigger than Green Park, but River Park is the tallest one because of its tower. Central Park is more interesting because it has a zoo, but many students say River Park is the most interesting because of the tower. Snacks at Central Park are cheaper than snacks at River Park, but the roller coaster park is the most expensive place in town. In my opinion, River Park is the best place to spend a Saturday afternoon, even though the roller coaster park is more expensive.",
          "questions": [
            {
              "prompt": "Which park is the tallest?",
              "options": [
                "Central Park",
                "Green Park",
                "River Park"
              ],
              "correct": "River Park"
            },
            {
              "prompt": "Which place is the most expensive?",
              "options": [
                "Central Park",
                "River Park",
                "The roller coaster park"
              ],
              "correct": "The roller coaster park"
            }
          ]
        }
      },
      {
        "id": "describingpeople",
        "title": "Describing People",
        "emoji": "🧑",
        "description": "Appearance, age and personality",
        "cefr": "A2",
        "grammarTip": "Use 'to be' for permanent features (She is tall) and 'to have (got)' for parts of the body (She has long hair). The usual adjective order is opinion → size → age → colour: 'a lovely tall young woman'.",
        "words": [
          {
            "id": "tall",
            "en": "tall",
            "pt": "alto(a)",
            "emoji": "📏"
          },
          {
            "id": "short_p",
            "en": "short",
            "pt": "baixo(a)",
            "emoji": "🧍"
          },
          {
            "id": "slim",
            "en": "slim",
            "pt": "magro(a)",
            "emoji": "🚶"
          },
          {
            "id": "strong",
            "en": "strong",
            "pt": "forte",
            "emoji": "💪"
          },
          {
            "id": "curlyhair",
            "en": "curly hair",
            "pt": "cabelo cacheado",
            "emoji": "👩‍🦱"
          },
          {
            "id": "straighthair",
            "en": "straight hair",
            "pt": "cabelo liso",
            "emoji": "👩"
          },
          {
            "id": "blondhair",
            "en": "blond hair",
            "pt": "cabelo loiro",
            "emoji": "👱"
          },
          {
            "id": "beard",
            "en": "beard",
            "pt": "barba",
            "emoji": "🧔"
          },
          {
            "id": "glasses",
            "en": "glasses",
            "pt": "óculos",
            "emoji": "👓"
          },
          {
            "id": "friendly",
            "en": "friendly",
            "pt": "simpático(a)",
            "emoji": "😊"
          },
          {
            "id": "shy_p",
            "en": "shy",
            "pt": "tímido(a)",
            "emoji": "😳"
          },
          {
            "id": "hardworking",
            "en": "hard-working",
            "pt": "trabalhador(a)",
            "emoji": "🛠️"
          },
          {
            "id": "generous",
            "en": "generous",
            "pt": "generoso(a)",
            "emoji": "🎁"
          },
          {
            "id": "middleaged",
            "en": "middle-aged",
            "pt": "de meia-idade",
            "emoji": "🧓"
          }
        ],
        "readingTime": {
          "text": "My best friend Lucas is seventeen. He is tall and slim, and he has short curly hair and brown eyes.\nHe wears glasses when he reads.\nLucas is very friendly and generous — he always shares his lunch with me.\nHis older sister is quiet and a little shy, but she is extremely hard-working.\nPeople say they look very similar.",
          "questions": [
            {
              "prompt": "What kind of hair does Lucas have?",
              "options": [
                "long and straight",
                "short and curly",
                "blond and wavy"
              ],
              "correct": "short and curly"
            },
            {
              "prompt": "How is Lucas's sister described?",
              "options": [
                "loud and funny",
                "quiet, shy and hard-working",
                "tall and strong"
              ],
              "correct": "quiet, shy and hard-working"
            }
          ]
        }
      },
      {
        "id": "describinganimals",
        "title": "Describing Animals",
        "emoji": "🦒",
        "description": "Size, body parts, habitat and behaviour",
        "cefr": "A2",
        "grammarTip": "Describe animals with 'have/has got' for body parts (A giraffe has got a long neck) and 'can' for abilities (Penguins can swim but they can't fly). Say where they live with 'lives in': 'The camel lives in the desert.'",
        "words": [
          {
            "id": "furry",
            "en": "furry",
            "pt": "peludo",
            "emoji": "🧸"
          },
          {
            "id": "feathers",
            "en": "feathers",
            "pt": "penas",
            "emoji": "🪶",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Types_de_plumes._-_Larousse_pour_tous%2C_-1907-1910-.jpg/500px-Types_de_plumes._-_Larousse_pour_tous%2C_-1907-1910-.jpg"
          },
          {
            "id": "scales",
            "en": "scales",
            "pt": "escamas",
            "emoji": "🐍",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Keeled_scales_on_a_southern_watersnake_%2826954310414%29.jpg/500px-Keeled_scales_on_a_southern_watersnake_%2826954310414%29.jpg"
          },
          {
            "id": "wings",
            "en": "wings",
            "pt": "asas",
            "emoji": "🦅",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Wing.two.arp.600pix.jpg/500px-Wing.two.arp.600pix.jpg"
          },
          {
            "id": "tail",
            "en": "tail",
            "pt": "cauda / rabo",
            "emoji": "🐕",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/White-tailed_deer%2C_tail_up.jpg/500px-White-tailed_deer%2C_tail_up.jpg"
          },
          {
            "id": "paws",
            "en": "paws",
            "pt": "patas",
            "emoji": "🐾",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Paw_and_pads.jpg/500px-Paw_and_pads.jpg"
          },
          {
            "id": "longneck",
            "en": "a long neck",
            "pt": "um pescoço longo",
            "emoji": "🦒"
          },
          {
            "id": "sharpteeth",
            "en": "sharp teeth",
            "pt": "dentes afiados",
            "emoji": "🦈"
          },
          {
            "id": "wild",
            "en": "wild",
            "pt": "selvagem",
            "emoji": "🐅"
          },
          {
            "id": "tame",
            "en": "tame",
            "pt": "manso",
            "emoji": "🐈"
          },
          {
            "id": "dangerous",
            "en": "dangerous",
            "pt": "perigoso",
            "emoji": "⚠️"
          },
          {
            "id": "harmless",
            "en": "harmless",
            "pt": "inofensivo",
            "emoji": "🕊️"
          },
          {
            "id": "livesinthe",
            "en": "lives in the jungle",
            "pt": "vive na selva",
            "emoji": "🌴"
          },
          {
            "id": "cansim",
            "en": "can swim",
            "pt": "sabe nadar",
            "emoji": "🏊"
          }
        ],
        "readingTime": {
          "text": "The giraffe is the tallest animal in the world. It has got a very long neck and small horns on its head.\nGiraffes are harmless and they live in Africa, where they eat leaves from tall trees.\nThe shark is very different. It has sharp teeth and it can swim extremely fast.\nSome people think sharks are dangerous, but most of them never attack humans.\nWhich animal do you prefer?",
          "questions": [
            {
              "prompt": "Why does the giraffe have a long neck?",
              "options": [
                "to swim faster",
                "to eat leaves from tall trees",
                "to defend itself"
              ],
              "correct": "to eat leaves from tall trees"
            },
            {
              "prompt": "What is said about most sharks?",
              "options": [
                "they never attack humans",
                "they live in Africa",
                "they have got feathers"
              ],
              "correct": "they never attack humans"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Types_de_plumes._-_Larousse_pour_tous%2C_-1907-1910-.jpg/500px-Types_de_plumes._-_Larousse_pour_tous%2C_-1907-1910-.jpg"
      },
      {
        "id": "describingplaces",
        "title": "Describing Places",
        "emoji": "🏞️",
        "description": "Cities, nature and what a place is like",
        "cefr": "A2",
        "grammarTip": "Use 'There is' for one thing and 'There are' for more than one: 'There is a park and there are two museums.' To ask what a place is like, say: 'What is your city like?' — the answer uses adjectives, not 'like'.",
        "words": [
          {
            "id": "crowded",
            "en": "crowded",
            "pt": "lotado",
            "emoji": "👥"
          },
          {
            "id": "quiet_pl",
            "en": "quiet",
            "pt": "tranquilo",
            "emoji": "🤫"
          },
          {
            "id": "noisy",
            "en": "noisy",
            "pt": "barulhento",
            "emoji": "🔊"
          },
          {
            "id": "modern",
            "en": "modern",
            "pt": "moderno",
            "emoji": "🏙️"
          },
          {
            "id": "ancient",
            "en": "ancient",
            "pt": "antigo",
            "emoji": "🏛️"
          },
          {
            "id": "beautiful_pl",
            "en": "beautiful",
            "pt": "bonito",
            "emoji": "✨"
          },
          {
            "id": "beach_pl",
            "en": "beach",
            "pt": "praia",
            "emoji": "🏖️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Beach_at_Fort_Lauderdale.jpg/500px-Beach_at_Fort_Lauderdale.jpg"
          },
          {
            "id": "mountain_pl",
            "en": "mountain",
            "pt": "montanha",
            "emoji": "⛰️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg/500px-Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg"
          },
          {
            "id": "forest_pl",
            "en": "forest",
            "pt": "floresta",
            "emoji": "🌲",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Aerial_view_of_the_Amazon_Rainforest.jpg/500px-Aerial_view_of_the_Amazon_Rainforest.jpg"
          },
          {
            "id": "village_pl",
            "en": "village",
            "pt": "vilarejo",
            "emoji": "🏘️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Bourton-on-the-Water_2010_PD_09.JPG/500px-Bourton-on-the-Water_2010_PD_09.JPG"
          },
          {
            "id": "square_pl",
            "en": "square",
            "pt": "praça",
            "emoji": "⛲"
          },
          {
            "id": "museum_pl",
            "en": "museum",
            "pt": "museu",
            "emoji": "🖼️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Museo_Chileno_de_Arte_Precolombino_-_2020_-_10.jpg/500px-Museo_Chileno_de_Arte_Precolombino_-_2020_-_10.jpg"
          },
          {
            "id": "thereisa",
            "en": "There is a park",
            "pt": "Há um parque",
            "emoji": "🌳"
          },
          {
            "id": "thereare",
            "en": "There are shops",
            "pt": "Há lojas",
            "emoji": "🏬"
          }
        ],
        "readingTime": {
          "text": "I live in a small village near the mountains. It is very quiet and the air is clean.\nThere is one square with an old church, and there are two little shops.\nLast summer I visited the capital city. It was modern, noisy and extremely crowded.\nThere were beautiful museums everywhere, but I missed my village.\nWhat is your town like?",
          "questions": [
            {
              "prompt": "How is the writer's village described?",
              "options": [
                "quiet with clean air",
                "modern and crowded",
                "noisy and dirty"
              ],
              "correct": "quiet with clean air"
            },
            {
              "prompt": "What did the writer find in the capital city?",
              "options": [
                "one small square",
                "beautiful museums",
                "two little shops"
              ],
              "correct": "beautiful museums"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Beach_at_Fort_Lauderdale.jpg/500px-Beach_at_Fort_Lauderdale.jpg"
      },
      {
        "id": "futurecontinuous",
        "title": "Grammar: Future Continuous",
        "emoji": "⏭️",
        "description": "will be + verb-ing — in progress in the future",
        "cefr": "A2",
        "grammarTip": "Future Continuous = will be + verb-ing. Use it for an action that will be IN PROGRESS at a moment in the future: 'At 8 pm tomorrow I will be studying.' It is also a polite way to ask about plans: 'Will you be using the car tonight?'",
        "words": [
          {
            "id": "willbestudying",
            "en": "I will be studying",
            "pt": "Eu estarei estudando",
            "emoji": "📚"
          },
          {
            "id": "willbeworking",
            "en": "She will be working",
            "pt": "Ela estará trabalhando",
            "emoji": "💼"
          },
          {
            "id": "willbetravelling",
            "en": "We will be travelling",
            "pt": "Nós estaremos viajando",
            "emoji": "✈️"
          },
          {
            "id": "willbesleeping",
            "en": "They will be sleeping",
            "pt": "Eles estarão dormindo",
            "emoji": "😴"
          },
          {
            "id": "wontbewaiting",
            "en": "He won't be waiting",
            "pt": "Ele não estará esperando",
            "emoji": "⌛"
          },
          {
            "id": "willyoube",
            "en": "Will you be using it?",
            "pt": "Você estará usando?",
            "emoji": "❓"
          },
          {
            "id": "thistimetomorrow",
            "en": "this time tomorrow",
            "pt": "a esta hora amanhã",
            "emoji": "🕗"
          },
          {
            "id": "atnoon",
            "en": "at noon",
            "pt": "ao meio-dia",
            "emoji": "🕛"
          },
          {
            "id": "allevening",
            "en": "all evening",
            "pt": "a noite toda",
            "emoji": "🌙"
          },
          {
            "id": "whileyouare",
            "en": "while you are away",
            "pt": "enquanto você estiver fora",
            "emoji": "🚪"
          },
          {
            "id": "willbewaiting",
            "en": "I will be waiting",
            "pt": "Eu estarei esperando",
            "emoji": "🙋"
          },
          {
            "id": "willbeliving",
            "en": "They will be living there",
            "pt": "Eles estarão morando lá",
            "emoji": "🏠"
          }
        ],
        "readingTime": {
          "text": "This time tomorrow I will be flying to London.\nMy parents will be waiting for me at the airport.\nAt noon on Saturday my sister will be taking her piano exam, so she won't be answering her phone.\nWhile we are away, our neighbour will be looking after the cat.\nDon't worry — I will be thinking of you all week!",
          "questions": [
            {
              "prompt": "What will the writer be doing this time tomorrow?",
              "options": [
                "flying to London",
                "taking a piano exam",
                "looking after the cat"
              ],
              "correct": "flying to London"
            },
            {
              "prompt": "Why won't the sister answer her phone?",
              "options": [
                "she will be at the airport",
                "she will be taking an exam",
                "she will be sleeping"
              ],
              "correct": "she will be taking an exam"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "b1",
    "code": "B1",
    "name": "Intermediate",
    "tagline": "Real conversations, real opinions",
    "tier": "teens",
    "color": "#a8577d",
    "icon": "🌐",
    "topics": [
      {
        "id": "technology",
        "title": "Technology & Digital Life",
        "emoji": "📱",
        "description": "Social media, AI, devices & staying safe online",
        "cefr": "B1",
        "grammarTip": "When talking about technology, we often use modal verbs like 'should' and 'shouldn't' to give advice about online safety. For example: 'You should use a strong password' or 'You shouldn't share personal information online.' These modals help you sound natural when discussing rules and recommendations.",
        "words": [
          {
            "id": "socialmedia",
            "en": "social media",
            "pt": "rede social",
            "emoji": "📲"
          },
          {
            "id": "smartphone",
            "en": "smartphone",
            "pt": "smartphone/celular",
            "emoji": "📱",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Wikipedia_homepage_on_a_large_Android_phone%2C_2015-04-16.jpg/500px-Wikipedia_homepage_on_a_large_Android_phone%2C_2015-04-16.jpg"
          },
          {
            "id": "app",
            "en": "app (application)",
            "pt": "aplicativo",
            "emoji": "🧩"
          },
          {
            "id": "ai",
            "en": "artificial intelligence",
            "pt": "inteligência artificial",
            "emoji": "🤖"
          },
          {
            "id": "password",
            "en": "password",
            "pt": "senha",
            "emoji": "🔒"
          },
          {
            "id": "wifi",
            "en": "Wi-Fi connection",
            "pt": "conexão Wi-Fi",
            "emoji": "📶"
          },
          {
            "id": "upload",
            "en": "to upload",
            "pt": "fazer upload/enviar",
            "emoji": "⬆️"
          },
          {
            "id": "download",
            "en": "to download",
            "pt": "baixar",
            "emoji": "⬇️"
          },
          {
            "id": "screentime",
            "en": "screen time",
            "pt": "tempo de tela",
            "emoji": "⏱️"
          },
          {
            "id": "onlinesafety",
            "en": "online safety",
            "pt": "segurança online",
            "emoji": "🛡️"
          },
          {
            "id": "notification",
            "en": "notification",
            "pt": "notificação",
            "emoji": "🔔"
          },
          {
            "id": "videocall",
            "en": "video call",
            "pt": "chamada de vídeo",
            "emoji": "📹"
          },
          {
            "id": "govira",
            "en": "to go viral",
            "pt": "viralizar",
            "emoji": "🔥"
          },
          {
            "id": "privacysettings",
            "en": "privacy settings",
            "pt": "configurações de privacidade",
            "emoji": "⚙️"
          }
        ],
        "readingTime": {
          "text": "Maria: Did you see the video that went viral on social media last night?\nLucas: Yes! My phone kept buzzing with notifications about it.\nMaria: I really need to check my screen time this week, it's too high.\nLucas: Same here. I downloaded a new app to track it.\nMaria: Good idea. Also, you should change your password for online safety.\nLucas: I already did, and I checked my privacy settings too.\nMaria: Smart! Let's do a video call later when the Wi-Fi connection is stronger.",
          "questions": [
            {
              "prompt": "What does Lucas do to manage his screen time?",
              "options": [
                "He deletes social media",
                "He downloaded an app to track it",
                "He turns off his phone"
              ],
              "correct": "He downloaded an app to track it"
            },
            {
              "prompt": "What does Maria say Lucas should do?",
              "options": [
                "He should change his password",
                "He should delete the app",
                "He should turn off notifications"
              ],
              "correct": "He should change his password"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Wikipedia_homepage_on_a_large_Android_phone%2C_2015-04-16.jpg/500px-Wikipedia_homepage_on_a_large_Android_phone%2C_2015-04-16.jpg"
      },
      {
        "id": "shoppingmoney",
        "title": "Shopping, Money & Services",
        "emoji": "🛍️",
        "description": "Payment, discounts, refunds & negotiating prices",
        "cefr": "B1",
        "grammarTip": "When shopping or negotiating, we use polite question forms like 'Could you give me a discount?' or 'Would it be possible to pay in cash?' to sound respectful. Notice how 'could' and 'would' make requests softer than direct commands like 'Give me a discount.'",
        "words": [
          {
            "id": "cash",
            "en": "cash",
            "pt": "dinheiro (em espécie)",
            "emoji": "💵",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Flickr_-_Nic%27s_events_-_London_-_14-15_Dec_2007_-_034.jpg/500px-Flickr_-_Nic%27s_events_-_London_-_14-15_Dec_2007_-_034.jpg"
          },
          {
            "id": "creditcard",
            "en": "credit card",
            "pt": "cartão de crédito",
            "emoji": "💳",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Credit-cards.jpg/500px-Credit-cards.jpg"
          },
          {
            "id": "discount",
            "en": "discount",
            "pt": "desconto",
            "emoji": "🏷️"
          },
          {
            "id": "receipt",
            "en": "receipt",
            "pt": "recibo/nota fiscal",
            "emoji": "🧾"
          },
          {
            "id": "bargain",
            "en": "to bargain/negotiate",
            "pt": "negociar/pechinchar",
            "emoji": "🤝"
          },
          {
            "id": "refund",
            "en": "refund",
            "pt": "reembolso",
            "emoji": "💰"
          },
          {
            "id": "customerservice",
            "en": "customer service",
            "pt": "atendimento ao cliente",
            "emoji": "🙋"
          },
          {
            "id": "onlinepayment",
            "en": "online payment",
            "pt": "pagamento online",
            "emoji": "📲"
          },
          {
            "id": "change",
            "en": "change (money back)",
            "pt": "troco",
            "emoji": "🪙"
          },
          {
            "id": "budget",
            "en": "budget",
            "pt": "orçamento",
            "emoji": "📊"
          },
          {
            "id": "exchange",
            "en": "to exchange",
            "pt": "trocar (um produto)",
            "emoji": "🔄"
          },
          {
            "id": "installments",
            "en": "installments",
            "pt": "parcelas",
            "emoji": "📆"
          },
          {
            "id": "sale",
            "en": "sale (promotion)",
            "pt": "liquidação/promoção",
            "emoji": "🛒"
          }
        ],
        "readingTime": {
          "text": "Clerk: Good afternoon! How can I help you today?\nTeen: Hi, I'd like to buy this jacket, but could you give me a discount?\nClerk: I'm sorry, this item is already on sale this week.\nTeen: That's fine. Would it be possible to pay in installments?\nClerk: Of course, we accept credit cards for that.\nTeen: Great, and can I get a receipt for the purchase?\nClerk: Sure, here's your receipt and your change from the cash payment.",
          "questions": [
            {
              "prompt": "How does the customer want to pay?",
              "options": [
                "In cash only",
                "In installments with a credit card",
                "With a refund"
              ],
              "correct": "In installments with a credit card"
            },
            {
              "prompt": "Which phrase does the customer use to make a polite request?",
              "options": [
                "Give me a discount!",
                "Could you give me a discount?",
                "I want a discount now"
              ],
              "correct": "Could you give me a discount?"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Flickr_-_Nic%27s_events_-_London_-_14-15_Dec_2007_-_034.jpg/500px-Flickr_-_Nic%27s_events_-_London_-_14-15_Dec_2007_-_034.jpg"
      },
      {
        "id": "sustainability",
        "title": "Global Issues & Sustainability",
        "emoji": "🌍",
        "description": "Recycling, climate change & renewable energy",
        "cefr": "B1",
        "grammarTip": "We often use 'to' or 'in order to' to explain the purpose of an action, especially when talking about protecting the environment. For example: 'We recycle plastic to reduce pollution' or 'Governments invest in solar power in order to fight climate change.'",
        "words": [
          {
            "id": "recycling",
            "en": "recycling",
            "pt": "reciclagem",
            "emoji": "♻️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/RecyclingSymbolGreen.png/500px-RecyclingSymbolGreen.png"
          },
          {
            "id": "climatechange",
            "en": "climate change",
            "pt": "mudança climática",
            "emoji": "🌡️"
          },
          {
            "id": "renewableenergy",
            "en": "renewable energy",
            "pt": "energia renovável",
            "emoji": "🔋",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Andasol_Guadix_4.jpg/500px-Andasol_Guadix_4.jpg"
          },
          {
            "id": "pollution",
            "en": "pollution",
            "pt": "poluição",
            "emoji": "🏭",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Air_pollution3.jpg/500px-Air_pollution3.jpg"
          },
          {
            "id": "reducewaste",
            "en": "to reduce waste",
            "pt": "reduzir o lixo",
            "emoji": "🗑️"
          },
          {
            "id": "solarpanel",
            "en": "solar panel",
            "pt": "painel solar",
            "emoji": "☀️",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Dji_fly_20230602_13826_PM_27_1719032149374_photo_optimized.jpg/500px-Dji_fly_20230602_13826_PM_27_1719032149374_photo_optimized.jpg"
          },
          {
            "id": "volunteer",
            "en": "volunteer",
            "pt": "voluntário",
            "emoji": "🙌",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Vilnius_Marathon_2015_volunteers_by_Augustas_Didzgalvis.jpg/500px-Vilnius_Marathon_2015_volunteers_by_Augustas_Didzgalvis.jpg"
          },
          {
            "id": "endangeredspecies",
            "en": "endangered species",
            "pt": "espécie ameaçada",
            "emoji": "🐾",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Golden_lion_tamarin_portrait3.jpg/500px-Golden_lion_tamarin_portrait3.jpg"
          },
          {
            "id": "carbonfootprint",
            "en": "carbon footprint",
            "pt": "pegada de carbono",
            "emoji": "👣"
          },
          {
            "id": "sustainable",
            "en": "sustainable",
            "pt": "sustentável",
            "emoji": "🌱"
          },
          {
            "id": "deforestation",
            "en": "deforestation",
            "pt": "desmatamento",
            "emoji": "🌳",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Annual_deforestation%2C_World%2C_2020_%28cropped%29.svg/500px-Annual_deforestation%2C_World%2C_2020_%28cropped%29.svg.png"
          },
          {
            "id": "donate",
            "en": "to donate",
            "pt": "doar",
            "emoji": "🎁"
          },
          {
            "id": "naturalresources",
            "en": "natural resources",
            "pt": "recursos naturais",
            "emoji": "💧"
          },
          {
            "id": "environmentalawareness",
            "en": "environmental awareness",
            "pt": "consciência ambiental",
            "emoji": "🌎"
          }
        ],
        "readingTime": {
          "text": "Last weekend, our school organized an event to raise environmental awareness among students.\nWe learned that climate change is getting worse because of pollution and deforestation around the world.\nMany families are now installing solar panels in order to use renewable energy instead of fossil fuels.\nOur class decided to volunteer at a local recycling center to help reduce waste in our community.\nWe also promised to reduce our carbon footprint by walking to school instead of driving.\nFinally, we started a campaign to donate old clothes and protect natural resources for future generations.",
          "questions": [
            {
              "prompt": "Why did the class volunteer at the recycling center?",
              "options": [
                "To earn money",
                "To help reduce waste",
                "To buy solar panels"
              ],
              "correct": "To help reduce waste"
            },
            {
              "prompt": "Why are many families installing solar panels?",
              "options": [
                "In order to save money on rent",
                "In order to use renewable energy instead of fossil fuels",
                "In order to stop deforestation immediately"
              ],
              "correct": "In order to use renewable energy instead of fossil fuels"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/RecyclingSymbolGreen.png/500px-RecyclingSymbolGreen.png"
      },
      {
        "id": "entertainment",
        "title": "Entertainment, Cinema & Music",
        "emoji": "🎬",
        "description": "Movies, music, festivals & giving reviews",
        "cefr": "B1",
        "grammarTip": "When reviewing movies, music, or events, we use comparative and superlative adjectives to compare things, like 'more exciting than' or 'the best concert I've ever seen.' These forms help you express opinions clearly when discussing entertainment.",
        "words": [
          {
            "id": "moviegenre",
            "en": "movie genre",
            "pt": "gênero de filme",
            "emoji": "🎬"
          },
          {
            "id": "soundtrack",
            "en": "soundtrack",
            "pt": "trilha sonora",
            "emoji": "🎵"
          },
          {
            "id": "boxoffice",
            "en": "box office",
            "pt": "bilheteria",
            "emoji": "🎟️"
          },
          {
            "id": "plottwist",
            "en": "plot twist",
            "pt": "reviravolta na trama",
            "emoji": "😲"
          },
          {
            "id": "concert",
            "en": "concert",
            "pt": "show/concerto",
            "emoji": "🎤",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/D%C3%BClmen%2C_D%C3%BClmener_Sommer%2C_Open-Air-Konzert%2C_%22Bounce%22_--_2018_--_0051.jpg/500px-D%C3%BClmen%2C_D%C3%BClmener_Sommer%2C_Open-Air-Konzert%2C_%22Bounce%22_--_2018_--_0051.jpg"
          },
          {
            "id": "streamingplatform",
            "en": "streaming platform",
            "pt": "plataforma de streaming",
            "emoji": "📺"
          },
          {
            "id": "festival",
            "en": "festival",
            "pt": "festival",
            "emoji": "🎪",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Holi_Festival_of_Colors_Utah%2C_United_States_2013.jpg/500px-Holi_Festival_of_Colors_Utah%2C_United_States_2013.jpg"
          },
          {
            "id": "cast",
            "en": "cast (actors)",
            "pt": "elenco",
            "emoji": "🎭"
          },
          {
            "id": "review",
            "en": "review (critique)",
            "pt": "crítica/resenha",
            "emoji": "⭐"
          },
          {
            "id": "blockbuster",
            "en": "blockbuster",
            "pt": "grande sucesso de bilheteria",
            "emoji": "💥"
          },
          {
            "id": "lyrics",
            "en": "lyrics",
            "pt": "letra de música",
            "emoji": "📝"
          },
          {
            "id": "subtitle",
            "en": "subtitle",
            "pt": "legenda",
            "emoji": "💬",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Example_of_subtitles_%28Charade%2C_1963%29.jpg/500px-Example_of_subtitles_%28Charade%2C_1963%29.jpg"
          },
          {
            "id": "audience",
            "en": "audience",
            "pt": "plateia/público",
            "emoji": "👥",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Batsheva_theater_crowd_in_Tel_Aviv_by_David_Shankbone.jpg/500px-Batsheva_theater_crowd_in_Tel_Aviv_by_David_Shankbone.jpg"
          }
        ],
        "readingTime": {
          "text": "This weekend, I watched the new sci-fi blockbuster that broke box office records everywhere.\nThe plot twist at the end was more surprising than anything I've seen in that movie genre before.\nThe soundtrack was incredible, and the lyrics of the main song are still stuck in my head.\nCritics wrote that the cast gave the best performance of the year in their review.\nI watched it with subtitles on a streaming platform because the audience in the cinema was too loud.\nNext month, I'm going to a music festival, which will probably be the most exciting concert I've ever attended.",
          "questions": [
            {
              "prompt": "Where did the person watch the movie with subtitles?",
              "options": [
                "At a music festival",
                "On a streaming platform",
                "At a concert"
              ],
              "correct": "On a streaming platform"
            },
            {
              "prompt": "How does the writer describe the plot twist?",
              "options": [
                "Less surprising than usual",
                "More surprising than anything in that genre before",
                "As boring as other movies"
              ],
              "correct": "More surprising than anything in that genre before"
            }
          ]
        },
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/D%C3%BClmen%2C_D%C3%BClmener_Sommer%2C_Open-Air-Konzert%2C_%22Bounce%22_--_2018_--_0051.jpg/500px-D%C3%BClmen%2C_D%C3%BClmener_Sommer%2C_Open-Air-Konzert%2C_%22Bounce%22_--_2018_--_0051.jpg"
      },
      {
        "id": "presentperfectcontinuous",
        "title": "Grammar: Present Perfect Continuous",
        "emoji": "⏳",
        "description": "Actions that started in the past and continue now",
        "cefr": "B1",
        "grammarTip": "We use the present perfect continuous (have/has + been + verb-ing) to talk about actions that started in the past and are still happening now, or that have just stopped but show a recent result. For example: 'I have been studying English for three years' shows the action continues, while 'She has been crying' explains why her eyes are red now.",
        "words": [
          {
            "id": "hasbeenstudying",
            "en": "has been studying",
            "pt": "tem estudado",
            "emoji": "📚"
          },
          {
            "id": "havebeenwaiting",
            "en": "have been waiting",
            "pt": "têm esperado",
            "emoji": "⏳"
          },
          {
            "id": "hasbeenraining",
            "en": "has been raining",
            "pt": "tem chovido",
            "emoji": "🌧️"
          },
          {
            "id": "havebeenworking",
            "en": "have been working",
            "pt": "têm trabalhado",
            "emoji": "💼"
          },
          {
            "id": "hasbeenplaying",
            "en": "has been playing",
            "pt": "tem jogado",
            "emoji": "🎮"
          },
          {
            "id": "havebeenliving",
            "en": "have been living",
            "pt": "têm morado",
            "emoji": "🏠"
          },
          {
            "id": "hasbeenfeeling",
            "en": "has been feeling",
            "pt": "tem se sentido",
            "emoji": "😊"
          },
          {
            "id": "havebeentalking",
            "en": "have been talking",
            "pt": "têm conversado",
            "emoji": "🗣️"
          },
          {
            "id": "hasbeenrunning",
            "en": "has been running",
            "pt": "tem corrido",
            "emoji": "🏃"
          },
          {
            "id": "havebeenpracticing",
            "en": "have been practicing",
            "pt": "têm praticado",
            "emoji": "🎯"
          },
          {
            "id": "hasbeenthinking",
            "en": "has been thinking",
            "pt": "tem pensado",
            "emoji": "🤔"
          },
          {
            "id": "havebeentrying",
            "en": "have been trying",
            "pt": "têm tentado",
            "emoji": "💪"
          }
        ],
        "readingTime": {
          "text": "Ben: You look exhausted. What have you been doing all day?\nSara: I have been studying for my English exam since this morning.\nBen: No wonder! I have been waiting for you at the library for an hour.\nSara: Sorry! It has been raining really hard, so I got stuck at home.\nBen: That's okay. Have you been practicing the grammar exercises too?\nSara: Yes, I have been practicing them for the past two hours.\nBen: Great, because I have been thinking about asking you for help later!",
          "questions": [
            {
              "prompt": "Why has Sara been stuck at home?",
              "options": [
                "She has been sleeping",
                "It has been raining hard",
                "She has been shopping"
              ],
              "correct": "It has been raining hard"
            },
            {
              "prompt": "Which sentence shows an action that started in the past and continues now?",
              "options": [
                "I have been studying for my English exam since this morning",
                "I study English every morning",
                "I studied English yesterday"
              ],
              "correct": "I have been studying for my English exam since this morning"
            }
          ]
        }
      },
      {
        "id": "conditionals12",
        "title": "Grammar: First & Second Conditionals",
        "emoji": "🔀",
        "description": "Real possibilities vs hypothetical situations with If",
        "cefr": "B1",
        "grammarTip": "The first conditional (If + present simple, ... will + verb) describes real and possible future situations, like 'If it rains, I will stay home.' The second conditional (If + past simple, ... would + verb) describes hypothetical or unlikely situations, like 'If I had more time, I would travel the world.' Notice how the verb tense changes the meaning from possible to imaginary.",
        "words": [
          {
            "id": "ifitrains",
            "en": "If it rains, I will stay home",
            "pt": "Se chover, eu ficarei em casa",
            "emoji": "☔"
          },
          {
            "id": "ifihadtime",
            "en": "If I had more time, I would travel",
            "pt": "Se eu tivesse mais tempo, eu viajaria",
            "emoji": "✈️"
          },
          {
            "id": "ifyoustudy",
            "en": "If you study, you will pass",
            "pt": "Se você estudar, você passará",
            "emoji": "📖"
          },
          {
            "id": "ifiwonlottery",
            "en": "If I won the lottery, I would buy a house",
            "pt": "Se eu ganhasse na loteria, eu compraria uma casa",
            "emoji": "🏡"
          },
          {
            "id": "ifshecalls",
            "en": "If she calls, I will answer",
            "pt": "Se ela ligar, eu atenderei",
            "emoji": "☎️"
          },
          {
            "id": "ifiwereyou",
            "en": "If I were you, I would apologize",
            "pt": "Se eu fosse você, eu pediria desculpas",
            "emoji": "🙏"
          },
          {
            "id": "ifwehurry",
            "en": "If we hurry, we will catch the bus",
            "pt": "Se nos apressarmos, pegaremos o ônibus",
            "emoji": "🚌"
          },
          {
            "id": "ifiknewanswer",
            "en": "If I knew the answer, I would tell you",
            "pt": "Se eu soubesse a resposta, eu diria a você",
            "emoji": "💡"
          },
          {
            "id": "unless",
            "en": "unless (if...not)",
            "pt": "a menos que",
            "emoji": "❗"
          },
          {
            "id": "realpossibility",
            "en": "real possibility",
            "pt": "possibilidade real",
            "emoji": "✅"
          },
          {
            "id": "hypotheticalsituation",
            "en": "hypothetical situation",
            "pt": "situação hipotética",
            "emoji": "💭"
          },
          {
            "id": "wouldverb",
            "en": "would + verb",
            "pt": "forma condicional",
            "emoji": "🔮"
          }
        ],
        "readingTime": {
          "text": "Our teacher gave us an interesting assignment about our future plans this week.\nIf I pass all my exams this year, I will apply for the international exchange program.\nMy best friend said, 'If I had more money, I would travel around Asia next summer.'\nHowever, if it doesn't rain tomorrow, our class will visit the science museum instead.\nMy sister told me, 'If I were older, I would get a part-time job at the mall.'\nI think both real plans and dream plans are important, because they help us stay motivated.\nIf you work hard now, you will have more choices in the future.",
          "questions": [
            {
              "prompt": "What will the student do if they pass all their exams?",
              "options": [
                "Apply for the international exchange program",
                "Get a part-time job",
                "Travel around Asia"
              ],
              "correct": "Apply for the international exchange program"
            },
            {
              "prompt": "Which sentence describes a hypothetical (imaginary) situation?",
              "options": [
                "If it doesn't rain tomorrow, our class will visit the science museum",
                "If I had more money, I would travel around Asia next summer",
                "If you work hard now, you will have more choices"
              ],
              "correct": "If I had more money, I would travel around Asia next summer"
            }
          ]
        }
      },
      {
        "id": "passivebasic",
        "title": "Grammar: Passive Voice Basic",
        "emoji": "🔧",
        "description": "Present & past simple passive forms in action",
        "cefr": "B1",
        "grammarTip": "We use the passive voice when the action is more important than who does it, formed with 'be' + past participle. In the present simple passive we say 'The phone is made in China,' and in the past simple passive we say 'The bridge was built in 1980.' The passive shifts focus from the doer of the action to the receiver.",
        "words": [
          {
            "id": "ismade",
            "en": "is made",
            "pt": "é feito",
            "emoji": "🏗️"
          },
          {
            "id": "wasbuilt",
            "en": "was built",
            "pt": "foi construído",
            "emoji": "🏛️"
          },
          {
            "id": "issold",
            "en": "is sold",
            "pt": "é vendido",
            "emoji": "🛒"
          },
          {
            "id": "waswritten",
            "en": "was written",
            "pt": "foi escrito",
            "emoji": "✍️"
          },
          {
            "id": "isproduced",
            "en": "is produced",
            "pt": "é produzido",
            "emoji": "🏭"
          },
          {
            "id": "wasdiscovered",
            "en": "was discovered",
            "pt": "foi descoberto",
            "emoji": "🔍"
          },
          {
            "id": "isrecycled",
            "en": "is recycled",
            "pt": "é reciclado",
            "emoji": "♻️"
          },
          {
            "id": "wasinvented",
            "en": "was invented",
            "pt": "foi inventado",
            "emoji": "💡"
          },
          {
            "id": "isdelivered",
            "en": "is delivered",
            "pt": "é entregue",
            "emoji": "📦"
          },
          {
            "id": "waspainted",
            "en": "was painted",
            "pt": "foi pintado",
            "emoji": "🎨"
          },
          {
            "id": "isused",
            "en": "is used",
            "pt": "é usado",
            "emoji": "🔧"
          },
          {
            "id": "wasdirected",
            "en": "was directed",
            "pt": "foi dirigido",
            "emoji": "🎬"
          },
          {
            "id": "isspoken",
            "en": "is spoken",
            "pt": "é falado",
            "emoji": "🗣️"
          }
        ],
        "readingTime": {
          "text": "In our geography class, we learned interesting facts about products from around the world.\nMost smartphones are made in factories in Asia before they are shipped to other countries.\nOur teacher explained that the Great Wall of China was built over many centuries.\nShe also said that paper was invented in China almost two thousand years ago.\nToday, millions of packages are delivered every day by delivery companies around the world.\nIn art class, we saw a famous painting that was painted by a Portuguese artist.\nWe were surprised that so many everyday objects are produced using recycled materials.",
          "questions": [
            {
              "prompt": "According to the text, what was invented in China almost two thousand years ago?",
              "options": [
                "The Great Wall",
                "Paper",
                "Smartphones"
              ],
              "correct": "Paper"
            },
            {
              "prompt": "Which sentence is in the past simple passive?",
              "options": [
                "Most smartphones are made in factories in Asia",
                "The Great Wall of China was built over many centuries",
                "Millions of packages are delivered every day"
              ],
              "correct": "The Great Wall of China was built over many centuries"
            }
          ]
        }
      },
      {
        "id": "phrasalverbs",
        "title": "Grammar: Common Phrasal Verbs",
        "emoji": "🧩",
        "description": "Everyday verb + particle combinations you need",
        "cefr": "B1",
        "grammarTip": "Phrasal verbs combine a verb with a particle (like 'up', 'out', or 'on') to create a new meaning that is often different from the original verb. For example, 'give up' means to stop trying, while 'look for' means to search for something. Learning these common combinations will make your English sound much more natural.",
        "words": [
          {
            "id": "giveup",
            "en": "give up",
            "pt": "desistir",
            "emoji": "🏳️"
          },
          {
            "id": "lookfor",
            "en": "look for",
            "pt": "procurar",
            "emoji": "🔍"
          },
          {
            "id": "turnon",
            "en": "turn on",
            "pt": "ligar",
            "emoji": "🔛"
          },
          {
            "id": "turnoff",
            "en": "turn off",
            "pt": "desligar",
            "emoji": "🔴"
          },
          {
            "id": "findout",
            "en": "find out",
            "pt": "descobrir",
            "emoji": "🕵️"
          },
          {
            "id": "runoutof",
            "en": "run out of",
            "pt": "ficar sem",
            "emoji": "⛽"
          },
          {
            "id": "getup",
            "en": "get up",
            "pt": "levantar-se",
            "emoji": "🛏️"
          },
          {
            "id": "puton",
            "en": "put on",
            "pt": "vestir/colocar",
            "emoji": "👕"
          },
          {
            "id": "takeoff",
            "en": "take off",
            "pt": "decolar/tirar",
            "emoji": "✈️"
          },
          {
            "id": "bringback",
            "en": "bring back",
            "pt": "trazer de volta",
            "emoji": "🔙"
          },
          {
            "id": "figureout",
            "en": "figure out",
            "pt": "entender/resolver",
            "emoji": "🧩"
          },
          {
            "id": "hangout",
            "en": "hang out",
            "pt": "sair com amigos",
            "emoji": "👯"
          },
          {
            "id": "carryon",
            "en": "carry on",
            "pt": "continuar",
            "emoji": "➡️"
          },
          {
            "id": "breakdown",
            "en": "break down",
            "pt": "quebrar (parar de funcionar)",
            "emoji": "🔧"
          }
        ],
        "readingTime": {
          "text": "Tom: Why do you look so tired today?\nAna: I woke up late because my alarm didn't turn on properly.\nTom: That's rough. Did you figure out what happened to it?\nAna: Yes, I found out the batteries had run out of power.\nTom: Well, don't give up on being on time tomorrow!\nAna: I won't. I'm going to put on a backup alarm clock too.\nTom: Good plan. Do you want to hang out after school to study?\nAna: Sure, but first I need to look for my missing notebook.",
          "questions": [
            {
              "prompt": "Why was Ana late this morning?",
              "options": [
                "Her alarm's batteries ran out of power",
                "She decided to hang out with friends",
                "She lost her notebook"
              ],
              "correct": "Her alarm's batteries ran out of power"
            },
            {
              "prompt": "What does 'give up' mean in this conversation?",
              "options": [
                "To search for something",
                "To stop trying",
                "To turn something on"
              ],
              "correct": "To stop trying"
            }
          ]
        }
      },
      {
        "id": "relativeclauses",
        "title": "Grammar: Relative Clauses",
        "emoji": "🔗",
        "description": "Connecting ideas with who, which, that, where",
        "cefr": "B1",
        "grammarTip": "Relative clauses give extra information about a noun using words like 'who' (for people), 'which' (for things), 'that' (for people or things), and 'where' (for places). For example: 'The man who called is my teacher' or 'The city where I live is very old.' These clauses help you combine two short sentences into one clear sentence.",
        "words": [
          {
            "id": "themanwho",
            "en": "the man who called",
            "pt": "o homem que ligou",
            "emoji": "👨"
          },
          {
            "id": "thebookwhich",
            "en": "the book which I read",
            "pt": "o livro que eu li",
            "emoji": "📕"
          },
          {
            "id": "thecitywhere",
            "en": "the city where I live",
            "pt": "a cidade onde eu moro",
            "emoji": "🏙️"
          },
          {
            "id": "thegirlthat",
            "en": "the girl that helped me",
            "pt": "a garota que me ajudou",
            "emoji": "👧"
          },
          {
            "id": "theteacherwhose",
            "en": "the teacher whose class I love",
            "pt": "a professora cuja aula eu amo",
            "emoji": "👩‍🏫"
          },
          {
            "id": "thedaywhen",
            "en": "the day when we met",
            "pt": "o dia em que nos conhecemos",
            "emoji": "📅"
          },
          {
            "id": "thereasonwhy",
            "en": "the reason why I left",
            "pt": "a razão pela qual eu saí",
            "emoji": "❓"
          },
          {
            "id": "thehousewhich",
            "en": "the house which was sold",
            "pt": "a casa que foi vendida",
            "emoji": "🏠"
          },
          {
            "id": "thedogthat",
            "en": "the dog that barks",
            "pt": "o cachorro que late",
            "emoji": "🐕"
          },
          {
            "id": "thefriendwho",
            "en": "the friend who helped me",
            "pt": "o amigo que me ajudou",
            "emoji": "🤝"
          },
          {
            "id": "themoviethat",
            "en": "the movie that won an award",
            "pt": "o filme que ganhou um prêmio",
            "emoji": "🏆"
          },
          {
            "id": "theplacewhere",
            "en": "the place where we met",
            "pt": "o lugar onde nos conhecemos",
            "emoji": "📍"
          }
        ],
        "readingTime": {
          "text": "Last week, I met a girl who just moved to our school from another city.\nShe told me about the town where she used to live, which is famous for its old castle.\nHer best friend, who she still talks to every day, is planning to visit her soon.\nI also introduced her to my teacher, whose class is my favorite this year.\nWe talked about a book which we both read last summer for our English project.\nIt was the first day when I felt like we could become good friends.\nI'm really glad I met someone who shares so many of my interests.",
          "questions": [
            {
              "prompt": "Where did the new girl use to live?",
              "options": [
                "A city famous for its beach",
                "A town famous for its old castle",
                "A city with no history"
              ],
              "correct": "A town famous for its old castle"
            },
            {
              "prompt": "Which word is used to talk about the teacher's class in the text?",
              "options": [
                "who",
                "where",
                "whose"
              ],
              "correct": "whose"
            }
          ]
        }
      },
      {
        "id": "twelvetenses",
        "title": "Grammar: The 12 English Tenses",
        "emoji": "🕰️",
        "description": "The full map: simple, continuous, perfect, perfect continuous",
        "cefr": "B1",
        "grammarTip": "English has 3 times (past, present, future) × 4 aspects (simple, continuous, perfect, perfect continuous) = 12 tenses. Simple = a fact or habit. Continuous = in progress. Perfect = finished before another point. Perfect continuous = how long it had been going on.",
        "words": [
          {
            "id": "t_pressimple",
            "en": "I work every day",
            "pt": "Present Simple — rotina",
            "emoji": "🔁"
          },
          {
            "id": "t_prescont",
            "en": "I am working now",
            "pt": "Present Continuous — agora",
            "emoji": "⏳"
          },
          {
            "id": "t_presperf",
            "en": "I have worked here for years",
            "pt": "Present Perfect — até agora",
            "emoji": "✅"
          },
          {
            "id": "t_presperfcont",
            "en": "I have been working all morning",
            "pt": "Present Perfect Continuous",
            "emoji": "🔄"
          },
          {
            "id": "t_pastsimple",
            "en": "I worked yesterday",
            "pt": "Past Simple — passado",
            "emoji": "📅"
          },
          {
            "id": "t_pastcont",
            "en": "I was working at 8 pm",
            "pt": "Past Continuous — em progresso",
            "emoji": "🕗"
          },
          {
            "id": "t_pastperf",
            "en": "I had worked before she arrived",
            "pt": "Past Perfect — antes de outro fato",
            "emoji": "⏮️"
          },
          {
            "id": "t_pastperfcont",
            "en": "I had been working for hours",
            "pt": "Past Perfect Continuous",
            "emoji": "⌛"
          },
          {
            "id": "t_futsimple",
            "en": "I will work tomorrow",
            "pt": "Future Simple — futuro",
            "emoji": "➡️"
          },
          {
            "id": "t_futcont",
            "en": "I will be working at noon",
            "pt": "Future Continuous",
            "emoji": "⏭️"
          },
          {
            "id": "t_futperf",
            "en": "I will have worked by Friday",
            "pt": "Future Perfect",
            "emoji": "🏁"
          },
          {
            "id": "t_futperfcont",
            "en": "I will have been working for a year",
            "pt": "Future Perfect Continuous",
            "emoji": "♾️"
          }
        ],
        "readingTime": {
          "text": "English has twelve tenses, and they all follow the same pattern.\nRight now I am writing this text, but I write something every single day.\nI have written three pages today and I have been writing since seven o'clock.\nYesterday I wrote for two hours; at nine I was still writing, and by then I had already written the introduction because I had been planning it all week.\nTomorrow I will write again. At noon I will be writing chapter four, and by Friday I will have written the whole book — by then I will have been working on it for a year.",
          "questions": [
            {
              "prompt": "How many tenses does English have, according to the text?",
              "options": [
                "eight",
                "ten",
                "twelve"
              ],
              "correct": "twelve"
            },
            {
              "prompt": "Which tense is used in 'by Friday I will have written the whole book'?",
              "options": [
                "Future Simple",
                "Future Perfect",
                "Future Continuous"
              ],
              "correct": "Future Perfect"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "b1b2",
    "code": "B2-C1",
    "name": "Upper-Intermediate & Advanced",
    "tagline": "Fluent, nuanced, real-world English",
    "tier": "teens",
    "color": "#c9435c",
    "icon": "🏆",
    "topics": [
      {
        "id": "society",
        "title": "Society, Politics & Ethics",
        "emoji": "⚖️",
        "description": "Human rights, citizenship, laws & debates",
        "cefr": "B2-C1",
        "grammarTip": "Words like 'citizenship' and 'human rights' are often used with prepositions such as 'entitled to' or 'deprived of'. Note the difference between 'law' (a specific rule) and 'the law' (the legal system as a whole). For example: 'Every citizen is entitled to freedom of speech, but this right can be restricted by law in cases of hate speech.'",
        "words": [
          {
            "id": "human-rights",
            "en": "human rights",
            "pt": "direitos humanos",
            "emoji": "✊"
          },
          {
            "id": "citizenship",
            "en": "citizenship",
            "pt": "cidadania",
            "emoji": "🪪"
          },
          {
            "id": "legislation",
            "en": "legislation",
            "pt": "legislação",
            "emoji": "📜"
          },
          {
            "id": "constitution",
            "en": "constitution",
            "pt": "constituição",
            "emoji": "📖"
          },
          {
            "id": "civil-liberties",
            "en": "civil liberties",
            "pt": "liberdades civis",
            "emoji": "🕊️"
          },
          {
            "id": "discrimination",
            "en": "discrimination",
            "pt": "discriminação",
            "emoji": "🚫"
          },
          {
            "id": "activism",
            "en": "activism",
            "pt": "ativismo",
            "emoji": "📢"
          },
          {
            "id": "referendum",
            "en": "referendum",
            "pt": "referendo",
            "emoji": "🗳️"
          },
          {
            "id": "accountability",
            "en": "accountability",
            "pt": "prestação de contas",
            "emoji": "🔍"
          },
          {
            "id": "injustice",
            "en": "injustice",
            "pt": "injustiça",
            "emoji": "❗"
          },
          {
            "id": "diplomacy",
            "en": "diplomacy",
            "pt": "diplomacia",
            "emoji": "🤝"
          },
          {
            "id": "censorship",
            "en": "censorship",
            "pt": "censura",
            "emoji": "🔇"
          },
          {
            "id": "equality",
            "en": "equality",
            "pt": "igualdade",
            "emoji": "🟰"
          },
          {
            "id": "jurisdiction",
            "en": "jurisdiction",
            "pt": "jurisdição",
            "emoji": "🏛️"
          },
          {
            "id": "advocacy",
            "en": "advocacy",
            "pt": "defesa de uma causa",
            "emoji": "💬"
          }
        ],
        "readingTime": {
          "text": "Across the globe, citizens are increasingly demanding greater accountability from their governments.\nIn several countries, activism has grown after a referendum revealed deep divisions over civil liberties.\nSome argue that stricter legislation is needed to prevent discrimination, while others fear it could lead to censorship.\nMeanwhile, human rights organizations continue their advocacy for equality before the law.\nA recent constitutional court ruling reminded politicians that no institution is above the constitution.\nCritics claim that without real diplomacy, such disputes only deepen social injustice.\nStill, most analysts agree that transparent jurisdiction and public debate remain the best path forward.",
          "questions": [
            {
              "prompt": "What is the main concern raised in the passage regarding new legislation?",
              "options": [
                "That it could lead to censorship",
                "That it is too expensive",
                "That it will end diplomacy"
              ],
              "correct": "That it could lead to censorship"
            },
            {
              "prompt": "According to the text, what do most analysts believe is the best way forward?",
              "options": [
                "Stricter censorship laws",
                "Transparent jurisdiction and public debate",
                "Ending all referendums"
              ],
              "correct": "Transparent jurisdiction and public debate"
            }
          ]
        }
      },
      {
        "id": "economy",
        "title": "Global Economy & Business",
        "emoji": "💹",
        "description": "Jobs, entrepreneurship, inflation & trade",
        "cefr": "B2-C1",
        "grammarTip": "Economic vocabulary often pairs with specific verbs: 'inflation rises/falls', 'a company launches/expands', 'trade barriers are imposed/lifted'. Note the difference between 'economic' (relating to the economy) and 'economical' (not wasteful). For example: 'As inflation rose, many entrepreneurs found it harder to secure investment for their startups.'",
        "words": [
          {
            "id": "global-job-market",
            "en": "global job market",
            "pt": "mercado de trabalho global",
            "emoji": "🌍"
          },
          {
            "id": "entrepreneurship",
            "en": "entrepreneurship",
            "pt": "empreendedorismo",
            "emoji": "🚀"
          },
          {
            "id": "inflation",
            "en": "inflation",
            "pt": "inflação",
            "emoji": "📈"
          },
          {
            "id": "international-trade",
            "en": "international trade",
            "pt": "comércio internacional",
            "emoji": "🚢"
          },
          {
            "id": "investment",
            "en": "investment",
            "pt": "investimento",
            "emoji": "💰"
          },
          {
            "id": "startup",
            "en": "startup",
            "pt": "startup / empresa iniciante",
            "emoji": "🏢"
          },
          {
            "id": "supply-and-demand",
            "en": "supply and demand",
            "pt": "oferta e demanda",
            "emoji": "⚖️"
          },
          {
            "id": "recession",
            "en": "recession",
            "pt": "recessão",
            "emoji": "📉"
          },
          {
            "id": "outsourcing",
            "en": "outsourcing",
            "pt": "terceirização",
            "emoji": "🌐"
          },
          {
            "id": "revenue",
            "en": "revenue",
            "pt": "receita",
            "emoji": "💵"
          },
          {
            "id": "negotiation",
            "en": "negotiation",
            "pt": "negociação",
            "emoji": "🤝"
          },
          {
            "id": "tariff",
            "en": "tariff",
            "pt": "tarifa",
            "emoji": "🧾"
          },
          {
            "id": "unemployment",
            "en": "unemployment",
            "pt": "desemprego",
            "emoji": "📊"
          },
          {
            "id": "competitive-advantage",
            "en": "competitive advantage",
            "pt": "vantagem competitiva",
            "emoji": "🏆"
          },
          {
            "id": "sustainability",
            "en": "sustainability",
            "pt": "sustentabilidade",
            "emoji": "♻️"
          }
        ],
        "readingTime": {
          "text": "Anna: Have you seen the latest report on the global job market?\nLuca: Yes, it says entrepreneurship is booming despite rising inflation.\nAnna: That's surprising, since international trade has slowed down this year.\nLuca: True, but many startups are attracting investment because they focus on sustainability.\nAnna: Still, outsourcing and automation are pushing unemployment higher in some sectors.\nLuca: Exactly, companies need a real competitive advantage to survive the next recession.\nAnna: Perhaps clever negotiation over tariffs could help stabilize supply and demand.\nLuca: Let's hope policymakers agree before revenue drops even further.",
          "questions": [
            {
              "prompt": "According to Luca, what are many startups attracting despite inflation?",
              "options": [
                "Investment",
                "Government subsidies",
                "Free tariffs"
              ],
              "correct": "Investment"
            },
            {
              "prompt": "What does Luca say companies need to survive the next recession?",
              "options": [
                "Lower unemployment",
                "A real competitive advantage",
                "More outsourcing"
              ],
              "correct": "A real competitive advantage"
            }
          ]
        }
      },
      {
        "id": "scienceuniverse",
        "title": "Science, Innovation & The Universe",
        "emoji": "🔭",
        "description": "Space, genetics, medicine & scientific ethics",
        "cefr": "B2-C1",
        "grammarTip": "Scientific English often uses passive constructions and precise nominalizations, e.g. 'the experiment was conducted' rather than 'we did the experiment'. Distinguish 'discover' (find something that already existed) from 'invent' (create something new). For example: 'Scientists discovered the gene, but it took years before a treatment was invented.'",
        "words": [
          {
            "id": "space-exploration",
            "en": "space exploration",
            "pt": "exploração espacial",
            "emoji": "🚀"
          },
          {
            "id": "genetics",
            "en": "genetics",
            "pt": "genética",
            "emoji": "🧬"
          },
          {
            "id": "medical-breakthrough",
            "en": "medical breakthrough",
            "pt": "avanço médico",
            "emoji": "💊"
          },
          {
            "id": "artificial-intelligence",
            "en": "artificial intelligence",
            "pt": "inteligência artificial",
            "emoji": "🤖"
          },
          {
            "id": "ethical-dilemma",
            "en": "ethical dilemma",
            "pt": "dilema ético",
            "emoji": "🧭"
          },
          {
            "id": "hypothesis",
            "en": "hypothesis",
            "pt": "hipótese",
            "emoji": "🔬"
          },
          {
            "id": "experiment",
            "en": "experiment",
            "pt": "experimento",
            "emoji": "🧪"
          },
          {
            "id": "telescope",
            "en": "telescope",
            "pt": "telescópio",
            "emoji": "🔭"
          },
          {
            "id": "genome",
            "en": "genome",
            "pt": "genoma",
            "emoji": "🧬"
          },
          {
            "id": "clinical-trial",
            "en": "clinical trial",
            "pt": "ensaio clínico",
            "emoji": "🩺"
          },
          {
            "id": "innovation",
            "en": "innovation",
            "pt": "inovação",
            "emoji": "💡"
          },
          {
            "id": "exoplanet",
            "en": "exoplanet",
            "pt": "exoplaneta",
            "emoji": "🪐"
          },
          {
            "id": "biotechnology",
            "en": "biotechnology",
            "pt": "biotecnologia",
            "emoji": "🧫"
          },
          {
            "id": "research",
            "en": "research",
            "pt": "pesquisa",
            "emoji": "📚"
          },
          {
            "id": "astronomer",
            "en": "astronomer",
            "pt": "astrônomo(a)",
            "emoji": "👩‍🔬"
          }
        ],
        "readingTime": {
          "text": "Last month, a team of astronomers announced the discovery of a new exoplanet using a powerful space telescope.\nAt the same time, researchers in genetics revealed a medical breakthrough that could transform how clinical trials are conducted.\nThe hypothesis, first tested in a small experiment, was later confirmed through more rigorous research.\nHowever, the innovation has sparked an ethical dilemma about how far biotechnology should go in editing the human genome.\nSome scientists worry that artificial intelligence is now making decisions once reserved for human experts.\nOthers insist that responsible regulation, not fear, should guide future exploration of both space and the human body.\nEither way, this discovery reminds us that scientific progress rarely comes without difficult questions.",
          "questions": [
            {
              "prompt": "What ethical concern is raised by the new genetic breakthrough?",
              "options": [
                "How far biotechnology should go in editing the genome",
                "Whether telescopes are too expensive",
                "Whether exoplanets are habitable"
              ],
              "correct": "How far biotechnology should go in editing the genome"
            },
            {
              "prompt": "What do some scientists say about artificial intelligence?",
              "options": [
                "It has replaced all astronomers",
                "It is now making decisions once reserved for human experts",
                "It cannot be used in research"
              ],
              "correct": "It is now making decisions once reserved for human experts"
            }
          ]
        }
      },
      {
        "id": "artculture",
        "title": "Art, Literature & Culture",
        "emoji": "🎭",
        "description": "Narrative analysis, movements & expression",
        "cefr": "B2-C1",
        "grammarTip": "When analyzing literature, use precise verbs like 'portray', 'convey', and 'evoke' instead of generic ones like 'show'. Note that 'a novel' is a long fictional work, while 'a narrative' refers to the way a story is told. For example: 'The author's narrative technique conveys a deep sense of nostalgia through vivid imagery.'",
        "words": [
          {
            "id": "narrative",
            "en": "narrative",
            "pt": "narrativa",
            "emoji": "📖"
          },
          {
            "id": "protagonist",
            "en": "protagonist",
            "pt": "protagonista",
            "emoji": "🧑‍🎤"
          },
          {
            "id": "plot-twist",
            "en": "plot twist",
            "pt": "reviravolta na trama",
            "emoji": "🔀"
          },
          {
            "id": "symbolism",
            "en": "symbolism",
            "pt": "simbolismo",
            "emoji": "🔣"
          },
          {
            "id": "artistic-movement",
            "en": "artistic movement",
            "pt": "movimento artístico",
            "emoji": "🎨"
          },
          {
            "id": "imagery",
            "en": "imagery",
            "pt": "linguagem visual/figurativa",
            "emoji": "🖼️"
          },
          {
            "id": "metaphor",
            "en": "metaphor",
            "pt": "metáfora",
            "emoji": "💬"
          },
          {
            "id": "satire",
            "en": "satire",
            "pt": "sátira",
            "emoji": "😏"
          },
          {
            "id": "masterpiece",
            "en": "masterpiece",
            "pt": "obra-prima",
            "emoji": "🏆"
          },
          {
            "id": "cultural-heritage",
            "en": "cultural heritage",
            "pt": "patrimônio cultural",
            "emoji": "🏛️"
          },
          {
            "id": "irony",
            "en": "irony",
            "pt": "ironia",
            "emoji": "🙃"
          },
          {
            "id": "allegory",
            "en": "allegory",
            "pt": "alegoria",
            "emoji": "📜"
          },
          {
            "id": "folklore",
            "en": "folklore",
            "pt": "folclore",
            "emoji": "🧙"
          },
          {
            "id": "aesthetic",
            "en": "aesthetic",
            "pt": "estética",
            "emoji": "✨"
          }
        ],
        "readingTime": {
          "text": "Great literature often relies on symbolism and imagery to convey ideas that words alone cannot fully express.\nIn one classic novel, the protagonist's journey becomes an allegory for the loss of cultural heritage in a rapidly changing world.\nThe author uses satire to criticize social norms, while a clever plot twist forces readers to reconsider everything they thought they knew.\nCritics often debate which artistic movement most influenced the writer's distinctive aesthetic.\nSome scholars highlight the irony in a tragic ending that initially seems hopeful.\nOthers trace the story's roots back to local folklore passed down through generations.\nWhatever the interpretation, the novel remains a masterpiece precisely because it invites so many readings.",
          "questions": [
            {
              "prompt": "What literary device does the author use to criticize social norms?",
              "options": [
                "Satire",
                "Folklore",
                "Aesthetic description"
              ],
              "correct": "Satire"
            },
            {
              "prompt": "What does the protagonist's journey become an allegory for?",
              "options": [
                "The loss of cultural heritage",
                "A scientific discovery",
                "An economic recession"
              ],
              "correct": "The loss of cultural heritage"
            }
          ]
        }
      },
      {
        "id": "idioms",
        "title": "Complex Idioms & Proverbs",
        "emoji": "💬",
        "description": "Advanced idioms & classic English proverbs",
        "cefr": "B2-C1",
        "grammarTip": "Idioms cannot usually be translated word for word; instead, learn their overall meaning and typical context. Proverbs often use imperative or conditional structures to express timeless advice, such as 'Don't count your chickens before they hatch.' For example: 'After weeks of arguing, the siblings finally decided to bite the bullet and sell the old house.'",
        "words": [
          {
            "id": "bite-the-bullet",
            "en": "bite the bullet",
            "pt": "enfrentar algo difícil com coragem",
            "emoji": "💪"
          },
          {
            "id": "see-eye-to-eye",
            "en": "see eye to eye",
            "pt": "concordar completamente com alguém",
            "emoji": "👀"
          },
          {
            "id": "once-in-a-blue-moon",
            "en": "once in a blue moon",
            "pt": "muito raramente",
            "emoji": "🌕"
          },
          {
            "id": "hit-the-nail",
            "en": "hit the nail on the head",
            "pt": "acertar exatamente no ponto",
            "emoji": "🔨"
          },
          {
            "id": "let-cat-out-of-bag",
            "en": "let the cat out of the bag",
            "pt": "revelar um segredo sem querer",
            "emoji": "🐱"
          },
          {
            "id": "arm-and-a-leg",
            "en": "cost an arm and a leg",
            "pt": "custar muito caro",
            "emoji": "💸"
          },
          {
            "id": "actions-speak",
            "en": "actions speak louder than words",
            "pt": "ações valem mais que palavras",
            "emoji": "🗣️"
          },
          {
            "id": "judge-book-cover",
            "en": "don't judge a book by its cover",
            "pt": "não julgue pelas aparências",
            "emoji": "📚"
          },
          {
            "id": "ball-in-your-court",
            "en": "the ball is in your court",
            "pt": "a decisão agora é sua",
            "emoji": "🎾"
          },
          {
            "id": "midnight-oil",
            "en": "burn the midnight oil",
            "pt": "trabalhar ou estudar até tarde da noite",
            "emoji": "🕯️"
          },
          {
            "id": "blessing-in-disguise",
            "en": "a blessing in disguise",
            "pt": "algo ruim que acaba sendo bom",
            "emoji": "🍀"
          },
          {
            "id": "when-in-rome",
            "en": "when in Rome, do as the Romans do",
            "pt": "adapte-se aos costumes locais",
            "emoji": "🏛️"
          },
          {
            "id": "cut-corners",
            "en": "cut corners",
            "pt": "fazer algo mais barato ou rápido sacrificando a qualidade",
            "emoji": "✂️"
          },
          {
            "id": "on-the-fence",
            "en": "on the fence",
            "pt": "indeciso, em cima do muro",
            "emoji": "🚧"
          }
        ],
        "readingTime": {
          "text": "Maria: I've been putting off this decision for weeks, but I think it's time to bite the bullet.\nJames: Finally! To be honest, we've never really seen eye to eye on this project anyway.\nMaria: True, but your comment yesterday really hit the nail on the head about our biggest problem.\nJames: Thanks. Still, don't judge a book by its cover, the new manager might actually help us.\nMaria: Maybe, but changing suppliers now could cost an arm and a leg.\nJames: Fair point. Well, the ball is in your court now, so let me know what you decide.\nMaria: Once in a blue moon we actually agree on something this quickly.",
          "questions": [
            {
              "prompt": "What does James think about the new manager?",
              "options": [
                "That people shouldn't judge her before knowing her",
                "That she will cost too much money",
                "That she agrees with everything Maria says"
              ],
              "correct": "That people shouldn't judge her before knowing her"
            },
            {
              "prompt": "What does the idiom 'the ball is in your court' mean in this dialogue?",
              "options": [
                "The decision now belongs to Maria",
                "The meeting is cancelled",
                "James wants to play a game"
              ],
              "correct": "The decision now belongs to Maria"
            }
          ]
        }
      },
      {
        "id": "pastperfect",
        "title": "Grammar: Past Perfect & Past Perfect Continuous",
        "emoji": "⏪",
        "description": "Actions completed before another past action",
        "cefr": "B2-C1",
        "grammarTip": "Use the Past Perfect ('had + past participle') to show that one past action was completed before another past action began. Use the Past Perfect Continuous ('had been + -ing') to emphasize the duration of an action up to that past moment. For example: 'By the time the film started, we had already eaten, and we had been waiting in line for over an hour.'",
        "words": [
          {
            "id": "had-finished",
            "en": "had finished",
            "pt": "tinha terminado",
            "emoji": "✅"
          },
          {
            "id": "had-already-left",
            "en": "had already left",
            "pt": "já tinha saído",
            "emoji": "🚪"
          },
          {
            "id": "had-never-seen",
            "en": "had never seen",
            "pt": "nunca tinha visto",
            "emoji": "👀"
          },
          {
            "id": "had-been-waiting",
            "en": "had been waiting",
            "pt": "estava esperando havia um tempo",
            "emoji": "⏳"
          },
          {
            "id": "had-been-studying",
            "en": "had been studying",
            "pt": "estava estudando havia um tempo",
            "emoji": "📚"
          },
          {
            "id": "had-lived",
            "en": "had lived",
            "pt": "tinha morado",
            "emoji": "🏠"
          },
          {
            "id": "had-been-working",
            "en": "had been working",
            "pt": "estava trabalhando havia um tempo",
            "emoji": "💼"
          },
          {
            "id": "had-forgotten",
            "en": "had forgotten",
            "pt": "tinha esquecido",
            "emoji": "🤦"
          },
          {
            "id": "had-arrived",
            "en": "had arrived",
            "pt": "tinha chegado",
            "emoji": "🛬"
          },
          {
            "id": "had-been-raining",
            "en": "had been raining",
            "pt": "estava chovendo havia um tempo",
            "emoji": "🌧️"
          },
          {
            "id": "had-told",
            "en": "had told",
            "pt": "tinha contado/dito",
            "emoji": "🗣️"
          },
          {
            "id": "had-realized",
            "en": "had realized",
            "pt": "tinha percebido",
            "emoji": "💡"
          },
          {
            "id": "had-been-planning",
            "en": "had been planning",
            "pt": "estava planejando havia um tempo",
            "emoji": "📝"
          },
          {
            "id": "had-not-expected",
            "en": "had not expected",
            "pt": "não tinha esperado/previsto",
            "emoji": "😲"
          }
        ],
        "readingTime": {
          "text": "By the time Sarah arrived at the station, the train had already left.\nShe had been waiting for almost an hour when she finally realized her phone had died.\nEarlier that morning, she had told her brother she would be on time, but she had not expected such heavy traffic.\nIt had been raining all night, and the roads had turned to mud.\nSarah had lived in that town for years, yet she had never seen the streets so flooded.\nHer brother, who had been studying for an exam all week, had forgotten to check the weather report.\nBy the time they finally met, they had both been planning the same surprise for their mother.\nLooking back, Sarah realized she had been working too hard to notice the storm coming.",
          "questions": [
            {
              "prompt": "Why did Sarah miss her train?",
              "options": [
                "It had already left by the time she arrived",
                "She had never seen the station before",
                "She had forgotten to buy a ticket"
              ],
              "correct": "It had already left by the time she arrived"
            },
            {
              "prompt": "Which sentence correctly shows an action that continued for a period before another past event?",
              "options": [
                "The train had already left.",
                "She had been waiting for almost an hour.",
                "She had told her brother."
              ],
              "correct": "She had been waiting for almost an hour."
            }
          ]
        }
      },
      {
        "id": "futureperfect",
        "title": "Grammar: Future Perfect & Future Perfect Continuous",
        "emoji": "⏩",
        "description": "Actions completed by a future point in time",
        "cefr": "B2-C1",
        "grammarTip": "Use the Future Perfect ('will have + past participle') to describe an action that will be completed before a specific future time. Use the Future Perfect Continuous ('will have been + -ing') to emphasize the duration of an ongoing action up to that future point. For example: 'By next June, she will have graduated, and by then she will have been living abroad for two full years.'",
        "words": [
          {
            "id": "will-have-finished",
            "en": "will have finished",
            "pt": "terá terminado",
            "emoji": "🏁"
          },
          {
            "id": "will-have-arrived",
            "en": "will have arrived",
            "pt": "terá chegado",
            "emoji": "🛬"
          },
          {
            "id": "will-have-graduated",
            "en": "will have graduated",
            "pt": "terá se formado",
            "emoji": "🎓"
          },
          {
            "id": "will-have-been-working",
            "en": "will have been working",
            "pt": "estará trabalhando por um período",
            "emoji": "💼"
          },
          {
            "id": "will-have-left",
            "en": "will have left",
            "pt": "terá saído/partido",
            "emoji": "🚪"
          },
          {
            "id": "will-have-completed",
            "en": "will have completed",
            "pt": "terá concluído",
            "emoji": "✅"
          },
          {
            "id": "will-have-been-studying",
            "en": "will have been studying",
            "pt": "estará estudando por um período",
            "emoji": "📚"
          },
          {
            "id": "will-have-moved",
            "en": "will have moved",
            "pt": "terá se mudado",
            "emoji": "📦"
          },
          {
            "id": "will-have-been-living",
            "en": "will have been living",
            "pt": "estará morando por um período",
            "emoji": "🏡"
          },
          {
            "id": "will-have-decided",
            "en": "will have decided",
            "pt": "terá decidido",
            "emoji": "🤔"
          },
          {
            "id": "will-have-been-waiting",
            "en": "will have been waiting",
            "pt": "estará esperando por um período",
            "emoji": "⏳"
          },
          {
            "id": "will-have-saved",
            "en": "will have saved",
            "pt": "terá economizado",
            "emoji": "💰"
          },
          {
            "id": "will-have-retired",
            "en": "will have retired",
            "pt": "terá se aposentado",
            "emoji": "🧓"
          },
          {
            "id": "will-have-been-traveling",
            "en": "will have been traveling",
            "pt": "estará viajando por um período",
            "emoji": "✈️"
          }
        ],
        "readingTime": {
          "text": "By the time you read this letter, I will have moved to a new city and will have started my first real job.\nIn ten years, I imagine I will have completed my degree and will have been working in the same field for quite a while.\nMy sister, on the other hand, will have graduated much earlier and will probably have saved enough money to travel.\nBy next summer, our parents will have retired, and they will have been living in the countryside for almost a year.\nI wonder if, by then, I will have decided where I truly want to settle down.\nPerhaps by the time we meet again, you will have been traveling for months and will have countless stories to tell.\nWhatever happens, I hope that by next year we will have finished this long chapter of uncertainty together.",
          "questions": [
            {
              "prompt": "What does the writer imagine about their sister?",
              "options": [
                "She will have graduated earlier and saved money to travel",
                "She will have retired by next summer",
                "She will never finish her degree"
              ],
              "correct": "She will have graduated earlier and saved money to travel"
            },
            {
              "prompt": "Which phrase correctly emphasizes the duration of an action up to a future point?",
              "options": [
                "will have moved",
                "will have been living",
                "will have decided"
              ],
              "correct": "will have been living"
            }
          ]
        }
      },
      {
        "id": "mixedconditionals",
        "title": "Grammar: Mixed Conditionals",
        "emoji": "🔀",
        "description": "Mixing past & present hypothetical situations",
        "cefr": "B2-C1",
        "grammarTip": "Mixed conditionals combine a hypothetical condition from one time period with a hypothetical result in another, most commonly a past condition producing a present result. The typical structure is 'If + past perfect, ... would + base verb'. For example: 'If I had studied medicine, I would be a doctor now,' shows how a past decision still affects the present.",
        "words": [
          {
            "id": "mc-medicine",
            "en": "If I had studied medicine, I would be a doctor now.",
            "pt": "Se eu tivesse estudado medicina, eu seria médico(a) agora.",
            "emoji": "🩺"
          },
          {
            "id": "mc-job-abroad",
            "en": "If she had taken that job, she would be living abroad now.",
            "pt": "Se ela tivesse aceitado aquele emprego, ela estaria morando no exterior agora.",
            "emoji": "✈️"
          },
          {
            "id": "mc-traffic",
            "en": "If we had left earlier, we wouldn't be stuck in traffic now.",
            "pt": "Se tivéssemos saído mais cedo, não estaríamos presos no trânsito agora.",
            "emoji": "🚦"
          },
          {
            "id": "mc-flight",
            "en": "If he hadn't missed the flight, he would be at the conference now.",
            "pt": "Se ele não tivesse perdido o voo, ele estaria na conferência agora.",
            "emoji": "🎤"
          },
          {
            "id": "mc-debt",
            "en": "If they had saved money, they wouldn't be in debt today.",
            "pt": "Se eles tivessem economizado dinheiro, não estariam endividados hoje.",
            "emoji": "💳"
          },
          {
            "id": "mc-helped",
            "en": "If I weren't so busy, I would have helped you yesterday.",
            "pt": "Se eu não estivesse tão ocupado(a), eu teria te ajudado ontem.",
            "emoji": "🤝"
          },
          {
            "id": "mc-applied",
            "en": "If she were more confident, she would have applied for the job.",
            "pt": "Se ela fosse mais confiante, ela teria se candidatado ao emprego.",
            "emoji": "📄"
          },
          {
            "id": "mc-beach",
            "en": "If it hadn't rained all week, we would be at the beach now.",
            "pt": "Se não tivesse chovido a semana toda, estaríamos na praia agora.",
            "emoji": "🏖️"
          },
          {
            "id": "mc-life",
            "en": "If I hadn't met you, my life would be completely different.",
            "pt": "Se eu não tivesse te conhecido, minha vida seria completamente diferente.",
            "emoji": "💞"
          },
          {
            "id": "mc-house",
            "en": "If he were richer, he would have bought that house last year.",
            "pt": "Se ele fosse mais rico, ele teria comprado aquela casa no ano passado.",
            "emoji": "🏠"
          },
          {
            "id": "mc-neighbors",
            "en": "If they hadn't moved abroad, they would still be our neighbors.",
            "pt": "Se eles não tivessem se mudado para o exterior, ainda seriam nossos vizinhos.",
            "emoji": "👋"
          },
          {
            "id": "mc-swim",
            "en": "If I had learned to swim, I wouldn't be afraid of the water now.",
            "pt": "Se eu tivesse aprendido a nadar, não teria medo da água agora.",
            "emoji": "🏊"
          }
        ],
        "readingTime": {
          "text": "Tom: Sometimes I wonder, if I had studied medicine, I would be a doctor now.\nElla: Really? If I had taken that marketing job years ago, I would probably be living abroad today.\nTom: Instead, we're both here! If we had left our old jobs sooner, we wouldn't be feeling so stuck now.\nElla: True, and if you hadn't missed that scholarship interview, you would be at university right now.\nTom: Don't remind me. If I had saved more back then, I wouldn't be worrying about money today.\nElla: Well, if you weren't so hard on yourself, you would have applied for a new position months ago.\nTom: Maybe. If I hadn't met you, though, my life would be far less interesting.\nElla: Same here. If we hadn't both taken risks, we wouldn't be exactly where we are now.",
          "questions": [
            {
              "prompt": "According to Tom, what would be true if he had studied medicine?",
              "options": [
                "He would be a doctor now",
                "He would still be a student",
                "He would have missed the interview"
              ],
              "correct": "He would be a doctor now"
            },
            {
              "prompt": "Which sentence is an example of a mixed conditional (past condition, present result)?",
              "options": [
                "If we hadn't both taken risks, we wouldn't be exactly where we are now.",
                "If it rains tomorrow, we will stay home.",
                "If I study hard, I will pass the exam."
              ],
              "correct": "If we hadn't both taken risks, we wouldn't be exactly where we are now."
            }
          ]
        }
      },
      {
        "id": "reportedspeech",
        "title": "Grammar: Advanced Reported Speech",
        "emoji": "🗣️",
        "description": "Complex tense shifts & varied reporting verbs",
        "cefr": "B2-C1",
        "grammarTip": "In reported speech, tenses usually shift backward (present becomes past, past becomes past perfect), and the choice of reporting verb ('admit', 'insist', 'deny', 'claim') adds nuance the listener would otherwise miss. For example, instead of 'He said he was innocent,' a more precise report might be 'He insisted that he had been innocent all along.' Some reporting verbs, like 'suggest' and 'recommend', also require a special subjunctive structure.",
        "words": [
          {
            "id": "she-admitted-that",
            "en": "she admitted that",
            "pt": "ela admitiu que",
            "emoji": "😳"
          },
          {
            "id": "he-insisted-that",
            "en": "he insisted that",
            "pt": "ele insistiu que",
            "emoji": "💪"
          },
          {
            "id": "they-denied-that",
            "en": "they denied that",
            "pt": "eles negaram que",
            "emoji": "🙅"
          },
          {
            "id": "she-claimed-that",
            "en": "she claimed that",
            "pt": "ela alegou que",
            "emoji": "🗯️"
          },
          {
            "id": "he-pointed-out-that",
            "en": "he pointed out that",
            "pt": "ele observou/apontou que",
            "emoji": "👉"
          },
          {
            "id": "she-warned-not-to",
            "en": "she warned me not to",
            "pt": "ela me avisou para não",
            "emoji": "⚠️"
          },
          {
            "id": "they-suggested-that",
            "en": "they suggested that",
            "pt": "eles sugeriram que",
            "emoji": "💡"
          },
          {
            "id": "he-recommended-that",
            "en": "he recommended that",
            "pt": "ele recomendou que",
            "emoji": "📋"
          },
          {
            "id": "she-wondered-whether",
            "en": "she wondered whether",
            "pt": "ela se perguntou se",
            "emoji": "🤔"
          },
          {
            "id": "he-explained-that",
            "en": "he explained that",
            "pt": "ele explicou que",
            "emoji": "📖"
          },
          {
            "id": "they-confirmed-that",
            "en": "they confirmed that",
            "pt": "eles confirmaram que",
            "emoji": "✅"
          },
          {
            "id": "she-accused-him-of",
            "en": "she accused him of",
            "pt": "ela o acusou de",
            "emoji": "😠"
          },
          {
            "id": "he-apologized-for",
            "en": "he apologized for",
            "pt": "ele se desculpou por",
            "emoji": "🙏"
          },
          {
            "id": "they-agreed-that",
            "en": "they agreed that",
            "pt": "eles concordaram que",
            "emoji": "🤝"
          }
        ],
        "readingTime": {
          "text": "During the interview, the manager finally admitted that the project had been delayed for months.\nWhen reporters asked about the missing funds, the director denied that anyone in his team had acted improperly.\nHowever, one former employee claimed that she had warned the company not to ignore the audit results.\nAnother colleague pointed out that similar problems had occurred the previous year.\nThe committee explained that they had recommended stronger financial controls long before the scandal broke.\nA spokesperson later confirmed that an independent investigation would begin the following week.\nStill, critics insisted that the company had known about the issue far earlier than it admitted.\nIn the end, the board agreed that transparency had been lacking throughout the whole process.",
          "questions": [
            {
              "prompt": "What did the former employee claim she had done?",
              "options": [
                "Warned the company not to ignore the audit results",
                "Denied all responsibility",
                "Recommended firing the director"
              ],
              "correct": "Warned the company not to ignore the audit results"
            },
            {
              "prompt": "Which reported speech structure correctly shows a backshifted tense?",
              "options": [
                "The manager admitted that the project had been delayed.",
                "The manager admits the project is delayed.",
                "The manager will admit the project is delayed."
              ],
              "correct": "The manager admitted that the project had been delayed."
            }
          ]
        }
      },
      {
        "id": "passiveall",
        "title": "Grammar: Passive Voice — All Tenses & Impersonal Structures",
        "emoji": "🔄",
        "description": "Passive across tenses & impersonal 'it is said' forms",
        "cefr": "B2-C1",
        "grammarTip": "The passive voice ('be' + past participle) shifts focus from the doer of an action to the action itself or its receiver, and can be formed in nearly every tense. Impersonal structures like 'It is said that...' or 'It is believed that...' are used to report general opinions without naming a specific source. For example: 'It is widely believed that the ancient library was destroyed by fire, although the exact cause has never been confirmed.'",
        "words": [
          {
            "id": "is-made",
            "en": "is made",
            "pt": "é feito",
            "emoji": "🏭"
          },
          {
            "id": "was-built",
            "en": "was built",
            "pt": "foi construído",
            "emoji": "🏛️"
          },
          {
            "id": "has-been-discovered",
            "en": "has been discovered",
            "pt": "foi descoberto",
            "emoji": "🔍"
          },
          {
            "id": "will-be-announced",
            "en": "will be announced",
            "pt": "será anunciado",
            "emoji": "📢"
          },
          {
            "id": "is-being-repaired",
            "en": "is being repaired",
            "pt": "está sendo consertado",
            "emoji": "🔧"
          },
          {
            "id": "had-been-forgotten",
            "en": "had been forgotten",
            "pt": "tinha sido esquecido",
            "emoji": "😶"
          },
          {
            "id": "is-said-that",
            "en": "it is said that",
            "pt": "diz-se que",
            "emoji": "🗣️"
          },
          {
            "id": "is-believed-that",
            "en": "it is believed that",
            "pt": "acredita-se que",
            "emoji": "💭"
          },
          {
            "id": "is-thought-that",
            "en": "it is thought that",
            "pt": "pensa-se que",
            "emoji": "🤔"
          },
          {
            "id": "is-known-that",
            "en": "it is known that",
            "pt": "sabe-se que",
            "emoji": "📚"
          },
          {
            "id": "is-reported-that",
            "en": "it is reported that",
            "pt": "é relatado que",
            "emoji": "📰"
          },
          {
            "id": "was-invented",
            "en": "was invented",
            "pt": "foi inventado",
            "emoji": "💡"
          },
          {
            "id": "will-have-been-completed",
            "en": "will have been completed",
            "pt": "terá sido concluído",
            "emoji": "✅"
          },
          {
            "id": "is-being-investigated",
            "en": "is being investigated",
            "pt": "está sendo investigado",
            "emoji": "🕵️"
          }
        ],
        "readingTime": {
          "text": "It is often said that necessity is the mother of invention, and few stories illustrate this better than the history of the printing press.\nThe first version is believed to have been built in the fifteenth century, although similar techniques had already been used in Asia much earlier.\nIt is known that the machine was gradually improved over decades until it could produce books far more quickly than before.\nToday, an ancient prototype is being investigated by historians who suspect it was invented independently in several regions.\nIt is reported that a nearly complete model was recently discovered in a museum archive, where it had been forgotten for over a century.\nRestoration work is currently being carried out, and the results will be announced once the project is finished.\nExperts estimate that the full analysis will have been completed by the end of next year.",
          "questions": [
            {
              "prompt": "What is currently happening to the ancient prototype, according to the text?",
              "options": [
                "It is being investigated by historians",
                "It has been destroyed",
                "It will be sold at auction"
              ],
              "correct": "It is being investigated by historians"
            },
            {
              "prompt": "Which phrase is an example of an impersonal passive structure?",
              "options": [
                "It is often said that necessity is the mother of invention.",
                "Historians investigated the prototype.",
                "The museum found the model."
              ],
              "correct": "It is often said that necessity is the mother of invention."
            }
          ]
        }
      },
      {
        "id": "advancedphrasals",
        "title": "Grammar: Advanced Phrasal Verbs & Prepositional Idioms",
        "emoji": "🧩",
        "description": "Multi-word verbs like 'get away with', 'look down on'",
        "cefr": "B2-C1",
        "grammarTip": "Phrasal verbs combine a verb with one or two particles to create a meaning that is often impossible to guess from the individual words, and many are separable ('put the meeting off') while others are not ('come across a photo'). Prepositional idioms follow a similar pattern but always keep the preposition attached to a noun or pronoun. For example: 'She couldn't believe he had gotten away with copying her homework for months.'",
        "words": [
          {
            "id": "come-across",
            "en": "come across",
            "pt": "encontrar por acaso / dar de cara com",
            "emoji": "🔎"
          },
          {
            "id": "put-up-with",
            "en": "put up with",
            "pt": "tolerar / aguentar",
            "emoji": "😤"
          },
          {
            "id": "get-away-with",
            "en": "get away with",
            "pt": "sair impune de algo / se safar de algo",
            "emoji": "🏃‍♂️"
          },
          {
            "id": "look-down-on",
            "en": "look down on",
            "pt": "menosprezar, olhar com desdém para",
            "emoji": "👇"
          },
          {
            "id": "come-up-with",
            "en": "come up with",
            "pt": "inventar/apresentar uma ideia",
            "emoji": "💡"
          },
          {
            "id": "go-through-with",
            "en": "go through with",
            "pt": "levar adiante algo planejado",
            "emoji": "🚶"
          },
          {
            "id": "take-after",
            "en": "take after",
            "pt": "puxar a alguém, parecer-se com",
            "emoji": "👨‍👩‍👧"
          },
          {
            "id": "make-up-for",
            "en": "make up for",
            "pt": "compensar",
            "emoji": "⚖️"
          },
          {
            "id": "fall-back-on",
            "en": "fall back on",
            "pt": "recorrer a, como último recurso",
            "emoji": "🪂"
          },
          {
            "id": "look-forward-to",
            "en": "look forward to",
            "pt": "ansiar por, esperar com expectativa",
            "emoji": "😊"
          },
          {
            "id": "put-off",
            "en": "put off",
            "pt": "adiar",
            "emoji": "⏰"
          },
          {
            "id": "run-into",
            "en": "run into",
            "pt": "encontrar por acaso uma pessoa",
            "emoji": "🚶‍♀️"
          },
          {
            "id": "catch-up-on",
            "en": "catch up on",
            "pt": "se atualizar sobre / recuperar o atraso em",
            "emoji": "📚"
          },
          {
            "id": "stand-up-for",
            "en": "stand up for",
            "pt": "defender uma causa ou pessoa",
            "emoji": "🛡️"
          }
        ],
        "readingTime": {
          "text": "Ben: I can't believe he got away with handing in the same essay twice.\nMia: Honestly, I've had to put up with his excuses for the whole semester.\nBen: True, but I actually came across his old notebook yesterday and understood why he struggles.\nMia: Still, you shouldn't look down on him just because he learns differently.\nBen: Fair enough. Maybe we should come up with a plan to help him catch up on the material.\nMia: Good idea. He clearly takes after his older brother, who also fell back on last-minute cramming.\nBen: If he doesn't go through with the makeup exam this time, though, I won't stand up for him again.\nMia: I look forward to seeing him finally take responsibility for once.",
          "questions": [
            {
              "prompt": "What does Mia suggest Ben should not do to their classmate?",
              "options": [
                "Look down on him",
                "Put up with him",
                "Come up with a plan for him"
              ],
              "correct": "Look down on him"
            },
            {
              "prompt": "What does the phrasal verb 'catch up on' mean in this context?",
              "options": [
                "To bring something up to date after falling behind",
                "To argue with someone",
                "To copy someone's work"
              ],
              "correct": "To bring something up to date after falling behind"
            }
          ]
        }
      }
    ]
  }
];
