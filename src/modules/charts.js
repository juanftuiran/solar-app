/**
 * @module charts
 * Chart.js rendering functions for the solar monitoring app.
 * Modern visual language: scriptable gradients, hover highlight bands / crosshair,
 * compact axis formatting, empty-state messaging, sparklines and donut mix chart.
 */

import Chart from 'chart.js/auto';
import { state } from './state.js';
import { fCOP, fDec } from './formatters.js';
import { t } from './i18n.js';
import { calcFinancialSimulation } from './analytics.js';

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
export const CHART_COLORS = {
  solar: '#34d399',
  solarDeep: '#10b981',
  grid: '#fb7185',
  accent: '#38bdf8',
  warning: '#fbbf24',
  ai: '#a78bfa',
  text: '#e6ebf3',
  muted: '#8b98ad',
  dim: '#5f6b80',
  gridLine: 'rgba(148, 163, 184, 0.08)',
  surface: '#0d1320',
};
const C = CHART_COLORS;

const isEn = () => state.lang === 'en';
const L = (es, en) => (isEn() ? en : es);

/** Sync chart colors with active theme (dark vs light) */
export function syncChartTheme() {
  const isLight = state.theme === 'light';
  C.text = isLight ? '#0f172a' : '#e6ebf3';
  C.muted = isLight ? '#475569' : '#8b98ad';
  C.dim = isLight ? '#64748b' : '#5f6b80';
  C.gridLine = isLight ? 'rgba(15, 23, 42, 0.07)' : 'rgba(148, 163, 184, 0.08)';
  C.surface = isLight ? '#ffffff' : '#0d1320';

  Chart.defaults.color = C.muted;
  Chart.defaults.plugins.legend.labels.color = C.muted;
  const tt = Chart.defaults.plugins.tooltip;
  tt.backgroundColor = isLight ? 'rgba(15, 23, 42, 0.94)' : 'rgba(13, 19, 32, 0.96)';
}

// ---------------------------------------------------------------------------
// Chart.js global defaults
// ---------------------------------------------------------------------------
Chart.defaults.color = C.muted;
Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.animation.duration = 750;
Chart.defaults.animation.easing = 'easeOutQuart';

Chart.defaults.plugins.legend.position = 'top';
Chart.defaults.plugins.legend.align = 'end';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
Chart.defaults.plugins.legend.labels.boxWidth = 6;
Chart.defaults.plugins.legend.labels.boxHeight = 6;
Chart.defaults.plugins.legend.labels.padding = 14;
Chart.defaults.plugins.legend.labels.color = C.muted;
Chart.defaults.plugins.legend.labels.font = { size: 11, weight: '600' };

const tt = Chart.defaults.plugins.tooltip;
tt.backgroundColor = 'rgba(13, 19, 32, 0.96)';
tt.titleColor = '#ffffff';
tt.bodyColor = '#cbd5e1';
tt.footerColor = C.muted;
tt.borderColor = 'rgba(148, 163, 184, 0.2)';
tt.borderWidth = 1;
tt.padding = { x: 12, y: 10 };
tt.cornerRadius = 10;
tt.boxPadding = 5;
tt.usePointStyle = true;
tt.titleFont = { size: 12, weight: '700' };
tt.bodyFont = { size: 12 };
tt.footerFont = { size: 11, weight: '500' };
tt.bodySpacing = 5;
tt.titleMarginBottom = 8;
tt.caretSize = 0;
tt.caretPadding = 10;

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

/** Draws a friendly message when a chart has no meaningful data. */
const emptyStatePlugin = {
  id: 'emptyState',
  afterDraw(chart, _args, opts) {
    const hasData = chart.data.datasets.some(
      (ds) => Array.isArray(ds.data) && ds.data.some((v) => v !== null && v !== undefined && Number(v) !== 0 && !Number.isNaN(Number(v))),
    );
    if (hasData) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.muted;
    ctx.font = "600 13px 'Inter', sans-serif";
    ctx.fillText(opts?.text || L('Sin datos para este período', 'No data for this period'), cx, cy - 8);
    ctx.fillStyle = C.dim;
    ctx.font = "500 11px 'Inter', sans-serif";
    ctx.fillText(opts?.hint || L('Agrega registros para ver la analítica', 'Add readings to see analytics'), cx, cy + 12);
    ctx.restore();
  },
};
Chart.register(emptyStatePlugin);

