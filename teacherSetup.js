/* ==========================================================================
   IGenglishschool — Teacher setup ("who do you teach?")
   --------------------------------------------------------------------------
   The site was built for one teacher with young learners. A second teacher
   whose students are 15 to adult must not open it to Phonics, a Hello Song
   and a dress-up doll. The first time a teacher opens the site (after she
   signs in, when accounts are on) she answers three questions:

     • the age groups she teaches       → which tabs, games and tools show
     • the levels she teaches            → which curriculum levels show
     • what her students need to practise → the order of the student page

   Stored under its own key, so it syncs with the rest of her workspace and
   follows her to any computer. Every helper below answers "as before" when
   there is no setup yet, so nothing changes for anyone until she answers.

   Loaded after contentStore.js and before app.js.
   ========================================================================== */

const TEACHER_SETUP_KEY = 'teacher_setup';

const TS_AGE_GROUPS = [
  { id: 'kids', icon: '🧸', label: 'Crianças pequenas', ages: '3 a 6 anos' },
  { id: 'juniors', icon: '✏️', label: 'Crianças', ages: '7 a 10 anos' },
  { id: 'preteens', icon: '🎧', label: 'Pré-adolescentes', ages: '11 a 14 anos' },
  { id: 'teens', icon: '🎓', label: 'Adolescentes', ages: '15 a 17 anos' },
  { id: 'adults', icon: '💼', label: 'Adultos', ages: '18 anos ou mais' },
];
const TS_YOUNG = ['kids', 'juniors'];
const TS_UNDER_15 = ['kids', 'juniors', 'preteens'];
const TS_GROWN = ['teens', 'adults'];

const TS_LEVELS = [
  { id: 'a0', code: 'A0', label: 'Iniciante absoluto', hint: 'nunca estudou inglês' },
  { id: 'a1', code: 'A1', label: 'Básico', hint: 'frases simples, apresentações, rotina' },
  { id: 'a2', code: 'A2', label: 'Pré-intermediário', hint: 'passado, viagens, trabalho' },
  { id: 'b1', code: 'B1', label: 'Intermediário', hint: 'conversa com alguma fluência' },
  { id: 'b1b2', code: 'B2–C1', label: 'Avançado', hint: 'debates, textos longos, expressões' },
];

const TS_SKILLS = [
  { id: 'speaking', icon: '🗣️', label: 'Conversação (speaking)' },
  { id: 'listening', icon: '🎧', label: 'Compreensão oral (listening)' },
  { id: 'writing', icon: '✍️', label: 'Escrita (writing)' },
  { id: 'reading', icon: '📖', label: 'Leitura (reading)' },
  { id: 'grammar', icon: '🧩', label: 'Gramática' },
];

// ---------------------------------------------------------------------------
// STORAGE
// ---------------------------------------------------------------------------
function teacherSetup() {
  const raw = IGStore.getJSON(TEACHER_SETUP_KEY, null);
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.ages) || !raw.ages.length) return null;
  return {
    ages: raw.ages.filter(a => TS_AGE_GROUPS.some(g => g.id === a)),
    levels: Array.isArray(raw.levels) ? raw.levels.filter(l => TS_LEVELS.some(x => x.id === l)) : [],
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    at: raw.at || null,
  };
}

