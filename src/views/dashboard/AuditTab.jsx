import React, { Fragment, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ChevronRight,
  Cloud,
  Compass,
  FileUp,
  Flag,
  Inbox,
  Minus,
  Pencil,
  RotateCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { fCOP, fDec } from '../../modules/formatters.js';
import { getBaseRecord } from '../../modules/analytics.js';
import { useApp } from '../../context/AppContext.jsx';
import { useProject } from '../../context/ProjectContext.jsx';

export default function AuditTab({ onOpenEditRecord: propEdit, onDeleteRecord: propDelete, onOpenCsvModal: propCsv }) {
  const outletCtx = useOutletContext() || {};
  const onOpenEditRecord = propEdit || outletCtx.onOpenEditRecord;
  const onDeleteRecord = propDelete || outletCtx.onDeleteRecord;
  const onOpenCsvModal = propCsv || outletCtx.onOpenCsvModal;
  const { selectedYear, t } = useApp();
  const { activeState, processedData, isProjectAdmin } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  const year = String(selectedYear || 'all');
  const tableData = useMemo(() => {
    const base = year === 'all'
      ? processedData
      : processedData.filter((d) => d.year === parseInt(year, 10));

    const q = searchQuery.toLowerCase().trim();
    if (!q) return base;
    return base.filter((row) =>
      `${row.label || ''} ${row.fecha || ''} ${row.lecturaRed ?? ''} ${row.lecturaSolar ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [processedData, year, searchQuery]);

  const baseRecord = useMemo(() => {
    const base = getBaseRecord(activeState.rawData);
    if (!base) return null;
    if (year !== 'all' && base.year !== parseInt(year, 10)) return null;
    const q = searchQuery.toLowerCase().trim();
    if (q && !`${base.label} ${base.fecha}`.toLowerCase().includes(q)) return null;
    return base;
  }, [activeState.rawData, year, searchQuery]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="card table-wrap">
      <div className="table-header">
        <h3>
          <Cloud size={17} className="text-accent" aria-hidden="true" />
          <span>{t('cloudHistoricalReadings')}</span>
        </h3>

        <div className="table-toolbar">
          <div className="search-input-wrap sm">
            <Search size={14} aria-hidden="true" />
            <input
              type="text"
              id="table-search-input"
              placeholder={t('searchRecordsPlaceholder')}
              aria-label={t('searchRecordsPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {isProjectAdmin && (
            <button
              id="btn-import-csv"
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onOpenCsvModal}
            >
              <FileUp size={15} className="text-solar" aria-hidden="true" />
              <span>{t('importCsv')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t('periodDateCol')}</th>
              <th style={{ textAlign: 'center' }}>{t('readingsGridSolarCol')}</th>
              <th style={{ textAlign: 'center' }}>{t('gridUsageCol')}</th>
              <th style={{ textAlign: 'center' }}>{t('solarGenCol')}</th>
              <th style={{ textAlign: 'center' }}>{t('yieldCol')}</th>
              <th className="text-right">{t('kwTariffCol')}</th>
              <th className="text-right">{t('savingsCol')}</th>
              {isProjectAdmin && <th style={{ textAlign: 'center' }}>{t('actions')}</th>}
            </tr>
          </thead>

          <tbody id="table-body">
            {tableData.length === 0 && !baseRecord ? (
              <tr>
                <td colSpan={isProjectAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
                  <div className="empty-state" style={{ padding: '1.5rem 0' }}>
                    <Inbox size={32} className="empty-icon text-accent" aria-hidden="true" />
                    <h3>{t('noReadingsFound')}</h3>
                    <p>{t('noReadingsMatch')}</p>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {baseRecord && (
                  <tr className="data-row base-record-row">
                    <td>
                      <div className="cell-period">
                        <div className="row-chevron" style={{ color: 'var(--accent)', borderColor: 'var(--border-focus)' }}>
                          <Flag size={12} aria-hidden="true" />
                        </div>
                        <div>
                          <div className="cell-primary text-accent">{baseRecord.label}</div>
                          <div className="cell-sub">{baseRecord.fecha}</div>
                          <div className="badges-inline">
                            <span className="badge-base-record">
                              <Compass size={11} aria-hidden="true" />
                              <span>{t('initialBaseReadingTag')}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '.8rem' }}>
                      <span style={{ color: 'var(--text)', fontWeight: 700 }}>{(baseRecord.lecturaRed || 0).toFixed(0)}</span>
                      <span style={{ opacity: 0.4, margin: '0 .25rem' }}>/</span>
                      <span style={{ color: 'var(--solar)', fontWeight: 700 }}>{(baseRecord.lecturaSolar || 0).toFixed(0)}</span>
                      <div className="cell-sub">Red / Solar · Base</div>
                    </td>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '.78rem' }}>
                      {t('baseRefDesc')}
                    </td>
                    <td className="text-right">
                      <div className="cell-primary">{fCOP(baseRecord.precioKw || 0)}</div>
                      <div className="cell-sub">{t('baseTariff')}</div>
                    </td>
                    <td className="text-right" style={{ color: 'var(--text-secondary)', fontSize: '.78rem' }}>—</td>
                    {isProjectAdmin && (
                      <td style={{ textAlign: 'center' }}>
                        <div className="cell-actions">
                          <button
                            type="button"
                            className="edit-btn btn btn-ghost btn-xs btn-icon"
                            title={t('edit')}
                            aria-label={`${t('edit')} ${baseRecord.fecha}`}
                            onClick={() => onOpenEditRecord(baseRecord.id)}
                          >
                            <Pencil size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="del-btn btn btn-danger-outline btn-xs btn-icon"
                            title={t('delete')}
                            aria-label={`${t('delete')} ${baseRecord.fecha}`}
                            onClick={() => onDeleteRecord(baseRecord.id, baseRecord.fecha)}
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )}

                {tableData.map((row) => {
                  const inc = parseFloat(row.incPrecio) || 0;
                  const trendClass = inc > 0 ? 'down' : inc < 0 ? 'up' : '';
                  const isExpanded = Boolean(expandedRows[row.id]);

                  return (
                    <Fragment key={row.id || row.fecha}>
                      <tr
                        className={`data-row ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleRow(row.id)}
                      >
                        <td>
                          <div className="cell-period">
                            <div className="row-chevron" aria-hidden="true">
                              <ChevronRight size={12} />
                            </div>
                            <div>
                              <div className="cell-primary text-accent">{row.label}</div>
                              <div className="cell-sub">
                                {row.fecha} <span style={{ opacity: 0.7 }}>({row.daysInPeriod || 30}d)</span>
                              </div>
                              {(row.inverter_reset || row.meter_reset) && (
                                <div className="badges-inline">
                                  {row.inverter_reset && (
                                    <span className="badge-reset">
                                      <RotateCw size={10} aria-hidden="true" /> Inversor
                                    </span>
                                  )}
                                  {row.meter_reset && (
                                    <span className="badge-reset grid">
                                      <RotateCw size={10} aria-hidden="true" /> Red
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '.8rem' }}>
                          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{(row.lecturaRed || 0).toFixed(0)}</span>
                          <span style={{ opacity: 0.4, margin: '0 .25rem' }}>/</span>
                          <span style={{ color: 'var(--solar)', fontWeight: 600 }}>{(row.lecturaSolar || 0).toFixed(0)}</span>
                          <div className="cell-sub">Red / Solar</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="cell-primary">{fDec(row.consumoRed, 1)} <span className="unit">kWh</span></div>
                          <div className="cell-sub">{fDec(row.consumoDiario || 0, 1)} kWh/d</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="cell-primary text-solar">{fDec(row.prodBruta, 1)} <span className="unit">kWh</span></div>
                          <div className="cell-sub">{fDec(row.prodDiaria || 0, 1)} kWh/d</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="cell-primary text-accent">
                            {row.specificYield > 0 ? (
                              <>
                                {fDec(row.specificYield, 1)} <span className="unit">kWh/kWp</span>
                              </>
                            ) : '—'}
                          </div>
                          {row.hsp > 0 && (
                            <span
                              className={`health-pill ${row.healthScore || 'optimo'}`}
                              style={{ fontSize: '.65rem', padding: '.12rem .45rem', marginTop: '.2rem' }}
                            >
                              {fDec(row.hsp, 2)} HSP
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="cell-primary">{fCOP(row.precioKw || 0)}</div>
                          <div style={{ marginTop: '.15rem' }}>
                            <span className={`delta ${trendClass}`}>
                              {inc > 0 ? (
                                <TrendingUp size={11} aria-hidden="true" />
                              ) : inc < 0 ? (
                                <TrendingDown size={11} aria-hidden="true" />
                              ) : (
                                <Minus size={11} aria-hidden="true" />
                              )}
                              {' '}
                              {Math.abs(inc).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="cell-primary text-solar font-black">{fCOP(row.ahorroReal)}</div>
                          <div className="cell-sub text-solar">{fDec(row.autonomia, 0)}% solar</div>
                        </td>
                        {isProjectAdmin && (
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <div className="cell-actions">
                              <button
                                type="button"
                                className="edit-btn btn btn-ghost btn-xs btn-icon"
                                title={t('edit')}
                                aria-label={`${t('edit')} ${row.fecha}`}
                                onClick={() => onOpenEditRecord(row.id)}
                              >
                                <Pencil size={13} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="del-btn btn btn-danger-outline btn-xs btn-icon"
                                title={t('delete')}
                                aria-label={`${t('delete')} ${row.fecha}`}
                                onClick={() => onDeleteRecord(row.id, row.fecha)}
                              >
                                <Trash2 size={13} aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>

                      {isExpanded && (
                        <tr className="detail-row">
                          <td colSpan={isProjectAdmin ? 8 : 7}>
                            <div className="detail-inner">
                              <div className="detail-section">
                                <span className="detail-section-title">{t('pvEfficiency')}</span>
                                <div className="kv"><span>{t('totalConsumed')}:</span><strong>{fDec(row.consumoTotal, 1)} kWh</strong></div>
                                <div className="kv"><span>{t('solarAutonomy')}:</span><strong className="text-ai">{fDec(row.autonomia, 1)}%</strong></div>
                                <div className="kv"><span>{t('specificYieldShort')}:</span><strong className="text-accent">{fDec(row.specificYield || 0, 1)} kWh/kWp</strong></div>
                                <div className="kv"><span>{t('performanceRatio')}:</span><strong className="text-solar">{fDec(row.pr || 0, 1)}%</strong></div>
                              </div>
                              <div className="detail-section">
                                <span className="detail-section-title">{t('dailyBreakdown', { days: row.daysInPeriod || 30 })}</span>
                                <div className="kv"><span>{t('gridPower')}:</span><strong>{fDec(row.consumoDiario || 0, 1)} kWh/d</strong></div>
                                <div className="kv"><span>{t('solarGenCol')}:</span><strong className="text-solar">{fDec(row.prodDiaria || 0, 1)} kWh/d</strong></div>
                                <div className="kv"><span>{t('peakSunHours')}:</span><strong className="text-warning">{fDec(row.hsp || 0, 2)} HSP</strong></div>
                              </div>
                              <div className="detail-section">
                                <span className="detail-section-title">{t('ecoImpact')}</span>
                                <div className="kv"><span>{t('kwTariffCol')}:</span><strong>{fCOP(row.prevPrice || 0)}</strong></div>
                                <div className="kv"><span>{t('periodSavings')}:</span><strong className="text-solar">{fCOP(row.ahorroReal)}</strong></div>
                                <div className="kv"><span>CO₂:</span><strong className="text-solar">{fDec((row.prodBruta || 0) * 0.38, 1)} kg</strong></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
