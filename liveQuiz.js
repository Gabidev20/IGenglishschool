/* ==========================================================================
   IGenglishschool — 🌐 Live Quiz (a class quiz over Zoom, Kahoot-style)
   --------------------------------------------------------------------------
   The teacher opens a room and shares her screen; each student opens
   #jogo=quiz&sala=CODE on their own phone or computer, types their name and
   answers on big coloured buttons. Faster right answers score more. After
   each question: the right answer and the ranking; at the end, a podium.

   The questions come from Jump & Learn's generator (jlMakeQuestions): any
   subject or curriculum topic. Messages go through the same Supabase
   Realtime channel helper as Maze Muncher (mzOpenChannel) — no table.
   ========================================================================== */

const LQ_COLORS = [['#e5484d', '▲'], ['#3d7bd9', '◆'], ['#e0a800', '●'], ['#3fae5a', '■']];
const LQ_EMOJIS = ['🐶', '🐱', '🦊', '🐼', '🐯', '🦁', '🐰', '🐻', '🐸', '🐵', '🐧', '🐢', '🚀', '⚽', '🎸', '🌟'];
const lqEsc = s => igEscapeHtml(String(s == null ? '' : s));
const lqImg = (e, cls) => (typeof igEmojiImgHTML === 'function' ? igEmojiImgHTML(e, cls) : `<span class="${cls}">${e}</span>`);
const lqPic = w => (!w ? '' : w.num != null ? '' : typeof igWordVisualHTML === 'function' ? igWordVisualHTML(w, 'lq-pic') : lqImg(w.emoji || '❓', 'lq-pic'));
const lqRoomInHash = () => { const m = /[#&]sala=([A-Za-z0-9]{3,8})/.exec(location.hash || ''); return m ? m[1].toUpperCase() : null; };
const lqLink = code => `${location.origin}${location.pathname}#jogo=quiz&sala=${code}`;
const lqSay = t => { try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = 0.9; window.speechSynthesis.speak(u); } catch (e) { /* no voice */ } };
const lqSfx = n => { if (typeof IGSound !== 'undefined' && IGSound[n]) IGSound[n](); };

function openLiveQuiz() {
  const code = lqRoomInHash();
  if (code) { lqGuest(code); return; }
  lqHost();
}

// ===========================================================================
// THE TEACHER'S SCREEN
// ===========================================================================
function lqHost() {
  const S = { set: 'numbers', topic: null, count: 10, time: 20 };
  try { Object.assign(S, JSON.parse(localStorage.getItem('ig_quiz_settings') || '{}')); } catch (e) { /* default */ }
  let net = null, code = null, status = '';
  const players = new Map();          // id -> { id, name, emoji, score, last }
  let questions = [], qi = -1, phase = 'setup', answers = new Map(), qStart = 0, timer = null, tick = null;

  openModal(`
    <div class="modal-content-pad lq">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">${lqImg('🏆', 'pr-head-img')}</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Live Quiz</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">Each student answers on their own phone or computer 🌐</span></p>
        </div>
      </div>
      <div id="lqMount"></div>
    </div>`, true);
  const mount = () => document.getElementById('lqMount');
  const watch = setInterval(() => {
    if (mount()) return;
    clearInterval(watch); clearTimeout(timer); clearInterval(tick);
    if (net) { net.send('bye', {}); net.close(); }
  }, 1500);

  const sets = () => (typeof JL_SETS !== 'undefined' ? JL_SETS : []).filter(s => s.words().length >= 4);
  const words = () => (S.set === 'topic' ? (typeof jlTopicWords === 'function' ? jlTopicWords(S.topic) : []) : ((sets().find(s => s.id === S.set) || sets()[0] || { words: () => [] }).words()));

  // ---- setup ---------------------------------------------------------------
  function setup() {
    phase = 'setup';
    const m = mount(); if (!m) return;
    if (typeof mzOnlineReady === 'function' && !mzOnlineReady()) { m.innerHTML = '<p class="mz-wait">⚠️ O quiz ao vivo precisa do Supabase configurado.</p>'; return; }
    m.innerHTML = `
      <div class="mz-setup">
        <div class="mz-row"><span class="mz-row-label">Questions about</span>
          <div class="mz-opts">
            ${sets().map(s => `<button type="button" class="mz-opt${S.set === s.id ? ' on' : ''}" data-set="${s.id}">${lqImg(s.icon, 'mz-av-img')}<small>${lqEsc(s.en)}</small></button>`).join('')}
            <button type="button" class="mz-opt${S.set === 'topic' ? ' on' : ''}" data-set="topic">${lqImg('📚', 'mz-av-img')}<small>${S.topic ? lqEsc(S.topic.title) : 'Topic…'}</small></button>
          </div>
        </div>
        ${S.set === 'topic' ? `<div class="mz-row"><span class="mz-row-label"></span><div class="jl-topic-pick">
          <input type="search" class="gs-search" id="lqTopicSearch" placeholder="🔍 family, animals, verb to be…" autocomplete="off" />
          <div class="gs-topics" id="lqTopicList"></div></div></div>` : ''}
        <div class="mz-row"><span class="mz-row-label">Questions</span>
          <div class="mz-opts">${[5, 10, 15].map(n => `<button type="button" class="mz-opt mz-opt--wide${S.count === n ? ' on' : ''}" data-count="${n}">${n}</button>`).join('')}</div></div>
        <div class="mz-row"><span class="mz-row-label">Time</span>
          <div class="mz-opts">${[10, 20, 30].map(n => `<button type="button" class="mz-opt mz-opt--wide${S.time === n ? ' on' : ''}" data-time="${n}">⏱️ ${n}s</button>`).join('')}</div></div>
        <button type="button" class="btn btn-primary mz-start" data-open>🌐 Open the room</button>
        <p class="jl-error" data-error></p>
      </div>`;
    const save = () => { try { localStorage.setItem('ig_quiz_settings', JSON.stringify(S)); } catch (e) { /* private */ } };
    m.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => { S.set = b.dataset.set; save(); setup(); }));
    m.querySelectorAll('[data-count]').forEach(b => b.addEventListener('click', () => { S.count = Number(b.dataset.count); save(); setup(); }));
    m.querySelectorAll('[data-time]').forEach(b => b.addEventListener('click', () => { S.time = Number(b.dataset.time); save(); setup(); }));
    const search = m.querySelector('#lqTopicSearch');
    if (search) {
      const list = m.querySelector('#lqTopicList');
      const paint = () => {
        const found = typeof gsMatchTopics === 'function' ? gsMatchTopics(search.value.trim() || (S.topic && S.topic.title) || 'a', 12) : [];
        list.innerHTML = found.map(x => `<button class="gs-topic" type="button" data-topic="${lqEsc(x.level.id)}|${lqEsc(x.topic.id)}">
          <span class="gs-topic-emoji">${lqEsc(x.topic.emoji || '📘')}</span><b>${lqEsc(x.topic.title)}</b><small>${lqEsc(x.level.code || '')}</small></button>`).join('');
        list.querySelectorAll('[data-topic]').forEach(b => b.addEventListener('click', () => {
          const [levelId, topicId] = b.dataset.topic.split('|');
          const lv = LEVELS.find(l => l.id === levelId); const tp = lv && lv.topics.find(t => t.id === topicId);
          S.topic = { levelId, topicId, title: tp ? tp.title : topicId }; save(); setup();
        }));
      };
      search.addEventListener('input', paint); paint();
    }
    m.querySelector('[data-open]').addEventListener('click', async () => {
      questions = typeof jlMakeQuestions === 'function' ? jlMakeQuestions(words(), S.count) : [];
      if (!questions.length) { m.querySelector('[data-error]').textContent = 'Choose a subject with at least 4 words.'; return; }
      if (!net) {
        code = typeof mzNewRoomCode === 'function' ? mzNewRoomCode() : String(Math.random()).slice(2, 6);
        status = 'connecting';
        try {
          net = await mzOpenChannel('quiz-' + code, s => { status = s; if (phase === 'lobby') lobby(); });
        } catch (e) { m.querySelector('[data-error]').textContent = 'No connection. Check the internet.'; return; }
        net.on('join', p => {
          if (!p.id) return;
          const was = players.get(p.id);
          players.set(p.id, { id: p.id, name: String(p.name || 'Player').slice(0, 18), emoji: p.emoji || '🙂', score: was ? was.score : 0, last: 0 });
          sendState(p.id);
          if (phase === 'lobby') lobby();
        });
        net.on('answer', p => {
          if (phase !== 'question' || p.q !== qi || answers.has(p.id) || !players.has(p.id)) return;
          answers.set(p.id, { a: Number(p.a), t: Date.now() - qStart });
          const c = mount() && mount().querySelector('[data-answered]');
          if (c) c.textContent = `${answers.size} / ${players.size}`;
          if (answers.size >= players.size) { clearTimeout(timer); reveal(); }
        });
      }
      qi = -1;
      players.forEach(p => { p.score = 0; p.last = 0; });
      lobby();
    });
  }

  // What a student who joins (or comes back) needs to see right now.
  function sendState(to) {
    if (!net) return;
    net.send('lobby', { players: [...players.values()].map(p => ({ id: p.id, name: p.name, emoji: p.emoji })) });
    if (phase === 'question') net.send('q', qMsg(Math.max(1, S.time - Math.round((Date.now() - qStart) / 1000))));
  }
  const qMsg = time => {
    const q = questions[qi];
    return { n: qi, total: questions.length, prompt: q.prompt, picture: q.picture ? { en: q.picture.en, emoji: q.picture.emoji, image: q.picture.image } : null,
      options: q.options.map(o => o.label), big: q.options.some(o => o.big), time };
  };

  // ---- lobby -----------------------------------------------------------------
  function lobby() {
    phase = 'lobby';
    const m = mount(); if (!m) return;
    const ok = status === 'SUBSCRIBED';
    m.innerHTML = `
      <div class="lq-lobby">
        <p class="lq-join">📋 Copy the link and paste it in the <b>Zoom chat</b> · room</p>
        <div class="lq-code">${lqEsc(code)}</div>
        <div class="mz-room">
          <input class="mz-room-link" readonly value="${lqEsc(lqLink(code))}" aria-label="Link for the students" />
          <button type="button" class="game-btn secondary" data-copy>📋 Copy link</button>
          <span class="mz-room-status">${ok ? '✅ open' : '⏳ opening…'}</span>
        </div>
        <div class="lq-players">${players.size ? [...players.values()].map(p => `<span class="lq-player">${lqImg(p.emoji, 'lq-player-img')}${lqEsc(p.name)}</span>`).join('') : '<p class="mz-keys">Waiting for students… 👀</p>'}</div>
        <button type="button" class="btn btn-primary mz-start" data-go ${players.size ? '' : 'disabled'}>▶ Start (${players.size})</button>
      </div>`;
    const copy = m.querySelector('[data-copy]');
    copy.addEventListener('click', () => {
      const t = lqLink(code);
      const done = () => { copy.textContent = '✅ Copied!'; setTimeout(() => { if (copy.isConnected) copy.textContent = '📋 Copy link'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, () => prompt('Copy:', t)); else prompt('Copy:', t);
    });
    m.querySelector('[data-go]').addEventListener('click', () => { qi = -1; next(); });
  }

  // ---- a question --------------------------------------------------------------
  function next() {
    qi++;
    if (qi >= questions.length) { podium(); return; }
    phase = 'question';
    answers = new Map();
    qStart = Date.now();
    const q = questions[qi];
    net.send('q', qMsg(S.time));
    const m = mount(); if (!m) return;
    m.innerHTML = `
      <div class="lq-q">
        <div class="lq-q-top"><span>${qi + 1} / ${questions.length}</span><span class="lq-timer" data-timer>${S.time}</span><span>✋ <b data-answered>0 / ${players.size}</b></span></div>
        ${lqPic(q.picture)}
        <p class="lq-prompt">${q.prompt}</p>
        <div class="lq-opts${q.options.some(o => o.big) ? ' big' : ''}">
          ${q.options.map((o, i) => `<div class="lq-opt" style="--c:${LQ_COLORS[i][0]}"><span class="lq-shape">${LQ_COLORS[i][1]}</span>${lqEsc(o.label)}</div>`).join('')}
        </div>
        <div class="an-done-actions"><button type="button" class="game-btn secondary" data-skip>⏭ Show the answer</button></div>
      </div>`;
    if (q.kind === 'picture') lqSay("What's this?");
    m.querySelector('[data-skip]').addEventListener('click', () => { clearTimeout(timer); reveal(); });
    let left = S.time;
    clearInterval(tick);
    tick = setInterval(() => {
      left--;
      const t = mount() && mount().querySelector('[data-timer]');
      if (t) t.textContent = Math.max(0, left);
      if (left <= 3 && left > 0) lqSfx('countdown');
      if (left <= 0) clearInterval(tick);
    }, 1000);
    clearTimeout(timer);
    timer = setTimeout(reveal, S.time * 1000 + 300);
  }

  // ---- the answer and the ranking ------------------------------------------------
  function reveal() {
    if (phase !== 'question') return;
    phase = 'reveal';
    clearInterval(tick);
    const q = questions[qi];
    const right = q.options.findIndex(o => o.ok);
    const gained = {};
    players.forEach(p => {
      const a = answers.get(p.id);
      const ok = a && a.a === right;
      // 500 for a right answer, up to 500 more for speed.
      const pts = ok ? Math.round(500 + 500 * Math.max(0, 1 - a.t / (S.time * 1000))) : 0;
      p.score += pts; p.last = pts;
      gained[p.id] = { ok: Boolean(ok), pts, total: p.score, answered: Boolean(a) };
    });
    const ranking = [...players.values()].sort((a, b) => b.score - a.score);
    ranking.forEach((p, i) => { gained[p.id].rank = i + 1; });
    net.send('reveal', { n: qi, right, rightLabel: q.options[right].label, scores: gained, top: ranking.slice(0, 5).map(p => ({ name: p.name, emoji: p.emoji, score: p.score })) });
    lqSfx('reveal');
    lqSay(q.word && q.word.en ? q.word.en : q.options[right].label);
    const m = mount(); if (!m) return;
    const counts = q.options.map((_, i) => [...answers.values()].filter(a => a.a === i).length);
    m.innerHTML = `
      <div class="lq-q">
        <div class="lq-opts${q.options.some(o => o.big) ? ' big' : ''}">
          ${q.options.map((o, i) => `<div class="lq-opt${i === right ? ' right' : ' dim'}" style="--c:${LQ_COLORS[i][0]}"><span class="lq-shape">${LQ_COLORS[i][1]}</span>${lqEsc(o.label)}<b class="lq-count">${counts[i]}</b></div>`).join('')}
        </div>
        <ol class="lq-rank">${ranking.slice(0, 5).map(p => `<li>${lqImg(p.emoji, 'lq-player-img')}<b>${lqEsc(p.name)}</b><span>${p.score}</span>${p.last ? `<small>+${p.last}</small>` : ''}</li>`).join('')}</ol>
        <div class="an-done-actions"><button type="button" class="btn btn-primary" data-next>${qi + 1 < questions.length ? '▶ Next question' : '🏆 Podium'}</button></div>
      </div>`;
    m.querySelector('[data-next]').addEventListener('click', next);
  }

  // ---- the podium -------------------------------------------------------------
  function podium() {
    phase = 'end';
    const ranking = [...players.values()].sort((a, b) => b.score - a.score);
    net.send('end', { podium: ranking.map((p, i) => ({ id: p.id, name: p.name, emoji: p.emoji, score: p.score, rank: i + 1 })) });
    lqSfx('win');
    const m = mount(); if (!m) return;
    const place = (p, n) => (p ? `<div class="lq-step lq-step--${n}">${lqImg(p.emoji, 'lq-podium-img')}<b>${lqEsc(p.name)}</b><span>${p.score}</span><div class="lq-block">${n}</div></div>` : '<div></div>');
    m.innerHTML = `
      <div class="lq-podium">${place(ranking[1], 2)}${place(ranking[0], 1)}${place(ranking[2], 3)}</div>
      ${ranking.length > 3 ? `<ol class="lq-rank" start="4">${ranking.slice(3).map(p => `<li>${lqImg(p.emoji, 'lq-player-img')}<b>${lqEsc(p.name)}</b><span>${p.score}</span></li>`).join('')}</ol>` : ''}
      <div class="an-done-actions">
        <button type="button" class="btn btn-primary" data-again>🔄 Play again (same room)</button>
        <button type="button" class="game-btn secondary" data-menu>⚙️ Menu</button>
      </div>`;
    if (ranking[0]) lqSay(`The winner is ${ranking[0].name}!`);
    m.querySelector('[data-again]').addEventListener('click', () => {
      questions = jlMakeQuestions(words(), S.count);
      players.forEach(p => { p.score = 0; p.last = 0; });
      lobby(); net.send('lobby', { players: [...players.values()].map(p => ({ id: p.id, name: p.name, emoji: p.emoji })) });
    });
    m.querySelector('[data-menu]').addEventListener('click', () => { net.send('wait', {}); setup(); });
  }

  setup();
}

// ===========================================================================
// THE STUDENT'S PHONE / COMPUTER
// ===========================================================================
function lqGuest(code) {
  let id = null;
  try { id = sessionStorage.getItem('ig_quiz_id_' + code); } catch (e) { /* private */ }
  if (!id) { id = 'p' + Math.random().toString(36).slice(2, 9); try { sessionStorage.setItem('ig_quiz_id_' + code, id); } catch (e) { /* private */ } }
  let net = null, me = null, current = null, answered = null, tick = null;
  const student = (typeof loadStudents === 'function' ? loadStudents() : []).find(s => s.id === (typeof getActiveStudentId === 'function' ? getActiveStudentId() : ''));

  openModal(`
    <div class="modal-content-pad lq lq--guest">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">${lqImg('🏆', 'pr-head-img')}</span>
        <div class="modal-head-text"><h3 id="modalTitle">Live Quiz</h3><p class="modal-head-sub"><span class="modal-head-desc">🌐 Room ${lqEsc(code)}</span></p></div>
      </div>
      <div id="lqMount"></div>
    </div>`, true);
  const mount = () => document.getElementById('lqMount');
  const wait = html => { clearInterval(tick); const m = mount(); if (m) m.innerHTML = `<p class="mz-wait">${html}</p>`; };
  const watch = setInterval(() => { if (!mount()) { clearInterval(watch); clearInterval(tick); if (net) net.close(); } }, 1500);

  function joinForm() {
    const m = mount(); if (!m) return;
    let emoji = (student && student.avatar) || LQ_EMOJIS[Math.floor(Math.random() * LQ_EMOJIS.length)];
    m.innerHTML = `
      <div class="mz-setup lq-joinform">
        <p class="mz-wait">What's your name?</p>
        <input class="lq-name" maxlength="18" placeholder="Your name" value="${lqEsc(student ? student.name : '')}" />
        <div class="mz-opts tm-sets">${LQ_EMOJIS.map(e => `<button type="button" class="mz-opt${e === emoji ? ' on' : ''}" data-emoji="${e}">${lqImg(e, 'mz-av-img')}</button>`).join('')}</div>
        <button type="button" class="btn btn-primary mz-start" data-join>▶ Join!</button>
      </div>`;
    m.querySelectorAll('[data-emoji]').forEach(b => b.addEventListener('click', () => {
      emoji = b.dataset.emoji; m.querySelectorAll('[data-emoji]').forEach(x => x.classList.toggle('on', x === b));
    }));
    m.querySelector('[data-join]').addEventListener('click', () => {
      const name = m.querySelector('.lq-name').value.trim();
      if (!name) { m.querySelector('.lq-name').focus(); return; }
      me = { id, name, emoji };
      net.send('join', me);
      wait(`${lqImg(emoji, 'lq-podium-img')}<br>You're in, <b>${lqEsc(name)}</b>!<br><small>Look at the teacher's screen 👀</small>`);
    });
  }

  function question(q) {
    current = q; answered = null;
    const m = mount(); if (!m) return;
    m.innerHTML = `
      <div class="lq-q">
        <div class="lq-q-top"><span>${q.n + 1} / ${q.total}</span><span class="lq-timer" data-timer>${q.time}</span><span>${lqImg(me.emoji, 'lq-player-img')}</span></div>
        ${lqPic(q.picture)}
        <p class="lq-prompt">${q.prompt}</p>
        <div class="lq-opts lq-opts--tap${q.big ? ' big' : ''}">
          ${q.options.map((o, i) => `<button type="button" class="lq-opt" style="--c:${LQ_COLORS[i][0]}" data-a="${i}"><span class="lq-shape">${LQ_COLORS[i][1]}</span>${lqEsc(o)}</button>`).join('')}
        </div>
      </div>`;
    let left = q.time;
    clearInterval(tick);
    tick = setInterval(() => { left--; const t = mount() && mount().querySelector('[data-timer]'); if (t) t.textContent = Math.max(0, left); if (left <= 0) clearInterval(tick); }, 1000);
    m.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
      if (answered != null) return;
      answered = Number(b.dataset.a);
      net.send('answer', { id, q: q.n, a: answered });
      lqSfx('pop');
      m.querySelectorAll('[data-a]').forEach(x => x.classList.toggle('chosen', x === b));
      m.querySelectorAll('[data-a]').forEach(x => { if (x !== b) x.classList.add('dim'); });
      const note = document.createElement('p'); note.className = 'mz-keys'; note.textContent = '✅ Answer sent! Wait…'; m.querySelector('.lq-q').appendChild(note);
    }));
  }

  function result(r) {
    clearInterval(tick);
    const mine = r.scores && r.scores[id];
    const m = mount(); if (!m || !mine) return;
    if (mine.ok) lqSfx('correct'); else lqSfx('wrong');
    m.innerHTML = `
      <div class="lq-result ${mine.ok ? 'ok' : 'no'}">
        <p class="lq-result-big">${mine.ok ? '🎉 Correct!' : mine.answered ? '😕 Not this time' : '⏰ Time\'s up!'}</p>
        ${mine.ok ? `<p class="lq-result-pts">+${mine.pts}</p>` : `<p class="lq-result-ans">The answer: <b>${lqEsc(r.rightLabel)}</b></p>`}
        <p class="lq-result-rank">🏅 You are <b>#${mine.rank}</b> · ${mine.total} points</p>
      </div>`;
  }

  function end(e) {
    clearInterval(tick);
    const mine = (e.podium || []).find(p => p.id === id);
    const m = mount(); if (!m) return;
    if (mine && mine.rank <= 3) lqSfx('win');
    m.innerHTML = `
      <div class="lq-result ok">
        <p class="lq-result-big">${mine ? (mine.rank === 1 ? '🏆 You won!' : mine.rank <= 3 ? `${mine.rank === 2 ? '🥈' : '🥉'} #${mine.rank}!` : `🏅 #${mine.rank}`) : '🏁'}</p>
        ${mine ? `<p class="lq-result-rank">${mine.score} points</p>` : ''}
        <ol class="lq-rank">${(e.podium || []).slice(0, 5).map(p => `<li>${lqImg(p.emoji, 'lq-player-img')}<b>${lqEsc(p.name)}</b><span>${p.score}</span></li>`).join('')}</ol>
      </div>`;
  }

  (async () => {
    if (typeof mzOnlineReady !== 'function' || !mzOnlineReady()) { wait('⚠️ The live quiz is not available here.'); return; }
    wait('⏳ Connecting…');
    try {
      net = await mzOpenChannel('quiz-' + code, s => {
        if (s === 'SUBSCRIBED') { if (me) net.send('join', me); else joinForm(); }
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') wait('⚠️ No connection. Check the internet and open the link again.');
      });
    } catch (e) { wait('⚠️ No connection. Check the internet and open the link again.'); return; }
    net.on('q', q => { if (me && (!current || current.n !== q.n || answered == null)) question(q); });
    net.on('reveal', r => { if (me) result(r); });
    net.on('end', e => { if (me) end(e); });
    net.on('lobby', () => { if (me && (!current)) wait(`${lqImg(me.emoji, 'lq-podium-img')}<br>You're in, <b>${lqEsc(me.name)}</b>!<br><small>Look at the teacher's screen 👀</small>`); });
    net.on('wait', () => { current = null; if (me) wait('⏳ The teacher is choosing the next quiz…'); });
    net.on('bye', () => wait('👋 The teacher closed the quiz.'));
  })();
}
