/**
 * @module app/ui
 * @description Shared UI helpers: toast notifications, theme/kiosk mode toggles, and text setter.
 */

import { state, savePrefs } from '../modules/state.js';
import { t } from '../modules/i18n.js';

export const setText = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
};

export function showToast(message, type = 'info', duration = 3200) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-info';
  toast.innerHTML = `
    <div class="toast-icon"><i class="fa-solid ${icon}"></i></div>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

export function applyTheme(theme) {
  state.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  savePrefs();
}

export function toggleKioskMode(forceState) {
  const next = typeof forceState === 'boolean' ? forceState : !state.kioskMode;
  state.kioskMode = next;
  document.body.classList.toggle('kiosk-mode', next);
  const kioskBar = document.getElementById('kiosk-floating-bar');
  if (kioskBar) kioskBar.classList.toggle('hidden', !next);

  if (!next && state.kioskTimer) {
    clearInterval(state.kioskTimer);
    state.kioskTimer = null;
  }

  if (next) {
    document.documentElement.requestFullscreen?.().catch(() => {});
    showToast(
      state.lang === 'en' ? 'Presentation Mode Activated (ESC to exit)' : 'Modo Presentación Activado',
      'info',
    );
  } else if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }

  setTimeout(() => {
    Object.values(state.charts).forEach((c) => c?.resize?.());
  }, 120);
}

export function formatAppError(err) {
  return `${t('error')}: ${err?.message || err}`;
}
