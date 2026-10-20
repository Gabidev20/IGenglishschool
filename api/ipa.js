// Phonetic transcription for the class sheet's "Pronunciation" column.
// Runs on the server because a browser can't read these sites (CORS).
//
// GET /api/ipa?w=ice%20cream
//   -> { ipa: "/aɪs kriːm/", sources: ["longman"], approx: false, partial: false,
//        words: [{ w: "ice", ipa: "aɪs", source: "longman" }, ...] }
//   ({ ipa: "" } when nothing at all was found)
//
// Every word of a phrase is looked up on its own and the ones that work are
// kept (partial: true says some were missing — the page fills those in with
// its local letter-to-sound guess). Sources, in order:
//   longman     ldoceonline.com, British IPA (the reference)
//   dictionary  dictionaryapi.dev
//   wiktionary  en.wiktionary.org {{IPA|en|...}}, UK/RP form preferred
//   datamuse    CMU pronouncing dictionary (US ARPAbet) converted to IPA
//   rule        a plural / -ing / -ed form built from a base word's IPA
//   spelled     an acronym read letter by letter (USA -> juː es eɪ)
//   contraction / number are expanded before the lookup (don't, 12 -> twelve)

const UA = 'Mozilla/5.0 (compatible; IGEnglishSchool/1.0)';
const MAX_WORDS = 8;

