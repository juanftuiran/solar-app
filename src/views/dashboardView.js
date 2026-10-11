/**
 * @module dashboardView
 * @description Modern enterprise dashboard view for JF Solar Cloud with ROI progress bar,
 * segmented dynamic chart controls, econometric tariff forecasting, and CSV export.
 */

import { state } from '../modules/state.js';
import { renderSidebar, initSidebar } from '../components/sidebar.js';
import { fCOP, fDec, fKwh, fPct, fYield, fHsp, fDailyRate } from '../modules/formatters.js';
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

  const activeTab = state.activeTab || 'telemetry';

  return `
    <div class="app-layout ${isAdmin ? 'has-sidebar' : ''}">
      ${sidebarHTML}

      <div class="main-content" id="main-content">
        <div id="dashboard" class="content-area">
          ${_renderHeader(user, project, isAdmin)}

          <div id="dashboard-content-area" style="display:flex;flex-direction:column;gap:1.25rem;">
            ${contentHTML !== null ? contentHTML : `
              <!-- ═══ Context Navigation Tabs ═══ -->
              <div class="dashboard-tabs" id="dashboard-tab-bar">
                <button class="tab-btn ${activeTab === 'telemetry' ? 'active' : ''}" data-tab="telemetry" type="button">
                  <i class="fa-solid fa-solar-panel"></i>
                  <span class="lang-es">Telemetría & Balance</span>
                  <span class="lang-en">Telemetry & Balance</span>
                </button>
                <button class="tab-btn ${activeTab === 'finance' ? 'active' : ''}" data-tab="finance" type="button">
                  <i class="fa-solid fa-chart-pie"></i>
                  <span class="lang-es">Finanzas & Retorno</span>
                  <span class="lang-en">Finance & ROI</span>
                </button>
                <button class="tab-btn ${activeTab === 'audit' ? 'active' : ''}" data-tab="audit" type="button">
                  <i class="fa-solid fa-cloud"></i>
                  <span class="lang-es">Historial Cloud</span>
                  <span class="lang-en">Cloud Log</span>
                </button>
              </div>

              <!-- ═══ Tab 1: Telemetría & Operación ═══ -->
              <div class="tab-pane ${activeTab === 'telemetry' ? 'active' : ''}" id="pane-telemetry">
                <!-- Solar Health & Telemetry Strip -->
                ${_renderSolarHealthBanner()}

                <!-- KPI Grid with sparklines -->
                ${_renderKPIGrid()}

                <!-- Charts Grid (Energy Balance + Donut Mix + HSP Performance + kW Price) -->
                ${_renderChartsGrid()}
              </div>

              <!-- ═══ Tab 2: Finanzas & Retorno ═══ -->
              <div class="tab-pane ${activeTab === 'finance' ? 'active' : ''}" id="pane-finance">
                <!-- ROI Panel with Ring & Payback Chart -->
                ${_renderROIPanel(totalInvestment)}

                <!-- AI / Predictive Panel -->
                ${_renderAIPanel()}

                <!-- 25-Year Projection -->
                ${_renderProjectionSection()}
              </div>

              <!-- ═══ Tab 3: Historial Cloud & Auditoría ═══ -->
              <div class="tab-pane ${activeTab === 'audit' ? 'active' : ''}" id="pane-audit">
                <!-- Data Table -->
                ${_renderDataTable(isAdmin)}
              </div>
            `}
          </div>

          <div class="app-footer">
            <i class="fa-solid fa-leaf" style="color:var(--solar);"></i>
            <span>JF SOLAR CLOUD · ENTERPRISE CLEAN ENERGY PLATFORM</span>
          </div>
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
    onToggleChartMode,
    onLogout,
    onNavigate,
    onLangChange,
    onExportCsv,
    onTabChange,
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

  // Context Tab switching
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabKey = btn.dataset.tab;
      state.activeTab = tabKey;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${tabKey}`));
      if (typeof onTabChange === 'function') {
        onTabChange(tabKey);
      }
      setTimeout(() => {
        Object.values(state.charts).forEach(c => c?.resize?.());
      }, 50);
    });
  });

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
        meter_reset: document.getElementById('new-meter-reset')?.checked || false,
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

  // Segmented Chart Toggle buttons
  document.querySelectorAll('.segmented-btn[data-chart-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const chartKey = btn.dataset.chartKey;
      const mode = btn.dataset.mode;
      if (onToggleChartMode) {
        onToggleChartMode(chartKey, mode);
      }
    });
  });

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

