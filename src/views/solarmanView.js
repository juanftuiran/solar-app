/**
 * @module solarmanView
 * @description Clean facade for the modularized Solarman Live Monitor & Historical Analytics View.
 */

import { state } from '../modules/state.js';
import { solarmanRuntime, getSolarmanSession } from '../modules/solarman.js';
import { debounce, getLocalDateISO, shiftISODate } from '../modules/utils.js';
import { renderSolarmanDailyChart, renderSolarmanPeriodBarsChart } from '../modules/charts.js';
import { renderCredentialsGate } from './solarman/authGate.js';
import { renderStationPicker } from './solarman/stationPicker.js';
import { renderLiveMonitor, renderLoadingState } from './solarman/liveMonitor.js';
import { renderHistoryChartsPanel } from './solarman/historyChartsPanel.js';

let _lastParamQuery = '';

/**
 * Render the Solarman Live Monitor View HTML.
 * @returns {string}
 */
export function render() {
  const session = getSolarmanSession();
  const project = state.activeProject || {};
  const isAdmin = state.activeProjectRole === 'admin' || state.isAdmin;

  if (!session) {
    return renderCredentialsGate(project);
  }
  if (solarmanRuntime.loading && (!solarmanRuntime.stations || solarmanRuntime.stations.length === 0)) {
    return renderLoadingState(project);
  }
  if (solarmanRuntime.showStationPicker || !solarmanRuntime.activeStation) {
    return renderStationPicker(project, session);
  }
  return renderLiveMonitor(project, session, isAdmin);
}

/**
 * Render or update the Chart.js canvas inside the Solarman History Card.
 */
export function renderHistoryChart() {
  if (state.currentView !== 'solarman') return;
  const canvas = document.getElementById('chart-solarman-daily');
  if (!canvas) return;

  if (solarmanRuntime.historyRange === 'month') {
    renderSolarmanPeriodBarsChart(solarmanRuntime.monthlyHistoryPoints || []);
  } else {
    renderSolarmanDailyChart(
      solarmanRuntime.dailyHistoryPoints || [],
      solarmanRuntime.historyMetric || 'power',
      solarmanRuntime.deviceData,
    );
  }
}

/**
 * Patch ONLY the History & Charts Card without resetting page scroll or raw parameter search.
 * @param {Object} callbacks
 */
export function rerenderHistoryCard(callbacks = {}) {
  const existing = document.getElementById('solarman-history-card');
  const session = getSolarmanSession();
  if (!existing || !session) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderHistoryChartsPanel(solarmanRuntime, session);
  const nextCard = wrapper.firstElementChild;
  if (nextCard) {
    existing.replaceWith(nextCard);
    _bindHistoryControls(callbacks);
    renderHistoryChart();
  }
}

function _applyRawParamFilter(query = '') {
  const q = String(query || '').trim().toLowerCase();
  _lastParamQuery = query;
  document.querySelectorAll('#sm-raw-params-tbody tr.sm-param-row').forEach((row) => {
    const txt = row.dataset.search || '';
    row.style.display = !q || txt.includes(q) ? '' : 'none';
  });
}

function _bindHistoryControls(callbacks = {}) {
  const { onChangeHistoryDate, onChangeHistoryRange, onChangeHistoryMetric } = callbacks;
  const todayISO = getLocalDateISO();

  const dateInput = document.getElementById('sm-hist-date');
  if (dateInput && typeof onChangeHistoryDate === 'function') {
    dateInput.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val && val <= todayISO) onChangeHistoryDate(val);
    });
  }

  document.getElementById('sm-hist-prev')?.addEventListener('click', () => {
    const prev = shiftISODate(solarmanRuntime.selectedDate || todayISO, -1);
    onChangeHistoryDate?.(prev);
  });

  document.getElementById('sm-hist-next')?.addEventListener('click', () => {
    const next = shiftISODate(solarmanRuntime.selectedDate || todayISO, 1);
    if (next <= todayISO) onChangeHistoryDate?.(next);
  });

  document.getElementById('sm-hist-today')?.addEventListener('click', () => {
    onChangeHistoryDate?.(todayISO);
  });

  document.getElementById('sm-hist-yesterday')?.addEventListener('click', () => {
    onChangeHistoryDate?.(shiftISODate(todayISO, -1));
  });

  document.querySelectorAll('[data-sm-range]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextRange = btn.dataset.smRange;
      if (nextRange && nextRange !== solarmanRuntime.historyRange) {
        onChangeHistoryRange?.(nextRange);
      }
    });
  });

  document.querySelectorAll('[data-sm-metric]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextMetric = btn.dataset.smMetric;
      if (nextMetric && nextMetric !== solarmanRuntime.historyMetric) {
        onChangeHistoryMetric?.(nextMetric);
      }
    });
  });
}

