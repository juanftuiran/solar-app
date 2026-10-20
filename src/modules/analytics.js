/**
 * @module analytics
 * Analytics, data processing, IEC 61724 solar engineering metrics,
 * anomaly detection, and econometric / financial simulation (WLS, NPV, IRR, LCOE).
 */

import { state } from './state.js';
import { fCOP, fDec } from './formatters.js';
import { t, monthName } from './i18n.js';

// ---------------------------------------------------------------------------
// Data Processing (IEC 61724 Standard)
// ---------------------------------------------------------------------------

/**
 * Extract the initial baseline reading (`rawData[0]`) for audit visibility and editing.
 * @param {Array<Object>} rawData
 * @returns {Object|null}
 */
export function getBaseRecord(rawData) {
  if (!rawData || rawData.length === 0) return null;
  const first = rawData[0];
  const currRed = first.lecturaRed ?? first.medidorRed ?? 0;
  const currSolar = first.lecturaSolar ?? first.inversores ?? 0;
  return {
    isBaseRecord: true,
    id: first.id,
    year: first.year,
    monthIdx: first.monthIdx,
    fecha: first.fecha,
    label: `${monthName(first.monthIdx)} ${first.year}`,
    lecturaRed: currRed,
    lecturaSolar: currSolar,
    precioKw: first.precioKw || 0,
    inverter_reset: !!first.inverter_reset,
    meter_reset: !!first.meter_reset,
  };
}

/**
 * Process raw solar readings into derived metrics according to IEC 61724 solar standards.
 *
 * @param {Array<Object>} rawData - Raw solar_readings from the database.
 * @param {number|null} [capacityKw=null] - Plant capacity in kW. Defaults to activeProject.capacity_kw.
 * @returns {Array<Object>} Processed data array
 */
