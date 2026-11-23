import React from 'react';
import { RefreshCw, Sun, WifiOff, Inbox } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

/**
 * Differentiated loading, empty, network error, and no-readings state panels.
 */
export default function StatePanel({
  variant = 'empty', // 'loading' | 'empty' | 'error' | 'no-readings'
  title,
  description,
  icon = null,
  action = null,
  onRetry = null,
  minHeight = '14rem',
}) {
  const { t } = useApp();

  if (variant === 'loading') {
    return (
      <div className="state-skeleton-grid" style={{ minHeight }} aria-busy="true" aria-label={t('loading')}>
        <div className="card skeleton-card">
          <div className="skeleton-line w-40" />
          <div className="skeleton-line w-70" />
          <div className="skeleton-line w-55" />
        </div>
        <div className="card skeleton-card">
          <div className="skeleton-line w-40" />
          <div className="skeleton-line w-70" />
          <div className="skeleton-line w-55" />
        </div>
        <div className="card skeleton-card">
          <div className="skeleton-line w-40" />
          <div className="skeleton-line w-70" />
          <div className="skeleton-line w-55" />
        </div>
      </div>
    );
  }

  const defaultIcon = variant === 'error'
    ? <WifiOff size={32} aria-hidden="true" />
    : variant === 'no-readings'
      ? <Inbox size={32} aria-hidden="true" />
      : <Sun size={32} aria-hidden="true" />;

  const toneClass = variant === 'error' ? 'text-danger' : 'text-solar';

  return (
    <div className={`empty-state state-panel state-panel--${variant}`} style={{ minHeight }}>
      <div className={`empty-icon ${toneClass}`}>{icon || defaultIcon}</div>
      <h3>{title || (variant === 'error' ? t('networkErrorTitle') : t('noData'))}</h3>
      {description && <p>{description}</p>}
      <div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
        {variant === 'error' && onRetry && (
          <button type="button" className="btn btn-accent" onClick={onRetry}>
            <RefreshCw size={15} aria-hidden="true" />
            <span>{t('retry')}</span>
          </button>
        )}
        {action}
      </div>
    </div>
  );
}
