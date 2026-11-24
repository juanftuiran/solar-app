/**
 * @module charts/dashboardCharts
 * @description Core plant telemetry, financial payback, 25Y simulation, and KPI sparkline charts.
 */

import { state } from "../state.js";
import { fCOP, fDec } from "../formatters.js";
import { calcFinancialSimulation } from "../analytics.js";
import {
  Chart,
  C,
  L,
  getCtx,
  hexToRgba,
  verticalGradient,
  compact,
  formatChartNumber,
  xScale,
  yScale,
  baseOptions,
  tooltipTitleFull,
} from "./core.js";
import {
  hoverHighlightPlugin,
  referenceLinesPlugin,
  markerPlugin,
  doughnutCenterPlugin,
} from "./plugins.js";

export function renderEnergyChart(data, canvasOrId = 'chart-energia') {
  const ctx = getCtx(canvasOrId);
  if (!ctx) return null;

  const labels = data.map((d) => d.label);
  const mode = state.chartModes.energia || 'bar';
  const isLine = mode === 'line';

  const ds = (label, values, color) => ({
    label,
    data: values,
    backgroundColor: isLine ? verticalGradient(color, 0.24, 0) : verticalGradient(color, 0.92, 0.45),
    hoverBackgroundColor: isLine ? undefined : color,
    borderColor: color,
    borderWidth: isLine ? 2.25 : 0,
    borderRadius: isLine ? 0 : 6,
    borderSkipped: false,
    maxBarThickness: 28,
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

  const chart = new Chart(ctx, {
    type: mode,
    data: {
      labels,
      datasets: [
        ds(L('Energía solar', 'Solar energy'), data.map((d) => d.prodBruta), C.solar),
        ds(L('Consumo de red', 'Grid consumption'), data.map((d) => d.consumoRed), C.grid),
      ],
    },
    options: baseOptions({
      plugins: {
        tooltip: {
          callbacks: {
            title: tooltipTitleFull,
            label: (tip) => ` ${tip.dataset.label}: ${formatChartNumber(tip.raw, 1)} kWh`,
            footer: (items) => {
              const item = data[items?.[0]?.dataIndex];
              if (!item) return '';
              const lines = [`${L('Autonomía solar', 'Solar autonomy')}: ${fDec(item.autonomia, 1)}%`];
              if (item.hsp > 0) {
                lines.push(`${L('Rendimiento', 'Yield')}: ${formatChartNumber(item.specificYield, 1)} kWh/kWp · ${fDec(item.hsp, 2)} h/día`);
              }
              return lines;
            },
          },
        },
      },
      scales: {
        x: xScale(),
        y: yScale({ format: (v) => `${compact(v)} kWh` }),
      },
    }),
    plugins: [hoverHighlightPlugin],
  });

  state.charts['chart-energia'] = chart;
  return chart;
}

// ---------------------------------------------------------------------------
// Energy Mix (Doughnut)
// ---------------------------------------------------------------------------

export function renderMixChart(data, canvasOrId = 'chart-mix') {
  const ctx = getCtx(canvasOrId);
  if (!ctx) return null;

  const solar = data.reduce((s, d) => s + (d.prodBruta || 0), 0);
  const grid = data.reduce((s, d) => s + (d.consumoRed || 0), 0);
  const total = solar + grid;
  const share = total > 0 ? (solar / total) * 100 : 0;

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [L('Energía solar', 'Solar energy'), L('Energía de red', 'Grid energy')],
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
              return ` ${tip.label}: ${formatChartNumber(tip.raw, 0)} kWh (${fDec(pct, 1)}%)`;
            },
          },
        },
      },
    },
    plugins: [doughnutCenterPlugin(() => ({ value: `${fDec(share, 0)}%`, label: L('Solar', 'Solar share') }))],
  });

  state.charts['chart-mix'] = chart;
  return chart;
}

// ---------------------------------------------------------------------------
// Price Chart
// ---------------------------------------------------------------------------

