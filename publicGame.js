/* ==========================================================================
   IGenglishschool — Jogo público (QR code do livro)
   --------------------------------------------------------------------------
   `#jogo=<id>` abre UM jogo de figuras para qualquer criança, sem login:
   é o endereço impresso em QR code nos livros I Go!.

     https://ig-englishschool.vercel.app/#jogo=colors

   O QUE ESTE MODO GARANTE
     • Nada da professora aparece: cabeçalho, menu, painel, seções, barra de
       ferramentas e a tela de login ficam escondidos (style.css,
       `html.ig-public-game`). A criança vê só o logo, o nome do jogo, o jogo
       e um botão grande de "Play again".
     • Nenhum dado de aluno: a página usa um espaço de armazenamento próprio
       e vazio (`public_game`), só em memória — o espaço da professora salvo
       neste navegador nem é lido, e a escolha dela não é alterada.
     • Nenhuma conversa com o Supabase: auth.js não roda o login, e o link do
       aluno (share.js) não é ativado. A biblioteca do Supabase nem é baixada.
     • Fechar o jogo volta para esta página da criança, nunca para o site.

   Carregado logo depois de utils.js: precisa escolher o espaço de
   armazenamento antes que qualquer outro script leia alguma coisa.
   ========================================================================== */

const PUBLIC_GAME_HASH = /^#jogo=([A-Za-z0-9_-]*)/;
const PUBLIC_GAME_WORKSPACE = 'public_game';

// The picture games a textbook QR code can point at. `open` is called only
// after every script has loaded, so the openers may live in later files.
const PUBLIC_GAMES = {
  colors:   { emoji: '🎨', title: 'Colors',        pt: 'Cores',                 open: () => openColorsGame() },
  abc:      { emoji: '🔤', title: 'ABC',           pt: 'O alfabeto',            open: () => openAlphabetGame() },
  backpack: { emoji: '🎒', title: 'School Objects', pt: 'Objetos da escola',     open: () => openBackpackGame() },
  house:    { emoji: '🏠', title: 'My House',      pt: 'As partes da casa',     open: () => openHouseGame() },
  animals:  { emoji: '🦁', title: 'Animals',       pt: 'Animais',               open: () => openAnimalGame() },
  feelings: { emoji: '😊', title: 'Feelings',      pt: 'Sentimentos',           open: () => openFeelingsGame() },
  music:    { emoji: '🎸', title: 'Music',         pt: 'Instrumentos musicais', open: () => openInstrumentsGame() },
  where:    { emoji: '📦', title: 'Where is it?',  pt: 'Onde está?',            open: () => openPrepositionsGame() },
  weather:  { emoji: '🌦️', title: 'Weather',       pt: 'O tempo',               open: () => openWeatherGame() },
  body:     { emoji: '🧍', title: 'Body Parts',    pt: 'Partes do corpo',       open: () => openBodyGame() },
};

const PublicGame = (() => {
  let gameId = null;

  function idInUrl() {
    const m = PUBLIC_GAME_HASH.exec(window.location.hash || '');
    return m ? m[1].toLowerCase() : null;
  }

  // Synchronous, before any other module touches storage.
  function claim() {
    gameId = idInUrl();
    if (gameId === null) return false;

    document.documentElement.classList.add('ig-public-game');
    window.IG_PUBLIC_GAME = gameId || 'unknown';
    // Everything that checks this flag means "this is not the teacher": no
    // inbox, no setup questions, no tour, no data recovery banner.
    window.IG_SHARE_MODE = true;

    // An empty workspace of its own, chosen in memory only: igSetWorkspace()
    // would also overwrite the teacher's saved choice in this browser.
    igWorkspace = PUBLIC_GAME_WORKSPACE;
    IGStore.clearWorkspace();
    window.addEventListener('pagehide', () => { try { IGStore.clearWorkspace(); } catch (e) {} });
    return true;
  }

  function esc(s) { return igEscapeHtml(String(s == null ? '' : s)); }

  function start() {
    const game = Object.prototype.hasOwnProperty.call(PUBLIC_GAMES, gameId) ? PUBLIC_GAMES[gameId] : null;
    const shell = document.createElement('div');
    shell.id = 'publicGameShell';
    shell.innerHTML = `
      <div class="pg-wrap">
        <div class="pg-brand">
          <img src="logo.png" alt="IG English School" class="pg-logo"
               data-fallback="IG English School" onerror="igImageFallback(this)" />
        </div>
        ${game ? `
          <span class="pg-emoji" aria-hidden="true">${game.emoji}</span>
          <h1 class="pg-title">${esc(game.title)}</h1>
          <p class="pg-sub">${esc(game.pt)}</p>
          <button class="pg-play" id="pgPlay" type="button">🔄 Play again<small>Jogar de novo</small></button>
        ` : `
          <span class="pg-emoji" aria-hidden="true">🔍</span>
          <h1 class="pg-title">Game not found</h1>
          <p class="pg-sub">Jogo não encontrado. Confira o QR code do livro e tente de novo.</p>
        `}
        <p class="pg-foot">IG English School</p>
      </div>`;
    document.body.appendChild(shell);
    document.title = game ? `${game.title} — IG English School` : 'IG English School';

    if (!game) return;
    const play = () => {
      try { game.open(); } catch (e) { console.error('public game', e); }
    };
    shell.querySelector('#pgPlay').addEventListener('click', play);
    play();
  }

  return { claim, start, get id() { return gameId; } };
})();

// ---------------------------------------------------------------------------
// BOOT — claimed now; the page is built once every game script has loaded.
// ---------------------------------------------------------------------------
if (PublicGame.claim()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PublicGame.start());
  } else {
    PublicGame.start();
  }
}

// A hash change does not reload the page. Moving into a game link from the
// open site, out of one, or to another game must still start clean.
window.addEventListener('hashchange', () => {
  const next = PUBLIC_GAME_HASH.exec(window.location.hash || '');
  const nextId = next ? next[1].toLowerCase() : null;
  if (nextId !== PublicGame.id) window.location.reload();
});
