/* ==========================================================================
   IGenglishschool — 🎤 Audio message to the teacher
   For children who can't write yet: tap the microphone, talk, listen to it,
   send. It travels like a written text (writing_<studentId>, see skills.js),
   so it reaches the teacher's ✉️ inbox and she can answer it there.
   Capped at 30 seconds and recorded at a low bitrate: it is stored inside
   the synced data, not as a file.
   ========================================================================== */

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
            ${w.correction && w.correction.note ? `<p class="am-reply">💬 ${igEscapeHtml(w.correction.note)}</p>` : '<p class="am-wait">⏳</p>'}
          </div>`).join('')}
      </div>`;
  }

  function stopStream() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; }

  function paint() {
    const m = mount();
    if (!m) { stopStream(); clearInterval(tick); return; }
    if (!canRecord) {
      m.innerHTML = `<p class="am-note">Este aparelho não grava áudio pelo navegador. Tente pelo Chrome no celular ou no computador.</p>`;
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
             <p class="rv-done-sub">Enviado para a teacher ✅</p></div>
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
      mount().innerHTML = `<p class="am-note">🎤 O microfone não foi liberado. Toque no cadeado ao lado do endereço do site e permita o microfone.</p>`;
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
          <p class="modal-head-sub"><span class="modal-head-desc">Mandar um áudio para a teacher</span></p>
        </div>
      </div>
      <div id="amMount"></div>
    </div>`, true);
  paint();
  say('Tap the microphone and talk to your teacher!');
}
