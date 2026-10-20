/**
 * @module projectSettingsView
 * @description Modern enterprise project settings & investment phases view.
 * Adapts layout focus based on whether 'settings' or 'investments' was selected in the sidebar.
 */

import { state } from '../modules/state.js';
import { renderTimeline } from '../components/investmentTimeline.js';

/**
 * Render the project settings or investments page HTML.
 *
 * @param {'settings'|'investments'} [mode='settings']
 * @returns {string} Settings view HTML string
 */
export function render(mode = state.currentView || 'settings') {
  const project = state.activeProject || {};
  const isAdmin = state.activeProjectRole === 'admin' || state.isAdmin;
  const investments = state.investments || [];
  const isInvestmentsFocus = mode === 'investments';

  const settingsCardHTML = `
    <!-- ═══ SECTION: Project Details ═══ -->
    <div class="card section-card" id="section-project-settings">
      <div class="section-head">
        <div class="section-head-title">
          <div class="icon-tile accent"><i class="fa-solid fa-gear"></i></div>
          <div>
            <h2>
              <span class="lang-es">Configuración General del Proyecto</span>
              <span class="lang-en">General Project Settings</span>
            </h2>
            <p>
              <span class="lang-es">Especificaciones técnicas y parámetros operativos del sistema fotovoltaico</span>
              <span class="lang-en">Technical specifications and operating parameters of the PV plant</span>
            </p>
          </div>
        </div>
        <span class="meta-chip accent">
          <i class="fa-solid fa-circle-check"></i>
          <span class="lang-es">${isAdmin ? 'Modo Edición' : 'Modo Lectura'}</span>
          <span class="lang-en">${isAdmin ? 'Edit Mode' : 'Read Only'}</span>
        </span>
      </div>

      <form id="project-settings-form" class="form-stack">
        <!-- Name & Slug -->
        <div class="field-row">
          <div class="field">
            <label for="setting-name">
              <i class="fa-solid fa-signature text-accent"></i>
              <span class="lang-es">Nombre del Proyecto</span>
              <span class="lang-en">Project Name</span>
            </label>
            <input
              type="text"
              id="setting-name"
              value="${_escapeAttr(project.name || '')}"
              ${isAdmin ? '' : 'disabled'}
              required
            >
          </div>

          <div class="field">
            <label for="setting-slug">
              <i class="fa-solid fa-link text-muted"></i>
              <span>Slug Identificador (URL)</span>
            </label>
            <input
              type="text"
              id="setting-slug"
              value="${_escapeAttr(project.slug || '')}"
              disabled
            >
          </div>
        </div>

        <!-- Description -->
        <div class="field">
          <label for="setting-description">
            <i class="fa-solid fa-align-left text-muted"></i>
            <span class="lang-es">Descripción / Notas de la Instalación</span>
            <span class="lang-en">Description / Installation Notes</span>
          </label>
          <input
            type="text"
            id="setting-description"
            placeholder="Descripción breve de la instalación..."
            value="${_escapeAttr(project.description || '')}"
            ${isAdmin ? '' : 'disabled'}
          >
        </div>

        <!-- Location & Inverter -->
        <div class="field-row">
          <div class="field">
            <label for="setting-location">
              <i class="fa-solid fa-location-dot text-solar"></i>
              <span class="lang-es">Ubicación Geográfica</span>
              <span class="lang-en">Geographic Location</span>
            </label>
            <input
              type="text"
              id="setting-location"
              placeholder="Ciudad, País"
              value="${_escapeAttr(project.location || '')}"
              ${isAdmin ? '' : 'disabled'}
            >
          </div>

          <div class="field">
            <label for="setting-inverter">
              <i class="fa-solid fa-microchip text-warning"></i>
              <span class="lang-es">Modelo del Inversor</span>
              <span class="lang-en">Inverter Model</span>
            </label>
            <input
              type="text"
              id="setting-inverter"
              placeholder="Ej: DEYE SUN-5K-SG03LP1"
              value="${_escapeAttr(project.inverter_model || '')}"
              ${isAdmin ? '' : 'disabled'}
            >
          </div>
        </div>

        <!-- Capacity + Panels -->
        <div class="field-row">
          <div class="field">
            <label for="setting-capacity">
              <i class="fa-solid fa-bolt text-solar"></i>
              <span class="lang-es">Capacidad Nominal (kWp)</span>
              <span class="lang-en">Nominal Capacity (kWp)</span>
            </label>
            <input
              type="number"
              id="setting-capacity"
              value="${project.capacity_kw || ''}"
              step="0.1"
              min="0"
              placeholder="Ej: 3.5"
              ${isAdmin ? '' : 'disabled'}
            >
          </div>

          <div class="field">
            <label for="setting-panels">
              <i class="fa-solid fa-solar-panel text-accent"></i>
              <span class="lang-es">Cantidad de Paneles</span>
              <span class="lang-en">Panel Count</span>
            </label>
            <input
              type="number"
              id="setting-panels"
              value="${project.panel_count || ''}"
              min="0"
              placeholder="Ej: 6"
              ${isAdmin ? '' : 'disabled'}
            >
          </div>
        </div>

        <!-- Monitoring URL -->
        <div class="field">
          <label for="setting-monitoring-url">
            <i class="fa-solid fa-arrow-up-right-from-square text-accent"></i>
            <span class="lang-es">URL Portal de Monitoreo Remoto</span>
            <span class="lang-en">Remote Monitoring URL</span>
          </label>
          <input
            type="url"
            id="setting-monitoring-url"
            value="${_escapeAttr(project.monitoring_url || '')}"
            placeholder="https://www.dessmonitor.com/..."
            ${isAdmin ? '' : 'disabled'}
          >
        </div>

        ${isAdmin ? `
          <div class="form-actions">
            <button type="submit" class="btn btn-accent btn-lg">
              <i class="fa-solid fa-floppy-disk"></i>
              <span class="lang-es">Guardar Configuración</span>
              <span class="lang-en">Save Settings</span>
            </button>
          </div>
        ` : ''}
      </form>
    </div>
  `;

  const investmentsCardHTML = `
    <!-- ═══ SECTION: Investment Phases Timeline ═══ -->
    <div class="card section-card" id="section-project-investments">
      <div class="section-head">
        <div class="section-head-title">
          <div class="icon-tile solar"><i class="fa-solid fa-layer-group"></i></div>
          <div>
            <h2>
              <span class="lang-es">Fases de Inversión y Expansión (CAPEX)</span>
              <span class="lang-en">Investment & Expansion Phases (CAPEX)</span>
            </h2>
            <p>
              <span class="lang-es">Historial de capital desembolsado para el cálculo de amortización, VPN, TIR y retorno (ROI)</span>
              <span class="lang-en">Capital outlays for dynamic payback, NPV, IRR, and ROI tracking</span>
            </p>
          </div>
        </div>

        ${isAdmin ? `
          <button id="btn-new-phase" class="btn btn-solar">
            <i class="fa-solid fa-plus"></i>
            <span class="lang-es">Nueva Fase</span>
            <span class="lang-en">New Phase</span>
          </button>
        ` : ''}
      </div>

      ${renderTimeline(investments, isAdmin)}
    </div>
  `;

  return `
    <div id="project-settings-view" class="stack">
      ${isInvestmentsFocus ? investmentsCardHTML + settingsCardHTML : settingsCardHTML + investmentsCardHTML}

      <!-- ═══ Add/Edit Phase Modal ═══ -->
      <div id="phase-modal" class="modal-overlay hidden">
        <div class="modal-box" style="max-width:28rem;">
          <div class="modal-header">
            <h2 class="modal-title">
              <div class="icon-tile sm solar"><i class="fa-solid fa-layer-group"></i></div>
              <span class="lang-es" id="phase-modal-title-es">Nueva Fase de Inversión</span>
              <span class="lang-en" id="phase-modal-title-en">New Investment Phase</span>
            </h2>
            <button id="close-phase-modal" class="modal-close-btn" type="button" aria-label="Close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form id="phase-form" class="form-stack">
            <input type="hidden" id="phase-id" value="">

            <div class="field">
              <label for="phase-name">
                <span class="lang-es">Nombre de la Fase</span>
                <span class="lang-en">Phase Name</span>
              </label>
              <input type="text" id="phase-name" required placeholder="Ej: Fase 1 — Instalación Inicial">
            </div>

            <div class="field">
              <label for="phase-description">
                <span class="lang-es">Descripción</span>
                <span class="lang-en">Description</span>
              </label>
              <input type="text" id="phase-description" placeholder="Ej: 6 paneles 550W + inversor Deye">
            </div>

            <div class="field-row">
              <div class="field">
                <label for="phase-investment">
                  <span class="lang-es">Inversión (COP)</span>
                  <span class="lang-en">Investment (COP)</span>
                </label>
                <input type="number" id="phase-investment" min="0" step="1000" placeholder="15000000" required>
              </div>
              <div class="field">
                <label for="phase-start-date">
                  <span class="lang-es">Fecha de Inicio</span>
                  <span class="lang-en">Start Date</span>
                </label>
                <input type="date" id="phase-start-date" required>
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label for="phase-capacity">
                  <span class="lang-es">Capacidad Agregada (kWp)</span>
                  <span class="lang-en">Added Capacity (kWp)</span>
                </label>
                <input type="number" id="phase-capacity" min="0" step="0.1" placeholder="3.3" required>
              </div>
              <div class="field">
                <label for="phase-panels">
                  <span class="lang-es">Paneles Agregados</span>
                  <span class="lang-en">Added Panels</span>
                </label>
                <input type="number" id="phase-panels" min="0" placeholder="6" required>
              </div>
            </div>

            <button type="submit" id="btn-save-phase" class="btn btn-solar btn-lg btn-block" style="margin-top:.25rem;">
              <i class="fa-solid fa-floppy-disk"></i>
              <span class="lang-es">Guardar Fase</span>
              <span class="lang-en">Save Phase</span>
            </button>
          </form>
        </div>
      </div>

    </div>
  `;
}

