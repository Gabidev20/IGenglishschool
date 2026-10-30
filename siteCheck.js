/* ==========================================================================
   IGenglishschool — 🩺 Site check (for the teacher)
   One button that checks the whole site in about half a minute:
     • errors since the page opened (index.html collects them from the start
       — a broken file shows here, like the duplicate name that once stopped
       printing from loading)
     • every part and game is loaded, and every ready game opens (silently)
     • Supabase answers, and the live channel of the online games opens
     • the ABC recordings and the pictures (Twemoji) load
     • the browser can speak and listen
   The report can be copied and pasted to whoever is fixing the site.
   ========================================================================== */

const SC_PARTS = [
  ['Livro online', 'LivroOnline'], ['Jogos (motor)', 'GameEngine'], ['Nuvem (Supabase)', 'IGCloud'], ['Link do aluno', 'ShareMode'],
  ['Lição de casa', 'openHomeworkBuilder'], ['Mensagens dos alunos', 'openWritingDesk'], ['Impressão', 'openPrintables'],
  ['Relatórios', 'openReportsModal'], ['Erros da turma', 'dashPaintErrors'], ['Relatório dos pais', 'dashPaintParents'],
  ['Avatar', 'openAvatarBuilder'], ['Menu de jogos do livro', 'openGamesMenu'], ['Revisão da aula', 'openClassReviewPlayer'],
];
const SC_GAMES = [
  ['ABC', 'openAlphabetGame'], ['Colors', 'openColorsGame'], ['Body Parts', 'openBodyGame'], ['Feelings', 'openFeelingsGame'],
  ['Weather', 'openWeatherGame'], ['Animals', 'openAnimalGame'], ['Music', 'openInstrumentsGame'], ['House', 'openHouseGame'],
  ['Where is it?', 'openPrepositionsGame'], ['Backpack', 'openBackpackGame'], ['Who am I?', 'openWhoAmI'], ['Maze Muncher', 'openMazeGame'],
  ['Jump & Learn', 'openJumpGame'], ['Old MacDonald', 'openFarmGame'], ['Touch it!', 'openTouchGame'], ['Pizza Shop', 'openShopGame'],
  ['Sound Detective', 'openSoundGame'], ['Talking Memory', 'openTalkMemoryGame'], ['Say it!', 'openSayItGame'], ['Live Quiz', 'openLiveQuiz'],
];

const scGlobal = name => { try { return (0, eval)(`typeof ${name} !== 'undefined' ? ${name} : undefined`); } catch (e) { return undefined; } };
const scWait = ms => new Promise(r => setTimeout(r, ms));
const scTimeout = (p, ms) => Promise.race([p, scWait(ms).then(() => { throw new Error('timeout'); })]);

function openSiteCheck() {
  openModal(`
    <div class="modal-content-pad sc">
      <h3 id="modalTitle">🩺 Testar o site</h3>
      <p class="sc-lead">Confere se tudo carrega e funciona neste navegador. Leva uns 30 segundos — os jogos abrem e fecham sozinhos, sem som.</p>
      <div class="an-done-actions"><button type="button" class="btn btn-primary" data-run>▶ Começar o teste</button></div>
      <div id="scOut"></div>
    </div>`, true);
  document.querySelector('.sc [data-run]').addEventListener('click', scRun);
}

