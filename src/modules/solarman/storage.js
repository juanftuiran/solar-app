/**
 * @module solarman/storage
 * @description Browser persistence for Solarman auth sessions and multi-plant project bindings.
 */

import { AUTH_STORAGE_KEY, BINDINGS_STORAGE_KEY, resetSolarmanRuntime } from './runtime.js';

/**
 * Retrieve the active Solarman session from sessionStorage only.
 * Cleans up any legacy localStorage auth payload that might contain sensitive hashes.
 * @returns {Object|null}
 */
export function getSolarmanSession() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore
  }
  try {
    const sessionRaw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!sessionRaw) return null;
    const parsed = JSON.parse(sessionRaw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      isDemo: Boolean(parsed.isDemo),
      email: parsed.email || '',
      region: parsed.region || 'global',
      orgId: parsed.orgId || '',
      accessToken: parsed.accessToken || '',
      tokenExpiresAt: parsed.tokenExpiresAt || null,
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return null;
  }
}

/**
 * Save Solarman session metadata in sessionStorage only (never secrets or password hashes).
 * @param {Object} sessionData
 */
export function saveSolarmanSession(sessionData) {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    const sanitized = {
      isDemo: Boolean(sessionData?.isDemo),
      email: String(sessionData?.email || '').trim(),
      region: sessionData?.region || 'global',
      orgId: sessionData?.orgId ? String(sessionData.orgId).trim() : '',
      accessToken: sessionData?.accessToken || '',
      tokenExpiresAt: sessionData?.tokenExpiresAt || null,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Disconnect and clear Solarman session credentials.
 */
export function clearSolarmanSession() {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore
  }
  resetSolarmanRuntime();
}

/**
 * Reset in-memory Solarman telemetry data (called when switching projects or disconnecting).
 */

export function getAllProjectBindings() {
  try {
    const raw = localStorage.getItem(BINDINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Get the Solarman station binding for a specific JF Solar project.
 * @param {string} projectId
 * @returns {{ stationId: number|string, stationName: string, deviceSn?: string }|null}
 */
export function getProjectStationBinding(projectId) {
  if (!projectId) return null;
  const map = getAllProjectBindings();
  return map[projectId] || null;
}

/**
 * Bind a specific Solarman station (and optional inverter SN) to a JF Solar project.
 * Ensures Project A never displays Plant B's data.
 * @param {string} projectId
 * @param {Object} station
 * @param {string|null} [deviceSn=null]
 */
export function setProjectStationBinding(projectId, station, deviceSn = null) {
  if (!projectId || !station) return;
  try {
    const map = getAllProjectBindings();
    map[projectId] = {
      stationId: station.id ?? station.stationId,
      stationName: station.name || station.stationName || `Station #${station.id}`,
      installedCapacity: station.installedCapacity || station.capacityKw || 0,
      deviceSn: deviceSn || map[projectId]?.deviceSn || null,
      boundAt: Date.now(),
    };
    localStorage.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Update the preferred inverter deviceSn for a bound project.
 * @param {string} projectId
 * @param {string} deviceSn
 */
export function setProjectDeviceBinding(projectId, deviceSn) {
  if (!projectId || !deviceSn) return;
  try {
    const map = getAllProjectBindings();
    if (map[projectId]) {
      map[projectId].deviceSn = deviceSn;
      localStorage.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Ignore
  }
}

/**
 * Remove the station binding for a specific project so the user can pick another station.
 * @param {string} projectId
 */
export function clearProjectStationBinding(projectId) {
  if (!projectId) return;
  try {
    const map = getAllProjectBindings();
    delete map[projectId];
    localStorage.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

/**
 * Compare a JF Solar project with the list of Solarman stations to find a smart suggestion.
 * Does NOT auto-bind silently when multiple plants exist without a match; returns match score.
 * @param {Object} project - Active JF Solar project
 * @param {Array<Object>} stations - Solarman stations list
 * @returns {{ suggested: Object|null, confidence: 'high'|'single'|'none' }}
 */
