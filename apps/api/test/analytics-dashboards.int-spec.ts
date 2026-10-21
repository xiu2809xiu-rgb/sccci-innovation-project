import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  aiUsageDashboardSchema,
  clickstreamDashboardSchema,
  dataEnvelopeSchema,
  errorEnvelopeSchema,
  observabilityDashboardSchema,
} from '@huitong/shared';
import request from 'supertest';

import { createTestApp, signedInClient } from './support/test-app.js';

const aiUsage = dataEnvelopeSchema(aiUsageDashboardSchema);
const clickstream = dataEnvelopeSchema(clickstreamDashboardSchema);
const observability = dataEnvelopeSchema(observabilityDashboardSchema);

describe('Monitoring dashboards (integration, area 4 head start)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a session', async () => {
    await request(app.getHttpServer()).get('/api/v1/analytics/ai-usage').expect(401);
  });

  it('serves AI usage for 30 days by default, labelled as sample data', async () => {
    const auditor = await signedInClient(app, 'AUDITOR');
    const body = aiUsage.parse(
      (await auditor.agent.get('/api/v1/analytics/ai-usage').expect(200)).body,
    );
    expect(body.meta).toEqual({ mock: true });
    expect(body.data.days).toBe(30);
    expect(body.data.byDay).toHaveLength(30);

    const week = aiUsage.parse(
      (await auditor.agent.get('/api/v1/analytics/ai-usage?days=7').expect(200)).body,
    );
    expect(week.data.byDay).toHaveLength(7);
    const invalid = await auditor.agent.get('/api/v1/analytics/ai-usage?days=12').expect(400);
    expect(errorEnvelopeSchema.parse(invalid.body).error.code).toBe('VALIDATION_FAILED');
  });

  it('serves clickstream and observability to MANAGEMENT, but not AI usage', async () => {
    const management = await signedInClient(app, 'MANAGEMENT');
    const clicks = clickstream.parse(
      (await management.agent.get('/api/v1/analytics/clickstream?days=90').expect(200)).body,
    );
    expect(clicks.data.days).toBe(90);
    const health = observability.parse(
      (await management.agent.get('/api/v1/analytics/observability').expect(200)).body,
    );
    expect(health.data.requests).toHaveLength(30);
    await management.agent.get('/api/v1/analytics/ai-usage').expect(403);
  });

  it('refuses roles without analytics:read', async () => {
    const hr = await signedInClient(app, 'HR_SG');
    await hr.agent.get('/api/v1/analytics/clickstream').expect(403);
  });

  it.todo('drops meta.mock once area 4 binds the real aggregations (G-1, G-2, G-3)');
});
