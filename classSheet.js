/* ==========================================================================
   IGenglishschool — Class Sheet (ficha da aula)
   One picture per class, in the same layout as the paper sheet the teacher
   used to fill in: "Class 16 - September, 29", what was done in class, the
   new words with their pronunciation, and the homework. It is drawn on a
   canvas (no libraries) so it can go straight to the student on WhatsApp.
   ========================================================================== */

const SHEET_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// "2026-09-29" -> "September, 29" — the teacher's own way of writing it.
function sheetDateLabel(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return iso || '';
  return `${SHEET_MONTHS[m - 1]}, ${d}`;
}

function sheetTitle(session) {
  const no = session.sheet && session.sheet.classNumber;
  return `${no ? `Class ${no} - ` : ''}${sheetDateLabel(session.date)}`;
}

function sheetFileName(student, session) {
  const name = String(student.name || 'aluno').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const no = session.sheet && session.sheet.classNumber;
  return `${name}-${no ? `class-${no}-` : ''}${session.date}.png`;
}

// Splits text into lines that fit maxWidth, honouring line breaks the teacher
// typed and breaking words that are longer than a whole line.
function sheetWrap(ctx, text, maxWidth) {
  const out = [];
  String(text || '').split(/\r?\n/).forEach(para => {
    let line = '';
    para.split(/\s+/).filter(Boolean).forEach(word => {
      while (ctx.measureText(word).width > maxWidth && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && ctx.measureText(word.slice(0, cut)).width > maxWidth) cut--;
        if (line) { out.push(line); line = ''; }
        out.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = word; }
      else line = test;
    });
    out.push(line);
  });
  return out.length ? out : [''];
}

