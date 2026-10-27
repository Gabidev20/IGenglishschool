/* ==========================================================================
   IGenglishschool — Messages between the teacher and a student
   A chat, not a form: bubbles, text and voice messages, for every student.

   No new storage: a conversation is the student's `writing_<studentId>` list
   (the same list that already syncs both ways through the student's link):
     • a student's message      → { id, promptId:'chat'|'audio', text | audio, sentAt, … }
     • a message from the teacher → { id, from:'teacher', text | audio, sentAt, seen:true }
     • an old-style answer (correction.note / correction.audio / corrected
       text) still shows up as a teacher bubble under the message it answers.
   Written texts sent from "Write to my teacher" appear as cards that open
   the correction desk.
   ========================================================================== */

const chatSay = (pt, en) => (typeof igSay === 'function' ? igSay(pt, en) : pt);

const CHAT_MAX_SECONDS = 60;

const chatEsc = s => igEscapeHtml(String(s == null ? '' : s));
const chatIsTeacherItem = w => w && w.from === 'teacher';
const chatIsEssay = w => w && !w.from && !w.audio && w.promptId !== 'chat';
const chatHasReply = c => Boolean(c && (c.text || c.note || c.audio));

function chatList(studentId) { return typeof SkillsModules !== 'undefined' ? SkillsModules.loadWriting(studentId) : []; }
function chatSave(studentId, list) { SkillsModules.saveWriting(studentId, list); }

// The conversation as a flat, time-ordered list of bubbles.
function chatMessages(studentId) {
  const out = [];
  chatList(studentId).forEach(w => {
    if (!w || !w.id) return;
    if (chatIsTeacherItem(w)) {
      out.push({ key: w.id, mine: 'teacher', at: w.sentAt, text: w.text, audio: w.audio, seconds: w.seconds });
      return;
    }
    out.push({
      key: w.id, mine: 'student', at: w.sentAt, text: w.text, audio: w.audio, seconds: w.seconds,
      essay: chatIsEssay(w) ? { prompt: w.prompt, words: w.words, id: w.id, corrected: Boolean(w.correction && w.correction.text) } : null,
    });
    const c = w.correction;
    if (chatHasReply(c)) {
      const at = c.at || w.sentAt;
      if (c.text) out.push({ key: w.id + ':fix', mine: 'teacher', at, correction: { original: w.text, fixed: c.text, grade: c.grade } });
      if (c.note) out.push({ key: w.id + ':note', mine: 'teacher', at, text: c.note });
      if (c.audio) out.push({ key: w.id + ':audio', mine: 'teacher', at, audio: c.audio, seconds: c.seconds });
    }
  });
  return out.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
}

function chatFmtTime(iso) {
  const d = new Date(iso || Date.now());
  return d.toLocaleTimeString(chatSay('pt-BR', 'en-US'), { hour: '2-digit', minute: '2-digit' });
}
function chatFmtDay(iso) {
  const d = new Date(iso || Date.now());
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(d)) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}
// What the conversation shows (chatFmtDay stays Portuguese: the inbox compares it).
function chatFmtDayShown(iso) {
  const pt = chatFmtDay(iso);
  if (pt === 'Hoje') return chatSay(pt, 'Today');
  if (pt === 'Ontem') return chatSay(pt, 'Yesterday');
  return chatSay(pt, new Date(iso || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }));
}
const chatFmtSecs = s => `${Math.floor((s || 0) / 60)}:${String(Math.round((s || 0) % 60)).padStart(2, '0')}`;

// What each side has not read yet.
function chatUnreadForTeacher(studentId) {
  return chatList(studentId).filter(w => !chatIsTeacherItem(w) && !w.seen && !chatHasReply(w.correction)).length;
}
function chatTeacherMessageIds(studentId) {
  const ids = [];
  chatList(studentId).forEach(w => { if (chatIsTeacherItem(w) || chatHasReply(w.correction)) ids.push(w.id); });
  return ids;
}
function chatUnreadForStudent(studentId) {
  const seen = typeof shareSeenReplies === 'function' ? shareSeenReplies(studentId) : [];
  return chatTeacherMessageIds(studentId).filter(id => !seen.includes(id)).length;
}