/** Hover highlight: vertical band for bar charts, dashed crosshair for line charts. */
const hoverHighlightPlugin = {
  id: 'hoverHighlight',
  beforeDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() || [];
    if (!active.length) return;
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    if (!xScale || !chartArea) return;
    const x = active[0].element.x;
    const isBar = chart.config.type === 'bar';
    ctx.save();
    if (isBar) {
      const count = chart.data.labels?.length || 1;
      const w = (chartArea.right - chartArea.left) / count;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.06)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2 + 2, chartArea.top, w - 4, chartArea.bottom - chartArea.top, 6);
      else ctx.rect(x - w / 2 + 2, chartArea.top, w - 4, chartArea.bottom - chartArea.top);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.stroke();
    }
    ctx.restore();
  },
};

/** Horizontal reference lines with labels, e.g. HSP thresholds. */
function referenceLinesPlugin(lines) {
  return {
    id: 'referenceLines',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const y = scales.y;
      if (!y || !chartArea) return;
      ctx.save();
      for (const line of lines) {
        const py = y.getPixelForValue(line.value);
        if (py < chartArea.top || py > chartArea.bottom) continue;
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = hexToRgba(line.color, 0.6);
        ctx.moveTo(chartArea.left, py);
        ctx.lineTo(chartArea.right, py);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "700 10px 'Inter', sans-serif";
        const tw = ctx.measureText(line.label).width + 10;
        ctx.fillStyle = hexToRgba(line.color, 0.16);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(chartArea.right - tw, py - 9, tw, 18, 9);
        else ctx.rect(chartArea.right - tw, py - 9, tw, 18);
        ctx.fill();
        ctx.fillStyle = line.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(line.label, chartArea.right - tw / 2, py);
      }
      ctx.restore();
    },
  };
}

/** Vertical marker at a given index with a pill label (e.g. breakeven year). */
function markerPlugin(index, label, color) {
  return {
    id: 'marker',
    afterDatasetsDraw(chart) {
      if (index === null || index === undefined || index < 0) return;
      const { ctx, chartArea, scales } = chart;
      const x = scales.x?.getPixelForValue(index);
      if (x === undefined || !chartArea) return;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = hexToRgba(color, 0.75);
      ctx.moveTo(x, chartArea.top + 14);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "700 10px 'Inter', sans-serif";
      const tw = ctx.measureText(label).width + 14;
      let left = x - tw / 2;
      left = Math.max(chartArea.left, Math.min(left, chartArea.right - tw));
      ctx.fillStyle = color;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(left, chartArea.top, tw, 18, 9);
      else ctx.rect(left, chartArea.top, tw, 18);
      ctx.fill();
      ctx.fillStyle = '#04130d';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, left + tw / 2, chartArea.top + 9);
      ctx.restore();
    },
  };
}

