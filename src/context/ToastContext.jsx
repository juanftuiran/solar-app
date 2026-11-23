import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { useApp } from './AppContext.jsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { t } = useApp();
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const hoveredRef = useRef(false);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const scheduleDismiss = useCallback((duration = 3800) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (hoveredRef.current) {
        scheduleDismiss(duration);
        return;
      }
      setToast(null);
    }, duration);
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3800) => {
    const id = Date.now();
    setToast({ id, message: String(message ?? ''), type });
    scheduleDismiss(duration);
  }, [scheduleDismiss]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <div
        className="toast-region"
        role="region"
        aria-label={t('notifications')}
        aria-live="polite"
      >
        {toast && (
          <div
            key={toast.id}
            className={`toast ${toast.type}`}
            role="status"
            onMouseEnter={() => { hoveredRef.current = true; }}
            onMouseLeave={() => { hoveredRef.current = false; }}
            onFocus={() => { hoveredRef.current = true; }}
            onBlur={() => { hoveredRef.current = false; }}
          >
            <div className="toast-icon" aria-hidden="true">
              {toast.type === 'success' ? (
                <Check size={16} />
              ) : toast.type === 'error' ? (
                <AlertTriangle size={16} />
              ) : (
                <Info size={16} />
              )}
            </div>
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={dismiss}
              aria-label={t('closeNotification')}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
