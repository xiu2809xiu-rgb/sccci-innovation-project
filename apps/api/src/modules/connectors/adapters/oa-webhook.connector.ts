import { noEmployees } from './connector-capability.error.js';
import { HttpJsonClient } from './http-json-client.js';
import { probeHealth } from './probe-health.js';
import type { ConnectorHealth, ExternalRecord, SystemConnector } from './system-connector.js';

export interface OaConnectorOptions {
  connectorId: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

/** Adapter for the OA platform. It pushes approvals to HuiTong by webhook, so it holds no employees to pull. */
export class OaWebhookConnector implements SystemConnector {
  readonly type = 'OA_WEBHOOK' as const;
  readonly canFetchEmployees = false;
  readonly connectorId: string;
  private readonly health: HttpJsonClient;

  constructor(options: OaConnectorOptions) {
    this.connectorId = options.connectorId;
    this.health = new HttpJsonClient({
      system: 'OA platform',
      baseUrl: options.baseUrl,
      headers: {},
      retries: 0,
      timeoutMs: 3000,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    });
  }

  checkHealth(): Promise<ConnectorHealth> {
    return probeHealth(this.health);
  }

  fetchEmployees(): AsyncIterable<ExternalRecord[]> {
    return noEmployees(this.connectorId);
  }
}