export function renderPriceChart(data, canvasOrId = 'chart-precio') {
  const ctx = getCtx(canvasOrId);
  if (!ctx) return null;

  const labels = data.map((d) => d.label);
  const mode = state.chartModes.precio || 'line';
  const isLine = mode === 'line';
  const values = data.map((d) => d.precioKw);

  const chart = new Chart(ctx, {
    type: mode,
    data: {
      labels,
      datasets: [
        {
          label: L('Tarifa por kWh', 'Tariff per kWh'),
          data: values,
          backgroundColor: isLine ? verticalGradient(C.warning, 0.24, 0) : verticalGradient(C.warning, 0.9, 0.4),
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

  state.charts['chart-precio'] = chart;
  return chart;
}

// ---------------------------------------------------------------------------
// Performance / Peak Sun Hours Chart
// ---------------------------------------------------------------------------

export function renderPerformanceChart(data, canvasOrId = 'chart-rendimiento') {
  const ctx = getCtx(canvasOrId);
  if (!ctx) return null;

  const capacity = parseFloat(state.activeProject?.capacity_kw) || 0;
  const labels = data.map((d) => d.label);
  const values = data.map((d) => (capacity > 0 ? parseFloat((d.hsp || 0).toFixed(2)) : 0));
  const colorFor = (v) => (v >= 4 ? C.solar : v >= 3.2 ? C.accent : C.warning);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: L('Horas de sol pico', 'Peak sun hours'),
        data: values,
        backgroundColor: (c) => {
          const v = c.raw || 0;
          const col = colorFor(v);
          const { chart: ch } = c;
          if (!ch.chartArea) return hexToRgba(col, 0.85);
          const g = ch.ctx.createLinearGradient(0, ch.chartArea.top, 0, ch.chartArea.bottom);
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
          : {
              text: L('Capacidad del sistema no configurada', 'System capacity not configured'),
              hint: L('Define los kWp en Configuración para calcular el desempeño', 'Set kWp in Settings to compute performance'),
            },
        tooltip: {
          callbacks: {
            title: tooltipTitleFull,
            label: (tip) => ` ${fDec(tip.raw, 2)} ${L('horas sol pico por día', 'peak sun hours per day')}`,
            footer: (items) => {
              const item = data[items?.[0]?.dataIndex];
              if (!item) return '';
              return [
                `${L('Rendimiento específico', 'Specific yield')}: ${formatChartNumber(item.specificYield, 1)} kWh/kWp`,
                `${L('Promedio diario', 'Daily average')}: ${formatChartNumber(item.prodDiaria, 1)} kWh/día`,
                `${L('Ciclo medido', 'Billing cycle')}: ${item.daysInPeriod} ${L('días', 'days')}`,
              ];
            },
          },
        },
      },
      scales: {
        x: xScale(),
        y: { ...yScale({ format: (v) => `${fDec(v, 1)} h` }), suggestedMax: 5.5 },
      },
    }),
    plugins: [
      hoverHighlightPlugin,
      referenceLinesPlugin([
        { value: 4.0, label: L('Óptimo · 4,0 h', 'Optimal · 4.0 h'), color: C.solar },
        { value: 3.2, label: L('Mínimo · 3,2 h', 'Min · 3.2 h'), color: C.warning },
      ]),
    ],
  });

  state.charts['chart-rendimiento'] = chart;
  return chart;
}

// ---------------------------------------------------------------------------
// Payback Curve (historical cumulative savings vs invested capital)
// ---------------------------------------------------------------------------

export function renderPaybackChart(canvasOrId = 'chart-payback') {
  const ctx = getCtx(canvasOrId);
  if (!ctx) return null;

  const processed = state.processedData || [];
  const investments = (state.investments || []).map((inv) => ({
    date: inv.start_date || '',
    month: inv.start_date ? inv.start_date.slice(0, 7) : '',
    amount: parseFloat(inv.investment_cop) || 0,
  }));
  const totalInvestment = investments.reduce((s, i) => s + i.amount, 0);

  const phasesWithDates = investments.filter((i) => i.month);
  const minInstallMonth = phasesWithDates.length > 0
    ? phasesWithDates.reduce((min, i) => (!min || i.month < min ? i.month : min), '')
    : null;

  let cum = 0;
  const labels = [];
  const cumData = [];
  const invData = [];
  processed.forEach((d) => {
    cum += d.ahorroReal || 0;
    labels.push(d.label);
    cumData.push(Math.round(cum));

    const recMonth = d.fecha && d.fecha.length >= 7
      ? d.fecha.slice(0, 7)
      : (d.year && d.monthIdx ? `${d.year}-${String(d.monthIdx).padStart(2, '0')}` : '');

    let invested = 0;
    if (!minInstallMonth) {
      invested = totalInvestment;
    } else if (recMonth && recMonth < minInstallMonth) {
      invested = 0;
    } else {
      invested = investments
        .filter((i) => !i.month || i.month <= recMonth || (i.date && d.fecha && i.date <= d.fecha))
        .reduce((s, i) => s + i.amount, 0);
    }

    invData.push(invested);
  });

  const breakevenIdx = cumData.findIndex((v, i) => invData[i] > 0 && v >= invData[i]);

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: L('Ahorro acumulado', 'Cumulative savings'),
          data: cumData,
          borderColor: C.solar,
          backgroundColor: verticalGradient(C.solar, 0.28, 0),
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

  state.charts['chart-payback'] = chart;
  return chart;
}

// ---------------------------------------------------------------------------
// 25-Year Projection Chart
// ---------------------------------------------------------------------------

export function renderProjectionChart(simOverride = null, canvasOrId = 'chart-proyeccion') {
  const ctx = getCtx(canvasOrId);
  if (!ctx) return null;

  const sim = simOverride || calcFinancialSimulation(state.processedData, state.investments, state.simParams);
  const {
    labels,
    genData,
    savingsData,
    cumulatedSavings,
    investmentLine,
    breakevenIdx,
    breakevenYear,
  } = sim;

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: L('Ahorro acumulado', 'Cumulative savings'),
          data: cumulatedSavings,
          borderColor: C.solar,
          backgroundColor: verticalGradient(C.solar, 0.24, 0),
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
          backgroundColor: verticalGradient(C.accent, 0.52, 0.12),
          hoverBackgroundColor: hexToRgba(C.accent, 0.8),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 18,
          yAxisID: 'yAnual',
          order: 3,
        },
        {
          label: L('Capital invertido', 'Invested capital'),
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
          label: L('Generación estimada', 'Estimated generation'),
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
              if (tip.dataset.yAxisID === 'yGen') return ` ${tip.dataset.label}: ${formatChartNumber(tip.raw, 0)} kWh`;
              return ` ${tip.dataset.label}: ${fCOP(tip.raw)}`;
            },
          },
        },
      },
      scales: {
        x: xScale({ short: false }),
        yAhorro: yScale({ format: (v) => `$${compact(v)}` }),
        yAnual: { display: false, beginAtZero: true, grace: '220%' },
        yGen: { ...yScale({ position: 'right', drawGrid: false, format: (v) => `${compact(v)} kWh`, color: C.ai }), display: 'auto' },
      },
    }),
    plugins: [
      hoverHighlightPlugin,
      markerPlugin(breakevenIdx, `${L('Retorno', 'Payback')} ${breakevenYear || ''}`.trim(), C.solar),
    ],
  });

  state.charts['chart-proyeccion'] = chart;
  return chart;
}

// ---------------------------------------------------------------------------
// Sparklines (KPI cards)
// ---------------------------------------------------------------------------

export function renderSparkline(canvasOrId, values, color) {
  const ctx = getCtx(canvasOrId);
  if (!ctx) return null;
  const series = (values || []).map((v) => Number(v) || 0);
  if (series.length === 1) series.unshift(series[0]);

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: series.map((_, i) => i),
      datasets: [{
        data: series,
        borderColor: color,
        backgroundColor: verticalGradient(color, 0.25, 0),
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
      animation: { duration: 480 },
      events: [],
      layout: { padding: { top: 3, bottom: 2, left: 1, right: 3 } },
      plugins: { legend: { display: false }, tooltip: { enabled: false }, emptyState: false },
      scales: { x: { display: false }, y: { display: false, grace: '8%' } },
    },
  });

  if (typeof canvasOrId === 'string') {
    state.charts[canvasOrId] = chart;
  } else if (canvasOrId?.id) {
    state.charts[canvasOrId.id] = chart;
  }
  return chart;
}
