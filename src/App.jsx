import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Leaf, Minimize2, RefreshCw } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ProjectProvider, useProject } from './context/ProjectContext.jsx';
import { ToastProvider, useToast } from './context/ToastContext.jsx';
import { filterByYear, getBaseRecord } from './modules/analytics.js';
import { deleteRecord } from './modules/supabase.js';
import { state } from './modules/state.js';
import { downloadTextFile } from './modules/utils.js';
import LoginView from './views/LoginView.jsx';
import ProjectSelectorView from './views/ProjectSelectorView.jsx';
import Sidebar from './components/Sidebar.jsx';
import DashboardHeader from './views/dashboard/DashboardHeader.jsx';
import StatePanel from './components/StatePanel.jsx';
import { ConfirmModal } from './components/Modal.jsx';

const DashboardView = lazy(() => import('./views/DashboardView.jsx'));
const ProjectSettingsView = lazy(() => import('./views/ProjectSettingsView.jsx'));
const MembersView = lazy(() => import('./views/MembersView.jsx'));
const SolarmanView = lazy(() => import('./views/SolarmanView.jsx'));
const RecordModal = lazy(() => import('./views/dashboard/RecordModal.jsx'));
const CsvModal = lazy(() => import('./views/dashboard/CsvModal.jsx'));
const ExecutiveReportModal = lazy(() => import('./views/dashboard/ExecutiveReportModal.jsx'));

class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.viewKey !== this.props.viewKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <StatePanel
          variant="error"
          title={this.props.errorTitle}
          description={this.state.error?.message || this.props.errorDesc}
          onRetry={() => {
            this.setState({ error: null });
            if (/chunk|dynamically imported module|loading css/i.test(String(this.state.error?.message || ''))) {
              window.location.reload();
            }
          }}
        />
      );
    }
    return this.props.children;
  }
}

