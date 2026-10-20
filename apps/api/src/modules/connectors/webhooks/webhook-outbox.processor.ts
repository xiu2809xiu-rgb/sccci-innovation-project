import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { DOMAIN_EVENTS } from '@huitong/shared';
import type { Queue } from 'bullmq';

import { DomainEventBus } from '../../../infrastructure/events/domain-event-bus.js';
import { QUEUES } from '../../../infrastructure/queues/queue-names.js';
import { OaWebhookService } from './oa-webhook.service.js';
import { WebhookEventsRepository } from './webhook-events.repository.js';

const EVERY_MS = 120_000;
/** Younger events may still be in their first delivery. */
const GRACE_MS = 60_000;
const BATCH = 50;

/**
 * The outbox: every two minutes, republishes stored OA events that were never
 * handled (a crash between commit and publish, or no subscriber yet).
 * Subscribers ignore event ids they have seen, so republishing is safe.
 */
@Processor(QUEUES.webhooks)
export class WebhookOutboxProcessor extends WorkerHost implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(QUEUES.webhooks) private readonly queue: Queue,
    private readonly events: WebhookEventsRepository,
    private readonly webhooks: OaWebhookService,
    private readonly bus: DomainEventBus,
  ) {
    super();
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'republish-unhandled',
      { every: EVERY_MS },
      { name: 'republish' },
    );
  }

  async process(): Promise<void> {
    if (!this.bus.hasSubscribers(DOMAIN_EVENTS.oaApprovalCompleted)) return;
    const unhandled = await this.events.findUnhandled(new Date(Date.now() - GRACE_MS), BATCH);
    for (const event of unhandled) await this.webhooks.dispatch(event);
  }
}
