/**
 * Punto de entrada principal de la aplicación (Refactorizado)
 */

import uiController from './controllers/uiController.js';
import dashboardController from './controllers/dashboardController.js';
import langModule from './modules/lang.js';
import chartsModule from './components/dashboard/charts.js';
import tablesModule from './components/dashboard/tables.js';
import databaseModule from './services/database.js';
import { appState } from './store/appState.js';

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  uiController.init();
  dashboardController.initApp();
});

// ============================================
// EXPORTACIONES GLOBALES (Legacy Onclick Handlers)
// ============================================
window.setLang = (lang, flagCode, text) => {
  langModule.setLanguage(lang);
  const flagElem = document.getElementById('current-flag');
  const langTextElem = document.getElementById('current-lang-text');
  if (flagElem) flagElem.innerHTML = `<img src="https://flagcdn.com/w20/${flagCode}.png" class="w-5 rounded-sm shadow-sm">`;
  if (langTextElem) langTextElem.innerText = text;
  document.activeElement?.blur();
  uiController.updateUILanguage();
  dashboardController.processAndRender();
};

window.openModal = (action, id = null) => uiController.openModal(action, id);
window.closeModal = () => uiController.closeModal();

window.toggleChartType = (type) => {
  const { currentViewData } = appState.getState();
  chartsModule.toggleChartType(type, currentViewData, langModule.getLanguage());
  uiController.updateChartIcons();
};

window.deleteRecord = async (id) => {
  if (confirm(langModule.t('deleteConfirm') || '¿Eliminar registro?')) {
    await databaseModule.deleteRecord(id);
    dashboardController.processAndRender();
  }
};

window.toggleRow = (id) => tablesModule.toggleRow(id);

window.app = {
  exportToCSV: () => tablesModule.exportToCSV(),
};
