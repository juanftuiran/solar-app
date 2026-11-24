import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Cloud,
  FileUp,
  Leaf,
  Minimize2,
  PieChart,
  Plus,
  Radio,
  RefreshCw,
  Sun,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { filterByYear, getBaseRecord } from '../modules/analytics.js';
import { deleteRecord } from '../modules/supabase.js';
import { state } from '../modules/state.js';
import { downloadTextFile } from '../modules/utils.js';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProject } from '../context/ProjectContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import DashboardHeader from '../views/dashboard/DashboardHeader.jsx';
import StatePanel from '../components/StatePanel.jsx';
import { ConfirmModal } from '../components/Modal.jsx';

const RecordModal = lazy(() => import('../views/dashboard/RecordModal.jsx'));
const CsvModal = lazy(() => import('../views/dashboard/CsvModal.jsx'));
const ExecutiveReportModal = lazy(() => import('../views/dashboard/ExecutiveReportModal.jsx'));

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

function getSectionFromPath(pathname) {
  const seg = pathname.split('/').filter(Boolean).pop() || 'telemetry';
  const valid = new Set(['telemetry', 'finance', 'audit', 'monitor', 'investments', 'settings', 'members']);
  return valid.has(seg) ? seg : 'telemetry';
}

export default function ProjectShellLayout() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { kioskMode, toggleKioskMode, selectedYear, t } = useApp();
  const { signOut } = useAuth();
  const {
    activeState,
    processedData,
    isProjectAdmin,
    loadProjectData,
    reloadReadings,
    exitActiveProject,
    resetAllProjectState,
  } = useProject();
  const { showToast } = useToast();

  const [recordModal, setRecordModal] = useState({ open: false, mode: 'new', id: null, prefillKwh: null });
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [execReportOpen, setExecReportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(false);
  const [kioskAutoRotate, setKioskAutoRotate] = useState(false);

  const appHeadingRef = useRef(null);
  const activeSection = getSectionFromPath(location.pathname);

  useEffect(() => {
    if (projectId) {
      loadProjectData(projectId);
    }
  }, [projectId, loadProjectData]);

  useEffect(() => {
    state.currentView = activeSection;
    const raf = requestAnimationFrame(() => {
      appHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeSection, projectId]);

  // Kiosk auto-rotation between telemetry and finance URLs
  useEffect(() => {
    if (!kioskMode || !kioskAutoRotate || !projectId) return undefined;
    const id = setInterval(() => {
      const next = activeSection === 'telemetry' ? 'finance' : 'telemetry';
      navigate(`/projects/${projectId}/${next}`, { replace: true });
    }, 10000);
    return () => clearInterval(id);
  }, [kioskMode, kioskAutoRotate, activeSection, navigate, projectId]);

  useEffect(() => {
    if (!kioskMode) setKioskAutoRotate(false);
  }, [kioskMode]);

  const handleLogout = useCallback(async () => {
    resetAllProjectState();
    await signOut();
    navigate('/login', { replace: true });
  }, [resetAllProjectState, signOut, navigate]);

  const handleLeaveToPortfolio = useCallback(() => {
    exitActiveProject();
  }, [exitActiveProject]);

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

  const outletContext = useMemo(() => ({
    projectId,
    viewData,
    onOpenNewRecord: () => setRecordModal({ open: true, mode: 'new', id: null, prefillKwh: null }),
    onOpenEditRecord: (id) => setRecordModal({ open: true, mode: 'edit', id, prefillKwh: null }),
    onDeleteRecord: (id, fecha) => setDeleteTarget({ id, fecha }),
    onOpenCsvModal: () => setCsvModalOpen(true),
    onPushReadingToCloud: (kwh) => setRecordModal({ open: true, mode: 'new', id: null, prefillKwh: kwh }),
    onRetryProject: () => projectId && loadProjectData(projectId, null, null, { force: true }),
  }), [projectId, viewData, loadProjectData]);

  if (activeState.status === 'error' && !activeState.project) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
        <StatePanel
          variant="error"
          title={t('projectNotFoundTitle')}
          description={activeState.error || t('projectNotFoundDesc')}
          onRetry={() => projectId && loadProjectData(projectId, null, null, { force: true })}
          action={(
            <Link to="/projects" className="btn btn-ghost" onClick={handleLeaveToPortfolio}>
              {t('backToProjects')}
            </Link>
          )}
        />
      </div>
    );
  }

  const project = activeState.project || {};
  const isInitialProjectLoading = activeState.status === 'loading' && !activeState.project;
  const showAnalyticsTabs = ['telemetry', 'finance', 'audit', 'monitor'].includes(activeSection);
  const hasNoReadings = activeState.status === 'ready' && (activeState.rawData?.length || 0) === 0;
  const isAnalyticsRoute = ['telemetry', 'finance', 'audit'].includes(activeSection);

  return (
    <>
      <div className={`app-layout ${isProjectAdmin ? 'has-sidebar' : ''}`}>
        {isProjectAdmin && (
          <Sidebar
            projectId={projectId}
            activeSection={activeSection}
            readingsCount={activeState.rawData?.length || 0}
            onLeavePortfolio={handleLeaveToPortfolio}
          />
        )}

        <div className="main-content" id="main-content">
          <div id="dashboard" className="content-area">
            <DashboardHeader
              headingRef={appHeadingRef}
              projectId={projectId}
              activeSection={activeSection}
              onLeavePortfolio={handleLeaveToPortfolio}
              onOpenNewRecord={() => setRecordModal({ open: true, mode: 'new', id: null, prefillKwh: null })}
              onOpenExecReport={() => setExecReportOpen(true)}
              onExportCsv={handleExportCsv}
              onLogout={handleLogout}
            />

            {showAnalyticsTabs && (
              <div className="dashboard-tabs-row">
                <nav className="dashboard-tabs" id="dashboard-tab-bar" aria-label={t('navAnalytics')}>
                  <NavLink
                    to={`/projects/${projectId}/telemetry`}
                    className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
                  >
                    <Sun size={15} aria-hidden="true" />
                    <span>{t('tabOverview')}</span>
                  </NavLink>

                  <NavLink
                    to={`/projects/${projectId}/finance`}
                    className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
                  >
                    <PieChart size={15} aria-hidden="true" />
                    <span>{t('tabFinance')}</span>
                  </NavLink>

                  <NavLink
                    to={`/projects/${projectId}/audit`}
                    className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
                  >
                    <Cloud size={15} aria-hidden="true" />
                    <span>{t('tabAudit')}</span>
                    <span className="tab-count-badge" id="tab-readings-count">
                      {activeState.rawData?.length || 0}
                    </span>
                  </NavLink>

                  <NavLink
                    to={`/projects/${projectId}/monitor`}
                    className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
                  >
                    <Radio size={15} className="text-solar" aria-hidden="true" />
                    <span>{t('solarmanLiveTab')}</span>
                  </NavLink>
                </nav>
              </div>
            )}

            <main id="dashboard-content-area" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {isInitialProjectLoading ? (
                <StatePanel variant="loading" />
              ) : isAnalyticsRoute && hasNoReadings ? (
                <StatePanel
                  variant="no-readings"
                  title={t('noProjectReadingsTitle')}
                  description={t('noProjectReadingsDesc')}
                  action={isProjectAdmin ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-solar"
                        onClick={() => setRecordModal({ open: true, mode: 'new', id: null, prefillKwh: null })}
                      >
                        <Plus size={16} aria-hidden="true" />
                        <span>{t('newRecord')}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setCsvModalOpen(true)}
                      >
                        <FileUp size={16} className="text-accent" aria-hidden="true" />
                        <span>{t('importCsv')}</span>
                      </button>
                    </>
                  ) : null}
                />
              ) : (
                <ViewErrorBoundary
                  viewKey={`${projectId}:${activeSection}`}
                  errorTitle={t('networkErrorTitle')}
                  errorDesc={t('networkErrorDesc')}
                >
                  <Suspense fallback={<StatePanel variant="loading" />}>
                    <Outlet context={outletContext} />
                  </Suspense>
                </ViewErrorBoundary>
              )}
            </main>

            <footer className="app-footer">
              <Leaf size={14} style={{ color: 'var(--solar)' }} aria-hidden="true" />
              <span>JF Solar Cloud v4.2 · Plataforma empresarial de analítica fotovoltaica</span>
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

      {recordModal.open && (
        <Suspense fallback={null}>
          <RecordModal
            open={recordModal.open}
            mode={recordModal.mode}
            recordId={recordModal.id}
            prefillSolarKwh={recordModal.prefillKwh}
            onClose={() => setRecordModal({ open: false, mode: 'new', id: null, prefillKwh: null })}
          />
        </Suspense>
      )}

      {csvModalOpen && (
        <Suspense fallback={null}>
          <CsvModal
            open={csvModalOpen}
            onClose={() => setCsvModalOpen(false)}
          />
        </Suspense>
      )}

      {execReportOpen && (
        <Suspense fallback={null}>
          <ExecutiveReportModal
            open={execReportOpen}
            viewData={viewData}
            onClose={() => setExecReportOpen(false)}
          />
        </Suspense>
      )}

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
