/**
 * @module app/csvExport
 * @description Exports processed solar plant records to UTF-8 BOM CSV.
 */

import { state } from '../modules/state.js';
import { getBaseRecord } from '../modules/analytics.js';
import { downloadTextFile } from '../modules/utils.js';
import { showToast } from './ui.js';

export function handleExportCsv() {
  if (!state.rawData || state.rawData.length === 0) {
    showToast(state.lang === 'es' ? 'No hay lecturas registradas para exportar' : 'No readings available to export', 'error');
    return;
  }

  const headers = [
    'Periodo',
    'Fecha',
    'Dias Facturados',
    'Lectura Red (Medidor)',
    'Lectura Solar (Inversor)',
    'Consumo Red (kWh)',
    'Generacion Solar (kWh)',
    'Rendimiento Especifico (kWh/kWp)',
    'Horas Sol Pico (HSP)',
    'Performance Ratio (%)',
    'Generacion Diaria (kWh/dia)',
    'Consumo Total (kWh)',
    'Autonomia (%)',
    'Tarifa kW (COP)',
    'Ahorro Generado (COP)',
    'Reinicio Inversor',
    'Reinicio Medidor Red',
  ];

  const baseRec = getBaseRecord(state.rawData);
  const baseRow = baseRec
    ? [[
        `"${baseRec.label} (Base)"`,
        `"${baseRec.fecha}"`,
        0,
        baseRec.lecturaRed ?? 0,
        baseRec.lecturaSolar ?? 0,
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        baseRec.precioKw ?? 0,
        '0.00',
        baseRec.inverter_reset ? 'SI' : 'NO',
        baseRec.meter_reset ? 'SI' : 'NO',
      ]]
    : [];

  const rows = state.processedData.map((d) => [
    `"${d.label}"`,
    `"${d.fecha}"`,
    d.daysInPeriod || 30,
    d.lecturaRed ?? 0,
    d.lecturaSolar ?? 0,
    (d.consumoRed ?? 0).toFixed(2),
    (d.prodBruta ?? 0).toFixed(2),
    (d.specificYield ?? 0).toFixed(2),
    (d.hsp ?? 0).toFixed(2),
    (d.pr ?? 0).toFixed(2),
    (d.prodDiaria ?? 0).toFixed(2),
    (d.consumoTotal ?? 0).toFixed(2),
    (d.autonomia ?? 0).toFixed(2),
    d.precioKw ?? 0,
    (d.ahorroReal ?? 0).toFixed(2),
    d.inverter_reset ? 'SI' : 'NO',
    d.meter_reset ? 'SI' : 'NO',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...baseRow.map((r) => r.join(',')), ...rows.map((r) => r.join(','))].join('\n');
  const slug = (state.activeProject?.name || 'solar-app').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadTextFile(`${slug}-reporte-solar-${new Date().toISOString().slice(0, 10)}.csv`, csvContent, 'text/csv;charset=utf-8;');
  showToast(state.lang === 'es' ? 'Reporte CSV descargado correctamente' : 'CSV Report downloaded successfully', 'success');
}
