/**
 * @module app/dashboardController
 * @description Dashboard KPIs, chart orchestration, audit table binding & reading CRUD modal handlers.
 */

import { state } from "../modules/state.js";
import { t } from "../modules/i18n.js";
import {
  processData,
  filterByYear,
  getAvailableYears,
  getBaseRecord,
  calcKPIs,
  calcProjections,
  detectAnomalies,
} from "../modules/analytics.js";
import { fCOP, fDec, fKwh, fPct, fYield, fHsp, fDailyRate } from "../modules/formatters.js";
import { upsertRecord, batchUpsertRecords, deleteRecord, fetchProjectReadings } from "../modules/supabase.js";
import {
  syncChartTheme,
  renderEnergyChart,
  renderMixChart,
  renderPriceChart,
  renderPerformanceChart,
  renderPaybackChart,
  renderProjectionChart,
  renderSparkline,
  CHART_COLORS,
} from "../modules/charts.js";
import { renderTableRows } from "../views/dashboardView.js";
import { showConfirmModal } from "../components/modal.js";
import { showToast, setText } from "./ui.js";

export async function reloadProjectData() {
  if (!state.activeProject) return;
  const readings = await fetchProjectReadings(state.activeProject.id);
  state.rawData = (readings || []).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if ((a.monthIdx || 0) !== (b.monthIdx || 0)) return (a.monthIdx || 0) - (b.monthIdx || 0);
    return (a.fecha || '').localeCompare(b.fecha || '');
  });
  state.processedData = processData(state.rawData);
}

