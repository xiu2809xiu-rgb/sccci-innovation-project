import { Injectable } from '@nestjs/common';
import { DOMAIN_EVENTS, type OaApprovalCompleted } from '@huitong/shared';
import { PinoLogger } from 'nestjs-pino';

import {
  ValidationFailedError,
  WebhookSignatureInvalidError,
} from '../../../common/errors/app-error.js';
import type { RequestMeta } from '../../../common/http/request-meta.js';
import { AppConfig } from '../../../config/app-config.js';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service.js';
import { DomainEventBus } from '../../../infrastructure/events/domain-event-bus.js';
import type { InboundWebhookEvent } from '../../../generated/prisma/client.js';
import { verifyOaSignature } from './oa-signature.js';
import { oaWebhookSchema } from './oa-webhook.schema.js';
import { WebhookEventsRepository } from './webhook-events.repository.js';

export interface OaDelivery {
  rawBody: Buffer | undefined;
  eventId: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
}

export interface DeliveryResult {
  status: 'accepted' | 'duplicate';
  eventId: string;
}

const SOURCE = 'oa';

/**
 * Receives OA approval webhooks: verify the signature, validate the body,
 * store it once, then publish `oa.approval.completed` after the store has
 * committed. The stored row doubles as the outbox (ADR 0008).
 */
@Injectable()
export class OaWebhookService {
  constructor(
    private readonly config: AppConfig,
    private readonly events: WebhookEventsRepository,
    private readonly bus: DomainEventBus,
    private readonly audit: AuditLogService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OaWebhookService.name);
  }

  async receive(delivery: OaDelivery, meta: RequestMeta): Promise<DeliveryResult> {
    const rawBody = delivery.rawBody ?? Buffer.alloc(0);
    const check = verifyOaSignature({
      secret: this.config.connectors.oa.webhookSecret,
      rawBody,
      timestamp: delivery.timestamp,
      signature: delivery.signature,
      now: new Date(),
    });
    if (!check.valid) {
      // Not stored: a forged request must not be able to claim a real event id.
      await this.audit.record(
        {
          action: 'webhook.rejected',
          entityType: 'InboundWebhookEvent',
          metadata: { source: SOURCE, reason: check.reason },
        },
        meta,
      );
      throw new WebhookSignatureInvalidError();
    }

    const body = oaWebhookSchema.safeParse(this.parseJson(rawBody));
    if (!body.success) {
      throw new ValidationFailedError(
        body.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
        'The webhook body is not an OA approval event',
      );
    }
    if (delivery.eventId !== body.data.eventId) {
      throw new ValidationFailedError([
        { path: 'X-OA-Event-Id', message: 'does not match the body' },
      ]);
    }

    const stored = await this.events.store({
      source: SOURCE,
      eventId: body.data.eventId,
      eventType: body.data.eventType,
      payload: body.data,
    });
    if (!stored) return { status: 'duplicate', eventId: body.data.eventId };

    await this.audit.record(
      {
        action: 'webhook.received',
        entityType: 'InboundWebhookEvent',
        entityId: stored.id,
        metadata: {
          source: SOURCE,
          requestId: body.data.data.requestId,
          type: body.data.data.type,
        },
      },
      meta,
    );
    await this.dispatch(stored);
    return { status: 'accepted', eventId: body.data.eventId };
  }

  /** Publishes a stored event to its subscribers; used on receipt and by the outbox republisher. */
  async dispatch(event: InboundWebhookEvent): Promise<void> {
    const parsed = oaWebhookSchema.safeParse(event.payload);
    if (!parsed.success) {
      await this.events.markRejected(event.id, 'The stored payload is no longer valid');
      return;
    }
    const { data, eventId, occurredAt } = parsed.data;
    if (data.status !== 'APPROVED' && data.status !== 'REJECTED') {
      await this.events.markRejected(event.id, `Not a completed approval (${data.status})`);
      return;
    }
    const payload: OaApprovalCompleted = {
      inboundEventId: event.id,
      oaEventId: eventId,
      occurredAt,
      requestId: data.requestId,
      requestType: data.type,
      outcome: data.status,
      entityCode: data.entityCode,
      applicantEmployeeNo: data.applicant.employeeNo,
      title: data.title,
      formData: data.formData,
    };
    try {
      // With no subscriber yet (area 2 not built), the event stays RECEIVED for the outbox.
      if ((await this.bus.publish(DOMAIN_EVENTS.oaApprovalCompleted, payload)) > 0) {
        await this.events.markProcessed(event.id);
      }
    } catch (error) {
      this.logger.warn(
        { err: error, inboundEventId: event.id },
        'an oa.approval.completed handler failed',
      );
      await this.events.markFailed(event.id, 'A subscriber failed while handling the event');
    }
  }

  private parseJson(rawBody: Buffer): unknown {
    try {
      return JSON.parse(rawBody.toString('utf8'));
    } catch {
      return undefined;
    }
  }
}
