/**
 * @module app/ui
 * @description Shared UI helpers: top-layer popover toasts, ARIA validation sync,
 * theme/kiosk mode toggles, and text setter.
 */

import { state, savePrefs } from '../modules/state.js';
import { t } from '../modules/i18n.js';

export const setText = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
};

const _supportsPopover = () => Object.hasOwn(HTMLElement.prototype, 'popover');

function _getToastRegion() {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'toast-region';
    region.className = 'toast-region';
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', state.lang === 'en' ? 'Notifications' : 'Notificaciones');
    document.body.appendChild(region);
  }
  return region;
}

function _announceToast(message) {
  if (typeof document.ariaNotify === 'function') {
    document.ariaNotify(String(message));
    return;
  }
  let announcer = document.getElementById('toast-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'toast-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'visually-hidden';
    document.body.appendChild(announcer);
  }
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = String(message);
  });
}

export function showToast(message, type = 'info', duration = 3600) {
  const region = _getToastRegion();
  region.querySelectorAll('.toast').forEach((old) => {
    if (_supportsPopover() && old.matches(':popover-open')) {
      old.hidePopover?.();
    }
    old.remove();
  });

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('popover', 'manual');

  const iconWrap = document.createElement('div');
  iconWrap.className = 'toast-icon';
  iconWrap.setAttribute('aria-hidden', 'true');
  const iconEl = document.createElement('i');
  const icon = type === 'success' ? 'fa-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-info';
  iconEl.className = `fa-solid ${icon}`;
  iconWrap.appendChild(iconEl);

  const textSpan = document.createElement('span');
  textSpan.className = 'toast-message';
  textSpan.textContent = String(message ?? '');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', state.lang === 'en' ? 'Close notification' : 'Cerrar notificación');
  const closeIcon = document.createElement('i');
  closeIcon.className = 'fa-solid fa-xmark';
  closeIcon.setAttribute('aria-hidden', 'true');
  closeBtn.appendChild(closeIcon);

  toast.append(iconWrap, textSpan, closeBtn);
  region.appendChild(toast);

  if (_supportsPopover()) {
    try {
      toast.showPopover?.();
    } catch {
      // Fallback: CSS handles fixed positioning if top-layer promotion fails
    }
  }

  _announceToast(message);

  let timerId = null;
  const dismiss = () => {
    clearTimeout(timerId);
    if (!toast.isConnected) return;
    toast.classList.add('leaving');
    setTimeout(() => {
      if (_supportsPopover() && toast.matches(':popover-open')) {
        try { toast.hidePopover?.(); } catch { /* noop */ }
      }
      toast.remove();
    }, 220);
  };

  const scheduleDismiss = () => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      if (toast.matches(':focus-within') || toast.matches(':hover')) {
        scheduleDismiss();
        return;
      }
      dismiss();
    }, duration);
  };

  closeBtn.addEventListener('click', dismiss);
  toast.addEventListener('focusout', () => {
    if (!toast.matches(':focus-within')) scheduleDismiss();
  });

  scheduleDismiss();
}

let _ariaSyncBound = false;

/**
 * Synchronize aria-invalid with CSS :user-invalid across all form controls
 * so assistive tech only announces errors after user interaction or submit.
 */
export function initFormAriaSync() {
  const supportsUserInvalid = window.CSS?.supports?.('selector(:user-invalid)');
  const flagged = new WeakSet();
  const dirtyState = new WeakMap();

  const syncEl = (el) => {
    if (!el?.matches?.('input, select, textarea') || el.type === 'hidden') return;
    let invalid = false;
    if (supportsUserInvalid) {
      invalid = el.matches(':user-invalid');
    } else {
      const st = dirtyState.get(el);
      invalid = !!(st?.hasInteracted && st?.hasBlurred && !el.validity.valid);
      el.classList.toggle('user-invalid-fallback', invalid);
      el.classList.toggle('user-valid-fallback', !!(st?.hasInteracted && st?.hasBlurred && el.validity.valid));
    }

    if (invalid) {
      el.setAttribute('aria-invalid', 'true');
      flagged.add(el);
    } else if (flagged.has(el) || el.getAttribute('aria-invalid') !== 'true') {
      el.setAttribute('aria-invalid', 'false');
      flagged.delete(el);
    }
  };

  document.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.type !== 'hidden' && !el.hasAttribute('aria-invalid')) {
      el.setAttribute('aria-invalid', 'false');
    }
  });

  if (_ariaSyncBound) return;
  _ariaSyncBound = true;

  document.addEventListener('blur', (e) => {
    if (!supportsUserInvalid && e.target?.matches?.('input, select, textarea')) {
      const st = dirtyState.get(e.target) || { hasInteracted: false, hasBlurred: false };
      st.hasBlurred = true;
      dirtyState.set(e.target, st);
    }
    syncEl(e.target);
  }, true);

  document.addEventListener('input', (e) => {
    if (!supportsUserInvalid && e.target?.matches?.('input, select, textarea')) {
      const st = dirtyState.get(e.target) || { hasInteracted: false, hasBlurred: false };
      st.hasInteracted = true;
      dirtyState.set(e.target, st);
    }
    if (e.target?.hasAttribute?.('aria-invalid')) syncEl(e.target);
  });

  document.addEventListener('change', (e) => syncEl(e.target), true);

  document.addEventListener('invalid', (e) => {
    if (!supportsUserInvalid && e.target?.matches?.('input, select, textarea')) {
      dirtyState.set(e.target, { hasInteracted: true, hasBlurred: true });
    }
    syncEl(e.target);
  }, true);

  document.addEventListener('reset', (e) => {
    setTimeout(() => {
      [...(e.target?.elements || [])].forEach((el) => {
        dirtyState.delete(el);
        el.classList?.remove('user-invalid-fallback', 'user-valid-fallback');
        syncEl(el);
      });
    });
  }, true);
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
