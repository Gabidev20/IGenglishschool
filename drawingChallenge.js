/* ==========================================================================
   IGenglishschool — Drawing Challenge (Live Class Tools)
   The teacher picks a theme, a gift box shakes, and out comes something
   for her AND the student to draw: "Draw a cat!" — or, in Silly mode,
   "Draw a cat wearing a hat!". Optional timer, then "Show your drawings!"
   with a few questions so the drawing turns into speaking practice.
   Rendered by LiveTools (liveTools.js), which hands in its sound kit.
   ========================================================================== */

// [en, pt (with article), emoji, plural?]
const DRAW_THEMES = [
  { id: 'animals', en: 'Animals', pt: 'Animais', emoji: '🐾', items: [
    ['cat', 'um gato', '🐱'], ['dog', 'um cachorro', '🐶'], ['elephant', 'um elefante', '🐘'], ['lion', 'um leão', '🦁'],
    ['fish', 'um peixe', '🐟'], ['bird', 'um pássaro', '🐦'], ['frog', 'um sapo', '🐸'], ['rabbit', 'um coelho', '🐰'],
    ['turtle', 'uma tartaruga', '🐢'], ['monkey', 'um macaco', '🐵'], ['horse', 'um cavalo', '🐴'], ['snake', 'uma cobra', '🐍'],
    ['butterfly', 'uma borboleta', '🦋'], ['penguin', 'um pinguim', '🐧'], ['giraffe', 'uma girafa', '🦒'], ['pig', 'um porco', '🐷']] },
  { id: 'food', en: 'Food', pt: 'Comida', emoji: '🍕', items: [
    ['pizza', 'uma pizza', '🍕'], ['apple', 'uma maçã', '🍎'], ['banana', 'uma banana', '🍌'], ['ice cream', 'um sorvete', '🍦'],
    ['cake', 'um bolo', '🍰'], ['sandwich', 'um sanduíche', '🥪'], ['hamburger', 'um hambúrguer', '🍔'],
    ['carrot', 'uma cenoura', '🥕'], ['watermelon', 'uma melancia', '🍉'], ['cookie', 'um biscoito', '🍪'],
    ['strawberry', 'um morango', '🍓'], ['egg', 'um ovo', '🥚'], ['hot dog', 'um cachorro-quente', '🌭'], ['donut', 'uma rosquinha', '🍩']] },
  { id: 'house', en: 'House', pt: 'Casa', emoji: '🏠', items: [
    ['house', 'uma casa', '🏠'], ['bed', 'uma cama', '🛏️'], ['chair', 'uma cadeira', '🪑'], ['lamp', 'um abajur', '💡'],
    ['sofa', 'um sofá', '🛋️'], ['door', 'uma porta', '🚪'], ['window', 'uma janela', '🪟'], ['clock', 'um relógio', '⏰'],
    ['TV', 'uma televisão', '📺'], ['bathtub', 'uma banheira', '🛁'], ['fridge', 'uma geladeira', '🧊'], ['teapot', 'um bule', '🫖']] },
  { id: 'school', en: 'School', pt: 'Escola', emoji: '✏️', items: [
    ['pencil', 'um lápis', '✏️'], ['book', 'um livro', '📕'], ['backpack', 'uma mochila', '🎒'], ['ruler', 'uma régua', '📏'],
    ['scissors', 'uma tesoura', '✂️', true], ['school bus', 'um ônibus escolar', '🚌'], ['computer', 'um computador', '💻'],
    ['crayon', 'um giz de cera', '🖍️'], ['teacher', 'uma professora', '👩‍🏫'], ['globe', 'um globo', '🌍'], ['paint brush', 'um pincel', '🖌️']] },
  { id: 'nature', en: 'Nature', pt: 'Natureza', emoji: '🌳', items: [
    ['tree', 'uma árvore', '🌳'], ['flower', 'uma flor', '🌸'], ['sun', 'um sol', '☀️'], ['cloud', 'uma nuvem', '☁️'],
    ['rainbow', 'um arco-íris', '🌈'], ['mountain', 'uma montanha', '⛰️'], ['moon', 'uma lua', '🌙'], ['star', 'uma estrela', '⭐'],
    ['leaf', 'uma folha', '🍃'], ['mushroom', 'um cogumelo', '🍄'], ['volcano', 'um vulcão', '🌋'], ['cactus', 'um cacto', '🌵']] },
  { id: 'clothes', en: 'Clothes', pt: 'Roupas', emoji: '👕', items: [
    ['T-shirt', 'uma camiseta', '👕'], ['dress', 'um vestido', '👗'], ['hat', 'um chapéu', '👒'], ['shoes', 'sapatos', '👟', true],
    ['socks', 'meias', '🧦', true], ['jacket', 'uma jaqueta', '🧥'], ['scarf', 'um cachecol', '🧣'], ['sunglasses', 'óculos escuros', '🕶️', true],
    ['boots', 'botas', '👢', true], ['cap', 'um boné', '🧢'], ['crown', 'uma coroa', '👑']] },
  { id: 'transport', en: 'Transport', pt: 'Transportes', emoji: '🚗', items: [
    ['car', 'um carro', '🚗'], ['bus', 'um ônibus', '🚌'], ['bike', 'uma bicicleta', '🚲'], ['train', 'um trem', '🚂'],
    ['airplane', 'um avião', '✈️'], ['boat', 'um barco', '⛵'], ['helicopter', 'um helicóptero', '🚁'], ['rocket', 'um foguete', '🚀'],
    ['truck', 'um caminhão', '🚚'], ['motorcycle', 'uma moto', '🏍️'], ['submarine', 'um submarino', '🛥️'], ['hot-air balloon', 'um balão', '🎈']] },
  { id: 'sea', en: 'Sea', pt: 'Mar', emoji: '🌊', items: [
    ['shark', 'um tubarão', '🦈'], ['octopus', 'um polvo', '🐙'], ['whale', 'uma baleia', '🐋'], ['crab', 'um caranguejo', '🦀'],
    ['starfish', 'uma estrela-do-mar', '⭐'], ['jellyfish', 'uma água-viva', '🪼'], ['dolphin', 'um golfinho', '🐬'],
    ['seahorse', 'um cavalo-marinho', '🐴'], ['treasure chest', 'um baú do tesouro', '💰'], ['shell', 'uma concha', '🐚']] },
  { id: 'toys', en: 'Toys', pt: 'Brinquedos', emoji: '🧸', items: [
    ['teddy bear', 'um ursinho', '🧸'], ['ball', 'uma bola', '⚽'], ['kite', 'uma pipa', '🪁'], ['doll', 'uma boneca', '🪆'],
    ['yo-yo', 'um ioiô', '🪀'], ['toy car', 'um carrinho', '🚗'], ['balloon', 'um balão', '🎈'], ['video game', 'um videogame', '🎮'],
    ['puzzle', 'um quebra-cabeça', '🧩'], ['drum', 'um tambor', '🥁']] },
  { id: 'pets', en: 'Pets', pt: 'Bichinhos de estimação', emoji: '🐶', items: [
    ['puppy', 'um cachorrinho', '🐶'], ['kitten', 'um gatinho', '🐱'], ['hamster', 'um hamster', '🐹'], ['goldfish', 'um peixinho dourado', '🐠'],
    ['parrot', 'um papagaio', '🦜'], ['rabbit', 'um coelho', '🐰'], ['turtle', 'uma tartaruga', '🐢'], ['dog house', 'uma casinha de cachorro', '🏠'],
    ['dog bone', 'um osso de cachorro', '🦴'], ['fish bowl', 'um aquário redondo', '🐟']] },
  { id: 'dinosaurs', en: 'Dinosaurs', pt: 'Dinossauros', emoji: '🦖', items: [
    ['dinosaur', 'um dinossauro', '🦖'], ['T. rex', 'um tiranossauro rex', '🦖'], ['long-neck dinosaur', 'um dinossauro pescoçudo', '🦕'],
    ['baby dinosaur', 'um dinossauro bebê', '🦖'], ['dinosaur egg', 'um ovo de dinossauro', '🥚'], ['footprint', 'uma pegada', '🐾'],
    ['volcano', 'um vulcão', '🌋'], ['bone', 'um osso', '🦴'], ['palm tree', 'uma palmeira', '🌴'], ['fossil', 'um fóssil', '🦴']] },
  { id: 'bugs', en: 'Bugs', pt: 'Insetos', emoji: '🐞', items: [
    ['ladybug', 'uma joaninha', '🐞'], ['bee', 'uma abelha', '🐝'], ['butterfly', 'uma borboleta', '🦋'], ['ant', 'uma formiga', '🐜'],
    ['spider', 'uma aranha', '🕷️'], ['snail', 'um caracol', '🐌'], ['caterpillar', 'uma lagarta', '🐛'], ['grasshopper', 'um gafanhoto', '🦗'],
    ['spider web', 'uma teia de aranha', '🕸️'], ['flower with a bee', 'uma flor com uma abelha', '🌻']] },
  { id: 'farm', en: 'Farm', pt: 'Fazenda', emoji: '🐄', items: [
    ['cow', 'uma vaca', '🐄'], ['sheep', 'uma ovelha', '🐑'], ['chicken', 'uma galinha', '🐔'], ['duck', 'um pato', '🦆'],
    ['goat', 'uma cabra', '🐐'], ['rooster', 'um galo', '🐓'], ['tractor', 'um trator', '🚜'], ['farmer', 'um fazendeiro', '🧑‍🌾'],
    ['corn', 'um milho', '🌽'], ['apple tree', 'uma macieira', '🌳']] },
  { id: 'space', en: 'Space', pt: 'Espaço', emoji: '🚀', items: [
    ['planet', 'um planeta', '🪐'], ['rocket', 'um foguete', '🚀'], ['star', 'uma estrela', '⭐'], ['moon', 'uma lua', '🌙'],
    ['sun', 'um sol', '☀️'], ['astronaut', 'um astronauta', '🧑‍🚀'], ['satellite', 'um satélite', '🛰️'], ['telescope', 'um telescópio', '🔭'],
    ['comet', 'um cometa', '☄️'], ['galaxy', 'uma galáxia', '🌌'], ['the Earth', 'a Terra', '🌍', true]] },
  { id: 'body', en: 'Body parts', pt: 'Partes do corpo', emoji: '🧍', items: [
    ['eye', 'um olho', '👁️'], ['nose', 'um nariz', '👃'], ['mouth', 'uma boca', '👄'], ['ear', 'uma orelha', '👂'],
    ['hand', 'uma mão', '✋'], ['foot', 'um pé', '🦶'], ['leg', 'uma perna', '🦵'], ['arm', 'um braço', '💪'],
    ['tooth', 'um dente', '🦷'], ['tongue', 'uma língua', '👅'], ['heart', 'um coração', '❤️'], ['brain', 'um cérebro', '🧠'], ['face', 'um rosto', '🙂']] },
  { id: 'feelings', en: 'Feelings', pt: 'Sentimentos', emoji: '😊', items: [
    ['happy face', 'um rosto feliz', '😊'], ['sad face', 'um rosto triste', '😢'], ['angry face', 'um rosto bravo', '😠'],
    ['surprised face', 'um rosto surpreso', '😮'], ['sleepy face', 'um rosto com sono', '😴'], ['scared face', 'um rosto assustado', '😨'],
    ['excited face', 'um rosto animado', '🤩'], ['silly face', 'um rosto bobo', '🤪']] },
  { id: 'fruits', en: 'Fruits & veggies', pt: 'Frutas e legumes', emoji: '🍓', items: [
    ['pineapple', 'um abacaxi', '🍍'], ['grapes', 'uvas', '🍇', true], ['orange', 'uma laranja', '🍊'], ['lemon', 'um limão', '🍋'],
    ['cherries', 'cerejas', '🍒', true], ['pear', 'uma pera', '🍐'], ['peach', 'um pêssego', '🍑'], ['tomato', 'um tomate', '🍅'],
    ['broccoli', 'um brócolis', '🥦'], ['potato', 'uma batata', '🥔'], ['corn', 'um milho', '🌽']] },
  { id: 'weather', en: 'Weather', pt: 'Tempo', emoji: '🌦️', items: [
    ['sun', 'um sol', '☀️'], ['cloud', 'uma nuvem', '☁️'], ['rain', 'chuva', '🌧️', true], ['rainbow', 'um arco-íris', '🌈'],
    ['snowman', 'um boneco de neve', '⛄'], ['lightning', 'um raio', '⚡'], ['umbrella', 'um guarda-chuva', '☂️'], ['tornado', 'um tornado', '🌪️'],
    ['snowflake', 'um floco de neve', '❄️'], ['thermometer', 'um termômetro', '🌡️']] },
  { id: 'sports', en: 'Sports', pt: 'Esportes', emoji: '⚽', items: [
    ['soccer ball', 'uma bola de futebol', '⚽'], ['basketball', 'uma bola de basquete', '🏀'], ['volleyball', 'uma bola de vôlei', '🏐'],
    ['tennis racket', 'uma raquete de tênis', '🎾'], ['trophy', 'um troféu', '🏆'], ['medal', 'uma medalha', '🏅'], ['skateboard', 'um skate', '🛹'],
    ['swimming pool', 'uma piscina', '🏊'], ['sneakers', 'tênis', '👟', true], ['goal', 'um gol', '🥅']] },
  { id: 'music', en: 'Music', pt: 'Música', emoji: '🎸', items: [
    ['guitar', 'um violão', '🎸'], ['drum', 'um tambor', '🥁'], ['piano', 'um piano', '🎹'], ['violin', 'um violino', '🎻'],
    ['trumpet', 'uma trombeta', '🎺'], ['microphone', 'um microfone', '🎤'], ['headphones', 'fones de ouvido', '🎧', true], ['music note', 'uma nota musical', '🎵'],
    ['saxophone', 'um saxofone', '🎷'], ['radio', 'um rádio', '📻']] },
  { id: 'jobs', en: 'Jobs', pt: 'Profissões', emoji: '🧑‍🚒', items: [
    ['doctor', 'um médico', '🧑‍⚕️'], ['firefighter', 'um bombeiro', '🧑‍🚒'], ['chef', 'um cozinheiro', '🧑‍🍳'], ['farmer', 'um fazendeiro', '🧑‍🌾'],
    ['pilot', 'um piloto', '🧑‍✈️'], ['painter', 'um pintor', '🧑‍🎨'], ['singer', 'um cantor', '🧑‍🎤'], ['builder', 'um construtor', '👷'],
    ['police officer', 'um policial', '👮'], ['scientist', 'um cientista', '🧑‍🔬'], ['astronaut', 'um astronauta', '🧑‍🚀']] },
];

