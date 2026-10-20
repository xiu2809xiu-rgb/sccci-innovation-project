import express, { type Express } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

import { loadConfig, type OaConfig } from './config.js';
import { ApprovalEngine } from './engine/approval-engine.js';
import { requireBearerToken } from './http/auth.js';
import { errorHandler } from './http/errors.js';
import { logger as defaultLogger } from './logger.js';
import { approvalRoutes } from './routes/approval-routes.js';
import { simulateRoutes } from './routes/simulate-routes.js';
import { webhookRoutes } from './routes/webhook-routes.js';
import { WebhookDispatcher } from './webhooks/webhook-dispatcher.js';

export interface OaAppOptions {
  config?: OaConfig;
  logger?: Logger;
  clock?: () => Date;
  fetchImpl?: typeof fetch;
}

export interface OaApp {
  app: Express;
  engine: ApprovalEngine;
  dispatcher: WebhookDispatcher;
}

/**
 * Builds the mock OA approvals platform. Completed approvals are pushed to
 * webhook subscribers without delaying the HTTP response. Synthetic data only.
 */
export function createOaApp(options: OaAppOptions = {}): OaApp {
  const config = options.config ?? loadConfig();
  const logger = options.logger ?? defaultLogger;
  const clock = options.clock ?? (() => new Date());
  const dispatcher = new WebhookDispatcher({
    secret: config.webhookSecret,
    staticSubscriber: config.webhookUrl,
    retryDelaysMs: config.retryDelaysMs,
    logger,
    clock,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });
  const engine = new ApprovalEngine((approval) => {
    dispatcher.dispatch(approval).catch((error: unknown) => {
      logger.error({ err: error, requestId: approval.requestId }, 'webhook dispatch failed');
    });
  }, clock);

  const app = express();
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'mock-oa' });
  });

  app.use('/openapi', requireBearerToken(config.apiToken));
  app.use(approvalRoutes(engine));
  app.use(webhookRoutes(dispatcher));
  app.use(simulateRoutes(engine, clock));

  app.use((_req, res) => {
    res.status(404).json({ code: 40400, msg: 'unknown endpoint', data: null });
  });
  app.use(errorHandler(logger));
  return { app, engine, dispatcher };
}

/** The Express app alone, for callers that do not need the engine or dispatcher. */
export function createApp(options: OaAppOptions = {}): Express {
  return createOaApp(options).app;
}
