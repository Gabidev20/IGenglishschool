/* ==========================================================================
   IGenglishschool — Trazer para a conta o que ficou no computador
   --------------------------------------------------------------------------
   O site guarda os dados por "espaço de trabalho": antes de existir login,
   tudo fica em `local`; ao entrar numa conta, passa a ficar num espaço com o
   nome da conta. Quem já vinha usando o site sem login entra pela primeira
   vez e encontra a conta vazia — as aulas, os jogos e os boletins continuam
   no computador, só que no espaço antigo.

   Este arquivo encontra esses dados e oferece trazê-los. Ele COPIA, nunca
   move nem apaga: se a importação não ficar boa, o original continua lá.
   ========================================================================== */

const RECOVER_DISMISS_KEY = 'hopscotch_recover_dismissed';
const RECOVER_ADOPTED_KEY = 'hopscotch_local_adopted_by';

function recEsc(s) { return igEscapeHtml(String(s == null ? '' : s)); }

// Espaços com conteúdo que NÃO são o atual.
function igStrandedWorkspaces() {
  const current = igWorkspaceId();
  return igListWorkspaces()
    .filter(ws => ws !== current && !ws.startsWith('share_'))
    .map(igWorkspaceStats)
    .filter(igWorkspaceHasContent)
    .sort((a, b) => b.keys - a.keys);
}

// Uma frase com o que existe ali dentro.
function recSummaryLine(st) {
  const bits = [];
  if (st.students) bits.push(`${st.students} aluno(s)`);
  if (st.sessions) bits.push(`${st.sessions} aula(s) registrada(s)`);
  if (st.games) bits.push(`${st.games} jogo(s) criado(s)`);
  if (st.reports) bits.push(`${st.reports} boletim(ns)`);
  if (st.exams) bits.push(`${st.exams} prova(s)`);
  if (st.homework) bits.push(`${st.homework} lição(ões)`);
  if (st.writing) bits.push(`${st.writing} texto(s)`);
  if (st.curriculum) bits.push('edições do currículo');
  return bits.length ? bits.join(' · ') : 'dados do site';
}

function recWorkspaceLabel(ws) {
  if (ws === 'local') return 'Antes do login (neste computador)';
  return 'Outra conta usada neste computador';
}

// ---------------------------------------------------------------------------
// A IMPORTAÇÃO
// ---------------------------------------------------------------------------
async function igImportWorkspace(fromWs, overwrite) {
  const to = igWorkspaceId();
  const copied = igCopyWorkspace(fromWs, to, Boolean(overwrite));

  try { localStorage.setItem(RECOVER_ADOPTED_KEY, to); } catch (e) {}

  // Manda tudo para a nuvem, para não ficar só neste navegador de novo.
  if (typeof IGCloud !== 'undefined' && IGCloud.enabled && IGCloud.enabled() && IGCloud.pushAll) {
    try { await IGCloud.pushAll(); } catch (e) { console.error('push after import', e); }
  }
  return copied;
}

// ---------------------------------------------------------------------------
// A TELA
// ---------------------------------------------------------------------------
function openDataRecovery(auto) {
  const stranded = igStrandedWorkspaces();
  if (!stranded.length) {
    if (!auto) alert('Não encontrei dados de outro espaço neste navegador. Tudo que existe já está na sua conta.');
    return;
  }

  openModal(`
    <div class="modal-content-pad">
      <h3 id="modalTitle">📦 Trazer meus dados para esta conta</h3>
      <p class="rec-lead">
        Este navegador tem dados salvos <b>fora</b> da conta em que você está agora.
        Isso acontece com tudo que foi feito no site <b>antes de existir login</b>:
        as aulas, os jogos e os boletins ficaram guardados aqui, mas em outro espaço.
      </p>
      <div id="recList"></div>
      <p class="rec-note">
        🔒 Importar <b>copia</b>: o que está guardado continua intacto no lugar de origem.
        Nada é apagado, e você pode repetir depois se precisar.
      </p>
    </div>`, false);

  const list = document.getElementById('recList');
  list.innerHTML = stranded.map(st => `
    <div class="rec-card">
      <div class="rec-card-head">
        <b>${recEsc(recWorkspaceLabel(st.workspace))}</b>
        <span>${recEsc(recSummaryLine(st))}</span>
      </div>
      <div class="game-btn-row">
        <button class="btn btn-primary" data-import="${recEsc(st.workspace)}">📥 Trazer para minha conta</button>
      </div>
    </div>`).join('');

  list.querySelectorAll('[data-import]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ws = btn.dataset.import;
      const st = stranded.find(x => x.workspace === ws);
      if (!confirm(`Trazer para esta conta: ${recSummaryLine(st)}?\n\nO que já existe na conta não será sobrescrito.`)) return;
      btn.disabled = true;
      btn.textContent = '⏳ Trazendo…';
      const copied = await igImportWorkspace(ws, false);
      list.innerHTML = `
        <div class="rec-card ok">
          <b>✅ Pronto — ${copied} item(ns) trazido(s).</b>
          <p>Recarregue a página para ver tudo no lugar.</p>
          <div class="game-btn-row"><button class="btn btn-primary" id="recReload">🔄 Recarregar agora</button></div>
        </div>`;
      document.getElementById('recReload').addEventListener('click', () => window.location.reload());
    });
  });
}

// ---------------------------------------------------------------------------
// O AVISO AUTOMÁTICO
// ---------------------------------------------------------------------------
// Aparece uma vez, quando há dados órfãos e a conta atual é de verdade (não o
// modo local, onde não há nada para trazer).
function recMaybeOffer() {
  if (window.IG_SHARE_MODE) return;                       // aluno não importa nada
  if (igWorkspaceId() === 'local') return;                // ainda sem login
  try { if (localStorage.getItem(RECOVER_DISMISS_KEY) === igWorkspaceId()) return; } catch (e) {}

  const stranded = igStrandedWorkspaces();
  if (!stranded.length) return;

  const banner = document.createElement('div');
  banner.className = 'rec-banner';
  banner.innerHTML = `
    <span class="rec-banner-icon">📦</span>
    <div class="rec-banner-text">
      <b>Achei dados salvos neste computador fora da sua conta</b>
      <small>${recEsc(recSummaryLine(stranded[0]))} — de antes de você criar o login</small>
    </div>
    <div class="rec-banner-actions">
      <button class="btn btn-primary" id="recOpen">Ver e trazer</button>
      <button class="rec-banner-close" id="recClose" aria-label="Dispensar">✕</button>
    </div>`;
  document.body.appendChild(banner);

  document.getElementById('recOpen').addEventListener('click', () => {
    banner.remove();
    openDataRecovery(false);
  });
  document.getElementById('recClose').addEventListener('click', () => {
    try { localStorage.setItem(RECOVER_DISMISS_KEY, igWorkspaceId()); } catch (e) {}
    banner.remove();
  });
}

// O app renderiza antes do login resolver, então esperamos um pouco: o aviso
// só faz sentido depois que o espaço de trabalho final foi definido.
window.addEventListener('load', () => { setTimeout(recMaybeOffer, 2500); });
