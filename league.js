/* ==========================================================================
   IGenglishschool — 🏆 Ranking: weekly leagues and the challenge of the week

   POINTS (Monday–Sunday), from the practice log each student already has
   (learnerData.js 'log_<id>'):
     a right answer 3, a wrong one 1 (trying counts), 10 per day practised,
     +25 when the week's challenge is done.
   CHALLENGE: one per week for everybody, in turn (lgChallengeFor).

   LEAGUES: every group with members is a league of its own, plus a general
   league of the learners of 14+ the teacher picks (IGStore 'league_setup').
   Only first names and avatars are shown.

   HOW IT REACHES THE STUDENT: the teacher's side works the tables out and
   writes them into each player's `student_access` record (`league`), which
   already travels to the student's link (studentAccess.js / share.js). The
   link shows the table as of the teacher's last visit, with the student's
   own points always live from their own log.
   ========================================================================== */

const LG_SETUP_KEY = 'league_setup';
const LG_PTS = { right: 3, wrong: 1, day: 10, challenge: 25 };

const lgEsc = s => (typeof igEscapeHtml === 'function' ? igEscapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s));
const lgSay = (pt, en) => (typeof igSay === 'function' ? igSay(pt, en) : pt);

// The week: Monday 00:00 to next Monday.
function lgWeekStart(d) {
  const x = new Date(d || Date.now());
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const lgDayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const lgWeekKey = d => lgDayKey(lgWeekStart(d));

// ---------------------------------------------------------------------------
// THE CHALLENGE OF THE WEEK
// ---------------------------------------------------------------------------
const LG_CHALLENGES = [
  { id: 'days4', icon: '📅', en: 'Practice on 4 different days', pt: 'Pratique em 4 dias diferentes', goal: 4, of: w => w.days.size },
  { id: 'right50', icon: '🎯', en: 'Get 50 answers right', pt: 'Acerte 50 respostas', goal: 50, of: w => w.right },
  { id: 'streak3', icon: '🔥', en: 'Practice 3 days in a row', pt: 'Pratique 3 dias seguidos', goal: 3, of: w => w.run },
  { id: 'review10', icon: '🧠', en: 'Answer 10 class-review questions', pt: 'Responda 10 perguntas da revisão da aula', goal: 10, of: w => w.review },
  { id: 'games5', icon: '🎮', en: 'Finish 5 games', pt: 'Termine 5 jogos', goal: 5, of: w => w.games },
  { id: 'answers80', icon: '⚡', en: 'Answer 80 questions', pt: 'Responda 80 perguntas', goal: 80, of: w => w.answers },
];
function lgChallengeFor(weekStart) {
  const n = Math.floor(lgWeekStart(weekStart).getTime() / (7 * 864e5));
  return LG_CHALLENGES[((n % LG_CHALLENGES.length) + LG_CHALLENGES.length) % LG_CHALLENGES.length];
}

// ---------------------------------------------------------------------------
// POINTS
// ---------------------------------------------------------------------------
function lgWeekStats(studentId, weekStart) {
  const from = lgWeekStart(weekStart).getTime();
  const to = from + 7 * 864e5;
  const log = typeof ldLoadLog === 'function' ? ldLoadLog(studentId) : [];
  const w = { right: 0, wrong: 0, answers: 0, games: 0, review: 0, days: new Set(), run: 0 };
  log.forEach(a => {
    const t = new Date(a.t).getTime();
    if (!(t >= from && t < to) || a.kind === 'visit') return;
    w.days.add(lgDayKey(t));
    if (a.kind === 'play') { w.games++; return; }
    w.answers++;
    if (a.ok) w.right++; else w.wrong++;
    if (a.source === 'class-review') w.review++;
  });
  // The longest run of days in a row this week.
  let run = 0, best = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(from + i * 864e5);
    if (w.days.has(lgDayKey(d))) { run++; best = Math.max(best, run); } else run = 0;
  }
  w.run = best;
  const ch = lgChallengeFor(weekStart);
  w.challenge = { id: ch.id, value: Math.min(ch.goal, ch.of(w)), goal: ch.goal, done: ch.of(w) >= ch.goal };
  w.points = w.right * LG_PTS.right + w.wrong * LG_PTS.wrong + w.days.size * LG_PTS.day + (w.challenge.done ? LG_PTS.challenge : 0);
  return w;
}

