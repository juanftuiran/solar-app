/**
 * @module charts
 * Chart.js rendering functions for the solar monitoring app.
 * Manages energy, price, and 25-year projection charts, including
 * a step-function investment line built from multiple investment phases.
 */

import Chart from 'chart.js/auto';
import { state } from './state.js';
import { fCOP, fDec } from './formatters.js';
import { t, monthName } from './i18n.js';

// ---------------------------------------------------------------------------
// Chart.js global defaults
// ---------------------------------------------------------------------------
Chart.defaults.color = '#64748b';
Chart.defaults.plugins.legend.labels.usePointStyle = true;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely get a 2D canvas context, destroying any previous chart on that canvas.
 * @param {string} canvasId
 * @returns {CanvasRenderingContext2D|null}
 */
function getCtx(canvasId) {
  if (state.charts[canvasId]) {
    state.charts[canvasId].destroy();
    delete state.charts[canvasId];
  }
  const el = document.getElementById(canvasId);
  return el ? el.getContext('2d') : null;
}

// ---------------------------------------------------------------------------
// Energy Chart
// ---------------------------------------------------------------------------

/**
 * Render the energy balance chart (grid consumption vs solar production).
 * Reads `state.chartModes.energia` to decide between 'bar' and 'line'.
 * @param {Array<Object>} data - Processed data array with `consumoRed`, `prodBruta`, `label`
 */
