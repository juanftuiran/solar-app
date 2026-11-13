/**
 * @module dashboard/executiveReport
 * @description Printable PDF/Executive plant engineering & valuation report sheet.
 */

import { state } from "../../modules/state.js";
import { fCOP, fDec, fKwh, fPct, fYield, fHsp } from "../../modules/formatters.js";
import { calcFinancialSimulation, calcKPIs, calcProjections } from "../../modules/analytics.js";
import { escapeHTML } from "../../modules/utils.js";

export function renderExecutiveReportModal() { return _renderExecutiveReportModal(); }

function _renderExecutiveReportModal() {
  return `
    <div id="exec-report-modal" class="modal-overlay hidden">
      <div class="modal-box exec-report-modal-box">
        <div class="modal-header no-print">
          <h2 class="modal-title">
            <div class="icon-tile sm solar"><i class="fa-solid fa-file-pdf"></i></div>
            <div>
              <span class="lang-es">Informe Ejecutivo de Planta Solar</span>
              <span class="lang-en">Solar Plant Executive Report</span>
            </div>
          </h2>
          <div style="display:flex;align-items:center;gap:.5rem;">
            <button id="btn-print-exec-report" type="button" class="btn btn-solar btn-sm">
              <i class="fa-solid fa-print"></i>
              <span class="lang-es">Imprimir / Guardar PDF</span>
              <span class="lang-en">Print / Save PDF</span>
            </button>
            <button id="close-exec-report-modal" class="modal-close-btn" type="button" aria-label="Close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div id="exec-report-content"></div>
      </div>
    </div>
  `;
}

