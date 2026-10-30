/* ==========================================================================
   IGenglishschool — Class mistakes & the parents' weekly report
   Two tabs of the teacher's dashboard (dashboard.js):

   🔁 Erros da turma — every student's error bank put together: the words
      (and questions) the class missed most in the chosen period, who missed
      each one, and one tap to play a game with exactly those words.

   📲 Relatório dos pais — a short weekly note per student, written from what
      the site already knows (practice on the link, right answers, words
      learned and still missed, homework, stars), ready to send on WhatsApp
      with one tap. WhatsApp does not let a website send by itself, so the
      notes are prepared and the teacher sends each one; the tab keeps
      count of who already got this week's.
   ========================================================================== */

const CI_CONTACTS_KEY = 'parent_contacts';       // studentId -> { phone }
const CI_SENT_KEY = 'parent_report_sent';        // studentId -> 'YYYY-Www'
const ciEsc = s => igEscapeHtml(String(s == null ? '' : s));
const ciDay = 86400000;

// ---------------------------------------------------------------------------
// 🔁 CLASS MISTAKES
// ---------------------------------------------------------------------------
let ciErrDays = 14, ciErrStudent = '';

// Every error card of every student, newest activity within `days`.
function ciGatherErrors(days, onlyStudent) {
  const since = days ? Date.now() - days * ciDay : 0;
  const words = new Map(), questions = new Map();
  (typeof loadStudents === 'function' ? loadStudents() : []).forEach(st => {
    if (onlyStudent && st.id !== onlyStudent) return;
    const bank = typeof ldLoadBank === 'function' ? ldLoadBank(st.id) : {};
    Object.values(bank).forEach(c => {
      if (!c || !c.item || !c.wrong) return;
      if (typeof LD_MASTERED_BOX !== 'undefined' && c.box >= LD_MASTERED_BOX) return;   // learned since
      const when = new Date(c.last || c.added || 0).getTime();
      if (since && when < since) return;
      const it = c.item;
      const isWord = it.kind === 'vocab' || it.kind === 'word';
      const key = isWord ? String(it.prompt || '').toLowerCase() : `${it.prompt}|${it.correct}`;
      if (!key) return;
      const map = isWord ? words : questions;
      const row = map.get(key) || { key, item: it, wrong: 0, students: [] };
      row.wrong += c.wrong;
      if (!row.students.some(s => s.id === st.id)) row.students.push(st);
      if (!row.item.emoji && it.emoji) row.item = it;
      map.set(key, row);
    });
  });
  const rank = (a, b) => (b.students.length - a.students.length) || (b.wrong - a.wrong);
  return { words: [...words.values()].sort(rank), questions: [...questions.values()].sort(rank) };
}

const ciWordPic = it => (typeof igWordVisualHTML === 'function'
  ? igWordVisualHTML({ en: it.prompt, pt: it.pt, emoji: it.emoji, image: it.image }, 'ci-pic') : '');

