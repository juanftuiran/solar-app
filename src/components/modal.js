/**
 * @module modal
 * @description Reusable modal dialog system for JF Solar Cloud.
 * Creates, shows, and hides a global modal overlay with bilingual title support.
 */

/** @type {Function|null} Active close callback */
let _onClose = null;

/**
 * Show a modal dialog with the given bilingual title and body HTML.
 * If the modal container does not exist in the DOM it will be created automatically.
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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
        <h2 style="font-size:1.125rem;font-weight:700;color:#e2e8f0;">
          <span class="lang-es">${titleEs}</span>
          <span class="lang-en">${titleEn}</span>
        </h2>
        <button
          id="global-modal-close-btn"
          type="button"
          style="background:none;border:none;color:#64748b;font-size:1.25rem;cursor:pointer;padding:.25rem;"
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
}

/**
 * Close and hide the global modal. Invokes the registered onClose callback if set.
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
 * The overlay starts hidden and is populated dynamically by `showModal()`.
 *
 * @returns {string} HTML string with the modal overlay container
 */
export function getModalContainer() {
  return '<div id="global-modal" class="modal-overlay hidden"></div>';
}

/* ── Private helpers ──────────────────────────────────────────────────────── */

/**
 * Handle clicks on the overlay backdrop to close the modal.
 * @param {MouseEvent} e
 * @private
 */
function _handleOverlayClick(e) {
  if (e.target.id === 'global-modal') {
    closeModal();
  }
}
