import React from 'react';
import { Calculator, Calendar, Layers, Pencil, Trash2 } from 'lucide-react';
import { fCOP, fDec } from '../modules/formatters.js';
import { useApp } from '../context/AppContext.jsx';

export default function InvestmentTimeline({ investments = [], isAdmin = false, onEdit, onDelete }) {
  const { lang, t } = useApp();

  if (!investments || investments.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon text-solar"><Layers size={32} aria-hidden="true" /></div>
        <h3>{t('noPhasesTitle')}</h3>
        <p>{t('noPhasesDesc')}</p>
      </div>
    );
  }

  const totals = investments.reduce((acc, inv) => {
    acc.investment += parseFloat(inv.investment_cop) || 0;
    acc.capacity += parseFloat(inv.capacity_added_kw) || 0;
    acc.panels += parseInt(inv.panels_added, 10) || 0;
    return acc;
  }, { investment: 0, capacity: 0, panels: 0 });

  return (
    <div className="investment-timeline">
      {investments.map((inv, index) => {
        const date = inv.start_date
          ? new Date(`${inv.start_date}T00:00:00`).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : '—';

        return (
          <div className="timeline-item" key={inv.id || index}>
            <div className="timeline-rail">
              <div className="timeline-dot" />
              {index < investments.length - 1 && <div className="timeline-line" />}
            </div>

            <div className="card timeline-card">
              <div className="timeline-card-head">
                <div>
                  <span className="timeline-phase-tag">
                    {t('phaseTag', { index: index + 1 })}
                  </span>
                  <h4>{inv.phase_name}</h4>
                </div>
                <span className="meta-chip">
                  <Calendar size={12} className="text-accent" aria-hidden="true" /> {date}
                </span>
              </div>

              {inv.description && <p className="timeline-desc">{inv.description}</p>}

              <div className="timeline-stats">
                <div className="inset" style={{ padding: '.65rem .8rem' }}>
                  <span className="stat-tile-lbl">{t('investment')}</span>
                  <span className="stat-tile-val text-accent">{fCOP(inv.investment_cop)}</span>
                </div>
                <div className="inset" style={{ padding: '.65rem .8rem' }}>
                  <span className="stat-tile-lbl">{t('capacity')}</span>
                  <span className="stat-tile-val text-solar">+{fDec(inv.capacity_added_kw, 1)} kWp</span>
                </div>
                <div className="inset" style={{ padding: '.65rem .8rem' }}>
                  <span className="stat-tile-lbl">{t('panels')}</span>
                  <span className="stat-tile-val text-strong">+{fDec(inv.panels_added, 0)} u</span>
                </div>
              </div>

              {isAdmin && (
                <div className="timeline-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onEdit?.(inv)}
                  >
                    <Pencil size={13} aria-hidden="true" />
                    <span>{t('edit')}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-xs"
                    onClick={() => onDelete?.(inv.id)}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    <span>{t('delete')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="timeline-totals">
        <h4>
          <Calculator size={15} className="text-solar" aria-hidden="true" />
          <span>{t('totalInvestedSummary')}</span>
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.85rem' }}>
          <div>
            <span className="stat-tile-lbl">{t('accumulatedInvestment')}</span>
            <span className="stat-tile-val text-accent" style={{ fontSize: '1.25rem' }}>{fCOP(totals.investment)}</span>
          </div>
          <div>
            <span className="stat-tile-lbl">{t('totalCapacityAdded')}</span>
            <span className="stat-tile-val text-solar" style={{ fontSize: '1.25rem' }}>{fDec(totals.capacity, 1)} kWp</span>
          </div>
          <div>
            <span className="stat-tile-lbl">{t('totalPanelsPhases')}</span>
            <span className="stat-tile-val text-strong" style={{ fontSize: '1.25rem' }}>{fDec(totals.panels, 0)} u</span>
          </div>
        </div>
      </div>
    </div>
  );
}
