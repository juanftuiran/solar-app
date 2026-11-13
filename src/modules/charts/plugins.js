/**
 * @module charts/plugins
 * @description Custom Chart.js plugins (empty-state, crosshair highlight, reference lines, markers, donut center).
 */

import { Chart, C, hexToRgba } from "./core.js";

export const emptyStatePlugin = {
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

export const hoverHighlightPlugin = {
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

export function referenceLinesPlugin(lines) {
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

export function markerPlugin(index, label, color) {
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

export function doughnutCenterPlugin(getText) {
  return {
    id: 'doughnutCenter',
    afterDraw(chart) {
      const { chartArea, ctx } = chart;
      if (!chartArea) return;
      const x = (chartArea.left + chartArea.right) / 2;
      const y = (chartArea.top + chartArea.bottom) / 2;
      const { value, label } = getText();
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

