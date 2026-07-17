/**
 * @module projectSelectorView
 * @description Project selector view for JF Solar Cloud.
 * Displays a responsive grid of project cards with branding, logout, and
 * optional "new project" action for admins.
 */

import { state } from '../modules/state.js';
import { renderProjectCard } from '../components/projectCard.js';

/** Maximum number of projects allowed per user */
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

  // Project cards grid
  let cardsHTML = '';
  if (count === 0) {
    cardsHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#64748b;">
        <i class="fa-solid fa-folder-open" style="font-size:2.5rem;margin-bottom:1rem;display:block;opacity:.3;"></i>
        <p style="font-size:.9rem;">
          <span class="lang-es">No tienes proyectos asignados.</span>
          <span class="lang-en">You have no assigned projects.</span>
        </p>
      </div>
    `;
  } else {
    cardsHTML = projects.map(p => {
      const role = p._role || 'observer';
      const invCount = p._investmentCount || 0;
      return renderProjectCard(p, role, invCount, 'window.__selectProject');
    }).join('');
  }

  // New project button (admin only, under limit)
  const newProjectBtn = isAdmin && count < MAX_PROJECTS
    ? `
      <button
        id="btn-new-project"
        class="btn btn-solar"
        style="gap:.5rem;"
      >
        <i class="fa-solid fa-plus"></i>
        <span class="lang-es">Nuevo Proyecto</span>
        <span class="lang-en">New Project</span>
      </button>
    `
    : '';

  return `
    <div id="project-selector-view" style="min-height:100vh;padding:1rem;">
      <!-- Header -->
      <header style="
        display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;
        max-width:72rem;margin:0 auto;padding:1rem 0;gap:1rem;
      ">
        <div style="display:flex;align-items:center;gap:.625rem;">
          <i class="fa-solid fa-solar-panel" style="color:#10b981;font-size:1.375rem;"></i>
          <span style="font-size:1.125rem;font-weight:900;color:#e2e8f0;">JF Solar Cloud</span>
        </div>

        <div style="display:flex;align-items:center;gap:.75rem;">
          <span style="font-size:.75rem;color:#94a3b8;">
            <i class="fa-solid fa-circle-user" style="margin-right:.3rem;"></i>${_escapeHTML(user.email || '')}
          </span>
          <button id="btn-logout-selector" class="btn btn-ghost" style="font-size:.8rem;padding:.4rem .75rem;">
            <i class="fa-solid fa-right-from-bracket"></i>
            <span class="lang-es">Salir</span>
            <span class="lang-en">Logout</span>
          </button>
        </div>
      </header>

      <!-- Title + new project action -->
      <div style="
        max-width:72rem;margin:1.5rem auto .75rem;
        display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1rem;
      ">
        <div>
          <h1 style="font-size:1.375rem;font-weight:900;color:#e2e8f0;">
            <span class="lang-es">Mis Proyectos</span>
            <span class="lang-en">My Projects</span>
            <span style="font-size:.9rem;font-weight:600;color:#64748b;"> (${count}/${MAX_PROJECTS})</span>
          </h1>
          <p style="font-size:.8rem;color:#64748b;margin-top:.2rem;">
            <span class="lang-es">Selecciona un proyecto para continuar</span>
            <span class="lang-en">Select a project to continue</span>
          </p>
        </div>
        ${newProjectBtn}
      </div>

      <!-- Projects grid -->
      <div
        id="projects-grid"
        style="
          max-width:72rem;margin:0 auto;
          display:grid;gap:1rem;
          grid-template-columns:1fr;
        "
      >
        ${cardsHTML}
      </div>

      <style>
        @media (min-width: 640px)  { #projects-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { #projects-grid { grid-template-columns: repeat(3, 1fr); } }
      </style>
    </div>
  `;
}

/**
 * Initialise project selector event listeners.
 *
 * @param {Function} onSelectProject - Called with `(projectId: string)` when a card is clicked
 * @param {Function} onCreateProject - Called when the "New Project" button is clicked
 * @param {Function} onLogout - Called when the logout button is clicked
 */
export function init(onSelectProject, onCreateProject, onLogout) {
  // Project card clicks
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => {
      const projectId = card.dataset.projectId;
      if (projectId && typeof onSelectProject === 'function') {
        onSelectProject(projectId);
      }
    });
  });

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

/* ── Private helpers ──────────────────────────────────────────────────────── */

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 * @private
 */
function _escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
