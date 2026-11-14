import { escapeHtml } from '../../core/dom.js';
import { icon } from './icons.js';

const ICON_BY_TYPE = {
  success: 'check-circle',
  error: 'alert-octagon',
  info: 'info',
};

const DEFAULT_DURATION = {
  success: 3500,
  error: 5500,
  info: 3500,
};

function getRoot() {
  const root = document.getElementById('toast-root');
  if (!root) {
    throw new Error('Toast root element (#toast-root) not found.');
  }
  return root;
}

function dismiss(element) {
  if (!element.isConnected || element.classList.contains('is-leaving')) {
    return;
  }
  element.classList.add('is-leaving');
  const remove = () => element.remove();
  element.addEventListener('animationend', remove, { once: true });
  window.setTimeout(remove, 400);
}

/**
 * Display a transient notification.
 *
 * @param {string} message
 * @param {object} [options]
 * @param {'success'|'error'|'info'} [options.type]
 * @param {number} [options.duration] milliseconds before auto-dismiss
 */
export function show(message, { type = 'info', duration } = {}) {
  const root = getRoot();
  const element = document.createElement('div');
  element.className = `toast toast--${type}`;
  element.setAttribute('role', type === 'error' ? 'alert' : 'status');
  element.innerHTML = `
    <span class="toast__icon">${icon(ICON_BY_TYPE[type] ?? 'info')}</span>
    <span class="toast__message">${escapeHtml(message)}</span>`;

  root.appendChild(element);
  element.addEventListener('click', () => dismiss(element));

  const timeout = duration ?? DEFAULT_DURATION[type] ?? DEFAULT_DURATION.info;
  window.setTimeout(() => dismiss(element), timeout);

  return element;
}

export const toast = {
  show,
  success: (message, options = {}) => show(message, { ...options, type: 'success' }),
  error: (message, options = {}) => show(message, { ...options, type: 'error' }),
  info: (message, options = {}) => show(message, { ...options, type: 'info' }),
};