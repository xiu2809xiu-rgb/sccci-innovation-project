import type { ConnectorType, HealthStatus } from '@huitong/shared';

/** One record as a source system holds it, under the vendor's own keys. */
export interface ExternalRecord {
  /** The record's key in the source system: the employee number for both HR systems. */
  externalId: string;
  /** The payload, minus anything HuiTong must not store (full bank account numbers). */
  payload: Record<string, unknown>;
}

export interface ConnectorHealth {
  status: HealthStatus;
  latencyMs: number;
  /** Safe to show: no credentials, URLs with secrets or stack traces. */
  message: string;
}

/**
 * Adapter: one external system behind one interface. The sync pipeline never
 * sees a vendor's API shape, paging style or authentication, only these
 * methods, so replacing a mock with the client's real system is one class.
 */
export interface SystemConnector {
  readonly connectorId: string;
  readonly type: ConnectorType;
  /** Whether the adapter can pull employee records into the master. */
  readonly canFetchEmployees: boolean;
  /**
   * Which version of the source the last fetch read, when the source can name
   * one (a staged file's SHA-256). The change digest includes it, so an apply
   * writes only from the very data its preview saw.
   */
  readonly sourceVersion?: string | null;
  checkHealth(): Promise<ConnectorHealth>;
  /** Every employee, a page at a time. */
  fetchEmployees(): AsyncIterable<ExternalRecord[]>;
}
