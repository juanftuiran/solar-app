/**
 * @module modal
 * @description Reusable modal dialog system for JF Solar Cloud.
 * Supports standard modals, rich confirmation dialogs, and ESC key dismissal.
 */

/** @type {Function|null} Active close callback */
let _onClose = null;
let _escBound = false;

/**
 * Show a modal dialog with the given bilingual title and body HTML.
 *
 * @param {string} titleEs - Spanish title text
 * @param {string} titleEn - English title text
 * @param {string} bodyHTML - Inner HTML to render inside the modal body
 * @param {Function} [onClose] - Optional callback invoked when the modal is closed
 */
export function showModal(titleEs, titleEn, bodyHTML, onClose) {
  _onClose = onClose || null;

  let overlay = document.getElementById('global-modal');
  if (!overlay) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = getModalContainer();
    document.body.appendChild(wrapper.firstElementChild);
    overlay = document.getElementById('global-modal');
  }

  overlay.innerHTML = `
    <div class="modal-box" style="position:relative;">
      <div class="modal-header">
        <h2 class="modal-title">
          <span class="lang-es">${titleEs}</span>
          <span class="lang-en">${titleEn}</span>
        </h2>
        <button
          id="global-modal-close-btn"
          class="modal-close-btn"
          type="button"
          aria-label="Close"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div id="global-modal-body">${bodyHTML}</div>
    </div>
  `;

  overlay.classList.remove('hidden');

  // Bind close button
  document.getElementById('global-modal-close-btn')
    ?.addEventListener('click', closeModal);

  // Close on overlay click (outside the box)
  overlay.addEventListener('click', _handleOverlayClick);

  // Bind ESC key once
  if (!_escBound) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
    _escBound = true;
  }
}

/**
 * Show a rich confirmation dialog modal.
 *
 * @param {Object} opts
 * @param {string} opts.titleEs
 * @param {string} opts.titleEn
 * @param {string} opts.messageEs
 * @param {string} opts.messageEn
 * @param {string} [opts.confirmBtnEs='Confirmar']
 * @param {string} [opts.confirmBtnEn='Confirm']
 * @param {boolean} [opts.isDanger=false]
 * @param {Function} opts.onConfirm
 */
export function showConfirmModal({
  titleEs = 'Confirmar Acción',
  titleEn = 'Confirm Action',
  messageEs = '¿Estás seguro de continuar?',
  messageEn = 'Are you sure you want to proceed?',
  confirmBtnEs = 'Confirmar',
  confirmBtnEn = 'Confirm',
  isDanger = true,
  onConfirm,
}) {
  const bodyHTML = `
    <div style="display:flex;flex-direction:column;gap:1.25rem;">
      <p style="color:var(--text-secondary);font-size:.9rem;line-height:1.5;">
        <span class="lang-es">${messageEs}</span>
        <span class="lang-en">${messageEn}</span>
      </p>
      <div style="display:flex;justify-content:flex-end;gap:.75rem;margin-top:.5rem;">
        <button id="modal-confirm-cancel-btn" type="button" class="btn btn-ghost">
          <span class="lang-es">Cancelar</span>
          <span class="lang-en">Cancel</span>
        </button>
        <button id="modal-confirm-action-btn" type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-accent'}">
          <i class="fa-solid ${isDanger ? 'fa-trash' : 'fa-check'}"></i>
          <span class="lang-es">${confirmBtnEs}</span>
          <span class="lang-en">${confirmBtnEn}</span>
        </button>
      </div>
    </div>
  `;

  showModal(titleEs, titleEn, bodyHTML);

  setTimeout(() => {
    document.getElementById('modal-confirm-cancel-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-confirm-action-btn')?.addEventListener('click', async () => {
      closeModal();
      if (typeof onConfirm === 'function') {
        await onConfirm();
      }
    });
  }, 50);
}

/**
 * Close and hide the global modal.
 */
export function closeModal() {
  const overlay = document.getElementById('global-modal');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    overlay.removeEventListener('click', _handleOverlayClick);
  }

  if (typeof _onClose === 'function') {
    const cb = _onClose;
    _onClose = null;
    cb();
  }
}

/**
 * Returns the modal container HTML string to embed in a page layout.
 *
 * @returns {string} HTML string with the modal overlay container
 */
export function getModalContainer() {
  return '<div id="global-modal" class="modal-overlay hidden"></div>';
}

/* ── Private helpers ──────────────────────────────────────────────────────── */

function _handleOverlayClick(e) {
  if (e.target.id === 'global-modal') {
    closeModal();
  }
}
