/**
 * @module dashboardView
 * @description Clean facade orchestrating modular dashboard tabs, modals, and event bindings.
 */

import { state, savePrefs } from "../modules/state.js";
import { renderSidebar, initSidebar } from "../components/sidebar.js";
import { escapeHTML, debounce } from "../modules/utils.js";
import { renderHeader } from "./dashboard/header.js";
import { renderSolarHealthBanner, renderKPIGrid, renderChartsGrid } from "./dashboard/telemetryTab.js";
import { renderROIPanel, renderAIPanel, renderProjectionSection, bindFinancialSimulator } from "./dashboard/financeTab.js";
import { renderDataTable, renderTableRows } from "./dashboard/auditTab.js";
import { renderRecordModal, bindModalLivePreview } from "./dashboard/recordModal.js";
import { renderCsvImportModal, bindCsvImporter } from "./dashboard/csvModal.js";
import { renderExecutiveReportModal, openExecutiveReportModal } from "./dashboard/executiveReport.js";

export { renderTableRows, openExecutiveReportModal };

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
          ${renderHeader(user, project, isAdmin)}

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
                ${renderSolarHealthBanner()}

                <!-- Smart Anomaly & Diagnostic Alerts -->
                <div id="anomaly-alerts-container" class="anomaly-alerts-stack hidden"></div>

                <!-- KPI Grid with sparklines & MoM Deltas -->
                ${renderKPIGrid()}

                <!-- Charts Grid (Energy Balance + Donut Mix + HSP Performance + kW Price) -->
                ${renderChartsGrid()}
              </div>

              <!-- ═══ Tab 2: Finanzas & Retorno ═══ -->
              <div class="tab-pane ${activeTab === 'finance' ? 'active' : ''}" id="pane-finance">
                <!-- ROI Panel with Ring & Payback Chart -->
                ${renderROIPanel(totalInvestment)}

                <!-- AI / Predictive Panel -->
                ${renderAIPanel()}

                <!-- 25-Year Financial Simulator & Projection -->
                ${renderProjectionSection()}
              </div>

              <!-- ═══ Tab 3: Historial Cloud & Auditoría ═══ -->
              <div class="tab-pane ${activeTab === 'audit' ? 'active' : ''}" id="pane-audit">
                <!-- Data Table -->
                ${renderDataTable(isAdmin)}
              </div>
            `}
          </div>

          <div class="app-footer">
            <i class="fa-solid fa-leaf" style="color:var(--solar);"></i>
            <span>JF Solar Cloud v4.0 / Plataforma empresarial de analítica fotovoltaica</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Presentation / Kiosk Floating HUD Bar ═══ -->
    <div id="kiosk-floating-bar" class="kiosk-bar ${state.kioskMode ? '' : 'hidden'}">
      <div class="kiosk-bar-brand">
        <span class="online-dot"></span>
        <strong>${escapeHTML(project.name || 'Planta Solar')}</strong>
        <span class="kiosk-tag">${state.lang === 'en' ? 'Live Kiosk' : 'Kiosk en vivo'}</span>
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
    ${renderRecordModal()}

    <!-- ═══ CSV Importer Modal ═══ -->
    ${renderCsvImportModal()}

    <!-- ═══ Executive Report Modal (PDF / Print) ═══ -->
    ${renderExecutiveReportModal()}
  `;
}

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
      requestAnimationFrame(() => {
        if (typeof onTabChange === 'function') {
          onTabChange(tabKey);
        }
        Object.values(state.charts).forEach(c => c?.resize?.());
      });
    });
  });

  // Table search filter (debounced)
  const tableSearch = document.getElementById('table-search-input');
  if (tableSearch) {
    tableSearch.addEventListener('input', debounce((e) => {
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
    }, 120));
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
  bindModalLivePreview();

  // Interactive 25-year Simulator Sliders
  bindFinancialSimulator(onSimChange);

  // CSV Import Modal bindings
  bindCsvImporter(onImportCsv);

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