async function get(url, opts, ms) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), ms || 5000) : null;
  try {
    return await fetch(url, { ...(opts || {}), ...(ctl ? { signal: ctl.signal } : {}) });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function clean(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

// ---- sources ---------------------------------------------------------------

async function longman(slug) {
  const res = await get('https://www.ldoceonline.com/dictionary/' + encodeURIComponent(slug), { headers: { 'User-Agent': UA } });
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
  return clean(page.slice(i, end)).split(',')[0].trim();
}

async function dictionaryApi(w) {
  const r = await get('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w));
  if (!r.ok) return '';
  const data = await r.json();
  if (!Array.isArray(data)) return '';
  for (const entry of data) {
    for (const p of entry.phonetics || []) if (p.text) return p.text.replace(/^[\/\[]|[\/\]]$/g, '');
  }
  return '';
}

// ARPAbet (CMU) -> IPA, written in the British style of the rest of the file
// (əʊ, ɜː, ɒ for the "hot" vowel...). It is still an American recording, so
// the r's stay and the source is reported as "datamuse".
const ARPA = {
  AA: 'ɑː', AE: 'æ', AH: 'ʌ', AO: 'ɔː', AW: 'aʊ', AY: 'aɪ', EH: 'e', ER: 'ɜː', EY: 'eɪ',
  IH: 'ɪ', IY: 'iː', OW: 'əʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'uː',
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm',
  N: 'n', NG: 'ŋ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};
const ARPA_VOWELS = new Set(['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW']);
const ONSET2_SECOND = new Set(['L', 'R', 'W', 'Y']);
const ONSET2_FIRST = new Set(['P', 'B', 'T', 'D', 'K', 'G', 'F', 'TH', 'SH', 'S', 'V']);
const S_CLUSTER = new Set(['P', 'T', 'K', 'M', 'N', 'L', 'W', 'F']);

// How many consonants before a stressed vowel belong to its syllable
// (maximal onset): "ex-tra" -> ˈ goes before "tr" in "ˈek.strə"? We keep it
// simple and safe: one consonant, or a plausible 2-3 consonant onset.
function onsetLength(ph, vowelIdx) {   // ph: array of ARPA bases (no digits)
  let n = 0;
  while (vowelIdx - n - 1 >= 0 && !ARPA_VOWELS.has(ph[vowelIdx - n - 1])) n++;
  if (n <= 1) return n;
  const c = ph.slice(vowelIdx - n, vowelIdx);
  const last2 = c.slice(-2), last3 = c.slice(-3);
  if (last3.length === 3 && last3[0] === 'S' && ['P', 'T', 'K'].includes(last3[1]) && ['L', 'R', 'W', 'Y'].includes(last3[2])) return 3;
  if (last2[0] === 'S' && S_CLUSTER.has(last2[1])) return 2;
  if (ONSET2_FIRST.has(last2[0]) && ONSET2_SECOND.has(last2[1]) && last2[0] !== 'S') return 2;
  return 1;
}

function arpaToIpa(pron) {
  const toks = String(pron || '').trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return '';
  const ph = [], st = [];
  for (const t of toks) {
    const m = t.match(/^([A-Z]+)([012])?$/);
    if (!m || !(m[1] in ARPA)) return '';
    ph.push(m[1]); st.push(m[2] === undefined ? '' : m[2]);
  }
  const marks = {};   // position -> mark inserted before it
  ph.forEach((p, i) => {
    if (!ARPA_VOWELS.has(p) || (st[i] !== '1' && st[i] !== '2')) return;
    const at = i - onsetLength(ph, i);
    marks[at] = st[i] === '1' ? 'ˈ' : 'ˌ';
  });
  const hasStress = ph.some((p, i) => ARPA_VOWELS.has(p) && st[i] === '1');
  const nVowels = ph.filter(p => ARPA_VOWELS.has(p)).length;
  let out = '';
  ph.forEach((p, i) => {
    // a lone stressed vowel needs no mark in a one-syllable word... Longman
    // marks it though (ˈhel), so keep ˈ for every primary stress except in
    // monosyllables, where dictionaries drop it.
    if (marks[i] && !(nVowels === 1 && hasStress)) out += marks[i];
    let s = ARPA[p];
    if (p === 'AH') s = st[i] === '0' ? 'ə' : 'ʌ';
    else if (p === 'ER') s = st[i] === '0' ? 'ə' : 'ɜː';
    else if (p === 'IH' && st[i] === '0') s = 'ɪ';
    out += s;
  });
  return out;
}

async function datamuse(w) {
  const r = await get('https://api.datamuse.com/words?sp=' + encodeURIComponent(w) + '&md=r&max=3');
  if (!r.ok) return '';
  const data = await r.json();
  if (!Array.isArray(data)) return '';
  for (const item of data) {
    if (String(item.word).toLowerCase() !== w) continue;     // sp= is fuzzy: exact word only
    for (const t of item.tags || []) {
      if (typeof t === 'string' && t.indexOf('pron:') === 0) {
        const ipa = arpaToIpa(t.slice(5));
        if (ipa) return ipa;
      }
    }
  }
  return '';
}

async function wiktionary(w) {
  for (const title of [w, w.charAt(0).toUpperCase() + w.slice(1)]) {
    const r = await get('https://en.wiktionary.org/w/index.php?action=raw&title=' + encodeURIComponent(title), { headers: { 'User-Agent': UA } });
    if (!r.ok) continue;
    let text = await r.text();
    const eng = text.indexOf('==English==');
    if (eng < 0) continue;
    text = text.slice(eng + 11);
    const next = text.search(/\n==[^=]/);
    if (next >= 0) text = text.slice(0, next);
    const found = [];
    for (const line of text.split('\n')) {
      if (!/\{\{IPA\|en\|/.test(line)) continue;
      const uk = /\{\{(a|accent)\|[^}]*\b(UK|RP|British)\b/i.test(line) || /\ba=[^|}]*\b(UK|RP)\b/.test(line);
      const m = line.match(/\{\{IPA\|en\|(\/[^|}]+\/)/);
      if (m) found.push({ uk, ipa: m[1].slice(1, -1).replace(/[͜͡.]/g, '').replace(/ɹ/g, 'r').replace(/ɛ/g, 'e').replace(/ɫ/g, 'l').replace(/ɡ/g, 'ɡ').replace(/g/g, 'ɡ') });
    }
    const pick = found.find(f => f.uk) || found[0];
    if (pick && pick.ipa) {
      let ipa = pick.ipa;
      // An American-tagged form: bring it closer to the British style used elsewhere.
      if (!pick.uk) ipa = ipa.replace(/oʊ/g, 'əʊ').replace(/ɑ(?!ː)/g, 'ɑː').replace(/ɔ(?![ːɪ])/g, 'ɔː');
      return ipa;
    }
  }
  return '';
}

// ---- helpers: numbers, letters, inflections --------------------------------

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function numberWords(n) {
  if (n < 20) return [ONES[n]];
  if (n < 100) return [TENS[Math.floor(n / 10)]].concat(n % 10 ? [ONES[n % 10]] : []);
  if (n < 1000) return [ONES[Math.floor(n / 100)], 'hundred'].concat(n % 100 ? numberWords(n % 100) : []);
  const units = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
  for (const [v, name] of units) {
    if (n >= v) return numberWords(Math.floor(n / v)).concat([name], n % v ? numberWords(n % v) : []);
  }
  return [];
}
const ORD = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
function ordinalWord(word) {
  if (ORD[word]) return ORD[word];
  if (/y$/.test(word)) return word.slice(0, -1) + 'ieth';
  return word + 'th';
}
// "12" -> ['twelve'], "3rd" -> ['third'], "2.5" -> two point five, "10%" handled by caller stripping %
function digitsToWords(tok) {
  let m = tok.match(/^(\d{1,9})(st|nd|rd|th)$/i);
  if (m) { const ws = numberWords(parseInt(m[1], 10)); ws[ws.length - 1] = ordinalWord(ws[ws.length - 1]); return ws; }
  m = tok.match(/^(\d{1,9})(?:[.,](\d{1,6}))?$/);
  if (!m) return null;
  let ws = numberWords(parseInt(m[1], 10));
  if (m[2]) ws = ws.concat(['point'], m[2].split('').map(d => ONES[+d]));
  return ws;
}

const LETTERS = {
  a: 'eɪ', b: 'biː', c: 'siː', d: 'diː', e: 'iː', f: 'ef', g: 'dʒiː', h: 'eɪtʃ', i: 'aɪ', j: 'dʒeɪ', k: 'keɪ', l: 'el',
  m: 'em', n: 'en', o: 'əʊ', p: 'piː', q: 'kjuː', r: 'ɑː', s: 'es', t: 'tiː', u: 'juː', v: 'viː', w: 'ˈdʌbəl juː',
  x: 'eks', y: 'waɪ', z: 'zed',
};
function spellOut(w) {
  return w.split('').map(c => LETTERS[c]).filter(Boolean).join(' ');
}

const VOICELESS_END = /(p|t|k|f|θ|s|ʃ)$/;
const SIBILANT_END = /(s|z|ʃ|ʒ)$/;
function bare(ipa) { return ipa.replace(/[ˈˌ.()]/g, ''); }
function addS(ipa) {
  const b = bare(ipa);
  if (SIBILANT_END.test(b)) return ipa + 'ɪz';
  return ipa + (VOICELESS_END.test(b) ? 's' : 'z');
}
function addEd(ipa) {
  const b = bare(ipa);
  if (/(t|d)$/.test(b)) return ipa + 'ɪd';
  return ipa + (VOICELESS_END.test(b) ? 't' : 'd');
}
function addIng(ipa) { return ipa + 'ɪŋ'; }

// Inflected forms a dictionary page may lack: [base candidates..., suffix function]
function inflections(w) {
  const out = [];
  let m;
  if ((m = w.match(/^(.*[^aeiou])ies$/))) out.push([[m[1] + 'y'], addS]);
  if ((m = w.match(/^(.*(?:s|x|z|ch|sh|o))es$/))) out.push([[m[1]], addS]);
  if ((m = w.match(/^(.+)s$/)) && !/ss$/.test(w)) out.push([[m[1]], addS]);
  if ((m = w.match(/^(.+)ing$/))) {
    const b = m[1];
    const c = [b, b + 'e'];
    if (/([^aeiou])\1$/.test(b)) c.push(b.slice(0, -1));
    out.push([c, addIng]);
  }
  if ((m = w.match(/^(.+)ied$/))) out.push([[m[1] + 'y'], addEd]);
  if ((m = w.match(/^(.+)ed$/))) {
    const b = m[1];
    const c = [b, b + 'e'];
    if (/([^aeiou])\1$/.test(b)) c.push(b.slice(0, -1));
    out.push([c, addEd]);
  }
  if ((m = w.match(/^(.+)er$/))) out.push([[m[1], m[1] + 'e'], (i) => i + 'ə']);
  if ((m = w.match(/^(.+)ly$/))) out.push([[m[1]], (i) => i + 'li']);
  return out;
}

// Contractions: irregular ones by table, the rest by suffix.
const CONTRACTIONS = {
  "don't": 'dəʊnt', "can't": 'kɑːnt', "won't": 'wəʊnt', "i'm": 'aɪm', "i've": 'aɪv', "i'll": 'aɪl', "i'd": 'aɪd',
  "isn't": 'ˈɪzənt', "aren't": 'ɑːnt', "wasn't": 'ˈwɒzənt', "weren't": 'wɜːnt', "doesn't": 'ˈdʌzənt', "didn't": 'ˈdɪdənt',
  "haven't": 'ˈhævənt', "hasn't": 'ˈhæzənt', "hadn't": 'ˈhædənt', "shouldn't": 'ˈʃʊdənt', "wouldn't": 'ˈwʊdənt',
  "couldn't": 'ˈkʊdənt', "mustn't": 'ˈmʌsənt', "let's": 'lets', "o'clock": 'əˈklɒk', "ain't": 'eɪnt',
  "you're": 'jɔː', "we're": 'wɪə', "they're": 'ðeə', "he's": 'hiːz', "she's": 'ʃiːz', "it's": 'ɪts', "that's": 'ðæts',
  "what's": 'wɒts', "there's": 'ðeəz', "here's": 'hɪəz', "who's": 'huːz', "where's": 'weəz',
};

// ---- one word --------------------------------------------------------------

async function dictionaryChain(w) {
  // Longman first (most words end here); the rest are asked together, then
  // taken in order of preference so an unknown word doesn't wait for four
  // requests one after another.
  try { const l = await longman(w); if (l) return { ipa: l, source: 'longman' }; } catch (e) { /* next */ }
  const rest = [['dictionary', dictionaryApi], ['wiktionary', wiktionary], ['datamuse', datamuse]];
  const got = await Promise.all(rest.map(([, fn]) => fn(w).catch(() => '')));
  for (let i = 0; i < rest.length; i++) if (got[i]) return { ipa: got[i], source: rest[i][0] };
  return null;
}

async function wordIpa(raw, depth) {
  const original = String(raw);
  const w = original.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z'-]/g, '').replace(/^['-]+|['-]+$/g, '');
  if (!w) return null;
  if (w in CONTRACTIONS) return { ipa: CONTRACTIONS[w], source: 'contraction' };

  // Contraction with a suffix: "john's", "we'll", "they've"
  if (w.indexOf("'") > 0 && depth < 2) {
    const m = w.match(/^(.+?)(n't|'s|'ll|'re|'ve|'d|'m)$/);
    if (m) {
      const base = await wordIpa(m[1], depth + 1);
      if (base) {
        const suf = m[2];
        let ipa = base.ipa;
        if (suf === "'s") ipa = addS(ipa);
        else if (suf === "'ll") ipa += 'əl';
        else if (suf === "'re") ipa += 'ə';
        else if (suf === "'ve") ipa += 'əv';
        else if (suf === "'d") ipa += 'd';
        else if (suf === "'m") ipa += 'm';
        else ipa += 'nt';
        return { ipa, source: 'contraction' };
      }
    }
  }
  const plain = w.replace(/'/g, '');

  // Hyphenated: the whole thing as one entry first, then each part.
  if (w.indexOf('-') > 0 && depth < 2) {
    const whole = await dictionaryChain(w);
    if (whole) return whole;
    const parts = w.split('-').filter(Boolean);
    const got = [];
    for (const p of parts) {
      const r = await wordIpa(p, depth + 1);
      if (!r) return null;
      got.push(r.ipa);
    }
    return { ipa: got.join(' '), source: 'rule' };
  }

  const direct = await dictionaryChain(plain);
  if (direct) return direct;

  if (depth < 2) {
    for (const [bases, fn] of inflections(plain)) {
      for (const b of bases) {
        if (b.length < 2) continue;
        const r = await dictionaryChain(b);
        if (r) return { ipa: fn(r.ipa), source: 'rule' };
      }
    }
  }
  // An acronym typed in capitals: read it letter by letter.
  if (/^[A-Z]{2,5}$/.test(original.replace(/[^A-Za-z]/g, '')) && original.replace(/[^A-Za-z]/g, '').length >= 2) {
    return { ipa: spellOut(plain), source: 'spelled' };
  }
  return null;
}

// ---- handler ---------------------------------------------------------------

async function transcribe(text) {
  const tokens = text.split(/\s+/).filter(Boolean).slice(0, MAX_WORDS);
  // Expand digits into words first ("12" -> "twelve").
  const items = [];
  for (const t of tokens) {
    const stripped = t.replace(/^[^\w']+|[^\w']+$/g, '');
    const nums = /\d/.test(stripped) ? digitsToWords(stripped.replace(/,(?=\d{3}\b)/g, '')) : null;
    if (nums) nums.forEach(n => items.push({ w: n, from: stripped }));
    else items.push({ w: t, from: t });
  }
  if (!items.length || items.length > 16) return { ipa: '' };

  const sources = new Set();
  let words = null;
  // A multi-word entry may have a page of its own ("ice cream").
  const letters = tokens.length > 1 && tokens.every(t => /^[A-Za-z'-]+$/.test(t));
  if (letters) {
    try {
      const whole = await longman(tokens.join('-').toLowerCase());
      if (whole) { words = [{ w: tokens.join(' '), ipa: whole, source: 'longman' }]; }
    } catch (e) { /* word by word then */ }
  }
  if (!words) {
    const results = await Promise.all(items.map(it => wordIpa(it.w, 0).catch(() => null)));
    words = items.map((it, i) => ({ w: it.w, ipa: results[i] ? results[i].ipa : '', source: results[i] ? results[i].source : '' }));
  }
  const ok = words.filter(x => x.ipa);
  if (!ok.length) return { ipa: '', sources: [], approx: false, partial: true, words };
  ok.forEach(x => sources.add(x.source));
  const ipa = ok.map(x => x.ipa.replace(/^\/|\/$/g, '')).join(' ');
  return {
    ipa: '/' + ipa + '/',
    sources: [...sources],
    approx: ok.some(x => x.source === 'rule' || x.source === 'spelled'),
    partial: ok.length < words.length,
    words,
  };
}

module.exports = async (req, res) => {
  const text = String((req.query && req.query.w) || '').trim().slice(0, 100);
  res.setHeader('Cache-Control', 'public, s-maxage=2592000, max-age=86400');
  if (!text) return res.status(200).json({ ipa: '' });
  let out;
  try { out = await transcribe(text); } catch (e) { out = { ipa: '' }; }
  // Don't let the CDN keep an empty / partial answer for a month: a source
  // may simply have been down.
  if (!out.ipa || out.partial) res.setHeader('Cache-Control', 'public, s-maxage=300, max-age=60');
  res.status(200).json(out);
};
module.exports.transcribe = transcribe;
module.exports.arpaToIpa = arpaToIpa;
