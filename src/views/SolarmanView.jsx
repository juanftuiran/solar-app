import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Power, Radio } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
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
import StatePanel from '../components/StatePanel.jsx';
import AuthGate from './solarman/AuthGate.jsx';
import StationPicker from './solarman/StationPicker.jsx';
import LiveMonitor from './solarman/LiveMonitor.jsx';

function resolveInitialPhase(projectId) {
  const session = getSolarmanSession();
  if (!session) return 'auth';
  if (
    projectId &&
    solarmanRuntime.loadedProjectId === projectId &&
    solarmanRuntime.activeStation &&
    solarmanRuntime.deviceData &&
    !solarmanRuntime.showStationPicker
  ) {
    return 'live';
  }
  return 'loading';
}

export default function SolarmanView({ onPushReadingToCloud: propPushReading }) {
  const outletCtx = useOutletContext() || {};
  const onPushReadingToCloud = propPushReading || outletCtx.onPushReadingToCloud;

  const { t } = useApp();
  const { activeState, isProjectAdmin } = useProject();
  const { showToast } = useToast();

  const project = activeState.project;
  const projectRef = useRef(project);
  projectRef.current = project;
  const reqIdRef = useRef(0);

  const [phase, setPhase] = useState(() => resolveInitialPhase(project?.id));
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const handleAuthOrApiError = useCallback((err) => {
    const msg = err?.message || t('networkErrorDesc');
    solarmanRuntime.loading = false;
    solarmanRuntime.error = msg;
    const isExpiredOrUnauthorized =
      err?.code === 401 ||
      /expir[oó]|session|token.*inv[aá]lid|no hay sesi[oó]n/i.test(msg);
    if (isExpiredOrUnauthorized) {
      stopSolarmanLiveSync();
      clearSolarmanSession();
      solarmanRuntime.error = msg;
      setPhase('auth');
    } else {
      setPhase('error');
    }
    bump();
    showToast(`${t('error')}: ${msg}`, 'error');
  }, [bump, showToast, t]);

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

  const loadTelemetry = useCallback(async (targetProject) => {
    const session = getSolarmanSession();
    if (!session) {
      setPhase('auth');
      return;
    }
    if (!targetProject?.id) return;

    const reqId = ++reqIdRef.current;
    setPhase('loading');
    solarmanRuntime.loading = true;
    solarmanRuntime.error = null;
    bump();

    try {
      await syncProjectSolarmanTelemetry(targetProject);
      if (reqId !== reqIdRef.current) return;

      if (solarmanRuntime.showStationPicker || !solarmanRuntime.activeStation) {
        solarmanRuntime.loading = false;
        setPhase('picking');
        bump();
        return;
      }

      await fetchSolarmanDailyHistory(targetProject, solarmanRuntime.selectedDate, {
        range: solarmanRuntime.historyRange,
      });
      if (reqId !== reqIdRef.current) return;

      solarmanRuntime.loading = false;
      setPhase('live');
      bump();
      beginLiveSync();
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      handleAuthOrApiError(err);
    }
  }, [beginLiveSync, bump, handleAuthOrApiError]);

  useEffect(() => {
    const session = getSolarmanSession();
    if (!session) {
      setPhase('auth');
      return undefined;
    }
    if (!project?.id) return undefined;

    if (
      solarmanRuntime.loadedProjectId === project.id &&
      solarmanRuntime.activeStation &&
      solarmanRuntime.deviceData &&
      !solarmanRuntime.showStationPicker
    ) {
      setPhase('live');
      beginLiveSync();
    } else {
      loadTelemetry(project);
    }

    return () => {
      reqIdRef.current += 1;
      stopSolarmanLiveSync();
    };
  }, [project?.id, beginLiveSync, loadTelemetry]);

  const handleConnect = async (creds) => {
    const reqId = ++reqIdRef.current;
    try {
      solarmanRuntime.error = null;
      await authenticateSolarman(creds);
      if (reqId !== reqIdRef.current) return;
      setPhase('loading');
      solarmanRuntime.loading = true;
      bump();

      await syncProjectSolarmanTelemetry(project);
      if (reqId !== reqIdRef.current) return;

      if (solarmanRuntime.showStationPicker || !solarmanRuntime.activeStation) {
        solarmanRuntime.loading = false;
        setPhase('picking');
        bump();
        showToast(t('solarmanConnected'), 'success');
        return;
      }

      await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, { force: true });
      if (reqId !== reqIdRef.current) return;

      solarmanRuntime.loading = false;
      setPhase('live');
      bump();
      showToast(t('solarmanConnected'), 'success');
      beginLiveSync();
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      solarmanRuntime.loading = false;
      solarmanRuntime.error = err.message;
      setPhase('auth');
      bump();
      showToast(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const handleActivateDemo = async () => {
    const reqId = ++reqIdRef.current;
    try {
      solarmanRuntime.error = null;
      activateDemoSolarmanSession(project);
      setPhase('loading');
      solarmanRuntime.loading = true;
      bump();
      await syncProjectSolarmanTelemetry(project);
      if (reqId !== reqIdRef.current) return;
      await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, { force: true });
      if (reqId !== reqIdRef.current) return;
      solarmanRuntime.loading = false;
      setPhase('live');
      bump();
      showToast(t('solarmanDemoActivated'), 'info');
      beginLiveSync();
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      handleAuthOrApiError(err);
    }
  };

  const handleDisconnect = () => {
    reqIdRef.current += 1;
    stopSolarmanLiveSync();
    clearSolarmanSession();
    setPhase('auth');
    bump();
    showToast(t('solarmanDisconnected'), 'info');
  };

  const handleSelectStation = async (stationId) => {
    const reqId = ++reqIdRef.current;
    try {
      solarmanRuntime.error = null;
      solarmanRuntime.loading = true;
      solarmanRuntime.showStationPicker = false;
      setPhase('loading');
      bump();

      await syncProjectSolarmanTelemetry(project, stationId, null);
      if (reqId !== reqIdRef.current) return;

      await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, { force: true });
      if (reqId !== reqIdRef.current) return;

      solarmanRuntime.loading = false;
      setPhase('live');
      bump();
      beginLiveSync();
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      handleAuthOrApiError(err);
    }
  };

  const handleSelectDevice = async (deviceSn) => {
    const reqId = ++reqIdRef.current;
    try {
      solarmanRuntime.loading = true;
      bump();
      await syncProjectSolarmanTelemetry(project, solarmanRuntime.activeStation?.id, deviceSn);
      if (reqId !== reqIdRef.current) return;
      await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, { force: true });
      if (reqId !== reqIdRef.current) return;
      solarmanRuntime.loading = false;
      bump();
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      solarmanRuntime.loading = false;
      solarmanRuntime.error = err.message;
      bump();
      showToast(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const handleManualRefresh = async () => {
    const reqId = ++reqIdRef.current;
    try {
      solarmanRuntime.loading = true;
      bump();
      await syncProjectSolarmanTelemetry(project, solarmanRuntime.activeStation?.id, solarmanRuntime.activeDeviceSn);
      if (reqId !== reqIdRef.current) return;
      await fetchSolarmanDailyHistory(project, solarmanRuntime.selectedDate, { force: true });
      if (reqId !== reqIdRef.current) return;
      solarmanRuntime.loading = false;
      bump();
      showToast(t('solarmanUpdated'), 'success');
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
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

  if (phase === 'auth' || !session) {
    return (
      <AuthGate
        project={project}
        error={solarmanRuntime.error}
        onConnect={handleConnect}
        onActivateDemo={handleActivateDemo}
      />
    );
  }

  if (phase === 'loading') {
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

  if (phase === 'error') {
    return (
      <div id="solarman-view" className="stack">
        <StatePanel
          variant="error"
          title={t('solarmanAuthErrTitle')}
          description={solarmanRuntime.error || t('networkErrorDesc')}
          onRetry={() => loadTelemetry(project)}
          action={(
            <button type="button" className="btn btn-ghost" onClick={handleDisconnect}>
              <Power size={15} aria-hidden="true" />
              <span>{t('solarmanSwitchAccount')}</span>
            </button>
          )}
        />
      </div>
    );
  }

  if (phase === 'picking' || !solarmanRuntime.activeStation) {
    return (
      <StationPicker
        project={project}
        session={session}
        stations={solarmanRuntime.stations}
        activeStation={solarmanRuntime.activeStation}
        onSelectStation={handleSelectStation}
        onCancelPicker={() => {
          solarmanRuntime.showStationPicker = false;
          setPhase(solarmanRuntime.activeStation ? 'live' : 'loading');
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
        setPhase('picking');
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
