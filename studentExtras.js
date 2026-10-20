/* ==========================================================================
   IGenglishschool — Teacher-only extras per student + automatic phonetics

   • Class type: individual, or GROUP. A group is a single record with a list
     of member names; "Today's class" lists every member so presence /
     absence is marked per person, in one class and one sheet for the group.
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
  return loadStudentExtras()[studentId] || { notes: '', isGroup: false, members: [] };
}

function saveStudentExtra(studentId, patch) {
  const map = loadStudentExtras();
  const next = { ...(map[studentId] || {}), ...patch };
  if (!next.notes && !next.isGroup && !next.groupId && !next.memberIds) delete map[studentId];
  else map[studentId] = next;
  IGStore.setJSON(STUDENT_EXTRAS_KEY, map);
}

// A group is ONE record (one card, one class log, one class sheet) whose
// members are only names — attendance is marked per name in Today's Class.
function isGroupStudent(studentId) {
  return Boolean(getStudentExtra(studentId).isGroup);
}

function groupMemberNames(studentId) {
  const e = getStudentExtra(studentId);
  return e.isGroup && Array.isArray(e.members) ? e.members : [];
}

// ---- group links (groupLink.js) --------------------------------------------
// Each member of a group that shares ONE link is also a normal student record
// (so progress, book pages and homework stay separate). Their extras carry
// `groupId` (+ `memberName`); the group's extras carry `memberIds`.
function studentGroupId(studentId) {
  const g = getStudentExtra(studentId).groupId;
  return typeof g === 'string' && g ? g : null;
}

function studentGroupName(studentId) {
  const gid = studentGroupId(studentId);
  if (!gid || typeof loadStudents !== 'function') return '';
  const g = loadStudents().find(s => s.id === gid);
  return g ? g.name : '';
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
