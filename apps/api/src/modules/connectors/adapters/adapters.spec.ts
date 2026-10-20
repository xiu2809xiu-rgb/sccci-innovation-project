import { describe, expect, it } from 'vitest';

import { UpstreamUnavailableError } from '../../../common/errors/app-error.js';
import { AppConfig } from '../../../config/app-config.js';
import { ConnectorFactory } from '../connector-factory.js';
import { CnHqSapConnector } from './cn-hq-sap.connector.js';
import { HttpJsonClient } from './http-json-client.js';
import { SgHrRestConnector } from './sg-hr-rest.connector.js';
import type { ExternalRecord } from './system-connector.js';

type Handler = (url: URL, init: RequestInit | undefined) => Response;

/** A fetch that records requests and answers from `handler`. */
function fakeFetch(handler: Handler) {
  const calls: { url: URL; headers: Record<string, string> }[] = [];
  const impl = ((input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
  return { impl, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function collect(pages: AsyncIterable<ExternalRecord[]>): Promise<ExternalRecord[]> {
  const records: ExternalRecord[] = [];
  for await (const page of pages) records.push(...page);
  return records;
}

describe('SgHrRestConnector', () => {
  it('pages through employees with the API key and keeps only the last four account digits', async () => {
    const people = ['E100001', 'E100002', 'E100003'].map((employeeNo) => ({
      employeeNo,
      bankAccountNo: '123-456789-0',
    }));
    const { impl, calls } = fakeFetch((url) => {
      const page = Number(url.searchParams.get('page'));
      return json({ data: people.slice((page - 1) * 2, page * 2), page, pageSize: 2, total: 3 });
    });
    const connector = new SgHrRestConnector({
      connectorId: 'sg-hr',
      baseUrl: 'http://sg-hr.test',
      apiKey: 'test-key-123',
      pageSize: 2,
      fetchImpl: impl,
    });
    const records = await collect(connector.fetchEmployees());
    expect(records.map((record) => record.externalId)).toEqual(['E100001', 'E100002', 'E100003']);
    expect(records[0]?.payload.bankAccountNo).toBe('••••7890');
    expect(calls).toHaveLength(2);
    expect(calls[0]?.headers['X-API-Key']).toBe('test-key-123');
  });
});

describe('CnHqSapConnector', () => {
  it('pages with $top and $skip over HTTP Basic and masks 银行账号', async () => {
    const people = ['E100001', 'E100005'].map((员工编号) => ({
      员工编号,
      银行账号: '6222020200112233',
    }));
    const { impl, calls } = fakeFetch((url) => {
      const skip = Number(url.searchParams.get('$skip'));
      return json({
        返回码: '0',
        消息: '成功',
        数据: { 总数: '2', 列表: people.slice(skip, skip + 1) },
      });
    });
    const connector = new CnHqSapConnector({
      connectorId: 'cn-hq',
      baseUrl: 'http://cn-hq.test',
      username: 'rfc',
      password: 'secret-password',
      pageSize: 1,
      fetchImpl: impl,
    });
    const records = await collect(connector.fetchEmployees());
    expect(records.map((record) => record.externalId)).toEqual(['E100001', 'E100005']);
    expect(records[1]?.payload.银行账号).toBe('••••2233');
    expect(calls[0]?.headers.Authorization).toBe(
      `Basic ${Buffer.from('rfc:secret-password').toString('base64')}`,
    );
  });

  it('treats a non-zero 返回码 as the system being unavailable', async () => {
    const { impl } = fakeFetch(() => json({ 返回码: 'E500', 消息: '系统繁忙' }));
    const connector = new CnHqSapConnector({
      connectorId: 'cn-hq',
      baseUrl: 'http://cn-hq.test',
      username: 'rfc',
      password: 'secret-password',
      pageSize: 50,
      fetchImpl: impl,
    });
    await expect(collect(connector.fetchEmployees())).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });
});

describe('HttpJsonClient', () => {
  const schema = { safeParse: (value: unknown) => ({ success: true as const, data: value }) };

  it('retries transient failures, then succeeds', async () => {
    let attempts = 0;
    const { impl } = fakeFetch(() => {
      attempts += 1;
      return attempts < 3 ? json({}, 503) : json({ ok: true });
    });
    const client = new HttpJsonClient({
      system: 'Test',
      baseUrl: 'http://x.test',
      headers: {},
      fetchImpl: impl,
    });
    await expect(client.get('/thing', schema as never)).resolves.toEqual({ ok: true });
    expect(attempts).toBe(3);
  });

  it('fails at once on a client error, without echoing the body', async () => {
    const { impl } = fakeFetch(() => json({ secret: 'do-not-echo' }, 404));
    const client = new HttpJsonClient({
      system: 'Test',
      baseUrl: 'http://x.test',
      headers: {},
      fetchImpl: impl,
    });
    const failure = await client.get('/thing', schema as never).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(UpstreamUnavailableError);
    expect(JSON.stringify((failure as UpstreamUnavailableError).details)).not.toContain(
      'do-not-echo',
    );
  });
});

describe('ConnectorFactory', () => {
  const config = AppConfig.fromEnv({
    DATABASE_URL: 'postgresql://localhost/test',
    REDIS_URL: 'redis://localhost',
    JWT_ACCESS_SECRET: 'factory-test-secret-0123456789abcdef',
  });
  const factory = new ConnectorFactory(config);

  it('builds the adapter for each connector type, and nothing to pull from offline ones', async () => {
    const sg = factory.create({
      id: 'sg-hr',
      type: 'SG_HR_REST',
      baseUrl: null,
      config: { pageSize: 50 },
    });
    expect(sg).toBeInstanceOf(SgHrRestConnector);
    expect(
      factory.create({ id: 'cn-hq', type: 'CN_HQ_SAP', baseUrl: null, config: {} }),
    ).toBeInstanceOf(CnHqSapConnector);
    const oa = factory.create({ id: 'oa', type: 'OA_WEBHOOK', baseUrl: null, config: {} });
    expect(oa.canFetchEmployees).toBe(false);
    const excel = factory.create({
      id: 'excel-master',
      type: 'FILE_IMPORT',
      baseUrl: null,
      config: {},
    });
    await expect(excel.checkHealth()).resolves.toMatchObject({ status: 'OK' });
    await expect(collect(excel.fetchEmployees())).rejects.toThrow('cannot provide employees');
  });
});
