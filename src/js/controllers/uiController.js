import authModule from '../services/auth.js';
import databaseModule from '../services/database.js';
import langModule from '../modules/lang.js';
import chartsModule from '../components/dashboard/charts.js';
import { upsertSolarConfig } from '../services/apiClient.js';
import { debounce } from '../utils/helpers.js';
import dashboardController from './dashboardController.js';
import { appState } from '../store/appState.js';

class UIController {
  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => this.handleLogout(e));

    const langButtons = document.querySelectorAll('[data-lang-btn]');
    langButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => this.handleLanguageChange(e));
    });

    const yearFilter = document.getElementById('year-filter');
    if (yearFilter) yearFilter.addEventListener('change', () => dashboardController.processAndRender());

    const roiInvestmentInput = document.getElementById('roi-input-investment');
    const roiDateInput = document.getElementById('roi-input-date');

    if (roiInvestmentInput) roiInvestmentInput.addEventListener('input', () => this.debouncedUpsertConfig());
    if (roiDateInput) roiDateInput.addEventListener('change', () => this.debouncedUpsertConfig());

    const recordForm = document.getElementById('add-record-form');
    if (recordForm) recordForm.addEventListener('submit', (e) => this.handleSaveRecord(e));

    const closeModalBtn = document.querySelector('[data-action="close-modal"]');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeModal());
  }

  async handleLogin(e) {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('btn-login');

    if (!emailInput || !passwordInput || !loginBtn) return;

    const email = emailInput.value;
    const password = passwordInput.value;

    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Conectando...';
    loginBtn.disabled = true;

    const success = await authModule.login(email, password);

    if (success) {
      await dashboardController.initializeDashboard();
    } else {
      alert(langModule.t('error') + ': Verifica tus credenciales');
    }

    loginBtn.innerHTML = originalText;
    loginBtn.disabled = false;
  }

  async handleLogout(e) {
    e.preventDefault();
    await authModule.logout();
    location.reload();
  }

  handleLanguageChange(e) {
    const lang = e.target.dataset.lang;
    langModule.setLanguage(lang);
    this.updateUILanguage();
    if (appState.getState().currentProcessedData.length > 0) {
      dashboardController.processAndRender();
    }
  }

  debouncedUpsertConfig = debounce(async () => {
    const user = authModule.getUser();
    if (!user) return;

    const investment = document.getElementById('roi-input-investment').value;
    let installDate = document.getElementById('roi-input-date').value;

    if (installDate && installDate.length === 7) {
      installDate += '-01';
    }

    const config = {
      user_id: user.id,
      inversion_cop: parseInt(investment) || 0,
      fecha_instalacion: installDate,
      updated_at: new Date().toISOString()
    };

    try {
      await upsertSolarConfig(config);
      
      localStorage.setItem('jfInvestment', investment);
      localStorage.setItem('jfInstallDate', installDate);

      const invSaved = document.getElementById('roi-investment-saved');
      const dateSaved = document.getElementById('roi-date-saved');
      const statusIndicator = document.getElementById('roi-status-indicator');

      if (invSaved) invSaved.classList.remove('hidden');
      if (dateSaved) dateSaved.classList.remove('hidden');
      if (statusIndicator) {
        statusIndicator.innerText = langModule.getLanguage() === 'es' ? '(Guardado)' : '(Saved)';
        statusIndicator.classList.remove('text-orange-400');
        statusIndicator.classList.add('text-emerald-400');
      }

      setTimeout(() => {
        if (invSaved) invSaved.classList.add('hidden');
        if (dateSaved) dateSaved.classList.add('hidden');
        if (statusIndicator) statusIndicator.innerText = '';
      }, 2000);

      dashboardController.processAndRender();
    } catch (error) {
      console.error('Error upserting config:', error);
      alert('Error: No se pudo guardar la configuración');
    }
  }, 1000);

  async handleSaveRecord(e) {
    e.preventDefault();

    const editId = document.getElementById('edit-id');
    const fechaInput = document.getElementById('new-fecha');
    const lecturaRedInput = document.getElementById('new-lectura-red');
    const lecturaSolarInput = document.getElementById('new-lectura-solar');
    const precioInput = document.getElementById('new-precio');
    const saveBtn = document.getElementById('btn-save');

    if (!fechaInput || !lecturaRedInput || !lecturaSolarInput || !precioInput) return;

    const fecha = fechaInput.value;
    const [year, month] = fecha.split('-');

    const record = {
      id: editId?.value || `${year}-${month}`,
      year: parseInt(year),
      monthIdx: parseInt(month),
      fecha,
      lecturaRed: parseFloat(lecturaRedInput.value),
      lecturaSolar: parseFloat(lecturaSolarInput.value),
      precioKw: parseFloat(precioInput.value),
    };

    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Subiendo...';
    saveBtn.disabled = true;

    const success = await databaseModule.saveRecord(record);

    if (success) {
      this.closeModal();
      dashboardController.processAndRender();
    } else {
      alert(langModule.t('error') + ': No se pudo guardar el registro');
    }

    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }

  openModal(action, id = null) {
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
        document.getElementById('new-lectura-red').value = record.lecturaRed || 0;
        document.getElementById('new-lectura-solar').value = record.lecturaSolar || 0;
        document.getElementById('new-precio').value = record.precioKw || 0;
      }
    }

    modal.classList.remove('hidden');
  }

  closeModal() {
    const modal = document.getElementById('add-record-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  updateUILanguage() {
    document.body.setAttribute('data-lang', langModule.getLanguage());
  }

  updateAdminElements() {
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

  updateChartIcons() {
    const energyIcon = document.querySelector('[data-chart-icon="energia"]') || document.getElementById('icon-chart-energia');
    const priceIcon = document.querySelector('[data-chart-icon="precio"]') || document.getElementById('icon-chart-precio');

    if (energyIcon) {
      energyIcon.className = `fa-solid ${chartsModule.getChartIcon('energia')}`;
    }
    if (priceIcon) {
      priceIcon.className = `fa-solid ${chartsModule.getChartIcon('precio')}`;
    }
  }
}

export default new UIController();
