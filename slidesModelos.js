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

  window.SLIDES_MODELOS = [{ id: 'touch-katseye', title: 'Touch (KATSEYE) — 30 min', slides }];
})();
