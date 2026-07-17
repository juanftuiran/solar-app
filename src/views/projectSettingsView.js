/**
 * @module projectSettingsView
 * @description Project settings and investment phases management view.
 * Renders project detail form, investment timeline, and phase add/edit modal.
 * Displayed inside the dashboard layout's main-content area.
 */

import { state } from '../modules/state.js';
import { renderTimeline } from '../components/investmentTimeline.js';
import { fCOP } from '../modules/formatters.js';

/**
 * Render the project settings page HTML.
 *
 * @returns {string} Settings view HTML string
 */
export function render() {
  const project = state.activeProject || {};
  const isAdmin = state.activeProjectRole === 'admin';
  const investments = state.investments || [];

  return `
    <div id="project-settings-view" style="display:flex;flex-direction:column;gap:1.5rem;">

      <!-- ═══ SECTION 1: Project Details ═══ -->
      <div class="card" style="padding:1.5rem;">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1.25rem;">
          <i class="fa-solid fa-gear" style="color:#0ea5e9;"></i>
          <h2 style="font-size:1rem;font-weight:700;color:#e2e8f0;">
            <span class="lang-es">Detalles del Proyecto</span>
            <span class="lang-en">Project Details</span>
          </h2>
        </div>

        <form id="project-settings-form" style="display:flex;flex-direction:column;gap:1rem;">
          <!-- Name -->
          <div class="field">
            <label for="setting-name">
              <span class="lang-es">Nombre</span>
              <span class="lang-en">Name</span>
            </label>
            <input
              type="text"
              id="setting-name"
              value="${_escapeAttr(project.name || '')}"
              ${isAdmin ? '' : 'disabled'}
              required
            >
          </div>

          <!-- Slug (read-only) -->
          <div class="field">
            <label for="setting-slug">Slug</label>
            <input
              type="text"
              id="setting-slug"
              value="${_escapeAttr(project.slug || '')}"
              disabled
              style="opacity:.6;cursor:not-allowed;"
            >
          </div>

          <!-- Description -->
          <div class="field">
            <label for="setting-description">
              <span class="lang-es">Descripción</span>
              <span class="lang-en">Description</span>
            </label>
            <input
              type="text"
              id="setting-description"
              value="${_escapeAttr(project.description || '')}"
              ${isAdmin ? '' : 'disabled'}
            >
          </div>

          <!-- Location -->
          <div class="field">
            <label for="setting-location">
              <span class="lang-es">Ubicación</span>
              <span class="lang-en">Location</span>
            </label>
            <input
              type="text"
              id="setting-location"
              value="${_escapeAttr(project.location || '')}"
              ${isAdmin ? '' : 'disabled'}
            >
          </div>

          <!-- Capacity + Panels -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
            <div class="field">
              <label for="setting-capacity">
                <span class="lang-es">Capacidad (kW)</span>
                <span class="lang-en">Capacity (kW)</span>
              </label>
              <input
                type="number"
                id="setting-capacity"
                value="${project.capacity_kw || ''}"
                step="0.1"
                min="0"
                ${isAdmin ? '' : 'disabled'}
              >
            </div>
            <div class="field">
              <label for="setting-panels">
                <span class="lang-es">Paneles</span>
                <span class="lang-en">Panels</span>
              </label>
              <input
                type="number"
                id="setting-panels"
                value="${project.panel_count || ''}"
                min="0"
                ${isAdmin ? '' : 'disabled'}
              >
            </div>
          </div>

          <!-- Inverter model -->
          <div class="field">
            <label for="setting-inverter">
              <span class="lang-es">Modelo Inversor</span>
              <span class="lang-en">Inverter Model</span>
            </label>
            <input
              type="text"
              id="setting-inverter"
              value="${_escapeAttr(project.inverter_model || '')}"
              ${isAdmin ? '' : 'disabled'}
            >
          </div>

          <!-- Monitoring URL -->
          <div class="field">
            <label for="setting-monitoring-url">
              <span class="lang-es">URL de Monitoreo</span>
              <span class="lang-en">Monitoring URL</span>
            </label>
            <input
              type="url"
              id="setting-monitoring-url"
              value="${_escapeAttr(project.monitoring_url || '')}"
              placeholder="https://..."
              ${isAdmin ? '' : 'disabled'}
            >
          </div>

          ${isAdmin ? `
            <button type="submit" class="btn btn-accent" style="align-self:flex-start;margin-top:.5rem;">
              <i class="fa-solid fa-floppy-disk"></i>
              <span class="lang-es">Guardar Cambios</span>
              <span class="lang-en">Save Changes</span>
            </button>
          ` : ''}
        </form>
      </div>

      <!-- ═══ SECTION 2: Investment Phases Timeline ═══ -->
      <div class="card" style="padding:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:.75rem;">
          <div style="display:flex;align-items:center;gap:.5rem;">
            <i class="fa-solid fa-layer-group" style="color:#10b981;"></i>
            <h2 style="font-size:1rem;font-weight:700;color:#e2e8f0;">
              <span class="lang-es">Fases de Inversión</span>
              <span class="lang-en">Investment Phases</span>
            </h2>
            <span style="font-size:.7rem;color:#64748b;">(${investments.length})</span>
          </div>

          ${isAdmin ? `
            <button id="btn-new-phase" class="btn btn-solar" style="font-size:.8rem;padding:.4rem .75rem;">
              <i class="fa-solid fa-plus"></i>
              <span class="lang-es">Nueva Fase</span>
              <span class="lang-en">New Phase</span>
            </button>
          ` : ''}
        </div>

        ${renderTimeline(investments, isAdmin)}
      </div>

      <!-- ═══ SECTION 3: Add/Edit Phase Modal ═══ -->
      <div id="phase-modal" class="modal-overlay hidden">
        <div class="modal-box" style="max-width:28rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
            <h2 style="font-size:1rem;font-weight:700;color:#e2e8f0;">
              <i class="fa-solid fa-layer-group" style="color:#10b981;margin-right:.4rem;"></i>
              <span class="lang-es" id="phase-modal-title-es">Nueva Fase de Inversión</span>
              <span class="lang-en" id="phase-modal-title-en">New Investment Phase</span>
            </h2>
            <button id="close-phase-modal" type="button" style="background:none;border:none;color:#64748b;font-size:1.25rem;cursor:pointer;">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form id="phase-form" style="display:flex;flex-direction:column;gap:1rem;">
            <input type="hidden" id="phase-id" value="">

            <div class="field">
              <label for="phase-name">
                <span class="lang-es">Nombre de Fase</span>
                <span class="lang-en">Phase Name</span>
              </label>
              <input type="text" id="phase-name" required placeholder="Ej: Fase 1 — Instalación inicial">
            </div>

            <div class="field">
              <label for="phase-description">
                <span class="lang-es">Descripción</span>
                <span class="lang-en">Description</span>
              </label>
              <input type="text" id="phase-description" placeholder="Opcional">
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
              <div class="field">
                <label for="phase-investment">
                  <span class="lang-es">Inversión (COP)</span>
                  <span class="lang-en">Investment (COP)</span>
                </label>
                <input type="number" id="phase-investment" min="0" step="1000" required>
              </div>
              <div class="field">
                <label for="phase-start-date">
                  <span class="lang-es">Fecha Inicio</span>
                  <span class="lang-en">Start Date</span>
                </label>
                <input type="date" id="phase-start-date" required>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
              <div class="field">
                <label for="phase-capacity">
                  <span class="lang-es">Capacidad (kW)</span>
                  <span class="lang-en">Capacity (kW)</span>
                </label>
                <input type="number" id="phase-capacity" min="0" step="0.1" required>
              </div>
              <div class="field">
                <label for="phase-panels">
                  <span class="lang-es">Paneles</span>
                  <span class="lang-en">Panels</span>
                </label>
                <input type="number" id="phase-panels" min="0" required>
              </div>
            </div>

            <button type="submit" id="btn-save-phase" class="btn btn-solar" style="width:100%;margin-top:.5rem;">
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
 * @param {Function} callbacks.onSaveSettings - Called with form data when project settings are saved
 * @param {Function} callbacks.onCreatePhase - Called to open the new phase modal
 * @param {Function} callbacks.onEditPhase - Called with `(phaseId: string)` when edit is clicked
 * @param {Function} callbacks.onDeletePhase - Called with `(phaseId: string)` when delete is clicked
 */
export function init(callbacks) {
  const { onSaveSettings, onCreatePhase, onEditPhase, onDeletePhase } = callbacks || {};

  // Project settings form submission
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

  // New phase button
  const newPhaseBtn = document.getElementById('btn-new-phase');
  if (newPhaseBtn) {
    newPhaseBtn.addEventListener('click', () => {
      _openPhaseModal();
    });
  }

  // Phase form submission
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
    });
  }

  // Close phase modal
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

  // Timeline edit buttons
  document.querySelectorAll('.timeline-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const phaseId = btn.dataset.phaseId;
      const phase = (state.investments || []).find(p => p.id === phaseId);
      if (phase) _openPhaseModal(phase);
    });
  });

  // Timeline delete buttons
  document.querySelectorAll('.timeline-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const phaseId = btn.dataset.phaseId;
      if (typeof onDeletePhase === 'function') onDeletePhase(phaseId);
    });
  });
}

/* ── Private helpers ──────────────────────────────────────────────────────── */

/**
 * Open the phase modal, optionally pre-filled with existing phase data.
 * @param {Object} [phase] - Existing phase data for editing
 * @private
 */
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

/**
 * Close the phase modal.
 * @private
 */
function _closePhaseModal() {
  document.getElementById('phase-modal')?.classList.add('hidden');
}

/**
 * Escape a string for safe use inside an HTML attribute.
 * @param {string} str
 * @returns {string}
 * @private
 */
function _escapeAttr(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
