/**
 * @module dashboardView
 * @description Enterprise dashboard view for JF Solar Cloud v4.0.
 * Features IEC 61724 telemetry, MoM KPI deltas, smart anomaly alerts,
 * interactive 25-year financial simulator (NPV/IRR/LCOE), CSV importer,
 * Executive PDF/Print report generator, and Presentation/Kiosk mode.
 */

import { state, savePrefs } from '../modules/state.js';
import { renderSidebar, initSidebar } from '../components/sidebar.js';
import { fCOP, fDec, fKwh, fPct, fYield, fHsp, fDailyRate } from '../modules/formatters.js';
import { getAvailableYears, calcFinancialSimulation, calcKPIs, calcProjections } from '../modules/analytics.js';
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
  const isAdmin = state.activeProjectRole === 'admin' || state.isAdmin;
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
              <div class="dashboard-tabs-row">
                <div class="dashboard-tabs" id="dashboard-tab-bar">
                  <button class="tab-btn ${activeTab === 'telemetry' ? 'active' : ''}" data-tab="telemetry" type="button">
                    <i class="fa-solid fa-solar-panel"></i>
                    <span class="lang-es">Telemetría & Balance</span>
                    <span class="lang-en">Telemetry & Balance</span>
                  </button>
                  <button class="tab-btn ${activeTab === 'finance' ? 'active' : ''}" data-tab="finance" type="button">
                    <i class="fa-solid fa-chart-pie"></i>
                    <span class="lang-es">Finanzas & Simulador 25A</span>
                    <span class="lang-en">Finance & 25Y Simulator</span>
                  </button>
                  <button class="tab-btn ${activeTab === 'audit' ? 'active' : ''}" data-tab="audit" type="button">
                    <i class="fa-solid fa-cloud"></i>
                    <span class="lang-es">Historial Cloud</span>
                    <span class="lang-en">Cloud Log</span>
                    <span class="tab-count-badge" id="tab-readings-count">${state.rawData?.length || 0}</span>
                  </button>
                  <button class="tab-btn" type="button" onclick="window.__navigate('solarman')">
                    <i class="fa-solid fa-satellite-dish text-solar"></i>
                    <span class="lang-es">Monitor Solarman (En Vivo)</span>
                    <span class="lang-en">Solarman Live Monitor</span>
                  </button>
                </div>
              </div>

              <!-- ═══ Tab 1: Telemetría & Operación ═══ -->
              <div class="tab-pane ${activeTab === 'telemetry' ? 'active' : ''}" id="pane-telemetry">
                <!-- Solar Health & Telemetry Strip -->
                ${_renderSolarHealthBanner()}

                <!-- Smart Anomaly & Diagnostic Alerts -->
                <div id="anomaly-alerts-container" class="anomaly-alerts-stack hidden"></div>

                <!-- KPI Grid with sparklines & MoM Deltas -->
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

                <!-- 25-Year Financial Simulator & Projection -->
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
            <span>JF SOLAR CLOUD v4.0 · ENTERPRISE CLEAN ENERGY ANALYTICS PLATFORM</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Presentation / Kiosk Floating HUD Bar ═══ -->
    <div id="kiosk-floating-bar" class="kiosk-bar ${state.kioskMode ? '' : 'hidden'}">
      <div class="kiosk-bar-brand">
        <span class="online-dot"></span>
        <strong>${_escapeHTML(project.name || 'Planta Solar')}</strong>
        <span class="kiosk-tag">LIVE KIOSK</span>
      </div>
      <div class="kiosk-bar-actions">
        <button type="button" id="btn-kiosk-autorotate" class="btn btn-ghost btn-xs">
          <i class="fa-solid fa-arrows-spin"></i>
          <span class="lang-es">Auto-Rotar Vistas</span>
          <span class="lang-en">Auto-Rotate Views</span>
        </button>
        <button type="button" id="btn-kiosk-exit" class="btn btn-danger btn-xs">
          <i class="fa-solid fa-compress"></i>
          <span class="lang-es">Salir de Presentación</span>
          <span class="lang-en">Exit Presentation</span>
        </button>
      </div>
    </div>

    <!-- ═══ Add/Edit Record Modal ═══ -->
    ${_renderRecordModal()}

    <!-- ═══ CSV Importer Modal ═══ -->
    ${_renderCsvImportModal()}

    <!-- ═══ Executive Report Modal (PDF / Print) ═══ -->
    ${_renderExecutiveReportModal()}
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
    onImportCsv,
    onTabChange,
    onSimChange,
    onToggleTheme,
    onToggleKiosk,
  } = callbacks || {};

  // Init Sidebar
  if (document.getElementById('sidebar-panel')) {
    initSidebar(onNavigate);
  }

  // Year filter
  const yearFilter = document.getElementById('year-filter');
  if (yearFilter && onYearChange) {
    yearFilter.addEventListener('change', () => {
      state.selectedYear = yearFilter.value;
      savePrefs();
      onYearChange(yearFilter.value);
    });
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

  // Executive Report button
  const execReportBtn = document.getElementById('btn-exec-report');
  if (execReportBtn) {
    execReportBtn.addEventListener('click', () => openExecutiveReportModal());
  }

  // Theme Toggle button
  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn && onToggleTheme) {
    themeBtn.addEventListener('click', onToggleTheme);
  }

  // Kiosk Mode buttons
  const kioskBtn = document.getElementById('btn-kiosk-mode');
  if (kioskBtn && onToggleKiosk) {
    kioskBtn.addEventListener('click', () => onToggleKiosk());
  }
  const kioskExitBtn = document.getElementById('btn-kiosk-exit');
  if (kioskExitBtn && onToggleKiosk) {
    kioskExitBtn.addEventListener('click', () => onToggleKiosk(false));
  }
  const kioskRotateBtn = document.getElementById('btn-kiosk-autorotate');
  if (kioskRotateBtn) {
    kioskRotateBtn.addEventListener('click', () => {
      if (state.kioskTimer) {
        clearInterval(state.kioskTimer);
        state.kioskTimer = null;
        kioskRotateBtn.classList.remove('active');
      } else {
        kioskRotateBtn.classList.add('active');
        state.kioskTimer = setInterval(() => {
          const nextTab = state.activeTab === 'telemetry' ? 'finance' : 'telemetry';
          const btn = document.querySelector(`.tab-btn[data-tab="${nextTab}"]`);
          btn?.click();
        }, 10000);
      }
    });
  }

  // Context Tab switching
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabKey = btn.dataset.tab;
      state.activeTab = tabKey;
      savePrefs();
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

  // Interactive 25-year Simulator Sliders
  _bindFinancialSimulator(onSimChange);

  // CSV Import Modal bindings
  _bindCsvImporter(onImportCsv);

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

