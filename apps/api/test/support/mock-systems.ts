import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createApp as createCnHqApp } from '@huitong/mock-cn-hq/app';
import { createOaApp, type OaApp } from '@huitong/mock-oa/app';
import { createApp as createSgHrApp } from '@huitong/mock-sg-hr/app';
import { pino } from 'pino';

import type { PrismaService } from '../../src/infrastructure/prisma/prisma.service.js';

/** Credentials the mock systems and the API under test share. */
export const MOCK_CREDENTIALS = {
  SG_HR_API_KEY: 'integration-sg-hr-key',
  CN_HQ_USERNAME: 'integration_rfc',
  CN_HQ_PASSWORD: 'integration-cn-hq-pass',
  OA_API_TOKEN: 'integration-oa-token',
  OA_WEBHOOK_SECRET: 'integration-oa-webhook-secret',
} as const;

/** A server listening on a free local port. */
export interface Listening {
  url: string;
  close(): Promise<void>;
}

/** Listens on a free port of the loopback interface. */
export function listen(handler: RequestListener): Promise<Listening> {
  const server: Server = createServer(handler);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${String(port)}`,
        close: () =>
          new Promise<void>((done, fail) => {
            server.close((error) => {
              if (error) fail(error);
              else done();
            });
          }),
      });
    });
  });
}

const silent = () => pino({ level: 'silent' });

/** The real mock SG HR and CN HQ systems, each with its own fresh synthetic dataset. */
export async function startHrSystems(): Promise<{ sgHr: Listening; cnHq: Listening }> {
  const [sgHr, cnHq] = await Promise.all([
    listen(
      createSgHrApp({
        config: { port: 0, apiKey: MOCK_CREDENTIALS.SG_HR_API_KEY },
        logger: silent(),
      }),
    ),
    listen(
      createCnHqApp({
        config: {
          port: 0,
          username: MOCK_CREDENTIALS.CN_HQ_USERNAME,
          password: MOCK_CREDENTIALS.CN_HQ_PASSWORD,
        },
        logger: silent(),
      }),
    ),
  ]);
  return { sgHr, cnHq };
}

/** The mock OA platform, delivering its signed webhooks to `webhookUrl` without retries. */
export async function startOa(webhookUrl: string): Promise<OaApp & { server: Listening }> {
  const oa = createOaApp({
    config: {
      port: 0,
      apiToken: MOCK_CREDENTIALS.OA_API_TOKEN,
      webhookSecret: MOCK_CREDENTIALS.OA_WEBHOOK_SECRET,
      webhookUrl,
      retryDelaysMs: [],
    },
    logger: silent(),
  });
  return { ...oa, server: await listen(oa.app) };
}

/**
 * Points the seeded connectors at the running mocks and returns a function
 * that restores the seeded addresses.
 */
export async function pointConnectorsAt(
  prisma: PrismaService,
  urls: Record<string, string>,
): Promise<() => Promise<void>> {
  const ids = Object.keys(urls);
  const seeded = await prisma.connector.findMany({
    where: { id: { in: ids } },
    select: { id: true, baseUrl: true },
  });
  for (const id of ids) {
    await prisma.connector.update({ where: { id }, data: { baseUrl: urls[id] ?? null } });
  }
  return async () => {
    for (const connector of seeded) {
      await prisma.connector.update({
        where: { id: connector.id },
        data: { baseUrl: connector.baseUrl },
      });
    }
  };
}
