import { ValidationError } from './errors.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Assert that a value is a non-empty string. Returns the trimmed value. */
export function requireText(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} é obrigatório.`);
  }
  return value.trim();
}

/** Assert that a value is an integer greater than or equal to zero. */
export function requireNonNegativeInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ValidationError(`${field} deve ser um número inteiro maior ou igual a zero.`);
  }
  return parsed;
}

/** Assert that a value is an integer greater than zero. */
export function requirePositiveInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${field} deve ser um número inteiro maior que zero.`);
  }
  return parsed;
}

/** Assert that a value is an ISO date (YYYY-MM-DD). Returns the value. */
export function requireIsoDate(value, field) {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    throw new ValidationError(`${field} deve ser uma data válida.`);
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${field} deve ser uma data válida.`);
  }
  return value;
}

/** Assert that a date is not before another date. */
export function requireChronologicalOrder(startDate, endDate, startLabel, endLabel) {
  if (endDate < startDate) {
    throw new ValidationError(`${endLabel} não pode ser anterior a ${startLabel}.`);
  }
}

/** Assert that a value is one of the allowed options. */
export function requireOneOf(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${field} deve ser um dos valores: ${allowed.join(', ')}.`);
  }
  return value;
}