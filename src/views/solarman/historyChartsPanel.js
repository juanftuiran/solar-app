/**
 * @module solarman/historyChartsPanel
 * @description Interactive Daily Parameter History & Live Curve panel for Solarman Monitor.
 */

import { fDec } from '../../modules/formatters.js';
import { escapeHTML, getLocalDateISO, shiftISODate } from '../../modules/utils.js';

/**
 * Compute concise summary metrics for the currently displayed intraday or 14-day dataset.
 */
function _computeHistoryStats(rt) {
  const isMonth = rt.historyRange === 'month';
  if (isMonth) {
    const bars = rt.monthlyHistoryPoints || [];
    const totalGen = bars.reduce((s, b) => s + (b.generationKwh || 0), 0);
    const totalUse = bars.reduce((s, b) => s + (b.consumptionKwh || 0), 0);
    const best = bars.reduce((m, b) => (b.generationKwh > (m?.generationKwh || -1) ? b : m), null);
    return {
      isMonth: true,
      count: bars.length,
      peakLabel: best ? `${fDec(best.generationKwh, 1)} kWh (${best.label})` : '—',
      totalGen: `${fDec(totalGen, 1)} kWh`,
      totalUse: `${fDec(totalUse, 1)} kWh`,
    };
  }

  const pts = rt.dailyHistoryPoints || [];
  let maxPower = 0;
  let maxLoad = 0;
  let maxTemp = null;
  let minSoc = null;
  let maxSoc = null;

  for (const p of pts) {
    if ((p.powerW || 0) > maxPower) maxPower = p.powerW;
    if ((p.loadW || 0) > maxLoad) maxLoad = p.loadW;
    if (p.tempC !== null && p.tempC !== undefined) {
      maxTemp = maxTemp === null ? p.tempC : Math.max(maxTemp, p.tempC);
    }
    if (p.batterySocPct !== null && p.batterySocPct !== undefined) {
      minSoc = minSoc === null ? p.batterySocPct : Math.min(minSoc, p.batterySocPct);
      maxSoc = maxSoc === null ? p.batterySocPct : Math.max(maxSoc, p.batterySocPct);
    }
  }

  return {
    isMonth: false,
    count: pts.length,
    maxPower: pts.length ? `${Math.round(maxPower)} W` : '—',
    maxLoad: maxLoad > 0 ? `${Math.round(maxLoad)} W` : '—',
    maxTemp: maxTemp !== null ? `${fDec(maxTemp, 1)} °C` : '—',
    socRange: minSoc !== null ? `${Math.round(minSoc)}–${Math.round(maxSoc)}%` : null,
  };
}

/**
 * Render the Solarman History & Real-Time Charts panel HTML.
 *
 * @param {Object} rt - solarmanRuntime
 * @param {Object} session - current Solarman session
 * @returns {string}
 */
