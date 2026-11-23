import React, { useState } from 'react';
import {
  Layers,
  Menu,
  Radio,
  RefreshCw,
  Settings,
  Sun,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProject } from '../context/ProjectContext.jsx';

const NAV_ITEMS = [
  { id: 'dashboard', Icon: TrendingUp, labelKey: 'dashboard' },
  { id: 'solarman', Icon: Radio, labelKey: 'solarmanLive' },
  { id: 'investments', Icon: Layers, labelKey: 'investmentPhases' },
  { id: 'settings', Icon: Settings, labelKey: 'settings' },
  { id: 'members', Icon: Users, labelKey: 'members' },
];

export default function Sidebar({ activeView, onNavigate }) {
  const { t } = useApp();
  const { user, isAdmin } = useAuth();
  const { activeState } = useProject();
  const [mobileOpen, setMobileOpen] = useState(false);

  const project = activeState.project || {};
  const userInitials = (user?.email || 'JS').slice(0, 2).toUpperCase();

  const handleNav = (view) => {
    setMobileOpen(false);
    onNavigate(view);
  };

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
            <span className="brand-sub">Telemetry v4.0</span>
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

        <div className="sidebar-section-label">{t('mainMenu')}</div>

        <nav className="sidebar-nav" aria-label={t('mainMenu')}>
          {NAV_ITEMS.map(({ id, Icon, labelKey }) => {
            const isActive = id === activeView;
            return (
              <button
                key={id}
                type="button"
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNav(id)}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{t(labelKey)}</span>
              </button>
            );
          })}

          <div className="sidebar-divider" />
          <div className="sidebar-section-label" style={{ paddingLeft: 0 }}>
            {t('projectsSection')}
          </div>

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => handleNav('projects')}
          >
            <RefreshCw size={16} aria-hidden="true" />
            <span>{t('switchPlant')}</span>
          </button>
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
