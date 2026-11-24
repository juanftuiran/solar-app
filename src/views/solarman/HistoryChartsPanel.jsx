import React, { useMemo } from 'react';
import {
  Activity,
  AreaChart,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudDownload,
  FlaskConical,
  Info,
  Loader2,
  Sun,
  Thermometer,
  Zap,
} from 'lucide-react';
import { fDec } from '../../modules/formatters.js';
import { getLocalDateISO, shiftISODate } from '../../modules/utils.js';
import { renderSolarmanDailyChart, renderSolarmanPeriodBarsChart } from '../../modules/charts/solarmanCharts.js';
import { useApp } from '../../context/AppContext.jsx';
import ChartCanvas from '../../components/ChartCanvas.jsx';

function computeHistoryStats(rt) {
  const isMonth = rt.historyRange === 'month';
  if (isMonth) {
    const bars = rt.monthlyHistoryPoints || [];
    const totalGen = bars.reduce((s, b) => s + (b.generationKwh || 0), 0);
    const totalUse = bars.reduce((s, b) => s + (b.consumptionKwh || 0), 0);
    const best = bars.reduce((m, b) => (b.generationKwh > (m?.generationKwh || -1) ? b : m), null);
    return {
      isMonth: true,
      count: bars.length,
      peakLabel: best ? `${fDec(best.generationKwh, 1)} kWh (${best.label})` : '—',
      totalGen: `${fDec(totalGen, 1)} kWh`,
      totalUse: `${fDec(totalUse, 1)} kWh`,
    };
  }

  const pts = rt.dailyHistoryPoints || [];
  let maxPower = 0;
  let maxLoad = 0;
  let maxTemp = null;
  let minSoc = null;
  let maxSoc = null;

  for (const p of pts) {
    if ((p.powerW || 0) > maxPower) maxPower = p.powerW;
    if ((p.loadW || 0) > maxLoad) maxLoad = p.loadW;
    if (p.tempC !== null && p.tempC !== undefined) {
      maxTemp = maxTemp === null ? p.tempC : Math.max(maxTemp, p.tempC);
    }
    if (p.batterySocPct !== null && p.batterySocPct !== undefined) {
      minSoc = minSoc === null ? p.batterySocPct : Math.min(minSoc, p.batterySocPct);
      maxSoc = maxSoc === null ? p.batterySocPct : Math.max(maxSoc, p.batterySocPct);
    }
  }

  return {
    isMonth: false,
    count: pts.length,
    maxPower: pts.length ? `${Math.round(maxPower)} W` : '—',
    maxLoad: maxLoad > 0 ? `${Math.round(maxLoad)} W` : '—',
    maxTemp: maxTemp !== null ? `${fDec(maxTemp, 1)} °C` : '—',
    socRange: minSoc !== null ? `${Math.round(minSoc)}–${Math.round(maxSoc)}%` : null,
  };
}

