import authModule from '../services/auth.js';
import databaseModule from '../services/database.js';
import chartsModule from '../components/dashboard/charts.js';
import tablesModule from '../components/dashboard/tables.js';
import kpiModule from '../components/dashboard/kpi.js';
import analyticsModule from '../modules/analytics.js';
import langModule from '../modules/lang.js';
import dataProcessor from '../modules/data.js';
import { getSolarConfig } from '../services/apiClient.js';
import uiController from './uiController.js';
import { appState } from '../store/appState.js';

class DashboardController {
  async initApp() {
    const loader = document.getElementById('global-loader');
    const loginModal = document.getElementById('login-modal');

    if (!loader || !loginModal) return;

    const session = await authModule.getCurrentSession?.();

    if (session) {
      await this.initializeDashboard();
    } else {
      loader.classList.add('hidden');
      loginModal.classList.remove('hidden');
    }
  }

  async initializeDashboard() {
    const loader = document.getElementById('global-loader');
    const loginModal = document.getElementById('login-modal');
    const mainDashboard = document.getElementById('main-dashboard');

    if (!mainDashboard) return;

    loginModal?.classList.add('hidden');
    loader?.classList.remove('hidden');

    // Actualizar UI con información del usuario
    const userEmail = document.getElementById('active-user-email');
    const roleBadge = document.getElementById('user-role-badge');

    if (userEmail) userEmail.innerText = authModule.getUserEmail();
    if (roleBadge) {
      const role = authModule.getUserRole();
      roleBadge.innerText = role === 'admin' ? langModule.t('admin') : langModule.t('observer');
    }

    uiController.updateAdminElements();

    try {
      await databaseModule.fetchAllData();
      await this.loadSolarConfig();
      this.processAndRender();
    } catch (error) {
      console.error('Error in initializeDashboard:', error);
    }

    loader?.classList.add('hidden');
    mainDashboard.classList.remove('hidden');
  }

  async loadSolarConfig() {
    const statusIndicator = document.getElementById('roi-status-indicator');
    if (statusIndicator) {
      statusIndicator.innerText = langModule.getLanguage() === 'es' ? '(Cargando configuración...)' : '(Loading config...)';
      statusIndicator.classList.remove('text-emerald-400', 'text-orange-400');
    }

    try {
      const user = authModule.getUser();
      if (!user) return;

      const config = await getSolarConfig(user.id);
      
      const roiInvestmentInput = document.getElementById('roi-input-investment');
      const roiDateInput = document.getElementById('roi-input-date');

      if (config) {
        if (roiInvestmentInput) roiInvestmentInput.value = config.inversion_cop;
        if (roiDateInput) {
          roiDateInput.value = config.fecha_instalacion ? config.fecha_instalacion.substring(0, 7) : '';
        }
        
        localStorage.setItem('jfInvestment', config.inversion_cop);
        localStorage.setItem('jfInstallDate', config.fecha_instalacion ? config.fecha_instalacion.substring(0, 7) : '');
        
        if (statusIndicator) statusIndicator.innerText = '';
      } else {
        const today = new Date().toISOString().substring(0, 7);
        if (roiInvestmentInput) roiInvestmentInput.value = 0;
        if (roiDateInput) roiDateInput.value = today;
        
        if (statusIndicator) {
          statusIndicator.innerText = langModule.getLanguage() === 'es' 
            ? '(Por favor, ingresa los datos de inversión)' 
            : '(Please enter investment data)';
          statusIndicator.classList.add('text-orange-400');
        }
      }
    } catch (error) {
      console.error('Error loading solar config:', error);
      if (statusIndicator) statusIndicator.innerText = '(Error)';
    }
  }

  processAndRender() {
    const rawData = databaseModule.getAllData();

    if (!rawData || rawData.length === 0) {
      this.renderEmptyState();
      return;
    }

    const currentProcessedData = dataProcessor.processRawData(rawData, langModule);
    
    const yearFilter = document.getElementById('year-filter');
    const year = yearFilter?.value || 'all';
    const currentViewData = dataProcessor.filterByYear(currentProcessedData, year);

    appState.setState({ currentProcessedData, currentViewData });

    this.renderCharts();
    this.renderTable();
    this.renderKPIs();
    this.renderProjections();
    uiController.updateChartIcons();
  }

  renderCharts() {
    const { currentViewData } = appState.getState();
    chartsModule.renderEnergyChart(currentViewData, langModule.getLanguage());
    chartsModule.renderPriceChart(currentViewData, langModule.getLanguage());
  }

  renderTable() {
    const { currentProcessedData, currentYear } = appState.getState();
    const yearFilter = document.getElementById('year-filter');
    const year = yearFilter?.value || 'all';
    const yearForTable = year === 'all' ? currentYear : parseInt(year);

    const dataForTable = currentProcessedData.filter((d) => d.year === yearForTable);

    tablesModule.renderTableBody(dataForTable, {
      lang: langModule.getLanguage(),
      isAdmin: authModule.isUserAdmin(),
      onEdit: (id) => uiController.openModal('edit', id),
      onDelete: (id) => {
        if (confirm(langModule.t('deleteConfirm'))) {
          databaseModule.deleteRecord(id);
          this.processAndRender();
        }
      },
      onToggleRow: (rowId) => tablesModule.toggleRow(rowId),
    });
  }

  renderKPIs() {
    const { currentViewData, currentProcessedData } = appState.getState();
    const investment = parseFloat(document.getElementById('roi-input-investment')?.value) || 0;
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
    updateElement('roi-avg-savings', kpis.avgSavings);
  }

  renderProjections() {
    const { currentViewData } = appState.getState();
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

  renderEmptyState() {
    const tbody = document.getElementById('table-body');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">${langModule.t('noData')}</td></tr>`;
    }

    ['kpi-ahorro', 'kpi-produccion', 'kpi-autonomia', 'kpi-var-kw', 'roi-time', 'roi-avg-savings'].forEach((id) => {
      const elem = document.getElementById(id);
      if (elem) elem.innerText = '--';
    });
  }
}

export default new DashboardController();
