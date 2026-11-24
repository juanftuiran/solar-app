import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { state, savePrefs } from '../modules/state.js';
import { monthName as rawMonthName, translate } from '../modules/i18n.js';

const AppContext = createContext(null);

function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredSchemeOverride() {
  try {
    const scheme = localStorage.getItem('color-scheme');
    if (scheme === 'light' || scheme === 'dark') return scheme;
    const raw = localStorage.getItem('jf_solar_prefs_v4');
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.theme === 'light' || parsed?.theme === 'dark') return parsed.theme;
  } catch {
    // Ignore storage errors
  }
  return null;
}

function syncDocumentColorScheme(resolvedTheme, manualOverride) {
  document.documentElement.setAttribute('data-theme', resolvedTheme);
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.content = manualOverride ? resolvedTheme : 'light dark';
  }
}

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(state.lang || 'es');
  const [theme, setThemeState] = useState(state.theme || 'dark');
  const [hasManualTheme, setHasManualTheme] = useState(Boolean(state.hasManualTheme));
  const [kioskMode, setKioskModeState] = useState(false);
  const [activeTab, setActiveTabState] = useState(state.activeTab || 'telemetry');
  const [selectedYear, setSelectedYearState] = useState(state.selectedYear || 'all');
  const [chartModes, setChartModesState] = useState({ ...state.chartModes });
  const [simParams, setSimParamsState] = useState({ ...state.simParams });

  // Keep shared state module synced for analytics.js and Chart.js helpers
  state.lang = lang;
  state.theme = theme;
  state.hasManualTheme = hasManualTheme;
  state.activeTab = activeTab;
  state.selectedYear = selectedYear;
  state.chartModes = chartModes;
  state.simParams = simParams;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    syncDocumentColorScheme(theme, hasManualTheme);
  }, [theme, hasManualTheme]);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => {
      if (!hasManualTheme) {
        const next = e.matches ? 'dark' : 'light';
        state.theme = next;
        setThemeState(next);
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [hasManualTheme]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== 'color-scheme' && e.key !== 'jf_solar_prefs_v4') return;
      const stored = readStoredSchemeOverride();
      if (stored) {
        state.hasManualTheme = true;
        state.theme = stored;
        setHasManualTheme(true);
        setThemeState(stored);
      } else {
        const sys = getSystemTheme();
        state.hasManualTheme = false;
        state.theme = sys;
        setHasManualTheme(false);
        setThemeState(sys);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('kiosk-mode', kioskMode);
    if (!kioskMode && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    const timer = setTimeout(() => {
      Object.values(state.charts).forEach((c) => c?.resize?.());
    }, 120);
    return () => clearTimeout(timer);
  }, [kioskMode]);

  const setLang = useCallback((nextLang) => {
    const normalized = nextLang === 'en' ? 'en' : 'es';
    state.lang = normalized;
    setLangState(normalized);
    savePrefs();
  }, []);

  const toggleTheme = useCallback(() => {
    const systemTheme = getSystemTheme();
    const target = theme === 'light' ? 'dark' : 'light';

    if (target === systemTheme) {
      // Returning to OS preference: remove stored override
      setHasManualTheme(false);
      state.hasManualTheme = false;
      state.theme = systemTheme;
      setThemeState(systemTheme);
      try {
        localStorage.removeItem('color-scheme');
      } catch {
        // Ignore storage errors
      }
      savePrefs();
    } else {
      setHasManualTheme(true);
      state.hasManualTheme = true;
      state.theme = target;
      setThemeState(target);
      try {
        localStorage.setItem('color-scheme', target);
      } catch {
        // Ignore storage errors
      }
      savePrefs();
    }
  }, [theme]);

  const toggleKioskMode = useCallback((forceState) => {
    setKioskModeState((prev) => {
      const next = typeof forceState === 'boolean' ? forceState : !prev;
      state.kioskMode = next;
      if (next) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
      return next;
    });
  }, []);

  const setActiveTab = useCallback((tab) => {
    state.activeTab = tab;
    setActiveTabState(tab);
    savePrefs();
  }, []);

  const setSelectedYear = useCallback((year) => {
    state.selectedYear = year;
    setSelectedYearState(year);
    savePrefs();
  }, []);

  const setChartMode = useCallback((key, mode) => {
    setChartModesState((prev) => {
      const next = { ...prev, [key]: mode };
      state.chartModes = next;
      return next;
    });
  }, []);

  const updateSimParams = useCallback((updater) => {
    setSimParamsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      state.simParams = next;
      savePrefs();
      return next;
    });
  }, []);

  const resetSimParams = useCallback(() => {
    const defaults = { inflation: 4.0, degradation: 0.4, discountRate: 8.0, refHsp: 4.5 };
    state.simParams = defaults;
    setSimParamsState(defaults);
    savePrefs();
  }, []);

  const t = useCallback((key, vars = null) => translate(lang, key, vars), [lang]);
  const monthName = useCallback((idx) => rawMonthName(idx, lang), [lang]);

  const value = useMemo(() => ({
    lang,
    setLang,
    theme,
    hasManualTheme,
    toggleTheme,
    kioskMode,
    toggleKioskMode,
    activeTab,
    setActiveTab,
    selectedYear,
    setSelectedYear,
    chartModes,
    setChartMode,
    simParams,
    updateSimParams,
    resetSimParams,
    t,
    monthName,
  }), [
    lang,
    setLang,
    theme,
    hasManualTheme,
    toggleTheme,
    kioskMode,
    toggleKioskMode,
    activeTab,
    setActiveTab,
    selectedYear,
    setSelectedYear,
    chartModes,
    setChartMode,
    simParams,
    updateSimParams,
    resetSimParams,
    t,
    monthName,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
