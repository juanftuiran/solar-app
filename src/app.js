/**
 * JF Solar Cloud — Multi-Project App v3.0
 * Main entry point, router, and orchestrator
 */
import './app.css';
import { state, setUser, setActiveProject, clearProjectData, setView } from './modules/state.js';
import { sb, signIn, signOut, getSession, getUserRole, getUserProjects, getProject, createProject, updateProject, getProjectMembers, addProjectMember, removeProjectMember, updateMemberRole, getUserProjectRole, getProjectInvestments, createInvestment, updateInvestment, deleteInvestment, fetchProjectReadings, upsertRecord, deleteRecord, fetchAllReadings, getProjectCount } from './modules/supabase.js';
import { fCOP, fDec, fKwh, fPct, debounce } from './modules/formatters.js';
import { t, monthName, MONTHS } from './modules/i18n.js';
import { processData, filterByYear, calcProjections, calcKPIs } from './modules/analytics.js';
import { renderEnergyChart, renderPriceChart, renderProjectionChart, destroyAllCharts, updateChartIcons } from './modules/charts.js';

import * as loginView from './views/loginView.js';
import * as projectSelectorView from './views/projectSelectorView.js';
import * as dashboardView from './views/dashboardView.js';
import * as projectSettingsView from './views/projectSettingsView.js';
import * as membersView from './views/membersView.js';

import { showModal, closeModal as closeGlobalModal } from './components/modal.js';

// ── App Container ─────────────────────────────────────────────────────────────
const app = () => document.getElementById('app');

