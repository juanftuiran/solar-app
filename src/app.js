/**
 * @module app
 * @description Lean multi-project router & bootstrapper with lazy-loaded sub-views and controllers.
 */

import './tokens.css';
import './base.css';
import './app.css';
import './refine.css';
import './styles/mobile.css';

import { state, setActiveProject, setView, clearProjectData, savePrefs } from './modules/state.js';
import { t } from './modules/i18n.js';
import {
  getSession,
  signIn,
  signOut,
  getUserRole,
  fetchProjectReadings,
  getUserProjects,
  getProject,
  getProjectCount,
  createProject,
  getUserProjectRole,
  getProjectMembers,
  getProjectInvestments,
} from './modules/supabase.js';
import { processData } from './modules/analytics.js';
import {
  solarmanRuntime,
  resetSolarmanRuntime,
  stopSolarmanLiveSync,
} from './modules/solarman.js';
import { showModal, closeModal as closeGlobalModal } from './components/modal.js';
import { showToast, applyTheme, toggleKioskMode } from './app/ui.js';
import { handleExportCsv } from './app/csvExport.js';
import {
  registerProjectCallbacks,
  handleSaveSettings,
  handleCreatePhase,
  handleEditPhase,
  handleDeletePhase,
  handleAddMember,
  handleRemoveMember,
  handleChangeRole,
} from './app/projectController.js';

import * as loginView from './views/loginView.js';
import * as projectSelectorView from './views/projectSelectorView.js';

const app = () => document.getElementById('app');

let _dashViewMod = null;
let _dashCtrlMod = null;
let _chartsMod = null;

async function _loadDashboardDeps() {
  if (!_dashViewMod || !_dashCtrlMod || !_chartsMod) {
    [_dashViewMod, _dashCtrlMod, _chartsMod] = await Promise.all([
      import('./views/dashboardView.js'),
      import('./app/dashboardController.js'),
      import('./modules/charts.js'),
    ]);
  }
  return {
    dashboardView: _dashViewMod,
    dashCtrl: _dashCtrlMod,
    charts: _chartsMod,
  };
}

// ── Theme & Language ──────────────────────────────────────────────────────────
async function toggleTheme() {
  applyTheme(state.theme === 'light' ? 'dark' : 'light');
  if (state.currentView === 'projects') {
    app().innerHTML = projectSelectorView.render();
    projectSelectorView.init(handleSelectProject, handleCreateProject, handleLogout);
  } else if (state.activeProject) {
    await renderDashboardView(state.currentView || 'dashboard');
  }
}

