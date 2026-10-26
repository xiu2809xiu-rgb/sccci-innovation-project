import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  accessMatrixSchema,
  classificationEntrySchema,
  dataEnvelopeSchema,
  errorEnvelopeSchema,
  listEnvelopeSchema,
  retentionPolicySchema,
  ROLES,
  transferEntrySchema,
} from '@huitong/shared';
import request from 'supertest';

import { createOpenApiDocument } from '../src/bootstrap/swagger.js';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { createTestApp, CSRF_HEADER, signedInClient } from './support/test-app.js';

const matrix = dataEnvelopeSchema(accessMatrixSchema);
const classifications = listEnvelopeSchema(classificationEntrySchema);
const transfers = listEnvelopeSchema(transferEntrySchema);
const retention = listEnvelopeSchema(retentionPolicySchema);

describe('Governance (integration, area 4 head start)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a session', async () => {
    await request(app.getHttpServer()).get('/api/v1/governance/transfers').expect(401);
  });

  it("documents area 4's routes in the OpenAPI document", () => {
    expect(Object.keys(createOpenApiDocument(app).paths)).toEqual(
      expect.arrayContaining([
        '/api/v1/governance/access',
        '/api/v1/governance/classifications',
        '/api/v1/governance/transfers',
        '/api/v1/governance/transfers/{transferId}/status',
        '/api/v1/governance/retention',
        '/api/v1/audit/events',
        '/api/v1/audit/verify',
        '/api/v1/analytics/ai-usage',
        '/api/v1/analytics/clickstream',
        '/api/v1/analytics/observability',
      ]),
    );
  });

  it('shows the access policy the guard enforces, as real data', async () => {
    const auditor = await signedInClient(app, 'AUDITOR');
    const body = matrix.parse(
      (await auditor.agent.get('/api/v1/governance/access').expect(200)).body,
    );
    expect(body.meta).toBeUndefined();
    expect(body.data.roles).toHaveLength(ROLES.length);
    const admin = body.data.roles.find((row) => row.role === 'SYSTEM_ADMIN');
    // Separation of duties: administrators configure the platform but never resolve HR conflicts.
    expect(admin?.permissions).toContain('governance:manage');
    expect(admin?.permissions).not.toContain('conflicts:resolve');
  });

  it('lists the transfer register with the fields each entry shares', async () => {
    const hr = await signedInClient(app, 'HR_SG');
    const body = transfers.parse(
      (await hr.agent.get('/api/v1/governance/transfers').expect(200)).body,
    );
    expect(body.meta).toEqual({ page: 1, pageSize: 25, total: 3 });
    const master = body.data.find((entry) => entry.name === 'SG01 employee master to Group HQ');
    expect(master).toMatchObject({
      status: 'ACTIVE',
      fromEntityCode: 'SG01',
      toEntityCode: 'CN01',
    });
    expect(master?.fieldsCovered).toEqual(expect.arrayContaining(['employeeNo', 'workEmail']));
    expect(master?.fieldsCovered).not.toContain('baseSalary');
    const pay = body.data.find((entry) => entry.dataCategories.includes('baseSalary'));
    expect(pay?.status).toBe('PENDING_REVIEW');
  });

  it('pages the classification register and lists the retention rules', async () => {
    const auditor = await signedInClient(app, 'AUDITOR');
    const page = classifications.parse(
      (await auditor.agent.get('/api/v1/governance/classifications?pageSize=5').expect(200)).body,
    );
    expect(page.data).toHaveLength(5);
    expect(page.meta.total).toBe(await prisma.dataClassification.count());

    const rules = retention.parse(
      (await auditor.agent.get('/api/v1/governance/retention').expect(200)).body,
    );
    expect(rules.meta.total).toBe(await prisma.retentionPolicy.count());
    expect(rules.data.map((rule) => rule.dataCategory)).toContain('audit_events');
  });

  it('leaves changing an entry to area 4, behind governance:manage and a reason', async () => {
    const id = (await prisma.crossBorderTransfer.findFirstOrThrow({ select: { id: true } })).id;
    const path = `/api/v1/governance/transfers/${id}/status`;

    const admin = await signedInClient(app, 'SYSTEM_ADMIN');
    const notBuilt = await admin.agent
      .put(path)
      .set(CSRF_HEADER, admin.csrf)
      .send({ status: 'SUSPENDED', reason: 'Review due' })
      .expect(501);
    expect(errorEnvelopeSchema.parse(notBuilt.body).error.code).toBe('NOT_IMPLEMENTED');
    await admin.agent
      .put(path)
      .set(CSRF_HEADER, admin.csrf)
      .send({ status: 'SUSPENDED' })
      .expect(400);

    const hr = await signedInClient(app, 'HR_HQ');
    await hr.agent
      .put(path)
      .set(CSRF_HEADER, hr.csrf)
      .send({ status: 'ACTIVE', reason: 'We need it' })
      .expect(403);
  });

  it('refuses roles without governance:read', async () => {
    const manager = await signedInClient(app, 'HIRING_MANAGER');
    await manager.agent.get('/api/v1/governance/classifications').expect(403);
  });

  it.todo('approves a pending entry, and HQ roles see its fields on the next request (F-4)');
  it.todo('audits every administration change with who made it and why (F-1, F-3, F-4)');
});