function _bindModalLivePreview() {
  const redInput = document.getElementById('new-lectura-red');
  const solarInput = document.getElementById('new-lectura-solar');
  const priceInput = document.getElementById('new-precio');
  const inverterResetCheckbox = document.getElementById('new-inverter-reset');
  const meterResetCheckbox = document.getElementById('new-meter-reset');
  const dateInput = document.getElementById('new-fecha');
  const alertBox = document.getElementById('modal-reading-alert');

  const updatePreview = () => {
    const curRed = parseFloat(redInput?.value) || 0;
    const curSolar = parseFloat(solarInput?.value) || 0;
    const curPrice = parseFloat(priceInput?.value) || 0;
    const isInverterReset = inverterResetCheckbox?.checked || false;
    const isMeterReset = meterResetCheckbox?.checked || false;

    const rawData = state.rawData || [];
    const prev = rawData.length > 0 ? rawData[rawData.length - 1] : null;

    let calcGrid = 0;
    let calcSolar = 0;
    const warnings = [];

    if (prev) {
      const prevRed = prev.lecturaRed ?? prev.medidorRed ?? 0;
      const prevSolar = prev.lecturaSolar ?? prev.inversores ?? 0;

      if (curRed < prevRed && !isMeterReset && curRed > 0) {
        warnings.push(`Lectura de red (${curRed}) menor que la anterior (${prevRed}). Si el medidor fue cambiado por el operador, marca "Reinicio de Medidor de Red".`);
      }
      if (curSolar < prevSolar && !isInverterReset && curSolar > 0) {
        warnings.push(`Lectura solar (${curSolar}) menor que la anterior (${prevSolar}). Si el inversor fue cambiado, marca "Reinicio de Inversor".`);
      }

      calcGrid = isMeterReset ? curRed : Math.max(0, curRed - prevRed);
      calcSolar = isInverterReset ? curSolar : Math.max(0, curSolar - prevSolar);
    } else {
      calcGrid = curRed;
      calcSolar = curSolar;
    }

    const calcSavings = calcSolar * curPrice;
    const capacity = parseFloat(state.activeProject?.capacity_kw) || 0;
    const calcYield = capacity > 0 ? calcSolar / capacity : 0;
    const calcHsp = capacity > 0 ? calcSolar / (capacity * 30) : 0;

    const prevGridEl = document.getElementById('prev-calc-grid');
    const prevSolarEl = document.getElementById('prev-calc-solar');
    const prevSavingsEl = document.getElementById('prev-calc-savings');
    const prevYieldEl = document.getElementById('prev-calc-yield');

    if (prevGridEl) prevGridEl.innerText = `${fDec(calcGrid, 1)} kWh`;
    if (prevSolarEl) prevSolarEl.innerText = `${fDec(calcSolar, 1)} kWh`;
    if (prevSavingsEl) prevSavingsEl.innerText = fCOP(calcSavings);
    if (prevYieldEl) prevYieldEl.innerText = `${fDec(calcYield, 1)} kWh/kWp (${fDec(calcHsp, 2)} HSP)`;

    if (alertBox) {
      if (warnings.length > 0) {
        alertBox.classList.remove('hidden');
        alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size:1rem;color:var(--warning);"></i> <span>${warnings.join('<br>')}</span>`;
      } else {
        alertBox.classList.add('hidden');
      }
    }
  };

  [redInput, solarInput, priceInput, inverterResetCheckbox, meterResetCheckbox, dateInput].forEach(el => {
    el?.addEventListener('input', updatePreview);
    el?.addEventListener('change', updatePreview);
  });
}