function dashPaintErrors(pane) {
  const students = typeof loadStudents === 'function' ? loadStudents() : [];
  const { words, questions } = ciGatherErrors(ciErrDays, ciErrStudent);
  const avatars = list => list.slice(0, 6).map(s => `<span class="ci-av" title="${ciEsc(s.name)}" style="--who:${ciEsc(s.color || '#8e6d86')}">${ciEsc(s.avatar || '🙂')}</span>`).join('') + (list.length > 6 ? `<small>+${list.length - 6}</small>` : '');
  pane.innerHTML = `
    <div class="dash-pane-head">
      <div class="dash-nav ci-filters">
        ${[[7, '7 dias'], [14, '2 semanas'], [30, '30 dias'], [0, 'Tudo']].map(([d, l]) => `<button type="button" class="dash-nav-today${ciErrDays === d ? ' on' : ''}" data-days="${d}">${l}</button>`).join('')}
        <select class="hw-select" data-who>
          <option value="">👥 Todos os alunos</option>
          ${students.map(s => `<option value="${ciEsc(s.id)}" ${ciErrStudent === s.id ? 'selected' : ''}>${ciEsc(s.avatar || '')} ${ciEsc(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="dash-pane-actions">
        <span class="dash-pill">${words.length} palavra(s) · ${questions.length} pergunta(s)</span>
      </div>
    </div>
    ${!words.length && !questions.length ? `
      <div class="dash-empty"><span>🎉</span><p><strong>Nenhum erro pendente nesse período.</strong><br/>
        Os erros aparecem aqui quando os alunos jogam e praticam — na aula ou pelo link.</p></div>` : ''}
    ${words.length ? `
      <h4 class="ci-h">🔤 Palavras que mais erraram <small>marque as que quer revisar</small></h4>
      <div class="ci-words">
        ${words.slice(0, 40).map((r, i) => `
          <label class="ci-word">
            <input type="checkbox" data-word="${i}" ${i < 12 ? 'checked' : ''} />
            ${ciWordPic(r.item)}
            <span class="ci-word-text"><b>${ciEsc(r.item.prompt)}</b>${r.item.pt ? `<small>${ciEsc(r.item.pt)}</small>` : ''}</span>
            <span class="ci-who">${avatars(r.students)}</span>
            <span class="ci-count" title="erros">✖ ${r.wrong}</span>
          </label>`).join('')}
      </div>
      <div class="game-btn-row ci-actions">
        <button type="button" class="btn btn-primary" data-play="ready">🎮 Jogar com as marcadas</button>
        ${typeof openJumpGame === 'function' ? '<button type="button" class="game-btn secondary" data-play="jump">🦖 Jump &amp; Learn</button>' : ''}
        <span class="ci-hint" data-hint></span>
      </div>` : ''}
    ${questions.length ? `
      <h4 class="ci-h">❓ Perguntas que mais erraram</h4>
      <div class="ci-questions">
        ${questions.slice(0, 20).map(r => `
          <div class="ci-q">
            <span class="ci-q-text">${ciEsc(r.item.prompt)}<small>✔ ${ciEsc(r.item.correct)}${r.item.topic ? ` · ${ciEsc(r.item.topic)}` : ''}</small></span>
            <span class="ci-who">${avatars(r.students)}</span>
            <span class="ci-count">✖ ${r.wrong}</span>
          </div>`).join('')}
      </div>` : ''}`;

  pane.querySelectorAll('[data-days]').forEach(b => b.addEventListener('click', () => { ciErrDays = Number(b.dataset.days); dashPaintErrors(pane); }));
  const who = pane.querySelector('[data-who]');
  if (who) who.addEventListener('change', () => { ciErrStudent = who.value; dashPaintErrors(pane); });
  const picked = () => [...pane.querySelectorAll('[data-word]:checked')].map(b => words[Number(b.dataset.word)].item)
    .map(it => ({ id: 'ci_' + String(it.prompt).toLowerCase().replace(/\W+/g, '_'), en: it.prompt, pt: it.pt || '', emoji: it.emoji || '', image: it.image || '' }));
  pane.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => {
    const list = picked();
    const hint = pane.querySelector('[data-hint]');
    if (list.length < 3) { if (hint) hint.textContent = 'Marque pelo menos 3 palavras.'; return; }
    if (b.dataset.play === 'jump') { openJumpGame({ words: list, title: 'Class mistakes' }); return; }
    const topic = { id: 'class-mistakes', title: 'Class mistakes', emoji: '🔁', words: list };
    if (typeof openReadyGame === 'function') openReadyGame(topic, 'memory', '🔁 Erros da turma');
  }));
}

// ---------------------------------------------------------------------------
// 📲 THE PARENTS' WEEKLY REPORT
// ---------------------------------------------------------------------------
function ciWeekKey(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / ciDay + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
const ciContacts = () => { const v = IGStore.getJSON(CI_CONTACTS_KEY, {}); return v && typeof v === 'object' ? v : {}; };
const ciSent = () => { const v = IGStore.getJSON(CI_SENT_KEY, {}); return v && typeof v === 'object' ? v : {}; };

// What happened this week for one student, from what the site already keeps.
function ciWeekFacts(st) {
  const since = Date.now() - 7 * ciDay;
  const log = (typeof ldLoadLog === 'function' ? ldLoadLog(st.id) : []).filter(a => new Date(a.t).getTime() >= since);
  const days = new Set(log.map(a => String(a.t).slice(0, 10))).size;
  const right = log.filter(a => a.ok).length;
  const pct = log.length ? Math.round(right / log.length * 100) : null;
  const bank = typeof ldLoadBank === 'function' ? Object.values(ldLoadBank(st.id)) : [];
  const word = c => c && c.item && (c.item.kind === 'vocab' || c.item.kind === 'word');
  const recent = c => new Date(c.last || c.added || 0).getTime() >= since;
  const missing = bank.filter(c => word(c) && c.wrong && recent(c) && c.box < (typeof LD_MASTERED_BOX !== 'undefined' ? LD_MASTERED_BOX : 4))
    .sort((a, b) => b.wrong - a.wrong).slice(0, 5).map(c => c.item.prompt);
  const learned = bank.filter(c => word(c) && c.right && recent(c) && c.box >= 2)
    .sort((a, b) => b.box - a.box).slice(0, 5).map(c => c.item.prompt);
  const hw = (typeof hwForStudent === 'function' ? hwForStudent(st.id) : []);
  const hwWeek = hw.filter(h => new Date(h.sentAt || h.createdAt || 0).getTime() >= since - 7 * ciDay);
  const hwDone = hwWeek.filter(h => typeof hwIsDone === 'function' && hwIsDone(h)).length;
  const progress = typeof loadProgress === 'function' ? loadProgress(st.id) : {};
  return { log: log.length, days, pct, missing, learned, hwTotal: hwWeek.length, hwDone, stars: progress.stars || 0 };
}

function ciReportText(st, f, teacherName) {
  const name = st.name;
  const lines = [`Olá! 😊 Aqui vai o resumo da semana de *${name}* no inglês:`, ''];
  if (f.log) lines.push(`🎮 Praticou em *${f.days} dia(s)* esta semana (${f.log} atividades nos jogos)${f.pct != null ? ` e acertou *${f.pct}%*` : ''}.`);
  else lines.push('🎮 Esta semana não houve prática pelo link. Que tal 10 minutinhos por dia? O link é o mesmo de sempre. 💪');
  if (f.hwTotal) lines.push(f.hwDone === f.hwTotal ? `📚 Lição de casa: *tudo feito* (${f.hwDone}/${f.hwTotal}) 🎉` : `📚 Lição de casa: ${f.hwDone} de ${f.hwTotal} feita(s) — ainda dá tempo!`);
  if (f.learned.length) lines.push(`🌟 Palavras que já está dominando: ${f.learned.map(w => `*${w}*`).join(', ')}.`);
  if (f.missing.length) lines.push(`🔁 Para treinar mais: ${f.missing.map(w => `*${w}*`).join(', ')}.`);
  lines.push(`⭐ Estrelas no total: ${f.stars}.`);
  lines.push('', `Obrigada pela parceria! ${teacherName ? `— Teacher ${teacherName}` : ''}`.trim());
  return lines.join('\n');
}

function dashPaintParents(pane) {
  const students = typeof loadStudents === 'function' ? loadStudents() : [];
  const week = ciWeekKey(new Date());
  const sent = ciSent(), contacts = ciContacts();
  const teacherName = String(IGStore.getJSON('parent_report_sign', '') || '');
  const doneCount = students.filter(s => sent[s.id] === week).length;
  pane.innerHTML = `
    <div class="dash-pane-head">
      <p class="ci-lead">📲 O resumo da semana de cada aluno, pronto para mandar aos pais. Confira, mude o que quiser e toque em <b>Enviar</b> — abre o WhatsApp com a mensagem escrita.</p>
      <div class="dash-pane-actions">
        <label class="ci-sign">Assinatura: Teacher <input type="text" data-sign value="${ciEsc(teacherName)}" placeholder="seu nome" /></label>
        <span class="dash-pill">${doneCount}/${students.length} enviados esta semana</span>
      </div>
    </div>
    <div class="ci-reports">
      ${students.map(st => {
        const f = ciWeekFacts(st);
        const phone = (contacts[st.id] && contacts[st.id].phone) || '';
        return `
          <div class="ci-report${sent[st.id] === week ? ' sent' : ''}" data-sid="${ciEsc(st.id)}" style="--who:${ciEsc(st.color || '#8e6d86')}">
            <div class="ci-report-head">
              <span class="ci-av big">${ciEsc(st.avatar || '🙂')}</span>
              <b>${ciEsc(st.name)}</b>
              ${sent[st.id] === week ? '<span class="ci-sent">✅ enviado</span>' : ''}
              <input class="ci-phone" type="tel" inputmode="tel" placeholder="WhatsApp dos pais (DDD + número)" value="${ciEsc(phone)}" data-phone />
            </div>
            <textarea class="ci-text" rows="8" data-text>${ciEsc(ciReportText(st, f, teacherName))}</textarea>
            <div class="game-btn-row">
              <button type="button" class="btn btn-primary" data-send>📲 Enviar no WhatsApp</button>
              <button type="button" class="game-btn secondary" data-copy>📋 Copiar</button>
              <button type="button" class="game-btn secondary" data-mark>${sent[st.id] === week ? '↩ Desmarcar' : '✔ Marcar como enviado'}</button>
            </div>
          </div>`;
      }).join('')}
    </div>`;

  const sign = pane.querySelector('[data-sign]');
  if (sign) sign.addEventListener('change', () => { IGStore.setJSON('parent_report_sign', sign.value.trim()); dashPaintParents(pane); });
  const mark = (sid, on) => { const all = ciSent(); if (on) all[sid] = week; else delete all[sid]; IGStore.setJSON(CI_SENT_KEY, all); };
  pane.querySelectorAll('.ci-report').forEach(card => {
    const sid = card.dataset.sid;
    const phoneEl = card.querySelector('[data-phone]');
    phoneEl.addEventListener('change', () => {
      const all = ciContacts();
      all[sid] = { ...(all[sid] || {}), phone: phoneEl.value.trim() };
      IGStore.setJSON(CI_CONTACTS_KEY, all);
    });
    card.querySelector('[data-send]').addEventListener('click', () => {
      let digits = phoneEl.value.replace(/\D/g, '');
      if (digits && digits.length <= 11) digits = '55' + digits;          // a Brazilian number without +55
      const text = card.querySelector('[data-text]').value;
      const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener');
      mark(sid, true);
      dashPaintParents(pane);
    });
    card.querySelector('[data-copy]').addEventListener('click', e => {
      const text = card.querySelector('[data-text]').value;
      const btn = e.currentTarget;
      const done = () => { btn.textContent = '✅ Copiado!'; setTimeout(() => { if (btn.isConnected) btn.textContent = '📋 Copiar'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt('Copie o texto:', text)); else prompt('Copie o texto:', text);
    });
    card.querySelector('[data-mark]').addEventListener('click', () => { mark(sid, sent[sid] !== week); dashPaintParents(pane); });
  });
}

// Friday to Sunday: how many of this week's notes are still to send (for
// the tab's little badge).
function ciParentsDue() {
  const dow = new Date().getDay();
  if (dow !== 5 && dow !== 6 && dow !== 0) return 0;
  const week = ciWeekKey(new Date()), sent = ciSent();
  return (typeof loadStudents === 'function' ? loadStudents() : []).filter(s => sent[s.id] !== week).length;
}
