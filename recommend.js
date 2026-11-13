/* ==========================================================================
   IGenglishschool — "O que reforçar hoje": recommendations before a class

   Everything the platform already records about a student, read together
   and turned into a short list for the teacher, at the top of Today's
   Class and in the student picker. Nothing here saves anything.

   Sources: the last class (notes, homework asked), the homework (late, or
   done with a low score), the error bank (mistakes that come back), the
   class-review memory (weak words), the practice log (days without
   practice, streaks), writing waiting for a correction, and the next topic
   of the level. For a group, the members are read too and named.
   ========================================================================== */

const RK_MAX = 7;
const rkEsc = s => (typeof igEscapeHtml === 'function' ? igEscapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s));
const rkDays = iso => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
const rkShort = name => String(name || '').replace(/\s*\(.*\)$/, '');
const rkFmt = d => { try { return new Date(d + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); } catch (e) { return d; } };
const rkList = (arr, n) => arr.slice(0, n).map(rkEsc).join(' · ') + (arr.length > n ? ` <small>+${arr.length - n}</small>` : '');

function rkMembers(student) {
  if (typeof isGroupStudent !== 'function' || !isGroupStudent(student.id) || typeof studentGroupId !== 'function') return [];
  return loadStudents().filter(s => studentGroupId(s.id) === student.id);
}

// The words and questions this student keeps getting wrong.
function rkMistakes(studentId) {
  if (typeof ldLoadBank !== 'function') return [];
  const mastered = typeof LD_MASTERED_BOX !== 'undefined' ? LD_MASTERED_BOX : 4;
  return Object.values(ldLoadBank(studentId))
    .filter(c => c && c.item && c.wrong >= 1 && c.box < mastered)
    .sort((a, b) => (b.wrong - b.right) - (a.wrong - a.right) || b.wrong - a.wrong)
    .map(c => ({ text: String(c.item.correct || c.item.prompt || '').slice(0, 60), wrong: c.wrong }))
    .filter(x => x.text);
}

// Class-review words still weak (reviewPractice.js memory).
function rkWeakWords(studentId) {
  if (typeof rpMemory !== 'function') return [];
  return Object.values(rpMemory(studentId))
    .filter(m => m && m.rv && m.wrong > 0 && (m.box || 0) <= 1)
    .sort((a, b) => b.wrong - a.wrong)
    .map(m => m.rv.en);
}

// The last real exercise (not a visit) and the streak.
function rkPractice(studentId) {
  const log = typeof ldLoadLog === 'function' ? ldLoadLog(studentId) : [];
  const ex = log.filter(a => typeof ldIsExercise === 'function' ? ldIsExercise(a) : a.kind !== 'visit');
  const last = ex.length ? ex[ex.length - 1].t : null;
  const streak = typeof ldStreak === 'function' ? ldStreak(log) : 0;
  const week = ex.filter(a => rkDays(a.t) <= 7);
  return { last, days: last ? rkDays(last) : null, streak, weekTotal: week.length, weekRight: week.filter(a => a.ok).length };
}

function rkHomework(studentId) {
  if (typeof hwForStudent !== 'function') return { late: [], low: [], pending: [] };
  const list = hwForStudent(studentId);
  const late = list.filter(h => typeof hwDueLabel === 'function' && hwDueLabel(h) === 'atrasada');
  const pending = list.filter(h => h.tasks.some(t => !t.result));
  const low = list.filter(h => typeof hwIsDone === 'function' && hwIsDone(h) && typeof hwScore === 'function' && hwScore(h) != null && hwScore(h) < 70);
  return { late, low, pending };
}

function rkWritingWaiting(studentId) {
  const list = typeof IGStore !== 'undefined' ? IGStore.getJSON('writing_' + studentId, []) || [] : [];
  return Array.isArray(list) ? list.filter(w => w && !w.correction) : [];
}

// The topic after the last one taught, in the student's level.
function rkNextTopic(student, last) {
  if (!last || typeof cockpitFindTopic !== 'function' || typeof LEVELS === 'undefined') return null;
  const found = cockpitFindTopic(last.topicLabel);
  if (!found) return null;
  const topics = found.level.topics;
  const i = topics.indexOf(found.topic);
  return i >= 0 && topics[i + 1] ? { level: found.level, topic: topics[i + 1] } : null;
}

