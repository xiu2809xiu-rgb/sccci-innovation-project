import type { z } from 'zod';

import { UpstreamUnavailableError } from '../../../common/errors/app-error.js';

export interface HttpJsonClientOptions {
  /** Shown in errors, e.g. "Singapore HR". */
  system: string;
  baseUrl: string;
  headers: Record<string, string>;
  timeoutMs?: number;
  /** Extra attempts after a network error, a 429 or a 5xx. */
  retries?: number;
  fetchImpl?: typeof fetch;
}

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

/**
 * GETs JSON from a source system and validates it before anyone uses it
 * (CLAUDE.md: validate all external input at the boundary). Transient
 * failures are retried with backoff; everything else becomes an
 * UpstreamUnavailableError that names the system, never the response body.
 */
export class HttpJsonClient {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(private readonly options: HttpJsonClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.retries = options.retries ?? 2;
  }

  async get<T>(
    path: string,
    schema: z.ZodType<T>,
    query: Record<string, string | number> = {},
  ): Promise<T> {
    const url = new URL(path, this.options.baseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));

    let lastStatus: number | null = null;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      if (attempt > 0) await HttpJsonClient.pause(250 * 2 ** (attempt - 1));
      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          headers: { Accept: 'application/json', ...this.options.headers },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch {
        lastStatus = null;
        continue;
      }
      if (RETRYABLE.has(response.status)) {
        lastStatus = response.status;
        continue;
      }
      if (!response.ok) {
        throw new UpstreamUnavailableError(this.options.system, {
          status: response.status,
          path: url.pathname,
        });
      }
      const parsed = schema.safeParse(await response.json().catch(() => undefined));
      if (!parsed.success) {
        throw new UpstreamUnavailableError(this.options.system, {
          reason: 'unexpected response shape',
          path: url.pathname,
        });
      }
      return parsed.data;
    }
    throw new UpstreamUnavailableError(this.options.system, {
      reason: lastStatus === null ? 'no response' : 'still failing after retries',
      status: lastStatus,
      path: url.pathname,
    });
  }

  private static pause(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
