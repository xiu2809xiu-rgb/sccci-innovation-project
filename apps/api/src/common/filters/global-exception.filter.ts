import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { ErrorCode, ErrorEnvelope } from '@huitong/shared';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../errors/app-error.js';
import { traceIdOf } from '../http/request-meta.js';

interface Described {
  status: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

const CODE_BY_STATUS: Readonly<Record<number, ErrorCode>> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * Turns every exception into the single error envelope
 * `{ error: { code, message, details, traceId } }`. Unexpected errors are
 * logged with the trace id and reported without internals.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const traceId = traceIdOf(request);
    const described = this.describe(exception);

    if (described.status >= 500) {
      this.logger.error({ err: exception, traceId }, 'request failed');
    }
    if (response.headersSent) {
      return;
    }
    const body: ErrorEnvelope = {
      error: {
        code: described.code,
        message: described.message,
        traceId,
        ...(described.details === undefined ? {} : { details: described.details }),
      },
    };
    response.status(described.status).json(body);
  }

  private describe(exception: unknown): Described {
    if (exception instanceof AppError) {
      return {
        status: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }
    if (exception instanceof ThrottlerException) {
      return { status: 429, code: 'RATE_LIMITED', message: 'Too many requests; try again shortly' };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return { status, code: CODE_BY_STATUS[status] ?? 'INTERNAL', message: exception.message };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: 409,
          code: 'CONFLICT',
          message: 'A record with these values already exists',
        };
      }
      if (exception.code === 'P2025') {
        return { status: 404, code: 'NOT_FOUND', message: 'The record was not found' };
      }
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL',
      message: 'Something went wrong; quote the trace id when reporting it',
    };
  }
}
