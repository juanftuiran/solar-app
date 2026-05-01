/**
 * Punto de entrada principal de la aplicación
 */

import authModule from './services/auth.js';
import databaseModule from './services/database.js';
import chartsModule from './components/charts.js';
import tablesModule from './components/tables.js';
import kpiModule from './components/kpi.js';
import analyticsModule from './modules/analytics.js';
import langModule from './modules/lang.js';
import dataProcessor from './modules/data.js';
import { formatCOP } from './utils/formatters.js';
import { debounce } from './utils/helpers.js';

// ============================================
// ESTADO GLOBAL
// ============================================
let currentProcessedData = [];
let currentViewData = [];
const currentYear = new Date().getFullYear();

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initializeApp();
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Formulario de login
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Botón de logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Cambio de idioma
  const langButtons = document.querySelectorAll('[data-lang-btn]');
  langButtons.forEach((btn) => {
    btn.addEventListener('click', handleLanguageChange);
  });

  // Filtro de año
  const yearFilter = document.getElementById('year-filter');
  if (yearFilter) {
    yearFilter.addEventListener('change', handleYearFilterChange);
  }

  // Input de inversión
  const investmentInput = document.getElementById('investment-input');
  if (investmentInput) {
    investmentInput.addEventListener('change', handleInvestmentChange);
  }

  // Botón de nuevo registro
  const newBtn = document.querySelector('[data-action="new"]');
  if (newBtn) {
    newBtn.addEventListener('click', () => openModal('new'));
  }

  // Formulario de nuevo/editar registro
  const recordForm = document.getElementById('add-record-form');
  if (recordForm) {
    recordForm.addEventListener('submit', handleSaveRecord);
  }

  // Botón para cerrar modal
  const closeModalBtn = document.querySelector('[data-action="close-modal"]');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  // Toggle de tipo de gráfico
  const energyChartToggle = document.querySelector('[data-toggle="energia"]');
  const priceChartToggle = document.querySelector('[data-toggle="precio"]');

  if (energyChartToggle) {
    energyChartToggle.addEventListener('click', () => {
      chartsModule.toggleChartType('energia', currentViewData, langModule.getLanguage());
      updateChartIcons();
    });
  }

  if (priceChartToggle) {
    priceChartToggle.addEventListener('click', () => {
      chartsModule.toggleChartType('precio', currentViewData, langModule.getLanguage());
      updateChartIcons();
    });
  }
}

// ============================================
// HANDLERS
// ============================================
async function handleLogin(e) {
  e.preventDefault();

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('btn-login');

  if (!emailInput || !passwordInput || !loginBtn) return;

  const email = emailInput.value;
  const password = passwordInput.value;

  // Mostrar estado de carga
  const originalText = loginBtn.innerHTML;
  loginBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Conectando...';
  loginBtn.disabled = true;

  const success = await authModule.login(email, password);

  if (success) {
    await initializeDashboard();
  } else {
    alert(langModule.t('error') + ': Verifica tus credenciales');
  }

  loginBtn.innerHTML = originalText;
  loginBtn.disabled = false;
}

async function handleLogout(e) {
  e.preventDefault();
  await authModule.logout();
  location.reload();
}

function handleLanguageChange(e) {
  const lang = e.target.dataset.lang;
  langModule.setLanguage(lang);
  updateUILanguage();
  if (currentProcessedData.length > 0) {
    processAndRender();
  }
}

function handleYearFilterChange(e) {
  processAndRender();
}

function handleInvestmentChange(e) {
  localStorage.setItem('jfInvestment', e.target.value);
  processAndRender();
}

