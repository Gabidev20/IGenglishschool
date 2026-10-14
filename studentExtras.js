/* ==========================================================================
   IGenglishschool — Teacher-only extras per student + automatic phonetics

   • Class type: individual, or part of a GROUP. A group is just a name shared
     by several students; "Today's class" then lists every member so presence
     / absence is marked for each one and a class is logged on each record.
   • Private notes (goal, likes…): only the teacher sees them.
   • IPA lookup for the "Pronunciation" column of the class sheet.

   Kept under their own key (like profiles.js) so they ride along with the
   rest of the teacher's data in the cloud and never reach the student link.
   ========================================================================== */
const STUDENT_EXTRAS_KEY = 'student_extras';

function loadStudentExtras() {
  const raw = IGStore.getJSON(STUDENT_EXTRAS_KEY, {});
  return raw && typeof raw === 'object' ? raw : {};
}

function getStudentExtra(studentId) {
  return loadStudentExtras()[studentId] || { notes: '', groupId: null, groupName: '' };
}

function saveStudentExtra(studentId, patch) {
  const map = loadStudentExtras();
  const next = { ...(map[studentId] || {}), ...patch };
  if (!next.notes && !next.groupId) delete map[studentId];
  else map[studentId] = next;
  IGStore.setJSON(STUDENT_EXTRAS_KEY, map);
}

// Distinct groups that still have at least one student: [{ id, name }]
function listStudentGroups() {
  const alive = new Set(loadStudents().map(s => s.id));
  const seen = new Map();
  Object.entries(loadStudentExtras()).forEach(([sid, e]) => {
    if (e && e.groupId && alive.has(sid) && !seen.has(e.groupId)) seen.set(e.groupId, { id: e.groupId, name: e.groupName || 'Grupo' });
  });
  return [...seen.values()];
}

// Everyone in the same group as this student (the student included), or [].
function groupMembersOf(studentId) {
  const gid = getStudentExtra(studentId).groupId;
  if (!gid) return [];
  const extras = loadStudentExtras();
  return loadStudents().filter(s => extras[s.id] && extras[s.id].groupId === gid);
}

// ---------------------------------------------------------------------------
// Phonetics — /api/ipa (api/ipa.js) reads Longman on the server, since a
// browser can't (CORS). British IPA, as Longman lists it first. An unknown
// word comes back empty, so the teacher types it instead of getting a guess.
// ---------------------------------------------------------------------------
const IPA_CACHE_KEY = 'ig_ipa_cache_v1';
const ipaMemory = (() => {
  try { return JSON.parse(localStorage.getItem(IPA_CACHE_KEY) || '{}') || {}; } catch (e) { return {}; }
})();

async function lookupIpa(text) {
  const key = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!key) return '';
  if (key in ipaMemory) return ipaMemory[key];
  const res = await fetch('/api/ipa?w=' + encodeURIComponent(key));
  if (!res.ok) throw new Error('ipa lookup failed');
  const data = await res.json();
  const ipa = (data && data.ipa) || '';
  if (ipa) {
    ipaMemory[key] = ipa;
    try { localStorage.setItem(IPA_CACHE_KEY, JSON.stringify(ipaMemory)); } catch (e) { /* full / blocked */ }
  }
  return ipa;
}
