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

  // ---- Weather Report video (Chicago News, YouTube gzPA-YKJmVk) — Ana Clara ----
  const wx = [];
  const wxUrl = 'youtube.com/watch?v=gzPA-YKJmVk';
  const wxCell = (x, y, w, h, t, fill, fs, o) => [R(x, y, w, h, fill, { shape: 'rect', stroke: '#8e6d86', sw: 2 }),
    T(x + 10, y + 10, w - 20, t, fs || 24, '#2e2b2e', { al: 'center', ...o })];
  wx.push(slide('dark', [tag('Video lesson · Ana Clara', true), T(70, 170, 1140, 'Weather Report 📺', 110, '#ffffff', { b: true }),
    T(70, 330, 1140, 'Chicago News — with Maria', 52, '#faefc2'),
    T(70, 430, 1140, 'Watch, understand, and become a weather reporter! 🌦️', 38, '#ffffff'),
    R(70, 560, 1140, 70, '#ffffff', { op: 0.15 }), T(90, 575, 1100, '▶️  ' + wxUrl + '   (1:53)', 30, '#faefc2', { b: true })]));
  wx.push(slide('cream', [tag('Our plan'), title("Today's plan"),
    T(90, 195, 1100, ['1️⃣  Warm-up + weather words', '2️⃣  Watch 1: the big picture', '3️⃣  Watch 2: complete the forecast table', '4️⃣  True or false + fill in the blanks', '5️⃣  Grammar: it WILL rain', '6️⃣  Your turn: you are the reporter! 🎤'].join('\n'), 36, '#2e2b2e', { lh: 1.75 })]));
  wx.push(slide('rose', [tag('Warm-up'), title('How’s the weather today? ☀️🌧️'),
    list(['🗣️  What’s the weather like in Guaratuba today?', '🌡️  Is it hot, warm, or cold? How many degrees?', '❓  What is your favorite kind of weather? Why?'], 220, 40)]));
  const wxWords = [['☀️', 'sunny'], ['☁️', 'cloudy'], ['🌧️', 'rain / rainy'], ['❄️', 'snow / snowy'],
    ['💨', 'windy'], ['⛈️', 'a storm'], ['🙂', 'warm'], ['🥶', 'cold']];
  wx.push(slide('cream', [tag('Weather words'), title('Say these words 🗣️'),
    ...wxWords.flatMap(([e, w], i) => { const x = 70 + (i % 4) * 290, y = 200 + Math.floor(i / 4) * 210;
      return [R(x, y, 270, 190, '#ffffff', { stroke: '#8e6d86', sw: 3 }), T(x, y + 15, 270, e, 70, '#2e2b2e', { al: 'center' }), T(x, y + 120, 270, w, 32, '#8e6d86', { b: true, al: 'center' })]; }),
    T(70, 640, 1140, '+ degrees 🌡️ · forecast (= previsão) · temperature · go down (= cair, baixar)', 28, '#2e2b2e', { i: true })]));
  wx.push(slide('rose', [tag('Watch 1 · The big picture'), title('Watch and answer 👀'),
    list(['1.  What is the reporter’s name?', '2.  Where is she from? (city + TV channel)', '3.  How was the weather this morning?', '4.  How many days are in the forecast?', '5.  Is the weather in Chicago calm or crazy? 😄'], 200, 36)]));
  const wxRows = ['This morning', 'Right now', 'Tonight', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  wx.push(slide('cream', [tag('Watch 2 · Complete the table'), title('The forecast 📋'),
    ...wxCell(70, 175, 300, 50, 'When?', '#8e6d86', 24, { c: '#ffffff', b: true }), ...wxCell(370, 175, 560, 50, 'Weather', '#8e6d86', 24, { c: '#ffffff', b: true }), ...wxCell(930, 175, 280, 50, '°F', '#8e6d86', 24, { c: '#ffffff', b: true }),
    ...wxRows.flatMap((r, i) => { const y = 225 + i * 58, f = i % 2 ? '#fdf7e1' : '#ffffff';
      return [...wxCell(70, y, 300, 58, r, f, 24, { b: true }), ...wxCell(370, y, 560, 58, '', f), ...wxCell(930, y, 280, 58, i === 0 ? '—' : '', f)]; })]));
  wx.push(slide('rose', [tag('Exercise 1 · True or false?'), title('T or F? ✅❌'),
    T(90, 190, 1100, ['1.  Right now it’s 72 degrees and sunny.', '2.  Tonight it will snow.', '3.  On Tuesday it will be sunny and warm.', '4.  On Wednesday the temperature will go up.', '5.  On Thursday there will be a big storm.', '6.  On Saturday it will be hot.'].join('\n'), 34, '#2e2b2e', { lh: 1.75 }),
    T(70, 640, 1140, 'Correct the false sentences! ✏️', 30, '#8e6d86', { b: true })]));
  wx.push(slide('cream', [tag('Exercise 2 · Fill in the blanks'), title('Listen again 🎧'),
    ...chip(70, 180, 170, 'cold'), ...chip(260, 180, 190, 'go down'), ...chip(470, 180, 170, 'snow'), ...chip(660, 180, 190, 'careful'), ...chip(870, 180, 170, 'windy'), ...chip(1060, 180, 150, 'week'),
    T(90, 280, 1100, ['1.  This morning it was ________ and cloudy.', '2.  The temperature will ________ to 51 degrees.', '3.  Then on Wednesday it will ________.', '4.  There will be a big storm. Be ________!', '5.  On Friday it will be a little ________.', '6.  Thanks for watching and have a good ________.'].join('\n'), 32, '#2e2b2e', { lh: 1.75 })]));
  wx.push(slide('rose', [tag('Grammar · The future with WILL'), title('It WILL rain 🌧️'),
    R(70, 190, 1140, 170, '#ffffff'), T(100, 205, 1080, 'it will + verb\n“Tonight it will rain.”   “On Wednesday it will snow.”', 34),
    R(70, 380, 1140, 120, '#ffffff'), T(100, 395, 1080, 'it will be + adjective\n“It will be sunny and warm.”   “It will be very windy.”', 32),
    R(70, 520, 1140, 120, '#ffffff'), T(100, 535, 1080, 'there will be + noun\n“There will be a big storm.”', 32),
    T(70, 655, 1140, '🇧🇷 will = vai (futuro) · it will rain = vai chover · won’t = will not', 26, '#8e6d86', { b: true })]));
  wx.push(slide('cream', [tag('Exercise 3 · Write with WILL'), title('Tomorrow it will… ✍️'),
    list(['1.  ☀️  (Monday)  →  On Monday it ____________________.', '2.  🌧️  (tonight)  →  ____________________.', '3.  💨☁️  (Friday)  →  ____________________.', '4.  ⛈️  (Sunday)  →  There ____________________.', '5.  🌡️⬇️  (temperature)  →  The temperature ____________.'], 200, 32)]));
  wx.push(slide('rose', [tag('Bonus · °F or °C?'), title('72 degrees?! 🤔'),
    T(70, 190, 1140, 'In the USA they use Fahrenheit (°F). In Brazil we use Celsius (°C).', 32),
    ...[['72°F', '22°C'], ['51°F', '11°C'], ['77°F', '25°C'], ['32°F', '0°C']].flatMap(([f, c], i) => { const x = 70 + i * 290;
      return [R(x, 290, 270, 170, '#ffffff', { stroke: '#f05d77', sw: 3 }), T(x, 310, 270, f, 48, '#f05d77', { b: true, al: 'center' }), T(x, 390, 270, '≈ ' + c, 40, '#2e2b2e', { al: 'center' })]; }),
    T(70, 510, 1140, '💡 Quick trick: °C ≈ (°F − 30) ÷ 2\n🗣️ Say: “Seventy-two degrees Fahrenheit is about twenty-two degrees Celsius.”', 30)]));
  wx.push(slide('cream', [tag('Your turn! 🎤'), title('You are the reporter!'),
    T(70, 185, 1140, 'Make a 3-day forecast for Guaratuba. Use this model:', 32),
    R(70, 245, 1140, 360, '#ffffff', { stroke: '#8e6d86', sw: 3 }),
    T(100, 260, 1080, '“Good afternoon! I’m [name] from Guaratuba News.\nLet’s look at our weather for today. Right now it’s ___ degrees and it’s ___.\nTomorrow it will be ___. On ___ it will ___.\nThere will be ___. The temperature will go up / down to ___ degrees.\nThanks for watching and have a good week!”', 30),
    T(70, 630, 1140, '⭐ Extra: record it like a real TV reporter! 📱', 30, '#8e6d86', { b: true })]));
  wx.push(slide('cream', [tag('Answers (teacher)'), title('✅ Answers'),
    T(70, 175, 1140, 'Watch 1:  1 Maria · 2 Chicago, Chicago News · 3 cold and cloudy · 4 five · 5 crazy\nTable:  morning cold, cloudy · now sunny, warm 72 · tonight rain 51 · Tue sunny, warm 77\n            Wed snow 31 · Thu big storm, rain a lot, very windy 56\n            Fri a little windy, a little cloudy 67 · Sat snow 32\nEx. 1:  1 T · 2 F (rain) · 3 T · 4 F (go down) · 5 T · 6 F (snow, 32°)\nEx. 2:  1 cold · 2 go down · 3 snow · 4 careful · 5 windy · 6 week\nEx. 3:  1 will be sunny · 2 Tonight it will rain · 3 On Friday it will be windy and cloudy\n            4 will be a storm · 5 will go down / will go up', 26)]));
  wx.push(slide('dark', [tag('Wrap-up', true), title('Great job, Ana Clara! 🌟', true),
    list(['✅  I understood a real weather report.', '✅  I can talk about the weather.', '✅  I can say the future: it will rain, there will be a storm.'], 220, 40, true),
    T(70, 560, 1140, 'Homework (optional): watch the weather news and write 3 sentences with will. 💜', 30, '#faefc2')]));

  // ---- Numbers 1–20 — Bunny Block World (Teles: games, routine, one idea per slide) ----
  const nb = [];
  const nbG = '#5cad5a', nbB = '#3d8bd9', nbP = '#f05d77', nbY = '#e0a800';
  const nbCard = (x, y, w, num, word, c, h) => [R(x, y, w, h || 330, '#ffffff', { shape: 'rect', stroke: c, sw: 8 }),
    T(x, y + 25, w, num, 120, c, { b: true, al: 'center' }), T(x, y + (h || 330) - 95, w, word, 40, '#2e2b2e', { b: true, al: 'center' })];
  const nbStage = (t, c) => [R(930, 36, 300, 48, c, { shape: 'rect' }), T(930, 43, 300, t, 24, '#ffffff', { b: true, al: 'center' })];
  nb.push(slide('dark', [tag('Bunny Block World 🐰🧱', true), T(70, 140, 1140, 'Number Obby', 130, '#ffffff', { b: true }),
    T(70, 320, 1140, '1  →  20', 90, '#faefc2', { b: true }), T(70, 470, 1140, '🐰 Hi, Teles! Bunny needs your help to reach the top! 🏁', 40, '#ffffff')]));
  nb.push(slide('cream', [tag('The map'), title('5 stages to the top 🗺️'),
    T(90, 200, 1100, '🟩 Stage 1:  Warm-up  1 – 10\n🟦 Stage 2:  Special numbers  11 and 12\n🟥 Stage 3:  The secret code  -TEEN\n🟨 Stage 4:  Boss level  20\n🏆 Stage 5:  Games + badges!', 42),
    T(70, 640, 1140, 'One stage at a time. ✔️ We tick each one. 💜', 30, '#8e6d86', { b: true })]));
  nb.push(slide('cream', [tag('Stage 1 · Warm-up'), ...nbStage('🟩 Stage 1', nbG), title('Count with Bunny! 🐰'),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((k, i) => { const x = 70 + (i % 5) * 230, y = 200 + Math.floor(i / 5) * 230;
      return [R(x, y, 210, 210, '#ffffff', { shape: 'rect', stroke: nbG, sw: 6 }), T(x, y + 15, 210, String(k), 90, nbG, { b: true, al: 'center' }),
        T(x, y + 145, 210, ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][i], 32, '#2e2b2e', { b: true, al: 'center' })]; })]));
  nb.push(slide('rose', [tag('Stage 2 · Special numbers'), ...nbStage('🟦 Stage 2', nbB), title('Two special blocks ⭐'),
    ...nbCard(170, 200, 420, '11', 'eleven', nbB), ...nbCard(690, 200, 420, '12', 'twelve', nbB),
    T(70, 570, 1140, '🗣️ Say it 3 times: eleven, eleven, eleven!', 34, '#2e2b2e', { b: true, al: 'center' })]));
  nb.push(slide('cream', [tag('Stage 3 · The secret code'), ...nbStage('🟥 Stage 3', nbP), title('The secret code: -TEEN 🔑'),
    R(70, 190, 1140, 400, '#ffffff', { shape: 'rect', stroke: nbP, sw: 6 }),
    T(100, 215, 1080, 'six  +  teen  =  sixteen  (16)\nseven  +  teen  =  seventeen  (17)\nnine  +  teen  =  nineteen  (19)', 48, '#2e2b2e', { b: true, al: 'center', lh: 1.6 }),
    T(70, 620, 1140, '13 – 19 all end in  -TEEN! 🐰 Bunny found the code!', 32, nbP, { b: true, al: 'center' })]));
  nb.push(slide('rose', [tag('Stage 3 · -TEEN blocks'), ...nbStage('🟥 Stage 3', nbP), title('13 · 14 · 15 🗣️'),
    ...nbCard(70, 200, 360, '13', 'thirteen', nbP), ...nbCard(460, 200, 360, '14', 'fourteen', nbP), ...nbCard(850, 200, 360, '15', 'fifteen', nbP),
    T(70, 580, 1140, '💡 three → THIRteen · five → FIFteen (a little different!)', 30, '#8e6d86', { b: true, al: 'center' })]));
  nb.push(slide('rose', [tag('Stage 3 · -TEEN blocks'), ...nbStage('🟥 Stage 3', nbP), title('16 · 17 · 18 · 19 🗣️'),
    ...nbCard(70, 200, 270, '16', 'sixteen', nbP), ...nbCard(360, 200, 270, '17', 'seventeen', nbP), ...nbCard(650, 200, 270, '18', 'eighteen', nbP), ...nbCard(940, 200, 270, '19', 'nineteen', nbP)]));
  nb.push(slide('dark', [tag('Stage 4 · Boss level', true), ...nbStage('🟨 Boss level', nbY), T(70, 130, 1140, 'The boss block! 👾', 60, '#ffffff', { b: true }),
    R(390, 240, 500, 330, '#ffffff', { shape: 'rect', stroke: nbY, sw: 10 }), T(390, 260, 500, '20', 150, nbY, { b: true, al: 'center' }),
    T(390, 470, 500, 'twenty', 56, '#2e2b2e', { b: true, al: 'center' }), T(70, 610, 1140, 'You beat the boss! 🎉 Stages 1–4 done!', 36, '#faefc2', { b: true, al: 'center' })]));
  nb.push(slide('dark', [tag('Checkpoint · Brain break', true), T(70, 190, 1140, 'Checkpoint! 🚩', 100, '#ffffff', { b: true }),
    T(70, 360, 1140, 'Stand up 🧍 · Jump 3 times 🐰🐰🐰\nBreathe in… 1 2 3 · out… 1 2 3', 46, '#faefc2'), T(70, 590, 1140, 'Ready? Now we play! 🎮', 36, '#ffffff')]));
  const nbRow = (y, e, n) => T(150, y, 1060, Array.from({ length: Math.ceil(n / 5) }, (_, g) => e.repeat(Math.min(5, n - g * 5))).join('  '), 40, '#2e2b2e');
  nb.push(slide('cream', [tag('Game 1 · How many?'), ...nbStage('🎮 Game 1', nbG), title('Bunny’s carrots 🥕 How many?'),
    T(70, 195, 80, 'A', 40, nbG, { b: true }), nbRow(195, '🥕', 12), T(70, 315, 80, 'B', 40, nbG, { b: true }), nbRow(315, '🧱', 15),
    T(70, 435, 80, 'C', 40, nbG, { b: true }), nbRow(435, '💎', 18),
    T(70, 600, 1140, 'Count with your finger 👉 and say the number in English!', 30, '#8e6d86', { b: true })]));
  nb.push(slide('rose', [tag('Game 2 · What’s next?'), ...nbStage('🎮 Game 2', nbB), title('Jump to the next block! ➡️'),
    T(90, 200, 1100, '1.   10 · 11 · 12 · ___\n2.   14 · 15 · 16 · ___\n3.   17 · 18 · 19 · ___\n4.   ___ · 12 · 13 · 14\n5.   2 · 4 · 6 · 8 · ___', 46, '#2e2b2e', { b: true, lh: 1.6 })]));
  const nbNums = ['13', '11', '20', '16', '12', '19'], nbWords = ['twelve', 'sixteen', 'thirteen', 'twenty', 'nineteen', 'eleven'];
  nb.push(slide('cream', [tag('Game 3 · Build the bridge'), ...nbStage('🎮 Game 3', nbP), title('Drag the word to its number 🧱'),
    ...nbNums.flatMap((k, i) => [R(70, 190 + i * 80, 200, 66, '#ffffff', { shape: 'rect', stroke: nbP, sw: 5 }), T(70, 197 + i * 80, 200, k, 40, nbP, { b: true, al: 'center' })]),
    ...nbWords.map((w, i) => T(760, 197 + i * 80, 400, w, 40, '#2e2b2e', { b: true }))]));
  nb.push(slide('rose', [tag('Game 4 · Oops, teacher!'), ...nbStage('🎮 Game 4', nbY), title('Is the teacher right? 🤔'),
    T(90, 200, 1100, 'The teacher says a number. Sometimes it’s WRONG! 😄\nSay “Yes!” ✅ or “No! It’s …” ❌', 36),
    ...['14', '11', '19', '17'].flatMap((k, i) => [R(70 + i * 290, 380, 270, 200, '#ffffff', { shape: 'rect', stroke: nbY, sw: 6 }), T(70 + i * 290, 410, 270, k, 110, nbY, { b: true, al: 'center' })]),
    T(70, 610, 1140, '👩‍🏫 Teacher: say “forty” for 14 · “seven” for 11 · “nineteen” · “seventy” for 17', 24, '#8e6d86', { i: true })]));
  nb.push(slide('cream', [tag('Final mission'), ...nbStage('🏁 Final mission', nbG), title('Treasure hunt at home 🔍'),
    T(90, 200, 1100, 'Bring them to the camera and count in English!\n\n☐  🧸  5 toys\n☐  ✏️  11 pencils or pens\n☐  📚  13 things from your room\n☐  🧱  20 small things (blocks, coins…)', 40)]));
  nb.push(slide('cream', [tag('Answers (teacher)'), title('✅ Answers'),
    T(70, 190, 1140, 'Game 1:  A 12 (twelve) · B 15 (fifteen) · C 18 (eighteen)\nGame 2:  1 13 · 2 17 · 3 20 · 4 11 · 5 10\nGame 3:  13 thirteen · 11 eleven · 20 twenty · 16 sixteen · 12 twelve · 19 nineteen\nGame 4:  14 No, fourteen · 11 No, eleven · 19 Yes · 17 No, seventeen', 32)]));
  nb.push(slide('dark', [tag('You reached the top!', true), T(70, 130, 1140, '🏆', 150, '#ffffff', { al: 'center' }),
    T(70, 340, 1140, 'Teles beat the Number Obby!', 64, '#ffffff', { b: true, al: 'center' }),
    T(70, 470, 1140, '🥇 Counting badge   🔑 -TEEN badge   👾 Boss badge', 38, '#faefc2', { al: 'center' }),
    T(70, 600, 1140, '🐰 Bunny says: Great job! See you next game! 💜', 34, '#faefc2', { al: 'center' })]));

  // ---- Debut (KATSEYE) — Aninha, same 30-min shape as "Touch" ----
  const db = [];
  db.push(slide('dark', [tag('English with Aninha', true), T(70, 200, 1140, 'Debut 🎤', 140, '#ffffff', { b: true }),
    T(70, 380, 1140, 'by KATSEYE', 52, '#faefc2'), T(70, 480, 1140, 'Today: sing it, understand it, USE it ✨', 44, '#ffffff')]));
  db.push(slide('cream', [tag('Our plan · 30 min'), title("Today's plan"),
    list(['1️⃣  Warm-up + listen  (5 min)', '2️⃣  Sing the song with the words  (5 min)', '3️⃣  6 cool expressions  (10 min)', '4️⃣  Fill in the blanks  (7 min)', '5️⃣  Your turn to talk + finish  (3 min)'], 190, 40)]));
  db.push(slide('rose', [tag('Warm-up'), ...time('0–5 min'), title('What is a “debut”? 🌟'),
    list(['💡  A debut = the first time a singer or a group shows their work to the world.', '🎧  Listen to the song once. How does it make you feel?', '❓  Are the singers shy or confident? How do you know?'], 220, 40)]));
  db.push(lyric(1, 'Verse 1', 'Idea: nobody needs to tell them what to do. They like their own style and their friends.'));
  db.push(lyric(2, 'Chorus', 'Idea: they are not showing off, they are just being themselves — and the people who doubted them will change their minds.'));
  db.push(lyric(3, 'Verse 2 + last chorus', 'Idea: they don’t want to be the same as everybody else. They are loyal to each other and ready to take a chance.'));

  const dbExp = (k, phrase, meaning, ex, pt) => db.push(slide('rose', [tag('Expression ' + k + ' of 6'), ...time('10–20 min'), title(phrase),
    R(70, 200, 1140, 130, '#ffffff'), T(100, 215, 1080, '💡 Meaning: ' + meaning, 32),
    R(70, 355, 1140, 200, '#ffffff'), T(100, 370, 1080, '💬 In real life:\n' + ex.join('\n'), 32),
    T(70, 600, 1140, pt, 30, '#8e6d86', { b: true })]));
  dbExp(1, 'make your debut', 'show your work to the public for the first time.', ['“She made her debut on TV last year.”', '“Our band will make its debut at the school party!”'], '🇧🇷 estrear / fazer a estreia');
  dbExp(2, 'show off  (= flex)', 'do something to make people look at you and think you are great.', ['“Stop showing off your new phone!”', '“He’s flexing his new sneakers.”  (informal)'], '🇧🇷 se exibir / se mostrar  ·  flexing = ostentando (gíria)');
  dbExp(3, 'make a scene', 'do something loud or dramatic so everybody looks at you.', ['“Please don’t make a scene at the restaurant!”', '“My little brother made a scene at the mall.”'], '🇧🇷 dar um show / fazer escândalo');
  dbExp(4, 'cookie-cutter', 'exactly the same as many other things — not original.', ['“I don’t want a cookie-cutter bedroom.”', '“Her style is not cookie-cutter. It’s unique!”'], '🇧🇷 igualzinho aos outros / sem originalidade  (cookie cutter = forminha de biscoito 🍪)');
  dbExp(5, 'ride or die', 'a friend who is 100% loyal and is always with you.', ['“Lia is my ride or die.”', '“We’re ride or die — best friends forever!”'], '🇧🇷 amigo(a) pra toda hora / fiel até o fim');
  dbExp(6, 'roll the dice', 'take a chance — try something without knowing the result.', ['“I don’t know if I’ll win, but I’ll roll the dice.”', '“Let’s roll the dice and try the new game!”'], '🇧🇷 arriscar / tentar a sorte 🎲  ·  “simple as that” = simples assim');

  db.push(slide('cream', [tag('Exercise 1'), ...time('20–27 min'), title('Word bank 🧩'),
    ...chip(70, 220, 200, 'debut'), ...chip(290, 220, 260, 'showing off'), ...chip(570, 220, 200, 'scene'), ...chip(790, 220, 300, 'cookie-cutter'),
    ...chip(70, 320, 260, 'ride or die'), ...chip(350, 320, 200, 'dice'), ...chip(570, 320, 300, 'simple as that'), ...chip(890, 320, 200, 'pull up'),
    T(70, 450, 1140, 'Choose the right word for each sentence on the next slides. ➡️\nUse each word only once. Take your time. 😊', 36)]));
  const dbEx = (head, items) => db.push(slide('cream', [tag('Exercise 1 · Fill in the blanks'), ...time('20–27 min'), title(head), list(items, 200, 34)]));
  dbEx('Sentences 1–4', ['1.  KATSEYE made their ________ in 2024.', '2.  He’s always ________ his new phone. So annoying!', '3.  Don’t cry and shout in the store. Don’t make a ________.', '4.  All the houses on my street look the same. They’re so ________.']);
  dbEx('Sentences 5–8', ['5.  Maya is always there for me. She’s my ________.', '6.  I don’t know if it will work, but let’s roll the ________.', '7.  You want to learn English? Practice every day. ________!', '8.  We’re at the park. Can you ________ in 10 minutes? (= arrive)']);
  db.push(slide('cream', [tag('Exercise 2 · Choose the best answer'), ...time('20–27 min'), title('Which one is right? ✅'),
    list(['1.  If you make your debut, you…\n     A) stop singing      B) show your work for the first time', '2.  Your ride or die friend is…\n     A) always with you      B) never with you', '3.  Something cookie-cutter is…\n     A) very original      B) the same as many others', '4.  If you roll the dice, you…\n     A) take a chance      B) stay safe and do nothing'], 190, 30)]));
  db.push(slide('cream', [tag('Exercise 3 · Listen again 🎧'), ...time('20–27 min'), title('Word hunt'),
    T(70, 190, 1140, 'Listen to the song again. ✔️ Tick the words you hear. ⚠️ 4 words are NOT in the song!', 32),
    T(90, 290, 380, '☐ debut\n☐ scene\n☐ camera\n☐ simple', 40), T(470, 290, 380, '☐ dice\n☐ spotlight\n☐ cookie\n☐ ride', 40), T(850, 290, 380, '☐ lights\n☐ flexin’\n☐ confidence\n☐ pull up', 40)]));
  db.push(slide('cream', [tag('Answers (teacher)'), title('✅ Answers'),
    T(70, 190, 1140, 'Ex. 1:  1 debut · 2 showing off · 3 scene · 4 cookie-cutter\n           5 ride or die · 6 dice · 7 Simple as that · 8 pull up\n\nEx. 2:  1 B · 2 A · 3 B · 4 A\n\nEx. 3:  NOT in the song → camera · spotlight · lights · confidence', 36)]));
  db.push(slide('rose', [tag('Your turn! 🗣️'), ...time('27–30 min'), title("Let's talk"),
    list(['💬  Who is your ride or die friend? Why?', '💬  Imagine your debut: what do you do? Sing, dance, act, play a game…?', '💬  When was the last time you rolled the dice and tried something new?'], 230, 36)]));
  db.push(slide('dark', [tag('Wrap-up', true), title('Great job, Aninha! 🌟', true),
    list(['✅  I sang “Debut”.', '✅  I learned 6 expressions.', '✅  I can use them in real life.'], 230, 44, true),
    T(70, 560, 1140, 'Homework (optional): write 3 sentences with your favorite expressions. 💜', 32, '#faefc2')]));

  // ---- AV2 review (school test): weather + past continuous — Ana Clara ----
  const av = [];
  const avPart = t => [R(980, 36, 250, 44, '#f05d77'), T(980, 42, 250, t, 22, '#ffffff', { b: true, al: 'center' })];
  const avLines = (y, items, fs, o) => T(90, y, 1100, items.join('\n'), fs || 32, '#2e2b2e', { lh: 1.7, ...o });
  const avBox = (y, h, text, fs, fill) => [R(70, y, 1140, h, fill || '#ffffff'), T(100, y + 14, 1080, text, fs || 30, '#2e2b2e', { lh: 1.45 })];
  av.push(slide('dark', [tag('Test prep · AV2', true), T(70, 160, 1140, 'AV2 Review 📝', 120, '#ffffff', { b: true }),
    T(70, 320, 1140, 'Weather + Past Continuous', 56, '#faefc2'), T(70, 430, 1140, 'You can do it, Ana Clara! 💪✨', 44, '#ffffff')]));
  av.push(slide('cream', [tag('What is on the test'), title('5 topics ✔️'),
    avLines(190, ['☐  1. How’s the weather? What’s the temperature?  (p. 126–131)', '☐  2. Past continuous — affirmative  (p. 131–134)', '☐  3. Past continuous — negative and questions  (p. 137–139)', '☐  4. Past continuous vs. simple past  (p. 148–150)', '☐  5. Past continuous + Wh- questions  (p. 154)'], 32),
    T(70, 600, 1140, 'Tick each topic when you feel ready! 😊', 30, '#8e6d86', { b: true })]));

  // 1 — weather
  av.push(slide('rose', [tag('Topic 1 · Weather'), ...avPart('Topic 1'), title('Weather words ☀️🌧️'),
    T(90, 190, 540, '☀️ sunny\n☁️ cloudy\n🌧️ rainy\n💨 windy\n❄️ snowy\n🌫️ foggy\n⛈️ stormy', 36, '#2e2b2e', { lh: 1.45 }),
    T(650, 190, 540, '🥵 hot\n🙂 warm\n🍃 cool\n🥶 cold\n🧊 freezing\n💧 humid', 36, '#2e2b2e', { lh: 1.45 }),
    T(650, 560, 560, '💡 rain (noun) → rainy (adjective)\n💡 wind → windy · sun → sunny', 26, '#8e6d86', { b: true })]));
  av.push(slide('cream', [tag('Topic 1 · Questions and answers'), ...avPart('Topic 1'), title('Ask and answer 🗣️'),
    ...avBox(190, 150, '❓ How’s the weather?   =   What’s the weather like?\n✅ It’s sunny and hot.   ·   It’s raining.   ·   It’s cloudy.', 30),
    ...avBox(360, 150, '❓ What’s the temperature?\n✅ It’s 25 degrees (Celsius).   ·   It’s minus 2 degrees. (−2 °C)', 30),
    T(70, 540, 1140, '⚠️ It’s rainy ✔   It’s raining ✔   It’s rain ✘\n⚠️ Always use IT: “It’s cold.”  (not “Is cold.”)', 30, '#f05d77', { b: true })]));
  av.push(slide('rose', [tag('Topic 1 · Practice'), ...avPart('Topic 1'), title('Look and answer ✍️'),
    avLines(190, ['1.  ☀️ 32 °C  →  How’s the weather? ______________________', '2.  🌧️ 18 °C  →  What’s the weather like? __________________', '3.  ❄️ −5 °C  →  What’s the temperature? __________________', '4.  💨☁️  →  How’s the weather? ______________________', '5.  🌫️ 12 °C  →  ______________________________________'], 32)]));
  av.push(slide('cream', [tag('Topic 1 · Reading'), ...avPart('Topic 1'), title('A trip to Gramado 🏔️'),
    ...avBox(180, 270, 'Last July, my family and I went to Gramado. On the first day, it was cold and foggy. The temperature was 4 degrees in the morning! On the second day, it was sunny but windy. We were walking in the park when it started to rain. Luckily, my mom was carrying an umbrella.', 29),
    T(90, 470, 1100, '1. How was the weather on the first day?\n2. What was the temperature in the morning?\n3. What were they doing when it started to rain?\n4. What was the mom carrying?', 28, '#8e6d86', { b: true, lh: 1.5 })]));

  // 2 — past continuous affirmative
  av.push(slide('rose', [tag('Topic 2 · Past continuous'), ...avPart('Topic 2'), title('Was / were + verb-ING 🎬'),
    ...avBox(190, 160, 'I / he / she / it   →   WAS + verb-ing\nyou / we / they   →   WERE + verb-ing', 36),
    ...avBox(370, 150, '“At 8 p.m. yesterday, I was studying.”\n“They were playing soccer at 4 o’clock.”', 32),
    T(70, 550, 1140, '💡 Use it for an action IN PROGRESS at a moment in the past.\n🇧🇷 = “estava fazendo” (I was studying = eu estava estudando)', 28, '#8e6d86', { b: true })]));
  av.push(slide('cream', [tag('Topic 2 · -ING spelling'), ...avPart('Topic 2'), title('How to write -ING ✏️'),
    T(90, 190, 1100, 'most verbs  →  + ing:   play → playing · rain → raining · study → studying\nend in -e  →  drop the e:   write → writing · make → making · dance → dancing\nshort verb (consonant–vowel–consonant)  →  double:\n         run → running · swim → swimming · sit → sitting · get → getting', 30, '#2e2b2e', { lh: 1.8 }),
    T(70, 560, 1140, '⚠️ Not doubled: rain → raining (2 vowels) · snow → snowing (ends in w)', 28, '#f05d77', { b: true })]));
  av.push(slide('rose', [tag('Topic 2 · Practice'), ...avPart('Topic 2'), title('Complete with was / were + -ING'),
    avLines(190, ['1.  At 7 a.m., it ________________ (rain).', '2.  My friends ________________ (swim) in the pool.', '3.  I ________________ (write) an email to my teacher.', '4.  We ________________ (watch) a movie at 9 p.m.', '5.  The sun ________________ (shine) all morning.', '6.  You ________________ (run) in the park.'], 32)]));

  // 3 — negative and questions
  av.push(slide('cream', [tag('Topic 3 · Negative and questions'), ...avPart('Topic 3'), title('Negative ❌ and questions ❓'),
    ...avBox(180, 120, '❌  wasn’t (was not) / weren’t (were not) + verb-ing\n     “It wasn’t snowing.”   “They weren’t listening.”', 29),
    ...avBox(320, 120, '❓  Was / Were + subject + verb-ing?\n     “Was it raining?”   “Were you sleeping?”', 29),
    ...avBox(460, 120, '✅  Yes, it was. / No, it wasn’t.\n     Yes, we were. / No, we weren’t.', 29),
    T(70, 610, 1140, '⚠️ Short answers: NO -ing!  “Yes, I was.” (not “Yes, I was sleeping.”)', 26, '#f05d77', { b: true })]));
  av.push(slide('rose', [tag('Topic 3 · Practice'), ...avPart('Topic 3'), title('Make it negative, then ask ❓'),
    avLines(190, ['1.  She was cooking dinner.   ❌ ______________________   ❓ ______________________?', '2.  They were playing video games.   ❌ ______________   ❓ ______________?', '3.  It was snowing in Curitiba.   ❌ ______________   ❓ ______________?'], 28, { lh: 2 }),
    T(70, 470, 1140, 'Answer with short answers:', 30, '#8e6d86', { b: true }),
    avLines(520, ['4.  Were you studying at 10 p.m.?  👍 ______________', '5.  Was Paulo sleeping?  👎 ______________'], 30)]));

  // 4 — past continuous vs simple past
  av.push(slide('cream', [tag('Topic 4 · Past continuous vs. simple past'), ...avPart('Topic 4'), title('Long action + short action ⏳⚡'),
    R(90, 200, 1100, 26, '#8e6d86', { shape: 'rect' }), T(90, 238, 1100, 'I was walking home  (long action, in progress) …', 28, '#8e6d86', { b: true }),
    R(820, 172, 26, 62, '#f05d77', { shape: 'rect' }), T(560, 282, 650, '⚡ … when it started to rain. (short action)', 28, '#f05d77', { b: true }),
    ...avBox(350, 150, 'WHEN + simple past:  “I was walking home when it started to rain.”\nWHILE + past continuous:  “While I was walking home, it started to rain.”', 29),
    T(70, 530, 1140, '💡 Two long actions at the same time → while + while:\n“I was reading while my brother was playing.”', 28, '#2e2b2e')]));
  av.push(slide('rose', [tag('Topic 4 · Practice'), ...avPart('Topic 4'), title('Past continuous or simple past?'),
    avLines(185, ['1.  I ______________ (sleep) when the phone ______________ (ring).', '2.  While we ______________ (have) lunch, it ______________ (start) to rain.', '3.  She ______________ (fall) while she ______________ (ride) her bike.', '4.  When I ______________ (arrive), they ______________ (watch) TV.', '5.  It ______________ (snow) when we ______________ (leave) the hotel.'], 29, { lh: 1.95 })]));
  av.push(slide('cream', [tag('Topic 4 · When or while?'), ...avPart('Topic 4'), title('Choose: when or while? 🤔'),
    avLines(200, ['1.  I was taking a shower ________ the lights went out.', '2.  ________ Mom was cooking, Dad was cleaning.', '3.  ________ I saw the storm, I closed the windows.', '4.  He cut his finger ________ he was making a sandwich.'], 32, { lh: 1.9 })]));

  // 5 — wh- questions
  av.push(slide('rose', [tag('Topic 5 · Wh- questions'), ...avPart('Topic 5'), title('Wh- + was / were + subject + -ING'),
    avLines(190, ['❓ What were you doing at 9 p.m.?   →   I was studying.', '❓ Where was she going?   →   She was going to school.', '❓ Who was he talking to?   →   He was talking to his mom.', '❓ Why were they laughing?   →   Because the movie was funny.', '❓ What was the weather like?   →   It was raining.'], 30, { lh: 1.85 })]));
  av.push(slide('cream', [tag('Topic 5 · Practice'), ...avPart('Topic 5'), title('Write the question for the answer ✍️'),
    avLines(190, ['1.  ____________________________?   →  I was reading a book.', '2.  ____________________________?   →  They were going to the beach.', '3.  ____________________________?   →  She was talking to Lucas.', '4.  ____________________________?   →  It was snowing.', '5.  ____________________________?   →  Because he was tired.'], 30, { lh: 1.85 })]));

  // mixed + exam tips
  av.push(slide('rose', [tag('Mixed · Find the mistake 🔍'), title('Correct the sentences'),
    avLines(190, ['1.  I were watching TV when you called.', '2.  It was rainning all day.', '3.  Was you sleeping at 11 p.m.?', '4.  They wasn’t playing soccer.', '5.  While I walked home, I was seeing a rainbow.', '6.  What you were doing yesterday at 6?'], 32)]));
  av.push(slide('cream', [tag('Speaking 🗣️'), title('Your turn!'),
    avLines(200, ['💬  What were you doing yesterday at 7 a.m.? And at 9 p.m.?', '💬  How was the weather last weekend? What were you doing?', '💬  Tell me about a time something happened while you were …'], 32, { lh: 1.9 })]));
  av.push(slide('rose', [tag('Test tips 💡'), title('Before the test'),
    avLines(190, ['✅  Was = I / he / she / it  ·  Were = you / we / they', '✅  Check the -ING spelling (running, writing, raining).', '✅  Short answers: Yes, I was. / No, they weren’t.', '✅  Long action → past continuous · Short action → simple past', '✅  WHEN + simple past · WHILE + past continuous', '✅  Read the weather text twice before answering.'], 30)]));
  av.push(slide('cream', [tag('Answers (teacher) · 1'), title('✅ Answers — topics 1 to 3'),
    T(70, 180, 1140, 'T1 practice:  1 It’s sunny and hot. · 2 It’s rainy / raining. · 3 It’s minus 5 degrees. · 4 It’s windy and cloudy. · 5 How’s the weather? / What’s the temperature? It’s foggy. / It’s 12 degrees.\nReading:  1 cold and foggy · 2 4 degrees · 3 walking in the park · 4 an umbrella\nT2:  1 was raining · 2 were swimming · 3 was writing · 4 were watching · 5 was shining · 6 were running\nT3:  1 She wasn’t cooking dinner. / Was she cooking dinner? · 2 They weren’t playing… / Were they playing…? · 3 It wasn’t snowing… / Was it snowing in Curitiba? · 4 Yes, I was. · 5 No, he wasn’t.', 25, '#2e2b2e', { lh: 1.5 })]));
  av.push(slide('cream', [tag('Answers (teacher) · 2'), title('✅ Answers — topics 4, 5 and mixed'),
    T(70, 180, 1140, 'T4:  1 was sleeping / rang · 2 were having / started · 3 fell / was riding · 4 arrived / were watching · 5 was snowing / left\nWhen or while:  1 when · 2 While · 3 When · 4 while\nT5:  1 What were you doing? · 2 Where were they going? · 3 Who was she talking to? · 4 What was the weather like? · 5 Why was he …? (e.g. Why was he sleeping?)\nMistakes:  1 was watching · 2 raining · 3 Were you sleeping · 4 weren’t playing · 5 While I was walking home, I saw a rainbow. · 6 What were you doing…?', 25, '#2e2b2e', { lh: 1.5 })]));
  av.push(slide('dark', [tag('Ready!', true), title('You are ready, Ana Clara! 🌟', true),
    list(['✅  I can talk about the weather and the temperature.', '✅  I can use the past continuous (+ / − / ?).', '✅  I know when to use past continuous or simple past.'], 220, 38, true),
    T(70, 560, 1140, 'Good luck on your test! 🍀 Study a little every day. 💜', 32, '#faefc2')]));

  // ---- Alicia (10) · Let's go shopping + Walking home · test prep · 1 h ----
  const al = [];
  const alMission = t => [R(800, 36, 240, 44, '#8e6d86'), T(800, 42, 240, t, 22, '#ffffff', { b: true, al: 'center' })];
  const alLines = (y, items, fs, o) => T(90, y, 1100, items.join('\n'), fs || 32, '#2e2b2e', { lh: 1.7, ...o });
  const alBox = (y, h, text, fs, fill) => [R(70, y, 1140, h, fill || '#ffffff'), T(100, y + 14, 1080, text, fs || 30, '#2e2b2e', { lh: 1.45 })];
  // A shop-window card: picture, name and a pink price tag.
  const alItem = (x, y, emoji, name, price) => [R(x, y, 340, 170, '#ffffff'),
    T(x + 20, y + 30, 110, emoji, 70, '#2e2b2e'), T(x + 135, y + 30, 190, name, 30, '#2e2b2e', { b: true }),
    R(x + 135, y + 95, 130, 50, '#f05d77'), T(x + 135, y + 102, 130, price, 28, '#ffffff', { b: true, al: 'center' })];
  // A building on the map.
  const alPlace = (x, y, emoji, name, fill) => [R(x, y, 330, 130, fill),
    T(x, y + 14, 330, emoji, 50, '#2e2b2e', { al: 'center' }), T(x, y + 80, 330, name, 28, '#2e2b2e', { b: true, al: 'center' })];

  al.push(slide('dark', [tag('Test prep · English with Alicia', true), T(70, 150, 1140, "Let's Go Shopping! 🛍️", 96, '#ffffff', { b: true }),
    T(70, 290, 1140, '+ Walking Home 🏙️', 64, '#faefc2', { b: true }),
    T(70, 420, 1140, '5 missions · 1 final challenge · 1 champion: YOU! 🏆', 40, '#ffffff'),
    T(70, 500, 1140, 'You can do it, Alicia! 💪✨', 36, '#faefc2')]));
  al.push(slide('cream', [tag('Our plan · 1 hour'), title('Your 5 missions ⭐'),
    alLines(185, ['👕  Mission 1 · Clothes  (8 min)', '💲  Mission 2 · Numbers 30–100 and prices  (12 min)', '👍  Mission 3 · I like it / I like them  (12 min)', '📦  Mission 4 · on · next to · under  (8 min)', '🏙️  Mission 5 · Places in the city  (12 min)', '🏆  Final challenge + test tips  (8 min)'], 34),
    T(70, 600, 1140, 'Win a ⭐ for every mission. 5 stars = test champion! 🏆', 30, '#8e6d86', { b: true })]));

  // Mission 1 — clothes
  al.push(slide('rose', [tag('Mission 1 · Clothes'), ...alMission('Mission 1 👕'), ...time('0–4 min'), title("What's in the store? 👕"),
    T(90, 185, 360, '👕 T-shirt\n👔 shirt\n👗 dress\n👖 jeans\n🩳 shorts\n🧥 jacket', 36, '#2e2b2e', { lh: 1.5 }),
    T(470, 185, 360, '👟 sneakers\n👞 shoes\n🧢 cap\n👒 hat\n🧦 socks\n🧣 scarf', 36, '#2e2b2e', { lh: 1.5 }),
    ...[R(850, 190, 360, 360, '#ffffff')], T(870, 205, 320, '💡 Always plural:\njeans, shorts, pants, sneakers, shoes, socks\n\n→ “They are cool!”\n→ “I like THEM.”', 26, '#8e6d86', { b: true, lh: 1.45 })]));
  al.push(slide('cream', [tag('Mission 1 · Speak fast!'), ...alMission('Mission 1 👕'), ...time('4–8 min'), title('Color + clothes ⚡'),
    ...alBox(180, 90, '💡 The color comes FIRST:  a red T-shirt ✔   a T-shirt red ✘', 30, '#ffffff'),
    alLines(300, ['🔴 👕  →  a __________________', '🔵 🧢  →  a __________________', '⚫ 👟  →  __________________  (plural!)', '🟡 👗  →  a __________________', '🟢 🧦  →  __________________  (plural!)'], 32),
    T(760, 330, 450, '⏱️ Say all 5 in\n20 seconds! ⭐', 40, '#f05d77', { b: true, al: 'center' })]));

  // Mission 2 — numbers and prices
  al.push(slide('rose', [tag('Mission 2 · Numbers 30–100'), ...alMission('Mission 2 💲'), ...time('8–12 min'), title('Big numbers 🔢'),
    T(90, 185, 540, '30  thirty\n40  forty\n50  fifty\n60  sixty', 40, '#2e2b2e', { lh: 1.5, b: true }),
    T(650, 185, 560, '70  seventy\n80  eighty\n90  ninety\n100  one hundred', 40, '#2e2b2e', { lh: 1.5, b: true }),
    ...alBox(470, 90, '45 = forty-five   ·   72 = seventy-two   ·   99 = ninety-nine', 32),
    T(70, 590, 1140, '⚠️ forty (no U!)  ·  thirTEEN (13) vs. THIRty (30) — listen to the end!', 28, '#f05d77', { b: true })]));
  al.push(slide('cream', [tag('Mission 2 · Number game'), ...alMission('Mission 2 💲'), title('Write it! Say it! ✍️🗣️'),
    alLines(185, ['1.  37  →  ____________________', '2.  54  →  ____________________', '3.  68  →  ____________________', '4.  81  →  ____________________', '5.  100  →  ____________________'], 32),
    T(700, 185, 510, '🎧 Teacher says, you write the number:\n\nseventy-three → ____\nninety-six → ____\nfifty-eight → ____\nforty-four → ____', 30, '#8e6d86', { b: true, lh: 1.5 })]));
  al.push(slide('rose', [tag('Mission 2 · Prices'), ...alMission('Mission 2 💲'), ...time('12–16 min'), title('How much…? 💲'),
    ...alBox(185, 130, '👕 ONE thing:  How much IS the T-shirt?\n✅  IT’S 35 dollars.', 32),
    ...alBox(340, 130, '👟 TWO or more / plural:  How much ARE the sneakers?\n✅  THEY’RE 90 dollars.', 32),
    T(70, 500, 1140, '💡 $ 35 = thirty-five dollars\n💡 is → it’s   ·   are → they’re', 30, '#8e6d86', { b: true })]));
  al.push(slide('cream', [tag('Mission 2 · The shop window 🛍️'), ...alMission('Mission 2 💲'), ...time('16–20 min'), title('Ask and answer!'),
    ...alItem(90, 180, '👕', 'T-shirt', '$32'), ...alItem(470, 180, '👗', 'dress', '$75'), ...alItem(850, 180, '👟', 'sneakers', '$98'),
    ...alItem(90, 370, '🧢', 'cap', '$41'), ...alItem(470, 370, '🧦', 'socks', '$30'), ...alItem(850, 370, '🧥', 'jacket', '$86'),
    T(70, 570, 1140, '🗣️ How much is the cap? · How much are the socks?\n🤔 You have $100. What can you buy? Which one is the most expensive?', 27, '#8e6d86', { b: true, lh: 1.5 })]));

  // Mission 3 — opinions
  al.push(slide('rose', [tag('Mission 3 · Opinions'), ...alMission('Mission 3 👍'), ...time('20–24 min'), title('I like it! I like them! 👍'),
    ...[R(70, 185, 555, 240, '#ffffff'), R(655, 185, 555, 240, '#ffffff')],
    T(95, 200, 510, 'ONE thing 👕\n👍 I like it.\n👎 I don’t like it.\n“It’s cool!”', 34, '#2e2b2e', { lh: 1.4 }),
    T(680, 200, 510, 'TWO or more 👟👟\n👍 I like them.\n👎 I don’t like them.\n“They’re cool!”', 34, '#2e2b2e', { lh: 1.4 }),
    T(90, 450, 1100, '😎 cool   😍 beautiful   🤢 ugly', 38, '#2e2b2e', { b: true }),
    T(90, 520, 1100, 'Food 🍕:   😋 delicious   🤤 yummy  →  “It’s delicious!” “Yummy!”', 34, '#8e6d86', { b: true })]));
  al.push(slide('cream', [tag('Mission 3 · What do you think?'), ...alMission('Mission 3 👍'), ...time('24–28 min'), title('Like it or not? 🤔'),
    alLines(185, ['🧢 a pink cap  →  I ______ it! It’s ______.', '👟👟 green sneakers  →  I ______ them. They’re ______.', '👗 a yellow dress  →  ______________________', '🧦🧦 funny socks  →  ______________________', '🍕 a pizza  →  Mmm! It’s ______! ______!', '🍰 a chocolate cake  →  ______________________'], 32),
    T(70, 600, 1140, '💬 Use: I like it / them · I don’t like it / them · cool · ugly · beautiful · delicious · yummy', 26, '#8e6d86', { b: true })]));
  al.push(slide('rose', [tag('Mission 3 · it or them?'), ...alMission('Mission 3 👍'), title('Complete with IT or THEM ✍️'),
    alLines(185, ['1.  I love this jacket. I like ______. 😍', '2.  These jeans are ugly. I don’t like ______. 🤢', '3.  Look at the sneakers! I like ______. They’re cool!', '4.  This hat is ugly. I don’t like ______.', '5.  The shorts are beautiful. I like ______.', '6.  This cake is yummy! I like ______.'], 32)]));
  al.push(slide('cream', [tag('Mission 3 · Role play 🛒'), ...alMission('Mission 3 👍'), ...time('28–32 min'), title('At the store 🛍️'),
    ...alBox(180, 340, '🧑‍💼 Seller:  Hello! Can I help you?\n👧 Alicia:  Yes, please. I’m looking for a T-shirt.\n🧑‍💼 Seller:  What color?\n👧 Alicia:  Blue, please.\n🧑‍💼 Seller:  Here you are.\n👧 Alicia:  Oh, I like it! It’s beautiful. How much is it?\n🧑‍💼 Seller:  It’s 39 dollars.\n👧 Alicia:  OK, I’ll take it. Thank you!', 28),
    T(70, 545, 1140, '🔁 Now change roles! Then buy SNEAKERS: “How much ARE they? I like THEM!”', 28, '#f05d77', { b: true })]));

  // Mission 4 — prepositions
  al.push(slide('rose', [tag('Mission 4 · Prepositions of place'), ...alMission('Mission 4 📦'), ...time('32–36 min'), title('on · next to · under 📦'),
    R(90, 180, 330, 330, '#ffffff'), R(475, 180, 330, 330, '#ffffff'), R(860, 180, 330, 330, '#ffffff'),
    T(90, 195, 330, 'on', 42, '#f05d77', { b: true, al: 'center' }), T(475, 195, 330, 'next to', 42, '#f05d77', { b: true, al: 'center' }), T(860, 195, 330, 'under', 42, '#f05d77', { b: true, al: 'center' }),
    R(195, 400, 120, 90, '#c9a77d'), T(195, 312, 120, '🐱', 64, '#2e2b2e', { al: 'center' }),
    R(520, 400, 120, 90, '#c9a77d'), T(660, 405, 110, '🐱', 64, '#2e2b2e', { al: 'center' }),
    R(905, 330, 240, 18, '#8e6d86'), R(915, 348, 16, 140, '#8e6d86'), R(1119, 348, 16, 140, '#8e6d86'), T(970, 400, 110, '🐱', 64, '#2e2b2e', { al: 'center' }),
    T(90, 530, 330, 'The cat is ON the box.', 26, '#2e2b2e', { al: 'center' }), T(475, 530, 330, 'The cat is NEXT TO the box.', 26, '#2e2b2e', { al: 'center' }), T(860, 530, 330, 'The cat is UNDER the table.', 26, '#2e2b2e', { al: 'center' }),
    T(70, 620, 1140, '🏙️ In the city:  The bank is ON Green Street. · The bakery is NEXT TO the bank.', 26, '#8e6d86', { b: true })]));
  al.push(slide('cream', [tag('Mission 4 · Messy bedroom!'), ...alMission('Mission 4 📦'), ...time('36–40 min'), title('Where are my things? 🛏️'),
    R(300, 340, 470, 90, '#8e6d86'), R(310, 300, 120, 44, '#ffffff'), R(310, 430, 18, 70, '#2e2b2e'), R(742, 430, 18, 70, '#2e2b2e'),
    T(500, 255, 90, '🧢', 60, '#2e2b2e', { al: 'center' }), T(640, 260, 90, '📕', 56, '#2e2b2e', { al: 'center' }),
    T(480, 436, 140, '👟', 50, '#2e2b2e', { al: 'center' }), T(800, 390, 120, '🎒', 80, '#2e2b2e', { al: 'center' }),
    T(70, 540, 1140, '1. Where’s the cap?   2. Where are the sneakers?\n3. Where’s the backpack?   4. Where’s the book?', 30, '#2e2b2e', { b: true, lh: 1.5 }),
    T(940, 200, 270, '✅ It’s on the… / They’re under the…', 24, '#8e6d86', { b: true })]));

  // Mission 5 — places in the city
  al.push(slide('rose', [tag('Mission 5 · Places in the city'), ...alMission('Mission 5 🏙️'), ...time('40–44 min'), title('Walking home 🏙️'),
    T(90, 185, 540, '🏦 bank\n📚 bookstore\n🏥 hospital\n🌳 square', 40, '#2e2b2e', { lh: 1.55 }),
    T(650, 185, 560, '🥖 bakery\n🍽️ restaurant\n🛒 supermarket\n⛽ gas station', 40, '#2e2b2e', { lh: 1.55 }),
    T(70, 560, 1140, '💡 a bank · a bookstore · a hospital · a square · a bakery · a restaurant · a supermarket · a gas station', 26, '#8e6d86', { b: true })]));
  al.push(slide('cream', [tag('Mission 5 · Guess the place!'), ...alMission('Mission 5 🏙️'), title('What place is it? 🕵️'),
    alLines(180, ['1.  You buy bread and cake here. 🍞  →  ______________', '2.  You buy books here.  →  ______________', '3.  Doctors and nurses work here.  →  ______________', '4.  You put gas in the car here.  →  ______________', '5.  You keep your money here.  →  ______________', '6.  You buy fruit, milk and rice here.  →  ______________', '7.  You eat lunch here with your family.  →  ______________', '8.  There are trees and benches. You walk and play here.  →  ______'], 29, { lh: 1.6 })]));
  al.push(slide('rose', [tag('Mission 5 · The map 🗺️'), ...alMission('Mission 5 🏙️'), ...time('44–50 min'), title('Where is it? 🗺️'),
    ...alPlace(90, 175, '🏦', 'bank', '#ffffff'), ...alPlace(475, 175, '🥖', 'bakery', '#faefc2'), ...alPlace(860, 175, '📚', 'bookstore', '#ffffff'),
    R(70, 318, 1140, 60, '#9ea3a9', { shape: 'rect' }), T(70, 330, 1140, '— — —   Green Street   — — —', 26, '#ffffff', { b: true, al: 'center' }),
    ...alPlace(90, 392, '🏥', 'hospital', '#ffffff'), ...alPlace(475, 392, '🌳', 'square', '#d8ecd0'), ...alPlace(860, 392, '🛒', 'supermarket', '#ffffff'),
    T(70, 540, 1140, '1. Where’s the bakery?  2. What’s next to the hospital?\n3. Is the bank on Green Street?  4. Where’s the square?  5. Is the hospital next to the bank?', 26, '#2e2b2e', { b: true, lh: 1.5 })]));
  al.push(slide('cream', [tag('Mission 5 · Reading'), ...alMission('Mission 5 🏙️'), title('Bia and Leo walk home 🚶‍♀️🚶'),
    ...alBox(175, 260, 'After school, Bia and Leo walk home together. First, they see the bank on Green Street. The bakery is next to the bank. It smells delicious! “Yummy!” says Leo. Next to the bakery, there is a bookstore. Bia looks at the books in the window. “I like them!” she says. In the square, a little cat is under a bench. “It’s so beautiful!” says Bia.', 28),
    T(90, 455, 1100, '1. Where is the bank?\n2. What is next to the bank?\n3. What does Bia like?\n4. Where is the cat?', 28, '#8e6d86', { b: true, lh: 1.5 })]));

  // Final challenge, speaking, tips, answers
  al.push(slide('rose', [tag('Final challenge 🏆'), ...time('50–55 min'), title('8 questions = 8 points! 🏆'),
    alLines(180, ['1.  Write 76 in words.', '2.  How much ______ the shorts? (is / are)', '3.  I like this dress. I like ______.', '4.  These socks are ugly. I don’t like ______.', '5.  🐱 + 📦 (cat on top) →  The cat is ______ the box.', '6.  Doctors work here. → ______', '7.  Correct it:  “I have a T-shirt red.”', '8.  “Quanto custa o boné?” in English?'], 30, { lh: 1.6 })]));
  al.push(slide('cream', [tag('Speaking 🗣️'), title('Tell me about you!'),
    alLines(190, ['💬  What clothes do you like? What’s your favorite color?', '💬  Look at your clothes now. Do you like them?', '💬  What’s your favorite food? Is it yummy?', '💬  Is there a bakery or a supermarket near your house?', '💬  What’s next to your school?'], 32, { lh: 1.85 })]));
  al.push(slide('rose', [tag('Test tips 💡'), ...time('55–60 min'), title('Before the test'),
    alLines(185, ['✅  ONE thing → is / it / it’s  ·  plural → are / them / they’re', '✅  jeans, shorts, sneakers, socks, shoes are always plural.', '✅  Color first: a blue cap (not a cap blue).', '✅  forty (no U!) · 30 thirty ≠ 13 thirteen', '✅  on (em cima) · next to (ao lado) · under (embaixo)', '✅  Read the question twice. Look at the pictures! 👀'], 31)]));
  al.push(slide('cream', [tag('Answers (teacher)'), title('✅ Answers'),
    T(70, 175, 1140, 'M1:  a red T-shirt · a blue cap · black sneakers · a yellow dress · green socks\nM2:  37 thirty-seven · 54 fifty-four · 68 sixty-eight · 81 eighty-one · 100 one hundred · 73 · 96 · 58 · 44\nShop:  How much is the cap? It’s 41 dollars. · How much are the socks? They’re 30 dollars. · $100: e.g. T-shirt + socks ($62), or the sneakers ($98). Most expensive: the sneakers.\nit/them:  1 it · 2 them · 3 them · 4 it · 5 them · 6 it\nBedroom:  1 It’s on the bed. · 2 They’re under the bed. · 3 It’s next to the bed. · 4 It’s on the bed.\nPlaces:  1 bakery · 2 bookstore · 3 hospital · 4 gas station · 5 bank · 6 supermarket · 7 restaurant · 8 square\nMap:  1 next to the bank (between the bank and the bookstore), on Green Street · 2 the square · 3 Yes, it is. · 4 next to the hospital / next to the supermarket · 5 No, it isn’t. (It’s next to the square.)\nReading:  1 on Green Street · 2 the bakery · 3 the books · 4 under a bench (in the square)\nChallenge:  1 seventy-six · 2 are · 3 it · 4 them · 5 on · 6 hospital · 7 I have a red T-shirt. · 8 How much is the cap?', 22, '#2e2b2e', { lh: 1.5 })]));
  al.push(slide('dark', [tag('Mission complete!', true), title('You are ready, Alicia! 🌟', true),
    list(['✅  I can name clothes and say the price.', '✅  I can say I like it / I like them.', '✅  I can say where places are in the city.'], 220, 38, true),
    T(70, 560, 1140, 'Good luck on your test! 🍀 You are a shopping champion! 🏆🛍️', 32, '#faefc2')]));

  window.SLIDES_MODELOS = [
    { id: 'shopping-city-alicia', title: 'Test prep: Shopping + Walking Home — Alicia · 1 h', slides: al },
    { id: 'av2-review-ana', title: 'AV2 Review: Weather + Past Continuous — Ana Clara', slides: av },
    { id: 'debut-katseye', title: 'Debut (KATSEYE) — Aninha · 30 min', slides: db },
    { id: 'numbers-1-20-teles', title: 'Numbers 1–20 · Bunny Block World — Teles', slides: nb },
    { id: 'weather-report-video-ana', title: 'Weather Report (vídeo YouTube) — Ana Clara', slides: wx },
    { id: 'a-an-teles', title: 'A or AN? School Objects Game — Teles', slides: ag },
    { id: 'would-shall-heloize', title: 'Would & Shall (iniciante) — Heloize', slides: mv },
    { id: 'touch-katseye', title: 'Touch (KATSEYE) — 30 min', slides },
    { id: 'weather-guaratuba-s1', title: 'Weather Forecast — Guaratuba (Student 1)', slides: wf },
  ];
})();
