/**
 * @module app
 * JF Solar Cloud — Multi-Project Enterprise Platform v4.0
 * Main entry point, router, and orchestrator
 */
import './app.css';
import { state, setUser, setActiveProject, clearProjectData, setView, savePrefs } from './modules/state.js';
import {
  signIn,
  signOut,
  getSession,
  getUserRole,
  getUserProjects,
  getProject,
  createProject,
  updateProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  updateMemberRole,
  getUserProjectRole,
  getProjectInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  fetchProjectReadings,
  upsertRecord,
  batchUpsertRecords,
  deleteRecord,
  getProjectCount,
} from './modules/supabase.js';
import { fCOP, fDec, fKwh, fPct, fYield, fHsp, fDailyRate } from './modules/formatters.js';
import { t } from './modules/i18n.js';
import {
  processData,
  getBaseRecord,
  filterByYear,
  getAvailableYears,
  detectAnomalies,
  calcProjections,
  calcKPIs,
} from './modules/analytics.js';
import {
  renderEnergyChart,
  renderMixChart,
  renderPerformanceChart,
  renderPriceChart,
  renderPaybackChart,
  renderProjectionChart,
  renderSparkline,
  destroyAllCharts,
  CHART_COLORS,
} from './modules/charts.js';

import * as loginView from './views/loginView.js';
import * as projectSelectorView from './views/projectSelectorView.js';
import * as dashboardView from './views/dashboardView.js';
import * as projectSettingsView from './views/projectSettingsView.js';
import * as membersView from './views/membersView.js';
import * as solarmanView from './views/solarmanView.js';
import {
  solarmanRuntime,
  getSolarmanSession,
  clearSolarmanSession,
  resetSolarmanRuntime,
  authenticateSolarman,
  activateDemoSolarmanSession,
  syncProjectSolarmanTelemetry,
  startSolarmanLiveSync,
  stopSolarmanLiveSync,
} from './modules/solarman.js';

import { showModal, showConfirmModal, closeModal as closeGlobalModal } from './components/modal.js';

// ── App Container ─────────────────────────────────────────────────────────────
const app = () => document.getElementById('app');

