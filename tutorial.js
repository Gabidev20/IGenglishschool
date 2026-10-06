/* ==========================================================================
   IGenglishschool — Guided tutorials
   --------------------------------------------------------------------------
   Two step-by-step tours built on one small engine (IGTour):

     • StudentTour — the first time a student (and their family) opens the
       link, it walks through every button on THEIR page: only the tiles
       that student actually has, worded for their age. A "❓ Ajuda" button
       in the student's header replays it at any time.

     • TeacherTour — offered once to each teacher (after the setup
       questions), and always available from the "❓" button in the header.
       It shows where everything is and how to use it with the students.

   Each step can point at something on the page: the page dims, that thing
   is ringed, and the card explains it. A step whose target is not on the
   page right now (a phone layout, a section the teacher does not use) is
   simply shown as a centred card, so a tour never breaks.
   ========================================================================== */

const IGTour = (() => {
  let state = null;

  const esc = s => igEscapeHtml(String(s == null ? '' : s));

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }

  // A step's `target` is a selector, a list of selectors (the first one on
  // the page wins) or `{ all: selector }` to ring a whole group of buttons.
  function resolve(target) {
    if (!target) return [];
    if (typeof target === 'object' && !Array.isArray(target) && target.all) {
      return [...document.querySelectorAll(target.all)].filter(visible);
    }
    const list = Array.isArray(target) ? target : [target];
    for (const sel of list) {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (visible(el)) return [el];
    }
    return [];
  }

  function unionRect(els) {
    const rs = els.map(e => e.getBoundingClientRect());
    const left = Math.min(...rs.map(r => r.left)), top = Math.min(...rs.map(r => r.top));
    const right = Math.max(...rs.map(r => r.right)), bottom = Math.max(...rs.map(r => r.bottom));
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  function start(steps, opts) {
    stop(false);
    const list = steps.filter(Boolean);
    if (!list.length) return;
    const o = opts || {};
    const root = document.createElement('div');
    root.className = 'tour-root';
    root.innerHTML = `
      <div class="tour-dim"></div>
      <div class="tour-ring" hidden></div>
      <div class="tour-card" role="dialog" aria-modal="true" aria-live="polite">
        <button class="tour-x" type="button" aria-label="Fechar o tutorial" title="Fechar">✕</button>
        <div class="tour-body"></div>
        <div class="tour-foot">
          <span class="tour-dots"></span>
          <div class="tour-btns">
            <button class="game-btn secondary tour-prev" type="button">← Voltar</button>
            <button class="btn btn-primary tour-next" type="button">Próximo →</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(root);
    // Room to scroll the last buttons of a page above a docked card.
    document.body.classList.add('tour-on');
    state = { steps: list, i: 0, root, opts: o, opened: [] };

    root.querySelector('.tour-x').addEventListener('click', () => stop(true));
    root.querySelector('.tour-prev').addEventListener('click', () => go(state.i - 1));
    root.querySelector('.tour-next').addEventListener('click', () => {
      if (state.i >= state.steps.length - 1) stop(true); else go(state.i + 1);
    });
    state.onKey = (e) => {
      if (e.key === 'Escape') stop(true);
      else if (e.key === 'ArrowRight') root.querySelector('.tour-next').click();
      else if (e.key === 'ArrowLeft' && state.i > 0) go(state.i - 1);
    };
    state.onMove = () => place();
    document.addEventListener('keydown', state.onKey);
    window.addEventListener('resize', state.onMove);
    window.addEventListener('scroll', state.onMove, true);
    go(0);
  }

  function go(i) {
    if (!state) return;
    state.i = Math.max(0, Math.min(state.steps.length - 1, i));
    const step = state.steps[state.i];
    if (typeof step.before === 'function') { try { step.before(state); } catch (e) { console.error(e); } }

    const card = state.root.querySelector('.tour-card');
    card.querySelector('.tour-body').innerHTML = `
      ${step.icon ? `<span class="tour-icon">${step.icon}</span>` : ''}
      <h3 class="tour-title">${esc(step.title)}</h3>
      <div class="tour-text">${step.html || ''}</div>`;
    card.querySelector('.tour-dots').innerHTML = `${state.i + 1} de ${state.steps.length}`;
    card.querySelector('.tour-prev').hidden = state.i === 0;
    card.querySelector('.tour-next').textContent = state.i === state.steps.length - 1 ? (state.opts.doneLabel || '✅ Entendi!') : 'Próximo →';

    const els = resolve(step.target);
    state.els = els;
    if (els.length) {
      if (window.innerWidth < 640) {
        // Phone: the card is docked at the bottom, so bring the target near
        // the top of the screen where the card cannot cover it.
        const top = els[0].getBoundingClientRect().top;
        window.scrollBy(0, top - 84);
      } else {
        els[0].scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
    place();
    card.querySelector('.tour-next').focus({ preventScroll: true });
  }

  // Ring the target and put the card where it does not cover it.
  function place() {
    if (!state) return;
    const ring = state.root.querySelector('.tour-ring');
    const dim = state.root.querySelector('.tour-dim');
    const card = state.root.querySelector('.tour-card');
    const els = (state.els || []).filter(visible);
    card.style.left = card.style.top = card.style.bottom = card.style.right = '';
    card.classList.remove('is-centred', 'is-docked', 'is-docked-top');

    if (!els.length) {
      ring.hidden = true;
      dim.classList.add('is-solid');
      card.classList.add('is-centred');
      return;
    }
    dim.classList.remove('is-solid');
    const pad = 8;
    const r = unionRect(els);
    ring.hidden = false;
    ring.style.left = `${r.left - pad}px`;
    ring.style.top = `${r.top - pad}px`;
    ring.style.width = `${r.width + pad * 2}px`;
    ring.style.height = `${r.height + pad * 2}px`;

    const vw = window.innerWidth, vh = window.innerHeight;
    if (vw < 640) {
      // Phone: pinned to the bottom — or to the top when the target is
      // down there and the space above it is free.
      card.classList.add('is-docked');
      const ch = card.offsetHeight || 260;
      if (r.bottom + pad > vh - ch - 16 && r.top - pad > ch + 24) card.classList.add('is-docked-top');
      else card.classList.remove('is-docked-top');
      return;
    }
    const cw = Math.min(400, vw - 32);
    const ch = card.offsetHeight || 220;
    let top = r.bottom + pad + 14;
    if (top + ch > vh - 12) top = r.top - pad - 14 - ch;          // no room below → above
    if (top < 12) top = Math.max(12, vh - ch - 12);               // tall target → bottom of the screen
    let left = r.left + r.width / 2 - cw / 2;
    left = Math.max(16, Math.min(vw - cw - 16, left));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function stop(finished) {
    if (!state) return;
    const s = state;
    state = null;
    document.removeEventListener('keydown', s.onKey);
    window.removeEventListener('resize', s.onMove);
    window.removeEventListener('scroll', s.onMove, true);
    s.root.remove();
    document.body.classList.remove('tour-on');
    if (typeof s.opts.onEnd === 'function') { try { s.opts.onEnd(Boolean(finished), s); } catch (e) { console.error(e); } }
  }

  return { start, stop, get running() { return Boolean(state); } };
})();

// ---------------------------------------------------------------------------
// STUDENT TOUR — what the family sees the first time they open the link
// ---------------------------------------------------------------------------
const StudentTour = (() => {
  const seenKey = id => `ig_tour_student_seen_${id}`;
  const seen = id => { try { return localStorage.getItem(seenKey(id)) === '1'; } catch (e) { return true; } };
  const markSeen = id => { try { localStorage.setItem(seenKey(id), '1'); } catch (e) { /* private mode */ } };
  let autoShownFor = null;

  const T = sel => `.stu-tile[data-go="${sel}"]`;

  function steps(student, prof) {
    const name = igEscapeHtml(student.name);
    const kid = prof === 'prereader' || prof === 'reader';
    const teen = prof === 'writer';
    const adult = prof === 'adult';
    const has = sel => Boolean(document.querySelector(sel));
    const family = kid
      ? '<p class="tour-parent">👨‍👩‍👧 <b>Para os pais:</b> este passo a passo leva 1 minuto e mostra como ajudar em casa. Vale fazer junto com a criança.</p>'
      : teen ? '<p class="tour-parent">👨‍👩‍👧 Pais e responsáveis também podem acompanhar por aqui.</p>' : '';

    const list = [];
    list.push({
      icon: '👋', title: `${adult ? 'Olá' : 'Oi'}, ${student.name}! Bem-vindo(a)`,
      html: `<p>Este é o <b>seu cantinho de inglês</b> da IG English School. Aqui você pratica o que vimos nas aulas,
               faz a lição de casa e manda mensagens para a teacher.</p>
             ${family}
             <p class="tour-small">Use <b>Próximo →</b> para seguir. Dá para fechar quando quiser no ✕.</p>`,
    });
    list.push({
      target: '.stu-header', icon: '⭐', title: 'Seu nível e suas conquistas',
      html: `<p>Aqui em cima aparecem o seu <b>nível</b>, o seu <b>XP</b> e as <b>estrelas</b> ⭐.
             ${kid ? 'Cada jogo e exercício feito dá estrelas — e estrelas viram <b>figurinhas</b> no álbum!' : 'Cada atividade feita soma pontos e mostra o seu progresso.'}</p>`,
    });
    if (has('.stu-alert [data-go="homework"]') || has(T('homework'))) list.push({
      target: ['.stu-alert [data-go="homework"]', T('homework')], icon: '📚', title: 'Lição de casa',
      html: `<p>Quando a teacher manda lição, ela aparece aqui${has('.stu-alert') ? ' — e um aviso aparece no topo' : ''}.
             Toque, faça as atividades e o resultado <b>vai direto para a teacher</b>, sem precisar mandar foto.</p>
             ${kid ? '<p class="tour-parent">👨‍👩‍👧 Ajude a criança a abrir a lição nos dias combinados. Não precisa acertar tudo: os erros mostram para a teacher o que revisar.</p>' : ''}`,
    });
    if (has(T('review-class'))) list.push({
      target: T('review-class'), icon: '🧠', title: 'Revisão da aula',
      html: '<p>Depois de cada aula, a teacher pode deixar aqui uma <b>revisão com cartões</b> do que foi visto. É ótimo fazer no dia seguinte, rapidinho.</p>',
    });
    const pictures = ['colors', 'feelings', 'weather', 'body', 'animals', 'instruments', 'house', 'prepositions', 'backpack'].filter(g => has(T(g)));
    if (pictures.length) list.push({
      target: { all: pictures.map(T).join(', ') }, icon: '🎨', title: 'Jogos com figuras',
      html: `<p>Jogos de <b>tocar, arrastar e ouvir</b>: cores, sentimentos, clima, corpo, animais, música, a casa… Não precisa saber ler.</p>
             ${prof === 'prereader' ? '<p class="tour-parent">👨‍👩‍👧 Ao tocar em um botão a criança <b>ouve o nome</b> dele. Deixe o som ligado. 🔊</p>' : ''}`,
    });
    if (has(T('games'))) list.push({
      target: T('games'), icon: '🎮', title: adult ? 'Topics & games' : 'Games',
      html: `<p>Os <b>tópicos que você já está estudando</b>, com jogos (Memory, Hangman, Match-up…)${adult ? ', leitura e vocabulário' : ''}.
             A teacher escolhe o que aparece aqui, então os tópicos vão aumentando conforme as aulas.</p>`,
    });
    const practice = ['practice', 'writing-practice'].filter(g => has(T(g)));
    if (practice.length) list.push({
      target: { all: practice.map(T).join(', ') }, icon: '⚡', title: 'Treinar',
      html: `<p><b>Practice</b> tem jogos rápidos de exercícios${practice.includes('writing-practice') ? ' e <b>Writing practice</b> treina a escrita: completar e montar frases' : ''}.
             Bom para fazer 10 minutinhos antes da aula.</p>`,
    });
    const skills = ['dictation', 'speaking'].filter(g => has(T(g)));
    if (skills.length) list.push({
      target: { all: skills.map(T).join(', ') }, icon: '🎧', title: 'Ouvir e falar',
      html: `<p>${skills.includes('dictation') ? '<b>Dictation</b>: você ouve a frase e escreve. ' : ''}${skills.includes('speaking') ? '<b>Speaking</b>: você lê a frase em voz alta e o site mostra quais palavras ele entendeu.' : ''}</p>
             <p class="tour-parent">🎤 Na primeira vez, o navegador pergunta se pode usar o <b>microfone</b> — toque em <b>Permitir</b>. Funciona melhor no Google Chrome.</p>`,
    });
    const talk = ['writing', 'audio'].filter(g => has(T(g)));
    if (talk.length) list.push({
      target: { all: talk.map(T).join(', ') }, icon: '💌', title: 'Falar com a teacher',
      html: `<p>${talk.includes('writing') ? '<b>Write to my teacher</b>: escreva um texto em inglês — a teacher corrige e a correção aparece aqui. ' : ''}${talk.includes('audio') ? '<b>Talk to my teacher</b>: grave um áudio em inglês para ela ouvir.' : ''}</p>`,
    });
    if (has(T('review'))) list.push({
      target: T('review'), icon: '🔁', title: 'Meus erros',
      html: '<p>As palavras que você errou nos jogos ficam guardadas aqui para revisar. Revisar no dia seguinte faz elas <b>grudarem na memória</b>!</p>',
    });
    if (has(T('progress'))) list.push({
      target: T('progress'), icon: '📈', title: 'Meu progresso',
      html: `<p>Veja tudo o que você já fez: estrelas, ${kid ? 'figurinhas, ' : ''}dias seguidos praticando 🔥 e as atividades de cada semana.</p>`,
    });
    list.push({
      target: '#stuHelpBtn', icon: '❓', title: 'Pronto! Precisa de ajuda?',
      html: `<p>Sempre que quiser ver este passo a passo de novo, toque em <b>❓ Ajuda</b>, aqui em cima.</p>
             <p class="tour-small">💡 Dica: salve este link nos <b>favoritos</b> ou na <b>tela inicial do celular</b> (menu do navegador → "Adicionar à tela inicial").
             Tudo o que ${kid ? 'a criança faz' : 'você faz'} aqui chega para a teacher. Have fun, ${name}! ✨</p>`,
    });
    return list;
  }

  function run(student, prof) {
    IGTour.start(steps(student, prof), { onEnd: () => markSeen(student.id), doneLabel: "✅ Let's go!" });
  }

  // Called by share.js every time the student's home screen is drawn.
  function attach(shell, student, prof) {
    const btn = shell.querySelector('#stuHelpBtn');
    if (btn) btn.addEventListener('click', () => run(student, prof));
    if (!seen(student.id) && autoShownFor !== student.id && !IGTour.running) {
      autoShownFor = student.id;
      setTimeout(() => run(student, prof), 500);
    }
  }

  return { attach, run };
})();

// ---------------------------------------------------------------------------
// TEACHER TOUR — how to use the site with her students
// ---------------------------------------------------------------------------
const TeacherTour = (() => {
  const SEEN_KEY = 'tour_teacher_seen';

  // Open a folded section for the step, and fold it back when the tour ends.
  function openSection(id) {
    return (st) => {
      const section = document.getElementById(id);
      if (section && section.classList.contains('is-collapsed') && typeof setSectionCollapsed === 'function') {
        setSectionCollapsed(section, false);
        st.opened.push(section);
      }
    };
  }

  function steps() {
    const adultOnly = typeof teacherAdultOnly === 'function' && teacherAdultOnly();
    const student = typeof getActiveStudent === 'function' ? getActiveStudent() : null;
    return [
      {
        icon: '👩‍🏫', title: 'Bem-vinda! Como usar o site',
        html: `<p>Em 2 minutos você vê <b>onde fica cada coisa</b> e o caminho de uma aula: escolher o aluno, dar a aula com tela
               compartilhada, registrar a aula, passar lição e mandar o boletim.</p>
               <p class="tour-small">Dá para fechar no ✕ e rever depois no botão <b>❓</b> lá em cima. As setas ← → do teclado também funcionam.</p>`,
      },
      {
        target: ['.cockpit-pick-grid', '#profileChipBtn'], before: openSection('live-class'), icon: '👋', title: '1. Quem tem aula agora?',
        html: `<p>Tudo começa no <b>Live Class</b>, no topo do site. Toque no aluno que vai ter aula — os do dia (pelos horários do Painel) aparecem primeiro.</p>
               <p>Também dá para trocar de aluno a qualquer momento pelo botão com o nome dele, no canto de cima.</p>`,
      },
      {
        target: ['.cockpit-context', '#liveClassCockpit'], before: openSection('live-class'), icon: '🕘', title: '2. O começo da aula',
        html: `<p>Com o aluno escolhido, o Live Class mostra a <b>última aula</b> (tópico, suas anotações e a lição pedida),
               o <b>tópico de hoje</b> para abrir com um clique e as <b>lições pendentes</b>.</p>
               <p>${adultOnly ? 'Para adolescentes e adultos aparece uma pergunta de <b>warm-up</b> para a conversa inicial.' : 'Para os pequenos tem as músicas <b>Hello</b> e <b>Bye Bye</b>; para os maiores, uma pergunta de warm-up.'}
               ${student ? '' : '<i>(Escolha um aluno para ver esses cartões.)</i>'}</p>`,
      },
      {
        target: ['#levels .topics-grid', '#levels'], before: openSection('levels'), icon: '📖', title: '3. Os tópicos (para compartilhar a tela)',
        html: `<p>Cada tópico abre uma janela com abas: <b>Watch</b> (vídeo e regras), <b>Game</b>, <b>Quiz</b>, <b>Reading</b>,
               <b>Speak · Listen · Write</b>${adultOnly ? '' : ' e <b>Phonics</b>'} — e mais em <b>➕ Mais</b> (Practice, Flashcards, Lesson Plan).</p>
               <p>Compartilhe a tela no Zoom e use <b>⛶</b> (ou a tecla <b>F</b>) para deixar o jogo em tela cheia.</p>`,
      },
      {
        target: ['#games .teaser-grid', '#games'], before: openSection('games'), icon: '🎮', title: '4. Games',
        html: `<p>${adultOnly ? '' : 'Os <b>jogos com figuras</b> (mochila, casa, clima…) são ótimos para os pequenos. '}
               <b>Word Match</b>, <b>Quick Quiz</b> e <b>Listen &amp; Repeat</b> usam as palavras de qualquer tópico, no nível do aluno escolhido.</p>`,
      },
      {
        target: '#liveToolbarFab', icon: '🧰', title: '5. Ferramentas da aula',
        html: `<p>Este botão fica sempre no canto da tela: <b>roleta</b> para sortear, <b>placar</b> de estrelas, <b>timer</b> com sino,
               ${adultOnly ? '' : '<b>álbum de figurinhas</b>, <b>desenho</b> e '}os <b>links da aula</b> (Canva, Zoom) de cada aluno.</p>`,
      },
      {
        target: ['#openSessionDrawerBtn', '#liveClassCockpit'], before: openSection('live-class'), icon: '📋', title: "6. No fim da aula: Today's Class",
        html: `<p>Registre a <b>presença ou falta</b>, o <b>tópico</b> (a lista mostra primeiro o nível do aluno), as palavras novas e a lição pedida.
               Suas anotações ficam só para você.</p>
               <p>O botão <b>"Salvar e gerar ficha p/ WhatsApp"</b> cria a ficha da aula para mandar à família. Esse registro alimenta a frequência, o boletim e os assuntos liberados no link do aluno.</p>
               <p>Errou alguma coisa? No histórico, no fim da mesma janela, toque em <b>✏️</b> na aula para corrigir, mudar para outro aluno ou apagar.</p>`,
      },
      {
        target: ['#homework', '#homeworkRoot'], before: openSection('homework'), icon: '🏠', title: '7. Lição de casa',
        html: `<p>Em <b>✨ Nova lição de casa</b> você monta as tarefas (prova, revisão dos erros, ditado, speaking, writing).
               O aluno faz pelo link dele e <b>o resultado volta para você</b>. Os textos chegam em <b>🖊️ Corrigir textos</b>.</p>`,
      },
      {
        target: '#profileSwitcher', icon: '🔗', title: `8. O link de cada aluno`,
        html: `<p>Em <b>⚙️ Manage All Students</b> (no botão do aluno) toque em <b>🔗</b> para pegar o link do aluno e mandar pelo WhatsApp.
               Não precisa senha: quem tem o link vê só aquele aluno.</p>
               <p>Na mesma janela você escolhe <b>o que o aluno pode acessar</b>. No automático: o vocabulário do nível dele e só a gramática que já foi dada em aula.
               Na primeira vez que a família abrir, aparece um tutorial para eles também.</p>`,
      },
      {
        target: '#inboxBtn', icon: '✉️', title: '9. Mensagens dos alunos',
        html: '<p>Áudios e textos que os alunos mandam pelo link chegam aqui. O número vermelho mostra quantas mensagens novas há.</p>',
      },
      {
        target: ['#exam-maker', '#examMakerRoot'], before: openSection('exam-maker'), icon: '📝', title: '10. Provas',
        html: `<p>Escolha os <b>tópicos prontos</b> (já filtrados para as suas turmas) ou digite os seus, e receba de 10 a 20 questões para imprimir.
               As mesmas questões viram jogos para o aluno treinar antes da prova.</p>`,
      },
      {
        target: ['#dashboard', '#teacherDashboard'], before: openSection('dashboard'), icon: '📅', title: '11. Painel: horários, presença e financeiro',
        html: `<p>Em <b>⚙️ Horários &amp; valores</b> diga os dias de aula e o valor de cada aluno. O painel mostra as aulas da semana,
               a presença do mês (vem sozinha do Today's Class) e o que falta receber.</p>`,
      },
      {
        target: ['#headerReportsBtn', '#reportsNavBtn'], icon: '📊', title: '12. Boletim (Progress Report)',
        html: `<p>Preenchido sozinho com as aulas do trimestre. Em <b>Histórico de frequência por período</b> você traz presenças e faltas de cada período
               (ex.: jan–jun, jul–dez) — digitando das suas anotações ou com <b>↻ Contar</b>.</p>
               <p>Tudo é editável: títulos, números, habilidades, assinatura e data — e dá para tirar uma seção desmarcando <b>incluir no boletim</b>. Depois <b>Salvar</b>, <b>Texto para WhatsApp</b> (você revisa o texto antes de copiar) ou <b>Salvar em PDF</b>.</p>`,
      },
      {
        target: '#teacherHelpBtn', icon: '🎯', title: 'Pronto!',
        html: `<p>Para rever este tutorial, toque em <b>❓</b> aqui em cima. Para mudar a faixa etária, os níveis ou o foco das suas turmas:
               <b>🎯 Perfil das minhas turmas</b>, no botão do aluno.</p>
               <p class="tour-small">💡 As seções do site têm uma setinha para recolher — feche o que você não usa e a página fica curtinha.</p>`,
      },
    ];
  }

  function run() {
    if (typeof closeModal === 'function') { try { closeModal(); } catch (e) { /* none open */ } }
    if (typeof closeProfileDropdown === 'function') closeProfileDropdown();
    window.scrollTo(0, 0);
    IGTour.start(steps(), {
      doneLabel: '✅ Concluir',
      onEnd: (finished, st) => {
        IGStore.setRaw(SEEN_KEY, '1');
        // Put back the sections the tour opened.
        (st.opened || []).forEach(sec => { if (typeof setSectionCollapsed === 'function') setSectionCollapsed(sec, true); });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  }

  // Once per teacher: a small card offering the tour, never a blocking one.
  function offer() {
    if (window.IG_SHARE_MODE || IGStore.getRaw(SEEN_KEY) === '1' || document.getElementById('tourOffer')) return;
    const card = document.createElement('div');
    card.id = 'tourOffer';
    card.className = 'tour-offer';
    card.innerHTML = `
      <span class="tour-offer-icon">🧭</span>
      <div><b>Quer um tour rápido pelo site?</b><small>2 minutos para ver onde fica cada coisa e como usar com os alunos.</small></div>
      <div class="tour-offer-btns">
        <button class="btn btn-primary" type="button" data-tour-yes>▶ Ver agora</button>
        <button class="game-btn secondary" type="button" data-tour-no>Depois</button>
      </div>`;
    document.body.appendChild(card);
    card.querySelector('[data-tour-yes]').addEventListener('click', () => { card.remove(); run(); });
    card.querySelector('[data-tour-no]').addEventListener('click', () => {
      card.remove();
      IGStore.setRaw(SEEN_KEY, '1');
    });
  }

  return { run, offer };
})();

// The ❓ in the teacher's header.
(function wireTeacherHelp() {
  const btn = document.getElementById('teacherHelpBtn');
  if (btn) btn.addEventListener('click', () => TeacherTour.run());
})();
