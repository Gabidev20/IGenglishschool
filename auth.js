/* ==========================================================================
   IGenglishschool — Sign-in gate
   --------------------------------------------------------------------------
   Runs LAST, after the app has painted. Its job is to decide who is looking
   at the page:

   • No Supabase configured  -> nothing to do. The site stays exactly as it
     was: one teacher, this browser, no login.

   • Supabase configured, no session -> the app is covered by a blocking
     sign-in screen until a teacher signs in or creates an account.

   • Supabase configured, session found -> the workspace was already restored
     synchronously from localStorage at boot (so the right teacher's cached
     data rendered immediately); here we just verify the session is still
     valid and pull anything that changed elsewhere.
   ========================================================================== */

const IGAuth = (() => {
  let gateEl = null;

  // -------------------------------------------------------------------------
  // GATE
  // -------------------------------------------------------------------------
  function showGate(initialMode) {
    if (gateEl) return;
    document.body.classList.add('ig-gated');
    gateEl = document.createElement('div');
    gateEl.className = 'auth-gate';
    gateEl.innerHTML = `
      <div class="auth-card">
        <div class="auth-brand">
          <img src="logo.png" alt="IGenglishschool" class="auth-logo"
               data-fallback="IGenglishschool" onerror="igImageFallback(this)" />
          <p class="auth-tagline">Teacher sign in</p>
        </div>

        <div class="auth-tabs" id="authTabs">
          <button class="auth-tab" data-mode="signin" type="button">Sign in</button>
          <button class="auth-tab" data-mode="signup" type="button">Create account</button>
        </div>

        <form class="auth-form" id="authForm" autocomplete="on">
          <label class="auth-field auth-name-field" id="authNameField" hidden>
            <span>Your name</span>
            <input type="text" id="authName" autocomplete="name" placeholder="Teacher Isa" />
          </label>
          <label class="auth-field">
            <span>Email</span>
            <input type="email" id="authEmail" autocomplete="email" required placeholder="you@school.com" />
          </label>
          <label class="auth-field">
            <span>Password</span>
            <input type="password" id="authPassword" autocomplete="current-password" required minlength="6" placeholder="At least 6 characters" />
          </label>

          <p class="auth-error" id="authError" hidden></p>
          <p class="auth-note" id="authNote" hidden></p>

          <button class="btn btn-primary auth-submit" id="authSubmit" type="submit">Sign in</button>
          <button class="auth-link" id="authForgot" type="button">Forgot your password?</button>
        </form>

        <p class="auth-footer">Each teacher gets her own students, class log, reports and games.</p>
      </div>
    `;
    document.body.appendChild(gateEl);
    wireGate(initialMode || 'signin');
  }

  function wireGate(mode) {
    const tabs = gateEl.querySelector('#authTabs');
    const form = gateEl.querySelector('#authForm');
    const nameField = gateEl.querySelector('#authNameField');
    const submit = gateEl.querySelector('#authSubmit');
    const errorEl = gateEl.querySelector('#authError');
    const noteEl = gateEl.querySelector('#authNote');
    const passwordEl = gateEl.querySelector('#authPassword');

    const setMode = (next) => {
      mode = next;
      tabs.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
      nameField.hidden = mode !== 'signup';
      submit.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
      passwordEl.setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
      errorEl.hidden = true;
      noteEl.hidden = true;
    };

    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-mode]');
      if (btn) setMode(btn.dataset.mode);
    });

    const fail = (message) => {
      errorEl.textContent = message;
      errorEl.hidden = false;
      noteEl.hidden = true;
      submit.disabled = false;
      submit.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = gateEl.querySelector('#authEmail').value.trim();
      const password = passwordEl.value;
      const name = gateEl.querySelector('#authName').value.trim();
      if (!email || !password) return fail('Fill in your email and password.');

      submit.disabled = true;
      submit.textContent = mode === 'signup' ? 'Creating…' : 'Signing in…';
      errorEl.hidden = true;

      try {
        if (mode === 'signup') {
          const data = await IGCloud.signUp(email, password, name || email.split('@')[0]);
          if (!data.session) {
            // Email confirmation is on in this Supabase project.
            noteEl.textContent = `Account created. Check ${email} for the confirmation link, then sign in.`;
            noteEl.hidden = false;
            submit.disabled = false;
            setMode('signin');
            return;
          }
          await enter(data.session);
        } else {
          const data = await IGCloud.signIn(email, password);
          await enter(data.session);
        }
      } catch (err) {
        fail(friendlyError(err));
      }
    });

    gateEl.querySelector('#authForgot').addEventListener('click', async () => {
      const email = gateEl.querySelector('#authEmail').value.trim();
      if (!email) return fail('Type your email first, then tap "Forgot your password?".');
      try {
        await IGCloud.resetPassword(email);
        noteEl.textContent = `Password reset link sent to ${email}.`;
        noteEl.hidden = false;
        errorEl.hidden = true;
      } catch (err) {
        fail(friendlyError(err));
      }
    });

    setMode(mode);
  }

  function friendlyError(err) {
    const msg = String((err && err.message) || err || 'Something went wrong.');
    if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
    if (/already registered/i.test(msg)) return 'That email already has an account — sign in instead.';
    if (/password should be at least/i.test(msg)) return 'The password needs at least 6 characters.';
    if (/email not confirmed/i.test(msg)) return 'Confirm your email first — check your inbox for the link.';
    if (/failed to fetch|networkerror|load the supabase/i.test(msg)) return 'No connection to the server. Check the internet and try again.';
    // Setup slips come through already phrased as instructions.
    if (/Exposed schemas|supabase-schema\.sql/i.test(msg)) return msg;
    return msg;
  }

  // A signed-in teacher gets a clean slate: switching accounts on a shared
  // computer must never leave the previous teacher's students on screen.
  async function enter(session) {
    const previous = igWorkspaceId();
    igSetWorkspace(session.user.id);
    if (previous !== session.user.id) {
      // Reload so every module re-reads storage under the new workspace.
      window.location.reload();
      return;
    }
    hideGate();
    await IGCloud.start(session);
    renderTeacherChip();
  }

  function hideGate() {
    document.body.classList.remove('ig-gated');
    if (gateEl) { gateEl.remove(); gateEl = null; }
  }

  // -------------------------------------------------------------------------
  // HEADER CHIP — who is signed in, sync state, sign out
  // -------------------------------------------------------------------------
  function renderTeacherChip() {
    const slot = document.getElementById('teacherSlot');
    if (!slot || !IGCloud.teacher) return;
    const t = IGCloud.teacher;
    slot.hidden = false;
    slot.innerHTML = `
      <button class="teacher-chip" id="teacherChipBtn" type="button" title="${igEscapeHtml(t.email)}">
        <span class="teacher-avatar">👩‍🏫</span>
        <span class="teacher-info">
          <span class="teacher-name">${igEscapeHtml(t.name)}</span>
          <span class="teacher-sync" id="teacherSync">Synced</span>
        </span>
      </button>
      <div class="teacher-menu" id="teacherMenu" hidden>
        <p class="teacher-menu-email">${igEscapeHtml(t.email)}</p>
        <button class="teacher-menu-btn" id="teacherSyncNow" type="button">🔄 Sync now</button>
        <button class="teacher-menu-btn danger" id="teacherSignOut" type="button">🚪 Sign out</button>
      </div>
    `;

    const menu = slot.querySelector('#teacherMenu');
    slot.querySelector('#teacherChipBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener('click', (e) => {
      if (!slot.contains(e.target)) menu.hidden = true;
    });
    slot.querySelector('#teacherSyncNow').addEventListener('click', () => {
      menu.hidden = true;
      IGCloud.flush();
    });
    slot.querySelector('#teacherSignOut').addEventListener('click', () => {
      if (confirm('Sign out of IGenglishschool?')) IGCloud.signOut();
    });

    IGCloud.onStatus(updateSyncLabel);
    updateSyncLabel();
  }

  function updateSyncLabel() {
    const el = document.getElementById('teacherSync');
    if (!el) return;
    if (IGCloud.syncing) { el.textContent = 'Saving…'; el.className = 'teacher-sync is-busy'; }
    else if (IGCloud.lastError) { el.textContent = 'Offline — saved here'; el.className = 'teacher-sync is-error'; }
    else { el.textContent = 'Synced'; el.className = 'teacher-sync'; }
  }

  // -------------------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------------------
  async function init() {
    if (!IGCloud.enabled()) return;              // local mode — nothing to gate

    let session = null;
    try {
      session = await IGCloud.currentSession();
    } catch (e) {
      console.error(e);
      showGate('signin');
      const err = document.getElementById('authError');
      if (err) { err.textContent = friendlyError(e); err.hidden = false; }
      return;
    }

    if (!session) {
      // The cached workspace belongs to a session that is gone.
      igSetWorkspace('local');
      showGate('signin');
      return;
    }

    if (igWorkspaceId() !== session.user.id) {
      igSetWorkspace(session.user.id);
      window.location.reload();
      return;
    }

    try {
      await IGCloud.start(session);
      renderTeacherChip();
    } catch (e) {
      // Signed in but the pull failed: keep working from the local copy.
      console.error('Initial sync failed', e);
      renderTeacherChip();
    }
  }

  return { init, showGate, renderTeacherChip };
})();

IGAuth.init();
