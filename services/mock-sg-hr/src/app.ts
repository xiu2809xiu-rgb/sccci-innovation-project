import express, { type Express } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

import { loadConfig, type SgHrConfig } from './config.js';
import { SgHrStore } from './data/store.js';
import { requireApiKey } from './http/auth.js';
import { errorHandler } from './http/errors.js';
import { logger as defaultLogger } from './logger.js';
import { adminRoutes } from './routes/admin.js';
import { employeeRoutes } from './routes/employees.js';
import { timeRecordRoutes } from './routes/time-records.js';

export interface SgHrAppOptions {
  config?: SgHrConfig;
  store?: SgHrStore;
  logger?: Logger;
}

/** Builds the mock Singapore HR system (English keys, ISO dates). Synthetic data only. */
export function createApp(options: SgHrAppOptions = {}): Express {
  const config = options.config ?? loadConfig();
  const store = options.store ?? new SgHrStore();
  const logger = options.logger ?? defaultLogger;

  const app = express();
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'mock-sg-hr' });
  });

  app.use('/api', requireApiKey(config.apiKey));
  app.use(employeeRoutes(store));
  app.use(timeRecordRoutes(store));
  app.use(adminRoutes(store));

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found', message: 'Unknown endpoint' });
  });
  app.use(errorHandler(logger));
  return app;
}
