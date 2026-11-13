/**
 * @module charts/core
 * @description Shared Chart.js setup, Obsidian/Daylight theme tokens, gradients, scales & lifecycle helpers.
 */

import Chart from "chart.js/auto";
import { state } from "../state.js";
import { fCOP, fDec, fKwh, fPct } from "../formatters.js";

// Theme
// ---------------------------------------------------------------------------
export const CHART_COLORS = {
  solar: '#10b981',
  solarDeep: '#059669',
  grid: '#f43f5e',
  accent: '#38bdf8',
  warning: '#f59e0b',
  ai: '#6366f1',
  text: '#f8fafc',
  muted: '#7e8fa6',
  dim: '#58677d',
  gridLine: 'rgba(148, 163, 184, 0.08)',
  surface: '#0c121e',
};
const C = CHART_COLORS;

const isEn = () => state.lang === 'en';
const L = (es, en) => (isEn() ? en : es);

/** Sync chart colors with active theme (dark vs light) */
export function syncChartTheme() {
  const isLight = state.theme === 'light';
  C.solar = isLight ? '#047857' : '#10b981';
  C.solarDeep = isLight ? '#065f46' : '#059669';
  C.grid = isLight ? '#be123c' : '#f43f5e';
  C.accent = isLight ? '#0369a1' : '#38bdf8';
  C.warning = isLight ? '#b45309' : '#f59e0b';
  C.ai = isLight ? '#4338ca' : '#6366f1';
  C.text = isLight ? '#090f1a' : '#f8fafc';
  C.muted = isLight ? '#334155' : '#7e8fa6';
  C.dim = isLight ? '#475569' : '#58677d';
  C.gridLine = isLight ? 'rgba(15, 23, 42, 0.11)' : 'rgba(148, 163, 184, 0.08)';
  C.surface = isLight ? '#e6ebf2' : '#0c121e';

  Chart.defaults.color = C.muted;
  Chart.defaults.plugins.legend.labels.color = C.muted;
  const tt = Chart.defaults.plugins.tooltip;
  tt.backgroundColor = isLight ? 'rgba(220, 226, 235, 0.98)' : 'rgba(12, 18, 30, 0.94)';
  tt.titleColor = isLight ? '#090f1a' : '#ffffff';
  tt.bodyColor = isLight ? '#162032' : '#cbd5e1';
  tt.footerColor = C.muted;
  tt.borderColor = isLight ? 'rgba(15, 23, 42, 0.18)' : 'rgba(148, 163, 184, 0.2)';
}

// ---------------------------------------------------------------------------
// Chart.js global defaults
// ---------------------------------------------------------------------------
Chart.defaults.color = C.muted;
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif";
Chart.defaults.font.size = 11.5;
Chart.defaults.animation.duration = 600;
Chart.defaults.animation.easing = 'easeOutQuart';
Chart.defaults.transitions.resize = { animation: { duration: 0 } };

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

export {
  Chart,
  C,
  isEn,
  L,
  getCtx,
  verticalGradient,
  shortLabel,
  xScale,
  yScale,
  baseOptions,
  tooltipTitleFull,
};
