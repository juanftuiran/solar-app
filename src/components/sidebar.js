/**
 * @module sidebar
 * @description Admin sidebar navigation for JF Solar Cloud dashboard.
 */

import { state } from '../modules/state.js';

const NAV_ITEMS = [
  { id: 'dashboard',   icon: 'fa-chart-line',   labelEs: 'Dashboard',            labelEn: 'Dashboard' },
  { id: 'investments', icon: 'fa-layer-group',   labelEs: 'Fases de Inversión',   labelEn: 'Investment Phases' },
  { id: 'settings',    icon: 'fa-gear',          labelEs: 'Configuración',        labelEn: 'Settings' },
  { id: 'members',     icon: 'fa-users',         labelEs: 'Miembros',             labelEn: 'Members' },
];

export function renderSidebar(activeView) {
  const project = state.activeProject || {};
  const user = state.user || {};
  const userInitials = (user.email || 'JS').slice(0, 2).toUpperCase();

  const navItemsHTML = NAV_ITEMS.map(item => {
    const isActive = item.id === activeView;
    return `
      <button
        class="sidebar-nav-item ${isActive ? 'active' : ''}"
        data-view="${item.id}"
        type="button"
      >
        <i class="fa-solid ${item.icon}"></i>
        <span class="lang-es">${item.labelEs}</span>
        <span class="lang-en">${item.labelEn}</span>
      </button>
    `;
  }).join('');

  return `
    <!-- Mobile toggle button -->
    <button
      id="sidebar-toggle"
      class="sidebar-toggle"
      type="button"
      aria-label="Toggle sidebar"
    >
      <i class="fa-solid fa-bars" id="sidebar-toggle-icon"></i>
    </button>

    <!-- Mobile overlay -->
    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <!-- Sidebar panel -->
    <aside id="sidebar-panel" class="sidebar">
      <!-- Brand -->
      <div class="sidebar-brand">
        <i class="fa-solid fa-solar-panel"></i>
        <div>
          <h2>JF Solar Cloud</h2>
          <span style="font-size:.65rem;color:var(--solar);font-weight:800;letter-spacing:.08em;text-transform:uppercase;">
            v3.5 Enterprise
          </span>
        </div>
      </div>

      <!-- Active Project Info Card -->
      <div class="sidebar-project">
        <div class="sidebar-project-name" title="${_escapeHTML(project.name || '')}">
          ${_escapeHTML(project.name || 'Proyecto')}
        </div>
        <div class="sidebar-project-meta">
          <span class="online-dot"></span>
          <span>${project.location ? _escapeHTML(project.location) : 'Online'}</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="sidebar-nav">
        ${navItemsHTML}

        <div class="sidebar-divider"></div>

        <!-- Switch Project -->
        <button
          class="sidebar-nav-item"
          data-view="projects"
          type="button"
        >
          <i class="fa-solid fa-arrows-rotate"></i>
          <span class="lang-es">Mis Proyectos</span>
          <span class="lang-en">My Projects</span>
        </button>
      </nav>

      <!-- User footer -->
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="avatar-pill">
            ${userInitials}
          </div>
          <div style="min-width:0;flex:1;">
            <div class="sidebar-user-email" title="${_escapeHTML(user.email || '')}">
              ${_escapeHTML(user.email || '')}
            </div>
            <div class="sidebar-user-role">
              ${state.isAdmin ? 'Admin' : 'Observador'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  `;
}

export function initSidebar(onNavigate) {
  document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (typeof onNavigate === 'function') {
        onNavigate(view);
      }
      _closeMobileSidebar();
    });
  });

  const toggle = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');
  const panel = document.getElementById('sidebar-panel');

  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('sidebar--open');
      overlay?.classList.toggle('visible', isOpen);
      const icon = document.getElementById('sidebar-toggle-icon');
      if (icon) {
        icon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', _closeMobileSidebar);
  }
}

function _closeMobileSidebar() {
  const panel = document.getElementById('sidebar-panel');
  const overlay = document.getElementById('sidebar-overlay');
  const icon = document.getElementById('sidebar-toggle-icon');
  if (panel) panel.classList.remove('sidebar--open');
  if (overlay) overlay.classList.remove('visible');
  if (icon) icon.className = 'fa-solid fa-bars';
}

function _escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