export function processData(rawData, capacityKw = null) {
  if (!rawData || rawData.length < 2) return [];

  const plantCapacity = capacityKw !== null && capacityKw !== undefined
    ? parseFloat(capacityKw) || 0
    : (parseFloat(state.activeProject?.capacity_kw) || 0);

  const refHsp = parseFloat(state.simParams?.refHsp) || 4.5;
  const result = [];

  for (let i = 1; i < rawData.length; i++) {
    const prev = rawData[i - 1];
    const curr = rawData[i];

    const currRed = curr.lecturaRed ?? curr.medidorRed ?? 0;
    const prevRed = prev.lecturaRed ?? prev.medidorRed ?? 0;
    const currSolar = curr.lecturaSolar ?? curr.inversores ?? 0;
    const prevSolar = prev.lecturaSolar ?? prev.inversores ?? 0;

    // Reset handlers for hardware replacements
    const consumoRed = curr.meter_reset ? currRed : Math.max(0, currRed - prevRed);
    const prodBruta = curr.inverter_reset ? currSolar : Math.max(0, currSolar - prevSolar);
    const consumoTotal = consumoRed + prodBruta;
    const autonomia = consumoTotal > 0 ? (prodBruta / consumoTotal) * 100 : 0;
    const precioKw = curr.precioKw || 0;
    const ahorroReal = prodBruta * precioKw;

    const prevPrice = prev.precioKw || 0;
    const incPrecio = prevPrice > 0 ? ((precioKw - prevPrice) / prevPrice) * 100 : 0;

    // Billing cycle days calculation
    let daysInPeriod = 30;
    if (curr.fecha && prev.fecha) {
      const dCurr = new Date(curr.fecha + 'T00:00:00');
      const dPrev = new Date(prev.fecha + 'T00:00:00');
      const diffTime = Math.abs(dCurr - dPrev);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 1 && diffDays <= 90) {
        daysInPeriod = diffDays;
      }
    }

    // Solar Engineering Metrics (IEC 61724 Standard)
    // Specific Yield (Yf): Energy per installed capacity (kWh/kWp)
    const specificYield = plantCapacity > 0 ? prodBruta / plantCapacity : 0;

    // Equivalent Peak Sun Hours (HSP): Daily average peak sunshine (h/day)
    const hsp = (plantCapacity > 0 && daysInPeriod > 0)
      ? prodBruta / (plantCapacity * daysInPeriod)
      : 0;

    // Performance Ratio (PR %): Actual Yield vs Reference Theoretical Yield
    const pr = (hsp > 0 && refHsp > 0) ? Math.min(100, (hsp / refHsp) * 100) : 0;

    // Normalized daily rates
    const prodDiaria = daysInPeriod > 0 ? prodBruta / daysInPeriod : 0;
    const consumoDiario = daysInPeriod > 0 ? consumoRed / daysInPeriod : 0;
    const consumoTotalDiario = daysInPeriod > 0 ? consumoTotal / daysInPeriod : 0;

    // Operational Health Classification
    let healthScore = 'optimo';
    let healthLabel = t('healthOptimo');
    if (hsp > 0) {
      if (hsp >= 4.0) {
        healthScore = 'optimo';
        healthLabel = t('healthOptimo');
      } else if (hsp >= 3.2) {
        healthScore = 'normal';
        healthLabel = t('healthNormal');
      } else {
        healthScore = 'atencion';
        healthLabel = t('healthAttention');
      }
    }

    const label = `${monthName(curr.monthIdx)} ${curr.year}`;

    result.push({
      year: curr.year,
      monthIdx: curr.monthIdx,
      consumoRed,
      prodBruta,
      consumoTotal,
      autonomia,
      precioKw,
      prevPrice,
      incPrecio,
      ahorroReal,
      label,
      lecturaRed: currRed,
      lecturaSolar: currSolar,
      prevLecturaRed: prevRed,
      prevLecturaSolar: prevSolar,
      prevFecha: prev.fecha,
      fecha: curr.fecha,
      id: curr.id,
      inverter_reset: !!curr.inverter_reset,
      meter_reset: !!curr.meter_reset,
      daysInPeriod,
      specificYield,
      hsp,
      pr,
      prodDiaria,
      consumoDiario,
      consumoTotalDiario,
      healthScore,
      healthLabel,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export function filterByYear(processedData, year) {
  if (year === 'all' || year === undefined || year === null) {
    return processedData;
  }
  const y = parseInt(year, 10);
  return processedData.filter((d) => d.year === y);
}

/**
 * Get sorted list of unique years present in processedData and rawData.
 * @param {Array<Object>} processedData
 * @param {Array<Object>} [rawData=[]]
 * @returns {Array<number>} Descending list of years
 */
export function getAvailableYears(processedData = [], rawData = []) {
  const yearSet = new Set();
  for (const d of processedData) {
    if (d.year) yearSet.add(Number(d.year));
  }
  for (const r of rawData) {
    if (r.year) yearSet.add(Number(r.year));
  }
  if (yearSet.size === 0) {
    yearSet.add(new Date().getFullYear());
  }
  return Array.from(yearSet).sort((a, b) => b - a);
}

// ---------------------------------------------------------------------------
// Anomaly Detection & Smart Operational Diagnostics
// ---------------------------------------------------------------------------

/**
 * Detect operational anomalies in the latest readings (generation drop, tariff spike, low HSP).
 * @param {Array<Object>} data - Processed readings
 * @returns {Array<{ type: 'warning'|'info'|'success', titleEs: string, titleEn: string, descEs: string, descEn: string }>}
 */
export function detectAnomalies(data) {
  if (!data || data.length < 2) return [];
  const alerts = [];
  const last = data[data.length - 1];
  const prevSlice = data.slice(Math.max(0, data.length - 4), data.length - 1);

  if (prevSlice.length > 0) {
    const avgDailyPrev = prevSlice.reduce((s, d) => s + (d.prodDiaria || 0), 0) / prevSlice.length;
    if (avgDailyPrev > 0 && last.prodDiaria < avgDailyPrev * 0.78) {
      const dropPct = Math.round(((avgDailyPrev - last.prodDiaria) / avgDailyPrev) * 100);
      alerts.push({
        type: 'warning',
        titleEs: `Caída de Generación Detectada (-${dropPct}%)`,
        titleEn: `Generation Drop Detected (-${dropPct}%)`,
        descEs: `El ritmo diario en ${last.label} (${fDec(last.prodDiaria, 1)} kWh/d) estuvo por debajo de la media reciente (${fDec(avgDailyPrev, 1)} kWh/d). Se recomienda verificar limpieza de módulos o sombreado.`,
        descEn: `Daily rate in ${last.label} (${fDec(last.prodDiaria, 1)} kWh/d) fell below the recent average (${fDec(avgDailyPrev, 1)} kWh/d). Check panel soiling or shading.`,
      });
    }
  }

  if (last.incPrecio > 8.0) {
    alerts.push({
      type: 'info',
      titleEs: `Alza Tarifaria Atípica (+${fDec(last.incPrecio, 1)}%)`,
      titleEn: `Unusual Tariff Spike (+${fDec(last.incPrecio, 1)}%)`,
      descEs: `La tarifa de red subió a ${fCOP(last.precioKw)}/kWh en ${last.label}, acelerando automáticamente el retorno de inversión solar.`,
      descEn: `Grid tariff rose to ${fCOP(last.precioKw)}/kWh in ${last.label}, automatically accelerating your solar payback.`,
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Econometric & Predictive Analytics (WLS)
// ---------------------------------------------------------------------------

/**
 * Calculate professional predictive analytics for energy tariffs and solar ROI.
 * @param {Array<Object>} data - Processed data array
 * @returns {Object} Forecast metrics object
 */
export function calcProjections(data) {
  const defaults = {
    projectedPrice: 0,
    confidenceMargin: 0,
    rSquared: 0,
    cagrPct: 0,
    projectedPrice6m: 0,
    projectedPrice12m: 0,
    projectedMonthlySavings: 0,
    trend: t('equal'),
    trendIcon: 'fa-minus',
    trendColor: 'text-muted',
    bestMonth: '—',
    bestMonthGen: 0,
    co2: '0.0',
    trees: 0,
  };

  if (!data || data.length < 2) return defaults;

  const n = data.length;
  const prices = data.map((d) => d.precioKw || 0);

  // --- 1. Weighted Linear Regression (Higher weight on recent records) ---
  let sumW = 0;
  let sumWX = 0;
  let sumWY = 0;
  let sumWXY = 0;
  let sumWX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = prices[i];
    const w = Math.exp((1.2 * i) / n);

    sumW += w;
    sumWX += w * x;
    sumWY += w * y;
    sumWXY += w * x * y;
    sumWX2 += w * x * x;
  }

  const denomW = sumW * sumWX2 - sumWX * sumWX;
  const slope = denomW !== 0 ? (sumW * sumWXY - sumWX * sumWY) / denomW : 0;
  const intercept = (sumWY - slope * sumWX) / sumW;

  const projectedPrice = Math.max(0, intercept + slope * n);
  const projectedPrice6m = Math.max(0, intercept + slope * (n + 5));
  const projectedPrice12m = Math.max(0, intercept + slope * (n + 11));

  // --- 2. Residual Analysis & R² Score ---
  let ssTot = 0;
  let ssRes = 0;
  const meanY = sumWY / sumW;

  for (let i = 0; i < n; i++) {
    const y = prices[i];
    const yHat = intercept + slope * i;
    ssTot += (y - meanY) ** 2;
    ssRes += (y - yHat) ** 2;
  }

  const rSquared = ssTot > 0 ? Math.max(0, Math.min(0.99, 1 - ssRes / ssTot)) : 0.85;
  const stdError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : (prices[n - 1] * 0.03);
  const confidenceMargin = Math.round(stdError * 1.645); // ~90% confidence band

  // --- 3. Compound Annual Growth Rate (CAGR) ---
  const firstPrice = prices[0] || 1;
  const lastPrice = prices[n - 1] || 1;
  const periodsInYears = Math.max(0.25, (n - 1) / 12);
  const cagrPct = ((Math.pow(lastPrice / firstPrice, 1 / periodsInYears) - 1) * 100);

  // --- 4. Trend Categorization ---
  let trend, trendIcon, trendColor;
  const monthlySlopePct = lastPrice > 0 ? (slope / lastPrice) * 100 : 0;

  if (monthlySlopePct > 0.8) {
    trend = t('rising');
    trendIcon = 'fa-arrow-trend-up';
    trendColor = 'text-danger';
  } else if (monthlySlopePct > 0.1) {
    trend = t('risingMod');
    trendIcon = 'fa-arrow-up-right-dots';
    trendColor = 'text-warning';
  } else if (monthlySlopePct < -0.8) {
    trend = t('falling');
    trendIcon = 'fa-arrow-trend-down';
    trendColor = 'text-solar';
  } else if (monthlySlopePct < -0.1) {
    trend = t('fallingMod');
    trendIcon = 'fa-arrow-down-right-dots';
    trendColor = 'text-solar';
  } else {
    trend = t('equal');
    trendIcon = 'fa-minus';
    trendColor = 'text-muted';
  }

  // --- 5. Projected Monthly Solar Savings ---
  const last3 = data.slice(-3);
  const avgGenRecent = last3.reduce((s, d) => s + (d.prodBruta || 0), 0) / Math.max(1, last3.length);
  const projectedMonthlySavings = Math.round(avgGenRecent * projectedPrice);

  // --- 6. Best Generation Month ---
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
  const bestMonth = `${monthName(bestMonthIdx)} (${fDec(bestMonthGen, 0)} kWh)`;

  // --- 7. Avoided CO₂ & Tree Equivalence ---
  const CO2_FACTOR = 0.38; // 0.38 kg CO2 / kWh
  const totalGen = data.reduce((s, d) => s + (d.prodBruta || 0), 0);
  const co2Val = totalGen * CO2_FACTOR;
  const co2 = fDec(co2Val, 1);
  const trees = Math.round(co2Val / 22);

  return {
    projectedPrice: Math.round(projectedPrice),
    confidenceMargin,
    rSquared: Math.round(rSquared * 100),
    cagrPct: parseFloat(cagrPct.toFixed(1)),
    projectedPrice6m: Math.round(projectedPrice6m),
    projectedPrice12m: Math.round(projectedPrice12m),
    projectedMonthlySavings,
    trend,
    trendIcon,
    trendColor,
    bestMonth,
    bestMonthGen,
    co2,
    trees,
  };
}

// ---------------------------------------------------------------------------
// 25-Year Financial Valuation & Simulator (NPV / VPN, IRR / TIR, LCOE)
// ---------------------------------------------------------------------------

/**
 * Compute Internal Rate of Return (IRR / TIR) using Newton-Raphson with bisection fallback.
 * @param {Array<number>} cashFlows - Array where index 0 is initial net cashflow (negative)
 * @returns {number|null} Annual IRR percentage (e.g. 24.5 for 24.5%) or null if undefined
 */
function computeIRR(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) return null;
  const hasNegative = cashFlows.some((cf) => cf < 0);
  const hasPositive = cashFlows.some((cf) => cf > 0);
  if (!hasNegative || !hasPositive) return null;

  const npvAt = (rate) => {
    let sum = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      sum += cashFlows[t] / Math.pow(1 + rate, t);
    }
    return sum;
  };

  // Bisection search between -0.50 and +5.00 (-50% to +500%)
  let low = -0.45;
  let high = 5.0;
  let fLow = npvAt(low);
  let fHigh = npvAt(high);

  if (fLow * fHigh > 0) return null;

  for (let iter = 0; iter < 80; iter++) {
    const mid = (low + high) / 2;
    const fMid = npvAt(mid);
    if (Math.abs(fMid) < 1e-3) return mid * 100;
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return ((low + high) / 2) * 100;
}

/**
 * Run the 25-Year Financial & Energy Simulation with configurable parameters.
 * @param {Array<Object>} processed - Processed readings
 * @param {Array<Object>} investments - Investment phases
 * @param {Object} [params] - { inflation, degradation, discountRate }
 * @returns {Object} Full 25-year series and institutional valuation KPIs (NPV, IRR, LCOE, ROI)
 */
export function calcFinancialSimulation(processed = [], investments = [], params = null) {
  const sim = params || state.simParams || { inflation: 4.0, degradation: 0.4, discountRate: 8.0 };
  const DEGRADATION = (parseFloat(sim.degradation) ?? 0.4) / 100;
  const INFLATION = (parseFloat(sim.inflation) ?? 4.0) / 100;
  const DISCOUNT_RATE = (parseFloat(sim.discountRate) ?? 8.0) / 100;
  const YEARS = 25;

  const avgGen = processed.length > 0
    ? processed.reduce((s, d) => s + (d.prodBruta || 0), 0) / processed.length
    : 0;

  const lastPrice = processed.length > 0 ? (processed[processed.length - 1].precioKw || 0) : 0;
  const avgPrice = lastPrice > 0
    ? lastPrice
    : (processed.length > 0
        ? processed.reduce((s, d) => s + (d.precioKw || 0), 0) / processed.length
        : 0);

  const totalInvestment = investments.reduce(
    (s, inv) => s + (parseFloat(inv.investment_cop) || 0),
    0,
  );

  const firstInvestmentYear = investments.length > 0 && investments[0].start_date
    ? new Date(investments[0].start_date + 'T00:00:00').getFullYear()
    : (processed.length > 0 ? processed[0].year : new Date().getFullYear());

  const phases = investments
    .map((inv) => ({
      year: inv.start_date ? new Date(inv.start_date + 'T00:00:00').getFullYear() : firstInvestmentYear,
      capacity: parseFloat(inv.capacity_added_kw) || 0,
      amount: parseFloat(inv.investment_cop) || 0,
    }))
    .sort((a, b) => a.year - b.year);

  const baseCapacity = phases.length > 0 && phases[0].capacity > 0
    ? phases[0].capacity
    : (parseFloat(state.activeProject?.capacity_kw) || 0);

  const labels = [];
  const genData = [];
  const savingsData = [];
  const cumulatedSavings = [];
  const investmentLine = [];
  const tableRows = [];
  const netCashFlows = [];

  let cumSavings = 0;
  let npv = 0;
  let discountedGen = 0;
  let discountedCapex = 0;

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

    let yearInvestment = 0;
    let yearCapexOutflow = 0;
    let yearCapacity = 0;

    for (const phase of phases) {
      if (phase.year <= year) {
        yearInvestment += phase.amount;
        yearCapacity += phase.capacity;
      }
      if (phase.year === year || (i === 0 && phase.year <= year)) {
        yearCapexOutflow += phase.amount;
      }
    }

    if (phases.length === 0 && i === 0) {
      yearCapexOutflow = totalInvestment;
    }

    investmentLine.push(yearInvestment || totalInvestment);

    const capacityMultiplier = (baseCapacity > 0 && yearCapacity > 0)
      ? yearCapacity / baseCapacity
      : 1;

    const realYear = realYears.get(year);
    let yearGen;
    if (realYear) {
      yearGen = realYear.gen;
      if (year >= currentYear && realYear.count < 12) {
        yearGen += (avgLast3 || avgGen) * (12 - realYear.count);
      }
    } else {
      const baseAnnualGen = avgGen > 0
        ? avgGen * 12
        : (baseCapacity > 0 ? baseCapacity * 1350 : 0);
      yearGen = baseAnnualGen * capacityMultiplier * Math.pow(1 - DEGRADATION, i);
    }
    genData.push(parseFloat(yearGen.toFixed(1)));

    const yearPrice = avgPrice * Math.pow(1 + INFLATION, i);
    const annualSavings = yearGen * yearPrice;
    savingsData.push(Math.round(annualSavings));

    cumSavings += annualSavings;
    cumulatedSavings.push(Math.round(cumSavings));

    // Net cashflow for year i:
    // At i=0, we place -yearCapexOutflow as initial outlay and +annualSavings at t=1..N,
    // or standard project cashflow where t=0 is initial investment and t=1..25 are operating flows.
    const discountFactor = Math.pow(1 + DISCOUNT_RATE, i + 1);
    const capexDiscountFactor = Math.pow(1 + DISCOUNT_RATE, i);
    npv += (annualSavings / discountFactor) - (yearCapexOutflow / capexDiscountFactor);
    discountedGen += yearGen / discountFactor;
    discountedCapex += yearCapexOutflow / capexDiscountFactor;

    if (i === 0) {
      netCashFlows.push(-yearCapexOutflow);
      netCashFlows.push(annualSavings);
    } else {
      netCashFlows.push(annualSavings - yearCapexOutflow);
    }

    tableRows.push({
      year,
      gen: yearGen,
      tariff: yearPrice,
      savings: annualSavings,
      cumSavings,
      investment: investmentLine[i],
      netPosition: cumSavings - investmentLine[i],
    });
  }

  const breakevenIdx = cumulatedSavings.findIndex((v, i) => investmentLine[i] > 0 && v >= investmentLine[i]);
  const breakevenYear = breakevenIdx >= 0 ? labels[breakevenIdx] : null;
  const finalCum = cumulatedSavings[cumulatedSavings.length - 1] || 0;
  const totalGen = genData.reduce((s, v) => s + v, 0);
  const roi25 = totalInvestment > 0 ? ((finalCum - totalInvestment) / totalInvestment) * 100 : 0;
  const irr = totalInvestment > 0 ? computeIRR(netCashFlows) : null;
  const lcoe = (discountedGen > 0 && discountedCapex > 0) ? (discountedCapex / discountedGen) : 0;

  return {
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
    npv: Math.round(npv),
    irr,
    lcoe: Math.round(lcoe),
    assumptions: {
      inflation: sim.inflation,
      degradation: sim.degradation,
      discountRate: sim.discountRate,
    },
  };
}

// ---------------------------------------------------------------------------
// KPI Calculation
// ---------------------------------------------------------------------------

export function calcKPIs(viewData, allData, investments, plantCapacityKw = null) {
  const capacity = plantCapacityKw !== null && plantCapacityKw !== undefined
    ? parseFloat(plantCapacityKw) || 0
    : (parseFloat(state.activeProject?.capacity_kw) || 0);

  const refHsp = parseFloat(state.simParams?.refHsp) || 4.5;

  const defaults = {
    savings: 0,
    gen: 0,
    autonomy: 0,
    varKw: 0,
    roi: 0,
    avgSavings: 0,
    specificYield: 0,
    avgHsp: 0,
    lastHsp: 0,
    hsp: 0,
    pr: 0,
    avgDailyGen: 0,
    avgDailyConsumption: 0,
    healthScore: 'optimo',
    healthLabel: t('healthOptimo'),
    deltas: { savings: null, gen: null, autonomy: null, price: null },
  };

  if (!viewData || viewData.length === 0) return defaults;

  const sortedViewData = [...viewData].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if ((a.monthIdx || 0) !== (b.monthIdx || 0)) return (a.monthIdx || 0) - (b.monthIdx || 0);
    return (a.fecha || '').localeCompare(b.fecha || '');
  });

  const savings = viewData.reduce((s, d) => s + (d.ahorroReal || 0), 0);
  const gen = viewData.reduce((s, d) => s + (d.prodBruta || 0), 0);

  const last3Autonomy = sortedViewData.slice(-3);
  const autonomy = last3Autonomy.length > 0
    ? last3Autonomy.reduce((s, d) => s + (d.autonomia || 0), 0) / last3Autonomy.length
    : 0;

  const varKw = viewData.reduce((s, d) => s + (d.incPrecio || 0), 0) / viewData.length;

  const totalSavingsAll = (allData || []).reduce((s, d) => s + (d.ahorroReal || 0), 0);
  const totalInvestment = (investments || []).reduce(
    (s, inv) => s + (parseFloat(inv.investment_cop) || 0),
    0,
  );

  let roi = 0;
  if (totalInvestment > 0) {
    roi = ((totalSavingsAll - totalInvestment) / totalInvestment) * 100;
  }

  let avgSavings = 0;
  if (allData && allData.length > 0) {
    const last3 = allData.slice(-3);
    const sumLast3 = last3.reduce((s, d) => s + (d.ahorroReal || 0), 0);
    avgSavings = sumLast3 / last3.length;
  }

  // Month-over-Month Deltas (last record vs previous record in sortedViewData)
  const deltas = { savings: null, gen: null, autonomy: null, price: null };
  if (sortedViewData.length >= 2) {
    const curr = sortedViewData[sortedViewData.length - 1];
    const prev = sortedViewData[sortedViewData.length - 2];
    if (prev.ahorroReal > 0) {
      deltas.savings = ((curr.ahorroReal - prev.ahorroReal) / prev.ahorroReal) * 100;
    }
    if (prev.prodBruta > 0) {
      deltas.gen = ((curr.prodBruta - prev.prodBruta) / prev.prodBruta) * 100;
    }
    deltas.autonomy = (curr.autonomia || 0) - (prev.autonomia || 0);
    deltas.price = curr.incPrecio || 0;
  }

  // Solar engineering metrics
  const specificYield = capacity > 0 ? (gen / capacity) : 0;

  const lastRecordOfMonth = sortedViewData[sortedViewData.length - 1];
  let lastHsp = 0;
  if (lastRecordOfMonth) {
    if (capacity > 0 && lastRecordOfMonth.daysInPeriod > 0 && lastRecordOfMonth.prodBruta !== undefined) {
      lastHsp = lastRecordOfMonth.prodBruta / (capacity * lastRecordOfMonth.daysInPeriod);
    } else {
      lastHsp = lastRecordOfMonth.hsp || 0;
    }
  }

  const pr = (lastHsp > 0 && refHsp > 0) ? Math.min(100, (lastHsp / refHsp) * 100) : 0;
  const avgDailyGen = viewData.reduce((s, d) => s + (d.prodDiaria || 0), 0) / viewData.length;
  const avgDailyConsumption = viewData.reduce((s, d) => s + (d.consumoTotalDiario || 0), 0) / viewData.length;

  let healthScore = 'optimo';
  let healthLabel = t('healthOptimo');
  if (lastHsp > 0) {
    if (lastHsp >= 4.0) {
      healthScore = 'optimo';
      healthLabel = t('healthOptimo');
    } else if (lastHsp >= 3.2) {
      healthScore = 'normal';
      healthLabel = t('healthNormal');
    } else {
      healthScore = 'atencion';
      healthLabel = t('healthAttention');
    }
  }

  return {
    savings,
    gen,
    autonomy,
    varKw,
    roi,
    avgSavings,
    specificYield,
    avgHsp: lastHsp,
    lastHsp,
    hsp: lastHsp,
    pr,
    avgDailyGen,
    avgDailyConsumption,
    healthScore,
    healthLabel,
    deltas,
  };
}