// ---------------------------------------------------------------------------
// THE LIST — [{ icon, tone, title, detail, action }]
//   tone: 'coral' (act on it), 'gold' (worth a look), 'green' (praise)
//   action: { label, kind, arg }
// ---------------------------------------------------------------------------
function rkFor(student) {
  if (!student) return [];
  const out = [];
  const members = rkMembers(student);
  const people = members.length ? members : [student];

  // 1. The last class: how it ended and what was asked.
  const sessions = typeof loadSessions === 'function' ? loadSessions(student.id).slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || (a.createdAt || 0) - (b.createdAt || 0)) : [];
  const last = sessions[sessions.length - 1] || null;
  if (last) {
    const asked = last.sheet && Array.isArray(last.sheet.homework) ? last.sheet.homework.filter(Boolean) : [];
    const notes = String(last.notes || '').trim();
    if (asked.length || notes) {
      out.push({
        icon: '🕘', tone: 'gold',
        title: `Comece retomando a aula de ${rkFmt(last.date)}${last.topicLabel ? ` (${last.topicLabel})` : ''}`,
        detail: [asked.length ? `Lição pedida: ${rkList(asked, 3)}` : '', notes ? `📝 ${rkEsc(notes.length > 140 ? notes.slice(0, 140) + '…' : notes)}` : ''].filter(Boolean).join('<br>'),
      });
    }
  }

  // 2. Homework: late, or done with a low score.
  if (members.length) {
    const lateWho = people.filter(p => rkHomework(p.id).late.length).map(p => rkShort(p.name));
    const lowWho = people.filter(p => rkHomework(p.id).low.length).map(p => rkShort(p.name));
    if (lateWho.length) out.push({ icon: '⏰', tone: 'coral', title: `Lição atrasada: ${lateWho.length} de ${people.length}`, detail: rkList(lateWho, 6), action: { label: 'Ver lições', kind: 'homework' } });
    if (lowWho.length) out.push({ icon: '📉', tone: 'gold', title: 'Lição com nota baixa (menos de 70%)', detail: rkList(lowWho, 6), action: { label: 'Ver lições', kind: 'homework' } });
  } else {
    const hw = rkHomework(student.id);
    if (hw.late.length) out.push({ icon: '⏰', tone: 'coral', title: `${hw.late.length === 1 ? 'Uma lição atrasada' : `${hw.late.length} lições atrasadas`}`, detail: rkList(hw.late.map(h => h.title || 'Lição de casa'), 3), action: { label: 'Ver lições', kind: 'homework' } });
    hw.low.slice(0, 2).forEach(h => out.push({ icon: '📉', tone: 'gold', title: `“${h.title || 'Lição de casa'}” ficou com ${hwScore(h)}%`, detail: 'Vale corrigir junto o que ela errou.', action: { label: 'Ver resultado', kind: 'hwresult', arg: h.id } }));
  }

  // 3. Mistakes that come back (for a group: the ones shared first).
  const mistakeCount = new Map();
  people.forEach(p => rkMistakes(p.id).slice(0, 12).forEach(m => {
    const k = m.text.toLowerCase();
    const cur = mistakeCount.get(k) || { text: m.text, who: new Set(), wrong: 0 };
    cur.who.add(rkShort(p.name)); cur.wrong += m.wrong;
    mistakeCount.set(k, cur);
  }));
  const mistakes = [...mistakeCount.values()].sort((a, b) => b.who.size - a.who.size || b.wrong - a.wrong);
  if (mistakes.length) {
    out.push({
      icon: '🎯', tone: 'coral',
      title: members.length ? 'Erros que se repetem no grupo' : 'Erros que se repetem',
      detail: mistakes.slice(0, 6).map(m => `<span class="rec-chip">${rkEsc(m.text)}${members.length && m.who.size > 1 ? ` <small>×${m.who.size}</small>` : ''}</span>`).join(' '),
      action: members.length ? null : { label: 'Revisar erros', kind: 'mistakes' },
    });
  }

  // 4. Weak words of the class reviews.
  const weak = [...new Set(people.flatMap(p => rkWeakWords(p.id)))];
  if (weak.length) out.push({ icon: '🧠', tone: 'gold', title: 'Palavras da revisão ainda fracas', detail: `Use no warm-up: ${weak.slice(0, 8).map(w => `<span class="rec-chip">${rkEsc(w)}</span>`).join(' ')}` });

  // 5. Practice between classes.
  const prac = people.map(p => ({ p, r: rkPractice(p.id) }));
  const idle = prac.filter(x => x.r.days == null || x.r.days >= 7);
  const onFire = prac.filter(x => x.r.streak >= 3);
  if (members.length) {
    if (idle.length) out.push({ icon: '💤', tone: 'gold', title: `Sem praticar há 7+ dias: ${idle.length} de ${people.length}`, detail: rkList(idle.map(x => rkShort(x.p.name)), 6) + '<br>Combine 10 minutos por dia no link.' });
  } else if (idle.length) {
    const d = idle[0].r.days;
    out.push({ icon: '💤', tone: 'gold', title: d == null ? 'Ainda não praticou no link' : `Não pratica há ${d} dias`, detail: 'Combine uma meta pequena: 10 minutos por dia, 3 vezes na semana.', action: { label: 'Link do aluno', kind: 'link' } });
  }
  if (onFire.length) {
    out.push({ icon: '🔥', tone: 'green', title: members.length ? 'Elogie quem está praticando' : `${onFire[0].r.streak} dias seguidos praticando — elogie!`, detail: members.length ? rkList(onFire.map(x => `${rkShort(x.p.name)} (${x.r.streak} dias)`), 6) : `${onFire[0].r.weekRight}/${onFire[0].r.weekTotal} acertos nesta semana.` });
  }

  // 6. Writing waiting for the teacher.
  const writing = people.flatMap(p => rkWritingWaiting(p.id).map(w => ({ p, w })));
  if (writing.length) out.push({ icon: '✍️', tone: 'coral', title: `${writing.length === 1 ? 'Um texto esperando correção' : `${writing.length} textos esperando correção`}`, detail: members.length ? rkList([...new Set(writing.map(x => rkShort(x.p.name)))], 6) : 'Corrija antes da aula e comente com ela.', action: { label: 'Corrigir', kind: 'writing', arg: writing[0].p.id } });

  // 7. Where to go next.
  const next = rkNextTopic(student, last);
  if (next) out.push({ icon: '➡️', tone: 'plum', title: `Próximo tópico sugerido: ${next.topic.title}`, detail: `${next.level.code} · depois de “${last.topicLabel}”`, action: { label: 'Abrir tópico', kind: 'topic', arg: `${next.level.id}|${next.topic.id}` } });

  return out.slice(0, RK_MAX);
}