// ── Toast Notification ────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3200) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-info';
  toast.innerHTML = `
    <div class="toast-icon"><i class="fa-solid ${icon}"></i></div>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

// ── Theme & Presentation Mode ─────────────────────────────────────────────────
function applyTheme(theme) {
  state.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  savePrefs();
}

function toggleTheme() {
  applyTheme(state.theme === 'light' ? 'dark' : 'light');
  if (state.currentView === 'projects') {
    app().innerHTML = projectSelectorView.render();
    projectSelectorView.init(handleSelectProject, handleCreateProject, handleLogout);
  } else if (state.activeProject) {
    renderDashboardView(state.currentView || 'dashboard');
  }
}

function toggleKioskMode(forceState) {
  const next = typeof forceState === 'boolean' ? forceState : !state.kioskMode;
  state.kioskMode = next;
  document.body.classList.toggle('kiosk-mode', next);
  const kioskBar = document.getElementById('kiosk-floating-bar');
  if (kioskBar) kioskBar.classList.toggle('hidden', !next);

  if (!next && state.kioskTimer) {
    clearInterval(state.kioskTimer);
    state.kioskTimer = null;
  }

  if (next) {
    document.documentElement.requestFullscreen?.().catch(() => {});
    showToast(
      state.lang === 'en' ? 'Presentation Mode Activated (ESC to exit)' : 'Modo Presentación Activado',
      'info',
    );
  } else if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }

  setTimeout(() => {
    Object.values(state.charts).forEach(c => c?.resize?.());
  }, 120);
}

// ── Language ──────────────────────────────────────────────────────────────────
function changeLang(lang, flagCode, text) {
  state.lang = lang;
  document.body.setAttribute('data-lang', lang);
  savePrefs();

  const flagEl = document.getElementById('current-flag');
  const txtEl = document.getElementById('current-lang-text');
  if (flagEl) flagEl.innerHTML = `<img src="https://flagcdn.com/w20/${flagCode}.png" class="flag-img" alt="flag">`;
  if (txtEl) txtEl.innerText = text;
  document.activeElement?.blur();
  document.getElementById('lang-menu')?.classList.add('hidden');

  if (state.currentView === 'projects') {
    app().innerHTML = projectSelectorView.render();
    projectSelectorView.init(handleSelectProject, handleCreateProject, handleLogout);
    return;
  }

  if (state.rawData.length) {
    state.processedData = processData(state.rawData);
    renderDashboardData();
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
async function navigate(view, opts = {}) {
  destroyAllCharts();
  setView(view);

  switch (view) {
    case 'login':
      app().innerHTML = loginView.render();
      loginView.init(handleLogin);
      break;

    case 'projects':
      await loadProjects();
      app().innerHTML = projectSelectorView.render();
      projectSelectorView.init(handleSelectProject, handleCreateProject, handleLogout);
      break;

    case 'dashboard':
      if (opts.projectId) {
        await loadProjectData(opts.projectId);
      }
      renderDashboardView('dashboard');
      break;

    case 'settings':
      renderDashboardView('settings');
      break;

    case 'investments':
      renderDashboardView('investments');
      break;

    case 'members':
      renderDashboardView('members');
      break;

    case 'solarman':
      renderDashboardView('solarman');
      break;

    default:
      navigate('login');
  }
}

// ── Dashboard View Rendering ──────────────────────────────────────────────────
async function renderDashboardView(subView) {
  if (subView !== 'solarman') {
    stopSolarmanLiveSync();
  }
  state.currentView = subView;

  let contentHTML = null;
  let members = [];

  if (subView === 'settings' || subView === 'investments') {
    contentHTML = projectSettingsView.render(subView);
  } else if (subView === 'members') {
    members = state.activeProject ? await getProjectMembers(state.activeProject.id) : [];
    contentHTML = membersView.render(members);
  } else if (subView === 'solarman') {
    contentHTML = solarmanView.render();
  }

  app().innerHTML = dashboardView.render(contentHTML);

  dashboardView.init({
    onYearChange: () => renderDashboardData(),
    onSaveRecord: handleSaveRecord,
    onDeleteRecord: handleDeleteRecord,
    onEditRecord: (id) => openRecordModal('edit', id),
    onOpenNewRecord: () => openRecordModal('new'),
    onToggleChartMode: handleToggleChartMode,
    onLogout: handleLogout,
    onNavigate: handleSidebarNavigate,
    onLangChange: changeLang,
    onExportCsv: handleExportCsv,
    onImportCsv: handleImportCsv,
    onSimChange: () => renderProjectionChart(),
    onToggleTheme: toggleTheme,
    onToggleKiosk: toggleKioskMode,
    onTabChange: (tab) => {
      if (tab === 'telemetry' || tab === 'finance') {
        renderDashboardData();
      }
    },
  });

  switch (subView) {
    case 'dashboard':
      renderDashboardData();
      break;

    case 'settings':
    case 'investments':
      projectSettingsView.init({
        onSaveSettings: handleSaveSettings,
        onCreatePhase: handleCreatePhase,
        onEditPhase: handleEditPhase,
        onDeletePhase: handleDeletePhase,
      });
      break;

    case 'members':
      membersView.init({
        onAddMember: handleAddMember,
        onRemoveMember: handleRemoveMember,
        onChangeRole: handleChangeRole,
      });
      break;

    case 'solarman':
      await initAndSyncSolarmanView();
      break;
  }
}

async function loadAndRenderMembers() {
  await renderDashboardView('members');
}

// ── Solarman Live View Orchestration ──────────────────────────────────────────
function refreshSolarmanDOM() {
  if (state.currentView !== 'solarman') return;
  const contentArea = document.getElementById('dashboard-content-area');
  if (!contentArea) return;
  contentArea.innerHTML = solarmanView.render();
  bindSolarmanViewCallbacks();
}

function bindSolarmanViewCallbacks() {
  solarmanView.init({
    onConnect: async (creds) => {
      try {
        solarmanRuntime.error = null;
        await authenticateSolarman(creds);
        solarmanRuntime.loading = true;
        refreshSolarmanDOM();
        await syncProjectSolarmanTelemetry(state.activeProject);
        solarmanRuntime.loading = false;
        refreshSolarmanDOM();
        showToast(
          state.lang === 'en'
            ? 'Connected to Solarman Cloud successfully'
            : 'Conectado a Solarman Cloud exitosamente',
          'success',
        );
        startSolarmanLiveSync({
          getActiveProject: () => state.activeProject,
          onUpdate: (rt) => {
            refreshSolarmanDOM();
            if (rt.justUpdatedPacket) {
              showToast(
                state.lang === 'en'
                  ? 'New inverter packet received from Solarman!'
                  : '¡Nuevo paquete del inversor recibido desde Solarman!',
                'success',
              );
            }
          },
          onTick: () => solarmanView.updateLiveTickerLabels(),
        });
      } catch (err) {
        solarmanRuntime.loading = false;
        solarmanRuntime.error = err.message;
        refreshSolarmanDOM();
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    },

    onActivateDemo: async () => {
      try {
        solarmanRuntime.error = null;
        activateDemoSolarmanSession(state.activeProject);
        solarmanRuntime.loading = true;
        refreshSolarmanDOM();
        await syncProjectSolarmanTelemetry(state.activeProject);
        solarmanRuntime.loading = false;
        refreshSolarmanDOM();
        showToast(
          state.lang === 'en'
            ? 'Multi-Plant Demo Mode activated (updates every 15s)'
            : 'Modo Demo Multi-Planta activado (actualiza cada 15s)',
          'info',
        );
        startSolarmanLiveSync({
          getActiveProject: () => state.activeProject,
          onUpdate: () => refreshSolarmanDOM(),
          onTick: () => solarmanView.updateLiveTickerLabels(),
        });
      } catch (err) {
        solarmanRuntime.loading = false;
        solarmanRuntime.error = err.message;
        refreshSolarmanDOM();
      }
    },

    onDisconnect: () => {
      clearSolarmanSession();
      refreshSolarmanDOM();
      showToast(
        state.lang === 'en' ? 'Solarman account disconnected' : 'Cuenta de Solarman desconectada',
        'info',
      );
    },

    onSelectStation: async (stationId) => {
      try {
        solarmanRuntime.error = null;
        solarmanRuntime.loading = true;
        solarmanRuntime.showStationPicker = false;
        refreshSolarmanDOM();
        await syncProjectSolarmanTelemetry(state.activeProject, stationId, null);
        solarmanRuntime.loading = false;
        refreshSolarmanDOM();
        const stName = solarmanRuntime.activeStation?.name || stationId;
        showToast(
          state.lang === 'en'
            ? `Plant "${stName}" bound to ${state.activeProject?.name}`
            : `Planta "${stName}" vinculada al proyecto ${state.activeProject?.name}`,
          'success',
        );
        startSolarmanLiveSync({
          getActiveProject: () => state.activeProject,
          onUpdate: () => refreshSolarmanDOM(),
          onTick: () => solarmanView.updateLiveTickerLabels(),
        });
      } catch (err) {
        solarmanRuntime.loading = false;
        solarmanRuntime.error = err.message;
        refreshSolarmanDOM();
      }
    },

    onOpenStationPicker: () => {
      solarmanRuntime.showStationPicker = true;
      refreshSolarmanDOM();
    },

    onCloseStationPicker: () => {
      solarmanRuntime.showStationPicker = false;
      refreshSolarmanDOM();
    },

    onSelectDevice: async (deviceSn) => {
      try {
        solarmanRuntime.loading = true;
        refreshSolarmanDOM();
        await syncProjectSolarmanTelemetry(
          state.activeProject,
          solarmanRuntime.activeStation?.id,
          deviceSn,
        );
        solarmanRuntime.loading = false;
        refreshSolarmanDOM();
      } catch (err) {
        solarmanRuntime.loading = false;
        solarmanRuntime.error = err.message;
        refreshSolarmanDOM();
      }
    },

    onManualRefresh: async () => {
      try {
        solarmanRuntime.loading = true;
        refreshSolarmanDOM();
        await syncProjectSolarmanTelemetry(
          state.activeProject,
          solarmanRuntime.activeStation?.id,
          solarmanRuntime.activeDeviceSn,
        );
        solarmanRuntime.loading = false;
        refreshSolarmanDOM();
        showToast(
          state.lang === 'en'
            ? 'Solarman telemetry updated'
            : 'Telemetría de Solarman actualizada',
          'success',
        );
      } catch (err) {
        solarmanRuntime.loading = false;
        solarmanRuntime.error = err.message;
        refreshSolarmanDOM();
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    },

    onPushReadingToCloud: (totalKwh) => {
      openRecordModal('new');
      const lsInput = document.getElementById('new-lectura-solar');
      if (lsInput && totalKwh > 0) {
        lsInput.value = String(totalKwh);
      }
      // Pre-fill latest tariff and grid reading as helpful reference if available
      if (state.rawData && state.rawData.length > 0) {
        const lastRec = state.rawData[state.rawData.length - 1];
        const pInput = document.getElementById('new-precio');
        if (pInput && (!pInput.value || pInput.value === '0') && lastRec.precioKw) {
          pInput.value = String(lastRec.precioKw);
        }
      }
      lsInput?.dispatchEvent(new Event('input'));
      showToast(
        state.lang === 'en'
          ? `Inverter reading (${totalKwh} kWh) loaded into form`
          : `Lectura acumulada del inversor (${totalKwh} kWh) cargada en el formulario`,
        'info',
      );
    },
  });
}

async function initAndSyncSolarmanView() {
  bindSolarmanViewCallbacks();
  const session = getSolarmanSession();
  if (!session || !state.activeProject) return;

  // Ensure we load the station strictly bound to the current activeProject.id
  if (
    solarmanRuntime.loadedProjectId !== state.activeProject.id ||
    (!solarmanRuntime.activeStation && !solarmanRuntime.showStationPicker)
  ) {
    try {
      solarmanRuntime.loading = true;
      refreshSolarmanDOM();
      await syncProjectSolarmanTelemetry(state.activeProject);
      solarmanRuntime.loading = false;
      refreshSolarmanDOM();
    } catch (err) {
      solarmanRuntime.loading = false;
      solarmanRuntime.error = err.message;
      refreshSolarmanDOM();
    }
  }

  startSolarmanLiveSync({
    getActiveProject: () => state.activeProject,
    onUpdate: (rt) => {
      refreshSolarmanDOM();
      if (rt.justUpdatedPacket) {
        showToast(
          state.lang === 'en'
            ? 'New inverter packet received from Solarman!'
            : '¡Nuevo paquete del inversor recibido desde Solarman!',
          'success',
        );
      }
    },
    onTick: () => solarmanView.updateLiveTickerLabels(),
  });
}

// ── Dashboard Data Rendering ──────────────────────────────────────────────────
function renderDashboardData() {
  const yearSelect = document.getElementById('year-filter');
  const availableYears = getAvailableYears(state.processedData, state.rawData);

  // Ensure selectedYear is valid for the current project's data
  if (
    state.selectedYear !== 'all' &&
    !availableYears.includes(parseInt(state.selectedYear, 10))
  ) {
    state.selectedYear = 'all';
  }

  if (yearSelect) {
    const selectedStr = String(state.selectedYear || 'all');
    yearSelect.innerHTML = [
      `<option value="all" ${selectedStr === 'all' ? 'selected' : ''}>${state.lang === 'en' ? 'All Years' : 'Todos los Años'}</option>`,
      ...availableYears.map(y => `<option value="${y}" ${selectedStr === String(y) ? 'selected' : ''}>${y}</option>`),
    ].join('');
  }

  const year = yearSelect?.value || state.selectedYear || 'all';
  state.viewData = filterByYear(state.processedData, year);

  // Table shows all records when year === 'all', or filtered by year
  const tableData = year === 'all'
    ? [...state.processedData]
    : state.processedData.filter(d => d.year === parseInt(year, 10));

  // Include Initial Base Reading (t0) if viewing 'all' or the year of the base reading
  const baseRec = getBaseRecord(state.rawData);
  const showBaseRec = baseRec && (year === 'all' || baseRec.year === parseInt(year, 10))
    ? baseRec
    : null;

  setText('tab-readings-count', String(state.rawData?.length || 0));

  // Render main & secondary charts
  renderEnergyChart(state.viewData);
  renderMixChart(state.viewData);
  renderPerformanceChart(state.viewData);
  renderPriceChart(state.viewData);
  renderPaybackChart();
  renderProjectionChart();

  // Render KPI Sparklines
  renderSparkline('spark-kpi-ahorro', state.viewData.map(d => d.ahorroReal), CHART_COLORS.solar);
  renderSparkline('spark-kpi-produccion', state.viewData.map(d => d.prodBruta), CHART_COLORS.accent);
  renderSparkline('spark-kpi-autonomia', state.viewData.map(d => d.autonomia), CHART_COLORS.ai);
  renderSparkline('spark-kpi-var-kw', state.viewData.map(d => d.precioKw), CHART_COLORS.warning);

  // Render table
  const tbody = document.getElementById('table-body');
  if (tbody && dashboardView.renderTableRows) {
    tbody.innerHTML = dashboardView.renderTableRows(
      tableData,
      state.isAdmin || state.activeProjectRole === 'admin',
      showBaseRec,
    );
    bindTableEvents(tbody);
  }

  // Update KPIs
  const capacity = state.activeProject?.capacity_kw || 0;
  const kpis = calcKPIs(state.viewData, state.processedData, state.investments, capacity);
  const totalInv = (state.investments || []).reduce((a, i) => a + (parseFloat(i.investment_cop) || 0), 0);

  // Update Solar Engineering Telemetry Banner
  setText('sh-specific-yield', fYield(kpis.specificYield));
  setText('sh-avg-hsp', fHsp(kpis.lastHsp ?? kpis.avgHsp));
  setText('sh-pr-val', kpis.pr > 0 ? `${fDec(kpis.pr, 1)}%` : '—');
  setText('sh-daily-gen', fDailyRate(kpis.avgDailyGen));

  const healthPill = document.getElementById('sh-health-pill');
  const healthText = document.getElementById('sh-health-text');
  if (healthPill) {
    healthPill.className = `health-pill ${kpis.healthScore}`;
  }
  if (healthText) {
    healthText.innerText = kpis.healthLabel;
  }

  // Render Smart Anomaly Alerts
  _renderAnomalyAlerts(detectAnomalies(state.viewData));

  // Update KPI values + MoM Delta pills
  setText('kpi-ahorro', fCOP(kpis.savings));
  setText('kpi-produccion', fKwh(kpis.gen));
  setText('kpi-autonomia', fPct(kpis.autonomy));
  setText('kpi-var-kw', fPct(kpis.varKw));

  _setDeltaBadge('delta-kpi-ahorro', kpis.deltas.savings, false);
  _setDeltaBadge('delta-kpi-produccion', kpis.deltas.gen, false);
  _setDeltaBadge('delta-kpi-autonomia', kpis.deltas.autonomy, false, ' pts');
  _setDeltaBadge('delta-kpi-var-kw', kpis.deltas.price, true);

  const paybackMonths = kpis.avgSavings > 0 ? (totalInv / kpis.avgSavings) : 0;
  const paybackYears = paybackMonths / 12;
  setText('roi-time', paybackYears > 0 ? fDec(paybackYears, 1) : '0');
  setText('roi-avg-savings', fCOP(kpis.avgSavings));
  setText('roi-total-investment', fCOP(totalInv));

  // Update ROI Progress bar & Radial Ring
  const totalSavingsAll = state.processedData.reduce((s, d) => s + (d.ahorroReal || 0), 0);
  const progressPct = totalInv > 0 ? Math.min(100, Math.max(0, (totalSavingsAll / totalInv) * 100)) : 0;
  const progressBarFill = document.getElementById('roi-progress-bar-fill');
  const progressPercentText = document.getElementById('roi-progress-percent');
  if (progressBarFill) progressBarFill.style.width = `${progressPct.toFixed(1)}%`;
  if (progressPercentText) progressPercentText.innerText = `${progressPct.toFixed(1)}% (${fCOP(totalSavingsAll)})`;

  const roiRing = document.getElementById('roi-ring');
  if (roiRing) roiRing.style.setProperty('--p', progressPct.toFixed(1));
  setText('roi-ring-value', `${progressPct.toFixed(0)}%`);
  setText('roi-total-saved-pill', fCOP(totalSavingsAll));

  // Update Econometric Projections & Eco-Metrics (Both ES and EN targets)
  const proj = calcProjections(state.viewData);
  const isEn = state.lang === 'en';
  setText('ai-precio-futuro', fCOP(proj.projectedPrice));
  setText('ai-rango-confianza', `${isEn ? 'Band' : 'Banda'}: ± ${fCOP(proj.confidenceMargin)}`);
  setText('ai-cagr', `CAGR: ${proj.cagrPct > 0 ? '+' : ''}${proj.cagrPct}% ${isEn ? 'yr' : 'anual'}`);
  setText('ai-precio-6m', fCOP(proj.projectedPrice6m));
  setText('ai-ahorro-mes', fCOP(proj.projectedMonthlySavings));
  setText('ai-mejor-mes', proj.bestMonth);
  setText('ai-mejor-mes-en', proj.bestMonth);
  setText('ai-co2', `${proj.co2} kg`);
  setText('ai-co2-en', `${proj.co2} kg`);
  setText('eco-trees', String(proj.trees));
  setText('eco-trees-en', String(proj.trees));

  const modelBadge = document.getElementById('ai-model-badge');
  if (modelBadge) modelBadge.innerText = `R² ${proj.rSquared}% ${isEn ? 'Confidence' : 'Confianza'}`;

  const tEl = document.getElementById('ai-tendencia');
  if (tEl) tEl.innerHTML = `<span class="${proj.trendColor}"><i class="fa-solid ${proj.trendIcon}"></i> ${proj.trend}</span>`;
}

function _setDeltaBadge(elId, val, invertColors = false, suffix = '%') {
  const el = document.getElementById(elId);
  if (!el) return;
  if (val === null || val === undefined || Number.isNaN(val)) {
    el.innerHTML = '';
    return;
  }
  const num = parseFloat(val);
  const isUp = num > 0.05;
  const isDown = num < -0.05;
  const icon = isUp ? 'fa-arrow-trend-up' : isDown ? 'fa-arrow-trend-down' : 'fa-minus';
  let tone = '';
  if (isUp) tone = invertColors ? 'down' : 'up';
  if (isDown) tone = invertColors ? 'up' : 'down';
  const vsText = state.lang === 'en' ? 'MoM' : 'vs ant.';
  el.innerHTML = `
    <span class="delta ${tone}">
      <i class="fa-solid ${icon}"></i> ${num > 0 ? '+' : ''}${fDec(num, 1)}${suffix} ${vsText}
    </span>
  `;
}

function _renderAnomalyAlerts(alerts) {
  const container = document.getElementById('anomaly-alerts-container');
  if (!container) return;
  if (!alerts || alerts.length === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }
  container.classList.remove('hidden');
  container.innerHTML = alerts.map(a => `
    <div class="anomaly-banner ${a.type}">
      <div class="anomaly-icon">
        <i class="fa-solid ${a.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-bolt'}"></i>
      </div>
      <div class="anomaly-content">
        <strong>
          <span class="lang-es">${a.titleEs}</span>
          <span class="lang-en">${a.titleEn}</span>
        </strong>
        <p>
          <span class="lang-es">${a.descEs}</span>
          <span class="lang-en">${a.descEn}</span>
        </p>
      </div>
    </div>
  `).join('');
}

function bindTableEvents(tbody) {
  if (!state.isAdmin && state.activeProjectRole !== 'admin') {
    tbody.querySelectorAll('tr[data-row-id]').forEach(tr => {
      tr.addEventListener('click', () => {
        const det = document.getElementById(`det-${tr.dataset.rowId}`);
        if (det) {
          tr.classList.toggle('expanded');
          det.classList.toggle('hidden');
        }
      });
    });
    return;
  }

  tbody.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openRecordModal('edit', btn.dataset.id);
    }),
  );

  tbody.querySelectorAll('.del-btn').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showConfirmModal({
        titleEs: 'Eliminar Registro Solar',
        titleEn: 'Delete Solar Record',
        messageEs: `¿Confirmas que deseas eliminar el registro de ${btn.dataset.fecha}? Esta acción recalculará los balances del período.`,
        messageEn: `Are you sure you want to delete the record for ${btn.dataset.fecha}? This will recalculate period balances.`,
        confirmBtnEs: 'Eliminar Registro',
        confirmBtnEn: 'Delete Record',
        isDanger: true,
        onConfirm: async () => {
          try {
            await deleteRecord(btn.dataset.id, btn.dataset.fecha);
            await reloadProjectData();
            renderDashboardData();
            showToast(state.lang === 'es' ? 'Registro eliminado exitosamente' : 'Record deleted successfully', 'success');
          } catch (err) {
            showToast(`${t('error')}: ${err.message}`, 'error');
          }
        },
      });
    }),
  );

  tbody.querySelectorAll('tr[data-row-id]').forEach(tr => {
    tr.addEventListener('click', () => {
      const det = document.getElementById(`det-${tr.dataset.rowId}`);
      if (det) {
        tr.classList.toggle('expanded');
        det.classList.toggle('hidden');
      }
    });
  });
}

// ── Segmented Chart Mode Toggle ───────────────────────────────────────────────
function handleToggleChartMode(chartKey, mode) {
  if (chartKey === 'energia') {
    state.chartModes.energia = mode;
    renderEnergyChart(state.viewData);
    document.querySelectorAll('#control-chart-energia .segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  } else if (chartKey === 'precio') {
    state.chartModes.precio = mode;
    renderPriceChart(state.viewData);
    document.querySelectorAll('#control-chart-precio .segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }
}

// ── Export & Import CSV Handlers ──────────────────────────────────────────────
function handleExportCsv() {
  if (!state.rawData || state.rawData.length === 0) {
    showToast(state.lang === 'es' ? 'No hay lecturas registradas para exportar' : 'No readings available to export', 'error');
    return;
  }

  const headers = [
    'Periodo',
    'Fecha',
    'Dias Facturados',
    'Lectura Red (Medidor)',
    'Lectura Solar (Inversor)',
    'Consumo Red (kWh)',
    'Generacion Solar (kWh)',
    'Rendimiento Especifico (kWh/kWp)',
    'Horas Sol Pico (HSP)',
    'Performance Ratio (%)',
    'Generacion Diaria (kWh/dia)',
    'Consumo Total (kWh)',
    'Autonomia (%)',
    'Tarifa kW (COP)',
    'Ahorro Generado (COP)',
    'Reinicio Inversor',
    'Reinicio Medidor Red',
  ];

  const baseRec = getBaseRecord(state.rawData);
  const baseRow = baseRec
    ? [[
        `"${baseRec.label} (Base)"`,
        `"${baseRec.fecha}"`,
        0,
        baseRec.lecturaRed ?? 0,
        baseRec.lecturaSolar ?? 0,
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        baseRec.precioKw ?? 0,
        '0.00',
        baseRec.inverter_reset ? 'SI' : 'NO',
        baseRec.meter_reset ? 'SI' : 'NO',
      ]]
    : [];

  const rows = state.processedData.map(d => [
    `"${d.label}"`,
    `"${d.fecha}"`,
    d.daysInPeriod || 30,
    d.lecturaRed ?? 0,
    d.lecturaSolar ?? 0,
    (d.consumoRed ?? 0).toFixed(2),
    (d.prodBruta ?? 0).toFixed(2),
    (d.specificYield ?? 0).toFixed(2),
    (d.hsp ?? 0).toFixed(2),
    (d.pr ?? 0).toFixed(2),
    (d.prodDiaria ?? 0).toFixed(2),
    (d.consumoTotal ?? 0).toFixed(2),
    (d.autonomia ?? 0).toFixed(2),
    d.precioKw ?? 0,
    (d.ahorroReal ?? 0).toFixed(2),
    d.inverter_reset ? 'SI' : 'NO',
    d.meter_reset ? 'SI' : 'NO',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...baseRow.map(r => r.join(',')), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const slug = (state.activeProject?.name || 'solar-app').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.setAttribute('href', url);
  link.setAttribute('download', `${slug}-reporte-solar-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(state.lang === 'es' ? 'Reporte CSV descargado correctamente' : 'CSV Report downloaded successfully', 'success');
}