export function renderDashboardData() {
  const yearSelect = document.getElementById('year-filter');
  const availableYears = getAvailableYears(state.processedData, state.rawData);

  // Ensure selectedYear is valid for the current project's data
  if (
    state.selectedYear !== 'all' &&
    !availableYears.includes(parseInt(state.selectedYear, 10))
  ) {
    state.selectedYear = 'all';
  }

  if (yearSelect) {
    const selectedStr = String(state.selectedYear || 'all');
    yearSelect.innerHTML = [
      `<option value="all" ${selectedStr === 'all' ? 'selected' : ''}>${state.lang === 'en' ? 'All Years' : 'Todos los Años'}</option>`,
      ...availableYears.map(y => `<option value="${y}" ${selectedStr === String(y) ? 'selected' : ''}>${y}</option>`),
    ].join('');
  }

  const year = yearSelect?.value || state.selectedYear || 'all';
  state.viewData = filterByYear(state.processedData, year);

  // Table shows all records when year === 'all', or filtered by year
  const tableData = year === 'all'
    ? [...state.processedData]
    : state.processedData.filter(d => d.year === parseInt(year, 10));

  // Include Initial Base Reading (t0) if viewing 'all' or the year of the base reading
  const baseRec = getBaseRecord(state.rawData);
  const showBaseRec = baseRec && (year === 'all' || baseRec.year === parseInt(year, 10))
    ? baseRec
    : null;

  setText('tab-readings-count', String(state.rawData?.length || 0));

  // Render main & secondary charts
  renderEnergyChart(state.viewData);
  renderMixChart(state.viewData);
  renderPerformanceChart(state.viewData);
  renderPriceChart(state.viewData);
  renderPaybackChart();
  renderProjectionChart();

  // Render KPI Sparklines
  renderSparkline('spark-kpi-ahorro', state.viewData.map(d => d.ahorroReal), CHART_COLORS.solar);
  renderSparkline('spark-kpi-produccion', state.viewData.map(d => d.prodBruta), CHART_COLORS.accent);
  renderSparkline('spark-kpi-autonomia', state.viewData.map(d => d.autonomia), CHART_COLORS.ai);
  renderSparkline('spark-kpi-var-kw', state.viewData.map(d => d.precioKw), CHART_COLORS.warning);

  // Render table
  const tbody = document.getElementById('table-body');
  if (tbody && renderTableRows) {
    tbody.innerHTML = renderTableRows(
      tableData,
      state.isAdmin || state.activeProjectRole === 'admin',
      showBaseRec,
    );
    bindTableEvents(tbody);
  }

  // Update KPIs
  const capacity = state.activeProject?.capacity_kw || 0;
  const kpis = calcKPIs(state.viewData, state.processedData, state.investments, capacity);
  const totalInv = (state.investments || []).reduce((a, i) => a + (parseFloat(i.investment_cop) || 0), 0);

  // Update Solar Engineering Telemetry Banner
  setText('sh-specific-yield', fYield(kpis.specificYield));
  setText('sh-avg-hsp', fHsp(kpis.lastHsp ?? kpis.avgHsp));
  setText('sh-pr-val', kpis.pr > 0 ? `${fDec(kpis.pr, 1)}%` : '—');
  setText('sh-daily-gen', fDailyRate(kpis.avgDailyGen));

  const healthPill = document.getElementById('sh-health-pill');
  const healthText = document.getElementById('sh-health-text');
  if (healthPill) {
    healthPill.className = `health-pill ${kpis.healthScore}`;
  }
  if (healthText) {
    healthText.innerText = kpis.healthLabel;
  }

  // Render Smart Anomaly Alerts
  _renderAnomalyAlerts(detectAnomalies(state.viewData));

  // Update KPI values + MoM Delta pills
  setText('kpi-ahorro', fCOP(kpis.savings));
  setText('kpi-produccion', fKwh(kpis.gen));
  setText('kpi-autonomia', fPct(kpis.autonomy));
  setText('kpi-var-kw', fPct(kpis.varKw));

  _setDeltaBadge('delta-kpi-ahorro', kpis.deltas.savings, false);
  _setDeltaBadge('delta-kpi-produccion', kpis.deltas.gen, false);
  _setDeltaBadge('delta-kpi-autonomia', kpis.deltas.autonomy, false, ' pts');
  _setDeltaBadge('delta-kpi-var-kw', kpis.deltas.price, true);

  const paybackMonths = kpis.avgSavings > 0 ? (totalInv / kpis.avgSavings) : 0;
  const paybackYears = paybackMonths / 12;
  setText('roi-time', paybackYears > 0 ? fDec(paybackYears, 1) : '0');
  setText('roi-avg-savings', fCOP(kpis.avgSavings));
  setText('roi-total-investment', fCOP(totalInv));

  // Update ROI Progress bar & Radial Ring
  const totalSavingsAll = state.processedData.reduce((s, d) => s + (d.ahorroReal || 0), 0);
  const progressPct = totalInv > 0 ? Math.min(100, Math.max(0, (totalSavingsAll / totalInv) * 100)) : 0;
  const progressBarFill = document.getElementById('roi-progress-bar-fill');
  const progressPercentText = document.getElementById('roi-progress-percent');
  if (progressBarFill) progressBarFill.style.width = `${progressPct.toFixed(1)}%`;
  if (progressPercentText) progressPercentText.innerText = `${progressPct.toFixed(1)}% (${fCOP(totalSavingsAll)})`;

  const roiRing = document.getElementById('roi-ring');
  if (roiRing) roiRing.style.setProperty('--p', progressPct.toFixed(1));
  setText('roi-ring-value', `${progressPct.toFixed(0)}%`);
  setText('roi-total-saved-pill', fCOP(totalSavingsAll));

  // Update Econometric Projections & Eco-Metrics (Both ES and EN targets)
  const proj = calcProjections(state.viewData);
  const isEn = state.lang === 'en';
  setText('ai-precio-futuro', fCOP(proj.projectedPrice));
  setText('ai-rango-confianza', `${isEn ? 'Band' : 'Banda'}: ± ${fCOP(proj.confidenceMargin)}`);
  setText('ai-cagr', `CAGR: ${proj.cagrPct > 0 ? '+' : ''}${proj.cagrPct}% ${isEn ? 'yr' : 'anual'}`);
  setText('ai-precio-6m', fCOP(proj.projectedPrice6m));
  setText('ai-ahorro-mes', fCOP(proj.projectedMonthlySavings));
  setText('ai-mejor-mes', proj.bestMonth);
  setText('ai-mejor-mes-en', proj.bestMonth);
  setText('ai-co2', `${proj.co2} kg`);
  setText('ai-co2-en', `${proj.co2} kg`);
  setText('eco-trees', String(proj.trees));
  setText('eco-trees-en', String(proj.trees));

  const modelBadge = document.getElementById('ai-model-badge');
  if (modelBadge) modelBadge.innerText = `R² ${proj.rSquared}% ${isEn ? 'Confidence' : 'Confianza'}`;

  const tEl = document.getElementById('ai-tendencia');
  if (tEl) tEl.innerHTML = `<span class="${proj.trendColor}"><i class="fa-solid ${proj.trendIcon}"></i> ${proj.trend}</span>`;
}