// ── Toast Notification ────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ── Language ──────────────────────────────────────────────────────────────────
function changeLang(lang, flagCode, text) {
  state.lang = lang;
  document.body.setAttribute('data-lang', lang);
  const flagEl = document.getElementById('current-flag');
  const txtEl = document.getElementById('current-lang-text');
  if (flagEl) flagEl.innerHTML = `<img src="https://flagcdn.com/w20/${flagCode}.png" class="flag-img">`;
  if (txtEl) txtEl.innerText = text;
  document.activeElement?.blur();
  // Close lang menu
  document.getElementById('lang-menu')?.classList.add('hidden');
  // Re-render if we have data
  if (state.processedData.length) {
    state.processedData = processData(state.rawData);
    renderDashboardData();
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
async function navigate(view, opts = {}) {
  destroyAllCharts();
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
      // If entering dashboard, load project data
      if (opts.projectId) {
        await loadProjectData(opts.projectId);
      }
      renderDashboardView('dashboard');
      break;

    case 'settings':
      renderDashboardView('settings');
      break;

    case 'investments':
      renderDashboardView('investments');
      break;

    case 'members':
      renderDashboardView('members');
      break;

    default:
      navigate('login');
  }
}

// ── Dashboard View Rendering ──────────────────────────────────────────────────
async function renderDashboardView(subView) {
  state.currentView = subView;
  
  let contentHTML = null;
  let members = [];
  
  if (subView === 'settings' || subView === 'investments') {
    contentHTML = projectSettingsView.render();
  } else if (subView === 'members') {
    members = state.activeProject ? await getProjectMembers(state.activeProject.id) : [];
    contentHTML = membersView.render(members);
  }
  
  app().innerHTML = dashboardView.render(contentHTML);

  // Init sidebar + header events
  dashboardView.init({
    onYearChange: () => renderDashboardData(),
    onSaveRecord: handleSaveRecord,
    onDeleteRecord: handleDeleteRecord,
    onEditRecord: (id) => openRecordModal('edit', id),
    onOpenNewRecord: () => openRecordModal('new'),
    onToggleChart: handleToggleChart,
    onLogout: handleLogout,
    onNavigate: handleSidebarNavigate,
    onLangChange: changeLang,
  });

  // Init subview specific events
  switch (subView) {
    case 'dashboard':
      renderDashboardData();
      break;

    case 'settings':
    case 'investments':
      projectSettingsView.init({
        onSaveSettings: handleSaveSettings,
        onCreatePhase: handleCreatePhase,
        onEditPhase: handleEditPhase,
        onDeletePhase: handleDeletePhase,
      });
      break;

    case 'members':
      membersView.init({
        onAddMember: handleAddMember,
        onRemoveMember: handleRemoveMember,
        onChangeRole: handleChangeRole,
      });
      break;
  }
}

async function loadAndRenderMembers() {
  await renderDashboardView('members');
}

// ── Dashboard Data Rendering ──────────────────────────────────────────────────
function renderDashboardData() {
  const year = document.getElementById('year-filter')?.value || 'all';
  state.viewData = filterByYear(state.processedData, year);

  const curYear = new Date().getFullYear();
  const tableYear = year === 'all' ? curYear : parseInt(year);
  const tableData = state.processedData.filter(d => d.year === tableYear);

  // Render charts
  renderEnergyChart(state.viewData);
  renderPriceChart(state.viewData);
  renderProjectionChart();

  // Render table
  const tbody = document.getElementById('table-body');
  if (tbody) {
    if (dashboardView.renderTableRows) {
      tbody.innerHTML = dashboardView.renderTableRows(tableData);
      // Bind edit/delete events on table
      bindTableEvents(tbody);
    }
  }

  // Update KPIs
  const kpis = calcKPIs(state.viewData, state.processedData, state.investments);
  
  // Total Investment
  const totalInv = (state.investments || []).reduce((a, i) => a + (parseFloat(i.investment_cop) || 0), 0);
  
  setText('kpi-ahorro', fCOP(kpis.savings));
  setText('kpi-produccion', fKwh(kpis.gen));
  setText('kpi-autonomia', fPct(kpis.autonomy));
  setText('kpi-var-kw', fPct(kpis.varKw));
  
  const paybackMonths = kpis.avgSavings > 0 ? (totalInv / kpis.avgSavings) : 0;
  const paybackYears = paybackMonths / 12;
  setText('roi-time', paybackYears > 0 ? fDec(paybackYears, 1) : 0);
  setText('roi-avg-savings', fCOP(kpis.avgSavings));
  setText('roi-total-investment', fCOP(totalInv));

  // Update projections
  const proj = calcProjections(state.viewData);
  setText('ai-precio-futuro', fCOP(proj.projectedPrice));
  setText('ai-mejor-mes', proj.bestMonth);
  setText('ai-co2', proj.co2);
  const tEl = document.getElementById('ai-tendencia');
  if (tEl) tEl.innerHTML = `<span class="${proj.trendColor}"><i class="fa-solid ${proj.trendIcon}"></i> ${proj.trend}</span>`;

  updateChartIcons();
}

function bindTableEvents(tbody) {
  if (!state.isAdmin && state.activeProjectRole !== 'admin') return;
  tbody.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openRecordModal('edit', btn.dataset.id);
    })
  );
  tbody.querySelectorAll('.del-btn').forEach(btn =>
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm(t('deleteConfirm'))) return;
      const origHtml = btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-circle-notch spin"></i>`;
      btn.disabled = true;
      try {
        await deleteRecord(btn.dataset.id, btn.dataset.fecha);
        await reloadProjectData();
        renderDashboardData();
        showToast(state.lang === 'es' ? 'Registro eliminado' : 'Record deleted', 'success');
      } catch (err) {
        showToast(`${t('error')}: ${err.message}`, 'error');
        btn.innerHTML = origHtml;
        btn.disabled = false;
      }
    })
  );
  // Row click for detail toggle
  tbody.querySelectorAll('tr[data-row-id]').forEach(tr => {
    tr.addEventListener('click', () => {
      const det = document.getElementById(`det-${tr.dataset.rowId}`);
      if (det) det.classList.toggle('hidden');
    });
  });
}

// ── Data Loading ──────────────────────────────────────────────────────────────
async function loadProjects() {
  if (!state.user) return;
  try {
    const projects = await getUserProjects(state.user.id);
    state.projects = projects || [];
  } catch (e) {
    state.projects = [];
  }
}

async function loadProjectData(projectId) {
  try {
    const project = await getProject(projectId);
    if (!project) throw new Error('Project not found');

    const role = state.isAdmin ? 'admin' : await getUserProjectRole(projectId, state.user.id);
    setActiveProject(project, role || 'observer');

    // Load readings
    const readings = await fetchProjectReadings(projectId);
    state.rawData = (readings || []).sort((a, b) => a.year !== b.year ? a.year - b.year : (a.monthIdx || 0) - (b.monthIdx || 0));

    // If no project-specific readings, try legacy readings
    if (state.rawData.length === 0) {
      const allReadings = await fetchAllReadings();
      state.rawData = (allReadings || []).sort((a, b) => a.year !== b.year ? a.year - b.year : (a.monthIdx || 0) - (b.monthIdx || 0));
    }

    // Process data
    state.processedData = processData(state.rawData);

    // Load investments
    const investments = await getProjectInvestments(projectId);
    state.investments = investments || [];
  } catch (e) {
    console.error('Error loading project data:', e);
    clearProjectData();
  }
}

