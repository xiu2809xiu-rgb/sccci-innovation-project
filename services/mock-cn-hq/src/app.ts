import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from './logger.js';

/** Builds the mock China HQ SAP-like HR system (Chinese keys, YYYY/MM/DD dates, SAP codes). */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'mock-cn-hq' });
  });

  return app;
}
