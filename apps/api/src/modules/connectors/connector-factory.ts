import { Injectable } from '@nestjs/common';
import type { ConnectorType } from '@huitong/shared';

import { AppConfig } from '../../config/app-config.js';
import { CnHqSapConnector } from './adapters/cn-hq-sap.connector.js';
import { OaWebhookConnector } from './adapters/oa-webhook.connector.js';
import { OfflineConnector } from './adapters/offline.connector.js';
import { SgHrRestConnector } from './adapters/sg-hr-rest.connector.js';
import type { SystemConnector } from './adapters/system-connector.js';

/** The parts of a `connectors` row the factory needs. */
export interface ConnectorDefinition {
  id: string;
  type: ConnectorType;
  baseUrl: string | null;
  config: unknown;
}

function setting(config: unknown, key: string): number | undefined {
  if (config === null || typeof config !== 'object') return undefined;
  const value = (config as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : undefined;
}

/**
 * Factory: builds the right adapter for a connector row. Settings come from
 * the row, credentials only from the typed configuration (environment or
 * secret store), so the database never holds a secret.
 */
@Injectable()
export class ConnectorFactory {
  constructor(private readonly config: AppConfig) {}

  create(definition: ConnectorDefinition, fetchImpl?: typeof fetch): SystemConnector {
    const { sgHr, cnHq, oa } = this.config.connectors;
    const withFetch = fetchImpl ? { fetchImpl } : {};
    switch (definition.type) {
      case 'SG_HR_REST':
        return new SgHrRestConnector({
          connectorId: definition.id,
          baseUrl: definition.baseUrl ?? sgHr.baseUrl,
          apiKey: sgHr.apiKey,
          pageSize: setting(definition.config, 'pageSize') ?? 100,
          ...withFetch,
        });
      case 'CN_HQ_SAP':
        return new CnHqSapConnector({
          connectorId: definition.id,
          baseUrl: definition.baseUrl ?? cnHq.baseUrl,
          username: cnHq.username,
          password: cnHq.password,
          pageSize: setting(definition.config, 'pageSize') ?? 200,
          ...withFetch,
        });
      case 'OA_WEBHOOK':
        return new OaWebhookConnector({
          connectorId: definition.id,
          baseUrl: definition.baseUrl ?? oa.baseUrl,
          ...withFetch,
        });
      case 'FILE_IMPORT':
      case 'NOTIFICATION':
      case 'GENERIC_REST':
        return new OfflineConnector(definition.id, definition.type);
    }
  }
}
