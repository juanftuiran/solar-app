/**
 * @module solarman/parser
 * @description Universal Solarman dataList parser and historical telemetry normalizer.
 */

export function parseDeviceCurrentData(rawCurrentData = {}, stationRealTime = {}, activeStation = {}, project = {}) {
  const dataList = Array.isArray(rawCurrentData.dataList) ? rawCurrentData.dataList : [];
  const collectionTime =
    Number(rawCurrentData.collectionTime) ||
    Number(stationRealTime?.lastUpdateTime) ||
    Math.floor(Date.now() / 1000);

  // Helper to convert unit-scaled numeric values
  const toWatts = (val, unit = '') => {
    const n = parseFloat(val);
    if (Number.isNaN(n)) return 0;
    const u = String(unit).toLowerCase().trim();
    if (u === 'kw' || u === 'kva') return n * 1000;
    if (u === 'mw') return n * 1e6;
    return n;
  };

  const toKwh = (val, unit = '') => {
    const n = parseFloat(val);
    if (Number.isNaN(n)) return 0;
    const u = String(unit).toLowerCase().trim();
    if (u === 'wh') return n / 1000;
    if (u === 'mwh') return n * 1000;
    return n;
  };

  const findItem = (regexList) => {
    for (const rx of regexList) {
      const hit = dataList.find(item => rx.test(String(item.name || '')) || rx.test(String(item.key || '')));
      if (hit && hit.value !== undefined && hit.value !== null && hit.value !== '') {
        return hit;
      }
    }
    return null;
  };

  // 1. Extract DC MPPT Strings (PV1 .. PV4)
  const pvStrings = [];
  for (let i = 1; i <= 4; i++) {
    const vItem = findItem([
      new RegExp(`^dc\\s*voltage\\s*pv${i}$`, 'i'),
      new RegExp(`^pv${i}\\s*voltage`, 'i'),
      new RegExp(`^voltage\\s*pv${i}`, 'i'),
      new RegExp(`^dv${i}$`, 'i'),
      new RegExp(`^v_?pv${i}$`, 'i'),
      new RegExp(`string\\s*${i}\\s*voltage`, 'i'),
      new RegExp(`pv\\s*${i}\\s*voltage`, 'i'),
    ]);
    const cItem = findItem([
      new RegExp(`^dc\\s*current\\s*pv${i}$`, 'i'),
      new RegExp(`^pv${i}\\s*current`, 'i'),
      new RegExp(`^current\\s*pv${i}`, 'i'),
      new RegExp(`^dc${i}$`, 'i'),
      new RegExp(`^i_?pv${i}$`, 'i'),
      new RegExp(`string\\s*${i}\\s*current`, 'i'),
      new RegExp(`pv\\s*${i}\\s*current`, 'i'),
    ]);
    const pItem = findItem([
      new RegExp(`^dc\\s*power\\s*pv${i}$`, 'i'),
      new RegExp(`^pv${i}\\s*power`, 'i'),
      new RegExp(`^power\\s*pv${i}`, 'i'),
      new RegExp(`^dp${i}$`, 'i'),
      new RegExp(`^p_?pv${i}$`, 'i'),
      new RegExp(`pv\\s*${i}\\s*power`, 'i'),
    ]);

    const voltageV = vItem ? parseFloat(vItem.value) || 0 : 0;
    const currentA = cItem ? parseFloat(cItem.value) || 0 : 0;
    const powerW = pItem
      ? toWatts(pItem.value, pItem.unit)
      : Math.round(voltageV * currentA);

    if (vItem || cItem || pItem || i <= 2) {
      pvStrings.push({
        id: `PV${i}`,
        label: `MPPT / String PV${i}`,
        voltageV,
        currentA,
        powerW,
        active: voltageV > 5 || powerW > 0,
      });
    }
  }

  // 2. Extract AC Output / Grid Phases (L1, L2, L3)
  const acPhases = [];
  const phaseAliases = [
    {
      id: 'L1',
      patternsV: [
        /ac\s*voltage\s*(r|u|a|l1|1)\b/i,
        /^(output|inverter|load)\s*(l1|1)?\s*voltage\b/i,
        /^grid\s*voltage\s*(l1|r|a)?$/i,
        /^av1$/i,
        /^vac1$/i,
        /^u_ac1$/i,
        /^vac_l1$/i,
      ],
      patternsI: [
        /ac\s*current\s*(r|u|a|l1|1)\b/i,
        /^(output|inverter|load)\s*(l1|1)?\s*current\b/i,
        /^grid\s*current\s*(l1|r|a)?$/i,
        /^ac1$/i,
        /^iac1$/i,
        /^i_ac1$/i,
        /^iac_l1$/i,
      ],
    },
    {
      id: 'L2',
      patternsV: [
        /ac\s*voltage\s*(s|v|b|l2|2)\b/i,
        /^(output|inverter|load)\s*(l2|2)\s*voltage\b/i,
        /^grid\s*voltage\s*(l2|s|b)$/i,
        /^av2$/i,
        /^vac2$/i,
        /^u_ac2$/i,
        /^vac_l2$/i,
      ],
      patternsI: [
        /ac\s*current\s*(s|v|b|l2|2)\b/i,
        /^(output|inverter|load)\s*(l2|2)\s*current\b/i,
        /^grid\s*current\s*(l2|s|b)$/i,
        /^ac2$/i,
        /^iac2$/i,
        /^i_ac2$/i,
        /^iac_l2$/i,
      ],
    },
    {
      id: 'L3',
      patternsV: [
        /ac\s*voltage\s*(t|w|c|l3|3)\b/i,
        /^(output|inverter|load)\s*(l3|3)\s*voltage\b/i,
        /^grid\s*voltage\s*(l3|t|c)$/i,
        /^av3$/i,
        /^vac3$/i,
        /^u_ac3$/i,
        /^vac_l3$/i,
      ],
      patternsI: [
        /ac\s*current\s*(t|w|c|l3|3)\b/i,
        /^(output|inverter|load)\s*(l3|3)\s*current\b/i,
        /^grid\s*current\s*(l3|t|c)$/i,
        /^ac3$/i,
        /^iac3$/i,
        /^i_ac3$/i,
        /^iac_l3$/i,
      ],
    },
  ];

  const freqItem = findItem([
    /ac\s*output\s*frequency/i,
    /output\s*frequency/i,
    /inverter\s*frequency/i,
    /grid\s*frequency/i,
    /frequency/i,
    /^fac$/i,
    /^f_ac$/i,
    /^a_fo1$/i,
  ]);
  const gridFreqHz = freqItem ? parseFloat(freqItem.value) || 0 : 0;

  for (const ph of phaseAliases) {
    const vIt = findItem(ph.patternsV);
    const iIt = findItem(ph.patternsI);
    const vVal = vIt ? parseFloat(vIt.value) || 0 : 0;
    const iVal = iIt ? parseFloat(iIt.value) || 0 : 0;
    if (vIt || iIt || ph.id === 'L1') {
      acPhases.push({
        id: ph.id,
        voltageV: vVal,
        currentA: iVal,
        freqHz: gridFreqHz,
      });
    }
  }

  // Detect split-phase (e.g. 120V / 240V split-phase common in Colombia / Americas)
  const isSplitPhase =
    acPhases.length >= 2 &&
    acPhases[0].voltageV >= 90 &&
    acPhases[0].voltageV <= 145 &&
    acPhases[1].voltageV >= 90 &&
    acPhases[1].voltageV <= 145;

  // 3. Extract Core Power & Energy Totals
  const acPowerItem = findItem([
    /total\s*ac\s*output\s*power/i,
    /^output\s*(active\s*)?power$/i,
    /^inverter\s*(ac\s*)?power$/i,
    /^active\s*power$/i,
    /^generation\s*power$/i,
    /^pac$/i,
    /^APo_t1$/i,
  ]);

  const dcPowerItem = findItem([
    /total\s*dc\s*input\s*power/i,
    /total\s*pv\s*power/i,
    /^pv\s*power$/i,
    /^dc\s*power$/i,
    /^DPi_t1$/i,
    /^p_pv$/i,
  ]);

  const sumPvPowerW = pvStrings.reduce((acc, s) => acc + (s.powerW || 0), 0);
  const rtGenPowerW = parseFloat(stationRealTime?.generationPower) || parseFloat(activeStation?.generationPower) || 0;

  // Grid, Load and Battery Telemetry
  const gridPowerItem = findItem([/total\s*grid\s*power/i, /grid\s*power/i, /meter\s*active\s*power/i, /^pg_pt1$/i]);
  const loadPowerItem = findItem([/total\s*consumption\s*power/i, /load\s*power/i, /consumption\s*power/i, /^e_puse_t1$/i, /^p_load$/i]);
  const battPowerItem = findItem([/battery\s*power/i, /bater[ií]a.*potencia/i, /^p_batt$/i]);
  const battSocItem = findItem([
    /battery\s*soc/i,
    /^soc$/i,
    /battery\s*capacity/i,
    /battery\s*level/i,
    /state\s*of\s*charge/i,
    /bater[ií]a.*soc/i,
    /^battery$/i,
  ]);
  const battVoltageItem = findItem([/battery\s*voltage/i, /bater[ií]a.*voltaje/i, /^v_batt$/i]);
  const battCurrentItem = findItem([/battery\s*current/i, /bater[ií]a.*corriente/i, /^i_batt$/i]);

  const gridPowerW = gridPowerItem
    ? toWatts(gridPowerItem.value, gridPowerItem.unit)
    : parseFloat(stationRealTime?.gridPower ?? stationRealTime?.wirePower) || 0;

  // If load power not given as single metric, try summing phase loads (e.g. SRNE Load L1 + Load L2)
  let loadPowerW = loadPowerItem
    ? toWatts(loadPowerItem.value, loadPowerItem.unit)
    : parseFloat(stationRealTime?.usePower) || 0;

  if (!loadPowerW) {
    const l1p = findItem([/load\s*l1\s*power/i, /load\s*1\s*power/i]);
    const l2p = findItem([/load\s*l2\s*power/i, /load\s*2\s*power/i]);
    const sumPhaseLoads = (l1p ? toWatts(l1p.value, l1p.unit) : 0) + (l2p ? toWatts(l2p.value, l2p.unit) : 0);
    if (sumPhaseLoads > 0) loadPowerW = sumPhaseLoads;
  }

  const batteryPowerW = battPowerItem
    ? toWatts(battPowerItem.value, battPowerItem.unit)
    : parseFloat(stationRealTime?.batteryPower) || 0;

  const batterySocPct = battSocItem
    ? parseFloat(battSocItem.value) || 0
    : parseFloat(stationRealTime?.batterySoc) || null;

  const batteryVoltageV = battVoltageItem ? parseFloat(battVoltageItem.value) || 0 : null;
  const batteryCurrentA = battCurrentItem ? parseFloat(battCurrentItem.value) || 0 : null;

  // System topology classification: Off-Grid vs Hybrid vs On-Grid
  const rawGridType = String(activeStation?.gridInterconnectionType || '').toUpperCase();
  const hasBattery = batterySocPct !== null || batteryPowerW !== 0 || batteryVoltageV !== null;
  const isOffGrid =
    rawGridType === 'OFF_GRID' ||
    rawGridType === 'ISLAND' ||
    rawGridType === 'STAND_ALONE' ||
    (hasBattery && gridPowerW === 0 && (loadPowerW > 0 || sumPvPowerW > 0) && rawGridType !== 'GRID_TIED');

  const systemType = isOffGrid
    ? 'off_grid'
    : hasBattery
      ? 'hybrid'
      : 'on_grid';

  const dcPowerW = dcPowerItem
    ? toWatts(dcPowerItem.value, dcPowerItem.unit)
    : sumPvPowerW > 0
      ? sumPvPowerW
      : rtGenPowerW > 0
        ? Math.round(rtGenPowerW / 0.972)
        : 0;

  // In off-grid/hybrid, solar power can be charging battery while AC output is just load
  const acPowerW = acPowerItem
    ? toWatts(acPowerItem.value, acPowerItem.unit)
    : rtGenPowerW > 0
      ? rtGenPowerW
      : isOffGrid && loadPowerW > 0
        ? loadPowerW
        : sumPvPowerW;

  // Daily Solar Production (Strictly excludes grid export/import, load consumption, battery charge/discharge)
  let dailyYieldItem = null;
  for (const item of dataList) {
    const name = String(item.name || '').trim();
    const key = String(item.key || '').trim();
    const combined = `${name} ${key}`.toLowerCase();

    // Skip grid export/import, load, consumption, battery charge/discharge
    if (/(export|sold|import|bought|load|consumption|consumo|charge|discharge|battery|bater[ií]a|grid|red|meter)/i.test(combined)) {
      continue;
    }

    // Match well-known keys
    if (/^(etdy_ge[0-9]|etdy|e_day|e-day|eday|e_today|e-today|etoday|et_day|e_pday|ep_day|e_tdy|daily_energy|today_energy|e_today1|e_day1|f02f|et_pv_day)$/i.test(key)) {
      dailyYieldItem = item;
      break;
    }

    // Match well-known names across Inverter brands (SRNE, Deye, Solis, Sofar, Growatt)
    if (
      /^(today'?s?\s*(production|generation|yield|pv|solar|energy)|daily\s*(production|generation|yield|pv|solar|energy|ac\s*generation)|day\s*(generation|production|energy|yield)|pv\s*(today|daily)|solar\s*(today|daily)|generaci[oó]n\s*(de\s*hoy|diaria|del\s*d[ií]a)|producci[oó]n\s*(de\s*hoy|diaria|del\s*d[ií]a))/i.test(name) ||
      (/today/i.test(name) && /(production|generation|yield)/i.test(name)) ||
      (/daily/i.test(name) && /(production|generation|yield)/i.test(name))
    ) {
      dailyYieldItem = item;
      break;
    }
  }

  // Daily energy resolution with extensive fallbacks
  const dailyEnergyKwh = dailyYieldItem
    ? toKwh(dailyYieldItem.value, dailyYieldItem.unit)
    : parseFloat(
        stationRealTime?.generationValue ??
        stationRealTime?.todayEnergy ??
        stationRealTime?.dailyEnergy ??
        stationRealTime?.dayEnergy ??
        stationRealTime?.eToday ??
        activeStation?.generationValue ??
        activeStation?.dailyEnergy ??
        0,
      ) || 0;

  // Station summary cumulative energy (Solarman OpenAPI standard: generationTotal)
  const stationTotalKwh = parseFloat(
    stationRealTime?.generationTotal ??
    stationRealTime?.totalGeneration ??
    stationRealTime?.totalEnergy ??
    stationRealTime?.cumulativeEnergy ??
    activeStation?.generationTotal ??
    activeStation?.totalGeneration ??
    activeStation?.totalEnergy ??
    activeStation?.cumulativeEnergy ??
    0,
  ) || 0;

  // Cumulative / Lifetime Inverter Production (Intelligent Scored Candidate Resolver)
  let bestTotalItem = null;
  let bestTotalScore = -1;

  for (const item of dataList) {
    const name = String(item.name || '').trim();
    const key = String(item.key || '').trim();
    const combined = `${name} ${key}`.toLowerCase();
    const valKwh = toKwh(item.value, item.unit);

    // Completely disqualify non-positive or unparseable values
    if (valKwh <= 0 || Number.isNaN(valKwh)) continue;

    // Disqualify time-scoped periodic metrics (today, daily, monthly, yearly, hourly)
    if (/(today|daily|day|month|monthly|year|yearly|anual|diari|hoy|hora|hour|hourly|week|seman)/i.test(combined)) {
      continue;
    }

    // Disqualify pure grid import / bought
    if (/(import|bought|compra|importad)/i.test(combined)) {
      continue;
    }

    // Disqualify battery charge / discharge counters
    if (/(charge|discharge|descarga|carga)/i.test(combined)) {
      continue;
    }

    // Disqualify pure grid export / sold ONLY IF not explicitly labeled as solar production/generation
    if (/(export|sold|venta|exportad)/i.test(combined) && !/(generation|production|generaci|producci)/i.test(combined)) {
      continue;
    }

    // Disqualify battery status registers
    if (/(battery|bater[ií]a)/i.test(combined)) {
      continue;
    }

    let score = 0;

    // 1. Key-based confidence scoring
    if (/^(et_ge[0-9]?|et_total|e_total|e-total|etotal|e_ptotal|ep_total|e_tot|tot_energy|total_energy|total_generation|generation_total)$/i.test(key)) {
      score += 100;
    } else if (/^(et_pv[0-9]?|e_pv_total|epv_total|pv_e_total|e_pv_tot|pv_total_energy)$/i.test(key)) {
      score += 95;
    } else if (/^(f038|f039|f040|f041|inv_et|inv_e_total|e_total1|tot_gen|total_gen|total_prod|tot_prod|et_all|e_all)$/i.test(key)) {
      score += 85;
    }

    // 2. Name-based confidence scoring (supports English, Spanish, multi-brand naming across SRNE, Deye, Solis, Sofar)
    if (/^(total|cumulative|accumulat(ed|ive)|lifetime)\s*(pv|solar)?\s*(generation|production|yield|energy(\s*yield)?)\b/i.test(name)) {
      score += 90;
    } else if (/^(pv|solar)\s*(total|cumulative|accumulat(ed|ive))\s*(generation|production|yield|energy)\b/i.test(name)) {
      score += 90;
    } else if (/^(generaci[oó]n|producci[oó]n|energ[ií]a)\s*total\b/i.test(name)) {
      score += 90;
    } else if (/^total\s*(solar|pv)\s*energy\b/i.test(name)) {
      score += 85;
    } else if (/^total\s*(generation|production|yield)\b/i.test(name)) {
      score += 80;
    } else if (/total\s*active\s*(energy|generation|production)/i.test(name)) {
      score += 80;
    } else if (/inverter\s*(total|cumulative|accumulat(ed|ive))\s*(energy|generation|yield|production)/i.test(name)) {
      score += 80;
    } else if (/^total\s*(energy|yield)$/i.test(name)) {
      score += 70;
    } else if (/(cumulative|accumulat(ed|ive))\s*(energy|generation|production|yield)/i.test(name)) {
      score += 75;
    } else if (/total\s*(output|ac)\s*energy/i.test(name)) {
      score += 65;
    } else if (isOffGrid && /total\s*load\s*energy/i.test(name)) {
      score += 55;
    }

    if (score === 0) continue;

    // 3. Sanity cross-validation with daily generation (cumulative odometer must be >= daily generation)
    if (dailyEnergyKwh > 1.0) {
      if (valKwh >= dailyEnergyKwh * 0.95) {
        score += 20;
      } else {
        score -= 70; // Penalize impossible values smaller than today's production
      }
    }

    // 4. Cross-validation with station-level summary total
    if (stationTotalKwh > 1.0) {
      const diffRatio = Math.abs(valKwh - stationTotalKwh) / stationTotalKwh;
      if (diffRatio < 0.05) {
        score += 40;
      } else if (diffRatio < 0.20) {
        score += 20;
      }
    }

    // 5. Heavy penalty for dummy test counter (1.0 kWh) when day production is higher
    if (Math.abs(valKwh - 1.0) < 0.05 && dailyEnergyKwh > 1.5) {
      score -= 80;
    }

    if (score > bestTotalScore) {
      bestTotalScore = score;
      bestTotalItem = item;
    }
  }

  let totalEnergyKwh = (bestTotalItem && bestTotalScore > 0) ? toKwh(bestTotalItem.value, bestTotalItem.unit) : 0;

  // Multi-tier Fallback Cascade for Inverter Cumulative Reading:
  // Tier 1: If inverter item is 0, suspicious <= 1.0, or smaller than today's generation, use station total
  if ((!totalEnergyKwh || totalEnergyKwh <= 1.0 || (dailyEnergyKwh > 1.5 && totalEnergyKwh < dailyEnergyKwh * 0.8)) && stationTotalKwh > 1.0) {
    totalEnergyKwh = stationTotalKwh;
  }
  // Tier 2: If inverter register wasn't found but station realTime total is valid
  if (totalEnergyKwh <= 0 && stationTotalKwh > 0) {
    totalEnergyKwh = stationTotalKwh;
  }
  // Tier 3: If both are missing/0 but daily generation is already positive, baseline to daily generation
  if (totalEnergyKwh <= 0 && dailyEnergyKwh > 0) {
    totalEnergyKwh = dailyEnergyKwh;
  }

  // 4. Intelligent Temperature Classification & Prioritization
  const tempItems = dataList.filter(
    it =>
      /temp/i.test(String(it.name || '')) ||
      /temp/i.test(String(it.key || '')) ||
      String(it.unit || '').includes('℃') ||
      String(it.unit || '').includes('°C'),
  );

  const temperatures = tempItems.map(t => ({
    name: t.name || t.key,
    key: t.key || '',
    valueC: parseFloat(t.value) || 0,
    unit: t.unit || '°C',
  }));

  let inverterTemp = null;
  let radiatorTemp = null;
  let batteryTemp = null;
  let ambientTemp = null;
  const otherTemps = [];

  for (const t of temperatures) {
    const combined = `${t.name} ${t.key}`.toLowerCase();
    if (/(battery|bater[ií]a|batt)/i.test(combined)) {
      if (!batteryTemp || (batteryTemp.valueC === 0 && t.valueC > 0)) {
        batteryTemp = t;
      }
    } else if (/(radiator|radiador|heatsink|heat\s*sink|disipador)/i.test(combined)) {
      if (!radiatorTemp || (radiatorTemp.valueC === 0 && t.valueC > 0)) {
        radiatorTemp = t;
      }
    } else if (/(ambient|environment|externa)/i.test(combined) && !/(inversor|inverter)/i.test(combined)) {
      if (!ambientTemp || (ambientTemp.valueC === 0 && t.valueC > 0)) {
        ambientTemp = t;
      }
    } else if (/(inverter|internal|module|igbt|power|dc\s*temp|ac\s*temp|transformer|inversor|placa|^temperature$|^temp$|device\s*temp)/i.test(combined)) {
      if (!inverterTemp || (inverterTemp.valueC === 0 && t.valueC > 0)) {
        inverterTemp = t;
      }
    } else {
      otherTemps.push(t);
    }
  }

  // Priority for main inverter operating temperature:
  // 1) Valid (>0 and <150) inverter or radiator temperature
  // 2) Any non-battery temperature with valid reading >0
  // 3) Any temperature with valid reading >0
  // 4) Inverter temp or first temperature in list
  let mainTempC = null;
  if (inverterTemp && inverterTemp.valueC > 0 && inverterTemp.valueC < 150) {
    mainTempC = inverterTemp.valueC;
  } else if (radiatorTemp && radiatorTemp.valueC > 0 && radiatorTemp.valueC < 150) {
    mainTempC = radiatorTemp.valueC;
  } else {
    const validOther = otherTemps.find(t => t.valueC > 0 && t.valueC < 150);
    if (validOther) {
      mainTempC = validOther.valueC;
    } else if (ambientTemp && ambientTemp.valueC > 0 && ambientTemp.valueC < 150) {
      mainTempC = ambientTemp.valueC;
    } else if (batteryTemp && batteryTemp.valueC > 0 && batteryTemp.valueC < 150) {
      mainTempC = batteryTemp.valueC;
    } else if (inverterTemp) {
      mainTempC = inverterTemp.valueC;
    } else if (radiatorTemp) {
      mainTempC = radiatorTemp.valueC;
    } else if (temperatures.length > 0) {
      mainTempC = temperatures[0].valueC;
    }
  }

  const capacityKw = parseFloat(project?.capacity_kw) || parseFloat(activeStation?.installedCapacity) || 0;
  const loadFactorPct = capacityKw > 0 ? Math.min(100, ((Math.max(acPowerW, dcPowerW) / 1000) / capacityKw) * 100) : 0;
  const inverterEfficiencyPct = dcPowerW > 0 && acPowerW > 0
    ? Math.min(99.5, (acPowerW / dcPowerW) * 100)
    : 0;

  return {
    deviceSn: rawCurrentData.deviceSn || '',
    deviceState: Number(rawCurrentData.deviceState) || 1,
    collectionTime,
    systemType,
    isOffGrid,
    isSplitPhase,
    summary: {
      acPowerW,
      acPowerKw: acPowerW / 1000,
      dcPowerW,
      dcPowerKw: dcPowerW / 1000,
      dailyEnergyKwh,
      totalEnergyKwh,
      gridPowerW,
      loadPowerW,
      batteryPowerW,
      batterySocPct,
      batteryVoltageV,
      batteryCurrentA,
      mainTempC,
      inverterTempC: inverterTemp?.valueC ?? mainTempC,
      radiatorTempC: radiatorTemp?.valueC ?? null,
      batteryTempC: batteryTemp?.valueC ?? null,
      ambientTempC: ambientTemp?.valueC ?? null,
      capacityKw,
      loadFactorPct,
      inverterEfficiencyPct,
      isOffGrid,
      systemType,
      isSplitPhase,
    },
    pvStrings,
    acPhases,
    temperatures,
    rawList: dataList,
  };
}

function _toPowerWatts(rawVal, unit = '') {
  const n = Number(rawVal);
  if (Number.isNaN(n)) return null;
  return /kw/i.test(String(unit || '')) ? n * 1000 : n;
}

function _toEpochMs(rawTs) {
  if (typeof rawTs === 'number') return rawTs < 1e11 ? rawTs * 1000 : rawTs;
  if (/^\d+$/.test(String(rawTs || '').trim())) {
    const n = Number(rawTs);
    return n < 1e11 ? n * 1000 : n;
  }
  const parsed = Date.parse(String(rawTs || '').replace(' ', 'T'));
  return Number.isNaN(parsed) ? null : parsed;
}

function _pickFromDataList(dataList = [], matcher) {
  for (const item of dataList) {
    const k = String(item.key || '');
    const n = String(item.name || '');
    if (matcher(k, n, item)) {
      const val = Number(item.value);
      if (!Number.isNaN(val)) return { val, unit: item.unit || '' };
    }
  }
  return null;
}

/**
 * Normalize combined `device/v1.0/historical` and `station/v1.0/history` (timeType=1)
 * into chronologically sorted intraday time-series points.
 *
 * @param {Object|null} deviceHistRaw
 * @param {Object|null} stationHistRaw
 * @returns {Array<Object>}
 */
export function parseHistoricalDayPoints(deviceHistRaw, stationHistRaw) {
  const bucketMap = new Map();

  const ensureBucket = (tsMs) => {
    // Snap to nearest minute to merge device & station timestamps cleanly
    const roundedMs = Math.round(tsMs / 60000) * 60000;
    if (!bucketMap.has(roundedMs)) {
      const d = new Date(roundedMs);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      bucketMap.set(roundedMs, {
        ts: roundedMs,
        timeLabel: `${hh}:${mm}`,
        powerW: null,
        loadW: null,
        gridW: null,
        batteryPowerW: null,
        batterySocPct: null,
        tempC: null,
        pv1V: null,
        pv2V: null,
      });
    }
    return bucketMap.get(roundedMs);
  };

  // 1. Parse station-level intraday power frames
  const stItems = stationHistRaw?.stationDataItems || [];
  for (const item of stItems) {
    const tsMs = _toEpochMs(item.dateTime ?? item.collectTime);
    if (!tsMs) continue;
    const b = ensureBucket(tsMs);
    if (item.generationPower != null) b.powerW = Math.max(0, Number(item.generationPower) || 0);
    if (item.usePower != null) b.loadW = Math.max(0, Number(item.usePower) || 0);
    if (item.gridPower != null || item.purchasePower != null) {
      b.gridW = Number(item.gridPower ?? item.purchasePower ?? 0) || 0;
    }
    if (item.batterySoc != null) b.batterySocPct = Number(item.batterySoc);
    if (item.batteryPower != null || item.chargePower != null || item.dischargePower != null) {
      const ch = Number(item.chargePower) || 0;
      const dis = Number(item.dischargePower) || 0;
      b.batteryPowerW = item.batteryPower != null ? Number(item.batteryPower) : (ch - dis);
    }
  }

  // 2. Parse device-level historical parameter frames
  const devItems = deviceHistRaw?.paramDataList || [];
  for (const frame of devItems) {
    const tsMs = _toEpochMs(frame.collectTime ?? frame.dateTime);
    if (!tsMs) continue;
    const b = ensureBucket(tsMs);
    const list = frame.dataList || [];

    if (b.powerW === null) {
      const dcSum = _pickFromDataList(list, (k, n) => /^DP\d+$|Total_DC_Power|DC.*Power|PV.*Total.*Power|AC_P|E_P\b|Active.?Power|Generation.?Power/i.test(`${k} ${n}`));
      if (dcSum) b.powerW = Math.max(0, _toPowerWatts(dcSum.val, dcSum.unit) || 0);
    }
    if (b.loadW === null) {
      const load = _pickFromDataList(list, (k, n) => /E_Puse|Load.*Power|Total.?Consumption.?Power|Backup.?Load/i.test(`${k} ${n}`));
      if (load) b.loadW = Math.max(0, _toPowerWatts(load.val, load.unit) || 0);
    }
    if (b.gridW === null) {
      const grid = _pickFromDataList(list, (k, n) => /PG_pt|Total.?Grid.?Power|Grid.?Power/i.test(`${k} ${n}`));
      if (grid) b.gridW = _toPowerWatts(grid.val, grid.unit) || 0;
    }
    if (b.batterySocPct === null) {
      const soc = _pickFromDataList(list, (k, n) => /^B_left|^SOC$|Battery.?SOC|Battery.?Capacity/i.test(`${k} ${n}`));
      if (soc && soc.val >= 0 && soc.val <= 100) b.batterySocPct = soc.val;
    }
    if (b.batteryPowerW === null) {
      const bp = _pickFromDataList(list, (k, n) => /^B_P\d*$|Battery.?Power/i.test(`${k} ${n}`));
      if (bp) b.batteryPowerW = _toPowerWatts(bp.val, bp.unit) || 0;
    }
    const temp = _pickFromDataList(list, (k, n) => /T_ac|T_in|Radiator.?Temp|IGBT.?Temp|Inverter.?Temp|Module.?Temp|DC.?Temp/i.test(`${k} ${n}`));
    if (temp) {
      b.tempC = /f/i.test(temp.unit) ? Number((((temp.val - 32) * 5) / 9).toFixed(1)) : Number(temp.val.toFixed(1));
    }
    const dv1 = _pickFromDataList(list, (k, n) => /^DV1$|PV1.?Voltage/i.test(`${k} ${n}`));
    if (dv1) b.pv1V = Number(dv1.val.toFixed(1));
    const dv2 = _pickFromDataList(list, (k, n) => /^DV2$|PV2.?Voltage/i.test(`${k} ${n}`));
    if (dv2) b.pv2V = Number(dv2.val.toFixed(1));
  }

  return Array.from(bucketMap.values())
    .sort((a, b) => a.ts - b.ts)
    .map((p) => ({
      ...p,
      powerW: p.powerW ?? 0,
      loadW: p.loadW ?? 0,
      gridW: p.gridW ?? 0,
      batteryPowerW: p.batteryPowerW ?? 0,
    }));
}

/**
 * Parse Solarman `station/v1.0/history` (timeType=2, daily aggregates).
 * @param {Object|null} stationHistRaw
 * @returns {Array<Object>}
 */
export function parseHistoricalPeriodBars(stationHistRaw) {
  const items = stationHistRaw?.stationDataItems || [];
  return items
    .map((item) => {
      let dateStr = '';
      if (item.year && item.month && item.day) {
        dateStr = `${item.year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
      } else if (item.dateTime) {
        const ms = _toEpochMs(item.dateTime);
        if (ms) {
          const d = new Date(ms);
          dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      const [, m = '', d = ''] = dateStr.split('-');
      return {
        dateStr,
        label: dateStr ? `${d}/${m}` : String(item.dateTime || ''),
        generationKwh: Number((Number(item.generationValue) || 0).toFixed(2)),
        consumptionKwh: Number((Number(item.useValue) || 0).toFixed(2)),
        gridKwh: Number((Number(item.buyValue ?? item.gridValue) || 0).toFixed(2)),
      };
    })
    .filter((r) => r.dateStr || r.label)
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}