/** Centered text inside a doughnut. */
function doughnutCenterPlugin(getText) {
  return {
    id: 'doughnutCenter',
    afterDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      if (!meta?.data?.length) return;
      const { x, y } = meta.data[0];
      const { value, label } = getText();
      const { ctx } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.text;
      ctx.font = "800 26px 'Inter', sans-serif";
      ctx.fillText(value, x, y - 6);
      ctx.fillStyle = C.muted;
      ctx.font = "600 10px 'Inter', sans-serif";
      ctx.fillText(label.toUpperCase(), x, y + 16);
      ctx.restore();
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCtx(canvasId) {
  syncChartTheme();
  if (state.charts[canvasId]) {
    state.charts[canvasId].destroy();
    delete state.charts[canvasId];
  }
  const el = document.getElementById(canvasId);
  return el ? el.getContext('2d') : null;
}

export function hexToRgba(hex, alpha = 1) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Scriptable vertical gradient bound to the real chart area (resizes correctly). */
function verticalGradient(color, topAlpha, bottomAlpha) {
  return (context) => {
    const { chart } = context;
    const { ctx, chartArea } = chart;
    if (!chartArea) return hexToRgba(color, topAlpha);
    const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, hexToRgba(color, topAlpha));
    g.addColorStop(1, hexToRgba(color, bottomAlpha));
    return g;
  };
}

/** Compact number formatter for axes: 1.2k, 3.4M, 1.1B */
export function compact(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  const trim = (x) => x.toFixed(1).replace(/\.0$/, '');
  if (abs >= 1e9) return `${trim(v / 1e9)}B`;
  if (abs >= 1e6) return `${trim(v / 1e6)}M`;
  if (abs >= 1e3) return `${trim(v / 1e3)}k`;
  return trim(v);
}

/** "Enero 2025" -> "Ene 25" */
function shortLabel(label) {
  if (!label || typeof label !== 'string') return label;
  const parts = label.split(' ');
  if (parts.length < 2) return label;
  return `${parts[0].slice(0, 3)} ${parts[parts.length - 1].slice(-2)}`;
}

function xScale({ short = true } = {}) {
  return {
    grid: { display: false },
    border: { display: false },
    ticks: {
      color: C.muted,
      maxRotation: 0,
      autoSkip: true,
      autoSkipPadding: 14,
      padding: 6,
      callback(value) {
        const label = this.getLabelForValue(value);
        return short ? shortLabel(label) : label;
      },
    },
  };
}

function yScale({ format = (v) => compact(v), beginAtZero = true, position = 'left', drawGrid = true, title = null, color = C.muted } = {}) {
  return {
    position,
    beginAtZero,
    grid: { color: C.gridLine, drawTicks: false, display: drawGrid },
    border: { display: false, dash: [3, 4] },
    ticks: { color, padding: 10, maxTicksLimit: 6, callback: format },
    title: title ? { display: true, text: title, color: C.dim, font: { size: 10, weight: '600' } } : { display: false },
  };
}

function baseOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    layout: { padding: { top: 4, right: 4, left: 0, bottom: 0 } },
    ...extra,
  };
}

function tooltipTitleFull(items) {
  return items?.[0]?.label || '';
}

// ---------------------------------------------------------------------------
// Energy Chart
// ---------------------------------------------------------------------------

export function renderEnergyChart(data) {
  const ctx = getCtx('chart-energia');
  if (!ctx) return;

  const labels = data.map((d) => d.label);
  const mode = state.chartModes.energia || 'bar';
  const isLine = mode === 'line';

  const ds = (label, values, color) => ({
    label,
    data: values,
    backgroundColor: isLine ? verticalGradient(color, 0.28, 0) : verticalGradient(color, 0.95, 0.45),
    hoverBackgroundColor: isLine ? undefined : color,
    borderColor: color,
    borderWidth: isLine ? 2.25 : 0,
    borderRadius: isLine ? 0 : 6,
    borderSkipped: false,
    maxBarThickness: 26,
    categoryPercentage: 0.7,
    barPercentage: 0.85,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBorderWidth: 2,
    pointHoverBackgroundColor: C.surface,
    pointHoverBorderColor: color,
    tension: 0.4,
    fill: isLine,
  });

  state.charts['chart-energia'] = new Chart(ctx, {
    type: mode,
    data: {
      labels,
      datasets: [
        ds(t('solarInverter'), data.map((d) => d.prodBruta), C.solar),
        ds(t('gridMeter'), data.map((d) => d.consumoRed), C.grid),
      ],
    },
    options: baseOptions({
      plugins: {
        tooltip: {
          callbacks: {
            title: tooltipTitleFull,
            label: (tip) => ` ${tip.dataset.label}: ${fDec(tip.raw, 1)} kWh`,
            footer: (items) => {
              const item = data[items?.[0]?.dataIndex];
              if (!item) return '';
              const lines = [`${L('Autonomía', 'Autonomy')}: ${fDec(item.autonomia, 1)}%`];
              if (item.hsp > 0) lines.push(`${fDec(item.specificYield, 1)} kWh/kWp · ${fDec(item.hsp, 2)} HSP`);
              return lines;
            },
          },
        },
      },
      scales: {
        x: xScale(),
        y: yScale({ format: (v) => `${compact(v)}` , title: 'kWh' }),
      },
    }),
    plugins: [hoverHighlightPlugin],
  });
}

