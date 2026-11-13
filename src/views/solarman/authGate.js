/**
 * @module solarman/authGate
 * @description On-demand Solarman credentials connection gate.
 */

import { solarmanRuntime } from "../../modules/solarman.js";
import { escapeHTML } from "../../modules/utils.js";

export function renderCredentialsGate(project) {
  return _renderCredentialsGate(project);
}

function _renderCredentialsGate(project) {
  return `
    <div id="solarman-view" class="stack">
      <div class="card section-card solarman-auth-card">
        <div class="section-head">
          <div class="section-head-title">
            <div class="icon-tile solar"><i class="fa-solid fa-satellite-dish"></i></div>
            <div>
              <h2>
                <span class="lang-es">Conexión Remota con Solarman PV</span>
                <span class="lang-en">Solarman PV Remote Monitoring Connection</span>
              </h2>
              <p>
                <span class="lang-es">Ingresa tus credenciales de Solarman para vincular e inspeccionar en vivo los inversores de <strong>${escapeHTML(project.name || 'este proyecto')}</strong></span>
                <span class="lang-en">Enter your Solarman credentials to link and inspect live inverter telemetry for <strong>${escapeHTML(project.name || 'this project')}</strong></span>
              </p>
            </div>
          </div>
          <span class="meta-chip accent">
            <i class="fa-solid fa-shield-halved"></i>
            <span class="lang-es">Hash SHA-256 Seguro</span>
            <span class="lang-en">Secure SHA-256 Hash</span>
          </span>
        </div>

        <div class="solarman-methods-banner">
          <div class="solarman-method-pill">
            <i class="fa-solid fa-key text-solar"></i>
            <div>
              <strong><span class="lang-es">Credenciales Bajo Demanda</span><span class="lang-en">On-Demand Credentials</span></strong>
              <span><span class="lang-es">Tu contraseña se convierte en hash SHA-256 localmente antes de enviarse a Solarman.</span><span class="lang-en">Your password is hashed locally via SHA-256 before authenticating with Solarman.</span></span>
            </div>
          </div>
          <div class="solarman-method-pill">
            <i class="fa-solid fa-diagram-project text-accent"></i>
            <div>
              <strong><span class="lang-es">Soporte Multi-Planta por Proyecto</span><span class="lang-en">Multi-Plant Project Binding</span></strong>
              <span><span class="lang-es">Cada proyecto de la app se vincula a su planta específica de Solarman o puedes cambiarla con un botón.</span><span class="lang-en">Each project binds to its own Solarman station or lets you switch stations anytime.</span></span>
            </div>
          </div>
        </div>

        <form id="solarman-auth-form" class="form-stack" style="margin-top:1.25rem;">
          <div class="field-row">
            <div class="field">
              <label for="sm-email">
                <i class="fa-solid fa-envelope text-accent"></i>
                <span class="lang-es">Correo de Cuenta Solarman</span>
                <span class="lang-en">Solarman Account Email</span>
              </label>
              <input
                type="email"
                id="sm-email"
                required
                autocomplete="username"
                placeholder="usuario@ejemplo.com"
              >
            </div>

            <div class="field">
              <label for="sm-password">
                <i class="fa-solid fa-lock text-solar"></i>
                <span class="lang-es">Contraseña de Solarman</span>
                <span class="lang-en">Solarman Password</span>
              </label>
              <input
                type="password"
                id="sm-password"
                required
                autocomplete="current-password"
                placeholder="••••••••••••"
              >
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label for="sm-app-id">
                <i class="fa-solid fa-fingerprint text-warning"></i>
                <span>Solarman OpenAPI <code>appId</code></span>
              </label>
              <input
                type="text"
                id="sm-app-id"
                value="${import.meta.env.VITE_SOLARMAN_APP_ID || ''}"
                placeholder="Ej: 3026072046343756 (Configurable en .env)"
              >
            </div>

            <div class="field">
              <label for="sm-app-secret">
                <i class="fa-solid fa-user-shield text-warning"></i>
                <span>Solarman OpenAPI <code>appSecret</code></span>
              </label>
              <input
                type="password"
                id="sm-app-secret"
                value="${import.meta.env.VITE_SOLARMAN_APP_SECRET || ''}"
                placeholder="Clave secreta de API Solarman"
              >
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label for="sm-region">
                <i class="fa-solid fa-globe text-accent"></i>
                <span class="lang-es">Servidor Regional Solarman</span>
                <span class="lang-en">Solarman Regional Server</span>
              </label>
              <select id="sm-region">
                <option value="global" selected>Global / Américas (globalapi.solarmanpv.com)</option>
                <option value="intl">Internacional / Legacy (api.solarmanpv.com)</option>
              </select>
            </div>

            <div class="field">
              <label for="sm-org-id">
                <i class="fa-solid fa-building text-muted"></i>
                <span class="lang-es">ID Organización Business (Opcional)</span>
                <span class="lang-en">Business Org ID (Optional)</span>
              </label>
              <input
                type="text"
                id="sm-org-id"
                placeholder="Dejar vacío para cuentas Solarman Smart"
              >
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;padding-top:.25rem;">
            <label style="display:flex;align-items:center;gap:.55rem;cursor:pointer;font-size:.86rem;color:var(--text-secondary);">
              <input type="checkbox" id="sm-remember" checked style="width:16px;height:16px;accent-color:var(--solar);">
              <span class="lang-es">Mantener sesión de Solarman activa en este navegador</span>
              <span class="lang-en">Keep Solarman session active in this browser</span>
            </label>

            <div style="font-size:.78rem;color:var(--muted-light);">
              <i class="fa-solid fa-circle-info"></i>
              <span class="lang-es">¿Aún no tienes <code>appId</code>? Puedes probar la vista multi-planta en modo demostración.</span>
              <span class="lang-en">Don't have an <code>appId</code> yet? Try the multi-plant view in demo mode.</span>
            </div>
          </div>

          ${solarmanRuntime.error ? `
            <div class="anomaly-banner warning" style="margin-top:.25rem;">
              <div class="anomaly-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
              <div class="anomaly-content">
                <strong><span class="lang-es">Aviso de Conexión</span><span class="lang-en">Connection Notice</span></strong>
                <p>${escapeHTML(solarmanRuntime.error)}</p>
              </div>
            </div>
          ` : ''}

          <div class="form-actions" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem;margin-top:.5rem;">
            <button type="button" id="btn-solarman-demo" class="btn btn-ghost">
              <i class="fa-solid fa-flask text-ai"></i>
              <span class="lang-es">Probar Monitor Multi-Planta (Modo Demo)</span>
              <span class="lang-en">Try Multi-Plant Monitor (Demo Mode)</span>
            </button>

            <button type="submit" id="btn-solarman-connect" class="btn btn-solar btn-lg">
              <i class="fa-solid fa-plug-circle-bolt"></i>
              <span class="lang-es">Conectar con Solarman Cloud</span>
              <span class="lang-en">Connect to Solarman Cloud</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
