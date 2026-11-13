/**
 * @module dashboard/financeTab
 * @description ROI amortization panel, econometric tariff forecasting & 25-year DCF simulator.
 */

import { state, savePrefs } from "../../modules/state.js";
import { fCOP, fDec } from "../../modules/formatters.js";

export function renderROIPanel(totalInvestment) { return _renderROIPanel(totalInvestment); }
export function renderAIPanel() { return _renderAIPanel(); }
export function renderProjectionSection() { return _renderProjectionSection(); }
export function bindFinancialSimulator(onSimChange) { return _bindFinancialSimulator(onSimChange); }

function _renderROIPanel(totalInvestment) {
  return `
    <div class="card roi-panel">
      <div class="section-head" style="margin-bottom:1.25rem;">
        <div class="section-head-title">
          <div class="icon-tile accent"><i class="fa-solid fa-chart-pie"></i></div>
          <div>
            <h3>
              <span class="lang-es">Retorno de Inversión & Amortización</span>
              <span class="lang-en">Return on Investment & Payback</span>
            </h3>
            <p>
              <span class="lang-es">Cálculo dinámico basado en generación solar real vs tarifas de red</span>
              <span class="lang-en">Dynamically calculated from real solar production vs grid tariffs</span>
            </p>
          </div>
        </div>
        <span class="meta-chip accent">
          <i class="fa-solid fa-shield-check"></i>
          <span class="lang-es">Amortización Activa</span>
          <span class="lang-en">Active Payback</span>
        </span>
      </div>

      <div class="roi-body">
        <!-- Radial Gauge Indicator -->
        <div class="roi-ring" id="roi-ring" style="--p: 0;">
          <div class="roi-ring-inner">
            <span class="roi-ring-value" id="roi-ring-value">0%</span>
            <span class="roi-ring-label">
              <span class="lang-es">Amortizado</span>
              <span class="lang-en">Amortized</span>
            </span>
          </div>
        </div>

        <!-- Payback Progress Bar Container -->
        <div class="payback-bar-container">
          <div class="payback-bar-header">
            <span class="lbl">
              <span class="lang-es">Progreso de Amortización</span>
              <span class="lang-en">Payback Progress</span>
            </span>
            <span id="roi-progress-percent" style="font-weight:800;color:var(--solar);" class="tabular-nums">0%</span>
          </div>
          <div class="payback-bar-track">
            <div id="roi-progress-bar-fill" class="payback-bar-fill" style="width:0%;"></div>
          </div>

          <div class="payback-stats-grid">
            <div class="payback-stat-col">
              <span class="payback-stat-lbl">
                <span class="lang-es">Inversión Total</span><span class="lang-en">Total Invested</span>
              </span>
              <span class="payback-stat-val text-accent" id="roi-total-investment">
                ${fCOP(totalInvestment)}
              </span>
            </div>

            <div class="payback-stat-col">
              <span class="payback-stat-lbl">
                <span class="lang-es">Ahorro Mensual Prom.</span><span class="lang-en">Avg Monthly Savings</span>
              </span>
              <span class="payback-stat-val text-solar" id="roi-avg-savings">--</span>
            </div>

            <div class="payback-stat-col">
              <span class="payback-stat-lbl">
                <span class="lang-es">Tiempo Estimado</span><span class="lang-en">Est. Payback Time</span>
              </span>
              <span class="payback-stat-val text-strong">
                <span id="roi-time">--</span>
                <span style="font-size:.7rem;color:var(--muted-light);font-weight:600;">
                  <span class="lang-es">Años</span><span class="lang-en">Yrs</span>
                </span>
              </span>
            </div>

            <div class="payback-stat-col">
              <span class="payback-stat-lbl">
                <span class="lang-es">Ahorro Acumulado</span><span class="lang-en">Total Saved</span>
              </span>
              <span class="payback-stat-val text-solar" id="roi-total-saved-pill">--</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Interactive Payback curve chart -->
      <div class="roi-chart-head">
        <h4>
          <i class="fa-solid fa-chart-line" style="color:var(--solar);"></i>
          <span class="lang-es">Curva Histórica de Amortización vs Capital Invertido</span>
          <span class="lang-en">Historical Payback Curve vs Invested Capital</span>
        </h4>
        <span class="stat-tile-sub">
          <span class="lang-es">Punto de corte = Recuperación completa</span>
          <span class="lang-en">Intersection = 100% Breakeven</span>
        </span>
      </div>
      <div class="chart-container short">
        <canvas id="chart-payback"></canvas>
      </div>
    </div>
  `;
}

