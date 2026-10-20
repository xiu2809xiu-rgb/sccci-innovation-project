import type { NestExpressApplication } from '@nestjs/platform-express';
import { dataEnvelopeSchema, LIVE_CONNECTOR_STATUSES, overviewSchema } from '@huitong/shared';
import request from 'supertest';

import { createTestApp, signedInClient } from './support/test-app.js';

const envelope = dataEnvelopeSchema(overviewSchema);

describe('Overview (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a session', async () => {
    await request(app.getHttpServer()).get('/api/v1/overview').expect(401);
  });

  it('returns the documented contract with every seeded connector', async () => {
    const hr = await signedInClient(app, 'HR_SG');
    const { data } = envelope.parse((await hr.agent.get('/api/v1/overview').expect(200)).body);
    expect(data.connectors.map((connector) => connector.id)).toEqual(
      expect.arrayContaining(['sg-hr', 'cn-hq', 'oa', 'excel-master']),
    );
    const live = data.connectors.filter((connector) =>
      LIVE_CONNECTOR_STATUSES.includes(connector.status),
    );
    expect(data.kpis.connectors.total).toBe(live.length);
    expect(data.kpis.connectors.healthy).toBeLessThanOrEqual(live.length);
  });

  it('reports only the queues the caller can act on', async () => {
    const hr = await signedInClient(app, 'HR_SG');
    const hrView = envelope.parse((await hr.agent.get('/api/v1/overview').expect(200)).body).data;
    expect(hrView.pendingApprovals.conflicts).not.toBeNull();
    expect(hrView.pendingApprovals.mappingProposals).not.toBeNull();
    expect(hrView.pendingApprovals.crossBorderTransfers).toBeNull();

    const admin = await signedInClient(app, 'SYSTEM_ADMIN');
    const adminView = envelope.parse(
      (await admin.agent.get('/api/v1/overview').expect(200)).body,
    ).data;
    // Separation of duties: administrators review transfers but not HR data.
    expect(adminView.pendingApprovals.crossBorderTransfers).toBeGreaterThanOrEqual(1);
    expect(adminView.pendingApprovals.conflicts).toBeNull();
    expect(adminView.pendingApprovals.mappingProposals).toBeNull();
  });

  it('keeps sign-in events out of the activity feed', async () => {
    const auditor = await signedInClient(app, 'AUDITOR');
    const { data } = envelope.parse((await auditor.agent.get('/api/v1/overview').expect(200)).body);
    expect(data.activity.filter((item) => item.action.startsWith('auth.'))).toEqual([]);
  });
});
