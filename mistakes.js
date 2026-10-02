/* ==========================================================================
   IGenglishschool — My mistakes (Meus erros)
   The games used to forget what a child got wrong; only exams were kept.
   Now every game reports the word or sentence that was missed (igMiss),
   and this screen lists them with their pictures. "🔁 Review" practises
   just that one item: listen → say it → type it (words) or put it in order
   (sentences). Getting it right moves the card up the same Leitner boxes
   the exam questions use (learnerData.js), until it is learnt.
   Loaded after learnerData.js.
   ========================================================================== */

const MS_KINDS = ['vocab', 'sentence'];

// Called by the games. `word` is a word-bank entry ({ en, pt, image,
// emoji }) or a plain sentence string. A wrong answer adds (or drops) the
// card to box 0; a right one only helps a card that is already there.
function igMiss(word, ok, game) {
  try {
    if (!word || typeof ldLoadBank !== 'function') return;
    const studentId = typeof getActiveStudentId === 'function' ? getActiveStudentId() : null;
    if (!studentId) return;
    const isText = typeof word === 'string';
    let en = String(isText ? word : word.en || '').trim();
    if (!en) return;
    if (!isText) {
      const m = /\bis for (.+)$/i.exec(en);           // "A is for Apple" → apple
      if (m) en = m[1].trim();
      if (/^[A-Z][a-z]+$/.test(en)) en = en.toLowerCase();   // "Happy" → happy ("TV" stays)
    }
    const kind = isText || /\s\w+\s/.test(en) && /[.!?]$/.test(en) ? 'sentence' : 'vocab';
    const key = `${kind}|${en.toLowerCase()}`;
    const bank = ldLoadBank(studentId);
    let card = bank[key];
    if (!card) {
      if (ok) return;                 // right first time: nothing to revise
      card = {
        key, box: 0, right: 0, wrong: 0, added: new Date().toISOString(),
        item: {
          kind, prompt: en, correct: en,
          pt: isText ? '' : (word.pt || ''),
          image: isText ? '' : (word.image && igLooksLikeImageUrl(word.image) ? word.image : ''),
          emoji: isText ? '' : (word.emoji || ''),
          topic: game || '',
        },
      };
    }
    if (ok) { card.right++; card.box = Math.min(LD_BOX_DAYS.length - 1, card.box + 1); }
    else { card.wrong++; card.box = 0; }
    card.last = new Date().toISOString();
    card.due = ldPlusDays(LD_BOX_DAYS[card.box]);
    if (game) card.item.topic = game;
    bank[key] = card;
    ldSaveBank(studentId, bank);
  } catch (e) { /* never break a game over bookkeeping */ }
}

// The topic's own word entry for an English word — so a card keeps the
// game's picture ("happy" with its face, "rainy" with its scene).
function igWordOf(topic, en) {
  const k = String(en || '').toLowerCase();
  return (topic && topic.words || []).find(w => String(w.en || '').toLowerCase() === k) || { en };
}

function msSay(text, rate) {
  if (!('speechSynthesis' in window)) return;
  try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = rate || 0.8; window.speechSynthesis.speak(u); } catch (e) {}
}
const msNorm = s => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();

function msPicHTML(item, cls) {
  if (item.image) return `<span class="${cls}"><img src="${igEscapeHtml(item.image)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${igEscapeHtml(item.emoji || '📝')}'}))"/></span>`;
  if (item.emoji) return `<span class="${cls} ms-emoji">${igEscapeHtml(item.emoji)}</span>`;
  return `<span class="${cls} ms-emoji">${item.kind === 'sentence' ? '💬' : '📝'}</span>`;
}

// Everything still being learnt, the most-missed first.
function msCards(studentId) {
  const bank = ldLoadBank(studentId);
  return Object.values(bank)
    .filter(c => c && c.item && c.box < LD_MASTERED_BOX)
    .sort((a, b) => (b.wrong - b.right) - (a.wrong - a.right) || String(b.last).localeCompare(String(a.last)));
}
const msPracticedToday = c => c.right > 0 && c.due && new Date(c.due).getTime() > Date.now();

