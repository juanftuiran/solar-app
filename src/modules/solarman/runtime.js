/**
 * @module solarman/runtime
 * @description Shared runtime state, SHA-256 browser helper, and runtime reset for Solarman integration.
 */

import { getLocalDateISO } from '../utils.js';

export const AUTH_STORAGE_KEY = 'jf_solar_solarman_auth_v1';
export const BINDINGS_STORAGE_KEY = 'jf_solar_solarman_bindings_v1';

/**
 * In-memory live runtime state for the active project's Solarman telemetry.
 */
export const solarmanRuntime = {
  /** Project ID that owns this live state */
  loadedProjectId: null,
  /** Cached list of Solarman stations from the account */
  stations: [],
  /** Bound station metadata for the active project */
  activeStation: null,
  /** Devices/Inverters inside the bound station */
  devices: [],
  /** Selected inverter SN */
  activeDeviceSn: null,
  /** Raw station realTime response */
  stationRealTime: null,
  /** Normalized telemetry extracted from deviceCurrentData + stationRealTime */
  deviceData: null,
  /** Last Solarman collectionTime (seconds) */
  lastCollectionTime: null,
  /** Timestamp (ms) of the last check against Solarman */
  lastCheckedAtMs: null,
  /** Timestamp (ms) when the next poll will fire */
  nextCheckAtMs: null,
  /** True if the last sync returned a newer packet timestamp */
  justUpdatedPacket: false,
  /** Live loading flag */
  loading: false,
  /** Error banner message */
  error: null,
  /** Open multi-plant selection view */
  showStationPicker: false,
  /** Recent points captured during live polling */
  liveHistory: [],

  // ── Daily / Period Historical Chart State ────────────────────────────────
  /** Selected ISO date ('YYYY-MM-DD') for intraday historical parameters */
  selectedDate: getLocalDateISO(),
  /** Active chart range mode ('day' | 'month') */
  historyRange: 'day',
  /** Active intraday parameter group ('power' | 'battery' | 'pv') */
  historyMetric: 'power',
  /** Historical fetch in-flight flag */
  historyLoading: false,
  /** Historical fetch error message */
  historyError: null,
  /** Origin of currently displayed historical points ('cloud' | 'live_fallback' | 'demo') */
  historySource: 'cloud',
  /** Parsed intraday points for `selectedDate` */
  dailyHistoryPoints: [],
  /** Parsed multi-day points (14 days ending on `selectedDate`) */
  monthlyHistoryPoints: [],
  /** In-memory historical response cache keyed by `${stationId}:${deviceSn}:${range}:${date}` */
  historyCache: {},
};

/**
 * Compute lowercase hex SHA-256 digest using Web Crypto API in the browser.
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function sha256Client(text) {
  const value = String(text || '');
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto API no disponible para cifrar la contraseña.');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase();
}

/**
 * Clear in-memory runtime telemetry when switching projects.
 */
export function resetSolarmanRuntime() {
  solarmanRuntime.loadedProjectId = null;
  solarmanRuntime.activeStation = null;
  solarmanRuntime.devices = [];
  solarmanRuntime.activeDeviceSn = null;
  solarmanRuntime.stationRealTime = null;
  solarmanRuntime.deviceData = null;
  solarmanRuntime.lastCollectionTime = null;
  solarmanRuntime.lastCheckedAtMs = null;
  solarmanRuntime.nextCheckAtMs = null;
  solarmanRuntime.justUpdatedPacket = false;
  solarmanRuntime.error = null;
  solarmanRuntime.showStationPicker = false;
  solarmanRuntime.liveHistory = [];
  solarmanRuntime.selectedDate = getLocalDateISO();
  solarmanRuntime.historyRange = 'day';
  solarmanRuntime.historyMetric = 'power';
  solarmanRuntime.historyLoading = false;
  solarmanRuntime.historyError = null;
  solarmanRuntime.historySource = 'cloud';
  solarmanRuntime.dailyHistoryPoints = [];
  solarmanRuntime.monthlyHistoryPoints = [];
  solarmanRuntime.historyCache = {};
}

/**
 * Append a captured live telemetry frame into `solarmanRuntime.liveHistory` (max 36 points).
 * @param {number} collectionTimeSec
 * @param {Object|number} parsedOrPowerW
 */
export function recordLiveHistoryPoint(collectionTimeSec, parsedOrPowerW) {
  const dateObj = new Date(collectionTimeSec * 1000);
  const timeLabel = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const existing = solarmanRuntime.liveHistory;
  if (existing.length > 0 && existing[existing.length - 1].collectionTime === collectionTimeSec) return;

  const isObj = parsedOrPowerW && typeof parsedOrPowerW === 'object';
  const sum = isObj ? (parsedOrPowerW.summary || {}) : null;
  const strings = isObj ? (parsedOrPowerW.mpptStrings || []) : [];

  existing.push({
    timeLabel,
    shortLabel: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ts: collectionTimeSec * 1000,
    collectionTime: collectionTimeSec,
    powerW: Math.max(0, Number(isObj ? (sum.acPowerW || sum.dcPowerW || 0) : parsedOrPowerW) || 0),
    loadW: Math.max(0, Number(sum?.loadPowerW ?? sum?.consumptionW ?? 0) || 0),
    gridW: Number(sum?.gridPowerW ?? 0) || 0,
    batteryPowerW: Number(sum?.batteryPowerW ?? 0) || 0,
    batterySocPct: sum?.batterySocPct != null ? Number(sum.batterySocPct) : null,
    tempC: sum?.inverterTempC != null ? Number(sum.inverterTempC) : null,
    pv1V: strings[0]?.voltageV != null ? Number(strings[0].voltageV) : null,
    pv2V: strings[1]?.voltageV != null ? Number(strings[1].voltageV) : null,
  });
  if (existing.length > 36) existing.shift();
}