async function reloadProjectData() {
  if (!state.activeProject) return;
  const readings = await fetchProjectReadings(state.activeProject.id);
  state.rawData = (readings || []).sort((a, b) => a.year !== b.year ? a.year - b.year : (a.monthIdx || 0) - (b.monthIdx || 0));
  if (state.rawData.length === 0) {
    const allReadings = await fetchAllReadings();
    state.rawData = (allReadings || []).sort((a, b) => a.year !== b.year ? a.year - b.year : (a.monthIdx || 0) - (b.monthIdx || 0));
  }
  state.processedData = processData(state.rawData);
}

// ── Event Handlers ────────────────────────────────────────────────────────────
async function handleLogin(email, password) {
  const btn = document.getElementById('btn-login');
  const orig = btn?.innerHTML;
  if (btn) { btn.innerHTML = `<i class="fa-solid fa-circle-notch spin"></i> ${t('connecting')}`; btn.disabled = true; }

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

    // Route based on role
    if (state.isAdmin) {
      await navigate('projects');
    } else {
      // Observer: load their projects
      await loadProjects();
      if (state.projects.length === 1) {
        await navigate('dashboard', { projectId: state.projects[0].id });
      } else if (state.projects.length === 0) {
        // No projects assigned — show message
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
        // Multiple projects (shouldn't happen for observer per spec, but handle gracefully)
        await navigate('projects');
      }
    }
  } catch (e) {
    showToast(`${t('error')}: ${e.message}`, 'error');
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  }
}

async function handleLogout() {
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
  // Check limit
  const count = await getProjectCount();
  if (count >= 20) {
    showToast(t('maxProjectsReached'), 'error');
    return;
  }

  const bodyHTML = `
    <form id="create-project-form" class="create-project-form">
      <div class="field">
        <label><span class="lang-es">Nombre del Proyecto</span><span class="lang-en">Project Name</span></label>
        <input type="text" id="cp-name" required placeholder="Mi Sistema Solar">
      </div>
      <div class="field-row">
        <div class="field">
          <label><span class="lang-es">Ubicación</span><span class="lang-en">Location</span></label>
          <input type="text" id="cp-location" placeholder="Cali, Colombia">
        </div>
        <div class="field">
          <label><span class="lang-es">Capacidad (kW)</span><span class="lang-en">Capacity (kW)</span></label>
          <input type="number" id="cp-capacity" step="0.1" placeholder="3.2">
        </div>
      </div>
      <div class="field">
        <label><span class="lang-es">Descripción</span><span class="lang-en">Description</span></label>
        <textarea id="cp-description" rows="2" placeholder="Descripción del proyecto..."></textarea>
      </div>
      <div class="field-row">
        <div class="field">
          <label><span class="lang-es">Paneles</span><span class="lang-en">Panels</span></label>
          <input type="number" id="cp-panels" placeholder="6">
        </div>
        <div class="field">
          <label><span class="lang-es">Modelo Inversor</span><span class="lang-en">Inverter Model</span></label>
          <input type="text" id="cp-inverter" placeholder="DEYE SUN-5K">
        </div>
      </div>
      <div class="field">
        <label><span class="lang-es">URL de Monitoreo</span><span class="lang-en">Monitoring URL</span></label>
        <input type="url" id="cp-monitoring" placeholder="https://www.dessmonitor.com/">
      </div>
      <button type="submit" class="btn btn-solar btn-lg" style="margin-top:.5rem">
        <i class="fa-solid fa-plus"></i>
        <span class="lang-es">Crear Proyecto</span><span class="lang-en">Create Project</span>
      </button>
    </form>`;

  showModal('Nuevo Proyecto Solar', 'New Solar Project', bodyHTML);

  // Bind form
  setTimeout(() => {
    document.getElementById('create-project-form')?.addEventListener('submit', async e => {
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
          panel_count: parseInt(document.getElementById('cp-panels')?.value) || 0,
          inverter_model: document.getElementById('cp-inverter')?.value || '',
          monitoring_url: document.getElementById('cp-monitoring')?.value || '',
          owner_id: state.user.id,
        }, state.user.email);
        
        closeGlobalModal();
        showToast(state.lang === 'es' ? 'Proyecto creado' : 'Project created', 'success');
        await navigate('projects');
      } catch (err) {
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    });
  }, 100);
}

function handleSidebarNavigate(viewName) {
  if (viewName === 'projects' || viewName === 'switch-project') {
    navigate('projects');
    return;
  }
  renderDashboardView(viewName);
}

