/**
 * @module projectCard
 * @description Project card component for the JF Solar Cloud project selector.
 * Renders a glass-style card displaying project metadata with role-based styling.
 */

/**
 * Render a project card HTML string.
 *
 * @param {Object} project - Project data object
 * @param {string} project.id - Unique project identifier
 * @param {string} project.name - Display name
 * @param {string} [project.location] - Geographic location
 * @param {number} [project.capacity_kw] - Installed capacity in kW
 * @param {string} [project.slug] - URL-friendly slug
 * @param {string} role - User's role for this project: 'admin' | 'observer'
 * @param {number} investmentCount - Number of investment phases
 * @param {string} onSelect - Name of the global callback registered on `window`, called with project.id
 * @returns {string} HTML string for the project card
 */
export function renderProjectCard(project, role, investmentCount, onSelect) {
  const borderColor = role === 'admin' ? '#0ea5e9' : '#10b981';
  const roleLabelEs = role === 'admin' ? 'Administrador' : 'Observador';
  const roleLabelEn = role === 'admin' ? 'Administrator' : 'Observer';
  const roleBg = role === 'admin' ? 'rgba(14,165,233,.15)' : 'rgba(16,185,129,.15)';
  const roleColor = role === 'admin' ? '#0ea5e9' : '#10b981';

  const capacity = project.capacity_kw
    ? `${parseFloat(project.capacity_kw).toFixed(1)} kW`
    : '—';

  return `
    <div
      class="card project-card"
      data-project-id="${project.id}"
      style="
        border-left:4px solid ${borderColor};
        padding:1.25rem;
        cursor:pointer;
        transition:transform .2s,box-shadow .2s;
      "
      onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.3)';"
      onmouseleave="this.style.transform='';this.style.boxShadow='';"
    >
      <!-- Header: name + role badge -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.75rem;">
        <h3 style="font-size:1rem;font-weight:700;color:#e2e8f0;line-height:1.3;">
          ${_escapeHTML(project.name)}
        </h3>
        <span style="
          font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
          padding:.2rem .5rem;border-radius:.25rem;white-space:nowrap;
          background:${roleBg};color:${roleColor};
        ">
          <span class="lang-es">${roleLabelEs}</span>
          <span class="lang-en">${roleLabelEn}</span>
        </span>
      </div>

      <!-- Location -->
      ${project.location ? `
        <div style="display:flex;align-items:center;gap:.4rem;font-size:.8rem;color:#94a3b8;margin-bottom:.5rem;">
          <i class="fa-solid fa-location-dot" style="font-size:.7rem;"></i>
          <span>${_escapeHTML(project.location)}</span>
        </div>
      ` : ''}

      <!-- Stats row -->
      <div style="display:flex;gap:1rem;margin-top:.75rem;">
        <!-- Capacity -->
        <div style="flex:1;">
          <p style="font-size:.625rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">
            <span class="lang-es">Capacidad</span>
            <span class="lang-en">Capacity</span>
          </p>
          <p style="font-size:.9rem;font-weight:700;color:#10b981;">
            <i class="fa-solid fa-solar-panel" style="font-size:.7rem;margin-right:.25rem;"></i>${capacity}
          </p>
        </div>

        <!-- Investment phases -->
        <div style="flex:1;">
          <p style="font-size:.625rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">
            <span class="lang-es">Fases</span>
            <span class="lang-en">Phases</span>
          </p>
          <p style="font-size:.9rem;font-weight:700;color:#0ea5e9;">
            <i class="fa-solid fa-layer-group" style="font-size:.7rem;margin-right:.25rem;"></i>${investmentCount}
          </p>
        </div>
      </div>
    </div>
  `;
}

/* ── Private helpers ──────────────────────────────────────────────────────── */

/**
 * Escape HTML special characters to prevent XSS.
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
