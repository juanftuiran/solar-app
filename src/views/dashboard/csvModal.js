/**
 * @module dashboard/csvModal
 * @description Batch CSV readings importer modal, parser, preview table & template generator.
 */

import { state } from "../../modules/state.js";
import { fCOP, fDec } from "../../modules/formatters.js";

export function renderCsvImportModal() { return _renderCsvImportModal(); }
export function bindCsvImporter(onImportCsv) { return _bindCsvImporter(onImportCsv); }

function _renderCsvImportModal() {
  return `
    <div id="csv-import-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:34rem;">
        <div class="modal-header">
          <h2 class="modal-title">
            <div class="icon-tile sm solar"><i class="fa-solid fa-file-csv"></i></div>
            <div>
              <span class="lang-es">Importar Historial desde CSV</span>
              <span class="lang-en">Import Readings from CSV</span>
            </div>
          </h2>
          <button id="close-csv-modal" class="modal-close-btn" type="button" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="form-stack">
          <p style="font-size:.82rem;color:var(--text-secondary);line-height:1.5;">
            <span class="lang-es">Carga un archivo CSV con columnas de <strong>Fecha (YYYY-MM-DD)</strong>, <strong>Lectura Red</strong>, <strong>Lectura Solar</strong> y <strong>Tarifa kW</strong>.</span>
            <span class="lang-en">Upload a CSV file containing <strong>Date (YYYY-MM-DD)</strong>, <strong>Grid Reading</strong>, <strong>Solar Reading</strong>, and <strong>kW Tariff</strong>.</span>
          </p>

          <div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap;">
            <button type="button" id="btn-download-csv-template" class="btn btn-ghost btn-sm">
              <i class="fa-solid fa-download text-accent"></i>
              <span class="lang-es">Descargar Plantilla CSV</span>
              <span class="lang-en">Download CSV Template</span>
            </button>
          </div>

          <label class="csv-dropzone" for="csv-file-input">
            <i class="fa-solid fa-cloud-arrow-up text-solar" style="font-size:1.6rem;"></i>
            <div>
              <strong style="display:block;color:var(--text-strong);font-size:.88rem;">
                <span class="lang-es">Seleccionar archivo .CSV</span>
                <span class="lang-en">Choose .CSV file</span>
              </strong>
              <span style="font-size:var(--text-xs);color:var(--muted-light);">Codificación UTF-8, delimitado por comas</span>
            </div>
            <input type="file" id="csv-file-input" accept=".csv,text/csv" style="display:none;">
          </label>

          <div id="csv-preview-wrap" class="hidden" style="display:flex;flex-direction:column;gap:.6rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:.78rem;">
              <span class="text-secondary"><span class="lang-es">Registros detectados:</span><span class="lang-en">Detected records:</span></span>
              <span class="count-pill" id="csv-preview-count">0</span>
            </div>
            <div class="table-scroll" style="max-height:180px;border:1px solid var(--border);border-radius:var(--radius-sm);">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th class="text-right">Red</th>
                    <th class="text-right">Solar</th>
                    <th class="text-right">Tarifa</th>
                  </tr>
                </thead>
                <tbody id="csv-preview-tbody"></tbody>
              </table>
            </div>
          </div>

          <button type="button" id="btn-confirm-csv-import" class="btn btn-solar btn-lg btn-block" disabled>
            <i class="fa-solid fa-database"></i>
            <span class="lang-es">Importar y Sincronizar con la Nube</span>
            <span class="lang-en">Import & Sync to Cloud</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

let _parsedCsvRecords = [];

function _bindCsvImporter(onImportCsv) {
  const openBtn = document.getElementById('btn-import-csv');
  const closeBtn = document.getElementById('close-csv-modal');
  const modal = document.getElementById('csv-import-modal');
  const fileInput = document.getElementById('csv-file-input');
  const templateBtn = document.getElementById('btn-download-csv-template');
  const confirmBtn = document.getElementById('btn-confirm-csv-import');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      _parsedCsvRecords = [];
      if (fileInput) fileInput.value = '';
      const previewWrap = document.getElementById('csv-preview-wrap');
      if (previewWrap) previewWrap.classList.add('hidden');
      if (confirmBtn) confirmBtn.disabled = true;
      modal.classList.remove('hidden');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'csv-import-modal') modal.classList.add('hidden');
    });
  }

  if (templateBtn) {
    templateBtn.addEventListener('click', () => {
      const sample = [
        'Fecha,Lectura Red (Medidor),Lectura Solar (Inversor),Tarifa kW (COP),Reinicio Inversor,Reinicio Medidor Red',
        '2025-01-15,12000,4500,890,NO,NO',
        '2025-02-15,12180,4820,905,NO,NO',
        '2025-03-15,12350,5190,912,NO,NO',
      ].join('\n');
      const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_lecturas_jf_solar.csv';
      a.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = String(ev.target?.result || '');
        _parsedCsvRecords = _parseCsvContent(text);
        _renderCsvPreview(_parsedCsvRecords);
      };
      reader.readAsText(file, 'UTF-8');
    });
  }

  if (confirmBtn && typeof onImportCsv === 'function') {
    confirmBtn.addEventListener('click', async () => {
      if (!_parsedCsvRecords.length) return;
      confirmBtn.disabled = true;
      await onImportCsv(_parsedCsvRecords);
      modal?.classList.add('hidden');
    });
  }
}

function _parseCsvContent(text) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const splitLine = (line) =>
    line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim());

  const headers = splitLine(lines[0]).map(h => h.toLowerCase());
  const idxFecha = headers.findIndex(h => h.includes('fecha') || h.includes('date'));
  const idxRed = headers.findIndex(h => h.includes('lectura red') || h.includes('medidor') || h.includes('grid'));
  const idxSolar = headers.findIndex(h => h.includes('lectura solar') || h.includes('inversor') || h.includes('solar'));
  const idxPrecio = headers.findIndex(h => h.includes('tarifa') || h.includes('precio') || h.includes('cost') || h.includes('price'));
  const idxInvReset = headers.findIndex(h => h.includes('reinicio inversor') || h.includes('inverter reset'));
  const idxMetReset = headers.findIndex(h => h.includes('reinicio medidor') || h.includes('meter reset'));

  const records = [];
  const projPrefix = state.activeProject?.id ? `${state.activeProject.id.slice(0, 8)}_` : '';

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const fecha = cols[idxFecha >= 0 ? idxFecha : 0];
    if (!fecha || !/^\d{4}-\d{2}(-\d{2})?$/.test(fecha)) continue;

    const normalizedFecha = fecha.length === 7 ? `${fecha}-01` : fecha;
    const [y, m, d] = normalizedFecha.split('-');
    const lecturaRed = parseFloat(cols[idxRed >= 0 ? idxRed : 1]) || 0;
    const lecturaSolar = parseFloat(cols[idxSolar >= 0 ? idxSolar : 2]) || 0;
    const precioKw = parseFloat(cols[idxPrecio >= 0 ? idxPrecio : 3]) || 0;
    const invResetVal = idxInvReset >= 0 ? (cols[idxInvReset] || '').toUpperCase() : 'NO';
    const metResetVal = idxMetReset >= 0 ? (cols[idxMetReset] || '').toUpperCase() : 'NO';

    records.push({
      id: `${projPrefix}${y}-${m}-${d || '01'}`,
      year: parseInt(y, 10),
      monthIdx: parseInt(m, 10),
      fecha: normalizedFecha,
      lecturaRed,
      lecturaSolar,
      precioKw,
      project_id: state.activeProject?.id || null,
      inverter_reset: invResetVal === 'SI' || invResetVal === 'YES' || invResetVal === 'TRUE' || invResetVal === '1',
      meter_reset: metResetVal === 'SI' || metResetVal === 'YES' || metResetVal === 'TRUE' || metResetVal === '1',
    });
  }

  return records;
}

function _renderCsvPreview(records) {
  const wrap = document.getElementById('csv-preview-wrap');
  const tbody = document.getElementById('csv-preview-tbody');
  const countEl = document.getElementById('csv-preview-count');
  const confirmBtn = document.getElementById('btn-confirm-csv-import');

  if (!wrap || !tbody) return;
  wrap.classList.remove('hidden');
  if (countEl) countEl.textContent = `${records.length}`;
  if (confirmBtn) confirmBtn.disabled = records.length === 0;

  tbody.innerHTML = records.slice(0, 15).map(r => `
    <tr>
      <td class="cell-primary">${r.fecha}</td>
      <td class="text-right">${fDec(r.lecturaRed, 1)}</td>
      <td class="text-right text-solar">${fDec(r.lecturaSolar, 1)}</td>
      <td class="text-right">${fCOP(r.precioKw)}</td>
    </tr>
  `).join('');
}
