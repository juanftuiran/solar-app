import React, { useEffect, useState } from 'react';
import {
  Cloud,
  Layers,
  Menu,
  PieChart,
  Radio,
  RefreshCw,
  Settings,
  Sun,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProject } from '../context/ProjectContext.jsx';

export default function Sidebar({ projectId, readingsCount = 0, onLeavePortfolio }) {
  const { t } = useApp();
  const { user, isAdmin } = useAuth();
  const { activeState } = useProject();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const project = activeState.project || {};
  const userInitials = (user?.email || 'JS').slice(0, 2).toUpperCase();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const analyticsLinks = [
    { path: 'telemetry', Icon: TrendingUp, labelKey: 'sectionTelemetry' },
    { path: 'finance', Icon: PieChart, labelKey: 'sectionFinance' },
    { path: 'audit', Icon: Cloud, labelKey: 'sectionAudit', badge: readingsCount },
  ];

  const managementLinks = [
    { path: 'investments', Icon: Layers, labelKey: 'investmentPhases' },
    { path: 'settings', Icon: Settings, labelKey: 'settings' },
    { path: 'members', Icon: Users, labelKey: 'members' },
  ];

  return (
    <>
      <button
        id="sidebar-toggle"
        className="sidebar-toggle"
        type="button"
        aria-label={t('toggleSidebar')}
        aria-expanded={mobileOpen}
        aria-controls="sidebar-panel"
        onClick={() => setMobileOpen((prev) => !prev)}
      >
        {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>

      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside id="sidebar-panel" className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <Sun size={18} />
          </div>
          <div>
            <h2>JF Solar Cloud</h2>
            <span className="brand-sub">Telemetry v4.2</span>
          </div>
        </div>

        <div className="sidebar-project">
          <div className="sidebar-project-label">{t('activePlant')}</div>
          <div className="sidebar-project-name" title={project.name || ''}>
            {project.name || 'Proyecto'}
          </div>
          <div className="sidebar-project-meta">
            <span className="online-dot" aria-hidden="true" />
            <span>{project.location || 'Online'}</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label={t('mainMenu')}>
          <div className="sidebar-section-label">{t('navAnalytics')}</div>
          {analyticsLinks.map(({ path, Icon, labelKey, badge }) => (
            <NavLink
              key={path}
              to={`/projects/${projectId}/${path}`}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} aria-hidden="true" />
              <span style={{ flex: 1 }}>{t(labelKey)}</span>
              {typeof badge === 'number' && badge > 0 && (
                <span className="sidebar-count-pill">{badge}</span>
              )}
            </NavLink>
          ))}

          <div className="sidebar-section-label">{t('navRealtime')}</div>
          <NavLink
            to={`/projects/${projectId}/monitor`}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <Radio size={16} className="text-solar" aria-hidden="true" />
            <span style={{ flex: 1 }}>{t('solarmanLive')}</span>
            <span className="online-dot" aria-hidden="true" />
          </NavLink>

          <div className="sidebar-section-label">{t('navManagement')}</div>
          {managementLinks.map(({ path, Icon, labelKey }) => (
            <NavLink
              key={path}
              to={`/projects/${projectId}/${path}`}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{t(labelKey)}</span>
            </NavLink>
          ))}

          <div className="sidebar-divider" />
          <div className="sidebar-section-label">{t('projectsSection')}</div>

          <Link
            to="/projects"
            className="sidebar-nav-item"
            onClick={onLeavePortfolio}
          >
            <RefreshCw size={16} aria-hidden="true" />
            <span>{t('switchPlant')}</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar-pill">{userInitials}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="sidebar-user-email" title={user?.email || ''}>
                {user?.email || ''}
              </div>
              <div className="sidebar-user-role">
                {isAdmin ? t('administrator') : t('observer')}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