function saveTeacherSetup(setup) {
  IGStore.setJSON(TEACHER_SETUP_KEY, { ...setup, at: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// AUDIENCE — what the rest of the app asks
// ---------------------------------------------------------------------------
// No setup = the site as it always was (young learners included).
function teacherHasYoungKids() {
  const s = teacherSetup();
  return !s || s.ages.some(a => TS_YOUNG.includes(a));
}
function teacherHasGrownups() {
  const s = teacherSetup();
  return Boolean(s && s.ages.some(a => TS_GROWN.includes(a)));
}
// Only 15+ — the case where everything childish should disappear.
function teacherAdultOnly() {
  const s = teacherSetup();
  return Boolean(s && !s.ages.some(a => TS_UNDER_15.includes(a)));
}
function teacherLevelIds() {
  const s = teacherSetup();
  return s && s.levels.length ? s.levels.slice() : TS_LEVELS.map(l => l.id);
}
function teacherSkills() {
  const s = teacherSetup();
  return s ? s.skills.slice() : [];
}

// A learner of 15+ gets the grown-up version of everything.
function igIsGrownup(student) {
  return Boolean(student) && Number(student.age) >= 15;
}

// "Are we teaching a grown-up right now?" — the active student decides;
// with nobody selected, the teacher's own setup does.
function igAdultContext() {
  const s = typeof getActiveStudent === 'function' ? getActiveStudent() : null;
  if (s) return igIsGrownup(s);
  return teacherAdultOnly();
}

// Should this curriculum topic be offered at all? Grown-up topics only to
// teachers (and students) who have use for them.
function igTopicVisibleToTeacher(topic) {
  if (topic && topic.audience === 'adult') return !teacherSetup() ? false : teacherHasGrownups();
  return true;
}

// Body classes the stylesheet uses to hide whole blocks (Phonics, the kid
// games, the sticker book…) without every renderer checking.
function applyTeacherAudience() {
  const cl = document.body.classList;
  cl.toggle('ig-no-young', !teacherHasYoungKids());
  cl.toggle('ig-adult-only', teacherAdultOnly());
}

// ---------------------------------------------------------------------------
// ONBOARDING — the three questions
// ---------------------------------------------------------------------------
const TeacherSetupUI = (() => {
  let overlay = null;

  function sampleStudentsPresent() {
    if (typeof loadStudents !== 'function' || typeof DEFAULT_STUDENTS === 'undefined') return [];
    const defaults = new Map(DEFAULT_STUDENTS.map(s => [s.id, s.name]));
    return loadStudents().filter(s => defaults.get(s.id) === s.name);
  }

  function open(opts) {
    const o = opts || {};
    if (overlay) return;
    const current = teacherSetup() || { ages: [], levels: [], skills: [] };
    const samples = sampleStudentsPresent();
    const first = !teacherSetup();

    overlay = document.createElement('div');
    overlay.className = 'ts-overlay';
    overlay.innerHTML = `
      <div class="ts-card" role="dialog" aria-modal="true" aria-labelledby="tsTitle">
        ${first ? '' : '<button class="modal-close ts-close" type="button" aria-label="Fechar">✕</button>'}
        <div class="ts-head">
          <span class="ts-head-icon">🎯</span>
          <div>
            <h2 id="tsTitle">${first ? 'Vamos ajustar o site para as suas turmas' : 'Perfil das minhas turmas'}</h2>
            <p>${first ? 'São só três perguntas. O site mostra os conteúdos, jogos e ferramentas certos para a idade e o nível dos seus alunos — e dá para mudar depois.' : 'Mude o que precisar — o site se ajusta na hora.'}</p>
          </div>
        </div>

        <form class="ts-form" id="tsForm">
          <fieldset class="ts-q">
            <legend><b>1.</b> Qual a faixa etária dos seus alunos? <small>Marque todas que tiver</small></legend>
            <div class="ts-options ts-options--ages">
              ${TS_AGE_GROUPS.map(g => `
                <label class="ts-option">
                  <input type="checkbox" name="ages" value="${g.id}" ${current.ages.includes(g.id) ? 'checked' : ''} />
                  <span class="ts-option-body"><span class="ts-option-icon">${g.icon}</span><b>${g.label}</b><small>${g.ages}</small></span>
                </label>`).join('')}
            </div>
          </fieldset>

          <fieldset class="ts-q">
            <legend><b>2.</b> Quais níveis você ensina? <small>Marque todos</small></legend>
            <div class="ts-options">
              ${TS_LEVELS.map(l => `
                <label class="ts-option">
                  <input type="checkbox" name="levels" value="${l.id}" ${current.levels.includes(l.id) ? 'checked' : ''} />
                  <span class="ts-option-body"><b>${l.code} · ${l.label}</b><small>${l.hint}</small></span>
                </label>`).join('')}
            </div>
          </fieldset>

          <fieldset class="ts-q">
            <legend><b>3.</b> O que seus alunos mais precisam praticar? <small>Opcional</small></legend>
            <div class="ts-options">
              ${TS_SKILLS.map(s => `
                <label class="ts-option ts-option--row">
                  <input type="checkbox" name="skills" value="${s.id}" ${current.skills.includes(s.id) ? 'checked' : ''} />
                  <span class="ts-option-body"><span class="ts-option-icon">${s.icon}</span><b>${s.label}</b></span>
                </label>`).join('')}
            </div>
          </fieldset>

          ${samples.length ? `
            <label class="ts-samples" id="tsSamplesRow">
              <input type="checkbox" id="tsRemoveSamples" />
              <span>Remover os <b>${samples.length} alunos de exemplo</b> da minha lista
                <small>(${samples.slice(0, 4).map(s => igEscapeHtml(s.name)).join(', ')}${samples.length > 4 ? '…' : ''}) — marque se estes alunos <b>não</b> são seus.</small></span>
            </label>` : ''}

          <p class="ts-error" id="tsError" hidden></p>
          <div class="ts-actions">
            <button class="btn btn-primary" type="submit">✅ ${first ? 'Pronto, ajustar o site' : 'Salvar'}</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);
    document.body.classList.add('ts-open');

    const form = overlay.querySelector('#tsForm');
    const removeBox = overlay.querySelector('#tsRemoveSamples');
    // Only grown-ups ticked: the sample children are almost certainly not hers.
    const syncSampleDefault = () => {
      if (!removeBox || removeBox.dataset.touched) return;
      const ages = [...form.querySelectorAll('input[name="ages"]:checked')].map(i => i.value);
      removeBox.checked = ages.length > 0 && !ages.some(a => TS_UNDER_15.includes(a));
    };
    if (removeBox) removeBox.addEventListener('change', () => { removeBox.dataset.touched = '1'; });
    form.querySelectorAll('input[name="ages"]').forEach(i => i.addEventListener('change', syncSampleDefault));
    syncSampleDefault();

    const closeBtn = overlay.querySelector('.ts-close');
    if (closeBtn) closeBtn.addEventListener('click', close);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const pick = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
      const ages = pick('ages');
      const levels = pick('levels');
      const err = overlay.querySelector('#tsError');
      if (!ages.length) { err.textContent = 'Marque pelo menos uma faixa etária.'; err.hidden = false; return; }
      if (!levels.length) { err.textContent = 'Marque pelo menos um nível.'; err.hidden = false; return; }

      saveTeacherSetup({ ages, levels, skills: pick('skills') });

      if (removeBox && removeBox.checked) {
        const sampleIds = new Set(samples.map(s => s.id));
        saveStudents(loadStudents().filter(s => !sampleIds.has(s.id)));
        if (sampleIds.has(getActiveStudentId())) clearActiveStudent();
      }
      close();
      refreshForAudience();
      if (typeof o.onDone === 'function') o.onDone();
    });
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.body.classList.remove('ts-open');
  }

  // Asked once per workspace; never inside a student's link.
  // Then, once, the offer of the guided tour (tutorial.js).
  function maybeAsk() {
    if (window.IG_SHARE_MODE) return;
    const offerTour = () => { if (typeof TeacherTour !== 'undefined') setTimeout(() => TeacherTour.offer(), 600); };
    if (teacherSetup()) { refreshForAudience(); offerTour(); return; }
    open({ onDone: offerTour });
  }

  return { open, close, maybeAsk };
})();

// Re-draw everything whose content depends on the audience. Each call is
// guarded: the function may belong to a module this page did not load.
function refreshForAudience() {
  applyTeacherAudience();
  const call = (name, ...args) => { if (typeof window[name] === 'function') { try { window[name](...args); } catch (e) { console.error(name, e); } } };
  call('refreshCurriculumForAudience');
  call('renderGameMaker', document.getElementById('gameMakerRoot'));
  call('renderExamMaker', document.getElementById('examMakerRoot'));
  call('renderProfileList');
  call('onActiveStudentChanged');
}

function openTeacherSetup() { TeacherSetupUI.open(); }
