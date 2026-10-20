/* ==========================================================================
   IGG2P — a small letter-to-sound engine for English (local, offline)

   Last resort of the pronunciation column: when no dictionary knows a word
   (a name, a new word, slang, a typo) the sheet still gets a transcription,
   marked "≈ aproximada" so the teacher knows to check it.

   Based on the classic NRL (Elovitz et al., 1976) context rules. Each rule is
   [leftContext, letters, rightContext, phonemes]; the first rule that fits wins.
     #  one or more vowels      :  zero or more consonants   ^  one consonant
     .  one voiced consonant    +  front vowel (E I Y)       %  suffix (E ES ED ER ING ELY)
     (space) word boundary
   Phonemes are ARPAbet-like (OH = the "hot" vowel), turned into British-style
   IPA at the end, with a stress mark chosen by simple suffix/prefix habits.

   window.IGG2P.approx("Rayandra") -> "/ˈreɪændrə/"      (never throws; '' if no letters)
   ========================================================================== */
(function () {
  'use strict';

  const RULES = {
    A: [
      [' ', 'A', ' ', 'AX'], [' ', 'ARE', ' ', 'AA R'], [' ', 'AR', 'O', 'AX R'], ['', 'AR', '#', 'EH R'],
      ['^', 'AS', '#', 'EY S'], ['', 'A', 'WA', 'AX'], ['', 'AW', '', 'AO'], [' :', 'ANY', '', 'EH N IY'],
      ['', 'A', '^+#', 'EY'], ['#:', 'ALLY', '', 'AX L IY'], [' ', 'AL', '#', 'AX L'], ['', 'AGAIN', '', 'AX G EH N'],
      ['#:', 'AG', 'E', 'IH JH'], ['', 'A', '^+:#', 'AE'], [' :', 'A', '^+ ', 'EY'], ['', 'A', '^%', 'EY'],
      [' ', 'ARR', '', 'AX R'], ['', 'ARR', '', 'AE R'], [' :', 'AR', ' ', 'AA R'], ['', 'AR', ' ', 'AA'],
      ['', 'AR', '', 'AA R'], ['', 'AIR', '', 'EH R'], ['', 'AI', '', 'EY'], ['', 'AY', '', 'EY'], ['', 'AU', '', 'AO'],
      ['#:', 'AL', ' ', 'AX L'], ['#:', 'ALS', ' ', 'AX L Z'], ['', 'ALK', '', 'AO K'], ['', 'AL', '^', 'AO L'],
      [' :', 'ABLE', '', 'EY B AX L'], ['', 'ABLE', '', 'AX B AX L'], ['', 'ANG', '+', 'EY N JH'],
      ['#:^', 'A', ' ', 'AX'], ['', 'A', '', 'AE'],
    ],
    B: [
      [' ', 'BE', '^#', 'B IH'], ['', 'BEING', '', 'B IY IH NG'], [' ', 'BOTH', ' ', 'B OW TH'], [' ', 'BUS', '#', 'B IH Z'],
      ['', 'BUIL', '', 'B IH L'], ['M', 'B', ' ', ''], ['', 'B', '', 'B'],
    ],
    C: [
      [' ', 'CH', '^', 'K'], ['^E', 'CH', '', 'K'], ['', 'CH', '', 'CH'], [' S', 'CI', '#', 'S AY'], ['', 'CI', 'A', 'SH'],
      ['', 'CI', 'O', 'SH'], ['', 'CI', 'EN', 'SH'], ['', 'C', '+', 'S'], ['', 'CK', '', 'K'], ['', 'COM', '%', 'K AH M'],
      ['', 'C', '', 'K'],
    ],
    D: [
      ['#:', 'DED', ' ', 'D IH D'], ['.E', 'D', ' ', 'D'], ['#:^E', 'D', ' ', 'T'], [' ', 'DE', '^#', 'D IH'], [' ', 'DO', ' ', 'D UW'],
      [' ', 'DOES', '', 'D AH Z'], [' ', 'DOING', '', 'D UW IH NG'], [' ', 'DOW', '', 'D AW'], ['', 'DU', 'A', 'JH UW'],
      ['', 'DG', '+', 'JH'], ['', 'D', '', 'D'],
    ],
    E: [
      ['#:', 'E', ' ', ''], ["':^", 'E', ' ', ''], [' :', 'E', ' ', 'IY'], ['#', 'ED', ' ', 'D'], ['#:', 'E', 'D ', ''],
      ['', 'EV', 'ER', 'EH V'], ['', 'E', '^%', 'IY'], ['', 'ERI', '#', 'IY R IY'], ['', 'ERI', '', 'EH R IH'],
      ['#:', 'ER', '#', 'ER'], ['', 'ER', '#', 'EH R'], ['', 'ER', '', 'ER'], [' ', 'EVEN', '', 'IY V EH N'],       ['T', 'EW', '', 'UW'], ['S', 'EW', '', 'UW'], ['R', 'EW', '', 'UW'], ['D', 'EW', '', 'UW'], ['L', 'EW', '', 'UW'],
      ['Z', 'EW', '', 'UW'], ['N', 'EW', '', 'UW'], ['J', 'EW', '', 'UW'], ['TH', 'EW', '', 'UW'], ['CH', 'EW', '', 'UW'],
      ['SH', 'EW', '', 'UW'], ['#:', 'E', 'W', ''], ['', 'EW', '', 'Y UW'], ['', 'E', 'O', 'IY'], ['#:S', 'ES', ' ', 'IH Z'], ['#:C', 'ES', ' ', 'IH Z'],
      ['#:G', 'ES', ' ', 'IH Z'], ['#:Z', 'ES', ' ', 'IH Z'], ['#:X', 'ES', ' ', 'IH Z'], ['#:J', 'ES', ' ', 'IH Z'],
      ['#:CH', 'ES', ' ', 'IH Z'], ['#:SH', 'ES', ' ', 'IH Z'], ['#:', 'E', 'S ', ''], ['#:', 'ELY', ' ', 'L IY'],
      ['#:', 'EMENT', '', 'M EH N T'], ['', 'EFUL', '', 'F UH L'], ['', 'EE', '', 'IY'], ['', 'EARN', '', 'ER N'],
      [' ', 'EAR', '^', 'ER'], ['', 'EAD', '', 'EH D'], ['#:', 'EA', ' ', 'IY AX'], ['', 'EA', 'SU', 'EH'], ['', 'EAR', '', 'IY R'],
      ['', 'EA', '', 'IY'], ['', 'EIGH', '', 'EY'], ['', 'EI', '', 'IY'], [' ', 'EYE', '', 'AY'], ['', 'EY', '', 'IY'],
      ['', 'EU', '', 'Y UW'], ['', 'E', '', 'EH'],
    ],
    F: [['', 'FUL', '', 'F UH L'], ['', 'F', '', 'F']],
    G: [
      ['', 'GIV', '', 'G IH V'], [' ', 'G', 'I^', 'G'], ['', 'GE', 'T', 'G EH'], ['SU', 'GGES', '', 'G JH EH S'], ['', 'GG', '', 'G'],
      [' B#', 'G', '', 'G'], ['', 'G', '+', 'JH'], ['', 'GREAT', '', 'G R EY T'], ['#', 'GH', '', ''], [' ', 'GN', '', 'N'],
      ['', 'G', '', 'G'],
    ],
    H: [
      [' ', 'HI', ' ', 'HH AY'],
      [' ', 'HAV', '', 'HH AE V'], [' ', 'HERE', '', 'HH IY R'], [' ', 'HOUR', '', 'AW ER'], ['', 'HOW', '', 'HH AW'],
      ['', 'H', '#', 'HH'], ['', 'H', '', ''],
    ],
    I: [
      [' ', 'IN', '', 'IH N'], [' ', 'I', ' ', 'AY'], ['', 'IN', 'D', 'AY N'], ['', 'IER', '', 'IY ER'], ['#:R', 'IED', '', 'IY D'],
      ['', 'IED', ' ', 'AY D'], ['', 'IEND', '', 'EH N D'], ['', 'IEN', '', 'IY EH N'], ['', 'IE', 'T', 'AY EH'], [' :', 'I', '%', 'AY'], ['', 'I', '%', 'IY'],
      ['', 'IE', '', 'IY'], ['', 'IA', ' ', 'IY AX'], ['#:^', 'I', ' ', 'IY'], ['', 'I', '^+:#', 'IH'], ['', 'IR', '#', 'AY R'], ['', 'IZ', '%', 'AY Z'], ['', 'IS', '%', 'AY Z'],
      ['', 'I', 'D%', 'AY'], ['+^', 'I', '^+', 'IH'], ['', 'I', 'T%', 'AY'], ['#^:', 'I', '^+', 'IH'], ['', 'I', '^+', 'AY'],
      ['', 'IR', '', 'ER'], ['', 'IGH', '', 'AY'], ['', 'ILD', '', 'AY L D'], ['', 'IGN', ' ', 'AY N'], ['', 'IGN', '^', 'AY N'],
      ['', 'IGN', '%', 'AY N'], ['', 'IQUE', '', 'IY K'], ['', 'I', '', 'IH'],
    ],
    J: [['', 'J', '', 'JH']],
    K: [[' ', 'K', 'N', ''], ['', 'K', '', 'K']],
    L: [['', 'LO', 'C#', 'L OW'], ['L', 'L', '', ''], ['#:^', 'L', '%', 'AX L'], ['', 'LEAD', '', 'L IY D'], ['', 'L', '', 'L']],
    M: [['', 'MOV', '', 'M UW V'], ['', 'M', '', 'M']],
    N: [
      ['E', 'NG', '+', 'N JH'], ['', 'NG', 'R', 'NG G'], ['', 'NG', '#', 'NG G'], ['', 'NGL', '%', 'NG G AX L'], ['', 'NG', '', 'NG'],
      ['', 'NK', '', 'NG K'], [' ', 'NOW', ' ', 'N AW'], ['', 'N', '', 'N'],
    ],
    O: [
      ['', 'OF', ' ', 'AX V'], ['', 'OROUGH', '', 'ER OW'], ['#:', 'OR', ' ', 'ER'], ['#:', 'ORS', ' ', 'ER Z'], ['', 'OR', '', 'AO R'],
      [' ', 'ONE', '', 'W AH N'], ['', 'OW', '', 'OW'], [' ', 'OVER', '', 'OW V ER'], ['', 'OV', '', 'AH V'], ['', 'O', '^%', 'OW'],
      ['', 'O', '^EN', 'OW'], ['', 'O', '^I#', 'OW'], ['', 'OL', 'D', 'OW L'], ['', 'OUGHT', '', 'AO T'], ['', 'OUGH', '', 'AH F'],
      [' ', 'OU', '', 'AW'], ['H', 'OU', 'S#', 'AW'], ['', 'OUS', '', 'AX S'], ['', 'OUR', '', 'AO R'], ['', 'OULD', '', 'UH D'],
      ['^', 'OU', '^L', 'AH'], ['', 'OUP', '', 'UW P'], ['', 'OU', '', 'AW'], ['', 'OY', '', 'OY'], ['', 'OING', '', 'OW IH NG'],
      ['', 'OI', '', 'OY'], ['', 'OOR', '', 'AO R'], ['', 'OOK', '', 'UH K'], ['', 'OOD', '', 'UH D'], ['', 'OO', '', 'UW'],
      ['', 'O', 'E', 'OW'], ['', 'O', ' ', 'OW'], ['', 'OA', '', 'OW'], [' ', 'ONLY', '', 'OW N L IY'], [' ', 'ONCE', '', 'W AH N S'],
      ['', "ON'T", '', 'OW N T'], ['C', 'O', 'N', 'OH'], ['', 'O', 'NG', 'OH'], [' :^', 'O', 'N', 'AH'], ['I', 'ON', '', 'AX N'],
      ['#:', 'ON', ' ', 'AX N'], ['#^', 'ON', '', 'AX N'], ['', 'O', 'ST ', 'OW'], ['', 'OF', '^', 'AO F'], ['', 'OTHER', '', 'AH DH ER'],
      ['', 'OSS', ' ', 'AO S'], ['#:^', 'OM', '', 'AH M'], ['', 'O', '', 'OH'],
    ],
    P: [['', 'PH', '', 'F'], ['', 'PEOP', '', 'P IY P'], ['', 'POW', '', 'P AW'], ['', 'PUT', ' ', 'P UH T'], ['', 'P', '', 'P']],
    Q: [['', 'QUE', ' ', 'K'], ['', 'QUAR', '', 'K W AO R'], ['', 'QU', '', 'K W'], ['', 'Q', '', 'K']],
    R: [[' ', 'RE', '^#', 'R IY'], ['', 'R', '', 'R']],
    S: [
      ['', 'SH', '', 'SH'], ['#', 'SION', '', 'ZH AX N'], ['', 'SOME', '', 'S AH M'], ['#', 'SUR', '#', 'ZH ER'], ['', 'SURE', '', 'SH UH R'],
      ['#', 'SU', '#', 'ZH UW'], ['#', 'SSU', '#', 'SH UW'], ['#', 'SED', ' ', 'Z D'], ['#', 'S', '#', 'Z'], ['', 'SAID', '', 'S EH D'],
      ['^', 'SION', '', 'SH AX N'], ['', 'S', 'S', ''], ['.', 'S', ' ', 'Z'], ['#:.E', 'S', ' ', 'Z'], ['#:^#', 'S', ' ', 'Z'],
      ['U', 'S', ' ', 'S'], [' :#', 'S', ' ', 'Z'], [' ', 'SCH', '', 'S K'], ['', 'S', 'C+', ''], ['#', 'SM', '', 'Z M'], ['', 'S', '', 'S'],
    ],
    T: [
      [' ', 'THE', ' ', 'DH AX'], ['', 'TO', ' ', 'T UW'], ['', 'THAT', ' ', 'DH AE T'], [' ', 'THIS', ' ', 'DH IH S'], [' ', 'THEY', '', 'DH EY'],
      [' ', 'THERE', '', 'DH EH R'], ['', 'THER', '', 'DH ER'], ['', 'THEIR', '', 'DH EH R'], [' ', 'THAN', ' ', 'DH AE N'],
      [' ', 'THEM', ' ', 'DH EH M'], ['', 'THESE', ' ', 'DH IY Z'], [' ', 'THEN', '', 'DH EH N'], ['', 'THROUGH', '', 'TH R UW'],
      ['', 'THOSE', '', 'DH OW Z'], ['', 'THOUGH', ' ', 'DH OW'], [' ', 'THUS', '', 'DH AH S'], ['', 'TH', '', 'TH'],
      ['#:', 'TED', ' ', 'T IH D'], ['S', 'TI', '#N', 'CH'], ['', 'TI', 'O', 'SH'], ['', 'TI', 'A', 'SH'], ['', 'TIEN', '', 'SH AX N'],
      ['', 'TUR', '#', 'CH ER'], ['', 'TU', 'A', 'CH UW'], [' ', 'TWO', '', 'T UW'], ['', 'TCH', '', 'CH'], ['', 'T', '', 'T'],
    ],
    U: [
      [' ', 'UN', 'I', 'Y UW N'], [' ', 'UN', '', 'AH N'], [' ', 'UPON', '', 'AX P AO N'], ['T', 'UR', '#', 'UH R'], ['S', 'UR', '#', 'UH R'],
      ['R', 'UR', '#', 'UH R'], ['D', 'UR', '#', 'UH R'], ['L', 'UR', '#', 'UH R'], ['Z', 'UR', '#', 'UH R'], ['N', 'UR', '#', 'UH R'],
      ['J', 'UR', '#', 'UH R'], ['TH', 'UR', '#', 'UH R'], ['CH', 'UR', '#', 'UH R'], ['SH', 'UR', '#', 'UH R'], ['', 'UR', '#', 'Y UH R'],
      ['', 'UR', '', 'ER'], ['', 'U', '^ ', 'AH'], ['', 'U', '^^', 'AH'], ['', 'UY', '', 'AY'], [' G', 'U', '#', ''], ['G', 'U', '%', ''],
      ['G', 'U', '#', 'W'], ['#N', 'U', '', 'Y UW'], ['T', 'U', '', 'UW'], ['S', 'U', '', 'UW'], ['R', 'U', '', 'UW'], ['D', 'U', '', 'UW'],
      ['L', 'U', '', 'UW'], ['Z', 'U', '', 'UW'], ['N', 'U', '', 'UW'], ['J', 'U', '', 'UW'], ['TH', 'U', '', 'UW'], ['CH', 'U', '', 'UW'],
      ['SH', 'U', '', 'UW'], ['', 'U', '', 'Y UW'],
    ],
    V: [['', 'VIEW', '', 'V Y UW'], ['', 'V', '', 'V']],
    W: [
      [' ', 'WERE', '', 'W ER'], ['', 'WA', 'S', 'W OH'], ['', 'WA', 'T', 'W OH'], ['', 'WHERE', '', 'W EH R'], ['', 'WHAT', '', 'W OH T'],
      ['', 'WHOL', '', 'HH OW L'], ['', 'WHO', '', 'HH UW'], ['', 'WH', '', 'W'], ['', 'WAR', '', 'W AO R'], ['', 'WOR', '^', 'W ER'],
      ['', 'WR', '', 'R'], ['', 'W', '', 'W'],
    ],
    X: [[' ', 'X', '', 'Z'], ['', 'X', '', 'K S']],
    Y: [
      ['', 'YOUNG', '', 'Y AH NG'], [' ', 'YOU', '', 'Y UW'], [' ', 'YES', '', 'Y EH S'], [' ', 'Y', '', 'Y'], ['#:^', 'Y', ' ', 'IY'],
      ['#:^', 'Y', 'I', 'IY'], [' :', 'Y', ' ', 'AY'], [' :', 'Y', '#', 'AY'], [' :', 'Y', '^+:#', 'IH'], [' :', 'Y', '^#', 'AY'],
      ['', 'Y', '', 'IH'],
    ],
    Z: [['', 'ZZ', '', 'Z'], ['', 'Z', '', 'Z']],
  };

  const VOWEL_LETTERS = 'AEIOUY';
  const VOICED = 'BDVGJLMNRWZ';
  const isLetter = (c) => c >= 'A' && c <= 'Z';
  const isVowelCh = (c) => !!c && VOWEL_LETTERS.indexOf(c) >= 0;
  const isConsCh = (c) => !!c && isLetter(c) && !isVowelCh(c);
  const SUFFIXES = ['ING', 'ELY', 'ER', 'ES', 'ED', 'E'];

  // Does `pat` fit at `pos` of `s`, walking in direction `dir` (+1 right context, -1 left)?
  function ctx(pat, s, pos, dir) {
    function rec(pi, p) {
      if (pi < 0 || pi >= pat.length) return true;
      const c = pat[pi], np = pi + dir;
      if (c === '#' || c === ':') {
        const test = c === '#' ? isVowelCh : isConsCh;
        let max = 0;
        while (test(s[p + dir * max])) max++;
        for (let k = max; k >= (c === '#' ? 1 : 0); k--) if (rec(np, p + dir * k)) return true;
        return false;
      }
      if (c === '%') {
        if (dir < 0) return false;
        for (const suf of SUFFIXES) if (s.substr(p, suf.length) === suf && rec(np, p + suf.length)) return true;
        return false;
      }
      const ch = s[p];
      if (ch === undefined) return false;
      let ok;
      if (c === '^') ok = isConsCh(ch);
      else if (c === '.') ok = VOICED.indexOf(ch) >= 0;
      else if (c === '+') ok = ch === 'E' || ch === 'I' || ch === 'Y';
      else ok = ch === c;
      return ok && rec(np, p + dir);
    }
    return rec(dir > 0 ? 0 : pat.length - 1, pos);
  }

  function toPhonemes(word) {                  // word: A-Z only
    const s = ' ' + word + ' ';
    const out = [];
    let i = 1;
    while (i < s.length - 1) {
      const rules = RULES[s[i]];
      let done = false;
      if (rules) {
        for (const [left, match, right, ph] of rules) {
          if (s.substr(i, match.length) !== match) continue;
          if (i + match.length > s.length - 1) continue;           // never match the padding
          if (!ctx(left, s, i - 1, -1) || !ctx(right, s, i + match.length, 1)) continue;
          if (ph) out.push.apply(out, ph.split(' '));
          i += match.length;
          done = true;
          break;
        }
      }
      if (!done) i++;                                              // unknown symbol: skip
    }
    // doubled consonants (happy, running, giraffe) are one sound
    return out.filter((p, k) => !(k > 0 && p === out[k - 1] && !VOWELS.has(p)));
  }

  const IPA = {
    AA: 'ɑː', AE: 'æ', AH: 'ʌ', AO: 'ɔː', AW: 'aʊ', AX: 'ə', AY: 'aɪ', EH: 'e', ER: 'ɜː', EY: 'eɪ', IH: 'ɪ', IY: 'iː',
    OW: 'əʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'uː', OH: 'ɒ',
    B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', P: 'p',
    R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
  };
  const VOWELS = new Set(['AA', 'AE', 'AH', 'AO', 'AW', 'AX', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW', 'OH']);

  // Where does the stressed syllable's onset start? (maximal onset, like api/ipa.js)
  function onsetStart(ph, vi) {
    let n = 0;
    while (vi - n - 1 >= 0 && !VOWELS.has(ph[vi - n - 1])) n++;
    if (n <= 1) return vi - n;
    const c = ph.slice(vi - n, vi), l2 = c.slice(-2), l3 = c.slice(-3);
    if (l3.length === 3 && l3[0] === 'S' && ['P', 'T', 'K'].indexOf(l3[1]) >= 0 && ['L', 'R', 'W', 'Y'].indexOf(l3[2]) >= 0) return vi - 3;
    if (l2[0] === 'S' && ['P', 'T', 'K', 'M', 'N', 'L', 'W', 'F'].indexOf(l2[1]) >= 0) return vi - 2;
    if (['P', 'B', 'T', 'D', 'K', 'G', 'F', 'TH', 'SH', 'V'].indexOf(l2[0]) >= 0 && ['L', 'R', 'W', 'Y'].indexOf(l2[1]) >= 0) return vi - 2;
    return vi - 1;
  }

  // Which vowel (counting from 0) carries the main stress.
  function stressedNucleus(word, n) {
    if (n <= 1) return -1;
    const w = word.toLowerCase();
    if (/(tion|sion|cian|tian|ious|eous|ial|ian|ic|ics|ical|ically)$/.test(w)) {
      if (/(ical|ically)$/.test(w)) return Math.max(0, n - 3);
      return Math.max(0, n - 2);
    }
    if (/(ity|ify|ology|ography|ometer|ular)$/.test(w)) return Math.max(0, n - 3);
    if (/(ee|eer|ette|oon|ese|ique)$/.test(w) && n >= 2) return n - 1;
    if (n === 2 && w.length >= 4 && /^(be|de|ex)/.test(w)) return 1;
    if (n === 2 && w.length >= 4 && /^a([^aeiou])(?!\1)/.test(w) && !/(ing|er|ed|ly|y|ie)$/.test(w)) return 1;
    return 0;
  }

  function renderWord(word) {
    const ph = toPhonemes(word);
    if (!ph.length) return '';
    const vIdx = [];
    ph.forEach((p, i) => { if (VOWELS.has(p)) vIdx.push(i); });
    const stressVowel = stressedNucleus(word, vIdx.length);
    const stressTok = stressVowel >= 0 ? vIdx[stressVowel] : -1;
    const markAt = stressTok >= 0 ? onsetStart(ph, stressTok) : -1;
    let out = '';
    for (let i = 0; i < ph.length; i++) {
      const p = ph[i];
      if (i === markAt) out += 'ˈ';
      const next = ph[i + 1];
      if (p === 'R' && !(next && VOWELS.has(next))) {
        continue;                                                   // British: r only before a vowel
      }
      let s = IPA[p];
      const rNext = next === 'R' && !(ph[i + 2] && VOWELS.has(ph[i + 2]));
      if (rNext) {                                                  // vowel + dropped r
        if (p === 'EH') s = 'eə';
        else if (p === 'IH' || p === 'IY') s = 'ɪə';
        else if (p === 'UH') s = 'ʊə';
        else if (p === 'AW' || p === 'AY') s = s + 'ə';
        else if (p === 'ER') s = i === stressTok ? 'ɜː' : 'ə';
      } else if (p === 'ER' && i !== stressTok && vIdx.length > 1) s = 'ə';
      if (p === 'IY' && i === ph.length - 1 && vIdx.length > 1) s = 'i';   // happy
      if (p === 'OW' && i === ph.length - 1 && vIdx.length > 1 && i !== stressTok) s = 'əʊ';
      out += s;
    }
    return out;
  }

  const DIGIT_IPA = ['ˈzɪərəʊ', 'wʌn', 'tuː', 'θriː', 'fɔː', 'faɪv', 'sɪks', 'ˈsevən', 'eɪt', 'naɪn'];
  const SPECIAL = { ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', đ: 'd', ð: 'd', þ: 'th', ł: 'l', ı: 'i' };

  function normalise(s) {
    let t = String(s == null ? '' : s).toLowerCase();
    try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* old engine */ }
    return t.replace(/[ßæœøđðþłı]/g, (c) => SPECIAL[c]);
  }

  function approx(text) {
    try {
      const parts = normalise(text).replace(/['’‘`]/g, '').split(/[\s\-–—_/]+/).filter(Boolean);
      const out = [];
      for (const part of parts) {
        const letters = part.replace(/[^a-z]/g, '').toUpperCase();
        if (letters) { const r = renderWord(letters); if (r) out.push(r); }
        else if (/\d/.test(part)) out.push(part.replace(/\D/g, '').split('').map((d) => DIGIT_IPA[+d]).join(' '));
        // symbols only: ignored
      }
      return out.length ? '/' + out.join(' ') + '/' : '';
    } catch (e) {
      return '';
    }
  }

  const api = { approx, _phonemes: (w) => toPhonemes(normalise(w).replace(/[^a-z]/g, '').toUpperCase()) };
  if (typeof window !== 'undefined') window.IGG2P = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
