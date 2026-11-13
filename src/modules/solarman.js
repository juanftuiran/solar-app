/**
 * @module solarman
 * @description Barrel export for modularized Solarman OpenAPI telemetry, storage, matching, sync & history.
 */

export {
  solarmanRuntime,
  sha256Client,
  resetSolarmanRuntime,
  recordLiveHistoryPoint,
} from './solarman/runtime.js';

export {
  getSolarmanSession,
  saveSolarmanSession,
  clearSolarmanSession,
  getAllProjectBindings,
  getProjectStationBinding,
  setProjectStationBinding,
  setProjectDeviceBinding,
  clearProjectStationBinding,
} from './solarman/storage.js';

export { findSuggestedStationForProject } from './solarman/matcher.js';

export {
  parseDeviceCurrentData,
  parseHistoricalDayPoints,
  parseHistoricalPeriodBars,
} from './solarman/parser.js';

export {
  authenticateSolarman,
  activateDemoSolarmanSession,
  fetchSolarmanStations,
  syncProjectSolarmanTelemetry,
  startSolarmanLiveSync,
  stopSolarmanLiveSync,
} from './solarman/sync.js';

export { fetchSolarmanDailyHistory } from './solarman/history.js';
