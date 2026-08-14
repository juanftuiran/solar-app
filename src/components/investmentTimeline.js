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
      <div style="text-align:center;padding:3rem 1.5rem;color:var(--muted-light);">
        <i class="fa-solid fa-layer-group" style="font-size:2.5rem;margin-bottom:1rem;display:block;opacity:.3;color:var(--solar);"></i>
        <p style="font-size:.9rem;font-weight:600;color:#fff;">
          <span class="lang-es">No hay fases de inversión registradas.</span>
          <span class="lang-en">No investment phases recorded.</span>
        </p>
        <p style="font-size:.8rem;color:var(--muted-light);margin-top:.25rem;">
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
        <div style="display:flex;gap:.5rem;margin-top:.875rem;padding-top:.75rem;border-top:1px solid var(--border);">
          <button
            class="btn btn-ghost btn-sm timeline-edit-btn"
            data-phase-id="${inv.id}"
            type="button"
          >
            <i class="fa-solid fa-pen" style="font-size:.7rem;"></i>
            <span class="lang-es">Editar</span>
            <span class="lang-en">Edit</span>
          </button>
          <button
            class="btn btn-danger-outline btn-sm timeline-delete-btn"
            data-phase-id="${inv.id}"
            type="button"
          >
            <i class="fa-solid fa-trash" style="font-size:.7rem;"></i>
            <span class="lang-es">Eliminar</span>
            <span class="lang-en">Delete</span>
          </button>
        </div>
      `
      : '';

    return `
      <div class="timeline-item">
        <!-- Timeline Connector -->
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="timeline-dot"></div>
          ${index < investments.length - 1 ? `<div class="timeline-line"></div>` : ''}
        </div>

        <!-- Phase card -->
        <div class="card timeline-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem;">
            <div>
              <span style="font-size:.65rem;font-weight:800;color:var(--solar);text-transform:uppercase;letter-spacing:.06em;">
                <span class="lang-es">Fase ${index + 1}</span>
                <span class="lang-en">Phase ${index + 1}</span>
              </span>
              <h4 style="font-size:.95rem;font-weight:800;color:#fff;margin-top:.1rem;">
                ${_escapeHTML(inv.phase_name)}
              </h4>
            </div>
            <span style="font-size:.75rem;color:var(--muted-light);background:rgba(255,255,255,0.04);padding:.25rem .6rem;border-radius:var(--radius-xs);border:1px solid var(--border);">
              <i class="fa-solid fa-calendar-day" style="margin-right:.3rem;color:var(--accent);"></i>${date}
            </span>
          </div>

          ${inv.description ? `
            <p style="font-size:.8rem;color:var(--text-secondary);line-height:1.45;margin-bottom:.75rem;">
              ${_escapeHTML(inv.description)}
            </p>
          ` : ''}

          <!-- Stats breakdown -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:.75rem;background:rgba(13,21,39,0.5);padding:.75rem;border-radius:var(--radius-xs);border:1px solid var(--border);">
            <div>
              <p style="font-size:.65rem;color:var(--muted-light);text-transform:uppercase;letter-spacing:.04em;">
                <span class="lang-es">Inversión</span><span class="lang-en">Investment</span>
              </p>
              <p style="font-size:.9rem;font-weight:800;color:var(--accent);" class="tabular-nums">
                ${fCOP(inv.investment_cop)}
              </p>
            </div>
            <div>
              <p style="font-size:.65rem;color:var(--muted-light);text-transform:uppercase;letter-spacing:.04em;">
                <span class="lang-es">Capacidad</span><span class="lang-en">Capacity</span>
              </p>
              <p style="font-size:.9rem;font-weight:800;color:var(--solar);" class="tabular-nums">
                +${fDec(inv.capacity_added_kw, 1)} kW
              </p>
            </div>
            <div>
              <p style="font-size:.65rem;color:var(--muted-light);text-transform:uppercase;letter-spacing:.04em;">
                <span class="lang-es">Paneles</span><span class="lang-en">Panels</span>
              </p>
              <p style="font-size:.9rem;font-weight:800;color:#fff;" class="tabular-nums">
                +${fDec(inv.panels_added, 0)} u
              </p>
            </div>
          </div>

          ${adminActions}
        </div>
      </div>
    `;
  }).join('');

  // Totals summary bar
  const totalsHTML = `
    <div
      class="card"
      style="
        padding:1.25rem;margin-top:.75rem;
        background:linear-gradient(135deg, rgba(16,185,129,.1), rgba(14,165,233,.06));
        border:1px solid rgba(16,185,129,.3);
      "
    >
      <div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.875rem;">
        <i class="fa-solid fa-calculator" style="color:var(--solar);"></i>
        <h4 style="font-size:.75rem;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.06em;">
          <span class="lang-es">Resumen Total de Inversión</span>
          <span class="lang-en">Total Investment Summary</span>
        </h4>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:1rem;">
        <div>
          <p style="font-size:.65rem;color:var(--muted-light);text-transform:uppercase;">
            <span class="lang-es">Inversión Acumulada</span>
            <span class="lang-en">Total Invested</span>
          </p>
          <p style="font-size:1.15rem;font-weight:900;color:var(--accent);" class="tabular-nums">${fCOP(totals.investment)}</p>
        </div>
        <div>
          <p style="font-size:.65rem;color:var(--muted-light);text-transform:uppercase;">
            <span class="lang-es">Potencia Total</span>
            <span class="lang-en">Total Capacity</span>
          </p>
          <p style="font-size:1.15rem;font-weight:900;color:var(--solar);" class="tabular-nums">${fDec(totals.capacity, 1)} kW</p>
        </div>
        <div>
          <p style="font-size:.65rem;color:var(--muted-light);text-transform:uppercase;">
            <span class="lang-es">Total Paneles</span>
            <span class="lang-en">Total Panels</span>
          </p>
          <p style="font-size:1.15rem;font-weight:900;color:#fff;" class="tabular-nums">${fDec(totals.panels, 0)}</p>
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
