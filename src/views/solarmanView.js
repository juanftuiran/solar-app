/**
 * @module solarmanView
 * @description Dedicated Live Inverter & Plant Monitoring View connected to Solarman PV.
 * Features:
 *  - On-demand credential prompt (only asks when entering this section)
 *  - Multi-plant project binding selector (ensures active project shows its matching Solarman plant)
 *  - Real-time power flow, MPPT DC strings, AC phase telemetry, thermal diagnostics
 *  - Adaptive auto-refresh synced with Solarman's collectionTime timestamp
 *  - 1-click bridge to send cumulative inverter kWh to the Cloud Log modal
 */

import { state } from '../modules/state.js';
import { fDec } from '../modules/formatters.js';
import {
  solarmanRuntime,
  getSolarmanSession,
  getProjectStationBinding,
  findSuggestedStationForProject,
} from '../modules/solarman.js';

/**
 * Render the Solarman Live Monitor View HTML.
 * @returns {string}
 */
export function render() {
  const session = getSolarmanSession();
  const project = state.activeProject || {};
  const isAdmin = state.activeProjectRole === 'admin' || state.isAdmin;

  // 1. Not connected yet -> Show On-Demand Credentials Gate
  if (!session) {
    return _renderCredentialsGate(project);
  }

  // 2. Loading initial stations list
  if (solarmanRuntime.loading && (!solarmanRuntime.stations || solarmanRuntime.stations.length === 0)) {
    return _renderLoadingState(project);
  }

  // 3. Station Picker Open (or no station bound yet for this project)
  if (solarmanRuntime.showStationPicker || !solarmanRuntime.activeStation) {
    return _renderStationPicker(project, session);
  }

  // 4. Connected & Bound -> Render Live Inverter Telemetry Dashboard
  return _renderLiveMonitor(project, session, isAdmin);
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. On-Demand Credentials Gate
   ═══════════════════════════════════════════════════════════════════════════ */

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
                <span class="lang-es">Ingresa tus credenciales de Solarman para vincular e inspeccionar en vivo los inversores de <strong>${_escapeHTML(project.name || 'este proyecto')}</strong></span>
                <span class="lang-en">Enter your Solarman credentials to link and inspect live inverter telemetry for <strong>${_escapeHTML(project.name || 'this project')}</strong></span>
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
                placeholder="Ej: 202405180001234 (Requerido por Open API v1.0)"
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
                <p>${_escapeHTML(solarmanRuntime.error)}</p>
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

/* ═══════════════════════════════════════════════════════════════════════════
   2. Multi-Plant Selector / Project Binding View
   ═══════════════════════════════════════════════════════════════════════════ */

function _renderStationPicker(project, session) {
  const stations = solarmanRuntime.stations || [];
  const currentBinding = getProjectStationBinding(project.id);
  const { suggested } = findSuggestedStationForProject(project, stations);

  return `
    <div id="solarman-view" class="stack">
      <div class="card section-card">
        <div class="section-head">
          <div class="section-head-title">
            <div class="icon-tile accent"><i class="fa-solid fa-solar-panel"></i></div>
            <div>
              <h2>
                <span class="lang-es">Seleccionar Planta Solarman para: ${_escapeHTML(project.name || 'Proyecto Activo')}</span>
                <span class="lang-en">Select Solarman Plant for: ${_escapeHTML(project.name || 'Active Project')}</span>
              </h2>
              <p>
                <span class="lang-es">Tu cuenta de Solarman (${_escapeHTML(session.email)}) tiene <strong>${stations.length}</strong> ${stations.length === 1 ? 'planta registrada' : 'plantas registradas'}. Elige cuál vincular a este proyecto para que siempre muestre los datos correctos.</span>
                <span class="lang-en">Your Solarman account (${_escapeHTML(session.email)}) has <strong>${stations.length}</strong> ${stations.length === 1 ? 'station' : 'stations'}. Select which one belongs to this project.</span>
              </p>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
            ${solarmanRuntime.activeStation ? `
              <button type="button" id="btn-cancel-station-picker" class="btn btn-ghost btn-sm">
                <i class="fa-solid fa-arrow-left"></i>
                <span class="lang-es">Volver al Monitor</span>
                <span class="lang-en">Back to Monitor</span>
              </button>
            ` : ''}
            <button type="button" id="btn-solarman-disconnect" class="btn btn-danger-outline btn-sm">
              <i class="fa-solid fa-power-off"></i>
              <span class="lang-es">Cambiar Cuenta</span>
              <span class="lang-en">Switch Account</span>
            </button>
          </div>
        </div>

        ${stations.length === 0 ? `
          <div class="empty-state" style="padding:2.5rem 1rem;">
            <i class="fa-solid fa-satellite-dish"></i>
            <h3><span class="lang-es">No se encontraron plantas en esta cuenta</span><span class="lang-en">No stations found in this account</span></h3>
            <p><span class="lang-es">Verifica que tu usuario tenga plantas asignadas en Solarman o cambia la región del servidor.</span><span class="lang-en">Check that your user has assigned stations in Solarman or switch server region.</span></p>
          </div>
        ` : `
          <div class="solarman-stations-grid">
            ${stations.map(st => {
              const isCurrentBound = currentBinding && String(currentBinding.stationId) === String(st.id);
              const isSuggested = suggested && String(suggested.id) === String(st.id);
              const isOnline = !/OFFLINE|FAULT/i.test(String(st.networkStatus || 'NORMAL'));

              return `
                <div class="solarman-station-card ${isCurrentBound ? 'bound' : isSuggested ? 'suggested' : ''}">
                  <div class="solarman-station-card-top">
                    <div>
                      <div class="solarman-station-id">ID #${_escapeHTML(String(st.id))}</div>
                      <h3 class="solarman-station-title">${_escapeHTML(st.name)}</h3>
                      <div class="solarman-station-loc">
                        <i class="fa-solid fa-location-dot text-solar"></i>
                        <span>${_escapeHTML(st.locationAddress || 'Ubicación no especificada')}</span>
                      </div>
                    </div>
                    <span class="health-pill ${isOnline ? 'optimo' : 'revisar'}">
                      <span class="health-pulse-dot"></span>
                      <span>${isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                    </span>
                  </div>

                  <div class="solarman-station-metrics">
                    <div>
                      <span class="lbl"><span class="lang-es">Capacidad Instalada</span><span class="lang-en">Installed Capacity</span></span>
                      <strong class="val text-accent">${fDec(st.installedCapacity || 0, 2)} kWp</strong>
                    </div>
                    <div>
                      <span class="lbl"><span class="lang-es">Potencia Actual</span><span class="lang-en">Current Power</span></span>
                      <strong class="val text-solar">${fDec((st.generationPower || 0) / 1000, 2)} kW (${Math.round(st.generationPower || 0)} W)</strong>
                    </div>
                  </div>

                  <div class="solarman-station-badges">
                    ${isCurrentBound ? `
                      <span class="meta-chip solar">
                        <i class="fa-solid fa-link"></i>
                        <span class="lang-es">Vinculada actualmente a este proyecto</span>
                        <span class="lang-en">Currently bound to this project</span>
                      </span>
                    ` : isSuggested ? `
                      <span class="meta-chip accent">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                        <span class="lang-es">Coincidencia sugerida para ${_escapeHTML(project.name)}</span>
                        <span class="lang-en">Suggested match for ${_escapeHTML(project.name)}</span>
                      </span>
                    ` : ''}
                  </div>

                  <button
                    type="button"
                    class="btn ${isCurrentBound || isSuggested ? 'btn-solar' : 'btn-accent'} btn-select-solarman-station"
                    data-station-id="${_escapeHTML(String(st.id))}"
                    style="width:100%;margin-top:.75rem;justify-content:center;"
                  >
                    <i class="fa-solid fa-check-circle"></i>
                    <span class="lang-es">${isCurrentBound ? 'Continuar con esta Planta' : `Vincular a "${_escapeHTML(project.name)}"`}</span>
                    <span class="lang-en">${isCurrentBound ? 'Continue with this Plant' : `Bind to "${_escapeHTML(project.name)}"`}</span>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. Live Telemetry Dashboard (Connected & Bound to Active Project)
   ═══════════════════════════════════════════════════════════════════════════ */

function _renderLiveMonitor(project, session, isAdmin) {
  const station = solarmanRuntime.activeStation || {};
  const devData = solarmanRuntime.deviceData || {
    summary: {},
    pvStrings: [],
    acPhases: [],
    temperatures: [],
    rawList: [],
  };
  const sum = devData.summary || {};
  const devices = solarmanRuntime.devices || [];

  const colTimeSec = solarmanRuntime.lastCollectionTime || Math.floor(Date.now() / 1000);
  const colDate = new Date(colTimeSec * 1000);
  const colTimeStr = colDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const colDateStr = colDate.toLocaleDateString(state.lang === 'en' ? 'en-US' : 'es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isOnline = devData.deviceState !== 3;
  const tempVal = sum.mainTempC;
  const tempClass = tempVal === null ? 'text-muted' : tempVal > 60 ? 'text-danger' : tempVal > 48 ? 'text-warning' : 'text-solar';

  return `
    <div id="solarman-view" class="stack">
      <!-- ═══ Top Control & Multi-Plant Binding Bar ═══ -->
      <div class="card solarman-topbar">
        <div class="solarman-topbar-left">
          <div class="solarman-live-badge ${solarmanRuntime.justUpdatedPacket ? 'pulse-highlight' : ''}" id="sm-live-status-pill">
            <span class="online-dot"></span>
            <span>${session.isDemo ? 'DEMO LIVE' : isOnline ? 'SOLARMAN ONLINE' : 'STANDBY / OFFLINE'}</span>
          </div>

          <div class="solarman-plant-binding-info">
            <div class="solarman-plant-title-row">
              <span class="lbl">
                <i class="fa-solid fa-link text-solar"></i>
                <span class="lang-es">Planta Vinculada:</span>
                <span class="lang-en">Bound Plant:</span>
              </span>
              <strong class="val">${_escapeHTML(station.name || 'Planta Solarman')}</strong>
              <span class="meta-chip accent" title="ID de Planta en Solarman">ID #${_escapeHTML(String(station.id || ''))}</span>
            </div>
            <div class="solarman-sync-meta">
              <span>
                <i class="fa-regular fa-clock text-accent"></i>
                <span class="lang-es">Último reporte del inversor:</span>
                <span class="lang-en">Last inverter packet:</span>
                <strong id="sm-last-packet-time">${colTimeStr} (${colDateStr})</strong>
                <span id="sm-packet-age-label" class="text-muted"></span>
              </span>
              <span class="sep">·</span>
              <span id="sm-next-sync-countdown" class="text-muted">
                <i class="fa-solid fa-rotate"></i>
                <span class="lang-es">Sincronización automática activa</span>
                <span class="lang-en">Auto-sync active</span>
              </span>
            </div>
          </div>
        </div>

        <div class="solarman-topbar-actions">
          <!-- Device / Inverter Selector -->
          ${devices.length > 0 ? `
            <div class="solarman-device-select-wrap">
              <label for="sm-device-select" class="text-xs text-muted">
                <i class="fa-solid fa-microchip"></i>
                <span class="lang-es">Equipo:</span><span class="lang-en">Device:</span>
              </label>
              <select id="sm-device-select" class="select-pill">
                ${devices.map(d => `
                  <option value="${_escapeHTML(d.deviceSn)}" ${d.deviceSn === solarmanRuntime.activeDeviceSn ? 'selected' : ''}>
                    ${_escapeHTML(d.deviceType)}: ${_escapeHTML(d.deviceSn)}
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          <!-- Button to Switch / Select Plant among account plants -->
          <button
            type="button"
            id="btn-solarman-pick-station"
            class="btn btn-ghost btn-sm"
            title="Elegir otra planta de la cuenta Solarman para este proyecto"
          >
            <i class="fa-solid fa-arrows-UpDownLeftRight fa-repeat text-accent"></i>
            <span class="lang-es">Cambiar Planta (${solarmanRuntime.stations?.length || 1})</span>
            <span class="lang-en">Switch Plant (${solarmanRuntime.stations?.length || 1})</span>
          </button>

          <!-- Manual Refresh Button -->
          <button
            type="button"
            id="btn-solarman-refresh"
            class="btn btn-accent btn-sm"
            ${solarmanRuntime.loading ? 'disabled' : ''}
          >
            <i class="fa-solid fa-arrows-rotate ${solarmanRuntime.loading ? 'spin' : ''}"></i>
            <span class="lang-es">Actualizar Ahora</span>
            <span class="lang-en">Refresh Now</span>
          </button>

          ${isAdmin && sum.totalEnergyKwh > 0 ? `
            <!-- Bridge to Cloud Log Modal -->
            <button
              type="button"
              id="btn-solarman-push-reading"
              class="btn btn-solar btn-sm"
              data-total-kwh="${sum.totalEnergyKwh}"
              title="Pre-llenar un Nuevo Registro en el Historial Cloud con la lectura acumulada actual del inversor"
            >
              <i class="fa-solid fa-cloud-arrow-up"></i>
              <span class="lang-es">Usar ${fDec(sum.totalEnergyKwh, 1)} kWh en Registro</span>
              <span class="lang-en">Use ${fDec(sum.totalEnergyKwh, 1)} kWh in Record</span>
            </button>
          ` : ''}

          <!-- Disconnect / Change Account -->
          <button
            type="button"
            id="btn-solarman-disconnect"
            class="btn btn-ghost btn-icon btn-sm"
            title="Desconectar cuenta Solarman (${_escapeHTML(session.email)})"
          >
            <i class="fa-solid fa-plug-circle-xmark text-danger"></i>
          </button>
        </div>
      </div>

      ${solarmanRuntime.error ? `
        <div class="anomaly-banner warning">
          <div class="anomaly-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div class="anomaly-content">
            <strong><span class="lang-es">Alerta de Telemetría Solarman</span><span class="lang-en">Solarman Telemetry Alert</span></strong>
            <p>${_escapeHTML(solarmanRuntime.error)}</p>
          </div>
        </div>
      ` : ''}

      <!-- ═══ Primary Live KPIs (4 Cards) ═══ -->
      <div class="kpi-grid">
        <!-- 1. Instantaneous AC Output Power -->
        <div class="card kpi-card solar">
          <div class="kpi-head">
            <span class="kpi-label">
              <span class="lang-es">Potencia Solar Actual (AC)</span>
              <span class="lang-en">Live Solar Power (AC)</span>
            </span>
            <div class="icon-tile sm solar"><i class="fa-solid fa-bolt"></i></div>
          </div>
          <div class="kpi-value text-solar tabular-nums">
            ${sum.acPowerW >= 1000 ? `${fDec(sum.acPowerKw, 2)} kW` : `${Math.round(sum.acPowerW || 0)} W`}
          </div>
          <div class="solarman-cap-bar">
            <div class="solarman-cap-bar-fill" style="width:${Math.min(100, sum.loadFactorPct || 0).toFixed(1)}%;"></div>
          </div>
          <div class="kpi-foot">
            <span class="delta up">${fDec(sum.loadFactorPct || 0, 1)}% cap.</span>
            <span class="text-xs text-muted">DC: ${Math.round(sum.dcPowerW || 0)} W (${sum.inverterEfficiencyPct > 0 ? `${fDec(sum.inverterEfficiencyPct, 1)}% ef.` : 'MPPT'})</span>
          </div>
        </div>

        <!-- 2. Daily Energy Production -->
        <div class="card kpi-card accent">
          <div class="kpi-head">
            <span class="kpi-label">
              <span class="lang-es">Generación del Día (Hoy)</span>
              <span class="lang-en">Daily Yield (Today)</span>
            </span>
            <div class="icon-tile sm accent"><i class="fa-solid fa-sun"></i></div>
          </div>
          <div class="kpi-value text-accent tabular-nums">
            ${fDec(sum.dailyEnergyKwh || 0, 2)} <small style="font-size:.55em;font-weight:600;">kWh</small>
          </div>
          <div class="kpi-foot">
            <span class="text-xs text-muted">
              <i class="fa-solid fa-gauge-high text-solar"></i>
              HSP Hoy: <strong>${sum.capacityKw > 0 ? fDec((sum.dailyEnergyKwh || 0) / sum.capacityKw, 2) : '—'} h</strong>
            </span>
            <span class="text-xs text-muted">Cap: ${fDec(sum.capacityKw || 0, 1)} kWp</span>
          </div>
        </div>

        <!-- 3. Cumulative Inverter Production (Total kWh) -->
        <div class="card kpi-card ai">
          <div class="kpi-head">
            <span class="kpi-label">
              <span class="lang-es">Lectura Acumulada Inversor</span>
              <span class="lang-en">Cumulative Inverter Yield</span>
            </span>
            <div class="icon-tile sm ai"><i class="fa-solid fa-microchip"></i></div>
          </div>
          <div class="kpi-value text-ai tabular-nums">
            ${sum.totalEnergyKwh > 0 ? `${fDec(sum.totalEnergyKwh, 1)} <small style="font-size:.55em;font-weight:600;">kWh</small>` : '—'}
          </div>
          <div class="kpi-foot">
            <span class="text-xs text-muted">SN: <strong>${_escapeHTML(solarmanRuntime.activeDeviceSn || 'N/A')}</strong></span>
            <span class="text-xs text-solar"><i class="fa-solid fa-check"></i> Odómetro Total</span>
          </div>
        </div>

        <!-- 4. Inverter Temperature & Grid Health -->
        <div class="card kpi-card warning">
          <div class="kpi-head">
            <span class="kpi-label">
              <span class="lang-es">Temperatura & Red AC</span>
              <span class="lang-en">Temperature & AC Grid</span>
            </span>
            <div class="icon-tile sm warning"><i class="fa-solid fa-temperature-half"></i></div>
          </div>
          <div class="kpi-value ${tempClass} tabular-nums">
            ${tempVal !== null ? `${fDec(tempVal, 1)} °C` : 'Normal'}
          </div>
          <div class="kpi-foot">
            <span class="text-xs text-muted">
              VAC: <strong>${devData.acPhases?.[0]?.voltageV ? `${fDec(devData.acPhases[0].voltageV, 1)} V` : '—'}</strong>
            </span>
            <span class="text-xs text-muted">
              Frec: <strong>${devData.acPhases?.[0]?.freqHz ? `${fDec(devData.acPhases[0].freqHz, 2)} Hz` : '60 Hz'}</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- ═══ Live Power Flow Diagram + MPPT DC Strings & AC Phases ═══ -->
      <div class="solarman-detail-grid">
        <!-- Left Column: MPPT Strings (DC Input) -->
        <div class="card section-card">
          <div class="section-head" style="margin-bottom:1rem;">
            <div class="section-head-title">
              <div class="icon-tile sm solar"><i class="fa-solid fa-solar-panel"></i></div>
              <div>
                <h3>
                  <span class="lang-es">Telemetría de Cadenas DC (Strings MPPT)</span>
                  <span class="lang-en">DC Strings Telemetry (MPPT Inputs)</span>
                </h3>
                <p>
                  <span class="lang-es">Voltaje, corriente y potencia instantánea por entrada de paneles</span>
                  <span class="lang-en">Live voltage, current and power per PV string input</span>
                </p>
              </div>
            </div>
            <span class="meta-chip solar">${Math.round(sum.dcPowerW || 0)} W DC</span>
          </div>

          <div class="solarman-strings-list">
            ${devData.pvStrings.map(st => {
              const sharePct = sum.dcPowerW > 0 ? Math.min(100, Math.round((st.powerW / sum.dcPowerW) * 100)) : 0;
              return `
                <div class="solarman-string-row ${st.active ? 'active' : 'idle'}">
                  <div class="solarman-string-head">
                    <div>
                      <strong>${_escapeHTML(st.label)}</strong>
                      <span class="status-tag ${st.active ? 'on' : 'off'}">${st.active ? 'ACTIVO' : '0 W'}</span>
                    </div>
                    <div class="solarman-string-power text-solar tabular-nums">
                      ${Math.round(st.powerW)} W <small class="text-muted">(${sharePct}%)</small>
                    </div>
                  </div>
                  <div class="solarman-string-metrics">
                    <span><i class="fa-solid fa-bolt text-accent"></i> Voltaje DC: <strong>${fDec(st.voltageV, 1)} V</strong></span>
                    <span><i class="fa-solid fa-wave-square text-warning"></i> Corriente DC: <strong>${fDec(st.currentA, 2)} A</strong></span>
                  </div>
                  <div class="solarman-cap-bar" style="margin-top:.45rem;">
                    <div class="solarman-cap-bar-fill" style="width:${sharePct}%;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Right Column: AC Output Phases, Station Flow & Session History -->
        <div class="card section-card">
          <div class="section-head" style="margin-bottom:1rem;">
            <div class="section-head-title">
              <div class="icon-tile sm accent"><i class="fa-solid fa-plug-circle-check"></i></div>
              <div>
                <h3>
                  <span class="lang-es">Salida AC a Red & Flujo de Planta</span>
                  <span class="lang-en">AC Grid Output & Plant Power Flow</span>
                </h3>
                <p>
                  <span class="lang-es">Parámetros eléctricos de sincronización con red y sensores térmicos</span>
                  <span class="lang-en">Grid synchronization electrical parameters and thermal sensors</span>
                </p>
              </div>
            </div>
            <span class="meta-chip accent">${Math.round(sum.acPowerW || 0)} W AC</span>
          </div>

          <!-- AC Phases -->
          <div class="solarman-phases-grid">
            ${devData.acPhases.map(ph => `
              <div class="solarman-phase-box">
                <div class="phase-tag">Fase ${_escapeHTML(ph.id)}</div>
                <div class="phase-val tabular-nums">${fDec(ph.voltageV, 1)} V</div>
                <div class="phase-sub tabular-nums">${fDec(ph.currentA, 2)} A · ${ph.freqHz ? `${fDec(ph.freqHz, 2)} Hz` : '60 Hz'}</div>
              </div>
            `).join('')}
          </div>

          <!-- Plant Flow Summary (if meter/consumption data exists) -->
          <div class="solarman-flow-strip" style="margin-top:1rem;">
            <div class="flow-node">
              <span class="lbl"><i class="fa-solid fa-sun text-solar"></i> Solar</span>
              <strong class="val text-solar">${Math.round(sum.acPowerW || 0)} W</strong>
            </div>
            <div class="flow-node">
              <span class="lbl"><i class="fa-solid fa-house-laptop text-accent"></i> <span class="lang-es">Consumo</span><span class="lang-en">Load</span></span>
              <strong class="val text-accent">${sum.loadPowerW ? `${Math.round(sum.loadPowerW)} W` : '—'}</strong>
            </div>
            <div class="flow-node">
              <span class="lbl"><i class="fa-solid fa-tower-observation text-warning"></i> <span class="lang-es">Red Eléctrica</span><span class="lang-en">Grid</span></span>
              <strong class="val text-warning">${sum.gridPowerW ? `${Math.round(sum.gridPowerW)} W` : 'On-Grid'}</strong>
            </div>
            ${sum.batterySocPct !== null ? `
              <div class="flow-node">
                <span class="lbl"><i class="fa-solid fa-battery-three-quarters text-ai"></i> Batería</span>
                <strong class="val text-ai">${fDec(sum.batterySocPct, 0)}%</strong>
              </div>
            ` : ''}
          </div>

          <!-- Recent Live Packets Log during current session -->
          <div style="margin-top:1rem;">
            <div class="text-xs text-muted" style="margin-bottom:.4rem;display:flex;justify-content:space-between;">
              <span><i class="fa-solid fa-timeline"></i> <span class="lang-es">Historial de paquetes recibidos en esta sesión</span><span class="lang-en">Packets received in this session</span></span>
              <span>${solarmanRuntime.liveHistory.length} muestras</span>
            </div>
            <div class="solarman-session-pills">
              ${solarmanRuntime.liveHistory.slice(-6).reverse().map(pt => `
                <span class="session-pt-pill">
                  <strong>${pt.timeLabel}</strong>: <span class="text-solar">${Math.round(pt.powerW)} W</span>
                </span>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ Full Inverter Parameter Explorer (dataList) ═══ -->
      <div class="card section-card">
        <div class="section-head" style="margin-bottom:1rem;flex-wrap:wrap;gap:.75rem;">
          <div class="section-head-title">
            <div class="icon-tile sm ai"><i class="fa-solid fa-list-check"></i></div>
            <div>
              <h3>
                <span class="lang-es">Tabla Completa de Registros del Inversor (Solarman <code>currentData</code>)</span>
                <span class="lang-en">Full Inverter Register Table (Solarman <code>currentData</code>)</span>
              </h3>
              <p>
                <span class="lang-es">Todos los parámetros reportados por el datalogger en el último corte (${devData.rawList.length} variables)</span>
                <span class="lang-en">All parameters reported by the datalogger in the latest packet (${devData.rawList.length} variables)</span>
              </p>
            </div>
          </div>

          <div style="min-width:240px;">
            <input
              type="search"
              id="sm-param-search"
              placeholder="Filtrar parámetro (ej. Voltage, Power, Temp...)"
              style="width:100%;padding:.48rem .75rem;border-radius:var(--radius-sm);border:1px solid var(--border-medium);background:var(--bg-elevated);color:var(--text);font-size:.82rem;"
            >
          </div>
        </div>

        <div class="table-wrap" style="max-height:360px;overflow-y:auto;">
          <table class="data-table" id="sm-raw-params-table">
            <thead>
              <tr>
                <th><span class="lang-es">Código / Key</span><span class="lang-en">Key</span></th>
                <th><span class="lang-es">Parámetro del Inversor</span><span class="lang-en">Inverter Parameter</span></th>
                <th class="text-right"><span class="lang-es">Valor Reciente</span><span class="lang-en">Current Value</span></th>
                <th><span class="lang-es">Unidad</span><span class="lang-en">Unit</span></th>
              </tr>
            </thead>
            <tbody id="sm-raw-params-tbody">
              ${devData.rawList.map(item => `
                <tr class="sm-param-row">
                  <td style="font-family:monospace;font-size:.76rem;color:var(--muted-light);">${_escapeHTML(item.key || '—')}</td>
                  <td class="cell-primary">${_escapeHTML(item.name || item.key || '—')}</td>
                  <td class="text-right font-bold text-solar tabular-nums">${_escapeHTML(String(item.value ?? '—'))}</td>
                  <td style="color:var(--accent);font-size:.8rem;">${_escapeHTML(item.unit || '')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function _renderLoadingState(project) {
  return `
    <div id="solarman-view" class="stack">
      <div class="card section-card" style="text-align:center;padding:3.5rem 1.5rem;">
        <i class="fa-solid fa-satellite-dish fa-2x spin text-solar" style="margin-bottom:1rem;"></i>
        <h3>
          <span class="lang-es">Sincronizando telemetría remota con Solarman Cloud...</span>
          <span class="lang-en">Synchronizing remote telemetry with Solarman Cloud...</span>
        </h3>
        <p class="text-muted" style="margin-top:.4rem;">
          <span class="lang-es">Consultando datos recientes para ${_escapeHTML(project.name || 'el proyecto activo')}</span>
          <span class="lang-en">Fetching latest values for ${_escapeHTML(project.name || 'the active project')}</span>
        </p>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Event Listeners Initialization
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Bind interactive events for the Solarman view.
 * @param {Object} callbacks
 * @param {Function} callbacks.onConnect - Submit credentials form
 * @param {Function} callbacks.onActivateDemo - Start demo session
 * @param {Function} callbacks.onDisconnect - Clear session
 * @param {Function} callbacks.onSelectStation - Bind stationId to active project
 * @param {Function} callbacks.onOpenStationPicker - Show multi-plant selector
 * @param {Function} callbacks.onCloseStationPicker - Cancel multi-plant selector
 * @param {Function} callbacks.onSelectDevice - Switch inverter deviceSn
 * @param {Function} callbacks.onManualRefresh - Force telemetry refresh now
 * @param {Function} callbacks.onPushReadingToCloud - Pre-fill New Record modal with cumulative kWh
 */
export function init(callbacks = {}) {
  const {
    onConnect,
    onActivateDemo,
    onDisconnect,
    onSelectStation,
    onOpenStationPicker,
    onCloseStationPicker,
    onSelectDevice,
    onManualRefresh,
    onPushReadingToCloud,
  } = callbacks;

  // 1. Auth form submit
  const authForm = document.getElementById('solarman-auth-form');
  if (authForm && typeof onConnect === 'function') {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-solarman-connect');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-circle-notch spin"></i> <span>Conectando con Solarman...</span>`;
      }
      await onConnect({
        email: document.getElementById('sm-email')?.value || '',
        password: document.getElementById('sm-password')?.value || '',
        appId: document.getElementById('sm-app-id')?.value || '',
        appSecret: document.getElementById('sm-app-secret')?.value || '',
        region: document.getElementById('sm-region')?.value || 'global',
        orgId: document.getElementById('sm-org-id')?.value || '',
        remember: document.getElementById('sm-remember')?.checked !== false,
      });
    });
  }

  // 2. Demo Mode button
  const demoBtn = document.getElementById('btn-solarman-demo');
  if (demoBtn && typeof onActivateDemo === 'function') {
    demoBtn.addEventListener('click', () => onActivateDemo());
  }

  // 3. Disconnect button
  const discBtn = document.getElementById('btn-solarman-disconnect');
  if (discBtn && typeof onDisconnect === 'function') {
    discBtn.addEventListener('click', () => onDisconnect());
  }

  // 4. Select Station buttons (Multi-plant binding)
  document.querySelectorAll('.btn-select-solarman-station').forEach(btn => {
    btn.addEventListener('click', () => {
      const stationId = btn.dataset.stationId;
      if (stationId && typeof onSelectStation === 'function') {
        onSelectStation(stationId);
      }
    });
  });

  // 5. Open / Close Station Picker
  const pickBtn = document.getElementById('btn-solarman-pick-station');
  if (pickBtn && typeof onOpenStationPicker === 'function') {
    pickBtn.addEventListener('click', () => onOpenStationPicker());
  }
  const cancelPickBtn = document.getElementById('btn-cancel-station-picker');
  if (cancelPickBtn && typeof onCloseStationPicker === 'function') {
    cancelPickBtn.addEventListener('click', () => onCloseStationPicker());
  }

  // 6. Switch Device / Inverter SN
  const devSelect = document.getElementById('sm-device-select');
  if (devSelect && typeof onSelectDevice === 'function') {
    devSelect.addEventListener('change', (e) => {
      onSelectDevice(e.target.value);
    });
  }

  // 7. Manual Refresh
  const refreshBtn = document.getElementById('btn-solarman-refresh');
  if (refreshBtn && typeof onManualRefresh === 'function') {
    refreshBtn.addEventListener('click', () => onManualRefresh());
  }

  // 8. Push cumulative kWh to Cloud Log Modal
  const pushBtn = document.getElementById('btn-solarman-push-reading');
  if (pushBtn && typeof onPushReadingToCloud === 'function') {
    pushBtn.addEventListener('click', () => {
      const totalKwh = parseFloat(pushBtn.dataset.totalKwh) || 0;
      onPushReadingToCloud(totalKwh);
    });
  }

  // 9. Parameter Table Filter
  const paramSearch = document.getElementById('sm-param-search');
  if (paramSearch) {
    paramSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#sm-raw-params-tbody tr.sm-param-row').forEach(row => {
        const match = row.textContent.toLowerCase().includes(q);
        row.style.display = match ? '' : 'none';
      });
    });
  }

  updateLiveTickerLabels();
}

/**
 * Update the relative age of the last Solarman packet and countdown to next auto-check.
 */
export function updateLiveTickerLabels() {
  const ageEl = document.getElementById('sm-packet-age-label');
  const nextEl = document.getElementById('sm-next-sync-countdown');

  if (ageEl && solarmanRuntime.lastCollectionTime) {
    const diffSec = Math.max(0, Math.floor(Date.now() / 1000) - solarmanRuntime.lastCollectionTime);
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    const isEn = state.lang === 'en';
    ageEl.textContent = mins > 0
      ? isEn ? `(${mins}m ${secs}s ago)` : `(hace ${mins}m ${secs}s)`
      : isEn ? `(${secs}s ago)` : `(hace ${secs}s)`;
  }

  if (nextEl && solarmanRuntime.nextCheckAtMs) {
    const remSec = Math.max(0, Math.ceil((solarmanRuntime.nextCheckAtMs - Date.now()) / 1000));
    const isEn = state.lang === 'en';
    nextEl.innerHTML = `<i class="fa-solid fa-rotate"></i> ${
      isEn ? `Next check in ${remSec}s` : `Próx. verificación en ${remSec}s`
    }`;
  }
}

function _escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
