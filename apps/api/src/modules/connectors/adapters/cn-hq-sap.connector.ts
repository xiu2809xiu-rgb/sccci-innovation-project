import { z } from 'zod';

import { UpstreamUnavailableError } from '../../../common/errors/app-error.js';
import { HttpJsonClient } from './http-json-client.js';
import { maskAccountNumber } from './minimise.js';
import { probeHealth } from './probe-health.js';
import type { ConnectorHealth, ExternalRecord, SystemConnector } from './system-connector.js';

export interface CnHqConnectorOptions {
  connectorId: string;
  baseUrl: string;
  username: string;
  password: string;
  pageSize: number;
  fetchImpl?: typeof fetch;
}

/** HQ's envelope: `{ 返回码, 消息, 数据: { 总数, 列表 } }`, where 返回码 "0" means success. */
const envelopeSchema = z.object({
  返回码: z.string(),
  消息: z.string(),
  数据: z
    .object({
      总数: z.coerce.number().int().min(0),
      列表: z.array(z.looseObject({ 员工编号: z.string().min(1) })),
    })
    .optional(),
});

/** Adapter for China HQ's SAP-like system: HTTP Basic, Chinese keys, OData `$top`/`$skip` paging. */
export class CnHqSapConnector implements SystemConnector {
  readonly type = 'CN_HQ_SAP' as const;
  readonly canFetchEmployees = true;
  readonly connectorId: string;
  private readonly api: HttpJsonClient;
  private readonly health: HttpJsonClient;
  private readonly pageSize: number;

  constructor(options: CnHqConnectorOptions) {
    this.connectorId = options.connectorId;
    this.pageSize = Math.min(200, Math.max(1, options.pageSize));
    const credentials = Buffer.from(`${options.username}:${options.password}`).toString('base64');
    const shared = {
      system: 'China HQ SAP',
      baseUrl: options.baseUrl,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    };
    this.api = new HttpJsonClient({
      ...shared,
      headers: { Authorization: `Basic ${credentials}` },
    });
    this.health = new HttpJsonClient({ ...shared, headers: {}, retries: 0, timeoutMs: 3000 });
  }

  checkHealth(): Promise<ConnectorHealth> {
    return probeHealth(this.health);
  }

  async *fetchEmployees(): AsyncIterable<ExternalRecord[]> {
    for (let skip = 0; ; skip += this.pageSize) {
      const envelope = await this.api.get('/sap/opu/hr/employees', envelopeSchema, {
        $top: this.pageSize,
        $skip: skip,
      });
      if (envelope.返回码 !== '0' || !envelope.数据) {
        throw new UpstreamUnavailableError('China HQ SAP', { returnCode: envelope.返回码 });
      }
      const { 列表: list, 总数: total } = envelope.数据;
      yield list.map((record) => ({
        externalId: record.员工编号,
        payload: { ...record, 银行账号: maskAccountNumber(record.银行账号) },
      }));
      if (skip + this.pageSize >= total || list.length === 0) return;
    }
  }
}
