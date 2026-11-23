import { describe, it, expect, beforeEach } from 'vitest';
import { processData, calcFinancialSimulation } from '../analytics.js';
import { state } from '../state.js';

describe('analytics.js — IEC 61724 & DCF Valuation', () => {
  beforeEach(() => {
    state.lang = 'es';
    state.activeProject = { id: 'proj-1', capacity_kw: 5 };
    state.simParams = { inflation: 4.0, degradation: 0.4, discountRate: 8.0, refHsp: 4.5 };
  });

  it('returns an empty array when fewer than 2 readings are provided', () => {
    expect(processData([], 5)).toEqual([]);
    expect(
      processData(
        [{ id: '1', year: 2025, monthIdx: 1, fecha: '2025-01-01', lecturaRed: 1000, lecturaSolar: 500, precioKw: 900 }],
        5,
      ),
    ).toEqual([]);
  });

  it('computes normal deltas, autonomy, savings, and IEC 61724 metrics for consecutive readings', () => {
    const raw = [
      { id: '1', year: 2025, monthIdx: 1, fecha: '2025-01-01', lecturaRed: 1000, lecturaSolar: 500, precioKw: 800 },
      { id: '2', year: 2025, monthIdx: 2, fecha: '2025-01-31', lecturaRed: 1150, lecturaSolar: 1100, precioKw: 880 },
    ];

    const res = processData(raw, 5);
    expect(res).toHaveLength(1);

    const row = res[0];
    expect(row.daysInPeriod).toBe(30);
    expect(row.consumoRed).toBe(150);
    expect(row.prodBruta).toBe(600);
    expect(row.consumoTotal).toBe(750);
    expect(row.autonomia).toBeCloseTo(80, 5);
    expect(row.ahorroReal).toBe(600 * 880);
    expect(row.incPrecio).toBeCloseTo(10, 5);
    expect(row.specificYield).toBeCloseTo(120, 5); // 600 / 5
    expect(row.hsp).toBeCloseTo(4.0, 5); // 600 / (5 * 30)
    expect(row.pr).toBeCloseTo((4.0 / 4.5) * 100, 5);
    expect(row.healthScore).toBe('optimo');
  });

  it('handles inverter_reset and meter_reset without clamping to 0', () => {
    const raw = [
      { id: '1', year: 2025, monthIdx: 1, fecha: '2025-01-01', lecturaRed: 12000, lecturaSolar: 8500, precioKw: 900 },
      {
        id: '2',
        year: 2025,
        monthIdx: 2,
        fecha: '2025-01-31',
        lecturaRed: 140,
        lecturaSolar: 420,
        precioKw: 900,
        meter_reset: true,
        inverter_reset: true,
      },
    ];

    const res = processData(raw, 4);
    expect(res).toHaveLength(1);
    expect(res[0].consumoRed).toBe(140);
    expect(res[0].prodBruta).toBe(420);
    expect(res[0].consumoTotal).toBe(560);
    expect(res[0].ahorroReal).toBe(420 * 900);
  });

  it('returns 0 specificYield, hsp, and pr when plant capacity is 0', () => {
    const raw = [
      { id: '1', year: 2025, monthIdx: 1, fecha: '2025-01-01', lecturaRed: 1000, lecturaSolar: 500, precioKw: 900 },
      { id: '2', year: 2025, monthIdx: 2, fecha: '2025-01-31', lecturaRed: 1100, lecturaSolar: 950, precioKw: 900 },
    ];

    const res = processData(raw, 0);
    expect(res).toHaveLength(1);
    expect(res[0].specificYield).toBe(0);
    expect(res[0].hsp).toBe(0);
    expect(res[0].pr).toBe(0);
  });

  it('calculates deterministic 25-year DCF metrics (NPV, IRR, LCOE, breakeven) with fixed inputs', () => {
    // 12 months in historical year 2024: 500 kWh/month * 1000 COP/kWh = 6,000,000 COP/year
    const processed = Array.from({ length: 12 }, (_, idx) => ({
      year: 2024,
      monthIdx: idx + 1,
      prodBruta: 500,
      precioKw: 1000,
      ahorroReal: 500000,
    }));

    const investments = [
      {
        phase_name: 'Fase 1',
        investment_cop: 20000000,
        capacity_added_kw: 5,
        start_date: '2024-01-15',
      },
    ];

    // Zero inflation, zero degradation, 10% discount rate for exact analytical verification:
    // Year 1..25 cashflow = 6,000,000 COP/yr; CAPEX at t=0 = 20,000,000 COP.
    // PV annuity factor (10%, 25y) = (1 - 1.1^-25) / 0.1 = 9.07704002...
    // Expected NPV = 6,000,000 * 9.07704002 - 20,000,000 = 34,462,240
    // Expected IRR for CF_0=-20M, CF_1..25=+6M solves 6*(1 - (1+r)^-25)/r = 20 -> r ≈ 29.957%
    const sim = calcFinancialSimulation(processed, investments, {
      inflation: 0,
      degradation: 0,
      discountRate: 10,
    });

    expect(sim.totalInvestment).toBe(20000000);
    expect(sim.finalCum).toBe(150000000);
    expect(sim.breakevenIdx).toBe(3); // 2024: 6M, 2025: 12M, 2026: 18M, 2027: 24M >= 20M
    expect(sim.breakevenYear).toBe('2027');
    expect(sim.roi25).toBeCloseTo(650, 2);
    expect(sim.npv).toBe(34462240);
    expect(sim.irr).toBeCloseTo(29.957, 2);
    expect(sim.lcoe).toBe(Math.round(20000000 / (6000 * ((1 - Math.pow(1.1, -25)) / 0.1))));
  });
});
