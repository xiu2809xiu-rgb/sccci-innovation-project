import { randomUUID } from 'node:crypto';

import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { createTestApp, signedInClient } from './support/test-app.js';

const event = (overrides: Record<string, unknown> = {}) => ({
  type: 'page_view',
  name: 'employees.view',
  route: '/employees/:employeeNo',
  occurredAt: new Date().toISOString(),
  sessionId: randomUUID(),
  locale: 'en',
  ...overrides,
});

describe('Clickstream ingestion (integration)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts an anonymous batch without a session or CSRF token', async () => {
    const sessionId = randomUUID();
    const response = await request(app.getHttpServer())
      .post('/api/v1/analytics/events')
      .send({
        events: [
          event({ sessionId }),
          event({ sessionId, type: 'click', name: 'employees.sync.start' }),
        ],
      })
      .expect(202);
    expect(response.body).toEqual({ data: { accepted: 2 } });
    const stored = await prisma.clickstreamEvent.findMany({ where: { sessionId } });
    expect(stored).toHaveLength(2);
    expect(stored.every((row) => row.role === null)).toBe(true);
  });

  it('records the role, never the identity, of a signed-in caller', async () => {
    const client = await signedInClient(app, 'MANAGEMENT');
    const sessionId = randomUUID();
    await client.agent
      .post('/api/v1/analytics/events')
      .send({ events: [event({ sessionId })] })
      .expect(202);
    const [row] = await prisma.clickstreamEvent.findMany({ where: { sessionId } });
    expect(row?.role).toBe('MANAGEMENT');
    expect(JSON.stringify(row)).not.toContain('guoqiang');
  });

  it('stores nothing when the browser sends Global Privacy Control', async () => {
    const sessionId = randomUUID();
    const response = await request(app.getHttpServer())
      .post('/api/v1/analytics/events')
      .set('Sec-GPC', '1')
      .send({ events: [event({ sessionId })] })
      .expect(202);
    expect(response.body.data.accepted).toBe(0);
    expect(await prisma.clickstreamEvent.count({ where: { sessionId } })).toBe(0);
  });

  it('rejects free text, unknown fields and oversized batches', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/analytics/events')
      .send({ events: [event({ name: 'Mei Ling clicked' })] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/analytics/events')
      .send({ events: [event({ email: 'x@y.example' })] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/analytics/events')
      .send({ events: Array.from({ length: 51 }, () => event()) })
      .expect(400);
  });
});
