/**
 * Módulo de Idioma/Localización
 */

import { MONTH_NAMES } from '../utils/constants.js';

export class LanguageModule {
  constructor() {
    this.currentLang = 'es';
    this.translations = {
      es: {
        login: 'Conectar a la Nube',
        logout: 'Cerrar Sesión',
        email: 'Correo Electrónico',
        password: 'Contraseña',
        newRecord: 'Nuevo Registro Cloud',
        editRecord: 'Editar Registro',
        saveToCloud: 'Guardar en la Nube',
        deleteConfirm: '¿Eliminar registro permanentemente de Supabase?',
        energyBalance: 'Balance Energético',
        priceFluctuation: 'Fluctuación Precio kW',
        savings: 'Ahorro Generado',
        generation: 'Generación Neta',
        autonomy: 'Independencia Energética',
        variation: 'Variación kW',
        cloudLog: 'Bitácora Cloud (Sincronizada)',
        period: 'Periodo',
        readings: 'Lecturas (Red | Solar)',
        gridConsumption: 'Consumo (Red)',
        solarGeneration: 'Gen. Solar',
        price: 'Precio kW',
        savings: 'Ahorro Real',
        actions: 'Acciones',
        edit: 'Editar',
        delete: 'Eliminar',
        readingDate: 'Fecha de Lectura',
        gridMeter: 'Medidor Red',
        inverter: 'Inversor (Solar)',
        costPerKw: 'Costo por kW (COP)',
        noData: 'Sin datos.',
        online: 'Online',
        role: 'Rol:',
        admin: 'Administrador',
        observer: 'Observador',
        roi: 'Retorno de Inversión (ROI Global)',
        roiCalculated: 'Calculado con DB en tiempo real.',
        systemCost: 'Costo del Sistema (COP)',
        payback: 'Recuperación',
        years: 'Años',
        connecting: 'Conectando...',
        uploading: 'Subiendo...',
        error: 'Error',
        success: 'Éxito',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
      },
      en: {
        login: 'Connect to Cloud',
        logout: 'Logout',
        email: 'Email',
        password: 'Password',
        newRecord: 'New Cloud Record',
        editRecord: 'Edit Record',
        saveToCloud: 'Save to Cloud',
        deleteConfirm: 'Delete record permanently from Supabase?',
        energyBalance: 'Energy Balance',
        priceFluctuation: 'kW Price Fluctuation',
        savings: 'Generated Savings',
        generation: 'Net Generation',
        autonomy: 'Energy Independence',
        variation: 'kW Variation',
        cloudLog: 'Cloud Log (Synced)',
        period: 'Period',
        readings: 'Readings',
        gridConsumption: 'Grid Cons',
        solarGeneration: 'Solar Gen',
        price: 'kW Price',
        savings: 'Savings',
        actions: 'Actions',
        edit: 'Edit',
        delete: 'Delete',
        readingDate: 'Reading Date',
        gridMeter: 'Grid Meter',
        inverter: 'Inverter (Solar)',
        costPerKw: 'Cost per kW (COP)',
        noData: 'No data.',
        online: 'Online',
        role: 'Role:',
        admin: 'Administrator',
        observer: 'Observer',
        roi: 'Return on Investment (Global ROI)',
        roiCalculated: 'Calculated with real-time DB.',
        systemCost: 'System Cost (COP)',
        payback: 'Payback',
        years: 'Years',
        connecting: 'Connecting...',
        uploading: 'Uploading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        confirm: 'Confirm',
      },
    };
  }

  /**
   * Cambia el idioma actual
   * @param {string} lang - Idioma ('es' o 'en')
   */
  setLanguage(lang) {
    if (['es', 'en'].includes(lang)) {
      this.currentLang = lang;
      document.body.setAttribute('data-lang', lang);
    }
  }

  /**
   * Obtiene el idioma actual
   * @returns {string} Idioma actual
   */
  getLanguage() {
    return this.currentLang;
  }

  /**
   * Obtiene una traducción
   * @param {string} key - Clave de la traducción
   * @returns {string} Texto traducido
   */
  t(key) {
    return this.translations[this.currentLang][key] || key;
  }

  /**
   * Obtiene el nombre del mes
   * @param {number} monthIndex - Índice del mes (1-12)
   * @returns {string} Nombre del mes
   */
  getMonthName(monthIndex) {
    return MONTH_NAMES[this.currentLang][monthIndex - 1] || '';
  }

  /**
   * Obtiene todos los nombres de meses
   * @returns {array} Array de nombres de meses
   */
  getMonthNames() {
    return MONTH_NAMES[this.currentLang];
  }
}

export default new LanguageModule();
