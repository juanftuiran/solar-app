/**
 * @module loginView
 * @description Login screen for JF Solar Cloud.
 * Renders a centered modal-style card with email/password fields and
 * handles form submission with loading state.
 */

import { state } from '../modules/state.js';

/**
 * Render the login screen HTML.
 * Uses the modal-overlay style but remains always visible (no hidden class).
 *
 * @returns {string} Login view HTML string
 */
export function render() {
  return `
    <div class="modal-overlay" id="login-view" style="z-index:50;">
      <div class="modal-box" style="max-width:24rem;text-align:center;">

        <!-- Cloud icon -->
        <div style="margin-bottom:1.5rem;">
          <i
            class="fa-solid fa-cloud"
            style="font-size:3rem;color:#0ea5e9;filter:drop-shadow(0 4px 12px rgba(14,165,233,.3));"
          ></i>
        </div>

        <!-- Title -->
        <h1 style="font-size:1.375rem;font-weight:900;color:#e2e8f0;margin-bottom:.25rem;letter-spacing:-.01em;">
          JF Solar Cloud
        </h1>

        <!-- Subtitle -->
        <p style="font-size:.8rem;color:#64748b;margin-bottom:1.75rem;">
          <span class="lang-es">Autenticación Segura</span>
          <span class="lang-en">Secure Authentication</span>
        </p>

        <!-- Login form -->
        <form id="login-form" autocomplete="on" style="display:flex;flex-direction:column;gap:1rem;">
          <!-- Email -->
          <div class="field">
            <label for="login-email">
              <i class="fa-solid fa-envelope" style="margin-right:.3rem;font-size:.65rem;"></i>
              <span class="lang-es">Correo electrónico</span>
              <span class="lang-en">Email address</span>
            </label>
            <input
              type="email"
              id="login-email"
              name="email"
              placeholder="user@example.com"
              required
              autocomplete="email"
            />
          </div>

          <!-- Password -->
          <div class="field">
            <label for="login-password">
              <i class="fa-solid fa-lock" style="margin-right:.3rem;font-size:.65rem;"></i>
              <span class="lang-es">Contraseña</span>
              <span class="lang-en">Password</span>
            </label>
            <input
              type="password"
              id="login-password"
              name="password"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
          </div>

          <!-- Submit button -->
          <button
            type="submit"
            id="btn-login"
            class="btn btn-accent"
            style="width:100%;padding:.625rem 1rem;margin-top:.5rem;"
          >
            <i class="fa-solid fa-bolt" id="btn-login-icon"></i>
            <span class="lang-es" id="btn-login-text-es">Conectar a la Nube</span>
            <span class="lang-en" id="btn-login-text-en">Connect to Cloud</span>
          </button>
        </form>

        <!-- Footer hint -->
        <p style="font-size:.65rem;color:#475569;margin-top:1.25rem;">
          <i class="fa-solid fa-shield-halved" style="margin-right:.2rem;"></i>
          <span class="lang-es">Conexión cifrada de extremo a extremo</span>
          <span class="lang-en">End-to-end encrypted connection</span>
        </p>

      </div>
    </div>
  `;
}

/**
 * Initialise login view event listeners.
 * Binds form submit to the provided callback and manages button loading state.
 *
 * @param {Function} onLogin - Async callback `(email: string, password: string) => Promise<void>`
 */
export function init(onLogin) {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) return;

    const btn = document.getElementById('btn-login');
    const icon = document.getElementById('btn-login-icon');
    const origIconClass = icon?.className || '';

    // Show spinner
    if (btn) btn.disabled = true;
    if (icon) icon.className = 'fa-solid fa-circle-notch spin';

    try {
      await onLogin(email, password);
    } catch (err) {
      // Restore button on error (caller should handle the UX)
    } finally {
      if (btn) btn.disabled = false;
      if (icon) icon.className = origIconClass;
    }
  });
}
