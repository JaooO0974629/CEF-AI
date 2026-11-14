/**
 * Formatting helpers for dates, names and text.
 */

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Format an ISO date (YYYY-MM-DD) as DD/MM/YYYY. */
export function formatDate(isoDate) {
  if (!isoDate) {
    return '-';
  }
  const match = ISO_DATE_PATTERN.exec(String(isoDate));
  if (!match) {
    return String(isoDate);
  }
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** Format an ISO date with time for report headers. */
export function formatDateTime(date = new Date()) {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Today's date in local time as an ISO date string (YYYY-MM-DD). */
export function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Whether an ISO date is strictly before today (local midnight). */
export function isOverdue(isoDate) {
  const match = ISO_DATE_PATTERN.exec(String(isoDate || ''));
  if (!match) {
    return false;
  }
  const [, year, month, day] = match;
  const target = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
}

/** Build up to two initials from a person's name. */
export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

/** Pick singular or plural form based on a count. */
export function pluralize(count, singular, plural) {
  return Number(count) === 1 ? singular : plural;
}