// ---------------------------------------------------------------------------
// LEAGUES (teacher side)
// ---------------------------------------------------------------------------
function lgSetup() {
  const raw = IGStore.getJSON(LG_SETUP_KEY, null);
  return raw && typeof raw === 'object' ? raw : { on: false, general: [] };
}
function lgSaveSetup(s) { IGStore.setJSON(LG_SETUP_KEY, s); }
const lgIsGroup = s => typeof isGroupStudent === 'function' && isGroupStudent(s.id);
const lgGrown = s => (typeof igGrownLook === 'function' ? igGrownLook(s) : Number(s.age) >= 14);
const lgFirst = s => {
  const x = typeof getStudentExtra === 'function' ? getStudentExtra(s.id) : {};
  return String(x.memberName || s.name || '').replace(/\s*\(.*\)$/, '').replace(/^(TM|TWIN)\s*-\s*/i, '').split(' ')[0];
};
// Who can play: learners of 14+, never a group record itself.
function lgEligible() { return loadStudents().filter(s => !lgIsGroup(s) && lgGrown(s)); }

// [{ id, title, icon, players: [student] }]
function lgLeagues() {
  const setup = lgSetup();
  if (!setup.on) return [];
  const out = [];
  loadStudents().filter(lgIsGroup).forEach(g => {
    const members = loadStudents().filter(s => typeof studentGroupId === 'function' && studentGroupId(s.id) === g.id && lgGrown(s));
    if (members.length >= 2) out.push({ id: 'g:' + g.id, title: g.name, icon: '👥', players: members });
  });
  const ids = new Set(setup.general || []);
  const general = lgEligible().filter(s => ids.has(s.id));
  if (general.length >= 2) out.push({ id: 'all', title: 'Everyone', icon: '🌎', players: general });
  return out;
}

function lgTable(league, weekStart) {
  return league.players.map(s => ({ s, w: lgWeekStats(s.id, weekStart) }))
    .sort((a, b) => b.w.points - a.w.points || b.w.right - a.w.right || lgFirst(a.s).localeCompare(lgFirst(b.s)));
}

// What each player's link gets: this week's tables they are in, last week's winners.
function lgPublishAll() {
  if (window.IG_SHARE_MODE || typeof saWrite !== 'function' || typeof saRecord !== 'function') return;
  const leagues = lgLeagues();
  const week = lgWeekStart();
  const lastWeek = new Date(week.getTime() - 7 * 864e5);
  const ch = lgChallengeFor(week);
  const per = new Map();
  leagues.forEach(lg => {
    const rows = lgTable(lg, week).map(r => ({ id: r.s.id, n: lgFirst(r.s), e: r.s.avatar || '🙂', p: r.w.points }));
    const prev = lgTable(lg, lastWeek)[0];
    const winner = prev && prev.w.points > 0 ? { n: lgFirst(prev.s), e: prev.s.avatar || '🙂', p: prev.w.points } : null;
    lg.players.forEach(s => {
      if (!per.has(s.id)) per.set(s.id, []);
      // The ids stay on the teacher's side: the link only needs "which row is me".
      per.get(s.id).push({ t: lg.title, i: lg.icon, me: rows.findIndex(r => r.id === s.id), rows: rows.map(({ n, e, p }) => ({ n, e, p })), last: winner });
    });
  });
  loadStudents().forEach(s => {
    const cur = saRecord(s.id).league || null;
    const leaguesOf = per.get(s.id) || null;
    const next = leaguesOf ? { week: lgDayKey(week), ch: ch.id, at: new Date().toISOString(), leagues: leaguesOf } : null;
    const strip = x => (x ? JSON.stringify({ ...x, at: 0 }) : '');
    if (strip(cur) !== strip(next)) saWrite(s.id, { league: next }, { fromGroup: true });
  });
}

