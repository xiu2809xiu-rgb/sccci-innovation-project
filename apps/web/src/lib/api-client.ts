import { AUTH_COOKIES, CSRF_HEADER, errorEnvelopeSchema } from '@huitong/shared';
import type { z } from 'zod';

import { ApiError } from './api-error';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
  /** Sent as `Idempotency-Key` on POSTs that start work, so retries never run it twice. */
  idempotencyKey?: string;
}

export interface ApiClientOptions {
  /** Prefix for every path; same-origin `/api/v1` by default (Vite and nginx proxy it). */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Reads cookies; injectable for tests. */
  readCookies?: () => string;
  /** Called when the session cannot be refreshed (the app redirects to sign-in). */
  onSessionExpired?: () => void;
}

const UNSAFE: ReadonlySet<Method> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/demo-login', '/auth/csrf'];

/**
 * The web app's only way to call the API. It sends the CSRF token on
 * state-changing requests, refreshes an expired session once (sharing one
 * refresh between concurrent calls, because a second refresh with the same
 * token would trip reuse detection), validates every response against its
 * zod contract, and turns failures into {@link ApiError}s with a trace id.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly readCookies: () => string;
  private readonly onSessionExpired: () => void;
  private refreshing: Promise<boolean> | null = null;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '/api/v1';
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.readCookies = options.readCookies ?? (() => document.cookie);
    this.onSessionExpired = options.onSessionExpired ?? (() => undefined);
  }

  get<T>(path: string, schema: z.ZodType<T>, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.request('GET', path, schema, options);
  }

  post<T>(path: string, schema: z.ZodType<T>, options?: RequestOptions): Promise<T> {
    return this.request('POST', path, schema, options);
  }

  put<T>(path: string, schema: z.ZodType<T>, options?: RequestOptions): Promise<T> {
    return this.request('PUT', path, schema, options);
  }

  patch<T>(path: string, schema: z.ZodType<T>, options?: RequestOptions): Promise<T> {
    return this.request('PATCH', path, schema, options);
  }

  delete<T>(path: string, schema: z.ZodType<T>, options?: RequestOptions): Promise<T> {
    return this.request('DELETE', path, schema, options);
  }

  /** Makes sure the CSRF cookie exists before the first state-changing call (e.g. sign-in). */
  async ensureCsrf(): Promise<void> {
    if (this.csrfToken() === undefined) {
      await this.send('GET', '/auth/csrf');
    }
  }

  private async request<T>(
    method: Method,
    path: string,
    schema: z.ZodType<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    let response = await this.send(method, path, options);
    if (response.status === 401 && !NO_REFRESH_PATHS.includes(path)) {
      if (await this.refreshOnce()) {
        response = await this.send(method, path, options);
      }
      if (response.status === 401) {
        this.onSessionExpired();
      }
    }
    return this.parse(response, schema);
  }

  private async send(
    method: Method,
    path: string,
    options: RequestOptions = {},
  ): Promise<Response> {
    const headers = new Headers({
      Accept: 'application/json',
      'X-Request-Id': crypto.randomUUID(),
    });
    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    const csrf = this.csrfToken();
    if (UNSAFE.has(method) && csrf !== undefined) {
      headers.set(CSRF_HEADER, csrf);
    }
    if (options.idempotencyKey !== undefined) {
      headers.set('Idempotency-Key', options.idempotencyKey);
    }
    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        credentials: 'include',
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        ...(options.signal ? { signal: options.signal } : {}),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      throw new ApiError(0, 'NETWORK_ERROR', 'The server could not be reached', null);
    }
  }

  /** One refresh at a time; concurrent 401s wait for the same attempt. */
  private refreshOnce(): Promise<boolean> {
    this.refreshing ??= this.send('POST', '/auth/refresh')
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  private async parse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
    const body: unknown =
      response.status === 204 ? undefined : await response.json().catch(() => undefined);
    if (!response.ok) {
      const envelope = errorEnvelopeSchema.safeParse(body);
      if (envelope.success) {
        const { code, message, traceId, details } = envelope.data.error;
        throw new ApiError(response.status, code, message, traceId, details);
      }
      throw new ApiError(
        response.status,
        'INTERNAL',
        `Request failed with status ${String(response.status)}`,
        response.headers.get('X-Request-Id'),
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        response.status,
        'CONTRACT_MISMATCH',
        'The server response did not match the expected contract',
        response.headers.get('X-Request-Id'),
        parsed.error.issues,
      );
    }
    return parsed.data;
  }

  private csrfToken(): string | undefined {
    const prefix = `${AUTH_COOKIES.csrf}=`;
    const cookie = this.readCookies()
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
  }
}
