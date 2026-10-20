import { randomUUID } from 'node:crypto';

import type { Logger } from 'pino';

import type { OaApproval, WebhookEvent } from '../schemas/oa-records.js';
import { signWebhook } from './signature.js';

export interface DeliveryRecord {
  eventId: string;
  url: string;
  attempt: number;
  statusCode: number | null;
  ok: boolean;
  at: string;
  error: string | null;
}

export interface DispatcherOptions {
  secret: string;
  staticSubscriber: string | undefined;
  retryDelaysMs: readonly number[];
  logger: Logger;
  fetchImpl?: typeof fetch;
  clock?: () => Date;
  newEventId?: () => string;
}

const MAX_LOG = 100;

/** Unref'd so a scheduled retry never keeps the process alive. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms).unref());
}

/**
 * Delivers `approval.completed` events to every subscriber, signed with
 * HMAC-SHA256, retrying failed deliveries with backoff. Delivery attempts are
 * kept in a short log for debugging.
 */
export class WebhookDispatcher {
  private readonly subscribers = new Set<string>();
  private readonly log: DeliveryRecord[] = [];
  private readonly fetchImpl: typeof fetch;
  private readonly clock: () => Date;
  private readonly newEventId: () => string;

  constructor(private readonly options: DispatcherOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.clock = options.clock ?? (() => new Date());
    this.newEventId = options.newEventId ?? randomUUID;
    if (options.staticSubscriber) {
      this.subscribers.add(options.staticSubscriber);
    }
  }

  subscribe(url: string): void {
    this.subscribers.add(url);
  }

  subscriptions(): string[] {
    return [...this.subscribers];
  }

  deliveries(): DeliveryRecord[] {
    return [...this.log].reverse();
  }

  /** Builds one event and delivers it to every subscriber in parallel. */
  async dispatch(approval: OaApproval): Promise<void> {
    const event: WebhookEvent = {
      eventId: this.newEventId(),
      eventType: 'approval.completed',
      occurredAt: this.clock().toISOString(),
      data: approval,
    };
    const rawBody = JSON.stringify(event);
    await Promise.all(this.subscriptions().map((url) => this.deliver(url, event.eventId, rawBody)));
  }

  private async deliver(url: string, eventId: string, rawBody: string): Promise<void> {
    const attempts = this.options.retryDelaysMs.length + 1;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const timestamp = Math.floor(this.clock().getTime() / 1000);
      let statusCode: number | null = null;
      let error: string | null = null;
      try {
        const response = await this.fetchImpl(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-OA-Event-Id': eventId,
            'X-OA-Timestamp': String(timestamp),
            'X-OA-Signature': signWebhook(this.options.secret, timestamp, rawBody),
          },
          body: rawBody,
          signal: AbortSignal.timeout(5000),
        });
        statusCode = response.status;
      } catch (caught) {
        error = caught instanceof Error ? caught.message : 'delivery failed';
      }
      const ok = statusCode !== null && statusCode >= 200 && statusCode < 300;
      this.record({ eventId, url, attempt, statusCode, ok, at: this.clock().toISOString(), error });
      if (ok) {
        return;
      }
      const delay = this.options.retryDelaysMs[attempt - 1];
      if (delay === undefined) {
        this.options.logger.warn({ eventId, url, attempts }, 'webhook delivery failed');
        return;
      }
      await sleep(delay);
    }
  }

  private record(entry: DeliveryRecord): void {
    this.log.push(entry);
    if (this.log.length > MAX_LOG) {
      this.log.shift();
    }
  }
}
