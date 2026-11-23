import React from 'react';
import { ArrowRight, CalendarCheck, Clock, Coins, Cpu, MapPin, Sun } from 'lucide-react';
import { fCOP } from '../modules/formatters.js';
import { useApp } from '../context/AppContext.jsx';

export default function ProjectCard({ project, role, investmentCount, onSelect }) {
  const { t } = useApp();
  const isAdmin = role === 'admin';
  const roleLabel = isAdmin ? t('administrator') : t('observer');

  const capacityVal = project.capacity_kw ? parseFloat(project.capacity_kw) : 0;
  const capacityStr = capacityVal > 0 ? `${capacityVal.toFixed(1)} kWp` : '—';
  const panelsStr = project.panel_count ? `${project.panel_count} u` : '—';
  const readingCount = project._readingCount || 0;
  const lastDate = project._lastReadingDate || null;
  const totalInvested = project._totalInvested || 0;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(project.id);
    }
  };

  return (
    <div
      className={`card card-interactive project-card role-${role}`}
      data-project-id={project.id}
      tabIndex={0}
      role="button"
      aria-label={project.name}
      onClick={() => onSelect(project.id)}
      onKeyDown={handleKeyDown}
    >
      <div>
        <div className="project-card-header">
          <div className="project-card-id">
            <div
              className={`icon-tile ${isAdmin ? 'accent' : 'solar'}`}
              style={{ width: '2.25rem', height: '2.25rem', borderRadius: '.6rem' }}
              aria-hidden="true"
            >
              <Sun size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <span className="online-dot" style={{ width: '6px', height: '6px' }} aria-hidden="true" />
                <h3 className="project-card-name" title={project.name}>
                  {project.name}
                </h3>
              </div>
              <div className="project-card-location">
                <MapPin size={12} aria-hidden="true" />
                <span>{project.location ? project.location : <em>{t('noLocation')}</em>}</span>
              </div>
            </div>
          </div>

          <span className={`role-badge ${role}`}>{roleLabel}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.75rem' }}>
          {project.inverter_model && (
            <span className="meta-chip warning" title={t('inverter')}>
              <Cpu size={12} aria-hidden="true" /> {project.inverter_model}
            </span>
          )}
          {totalInvested > 0 && (
            <span className="meta-chip accent" title={t('portfolioCapital')}>
              <Coins size={12} aria-hidden="true" /> {fCOP(totalInvested)}
            </span>
          )}
          {lastDate ? (
            <span
              className="meta-chip"
              style={{
                color: 'var(--solar)',
                borderColor: 'var(--solar-glow)',
                background: 'var(--solar-subtle)',
              }}
            >
              <CalendarCheck size={12} aria-hidden="true" /> {lastDate} ({readingCount})
            </span>
          ) : (
            <span className="meta-chip">
              <Clock size={12} aria-hidden="true" /> {t('noReadingsChip')}
            </span>
          )}
        </div>

        <div className="project-card-stats" style={{ marginTop: '.85rem' }}>
          <div>
            <span className="project-card-stat-lbl">{t('peakPower')}</span>
            <span className="project-card-stat-val text-solar">{capacityStr}</span>
          </div>
          <div>
            <span className="project-card-stat-lbl">{t('panels')}</span>
            <span className="project-card-stat-val text-accent">{panelsStr}</span>
          </div>
          <div>
            <span className="project-card-stat-lbl">{t('phases')}</span>
            <span className="project-card-stat-val text-strong">{investmentCount || 0}</span>
          </div>
        </div>
      </div>

      <div className="project-card-footer">
        <span>{t('cloudReadingsCount', { count: readingCount })}</span>
        <span className="project-card-enter">
          <span>{t('openPlant')}</span>
          <ArrowRight size={14} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
