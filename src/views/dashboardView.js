/**
 * @module dashboardView
 * @description Main dashboard view for JF Solar Cloud with ROI progress bar,
 * live preview in record modal, CSV export, and predictive eco-metrics.
 */

import { state } from '../modules/state.js';
import { renderSidebar, initSidebar } from '../components/sidebar.js';
import { fCOP, fDec, fKwh, fPct } from '../modules/formatters.js';
import { t } from '../modules/i18n.js';

/**
 * Render the complete dashboard view HTML.
 *
 * @param {string|null} contentHTML
 * @returns {string} Dashboard HTML string
 */
export function render(contentHTML = null) {
  const user = state.user || {};
  const project = state.activeProject || {};
  const isAdmin = state.activeProjectRole === 'admin';
  const investments = state.investments || [];

  const totalInvestment = investments.reduce((sum, inv) => sum + (parseFloat(inv.investment_cop) || 0), 0);

  const sidebarHTML = isAdmin
    ? renderSidebar(state.currentView || 'dashboard')
    : '';

  return `
    <div class="app-layout">
      ${sidebarHTML}

      <div class="main-content" id="main-content">
        <div id="dashboard" class="content-area">
          ${_renderHeader(user, project, isAdmin)}

          <div id="dashboard-content-area" style="display:flex;flex-direction:column;gap:1.5rem;">
            ${contentHTML !== null ? contentHTML : `
              <!-- ═══ ROI Panel ═══ -->
              ${_renderROIPanel(totalInvestment)}

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

          <div class="app-footer">JF SOLAR CLOUD — ENTERPRISE ENERGY PLATFORM</div>
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
    onExportCsv,
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

  // Export CSV button
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn && onExportCsv) {
    exportBtn.addEventListener('click', onExportCsv);
  }

  // Table search filter
  const tableSearch = document.getElementById('table-search-input');
  if (tableSearch) {
    tableSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#table-body tr.data-row').forEach(row => {
        const text = row.textContent.toLowerCase();
        const detailId = row.dataset.detailId;
        const isMatch = text.includes(q);
        row.style.display = isMatch ? '' : 'none';
        if (!isMatch && detailId) {
          document.getElementById(detailId)?.classList.add('hidden');
        }
      });
    });
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
        inverter_reset: document.getElementById('new-inverter-reset')?.checked || false,
      };
      onSaveRecord(data);
    });
  }

  // Live calculation preview in modal
  _bindModalLivePreview();

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
  const toggleEnergia = document.getElementById('btn-toggle-energy-chart');
  const togglePrecio = document.getElementById('btn-toggle-price-chart');
  if (toggleEnergia && onToggleChart) {
    toggleEnergia.addEventListener('click', () => onToggleChart('energia'));
  }
  if (togglePrecio && onToggleChart) {
    togglePrecio.addEventListener('click', () => onToggleChart('precio'));
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
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.toggle('hidden');
    });
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
 * Bind live calculation preview in the record modal.
 * Calculates delta kWh and estimated savings COP dynamically.
 */