function _renderAIPanel() {
  return `
    <div class="ai-panel">
      <div class="ai-inner">
        <div class="ai-header">
          <div style="display:flex;align-items:center;gap:.65rem;">
            <div class="icon-tile ai"><i class="fa-solid fa-brain"></i></div>
            <div>
              <h3 style="font-size:.95rem;font-weight:800;color:var(--text-strong);">
                <span class="lang-es">Pronóstico Econométrico & Analítica Tarifaria</span>
                <span class="lang-en">Econometric Forecasting & Tariff Intelligence</span>
              </h3>
              <p style="font-size:.74rem;color:var(--muted-light);">
                <span class="lang-es">Modelo ponderado WLS + regresión exponencial con banda de confianza 90%</span>
                <span class="lang-en">Weighted WLS model + exponential regression with 90% confidence band</span>
              </p>
            </div>
          </div>
          <span class="ai-badge" id="ai-model-badge">R² 92%</span>
        </div>

        <div class="ai-grid">
          <!-- Future price (t+1) -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Tarifa Estimada Próx. Mes</span>
              <span class="lang-en">Next Month Est. Tariff</span>
            </span>
            <span id="ai-precio-futuro" class="ai-item-val text-ai">--</span>
            <span class="ai-item-sub" id="ai-rango-confianza">Banda: ± $0 COP</span>
          </div>

          <!-- Trend & CAGR -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Tendencia & Inflación (CAGR)</span>
              <span class="lang-en">Trend & Inflation (CAGR)</span>
            </span>
            <span id="ai-tendencia" class="ai-item-val">--</span>
            <span class="ai-item-sub" id="ai-cagr">CAGR: +0.0% anual</span>
          </div>

          <!-- 6-Month Horizon -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Proyección a 6 Meses</span>
              <span class="lang-en">6-Month Forecast</span>
            </span>
            <span id="ai-precio-6m" class="ai-item-val text-strong">--</span>
            <span class="ai-item-sub">
              <span class="lang-es">Horizonte medio plazo</span><span class="lang-en">Mid-term horizon</span>
            </span>
          </div>

          <!-- Estimated Monthly Savings -->
          <div class="ai-item">
            <span class="ai-item-lbl">
              <span class="lang-es">Ahorro Estimado Próx. Mes</span>
              <span class="lang-en">Est. Next Month Savings</span>
            </span>
            <span id="ai-ahorro-mes" class="ai-item-val text-solar">--</span>
            <span class="ai-item-sub">
              <span class="lang-es">Basado en producción esperada</span><span class="lang-en">Based on expected generation</span>
            </span>
          </div>
        </div>

        <!-- Eco & Peak Generation Banner -->
        <div class="eco-banner">
          <div class="eco-chips">
            <span class="eco-chip">
              <i class="fa-solid fa-sun text-warning"></i>
              <span class="lang-es">Pico Histórico: <strong id="ai-mejor-mes">--</strong></span>
              <span class="lang-en">Peak Gen Month: <strong id="ai-mejor-mes-en">--</strong></span>
            </span>
            <span class="eco-chip">
              <i class="fa-solid fa-leaf text-solar"></i>
              <span class="lang-es">CO₂ Evitado: <strong id="ai-co2">-- kg</strong></span>
              <span class="lang-en">Avoided CO₂: <strong id="ai-co2-en">-- kg</strong></span>
            </span>
            <span class="eco-chip">
              <i class="fa-solid fa-tree text-solar"></i>
              <span class="lang-es">Eq. <strong id="eco-trees">--</strong> árboles plantados</span>
              <span class="lang-en">Eq. <strong id="eco-trees-en">--</strong> trees planted</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}


function _renderProjectionSection() {
  const sim = state.simParams || { inflation: 4.0, degradation: 0.4, discountRate: 8.0 };

  return `
    <div class="card" style="overflow:hidden;">
      <div style="padding:1.5rem;">
        <div class="section-head" style="margin-bottom:1rem;">
          <div class="section-head-title">
            <div class="icon-tile ai"><i class="fa-solid fa-sliders"></i></div>
            <div>
              <h3>
                <span class="lang-es">Simulador Financiero Interactivo & Proyección a 25 Años</span>
                <span class="lang-en">Interactive Financial Simulator & 25-Year Projection</span>
              </h3>
              <p>
                <span class="lang-es">Modelado de flujo de caja descontado (VPN / TIR / LCOE) con degradación e inflación dinámicas</span>
                <span class="lang-en">Discounted cashflow valuation (NPV / IRR / LCOE) with dynamic degradation & inflation</span>
              </p>
            </div>
          </div>
          <div class="assumption-chips">
            <span class="meta-chip" id="sim-chip-deg"><i class="fa-solid fa-arrow-trend-down"></i> Deg: ${fDec(sim.degradation, 2)}%/año</span>
            <span class="meta-chip warning" id="sim-chip-inf"><i class="fa-solid fa-arrow-trend-up"></i> Inf: ${fDec(sim.inflation, 1)}%/año</span>
            <span class="meta-chip accent" id="sim-chip-wacc"><i class="fa-solid fa-percent"></i> WACC: ${fDec(sim.discountRate, 1)}%</span>
          </div>
        </div>

        <!-- Interactive Simulator Controls -->
        <div class="sim-controls-panel">
          <div class="sim-control-item">
            <div class="sim-control-head">
              <label for="sim-slider-inflation">
                <i class="fa-solid fa-arrow-trend-up text-warning"></i>
                <span class="lang-es">Inflación Tarifaria Anual</span>
                <span class="lang-en">Annual Tariff Inflation</span>
              </label>
              <strong id="sim-val-inflation" class="text-warning">${fDec(sim.inflation, 1)}%</strong>
            </div>
            <input type="range" id="sim-slider-inflation" min="0" max="15" step="0.5" value="${sim.inflation}" class="sim-slider warning">
          </div>

          <div class="sim-control-item">
            <div class="sim-control-head">
              <label for="sim-slider-degradation">
                <i class="fa-solid fa-solar-panel text-solar"></i>
                <span class="lang-es">Degradación Anual Paneles</span>
                <span class="lang-en">Annual Panel Degradation</span>
              </label>
              <strong id="sim-val-degradation" class="text-solar">${fDec(sim.degradation, 2)}%</strong>
            </div>
            <input type="range" id="sim-slider-degradation" min="0.1" max="1.5" step="0.05" value="${sim.degradation}" class="sim-slider solar">
          </div>

          <div class="sim-control-item">
            <div class="sim-control-head">
              <label for="sim-slider-wacc">
                <i class="fa-solid fa-landmark text-accent"></i>
                <span class="lang-es">Tasa de Descuento (WACC)</span>
                <span class="lang-en">Discount Rate (WACC)</span>
              </label>
              <strong id="sim-val-wacc" class="text-accent">${fDec(sim.discountRate, 1)}%</strong>
            </div>
            <input type="range" id="sim-slider-wacc" min="2" max="20" step="0.5" value="${sim.discountRate}" class="sim-slider accent">
          </div>

          <div class="sim-control-reset">
            <button type="button" id="btn-reset-sim" class="btn btn-ghost btn-xs" title="Restaurar parámetros base">
              <i class="fa-solid fa-rotate-left"></i>
              <span class="lang-es"> Base</span><span class="lang-en"> Reset</span>
            </button>
          </div>
        </div>

        <!-- Summary KPI tiles (Institutional Valuation) -->
        <div class="proj-summary">
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Ahorro Bruto 25 Años</span><span class="lang-en">25-Yr Gross Savings</span></span>
            <span class="stat-tile-val text-solar" id="proj-total-savings">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Flujo acumulado</span><span class="lang-en">Cumulative cashflow</span></span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Valor Presente Neto (VPN)</span><span class="lang-en">Net Present Value (NPV)</span></span>
            <span class="stat-tile-val text-solar" id="proj-npv">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Descontado al WACC</span><span class="lang-en">Discounted at WACC</span></span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Tasa Interna (TIR / IRR)</span><span class="lang-en">Internal Rate (IRR)</span></span>
            <span class="stat-tile-val text-accent" id="proj-irr">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Rentabilidad efectiva anual</span><span class="lang-en">Effective annual return</span></span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Punto de Equilibrio</span><span class="lang-en">Breakeven Year</span></span>
            <span class="stat-tile-val text-warning" id="proj-breakeven">--</span>
            <span class="stat-tile-sub" id="proj-breakeven-sub">--</span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">ROI Proyectado 25A</span><span class="lang-en">Projected 25Y ROI</span></span>
            <span class="stat-tile-val text-solar" id="proj-roi">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Múltiplo sobre CAPEX</span><span class="lang-en">Return on total CAPEX</span></span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Costo Nivelado (LCOE)</span><span class="lang-en">Levelized Cost (LCOE)</span></span>
            <span class="stat-tile-val text-strong" id="proj-lcoe">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Costo solar por kWh</span><span class="lang-en">Solar cost per kWh</span></span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile-lbl"><span class="lang-es">Generación 25A</span><span class="lang-en">25-Yr Total Gen</span></span>
            <span class="stat-tile-val text-ai" id="proj-total-gen">--</span>
            <span class="stat-tile-sub"><span class="lang-es">Energía limpia total</span><span class="lang-en">Clean energy lifetime</span></span>
          </div>
        </div>

        <div class="chart-container tall">
          <canvas id="chart-proyeccion"></canvas>
        </div>
      </div>

      <!-- Collapsible projection table -->
      <button id="projection-table-toggle" class="collapse-toggle" type="button">
        <span class="row">
          <i class="fa-solid fa-table"></i>
          <span class="lang-es">Ver flujo de caja detallado año por año (25 años)</span>
          <span class="lang-en">View detailed 25-year annual cashflow breakdown</span>
        </span>
        <i id="projection-toggle-icon" class="fa-solid fa-chevron-down"></i>
      </button>
      <div id="projection-table-body" class="hidden">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th><span class="lang-es">Año</span><span class="lang-en">Year</span></th>
                <th class="text-right"><span class="lang-es">Generación (kWh)</span><span class="lang-en">Generation</span></th>
                <th class="text-right"><span class="lang-es">Ahorro Anual</span><span class="lang-en">Annual Savings</span></th>
                <th class="text-right"><span class="lang-es">Ahorro Acumulado</span><span class="lang-en">Cumulated</span></th>
                <th class="text-right"><span class="lang-es">Inversión Total</span><span class="lang-en">Total Invested</span></th>
                <th class="text-right"><span class="lang-es">Balance Neto</span><span class="lang-en">Net Balance</span></th>
              </tr>
            </thead>
            <tbody id="tabla-proyeccion-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}


function _bindFinancialSimulator(onSimChange) {
  const infSlider = document.getElementById('sim-slider-inflation');
  const degSlider = document.getElementById('sim-slider-degradation');
  const waccSlider = document.getElementById('sim-slider-wacc');
  const resetBtn = document.getElementById('btn-reset-sim');

  const handleSliderInput = () => {
    state.simParams.inflation = parseFloat(infSlider?.value) || 4.0;
    state.simParams.degradation = parseFloat(degSlider?.value) || 0.4;
    state.simParams.discountRate = parseFloat(waccSlider?.value) || 8.0;
    savePrefs();
    if (typeof onSimChange === 'function') {
      onSimChange();
    }
  };

  [infSlider, degSlider, waccSlider].forEach(slider => {
    slider?.addEventListener('input', handleSliderInput);
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.simParams.inflation = 4.0;
      state.simParams.degradation = 0.4;
      state.simParams.discountRate = 8.0;
      if (infSlider) infSlider.value = '4.0';
      if (degSlider) degSlider.value = '0.4';
      if (waccSlider) waccSlider.value = '8.0';
      savePrefs();
      if (typeof onSimChange === 'function') {
        onSimChange();
      }
    });
  }
}
