/**
 * @module solarman/demo
 * @description Realistic multi-plant Demo Solarman stations, live telemetry, and historical profiles.
 */

import { solarmanRuntime, recordLiveHistoryPoint } from "./runtime.js";
import { parseDeviceCurrentData } from "./parser.js";
import { getLocalDateISO, shiftISODate } from "../utils.js";

export function buildDemoStations(activeProject) { return _buildDemoStations(activeProject); }
export function populateDemoTelemetry(project, activeStation, requestedSn) { return _populateDemoTelemetry(project, activeStation, requestedSn); }

function _buildDemoStations(activeProject) {
  const projName = activeProject?.name || 'Planta Principal JF Solar';
  const projLoc = activeProject?.location || 'Cali, Colombia';
  const projCap = parseFloat(activeProject?.capacity_kw) || 5.5;

  return [
    {
      id: 66202957,
      name: `${projName} (On-Grid Principal)`,
      locationAddress: projLoc,
      installedCapacity: projCap,
      generationPower: Math.round(projCap * 740),
      generationTotal: 8420.6,
      generationValue: 21.18,
      networkStatus: 'NORMAL',
      lastUpdateTime: Math.floor(Date.now() / 1000) - 42,
      gridInterconnectionType: 'GRID_TIED',
      _defaultSn: 'SN2409881024',
      _seedOffset: 0,
    },
    {
      id: 66547052,
      name: 'Beija-flor Sopetran (Off-Grid / Aislada)',
      locationAddress: 'Sopetrán, Antioquia',
      installedCapacity: 7.0,
      generationPower: 3463,
      generationTotal: 3842.6,
      generationValue: 14.85,
      networkStatus: 'NORMAL',
      lastUpdateTime: Math.floor(Date.now() / 1000) - 95,
      gridInterconnectionType: 'OFF_GRID',
      _defaultSn: 'SR-2512290049-100207',
      _seedOffset: 100,
    },
    {
      id: 901003,
      name: 'Planta Comercial Sabana (Híbrida C&I)',
      locationAddress: 'Bogotá / Cundinamarca',
      installedCapacity: 25.0,
      generationPower: 18650,
      networkStatus: 'NORMAL',
      lastUpdateTime: Math.floor(Date.now() / 1000) - 120,
      gridInterconnectionType: 'STORAGE',
      _defaultSn: 'SN2419004412',
      _seedOffset: 250,
    },
  ];
}