async function handleImportCsv(records) {
  if (!records || records.length === 0) return;
  try {
    showToast(state.lang === 'es' ? `Importando ${records.length} registros...` : `Importing ${records.length} records...`, 'info');
    const count = await batchUpsertRecords(records);
    await reloadProjectData();
    renderDashboardData();
    showToast(
      state.lang === 'es'
        ? `${count} registros importados exitosamente`
        : `${count} records imported successfully`,
      'success',
    );
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

// ── Data Loading ──────────────────────────────────────────────────────────────
async function loadProjects() {
  if (!state.user) return;
  try {
    const projects = await getUserProjects(state.user.id, state.isAdmin);
    state.projects = projects || [];
  } catch {
    state.projects = [];
  }
}

async function loadProjectData(projectId) {
  try {
    // Isolate Solarman runtime state when switching projects
    if (solarmanRuntime.loadedProjectId && solarmanRuntime.loadedProjectId !== projectId) {
      stopSolarmanLiveSync();
      resetSolarmanRuntime();
    }

    const project = await getProject(projectId);
    if (!project) throw new Error('Project not found');

    const role = state.isAdmin ? 'admin' : await getUserProjectRole(projectId, state.user.id);
    setActiveProject(project, role || 'observer');

    const readings = await fetchProjectReadings(projectId);
    state.rawData = (readings || []).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if ((a.monthIdx || 0) !== (b.monthIdx || 0)) return (a.monthIdx || 0) - (b.monthIdx || 0);
      return (a.fecha || '').localeCompare(b.fecha || '');
    });
    state.processedData = processData(state.rawData);

    const investments = await getProjectInvestments(projectId);
    state.investments = investments || [];
  } catch (e) {
    console.error('Error loading project data:', e);
    clearProjectData();
  }
}