/* ═══════════════════════════════════════════════════════════════════════════
   Interactive 25-Year Financial Simulator Binding
   ═══════════════════════════════════════════════════════════════════════════ */

function _bindFinancialSimulator(onSimChange) {
  const infSlider = document.getElementById('sim-slider-inflation');
  const degSlider = document.getElementById('sim-slider-degradation');
  const waccSlider = document.getElementById('sim-slider-wacc');
  const resetBtn = document.getElementById('btn-reset-sim');

  const handleSliderInput = () => {
    state.simParams.inflation = parseFloat(infSlider?.value) || 4.0;
    state.simParams.degradation = parseFloat(degSlider?.value) || 0.4;
    state.simParams.discountRate = parseFloat(waccSlider?.value) || 8.0;
    savePrefs();
    if (typeof onSimChange === 'function') {
      onSimChange();
    }
  };

  [infSlider, degSlider, waccSlider].forEach(slider => {
    slider?.addEventListener('input', handleSliderInput);
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.simParams.inflation = 4.0;
      state.simParams.degradation = 0.4;
      state.simParams.discountRate = 8.0;
      if (infSlider) infSlider.value = '4.0';
      if (degSlider) degSlider.value = '0.4';
      if (waccSlider) waccSlider.value = '8.0';
      savePrefs();
      if (typeof onSimChange === 'function') {
        onSimChange();
      }
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Accurate Modal Live Preview (Chronological Predecessor + Exact Days)
   ═══════════════════════════════════════════════════════════════════════════ */

function _bindModalLivePreview() {
  const redInput = document.getElementById('new-lectura-red');
  const solarInput = document.getElementById('new-lectura-solar');
  const priceInput = document.getElementById('new-precio');
  const inverterResetCheckbox = document.getElementById('new-inverter-reset');
  const meterResetCheckbox = document.getElementById('new-meter-reset');
  const dateInput = document.getElementById('new-fecha');
  const alertBox = document.getElementById('modal-reading-alert');
  const periodDaysTag = document.getElementById('prev-calc-days-tag');

  const updatePreview = () => {
    const editId = document.getElementById('edit-id')?.value || '';
    const selectedFecha = dateInput?.value || '';
    const curRed = parseFloat(redInput?.value) || 0;
    const curSolar = parseFloat(solarInput?.value) || 0;
    const curPrice = parseFloat(priceInput?.value) || 0;
    const isInverterReset = inverterResetCheckbox?.checked || false;
    const isMeterReset = meterResetCheckbox?.checked || false;

    const rawData = state.rawData || [];
    // Find actual chronological predecessor (latest record before selectedFecha, excluding current editId)
    let prev = null;
    for (const r of rawData) {
      if (editId && r.id === editId) continue;
      if (!selectedFecha || (r.fecha && r.fecha < selectedFecha)) {
        prev = r;
      }
    }

    let calcGrid = 0;
    let calcSolar = 0;
    let daysInPeriod = 30;
    const warnings = [];

    if (prev) {
      const prevRed = prev.lecturaRed ?? prev.medidorRed ?? 0;
      const prevSolar = prev.lecturaSolar ?? prev.inversores ?? 0;

      if (selectedFecha && prev.fecha) {
        const dCurr = new Date(selectedFecha + 'T00:00:00');
        const dPrev = new Date(prev.fecha + 'T00:00:00');
        const diffDays = Math.round(Math.abs(dCurr - dPrev) / (1000 * 60 * 60 * 24));
        if (diffDays >= 1 && diffDays <= 90) {
          daysInPeriod = diffDays;
        }
      }

      if (curRed < prevRed && !isMeterReset && curRed > 0) {
        warnings.push(
          state.lang === 'en'
            ? `Grid reading (${curRed}) is lower than previous (${prevRed} on ${prev.fecha}). Check "Grid meter reset" if the meter was replaced.`
            : `Lectura de red (${curRed}) menor que la anterior (${prevRed} del ${prev.fecha}). Si el medidor fue cambiado, marca "Reinicio de Medidor de Red".`,
        );
      }
      if (curSolar < prevSolar && !isInverterReset && curSolar > 0) {
        warnings.push(
          state.lang === 'en'
            ? `Solar reading (${curSolar}) is lower than previous (${prevSolar} on ${prev.fecha}). Check "Inverter reset" if replaced.`
            : `Lectura solar (${curSolar}) menor que la anterior (${prevSolar} del ${prev.fecha}). Si el inversor fue cambiado, marca "Reinicio de Inversor".`,
        );
      }

      calcGrid = isMeterReset ? curRed : Math.max(0, curRed - prevRed);
      calcSolar = isInverterReset ? curSolar : Math.max(0, curSolar - prevSolar);
    } else {
      // Initial base reading
      calcGrid = 0;
      calcSolar = 0;
    }

    const calcSavings = calcSolar * curPrice;
    const capacity = parseFloat(state.activeProject?.capacity_kw) || 0;
    const calcYield = capacity > 0 ? calcSolar / capacity : 0;
    const calcHsp = (capacity > 0 && daysInPeriod > 0) ? calcSolar / (capacity * daysInPeriod) : 0;

    const prevGridEl = document.getElementById('prev-calc-grid');
    const prevSolarEl = document.getElementById('prev-calc-solar');
    const prevSavingsEl = document.getElementById('prev-calc-savings');
    const prevYieldEl = document.getElementById('prev-calc-yield');

    if (periodDaysTag) {
      periodDaysTag.innerText = prev
        ? `${daysInPeriod} ${state.lang === 'en' ? 'days vs' : 'días vs'} ${prev.fecha}`
        : (state.lang === 'en' ? 'Initial Base Reading (t₀)' : 'Lectura Inicial Base (t₀)');
    }
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

/* ═══════════════════════════════════════════════════════════════════════════
   CSV Importer Binding & Parser
   ═══════════════════════════════════════════════════════════════════════════ */

let _parsedCsvRecords = [];

function _bindCsvImporter(onImportCsv) {
  const openBtn = document.getElementById('btn-import-csv');
  const closeBtn = document.getElementById('close-csv-modal');
  const modal = document.getElementById('csv-import-modal');
  const fileInput = document.getElementById('csv-file-input');
  const templateBtn = document.getElementById('btn-download-csv-template');
  const confirmBtn = document.getElementById('btn-confirm-csv-import');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      _parsedCsvRecords = [];
      if (fileInput) fileInput.value = '';
      const previewWrap = document.getElementById('csv-preview-wrap');
      if (previewWrap) previewWrap.classList.add('hidden');
      if (confirmBtn) confirmBtn.disabled = true;
      modal.classList.remove('hidden');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'csv-import-modal') modal.classList.add('hidden');
    });
  }

  if (templateBtn) {
    templateBtn.addEventListener('click', () => {
      const sample = [
        'Fecha,Lectura Red (Medidor),Lectura Solar (Inversor),Tarifa kW (COP),Reinicio Inversor,Reinicio Medidor Red',
        '2025-01-15,12000,4500,890,NO,NO',
        '2025-02-15,12180,4820,905,NO,NO',
        '2025-03-15,12350,5190,912,NO,NO',
      ].join('\n');
      const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_lecturas_jf_solar.csv';
      a.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = String(ev.target?.result || '');
        _parsedCsvRecords = _parseCsvContent(text);
        _renderCsvPreview(_parsedCsvRecords);
      };
      reader.readAsText(file, 'UTF-8');
    });
  }

  if (confirmBtn && typeof onImportCsv === 'function') {
    confirmBtn.addEventListener('click', async () => {
      if (!_parsedCsvRecords.length) return;
      confirmBtn.disabled = true;
      await onImportCsv(_parsedCsvRecords);
      modal?.classList.add('hidden');
    });
  }
}

