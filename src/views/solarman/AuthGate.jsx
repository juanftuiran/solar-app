import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Eye,
  EyeOff,
  FlaskConical,
  Globe,
  Info,
  KeyRound,
  Lock,
  Mail,
  Network,
  PlugZap,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

export default function AuthGate({ project, error, onConnect, onActivateDemo }) {
  const { t } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [region, setRegion] = useState('global');
  const [orgId, setOrgId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      await onConnect({ email: email.trim(), password, region, orgId: orgId.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="solarman-view" className="stack">
      <div className="card section-card solarman-auth-card">
        <div className="section-head">
          <div className="section-head-title">
            <div className="icon-tile solar" aria-hidden="true"><Radio size={18} /></div>
            <div>
              <h2>{t('solarmanAuthTitle')}</h2>
              <p>{t('solarmanAuthSubtitle', { project: project?.name || 'este proyecto' })}</p>
            </div>
          </div>
          <span className="meta-chip accent">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>{t('solarmanShaBadge')}</span>
          </span>
        </div>

        <div className="solarman-methods-banner">
          <div className="solarman-method-pill">
            <KeyRound size={18} className="text-solar" aria-hidden="true" />
            <div>
              <strong>{t('solarmanOnDemandTitle')}</strong>
              <span>{t('solarmanOnDemandDesc')}</span>
            </div>
          </div>
          <div className="solarman-method-pill">
            <Network size={18} className="text-accent" aria-hidden="true" />
            <div>
              <strong>{t('solarmanMultiPlantTitle')}</strong>
              <span>{t('solarmanMultiPlantDesc')}</span>
            </div>
          </div>
        </div>

        <form id="solarman-auth-form" className="form-stack" style={{ marginTop: '1.25rem' }} onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="sm-email">
                <Mail size={14} className="text-accent" aria-hidden="true" />
                <span>{t('solarmanEmail')}</span>
              </label>
              <input
                type="email"
                id="sm-email"
                name="solarmanEmail"
                required
                spellCheck={false}
                autoComplete="username"
                enterKeyHint="next"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="sm-password">
                <Lock size={14} className="text-solar" aria-hidden="true" />
                <span>{t('solarmanPassword')}</span>
              </label>
              <div className="input-with-action">
                <input
                  type={showPass ? 'text' : 'password'}
                  id="sm-password"
                  name="solarmanPassword"
                  required
                  autoComplete="current-password"
                  enterKeyHint="done"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="input-action-btn"
                  aria-label={t('togglePasswordVisibility')}
                  aria-pressed={showPass}
                  onClick={() => setShowPass((v) => !v)}
                >
                  {showPass ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="sm-region">
                <Globe size={14} className="text-accent" aria-hidden="true" />
                <span>{t('solarmanRegion')}</span>
              </label>
              <select
                id="sm-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="global">Global / Américas · globalapi.solarmanpv.com</option>
                <option value="intl">Internacional / Legacy · api.solarmanpv.com</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="sm-org-id">
                <Building2 size={14} className="text-muted" aria-hidden="true" />
                <span>{t('solarmanOrgId')}</span>
              </label>
              <input
                type="text"
                id="sm-org-id"
                placeholder={t('solarmanOrgHint')}
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.78rem', color: 'var(--text-secondary)', paddingTop: '.25rem' }}>
            <Info size={14} className="text-accent" aria-hidden="true" />
            <span>{t('solarmanSessionNotice')}</span>
          </div>

          {error && (
            <div className="anomaly-banner warning" style={{ marginTop: '.25rem' }} role="alert">
              <div className="anomaly-icon" aria-hidden="true"><AlertTriangle size={18} /></div>
              <div className="anomaly-content">
                <strong>{t('solarmanAuthErrTitle')}</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="solarman-auth-actions">
            <button type="submit" id="btn-solarman-connect" className="btn btn-solar btn-lg" disabled={submitting}>
              <PlugZap size={16} aria-hidden="true" />
              <span>{submitting ? t('connecting') : t('solarmanConnectBtn')}</span>
            </button>

            <button
              type="button"
              id="btn-solarman-demo"
              className="btn btn-ghost btn-sm"
              onClick={onActivateDemo}
            >
              <FlaskConical size={15} className="text-ai" aria-hidden="true" />
              <span>{t('solarmanDemoBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
