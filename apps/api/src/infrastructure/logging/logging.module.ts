import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { AppConfig } from '../../config/app-config.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Uses a caller-supplied `X-Request-Id` when it is a UUID, otherwise a new one,
 * and echoes it on the response. The id travels in every log line and in the
 * error envelope's `traceId`, so a user-reported trace id finds the logs.
 */
export function requestId(req: IncomingMessage, res: ServerResponse): string {
  const header = req.headers['x-request-id'];
  const supplied = Array.isArray(header) ? header[0] : header;
  const id = supplied !== undefined && UUID.test(supplied) ? supplied : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}

/** Structured JSON logs (pretty in development) with secrets and cookies redacted. */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.logLevel,
          genReqId: requestId,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              'req.headers["x-csrf-token"]',
            ],
            censor: '[redacted]',
          },
          autoLogging: {
            ignore: (req: IncomingMessage) => req.url?.startsWith('/health') === true,
          },
          ...(config.env === 'development'
            ? {
                transport: {
                  target: 'pino-pretty',
                  options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' },
                },
              }
            : {}),
        },
      }),
    }),
  ],
})
export class LoggingModule {}
