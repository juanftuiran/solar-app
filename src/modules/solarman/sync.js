/**
 * @module solarman/sync
 * @description Solarman proxy requests, OAuth token management, live adaptive sync, and telemetry polling.
 */

import { solarmanRuntime, sha256Client, resetSolarmanRuntime, recordLiveHistoryPoint } from "./runtime.js";
import {
  getSolarmanSession,
  saveSolarmanSession,
  clearSolarmanSession,
  getProjectStationBinding,
  setProjectStationBinding,
  setProjectDeviceBinding,
} from "./storage.js";
import { findSuggestedStationForProject } from "./matcher.js";
import { parseDeviceCurrentData } from "./parser.js";
import { buildDemoStations, populateDemoTelemetry } from "./demo.js";

let _syncIntervalId = null;
let _countdownIntervalId = null;
let _visibilityHandler = null;

export { callProxy, ensureValidToken };

async function callProxy(payload) {
  const res = await fetch('/api/solarman', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const errMsg = data.msg || data.message || `Error HTTP ${res.status} al consultar Solarman Cloud`;
    const err = new Error(errMsg);
    err.code = data.code || res.status;
    throw err;
  }
  return data;
}

/**
 * Authenticate with Solarman Open API and store session.
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} [params.appId]
 * @param {string} [params.appSecret]
 * @param {'global'|'intl'} [params.region='global']
 * @param {string} [params.orgId]
 * @param {boolean} [params.remember=true]
 * @returns {Promise<Object>} Session object with access_token
 */
export async function authenticateSolarman({
  email,
  password,
  appId = '',
  appSecret = '',
  region = 'global',
  orgId = '',
  remember = true,
}) {
  const passwordSha256 = await sha256Client(password);

  const data = await callProxy({
    action: 'token',
    region,
    email: email.trim(),
    passwordSha256,
    appId: appId.trim(),
    appSecret: appSecret.trim(),
    orgId: orgId ? String(orgId).trim() : undefined,
  });

  if (!data.access_token) {
    throw new Error(data.msg || 'Solarman no devolvió un access_token válido. Verifica tus credenciales.');
  }

  const expiresInSec = Number(data.expires_in) || 5184000;
  const sessionObj = {
    isDemo: false,
    email: email.trim(),
    passwordSha256,
    appId: appId.trim(),
    appSecret: appSecret.trim(),
    region,
    orgId: orgId ? String(orgId).trim() : '',
    remember,
    accessToken: data.access_token,
    tokenExpiresAt: Date.now() + expiresInSec * 1000,
  };

  saveSolarmanSession(sessionObj, remember);
  return sessionObj;
}

/**
 * Activate Multi-Plant Demo Session for testing UI & project binding without live credentials.
 * @param {Object} activeProject - Current JF Solar project
 * @returns {Object} Demo session object
 */
export function activateDemoSolarmanSession(activeProject) {
  const sessionObj = {
    isDemo: true,
    email: 'demo.ingenieria@solarmanpv.com',
    region: 'global',
    remember: false,
    accessToken: 'demo_token_solarman_v4',
    tokenExpiresAt: Date.now() + 86400 * 1000,
  };
  saveSolarmanSession(sessionObj, false);
  if (activeProject?.id) {
    const demoStations = buildDemoStations(activeProject);
    setProjectStationBinding(activeProject.id, demoStations[0], demoStations[0]._defaultSn);
  }
  return sessionObj;
}

/**
 * Ensure we have a valid token (re-authenticating with stored SHA-256 hash if expired).
 */
async function ensureValidToken() {
  const session = getSolarmanSession();
  if (!session) throw new Error('No hay sesión activa de Solarman.');
  if (session.isDemo) return session;

  const isExpired = session.tokenExpiresAt && Date.now() > session.tokenExpiresAt - 60000;
  if (!session.accessToken || isExpired) {
    const data = await callProxy({
      action: 'token',
      region: session.region || 'global',
      email: session.email,
      passwordSha256: session.passwordSha256,
      appId: session.appId,
      appSecret: session.appSecret,
      orgId: session.orgId || undefined,
    });
    session.accessToken = data.access_token;
    session.tokenExpiresAt = Date.now() + (Number(data.expires_in) || 5184000) * 1000;
    saveSolarmanSession(session, session.remember !== false);
  }
  return session;
}