// ---------------------------------------------------------------------------
// ON SCREEN
// ---------------------------------------------------------------------------
function rkHTML(student, opts) {
  const o = opts || {};
  const items = rkFor(student).slice(0, o.max || RK_MAX);
  const body = items.length
    ? `<ul class="rec-list">${items.map((it, i) => `
        <li class="rec-item rec-item--${it.tone}">
          <span class="rec-ico" aria-hidden="true">${it.icon}</span>
          <div class="rec-text"><b>${rkEsc(it.title)}</b>${it.detail ? `<p>${it.detail}</p>` : ''}</div>
          ${it.action ? `<button class="rec-act" type="button" data-rec="${i}">${rkEsc(it.action.label)}</button>` : ''}
        </li>`).join('')}</ul>`
    : `<p class="rec-empty">✨ Nada pendente: lições em dia, sem erros repetidos. Aula livre para avançar!</p>`;
  return { html: `<section class="rec-box${o.compact ? ' rec-box--compact' : ''}" aria-label="O que reforçar hoje">
      <details ${o.closed ? '' : 'open'}><summary><span>💡 O que reforçar hoje${o.compact ? '' : ` com ${rkEsc(rkShort(student.name))}`}</span><small>${items.length ? `${items.length} ${items.length === 1 ? 'ponto' : 'pontos'}` : 'tudo em dia'}</small></summary>${body}</details>
    </section>`, items };
}

function rkRun(action, student) {
  if (!action) return;
  const sid = action.arg || student.id;
  switch (action.kind) {
    case 'homework': {
      if (typeof closeSessionDrawer === 'function') closeSessionDrawer();
      const sec = document.getElementById('homework');
      if (sec) { if (sec.classList.contains('is-collapsed') && typeof setSectionCollapsed === 'function') setSectionCollapsed(sec, false); sec.scrollIntoView({ behavior: 'smooth' }); }
      break;
    }
    case 'hwresult': {
      const hw = typeof hwForStudent === 'function' ? hwForStudent(student.id).find(h => h.id === action.arg) : null;
      if (hw && typeof openHomeworkResult === 'function') openHomeworkResult(hw);
      break;
    }
    case 'mistakes': if (typeof openMistakes === 'function') openMistakes(student.id); break;
    case 'writing': if (typeof openWritingDesk === 'function') openWritingDesk(sid); break;
    case 'link': if (typeof openShareLinkModal === 'function') openShareLinkModal(student.id); break;
    case 'topic': {
      const [lv, tp] = String(action.arg || '').split('|');
      if (lv && tp && typeof openTopicModal === 'function') openTopicModal(lv, tp);
      break;
    }
    default: break;
  }
}

// Puts the box at the top of `host` and wires its buttons.
function rkMount(host, student, opts) {
  if (!host || !student) return;
  const old = host.querySelector(':scope > .rec-box');
  if (old) old.remove();
  const { html, items } = rkHTML(student, opts);
  host.insertAdjacentHTML('afterbegin', html);
  const box = host.querySelector(':scope > .rec-box');
  // Remember whether the teacher folded it.
  const KEY = 'ig_rec_open';
  const det = box.querySelector('details');
  try { if (!(opts && opts.compact) && localStorage.getItem(KEY) === '0') det.open = false; } catch (e) { /* ignore */ }
  det.addEventListener('toggle', () => { try { if (!(opts && opts.compact)) localStorage.setItem(KEY, det.open ? '1' : '0'); } catch (e) { /* ignore */ } });
  box.querySelectorAll('[data-rec]').forEach(b => b.addEventListener('click', () => {
    const it = items[Number(b.dataset.rec)];
    if (opts && opts.onAction) opts.onAction();
    rkRun(it && it.action, student);
  }));
}