function _setDeltaBadge(elId, val, invertColors = false, suffix = '%') {
  const el = document.getElementById(elId);
  if (!el) return;
  if (val === null || val === undefined || Number.isNaN(val)) {
    el.innerHTML = '';
    return;
  }
  const num = parseFloat(val);
  const isUp = num > 0.05;
  const isDown = num < -0.05;
  const icon = isUp ? 'fa-arrow-trend-up' : isDown ? 'fa-arrow-trend-down' : 'fa-minus';
  let tone = '';
  if (isUp) tone = invertColors ? 'down' : 'up';
  if (isDown) tone = invertColors ? 'up' : 'down';
  const vsText = state.lang === 'en' ? 'MoM' : 'vs ant.';
  el.innerHTML = `
    <span class="delta ${tone}">
      <i class="fa-solid ${icon}"></i> ${num > 0 ? '+' : ''}${fDec(num, 1)}${suffix} ${vsText}
    </span>
  `;
}

function _renderAnomalyAlerts(alerts) {
  const container = document.getElementById('anomaly-alerts-container');
  if (!container) return;
  if (!alerts || alerts.length === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }
  container.classList.remove('hidden');
  container.innerHTML = alerts.map(a => `
    <div class="anomaly-banner ${a.type}">
      <div class="anomaly-icon">
        <i class="fa-solid ${a.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-bolt'}"></i>
      </div>
      <div class="anomaly-content">
        <strong>
          <span class="lang-es">${a.titleEs}</span>
          <span class="lang-en">${a.titleEn}</span>
        </strong>
        <p>
          <span class="lang-es">${a.descEs}</span>
          <span class="lang-en">${a.descEn}</span>
        </p>
      </div>
    </div>
  `).join('');
}

function bindTableEvents(tbody) {
  if (!state.isAdmin && state.activeProjectRole !== 'admin') {
    tbody.querySelectorAll('tr[data-row-id]').forEach(tr => {
      tr.addEventListener('click', () => {
        const det = document.getElementById(`det-${tr.dataset.rowId}`);
        if (det) {
          tr.classList.toggle('expanded');
          det.classList.toggle('hidden');
        }
      });
    });
    return;
  }

  tbody.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openRecordModal('edit', btn.dataset.id);
    }),
  );

  tbody.querySelectorAll('.del-btn').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showConfirmModal({
        titleEs: 'Eliminar Registro Solar',
        titleEn: 'Delete Solar Record',
        messageEs: `¿Confirmas que deseas eliminar el registro de ${btn.dataset.fecha}? Esta acción recalculará los balances del período.`,
        messageEn: `Are you sure you want to delete the record for ${btn.dataset.fecha}? This will recalculate period balances.`,
        confirmBtnEs: 'Eliminar Registro',
        confirmBtnEn: 'Delete Record',
        isDanger: true,
        onConfirm: async () => {
          try {
            await deleteRecord(btn.dataset.id, btn.dataset.fecha);
            await reloadProjectData();
            renderDashboardData();
            showToast(state.lang === 'es' ? 'Registro eliminado exitosamente' : 'Record deleted successfully', 'success');
          } catch (err) {
            showToast(`${t('error')}: ${err.message}`, 'error');
          }
        },
      });
    }),
  );

  tbody.querySelectorAll('tr[data-row-id]').forEach(tr => {
    tr.addEventListener('click', () => {
      const det = document.getElementById(`det-${tr.dataset.rowId}`);
      if (det) {
        tr.classList.toggle('expanded');
        det.classList.toggle('hidden');
      }
    });
  });
}