/**
 * Fetch all power stations from the connected Solarman account.
 * @param {Object} [activeProject]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchSolarmanStations(activeProject = null) {
  const session = await ensureValidToken();
  if (session.isDemo) {
    return buildDemoStations(activeProject);
  }

  const data = await callProxy({
    action: 'stations',
    region: session.region,
    token: session.accessToken,
    page: 1,
    size: 50,
  });

  const rawList = data.stationList || data.list || data.data || [];
  return rawList.map(st => ({
    id: st.id ?? st.stationId,
    name: st.name || st.stationName || `Planta #${st.id}`,
    locationAddress: st.locationAddress || st.address || '',
    installedCapacity: parseFloat(st.installedCapacity) || 0,
    generationPower: parseFloat(st.generationPower) || 0,
    generationTotal: parseFloat(st.generationTotal ?? st.totalGeneration ?? st.totalEnergy ?? st.cumulativeEnergy ?? 0) || 0,
    generationValue: parseFloat(st.generationValue ?? st.todayEnergy ?? st.dailyEnergy ?? st.dayEnergy ?? 0) || 0,
    networkStatus: st.networkStatus || 'NORMAL',
    lastUpdateTime: st.lastUpdateTime || null,
    gridInterconnectionType: st.gridInterconnectionType || 'GRID_TIED',
  }));
}

/**
 * Fetch real-time station summary, station devices, and selected inverter currentData.
 * Strictly loads ONLY the station bound to `project.id`.
 * @param {Object} project - Active JF Solar project
 * @param {string|number|null} [overrideStationId=null]
 * @param {string|null} [overrideDeviceSn=null]
 * @returns {Promise<Object>} Updated solarmanRuntime state
 */
export async function syncProjectSolarmanTelemetry(project, overrideStationId = null, overrideDeviceSn = null) {
  if (!project || !project.id) {
    throw new Error('Selecciona primero un proyecto en JF Solar Cloud.');
  }

  // If switching from another project, clear previous project's runtime state immediately
  if (solarmanRuntime.loadedProjectId && solarmanRuntime.loadedProjectId !== project.id) {
    const keepStations = solarmanRuntime.stations;
    resetSolarmanRuntime();
    solarmanRuntime.stations = keepStations;
  }
  solarmanRuntime.loadedProjectId = project.id;

  const session = await ensureValidToken();

  // 1. Load stations list if empty
  if (!solarmanRuntime.stations || solarmanRuntime.stations.length === 0 || session.isDemo) {
    solarmanRuntime.stations = await fetchSolarmanStations(project);
  }

  // 2. Resolve station binding for THIS specific project
  let binding = getProjectStationBinding(project.id);

  if (overrideStationId !== null && overrideStationId !== undefined) {
    const targetSt = solarmanRuntime.stations.find(s => String(s.id) === String(overrideStationId));
    if (targetSt) {
      setProjectStationBinding(project.id, targetSt, overrideDeviceSn);
      binding = getProjectStationBinding(project.id);
    }
  }

  // Auto-bind only if there is an existing binding or a single station in the account
  if (!binding) {
    const { suggested, confidence } = findSuggestedStationForProject(project, solarmanRuntime.stations);
    if (suggested && (confidence === 'single' || confidence === 'high')) {
      setProjectStationBinding(project.id, suggested, null);
      binding = getProjectStationBinding(project.id);
    }
  }

  const activeStation = binding
    ? solarmanRuntime.stations.find(s => String(s.id) === String(binding.stationId)) || null
    : null;

  solarmanRuntime.activeStation = activeStation;

  // If no station is bound yet (e.g. account has multiple plants and user hasn't chosen which one belongs to this project)
  if (!activeStation) {
    solarmanRuntime.showStationPicker = true;
    solarmanRuntime.lastCheckedAtMs = Date.now();
    return solarmanRuntime;
  }

  solarmanRuntime.showStationPicker = false;

  // 3. DEMO MODE execution
  if (session.isDemo) {
    return populateDemoTelemetry(project, activeStation, overrideDeviceSn || binding?.deviceSn);
  }

  // 4. Fetch station realTime & station devices in parallel
  const [rtRes, devRes] = await Promise.all([
    callProxy({
      action: 'stationRealTime',
      region: session.region,
      token: session.accessToken,
      stationId: activeStation.id,
    }).catch(() => ({})),
    callProxy({
      action: 'stationDevices',
      region: session.region,
      token: session.accessToken,
      stationId: activeStation.id,
    }).catch(() => ({})),
  ]);

  solarmanRuntime.stationRealTime = rtRes || {};

  const rawDevices = devRes.deviceListItems || devRes.deviceList || devRes.list || [];
  solarmanRuntime.devices = rawDevices.map(d => ({
    deviceSn: String(d.deviceSn || ''),
    deviceId: d.deviceId,
    deviceType: d.deviceType || 'INVERTER',
    deviceState: Number(d.deviceState) || 1, // 1=Online, 2=Alarm, 3=Offline
    connectStatus: d.connectStatus ?? d.deviceState,
    collectionTime: Number(d.collectionTime) || null,
    parentSn: d.parentSn || '',
  }));

  // Prefer INVERTER devices first
  const inverters = solarmanRuntime.devices.filter(
    d => /INVERTER/i.test(d.deviceType) || !/COLLECTOR|LOGGER/i.test(d.deviceType),
  );
  const candidatePool = inverters.length > 0 ? inverters : solarmanRuntime.devices;

  let chosenSn = overrideDeviceSn || binding?.deviceSn || null;
  if (!chosenSn || ! solarmanRuntime.devices.some(d => d.deviceSn === chosenSn)) {
    chosenSn = candidatePool[0]?.deviceSn || null;
  }

  solarmanRuntime.activeDeviceSn = chosenSn;
  if (chosenSn) {
    setProjectDeviceBinding(project.id, chosenSn);
  }

  // 5. Fetch detailed inverter currentData
  if (chosenSn) {
    const targetDev = solarmanRuntime.devices.find(d => d.deviceSn === chosenSn);
    const currData = await callProxy({
      action: 'deviceCurrentData',
      region: session.region,
      token: session.accessToken,
      deviceSn: chosenSn,
      deviceId: targetDev?.deviceId,
    });

    const parsed = parseDeviceCurrentData(currData, solarmanRuntime.stationRealTime, activeStation, project);
    const newColTime = parsed.collectionTime || Number(solarmanRuntime.stationRealTime?.lastUpdateTime) || Math.floor(Date.now() / 1000);

    const isNewPacket =
      solarmanRuntime.lastCollectionTime !== null &&
      newColTime > solarmanRuntime.lastCollectionTime;

    solarmanRuntime.justUpdatedPacket = isNewPacket;
    solarmanRuntime.lastCollectionTime = newColTime;
    solarmanRuntime.deviceData = parsed;

    recordLiveHistoryPoint(newColTime, parsed);
  } else {
    const fallbackColTime = Number(solarmanRuntime.stationRealTime?.lastUpdateTime) || Math.floor(Date.now() / 1000);
    solarmanRuntime.lastCollectionTime = fallbackColTime;
    solarmanRuntime.deviceData = parseDeviceCurrentData({ dataList: [] }, solarmanRuntime.stationRealTime, activeStation, project);
  }

  solarmanRuntime.lastCheckedAtMs = Date.now();
  return solarmanRuntime;
}