async function reloadProjectData() {
  if (!state.activeProject) return;
  const readings = await fetchProjectReadings(state.activeProject.id);
  state.rawData = (readings || []).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if ((a.monthIdx || 0) !== (b.monthIdx || 0)) return (a.monthIdx || 0) - (b.monthIdx || 0);
    return (a.fecha || '').localeCompare(b.fecha || '');
  });
  state.processedData = processData(state.rawData);
}

// ── Event Handlers ────────────────────────────────────────────────────
async function handleLogin(email, password) {
  const btn = document.getElementById('btn-login');
  const orig = btn?.innerHTML;
  if (btn) { btn.innerHTML = `<i class="fa-solid fa-circle-notch spin"></i> ${t('connecting')}`; btn.disabled = true; }

  try {
    const result = await signIn(email, password);
    if (result.error || !result.user) {
      showToast(`${t('error')}: Verifica tus credenciales`, 'error');
      if (btn) { btn.innerHTML = orig; btn.disabled = false; }
      return;
    }
    state.user = result.user;
    const role = await getUserRole(state.user.email);
    state.isAdmin = role === 'admin';

    if (state.isAdmin) {
      await navigate('projects');
    } else {
      await loadProjects();
      if (state.projects.length === 1) {
        await navigate('dashboard', { projectId: state.projects[0].id });
      } else if (state.projects.length === 0) {
        app().innerHTML = `
          <div class="empty-state" style="min-height:100vh">
            <i class="fa-solid fa-folder-open"></i>
            <h3><span class="lang-es">${t('noProjectsAssigned')}</span><span class="lang-en">${t('noProjectsAssigned')}</span></h3>
            <p><span class="lang-es">${t('contactAdmin')}</span><span class="lang-en">${t('contactAdmin')}</span></p>
            <button class="btn btn-ghost" style="margin-top:1.5rem" onclick="window.__logout()">
              <i class="fa-solid fa-power-off"></i> Logout
            </button>
          </div>`;
        window.__logout = handleLogout;
      } else {
        await navigate('projects');
      }
    }
  } catch (e) {
    showToast(`${t('error')}: ${e.message}`, 'error');
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  }
}