async function changeLang(lang, flagCode, text) {
  state.lang = lang;
  document.body.setAttribute('data-lang', lang);
  savePrefs();

  const flagEl = document.getElementById('current-flag');
  const txtEl = document.getElementById('current-lang-text');
  if (flagEl) flagEl.innerHTML = `<img src="https://flagcdn.com/w20/${flagCode}.png" class="flag-img" alt="flag">`;
  if (txtEl) txtEl.innerText = text;
  document.activeElement?.blur();
  document.getElementById('lang-menu')?.classList.add('hidden');

  if (state.currentView === 'projects') {
    app().innerHTML = projectSelectorView.render();
    projectSelectorView.init(handleSelectProject, handleCreateProject, handleLogout);
    return;
  }

  if (state.currentView === 'solarman') {
    const solarmanCtrl = await import('./app/solarmanController.js');
    const { dashCtrl } = await _loadDashboardDeps();
    await solarmanCtrl.refreshSolarmanDOM(dashCtrl.openRecordModal);
    return;
  }

  if (state.rawData.length && _dashCtrlMod) {
    state.processedData = processData(state.rawData);
    _dashCtrlMod.renderDashboardData();
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
async function navigate(view, opts = {}) {
  if (_chartsMod) _chartsMod.destroyAllCharts();
  setView(view);

  switch (view) {
    case 'login':
      app().innerHTML = loginView.render();
      loginView.init(handleLogin);
      break;

    case 'projects':
      await loadProjects();
      app().innerHTML = projectSelectorView.render();
      projectSelectorView.init(handleSelectProject, handleCreateProject, handleLogout);
      break;

    case 'dashboard':
      if (opts.projectId) {
        await loadProjectData(opts.projectId);
      }
      await renderDashboardView('dashboard');
      break;

    case 'settings':
    case 'investments':
    case 'members':
    case 'solarman':
      await renderDashboardView(view);
      break;

    default:
      navigate('login');
  }
}

async function renderDashboardView(subView) {
  const { dashboardView, dashCtrl, charts } = await _loadDashboardDeps();
  charts.destroyAllCharts();
  setView(subView);

  let contentHTML = null;
  let settingsMod = null;
  let membersMod = null;
  let solarmanCtrl = null;

  if (subView === 'settings' || subView === 'investments') {
    settingsMod = await import('./views/projectSettingsView.js');
    contentHTML = settingsMod.render(subView);
  } else if (subView === 'members') {
    const [members, mod] = await Promise.all([
      state.activeProject ? getProjectMembers(state.activeProject.id) : Promise.resolve([]),
      import('./views/membersView.js'),
    ]);
    membersMod = mod;
    contentHTML = membersMod.render(members);
  } else if (subView === 'solarman') {
    solarmanCtrl = await import('./app/solarmanController.js');
    const solarmanView = await solarmanCtrl.getSolarmanView();
    contentHTML = solarmanView.render();
  }

  app().innerHTML = dashboardView.render(contentHTML);

  dashboardView.init({
    onYearChange: () => dashCtrl.renderDashboardData(),
    onSaveRecord: dashCtrl.handleSaveRecord,
    onDeleteRecord: dashCtrl.handleDeleteRecord,
    onEditRecord: (id) => dashCtrl.openRecordModal('edit', id),
    onOpenNewRecord: () => dashCtrl.openRecordModal('new'),
    onToggleChartMode: dashCtrl.handleToggleChartMode,
    onLogout: handleLogout,
    onNavigate: handleSidebarNavigate,
    onLangChange: changeLang,
    onExportCsv: handleExportCsv,
    onImportCsv: dashCtrl.handleImportCsv,
    onSimChange: () => charts.renderProjectionChart(),
    onToggleTheme: toggleTheme,
    onToggleKiosk: toggleKioskMode,
    onTabChange: (tab) => {
      if (tab === 'finance') {
        charts.renderPaybackChart();
        charts.renderProjectionChart();
      }
    },
  });

  if (subView === 'settings' || subView === 'investments') {
    settingsMod.init({
      onSaveSettings: handleSaveSettings,
      onCreatePhase: handleCreatePhase,
      onEditPhase: handleEditPhase,
      onDeletePhase: handleDeletePhase,
    });
  } else if (subView === 'members') {
    membersMod.init({
      onAddMember: handleAddMember,
      onRemoveMember: handleRemoveMember,
      onChangeRole: handleChangeRole,
    });
  } else if (subView === 'solarman') {
    await solarmanCtrl.initAndSyncSolarmanView(dashCtrl.openRecordModal);
  } else {
    dashCtrl.renderDashboardData();
  }
}

async function loadAndRenderMembers() {
  await renderDashboardView('members');
}

registerProjectCallbacks({
  renderView: renderDashboardView,
  reloadMembers: loadAndRenderMembers,
});

// ── Data Loading ──────────────────────────────────────────────────────────────
async function loadProjects() {
  if (!state.user) return;
  try {
    const projects = await getUserProjects(state.user.id, state.isAdmin);
    state.projects = projects || [];
  } catch {
    state.projects = [];
  }
}

async function loadProjectData(projectId) {
  try {
    if (solarmanRuntime.loadedProjectId && solarmanRuntime.loadedProjectId !== projectId) {
      stopSolarmanLiveSync();
      resetSolarmanRuntime();
    }

    const project = await getProject(projectId);
    if (!project) throw new Error('Project not found');

    const role = state.isAdmin ? 'admin' : await getUserProjectRole(projectId, state.user.id);
    setActiveProject(project, role || 'observer');

    const [readings, investments] = await Promise.all([
      fetchProjectReadings(projectId),
      getProjectInvestments(projectId),
    ]);

    state.rawData = (readings || []).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if ((a.monthIdx || 0) !== (b.monthIdx || 0)) return (a.monthIdx || 0) - (b.monthIdx || 0);
      return (a.fecha || '').localeCompare(b.fecha || '');
    });
    state.processedData = processData(state.rawData);
    state.investments = investments || [];
  } catch (e) {
    console.error('Error loading project data:', e);
    clearProjectData();
  }
}