export function renderHistoryChartsPanel(rt, session) {
  const todayISO = getLocalDateISO();
  const yesterdayISO = shiftISODate(todayISO, -1);
  const selectedDate = rt.selectedDate || todayISO;
  const isToday = selectedDate === todayISO;
  const isYesterday = selectedDate === yesterdayISO;
  const isMonth = rt.historyRange === 'month';
  const metric = rt.historyMetric || 'power';
  const stats = _computeHistoryStats(rt);

  let sourceChip = `<span class="meta-chip solar"><i class="fa-solid fa-cloud-arrow-down"></i> <span class="lang-es">Historial Cloud</span><span class="lang-en">Cloud History</span></span>`;
  if (session?.isDemo || rt.historySource === 'demo') {
    sourceChip = `<span class="meta-chip ai"><i class="fa-solid fa-flask"></i> <span class="lang-es">Simulación Histórica</span><span class="lang-en">Historical Demo</span></span>`;
  } else if (rt.historySource === 'live_fallback') {
    sourceChip = `<span class="meta-chip accent"><i class="fa-solid fa-wave-square"></i> <span class="lang-es">Curva Sesión en Vivo</span><span class="lang-en">Live Session Curve</span></span>`;
  }

  return `
    <div class="card section-card solarman-history-card" id="solarman-history-card">
      <div class="section-head" style="margin-bottom:0.85rem;gap:0.75rem;">
        <div class="section-head-title">
          <div class="icon-tile solar"><i class="fa-solid fa-chart-area"></i></div>
          <div>
            <h2>
              <span class="lang-es">Curva de Operación & Historial del Día</span>
              <span class="lang-en">Daily Telemetry & Parameter History</span>
            </h2>
            <p>
              <span class="lang-es">Explora potencia PV, consumo, batería, temperatura y voltajes de strings por fecha</span>
              <span class="lang-en">Inspect PV power, load, battery, inverter temperature & MPPT string voltages by date</span>
            </p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          ${sourceChip}
          <div class="segmented" id="sm-range-toggle">
            <button type="button" class="segmented-btn ${!isMonth ? 'active' : ''}" data-sm-range="day">
              <i class="fa-solid fa-clock"></i>
              <span class="lang-es">Día</span><span class="lang-en">Day</span>
            </button>
            <button type="button" class="segmented-btn ${isMonth ? 'active' : ''}" data-sm-range="month">
              <i class="fa-solid fa-calendar-days"></i>
              <span class="lang-es">14 Días</span><span class="lang-en">14 Days</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Date Selector & Parameter Mode Bar -->
      <div class="sm-chart-toolbar">
        <div class="sm-date-controls">
          <button type="button" id="sm-hist-prev" class="btn btn-ghost btn-xs btn-icon" title="Día anterior" aria-label="Día anterior">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <input
            type="date"
            id="sm-hist-date"
            class="sm-date-input"
            value="${escapeHTML(selectedDate)}"
            max="${escapeHTML(todayISO)}"
            aria-label="Seleccionar fecha histórica"
          >
          <button type="button" id="sm-hist-next" class="btn btn-ghost btn-xs btn-icon" ${isToday ? 'disabled' : ''} title="Día siguiente" aria-label="Día siguiente">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button type="button" id="sm-hist-today" class="btn ${isToday ? 'btn-solar' : 'btn-ghost'} btn-xs">
            <span class="lang-es">Hoy</span><span class="lang-en">Today</span>
          </button>
          <button type="button" id="sm-hist-yesterday" class="btn ${isYesterday ? 'btn-solar' : 'btn-ghost'} btn-xs">
            <span class="lang-es">Ayer</span><span class="lang-en">Yesterday</span>
          </button>
        </div>

        ${!isMonth ? `
          <div class="segmented sm-metric-pills" id="sm-metric-toggle">
            <button type="button" class="segmented-btn ${metric === 'power' ? 'active' : ''}" data-sm-metric="power">
              <i class="fa-solid fa-bolt"></i>
              <span class="lang-es">Potencia (W)</span><span class="lang-en">Power (W)</span>
            </button>
            <button type="button" class="segmented-btn ${metric === 'battery' ? 'active' : ''}" data-sm-metric="battery">
              <i class="fa-solid fa-temperature-half"></i>
              <span class="lang-es">Batería & Temp</span><span class="lang-en">Battery & Temp</span>
            </button>
            <button type="button" class="segmented-btn ${metric === 'pv' ? 'active' : ''}" data-sm-metric="pv">
              <i class="fa-solid fa-solar-panel"></i>
              <span class="lang-es">Strings (V)</span><span class="lang-en">Strings (V)</span>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Concise Summary Strip -->
      <div class="sm-hist-stats">
        ${stats.isMonth ? `
          <div class="sm-hist-stat">
            <span class="lbl"><span class="lang-es">Generación 14D</span><span class="lang-en">14D Generation</span></span>
            <strong class="val text-solar">${stats.totalGen}</strong>
          </div>
          <div class="sm-hist-stat">
            <span class="lbl"><span class="lang-es">Consumo 14D</span><span class="lang-en">14D Consumption</span></span>
            <strong class="val text-accent">${stats.totalUse}</strong>
          </div>
          <div class="sm-hist-stat">
            <span class="lbl"><span class="lang-es">Mejor Día</span><span class="lang-en">Best Day</span></span>
            <strong class="val text-warning">${stats.peakLabel}</strong>
          </div>
          <div class="sm-hist-stat">
            <span class="lbl"><span class="lang-es">Días Registrados</span><span class="lang-en">Days Logged</span></span>
            <strong class="val">${stats.count}</strong>
          </div>
        ` : `
          <div class="sm-hist-stat">
            <span class="lbl"><span class="lang-es">Pico Solar Día</span><span class="lang-en">Peak PV Power</span></span>
            <strong class="val text-solar">${stats.maxPower}</strong>
          </div>
          <div class="sm-hist-stat">
            <span class="lbl"><span class="lang-es">Carga Máxima</span><span class="lang-en">Peak Load</span></span>
            <strong class="val text-accent">${stats.maxLoad}</strong>
          </div>
          <div class="sm-hist-stat">
            <span class="lbl">
              ${stats.socRange
                ? '<span class="lang-es">Rango SOC / Temp. Máx</span><span class="lang-en">SOC Range / Max Temp</span>'
                : '<span class="lang-es">Temp. Máxima</span><span class="lang-en">Max Temp</span>'}
            </span>
            <strong class="val text-warning">${stats.socRange ? `${stats.socRange} · ${stats.maxTemp}` : stats.maxTemp}</strong>
          </div>
          <div class="sm-hist-stat">
            <span class="lbl"><span class="lang-es">Puntos Horarios</span><span class="lang-en">Samples</span></span>
            <strong class="val">${stats.count}</strong>
          </div>
        `}
      </div>

      ${rt.historyError ? `
        <div class="anomaly-banner warning" style="margin-bottom:0.75rem;">
          <div class="anomaly-icon"><i class="fa-solid fa-circle-info"></i></div>
          <div class="anomaly-content">
            <strong><span class="lang-es">Aviso de Consulta Histórica</span><span class="lang-en">History Query Notice</span></strong>
            <p>${escapeHTML(rt.historyError)}</p>
          </div>
        </div>
      ` : ''}

      <div class="sm-chart-wrap" style="position:relative;">
        ${rt.historyLoading ? `
          <div class="sm-chart-loading">
            <i class="fa-solid fa-circle-notch spin text-solar"></i>
            <span><span class="lang-es">Consultando historial del día...</span><span class="lang-en">Fetching daily history...</span></span>
          </div>
        ` : ''}
        <canvas id="chart-solarman-daily"></canvas>
      </div>
    </div>
  `;
}
