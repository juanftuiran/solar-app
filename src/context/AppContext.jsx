import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { state, savePrefs } from '../modules/state.js';
import { monthName as rawMonthName, translate } from '../modules/i18n.js';

const AppContext = createContext(null);

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
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
    setHasManualTheme(true);
    state.hasManualTheme = true;
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      state.theme = next;
      savePrefs();
      return next;
    });
  }, []);

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