function openRecordModal(action = 'new', id = null) {
  const modal = document.getElementById('add-record-modal');
  if (!modal) return;
  document.getElementById('add-record-form')?.reset();
  const editId = document.getElementById('edit-id');
  if (editId) editId.value = '';

  const esTitle = document.getElementById('modal-title-es');
  const enTitle = document.getElementById('modal-title-en');

  if (action === 'new') {
    if (esTitle) esTitle.innerText = 'Nuevo Registro Cloud';
    if (enTitle) enTitle.innerText = 'New Cloud Record';
  } else if (action === 'edit' && id) {
    if (esTitle) esTitle.innerText = 'Editar Registro';
    if (enTitle) enTitle.innerText = 'Edit Record';
    const rec = state.rawData.find(d => d.id === id);
    if (rec && editId) {
      editId.value = rec.id;
      const f = document.getElementById('new-fecha'); if (f) f.value = rec.fecha;
      const lr = document.getElementById('new-lectura-red'); if (lr) lr.value = rec.lecturaRed || 0;
      const ls = document.getElementById('new-lectura-solar'); if (ls) ls.value = rec.lecturaSolar || 0;
      const p = document.getElementById('new-precio'); if (p) p.value = rec.precioKw || 0;
      const reset = document.getElementById('new-inverter-reset'); if (reset) reset.checked = !!rec.inverter_reset;
    }
  }
  modal.classList.remove('hidden');
}

