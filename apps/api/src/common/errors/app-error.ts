import type { ErrorCode } from '@huitong/shared';

/**
 * Base class for expected failures. The global exception filter turns it into
 * the error envelope with this status, code and (optional) details.
 */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationFailedError extends AppError {
  constructor(details: unknown, message = 'The request is invalid') {
    super('VALIDATION_FAILED', message, 400, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Sign in to continue') {
    super('UNAUTHENTICATED', message, 401);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('INVALID_CREDENTIALS', 'The email or password is incorrect', 401);
  }
}

export class SessionExpiredError extends AppError {
  constructor() {
    super('SESSION_EXPIRED', 'Your session has expired; sign in again', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do this') {
    super('FORBIDDEN', message, 403);
  }
}

export class CsrfInvalidError extends AppError {
  constructor() {
    super('CSRF_INVALID', 'The request is missing a valid CSRF token', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(what: string) {
    super('NOT_FOUND', `${what} was not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, 409, details);
  }
}

export class UpstreamUnavailableError extends AppError {
  constructor(system: string, details?: unknown) {
    super('UPSTREAM_UNAVAILABLE', `${system} did not respond as expected`, 502, details);
  }
}
