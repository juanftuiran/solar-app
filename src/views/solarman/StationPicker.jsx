import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Link2,
  MapPin,
  Power,
  Radio,
  Sparkles,
  Sun,
} from 'lucide-react';
import { fDec } from '../../modules/formatters.js';
import { findSuggestedStationForProject, getProjectStationBinding } from '../../modules/solarman.js';
import { useApp } from '../../context/AppContext.jsx';

export default function StationPicker({
  project,
  session,
  stations = [],
  activeStation,
  onSelectStation,
  onCancelPicker,
  onDisconnect,
}) {
  const { lang, t } = useApp();
  const currentBinding = project?.id ? getProjectStationBinding(project.id) : null;
  const { suggested } = findSuggestedStationForProject(project, stations);

  return (
    <div id="solarman-view" className="stack">
      <div className="card section-card">
        <div className="section-head">
          <div className="section-head-title">
            <div className="icon-tile accent" aria-hidden="true"><Sun size={18} /></div>
            <div>
              <h2>{t('solarmanSelectPlantFor', { project: project?.name || 'Proyecto' })}</h2>
              <p>
                {lang === 'en'
                  ? `Your Solarman account (${session?.email || ''}) has ${stations.length} ${stations.length === 1 ? 'station' : 'stations'}. Select which one belongs to this project.`
                  : `Tu cuenta de Solarman (${session?.email || ''}) tiene ${stations.length} ${stations.length === 1 ? 'planta registrada' : 'plantas registradas'}. Elige cuál vincular a este proyecto.`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
            {activeStation && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onCancelPicker}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>{t('solarmanBackToMonitor')}</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-danger-outline btn-sm"
              onClick={onDisconnect}
            >
              <Power size={14} aria-hidden="true" />
              <span>{t('solarmanSwitchAccount')}</span>
            </button>
          </div>
        </div>

        {stations.length === 0 ? (
          <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
            <div className="empty-icon text-solar"><Radio size={32} aria-hidden="true" /></div>
            <h3>{t('solarmanNoStations')}</h3>
            <p>{t('solarmanNoStationsDesc')}</p>
          </div>
        ) : (
          <div className="solarman-stations-grid">
            {stations.map((st) => {
              const isCurrentBound = currentBinding && String(currentBinding.stationId) === String(st.id);
              const isSuggested = suggested && String(suggested.id) === String(st.id);
              const isOnline = !/OFFLINE|FAULT/i.test(String(st.networkStatus || 'NORMAL'));

              return (
                <div
                  key={st.id}
                  className={`solarman-station-card ${isCurrentBound ? 'bound' : isSuggested ? 'suggested' : ''}`}
                >
                  <div className="solarman-station-card-top">
                    <div>
                      <div className="solarman-station-id">ID #{String(st.id)}</div>
                      <h3 className="solarman-station-title">{st.name}</h3>
                      <div className="solarman-station-loc">
                        <MapPin size={12} className="text-solar" aria-hidden="true" />
                        <span>{st.locationAddress || t('noLocation')}</span>
                      </div>
                    </div>

                    <span className={`health-pill ${isOnline ? 'optimo' : 'revisar'}`}>
                      <span className="health-pulse-dot" aria-hidden="true" />
                      <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                    </span>
                  </div>

                  <div className="solarman-station-metrics">
                    <div>
                      <span className="lbl">{t('installedCapacity')}</span>
                      <strong className="val text-accent">{fDec(st.installedCapacity || 0, 2)} kWp</strong>
                    </div>
                    <div>
                      <span className="lbl">{lang === 'en' ? 'Current Power' : 'Potencia Actual'}</span>
                      <strong className="val text-solar">
                        {fDec((st.generationPower || 0) / 1000, 2)} kW ({Math.round(st.generationPower || 0)} W)
                      </strong>
                    </div>
                  </div>

                  <div className="solarman-station-badges">
                    {isCurrentBound ? (
                      <span className="meta-chip solar">
                        <Link2 size={12} aria-hidden="true" />
                        <span>{lang === 'en' ? 'Currently bound to this project' : 'Vinculada actualmente a este proyecto'}</span>
                      </span>
                    ) : isSuggested ? (
                      <span className="meta-chip accent">
                        <Sparkles size={12} aria-hidden="true" />
                        <span>{lang === 'en' ? `Suggested match for ${project?.name}` : `Coincidencia sugerida para ${project?.name}`}</span>
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className={`btn ${isCurrentBound || isSuggested ? 'btn-solar' : 'btn-accent'}`}
                    style={{ width: '100%', marginTop: '.75rem', justifyContent: 'center' }}
                    onClick={() => onSelectStation(st.id)}
                  >
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>
                      {isCurrentBound
                        ? (lang === 'en' ? 'Continue with this Plant' : 'Continuar con esta Planta')
                        : (lang === 'en' ? `Bind to "${project?.name}"` : `Vincular a "${project?.name}"`)}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