/**
 * Bind DOM events for auth gate, station picker, live telemetry, and history charts.
 * @param {Object} callbacks
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

  const authForm = document.getElementById('solarman-auth-form');
  if (authForm && typeof onConnect === 'function') {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('sm-email')?.value?.trim();
      const password = document.getElementById('sm-password')?.value || '';
      const appId = document.getElementById('sm-app-id')?.value?.trim();
      const appSecret = document.getElementById('sm-app-secret')?.value?.trim();
      const region = document.getElementById('sm-region')?.value || 'global';
      const orgId = document.getElementById('sm-org-id')?.value?.trim() || '';
      const remember = document.getElementById('sm-remember')?.checked ?? true;

      if (!email || !password) return;

      const btn = document.getElementById('btn-solarman-connect');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch spin"></i> Conectando...';
      }

      await onConnect({ email, password, appId, appSecret, region, orgId, remember });
    });
  }

  document.getElementById('btn-solarman-demo')?.addEventListener('click', () => onActivateDemo?.());
  document.getElementById('btn-solarman-disconnect')?.addEventListener('click', () => onDisconnect?.());
  document.getElementById('btn-open-station-picker')?.addEventListener('click', () => onOpenStationPicker?.());
  document.getElementById('btn-cancel-station-picker')?.addEventListener('click', () => onCloseStationPicker?.());
  document.getElementById('btn-solarman-refresh')?.addEventListener('click', () => onManualRefresh?.());

  document.querySelectorAll('.btn-select-solarman-station').forEach((btn) => {
    btn.addEventListener('click', () => {
      const stationId = btn.dataset.stationId;
      if (stationId) onSelectStation?.(stationId);
    });
  });

  document.getElementById('sm-device-select')?.addEventListener('change', (e) => {
    const sn = e.target.value;
    if (sn) onSelectDevice?.(sn);
  });

  const pushBtn = document.getElementById('btn-solarman-push-reading');
  if (pushBtn && typeof onPushReadingToCloud === 'function') {
    pushBtn.addEventListener('click', () => {
      const kwh = parseFloat(pushBtn.dataset.kwh) || 0;
      onPushReadingToCloud(kwh);
    });
  }

  // Debounced raw parameter filter (preserving query across refreshes)
  const searchInput = document.getElementById('sm-param-search');
  if (searchInput) {
    if (_lastParamQuery) {
      searchInput.value = _lastParamQuery;
      _applyRawParamFilter(_lastParamQuery);
    }
    searchInput.addEventListener(
      'input',
      debounce((e) => _applyRawParamFilter(e.target.value), 120),
    );
  }

  // History controls + render initial Chart.js view
  _bindHistoryControls(callbacks);
  renderHistoryChart();
  updateLiveTickerLabels();
}

/**
 * Lightweight 1-second ticker that updates relative report age and next poll countdown.
 */
export function updateLiveTickerLabels() {
  const agoEl = document.getElementById('sm-last-report-ago');
  const nextEl = document.getElementById('sm-next-check-in');

  if (agoEl && solarmanRuntime.lastCollectionTime) {
    const diffSec = Math.max(0, Math.floor(Date.now() / 1000) - solarmanRuntime.lastCollectionTime);
    if (diffSec < 60) {
      agoEl.textContent = `(hace ${diffSec}s)`;
    } else if (diffSec < 3600) {
      agoEl.textContent = `(hace ${Math.floor(diffSec / 60)}m ${diffSec % 60}s)`;
    } else {
      agoEl.textContent = `(hace ${Math.floor(diffSec / 3600)}h)`;
    }
  }

  if (nextEl && solarmanRuntime.nextCheckAtMs) {
    const remSec = Math.max(0, Math.ceil((solarmanRuntime.nextCheckAtMs - Date.now()) / 1000));
    nextEl.textContent = solarmanRuntime.loading ? 'Consultando...' : `en ${remSec}s`;
  }
}
