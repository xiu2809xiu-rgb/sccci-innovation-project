import { HttpException, type ArgumentsHost } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { PinoLogger } from 'nestjs-pino';

import { Prisma } from '../../generated/prisma/client.js';
import { ForbiddenError, ValidationFailedError } from '../errors/app-error.js';
import { GlobalExceptionFilter } from './global-exception.filter.js';

function run(exception: unknown) {
  const logger = { setContext: vi.fn(), error: vi.fn() };
  const json = vi.fn();
  const response = { headersSent: false, status: vi.fn(() => ({ json })) };
  const host = {
    switchToHttp: () => ({ getRequest: () => ({ id: 'trace-123' }), getResponse: () => response }),
  } as unknown as ArgumentsHost;
  new GlobalExceptionFilter(logger as unknown as PinoLogger).catch(exception, host);
  const status = (response.status.mock.calls[0] as [number] | undefined)?.[0];
  const body = (json.mock.calls[0] as [unknown] | undefined)?.[0];
  return { status, body, logger };
}

describe('GlobalExceptionFilter', () => {
  it('renders application errors with their code, details and the trace id', () => {
    const { status, body } = run(
      new ValidationFailedError([{ path: 'email', message: 'Invalid email' }]),
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'The request is invalid',
        details: [{ path: 'email', message: 'Invalid email' }],
        traceId: 'trace-123',
      },
    });
  });

  it('maps framework HTTP errors and rate limiting to stable codes', () => {
    expect(run(new HttpException('gone', 404)).body).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
    expect(run(new ThrottlerException()).status).toBe(429);
    expect(run(new ForbiddenError()).body).toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  it('maps Prisma unique violations to CONFLICT', () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7',
    });
    expect(run(duplicate)).toMatchObject({ status: 409, body: { error: { code: 'CONFLICT' } } });
  });

  it('hides unexpected errors behind a generic message and logs them', () => {
    const { status, body, logger } = run(new Error('database password is hunter2'));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