// ---------------------------------------------------------------------------
// Voice recorder (the same low-bitrate settings as before: the audio lives
// inside the synced data, not in a file).
// ---------------------------------------------------------------------------
function chatRecorder() {
  let rec = null, stream = null, chunks = [], started = 0, cancelled = false, resolveDone = null;
  const supported = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  async function start() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = []; cancelled = false;
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    const mimeType = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = null;
      const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
      if (cancelled) { if (resolveDone) resolveDone(null); return; }
      const fr = new FileReader();
      fr.onload = () => { if (resolveDone) resolveDone({ audio: fr.result, seconds }); };
      fr.readAsDataURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    };
    rec.start();
    started = Date.now();
  }
  // Resolves with { audio, seconds }, or null when cancelled.
  function finish(cancel) {
    return new Promise(resolve => {
      resolveDone = resolve; cancelled = Boolean(cancel);
      try { rec.stop(); } catch (e) { resolve(null); }
    });
  }
  return { supported, start, finish, elapsed: () => Math.round((Date.now() - started) / 1000) };
}

// ---------------------------------------------------------------------------
// The conversation window. role: 'student' | 'teacher'.
// ---------------------------------------------------------------------------
function openChat(opts) {
  const role = opts.role === 'teacher' ? 'teacher' : 'student';
  const student = opts.student;
  if (!student) return;
  const sid = student.id;
  const me = role;                       // whose bubbles go on the right
  const title = role === 'teacher' ? `${student.avatar || '🙂'} ${student.name}` : chatSay('👩‍🏫 Minha teacher', '👩‍🏫 My teacher');
  const sub = role === 'teacher' ? 'Conversa com o aluno' : chatSay('Escreva ou mande um áudio', 'Write or send a voice message');

  const rec = chatRecorder();
  let recTimer = null, recording = false, lastCount = -1, lastSig = '';

  openModal(`
    <div class="modal-content-pad chat-pad">
      <div class="chat-wrap">
        <div class="chat-head">
          ${role === 'teacher' && opts.onBack ? '<button type="button" class="chat-back" id="chatBack" aria-label="Voltar para as conversas">←</button>' : ''}
          <div class="chat-head-text"><h3 id="modalTitle">${chatEsc(title)}</h3><span>${chatEsc(sub)}</span></div>
        </div>
        <div class="chat-list" id="chatList" aria-live="polite"></div>
        <div class="chat-composer" id="chatComposer"></div>
      </div>
    </div>`, true);

  const listEl = document.getElementById('chatList');
  const composer = document.getElementById('chatComposer');

  const markRead = () => {
    if (role === 'teacher') {
      const list = chatList(sid);
      let changed = false;
      list.forEach(w => { if (!chatIsTeacherItem(w) && !w.seen) { w.seen = true; changed = true; } });
      if (changed) { chatSave(sid, list); if (typeof refreshInboxBadge === 'function') refreshInboxBadge(); }
    } else if (typeof shareMarkRepliesSeen === 'function') {
      shareMarkRepliesSeen(sid, chatTeacherMessageIds(sid));
    }
  };

  function bubbleHTML(m) {
    const side = m.mine === me ? 'out' : 'in';
    let body = '';
    if (m.essay) {
      body += `<div class="chat-essay"><b>✍️ ${chatEsc(m.essay.prompt || chatSay('Texto', 'Text'))}</b>
        <p>${chatEsc(m.text || '').slice(0, 280)}${(m.text || '').length > 280 ? '…' : ''}</p>
        <small>${m.essay.words || 0} ${chatSay('palavras', m.essay.words === 1 ? 'word' : 'words')}${m.essay.corrected ? chatSay(' · corrigido ✅', ' · corrected ✅') : ''}</small>
        ${role === 'teacher' ? `<button type="button" class="chat-essay-btn" data-essay="${chatEsc(m.essay.id)}">${m.essay.corrected ? '👁️ Ver correção' : '🖊️ Corrigir'}</button>` : ''}</div>`;
    } else if (m.correction) {
      body += `<div class="chat-fix"><b>✏️ ${chatSay('Correção', 'Correction')}</b>
        <p class="sk-diff">${typeof skDiffHTML === 'function' ? skDiffHTML(skDiff(m.correction.original, m.correction.fixed)) : chatEsc(m.correction.fixed)}</p>
        ${m.correction.grade ? `<small>${chatSay('Nota:', 'Grade:')} <b>${chatEsc(m.correction.grade)}</b></small>` : ''}</div>`;
    } else if (m.audio) {
      body += `<div class="chat-audio"><button type="button" class="ca-play" aria-label="${chatSay('Ouvir', 'Listen')}">▶︎</button>
        <div class="ca-bar"><i></i></div><span class="ca-time">${chatFmtSecs(m.seconds)}</span>
        <audio preload="none" src="${chatEsc(m.audio)}"></audio></div>`;
    } else if (m.text) {
      body += `<p class="chat-text">${chatEsc(m.text)}</p>`;
    }
    return `<div class="chat-msg chat-msg--${side}"><div class="chat-bubble">${body}<span class="chat-time">${chatFmtTime(m.at)}</span></div></div>`;
  }

  function paintList(force) {
    const msgs = chatMessages(sid);
    const sig = msgs.map(m => m.key).join('|');
    if (!force && sig === lastSig) return;
    // Do not rebuild under a voice message that is playing.
    if (listEl.querySelector('audio') && [...listEl.querySelectorAll('audio')].some(a => !a.paused)) return;
    const nearBottom = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 80;
    lastSig = sig;
    if (!msgs.length) {
      listEl.innerHTML = `<div class="chat-empty"><span>💬</span><p>${role === 'teacher' ? 'Ainda não há mensagens com este aluno.' : chatSay('Mande uma mensagem ou um áudio para a sua teacher!', 'Send a message or a voice message to your teacher!')}</p></div>`;
    } else {
      let day = '';
      listEl.innerHTML = msgs.map(m => {
        const d = chatFmtDayShown(m.at);
        const sep = d !== day ? `<div class="chat-day"><span>${chatEsc(d)}</span></div>` : '';
        day = d;
        return sep + bubbleHTML(m);
      }).join('');
    }
    if (nearBottom || lastCount < 0 || msgs.length > lastCount) listEl.scrollTop = listEl.scrollHeight;
    lastCount = msgs.length;
  }

  // ---- sending -------------------------------------------------------------
  function addMessage(item) {
    const list = chatList(sid);
    list.unshift(Object.assign({ id: (role === 'teacher' ? 'mt' : 'ms') + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), sentAt: new Date().toISOString(), status: 'sent', words: 0 }, item,
      role === 'teacher' ? { from: 'teacher', seen: true, promptId: 'chat', prompt: '' } : {}));
    chatSave(sid, list);
    if (typeof IGSound !== 'undefined') IGSound.click();
    paintList(true);
    paintComposer();
  }
  const sendText = text => {
    const t = String(text || '').trim();
    if (!t) return;
    addMessage(role === 'teacher' ? { text: t } : { promptId: 'chat', prompt: '💬 Message', text: t, words: t.split(/\s+/).length });
  };
  const sendAudio = r => {
    if (!r || !r.audio) return;
    addMessage(role === 'teacher' ? { audio: r.audio, seconds: r.seconds } : { promptId: 'audio', prompt: '🎤 Audio message', text: '', audio: r.audio, seconds: r.seconds });
  };

  // ---- composer ------------------------------------------------------------
  function paintComposer(note) {
    if (recording) {
      composer.innerHTML = `
        <button type="button" class="chat-cancel" id="chatCancel" aria-label="${chatSay('Cancelar', 'Cancel')}">🗑️</button>
        <div class="chat-recording"><span class="chat-rec-dot"></span><b id="chatRecTime">0:00</b><small>${chatSay('gravando… toque em ➤ para enviar', 'recording… tap ➤ to send')}</small></div>
        <button type="button" class="chat-send" id="chatSendRec" aria-label="${chatSay('Enviar áudio', 'Send voice message')}">➤</button>`;
      composer.querySelector('#chatCancel').addEventListener('click', () => stopRecording(true));
      composer.querySelector('#chatSendRec').addEventListener('click', () => stopRecording(false));
      return;
    }
    composer.innerHTML = `
      ${note ? `<p class="chat-note">${chatEsc(note)}</p>` : ''}
      <textarea id="chatInput" rows="1" placeholder="${role === 'teacher' ? 'Escreva uma mensagem…' : 'Write a message…'}" aria-label="${chatSay('Mensagem', 'Message')}"></textarea>
      <button type="button" class="chat-send chat-send--mic" id="chatAction" aria-label="${chatSay('Gravar áudio', 'Record a voice message')}">🎤</button>`;
    const input = composer.querySelector('#chatInput');
    const action = composer.querySelector('#chatAction');
    const sync = () => {
      const has = input.value.trim().length > 0;
      action.textContent = has ? '➤' : '🎤';
      action.setAttribute('aria-label', has ? chatSay('Enviar', 'Send') : chatSay('Gravar áudio', 'Record a voice message'));
      action.classList.toggle('chat-send--mic', !has);
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    };
    input.addEventListener('input', sync);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (input.value.trim()) { sendText(input.value); } }
    });
    action.addEventListener('click', () => {
      if (input.value.trim()) { sendText(input.value); return; }
      startRecording();
    });
  }

  async function startRecording() {
    if (!rec.supported) { paintComposer(chatSay('Este aparelho não grava áudio pelo navegador. Tente pelo Chrome ou Safari atualizado.', 'This device can’t record audio in the browser. Try an updated Chrome or Safari.')); return; }
    try { await rec.start(); }
    catch (e) { paintComposer(chatSay('🎤 O microfone não foi liberado. Toque no cadeado ao lado do endereço do site e permita o microfone.', '🎤 The microphone is blocked. Tap the lock next to the website address and allow the microphone.')); return; }
    recording = true;
    paintComposer();
    clearInterval(recTimer);
    recTimer = setInterval(() => {
      const el = document.getElementById('chatRecTime');
      if (!el) { clearInterval(recTimer); return; }
      const s = rec.elapsed();
      el.textContent = chatFmtSecs(s);
      if (s >= CHAT_MAX_SECONDS) stopRecording(false);
    }, 250);
  }
  async function stopRecording(cancel) {
    if (!recording) return;
    recording = false;
    clearInterval(recTimer);
    const r = await rec.finish(cancel);
    paintComposer();
    if (!cancel) sendAudio(r);
  }

  // ---- playing voice messages (one at a time) -------------------------------
  listEl.addEventListener('click', e => {
    const essayBtn = e.target.closest && e.target.closest('[data-essay]');
    if (essayBtn && typeof openWritingDesk === 'function') { openWritingDesk(sid, essayBtn.dataset.essay); return; }
    const btn = e.target.closest && e.target.closest('.ca-play');
    if (!btn) return;
    const box = btn.closest('.chat-audio');
    const audio = box.querySelector('audio');
    listEl.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); });
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  });
  const audioEvent = e => {
    if (!e.target || e.target.tagName !== 'AUDIO') return;
    const box = e.target.closest('.chat-audio');
    if (!box) return;
    const a = e.target;
    box.classList.toggle('playing', !a.paused && !a.ended);
    box.querySelector('.ca-play').textContent = !a.paused && !a.ended ? '❚❚' : '▶︎';
    const fill = box.querySelector('.ca-bar i');
    if (fill) fill.style.width = a.duration && isFinite(a.duration) ? `${(a.currentTime / a.duration) * 100}%` : '0%';
    if (e.type === 'ended' && fill) fill.style.width = '0%';
  };
  ['timeupdate', 'play', 'pause', 'ended'].forEach(ev => listEl.addEventListener(ev, audioEvent, true));

  // ---- live updates ---------------------------------------------------------
  const live = () => { if (document.getElementById('chatList') !== listEl) return false; markRead(); paintList(false); return true; };
  const unsubscribe = [];
  const onActivity = () => { live(); };
  window.addEventListener('ig:student-activity', onActivity);
  unsubscribe.push(() => window.removeEventListener('ig:student-activity', onActivity));
  const poll = setInterval(async () => {
    if (document.getElementById('chatList') !== listEl) { clearInterval(poll); unsubscribe.forEach(f => f()); return; }
    if (role === 'student' && typeof ShareMode !== 'undefined' && ShareMode.refreshMessages) { try { await ShareMode.refreshMessages(); } catch (e) { /* offline */ } }
    live();
  }, 12000);

  const back = document.getElementById('chatBack');
  if (back) back.addEventListener('click', () => { clearInterval(poll); opts.onBack(); });

  markRead();
  paintList(true);
  paintComposer();
  if (role === 'student' && typeof ShareMode !== 'undefined' && ShareMode.refreshMessages) {
    ShareMode.refreshMessages().then(() => live()).catch(() => {});
  }
  setTimeout(() => { const i = document.getElementById('chatInput'); if (i && window.innerWidth > 640) i.focus(); }, 150);
}

