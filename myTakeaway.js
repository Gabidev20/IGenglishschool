/* ==========================================================================
   IGenglishschool — 🧠 My takeaway (on the student's link)

   One place to review what each class left, newest class first:
     • from the teacher — the class sheet of Today's Class: new words, the
       pronunciation column (with the phonetics) and the phrases / texts.
       They reach the link already, in the student's `student_access`
       record (`classes`, built by speakingHub.js spClassesFor);
     • from the student — the notes they wrote in the 🧠 Takeaway panel of
       their online book (livroOnline.js takeawayItems), by day.
   Everything can be heard (🔊), and "Test yourself" hides the words so the
   student says them first and then checks. Nothing is saved here.
   ========================================================================== */

const mtEsc = s => (typeof igEscapeHtml === 'function' ? igEscapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s));

function mtClassesFor(student) {
  const rec = typeof saRecord === 'function' ? saRecord(student.id) : {};
  if (Array.isArray(rec.classes) && rec.classes.length) return rec.classes;
  // The teacher's own screen: work it out from the class log.
  return typeof spClassesFor === 'function' ? spClassesFor(student) : [];
}

function mtSay(text) {
  if (!('speechSynthesis' in window) || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/\/[^/]*\//g, ''));
    u.lang = 'en-US'; u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch (e) { /* no voice */ }
}
// One after the other, with a short pause.
function mtSayAll(list) {
  if (!('speechSynthesis' in window) || !list.length) return;
  try {
    speechSynthesis.cancel();
    list.forEach(t => { const u = new SpeechSynthesisUtterance(String(t)); u.lang = 'en-US'; u.rate = 0.85; speechSynthesis.speak(u); });
  } catch (e) { /* no voice */ }
}

const mtSentences = text => String(text || '').split(/\n+/)
  .flatMap(l => l.split(/(?<=[.!?])\s+(?=[A-Z"“])/))
  .map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(s => s.length > 1);

const mtDate = (d, say) => {
  if (!d) return '';
  try { return new Date(d + 'T12:00').toLocaleDateString(say('pt-BR', 'en-US'), { day: 'numeric', month: 'short' }); } catch (e) { return d; }
};

// The tile's line: how much is there to review.
function mtTileText(student, say) {
  const cls = mtClassesFor(student);
  if (!cls.length && !(typeof LivroOnline !== 'undefined' && LivroOnline.bookFor && LivroOnline.bookFor(student))) return null;
  const words = new Set(cls.flatMap(c => (c.words || []).concat((c.pron || []).map(p => p.w))).map(w => String(w).toLowerCase()));
  const phrases = cls.reduce((n, c) => n + mtSentences(c.text).length, 0);
  return words.size || phrases
    ? say(`Revisar — ${words.size} palavras e ${phrases} frases das aulas`, `${words.size} words and ${phrases} sentences from your classes`)
    : say('O que você aprendeu nas aulas', 'What you learned in class');
}

function openMyTakeaway(student) {
  const say = (pt, en) => (typeof igSay === 'function' ? igSay(pt, en) : pt);
  const classes = mtClassesFor(student).slice().sort((a, b) => String(b.d).localeCompare(String(a.d)));
  let notes = null;          // the book notes, loaded below
  let filter = 'all';        // all | class | mine
  let quiz = false;
  let query = '';

  const chip = (text, cls) => `<button class="mt-chip${cls ? ' ' + cls : ''}" type="button" data-say="${mtEsc(text)}"><span class="mt-w">${mtEsc(text)}</span><span class="mt-ear" aria-hidden="true">🔊</span></button>`;
  const match = t => !query || String(t).toLowerCase().includes(query);

  function classHTML(c) {
    const words = (c.words || []).filter(match);
    const pron = (c.pron || []).filter(p => match(p.w));
    const lines = mtSentences(c.text).filter(match);
    if (!words.length && !pron.length && !lines.length) return '';
    const all = words.concat(pron.map(p => p.w), lines);
    return `<section class="mt-day">
      <header><b>${c.n ? `Class ${mtEsc(c.n)} · ` : ''}${mtEsc(mtDate(c.d, say))}</b>${c.topic ? `<small>${mtEsc(c.topic)}</small>` : ''}
        <button class="mt-play" type="button" data-sayall="${mtEsc(JSON.stringify(all))}">▶ ${say('Ouvir tudo', 'Play all')}</button></header>
      ${words.length ? `<p class="mt-label">🆕 ${say('Palavras novas', 'New words')}</p><div class="mt-chips">${words.map(w => chip(w)).join('')}</div>` : ''}
      ${pron.length ? `<p class="mt-label">🗣️ ${say('Pronúncia', 'Pronunciation')}</p><div class="mt-chips">${pron.map(p => `<button class="mt-chip mt-chip--pron" type="button" data-say="${mtEsc(p.w)}"><span class="mt-w">${mtEsc(p.w)}</span>${p.ipa ? `<span class="mt-ipa">/${mtEsc(String(p.ipa).replace(/^\/|\/$/g, ''))}/</span>` : ''}<span class="mt-ear" aria-hidden="true">🔊</span></button>`).join('')}</div>` : ''}
      ${lines.length ? `<p class="mt-label">💬 ${say('Frases', 'Sentences')}</p><div class="mt-lines">${lines.map(l => chip(l, 'mt-chip--line')).join('')}</div>` : ''}
    </section>`;
  }

  function notesHTML() {
    if (notes === null) return `<p class="mt-wait">⏳ ${say('Carregando as suas anotações do livro…', 'Loading your notes from the book…')}</p>`;
    const list = notes.filter(n => match(n.v));
    if (!list.length) {
      return query ? '' : `<p class="mt-empty">✏️ ${say('Você ainda não anotou nada no livro. Abra o 📖 My book e use o botão 🧠 Takeaway na barra da esquerda.', 'You haven\'t written any notes in your book yet. Open 📖 My book and use the 🧠 Takeaway button on the left.')}</p>`;
    }
    const byDay = new Map();
    list.forEach(n => { const k = n.at || '—'; if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(n); });
    const icon = { words: '🆕', pron: '🗣️', phrases: '💬' };
    return [...byDay.entries()].map(([day, items]) => `<section class="mt-day mt-day--mine">
      <header><b>✏️ ${say('Minhas anotações', 'My notes')} · ${mtEsc(day === '—' ? '' : mtDate(day, say))}</b><small>${say('livro', 'book')} p. ${[...new Set(items.map(i => i.page))].join(', ')}</small>
        <button class="mt-play" type="button" data-sayall="${mtEsc(JSON.stringify(items.map(i => i.v)))}">▶ ${say('Ouvir tudo', 'Play all')}</button></header>
      <div class="mt-chips">${items.map(i => `<button class="mt-chip${i.kind === 'phrases' ? ' mt-chip--line' : ''}" type="button" data-say="${mtEsc(i.v)}"><span class="mt-k" aria-hidden="true">${icon[i.kind] || ''}</span><span class="mt-w">${mtEsc(i.v)}</span><span class="mt-ear" aria-hidden="true">🔊</span></button>`).join('')}</div>
    </section>`).join('');
  }

  function paint() {
    const body = document.getElementById('mtBody');
    if (!body) return;
    const fromClass = filter !== 'mine' ? classes.map(classHTML).join('') : '';
    const mine = filter !== 'class' ? notesHTML() : '';
    body.classList.toggle('is-quiz', quiz);
    body.innerHTML = `
      <div class="mt-tools">
        <div class="mt-tabs" role="group">
          <button type="button" data-f="all" class="${filter === 'all' ? 'on' : ''}">${say('Tudo', 'All')}</button>
          <button type="button" data-f="class" class="${filter === 'class' ? 'on' : ''}">👩‍🏫 ${say('Da aula', 'From class')}</button>
          <button type="button" data-f="mine" class="${filter === 'mine' ? 'on' : ''}">✏️ ${say('Minhas', 'My notes')}</button>
        </div>
        <input type="search" id="mtQuery" placeholder="${say('Buscar…', 'Search…')}" value="${mtEsc(query)}" aria-label="Search"/>
        <button type="button" class="mt-quiz${quiz ? ' on' : ''}" data-quiz>${quiz ? '👀 ' + say('Mostrar', 'Show all') : '🎯 ' + say('Teste-se', 'Test yourself')}</button>
      </div>
      ${quiz ? `<p class="mt-hint">🎯 ${say('Diga a palavra ou a frase em voz alta, depois toque para conferir e ouvir.', 'Say the word or sentence out loud, then tap to check and listen.')}</p>` : ''}
      ${fromClass || mine ? `${filter !== 'mine' && !fromClass && !query ? `<p class="mt-empty">👩‍🏫 ${say('Ainda não há palavras das aulas.', 'No words from your classes yet.')}</p>` : ''}${fromClass}${mine}`
        : `<p class="mt-empty">🔎 ${say('Nada encontrado.', 'Nothing found.')}</p>`}`;
    body.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; paint(); }));
    body.querySelector('[data-quiz]').addEventListener('click', () => { quiz = !quiz; paint(); });
    const q = body.querySelector('#mtQuery');
    q.addEventListener('input', () => { query = q.value.trim().toLowerCase(); const pos = q.selectionStart; paint(); const again = document.getElementById('mtQuery'); if (again) { again.focus(); again.setSelectionRange(pos, pos); } });
    body.querySelectorAll('[data-say]').forEach(b => b.addEventListener('click', () => {
      if (quiz && !b.classList.contains('is-shown')) b.classList.add('is-shown');
      mtSay(b.dataset.say);
    }));
    body.querySelectorAll('[data-sayall]').forEach(b => b.addEventListener('click', () => {
      try { mtSayAll(JSON.parse(b.dataset.sayall)); } catch (e) { /* ignore */ }
    }));
  }

  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">🧠</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">My takeaway</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">${say('O que ficou de cada aula — da teacher e as suas anotações', 'What each class left — from your teacher and your own notes')}</span></p>
        </div>
      </div>
      <div id="mtBody"></div>
    </div>`, true);
  paint();

  if (typeof LivroOnline !== 'undefined' && LivroOnline.takeawayItems) {
    LivroOnline.takeawayItems(student).then(list => { notes = list || []; paint(); }).catch(() => { notes = []; paint(); });
  } else { notes = []; paint(); }
}
