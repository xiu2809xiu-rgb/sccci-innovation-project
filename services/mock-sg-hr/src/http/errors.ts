import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';
import { ZodError } from 'zod';

/** An error with SG HR's own JSON shape: `{ error, message }`. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function describeZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : 'request'}: ${issue.message}`)
    .join('; ');
}

/** Maps every failure to SG HR's error format; unexpected errors are logged, never leaked. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'bad_request', message: describeZodError(error) });
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.code, message: error.message });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'bad_request', message: 'Malformed JSON body' });
      return;
    }
    logger.error({ err: error }, 'unhandled error');
    res.status(500).json({ error: 'internal_error', message: 'Unexpected error' });
  };
}
