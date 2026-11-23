import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CloudUpload,
  Coins,
  Gauge,
  Loader2,
  Sun,
  Zap,
} from 'lucide-react';
import { fCOP, fDec } from '../../modules/formatters.js';
import { upsertRecord } from '../../modules/supabase.js';
import { useApp } from '../../context/AppContext.jsx';
import { useProject } from '../../context/ProjectContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../../components/Modal.jsx';

export default function RecordModal({ open, mode, recordId, prefillSolarKwh, onClose }) {
  const { lang, t } = useApp();
  const { activeState, reloadReadings } = useProject();
  const { showToast } = useToast();

  const [fecha, setFecha] = useState('');
  const [lecturaRed, setLecturaRed] = useState('');
  const [lecturaSolar, setLecturaSolar] = useState('');
  const [precioKw, setPrecioKw] = useState('');
  const [inverterReset, setInverterReset] = useState(false);
  const [meterReset, setMeterReset] = useState(false);
  const [saving, setSaving] = useState(false);

  const rawData = activeState.rawData || [];
  const project = activeState.project;

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && recordId) {
      const rec = rawData.find((d) => d.id === recordId);
      if (rec) {
        setFecha(rec.fecha || '');
        setLecturaRed(String(rec.lecturaRed ?? rec.medidorRed ?? 0));
        setLecturaSolar(String(rec.lecturaSolar ?? rec.inversores ?? 0));
        setPrecioKw(String(rec.precioKw || 0));
        setInverterReset(Boolean(rec.inverter_reset));
        setMeterReset(Boolean(rec.meter_reset));
        return;
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const lastRec = rawData.length > 0 ? rawData[rawData.length - 1] : null;
    setFecha(today);
    setLecturaRed('');
    setLecturaSolar(prefillSolarKwh && prefillSolarKwh > 0 ? String(prefillSolarKwh) : '');
    setPrecioKw(lastRec?.precioKw ? String(lastRec.precioKw) : '');
    setInverterReset(false);
    setMeterReset(false);
  }, [open, mode, recordId, prefillSolarKwh, rawData]);

  const preview = useMemo(() => {
    let prev = null;
    for (const r of rawData) {
      if (mode === 'edit' && recordId && r.id === recordId) continue;
      if (!fecha || (r.fecha && r.fecha < fecha)) {
        prev = r;
      }
    }

    const curRed = parseFloat(lecturaRed) || 0;
    const curSolar = parseFloat(lecturaSolar) || 0;
    const curPrice = parseFloat(precioKw) || 0;

    let calcGrid = 0;
    let calcSolar = 0;
    let daysInPeriod = 30;
    const warnings = [];

    if (prev) {
      const prevRed = prev.lecturaRed ?? prev.medidorRed ?? 0;
      const prevSolar = prev.lecturaSolar ?? prev.inversores ?? 0;

      if (fecha && prev.fecha) {
        const dCurr = new Date(`${fecha}T00:00:00`);
        const dPrev = new Date(`${prev.fecha}T00:00:00`);
        const diffDays = Math.round(Math.abs(dCurr - dPrev) / (1000 * 60 * 60 * 24));
        if (diffDays >= 1 && diffDays <= 90) daysInPeriod = diffDays;
      }

      if (curRed < prevRed && !meterReset && curRed > 0) {
        warnings.push(
          lang === 'en'
            ? `Grid reading (${curRed}) is lower than previous (${prevRed} on ${prev.fecha}). Check "Grid meter reset" if the meter was replaced.`
            : `Lectura de red (${curRed}) menor que la anterior (${prevRed} del ${prev.fecha}). Si el medidor fue cambiado, marca "Reinicio de Medidor de Red".`,
        );
      }
      if (curSolar < prevSolar && !inverterReset && curSolar > 0) {
        warnings.push(
          lang === 'en'
            ? `Solar reading (${curSolar}) is lower than previous (${prevSolar} on ${prev.fecha}). Check "Inverter reset" if replaced.`
            : `Lectura solar (${curSolar}) menor que la anterior (${prevSolar} del ${prev.fecha}). Si el inversor fue cambiado, marca "Reinicio de Inversor".`,
        );
      }

      calcGrid = meterReset ? curRed : Math.max(0, curRed - prevRed);
      calcSolar = inverterReset ? curSolar : Math.max(0, curSolar - prevSolar);
    }

    const calcSavings = calcSolar * curPrice;
    const capacity = parseFloat(project?.capacity_kw) || 0;
    const calcYield = capacity > 0 ? calcSolar / capacity : 0;
    const calcHsp = capacity > 0 && daysInPeriod > 0 ? calcSolar / (capacity * daysInPeriod) : 0;

    return {
      prev,
      daysInPeriod,
      calcGrid,
      calcSolar,
      calcSavings,
      calcYield,
      calcHsp,
      warnings,
    };
  }, [rawData, mode, recordId, fecha, lecturaRed, lecturaSolar, precioKw, inverterReset, meterReset, project?.capacity_kw, lang]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fecha || !project?.id) return;
    const [year, month, day] = fecha.split('-');
    const projPrefix = `${project.id.slice(0, 8)}_`;

    const rec = {
      id: mode === 'edit' && recordId ? recordId : `${projPrefix}${year}-${month}-${day || '01'}`,
      year: parseInt(year, 10),
      monthIdx: parseInt(month, 10),
      fecha,
      lecturaRed: parseFloat(lecturaRed) || 0,
      lecturaSolar: parseFloat(lecturaSolar) || 0,
      precioKw: parseFloat(precioKw) || 0,
      project_id: project.id,
      inverter_reset: inverterReset,
      meter_reset: meterReset,
    };

    setSaving(true);
    try {
      const result = await upsertRecord(rec);
      if (!result) throw new Error('Error al guardar registro en la BD.');
      await reloadReadings();
      showToast(t('recordSaved'), 'success');
      onClose?.();
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dialogId="add-record-modal"
      titleId="record-modal-title"
      title={mode === 'edit' ? t('editCloudRecord') : t('newCloudRecord')}
      maxWidth="30rem"
      icon={<div className="icon-tile sm accent" aria-hidden="true"><CloudUpload size={16} /></div>}
    >
      <form id="add-record-form" className="form-stack" onSubmit={handleSubmit}>
        {preview.warnings.length > 0 && (
          <div className="modal-reading-alert" role="alert">
            <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} aria-hidden="true" />
            <div>
              {preview.warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="new-fecha">
            <Calendar size={14} className="text-accent" aria-hidden="true" />
            <span>{t('readingDate')}</span>
          </label>
          <input
            type="date"
            id="new-fecha"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="new-lectura-red">
              <Gauge size={14} style={{ color: 'var(--grid-c)' }} aria-hidden="true" />
              <span>{t('gridReading')}</span>
            </label>
            <input
              type="number"
              id="new-lectura-red"
              step="0.01"
              inputMode="decimal"
              placeholder="Ej: 14500"
              required
              value={lecturaRed}
              onChange={(e) => setLecturaRed(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="new-lectura-solar">
              <Sun size={14} className="text-solar" aria-hidden="true" />
              <span>{t('solarReading')}</span>
            </label>
            <input
              type="number"
              id="new-lectura-solar"
              step="0.01"
              inputMode="decimal"
              placeholder="Ej: 8200"
              required
              value={lecturaSolar}
              onChange={(e) => setLecturaSolar(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="new-precio">
            <Coins size={14} className="text-warning" aria-hidden="true" />
            <span>{t('pricePerKw')}</span>
          </label>
          <input
            type="number"
            id="new-precio"
            step="0.01"
            inputMode="decimal"
            placeholder="Ej: 950.50"
            required
            value={precioKw}
            onChange={(e) => setPrecioKw(e.target.value)}
          />
        </div>

        <div className="check-group">
          <label className="check-option">
            <input
              type="checkbox"
              id="new-inverter-reset"
              checked={inverterReset}
              onChange={(e) => setInverterReset(e.target.checked)}
            />
            <div>
              <span className="check-option-title">{t('inverterResetTitle')}</span>
              <span className="check-option-desc">{t('inverterResetDesc')}</span>
            </div>
          </label>

          <label className="check-option danger">
            <input
              type="checkbox"
              id="new-meter-reset"
              checked={meterReset}
              onChange={(e) => setMeterReset(e.target.checked)}
            />
            <div>
              <span className="check-option-title">{t('meterResetTitle')}</span>
              <span className="check-option-desc">{t('meterResetDesc')}</span>
            </div>
          </label>
        </div>

        <div className="live-calc-card">
          <div className="live-calc-header">
            <span>
              <Zap size={13} style={{ marginRight: '.3rem', verticalAlign: '-2px' }} aria-hidden="true" />
              <span>{t('liveCalcTitle')}</span>
            </span>
            <span className="tag">
              {preview.prev
                ? `${preview.daysInPeriod} ${lang === 'en' ? 'days vs' : 'días vs'} ${preview.prev.fecha}`
                : t('initialBaseReadingTag')}
            </span>
          </div>

          <div className="live-calc-grid">
            <div className="live-calc-item">
              <span className="lbl">{t('gridUsageCol')}:</span>
              <span className="val text-strong">{fDec(preview.calcGrid, 1)} kWh</span>
            </div>
            <div className="live-calc-item">
              <span className="lbl">{t('solarGenCol')}:</span>
              <span className="val text-solar">{fDec(preview.calcSolar, 1)} kWh</span>
            </div>
            <div className="live-calc-item">
              <span className="lbl">{t('specificYieldShort')}:</span>
              <span className="val text-accent">
                {fDec(preview.calcYield, 1)} kWh/kWp ({fDec(preview.calcHsp, 2)} HSP)
              </span>
            </div>
            <div className="live-calc-item">
              <span className="lbl">{t('savingsCol')}:</span>
              <span className="val text-solar">{fCOP(preview.calcSavings)}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          id="btn-save"
          className="btn btn-solar btn-lg btn-block"
          style={{ marginTop: '.25rem' }}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="spin" aria-hidden="true" />
              <span>{t('saving')}</span>
            </>
          ) : (
            <>
              <CloudUpload size={16} aria-hidden="true" />
              <span>{t('saveToCloud')}</span>
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}
