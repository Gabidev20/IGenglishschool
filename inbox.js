/* ==========================================================================
   IGenglishschool — The teacher's inbox
   What students send from their link ("Write to my teacher") used to land
   silently inside Lição → Corrigir textos, and only after the site was
   reopened. Now: a ✉️ button in the header with the number of unread
   messages, a toast when one arrives (cloud.js checks every minute while
   the site is open), and one click to read and answer.
   ========================================================================== */

function inboxUnread() {
  if (typeof skAllSubmissions !== 'function') return 0;
  // Unread = not opened yet and not answered (texts corrected before the
  // inbox existed are not "new").
  return skAllSubmissions().filter(w => !w.seen && !(w.correction && (w.correction.text || w.correction.note))).length;
}

function refreshInboxBadge() {
  const badge = document.getElementById('inboxBadge');
  const btn = document.getElementById('inboxBtn');
  if (!badge || !btn) return;
  const n = inboxUnread();
  badge.textContent = n > 9 ? '9+' : String(n);
  badge.hidden = n === 0;
  btn.classList.toggle('has-unread', n > 0);
  btn.title = n ? `${n} mensagem(ns) nova(s) dos alunos` : 'Mensagens dos alunos';
}

function inboxToast(text, onClick) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'inbox-toast';
  el.textContent = text;
  el.addEventListener('click', () => { el.remove(); if (onClick) onClick(); });
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 20);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 8000);
}

(function initInbox() {
  if (window.IG_SHARE_MODE) return;             // the student's page has no inbox
  const btn = document.getElementById('inboxBtn');
  if (btn) btn.addEventListener('click', () => { if (typeof openWritingDesk === 'function') openWritingDesk(); });

  // A new message or finished homework from a student's link.
  window.addEventListener('ig:student-activity', e => {
    const rows = (e.detail && e.detail.rows) || [];
    const students = typeof loadStudents === 'function' ? loadStudents() : [];
    const nameOf = id => (students.find(s => s.id === id) || {}).name || 'um aluno';
    // Rows sent again (a message already here) don't ring: `isNew` is false.
    const isNew = r => r.isNew !== false;
    const writers = [...new Set(rows.filter(r => r.kind === 'writing' && isNew(r)).map(r => nameOf(r.studentId)))];
    const homework = [...new Set(rows.filter(r => r.kind === 'homework_result' && isNew(r)).map(r => nameOf(r.studentId)))];
    refreshInboxBadge();
    if (writers.length) {
      if (typeof IGSound !== 'undefined') IGSound.bell();
      inboxToast(`📩 Nova mensagem de ${writers.join(', ')} — clique para ler`, () => openWritingDesk());
    } else if (homework.length) {
      inboxToast(`📚 ${homework.join(', ')} fez a lição de casa!`);
    }
    // The homework list shows the new results too.
    const hwRoot = document.getElementById('homeworkRoot');
    if (hwRoot && typeof renderHomework === 'function') { try { renderHomework(hwRoot); } catch (err) { /* ignore */ } }
  });

  // Anything touching a student's texts (sync, reading one) updates the badge.
  if (typeof IGStore !== 'undefined' && IGStore.onWrite) {
    IGStore.onWrite(key => { if (String(key).startsWith('writing_') || key === 'students') refreshInboxBadge(); });
  }
  refreshInboxBadge();
  setTimeout(refreshInboxBadge, 3000);          // after the first cloud pull
})();
