/**
 * @file Dashboard.tsx
 * @module pages/Dashboard
 * @description Enterprise photovoltaic telemetry, IEC 61724 engineering & 25-year financial valuation dashboard.
 * Redesigned to Hallmark modern-minimal technical/editorial standards with strict token discipline.
 */

import React, { useState, useId, useMemo } from 'react';

export interface TelemetryReading {
  id: string;
  fecha: string;
  year?: number;
  monthIdx?: number;
  label?: string;
  lecturaRed: number;
  lecturaSolar: number;
  precioKw: number;
  consumoRed?: number;
  prodBruta?: number;
  autonomia?: number;
  specificYield?: number;
  hsp?: number;
  ahorroReal?: number;
  incPrecio?: number;
  healthScore?: string;
  inverter_reset?: boolean;
  meter_reset?: boolean;
}

export interface ProjectData {
  id?: string;
  name?: string;
  location?: string;
  capacity_kw?: number;
  panel_count?: number;
  inverter_model?: string;
  monitoring_url?: string;
}

export interface UserData {
  id?: string;
  email?: string;
  role?: string;
}

export interface SimulationParams {
  inflation: number;
  degradation: number;
  discountRate: number;
}

export interface DashboardProps {
  user?: UserData;
  project?: ProjectData;
  isAdmin?: boolean;
  activeTab?: 'telemetry' | 'finance' | 'audit';
  selectedYear?: string | number;
  availableYears?: number[];
  readings?: TelemetryReading[];
  baseRecord?: TelemetryReading | null;
  theme?: 'dark' | 'light';
  lang?: 'es' | 'en';
  onYearChange?: (year: string) => void;
  onSaveRecord?: (data: {
    editId?: string;
    fecha: string;
    lecturaRed: number;
    lecturaSolar: number;
    precioKw: number;
    inverter_reset: boolean;
    meter_reset: boolean;
  }) => void;
  onOpenNewRecord?: () => void;
  onToggleChartMode?: (chartKey: string, mode: 'bar' | 'line') => void;
  onLogout?: () => void;
  onNavigate?: (view: string) => void;
  onLangChange?: (lang: 'es' | 'en') => void;
  onExportCsv?: () => void;
  onImportCsv?: (records: TelemetryReading[]) => void;
  onTabChange?: (tab: string) => void;
  onSimChange?: (params: SimulationParams) => void;
  onToggleTheme?: () => void;
  onToggleKiosk?: (active?: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user = {},
  project = {},
  isAdmin = false,
  activeTab: initialTab = 'telemetry',
  selectedYear = 'all',
  availableYears = [],
  readings = [],
  baseRecord = null,
  theme = 'dark',
  lang = 'es',
  onYearChange,
  onSaveRecord,
  onOpenNewRecord,
  onToggleChartMode,
  onLogout,
  onNavigate,
  onLangChange,
  onExportCsv,
  onImportCsv,
  onTabChange,
  onSimChange,
  onToggleTheme,
  onToggleKiosk,
}) => {
  const [currentTab, setCurrentTab] = useState<'telemetry' | 'finance' | 'audit'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [energyMode, setEnergyMode] = useState<'bar' | 'line'>('bar');
  const [priceMode, setPriceMode] = useState<'bar' | 'line'>('line');
  const [isRecordModalOpen, setRecordModalOpen] = useState(false);
  const [isCsvModalOpen, setCsvModalOpen] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isKioskActive, setKioskActive] = useState(false);

  // Simulation Sliders State
  const [sim, setSim] = useState<SimulationParams>({
    inflation: 4.0,
    degradation: 0.4,
    discountRate: 8.0,
  });

  const isEn = lang === 'en';

  const handleTabSelect = (tab: 'telemetry' | 'finance' | 'audit') => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  const filteredReadings = useMemo(() => {
    if (!searchTerm.trim()) return readings;
    const q = searchTerm.toLowerCase().trim();
    return readings.filter(r => (r.label || '').toLowerCase().includes(q) || r.fecha.includes(q));
  }, [readings, searchTerm]);

  return (
    <div className={`app-layout ${isAdmin ? 'has-sidebar' : ''}`}>
      <main className="main-content" id="main-content">
        <div id="dashboard" className="content-area">
          {/* ── App Header ───────────────────────────────────────────── */}
          <header className="app-header">
            <div className="header-left">
              <nav className="header-breadcrumbs" aria-label="Breadcrumb">
                <a
                  href="#portfolio"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate?.('projects');
                  }}
                >
                  <span className="fa-solid fa-solar-panel" aria-hidden="true" />
                  <span>{isEn ? 'Portfolio' : 'Portafolio'}</span>
                </a>
                <span className="sep" aria-hidden="true">/</span>
                <span className="current">{project.name || 'JF Solar Cloud'}</span>
              </nav>
              <div className="header-title-row">
                <h1 className="header-project-name">{project.name || 'JF Solar Cloud'}</h1>
                <span className="status-pill" role="status">
                  <span className="online-dot" aria-hidden="true" />
                  <span>{isEn ? 'Online' : 'En línea'}</span>
                </span>
                {project.capacity_kw && (
                  <span className="meta-chip accent" title={isEn ? 'Nominal Capacity' : 'Capacidad Nominal'}>
                    <span className="fa-solid fa-bolt" aria-hidden="true" />
                    <span>{project.capacity_kw.toFixed(1)} kWp</span>
                  </span>
                )}
                {project.inverter_model && (
                  <span className="meta-chip warning hide-sm" title={isEn ? 'Inverter Model' : 'Modelo de Inversor'}>
                    <span className="fa-solid fa-microchip" aria-hidden="true" />
                    <span>{project.inverter_model}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="header-actions">
              <button
                type="button"
                id="btn-theme-toggle"
                className="btn btn-ghost btn-icon"
                title={isEn ? 'Toggle color theme' : 'Cambiar tema de color'}
                aria-label={isEn ? 'Toggle color theme' : 'Cambiar tema'}
                onClick={onToggleTheme}
              >
                <i className={`fa-solid ${theme === 'light' ? 'fa-moon text-accent' : 'fa-sun text-warning'}`} aria-hidden="true" />
              </button>

              <button
                type="button"
                id="btn-kiosk-mode"
                className="btn btn-ghost btn-icon hide-sm"
                title={isEn ? 'Presentation kiosk view' : 'Modo presentación pantalla completa'}
                aria-label={isEn ? 'Kiosk mode' : 'Modo presentación'}
                onClick={() => {
                  setKioskActive(prev => !prev);
                  onToggleKiosk?.(!isKioskActive);
                }}
              >
                <span className="fa-solid fa-tv text-ai" aria-hidden="true" />
              </button>

              <select
                id="year-filter"
                className="select-pill"
                aria-label={isEn ? 'Filter by year' : 'Filtrar por año'}
                value={String(selectedYear)}
                onChange={(e) => onYearChange?.(e.target.value)}
              >
                <option value="all">{isEn ? 'All years' : 'Todos los años'}</option>
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>

              <button
                type="button"
                id="btn-exec-report"
                className="btn btn-ghost"
                title={isEn ? 'Export executive PDF' : 'Generar reporte ejecutivo'}
                onClick={() => setReportModalOpen(true)}
              >
                <span className="fa-solid fa-file-pdf text-danger" aria-hidden="true" />
                <span className="hide-sm">{isEn ? 'Report' : 'Reporte'}</span>
              </button>

              <button
                type="button"
                id="btn-export-csv"
                className="btn btn-ghost"
                title={isEn ? 'Export data as CSV' : 'Exportar datos a CSV'}
                onClick={onExportCsv}
              >
                <span className="fa-solid fa-file-arrow-down text-accent" aria-hidden="true" />
                <span>CSV</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  id="btn-open-new-record"
                  className="btn btn-primary"
                  onClick={() => {
                    setRecordModalOpen(true);
                    onOpenNewRecord?.();
                  }}
                >
                  <span className="fa-solid fa-plus" aria-hidden="true" />
                  <span>{isEn ? 'New record' : 'Nuevo registro'}</span>
                </button>
              )}

              <div className="header-divider" aria-hidden="true" />

              <button
                type="button"
                className="btn btn-ghost"
                title={isEn ? 'Solarman Live Telemetry' : 'Monitor Solarman en vivo'}
                onClick={() => onNavigate?.('solarman')}
              >
                <span className="fa-solid fa-satellite-dish text-solar" aria-hidden="true" />
                <span className="hide-sm">Solarman</span>
              </button>

              {project.monitoring_url && (
                <button
                  type="button"
                  id="btn-monitoring-link"
                  className="btn btn-ghost btn-icon"
                  title={isEn ? 'Open external monitoring' : 'Abrir portal de monitoreo externo'}
                  onClick={() => window.open(project.monitoring_url, '_blank')}
                >
                  <span className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                id="btn-dashboard-logout"
                className="btn btn-ghost btn-icon"
                title={isEn ? 'Sign out' : 'Cerrar sesión'}
                aria-label={isEn ? 'Sign out' : 'Cerrar sesión'}
                onClick={onLogout}
              >
                <span className="fa-solid fa-right-from-bracket" aria-hidden="true" />
              </button>
            </div>
          </header>

          {/* ── Context Navigation Tabs ──────────────────────────────── */}
          <div className="dashboard-tabs-row" role="tablist">
            <div className="dashboard-tabs" id="dashboard-tab-bar">
              <button
                type="button"
                role="tab"
                aria-selected={currentTab === 'telemetry'}
                className={`tab-btn ${currentTab === 'telemetry' ? 'active' : ''}`}
                onClick={() => handleTabSelect('telemetry')}
              >
                <span className="fa-solid fa-solar-panel" aria-hidden="true" />
                <span>{isEn ? 'Telemetry & balance' : 'Telemetría y balance'}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={currentTab === 'finance'}
                className={`tab-btn ${currentTab === 'finance' ? 'active' : ''}`}
                onClick={() => handleTabSelect('finance')}
              >
                <span className="fa-solid fa-chart-pie" aria-hidden="true" />
                <span>{isEn ? 'Finance & 25Y simulator' : 'Finanzas y simulador 25 años'}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={currentTab === 'audit'}
                className={`tab-btn ${currentTab === 'audit' ? 'active' : ''}`}
                onClick={() => handleTabSelect('audit')}
              >
                <span className="fa-solid fa-cloud" aria-hidden="true" />
                <span>{isEn ? 'Cloud log' : 'Historial en la nube'}</span>
                <span className="tab-count-badge">{readings.length}</span>
              </button>

              <button
                type="button"
                className="tab-btn"
                onClick={() => onNavigate?.('solarman')}
              >
                <span className="fa-solid fa-satellite-dish text-solar" aria-hidden="true" />
                <span>{isEn ? 'Solarman live monitor' : 'Monitor Solarman en vivo'}</span>
              </button>
            </div>
          </div>

          {/* ── Tab 1: Telemetría & Balance ─────────────────────────── */}
          {currentTab === 'telemetry' && (
            <section className="tab-pane active" aria-label={isEn ? 'Telemetry and balance' : 'Telemetría y balance'}>
              {/* Solar Health Strip */}
              <div className="solar-health-strip">
                <div className="solar-health-card">
                  <div className="solar-health-badge">
                    <span className="fa-solid fa-shield-halved" aria-hidden="true" />
                  </div>
                  <div className="solar-health-info">
                    <span className="solar-health-title">{isEn ? 'System health' : 'Salud del sistema'}</span>
                    <span className="health-pill">{isEn ? 'Optimal' : 'Óptimo'}</span>
                  </div>
                </div>

                <div className="solar-metric-item">
                  <div className="solar-metric-icon">
                    <span className="fa-solid fa-bolt-lightning text-accent" aria-hidden="true" />
                  </div>
                  <div className="solar-metric-info">
                    <span className="solar-metric-lbl">{isEn ? 'Specific yield (Yf)' : 'Rendimiento (Yf)'}</span>
                    <span className="solar-metric-val num" id="sh-specific-yield">132.4 kWh/kWp</span>
                  </div>
                </div>

                <div className="solar-metric-item">
                  <div className="solar-metric-icon">
                    <span className="fa-solid fa-sun text-warning" aria-hidden="true" />
                  </div>
                  <div className="solar-metric-info">
                    <span className="solar-metric-lbl">{isEn ? 'Peak sun hours (HSP)' : 'Horas sol pico (HSP)'}</span>
                    <span className="solar-metric-val num" id="sh-avg-hsp">4.41 h/d</span>
                  </div>
                </div>

                <div className="solar-metric-item">
                  <div className="solar-metric-icon">
                    <span className="fa-solid fa-gauge-high text-solar" aria-hidden="true" />
                  </div>
                  <div className="solar-metric-info">
                    <span className="solar-metric-lbl">{isEn ? 'Performance ratio (PR)' : 'Performance ratio (PR)'}</span>
                    <span className="solar-metric-val num" id="sh-pr-val">82.5%</span>
                  </div>
                </div>

                <div className="solar-metric-item">
                  <div className="solar-metric-icon">
                    <span className="fa-solid fa-calendar-day text-ai" aria-hidden="true" />
                  </div>
                  <div className="solar-metric-info">
                    <span className="solar-metric-lbl">{isEn ? 'Daily generation rate' : 'Generación media diaria'}</span>
                    <span className="solar-metric-val num" id="sh-daily-gen">34.8 kWh/d</span>
                  </div>
                </div>
              </div>

              {/* KPI Grid */}
              <div className="kpi-grid">
                <div className="card kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">{isEn ? 'Period net savings' : 'Ahorro neto del período'}</span>
                    <div className="kpi-icon-wrap">
                      <span className="fa-solid fa-piggy-bank text-solar" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="kpi-value num" id="kpi-ahorro">$ 1.450.000</div>
                  <div className="kpi-footer">
                    <div className="kpi-subtext">
                      <span className="kpi-delta-slot delta up num">+8.4%</span>
                      <span>{isEn ? 'vs previous cycle' : 'vs ciclo anterior'}</span>
                    </div>
                    <div className="kpi-spark">
                      <canvas id="spark-kpi-ahorro" />
                    </div>
                  </div>
                </div>

                <div className="card kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">{isEn ? 'Solar production' : 'Producción solar'}</span>
                    <div className="kpi-icon-wrap">
                      <span className="fa-solid fa-solar-panel text-accent" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="kpi-value num" id="kpi-produccion">1.045 kWh</div>
                  <div className="kpi-footer">
                    <div className="kpi-subtext">
                      <span className="kpi-delta-slot delta up num">+4.1%</span>
                      <span>{isEn ? 'gross output' : 'generación bruta'}</span>
                    </div>
                    <div className="kpi-spark">
                      <canvas id="spark-kpi-produccion" />
                    </div>
                  </div>
                </div>

                <div className="card kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">{isEn ? 'Solar autonomy' : 'Autonomía solar'}</span>
                    <div className="kpi-icon-wrap">
                      <span className="fa-solid fa-battery-three-quarters text-ai" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="kpi-value num" id="kpi-autonomia">68.2%</div>
                  <div className="kpi-footer">
                    <div className="kpi-subtext">
                      <span className="kpi-delta-slot delta up num">+2.3%</span>
                      <span>{isEn ? '3-month average' : 'promedio trimestral'}</span>
                    </div>
                    <div className="kpi-spark">
                      <canvas id="spark-kpi-autonomia" />
                    </div>
                  </div>
                </div>

                <div className="card kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">{isEn ? 'Grid tariff variation' : 'Variación tarifa red'}</span>
                    <div className="kpi-icon-wrap">
                      <span className="fa-solid fa-arrow-trend-up text-warning" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="kpi-value num" id="kpi-var-kw">$ 985 / kWh</div>
                  <div className="kpi-footer">
                    <div className="kpi-subtext">
                      <span className="kpi-delta-slot delta down num">+1.5%</span>
                      <span>{isEn ? 'inflation drift' : 'inflación de tarifa'}</span>
                    </div>
                    <div className="kpi-spark">
                      <canvas id="spark-kpi-var-kw" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="charts-grid">
                <div className="card chart-wrap">
                  <div className="chart-header">
                    <div className="chart-title">
                      <h3>
                        <span className="fa-solid fa-bolt text-solar" aria-hidden="true" />
                        <span>{isEn ? 'Energy balance (grid vs solar)' : 'Balance energético (red vs solar)'}</span>
                      </h3>
                      <p className="chart-subtitle">
                        {isEn
                          ? 'Monthly comparison of billed grid consumption vs clean PV generation'
                          : 'Comparativa mensual de energía consumida de la red vs generación fotovoltaica'}
                      </p>
                    </div>
                    <div className="segmented-control" role="group" aria-label="Energy view mode">
                      <button
                        type="button"
                        className={`segmented-btn ${energyMode === 'bar' ? 'active' : ''}`}
                        onClick={() => {
                          setEnergyMode('bar');
                          onToggleChartMode?.('energia', 'bar');
                        }}
                      >
                        <span className="fa-solid fa-chart-simple" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`segmented-btn ${energyMode === 'line' ? 'active' : ''}`}
                        onClick={() => {
                          setEnergyMode('line');
                          onToggleChartMode?.('energia', 'line');
                        }}
                      >
                        <span className="fa-solid fa-chart-line" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="chart-container tall">
                    <canvas id="chart-energia" />
                  </div>
                </div>

                <div className="card chart-wrap">
                  <div className="chart-header">
                    <div className="chart-title">
                      <h3>
                        <span className="fa-solid fa-chart-pie text-accent" aria-hidden="true" />
                        <span>{isEn ? 'Energy mix' : 'Mix energético'}</span>
                      </h3>
                      <p className="chart-subtitle">
                        {isEn ? 'Cumulative clean energy share' : 'Participación fotovoltaica acumulada'}
                      </p>
                    </div>
                  </div>
                  <div className="mix-wrap">
                    <div className="mix-chart">
                      <canvas id="chart-mix" />
                    </div>
                    <div className="mix-legend">
                      <div className="mix-legend-row">
                        <span className="lbl">
                          <span className="legend-dot" style={{ background: 'var(--solar)' }} />
                          <span>{isEn ? 'Solar PV' : 'Solar fotovoltaica'}</span>
                        </span>
                        <span className="val text-solar num" id="mix-solar-val">68.2%</span>
                      </div>
                      <div className="mix-legend-row">
                        <span className="lbl">
                          <span className="legend-dot" style={{ background: 'var(--grid-c)' }} />
                          <span>{isEn ? 'Grid utility' : 'Red eléctrica'}</span>
                        </span>
                        <span className="val text-grid num" id="mix-grid-val">31.8%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="charts-grid two">
                <div className="card chart-wrap">
                  <div className="chart-header">
                    <div className="chart-title">
                      <h3>
                        <span className="fa-solid fa-sun text-warning" aria-hidden="true" />
                        <span>{isEn ? 'Plant performance & peak sun hours' : 'Rendimiento y horas sol pico (HSP)'}</span>
                      </h3>
                      <p className="chart-subtitle">
                        {isEn ? 'IEC 61724 reference lines (Optimal 4.0, Minimum 3.2)' : 'Estándar IEC 61724 (referencias: Óptimo 4.0, Mínimo 3.2)'}
                      </p>
                    </div>
                  </div>
                  <div className="chart-container">
                    <canvas id="chart-rendimiento" />
                  </div>
                </div>

                <div className="card chart-wrap">
                  <div className="chart-header">
                    <div className="chart-title">
                      <h3>
                        <span className="fa-solid fa-coins text-warning" aria-hidden="true" />
                        <span>{isEn ? 'Tariff price fluctuation' : 'Fluctuación de tarifa kW (COP)'}</span>
                      </h3>
                      <p className="chart-subtitle">
                        {isEn ? 'Evolution of billed electricity tariff per kWh' : 'Evolución del costo facturado por kWh en la red eléctrica'}
                      </p>
                    </div>
                    <div className="segmented-control" role="group" aria-label="Tariff view mode">
                      <button
                        type="button"
                        className={`segmented-btn ${priceMode === 'line' ? 'active' : ''}`}
                        onClick={() => {
                          setPriceMode('line');
                          onToggleChartMode?.('precio', 'line');
                        }}
                      >
                        <span className="fa-solid fa-chart-line" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`segmented-btn ${priceMode === 'bar' ? 'active' : ''}`}
                        onClick={() => {
                          setPriceMode('bar');
                          onToggleChartMode?.('precio', 'bar');
                        }}
                      >
                        <span className="fa-solid fa-chart-simple" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="chart-container">
                    <canvas id="chart-precio" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Tab 2: Finanzas & Retorno ───────────────────────────── */}
          {currentTab === 'finance' && (
            <section className="tab-pane active" aria-label={isEn ? 'Finance and simulator' : 'Finanzas y simulador'}>
              {/* ROI Panel */}
              <div className="card roi-panel">
                <div className="section-head">
                  <div className="section-head-title">
                    <div className="icon-tile accent">
                      <span className="fa-solid fa-chart-pie" aria-hidden="true" />
                    </div>
                    <div>
                      <h3>{isEn ? 'Return on investment & payback' : 'Retorno de inversión y amortización'}</h3>
                      <p>{isEn ? 'Dynamic valuation from clean production vs rising grid tariffs' : 'Cálculo dinámico basado en generación solar real vs tarifas de red'}</p>
                    </div>
                  </div>
                  <span className="meta-chip accent">
                    <span className="fa-solid fa-shield-halved" aria-hidden="true" />
                    <span>{isEn ? 'Active payback tracking' : 'Amortización activa'}</span>
                  </span>
                </div>

                <div className="roi-body">
                  <div className="roi-ring" id="roi-ring" style={{ ['--p' as string]: 42 }}>
                    <div className="roi-ring-inner">
                      <span className="roi-ring-value num" id="roi-ring-value">42%</span>
                      <span className="roi-ring-label">{isEn ? 'Amortized' : 'Amortizado'}</span>
                    </div>
                  </div>

                  <div className="payback-bar-container">
                    <div className="payback-bar-header">
                      <span>{isEn ? 'Payback progress' : 'Progreso de amortización'}</span>
                      <span className="text-solar num" id="roi-progress-percent">42.4%</span>
                    </div>
                    <div className="payback-bar-track">
                      <div className="payback-bar-fill" id="roi-progress-bar-fill" style={{ width: '42.4%' }} />
                    </div>

                    <div className="payback-stats-grid">
                      <div className="payback-stat-col">
                        <span className="payback-stat-lbl">{isEn ? 'Total capex' : 'Inversión total'}</span>
                        <span className="payback-stat-val text-accent num" id="roi-total-investment">$ 24.500.000</span>
                      </div>
                      <div className="payback-stat-col">
                        <span className="payback-stat-lbl">{isEn ? 'Avg monthly savings' : 'Ahorro mensual prom.'}</span>
                        <span className="payback-stat-val text-solar num" id="roi-avg-savings">$ 1.380.000</span>
                      </div>
                      <div className="payback-stat-col">
                        <span className="payback-stat-lbl">{isEn ? 'Est. breakeven' : 'Tiempo estimado'}</span>
                        <span className="payback-stat-val num" id="roi-time">3.2 {isEn ? 'years' : 'años'}</span>
                      </div>
                      <div className="payback-stat-col">
                        <span className="payback-stat-lbl">{isEn ? 'Total recovered' : 'Ahorro acumulado'}</span>
                        <span className="payback-stat-val text-solar num" id="roi-total-saved-pill">$ 10.380.000</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="roi-chart-head">
                  <h4>
                    <span className="fa-solid fa-chart-line text-solar" aria-hidden="true" />
                    <span>{isEn ? 'Historical payback curve vs invested capital' : 'Curva histórica de amortización vs capital invertido'}</span>
                  </h4>
                  <span className="stat-tile-sub">{isEn ? 'Intersection = Breakeven' : 'Punto de corte = Recuperación completa'}</span>
                </div>
                <div className="chart-container short">
                  <canvas id="chart-payback" />
                </div>
              </div>

              {/* Refined Technical AI / Econometric Panel */}
              <div className="ai-panel">
                <div className="ai-inner">
                  <div className="ai-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <div className="icon-tile ai">
                        <span className="fa-solid fa-brain" aria-hidden="true" />
                      </div>
                      <div>
                        <h3>{isEn ? 'Econometric forecasting & tariff intelligence' : 'Pronóstico econométrico y analítica tarifaria'}</h3>
                        <p>{isEn ? 'Weighted WLS model and exponential regression with 90% confidence band' : 'Modelo ponderado WLS y regresión exponencial con banda de confianza 90%'}</p>
                      </div>
                    </div>
                    <span className="ai-badge" id="ai-model-badge">R² 94.2%</span>
                  </div>

                  <div className="ai-grid">
                    <div className="ai-item">
                      <span className="ai-item-lbl">{isEn ? 'Next month estimated tariff' : 'Tarifa estimada próximo mes'}</span>
                      <span className="ai-item-val num" id="ai-precio-futuro">$ 1.015 / kWh</span>
                      <span className="ai-item-sub num" id="ai-rango-confianza">Banda: ± $ 18 COP</span>
                    </div>

                    <div className="ai-item">
                      <span className="ai-item-lbl">{isEn ? 'Annual tariff inflation drift' : 'Tendencia e inflación (CAGR)'}</span>
                      <span className="ai-item-val num" id="ai-tendencia">+6.8%</span>
                      <span className="ai-item-sub num" id="ai-cagr">CAGR estimado anual</span>
                    </div>

                    <div className="ai-item">
                      <span className="ai-item-lbl">{isEn ? '6-month horizon estimate' : 'Proyección a 6 meses'}</span>
                      <span className="ai-item-val num" id="ai-precio-6m">$ 1.060 / kWh</span>
                      <span className="ai-item-sub">{isEn ? 'Mid-term confidence' : 'Horizonte medio plazo'}</span>
                    </div>

                    <div className="ai-item">
                      <span className="ai-item-lbl">{isEn ? 'Estimated monthly savings' : 'Ahorro estimado próximo mes'}</span>
                      <span className="ai-item-val text-solar num" id="ai-ahorro-mes">$ 1.520.000</span>
                      <span className="ai-item-sub">{isEn ? 'Based on expected radiation' : 'Basado en radiación histórica'}</span>
                    </div>
                  </div>

                  <div className="eco-banner">
                    <div className="eco-chips">
                      <span className="eco-chip">
                        <span className="fa-solid fa-sun text-warning" aria-hidden="true" />
                        <span>{isEn ? 'Peak solar month: ' : 'Pico histórico: '}<strong className="num" id="ai-mejor-mes">Julio</strong></span>
                      </span>
                      <span className="eco-chip">
                        <span className="fa-solid fa-leaf text-solar" aria-hidden="true" />
                        <span>{isEn ? 'Avoided carbon: ' : 'CO₂ evitado: '}<strong className="num" id="ai-co2">5.280 kg</strong></span>
                      </span>
                      <span className="eco-chip">
                        <span className="fa-solid fa-tree text-solar" aria-hidden="true" />
                        <span>{isEn ? 'Equivalent trees planted: ' : 'Equivalente a: '}<strong className="num" id="eco-trees">142 árboles</strong></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 25-Year Interactive Simulator */}
              <div className="card" style={{ padding: 'var(--space-lg)' }}>
                <div className="section-head" style={{ marginBottom: 'var(--space-md)' }}>
                  <div className="section-head-title">
                    <div className="icon-tile ai">
                      <span className="fa-solid fa-sliders" aria-hidden="true" />
                    </div>
                    <div>
                      <h3>{isEn ? 'Interactive 25-year financial simulator' : 'Simulador financiero interactivo y proyección a 25 años'}</h3>
                      <p>{isEn ? 'Discounted cashflow modeling (NPV, IRR, LCOE) with dynamic degradation and tariff inflation' : 'Modelado de flujo de caja descontado (VPN, TIR, LCOE) con degradación e inflación dinámicas'}</p>
                    </div>
                  </div>
                  <div className="assumption-chips">
                    <span className="meta-chip num" id="sim-chip-deg">Deg: {sim.degradation.toFixed(2)}%/año</span>
                    <span className="meta-chip warning num" id="sim-chip-inf">Inf: {sim.inflation.toFixed(1)}%/año</span>
                    <span className="meta-chip accent num" id="sim-chip-wacc">WACC: {sim.discountRate.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="sim-controls-panel">
                  <div className="sim-control-item">
                    <div className="sim-control-head">
                      <label htmlFor="sim-slider-inflation">
                        <span className="fa-solid fa-arrow-trend-up text-warning" aria-hidden="true" />
                        <span>{isEn ? 'Annual tariff inflation' : 'Inflación tarifaria anual'}</span>
                      </label>
                      <strong className="text-warning num" id="sim-val-inflation">{sim.inflation.toFixed(1)}%</strong>
                    </div>
                    <input
                      type="range"
                      id="sim-slider-inflation"
                      min="0"
                      max="15"
                      step="0.5"
                      value={sim.inflation}
                      className="sim-slider"
                      onChange={(e) => {
                        const next = { ...sim, inflation: parseFloat(e.target.value) || 0 };
                        setSim(next);
                        onSimChange?.(next);
                      }}
                    />
                  </div>

                  <div className="sim-control-item">
                    <div className="sim-control-head">
                      <label htmlFor="sim-slider-degradation">
                        <span className="fa-solid fa-solar-panel text-solar" aria-hidden="true" />
                        <span>{isEn ? 'Annual panel degradation' : 'Degradación anual paneles'}</span>
                      </label>
                      <strong className="text-solar num" id="sim-val-degradation">{sim.degradation.toFixed(2)}%</strong>
                    </div>
                    <input
                      type="range"
                      id="sim-slider-degradation"
                      min="0.1"
                      max="1.5"
                      step="0.05"
                      value={sim.degradation}
                      className="sim-slider"
                      onChange={(e) => {
                        const next = { ...sim, degradation: parseFloat(e.target.value) || 0 };
                        setSim(next);
                        onSimChange?.(next);
                      }}
                    />
                  </div>

                  <div className="sim-control-item">
                    <div className="sim-control-head">
                      <label htmlFor="sim-slider-wacc">
                        <span className="fa-solid fa-landmark text-accent" aria-hidden="true" />
                        <span>{isEn ? 'Discount rate (WACC)' : 'Tasa de descuento (WACC)'}</span>
                      </label>
                      <strong className="text-accent num" id="sim-val-wacc">{sim.discountRate.toFixed(1)}%</strong>
                    </div>
                    <input
                      type="range"
                      id="sim-slider-wacc"
                      min="2"
                      max="20"
                      step="0.5"
                      value={sim.discountRate}
                      className="sim-slider"
                      onChange={(e) => {
                        const next = { ...sim, discountRate: parseFloat(e.target.value) || 0 };
                        setSim(next);
                        onSimChange?.(next);
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    id="btn-reset-sim"
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      const base = { inflation: 4.0, degradation: 0.4, discountRate: 8.0 };
                      setSim(base);
                      onSimChange?.(base);
                    }}
                  >
                    <span className="fa-solid fa-rotate-left" aria-hidden="true" />
                    <span>{isEn ? 'Reset' : 'Restaurar'}</span>
                  </button>
                </div>

                <div className="proj-summary">
                  <div className="stat-tile">
                    <span className="stat-tile-lbl">{isEn ? '25-Yr Gross savings' : 'Ahorro bruto 25 años'}</span>
                    <span className="stat-tile-val text-solar num" id="proj-total-savings">$ 148.500.000</span>
                    <span className="stat-tile-sub">{isEn ? 'Cumulative cashflow' : 'Flujo acumulado'}</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-tile-lbl">{isEn ? 'Net present value (NPV)' : 'Valor presente neto (VPN)'}</span>
                    <span className="stat-tile-val text-solar num" id="proj-npv">$ 52.300.000</span>
                    <span className="stat-tile-sub">{isEn ? 'Discounted at WACC' : 'Descontado al WACC'}</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-tile-lbl">{isEn ? 'Internal rate (IRR)' : 'Tasa interna (TIR)'}</span>
                    <span className="stat-tile-val text-accent num" id="proj-irr">28.4%</span>
                    <span className="stat-tile-sub">{isEn ? 'Effective annual return' : 'Rentabilidad efectiva anual'}</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-tile-lbl">{isEn ? 'Breakeven year' : 'Punto de equilibrio'}</span>
                    <span className="stat-tile-val text-warning num" id="proj-breakeven">Año 3.2</span>
                    <span className="stat-tile-sub">{isEn ? 'Full capital payback' : 'Recuperación de inversión'}</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-tile-lbl">{isEn ? 'Levelized cost (LCOE)' : 'Costo nivelado (LCOE)'}</span>
                    <span className="stat-tile-val num" id="proj-lcoe">$ 285 / kWh</span>
                    <span className="stat-tile-sub">{isEn ? 'Real solar unit cost' : 'Costo unitario solar real'}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Tab 3: Historial Cloud & Auditoría ───────────────────── */}
          {currentTab === 'audit' && (
            <section className="tab-pane active" aria-label={isEn ? 'Cloud log' : 'Historial en la nube'}>
              <div className="table-wrap">
                <div className="table-header">
                  <h3>
                    <span className="fa-solid fa-cloud text-accent" aria-hidden="true" />
                    <span>{isEn ? 'Cloud historical readings' : 'Registro histórico en la nube'}</span>
                  </h3>
                  <div className="table-toolbar">
                    <div className="search-input-wrap">
                      <span className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                      <input
                        type="text"
                        id="table-search-input"
                        placeholder={isEn ? 'Search period or date...' : 'Buscar período o fecha...'}
                        aria-label={isEn ? 'Search readings' : 'Buscar lecturas'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        id="btn-import-csv"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setCsvModalOpen(true)}
                      >
                        <span className="fa-solid fa-file-arrow-up text-solar" aria-hidden="true" />
                        <span>{isEn ? 'Import CSV' : 'Importar CSV'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{isEn ? 'Period / Date' : 'Período / Fecha'}</th>
                        <th className="text-center">{isEn ? 'Readings Grid / Solar' : 'Lecturas Red / Solar'}</th>
                        <th className="text-center">{isEn ? 'Grid usage' : 'Consumo red'}</th>
                        <th className="text-center">{isEn ? 'Solar gen' : 'Gen. solar'}</th>
                        <th className="text-center">{isEn ? 'Yield (Yf)' : 'Rendimiento (Yf)'}</th>
                        <th className="text-right">{isEn ? 'Tariff' : 'Tarifa kW'}</th>
                        <th className="text-right">{isEn ? 'Savings' : 'Ahorro'}</th>
                        {isAdmin && <th className="text-center">{isEn ? 'Actions' : 'Acciones'}</th>}
                      </tr>
                    </thead>
                    <tbody id="table-body">
                      {baseRecord && (
                        <tr className="data-row base-record-row">
                          <td>
                            <div className="cell-primary text-accent">{baseRecord.label || 'Lectura base'}</div>
                            <div className="cell-sub num">{baseRecord.fecha}</div>
                            <span className="badge-base-record">
                              <span className="fa-solid fa-flag" aria-hidden="true" />
                              <span>{isEn ? 'Initial base reading (t0)' : 'Lectura inicial base (t0)'}</span>
                            </span>
                          </td>
                          <td className="text-center num">
                            <strong>{baseRecord.lecturaRed.toFixed(0)}</strong> / <strong className="text-solar">{baseRecord.lecturaSolar.toFixed(0)}</strong>
                          </td>
                          <td colSpan={3} className="text-center text-muted">
                            {isEn ? 'Baseline reference point for monthly deltas' : 'Punto de referencia inicial para el cálculo de deltas mensuales'}
                          </td>
                          <td className="text-right num">$ {baseRecord.precioKw.toFixed(2)}</td>
                          <td className="text-right text-muted">:</td>
                          {isAdmin && <td className="text-center text-muted">:</td>}
                        </tr>
                      )}

                      {filteredReadings.map((row) => (
                        <tr key={row.id} className="data-row">
                          <td>
                            <div className="cell-primary">{row.label || row.fecha}</div>
                            <div className="cell-sub num">{row.fecha}</div>
                            {row.inverter_reset && (
                              <span className="badge-reset">
                                <span className="fa-solid fa-rotate" aria-hidden="true" />
                                <span>Inversor</span>
                              </span>
                            )}
                          </td>
                          <td className="text-center num">
                            <span>{row.lecturaRed.toFixed(0)}</span> / <span className="text-solar">{row.lecturaSolar.toFixed(0)}</span>
                          </td>
                          <td className="text-center num">{(row.consumoRed || 0).toFixed(1)} kWh</td>
                          <td className="text-center text-solar num">{(row.prodBruta || 0).toFixed(1)} kWh</td>
                          <td className="text-center num">{(row.specificYield || 0).toFixed(1)} kWh/kWp</td>
                          <td className="text-right num">$ {(row.precioKw || 0).toFixed(2)}</td>
                          <td className="text-right text-solar num">
                            <strong>$ {(row.ahorroReal || 0).toLocaleString()}</strong>
                          </td>
                          {isAdmin && (
                            <td className="text-center">
                              <div className="cell-actions">
                                <button type="button" className="btn btn-ghost btn-xs btn-icon" title={isEn ? 'Edit' : 'Editar'}>
                                  <span className="fa-solid fa-pen" aria-hidden="true" />
                                </button>
                                <button type="button" className="btn btn-danger-outline btn-xs btn-icon" title={isEn ? 'Delete' : 'Eliminar'}>
                                  <span className="fa-solid fa-trash" aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ── App Footer ───────────────────────────────────────────── */}
          <footer className="app-footer">
            <span className="fa-solid fa-leaf text-solar" aria-hidden="true" />
            <span>JF Solar Cloud v4.0 : Plataforma empresarial de analítica fotovoltaica</span>
          </footer>
        </div>
      </main>

      {/* ── Kiosk Floating HUD Bar ──────────────────────────────────── */}
      {isKioskActive && (
        <div id="kiosk-floating-bar" className="kiosk-bar">
          <div className="kiosk-bar-brand">
            <span className="online-dot" aria-hidden="true" />
            <strong>{project.name || 'Planta Solar'}</strong>
            <span className="kiosk-tag">{isEn ? 'Live kiosk' : 'Kiosk en vivo'}</span>
          </div>
          <div className="kiosk-bar-actions">
            <button
              type="button"
              id="btn-kiosk-exit"
              className="btn btn-danger btn-xs"
              onClick={() => {
                setKioskActive(false);
                onToggleKiosk?.(false);
              }}
            >
              <span className="fa-solid fa-compress" aria-hidden="true" />
              <span>{isEn ? 'Exit' : 'Salir'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Add/Edit Record Modal ────────────────────────────────────── */}
      {isRecordModalOpen && (
        <div id="add-record-modal" className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box" style={{ maxWidth: '30rem' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                <div className="icon-tile sm accent">
                  <span className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
                </div>
                <span>{isEn ? 'New cloud reading' : 'Nuevo registro en la nube'}</span>
              </h2>
              <button
                type="button"
                id="close-record-modal"
                className="modal-close-btn"
                aria-label={isEn ? 'Close modal' : 'Cerrar modal'}
                onClick={() => setRecordModalOpen(false)}
              >
                <span className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <form
              id="add-record-form"
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fecha = (form.elements.namedItem('new-fecha') as HTMLInputElement)?.value || '';
                const lecturaRed = parseFloat((form.elements.namedItem('new-lectura-red') as HTMLInputElement)?.value) || 0;
                const lecturaSolar = parseFloat((form.elements.namedItem('new-lectura-solar') as HTMLInputElement)?.value) || 0;
                const precioKw = parseFloat((form.elements.namedItem('new-precio') as HTMLInputElement)?.value) || 0;
                const inverter_reset = (form.elements.namedItem('new-inverter-reset') as HTMLInputElement)?.checked || false;
                const meter_reset = (form.elements.namedItem('new-meter-reset') as HTMLInputElement)?.checked || false;

                onSaveRecord?.({ fecha, lecturaRed, lecturaSolar, precioKw, inverter_reset, meter_reset });
                setRecordModalOpen(false);
              }}
            >
              <div className="field">
                <label htmlFor="new-fecha">
                  <span className="fa-solid fa-calendar-day text-accent" aria-hidden="true" />
                  <span>{isEn ? 'Reading date' : 'Fecha de lectura'}</span>
                </label>
                <input type="date" id="new-fecha" name="new-fecha" required />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="new-lectura-red">
                    <span className="fa-solid fa-gauge text-grid" aria-hidden="true" />
                    <span>{isEn ? 'Grid reading (meter)' : 'Lectura red (medidor)'}</span>
                  </label>
                  <input type="number" step="0.01" id="new-lectura-red" name="new-lectura-red" placeholder="14500" required />
                </div>
                <div className="field">
                  <label htmlFor="new-lectura-solar">
                    <span className="fa-solid fa-solar-panel text-solar" aria-hidden="true" />
                    <span>{isEn ? 'Solar reading (inverter)' : 'Lectura solar (inversor)'}</span>
                  </label>
                  <input type="number" step="0.01" id="new-lectura-solar" name="new-lectura-solar" placeholder="8200" required />
                </div>
              </div>

              <div className="field">
                <label htmlFor="new-precio">
                  <span className="fa-solid fa-coins text-warning" aria-hidden="true" />
                  <span>{isEn ? 'Price per kW (COP)' : 'Tarifa por kW (COP)'}</span>
                </label>
                <input type="number" step="0.01" id="new-precio" name="new-precio" placeholder="950.50" required />
              </div>

              <div className="check-group">
                <label className="check-option">
                  <input type="checkbox" id="new-inverter-reset" name="new-inverter-reset" />
                  <div>
                    <span className="check-option-title">{isEn ? 'Inverter reset (hardware replacement)' : 'Reinicio de inversor (nuevo equipo solar)'}</span>
                    <span className="check-option-desc">{isEn ? 'Check if inverter was replaced and reading reset to zero' : 'Marca si cambiaste el inversor y la lectura reinició desde 0'}</span>
                  </div>
                </label>
              </div>

              <div className="live-calc-card">
                <div className="live-calc-header">
                  <span>{isEn ? 'Real-time calculation preview' : 'Cálculo en tiempo real'}</span>
                  <span className="tag">Preview</span>
                </div>
                <div className="live-calc-grid">
                  <div className="live-calc-item">
                    <span className="lbl">{isEn ? 'Grid usage:' : 'Consumo red:'}</span>
                    <span className="val num">0.0 kWh</span>
                  </div>
                  <div className="live-calc-item">
                    <span className="lbl">{isEn ? 'Solar gen:' : 'Gen. solar:'}</span>
                    <span className="val text-solar num">0.0 kWh</span>
                  </div>
                </div>
              </div>

              <button type="submit" id="btn-save" className="btn btn-primary btn-lg btn-block">
                <span className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
                <span>{isEn ? 'Save to cloud' : 'Guardar en la nube'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ────────────────────────────────────────── */}
      {isCsvModalOpen && (
        <div id="csv-import-modal" className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box" style={{ maxWidth: '34rem' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                <div className="icon-tile sm solar">
                  <span className="fa-solid fa-file-csv" aria-hidden="true" />
                </div>
                <span>{isEn ? 'Import readings from CSV' : 'Importar historial desde CSV'}</span>
              </h2>
              <button
                type="button"
                id="close-csv-modal"
                className="modal-close-btn"
                aria-label={isEn ? 'Close modal' : 'Cerrar modal'}
                onClick={() => setCsvModalOpen(false)}
              >
                <span className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="form-stack">
              <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                {isEn
                  ? 'Upload a CSV file containing date (YYYY-MM-DD), grid reading, solar reading, and kW tariff.'
                  : 'Carga un archivo CSV con columnas de fecha (YYYY-MM-DD), lectura de red, lectura solar y tarifa kW.'}
              </p>

              <label className="csv-dropzone" htmlFor="csv-file-input">
                <span className="fa-solid fa-cloud-arrow-up text-solar" style={{ fontSize: '1.6rem' }} aria-hidden="true" />
                <div>
                  <strong>{isEn ? 'Choose .CSV file' : 'Seleccionar archivo .CSV'}</strong>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-light)', display: 'block' }}>
                    {isEn ? 'UTF-8 encoded, comma-delimited' : 'Codificación UTF-8, delimitado por comas'}
                  </span>
                </div>
                <input type="file" id="csv-file-input" accept=".csv,text/csv" style={{ display: 'none' }} />
              </label>

              <button
                type="button"
                id="btn-confirm-csv-import"
                className="btn btn-primary btn-lg btn-block"
                disabled
              >
                <span className="fa-solid fa-database" aria-hidden="true" />
                <span>{isEn ? 'Import and sync to cloud' : 'Importar y sincronizar con la nube'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Executive Report Modal ──────────────────────────────────── */}
      {isReportModalOpen && (
        <div id="exec-report-modal" className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box exec-report-modal-box">
            <div className="modal-header">
              <h2 className="modal-title">
                <div className="icon-tile sm solar">
                  <span className="fa-solid fa-file-pdf" aria-hidden="true" />
                </div>
                <span>{isEn ? 'Solar plant executive report' : 'Informe ejecutivo de planta solar'}</span>
              </h2>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                <button
                  type="button"
                  id="btn-print-exec-report"
                  className="btn btn-primary btn-sm"
                  onClick={() => window.print()}
                >
                  <span className="fa-solid fa-print" aria-hidden="true" />
                  <span>{isEn ? 'Print / PDF' : 'Imprimir / Guardar PDF'}</span>
                </button>
                <button
                  type="button"
                  id="close-exec-report-modal"
                  className="modal-close-btn"
                  aria-label={isEn ? 'Close modal' : 'Cerrar modal'}
                  onClick={() => setReportModalOpen(false)}
                >
                  <span className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="exec-report-sheet" id="printable-executive-sheet">
              <div className="exec-sheet-header">
                <div>
                  <div className="exec-sheet-brand">JF Solar Cloud : Telemetría y Valoración Fotovoltaica</div>
                  <h1 className="exec-sheet-title">{project.name || 'Planta Solar Fotovoltaica'}</h1>
                  <div className="exec-sheet-meta">
                    <span>{project.location || 'Colombia'}</span>
                    <span>/</span>
                    <span className="num">{project.capacity_kw || 0} kWp</span>
                  </div>
                </div>
                <div className="exec-sheet-stamp">
                  <div className="exec-stamp-label">{isEn ? 'Issued Date' : 'Fecha de emisión'}</div>
                  <div className="exec-stamp-val num">2026-11-11</div>
                  <div className="exec-stamp-sub">IEC 61724 Compliant</div>
                </div>
              </div>

              <div className="exec-section-title">
                1. {isEn ? 'Operational telemetry and engineering (IEC 61724)' : 'Telemetría operativa e ingeniería solar (IEC 61724)'}
              </div>
              <div className="exec-kpi-strip">
                <div className="exec-kpi-box">
                  <span className="lbl">{isEn ? 'Period savings' : 'Ahorro del período'}</span>
                  <strong className="val text-solar num">$ 1.450.000</strong>
                </div>
                <div className="exec-kpi-box">
                  <span className="lbl">{isEn ? 'Solar generation' : 'Generación solar'}</span>
                  <strong className="val text-accent num">1.045 kWh</strong>
                </div>
                <div className="exec-kpi-box">
                  <span className="lbl">{isEn ? 'Solar autonomy' : 'Autonomía solar'}</span>
                  <strong className="val num">68.2%</strong>
                </div>
                <div className="exec-kpi-box">
                  <span className="lbl">{isEn ? 'Specific yield (Yf)' : 'Rendimiento (Yf)'}</span>
                  <strong className="val num">132.4 kWh/kWp</strong>
                </div>
              </div>

              <div className="exec-section-title">
                2. {isEn ? 'Capital amortization and 25-year valuation' : 'Amortización de capital y valoración a 25 años'}
              </div>
              <div className="exec-kpi-strip">
                <div className="exec-kpi-box">
                  <span className="lbl">{isEn ? 'Total capex' : 'Inversión capex'}</span>
                  <strong className="val num">$ 24.500.000</strong>
                </div>
                <div className="exec-kpi-box">
                  <span className="lbl">{isEn ? 'Net present value (NPV)' : 'Valor presente neto (VPN)'}</span>
                  <strong className="val text-solar num">$ 52.300.000</strong>
                </div>
                <div className="exec-kpi-box">
                  <span className="lbl">{isEn ? 'Internal rate (IRR)' : 'Tasa interna (TIR)'}</span>
                  <strong className="val text-accent num">28.4%</strong>
                </div>
                <div className="exec-kpi-box">
                  <span className="lbl">{isEn ? 'Levelized cost (LCOE)' : 'Costo nivelado (LCOE)'}</span>
                  <strong className="val num">$ 285 / kWh</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
