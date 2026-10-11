/**
 * @module loginView
 * @description Modern enterprise login view for JF Solar Cloud with dual-panel layout.
 */

/**
 * Render the login screen HTML.
 *
 * @returns {string} Login view HTML string
 */
export function render() {
  return `
    <div class="auth-shell" id="login-view">
      <!-- Left Hero Panel (Desktop) -->
      <div class="auth-hero">
        <div>
          <div class="auth-brand">
            <div class="brand-mark lg">
              <i class="fa-solid fa-solar-panel"></i>
            </div>
            <div>
              <h1 style="font-size:1.15rem;font-weight:800;color:var(--text-strong);letter-spacing:-.02em;">JF Solar Cloud</h1>
              <span class="brand-sub">Enterprise Telemetry</span>
            </div>
          </div>

          <h2>
            Monitoreo y telemetría <span class="grad">fotovoltaica de alta fidelidad</span>
          </h2>
          <p class="lead">
            Supervisa balances de red, generación solar, costos de kWh y retorno de inversión en tiempo real con estándares de ingeniería.
          </p>

          <div class="auth-features">
            <div class="auth-feature">
              <div class="icon-tile sm solar"><i class="fa-solid fa-bolt"></i></div>
              <div>
                <strong>Estándar Solar IEC 61724</strong>
                <span>Rendimiento específico (kWh/kWp) y Horas Sol Pico (HSP).</span>
              </div>
            </div>

            <div class="auth-feature">
              <div class="icon-tile sm ai"><i class="fa-solid fa-brain"></i></div>
              <div>
                <strong>Pronóstico Econométrico WLS</strong>
                <span>Modelos predictivos ponderados para anticipar aumentos en tarifa.</span>
              </div>
            </div>

            <div class="auth-feature">
              <div class="icon-tile sm warning"><i class="fa-solid fa-chart-pie"></i></div>
              <div>
                <strong>Retorno de Inversión Multi-Fase</strong>
                <span>Seguimiento de amortización por expansiones y capacidad añadida.</span>
              </div>
            </div>
          </div>
        </div>

        <div class="auth-hero-foot">
          <span>© 2026 JF Solar Cloud · Plataforma de Analítica de Energía Solar</span>
        </div>
      </div>

      <!-- Right Form Panel -->
      <div class="auth-panel">
        <div class="auth-card">
          <!-- Mobile Brand Icon -->
          <div class="auth-brand" style="margin-bottom:1.25rem;">
            <div class="brand-mark">
              <i class="fa-solid fa-solar-panel"></i>
            </div>
            <div>
              <h2 style="font-size:1.05rem;font-weight:800;color:var(--text-strong);">JF Solar Cloud</h2>
              <span class="brand-sub">Cloud Analytics</span>
            </div>
          </div>

          <h2 class="auth-title">
            <span class="lang-es">Iniciar Sesión</span>
            <span class="lang-en">Sign In</span>
          </h2>
          <p class="auth-subtitle">
            <span class="lang-es">Accede a tus plantas solares y telemetría</span>
            <span class="lang-en">Access your solar plants and telemetry</span>
          </p>

          <!-- Login form -->
          <form id="login-form" autocomplete="on" class="form-stack">
            <!-- Email -->
            <div class="field">
              <label for="login-email">
                <i class="fa-solid fa-envelope text-accent"></i>
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
                <i class="fa-solid fa-lock text-solar"></i>
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
              class="btn btn-accent btn-lg btn-block"
              style="margin-top:.35rem;"
            >
              <i class="fa-solid fa-bolt" id="btn-login-icon"></i>
              <span class="lang-es" id="btn-login-text-es">Acceder al Sistema</span>
              <span class="lang-en" id="btn-login-text-en">Sign In</span>
            </button>
          </form>

          <!-- Footer trust badges -->
          <div class="auth-trust">
            <span>
              <i class="fa-solid fa-shield-halved text-solar"></i>
              <span class="lang-es">SSL Seguro 256-bit</span>
              <span class="lang-en">256-bit SSL</span>
            </span>
            <span>•</span>
            <span>
              <i class="fa-solid fa-cloud text-accent"></i>
              <span>Supabase Cloud</span>
            </span>
          </div>
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
