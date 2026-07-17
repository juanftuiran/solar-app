/**
 * @module dashboardView
 * @description Main dashboard view for JF Solar Cloud.
 * Combines sidebar, header, ROI panel, AI predictions, KPI cards,
 * energy/price charts, 25-year projection, and a readings data table.
 */

import { state } from '../modules/state.js';
import { renderSidebar, initSidebar } from '../components/sidebar.js';
import { fCOP, fDec, fKwh, fPct } from '../modules/formatters.js';

/**
 * Render the complete dashboard view HTML.
 * Includes sidebar (for admins), header bar, and all dashboard panels.
 *
 * @returns {string} Dashboard HTML string
 */
export function render(contentHTML = null) {
  const user = state.user || {};
  const project = state.activeProject || {};
  const isAdmin = state.activeProjectRole === 'admin';
  const investments = state.investments || [];

  // Total investment from all phases
  const totalInvestment = investments.reduce((sum, inv) => sum + (inv.investment_cop || 0), 0);

  // Sidebar (admin only)
  const sidebarHTML = isAdmin
    ? renderSidebar(state.currentView || 'dashboard')
    : '';

  return `
    <div class="app-layout" style="display:flex;min-height:100vh;">
      ${sidebarHTML}

      <div class="main-content" id="main-content" style="flex:1;overflow-x:hidden;">
        <!-- ═══ Header ═══ -->
        <div id="dashboard" style="padding:1rem;max-width:80rem;margin:0 auto;display:flex;flex-direction:column;gap:1.5rem;padding-bottom:2.5rem;">
          ${_renderHeader(user, project, isAdmin)}

          <div id="dashboard-content-area" style="display:flex;flex-direction:column;gap:1.5rem;">
            ${contentHTML !== null ? contentHTML : `
              <!-- ═══ ROI Panel ═══ -->
              ${_renderROIPanel(totalInvestment, isAdmin)}

              <!-- ═══ AI / Predictive Panel ═══ -->
              ${_renderAIPanel()}

              <!-- ═══ KPI Grid ═══ -->
              ${_renderKPIGrid()}

              <!-- ═══ Charts Grid ═══ -->
              ${_renderChartsGrid()}

              <!-- ═══ 25-Year Projection ═══ -->
              ${_renderProjectionSection()}

              <!-- ═══ Data Table ═══ -->
              ${_renderDataTable(isAdmin)}
            `}
          </div>

          <!-- ═══ Footer ═══ -->
          <div class="app-footer">JF SOLAR CLOUD — MONITORING PLATFORM</div>
        </div>
      </div>
    </div>

    <!-- ═══ Add/Edit Record Modal ═══ -->
    ${_renderRecordModal()}
  `;
}

/**
 * Initialise dashboard event listeners.
 *
 * @param {Object} callbacks
 * @param {Function} callbacks.onYearChange - Year filter changed
 * @param {Function} callbacks.onSaveRecord - Save record form submitted
 * @param {Function} callbacks.onDeleteRecord - Delete record clicked
 * @param {Function} callbacks.onEditRecord - Edit record clicked
 * @param {Function} callbacks.onOpenNewRecord - New record button clicked
 * @param {Function} callbacks.onToggleChart - Chart type toggle clicked
 * @param {Function} callbacks.onLogout - Logout clicked
 * @param {Function} callbacks.onNavigate - Sidebar navigation
 * @param {Function} callbacks.onLangChange - Language changed
 */