// ── Auth & Project Lifecycle Handlers ─────────────────────────────────────────
async function handleLogin(email, password) {
  const btn = document.getElementById('btn-login');
  const orig = btn?.innerHTML;
  if (btn) {
    btn.innerHTML = `<i class="fa-solid fa-circle-notch spin"></i> ${t('connecting')}`;
    btn.disabled = true;
  }

  try {
    const result = await signIn(email, password);
    if (result.error || !result.user) {
      showToast(`${t('error')}: Verifica tus credenciales`, 'error');
      if (btn) { btn.innerHTML = orig; btn.disabled = false; }
      return;
    }
    state.user = result.user;
    const role = await getUserRole(state.user.email);
    state.isAdmin = role === 'admin';

    if (state.isAdmin) {
      await navigate('projects');
    } else {
      await loadProjects();
      if (state.projects.length === 1) {
        await navigate('dashboard', { projectId: state.projects[0].id });
      } else if (state.projects.length === 0) {
        app().innerHTML = `
          <div class="empty-state" style="min-height:100vh">
            <i class="fa-solid fa-folder-open"></i>
            <h3><span class="lang-es">${t('noProjectsAssigned')}</span><span class="lang-en">${t('noProjectsAssigned')}</span></h3>
            <p><span class="lang-es">${t('contactAdmin')}</span><span class="lang-en">${t('contactAdmin')}</span></p>
            <button class="btn btn-ghost" style="margin-top:1.5rem" onclick="window.__logout()">
              <i class="fa-solid fa-power-off"></i> Logout
            </button>
          </div>`;
        window.__logout = handleLogout;
      } else {
        await navigate('projects');
      }
    }
  } catch (e) {
    showToast(`${t('error')}: ${e.message}`, 'error');
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  }
}

async function handleLogout() {
  stopSolarmanLiveSync();
  resetSolarmanRuntime();
  await signOut();
  state.user = null;
  state.isAdmin = false;
  state.projects = [];
  clearProjectData();
  setActiveProject(null, null);
  navigate('login');
}

async function handleSelectProject(projectId) {
  await navigate('dashboard', { projectId });
}

async function handleCreateProject() {
  const count = await getProjectCount();
  if (count >= 20) {
    showToast(t('maxProjectsReached'), 'error');
    return;
  }

  const bodyHTML = `
    <form id="create-project-form" class="create-project-form" style="display:flex;flex-direction:column;gap:1.15rem;">
      <div class="field">
        <label><span class="lang-es">Nombre del Proyecto</span><span class="lang-en">Project Name</span></label>
        <input type="text" id="cp-name" required placeholder="Mi Planta Solar Residencial">
      </div>
      <div class="field-row">
        <div class="field">
          <label><span class="lang-es">Ubicación</span><span class="lang-en">Location</span></label>
          <input type="text" id="cp-location" placeholder="Cali, Colombia">
        </div>
        <div class="field">
          <label><span class="lang-es">Capacidad (kW)</span><span class="lang-en">Capacity (kW)</span></label>
          <input type="number" id="cp-capacity" step="0.1" placeholder="3.5">
        </div>
      </div>
      <div class="field">
        <label><span class="lang-es">Descripción</span><span class="lang-en">Description</span></label>
        <textarea id="cp-description" rows="2" placeholder="Sistema solar fotovoltaico interconectado a la red..."></textarea>
      </div>
      <div class="field-row">
        <div class="field">
          <label><span class="lang-es">Cantidad Paneles</span><span class="lang-en">Panels</span></label>
          <input type="number" id="cp-panels" placeholder="6">
        </div>
        <div class="field">
          <label><span class="lang-es">Modelo Inversor</span><span class="lang-en">Inverter Model</span></label>
          <input type="text" id="cp-inverter" placeholder="DEYE SUN-5K">
        </div>
      </div>
      <div class="field">
        <label><span class="lang-es">URL Portal de Monitoreo</span><span class="lang-en">Monitoring URL</span></label>
        <input type="url" id="cp-monitoring" placeholder="https://www.dessmonitor.com/">
      </div>
      <button type="submit" class="btn btn-solar btn-lg" style="margin-top:.5rem">
        <i class="fa-solid fa-plus"></i>
        <span class="lang-es">Crear Proyecto Solar</span><span class="lang-en">Create Solar Project</span>
      </button>
    </form>`;

  showModal('Nuevo Proyecto Solar', 'New Solar Project', bodyHTML);

  setTimeout(() => {
    document.getElementById('create-project-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('cp-name')?.value?.trim();
      if (!name) return;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      try {
        await createProject({
          name,
          slug: slug + '-' + Date.now().toString(36),
          description: document.getElementById('cp-description')?.value || '',
          location: document.getElementById('cp-location')?.value || '',
          capacity_kw: parseFloat(document.getElementById('cp-capacity')?.value) || 0,
          panel_count: parseInt(document.getElementById('cp-panels')?.value, 10) || 0,
          inverter_model: document.getElementById('cp-inverter')?.value || '',
          monitoring_url: document.getElementById('cp-monitoring')?.value || '',
          owner_id: state.user.id,
        }, state.user.email);

        closeGlobalModal();
        showToast(state.lang === 'es' ? 'Proyecto creado exitosamente' : 'Project created successfully', 'success');
        await navigate('projects');
      } catch (err) {
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    });
  }, 100);
}

