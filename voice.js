/* ==========================================================================
   IGenglishschool — The best English voice the device has
   --------------------------------------------------------------------------
   Nothing in the app chose a voice, so every 🔊 used the system default:
   on Windows that is the old robotic "Microsoft David / Zira". The same
   browsers also ship far better voices: Edge has Microsoft's neural
   "Natural" voices (Ava, Aria, Jenny, Guy, Sonia…), Chrome has "Google US
   English", Apple devices have the Premium / Enhanced voices.

   26 places in the app create their own SpeechSynthesisUtterance, so the
   choice is made in ONE place: speechSynthesis.speak() is wrapped, and any
   English utterance with no voice of its own gets the best one available.
   Utterances that already set a voice, or speak another language, are left
   alone.
   ========================================================================== */

(function igBetterVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;

  // Higher is better. Neural/online voices first, then the good local ones.
  function score(v) {
    const name = v.name || '';
    const lang = (v.lang || '').replace('_', '-');
    if (!/^en(-|$)/i.test(lang)) return -1;
    let s = 0;
    if (/natural|neural/i.test(name)) s += 100;                       // Edge: Microsoft … Online (Natural)
    else if (/google/i.test(name)) s += 70;                           // Chrome: Google US English
    else if (/premium|enhanced/i.test(name)) s += 80;                 // Apple: Ava (Premium), Samantha (Enhanced)
    else if (/samantha|ava|allison|susan|serena|daniel/i.test(name)) s += 40; // decent Apple voices
    if (/\b(ava|aria|jenny|emma|andrew|brian|guy|sonia|libby|ryan)\b/i.test(name)) s += 10;
    if (/david|zira|mark|hazel|george/i.test(name) && !/natural/i.test(name)) s -= 30; // the robotic SAPI voices
    if (/^en-US$/i.test(lang)) s += 6;
    else if (/^en-GB$/i.test(lang)) s += 5;
    else if (/^en-(AU|CA|IE)$/i.test(lang)) s += 3;
    return s;
  }

  let best = null;
  function pick() {
    const voices = synth.getVoices() || [];
    let top = null, topScore = -1;
    voices.forEach(v => { const s = score(v); if (s > topScore) { top = v; topScore = s; } });
    best = top;
  }
  pick();
  if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', pick);
  else synth.onvoiceschanged = pick;

  const speak = synth.speak.bind(synth);
  synth.speak = function igSpeak(utter) {
    try {
      if (!best) pick();
      const lang = String((utter && utter.lang) || 'en');
      if (utter && !utter.voice && best && /^en/i.test(lang)) {
        utter.voice = best;
        utter.lang = best.lang;
      }
    } catch (e) { /* speak with the default voice */ }
    return speak(utter);
  };

  // For a "which voice?" line in a settings screen, or for debugging.
  window.igVoiceName = () => (best ? `${best.name} (${best.lang})` : 'default');
})();