function AppRouter() {
  const { activeTab, setActiveTab, kioskMode, toggleKioskMode, selectedYear, t } = useApp();
  const { isConfigured, user, isAdmin, authReady, signOut } = useAuth();
  const {
    projectsState,
    activeState,
    processedData,
    isProjectAdmin,
    loadProjects,
    loadProjectData,
    reloadReadings,
    exitActiveProject,
    resetAllProjectState,
  } = useProject();
  const { showToast } = useToast();

  const [view, setView] = useState('login'); // 'login' | 'projects' | 'dashboard' | 'settings' | 'investments' | 'members' | 'solarman' | 'no-projects'
  const [bootstrapped, setBootstrapped] = useState(false);

  const [recordModal, setRecordModal] = useState({ open: false, mode: 'new', id: null, prefillKwh: null });
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [execReportOpen, setExecReportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const [kioskAutoRotate, setKioskAutoRotate] = useState(false);
  const appHeadingRef = useRef(null);

  // Move keyboard/screen-reader focus to the view's main heading after navigation
  useEffect(() => {
    state.currentView = view;
    const raf = requestAnimationFrame(() => {
      appHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [view]);

  // Kiosk auto-rotation
  useEffect(() => {
    if (!kioskMode || !kioskAutoRotate) return undefined;
    const id = setInterval(() => {
      setActiveTab(activeTab === 'telemetry' ? 'finance' : 'telemetry');
    }, 10000);
    return () => clearInterval(id);
  }, [kioskMode, kioskAutoRotate, activeTab, setActiveTab]);

  useEffect(() => {
    if (!kioskMode) setKioskAutoRotate(false);
  }, [kioskMode]);

  // Initial session bootstrap
  useEffect(() => {
    if (!authReady || bootstrapped) return;
    setBootstrapped(true);

    if (!isConfigured || !user) {
      setView('login');
      return;
    }

    (async () => {
      const list = await loadProjects(user, isAdmin);
      if (!list) {
        setView('projects');
        return;
      }
      if (state.lastProjectId && list.some((p) => p.id === state.lastProjectId)) {
        await loadProjectData(state.lastProjectId, user, isAdmin);
        setView('dashboard');
        return;
      }
      if (isAdmin) {
        setView('projects');
      } else if (list.length === 1) {
        await loadProjectData(list[0].id, user, isAdmin);
        setView('dashboard');
      } else if (list.length > 1) {
        setView('projects');
      } else {
        setView('no-projects');
      }
    })();
  }, [authReady, bootstrapped, isConfigured, user, isAdmin, loadProjects, loadProjectData]);

  const handleSignedIn = useCallback(async (signedUser, signedAdmin) => {
    const list = await loadProjects(signedUser, signedAdmin);
    if (signedAdmin) {
      setView('projects');
      return;
    }
    if (!list) {
      setView('projects');
      return;
    }
    if (list.length === 1) {
      await loadProjectData(list[0].id, signedUser, signedAdmin);
      setView('dashboard');
    } else if (list.length === 0) {
      setView('no-projects');
    } else {
      setView('projects');
    }
  }, [loadProjects, loadProjectData]);

  const handleLogout = useCallback(async () => {
    resetAllProjectState();
    await signOut();
    setView('login');
  }, [resetAllProjectState, signOut]);

  const handleSelectProject = useCallback(async (projectId) => {
    setView('dashboard');
    await loadProjectData(projectId);
  }, [loadProjectData]);

  const handleNavigate = useCallback(async (nextView) => {
    if (nextView === 'projects' || nextView === 'switch-project') {
      exitActiveProject();
      setView('projects');
      await loadProjects();
      return;
    }
    setView(nextView);
  }, [exitActiveProject, loadProjects]);

  const handleExportCsv = useCallback(() => {
    if (!activeState.rawData || activeState.rawData.length === 0) {
      showToast(t('csvNoData'), 'error');
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

    const baseRec = getBaseRecord(activeState.rawData);
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

    const rows = processedData.map((d) => [
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

    const csvContent = `\uFEFF${[headers.join(','), ...baseRow.map((r) => r.join(',')), ...rows.map((r) => r.join(','))].join('\n')}`;
    const slug = (activeState.project?.name || 'solar-app').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadTextFile(`${slug}-reporte-solar-${new Date().toISOString().slice(0, 10)}.csv`, csvContent, 'text/csv;charset=utf-8;');
    showToast(t('csvExportSuccess'), 'success');
  }, [activeState.rawData, activeState.project?.name, processedData, showToast, t]);

  const handleConfirmDeleteRecord = useCallback(async () => {
    if (!deleteTarget) return;
    setDeletingRecord(true);
    try {
      const ok = await deleteRecord(deleteTarget.id, deleteTarget.fecha);
      if (!ok) throw new Error('Error al eliminar registro en la BD.');
      await reloadReadings();
      showToast(t('recordDeleted'), 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    } finally {
      setDeletingRecord(false);
    }
  }, [deleteTarget, reloadReadings, showToast, t]);

  const viewData = useMemo(
    () => filterByYear(processedData, selectedYear),
    [processedData, selectedYear],
  );

  if (!authReady) {
    return (
      <div id="loader">
        <div className="loader-ring spin" />
        <p className="loader-text pulse">{t('connecting')}</p>
      </div>
    );
  }

  if (view === 'login' || !user) {
    return <LoginView onSignedIn={handleSignedIn} />;
  }

  if (view === 'no-projects') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
        <StatePanel
          variant={projectsState.status === 'error' ? 'error' : 'empty'}
          title={projectsState.status === 'error' ? t('networkErrorTitle') : t('noProjectsAssigned')}
          description={projectsState.status === 'error' ? projectsState.error : t('contactAdmin')}
          onRetry={projectsState.status === 'error' ? () => loadProjects() : null}
          action={(
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              {t('logout')}
            </button>
          )}
        />
      </div>
    );
  }

  if (view === 'projects') {
    return (
      <ProjectSelectorView
        onSelectProject={handleSelectProject}
        onLogout={handleLogout}
      />
    );
  }

  const project = activeState.project || {};

  return (
    <>
      <div className={`app-layout ${isProjectAdmin ? 'has-sidebar' : ''}`}>
        {isProjectAdmin && <Sidebar activeView={view} onNavigate={handleNavigate} />}

        <div className="main-content" id="main-content">
          <div id="dashboard" className="content-area">
            <DashboardHeader
              headingRef={appHeadingRef}
              activeView={view}
              onNavigate={handleNavigate}
              onOpenNewRecord={() => setRecordModal({ open: true, mode: 'new', id: null, prefillKwh: null })}
              onOpenExecReport={() => setExecReportOpen(true)}
              onExportCsv={handleExportCsv}
              onLogout={handleLogout}
            />

            <div id="dashboard-content-area" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <ViewErrorBoundary
                viewKey={view}
                errorTitle={t('networkErrorTitle')}
                errorDesc={t('networkErrorDesc')}
              >
                <Suspense fallback={<StatePanel variant="loading" />}>
                  {view === 'settings' || view === 'investments' ? (
                    <ProjectSettingsView mode={view} />
                  ) : view === 'members' ? (
                    <MembersView />
                  ) : view === 'solarman' ? (
                    <SolarmanView
                      onPushReadingToCloud={(kwh) => {
                        setRecordModal({ open: true, mode: 'new', id: null, prefillKwh: kwh });
                      }}
                    />
                  ) : (
                    <DashboardView
                      onNavigate={handleNavigate}
                      onOpenNewRecord={() => setRecordModal({ open: true, mode: 'new', id: null, prefillKwh: null })}
                      onOpenEditRecord={(id) => setRecordModal({ open: true, mode: 'edit', id, prefillKwh: null })}
                      onDeleteRecord={(id, fecha) => setDeleteTarget({ id, fecha })}
                      onOpenCsvModal={() => setCsvModalOpen(true)}
                      onRetryProject={() => activeState.project?.id && loadProjectData(activeState.project.id)}
                    />
                  )}
                </Suspense>
              </ViewErrorBoundary>
            </div>

            <footer className="app-footer">
              <Leaf size={14} style={{ color: 'var(--solar)' }} aria-hidden="true" />
              <span>JF Solar Cloud v4.0 / Plataforma empresarial de analítica fotovoltaica</span>
            </footer>
          </div>
        </div>
      </div>

      {kioskMode && (
        <div id="kiosk-floating-bar" className="kiosk-bar">
          <div className="kiosk-bar-brand">
            <span className="online-dot" aria-hidden="true" />
            <strong>{project.name || 'Planta Solar'}</strong>
            <span className="kiosk-tag">{t('liveKiosk')}</span>
          </div>
          <div className="kiosk-bar-actions">
            <button
              type="button"
              className={`btn btn-ghost btn-xs ${kioskAutoRotate ? 'active' : ''}`}
              onClick={() => setKioskAutoRotate((v) => !v)}
            >
              <RefreshCw size={13} className={kioskAutoRotate ? 'spin' : ''} aria-hidden="true" />
              <span>{t('autoRotateViews')}</span>
            </button>
            <button
              type="button"
              className="btn btn-danger btn-xs"
              onClick={() => toggleKioskMode(false)}
            >
              <Minimize2 size={13} aria-hidden="true" />
              <span>{t('exitPresentation')}</span>
            </button>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <RecordModal
          open={recordModal.open}
          mode={recordModal.mode}
          recordId={recordModal.id}
          prefillSolarKwh={recordModal.prefillKwh}
          onClose={() => setRecordModal({ open: false, mode: 'new', id: null, prefillKwh: null })}
        />

        <CsvModal
          open={csvModalOpen}
          onClose={() => setCsvModalOpen(false)}
        />

        <ExecutiveReportModal
          open={execReportOpen}
          viewData={viewData}
          onClose={() => setExecReportOpen(false)}
        />
      </Suspense>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={t('deleteRecordTitle')}
        message={deleteTarget ? t('deleteRecordMsg', { fecha: deleteTarget.fecha }) : ''}
        confirmLabel={t('deleteRecordBtn')}
        loading={deletingRecord}
        onConfirm={handleConfirmDeleteRecord}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AuthProvider>
          <ProjectProvider>
            <AppRouter />
          </ProjectProvider>
        </AuthProvider>
      </ToastProvider>
    </AppProvider>
  );
}
