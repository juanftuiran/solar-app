import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Cpu,
  ExternalLink,
  FileDown,
  FileText,
  LogOut,
  Moon,
  Plus,
  Sun,
  Tv,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fDec } from '../../modules/formatters.js';
import { getAvailableYears } from '../../modules/analytics.js';
import { useApp } from '../../context/AppContext.jsx';
import { useProject } from '../../context/ProjectContext.jsx';

const SECTION_LABEL_KEYS = {
  telemetry: 'sectionTelemetry',
  finance: 'sectionFinance',
  audit: 'sectionAudit',
  monitor: 'sectionMonitor',
  investments: 'sectionInvestments',
  settings: 'sectionSettings',
  members: 'sectionMembers',
};

export default function DashboardHeader({
  headingRef,
  activeSection,
  onLeavePortfolio,
  onOpenNewRecord,
  onOpenExecReport,
  onExportCsv,
  onLogout,
}) {
  const { lang, setLang, theme, toggleTheme, toggleKioskMode, selectedYear, setSelectedYear, t } = useApp();
  const { activeState, processedData, isProjectAdmin } = useProject();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langDropdownRef = useRef(null);

  const project = activeState.project || {};
  const capacityStr = project.capacity_kw ? `${fDec(project.capacity_kw, 1)} kWp` : '';
  const availableYears = getAvailableYears(processedData, activeState.rawData);
  const showYearFilter = ['telemetry', 'finance', 'audit'].includes(activeSection);

  const rawMonitoringUrl = (project.monitoring_url || '').trim();
  const normalizedMonitoringUrl = rawMonitoringUrl
    ? (/^https?:\/\//i.test(rawMonitoringUrl) ? rawMonitoringUrl : `https://${rawMonitoringUrl}`)
    : '';

  useEffect(() => {
    if (!langMenuOpen) return undefined;
    const handleOutside = (e) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, [langMenuOpen]);

  const flagCode = lang === 'en' ? 'us' : 'co';
  const langLabel = lang === 'en' ? 'EN' : 'ES';
  const sectionTitleKey = SECTION_LABEL_KEYS[activeSection] || 'sectionTelemetry';

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-breadcrumbs">
          <Link
            to="/projects"
            className="breadcrumb-link"
            onClick={onLeavePortfolio}
          >
            <Sun size={12} style={{ marginRight: '.25rem' }} aria-hidden="true" />
            <span>{t('portfolio')}</span>
          </Link>
          <span className="sep" aria-hidden="true"><ChevronRight size={12} /></span>
          <span className="current">{project.name || 'JF Solar Cloud'}</span>
          <span className="sep hide-sm" aria-hidden="true"><ChevronRight size={12} /></span>
          <span className="hide-sm" style={{ color: 'var(--text-secondary)' }}>{t(sectionTitleKey)}</span>
        </div>

        <div className="header-title-row">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="header-project-name"
            title={project.name || 'JF Solar Cloud'}
          >
            {project.name || 'JF Solar Cloud'}
          </h1>

          <span className="status-pill">
            <span className="online-dot" aria-hidden="true" />
            <span>{t('online')}</span>
          </span>

          {capacityStr && (
            <span className="meta-chip accent" title={t('nominalCapacity')}>
              <Zap size={12} aria-hidden="true" /> {capacityStr}
            </span>
          )}

          {project.inverter_model && (
            <span className="meta-chip warning hide-sm" title={t('inverterModel')}>
              <Cpu size={12} aria-hidden="true" /> {project.inverter_model}
            </span>
          )}
        </div>
      </div>

      <div className="header-actions">
        <button
          id="btn-theme-toggle"
          className="btn btn-ghost btn-icon"
          type="button"
          title={t('toggleTheme')}
          aria-label={t('toggleTheme')}
          onClick={toggleTheme}
        >
          {theme === 'light' ? (
            <Moon size={16} className="text-accent" aria-hidden="true" />
          ) : (
            <Sun size={16} className="text-warning" aria-hidden="true" />
          )}
        </button>

        <button
          id="btn-kiosk-mode"
          className="btn btn-ghost btn-icon hide-sm"
          type="button"
          title={t('kioskMode')}
          aria-label={t('kioskMode')}
          onClick={() => toggleKioskMode()}
        >
          <Tv size={16} className="text-ai" aria-hidden="true" />
        </button>

        <div className="lang-dropdown" ref={langDropdownRef}>
          <button
            className="lang-btn"
            id="lang-toggle-btn"
            type="button"
            aria-label={t('switchLanguage')}
            aria-expanded={langMenuOpen}
            onClick={() => setLangMenuOpen((v) => !v)}
          >
            <img src={`https://flagcdn.com/w20/${flagCode}.png`} className="flag-img" alt="" />
            <span>{langLabel}</span>
            <ChevronDown size={12} style={{ opacity: 0.7 }} aria-hidden="true" />
          </button>

          {langMenuOpen && (
            <div className="lang-menu" id="lang-menu">
              <button
                className="lang-option lang-option-btn"
                type="button"
                onClick={() => {
                  setLang('es');
                  setLangMenuOpen(false);
                }}
              >
                <img src="https://flagcdn.com/w20/co.png" className="flag-img" alt="" /> Español
              </button>
              <button
                className="lang-option lang-option-btn"
                type="button"
                onClick={() => {
                  setLang('en');
                  setLangMenuOpen(false);
                }}
              >
                <img src="https://flagcdn.com/w20/us.png" className="flag-img" alt="" /> English
              </button>
            </div>
          )}
        </div>

        {showYearFilter && (
          <select
            id="year-filter"
            className="select-pill"
            aria-label={t('filterByYear')}
            value={String(selectedYear || 'all')}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="all">{t('allYears')}</option>
            {availableYears.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        )}

        <button
          id="btn-exec-report"
          className="btn btn-ghost"
          type="button"
          title={t('execReportTitle')}
          onClick={onOpenExecReport}
        >
          <FileText size={16} className="text-danger" aria-hidden="true" />
          <span className="hide-sm">{t('report')}</span>
        </button>

        <button
          id="btn-export-csv"
          className="btn btn-ghost"
          type="button"
          title={t('csvExportSuccess')}
          onClick={onExportCsv}
        >
          <FileDown size={16} className="text-accent" aria-hidden="true" />
          <span>CSV</span>
        </button>

        {isProjectAdmin && (
          <button
            id="btn-open-new-record"
            className="btn btn-solar"
            type="button"
            onClick={onOpenNewRecord}
          >
            <Plus size={16} aria-hidden="true" />
            <span>{t('newRecord')}</span>
          </button>
        )}

        <div className="header-divider" />

        {normalizedMonitoringUrl && (
          <a
            id="btn-monitoring-link"
            className="btn btn-ghost btn-icon"
            href={normalizedMonitoringUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={t('monitoringUrl')}
            aria-label={t('monitoringUrl')}
          >
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        )}

        <button
          id="btn-dashboard-logout"
          className="btn btn-ghost btn-icon"
          type="button"
          title={t('signOut')}
          aria-label={t('signOut')}
          onClick={onLogout}
        >
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
