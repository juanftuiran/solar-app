/**
 * @module app/solarmanController
 * @description Lazy-loaded orchestration controller for Solarman Live Monitor & Historical Charts.
 */

import { state } from '../modules/state.js';
import { t } from '../modules/i18n.js';
import { getLocalDateISO } from '../modules/utils.js';
import {
  solarmanRuntime,
  getSolarmanSession,
  clearSolarmanSession,
  authenticateSolarman,
  activateDemoSolarmanSession,
  syncProjectSolarmanTelemetry,
  fetchSolarmanDailyHistory,
  startSolarmanLiveSync,
} from '../modules/solarman.js';
import { showToast } from './ui.js';

let _solarmanViewMod = null;

/**
 * Lazy-load solarmanView.js once on demand.
 */
export async function getSolarmanView() {
  if (!_solarmanViewMod) {
    _solarmanViewMod = await import('../views/solarmanView.js');
  }
  return _solarmanViewMod;
}

function _buildCallbacks(openRecordModal) {
  const callbacks = {
    onConnect: async (creds) => {
      try {
        solarmanRuntime.error = null;
        await authenticateSolarman(creds);
        solarmanRuntime.loading = true;
        await refreshSolarmanDOM(openRecordModal);
        await syncProjectSolarmanTelemetry(state.activeProject);
        await fetchSolarmanDailyHistory(state.activeProject, solarmanRuntime.selectedDate, { force: true });
        solarmanRuntime.loading = false;
        await refreshSolarmanDOM(openRecordModal);
        showToast(
          state.lang === 'en'
            ? 'Connected to Solarman Cloud successfully'
            : 'Conectado a Solarman Cloud exitosamente',
          'success',
        );
        _beginLiveSync(openRecordModal);
      } catch (err) {
        solarmanRuntime.loading = false;
        solarmanRuntime.error = err.message;
        await refreshSolarmanDOM(openRecordModal);
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    },

    onActivateDemo: async () => {
      try {
        solarmanRuntime.error = null;
        activateDemoSolarmanSession(state.activeProject);
        solarmanRuntime.loading = true;
        await refreshSolarmanDOM(openRecordModal);
        await syncProjectSolarmanTelemetry(state.activeProject);
        await fetchSolarmanDailyHistory(state.activeProject, solarmanRuntime.selectedDate, { force: true });
        solarmanRuntime.loading = false;
        await refreshSolarmanDOM(openRecordModal);
        showToast(
          state.lang === 'en'
            ? 'Multi-Plant Demo Mode activated (updates every 15s)'
            : 'Modo Demo Multi-Planta activado (actualiza cada 15s)',
          'info',
        );
        _beginLiveSync(openRecordModal);
      } catch (err) {
        solarmanRuntime.loading = false;
        solarmanRuntime.error = err.message;
        await refreshSolarmanDOM(openRecordModal);
      }
    },

    onDisconnect: async () => {
      clearSolarmanSession();
      await refreshSolarmanDOM(openRecordModal);
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
        await refreshSolarmanDOM(openRecordModal);
        await syncProjectSolarmanTelemetry(state.activeProject, stationId, null);
        await fetchSolarmanDailyHistory(state.activeProject, solarmanRuntime.selectedDate, { force: true });
        solarmanRuntime.loading = false;
        await refreshSolarmanDOM(openRecordModal);
        const stName = solarmanRuntime.activeStation?.name || stationId;
        showToast(
          state.lang === 'en'
            ? `Plant "${stName}" bound to ${state.activeProject?.name}`
            : `Planta "${stName}" vinculada al proyecto ${state.activeProject?.name}`,
          'success',
        );
        _beginLiveSync(openRecordModal);
      } catch (err) {
        solarmanRuntime.loading = false;
        solarmanRuntime.error = err.message;
        await refreshSolarmanDOM(openRecordModal);
      }
    },

    onOpenStationPicker: async () => {
      solarmanRuntime.showStationPicker = true;
      await refreshSolarmanDOM(openRecordModal);
    },

    onCloseStationPicker: async () => {
      solarmanRuntime.showStationPicker = false;
      await refreshSolarmanDOM(openRecordModal);
    },

    onSelectDevice: async (deviceSn) => {
      try {
        solarmanRuntime.loading = true;
        await refreshSolarmanDOM(openRecordModal);
        await syncProjectSolarmanTelemetry(state.activeProject, solarmanRuntime.activeStation?.id, deviceSn);
        await fetchSolarmanDailyHistory(state.activeProject, solarmanRuntime.selectedDate, { force: true });
        solarmanRuntime.loading = false;
        await refreshSolarmanDOM(openRecordModal);
      } catch (err) {
        solarmanRuntime.loading = false;
        solarmanRuntime.error = err.message;
        await refreshSolarmanDOM(openRecordModal);
      }
    },

    onManualRefresh: async () => {
      try {
        solarmanRuntime.loading = true;
        await refreshSolarmanDOM(openRecordModal);
        await syncProjectSolarmanTelemetry(
          state.activeProject,
          solarmanRuntime.activeStation?.id,
          solarmanRuntime.activeDeviceSn,
        );
        await fetchSolarmanDailyHistory(state.activeProject, solarmanRuntime.selectedDate, { force: true });
        solarmanRuntime.loading = false;
        await refreshSolarmanDOM(openRecordModal);
        showToast(
          state.lang === 'en' ? 'Solarman telemetry updated' : 'Telemetría de Solarman actualizada',
          'success',
        );
      } catch (err) {
        solarmanRuntime.loading = false;
        solarmanRuntime.error = err.message;
        await refreshSolarmanDOM(openRecordModal);
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    },

    onPushReadingToCloud: (totalKwh) => {
      openRecordModal('new');
      const lsInput = document.getElementById('new-lectura-solar');
      if (lsInput && totalKwh > 0) lsInput.value = String(totalKwh);
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

    onChangeHistoryDate: async (dateStr) => {
      const view = await getSolarmanView();
      solarmanRuntime.selectedDate = dateStr;
      solarmanRuntime.historyLoading = true;
      view.rerenderHistoryCard(callbacks);
      await fetchSolarmanDailyHistory(state.activeProject, dateStr, { range: solarmanRuntime.historyRange });
      view.rerenderHistoryCard(callbacks);
    },

    onChangeHistoryRange: async (range) => {
      const view = await getSolarmanView();
      solarmanRuntime.historyRange = range;
      solarmanRuntime.historyLoading = true;
      view.rerenderHistoryCard(callbacks);
      await fetchSolarmanDailyHistory(state.activeProject, solarmanRuntime.selectedDate, { range });
      view.rerenderHistoryCard(callbacks);
    },

    onChangeHistoryMetric: async (metric) => {
      const view = await getSolarmanView();
      solarmanRuntime.historyMetric = metric;
      view.rerenderHistoryCard(callbacks);
    },
  };

  return callbacks;
}

async function _beginLiveSync(openRecordModal) {
  const view = await getSolarmanView();
  startSolarmanLiveSync({
    getActiveProject: () => state.activeProject,
    onUpdate: async (rt) => {
      if (rt.selectedDate === getLocalDateISO() && state.currentView === 'solarman') {
        await fetchSolarmanDailyHistory(state.activeProject, rt.selectedDate, {
          range: rt.historyRange,
          force: true,
        });
      }
      await refreshSolarmanDOM(openRecordModal);
      if (rt.justUpdatedPacket) {
        showToast(
          state.lang === 'en'
            ? 'New inverter packet received from Solarman!'
            : '¡Nuevo paquete del inversor recibido desde Solarman!',
          'success',
        );
      }
    },
    onTick: () => view.updateLiveTickerLabels(),
  });
}

export async function refreshSolarmanDOM(openRecordModal) {
  if (state.currentView !== 'solarman') return;
  const contentArea = document.getElementById('dashboard-content-area');
  if (!contentArea) return;
  const view = await getSolarmanView();
  contentArea.innerHTML = view.render();
  view.init(_buildCallbacks(openRecordModal));
}

export async function initAndSyncSolarmanView(openRecordModal) {
  const view = await getSolarmanView();
  const callbacks = _buildCallbacks(openRecordModal);
  view.init(callbacks);

  const session = getSolarmanSession();
  if (!session || !state.activeProject) return;

  if (
    solarmanRuntime.loadedProjectId !== state.activeProject.id ||
    (!solarmanRuntime.activeStation && !solarmanRuntime.showStationPicker)
  ) {
    try {
      solarmanRuntime.loading = true;
      await refreshSolarmanDOM(openRecordModal);
      await syncProjectSolarmanTelemetry(state.activeProject);
      await fetchSolarmanDailyHistory(state.activeProject, solarmanRuntime.selectedDate);
      solarmanRuntime.loading = false;
      await refreshSolarmanDOM(openRecordModal);
    } catch (err) {
      solarmanRuntime.loading = false;
      solarmanRuntime.error = err.message;
      await refreshSolarmanDOM(openRecordModal);
    }
  } else if (
    solarmanRuntime.activeStation &&
    solarmanRuntime.dailyHistoryPoints.length === 0 &&
    !solarmanRuntime.showStationPicker
  ) {
    await fetchSolarmanDailyHistory(state.activeProject, solarmanRuntime.selectedDate);
    view.rerenderHistoryCard(callbacks);
  }

  _beginLiveSync(openRecordModal);
}
