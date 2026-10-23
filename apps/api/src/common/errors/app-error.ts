import type { ErrorCode, SampleEncodingReadings } from '@huitong/shared';

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

/** A file connector has no staged file to sync: none was staged, it expired, or it was discarded. */
export class ImportFileMissingError extends AppError {
  constructor(connectorId: string) {
    super(
      'IMPORT_FILE_MISSING',
      `No file is staged for ${connectorId}, or it expired: stage the file again`,
      409,
    );
  }
}

/** A file connector's staged file was read by a mapping version that is no longer active. */
export class ImportFileOutdatedError extends AppError {
  constructor() {
    super(
      'IMPORT_FILE_OUTDATED',
      'The mapping changed after the file was staged, so the file has to be staged again',
      409,
    );
  }
}

/** A connector runs one sync at a time, and its staged file stays put while one runs. */
export class SyncInProgressError extends AppError {
  constructor(message: string, details?: unknown) {
    super('SYNC_IN_PROGRESS', message, 409, details);
  }
}

/**
 * A head-start route whose behaviour belongs to an area's owner and is not
 * built yet (CLAUDE.md section 4). The contract is fixed; nothing is changed.
 */
export class NotImplementedError extends AppError {
  constructor(what: string, owner: string) {
    super('NOT_IMPLEMENTED', `${what} is not built yet; ${owner} implements it`, 501);
  }
}

export class UpstreamUnavailableError extends AppError {
  constructor(system: string, details?: unknown) {
    super('UPSTREAM_UNAVAILABLE', `${system} did not respond as expected`, 502, details);
  }
}

export class WebhookSignatureInvalidError extends AppError {
  constructor() {
    super('WEBHOOK_SIGNATURE_INVALID', 'The webhook signature is missing, stale or wrong', 401);
  }
}

export class AiOutputInvalidError extends AppError {
  constructor() {
    super('AI_OUTPUT_INVALID', 'The language model returned something HuiTong could not use', 502);
  }
}

/** A CSV sample's bytes read sensibly in more than one encoding; HR chooses the reading that looks right. */
export class SampleEncodingUncertainError extends AppError {
  constructor(readings: SampleEncodingReadings['readings']) {
    super(
      'SAMPLE_ENCODING_UNCERTAIN',
      'The file could be read in more than one encoding; choose the reading whose headers look right',
      422,
      { readings },
    );
  }
}

/** A CSV sample in an encoding HuiTong does not read: only UTF-8 and GB18030 (which includes GBK). */
export class SampleEncodingUnsupportedError extends AppError {
  constructor(
    message = 'The file is not UTF-8 or GB18030 text. Save it as CSV UTF-8 and upload it again',
  ) {
    super('SAMPLE_ENCODING_UNSUPPORTED', message, 422);
  }
}
