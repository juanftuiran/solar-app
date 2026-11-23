/**
 * @module modal
 * @description Native <dialog> modal system for JF Solar Cloud with top-layer
 * animations, light-dismiss fallback, and accessible focus management.
 */

/** @type {Function|null} Active close callback */
let _onClose = null;
let _supportsDisplayTransition;

function _canTransitionDisplay() {
  if (_supportsDisplayTransition !== undefined) return _supportsDisplayTransition;
  if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  _supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return _supportsDisplayTransition;
}

function _supportsTopLayerExit() {
  return window.CSS?.supports?.('overlay', 'auto') && _canTransitionDisplay();
}

/**
 * Open a native <dialog> as a modal in the top layer and bind light-dismiss/exit fallbacks once.
 *
 * @param {HTMLDialogElement|null} dialog
 */
export function openDialog(dialog) {
  if (!dialog) return;
  bindDialogDismiss(dialog);
  if (!dialog.open) {
    dialog.removeAttribute('data-closing');
    dialog.showModal();
  }
}

/**
 * Close a native <dialog> smoothly, using a data-closing exit fallback where
 * discrete display / overlay transitions are not supported (e.g. Firefox/Safari).
 *
 * @param {HTMLDialogElement|null} dialog
 */
export async function closeDialog(dialog) {
  if (!dialog || !dialog.open) return;
  if (!_supportsTopLayerExit()) {
    if (dialog.hasAttribute('data-closing')) return;
    dialog.setAttribute('data-closing', '');
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 400)),
      ]);
    }
    if (!dialog.hasAttribute('data-closing')) return;
    dialog.removeAttribute('data-closing');
  }
  if (dialog.open) dialog.close();
}

/**
 * Bind native cancel interception (for smooth exit) and closedby="any" fallback once per <dialog>.
 *
 * @param {HTMLDialogElement|null} dialog
 * @param {Function} [onClose]
 */
export function bindDialogDismiss(dialog, onClose) {
  if (!dialog) return;
  if (onClose) dialog._onDialogClose = onClose;
  if (dialog.dataset.dialogBound === '1') return;
  dialog.dataset.dialogBound = '1';

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog(dialog);
  });

  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
    if (typeof dialog._onDialogClose === 'function') {
      dialog._onDialogClose();
    }
  });

  if (!('closedBy' in HTMLDialogElement.prototype) && dialog.getAttribute('closedby') === 'any') {
    const outside = (e) => {
      const box = dialog.querySelector('.modal-box') || dialog;
      const r = box.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = outside(e);
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && outside(e)) closeDialog(dialog);
      pressedOutside = false;
    });
  }
}

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

  let dialog = document.getElementById('global-modal');
  if (!dialog) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = getModalContainer();
    document.body.appendChild(wrapper.firstElementChild);
    dialog = document.getElementById('global-modal');
  }

  dialog.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title" id="global-modal-title">
          <div class="icon-tile sm accent" aria-hidden="true"><i class="fa-solid fa-solar-panel"></i></div>
          <div>
            <span class="lang-es">${titleEs}</span>
            <span class="lang-en">${titleEn}</span>
          </div>
        </h2>
        <button
          id="global-modal-close-btn"
          class="modal-close-btn"
          type="button"
          aria-label="Cerrar"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div id="global-modal-body">${bodyHTML}</div>
    </div>
  `;

  document.getElementById('global-modal-close-btn')
    ?.addEventListener('click', closeModal);

  bindDialogDismiss(dialog, () => {
    dialog.replaceChildren();
    if (typeof _onClose === 'function') {
      const cb = _onClose;
      _onClose = null;
      cb();
    }
  });

  openDialog(dialog);
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
 * @param {boolean} [opts.isDanger=true]
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
      <p style="color:var(--text-secondary);font-size:.88rem;line-height:1.55;">
        <span class="lang-es">${messageEs}</span>
        <span class="lang-en">${messageEn}</span>
      </p>
      <div class="form-actions">
        <button id="modal-confirm-cancel-btn" type="button" class="btn btn-ghost" autofocus>
          <span class="lang-es">Cancelar</span>
          <span class="lang-en">Cancel</span>
        </button>
        <button id="modal-confirm-action-btn" type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-accent'}">
          <i class="fa-solid ${isDanger ? 'fa-trash' : 'fa-check'}" aria-hidden="true"></i>
          <span class="lang-es">${confirmBtnEs}</span>
          <span class="lang-en">${confirmBtnEn}</span>
        </button>
      </div>
    </div>
  `;

  showModal(titleEs, titleEn, bodyHTML);

  document.getElementById('modal-confirm-cancel-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-confirm-action-btn')?.addEventListener('click', async () => {
    await closeModal();
    if (typeof onConfirm === 'function') {
      await onConfirm();
    }
  });
}

/**
 * Close and hide the global modal.
 */
export async function closeModal() {
  const dialog = document.getElementById('global-modal');
  if (dialog) {
    await closeDialog(dialog);
  }
}

/**
 * Returns the modal container HTML string to embed in a page layout.
 *
 * @returns {string} HTML string with the native dialog container
 */
export function getModalContainer() {
  return '<dialog id="global-modal" class="modal-dialog" closedby="any" aria-labelledby="global-modal-title"></dialog>';
}
