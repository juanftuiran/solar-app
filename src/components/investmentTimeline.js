/**
 * @module investmentTimeline
 * @description Vertical timeline component for displaying solar investment phases.
 * Shows phase details with formatted currency/numbers and optional admin actions.
 */

import { fCOP, fDec } from '../modules/formatters.js';

/**
 * @typedef {Object} InvestmentPhase
 * @property {string} id - Phase unique identifier
 * @property {string} phase_name - Display name of the phase
 * @property {string} [start_date] - ISO date string (YYYY-MM-DD)
 * @property {number} [investment_cop] - Investment amount in COP
 * @property {number} [capacity_added_kw] - Added capacity in kW
 * @property {number} [panels_added] - Number of panels added
 * @property {string} [description] - Phase description text
 */

/**
 * Render a vertical timeline of investment phases.
 *
 * @param {InvestmentPhase[]} investments - Array of investment phase objects
 * @param {boolean} isAdmin - Whether to show edit/delete action buttons
 * @returns {string} HTML string for the timeline
 */
export function renderTimeline(investments, isAdmin) {
  if (!investments || investments.length === 0) {
    return `
      <div style="text-align:center;padding:2rem;color:#64748b;">
        <i class="fa-solid fa-inbox" style="font-size:2rem;margin-bottom:.75rem;display:block;opacity:.4;"></i>
        <p>
          <span class="lang-es">No hay fases de inversión registradas.</span>
          <span class="lang-en">No investment phases recorded.</span>
        </p>
      </div>
    `;
  }

  // Calculate totals
  const totals = investments.reduce((acc, inv) => {
    acc.investment += (inv.investment_cop || 0);
    acc.capacity += (inv.capacity_added_kw || 0);
    acc.panels += (inv.panels_added || 0);
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
        <div style="display:flex;gap:.5rem;margin-top:.75rem;">
          <button
            class="btn btn-ghost timeline-edit-btn"
            data-phase-id="${inv.id}"
            style="font-size:.75rem;padding:.3rem .6rem;"
          >
            <i class="fa-solid fa-pen" style="font-size:.65rem;"></i>
            <span class="lang-es">Editar</span>
            <span class="lang-en">Edit</span>
          </button>
          <button
            class="btn btn-danger-outline timeline-delete-btn"
            data-phase-id="${inv.id}"
            style="font-size:.75rem;padding:.3rem .6rem;"
          >
            <i class="fa-solid fa-trash" style="font-size:.65rem;"></i>
            <span class="lang-es">Eliminar</span>
            <span class="lang-en">Delete</span>
          </button>
        </div>
      `
      : '';

    return `
      <div class="timeline-item" style="display:flex;gap:1rem;position:relative;">
        <!-- Timeline dot + connector -->
        <div style="display:flex;flex-direction:column;align-items:center;min-width:1.5rem;">
          <div style="
            width:14px;height:14px;border-radius:50%;
            background:#10b981;border:3px solid rgba(16,185,129,.3);
            flex-shrink:0;z-index:1;
          "></div>
          ${index < investments.length - 1 ? `
            <div style="width:2px;flex:1;background:rgba(16,185,129,.25);"></div>
          ` : ''}
        </div>

        <!-- Phase card -->
        <div
          class="card"
          style="flex:1;padding:1rem;margin-bottom:1rem;border-left:3px solid #10b981;"
        >
          <!-- Phase name + date -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;">
            <h4 style="font-size:.9rem;font-weight:700;color:#e2e8f0;">
              ${_escapeHTML(inv.phase_name)}
            </h4>
            <span style="font-size:.7rem;color:#64748b;">
              <i class="fa-solid fa-calendar" style="margin-right:.25rem;"></i>${date}
            </span>
          </div>

          <!-- Description -->
          ${inv.description ? `
            <p style="font-size:.8rem;color:#94a3b8;margin-top:.5rem;line-height:1.4;">
              ${_escapeHTML(inv.description)}
            </p>
          ` : ''}

          <!-- Stats -->
          <div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:.75rem;">
            <div>
              <p style="font-size:.6rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">
                <span class="lang-es">Inversión</span>
                <span class="lang-en">Investment</span>
              </p>
              <p style="font-size:.85rem;font-weight:700;color:#0ea5e9;">
                ${fCOP(inv.investment_cop)}
              </p>
            </div>
            <div>
              <p style="font-size:.6rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">
                <span class="lang-es">Capacidad</span>
                <span class="lang-en">Capacity</span>
              </p>
              <p style="font-size:.85rem;font-weight:700;color:#10b981;">
                ${fDec(inv.capacity_added_kw, 1)} kW
              </p>
            </div>
            <div>
              <p style="font-size:.6rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">
                <span class="lang-es">Paneles</span>
                <span class="lang-en">Panels</span>
              </p>
              <p style="font-size:.85rem;font-weight:700;color:#e2e8f0;">
                ${fDec(inv.panels_added, 0)}
              </p>
            </div>
          </div>

          ${adminActions}
        </div>
      </div>
    `;
  }).join('');

  // Totals summary
  const totalsHTML = `
    <div
      class="card"
      style="
        padding:1rem;margin-top:.5rem;
        background:rgba(16,185,129,.08);
        border:1px solid rgba(16,185,129,.2);
      "
    >
      <h4 style="font-size:.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem;">
        <i class="fa-solid fa-calculator" style="margin-right:.4rem;"></i>
        <span class="lang-es">Totales</span>
        <span class="lang-en">Totals</span>
      </h4>
      <div style="display:flex;flex-wrap:wrap;gap:1.5rem;">
        <div>
          <p style="font-size:.6rem;color:#64748b;text-transform:uppercase;">
            <span class="lang-es">Inversión Total</span>
            <span class="lang-en">Total Investment</span>
          </p>
          <p style="font-size:1rem;font-weight:900;color:#0ea5e9;">${fCOP(totals.investment)}</p>
        </div>
        <div>
          <p style="font-size:.6rem;color:#64748b;text-transform:uppercase;">
            <span class="lang-es">Capacidad Total</span>
            <span class="lang-en">Total Capacity</span>
          </p>
          <p style="font-size:1rem;font-weight:900;color:#10b981;">${fDec(totals.capacity, 1)} kW</p>
        </div>
        <div>
          <p style="font-size:.6rem;color:#64748b;text-transform:uppercase;">
            <span class="lang-es">Paneles Total</span>
            <span class="lang-en">Total Panels</span>
          </p>
          <p style="font-size:1rem;font-weight:900;color:#e2e8f0;">${fDec(totals.panels, 0)}</p>
        </div>
      </div>
    </div>
  `;

  return `
    <div class="investment-timeline" style="position:relative;padding-left:.25rem;">
      ${phasesHTML}
      ${totalsHTML}
    </div>
  `;
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
