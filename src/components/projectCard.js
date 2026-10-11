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
  const panelsStr = project.panel_count ? `${project.panel_count} u` : '—';
  const inverterBadge = project.inverter_model
    ? `<span class="meta-chip warning" title="Inversor"><i class="fa-solid fa-microchip"></i> ${_escapeHTML(project.inverter_model)}</span>`
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
          <div class="project-card-id">
            <div class="icon-tile ${isAdmin ? 'accent' : 'solar'}" style="width:2.25rem;height:2.25rem;font-size:.9rem;border-radius:.6rem;">
              <i class="fa-solid fa-solar-panel"></i>
            </div>
            <div style="min-width:0;">
              <div style="display:flex;align-items:center;gap:.4rem;">
                <span class="online-dot" style="width:6px;height:6px;"></span>
                <h3 class="project-card-name" title="${_escapeHTML(project.name)}">
                  ${_escapeHTML(project.name)}
                </h3>
              </div>
              <div class="project-card-location">
                <i class="fa-solid fa-location-dot" style="font-size:.7rem;"></i>
                <span>${project.location ? _escapeHTML(project.location) : '<em style="opacity:.6">Sin ubicación</em>'}</span>
              </div>
            </div>
          </div>

          <span class="role-badge ${role}">
            <span class="lang-es">${roleLabelEs}</span>
            <span class="lang-en">${roleLabelEn}</span>
          </span>
        </div>

        ${inverterBadge ? `<div style="margin-top:.75rem;">${inverterBadge}</div>` : ''}

        <!-- Stats Grid -->
        <div class="project-card-stats" style="margin-top:.85rem;">
          <div>
            <span class="project-card-stat-lbl">
              <span class="lang-es">Potencia</span><span class="lang-en">Peak Power</span>
            </span>
            <span class="project-card-stat-val text-solar">
              ${capacityStr}
            </span>
          </div>

          <div>
            <span class="project-card-stat-lbl">
              <span class="lang-es">Paneles</span><span class="lang-en">Panels</span>
            </span>
            <span class="project-card-stat-val text-accent">
              ${panelsStr}
            </span>
          </div>

          <div>
            <span class="project-card-stat-lbl">
              <span class="lang-es">Fases</span><span class="lang-en">Phases</span>
            </span>
            <span class="project-card-stat-val text-strong">
              ${investmentCount || 0}
            </span>
          </div>
        </div>
      </div>

      <!-- Footer CTA -->
      <div class="project-card-footer">
        <span>
          <span class="lang-es">Telemetría & balance</span>
          <span class="lang-en">Telemetry & balance</span>
        </span>
        <span class="project-card-enter">
          <span class="lang-es">Abrir Planta</span>
          <span class="lang-en">Open Plant</span>
          <i class="fa-solid fa-arrow-right"></i>
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
