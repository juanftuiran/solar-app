/**
 * @module i18n
 * Internationalization / translation system for the solar monitoring app.
 * Supports Spanish (es) and English (en). Uses state.lang to resolve keys.
 */

import { state } from './state.js';

/**
 * Month name arrays keyed by language code.
 * @type {{ es: string[], en: string[] }}
 */
export const MONTHS = {
  es: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

/**
 * All application translation strings keyed by translation key,
 * then by language code.
 * @type {Object<string, { es: string, en: string }>}
 */
export const T = {
  // General
  deleteConfirm:      { es: '¿Estás seguro de que deseas eliminar?', en: 'Are you sure you want to delete?' },
  noData:             { es: 'Sin datos', en: 'No data' },
  admin:              { es: 'Administrador', en: 'Admin' },
  observer:           { es: 'Observador', en: 'Observer' },
  error:              { es: 'Error', en: 'Error' },
  saving:             { es: 'Guardando...', en: 'Saving...' },
  connecting:         { es: 'Conectando...', en: 'Connecting...' },

  // Project selection
  selectProject:      { es: 'Seleccionar proyecto', en: 'Select project' },
  myProjects:         { es: 'Mis proyectos', en: 'My projects' },
  createProject:      { es: 'Crear proyecto', en: 'Create project' },
  enterProject:       { es: 'Entrar al proyecto', en: 'Enter project' },

  // Project fields
  projectName:        { es: 'Nombre del proyecto', en: 'Project name' },
  location:           { es: 'Ubicación', en: 'Location' },
  description:        { es: 'Descripción', en: 'Description' },
  capacity:           { es: 'Capacidad (kW)', en: 'Capacity (kW)' },
  panels:             { es: 'Paneles', en: 'Panels' },
  inverter:           { es: 'Inversor', en: 'Inverter' },
  monitoringUrl:      { es: 'URL de monitoreo', en: 'Monitoring URL' },

  // Investment phases
  investmentPhases:   { es: 'Fases de inversión', en: 'Investment phases' },
  newPhase:           { es: 'Nueva fase', en: 'New phase' },
  phaseName:          { es: 'Nombre de la fase', en: 'Phase name' },
  phaseDescription:   { es: 'Descripción de la fase', en: 'Phase description' },
  investmentAmount:   { es: 'Monto de inversión', en: 'Investment amount' },
  capacityAdded:      { es: 'Capacidad agregada (kW)', en: 'Capacity added (kW)' },
  panelsAdded:        { es: 'Paneles agregados', en: 'Panels added' },
  startDate:          { es: 'Fecha de inicio', en: 'Start date' },

  // Investment totals
  totalInvestment:    { es: 'Inversión total', en: 'Total investment' },
  totalCapacity:      { es: 'Capacidad total', en: 'Total capacity' },

  // Settings / members
  settings:           { es: 'Configuración', en: 'Settings' },
  members:            { es: 'Miembros', en: 'Members' },
  addMember:          { es: 'Agregar miembro', en: 'Add member' },
  removeMember:       { es: 'Eliminar miembro', en: 'Remove member' },
  email:              { es: 'Correo electrónico', en: 'Email' },
  role:               { es: 'Rol', en: 'Role' },
  save:               { es: 'Guardar', en: 'Save' },
  cancel:             { es: 'Cancelar', en: 'Cancel' },
  delete:             { es: 'Eliminar', en: 'Delete' },
  edit:               { es: 'Editar', en: 'Edit' },
  back:               { es: 'Atrás', en: 'Back' },
  backToProjects:     { es: 'Volver a proyectos', en: 'Back to projects' },

  // Empty states
  noProjectsAssigned: { es: 'No tienes proyectos asignados', en: 'No projects assigned to you' },
  contactAdmin:       { es: 'Contacta al administrador', en: 'Contact the administrator' },

  // Navigation / views
  dashboard:          { es: 'Panel de control', en: 'Dashboard' },
  projectConfig:      { es: 'Configuración del proyecto', en: 'Project configuration' },
  memberManagement:   { es: 'Gestión de miembros', en: 'Member management' },

  // KPIs
  savingsGenerated:   { es: 'Ahorro generado', en: 'Savings generated' },
  netGeneration:      { es: 'Generación neta', en: 'Net generation' },
  energyIndependence: { es: 'Independencia energética', en: 'Energy independence' },
  kwVariation:        { es: 'Variación kW', en: 'kW variation' },
  paybackTime:        { es: 'Tiempo de retorno', en: 'Payback time' },
  avgMonthlySavings:  { es: 'Ahorro mensual promedio', en: 'Average monthly savings' },

  // Chart sections
  energyBalance:        { es: 'Balance energético', en: 'Energy balance' },
  kwPriceFluctuation:   { es: 'Fluctuación del precio kW', en: 'kW price fluctuation' },
  projection25Years:    { es: 'Proyección a 25 años', en: '25-year projection' },
  cloudLog:             { es: 'Registro en la nube', en: 'Cloud log' },

  // Data entry
  gridMeter:          { es: 'Medidor de red', en: 'Grid meter' },
  solarInverter:      { es: 'Inversor solar', en: 'Solar inverter' },
  costPerKw:          { es: 'Costo por kW', en: 'Cost per kW' },
  readingDate:        { es: 'Fecha de lectura', en: 'Reading date' },
  saveToCloud:        { es: 'Guardar en la nube', en: 'Save to cloud' },
  syncToDb:           { es: 'Sincronizar con BD', en: 'Sync to DB' },

  // Record actions
  newRecord:          { es: 'Nuevo registro', en: 'New record' },
  editRecord:         { es: 'Editar registro', en: 'Edit record' },

  // ROI
  roiGlobal:              { es: 'ROI Global', en: 'Global ROI' },
  calculatedDynamically:  { es: 'Calculado dinámicamente', en: 'Dynamically calculated' },
  investment:             { es: 'Inversión', en: 'Investment' },

  // Predictive analytics
  predictiveAnalytics:  { es: 'Analítica predictiva', en: 'Predictive analytics' },
  kwPriceProjection:    { es: 'Proyección del precio kW', en: 'kW price projection' },
  peakGenMonth:         { es: 'Mes de mayor generación', en: 'Peak generation month' },
  avoidedCarbon:        { es: 'Carbono evitado', en: 'Avoided carbon' },

  // Trend
  rising:  { es: 'En alza', en: 'Rising' },
  falling: { es: 'A la baja', en: 'Falling' },
  equal:   { es: 'Estable', en: 'Stable' },

  // Limits
  maxProjectsReached: { es: 'Máximo de proyectos alcanzado', en: 'Maximum projects reached' },
  limitIs20:          { es: 'El límite es de 20 proyectos', en: 'The limit is 20 projects' },

  // Solar Engineering (IEC 61724 standard)
  specificYield:         { es: 'Rendimiento Específico', en: 'Specific Yield' },
  peakSunHours:          { es: 'Horas Sol Pico (HSP)', en: 'Peak Sun Hours (PSH)' },
  dailyGeneration:       { es: 'Gen. Diaria Promedio', en: 'Avg Daily Generation' },
  dailyConsumption:      { es: 'Consumo Diario Prom.', en: 'Avg Daily Usage' },
  plantHealth:           { es: 'Estado Operativo', en: 'Plant Health' },
  healthOptimo:          { es: 'Rendimiento Óptimo', en: 'Optimal Performance' },
  healthNormal:          { es: 'Rendimiento Normal', en: 'Normal Performance' },
  healthAttention:       { es: 'Revisar / Atención', en: 'Attention Needed' },
  meterResetNotice:      { es: 'Reinicio Medidor Red', en: 'Grid Meter Reset' },

  // Dashboard Tabs
  tabOverview:           { es: 'Telemetría & Balance', en: 'Telemetry & Balance' },
  tabFinance:            { es: 'Finanzas & Retorno', en: 'Finance & ROI' },
  tabAudit:              { es: 'Historial Cloud', en: 'Cloud Historical Log' },

  // Enhanced features
  exportCsv:             { es: 'Exportar CSV', en: 'Export CSV' },
  exportData:            { es: 'Exportar Datos', en: 'Export Data' },
  searchProjects:        { es: 'Buscar proyecto por nombre, ubicación o capacidad...', en: 'Search projects by name, location or capacity...' },
  searchRecords:         { es: 'Buscar por período, fecha o lecturas...', en: 'Search by period, date or readings...' },
  paybackProgress:       { es: 'Progreso de Retorno de Inversión', en: 'Investment Payback Progress' },
  recovered:             { es: 'Recuperado', en: 'Recovered' },
  remaining:             { es: 'Restante', en: 'Remaining' },
  treesEquivalent:       { es: 'Árboles Plantados Eq.', en: 'Equiv. Trees Planted' },
  estimatedNextMonth:    { es: 'Ahorro Próximo Mes', en: 'Next Month Savings' },
  livePreview:           { es: 'Vista Previa en Vivo', en: 'Live Calculation Preview' },
  calculatedConsumption: { es: 'Consumo Red Calc.', en: 'Calc. Grid Usage' },
  calculatedSolar:       { es: 'Gen. Solar Calc.', en: 'Calc. Solar Gen.' },
  calculatedSavings:     { es: 'Ahorro Estimado', en: 'Estimated Savings' },
  inverterResetNotice:   { es: 'Reinicio de Inversor', en: 'Inverter Reset' },
  confirmTitle:          { es: 'Confirmar Acción', en: 'Confirm Action' },
  confirmDelete:         { es: '¿Deseas eliminar este elemento permanentemente?', en: 'Do you want to permanently delete this item?' },
  confirmBtn:            { es: 'Eliminar', en: 'Delete' },
  cancelBtn:             { es: 'Cancelar', en: 'Cancel' },
  systemOnline:          { es: 'Sistema En Línea', en: 'System Online' },
  allYears:              { es: 'Todos los Años', en: 'All Years' },
};

/**
 * Retrieve the translation for a given key in the current language.
 * Falls back to the key itself if no translation exists.
 * @param {string} key - Translation key (must exist in `T`)
 * @returns {string} Translated string
 */
export function t(key) {
  const entry = T[key];
  if (!entry) return key;
  return entry[state.lang] || entry.es || key;
}

/**
 * Get the localised month name for a 1-based month index.
 * @param {number} idx - Month index (1 = January … 12 = December)
 * @returns {string} Month name in the current language
 */
export function monthName(idx) {
  const months = MONTHS[state.lang] || MONTHS.es;
  return months[(idx - 1 + 12) % 12] || '';
}
