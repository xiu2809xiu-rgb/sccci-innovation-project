import { RequestMethod, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { CSRF_HEADER } from '@huitong/shared';
import cookieParser from 'cookie-parser';

import type { AppConfig } from '../config/app-config.js';
import { securityHeaders } from './security-headers.js';

/**
 * HTTP setup shared by `main.ts` and the integration tests, so tests exercise
 * exactly what production runs: security headers, cookies, CORS allow-list,
 * the `/api/v1` prefix and versioning.
 */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  // Behind nginx or a load balancer, trust one proxy hop so req.ip is the client.
  app.set('trust proxy', config.http.trustProxy ? 1 : false);
  app.use(securityHeaders());
  app.use(cookieParser());
  app.enableCors({
    origin: [...config.http.corsOrigins],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', CSRF_HEADER, 'X-Request-Id', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-Id'],
  });
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/live', method: RequestMethod.GET },
    ],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
}
