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

// The school logo, loaded once; a missing file just leaves the badge empty.
let sheetLogoPromise = null;
function sheetLoadLogo() {
  if (!sheetLogoPromise) {
    sheetLogoPromise = new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = 'logo.png';
    });
  }
  return sheetLogoPromise;
}

function sheetRoundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// "home /həʊm/" -> { word: 'home', ipa: '/həʊm/' }
function sheetSplitPron(text) {
  const m = String(text || '').match(/^(.*?)\s*(\/[^/]+\/)\s*$/);
  return m ? { word: m[1].trim(), ipa: m[2] } : { word: String(text || '').trim(), ipa: '' };
}

async function renderClassSheetCanvas(student, session) {
  const W = 1080;
  const M = 56;                    // outer margin
  const CW = W - M * 2;            // card width
  const CP = 38;                   // card padding
  const LINE = 46;
  const C = {
    bg: '#f3f3f1', ink: '#2e2b2e', soft: '#6d6a6d',
    mauve: '#8e6d86', mauveD: '#6f5469', mauveL: '#b08aa6',
    sage: '#a9b4a4', sageD: '#6f7d68',
    van: '#faefc2', vanD: '#b8953a', vanText: '#6b5413',
    coral: '#f05d77', coralD: '#c9435c',
  };
  const F = (w, s, fam) => `${w} ${s}px ${fam || 'Inter, system-ui, sans-serif'}`;
  const DISPLAY = '"Plus Jakarta Sans", Inter, system-ui, sans-serif';

  const sheet = session.sheet || {};
  const words = Array.isArray(sheet.words) ? sheet.words : [];
  const newWords = words.map(w => String(w.word || '').trim()).filter(Boolean);
  const pronList = words.map(w => sheetSplitPron(w.pron)).filter(p => p.word);
  const homework = Array.isArray(sheet.homework) ? sheet.homework : [];
  const att = Array.isArray(sheet.attendance) ? sheet.attendance : [];
  const classNo = sheet.classNumber;
  const logo = await sheetLoadLogo();

  const measure = document.createElement('canvas').getContext('2d');
  const wrap = (font, text, width) => { measure.font = font; return sheetWrap(measure, text, width); };
  const INNER = CW - CP * 2;
  const HEAD = 84;                 // card header (label pill) block
  const GAP = 34;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // ---- Measure each section: { color, label, icon, bodyH, draw(x, y) } ----
  const top = [];      // before the words cards
  const bottom = [];   // after them

  top.push((() => {
    const lines = wrap(F(500, 32), session.topicLabel || '—', INNER);
    return {
      label: 'IN CLASS', icon: '📚', color: C.mauve, bodyH: lines.length * LINE + 4,
      draw(x, y) {
        ctx.font = F(500, 32); ctx.fillStyle = C.ink; ctx.textAlign = 'left';
        lines.forEach((l, i) => ctx.fillText(l, x, y + (i + 1) * LINE - 12));
      },
    };
  })());

  // ATTENDANCE (group classes)
  if (att.length) {
    const rows = [];
    const here = att.filter(a => a.present).map(a => a.name).join(', ');
    const away = att.filter(a => !a.present).map(a => a.name).join(', ');
    if (here) rows.push({ mark: '✅  Present', color: C.sageD, lines: wrap(F(500, 30), here, INNER - 230) });
    if (away) rows.push({ mark: '❌  Absent', color: C.coralD, lines: wrap(F(500, 30), away, INNER - 230) });
    top.push({
      label: 'ATTENDANCE', icon: '👥', color: C.sageD,
      bodyH: rows.reduce((n, r) => n + r.lines.length, 0) * LINE + (rows.length - 1) * 10,
      draw(x, y) {
        let ry = y;
        rows.forEach(r => {
          ctx.textAlign = 'left';
          ctx.font = F(700, 28); ctx.fillStyle = r.color;
          ctx.fillText(r.mark, x, ry + LINE - 12);
          ctx.font = F(500, 30); ctx.fillStyle = C.ink;
          r.lines.forEach((l, i) => ctx.fillText(l, x + 230, ry + (i + 1) * LINE - 12));
          ry += r.lines.length * LINE + 10;
        });
      },
    });
  }

  // NEW WORDS | PRONUNCIATION — two cards side by side
  const HALF = (CW - 24) / 2;
  const HIN = HALF - CP * 2;
  let wordsBlock = null;
  if (newWords.length || pronList.length) {
    const left = newWords.map(t => ({ lines: wrap(F(600, 31), t, HIN - 30) }));
    const right = pronList.map(p => {
      measure.font = F(700, 31); const ww = measure.measureText(p.word).width;
      measure.font = F(500, 28); const iw = p.ipa ? measure.measureText(p.ipa).width : 0;
      const oneLine = !p.ipa || ww + 16 + iw <= HIN - 30;
      const ipaLines = p.ipa && !oneLine ? wrap(F(500, 28), p.ipa, HIN - 30) : [];   // a long phrase's IPA wraps
      return { ...p, oneLine, ipaLines, lines: oneLine ? [p.word] : wrap(F(700, 31), p.word, HIN - 30) };
    });
    const leftH = left.reduce((n, it) => n + it.lines.length * LINE + 12, 0);
    const rightH = right.reduce((n, it) => n + it.lines.length * LINE + it.ipaLines.length * (LINE - 6) + 12, 0);
    wordsBlock = { left, right, bodyH: Math.max(leftH, rightH, LINE) };
  }

  // PHRASES / TEXT
  if (String(sheet.text || '').trim()) {
    const lines = String(sheet.text).split(/\r?\n/).flatMap(l => (l.trim() ? wrap(F(500, 31), l.trim(), INNER) : ['']));
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    bottom.push({
      label: 'PHRASES & TEXT', icon: '💬', color: C.vanD, bodyH: lines.length * LINE + 4,
      draw(x, y) {
        ctx.font = F(500, 31); ctx.fillStyle = C.ink; ctx.textAlign = 'left';
        lines.forEach((l, i) => ctx.fillText(l, x, y + (i + 1) * LINE - 12));
      },
    });
  }

  // HOMEWORK
  {
    const items = homework.map((h, i) => ({ no: i + 1, lines: wrap(F(500, 31), h, INNER - 70) }));
    const empty = !items.length;
    const bodyH = empty ? LINE : items.reduce((n, it) => n + it.lines.length * LINE + 14, 0) - 8;
    bottom.push({
      label: 'HOMEWORK', icon: '🏠', color: C.coral, bodyH,
      draw(x, y) {
        ctx.textAlign = 'left';
        if (empty) { ctx.font = F(500, 31); ctx.fillStyle = C.soft; ctx.fillText('No homework today 🎉', x, y + LINE - 12); return; }
        let ry = y;
        items.forEach(it => {
          ctx.fillStyle = C.coral;
          ctx.beginPath(); ctx.arc(x + 25, ry + 24, 25, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = F(800, 26); ctx.textAlign = 'center';
          ctx.fillText(String(it.no), x + 25, ry + 34);
          ctx.textAlign = 'left'; ctx.font = F(500, 31); ctx.fillStyle = C.ink;
          it.lines.forEach((l, i) => ctx.fillText(l, x + 70, ry + (i + 1) * LINE - 12));
          ry += it.lines.length * LINE + 14;
        });
      },
    });
  }

  const order = [...top];
  if (wordsBlock) order.push({ words: true, bodyH: wordsBlock.bodyH });
  order.push(...bottom);

  const HEADER_H = 330;
  const FOOT_H = 150;
  const heightOf = s => HEAD + s.bodyH + CP;
  const H = HEADER_H + 40 + order.reduce((n, s) => n + heightOf(s) + GAP, 0) - GAP + FOOT_H;

  canvas.width = W; canvas.height = H;
  ctx.textBaseline = 'alphabetic';

  // ---- Background: warm off-white with soft colour washes ----
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const wash = (cx, cy, r, color, a) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color + a); g.addColorStop(1, color + '00');
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  };
  wash(W - 60, H * 0.35, 420, '#faefc2', 'cc');
  wash(40, H * 0.62, 420, '#a9b4a4', '66');
  wash(W - 80, H - 260, 380, '#f05d77', '26');

  // ---- Header ----
  const g = ctx.createLinearGradient(0, 0, W, HEADER_H);
  g.addColorStop(0, C.mauveD); g.addColorStop(0.55, C.mauve); g.addColorStop(1, C.mauveL);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, HEADER_H - 64);
  ctx.arcTo(W, HEADER_H, W - 64, HEADER_H, 64); ctx.lineTo(64, HEADER_H);
  ctx.arcTo(0, HEADER_H, 0, HEADER_H - 64, 64); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.arc(W - 90, 70, 190, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(250,239,194,0.16)';
  ctx.beginPath(); ctx.arc(W - 250, HEADER_H - 20, 110, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(240,93,119,0.22)';
  ctx.beginPath(); ctx.arc(120, HEADER_H + 10, 90, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // The logo is light letters on a transparent background, so it goes
  // straight onto the mauve header (cropped to the part that has artwork).
  if (logo) {
    const sw = logo.naturalWidth, sh = Math.round(logo.naturalHeight * 0.66);
    const lw = 230, lh = Math.round(lw * sh / sw);
    ctx.drawImage(logo, 0, 0, sw, sh, W - M - lw + 10, 26, lw, lh);
  }
  ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = F(700, 26);
  try { ctx.letterSpacing = '3px'; } catch (e) { /* older browsers */ }
  ctx.fillText('LESSON RECAP', M, 96);
  try { ctx.letterSpacing = '0px'; } catch (e) { /* older browsers */ }

  // title, date pill, student
  ctx.font = F(800, 104, DISPLAY); ctx.fillStyle = '#fff';
  ctx.fillText(classNo ? `Class ${classNo}` : 'Class', M, 232);
  const dateText = sheetDateLabel(session.date);
  ctx.font = F(700, 28); const dw = ctx.measureText(dateText).width + 48;
  ctx.fillStyle = C.van; sheetRoundRect(ctx, M, 262, dw, 48, 24); ctx.fill();
  ctx.fillStyle = C.vanText; ctx.fillText(dateText, M + 24, 296);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = F(600, 30);
  ctx.fillText(student.name || '', W - M, 296);

  // ---- Cards ----
  const card = (x, y, w, h, color, label, icon) => {
    ctx.save();
    ctx.shadowColor = 'rgba(46,43,46,0.10)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#fff'; sheetRoundRect(ctx, x, y, w, h, 36); ctx.fill();
    ctx.restore();
    ctx.font = F(800, 23); try { ctx.letterSpacing = '2px'; } catch (e) { /* older browsers */ }
    const text = `${icon}  ${label}`;
    const pw = ctx.measureText(text).width + 44;
    ctx.fillStyle = color; sheetRoundRect(ctx, x + CP - 6, y + 26, pw, 46, 23); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(text, x + CP + 16, y + 58);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older browsers */ }
  };

  let y = HEADER_H + 40;
  order.forEach(s => {
    const h = heightOf(s);
    if (s.words) {
      const wb = wordsBlock;
      [['NEW WORDS', '✨', C.coral, M], ['PRONUNCIATION', '🗣️', C.mauve, M + HALF + 24]].forEach(([label, icon, color, x], side) => {
        card(x, y, HALF, h, color, label, icon);
        const items = side === 0 ? wb.left : wb.right;
        let ry = y + HEAD + 4;
        if (!items.length) {
          ctx.font = F(500, 31); ctx.fillStyle = '#c9c6c9'; ctx.textAlign = 'left';
          ctx.fillText('—', x + CP, ry + LINE - 12);
          return;
        }
        items.forEach(it => {
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(x + CP + 6, ry + 22, 6, 0, Math.PI * 2); ctx.fill();
          ctx.textAlign = 'left';
          ctx.font = side === 0 ? F(600, 31) : F(700, 31); ctx.fillStyle = C.ink;
          it.lines.forEach((l, i) => ctx.fillText(l, x + CP + 30, ry + (i + 1) * LINE - 12));
          if (side === 0) { ry += it.lines.length * LINE + 12; return; }
          if (it.ipa) {
            ctx.font = F(500, 28); ctx.fillStyle = C.mauve;
            if (it.oneLine) {
              measure.font = F(700, 31);
              ctx.fillText(it.ipa, x + CP + 30 + measure.measureText(it.word).width + 16, ry + LINE - 12);
            } else {
              it.ipaLines.forEach((l, i) => ctx.fillText(l, x + CP + 30, ry + it.lines.length * LINE + (i + 1) * (LINE - 6) - 12));
            }
          }
          ry += it.lines.length * LINE + it.ipaLines.length * (LINE - 6) + 12;
        });
      });
    } else {
      card(M, y, CW, h, s.color, s.label, s.icon);
      s.draw(M + CP, y + HEAD + 4);
    }
    y += h + GAP;
  });

  // ---- Footer ----
  ctx.textAlign = 'center';
  ctx.font = F(700, 34, DISPLAY); ctx.fillStyle = C.mauve;
  ctx.fillText('IG English School 💜', W / 2, H - FOOT_H / 2 + 14);
  ctx.font = F(500, 22); ctx.fillStyle = C.soft;
  ctx.fillText('Keep practicing — see you next class!', W / 2, H - FOOT_H / 2 + 52);

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
  try { await document.fonts.load('700 26px Inter'); await document.fonts.load('800 40px "Plus Jakarta Sans"'); } catch (e) {}

  const preview = document.getElementById('classSheetPreview');
  if (!preview) return;   // modal closed while fonts loaded
  const canvas = await renderClassSheetCanvas(student, session);
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