export default function HistoryChartsPanel({
  runtime,
  session,
  onChangeDate,
  onChangeRange,
  onChangeMetric,
}) {
  const { lang, theme, t } = useApp();
  const todayISO = getLocalDateISO();
  const yesterdayISO = shiftISODate(todayISO, -1);
  const selectedDate = runtime.selectedDate || todayISO;
  const isToday = selectedDate === todayISO;
  const isYesterday = selectedDate === yesterdayISO;
  const isMonth = runtime.historyRange === 'month';
  const metric = runtime.historyMetric || 'power';
  const points = isMonth ? (runtime.monthlyHistoryPoints || []) : (runtime.dailyHistoryPoints || []);
  const stats = useMemo(
    () => computeHistoryStats(runtime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMonth, selectedDate, runtime.dailyHistoryPoints, runtime.monthlyHistoryPoints],
  );

  return (
    <div className="card section-card solarman-history-card" id="solarman-history-card">
      <div className="section-head" style={{ marginBottom: '0.85rem', gap: '0.75rem' }}>
        <div className="section-head-title">
          <div className="icon-tile solar" aria-hidden="true"><AreaChart size={18} /></div>
          <div>
            <h2>{t('solarmanHistoryTitle')}</h2>
            <p>{t('solarmanHistoryDesc')}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {session?.isDemo || runtime.historySource === 'demo' ? (
            <span className="meta-chip ai">
              <FlaskConical size={12} aria-hidden="true" />
              <span>{lang === 'en' ? 'Historical Demo' : 'Simulación Histórica'}</span>
            </span>
          ) : runtime.historySource === 'live_fallback' ? (
            <span className="meta-chip accent">
              <Activity size={12} aria-hidden="true" />
              <span>{lang === 'en' ? 'Live Session Curve' : 'Curva Sesión en Vivo'}</span>
            </span>
          ) : (
            <span className="meta-chip solar">
              <CloudDownload size={12} aria-hidden="true" />
              <span>{lang === 'en' ? 'Cloud History' : 'Historial Cloud'}</span>
            </span>
          )}

          <div className="segmented" id="sm-range-toggle">
            <button
              type="button"
              className={`segmented-btn ${!isMonth ? 'active' : ''}`}
              onClick={() => onChangeRange('day')}
            >
              <Clock size={13} aria-hidden="true" />
              <span>{t('day')}</span>
            </button>
            <button
              type="button"
              className={`segmented-btn ${isMonth ? 'active' : ''}`}
              onClick={() => onChangeRange('month')}
            >
              <CalendarDays size={13} aria-hidden="true" />
              <span>{t('days14')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="sm-chart-toolbar">
        <div className="sm-date-controls">
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-icon"
            title={lang === 'en' ? 'Previous day' : 'Día anterior'}
            aria-label={lang === 'en' ? 'Previous day' : 'Día anterior'}
            onClick={() => onChangeDate(shiftISODate(selectedDate, -1))}
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </button>

          <input
            type="date"
            id="sm-hist-date"
            className="sm-date-input"
            value={selectedDate}
            max={todayISO}
            aria-label={t('readingDate')}
            onChange={(e) => {
              if (e.target.value) onChangeDate(e.target.value);
            }}
          />

          <button
            type="button"
            className="btn btn-ghost btn-xs btn-icon"
            disabled={isToday}
            title={lang === 'en' ? 'Next day' : 'Día siguiente'}
            aria-label={lang === 'en' ? 'Next day' : 'Día siguiente'}
            onClick={() => {
              const next = shiftISODate(selectedDate, 1);
              if (next <= todayISO) onChangeDate(next);
            }}
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={`btn ${isToday ? 'btn-solar' : 'btn-ghost'} btn-xs`}
            onClick={() => onChangeDate(todayISO)}
          >
            {t('today')}
          </button>
          <button
            type="button"
            className={`btn ${isYesterday ? 'btn-solar' : 'btn-ghost'} btn-xs`}
            onClick={() => onChangeDate(yesterdayISO)}
          >
            {t('yesterday')}
          </button>
        </div>

        {!isMonth && (
          <div className="segmented sm-metric-pills" id="sm-metric-toggle">
            <button
              type="button"
              className={`segmented-btn ${metric === 'power' ? 'active' : ''}`}
              onClick={() => onChangeMetric('power')}
            >
              <Zap size={13} aria-hidden="true" />
              <span>{t('powerW')}</span>
            </button>
            <button
              type="button"
              className={`segmented-btn ${metric === 'battery' ? 'active' : ''}`}
              onClick={() => onChangeMetric('battery')}
            >
              <Thermometer size={13} aria-hidden="true" />
              <span>{t('batteryTemp')}</span>
            </button>
            <button
              type="button"
              className={`segmented-btn ${metric === 'pv' ? 'active' : ''}`}
              onClick={() => onChangeMetric('pv')}
            >
              <Sun size={13} aria-hidden="true" />
              <span>{t('stringsV')}</span>
            </button>
          </div>
        )}
      </div>

      <div className="sm-hist-stats">
        {stats.isMonth ? (
          <>
            <div className="sm-hist-stat">
              <span className="lbl">{lang === 'en' ? '14D Generation' : 'Generación 14D'}</span>
              <strong className="val text-solar">{stats.totalGen}</strong>
            </div>
            <div className="sm-hist-stat">
              <span className="lbl">{lang === 'en' ? '14D Consumption' : 'Consumo 14D'}</span>
              <strong className="val text-accent">{stats.totalUse}</strong>
            </div>
            <div className="sm-hist-stat">
              <span className="lbl">{lang === 'en' ? 'Best Day' : 'Mejor Día'}</span>
              <strong className="val text-warning">{stats.peakLabel}</strong>
            </div>
            <div className="sm-hist-stat">
              <span className="lbl">{lang === 'en' ? 'Days Logged' : 'Días Registrados'}</span>
              <strong className="val">{stats.count}</strong>
            </div>
          </>
        ) : (
          <>
            <div className="sm-hist-stat">
              <span className="lbl">{lang === 'en' ? 'Peak PV Power' : 'Pico Solar Día'}</span>
              <strong className="val text-solar">{stats.maxPower}</strong>
            </div>
            <div className="sm-hist-stat">
              <span className="lbl">{lang === 'en' ? 'Peak Load' : 'Carga Máxima'}</span>
              <strong className="val text-accent">{stats.maxLoad}</strong>
            </div>
            <div className="sm-hist-stat">
              <span className="lbl">
                {stats.socRange
                  ? (lang === 'en' ? 'SOC Range / Max Temp' : 'Rango SOC / Temp. Máx')
                  : (lang === 'en' ? 'Max Temp' : 'Temp. Máxima')}
              </span>
              <strong className="val text-warning">
                {stats.socRange ? `${stats.socRange} · ${stats.maxTemp}` : stats.maxTemp}
              </strong>
            </div>
            <div className="sm-hist-stat">
              <span className="lbl">{lang === 'en' ? 'Samples' : 'Puntos Horarios'}</span>
              <strong className="val">{stats.count}</strong>
            </div>
          </>
        )}
      </div>

      {runtime.historyError && (
        <div className="anomaly-banner warning" style={{ marginBottom: '0.75rem' }}>
          <div className="anomaly-icon" aria-hidden="true"><Info size={16} /></div>
          <div className="anomaly-content">
            <strong>{lang === 'en' ? 'History Query Notice' : 'Aviso de Consulta Histórica'}</strong>
            <p>{runtime.historyError}</p>
          </div>
        </div>
      )}

      <div className="sm-chart-wrap" style={{ position: 'relative' }}>
        {runtime.historyLoading && (
          <div className="sm-chart-loading">
            <Loader2 size={16} className="spin text-solar" aria-hidden="true" />
            <span>{lang === 'en' ? 'Fetching daily history...' : 'Consultando historial del día...'}</span>
          </div>
        )}
        <ChartCanvas
          id="chart-solarman-daily"
          ariaLabel={t('solarmanHistoryTitle')}
          renderFn={(canvas) =>
            isMonth
              ? renderSolarmanPeriodBarsChart(runtime.monthlyHistoryPoints || [], canvas)
              : renderSolarmanDailyChart(runtime.dailyHistoryPoints || [], metric, runtime.deviceData, canvas)
          }
          deps={[isMonth, points, metric, runtime.deviceData, theme, lang]}
        />
      </div>
    </div>
  );
}
