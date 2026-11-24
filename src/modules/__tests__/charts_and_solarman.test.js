import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { state } from '../state.js';
import { emptyStatePlugin } from '../charts/plugins.js';
import { recordLiveHistoryPoint, resetSolarmanRuntime, solarmanRuntime } from '../solarman/runtime.js';

describe('Charts & Solarman Regression Checks', () => {
  beforeEach(() => {
    state.lang = 'es';
    state.theme = 'dark';
    resetSolarmanRuntime();
  });

  it('emptyStatePlugin.afterDraw runs without ReferenceError when dataset has no values', () => {
    const calls = [];
    const fakeCtx = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      fillText: (text) => calls.push(['fillText', text]),
      textAlign: '',
      textBaseline: '',
      fillStyle: '',
      font: '',
    };
    const fakeChart = {
      data: { datasets: [{ data: [] }] },
      ctx: fakeCtx,
      chartArea: { left: 0, right: 200, top: 0, bottom: 100 },
    };

    expect(() => emptyStatePlugin.afterDraw(fakeChart, {}, {})).not.toThrow();
    expect(calls).toContain('save');
    expect(calls).toContain('restore');
    expect(calls.some((c) => Array.isArray(c) && c[0] === 'fillText')).toBe(true);
  });

  it('recordLiveHistoryPoint extracts pv1V and pv2V from pvStrings', () => {
    const ts = 1764000000;
    recordLiveHistoryPoint(ts, {
      summary: {
        acPowerW: 3200,
        loadPowerW: 900,
        gridPowerW: -2300,
        batteryPowerW: 0,
        batterySocPct: null,
        inverterTempC: 41.2,
      },
      pvStrings: [
        { id: 'PV1', voltageV: 356.4, currentA: 4.5, powerW: 1603 },
        { id: 'PV2', voltageV: 348.9, currentA: 4.6, powerW: 1605 },
      ],
    });

    expect(solarmanRuntime.liveHistory).toHaveLength(1);
    expect(solarmanRuntime.liveHistory[0].pv1V).toBe(356.4);
    expect(solarmanRuntime.liveHistory[0].pv2V).toBe(348.9);
    expect(solarmanRuntime.liveHistory[0].powerW).toBe(3200);
  });

  it('chart dataset labels do not expose raw units or variables inside parentheses', () => {
    const dashboardChartsSrc = readFileSync(resolve(process.cwd(), 'src/modules/charts/dashboardCharts.js'), 'utf8');
    const solarmanChartsSrc = readFileSync(resolve(process.cwd(), 'src/modules/charts/solarmanCharts.js'), 'utf8');

    const forbiddenParenUnits = /['"`][^'"`]*\((W|kWh|kWp|%|°C|V|COP|HSP|PR|Yf)\)[^'"`]*['"`]/;
    expect(dashboardChartsSrc).not.toMatch(forbiddenParenUnits);
    expect(solarmanChartsSrc).not.toMatch(forbiddenParenUnits);
  });
});