function _populateDemoTelemetry(project, activeStation, requestedSn) {
  const capKw = parseFloat(activeStation.installedCapacity) || parseFloat(project?.capacity_kw) || 5.5;
  const isOffGridPlant = String(activeStation.id) === '66547052' || activeStation.gridInterconnectionType === 'OFF_GRID';
  const snMain = activeStation._defaultSn || (isOffGridPlant ? 'SR-2512290049-100207' : `SN${String(activeStation.id)}01`);
  const snLogger = `LSW3_${String(activeStation.id).slice(-4)}99`;

  solarmanRuntime.devices = [
    {
      deviceSn: snMain,
      deviceId: Number(activeStation.id) * 10 + 1,
      deviceType: 'INVERTER',
      deviceState: 1,
      connectStatus: 1,
      collectionTime: Math.floor(Date.now() / 1000) - 15,
    },
    {
      deviceSn: snLogger,
      deviceId: Number(activeStation.id) * 10 + 2,
      deviceType: 'COLLECTOR',
      deviceState: 1,
      connectStatus: 1,
      collectionTime: Math.floor(Date.now() / 1000) - 15,
    },
  ];

  const chosenSn = requestedSn && solarmanRuntime.devices.some(d => d.deviceSn === requestedSn)
    ? requestedSn
    : snMain;
  solarmanRuntime.activeDeviceSn = chosenSn;

  const colTime = Math.floor(Date.now() / 1000);

  let mockCurrentData;
  let stationRt;

  if (isOffGridPlant) {
    // Exact SRNE Off-Grid / Hybrid Inverter telemetry as in Plant #66547052
    const pvPowerW = 3463;
    const pv1V = 290.8;
    const pv1A = 11.9;
    const loadW = 157;
    const battSoc = 94;
    const battP = pvPowerW - loadW; // ~3306 W charging battery
    const todayProdKwh = 14.85;
    const totalProdKwh = 3842.6;

    stationRt = {
      generationPower: pvPowerW,
      usePower: loadW,
      gridPower: 0,
      batteryPower: battP,
      batterySoc: battSoc,
      generationValue: todayProdKwh,
      generationTotal: totalProdKwh,
      totalEnergy: totalProdKwh,
      lastUpdateTime: colTime,
    };

    mockCurrentData = {
      deviceSn: chosenSn,
      deviceState: 1,
      collectionTime: colTime,
      dataList: [
        { key: 'DP1', name: 'PV1 Power', value: '3463', unit: 'W' },
        { key: 'DV1', name: 'PV1 Voltage', value: String(pv1V), unit: 'V' },
        { key: 'DC1', name: 'PV1 Current', value: String(pv1A), unit: 'A' },
        { key: 'DP2', name: 'PV2 Power', value: '0', unit: 'W' },
        { key: 'DV2', name: 'PV2 Voltage', value: '0.0', unit: 'V' },
        { key: 'DC2', name: 'PV2 Current', value: '0.00', unit: 'A' },
        { key: 'PV_POWER', name: 'PV Power', value: '3463', unit: 'W' },
        // AC Split-Phase Output 120V / 240V
        { key: 'OUT_V1', name: 'Output L1 Voltage', value: '120.1', unit: 'V' },
        { key: 'OUT_I1', name: 'Output L1 Current', value: '1.50', unit: 'A' },
        { key: 'OUT_V2', name: 'Output L2 Voltage', value: '119.8', unit: 'V' },
        { key: 'OUT_I2', name: 'Output L2 Current', value: '1.50', unit: 'A' },
        { key: 'OUT_F', name: 'Output Frequency', value: '59.99', unit: 'Hz' },
        { key: 'LOAD_P', name: 'Load Power', value: String(loadW), unit: 'W' },
        // Grid registers: Off-grid has 0 grid power
        { key: 'GRID_P', name: 'Grid Power', value: '0', unit: 'W' },
        // Battery registers
        { key: 'BATT_SOC', name: 'Battery', value: String(battSoc), unit: '%' },
        { key: 'BATT_P', name: 'Battery Power', value: String(battP), unit: 'W' },
        { key: 'BATT_V', name: 'Battery Voltage', value: '51.8', unit: 'V' },
        // Temperatures: Battery temp unattached (0.0), while inverter bridge has actual 42.8 °C
        { key: 'T_BATT', name: 'Battery Temperature', value: '0.0', unit: '°C' },
        { key: 'T_INV', name: 'Temperature', value: '42.8', unit: '°C' },
        { key: 'T_AC', name: 'AC Temperature', value: '41.5', unit: '°C' },
        { key: 'T_DC', name: 'DC Temperature', value: '43.2', unit: '°C' },
        // Production registers (SRNE format: Today Production, Total Production, plus misleading test Total Energy Export = 1.0)
        { key: 'F02F', name: 'Today Production', value: String(todayProdKwh), unit: 'kWh' },
        { key: 'F038', name: 'Total Production', value: String(totalProdKwh), unit: 'kWh' },
        { key: 'F032', name: 'Total Energy Export', value: '1.0', unit: 'kWh' },
        { key: 'F048', name: 'Total Energy Import', value: '1.0', unit: 'kWh' },
      ],
    };
  } else {
    // Standard On-Grid Plant telemetry (Plant #66202957)
    const wave = 0.68 + 0.14 * Math.sin(Date.now() / 20000 + (activeStation._seedOffset || 0));
    const acPowerW = Math.round(capKw * 1000 * wave);
    const dcPowerW = Math.round(acPowerW / 0.974);
    const pv1W = Math.round(dcPowerW * 0.54);
    const pv2W = dcPowerW - pv1W;
    const pv1V = Number((362.4 + Math.sin(Date.now() / 10000) * 4.2).toFixed(1));
    const pv2V = Number((358.8 + Math.cos(Date.now() / 12000) * 3.8).toFixed(1));
    const pv1A = Number((pv1W / pv1V).toFixed(2));
    const pv2A = Number((pv2W / pv2V).toFixed(2));
    const vac = Number((228.5 + Math.sin(Date.now() / 9000) * 1.4).toFixed(1));
    const iac = Number((acPowerW / vac).toFixed(2));
    const dailyKwh = Number((capKw * 3.85).toFixed(2));
    const baseTotalKwh = 8420.6;
    const totalKwh = Number((baseTotalKwh + (Date.now() % 100000) / 50000).toFixed(1));
    const loadPowerW = Math.round(acPowerW * 0.72);
    const gridPowerW = acPowerW - loadPowerW;

    stationRt = {
      generationPower: acPowerW,
      usePower: loadPowerW,
      gridPower: gridPowerW,
      generationValue: dailyKwh,
      generationTotal: totalKwh,
      totalEnergy: totalKwh,
      lastUpdateTime: colTime,
    };

    mockCurrentData = {
      deviceSn: chosenSn,
      deviceState: 1,
      collectionTime: colTime,
      dataList: [
        { key: 'APo_t1', name: 'Total AC Output Power (Active)', value: String(acPowerW), unit: 'W' },
        { key: 'DPi_t1', name: 'Total DC Input Power', value: String(dcPowerW), unit: 'W' },
        { key: 'Etdy_ge1', name: 'Daily Production (Active)', value: String(dailyKwh), unit: 'kWh' },
        { key: 'Et_ge0', name: 'Cumulative Production (Active)', value: String(totalKwh), unit: 'kWh' },
        { key: 'DV1', name: 'DC Voltage PV1', value: String(pv1V), unit: 'V' },
        { key: 'DC1', name: 'DC Current PV1', value: String(pv1A), unit: 'A' },
        { key: 'DP1', name: 'DC Power PV1', value: String(pv1W), unit: 'W' },
        { key: 'DV2', name: 'DC Voltage PV2', value: String(pv2V), unit: 'V' },
        { key: 'DC2', name: 'DC Current PV2', value: String(pv2A), unit: 'A' },
        { key: 'DP2', name: 'DC Power PV2', value: String(pv2W), unit: 'W' },
        { key: 'AV1', name: 'AC Voltage R/U/A', value: String(vac), unit: 'V' },
        { key: 'AC1', name: 'AC Current R/U/A', value: String(iac), unit: 'A' },
        { key: 'A_Fo1', name: 'AC Output Frequency R', value: '60.01', unit: 'Hz' },
        { key: 'T_ac1', name: 'AC Radiator Temperature', value: '41.8', unit: '℃' },
        { key: 'T_in1', name: 'Internal Module Temperature', value: '38.4', unit: '℃' },
        { key: 'PG_pt1', name: 'Total Grid Power', value: String(gridPowerW), unit: 'W' },
        { key: 'E_Puse_t1', name: 'Total Consumption Power', value: String(loadPowerW), unit: 'W' },
        { key: 'INV_MODEL', name: 'Inverter Model', value: project?.inverter_model || 'DEYE SUN-SG04LP1', unit: '' },
        { key: 'INV_STATUS', name: 'Inverter Status', value: 'Normal Grid-Tied', unit: '' },
      ],
    };
  }

  solarmanRuntime.stationRealTime = stationRt;
  const parsed = parseDeviceCurrentData(mockCurrentData, solarmanRuntime.stationRealTime, activeStation, project);
  solarmanRuntime.justUpdatedPacket =
    solarmanRuntime.lastCollectionTime !== null && colTime > solarmanRuntime.lastCollectionTime;
  solarmanRuntime.lastCollectionTime = colTime;
  solarmanRuntime.deviceData = parsed;
  solarmanRuntime.lastCheckedAtMs = Date.now();
  recordLiveHistoryPoint(colTime, parsed);

  return solarmanRuntime;
}

