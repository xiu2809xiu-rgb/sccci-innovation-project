import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { createTestApp } from './support/test-app.js';

describe('Platform (integration)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports the database and Redis as up', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      details: { database: { status: 'up' }, redis: { status: 'up' } },
    });
  });

  it('GET /health/live answers without touching dependencies', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
  });

  it('echoes a supplied UUID request id and generates one otherwise', async () => {
    const supplied = '0b8e4a43-9c1f-4f6a-8d0b-5d4b1c2a3e7f';
    const echoed = await request(app.getHttpServer())
      .get('/health/live')
      .set('X-Request-Id', supplied);
    expect(echoed.headers['x-request-id']).toBe(supplied);
    const generated = await request(app.getHttpServer())
      .get('/health/live')
      .set('X-Request-Id', 'not-a-uuid');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('answers unknown routes with the error envelope and the request id as trace id', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/nothing-here').expect(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.any(String) as string,
        traceId: response.headers['x-request-id'] as string,
      },
    });
  });

  it('sends strict security headers on API responses', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/auth/csrf');
    expect(response.headers['content-security-policy']).toBe(
      "default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'",
    );
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('allows CORS only for configured origins', async () => {
    const allowed = await request(app.getHttpServer())
      .options('/api/v1/auth/csrf')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const denied = await request(app.getHttpServer())
      .options('/api/v1/auth/csrf')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'GET');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
