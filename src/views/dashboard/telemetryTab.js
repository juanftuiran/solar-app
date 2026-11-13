/**
 * @module dashboard/telemetryTab
 * @description Solar operational health banner, KPI cards with sparklines, and telemetry charts grid.
 */

import { state } from "../../modules/state.js";
import { t } from "../../modules/i18n.js";

export function renderSolarHealthBanner() { return _renderSolarHealthBanner(); }
export function renderKPIGrid() { return _renderKPIGrid(); }
export function renderChartsGrid() { return _renderChartsGrid(); }

function _renderSolarHealthBanner() {
  return `
    <div class="solar-health-banner" id="solar-health-banner">
      <div class="solar-metric-item">
        <div class="solar-metric-icon" style="background:var(--solar-subtle);color:var(--solar);">
          <i class="fa-solid fa-heart-pulse"></i>
        </div>
        <div class="solar-metric-info">
          <span class="solar-metric-lbl">
            <span class="lang-es">Salud Operativa</span><span class="lang-en">Plant Health</span>
          </span>
          <div style="display:flex;align-items:center;gap:.4rem;margin-top:.15rem;">
            <span class="health-pill optimo" id="sh-health-pill">
              <span class="health-pulse-dot"></span>
              <span id="sh-health-text">Óptimo</span>
            </span>
          </div>
        </div>
      </div>

      <div class="solar-metric-item">
        <div class="solar-metric-icon" style="background:var(--accent-subtle);color:var(--accent);">
          <i class="fa-solid fa-bolt-lightning"></i>
        </div>
        <div class="solar-metric-info">
          <span class="solar-metric-lbl">
            <span class="lang-es">Rendimiento (Y<sub>f</sub>)</span><span class="lang-en">Specific Yield (Y<sub>f</sub>)</span>
          </span>
          <span class="solar-metric-val text-accent" id="sh-specific-yield">--</span>
        </div>
      </div>

      <div class="solar-metric-item">
        <div class="solar-metric-icon" style="background:var(--warning-subtle);color:var(--warning);">
          <i class="fa-solid fa-sun"></i>
        </div>
        <div class="solar-metric-info">
          <span class="solar-metric-lbl">
            <span class="lang-es">Horas Sol Pico (HSP)</span><span class="lang-en">Peak Sun Hours</span>
          </span>
          <span class="solar-metric-val text-warning" id="sh-avg-hsp">--</span>
        </div>
      </div>

      <div class="solar-metric-item">
        <div class="solar-metric-icon" style="background:var(--solar-subtle);color:var(--solar);">
          <i class="fa-solid fa-gauge-high"></i>
        </div>
        <div class="solar-metric-info">
          <span class="solar-metric-lbl">
            <span class="lang-es">Performance Ratio (PR)</span><span class="lang-en">Performance Ratio (PR)</span>
          </span>
          <span class="solar-metric-val text-solar" id="sh-pr-val">--</span>
        </div>
      </div>

      <div class="solar-metric-item">
        <div class="solar-metric-icon" style="background:var(--ai-subtle);color:var(--ai);">
          <i class="fa-solid fa-calendar-day"></i>
        </div>
        <div class="solar-metric-info">
          <span class="solar-metric-lbl">
            <span class="lang-es">Gen. Media Diaria</span><span class="lang-en">Daily Gen Rate</span>
          </span>
          <span class="solar-metric-val text-ai" id="sh-daily-gen">--</span>
        </div>
      </div>
    </div>
  `;
}

function _renderKPIGrid() {
  const kpis = [
    {
      id: 'kpi-ahorro',
      icon: 'fa-piggy-bank',
      color: 'var(--solar)',
      bg: 'var(--solar-subtle)',
      labelEs: 'Ahorro Período',
      labelEn: 'Period Savings',
      subEs: 'Ahorro económico neto',
      subEn: 'Net economic savings',
    },
    {
      id: 'kpi-produccion',
      icon: 'fa-solar-panel',
      color: 'var(--accent)',
      bg: 'var(--accent-subtle)',
      labelEs: 'Producción Solar',
      labelEn: 'Solar Production',
      subEs: 'Generación total bruta',
      subEn: 'Gross total generation',
    },
    {
      id: 'kpi-autonomia',
      icon: 'fa-battery-three-quarters',
      color: 'var(--ai)',
      bg: 'var(--ai-subtle)',
      labelEs: 'Autonomía Solar',
      labelEn: 'Solar Autonomy',
      subEs: 'Promedio últimos 3 registros',
      subEn: 'Last 3 records average',
    },
    {
      id: 'kpi-var-kw',
      icon: 'fa-arrow-trend-up',
      color: 'var(--warning)',
      bg: 'var(--warning-subtle)',
      labelEs: 'Var. Tarifa Red',
      labelEn: 'Grid Tariff Var.',
      subEs: 'Fluctuación intermensual',
      subEn: 'Month-over-month fluctuation',
    },
  ];

  const cards = kpis.map(kpi => `
    <div class="card kpi-card" style="--kpi-color:${kpi.color};">
      <div class="kpi-header">
        <span class="kpi-label">
          <span class="lang-es">${kpi.labelEs}</span>
          <span class="lang-en">${kpi.labelEn}</span>
        </span>
        <div class="kpi-icon-wrap" style="background:${kpi.bg};color:${kpi.color};">
          <i class="fa-solid ${kpi.icon}"></i>
        </div>
      </div>
      <div class="kpi-value" id="${kpi.id}">--</div>
      <div class="kpi-footer">
        <div class="kpi-subtext">
          <span id="delta-${kpi.id}" class="kpi-delta-slot"></span>
          <span>
            <span class="lang-es">${kpi.subEs}</span>
            <span class="lang-en">${kpi.subEn}</span>
          </span>
        </div>
        <div class="kpi-spark">
          <canvas id="spark-${kpi.id}"></canvas>
        </div>
      </div>
    </div>
  `).join('');

  return `<div class="kpi-grid">${cards}</div>`;
}

