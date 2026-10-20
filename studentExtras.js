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
  if (!next.notes && !next.isGroup && !next.groupId && !next.memberIds && !next.privateLinks) delete map[studentId];
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
// Phonetics — the "Pronunciation" column of the class sheet.
// Order of preference for every word / phrase typed:
//   1. the teacher's OWN corrections (IGStore 'ipa_custom', synced to the cloud)
//   2. the confirmed-results cache (localStorage 'ig_ipa_cache_v1', old format kept)
//   3. /api/ipa (api/ipa.js: Longman, dictionaryapi.dev, Wiktionary, Datamuse…)
//   4. ipaG2p.js, a local letter-to-sound guess for any word the server could
//      not give (or when offline) — flagged `approx`, never cached, so a better
//      source wins the next time.
// ---------------------------------------------------------------------------
const IPA_CACHE_KEY = 'ig_ipa_cache_v1';
const IPA_CUSTOM_KEY = 'ipa_custom';
const ipaMemory = (() => {
  try { return JSON.parse(localStorage.getItem(IPA_CACHE_KEY) || '{}') || {}; } catch (e) { return {}; }
})();

function ipaKey(text) {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function ipaWrap(s) {
  const t = String(s || '').trim().replace(/^\/+|\/+$/g, '').trim();
  return t ? '/' + t + '/' : '';
}
function ipaBare(s) {
  return String(s || '').replace(/^\/|\/$/g, '');
}

// "word /ipa/" -> { word, ipa }   (same format the class sheet image reads)
function ipaSplit(text) {
  const m = String(text || '').match(/^(.*?)\s*(\/[^/]+\/)\s*$/);
  return m ? { word: m[1].trim(), ipa: m[2] } : { word: String(text || '').trim(), ipa: '' };
}

// ---- the teacher's own corrections ----
function loadIpaCustom() {
  const raw = (typeof IGStore !== 'undefined') ? IGStore.getJSON(IPA_CUSTOM_KEY, {}) : {};
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}
function getIpaCustom(text) {
  const v = loadIpaCustom()[ipaKey(text)];
  return typeof v === 'string' ? v : '';
}
function saveIpaCustom(text, ipa) {
  const key = ipaKey(text);
  const val = ipaWrap(ipa);
  if (!key || !val || typeof IGStore === 'undefined') return;
  const map = loadIpaCustom();
  if (map[key] === val) return;
  map[key] = val;
  IGStore.setJSON(IPA_CUSTOM_KEY, map);
}
function removeIpaCustom(text) {
  const key = ipaKey(text);
  const map = loadIpaCustom();
  if (!(key in map) || typeof IGStore === 'undefined') return;
  delete map[key];
  IGStore.setJSON(IPA_CUSTOM_KEY, map);
}

function ipaApprox(text) {
  try { return (window.IGG2P && window.IGG2P.approx(text)) || ''; } catch (e) { return ''; }
}

async function fetchIpa(chunk) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), 9000) : null;
  try {
    const res = await fetch('/api/ipa?w=' + encodeURIComponent(chunk), ctl ? { signal: ctl.signal } : undefined);
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === 'object' ? data : null;
  } catch (e) {
    return null;                                    // offline / blocked / timed out
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// One chunk of at most 8 words (the server's limit) -> { ipa (no slashes), approx, source }.
async function lookupChunk(chunk, fresh) {
  const key = ipaKey(chunk);
  if (!fresh && typeof ipaMemory[key] === 'string' && ipaMemory[key]) {
    return { ipa: ipaBare(ipaMemory[key]), approx: false, source: 'cache' };
  }
  const data = await fetchIpa(key);
  const parts = [];
  let approx = false, anyServer = false, anyLocal = false;
  const custom = fresh ? {} : loadIpaCustom();
  if (data && Array.isArray(data.words) && data.words.length) {
    for (const w of data.words) {
      const own = custom[ipaKey(w.w)];
      if (typeof own === 'string' && own) { parts.push(ipaBare(own)); continue; }
      if (w.ipa) {
        parts.push(ipaBare(String(w.ipa)));
        anyServer = true;
        if (w.source === 'rule' || w.source === 'spelled') approx = true;
        continue;
      }
      const g = ipaApprox(w.w);
      if (g) { parts.push(ipaBare(g)); anyLocal = true; }
    }
  } else if (data && data.ipa) {
    parts.push(ipaBare(String(data.ipa)));
    anyServer = true;
    approx = !!data.approx;
  }
  if (!parts.length) {
    const g = ipaApprox(chunk);
    return g ? { ipa: ipaBare(g), approx: true, source: 'approx' } : { ipa: '', approx: false, source: '' };
  }
  const ipa = parts.join(' ');
  const confirmed = data && !data.partial && !anyLocal && !approx && anyServer;
  if (confirmed && ipa) {
    ipaMemory[key] = '/' + ipa + '/';
    try { localStorage.setItem(IPA_CACHE_KEY, JSON.stringify(ipaMemory)); } catch (e) { /* full / blocked */ }
  }
  return { ipa, approx: approx || anyLocal, source: anyLocal ? (anyServer ? 'mixed' : 'approx') : 'server' };
}

// Full pipeline. Never throws and never returns an empty ipa for a text that
// has letters or digits. `fresh` skips the corrections and the cache (↻ button).
async function lookupIpaDetailed(text, opts) {
  const fresh = !!(opts && opts.fresh);
  const key = ipaKey(text);
  const none = { ipa: '', approx: false, source: '' };
  if (!key) return none;
  try {
    if (!fresh) {
      const own = getIpaCustom(key);
      if (own) return { ipa: own, approx: false, source: 'custom' };
    }
    const tokens = key.split(' ');
    const chunks = [];
    for (let i = 0; i < tokens.length && i < 24; i += 8) chunks.push(tokens.slice(i, i + 8).join(' '));
    const results = [];
    for (const c of chunks) results.push(await lookupChunk(c, fresh));
    const got = results.filter(r => r.ipa);
    if (!got.length) return none;
    const sources = new Set(got.map(r => r.source));
    return {
      ipa: ipaWrap(got.map(r => r.ipa).join(' ')),
      approx: got.some(r => r.approx),
      source: sources.size === 1 ? [...sources][0] : 'mixed',
    };
  } catch (e) {
    const g = ipaApprox(key);
    return g ? { ipa: g, approx: true, source: 'approx' } : none;
  }
}

// Kept for older callers: just the "/ipa/" string ('' only when there is nothing to say).
async function lookupIpa(text) {
  return (await lookupIpaDetailed(text)).ipa;
}