async function handleLogout() {
  stopSolarmanLiveSync();
  resetSolarmanRuntime();
  await signOut();
  state.user = null;
  state.isAdmin = false;
  state.projects = [];
  clearProjectData();
  setActiveProject(null, null);
  navigate('login');
}

async function handleSelectProject(projectId) {
  await navigate('dashboard', { projectId });
}

async function handleCreateProject() {
  const count = await getProjectCount();
  if (count >= 20) {
    showToast(t('maxProjectsReached'), 'error');
    return;
  }

  const bodyHTML = `
    <form id="create-project-form" class="create-project-form" style="display:flex;flex-direction:column;gap:1.15rem;">
      <div class="field">
        <label><span class="lang-es">Nombre del Proyecto</span><span class="lang-en">Project Name</span></label>
        <input type="text" id="cp-name" required placeholder="Mi Planta Solar Residencial">
      </div>
      <div class="field-row">
        <div class="field">
          <label><span class="lang-es">Ubicación</span><span class="lang-en">Location</span></label>
          <input type="text" id="cp-location" placeholder="Cali, Colombia">
        </div>
        <div class="field">
          <label><span class="lang-es">Capacidad (kW)</span><span class="lang-en">Capacity (kW)</span></label>
          <input type="number" id="cp-capacity" step="0.1" placeholder="3.5">
        </div>
      </div>
      <div class="field">
        <label><span class="lang-es">Descripción</span><span class="lang-en">Description</span></label>
        <textarea id="cp-description" rows="2" placeholder="Sistema solar fotovoltaico interconectado a la red..."></textarea>
      </div>
      <div class="field-row">
        <div class="field">
          <label><span class="lang-es">Cantidad Paneles</span><span class="lang-en">Panels</span></label>
          <input type="number" id="cp-panels" placeholder="6">
        </div>
        <div class="field">
          <label><span class="lang-es">Modelo Inversor</span><span class="lang-en">Inverter Model</span></label>
          <input type="text" id="cp-inverter" placeholder="DEYE SUN-5K">
        </div>
      </div>
      <div class="field">
        <label><span class="lang-es">URL Portal de Monitoreo</span><span class="lang-en">Monitoring URL</span></label>
        <input type="url" id="cp-monitoring" placeholder="https://www.dessmonitor.com/">
      </div>
      <button type="submit" class="btn btn-solar btn-lg" style="margin-top:.5rem">
        <i class="fa-solid fa-plus"></i>
        <span class="lang-es">Crear Proyecto Solar</span><span class="lang-en">Create Solar Project</span>
      </button>
    </form>`;

  showModal('Nuevo Proyecto Solar', 'New Solar Project', bodyHTML);

  setTimeout(() => {
    document.getElementById('create-project-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('cp-name')?.value?.trim();
      if (!name) return;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      try {
        await createProject({
          name,
          slug: slug + '-' + Date.now().toString(36),
          description: document.getElementById('cp-description')?.value || '',
          location: document.getElementById('cp-location')?.value || '',
          capacity_kw: parseFloat(document.getElementById('cp-capacity')?.value) || 0,
          panel_count: parseInt(document.getElementById('cp-panels')?.value, 10) || 0,
          inverter_model: document.getElementById('cp-inverter')?.value || '',
          monitoring_url: document.getElementById('cp-monitoring')?.value || '',
          owner_id: state.user.id,
        }, state.user.email);

        closeGlobalModal();
        showToast(state.lang === 'es' ? 'Proyecto creado exitosamente' : 'Project created successfully', 'success');
        await navigate('projects');
      } catch (err) {
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    });
  }, 100);
}