export function renderEnergyChart(data) {
  const ctx = getCtx('chart-energia');
  if (!ctx) return;

  const labels = data.map((d) => d.label);
  const mode = state.chartModes.energia || 'bar';

  state.charts['chart-energia'] = new Chart(ctx, {
    type: mode,
    data: {
      labels,
      datasets: [
        {
          label: t('gridMeter'),
          data: data.map((d) => d.consumoRed),
          backgroundColor: 'rgba(244, 63, 94, 0.6)',
          borderColor: '#F43F5E',
          borderWidth: 2,
          pointRadius: mode === 'line' ? 3 : 0,
          tension: 0.3,
        },
        {
          label: t('solarInverter'),
          data: data.map((d) => d.prodBruta),
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10B981',
          borderWidth: 2,
          pointRadius: mode === 'line' ? 3 : 0,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            label: (tip) => `${tip.dataset.label}: ${fDec(tip.raw, 1)} kWh`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'kWh' },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Price Chart
// ---------------------------------------------------------------------------

/**
 * Render the kW price fluctuation chart.
 * Reads `state.chartModes.precio` to decide between 'line' and 'bar'.
 * @param {Array<Object>} data - Processed data array with `precioKw`, `label`
 */
export function renderPriceChart(data) {
  const ctx = getCtx('chart-precio');
  if (!ctx) return;

  const labels = data.map((d) => d.label);
  const mode = state.chartModes.precio || 'line';

  state.charts['chart-precio'] = new Chart(ctx, {
    type: mode,
    data: {
      labels,
      datasets: [
        {
          label: t('costPerKw'),
          data: data.map((d) => d.precioKw),
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          borderColor: '#F59E0B',
          borderWidth: 2,
          pointRadius: mode === 'line' ? 3 : 0,
          tension: 0.3,
          fill: mode === 'line',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            label: (tip) => `${tip.dataset.label}: ${fCOP(tip.raw)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: 'COP / kWh' },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 25-Year Projection Chart
// ---------------------------------------------------------------------------

/**
 * Render the 25-year financial projection chart and populate the projection table.
 *
 * Parameters:
 * - Degradation: 0.4 % / year
 * - Inflation: 4 % / year
 * - Investment line: step function that increases at each investment phase
 *
 * Uses `state.processedData` for real historical data and
 * `state.investments` for investment phase information.
 */
export function renderProjectionChart() {
  const ctx = getCtx('chart-proyeccion');
  if (!ctx) return;

  const processed = state.processedData;
  const investments = state.investments || [];

  // --- Derive base values from historical data ---
  const avgGen =
    processed.length > 0
      ? processed.reduce((s, d) => s + (d.prodBruta || 0), 0) / processed.length
      : 0;

  const avgPrice =
    processed.length > 0
      ? processed.reduce((s, d) => s + (d.precioKw || 0), 0) / processed.length
      : 0;

  const totalInvestment = investments.reduce((s, inv) => s + (inv.investment_cop || 0), 0);

  // Determine start year from first investment or first data point
  const firstInvestmentYear = investments.length > 0
    ? new Date(investments[0].start_date).getFullYear()
    : (processed.length > 0 ? processed[0].year : new Date().getFullYear());

  const DEGRADATION = 0.004;
  const INFLATION = 0.04;
  const YEARS = 25;

  // Build sorted investment phases with their start years
  const phases = investments
    .map((inv) => ({
      year: new Date(inv.start_date).getFullYear(),
      capacity: inv.capacity_added_kw || 0,
      amount: inv.investment_cop || 0,
    }))
    .sort((a, b) => a.year - b.year);

  // Build per-year data
  const labels = [];
  const genData = [];
  const savingsData = [];
  const cumulatedSavings = [];
  const investmentLine = [];
  const tableRows = [];

  let cumSavings = 0;
  let cumInvestment = 0;
  let capacityMultiplier = 1;

  // Collect real-data years for reference
  const realYears = new Map();
  for (const d of processed) {
    if (!realYears.has(d.year)) {
      realYears.set(d.year, { gen: 0, count: 0 });
    }
    const entry = realYears.get(d.year);
    entry.gen += d.prodBruta || 0;
    entry.count += 1;
  }

  // Get average of last 3 months to estimate missing data for the current year
  const last3 = processed.slice(-3);
  const avgLast3 = last3.length > 0
    ? last3.reduce((s, d) => s + (d.prodBruta || 0), 0) / last3.length
    : avgGen;
    
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < YEARS; i++) {
    const year = firstInvestmentYear + i;
    labels.push(String(year));

    // Check if new investment phases start this year → step up capacity & investment
    for (const phase of phases) {
      if (phase.year === year) {
        cumInvestment += phase.amount;
        // Increase capacity multiplier proportionally (simplified)
        if (avgGen > 0 && phase.capacity > 0) {
          const baseCapacity = investments[0]?.capacity_added_kw || 1;
          capacityMultiplier += phase.capacity / baseCapacity;
        }
      }
    }
    // For phases before the start year that haven't been counted
    if (i === 0) {
      for (const phase of phases) {
        if (phase.year < year) {
          cumInvestment += phase.amount;
        }
      }
    }

    investmentLine.push(cumInvestment || totalInvestment);

    // Generation: use real data when available, otherwise extrapolate
    const realYear = realYears.get(year);
    let yearGen;
    if (realYear) {
      yearGen = realYear.gen;
      // If it's the current year and is incomplete, estimate remaining months
      if (year === currentYear && realYear.count < 12) {
        yearGen += avgLast3 * (12 - realYear.count);
      }
    } else {
      // Annualise average monthly generation (×12), apply degradation & capacity scaling
      yearGen = avgGen * 12 * capacityMultiplier * Math.pow(1 - DEGRADATION, i);
    }
    genData.push(parseFloat(yearGen.toFixed(1)));

    // Price for this year (inflation-adjusted)
    const yearPrice = avgPrice * Math.pow(1 + INFLATION, i);

    // Annual savings
    const annualSavings = yearGen * yearPrice;
    savingsData.push(Math.round(annualSavings));

    cumSavings += annualSavings;
    cumulatedSavings.push(Math.round(cumSavings));

    tableRows.push({ year, gen: yearGen, savings: annualSavings, cumSavings, investment: investmentLine[i] });
  }

  // --- Build chart ---
  state.charts['chart-proyeccion'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: t('netGeneration') + ' (kWh)',
          data: genData,
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          yAxisID: 'yGen',
          tension: 0.3,
          pointRadius: 2,
        },
        {
          label: t('savingsGenerated') + ' / ' + t('investment'),
          data: savingsData,
          borderColor: '#F43F5E',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          yAxisID: 'yAhorro',
          tension: 0.3,
          pointRadius: 2,
        },
        {
          label: t('savingsGenerated') + ' (acum.)',
          data: cumulatedSavings,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          yAxisID: 'yAhorro',
          tension: 0.3,
          pointRadius: 2,
        },
        {
          label: t('investment'),
          data: investmentLine,
          borderColor: '#EAB308',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          yAxisID: 'yAhorro',
          stepped: true,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            label: (tip) => {
              if (tip.datasetIndex === 0) return `${tip.dataset.label}: ${fDec(tip.raw, 1)} kWh`;
              return `${tip.dataset.label}: ${fCOP(tip.raw)}`;
            },
          },
        },
      },
      scales: {
        yGen: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'kWh' },
          beginAtZero: true,
        },
        yAhorro: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'COP' },
          beginAtZero: true,
          grid: { drawOnChartArea: false },
        },
      },
    },
  });

  // --- Populate projection table ---
  const tbody = document.getElementById('tabla-proyeccion-body');
  if (tbody) {
    tbody.innerHTML = tableRows
      .map(
        (r) =>
          `<tr>
            <td class="px-3 py-1">${r.year}</td>
            <td class="px-3 py-1 text-right">${fDec(r.gen, 0)}</td>
            <td class="px-3 py-1 text-right">${fCOP(r.savings)}</td>
            <td class="px-3 py-1 text-right">${fCOP(r.cumSavings)}</td>
            <td class="px-3 py-1 text-right">${fCOP(r.investment)}</td>
          </tr>`,
      )
      .join('');
  }
}

// ---------------------------------------------------------------------------
// Cleanup & Utilities
// ---------------------------------------------------------------------------

/**
 * Destroy all active Chart.js instances tracked in state.charts.
 */
export function destroyAllCharts() {
  for (const key of Object.keys(state.charts)) {
    if (state.charts[key]) {
      state.charts[key].destroy();
      delete state.charts[key];
    }
  }
}

/**
 * Toggle chart-mode icons on the chart toggle buttons.
 * Looks for elements with `data-chart` and `data-mode` attributes.
 */
export function updateChartIcons() {
  document.querySelectorAll('[data-chart]').forEach((btn) => {
    const chartKey = btn.dataset.chart;
    const btnMode = btn.dataset.mode;
    const currentMode = state.chartModes[chartKey];
    const icon = btn.querySelector('i, svg, .icon');

    if (icon) {
      icon.classList.toggle('opacity-100', btnMode === currentMode);
      icon.classList.toggle('opacity-40', btnMode !== currentMode);
    }

    btn.classList.toggle('ring-2', btnMode === currentMode);
    btn.classList.toggle('ring-blue-400', btnMode === currentMode);
  });
}
