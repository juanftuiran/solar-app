/**
 * @module dashboard/recordModal
 * @description Add/Edit solar reading modal with live chronological delta & HSP preview.
 */

import { state } from "../../modules/state.js";
import { fCOP, fDec } from "../../modules/formatters.js";

export function renderRecordModal() { return _renderRecordModal(); }
export function bindModalLivePreview() { return _bindModalLivePreview(); }

function _renderRecordModal() {
  return `
    <div id="add-record-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:30rem;">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">
            <div class="icon-tile sm accent"><i class="fa-solid fa-cloud-arrow-up"></i></div>
            <span class="lang-es" id="modal-title-es">Nuevo Registro Cloud</span>
            <span class="lang-en" id="modal-title-en">New Cloud Record</span>
          </h2>
          <button id="close-record-modal" class="modal-close-btn" type="button" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Form -->
        <form id="add-record-form" class="form-stack">
          <input type="hidden" id="edit-id" value="">

          <!-- Warning Alert Box -->
          <div id="modal-reading-alert" class="modal-reading-alert hidden"></div>

          <div class="field">
            <label for="new-fecha">
              <i class="fa-solid fa-calendar-day text-accent"></i>
              <span class="lang-es">Fecha de Lectura</span>
              <span class="lang-en">Reading Date</span>
            </label>
            <input type="date" id="new-fecha" required>
          </div>

          <div class="field-row">
            <div class="field">
              <label for="new-lectura-red">
                <i class="fa-solid fa-gauge" style="color:var(--grid-c);"></i>
                <span class="lang-es">Lectura Red (Medidor)</span>
                <span class="lang-en">Grid Reading</span>
              </label>
              <input type="number" id="new-lectura-red" step="0.01" placeholder="Ej: 14500" required>
            </div>
            <div class="field">
              <label for="new-lectura-solar">
                <i class="fa-solid fa-solar-panel text-solar"></i>
                <span class="lang-es">Lectura Solar (Inversor)</span>
                <span class="lang-en">Solar Reading</span>
              </label>
              <input type="number" id="new-lectura-solar" step="0.01" placeholder="Ej: 8200" required>
            </div>
          </div>

          <div class="field">
            <label for="new-precio">
              <i class="fa-solid fa-coins text-warning"></i>
              <span class="lang-es">Precio por kW (COP)</span>
              <span class="lang-en">Price per kW (COP)</span>
            </label>
            <input type="number" id="new-precio" step="0.01" placeholder="Ej: 950.50" required>
          </div>

          <!-- Hardware Reset Checkboxes -->
          <div class="check-group">
            <label class="check-option">
              <input type="checkbox" id="new-inverter-reset">
              <div>
                <span class="check-option-title">
                  <span class="lang-es">Reinicio de inversor (Nuevo equipo solar)</span>
                  <span class="lang-en">Inverter reset (New solar equipment)</span>
                </span>
                <span class="check-option-desc">
                  <span class="lang-es">Marca si cambiaste el inversor y la lectura reinició desde 0.</span>
                  <span class="lang-en">Check if inverter was replaced and reading started from 0.</span>
                </span>
              </div>
            </label>

            <label class="check-option danger">
              <input type="checkbox" id="new-meter-reset">
              <div>
                <span class="check-option-title">
                  <span class="lang-es">Reinicio de medidor de red (Cambio por operador)</span>
                  <span class="lang-en">Grid meter reset (Utility replacement)</span>
                </span>
                <span class="check-option-desc">
                  <span class="lang-es">Marca si la empresa de energía reemplazó el medidor de red.</span>
                  <span class="lang-en">Check if utility company replaced the grid meter.</span>
                </span>
              </div>
            </label>
          </div>

          <!-- Real-Time Calculation Preview -->
          <div class="live-calc-card">
            <div class="live-calc-header">
              <span>
                <i class="fa-solid fa-bolt" style="margin-right:.3rem;"></i>
                <span class="lang-es">Cálculo en tiempo real</span>
                <span class="lang-en">Real-time calculation</span>
              </span>
              <span class="tag" id="prev-calc-days-tag">Preview</span>
            </div>
            <div class="live-calc-grid">
              <div class="live-calc-item">
                <span class="lbl"><span class="lang-es">Consumo Red:</span><span class="lang-en">Grid Usage:</span></span>
                <span class="val text-strong" id="prev-calc-grid">0.0 kWh</span>
              </div>
              <div class="live-calc-item">
                <span class="lbl"><span class="lang-es">Gen. Solar:</span><span class="lang-en">Solar Gen:</span></span>
                <span class="val text-solar" id="prev-calc-solar">0.0 kWh</span>
              </div>
              <div class="live-calc-item">
                <span class="lbl"><span class="lang-es">Rendimiento (Y<sub>f</sub>):</span><span class="lang-en">Yield (Y<sub>f</sub>):</span></span>
                <span class="val text-accent" id="prev-calc-yield">0.0 kWh/kWp</span>
              </div>
              <div class="live-calc-item">
                <span class="lbl"><span class="lang-es">Ahorro Est.:</span><span class="lang-en">Est. Savings:</span></span>
                <span class="val text-solar" id="prev-calc-savings">$0</span>
              </div>
            </div>
          </div>

          <button type="submit" id="btn-save" class="btn btn-solar btn-lg btn-block" style="margin-top:.25rem;">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span class="lang-es">Guardar en la Nube</span>
            <span class="lang-en">Save to Cloud</span>
          </button>
        </form>
      </div>
    </div>
  `;
}


