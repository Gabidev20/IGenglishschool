/* ==========================================================================
   IGenglishschool — "Meu progresso"
   The student's own page: what they have been doing, how the week went, what
   is waiting to be revised, and the stickers they earned. Everything here is
   read from the activity log in learnerData.js — nothing new is stored.
   ========================================================================== */

function spEsc(s) { return igEscapeHtml(String(s == null ? '' : s)); }

function spLevelLabel(student) {
  if (!student) return '';
  return typeof igLevelText === 'function' ? igLevelText(student) : (student.levelLabel || '');
}

// A week of practice as a row of bars: height from the day's attempts, the
// green part from what was right.
// `english` (14+) shows the day names and the tooltip in English.
const SP_DAYS_EN = { dom: 'Sun', seg: 'Mon', ter: 'Tue', qua: 'Wed', qui: 'Thu', sex: 'Fri', 'sáb': 'Sat' };
function spWeekChartHTML(week, english) {
  const max = Math.max(4, ...week.map(d => d.total));
  return `
    <div class="sp-week">
      ${week.map(d => `
        <div class="sp-day" title="${english ? `${d.total} exercises · ${d.right} right` : `${d.total} exercícios · ${d.right} certos`}">
          <div class="sp-bar">
            <div class="sp-bar-total" style="height:${Math.round((d.total / max) * 100)}%">
              <div class="sp-bar-right" style="height:${d.total ? Math.round((d.right / d.total) * 100) : 0}%"></div>
            </div>
          </div>
          <span class="sp-day-label">${english ? (SP_DAYS_EN[d.label] || d.label) : d.label}</span>
          <span class="sp-day-count">${d.total || ''}</span>
        </div>`).join('')}
    </div>`;
}

function spStatCard(icon, value, label, tone) {
  return `
    <div class="sp-stat ${tone || ''}">
      <span class="sp-stat-icon">${icon}</span>
      <b>${value}</b>
      <small>${label}</small>
    </div>`;
}

function openStudentProgress(studentId) {
  const id = studentId || (typeof getActiveStudentId === 'function' ? getActiveStudentId() : null);
  if (!id) { alert('Escolha um aluno primeiro.'); return; }
  const student = (typeof loadStudents === 'function' ? loadStudents() : []).find(s => s.id === id);
  if (!student) { alert('Aluno não encontrado.'); return; }

  openModal(`
    <div class="modal-content-pad">
      <div id="spMount"></div>
    </div>`, true);
  paintStudentProgress(document.getElementById('spMount'), student);
}