// ---------------------------------------------------------------------------
// THE LIST
// ---------------------------------------------------------------------------
function openMistakes(studentId) {
  const id = studentId || (typeof getActiveStudentId === 'function' ? getActiveStudentId() : null);
  if (!id) { alert('Escolha um aluno primeiro.'); return; }

  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">🔁</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">My mistakes</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">Meus erros — vamos revisar!</span></p>
        </div>
      </div>
      <div id="msMount"></div>
    </div>`, true);

  function paint() {
    const mount = document.getElementById('msMount');
    if (!mount) return;
    const cards = msCards(id);
    if (!cards.length) {
      mount.innerHTML = `
        <div class="rv-done">
          <span class="rv-done-emoji">🌟</span>
          <p class="rv-done-title">No mistakes!</p>
          <p class="rv-done-sub">Nenhum erro para revisar. Jogue os jogos — o que você errar aparece aqui.</p>
        </div>`;
      return;
    }
    const todo = cards.filter(c => !msPracticedToday(c));
    mount.innerHTML = `
      ${todo.length ? `<button class="btn btn-primary ms-all" data-all>🔁 Review all (${todo.length})</button>` : ''}
      <div class="ms-list">
        ${cards.map(c => `
          <div class="ms-row${msPracticedToday(c) ? ' done' : ''}">
            ${msPicHTML(c.item, 'ms-pic')}
            <div class="ms-text">
              <b>${igEscapeHtml(MS_KINDS.includes(c.item.kind) ? c.item.prompt : (c.item.correct || c.item.prompt))}</b>
              <small>${c.item.pt ? `${igEscapeHtml(c.item.pt)} · ` : ''}${c.item.topic ? igEscapeHtml(c.item.topic) + ' · ' : ''}❌ ${c.wrong}</small>
              ${MS_KINDS.includes(c.item.kind) ? '' : `<small class="ms-q">${igEscapeHtml(c.item.prompt)}</small>`}
            </div>
            ${msPracticedToday(c)
              ? `<span class="ms-ok">✅</span>`
              : `<button class="game-btn" data-review="${igEscapeHtml(c.key)}">🔁 Review</button>`}
          </div>`).join('')}
      </div>`;
    mount.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => {
      const card = ldLoadBank(id)[b.dataset.review];
      if (card) reviewOne(card, [], paint);
    }));
    const all = mount.querySelector('[data-all]');
    if (all) all.addEventListener('click', () => {
      const queue = todo.slice();
      const next = () => { const c = queue.shift(); if (c) reviewOne(c, queue, next); else paint(); };
      next();
    });
  }

  // Exam-style questions go back through the exam runner, one card at a time.
  function reviewOne(card, queue, done) {
    if (!MS_KINDS.includes(card.item.kind)) {
      openExamRunner({
        id: 'review-one', title: 'Review', group: '', topicIds: [], topicLabels: [],
        createdAt: new Date().toISOString(), count: 1, parts: [], items: [{ ...card.item }], isReview: true,
      }, { studentId: id, source: 'review' });
      return;
    }
    drill(card, () => { openMistakes(id); if (queue.length) setTimeout(done, 50); });
  }

  // ---- the three-step drill --------------------------------------------------
  function drill(card, after) {
    const item = card.item;
    const isSentence = item.kind === 'sentence';
    const steps = isSentence ? ['listen', 'say', 'order'] : ['listen', 'say', 'type'];
    let step = 0;
    let hints = 0;
    let typed = '';
    let feedback = '';
    let chosen = [];
    const tokens = exShuffle(item.correct.replace(/([.!?])$/, ' $1').split(/\s+/).filter(Boolean));

    function success() {
      igMissResult(true);
      IGSound.win();
      const box = document.getElementById('msMount');
      box.innerHTML = `
        <div class="rv-done">
          <span class="rv-done-emoji">🎉</span>
          <p class="rv-done-title">Great job!</p>
          <p class="rv-done-sub">${igEscapeHtml(item.correct)} ✅</p>
          <button class="btn btn-primary" data-next>OK ▶</button>
        </div>`;
      box.querySelector('[data-next]').addEventListener('click', after);
      msSay('Great job!');
    }
    function igMissResult(ok) {
      const bank = ldLoadBank(id);
      const c = bank[card.key];
      if (!c) return;
      if (ok) { c.right++; c.box = Math.min(LD_BOX_DAYS.length - 1, c.box + 1); }
      c.last = new Date().toISOString();
      c.due = ldPlusDays(Math.max(1, LD_BOX_DAYS[c.box]));
      bank[card.key] = c;
      ldSaveBank(id, bank);
    }

    function paintStep() {
      const box = document.getElementById('msMount');
      if (!box) return;
      const s = steps[step];
      const dots = steps.map((x, i) => `<i class="${i < step ? 'ok' : i === step ? 'on' : ''}"></i>`).join('');
      const head = `
        <div class="rv-progress">${dots}</div>
        <div class="ms-drill-card">
          ${msPicHTML(item, 'ms-drill-pic')}
          ${s === 'type' || s === 'order' ? '' : `<p class="ms-drill-word">${igEscapeHtml(item.correct)}</p>`}
          ${item.pt ? `<p class="rv-pt">${igEscapeHtml(item.pt)}</p>` : ''}
        </div>`;
      let body = '';
      if (s === 'listen') {
        body = `
          <p class="ms-step-title">👂 Listen</p>
          <div class="rv-actions">
            <button class="game-btn secondary" data-a="hear">🔊 Listen again</button>
            <button class="game-btn" data-a="next">Next ▶</button>
          </div>`;
      } else if (s === 'say') {
        const canRec = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
        body = `
          <p class="ms-step-title">🗣️ Say it!</p>
          <div class="rv-actions">
            <button class="game-btn secondary" data-a="hear">🔊</button>
            ${canRec ? `<button class="game-btn" data-a="mic">🎤 Speak</button>` : ''}
            <button class="game-btn${canRec ? ' secondary' : ''}" data-a="said">✅ I said it!</button>
          </div>`;
      } else if (s === 'type') {
        const word = item.correct;
        const shown = word.split('').map((ch, i) => (ch === ' ' ? '&nbsp;' : i < hints ? igEscapeHtml(ch) : '_')).join(' ');
        body = `
          <p class="ms-step-title">⌨️ Type it!</p>
          <p class="ms-slots">${shown}</p>
          <div class="ms-type">
            <input type="text" id="msInput" autocomplete="off" autocapitalize="off" spellcheck="false" value="${igEscapeHtml(typed)}" placeholder="…" aria-label="Type the word"/>
            <button class="game-btn" data-a="check">✔️ Check</button>
          </div>
          <div class="rv-actions">
            <button class="game-btn secondary" data-a="hear">🔊</button>
            <button class="game-btn secondary" data-a="hint">💡 Hint</button>
          </div>`;
      } else {
        body = `
          <p class="ms-step-title">🧩 Put it in order</p>
          <div class="ms-order-answer">${chosen.map((t, i) => `<button class="word-tile" data-un="${i}">${igEscapeHtml(tokens[t])}</button>`).join('') || '<span class="ms-order-hint">👇</span>'}</div>
          <div class="ms-order-tray">${tokens.map((t, i) => (chosen.includes(i) ? '' : `<button class="word-tile" data-take="${i}">${igEscapeHtml(t)}</button>`)).join('')}</div>
          <div class="rv-actions">
            <button class="game-btn secondary" data-a="hear">🔊</button>
            <button class="game-btn" data-a="checkorder" ${chosen.length === tokens.length ? '' : 'disabled'}>✔️ Check</button>
          </div>`;
      }
      box.innerHTML = `${head}${body}<p class="bp-msg ms-feedback">${feedback || '&nbsp;'}</p>`;
      feedback = '';
      bindStep(box, s);
      if (s === 'type') { const inp = box.querySelector('#msInput'); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }
    }

    function advance() {
      IGSound.correct();
      step++;
      hints = 0; typed = ''; chosen = [];
      if (step >= steps.length) { success(); return; }
      paintStep();
      if (steps[step] === 'say') msSay(item.correct);
    }

    function bindStep(box, s) {
      const on = (a, fn) => { const b = box.querySelector(`[data-a="${a}"]`); if (b) b.addEventListener('click', fn); };
      on('hear', () => msSay(item.correct));
      on('next', advance);
      on('said', advance);
      on('mic', () => {
        const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new Ctor();
        rec.lang = 'en-US'; rec.maxAlternatives = 3; rec.interimResults = false;
        const btn = box.querySelector('[data-a="mic"]');
        btn.textContent = '🎙️ …'; btn.classList.add('is-recording');
        rec.onresult = e => {
          const heard = [...e.results[0]].map(r => msNorm(r.transcript));
          const want = msNorm(item.correct);
          if (heard.some(h => h === want || h.includes(want) || want.includes(h) && h.length >= want.length * 0.7)) advance();
          else { IGSound.wrong(); feedback = `🤔 I heard "${igEscapeHtml(heard[0] || '…')}". Try again!`; paintStep(); }
        };
        rec.onerror = () => { feedback = 'Use “✅ I said it!” se o microfone não funcionar.'; paintStep(); };
        rec.onend = () => { if (btn.isConnected) { btn.textContent = '🎤 Speak'; btn.classList.remove('is-recording'); } };
        try { rec.start(); } catch (e) { /* already listening */ }
      });
      const input = box.querySelector('#msInput');
      if (input) {
        input.addEventListener('input', () => { typed = input.value; });
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
      }
      const check = () => {
        if (msNorm(typed) === msNorm(item.correct)) { advance(); return; }
        IGSound.wrong();
        igMiss(item.kind === 'vocab' ? { en: item.correct } : item.correct, false, item.topic);
        feedback = '❌ Not yet — try again! 💡';
        paintStep();
      };
      on('check', check);
      on('hint', () => { hints = Math.min(item.correct.length, hints + 1); typed = item.correct.slice(0, hints); IGSound.click(); paintStep(); });
      box.querySelectorAll('[data-take]').forEach(b => b.addEventListener('click', () => { chosen.push(Number(b.dataset.take)); IGSound.click(); paintStep(); }));
      box.querySelectorAll('[data-un]').forEach(b => b.addEventListener('click', () => { chosen.splice(Number(b.dataset.un), 1); IGSound.drop(); paintStep(); }));
      on('checkorder', () => {
        const built = chosen.map(i => tokens[i]).join(' ').replace(/\s([.!?])$/, '$1');
        if (msNorm(built) === msNorm(item.correct)) { advance(); return; }
        IGSound.wrong();
        feedback = '❌ Not yet — listen and try again!';
        chosen = [];
        paintStep();
        msSay(item.correct);
      });
    }

    paintStep();
    msSay(item.correct);
  }

  paint();
}
