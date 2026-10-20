import { z } from 'zod';

import type { HttpJsonClient } from './http-json-client.js';
import type { ConnectorHealth } from './system-connector.js';

const anyJson = z.unknown();

/** Calls a system's unauthenticated health endpoint and reports how it went, in words safe to show. */
export async function probeHealth(
  client: HttpJsonClient,
  path = '/health',
): Promise<ConnectorHealth> {
  const started = performance.now();
  try {
    await client.get(path, anyJson);
    const latencyMs = Math.round(performance.now() - started);
    return { status: 'OK', latencyMs, message: `Responded in ${String(latencyMs)} ms` };
  } catch {
    return {
      status: 'FAILED',
      latencyMs: Math.round(performance.now() - started),
      message: 'Did not respond as expected',
    };
  }
}
