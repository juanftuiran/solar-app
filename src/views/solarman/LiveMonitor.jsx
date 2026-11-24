import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Check,
  Clock,
  CloudUpload,
  Cpu,
  Gauge,
  History,
  Laptop,
  Link2,
  ListChecks,
  PlugZap,
  Radio,
  RefreshCw,
  Repeat,
  RotateCw,
  Sun,
  Thermometer,
  Unplug,
  Zap,
  ZapOff,
} from 'lucide-react';
import { fDec } from '../../modules/formatters.js';
import { useApp } from '../../context/AppContext.jsx';
import HistoryChartsPanel from './HistoryChartsPanel.jsx';

export default function LiveMonitor({
  project,
  session,
  isAdmin,
  runtime,
  onSelectDevice,
  onOpenStationPicker,
  onManualRefresh,
  onPushReadingToCloud,
  onDisconnect,
  onChangeHistoryDate,
  onChangeHistoryRange,
  onChangeHistoryMetric,
}) {
  const { lang, t } = useApp();
  const [paramSearch, setParamSearch] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const station = runtime.activeStation || {};
  const devData = runtime.deviceData || {
    summary: {},
    pvStrings: [],
    acPhases: [],
    temperatures: [],
    rawList: [],
  };
  const sum = devData.summary || {};
  const devices = runtime.devices || [];

  const colTimeSec = runtime.lastCollectionTime || Math.floor(nowMs / 1000);
  const colDate = new Date(colTimeSec * 1000);
  const colTimeStr = colDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const colDateStr = colDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isOnline = devData.deviceState !== 3;
  const isOffGrid = Boolean(
    sum.isOffGrid ||
    devData.isOffGrid ||
    station.gridInterconnectionType === 'OFF_GRID' ||
    station.gridInterconnectionType === 'ISLAND',
  );
  const isHybrid = !isOffGrid && Boolean(sum.systemType === 'hybrid' || sum.batterySocPct !== null);
  const isSplitPhase = Boolean(devData.isSplitPhase || sum.isSplitPhase);
  const tempVal = sum.mainTempC;
  const tempClass = tempVal === null ? 'text-secondary' : tempVal > 60 ? 'text-danger' : tempVal > 48 ? 'text-warning' : 'text-solar';

  const solarGenPowerW = Math.round(isOffGrid ? (sum.dcPowerW || sum.acPowerW || 0) : (sum.acPowerW || sum.dcPowerW || 0));
  const solarGenPowerKw = solarGenPowerW / 1000;

  let ageLabel = '';
  if (runtime.lastCollectionTime) {
    const ageSec = Math.max(0, Math.round((nowMs - runtime.lastCollectionTime * 1000) / 1000));
    if (ageSec < 60) ageLabel = `(${lang === 'en' ? `${ageSec}s ago` : `hace ${ageSec}s`})`;
    else if (ageSec < 3600) ageLabel = `(${lang === 'en' ? `${Math.floor(ageSec / 60)}m ago` : `hace ${Math.floor(ageSec / 60)} min`})`;
    else ageLabel = `(${lang === 'en' ? `${Math.floor(ageSec / 3600)}h ago` : `hace ${Math.floor(ageSec / 3600)} h`})`;
  }

  let countdownLabel = t('solarmanAutoSync');
  if (runtime.nextCheckAtMs) {
    const remSec = Math.max(0, Math.ceil((runtime.nextCheckAtMs - nowMs) / 1000));
    countdownLabel = lang === 'en' ? `Next sync in ${remSec}s` : `Próxima revisión en ${remSec}s`;
  }

  const filteredRawList = useMemo(() => {
    const q = paramSearch.toLowerCase().trim();
    if (!q) return devData.rawList || [];
    return (devData.rawList || []).filter((item) =>
      `${item.key || ''} ${item.name || ''} ${item.value ?? ''} ${item.unit || ''}`.toLowerCase().includes(q),
    );
  }, [devData.rawList, paramSearch]);

  return (
    <div id="solarman-view" className="stack">
      {session?.isDemo && (
        <div className="anomaly-banner info" role="status">
          <div className="anomaly-icon" aria-hidden="true"><Radio size={18} /></div>
          <div className="anomaly-content" style={{ flex: 1 }}>
            <strong>{lang === 'en' ? 'Demo Simulation Active' : 'Simulación Demo Activa'}</strong>
            <p>
              {lang === 'en'
                ? 'Showing simulated inverter curves for visual exploration. Connect your real Solarman account to read live hardware.'
                : 'Mostrando datos simulados de prueba para explorar la interfaz. Conecta tu cuenta real de Solarman para leer inversores en vivo.'}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDisconnect}>
            <Unplug size={14} aria-hidden="true" />
            <span>{t('exitDemoMode')}</span>
          </button>
        </div>
      )}

      <div className="card solarman-topbar">
        <div className="solarman-topbar-left">
          <div className={`solarman-live-badge ${runtime.justUpdatedPacket ? 'pulse-highlight' : ''}`}>
            <span className="online-dot" aria-hidden="true" />
            <span>{session?.isDemo ? 'DEMO LIVE' : isOnline ? 'SOLARMAN ONLINE' : 'STANDBY / OFFLINE'}</span>
          </div>

          <div className="solarman-plant-binding-info">
            <div className="solarman-plant-title-row">
              <span className="lbl">
                <Link2 size={13} className="text-solar" aria-hidden="true" />
                <span>{t('solarmanBoundPlant')}</span>
              </span>
              <strong className="val">{station.name || 'Planta Solarman'}</strong>
              <span className="meta-chip accent">ID #{String(station.id || '')}</span>
              <span className={`meta-chip ${isOffGrid ? 'warning' : isHybrid ? 'ai' : 'solar'}`} style={{ fontSize: '.72rem' }}>
                {isOffGrid ? <ZapOff size={12} aria-hidden="true" /> : isHybrid ? <BatteryCharging size={12} aria-hidden="true" /> : <Radio size={12} aria-hidden="true" />}
                <span>{isOffGrid ? 'Off-Grid (Aislada)' : isHybrid ? 'Híbrida' : 'On-Grid'}</span>
              </span>
            </div>

            <div className="solarman-sync-meta">
              <span>
                <Clock size={12} className="text-accent" aria-hidden="true" />
                <span>{t('solarmanLastPacket')}</span>{' '}
                <strong>{colTimeStr} ({colDateStr})</strong>{' '}
                <span className="text-secondary">{ageLabel}</span>
              </span>
              <span className="sep" aria-hidden="true">·</span>
              <span className="text-secondary">
                <RotateCw size={12} aria-hidden="true" /> {countdownLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="solarman-topbar-actions">
          {devices.length > 0 && (
            <div className="solarman-device-select-wrap">
              <label htmlFor="sm-device-select" className="text-xs text-secondary">
                <Cpu size={12} aria-hidden="true" />
                <span>{t('solarmanDevice')}</span>
              </label>
              <select
                id="sm-device-select"
                className="select-pill"
                value={runtime.activeDeviceSn || ''}
                onChange={(e) => onSelectDevice(e.target.value)}
              >
                {devices.map((d) => (
                  <option key={d.deviceSn} value={d.deviceSn}>
                    {d.deviceType}: {d.deviceSn}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onOpenStationPicker}
          >
            <Repeat size={14} className="text-accent" aria-hidden="true" />
            <span>{t('solarmanSwitchPlantBtn', { count: runtime.stations?.length || 1 })}</span>
          </button>

          <button
            type="button"
            className="btn btn-accent btn-sm"
            disabled={runtime.loading}
            onClick={onManualRefresh}
          >
            <RefreshCw size={14} className={runtime.loading ? 'spin' : ''} aria-hidden="true" />
            <span>{t('solarmanRefreshNow')}</span>
          </button>

          {isAdmin && sum.totalEnergyKwh > 0 && (
            <button
              type="button"
              className="btn btn-solar btn-sm"
              onClick={() => onPushReadingToCloud(sum.totalEnergyKwh)}
            >
              <CloudUpload size={14} aria-hidden="true" />
              <span>{t('solarmanUseInRecord', { kwh: fDec(sum.totalEnergyKwh, 1) })}</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            title={`${t('solarmanSwitchAccount')} (${session?.email || ''})`}
            aria-label={t('solarmanSwitchAccount')}
            onClick={onDisconnect}
          >
            <Unplug size={15} className="text-danger" aria-hidden="true" />
          </button>
        </div>
      </div>

      {runtime.error && (
        <div className="anomaly-banner warning" role="alert">
          <div className="anomaly-icon" aria-hidden="true"><AlertTriangle size={18} /></div>
          <div className="anomaly-content">
            <strong>{lang === 'en' ? 'Solarman Telemetry Alert' : 'Alerta de Telemetría Solarman'}</strong>
            <p>{runtime.error}</p>
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <div className="card kpi-card solar">
          <div className="kpi-head">
            <span className="kpi-label">
              {isOffGrid
                ? (lang === 'en' ? 'Solar PV Power (Live)' : 'Potencia Solar Generada (PV)')
                : isHybrid
                  ? (lang === 'en' ? 'Total Solar Power (PV)' : 'Potencia Solar Total (PV)')
                  : (lang === 'en' ? 'Live Solar Power (AC)' : 'Potencia Solar Actual (AC)')}
            </span>
            <div className="icon-tile sm solar" aria-hidden="true"><Sun size={15} /></div>
          </div>
          <div className="kpi-value text-solar tabular-nums">
            {solarGenPowerW >= 1000 ? `${fDec(solarGenPowerKw, 2)} kW` : `${solarGenPowerW} W`}
          </div>
          <div className="solarman-cap-bar">
            <div className="solarman-cap-bar-fill" style={{ width: `${Math.min(100, sum.loadFactorPct || 0).toFixed(1)}%` }} />
          </div>
          <div className="kpi-foot">
            <span className="delta up">{fDec(sum.loadFactorPct || 0, 1)}% cap.</span>
            {isOffGrid ? (
              <span className="text-xs text-secondary">
                DC: {Math.round(sum.dcPowerW || solarGenPowerW)} W · Consumo: {Math.round(sum.loadPowerW || 0)} W
              </span>
            ) : (
              <span className="text-xs text-secondary">
                DC: {Math.round(sum.dcPowerW || 0)} W ({sum.inverterEfficiencyPct > 0 ? `${fDec(sum.inverterEfficiencyPct, 1)}% ef.` : 'MPPT'})
              </span>
            )}
          </div>
        </div>

        <div className="card kpi-card accent">
          <div className="kpi-head">
            <span className="kpi-label">{lang === 'en' ? 'Daily Yield (Today)' : 'Generación del Día (Hoy)'}</span>
            <div className="icon-tile sm accent" aria-hidden="true"><Sun size={15} /></div>
          </div>
          <div className="kpi-value text-accent tabular-nums">
            {fDec(sum.dailyEnergyKwh || 0, 2)} <small style={{ fontSize: '.55em', fontWeight: 600 }}>kWh</small>
          </div>
          <div className="kpi-foot">
            <span className="text-xs text-secondary">
              <Gauge size={12} className="text-solar" aria-hidden="true" />{' '}
              HSP Hoy: <strong>{sum.capacityKw > 0 ? fDec((sum.dailyEnergyKwh || 0) / sum.capacityKw, 2) : '—'} h</strong>
            </span>
            <span className="text-xs text-secondary">Cap: {fDec(sum.capacityKw || 0, 1)} kWp</span>
          </div>
        </div>

        <div className="card kpi-card ai">
          <div className="kpi-head">
            <span className="kpi-label">{lang === 'en' ? 'Cumulative Inverter Yield' : 'Lectura Acumulada Inversor'}</span>
            <div className="icon-tile sm ai" aria-hidden="true"><Cpu size={15} /></div>
          </div>
          <div className="kpi-value text-ai tabular-nums">
            {sum.totalEnergyKwh > 0 ? (
              <>
                {fDec(sum.totalEnergyKwh, 1)} <small style={{ fontSize: '.55em', fontWeight: 600 }}>kWh</small>
              </>
            ) : '—'}
          </div>
          <div className="kpi-foot">
            <span className="text-xs text-secondary">SN: <strong>{runtime.activeDeviceSn || 'N/A'}</strong></span>
            <span className="text-xs text-solar"><Check size={12} aria-hidden="true" /> Odómetro Total</span>
          </div>
        </div>

        <div className="card kpi-card warning">
          <div className="kpi-head">
            <span className="kpi-label">
              {isOffGrid
                ? (lang === 'en' ? 'Temperature & AC Output' : 'Temperatura & Salida CA')
                : (lang === 'en' ? 'Temperature & AC Grid' : 'Temperatura & Red AC')}
            </span>
            <div className="icon-tile sm warning" aria-hidden="true"><Thermometer size={15} /></div>
          </div>
          <div className={`kpi-value ${tempClass} tabular-nums`}>
            {tempVal !== null && tempVal !== undefined ? `${fDec(tempVal, 1)} °C` : 'Normal'}
          </div>
          <div className="kpi-foot" style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '.5rem' }}>
              <span className="text-xs text-secondary">
                {isSplitPhase ? (
                  <>Salida: <strong>120/240 V Bifásico</strong></>
                ) : (
                  <>VAC: <strong>{devData.acPhases?.[0]?.voltageV ? `${fDec(devData.acPhases[0].voltageV, 1)} V` : '—'}</strong></>
                )}
              </span>
              <span className="text-xs text-secondary">
                Frec: <strong>{devData.acPhases?.[0]?.freqHz ? `${fDec(devData.acPhases[0].freqHz, 2)} Hz` : '60 Hz'}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '.5rem', fontSize: '.73rem' }}>
              {sum.batteryTempC !== null && sum.batteryTempC > 0 ? (
                <span className="text-ai">
                  <BatteryCharging size={12} aria-hidden="true" /> Batería: <strong>{fDec(sum.batteryTempC, 1)} °C</strong>
                </span>
              ) : (
                <span className={isOffGrid ? 'text-warning' : 'text-solar'}>
                  {isOffGrid ? 'Aislada / Off-Grid' : 'Conectado a Red'}
                </span>
              )}
              <span className="meta-tag" style={{ fontSize: '.7rem', padding: '.08rem .4rem', borderRadius: 'var(--radius-full)', background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
                {isOffGrid ? 'Off-Grid' : isHybrid ? 'Híbrido' : 'On-Grid'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <HistoryChartsPanel
        runtime={runtime}
        session={session}
        onChangeDate={onChangeHistoryDate}
        onChangeRange={onChangeHistoryRange}
        onChangeMetric={onChangeHistoryMetric}
      />

      <div className="solarman-detail-grid">
        <div className="card section-card">
          <div className="section-head" style={{ marginBottom: '1rem' }}>
            <div className="section-head-title">
              <div className="icon-tile sm solar" aria-hidden="true"><Sun size={16} /></div>
              <div>
                <h3>{lang === 'en' ? 'DC Strings Telemetry · MPPT Inputs' : 'Telemetría de Cadenas DC · Entradas MPPT'}</h3>
                <p>{lang === 'en' ? 'Live voltage, current and power per PV string input' : 'Voltaje, corriente y potencia instantánea por entrada de paneles'}</p>
              </div>
            </div>
            <span className="meta-chip solar">{Math.round(sum.dcPowerW || 0)} W DC</span>
          </div>

          <div className="solarman-strings-list">
            {(devData.pvStrings || []).map((st, idx) => {
              const sharePct = sum.dcPowerW > 0 ? Math.min(100, Math.round((st.powerW / sum.dcPowerW) * 100)) : 0;
              return (
                <div key={st.label || idx} className={`solarman-string-row ${st.active ? 'active' : 'idle'}`}>
                  <div className="solarman-string-head">
                    <div>
                      <strong>{st.label}</strong>
                      <span className={`status-tag ${st.active ? 'on' : 'off'}`}>{st.active ? 'ACTIVO' : '0 W'}</span>
                    </div>
                    <div className="solarman-string-power text-solar tabular-nums">
                      {Math.round(st.powerW)} W <small className="text-secondary">({sharePct}%)</small>
                    </div>
                  </div>
                  <div className="solarman-string-metrics">
                    <span><Zap size={12} className="text-accent" aria-hidden="true" /> Voltaje DC: <strong>{fDec(st.voltageV, 1)} V</strong></span>
                    <span><Activity size={12} className="text-warning" aria-hidden="true" /> Corriente DC: <strong>{fDec(st.currentA, 2)} A</strong></span>
                  </div>
                  <div className="solarman-cap-bar" style={{ marginTop: '.45rem' }}>
                    <div className="solarman-cap-bar-fill" style={{ width: `${sharePct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card section-card">
          <div className="section-head" style={{ marginBottom: '1rem' }}>
            <div className="section-head-title">
              <div className="icon-tile sm accent" aria-hidden="true"><PlugZap size={16} /></div>
              <div>
                <h3>
                  {isOffGrid
                    ? (lang === 'en' ? 'AC Load Output & Plant Power Flow' : 'Salida CA a Cargas & Flujo de Planta')
                    : (lang === 'en' ? 'AC Grid Output & Plant Power Flow' : 'Salida AC a Red & Flujo de Planta')}
                </h3>
                <p>
                  {isOffGrid
                    ? (lang === 'en' ? 'Off-grid microgrid parameters, consumption and battery storage' : 'Parámetros de micro-red aislada, consumo y respaldo de baterías')
                    : (lang === 'en' ? 'Grid synchronization electrical parameters and thermal sensors' : 'Parámetros eléctricos de sincronización con red y sensores térmicos')}
                </p>
              </div>
            </div>
            <span className="meta-chip accent">
              {Math.round(isOffGrid ? (sum.loadPowerW || sum.acPowerW || 0) : (sum.acPowerW || 0))} W {isOffGrid ? 'Cargas' : 'AC'}
            </span>
          </div>

          <div className="solarman-phases-grid">
            {(devData.acPhases || []).map((ph) => (
              <div key={ph.id} className="solarman-phase-box">
                <div className="phase-tag">Fase {ph.id}{isSplitPhase ? ' (120V)' : ''}</div>
                <div className="phase-val tabular-nums">{fDec(ph.voltageV, 1)} V</div>
                <div className="phase-sub tabular-nums">
                  {fDec(ph.currentA, 2)} A · {ph.freqHz ? `${fDec(ph.freqHz, 2)} Hz` : '60 Hz'}
                </div>
              </div>
            ))}
          </div>

          <div className="solarman-flow-strip" style={{ marginTop: '1rem' }}>
            <div className="flow-node">
              <span className="lbl"><Sun size={12} className="text-solar" aria-hidden="true" /> Solar</span>
              <strong className="val text-solar">{Math.round(sum.dcPowerW || sum.acPowerW || 0)} W</strong>
            </div>
            <div className="flow-node">
              <span className="lbl"><Laptop size={12} className="text-accent" aria-hidden="true" /> {lang === 'en' ? 'Load' : 'Consumo'}</span>
              <strong className="val text-accent">{sum.loadPowerW ? `${Math.round(sum.loadPowerW)} W` : '—'}</strong>
            </div>
            <div className="flow-node">
              <span className="lbl"><Radio size={12} className="text-warning" aria-hidden="true" /> {t('gridPower')}</span>
              {isOffGrid ? (
                <strong className="val text-secondary">Off-Grid</strong>
              ) : sum.gridPowerW > 0 ? (
                <strong className="val text-warning">{Math.round(sum.gridPowerW)} W <small className="text-xs">(Imp.)</small></strong>
              ) : sum.gridPowerW < 0 ? (
                <strong className="val text-solar">{Math.round(Math.abs(sum.gridPowerW))} W <small className="text-xs">(Exp.)</small></strong>
              ) : (
                <strong className="val text-secondary">0 W (Sinc.)</strong>
              )}
            </div>
            {sum.batterySocPct !== null && sum.batterySocPct !== undefined && (
              <div className="flow-node">
                <span className="lbl"><BatteryCharging size={12} className="text-ai" aria-hidden="true" /> Batería</span>
                <strong className="val text-ai">
                  {fDec(sum.batterySocPct, 0)}%{' '}
                  {sum.batteryPowerW > 50 ? (
                    <small className="text-solar">(+{Math.round(sum.batteryPowerW)}W)</small>
                  ) : sum.batteryPowerW < -50 ? (
                    <small className="text-warning">(-{Math.round(Math.abs(sum.batteryPowerW))}W)</small>
                  ) : null}
                </strong>
              </div>
            )}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div className="text-xs text-secondary" style={{ marginBottom: '.4rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>
                <History size={12} aria-hidden="true" />{' '}
                {lang === 'en' ? 'Packets received in this session' : 'Historial de paquetes recibidos en esta sesión'}
              </span>
              <span>{runtime.liveHistory.length} muestras</span>
            </div>
            <div className="solarman-session-pills">
              {[...runtime.liveHistory].slice(-6).reverse().map((pt, i) => (
                <span key={`${pt.collectionTime}-${i}`} className="session-pt-pill">
                  <strong>{pt.timeLabel}</strong>: <span className="text-solar">{Math.round(pt.powerW)} W</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card section-card">
        <div className="section-head" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '.75rem' }}>
          <div className="section-head-title">
            <div className="icon-tile sm ai" aria-hidden="true"><ListChecks size={16} /></div>
            <div>
              <h3>{lang === 'en' ? 'Full Inverter Register Table' : 'Tabla Completa de Registros del Inversor'}</h3>
              <p>
                {lang === 'en'
                  ? `All parameters reported by the datalogger in the latest packet (${devData.rawList.length} variables)`
                  : `Todos los parámetros reportados por el datalogger en el último corte (${devData.rawList.length} variables)`}
              </p>
            </div>
          </div>

          <div style={{ minWidth: '240px' }}>
            <input
              type="search"
              placeholder="Filtrar parámetro (ej. Voltage, Power, Temp...)"
              aria-label="Filtrar parámetros del inversor"
              value={paramSearch}
              onChange={(e) => setParamSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '.48rem .75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-medium)',
                background: 'var(--bg-elevated)',
                color: 'var(--text)',
                fontSize: '.82rem',
              }}
            />
          </div>
        </div>

        <div className="table-wrap" style={{ maxHeight: '360px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Key' : 'Código / Key'}</th>
                <th>{lang === 'en' ? 'Inverter Parameter' : 'Parámetro del Inversor'}</th>
                <th className="text-right">{lang === 'en' ? 'Current Value' : 'Valor Reciente'}</th>
                <th>{lang === 'en' ? 'Unit' : 'Unidad'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRawList.map((item, i) => (
                <tr key={`${item.key}-${i}`}>
                  <td style={{ fontFamily: 'monospace', fontSize: '.76rem', color: 'var(--text-secondary)' }}>{item.key || '—'}</td>
                  <td className="cell-primary">{item.name || item.key || '—'}</td>
                  <td className="text-right font-bold text-solar tabular-nums">{String(item.value ?? '—')}</td>
                  <td style={{ color: 'var(--accent)', fontSize: '.8rem' }}>{item.unit || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
