/* ==========================================================================
   IGenglishschool — MODELOS DE SLIDES (decks prontos que a teacher importa
   com "📥 Modelo" na tela de Slides da aula). Cada modelo vira uma
   apresentação normal do aluno, totalmente editável.
   Os slides da letra têm uma caixa para a teacher COLAR a letra.
   ========================================================================== */
(() => {
  'use strict';
  let n = 0;
  const id = () => 'm' + (++n).toString(36) + Math.random().toString(36).slice(2, 6);
  const T = (x, y, w, text, fs, c, o) => {
    const lines = String(text).split('\n').length + Math.floor(String(text).length * fs * 0.5 / w);
    return { id: id(), type: 'text', x, y, w, h: Math.round(fs * 1.4 * lines) + 10, r: 0, text, ff: 'lexend', fs, c: c || '#2e2b2e', b: false, i: false, u: false, al: 'left', lh: 1.35, ...o };
  };
  const R = (x, y, w, h, fill, o) => ({ id: id(), type: 'shape', x, y, w, h, r: 0, shape: 'rrect', fill, stroke: '#8e6d86', sw: 0, ...o });
  const tag = (t, dark) => T(70, 40, 900, t.toUpperCase(), 24, dark ? '#faefc2' : '#8e6d86', { b: true });
  const time = t => [R(1060, 36, 170, 44, '#f05d77'), T(1060, 42, 170, t, 24, '#ffffff', { b: true, al: 'center' })];
  const title = (t, dark) => T(70, 85, 1140, t, 56, dark ? '#ffffff' : '#2e2b2e', { b: true });
  const BG = { cream: { color: '#faefc2' }, rose: { grad: ['#faefc2', '#f7a8c4', 135] }, dark: { grad: ['#2e2b2e', '#8e6d86', 135] } };
  const slide = (bg, objects) => ({ bg: BG[bg], objects });
  const list = (items, y, fs, dark) => T(90, y, 1100, items.join('\n\n'), fs || 38, dark ? '#ffffff' : '#2e2b2e');

  const slides = [];
  slides.push(slide('dark', [tag('English with Aninha', true), T(70, 200, 1140, 'Touch 🎵', 140, '#ffffff', { b: true }),
    T(70, 380, 1140, 'by KATSEYE', 52, '#faefc2'), T(70, 480, 1140, 'Today: sing it, understand it, USE it ✨', 44, '#ffffff')]));
  slides.push(slide('cream', [tag('Our plan · 30 min'), title("Today's plan"),
    list(['1️⃣  Warm-up + listen  (5 min)', '2️⃣  Sing the song with the words  (5 min)', '3️⃣  6 cool expressions  (10 min)', '4️⃣  Fill in the blanks  (7 min)', '5️⃣  Your turn to talk + finish  (3 min)'], 190, 40)]));
  slides.push(slide('rose', [tag('Warm-up'), ...time('0–5 min'), title("You already know this song! 🎤"),
    list(['🎧  Listen to the song once.', '🗣️  Which part is your favorite?', '❓  What is the song about? Tell me in 1 sentence.'], 230, 42)]));

  const lyric = (part, name, gist) => slide('cream', [tag('Sing along · Part ' + part), ...time('5–10 min'), title(name),
    R(70, 190, 1140, 380, '#ffffff', { stroke: '#8e6d86', sw: 4, op: 0.7 }),
    T(110, 340, 1060, '📝 Cole aqui a letra desta parte\n(apague este texto)', 36, '#8e6d86', { al: 'center' }),
    T(70, 610, 1140, gist, 30, '#2e2b2e', { i: true })]);
  slides.push(lyric(1, 'Chorus / Intro', 'Idea: she thought about someone too much because he never got in contact.'));
  slides.push(lyric(2, 'Verse 1 (the days of the week)', 'Idea: each day she waits for him, and little by little she stops being interested.'));
  slides.push(lyric(3, 'Verse 2 + Bridge', 'Idea: saying sorry and promising is not enough. She knows her worth and her time.'));

  const exp = (k, phrase, meaning, ex, pt) => slides.push(slide('rose', [tag('Expression ' + k + ' of 6'), ...time('10–20 min'), title(phrase),
    R(70, 200, 1140, 130, '#ffffff'), T(100, 215, 1080, '💡 Meaning: ' + meaning, 32),
    R(70, 355, 1140, 200, '#ffffff'), T(100, 370, 1080, '💬 In real life:\n' + ex.join('\n'), 32),
    T(70, 600, 1140, pt, 30, '#8e6d86', { b: true })]));
  exp(1, 'be out of touch (with someone)', 'you have not talked to a person for a long time.', ['“I’m out of touch with my old school friends.”', '“Let’s keep in touch!”  (= let’s keep talking)'], '🇧🇷 perder o contato');
  exp(2, 'overthink (something)', 'think about something too much, until you feel worried.', ['“Don’t overthink it, it’s just a text!”', '“I always overthink before a test.”'], '🇧🇷 pensar demais / ficar remoendo');
  exp(3, 'lose interest (in something)', 'stop liking something or stop caring about it.', ['“I lost interest in that game.”', '“The movie was slow, so I lost interest.”'], '🇧🇷 perder o interesse');
  exp(4, 'move on', 'stop thinking about something sad or old and go forward.', ['“It’s time to move on.”', '“I failed the test, but I’m moving on.”'], '🇧🇷 seguir em frente');
  exp(5, 'waste your time', 'use your time for something that is not worth it.', ['“Don’t waste your time on bad games.”', '“Waiting for him is a waste of time.”'], '🇧🇷 perder tempo');
  exp(6, 'mess (something) up', 'make a mistake and ruin something.', ['“Oops, I messed up my drawing!”', '“Don’t mess it up this time!”'], '🇧🇷 estragar / fazer besteira  ·  “ignore a call” = não atender de propósito');

  const chip = (x, y, w, t) => [R(x, y, w, 64, '#8e6d86', { shape: 'rrect' }), T(x, y + 12, w, t, 30, '#ffffff', { b: true, al: 'center' })];
  slides.push(slide('cream', [tag('Exercise 1'), ...time('20–27 min'), title('Word bank 🧩'),
    ...chip(70, 220, 200, 'touch'), ...chip(290, 220, 280, 'overthinking'), ...chip(590, 220, 300, 'lose interest'), ...chip(910, 220, 220, 'move on'),
    ...chip(70, 320, 200, 'waste'), ...chip(290, 320, 240, 'messed up'), ...chip(550, 320, 200, 'ignore'), ...chip(770, 320, 280, 'come up with'),
    T(70, 450, 1140, 'Choose the right word for each sentence on the next slides. ➡️\nUse each word only once. Take your time. 😊', 36)]));

  const ex = (head, items) => slides.push(slide('cream', [tag('Exercise 1 · Fill in the blanks'), ...time('20–27 min'), title(head), list(items, 200, 34)]));
  ex('Sentences 1–4', ['1.  I haven’t talked to Sam in months. We’re really out of ________.', '2.  Stop ________ it! It was just one small message.', '3.  The movie was so slow that I started to ________.', '4.  It’s over. It’s time to ________.']);
  ex('Sentences 5–8', ['5.  Don’t ________ your time on people who never answer you.', '6.  I was so nervous that I ________ the test.', '7.  He decided to ________ the call because he was busy.', '8.  We need to ________ a better plan.']);
  slides.push(slide('cream', [tag('Exercise 2 · Choose the best answer'), ...time('20–27 min'), title('Which one is right? ✅'),
    list(['1.  If you are out of touch with a friend, you…\n     A) talk every day      B) haven’t talked for a long time', '2.  If you overthink, you think…\n     A) too much      B) too little', '3.  “It’s time to move on” means…\n     A) stay where you are      B) go forward', '4.  “Don’t waste your time” means…\n     A) use it for something worth it      B) use it for nothing'], 190, 30)]));
  slides.push(slide('cream', [tag('Exercise 3 · Listen again 🎧'), ...time('20–27 min'), title('Word hunt'),
    T(70, 190, 1140, 'Listen to the song again. ✔️ Tick when you hear each word:', 34),
    T(90, 280, 380, '☐ touch\n☐ overthinking\n☐ dreaming\n☐ phone', 40), T(470, 280, 380, '☐ interest\n☐ moving\n☐ window\n☐ advice', 40), T(850, 280, 380, '☐ sorry\n☐ promise\n☐ ignore\n☐ Moon', 40)]));
  slides.push(slide('cream', [tag('Answers (teacher)'), title('✅ Answers'),
    T(70, 190, 1140, 'Ex. 1:  1 touch · 2 overthinking · 3 lose interest · 4 move on\n           5 waste · 6 messed up · 7 ignore · 8 come up with\n\nEx. 2:  1 B · 2 A · 3 B · 4 A', 36)]));
  slides.push(slide('rose', [tag('Your turn! 🗣️'), ...time('27–30 min'), title("Let's talk"),
    list(['💬  Who are you out of touch with? Who do you want to keep in touch with?', '💬  What do you overthink about?', '💬  Tell me something you lost interest in.'], 230, 38)]));
  slides.push(slide('dark', [tag('Wrap-up', true), title('Great job, Aninha! 🌟', true),
    list(['✅  I sang “Touch”.', '✅  I learned 6 expressions.', '✅  I can use them in real life.'], 230, 44, true),
    T(70, 560, 1140, 'Homework (optional): write 3 sentences with your favorite expressions. 💜', 32, '#faefc2')]));

  // ---- Weather Forecast — Guaratuba: speaking practice for STUDENT 1 ----
  const wf = [];
  wf.push(slide('dark', [tag('Speaking practice', true), T(70, 190, 1140, 'Weather Forecast 🌦️', 100, '#ffffff', { b: true }),
    T(70, 340, 1140, 'Guaratuba — Paraná', 56, '#faefc2'), T(70, 450, 1140, 'You are STUDENT 1 ⭐\nRead, listen to the cue, and speak!', 40, '#ffffff')]));
  wf.push(slide('cream', [tag('How to practice'), title('3 steps for each slide'),
    list(['1️⃣  Read your lines out loud, slowly.', '2️⃣  Look at the cue 👂 — that is what Student 2 says before you.', '3️⃣  Cover the English and say it again using only the Portuguese.'], 220, 38)]));
  wf.push(slide('rose', [tag('Hard words first'), title('Say these words 🗣️'),
    T(90, 210, 540, 'forecast\nhumid\nthroughout\nCelsius\nAtlantic', 44), T(650, 210, 540, 'umbrella\nraincoat\nsunscreen\nscenery\nwildlife', 44),
    T(70, 620, 1140, 'Repeat each word 3 times. 🔁', 30, '#8e6d86', { b: true })]));

  const turn = (n, name, cue, pairs, extra) => {
    const objs = [tag(`Part ${n} · ${name}`), R(990, 36, 240, 44, '#f05d77'), T(990, 42, 240, 'STUDENT 1 ⭐', 24, '#ffffff', { b: true, al: 'center' })];
    let y = 100;
    if (cue) {
      objs.push(R(70, y, 1140, 130, '#ffffff', { op: 0.75 }), T(95, y + 10, 1090, '👂 Student 2 says before you:\n' + cue, 22, '#6b6b6b', { i: true }));
      y += 150;
    }
    pairs.forEach(([en, pt]) => {
      const fs = pairs.length > 1 ? 36 : 40;
      const lines = Math.ceil(en.length * fs * 0.52 / 1080);
      objs.push(T(80, y, 1100, en, fs, '#2e2b2e', { b: true }));
      y += Math.round(lines * fs * 1.4) + 8;
      objs.push(T(80, y, 1100, '🇧🇷 ' + pt, 24, '#8e6d86'));
      y += Math.round(Math.ceil((pt.length + 3) * 24 * 0.52 / 1080) * 24 * 1.4) + 26;
    });
    if (extra) objs.push(T(80, y, 1100, extra, 40, '#f05d77', { b: true }));
    wf.push(slide(n % 2 ? 'cream' : 'rose', objs));
  };
  turn(1, 'Greeting', null, [['Good morning, everyone! Welcome to our weather forecast!', 'Bom dia a todos! Bem-vindos à nossa previsão do tempo!'], ['My name is [your name].', 'Meu nome é [seu nome].']]);
  turn(2, 'Weather report', 'And my name is [name]. Today, we are going to talk about the weather and tourism in Guaratuba, Paraná.',
    [['Guaratuba is a coastal city in the south of Brazil. The weather is usually warm and humid, and it can rain throughout the year.', 'Guaratuba é uma cidade litorânea no sul do Brasil. O tempo geralmente é quente e úmido, e pode chover durante todo o ano.']]);
  turn(2, 'Weather report', 'Today, the weather in Guaratuba is [sunny, cloudy, or rainy]. The temperature is [temperature] degrees Celsius, and the maximum temperature is [temperature] degrees.',
    [["Don't forget to check the weather before going to the beach!", 'Não se esqueça de conferir a previsão do tempo antes de ir à praia!']]);
  turn(3, 'Geography', 'Guaratuba is located in the state of Paraná, in the South region of Brazil. It is next to the Atlantic Ocean.',
    [['The city has beautiful beaches, a bay, rivers, and areas of Atlantic Forest. Its climate is humid, with warm summers and mild winters.', 'A cidade tem belas praias, uma baía, rios e áreas de Mata Atlântica. Seu clima é úmido, com verões quentes e invernos amenos.']]);
  turn(4, 'Tourism', 'One of the main attractions is Central Beach, also known as Praia Central. Tourists can walk along the beach, relax, and enjoy the sea.',
    [['Another beautiful place is Guaratuba Bay. Visitors can enjoy the natural scenery and learn more about the local wildlife.', 'Outro lugar bonito é a Baía de Guaratuba. Os visitantes podem apreciar a paisagem natural e conhecer melhor a fauna local.']]);
  turn(5, 'Clothes and activities', 'On sunny days, you should wear light clothes, sunglasses, and sunscreen.',
    [['On rainy days, you should take an umbrella or a raincoat. Comfortable shoes are also a good idea for walking around the city.', 'Em dias chuvosos, você deve levar um guarda-chuva ou uma capa de chuva. Calçados confortáveis também são uma boa ideia para passear pela cidade.']]);
  turn(6, 'Goodbye', "That's all for today's weather forecast! We hope you enjoyed learning about Guaratuba.",
    [['Thank you for watching! Have a great day, and enjoy Guaratuba!', 'Obrigada por assistir! Tenham um ótimo dia e aproveitem Guaratuba!']], 'BOTH: Goodbye! 👋');
  wf.push(slide('dark', [tag('Finish', true), title('You did it! 🌟', true),
    list(['✅  I know my lines.', '✅  I know when to start (the cues).', '✅  Next: say it all again without looking!'], 230, 44, true)]));

  // ---- Would & Shall (beginner) ----
  const mv = [];
  const card = (y, h, text, fs) => [R(70, y, 1140, h, '#ffffff'), T(100, y + 14, 1080, text, fs || 32)];
  mv.push(slide('dark', [tag('Grammar practice', true), T(70, 190, 1140, 'WOULD & SHALL 💬', 110, '#ffffff', { b: true }),
    T(70, 350, 1140, 'Polite words to ask, offer and suggest', 44, '#faefc2'), T(70, 460, 1140, 'Learn it, practice it, use it! ✨', 44, '#ffffff')]));
  mv.push(slide('cream', [tag('The basics'), title('Would and shall are helper verbs'),
    ...card(200, 120, '💡 They go before another verb. The verb stays simple.'),
    ...card(345, 260, '✅  I would like a pizza.\n✅  She would help you.\n✅  Shall I open the door?\n✅  Shall we go?\n❌  No “-s”:  She would helps  ✗', 32)]));
  const two = (k, name, uses, pt) => mv.push(slide(k % 2 ? 'rose' : 'cream', [tag(name), title(name),
    ...uses.flatMap(([label, ex], i) => [R(70, 190 + i * 160, 1140, 140, '#ffffff'), T(100, 202 + i * 160, 1080, '💡 ' + label + '\n💬 ' + ex, 30)]),
    T(70, 640, 1140, pt, 28, '#8e6d86', { b: true })]));
  two(1, 'WOULD 1 · “I would like…”', [['a polite way to say what you want', '“I would like a glass of water, please.”\n“I’d like a pizza.”  (I’d = I would)'], ['asking what someone wants', '“Would you like some tea?”   “Yes, please.” / “No, thank you.”']], '🇧🇷 eu gostaria de… · você gostaria de…?');
  two(2, 'WOULD 2 · polite requests', [['asking for help in a nice way', '“Would you help me, please?”\n“Would you open the door, please?”'], ['answers', '“Sure!”   “Of course.”   “Sorry, I can’t.”']], '🇧🇷 você poderia…? (pedido educado)');
  two(3, 'WOULD 3 · imagine', [['when we imagine something (with “if”)', '“If I had a dog, I would play with it.”'], ['more examples', '“If I were rich, I would travel.”\n“If it were sunny, we would go to the beach.”']], '🇧🇷 eu faria… / eu iria… (situação imaginária)');
  mv.push(slide('cream', [tag('Would · summary'), title('Would — how to use it 📋'),
    T(80, 190, 1120, '➕  I / you / he / she / we / they  would  + verb\n        She would like a cake.\n➖  would not = wouldn’t\n        I wouldn’t go.\n❓  Would + person + verb?\n        Would you like some juice?\n💬  Short answer:  Yes, I would.  /  No, I wouldn’t.', 32)]));
  two(4, 'SHALL 1 · “Shall I…?”', [['offering to help someone', '“Shall I open the window?”\n“Shall I carry your bag?”'], ['answers', '“Yes, please. Thank you!”   “No, thanks. I’m OK.”']], '🇧🇷 quer que eu…? / devo…? (oferecer ajuda)');
  two(5, 'SHALL 2 · “Shall we…?”', [['suggesting something to do together', '“Shall we go to the park?”\n“Shall we eat pizza?”'], ['answers', '“Yes, let’s!”   “Good idea!”   “No, let’s not.”']], '🇧🇷 vamos…? / que tal…? (sugestão)');
  mv.push(slide('cream', [tag('Shall · remember'), title('Shall — 3 important things ⭐'),
    ...card(200, 90, '1️⃣  We use shall with I and we:  Shall I…?  Shall we…?', 32),
    ...card(310, 90, '2️⃣  It is mostly for questions (offers and suggestions).', 32),
    ...card(420, 130, '3️⃣  It sounds polite and a little formal. In everyday American English, people also say “Do you want me to…?” and “Let’s…”.', 30)]));
  mv.push(slide('rose', [tag('Compare'), title('Would  vs  Shall'),
    T(80, 190, 1120, 'WOULD  →  “I would like…” (what I want)\n             “Would you…?” (polite question / request)\n             “If I had…, I would…” (imagine)\n\nSHALL  →  “Shall I…?” (I offer help)\n             “Shall we…?” (I suggest something)', 34)]));

  mv.push(slide('cream', [tag('Exercise 1 · Fill in the blanks'), title('would  or  shall? 🧩'),
    ...['would', 'shall'].map((w, i) => [R(70 + i * 240, 195, 210, 64, '#8e6d86'), T(70 + i * 240, 207, 210, w, 32, '#ffffff', { b: true, al: 'center' })]).flat(),
    T(90, 290, 1100, ['1.  I ________ like a pizza, please.', '2.  ________ I open the window?', '3.  ________ we go to the park?', '4.  ________ you like some water?', '5.  If I had a cat, I ________ play with it.', '6.  It’s hot. ________ I turn on the fan?'].join('\n'), 32)]));
  mv.push(slide('cream', [tag('Exercise 2 · Choose'), title('Circle the right one ⭕'),
    list(['1.  (Would / Shall) we play a game?', '2.  I (would / shall) like an ice cream.', '3.  (Shall / Would) you like tea or coffee?', '4.  (Would / Shall) I help you with your bag?', '5.  If I had a car, I (would / shall) drive to the beach.'], 200, 34)]));
  mv.push(slide('cream', [tag('Exercise 3 · Order the words'), title('Make the sentence ✏️'),
    list(['1.  like / I / a / would / sandwich', '2.  we / Shall / eat / now / ?', '3.  you / Would / some / like / milk / ?', '4.  I / Shall / the / open / door / ?'], 210, 36)]));
  mv.push(slide('cream', [tag('Exercise 4 · Match'), title('Question  →  Answer 🔗'),
    T(80, 190, 600, '1.  Shall I carry your bag?\n2.  Shall we dance?\n3.  Would you like some cake?\n4.  Would you open the door, please?', 30),
    T(700, 190, 500, 'a)  Yes, please. Thank you!\nb)  Yes, let’s!\nc)  Yes, I would.\nd)  Sure!', 30)]));
  mv.push(slide('rose', [tag('Reading 1 📖'), title('Sara’s birthday'),
    T(80, 190, 1120, 'Today is Sara’s birthday. She would like a chocolate cake. Her friend Ben says, “Shall I buy the cake?” Sara says, “Yes, please!” Then Ben asks, “Shall we invite Lia?” “Yes, let’s!” says Sara. “If I had a big house, I would have a big party.”', 32),
    T(80, 470, 1120, 'Answer:\n1. What would Sara like?\n2. What does Ben ask first?\n3. Who shall they invite?', 28, '#8e6d86', { b: true })]));
  mv.push(slide('cream', [tag('Reading 2 📖'), title('At the store 🎒'),
    T(80, 190, 1120, 'Clerk:  Hello! Would you like some help?\nAna:  Yes, please. I would like a blue backpack.\nClerk:  Shall I show you this one?\nAna:  Yes, please. It’s nice!\nClerk:  Would you like a bag for it?\nAna:  No, thank you.', 30),
    T(80, 560, 1120, '🗣️ Read it with your teacher. Then change the things you buy!', 28, '#8e6d86', { b: true })]));
  mv.push(slide('rose', [tag('Speaking 🗣️'), title('Your turn!'),
    list(['☕  Offer help:  “Shall I …?”', '🌳  Suggest a plan to a friend:  “Shall we …?”', '🍕  Order food:  “I would like …”', '🎁  Imagine:  “If I had a million dollars, I would …”'], 200, 34)]));
  mv.push(slide('cream', [tag('Answers (teacher)'), title('✅ Answers'),
    T(70, 190, 1140, 'Ex. 1:  1 would · 2 Shall · 3 Shall · 4 Would · 5 would · 6 Shall\nEx. 2:  1 Shall · 2 would · 3 Would · 4 Shall · 5 would\nEx. 3:  1 I would like a sandwich. · 2 Shall we eat now? · 3 Would you like some milk? · 4 Shall I open the door?\nEx. 4:  1a · 2b · 3c · 4d\nReading 1:  1 a chocolate cake · 2 “Shall I buy the cake?” · 3 Lia', 30)]));
  mv.push(slide('dark', [tag('Wrap-up', true), title('Great job, Heloize! 🌟', true),
    list(['✅  I can say “I would like…”.', '✅  I can ask “Would you…?” politely.', '✅  I can offer help: “Shall I…?”', '✅  I can suggest: “Shall we…?”'], 210, 40, true),
    T(70, 600, 1140, 'Homework (optional): write 3 sentences with would and 3 questions with shall. 💜', 30, '#faefc2')]));

  // ---- A or AN? School objects game (Teles: slow pace, one idea per slide, games) ----
  const ag = [];
  const fx = '#2e2b2e';
  const big = (x, y, w, emoji, label, color) => [R(x, y, w, 360, '#ffffff', { stroke: color || '#8e6d86', sw: 6 }),
    T(x, y + 30, w, emoji, 130, fx, { al: 'center' }), T(x, y + 220, w, label, 52, color || '#8e6d86', { b: true, al: 'center' })];
  const lvl = (t, c) => [R(980, 36, 250, 48, c || '#f05d77'), T(980, 43, 250, t, 24, '#ffffff', { b: true, al: 'center' })];
  ag.push(slide('dark', [tag('The School Objects Game', true), T(70, 150, 1140, 'A  or  AN ?', 150, '#ffffff', { b: true }),
    T(70, 380, 1140, '🎒 ✏️ 📏 🍎 ☂️', 90, '#ffffff'), T(70, 520, 1140, 'Hi, Teles! Ready to play? 🎮', 48, '#faefc2')]));
  ag.push(slide('cream', [tag('Our game map'), title('Today we play 5 steps 🗺️'),
    T(90, 200, 1100, '⭐ Step 1:  Meet  A  and  AN\n⭐ Step 2:  Level 1 — A words\n⭐ Step 3:  Level 2 — AN words\n⭐ Step 4:  Games! 🎮\n⭐ Step 5:  Treasure hunt + prize 🏆', 42),
    T(70, 640, 1140, 'We go slowly. One step at a time. 💜', 30, '#8e6d86', { b: true })]));
  ag.push(slide('rose', [tag('Step 1 · Meet A and AN'), ...lvl('Step 1'), title('A and AN mean “one”'),
    ...card(200, 130, '🇧🇷  a / an = um / uma', 40), ...card(350, 230, '“a book”  =  one book 📘\n“an apple”  =  one apple 🍎', 44)]));
  ag.push(slide('cream', [tag('Step 1 · The secret rule'), ...lvl('Step 1'), title('The secret rule 🔑'),
    R(70, 200, 540, 380, '#ffd6e0', { stroke: '#f05d77', sw: 6 }), T(70, 225, 540, 'AN 🅰️', 70, '#f05d77', { b: true, al: 'center' }),
    T(70, 340, 540, 'A   E   I   O   U', 62, fx, { b: true, al: 'center' }), T(90, 460, 500, 'Vowels → AN', 36, fx, { al: 'center' }),
    R(670, 200, 540, 380, '#d6e4ff', { stroke: '#3d8bd9', sw: 6 }), T(670, 225, 540, 'A 🅱️', 70, '#3d8bd9', { b: true, al: 'center' }),
    T(670, 340, 540, 'B C D F G…', 62, fx, { b: true, al: 'center' }), T(690, 460, 500, 'All other letters → A', 34, fx, { al: 'center' })]));
  ag.push(slide('cream', [tag('Level 1 · A words'), ...lvl('Level 1', '#3d8bd9'), title('A … (say it with me!) 🗣️'),
    ...big(70, 200, 360, '📘', 'a book', '#3d8bd9'), ...big(460, 200, 360, '🖊️', 'a pen', '#3d8bd9'), ...big(850, 200, 360, '✏️', 'a pencil', '#3d8bd9')]));
  ag.push(slide('cream', [tag('Level 1 · A words'), ...lvl('Level 1', '#3d8bd9'), title('A … (one more time!) 🗣️'),
    ...big(70, 200, 360, '📏', 'a ruler', '#3d8bd9'), ...big(460, 200, 360, '🎒', 'a bag', '#3d8bd9'), ...big(850, 200, 360, '🕐', 'a clock', '#3d8bd9')]));
  ag.push(slide('rose', [tag('Level 2 · AN words'), ...lvl('Level 2', '#f05d77'), title('AN … (say it with me!) 🗣️'),
    ...big(70, 200, 360, '🧽', 'an eraser', '#f05d77'), ...big(460, 200, 360, '🍎', 'an apple', '#f05d77'), ...big(850, 200, 360, '🍊', 'an orange', '#f05d77')]));
  ag.push(slide('rose', [tag('Level 2 · AN words'), ...lvl('Level 2', '#f05d77'), title('AN … (one more time!) 🗣️'),
    ...big(70, 200, 360, '☂️', 'an umbrella', '#f05d77'), ...big(460, 200, 360, '📕🇺🇸', 'an English book', '#f05d77'), ...big(850, 200, 360, '⭐', 'Level 2 done!', '#5cad5a')]));
  ag.push(slide('dark', [tag('Brain break', true), T(70, 200, 1140, 'Breathe 🌈', 110, '#ffffff', { b: true }),
    T(70, 380, 1140, 'In… 1 2 3\nOut… 1 2 3', 56, '#faefc2'), T(70, 590, 1140, 'Take your time. When you are ready, we play! 🎮', 34, '#ffffff')]));
  ag.push(slide('cream', [tag('Game 1 · Mystery doors'), ...lvl('Game 1', '#5cad5a'), title('Choose the right door 🚪'),
    R(70, 190, 200, 70, '#d6e4ff', { stroke: '#3d8bd9', sw: 5 }), T(70, 203, 200, 'A', 40, '#3d8bd9', { b: true, al: 'center' }),
    R(300, 190, 200, 70, '#ffd6e0', { stroke: '#f05d77', sw: 5 }), T(300, 203, 200, 'AN', 40, '#f05d77', { b: true, al: 'center' }),
    T(90, 300, 1100, ['1.  🎒  ____ bag', '2.  🍎  ____ apple', '3.  🪑  ____ chair', '4.  ☂️  ____ umbrella', '5.  🍊  ____ orange', '6.  🖥️  ____ desk'].join('\n'), 42)]));
  ag.push(slide('rose', [tag('Game 2 · Missing word'), ...lvl('Game 2', '#5cad5a'), title('Fill in: a or an? ✏️'),
    T(90, 200, 1100, ['1.  It is ____ ruler.', '2.  It is ____ eraser.', '3.  I have ____ notebook.', '4.  I have ____ English book.', '5.  This is ____ clock.'].join('\n'), 44)]));
  const sortItems = ['📘 book', '🧽 eraser', '🖊️ pen', '🍎 apple', '📏 ruler', '🍊 orange', '☂️ umbrella', '🎒 bag'];
  ag.push(slide('cream', [tag('Game 3 · Sort it!'), ...lvl('Game 3', '#5cad5a'), title('Drag each object to its box 🧺'),
    R(70, 170, 560, 270, '#d6e4ff', { stroke: '#3d8bd9', sw: 6 }), T(70, 180, 560, 'A 🅱️', 50, '#3d8bd9', { b: true, al: 'center' }),
    R(650, 170, 560, 270, '#ffd6e0', { stroke: '#f05d77', sw: 6 }), T(650, 180, 560, 'AN 🅰️', 50, '#f05d77', { b: true, al: 'center' }),
    ...sortItems.map((w, i) => T(70 + (i % 4) * 300, 500 + Math.floor(i / 4) * 100, 280, w, 38, fx, { b: true }))]));
  ag.push(slide('rose', [tag('Final mission'), ...lvl('Treasure hunt', '#f6cf3a'), title('Treasure hunt 🔍'),
    T(90, 200, 1100, 'Find it in the room. Touch it. Say it!\n\n☐  a pen        “It’s a pen.”\n☐  an eraser    “It’s an eraser.”\n☐  a book       “It’s a book.”\n☐  a bag        “It’s a bag.”', 40)]));
  ag.push(slide('cream', [tag('Answers (teacher)'), title('✅ Answers'),
    T(70, 190, 1140, 'Game 1:  1 a · 2 an · 3 a · 4 an · 5 an · 6 a\nGame 2:  1 a · 2 an · 3 a · 4 an · 5 a\nGame 3:  A → book, pen, ruler, bag\n              AN → eraser, apple, orange, umbrella', 36)]));
  ag.push(slide('dark', [tag('You won!', true), T(70, 150, 1140, '🏆', 150, '#ffffff', { al: 'center' }), T(70, 360, 1140, 'Teles is the A / AN Champion!', 64, '#ffffff', { b: true, al: 'center' }),
    T(70, 500, 1140, '⭐ ⭐ ⭐', 90, '#faefc2', { al: 'center' }), T(70, 640, 1140, 'Great job! See you next game! 💜', 34, '#faefc2', { al: 'center' })]));

  window.SLIDES_MODELOS = [
    { id: 'a-an-teles', title: 'A or AN? School Objects Game — Teles', slides: ag },
    { id: 'would-shall-heloize', title: 'Would & Shall (iniciante) — Heloize', slides: mv },
    { id: 'touch-katseye', title: 'Touch (KATSEYE) — 30 min', slides },
    { id: 'weather-guaratuba-s1', title: 'Weather Forecast — Guaratuba (Student 1)', slides: wf },
  ];
})();