async function scRun() {
  const results = [];        // [state, area, what, detail]  state: ok | warn | fail
  const out = () => document.getElementById('scOut');
  const add = (state, area, what, detail) => { results.push([state, area, what, detail || '']); paint(); };
  const paint = () => {
    const el = out(); if (!el) return;
    const icon = { ok: '✅', warn: '⚠️', fail: '❌' };
    const areas = [...new Set(results.map(r => r[1]))];
    el.innerHTML = areas.map(a => `
      <h4 class="sc-area">${igEscapeHtml(a)}</h4>
      <ul class="sc-list">${results.filter(r => r[1] === a).map(r => `<li class="sc-${r[0]}">${icon[r[0]]} ${igEscapeHtml(r[2])}${r[3] ? ` <small>${igEscapeHtml(r[3])}</small>` : ''}</li>`).join('')}</ul>`).join('');
  };
  const runBtn = document.querySelector('.sc [data-run]');
  if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ Testando…'; }

  // ---- 1. errors since the page opened ----------------------------------------
  const early = (window.__igErrors || []).slice();
  if (!early.length) add('ok', 'Erros no site', 'Nenhum erro desde que a página abriu');
  else early.slice(0, 10).forEach(e => add('fail', 'Erros no site', e.msg, e.where));

  // ---- 2. the parts of the site ----------------------------------------------
  SC_PARTS.forEach(([label, name]) => add(scGlobal(name) ? 'ok' : 'fail', 'Partes do site', label, scGlobal(name) ? '' : `${name} não carregou`));

  // ---- 3. every game opens (muted, one by one) ---------------------------------
  const wasMuted = typeof IGSound !== 'undefined' && IGSound.muted();
  const speak = window.speechSynthesis && window.speechSynthesis.speak;
  try { if (typeof IGSound !== 'undefined') IGSound.setMuted(true); } catch (e) { /* ignore */ }
  if (speak) window.speechSynthesis.speak = () => {};
  const keepHash = location.hash;
  const report = [];
  for (const [label, name] of SC_GAMES) {
    const fn = scGlobal(name);
    if (typeof fn !== 'function') { report.push(['fail', label, 'não carregou']); continue; }
    const before = (window.__igErrors || []).length;
    let state = 'ok', detail = '';
    try {
      // the live quiz and maze must not open a room during the test
      if (name === 'openLiveQuiz' || name === 'openMazeGame') history.replaceState(null, '', location.pathname + location.search);
      fn();
      await scWait(350);
      const body = document.getElementById('modalBody');
      // Picture-only games have no text: buttons, pictures or a canvas count.
      if (!body || (!body.textContent.trim() && !body.querySelector('button, canvas, svg, img'))) { state = 'fail'; detail = 'abriu vazio'; }
    } catch (e) { state = 'fail'; detail = e.message || String(e); }
    const after = (window.__igErrors || []).slice(before);
    if (after.length) { state = 'fail'; detail = after[0].msg; }
    report.push([state, label, detail]);
    try { closeModal(); } catch (e) { /* ignore */ }
    await scWait(80);
  }
  if (keepHash) try { history.replaceState(null, '', keepHash); } catch (e) { /* ignore */ }
  try { if (typeof IGSound !== 'undefined') IGSound.setMuted(wasMuted); } catch (e) { /* ignore */ }
  if (speak) window.speechSynthesis.speak = speak;
  // the check's own window was closed by the games: open it again
  openSiteCheck();
  const rb = document.querySelector('.sc [data-run]'); if (rb) { rb.disabled = true; rb.textContent = '⏳ Testando…'; }
  report.forEach(([s, l, d]) => add(s, 'Jogos (abrir)', l, d));

  // ---- 4. Supabase and the live channel ---------------------------------------
  const cfg = window.IG_SUPABASE;
  if (!cfg || !cfg.url || !cfg.anonKey) add('warn', 'Internet e nuvem', 'Supabase não configurado', 'tudo fica só neste navegador');
  else {
    try {
      const r = await scTimeout(fetch(`${cfg.url}/rest/v1/`, { headers: { apikey: cfg.anonKey } }), 8000);
      add(r.ok || r.status === 404 || r.status === 401 ? 'ok' : 'warn', 'Internet e nuvem', 'Supabase responde', `status ${r.status}`);
    } catch (e) { add('fail', 'Internet e nuvem', 'Supabase não responde', e.message); }
    if (typeof mzOpenChannel === 'function') {
      try {
        let ok = false;
        const ch = await mzOpenChannel('check-' + Math.random().toString(36).slice(2, 7), s => { if (s === 'SUBSCRIBED') ok = true; });
        for (let i = 0; i < 16 && !ok; i++) await scWait(500);
        ch.close();
        add(ok ? 'ok' : 'fail', 'Internet e nuvem', 'Canal ao vivo (Maze online, Live Quiz)', ok ? '' : 'não abriu em 8 s');
      } catch (e) { add('fail', 'Internet e nuvem', 'Canal ao vivo (Maze online, Live Quiz)', e.message); }
    }
  }

  // ---- 5. files: ABC recordings, pictures ----------------------------------------
  const head = async (url, label, area) => {
    try { const r = await scTimeout(fetch(url, { cache: 'no-store' }), 8000); add(r.ok ? 'ok' : 'fail', area, label, r.ok ? '' : `status ${r.status} — ${url}`); }
    catch (e) { add('fail', area, label, e.message); }
  };
  await head('alphabet/a.wav', 'Áudios do ABC (a.wav)', 'Arquivos');
  await head('alphabet/z.wav', 'Áudios do ABC (z.wav)', 'Arquivos');
  if (typeof IG_TWEMOJI_BASE !== 'undefined') await head(`${IG_TWEMOJI_BASE}1f34e.svg`, 'Figuras dos jogos (Twemoji)', 'Arquivos');
  await head('logo.png', 'Logo', 'Arquivos');

  // ---- 6. voice and microphone --------------------------------------------------
  const hasTTS = 'speechSynthesis' in window;
  let en = 0;
  if (hasTTS) { for (let i = 0; i < 6 && !window.speechSynthesis.getVoices().length; i++) await scWait(300); en = window.speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).length; }
  add(hasTTS ? (en ? 'ok' : 'warn') : 'fail', 'Voz e microfone', 'O navegador fala inglês', hasTTS ? `${en} voz(es) em inglês` : 'sem voz');
  const hasRec = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  add(hasRec ? 'ok' : 'warn', 'Voz e microfone', 'Reconhecimento de fala (ABC, Say it!)', hasRec ? '' : 'use o Chrome ou o Edge');
  try { localStorage.setItem('ig_check', '1'); localStorage.removeItem('ig_check'); add('ok', 'Voz e microfone', 'O navegador guarda dados'); }
  catch (e) { add('fail', 'Voz e microfone', 'O navegador não guarda dados', 'janela anônima?'); }

  // ---- the summary -------------------------------------------------------------
  const fails = results.filter(r => r[0] === 'fail').length, warns = results.filter(r => r[0] === 'warn').length;
  const el = out();
  if (el) {
    el.insertAdjacentHTML('afterbegin', `
      <div class="sc-summary ${fails ? 'bad' : warns ? 'meh' : 'good'}">
        ${fails ? `❌ ${fails} problema(s)` : warns ? `⚠️ Tudo funciona, com ${warns} aviso(s)` : '✅ Tudo certo!'}
        <button type="button" class="game-btn secondary" data-copy>📋 Copiar o relatório</button>
      </div>`);
    el.querySelector('[data-copy]').addEventListener('click', e => {
      const icon = { ok: 'OK', warn: 'AVISO', fail: 'ERRO' };
      const text = [`Teste do site — ${new Date().toLocaleString('pt-BR')} — ${navigator.userAgent}`]
        .concat(results.map(r => `[${icon[r[0]]}] ${r[1]} · ${r[2]}${r[3] ? ' — ' + r[3] : ''}`)).join('\n');
      const btn = e.currentTarget;
      const done = () => { btn.textContent = '✅ Copiado!'; };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt('Copie:', text)); else prompt('Copie:', text);
    });
  }
  const rb2 = document.querySelector('.sc [data-run]'); if (rb2) { rb2.disabled = false; rb2.textContent = '🔄 Testar de novo'; }
}
