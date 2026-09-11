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
       image?: string          // optional real photo URL (Unsplash etc.)
                                // — omit it entirely for abstract topics
                                //   (e.g. grammar points); the emoji fallback
                                //   is a first-class, intentional choice,
                                //   not a degraded state.
       words: Word[]           // the vocabulary/example bank — powers EVERY
                                // game (Hangman, Memory, Match-up, Balloon
                                // Pop, Word Search), Reading Time, Practice
                                // Arena, Phonics, and Flashcards. 4-8 items
                                // is the sweet spot.
     }

   WORD — every item inside a topic's `words` array. This exact shape is
   reused everywhere in the app (games.js's wordVisualHTML, learning.js's
   lmWordVisual, gamemaker.js) — keep new entries consistent with it:
     {
       id: string             // unique WITHIN this topic
       en: string              // the English word/phrase students see
       emoji: string           // ALWAYS include this — it's the fallback
                                // shown automatically if `image` 404s, and
                                // the only visual for abstract entries.
       image?: string          // optional real photo URL. Use the IMG()
                                // helper below for images.unsplash.com URLs.
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

const IMG = (id) => `https://images.unsplash.com/photo-${id}?w=400&q=60&auto=format&fit=crop`;

const TIERS = [
  { id: 'kids', label: 'Kids', ages: '3–6', icon: '🧸', color: '#a9b4a4' },
  { id: 'juniors', label: 'Juniors', ages: '7–10', icon: '✏️', color: '#faefc2' },
  { id: 'teens', label: 'Teens', ages: '11–15', icon: '🎧', color: '#8e6d86' },
];

const LEVELS = [
  {
    id: 'a0',
    code: 'A0',
    name: 'Starters',
    tagline: 'First steps into English',
    tier: 'kids',
    color: '#6f7d68',
    icon: '🌱',
    topics: [
      { id: 'colors',  title: 'Colors',   emoji: '🎨', description: 'Name the rainbow, mix and match.',
        image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'red', en: 'Red', emoji: '🟥', swatch: '#EF4444' },
          { id: 'blue', en: 'Blue', emoji: '🟦', swatch: '#3B82F6' },
          { id: 'yellow', en: 'Yellow', emoji: '🟨', swatch: '#FACC15' },
          { id: 'green', en: 'Green', emoji: '🟩', swatch: '#22C55E' },
          { id: 'orange', en: 'Orange', emoji: '🟧', swatch: '#F97316' },
          { id: 'purple', en: 'Purple', emoji: '🟪', swatch: '#A855F7' },
        ] },
      { id: 'numbers', title: 'Numbers 1-10', emoji: '🔢', description: 'Count objects, sing number songs.',
        image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'one', en: 'One', emoji: '1️⃣' },
          { id: 'two', en: 'Two', emoji: '2️⃣' },
          { id: 'three', en: 'Three', emoji: '3️⃣' },
          { id: 'four', en: 'Four', emoji: '4️⃣' },
          { id: 'five', en: 'Five', emoji: '5️⃣' },
          { id: 'six', en: 'Six', emoji: '6️⃣' },
        ] },
      { id: 'animals',  title: 'Animals',  emoji: '🐶', description: 'Farm, jungle and pet friends.',
        image: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'dog', en: 'Dog', emoji: '🐶', image: IMG('1543466835-00a7907e9de1') },
          { id: 'cat', en: 'Cat', emoji: '🐱', image: IMG('1514888286974-6c03e2ca1dba') },
          { id: 'elephant', en: 'Elephant', emoji: '🐘', image: IMG('1557050543-4d5f4e07ef46') },
          { id: 'lion', en: 'Lion', emoji: '🦁', image: IMG('1546182990-dffeafbe841d') },
          { id: 'fish', en: 'Fish', emoji: '🐠', image: IMG('1535591273668-578e31182c4f') },
          { id: 'bird', en: 'Bird', emoji: '🐦', image: IMG('1444464666168-49d633b86797') },
        ] },
      { id: 'family',   title: 'My Family', emoji: '👨‍👩‍👧', description: 'Mom, dad, siblings and more.',
        image: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'mother', en: 'Mother', emoji: '👩' },
          { id: 'father', en: 'Father', emoji: '👨' },
          { id: 'sister', en: 'Sister', emoji: '👧' },
          { id: 'brother', en: 'Brother', emoji: '👦' },
          { id: 'baby', en: 'Baby', emoji: '👶' },
          { id: 'grandma', en: 'Grandmother', emoji: '👵' },
        ] },
      { id: 'body',     title: 'My Body',  emoji: '🙋', description: 'Head, shoulders, knees and toes.',
        image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'head', en: 'Head', emoji: '😀' },
          { id: 'shoulders', en: 'Shoulders', emoji: '🤷' },
          { id: 'knees', en: 'Knees', emoji: '🦵' },
          { id: 'toes', en: 'Toes', emoji: '🦶' },
          { id: 'hands', en: 'Hands', emoji: '✋' },
          { id: 'eyes', en: 'Eyes', emoji: '👀' },
        ] },
      { id: 'toys',     title: 'Toys',     emoji: '🧸', description: 'Playtime words for everyday fun.',
        image: 'https://images.unsplash.com/photo-1558877385-81a1c7e67d72?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'ball', en: 'Ball', emoji: '⚽', image: IMG('1614632537197-38a17061c2bd') },
          { id: 'teddybear', en: 'Teddy Bear', emoji: '🧸', image: IMG('1567016376408-0226e4d0c1ea') },
          { id: 'kite', en: 'Kite', emoji: '🪁', image: IMG('1526367790999-0150786686a2') },
          { id: 'blocks', en: 'Blocks', emoji: '🧱', image: IMG('1587654780291-39c9404d746b') },
          { id: 'doll', en: 'Doll', emoji: '🪆' },
          { id: 'robot', en: 'Robot', emoji: '🤖', image: IMG('1485827404703-89b55fcc595e') },
        ] },
    ],
  },
  {
    id: 'a1',
    code: 'A1',
    name: 'Elementary',
    tagline: 'Building everyday sentences',
    tier: 'juniors',
    color: '#b8953a',
    icon: '🚀',
    topics: [
      { id: 'food',    title: 'Food & Drinks', emoji: '🍎', description: 'Snacks, meals and favorite flavors.',
        image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'apple', en: 'Apple', emoji: '🍎', image: IMG('1560806887-1e4cd0b6cbd6') },
          { id: 'banana', en: 'Banana', emoji: '🍌', image: IMG('1571771894821-ce9b6c11b08e') },
          { id: 'bread', en: 'Bread', emoji: '🍞', image: IMG('1509440159596-0249088772ff') },
          { id: 'milk', en: 'Milk', emoji: '🥛', image: IMG('1550583724-b2692b85b150') },
          { id: 'pizza', en: 'Pizza', emoji: '🍕', image: IMG('1513104890138-7c749659a591') },
          { id: 'juice', en: 'Juice', emoji: '🧃' },
        ] },
      { id: 'routine', title: 'Daily Routine',  emoji: '⏰', description: 'Wake up, brush teeth, go to school.',
        image: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'wakeup', en: 'Wake Up', emoji: '⏰' },
          { id: 'brushteeth', en: 'Brush Teeth', emoji: '🪥' },
          { id: 'breakfast', en: 'Eat Breakfast', emoji: '🍳' },
          { id: 'goschool', en: 'Go To School', emoji: '🎒' },
          { id: 'bath', en: 'Take A Bath', emoji: '🛁' },
          { id: 'sleep', en: 'Sleep', emoji: '😴' },
        ] },
      { id: 'feelings', title: 'Feelings',      emoji: '🙂', description: 'Happy, sad, excited or scared?',
        image: IMG('1517841905240-472988babdf9'),
        words: [
          { id: 'happy', en: 'Happy', emoji: '😊' },
          { id: 'sad', en: 'Sad', emoji: '😢' },
          { id: 'angry', en: 'Angry', emoji: '😠' },
          { id: 'scared', en: 'Scared', emoji: '😨' },
          { id: 'excited', en: 'Excited', emoji: '🤩' },
          { id: 'tired', en: 'Tired', emoji: '😴' },
        ] },
      { id: 'school',  title: 'School',         emoji: '🏫', description: 'Classroom objects and school days.',
        image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'book', en: 'Book', emoji: '📚', image: IMG('1544947950-fa07a98d237f') },
          { id: 'pencil', en: 'Pencil', emoji: '✏️', image: IMG('1455390582262-044cdead277a') },
          { id: 'backpack', en: 'Backpack', emoji: '🎒', image: IMG('1553062407-98eeb64c6a62') },
          { id: 'teacher', en: 'Teacher', emoji: '🧑‍🏫', image: IMG('1580582932707-520aed937b7b') },
          { id: 'desk', en: 'Desk', emoji: '🪑' },
          { id: 'ruler', en: 'Ruler', emoji: '📏' },
        ] },
      { id: 'weather', title: 'Weather',        emoji: '⛅', description: 'Sunny, rainy, windy or snowy?',
        image: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'sunny', en: 'Sunny', emoji: '☀️', image: IMG('1512453979798-5ea266f8880c') },
          { id: 'rainy', en: 'Rainy', emoji: '🌧️', image: IMG('1428592953211-077101b2021b') },
          { id: 'windy', en: 'Windy', emoji: '💨', image: IMG('1500534623283-312aade485b7') },
          { id: 'snowy', en: 'Snowy', emoji: '❄️', image: IMG('1517842645767-c639042777db') },
          { id: 'cloudy', en: 'Cloudy', emoji: '☁️' },
          { id: 'stormy', en: 'Stormy', emoji: '⛈️' },
        ] },
      { id: 'clothes', title: 'Clothes',        emoji: '👕', description: 'Dress up for every occasion.',
        image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'shirt', en: 'Shirt', emoji: '👕', image: IMG('1523381210434-271e8be1f52b') },
          { id: 'pants', en: 'Pants', emoji: '👖' },
          { id: 'shoes', en: 'Shoes', emoji: '👟', image: IMG('1560769629-975ec94e6a86') },
          { id: 'hat', en: 'Hat', emoji: '🧢', image: IMG('1521369909029-2afed882baee') },
          { id: 'jacket', en: 'Jacket', emoji: '🧥', image: IMG('1551028719-00167b16eac5') },
          { id: 'socks', en: 'Socks', emoji: '🧦', image: IMG('1586350977771-b3b0abd50c82') },
        ] },
      { id: 'hobbies', title: 'Hobbies',        emoji: '⚽', description: 'Sports, drawing, music and play.',
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'soccer', en: 'Soccer', emoji: '⚽', image: IMG('1614632537190-23e4146777db') },
          { id: 'drawing', en: 'Drawing', emoji: '🎨' },
          { id: 'dancing', en: 'Dancing', emoji: '💃', image: IMG('1508700115892-45ecd05ae2ad') },
          { id: 'swimming', en: 'Swimming', emoji: '🏊' },
          { id: 'reading', en: 'Reading', emoji: '📖' },
          { id: 'music', en: 'Music', emoji: '🎵' },
        ] },
    ],
  },
  {
    id: 'a2',
    code: 'A2',
    name: 'Pre-Intermediate',
    tagline: 'Talking about the wider world',
    tier: 'teens',
    color: '#8e6d86',
    icon: '⚡',
    topics: [
      { id: 'travel',   title: 'Travel',       emoji: '✈️', description: 'Airports, maps and new places.',
        image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'airplane', en: 'Airplane', emoji: '✈️', image: IMG('1436491865332-7a61a109cc05') },
          { id: 'suitcase', en: 'Suitcase', emoji: '🧳', image: IMG('1553531384-cc64ac80f931') },
          { id: 'passport', en: 'Passport', emoji: '🛂' },
          { id: 'map', en: 'Map', emoji: '🗺️' },
          { id: 'hotel', en: 'Hotel', emoji: '🏨' },
          { id: 'train', en: 'Train', emoji: '🚆', image: IMG('1474487548417-781cb71495f3') },
        ] },
      { id: 'tech',     title: 'Technology',   emoji: '💻', description: 'Gadgets, apps and the internet.',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'computer', en: 'Computer', emoji: '💻', image: IMG('1496181133206-80ce9b88a853') },
          { id: 'smartphone', en: 'Smartphone', emoji: '📱', image: IMG('1511707171634-5f897ff02aa9') },
          { id: 'headphones', en: 'Headphones', emoji: '🎧', image: IMG('1505740420928-5e560c06d30e') },
          { id: 'camera', en: 'Camera', emoji: '📷', image: IMG('1516035069371-29a1b244cc32') },
          { id: 'robot', en: 'Robot', emoji: '🤖', image: IMG('1485827404703-89b55fcc595e') },
          { id: 'tablet', en: 'Tablet', emoji: '📱' },
        ] },
      { id: 'sports',   title: 'Sports',       emoji: '🏀', description: 'Teams, rules and friendly matches.',
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'basketball', en: 'Basketball', emoji: '🏀', image: IMG('1608245449230-4ac19066d2d0') },
          { id: 'soccer', en: 'Soccer', emoji: '⚽', image: IMG('1614632537190-23e4146777db') },
          { id: 'tennis', en: 'Tennis', emoji: '🎾', image: IMG('1554068865-24cecd4e34b8') },
          { id: 'swimming', en: 'Swimming', emoji: '🏊' },
          { id: 'running', en: 'Running', emoji: '🏃' },
          { id: 'volleyball', en: 'Volleyball', emoji: '🏐' },
        ] },
      { id: 'environment', title: 'Environment', emoji: '🌍', description: 'Nature, recycling and caring for Earth.',
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'tree', en: 'Tree', emoji: '🌳', image: IMG('1441974231531-c6227db76b6e') },
          { id: 'ocean', en: 'Ocean', emoji: '🌊', image: IMG('1439066615861-d1af74d74000') },
          { id: 'forest', en: 'Forest', emoji: '🌲', image: IMG('1441260038675-7329ab4cc264') },
          { id: 'earth', en: 'Earth', emoji: '🌍', image: IMG('1614730321146-b6fa6a46bcb4') },
          { id: 'recycle', en: 'Recycle', emoji: '♻️' },
          { id: 'solar', en: 'Solar Panel', emoji: '🔆' },
        ] },
      { id: 'health',   title: 'Health',       emoji: '🩺', description: 'Feelings, the doctor and staying well.',
        image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'doctor', en: 'Doctor', emoji: '🩺', image: IMG('1584982751601-97dcc096659c') },
          { id: 'hospital', en: 'Hospital', emoji: '🏥', image: IMG('1519494026892-80bbd2d6fd0d') },
          { id: 'medicine', en: 'Medicine', emoji: '💊' },
          { id: 'exercise', en: 'Exercise', emoji: '🏋️' },
          { id: 'vitamins', en: 'Vitamins', emoji: '🍊' },
          { id: 'sleep', en: 'Sleep', emoji: '😴' },
        ] },
      { id: 'shopping', title: 'Shopping',     emoji: '🛍️', description: 'Prices, stores and asking for things.',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'money', en: 'Money', emoji: '💵', image: IMG('1580048915913-4f8f5cb481c4') },
          { id: 'cart', en: 'Shopping Cart', emoji: '🛒', image: IMG('1601598851547-4302969d0614') },
          { id: 'store', en: 'Store', emoji: '🏬' },
          { id: 'pricetag', en: 'Price Tag', emoji: '🏷️' },
          { id: 'bag', en: 'Bag', emoji: '🛍️' },
          { id: 'card', en: 'Card', emoji: '💳' },
        ] },
      { id: 'verbtobe', title: 'Grammar: Verb To Be', emoji: '🔤', description: 'Am, is, are — the most useful verb in English.',
        words: [
          { id: 'am', en: 'Am', emoji: '🙋' },
          { id: 'is', en: 'Is', emoji: '👤' },
          { id: 'are', en: 'Are', emoji: '👥' },
          { id: 'was', en: 'Was', emoji: '🕰️' },
          { id: 'were', en: 'Were', emoji: '🕰️' },
          { id: 'been', en: 'Been', emoji: '✅' },
        ] },
      { id: 'presentcontinuous', title: 'Grammar: Present Simple vs. Continuous', emoji: '⏳', description: 'What you always do vs. what you are doing right now.',
        words: [
          { id: 'plays', en: 'Plays', emoji: '⚽' },
          { id: 'is-playing', en: 'Is Playing', emoji: '🏃' },
          { id: 'eats', en: 'Eats', emoji: '🍽️' },
          { id: 'is-eating', en: 'Is Eating', emoji: '😋' },
          { id: 'studies', en: 'Studies', emoji: '📖' },
          { id: 'is-studying', en: 'Is Studying', emoji: '✍️' },
        ] },
    ],
  },
  {
    id: 'b1b2',
    code: 'B1-B2',
    name: 'Intermediate',
    tagline: 'Expressing opinions with confidence',
    tier: 'teens',
    color: '#c9435c',
    icon: '🏆',
    topics: [
      { id: 'careers',  title: 'Careers',       emoji: '💼', description: 'Jobs, dreams and future plans.',
        image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'teacher', en: 'Teacher', emoji: '🧑‍🏫', image: IMG('1580582932707-520aed937b7b') },
          { id: 'doctor', en: 'Doctor', emoji: '🩺', image: IMG('1584982751601-97dcc096659c') },
          { id: 'chef', en: 'Chef', emoji: '👨‍🍳', image: IMG('1577219491135-ce391730fb2c') },
          { id: 'artist', en: 'Artist', emoji: '🎨', image: IMG('1460661419201-fd4cecdf8a8b') },
          { id: 'engineer', en: 'Engineer', emoji: '👷' },
          { id: 'scientist', en: 'Scientist', emoji: '🔬' },
        ] },
      { id: 'culture',  title: 'Culture & Traditions', emoji: '🎎', description: 'Festivals and customs worldwide.',
        image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'festival', en: 'Festival', emoji: '🎎', image: IMG('1533929736458-ca588d08c8be') },
          { id: 'dance', en: 'Dance', emoji: '💃', image: IMG('1508700115892-45ecd05ae2ad') },
          { id: 'costume', en: 'Costume', emoji: '🎭' },
          { id: 'parade', en: 'Parade', emoji: '🎉' },
          { id: 'tradmusic', en: 'Music', emoji: '🎶' },
          { id: 'tradfood', en: 'Traditional Food', emoji: '🍜' },
        ] },
      { id: 'media',    title: 'Media & News',  emoji: '📰', description: 'Headlines, opinions and debate.',
        image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'newspaper', en: 'Newspaper', emoji: '📰', image: IMG('1495020689067-958852a7765e') },
          { id: 'television', en: 'Television', emoji: '📺', image: IMG('1593359677879-a4bb92f829d1') },
          { id: 'microphone', en: 'Microphone', emoji: '🎙️' },
          { id: 'camera', en: 'Camera', emoji: '📷', image: IMG('1516035069371-29a1b244cc32') },
          { id: 'internet', en: 'Internet', emoji: '🌐' },
          { id: 'headline', en: 'Headline', emoji: '📢' },
        ] },
      { id: 'ecoissues', title: 'Environmental Issues', emoji: '♻️', description: 'Climate change and solutions.',
        image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'pollution', en: 'Pollution', emoji: '🏭' },
          { id: 'climate', en: 'Climate Change', emoji: '🌡️' },
          { id: 'recycle', en: 'Recycle', emoji: '♻️' },
          { id: 'deforestation', en: 'Deforestation', emoji: '🪓' },
          { id: 'renewable', en: 'Renewable Energy', emoji: '🔋' },
          { id: 'plastic', en: 'Plastic Waste', emoji: '🥤' },
        ] },
      { id: 'debate',   title: 'Debate & Opinions', emoji: '🗣️', description: 'Agree, disagree and persuade.',
        image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'agree', en: 'Agree', emoji: '👍' },
          { id: 'disagree', en: 'Disagree', emoji: '👎' },
          { id: 'argument', en: 'Argument', emoji: '💬' },
          { id: 'opinion', en: 'Opinion', emoji: '🗯️' },
          { id: 'discussion', en: 'Discussion', emoji: '🤝' },
          { id: 'vote', en: 'Vote', emoji: '🗳️' },
        ] },
      { id: 'science',  title: 'Science & Innovation', emoji: '🔬', description: 'Discoveries that shape tomorrow.',
        image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=500&q=60&auto=format&fit=crop',
        words: [
          { id: 'microscope', en: 'Microscope', emoji: '🔬', image: IMG('1532187863486-abf9dbad1b69') },
          { id: 'rocket', en: 'Rocket', emoji: '🚀', image: IMG('1541185933-ef5d8ed016c2') },
          { id: 'robot', en: 'Robot', emoji: '🤖', image: IMG('1485827404703-89b55fcc595e') },
          { id: 'dna', en: 'DNA', emoji: '🧬' },
          { id: 'invention', en: 'Invention', emoji: '💡' },
          { id: 'laboratory', en: 'Laboratory', emoji: '⚗️' },
        ] },
      { id: 'simplepast', title: 'Grammar: Simple Past', emoji: '📜', description: 'Regular (-ed) and irregular verbs for talking about yesterday.',
        words: [
          { id: 'walked', en: 'Walked', emoji: '🚶' },
          { id: 'played', en: 'Played', emoji: '⚽' },
          { id: 'watched', en: 'Watched', emoji: '📺' },
          { id: 'went', en: 'Went', emoji: '🚗' },
          { id: 'ate', en: 'Ate', emoji: '🍽️' },
          { id: 'saw', en: 'Saw', emoji: '👀' },
        ] },
      { id: 'future', title: 'Grammar: Future Tense', emoji: '🔮', description: '"Will" and "going to" for plans and predictions.',
        words: [
          { id: 'will', en: 'Will', emoji: '🔮' },
          { id: 'goingto', en: 'Going To', emoji: '➡️' },
          { id: 'tomorrow', en: 'Tomorrow', emoji: '📅' },
          { id: 'nextweek', en: 'Next Week', emoji: '🗓️' },
          { id: 'soon', en: 'Soon', emoji: '⏳' },
          { id: 'plan', en: 'Plan', emoji: '📝' },
        ] },
      { id: 'comparatives', title: 'Grammar: Comparatives', emoji: '⚖️', description: 'Bigger, faster, better — comparing two things.',
        words: [
          { id: 'bigger', en: 'Bigger', emoji: '🐘' },
          { id: 'smaller', en: 'Smaller', emoji: '🐭' },
          { id: 'faster', en: 'Faster', emoji: '🐆' },
          { id: 'slower', en: 'Slower', emoji: '🐢' },
          { id: 'better', en: 'Better', emoji: '👍' },
          { id: 'worse', en: 'Worse', emoji: '👎' },
        ] },
    ],
  },
];