async function handleSaveRecord(e) {
  e.preventDefault();

  const editId = document.getElementById('edit-id');
  const fechaInput = document.getElementById('new-fecha');
  const lecturaRedInput = document.getElementById('new-lectura-red');
  const lecturaSolarInput = document.getElementById('new-lectura-solar');
  const precioInput = document.getElementById('new-precio');
  const saveBtn = document.getElementById('btn-save');

  if (!fechaInput || !lecturaRedInput || !lecturaSolarInput || !precioInput) return;

  const fecha = fechaInput.value;
  const [year, month, day] = fecha.split('-');

  const record = {
    id: editId?.value || `${year}-${month}`,
    year: parseInt(year),
    monthIdx: parseInt(month),
    fecha,
    lecturaRed: parseFloat(lecturaRedInput.value),
    lecturaSolar: parseFloat(lecturaSolarInput.value),
    precioKw: parseFloat(precioInput.value),
  };

  // Mostrar estado de carga
  const originalText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Subiendo...';
  saveBtn.disabled = true;

  const success = await databaseModule.saveRecord(record);

  if (success) {
    closeModal();
    processAndRender();
  } else {
    alert(langModule.t('error') + ': No se pudo guardar el registro');
  }

  saveBtn.innerHTML = originalText;
  saveBtn.disabled = false;
}

// ============================================
// MODAL HANDLERS
// ============================================
function openModal(action, id = null) {
  const modal = document.getElementById('add-record-modal');
  const form = document.getElementById('add-record-form');
  const titleEs = document.querySelector('[data-modal-title="es"]');
  const titleEn = document.querySelector('[data-modal-title="en"]');

  if (!modal || !form) return;

  form.reset();
  const editIdInput = document.getElementById('edit-id');
  if (editIdInput) editIdInput.value = '';

  if (action === 'new') {
    if (titleEs) titleEs.innerText = 'Nuevo Registro Cloud';
    if (titleEn) titleEn.innerText = 'New Cloud Record';
  } else if (action === 'edit' && id) {
    if (titleEs) titleEs.innerText = 'Editar Registro';
    if (titleEn) titleEn.innerText = 'Edit Record';

    const record = databaseModule.findRecord(id);
    if (record) {
      if (editIdInput) editIdInput.value = record.id;
      document.getElementById('new-fecha').value = record.fecha;
      document.getElementById('new-lectura-red').value = record.lecturaRed;
      document.getElementById('new-lectura-solar').value = record.lecturaSolar;
      document.getElementById('new-precio').value = record.precioKw;
    }
  }

  modal.classList.remove('hidden');
}