// Kid favourites first; anything not listed keeps its place at the end.
const DRAW_ORDER = ['animals', 'pets', 'dinosaurs', 'bugs', 'farm', 'sea', 'space', 'body', 'feelings', 'food', 'fruits', 'house',
  'school', 'nature', 'weather', 'clothes', 'transport', 'sports', 'music', 'jobs', 'toys'];
DRAW_THEMES.sort((a, b) => {
  const ia = DRAW_ORDER.indexOf(a.id), ib = DRAW_ORDER.indexOf(b.id);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
});

// Silly mode adds one of these: "Draw a cat wearing a hat!"
const DRAW_TWISTS = [
  ['wearing a hat', 'usando um chapéu', '🎩'], ['with sunglasses', 'de óculos escuros', '🕶️'], ['on the moon', 'na lua', '🌙'],
  ['in the rain', 'na chuva', '🌧️'], ['eating ice cream', 'tomando sorvete', '🍦'], ['playing soccer', 'jogando futebol', '⚽'],
  ['sleeping', 'dormindo', '😴'], ['on a skateboard', 'andando de skate', '🛹'], ['at the beach', 'na praia', '🏖️'],
  ['with a cake', 'com um bolo', '🍰'], ['flying with balloons', 'voando com balões', '🎈'],
  ['under the sea', 'no fundo do mar', '🌊'], ['in a castle', 'num castelo', '🏰'], ['dancing', 'dançando', '💃'],
  ['with a crown', 'com uma coroa', '👑'], ['in space', 'no espaço', '🚀'], ['reading a book', 'lendo um livro', '📖'],
  ['on a rainbow', 'num arco-íris', '🌈'], ['in the snow', 'na neve', '❄️'], ['with a big smile', 'com um sorrisão', '😁'],
];

