/* ==========================================================================
   IGenglishschool — Manual do Aluno (digital, dentro do site)
   The student manual is shown page by page, as designed, with the fillable
   parts (text lines, tick boxes, the weekly table, level rings) laid over the
   pages. What the student types is saved on this device (IGStore key
   `manual_<studentId>`) and travels with the progress that the student's page
   already sends to the teacher's cloud, so it is there on the next visit —
   also from another phone.
   Pages: manual/p1.jpg … p8.jpg. Fields: [name, kind(t|c), page, x%, y%, w%, h%, fontPt].
   ========================================================================== */

const MANUAL_PAGES = 8;
const MANUAL_PAGE_WIDTH_PT = 594.96;   // used to scale the font with the page
const MANUAL_FIELDS = [["p1_light_0","t",1,9.528,89.808,50.027,2.358,13.0],["p6_tick_1","c",6,12.512,54.318,1.714,1.213,0],["p6_tick_2","c",6,51.456,54.318,1.716,1.213,0],["p6_tick_3","c",6,12.512,58.523,1.714,1.212,0],["p6_tick_4","c",6,51.456,58.523,1.716,1.212,0],["p6_tick_5","c",6,12.512,60.961,1.714,1.213,0],["p6_tick_6","c",6,51.456,60.961,1.716,1.213,0],["p6_tick_7","c",6,12.512,63.398,1.714,1.213,0],["p6_tick_8","c",6,51.456,63.398,1.716,1.213,0],["p7_text_9","t",7,9.528,15.667,80.995,2.861,11.0],["p7_text_10","t",7,9.528,18.528,80.995,2.863,11.0],["p7_text_11","t",7,9.528,31.912,80.995,2.861,11.0],["p7_text_12","t",7,9.528,34.773,80.995,2.863,11.0],["p7_text_13","t",7,9.528,60.55,80.995,2.863,11.0],["p7_text_14","t",7,9.528,63.412,80.995,2.861,11.0],["p7_text_15","t",7,9.528,66.274,80.995,2.863,11.0],["p7_cell_16","t",7,24.422,45.052,9.596,3.705,8.0],["p7_cell_17","t",7,34.017,45.052,7.801,3.705,8.0],["p7_cell_18","t",7,41.818,45.052,10.066,3.705,8.0],["p7_cell_19","t",7,51.884,45.052,8.819,3.705,8.0],["p7_cell_20","t",7,60.703,45.052,9.11,3.705,8.0],["p7_cell_21","t",7,69.813,45.052,9.486,3.705,8.0],["p7_cell_22","t",7,79.299,45.052,11.102,3.705,8.0],["p7_cell_23","t",7,24.422,48.756,9.596,3.703,8.0],["p7_cell_24","t",7,34.017,48.756,7.801,3.703,8.0],["p7_cell_25","t",7,41.818,48.756,10.066,3.703,8.0],["p7_cell_26","t",7,51.884,48.756,8.819,3.703,8.0],["p7_cell_27","t",7,60.703,48.756,9.11,3.703,8.0],["p7_cell_28","t",7,69.813,48.756,9.486,3.703,8.0],["p7_cell_29","t",7,79.299,48.756,11.102,3.703,8.0],["p7_cell_30","t",7,24.422,52.456,9.596,4.649,8.0],["p7_cell_31","t",7,34.017,52.456,7.801,4.649,8.0],["p7_cell_32","t",7,41.818,52.456,10.066,4.649,8.0],["p7_cell_33","t",7,51.884,52.456,8.819,4.649,8.0],["p7_cell_34","t",7,60.703,52.456,9.11,4.649,8.0],["p7_cell_35","t",7,69.813,52.456,9.486,4.649,8.0],["p7_cell_36","t",7,79.299,52.456,11.102,4.649,8.0],["p7_ring_37","c",7,9.528,25.417,12.707,3.138,0],["p7_ring_38","c",7,23.183,25.417,12.707,3.138,0],["p7_ring_39","c",7,36.843,25.417,12.707,3.138,0],["p7_ring_40","c",7,50.503,25.417,12.707,3.138,0],["p7_ring_41","c",7,64.157,25.417,12.707,3.138,0],["p7_ring_42","c",7,77.817,25.417,12.707,3.138,0]];

const manualKey = sid => `manual_${sid}`;
function manualLoad(studentId) {
  const m = IGStore.getJSON(manualKey(studentId), {});
  return m && typeof m === 'object' && !Array.isArray(m) ? m : {};
}
function manualSave(studentId, data) {
  data._t = Date.now();
  IGStore.setJSON(manualKey(studentId), data);
}

function openStudentManual(student) {
  const sid = student && student.id;
  if (!sid) return;
  const data = manualLoad(sid);
  let timer = null;
  const flashSaved = () => {
    const el = document.getElementById('mnSaved');
    if (el) { el.textContent = '✅ Salvo'; el.classList.add('flash'); setTimeout(() => el && el.classList.remove('flash'), 700); }
  };
  const persist = () => { clearTimeout(timer); timer = setTimeout(() => { timer = null; manualSave(sid, data); flashSaved(); }, 400); };

  const fieldsFor = p => MANUAL_FIELDS.filter(f => f[2] === p).map(([name, kind, , x, y, w, h, fs]) => {
    if (kind === 't') {
      const size = ((fs || 11) / MANUAL_PAGE_WIDTH_PT * 100).toFixed(3);
      return `<input type="text" class="mn-in" data-f="${name}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;font-size:${size}cqw"
        value="${igEscapeHtml(data[name] || '')}" autocomplete="off" aria-label="Campo do manual"/>`;
    }
    // Tick boxes are tiny on the page: the tap area is larger than the drawing.
    const padX = Math.max(0, (3.2 - w) / 2), padY = Math.max(0, (2.2 - h) / 2);
    return `<button type="button" class="mn-tick${data[name] ? ' on' : ''}" data-f="${name}" aria-pressed="${data[name] ? 'true' : 'false'}"
      style="left:${x - padX}%;top:${y - padY}%;width:${w + padX * 2}%;height:${h + padY * 2}%" aria-label="Marcar"></button>`;
  }).join('');

  const pages = Array.from({ length: MANUAL_PAGES }, (_, i) => `
    <div class="mn-page"><img src="manual/p${i + 1}.jpg" alt="Manual do Aluno — página ${i + 1}" loading="${i < 2 ? 'eager' : 'lazy'}" draggable="false"/>${fieldsFor(i + 1)}</div>`).join('');

  openModal(`
    <div class="modal-content-pad mn-wrap">
      <div class="mn-bar"><h3 id="modalTitle">📘 Manual do Aluno</h3><span class="mn-saved" id="mnSaved">O que você escrever fica salvo.</span></div>
      <div class="mn-pages" id="mnPages">${pages}</div>
    </div>`, true);

  const root = document.getElementById('mnPages');
  root.addEventListener('input', e => {
    const f = e.target && e.target.dataset && e.target.dataset.f;
    if (!f || e.target.tagName !== 'INPUT') return;
    data[f] = e.target.value;
    persist();
  });
  root.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.mn-tick');
    if (!b) return;
    const on = !b.classList.contains('on');
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    data[b.dataset.f] = on;
    persist();
  });
  // Closing the window right after typing must not lose the last letters.
  const flushNow = () => { if (timer) { clearTimeout(timer); timer = null; manualSave(sid, data); } };
  [document.getElementById('modalCloseBtn'), document.getElementById('modalBackBtn')]
    .forEach(b => b && b.addEventListener('click', flushNow, { once: true }));
  window.addEventListener('pagehide', flushNow, { once: true });
}
