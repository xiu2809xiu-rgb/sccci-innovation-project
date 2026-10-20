import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { DEMO_PASSWORD } from '../prisma/seed/users.js';
import {
  anonymousClient,
  AUTH_COOKIES,
  cookieValue,
  createTestApp,
  CSRF_HEADER,
  setCookie,
  signedInClient,
} from './support/test-app.js';

describe('Auth (integration)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a sign-in without the CSRF header', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'meiling.tan@orge.example', password: DEMO_PASSWORD })
      .expect(403);
    expect(response.body.error.code).toBe('CSRF_INVALID');
  });

  it('rejects a wrong password with a generic error and audits the attempt', async () => {
    const client = await anonymousClient(app);
    const before = await prisma.auditEvent.count({ where: { action: 'auth.login.failed' } });
    const response = await client.agent
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER, client.csrf)
      .send({ email: 'meiling.tan@orge.example', password: 'wrong-password' })
      .expect(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(await prisma.auditEvent.count({ where: { action: 'auth.login.failed' } })).toBe(
      before + 1,
    );
  });

  it('signs in with a password and sets hardened session cookies', async () => {
    const client = await anonymousClient(app);
    const before = await prisma.auditEvent.count({ where: { action: 'auth.login.succeeded' } });
    const response = await client.agent
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER, client.csrf)
      .send({ email: 'MeiLing.Tan@orge.example', password: DEMO_PASSWORD })
      .expect(200);
    expect(response.body.data).toMatchObject({
      role: 'HR_SG',
      homeEntityCode: 'SG01',
      employeeNo: 'E100003',
    });
    expect(response.body.data.permissions).toContain('conflicts:resolve');
    const access = setCookie(response, AUTH_COOKIES.access) ?? '';
    const refresh = setCookie(response, AUTH_COOKIES.refresh) ?? '';
    expect(access).toMatch(/HttpOnly/);
    expect(access).toMatch(/SameSite=Strict/);
    expect(access).toMatch(/Path=\/api/);
    expect(refresh).toMatch(/Path=\/api\/v1\/auth/);
    await client.agent.get('/api/v1/auth/me').expect(200);
    expect(await prisma.auditEvent.count({ where: { action: 'auth.login.succeeded' } })).toBe(
      before + 1,
    );
  });

  it('refuses /auth/me without a session', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rotates refresh tokens and revokes the family when an old one is replayed', async () => {
    const client = await signedInClient(app, 'HR_HQ');
    const first = await client.agent
      .post('/api/v1/auth/refresh')
      .set(CSRF_HEADER, client.csrf)
      .expect(200);
    const firstRefresh = (setCookie(first, AUTH_COOKIES.refresh) ?? '').split(';')[0] ?? '';
    const csrf = cookieValue(first, AUTH_COOKIES.csrf) ?? '';
    const second = await client.agent
      .post('/api/v1/auth/refresh')
      .set(CSRF_HEADER, csrf)
      .expect(200);
    const latestCsrf = cookieValue(second, AUTH_COOKIES.csrf) ?? '';

    // An attacker replays the already-rotated token.
    const replay = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [firstRefresh, `${AUTH_COOKIES.csrf}=${csrf}`])
      .set(CSRF_HEADER, csrf)
      .expect(401);
    expect(replay.body.error.code).toBe('SESSION_EXPIRED');
    expect(
      await prisma.auditEvent.count({ where: { action: 'auth.refresh.reuse_detected' } }),
    ).toBeGreaterThan(0);

    // The legitimate holder's newest token was revoked with the family.
    await client.agent.post('/api/v1/auth/refresh').set(CSRF_HEADER, latestCsrf).expect(401);
  });

  it('signs out by revoking the session', async () => {
    const client = await signedInClient(app, 'AUDITOR');
    const before = await prisma.auditEvent.count({ where: { action: 'auth.logout' } });
    await client.agent.post('/api/v1/auth/logout').set(CSRF_HEADER, client.csrf).expect(204);
    await client.agent.post('/api/v1/auth/refresh').set(CSRF_HEADER, client.csrf).expect(401);
    expect(await prisma.auditEvent.count({ where: { action: 'auth.logout' } })).toBe(before + 1);
  });

  it('rate-limits sign-in attempts from one client', async () => {
    // A fresh app, so the sign-ins in earlier tests do not count towards the limit.
    const limited = await createTestApp();
    try {
      const client = await anonymousClient(limited);
      const attempt = () =>
        client.agent
          .post('/api/v1/auth/login')
          .set(CSRF_HEADER, client.csrf)
          .send({ email: 'nobody@orge.example', password: 'wrong-password' });
      for (let count = 0; count < 10; count += 1) {
        await attempt().expect(401);
      }
      const blocked = await attempt().expect(429);
      expect(blocked.body.error.code).toBe('RATE_LIMITED');
    } finally {
      await limited.close();
    }
  });

  it('has no demo sign-in route when DEMO_MODE is off, and says so in its options', async () => {
    const productionLike = await createTestApp({ DEMO_MODE: 'false' });
    try {
      const client = await anonymousClient(productionLike);
      await client.agent
        .post('/api/v1/auth/demo-login')
        .set(CSRF_HEADER, client.csrf)
        .send({ role: 'HR_SG' })
        .expect(404);
      const options = await request(productionLike.getHttpServer())
        .get('/api/v1/auth/options')
        .expect(200);
      expect(options.body).toEqual({ data: { demoMode: false } });
    } finally {
      await productionLike.close();
    }
  });

  it('advertises demo sign-in when DEMO_MODE is on', async () => {
    const options = await request(app.getHttpServer()).get('/api/v1/auth/options').expect(200);
    expect(options.body).toEqual({ data: { demoMode: true } });
  });
});
