/**
 * DOM helpers.
 *
 * Framework-free utilities for querying, delegating events and producing safe
 * HTML. All dynamic values rendered through these helpers must be escaped.
 */

/** Query a single element. */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/** Query all matching elements as a real array. */
export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

const ESCAPE_PATTERN = /[&<>"']/g;
const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a value for safe interpolation into HTML text or attributes. */
export function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(ESCAPE_PATTERN, (character) => ESCAPE_MAP[character]);
}

/**
 * Attach a delegated listener. The handler only runs when the event target is
 * inside an element matching `selector`.
 *
 * @returns {() => void} cleanup function
 */
export function delegate(root, eventName, selector, handler, options) {
  const listener = (event) => {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (target && root.contains(target)) {
      handler(event, target);
    }
  };

  root.addEventListener(eventName, listener, options);
  return () => root.removeEventListener(eventName, listener, options);
}

/** Attach a direct listener and return a cleanup function. */
export function on(target, eventName, handler, options) {
  target.addEventListener(eventName, handler, options);
  return () => target.removeEventListener(eventName, handler, options);
}

/** Toggle a class based on a condition. */
export function toggleClass(element, className, force) {
  if (!element) {
    return;
  }
  element.classList.toggle(className, Boolean(force));
}