// ---------------------------------------------------------------------------
// TEACHER: the 🏆 Ranking tab of the dashboard
// ---------------------------------------------------------------------------
function dashPaintLeague(pane) {
  const setup = lgSetup();
  const week = lgWeekStart();
  const ch = lgChallengeFor(week);
  const end = new Date(week.getTime() + 6 * 864e5);
  const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const leagues = lgLeagues();
  const medal = i => ['🥇', '🥈', '🥉'][i] || `${i + 1}º`;

  pane.innerHTML = `
    <div class="dash-pane-head">
      <div><b>🏆 Ranking da semana</b> <span class="lg-week">${fmt(week)} – ${fmt(end)}</span></div>
      <div class="dash-pane-actions">
        <label class="lg-switch"><input type="checkbox" id="lgOn" ${setup.on ? 'checked' : ''}/> Ranking ligado</label>
        <button class="game-btn secondary" id="lgWho" type="button">👥 Quem participa</button>
      </div>
    </div>
    <div class="lg-challenge"><span>${ch.icon}</span><div><b>Desafio da semana:</b> ${lgEsc(ch.pt)} <small>(${lgEsc(ch.en)}) · vale +${LG_PTS.challenge} pontos</small></div></div>
    <p class="lg-rules">Pontos: acerto ${LG_PTS.right} · erro ${LG_PTS.wrong} (tentar conta) · ${LG_PTS.day} por dia praticado · desafio +${LG_PTS.challenge}. O aluno vê o ranking no link dele (só o primeiro nome) — atualiza quando você abre a plataforma.</p>
    ${!setup.on ? `<div class="dash-empty"><span>🏆</span><p><strong>O ranking está desligado.</strong><br/>Ligue para os alunos de 14+ verem a liga da semana no link deles. Cada grupo (como o MONDAY) tem a sua liga; a liga geral é com quem você escolher em <em>👥 Quem participa</em>.</p></div>`
      : !leagues.length ? `<div class="dash-empty"><span>👥</span><p>Nenhuma liga ainda: escolha pelo menos 2 alunos em <em>👥 Quem participa</em>, ou crie as contas dos alunos de um grupo.</p></div>`
      : `<div class="lg-grid">${leagues.map(lg => {
          const rows = lgTable(lg, week);
          return `<section class="lg-card">
            <h4>${lg.icon} ${lgEsc(lg.id === 'all' ? 'Geral' : lg.title)}</h4>
            <ol class="lg-table">${rows.map((r, i) => `
              <li class="${r.w.points ? '' : 'is-zero'}">
                <span class="lg-pos">${r.w.points ? medal(i) : '–'}</span>
                <span class="lg-av" style="background:${lgEsc(r.s.color || '#8e6d86')}">${lgEsc(r.s.avatar || '🙂')}</span>
                <span class="lg-name">${lgEsc(lgFirst(r.s))}<small>${r.w.days.size} ${r.w.days.size === 1 ? lgSay('dia', 'day') : lgSay('dias', 'days')} · ${r.w.right}/${r.w.answers} ${lgSay('acertos', 'right')} · ${r.w.challenge.done ? `✅ ${lgSay('desafio', 'challenge')}` : `${lgSay('desafio', 'challenge')} ${r.w.challenge.value}/${r.w.challenge.goal}`}</small></span>
                <b class="lg-pts">${r.w.points}</b>
              </li>`).join('')}</ol>
          </section>`;
        }).join('')}</div>`}`;

  pane.querySelector('#lgOn').addEventListener('change', e => {
    const s = lgSetup();
    s.on = e.target.checked;
    if (s.on && !(s.general || []).length) s.general = lgEligible().map(x => x.id);
    lgSaveSetup(s);
    lgPublishAll();
    dashPaintLeague(pane);
  });
  pane.querySelector('#lgWho').addEventListener('click', () => lgOpenWho(() => dashPaintLeague(pane)));
}

function lgOpenWho(after) {
  const setup = lgSetup();
  const chosen = new Set(setup.general || []);
  const list = lgEligible().sort((a, b) => a.name.localeCompare(b.name));
  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">👥 Quem participa da liga geral</h3>
      <p class="ce-hint">Só alunos de 14+. Os alunos de um grupo também têm a liga do grupo, automaticamente.</p>
      <div class="lg-who">${list.map(s => `
        <label class="lg-who-row"><input type="checkbox" value="${lgEsc(s.id)}" ${chosen.has(s.id) ? 'checked' : ''}/>
          <span class="lg-av" style="background:${lgEsc(s.color || '#8e6d86')}">${lgEsc(s.avatar || '🙂')}</span>
          <span>${lgEsc(s.name)} <small>→ aparece como “${lgEsc(lgFirst(s))}”</small></span></label>`).join('')}</div>
      <div class="game-btn-row" style="margin-top:14px">
        <button class="btn btn-primary" id="lgWhoSave">💾 Salvar</button>
        <button class="game-btn secondary" id="lgWhoAll">Marcar todos</button>
        <button class="game-btn secondary" id="lgWhoNone">Desmarcar todos</button>
      </div>
    </div>`);
  const boxes = () => [...document.querySelectorAll('.lg-who input')];
  document.getElementById('lgWhoAll').addEventListener('click', () => boxes().forEach(b => { b.checked = true; }));
  document.getElementById('lgWhoNone').addEventListener('click', () => boxes().forEach(b => { b.checked = false; }));
  document.getElementById('lgWhoSave').addEventListener('click', () => {
    const s = lgSetup();
    s.general = boxes().filter(b => b.checked).map(b => b.value);
    lgSaveSetup(s);
    lgPublishAll();
    closeModal();
    if (after) after();
  });
}

// ---------------------------------------------------------------------------
// STUDENT: the 🏆 Ranking tile and window (share.js)
// ---------------------------------------------------------------------------
function lgForStudent(student) {
  const rec = typeof saRecord === 'function' ? saRecord(student.id).league : null;
  if (!rec || !Array.isArray(rec.leagues) || !rec.leagues.length) return null;
  const week = lgWeekStart();
  const mine = lgWeekStats(student.id, week);
  const sameWeek = rec.week === lgDayKey(week);
  // The table as the teacher last sent it, my own points live and re-sorted.
  const leagues = rec.leagues.map(lg => {
    const rows = lg.rows.map((r, i) => ({ ...r, p: sameWeek ? r.p : 0, me: i === lg.me }));
    const me = rows.find(r => r.me);
    if (me) me.p = Math.max(me.p, mine.points);
    rows.sort((a, b) => b.p - a.p);
    return { ...lg, rows, pos: rows.findIndex(r => r.me) + 1 };
  });
  return { leagues, mine, ch: lgChallengeFor(week), at: rec.at };
}

function lgTileText(student) {
  const d = lgForStudent(student);
  if (!d) return null;
  const lg = d.leagues[0];
  const ch = `${d.ch.icon} ${d.mine.challenge.value}/${d.mine.challenge.goal}`;
  return d.mine.points ? `#${lg.pos} of ${lg.rows.length} · ${d.mine.points} pts · ${ch}` : `Practice to enter this week's ranking · ${ch}`;
}

