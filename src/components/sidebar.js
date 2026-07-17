/**
 * @module sidebar
 * @description Admin sidebar navigation for JF Solar Cloud dashboard.
 * Renders navigation items, project info, and user details.
 * Collapsible on mobile via a hamburger toggle button.
 */

import { state } from '../modules/state.js';

/**
 * @typedef {'dashboard'|'settings'|'investments'|'members'} ViewName
 */

/**
 * Navigation items configuration.
 * @type {Array<{id: ViewName, icon: string, labelEs: string, labelEn: string}>}
 */
const NAV_ITEMS = [
  { id: 'dashboard',   icon: 'fa-chart-line',   labelEs: 'Dashboard',            labelEn: 'Dashboard' },
  { id: 'investments', icon: 'fa-layer-group',   labelEs: 'Fases de Inversión',   labelEn: 'Investment Phases' },
  { id: 'settings',    icon: 'fa-gear',          labelEs: 'Configuración',        labelEn: 'Settings' },
  { id: 'members',     icon: 'fa-users',         labelEs: 'Miembros',             labelEn: 'Members' },
];

/**
 * Render the sidebar HTML string.
 *
 * @param {ViewName} activeView - Currently active view identifier
 * @param {string} onNavigate - Name of the global callback function registered on `window`
 * @returns {string} Sidebar HTML
 */
