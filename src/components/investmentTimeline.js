/**
 * @module investmentTimeline
 * @description Modern vertical timeline component for solar investment phases.
 */

import { fCOP, fDec } from '../modules/formatters.js';

/**
 * Render a vertical timeline of investment phases.
 *
 * @param {Array<Object>} investments - Array of investment phase objects
 * @param {boolean} isAdmin - Whether to show edit/delete action buttons
 * @returns {string} HTML string for the timeline
 */
export function renderTimeline(investments, isAdmin) {
  if (!investments || investments.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon text-solar"><i class="fa-solid fa-layer-group"></i></div>
        <h3>
          <span class="lang-es">No hay fases de inversión registradas</span>
          <span class="lang-en">No investment phases recorded</span>
        </h3>
        <p>
          <span class="lang-es">Agrega la primera fase para calcular el retorno de inversión automáticamente.</span>
          <span class="lang-en">Add your first phase to calculate ROI automatically.</span>
        </p>
      </div>
    `;
  }

  // Calculate totals
  const totals = investments.reduce((acc, inv) => {
    acc.investment += (parseFloat(inv.investment_cop) || 0);
    acc.capacity += (parseFloat(inv.capacity_added_kw) || 0);
    acc.panels += (parseInt(inv.panels_added) || 0);
    return acc;
  }, { investment: 0, capacity: 0, panels: 0 });

  // Render individual phase items
  const phasesHTML = investments.map((inv, index) => {
    const date = inv.start_date
      ? new Date(inv.start_date + 'T00:00:00').toLocaleDateString('es-CO', {
          year: 'numeric', month: 'short', day: 'numeric'
        })
      : '—';

    const adminActions = isAdmin
      ? `
        <div class="timeline-actions">
          <button
            class="btn btn-ghost btn-xs timeline-edit-btn"
            data-phase-id="${inv.id}"
            type="button"
          >
            <i class="fa-solid fa-pen"></i>
            <span class="lang-es">Editar</span>
            <span class="lang-en">Edit</span>
          </button>
          <button
            class="btn btn-danger-outline btn-xs timeline-delete-btn"
            data-phase-id="${inv.id}"
            type="button"
          >
            <i class="fa-solid fa-trash"></i>
            <span class="lang-es">Eliminar</span>
            <span class="lang-en">Delete</span>
          </button>
        </div>
      `
      : '';

    return `
      <div class="timeline-item">
        <!-- Timeline Rail -->
        <div class="timeline-rail">
          <div class="timeline-dot"></div>
          ${index < investments.length - 1 ? `<div class="timeline-line"></div>` : ''}
        </div>

        <!-- Phase card -->
        <div class="card timeline-card">
          <div class="timeline-card-head">
            <div>
              <span class="timeline-phase-tag">
                <span class="lang-es">Fase ${index + 1}</span>
                <span class="lang-en">Phase ${index + 1}</span>
              </span>
              <h4>
                ${_escapeHTML(inv.phase_name)}
              </h4>
            </div>
            <span class="meta-chip">
              <i class="fa-solid fa-calendar-day text-accent"></i> ${date}
            </span>
          </div>

          ${inv.description ? `
            <p class="timeline-desc">
              ${_escapeHTML(inv.description)}
            </p>
          ` : ''}

          <!-- Stats breakdown -->
          <div class="timeline-stats">
            <div class="inset" style="padding:.65rem .8rem;">
              <span class="stat-tile-lbl">
                <span class="lang-es">Inversión</span><span class="lang-en">Investment</span>
              </span>
              <span class="stat-tile-val text-accent">
                ${fCOP(inv.investment_cop)}
              </span>
            </div>
            <div class="inset" style="padding:.65rem .8rem;">
              <span class="stat-tile-lbl">
                <span class="lang-es">Capacidad</span><span class="lang-en">Capacity</span>
              </span>
              <span class="stat-tile-val text-solar">
                +${fDec(inv.capacity_added_kw, 1)} kWp
              </span>
            </div>
            <div class="inset" style="padding:.65rem .8rem;">
              <span class="stat-tile-lbl">
                <span class="lang-es">Paneles</span><span class="lang-en">Panels</span>
              </span>
              <span class="stat-tile-val text-strong">
                +${fDec(inv.panels_added, 0)} u
              </span>
            </div>
          </div>

          ${adminActions}
        </div>
      </div>
    `;
  }).join('');

  // Totals summary bar
  const totalsHTML = `
    <div class="timeline-totals">
      <h4>
        <i class="fa-solid fa-calculator text-solar"></i>
        <span class="lang-es">Resumen Total de Capital Invertido</span>
        <span class="lang-en">Total Invested Capital Summary</span>
      </h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:.85rem;">
        <div>
          <span class="stat-tile-lbl">
            <span class="lang-es">Inversión Acumulada</span>
            <span class="lang-en">Total Invested</span>
          </span>
          <span class="stat-tile-val text-accent" style="font-size:1.25rem;">${fCOP(totals.investment)}</span>
        </div>
        <div>
          <span class="stat-tile-lbl">
            <span class="lang-es">Potencia Total Añadida</span>
            <span class="lang-en">Total Capacity Added</span>
          </span>
          <span class="stat-tile-val text-solar" style="font-size:1.25rem;">${fDec(totals.capacity, 1)} kWp</span>
        </div>
        <div>
          <span class="stat-tile-lbl">
            <span class="lang-es">Total Paneles Fases</span>
            <span class="lang-en">Total Panels in Phases</span>
          </span>
          <span class="stat-tile-val text-strong" style="font-size:1.25rem;">${fDec(totals.panels, 0)} u</span>
        </div>
      </div>
    </div>
  `;

  return `
    <div class="investment-timeline">
      ${phasesHTML}
      ${totalsHTML}
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
