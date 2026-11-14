/**
 * Domain error hierarchy.
 *
 * Services throw these errors; the presentation layer translates them into
 * user-facing messages. Keeping them separate from `Error` makes it possible
 * to distinguish expected business rule violations from programming errors.
 */

export class DomainError extends Error {
  /**
   * @param {string} message human readable message
   * @param {string} [code] stable machine-readable code
   */
  constructor(message, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

/** Raised when user input violates a domain invariant. */
export class ValidationError extends DomainError {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message, code);
  }
}

/** Raised when a requested entity does not exist. */
export class NotFoundError extends DomainError {
  constructor(message, code = 'NOT_FOUND') {
    super(message, code);
  }
}

/** Raised when an operation conflicts with the current state. */
export class ConflictError extends DomainError {
  constructor(message, code = 'CONFLICT') {
    super(message, code);
  }
}