function handleSidebarNavigate(viewName) {
  if (viewName === 'projects' || viewName === 'switch-project') {
    stopSolarmanLiveSync();
    resetSolarmanRuntime();
    setActiveProject(null, null);
    navigate('projects');
    return;
  }
  renderDashboardView(viewName);
}

function openRecordModal(action = 'new', id = null) {
  const modal = document.getElementById('add-record-modal');
  if (!modal) return;
  document.getElementById('add-record-form')?.reset();
  const editId = document.getElementById('edit-id');
  if (editId) editId.value = '';

  const esTitle = document.getElementById('modal-title-es');
  const enTitle = document.getElementById('modal-title-en');

  if (action === 'new') {
    if (esTitle) esTitle.innerText = 'Nuevo Registro Cloud';
    if (enTitle) enTitle.innerText = 'New Cloud Record';
    const now = new Date();
    const f = document.getElementById('new-fecha');
    if (f) f.value = now.toISOString().slice(0, 10);
  } else if (action === 'edit' && id) {
    if (esTitle) esTitle.innerText = 'Editar Registro Cloud';
    if (enTitle) enTitle.innerText = 'Edit Cloud Record';
    const rec = state.rawData.find(d => d.id === id);
    if (rec && editId) {
      editId.value = rec.id;
      const f = document.getElementById('new-fecha'); if (f) f.value = rec.fecha;
      const lr = document.getElementById('new-lectura-red'); if (lr) lr.value = rec.lecturaRed ?? rec.medidorRed ?? 0;
      const ls = document.getElementById('new-lectura-solar'); if (ls) ls.value = rec.lecturaSolar ?? rec.inversores ?? 0;
      const p = document.getElementById('new-precio'); if (p) p.value = rec.precioKw || 0;
      const reset = document.getElementById('new-inverter-reset'); if (reset) reset.checked = !!rec.inverter_reset;
      const mreset = document.getElementById('new-meter-reset'); if (mreset) mreset.checked = !!rec.meter_reset;
    }
  }

  document.getElementById('new-lectura-red')?.dispatchEvent(new Event('input'));
  modal.classList.remove('hidden');
}

