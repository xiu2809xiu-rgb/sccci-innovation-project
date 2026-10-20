import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AUTH_COOKIES, CSRF_HEADER, type Role } from '@huitong/shared';
import { Logger } from 'nestjs-pino';
import request from 'supertest';

import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap/configure-app.js';
import { AppConfig } from '../../src/config/app-config.js';
import { TEST_DATABASE_URL, TEST_REDIS_URL } from './test-env.js';

/** Boots the real application (same module graph and HTTP setup as production) against the test database. */
export async function createTestApp(
  overrides: Record<string, string> = {},
): Promise<NestExpressApplication> {
  const config = AppConfig.fromEnv({
    NODE_ENV: 'test',
    APP_ENV: 'local',
    LOG_LEVEL: 'silent',
    DATABASE_URL: TEST_DATABASE_URL,
    REDIS_URL: TEST_REDIS_URL,
    JWT_ACCESS_SECRET: 'integration-test-secret-0123456789abcdef',
    DEMO_MODE: 'true',
    // supertest only sends Secure cookies over HTTPS; production keeps them Secure.
    COOKIE_SECURE: 'false',
    ...overrides,
  });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config)],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    rawBody: true,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  configureApp(app, config);
  await app.init();
  return app;
}

/** A cookie-keeping client with its CSRF token, ready for state-changing requests. */
export interface TestClient {
  agent: ReturnType<typeof request.agent>;
  csrf: string;
}

/** Fetches the CSRF cookie and returns a client that sends it back. */
export async function anonymousClient(app: NestExpressApplication): Promise<TestClient> {
  const agent = request.agent(app.getHttpServer());
  const response = await agent.get('/api/v1/auth/csrf').expect(200);
  return { agent, csrf: (response.body as { data: { csrfToken: string } }).data.csrfToken };
}

/** Signs in as the seeded demo user of `role`. Sign-in rotates the CSRF token, so the new one is kept. */
export async function signedInClient(app: NestExpressApplication, role: Role): Promise<TestClient> {
  const client = await anonymousClient(app);
  const response = await client.agent
    .post('/api/v1/auth/demo-login')
    .set(CSRF_HEADER, client.csrf)
    .send({ role })
    .expect(200);
  return { agent: client.agent, csrf: cookieValue(response, AUTH_COOKIES.csrf) ?? client.csrf };
}

/** The value of a cookie set by a response. */
export function cookieValue(response: request.Response, name: string): string | undefined {
  return setCookie(response, name)
    ?.split(';')[0]
    ?.slice(name.length + 1);
}

/** Reads a named cookie from a response's Set-Cookie headers. */
export function setCookie(response: request.Response, name: string): string | undefined {
  const header = response.headers['set-cookie'] as unknown;
  const cookies = Array.isArray(header) ? (header as string[]) : [];
  return cookies.find((cookie) => cookie.startsWith(`${name}=`));
}

export { AUTH_COOKIES, CSRF_HEADER };
