/**
 * @module projectSelectorView
 * @description Modern enterprise project selector view for JF Solar Cloud with real-time search,
 * portfolio-level KPI summary, theme toggle, and language selector.
 */

import { state } from '../modules/state.js';
import { renderProjectCard } from '../components/projectCard.js';
import { fCOP, fDec } from '../modules/formatters.js';

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

  const totalCapacity = projects.reduce((s, p) => s + (parseFloat(p.capacity_kw) || 0), 0);
  const totalPortfolioInvested = projects.reduce((s, p) => s + (parseFloat(p._totalInvested) || 0), 0);
  const totalPanels = projects.reduce((s, p) => s + (parseInt(p.panel_count, 10) || 0), 0);

  const isEn = state.lang === 'en';
  const flagCode = isEn ? 'us' : 'co';
  const langLabel = isEn ? 'EN' : 'ES';
  const isLight = state.theme === 'light';

  let cardsHTML = '';
  if (count === 0) {
    cardsHTML = `
      <div style="grid-column:1/-1;">
        <div class="empty-state">
          <div class="empty-icon text-solar"><i class="fa-solid fa-solar-panel"></i></div>
          <h3>
            <span class="lang-es">No tienes proyectos asignados</span>
            <span class="lang-en">No assigned projects</span>
          </h3>
          <p>
            <span class="lang-es">Crea tu primer proyecto solar para comenzar a monitorear la producción, balances y ahorro económico.</span>
            <span class="lang-en">Create your first solar project to start monitoring production, balances, and economic savings.</span>
          </p>
        </div>
      </div>
    `;
  } else {
    cardsHTML = projects.map(p => {
      const role = p._role || (isAdmin ? 'admin' : 'observer');
      const invCount = p._investmentCount || 0;
      return renderProjectCard(p, role, invCount, 'window.__selectProject');
    }).join('');

    if (isAdmin && count < MAX_PROJECTS) {
      cardsHTML += `
        <button type="button" id="tile-new-project" class="new-project-tile" aria-label="Nuevo Proyecto Solar">
          <i class="fa-solid fa-plus"></i>
          <div>
            <span class="lang-es">Agregar Nueva Planta Solar</span>
            <span class="lang-en">Add New Solar Plant</span>
          </div>
          <span style="font-size:.74rem;color:var(--muted);font-weight:400;">(${count}/${MAX_PROJECTS} slots)</span>
        </button>
      `;
    }
  }

  const newProjectBtn = isAdmin && count < MAX_PROJECTS
    ? `
      <button id="btn-new-project" class="btn btn-solar" style="gap:.5rem;">
        <i class="fa-solid fa-plus"></i>
        <span class="lang-es">Nueva Planta</span>
        <span class="lang-en">New Plant</span>
      </button>
    `
    : '';

  return `
    <div id="project-selector-view" class="project-selector">
      <!-- Topbar Header -->
      <header class="topbar">
        <div class="project-selector-header">
          <div class="project-selector-brand">
            <div class="brand-mark">
              <i class="fa-solid fa-solar-panel"></i>
            </div>
            <div>
              <h1>JF Solar Cloud</h1>
              <span class="brand-sub">Enterprise Portfolio v4.0</span>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:.65rem;">
            <!-- Theme toggle -->
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-icon"
              onclick="window.__toggleTheme && window.__toggleTheme()"
              title="${isLight ? 'Modo Oscuro / Dark Mode' : 'Modo Claro / Light Mode'}"
              aria-label="Toggle theme"
            >
              <i class="fa-solid ${isLight ? 'fa-moon text-accent' : 'fa-sun text-warning'}"></i>
            </button>

            <!-- Language quick toggle -->
            <button
              type="button"
              class="lang-btn"
              style="height:2rem;padding:0 .6rem;"
              onclick="window.__changeLang('${isEn ? 'es' : 'en'}', '${isEn ? 'co' : 'us'}', '${isEn ? 'ES' : 'EN'}')"
              title="Cambiar idioma / Switch language"
            >
              <img src="https://flagcdn.com/w20/${flagCode}.png" class="flag-img" alt="flag">
              <span>${langLabel}</span>
            </button>

            <div class="user-chip">
              <div class="avatar-pill">${userInitials}</div>
              <span class="user-chip-email hide-mobile">
                ${_escapeHTML(user.email || '')}
              </span>
            </div>
            <button id="btn-logout-selector" class="btn btn-ghost btn-sm">
              <i class="fa-solid fa-right-from-bracket"></i>
              <span class="lang-es">Salir</span>
              <span class="lang-en">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Body -->
      <main class="project-selector-body">
        <div class="page-hero">
          <div>
            <div class="page-hero-title">
              <h2>
                <span class="lang-es">Portafolio de Plantas Fotovoltaicas</span>
                <span class="lang-en">Solar Power Plants Portfolio</span>
              </h2>
              <span class="count-pill">
                ${count} / ${MAX_PROJECTS}
              </span>
            </div>
            <p>
              <span class="lang-es">Monitoreo multi-proyecto de generación solar, balances de red, valoración financiera (VPN/TIR) y retorno en tiempo real.</span>
              <span class="lang-en">Multi-project monitoring of solar generation, grid balances, financial valuation (NPV/IRR), and real-time ROI.</span>
            </p>
          </div>

          <div style="display:flex;align-items:center;gap:.65rem;flex-wrap:wrap;">
            ${newProjectBtn}
          </div>
        </div>

        <!-- Summary Strip -->
        <div class="summary-strip">
          <div class="card summary-tile">
            <div class="icon-tile solar"><i class="fa-solid fa-solar-panel"></i></div>
            <div>
              <div class="val text-solar">${count} <span class="unit">(${totalPanels} u)</span></div>
              <div class="lbl"><span class="lang-es">Plantas & Paneles</span><span class="lang-en">Plants & Panels</span></div>
            </div>
          </div>

          <div class="card summary-tile">
            <div class="icon-tile accent"><i class="fa-solid fa-bolt"></i></div>
            <div>
              <div class="val text-accent">${fDec(totalCapacity, 1)} <span class="unit">kWp</span></div>
              <div class="lbl"><span class="lang-es">Capacidad Instalada</span><span class="lang-en">Installed Capacity</span></div>
            </div>
          </div>

          <div class="card summary-tile">
            <div class="icon-tile ai"><i class="fa-solid fa-sack-dollar"></i></div>
            <div>
              <div class="val text-strong">${totalPortfolioInvested > 0 ? fCOP(totalPortfolioInvested) : '—'}</div>
              <div class="lbl"><span class="lang-es">Capital en Portafolio</span><span class="lang-en">Portfolio Capital</span></div>
            </div>
          </div>

          <div class="card summary-tile">
            <div class="icon-tile warning"><i class="fa-solid fa-shield-halved"></i></div>
            <div>
              <div class="val text-strong">
                <span class="lang-es">${isAdmin ? 'Administrador' : 'Observador'}</span>
                <span class="lang-en">${isAdmin ? 'Administrator' : 'Observer'}</span>
              </div>
              <div class="lbl"><span class="lang-es">Nivel de Acceso</span><span class="lang-en">Access Level</span></div>
            </div>
          </div>
        </div>

        <!-- Toolbar with search filter -->
        <div class="project-selector-toolbar">
          <div class="search-input-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              id="project-search-input"
              placeholder="${isEn ? 'Search by name, location or inverter...' : 'Buscar por nombre, ubicación o inversor...'}"
              aria-label="Buscar proyectos"
            />
          </div>
        </div>

        <!-- Project Grid -->
        <div id="projects-grid" class="projects-grid">
          ${cardsHTML}
        </div>
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
  _bindCardClicks(onSelectProject);

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

  const newBtn = document.getElementById('btn-new-project');
  if (newBtn && typeof onCreateProject === 'function') {
    newBtn.addEventListener('click', onCreateProject);
  }

  const tileNewBtn = document.getElementById('tile-new-project');
  if (tileNewBtn && typeof onCreateProject === 'function') {
    tileNewBtn.addEventListener('click', onCreateProject);
  }

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