// ---------------------------------------------------------------------------
// Energy Mix (Doughnut)
// ---------------------------------------------------------------------------

export function renderMixChart(data) {
  const ctx = getCtx('chart-mix');
  if (!ctx) return;

  const solar = data.reduce((s, d) => s + (d.prodBruta || 0), 0);
  const grid = data.reduce((s, d) => s + (d.consumoRed || 0), 0);
  const total = solar + grid;
  const share = total > 0 ? (solar / total) * 100 : 0;

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('mix-solar-val', `${fDec(solar, 0)} kWh`);
  setText('mix-grid-val', `${fDec(grid, 0)} kWh`);
  setText('mix-total-val', `${fDec(total, 0)} kWh`);

  state.charts['chart-mix'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [t('solarInverter'), t('gridMeter')],
      datasets: [{
        data: total > 0 ? [solar, grid] : [0, 0],
        backgroundColor: [C.solar, hexToRgba(C.grid, 0.85)],
        hoverBackgroundColor: [C.solar, C.grid],
        borderColor: C.surface,
        borderWidth: 3,
        borderRadius: 6,
        spacing: 2,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '76%',
      plugins: {
        legend: { display: false },
        emptyState: { text: L('Sin datos', 'No data'), hint: ' ' },
        tooltip: {
          callbacks: {
            label: (tip) => {
              const pct = total > 0 ? (tip.raw / total) * 100 : 0;
              return ` ${tip.label}: ${fDec(tip.raw, 0)} kWh (${fDec(pct, 1)}%)`;
            },
          },
        },
      },
    },
    plugins: [doughnutCenterPlugin(() => ({ value: `${fDec(share, 0)}%`, label: L('Solar', 'Solar share') }))],
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
  const isLine = mode === 'line';
  const values = data.map((d) => d.precioKw);

  state.charts['chart-precio'] = new Chart(ctx, {
    type: mode,
    data: {
      labels,
      datasets: [
        {
          label: t('costPerKw'),
          data: values,
          backgroundColor: isLine ? verticalGradient(C.warning, 0.28, 0) : verticalGradient(C.warning, 0.9, 0.4),
          hoverBackgroundColor: isLine ? undefined : C.warning,
          borderColor: C.warning,
          borderWidth: isLine ? 2.25 : 0,
          borderRadius: isLine ? 0 : 6,
          borderSkipped: false,
          maxBarThickness: 24,
          pointRadius: isLine ? values.map((_, i) => (i === values.length - 1 ? 4 : 0)) : 0,
          pointBackgroundColor: C.warning,
          pointBorderColor: C.surface,
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: C.surface,
          pointHoverBorderColor: C.warning,
          pointHoverBorderWidth: 2,
          tension: 0.4,
          fill: isLine,
        },
      ],
    },
    options: baseOptions({
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: tooltipTitleFull,
            label: (tip) => ` ${tip.dataset.label}: ${fCOP(tip.raw)}`,
            footer: (items) => {
              const item = data[items?.[0]?.dataIndex];
              if (!item || !item.prevPrice) return '';
              const inc = item.incPrecio || 0;
              return `${inc > 0 ? '▲' : inc < 0 ? '▼' : '•'} ${fDec(Math.abs(inc), 1)}% ${L('vs período anterior', 'vs previous period')}`;
            },
          },
        },
      },
      scales: {
        x: xScale(),
        y: yScale({ beginAtZero: false, format: (v) => `$${compact(v)}` }),
      },
    }),
    plugins: [hoverHighlightPlugin],
  });
}

// ---------------------------------------------------------------------------
// Performance (HSP) Chart
// ---------------------------------------------------------------------------