async function handleSaveRecord(dataOrEvent) {
  // dashboardView.js already calls e.preventDefault() and passes a data object.
  // Just in case it's called directly with an event, we handle it conditionally.
  if (dataOrEvent && typeof dataOrEvent.preventDefault === 'function') {
    dataOrEvent.preventDefault();
  }
  
  const editId = document.getElementById('edit-id')?.value;
  const fecha = document.getElementById('new-fecha')?.value;
  if (!fecha) return;
  const [year, month, day] = fecha.split('-');
  
  // Since input is now 'date', fecha is already in YYYY-MM-DD format
  const dbFecha = fecha;

  const rec = {
    id: editId || `${year}-${month}-${day || '01'}`,
    year: parseInt(year),
    monthIdx: parseInt(month),
    fecha: dbFecha,
    lecturaRed: parseFloat(document.getElementById('new-lectura-red')?.value),
    lecturaSolar: parseFloat(document.getElementById('new-lectura-solar')?.value),
    precioKw: parseFloat(document.getElementById('new-precio')?.value),
    project_id: state.activeProject?.id || null,
    inverter_reset: document.getElementById('new-inverter-reset')?.checked || false,
  };

  const btn = document.getElementById('btn-save');
  const orig = btn?.innerHTML;
  if (btn) { btn.innerHTML = `<i class="fa-solid fa-circle-notch spin"></i> ${t('saving')}`; btn.disabled = true; }

  try {
    const result = await upsertRecord(rec);
    if (!result) throw new Error('Error al guardar registro en la BD.');
    document.getElementById('add-record-modal')?.classList.add('hidden');
    await reloadProjectData();
    renderDashboardData();
    showToast(state.lang === 'es' ? 'Registro guardado' : 'Record saved', 'success');
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
  if (btn) { btn.innerHTML = orig; btn.disabled = false; }
}

async function handleDeleteRecord(id, fecha) {
  if (!confirm(t('deleteConfirm'))) return;
  try {
    const ok = await deleteRecord(id, fecha);
    if (!ok) throw new Error('Error al eliminar registro en la BD.');
    await reloadProjectData();
    renderDashboardData();
    showToast(state.lang === 'es' ? 'Registro eliminado' : 'Record deleted', 'success');
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

function handleToggleChart(type) {
  if (type === 'energia') {
    state.chartModes.energia = state.chartModes.energia === 'bar' ? 'line' : 'bar';
    renderEnergyChart(state.viewData);
  } else {
    state.chartModes.precio = state.chartModes.precio === 'line' ? 'bar' : 'line';
    renderPriceChart(state.viewData);
  }
  updateChartIcons();
}

// ── Settings Handlers ─────────────────────────────────────────────────────────
async function handleSaveSettings(e) {
  e.preventDefault();
  if (!state.activeProject) return;
  try {
    const result = await updateProject(state.activeProject.id, {
      name: document.getElementById('setting-name')?.value,
      description: document.getElementById('setting-description')?.value,
      location: document.getElementById('setting-location')?.value,
      capacity_kw: parseFloat(document.getElementById('setting-capacity')?.value) || 0,
      panel_count: parseInt(document.getElementById('setting-panels')?.value) || 0,
      inverter_model: document.getElementById('setting-inverter')?.value,
      monitoring_url: document.getElementById('setting-monitoring-url')?.value,
      updated_at: new Date().toISOString(),
    });
    if (!result) throw new Error('No se pudo guardar la configuración.');
    // Reload project
    const updated = await getProject(state.activeProject.id);
    if (updated) setActiveProject(updated, state.activeProjectRole);
    showToast(state.lang === 'es' ? 'Configuración guardada' : 'Settings saved', 'success');
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

async function handleCreatePhase(data) {
  if (!state.activeProject || !data) return;
  try {
    const result = await createInvestment({
      project_id: state.activeProject.id,
      phase_name: data.phase_name,
      description: data.description || '',
      investment_cop: data.investment_cop || 0,
      capacity_added_kw: data.capacity_added_kw || 0,
      panels_added: data.panels_added || 0,
      start_date: data.start_date,
    });
    if (!result) throw new Error('No se pudo crear la fase. Verifica que las tablas existan.');
    // Reload investments
    state.investments = await getProjectInvestments(state.activeProject.id) || [];
    showToast(state.lang === 'es' ? 'Fase de inversión creada' : 'Investment phase created', 'success');
    renderDashboardView(state.currentView);
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

async function handleEditPhase(data) {
  if (!state.activeProject || !data || !data.id) return;
  try {
    const { id, ...updates } = data;
    const result = await updateInvestment(id, updates);
    if (!result) throw new Error('No se pudo actualizar la fase.');
    state.investments = await getProjectInvestments(state.activeProject.id) || [];
    showToast(state.lang === 'es' ? 'Fase actualizada' : 'Phase updated', 'success');
    renderDashboardView(state.currentView);
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

async function handleDeletePhase(investmentId) {
  if (!confirm(t('deleteConfirm'))) return;
  try {
    const ok = await deleteInvestment(investmentId);
    if (!ok) throw new Error('No se pudo eliminar la fase.');
    state.investments = await getProjectInvestments(state.activeProject.id) || [];
    showToast(state.lang === 'es' ? 'Fase eliminada' : 'Phase deleted', 'success');
    renderDashboardView(state.currentView);
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

// ── Member Handlers ───────────────────────────────────────────────────────────
async function handleAddMember({ email, role }) {
  if (!state.activeProject || !email) return;

  try {
    const result = await addProjectMember(state.activeProject.id, email, role);
    if (!result) throw new Error('No se pudo agregar el miembro. Verifica las tablas BD.');
    showToast(state.lang === 'es' ? 'Miembro agregado' : 'Member added', 'success');
    await loadAndRenderMembers();
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

async function handleRemoveMember(memberId) {
  if (!confirm(t('deleteConfirm'))) return;
  try {
    const ok = await removeProjectMember(memberId);
    if (!ok) throw new Error('Error al remover miembro.');
    showToast(state.lang === 'es' ? 'Miembro removido' : 'Member removed', 'success');
    await loadAndRenderMembers();
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

async function handleChangeRole(memberId, newRole) {
  try {
    const ok = await updateMemberRole(memberId, newRole);
    if (!ok) throw new Error('Error al actualizar rol.');
    showToast(state.lang === 'es' ? 'Rol actualizado' : 'Role updated', 'success');
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
const setText = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
};

// ── Global Handlers (for onclick in HTML) ─────────────────────────────────────
window.__navigate = (view) => handleSidebarNavigate(view);
window.__logout = handleLogout;
window.__changeLang = changeLang;
window.__openRecordModal = (action, id) => openRecordModal(action, id);
window.__closeRecordModal = () => document.getElementById('add-record-modal')?.classList.add('hidden');
window.__toggleChart = handleToggleChart;
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
window.__handleSaveRecord = handleSaveRecord;
window.__handleCreatePhase = handleCreatePhase;
window.__handleSaveSettings = handleSaveSettings;
window.__handleDeletePhase = handleDeletePhase;
window.__handleEditPhase = handleEditPhase;

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const session = await getSession();
    if (session?.user) {
      state.user = session.user;
      const role = await getUserRole(state.user.email);
      state.isAdmin = role === 'admin';

      if (state.isAdmin) {
        await navigate('projects');
      } else {
        await loadProjects();
        if (state.projects.length === 1) {
          await navigate('dashboard', { projectId: state.projects[0].id });
        } else if (state.projects.length > 1) {
          await navigate('projects');
        } else {
          navigate('login');
        }
      }
    } else {
      navigate('login');
    }
  } catch (e) {
    console.error('Bootstrap error:', e);
    navigate('login');
  }
});
