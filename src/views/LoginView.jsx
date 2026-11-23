import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  Cloud,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  PieChart,
  ShieldCheck,
  Sun,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function LoginView({ onSignedIn }) {
  const { t } = useApp();
  const { isConfigured, signIn } = useAuth();
  const { showToast } = useToast();

  const headingRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConfigured || !email.trim() || !password) return;

    setSubmitting(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.error || !result.user) {
        showToast(`${t('error')}: ${t('invalidCredentials')}`, 'error');
        return;
      }
      await onSignedIn?.(result.user, result.isAdmin);
    } catch (err) {
      showToast(`${t('error')}: ${err?.message || t('invalidCredentials')}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell" id="login-view">
      <div className="auth-hero">
        <div>
          <div className="auth-brand">
            <div className="brand-mark lg" aria-hidden="true">
              <Sun size={22} />
            </div>
            <div>
              <span className="auth-brand-name">JF Solar Cloud</span>
              <span className="brand-sub">Enterprise Telemetry</span>
            </div>
          </div>

          <h2>
            {t('heroHeadlinePrefix')}{' '}
            <span className="grad">{t('heroHeadlineAccent')}</span>
          </h2>
          <p className="lead">{t('heroLead')}</p>

          <div className="auth-features">
            <div className="auth-feature">
              <div className="icon-tile sm solar" aria-hidden="true"><Zap size={16} /></div>
              <div>
                <strong>{t('heroFeatIecTitle')}</strong>
                <span>{t('heroFeatIecDesc')}</span>
              </div>
            </div>

            <div className="auth-feature">
              <div className="icon-tile sm ai" aria-hidden="true"><Brain size={16} /></div>
              <div>
                <strong>{t('heroFeatWlsTitle')}</strong>
                <span>{t('heroFeatWlsDesc')}</span>
              </div>
            </div>

            <div className="auth-feature">
              <div className="icon-tile sm warning" aria-hidden="true"><PieChart size={16} /></div>
              <div>
                <strong>{t('heroFeatRoiTitle')}</strong>
                <span>{t('heroFeatRoiDesc')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-hero-foot">
          <span>{t('heroFooter')}</span>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-brand" style={{ marginBottom: '1.25rem' }}>
            <div className="brand-mark" aria-hidden="true">
              <Sun size={18} />
            </div>
            <div>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-strong)', display: 'block' }}>
                JF Solar Cloud
              </span>
              <span className="brand-sub">Cloud Analytics</span>
            </div>
          </div>

          <h1 ref={headingRef} tabIndex={-1} className="auth-title">
            {t('loginTitle')}
          </h1>
          <p className="auth-subtitle">{t('loginSubtitle')}</p>

          {!isConfigured ? (
            <div className="anomaly-banner warning" role="alert">
              <div className="anomaly-icon" aria-hidden="true">
                <AlertTriangle size={18} />
              </div>
              <div className="anomaly-content">
                <strong>{t('supabaseConfigMissingTitle')}</strong>
                <p>{t('supabaseConfigMissingDesc')}</p>
              </div>
            </div>
          ) : (
            <form id="login-form" autoComplete="on" className="form-stack" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="login-email">
                  <Mail size={14} className="text-accent" aria-hidden="true" />
                  <span>{t('email')}</span>
                </label>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  placeholder="nombre@empresa.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="login-password">
                  <Lock size={14} className="text-solar" aria-hidden="true" />
                  <span>{t('password')}</span>
                </label>
                <div className="input-with-action">
                  <input
                    type={showPass ? 'text' : 'password'}
                    id="login-password"
                    name="password"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    id="btn-toggle-password"
                    className="input-action-btn"
                    aria-label={t('togglePasswordVisibility')}
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-login"
                className="btn btn-accent btn-lg btn-block"
                style={{ marginTop: '.35rem' }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="spin" aria-hidden="true" />
                    <span>{t('connecting')}</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} aria-hidden="true" />
                    <span>{t('signInBtn')}</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="auth-trust">
            <span>
              <ShieldCheck size={14} className="text-solar" aria-hidden="true" />
              <span>{t('sslBadge')}</span>
            </span>
            <span aria-hidden="true">•</span>
            <span>
              <Cloud size={14} className="text-accent" aria-hidden="true" />
              <span>Supabase Cloud</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