export function renderTableRows(data, isAdmin = false) {
  if (!data || data.length === 0) {
    return `
      <tr>
        <td colspan="${isAdmin ? 8 : 7}" style="text-align:center;padding:3rem 1.5rem;color:var(--muted-light);">
          <div class="empty-state" style="padding:1.5rem 0;">
            <i class="fa-solid fa-inbox" style="margin-bottom:.5rem;"></i>
            <h3><span class="lang-es">No hay registros</span><span class="lang-en">No readings found</span></h3>
            <p><span class="lang-es">No encontramos lecturas para este período o búsqueda.</span><span class="lang-en">No records match the current filter or search query.</span></p>
          </div>
        </td>
      </tr>
    `;
  }

  return data.map(row => {
    const inc = parseFloat(row.incPrecio) || 0;
    const trendIcon = inc > 0
      ? 'fa-arrow-trend-up'
      : inc < 0 ? 'fa-arrow-trend-down' : 'fa-minus';
    const trendClass = inc > 0 ? 'down' : inc < 0 ? 'up' : '';

    const adminCol = isAdmin
      ? `
        <td style="text-align:center;">
          <div class="cell-actions">
            <button class="edit-btn btn btn-ghost btn-xs btn-icon" data-id="${row.id}" title="Editar">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="del-btn btn btn-danger-outline btn-xs btn-icon" data-id="${row.id}" data-fecha="${row.fecha}" title="Eliminar">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `
      : '';

    const resetBadges = [];
    if (row.inverter_reset) {
      resetBadges.push(`<span class="badge-reset"><i class="fa-solid fa-rotate"></i> Inversor</span>`);
    }
    if (row.meter_reset) {
      resetBadges.push(`<span class="badge-reset grid"><i class="fa-solid fa-rotate"></i> Red</span>`);
    }

    const yieldStr = (row.specificYield && row.specificYield > 0)
      ? `${fDec(row.specificYield, 1)} <span class="unit">kWh/kWp</span>`
      : '—';

    const hspPill = (row.hsp && row.hsp > 0)
      ? `<span class="health-pill ${row.healthScore || 'optimo'}" style="font-size:.65rem;padding:.12rem .45rem;margin-top:.2rem;">${fDec(row.hsp, 2)} HSP</span>`
      : '';

    return `
      <tr class="data-row" data-row-id="${row.id}" data-detail-id="det-${row.id}">
        <td>
          <div class="cell-period">
            <div class="row-chevron"><i class="fa-solid fa-chevron-right"></i></div>
            <div>
              <div class="cell-primary text-accent">${row.label}</div>
              <div class="cell-sub">${row.fecha}</div>
              ${resetBadges.length > 0 ? `<div class="badges-inline">${resetBadges.join('')}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="text-align:center;color:var(--muted-light);font-size:.8rem;">
          <span style="color:var(--text);font-weight:600;">${(row.lecturaRed || 0).toFixed(0)}</span>
          <span style="opacity:.3;margin:0 .25rem;">/</span>
          <span style="color:var(--solar);font-weight:600;">${(row.lecturaSolar || 0).toFixed(0)}</span>
          <div class="cell-sub">Red / Solar</div>
        </td>
        <td style="text-align:center;">
          <div class="cell-primary">${fDec(row.consumoRed, 1)} <span class="unit">kWh</span></div>
          <div class="cell-sub">${fDec(row.consumoDiario || 0, 1)} kWh/d</div>
        </td>
        <td style="text-align:center;">
          <div class="cell-primary text-solar">${fDec(row.prodBruta, 1)} <span class="unit">kWh</span></div>
          <div class="cell-sub">${fDec(row.prodDiaria || 0, 1)} kWh/d</div>
        </td>
        <td style="text-align:center;">
          <div class="cell-primary text-accent">${yieldStr}</div>
          ${hspPill}
        </td>
        <td class="text-right">
          <div class="cell-primary">${fCOP(row.precioKw || 0)}</div>
          <div style="margin-top:.15rem;">
            <span class="delta ${trendClass}">
              <i class="fa-solid ${trendIcon}"></i> ${Math.abs(inc).toFixed(1)}%
            </span>
          </div>
        </td>
        <td class="text-right">
          <div class="cell-primary text-solar font-black">${fCOP(row.ahorroReal)}</div>
          <div class="cell-sub text-solar">${fDec(row.autonomia, 0)}% solar</div>
        </td>
        ${adminCol}
      </tr>

      <!-- Expandable detail row -->
      <tr id="det-${row.id}" class="hidden detail-row">
        <td colspan="${isAdmin ? 8 : 7}">
          <div class="detail-inner">
            <div class="detail-section">
              <span class="detail-section-title">
                <span class="lang-es">Eficiencia Fotovoltaica</span>
                <span class="lang-en">PV Efficiency</span>
              </span>
              <div class="kv"><span>Consumo Total:</span><strong>${fDec(row.consumoTotal, 1)} kWh</strong></div>
              <div class="kv"><span>Autonomía Solar:</span><strong class="text-ai">${fDec(row.autonomia, 1)}%</strong></div>
              <div class="kv"><span>Rendimiento Yf:</span><strong class="text-accent">${fDec(row.specificYield || 0, 1)} kWh/kWp</strong></div>
            </div>
            <div class="detail-section">
              <span class="detail-section-title">
                <span class="lang-es">Desglose Diario (${row.daysInPeriod || 30} días)</span>
                <span class="lang-en">Daily Breakdown (${row.daysInPeriod || 30} days)</span>
              </span>
              <div class="kv"><span>Red eléctrica:</span><strong>${fDec(row.consumoDiario || 0, 1)} kWh/d</strong></div>
              <div class="kv"><span>Generación solar:</span><strong class="text-solar">${fDec(row.prodDiaria || 0, 1)} kWh/d</strong></div>
              <div class="kv"><span>Horas Sol Pico:</span><strong class="text-warning">${fDec(row.hsp || 0, 2)} HSP</strong></div>
            </div>
            <div class="detail-section">
              <span class="detail-section-title">
                <span class="lang-es">Impacto Económico & Ecológico</span>
                <span class="lang-en">Economic & Eco Impact</span>
              </span>
              <div class="kv"><span>Tarifa Anterior:</span><strong>${fCOP(row.prevPrice || 0)}</strong></div>
              <div class="kv"><span>Ahorro Generado:</span><strong class="text-solar">${fCOP(row.ahorroReal)}</strong></div>
              <div class="kv"><span>CO₂ Mitigado:</span><strong class="text-solar">${fDec((row.prodBruta || 0) * 0.38, 1)} kg</strong></div>
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

function _renderSolarHealthBanner() {
  return `
    <div class="solar-health-banner" id="solar-health-banner">
      <div class="solar-metric-item">
        <div class="solar-metric-icon" style="background:var(--solar-subtle);color:var(--solar);">
          <i class="fa-solid fa-heart-pulse"></i>
        </div>
        <div class="solar-metric-info">
          <span class="solar-metric-lbl">
            <span class="lang-es">Salud Operativa</span><span class="lang-en">Plant Health</span>
          </span>
          <div style="display:flex;align-items:center;gap:.4rem;margin-top:.15rem;">
            <span class="health-pill optimo" id="sh-health-pill">
              <span class="health-pulse-dot"></span>
              <span id="sh-health-text">Óptimo</span>
            </span>
          </div>
        </div>
      </div>

      <div class="solar-metric-item">
        <div class="solar-metric-icon" style="background:var(--accent-subtle);color:var(--accent);">
          <i class="fa-solid fa-bolt-lightning"></i>
        </div>
        <div class="solar-metric-info">
          <span class="solar-metric-lbl">
            <span class="lang-es">Rendimiento ($Y_f$)</span><span class="lang-en">Specific Yield</span>
          </span>
          <span class="solar-metric-val text-accent" id="sh-specific-yield">--</span>
        </div>
      </div>

      <div class="solar-metric-item">
        <div class="solar-metric-icon" style="background:var(--warning-subtle);color:var(--warning);">
          <i class="fa-solid fa-sun"></i>
        </div>
        <div class="solar-metric-info">
          <span class="solar-metric-lbl">
            <span class="lang-es">Horas Sol Pico (HSP)</span><span class="lang-en">Peak Sun Hours</span>
          </span>
          <span class="solar-metric-val text-warning" id="sh-avg-hsp">--</span>
        </div>
      </div>

      <div class="solar-metric-item">
        <div class="solar-metric-icon" style="background:var(--ai-subtle);color:var(--ai);">
          <i class="fa-solid fa-calendar-day"></i>
        </div>
        <div class="solar-metric-info">
          <span class="solar-metric-lbl">
            <span class="lang-es">Gen. Media Diaria</span><span class="lang-en">Daily Gen Rate</span>
          </span>
          <span class="solar-metric-val text-ai" id="sh-daily-gen">--</span>
        </div>
      </div>
    </div>
  `;
}

function _renderHeader(user, project, isAdmin) {
  const currentYear = new Date().getFullYear();
  const capacityStr = project.capacity_kw ? `${fDec(project.capacity_kw, 1)} kWp` : '';

  return `
    <header class="app-header">
      <div class="header-left">
        <div class="header-breadcrumbs">
          <a href="#" onclick="window.__navigate('projects');return false;">
            <i class="fa-solid fa-solar-panel" style="margin-right:.2rem;"></i> Proyectos
          </a>
          <span class="sep"><i class="fa-solid fa-chevron-right"></i></span>
          <span class="current">${_escapeHTML(project.name || 'JF Solar Cloud')}</span>
        </div>
        <div class="header-title-row">
          <h2 class="header-project-name" title="${_escapeHTML(project.name || 'JF Solar Cloud')}">
            ${_escapeHTML(project.name || 'JF Solar Cloud')}
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
              <i class="fa-solid fa-microchip"></i> ${_escapeHTML(project.inverter_model)}
            </span>
          ` : ''}
        </div>
      </div>

      <div class="header-actions">
        <!-- Language dropdown -->
        <div class="lang-dropdown">
          <button class="lang-btn" id="lang-toggle-btn" type="button" aria-label="Cambiar idioma">
            <span id="current-flag"><img src="https://flagcdn.com/w20/co.png" class="flag-img" alt="flag"></span>
            <span id="current-lang-text">ES</span>
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

        <!-- Year filter -->
        <select id="year-filter" class="select-pill" aria-label="Filtrar por año">
          <option value="${currentYear}">${currentYear}</option>
          <option value="${currentYear - 1}">${currentYear - 1}</option>
          <option value="${currentYear - 2}">${currentYear - 2}</option>
          <option value="all">Todo / All</option>
        </select>

        <!-- Export CSV Button -->
        <button id="btn-export-csv" class="btn btn-ghost" title="Exportar CSV">
          <i class="fa-solid fa-file-arrow-down text-accent"></i>
          <span>CSV</span>
        </button>

        ${isAdmin ? `
          <!-- New record button -->
          <button id="btn-open-new-record" class="btn btn-solar">
            <i class="fa-solid fa-plus"></i>
            <span class="lang-es">Nuevo Registro</span>
            <span class="lang-en">New Record</span>
          </button>
        ` : ''}

        <div class="header-divider"></div>

        <!-- Monitoring link -->
        <button id="btn-monitoring-link" class="btn btn-ghost btn-icon" title="URL de Monitoreo">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </button>

        <!-- Logout -->
        <button id="btn-dashboard-logout" class="btn btn-ghost btn-icon" title="Cerrar Sesión">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </header>
  `;
}

function _renderROIPanel(totalInvestment) {
  return `
    <div class="card roi-panel">
      <div class="section-head" style="margin-bottom:1.25rem;">
        <div class="section-head-title">
          <div class="icon-tile accent"><i class="fa-solid fa-chart-pie"></i></div>
          <div>
            <h3>
              <span class="lang-es">Retorno de Inversión & Amortización</span>
              <span class="lang-en">Return on Investment & Payback</span>
            </h3>
            <p>
              <span class="lang-es">Cálculo dinámico basado en generación solar real vs tarifas de red</span>
              <span class="lang-en">Dynamically calculated from real solar production vs grid tariffs</span>
            </p>
          </div>
        </div>
        <span class="meta-chip accent">
          <i class="fa-solid fa-shield-check"></i>
          <span class="lang-es">Amortización Activa</span>
          <span class="lang-en">Active Payback</span>
        </span>
      </div>

      <div class="roi-body">
        <!-- Radial Gauge Indicator -->
        <div class="roi-ring" id="roi-ring" style="--p: 0;">
          <div class="roi-ring-inner">
            <span class="roi-ring-value" id="roi-ring-value">0%</span>
            <span class="roi-ring-label">
              <span class="lang-es">Amortizado</span>
              <span class="lang-en">Amortized</span>
            </span>
          </div>
        </div>

        <!-- Payback Progress Bar Container -->
        <div class="payback-bar-container">
          <div class="payback-bar-header">
            <span class="lbl">
              <span class="lang-es">Progreso de Amortización</span>
              <span class="lang-en">Payback Progress</span>
            </span>
            <span id="roi-progress-percent" style="font-weight:800;color:var(--solar);" class="tabular-nums">0%</span>
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
              <span class="payback-stat-val text-strong">
                <span id="roi-time">--</span> <span style="font-size:.7rem;color:var(--muted-light);font-weight:600;">Años</span>
              </span>
            </div>

            <div class="payback-stat-col">
              <span class="payback-stat-lbl">
                <span class="lang-es">Ahorro Acumulado</span><span class="lang-en">Total Saved</span>
              </span>
              <span class="payback-stat-val text-solar" id="roi-total-saved-pill">--</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Interactive Payback curve chart -->
      <div class="roi-chart-head">
        <h4>
          <i class="fa-solid fa-chart-line" style="color:var(--solar);"></i>
          <span class="lang-es">Curva Histórica de Amortización vs Capital Invertido</span>
          <span class="lang-en">Historical Payback Curve vs Invested Capital</span>
        </h4>
        <span class="stat-tile-sub">
          <span class="lang-es">Punto de corte = Recuperación completa</span>
          <span class="lang-en">Intersection = 100% Breakeven</span>
        </span>
      </div>
      <div class="chart-container short">
        <canvas id="chart-payback"></canvas>
      </div>
    </div>
  `;
}

function _renderAIPanel() {
  return `
    <div class="ai-panel">
      <div class="ai-inner">
        <div class="ai-header">
          <div style="display:flex;align-items:center;gap:.65rem;">
            <div class="icon-tile ai"><i class="fa-solid fa-brain"></i></div>
            <div>
              <h3 style="font-size:.95rem;font-weight:800;color:var(--text-strong);">
                <span class="lang-es">Pronóstico Econométrico & Analítica Tarifaria</span>
                <span class="lang-en">Econometric Forecasting & Tariff Intelligence</span>
              </h3>
              <p style="font-size:.74rem;color:var(--muted-light);">
                <span class="lang-es">Modelo ponderado WLS + regresión exponencial con banda de confianza 90%</span>
                <span class="lang-en">Weighted WLS model + exponential regression with 90% confidence band</span>
              </p>
            </div>
          </div>
          <span class="ai-badge" id="ai-model-badge">R² 92% Confianza</span>
        </div>

        <div class="ai-grid">
          <!-- Future price (t+1) -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Tarifa Estimada Próx. Mes</span>
              <span class="lang-en">Next Month Est. Tariff</span>
            </span>
            <span id="ai-precio-futuro" class="ai-item-val text-ai">--</span>
            <span class="ai-item-sub" id="ai-rango-confianza">Banda: ± $0 COP</span>
          </div>

          <!-- Trend & CAGR -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Tendencia & Inflación (CAGR)</span>
              <span class="lang-en">Trend & Inflation (CAGR)</span>
            </span>
            <span id="ai-tendencia" class="ai-item-val">--</span>
            <span class="ai-item-sub" id="ai-cagr">CAGR: +0.0% anual</span>
          </div>

          <!-- 6-Month Horizon -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Proyección a 6 Meses</span>
              <span class="lang-en">6-Month Forecast</span>
            </span>
            <span id="ai-precio-6m" class="ai-item-val text-strong">--</span>
            <span class="ai-item-sub">Horizonte medio plazo</span>
          </div>

          <!-- Estimated Monthly Savings -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Ahorro Estimado Próx. Mes</span>
              <span class="lang-en">Est. Next Month Savings</span>
            </span>
            <span id="ai-ahorro-mes" class="ai-item-val text-solar">--</span>
            <span class="ai-item-sub">Basado en producción esperada</span>
          </div>
        </div>

        <!-- Eco & Peak Generation Banner -->
        <div class="eco-banner">
          <div class="eco-chips">
            <span class="eco-chip">
              <i class="fa-solid fa-sun text-warning"></i>
              <span class="lang-es">Pico Histórico: <strong id="ai-mejor-mes">--</strong></span>
              <span class="lang-en">Peak Gen Month: <strong id="ai-mejor-mes-en">--</strong></span>
            </span>
            <span class="eco-chip">
              <i class="fa-solid fa-leaf text-solar"></i>
              <span class="lang-es">CO₂ Evitado: <strong id="ai-co2">-- kg</strong></span>
              <span class="lang-en">Avoided CO₂: <strong id="ai-co2-en">-- kg</strong></span>
            </span>
            <span class="eco-chip">
              <i class="fa-solid fa-tree text-solar"></i>
              <span class="lang-es">Eq. <strong id="eco-trees">--</strong> árboles plantados</span>
              <span class="lang-en">Eq. <strong id="eco-trees-en">--</strong> trees planted</span>
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
      subEs: 'Ahorro económico neto',
      subEn: 'Net economic savings',
    },
    {
      id: 'kpi-produccion',
      icon: 'fa-solar-panel',
      color: 'var(--accent)',
      bg: 'var(--accent-subtle)',
      labelEs: 'Producción Solar',
      labelEn: 'Solar Production',
      subEs: 'Generación total bruta',
      subEn: 'Gross total generation',
    },
    {
      id: 'kpi-autonomia',
      icon: 'fa-battery-three-quarters',
      color: 'var(--ai)',
      bg: 'var(--ai-subtle)',
      labelEs: 'Autonomía Solar',
      labelEn: 'Solar Autonomy',
      subEs: 'Promedio últimos 3 registros',
      subEn: 'Last 3 records average',
    },
    {
      id: 'kpi-var-kw',
      icon: 'fa-arrow-trend-up',
      color: 'var(--warning)',
      bg: 'var(--warning-subtle)',
      labelEs: 'Var. Tarifa Red',
      labelEn: 'Grid Tariff Var.',
      subEs: 'Fluctuación intermensual',
      subEn: 'Month-over-month fluctuation',
    },
  ];

  const cards = kpis.map(kpi => `
    <div class="card kpi-card" style="--kpi-color:${kpi.color};">
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
      <div class="kpi-footer">
        <div class="kpi-subtext">
          <span>
            <span class="lang-es">${kpi.subEs}</span>
            <span class="lang-en">${kpi.subEn}</span>
          </span>
        </div>
        <div class="kpi-spark">
          <canvas id="spark-${kpi.id}"></canvas>
        </div>
      </div>
    </div>
  `).join('');

  return `<div class="kpi-grid">${cards}</div>`;
}