async function handleSaveRecord(dataOrEvent) {
  if (dataOrEvent && typeof dataOrEvent.preventDefault === 'function') {
    dataOrEvent.preventDefault();
  }

  const editId = document.getElementById('edit-id')?.value;
  const fecha = document.getElementById('new-fecha')?.value;
  if (!fecha) return;
  const [year, month, day] = fecha.split('-');
  const projPrefix = state.activeProject?.id ? `${state.activeProject.id.slice(0, 8)}_` : '';

  const rec = {
    id: editId || `${projPrefix}${year}-${month}-${day || '01'}`,
    year: parseInt(year, 10),
    monthIdx: parseInt(month, 10),
    fecha,
    lecturaRed: parseFloat(document.getElementById('new-lectura-red')?.value) || 0,
    lecturaSolar: parseFloat(document.getElementById('new-lectura-solar')?.value) || 0,
    precioKw: parseFloat(document.getElementById('new-precio')?.value) || 0,
    project_id: state.activeProject?.id || null,
    inverter_reset: document.getElementById('new-inverter-reset')?.checked || false,
    meter_reset: document.getElementById('new-meter-reset')?.checked || false,
  };

  const btn = document.getElementById('btn-save');
  const orig = btn?.innerHTML;
  if (btn) { btn.innerHTML = `<i class="fa-solid fa-circle-notch spin"></i> ${t('saving')}`; btn.disabled = true; }

  try {
    const result = await upsertRecord(rec);
    if (!result) throw new Error('Error al guardar registro en la BD.');
    document.getElementById('add-record-modal')?.classList.add('hidden');
    await reloadProjectData();
    renderDashboardData();
    showToast(state.lang === 'es' ? 'Registro guardado exitosamente' : 'Record saved successfully', 'success');
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
  if (btn) { btn.innerHTML = orig; btn.disabled = false; }
}

async function handleDeleteRecord(id, fecha) {
  showConfirmModal({
    titleEs: 'Eliminar Registro',
    titleEn: 'Delete Record',
    messageEs: `¿Estás seguro de eliminar el registro de ${fecha}?`,
    messageEn: `Are you sure you want to delete the record for ${fecha}?`,
    confirmBtnEs: 'Eliminar',
    confirmBtnEn: 'Delete',
    isDanger: true,
    onConfirm: async () => {
      try {
        const ok = await deleteRecord(id, fecha);
        if (!ok) throw new Error('Error al eliminar registro en la BD.');
        await reloadProjectData();
        renderDashboardData();
        showToast(state.lang === 'es' ? 'Registro eliminado' : 'Record deleted', 'success');
      } catch (err) {
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    },
  });
}

// ── Settings Handlers ─────────────────────────────────────────────────────────
async function handleSaveSettings(data) {
  if (!state.activeProject) return;
  try {
    const result = await updateProject(state.activeProject.id, {
      name: data.name,
      description: data.description,
      location: data.location,
      capacity_kw: data.capacity_kw,
      panel_count: data.panel_count,
      inverter_model: data.inverter_model,
      monitoring_url: data.monitoring_url,
      updated_at: new Date().toISOString(),
    });
    if (!result) throw new Error('No se pudo guardar la configuración.');
    const updated = await getProject(state.activeProject.id);
    if (updated) setActiveProject(updated, state.activeProjectRole);
    state.processedData = processData(state.rawData);
    showToast(state.lang === 'es' ? 'Configuración guardada' : 'Settings saved', 'success');
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

async function handleCreatePhase(data) {
  if (!state.activeProject || !data) return;
  try {
    const result = await createInvestment({
      project_id: state.activeProject.id,
      phase_name: data.phase_name,
      description: data.description || '',
      investment_cop: data.investment_cop || 0,
      capacity_added_kw: data.capacity_added_kw || 0,
      panels_added: data.panels_added || 0,
      start_date: data.start_date,
    });
    if (!result) throw new Error('No se pudo crear la fase.');
    state.investments = await getProjectInvestments(state.activeProject.id) || [];
    showToast(state.lang === 'es' ? 'Fase de inversión creada' : 'Investment phase created', 'success');
    renderDashboardView(state.currentView);
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

async function handleEditPhase(data) {
  if (!state.activeProject || !data || !data.id) return;
  try {
    const { id, ...updates } = data;
    const result = await updateInvestment(id, updates);
    if (!result) throw new Error('No se pudo actualizar la fase.');
    state.investments = await getProjectInvestments(state.activeProject.id) || [];
    showToast(state.lang === 'es' ? 'Fase actualizada' : 'Phase updated', 'success');
    renderDashboardView(state.currentView);
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

async function handleDeletePhase(investmentId) {
  showConfirmModal({
    titleEs: 'Eliminar Fase de Inversión',
    titleEn: 'Delete Investment Phase',
    messageEs: '¿Estás seguro de eliminar esta fase de inversión? Afectará el cálculo de ROI y proyección.',
    messageEn: 'Are you sure you want to delete this phase? This will affect ROI and projection calculations.',
    confirmBtnEs: 'Eliminar Fase',
    confirmBtnEn: 'Delete Phase',
    isDanger: true,
    onConfirm: async () => {
      try {
        const ok = await deleteInvestment(investmentId);
        if (!ok) throw new Error('No se pudo eliminar la fase.');
        state.investments = await getProjectInvestments(state.activeProject.id) || [];
        showToast(state.lang === 'es' ? 'Fase eliminada' : 'Phase deleted', 'success');
        renderDashboardView(state.currentView);
      } catch (err) {
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    },
  });
}

// ── Member Handlers ───────────────────────────────────────────────────────────
async function handleAddMember({ email, role }) {
  if (!state.activeProject || !email) return;

  try {
    const result = await addProjectMember(state.activeProject.id, email, role);
    if (!result) throw new Error('No se pudo agregar el miembro. Verifica que el usuario exista.');
    showToast(state.lang === 'es' ? 'Miembro agregado exitosamente' : 'Member added successfully', 'success');
    await loadAndRenderMembers();
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

async function handleRemoveMember(memberId) {
  showConfirmModal({
    titleEs: 'Remover Miembro',
    titleEn: 'Remove Member',
    messageEs: '¿Deseas revocar el acceso de este usuario al proyecto?',
    messageEn: "Do you want to revoke this user's access to the project?",
    confirmBtnEs: 'Remover',
    confirmBtnEn: 'Remove',
    isDanger: true,
    onConfirm: async () => {
      try {
        const ok = await removeProjectMember(memberId);
        if (!ok) throw new Error('Error al remover miembro.');
        showToast(state.lang === 'es' ? 'Miembro removido' : 'Member removed', 'success');
        await loadAndRenderMembers();
      } catch (err) {
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    },
  });
}

async function handleChangeRole(memberId, newRole) {
  try {
    const ok = await updateMemberRole(memberId, newRole);
    if (!ok) throw new Error('Error al actualizar rol.');
    showToast(state.lang === 'es' ? 'Rol actualizado' : 'Role updated', 'success');
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
const setText = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
};

// ── Global Handlers (for HTML callbacks) ─────────────────────────────────────
window.__navigate = (view) => handleSidebarNavigate(view);
window.__logout = handleLogout;
window.__changeLang = changeLang;
window.__toggleTheme = toggleTheme;
window.__toggleKiosk = toggleKioskMode;
window.__openRecordModal = (action, id) => openRecordModal(action, id);
window.__closeRecordModal = () => document.getElementById('add-record-modal')?.classList.add('hidden');
window.__handleToggleChartMode = handleToggleChartMode;
window.__selectProject = handleSelectProject;
window.__createProject = handleCreateProject;
window.__toggleLangMenu = () => document.getElementById('lang-menu')?.classList.toggle('hidden');
window.__toggleSidebar = () => {
  document.querySelector('.sidebar')?.classList.toggle('open');
  document.querySelector('.sidebar-overlay')?.classList.toggle('visible');
};
window.__closeSidebar = () => {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('visible');
};
window.__toggleProjectionDetail = () => {
  document.getElementById('proyeccion-detallada')?.classList.toggle('hidden');
};
window.__handleSaveRecord = handleSaveRecord;
window.__handleCreatePhase = handleCreatePhase;
window.__handleSaveSettings = handleSaveSettings;
window.__handleDeletePhase = handleDeletePhase;
window.__handleEditPhase = handleEditPhase;
window.__handleExportCsv = handleExportCsv;

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Apply persisted language & theme
  document.body.setAttribute('data-lang', state.lang || 'es');
  applyTheme(state.theme || 'dark');

  try {
    const session = await getSession();
    if (session?.user) {
      state.user = session.user;
      const role = await getUserRole(state.user.email);
      state.isAdmin = role === 'admin';

      await loadProjects();

      // Restore last active project if still accessible
      if (state.lastProjectId && state.projects.some(p => p.id === state.lastProjectId)) {
        await navigate('dashboard', { projectId: state.lastProjectId });
        return;
      }

      if (state.isAdmin) {
        await navigate('projects');
      } else if (state.projects.length === 1) {
        await navigate('dashboard', { projectId: state.projects[0].id });
      } else if (state.projects.length > 1) {
        await navigate('projects');
      } else {
        navigate('login');
      }
    } else {
      navigate('login');
    }
  } catch (e) {
    console.error('Bootstrap error:', e);
    navigate('login');
  }
});