function openLeague(student) {
  const d = lgForStudent(student);
  if (!d) return;
  const medal = i => ['🥇', '🥈', '🥉'][i] || `${i + 1}`;
  const pct = Math.round((d.mine.challenge.value / d.mine.challenge.goal) * 100);
  const daysLeft = 7 - ((new Date().getDay() + 6) % 7);
  openModal(`
    <div class="modal-content-pad">
      <div class="modal-head">
        <span class="modal-head-thumb modal-head-thumb--icon">🏆</span>
        <div class="modal-head-text">
          <h3 id="modalTitle">This week's ranking</h3>
          <p class="modal-head-sub"><span class="modal-head-desc">${daysLeft === 1 ? 'Last day of the week!' : `${daysLeft} days left this week`} · a new week starts on Monday</span></p>
        </div>
      </div>
      <div class="lg-me">
        <div><b>${d.mine.points}</b><span>points</span></div>
        <div><b>${d.mine.days.size}</b><span>day${d.mine.days.size === 1 ? '' : 's'}</span></div>
        <div><b>${d.mine.right}</b><span>right</span></div>
      </div>
      <div class="lg-challenge lg-challenge--student">
        <span>${d.ch.icon}</span>
        <div><b>Challenge of the week:</b> ${lgEsc(d.ch.en)} <small>+${LG_PTS.challenge} points</small>
          <div class="lg-bar"><i style="width:${pct}%"></i></div>
          <small>${d.mine.challenge.done ? '✅ Done! Great job!' : `${d.mine.challenge.value} / ${d.mine.challenge.goal}`}</small>
        </div>
      </div>
      ${d.leagues.map(lg => `
        <section class="lg-card">
          <h4>${lg.i} ${lgEsc(lg.t)} <small>· ${d.mine.points ? `you are #${lg.pos}` : 'practice to enter the ranking'}</small></h4>
          <ol class="lg-table">${lg.rows.map((r, i) => `
            <li class="${r.me ? 'is-me' : ''}${r.p ? '' : ' is-zero'}">
              <span class="lg-pos">${r.p ? medal(i) : '–'}</span>
              <span class="lg-av">${lgEsc(r.e)}</span>
              <span class="lg-name">${lgEsc(r.n)}${r.me ? ' <small>(you)</small>' : ''}</span>
              <b class="lg-pts">${r.p}</b>
            </li>`).join('')}</ol>
          ${lg.last ? `<p class="lg-last">Last week's winner: ${lgEsc(lg.last.e)} <b>${lgEsc(lg.last.n)}</b> · ${lg.last.p} pts</p>` : ''}
        </section>`).join('')}
      <p class="lg-rules">How to score: a right answer ${LG_PTS.right} · a wrong one ${LG_PTS.wrong} (trying counts!) · ${LG_PTS.day} for each day you practice · the challenge +${LG_PTS.challenge}. The others' points update when your teacher opens the class platform.</p>
    </div>`, true);
}