function _bindModalLivePreview() {
  const redInput = document.getElementById('new-lectura-red');
  const solarInput = document.getElementById('new-lectura-solar');
  const priceInput = document.getElementById('new-precio');
  const inverterResetCheckbox = document.getElementById('new-inverter-reset');
  const meterResetCheckbox = document.getElementById('new-meter-reset');
  const dateInput = document.getElementById('new-fecha');
  const alertBox = document.getElementById('modal-reading-alert');
  const periodDaysTag = document.getElementById('prev-calc-days-tag');

  const updatePreview = () => {
    const editId = document.getElementById('edit-id')?.value || '';
    const selectedFecha = dateInput?.value || '';
    const curRed = parseFloat(redInput?.value) || 0;
    const curSolar = parseFloat(solarInput?.value) || 0;
    const curPrice = parseFloat(priceInput?.value) || 0;
    const isInverterReset = inverterResetCheckbox?.checked || false;
    const isMeterReset = meterResetCheckbox?.checked || false;

    const rawData = state.rawData || [];
    // Find actual chronological predecessor (latest record before selectedFecha, excluding current editId)
    let prev = null;
    for (const r of rawData) {
      if (editId && r.id === editId) continue;
      if (!selectedFecha || (r.fecha && r.fecha < selectedFecha)) {
        prev = r;
      }
    }

    let calcGrid = 0;
    let calcSolar = 0;
    let daysInPeriod = 30;
    const warnings = [];

    if (prev) {
      const prevRed = prev.lecturaRed ?? prev.medidorRed ?? 0;
      const prevSolar = prev.lecturaSolar ?? prev.inversores ?? 0;

      if (selectedFecha && prev.fecha) {
        const dCurr = new Date(selectedFecha + 'T00:00:00');
        const dPrev = new Date(prev.fecha + 'T00:00:00');
        const diffDays = Math.round(Math.abs(dCurr - dPrev) / (1000 * 60 * 60 * 24));
        if (diffDays >= 1 && diffDays <= 90) {
          daysInPeriod = diffDays;
        }
      }

      if (curRed < prevRed && !isMeterReset && curRed > 0) {
        warnings.push(
          state.lang === 'en'
            ? `Grid reading (${curRed}) is lower than previous (${prevRed} on ${prev.fecha}). Check "Grid meter reset" if the meter was replaced.`
            : `Lectura de red (${curRed}) menor que la anterior (${prevRed} del ${prev.fecha}). Si el medidor fue cambiado, marca "Reinicio de Medidor de Red".`,
        );
      }
      if (curSolar < prevSolar && !isInverterReset && curSolar > 0) {
        warnings.push(
          state.lang === 'en'
            ? `Solar reading (${curSolar}) is lower than previous (${prevSolar} on ${prev.fecha}). Check "Inverter reset" if replaced.`
            : `Lectura solar (${curSolar}) menor que la anterior (${prevSolar} del ${prev.fecha}). Si el inversor fue cambiado, marca "Reinicio de Inversor".`,
        );
      }

      calcGrid = isMeterReset ? curRed : Math.max(0, curRed - prevRed);
      calcSolar = isInverterReset ? curSolar : Math.max(0, curSolar - prevSolar);
    } else {
      // Initial base reading
      calcGrid = 0;
      calcSolar = 0;
    }

    const calcSavings = calcSolar * curPrice;
    const capacity = parseFloat(state.activeProject?.capacity_kw) || 0;
    const calcYield = capacity > 0 ? calcSolar / capacity : 0;
    const calcHsp = (capacity > 0 && daysInPeriod > 0) ? calcSolar / (capacity * daysInPeriod) : 0;

    const prevGridEl = document.getElementById('prev-calc-grid');
    const prevSolarEl = document.getElementById('prev-calc-solar');
    const prevSavingsEl = document.getElementById('prev-calc-savings');
    const prevYieldEl = document.getElementById('prev-calc-yield');

    if (periodDaysTag) {
      periodDaysTag.innerText = prev
        ? `${daysInPeriod} ${state.lang === 'en' ? 'days vs' : 'días vs'} ${prev.fecha}`
        : (state.lang === 'en' ? 'Initial Base Reading (t₀)' : 'Lectura Inicial Base (t₀)');
    }
    if (prevGridEl) prevGridEl.innerText = `${fDec(calcGrid, 1)} kWh`;
    if (prevSolarEl) prevSolarEl.innerText = `${fDec(calcSolar, 1)} kWh`;
    if (prevSavingsEl) prevSavingsEl.innerText = fCOP(calcSavings);
    if (prevYieldEl) prevYieldEl.innerText = `${fDec(calcYield, 1)} kWh/kWp (${fDec(calcHsp, 2)} HSP)`;

    if (alertBox) {
      if (warnings.length > 0) {
        alertBox.classList.remove('hidden');
        alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size:1rem;color:var(--warning);"></i> <span>${warnings.join('<br>')}</span>`;
      } else {
        alertBox.classList.add('hidden');
      }
    }
  };

  [redInput, solarInput, priceInput, inverterResetCheckbox, meterResetCheckbox, dateInput].forEach(el => {
    el?.addEventListener('input', updatePreview);
    el?.addEventListener('change', updatePreview);
  });
}
