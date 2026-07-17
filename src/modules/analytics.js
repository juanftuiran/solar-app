/**
 * @module analytics
 * Analytics, data processing, and KPI calculation for the solar monitoring app.
 * Transforms raw solar readings into actionable metrics and projections.
 */

import { state } from './state.js';
import { fCOP, fDec } from './formatters.js';
import { t, monthName } from './i18n.js';

// ---------------------------------------------------------------------------
// Data Processing
// ---------------------------------------------------------------------------

/**
 * Process raw solar readings into derived metrics.
 *
 * Each consecutive pair of readings is used to compute deltas:
 * - `consumoRed`  – Grid consumption (delta of grid meter readings)
 * - `prodBruta`   – Gross solar production (delta of inverter readings)
 * - `consumoTotal` – Total consumption (grid + solar)
 * - `autonomia`   – Energy autonomy percentage (solar / total × 100)
 * - `incPrecio`   – Price per kWh
 * - `ahorroReal`  – Real savings (solar production × price)
 * - `label`       – Human-readable label (month name + year)
 *
 * @param {Array<Object>} rawData - Raw solar_readings from the database.
 *   Each record should have: medidorRed, inversores, precioKw, year, monthIdx
 * @returns {Array<Object>} Processed data array
 */
export function processData(rawData) {
  if (!rawData || rawData.length < 2) return [];

  const result = [];

  for (let i = 1; i < rawData.length; i++) {
    const prev = rawData[i - 1];
    const curr = rawData[i];

    // Support both old naming (medidorRed/inversores) and new naming (lecturaRed/lecturaSolar)
    const currRed = curr.lecturaRed ?? curr.medidorRed ?? 0;
    const prevRed = prev.lecturaRed ?? prev.medidorRed ?? 0;
    const currSolar = curr.lecturaSolar ?? curr.inversores ?? 0;
    const prevSolar = prev.lecturaSolar ?? prev.inversores ?? 0;

    const consumoRed = Math.max(0, currRed - prevRed);
    const prodBruta = Math.max(0, currSolar - prevSolar);
    const consumoTotal = consumoRed + prodBruta;
    const autonomia = consumoTotal > 0 ? (prodBruta / consumoTotal) * 100 : 0;
    const precioKw = curr.precioKw || 0;
    const ahorroReal = prodBruta * precioKw;

    // Calculate price variation vs previous
    const prevPrice = prev.precioKw || 0;
    const incPrecio = prevPrice > 0 ? ((precioKw - prevPrice) / prevPrice) * 100 : 0;

    const label = `${monthName(curr.monthIdx)} ${curr.year}`;

    result.push({
      year: curr.year,
      monthIdx: curr.monthIdx,
      consumoRed,
      prodBruta,
      consumoTotal,
      autonomia,
      precioKw,
      incPrecio,
      ahorroReal,
      label,
      // Carry forward raw values for downstream use
      lecturaRed: currRed,
      lecturaSolar: currSolar,
      fecha: curr.fecha,
      id: curr.id,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Filter processed data by year.
 * @param {Array<Object>} processedData - Output from `processData`
 * @param {string|number} year - Year to filter by, or 'all' for no filter
 * @returns {Array<Object>} Filtered array
 */
export function filterByYear(processedData, year) {
  if (year === 'all' || year === undefined || year === null) {
    return processedData;
  }
  const y = parseInt(year, 10);
  return processedData.filter((d) => d.year === y);
}

// ---------------------------------------------------------------------------
// Projections / Predictive Analytics
// ---------------------------------------------------------------------------

/**
 * Calculate predictive analytics from processed data:
 * - Linear regression on kW price to project future trend
 * - Best month for solar generation
 * - Estimated avoided CO₂ emissions
 *
 * @param {Array<Object>} data - Processed data array
 * @returns {{ projectedPrice: number, trend: string, trendIcon: string, trendColor: string, bestMonth: string, co2: string }}
 */
export function calcProjections(data) {
  const defaults = {
    projectedPrice: 0,
    trend: '',
    trendIcon: '→',
    trendColor: 'text-gray-400',
    bestMonth: '-',
    co2: '0.00',
  };

  if (!data || data.length < 2) return defaults;

  // --- Linear regression on price (y = mx + b) ---
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = data[i].precioKw || 0;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Project NEXT month (x = n) instead of 12 months ahead
  const projectedPrice = intercept + slope * n;

  // Calculate trend
  let trend, trendIcon, trendColor;
  if (Math.abs(slope) < 0.01) { // practically zero
    trend = t('equal') || 'Igual';
    trendIcon = '→';
    trendColor = 'text-gray-400';
  } else if (slope > 0) {
    trend = t('rising') || 'Sube';
    trendIcon = '↑';
    trendColor = 'text-red-500';
  } else {
    trend = t('falling') || 'Baja';
    trendIcon = '↓';
    trendColor = 'text-green-500';
  }

  // --- Best generation month ---
  const monthTotals = new Map();
  for (const d of data) {
    const key = d.monthIdx;
    monthTotals.set(key, (monthTotals.get(key) || 0) + (d.prodBruta || 0));
  }

  let bestMonthIdx = 1;
  let bestMonthGen = 0;
  for (const [idx, total] of monthTotals) {
    if (total > bestMonthGen) {
      bestMonthGen = total;
      bestMonthIdx = idx;
    }
  }
  const bestMonth = monthName(bestMonthIdx);

  // --- Avoided CO₂ (factor: 0.38 kg/kWh) ---
  const CO2_FACTOR = 0.38;
  const totalGen = data.reduce((s, d) => s + (d.prodBruta || 0), 0);
  const co2 = fDec(totalGen * CO2_FACTOR, 2);

  return { projectedPrice, trend, trendIcon, trendColor, bestMonth, co2 };
}

// ---------------------------------------------------------------------------
// KPI Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate key performance indicators from view data, all processed data,
 * and investment phases.
 *
 * @param {Array<Object>} viewData - Currently filtered processed data
 * @param {Array<Object>} allData - All processed data (for ROI calculation)
 * @param {Array<Object>} investments - Investment phases array, each with
 *   `investment_cop` and `start_date`
 * @returns {{
 *   savings: number,
 *   gen: number,
 *   autonomy: number,
 *   varKw: number,
 *   roi: number,
 *   avgSavings: number
 * }}
 */
export function calcKPIs(viewData, allData, investments) {
  const defaults = { savings: 0, gen: 0, autonomy: 0, varKw: 0, roi: 0, avgSavings: 0 };

  if (!viewData || viewData.length === 0) return defaults;

  // Total savings (from filtered view)
  const savings = viewData.reduce((s, d) => s + (d.ahorroReal || 0), 0);

  // Total net generation
  const gen = viewData.reduce((s, d) => s + (d.prodBruta || 0), 0);

  // Average energy autonomy
  const autonomy = viewData.reduce((s, d) => s + (d.autonomia || 0), 0) / viewData.length;

  // Average kW price variation
  const varKw = viewData.reduce((s, d) => s + (d.incPrecio || 0), 0) / viewData.length;

  // --- ROI & Payback from ALL data + investments ---
  const totalSavingsAll = allData.reduce((s, d) => s + (d.ahorroReal || 0), 0);
  const totalInvestment = (investments || []).reduce(
    (s, inv) => s + (inv.investment_cop || 0),
    0,
  );

  let roi = 0;
  if (totalInvestment > 0) {
    roi = ((totalSavingsAll - totalInvestment) / totalInvestment) * 100;
  }

  // Average monthly savings (from current view data for consistency with UI)
  const avgSavings = viewData.length > 0 ? savings / viewData.length : 0;

  return { savings, gen, autonomy, varKw, roi, avgSavings };
}
