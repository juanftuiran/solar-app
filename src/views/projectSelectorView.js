/**
 * @module projectSelectorView
 * @description Modern enterprise project selector view for JF Solar Cloud with real-time search.
 */

import { state } from '../modules/state.js';
import { renderProjectCard } from '../components/projectCard.js';

const MAX_PROJECTS = 20;

/**
 * Render the project selector view HTML.
 *
 * @returns {string} HTML string for the project selector
 */
export function render() {
  const user = state.user || {};
  const projects = state.projects || [];
  const isAdmin = state.isAdmin || false;
  const count = projects.length;
  const userInitials = (user.email || 'JS').slice(0, 2).toUpperCase();

  let cardsHTML = '';
  if (count === 0) {
    cardsHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:4rem 1.5rem;color:var(--muted-light);">
        <i class="fa-solid fa-solar-panel" style="font-size:3rem;margin-bottom:1.25rem;display:block;opacity:.3;color:var(--solar);"></i>
        <h3 style="font-size:1.15rem;font-weight:700;color:#fff;margin-bottom:.5rem;">
          <span class="lang-es">No tienes proyectos asignados</span>
          <span class="lang-en">No assigned projects</span>
        </h3>
        <p style="font-size:.85rem;color:var(--muted-light);max-width:26rem;margin:0 auto;">
          <span class="lang-es">Crea tu primer proyecto solar para comenzar a monitorear la producción y ahorro.</span>
          <span class="lang-en">Create your first solar project to start monitoring generation and savings.</span>
        </p>
      </div>
    `;
  } else {
    cardsHTML = projects.map(p => {
      const role = p._role || (isAdmin ? 'admin' : 'observer');
      const invCount = p._investmentCount || 0;
      return renderProjectCard(p, role, invCount, 'window.__selectProject');
    }).join('');
  }

  const newProjectBtn = isAdmin && count < MAX_PROJECTS
    ? `
      <button id="btn-new-project" class="btn btn-solar btn-lg" style="gap:.5rem;">
        <i class="fa-solid fa-plus"></i>
        <span class="lang-es">Nuevo Proyecto</span>
        <span class="lang-en">New Project</span>
      </button>
    `
    : '';

  return `
    <div id="project-selector-view" class="project-selector">
      <!-- Topbar Header -->
      <header class="project-selector-header">
        <div class="project-selector-brand">
          <i class="fa-solid fa-solar-panel"></i>
          <div>
            <h1>JF Solar Cloud</h1>
            <span style="font-size:.65rem;color:var(--solar);font-weight:800;letter-spacing:.08em;text-transform:uppercase;">
              Enterprise Monitoring
            </span>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:1rem;">
          <div style="display:flex;align-items:center;gap:.6rem;">
            <div class="avatar-pill">${userInitials}</div>
            <span style="font-size:.8rem;color:var(--text-secondary);font-weight:600;" class="hide-mobile">
              ${_escapeHTML(user.email || '')}
            </span>
          </div>
          <button id="btn-logout-selector" class="btn btn-ghost btn-sm">
            <i class="fa-solid fa-right-from-bracket"></i>
            <span class="lang-es">Salir</span>
            <span class="lang-en">Logout</span>
          </button>
        </div>
      </header>

      <!-- Main Body -->
      <main class="project-selector-body">
        <div class="project-selector-toolbar">
          <div>
            <div style="display:flex;align-items:center;gap:.75rem;">
              <h2 style="font-size:1.5rem;font-weight:900;color:#fff;letter-spacing:-.02em;">
                <span class="lang-es">Proyectos Solares</span>
                <span class="lang-en">Solar Projects</span>
              </h2>
              <span style="background:var(--accent-subtle);color:var(--accent);border:1px solid rgba(14,165,233,0.3);padding:.2rem .6rem;border-radius:var(--radius-full);font-size:.75rem;font-weight:800;" class="tabular-nums">
                ${count} / ${MAX_PROJECTS}
              </span>
            </div>
            <p style="font-size:.85rem;color:var(--muted-light);margin-top:.25rem;">
              <span class="lang-es">Selecciona una planta solar para acceder a su telemetría y analítica.</span>
              <span class="lang-en">Select a solar plant to access telemetry and analytics.</span>
            </p>
          </div>

          <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;">
            <!-- Real-time search filter -->
            <div class="search-input-wrap">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                id="project-search-input"
                placeholder="Buscar por nombre o ubicación..."
                aria-label="Buscar proyectos"
              />
            </div>
            ${newProjectBtn}
          </div>
        </div>

        <!-- Project Grid -->
        <div
          id="projects-grid"
          style="
            display:grid;gap:1.25rem;
            grid-template-columns:1fr;
          "
        >
          ${cardsHTML}
        </div>

        <style>
          @media (min-width: 640px)  { #projects-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (min-width: 1100px) { #projects-grid { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 640px) { .hide-mobile { display: none; } }
        </style>
      </main>
    </div>
  `;
}

/**
 * Initialise project selector event listeners with real-time search filter.
 *
 * @param {Function} onSelectProject - Called with `(projectId: string)` when a card is clicked
 * @param {Function} onCreateProject - Called when the "New Project" button is clicked
 * @param {Function} onLogout - Called when the logout button is clicked
 */
export function init(onSelectProject, onCreateProject, onLogout) {
  // Bind card clicks
  _bindCardClicks(onSelectProject);

  // Search filter
  const searchInput = document.getElementById('project-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#projects-grid .project-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // New project button
  const newBtn = document.getElementById('btn-new-project');
  if (newBtn && typeof onCreateProject === 'function') {
    newBtn.addEventListener('click', onCreateProject);
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-logout-selector');
  if (logoutBtn && typeof onLogout === 'function') {
    logoutBtn.addEventListener('click', onLogout);
  }
}

function _bindCardClicks(onSelectProject) {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => {
      const projectId = card.dataset.projectId;
      if (projectId && typeof onSelectProject === 'function') {
        onSelectProject(projectId);
      }
    });
    // Keyboard access
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const projectId = card.dataset.projectId;
        if (projectId && typeof onSelectProject === 'function') {
          onSelectProject(projectId);
        }
      }
    });
  });
}

function _escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
