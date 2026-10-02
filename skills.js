/* ==========================================================================
   IGenglishschool — Speaking, Dictation and Writing
   The three things a click-only app never trains: saying it, hearing it and
   writing it. All three grade themselves where they honestly can, and hand
   the rest to the teacher.
   ========================================================================== */

const SK_WRITING_PREFIX = 'writing_';   // studentId -> [submission]

// ---------------------------------------------------------------------------
// SHARED HELPERS
// ---------------------------------------------------------------------------
function skEsc(s) { return igEscapeHtml(String(s == null ? '' : s)); }

function skSpeak(text, rate) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'en-US';
    u.rate = rate || 0.92;
    window.speechSynthesis.speak(u);
  } catch (e) { /* the browser refused; the text is still on screen */ }
}

// Comparing what was said or typed against the target is a word problem, not
// a string problem: punctuation and capitals are not mistakes here.
function skWords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[‘’´`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Word-level diff (longest common subsequence). Used to show a student what
// they missed, and to show the teacher's correction against what they wrote.
function skDiff(fromText, toText) {
  const a = skWords(fromText);
  const b = skWords(toText);
  const aRaw = String(fromText || '').split(/\s+/).filter(Boolean);
  const bRaw = String(toText || '').split(/\s+/).filter(Boolean);
  const n = a.length, m = b.length;
  const table = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ op: 'same', word: bRaw[j] || b[j] }); i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) { out.push({ op: 'removed', word: aRaw[i] || a[i] }); i++; }
    else { out.push({ op: 'added', word: bRaw[j] || b[j] }); j++; }
  }
  while (i < n) { out.push({ op: 'removed', word: aRaw[i] || a[i] }); i++; }
  while (j < m) { out.push({ op: 'added', word: bRaw[j] || b[j] }); j++; }
  return out;
}

function skDiffHTML(diff) {
  return diff.map(d => `<span class="sk-${d.op}">${skEsc(d.word)}</span>`).join(' ');
}

// How much of the target came back, word for word.
function skScore(target, said) {
  const want = skWords(target);
  const got = skWords(said);
  if (!want.length) return { pct: 0, hits: [] };
  const pool = got.slice();
  const hits = want.map(w => {
    const at = pool.indexOf(w);
    if (at === -1) return false;
    pool.splice(at, 1);
    return true;
  });
  return { pct: Math.round((hits.filter(Boolean).length / want.length) * 100), hits };
}

// Sentences to practise with: whatever the caller passed, else the topic's own
// examples, else the graded sentences the exam generators are built on.
function skSentences(opts) {
  const o = opts || {};
  if (Array.isArray(o.lines) && o.lines.length) return o.lines.slice(0, 12);
  if (o.topic && typeof lkSentences === 'function') {
    const own = lkSentences(o.topic);
    if (own.length >= 3) return own.slice(0, 10);
  }
  // Young learners: short sentences with the verb to be and easy vocabulary
  // ("She is happy.", "It is a cat.") instead of the general bank.
  const student = o.studentId && typeof loadStudents === 'function' ? loadStudents().find(s => s.id === o.studentId) : null;
  if (student && typeof igIsEasyLevel === 'function' && igIsEasyLevel(student) && typeof kidSentences === 'function') {
    return kidSentences(8);
  }
  if (typeof EX_FRAMES !== 'undefined' && typeof exAff === 'function') {
    return exShuffle(EX_FRAMES.map(f => exAff(f))).slice(0, 8);
  }
  return ['I went to school yesterday.', 'She is reading a book.', 'We are going to travel in July.'];
}

function skRecognizer() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.continuous = false;
  return rec;
}

// ---------------------------------------------------------------------------
// 🎤 SPEAKING — read it out loud, and see which words came through
// ---------------------------------------------------------------------------
const SkillsModules = (() => {
  let activeRec = null;

  function stopAll() {
    if (activeRec) { try { activeRec.abort(); } catch (e) {} activeRec = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function speaking(mount, opts) {
    const o = opts || {};
    const deck = skSentences(o);
    const supported = Boolean(skRecognizer());
    let index = 0;
    let scores = [];

    function paint(state) {
      const line = deck[index];
      const s = state || {};
      mount.innerHTML = `
        <div class="sk-shell">
          <div class="ex-head">
            <span class="ex-count">Frase ${index + 1} de ${deck.length}</span>
            <span class="ex-score">${scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + '% em média' : 'Leia em voz alta'}</span>
          </div>
          <div class="ex-bar"><div class="ex-bar-fill" style="width:${(index / deck.length) * 100}%"></div></div>

          <p class="sk-target">${s.marked || skEsc(line)}</p>

          <div class="sk-actions">
            <button class="game-btn secondary" data-action="listen">🔊 Ouvir</button>
            <button class="game-btn secondary" data-action="slow">🐢 Devagar</button>
            ${supported
              ? `<button class="game-btn ${s.listening ? 'is-recording' : ''}" data-action="rec">${s.listening ? '🔴 Gravando…' : '🎤 Falar'}</button>`
              : ''}
          </div>

          ${s.feedback || ''}

          ${!supported ? `
            <p class="sk-note">🎧 Este navegador não reconhece fala. Ouça o modelo, repita em voz alta e marque você mesmo:</p>
            <div class="sk-actions">
              <button class="game-btn" data-self="1">😀 Falei bem</button>
              <button class="game-btn secondary" data-self="0">😕 Preciso treinar</button>
            </div>` : ''}

          <div class="game-btn-row ex-actions">
            <button class="btn btn-primary" data-action="next" ${s.done ? '' : 'hidden'}>
              ${index + 1 === deck.length ? 'Ver resultado →' : 'Próxima frase →'}
            </button>
          </div>
        </div>`;
      bind(state || {});
    }

    function grade(said) {
      const line = deck[index];
      const result = skScore(line, said);
      const words = String(line).split(/\s+/);
      const marked = words.map((w, i) => `<span class="sk-${result.hits[i] ? 'hit' : 'miss'}">${skEsc(w)}</span>`).join(' ');
      scores.push(result.pct);
      if (typeof ldRecord === 'function') {
        ldRecord({ kind: 'speak', prompt: line, correct: line, topic: o.topicLabel || 'Speaking' },
          result.pct >= 70, { studentId: o.studentId, source: o.source || 'speaking' });
      }
      if (result.pct >= 70) {
        if (typeof exPlayGood === 'function') exPlayGood();
        if (typeof awardProgress === 'function') awardProgress(6, 0);
      } else if (typeof exPlayBad === 'function') exPlayBad();

      paint({
        marked,
        done: true,
        feedback: `
          <div class="sk-feedback ${result.pct >= 70 ? 'good' : 'bad'}">
            <strong>${result.pct}%</strong> das palavras saíram certinhas.
            <p class="sk-heard">Ouvi: “${skEsc(said || '—')}”</p>
            ${result.pct >= 70 ? '<p>Muito bom! 👏</p>' : '<p>As palavras em vermelho são as que faltaram — ouça o modelo e tente de novo.</p>'}
          </div>`,
      });
    }

    function bind(state) {
      const on = (sel, fn) => { const el = mount.querySelector(`[data-action="${sel}"]`); if (el) el.addEventListener('click', fn); };
      on('listen', () => skSpeak(deck[index], 0.95));
      on('slow', () => skSpeak(deck[index], 0.6));
      on('rec', () => {
        const rec = skRecognizer();
        if (!rec) return;
        stopAll();
        activeRec = rec;
        paint({ listening: true, marked: state.marked, feedback: state.feedback, done: state.done });
        rec.onresult = e => {
          const said = Array.from(e.results[0]).map(r => r.transcript).join(' ');
          activeRec = null;
          grade(said);
        };
        rec.onerror = () => {
          activeRec = null;
          paint({ feedback: '<div class="sk-feedback bad">Não consegui ouvir. Verifique o microfone e tente de novo.</div>' });
        };
        rec.onend = () => { if (activeRec === rec) { activeRec = null; paint({}); } };
        try { rec.start(); } catch (e) { activeRec = null; paint({}); }
      });
      mount.querySelectorAll('[data-self]').forEach(btn => {
        btn.addEventListener('click', () => {
          const ok = btn.dataset.self === '1';
          if (ok) IGSound.correct(); else IGSound.wrong();
          scores.push(ok ? 100 : 40);
          if (typeof ldRecord === 'function') {
            ldRecord({ kind: 'speak', prompt: deck[index], correct: deck[index], topic: o.topicLabel || 'Speaking' },
              ok, { studentId: o.studentId, source: 'speaking' });
          }
          paint({ done: true, feedback: `<div class="sk-feedback ${ok ? 'good' : 'bad'}">${ok ? 'Boa! Anotado. 👏' : 'Anotado — vale repetir esta frase.'}</div>` });
        });
      });
      on('next', () => {
        index++;
        if (index < deck.length) paint({});
        else finish();
      });
    }

    function finish() {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));
      const stars = avg >= 90 ? 3 : avg >= 70 ? 2 : avg >= 50 ? 1 : 0;
      if (stars) IGSound.win(); else IGSound.bell();
      if (typeof awardProgress === 'function') awardProgress(scores.length * 4, stars);
      mount.innerHTML = `
        <div class="game-end-banner ${avg >= 60 ? 'win' : 'lose'}">
          🎤 ${avg}% de acerto na pronúncia
          <p>${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
          <div class="game-btn-row" style="justify-content:center;margin-top:12px">
            <button class="btn btn-primary" data-action="again">🔄 Treinar de novo</button>
          </div>
        </div>`;
      if (typeof exConfetti === 'function') exConfetti(mount.querySelector('.game-end-banner'));
      mount.querySelector('[data-action="again"]').addEventListener('click', () => {
        index = 0; scores = []; paint({});
      });
      if (typeof o.onDone === 'function') o.onDone({ correct: scores.filter(s => s >= 70).length, total: deck.length, pct: avg });
    }

    paint({});
  }

  // -------------------------------------------------------------------------
  // 🎧 DICTATION — hear it, write it
  // -------------------------------------------------------------------------
  function dictation(mount, opts) {
    const o = opts || {};
    const deck = skSentences(o);
    let index = 0, correct = 0;

    function paint(state) {
      const s = state || {};
      mount.innerHTML = `
        <div class="sk-shell">
          <div class="ex-head">
            <span class="ex-count">Ditado ${index + 1} de ${deck.length}</span>
            <span class="ex-score">${correct} certas</span>
          </div>
          <div class="ex-bar"><div class="ex-bar-fill" style="width:${(index / deck.length) * 100}%"></div></div>

          <div class="sk-actions sk-actions--center">
            <button class="game-btn" data-action="play">🔊 Ouvir a frase</button>
            <button class="game-btn secondary" data-action="slow">🐢 Devagar</button>
          </div>

          <div class="exg-type-row">
            <input type="text" class="exg-input" id="skInput" placeholder="Escreva o que você ouviu…"
                   autocomplete="off" autocapitalize="off" spellcheck="false" ${s.done ? 'disabled' : ''}
                   value="${skEsc(s.value || '')}" />
            <button class="game-btn" data-action="check" ${s.done ? 'disabled' : ''}>Checar</button>
          </div>

          ${s.feedback || '<p class="sk-note">Dica: ouça quantas vezes quiser antes de escrever.</p>'}

          <div class="game-btn-row ex-actions">
            <button class="btn btn-primary" data-action="next" ${s.done ? '' : 'hidden'}>
              ${index + 1 === deck.length ? 'Ver resultado →' : 'Próxima →'}
            </button>
          </div>
        </div>`;
      bind();
      if (!s.done) {
        const input = mount.querySelector('#skInput');
        if (input) input.focus();
      }
    }

    function check() {
      const input = mount.querySelector('#skInput');
      const typed = input ? input.value : '';
      const line = deck[index];
      const right = skWords(typed).join(' ') === skWords(line).join(' ');
      if (right) correct++;
      if (typeof ldRecord === 'function') {
        ldRecord({ kind: 'dictation', prompt: `Ditado: ${line}`, correct: line, topic: o.topicLabel || 'Listening' },
          right, { studentId: o.studentId, source: o.source || 'dictation' });
      }
      if (right) { if (typeof exPlayGood === 'function') exPlayGood(); if (typeof awardProgress === 'function') awardProgress(6, 0); }
      else if (typeof exPlayBad === 'function') exPlayBad();

      paint({
        done: true, value: typed,
        feedback: `
          <div class="sk-feedback ${right ? 'good' : 'bad'}">
            ${right ? 'Perfeito! 🎉' : 'Quase — veja o que mudou:'}
            <p class="sk-diff">${skDiffHTML(skDiff(typed, line))}</p>
            <p class="sk-heard">Frase certa: “${skEsc(line)}”</p>
          </div>`,
      });
    }

    function bind() {
      const on = (sel, fn) => { const el = mount.querySelector(`[data-action="${sel}"]`); if (el) el.addEventListener('click', fn); };
      on('play', () => skSpeak(deck[index], 0.9));
      on('slow', () => skSpeak(deck[index], 0.55));
      on('check', check);
      const input = mount.querySelector('#skInput');
      if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
      on('next', () => {
        index++;
        if (index < deck.length) { paint({}); skSpeak(deck[index], 0.9); }
        else finish();
      });
    }

    function finish() {
      const pct = Math.round((correct / deck.length) * 100);
      const stars = typeof exStarsFor === 'function' ? exStarsFor(correct, deck.length) : 0;
      if (stars) IGSound.win(); else IGSound.bell();
      if (typeof awardProgress === 'function') awardProgress(correct * 5, stars);
      mount.innerHTML = `
        <div class="game-end-banner ${pct >= 50 ? 'win' : 'lose'}">
          🎧 ${correct} / ${deck.length} frases certas (${pct}%)
          <p>${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
          <div class="game-btn-row" style="justify-content:center;margin-top:12px">
            <button class="btn btn-primary" data-action="again">🔄 De novo</button>
          </div>
        </div>`;
      if (typeof exConfetti === 'function') exConfetti(mount.querySelector('.game-end-banner'));
      mount.querySelector('[data-action="again"]').addEventListener('click', () => { index = 0; correct = 0; paint({}); });
      if (typeof o.onDone === 'function') o.onDone({ correct, total: deck.length, pct });
    }

    paint({});
    skSpeak(deck[0], 0.9);
  }

  // -------------------------------------------------------------------------
  // ✍️ WRITING — the student writes, the teacher corrects, the diff shows why
  // -------------------------------------------------------------------------
  const WRITING_PROMPTS = [
    { id: 'weekend', prompt: 'What did you do last weekend?', help: ['I went…', 'I played…', 'It was…'], words: 40 },
    { id: 'family', prompt: 'Write about your family.', help: ['I have…', 'My mother is…', 'We like…'], words: 40 },
    { id: 'routine', prompt: 'Describe your daily routine.', help: ['I wake up at…', 'Then I…', 'In the evening…'], words: 50 },
    { id: 'holiday', prompt: 'Where are you going to travel next holiday? Why?', help: ['I am going to…', 'because…'], words: 50 },
    { id: 'bestfriend', prompt: 'Write about your best friend.', help: ['My best friend is…', 'We usually…'], words: 40 },
    { id: 'room', prompt: 'Describe your bedroom.', help: ['There is…', 'There are…', 'My favourite thing is…'], words: 40 },
  ];

  function skLoadWriting(studentId) {
    const list = IGStore.getJSON(SK_WRITING_PREFIX + studentId, []);
    return Array.isArray(list) ? list : [];
  }
  function skSaveWriting(studentId, list) { IGStore.setJSON(SK_WRITING_PREFIX + studentId, list); }

  function writing(mount, opts) {
    const o = opts || {};
    const studentId = o.studentId || (typeof getActiveStudentId === 'function' ? getActiveStudentId() : null);
    const task = o.promptText
      ? { id: o.promptId || 'custom', prompt: o.promptText, help: o.help || [], words: o.words || 40 }
      : (WRITING_PROMPTS.find(p => p.id === o.promptId) || exPickSafe(WRITING_PROMPTS));

    function exPickSafe(list) { return list[Math.floor(Math.random() * list.length)]; }

    let text = '';
    const previous = studentId ? skLoadWriting(studentId).filter(w => w.promptId === task.id) : [];

    function paint(state) {
      const s = state || {};
      const count = text.trim() ? text.trim().split(/\s+/).length : 0;
      mount.innerHTML = `
        <div class="sk-shell">
          <p class="exg-topic">Writing</p>
          <p class="sk-target">${skEsc(task.prompt)}</p>
          ${task.help && task.help.length ? `<p class="sk-note">💡 Comece assim: ${task.help.map(h => `<em>${skEsc(h)}</em>`).join(' · ')}</p>` : ''}

          <textarea class="sk-textarea" id="skText" rows="8" placeholder="Escreva aqui em inglês…" ${s.sent ? 'disabled' : ''}>${skEsc(text)}</textarea>
          <div class="sk-meter">
            <span class="${count >= task.words ? 'ok' : ''}">${count} palavra${count === 1 ? '' : 's'}</span>
            <span>meta: ${task.words}</span>
          </div>

          ${s.sent ? `
            <div class="sk-feedback good">
              Enviado para a professora! ✅
              <p>Ela vai corrigir e você vai ver as correções aqui.</p>
            </div>` : `
            <div class="game-btn-row ex-actions">
              <button class="game-btn secondary" data-action="read">🔊 Ouvir o que escrevi</button>
              <button class="btn btn-primary" data-action="send" ${count < 5 ? 'disabled' : ''}>📨 Enviar para a professora</button>
            </div>`}

          ${previous.length ? `
            <div class="sk-history">
              <h4 class="watch-h">📝 Entregas anteriores</h4>
              ${previous.slice(0, 3).map(w => skSubmissionHTML(w)).join('')}
            </div>` : ''}
        </div>`;

      const area = mount.querySelector('#skText');
      if (area) {
        area.addEventListener('input', () => {
          text = area.value;
          const meter = mount.querySelector('.sk-meter span');
          const n = text.trim() ? text.trim().split(/\s+/).length : 0;
          if (meter) {
            meter.textContent = `${n} palavra${n === 1 ? '' : 's'}`;
            meter.classList.toggle('ok', n >= task.words);
          }
          const send = mount.querySelector('[data-action="send"]');
          if (send) send.disabled = n < 5;
        });
      }
      const on = (sel, fn) => { const el = mount.querySelector(`[data-action="${sel}"]`); if (el) el.addEventListener('click', fn); };
      on('read', () => skSpeak(text || task.prompt, 0.95));
      on('send', () => {
        if (!studentId) { alert('Escolha o aluno antes de enviar.'); return; }
        const list = skLoadWriting(studentId);
        list.unshift({
          id: 'w' + Date.now().toString(36),
          promptId: task.id,
          prompt: task.prompt,
          text: text.trim(),
          words: text.trim().split(/\s+/).length,
          sentAt: new Date().toISOString(),
          status: 'sent',
        });
        skSaveWriting(studentId, list.slice(0, 40));
        if (typeof ldRecord === 'function') {
          ldRecord({ kind: 'writing', prompt: task.prompt, correct: '', topic: 'Writing' }, true,
            { studentId, source: 'writing' });
        }
        if (typeof awardProgress === 'function') awardProgress(15, 1);
        if (typeof exPlayWin === 'function') exPlayWin();
        paint({ sent: true });
        if (typeof o.onDone === 'function') o.onDone({ correct: 1, total: 1, pct: 100, text: text.trim() });
      });
    }

    paint({});
  }

  // A submission with the teacher's correction, if it has one.
  function skSubmissionHTML(w) {
    const corrected = w.correction && w.correction.text;
    return `
      <div class="sk-submission">
        <div class="sk-submission-head">
          <b>${skEsc(w.prompt)}</b>
          <span>${new Date(w.sentAt).toLocaleDateString('pt-BR')} · ${w.words} palavras ·
            ${corrected ? '<i class="sk-tag done">corrigido</i>' : '<i class="sk-tag wait">aguardando</i>'}</span>
        </div>
        <p class="sk-written">${skEsc(w.text)}</p>
        ${corrected ? `
          <p class="sk-label">Correção da professora:</p>
          <p class="sk-diff">${skDiffHTML(skDiff(w.text, w.correction.text))}</p>
          ${w.correction.note ? `<p class="sk-teacher-note">💬 ${skEsc(w.correction.note)}</p>` : ''}
          ${w.correction.grade ? `<p class="sk-grade">Nota: <b>${skEsc(w.correction.grade)}</b></p>` : ''}
        ` : ''}
      </div>`;
  }

  return { speaking, dictation, writing, stopAll, prompts: WRITING_PROMPTS, loadWriting: skLoadWriting, saveWriting: skSaveWriting, submissionHTML: skSubmissionHTML };
})();

// Openers used by the homework runner, the topic modal and the student hub.
function openSpeakingModal(opts) {
  openModal(`<div class="modal-content-pad"><h3 id="modalTitle">🎤 Speaking — fale em inglês</h3><div id="skMount" class="game-mount"></div></div>`, true);
  SkillsModules.speaking(document.getElementById('skMount'), opts || {});
}
function openDictationModal(opts) {
  openModal(`<div class="modal-content-pad"><h3 id="modalTitle">🎧 Ditado — ouça e escreva</h3><div id="skMount" class="game-mount"></div></div>`, true);
  SkillsModules.dictation(document.getElementById('skMount'), opts || {});
}
function openWritingModal(opts) {
  openModal(`<div class="modal-content-pad"><h3 id="modalTitle">✍️ Writing — escreva em inglês</h3><div id="skMount" class="game-mount"></div></div>`, true);
  SkillsModules.writing(document.getElementById('skMount'), opts || {});
}

// ---------------------------------------------------------------------------
// TEACHER SIDE — the correction desk
// ---------------------------------------------------------------------------
function skAllSubmissions() {
  const students = typeof loadStudents === 'function' ? loadStudents() : [];
  const out = [];
  students.forEach(st => {
    SkillsModules.loadWriting(st.id).forEach(w => out.push({ ...w, studentId: st.id, studentName: st.name, avatar: st.avatar }));
  });
  return out.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}

function openWritingDesk() {
  const all = skAllSubmissions();
  const pending = all.filter(w => !(w.correction && w.correction.text));

  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">✉️ Mensagens e textos dos alunos</h3>
      <p class="lt-count-note">${all.filter(w => !w.seen && !(w.correction && w.correction.text)).length} nova(s) · ${pending.length} aguardando resposta · ${all.length} no total</p>
      <div id="skDeskMount" class="sk-desk"></div>
    </div>`, true);

  const mount = document.getElementById('skDeskMount');

  function paintList() {
    if (!all.length) {
      mount.innerHTML = `<p class="quiz-empty">Nenhum texto enviado ainda. Peça um Writing na lição de casa.</p>`;
      return;
    }
    mount.innerHTML = all.map(w => `
      <div class="sk-desk-row ${w.correction && w.correction.text ? 'done' : ''}${w.seen || (w.correction && w.correction.text) ? '' : ' unread'}">
        <div>
          <b>${w.seen || (w.correction && w.correction.text) ? '' : '<span class="sk-new">NOVA</span> '}${skEsc(w.avatar || '🙂')} ${skEsc(w.studentName)}</b>
          <span>${skEsc(w.prompt)}</span>
          <span>${new Date(w.sentAt).toLocaleDateString('pt-BR')} · ${w.words} palavras</span>
        </div>
        <button class="game-btn ${w.correction && w.correction.text ? 'secondary' : ''}" data-correct="${w.studentId}:${w.id}">
          ${w.correction && w.correction.text ? '👁️ Ver' : '🖊️ Corrigir'}
        </button>
      </div>`).join('');

    mount.querySelectorAll('[data-correct]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [studentId, id] = btn.dataset.correct.split(':');
        paintEditor(studentId, id);
      });
    });
  }

  function paintEditor(studentId, id) {
    const list = SkillsModules.loadWriting(studentId);
    const w = list.find(x => x.id === id);
    if (!w) return paintList();
    const student = (typeof loadStudents === 'function' ? loadStudents() : []).find(s => s.id === studentId);
    // Opened = read: it stops counting on the ✉️ badge.
    if (!w.seen) {
      w.seen = true;
      SkillsModules.saveWriting(studentId, list);
      const idx = all.findIndex(x => x.studentId === studentId && x.id === id);
      if (idx !== -1) all[idx] = { ...all[idx], seen: true };
      if (typeof refreshInboxBadge === 'function') refreshInboxBadge();
    }

    mount.innerHTML = `
      <div class="sk-editor">
        <button class="game-btn secondary" data-action="back">← Voltar</button>
        <h4 class="watch-h">${skEsc(student ? student.name : '')} — ${skEsc(w.prompt)}</h4>
        <p class="sk-label">O que o aluno escreveu</p>
        <p class="sk-written">${skEsc(w.text)}</p>

        <p class="sk-label">Versão corrigida <small>(edite o texto; o aluno verá a diferença marcada)</small></p>
        <textarea class="sk-textarea" id="skCorrected" rows="7">${skEsc((w.correction && w.correction.text) || w.text)}</textarea>

        <div class="exam-row">
          <label class="exam-field small">
            <span class="exam-label">Comentário</span>
            <input type="text" id="skNote" placeholder="Muito bem! Cuidado com o passado dos verbos." value="${skEsc((w.correction && w.correction.note) || '')}" />
          </label>
          <label class="exam-field small">
            <span class="exam-label">Nota (opcional)</span>
            <input type="text" id="skGrade" placeholder="9,0" value="${skEsc((w.correction && w.correction.grade) || '')}" />
          </label>
        </div>

        <div class="game-btn-row ex-actions">
          <button class="game-btn secondary" data-action="preview">👁️ Ver como o aluno verá</button>
          <button class="btn btn-primary" data-action="save">💾 Salvar correção</button>
        </div>
        <div id="skPreview"></div>
      </div>`;

    const on = (sel, fn) => { const el = mount.querySelector(`[data-action="${sel}"]`); if (el) el.addEventListener('click', fn); };
    on('back', paintList);
    on('preview', () => {
      const corrected = mount.querySelector('#skCorrected').value;
      mount.querySelector('#skPreview').innerHTML = `
        <p class="sk-label">Assim o aluno verá</p>
        <p class="sk-diff">${skDiffHTML(skDiff(w.text, corrected))}</p>`;
    });
    on('save', () => {
      w.correction = {
        text: mount.querySelector('#skCorrected').value.trim(),
        note: mount.querySelector('#skNote').value.trim(),
        grade: mount.querySelector('#skGrade').value.trim(),
        at: new Date().toISOString(),
      };
      w.status = 'corrected';
      SkillsModules.saveWriting(studentId, list);
      const idx = all.findIndex(x => x.studentId === studentId && x.id === id);
      if (idx !== -1) all[idx] = { ...all[idx], correction: w.correction, status: 'corrected' };
      paintList();
    });
  }

  paintList();
}
