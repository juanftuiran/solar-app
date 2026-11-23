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
  Radio,
  Sun,
  TrendingUp,
  Tv,
  Zap,
} from 'lucide-react';
import { fDec } from '../../modules/formatters.js';
import { getAvailableYears } from '../../modules/analytics.js';
import { useApp } from '../../context/AppContext.jsx';
import { useProject } from '../../context/ProjectContext.jsx';

export default function DashboardHeader({
  headingRef,
  activeView,
  onNavigate,
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

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-breadcrumbs">
          <button
            type="button"
            className="breadcrumb-link"
            onClick={() => onNavigate('projects')}
          >
            <Sun size={12} style={{ marginRight: '.25rem' }} aria-hidden="true" />
            <span>{t('portfolio')}</span>
          </button>
          <span className="sep" aria-hidden="true"><ChevronRight size={12} /></span>
          <span className="current">{project.name || 'JF Solar Cloud'}</span>
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

        {activeView === 'solarman' ? (
          <button
            className="btn btn-ghost"
            type="button"
            title={t('dashboard')}
            onClick={() => onNavigate('dashboard')}
          >
            <TrendingUp size={16} className="text-accent" aria-hidden="true" />
            <span className="hide-sm">{t('dashboard')}</span>
          </button>
        ) : (
          <button
            className="btn btn-ghost"
            type="button"
            title={t('solarmanLive')}
            onClick={() => onNavigate('solarman')}
          >
            <Radio size={16} className="text-solar" aria-hidden="true" />
            <span className="hide-sm">{t('solarmanLive')}</span>
          </button>
        )}

        {project.monitoring_url && (
          <button
            id="btn-monitoring-link"
            className="btn btn-ghost btn-icon"
            type="button"
            title={t('monitoringUrl')}
            aria-label={t('monitoringUrl')}
            onClick={() => window.open(project.monitoring_url, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={16} aria-hidden="true" />
          </button>
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