// ---------------------------------------------------------------------------
// The teacher's conversation list (the ✉️ button).
// ---------------------------------------------------------------------------
function openTeacherInbox() {
  const students = typeof loadStudents === 'function' ? loadStudents() : [];
  const rows = students.map(st => {
    const msgs = chatMessages(st.id);
    const last = msgs[msgs.length - 1];
    return { st, last, unread: chatUnreadForTeacher(st.id), count: msgs.length };
  });
  const talking = rows.filter(r => r.count).sort((a, b) => new Date(b.last.at || 0) - new Date(a.last.at || 0));
  const others = rows.filter(r => !r.count);
  const essays = typeof skAllSubmissions === 'function' ? skAllSubmissions().filter(chatIsEssay) : [];
  const essaysPending = essays.filter(w => !(w.correction && (w.correction.text || w.correction.note || w.correction.audio))).length;

  const preview = m => m.audio ? '🎤 Mensagem de voz' : m.essay ? `✍️ ${m.essay.prompt || 'Texto'}` : m.correction ? '✏️ Correção' : String(m.text || '').slice(0, 60);
  const rowHTML = r => `
    <button type="button" class="chat-conv${r.unread ? ' unread' : ''}" data-student="${chatEsc(r.st.id)}">
      <span class="chat-conv-avatar" style="background:${chatEsc(r.st.color || '#e8dde3')}">${chatEsc(r.st.avatar || '🙂')}</span>
      <span class="chat-conv-main">
        <b>${chatEsc(r.st.name)}</b>
        <small>${r.last ? `${r.last.mine === 'teacher' ? 'Você: ' : ''}${chatEsc(preview(r.last))}` : 'Toque para começar'}</small>
      </span>
      <span class="chat-conv-meta">${r.last ? `<small>${chatEsc(chatFmtDay(r.last.at) === 'Hoje' ? chatFmtTime(r.last.at) : chatFmtDay(r.last.at))}</small>` : ''}${r.unread ? `<i class="chat-badge">${r.unread > 9 ? '9+' : r.unread}</i>` : ''}</span>
    </button>`;

  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">✉️ Mensagens</h3>
      ${essays.length ? `<button type="button" class="chat-essays" id="chatEssays">✍️ Textos para corrigir <b>${essaysPending ? `${essaysPending} aguardando` : `${essays.length} no total`}</b></button>` : ''}
      <div class="chat-convs">
        ${talking.length ? talking.map(rowHTML).join('') : '<p class="quiz-empty">Nenhuma conversa ainda. Escolha um aluno abaixo para começar.</p>'}
        ${others.length ? `<p class="chat-others-label">Começar conversa com…</p>${others.map(rowHTML).join('')}` : ''}
      </div>
    </div>`, true);

  document.querySelectorAll('.chat-conv').forEach(btn => btn.addEventListener('click', () => {
    const st = students.find(s => s.id === btn.dataset.student);
    if (st) openChat({ role: 'teacher', student: st, onBack: openTeacherInbox });
  }));
  const ess = document.getElementById('chatEssays');
  if (ess) ess.addEventListener('click', () => { if (typeof openWritingDesk === 'function') openWritingDesk(); });
}