/** Deterministic pseudo-random helper [0..1) from string seed */
function _seedRand(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a realistic 15-minute resolution intraday parameter profile for a given date & demo plant.
 * @param {Object} project
 * @param {Object} activeStation
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {Array<Object>}
 */
export function generateDemoDailyHistory(project, activeStation, dateStr) {
  const capKw = Math.max(2, Number(activeStation?.installedCapacity) || Number(project?.capacity_kw) || 7.0);
  const isOffGrid = /OFF|ISOLATED|AISLADA|HYBRID/i.test(
    `${activeStation?.gridInterconnectionType || ''} ${activeStation?.name || ''}`,
  );
  const rand = _seedRand(`${activeStation?.id || 'demo'}_${dateStr}`);
  const dayQuality = 0.72 + rand() * 0.28; // clear vs slightly overcast day
  const cloudDipHour = 10.5 + rand() * 4.5;
  const cloudDipDepth = rand() > 0.45 ? 0.25 + rand() * 0.3 : 0.05;

  const todayISO = getLocalDateISO();
  const now = new Date();
  const maxMinuteOfDay = dateStr === todayISO
    ? Math.max(360, now.getHours() * 60 + now.getMinutes())
    : 23 * 60 + 45;

  const points = [];
  let soc = isOffGrid ? 48 + Math.round(rand() * 14) : null;
  const maxW = capKw * 1000;

  for (let min = 0; min <= Math.min(23 * 60 + 45, maxMinuteOfDay); min += 15) {
    const h = min / 60;
    const hh = String(Math.floor(h)).padStart(2, '0');
    const mm = String(min % 60).padStart(2, '0');
    const timeLabel = `${hh}:${mm}`;

    // Solar irradiance curve ~06:00 to 18:15
    let solarFactor = 0;
    if (h >= 5.75 && h <= 18.25) {
      const normalized = (h - 5.75) / 12.5;
      solarFactor = Math.sin(normalized * Math.PI);
      const distCloud = Math.abs(h - cloudDipHour);
      const cloudAtten = 1 - cloudDipDepth * Math.exp(-(distCloud * distCloud) / 0.55);
      const microNoise = 0.94 + rand() * 0.12;
      solarFactor = Math.max(0, Math.min(1, solarFactor * dayQuality * cloudAtten * microNoise));
    }

    const powerW = Math.round(maxW * solarFactor);

    // Load curve: base ~280W + morning peak + evening peak
    const morningPeak = 420 * Math.exp(-Math.pow((h - 7.8) / 1.4, 2));
    const middayLoad = 520 * Math.exp(-Math.pow((h - 12.8) / 2.2, 2));
    const eveningPeak = 950 * Math.exp(-Math.pow((h - 19.8) / 2.1, 2));
    const loadW = Math.round((240 + morningPeak + middayLoad + eveningPeak) * (capKw / 7) * (0.9 + rand() * 0.2));

    let gridW = 0;
    let batteryPowerW = 0;
    if (isOffGrid) {
      // Positive batteryPowerW = charging, negative = discharging
      const net = powerW - loadW;
      batteryPowerW = Math.round(net * 0.92);
      // Update SOC over 0.25h step
      const batteryKwh = capKw * 2.2;
      soc = Math.max(18, Math.min(100, soc + ((batteryPowerW / 1000) * 0.25 / batteryKwh) * 100));
    } else {
      // On-Grid: negative = exporting surplus, positive = importing from utility grid
      gridW = Math.round(loadW - powerW);
    }

    const tempC = Number((26.5 + solarFactor * 22.5 + (loadW / maxW) * 4 + (rand() - 0.5) * 0.8).toFixed(1));
    const pv1V = powerW > 40 ? Number((285 + solarFactor * 72 + (rand() - 0.5) * 6).toFixed(1)) : Number((powerW > 0 ? 110 : 12).toFixed(1));
    const pv2V = powerW > 40 ? Number((278 + solarFactor * 68 + (rand() - 0.5) * 6).toFixed(1)) : Number((powerW > 0 ? 105 : 10).toFixed(1));

    const dt = new Date(`${dateStr}T${timeLabel}:00`);
    points.push({
      ts: dt.getTime(),
      timeLabel,
      powerW,
      loadW,
      gridW,
      batteryPowerW,
      batterySocPct: soc !== null ? Math.round(soc) : null,
      tempC,
      pv1V,
      pv2V,
    });
  }

  return points;
}

/**
 * Generate a 14-day daily kWh yield & consumption summary ending on `endDateStr`.
 * @param {Object} project
 * @param {Object} activeStation
 * @param {string} endDateStr
 * @returns {Array<Object>}
 */
export function generateDemoMonthlyHistory(project, activeStation, endDateStr) {
  const capKw = Math.max(2, Number(activeStation?.installedCapacity) || Number(project?.capacity_kw) || 7.0);
  const rows = [];
  for (let i = 13; i >= 0; i--) {
    const dStr = shiftISODate(endDateStr, -i);
    const rand = _seedRand(`${activeStation?.id || 'demo'}_day_${dStr}`);
    const hsp = 3.2 + rand() * 2.3;
    const generationKwh = Number((capKw * hsp * 0.84).toFixed(2));
    const consumptionKwh = Number((capKw * (2.6 + rand() * 1.4)).toFixed(2));
    const gridKwh = Number(Math.max(0, consumptionKwh - generationKwh * 0.72).toFixed(2));
    const [, m, d] = dStr.split('-');
    rows.push({
      dateStr: dStr,
      label: `${d}/${m}`,
      generationKwh,
      consumptionKwh,
      gridKwh,
    });
  }
  return rows;
}
