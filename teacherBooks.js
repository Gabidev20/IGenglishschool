/* ==========================================================================
   IGenglishschool — Livros IG (teacher only)
   --------------------------------------------------------------------------
   The printable IG books and teacher's guides live in a PRIVATE Supabase
   Storage bucket (supabase-livros.sql). Only the e-mails listed in
   igenglish_book_readers can list or open them; this screen asks for
   short-lived signed links, so nothing here is reachable without signing in.
   ========================================================================== */

const TeacherBooks = (() => {
  const BUCKET = 'igenglish-livros';
  const LINK_SECONDS = 3600;

  // "IG-Little-Steps_Bimestre1.pdf" -> "IG Little Steps · Bimestre 1"
  function label(name) {
    return baseName(name)
      .replace(/\.pdf$/i, '')
      .replace(/_/g, ' · ')
      .replace(/([A-Za-z])-([A-Za-z])/g, '$1 $2')
      .replace(/(Bimestre|Unidades?)(\d)/gi, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Uploading a book again without replacing it leaves "Book (1).pdf" next
  // to "Book.pdf": both are the same book, and only the newest counts.
  const baseName = name => name.replace(/\s*\(\d+\)(?=\.pdf$)/i, '');
  const stamp = o => Date.parse(o.updated_at || o.created_at || '') || 0;
  function newestOnly(objects) {
    const best = new Map();
    objects.forEach(o => {
      const key = baseName(o.name).toLowerCase();
      const cur = best.get(key);
      if (!cur || stamp(o) > stamp(cur) || (stamp(o) === stamp(cur) && o.name.length > cur.name.length)) best.set(key, o);
    });
    return [...best.values()].sort((a, b) => baseName(a.name).localeCompare(baseName(b.name)));
  }

  function shell(inner) {
    return `
      <div class="tb-wrap">
        <h2 class="tb-title">📚 Livros IG</h2>
        <p class="tb-sub">Seus livros e guias do professor. Só você vê esta área.</p>
        ${inner}
      </div>`;
  }

  function list(title, files) {
    if (!files.length) return '';
    return `
      <h3 class="tb-group">${title}</h3>
      <ul class="tb-list">
        ${files.map(f => `
          <li><a class="tb-item" href="${igEscapeHtml(f.url)}" target="_blank" rel="noopener">
            <span class="tb-icon${f.guide ? ' is-guide' : ''}">PDF</span>
            <span class="tb-name">${igEscapeHtml(label(f.name))}</span>
            <span class="tb-open">Abrir PDF ↗</span>
          </a></li>`).join('')}
      </ul>`;
  }

  async function open() {
    openModal(shell('<p class="tb-note">Carregando…</p>'));
    try {
      const sb = await IGCloud.getClient();
      const { data, error } = await sb.storage.from(BUCKET).list('', {
        limit: 200, sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      const names = newestOnly((data || []).filter(o => /\.pdf$/i.test(o.name))).map(o => o.name);
      if (!names.length) {
        modalBody.innerHTML = shell(`
          <p class="tb-note">Nenhum livro por aqui ainda.</p>
          <p class="tb-note">Se você já subiu os PDFs no Supabase, confira se o seu e-mail de login
          está na lista do arquivo <b>supabase-livros.sql</b> e se ele foi rodado no SQL Editor.</p>`);
        return;
      }
      const signed = await sb.storage.from(BUCKET).createSignedUrls(names, LINK_SECONDS);
      if (signed.error) throw signed.error;
      const files = (signed.data || [])
        .filter(s => s.signedUrl)
        .map(s => ({ name: s.path, url: s.signedUrl, guide: /^guia/i.test(s.path) }));
      modalBody.innerHTML = shell(
        list('Livros do aluno', files.filter(f => !f.guide)) +
        list('Guias do professor', files.filter(f => f.guide)) +
        '<p class="tb-note">Os links valem por 1 hora. Para abrir de novo depois, volte aqui.</p>'
      );
    } catch (e) {
      console.error('Livros IG', e);
      modalBody.innerHTML = shell(`
        <p class="tb-note">Não consegui abrir os livros agora.</p>
        <p class="tb-note">Se for a primeira vez, rode o arquivo <b>supabase-livros.sql</b> no SQL Editor do Supabase.
        Se já rodou, verifique a internet e tente de novo.</p>`);
    }
  }

  return { open };
})();

window.TeacherBooks = TeacherBooks;
