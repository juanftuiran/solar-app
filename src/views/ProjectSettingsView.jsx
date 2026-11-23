import React, { useEffect, useState } from 'react';
import {
  AlignLeft,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Layers,
  Link2,
  MapPin,
  Plus,
  Save,
  Settings,
  Signature,
  Sun,
  Zap,
} from 'lucide-react';
import {
  createInvestment,
  deleteInvestment,
  updateInvestment,
  updateProject,
} from '../modules/supabase.js';
import { useApp } from '../context/AppContext.jsx';
import { useProject } from '../context/ProjectContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import InvestmentTimeline from '../components/InvestmentTimeline.jsx';
import { ConfirmModal, Modal } from '../components/Modal.jsx';

export default function ProjectSettingsView({ mode = 'settings' }) {
  const { t } = useApp();
  const { activeState, isProjectAdmin, refreshActiveProject, reloadInvestments } = useProject();
  const { showToast } = useToast();

  const project = activeState.project || {};
  const investments = activeState.investments || [];
  const isInvestmentsFocus = mode === 'investments';

  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
    location: '',
    inverter_model: '',
    capacity_kw: '',
    panel_count: '',
    monitoring_url: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const [phaseModalOpen, setPhaseModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [phaseForm, setPhaseForm] = useState({
    phase_name: '',
    description: '',
    investment_cop: '',
    start_date: '',
    capacity_added_kw: '',
    panels_added: '',
  });
  const [savingPhase, setSavingPhase] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingPhase, setDeletingPhase] = useState(false);

  useEffect(() => {
    setSettingsForm({
      name: project.name || '',
      description: project.description || '',
      location: project.location || '',
      inverter_model: project.inverter_model || '',
      capacity_kw: project.capacity_kw ?? '',
      panel_count: project.panel_count ?? '',
      monitoring_url: project.monitoring_url || '',
    });
  }, [project]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!project.id) return;
    setSavingSettings(true);
    try {
      const result = await updateProject(project.id, {
        name: settingsForm.name.trim(),
        description: settingsForm.description.trim(),
        location: settingsForm.location.trim(),
        capacity_kw: parseFloat(settingsForm.capacity_kw) || 0,
        panel_count: parseInt(settingsForm.panel_count, 10) || 0,
        inverter_model: settingsForm.inverter_model.trim(),
        monitoring_url: settingsForm.monitoring_url.trim(),
        updated_at: new Date().toISOString(),
      });
      if (!result) throw new Error('No se pudo guardar la configuración.');
      await refreshActiveProject();
      showToast(t('settingsSaved'), 'success');
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const openPhaseModal = (phase = null) => {
    setEditingPhase(phase);
    if (phase) {
      setPhaseForm({
        phase_name: phase.phase_name || '',
        description: phase.description || '',
        investment_cop: phase.investment_cop ?? '',
        start_date: phase.start_date || '',
        capacity_added_kw: phase.capacity_added_kw ?? '',
        panels_added: phase.panels_added ?? '',
      });
    } else {
      setPhaseForm({
        phase_name: '',
        description: '',
        investment_cop: '',
        start_date: '',
        capacity_added_kw: '',
        panels_added: '',
      });
    }
    setPhaseModalOpen(true);
  };

  const handleSavePhase = async (e) => {
    e.preventDefault();
    if (!project.id) return;
    setSavingPhase(true);
    try {
      const payload = {
        phase_name: phaseForm.phase_name.trim(),
        description: phaseForm.description.trim(),
        investment_cop: parseInt(phaseForm.investment_cop, 10) || 0,
        capacity_added_kw: parseFloat(phaseForm.capacity_added_kw) || 0,
        panels_added: parseInt(phaseForm.panels_added, 10) || 0,
        start_date: phaseForm.start_date,
      };
      if (editingPhase?.id) {
        const res = await updateInvestment(editingPhase.id, payload);
        if (!res) throw new Error('No se pudo actualizar la fase.');
        showToast(t('phaseUpdated'), 'success');
      } else {
        const res = await createInvestment({ project_id: project.id, ...payload });
        if (!res) throw new Error('No se pudo crear la fase.');
        showToast(t('phaseCreated'), 'success');
      }
      await reloadInvestments();
      setPhaseModalOpen(false);
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    } finally {
      setSavingPhase(false);
    }
  };

  const handleConfirmDeletePhase = async () => {
    if (!confirmDeleteId) return;
    setDeletingPhase(true);
    try {
      const ok = await deleteInvestment(confirmDeleteId);
      if (!ok) throw new Error('No se pudo eliminar la fase.');
      await reloadInvestments();
      showToast(t('phaseDeleted'), 'success');
      setConfirmDeleteId(null);
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    } finally {
      setDeletingPhase(false);
    }
  };

  const settingsCard = (
    <div className="card section-card" id="section-project-settings" key="settings">
      <div className="section-head">
        <div className="section-head-title">
          <div className="icon-tile accent" aria-hidden="true"><Settings size={18} /></div>
          <div>
            <h2>{t('generalSettingsTitle')}</h2>
            <p>{t('generalSettingsDesc')}</p>
          </div>
        </div>
        <span className="meta-chip accent">
          <CheckCircle2 size={13} aria-hidden="true" />
          <span>{isProjectAdmin ? t('editMode') : t('readOnlyMode')}</span>
        </span>
      </div>

      <form id="project-settings-form" className="form-stack" onSubmit={handleSaveSettings}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="setting-name">
              <Signature size={14} className="text-accent" aria-hidden="true" />
              <span>{t('projectName')}</span>
            </label>
            <input
              type="text"
              id="setting-name"
              required
              disabled={!isProjectAdmin}
              value={settingsForm.name}
              onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="setting-slug">
              <Link2 size={14} className="text-muted" aria-hidden="true" />
              <span>Slug Identificador (URL)</span>
            </label>
            <input type="text" id="setting-slug" value={project.slug || ''} disabled />
          </div>
        </div>

        <div className="field">
          <label htmlFor="setting-description">
            <AlignLeft size={14} className="text-muted" aria-hidden="true" />
            <span>{t('descriptionNotes')}</span>
          </label>
          <input
            type="text"
            id="setting-description"
            placeholder="Descripción breve de la instalación..."
            disabled={!isProjectAdmin}
            value={settingsForm.description}
            onChange={(e) => setSettingsForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="setting-location">
              <MapPin size={14} className="text-solar" aria-hidden="true" />
              <span>{t('geoLocation')}</span>
            </label>
            <input
              type="text"
              id="setting-location"
              placeholder="Ciudad, País"
              disabled={!isProjectAdmin}
              value={settingsForm.location}
              onChange={(e) => setSettingsForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="setting-inverter">
              <Cpu size={14} className="text-warning" aria-hidden="true" />
              <span>{t('inverterModel')}</span>
            </label>
            <input
              type="text"
              id="setting-inverter"
              placeholder="Ej: DEYE SUN-5K-SG03LP1"
              disabled={!isProjectAdmin}
              value={settingsForm.inverter_model}
              onChange={(e) => setSettingsForm((f) => ({ ...f, inverter_model: e.target.value }))}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="setting-capacity">
              <Zap size={14} className="text-solar" aria-hidden="true" />
              <span>{t('nominalCapacity')}</span>
            </label>
            <input
              type="number"
              id="setting-capacity"
              step="0.1"
              min="0"
              placeholder="Ej: 3.5"
              disabled={!isProjectAdmin}
              value={settingsForm.capacity_kw}
              onChange={(e) => setSettingsForm((f) => ({ ...f, capacity_kw: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="setting-panels">
              <Sun size={14} className="text-accent" aria-hidden="true" />
              <span>{t('panelCount')}</span>
            </label>
            <input
              type="number"
              id="setting-panels"
              min="0"
              placeholder="Ej: 6"
              disabled={!isProjectAdmin}
              value={settingsForm.panel_count}
              onChange={(e) => setSettingsForm((f) => ({ ...f, panel_count: e.target.value }))}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="setting-monitoring-url">
            <ExternalLink size={14} className="text-accent" aria-hidden="true" />
            <span>{t('remoteMonitoringUrl')}</span>
          </label>
          <input
            type="url"
            id="setting-monitoring-url"
            placeholder="https://www.dessmonitor.com/..."
            disabled={!isProjectAdmin}
            value={settingsForm.monitoring_url}
            onChange={(e) => setSettingsForm((f) => ({ ...f, monitoring_url: e.target.value }))}
          />
        </div>

        {isProjectAdmin && (
          <div className="form-actions">
            <button type="submit" className="btn btn-accent btn-lg" disabled={savingSettings}>
              <Save size={16} aria-hidden="true" />
              <span>{savingSettings ? t('saving') : t('saveSettings')}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );

  const investmentsCard = (
    <div className="card section-card" id="section-project-investments" key="investments">
      <div className="section-head">
        <div className="section-head-title">
          <div className="icon-tile solar" aria-hidden="true"><Layers size={18} /></div>
          <div>
            <h2>{t('investmentPhasesTitle')}</h2>
            <p>{t('investmentPhasesDesc')}</p>
          </div>
        </div>

        {isProjectAdmin && (
          <button
            id="btn-new-phase"
            type="button"
            className="btn btn-solar"
            onClick={() => openPhaseModal(null)}
          >
            <Plus size={16} aria-hidden="true" />
            <span>{t('newPhase')}</span>
          </button>
        )}
      </div>

      <InvestmentTimeline
        investments={investments}
        isAdmin={isProjectAdmin}
        onEdit={(phase) => openPhaseModal(phase)}
        onDelete={(id) => setConfirmDeleteId(id)}
      />
    </div>
  );

  return (
    <div id="project-settings-view" className="stack">
      {isInvestmentsFocus ? [investmentsCard, settingsCard] : [settingsCard, investmentsCard]}

      <Modal
        open={phaseModalOpen}
        onClose={() => setPhaseModalOpen(false)}
        dialogId="phase-modal"
        titleId="phase-modal-title"
        title={editingPhase ? t('editInvestmentPhase') : t('newInvestmentPhase')}
        maxWidth="28rem"
        icon={<div className="icon-tile sm solar" aria-hidden="true"><Layers size={16} /></div>}
      >
        <form id="phase-form" className="form-stack" onSubmit={handleSavePhase}>
          <div className="field">
            <label htmlFor="phase-name">{t('phaseName')}</label>
            <input
              type="text"
              id="phase-name"
              required
              placeholder="Ej: Fase 1 — Instalación Inicial"
              value={phaseForm.phase_name}
              onChange={(e) => setPhaseForm((f) => ({ ...f, phase_name: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="phase-description">{t('phaseDescription')}</label>
            <input
              type="text"
              id="phase-description"
              placeholder="Ej: 6 paneles 550W + inversor Deye"
              value={phaseForm.description}
              onChange={(e) => setPhaseForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="phase-investment">{t('investmentAmount')}</label>
              <input
                type="number"
                id="phase-investment"
                min="0"
                step="1000"
                placeholder="15000000"
                required
                value={phaseForm.investment_cop}
                onChange={(e) => setPhaseForm((f) => ({ ...f, investment_cop: e.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="phase-start-date">{t('startDate')}</label>
              <input
                type="date"
                id="phase-start-date"
                required
                value={phaseForm.start_date}
                onChange={(e) => setPhaseForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="phase-capacity">{t('capacityAdded')}</label>
              <input
                type="number"
                id="phase-capacity"
                min="0"
                step="0.1"
                placeholder="3.3"
                required
                value={phaseForm.capacity_added_kw}
                onChange={(e) => setPhaseForm((f) => ({ ...f, capacity_added_kw: e.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="phase-panels">{t('panelsAdded')}</label>
              <input
                type="number"
                id="phase-panels"
                min="0"
                placeholder="6"
                required
                value={phaseForm.panels_added}
                onChange={(e) => setPhaseForm((f) => ({ ...f, panels_added: e.target.value }))}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-solar btn-lg btn-block" style={{ marginTop: '.25rem' }} disabled={savingPhase}>
            <Save size={16} aria-hidden="true" />
            <span>{savingPhase ? t('saving') : t('savePhase')}</span>
          </button>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title={t('deletePhaseTitle')}
        message={t('deletePhaseMessage')}
        confirmLabel={t('deletePhaseBtn')}
        loading={deletingPhase}
        onConfirm={handleConfirmDeletePhase}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
