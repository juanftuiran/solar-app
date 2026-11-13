/**
 * @module charts
 * @description Barrel export for modularized Chart.js renderers (dashboard analytics & Solarman intraday charts).
 */

export {
  CHART_COLORS,
  syncChartTheme,
  hexToRgba,
  compact,
  destroyAllCharts,
  updateChartIcons,
} from './charts/core.js';

export {
  renderEnergyChart,
  renderMixChart,
  renderPriceChart,
  renderPerformanceChart,
  renderPaybackChart,
  renderProjectionChart,
  renderSparkline,
} from './charts/dashboardCharts.js';

export {
  renderSolarmanDailyChart,
  renderSolarmanPeriodBarsChart,
} from './charts/solarmanCharts.js';
