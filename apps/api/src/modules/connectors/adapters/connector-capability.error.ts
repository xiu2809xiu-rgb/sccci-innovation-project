import { AppError } from '../../../common/errors/app-error.js';
import type { ExternalRecord } from './system-connector.js';

/** Asked a connector for something its system does not offer, e.g. a sync from the OA platform. */
export class ConnectorCapabilityError extends AppError {
  constructor(connectorId: string, capability: string) {
    super('CONFLICT', `Connector ${connectorId} cannot provide ${capability}`, 409, {
      connectorId,
      capability,
    });
  }
}

/** What adapters with nothing to pull return from `fetchEmployees`: it fails on first use. */
export function noEmployees(connectorId: string): AsyncIterable<ExternalRecord[]> {
  return {
    [Symbol.asyncIterator]: () => ({
      next: () => Promise.reject(new ConnectorCapabilityError(connectorId, 'employees')),
    }),
  };
}
