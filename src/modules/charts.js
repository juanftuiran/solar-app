/**
 * @module charts
 * Chart.js rendering functions for the solar monitoring app.
 * Manages energy, price, and 25-year projection charts with modern gradients and tooltips.
 */

import Chart from 'chart.js/auto';
import { state } from './state.js';
import { fCOP, fDec } from './formatters.js';
import { t } from './i18n.js';

// ---------------------------------------------------------------------------
// Chart.js global defaults
// ---------------------------------------------------------------------------
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;
Chart.defaults.plugins.legend.labels.boxHeight = 8;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(13, 21, 39, 0.95)';
Chart.defaults.plugins.tooltip.titleColor = '#f1f5f9';
Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.12)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCtx(canvasId) {
  if (state.charts[canvasId]) {
    state.charts[canvasId].destroy();
    delete state.charts[canvasId];
  }
  const el = document.getElementById(canvasId);
  return el ? el.getContext('2d') : null;
}

function createLinearGradient(ctx, topColor, bottomColor) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  return gradient;
}

// ---------------------------------------------------------------------------
// Energy Chart
// ---------------------------------------------------------------------------

export function renderEnergyChart(data) {
  const ctx = getCtx('chart-energia');
  if (!ctx) return;

  const labels = data.map((d) => d.label);
  const mode = state.chartModes.energia || 'bar';

  const gridBg = mode === 'line' 
    ? createLinearGradient(ctx, 'rgba(244, 63, 94, 0.25)', 'rgba(244, 63, 94, 0.01)')
    : 'rgba(244, 63, 94, 0.75)';

  const solarBg = mode === 'line'
    ? createLinearGradient(ctx, 'rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0.01)')
    : 'rgba(16, 185, 129, 0.75)';

  state.charts['chart-energia'] = new Chart(ctx, {
    type: mode,
    data: {
      labels,
      datasets: [
        {
          label: t('gridMeter'),
          data: data.map((d) => d.consumoRed),
          backgroundColor: gridBg,
          borderColor: '#F43F5E',
          borderWidth: 2,
          borderRadius: mode === 'bar' ? 6 : 0,
          pointRadius: mode === 'line' ? 3 : 0,
          pointHoverRadius: 5,
          tension: 0.35,
          fill: mode === 'line',
        },
        {
          label: t('solarInverter'),
          data: data.map((d) => d.prodBruta),
          backgroundColor: solarBg,
          borderColor: '#10B981',
          borderWidth: 2,
          borderRadius: mode === 'bar' ? 6 : 0,
          pointRadius: mode === 'line' ? 3 : 0,
          pointHoverRadius: 5,
          tension: 0.35,
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
            label: (tip) => `  ${tip.dataset.label}: ${fDec(tip.raw, 1)} kWh`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#94a3b8' },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' },
          title: { display: true, text: 'kWh', color: '#64748b' },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Price Chart
// ---------------------------------------------------------------------------

export function renderPriceChart(data) {
  const ctx = getCtx('chart-precio');
  if (!ctx) return;

  const labels = data.map((d) => d.label);
  const mode = state.chartModes.precio || 'line';

  const priceBg = mode === 'line'
    ? createLinearGradient(ctx, 'rgba(245, 158, 11, 0.25)', 'rgba(245, 158, 11, 0.01)')
    : 'rgba(245, 158, 11, 0.75)';

  state.charts['chart-precio'] = new Chart(ctx, {
    type: mode,
    data: {
      labels,
      datasets: [
        {
          label: t('costPerKw'),
          data: data.map((d) => d.precioKw),
          backgroundColor: priceBg,
          borderColor: '#F59E0B',
          borderWidth: 2,
          borderRadius: mode === 'bar' ? 6 : 0,
          pointRadius: mode === 'line' ? 3 : 0,
          pointHoverRadius: 5,
          tension: 0.35,
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
            label: (tip) => `  ${tip.dataset.label}: ${fCOP(tip.raw)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#94a3b8' },
        },
        y: {
          beginAtZero: false,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' },
          title: { display: true, text: 'COP / kWh', color: '#64748b' },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 25-Year Projection Chart
// ---------------------------------------------------------------------------

export function renderProjectionChart() {
  const ctx = getCtx('chart-proyeccion');
  if (!ctx) return;

  const processed = state.processedData;
  const investments = state.investments || [];

  const avgGen =
    processed.length > 0
      ? processed.reduce((s, d) => s + (d.prodBruta || 0), 0) / processed.length
      : 0;

  const avgPrice =
    processed.length > 0
      ? processed.reduce((s, d) => s + (d.precioKw || 0), 0) / processed.length
      : 0;

  const totalInvestment = investments.reduce((s, inv) => s + (inv.investment_cop || 0), 0);

  const firstInvestmentYear = investments.length > 0
    ? new Date(investments[0].start_date).getFullYear()
    : (processed.length > 0 ? processed[0].year : new Date().getFullYear());

  const DEGRADATION = 0.004;
  const INFLATION = 0.04;
  const YEARS = 25;

  const phases = investments
    .map((inv) => ({
      year: new Date(inv.start_date).getFullYear(),
      capacity: inv.capacity_added_kw || 0,
      amount: inv.investment_cop || 0,
    }))
    .sort((a, b) => a.year - b.year);

  const labels = [];
  const genData = [];
  const savingsData = [];
  const cumulatedSavings = [];
  const investmentLine = [];
  const tableRows = [];

  let cumSavings = 0;
  let cumInvestment = 0;
  let capacityMultiplier = 1;

  const realYears = new Map();
  for (const d of processed) {
    if (!realYears.has(d.year)) {
      realYears.set(d.year, { gen: 0, count: 0 });
    }
    const entry = realYears.get(d.year);
    entry.gen += d.prodBruta || 0;
    entry.count += 1;
  }

  const last3 = processed.slice(-3);
  const avgLast3 = last3.length > 0
    ? last3.reduce((s, d) => s + (d.prodBruta || 0), 0) / last3.length
    : avgGen;
    
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < YEARS; i++) {
    const year = firstInvestmentYear + i;
    labels.push(String(year));

    for (const phase of phases) {
      if (phase.year === year) {
        cumInvestment += phase.amount;
        if (avgGen > 0 && phase.capacity > 0) {
          const baseCapacity = investments[0]?.capacity_added_kw || 1;
          capacityMultiplier += phase.capacity / baseCapacity;
        }
      }
    }
    if (i === 0) {
      for (const phase of phases) {
        if (phase.year < year) {
          cumInvestment += phase.amount;
        }
      }
    }

    investmentLine.push(cumInvestment || totalInvestment);

    const realYear = realYears.get(year);
    let yearGen;
    if (realYear) {
      yearGen = realYear.gen;
      if (year === currentYear && realYear.count < 12) {
        yearGen += avgLast3 * (12 - realYear.count);
      }
    } else {
      yearGen = avgGen * 12 * capacityMultiplier * Math.pow(1 - DEGRADATION, i);
    }
    genData.push(parseFloat(yearGen.toFixed(1)));

    const yearPrice = avgPrice * Math.pow(1 + INFLATION, i);
    const annualSavings = yearGen * yearPrice;
    savingsData.push(Math.round(annualSavings));

    cumSavings += annualSavings;
    cumulatedSavings.push(Math.round(cumSavings));

    tableRows.push({ year, gen: yearGen, savings: annualSavings, cumSavings, investment: investmentLine[i] });
  }

  state.charts['chart-proyeccion'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: t('netGeneration') + ' (kWh)',
          data: genData,
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.08)',
          yAxisID: 'yGen',
          tension: 0.35,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: t('savingsGenerated') + ' / ' + t('investment'),
          data: savingsData,
          borderColor: '#F43F5E',
          backgroundColor: 'transparent',
          yAxisID: 'yAhorro',
          tension: 0.35,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: t('savingsGenerated') + ' (acum.)',
          data: cumulatedSavings,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          yAxisID: 'yAhorro',
          tension: 0.35,
          pointRadius: 2,
          borderWidth: 2.5,
          fill: true,
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
          borderWidth: 2,
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
              if (tip.datasetIndex === 0) return `  ${tip.dataset.label}: ${fDec(tip.raw, 1)} kWh`;
              return `  ${tip.dataset.label}: ${fCOP(tip.raw)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#94a3b8' },
        },
        yGen: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'kWh', color: '#8B5CF6' },
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' },
        },
        yAhorro: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'COP', color: '#10B981' },
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#94a3b8',
            callback: (val) => '$' + (val / 1000000).toFixed(1) + 'M',
          },
        },
      },
    },
  });

  const tbody = document.getElementById('tabla-proyeccion-body');
  if (tbody) {
    tbody.innerHTML = tableRows
      .map(
        (r) =>
          `<tr>
            <td style="padding:.75rem 1rem;font-weight:700;color:#e2e8f0;">${r.year}</td>
            <td style="padding:.75rem 1rem;text-align:right;color:#a78bfa;">${fDec(r.gen, 0)} kWh</td>
            <td style="padding:.75rem 1rem;text-align:right;color:#f87171;">${fCOP(r.savings)}</td>
            <td style="padding:.75rem 1rem;text-align:right;color:#10b981;font-weight:700;">${fCOP(r.cumSavings)}</td>
            <td style="padding:.75rem 1rem;text-align:right;color:#fbbf24;">${fCOP(r.investment)}</td>
          </tr>`,
      )
      .join('');
  }
}

// ---------------------------------------------------------------------------
// Cleanup & Utilities
// ---------------------------------------------------------------------------

export function destroyAllCharts() {
  for (const key of Object.keys(state.charts)) {
    if (state.charts[key]) {
      state.charts[key].destroy();
      delete state.charts[key];
    }
  }
}

export function updateChartIcons() {
  // Chart icons are handled inside views
}
