/**
 * @module app/projectController
 * @description Project settings, investment phases, and project member CRUD orchestration.
 */

import { state, setActiveProject } from "../modules/state.js";
import { processData } from "../modules/analytics.js";
import { t } from "../modules/i18n.js";
import {
  getProject,
  updateProject,
  getProjectInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  addProjectMember,
  removeProjectMember,
  updateMemberRole,
} from "../modules/supabase.js";
import { showConfirmModal } from "../components/modal.js";
import { showToast } from "./ui.js";

let _onRenderView = () => {};
let _onReloadMembers = () => {};

export function registerProjectCallbacks({ renderView, reloadMembers }) {
  if (renderView) _onRenderView = renderView;
  if (reloadMembers) _onReloadMembers = reloadMembers;
}

const renderDashboardView = (v) => _onRenderView(v);
const loadAndRenderMembers = () => _onReloadMembers();

export async function handleSaveSettings(data) {
  if (!state.activeProject) return;
  try {
    const result = await updateProject(state.activeProject.id, {
      name: data.name,
      description: data.description,
      location: data.location,
      capacity_kw: data.capacity_kw,
      panel_count: data.panel_count,
      inverter_model: data.inverter_model,
      monitoring_url: data.monitoring_url,
      updated_at: new Date().toISOString(),
    });
    if (!result) throw new Error('No se pudo guardar la configuración.');
    const updated = await getProject(state.activeProject.id);
    if (updated) setActiveProject(updated, state.activeProjectRole);
    state.processedData = processData(state.rawData);
    showToast(state.lang === 'es' ? 'Configuración guardada' : 'Settings saved', 'success');
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

export async function handleCreatePhase(data) {
  if (!state.activeProject || !data) return;
  try {
    const result = await createInvestment({
      project_id: state.activeProject.id,
      phase_name: data.phase_name,
      description: data.description || '',
      investment_cop: data.investment_cop || 0,
      capacity_added_kw: data.capacity_added_kw || 0,
      panels_added: data.panels_added || 0,
      start_date: data.start_date,
    });
    if (!result) throw new Error('No se pudo crear la fase.');
    state.investments = await getProjectInvestments(state.activeProject.id) || [];
    showToast(state.lang === 'es' ? 'Fase de inversión creada' : 'Investment phase created', 'success');
    renderDashboardView(state.currentView);
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

export async function handleEditPhase(data) {
  if (!state.activeProject || !data || !data.id) return;
  try {
    const { id, ...updates } = data;
    const result = await updateInvestment(id, updates);
    if (!result) throw new Error('No se pudo actualizar la fase.');
    state.investments = await getProjectInvestments(state.activeProject.id) || [];
    showToast(state.lang === 'es' ? 'Fase actualizada' : 'Phase updated', 'success');
    renderDashboardView(state.currentView);
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

export async function handleDeletePhase(investmentId) {
  showConfirmModal({
    titleEs: 'Eliminar Fase de Inversión',
    titleEn: 'Delete Investment Phase',
    messageEs: '¿Estás seguro de eliminar esta fase de inversión? Afectará el cálculo de ROI y proyección.',
    messageEn: 'Are you sure you want to delete this phase? This will affect ROI and projection calculations.',
    confirmBtnEs: 'Eliminar Fase',
    confirmBtnEn: 'Delete Phase',
    isDanger: true,
    onConfirm: async () => {
      try {
        const ok = await deleteInvestment(investmentId);
        if (!ok) throw new Error('No se pudo eliminar la fase.');
        state.investments = await getProjectInvestments(state.activeProject.id) || [];
        showToast(state.lang === 'es' ? 'Fase eliminada' : 'Phase deleted', 'success');
        renderDashboardView(state.currentView);
      } catch (err) {
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    },
  });
}

// ── Member Handlers ───────────────────────────────────────────────────────────
export async function handleAddMember({ email, role }) {
  if (!state.activeProject || !email) return;

  try {
    const result = await addProjectMember(state.activeProject.id, email, role);
    if (!result) throw new Error('No se pudo agregar el miembro. Verifica que el usuario exista.');
    showToast(state.lang === 'es' ? 'Miembro agregado exitosamente' : 'Member added successfully', 'success');
    await loadAndRenderMembers();
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

export async function handleRemoveMember(memberId) {
  showConfirmModal({
    titleEs: 'Remover Miembro',
    titleEn: 'Remove Member',
    messageEs: '¿Deseas revocar el acceso de este usuario al proyecto?',
    messageEn: "Do you want to revoke this user's access to the project?",
    confirmBtnEs: 'Remover',
    confirmBtnEn: 'Remove',
    isDanger: true,
    onConfirm: async () => {
      try {
        const ok = await removeProjectMember(memberId);
        if (!ok) throw new Error('Error al remover miembro.');
        showToast(state.lang === 'es' ? 'Miembro removido' : 'Member removed', 'success');
        await loadAndRenderMembers();
      } catch (err) {
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    },
  });
}

export async function handleChangeRole(memberId, newRole) {
  try {
    const ok = await updateMemberRole(memberId, newRole);
    if (!ok) throw new Error('Error al actualizar rol.');
    showToast(state.lang === 'es' ? 'Rol actualizado' : 'Role updated', 'success');
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}
