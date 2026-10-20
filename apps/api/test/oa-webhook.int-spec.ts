import { createHmac, randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS, type OaApprovalCompleted } from '@huitong/shared';
import request from 'supertest';

import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { WebhookOutboxProcessor } from '../src/modules/connectors/webhooks/webhook-outbox.processor.js';
import { MOCK_CREDENTIALS, startOa } from './support/mock-systems.js';
import { createTestApp } from './support/test-app.js';

const SECRET = MOCK_CREDENTIALS.OA_WEBHOOK_SECRET;

/** An OA `approval.completed` event, shaped like the ones mock OA sends. */
function approvalEvent(overrides: { eventId?: string; status?: string } = {}) {
  const sequence = String(Math.floor(Math.random() * 900_000) + 100_000);
  return {
    eventId: overrides.eventId ?? randomUUID(),
    eventType: 'approval.completed',
    occurredAt: new Date().toISOString(),
    data: {
      requestId: `OA-2026-${sequence}`,
      type: 'MANPOWER_REQUEST',
      title: 'Compliance: 1 x AML Analyst',
      status: overrides.status ?? 'APPROVED',
      applicant: { employeeNo: 'E100006', name: 'Arjun Menon', departmentCode: 'WM' },
      entityCode: 'SG01',
      formData: { 需求人数: 1, 岗位英文名称: 'AML Analyst', 法人公司: 'SG01' },
      approvalChain: [],
    },
  };
}

function signature(timestamp: number, rawBody: string, secret: string = SECRET): string {
  return `sha256=${createHmac('sha256', secret)
    .update(`${String(timestamp)}.${rawBody}`)
    .digest('hex')}`;
}

