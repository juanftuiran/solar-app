/**
 * @module i18n
 * Internationalization / translation system for the solar monitoring app.
 * Supports Spanish (es) and English (en). Uses explicit language or state.lang.
 */

import { state } from './state.js';

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

export const T = {
  // General
  deleteConfirm: { es: '¿Estás seguro de que deseas eliminar?', en: 'Are you sure you want to delete?' },
  noData: { es: 'Sin datos', en: 'No data' },
  admin: { es: 'Administrador', en: 'Admin' },
  administrator: { es: 'Administrador', en: 'Administrator' },
  observer: { es: 'Observador', en: 'Observer' },
  error: { es: 'Error', en: 'Error' },
  saving: { es: 'Guardando...', en: 'Saving...' },
  connecting: { es: 'Conectando...', en: 'Connecting...' },
  loading: { es: 'Cargando...', en: 'Loading...' },
  retry: { es: 'Reintentar', en: 'Retry' },
  close: { es: 'Cerrar', en: 'Close' },
  notifications: { es: 'Notificaciones', en: 'Notifications' },
  closeNotification: { es: 'Cerrar notificación', en: 'Close notification' },
  online: { es: 'En Línea', en: 'Online' },
  systemOnline: { es: 'Sistema En Línea', en: 'System Online' },
  allYears: { es: 'Todos los Años', en: 'All Years' },
  logout: { es: 'Salir', en: 'Logout' },
  signOut: { es: 'Cerrar Sesión', en: 'Sign Out' },
  toggleTheme: { es: 'Cambiar tema', en: 'Toggle theme' },
  switchLanguage: { es: 'Cambiar idioma', en: 'Switch language' },
  actions: { es: 'Acciones', en: 'Actions' },
  action: { es: 'Acción', en: 'Action' },

  // Auth & Login
  loginTitle: { es: 'Bienvenido de vuelta', en: 'Welcome back' },
  loginSubtitle: { es: 'Ingresa a tu cuenta para monitorear tus plantas solares', en: 'Sign in to monitor your solar power plants' },
  email: { es: 'Correo electrónico', en: 'Email address' },
  password: { es: 'Contraseña', en: 'Password' },
  togglePasswordVisibility: { es: 'Mostrar u ocultar contraseña', en: 'Toggle password visibility' },
  signInBtn: { es: 'Iniciar Sesión', en: 'Sign In' },
  invalidCredentials: { es: 'Correo o contraseña incorrectos. Verifica tus datos.', en: 'Invalid email or password. Please check your credentials.' },
  emailValidationErr: { es: 'Ingresa un correo electrónico válido como nombre@empresa.com.', en: 'Enter a valid email address such as name@company.com.' },
  passwordValidationErr: { es: 'Ingresa tu contraseña para continuar.', en: 'Enter your password to continue.' },
  sslBadge: { es: 'Sesión cifrada SSL', en: 'Encrypted SSL session' },
  heroHeadlinePrefix: { es: 'Telemetría y analítica', en: 'High-fidelity solar' },
  heroHeadlineAccent: { es: 'solar de precisión empresarial', en: 'telemetry & financial analytics' },
  heroLead: {
    es: 'Supervisa generación fotovoltaica, balances de red, flujo en tiempo real y retorno financiero desde una sola plataforma modular.',
    en: 'Monitor PV generation, grid balances, real-time inverter flow, and financial payback from one modular platform.',
  },
  heroFeatIecTitle: { es: 'Estándar Solar IEC 61724', en: 'IEC 61724 Solar Standard' },
  heroFeatIecDesc: { es: 'Rendimiento específico, horas de sol pico y eficiencia operativa.', en: 'Specific yield, peak sun hours, and operational efficiency.' },
  heroFeatWlsTitle: { es: 'Pronóstico Econométrico WLS', en: 'WLS Econometric Forecast' },
  heroFeatWlsDesc: { es: 'Modelos ponderados para anticipar variaciones en tu tarifa eléctrica.', en: 'Weighted predictive models to anticipate utility tariff changes.' },
  heroFeatRoiTitle: { es: 'Retorno de Inversión Multi-Fase', en: 'Multi-Phase Return on Investment' },
  heroFeatRoiDesc: { es: 'Seguimiento de amortización por expansiones y capacidad añadida.', en: 'Payback tracking across expansions and added capacity.' },
  heroFooter: { es: '© 2026 JF Solar Cloud · Plataforma de Analítica de Energía Solar', en: '© 2026 JF Solar Cloud · Solar Energy Analytics Platform' },
  supabaseConfigMissingTitle: { es: 'Configuración de Supabase requerida', en: 'Supabase Configuration Required' },
  supabaseConfigMissingDesc: {
    es: 'Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Configúralas en tu archivo .env o en las variables del despliegue para habilitar el acceso.',
    en: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. Configure them in your .env file or deployment environment to enable sign-in.',
  },

  // Project selection / Portfolio
  selectProject: { es: 'Seleccionar proyecto', en: 'Select project' },
  myProjects: { es: 'Mis proyectos', en: 'My projects' },
  portfolio: { es: 'Portafolio', en: 'Portfolio' },
  portfolioTitle: { es: 'Portafolio de Plantas Fotovoltaicas', en: 'Solar Power Plants Portfolio' },
  portfolioSubtitle: {
    es: 'Monitoreo multi-proyecto de generación solar, balances de red, valoración financiera y retorno en tiempo real.',
    en: 'Multi-project monitoring of solar generation, grid balances, financial valuation, and real-time ROI.',
  },
  createProject: { es: 'Crear proyecto', en: 'Create project' },
  newPlant: { es: 'Nueva Planta', en: 'New Plant' },
  newSolarProject: { es: 'Nuevo Proyecto Solar', en: 'New Solar Project' },
  addNewPlantTile: { es: 'Agregar Nueva Planta Solar', en: 'Add New Solar Plant' },
  createSolarProjectBtn: { es: 'Crear Proyecto Solar', en: 'Create Solar Project' },
  projectCreated: { es: 'Proyecto creado exitosamente', en: 'Project created successfully' },
  enterProject: { es: 'Entrar al proyecto', en: 'Enter project' },
  openPlant: { es: 'Abrir Planta', en: 'Open Plant' },
  plantsAndPanels: { es: 'Plantas & Paneles', en: 'Plants & Panels' },
  installedCapacity: { es: 'Capacidad Instalada', en: 'Installed Capacity' },
  portfolioCapital: { es: 'Capital en Portafolio', en: 'Portfolio Capital' },
  accessLevel: { es: 'Nivel de Acceso', en: 'Access Level' },
  searchProjectsPlaceholder: { es: 'Buscar por nombre, ubicación o inversor...', en: 'Search by name, location or inverter...' },
  noLocation: { es: 'Sin ubicación', en: 'No location' },
  noReadingsChip: { es: 'Sin lecturas', en: 'No readings' },
  cloudReadingsCount: { es: '{count} lecturas cloud', en: '{count} cloud readings' },
  peakPower: { es: 'Potencia', en: 'Peak Power' },
  phases: { es: 'Fases', en: 'Phases' },
  slotsCount: { es: '{count} de {max} cupos', en: '{count} of {max} slots' },
  projectNotFoundTitle: { es: 'No pudimos cargar esta planta solar', en: 'Could not load this solar plant' },
  projectNotFoundDesc: {
    es: 'La planta solicitada no existe o no tienes permisos asignados para consultarla.',
    en: 'The requested solar plant does not exist or you do not have permission to view it.',
  },

  // Project fields
  projectName: { es: 'Nombre del Proyecto', en: 'Project Name' },
  location: { es: 'Ubicación', en: 'Location' },
  geoLocation: { es: 'Ubicación Geográfica', en: 'Geographic Location' },
  description: { es: 'Descripción', en: 'Description' },
  descriptionNotes: { es: 'Descripción / Notas de la Instalación', en: 'Description / Installation Notes' },
  capacity: { es: 'Capacidad en kW', en: 'Capacity in kW' },
  nominalCapacity: { es: 'Capacidad Nominal en kWp', en: 'Nominal Capacity in kWp' },
  panels: { es: 'Paneles', en: 'Panels' },
  panelCount: { es: 'Cantidad de Paneles', en: 'Panel Count' },
  inverter: { es: 'Inversor', en: 'Inverter' },
  inverterModel: { es: 'Modelo del Inversor', en: 'Inverter Model' },
  monitoringUrl: { es: 'Portal de Monitoreo Externo', en: 'External Monitoring Portal' },
  remoteMonitoringUrl: { es: 'URL Portal de Monitoreo Remoto', en: 'Remote Monitoring URL' },

  // Investment phases
  investmentPhases: { es: 'Fases de Inversión', en: 'Investment Phases' },
  investmentPhasesTitle: { es: 'Fases de Inversión y Expansión', en: 'Investment & Expansion Phases' },
  investmentPhasesDesc: {
    es: 'Historial de capital desembolsado para el cálculo dinámico de amortización y rentabilidad',
    en: 'Capital outlays for dynamic payback, NPV, IRR, and ROI tracking',
  },
  newPhase: { es: 'Nueva Fase', en: 'New Phase' },
  newInvestmentPhase: { es: 'Nueva Fase de Inversión', en: 'New Investment Phase' },
  editInvestmentPhase: { es: 'Editar Fase de Inversión', en: 'Edit Investment Phase' },
  savePhase: { es: 'Guardar Fase', en: 'Save Phase' },
  phaseCreated: { es: 'Fase de inversión creada', en: 'Investment phase created' },
  phaseUpdated: { es: 'Fase actualizada', en: 'Phase updated' },
  phaseDeleted: { es: 'Fase eliminada', en: 'Phase deleted' },
  deletePhaseTitle: { es: 'Eliminar Fase de Inversión', en: 'Delete Investment Phase' },
  deletePhaseMessage: {
    es: '¿Estás seguro de eliminar esta fase de inversión? Afectará el cálculo de ROI y proyección.',
    en: 'Are you sure you want to delete this phase? This will affect ROI and projection calculations.',
  },
  deletePhaseBtn: { es: 'Eliminar Fase', en: 'Delete Phase' },
  phaseName: { es: 'Nombre de la Fase', en: 'Phase Name' },
  phaseDescription: { es: 'Descripción', en: 'Description' },
  investmentAmount: { es: 'Inversión en COP', en: 'Investment in COP' },
  capacityAdded: { es: 'Capacidad Agregada en kWp', en: 'Added Capacity in kWp' },
  panelsAdded: { es: 'Paneles Agregados', en: 'Added Panels' },
  startDate: { es: 'Fecha de Inicio', en: 'Start Date' },
  noPhasesTitle: { es: 'No hay fases de inversión registradas', en: 'No investment phases recorded' },
  noPhasesDesc: {
    es: 'Agrega la primera fase para calcular el retorno de inversión automáticamente.',
    en: 'Add your first phase to calculate ROI automatically.',
  },
  phaseTag: { es: 'Fase {index}', en: 'Phase {index}' },
  totalInvestedSummary: { es: 'Resumen Total de Capital Invertido', en: 'Total Invested Capital Summary' },
  accumulatedInvestment: { es: 'Inversión Acumulada', en: 'Total Invested' },
  totalCapacityAdded: { es: 'Potencia Total Añadida', en: 'Total Capacity Added' },
  totalPanelsPhases: { es: 'Total Paneles Fases', en: 'Total Panels in Phases' },

  // Settings & Members
  settings: { es: 'Configuración', en: 'Settings' },
  generalSettingsTitle: { es: 'Configuración General del Proyecto', en: 'General Project Settings' },
  generalSettingsDesc: {
    es: 'Especificaciones técnicas y parámetros operativos del sistema fotovoltaico',
    en: 'Technical specifications and operating parameters of the PV plant',
  },
  editMode: { es: 'Modo Edición', en: 'Edit Mode' },
  readOnlyMode: { es: 'Modo Lectura', en: 'Read Only' },
  saveSettings: { es: 'Guardar Configuración', en: 'Save Settings' },
  settingsSaved: { es: 'Configuración guardada', en: 'Settings saved' },
  members: { es: 'Miembros', en: 'Members' },
  membersTitle: { es: 'Gestión de Miembros y Accesos', en: 'Members & Access Management' },
  membersDesc: { es: 'Control de accesos y roles asignados para esta planta solar', en: 'Access control and assigned roles for this solar plant' },
  membersCountPill: { es: '{count} Miembros', en: '{count} Members' },
  inviteMemberTitle: { es: 'Invitar o Agregar Miembro', en: 'Invite or Add Member' },
  inviteMemberDesc: {
    es: 'Otorga permisos de visualización o administración a usuarios registrados',
    en: 'Grant viewing or admin privileges to registered users',
  },
  userEmailLabel: { es: 'Correo Electrónico del Usuario', en: 'User Email Address' },
  addMember: { es: 'Agregar Miembro', en: 'Add Member' },
  memberAdded: { es: 'Miembro agregado exitosamente', en: 'Member added successfully' },
  memberRemoved: { es: 'Miembro removido', en: 'Member removed' },
  roleUpdated: { es: 'Rol actualizado', en: 'Role updated' },
  removeMemberTitle: { es: 'Remover Miembro', en: 'Remove Member' },
  removeMemberMsg: {
    es: '¿Deseas revocar el acceso de este usuario al proyecto?',
    en: "Do you want to revoke this user's access to the project?",
  },
  remove: { es: 'Remover', en: 'Remove' },
  noMembersTitle: { es: 'No hay miembros registrados', en: 'No members found' },
  noMembersDesc: {
    es: 'Agrega usuarios con correo para otorgarles acceso de visualización o administración a esta planta solar.',
    en: 'Add user emails to grant view or administration privileges to this solar plant.',
  },
  membersWithAccess: { es: 'Miembros con Acceso Asignado', en: 'Members with Assigned Access' },
  userEmailCol: { es: 'Usuario / Correo', en: 'User / Email' },
  assignedRoleCol: { es: 'Rol Asignado', en: 'Assigned Role' },
  joinedCol: { es: 'Miembro Desde', en: 'Joined' },
  roleAdminFull: { es: 'Administrador · Control Total', en: 'Admin · Full Control' },
  roleObserverRead: { es: 'Observador · Solo Lectura', en: 'Observer · Read Only' },
  save: { es: 'Guardar', en: 'Save' },
  cancel: { es: 'Cancelar', en: 'Cancel' },
  delete: { es: 'Eliminar', en: 'Delete' },
  edit: { es: 'Editar', en: 'Edit' },
  back: { es: 'Atrás', en: 'Back' },
  backToProjects: { es: 'Volver al portafolio', en: 'Back to portfolio' },

  // Sidebar & Navigation Sections
  activePlant: { es: 'Planta Activa', en: 'Active Plant' },
  mainMenu: { es: 'Menú Principal', en: 'Main Menu' },
  navAnalytics: { es: 'Analítica', en: 'Analytics' },
  navRealtime: { es: 'Tiempo Real', en: 'Real-Time' },
  navManagement: { es: 'Gestión de Planta', en: 'Management' },
  navPortfolio: { es: 'Todas las Plantas', en: 'All Plants' },
  projectsSection: { es: 'Portafolio', en: 'Portfolio' },
  switchPlant: { es: 'Cambiar de Planta', en: 'Switch Plant' },
  toggleSidebar: { es: 'Alternar menú lateral', en: 'Toggle sidebar' },
  sectionTelemetry: { es: 'Telemetría & Balance', en: 'Telemetry & Balance' },
  sectionFinance: { es: 'Finanzas & Proyección', en: 'Finance & Forecast' },
  sectionAudit: { es: 'Historial Cloud', en: 'Cloud Log' },
  sectionMonitor: { es: 'Monitor Solarman', en: 'Solarman Live' },
  sectionInvestments: { es: 'Fases de Inversión', en: 'Investment Phases' },
  sectionSettings: { es: 'Configuración', en: 'Settings' },
  sectionMembers: { es: 'Miembros', en: 'Members' },

  // Empty & Error states
  noProjectsAssigned: { es: 'No tienes proyectos asignados', en: 'No projects assigned to you' },
  noProjectsDesc: {
    es: 'Crea tu primer proyecto solar para comenzar a monitorear la producción, balances y ahorro económico.',
    en: 'Create your first solar project to start monitoring production, balances, and economic savings.',
  },
  contactAdmin: { es: 'Contacta al administrador para obtener acceso a una planta.', en: 'Contact the administrator to gain access to a plant.' },
  networkErrorTitle: { es: 'No pudimos conectar con la base de datos', en: 'Could not connect to database' },
  networkErrorDesc: {
    es: 'Ocurrió un problema de red o permisos al cargar los datos. Verifica tu conexión e intenta nuevamente.',
    en: 'A network or permission error occurred while loading data. Check your connection and try again.',
  },
  noProjectReadingsTitle: { es: 'Este proyecto aún no tiene lecturas', en: 'This project has no readings yet' },
  noProjectReadingsDesc: {
    es: 'Registra la lectura base inicial o importa tu historial desde CSV para activar la analítica.',
    en: 'Add an initial base reading or import your CSV history to enable solar analytics.',
  },

  // Navigation / views
  dashboard: { es: 'Dashboard', en: 'Dashboard' },
  solarmanLive: { es: 'Monitor Solarman', en: 'Solarman Live' },
  solarmanLiveTab: { es: 'Monitor en Vivo', en: 'Live Monitor' },

  // Header & Kiosk
  filterByYear: { es: 'Filtrar por año', en: 'Filter by year' },
  report: { es: 'Reporte', en: 'Report' },
  kioskMode: { es: 'Modo Presentación', en: 'Presentation Mode' },
  kioskActivated: { es: 'Modo Presentación Activado', en: 'Presentation Mode Activated (ESC to exit)' },
  liveKiosk: { es: 'Kiosk en vivo', en: 'Live Kiosk' },
  autoRotateViews: { es: 'Auto-Rotar Vistas', en: 'Auto-Rotate Views' },
  exitPresentation: { es: 'Salir de Presentación', en: 'Exit Presentation' },

  // Dashboard Tabs
  tabOverview: { es: 'Telemetría & Balance', en: 'Telemetry & Balance' },
  tabFinance: { es: 'Finanzas & Proyección 25A', en: 'Finance & 25Y Forecast' },
  tabAudit: { es: 'Historial Cloud', en: 'Cloud Log' },

  // KPIs & Telemetry
  plantHealth: { es: 'Salud Operativa', en: 'Plant Health' },
  healthOptimo: { es: 'Óptimo', en: 'Optimal' },
  healthNormal: { es: 'Normal', en: 'Normal' },
  healthAttention: { es: 'Revisar', en: 'Check' },
  specificYieldShort: { es: 'Rendimiento Específico', en: 'Specific Yield' },
  peakSunHours: { es: 'Horas de Sol Pico', en: 'Peak Sun Hours' },
  performanceRatio: { es: 'Eficiencia del Sistema', en: 'System Efficiency' },
  dailyGenRate: { es: 'Generación Diaria Media', en: 'Daily Gen Rate' },
  periodSavings: { es: 'Ahorro del Período', en: 'Period Savings' },
  netEconomicSavings: { es: 'Ahorro económico neto', en: 'Net economic savings' },
  solarProduction: { es: 'Producción Solar', en: 'Solar Production' },
  grossTotalGen: { es: 'Generación total bruta', en: 'Gross total generation' },
  solarAutonomy: { es: 'Autonomía Solar', en: 'Solar Autonomy' },
  last3RecordsAvg: { es: 'Promedio últimos 3 ciclos', en: 'Last 3 cycles average' },
  gridTariffVar: { es: 'Variación Tarifa Red', en: 'Grid Tariff Change' },
  momFluctuation: { es: 'Fluctuación intermensual', en: 'Month-over-month change' },
  momShort: { es: 'vs ant.', en: 'MoM' },
  energyBalanceTitle: { es: 'Balance Energético', en: 'Energy Balance' },
  energyBalanceDesc: {
    es: 'Energía solar generada frente al consumo tomado de la red eléctrica',
    en: 'Solar energy generated compared against electricity drawn from the grid',
  },
  barView: { es: 'Vista de Barras', en: 'Bar View' },
  lineView: { es: 'Vista de Líneas', en: 'Line View' },
  energyMix: { es: 'Mix Energético', en: 'Energy Mix' },
  cumulativeSolarShare: { es: 'Participación solar acumulada', en: 'Cumulative solar share' },
  solarPv: { es: 'Energía Solar', en: 'Solar Energy' },
  gridPower: { es: 'Red Eléctrica', en: 'Grid Power' },
  totalConsumed: { es: 'Consumo Total', en: 'Total Consumed' },
  perfHspTitle: { es: 'Desempeño Solar Diario', en: 'Daily Solar Performance' },
  perfHspDesc: {
    es: 'Horas de sol pico equivalentes según estándar IEC 61724 · Referencia óptima: 4,0 h/día',
    en: 'Equivalent peak sun hours under IEC 61724 · Optimal target: 4.0 h/day',
  },
  kwTariffFluctTitle: { es: 'Evolución de la Tarifa Eléctrica', en: 'Electricity Tariff Trend' },
  kwTariffFluctDesc: {
    es: 'Costo facturado por cada kWh consumido de la red eléctrica en pesos colombianos',
    en: 'Billed grid electricity cost per kWh over time',
  },

  // Finance Tab
  roiPanelTitle: { es: 'Retorno de Inversión y Amortización', en: 'Return on Investment & Payback' },
  roiPanelDesc: {
    es: 'Cálculo dinámico basado en generación solar real frente a tarifas de red',
    en: 'Dynamically calculated from real solar production vs grid tariffs',
  },
  activePayback: { es: 'Amortización Activa', en: 'Active Payback' },
  amortized: { es: 'Amortizado', en: 'Amortized' },
  paybackProgress: { es: 'Progreso de Amortización', en: 'Payback Progress' },
  totalInvestment: { es: 'Inversión Total', en: 'Total Invested' },
  avgMonthlySavings: { es: 'Ahorro Mensual Promedio', en: 'Avg Monthly Savings' },
  estPaybackTime: { es: 'Tiempo Estimado', en: 'Est. Payback Time' },
  yearsShort: { es: 'Años', en: 'Yrs' },
  totalSaved: { es: 'Ahorro Acumulado', en: 'Total Saved' },
  historicalPaybackCurve: {
    es: 'Curva Histórica de Amortización vs Capital Invertido',
    en: 'Historical Payback Curve vs Invested Capital',
  },
  breakevenHint: { es: 'El punto de cruce marca la recuperación completa del capital', en: 'Intersection marks 100% capital recovery' },
  econometricTitle: {
    es: 'Pronóstico Econométrico y Analítica Tarifaria',
    en: 'Econometric Forecasting & Tariff Intelligence',
  },
  econometricDesc: {
    es: 'Modelo ponderado WLS con banda de confianza del 90%',
    en: 'Weighted WLS model with 90% confidence band',
  },
  confidenceBadge: { es: 'R² {r2}% Confianza', en: 'R² {r2}% Confidence' },
  nextMonthEstTariff: { es: 'Tarifa Estimada Próximo Mes', en: 'Next Month Est. Tariff' },
  bandLabel: { es: 'Banda', en: 'Band' },
  trendAndCagr: { es: 'Tendencia e Inflación Anual', en: 'Trend & Annual Growth' },
  sixMonthForecast: { es: 'Proyección a 6 Meses', en: '6-Month Forecast' },
  midTermHorizon: { es: 'Horizonte medio plazo', en: 'Mid-term horizon' },
  estNextMonthSavings: { es: 'Ahorro Estimado Próximo Mes', en: 'Est. Next Month Savings' },
  basedOnExpectedGen: { es: 'Basado en producción esperada', en: 'Based on expected generation' },
  peakHistorical: { es: 'Pico Histórico:', en: 'Peak Gen Month:' },
  avoidedCo2Label: { es: 'CO₂ Evitado:', en: 'Avoided CO₂:' },
  equivTrees: { es: 'Eq. {trees} árboles plantados', en: 'Eq. {trees} trees planted' },
  simTitle: {
    es: 'Simulador Financiero Interactivo a 25 Años',
    en: 'Interactive 25-Year Financial Simulator',
  },
  simDesc: {
    es: 'Modelado de flujo de caja descontado con degradación e inflación dinámicas',
    en: 'Discounted cashflow valuation with dynamic degradation & inflation',
  },
  annualTariffInflation: { es: 'Inflación Tarifaria Anual', en: 'Annual Tariff Inflation' },
  annualPanelDeg: { es: 'Degradación Anual Paneles', en: 'Annual Panel Degradation' },
  discountRateWacc: { es: 'Tasa de Descuento WACC', en: 'Discount Rate WACC' },
  resetBase: { es: 'Base', en: 'Reset' },
  grossSavings25y: { es: 'Ahorro Bruto 25 Años', en: '25-Yr Gross Savings' },
  cumulativeCashflow: { es: 'Flujo acumulado', en: 'Cumulative cashflow' },
  npvLabel: { es: 'Valor Presente Neto', en: 'Net Present Value' },
  discountedAtWacc: { es: 'Descontado al WACC', en: 'Discounted at WACC' },
  irrLabel: { es: 'Rentabilidad Anual TIR', en: 'Internal Rate of Return' },
  effectiveAnnualReturn: { es: 'Rentabilidad efectiva anual', en: 'Effective annual return' },
  breakevenYear: { es: 'Punto de Equilibrio', en: 'Breakeven Year' },
  inYearsFromStart: { es: 'En {n} años desde el inicio', en: 'In {n} years from start' },
  beyondHorizon: { es: 'Fuera del horizonte', en: 'Beyond horizon' },
  projected25yRoi: { es: 'ROI Proyectado 25 Años', en: 'Projected 25Y ROI' },
  returnOnCapex: { es: 'Múltiplo sobre inversión', en: 'Return on total CAPEX' },
  lcoeLabel: { es: 'Costo Nivelado Solar', en: 'Solar Levelized Cost' },
  solarCostPerKwh: { es: 'Costo solar por kWh', en: 'Solar cost per kWh' },
  totalGen25y: { es: 'Generación 25 Años', en: '25-Yr Total Gen' },
  cleanEnergyLifetime: { es: 'Energía limpia total', en: 'Clean energy lifetime' },
  view25yBreakdown: {
    es: 'Ver flujo de caja detallado año por año',
    en: 'View detailed 25-year annual cashflow breakdown',
  },
  yearCol: { es: 'Año', en: 'Year' },
  genKwhCol: { es: 'Generación kWh', en: 'Generation kWh' },
  annualSavingsCol: { es: 'Ahorro Anual', en: 'Annual Savings' },
  cumulatedSavingsCol: { es: 'Ahorro Acumulado', en: 'Cumulated' },
  netBalanceCol: { es: 'Balance Neto', en: 'Net Balance' },

  // Audit Tab & Modals
  cloudHistoricalReadings: { es: 'Registro Histórico Cloud', en: 'Cloud Historical Readings' },
  searchRecordsPlaceholder: { es: 'Buscar período o fecha...', en: 'Search period or date...' },
  importCsv: { es: 'Importar CSV', en: 'Import CSV' },
  periodDateCol: { es: 'Período / Fecha', en: 'Period / Date' },
  readingsGridSolarCol: { es: 'Lecturas Red / Solar', en: 'Readings Grid / Solar' },
  gridUsageCol: { es: 'Consumo Red', en: 'Grid Usage' },
  solarGenCol: { es: 'Gen. Solar', en: 'Solar Gen' },
  yieldCol: { es: 'Rendimiento', en: 'Yield' },
  kwTariffCol: { es: 'Tarifa kW', en: 'kW Tariff' },
  savingsCol: { es: 'Ahorro', en: 'Savings' },
  noReadingsFound: { es: 'No hay registros', en: 'No readings found' },
  noReadingsMatch: {
    es: 'No encontramos lecturas para este período o búsqueda.',
    en: 'No records match the current filter or search query.',
  },
  initialBaseReadingTag: { es: 'Lectura Inicial Base', en: 'Initial Base Reading' },
  baseRefDesc: {
    es: 'Punto de referencia inicial para el cálculo de deltas mensuales',
    en: 'Baseline reference point for monthly delta calculations',
  },
  baseTariff: { es: 'Tarifa base', en: 'Base tariff' },
  pvEfficiency: { es: 'Eficiencia Fotovoltaica IEC 61724', en: 'PV Efficiency IEC 61724' },
  dailyBreakdown: { es: 'Desglose Diario · {days} días', en: 'Daily Breakdown · {days} days' },
  ecoImpact: { es: 'Impacto Económico & Ecológico', en: 'Economic & Eco Impact' },
  newRecord: { es: 'Nuevo Registro', en: 'New Record' },
  newCloudRecord: { es: 'Nuevo Registro Cloud', en: 'New Cloud Record' },
  editCloudRecord: { es: 'Editar Registro Cloud', en: 'Edit Cloud Record' },
  readingDate: { es: 'Fecha de Lectura', en: 'Reading Date' },
  gridReading: { es: 'Lectura Medidor Red', en: 'Grid Meter Reading' },
  solarReading: { es: 'Lectura Inversor Solar', en: 'Solar Inverter Reading' },
  pricePerKw: { es: 'Precio por kW en COP', en: 'Price per kW in COP' },
  inverterResetTitle: { es: 'Reinicio de inversor solar', en: 'Solar inverter reset' },
  inverterResetDesc: {
    es: 'Marca si cambiaste el inversor y la lectura reinició desde 0.',
    en: 'Check if inverter was replaced and reading started from 0.',
  },
  meterResetTitle: { es: 'Reinicio de medidor de red', en: 'Grid meter reset' },
  meterResetDesc: {
    es: 'Marca si la empresa de energía reemplazó el medidor de red.',
    en: 'Check if utility company replaced the grid meter.',
  },
  liveCalcTitle: { es: 'Cálculo en tiempo real', en: 'Real-time calculation' },
  saveToCloud: { es: 'Guardar en la Nube', en: 'Save to Cloud' },
  recordSaved: { es: 'Registro guardado exitosamente', en: 'Record saved successfully' },
  recordDeleted: { es: 'Registro eliminado exitosamente', en: 'Record deleted successfully' },
  deleteRecordTitle: { es: 'Eliminar Registro Solar', en: 'Delete Solar Record' },
  deleteRecordMsg: {
    es: '¿Confirmas que deseas eliminar el registro de {fecha}? Esta acción recalculará los balances del período.',
    en: 'Are you sure you want to delete the record for {fecha}? This will recalculate period balances.',
  },
  deleteRecordBtn: { es: 'Eliminar Registro', en: 'Delete Record' },

  // CSV Modal
  csvImportTitle: { es: 'Importar Historial desde CSV', en: 'Import Readings from CSV' },
  csvImportHelp: {
    es: 'Carga un archivo CSV con columnas de Fecha, Lectura Red, Lectura Solar y Tarifa kW.',
    en: 'Upload a CSV file containing Date, Grid Reading, Solar Reading, and kW Tariff.',
  },
  downloadCsvTemplate: { es: 'Descargar Plantilla CSV', en: 'Download CSV Template' },
  chooseCsvFile: { es: 'Seleccionar archivo CSV', en: 'Choose CSV file' },
  utf8CsvHint: { es: 'Codificación UTF-8, delimitado por comas', en: 'UTF-8 encoded, comma separated' },
  detectedRecords: { es: 'Registros detectados:', en: 'Detected records:' },
  importAndSync: { es: 'Importar y Sincronizar con la Nube', en: 'Import & Sync to Cloud' },
  csvExportSuccess: { es: 'Reporte CSV descargado correctamente', en: 'CSV Report downloaded successfully' },
  csvNoData: { es: 'No hay lecturas registradas para exportar', en: 'No readings available to export' },
  importingRecords: { es: 'Importando {count} registros...', en: 'Importing {count} records...' },
  importedRecords: { es: '{count} registros importados exitosamente', en: '{count} records imported successfully' },

  // Executive Report
  execReportTitle: { es: 'Informe Ejecutivo de Planta Solar', en: 'Solar Plant Executive Report' },
  printSavePdf: { es: 'Imprimir / Guardar PDF', en: 'Print / Save PDF' },

  // Trend & Misc
  gridMeter: { es: 'Medidor de red', en: 'Grid meter' },
  solarInverter: { es: 'Inversor solar', en: 'Solar inverter' },
  costPerKw: { es: 'Costo por kW', en: 'Cost per kW' },
  investment: { es: 'Inversión', en: 'Investment' },
  rising: { es: 'Alza Fuerte', en: 'Strong Rise' },
  risingMod: { es: 'Alza Moderada', en: 'Moderate Rise' },
  falling: { es: 'Baja Significativa', en: 'Significant Drop' },
  fallingMod: { es: 'Baja Leve', en: 'Slight Drop' },
  equal: { es: 'Estable', en: 'Stable' },
  maxProjectsReached: { es: 'Máximo de proyectos alcanzado', en: 'Maximum projects reached' },

  // Solarman
  solarmanAuthTitle: { es: 'Conexión Remota con Solarman PV', en: 'Solarman PV Remote Monitoring Connection' },
  solarmanAuthSubtitle: {
    es: 'Ingresa tus credenciales de Solarman para vincular e inspeccionar en vivo los inversores de {project}',
    en: 'Enter your Solarman credentials to link and inspect live inverter telemetry for {project}',
  },
  solarmanShaBadge: { es: 'Hash SHA-256 Seguro', en: 'Secure SHA-256 Hash' },
  solarmanOnDemandTitle: { es: 'Credenciales Bajo Demanda', en: 'On-Demand Credentials' },
  solarmanOnDemandDesc: {
    es: 'Tu contraseña se convierte en hash SHA-256 localmente. El App Secret se gestiona únicamente en el servidor proxy.',
    en: 'Your password is hashed locally via SHA-256. The App Secret is handled strictly on the proxy server.',
  },
  solarmanMultiPlantTitle: { es: 'Soporte Multi-Planta por Proyecto', en: 'Multi-Plant Project Binding' },
  solarmanMultiPlantDesc: {
    es: 'Cada proyecto de la app se vincula a su planta específica de Solarman o puedes cambiarla con un botón.',
    en: 'Each project binds to its own Solarman station or lets you switch stations anytime.',
  },
  solarmanEmail: { es: 'Correo de Cuenta Solarman', en: 'Solarman Account Email' },
  solarmanPassword: { es: 'Contraseña de Solarman', en: 'Solarman Password' },
  solarmanRegion: { es: 'Servidor Regional Solarman', en: 'Solarman Regional Server' },
  solarmanOrgId: { es: 'ID Organización Business · Opcional', en: 'Business Org ID · Optional' },
  solarmanOrgHint: { es: 'Dejar vacío para cuentas Solarman Smart', en: 'Leave empty for Solarman Smart accounts' },
  solarmanSessionNotice: {
    es: 'Por seguridad, el token solo vive en la sesión actual de esta pestaña.',
    en: 'For security, the token is kept only for this tab session.',
  },
  solarmanConnectBtn: { es: 'Conectar con Solarman Cloud', en: 'Connect to Solarman Cloud' },
  solarmanDemoBtn: { es: 'Explorar Simulación Demo', en: 'Explore Demo Simulation' },
  exitDemoMode: { es: 'Salir del Modo Demo', en: 'Exit Demo Mode' },
  solarmanAuthErrTitle: { es: 'Error de conexión con Solarman', en: 'Solarman Connection Error' },
  solarmanConnected: { es: 'Conectado a Solarman Cloud exitosamente', en: 'Connected to Solarman Cloud successfully' },
  solarmanDemoActivated: {
    es: 'Modo simulación demo activado para pruebas de interfaz',
    en: 'Demo simulation mode activated for UI testing',
  },
  solarmanDisconnected: { es: 'Cuenta de Solarman desconectada', en: 'Solarman account disconnected' },
  solarmanUpdated: { es: 'Telemetría de Solarman actualizada', en: 'Solarman telemetry updated' },
  solarmanNewPacket: { es: 'Nuevo paquete del inversor recibido desde Solarman', en: 'New inverter packet received from Solarman' },
  solarmanSelectPlantFor: { es: 'Seleccionar Planta Solarman para {project}', en: 'Select Solarman Plant for {project}' },
  solarmanBackToMonitor: { es: 'Volver al Monitor', en: 'Back to Monitor' },
  solarmanSwitchAccount: { es: 'Cambiar Cuenta', en: 'Switch Account' },
  solarmanNoStations: { es: 'No se encontraron plantas en esta cuenta', en: 'No stations found in this account' },
  solarmanNoStationsDesc: {
    es: 'Verifica que tu usuario tenga plantas asignadas en Solarman o cambia la región del servidor.',
    en: 'Check that your user has assigned stations in Solarman or switch server region.',
  },
  solarmanBoundPlant: { es: 'Planta Vinculada:', en: 'Bound Plant:' },
  solarmanLastPacket: { es: 'Último reporte del inversor:', en: 'Last inverter packet:' },
  solarmanAutoSync: { es: 'Sincronización automática activa', en: 'Auto-sync active' },
  solarmanDevice: { es: 'Equipo:', en: 'Device:' },
  solarmanSwitchPlantBtn: { es: 'Cambiar Planta · {count}', en: 'Switch Plant · {count}' },
  solarmanRefreshNow: { es: 'Actualizar Ahora', en: 'Refresh Now' },
  solarmanUseInRecord: { es: 'Usar {kwh} kWh en Registro', en: 'Use {kwh} kWh in Record' },
  solarmanSyncingTitle: {
    es: 'Sincronizando telemetría remota con Solarman Cloud...',
    en: 'Synchronizing remote telemetry with Solarman Cloud...',
  },
  solarmanSyncingDesc: {
    es: 'Consultando datos recientes para {project}',
    en: 'Fetching latest values for {project}',
  },
  solarmanHistoryTitle: { es: 'Curva de Operación e Historial del Día', en: 'Daily Telemetry & Parameter History' },
  solarmanHistoryDesc: {
    es: 'Explora potencia solar, consumo, batería, temperatura y voltajes por fecha',
    en: 'Inspect PV power, load, battery, inverter temperature & string voltages by date',
  },
  day: { es: 'Día', en: 'Day' },
  days14: { es: '14 Días', en: '14 Days' },
  today: { es: 'Hoy', en: 'Today' },
  yesterday: { es: 'Ayer', en: 'Yesterday' },
  powerW: { es: 'Potencia', en: 'Power' },
  batteryTemp: { es: 'Batería y Temp.', en: 'Battery & Temp' },
  stringsV: { es: 'Voltaje Cadenas', en: 'String Voltage' },
};

/**
 * Translate a key using an explicit language code and optional variable interpolation.
 * @param {'es'|'en'} lang
 * @param {string} key
 * @param {Object<string, string|number>} [vars]
 * @returns {string}
 */
export function translate(lang, key, vars = null) {
  const entry = T[key];
  let str = entry ? (entry[lang] || entry.es || key) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v ?? ''));
    }
  }
  return str;
}

/**
 * Retrieve the translation for a given key in the current language (`state.lang`).
 * @param {string} key
 * @param {Object<string, string|number>} [vars]
 * @returns {string}
 */
export function t(key, vars = null) {
  return translate(state.lang || 'es', key, vars);
}

/**
 * Get the localised month name for a 1-based month index.
 * @param {number} idx - Month index (1 = January … 12 = December)
 * @param {'es'|'en'} [lang]
 * @returns {string}
 */
export function monthName(idx, lang = state.lang) {
  const months = MONTHS[lang] || MONTHS.es;
  return months[(idx - 1 + 12) % 12] || '';
}
