import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from './logger.js';

/** Builds the mock Singapore HR system (English keys, ISO dates). */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'mock-sg-hr' });
  });

  return app;
}