export function openExecutiveReportModal() {
  const modal = document.getElementById('exec-report-modal');
  const body = document.getElementById('exec-report-content');
  if (!modal || !body) return;

  const project = state.activeProject || {};
  const capacity = parseFloat(project.capacity_kw) || 0;
  const kpis = calcKPIs(state.viewData, state.processedData, state.investments, capacity);
  const proj = calcProjections(state.viewData);
  const sim = calcFinancialSimulation(state.processedData, state.investments, state.simParams);
  const totalInv = sim.totalInvestment;
  const totalSavedAll = state.processedData.reduce((s, d) => s + (d.ahorroReal || 0), 0);
  const progressPct = totalInv > 0 ? Math.min(100, (totalSavedAll / totalInv) * 100) : 0;
  const nowStr = new Date().toLocaleDateString(state.lang === 'en' ? 'en-US' : 'es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const recentRows = [...state.viewData].slice(-12).reverse();

  body.innerHTML = `
    <div class="exec-report-sheet" id="printable-executive-sheet">
      <!-- Report Institutional Header -->
      <div class="exec-sheet-header">
        <div>
          <div class="exec-sheet-brand">JF Solar Cloud / Telemetría y Valoración Fotovoltaica</div>
          <h1 class="exec-sheet-title">${escapeHTML(project.name || 'Planta Solar Fotovoltaica')}</h1>
          <div class="exec-sheet-meta">
            <span><i class="fa-solid fa-location-dot"></i> ${escapeHTML(project.location || 'Colombia')}</span>
            <span>/</span>
            <span><i class="fa-solid fa-bolt"></i> ${fDec(capacity, 1)} kWp (${project.panel_count || 0} paneles)</span>
            ${project.inverter_model ? `<span>/</span><span><i class="fa-solid fa-microchip"></i> ${escapeHTML(project.inverter_model)}</span>` : ''}
          </div>
        </div>
        <div class="exec-sheet-stamp">
          <div class="exec-stamp-label">${state.lang === 'en' ? 'Issued Date' : 'Fecha de emisión'}</div>
          <div class="exec-stamp-val">${nowStr}</div>
          <div class="exec-stamp-sub">IEC 61724 Compliant</div>
        </div>
      </div>

      <!-- Section 1: Operational & Engineering Summary -->
      <div class="exec-section-title">1. ${state.lang === 'en' ? 'Operational Telemetry & Engineering (IEC 61724)' : 'Telemetría Operativa e Ingeniería Solar (IEC 61724)'}</div>
      <div class="exec-kpi-strip">
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Period Savings' : 'Ahorro del Período'}</span>
          <strong class="val text-solar">${fCOP(kpis.savings)}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Solar Generation' : 'Generación Solar'}</span>
          <strong class="val text-accent">${fKwh(kpis.gen)}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Solar Autonomy' : 'Autonomía Solar'}</span>
          <strong class="val">${fPct(kpis.autonomy)}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Specific Yield (Yf)' : 'Rendimiento (Yf)'}</span>
          <strong class="val">${fYield(kpis.specificYield)}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Peak Sun Hours' : 'Horas Sol Pico (HSP)'}</span>
          <strong class="val">${fHsp(kpis.lastHsp)} (${fDec(kpis.pr, 0)}% PR)</strong>
        </div>
      </div>

      <!-- Section 2: Financial Valuation & 25-Year Projection -->
      <div class="exec-section-title">2. ${state.lang === 'en' ? 'Capital Amortization & 25-Year Valuation' : 'Amortización de Capital y Valoración Financiera (25 Años)'}</div>
      <div class="exec-kpi-strip">
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Invested CAPEX' : 'Inversión CAPEX'}</span>
          <strong class="val">${fCOP(totalInv)}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Cumulative Recovered' : 'Recuperado a la Fecha'}</span>
          <strong class="val text-solar">${fCOP(totalSavedAll)} (${fDec(progressPct, 1)}%)</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Net Present Value (NPV)' : 'Valor Presente Neto (VPN)'}</span>
          <strong class="val text-solar">${totalInv > 0 ? fCOP(sim.npv) : '—'}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Internal Rate (IRR / TIR)' : 'Tasa Interna (TIR / IRR)'}</span>
          <strong class="val text-accent">${sim.irr !== null ? `${fDec(sim.irr, 1)}%` : '—'}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Levelized Cost (LCOE)' : 'Costo Nivelado (LCOE)'}</span>
          <strong class="val">${sim.lcoe > 0 ? `${fCOP(sim.lcoe)}/kWh` : '—'}</strong>
        </div>
      </div>

      <!-- Section 3: Environmental Impact & Econometric Forecast -->
      <div class="exec-section-title">3. ${state.lang === 'en' ? 'Environmental Impact & Tariff Forecast (WLS)' : 'Mitigación Ambiental y Pronóstico Tarifario (WLS)'}</div>
      <div class="exec-kpi-strip">
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Avoided Carbon (CO₂)' : 'Huella CO₂ Evitada'}</span>
          <strong class="val text-solar">${proj.co2} kg CO₂</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Equivalent Trees' : 'Árboles Equivalentes'}</span>
          <strong class="val text-solar">${proj.trees} ${state.lang === 'en' ? 'trees' : 'árboles'}</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? 'Next Month Est. Tariff' : 'Tarifa Est. Próx. Mes'}</span>
          <strong class="val">${fCOP(proj.projectedPrice)}/kWh (±${fCOP(proj.confidenceMargin)})</strong>
        </div>
        <div class="exec-kpi-box">
          <span class="lbl">${state.lang === 'en' ? '25-Yr Cumulative Savings' : 'Ahorro Proyectado 25A'}</span>
          <strong class="val text-solar">${fCOP(sim.finalCum)}</strong>
        </div>
      </div>

      <!-- Section 4: Recent Billing Cycles Table -->
      <div class="exec-section-title">4. ${state.lang === 'en' ? 'Recent Cloud Billing Cycles (Last 12 Records)' : ' Desglose de Ciclos Recientes (Últimos 12 Registros)'}</div>
      <table class="exec-table">
        <thead>
          <tr>
            <th>${state.lang === 'en' ? 'Period / Date' : 'Período / Fecha'}</th>
            <th class="text-right">${state.lang === 'en' ? 'Grid (kWh)' : 'Consumo Red'}</th>
            <th class="text-right">${state.lang === 'en' ? 'Solar (kWh)' : 'Gen. Solar'}</th>
            <th class="text-right">${state.lang === 'en' ? 'Autonomy' : 'Autonomía'}</th>
            <th class="text-right">HSP</th>
            <th class="text-right">${state.lang === 'en' ? 'Tariff' : 'Tarifa kW'}</th>
            <th class="text-right">${state.lang === 'en' ? 'Net Savings' : 'Ahorro Real'}</th>
          </tr>
        </thead>
        <tbody>
          ${recentRows.map(r => `
            <tr>
              <td><strong>${r.label}</strong> <span style="opacity:.65;font-size:.75rem;">(${r.fecha})</span></td>
              <td class="text-right">${fDec(r.consumoRed, 1)} kWh</td>
              <td class="text-right">${fDec(r.prodBruta, 1)} kWh</td>
              <td class="text-right">${fDec(r.autonomia, 1)}%</td>
              <td class="text-right">${fDec(r.hsp, 2)}</td>
              <td class="text-right">${fCOP(r.precioKw)}</td>
              <td class="text-right"><strong>${fCOP(r.ahorroReal)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  modal.classList.remove('hidden');

  document.getElementById('close-exec-report-modal')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  document.getElementById('btn-print-exec-report')?.addEventListener('click', () => {
    window.print();
  });
}