export function init(callbacks) {
  const {
    onYearChange,
    onSaveRecord,
    onOpenNewRecord,
    onToggleChart,
    onLogout,
    onNavigate,
    onLangChange,
  } = callbacks || {};

  // Init Sidebar
  if (document.getElementById('sidebar-panel')) {
    initSidebar(onNavigate);
  }

  // Year filter
  const yearFilter = document.getElementById('year-filter');
  if (yearFilter && onYearChange) {
    yearFilter.addEventListener('change', () => onYearChange(yearFilter.value));
  }

  // New record button
  const newRecordBtn = document.getElementById('btn-open-new-record');
  if (newRecordBtn && onOpenNewRecord) {
    newRecordBtn.addEventListener('click', onOpenNewRecord);
  }

  // Save record form
  const recordForm = document.getElementById('add-record-form');
  if (recordForm && onSaveRecord) {
    recordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        editId: document.getElementById('edit-id')?.value || '',
        fecha: document.getElementById('new-fecha')?.value || '',
        lecturaRed: parseFloat(document.getElementById('new-lectura-red')?.value) || 0,
        lecturaSolar: parseFloat(document.getElementById('new-lectura-solar')?.value) || 0,
        precioKw: parseFloat(document.getElementById('new-precio')?.value) || 0,
      };
      onSaveRecord(data);
    });
  }

  // Close record modal
  const closeRecordBtn = document.getElementById('close-record-modal');
  if (closeRecordBtn) {
    closeRecordBtn.addEventListener('click', () => {
      document.getElementById('add-record-modal')?.classList.add('hidden');
    });
  }
  const recordModal = document.getElementById('add-record-modal');
  if (recordModal) {
    recordModal.addEventListener('click', (e) => {
      if (e.target.id === 'add-record-modal') {
        recordModal.classList.add('hidden');
      }
    });
  }

  // Chart toggle buttons
  const toggleEnergia = document.getElementById('icon-chart-energia');
  const togglePrecio = document.getElementById('icon-chart-precio');
  if (toggleEnergia && onToggleChart) {
    toggleEnergia.parentElement?.addEventListener('click', () => onToggleChart('energia'));
  }
  if (togglePrecio && onToggleChart) {
    togglePrecio.parentElement?.addEventListener('click', () => onToggleChart('precio'));
  }

  // Projection table toggle
  const projToggle = document.getElementById('projection-table-toggle');
  const projBody = document.getElementById('projection-table-body');
  if (projToggle && projBody) {
    projToggle.addEventListener('click', () => {
      projBody.classList.toggle('hidden');
      const icon = document.getElementById('projection-toggle-icon');
      if (icon) {
        icon.className = projBody.classList.contains('hidden')
          ? 'fa-solid fa-chevron-down'
          : 'fa-solid fa-chevron-up';
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById('btn-dashboard-logout');
  if (logoutBtn && onLogout) {
    logoutBtn.addEventListener('click', onLogout);
  }

  // Language dropdown toggle
  const langBtn = document.getElementById('lang-toggle-btn');
  const langMenu = document.getElementById('lang-menu');
  if (langBtn && langMenu) {
    langBtn.addEventListener('click', () => langMenu.classList.toggle('hidden'));
    document.addEventListener('click', (e) => {
      if (!langBtn.contains(e.target) && !langMenu.contains(e.target)) {
        langMenu.classList.add('hidden');
      }
    });
  }

  // Language options
  if (onLangChange) {
    document.querySelectorAll('.lang-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        onLangChange(btn.dataset.lang, btn.dataset.flag, btn.dataset.text);
        langMenu?.classList.add('hidden');
      });
    });
  }

  // Monitoring link
  const monLink = document.getElementById('btn-monitoring-link');
  if (monLink) {
    monLink.addEventListener('click', () => {
      const url = state.activeProject?.monitoring_url;
      if (url) window.open(url, '_blank');
    });
  }
}

/**
 * Render table body rows from processed data.
 *
 * @param {Array<Object>} data - Array of processed reading records
 * @param {boolean} [isAdmin=false] - Whether to show admin action buttons
 * @returns {string} HTML string for `<tbody>` content
 */
