/* ==========================================================================
   IGenglishschool — Activity profile per student
   Three kinds of learner use the student page very differently:

     🖼️ prereader — can't read yet (Arthur, Tom, Ravi): picture-and-voice
        games only, colours to say out loud, audio messages instead of
        writing.
     📖 reader    — reads, knows the basics (Théo, Jasmine, Letícia, Alicia):
        the easy content in kidsContent.js.
     ✍️ writer    — older (Heloize, Beatriz, Ana Clara, Aninha, Sofia):
        typed practice with easy grammar (verb to be, past simple, present
        continuous, hobbies).
     💼 adult     — 15 and up: everyday-English topics (work, travel,
        restaurant…), with speaking, listening and writing in front.

   By default the profile follows the age (up to 6 / 7–9 / 10–14 / 15+); the teacher
   can set it by hand in the student form. Kept under its own key — the
   students table has no column for it — so it syncs with the rest of her
   data and reaches the student's link (supabase-share.sql).
   ========================================================================== */

const STUDENT_PROFILES_KEY = 'student_profiles';

const PROFILE_META = {
  prereader: { icon: '🖼️', label: 'Ainda não lê', desc: 'Jogos só com imagens e voz, treino das cores, mensagem de áudio' },
  reader: { icon: '📖', label: 'Já lê (fácil)', desc: 'Animais, cores, formas, números, casa e verb to be' },
  writer: { icon: '✍️', label: 'Escrita', desc: 'Treino de escrita: verb to be, past simple, present continuous, hobbies' },
  adult: { icon: '💼', label: 'Adolescente 15+ / Adulto', desc: 'Temas do dia a dia (trabalho, viagem, restaurante…), speaking, listening e writing' },
};

function loadStudentProfiles() {
  const map = IGStore.getJSON(STUDENT_PROFILES_KEY, {});
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}

function saveStudentProfile(studentId, profile) {
  const map = loadStudentProfiles();
  if (profile && PROFILE_META[profile]) map[studentId] = profile;
  else delete map[studentId];
  IGStore.setJSON(STUDENT_PROFILES_KEY, map);
}

function studentProfileAuto(student) {
  const age = Number(student && student.age) || 0;
  if (age && age <= 6) return 'prereader';
  if (age && age <= 9) return 'reader';
  if (age >= 15) return 'adult';
  return 'writer';
}

function studentProfile(student) {
  if (!student) return 'writer';
  const set = loadStudentProfiles()[student.id];
  return PROFILE_META[set] ? set : studentProfileAuto(student);
}