describe('OA webhooks (integration)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let emitter: EventEmitter2;

  function deliver(
    event: ReturnType<typeof approvalEvent>,
    options: { timestamp?: number; secret?: string; eventIdHeader?: string; rawBody?: string } = {},
  ) {
    const rawBody = options.rawBody ?? JSON.stringify(event);
    const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
    return request(app.getHttpServer())
      .post('/api/v1/webhooks/oa')
      .set('Content-Type', 'application/json')
      .set('X-OA-Event-Id', options.eventIdHeader ?? event.eventId)
      .set('X-OA-Timestamp', String(timestamp))
      .set('X-OA-Signature', signature(timestamp, rawBody, options.secret))
      .send(rawBody);
  }

  const stored = (eventId: string) =>
    prisma.inboundWebhookEvent.findUnique({ where: { source_eventId: { source: 'oa', eventId } } });

  async function lastRejection() {
    return prisma.auditEvent.findFirst({
      where: { action: 'webhook.rejected' },
      orderBy: { occurredAt: 'desc' },
    });
  }

  /** Subscribes for one test, the way area 2's workflow trigger will. */
  function subscribe(handler: (event: OaApprovalCompleted) => void) {
    emitter.on(DOMAIN_EVENTS.oaApprovalCompleted, handler);
    return () => emitter.off(DOMAIN_EVENTS.oaApprovalCompleted, handler);
  }

  beforeAll(async () => {
    app = await createTestApp({ OA_WEBHOOK_SECRET: SECRET });
    prisma = app.get(PrismaService);
    emitter = app.get(EventEmitter2);
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a delivery from the mock OA platform and stores it for the workflow area', async () => {
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as AddressInfo;
    const oa = await startOa(`http://127.0.0.1:${String(port)}/api/v1/webhooks/oa`);
    try {
      const created = await request(oa.server.url)
        .post('/openapi/v1/_simulate/manpower-request')
        .set('Authorization', `Bearer ${MOCK_CREDENTIALS.OA_API_TOKEN}`)
        .send({ headcount: 2 })
        .expect(201);
      const { requestId } = (created.body as { data: { requestId: string } }).data;

      const deadline = Date.now() + 10_000;
      let delivered = oa.dispatcher.deliveries();
      while (delivered.length === 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        delivered = oa.dispatcher.deliveries();
      }
      expect(delivered[0]).toMatchObject({ ok: true, statusCode: 202, attempt: 1 });

      const event = await stored(delivered[0]?.eventId ?? '');
      expect(event).toMatchObject({
        eventType: 'approval.completed',
        signatureValid: true,
        // No subscriber yet (area 2 is not built), so it waits for the outbox.
        status: 'RECEIVED',
      });
      expect(event?.payload).toMatchObject({
        data: { requestId, type: 'MANPOWER_REQUEST', status: 'APPROVED' },
      });
      // Data minimisation: OA's approver chain (names, comments) is not kept.
      expect(event?.payload).not.toHaveProperty('data.approvalChain');
      expect(
        await prisma.auditEvent.count({
          where: { action: 'webhook.received', entityId: event?.id ?? '' },
        }),
      ).toBe(1);
    } finally {
      await oa.server.close();
    }
  });

  it('stores a replayed event once', async () => {
    const event = approvalEvent();
    const first = await deliver(event).expect(202);
    expect(first.body).toEqual({ data: { status: 'accepted', eventId: event.eventId } });
    const again = await deliver(event).expect(202);
    expect(again.body).toEqual({ data: { status: 'duplicate', eventId: event.eventId } });
    expect(
      await prisma.inboundWebhookEvent.count({ where: { source: 'oa', eventId: event.eventId } }),
    ).toBe(1);
  });

  it('rejects a wrong signature or a stale timestamp without storing anything', async () => {
    const forged = approvalEvent();
    const response = await deliver(forged, { secret: 'not-the-shared-secret-at-all' }).expect(401);
    expect((response.body as { error: { code: string } }).error.code).toBe(
      'WEBHOOK_SIGNATURE_INVALID',
    );
    expect(await stored(forged.eventId)).toBeNull();
    expect((await lastRejection())?.metadata).toMatchObject({ reason: 'BAD_SIGNATURE' });

    const stale = approvalEvent();
    await deliver(stale, { timestamp: Math.floor(Date.now() / 1000) - 600 }).expect(401);
    expect(await stored(stale.eventId)).toBeNull();
    expect((await lastRejection())?.metadata).toMatchObject({ reason: 'STALE_TIMESTAMP' });

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/oa')
      .set('Content-Type', 'application/json')
      .send(approvalEvent())
      .expect(401);
  });

  it('rejects a signed body that is not an OA approval event', async () => {
    const event = approvalEvent();
    await deliver(event, { eventIdHeader: randomUUID() }).expect(400);
    await deliver(event, { rawBody: '{"eventId":' }).expect(400);
    await deliver(event, {
      rawBody: JSON.stringify({ ...event, eventType: 'approval.created' }),
    }).expect(400);
    expect(await stored(event.eventId)).toBeNull();
  });

  it('publishes oa.approval.completed to subscribers and marks the event processed', async () => {
    const received: OaApprovalCompleted[] = [];
    const unsubscribe = subscribe((payload) => {
      received.push(payload);
    });
    try {
      const event = approvalEvent();
      await deliver(event).expect(202);
      const row = await stored(event.eventId);
      expect(row?.status).toBe('PROCESSED');
      expect(received).toEqual([
        expect.objectContaining({
          inboundEventId: row?.id,
          oaEventId: event.eventId,
          requestId: event.data.requestId,
          requestType: 'MANPOWER_REQUEST',
          outcome: 'APPROVED',
          entityCode: 'SG01',
          applicantEmployeeNo: 'E100006',
        }),
      ]);
    } finally {
      unsubscribe();
    }
  });

  it('records a subscriber failure without losing the event', async () => {
    const unsubscribe = subscribe(() => {
      throw new Error('workflow store unavailable');
    });
    try {
      const event = approvalEvent();
      await deliver(event).expect(202);
      expect(await stored(event.eventId)).toMatchObject({
        status: 'FAILED',
        error: 'A subscriber failed while handling the event',
      });
    } finally {
      unsubscribe();
    }
  });

  it('marks approvals still pending in OA as rejected, not as completed', async () => {
    const received: OaApprovalCompleted[] = [];
    const unsubscribe = subscribe((payload) => {
      received.push(payload);
    });
    try {
      const event = approvalEvent({ status: 'PENDING' });
      await deliver(event).expect(202);
      expect((await stored(event.eventId))?.status).toBe('REJECTED');
      expect(received).toEqual([]);
    } finally {
      unsubscribe();
    }
  });

  it('republishes events nobody handled once a subscriber exists (outbox)', async () => {
    const event = approvalEvent();
    await deliver(event).expect(202);
    const row = await stored(event.eventId);
    expect(row?.status).toBe('RECEIVED');
    // Past the grace period that leaves a first delivery alone.
    await prisma.inboundWebhookEvent.update({
      where: { id: row?.id ?? '' },
      data: { receivedAt: new Date(Date.now() - 5 * 60_000) },
    });

    const received: string[] = [];
    const unsubscribe = subscribe((payload) => {
      received.push(payload.oaEventId);
    });
    try {
      await app.get(WebhookOutboxProcessor).process();
      expect(received).toContain(event.eventId);
      expect((await stored(event.eventId))?.status).toBe('PROCESSED');
    } finally {
      unsubscribe();
    }
  });
});
