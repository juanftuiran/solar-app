/**
 * @module charts/dashboardCharts
 * @description Core plant telemetry, financial payback, 25Y simulation, and KPI sparkline charts.
 */

import { state } from "../state.js";
import { fCOP, fDec, fKwh, fPct } from "../formatters.js";
import { calcFinancialSimulation } from "../analytics.js";
import { t } from "../i18n.js";
import {
  Chart,
  CHART_COLORS,
  C,
  L,
  getCtx,
  hexToRgba,
  verticalGradient,
  compact,
  xScale,
  yScale,
  baseOptions,
  tooltipTitleFull,
} from "./core.js";
import {
  emptyStatePlugin,
  hoverHighlightPlugin,
  referenceLinesPlugin,
  markerPlugin,
  doughnutCenterPlugin,
} from "./plugins.js";

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
    month: inv.start_date ? inv.start_date.slice(0, 7) : '',
    amount: parseFloat(inv.investment_cop) || 0,
  }));
  const totalInvestment = investments.reduce((s, i) => s + i.amount, 0);

  // Identify earliest installation month among phases that define a start date
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
      // If no phases have start dates, treat total investment as the baseline
      invested = totalInvestment;
    } else if (recMonth && recMonth < minInstallMonth) {
      // Prior to solar plant installation, invested capital is 0
      invested = 0;
    } else {
      // From installation onwards, take active phases into account and accumulate them
      invested = investments
        .filter((i) => !i.month || i.month <= recMonth || (i.date && d.fecha && i.date <= d.fecha))
        .reduce((s, i) => s + i.amount, 0);
    }

    invData.push(invested);
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
          `<tr${i === breakevenIdx ? ' style="background:var(--solar-subtle);"' : ''}>
            <td class="cell-primary">${r.year}${i === breakevenIdx ? ' <span class="badge-reset" style="background:var(--solar-subtle);color:var(--solar);border-color:var(--solar-glow);margin-left:var(--space-2xs);"><i class="fa-solid fa-flag-checkered"></i> ROI</span>' : ''}</td>
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
