/**
 * @module charts/solarmanCharts
 * @description Real-time & intraday historical telemetry charts for Solarman Live Monitor.
 */

import { state } from '../state.js';
import { fDec } from '../formatters.js';
import {
  Chart,
  C,
  L,
  syncChartTheme,
  getCtx,
  hexToRgba,
  verticalGradient,
  formatChartNumber,
  xScale,
  yScale,
  baseOptions,
} from './core.js';
import { emptyStatePlugin, hoverHighlightPlugin } from './plugins.js';

/**
 * Render intraday time-series parameters for a selected day (or live session fallback).
 *
 * @param {Array<Object>} points
 * @param {'power'|'battery'|'pv'} [metricMode='power']
 * @param {Object|null} [telemetry=null]
 * @param {HTMLCanvasElement|string} [canvasOrId='chart-solarman-daily']
 */
export function renderSolarmanDailyChart(
  points = [],
  metricMode = 'power',
  telemetry = null,
  canvasOrId = 'chart-solarman-daily',
) {
  syncChartTheme();
  const ctx = getCtx(canvasOrId);
  if (!ctx) return null;

  const list = Array.isArray(points) ? points : [];
  const labels = list.map((p) => p.timeLabel || '');

  const makeLine = (label, data, color, opts = {}) => ({
    label,
    data,
    borderColor: color,
    backgroundColor: opts.fill ? verticalGradient(color, opts.alpha ?? 0.24, 0) : 'transparent',
    fill: Boolean(opts.fill),
    tension: 0.34,
    borderWidth: opts.width ?? 2.1,
    borderDash: opts.dash || [],
    pointRadius: list.length <= 2 ? 4 : 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: C.surface,
    pointHoverBorderColor: color,
    pointHoverBorderWidth: 2,
    yAxisID: opts.yAxisID || 'y',
    spanGaps: true,
    metricRole: opts.metricRole || null,
  });

  let datasets = [];
  let scales = {
    x: {
      ...xScale({ short: false }),
      ticks: {
        ...xScale({ short: false }).ticks,
        maxTicksLimit: 9,
      },
    },
    y: yScale({ format: (v) => `${formatChartNumber(v, 0)} W` }),
  };

  if (metricMode === 'battery') {
    const hasSoc = list.some((p) => p.batterySocPct !== null && p.batterySocPct !== undefined);
    const hasTemp = list.some((p) => p.tempC !== null && p.tempC !== undefined);

    if (hasSoc) {
      datasets.push(
        makeLine(
          L('Carga de batería', 'Battery charge'),
          list.map((p) => p.batterySocPct),
          C.solar,
          { fill: true, alpha: 0.26, yAxisID: 'ySoc' },
        ),
      );
      scales = {
        x: scales.x,
        ySoc: {
          ...yScale({ format: (v) => `${Math.round(v)}%`, color: C.solar }),
          min: 0,
          max: 100,
        },
        ...(hasTemp
          ? {
              yTemp: {
                ...yScale({
                  position: 'right',
                  drawGrid: false,
                  beginAtZero: false,
                  format: (v) => `${fDec(v, 0)} °C`,
                  color: C.warning,
                }),
              },
            }
          : {}),
      };
    } else {
      scales = {
        x: scales.x,
        yTemp: yScale({ beginAtZero: false, format: (v) => `${fDec(v, 1)} °C`, color: C.warning }),
      };
    }

    if (hasTemp) {
      datasets.push(
        makeLine(
          L('Temperatura del inversor', 'Inverter temperature'),
          list.map((p) => p.tempC),
          C.warning,
          { fill: !hasSoc, alpha: 0.2, yAxisID: 'yTemp' },
        ),
      );
    }
  } else if (metricMode === 'pv') {
    const hasPv1 = list.some((p) => p.pv1V !== null && p.pv1V !== undefined);
    const hasPv2 = list.some((p) => p.pv2V !== null && p.pv2V !== undefined && p.pv2V > 0);
    if (hasPv1) {
      datasets.push(makeLine(L('Cadena solar 1', 'Solar string 1'), list.map((p) => p.pv1V), C.solar, { fill: true, alpha: 0.22 }));
    }
    if (hasPv2) {
      datasets.push(makeLine(L('Cadena solar 2', 'Solar string 2'), list.map((p) => p.pv2V), C.accent, { fill: false }));
    }
    scales.y = yScale({ format: (v) => `${formatChartNumber(v, 0)} V` });
  } else {
    datasets.push(
      makeLine(
        L('Potencia solar', 'Solar power'),
        list.map((p) => p.powerW),
        C.solar,
        { fill: true, alpha: 0.26, metricRole: 'solar' },
      ),
    );
    if (list.some((p) => (p.loadW || 0) > 0)) {
      datasets.push(
        makeLine(
          L('Consumo en planta', 'Plant load'),
          list.map((p) => p.loadW),
          C.accent,
          { fill: true, alpha: 0.12, metricRole: 'load' },
        ),
      );
    }
    if (list.some((p) => Math.abs(p.gridW || 0) > 5)) {
      datasets.push(
        makeLine(
          L('Red eléctrica', 'Utility grid'),
          list.map((p) => p.gridW),
          C.grid,
          { dash: [5, 4], width: 1.75, metricRole: 'grid' },
        ),
      );
    }
    const isOffGrid = telemetry?.summary?.isOffGrid || list.some((p) => Math.abs(p.batteryPowerW || 0) > 10);
    if (isOffGrid && list.some((p) => p.batteryPowerW !== 0)) {
      datasets.push(
        makeLine(
          L('Batería', 'Battery'),
          list.map((p) => p.batteryPowerW),
          C.ai,
          { width: 1.85, metricRole: 'battery' },
        ),
      );
    }
  }

  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: baseOptions({
      plugins: {
        emptyState: list.length
          ? (datasets.length ? {} : {
              text: L('Sin registros para este indicador en el día', 'No samples recorded for this metric'),
              hint: L('Prueba otra pestaña o selecciona una fecha anterior', 'Try another metric tab or select an earlier date'),
            })
          : {
              text: L('Sin datos horarios registrados para esta fecha', 'No intraday data recorded for this date'),
              hint: L('Cambia la fecha o espera la próxima lectura en vivo', 'Pick another date or wait for the next live frame'),
            },
        tooltip: {
          callbacks: {
            label: (tip) => {
              const v = tip.raw;
              if (v === null || v === undefined) return '';
              if (tip.dataset.yAxisID === 'ySoc') return ` ${tip.dataset.label}: ${fDec(v, 0)}%`;
              if (tip.dataset.yAxisID === 'yTemp') return ` ${tip.dataset.label}: ${fDec(v, 1)} °C`;
              if (metricMode === 'pv') return ` ${tip.dataset.label}: ${fDec(v, 1)} V`;
              const role = tip.dataset.metricRole;
              if (role === 'battery' && Math.abs(v) > 0) {
                const dir = v > 0 ? L('cargando', 'charging') : L('descargando', 'discharging');
                return ` ${tip.dataset.label}: ${formatChartNumber(Math.abs(v), 0)} W · ${dir}`;
              }
              if (role === 'grid' && Math.abs(v) > 0) {
                const dir = v > 0 ? L('importando', 'importing') : L('exportando', 'exporting');
                return ` ${tip.dataset.label}: ${formatChartNumber(Math.abs(v), 0)} W · ${dir}`;
              }
              return ` ${tip.dataset.label}: ${formatChartNumber(v, 0)} W`;
            },
          },
        },
      },
      scales,
    }),
    plugins: [emptyStatePlugin, hoverHighlightPlugin],
  });

  state.charts['chart-solarman-daily'] = chart;
  return chart;
}

