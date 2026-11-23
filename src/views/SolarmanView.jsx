import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import {
  activateDemoSolarmanSession,
  authenticateSolarman,
  clearSolarmanSession,
  fetchSolarmanDailyHistory,
  getSolarmanSession,
  solarmanRuntime,
  startSolarmanLiveSync,
  stopSolarmanLiveSync,
  syncProjectSolarmanTelemetry,
} from '../modules/solarman.js';
import { getLocalDateISO } from '../modules/utils.js';
import { useApp } from '../context/AppContext.jsx';
import { useProject } from '../context/ProjectContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import AuthGate from './solarman/AuthGate.jsx';
import StationPicker from './solarman/StationPicker.jsx';
import LiveMonitor from './solarman/LiveMonitor.jsx';

export default function SolarmanView({ onPushReadingToCloud }) {
  const { t } = useApp();
  const { activeState, isProjectAdmin } = useProject();
  const { showToast } = useToast();

  const project = activeState.project;
  const projectRef = useRef(project);
  projectRef.current = project;

  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const beginLiveSync = useCallback(() => {
    startSolarmanLiveSync({
      getActiveProject: () => projectRef.current,
      onUpdate: async (rt) => {
        if (rt.selectedDate === getLocalDateISO() && projectRef.current) {
          await fetchSolarmanDailyHistory(projectRef.current, rt.selectedDate, {
            range: rt.historyRange,
            force: true,
          });
        }
        bump();
        if (rt.justUpdatedPacket) {
          showToast(t('solarmanNewPacket'), 'success');
        }
      },
      onTick: null,
    });
  }, [bump, showToast, t]);

  useEffect(() => {
    const session = getSolarmanSession();
    if (!session || !project?.id) return undefined;

    let cancelled = false;
    (async () => {
      try {
        if (solarmanRuntime.loadedProjectId !== project.id || !solarmanRuntime.deviceData) {
          solarmanRuntime.loading = true;
          bump();
          await syncProjectSolarmanTelemetry(project);
          await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, {
            range: solarmanRuntime.historyRange,
          });
          solarmanRuntime.loading = false;
        }
        if (!cancelled) {
          bump();
          beginLiveSync();
        }
      } catch (err) {
        solarmanRuntime.loading = false;
        solarmanRuntime.error = err.message;
        if (!cancelled) {
          bump();
          showToast(`${t('error')}: ${err.message}`, 'error');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopSolarmanLiveSync();
    };
  }, [project?.id, beginLiveSync, bump, showToast, t]);

  const handleConnect = async (creds) => {
    try {
      solarmanRuntime.error = null;
      await authenticateSolarman(creds);
      solarmanRuntime.loading = true;
      bump();
      await syncProjectSolarmanTelemetry(project);
      await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, { force: true });
      solarmanRuntime.loading = false;
      bump();
      showToast(t('solarmanConnected'), 'success');
      beginLiveSync();
    } catch (err) {
      solarmanRuntime.loading = false;
      solarmanRuntime.error = err.message;
      bump();
      showToast(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const handleActivateDemo = async () => {
    try {
      solarmanRuntime.error = null;
      activateDemoSolarmanSession(project);
      solarmanRuntime.loading = true;
      bump();
      await syncProjectSolarmanTelemetry(project);
      await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, { force: true });
      solarmanRuntime.loading = false;
      bump();
      showToast(t('solarmanDemoActivated'), 'info');
      beginLiveSync();
    } catch (err) {
      solarmanRuntime.loading = false;
      solarmanRuntime.error = err.message;
      bump();
    }
  };

  const handleDisconnect = () => {
    stopSolarmanLiveSync();
    clearSolarmanSession();
    bump();
    showToast(t('solarmanDisconnected'), 'info');
  };

  const handleSelectStation = async (stationId) => {
    try {
      solarmanRuntime.error = null;
      solarmanRuntime.loading = true;
      solarmanRuntime.showStationPicker = false;
      bump();
      await syncProjectSolarmanTelemetry(project, stationId, null);
      await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, { force: true });
      solarmanRuntime.loading = false;
      bump();
      beginLiveSync();
    } catch (err) {
      solarmanRuntime.loading = false;
      solarmanRuntime.error = err.message;
      bump();
    }
  };

  const handleSelectDevice = async (deviceSn) => {
    try {
      solarmanRuntime.loading = true;
      bump();
      await syncProjectSolarmanTelemetry(project, solarmanRuntime.activeStation?.id, deviceSn);
      await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, { force: true });
      solarmanRuntime.loading = false;
      bump();
    } catch (err) {
      solarmanRuntime.loading = false;
      solarmanRuntime.error = err.message;
      bump();
    }
  };

  const handleManualRefresh = async () => {
    try {
      solarmanRuntime.loading = true;
      bump();
      await syncProjectSolarmanTelemetry(project, solarmanRuntime.activeStation?.id, solarmanRuntime.activeDeviceSn);
      await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, { force: true });
      solarmanRuntime.loading = false;
      bump();
      showToast(t('solarmanUpdated'), 'success');
    } catch (err) {
      solarmanRuntime.loading = false;
      solarmanRuntime.error = err.message;
      bump();
      showToast(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const handleChangeDate = async (dateStr) => {
    solarmanRuntime.selectedDate = dateStr;
    solarmanRuntime.historyLoading = true;
    bump();
    await fetchSolarmanDailyHistory(project, dateStr, { range: solarmanRuntime.historyRange });
    bump();
  };

  const handleChangeRange = async (range) => {
    solarmanRuntime.historyRange = range;
    solarmanRuntime.historyLoading = true;
    bump();
    await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, { range });
    bump();
  };

  const handleChangeMetric = (metric) => {
    solarmanRuntime.historyMetric = metric;
    bump();
  };

  const session = getSolarmanSession();
  if (!session) {
    return (
      <AuthGate
        project={project}
        error={solarmanRuntime.error}
        onConnect={handleConnect}
        onActivateDemo={handleActivateDemo}
      />
    );
  }

  if (solarmanRuntime.loading && !solarmanRuntime.deviceData && !solarmanRuntime.showStationPicker) {
    return (
      <div id="solarman-view" className="stack">
        <div className="card section-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Radio size={34} className="spin text-solar" style={{ margin: '0 auto 1rem' }} aria-hidden="true" />
          <h3>{t('solarmanSyncingTitle')}</h3>
          <p className="text-secondary" style={{ marginTop: '.4rem' }}>
            {t('solarmanSyncingDesc', { project: project?.name || 'el proyecto activo' })}
          </p>
        </div>
      </div>
    );
  }

  if (solarmanRuntime.showStationPicker || !solarmanRuntime.activeStation) {
    return (
      <StationPicker
        project={project}
        session={session}
        stations={solarmanRuntime.stations}
        activeStation={solarmanRuntime.activeStation}
        onSelectStation={handleSelectStation}
        onCancelPicker={() => {
          solarmanRuntime.showStationPicker = false;
          bump();
        }}
        onDisconnect={handleDisconnect}
      />
    );
  }

  return (
    <LiveMonitor
      project={project}
      session={session}
      isAdmin={isProjectAdmin}
      runtime={solarmanRuntime}
      onSelectDevice={handleSelectDevice}
      onOpenStationPicker={() => {
        solarmanRuntime.showStationPicker = true;
        bump();
      }}
      onManualRefresh={handleManualRefresh}
      onPushReadingToCloud={onPushReadingToCloud}
      onDisconnect={handleDisconnect}
      onChangeHistoryDate={handleChangeDate}
      onChangeHistoryRange={handleChangeRange}
      onChangeHistoryMetric={handleChangeMetric}
    />
  );
}
