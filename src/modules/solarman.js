/**
 * @module solarman
 * Solarman PV Open API v1.0 & Smart Telemetry Integration Service.
 * Provides:
 *  - On-demand credential management with client-side SHA-256 hashing
 *  - Strict per-project Multi-Plant binding (project.id <-> stationId + deviceSn)
 *  - Intelligent inverter parameter normalization (MPPT DC strings, AC phases, temperatures, cumulative kWh)
 *  - Adaptive collectionTime-synced auto-refresh engine with Page Visibility optimization
 *  - Realistic Multi-Plant Demo mode for instant evaluation
 */

const AUTH_STORAGE_KEY = 'jf_solar_solarman_auth_v1';
const BINDINGS_STORAGE_KEY = 'jf_solar_solarman_bindings_v1';

/** @type {number|null} Active polling interval timer */
let _syncIntervalId = null;
/** @type {number|null} Active countdown ticker timer */
let _countdownIntervalId = null;
/** @type {Function|null} Visibility change listener reference */
let _visibilityHandler = null;

/**
 * Runtime state for Solarman Live view (isolated per active project).
 */
export const solarmanRuntime = {
  /** @type {string|null} Project ID currently loaded in runtime */
  loadedProjectId: null,
  /** @type {boolean} Loading indicator */
  loading: false,
  /** @type {string|null} Last error message */
  error: null,
  /** @type {Array<Object>} All stations available in the connected Solarman account */
  stations: [],
  /** @type {Object|null} Currently bound station for the active project */
  activeStation: null,
  /** @type {Object|null} Real-time station summary from /station/v1.0/realTime */
  stationRealTime: null,
  /** @type {Array<Object>} Devices belonging to the active station */
  devices: [],
  /** @type {string|null} Selected inverter deviceSn */
  activeDeviceSn: null,
  /** @type {Object|null} Raw and parsed currentData for the active inverter */
  deviceData: null,
  /** @type {number|null} Last collectionTime (Unix seconds) observed */
  lastCollectionTime: null,
  /** @type {number|null} Timestamp (ms) when we last polled Solarman */
  lastCheckedAtMs: null,
  /** @type {number} Next scheduled check timestamp (ms) */
  nextCheckAtMs: 0,
  /** @type {boolean} Whether the latest fetch brought a brand-new packet */
  justUpdatedPacket: false,
  /** @type {Array<{ timeLabel: string, powerW: number, collectionTime: number }>} Session live points */
  liveHistory: [],
  /** @type {boolean} Whether station selector modal/drawer is open */
  showStationPicker: false,
};

// ---------------------------------------------------------------------------
// Crypto Utility (Client-side SHA-256)
// ---------------------------------------------------------------------------

/**
 * Compute lowercase SHA-256 hex digest of a string using Web Crypto API.
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function sha256Client(text) {
  const clean = String(text || '');
  if (/^[a-f0-9]{64}$/i.test(clean.trim())) {
    return clean.trim().toLowerCase();
  }
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const msgBuffer = new TextEncoder().encode(clean);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return clean;
}

// ---------------------------------------------------------------------------
// Credential & Session Storage (On-Demand)
// ---------------------------------------------------------------------------

/**
 * Load saved Solarman credentials/session from localStorage or sessionStorage.
 * @returns {Object|null}
 */
export function getSolarmanSession() {
  try {
    const sessionRaw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (sessionRaw) return JSON.parse(sessionRaw);
    const localRaw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (localRaw) return JSON.parse(localRaw);
    return null;
  } catch {
    return null;
  }
}

/**
 * Save Solarman session credentials.
 * @param {Object} sessionData
 * @param {boolean} [remember=true]
 */