function _parseCsvContent(text) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const splitLine = (line) =>
    line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim());

  const headers = splitLine(lines[0]).map(h => h.toLowerCase());
  const idxFecha = headers.findIndex(h => h.includes('fecha') || h.includes('date'));
  const idxRed = headers.findIndex(h => h.includes('lectura red') || h.includes('medidor') || h.includes('grid'));
  const idxSolar = headers.findIndex(h => h.includes('lectura solar') || h.includes('inversor') || h.includes('solar'));
  const idxPrecio = headers.findIndex(h => h.includes('tarifa') || h.includes('precio') || h.includes('cost') || h.includes('price'));
  const idxInvReset = headers.findIndex(h => h.includes('reinicio inversor') || h.includes('inverter reset'));
  const idxMetReset = headers.findIndex(h => h.includes('reinicio medidor') || h.includes('meter reset'));

  const records = [];
  const projPrefix = state.activeProject?.id ? `${state.activeProject.id.slice(0, 8)}_` : '';

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const fecha = cols[idxFecha >= 0 ? idxFecha : 0];
    if (!fecha || !/^\d{4}-\d{2}(-\d{2})?$/.test(fecha)) continue;

    const normalizedFecha = fecha.length === 7 ? `${fecha}-01` : fecha;
    const [y, m, d] = normalizedFecha.split('-');
    const lecturaRed = parseFloat(cols[idxRed >= 0 ? idxRed : 1]) || 0;
    const lecturaSolar = parseFloat(cols[idxSolar >= 0 ? idxSolar : 2]) || 0;
    const precioKw = parseFloat(cols[idxPrecio >= 0 ? idxPrecio : 3]) || 0;
    const invResetVal = idxInvReset >= 0 ? (cols[idxInvReset] || '').toUpperCase() : 'NO';
    const metResetVal = idxMetReset >= 0 ? (cols[idxMetReset] || '').toUpperCase() : 'NO';

    records.push({
      id: `${projPrefix}${y}-${m}-${d || '01'}`,
      year: parseInt(y, 10),
      monthIdx: parseInt(m, 10),
      fecha: normalizedFecha,
      lecturaRed,
      lecturaSolar,
      precioKw,
      project_id: state.activeProject?.id || null,
      inverter_reset: invResetVal === 'SI' || invResetVal === 'YES' || invResetVal === 'TRUE' || invResetVal === '1',
      meter_reset: metResetVal === 'SI' || metResetVal === 'YES' || metResetVal === 'TRUE' || metResetVal === '1',
    });
  }

  return records;
}