/**
 * Initialise project settings event listeners.
 *
 * @param {Object} callbacks
 */
export function init(callbacks) {
  const { onSaveSettings, onCreatePhase, onEditPhase, onDeletePhase } = callbacks || {};

  const settingsForm = document.getElementById('project-settings-form');
  if (settingsForm && onSaveSettings) {
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        name: document.getElementById('setting-name')?.value?.trim() || '',
        description: document.getElementById('setting-description')?.value?.trim() || '',
        location: document.getElementById('setting-location')?.value?.trim() || '',
        capacity_kw: parseFloat(document.getElementById('setting-capacity')?.value) || 0,
        panel_count: parseInt(document.getElementById('setting-panels')?.value, 10) || 0,
        inverter_model: document.getElementById('setting-inverter')?.value?.trim() || '',
        monitoring_url: document.getElementById('setting-monitoring-url')?.value?.trim() || '',
      };
      onSaveSettings(data);
    });
  }

  const newPhaseBtn = document.getElementById('btn-new-phase');
  if (newPhaseBtn) {
    newPhaseBtn.addEventListener('click', () => {
      _openPhaseModal();
    });
  }

  const phaseForm = document.getElementById('phase-form');
  if (phaseForm) {
    phaseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const phaseId = document.getElementById('phase-id')?.value;
      const data = {
        id: phaseId || undefined,
        phase_name: document.getElementById('phase-name')?.value?.trim() || '',
        description: document.getElementById('phase-description')?.value?.trim() || '',
        investment_cop: parseInt(document.getElementById('phase-investment')?.value, 10) || 0,
        capacity_added_kw: parseFloat(document.getElementById('phase-capacity')?.value) || 0,
        panels_added: parseInt(document.getElementById('phase-panels')?.value, 10) || 0,
        start_date: document.getElementById('phase-start-date')?.value || '',
      };

      if (phaseId && typeof onEditPhase === 'function') {
        onEditPhase(data);
      } else if (typeof onCreatePhase === 'function') {
        onCreatePhase(data);
      }
      _closePhaseModal();
    });
  }

  const closePhaseBtn = document.getElementById('close-phase-modal');
  if (closePhaseBtn) {
    closePhaseBtn.addEventListener('click', _closePhaseModal);
  }
  const phaseModal = document.getElementById('phase-modal');
  if (phaseModal) {
    phaseModal.addEventListener('click', (e) => {
      if (e.target.id === 'phase-modal') _closePhaseModal();
    });
  }

  document.querySelectorAll('.timeline-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const phaseId = btn.dataset.phaseId;
      const phase = (state.investments || []).find(p => p.id === phaseId);
      if (phase) _openPhaseModal(phase);
    });
  });

  document.querySelectorAll('.timeline-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const phaseId = btn.dataset.phaseId;
      if (typeof onDeletePhase === 'function') onDeletePhase(phaseId);
    });
  });
}

