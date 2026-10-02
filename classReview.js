/* ==========================================================================
   IGenglishschool — Class Review
   After a class, the teacher opens "🧠 Class review" and gets flashcards
   built from what she logged for it: the new words on the class sheet, the
   course topic worked on, and any known vocabulary her notes mention. Each
   card has a picture and two very simple sentences the child can say.
   Everything is editable, and the child sees it on their own page.

   Stored per student under `review_<studentId>` as { sessionId: review },
   so it syncs with the rest of the teacher's data and reaches the student's
   link (see supabase-share.sql).
   ========================================================================== */

const reviewKey = sid => `review_${sid}`;
function loadReviews(studentId) {
  const map = IGStore.getJSON(reviewKey(studentId), {});
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}
function saveReview(studentId, review) {
  const map = loadReviews(studentId);
  map[review.sessionId] = review;
  IGStore.setJSON(reviewKey(studentId), map);
}
// The review the child should see: the most recent class that has one.
function latestReview(studentId) {
  return Object.values(loadReviews(studentId))
    .filter(r => r && Array.isArray(r.cards) && r.cards.length)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;
}

// ---------------------------------------------------------------------------
// VOCABULARY — every word the site already has a picture for: the course
// topics, the ready-made games and the drawing themes.
// ---------------------------------------------------------------------------
let reviewVocabCache = null;
const rvNorm = s => String(s || '').toLowerCase().replace(/[“”"!?.,;:()]/g, '').replace(/\s+/g, ' ').trim()
  .replace(/^(a|an|the|to|my)\s+/, '');

function reviewVocab() {
  if (reviewVocabCache) return reviewVocabCache;
  const map = new Map();
  const add = (w, pt, image, emoji) => {
    if (!w) return;
    const entry = { en: w, pt: pt || '', image: image || '', emoji: emoji || '' };
    const keys = [rvNorm(w)];
    const m = /\bis for (.+)$/i.exec(w);          // "A is for Apple" → apple
    if (m) keys.push(rvNorm(m[1]));
    keys.forEach(k => {
      if (!k) return;
      const cur = map.get(k);
      if (!cur || (!cur.image && entry.image)) map.set(k, entry);
    });
  };
  const fromTopic = t => (t && t.words || []).forEach(w => add(w.en, w.pt, w.image && igLooksLikeImageUrl(w.image) ? w.image : '', w.emoji));
  (typeof LEVELS !== 'undefined' ? LEVELS : []).forEach(l => (l.topics || []).forEach(fromTopic));
  // The ready-made games' word banks (each file may or may not be loaded).
  [typeof SCHOOL_OBJECTS_TOPIC !== 'undefined' && SCHOOL_OBJECTS_TOPIC,
   typeof HOUSE_TOPIC !== 'undefined' && HOUSE_TOPIC,
   typeof ANIMALS_TOPIC !== 'undefined' && ANIMALS_TOPIC,
   typeof FEELINGS_TOPIC !== 'undefined' && FEELINGS_TOPIC,
   typeof INSTRUMENTS_TOPIC !== 'undefined' && INSTRUMENTS_TOPIC,
   typeof WEATHER_TOPIC !== 'undefined' && WEATHER_TOPIC].filter(Boolean).forEach(fromTopic);
  if (typeof DRAW_THEMES !== 'undefined') {
    DRAW_THEMES.forEach(t => t.items.forEach(i => add(i[0], String(i[1]).replace(/^(um|uma)\s+/, ''), '', i[2])));
  }
  reviewVocabCache = map;
  return map;
}

// Everyday words the games don't draw, so a card still gets a picture.
const RV_EMOJI = {
  umbrella: '☂️', water: '💧', milk: '🥛', juice: '🧃', bread: '🍞', cheese: '🧀', rice: '🍚', soup: '🍲', chocolate: '🍫',
  candy: '🍬', grapes: '🍇', lemon: '🍋', pear: '🍐', cherry: '🍒', tomato: '🍅', potato: '🥔', corn: '🌽',
  chicken: '🐔', cow: '🐮', sheep: '🐑', duck: '🦆', bee: '🐝', spider: '🕷️', mouse: '🐭', bear: '🐻', fox: '🦊', owl: '🦉',
  zebra: '🦓', kangaroo: '🦘', camel: '🐫', bat: '🦇', ant: '🐜', snail: '🐌', whale: '🐋',
  phone: '📱', camera: '📷', key: '🔑', gift: '🎁', letter: '✉️', money: '💰', bag: '👜', glasses: '👓', watch: '⌚',
  hand: '✋', foot: '🦶', eye: '👁️', ear: '👂', nose: '👃', mouth: '👄', tooth: '🦷', teeth: '🦷', heart: '❤️',
  boy: '👦', girl: '👧', man: '👨', woman: '👩', baby: '👶', friend: '🧑‍🤝‍🧑', doctor: '🧑‍⚕️', police: '👮', firefighter: '🧑‍🚒',
  hospital: '🏥', school: '🏫', park: '🏞️', beach: '🏖️', zoo: '🦁', city: '🏙️', farm: '🚜', store: '🏪', shop: '🏪',
  run: '🏃', swim: '🏊', jump: '🦘', sing: '🎤', dance: '💃', read: '📖', write: '✍️', sleep: '😴', eat: '🍽️', drink: '🥤',
  play: '🎲', walk: '🚶', fly: '🕊️', climb: '🧗', ride: '🚴', paint: '🎨', draw: '✏️', listen: '👂', talk: '💬',
  big: '🐘', small: '🐭', hot: '🔥', cold: '🥶', fast: '🏎️', slow: '🐢', love: '❤️', yes: '👍', no: '👎',
  morning: '🌅', night: '🌙', afternoon: '🌤️', today: '📅', week: '🗓️', birthday: '🎂', party: '🎉', christmas: '🎄', halloween: '🎃', easter: '🐣',
  soccer: '⚽', football: '🏈', basketball: '🏀', tennis: '🎾', music: '🎵', song: '🎶', movie: '🎬', game: '🎮', toy: '🧸',
  circle: '⚪', square: '🟥', triangle: '🔺', star: '⭐', diamond: '🔷',
  'look forward to': '🤗', hello: '👋', goodbye: '👋', please: '🙏', 'thank you': '🙏', sorry: '😔',
};

function reviewLookup(word) {
  const v = reviewVocab();
  const k = rvNorm(word);
  if (!k) return null;
  const hit = v.get(k) || v.get(k.replace(/(es|s)$/, '')) || v.get(`${k}s`);
  if (hit) return hit;
  const emoji = RV_EMOJI[k] || RV_EMOJI[k.replace(/(es|s)$/, '')];
  return emoji ? { en: word, pt: '', image: '', emoji } : null;
}

// ---------------------------------------------------------------------------
// SENTENCES — two short, sayable sentences per word.
// ---------------------------------------------------------------------------
const RV_SETS = {
  feeling: ['happy', 'sad', 'angry', 'tired', 'surprised', 'sleepy', 'sick', 'hungry', 'scared', 'thirsty', 'bored', 'excited'],
  weather: ['sunny', 'rainy', 'cloudy', 'snowy', 'stormy', 'windy', 'hot', 'cold', 'foggy'],
  color: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown', 'grey', 'gray'],
  family: ['mother', 'father', 'mom', 'dad', 'mum', 'sister', 'brother', 'grandma', 'grandpa', 'grandmother', 'grandfather', 'baby', 'aunt', 'uncle', 'cousin', 'family'],
  number: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
  place: ['bedroom', 'bathroom', 'kitchen', 'living room', 'dining room', 'yard', 'garden', 'school', 'park', 'beach', 'zoo'],
};

function reviewSentences(word) {
  const w = String(word || '').trim();
  const lw = /^[A-Z][a-z]/.test(w) && !/^[A-Z]{2}/.test(w) ? w.toLowerCase() : w;
  const k = rvNorm(w);
  const art = /^[aeiou]/i.test(lw) ? 'an' : 'a';
  const is = set => RV_SETS[set].includes(k);
  if (is('feeling')) return [`I'm ${k}.`, `Are you ${k}?`];
  if (is('weather')) return [`It's ${k} today.`, `Is it ${k}?`];
  if (is('color')) return [`It's ${k}.`, `My favorite color is ${k}.`];
  if (is('family')) return [`This is my ${k}.`, `I love my ${k}.`];
  if (is('number')) return [`${k[0].toUpperCase()}${k.slice(1)}!`, `I can see ${k} stars.`];
  if (is('place')) return [`This is the ${k}.`, `I'm in the ${k}.`];
  // An expression or a verb ("to look forward to", "brush my teeth"): no
  // template fits, so the sentence is the expression itself, to repeat.
  if (/^to\s/i.test(w) || k.split(' ').length >= 3 || (/\s/.test(k) && !reviewLookup(w))) {
    return [`${lw.charAt(0).toUpperCase()}${lw.slice(1)}.`];
  }
  if (/s$/.test(k) && !/ss$/.test(k)) return [`These are ${lw}.`, `I like ${lw}.`];
  return [`This is ${art} ${lw}.`, `I can see ${art} ${lw}.`];
}

// ---------------------------------------------------------------------------
// GENERATION — from the class log to a deck of cards.
// ---------------------------------------------------------------------------
const RV_MAX = 10;

// Words the notes are full of that are not vocabulary to review.
const RV_STOP = new Set(('was were is are am be been the and but very bit lot today yesterday tomorrow ' +
  'good great well better best like liked loved love did does do have has had this that these those ' +
  'it he she they we you his her our their your can could will would not yes no more less time class ' +
  'lesson word words again also still some any all with from for about into when then than there here ' +
  'what who how why where which one two please thank sorry hello goodbye').split(' '));

// "Cat" from a word bank reads better as "cat" on a card ("TV" stays "TV").
const rvTidy = w => (/^[A-Z][a-z]/.test(w) ? w.toLowerCase() : w);
let rvIdSeq = 0;
const rvId = () => `rc${Date.now().toString(36)}${(rvIdSeq++).toString(36)}`;

function reviewCard(en, extra) {
  const hit = reviewLookup(en);
  return {
    id: rvId(),
    en: String(en).trim(),
    pt: (extra && extra.pt) || (hit && hit.pt) || '',
    image: (hit && hit.image) || '',
    emoji: (hit && hit.emoji) || '',
    pron: (extra && extra.pron) || '',
    sentences: reviewSentences(en),
  };
}

function generateReview(session) {
  const cards = [];
  const seen = new Set();
  const push = (en, extra) => {
    const k = rvNorm(en);
    if (!k || seen.has(k) || cards.length >= RV_MAX) return;
    seen.add(k);
    cards.push(reviewCard(en, extra));
  };

  // 1. The new words written on the class sheet.
  ((session.sheet && session.sheet.words) || []).forEach(w => push(w.word, { pron: w.pron }));

  const label = String(session.topicLabel || '');

  // 2. Known words her notes mention ("practiced animals: cat, dog"), in
  //    the order she wrote them.
  const notes = ` ${rvNorm(`${session.notes || ''} ${label}`).replace(/[^a-z\s'-]/g, ' ')} `;
  [...reviewVocab().keys()]
    .filter(k => k.length >= 3 && !RV_STOP.has(k) && notes.includes(` ${k} `))
    .sort((a, b) => notes.indexOf(` ${a} `) - notes.indexOf(` ${b} `))
    .forEach(k => push(rvTidy(reviewVocab().get(k).en.replace(/^.*\bis for /i, ''))));

  // 3. The course topic(s) worked on ("A0 · Colors & Shapes + revisão")
  //    fill whatever room is left.
  const parts = label.split(/\s*\+\s*/).map(p => p.trim()).filter(Boolean);
  (typeof LEVELS !== 'undefined' ? LEVELS : []).forEach(level => (level.topics || []).forEach(t => {
    const names = [`${level.code} · ${t.title}`, t.title].map(x => x.toLowerCase());
    if (parts.some(p => names.includes(p.toLowerCase()))) {
      (t.words || []).forEach(w => {
        const m = /\bis for (.+)$/i.exec(w.en || '');
        push(rvTidy(m ? m[1] : w.en), { pt: w.pt });
      });
    }
  }));

  return {
    sessionId: session.id,
    date: session.date,
    title: label || 'My last class',
    cards,
    updatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// The picture of a card: an uploaded/linked image, else its emoji.
// ---------------------------------------------------------------------------
function reviewPicHTML(card, cls) {
  if (card.image && igLooksLikeImageUrl(card.image)) {
    return `<span class="${cls}"><img src="${igEscapeHtml(card.image)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${igEscapeHtml(card.emoji || '🖼️')}'}))"/></span>`;
  }
  return `<span class="${cls} rv-emoji">${igEscapeHtml(card.emoji || '🖼️')}</span>`;
}

function rvSay(text) {
  if (!('speechSynthesis' in window)) return;
  try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.82; window.speechSynthesis.speak(u); } catch (e) {}
}

// ---------------------------------------------------------------------------
// PLAYER — the child's flashcards. Tap the card to turn it over: on the
// back, the meaning and the sentences to say, each with 🔊.
// ---------------------------------------------------------------------------
function openClassReviewPlayer(review, opts) {
  const o = opts || {};
  const cards = review.cards;
  let index = 0;
  let flipped = false;
  const said = new Set();
  let done = false;

  function paint() {
    const body = document.getElementById('rvPlayer');
    if (!body) return;
    if (done) {
      body.innerHTML = `
        <div class="rv-done">
          <span class="rv-done-emoji">🎉</span>
          <p class="rv-done-title">Great review!</p>
          <p class="rv-done-sub">${said.size} / ${cards.length} ✅</p>
          <div class="an-done-actions">
            <button class="game-btn secondary" data-rv="again">🔄 Again</button>
            ${o.onBack ? `<button class="game-btn" data-rv="back">✏️ Voltar à edição</button>` : ''}
          </div>
        </div>`;
      body.querySelector('[data-rv="again"]').addEventListener('click', () => { index = 0; flipped = false; done = false; said.clear(); paint(); });
      const back = body.querySelector('[data-rv="back"]');
      if (back) back.addEventListener('click', o.onBack);
      return;
    }
    const c = cards[index];
    body.innerHTML = `
      <div class="rv-progress">${cards.map((x, i) => `<i class="${i === index ? 'on' : ''}${said.has(x.id) ? ' ok' : ''}"></i>`).join('')}</div>
      <div class="rv-card${flipped ? ' flipped' : ''}" data-rv="flip" role="button" tabindex="0" aria-label="Turn the card">
        <div class="rv-face rv-front">
          ${reviewPicHTML(c, 'rv-pic')}
          <p class="rv-word">${igEscapeHtml(c.en)}</p>
          <p class="rv-tap">👆 Tap to turn</p>
        </div>
        <div class="rv-face rv-back">
          ${reviewPicHTML(c, 'rv-pic rv-pic--small')}
          <p class="rv-word rv-word--small">${igEscapeHtml(c.en)}</p>
          ${c.pt ? `<p class="rv-pt">${igEscapeHtml(c.pt)}</p>` : ''}
          ${c.pron ? `<p class="rv-pron">🗣️ ${igEscapeHtml(c.pron)}</p>` : ''}
          <div class="rv-sentences">
            ${(c.sentences || []).filter(Boolean).map((s, i) => `<button class="rv-sentence" data-say="${i}">🔊 ${igEscapeHtml(s)}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="rv-actions">
        <button class="game-btn secondary" data-rv="prev" ${index === 0 ? 'disabled' : ''}>◀</button>
        <button class="game-btn secondary" data-rv="word">🔊 ${igEscapeHtml(c.en)}</button>
        <button class="game-btn${said.has(c.id) ? ' secondary' : ''}" data-rv="said">${said.has(c.id) ? '✅ Done!' : '🗣️ I said it!'}</button>
        <button class="game-btn secondary" data-rv="next">${index === cards.length - 1 ? '🏁' : '▶'}</button>
      </div>`;
    const card = body.querySelector('[data-rv="flip"]');
    const flip = () => { flipped = !flipped; IGSound.flip(); card.classList.toggle('flipped', flipped); if (flipped && c.sentences && c.sentences[0]) rvSay(c.sentences[0]); };
    card.addEventListener('click', e => { if (e.target.closest('[data-say]')) return; flip(); });
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    body.querySelectorAll('[data-say]').forEach(b => b.addEventListener('click', () => rvSay(c.sentences[Number(b.dataset.say)])));
    body.querySelector('[data-rv="word"]').addEventListener('click', () => rvSay(c.en));
    body.querySelector('[data-rv="said"]').addEventListener('click', () => {
      if (!said.has(c.id)) { said.add(c.id); IGSound.correct(); }
      paint();
    });
    body.querySelector('[data-rv="prev"]').addEventListener('click', () => { if (index > 0) { index--; flipped = false; IGSound.flip(); paint(); } });
    body.querySelector('[data-rv="next"]').addEventListener('click', () => {
      if (index < cards.length - 1) { index++; flipped = false; IGSound.flip(); paint(); rvSay(cards[index].en); return; }
      done = true;
      IGSound.win();
      if (!o.preview && typeof awardProgress === 'function') awardProgress(5 + said.size * 2, said.size >= Math.ceil(cards.length / 2) ? 1 : 0);
      paint();
    });
  }

  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">🧠</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Class review</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">${igEscapeHtml(review.title || '')}${review.date ? ` · ${new Date(review.date + 'T12:00').toLocaleDateString('pt-BR')}` : ''}</span></p>
        </div>
      </div>
      ${o.preview ? `<p class="rv-preview-note">👀 Pré-visualização — é assim que o aluno vê. <button class="rv-link" data-rv="edit">✏️ Voltar à edição</button></p>` : ''}
      <div id="rvPlayer"></div>
    </div>`, true);
  const edit = document.querySelector('[data-rv="edit"]');
  if (edit && o.onBack) edit.addEventListener('click', o.onBack);
  paint();
  rvSay(cards[0] ? cards[0].en : '');
}

// ---------------------------------------------------------------------------
// EDITOR — the teacher's side. Opens on a class (session); generates the
// deck the first time, then everything she changes is saved as she types.
// ---------------------------------------------------------------------------
function openClassReviewEditor(student, session) {
  let review = loadReviews(student.id)[session.id];
  const isNew = !review;
  if (!review) { review = generateReview(session); saveReview(student.id, review); }
  let saveTimer = null;

  function save(now) {
    review.updatedAt = Date.now();
    clearTimeout(saveTimer);
    const write = () => {
      saveReview(student.id, review);
      const st = document.getElementById('rvSaved');
      if (st) { st.textContent = '✅ Salvo'; st.classList.add('flash'); setTimeout(() => st && st.classList.remove('flash'), 600); }
    };
    if (now) write(); else saveTimer = setTimeout(write, 350);
  }

  const notesHTML = () => {
    const words = (session.sheet && session.sheet.words) || [];
    return `
      <details class="rv-notes"${isNew ? ' open' : ''}>
        <summary>📝 Suas anotações desta aula</summary>
        <p><b>In class:</b> ${igEscapeHtml(session.topicLabel || '—')}</p>
        ${words.length ? `<p><b>New words:</b> ${words.map(w => igEscapeHtml(w.word + (w.pron ? ` (${w.pron})` : ''))).join(', ')}</p>` : ''}
        ${session.notes ? `<p><b>Notes:</b> ${igEscapeHtml(session.notes)}</p>` : ''}
      </details>`;
  };

  function cardEditorHTML(c, i) {
    const hit = !c.image && !c.emoji ? reviewLookup(c.en) : null;
    return `
      <div class="rv-edit-card" data-card="${c.id}">
        <div class="rv-edit-pic">
          ${reviewPicHTML(c, 'rv-pic rv-pic--edit')}
          <input type="text" data-field="pic" placeholder="${/^data:/.test(c.image || '') ? 'desenho do site' : 'emoji ou link'}"
                 value="${igEscapeHtml(/^data:/.test(c.image || '') ? '' : (c.image || c.emoji || ''))}" aria-label="Imagem: emoji ou link de imagem"/>
          ${hit ? `<button class="rv-link" data-suggest>usar sugerida</button>` : ''}
        </div>
        <div class="rv-edit-fields">
          <div class="rv-edit-row">
            <span class="rv-edit-no">${i + 1}</span>
            <input type="text" data-field="en" placeholder="word / expression" value="${igEscapeHtml(c.en)}" aria-label="Palavra em inglês"/>
            <input type="text" data-field="pt" placeholder="tradução" value="${igEscapeHtml(c.pt || '')}" aria-label="Tradução"/>
            <button class="sheet-row-del" data-del title="Apagar card" aria-label="Apagar card">🗑️</button>
          </div>
          <textarea data-field="sentences" rows="2" placeholder="Uma frase por linha — ex.: This is a cat." aria-label="Frases">${igEscapeHtml((c.sentences || []).join('\n'))}</textarea>
          <div class="rv-edit-tools">
            <button class="rv-link" data-resentences>✨ sugerir frases</button>
            ${c.pron ? `<span class="rv-edit-pron">🗣️ ${igEscapeHtml(c.pron)}</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  function paint() {
    const host = document.getElementById('rvEditor');
    if (!host) return;
    host.innerHTML = `
      ${notesHTML()}
      <div class="rv-edit-head">
        <label class="rv-title-field">Título <input type="text" id="rvTitle" value="${igEscapeHtml(review.title || '')}"/></label>
        <span class="rv-saved" id="rvSaved">✅ Salvo</span>
      </div>
      ${review.cards.length ? '' : `<p class="rv-empty">Nenhuma palavra encontrada nas anotações desta aula. Adicione os cards abaixo — ou anote as <b>new words</b> na ficha da aula e gere de novo.</p>`}
      <div class="rv-edit-list">${review.cards.map(cardEditorHTML).join('')}</div>
      <div class="rv-edit-add">
        <input type="text" id="rvNewWord" placeholder="Nova palavra (ex.: banana)"/>
        <button class="game-btn secondary" id="rvAdd">➕ Adicionar card</button>
      </div>
      <div class="rv-edit-actions">
        <button class="game-btn secondary" id="rvRegen">✨ Gerar de novo das anotações</button>
        <button class="game-btn" id="rvPreview" ${review.cards.length ? '' : 'disabled'}>▶ Ver como o aluno</button>
      </div>
      <p class="rv-share-note">👧 O aluno vê esta revisão no link dele, em <b>🧠 Revisão da aula</b>.</p>`;
    bind(host);
  }

  function bind(host) {
    host.querySelector('#rvTitle').addEventListener('input', e => { review.title = e.target.value; save(); });
    host.querySelectorAll('.rv-edit-card').forEach(row => {
      const card = review.cards.find(c => c.id === row.dataset.card);
      row.querySelectorAll('[data-field]').forEach(input => {
        input.addEventListener('input', () => {
          const f = input.dataset.field;
          if (f === 'sentences') card.sentences = input.value.split('\n').map(s => s.trim()).filter(Boolean);
          else if (f === 'pic') {
            const v = input.value.trim();
            if (igLooksLikeImageUrl(v)) { card.image = v; } else { card.image = ''; card.emoji = v; }
            const pic = row.querySelector('.rv-pic');
            if (pic) pic.outerHTML = reviewPicHTML(card, 'rv-pic rv-pic--edit');
          } else card[f] = input.value;
          save();
        });
      });
      // A new word typed in: fill in its picture and translation if we know it.
      row.querySelector('[data-field="en"]').addEventListener('change', () => {
        const hit = reviewLookup(card.en);
        let changed = false;
        if (hit && !card.image && !card.emoji) { card.image = hit.image; card.emoji = hit.emoji; changed = true; }
        if (hit && !card.pt) { card.pt = hit.pt; changed = true; }
        if (changed) { save(true); paint(); }
      });
      const sug = row.querySelector('[data-suggest]');
      if (sug) sug.addEventListener('click', () => {
        const hit = reviewLookup(card.en);
        if (hit) { card.image = hit.image; card.emoji = hit.emoji; save(true); paint(); }
      });
      row.querySelector('[data-resentences]').addEventListener('click', () => {
        card.sentences = reviewSentences(card.en);
        save(true); paint();
      });
      row.querySelector('[data-del]').addEventListener('click', () => {
        review.cards = review.cards.filter(c => c !== card);
        save(true); paint();
      });
    });
    const addInput = host.querySelector('#rvNewWord');
    const add = () => {
      const w = addInput.value.trim();
      if (!w) { addInput.focus(); return; }
      review.cards.push(reviewCard(w));
      save(true); paint();
      const again = document.getElementById('rvNewWord');
      if (again) again.focus();
    };
    host.querySelector('#rvAdd').addEventListener('click', add);
    addInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    host.querySelector('#rvRegen').addEventListener('click', () => {
      if (review.cards.length && !confirm('Gerar os cards de novo a partir das anotações? As suas edições nesta revisão serão substituídas.')) return;
      const fresh = generateReview(session);
      review.cards = fresh.cards;
      if (!review.title) review.title = fresh.title;
      save(true); paint();
    });
    host.querySelector('#rvPreview').addEventListener('click', () => {
      save(true);
      openClassReviewPlayer(review, { preview: true, onBack: () => openClassReviewEditor(student, session) });
    });
  }

  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">🧠</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Class review — ${igEscapeHtml(student.name)}</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">Aula de ${new Date(session.date + 'T12:00').toLocaleDateString('pt-BR')}${session.sheet && session.sheet.classNumber ? ` · Class ${session.sheet.classNumber}` : ''}</span></p>
        </div>
      </div>
      <div id="rvEditor"></div>
    </div>`, true);
  paint();
}

// The cockpit button: the active student's most recent class.
function openLatestClassReview() {
  const student = typeof getActiveStudent === 'function' ? getActiveStudent() : null;
  if (!student) { alert('Escolha o aluno no topo da página primeiro.'); return; }
  const sessions = loadSessions(student.id).filter(s => s.present !== false);
  const last = sessions.sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.createdAt || 0) - (a.createdAt || 0))[0];
  if (!last) { alert(`Ainda não há aula registrada para ${student.name}. Registre a aula em "📋 Today's Class" e depois gere a revisão.`); return; }
  openClassReviewEditor(student, last);
}
