/* ==========================================================================
   IGenglishschool — Link do aluno
   Um endereço por aluno que a família abre em casa: ele vê o progresso dele,
   joga, treina e faz a lição — e o que faz volta para a professora.

   COMO O ACESSO FUNCIONA
     A professora gera um código longo e aleatório por aluno. O site aberto com
     `#aluno=<código>` entra em modo aluno: sem painel, sem financeiro, sem os
     outros alunos. O banco continua fechado — a página só fala com ele por
     duas funções que exigem o código (ver supabase-share.sql).

   SEM SUPABASE CONFIGURADO
     O link continua funcionando no MESMO navegador, lendo o que já está
     salvo aqui. Serve para a professora pré-visualizar o que a família vai
     ver, e é como o modo aluno é testado.
   ========================================================================== */

const SHARE_LINKS_KEY = 'share_links';          // { studentId: code }
const SHARE_HASH = /[#&]aluno=([A-Za-z0-9_-]{8,})/;

function shareEsc(s) { return igEscapeHtml(String(s == null ? '' : s)); }

function shareNewCode() {
  const bytes = new Uint8Array(18);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  return btoa(String.fromCharCode.apply(null, bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function shareCodeInUrl() {
  const m = SHARE_HASH.exec(window.location.hash || '');
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// TEACHER SIDE — generating and sharing the link
// ---------------------------------------------------------------------------
function shareLoadLinks() {
  const map = IGStore.getJSON(SHARE_LINKS_KEY, {});
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}
function shareSaveLinks(map) { IGStore.setJSON(SHARE_LINKS_KEY, map); }

function shareUrlFor(code) {
  const base = window.location.href.split('#')[0];
  return `${base}#aluno=${code}`;
}

// Creates the code if this student does not have one yet. The cloud copy is
// what makes the link work on the family's own device; without Supabase the
// code still works on this browser.
async function shareEnsureLink(student) {
  const map = shareLoadLinks();
  let code = map[student.id];
  if (!code) {
    code = shareNewCode();
    map[student.id] = code;
    shareSaveLinks(map);
  }
  if (typeof IGCloud !== 'undefined' && IGCloud.enabled && IGCloud.enabled() && IGCloud.registerShareLink) {
    try { await IGCloud.registerShareLink(code, student); } catch (e) { console.error('share link', e); }
  }
  return code;
}

async function shareRevoke(student) {
  const map = shareLoadLinks();
  const code = map[student.id];
  delete map[student.id];
  shareSaveLinks(map);
  if (code && typeof IGCloud !== 'undefined' && IGCloud.enabled && IGCloud.enabled() && IGCloud.revokeShareLink) {
    try { await IGCloud.revokeShareLink(code); } catch (e) { console.error('share revoke', e); }
  }
}

function openShareLinkModal(studentId) {
  const students = typeof loadStudents === 'function' ? loadStudents() : [];
  const student = students.find(s => s.id === studentId) || students[0];
  if (!student) { alert('Cadastre um aluno primeiro.'); return; }

  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">🔗 Link de ${shareEsc(student.name)}</h3>
      <div id="shareMount"><p class="quiz-empty">Preparando o link…</p></div>
    </div>`, false);

  const mount = document.getElementById('shareMount');

  shareEnsureLink(student).then(code => {
    const url = shareUrlFor(code);
    const cloudOn = typeof IGCloud !== 'undefined' && IGCloud.enabled && IGCloud.enabled();
    mount.innerHTML = `
      <p class="share-lead">Mande este endereço para ${shareEsc(student.name)} ou para a família.
        Quem abrir vê <b>só este aluno</b>: o progresso, a lição de casa, os jogos e os exercícios.</p>

      <div class="share-url-box">
        <input type="text" id="shareUrl" readonly value="${shareEsc(url)}" />
        <button class="btn btn-primary" id="shareCopy">📋 Copiar</button>
      </div>

      <div class="game-btn-row" style="margin-top:10px">
        <button class="game-btn" id="shareWhats">📱 Copiar mensagem pronta</button>
        <button class="game-btn secondary" id="sharePreview">👁️ Ver como o aluno vê</button>
        <button class="game-btn secondary danger" id="shareRevoke">🚫 Revogar link</button>
      </div>

      <div class="share-note ${cloudOn ? 'ok' : 'warn'}">
        ${cloudOn
          ? '✅ Conectado ao Supabase: o link abre em qualquer celular ou computador.'
          : '⚠️ Sem Supabase configurado, este link só funciona <b>neste navegador</b>. Preencha o supabaseConfig.js para que a família consiga abrir do aparelho dela.'}
      </div>

      <p class="share-note">🔒 O código é secreto e longo, como um link do Google Drive. Quem tiver o link vê este aluno — e nada mais do site. Dá para revogar quando quiser.</p>

      ${typeof saEditorHTML === 'function' ? saEditorHTML(student) : ''}`;
    if (typeof saWireEditor === 'function') saWireEditor(mount, student);

    const urlInput = mount.querySelector('#shareUrl');
    const copy = (text, btn, label) => {
      const done = () => { const old = btn.textContent; btn.textContent = label; setTimeout(() => { btn.textContent = old; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => { urlInput.select(); });
      else { urlInput.select(); document.execCommand('copy'); done(); }
    };

    mount.querySelector('#shareCopy').addEventListener('click', e => copy(url, e.currentTarget, '✅ Copiado!'));
    mount.querySelector('#shareWhats').addEventListener('click', e => copy(
      [`Oi! Aqui é a aula de inglês de ${student.name} 😊`,
       '',
       'Neste link dá para ver o progresso, jogar os jogos e fazer os exercícios em casa:',
       url,
       '',
       'É só abrir no celular ou no computador — não precisa instalar nada.'].join('\n'),
      e.currentTarget, '✅ Copiado!'));
    mount.querySelector('#sharePreview').addEventListener('click', () => {
      closeModal();
      window.location.hash = `aluno=${code}`;
      window.location.reload();
    });
    mount.querySelector('#shareRevoke').addEventListener('click', async () => {
      if (!confirm(`Revogar o link de ${student.name}? O endereço antigo para de funcionar.`)) return;
      await shareRevoke(student);
      closeModal();
    });
  });
}

// ---------------------------------------------------------------------------
// STUDENT SIDE
// ---------------------------------------------------------------------------
const ShareMode = (() => {
  let code = null;
  let studentId = null;
  let cloud = false;
  let pendingLog = 0;          // how much of the log has already been sent
  let flushTimer = null;

  function active() { return Boolean(code); }

  // The whole student experience is the app's own screens reading IGStore, so
  // hydrating means writing the fetched slice into this workspace and letting
  // every existing screen work unchanged.
  function hydrate(data) {
    const st = data.student;
    const student = {
      id: st.id, name: st.name, age: st.age,
      levelId: st.level_id || st.levelId, tier: st.tier,
      levelLabel: st.level_label || st.levelLabel,
      color: st.color, avatar: st.avatar,
    };
    studentId = student.id;
    IGStore.setJSON('students', [student]);
    IGStore.setRaw('active_student', student.id);

    const p = data.progress || {};
    IGStore.setJSON('progress_' + student.id, {
      stars: p.stars || 0, xp: p.xp || 0, stickers: p.stickers || [],
    });
    IGStore.setJSON('log_' + student.id, Array.isArray(data.log) ? data.log : []);
    IGStore.setJSON('bank_' + student.id, data.bank && typeof data.bank === 'object' ? data.bank : {});
    IGStore.setJSON('writing_' + student.id, Array.isArray(data.writing) ? data.writing : []);
    IGStore.setJSON('homework', Array.isArray(data.homework) ? data.homework : []);
    IGStore.setJSON('review_' + student.id, data.review && typeof data.review === 'object' ? data.review : {});
    if (data.profile) IGStore.setJSON('student_profiles', { [student.id]: data.profile });
    // What the teacher opened up for this student (studentAccess.js). Older
    // databases do not send it yet; the link then falls back to the
    // automatic choice, which needs nothing from the server.
    if (data.access && typeof data.access === 'object') IGStore.setJSON('student_access', { [student.id]: data.access });
    if (data.setup && typeof data.setup === 'object') IGStore.setJSON('teacher_setup', data.setup);
    if (data.signature) IGStore.setJSON('cert_signature', data.signature);

    // Anything this student already sent from another device.
    (data.activity || []).forEach(row => applyActivityLocally(row, student.id));
    pendingLog = (IGStore.getJSON('log_' + student.id, []) || []).length;
  }

  function applyActivityLocally(row, sid) {
    const payload = row.payload || {};
    if (row.kind === 'attempt' && Array.isArray(payload.entries)) {
      const log = IGStore.getJSON('log_' + sid, []) || [];
      const seen = new Set(log.map(a => a.t + '|' + a.label));
      payload.entries.forEach(e => { if (!seen.has(e.t + '|' + e.label)) log.push(e); });
      log.sort((a, b) => new Date(a.t) - new Date(b.t));
      IGStore.setJSON('log_' + sid, log);
    } else if (row.kind === 'progress') {
      if (payload.progress) {
        const cur = IGStore.getJSON('progress_' + sid, { stars: 0, xp: 0, stickers: [] });
        IGStore.setJSON('progress_' + sid, {
          stars: Math.max(cur.stars || 0, payload.progress.stars || 0),
          xp: Math.max(cur.xp || 0, payload.progress.xp || 0),
          stickers: [...new Set((cur.stickers || []).concat(payload.progress.stickers || []))],
        });
      }
      if (payload.bank) {
        const cur = IGStore.getJSON('bank_' + sid, {}) || {};
        Object.keys(payload.bank).forEach(k => {
          const mine = cur[k], theirs = payload.bank[k];
          if (!mine || new Date(theirs.last || 0) > new Date(mine.last || 0)) cur[k] = theirs;
        });
        IGStore.setJSON('bank_' + sid, cur);
      }
    } else if (row.kind === 'homework_result' && payload.tasks) {
      const list = IGStore.getJSON('homework', []) || [];
      const hw = list.find(h => h.id === row.id);
      if (hw) {
        payload.tasks.forEach(t => { if (hw.tasks[t.index]) hw.tasks[t.index].result = t.result; });
        IGStore.setJSON('homework', list);
      }
    } else if (row.kind === 'writing' && payload.submission) {
      const list = IGStore.getJSON('writing_' + sid, []) || [];
      if (!list.some(w => w.id === payload.submission.id)) {
        list.unshift(payload.submission);
        IGStore.setJSON('writing_' + sid, list);
      }
    }
  }

  // ---- sending what the student did back -----------------------------------
  async function send(kind, id, payload) {
    if (!cloud) return;
    try {
      const sb = await IGCloud.anonClient();
      await sb.rpc('igenglish_share_write', { p_code: code, p_kind: kind, p_id: id, p_payload: payload });
    } catch (e) { console.error('share write', e); }
  }

  function scheduleFlush() {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 2500);
  }

  async function flush() {
    if (!cloud || !studentId) return;
    const log = IGStore.getJSON('log_' + studentId, []) || [];
    if (log.length > pendingLog) {
      const batch = log.slice(pendingLog);
      pendingLog = log.length;
      await send('attempt', 'b' + Date.now().toString(36), { entries: batch });
    }
    await send('progress', 'state', {
      progress: IGStore.getJSON('progress_' + studentId, {}),
      bank: IGStore.getJSON('bank_' + studentId, {}),
    });
    (IGStore.getJSON('homework', []) || []).forEach(hw => {
      const tasks = hw.tasks
        .map((t, index) => ({ index, result: t.result }))
        .filter(t => t.result);
      if (tasks.length) send('homework_result', hw.id, { tasks });
    });
    (IGStore.getJSON('writing_' + studentId, []) || [])
      .filter(w => !w.correction)
      .forEach(w => send('writing', w.id, { submission: w }));
  }

  // One listener instead of touching every feature: anything the student's
  // screens save locally is mirrored up.
  function watchWrites() {
    if (!IGStore.onWrite) return;
    IGStore.onWrite(key => {
      if (!studentId) return;
      if (key === 'homework' || key.startsWith('progress_') || key.startsWith('log_')
        || key.startsWith('bank_') || key.startsWith('writing_')) scheduleFlush();
    });
    window.addEventListener('beforeunload', () => { try { flush(); } catch (e) {} });
  }

  // ---- boot ----------------------------------------------------------------
  function claim() {
    code = shareCodeInUrl();
    if (!code) {
      // Leaving the link behind must put the browser back where it was: a
      // teacher who previewed a student's page and then opened the site
      // normally would otherwise land inside that student's empty workspace.
      if (String(igWorkspaceId() || '').startsWith('share_')) igSetWorkspace('local');
      return false;
    }
    document.documentElement.classList.add('ig-student-mode');
    // With Supabase on, the family's browser gets a workspace of its own. The
    // same-browser preview keeps the teacher's workspace, because that is
    // where the data it is previewing actually lives.
    if (window.IG_SUPABASE && window.IG_SUPABASE.configured) {
      igSetWorkspace('share_' + code.slice(0, 12));
    }
    window.IG_SHARE_MODE = true;
    return true;
  }

  async function start() {
    if (!code) return;
    const shell = document.createElement('div');
    shell.id = 'studentShell';
    shell.innerHTML = `<div class="stu-loading"><span>📚</span><p>Abrindo…</p></div>`;
    document.body.appendChild(shell);

    cloud = Boolean(window.IG_SUPABASE && window.IG_SUPABASE.configured && typeof IGCloud !== 'undefined' && IGCloud.anonClient);

    if (cloud) {
      try {
        const sb = await IGCloud.anonClient();
        const { data, error } = await sb.rpc('igenglish_share_read', { p_code: code });
        if (error) throw error;
        if (!data || !data.ok) throw new Error(data && data.error ? data.error : 'link_invalid');
        hydrate(data);
      } catch (e) {
        console.error(e);
        // Um link revogado e um erro do servidor são problemas diferentes, e
        // dizer "link inválido" para os dois manda a família pedir um link
        // novo quando o link estava certo o tempo todo.
        const invalid = e && (e.message === 'link_invalid' || e.message === 'student_missing');
        shell.innerHTML = invalid
          ? `<div class="stu-loading">
               <span>🔒</span>
               <p>Este link não está mais válido.</p>
               <small>Peça um link novo para a professora.</small>
             </div>`
          : `<div class="stu-loading">
               <span>⚠️</span>
               <p>Não consegui abrir agora.</p>
               <small>Tente de novo em alguns minutos. Se continuar, mostre esta mensagem para a professora:<br>
                 <code class="stu-err">${shareEsc((e && (e.message || e.hint)) || 'erro desconhecido')}</code></small>
             </div>`;
        return;
      }
    } else {
      // Same-browser preview: the data is already here, just point at the
      // student the code belongs to.
      const map = shareLoadLinks();
      const sid = Object.keys(map).find(k => map[k] === code);
      const student = (typeof loadStudents === 'function' ? loadStudents() : []).find(s => s.id === sid);
      if (!student) {
        shell.innerHTML = `<div class="stu-loading"><span>🔒</span><p>Link não encontrado neste navegador.</p>
          <small>Configure o Supabase para que ele funcione em outros aparelhos.</small></div>`;
        return;
      }
      studentId = student.id;
      pendingLog = (IGStore.getJSON('log_' + studentId, []) || []).length;
    }

    watchWrites();
    renderStudentHome(shell, studentId);
  }

  return { claim, start, active, flush, applyActivityLocally, get studentId() { return studentId; } };
})();

// ---------------------------------------------------------------------------
// THE STUDENT'S HOME SCREEN
// ---------------------------------------------------------------------------
function renderStudentHome(shell, studentId) {
  const student = (typeof loadStudents === 'function' ? loadStudents() : []).find(s => s.id === studentId);
  if (!student) return;
  const progress = loadProgress(student.id);
  const stats = typeof ldStats === 'function' ? ldStats(student.id) : null;
  const homework = typeof hwForStudent === 'function' ? hwForStudent(student.id) : [];
  const pending = homework.filter(h => !hwIsDone(h));
  const due = stats ? stats.bank.due : 0;

  // Only what this student has been given (studentAccess.js): the
  // vocabulary of their level and the grammar already taught in class.
  const levelTopics = typeof saAllowedTopics === 'function'
    ? saAllowedTopics(student)
    : (typeof LEVELS !== 'undefined' ? LEVELS : [])
      .filter(l => l.id === student.levelId)
      .flatMap(l => (l.topics || []).map(t => ({ ...t, levelId: l.id })));
  const gameOk = id => (typeof saGameAllowed === 'function' ? saGameAllowed(student, id) : true);
  const practiceTopics = typeof saAllowedPractice === 'function' ? saAllowedPractice(student) : null;
  // Older students also play with their hobbies vocabulary — first, so it is easy to find.
  const extraTopics = typeof studentProfile === 'function' && studentProfile(student) === 'writer' && typeof HOBBIES_TOPIC !== 'undefined'
    && (!practiceTopics || practiceTopics.some(t => t.id === 'easy-hobbies'))
    ? [{ ...HOBBIES_TOPIC, levelId: 'extra' }] : [];
  const topics = extraTopics.concat(levelTopics);

  // English first, Portuguese underneath: the page is part of the lesson.
  const mistakes = typeof msCards === 'function' ? msCards(student.id).filter(c => !msPracticedToday(c)).length : due;
  const review = typeof latestReview === 'function' ? latestReview(student.id) : null;
  const tile = (go, icon, en, pt, cls) => `
        <button class="stu-tile${cls ? ' ' + cls : ''}" data-go="${go}"><span>${icon}</span><b>${en}</b><small>${pt}</small></button>`;

  // What each kind of learner gets (profiles.js).
  const prof = typeof studentProfile === 'function' ? studentProfile(student) : 'writer';
  const T = {
    progress: () => tile('progress', '📈', 'My progress', 'Meu progresso — estrelas e figurinhas'),
    homework: () => tile('homework', '📚', 'My homework', pending.length ? `Minha lição — ${pending.length} pendente(s)` : 'Minha lição — tudo em dia 🎉'),
    review: () => (review ? tile('review-class', '🧠', 'Class review', `Revisão da aula — ${shareEsc(review.title || 'flashcards')}`, 'stu-tile--review') : ''),
    games: () => tile('games', '🎮', prof === 'adult' ? 'Topics & games' : 'Games', prof === 'adult' ? 'Vocabulário, leitura e jogos dos meus tópicos' : 'Jogos com as palavras do meu nível'),
    colors: () => tile('colors', '🎨', 'Colors', 'Cores — ouvir, tocar e falar', 'stu-tile--review'),
    backpack: () => tile('backpack', '🎒', 'Backpack', 'Mochila — school objects'),
    house: () => tile('house', '🏠', 'House', 'Casa — parts of the house'),
    animals: () => tile('animals', '🦁', 'Animals', 'Animais'),
    feelings: () => tile('feelings', '😊', 'Feelings', 'Sentimentos'),
    music: () => tile('instruments', '🎸', 'Music', 'Música — instrumentos'),
    where: () => tile('prepositions', '📦', 'Where is it?', 'Onde está? — preposições'),
    weather: () => tile('weather', '🌦️', 'Weather', 'Clima'),
    body: () => tile('body', '🧍', 'My body', 'Partes do corpo'),
    practice: () => (practiceTopics && !practiceTopics.length ? '' : tile('practice', '⚡', 'Practice',
      `Treinar — ${shareEsc((practiceTopics || []).slice(0, 3).map(t => t.label.split(' (')[0]).join(', ') || 'exercícios do meu nível')}${practiceTopics && practiceTopics.length > 3 ? '…' : ''}`)),
    writingPractice: () => (practiceTopics && !practiceTopics.length ? '' : tile('writing-practice', '📝', 'Writing practice', 'Treinar a escrita — completar e montar frases')),
    dictation: () => tile('dictation', '🎧', 'Dictation', 'Ditado — ouvir e escrever'),
    speaking: () => tile('speaking', '🎤', 'Speaking', 'Falar — ler em voz alta'),
    write: () => tile('writing', '✍️', 'Write to my teacher', 'Escrever uma mensagem para a teacher'),
    audio: () => tile('audio', '🎙️', 'Talk to my teacher', 'Mandar um áudio para a teacher'),
    mistakes: () => tile('review', '🔁', 'My mistakes', mistakes ? `Meus erros — ${mistakes} para revisar` : 'Meus erros — nada pendente'),
  };
  // The picture games are tiles of their own; the teacher can switch each
  // one off in the link window.
  const READY_TILE = { colors: 'colors', feelings: 'feelings', weather: 'weather', animals: 'animals', music: 'music', house: 'house', where: 'where', backpack: 'backpack', body: 'body' };
  // A grown-up's page leads with the skill their teacher said matters most.
  const adultSkills = () => {
    const order = { speaking: ['speaking', 'audio'], listening: ['dictation'], writing: ['write', 'writingPractice'], reading: ['games'], grammar: ['practice'] };
    const focus = typeof teacherSkills === 'function' ? teacherSkills() : [];
    const lead = [...new Set(focus.flatMap(f => order[f] || []))];
    const rest = ['speaking', 'dictation', 'write', 'games', 'practice', 'writingPractice', 'audio'].filter(k => !lead.includes(k));
    return ['homework', 'review'].concat(lead, rest, ['mistakes', 'progress']);
  };
  const tilesFor = p => ({
    // Can't read yet: pictures and voice only — no writing, no reading.
    prereader: ['review', 'colors', 'feelings', 'weather', 'body', 'animals', 'music', 'house', 'where', 'audio', 'mistakes', 'progress', 'homework'],
    reader: ['progress', 'homework', 'review', 'games', 'backpack', 'house', 'animals', 'feelings', 'music', 'where', 'weather', 'body', 'practice', 'dictation', 'speaking', 'write', 'mistakes'],
    writer: ['progress', 'homework', 'review', 'practice', 'writingPractice', 'write', 'dictation', 'speaking', 'games', 'mistakes'],
    adult: adultSkills(),
  }[p] || [])
    .filter(k => !READY_TILE[k] || gameOk(READY_TILE[k]))
    .filter(k => k !== 'games' || topics.length)
    .map(k => T[k]());

  shell.innerHTML = `
    <div class="stu-wrap">
      <header class="stu-header" style="--stu-color:${shareEsc(student.color || '#8e6d86')}">
        <span class="stu-avatar">${shareEsc(student.avatar || '🙂')}</span>
        <div>
          <h1>Hello, ${shareEsc(student.name)}! 👋</h1>
          <p>${shareEsc(student.levelLabel || (typeof levelOption === 'function' ? levelOption(student.levelId).levelLabel : ''))}
             · ${progress.xp || 0} XP · ${progress.stars || 0} ⭐
             ${stats && stats.streak ? ` · 🔥 ${stats.streak} day${stats.streak === 1 ? '' : 's'}` : ''}</p>
        </div>
        <button class="stu-help" id="stuHelpBtn" type="button" title="Ver o tutorial de novo">❓ <span>Ajuda</span></button>
      </header>

      ${pending.length ? `
        <div class="stu-alert">
          <div>
            <b>📚 You have homework!</b>
            <small>Você tem ${pending.length} lição(ões) esperando por você</small>
          </div>
          <button class="btn btn-primary" data-go="homework">Let's go!</button>
        </div>` : ''}

      ${mistakes ? `
        <div class="stu-alert soft">
          <div>
            <b>🔁 ${mistakes} word${mistakes === 1 ? '' : 's'} to review</b>
            <small>As que você errou — revisar hoje faz elas grudarem</small>
          </div>
          <button class="btn btn-primary" data-go="review">Review</button>
        </div>` : ''}

      <div class="stu-tiles${prof === 'prereader' ? ' stu-tiles--big' : ''}">
        ${tilesFor(prof).join('')}
      </div>

      <p class="stu-foot">IG English School · your teacher sees what you do here ✨<br><small>a teacher vê o que você faz aqui</small><br><small class="stu-credit">Emoji graphics: Twemoji (CC-BY 4.0)</small></p>
    </div>`;

  const go = {
    progress: () => openStudentProgress(student.id),
    homework: () => {
      const hw = pending[0] || homework[0];
      if (!hw) { alert('Nenhuma lição por enquanto. 🎉'); return; }
      openHomeworkRunner(hw, () => renderStudentHome(shell, studentId));
    },
    review: () => openMistakes(student.id),
    games: () => openStudentGames(shell, student, topics),
    backpack: () => openBackpackGame(),
    house: () => openHouseGame(),
    'review-class': () => { const r = latestReview(student.id); if (r) openClassReviewPlayer(r); },
    animals: () => openAnimalGame(),
    feelings: () => openFeelingsGame(),
    instruments: () => openInstrumentsGame(),
    prepositions: () => openPrepositionsGame(),
    weather: () => openWeatherGame(),
    body: () => openBodyGame(),
    colors: () => openColorsGame(),
    audio: () => openAudioMessage(student),
    'writing-practice': () => openWritingPractice(student.id, practiceTopics),
    practice: () => {
      if (prof === 'reader' && typeof openKidsPractice === 'function') { openKidsPractice(practiceTopics); return; }
      if (prof === 'writer' && typeof openWriterPractice === 'function') { openWriterPractice(practiceTopics); return; }
      const picked = practiceTopics || (typeof EXAM_TOPICS !== 'undefined' ? EXAM_TOPICS : []).slice(0, 6);
      if (!picked.length) return;
      openExamGames({
        id: 'free', title: 'Treino livre',
        topicIds: picked.map(t => t.id), topicLabels: picked.map(t => t.label),
        createdAt: new Date().toISOString(), count: 0, parts: [], items: [],
      });
    },
    // Dictation and Speaking read sentences from the topics this student
    // has been given, not from the whole bank.
    dictation: () => openDictationModal({ studentId: student.id, source: 'home', lines: shareLinesFor(topics) }),
    speaking: () => openSpeakingModal({ studentId: student.id, source: 'home', lines: shareLinesFor(topics) }),
    writing: () => (typeof openProfileWriting === 'function' ? openProfileWriting(student) : openWritingModal({ studentId: student.id })),
  };
  shell.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => {
      // A child who can't read hears the button's name.
      if (prof === 'prereader' && 'speechSynthesis' in window) {
        try { const u = new SpeechSynthesisUtterance((btn.querySelector('b') || btn).textContent); u.lang = 'en-US'; u.rate = 0.85; window.speechSynthesis.speak(u); } catch (e) {}
      }
      const fn = go[btn.dataset.go]; if (fn) fn();
    });
  });

  // First visit: the step-by-step tour for the student and the family.
  // Afterwards the ❓ Ajuda button in the header replays it.
  if (typeof StudentTour !== 'undefined') StudentTour.attach(shell, student, prof);
}

// Practice sentences from the student's own topics, for Dictation and
// Speaking. Null when there are too few — the skills module then picks
// level-appropriate sentences itself.
function shareLinesFor(topics) {
  if (typeof lkSentences !== 'function') return null;
  const all = [];
  (topics || []).forEach(t => lkSentences(t).forEach(x => { if (!all.includes(x)) all.push(x); }));
  if (all.length < 4) return null;
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  return all.slice(0, 10);
}

function openStudentGames(shell, student, topics) {
  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">🎮 Escolha um tópico para jogar</h3>
      <div class="stu-topic-grid">
        ${topics.map(t => `
          <button class="stu-topic" data-topic="${shareEsc(t.levelId)}:${shareEsc(t.id)}">
            <span>${shareEsc(t.emoji || '🎯')}</span>
            <b>${shareEsc(t.title)}</b>
          </button>`).join('')}
      </div>
    </div>`, true);

  document.querySelectorAll('[data-topic]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [levelId, topicId] = btn.dataset.topic.split(':');
      const topic = topics.find(t => t.levelId === levelId && t.id === topicId) || null;
      if (!topic) return;
      const games = typeof gamesForTopic === 'function' ? gamesForTopic(topic) : [];
      if (!games.length) { alert('Este tópico ainda não tem jogos.'); return; }
      let active = games[0].id;
      openModal(`
        <div class="modal-content-pad">
          <h3 id="modalTitle">${shareEsc(topic.emoji || '🎮')} ${shareEsc(topic.title)}</h3>
          <div class="game-picker" id="stuGamePicker">
            ${games.map(g => `<button class="game-pick-btn ${g.id === active ? 'active' : ''}" data-game="${g.id}">${g.icon} ${g.label}</button>`).join('')}
          </div>
          <div class="game-mount" id="stuGameMount"></div>
        </div>`, true);
      const mountGame = () => GameEngine.mount(document.getElementById('stuGameMount'), topic, active);
      document.querySelectorAll('#stuGamePicker .game-pick-btn').forEach(b => {
        b.addEventListener('click', () => {
          active = b.dataset.game;
          document.querySelectorAll('#stuGamePicker .game-pick-btn').forEach(x => x.classList.toggle('active', x === b));
          mountGame();
        });
      });
      mountGame();
    });
  });
}

// ---------------------------------------------------------------------------
// BOOT — claimed synchronously so the teacher's page never flashes
// ---------------------------------------------------------------------------
// A public game link (#jogo=…, publicGame.js) is never a student's link.
if (typeof ShareMode !== 'undefined' && !window.IG_PUBLIC_GAME && ShareMode.claim()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ShareMode.start());
  } else {
    ShareMode.start();
  }
}