export function startSolarmanLiveSync({ getActiveProject, onUpdate, onTick }) {
  stopSolarmanLiveSync();

  const session = getSolarmanSession();
  if (!session) return;

  const pollIntervalMs = session.isDemo ? 15000 : 45000;
  solarmanRuntime.nextCheckAtMs = Date.now() + pollIntervalMs;

  const runCheck = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const project = typeof getActiveProject === 'function' ? getActiveProject() : null;
    if (!project || solarmanRuntime.loading || solarmanRuntime.showStationPicker) return;

    try {
      solarmanRuntime.loading = true;
      await syncProjectSolarmanTelemetry(project);
      solarmanRuntime.loading = false;
      solarmanRuntime.nextCheckAtMs = Date.now() + pollIntervalMs;
      if (typeof onUpdate === 'function') {
        onUpdate(solarmanRuntime);
      }
    } catch (err) {
      solarmanRuntime.loading = false;
      solarmanRuntime.error = err.message;
      solarmanRuntime.nextCheckAtMs = Date.now() + pollIntervalMs;
      if (typeof onUpdate === 'function') {
        onUpdate(solarmanRuntime);
      }
    }
  };

  _syncIntervalId = setInterval(runCheck, pollIntervalMs);

  _countdownIntervalId = setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (typeof onTick === 'function') {
      onTick(solarmanRuntime);
    }
  }, 1000);

  if (typeof document !== 'undefined') {
    _visibilityHandler = () => {
      if (!document.hidden) {
        runCheck();
      }
    };
    document.addEventListener('visibilitychange', _visibilityHandler);
  }
}

/**
 * Stop any active Solarman polling timers and visibility listeners.
 */
export function stopSolarmanLiveSync() {
  if (_syncIntervalId) {
    clearInterval(_syncIntervalId);
    _syncIntervalId = null;
  }
  if (_countdownIntervalId) {
    clearInterval(_countdownIntervalId);
    _countdownIntervalId = null;
  }
  if (_visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', _visibilityHandler);
    _visibilityHandler = null;
  }
}

// ---------------------------------------------------------------------------
// Multi-Plant Demo Generator (Realistic Telemetry Isolated Per Plant)
// ---------------------------------------------------------------------------