export function renderTableRows(data, isAdmin = false) {
  if (!data || data.length === 0) {
    return `
      <tr>
        <td colspan="7" style="text-align:center;padding:2rem;color:#64748b;">
          <span class="lang-es">Sin datos.</span>
          <span class="lang-en">No data.</span>
        </td>
      </tr>
    `;
  }

  return data.map(row => {
    const inc = parseFloat(row.incPrecio) || 0;
    const trendIcon = inc > 0
      ? 'fa-arrow-trend-up'
      : inc < 0 ? 'fa-arrow-trend-down' : 'fa-minus';
    const trendColor = inc > 0
      ? '#f87171'
      : inc < 0 ? '#4ade80' : '#64748b';

    const adminCol = isAdmin
      ? `
        <td style="padding:.75rem 1rem;text-align:center;">
          <button class="edit-btn" data-id="${row.id}" title="Editar" style="color:#64748b;background:none;border:none;cursor:pointer;margin-right:.5rem;">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="del-btn" data-id="${row.id}" data-fecha="${row.fecha}" title="Eliminar" style="color:#64748b;background:none;border:none;cursor:pointer;">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `
      : '';

    // Detail row content
    const detailColor = inc > 0 ? '#f87171' : inc < 0 ? '#4ade80' : '#64748b';

    return `
      <tr class="data-row" data-detail-id="det-${row.id}" style="cursor:pointer;">
        <td style="padding:.75rem 1rem;">
          <p style="font-weight:700;color:#0ea5e9;">${row.label}</p>
          <p style="font-size:.75rem;color:#64748b;">${row.fecha}</p>
        </td>
        <td style="padding:.75rem 1rem;text-align:center;font-size:.75rem;color:#64748b;">
          ${(row.lecturaRed || 0).toFixed(0)} <span style="opacity:.3;">|</span> ${(row.lecturaSolar || 0).toFixed(0)}
        </td>
        <td style="padding:.75rem 1rem;text-align:center;font-weight:700;">
          ${fDec(row.consumoRed, 1)} <span style="font-size:.75rem;color:#64748b;">kWh</span>
        </td>
        <td style="padding:.75rem 1rem;text-align:center;font-weight:700;color:#10b981;">
          ${fDec(row.prodBruta, 1)} <span style="font-size:.75rem;color:#64748b;">kWh</span>
        </td>
        <td style="padding:.75rem 1rem;text-align:right;">
          <div>${fCOP(row.precioKw || 0)}</div>
          <div style="font-size:.75rem;color:${trendColor};">
            <i class="fa-solid ${trendIcon}" style="margin-right:.15rem;"></i>${Math.abs(inc).toFixed(1)}%
          </div>
        </td>
        <td style="padding:.75rem 1rem;text-align:right;font-weight:700;color:#10b981;">
          ${fCOP(row.ahorroReal)}
        </td>
        ${adminCol}
      </tr>

      <!-- Expandable detail row -->
      <tr id="det-${row.id}" class="hidden detail-row">
        <td colspan="7">
          <div class="detail-inner">
            <div class="detail-section">
              <p style="color:var(--accent);font-weight:700;font-size:.65rem;text-transform:uppercase;margin-bottom:.25rem;">
                <span class="lang-es">Eficiencia</span>
                <span class="lang-en">Efficiency</span>
              </p>
              <p>Total: <span style="color:#fff;">${fDec(row.consumoTotal, 1)} kWh</span></p>
              <p><span class="lang-es">Autonomía</span><span class="lang-en">Autonomy</span>: <span style="color:#a78bfa;font-weight:700;">${fDec(row.autonomia, 1)}%</span></p>
            </div>
            <div class="detail-section">
              <p style="font-weight:700;font-size:.65rem;text-transform:uppercase;margin-bottom:.25rem;">
                <span class="lang-es">Prom. Diario</span>
                <span class="lang-en">Daily Avg</span>
              </p>
              <p><span class="lang-es">Red</span><span class="lang-en">Grid</span>: <span style="color:#fff;">${fDec((row.consumoRed || 0) / 30, 1)} kWh/d</span></p>
              <p>Sol: <span style="color:var(--solar);">${fDec((row.prodBruta || 0) / 30, 1)} kWh/d</span></p>
            </div>
            <div class="detail-section">
              <p style="font-weight:700;font-size:.65rem;text-transform:uppercase;margin-bottom:.25rem;">
                <span class="lang-es">Fluctuación</span>
                <span class="lang-en">Fluctuation</span>
              </p>
              <p><span class="lang-es">Ant</span><span class="lang-en">Prev</span>: <span>${fCOP(row.prevPrecio)}</span></p>
              <p>Dif: <span style="color:${detailColor};">${(row.precioKw || 0) >= (row.prevPrecio || 0) ? '+' : ''}${fCOP((row.precioKw || 0) - (row.prevPrecio || 0))}</span></p>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   Private render helpers
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @private
 */
function _renderHeader(user, project, isAdmin) {
  const currentYear = new Date().getFullYear();

  return `
    <div class="app-header">
      <div style="display:flex;align-items:center;gap:.75rem;">
        <h2 id="project-name-header" style="font-size:1.125rem;font-weight:800;color:#e2e8f0;">
          ${_escapeHTML(project.name || 'JF Solar Cloud')}
        </h2>
        <span class="online-dot"><i class="fa-solid fa-circle"></i></span>
      </div>

      <div class="header-actions">
        <!-- User info -->
        <span style="font-size:.75rem;color:#94a3b8;">
          <i class="fa-solid fa-circle-user" style="margin-right:.25rem;"></i>
          <span id="active-user-email">${_escapeHTML(user.email || '')}</span>
        </span>
        <span
          id="user-role-badge"
          style="
            font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
            padding:.15rem .4rem;border-radius:.25rem;
            background:${isAdmin ? 'rgba(14,165,233,.15)' : 'rgba(16,185,129,.15)'};
            color:${isAdmin ? '#0ea5e9' : '#10b981'};
          "
        >
          ${isAdmin ? '<span class="lang-es">Administrador</span><span class="lang-en">Administrator</span>' : '<span class="lang-es">Observador</span><span class="lang-en">Observer</span>'}
        </span>

        <!-- Language dropdown -->
        <div class="lang-dropdown">
          <button class="lang-btn" id="lang-toggle-btn" type="button">
            <span id="current-flag"><img src="https://flagcdn.com/w20/co.png" class="flag-img" alt="flag"></span>
            <span id="current-lang-text">ES</span>
            <i class="fa-solid fa-chevron-down" style="font-size:.6rem;"></i>
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

        <!-- Year filter -->
        <select id="year-filter" class="btn btn-ghost" style="font-size:.8rem;padding:.35rem .5rem;">
          <option value="${currentYear}">${currentYear}</option>
          <option value="${currentYear - 1}">${currentYear - 1}</option>
          <option value="${currentYear - 2}">${currentYear - 2}</option>
          <option value="all">
            <span>Todo / All</span>
          </option>
        </select>

        ${isAdmin ? `
          <!-- New record button -->
          <button id="btn-open-new-record" class="btn btn-accent" style="font-size:.8rem;padding:.4rem .75rem;">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span class="lang-es">Nuevo</span>
            <span class="lang-en">New</span>
          </button>
        ` : ''}

        <!-- Monitoring link -->
        <button id="btn-monitoring-link" class="btn btn-ghost" style="font-size:.8rem;padding:.4rem .6rem;" title="Monitoring">
          <i class="fa-solid fa-chart-area"></i>
        </button>

        <!-- Logout -->
        <button id="btn-dashboard-logout" class="btn btn-ghost" style="font-size:.8rem;padding:.4rem .6rem;">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </div>
  `;
}

/**
 * @private
 */
function _renderROIPanel(totalInvestment, isAdmin) {
  return `
    <div class="roi-panel card">
      <i class="fa-solid fa-chart-pie roi-bg-icon"></i>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
        <div>
          <h3 style="font-size:.875rem;font-weight:700;color:#e2e8f0;">
            <i class="fa-solid fa-chart-pie" style="color:#0ea5e9;margin-right:.4rem;"></i>
            <span class="lang-es">Retorno de Inversión</span>
            <span class="lang-en">Return on Investment</span>
          </h3>
          <p style="font-size:.7rem;color:#64748b;margin-top:.15rem;">
            <span class="lang-es">Proyección basada en datos reales</span>
            <span class="lang-en">Projection based on real data</span>
          </p>
        </div>
        <span id="roi-status-indicator" style="font-size:.7rem;color:#64748b;"></span>
      </div>

      <!-- ROI total investment display -->
      <div style="font-size:.8rem;color:#94a3b8;margin-bottom:.75rem;">
        <span class="lang-es">Inversión total:</span>
        <span class="lang-en">Total investment:</span>
        <span id="roi-total-investment" style="font-weight:700;color:#0ea5e9;">${fCOP(totalInvestment)}</span>
      </div>



      <div class="roi-stats">
        <div class="roi-stat">
          <div class="roi-stat-label">
            <span class="lang-es">Recuperación</span>
            <span class="lang-en">Recovery</span>
          </div>
          <div class="roi-stat-val">
            <span id="roi-time">--</span> <span style="font-size:.65rem;color:#94a3b8;font-weight:400;" class="lang-es">Años aprox.</span><span style="font-size:.65rem;color:#94a3b8;font-weight:400;" class="lang-en">Years approx.</span>
          </div>
        </div>
        <div class="roi-divider"></div>
        <div class="roi-stat">
          <div class="roi-stat-label">
            <span class="lang-es">Ahorro Mensual Prom.</span>
            <span class="lang-en">Avg Monthly Savings</span>
          </div>
          <div class="roi-stat-val" id="roi-avg-savings">--</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * @private
 */
function _renderAIPanel() {
  return `
    <div class="ai-panel">
      <div class="ai-inner">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.25rem;">
          <i class="fa-solid fa-brain" style="color:#8b5cf6;"></i>
          <h3 style="font-size:.875rem;font-weight:700;color:#e2e8f0;">
            <span class="lang-es">Análisis Predictivo</span>
            <span class="lang-en">Predictive Analysis</span>
          </h3>
          <span style="font-size:.55rem;background:rgba(139,92,246,.2);color:#a78bfa;padding:.1rem .35rem;border-radius:.2rem;font-weight:700;text-transform:uppercase;">
            AI
          </span>
        </div>

        <div class="ai-grid">
          <!-- Future price -->
          <div class="ai-item">
            <p style="font-size:.65rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem;">
              <span class="lang-es">Precio Futuro kW</span>
              <span class="lang-en">Future kW Price</span>
            </p>
            <p id="ai-precio-futuro" style="font-size:1.125rem;font-weight:900;color:#8b5cf6;">--</p>
          </div>

          <!-- Trend -->
          <div class="ai-item">
            <p style="font-size:.65rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem;">
              <span class="lang-es">Tendencia</span>
              <span class="lang-en">Trend</span>
            </p>
            <p id="ai-tendencia" style="font-size:1.125rem;font-weight:900;">--</p>
          </div>

          <!-- Best month -->
          <div class="ai-item">
            <p style="font-size:.65rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem;">
              <span class="lang-es">Mejor Mes</span>
              <span class="lang-en">Best Month</span>
            </p>
            <p id="ai-mejor-mes" style="font-size:.9rem;font-weight:700;color:#e2e8f0;">--</p>
          </div>
        </div>

        <!-- CO2 -->
        <div style="margin-top:1rem;padding-top:.75rem;border-top:1px solid rgba(100,116,139,.15);display:flex;align-items:center;gap:.5rem;">
          <i class="fa-solid fa-leaf" style="color:#10b981;"></i>
          <span style="font-size:.75rem;color:#94a3b8;">
            <span class="lang-es">CO₂ Evitado:</span>
            <span class="lang-en">CO₂ Avoided:</span>
          </span>
          <span id="ai-co2" style="font-size:.875rem;font-weight:700;color:#10b981;">--</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * @private
 */
function _renderKPIGrid() {
  const kpis = [
    {
      id: 'kpi-ahorro',
      icon: 'fa-piggy-bank',
      iconColor: '#10b981',
      labelEs: 'Ahorro Período',
      labelEn: 'Period Savings',
    },
    {
      id: 'kpi-produccion',
      icon: 'fa-solar-panel',
      iconColor: '#0ea5e9',
      labelEs: 'Producción Solar',
      labelEn: 'Solar Production',
    },
    {
      id: 'kpi-autonomia',
      icon: 'fa-battery-three-quarters',
      iconColor: '#8b5cf6',
      labelEs: 'Autonomía Solar',
      labelEn: 'Solar Autonomy',
    },
    {
      id: 'kpi-var-kw',
      icon: 'fa-arrow-trend-up',
      iconColor: '#f59e0b',
      labelEs: 'Var. Precio kW',
      labelEn: 'kW Price Var.',
    },
  ];

  const cards = kpis.map(kpi => `
    <div class="card kpi-card">
      <div class="kpi-label">
        <i class="fa-solid ${kpi.icon}" style="color:${kpi.iconColor};margin-right:.3rem;"></i>
        <span class="lang-es">${kpi.labelEs}</span>
        <span class="lang-en">${kpi.labelEn}</span>
      </div>
      <div class="kpi-value" id="${kpi.id}">--</div>
    </div>
  `).join('');

  return `<div class="kpi-grid">${cards}</div>`;
}

/**
 * @private
 */
function _renderChartsGrid() {
  return `
    <div class="charts-grid">
      <!-- Energy chart -->
      <div class="card chart-wrap">
        <div class="chart-header">
          <h3 style="font-size:.8rem;font-weight:700;color:#e2e8f0;">
            <i class="fa-solid fa-bolt" style="color:#f43f5e;margin-right:.3rem;"></i>
            <span class="lang-es">Energía</span>
            <span class="lang-en">Energy</span>
          </h3>
          <button class="btn btn-ghost" style="padding:.25rem .5rem;font-size:.75rem;" title="Toggle chart type">
            <i id="icon-chart-energia" class="fa-solid fa-chart-area"></i>
          </button>
        </div>
        <div class="chart-container">
          <canvas id="chart-energia"></canvas>
        </div>
      </div>

      <!-- Price chart -->
      <div class="card chart-wrap">
        <div class="chart-header">
          <h3 style="font-size:.8rem;font-weight:700;color:#e2e8f0;">
            <i class="fa-solid fa-coins" style="color:#f59e0b;margin-right:.3rem;"></i>
            <span class="lang-es">Precio kW</span>
            <span class="lang-en">kW Price</span>
          </h3>
          <button class="btn btn-ghost" style="padding:.25rem .5rem;font-size:.75rem;" title="Toggle chart type">
            <i id="icon-chart-precio" class="fa-solid fa-chart-bar"></i>
          </button>
        </div>
        <div class="chart-container">
          <canvas id="chart-precio"></canvas>
        </div>
      </div>
    </div>
  `;
}

/**
 * @private
 */
function _renderProjectionSection() {
  return `
    <div class="card" style="overflow:hidden;">
      <!-- Projection chart -->
      <div style="padding:1rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <h3 style="font-size:.8rem;font-weight:700;color:#e2e8f0;">
            <i class="fa-solid fa-chart-line" style="color:#9333ea;margin-right:.3rem;"></i>
            <span class="lang-es">Proyección 25 Años</span>
            <span class="lang-en">25-Year Projection</span>
          </h3>
        </div>
        <div style="height:300px;position:relative;">
          <canvas id="chart-proyeccion"></canvas>
        </div>
      </div>

      <!-- Collapsible projection table -->
      <div>
        <button
          id="projection-table-toggle"
          type="button"
          style="
            width:100%;display:flex;justify-content:space-between;align-items:center;
            padding:.75rem 1rem;background:rgba(30,41,59,.8);
            border:none;border-top:1px solid rgba(100,116,139,.15);
            color:#94a3b8;font-size:.75rem;cursor:pointer;
          "
        >
          <span>
            <i class="fa-solid fa-table" style="margin-right:.3rem;"></i>
            <span class="lang-es">Ver tabla detallada</span>
            <span class="lang-en">View detailed table</span>
          </span>
          <i id="projection-toggle-icon" class="fa-solid fa-chevron-down"></i>
        </button>
        <div id="projection-table-body" class="hidden">
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style="text-align:left;padding:.5rem;">
                    <span class="lang-es">Año</span><span class="lang-en">Year</span>
                  </th>
                  <th style="text-align:right;padding:.5rem;">
                    <span class="lang-es">Generación (kWh)</span><span class="lang-en">Generation (kWh)</span>
                  </th>
                  <th style="text-align:right;padding:.5rem;">
                    <span class="lang-es">Ahorro Anual</span><span class="lang-en">Annual Savings</span>
                  </th>
                  <th style="text-align:right;padding:.5rem;">
                    <span class="lang-es">Ahorro Acum.</span><span class="lang-en">Cumulated</span>
                  </th>
                </tr>
              </thead>
              <tbody id="tabla-proyeccion-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * @private
 */
function _renderDataTable(isAdmin) {
  const adminTh = isAdmin
    ? `<th><span class="lang-es">Acciones</span><span class="lang-en">Actions</span></th>`
    : '';

  return `
    <div class="card table-wrap">
      <div class="table-header">
        <h3 style="font-size:.8rem;font-weight:700;color:#e2e8f0;">
          <i class="fa-solid fa-cloud" style="color:#0ea5e9;margin-right:.3rem;"></i>
          <span class="lang-es">Registro Cloud</span>
          <span class="lang-en">Cloud Log</span>
        </h3>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                <span class="lang-es">Período</span>
                <span class="lang-en">Period</span>
              </th>
              <th style="text-align:center;">
                <span class="lang-es">Lecturas</span>
                <span class="lang-en">Readings</span>
              </th>
              <th style="text-align:center;">
                <span class="lang-es">Consumo Red</span>
                <span class="lang-en">Grid Usage</span>
              </th>
              <th style="text-align:center;">
                <span class="lang-es">Gen. Solar</span>
                <span class="lang-en">Solar Gen</span>
              </th>
              <th style="text-align:right;">
                <span class="lang-es">Precio kW</span>
                <span class="lang-en">kW Price</span>
              </th>
              <th style="text-align:right;">
                <span class="lang-es">Ahorro</span>
                <span class="lang-en">Savings</span>
              </th>
              ${adminTh}
            </tr>
          </thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * @private
 */
function _renderRecordModal() {
  return `
    <div id="add-record-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:26rem;">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
          <h2 style="font-size:1rem;font-weight:700;color:#e2e8f0;">
            <i class="fa-solid fa-cloud-arrow-up" style="color:#0ea5e9;margin-right:.4rem;"></i>
            <span class="lang-es" id="modal-title-es">Nuevo Registro Cloud</span>
            <span class="lang-en" id="modal-title-en">New Cloud Record</span>
          </h2>
          <button id="close-record-modal" type="button" style="background:none;border:none;color:#64748b;font-size:1.25rem;cursor:pointer;" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Form -->
        <form id="add-record-form" style="display:flex;flex-direction:column;gap:1rem;">
          <input type="hidden" id="edit-id" value="">

          <div class="field">
            <label for="new-fecha">
              <span class="lang-es">Fecha</span>
              <span class="lang-en">Date</span>
            </label>
            <input type="date" id="new-fecha" required>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
            <div class="field">
              <label for="new-lectura-red">
                <span class="lang-es">Lectura Red</span>
                <span class="lang-en">Grid Reading</span>
              </label>
              <input type="number" id="new-lectura-red" step="0.01" required>
            </div>
            <div class="field">
              <label for="new-lectura-solar">
                <span class="lang-es">Lectura Solar</span>
                <span class="lang-en">Solar Reading</span>
              </label>
              <input type="number" id="new-lectura-solar" step="0.01" required>
            </div>
          </div>

          <div class="field">
            <label for="new-precio">
              <span class="lang-es">Precio kW (COP)</span>
              <span class="lang-en">kW Price (COP)</span>
            </label>
            <input type="number" id="new-precio" step="0.01" required>
          </div>

          <button type="submit" id="btn-save" class="btn btn-accent" style="width:100%;margin-top:.5rem;">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span class="lang-es">Guardar</span>
            <span class="lang-en">Save</span>
          </button>
        </form>
      </div>
    </div>
  `;
}

/* ── Private helpers ──────────────────────────────────────────────────────── */

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 * @private
 */
function _escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
