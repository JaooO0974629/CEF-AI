import { escapeHtml } from '../../core/dom.js';
import { icon } from './icons.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let activeModal = null;
let previouslyFocused = null;

/**
 * Open a modal dialog.
 *
 * Only one dialog is visible at a time. The dialog traps focus, closes on
 * Escape or backdrop click, and restores focus to the invoking element.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.body] HTML for the dialog body
 * @param {string} [options.footer] HTML for the dialog footer
 * @param {'sm'|'md'|'lg'} [options.size]
 * @param {(body: HTMLElement, controller: ModalController) => void} [options.onMount]
 * @param {() => void} [options.onClose]
 * @returns {ModalController}
 */
export function openModal({ title, body = '', footer = '', size = 'md', onMount, onClose } = {}) {
  const root = document.getElementById('modal-root');
  if (!root) {
    throw new Error('Modal root element (#modal-root) not found.');
  }

  closeModal({ silent: true });
  previouslyFocused = document.activeElement;

  const layer = document.createElement('div');
  layer.className = 'modal-layer';
  layer.innerHTML = `
    <div class="modal modal--${size}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="modal__header">
        <h2 class="modal__title">${escapeHtml(title)}</h2>
        <button type="button" class="modal__close" data-modal-close aria-label="Fechar">
          ${icon('x')}
        </button>
      </div>
      <div class="modal__body custom-scroll"></div>
      ${footer ? `<div class="modal__footer">${footer}</div>` : ''}
    </div>`;

  const bodyElement = layer.querySelector('.modal__body');
  bodyElement.innerHTML = body;
  root.appendChild(layer);

  const controller = {
    root: layer,
    body: bodyElement,
    close: () => closeModal(),
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = [...layer.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
      (element) => element.offsetParent !== null,
    );
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  layer.addEventListener('click', (event) => {
    if (event.target === layer) {
      closeModal();
    }
  });

  layer.querySelectorAll('[data-modal-close]').forEach((button) => {
    button.addEventListener('click', () => closeModal());
  });

  document.addEventListener('keydown', handleKeydown);
  activeModal = { layer, handleKeydown, onClose };

  window.requestAnimationFrame(() => {
    const target = bodyElement.querySelector(FOCUSABLE_SELECTOR) ?? layer.querySelector(FOCUSABLE_SELECTOR);
    target?.focus();
  });

  onMount?.(bodyElement, controller);

  return controller;
}

/**
 * Close the active dialog.
 * @param {object} [options]
 * @param {boolean} [options.silent] skip the `onClose` callback and focus restore
 */
export function closeModal({ silent = false } = {}) {
  if (!activeModal) {
    return;
  }

  const { layer, handleKeydown, onClose } = activeModal;
  document.removeEventListener('keydown', handleKeydown);
  layer.remove();
  activeModal = null;

  if (!silent) {
    onClose?.();
    if (previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  }
}

/** Whether a dialog is currently open. */
export function isModalOpen() {
  return activeModal !== null;
}