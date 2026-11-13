/**
 * @module solarman/stationPicker
 * @description Multi-plant selector & project-to-station binding UI.
 */

import { fDec } from "../../modules/formatters.js";
import {
  solarmanRuntime,
  getProjectStationBinding,
  findSuggestedStationForProject,
} from "../../modules/solarman.js";
import { escapeHTML } from "../../modules/utils.js";

export function renderStationPicker(project, session) {
  return _renderStationPicker(project, session);
}

function _renderStationPicker(project, session) {
  const stations = solarmanRuntime.stations || [];
  const currentBinding = getProjectStationBinding(project.id);
  const { suggested } = findSuggestedStationForProject(project, stations);

  return `
    <div id="solarman-view" class="stack">
      <div class="card section-card">
        <div class="section-head">
          <div class="section-head-title">
            <div class="icon-tile accent"><i class="fa-solid fa-solar-panel"></i></div>
            <div>
              <h2>
                <span class="lang-es">Seleccionar Planta Solarman para: ${escapeHTML(project.name || 'Proyecto Activo')}</span>
                <span class="lang-en">Select Solarman Plant for: ${escapeHTML(project.name || 'Active Project')}</span>
              </h2>
              <p>
                <span class="lang-es">Tu cuenta de Solarman (${escapeHTML(session.email)}) tiene <strong>${stations.length}</strong> ${stations.length === 1 ? 'planta registrada' : 'plantas registradas'}. Elige cuál vincular a este proyecto para que siempre muestre los datos correctos.</span>
                <span class="lang-en">Your Solarman account (${escapeHTML(session.email)}) has <strong>${stations.length}</strong> ${stations.length === 1 ? 'station' : 'stations'}. Select which one belongs to this project.</span>
              </p>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
            ${solarmanRuntime.activeStation ? `
              <button type="button" id="btn-cancel-station-picker" class="btn btn-ghost btn-sm">
                <i class="fa-solid fa-arrow-left"></i>
                <span class="lang-es">Volver al Monitor</span>
                <span class="lang-en">Back to Monitor</span>
              </button>
            ` : ''}
            <button type="button" id="btn-solarman-disconnect" class="btn btn-danger-outline btn-sm">
              <i class="fa-solid fa-power-off"></i>
              <span class="lang-es">Cambiar Cuenta</span>
              <span class="lang-en">Switch Account</span>
            </button>
          </div>
        </div>

        ${stations.length === 0 ? `
          <div class="empty-state" style="padding:2.5rem 1rem;">
            <i class="fa-solid fa-satellite-dish"></i>
            <h3><span class="lang-es">No se encontraron plantas en esta cuenta</span><span class="lang-en">No stations found in this account</span></h3>
            <p><span class="lang-es">Verifica que tu usuario tenga plantas asignadas en Solarman o cambia la región del servidor.</span><span class="lang-en">Check that your user has assigned stations in Solarman or switch server region.</span></p>
          </div>
        ` : `
          <div class="solarman-stations-grid">
            ${stations.map(st => {
              const isCurrentBound = currentBinding && String(currentBinding.stationId) === String(st.id);
              const isSuggested = suggested && String(suggested.id) === String(st.id);
              const isOnline = !/OFFLINE|FAULT/i.test(String(st.networkStatus || 'NORMAL'));

              return `
                <div class="solarman-station-card ${isCurrentBound ? 'bound' : isSuggested ? 'suggested' : ''}">
                  <div class="solarman-station-card-top">
                    <div>
                      <div class="solarman-station-id">ID #${escapeHTML(String(st.id))}</div>
                      <h3 class="solarman-station-title">${escapeHTML(st.name)}</h3>
                      <div class="solarman-station-loc">
                        <i class="fa-solid fa-location-dot text-solar"></i>
                        <span>${escapeHTML(st.locationAddress || 'Ubicación no especificada')}</span>
                      </div>
                    </div>
                    <span class="health-pill ${isOnline ? 'optimo' : 'revisar'}">
                      <span class="health-pulse-dot"></span>
                      <span>${isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                    </span>
                  </div>

                  <div class="solarman-station-metrics">
                    <div>
                      <span class="lbl"><span class="lang-es">Capacidad Instalada</span><span class="lang-en">Installed Capacity</span></span>
                      <strong class="val text-accent">${fDec(st.installedCapacity || 0, 2)} kWp</strong>
                    </div>
                    <div>
                      <span class="lbl"><span class="lang-es">Potencia Actual</span><span class="lang-en">Current Power</span></span>
                      <strong class="val text-solar">${fDec((st.generationPower || 0) / 1000, 2)} kW (${Math.round(st.generationPower || 0)} W)</strong>
                    </div>
                  </div>

                  <div class="solarman-station-badges">
                    ${isCurrentBound ? `
                      <span class="meta-chip solar">
                        <i class="fa-solid fa-link"></i>
                        <span class="lang-es">Vinculada actualmente a este proyecto</span>
                        <span class="lang-en">Currently bound to this project</span>
                      </span>
                    ` : isSuggested ? `
                      <span class="meta-chip accent">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                        <span class="lang-es">Coincidencia sugerida para ${escapeHTML(project.name)}</span>
                        <span class="lang-en">Suggested match for ${escapeHTML(project.name)}</span>
                      </span>
                    ` : ''}
                  </div>

                  <button
                    type="button"
                    class="btn ${isCurrentBound || isSuggested ? 'btn-solar' : 'btn-accent'} btn-select-solarman-station"
                    data-station-id="${escapeHTML(String(st.id))}"
                    style="width:100%;margin-top:.75rem;justify-content:center;"
                  >
                    <i class="fa-solid fa-check-circle"></i>
                    <span class="lang-es">${isCurrentBound ? 'Continuar con esta Planta' : `Vincular a "${escapeHTML(project.name)}"`}</span>
                    <span class="lang-en">${isCurrentBound ? 'Continue with this Plant' : `Bind to "${escapeHTML(project.name)}"`}</span>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}
