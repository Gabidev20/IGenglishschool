/* ==========================================================================
   IGenglishschool — 🎤 Audio message to the teacher
   For children who can't write yet: tap the microphone, talk, listen to it,
   send. It travels like a written text (writing_<studentId>, see skills.js),
   so it reaches the teacher's ✉️ inbox and she can answer it there.
   Capped at 30 seconds and recorded at a low bitrate: it is stored inside
   the synced data, not as a file.
   ========================================================================== */

const amSay = (pt, en) => (typeof igSay === 'function' ? igSay(pt, en) : pt);

const AM_MAX_SECONDS = 30;

function openAudioMessage(student) {
  const canRecord = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  let state = 'idle';                 // idle → recording → ready → sent
  let rec = null, stream = null, chunks = [], started = 0, tick = null, blobUrl = '', dataUrl = '', seconds = 0;

  const say = t => { try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = 0.85; window.speechSynthesis.speak(u); } catch (e) {} };
  const mount = () => document.getElementById('amMount');

  function previous() {
    const list = SkillsModules.loadWriting(student.id).filter(w => w.audio);
    if (!list.length) return '';
    return `
      <div class="am-history">
        ${list.slice(0, 4).map(w => `
          <div class="am-item">
            <audio controls preload="none" src="${igEscapeHtml(w.audio)}"></audio>
            ${w.correction && w.correction.audio ? `<p class="am-reply">🎙️ Teacher:</p><audio controls preload="none" src="${igEscapeHtml(w.correction.audio)}"></audio>` : ''}
            ${w.correction && w.correction.note ? `<p class="am-reply">💬 ${igEscapeHtml(w.correction.note)}</p>` : (w.correction && w.correction.audio ? '' : '<p class="am-wait">⏳</p>')}
          </div>`).join('')}
      </div>`;
  }

  function stopStream() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; }

  function paint() {
    const m = mount();
    if (!m) { stopStream(); clearInterval(tick); return; }
    if (!canRecord) {
      m.innerHTML = `<p class="am-note">${amSay('Este aparelho não grava áudio pelo navegador. Tente pelo Chrome no celular ou no computador.', 'This device can’t record audio in the browser. Try Chrome on your phone or computer.')}</p>`;
      return;
    }
    const body = {
      idle: `<button class="am-mic" data-a="rec" aria-label="Record">🎤</button>`,
      recording: `<button class="am-mic recording" data-a="stop" aria-label="Stop">⏹️</button>
                  <p class="am-time">${seconds}s / ${AM_MAX_SECONDS}s</p>`,
      ready: `<audio controls src="${blobUrl}" class="am-player"></audio>
              <div class="am-actions">
                <button class="cg-big cg-big--soft" data-a="redo" aria-label="Record again">🔄</button>
                <button class="cg-big cg-big--ok" data-a="send" aria-label="Send">📤</button>
              </div>`,
      sent: `<div class="rv-done"><span class="rv-done-emoji">📨</span><p class="rv-done-title">Sent!</p>
             <p class="rv-done-sub">${amSay('Enviado para a teacher ✅', 'Sent to your teacher ✅')}</p></div>
             <button class="cg-big" data-a="again" aria-label="New message">🎤</button>`,
    }[state];
    m.innerHTML = `<div class="am-stage">${body}</div>${previous()}`;
    const on = (a, fn) => { const b = m.querySelector(`[data-a="${a}"]`); if (b) b.addEventListener('click', fn); };
    on('rec', startRec);
    on('stop', stopRec);
    on('redo', () => { state = 'idle'; paint(); });
    on('again', () => { state = 'idle'; paint(); });
    on('send', send);
  }

  async function startRec() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      mount().innerHTML = `<p class="am-note">${amSay('🎤 O microfone não foi liberado. Toque no cadeado ao lado do endereço do site e permita o microfone.', '🎤 The microphone is blocked. Tap the lock next to the website address and allow the microphone.')}</p>`;
      return;
    }
    chunks = [];
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    const mimeType = types.find(t => window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stopStream();
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      blobUrl = URL.createObjectURL(blob);
      const fr = new FileReader();
      fr.onload = () => { dataUrl = fr.result; state = 'ready'; paint(); };
      fr.readAsDataURL(blob);
    };
    rec.start();
    IGSound.click();
    started = Date.now();
    seconds = 0;
    state = 'recording';
    paint();
    tick = setInterval(() => {
      seconds = Math.round((Date.now() - started) / 1000);
      if (!mount()) { clearInterval(tick); try { rec.stop(); } catch (e) {} return; }
      if (seconds >= AM_MAX_SECONDS) { stopRec(); return; }
      const t = mount().querySelector('.am-time');
      if (t) t.textContent = `${seconds}s / ${AM_MAX_SECONDS}s`;
    }, 250);
  }

  function stopRec() {
    clearInterval(tick);
    seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
    try { rec.stop(); } catch (e) { /* already stopped */ }
  }

  function send() {
    if (!dataUrl) return;
    const list = SkillsModules.loadWriting(student.id);
    list.unshift({
      id: 'au' + Date.now().toString(36),
      promptId: 'audio', prompt: '🎤 Audio message',
      text: '', words: 0, audio: dataUrl, seconds,
      sentAt: new Date().toISOString(), status: 'sent',
    });
    SkillsModules.saveWriting(student.id, list);
    IGSound.win();
    say('Great! Your teacher will listen to it!');
    state = 'sent';
    paint();
  }

  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">🎤</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">Talk to my teacher</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">${amSay('Mandar um áudio para a teacher', 'Send a voice message to your teacher')}</span></p>
        </div>
      </div>
      <div id="amMount"></div>
    </div>`, true);
  paint();
  say('Tap the microphone and talk to your teacher!');
}


// ---------------------------------------------------------------------------
// The teacher's side: record a spoken answer to a student's message.
// Same recorder settings as the student's (low bitrate, stored inside the
// synced data). `result()` gives { audio, seconds } for what is on screen.
// ---------------------------------------------------------------------------
const AM_REPLY_MAX_SECONDS = 60;

function amReplyRecorder(host, existing) {
  let audio = existing || '', seconds = 0, rec = null, stream = null, chunks = [], started = 0, tick = null, recording = false;
  const canRecord = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  function paint(msg) {
    if (!host || !document.body.contains(host)) return;
    if (!canRecord) { host.innerHTML = '<p class="am-note">Este navegador não grava áudio. Use o Chrome.</p>'; return; }
    host.innerHTML = `
      <div class="am-reply-rec">
        ${audio ? `<audio controls class="am-player" src="${audio}"></audio>` : ''}
        <div class="game-btn-row">
          ${recording
            ? `<button type="button" class="game-btn" data-a="stop">⏹️ Parar <span class="am-time">0s</span></button>`
            : `<button type="button" class="game-btn secondary" data-a="rec">${audio ? '🔄 Gravar de novo' : '🎤 Gravar resposta'}</button>`}
          ${audio && !recording ? '<button type="button" class="game-btn secondary" data-a="del">🗑️ Remover áudio</button>' : ''}
        </div>
        ${msg ? `<p class="am-note">${msg}</p>` : ''}
      </div>`;
    const on = (k, fn) => { const b = host.querySelector(`[data-a="${k}"]`); if (b) b.addEventListener('click', fn); };
    on('rec', start); on('stop', stop);
    on('del', () => { audio = ''; seconds = 0; paint(); });
  }

  async function start() {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { paint('🎤 O microfone não foi liberado. Permita o microfone no cadeado ao lado do endereço.'); return; }
    chunks = [];
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    const mimeType = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = null; recording = false; clearInterval(tick);
      const fr = new FileReader();
      fr.onload = () => { audio = fr.result; paint(); };
      fr.readAsDataURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    };
    rec.start();
    started = Date.now(); recording = true;
    paint();
    tick = setInterval(() => {
      if (!document.body.contains(host)) { try { rec.stop(); } catch (e) {} return; }
      seconds = Math.round((Date.now() - started) / 1000);
      const t = host.querySelector('.am-time'); if (t) t.textContent = seconds + 's';
      if (seconds >= AM_REPLY_MAX_SECONDS) stop();
    }, 250);
  }
  function stop() { seconds = Math.max(1, Math.round((Date.now() - started) / 1000)); try { rec.stop(); } catch (e) { /* already stopped */ } }

  paint();
  return { result: () => ({ audio, seconds }) };
}
