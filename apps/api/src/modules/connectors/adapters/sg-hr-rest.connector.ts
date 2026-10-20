import { z } from 'zod';

import { HttpJsonClient } from './http-json-client.js';
import { maskAccountNumber } from './minimise.js';
import { probeHealth } from './probe-health.js';
import type { ConnectorHealth, ExternalRecord, SystemConnector } from './system-connector.js';

export interface SgHrConnectorOptions {
  connectorId: string;
  baseUrl: string;
  apiKey: string;
  pageSize: number;
  fetchImpl?: typeof fetch;
}

/** SG HR's page envelope. Records are validated field by field later, by the mapping. */
const pageSchema = z.object({
  data: z.array(z.looseObject({ employeeNo: z.string().min(1) })),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int().min(0),
});

/** Adapter for Singapore HR: an `X-API-Key` header, English keys and `page`/`pageSize` paging. */
export class SgHrRestConnector implements SystemConnector {
  readonly type = 'SG_HR_REST' as const;
  readonly canFetchEmployees = true;
  readonly connectorId: string;
  private readonly api: HttpJsonClient;
  private readonly health: HttpJsonClient;
  private readonly pageSize: number;

  constructor(options: SgHrConnectorOptions) {
    this.connectorId = options.connectorId;
    this.pageSize = Math.min(100, Math.max(1, options.pageSize));
    const shared = {
      system: 'Singapore HR',
      baseUrl: options.baseUrl,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    };
    this.api = new HttpJsonClient({ ...shared, headers: { 'X-API-Key': options.apiKey } });
    this.health = new HttpJsonClient({ ...shared, headers: {}, retries: 0, timeoutMs: 3000 });
  }

  checkHealth(): Promise<ConnectorHealth> {
    return probeHealth(this.health);
  }

  async *fetchEmployees(): AsyncIterable<ExternalRecord[]> {
    for (let page = 1; ; page += 1) {
      const result = await this.api.get('/api/employees', pageSchema, {
        page,
        pageSize: this.pageSize,
      });
      yield result.data.map((record) => ({
        externalId: record.employeeNo,
        payload: { ...record, bankAccountNo: maskAccountNumber(record.bankAccountNo) },
      }));
      if (page * this.pageSize >= result.total || result.data.length === 0) return;
    }
  }
}
