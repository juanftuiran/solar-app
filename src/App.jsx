import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ProjectProvider, useProject } from './context/ProjectContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { state } from './modules/state.js';
import StatePanel from './components/StatePanel.jsx';

const LoginView = lazy(() => import('./views/LoginView.jsx'));
const ProjectSelectorView = lazy(() => import('./views/ProjectSelectorView.jsx'));
const ProjectShellLayout = lazy(() => import('./layouts/ProjectShellLayout.jsx'));
const TelemetryTab = lazy(() => import('./views/dashboard/TelemetryTab.jsx'));
const FinanceTab = lazy(() => import('./views/dashboard/FinanceTab.jsx'));
const AuditTab = lazy(() => import('./views/dashboard/AuditTab.jsx'));
const SolarmanView = lazy(() => import('./views/SolarmanView.jsx'));
const ProjectSettingsView = lazy(() => import('./views/ProjectSettingsView.jsx'));
const MembersView = lazy(() => import('./views/MembersView.jsx'));

function AuthSplash() {
  const { t } = useApp();
  return (
    <div id="loader">
      <div className="loader-ring spin" />
      <p className="loader-text pulse">{t('connecting')}</p>
    </div>
  );
}

function PublicOnlyRoute({ children }) {
  const { isConfigured, user, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) return <AuthSplash />;
  if (isConfigured && user) {
    const dest = location.state?.from;
    if (dest && typeof dest === 'string' && !dest.startsWith('/login')) {
      return <Navigate to={dest} replace />;
    }
    if (state.lastProjectId) {
      return <Navigate to={`/projects/${state.lastProjectId}/telemetry`} replace />;
    }
    return <Navigate to="/projects" replace />;
  }
  return children;
}

function RequireAuth({ children }) {
  const { isConfigured, user, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) return <AuthSplash />;
  if (!isConfigured || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return children;
}

function RootRedirect() {
  const { isConfigured, user, isAdmin, authReady } = useAuth();
  const { projectsState, loadProjects } = useProject();
  const [asyncTarget, setAsyncTarget] = useState(null);

  const syncTarget = (() => {
    if (!authReady) return null;
    if (!isConfigured || !user) return '/login';
    if (state.lastProjectId) return `/projects/${state.lastProjectId}/telemetry`;
    if (projectsState.status === 'ready') {
      const list = projectsState.items || [];
      if (!isAdmin && list.length === 1) {
        return `/projects/${list[0].id}/telemetry`;
      }
      return '/projects';
    }
    return null;
  })();

  useEffect(() => {
    if (syncTarget || !authReady || !isConfigured || !user) return undefined;
    let cancelled = false;
    loadProjects(user, isAdmin).then((list) => {
      if (cancelled) return;
      if (!isAdmin && Array.isArray(list) && list.length === 1) {
        setAsyncTarget(`/projects/${list[0].id}/telemetry`);
      } else {
        setAsyncTarget('/projects');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [syncTarget, authReady, isConfigured, user, isAdmin, loadProjects]);

  const target = syncTarget || asyncTarget;
  if (!target) return <AuthSplash />;
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AuthProvider>
          <ProjectProvider>
            <BrowserRouter>
              <Suspense fallback={<AuthSplash />}>
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route
                    path="/login"
                    element={(
                      <PublicOnlyRoute>
                        <LoginView />
                      </PublicOnlyRoute>
                    )}
                  />
                  <Route
                    path="/projects"
                    element={(
                      <RequireAuth>
                        <ProjectSelectorView />
                      </RequireAuth>
                    )}
                  />
                  <Route
                    path="/projects/:projectId"
                    element={(
                      <RequireAuth>
                        <ProjectShellLayout />
                      </RequireAuth>
                    )}
                  >
                    <Route index element={<Navigate to="telemetry" replace />} />
                    <Route
                      path="telemetry"
                      element={(
                        <Suspense fallback={<StatePanel variant="loading" />}>
                          <TelemetryTab />
                        </Suspense>
                      )}
                    />
                    <Route
                      path="finance"
                      element={(
                        <Suspense fallback={<StatePanel variant="loading" />}>
                          <FinanceTab />
                        </Suspense>
                      )}
                    />
                    <Route
                      path="audit"
                      element={(
                        <Suspense fallback={<StatePanel variant="loading" />}>
                          <AuditTab />
                        </Suspense>
                      )}
                    />
                    <Route
                      path="monitor"
                      element={(
                        <Suspense fallback={<StatePanel variant="loading" />}>
                          <SolarmanView />
                        </Suspense>
                      )}
                    />
                    <Route
                      path="investments"
                      element={(
                        <Suspense fallback={<StatePanel variant="loading" />}>
                          <ProjectSettingsView mode="investments" />
                        </Suspense>
                      )}
                    />
                    <Route
                      path="settings"
                      element={(
                        <Suspense fallback={<StatePanel variant="loading" />}>
                          <ProjectSettingsView mode="settings" />
                        </Suspense>
                      )}
                    />
                    <Route
                      path="members"
                      element={(
                        <Suspense fallback={<StatePanel variant="loading" />}>
                          <MembersView />
                        </Suspense>
                      )}
                    />
                    <Route path="*" element={<Navigate to="telemetry" replace />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ProjectProvider>
        </AuthProvider>
      </ToastProvider>
    </AppProvider>
  );
}