function _renderChartsGrid() {
  const energyMode = state.chartModes.energia || 'bar';
  const priceMode = state.chartModes.precio || 'line';

  return `
    <div class="charts-grid">
      <!-- Energy chart (Grid vs Solar) -->
      <div class="card chart-wrap span-2">
        <div class="chart-header">
          <div class="chart-title">
            <h3>
              <i class="fa-solid fa-bolt" style="color:var(--solar);"></i>
              <span class="lang-es">Balance Energético (Red vs Solar)</span>
              <span class="lang-en">Energy Balance (Grid vs Solar)</span>
            </h3>
            <p class="chart-subtitle">
              <span class="lang-es">Comparativa mensual de energía consumida de la red vs generación fotovoltaica</span>
              <span class="lang-en">Monthly comparison of grid consumption vs PV production</span>
            </p>
          </div>

          <!-- Segmented Control for Energy -->
          <div class="segmented-control" id="control-chart-energia">
            <button class="segmented-btn ${energyMode === 'bar' ? 'active' : ''}" data-chart-key="energia" data-mode="bar" type="button" title="Vista de Barras">
              <i class="fa-solid fa-chart-simple"></i>
            </button>
            <button class="segmented-btn ${energyMode === 'line' ? 'active' : ''}" data-chart-key="energia" data-mode="line" type="button" title="Vista de Líneas">
              <i class="fa-solid fa-chart-line"></i>
            </button>
          </div>
        </div>
        <div class="chart-container tall">
          <canvas id="chart-energia"></canvas>
        </div>
      </div>

      <!-- Energy Mix (Donut) -->
      <div class="card chart-wrap">
        <div class="chart-header">
          <div class="chart-title">
            <h3>
              <i class="fa-solid fa-chart-pie" style="color:var(--accent);"></i>
              <span class="lang-es">Mix Energético</span>
              <span class="lang-en">Energy Mix</span>
            </h3>
            <p class="chart-subtitle">
              <span class="lang-es">Participación solar acumulada</span>
              <span class="lang-en">Cumulative solar share</span>
            </p>
          </div>
        </div>
        <div class="mix-wrap">
          <div class="mix-chart">
            <canvas id="chart-mix"></canvas>
          </div>
          <div class="mix-legend">
            <div class="mix-legend-row">
              <span class="lbl"><span class="legend-dot" style="background:var(--solar);"></span> <span class="lang-es">Solar Fotovoltaica</span><span class="lang-en">Solar PV</span></span>
              <span class="val text-solar" id="mix-solar-val">-- kWh</span>
            </div>
            <div class="mix-legend-row">
              <span class="lbl"><span class="legend-dot" style="background:var(--grid-c);"></span> <span class="lang-es">Red Eléctrica</span><span class="lang-en">Grid Power</span></span>
              <span class="val text-grid" id="mix-grid-val">-- kWh</span>
            </div>
            <div class="mix-legend-row">
              <span class="lbl"><i class="fa-solid fa-calculator" style="font-size:.65rem;color:var(--muted-light);"></i> <span class="lang-es">Consumo Total</span><span class="lang-en">Total Consumed</span></span>
              <span class="val text-strong" id="mix-total-val">-- kWh</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="charts-grid two" style="margin-top:1.25rem;">
      <!-- Performance & Peak Sun Hours Chart -->
      <div class="card chart-wrap">
        <div class="chart-header">
          <div class="chart-title">
            <h3>
              <i class="fa-solid fa-sun" style="color:var(--warning);"></i>
              <span class="lang-es">Rendimiento & Horas Sol Pico (HSP)</span>
              <span class="lang-en">Plant Performance & Peak Sun Hours (PSH)</span>
            </h3>
            <p class="chart-subtitle">
              <span class="lang-es">Estándar IEC 61724 · Líneas de referencia: Óptimo (4.0) y Mínimo (3.2)</span>
              <span class="lang-en">IEC 61724 Standard · Target references: 4.0 Optimal, 3.2 Min</span>
            </p>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="chart-rendimiento"></canvas>
        </div>
      </div>

      <!-- Price chart -->
      <div class="card chart-wrap">
        <div class="chart-header">
          <div class="chart-title">
            <h3>
              <i class="fa-solid fa-coins" style="color:var(--warning);"></i>
              <span class="lang-es">Fluctuación de Tarifa kW (COP)</span>
              <span class="lang-en">kW Tariff Fluctuation (COP)</span>
            </h3>
            <p class="chart-subtitle">
              <span class="lang-es">Evolución del costo facturado por kWh en la red eléctrica</span>
              <span class="lang-en">Evolution of billed grid electricity tariff per kWh</span>
            </p>
          </div>

          <!-- Segmented Control for Price -->
          <div class="segmented-control" id="control-chart-precio">
            <button class="segmented-btn ${priceMode === 'line' ? 'active' : ''}" data-chart-key="precio" data-mode="line" type="button" title="Vista de Líneas">
              <i class="fa-solid fa-chart-line"></i>
            </button>
            <button class="segmented-btn ${priceMode === 'bar' ? 'active' : ''}" data-chart-key="precio" data-mode="bar" type="button" title="Vista de Barras">
              <i class="fa-solid fa-chart-simple"></i>
            </button>
          </div>
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
      <div style="padding:1.5rem;">
        <div class="section-head" style="margin-bottom:1rem;">
          <div class="section-head-title">
            <div class="icon-tile ai"><i class="fa-solid fa-chart-line"></i></div>
            <div>
              <h3>
                <span class="lang-es">Proyección Financiera y Energética a 25 Años</span>
                <span class="lang-en">25-Year Financial & Energy Projection</span>
              </h3>
              <p>
                <span class="lang-es">Modelo de generación degradada a 0.4%/año e inflación tarifaria 4.0%/año</span>
                <span class="lang-en">PV degradation model at 0.4%/yr and tariff inflation 4.0%/yr</span>
              </p>
            </div>
          </div>
          <div class="assumption-chips">
            <span class="meta-chip"><i class="fa-solid fa-arrow-trend-down"></i> Deg: 0.4%/año</span>
            <span class="meta-chip warning"><i class="fa-solid fa-arrow-trend-up"></i> Inf: 4%/año</span>
          </div>
        </div>

        <!-- Summary KPI tiles -->
        <div class="proj-summary">
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Ahorro 25 Años</span><span class="lang-en">25-Yr Total Savings</span></span>
            <span class="stat-tile-val text-solar" id="proj-total-savings">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Flujo acumulado</span><span class="lang-en">Cumulative cashflow</span></span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Punto de Equilibrio</span><span class="lang-en">Breakeven Year</span></span>
            <span class="stat-tile-val text-accent" id="proj-breakeven">--</span>
            <span class="stat-tile-sub" id="proj-breakeven-sub">--</span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">ROI Proyectado</span><span class="lang-en">Projected ROI</span></span>
            <span class="stat-tile-val text-solar" id="proj-roi">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Sobre inversión total</span><span class="lang-en">On total capital</span></span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Generación 25A</span><span class="lang-en">25-Yr Total Gen</span></span>
            <span class="stat-tile-val text-ai" id="proj-total-gen">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Energía limpia total</span><span class="lang-en">Clean energy lifetime</span></span>
          </div>
        </div>

        <div class="chart-container tall">
          <canvas id="chart-proyeccion"></canvas>
        </div>
      </div>

      <!-- Collapsible projection table -->
      <button id="projection-table-toggle" class="collapse-toggle" type="button">
        <span class="row">
          <i class="fa-solid fa-table"></i>
          <span class="lang-es">Ver desglose detallado año por año (25 años)</span>
          <span class="lang-en">View detailed 25-year annual breakdown</span>
        </span>
        <i id="projection-toggle-icon" class="fa-solid fa-chevron-down"></i>
      </button>
      <div id="projection-table-body" class="hidden">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th><span class="lang-es">Año</span><span class="lang-en">Year</span></th>
                <th class="text-right"><span class="lang-es">Generación (kWh)</span><span class="lang-en">Generation</span></th>
                <th class="text-right"><span class="lang-es">Ahorro Anual</span><span class="lang-en">Annual Savings</span></th>
                <th class="text-right"><span class="lang-es">Ahorro Acumulado</span><span class="lang-en">Cumulated</span></th>
                <th class="text-right"><span class="lang-es">Inversión Total</span><span class="lang-en">Total Invested</span></th>
              </tr>
            </thead>
            <tbody id="tabla-proyeccion-body"></tbody>
          </table>
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
          <i class="fa-solid fa-cloud text-accent"></i>
          <span class="lang-es">Registro Histórico Cloud</span>
          <span class="lang-en">Cloud Historical Readings</span>
        </h3>

        <!-- Table search filter -->
        <div class="table-toolbar">
          <div class="search-input-wrap sm">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              id="table-search-input"
              placeholder="Buscar período o fecha..."
              aria-label="Buscar lecturas"
            />
          </div>
        </div>
      </div>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th><span class="lang-es">Período / Fecha</span><span class="lang-en">Period / Date</span></th>
              <th style="text-align:center;"><span class="lang-es">Lecturas Red / Solar</span><span class="lang-en">Readings Grid / Solar</span></th>
              <th style="text-align:center;"><span class="lang-es">Consumo Red</span><span class="lang-en">Grid Usage</span></th>
              <th style="text-align:center;"><span class="lang-es">Gen. Solar</span><span class="lang-en">Solar Gen</span></th>
              <th style="text-align:center;"><span class="lang-es">Rendimiento (Yf)</span><span class="lang-en">Yield (Yf)</span></th>
              <th class="text-right"><span class="lang-es">Tarifa kW</span><span class="lang-en">kW Tariff</span></th>
              <th class="text-right"><span class="lang-es">Ahorro</span><span class="lang-en">Savings</span></th>
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
      <div class="modal-box" style="max-width:30rem;">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">
            <div class="icon-tile sm accent"><i class="fa-solid fa-cloud-arrow-up"></i></div>
            <span class="lang-es" id="modal-title-es">Nuevo Registro Cloud</span>
            <span class="lang-en" id="modal-title-en">New Cloud Record</span>
          </h2>
          <button id="close-record-modal" class="modal-close-btn" type="button" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Form -->
        <form id="add-record-form" class="form-stack">
          <input type="hidden" id="edit-id" value="">

          <!-- Warning Alert Box -->
          <div id="modal-reading-alert" class="modal-reading-alert hidden"></div>

          <div class="field">
            <label for="new-fecha">
              <i class="fa-solid fa-calendar-day text-accent"></i>
              <span class="lang-es">Fecha de Lectura</span>
              <span class="lang-en">Reading Date</span>
            </label>
            <input type="date" id="new-fecha" required>
          </div>

          <div class="field-row">
            <div class="field">
              <label for="new-lectura-red">
                <i class="fa-solid fa-gauge" style="color:var(--grid-c);"></i>
                <span class="lang-es">Lectura Red (Medidor)</span>
                <span class="lang-en">Grid Reading</span>
              </label>
              <input type="number" id="new-lectura-red" step="0.01" placeholder="Ej: 14500" required>
            </div>
            <div class="field">
              <label for="new-lectura-solar">
                <i class="fa-solid fa-solar-panel text-solar"></i>
                <span class="lang-es">Lectura Solar (Inversor)</span>
                <span class="lang-en">Solar Reading</span>
              </label>
              <input type="number" id="new-lectura-solar" step="0.01" placeholder="Ej: 8200" required>
            </div>
          </div>

          <div class="field">
            <label for="new-precio">
              <i class="fa-solid fa-coins text-warning"></i>
              <span class="lang-es">Precio por kW (COP)</span>
              <span class="lang-en">Price per kW (COP)</span>
            </label>
            <input type="number" id="new-precio" step="0.01" placeholder="Ej: 950.50" required>
          </div>

          <!-- Hardware Reset Checkboxes -->
          <div class="check-group">
            <label class="check-option">
              <input type="checkbox" id="new-inverter-reset">
              <div>
                <span class="check-option-title">
                  <span class="lang-es">Reinicio de inversor (Nuevo equipo solar)</span>
                  <span class="lang-en">Inverter reset (New solar equipment)</span>
                </span>
                <span class="check-option-desc">
                  <span class="lang-es">Marca si cambiaste el inversor y la lectura reinició desde 0.</span>
                  <span class="lang-en">Check if inverter was replaced and reading started from 0.</span>
                </span>
              </div>
            </label>

            <label class="check-option danger">
              <input type="checkbox" id="new-meter-reset">
              <div>
                <span class="check-option-title">
                  <span class="lang-es">Reinicio de medidor de red (Cambio por operador)</span>
                  <span class="lang-en">Grid meter reset (Utility replacement)</span>
                </span>
                <span class="check-option-desc">
                  <span class="lang-es">Marca si la empresa de energía reemplazó el medidor de red.</span>
                  <span class="lang-en">Check if utility company replaced the grid meter.</span>
                </span>
              </div>
            </label>
          </div>

          <!-- Real-Time Calculation Preview -->
          <div class="live-calc-card">
            <div class="live-calc-header">
              <span><i class="fa-solid fa-bolt" style="margin-right:.3rem;"></i> Cálculo en tiempo real</span>
              <span class="tag">Preview</span>
            </div>
            <div class="live-calc-grid">
              <div class="live-calc-item">
                <span class="lbl">Consumo Red:</span>
                <span class="val text-strong" id="prev-calc-grid">0.0 kWh</span>
              </div>
              <div class="live-calc-item">
                <span class="lbl">Gen. Solar:</span>
                <span class="val text-solar" id="prev-calc-solar">0.0 kWh</span>
              </div>
              <div class="live-calc-item">
                <span class="lbl">Rendimiento ($Y_f$):</span>
                <span class="val text-accent" id="prev-calc-yield">0.0 kWh/kWp</span>
              </div>
              <div class="live-calc-item">
                <span class="lbl">Ahorro Est.:</span>
                <span class="val text-solar" id="prev-calc-savings">$0</span>
              </div>
            </div>
          </div>

          <button type="submit" id="btn-save" class="btn btn-solar btn-lg btn-block" style="margin-top:.25rem;">
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
