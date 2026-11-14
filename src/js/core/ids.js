/**
 * Identifier generation utilities.
 */

/** Deep clone a JSON-compatible value. */
export function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

/**
 * Extract the trailing integer from an identifier (e.g. `FR-101` -> `101`).
 * @returns {number} zero when no numeric suffix exists
 */
function trailingNumber(id) {
  const matches = String(id).match(/\d+(?!.*\d)/);
  return matches ? Number(matches[0]) : 0;
}

/**
 * Generate the next sequential identifier for a prefix.
 *
 * Only identifiers that already start with the prefix are considered, so
 * year-scoped prefixes such as `ALC-2026` do not collide with `ALC-2024`.
 *
 * @param {string} prefix e.g. `FR`, `CX-001` style prefixes are supported
 * @param {string[]} existingIds identifiers currently in use
 * @param {number} [padding] zero-padding width for the numeric suffix
 * @returns {string}
 */
export function nextId(prefix, existingIds, padding = 0) {
  const scoped = existingIds.filter((id) => String(id).startsWith(prefix));
  const highest = scoped.reduce((max, id) => Math.max(max, trailingNumber(id)), 0);
  const sequence = String(highest + 1).padStart(padding, '0');
  return `${prefix}-${sequence}`;
}