function _openPhaseModal(phase) {
  const modal = document.getElementById('phase-modal');
  if (!modal) return;

  const form = document.getElementById('phase-form');
  if (form) form.reset();

  const titleEs = document.getElementById('phase-modal-title-es');
  const titleEn = document.getElementById('phase-modal-title-en');

  if (phase) {
    if (titleEs) titleEs.textContent = 'Editar Fase de Inversión';
    if (titleEn) titleEn.textContent = 'Edit Investment Phase';

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val ?? '';
    };
    setVal('phase-id', phase.id);
    setVal('phase-name', phase.phase_name);
    setVal('phase-description', phase.description);
    setVal('phase-investment', phase.investment_cop);
    setVal('phase-capacity', phase.capacity_added_kw);
    setVal('phase-panels', phase.panels_added);
    setVal('phase-start-date', phase.start_date);
  } else {
    if (titleEs) titleEs.textContent = 'Nueva Fase de Inversión';
    if (titleEn) titleEn.textContent = 'New Investment Phase';
    const idEl = document.getElementById('phase-id');
    if (idEl) idEl.value = '';
  }

  modal.classList.remove('hidden');
}

function _closePhaseModal() {
  document.getElementById('phase-modal')?.classList.add('hidden');
}

function _escapeAttr(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
