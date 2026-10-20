import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { createTestApp, signedInClient } from './support/test-app.js';

describe('Users and RBAC (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets a system administrator list users, without password hashes', async () => {
    const admin = await signedInClient(app, 'SYSTEM_ADMIN');
    const response = await admin.agent.get('/api/v1/users?pageSize=5').expect(200);
    expect(response.body.meta).toMatchObject({ page: 1, pageSize: 5 });
    expect(response.body.meta.total).toBeGreaterThanOrEqual(7);
    expect(response.body.data).toHaveLength(5);
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('forbids roles without users:manage', async () => {
    const hr = await signedInClient(app, 'HR_SG');
    const response = await hr.agent.get('/api/v1/users').expect(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('requires a session', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });

  it('reports validation failures with the offending path', async () => {
    const admin = await signedInClient(app, 'SYSTEM_ADMIN');
    const response = await admin.agent.get('/api/v1/users?pageSize=101').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(response.body.error.details).toEqual([expect.objectContaining({ path: 'pageSize' })]);
  });
});
