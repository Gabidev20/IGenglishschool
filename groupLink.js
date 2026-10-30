/* ==========================================================================
   IGenglishschool — ONE link for a whole group, separate progress per member
   --------------------------------------------------------------------------
   A group is still one record (one class log, one class sheet). To give every
   member their own progress, each member ALSO becomes a normal student record
   with its own personal link — the whole per-student machinery (online book,
   practice, homework, mistakes, writing, slides) is reused untouched.

   The GROUP link is only a "Who are you?" page:
     • the teacher side creates the member accounts (syncMembers) and writes
       the roster — [{ n: name, e: emoji, c: member link code }] — into the
       group's `student_access` record, which already travels to that link;
     • the student side (share.js) shows the chooser when the record it got
       has a roster, and sends the person to their own personal link.

   Remembered on the device (localStorage, never the cloud):
     ig_group_pick_<groupCode>  -> the member code picked last time
     ig_group_home_<memberCode> -> the group link this page was reached from
   ========================================================================== */
const GroupLink = (() => {
  const MAX_MEMBERS = 12;
  const EMOJIS = ['🦊', '🐼', '🐯', '🐢', '🐸', '🐙', '🦋', '🚀', '🌈', '⚽', '🎨', '🎸'];
  const COLORS = ['#FF6B6B', '#4ECDC4', '#FFB703', '#A06CD5', '#2EC4B6', '#FF758F', '#3A86FF', '#FF9F1C', '#6D597A', '#E63946', '#457B9D', '#8AC926'];
  const esc = s => igEscapeHtml(String(s == null ? '' : s));

  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } };
  const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };

  // ==========================================================================
  // TEACHER SIDE
  // ==========================================================================
  function namesOf(group) {
    const seen = new Set();
    return (typeof groupMemberNames === 'function' ? groupMemberNames(group.id) : [])
      .map(n => String(n || '').trim()).filter(n => {
        const k = n.toLowerCase();
        if (!n || seen.has(k)) return false;
        seen.add(k); return true;
      });
  }
  function hasMembers(student) {
    return Boolean(student) && typeof isGroupStudent === 'function' && isGroupStudent(student.id) && namesOf(student).length > 0;
  }
  const memberLabel = (name, group) => `${name} (${group.name})`;

  // The member student for a name: by the id stored on the group, else by the
  // groupId/memberName stored on the member (never duplicates).
  function findMember(group, name, students) {
    const ids = getStudentExtra(group.id).memberIds || {};
    const byId = students.find(s => s.id === ids[name]);
    if (byId) return byId;
    return students.find(s => {
      const x = getStudentExtra(s.id);
      return x.groupId === group.id && x.memberName === name;
    }) || null;
  }

  // What is still to do for this group: names without account / without link.
  function status(group) {
    const students = loadStudents();
    const links = shareLoadLinks();
    return namesOf(group).slice(0, MAX_MEMBERS).map(name => {
      const st = findMember(group, name, students);
      return { name, student: st, code: st ? links[st.id] || null : null };
    });
  }
  function pendingCount(group) {
    return status(group).filter(m => !m.student || !m.code).length;
  }

  const isPrivate = group => Boolean(getStudentExtra(group.id).privateLinks);
  function writeRoster(group, rows) {
    // Private mode: every member only has their own link; nothing about the
    // others (names or codes) travels to any link.
    if (isPrivate(group)) { saWrite(group.id, { members: [] }); return; }
    saWrite(group.id, { members: rows.map(m => ({ n: m.name, e: m.student.avatar || '🙂', c: m.code })) });
  }
  function personalLine(member, group, url) {
    return [`Oi, ${member}! Este é o seu link pessoal para praticar inglês 😊`, '', url, '',
      'É só abrir no celular ou no computador — não precisa instalar nada. O seu progresso fica salvo aí, só seu. Não passe este link para os colegas, está bem?'].join('\n');
  }

  // Creates the missing member accounts (never duplicates), makes sure every
  // member has a link code (registered in the cloud BEFORE the roster is
  // written) and publishes the roster on the group's link.
  async function syncMembers(group) {
    const names = namesOf(group).slice(0, MAX_MEMBERS);
    const students = loadStudents();
    const groupExtra = getStudentExtra(group.id);
    const ids = { ...(groupExtra.memberIds || {}) };
    const groupRec = saRecord(group.id);
    const { members: _m, taught: _t, fn: _f, gn: _g, ...template } = groupRec;
    const groupProfile = typeof loadStudentProfiles === 'function' ? loadStudentProfiles()[group.id] || null : null;
    const usedEmoji = new Set(), usedColor = new Set();
    const rows = [];
    let created = 0, changed = false;

    names.forEach(name => {
      const st = findMember(group, name, students);
      if (st) { usedEmoji.add(st.avatar); usedColor.add(st.color); }
    });

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      let st = findMember(group, name, students);
      if (!st) {
        let k = i % EMOJIS.length;
        for (let n = 0; n < EMOJIS.length && usedEmoji.has(EMOJIS[k]); n++) k = (k + 1) % EMOJIS.length;
        let c = i % COLORS.length;
        for (let n = 0; n < COLORS.length && usedColor.has(COLORS[c]); n++) c = (c + 1) % COLORS.length;
        usedEmoji.add(EMOJIS[k]); usedColor.add(COLORS[c]);
        st = {
          id: 'st' + Date.now().toString(36) + i.toString(36) + Math.random().toString(36).slice(2, 5),
          name: memberLabel(name, group),
          age: group.age || null, levelId: group.levelId, tier: group.tier, levelLabel: group.levelLabel,
          avatar: EMOJIS[k], color: COLORS[c],
        };
        students.push(st);
        created++; changed = true;
        if (groupProfile && typeof saveStudentProfile === 'function') saveStudentProfile(st.id, groupProfile);
        // Same book, games and slides settings as the group (teacher notes stay empty).
        saWrite(st.id, { ...template, taught: saComputeTaught(st), fn: name, gn: group.name });
      } else if (st.name !== memberLabel(name, group)) {
        st.name = memberLabel(name, group);          // the group was renamed
        changed = true;
        saWrite(st.id, { fn: name, gn: group.name });
      }
      ids[name] = st.id;
      saveStudentExtra(st.id, { groupId: group.id, memberName: name });
    }
    if (changed) saveStudents(students);
    saveStudentExtra(group.id, { memberIds: ids });

    for (const name of names) {
      const st = students.find(s => s.id === ids[name]);
      const code = await shareEnsureLink(st);
      rows.push({ name, student: st, code });
    }
    writeRoster(group, rows);
    if (typeof renderProfileList === 'function') renderProfileList();
    return { created, total: rows.length };
  }

  // A member's own link was revoked: the chooser must not send anyone to it.
  function onMemberRevoked(student) {
    const gid = typeof studentGroupId === 'function' ? studentGroupId(student.id) : null;
    if (!gid) return;
    const rec = saRecord(gid);
    if (!Array.isArray(rec.members)) return;
    const name = getStudentExtra(student.id).memberName;
    saWrite(gid, { members: rec.members.filter(m => m.n !== name) });
  }

  function shareLine(url, group) {
    return [`Oi! Este é o link da turma de inglês "${group.name}" 😊`, '',
      'Abra, toque no seu nome e faça as atividades — o progresso de cada um fica separado:', url, '',
      'É só abrir no celular ou no computador — não precisa instalar nada.'].join('\n');
  }

  function sectionHTML(group, url) {
    return `
      <div class="grp-box" id="grpBox">
        <h4>👥 Links do grupo</h4>
        <div id="grpPrivateBanner" class="share-note" hidden>
          🔒 <b>Modo privado ligado.</b> Cada pessoa usa <b>só o seu link individual</b> (abaixo): não existe tela de escolha de nomes,
          e ninguém consegue abrir a página dos colegas.
          <div class="game-btn-row" style="margin-top:8px"><button class="game-btn secondary" id="grpPublicOn" type="button">Voltar a usar o link único do grupo</button></div>
        </div>
        <div id="grpPublic">
          <p class="share-lead">Opção 1 — <b>um link para todos</b>: cada um escolhe o seu nome e o progresso
            (livro online, exercícios, lição de casa, erros, escrita) fica <b>separado</b> por pessoa.</p>
          <div class="share-url-box">
            <input type="text" id="grpUrl" readonly value="${esc(url)}" />
            <button class="btn btn-primary" id="grpCopy" type="button">📋 Copiar</button>
          </div>
          <div class="game-btn-row" style="margin-top:10px">
            <button class="game-btn" id="grpWhats" type="button">📱 Copiar mensagem pronta</button>
            <button class="game-btn secondary" id="grpPrivateOn" type="button" title="Desliga o link único: cada pessoa recebe só o seu link, e ninguém vê os outros">🔒 Prefiro links individuais (privado)</button>
          </div>
        </div>
        <div id="grpMembers"></div>
        <p class="share-note">🔒 Quem tiver o link do grupo consegue abrir a página de qualquer membro (aparecem só os nomes e os bonequinhos, nunca o progresso dos outros). Combine com a turma de cada um abrir só o próprio nome.</p>
      </div>`;
  }

  function membersHTML(group, busy) {
    const st = status(group);
    const links = shareLoadLinks();
    const pend = st.filter(m => !m.student || !m.code).length;
    const hidden = Object.keys(getStudentExtra(group.id).memberIds || {}).filter(n => !namesOf(group).includes(n)).length;
    return `
      <p class="grp-sub"><b>Membros</b> (${st.length}) — cada um tem a própria conta e o próprio link:</p>
      <ul class="grp-list">
        ${st.map(m => `
          <li class="grp-row" data-name="${esc(m.name)}">
            <span class="grp-emoji" style="background:${esc(m.student ? m.student.color : '#eee')}">${esc(m.student ? m.student.avatar : '⏳')}</span>
            <span class="grp-info"><b>${esc(m.name)}</b>
              <small>${m.student ? (m.code ? '✅ conta criada' : '⚠️ sem link — clique em criar contas') : '⏳ conta ainda não criada'}</small></span>
            ${m.student && m.code ? `
              <button class="game-btn secondary grp-copy" type="button" data-url="${esc(shareUrlFor(links[m.student.id] || m.code))}">📋 Link dele(a)</button>
              <button class="game-btn grp-msg" type="button" data-url="${esc(shareUrlFor(links[m.student.id] || m.code))}" data-name="${esc(m.name)}" title="Copia uma mensagem pronta para mandar só para ${esc(m.name)}">📱 Mensagem</button>
              <button class="gm-remove-row grp-revoke" type="button" title="Revogar o link individual" aria-label="Revogar o link de ${esc(m.name)}">🚫</button>` : ''}
          </li>`).join('')}
      </ul>
      <div class="game-btn-row">
        <button class="game-btn" id="grpCreate" type="button" ${busy ? 'disabled' : ''}>${busy ? 'Criando…' : pend ? `👥 Criar contas dos membros (${pend})` : '🔄 Atualizar contas dos membros'}</button>
        <button class="game-btn secondary" id="grpApply" type="button" title="Copia livro, jogos liberados e slides do grupo para todos os membros">♻️ Aplicar liberações do grupo a todos</button>
        <button class="game-btn secondary" id="grpAllMsgs" type="button" title="Uma lista com o nome e o link de cada pessoa">📋 Copiar todos os links (lista)</button>
      </div>
      ${hidden ? `<p class="share-note">ℹ️ ${hidden} conta(s) de nomes que você tirou da lista continuam guardadas (com todo o progresso), mas não aparecem mais na escolha.</p>` : ''}
      <p class="share-note">Os membros aparecem na lista de alunos como <b>Nome (${esc(group.name)})</b>: pelo 📖 e pelo 🔗 de cada um você vê o livro e o progresso individual. A aula do grupo continua sendo registrada no aluno-grupo.</p>`;
  }

  async function mountSection(mount, group, url) {
    const holder = mount.querySelector('#grpMembers');
    const copy = (text, btn, label) => {
      const done = () => { const old = btn.dataset.old || btn.textContent; btn.dataset.old = old; btn.textContent = label; setTimeout(() => { btn.textContent = old; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => {});
      else { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } t.remove(); done(); }
    };
    mount.querySelector('#grpCopy').addEventListener('click', e => copy(url, e.currentTarget, '✅ Copiado!'));
    mount.querySelector('#grpWhats').addEventListener('click', e => copy(shareLine(url, group), e.currentTarget, '✅ Copiado!'));

    const applyPrivacy = () => {
      const priv = isPrivate(group);
      const pub = mount.querySelector('#grpPublic'), ban = mount.querySelector('#grpPrivateBanner');
      if (pub) pub.hidden = priv;
      if (ban) ban.hidden = !priv;
    };
    const setPrivate = async on => {
      if (on && !confirm('Ligar o modo privado? O link único do grupo deixa de mostrar os nomes dos colegas. Cada pessoa precisa usar o link individual que você mandar. Quem já abriu o link do grupo continua entrando na própria página normalmente.')) return;
      saveStudentExtra(group.id, { privateLinks: on });
      try { await syncMembers(group); } catch (e) { console.error('group sync', e); }
      applyPrivacy();
      paint(false);
    };
    const onPriv = mount.querySelector('#grpPrivateOn'), offPriv = mount.querySelector('#grpPublicOn');
    if (onPriv) onPriv.addEventListener('click', () => setPrivate(true));
    if (offPriv) offPriv.addEventListener('click', () => setPrivate(false));
    applyPrivacy();
    const paint = busy => {
      holder.innerHTML = membersHTML(group, busy);
      holder.querySelectorAll('.grp-copy').forEach(b => b.addEventListener('click', e => copy(b.dataset.url, e.currentTarget, '✅ Copiado!')));
      holder.querySelectorAll('.grp-msg').forEach(b => b.addEventListener('click', e => copy(personalLine(b.dataset.name, group, b.dataset.url), e.currentTarget, '✅ Copiada!')));
      const allBtn = holder.querySelector('#grpAllMsgs');
      if (allBtn) allBtn.addEventListener('click', e => {
        const lines = status(group).filter(m => m.student && m.code).map(m => `${m.name}: ${shareUrlFor(shareLoadLinks()[m.student.id] || m.code)}`);
        copy(lines.join('\n'), e.currentTarget, '✅ Lista copiada!');
      });
      holder.querySelectorAll('.grp-revoke').forEach(b => b.addEventListener('click', async () => {
        const name = b.closest('.grp-row').dataset.name;
        const m = status(group).find(x => x.name === name);
        if (!m || !m.student) return;
        if (!confirm(`Revogar o link individual de ${name}? Ele(a) deixa de aparecer na escolha do grupo até você clicar em "Criar contas".`)) return;
        await shareRevoke(m.student);
        paint(false);
      }));
      const create = holder.querySelector('#grpCreate');
      if (create) create.addEventListener('click', async () => { paint(true); await run(); });
      holder.querySelector('#grpApply').addEventListener('click', async () => {
        if (!confirm('Copiar o livro, os jogos liberados e os slides do grupo para todos os membros? As escolhas individuais de livro/jogos serão substituídas.')) return;
        const { members: _m, taught: _t, fn: _f, gn: _g, ...template } = saRecord(group.id);
        status(group).forEach(m => { if (m.student) saWrite(m.student.id, { ...template, taught: saComputeTaught(m.student) }); });
        paint(false);
        const btn = holder.querySelector('#grpApply'); if (btn) { btn.textContent = '✅ Aplicado!'; }
      });
    };
    const run = async () => {
      try { await syncMembers(group); } catch (e) { console.error('group sync', e); alert('Não consegui criar as contas agora. Tente de novo.'); }
      paint(false);
    };

    const anyAccount = status(group).some(m => m.student);
    if (!anyAccount) { paint(true); await run(); } else paint(false);   // first open: create automatically
  }

  // Note shown in a MEMBER's own link window.
  function memberNote(student) {
    const gid = typeof studentGroupId === 'function' ? studentGroupId(student.id) : null;
    if (!gid) return '';
    const gname = studentGroupName(student.id);
    return gname ? `<p class="share-note">👥 ${esc(student.name)} faz parte do grupo <b>${esc(gname)}</b>. Este é o link <b>individual</b>; o grupo todo também pode entrar pelo link do grupo.</p>` : '';
  }

  // ==========================================================================
  // STUDENT SIDE
  // ==========================================================================
  function rosterOf(access) {
    if (!access || !Array.isArray(access.members)) return [];
    return access.members.filter(m => m && m.n && /^[A-Za-z0-9_-]{8,}$/.test(String(m.c || ''))).slice(0, MAX_MEMBERS);
  }

  const keepPreview = () => (/[#&]previa=1/.test(window.location.hash || '') ? '&previa=1' : '');

  function goTo(memberCode, groupCode) {
    lsSet('ig_group_pick_' + groupCode, memberCode);
    lsSet('ig_group_home_' + memberCode, groupCode);
    window.location.hash = 'aluno=' + memberCode + keepPreview();
    window.location.reload();
  }

  // Called by ShareMode once the record behind the link is known. Returns
  // true when the chooser took over the screen.
  function studentGate(shell, groupCode, access) {
    const roster = rosterOf(access);
    if (!roster.length) return false;
    const forceChoose = /[#&]escolher=1/.test(window.location.hash || '');
    const last = lsGet('ig_group_pick_' + groupCode);
    const mine = roster.find(m => m.c === last);

    if (mine && !forceChoose) {
      shell.innerHTML = `
        <div class="grp-pick grp-pick--hello">
          <div class="grp-hello-emoji">${esc(mine.e || '🙂')}</div>
          <h1>Olá, ${esc(mine.n)}! 👋</h1>
          <p>Abrindo a sua página…</p>
          <button class="grp-other" id="grpNotMe" type="button">Não sou ${esc(mine.n)} — escolher outro nome</button>
        </div>`;
      let cancelled = false;
      shell.querySelector('#grpNotMe').addEventListener('click', () => { cancelled = true; renderChooser(shell, groupCode, roster); });
      setTimeout(() => { if (!cancelled) goTo(mine.c, groupCode); }, 1000);
      return true;
    }
    renderChooser(shell, groupCode, roster);
    return true;
  }

  function renderChooser(shell, groupCode, roster) {
    shell.innerHTML = `
      <div class="grp-pick">
        <h1>Quem é você? <span>👋</span></h1>
        <p class="grp-pick-sub">Who are you? — toque no seu nome</p>
        <div class="grp-cards">
          ${roster.map((m, i) => `
            <button class="grp-card" type="button" data-i="${i}">
              <span class="grp-card-emoji">${esc(m.e || '🙂')}</span>
              <b>${esc(m.n)}</b>
            </button>`).join('')}
        </div>
        <p class="stu-foot">IG English School</p>
      </div>`;
    shell.querySelectorAll('.grp-card').forEach(b => b.addEventListener('click', () => {
      const m = roster[Number(b.dataset.i)];
      if (m) goTo(m.c, groupCode);
    }));
  }

  // Header button of a member's page when it was reached from a group link.
  function homeCodeFor(memberCode) { return memberCode ? lsGet('ig_group_home_' + memberCode) : null; }
  function backToGroup(memberCode) {
    const g = homeCodeFor(memberCode);
    if (!g) return;
    window.location.hash = 'aluno=' + g + '&escolher=1' + keepPreview();
    window.location.reload();
  }

  return { hasMembers, status, pendingCount, syncMembers, sectionHTML, mountSection, memberNote, onMemberRevoked,
    studentGate, homeCodeFor, backToGroup, rosterOf, MAX_MEMBERS };
})();
