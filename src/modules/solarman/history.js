/**
 * @module solarman/history
 * @description Fetches, caches, and normalizes intraday & multi-day historical Solarman parameters.
 */

import { solarmanRuntime } from './runtime.js';
import { getSolarmanSession } from './storage.js';
import { callProxy, ensureValidToken } from './sync.js';
import { parseHistoricalDayPoints, parseHistoricalPeriodBars } from './parser.js';
import { generateDemoDailyHistory, generateDemoMonthlyHistory } from './demo.js';
import { getLocalDateISO, shiftISODate } from '../utils.js';

/**
 * Fetch intraday parameter history for `dateStr` ('YYYY-MM-DD') or 14-day summary (`range='month'`).
 * Updates `solarmanRuntime.dailyHistoryPoints` or `solarmanRuntime.monthlyHistoryPoints`.
 *
 * @param {Object} project
 * @param {string} [dateStr]
 * @param {Object} [opts]
 * @param {boolean} [opts.force=false]
 * @param {'day'|'month'} [opts.range]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchSolarmanDailyHistory(project, dateStr = solarmanRuntime.selectedDate, opts = {}) {
  const session = getSolarmanSession();
  const activeStation = solarmanRuntime.activeStation;
  const targetDate = dateStr || getLocalDateISO();
  const range = opts.range || solarmanRuntime.historyRange || 'day';
  const force = Boolean(opts.force);

  solarmanRuntime.selectedDate = targetDate;
  solarmanRuntime.historyRange = range;
  solarmanRuntime.historyError = null;

  if (!session || !activeStation) {
    solarmanRuntime.dailyHistoryPoints = [];
    solarmanRuntime.monthlyHistoryPoints = [];
    return [];
  }

  const deviceSn = solarmanRuntime.activeDeviceSn || '';
  const targetDev = (solarmanRuntime.devices || []).find((d) => d.deviceSn === deviceSn);
  const cacheKey = `${activeStation.id}:${deviceSn}:${range}:${targetDate}`;
  const isToday = targetDate === getLocalDateISO();

  // Serve cached finished past days immediately
  if (!force && !isToday && solarmanRuntime.historyCache[cacheKey]) {
    const cached = solarmanRuntime.historyCache[cacheKey];
    if (range === 'month') {
      solarmanRuntime.monthlyHistoryPoints = cached.points;
    } else {
      solarmanRuntime.dailyHistoryPoints = cached.points;
    }
    solarmanRuntime.historySource = cached.source;
    solarmanRuntime.historyLoading = false;
    return cached.points;
  }

  // Demo Mode: deterministic plant-aware curves
  if (session.isDemo) {
    const points = range === 'month'
      ? generateDemoMonthlyHistory(project, activeStation, targetDate)
      : generateDemoDailyHistory(project, activeStation, targetDate);
    if (range === 'month') {
      solarmanRuntime.monthlyHistoryPoints = points;
    } else {
      solarmanRuntime.dailyHistoryPoints = points;
    }
    solarmanRuntime.historySource = 'demo';
    solarmanRuntime.historyLoading = false;
    if (!isToday) {
      solarmanRuntime.historyCache[cacheKey] = { points, source: 'demo' };
    }
    return points;
  }

  // Live Solarman OpenAPI Query
  solarmanRuntime.historyLoading = true;
  try {
    const validSession = await ensureValidToken();

    if (range === 'month') {
      const start14 = shiftISODate(targetDate, -13);
      const stHistRes = await callProxy({
        action: 'stationHistory',
        region: validSession.region,
        token: validSession.accessToken,
        stationId: activeStation.id,
        timeType: 2,
        startTime: start14,
        endTime: targetDate,
      }).catch(() => null);

      const bars = parseHistoricalPeriodBars(stHistRes);
      solarmanRuntime.monthlyHistoryPoints = bars;
      solarmanRuntime.historySource = 'cloud';
      if (!isToday && bars.length > 0) {
        solarmanRuntime.historyCache[cacheKey] = { points: bars, source: 'cloud' };
      }
      return bars;
    }

    // Intraday (`timeType: 1`): query stationHistory & deviceHistorical in parallel
    const [stationRes, deviceRes] = await Promise.all([
      callProxy({
        action: 'stationHistory',
        region: validSession.region,
        token: validSession.accessToken,
        stationId: activeStation.id,
        timeType: 1,
        startTime: targetDate,
        endTime: targetDate,
      }).catch(() => null),
      deviceSn
        ? callProxy({
            action: 'deviceHistorical',
            region: validSession.region,
            token: validSession.accessToken,
            deviceSn,
            deviceId: targetDev?.deviceId,
            timeType: 1,
            startTime: targetDate,
            endTime: targetDate,
          }).catch(() => null)
        : Promise.resolve(null),
    ]);

    let points = parseHistoricalDayPoints(deviceRes, stationRes);
    let source = 'cloud';

    // Seamless fallback to captured live session frames if cloud returned empty frames for today
    if (points.length === 0 && isToday && solarmanRuntime.liveHistory.length > 0) {
      points = solarmanRuntime.liveHistory.map((pt) => ({
        ts: pt.ts || pt.collectionTime * 1000,
        timeLabel: pt.shortLabel || pt.timeLabel,
        powerW: pt.powerW || 0,
        loadW: pt.loadW || 0,
        gridW: pt.gridW || 0,
        batteryPowerW: pt.batteryPowerW || 0,
        batterySocPct: pt.batterySocPct ?? null,
        tempC: pt.tempC ?? null,
        pv1V: pt.pv1V ?? null,
        pv2V: pt.pv2V ?? null,
      }));
      source = 'live_fallback';
    }

    solarmanRuntime.dailyHistoryPoints = points;
    solarmanRuntime.historySource = source;
    if (!isToday && points.length > 0) {
      solarmanRuntime.historyCache[cacheKey] = { points, source };
    }
    return points;
  } catch (err) {
    solarmanRuntime.historyError = err.message || 'No se pudo consultar el historial en Solarman';
    // Fallback to live session points when today's cloud request errors out
    if (range === 'day' && isToday && solarmanRuntime.liveHistory.length > 0) {
      solarmanRuntime.dailyHistoryPoints = solarmanRuntime.liveHistory.map((pt) => ({
        ts: pt.ts || pt.collectionTime * 1000,
        timeLabel: pt.shortLabel || pt.timeLabel,
        powerW: pt.powerW || 0,
        loadW: pt.loadW || 0,
        gridW: pt.gridW || 0,
        batteryPowerW: pt.batteryPowerW || 0,
        batterySocPct: pt.batterySocPct ?? null,
        tempC: pt.tempC ?? null,
        pv1V: pt.pv1V ?? null,
        pv2V: pt.pv2V ?? null,
      }));
      solarmanRuntime.historySource = 'live_fallback';
      return solarmanRuntime.dailyHistoryPoints;
    }
    return [];
  } finally {
    solarmanRuntime.historyLoading = false;
  }
}