function _bindModalLivePreview() {
  const redInput = document.getElementById('new-lectura-red');
  const solarInput = document.getElementById('new-lectura-solar');
  const priceInput = document.getElementById('new-precio');
  const resetCheckbox = document.getElementById('new-inverter-reset');
  const dateInput = document.getElementById('new-fecha');

  const updatePreview = () => {
    const curRed = parseFloat(redInput?.value) || 0;
    const curSolar = parseFloat(solarInput?.value) || 0;
    const curPrice = parseFloat(priceInput?.value) || 0;
    const isReset = resetCheckbox?.checked || false;

    // Find previous reading from rawData
    const rawData = state.rawData || [];
    const prev = rawData.length > 0 ? rawData[rawData.length - 1] : null;

    let calcGrid = 0;
    let calcSolar = 0;

    if (prev) {
      const prevRed = prev.lecturaRed ?? prev.medidorRed ?? 0;
      const prevSolar = prev.lecturaSolar ?? prev.inversores ?? 0;
      calcGrid = Math.max(0, curRed - prevRed);
      calcSolar = isReset ? curSolar : Math.max(0, curSolar - prevSolar);
    } else {
      calcGrid = curRed;
      calcSolar = curSolar;
    }

    const calcSavings = calcSolar * curPrice;

    const prevGridEl = document.getElementById('prev-calc-grid');
    const prevSolarEl = document.getElementById('prev-calc-solar');
    const prevSavingsEl = document.getElementById('prev-calc-savings');

    if (prevGridEl) prevGridEl.innerText = `${fDec(calcGrid, 1)} kWh`;
    if (prevSolarEl) prevSolarEl.innerText = `${fDec(calcSolar, 1)} kWh`;
    if (prevSavingsEl) prevSavingsEl.innerText = fCOP(calcSavings);
  };

  [redInput, solarInput, priceInput, resetCheckbox, dateInput].forEach(el => {
    el?.addEventListener('input', updatePreview);
    el?.addEventListener('change', updatePreview);
  });
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
        <td colspan="7" style="text-align:center;padding:3rem;color:var(--muted-light);">
          <i class="fa-solid fa-inbox" style="font-size:2rem;margin-bottom:.5rem;display:block;opacity:.3;"></i>
          <span class="lang-es">No hay registros para este período.</span>
          <span class="lang-en">No readings found for this period.</span>
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
      : inc < 0 ? '#10b981' : '#94a3b8';

    const adminCol = isAdmin
      ? `
        <td style="padding:.75rem 1rem;text-align:center;">
          <button class="edit-btn btn-ghost btn-sm" data-id="${row.id}" title="Editar" style="padding:.25rem .5rem;margin-right:.35rem;">
            <i class="fa-solid fa-pen" style="font-size:.7rem;"></i>
          </button>
          <button class="del-btn btn-danger-outline btn-sm" data-id="${row.id}" data-fecha="${row.fecha}" title="Eliminar" style="padding:.25rem .5rem;">
            <i class="fa-solid fa-trash" style="font-size:.7rem;"></i>
          </button>
        </td>
      `
      : '';

    const resetBadge = row.inverter_reset
      ? `<span class="badge-reset"><i class="fa-solid fa-rotate"></i> Reset</span>`
      : '';

    return `
      <tr class="data-row" data-row-id="${row.id}" data-detail-id="det-${row.id}">
        <td style="padding:.75rem 1rem;">
          <div style="font-weight:700;color:var(--accent);">${row.label}</div>
          <div style="font-size:.75rem;color:var(--muted-light);">${row.fecha}</div>
          ${resetBadge}
        </td>
        <td style="padding:.75rem 1rem;text-align:center;font-size:.8rem;color:var(--muted-light);">
          ${(row.lecturaRed || 0).toFixed(0)} <span style="opacity:.3;">|</span> ${(row.lecturaSolar || 0).toFixed(0)}
        </td>
        <td style="padding:.75rem 1rem;text-align:center;font-weight:700;color:#fff;">
          ${fDec(row.consumoRed, 1)} <span style="font-size:.75rem;color:var(--muted-light);font-weight:400;">kWh</span>
        </td>
        <td style="padding:.75rem 1rem;text-align:center;font-weight:700;color:var(--solar);">
          ${fDec(row.prodBruta, 1)} <span style="font-size:.75rem;color:var(--muted-light);font-weight:400;">kWh</span>
        </td>
        <td style="padding:.75rem 1rem;text-align:right;">
          <div style="font-weight:700;color:#fff;">${fCOP(row.precioKw || 0)}</div>
          <div style="font-size:.75rem;color:${trendColor};font-weight:600;">
            <i class="fa-solid ${trendIcon}" style="margin-right:.15rem;"></i>${Math.abs(inc).toFixed(1)}%
          </div>
        </td>
        <td style="padding:.75rem 1rem;text-align:right;font-weight:800;color:var(--solar);">
          ${fCOP(row.ahorroReal)}
        </td>
        ${adminCol}
      </tr>

      <!-- Expandable detail row -->
      <tr id="det-${row.id}" class="hidden detail-row">
        <td colspan="7">
          <div class="detail-inner">
            <div class="detail-section">
              <span class="detail-section-title">
                <span class="lang-es">Eficiencia Energética</span>
                <span class="lang-en">Energy Efficiency</span>
              </span>
              <div>Consumo Total: <strong style="color:#fff;">${fDec(row.consumoTotal, 1)} kWh</strong></div>
              <div>Autonomía Solar: <strong style="color:#a78bfa;">${fDec(row.autonomia, 1)}%</strong></div>
            </div>
            <div class="detail-section">
              <span class="detail-section-title">
                <span class="lang-es">Promedio Diario (30d)</span>
                <span class="lang-en">Daily Average (30d)</span>
              </span>
              <div>Red: <strong style="color:#fff;">${fDec((row.consumoRed || 0) / 30, 1)} kWh/día</strong></div>
              <div>Solar: <strong style="color:var(--solar);">${fDec((row.prodBruta || 0) / 30, 1)} kWh/día</strong></div>
            </div>
            <div class="detail-section">
              <span class="detail-section-title">
                <span class="lang-es">Impacto Económico</span>
                <span class="lang-en">Economic Impact</span>
              </span>
              <div>Tarifa Anterior: <strong style="color:#fff;">${fCOP(row.prevPrecio)}</strong></div>
              <div>Ahorro Generado: <strong style="color:var(--solar);">${fCOP(row.ahorroReal)}</strong></div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   Private Render Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function _renderHeader(user, project, isAdmin) {
  const currentYear = new Date().getFullYear();

  return `
    <header class="app-header">
      <div class="header-left">
        <div class="header-breadcrumbs">
          <a href="#" onclick="window.__navigate('projects');return false;">
            <i class="fa-solid fa-solar-panel" style="margin-right:.25rem;"></i> Proyectos
          </a>
          <i class="fa-solid fa-chevron-right" style="font-size:.6rem;opacity:.5;"></i>
          <span>${_escapeHTML(project.name || 'JF Solar Cloud')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:.6rem;margin-top:.15rem;">
          <h2 class="header-project-name">
            ${_escapeHTML(project.name || 'JF Solar Cloud')}
          </h2>
          <span class="status-pill">
            <span class="online-dot"></span>
            <span class="lang-es">En Línea</span>
            <span class="lang-en">Online</span>
          </span>
        </div>
      </div>

      <div class="header-actions">
        <!-- Language dropdown -->
        <div class="lang-dropdown">
          <button class="lang-btn" id="lang-toggle-btn" type="button">
            <span id="current-flag"><img src="https://flagcdn.com/w20/co.png" class="flag-img" alt="flag"></span>
            <span id="current-lang-text">ES</span>
            <i class="fa-solid fa-chevron-down" style="font-size:.6rem;opacity:.7;"></i>
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
        <select id="year-filter" class="btn btn-ghost" style="font-size:.8rem;padding:.4rem .65rem;">
          <option value="${currentYear}">${currentYear}</option>
          <option value="${currentYear - 1}">${currentYear - 1}</option>
          <option value="${currentYear - 2}">${currentYear - 2}</option>
          <option value="all">Todo / All</option>
        </select>

        <!-- Export CSV Button -->
        <button id="btn-export-csv" class="btn btn-ghost" title="Exportar CSV" style="font-size:.8rem;padding:.4rem .65rem;">
          <i class="fa-solid fa-file-arrow-down" style="color:var(--accent);"></i>
          <span class="lang-es">CSV</span>
          <span class="lang-en">CSV</span>
        </button>

        ${isAdmin ? `
          <!-- New record button -->
          <button id="btn-open-new-record" class="btn btn-solar" style="font-size:.8rem;padding:.4rem .85rem;">
            <i class="fa-solid fa-plus"></i>
            <span class="lang-es">Nuevo Registro</span>
            <span class="lang-en">New Record</span>
          </button>
        ` : ''}

        <!-- Monitoring link -->
        <button id="btn-monitoring-link" class="btn btn-ghost" title="URL de Monitoreo" style="padding:.4rem .65rem;">
          <i class="fa-solid fa-arrow-up-right-from-square" style="color:var(--muted-light);"></i>
        </button>

        <!-- Logout -->
        <button id="btn-dashboard-logout" class="btn btn-ghost" title="Cerrar Sesión" style="padding:.4rem .65rem;">
          <i class="fa-solid fa-right-from-bracket" style="color:var(--muted-light);"></i>
        </button>
      </div>
    </header>
  `;
}

function _renderROIPanel(totalInvestment) {
  return `
    <div class="card roi-panel">
      <i class="fa-solid fa-chart-pie roi-bg-icon"></i>

      <div class="roi-header">
        <div class="roi-title-wrap">
          <h3>
            <i class="fa-solid fa-chart-pie" style="color:var(--accent);"></i>
            <span class="lang-es">Retorno de Inversión & Amortización</span>
            <span class="lang-en">Return on Investment & Payback</span>
          </h3>
          <p>
            <span class="lang-es">Cálculo dinámico basado en generación solar real vs tarifas de red</span>
            <span class="lang-en">Dynamically calculated from real solar production vs grid tariffs</span>
          </p>
        </div>
      </div>

      <!-- Payback Progress Bar Container -->
      <div class="payback-bar-container">
        <div class="payback-bar-header">
          <span style="font-weight:700;color:var(--muted-light);text-transform:uppercase;letter-spacing:.04em;">
            <span class="lang-es">Progreso de Amortización</span>
            <span class="lang-en">Payback Progress</span>
          </span>
          <span id="roi-progress-percent" style="font-weight:900;color:var(--solar);" class="tabular-nums">0%</span>
        </div>
        <div class="payback-bar-track">
          <div id="roi-progress-bar-fill" class="payback-bar-fill" style="width:0%;"></div>
        </div>

        <div class="payback-stats-grid">
          <div class="payback-stat-col">
            <span class="payback-stat-lbl">
              <span class="lang-es">Inversión Total</span><span class="lang-en">Total Invested</span>
            </span>
            <span class="payback-stat-val text-accent" id="roi-total-investment">
              ${fCOP(totalInvestment)}
            </span>
          </div>

          <div class="payback-stat-col">
            <span class="payback-stat-lbl">
              <span class="lang-es">Ahorro Mensual Prom.</span><span class="lang-en">Avg Monthly Savings</span>
            </span>
            <span class="payback-stat-val text-solar" id="roi-avg-savings">--</span>
          </div>

          <div class="payback-stat-col">
            <span class="payback-stat-lbl">
              <span class="lang-es">Tiempo Estimado</span><span class="lang-en">Est. Payback Time</span>
            </span>
            <span class="payback-stat-val" style="color:#fff;">
              <span id="roi-time">--</span> <span style="font-size:.7rem;color:var(--muted-light);font-weight:600;">Años</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function _renderAIPanel() {
  return `
    <div class="ai-panel">
      <div class="ai-inner">
        <div class="ai-header">
          <div style="display:flex;align-items:center;gap:.5rem;">
            <i class="fa-solid fa-brain" style="color:var(--ai);font-size:1.1rem;"></i>
            <h3 style="font-size:.95rem;font-weight:800;color:#fff;">
              <span class="lang-es">Inteligencia Predictiva & Pronóstico</span>
              <span class="lang-en">Predictive Intelligence & Forecast</span>
            </h3>
          </div>
          <span class="ai-badge">AI Forecast Engine</span>
        </div>

        <div class="ai-grid">
          <!-- Future price -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Precio Proyectado kW</span>
              <span class="lang-en">Projected kW Price</span>
            </span>
            <span id="ai-precio-futuro" class="ai-item-val" style="color:var(--ai);">--</span>
          </div>

          <!-- Trend -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Tendencia Tarifaria</span>
              <span class="lang-en">Tariff Trend</span>
            </span>
            <span id="ai-tendencia" class="ai-item-val">--</span>
          </div>

          <!-- Best month -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Pico de Mayor Gen.</span>
              <span class="lang-en">Peak Gen Month</span>
            </span>
            <span id="ai-mejor-mes" class="ai-item-val" style="color:#fff;">--</span>
          </div>

          <!-- Avoided Carbon -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">CO₂ Evitado</span>
              <span class="lang-en">Avoided CO₂</span>
            </span>
            <span id="ai-co2" class="ai-item-val" style="color:var(--solar);">-- kg</span>
          </div>
        </div>

        <!-- Eco Banner -->
        <div class="eco-banner">
          <div class="eco-chips">
            <span class="eco-chip">
              <i class="fa-solid fa-tree" style="color:var(--solar);"></i>
              <span class="lang-es">Equivalente a: <strong id="eco-trees">--</strong> árboles plantados</span>
              <span class="lang-en">Equivalent to: <strong id="eco-trees-en">--</strong> trees planted</span>
            </span>
            <span class="eco-chip">
              <i class="fa-solid fa-leaf" style="color:var(--solar);"></i>
              <span class="lang-es">Energía 100% Limpia</span>
              <span class="lang-en">100% Clean Energy</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function _renderKPIGrid() {
  const kpis = [
    {
      id: 'kpi-ahorro',
      icon: 'fa-piggy-bank',
      color: 'var(--solar)',
      bg: 'var(--solar-subtle)',
      labelEs: 'Ahorro Período',
      labelEn: 'Period Savings',
      sub: 'Ahorro económico neto',
    },
    {
      id: 'kpi-produccion',
      icon: 'fa-solar-panel',
      color: 'var(--accent)',
      bg: 'var(--accent-subtle)',
      labelEs: 'Producción Solar',
      labelEn: 'Solar Production',
      sub: 'Generación total bruta',
    },
    {
      id: 'kpi-autonomia',
      icon: 'fa-battery-three-quarters',
      color: 'var(--ai)',
      bg: 'var(--ai-subtle)',
      labelEs: 'Autonomía Solar',
      labelEn: 'Solar Autonomy',
      sub: '% energía autosuficiente',
    },
    {
      id: 'kpi-var-kw',
      icon: 'fa-arrow-trend-up',
      color: 'var(--warning)',
      bg: 'var(--warning-subtle)',
      labelEs: 'Var. Tarifa Red',
      labelEn: 'Grid Tariff Var.',
      sub: 'Fluctuación intermensual',
    },
  ];

  const cards = kpis.map(kpi => `
    <div class="card kpi-card">
      <div class="kpi-header">
        <span class="kpi-label">
          <span class="lang-es">${kpi.labelEs}</span>
          <span class="lang-en">${kpi.labelEn}</span>
        </span>
        <div class="kpi-icon-wrap" style="background:${kpi.bg};color:${kpi.color};">
          <i class="fa-solid ${kpi.icon}"></i>
        </div>
      </div>
      <div class="kpi-value" id="${kpi.id}">--</div>
      <div class="kpi-subtext">
        <i class="fa-solid fa-circle-info" style="font-size:.65rem;"></i>
        <span>${kpi.sub}</span>
      </div>
    </div>
  `).join('');

  return `<div class="kpi-grid">${cards}</div>`;
}

function _renderChartsGrid() {
  return `
    <div class="charts-grid">
      <!-- Energy chart -->
      <div class="card chart-wrap">
        <div class="chart-header">
          <h3>
            <i class="fa-solid fa-bolt" style="color:var(--solar);"></i>
            <span class="lang-es">Balance Energético (Red vs Solar)</span>
            <span class="lang-en">Energy Balance (Grid vs Solar)</span>
          </h3>
          <button id="btn-toggle-energy-chart" class="btn btn-ghost btn-sm" title="Cambiar tipo de gráfico">
            <i class="fa-solid fa-chart-simple" style="margin-right:.3rem;"></i>
            <span class="lang-es">Alternar</span>
            <span class="lang-en">Toggle</span>
          </button>
        </div>
        <div class="chart-container">
          <canvas id="chart-energia"></canvas>
        </div>
      </div>

      <!-- Price chart -->
      <div class="card chart-wrap">
        <div class="chart-header">
          <h3>
            <i class="fa-solid fa-coins" style="color:var(--warning);"></i>
            <span class="lang-es">Fluctuación de Tarifa kW (COP)</span>
            <span class="lang-en">kW Tariff Fluctuation (COP)</span>
          </h3>
          <button id="btn-toggle-price-chart" class="btn btn-ghost btn-sm" title="Cambiar tipo de gráfico">
            <i class="fa-solid fa-chart-line" style="margin-right:.3rem;"></i>
            <span class="lang-es">Alternar</span>
            <span class="lang-en">Toggle</span>
          </button>
        </div>
        <div class="chart-container">
          <canvas id="chart-precio"></canvas>
        </div>
      </div>
    </div>
  `;
}

function _renderProjectionSection() {
  return `
    <div class="card" style="overflow:hidden;">
      <div style="padding:1.25rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:.5rem;">
          <h3 style="font-size:.95rem;font-weight:800;color:#fff;display:flex;align-items:center;gap:.4rem;">
            <i class="fa-solid fa-chart-line" style="color:var(--ai);"></i>
            <span class="lang-es">Proyección Financiera y Energética a 25 Años</span>
            <span class="lang-en">25-Year Financial & Energy Projection</span>
          </h3>
          <span style="font-size:.75rem;color:var(--muted-light);">
            Degradación: 0.4%/año • Inflación: 4%/año
          </span>
        </div>
        <div style="height:310px;position:relative;">
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
            padding:.85rem 1.25rem;background:rgba(19, 29, 52, 0.85);
            border:none;border-top:1px solid var(--border);
            color:var(--muted-light);font-size:.8rem;font-weight:700;cursor:pointer;
          "
        >
          <span>
            <i class="fa-solid fa-table" style="margin-right:.4rem;color:var(--accent);"></i>
            <span class="lang-es">Ver desglose detallado año por año</span>
            <span class="lang-en">View detailed year-by-year table</span>
          </span>
          <i id="projection-toggle-icon" class="fa-solid fa-chevron-down"></i>
        </button>
        <div id="projection-table-body" class="hidden">
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style="padding:.75rem 1rem;"><span class="lang-es">Año</span><span class="lang-en">Year</span></th>
                  <th style="padding:.75rem 1rem;text-align:right;"><span class="lang-es">Generación (kWh)</span><span class="lang-en">Generation</span></th>
                  <th style="padding:.75rem 1rem;text-align:right;"><span class="lang-es">Ahorro Anual</span><span class="lang-en">Annual Savings</span></th>
                  <th style="padding:.75rem 1rem;text-align:right;"><span class="lang-es">Ahorro Acumulado</span><span class="lang-en">Cumulated</span></th>
                  <th style="padding:.75rem 1rem;text-align:right;"><span class="lang-es">Inversión Total</span><span class="lang-en">Total Invested</span></th>
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

function _renderDataTable(isAdmin) {
  const adminTh = isAdmin
    ? `<th style="text-align:center;"><span class="lang-es">Acciones</span><span class="lang-en">Actions</span></th>`
    : '';

  return `
    <div class="card table-wrap">
      <div class="table-header">
        <h3>
          <i class="fa-solid fa-cloud" style="color:var(--accent);"></i>
          <span class="lang-es">Registro Histórico Cloud</span>
          <span class="lang-en">Cloud Historical Readings</span>
        </h3>

        <!-- Table search filter -->
        <div class="table-toolbar">
          <div class="search-input-wrap" style="min-width:14rem;max-width:18rem;">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              id="table-search-input"
              placeholder="Buscar período..."
              aria-label="Buscar lecturas"
              style="padding-top:.4rem;padding-bottom:.4rem;font-size:.8rem;"
            />
          </div>
        </div>
      </div>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th><span class="lang-es">Período</span><span class="lang-en">Period</span></th>
              <th style="text-align:center;"><span class="lang-es">Lecturas Red / Solar</span><span class="lang-en">Readings Grid / Solar</span></th>
              <th style="text-align:center;"><span class="lang-es">Consumo Red</span><span class="lang-en">Grid Usage</span></th>
              <th style="text-align:center;"><span class="lang-es">Gen. Solar</span><span class="lang-en">Solar Gen</span></th>
              <th style="text-align:right;"><span class="lang-es">Tarifa kW</span><span class="lang-en">kW Tariff</span></th>
              <th style="text-align:right;"><span class="lang-es">Ahorro</span><span class="lang-en">Savings</span></th>
              ${adminTh}
            </tr>
          </thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    </div>
  `;
}

function _renderRecordModal() {
  return `
    <div id="add-record-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:28rem;">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">
            <i class="fa-solid fa-cloud-arrow-up" style="color:var(--accent);"></i>
            <span class="lang-es" id="modal-title-es">Nuevo Registro Cloud</span>
            <span class="lang-en" id="modal-title-en">New Cloud Record</span>
          </h2>
          <button id="close-record-modal" class="modal-close-btn" type="button" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Form -->
        <form id="add-record-form" style="display:flex;flex-direction:column;gap:1rem;">
          <input type="hidden" id="edit-id" value="">

          <div class="field">
            <label for="new-fecha">
              <i class="fa-solid fa-calendar-day" style="color:var(--accent);"></i>
              <span class="lang-es">Fecha de Lectura</span>
              <span class="lang-en">Reading Date</span>
            </label>
            <input type="date" id="new-fecha" required>
          </div>

          <div class="field-row">
            <div class="field">
              <label for="new-lectura-red">
                <i class="fa-solid fa-gauge" style="color:#f43f5e;"></i>
                <span class="lang-es">Lectura Red (Medidor)</span>
                <span class="lang-en">Grid Reading</span>
              </label>
              <input type="number" id="new-lectura-red" step="0.01" placeholder="Ej: 14500" required>
            </div>
            <div class="field">
              <label for="new-lectura-solar">
                <i class="fa-solid fa-solar-panel" style="color:var(--solar);"></i>
                <span class="lang-es">Lectura Solar (Inversor)</span>
                <span class="lang-en">Solar Reading</span>
              </label>
              <input type="number" id="new-lectura-solar" step="0.01" placeholder="Ej: 8200" required>
            </div>
          </div>

          <div class="field">
            <label for="new-precio">
              <i class="fa-solid fa-coins" style="color:var(--warning);"></i>
              <span class="lang-es">Precio por kW (COP)</span>
              <span class="lang-en">Price per kW (COP)</span>
            </label>
            <input type="number" id="new-precio" step="0.01" placeholder="Ej: 950.50" required>
          </div>

          <!-- Inverter Reset Checkbox -->
          <div style="background:rgba(245,158,11,0.06);padding:.875rem;border-radius:var(--radius-sm);border:1px solid rgba(245,158,11,0.2);">
            <label style="display:flex;align-items:flex-start;gap:.75rem;cursor:pointer;">
              <input type="checkbox" id="new-inverter-reset" style="margin-top:.25rem;width:1.1rem;height:1.1rem;accent-color:var(--warning);">
              <div style="display:flex;flex-direction:column;gap:.2rem;">
                <span style="font-weight:700;color:#fff;font-size:.85rem;">
                  <span class="lang-es">Reinicio de inversor (Nuevo equipo)</span>
                  <span class="lang-en">Inverter reset (New equipment)</span>
                </span>
                <span style="font-size:.75rem;color:var(--muted-light);line-height:1.4;">
                  <span class="lang-es">Marca si cambiaste el inversor y la lectura reinició desde 0.</span>
                  <span class="lang-en">Check if the inverter was replaced and reading started from 0.</span>
                </span>
              </div>
            </label>
          </div>

          <!-- Real-Time Calculation Preview -->
          <div class="live-calc-card">
            <div class="live-calc-header">
              <span><i class="fa-solid fa-bolt" style="margin-right:.3rem;"></i> Cálculo en tiempo real</span>
              <span style="font-size:.65rem;opacity:.7;">Vista previa</span>
            </div>
            <div class="live-calc-grid">
              <div class="live-calc-item">
                <span class="lbl">Consumo Red:</span>
                <span class="val" id="prev-calc-grid">0.0 kWh</span>
              </div>
              <div class="live-calc-item">
                <span class="lbl">Gen. Solar:</span>
                <span class="val text-solar" id="prev-calc-solar">0.0 kWh</span>
              </div>
              <div class="live-calc-item">
                <span class="lbl">Ahorro Est.:</span>
                <span class="val text-accent" id="prev-calc-savings">$0</span>
              </div>
            </div>
          </div>

          <button type="submit" id="btn-save" class="btn btn-solar btn-lg" style="width:100%;margin-top:.5rem;">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span class="lang-es">Guardar en la Nube</span>
            <span class="lang-en">Save to Cloud</span>
          </button>
        </form>
      </div>
    </div>
  `;
}

function _escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
