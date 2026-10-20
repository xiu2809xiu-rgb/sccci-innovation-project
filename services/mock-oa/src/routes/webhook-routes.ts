import { Router } from 'express';

import { ok } from '../http/envelope.js';
import { subscriptionSchema } from '../schemas/oa-records.js';
import type { WebhookDispatcher } from '../webhooks/webhook-dispatcher.js';

/** Webhook subscriptions and the delivery log. */
export function webhookRoutes(dispatcher: WebhookDispatcher): Router {
  const router = Router();

  router.post('/openapi/v1/webhooks/subscriptions', (req, res) => {
    const subscription = subscriptionSchema.parse(req.body);
    dispatcher.subscribe(subscription.url);
    res.status(201).json(ok({ url: subscription.url, events: subscription.events }));
  });

  router.get('/openapi/v1/webhooks/deliveries', (_req, res) => {
    res.json(ok({ items: dispatcher.deliveries() }));
  });

  return router;
}