function closeModal() {
  const modal = document.getElementById('add-record-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ============================================
// INICIALIZACIÓN
// ============================================
async function initializeApp() {
  const loader = document.getElementById('global-loader');
  const loginModal = document.getElementById('login-modal');

  if (!loader || !loginModal) return;

  const session = await authModule.getCurrentSession?.();

  if (session) {
    await initializeDashboard();
  } else {
    loader.classList.add('hidden');
    loginModal.classList.remove('hidden');
  }

  // Cargar inversión guardada
  const investmentInput = document.getElementById('investment-input');
  if (investmentInput) {
    investmentInput.value = localStorage.getItem('jfInvestment') || 15000000;
  }
}

async function initializeDashboard() {
  const loader = document.getElementById('global-loader');
  const loginModal = document.getElementById('login-modal');
  const mainDashboard = document.getElementById('main-dashboard');

  if (!mainDashboard) return;

  loginModal?.classList.add('hidden');
  loader?.classList.remove('hidden');

  // Actualizar UI con información del usuario
  const user = authModule.getUser();
  const userEmail = document.getElementById('active-user-email');
  const rolebadge = document.getElementById('user-role-badge');

  if (userEmail) userEmail.innerText = authModule.getUserEmail();
  if (roleBadge) {
    const role = authModule.getUserRole();
    roleBadge.innerText = role === 'admin' ? langModule.t('admin') : langModule.t('observer');
  }

  // Actualizar visibilidad de botones admin
  updateAdminElements();

  // Cargar datos
  await databaseModule.fetchAllData();
  processAndRender();

  loader?.classList.add('hidden');
  mainDashboard.classList.remove('hidden');
}

// ============================================
// PROCESAMIENTO DE DATOS
// ============================================
function processAndRender() {
  const rawData = databaseModule.getAllData();

  if (!rawData || rawData.length === 0) {
    renderEmptyState();
    return;
  }

  // Procesar datos
  currentProcessedData = dataProcessor.processRawData(rawData, langModule);

  // Filtrar por año
  const yearFilter = document.getElementById('year-filter');
  const year = yearFilter?.value || 'all';
  currentViewData = dataProcessor.filterByYear(currentProcessedData, year);

  // Renderizar componentes
  renderCharts();
  renderTable();
  renderKPIs();
  renderProjections();
  updateChartIcons();
}

function renderCharts() {
  chartsModule.renderEnergyChart(currentViewData, langModule.getLanguage());
  chartsModule.renderPriceChart(currentViewData, langModule.getLanguage());
}

function renderTable() {
  const yearFilter = document.getElementById('year-filter');
  const year = yearFilter?.value || 'all';
  const yearForTable = year === 'all' ? currentYear : parseInt(year);

  const dataForTable = currentProcessedData.filter((d) => d.year === yearForTable);

  tablesModule.renderTableBody(dataForTable, {
    lang: langModule.getLanguage(),
    isAdmin: authModule.isUserAdmin(),
    onEdit: (id) => openModal('edit', id),
    onDelete: (id) => {
      if (confirm(langModule.t('deleteConfirm'))) {
        databaseModule.deleteRecord(id);
      }
    },
    onToggleRow: (rowId) => tablesModule.toggleRow(rowId),
  });
}

function renderKPIs() {
  const investment = parseFloat(document.getElementById('investment-input')?.value) || 0;
  const kpis = kpiModule.calculateKPIs(currentViewData, currentProcessedData, investment);

  const updateElement = (id, value) => {
    const elem = document.getElementById(id);
    if (elem) elem.innerText = value;
  };

  updateElement('kpi-ahorro', kpis.totalSavings);
  updateElement('kpi-produccion', kpis.totalGeneration);
  updateElement('kpi-autonomia', kpis.averageAutonomy);
  updateElement('kpi-var-kw', kpis.averageVariation);
  updateElement('roi-time', kpis.roi);
}

function renderProjections() {
  const projections = analyticsModule.calculateProjections(currentViewData, langModule.getLanguage());

  const updateElement = (id, value) => {
    const elem = document.getElementById(id);
    if (elem) elem.innerText = value;
  };

  updateElement('ai-precio-futuro', projections.projectedPrice);
  updateElement('ai-mejor-mes', projections.bestMonth);
  updateElement('ai-co2', projections.co2Avoided);

  const trendElem = document.getElementById('ai-tendencia');
  if (trendElem) {
    trendElem.innerHTML = `<span class="${projections.trendColor}"><i class="fa-solid ${projections.trendIcon}"></i> ${projections.trend}</span>`;
  }
}

function renderEmptyState() {
  const tbody = document.getElementById('table-body');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">${langModule.t('noData')}</td></tr>`;
  }

  ['kpi-ahorro', 'kpi-produccion', 'kpi-autonomia', 'kpi-var-kw', 'roi-time'].forEach((id) => {
    const elem = document.getElementById(id);
    if (elem) elem.innerText = '--';
  });
}

// ============================================
// UTILIDADES UI
// ============================================
function updateUILanguage() {
  // Actualizar idioma del documento
  document.body.setAttribute('data-lang', langModule.getLanguage());
}

function updateAdminElements() {
  const isAdmin = authModule.isUserAdmin();
  const adminElements = document.querySelectorAll('.admin-only');

  adminElements.forEach((elem) => {
    if (isAdmin) {
      elem.classList.remove('hidden-auth');
      elem.removeAttribute('disabled');
    } else {
      elem.classList.add('hidden-auth');
      elem.setAttribute('disabled', 'true');
    }
  });
}

function updateChartIcons() {
  const energyIcon = document.querySelector('[data-chart-icon="energia"]');
  const priceIcon = document.querySelector('[data-chart-icon="precio"]');

  if (energyIcon) {
    energyIcon.className = `fa-solid ${chartsModule.getChartIcon('energia')}`;
  }
  if (priceIcon) {
    priceIcon.className = `fa-solid ${chartsModule.getChartIcon('precio')}`;
  }
}

// Exportar para uso global si es necesario
window.app = {
  authModule,
  databaseModule,
  chartsModule,
  tablesModule,
  kpiModule,
  analyticsModule,
  langModule,
  openModal,
  closeModal,
  exportToCSV: () => tablesModule.exportToCSV(),
};