export function renderPerformanceChart(data) {
  const ctx = getCtx('chart-rendimiento');
  if (!ctx) return;

  const capacity = parseFloat(state.activeProject?.capacity_kw) || 0;
  const labels = data.map((d) => d.label);
  const values = data.map((d) => (capacity > 0 ? parseFloat((d.hsp || 0).toFixed(2)) : 0));
  const colorFor = (v) => (v >= 4 ? C.solar : v >= 3.2 ? C.accent : C.warning);

  state.charts['chart-rendimiento'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'HSP',
        data: values,
        backgroundColor: (c) => {
          const v = c.raw || 0;
          const col = colorFor(v);
          const { chart } = c;
          if (!chart.chartArea) return hexToRgba(col, 0.85);
          const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
          g.addColorStop(0, hexToRgba(col, 0.95));
          g.addColorStop(1, hexToRgba(col, 0.35));
          return g;
        },
        hoverBackgroundColor: (c) => colorFor(c.raw || 0),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 26,
        categoryPercentage: 0.7,
      }],
    },
    options: baseOptions({
      plugins: {
        legend: { display: false },
        emptyState: capacity > 0
          ? {}
          : { text: L('Capacidad del sistema no configurada', 'System capacity not configured'), hint: L('Define los kWp en Configuración para calcular HSP', 'Set kWp in Settings to compute PSH') },
        tooltip: {
          callbacks: {
            title: tooltipTitleFull,
            label: (tip) => ` ${fDec(tip.raw, 2)} ${L('HSP/día', 'PSH/day')}`,
            footer: (items) => {
              const item = data[items?.[0]?.dataIndex];
              if (!item) return '';
              return [
                `${L('Rendimiento', 'Yield')}: ${fDec(item.specificYield, 1)} kWh/kWp`,
                `${L('Gen. diaria', 'Daily gen')}: ${fDec(item.prodDiaria, 1)} kWh/d`,
                `${L('Período', 'Period')}: ${item.daysInPeriod} ${L('días', 'days')}`,
              ];
            },
          },
        },
      },
      scales: {
        x: xScale(),
        y: { ...yScale({ format: (v) => fDec(v, 1) }), suggestedMax: 5.5 },
      },
    }),
    plugins: [
      hoverHighlightPlugin,
      referenceLinesPlugin([
        { value: 4.0, label: L('Óptimo 4.0', 'Optimal 4.0'), color: C.solar },
        { value: 3.2, label: L('Mín. 3.2', 'Min 3.2'), color: C.warning },
      ]),
    ],
  });
}

// ---------------------------------------------------------------------------
// Payback Curve (historical cumulative savings vs invested capital)
// ---------------------------------------------------------------------------

export function renderPaybackChart() {
  const ctx = getCtx('chart-payback');
  if (!ctx) return;

  const processed = state.processedData || [];
  const investments = (state.investments || []).map((inv) => ({
    date: inv.start_date || '',
    amount: parseFloat(inv.investment_cop) || 0,
  }));
  const totalInvestment = investments.reduce((s, i) => s + i.amount, 0);

  let cum = 0;
  const labels = [];
  const cumData = [];
  const invData = [];
  processed.forEach((d) => {
    cum += d.ahorroReal || 0;
    labels.push(d.label);
    cumData.push(Math.round(cum));
    const invested = investments.filter((i) => !i.date || i.date <= d.fecha).reduce((s, i) => s + i.amount, 0);
    invData.push(invested || totalInvestment);
  });

  const breakevenIdx = cumData.findIndex((v, i) => invData[i] > 0 && v >= invData[i]);

  state.charts['chart-payback'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: L('Ahorro acumulado', 'Cumulative savings'),
          data: cumData,
          borderColor: C.solar,
          backgroundColor: verticalGradient(C.solar, 0.3, 0),
          fill: true,
          tension: 0.35,
          borderWidth: 2.25,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: C.surface,
          pointHoverBorderColor: C.solar,
          pointHoverBorderWidth: 2,
        },
        {
          label: L('Capital invertido', 'Invested capital'),
          data: invData,
          borderColor: C.warning,
          backgroundColor: 'transparent',
          borderDash: [6, 5],
          stepped: true,
          borderWidth: 1.75,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: C.warning,
        },
      ],
    },
    options: baseOptions({
      plugins: {
        emptyState: totalInvestment > 0 || cumData.length ? {} : { text: L('Sin datos de inversión', 'No investment data') },
        tooltip: {
          callbacks: {
            title: tooltipTitleFull,
            label: (tip) => ` ${tip.dataset.label}: ${fCOP(tip.raw)}`,
            footer: (items) => {
              const i = items?.[0]?.dataIndex;
              if (i === undefined || !invData[i]) return '';
              return `${L('Recuperado', 'Recovered')}: ${fDec(Math.min(999, (cumData[i] / invData[i]) * 100), 1)}%`;
            },
          },
        },
      },
      scales: {
        x: xScale(),
        y: yScale({ format: (v) => `$${compact(v)}` }),
      },
    }),
    plugins: [
      hoverHighlightPlugin,
      markerPlugin(breakevenIdx, L('Punto de equilibrio', 'Breakeven'), C.solar),
    ],
  });
}

