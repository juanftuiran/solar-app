/**
 * @module loginView
 * @description Modern enterprise login view for JF Solar Cloud.
 */

/**
 * Render the login screen HTML.
 *
 * @returns {string} Login view HTML string
 */
export function render() {
  return `
    <div class="modal-overlay" id="login-view" style="z-index:50;background:radial-gradient(circle at 50% 30%, rgba(14,165,233,0.12), var(--bg) 70%);">
      <div class="modal-box" style="max-width:26rem;text-align:center;padding:2.25rem 2rem;box-shadow:var(--shadow-lg), 0 0 40px -10px rgba(14,165,233,0.2);">

        <!-- Cloud & Solar Brand Icon -->
        <div style="margin-bottom:1.5rem;position:relative;display:inline-block;">
          <div style="
            width:4.5rem;height:4.5rem;border-radius:var(--radius);
            background:linear-gradient(135deg, rgba(14,165,233,0.2), rgba(16,185,129,0.15));
            border:1px solid rgba(14,165,233,0.3);
            display:flex;align-items:center;justify-content:center;
            margin:0 auto;box-shadow:0 8px 24px -4px rgba(14,165,233,0.3);
          ">
            <i class="fa-solid fa-solar-panel" style="font-size:2.25rem;color:var(--solar);filter:drop-shadow(0 2px 8px rgba(16,185,129,0.4));"></i>
          </div>
        </div>

        <!-- Title & Subtitle -->
        <h1 style="font-size:1.5rem;font-weight:900;color:#fff;margin-bottom:.35rem;letter-spacing:-.02em;">
          JF Solar Cloud
        </h1>
        <p style="font-size:.85rem;color:var(--muted-light);margin-bottom:1.75rem;">
          <span class="lang-es">Plataforma de Analítica & Monitoreo Solar</span>
          <span class="lang-en">Solar Analytics & Monitoring Platform</span>
        </p>

        <!-- Login form -->
        <form id="login-form" autocomplete="on" style="display:flex;flex-direction:column;gap:1.15rem;text-align:left;">
          <!-- Email -->
          <div class="field">
            <label for="login-email">
              <i class="fa-solid fa-envelope" style="color:var(--accent);"></i>
              <span class="lang-es">Correo electrónico</span>
              <span class="lang-en">Email address</span>
            </label>
            <input
              type="email"
              id="login-email"
              name="email"
              placeholder="nombre@empresa.com"
              required
              autocomplete="email"
            />
          </div>

          <!-- Password with toggle -->
          <div class="field">
            <label for="login-password">
              <i class="fa-solid fa-lock" style="color:var(--solar);"></i>
              <span class="lang-es">Contraseña</span>
              <span class="lang-en">Password</span>
            </label>
            <div class="input-with-action">
              <input
                type="password"
                id="login-password"
                name="password"
                placeholder="••••••••"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                id="btn-toggle-password"
                class="input-action-btn"
                aria-label="Toggle password visibility"
              >
                <i class="fa-solid fa-eye" id="toggle-password-icon"></i>
              </button>
            </div>
          </div>

          <!-- Submit button -->
          <button
            type="submit"
            id="btn-login"
            class="btn btn-accent btn-lg"
            style="width:100%;margin-top:.5rem;"
          >
            <i class="fa-solid fa-bolt" id="btn-login-icon"></i>
            <span class="lang-es" id="btn-login-text-es">Iniciar Sesión</span>
            <span class="lang-en" id="btn-login-text-en">Sign In</span>
          </button>
        </form>

        <!-- Footer trust badges -->
        <div style="margin-top:1.75rem;padding-top:1.25rem;border-top:1px solid var(--border);display:flex;justify-content:center;align-items:center;gap:1rem;font-size:.7rem;color:var(--muted);">
          <span>
            <i class="fa-solid fa-shield-halved" style="color:var(--solar);margin-right:.25rem;"></i>
            <span class="lang-es">SSL Seguro 256-bit</span>
            <span class="lang-en">256-bit SSL Secure</span>
          </span>
          <span style="opacity:.3">•</span>
          <span>
            <i class="fa-solid fa-cloud" style="color:var(--accent);margin-right:.25rem;"></i>
            <span class="lang-es">Nube Supabase</span>
            <span class="lang-en">Supabase Cloud</span>
          </span>
        </div>

      </div>
    </div>
  `;
}

/**
 * Initialise login view event listeners.
 *
 * @param {Function} onLogin - Async callback `(email: string, password: string) => Promise<void>`
 */
export function init(onLogin) {
  const form = document.getElementById('login-form');
  const toggleBtn = document.getElementById('btn-toggle-password');
  const passInput = document.getElementById('login-password');
  const toggleIcon = document.getElementById('toggle-password-icon');

  // Password toggle
  if (toggleBtn && passInput && toggleIcon) {
    toggleBtn.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      toggleIcon.className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) return;

    const btn = document.getElementById('btn-login');
    const icon = document.getElementById('btn-login-icon');
    const origIconClass = icon?.className || '';

    if (btn) btn.disabled = true;
    if (icon) icon.className = 'fa-solid fa-circle-notch spin';

    try {
      await onLogin(email, password);
    } catch (err) {
      // Handled in caller
    } finally {
      if (btn) btn.disabled = false;
      if (icon) icon.className = origIconClass;
    }
  });
}