export function saveSolarmanSession(sessionData, remember = true) {
  try {
    const payload = JSON.stringify({
      ...sessionData,
      updatedAt: Date.now(),
    });
    sessionStorage.setItem(AUTH_STORAGE_KEY, payload);
    if (remember) {
      localStorage.setItem(AUTH_STORAGE_KEY, payload);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Disconnect and clear Solarman session credentials.
 */
export function clearSolarmanSession() {
  stopSolarmanLiveSync();
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
export function resetSolarmanRuntime() {
  solarmanRuntime.loadedProjectId = null;
  solarmanRuntime.loading = false;
  solarmanRuntime.error = null;
  solarmanRuntime.activeStation = null;
  solarmanRuntime.stationRealTime = null;
  solarmanRuntime.devices = [];
  solarmanRuntime.activeDeviceSn = null;
  solarmanRuntime.deviceData = null;
  solarmanRuntime.lastCollectionTime = null;
  solarmanRuntime.lastCheckedAtMs = null;
  solarmanRuntime.nextCheckAtMs = 0;
  solarmanRuntime.justUpdatedPacket = false;
  solarmanRuntime.liveHistory = [];
  solarmanRuntime.showStationPicker = false;
}

// ---------------------------------------------------------------------------
// Per-Project Multi-Plant Binding (Project ID <-> Solarman Station ID)
// ---------------------------------------------------------------------------

/**
 * Load all project-to-station bindings.
 * @returns {Object<string, { stationId: number|string, stationName: string, deviceSn?: string, boundAt: number }>}
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
export function findSuggestedStationForProject(project, stations = []) {
  if (!stations || stations.length === 0) {
    return { suggested: null, confidence: 'none' };
  }
  if (stations.length === 1) {
    return { suggested: stations[0], confidence: 'single' };
  }
  if (!project) {
    return { suggested: null, confidence: 'none' };
  }

  const norm = str =>
    String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();

  const projName = norm(project.name);
  const projLoc = norm(project.location);
  const projTokens = projName.split(/\s+/).filter(w => w.length >= 3 && !['planta', 'solar', 'proyecto', 'sistema'].includes(w));

  let bestStation = null;
  let bestScore = 0;

  for (const st of stations) {
    const stName = norm(st.name || st.stationName);
    const stAddr = norm(st.locationAddress || st.address || '');
    let score = 0;

    if (projName && stName && (stName.includes(projName) || projName.includes(stName))) {
      score += 50;
    }
    for (const tok of projTokens) {
      if (stName.includes(tok)) score += 20;
      if (stAddr.includes(tok)) score += 10;
    }
    if (projLoc && stAddr && (stAddr.includes(projLoc) || projLoc.includes(stAddr))) {
      score += 15;
    }
    const projCap = parseFloat(project.capacity_kw) || 0;
    const stCap = parseFloat(st.installedCapacity) || 0;
    if (projCap > 0 && stCap > 0 && Math.abs(projCap - stCap) <= 0.6) {
      score += 15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestStation = st;
    }
  }

  if (bestScore >= 25 && bestStation) {
    return { suggested: bestStation, confidence: 'high' };
  }
  return { suggested: null, confidence: 'none' };
}

// ---------------------------------------------------------------------------
// Proxy API Calls (/api/solarman)
// ---------------------------------------------------------------------------

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
    const demoStations = _buildDemoStations(activeProject);
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
    return _buildDemoStations(activeProject);
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
    return _populateDemoTelemetry(project, activeStation, overrideDeviceSn || binding?.deviceSn);
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

    _recordLiveHistoryPoint(newColTime, parsed.summary.acPowerW);
  } else {
    const fallbackColTime = Number(solarmanRuntime.stationRealTime?.lastUpdateTime) || Math.floor(Date.now() / 1000);
    solarmanRuntime.lastCollectionTime = fallbackColTime;
    solarmanRuntime.deviceData = parseDeviceCurrentData({ dataList: [] }, solarmanRuntime.stationRealTime, activeStation, project);
  }

  solarmanRuntime.lastCheckedAtMs = Date.now();
  return solarmanRuntime;
}

function _recordLiveHistoryPoint(collectionTimeSec, powerW) {
  const dateObj = new Date(collectionTimeSec * 1000);
  const timeLabel = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const existing = solarmanRuntime.liveHistory;
  if (existing.length === 0 || existing[existing.length - 1].collectionTime !== collectionTimeSec) {
    existing.push({
      timeLabel,
      powerW: Math.max(0, Number(powerW) || 0),
      collectionTime: collectionTimeSec,
    });
    if (existing.length > 24) existing.shift();
  }
}

// ---------------------------------------------------------------------------
// Parameter Normalizer (Parses Solarman dataList across Inverter Brands)
// ---------------------------------------------------------------------------

/**
 * Normalize Solarman `dataList` key-value telemetry into structured engineering sections.
 * @param {Object} rawCurrentData
 * @param {Object} stationRealTime
 * @param {Object} activeStation
 * @param {Object} project
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
      new RegExp(`pv${i}\\s*voltage`, 'i'),
      new RegExp(`^dv${i}$`, 'i'),
      new RegExp(`^v_?pv${i}$`, 'i'),
      new RegExp(`string\\s*${i}\\s*voltage`, 'i'),
    ]);
    const cItem = findItem([
      new RegExp(`^dc\\s*current\\s*pv${i}$`, 'i'),
      new RegExp(`pv${i}\\s*current`, 'i'),
      new RegExp(`^dc${i}$`, 'i'),
      new RegExp(`^i_?pv${i}$`, 'i'),
      new RegExp(`string\\s*${i}\\s*current`, 'i'),
    ]);
    const pItem = findItem([
      new RegExp(`^dc\\s*power\\s*pv${i}$`, 'i'),
      new RegExp(`pv${i}\\s*power`, 'i'),
      new RegExp(`^dp${i}$`, 'i'),
      new RegExp(`^p_?pv${i}$`, 'i'),
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

  // 2. Extract AC Output Phases (L1 / R, L2 / S, L3 / T)
  const acPhases = [];
  const phaseAliases = [
    { id: 'L1', patternsV: [/ac\s*voltage\s*(r|u|a|l1|1)\b/i, /^grid\s*voltage\s*(l1|r|a)?$/i, /^av1$/i, /^vac1$/i], patternsI: [/ac\s*current\s*(r|u|a|l1|1)\b/i, /^grid\s*current\s*(l1|r|a)?$/i, /^ac1$/i, /^iac1$/i] },
    { id: 'L2', patternsV: [/ac\s*voltage\s*(s|v|b|l2|2)\b/i, /^grid\s*voltage\s*(l2|s|b)$/i, /^av2$/i, /^vac2$/i], patternsI: [/ac\s*current\s*(s|v|b|l2|2)\b/i, /^grid\s*current\s*(l2|s|b)$/i, /^ac2$/i, /^iac2$/i] },
    { id: 'L3', patternsV: [/ac\s*voltage\s*(t|w|c|l3|3)\b/i, /^grid\s*voltage\s*(l3|t|c)$/i, /^av3$/i, /^vac3$/i], patternsI: [/ac\s*current\s*(t|w|c|l3|3)\b/i, /^grid\s*current\s*(l3|t|c)$/i, /^ac3$/i, /^iac3$/i] },
  ];

  const freqItem = findItem([/ac\s*output\s*frequency/i, /grid\s*frequency/i, /frequency/i, /^fac$/i, /^f_ac$/i]);
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

  // 3. Extract Core Power & Energy Totals
  const acPowerItem = findItem([
    /total\s*ac\s*output\s*power/i,
    /^active\s*power$/i,
    /^output\s*active\s*power$/i,
    /^generation\s*power$/i,
    /^pac$/i,
    /^APo_t1$/i,
  ]);
  const dcPowerItem = findItem([
    /total\s*dc\s*input\s*power/i,
    /total\s*pv\s*power/i,
    /^dc\s*power$/i,
    /^DPi_t1$/i,
  ]);

  const dailyYieldItem = findItem([
    /daily\s*production/i,
    /daily\s*generation/i,
    /today.*energy/i,
    /daily\s*energy/i,
    /^Etdy_ge1$/i,
  ]);

  const totalYieldItem = findItem([
    /cumulative\s*production/i,
    /total\s*production/i,
    /total\s*solar\s*generation/i,
    /total\s*energy/i,
    /total\s*generation/i,
    /^Et_ge0$/i,
  ]);

  const sumPvPowerW = pvStrings.reduce((acc, s) => acc + (s.powerW || 0), 0);
  const rtGenPowerW = parseFloat(stationRealTime?.generationPower) || parseFloat(activeStation?.generationPower) || 0;

  const acPowerW = acPowerItem
    ? toWatts(acPowerItem.value, acPowerItem.unit)
    : rtGenPowerW > 0
      ? rtGenPowerW
      : sumPvPowerW;

  const dcPowerW = dcPowerItem
    ? toWatts(dcPowerItem.value, dcPowerItem.unit)
    : sumPvPowerW > 0
      ? sumPvPowerW
      : acPowerW > 0
        ? Math.round(acPowerW / 0.972)
        : 0;

  const dailyEnergyKwh = dailyYieldItem
    ? toKwh(dailyYieldItem.value, dailyYieldItem.unit)
    : parseFloat(stationRealTime?.generationValue) || 0;

  const totalEnergyKwh = totalYieldItem
    ? toKwh(totalYieldItem.value, totalYieldItem.unit)
    : 0;

  const gridPowerItem = findItem([/total\s*grid\s*power/i, /grid\s*power/i, /meter\s*active\s*power/i]);
  const loadPowerItem = findItem([/total\s*consumption\s*power/i, /load\s*power/i, /consumption\s*power/i]);
  const battPowerItem = findItem([/battery\s*power/i]);
  const battSocItem = findItem([/battery\s*soc/i, /soc/i]);

  const gridPowerW = gridPowerItem
    ? toWatts(gridPowerItem.value, gridPowerItem.unit)
    : parseFloat(stationRealTime?.gridPower ?? stationRealTime?.wirePower) || 0;

  const loadPowerW = loadPowerItem
    ? toWatts(loadPowerItem.value, loadPowerItem.unit)
    : parseFloat(stationRealTime?.usePower) || 0;

  const batteryPowerW = battPowerItem
    ? toWatts(battPowerItem.value, battPowerItem.unit)
    : parseFloat(stationRealTime?.batteryPower) || 0;

  const batterySocPct = battSocItem
    ? parseFloat(battSocItem.value) || 0
    : parseFloat(stationRealTime?.batterySoc) || null;

  // 4. Temperatures
  const tempItems = dataList.filter(
    it =>
      /temp/i.test(String(it.name || '')) ||
      /temp/i.test(String(it.key || '')) ||
      String(it.unit || '').includes('℃') ||
      String(it.unit || '').includes('°C'),
  );
  const temperatures = tempItems.map(t => ({
    name: t.name || t.key,
    valueC: parseFloat(t.value) || 0,
  }));

  const mainTempC = temperatures.length > 0 ? temperatures[0].valueC : null;
  const capacityKw = parseFloat(project?.capacity_kw) || parseFloat(activeStation?.installedCapacity) || 0;
  const loadFactorPct = capacityKw > 0 ? Math.min(100, ((acPowerW / 1000) / capacityKw) * 100) : 0;
  const inverterEfficiencyPct = dcPowerW > 0 && acPowerW > 0
    ? Math.min(99.5, (acPowerW / dcPowerW) * 100)
    : 0;

  return {
    deviceSn: rawCurrentData.deviceSn || '',
    deviceState: Number(rawCurrentData.deviceState) || 1,
    collectionTime,
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
      mainTempC,
      capacityKw,
      loadFactorPct,
      inverterEfficiencyPct,
    },
    pvStrings,
    acPhases,
    temperatures,
    rawList: dataList,
  };
}

// ---------------------------------------------------------------------------
// Adaptive Auto-Update Engine (Synced with Solarman 5-min Logger Cadence)
// ---------------------------------------------------------------------------

/**
 * Start intelligent auto-refresh for the active project's Solarman station.
 * Automatically pauses when browser tab is hidden and checks for new collectionTime packets.
 * @param {Object} params
 * @param {Function} params.getActiveProject - Returns current state.activeProject
 * @param {Function} params.onUpdate - Callback invoked when telemetry refreshes
 * @param {Function} params.onTick - Callback invoked every second to update relative time & countdown UI
 */
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

function _buildDemoStations(activeProject) {
  const projName = activeProject?.name || 'Planta Principal JF Solar';
  const projLoc = activeProject?.location || 'Cali, Colombia';
  const projCap = parseFloat(activeProject?.capacity_kw) || 5.5;

  return [
    {
      id: 901001,
      name: `${projName} (Solarman Cloud)`,
      locationAddress: projLoc,
      installedCapacity: projCap,
      generationPower: Math.round(projCap * 740),
      networkStatus: 'NORMAL',
      lastUpdateTime: Math.floor(Date.now() / 1000) - 42,
      _defaultSn: 'SN2409881024',
      _seedOffset: 0,
    },
    {
      id: 901002,
      name: 'Planta Comercial Sede Norte (Solarman #2)',
      locationAddress: 'Medellín, Antioquia',
      installedCapacity: 15.0,
      generationPower: 11420,
      networkStatus: 'NORMAL',
      lastUpdateTime: Math.floor(Date.now() / 1000) - 95,
      _defaultSn: 'SN2411550901',
      _seedOffset: 100,
    },
    {
      id: 901003,
      name: 'Planta Agroindustrial Sabana (Solarman #3)',
      locationAddress: 'Bogotá / Cundinamarca',
      installedCapacity: 25.0,
      generationPower: 18650,
      networkStatus: 'NORMAL',
      lastUpdateTime: Math.floor(Date.now() / 1000) - 120,
      _defaultSn: 'SN2419004412',
      _seedOffset: 250,
    },
  ];
}

function _populateDemoTelemetry(project, activeStation, requestedSn) {
  const capKw = parseFloat(activeStation.installedCapacity) || parseFloat(project?.capacity_kw) || 5.5;
  const snMain = activeStation._defaultSn || `SN${String(activeStation.id)}01`;
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

  // Dynamic wave so demo updates slightly on each sync cycle
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
  const baseTotalKwh = (Number(activeStation.id) === 901001 ? 8420.6 : Number(activeStation.id) === 901002 ? 24910.4 : 41280.9);
  const totalKwh = Number((baseTotalKwh + (Date.now() % 100000) / 50000).toFixed(1));
  const loadPowerW = Math.round(acPowerW * 0.72);
  const gridPowerW = acPowerW - loadPowerW;
  const colTime = Math.floor(Date.now() / 1000);

  solarmanRuntime.stationRealTime = {
    generationPower: acPowerW,
    usePower: loadPowerW,
    gridPower: gridPowerW,
    generationValue: dailyKwh,
    lastUpdateTime: colTime,
  };

  const mockCurrentData = {
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

  const parsed = parseDeviceCurrentData(mockCurrentData, solarmanRuntime.stationRealTime, activeStation, project);
  solarmanRuntime.justUpdatedPacket =
    solarmanRuntime.lastCollectionTime !== null && colTime > solarmanRuntime.lastCollectionTime;
  solarmanRuntime.lastCollectionTime = colTime;
  solarmanRuntime.deviceData = parsed;
  solarmanRuntime.lastCheckedAtMs = Date.now();
  _recordLiveHistoryPoint(colTime, acPowerW);

  return solarmanRuntime;
}