// ── Segmented Chart Mode Toggle ───────────────────────────────────────────────
export function handleToggleChartMode(chartKey, mode) {
  if (chartKey === 'energia') {
    state.chartModes.energia = mode;
    renderEnergyChart(state.viewData);
    document.querySelectorAll('#control-chart-energia .segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  } else if (chartKey === 'precio') {
    state.chartModes.precio = mode;
    renderPriceChart(state.viewData);
    document.querySelectorAll('#control-chart-precio .segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }
}

export async function handleImportCsv(records) {
  if (!records || records.length === 0) return;
  try {
    showToast(state.lang === 'es' ? `Importando ${records.length} registros...` : `Importing ${records.length} records...`, 'info');
    const count = await batchUpsertRecords(records);
    await reloadProjectData();
    renderDashboardData();
    showToast(
      state.lang === 'es'
        ? `${count} registros importados exitosamente`
        : `${count} records imported successfully`,
      'success',
    );
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
}

export function openRecordModal(action = 'new', id = null) {
  const modal = document.getElementById('add-record-modal');
  if (!modal) return;
  document.getElementById('add-record-form')?.reset();
  const editId = document.getElementById('edit-id');
  if (editId) editId.value = '';

  const esTitle = document.getElementById('modal-title-es');
  const enTitle = document.getElementById('modal-title-en');

  if (action === 'new') {
    if (esTitle) esTitle.innerText = 'Nuevo Registro Cloud';
    if (enTitle) enTitle.innerText = 'New Cloud Record';
    const now = new Date();
    const f = document.getElementById('new-fecha');
    if (f) f.value = now.toISOString().slice(0, 10);
  } else if (action === 'edit' && id) {
    if (esTitle) esTitle.innerText = 'Editar Registro Cloud';
    if (enTitle) enTitle.innerText = 'Edit Cloud Record';
    const rec = state.rawData.find(d => d.id === id);
    if (rec && editId) {
      editId.value = rec.id;
      const f = document.getElementById('new-fecha'); if (f) f.value = rec.fecha;
      const lr = document.getElementById('new-lectura-red'); if (lr) lr.value = rec.lecturaRed ?? rec.medidorRed ?? 0;
      const ls = document.getElementById('new-lectura-solar'); if (ls) ls.value = rec.lecturaSolar ?? rec.inversores ?? 0;
      const p = document.getElementById('new-precio'); if (p) p.value = rec.precioKw || 0;
      const reset = document.getElementById('new-inverter-reset'); if (reset) reset.checked = !!rec.inverter_reset;
      const mreset = document.getElementById('new-meter-reset'); if (mreset) mreset.checked = !!rec.meter_reset;
    }
  }

  document.getElementById('new-lectura-red')?.dispatchEvent(new Event('input'));
  modal.classList.remove('hidden');
}

export async function handleSaveRecord(dataOrEvent) {
  if (dataOrEvent && typeof dataOrEvent.preventDefault === 'function') {
    dataOrEvent.preventDefault();
  }

  const editId = document.getElementById('edit-id')?.value;
  const fecha = document.getElementById('new-fecha')?.value;
  if (!fecha) return;
  const [year, month, day] = fecha.split('-');
  const projPrefix = state.activeProject?.id ? `${state.activeProject.id.slice(0, 8)}_` : '';

  const rec = {
    id: editId || `${projPrefix}${year}-${month}-${day || '01'}`,
    year: parseInt(year, 10),
    monthIdx: parseInt(month, 10),
    fecha,
    lecturaRed: parseFloat(document.getElementById('new-lectura-red')?.value) || 0,
    lecturaSolar: parseFloat(document.getElementById('new-lectura-solar')?.value) || 0,
    precioKw: parseFloat(document.getElementById('new-precio')?.value) || 0,
    project_id: state.activeProject?.id || null,
    inverter_reset: document.getElementById('new-inverter-reset')?.checked || false,
    meter_reset: document.getElementById('new-meter-reset')?.checked || false,
  };

  const btn = document.getElementById('btn-save');
  const orig = btn?.innerHTML;
  if (btn) { btn.innerHTML = `<i class="fa-solid fa-circle-notch spin"></i> ${t('saving')}`; btn.disabled = true; }

  try {
    const result = await upsertRecord(rec);
    if (!result) throw new Error('Error al guardar registro en la BD.');
    document.getElementById('add-record-modal')?.classList.add('hidden');
    await reloadProjectData();
    renderDashboardData();
    showToast(state.lang === 'es' ? 'Registro guardado exitosamente' : 'Record saved successfully', 'success');
  } catch (err) {
    showToast(`${t('error')}: ${err.message}`, 'error');
  }
  if (btn) { btn.innerHTML = orig; btn.disabled = false; }
}

export async function handleDeleteRecord(id, fecha) {
  showConfirmModal({
    titleEs: 'Eliminar Registro',
    titleEn: 'Delete Record',
    messageEs: `¿Estás seguro de eliminar el registro de ${fecha}?`,
    messageEn: `Are you sure you want to delete the record for ${fecha}?`,
    confirmBtnEs: 'Eliminar',
    confirmBtnEn: 'Delete',
    isDanger: true,
    onConfirm: async () => {
      try {
        const ok = await deleteRecord(id, fecha);
        if (!ok) throw new Error('Error al eliminar registro en la BD.');
        await reloadProjectData();
        renderDashboardData();
        showToast(state.lang === 'es' ? 'Registro eliminado' : 'Record deleted', 'success');
      } catch (err) {
        showToast(`${t('error')}: ${err.message}`, 'error');
      }
    },
  });
}
