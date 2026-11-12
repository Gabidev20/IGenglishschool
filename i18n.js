/* ==========================================================================
   🌐 TEACHER'S LANGUAGE (PT / EN)
   --------------------------------------------------------------------------
   A button in the side menu (#langToggleBtn) lets each teacher pick the
   language of her own screen. The choice is kept on this computer
   (localStorage 'ig_ui_lang'); Portuguese is the default, so nothing changes
   for anyone who never presses it.

   How: the code keeps writing its Portuguese. When English is on, every text
   on the page (and the title / placeholder / aria-label attributes) is looked
   up in a dictionary (i18nDict.js) and swapped on screen, also for anything
   drawn later (a MutationObserver). The original text is remembered, so
   going back to PT restores it. Stored data is never touched.

   Not translated: the student's link (html.ig-student-mode, it follows the
   student's age as before), public game links, text the user types
   (inputs, textareas, contenteditable) and anything inside
   [translate="no"] / .ig-no-i18n.

   Adding words: IGLang.add({ 'Texto em português': 'English text' }) and
   IGLang.addPatterns([[/^(\d+) alunos?$/, '$1 students']]).
   ========================================================================== */
const IGLang = (() => {
  const KEY = 'ig_ui_lang';
  const DICT = new Map();
  const PATTERNS = [];
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'CODE', 'PRE', 'svg', 'SVG', 'CANVAS', 'NOSCRIPT']);

  const INPUTISH = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
  const origText = new WeakMap();   // text node -> its Portuguese
  const outText = new WeakMap();    // text node -> what we wrote
  const origAttr = new WeakMap();   // element -> { attr: Portuguese }
  const outAttr = new WeakMap();    // element -> { attr: what we wrote }

  let lang = 'pt';
  try { lang = localStorage.getItem(KEY) === 'en' ? 'en' : 'pt'; } catch (e) { /* private window */ }

  const html = document.documentElement;
  function active() {
    return lang === 'en'
      && !html.classList.contains('ig-student-mode')
      && !html.classList.contains('ig-public-game');
  }
  function syncClass() { html.classList.toggle('ig-lang-en', lang === 'en'); }
  syncClass();

  // ---- dictionary ---------------------------------------------------------
  const norm = s => s.replace(/\s+/g, ' ').trim();
  function add(obj) {
    Object.keys(obj).forEach(k => { const n = norm(k); if (n && obj[k]) DICT.set(n, obj[k]); });
  }
  // [regex or its source string, replacement ('$1') or function]
  function addPatterns(list) {
    list.forEach(([re, out]) => {
      try { PATTERNS.push([typeof re === 'string' ? new RegExp(re, 'u') : re, out]); } catch (e) { /* bad entry */ }
    });
  }

  // Dates the code writes with toLocaleDateString('pt-BR'):
  // "quinta-feira, 12 de novembro de 2026", "12 de nov.", "novembro de 2026".
  const WD = { 'domingo': 'Sunday', 'segunda-feira': 'Monday', 'terça-feira': 'Tuesday', 'quarta-feira': 'Wednesday',
    'quinta-feira': 'Thursday', 'sexta-feira': 'Friday', 'sábado': 'Saturday',
    'segunda': 'Monday', 'terça': 'Tuesday', 'quarta': 'Wednesday', 'quinta': 'Thursday', 'sexta': 'Friday',
    'dom': 'Sun', 'seg': 'Mon', 'ter': 'Tue', 'qua': 'Wed', 'qui': 'Thu', 'sex': 'Fri', 'sáb': 'Sat' };
  const MO = { 'janeiro': 'January', 'fevereiro': 'February', 'março': 'March', 'abril': 'April', 'maio': 'May',
    'junho': 'June', 'julho': 'July', 'agosto': 'August', 'setembro': 'September', 'outubro': 'October',
    'novembro': 'November', 'dezembro': 'December',
    'jan': 'Jan', 'fev': 'Feb', 'mar': 'Mar', 'abr': 'Apr', 'mai': 'May', 'jun': 'Jun', 'jul': 'Jul',
    'ago': 'Aug', 'set': 'Sep', 'out': 'Oct', 'nov': 'Nov', 'dez': 'Dec' };
  const wd = w => WD[w.toLowerCase().replace(/\.$/, '')] || null;
  const mo = w => MO[w.toLowerCase().replace(/\.$/, '')] || null;
  PATTERNS.push([/^(?:([A-Za-zçá-]+)\.?,?\s+)?(\d{1,2})\s+de\s+([A-Za-zç]+)\.?(?:\s+de\s+(\d{4}))?$/u, (all, w, d, m, y) => {
    const M = mo(m); if (!M) return null;
    const W = w ? wd(w) : ''; if (w && !W) return null;
    return (W ? W + ', ' : '') + M + ' ' + d + (y ? ', ' + y : '');
  }]);
  PATTERNS.push([/^(\d+) de (\d+)$/u, '$1 of $2']);
  PATTERNS.push([/^([A-Za-zç]+)\s+de\s+(\d{4})$/u, (all, m, y) => { const M = mo(m); return M ? M + ' ' + y : null; }]);
  PATTERNS.push([/^([A-Za-zçá-]+)$/u, (all, w) => wd(w) || mo(w) && w.length > 3 && mo(w) || null]);

  // "🧠 Trazer o takeaway do livro (4)": try the whole text, then the words
  // between the emoji / numbers / punctuation around them, then patterns.
  const EDGE = /^([^\p{L}]*)([\s\S]*?)([^\p{L}]*)$/u;
  function lookup(core) {
    const hit = lookupExact(core);
    if (hit != null) return hit;
    // "Turma A2" when only "turma {1}" is known, and the other way round
    const first = core.charAt(0);
    const flip = first === first.toUpperCase() ? first.toLowerCase() : first.toUpperCase();
    if (flip === first) return null;
    const other = lookupExact(flip + core.slice(1));
    if (other == null) return null;
    const f = other.charAt(0);
    return (first === first.toUpperCase() ? f.toUpperCase() : f.toLowerCase()) + other.slice(1);
  }
  function lookupExact(core) {
    if (DICT.has(core)) return DICT.get(core);
    for (const [re, out] of PATTERNS) {
      const m = core.match(re);
      if (!m) continue;
      if (typeof out === 'function') { const r = out(...m); if (r != null) return r; continue; }
      // the parts that change are translated too ("em novembro" -> "in November")
      return out.replace(/\$(\d)/g, (_, k) => { const v = m[+k] || ''; const tv = /\p{L}/u.test(v) ? lookup(v) : null; return tv == null ? v : tv; });
    }
    return null;
  }
  function translateCore(t) {
    const hit = lookup(t);
    if (hit != null) return hit;
    const m = t.match(EDGE);
    if (m && m[2] && (m[1] || m[3])) {
      // "12 de nov. ·": keep what comes before ("12 "), cut only the end
      if (m[3]) {
        // the abbreviation's dot belongs to the date ("12 de nov." -> "Nov 12")
        if (m[3].charAt(0) === '.') {
          const dotted = lookup(m[1] + m[2] + '.');
          if (dotted != null) return dotted + m[3].slice(1);
        }
        const head = lookup(m[1] + m[2]);
        if (head != null) return head + m[3];
      }
      const core = lookup(m[2]);
      if (core != null) return m[1] + core + m[3];
    }
    return null;
  }
  function translate(s) {
    if (!s || !/\p{L}/u.test(s)) return null;
    const t = norm(s);
    let hit = translateCore(t);
    // "Speak Up! A1+ · 09 de nov.": each part on its own
    if (hit == null && t.includes(' · ')) {
      let any = false;
      const parts = t.split(' · ').map(p => { const r = p.trim() ? translateCore(p) : null; if (r != null) any = true; return r == null ? p : r; });
      if (any) hit = parts.join(' · ');
    }
    if (hit == null || hit === t) return null;
    // keep the spaces around the text (they separate it from its neighbours)
    const lead = s.match(/^\s*/)[0];
    const trail = s.match(/\s*$/)[0];
    return lead + hit + trail;
  }
  // For code that builds text itself: IGLang.t('Salvar') -> 'Save' in EN.
  function t(pt) {
    if (!active()) return pt;
    const out = translate(String(pt));
    return out == null ? pt : out;
  }

  // ---- the page -----------------------------------------------------------
  function skipped(el) {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (SKIP_TAGS.has(e.tagName) || e.isContentEditable) return true;
      if (e.getAttribute && (e.getAttribute('translate') === 'no' || e.classList.contains('ig-no-i18n'))) return true;
    }
    return false;
  }

  function doText(node) {
    const cur = node.data;
    if (outText.get(node) !== cur) origText.set(node, cur);   // the code wrote new Portuguese
    const pt = origText.get(node);
    const want = active() && !skipped(node.parentElement) ? (translate(pt) ?? pt) : pt;
    if (want !== cur) { node.data = want; }
    if (want !== pt) outText.set(node, want); else outText.delete(node);
  }

  function doAttrs(el) {
    if (!el.getAttribute) return;
    let orig = origAttr.get(el);
    let out = outAttr.get(el);
    const skip = !active() || skipped(INPUTISH.has(el.tagName) ? el.parentElement : el);
    ATTRS.forEach(a => {
      if (!el.hasAttribute(a)) return;
      const cur = el.getAttribute(a);
      if (!orig) { orig = {}; origAttr.set(el, orig); }
      if (!out) { out = {}; outAttr.set(el, out); }
      if (out[a] !== cur) orig[a] = cur;
      const pt = orig[a];
      const want = skip ? pt : (translate(pt) ?? pt);
      if (want !== cur) el.setAttribute(a, want);
      out[a] = want;
    });
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 0) { doAttrs(root.el); return; }   // an attribute changed
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (SKIP_TAGS.has(root.tagName)) { doAttrs(root); return; }
      doAttrs(root);
    }
    const it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n = it.nextNode();
    while (n) {
      if (n.nodeType === 3) doText(n);
      else doAttrs(n);
      n = it.nextNode();
    }
  }

  let queue = new Set();
  let scheduled = false;
  function flush() {
    scheduled = false;
    handle(observer.takeRecords());
    scheduled = false;
    const nodes = queue; queue = new Set();
    observer.disconnect();
    try {
      nodes.forEach(n => {
        try { if (n.isConnected) walk(n); }
        catch (e) { (window.__i18nErrors = window.__i18nErrors || []).push(String(e && e.stack || e).slice(0, 300)); }
      });
    } finally { observe(); }
  }
  function schedule(n) {
    queue.add(n);
    if (!scheduled) { scheduled = true; Promise.resolve().then(flush); }
  }
  // disconnect() throws away changes not yet delivered: take them first
  function handle(records) {
    records.forEach(r => {
      if (r.type === 'childList') r.addedNodes.forEach(schedule);
      else if (r.type === 'characterData') schedule(r.target);
      else if (r.type === 'attributes') schedule(r.target.nodeType === 1 ? { nodeType: 0, isConnected: r.target.isConnected, el: r.target } : r.target);
    });
  }
  const observer = new MutationObserver(handle);
  function observe() {
    if (!document.body) return;
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function refresh() {
    if (!document.body) return;
    observer.disconnect();
    try { walk(document.body); }
    catch (e) { (window.__i18nErrors = window.__i18nErrors || []).push(String(e && e.stack || e).slice(0, 300)); }
    // the tab's title too
    if (!origTitle) origTitle = document.title;
    document.title = active() ? (translate(origTitle) ?? origTitle) : origTitle;
    observe();
    paintButton();
  }
  let origTitle = '';
  let wasActive = active();

  // ---- the button ---------------------------------------------------------
  function paintButton() {
    const b = document.getElementById('langToggleBtn');
    if (!b) return;
    const en = lang === 'en';
    b.textContent = en ? 'EN' : 'PT';
    b.setAttribute('aria-pressed', en ? 'true' : 'false');
    // set after the walk so this label is never translated back
    const label = en ? 'Language: English' : 'Idioma: Português';
    const tip = en ? 'Language: English (click for Português)' : 'Idioma: Português (clique para English)';
    b.setAttribute('aria-label', label);
    b.setAttribute('title', tip);
    const o = origAttr.get(b); if (o) { o['aria-label'] = label; o.title = tip; }
    const w = outAttr.get(b); if (w) { w['aria-label'] = label; w.title = tip; }
  }

  function set(next) {
    lang = next === 'en' ? 'en' : 'pt';
    wasActive = active();
    try { localStorage.setItem(KEY, lang); } catch (e) { /* ignore */ }
    syncClass();
    refresh();
    document.dispatchEvent(new CustomEvent('ig-lang-change', { detail: { lang } }));
  }

  function start() {
    const b = document.getElementById('langToggleBtn');
    if (b) b.addEventListener('click', () => set(lang === 'en' ? 'pt' : 'en'));
    refresh();
    // the student-mode / public-game classes are set by later scripts
    new MutationObserver(() => { if (active() !== wasActive) { wasActive = active(); refresh(); } }).observe(html, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  return { add, addPatterns, t, set, refresh, get lang() { return lang; }, active, _translate: translate };
})();
