/**
 * @module state
 * Global application state for the solar monitoring app.
 * All modules import from here to share a single source of truth.
 */

/** @type {Object} Mutable application state */
export const state = {
  /** @type {Object|null} Current authenticated user */
  user: null,
  /** @type {boolean} Whether the current user has admin privileges */
  isAdmin: false,
  /** @type {'es'|'en'} Active UI language */
  lang: 'es',

  // Multi-project
  /** @type {Array<Object>} All projects the user can access */
  projects: [],
  /** @type {Object|null} Currently selected project */
  activeProject: null,
  /** @type {string|null} User's role in the active project */
  activeProjectRole: null,

  // Active project data
  /** @type {Array<Object>} Raw solar readings from the database */
  rawData: [],
  /** @type {Array<Object>} Processed data with calculated fields */
  processedData: [],
  /** @type {Array<Object>} Filtered view of processedData (by year, etc.) */
  viewData: [],
  /** @type {Array<Object>} Investment phases for the active project */
  investments: [],
  /** @type {{ energia: string, precio: string }} Chart display modes */
  chartModes: { energia: 'bar', precio: 'line' },
  /** @type {Object<string, import('chart.js').Chart>} Active Chart.js instances keyed by canvas id */
  charts: {},

  // Current view
  /** @type {string} The currently displayed view/screen */
  currentView: 'login',
};

/**
 * Set the authenticated user and admin flag.
 * @param {Object|null} user - Supabase user object
 * @param {boolean} isAdmin - Whether the user is an admin
 */
export function setUser(user, isAdmin) {
  state.user = user;
  state.isAdmin = isAdmin;
}

/**
 * Set the active project and the user's role within it.
 * @param {Object|null} project - Project record
 * @param {string|null} role - 'admin' or 'observer'
 */
export function setActiveProject(project, role) {
  state.activeProject = project;
  state.activeProjectRole = role;
}

/**
 * Clear all data arrays for the active project.
 * Called when switching projects or logging out.
 */
export function clearProjectData() {
  state.rawData = [];
  state.processedData = [];
  state.viewData = [];
  state.investments = [];
}

/**
 * Update the current view identifier.
 * @param {string} view - View name (e.g. 'login', 'dashboard', 'projects')
 */
export function setView(view) {
  state.currentView = view;
}
