import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';
import { ZodError } from 'zod';

/** An error in OA's envelope: `{ code, msg, data: null }` with a numeric business code. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Maps every failure to OA's envelope; unexpected errors are logged, never leaked. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    if (error instanceof ZodError) {
      const detail = error.issues
        .map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`)
        .join('; ');
      res.status(400).json({ code: 40000, msg: `invalid parameters: ${detail}`, data: null });
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ code: error.code, msg: error.message, data: null });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ code: 40000, msg: 'malformed JSON body', data: null });
      return;
    }
    logger.error({ err: error }, 'unhandled error');
    res.status(500).json({ code: 50000, msg: 'internal error', data: null });
  };
}
