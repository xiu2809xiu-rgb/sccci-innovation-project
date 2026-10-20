import express, { type Express } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

import { loadConfig, type CnHqConfig } from './config.js';
import { CnHqStore } from './data/store.js';
import { requireBasicAuth } from './http/auth.js';
import { errorHandler } from './http/errors.js';
import { logger as defaultLogger } from './logger.js';
import { hrRoutes } from './routes/hr-routes.js';

export interface CnHqAppOptions {
  config?: CnHqConfig;
  store?: CnHqStore;
  logger?: Logger;
}

/**
 * Builds the mock China HQ system: Chinese keys, `YYYY/MM/DD` dates, SAP-style
 * codes, OData paging and Basic auth. Synthetic data only.
 */
export function createApp(options: CnHqAppOptions = {}): Express {
  const config = options.config ?? loadConfig();
  const store = options.store ?? new CnHqStore();
  const logger = options.logger ?? defaultLogger;

  const app = express();
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'mock-cn-hq' });
  });

  app.use('/sap', requireBasicAuth(config.username, config.password));
  app.use(hrRoutes(store));

  app.use((_req, res) => {
    res.status(404).json({ 返回码: 'E404', 消息: '接口不存在' });
  });
  app.use(errorHandler(logger));
  return app;
}
