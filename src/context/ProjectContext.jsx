import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  fetchProjectReadings,
  getProject,
  getProjectInvestments,
  getUserProjectRole,
  getUserProjects,
} from '../modules/supabase.js';
import { processData } from '../modules/analytics.js';
import { clearProjectData, savePrefs, setActiveProject, state } from '../modules/state.js';
import { resetSolarmanRuntime, solarmanRuntime } from '../modules/solarman/runtime.js';
import { useAuth } from './AuthContext.jsx';
import { useApp } from './AppContext.jsx';
import { useToast } from './ToastContext.jsx';

const ProjectContext = createContext(null);

function sortReadings(readings) {
  return [...(readings || [])].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if ((a.monthIdx || 0) !== (b.monthIdx || 0)) return (a.monthIdx || 0) - (b.monthIdx || 0);
    return (a.fecha || '').localeCompare(b.fecha || '');
  });
}

function stopSolarmanSyncLazy() {
  import('../modules/solarman/sync.js')
    .then((m) => m.stopSolarmanLiveSync?.())
    .catch(() => {});
}

export function ProjectProvider({ children }) {
  const { user, isAdmin } = useAuth();
  const { lang, simParams, t } = useApp();
  const { showToast } = useToast();

  const [projectsState, setProjectsState] = useState({
    status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
    items: [],
    error: null,
  });

  const [activeState, setActiveState] = useState({
    status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
    project: null,
    role: null,
    rawData: [],
    investments: [],
    error: null,
  });

  const activeStateRef = useRef(activeState);
  activeStateRef.current = activeState;

  const projectsReqIdRef = useRef(0);
  const projectDataReqIdRef = useRef(0);

  const loadProjects = useCallback(async (overrideUser = null, overrideIsAdmin = null) => {
    const targetUser = overrideUser || user;
    const targetAdmin = overrideIsAdmin !== null ? overrideIsAdmin : isAdmin;
    if (!targetUser) return [];

    const reqId = ++projectsReqIdRef.current;
    setProjectsState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const list = await getUserProjects(targetUser.id, targetAdmin);
      if (reqId !== projectsReqIdRef.current) return null;
      state.projects = list || [];
      setProjectsState({ status: 'ready', items: list || [], error: null });
      return list || [];
    } catch (err) {
      if (reqId !== projectsReqIdRef.current) return null;
      const msg = err?.message || t('networkErrorDesc');
      setProjectsState((prev) => ({ ...prev, status: 'error', error: msg }));
      showToast(`${t('error')}: ${msg}`, 'error');
      return null;
    }
  }, [user, isAdmin, t, showToast]);

  const loadProjectData = useCallback(async (
    projectId,
    overrideUser = null,
    overrideIsAdmin = null,
    { force = false } = {},
  ) => {
    const targetUser = overrideUser || user;
    const targetAdmin = overrideIsAdmin !== null ? overrideIsAdmin : isAdmin;
    if (!projectId || !targetUser) return false;

    const current = activeStateRef.current;
    if (!force && current.status === 'ready' && current.project?.id === projectId) {
      return true;
    }

    const reqId = ++projectDataReqIdRef.current;
    const switchingProject = current.project?.id && current.project.id !== projectId;

    setActiveState((prev) => ({
      status: 'loading',
      project: switchingProject ? null : prev.project,
      role: switchingProject ? null : prev.role,
      rawData: switchingProject ? [] : prev.rawData,
      investments: switchingProject ? [] : prev.investments,
      error: null,
    }));

    if (solarmanRuntime.loadedProjectId && solarmanRuntime.loadedProjectId !== projectId) {
      stopSolarmanSyncLazy();
      resetSolarmanRuntime();
    }

    try {
      const project = await getProject(projectId);
      if (reqId !== projectDataReqIdRef.current) return false;
      if (!project) throw new Error(t('projectNotFoundDesc'));

      const role = targetAdmin ? 'admin' : await getUserProjectRole(projectId, targetUser.id);
      if (reqId !== projectDataReqIdRef.current) return false;

      const resolvedRole = role || 'observer';
      const [readings, investments] = await Promise.all([
        fetchProjectReadings(projectId),
        getProjectInvestments(projectId),
      ]);
      if (reqId !== projectDataReqIdRef.current) return false;

      const sortedRaw = sortReadings(readings);
      setActiveProject(project, resolvedRole);
      state.rawData = sortedRaw;
      state.investments = investments || [];
      state.processedData = processData(sortedRaw, project.capacity_kw);

      setActiveState({
        status: 'ready',
        project,
        role: resolvedRole,
        rawData: sortedRaw,
        investments: investments || [],
        error: null,
      });
      return true;
    } catch (err) {
      if (reqId !== projectDataReqIdRef.current) return false;
      const msg = err?.message || t('networkErrorDesc');
      setActiveState((prev) => ({
        ...prev,
        project: switchingProject ? null : prev.project,
        status: 'error',
        error: msg,
      }));
      showToast(`${t('error')}: ${msg}`, 'error');
      return false;
    }
  }, [user, isAdmin, t, showToast]);

  const reloadReadings = useCallback(async () => {
    if (!activeStateRef.current.project?.id) return;
    const projectId = activeStateRef.current.project.id;
    const reqId = ++projectDataReqIdRef.current;
    try {
      const readings = await fetchProjectReadings(projectId);
      if (reqId !== projectDataReqIdRef.current) return;
      const sortedRaw = sortReadings(readings);
      state.rawData = sortedRaw;
      state.processedData = processData(sortedRaw, activeStateRef.current.project.capacity_kw);
      setActiveState((prev) => ({ ...prev, rawData: sortedRaw }));
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    }
  }, [t, showToast]);

  const reloadInvestments = useCallback(async () => {
    if (!activeStateRef.current.project?.id) return;
    try {
      const investments = await getProjectInvestments(activeStateRef.current.project.id);
      state.investments = investments || [];
      setActiveState((prev) => ({ ...prev, investments: investments || [] }));
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    }
  }, [t, showToast]);

  const refreshActiveProject = useCallback(async () => {
    if (!activeStateRef.current.project?.id) return;
    try {
      const updated = await getProject(activeStateRef.current.project.id);
      if (updated) {
        setActiveProject(updated, activeStateRef.current.role);
        setActiveState((prev) => ({ ...prev, project: updated }));
      }
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    }
  }, [t, showToast]);

  const exitActiveProject = useCallback(() => {
    projectDataReqIdRef.current += 1;
    stopSolarmanSyncLazy();
    resetSolarmanRuntime();
    clearProjectData();
    setActiveProject(null, null);
    state.lastProjectId = null;
    savePrefs();
    setActiveState({
      status: 'idle',
      project: null,
      role: null,
      rawData: [],
      investments: [],
      error: null,
    });
  }, []);

  const resetAllProjectState = useCallback(() => {
    projectsReqIdRef.current += 1;
    exitActiveProject();
    state.projects = [];
    setProjectsState({ status: 'idle', items: [], error: null });
  }, [exitActiveProject]);

  // Recompute processedData reactively whenever rawData, capacity_kw, simParams.refHsp, or lang changes
  const processedData = useMemo(() => {
    const res = processData(activeState.rawData, activeState.project?.capacity_kw ?? null);
    state.processedData = res;
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeState.rawData, activeState.project?.capacity_kw, simParams.refHsp, lang]);

  const isProjectAdmin = isAdmin || activeState.role === 'admin';

  const value = useMemo(() => ({
    projectsState,
    activeState,
    processedData,
    isProjectAdmin,
    loadProjects,
    loadProjectData,
    reloadReadings,
    reloadInvestments,
    refreshActiveProject,
    exitActiveProject,
    resetAllProjectState,
  }), [
    projectsState,
    activeState,
    processedData,
    isProjectAdmin,
    loadProjects,
    loadProjectData,
    reloadReadings,
    reloadInvestments,
    refreshActiveProject,
    exitActiveProject,
    resetAllProjectState,
  ]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside ProjectProvider');
  return ctx;
}
