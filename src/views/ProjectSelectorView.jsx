import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Coins,
  LogOut,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProject } from '../context/ProjectContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useNavigate } from 'react-router-dom';
import { createProject, getProjectCount } from '../modules/supabase.js';
import { fCOP, fDec } from '../modules/formatters.js';
import ProjectCard from '../components/ProjectCard.jsx';
import StatePanel from '../components/StatePanel.jsx';
import { Modal } from '../components/Modal.jsx';

const MAX_PROJECTS = 20;

export default function ProjectSelectorView() {
  const navigate = useNavigate();
  const { lang, setLang, theme, toggleTheme, t } = useApp();
  const { user, isAdmin, signOut } = useAuth();
  const { projectsState, loadProjects, resetAllProjectState } = useProject();
  const { showToast } = useToast();

  const headingRef = useRef(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    location: '',
    capacity_kw: '',
    description: '',
    panel_count: '',
    inverter_model: '',
    monitoring_url: '',
  });

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    if (user && projectsState.status === 'idle') {
      loadProjects(user, isAdmin);
    }
  }, [user, isAdmin, projectsState.status, loadProjects]);

  const handleLogout = async () => {
    resetAllProjectState();
    await signOut();
    navigate('/login', { replace: true });
  };

  const projects = projectsState.items || [];
  const count = projects.length;
  const userInitials = (user?.email || 'JS').slice(0, 2).toUpperCase();

  const totalCapacity = useMemo(
    () => projects.reduce((s, p) => s + (parseFloat(p.capacity_kw) || 0), 0),
    [projects],
  );
  const totalPortfolioInvested = useMemo(
    () => projects.reduce((s, p) => s + (parseFloat(p._totalInvested) || 0), 0),
    [projects],
  );
  const totalPanels = useMemo(
    () => projects.reduce((s, p) => s + (parseInt(p.panel_count, 10) || 0), 0),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return projects;
    return projects.filter((p) => {
      const hay = `${p.name || ''} ${p.location || ''} ${p.inverter_model || ''} ${p.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [projects, search]);

  const handleOpenCreate = async () => {
    const total = await getProjectCount();
    if (total >= MAX_PROJECTS) {
      showToast(t('maxProjectsReached'), 'error');
      return;
    }
    setForm({
      name: '',
      location: '',
      capacity_kw: '',
      description: '',
      panel_count: '',
      inverter_model: '',
      monitoring_url: '',
    });
    setCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name || !user) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    setCreating(true);
    try {
      await createProject({
        name,
        slug: `${slug || 'planta'}-${Date.now().toString(36)}`,
        description: form.description.trim(),
        location: form.location.trim(),
        capacity_kw: parseFloat(form.capacity_kw) || 0,
        panel_count: parseInt(form.panel_count, 10) || 0,
        inverter_model: form.inverter_model.trim(),
        monitoring_url: form.monitoring_url.trim(),
        owner_id: user.id,
      }, user.email);

      setCreateOpen(false);
      showToast(t('projectCreated'), 'success');
      await loadProjects();
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const flagCode = lang === 'en' ? 'us' : 'co';
  const langLabel = lang === 'en' ? 'EN' : 'ES';

  return (
    <div id="project-selector-view" className="project-selector">
      <header className="topbar">
        <div className="project-selector-header">
          <div className="project-selector-brand">
            <div className="brand-mark" aria-hidden="true">
              <Sun size={18} />
            </div>
            <div>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-strong)', display: 'block' }}>
                JF Solar Cloud
              </span>
              <span className="brand-sub">Enterprise Portfolio v4.0</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon"
              onClick={toggleTheme}
              title={t('toggleTheme')}
              aria-label={t('toggleTheme')}
            >
              {theme === 'light' ? (
                <Moon size={16} className="text-accent" aria-hidden="true" />
              ) : (
                <Sun size={16} className="text-warning" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              className="lang-btn"
              style={{ height: '2rem', padding: '0 .6rem' }}
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              title={t('switchLanguage')}
              aria-label={t('switchLanguage')}
            >
              <img src={`https://flagcdn.com/w20/${flagCode}.png`} className="flag-img" alt="" />
              <span>{langLabel}</span>
            </button>

            <div className="user-chip">
              <div className="avatar-pill">{userInitials}</div>
              <span className="user-chip-email hide-mobile">{user?.email || ''}</span>
            </div>

            <button
              id="btn-logout-selector"
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
            >
              <LogOut size={15} aria-hidden="true" />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="project-selector-body">
        <div className="page-hero">
          <div>
            <div className="page-hero-title">
              <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: 'clamp(1.35rem, 2.2vw, 1.75rem)', fontWeight: 700, color: 'var(--text-strong)' }}>
                {t('portfolioTitle')}
              </h1>
              <span className="count-pill">{count} / {MAX_PROJECTS}</span>
            </div>
            <p>{t('portfolioSubtitle')}</p>
          </div>

          {isAdmin && count < MAX_PROJECTS && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', flexWrap: 'wrap' }}>
              <button
                id="btn-new-project"
                type="button"
                className="btn btn-solar"
                style={{ gap: '.5rem' }}
                onClick={handleOpenCreate}
              >
                <Plus size={16} aria-hidden="true" />
                <span>{t('newPlant')}</span>
              </button>
            </div>
          )}
        </div>

        <div className="summary-strip">
          <div className="card summary-tile">
            <div className="icon-tile solar" aria-hidden="true"><Sun size={18} /></div>
            <div>
              <div className="val text-solar">{count} <span className="unit">({totalPanels} u)</span></div>
              <div className="lbl">{t('plantsAndPanels')}</div>
            </div>
          </div>

          <div className="card summary-tile">
            <div className="icon-tile accent" aria-hidden="true"><Zap size={18} /></div>
            <div>
              <div className="val text-accent">{fDec(totalCapacity, 1)} <span className="unit">kWp</span></div>
              <div className="lbl">{t('installedCapacity')}</div>
            </div>
          </div>

          <div className="card summary-tile">
            <div className="icon-tile ai" aria-hidden="true"><Coins size={18} /></div>
            <div>
              <div className="val text-strong">{totalPortfolioInvested > 0 ? fCOP(totalPortfolioInvested) : '—'}</div>
              <div className="lbl">{t('portfolioCapital')}</div>
            </div>
          </div>

          <div className="card summary-tile">
            <div className="icon-tile warning" aria-hidden="true"><ShieldCheck size={18} /></div>
            <div>
              <div className="val text-strong">{isAdmin ? t('administrator') : t('observer')}</div>
              <div className="lbl">{t('accessLevel')}</div>
            </div>
          </div>
        </div>

        <div className="project-selector-toolbar">
          <div className="search-input-wrap">
            <Search size={15} aria-hidden="true" />
            <input
              type="text"
              id="project-search-input"
              placeholder={t('searchProjectsPlaceholder')}
              aria-label={t('searchProjectsPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {projectsState.status === 'loading' && count === 0 ? (
          <StatePanel variant="loading" />
        ) : projectsState.status === 'error' && count === 0 ? (
          <StatePanel
            variant="error"
            title={t('networkErrorTitle')}
            description={projectsState.error || t('networkErrorDesc')}
            onRetry={() => loadProjects()}
          />
        ) : count === 0 ? (
          <StatePanel
            variant="empty"
            title={t('noProjectsAssigned')}
            description={isAdmin ? t('noProjectsDesc') : t('contactAdmin')}
            action={isAdmin ? (
              <button type="button" className="btn btn-solar" onClick={handleOpenCreate}>
                <Plus size={16} aria-hidden="true" />
                <span>{t('newPlant')}</span>
              </button>
            ) : null}
          />
        ) : (
          <div id="projects-grid" className="projects-grid">
            {filteredProjects.map((p) => {
              const role = p._role || (isAdmin ? 'admin' : 'observer');
              return (
                <ProjectCard
                  key={p.id}
                  project={p}
                  role={role}
                  investmentCount={p._investmentCount || 0}
                />
              );
            })}

            {isAdmin && count < MAX_PROJECTS && !search.trim() && (
              <button
                type="button"
                id="tile-new-project"
                className="new-project-tile"
                aria-label={t('newSolarProject')}
                onClick={handleOpenCreate}
              >
                <Plus size={22} aria-hidden="true" />
                <div>{t('addNewPlantTile')}</div>
                <span style={{ fontSize: '.74rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                  {t('slotsCount', { count, max: MAX_PROJECTS })}
                </span>
              </button>
            )}
          </div>
        )}
      </main>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('newSolarProject')}
        titleId="create-project-modal-title"
        maxWidth="30rem"
        icon={<div className="icon-tile sm solar" aria-hidden="true"><Sun size={16} /></div>}
      >
        <form className="create-project-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.05rem' }} onSubmit={handleCreateSubmit}>
          <div className="field">
            <label htmlFor="cp-name">{t('projectName')}</label>
            <input
              type="text"
              id="cp-name"
              required
              placeholder="Mi Planta Solar Residencial"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="cp-location">{t('location')}</label>
              <input
                type="text"
                id="cp-location"
                placeholder="Cali, Colombia"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="cp-capacity">{t('capacity')}</label>
              <input
                type="number"
                id="cp-capacity"
                step="0.1"
                min="0"
                placeholder="3.5"
                value={form.capacity_kw}
                onChange={(e) => setForm((f) => ({ ...f, capacity_kw: e.target.value }))}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="cp-description">{t('description')}</label>
            <textarea
              id="cp-description"
              rows={2}
              placeholder="Sistema solar fotovoltaico interconectado a la red..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="cp-panels">{t('panelCount')}</label>
              <input
                type="number"
                id="cp-panels"
                min="0"
                placeholder="6"
                value={form.panel_count}
                onChange={(e) => setForm((f) => ({ ...f, panel_count: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="cp-inverter">{t('inverterModel')}</label>
              <input
                type="text"
                id="cp-inverter"
                placeholder="DEYE SUN-5K"
                value={form.inverter_model}
                onChange={(e) => setForm((f) => ({ ...f, inverter_model: e.target.value }))}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="cp-monitoring">{t('monitoringUrl')}</label>
            <input
              type="url"
              id="cp-monitoring"
              placeholder="https://www.dessmonitor.com/"
              value={form.monitoring_url}
              onChange={(e) => setForm((f) => ({ ...f, monitoring_url: e.target.value }))}
            />
          </div>

          <button type="submit" className="btn btn-solar btn-lg" style={{ marginTop: '.4rem' }} disabled={creating}>
            <Plus size={16} aria-hidden="true" />
            <span>{creating ? t('saving') : t('createSolarProjectBtn')}</span>
          </button>
        </form>
      </Modal>
    </div>
  );
}