function renderClassSheetCanvas(student, session) {
  const W = 1200;
  const PAD = 48;
  const BOX_W = W - PAD * 2;
  const INNER = 22;              // text padding inside a box
  const LINE = 40;               // body line height
  const GAP = 40;                // space between boxes
  const INK = '#2e2b2e';
  const SOFT = '#6d6a6d';
  const HEAD_BG = '#f3f3f1';
  const ACCENT = '#8e6d86';

  const fontBody = '400 28px Inter, system-ui, sans-serif';
  const fontBold = '700 26px Inter, system-ui, sans-serif';
  const fontTitle = '500 54px Inter, system-ui, sans-serif';
  const fontSmall = '500 22px Inter, system-ui, sans-serif';

  const sheet = session.sheet || {};
  const words = Array.isArray(sheet.words) ? sheet.words : [];
  const homework = Array.isArray(sheet.homework) ? sheet.homework : [];

  // A first pass on a scratch canvas measures everything, so the final image
  // is exactly as tall as its content — a long word list just makes it longer.
  const measure = document.createElement('canvas').getContext('2d');
  const colW = BOX_W / 2;

  measure.font = fontBody;
  const inClassLines = sheetWrap(measure, session.topicLabel || '—', BOX_W - INNER * 2);
  const wordRows = words.map(w => {
    const left = sheetWrap(measure, w.word || '', colW - INNER * 2);
    const right = sheetWrap(measure, w.pron || '', colW - INNER * 2);
    return { left, right, lines: Math.max(left.length, right.length) };
  });
  const NUM_W = 52;
  const hwRows = homework.length
    ? homework.map((h, i) => ({ no: `${i + 1}-`, lines: sheetWrap(measure, h, BOX_W - INNER * 2 - NUM_W) }))
    : [{ no: '', lines: ['No homework today.'] }];

  const titleH = 110;
  const inClassH = INNER + 34 + inClassLines.length * LINE + INNER - 6;
  const HEAD_H = 64;
  const wordsBodyLines = wordRows.reduce((n, r) => n + r.lines, 0);
  const wordsBodyH = Math.max(220, INNER * 2 + wordsBodyLines * LINE + Math.max(0, wordRows.length - 1) * 10);
  const hwBodyLines = hwRows.reduce((n, r) => n + r.lines.length, 0);
  const hwBodyH = Math.max(150, INNER * 2 + hwBodyLines * LINE);
  const footerH = 70;
  const H = PAD + titleH + inClassH + GAP + HEAD_H + wordsBodyH + GAP + HEAD_H + hwBodyH + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;

  let y = PAD;

  // Title + who it is for
  ctx.fillStyle = INK;
  ctx.font = fontTitle;
  ctx.textAlign = 'left';
  ctx.fillText(sheetTitle(session), PAD, y + 58);
  ctx.font = fontSmall;
  ctx.fillStyle = SOFT;
  ctx.textAlign = 'right';
  ctx.fillText(student.name || '', W - PAD, y + 56);
  y += titleH;

  // IN CLASS
  ctx.strokeRect(PAD, y, BOX_W, inClassH);
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = fontBold;
  ctx.fillText('IN CLASS', PAD + INNER, y + INNER + 24);
  ctx.font = fontBody;
  inClassLines.forEach((l, i) => ctx.fillText(l, PAD + INNER, y + INNER + 34 + (i + 1) * LINE - 10));
  y += inClassH + GAP;

  // NEW WORDS / EXPRESSIONS | PRONUNCIATION
  ctx.fillStyle = HEAD_BG;
  ctx.fillRect(PAD, y, BOX_W, HEAD_H);
  ctx.strokeRect(PAD, y, BOX_W, HEAD_H + wordsBodyH);
  ctx.beginPath();
  ctx.moveTo(PAD, y + HEAD_H); ctx.lineTo(PAD + BOX_W, y + HEAD_H);
  ctx.moveTo(PAD + colW, y); ctx.lineTo(PAD + colW, y + HEAD_H + wordsBodyH);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = fontBold;
  ctx.textAlign = 'center';
  ctx.fillText('NEW WORDS / EXPRESSIONS', PAD + colW / 2, y + HEAD_H / 2 + 9);
  ctx.fillText('PRONUNCIATION', PAD + colW * 1.5, y + HEAD_H / 2 + 9);
  ctx.textAlign = 'left';
  let ry = y + HEAD_H + INNER;
  wordRows.forEach(r => {
    ctx.font = '600 28px Inter, system-ui, sans-serif';
    ctx.fillStyle = INK;
    r.left.forEach((l, i) => ctx.fillText(l, PAD + INNER, ry + (i + 1) * LINE - 10));
    ctx.font = fontBody;
    ctx.fillStyle = ACCENT;
    r.right.forEach((l, i) => ctx.fillText(l, PAD + colW + INNER, ry + (i + 1) * LINE - 10));
    ry += r.lines * LINE + 10;
  });
  y += HEAD_H + wordsBodyH + GAP;

  // HOMEWORK
  ctx.fillStyle = HEAD_BG;
  ctx.fillRect(PAD, y, BOX_W, HEAD_H);
  ctx.strokeRect(PAD, y, BOX_W, HEAD_H + hwBodyH);
  ctx.beginPath();
  ctx.moveTo(PAD, y + HEAD_H); ctx.lineTo(PAD + BOX_W, y + HEAD_H);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = fontBold;
  ctx.textAlign = 'center';
  ctx.fillText('HOMEWORK', W / 2, y + HEAD_H / 2 + 9);
  ctx.textAlign = 'left';
  ctx.font = fontBody;
  ry = y + HEAD_H + INNER;
  hwRows.forEach(r => {
    ctx.fillStyle = INK;
    if (r.no) ctx.fillText(r.no, PAD + INNER, ry + LINE - 10);
    if (!r.no) ctx.fillStyle = SOFT;
    r.lines.forEach((l, i) => ctx.fillText(l, PAD + INNER + (r.no ? NUM_W : 0), ry + (i + 1) * LINE - 10));
    ry += r.lines.length * LINE;
  });
  y += HEAD_H + hwBodyH;

  // Footer
  ctx.font = fontSmall;
  ctx.fillStyle = ACCENT;
  ctx.textAlign = 'center';
  ctx.fillText('IG English School 💜', W / 2, y + 48);

  return canvas;
}

function sheetCanvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

function sheetDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function sheetCopyImage(blob) {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch (e) { return false; }
}

async function openClassSheetModal(student, session) {
  openModal(`
    <div class="modal-content-pad class-sheet-modal">
      <h3 id="modalTitle">🖼️ Ficha da aula — ${escapeHtmlLite(student.name)}</h3>
      <p class="class-sheet-sub">${escapeHtmlLite(sheetTitle(session))}</p>
      <div class="class-sheet-preview" id="classSheetPreview"><p>Gerando imagem…</p></div>
      <div class="game-btn-row class-sheet-actions">
        <button class="game-btn" id="sheetShareBtn" type="button" disabled>📱 Enviar pelo WhatsApp</button>
        <button class="game-btn secondary" id="sheetCopyBtn" type="button" disabled>📋 Copiar imagem</button>
        <button class="game-btn secondary" id="sheetDownloadBtn" type="button" disabled>⬇️ Baixar</button>
      </div>
      <p class="class-sheet-msg" id="classSheetMsg" hidden></p>
    </div>
  `);

  // Inter comes from Google Fonts; draw only once it is in, or the first
  // sheet of the day would come out in a fallback font.
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
  try { await document.fonts.load('700 26px Inter'); } catch (e) {}

  const preview = document.getElementById('classSheetPreview');
  if (!preview) return;   // modal closed while fonts loaded
  const canvas = renderClassSheetCanvas(student, session);
  const blob = await sheetCanvasToBlob(canvas);
  const fileName = sheetFileName(student, session);
  const file = new File([blob], fileName, { type: 'image/png' });

  preview.innerHTML = '';
  const img = document.createElement('img');
  img.src = URL.createObjectURL(blob);
  img.alt = `Ficha da aula: ${sheetTitle(session)}`;
  preview.appendChild(img);

  const msgEl = document.getElementById('classSheetMsg');
  const say = (text) => { msgEl.textContent = text; msgEl.hidden = false; };
  const shareBtn = document.getElementById('sheetShareBtn');
  const copyBtn = document.getElementById('sheetCopyBtn');
  const dlBtn = document.getElementById('sheetDownloadBtn');
  [shareBtn, copyBtn, dlBtn].forEach(b => { b.disabled = false; });

  // The blob is ready before any click, so the share sheet opens inside the
  // click's user gesture — browsers refuse navigator.share() otherwise.
  shareBtn.addEventListener('click', async () => {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: sheetTitle(session) });
        say('✅ Escolha o WhatsApp e a conversa do aluno na janela de compartilhar.');
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;   // she closed the share sheet
      }
    }
    // No share sheet (most desktop browsers): copy the picture and open
    // WhatsApp Web, where Ctrl+V in the chat attaches it.
    if (await sheetCopyImage(blob)) {
      say('✅ Imagem copiada! No WhatsApp, abra a conversa do aluno e cole com Ctrl+V.');
    } else {
      sheetDownload(blob, fileName);
      say('⬇️ Imagem baixada. No WhatsApp, abra a conversa do aluno e anexe o arquivo.');
    }
    window.open('https://web.whatsapp.com/', '_blank', 'noopener');
  });

  copyBtn.addEventListener('click', async () => {
    if (await sheetCopyImage(blob)) say('✅ Imagem copiada — cole com Ctrl+V onde quiser.');
    else say('Este navegador não deixa copiar imagens. Use “Baixar”.');
  });

  dlBtn.addEventListener('click', () => {
    sheetDownload(blob, fileName);
    say(`⬇️ Salvo como ${fileName}`);
  });
}