function _renderChartsGrid() {
  const energyMode = state.chartModes.energia || 'bar';
  const priceMode = state.chartModes.precio || 'line';

  return `
    <div class="charts-grid">
      <!-- Energy chart (Grid vs Solar) -->
      <div class="card chart-wrap span-2">
        <div class="chart-header">
          <div class="chart-title">
            <h3>
              <i class="fa-solid fa-bolt" style="color:var(--solar);"></i>
              <span class="lang-es">Balance Energético (Red vs Solar)</span>
              <span class="lang-en">Energy Balance (Grid vs Solar)</span>
            </h3>
            <p class="chart-subtitle">
              <span class="lang-es">Comparativa mensual de energía consumida de la red vs generación fotovoltaica</span>
              <span class="lang-en">Monthly comparison of grid consumption vs PV production</span>
            </p>
          </div>

          <!-- Segmented Control for Energy -->
          <div class="segmented-control" id="control-chart-energia">
            <button class="segmented-btn ${energyMode === 'bar' ? 'active' : ''}" data-chart-key="energia" data-mode="bar" type="button" title="Vista de Barras">
              <i class="fa-solid fa-chart-simple"></i>
            </button>
            <button class="segmented-btn ${energyMode === 'line' ? 'active' : ''}" data-chart-key="energia" data-mode="line" type="button" title="Vista de Líneas">
              <i class="fa-solid fa-chart-line"></i>
            </button>
          </div>
        </div>
        <div class="chart-container tall">
          <canvas id="chart-energia"></canvas>
        </div>
      </div>

      <!-- Energy Mix (Donut) -->
      <div class="card chart-wrap">
        <div class="chart-header">
          <div class="chart-title">
            <h3>
              <i class="fa-solid fa-chart-pie" style="color:var(--accent);"></i>
              <span class="lang-es">Mix Energético</span>
              <span class="lang-en">Energy Mix</span>
            </h3>
            <p class="chart-subtitle">
              <span class="lang-es">Participación solar acumulada</span>
              <span class="lang-en">Cumulative solar share</span>
            </p>
          </div>
        </div>
        <div class="mix-wrap">
          <div class="mix-chart">
            <canvas id="chart-mix"></canvas>
          </div>
          <div class="mix-legend">
            <div class="mix-legend-row">
              <span class="lbl"><span class="legend-dot" style="background:var(--solar);"></span> <span class="lang-es">Solar Fotovoltaica</span><span class="lang-en">Solar PV</span></span>
              <span class="val text-solar" id="mix-solar-val">-- kWh</span>
            </div>
            <div class="mix-legend-row">
              <span class="lbl"><span class="legend-dot" style="background:var(--grid-c);"></span> <span class="lang-es">Red Eléctrica</span><span class="lang-en">Grid Power</span></span>
              <span class="val text-grid" id="mix-grid-val">-- kWh</span>
            </div>
            <div class="mix-legend-row">
              <span class="lbl"><i class="fa-solid fa-calculator" style="font-size:.65rem;color:var(--muted-light);"></i> <span class="lang-es">Consumo Total</span><span class="lang-en">Total Consumed</span></span>
              <span class="val text-strong" id="mix-total-val">-- kWh</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="charts-grid two" style="margin-top:1.25rem;">
      <!-- Performance & Peak Sun Hours Chart -->
      <div class="card chart-wrap">
        <div class="chart-header">
          <div class="chart-title">
            <h3>
              <i class="fa-solid fa-sun" style="color:var(--warning);"></i>
              <span class="lang-es">Rendimiento & Horas Sol Pico (HSP)</span>
              <span class="lang-en">Plant Performance & Peak Sun Hours (PSH)</span>
            </h3>
            <p class="chart-subtitle">
              <span class="lang-es">Estándar IEC 61724 (referencias: Óptimo 4.0, Mínimo 3.2)</span>
              <span class="lang-en">IEC 61724 Standard (Target: 4.0 Optimal, 3.2 Min)</span>
            </p>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="chart-rendimiento"></canvas>
        </div>
      </div>

      <!-- Price chart -->
      <div class="card chart-wrap">
        <div class="chart-header">
          <div class="chart-title">
            <h3>
              <i class="fa-solid fa-coins" style="color:var(--warning);"></i>
              <span class="lang-es">Fluctuación de Tarifa kW (COP)</span>
              <span class="lang-en">kW Tariff Fluctuation (COP)</span>
            </h3>
            <p class="chart-subtitle">
              <span class="lang-es">Evolución del costo facturado por kWh en la red eléctrica</span>
              <span class="lang-en">Evolution of billed grid electricity tariff per kWh</span>
            </p>
          </div>

          <!-- Segmented Control for Price -->
          <div class="segmented-control" id="control-chart-precio">
            <button class="segmented-btn ${priceMode === 'line' ? 'active' : ''}" data-chart-key="precio" data-mode="line" type="button" title="Vista de Líneas">
              <i class="fa-solid fa-chart-line"></i>
            </button>
            <button class="segmented-btn ${priceMode === 'bar' ? 'active' : ''}" data-chart-key="precio" data-mode="bar" type="button" title="Vista de Barras">
              <i class="fa-solid fa-chart-simple"></i>
            </button>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="chart-precio"></canvas>
        </div>
      </div>
    </div>
  `;
}

