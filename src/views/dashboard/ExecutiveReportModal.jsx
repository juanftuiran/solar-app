import React, { useMemo } from 'react';
import { Cpu, FileText, MapPin, Printer, Zap } from 'lucide-react';
import { fCOP, fDec, fHsp, fKwh, fPct, fYield } from '../../modules/formatters.js';
import { calcFinancialSimulation, calcKPIs, calcProjections } from '../../modules/analytics.js';
import { useApp } from '../../context/AppContext.jsx';
import { useProject } from '../../context/ProjectContext.jsx';
import { Modal } from '../../components/Modal.jsx';

export default function ExecutiveReportModal({ open, viewData, onClose }) {
  const { lang, simParams, t } = useApp();
  const { activeState, processedData } = useProject();

  const project = activeState.project || {};
  const capacity = parseFloat(project.capacity_kw) || 0;

  const reportData = useMemo(() => {
    if (!open) return null;
    const kpis = calcKPIs(viewData, processedData, activeState.investments, capacity);
    const proj = calcProjections(viewData);
    const sim = calcFinancialSimulation(processedData, activeState.investments, simParams);
    const totalInv = sim.totalInvestment;
    const totalSavedAll = processedData.reduce((s, d) => s + (d.ahorroReal || 0), 0);
    const progressPct = totalInv > 0 ? Math.min(100, (totalSavedAll / totalInv) * 100) : 0;
    const nowStr = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const recentRows = [...viewData].slice(-12).reverse();
    return { kpis, proj, sim, totalInv, totalSavedAll, progressPct, nowStr, recentRows };
  }, [open, viewData, processedData, activeState.investments, capacity, simParams, lang]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      dialogId="exec-report-modal"
      titleId="exec-report-modal-title"
      title={t('execReportTitle')}
      maxWidth="62rem"
      boxClassName="exec-report-modal-box"
      icon={<div className="icon-tile sm solar" aria-hidden="true"><FileText size={16} /></div>}
      headerActions={
        <button
          id="btn-print-exec-report"
          type="button"
          className="btn btn-solar btn-sm"
          onClick={() => window.print()}
        >
          <Printer size={14} aria-hidden="true" />
          <span>{t('printSavePdf')}</span>
        </button>
      }
    >
      {reportData && (
        <div className="exec-report-sheet" id="printable-executive-sheet">
          <div className="exec-sheet-header">
            <div>
              <div className="exec-sheet-brand">JF Solar Cloud / Telemetría y Valoración Fotovoltaica</div>
              <h2 className="exec-sheet-title">{project.name || 'Planta Solar Fotovoltaica'}</h2>
              <div className="exec-sheet-meta">
                <span>
                  <MapPin size={12} aria-hidden="true" /> {project.location || 'Colombia'}
                </span>
                <span>/</span>
                <span>
                  <Zap size={12} aria-hidden="true" /> {fDec(capacity, 1)} kWp ({project.panel_count || 0} {t('panels').toLowerCase()})
                </span>
                {project.inverter_model && (
                  <>
                    <span>/</span>
                    <span>
                      <Cpu size={12} aria-hidden="true" /> {project.inverter_model}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="exec-sheet-stamp">
              <div className="exec-stamp-label">{lang === 'en' ? 'Issued Date' : 'Fecha de emisión'}</div>
              <div className="exec-stamp-val">{reportData.nowStr}</div>
              <div className="exec-stamp-sub">IEC 61724 Compliant</div>
            </div>
          </div>

          <div className="exec-section-title">
            1. {lang === 'en' ? 'Operational Telemetry & Engineering (IEC 61724)' : 'Telemetría Operativa e Ingeniería Solar (IEC 61724)'}
          </div>
          <div className="exec-kpi-strip">
            <div className="exec-kpi-box">
              <span className="lbl">{t('periodSavings')}</span>
              <strong className="val text-solar">{fCOP(reportData.kpis.savings)}</strong>
            </div>
            <div className="exec-kpi-box">
              <span className="lbl">{t('solarProduction')}</span>
              <strong className="val text-accent">{fKwh(reportData.kpis.gen)}</strong>
            </div>
            <div className="exec-kpi-box">
              <span className="lbl">{t('solarAutonomy')}</span>
              <strong className="val">{fPct(reportData.kpis.autonomy)}</strong>
            </div>
            <div className="exec-kpi-box">
              <span className="lbl">{t('specificYieldShort')}</span>
              <strong className="val">{fYield(reportData.kpis.specificYield)}</strong>
            </div>
            <div className="exec-kpi-box">
              <span className="lbl">{t('peakSunHours')}</span>
              <strong className="val">{fHsp(reportData.kpis.lastHsp)} ({fDec(reportData.kpis.pr, 0)}% PR)</strong>
            </div>
          </div>

          <div className="exec-section-title">
            2. {lang === 'en' ? 'Capital Amortization & 25-Year Valuation' : 'Amortización de Capital y Valoración Financiera (25 Años)'}
          </div>
          <div className="exec-kpi-strip">
            <div className="exec-kpi-box">
              <span className="lbl">{t('totalInvestment')}</span>
              <strong className="val">{fCOP(reportData.totalInv)}</strong>
            </div>
            <div className="exec-kpi-box">
              <span className="lbl">{t('totalSaved')}</span>
              <strong className="val text-solar">
                {fCOP(reportData.totalSavedAll)} ({fDec(reportData.progressPct, 1)}%)
              </strong>
            </div>
            <div className="exec-kpi-box">
              <span className="lbl">{t('npvLabel')}</span>
              <strong className="val text-solar">{reportData.totalInv > 0 ? fCOP(reportData.sim.npv) : '—'}</strong>
            </div>
            <div className="exec-kpi-box">
              <span className="lbl">{t('irrLabel')}</span>
              <strong className="val text-accent">
                {reportData.sim.irr !== null ? `${fDec(reportData.sim.irr, 1)}%` : '—'}
              </strong>
            </div>
            <div className="exec-kpi-box">
              <span className="lbl">{t('lcoeLabel')}</span>
              <strong className="val">{reportData.sim.lcoe > 0 ? `${fCOP(reportData.sim.lcoe)}/kWh` : '—'}</strong>
            </div>
          </div>

          <div className="exec-section-title">
            3. {lang === 'en' ? 'Environmental Impact & Tariff Forecast (WLS)' : 'Mitigación Ambiental y Pronóstico Tarifario (WLS)'}
          </div>
          <div className="exec-kpi-strip">
            <div className="exec-kpi-box">
              <span className="lbl">{t('avoidedCo2Label')}</span>
              <strong className="val text-solar">{reportData.proj.co2} kg CO₂</strong>
            </div>
            <div className="exec-kpi-box">
              <span className="lbl">{lang === 'en' ? 'Equivalent Trees' : 'Árboles Equivalentes'}</span>
              <strong className="val text-solar">{reportData.proj.trees}</strong>
            </div>
            <div className="exec-kpi-box">
              <span className="lbl">{t('nextMonthEstTariff')}</span>
              <strong className="val">
                {fCOP(reportData.proj.projectedPrice)}/kWh (±{fCOP(reportData.proj.confidenceMargin)})
              </strong>
            </div>
            <div className="exec-kpi-box">
              <span className="lbl">{t('grossSavings25y')}</span>
              <strong className="val text-solar">{fCOP(reportData.sim.finalCum)}</strong>
            </div>
          </div>

          <div className="exec-section-title">
            4. {lang === 'en' ? 'Recent Cloud Billing Cycles (Last 12 Records)' : 'Desglose de Ciclos Recientes (Últimos 12 Registros)'}
          </div>
          <table className="exec-table">
            <thead>
              <tr>
                <th>{t('periodDateCol')}</th>
                <th className="text-right">{t('gridUsageCol')}</th>
                <th className="text-right">{t('solarGenCol')}</th>
                <th className="text-right">{t('solarAutonomy')}</th>
                <th className="text-right">HSP</th>
                <th className="text-right">{t('kwTariffCol')}</th>
                <th className="text-right">{t('savingsCol')}</th>
              </tr>
            </thead>
            <tbody>
              {reportData.recentRows.map((r) => (
                <tr key={r.id || r.fecha}>
                  <td>
                    <strong>{r.label}</strong>{' '}
                    <span style={{ opacity: 0.7, fontSize: '.75rem' }}>({r.fecha})</span>
                  </td>
                  <td className="text-right">{fDec(r.consumoRed, 1)} kWh</td>
                  <td className="text-right">{fDec(r.prodBruta, 1)} kWh</td>
                  <td className="text-right">{fDec(r.autonomia, 1)}%</td>
                  <td className="text-right">{fDec(r.hsp, 2)}</td>
                  <td className="text-right">{fCOP(r.precioKw)}</td>
                  <td className="text-right"><strong>{fCOP(r.ahorroReal)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