function _renderCsvPreview(records) {
  const wrap = document.getElementById('csv-preview-wrap');
  const tbody = document.getElementById('csv-preview-tbody');
  const countEl = document.getElementById('csv-preview-count');
  const confirmBtn = document.getElementById('btn-confirm-csv-import');

  if (!wrap || !tbody) return;
  wrap.classList.remove('hidden');
  if (countEl) countEl.textContent = `${records.length}`;
  if (confirmBtn) confirmBtn.disabled = records.length === 0;

  tbody.innerHTML = records.slice(0, 15).map(r => `
    <tr>
      <td class="cell-primary">${r.fecha}</td>
      <td class="text-right">${fDec(r.lecturaRed, 1)}</td>
      <td class="text-right text-solar">${fDec(r.lecturaSolar, 1)}</td>
      <td class="text-right">${fCOP(r.precioKw)}</td>
    </tr>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   Executive Report Generator (PDF / Print Sheet)
   ═══════════════════════════════════════════════════════════════════════════ */

export function openExecutiveReportModal() {
  const modal = document.getElementById('exec-report-modal');
  const body = document.getElementById('exec-report-content');
  if (!modal || !body) return;

  const project = state.activeProject || {};
  const capacity = parseFloat(project.capacity_kw) || 0;
  const kpis = calcKPIs(state.viewData, state.processedData, state.investments, capacity);
  const proj = calcProjections(state.viewData);
  const sim = calcFinancialSimulation(state.processedData, state.investments, state.simParams);
  const totalInv = sim.totalInvestment;
  const totalSavedAll = state.processedData.reduce((s, d) => s + (d.ahorroReal || 0), 0);
  const progressPct = totalInv > 0 ? Math.min(100, (totalSavedAll / totalInv) * 100) : 0;
  const nowStr = new Date().toLocaleDateString(state.lang === 'en' ? 'en-US' : 'es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const recentRows = [...state.viewData].slice(-12).reverse();

  body.innerHTML = `
    <div class="exec-report-sheet" id="printable-executive-sheet">
      <!-- Report Institutional Header -->
      <div class="exec-sheet-header">
        <div>
          <div class="exec-sheet-brand">JF SOLAR CLOUD · ENTERPRISE TELEMETRY & VALUATION</div>
          <h1 class="exec-sheet-title">${_escapeHTML(project.name || 'Planta Solar Fotovoltaica')}</h1>
          <div class="exec-sheet-meta">
            <span><i class="fa-solid fa-location-dot"></i> ${_escapeHTML(project.location || 'Colombia')}</span>
            <span>•</span>
            <span><i class="fa-solid fa-bolt"></i> ${fDec(capacity, 1)} kWp (${project.panel_count || 0} paneles)</span>
            ${project.inverter_model ? `<span>•</span><span><i class="fa-solid fa-microchip"></i> ${_escapeHTML(project.inverter_model)}</span>` : ''}
          </div>
        </div>
        <div class="exec-sheet-stamp">
          <div class="exec-stamp-label">${state.lang === 'en' ? 'ISSUED DATE' : 'FECHA DE EMISIÓN'}</div>
          <div class="exec-stamp-val">${nowStr}</div>
          <div class="exec-stamp-sub">IEC 61724 Compliant</div>
        </div>
      </div>

      <!-- Section 1: Operational & Engineering Summary -->
      <div class="exec-section-title">1. ${state.lang === 'en' ? 'Operational Telemetry & Engineering (IEC 61724)' : 'Telemetría Operativa e Ingeniería Solar (IEC 61724)'}</div>
      <div class="exec-kpi-strip">
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Period Savings' : 'Ahorro del Período'}</span>
          <strong class="val text-solar">${fCOP(kpis.savings)}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Solar Generation' : 'Generación Solar'}</span>
          <strong class="val text-accent">${fKwh(kpis.gen)}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Solar Autonomy' : 'Autonomía Solar'}</span>
          <strong class="val">${fPct(kpis.autonomy)}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Specific Yield (Yf)' : 'Rendimiento (Yf)'}</span>
          <strong class="val">${fYield(kpis.specificYield)}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Peak Sun Hours' : 'Horas Sol Pico (HSP)'}</span>
          <strong class="val">${fHsp(kpis.lastHsp)} (${fDec(kpis.pr, 0)}% PR)</strong>
        </div>
      </div>

      <!-- Section 2: Financial Valuation & 25-Year Projection -->
      <div class="exec-section-title">2. ${state.lang === 'en' ? 'Capital Amortization & 25-Year Valuation' : 'Amortización de Capital y Valoración Financiera (25 Años)'}</div>
      <div class="exec-kpi-strip">
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Invested CAPEX' : 'Inversión CAPEX'}</span>
          <strong class="val">${fCOP(totalInv)}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Cumulative Recovered' : 'Recuperado a la Fecha'}</span>
          <strong class="val text-solar">${fCOP(totalSavedAll)} (${fDec(progressPct, 1)}%)</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Net Present Value (NPV)' : 'Valor Presente Neto (VPN)'}</span>
          <strong class="val text-solar">${totalInv > 0 ? fCOP(sim.npv) : '—'}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Internal Rate (IRR / TIR)' : 'Tasa Interna (TIR / IRR)'}</span>
          <strong class="val text-accent">${sim.irr !== null ? `${fDec(sim.irr, 1)}%` : '—'}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Levelized Cost (LCOE)' : 'Costo Nivelado (LCOE)'}</span>
          <strong class="val">${sim.lcoe > 0 ? `${fCOP(sim.lcoe)}/kWh` : '—'}</strong>
        </div>
      </div>

      <!-- Section 3: Environmental Impact & Econometric Forecast -->
      <div class="exec-section-title">3. ${state.lang === 'en' ? 'Environmental Impact & Tariff Forecast (WLS)' : 'Mitigación Ambiental y Pronóstico Tarifario (WLS)'}</div>
      <div class="exec-kpi-strip">
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Avoided Carbon (CO₂)' : 'Huella CO₂ Evitada'}</span>
          <strong class="val text-solar">${proj.co2} kg CO₂</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Equivalent Trees' : 'Árboles Equivalentes'}</span>
          <strong class="val text-solar">${proj.trees} ${state.lang === 'en' ? 'trees' : 'árboles'}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Next Month Est. Tariff' : 'Tarifa Est. Próx. Mes'}</span>
          <strong class="val">${fCOP(proj.projectedPrice)}/kWh (±${fCOP(proj.confidenceMargin)})</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? '25-Yr Cumulative Savings' : 'Ahorro Proyectado 25A'}</span>
          <strong class="val text-solar">${fCOP(sim.finalCum)}</strong>
        </div>
      </div>

      <!-- Section 4: Recent Billing Cycles Table -->
      <div class="exec-section-title">4. ${state.lang === 'en' ? 'Recent Cloud Billing Cycles (Last 12 Records)' : ' Desglose de Ciclos Recientes (Últimos 12 Registros)'}</div>
      <table class="exec-table">
        <thead>
          <tr>
            <th>${state.lang === 'en' ? 'Period / Date' : 'Período / Fecha'}</th>
            <th class="text-right">${state.lang === 'en' ? 'Grid (kWh)' : 'Consumo Red'}</th>
            <th class="text-right">${state.lang === 'en' ? 'Solar (kWh)' : 'Gen. Solar'}</th>
            <th class="text-right">${state.lang === 'en' ? 'Autonomy' : 'Autonomía'}</th>
            <th class="text-right">HSP</th>
            <th class="text-right">${state.lang === 'en' ? 'Tariff' : 'Tarifa kW'}</th>
            <th class="text-right">${state.lang === 'en' ? 'Net Savings' : 'Ahorro Real'}</th>
          </tr>
        </thead>
        <tbody>
          ${recentRows.map(r => `
            <tr>
              <td><strong>${r.label}</strong> <span style="opacity:.65;font-size:.75rem;">(${r.fecha})</span></td>
              <td class="text-right">${fDec(r.consumoRed, 1)} kWh</td>
              <td class="text-right">${fDec(r.prodBruta, 1)} kWh</td>
              <td class="text-right">${fDec(r.autonomia, 1)}%</td>
              <td class="text-right">${fDec(r.hsp, 2)}</td>
              <td class="text-right">${fCOP(r.precioKw)}</td>
              <td class="text-right"><strong>${fCOP(r.ahorroReal)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  modal.classList.remove('hidden');

  document.getElementById('close-exec-report-modal')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  document.getElementById('btn-print-exec-report')?.addEventListener('click', () => {
    window.print();
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Table Rows Renderer (with Initial Base Reading Support)
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderTableRows(data, isAdmin = false, baseRecord = null) {
  if ((!data || data.length === 0) && !baseRecord) {
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

  let baseRowHTML = '';
  if (baseRecord) {
    const baseAdminCol = isAdmin
      ? `
        <td style="text-align:center;">
          <div class="cell-actions">
            <button class="edit-btn btn btn-ghost btn-xs btn-icon" data-id="${baseRecord.id}" title="Editar lectura base">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="del-btn btn btn-danger-outline btn-xs btn-icon" data-id="${baseRecord.id}" data-fecha="${baseRecord.fecha}" title="Eliminar lectura base">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `
      : '';

    baseRowHTML = `
      <tr class="data-row base-record-row" data-row-id="${baseRecord.id}">
        <td>
          <div class="cell-period">
            <div class="row-chevron" style="color:var(--accent);border-color:rgba(56,189,248,.3);"><i class="fa-solid fa-flag"></i></div>
            <div>
              <div class="cell-primary text-accent">${baseRecord.label}</div>
              <div class="cell-sub">${baseRecord.fecha}</div>
              <div class="badges-inline">
                <span class="badge-base-record">
                  <i class="fa-solid fa-compass-drafting"></i>
                  <span class="lang-es">Lectura Inicial Base (t₀)</span>
                  <span class="lang-en">Initial Base Reading (t₀)</span>
                </span>
              </div>
            </div>
          </div>
        </td>
        <td style="text-align:center;color:var(--muted-light);font-size:.8rem;">
          <span style="color:var(--text);font-weight:700;">${(baseRecord.lecturaRed || 0).toFixed(0)}</span>
          <span style="opacity:.3;margin:0 .25rem;">/</span>
          <span style="color:var(--solar);font-weight:700;">${(baseRecord.lecturaSolar || 0).toFixed(0)}</span>
          <div class="cell-sub">Red / Solar (t₀)</div>
        </td>
        <td colspan="3" style="text-align:center;color:var(--muted-light);font-size:.78rem;">
          <span class="lang-es">Punto de referencia inicial para el cálculo de deltas mensuales</span>
          <span class="lang-en">Baseline reference point for monthly delta calculations</span>
        </td>
        <td class="text-right">
          <div class="cell-primary">${fCOP(baseRecord.precioKw || 0)}</div>
          <div class="cell-sub"><span class="lang-es">Tarifa base</span><span class="lang-en">Base tariff</span></div>
        </td>
        <td class="text-right" style="color:var(--muted-light);font-size:.78rem;">—</td>
        ${baseAdminCol}
      </tr>
    `;
  }

  const rowsHTML = (data || []).map(row => {
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
              <div class="cell-sub">${row.fecha} <span style="opacity:.65;">(${row.daysInPeriod || 30}d)</span></div>
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
                <span class="lang-es">Eficiencia Fotovoltaica (IEC 61724)</span>
                <span class="lang-en">PV Efficiency (IEC 61724)</span>
              </span>
              <div class="kv"><span>Consumo Total:</span><strong>${fDec(row.consumoTotal, 1)} kWh</strong></div>
              <div class="kv"><span>Autonomía Solar:</span><strong class="text-ai">${fDec(row.autonomia, 1)}%</strong></div>
              <div class="kv"><span>Rendimiento Y<sub>f</sub>:</span><strong class="text-accent">${fDec(row.specificYield || 0, 1)} kWh/kWp</strong></div>
              <div class="kv"><span>Performance Ratio:</span><strong class="text-solar">${fDec(row.pr || 0, 1)}%</strong></div>
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

  return baseRowHTML + rowsHTML;
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
            <span class="lang-es">Rendimiento (Y<sub>f</sub>)</span><span class="lang-en">Specific Yield (Y<sub>f</sub>)</span>
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
        <div class="solar-metric-icon" style="background:var(--solar-subtle);color:var(--solar);">
          <i class="fa-solid fa-gauge-high"></i>
        </div>
        <div class="solar-metric-info">
          <span class="solar-metric-lbl">
            <span class="lang-es">Performance Ratio (PR)</span><span class="lang-en">Performance Ratio (PR)</span>
          </span>
          <span class="solar-metric-val text-solar" id="sh-pr-val">--</span>
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
                <span id="roi-time">--</span>
                <span style="font-size:.7rem;color:var(--muted-light);font-weight:600;">
                  <span class="lang-es">Años</span><span class="lang-en">Yrs</span>
                </span>
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
          <span class="ai-badge" id="ai-model-badge">R² 92%</span>
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
            <span class="ai-item-sub">
              <span class="lang-es">Horizonte medio plazo</span><span class="lang-en">Mid-term horizon</span>
            </span>
          </div>

          <!-- Estimated Monthly Savings -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Ahorro Estimado Próx. Mes</span>
              <span class="lang-en">Est. Next Month Savings</span>
            </span>
            <span id="ai-ahorro-mes" class="ai-item-val text-solar">--</span>
            <span class="ai-item-sub">
              <span class="lang-es">Basado en producción esperada</span><span class="lang-en">Based on expected generation</span>
            </span>
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
          <span id="delta-${kpi.id}" class="kpi-delta-slot"></span>
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
  const sim = state.simParams || { inflation: 4.0, degradation: 0.4, discountRate: 8.0 };

  return `
    <div class="card" style="overflow:hidden;">
      <div style="padding:1.5rem;">
        <div class="section-head" style="margin-bottom:1rem;">
          <div class="section-head-title">
            <div class="icon-tile ai"><i class="fa-solid fa-sliders"></i></div>
            <div>
              <h3>
                <span class="lang-es">Simulador Financiero Interactivo & Proyección a 25 Años</span>
                <span class="lang-en">Interactive Financial Simulator & 25-Year Projection</span>
              </h3>
              <p>
                <span class="lang-es">Modelado de flujo de caja descontado (VPN / TIR / LCOE) con degradación e inflación dinámicas</span>
                <span class="lang-en">Discounted cashflow valuation (NPV / IRR / LCOE) with dynamic degradation & inflation</span>
              </p>
            </div>
          </div>
          <div class="assumption-chips">
            <span class="meta-chip" id="sim-chip-deg"><i class="fa-solid fa-arrow-trend-down"></i> Deg: ${fDec(sim.degradation, 2)}%/año</span>
            <span class="meta-chip warning" id="sim-chip-inf"><i class="fa-solid fa-arrow-trend-up"></i> Inf: ${fDec(sim.inflation, 1)}%/año</span>
            <span class="meta-chip accent" id="sim-chip-wacc"><i class="fa-solid fa-percent"></i> WACC: ${fDec(sim.discountRate, 1)}%</span>
          </div>
        </div>

        <!-- Interactive Simulator Controls -->
        <div class="sim-controls-panel">
          <div class="sim-control-item">
            <div class="sim-control-head">
              <label for="sim-slider-inflation">
                <i class="fa-solid fa-arrow-trend-up text-warning"></i>
                <span class="lang-es">Inflación Tarifaria Anual</span>
                <span class="lang-en">Annual Tariff Inflation</span>
              </label>
              <strong id="sim-val-inflation" class="text-warning">${fDec(sim.inflation, 1)}%</strong>
            </div>
            <input type="range" id="sim-slider-inflation" min="0" max="15" step="0.5" value="${sim.inflation}" class="sim-slider warning">
          </div>

          <div class="sim-control-item">
            <div class="sim-control-head">
              <label for="sim-slider-degradation">
                <i class="fa-solid fa-solar-panel text-solar"></i>
                <span class="lang-es">Degradación Anual Paneles</span>
                <span class="lang-en">Annual Panel Degradation</span>
              </label>
              <strong id="sim-val-degradation" class="text-solar">${fDec(sim.degradation, 2)}%</strong>
            </div>
            <input type="range" id="sim-slider-degradation" min="0.1" max="1.5" step="0.05" value="${sim.degradation}" class="sim-slider solar">
          </div>

          <div class="sim-control-item">
            <div class="sim-control-head">
              <label for="sim-slider-wacc">
                <i class="fa-solid fa-landmark text-accent"></i>
                <span class="lang-es">Tasa de Descuento (WACC)</span>
                <span class="lang-en">Discount Rate (WACC)</span>
              </label>
              <strong id="sim-val-wacc" class="text-accent">${fDec(sim.discountRate, 1)}%</strong>
            </div>
            <input type="range" id="sim-slider-wacc" min="2" max="20" step="0.5" value="${sim.discountRate}" class="sim-slider accent">
          </div>

          <div class="sim-control-reset">
            <button type="button" id="btn-reset-sim" class="btn btn-ghost btn-xs" title="Restaurar parámetros base">
              <i class="fa-solid fa-rotate-left"></i>
              <span class="lang-es"> Base</span><span class="lang-en"> Reset</span>
            </button>
          </div>
        </div>

        <!-- Summary KPI tiles (Institutional Valuation) -->
        <div class="proj-summary">
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Ahorro Bruto 25 Años</span><span class="lang-en">25-Yr Gross Savings</span></span>
            <span class="stat-tile-val text-solar" id="proj-total-savings">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Flujo acumulado</span><span class="lang-en">Cumulative cashflow</span></span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Valor Presente Neto (VPN)</span><span class="lang-en">Net Present Value (NPV)</span></span>
            <span class="stat-tile-val text-solar" id="proj-npv">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Descontado al WACC</span><span class="lang-en">Discounted at WACC</span></span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Tasa Interna (TIR / IRR)</span><span class="lang-en">Internal Rate (IRR)</span></span>
            <span class="stat-tile-val text-accent" id="proj-irr">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Rentabilidad efectiva anual</span><span class="lang-en">Effective annual return</span></span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Punto de Equilibrio</span><span class="lang-en">Breakeven Year</span></span>
            <span class="stat-tile-val text-warning" id="proj-breakeven">--</span>
            <span class="stat-tile-sub" id="proj-breakeven-sub">--</span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">ROI Proyectado 25A</span><span class="lang-en">Projected 25Y ROI</span></span>
            <span class="stat-tile-val text-solar" id="proj-roi">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Múltiplo sobre CAPEX</span><span class="lang-en">Return on total CAPEX</span></span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Costo Nivelado (LCOE)</span><span class="lang-en">Levelized Cost (LCOE)</span></span>
            <span class="stat-tile-val text-strong" id="proj-lcoe">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Costo solar por kWh</span><span class="lang-en">Solar cost per kWh</span></span>
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
          <span class="lang-es">Ver flujo de caja detallado año por año (25 años)</span>
          <span class="lang-en">View detailed 25-year annual cashflow breakdown</span>
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
                <th class="text-right"><span class="lang-es">Balance Neto</span><span class="lang-en">Net Balance</span></th>
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

        <!-- Table toolbar with search + CSV Importer -->
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
          ${isAdmin ? `
            <button id="btn-import-csv" type="button" class="btn btn-ghost btn-sm">
              <i class="fa-solid fa-file-arrow-up text-solar"></i>
              <span class="lang-es">Importar CSV</span>
              <span class="lang-en">Import CSV</span>
            </button>
          ` : ''}
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
              <th style="text-align:center;"><span class="lang-es">Rendimiento (Y<sub>f</sub>)</span><span class="lang-en">Yield (Y<sub>f</sub>)</span></th>
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
              <span>
                <i class="fa-solid fa-bolt" style="margin-right:.3rem;"></i>
                <span class="lang-es">Cálculo en tiempo real</span>
                <span class="lang-en">Real-time calculation</span>
              </span>
              <span class="tag" id="prev-calc-days-tag">Preview</span>
            </div>
            <div class="live-calc-grid">
              <div class="live-calc-item">
                <span class="lbl"><span class="lang-es">Consumo Red:</span><span class="lang-en">Grid Usage:</span></span>
                <span class="val text-strong" id="prev-calc-grid">0.0 kWh</span>
              </div>
              <div class="live-calc-item">
                <span class="lbl"><span class="lang-es">Gen. Solar:</span><span class="lang-en">Solar Gen:</span></span>
                <span class="val text-solar" id="prev-calc-solar">0.0 kWh</span>
              </div>
              <div class="live-calc-item">
                <span class="lbl"><span class="lang-es">Rendimiento (Y<sub>f</sub>):</span><span class="lang-en">Yield (Y<sub>f</sub>):</span></span>
                <span class="val text-accent" id="prev-calc-yield">0.0 kWh/kWp</span>
              </div>
              <div class="live-calc-item">
                <span class="lbl"><span class="lang-es">Ahorro Est.:</span><span class="lang-en">Est. Savings:</span></span>
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

function _renderCsvImportModal() {
  return `
    <div id="csv-import-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:34rem;">
        <div class="modal-header">
          <h2 class="modal-title">
            <div class="icon-tile sm solar"><i class="fa-solid fa-file-csv"></i></div>
            <div>
              <span class="lang-es">Importar Historial desde CSV</span>
              <span class="lang-en">Import Readings from CSV</span>
            </div>
          </h2>
          <button id="close-csv-modal" class="modal-close-btn" type="button" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="form-stack">
          <p style="font-size:.82rem;color:var(--text-secondary);line-height:1.5;">
            <span class="lang-es">Carga un archivo CSV con columnas de <strong>Fecha (YYYY-MM-DD)</strong>, <strong>Lectura Red</strong>, <strong>Lectura Solar</strong> y <strong>Tarifa kW</strong>.</span>
            <span class="lang-en">Upload a CSV file containing <strong>Date (YYYY-MM-DD)</strong>, <strong>Grid Reading</strong>, <strong>Solar Reading</strong>, and <strong>kW Tariff</strong>.</span>
          </p>

          <div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap;">
            <button type="button" id="btn-download-csv-template" class="btn btn-ghost btn-sm">
              <i class="fa-solid fa-download text-accent"></i>
              <span class="lang-es">Descargar Plantilla CSV</span>
              <span class="lang-en">Download CSV Template</span>
            </button>
          </div>

          <label class="csv-dropzone" for="csv-file-input">
            <i class="fa-solid fa-cloud-arrow-up text-solar" style="font-size:1.6rem;"></i>
            <div>
              <strong style="display:block;color:var(--text-strong);font-size:.88rem;">
                <span class="lang-es">Seleccionar archivo .CSV</span>
                <span class="lang-en">Choose .CSV file</span>
              </strong>
              <span style="font-size:.75rem;color:var(--muted-light);">UTF-8 · Separado por comas</span>
            </div>
            <input type="file" id="csv-file-input" accept=".csv,text/csv" style="display:none;">
          </label>

          <div id="csv-preview-wrap" class="hidden" style="display:flex;flex-direction:column;gap:.6rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:.78rem;">
              <span class="text-secondary"><span class="lang-es">Registros detectados:</span><span class="lang-en">Detected records:</span></span>
              <span class="count-pill" id="csv-preview-count">0</span>
            </div>
            <div class="table-scroll" style="max-height:180px;border:1px solid var(--border);border-radius:var(--radius-sm);">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th class="text-right">Red</th>
                    <th class="text-right">Solar</th>
                    <th class="text-right">Tarifa</th>
                  </tr>
                </thead>
                <tbody id="csv-preview-tbody"></tbody>
              </table>
            </div>
          </div>

          <button type="button" id="btn-confirm-csv-import" class="btn btn-solar btn-lg btn-block" disabled>
            <i class="fa-solid fa-database"></i>
            <span class="lang-es">Importar y Sincronizar con la Nube</span>
            <span class="lang-en">Import & Sync to Cloud</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function _renderExecutiveReportModal() {
  return `
    <div id="exec-report-modal" class="modal-overlay hidden">
      <div class="modal-box exec-report-modal-box">
        <div class="modal-header no-print">
          <h2 class="modal-title">
            <div class="icon-tile sm solar"><i class="fa-solid fa-file-pdf"></i></div>
            <div>
              <span class="lang-es">Informe Ejecutivo de Planta Solar</span>
              <span class="lang-en">Solar Plant Executive Report</span>
            </div>
          </h2>
          <div style="display:flex;align-items:center;gap:.5rem;">
            <button id="btn-print-exec-report" type="button" class="btn btn-solar btn-sm">
              <i class="fa-solid fa-print"></i>
              <span class="lang-es">Imprimir / Guardar PDF</span>
              <span class="lang-en">Print / Save PDF</span>
            </button>
            <button id="close-exec-report-modal" class="modal-close-btn" type="button" aria-label="Close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div id="exec-report-content"></div>
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
