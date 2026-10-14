// Phonetic transcription for the class sheet's "Pronunciation" column.
// Reads Longman (ldoceonline.com) on the server — a browser can't, CORS — and
// returns the British IPA Longman lists first, e.g. /həˈləʊ/.
// GET /api/ipa?w=ice%20cream  ->  { ipa: "/aɪs kriːm/" }   ({ ipa: "" } if unsure)

const UA = 'Mozilla/5.0 (compatible; IGEnglishSchool/1.0)';

function clean(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function longman(slug) {
  const res = await fetch('https://www.ldoceonline.com/dictionary/' + encodeURIComponent(slug), { headers: { 'User-Agent': UA } });
  if (!res.ok) return '';
  const page = await res.text();
  const start = page.indexOf('<span class="PRON">');
  if (start < 0) return '';
  // The PRON span can hold nested spans (optional sounds), so read it balanced.
  let i = start + '<span class="PRON">'.length, depth = 1;
  const tag = /<(\/?)span[^>]*>/g;
  tag.lastIndex = i;
  let m, end = -1;
  while ((m = tag.exec(page))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) { end = m.index; break; }
  }
  if (end < 0) return '';
  // "həˈləʊ, he-" -> first form only
  const first = clean(page.slice(i, end)).split(',')[0].trim();
  return first;
}

async function wordIpa(word) {
  const w = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!w) return '';
  try {
    const l = await longman(w);
    if (l) return l;
  } catch (e) { /* fall through */ }
  try {
    const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w));
    if (!r.ok) return '';
    const data = await r.json();
    for (const entry of data) {
      for (const p of entry.phonetics || []) if (p.text) return p.text.replace(/^[\/\[]|[\/\]]$/g, '');
    }
  } catch (e) { /* give up */ }
  return '';
}

module.exports = async (req, res) => {
  const text = String((req.query && req.query.w) || '').trim().slice(0, 80);
  res.setHeader('Cache-Control', 'public, s-maxage=2592000, max-age=86400');
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 6) return res.status(200).json({ ipa: '' });

  let ipa = '';
  if (words.length > 1) {
    try { ipa = await longman(words.join('-')); } catch (e) { ipa = ''; }
  }
  if (!ipa) {
    const parts = [];
    for (const w of words) {
      const p = await wordIpa(w);
      if (!p) { parts.length = 0; break; }
      parts.push(p);
    }
    ipa = parts.join(' ');
  }
  res.status(200).json({ ipa: ipa ? '/' + ipa.replace(/^\/|\/$/g, '') + '/' : '' });
};
