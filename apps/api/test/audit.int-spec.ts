import type { NestExpressApplication } from '@nestjs/platform-express';

import { AuditLogService } from '../src/infrastructure/audit/audit-log.service.js';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { createTestApp } from './support/test-app.js';

describe('Audit log (integration)', () => {
  let app: NestExpressApplication;
  let audit: AuditLogService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    audit = app.get(AuditLogService);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('chains every event to the previous one and verifies the chain', async () => {
    const meta = { actor: null, ip: '127.0.0.1', userAgent: 'vitest', traceId: 'trace-audit-test' };
    await audit.record(
      { action: 'test.first', entityType: 'test', entityId: '1', after: { value: 1 } },
      meta,
    );
    await audit.record(
      {
        action: 'test.second',
        entityType: 'test',
        entityId: '2',
        before: { value: 1 },
        after: { value: 2 },
      },
      meta,
    );
    const [latest, previous] = await prisma.auditEvent.findMany({
      orderBy: { id: 'desc' },
      take: 2,
    });
    expect(latest?.prevHash).toBe(previous?.hash);
    await expect(audit.verifyChain()).resolves.toMatchObject({ valid: true, firstBrokenId: null });
  });

  it('refuses updates, deletes and truncation at the database level', async () => {
    await expect(prisma.$executeRaw`UPDATE audit_events SET action = 'tampered'`).rejects.toThrow(
      /append-only/,
    );
    await expect(prisma.$executeRaw`DELETE FROM audit_events`).rejects.toThrow(/append-only/);
    await expect(prisma.$executeRaw`TRUNCATE audit_events`).rejects.toThrow(/append-only/);
  });

  it('records writes atomically with the caller transaction', async () => {
    const before = await prisma.auditEvent.count();
    await expect(
      prisma.$transaction(async (tx) => {
        await audit.record({ action: 'test.rolled_back', entityType: 'test' }, null, tx);
        throw new Error('business write failed');
      }),
    ).rejects.toThrow('business write failed');
    expect(await prisma.auditEvent.count()).toBe(before);
  });
});