function paintStudentProgress(mount, student) {
  if (!mount) return;
  const stats = typeof ldStats === 'function' ? ldStats(student.id) : null;
  const progress = typeof loadProgress === 'function' ? loadProgress(student.id) : { xp: 0, stars: 0, stickers: [] };
  const stickers = typeof getStickers === 'function' ? getStickers(student.id) : [];
  const earned = stickers.filter(s => (progress.stickers || []).indexOf(s.id) !== -1);
  const next = stickers.find(s => (progress.stickers || []).indexOf(s.id) === -1);
  // Stickers are for children; learners of 14+ see their progress without them.
  const grownLook = typeof igGrownLook === 'function' && igGrownLook(student);
  // 14+: the page is in English only (every word is input).
  const say = (pt, eng) => (grownLook ? eng : pt);
  const homework = typeof hwForStudent === 'function' ? hwForStudent(student.id) : [];
  const pending = homework.filter(h => typeof hwIsDone === 'function' && !hwIsDone(h));
  const writings = typeof SkillsModules !== 'undefined' ? SkillsModules.loadWriting(student.id) : [];
  const corrected = writings.filter(w => w.correction && w.correction.text);

  const topTopics = Object.keys(stats ? stats.byTopic : {})
    .map(k => ({ topic: k, ...stats.byTopic[k] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  mount.innerHTML = `
    <div class="sp-hero" style="--sp-color:${spEsc(student.color || '#8e6d86')}">
      <span class="sp-avatar">${spEsc(student.avatar || '🙂')}</span>
      <div class="sp-hero-text">
        <h3 id="modalTitle">${say('Meu progresso', 'My progress')} — ${spEsc(student.name)}</h3>
        <p>${spEsc(spLevelLabel(student))} · ${progress.xp || 0} XP · ${progress.stars || 0} ⭐</p>
      </div>
      <button class="game-btn secondary" id="spCertificate">🏅 ${say('Certificado', 'Certificate')}</button>
    </div>

    <div class="sp-stats">
      ${spStatCard('🔥', stats ? stats.streak : 0, stats && stats.streak === 1 ? say('dia seguido', 'day in a row') : say('dias seguidos', 'days in a row'), stats && stats.streak >= 3 ? 'hot' : '')}
      ${spStatCard('✅', stats ? `${stats.weekAccuracy}%` : '0%', say('acerto na semana', 'right this week'))}
      ${spStatCard('🎯', stats ? stats.weekTotal : 0, say('exercícios na semana', 'exercises this week'))}
      ${spStatCard('🧠', stats ? stats.bank.mastered : 0, say('questões dominadas', 'questions mastered'))}
    </div>

    <div class="sp-panel">
      <h4 class="watch-h">📅 ${say('Minha semana', 'My week')}</h4>
      ${stats ? spWeekChartHTML(stats.week, grownLook) : ''}
      <p class="sp-legend"><i class="sp-key total"></i> ${say('exercícios', 'exercises')} &nbsp; <i class="sp-key right"></i> ${say('acertos', 'right answers')}</p>
    </div>

    ${stats && stats.bank.due ? `
      <div class="sp-panel sp-review">
        <div>
          <h4 class="watch-h">🔁 ${say('Para revisar hoje', 'To review today')}</h4>
          <p>${say(`${stats.bank.due} questão(ões) que você errou estão esperando. Revisar agora é o que faz ficar na cabeça.`, `${stats.bank.due} question${stats.bank.due === 1 ? '' : 's'} you got wrong ${stats.bank.due === 1 ? 'is' : 'are'} waiting. Review now and it will stick.`)}</p>
        </div>
        <button class="btn btn-primary" id="spReview">${say('Revisar agora', 'Review now')}</button>
      </div>` : `
      <div class="sp-panel sp-review is-clear">
        <div>
          <h4 class="watch-h">🔁 ${say('Revisão', 'Review')}</h4>
          <p>${say('Nada pendente para revisar.', 'Nothing to review.')} ${stats && stats.bank.total ? say('Continue assim!', 'Keep it up!') : say('Jogue um pouco para começar a montar sua lista.', 'Play a little to start your list.')}</p>
        </div>
      </div>`}

    ${pending.length ? `
      <div class="sp-panel sp-homework">
        <h4 class="watch-h">📚 ${say('Lição de casa', 'Homework')}</h4>
        ${pending.map(h => {
          const p = hwProgress(h);
          return `
            <div class="sp-hw-row">
              <div>
                <b>${spEsc(h.title)}</b>
                <small>${p.done}/${p.total} ${say('tarefas', 'tasks')} · ${hwDueLabel(h)}</small>
              </div>
              <button class="game-btn" data-hw="${h.id}">▶️ ${say('Fazer', 'Start')}</button>
            </div>`;
        }).join('')}
      </div>` : ''}

    ${topTopics.length ? `
      <div class="sp-panel">
        <h4 class="watch-h">📊 ${say('Onde eu mais treinei', 'What I practiced most')}</h4>
        <div class="sp-topics">
          ${topTopics.map(t => {
            const pct = t.total ? Math.round((t.right / t.total) * 100) : 0;
            return `
              <div class="sp-topic">
                <div class="sp-topic-head"><span>${spEsc(t.topic)}</span><b>${pct}%</b></div>
                <div class="sp-topic-bar"><div style="width:${pct}%" class="${pct >= 70 ? 'good' : pct >= 50 ? 'mid' : 'low'}"></div></div>
                <small>${t.total} ${say('exercício', 'exercise')}${t.total === 1 ? '' : 's'}</small>
              </div>`;
          }).join('')}
        </div>
      </div>` : ''}

    ${grownLook ? '' : `<div class="sp-panel">
      <h4 class="watch-h">🏅 Minhas figurinhas <small>${earned.length}/${stickers.length}</small></h4>
      <div class="sp-stickers">
        ${stickers.map(s => {
          const has = (progress.stickers || []).indexOf(s.id) !== -1;
          return `<span class="sp-sticker ${has ? 'has' : ''}" title="${spEsc(s.name)} — ${s.threshold} ⭐">${has ? spEsc(s.emoji) : '🔒'}</span>`;
        }).join('')}
      </div>
      ${next ? `<p class="sp-next">Faltam <b>${Math.max(0, next.threshold - (progress.stars || 0))} ⭐</b> para ganhar ${spEsc(next.emoji)} ${spEsc(next.name)}.</p>` : '<p class="sp-next">Você ganhou todas! 🎉</p>'}
    </div>`}

    ${corrected.length ? `
      <div class="sp-panel">
        <h4 class="watch-h">✍️ ${say('Meus textos corrigidos', 'My corrected texts')}</h4>
        ${corrected.slice(0, 3).map(w => SkillsModules.submissionHTML(w)).join('')}
      </div>` : ''}
  `;

  const review = mount.querySelector('#spReview');
  if (review) review.addEventListener('click', () => openReviewSession(student.id));

  const cert = mount.querySelector('#spCertificate');
  if (cert) cert.addEventListener('click', () => {
    if (typeof openCertificate === 'function') openCertificate(student.id);
    else alert('Certificados ainda não disponíveis.');
  });

  mount.querySelectorAll('[data-hw]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hw = hwLoad().find(h => h.id === btn.dataset.hw);
      if (hw) openHomeworkRunner(hw, () => paintStudentProgress(mount, student));
    });
  });
}
