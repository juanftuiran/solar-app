import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Brain,
  Cloud,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  PieChart,
  ShieldCheck,
  Sun,
  Zap,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProject } from '../context/ProjectContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function LoginView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, theme, toggleTheme, t } = useApp();
  const { isConfigured, signIn } = useAuth();
  const { loadProjects } = useProject();
  const { showToast } = useToast();

  const headingRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authFailure, setAuthFailure] = useState('');

  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const emailPatternValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showEmailError = (emailTouched || submitAttempted) && !emailPatternValid;
  const showPassError = (passTouched || submitAttempted) && password.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setAuthFailure('');

    if (!isConfigured) return;

    if (!emailPatternValid) {
      emailInputRef.current?.focus();
      return;
    }
    if (!password) {
      passwordInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.error || !result.user) {
        const msg = t('invalidCredentials');
        setAuthFailure(msg);
        showToast(`${t('error')}: ${msg}`, 'error');
        return;
      }

      const from = location.state?.from;
      if (from && typeof from === 'string' && !from.startsWith('/login')) {
        navigate(from, { replace: true });
        return;
      }

      const list = await loadProjects(result.user, result.isAdmin);
      if (!result.isAdmin && Array.isArray(list) && list.length === 1) {
        navigate(`/projects/${list[0].id}/telemetry`, { replace: true });
      } else {
        navigate('/projects', { replace: true });
      }
    } catch (err) {
      const msg = err?.message || t('invalidCredentials');
      setAuthFailure(msg);
      showToast(`${t('error')}: ${msg}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const flagCode = lang === 'en' ? 'us' : 'co';
  const langLabel = lang === 'en' ? 'EN' : 'ES';

  return (
    <div className="auth-shell" id="login-view">
      <div className="auth-hero">
        <div className="auth-grid-bg" aria-hidden="true" />

        <div className="auth-hero-top">
          <div className="auth-brand">
            <div className="brand-mark lg" aria-hidden="true">
              <Sun size={22} />
            </div>
            <div>
              <span className="auth-brand-name">JF Solar Cloud</span>
              <span className="brand-sub">Enterprise Solar Intelligence</span>
            </div>
          </div>

          <h2>
            {t('heroHeadlinePrefix')}{' '}
            <span className="grad">{t('heroHeadlineAccent')}</span>
          </h2>
          <p className="lead">{t('heroLead')}</p>

          <div className="auth-preview-card" aria-hidden="true">
            <div className="auth-preview-head">
              <div className="auth-preview-title">
                <span className="online-dot" />
                <span>{lang === 'en' ? 'Live Telemetry Snapshot' : 'Vista Previa de Telemetría'}</span>
              </div>
              <span className="meta-chip solar">IEC 61724</span>
            </div>

            <div className="auth-preview-metrics">
              <div className="auth-preview-kpi">
                <span className="lbl">{lang === 'en' ? 'Solar Output' : 'Potencia Solar'}</span>
                <strong className="val text-solar">4.82 kW</strong>
              </div>
              <div className="auth-preview-kpi">
                <span className="lbl">{lang === 'en' ? 'Autonomy' : 'Autonomía'}</span>
                <strong className="val text-accent">86.4%</strong>
              </div>
              <div className="auth-preview-kpi">
                <span className="lbl">{lang === 'en' ? 'Efficiency' : 'Eficiencia'}</span>
                <strong className="val text-strong">94.2%</strong>
              </div>
            </div>

            <div className="auth-preview-chart">
              <svg viewBox="0 0 360 88" preserveAspectRatio="none" className="auth-preview-svg">
                <defs>
                  <linearGradient id="loginSolarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--solar)" stopOpacity="0.34" />
                    <stop offset="100%" stopColor="var(--solar)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 78 C36 76, 62 66, 92 48 C124 28, 152 14, 184 16 C216 18, 244 38, 276 52 C308 66, 336 74, 360 76 L360 88 L0 88 Z"
                  fill="url(#loginSolarGrad)"
                />
                <path
                  d="M0 78 C36 76, 62 66, 92 48 C124 28, 152 14, 184 16 C216 18, 244 38, 276 52 C308 66, 336 74, 360 76"
                  fill="none"
                  stroke="var(--solar)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="184" cy="16" r="4.5" fill="var(--solar)" />
                <circle cx="184" cy="16" r="9" fill="var(--solar)" fillOpacity="0.22" />
              </svg>
            </div>
          </div>

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
          <Activity size={14} className="text-solar" aria-hidden="true" />
          <span>{t('heroFooter')}</span>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-topbar">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={toggleTheme}
            title={t('toggleTheme')}
            aria-label={t('toggleTheme')}
          >
            {theme === 'light' ? (
              <Moon size={16} className="text-accent" aria-hidden="true" />
            ) : (
              <Sun size={16} className="text-warning" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            className="lang-btn"
            style={{ height: '2rem', padding: '0 .65rem' }}
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            title={t('switchLanguage')}
            aria-label={t('switchLanguage')}
          >
            <img src={`https://flagcdn.com/w20/${flagCode}.png`} className="flag-img" alt="" />
            <span>{langLabel}</span>
          </button>
        </div>

        <div className="card auth-card">
          <div className="auth-brand auth-mobile-brand" style={{ marginBottom: '1.25rem' }}>
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
            <form id="login-form" autoComplete="on" className="form-stack" onSubmit={handleSubmit} noValidate>
              {authFailure && (
                <div className="anomaly-banner warning" role="alert">
                  <div className="anomaly-icon" aria-hidden="true">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="anomaly-content">
                    <strong>{t('error')}</strong>
                    <p>{authFailure}</p>
                  </div>
                </div>
              )}

              <div className="field">
                <label htmlFor="login-email">
                  <Mail size={14} className="text-accent" aria-hidden="true" />
                  <span>{t('email')}</span>
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  id="login-email"
                  name="email"
                  placeholder="nombre@empresa.com"
                  required
                  spellCheck={false}
                  autoComplete="username"
                  enterKeyHint="next"
                  aria-invalid={showEmailError ? 'true' : 'false'}
                  aria-describedby={showEmailError ? 'login-email-error' : undefined}
                  className={showEmailError ? 'user-invalid-fallback' : ''}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (authFailure) setAuthFailure('');
                  }}
                  onBlur={() => setEmailTouched(true)}
                />
                {showEmailError && (
                  <div id="login-email-error" className="field-error">
                    <AlertCircle size={13} aria-hidden="true" />
                    <span>{t('emailValidationErr')}</span>
                  </div>
                )}
              </div>

              <div className="field">
                <label htmlFor="login-password">
                  <Lock size={14} className="text-solar" aria-hidden="true" />
                  <span>{t('password')}</span>
                </label>
                <div className="input-with-action">
                  <input
                    ref={passwordInputRef}
                    type={showPass ? 'text' : 'password'}
                    id="login-password"
                    name="password"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    enterKeyHint="done"
                    aria-invalid={showPassError ? 'true' : 'false'}
                    aria-describedby={showPassError ? 'login-password-error' : undefined}
                    className={showPassError ? 'user-invalid-fallback' : ''}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (authFailure) setAuthFailure('');
                    }}
                    onBlur={() => setPassTouched(true)}
                  />
                  <button
                    type="button"
                    id="btn-toggle-password"
                    className="input-action-btn"
                    aria-label={t('togglePasswordVisibility')}
                    aria-pressed={showPass}
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
                {showPassError && (
                  <div id="login-password-error" className="field-error">
                    <AlertCircle size={13} aria-hidden="true" />
                    <span>{t('passwordValidationErr')}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                id="btn-login"
                className="btn btn-solar btn-lg btn-block"
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
                    <span>{t('signInBtn')}</span>
                    <ArrowRight size={16} aria-hidden="true" />
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
            <span aria-hidden="true">·</span>
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
