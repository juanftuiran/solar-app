import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export function Modal({
  open,
  onClose,
  title,
  titleId,
  icon = null,
  headerActions = null,
  maxWidth = '30rem',
  boxClassName = '',
  dialogId,
  children,
}) {
  const { t } = useApp();
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [open]);

  const handleCancel = (e) => {
    e.preventDefault();
    onClose?.();
  };

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      onClose?.();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      id={dialogId}
      className="modal-dialog"
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      {open && (
        <div className={`modal-box ${boxClassName}`.trim()} style={{ maxWidth }}>
          <div className="modal-header no-print">
            <h2 className="modal-title" id={titleId}>
              {icon}
              <span>{title}</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              {headerActions}
              <button
                type="button"
                className="modal-close-btn"
                onClick={onClose}
                aria-label={t('close')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isDanger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useApp();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      titleId="confirm-modal-title"
      maxWidth="25rem"
      icon={
        <div className={`icon-tile sm ${isDanger ? 'danger' : 'warning'}`} aria-hidden="true">
          <AlertTriangle size={16} />
        </div>
      }
    >
      <p className="confirm-message" style={{ marginBottom: '1.25rem' }}>
        {message}
      </p>
      <div className="confirm-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel || t('cancel')}
        </button>
        <button
          type="button"
          className={`btn ${isDanger ? 'btn-danger' : 'btn-accent'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {confirmLabel || t('delete')}
        </button>
      </div>
    </Modal>
  );
}