// ---------------------------------------------------------------------------
// 25-Year Projection Chart
// ---------------------------------------------------------------------------

export function renderProjectionChart() {
  const ctx = getCtx('chart-proyeccion');
  if (!ctx) return;

  const sim = calcFinancialSimulation(state.processedData, state.investments, state.simParams);
  const {
    labels,
    genData,
    savingsData,
    cumulatedSavings,
    investmentLine,
    tableRows,
    breakevenIdx,
    breakevenYear,
    finalCum,
    totalGen,
    totalInvestment,
    roi25,
    npv,
    irr,
    lcoe,
    assumptions,
  } = sim;

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('proj-total-savings', fCOP(finalCum));
  setText('proj-breakeven', breakevenYear || '—');
  setText('proj-breakeven-sub', breakevenYear
    ? `${L('En', 'In')} ${breakevenIdx + 1} ${L('años desde el inicio', 'years from start')}`
    : L('Fuera del horizonte', 'Beyond horizon'));
  setText('proj-roi', totalInvestment > 0 ? `${roi25 > 0 ? '+' : ''}${fDec(roi25, 0)}%` : '—');
  setText('proj-total-gen', `${compact(totalGen)} kWh`);
  setText('proj-npv', totalInvestment > 0 ? fCOP(npv) : '—');
  setText('proj-irr', irr !== null && irr !== undefined ? `${fDec(irr, 1)}%` : '—');
  setText('proj-lcoe', lcoe > 0 ? `${fCOP(lcoe)}/kWh` : '—');

  // Update assumption chips & slider labels
  setText('sim-val-inflation', `${fDec(assumptions.inflation, 1)}%`);
  setText('sim-val-degradation', `${fDec(assumptions.degradation, 2)}%`);
  setText('sim-val-wacc', `${fDec(assumptions.discountRate, 1)}%`);
  setText('sim-chip-deg', `${L('Deg', 'Deg')}: ${fDec(assumptions.degradation, 2)}%/${L('año', 'yr')}`);
  setText('sim-chip-inf', `${L('Inf', 'Inf')}: ${fDec(assumptions.inflation, 1)}%/${L('año', 'yr')}`);
  setText('sim-chip-wacc', `WACC: ${fDec(assumptions.discountRate, 1)}%`);

  state.charts['chart-proyeccion'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: L('Ahorro acumulado', 'Cumulative savings'),
          data: cumulatedSavings,
          borderColor: C.solar,
          backgroundColor: verticalGradient(C.solar, 0.26, 0),
          yAxisID: 'yAhorro',
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: C.surface,
          pointHoverBorderColor: C.solar,
          pointHoverBorderWidth: 2,
          borderWidth: 2.5,
          fill: true,
          order: 2,
        },
        {
          label: L('Ahorro anual', 'Annual savings'),
          type: 'bar',
          data: savingsData,
          backgroundColor: verticalGradient(C.accent, 0.55, 0.12),
          hoverBackgroundColor: hexToRgba(C.accent, 0.8),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 18,
          yAxisID: 'yAnual',
          order: 3,
        },
        {
          label: t('investment'),
          data: investmentLine,
          borderColor: C.warning,
          backgroundColor: 'transparent',
          borderDash: [6, 5],
          yAxisID: 'yAhorro',
          stepped: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: C.warning,
          borderWidth: 1.75,
          order: 1,
        },
        {
          label: L('Generación (kWh)', 'Generation (kWh)'),
          data: genData,
          borderColor: C.ai,
          backgroundColor: 'transparent',
          yAxisID: 'yGen',
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: C.ai,
          borderWidth: 1.75,
          hidden: true,
          order: 0,
        },
      ],
    },
    options: baseOptions({
      plugins: {
        tooltip: {
          callbacks: {
            label: (tip) => {
              if (tip.dataset.yAxisID === 'yGen') return ` ${tip.dataset.label}: ${fDec(tip.raw, 0)} kWh`;
              return ` ${tip.dataset.label}: ${fCOP(tip.raw)}`;
            },
          },
        },
      },
      scales: {
        x: xScale({ short: false }),
        yAhorro: yScale({ format: (v) => `$${compact(v)}` }),
        yAnual: { display: false, beginAtZero: true, grace: '220%' },
        yGen: { ...yScale({ position: 'right', drawGrid: false, format: (v) => compact(v), color: C.ai }), display: 'auto' },
      },
    }),
    plugins: [
      hoverHighlightPlugin,
      markerPlugin(breakevenIdx, `${L('Retorno', 'Payback')} ${breakevenYear || ''}`.trim(), C.solar),
    ],
  });

  const tbody = document.getElementById('tabla-proyeccion-body');
  if (tbody) {
    tbody.innerHTML = tableRows
      .map(
        (r, i) =>
          `<tr${i === breakevenIdx ? ' style="background:rgba(52,211,153,0.07);"' : ''}>
            <td class="cell-primary">${r.year}${i === breakevenIdx ? ' <span class="badge-reset" style="background:rgba(52,211,153,.12);color:#34d399;border-color:rgba(52,211,153,.3);margin-left:.35rem;"><i class="fa-solid fa-flag-checkered"></i> ROI</span>' : ''}</td>
            <td class="text-right" style="color:var(--ai);">${fDec(r.gen, 0)} kWh</td>
            <td class="text-right" style="color:var(--accent);">${fCOP(r.savings)}</td>
            <td class="text-right" style="color:var(--solar);font-weight:700;">${fCOP(r.cumSavings)}</td>
            <td class="text-right" style="color:var(--warning);">${fCOP(r.investment)}</td>
            <td class="text-right" style="color:${r.netPosition >= 0 ? 'var(--solar)' : 'var(--muted-light)'};font-weight:600;">${r.netPosition >= 0 ? '+' : ''}${fCOP(r.netPosition)}</td>
          </tr>`,
      )
      .join('');
  }
}

// ---------------------------------------------------------------------------
// Sparklines (KPI cards)
// ---------------------------------------------------------------------------

export function renderSparkline(canvasId, values, color) {
  const ctx = getCtx(canvasId);
  if (!ctx) return;
  const series = (values || []).map((v) => Number(v) || 0);
  if (series.length === 1) series.unshift(series[0]);

  state.charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: series.map((_, i) => i),
      datasets: [{
        data: series,
        borderColor: color,
        backgroundColor: verticalGradient(color, 0.28, 0),
        fill: true,
        borderWidth: 1.75,
        tension: 0.4,
        pointRadius: series.map((_, i) => (i === series.length - 1 ? 2.5 : 0)),
        pointBackgroundColor: color,
        pointBorderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      events: [],
      layout: { padding: { top: 3, bottom: 2, left: 1, right: 3 } },
      plugins: { legend: { display: false }, tooltip: { enabled: false }, emptyState: false },
      scales: { x: { display: false }, y: { display: false, grace: '8%' } },
    },
  });
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
