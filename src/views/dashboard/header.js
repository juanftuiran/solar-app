/**
 * @module dashboard/header
 * @description Top application header with breadcrumbs, badges, theme/kiosk toggles, year filter & actions.
 */

import { state } from "../../modules/state.js";
import { fDec } from "../../modules/formatters.js";
import { getAvailableYears } from "../../modules/analytics.js";
import { escapeHTML } from "../../modules/utils.js";

export function renderHeader(user, project, isAdmin) {
  return _renderHeader(user, project, isAdmin);
}

function _renderHeader(user, project, isAdmin) {
  const capacityStr = project.capacity_kw ? `${fDec(project.capacity_kw, 1)} kWp` : '';
  const availableYears = getAvailableYears(state.processedData, state.rawData);
  const selectedYear = String(state.selectedYear || 'all');

  const yearOptionsHTML = [
    `<option value="all" ${selectedYear === 'all' ? 'selected' : ''}>${state.lang === 'en' ? 'All Years' : 'Todos los Años'}</option>`,
    ...availableYears.map(y => `<option value="${y}" ${selectedYear === String(y) ? 'selected' : ''}>${y}</option>`),
  ].join('');

  const isEn = state.lang === 'en';
  const flagCode = isEn ? 'us' : 'co';
  const langLabel = isEn ? 'EN' : 'ES';
  const isLight = state.theme === 'light';

  return `
    <header class="app-header">
      <div class="header-left">
        <div class="header-breadcrumbs">
          <a href="#" onclick="window.__navigate('projects');return false;">
            <i class="fa-solid fa-solar-panel" style="margin-right:.2rem;"></i>
            <span class="lang-es">Portafolio</span><span class="lang-en">Portfolio</span>
          </a>
          <span class="sep"><i class="fa-solid fa-chevron-right"></i></span>
          <span class="current">${escapeHTML(project.name || 'JF Solar Cloud')}</span>
        </div>
        <div class="header-title-row">
          <h2 class="header-project-name" title="${escapeHTML(project.name || 'JF Solar Cloud')}">
            ${escapeHTML(project.name || 'JF Solar Cloud')}
          </h2>
          <span class="status-pill">
            <span class="online-dot"></span>
            <span class="lang-es">En Línea</span>
            <span class="lang-en">Online</span>
          </span>
          ${capacityStr ? `
            <span class="meta-chip accent" title="Capacidad Nominal">
              <i class="fa-solid fa-bolt"></i> ${capacityStr}
            </span>
          ` : ''}
          ${project.inverter_model ? `
            <span class="meta-chip warning hide-sm" title="Modelo de Inversor">
              <i class="fa-solid fa-microchip"></i> ${escapeHTML(project.inverter_model)}
            </span>
          ` : ''}
        </div>
      </div>

      <div class="header-actions">
        <!-- Theme Toggle (Dark Obsidian / Daylight) -->
        <button
          id="btn-theme-toggle"
          class="btn btn-ghost btn-icon"
          type="button"
          title="${isLight ? 'Cambiar a Tema Oscuro / Dark Theme' : 'Cambiar a Tema Claro / Daylight Theme'}"
          aria-label="Cambiar tema"
        >
          <i class="fa-solid ${isLight ? 'fa-moon text-accent' : 'fa-sun text-warning'}"></i>
        </button>

        <!-- Presentation / Kiosk Mode -->
        <button
          id="btn-kiosk-mode"
          class="btn btn-ghost btn-icon hide-sm"
          type="button"
          title="Modo Presentación / TV Kiosk"
          aria-label="Modo Presentación"
        >
          <i class="fa-solid fa-tv text-ai"></i>
        </button>

        <!-- Language dropdown -->
        <div class="lang-dropdown">
          <button class="lang-btn" id="lang-toggle-btn" type="button" aria-label="Cambiar idioma">
            <span id="current-flag"><img src="https://flagcdn.com/w20/${flagCode}.png" class="flag-img" alt="flag"></span>
            <span id="current-lang-text">${langLabel}</span>
            <i class="fa-solid fa-chevron-down" style="font-size:.55rem;opacity:.7;"></i>
          </button>
          <div class="lang-menu hidden" id="lang-menu">
            <button class="lang-option lang-option-btn" data-lang="es" data-flag="co" data-text="ES" type="button">
              <img src="https://flagcdn.com/w20/co.png" class="flag-img" alt="CO"> Español
            </button>
            <button class="lang-option lang-option-btn" data-lang="en" data-flag="us" data-text="EN" type="button">
              <img src="https://flagcdn.com/w20/us.png" class="flag-img" alt="US"> English
            </button>
          </div>
        </div>

        <!-- Dynamic Year filter -->
        <select id="year-filter" class="select-pill" aria-label="Filtrar por año">
          ${yearOptionsHTML}
        </select>

        <!-- Executive Report (PDF / Print) -->
        <button id="btn-exec-report" class="btn btn-ghost" type="button" title="Generar Reporte Ejecutivo PDF">
          <i class="fa-solid fa-file-pdf text-danger"></i>
          <span class="hide-sm"><span class="lang-es">Reporte</span><span class="lang-en">Report</span></span>
        </button>

        <!-- Export CSV Button -->
        <button id="btn-export-csv" class="btn btn-ghost" type="button" title="Exportar CSV">
          <i class="fa-solid fa-file-arrow-down text-accent"></i>
          <span>CSV</span>
        </button>

        ${isAdmin ? `
          <!-- New record button -->
          <button id="btn-open-new-record" class="btn btn-solar" type="button">
            <i class="fa-solid fa-plus"></i>
            <span class="lang-es">Nuevo Registro</span>
            <span class="lang-en">New Record</span>
          </button>
        ` : ''}

        <div class="header-divider"></div>

        <!-- Solarman Live Quick Access / Back to Dashboard -->
        ${state.currentView === 'solarman' ? `
          <button class="btn btn-ghost" type="button" onclick="window.__navigate('dashboard')" title="Volver al Dashboard">
            <i class="fa-solid fa-chart-line text-accent"></i>
            <span class="hide-sm"><span class="lang-es">Dashboard</span><span class="lang-en">Dashboard</span></span>
          </button>
        ` : `
          <button class="btn btn-ghost" type="button" onclick="window.__navigate('solarman')" title="Abrir Monitor Solarman En Vivo">
            <i class="fa-solid fa-satellite-dish text-solar"></i>
            <span class="hide-sm"><span class="lang-es">Solarman Live</span><span class="lang-en">Solarman Live</span></span>
          </button>
        `}

        <!-- Monitoring link -->
        <button id="btn-monitoring-link" class="btn btn-ghost btn-icon" type="button" title="URL de Monitoreo">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </button>

        <!-- Logout -->
        <button id="btn-dashboard-logout" class="btn btn-ghost btn-icon" type="button" title="Cerrar Sesión">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </header>
  `;
}
