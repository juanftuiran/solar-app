import React, { useMemo } from 'react';
import { Cloud, FileUp, PieChart, Plus, Radio, Sun } from 'lucide-react';
import { filterByYear } from '../modules/analytics.js';
import { useApp } from '../context/AppContext.jsx';
import { useProject } from '../context/ProjectContext.jsx';
import StatePanel from '../components/StatePanel.jsx';
import TelemetryTab from './dashboard/TelemetryTab.jsx';
import FinanceTab from './dashboard/FinanceTab.jsx';
import AuditTab from './dashboard/AuditTab.jsx';

export default function DashboardView({
  onNavigate,
  onOpenNewRecord,
  onOpenEditRecord,
  onDeleteRecord,
  onOpenCsvModal,
  onRetryProject,
}) {
  const { activeTab, setActiveTab, selectedYear, t } = useApp();
  const { activeState, processedData, isProjectAdmin } = useProject();

  const viewData = useMemo(
    () => filterByYear(processedData, selectedYear),
    [processedData, selectedYear],
  );

  if (activeState.status === 'loading' && !activeState.project) {
    return <StatePanel variant="loading" />;
  }

  if (activeState.status === 'error' && !activeState.project) {
    return (
      <StatePanel
        variant="error"
        title={t('networkErrorTitle')}
        description={activeState.error || t('networkErrorDesc')}
        onRetry={onRetryProject}
      />
    );
  }

  return (
    <>
      <div className="dashboard-tabs-row">
        <div className="dashboard-tabs" id="dashboard-tab-bar" role="tablist">
          <button
            className={`tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'telemetry'}
            onClick={() => setActiveTab('telemetry')}
          >
            <Sun size={15} aria-hidden="true" />
            <span>{t('tabOverview')}</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'finance' ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'finance'}
            onClick={() => setActiveTab('finance')}
          >
            <PieChart size={15} aria-hidden="true" />
            <span>{t('tabFinance')}</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
          >
            <Cloud size={15} aria-hidden="true" />
            <span>{t('tabAudit')}</span>
            <span className="tab-count-badge" id="tab-readings-count">
              {activeState.rawData?.length || 0}
            </span>
          </button>

          <button
            className="tab-btn"
            type="button"
            onClick={() => onNavigate('solarman')}
          >
            <Radio size={15} className="text-solar" aria-hidden="true" />
            <span>{t('solarmanLiveTab')}</span>
          </button>
        </div>
      </div>

      {activeState.status === 'ready' && (activeState.rawData?.length || 0) === 0 ? (
        <StatePanel
          variant="no-readings"
          title={t('noProjectReadingsTitle')}
          description={t('noProjectReadingsDesc')}
          action={isProjectAdmin ? (
            <>
              <button type="button" className="btn btn-solar" onClick={onOpenNewRecord}>
                <Plus size={16} aria-hidden="true" />
                <span>{t('newRecord')}</span>
              </button>
              <button type="button" className="btn btn-ghost" onClick={onOpenCsvModal}>
                <FileUp size={16} className="text-accent" aria-hidden="true" />
                <span>{t('importCsv')}</span>
              </button>
            </>
          ) : null}
        />
      ) : (
        <div className="tab-pane active">
          {activeTab === 'telemetry' && <TelemetryTab viewData={viewData} />}
          {activeTab === 'finance' && <FinanceTab viewData={viewData} />}
          {activeTab === 'audit' && (
            <AuditTab
              onOpenEditRecord={onOpenEditRecord}
              onDeleteRecord={onDeleteRecord}
              onOpenCsvModal={onOpenCsvModal}
            />
          )}
        </div>
      )}
    </>
  );
}
