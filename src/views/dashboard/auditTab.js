/**
 * @module dashboard/auditTab
 * @description Cloud billing & readings audit log table with expandable IEC 61724 breakdown.
 */

import { state } from "../../modules/state.js";
import { fCOP, fDec } from "../../modules/formatters.js";

export function renderDataTable(isAdmin) { return _renderDataTable(isAdmin); }

export function renderTableRows(data, isAdmin = false, baseRecord = null) {
  if ((!data || data.length === 0) && !baseRecord) {
    return `
      <tr>
        <td colspan="${isAdmin ? 8 : 7}" style="text-align:center;padding:3rem 1.5rem;color:var(--muted-light);">
          <div class="empty-state" style="padding:1.5rem 0;">
            <i class="fa-solid fa-inbox" style="margin-bottom:.5rem;"></i>
            <h3><span class="lang-es">No hay registros</span><span class="lang-en">No readings found</span></h3>
            <p><span class="lang-es">No encontramos lecturas para este período o búsqueda.</span><span class="lang-en">No records match the current filter or search query.</span></p>
          </div>
        </td>
      </tr>
    `;
  }

  let baseRowHTML = '';
  if (baseRecord) {
    const baseAdminCol = isAdmin
      ? `
        <td style="text-align:center;">
          <div class="cell-actions">
            <button class="edit-btn btn btn-ghost btn-xs btn-icon" data-id="${baseRecord.id}" title="Editar lectura base">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="del-btn btn btn-danger-outline btn-xs btn-icon" data-id="${baseRecord.id}" data-fecha="${baseRecord.fecha}" title="Eliminar lectura base">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `
      : '';

    baseRowHTML = `
      <tr class="data-row base-record-row" data-row-id="${baseRecord.id}">
        <td>
          <div class="cell-period">
            <div class="row-chevron" style="color:var(--accent);border-color:var(--border-focus);"><i class="fa-solid fa-flag"></i></div>
            <div>
              <div class="cell-primary text-accent">${baseRecord.label}</div>
              <div class="cell-sub">${baseRecord.fecha}</div>
              <div class="badges-inline">
                <span class="badge-base-record">
                  <i class="fa-solid fa-compass-drafting"></i>
                  <span class="lang-es">Lectura Inicial Base (t₀)</span>
                  <span class="lang-en">Initial Base Reading (t₀)</span>
                </span>
              </div>
            </div>
          </div>
        </td>
        <td style="text-align:center;color:var(--muted-light);font-size:.8rem;">
          <span style="color:var(--text);font-weight:700;">${(baseRecord.lecturaRed || 0).toFixed(0)}</span>
          <span style="opacity:.3;margin:0 .25rem;">/</span>
          <span style="color:var(--solar);font-weight:700;">${(baseRecord.lecturaSolar || 0).toFixed(0)}</span>
          <div class="cell-sub">Red / Solar (t₀)</div>
        </td>
        <td colspan="3" style="text-align:center;color:var(--muted-light);font-size:.78rem;">
          <span class="lang-es">Punto de referencia inicial para el cálculo de deltas mensuales</span>
          <span class="lang-en">Baseline reference point for monthly delta calculations</span>
        </td>
        <td class="text-right">
          <div class="cell-primary">${fCOP(baseRecord.precioKw || 0)}</div>
          <div class="cell-sub"><span class="lang-es">Tarifa base</span><span class="lang-en">Base tariff</span></div>
        </td>
        <td class="text-right" style="color:var(--muted-light);font-size:.78rem;">—</td>
        ${baseAdminCol}
      </tr>
    `;
  }

  const rowsHTML = (data || []).map(row => {
    const inc = parseFloat(row.incPrecio) || 0;
    const trendIcon = inc > 0
      ? 'fa-arrow-trend-up'
      : inc < 0 ? 'fa-arrow-trend-down' : 'fa-minus';
    const trendClass = inc > 0 ? 'down' : inc < 0 ? 'up' : '';

    const adminCol = isAdmin
      ? `
        <td style="text-align:center;">
          <div class="cell-actions">
            <button class="edit-btn btn btn-ghost btn-xs btn-icon" data-id="${row.id}" title="Editar">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="del-btn btn btn-danger-outline btn-xs btn-icon" data-id="${row.id}" data-fecha="${row.fecha}" title="Eliminar">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `
      : '';

    const resetBadges = [];
    if (row.inverter_reset) {
      resetBadges.push(`<span class="badge-reset"><i class="fa-solid fa-rotate"></i> Inversor</span>`);
    }
    if (row.meter_reset) {
      resetBadges.push(`<span class="badge-reset grid"><i class="fa-solid fa-rotate"></i> Red</span>`);
    }

    const yieldStr = (row.specificYield && row.specificYield > 0)
      ? `${fDec(row.specificYield, 1)} <span class="unit">kWh/kWp</span>`
      : '—';

    const hspPill = (row.hsp && row.hsp > 0)
      ? `<span class="health-pill ${row.healthScore || 'optimo'}" style="font-size:.65rem;padding:.12rem .45rem;margin-top:.2rem;">${fDec(row.hsp, 2)} HSP</span>`
      : '';

    return `
      <tr class="data-row" data-row-id="${row.id}" data-detail-id="det-${row.id}">
        <td>
          <div class="cell-period">
            <div class="row-chevron"><i class="fa-solid fa-chevron-right"></i></div>
            <div>
              <div class="cell-primary text-accent">${row.label}</div>
              <div class="cell-sub">${row.fecha} <span style="opacity:.65;">(${row.daysInPeriod || 30}d)</span></div>
              ${resetBadges.length > 0 ? `<div class="badges-inline">${resetBadges.join('')}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="text-align:center;color:var(--muted-light);font-size:.8rem;">
          <span style="color:var(--text);font-weight:600;">${(row.lecturaRed || 0).toFixed(0)}</span>
          <span style="opacity:.3;margin:0 .25rem;">/</span>
          <span style="color:var(--solar);font-weight:600;">${(row.lecturaSolar || 0).toFixed(0)}</span>
          <div class="cell-sub">Red / Solar</div>
        </td>
        <td style="text-align:center;">
          <div class="cell-primary">${fDec(row.consumoRed, 1)} <span class="unit">kWh</span></div>
          <div class="cell-sub">${fDec(row.consumoDiario || 0, 1)} kWh/d</div>
        </td>
        <td style="text-align:center;">
          <div class="cell-primary text-solar">${fDec(row.prodBruta, 1)} <span class="unit">kWh</span></div>
          <div class="cell-sub">${fDec(row.prodDiaria || 0, 1)} kWh/d</div>
        </td>
        <td style="text-align:center;">
          <div class="cell-primary text-accent">${yieldStr}</div>
          ${hspPill}
        </td>
        <td class="text-right">
          <div class="cell-primary">${fCOP(row.precioKw || 0)}</div>
          <div style="margin-top:.15rem;">
            <span class="delta ${trendClass}">
              <i class="fa-solid ${trendIcon}"></i> ${Math.abs(inc).toFixed(1)}%
            </span>
          </div>
        </td>
        <td class="text-right">
          <div class="cell-primary text-solar font-black">${fCOP(row.ahorroReal)}</div>
          <div class="cell-sub text-solar">${fDec(row.autonomia, 0)}% solar</div>
        </td>
        ${adminCol}
      </tr>

      <!-- Expandable detail row -->
      <tr id="det-${row.id}" class="hidden detail-row">
        <td colspan="${isAdmin ? 8 : 7}">
          <div class="detail-inner">
            <div class="detail-section">
              <span class="detail-section-title">
                <span class="lang-es">Eficiencia Fotovoltaica (IEC 61724)</span>
                <span class="lang-en">PV Efficiency (IEC 61724)</span>
              </span>
              <div class="kv"><span>Consumo Total:</span><strong>${fDec(row.consumoTotal, 1)} kWh</strong></div>
              <div class="kv"><span>Autonomía Solar:</span><strong class="text-ai">${fDec(row.autonomia, 1)}%</strong></div>
              <div class="kv"><span>Rendimiento Y<sub>f</sub>:</span><strong class="text-accent">${fDec(row.specificYield || 0, 1)} kWh/kWp</strong></div>
              <div class="kv"><span>Performance Ratio:</span><strong class="text-solar">${fDec(row.pr || 0, 1)}%</strong></div>
            </div>
            <div class="detail-section">
              <span class="detail-section-title">
                <span class="lang-es">Desglose Diario (${row.daysInPeriod || 30} días)</span>
                <span class="lang-en">Daily Breakdown (${row.daysInPeriod || 30} days)</span>
              </span>
              <div class="kv"><span>Red eléctrica:</span><strong>${fDec(row.consumoDiario || 0, 1)} kWh/d</strong></div>
              <div class="kv"><span>Generación solar:</span><strong class="text-solar">${fDec(row.prodDiaria || 0, 1)} kWh/d</strong></div>
              <div class="kv"><span>Horas Sol Pico:</span><strong class="text-warning">${fDec(row.hsp || 0, 2)} HSP</strong></div>
            </div>
            <div class="detail-section">
              <span class="detail-section-title">
                <span class="lang-es">Impacto Económico & Ecológico</span>
                <span class="lang-en">Economic & Eco Impact</span>
              </span>
              <div class="kv"><span>Tarifa Anterior:</span><strong>${fCOP(row.prevPrice || 0)}</strong></div>
              <div class="kv"><span>Ahorro Generado:</span><strong class="text-solar">${fCOP(row.ahorroReal)}</strong></div>
              <div class="kv"><span>CO₂ Mitigado:</span><strong class="text-solar">${fDec((row.prodBruta || 0) * 0.38, 1)} kg</strong></div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return baseRowHTML + rowsHTML;
}

function _renderDataTable(isAdmin) {
  const adminTh = isAdmin
    ? `<th style="text-align:center;"><span class="lang-es">Acciones</span><span class="lang-en">Actions</span></th>`
    : '';

  return `
    <div class="card table-wrap">
      <div class="table-header">
        <h3>
          <i class="fa-solid fa-cloud text-accent"></i>
          <span class="lang-es">Registro Histórico Cloud</span>
          <span class="lang-en">Cloud Historical Readings</span>
        </h3>

        <!-- Table toolbar with search + CSV Importer -->
        <div class="table-toolbar">
          <div class="search-input-wrap sm">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              id="table-search-input"
              placeholder="Buscar período o fecha..."
              aria-label="Buscar lecturas"
            />
          </div>
          ${isAdmin ? `
            <button id="btn-import-csv" type="button" class="btn btn-ghost btn-sm">
              <i class="fa-solid fa-file-arrow-up text-solar"></i>
              <span class="lang-es">Importar CSV</span>
              <span class="lang-en">Import CSV</span>
            </button>
          ` : ''}
        </div>
      </div>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th><span class="lang-es">Período / Fecha</span><span class="lang-en">Period / Date</span></th>
              <th style="text-align:center;"><span class="lang-es">Lecturas Red / Solar</span><span class="lang-en">Readings Grid / Solar</span></th>
              <th style="text-align:center;"><span class="lang-es">Consumo Red</span><span class="lang-en">Grid Usage</span></th>
              <th style="text-align:center;"><span class="lang-es">Gen. Solar</span><span class="lang-en">Solar Gen</span></th>
              <th style="text-align:center;"><span class="lang-es">Rendimiento (Y<sub>f</sub>)</span><span class="lang-en">Yield (Y<sub>f</sub>)</span></th>
              <th class="text-right"><span class="lang-es">Tarifa kW</span><span class="lang-en">kW Tariff</span></th>
              <th class="text-right"><span class="lang-es">Ahorro</span><span class="lang-en">Savings</span></th>
              ${adminTh}
            </tr>
          </thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    </div>
  `;
}