/**
 * Render 14-day daily kWh yield & consumption bar summary chart.
 *
 * @param {Array<Object>} bars
 * @param {HTMLCanvasElement|string} [canvasOrId='chart-solarman-daily']
 */
export function renderSolarmanPeriodBarsChart(bars = [], canvasOrId = 'chart-solarman-daily') {
  syncChartTheme();
  const ctx = getCtx(canvasOrId);
  if (!ctx) return null;

  const list = Array.isArray(bars) ? bars : [];
  const labels = list.map((r) => r.label);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: L('Energía generada', 'Energy generated'),
          data: list.map((r) => r.generationKwh),
          backgroundColor: verticalGradient(C.solar, 0.92, 0.42),
          hoverBackgroundColor: C.solar,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 22,
          categoryPercentage: 0.72,
          barPercentage: 0.85,
        },
        {
          label: L('Energía consumida', 'Energy consumed'),
          data: list.map((r) => r.consumptionKwh),
          backgroundColor: hexToRgba(C.accent, 0.72),
          hoverBackgroundColor: C.accent,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 22,
          categoryPercentage: 0.72,
          barPercentage: 0.85,
        },
      ],
    },
    options: baseOptions({
      plugins: {
        emptyState: list.length
          ? {}
          : {
              text: L('Sin resumen diario en los últimos 14 días', 'No daily summary in the last 14 days'),
              hint: L('Vuelve a la vista diaria para inspeccionar telemetría en vivo', 'Switch back to daily view to inspect live telemetry'),
            },
        tooltip: {
          callbacks: {
            label: (tip) => ` ${tip.dataset.label}: ${formatChartNumber(tip.raw, 2)} kWh`,
          },
        },
      },
      scales: {
        x: xScale({ short: false }),
        y: yScale({ format: (v) => `${formatChartNumber(v, 0)} kWh` }),
      },
    }),
    plugins: [emptyStatePlugin, hoverHighlightPlugin],
  });

  state.charts['chart-solarman-daily'] = chart;
  return chart;
}
