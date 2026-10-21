import { randomUUID } from 'node:crypto';

import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  auditEventViewSchema,
  chainVerificationSchema,
  dataEnvelopeSchema,
  listEnvelopeSchema,
} from '@huitong/shared';
import request from 'supertest';

import { AuditLogService } from '../src/infrastructure/audit/audit-log.service.js';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { createTestApp, signedInClient } from './support/test-app.js';

const events = listEnvelopeSchema(auditEventViewSchema);
const verification = dataEnvelopeSchema(chainVerificationSchema);

/** The log is append-only and outlives each run, so every run audits its own record. */
const RECORD = `T-${randomUUID()}`;

describe('Audit-log viewer (integration, area 4 head start)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const meta = { actor: null, ip: null, userAgent: 'vitest', traceId: 'trace-trail-test' };
    const audit = app.get(AuditLogService);
    await audit.record(
      {
        action: 'trail-test.changed',
        entityType: 'TrailTest',
        entityId: RECORD,
        before: { jobTitle: 'Analyst', baseSalary: 5200, workLocation: 'Singapore' },
        after: { jobTitle: 'Senior Analyst', baseSalary: 6100, workLocation: 'Singapore' },
      },
      meta,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a session', async () => {
    await request(app.getHttpServer()).get('/api/v1/audit/events').expect(401);
  });

  it('lists an event with the fields it changed, never their values', async () => {
    const auditor = await signedInClient(app, 'AUDITOR');
    const response = await auditor.agent
      .get(`/api/v1/audit/events?entityType=TrailTest&entityId=${RECORD}`)
      .expect(200);
    const body = events.parse(response.body);
    expect(body.meta).toMatchObject({ total: 1 });
    expect(body.meta).not.toHaveProperty('mock');
    expect(body.data[0]).toMatchObject({
      action: 'trail-test.changed',
      changedFields: ['baseSalary', 'jobTitle'],
      traceId: 'trace-trail-test',
      entityIdWithheld: false,
    });
    expect(response.text).not.toMatch(/Senior Analyst|6100/);
  });

  it('filters by person and by the start of an action, newest first', async () => {
    const hr = await signedInClient(app, 'HR_SG');
    const user = await prisma.user.findFirstOrThrow({
      where: { role: 'HR_SG' },
      select: { id: true, displayName: true },
    });
    const auditor = await signedInClient(app, 'AUDITOR');
    const body = events.parse(
      (
        await auditor.agent
          .get(`/api/v1/audit/events?actorUserId=${user.id}&action=auth.`)
          .expect(200)
      ).body,
    );
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((event) => event.actorName === user.displayName)).toBe(true);
    expect(body.data.every((event) => event.action.startsWith('auth.'))).toBe(true);
    const ids = body.data.map((event) => BigInt(event.id));
    expect(ids).toEqual([...ids].sort((a, b) => (a > b ? -1 : 1)));
    await hr.agent.get('/api/v1/audit/events').expect(403);
  });

  it('refuses a window that ends before it starts', async () => {
    const auditor = await signedInClient(app, 'AUDITOR');
    await auditor.agent
      .get('/api/v1/audit/events?from=2026-10-21T00:00:00Z&to=2026-10-20T00:00:00Z')
      .expect(400);
  });

  it('verifies the whole chain', async () => {
    const auditor = await signedInClient(app, 'AUDITOR');
    const body = verification.parse(
      (await auditor.agent.get('/api/v1/audit/verify').expect(200)).body,
    );
    expect(body.data).toMatchObject({ valid: true, firstBrokenId: null });
    expect(body.data.checked).toBe(await prisma.auditEvent.count());
  });

  it.todo('exports the filtered events as CSV, and audits the export (F-2)');
});
