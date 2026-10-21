import type { NestExpressApplication } from '@nestjs/platform-express';
import { dataEnvelopeSchema, errorEnvelopeSchema, managementReportSchema } from '@huitong/shared';
import request from 'supertest';

import { createTestApp, signedInClient } from './support/test-app.js';

const report = dataEnvelopeSchema(managementReportSchema);

describe('Management reports (integration, area 3 head start)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a session', async () => {
    await request(app.getHttpServer()).get('/api/v1/reports/management?period=2026-09').expect(401);
  });

  it('serves a month to MANAGEMENT, each figure with its sources, labelled as sample data', async () => {
    const management = await signedInClient(app, 'MANAGEMENT');
    const body = report.parse(
      (await management.agent.get('/api/v1/reports/management?period=2026-09').expect(200)).body,
    );
    expect(body.meta).toEqual({ mock: true });
    expect(
      body.data.entities.map((entity) => [entity.entityCode, entity.headcount.sources]),
    ).toEqual([
      ['SG01', ['sg-hr']],
      ['CN01', ['cn-hq']],
    ]);
  });

  it('answers 404 for a month without a report, and 403 to roles without reports:read', async () => {
    const hr = await signedInClient(app, 'HR_SG');
    const missing = await hr.agent.get('/api/v1/reports/management?period=2026-10').expect(404);
    expect(errorEnvelopeSchema.parse(missing.body).error.code).toBe('NOT_FOUND');

    const adminOps = await signedInClient(app, 'ADMIN_OPS');
    await adminOps.agent.get('/api/v1/reports/management?period=2026-09').expect(403);
  });

  it.todo('draws the figures from the consolidated runs and the employee master (D-5)');
  it.todo('drops meta.mock once the real repository replaces the sample');
});
