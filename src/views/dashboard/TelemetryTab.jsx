import React, { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BatteryCharging,
  Calculator,
  Calendar,
  Coins,
  Gauge,
  LineChart,
  Minus,
  PieChart,
  PiggyBank,
  Sun,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { fCOP, fDailyRate, fDec, fHsp, fKwh, fPct, fYield } from '../../modules/formatters.js';
import { calcKPIs, detectAnomalies } from '../../modules/analytics.js';
import { CHART_COLORS } from '../../modules/charts/core.js';
import {
  renderEnergyChart,
  renderMixChart,
  renderPerformanceChart,
  renderPriceChart,
  renderSparkline,
} from '../../modules/charts/dashboardCharts.js';
import { useApp } from '../../context/AppContext.jsx';
import { useProject } from '../../context/ProjectContext.jsx';
import ChartCanvas from '../../components/ChartCanvas.jsx';

function DeltaBadge({ value, invertColors = false, suffix = '%' }) {
  const { t } = useApp();
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const num = parseFloat(value);
  const isUp = num > 0.05;
  const isDown = num < -0.05;
  let tone = '';
  if (isUp) tone = invertColors ? 'down' : 'up';
  if (isDown) tone = invertColors ? 'up' : 'down';

  return (
    <span className={`delta ${tone}`}>
      {isUp ? (
        <TrendingUp size={12} aria-hidden="true" />
      ) : isDown ? (
        <TrendingDown size={12} aria-hidden="true" />
      ) : (
        <Minus size={12} aria-hidden="true" />
      )}
      {' '}
      {num > 0 ? '+' : ''}{fDec(num, 1)}{suffix} {t('momShort')}
    </span>
  );
}

export default function TelemetryTab({ viewData: propViewData }) {
  const outletCtx = useOutletContext() || {};
  const viewData = propViewData || outletCtx.viewData || [];
  const { lang, theme, chartModes, setChartMode, t } = useApp();
  const { activeState, processedData } = useProject();

  const capacity = parseFloat(activeState.project?.capacity_kw) || 0;
  const kpis = useMemo(
    () => calcKPIs(viewData, processedData, activeState.investments, capacity),
    [viewData, processedData, activeState.investments, capacity, lang],
  );
  const anomalies = useMemo(() => detectAnomalies(viewData), [viewData]);

  const mixTotals = useMemo(() => {
    const solar = viewData.reduce((s, d) => s + (d.prodBruta || 0), 0);
    const grid = viewData.reduce((s, d) => s + (d.consumoRed || 0), 0);
    return { solar, grid, total: solar + grid };
  }, [viewData]);

  const energyMode = chartModes.energia || 'bar';
  const priceMode = chartModes.precio || 'line';

  const kpiCards = [
    {
      id: 'kpi-ahorro',
      Icon: PiggyBank,
      color: 'var(--solar)',
      chartColor: CHART_COLORS.solar,
      bg: 'var(--solar-subtle)',
      label: t('periodSavings'),
      value: fCOP(kpis.savings),
      sub: t('netEconomicSavings'),
      delta: kpis.deltas.savings,
      invert: false,
      suffix: '%',
      series: viewData.map((d) => d.ahorroReal),
    },
    {
      id: 'kpi-produccion',
      Icon: Sun,
      color: 'var(--accent)',
      chartColor: CHART_COLORS.accent,
      bg: 'var(--accent-subtle)',
      label: t('solarProduction'),
      value: fKwh(kpis.gen),
      sub: t('grossTotalGen'),
      delta: kpis.deltas.gen,
      invert: false,
      suffix: '%',
      series: viewData.map((d) => d.prodBruta),
    },
    {
      id: 'kpi-autonomia',
      Icon: BatteryCharging,
      color: 'var(--ai)',
      chartColor: CHART_COLORS.ai,
      bg: 'var(--ai-subtle)',
      label: t('solarAutonomy'),
      value: fPct(kpis.autonomy),
      sub: t('last3RecordsAvg'),
      delta: kpis.deltas.autonomy,
      invert: false,
      suffix: ' pts',
      series: viewData.map((d) => d.autonomia),
    },
    {
      id: 'kpi-var-kw',
      Icon: TrendingUp,
      color: 'var(--warning)',
      chartColor: CHART_COLORS.warning,
      bg: 'var(--warning-subtle)',
      label: t('gridTariffVar'),
      value: fPct(kpis.varKw),
      sub: t('momFluctuation'),
      delta: kpis.deltas.price,
      invert: true,
      suffix: '%',
      series: viewData.map((d) => d.precioKw),
    },
  ];

  return (
    <>
      <div className="solar-health-banner" id="solar-health-banner">
        <div className="solar-metric-item">
          <div className="solar-metric-icon" style={{ background: 'var(--solar-subtle)', color: 'var(--solar)' }} aria-hidden="true">
            <Activity size={18} />
          </div>
          <div className="solar-metric-info">
            <span className="solar-metric-lbl">{t('plantHealth')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginTop: '.15rem' }}>
              <span className={`health-pill ${kpis.healthScore}`} id="sh-health-pill">
                <span className="health-pulse-dot" aria-hidden="true" />
                <span id="sh-health-text">{kpis.healthLabel}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="solar-metric-item">
          <div className="solar-metric-icon" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }} aria-hidden="true">
            <Zap size={18} />
          </div>
          <div className="solar-metric-info">
            <span className="solar-metric-lbl">{t('specificYieldShort')}</span>
            <span className="solar-metric-val text-accent">{fYield(kpis.specificYield)}</span>
          </div>
        </div>

        <div className="solar-metric-item">
          <div className="solar-metric-icon" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }} aria-hidden="true">
            <Sun size={18} />
          </div>
          <div className="solar-metric-info">
            <span className="solar-metric-lbl">{t('peakSunHours')}</span>
            <span className="solar-metric-val text-warning">{fHsp(kpis.lastHsp ?? kpis.avgHsp)}</span>
          </div>
        </div>

        <div className="solar-metric-item">
          <div className="solar-metric-icon" style={{ background: 'var(--solar-subtle)', color: 'var(--solar)' }} aria-hidden="true">
            <Gauge size={18} />
          </div>
          <div className="solar-metric-info">
            <span className="solar-metric-lbl">{t('performanceRatio')}</span>
            <span className="solar-metric-val text-solar">{kpis.pr > 0 ? `${fDec(kpis.pr, 1)}%` : '—'}</span>
          </div>
        </div>

        <div className="solar-metric-item">
          <div className="solar-metric-icon" style={{ background: 'var(--ai-subtle)', color: 'var(--ai)' }} aria-hidden="true">
            <Calendar size={18} />
          </div>
          <div className="solar-metric-info">
            <span className="solar-metric-lbl">{t('dailyGenRate')}</span>
            <span className="solar-metric-val text-ai">{fDailyRate(kpis.avgDailyGen)}</span>
          </div>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div id="anomaly-alerts-container" className="anomaly-alerts-stack">
          {anomalies.map((a, idx) => (
            <div key={idx} className={`anomaly-banner ${a.type}`}>
              <div className="anomaly-icon" aria-hidden="true">
                {a.type === 'warning' ? <AlertTriangle size={18} /> : <Zap size={18} />}
              </div>
              <div className="anomaly-content">
                <strong>{lang === 'en' ? a.titleEn : a.titleEs}</strong>
                <p>{lang === 'en' ? a.descEn : a.descEs}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="kpi-grid">
        {kpiCards.map((kpi) => (
          <div key={kpi.id} className="card kpi-card" style={{ '--kpi-color': kpi.color }}>
            <div className="kpi-header">
              <span className="kpi-label">{kpi.label}</span>
              <div className="kpi-icon-wrap" style={{ background: kpi.bg, color: kpi.color }} aria-hidden="true">
                <kpi.Icon size={16} />
              </div>
            </div>
            <div className="kpi-value" id={kpi.id}>{kpi.value}</div>
            <div className="kpi-footer">
              <div className="kpi-subtext">
                <span className="kpi-delta-slot">
                  <DeltaBadge value={kpi.delta} invertColors={kpi.invert} suffix={kpi.suffix} />
                </span>
                <span>{kpi.sub}</span>
              </div>
              <div className="kpi-spark">
                <ChartCanvas
                  id={`spark-${kpi.id}`}
                  renderFn={(canvas) => renderSparkline(canvas, kpi.series, kpi.chartColor)}
                  deps={[kpi.series, theme]}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card chart-wrap span-2">
          <div className="chart-header">
            <div className="chart-title">
              <h3>
                <Zap size={16} style={{ color: 'var(--solar)' }} aria-hidden="true" />
                <span>{t('energyBalanceTitle')}</span>
              </h3>
              <p className="chart-subtitle">{t('energyBalanceDesc')}</p>
            </div>
            <div className="segmented-control" id="control-chart-energia">
              <button
                type="button"
                className={`segmented-btn ${energyMode === 'bar' ? 'active' : ''}`}
                aria-label={t('barView')}
                title={t('barView')}
                onClick={() => setChartMode('energia', 'bar')}
              >
                <BarChart3 size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`segmented-btn ${energyMode === 'line' ? 'active' : ''}`}
                aria-label={t('lineView')}
                title={t('lineView')}
                onClick={() => setChartMode('energia', 'line')}
              >
                <LineChart size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="chart-container tall">
            <ChartCanvas
              id="chart-energia"
              ariaLabel={t('energyBalanceTitle')}
              renderFn={(canvas) => renderEnergyChart(viewData, canvas)}
              deps={[viewData, energyMode, theme, lang]}
            />
          </div>
        </div>

        <div className="card chart-wrap">
          <div className="chart-header">
            <div className="chart-title">
              <h3>
                <PieChart size={16} style={{ color: 'var(--accent)' }} aria-hidden="true" />
                <span>{t('energyMix')}</span>
              </h3>
              <p className="chart-subtitle">{t('cumulativeSolarShare')}</p>
            </div>
          </div>
          <div className="mix-wrap">
            <div className="mix-chart">
              <ChartCanvas
                id="chart-mix"
                ariaLabel={t('energyMix')}
                renderFn={(canvas) => renderMixChart(viewData, canvas)}
                deps={[viewData, theme, lang]}
              />
            </div>
            <div className="mix-legend">
              <div className="mix-legend-row">
                <span className="lbl"><span className="legend-dot" style={{ background: 'var(--solar)' }} /> {t('solarPv')}</span>
                <span className="val text-solar">{fDec(mixTotals.solar, 0)} kWh</span>
              </div>
              <div className="mix-legend-row">
                <span className="lbl"><span className="legend-dot" style={{ background: 'var(--grid-c)' }} /> {t('gridPower')}</span>
                <span className="val text-grid">{fDec(mixTotals.grid, 0)} kWh</span>
              </div>
              <div className="mix-legend-row">
                <span className="lbl">
                  <Calculator size={12} style={{ color: 'var(--text-secondary)' }} aria-hidden="true" /> {t('totalConsumed')}
                </span>
                <span className="val text-strong">{fDec(mixTotals.total, 0)} kWh</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid two" style={{ marginTop: '1.25rem' }}>
        <div className="card chart-wrap">
          <div className="chart-header">
            <div className="chart-title">
              <h3>
                <Sun size={16} style={{ color: 'var(--warning)' }} aria-hidden="true" />
                <span>{t('perfHspTitle')}</span>
              </h3>
              <p className="chart-subtitle">{t('perfHspDesc')}</p>
            </div>
          </div>
          <div className="chart-container">
            <ChartCanvas
              id="chart-rendimiento"
              ariaLabel={t('perfHspTitle')}
              renderFn={(canvas) => renderPerformanceChart(viewData, canvas)}
              deps={[viewData, capacity, theme, lang]}
            />
          </div>
        </div>

        <div className="card chart-wrap">
          <div className="chart-header">
            <div className="chart-title">
              <h3>
                <Coins size={16} style={{ color: 'var(--warning)' }} aria-hidden="true" />
                <span>{t('kwTariffFluctTitle')}</span>
              </h3>
              <p className="chart-subtitle">{t('kwTariffFluctDesc')}</p>
            </div>
            <div className="segmented-control" id="control-chart-precio">
              <button
                type="button"
                className={`segmented-btn ${priceMode === 'line' ? 'active' : ''}`}
                aria-label={t('lineView')}
                title={t('lineView')}
                onClick={() => setChartMode('precio', 'line')}
              >
                <LineChart size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`segmented-btn ${priceMode === 'bar' ? 'active' : ''}`}
                aria-label={t('barView')}
                title={t('barView')}
                onClick={() => setChartMode('precio', 'bar')}
              >
                <BarChart3 size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="chart-container">
            <ChartCanvas
              id="chart-precio"
              ariaLabel={t('kwTariffFluctTitle')}
              renderFn={(canvas) => renderPriceChart(viewData, canvas)}
              deps={[viewData, priceMode, theme, lang]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
