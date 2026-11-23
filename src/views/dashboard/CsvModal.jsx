import React, { useEffect, useState } from 'react';
import { CloudUpload, Database, Download, FileSpreadsheet } from 'lucide-react';
import { fCOP, fDec } from '../../modules/formatters.js';
import { batchUpsertRecords } from '../../modules/supabase.js';
import { downloadTextFile } from '../../modules/utils.js';
import { useApp } from '../../context/AppContext.jsx';
import { useProject } from '../../context/ProjectContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../../components/Modal.jsx';

function parseCsvContent(text, projectId) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const splitLine = (line) => line.split(',').map((cell) => cell.replace(/^"|"$/g, '').trim());

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  const idxFecha = headers.findIndex((h) => h.includes('fecha') || h.includes('date'));
  const idxRed = headers.findIndex((h) => h.includes('lectura red') || h.includes('medidor') || h.includes('grid'));
  const idxSolar = headers.findIndex((h) => h.includes('lectura solar') || h.includes('inversor') || h.includes('solar'));
  const idxPrecio = headers.findIndex((h) => h.includes('tarifa') || h.includes('precio') || h.includes('cost') || h.includes('price'));
  const idxInvReset = headers.findIndex((h) => h.includes('reinicio inversor') || h.includes('inverter reset'));
  const idxMetReset = headers.findIndex((h) => h.includes('reinicio medidor') || h.includes('meter reset'));

  const records = [];
  const projPrefix = projectId ? `${projectId.slice(0, 8)}_` : '';

  for (let i = 1; i < lines.length; i += 1) {
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
      project_id: projectId || null,
      inverter_reset: ['SI', 'YES', 'TRUE', '1'].includes(invResetVal),
      meter_reset: ['SI', 'YES', 'TRUE', '1'].includes(metResetVal),
    });
  }

  return records;
}

export default function CsvModal({ open, onClose }) {
  const { t } = useApp();
  const { activeState, reloadReadings } = useProject();
  const { showToast } = useToast();

  const [records, setRecords] = useState([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open) {
      setRecords([]);
      setImporting(false);
    }
  }, [open]);

  const handleDownloadTemplate = () => {
    const sample = [
      'Fecha,Lectura Red (Medidor),Lectura Solar (Inversor),Tarifa kW (COP),Reinicio Inversor,Reinicio Medidor Red',
      '2025-01-15,12000,4500,890,NO,NO',
      '2025-02-15,12180,4820,905,NO,NO',
      '2025-03-15,12350,5190,912,NO,NO',
    ].join('\n');
    downloadTextFile('plantilla_lecturas_jf_solar.csv', `\uFEFF${sample}`, 'text/csv;charset=utf-8;');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCsvContent(String(ev.target?.result || ''), activeState.project?.id);
      setRecords(parsed);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (!records.length) return;
    setImporting(true);
    try {
      showToast(t('importingRecords', { count: records.length }), 'info');
      const count = await batchUpsertRecords(records);
      await reloadReadings();
      showToast(t('importedRecords', { count }), 'success');
      onClose?.();
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dialogId="csv-import-modal"
      titleId="csv-modal-title"
      title={t('csvImportTitle')}
      maxWidth="34rem"
      icon={<div className="icon-tile sm solar" aria-hidden="true"><FileSpreadsheet size={16} /></div>}
    >
      <div className="form-stack">
        <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {t('csvImportHelp')}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            id="btn-download-csv-template"
            className="btn btn-ghost btn-sm"
            onClick={handleDownloadTemplate}
          >
            <Download size={14} className="text-accent" aria-hidden="true" />
            <span>{t('downloadCsvTemplate')}</span>
          </button>
        </div>

        <label className="csv-dropzone" htmlFor="csv-file-input">
          <CloudUpload size={26} className="text-solar" aria-hidden="true" />
          <div>
            <strong style={{ display: 'block', color: 'var(--text-strong)', fontSize: '.88rem' }}>
              {t('chooseCsvFile')}
            </strong>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              {t('utf8CsvHint')}
            </span>
          </div>
          <input
            type="file"
            id="csv-file-input"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </label>

        {records.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.78rem' }}>
              <span className="text-secondary">{t('detectedRecords')}</span>
              <span className="count-pill">{records.length}</span>
            </div>
            <div className="table-scroll" style={{ maxHeight: '180px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <table>
                <thead>
                  <tr>
                    <th>{t('readingDate')}</th>
                    <th className="text-right">{t('gridPower')}</th>
                    <th className="text-right">Solar</th>
                    <th className="text-right">{t('kwTariffCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 15).map((r) => (
                    <tr key={r.id}>
                      <td className="cell-primary">{r.fecha}</td>
                      <td className="text-right">{fDec(r.lecturaRed, 1)}</td>
                      <td className="text-right text-solar">{fDec(r.lecturaSolar, 1)}</td>
                      <td className="text-right">{fCOP(r.precioKw)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          type="button"
          id="btn-confirm-csv-import"
          className="btn btn-solar btn-lg btn-block"
          disabled={records.length === 0 || importing}
          onClick={handleImport}
        >
          <Database size={16} aria-hidden="true" />
          <span>{importing ? t('saving') : t('importAndSync')}</span>
        </button>
      </div>
    </Modal>
  );
}
