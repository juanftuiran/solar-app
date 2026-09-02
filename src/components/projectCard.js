/**
 * @module projectCard
 * @description Modern enterprise project card component for JF Solar Cloud.
 */

/**
 * Render a project card HTML string.
 *
 * @param {Object} project - Project data object
 * @param {string} role - User's role for this project: 'admin' | 'observer'
 * @param {number} investmentCount - Number of investment phases
 * @param {string} onSelect - Name of the global callback registered on `window`
 * @returns {string} HTML string for the project card
 */
export function renderProjectCard(project, role, investmentCount, onSelect) {
  const isAdmin = role === 'admin';
  const roleLabelEs = isAdmin ? 'Administrador' : 'Observador';
  const roleLabelEn = isAdmin ? 'Administrator' : 'Observer';

  const capacityVal = project.capacity_kw ? parseFloat(project.capacity_kw) : 0;
  const capacityStr = capacityVal > 0 ? `${capacityVal.toFixed(1)} kWp` : '—';
  const panelsStr = project.panel_count ? `${project.panel_count}` : '—';
  const inverterBadge = project.inverter_model
    ? `<span class="badge-solar-metric" style="font-size:.65rem;margin-top:.35rem;display:inline-flex;" title="Inversor"><i class="fa-solid fa-microchip"></i> ${_escapeHTML(project.inverter_model)}</span>`
    : '';

  return `
    <div
      class="card card-interactive project-card role-${role}"
      data-project-id="${project.id}"
      tabindex="0"
      role="button"
      aria-label="${_escapeHTML(project.name)}"
    >
      <div>
        <!-- Card Header -->
        <div class="project-card-header">
          <div style="display:flex;align-items:center;gap:.5rem;min-width:0;">
            <span class="online-dot" style="flex-shrink:0;"></span>
            <h3 class="project-card-name" title="${_escapeHTML(project.name)}">
              ${_escapeHTML(project.name)}
            </h3>
          </div>
          <span class="role-badge ${role}">
            <span class="lang-es">${roleLabelEs}</span>
            <span class="lang-en">${roleLabelEn}</span>
          </span>
        </div>

        <!-- Location & Inverter Specs -->
        <div class="project-card-location" style="display:flex;flex-direction:column;gap:.25rem;align-items:flex-start;">
          <div style="display:flex;align-items:center;gap:.4rem;">
            <i class="fa-solid fa-location-dot" style="color:var(--muted-light);font-size:.75rem;"></i>
            <span>${project.location ? _escapeHTML(project.location) : '<em style="opacity:.6">Sin ubicación</em>'}</span>
          </div>
          ${inverterBadge}
        </div>

        <!-- Stats Grid -->
        <div class="project-card-stats">
          <div>
            <span class="project-card-stat-lbl">
              <span class="lang-es">Potencia Pico</span><span class="lang-en">Peak Power</span>
            </span>
            <span class="project-card-stat-val text-solar">
              <i class="fa-solid fa-bolt" style="font-size:.75rem;"></i> ${capacityStr}
            </span>
          </div>

          <div>
            <span class="project-card-stat-lbl">
              <span class="lang-es">Paneles / Fases</span><span class="lang-en">Panels / Phases</span>
            </span>
            <span class="project-card-stat-val text-accent">
              <i class="fa-solid fa-solar-panel" style="font-size:.75rem;"></i> ${panelsStr} <span style="opacity:.4;font-weight:400">/</span> ${investmentCount}
            </span>
          </div>
        </div>
      </div>

      <!-- Footer CTA -->
      <div class="project-card-footer">
        <span style="font-size:.75rem;color:var(--muted-light);">
          <span class="lang-es">Acceder al panel</span>
          <span class="lang-en">Open dashboard</span>
        </span>
        <span class="project-card-enter">
          <span class="lang-es">Entrar</span>
          <span class="lang-en">Enter</span>
          <i class="fa-solid fa-arrow-right" style="font-size:.75rem;"></i>
        </span>
      </div>
    </div>
  `;
}

function _escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