const DRAW_QUESTIONS = [
  'What did you draw?', 'What color is it?', 'Is it big or small?', 'Where is it?',
  'Do you like your drawing?', 'What is it doing?', 'Is it happy or sad?', 'Can you give it a name?',
];

function renderDrawingChallenge(container, kit) {
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => igEscapeHtml(String(s == null ? '' : s));
  const say = text => {
    if (!('speechSynthesis' in window)) return;
    try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85; window.speechSynthesis.speak(u); } catch (e) {}
  };

  // Course topics the teacher can draw from (the words of today's lesson).
  const solo = Boolean(kit && kit.solo);   // the student alone, on their own link
  const courseTopics = solo ? [] : (typeof LEVELS !== 'undefined' ? LEVELS : []).flatMap(level =>
    (level.topics || []).filter(t => (t.words || []).length).map(t => ({ key: `${level.id}:${t.id}`, label: `${level.code} · ${t.title}`, topic: t })));

  let themeId = IGStore.getRaw('draw_theme') || 'surprise';
  // A theme that no longer exists (e.g. one saved before it was removed) falls back to Surprise.
  if (themeId !== 'surprise' && !themeId.startsWith('course:') && !DRAW_THEMES.some(t => t.id === themeId)) themeId = 'surprise';
  let silly = IGStore.getRaw('draw_silly') === '1';
  let minutes = Number(IGStore.getRaw('draw_minutes') || 2);
  let challenge = null;          // { en, pt, emoji, twist }
  let revealing = false;
  let justRevealed = false;      // the pop-in plays once, not on every repaint
  let remaining = 0, running = false, finished = false, intervalId = null;
  let questions = [];
  const score = { teacher: 0, student: 0 };
  const decks = {};

  function itemsFor(id) {
    if (id === 'surprise') return DRAW_THEMES.flatMap(t => t.items.map(i => ({ en: i[0], pt: i[1], emoji: i[2], plural: Boolean(i[3]) })));
    if (id.startsWith('course:')) {
      const ct = courseTopics.find(c => c.key === id.slice(7));
      return ct ? ct.topic.words.filter(w => w.en).map(w => ({ en: w.en, pt: w.pt || '', emoji: w.emoji || '🖍️', image: w.image, course: true })) : [];
    }
    const th = DRAW_THEMES.find(t => t.id === id);
    return th ? th.items.map(i => ({ en: i[0], pt: i[1], emoji: i[2], plural: Boolean(i[3]) })) : [];
  }

  // A deck per theme, so nothing repeats until everything has come out once.
  function draw(id) {
    if (!decks[id] || !decks[id].length) decks[id] = shuffle(itemsFor(id));
    return decks[id].pop();
  }

  function sentence(c) {
    const art = c.plural || c.course ? '' : (/^[aeiou]/i.test(c.en) ? 'an ' : 'a ');
    return `Draw ${art}${c.en}${c.twist ? ' ' + c.twist[0] : ''}!`;
  }
  function sentencePt(c) {
    if (!c.pt) return '';
    return c.course ? `Desenhe: ${c.pt}${c.twist ? ' ' + c.twist[1] : ''}` : `Desenhe ${c.pt}${c.twist ? ' ' + c.twist[1] : ''}!`;
  }

  function stopTimer() { if (intervalId) clearInterval(intervalId); intervalId = null; running = false; }

  function surprise() {
    const item = draw(themeId);
    if (!item) return;
    stopTimer();
    finished = false;
    remaining = minutes * 60;
    challenge = { ...item, twist: silly ? shuffle(DRAW_TWISTS)[0] : null };
    revealing = true;
    paint();
    // drum roll, then the reveal
    IGSound.drumroll();
    kit.track(setTimeout(() => {
      revealing = false;
      justRevealed = true;
      IGSound.reveal();
      paint();
      const card = container.querySelector('.dc-card');
      if (card) { const r = card.getBoundingClientRect(); kit.confettiBurst(r.left + r.width / 2, r.top + 40); }
      say(sentence(challenge));
    }, 900));
  }

  function toggleTimer() {
    if (!challenge || minutes === 0) return;
    if (running) { stopTimer(); paint(); return; }
    if (remaining <= 0) remaining = minutes * 60;
    finished = false;
    running = true;
    say('Ready, steady, draw!');
    intervalId = kit.track(setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 0;
        stopTimer();
        finished = true;
        kit.playBell();
        questions = shuffle(DRAW_QUESTIONS).slice(0, 3);
        say("Time's up! Show your drawings!");
        paint();
        const card = container.querySelector('.dc-card');
        if (card) { const r = card.getBoundingClientRect(); kit.confettiBurst(r.left + r.width / 2, r.top + r.height / 2); }
        return;
      }
      if (remaining <= 5) kit.playTick();
      paintTimer();
    }, 1000));
    paint();
  }

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function ringHTML() {
    const total = minutes * 60 || 1;
    const frac = Math.max(0, Math.min(1, remaining / total));
    const C = 2 * Math.PI * 42;
    return `<svg class="dc-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" stroke-width="8"/>
      <circle class="dc-ring-bar" cx="50" cy="50" r="42" fill="none" stroke="${remaining <= 10 ? '#f05d77' : '#3fae8a'}" stroke-width="8"
              stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" transform="rotate(-90 50 50)"/>
      <text x="50" y="57" text-anchor="middle" class="dc-ring-text">${fmt(remaining)}</text>
    </svg>`;
  }
  function paintTimer() {
    const el = container.querySelector('.dc-timer-ring');
    if (el) el.innerHTML = ringHTML();
  }

  function cardHTML() {
    if (revealing) return `<div class="dc-card dc-mystery"><span class="dc-gift">🎁</span><p>…</p></div>`;
    if (!challenge) return `
      <div class="dc-card dc-empty">
        <span class="dc-gift dc-gift--idle">🎁</span>
        <p>Choose a theme and open the surprise!</p>
      </div>`;
    const c = challenge;
    const pic = c.image && igLooksLikeImageUrl(c.image)
      ? `<img class="dc-pic-img" src="${esc(c.image)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${esc(c.emoji)}'}))"/>`
      : `<span>${esc(c.emoji)}</span>`;
    return `
      <div class="dc-card${justRevealed ? ' dc-reveal' : ''}">
        <div class="dc-pic">${pic}${c.twist ? `<span class="dc-plus">+</span><span>${esc(c.twist[2])}</span>` : ''}</div>
        <button class="dc-sentence" data-action="say">🔊 ${esc(sentence(c))}</button>
        ${sentencePt(c) ? `<p class="dc-pt">${esc(sentencePt(c))}</p>` : ''}
        ${minutes ? `
          <div class="dc-timer">
            <div class="dc-timer-ring">${ringHTML()}</div>
            <div class="dc-timer-btns">
              <button class="game-btn" data-action="timer">${running ? '⏸ Pause' : finished ? '🔄 Again' : '▶ Start drawing!'}</button>
            </div>
          </div>` : ''}
        ${finished ? `
          <div class="dc-show">
            <p class="dc-show-title">⏰ Time's up! Show your drawings! 🖼️</p>
            <div class="dc-questions">
              ${questions.map(q => `<button class="dc-q" data-q="${esc(q)}">🔊 ${esc(q)}</button>`).join('')}
            </div>
          </div>` : ''}
      </div>`;
  }

  function paint() {
    const themeBtn = (id, emoji, en, pt) => `
      <button class="dc-theme${themeId === id ? ' active' : ''}" data-theme="${id}">
        <span class="dc-theme-emoji">${emoji}</span><b>${esc(en)}</b><small>${esc(pt)}</small>
      </button>`;
    const courseSel = themeId.startsWith('course:') ? themeId.slice(7) : '';
    container.innerHTML = `
      <div class="dc">
        <div class="dc-setup">
          <p class="dc-label">1 · Tema</p>
          <div class="dc-themes">
            ${themeBtn('surprise', '🎲', 'Surprise!', 'Qualquer tema')}
            ${DRAW_THEMES.map(t => themeBtn(t.id, t.emoji, t.en, t.pt)).join('')}
          </div>
          ${courseTopics.length ? `
            <label class="dc-course${courseSel ? ' active' : ''}">📚 Ou um tópico do curso:
              <select data-course>
                <option value="">— escolher —</option>
                ${courseTopics.map(c => `<option value="${esc(c.key)}"${c.key === courseSel ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}
              </select>
            </label>` : ''}
          <div class="dc-options">
            <div>
              <p class="dc-label">2 · Estilo</p>
              <div class="bp-modes">
                <button class="bp-mode${!silly ? ' active' : ''}" data-silly="0">🙂 Easy</button>
                <button class="bp-mode${silly ? ' active' : ''}" data-silly="1">🤪 Silly</button>
              </div>
            </div>
            <div>
              <p class="dc-label">3 · Tempo</p>
              <div class="dc-minutes">
                ${[1, 2, 3, 5, 0].map(m => `<button class="dc-min${minutes === m ? ' active' : ''}" data-min="${m}">${m ? m + ' min' : '∞'}</button>`).join('')}
              </div>
            </div>
          </div>
          <button class="btn btn-primary dc-go" data-action="go" ${revealing ? 'disabled' : ''}>🎁 ${challenge ? 'Another surprise!' : 'Surprise drawing!'}</button>
        </div>

        <div class="dc-main">
          ${cardHTML()}
          ${solo ? `
          <p class="dc-solo-tip">🖍️ Draw on paper, then show your drawing to your teacher or your family! <small>Desenhe no papel e mostre para a sua teacher ou para a família.</small></p>` : `
          <div class="dc-score">
            <span class="dc-score-label">⭐ Best drawing</span>
            <button class="dc-score-btn" data-score="teacher">👩‍🏫 Teacher <b>${score.teacher}</b></button>
            <button class="dc-score-btn" data-score="student">🧒 Student <b>${score.student}</b></button>
          </div>`}
        </div>
      </div>`;
    justRevealed = false;
    bind();
  }

  function bind() {
    container.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => {
      themeId = b.dataset.theme;
      IGStore.setRaw('draw_theme', themeId);
      paint();
    }));
    const course = container.querySelector('[data-course]');
    if (course) course.addEventListener('change', () => {
      themeId = course.value ? `course:${course.value}` : 'surprise';
      IGStore.setRaw('draw_theme', themeId);
      paint();
    });
    container.querySelectorAll('[data-silly]').forEach(b => b.addEventListener('click', () => {
      silly = b.dataset.silly === '1';
      IGStore.setRaw('draw_silly', silly ? '1' : '0');
      paint();
    }));
    container.querySelectorAll('[data-min]').forEach(b => b.addEventListener('click', () => {
      minutes = Number(b.dataset.min);
      IGStore.setRaw('draw_minutes', String(minutes));
      stopTimer();
      finished = false;
      remaining = minutes * 60;
      paint();
    }));
    const go = container.querySelector('[data-action="go"]');
    if (go) go.addEventListener('click', surprise);
    const sayBtn = container.querySelector('[data-action="say"]');
    if (sayBtn) sayBtn.addEventListener('click', () => say(sentence(challenge)));
    const timer = container.querySelector('[data-action="timer"]');
    if (timer) timer.addEventListener('click', () => {
      if (finished) { finished = false; remaining = minutes * 60; }
      toggleTimer();
    });
    container.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => say(b.dataset.q)));
    container.querySelectorAll('[data-score]').forEach(b => b.addEventListener('click', () => {
      score[b.dataset.score]++;
      IGSound.stars(1);
      paint();
    }));
  }

  // The theme saved last time may be a course topic that no longer exists.
  if (themeId.startsWith('course:') && !itemsFor(themeId).length) themeId = 'surprise';
  if (themeId !== 'surprise' && !themeId.startsWith('course:') && !DRAW_THEMES.some(t => t.id === themeId)) themeId = 'surprise';
  paint();
}