export function renderSidebar(activeView, onNavigate) {
  const project = state.activeProject || {};
  const user = state.user || {};

  const navItemsHTML = NAV_ITEMS.map(item => {
    const isActive = item.id === activeView;
    const activeCls = isActive
      ? 'background:rgba(14,165,233,.15);color:#0ea5e9;border-left:3px solid #0ea5e9;'
      : 'border-left:3px solid transparent;';
    return `
      <button
        class="sidebar-nav-item"
        data-view="${item.id}"
        style="
          display:flex;align-items:center;gap:.75rem;width:100%;
          padding:.625rem 1rem;background:none;border:none;
          color:${isActive ? '#0ea5e9' : '#cbd5e1'};
          font-size:.875rem;cursor:pointer;transition:all .15s;
          text-align:left;${activeCls}
        "
      >
        <i class="fa-solid ${item.icon}" style="width:1.25rem;text-align:center;"></i>
        <span class="lang-es">${item.labelEs}</span>
        <span class="lang-en">${item.labelEn}</span>
      </button>
    `;
  }).join('');

  return `
    <!-- Mobile hamburger toggle -->
    <button
      id="sidebar-toggle"
      type="button"
      aria-label="Toggle sidebar"
      style="
        display:none;position:fixed;top:.75rem;left:.75rem;z-index:45;
        background:rgba(30,41,59,.9);border:1px solid rgba(100,116,139,.3);
        border-radius:.5rem;color:#e2e8f0;padding:.5rem .625rem;
        font-size:1.125rem;cursor:pointer;
      "
    >
      <i class="fa-solid fa-bars" id="sidebar-toggle-icon"></i>
    </button>

    <!-- Sidebar panel -->
    <aside
      id="sidebar-panel"
      class="sidebar"
      style="
        width:240px;min-width:240px;height:100vh;
        background:rgba(15,23,42,.95);
        border-right:1px solid rgba(100,116,139,.15);
        display:flex;flex-direction:column;
        position:sticky;top:0;
        overflow-y:auto;
        transition:transform .25s ease;
      "
    >
      <!-- Brand -->
      <div style="padding:1.25rem 1rem;border-bottom:1px solid rgba(100,116,139,.15);">
        <div style="display:flex;align-items:center;gap:.5rem;">
          <i class="fa-solid fa-solar-panel" style="color:#10b981;font-size:1.25rem;"></i>
          <span style="font-weight:800;font-size:1rem;color:#e2e8f0;">JF Solar</span>
        </div>
        <p style="font-size:.65rem;color:#64748b;margin-top:.25rem;text-transform:uppercase;letter-spacing:.1em;">
          Cloud Admin
        </p>
      </div>

      <!-- Navigation -->
      <nav style="flex:1;padding:.5rem 0;display:flex;flex-direction:column;gap:.125rem;">
        ${navItemsHTML}

        <!-- Separator -->
        <div style="height:1px;background:rgba(100,116,139,.15);margin:.75rem 1rem;"></div>

        <!-- Switch project -->
        <button
          class="sidebar-nav-item"
          data-view="switch-project"
          style="
            display:flex;align-items:center;gap:.75rem;width:100%;
            padding:.625rem 1rem;background:none;border:none;
            color:#94a3b8;font-size:.8rem;cursor:pointer;
            border-left:3px solid transparent;text-align:left;
          "
        >
          <i class="fa-solid fa-arrows-rotate" style="width:1.25rem;text-align:center;"></i>
          <span class="lang-es">Cambiar Proyecto</span>
          <span class="lang-en">Switch Project</span>
        </button>

        <!-- Back to projects -->
        <button
          class="sidebar-nav-item"
          data-view="projects"
          style="
            display:flex;align-items:center;gap:.75rem;width:100%;
            padding:.625rem 1rem;background:none;border:none;
            color:#94a3b8;font-size:.8rem;cursor:pointer;
            border-left:3px solid transparent;text-align:left;
          "
        >
          <i class="fa-solid fa-arrow-left" style="width:1.25rem;text-align:center;"></i>
          <span class="lang-es">← Volver a Proyectos</span>
          <span class="lang-en">← Back to Projects</span>
        </button>
      </nav>

      <!-- Footer: project + user info -->
      <div style="padding:1rem;border-top:1px solid rgba(100,116,139,.15);">
        <div style="font-size:.75rem;color:#64748b;margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.05em;">
          <span class="lang-es">Proyecto activo</span>
          <span class="lang-en">Active project</span>
        </div>
        <p
          id="sidebar-project-name"
          style="font-size:.8rem;font-weight:700;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
        >
          ${project.name || '—'}
        </p>
        <div style="margin-top:.75rem;display:flex;align-items:center;gap:.5rem;">
          <i class="fa-solid fa-circle-user" style="color:#64748b;"></i>
          <span
            id="sidebar-user-email"
            style="font-size:.7rem;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
          >
            ${user.email || ''}
          </span>
        </div>
      </div>
    </aside>

    <style>
      @media (max-width: 767px) {
        #sidebar-toggle { display: block !important; }
        #sidebar-panel {
          position: fixed !important;
          left: 0; top: 0;
          z-index: 40;
          transform: translateX(-100%);
        }
        #sidebar-panel.sidebar--open {
          transform: translateX(0);
        }
      }
    </style>
  `;
}

/**
 * Bind sidebar event listeners after the sidebar HTML has been inserted into the DOM.
 *
 * @param {Function} onNavigate - Callback invoked with the view name when a nav item is clicked
 */
export function initSidebar(onNavigate) {
  // Navigation item clicks
  document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (typeof onNavigate === 'function') {
        onNavigate(view);
      }
      // Auto-close on mobile
      _closeMobileSidebar();
    });
  });

  // Hamburger toggle
  const toggle = document.getElementById('sidebar-toggle');
  const panel = document.getElementById('sidebar-panel');
  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('sidebar--open');
      const icon = document.getElementById('sidebar-toggle-icon');
      if (icon) {
        icon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
      }
    });
  }
}

/* ── Private helpers ──────────────────────────────────────────────────────── */

/**
 * Close the sidebar on mobile viewports.
 * @private
 */
function _closeMobileSidebar() {
  const panel = document.getElementById('sidebar-panel');
  const icon = document.getElementById('sidebar-toggle-icon');
  if (panel) panel.classList.remove('sidebar--open');
  if (icon) icon.className = 'fa-solid fa-bars';
}