function handleSidebarNavigate(viewName) {
  if (viewName === 'projects' || viewName === 'switch-project') {
    stopSolarmanLiveSync();
    resetSolarmanRuntime();
    setActiveProject(null, null);
    navigate('projects');
    return;
  }
  renderDashboardView(viewName);
}

// ── Global Handlers (for inline HTML callbacks) ───────────────────────────────
window.__navigate = (view) => handleSidebarNavigate(view);
window.__logout = handleLogout;
window.__changeLang = changeLang;
window.__toggleTheme = toggleTheme;
window.__toggleKiosk = toggleKioskMode;
window.__openRecordModal = async (action, id) => {
  const { dashCtrl } = await _loadDashboardDeps();
  dashCtrl.openRecordModal(action, id);
};
window.__closeRecordModal = () => document.getElementById('add-record-modal')?.classList.add('hidden');
window.__handleToggleChartMode = async (k, m) => {
  const { dashCtrl } = await _loadDashboardDeps();
  dashCtrl.handleToggleChartMode(k, m);
};
window.__selectProject = handleSelectProject;
window.__createProject = handleCreateProject;
window.__toggleLangMenu = () => document.getElementById('lang-menu')?.classList.toggle('hidden');
window.__toggleSidebar = () => {
  document.querySelector('.sidebar')?.classList.toggle('open');
  document.querySelector('.sidebar-overlay')?.classList.toggle('visible');
};
window.__closeSidebar = () => {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('visible');
};
window.__toggleProjectionDetail = () => {
  document.getElementById('proyeccion-detallada')?.classList.toggle('hidden');
};
window.__handleSaveRecord = async (e) => {
  const { dashCtrl } = await _loadDashboardDeps();
  return dashCtrl.handleSaveRecord(e);
};
window.__handleCreatePhase = handleCreatePhase;
window.__handleSaveSettings = handleSaveSettings;
window.__handleDeletePhase = handleDeletePhase;
window.__handleEditPhase = handleEditPhase;
window.__handleExportCsv = handleExportCsv;

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.body.setAttribute('data-lang', state.lang || 'es');
  applyTheme(state.theme || 'dark');

  try {
    const session = await getSession();
    if (session?.user) {
      state.user = session.user;
      const role = await getUserRole(state.user.email);
      state.isAdmin = role === 'admin';

      await loadProjects();

      if (state.lastProjectId && state.projects.some((p) => p.id === state.lastProjectId)) {
        await navigate('dashboard', { projectId: state.lastProjectId });
        return;
      }

      if (state.isAdmin) {
        await navigate('projects');
      } else if (state.projects.length === 1) {
        await navigate('dashboard', { projectId: state.projects[0].id });
      } else if (state.projects.length > 1) {
        await navigate('projects');
      } else {
        navigate('login');
      }
    } else {
      navigate('login');
    }
  } catch (e) {
    console.error('Bootstrap error:', e);
    navigate('login');
  }
});
