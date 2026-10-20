import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createOaApp, type OaApp } from './app.js';
import { oaApprovalSchema, webhookEventSchema } from './schemas/oa-records.js';
import { signWebhook } from './webhooks/signature.js';

const TOKEN = 'test-token-123';
const SECRET = 'test-webhook-secret-123';

interface Received {
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

/** A local webhook receiver that records deliveries and answers with queued status codes. */
async function startReceiver(
  statuses: number[],
): Promise<{ url: string; received: Received[]; server: Server }> {
  const received: Received[] = [];
  const app = express();
  app.post('/hook', express.text({ type: 'application/json' }), (req, res) => {
    received.push({ headers: req.headers, body: req.body as string });
    res.status(statuses.shift() ?? 200).end();
  });
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => {
      resolve(listening);
    });
  });
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${String(port)}/hook`, received, server };
}

describe('mock OA', () => {
  let oa: OaApp;
  let receiver: Awaited<ReturnType<typeof startReceiver>>;

  async function setup(statuses: number[] = []) {
    receiver = await startReceiver(statuses);
    oa = createOaApp({
      config: {
        port: 0,
        apiToken: TOKEN,
        webhookSecret: SECRET,
        webhookUrl: receiver.url,
        retryDelaysMs: [0, 0],
      },
      logger: pino({ level: 'silent' }),
      clock: () => new Date('2026-10-20T04:00:00.000Z'),
    });
  }

  beforeEach(async () => {
    await setup();
  });

  afterEach(async () => {
    await new Promise((resolve) => receiver.server.close(resolve));
  });

  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${TOKEN}`);

  it('reports health without authentication and rejects bad tokens', async () => {
    await request(oa.app).get('/health').expect(200, { status: 'ok', service: 'mock-oa' });
    await request(oa.app)
      .get('/openapi/v1/approvals')
      .expect(401, { code: 40100, msg: 'invalid token', data: null });
  });

  it('lists the seeded requests newest first, filtered by type and status', async () => {
    const all = await auth(request(oa.app).get('/openapi/v1/approvals?size=100')).expect(200);
    expect(all.body.data.total).toBe(25);
    expect(all.body.data.items.every((a: unknown) => oaApprovalSchema.safeParse(a).success)).toBe(
      true,
    );
    const dates = all.body.data.items.map((a: { submittedAt: string }) => a.submittedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
    const pendingManpower = await auth(
      request(oa.app).get('/openapi/v1/approvals?type=MANPOWER_REQUEST&status=PENDING'),
    ).expect(200);
    expect(pendingManpower.body.data.total).toBeGreaterThanOrEqual(2);
    await auth(request(oa.app).get('/openapi/v1/approvals/OA-2026-999999')).expect(404);
  });

  it('runs a request through its chain and sends one signed webhook on approval', async () => {
    const created = await auth(request(oa.app).post('/openapi/v1/approvals'))
      .send({
        type: 'EXPENSE_CLAIM',
        title: 'Taxi',
        applicantEmployeeNo: 'E100003',
        formData: { 报销金额: 23.5 },
      })
      .expect(201);
    const id = created.body.data.requestId as string;
    expect(created.body.data.status).toBe('PENDING');
    expect(created.body.data.approvalChain).toHaveLength(3);

    await auth(request(oa.app).post(`/openapi/v1/approvals/${id}/actions`))
      .send({ action: 'APPROVE', approver: 'Siti Rahmah' })
      .expect(200);
    expect(receiver.received).toHaveLength(0);
    const done = await auth(request(oa.app).post(`/openapi/v1/approvals/${id}/actions`))
      .send({ action: 'APPROVE', approver: 'Priya Nair', comment: 'OK' })
      .expect(200);
    expect(done.body.data).toMatchObject({
      status: 'APPROVED',
      completedAt: '2026-10-20T04:00:00Z',
    });

    await vi.waitFor(() => {
      expect(receiver.received).toHaveLength(1);
    });
    const delivery = receiver.received[0] as Received;
    const timestamp = Number(delivery.headers['x-oa-timestamp']);
    expect(delivery.headers['x-oa-signature']).toBe(signWebhook(SECRET, timestamp, delivery.body));
    const event = webhookEventSchema.parse(JSON.parse(delivery.body));
    expect(delivery.headers['x-oa-event-id']).toBe(event.eventId);
    expect(event.data.requestId).toBe(id);

    await auth(request(oa.app).post(`/openapi/v1/approvals/${id}/actions`))
      .send({ action: 'APPROVE', approver: 'x' })
      .expect(409);
  });

  it('completes on rejection and drops the nodes that were never reached', async () => {
    const created = await auth(request(oa.app).post('/openapi/v1/approvals'))
      .send({
        type: 'MANPOWER_REQUEST',
        title: 'Ops: 1 x Analyst',
        applicantEmployeeNo: 'E100006',
        formData: {},
      })
      .expect(201);
    const rejected = await auth(
      request(oa.app).post(`/openapi/v1/approvals/${created.body.data.requestId}/actions`),
    )
      .send({ action: 'REJECT', approver: 'Lim Wei Jie', comment: 'Budget frozen' })
      .expect(200);
    expect(rejected.body.data.status).toBe('REJECTED');
    expect(rejected.body.data.approvalChain.map((s: { action: string }) => s.action)).toEqual([
      'SUBMIT',
      'REJECT',
    ]);
    await vi.waitFor(() => {
      expect(receiver.received).toHaveLength(1);
    });
  });

  it('simulates an approved manpower request in one call', async () => {
    const simulated = await auth(request(oa.app).post('/openapi/v1/_simulate/manpower-request'))
      .send({ headcount: 2 })
      .expect(201);
    expect(simulated.body.data).toMatchObject({
      type: 'MANPOWER_REQUEST',
      status: 'APPROVED',
      entityCode: 'SG01',
    });
    expect(simulated.body.data.formData.需求人数).toBe(2);
    expect(
      simulated.body.data.approvalChain
        .slice(1)
        .every((s: { action: string }) => s.action === 'APPROVE'),
    ).toBe(true);
    await vi.waitFor(() => {
      expect(receiver.received).toHaveLength(1);
    });
  });

  it('retries failed deliveries and records every attempt', async () => {
    await new Promise((resolve) => receiver.server.close(resolve));
    await setup([500, 200]);
    await auth(request(oa.app).post('/openapi/v1/_simulate/manpower-request')).send({}).expect(201);
    await vi.waitFor(() => {
      expect(receiver.received).toHaveLength(2);
    });
    const log = await auth(request(oa.app).get('/openapi/v1/webhooks/deliveries')).expect(200);
    const attempts = log.body.data.items.map(
      (d: { attempt: number; ok: boolean; statusCode: number }) => [d.attempt, d.ok, d.statusCode],
    );
    expect(attempts).toEqual([
      [2, true, 200],
      [1, false, 500],
    ]);
  });

  it('accepts dynamic subscriptions', async () => {
    const response = await auth(request(oa.app).post('/openapi/v1/webhooks/subscriptions'))
      .send({ url: 'http://127.0.0.1:1/other', events: ['approval.completed'] })
      .expect(201);
    expect(response.body.data.url).toBe('http://127.0.0.1:1/other');
    expect(oa.dispatcher.subscriptions()).toHaveLength(2);
  });
});
