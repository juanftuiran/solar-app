import React, { useMemo, useState } from 'react';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Flag,
  Landmark,
  Leaf,
  Minus,
  Percent,
  PieChart,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sun,
  Table2,
  Trees,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { fCOP, fDec } from '../../modules/formatters.js';
import { calcFinancialSimulation, calcKPIs, calcProjections } from '../../modules/analytics.js';
import { compact, renderPaybackChart, renderProjectionChart } from '../../modules/charts.js';
import { useApp } from '../../context/AppContext.jsx';
import { useProject } from '../../context/ProjectContext.jsx';
import ChartCanvas from '../../components/ChartCanvas.jsx';

export default function FinanceTab({ viewData }) {
  const { lang, theme, simParams, updateSimParams, resetSimParams, t } = useApp();
  const { activeState, processedData } = useProject();
  const [showTable, setShowTable] = useState(false);

  const capacity = parseFloat(activeState.project?.capacity_kw) || 0;
  const investments = activeState.investments || [];

  const totalInvestment = useMemo(
    () => investments.reduce((s, i) => s + (parseFloat(i.investment_cop) || 0), 0),
    [investments],
  );

  const kpis = useMemo(
    () => calcKPIs(viewData, processedData, investments, capacity),
    [viewData, processedData, investments, capacity, lang],
  );

  const proj = useMemo(() => calcProjections(viewData), [viewData, lang]);

  const sim = useMemo(
    () => calcFinancialSimulation(processedData, investments, simParams),
    [processedData, investments, simParams, capacity],
  );

  const totalSavingsAll = useMemo(
    () => processedData.reduce((s, d) => s + (d.ahorroReal || 0), 0),
    [processedData],
  );

  const paybackMonths = kpis.avgSavings > 0 ? totalInvestment / kpis.avgSavings : 0;
  const paybackYears = paybackMonths / 12;
  const progressPct = totalInvestment > 0 ? Math.min(100, Math.max(0, (totalSavingsAll / totalInvestment) * 100)) : 0;

  return (
    <>
      <div className="card roi-panel">
        <div className="section-head" style={{ marginBottom: '1.25rem' }}>
          <div className="section-head-title">
            <div className="icon-tile accent" aria-hidden="true"><PieChart size={18} /></div>
            <div>
              <h3>{t('roiPanelTitle')}</h3>
              <p>{t('roiPanelDesc')}</p>
            </div>
          </div>
          <span className="meta-chip accent">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>{t('activePayback')}</span>
          </span>
        </div>

        <div className="roi-body">
          <div className="roi-ring" style={{ '--p': progressPct.toFixed(1) }}>
            <div className="roi-ring-inner">
              <span className="roi-ring-value">{progressPct.toFixed(0)}%</span>
              <span className="roi-ring-label">{t('amortized')}</span>
            </div>
          </div>

          <div className="payback-bar-container">
            <div className="payback-bar-header">
              <span className="lbl">{t('paybackProgress')}</span>
              <span style={{ fontWeight: 800, color: 'var(--solar)' }} className="tabular-nums">
                {progressPct.toFixed(1)}% ({fCOP(totalSavingsAll)})
              </span>
            </div>
            <div className="payback-bar-track">
              <div className="payback-bar-fill" style={{ width: `${progressPct.toFixed(1)}%` }} />
            </div>

            <div className="payback-stats-grid">
              <div className="payback-stat-col">
                <span className="payback-stat-lbl">{t('totalInvestment')}</span>
                <span className="payback-stat-val text-accent">{fCOP(totalInvestment)}</span>
              </div>
              <div className="payback-stat-col">
                <span className="payback-stat-lbl">{t('avgMonthlySavings')}</span>
                <span className="payback-stat-val text-solar">{fCOP(kpis.avgSavings)}</span>
              </div>
              <div className="payback-stat-col">
                <span className="payback-stat-lbl">{t('estPaybackTime')}</span>
                <span className="payback-stat-val text-strong">
                  <span>{paybackYears > 0 ? fDec(paybackYears, 1) : '0'}</span>{' '}
                  <span style={{ fontSize: '.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {t('yearsShort')}
                  </span>
                </span>
              </div>
              <div className="payback-stat-col">
                <span className="payback-stat-lbl">{t('totalSaved')}</span>
                <span className="payback-stat-val text-solar">{fCOP(totalSavingsAll)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="roi-chart-head">
          <h4>
            <TrendingUp size={15} style={{ color: 'var(--solar)' }} aria-hidden="true" />
            <span>{t('historicalPaybackCurve')}</span>
          </h4>
          <span className="stat-tile-sub">{t('breakevenHint')}</span>
        </div>
        <div className="chart-container short">
          <ChartCanvas
            id="chart-payback"
            renderFn={() => renderPaybackChart()}
            deps={[processedData, investments, theme, lang]}
          />
        </div>
      </div>

      <div className="ai-panel">
        <div className="ai-inner">
          <div className="ai-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
              <div className="icon-tile ai" aria-hidden="true"><Brain size={18} /></div>
              <div>
                <h3 style={{ fontSize: '.95rem', fontWeight: 800, color: 'var(--text-strong)' }}>
                  {t('econometricTitle')}
                </h3>
                <p style={{ fontSize: '.74rem', color: 'var(--text-secondary)' }}>
                  {t('econometricDesc')}
                </p>
              </div>
            </div>
            <span className="ai-badge">{t('confidenceBadge', { r2: proj.rSquared })}</span>
          </div>

          <div className="ai-grid">
            <div className="ai-item">
              <span className="ai-item-lbl">{t('nextMonthEstTariff')}</span>
              <span className="ai-item-val text-ai">{fCOP(proj.projectedPrice)}</span>
              <span className="ai-item-sub">{t('bandLabel')}: ± {fCOP(proj.confidenceMargin)}</span>
            </div>

            <div className="ai-item">
              <span className="ai-item-lbl">{t('trendAndCagr')}</span>
              <span className="ai-item-val">
                <span className={proj.trendColor} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>
                  {proj.trendIcon.includes('up') ? (
                    <TrendingUp size={16} aria-hidden="true" />
                  ) : proj.trendIcon.includes('down') ? (
                    <TrendingDown size={16} aria-hidden="true" />
                  ) : (
                    <Minus size={16} aria-hidden="true" />
                  )}
                  {proj.trend}
                </span>
              </span>
              <span className="ai-item-sub">
                CAGR: {proj.cagrPct > 0 ? '+' : ''}{proj.cagrPct}% {lang === 'en' ? 'yr' : 'anual'}
              </span>
            </div>

            <div className="ai-item">
              <span className="ai-item-lbl">{t('sixMonthForecast')}</span>
              <span className="ai-item-val text-strong">{fCOP(proj.projectedPrice6m)}</span>
              <span className="ai-item-sub">{t('midTermHorizon')}</span>
            </div>

            <div className="ai-item">
              <span className="ai-item-lbl">{t('estNextMonthSavings')}</span>
              <span className="ai-item-val text-solar">{fCOP(proj.projectedMonthlySavings)}</span>
              <span className="ai-item-sub">{t('basedOnExpectedGen')}</span>
            </div>
          </div>

          <div className="eco-banner">
            <div className="eco-chips">
              <span className="eco-chip">
                <Sun size={14} className="text-warning" aria-hidden="true" />
                <span>{t('peakHistorical')} <strong>{proj.bestMonth}</strong></span>
              </span>
              <span className="eco-chip">
                <Leaf size={14} className="text-solar" aria-hidden="true" />
                <span>{t('avoidedCo2Label')} <strong>{proj.co2} kg</strong></span>
              </span>
              <span className="eco-chip">
                <Trees size={14} className="text-solar" aria-hidden="true" />
                <span>{t('equivTrees', { trees: proj.trees })}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem' }}>
          <div className="section-head" style={{ marginBottom: '1rem' }}>
            <div className="section-head-title">
              <div className="icon-tile ai" aria-hidden="true"><Sliders size={18} /></div>
              <div>
                <h3>{t('simTitle')}</h3>
                <p>{t('simDesc')}</p>
              </div>
            </div>
            <div className="assumption-chips">
              <span className="meta-chip">
                <TrendingDown size={12} aria-hidden="true" /> Deg: {fDec(sim.assumptions.degradation, 2)}%/{lang === 'en' ? 'yr' : 'año'}
              </span>
              <span className="meta-chip warning">
                <TrendingUp size={12} aria-hidden="true" /> Inf: {fDec(sim.assumptions.inflation, 1)}%/{lang === 'en' ? 'yr' : 'año'}
              </span>
              <span className="meta-chip accent">
                <Percent size={12} aria-hidden="true" /> WACC: {fDec(sim.assumptions.discountRate, 1)}%
              </span>
            </div>
          </div>

          <div className="sim-controls-panel">
            <div className="sim-control-item">
              <div className="sim-control-head">
                <label htmlFor="sim-slider-inflation">
                  <TrendingUp size={13} className="text-warning" aria-hidden="true" />
                  <span>{t('annualTariffInflation')}</span>
                </label>
                <strong className="text-warning">{fDec(simParams.inflation, 1)}%</strong>
              </div>
              <input
                type="range"
                id="sim-slider-inflation"
                min="0"
                max="15"
                step="0.5"
                value={simParams.inflation}
                onChange={(e) => updateSimParams({ inflation: parseFloat(e.target.value) })}
                className="sim-slider warning"
              />
            </div>

            <div className="sim-control-item">
              <div className="sim-control-head">
                <label htmlFor="sim-slider-degradation">
                  <Sun size={13} className="text-solar" aria-hidden="true" />
                  <span>{t('annualPanelDeg')}</span>
                </label>
                <strong className="text-solar">{fDec(simParams.degradation, 2)}%</strong>
              </div>
              <input
                type="range"
                id="sim-slider-degradation"
                min="0.1"
                max="1.5"
                step="0.05"
                value={simParams.degradation}
                onChange={(e) => updateSimParams({ degradation: parseFloat(e.target.value) })}
                className="sim-slider solar"
              />
            </div>

            <div className="sim-control-item">
              <div className="sim-control-head">
                <label htmlFor="sim-slider-wacc">
                  <Landmark size={13} className="text-accent" aria-hidden="true" />
                  <span>{t('discountRateWacc')}</span>
                </label>
                <strong className="text-accent">{fDec(simParams.discountRate, 1)}%</strong>
              </div>
              <input
                type="range"
                id="sim-slider-wacc"
                min="2"
                max="20"
                step="0.5"
                value={simParams.discountRate}
                onChange={(e) => updateSimParams({ discountRate: parseFloat(e.target.value) })}
                className="sim-slider accent"
              />
            </div>

            <div className="sim-control-reset">
              <button
                type="button"
                id="btn-reset-sim"
                className="btn btn-ghost btn-xs"
                onClick={resetSimParams}
              >
                <RotateCcw size={13} aria-hidden="true" />
                <span>{t('resetBase')}</span>
              </button>
            </div>
          </div>

          <div className="proj-summary">
            <div className="stat-tile">
              <span className="stat-tile-lbl">{t('grossSavings25y')}</span>
              <span className="stat-tile-val text-solar">{fCOP(sim.finalCum)}</span>
              <span className="stat-tile-sub">{t('cumulativeCashflow')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-lbl">{t('npvLabel')}</span>
              <span className="stat-tile-val text-solar">{totalInvestment > 0 ? fCOP(sim.npv) : '—'}</span>
              <span className="stat-tile-sub">{t('discountedAtWacc')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-lbl">{t('irrLabel')}</span>
              <span className="stat-tile-val text-accent">
                {sim.irr !== null && sim.irr !== undefined ? `${fDec(sim.irr, 1)}%` : '—'}
              </span>
              <span className="stat-tile-sub">{t('effectiveAnnualReturn')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-lbl">{t('breakevenYear')}</span>
              <span className="stat-tile-val text-warning">{sim.breakevenYear || '—'}</span>
              <span className="stat-tile-sub">
                {sim.breakevenYear ? t('inYearsFromStart', { n: sim.breakevenIdx + 1 }) : t('beyondHorizon')}
              </span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-lbl">{t('projected25yRoi')}</span>
              <span className="stat-tile-val text-solar">
                {totalInvestment > 0 ? `${sim.roi25 > 0 ? '+' : ''}${fDec(sim.roi25, 0)}%` : '—'}
              </span>
              <span className="stat-tile-sub">{t('returnOnCapex')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-lbl">{t('lcoeLabel')}</span>
              <span className="stat-tile-val text-strong">{sim.lcoe > 0 ? `${fCOP(sim.lcoe)}/kWh` : '—'}</span>
              <span className="stat-tile-sub">{t('solarCostPerKwh')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-lbl">{t('totalGen25y')}</span>
              <span className="stat-tile-val text-ai">{compact(sim.totalGen)} kWh</span>
              <span className="stat-tile-sub">{t('cleanEnergyLifetime')}</span>
            </div>
          </div>

          <div className="chart-container tall">
            <ChartCanvas
              id="chart-proyeccion"
              renderFn={() => renderProjectionChart(sim)}
              deps={[sim, theme, lang]}
            />
          </div>
        </div>

        <button
          id="projection-table-toggle"
          className="collapse-toggle"
          type="button"
          aria-expanded={showTable}
          onClick={() => setShowTable((v) => !v)}
        >
          <span className="row">
            <Table2 size={15} aria-hidden="true" />
            <span>{t('view25yBreakdown')}</span>
          </span>
          {showTable ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
        </button>

        {showTable && (
          <div id="projection-table-body">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t('yearCol')}</th>
                    <th className="text-right">{t('genKwhCol')}</th>
                    <th className="text-right">{t('annualSavingsCol')}</th>
                    <th className="text-right">{t('cumulatedSavingsCol')}</th>
                    <th className="text-right">{t('totalInvestment')}</th>
                    <th className="text-right">{t('netBalanceCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.tableRows.map((r, i) => (
                    <tr
                      key={r.year}
                      style={i === sim.breakevenIdx ? { background: 'var(--solar-subtle)' } : undefined}
                    >
                      <td className="cell-primary">
                        {r.year}
                        {i === sim.breakevenIdx && (
                          <span
                            className="badge-reset"
                            style={{
                              background: 'var(--solar-subtle)',
                              color: 'var(--solar)',
                              borderColor: 'var(--solar-glow)',
                              marginLeft: '.35rem',
                            }}
                          >
                            <Flag size={11} aria-hidden="true" /> ROI
                          </span>
                        )}
                      </td>
                      <td className="text-right" style={{ color: 'var(--ai)' }}>{fDec(r.gen, 0)} kWh</td>
                      <td className="text-right" style={{ color: 'var(--accent)' }}>{fCOP(r.savings)}</td>
                      <td className="text-right" style={{ color: 'var(--solar)', fontWeight: 700 }}>{fCOP(r.cumSavings)}</td>
                      <td className="text-right" style={{ color: 'var(--warning)' }}>{fCOP(r.investment)}</td>
                      <td
                        className="text-right"
                        style={{ color: r.netPosition >= 0 ? 'var(--solar)' : 'var(--text-secondary)', fontWeight: 600 }}
                      >
                        {r.netPosition >= 0 ? '+' : ''}{fCOP(r.netPosition)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
