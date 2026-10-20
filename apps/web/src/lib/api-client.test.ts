import { dataEnvelopeSchema } from '@huitong/shared';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiClient } from './api-client';
import { ApiError } from './api-error';

const greeting = dataEnvelopeSchema(z.object({ message: z.string() }));

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function client(responses: Response[], cookies = 'ht_csrf=abc123') {
  const fetchImpl = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => {
    const next = responses.shift();
    return next ? Promise.resolve(next) : Promise.reject(new TypeError('no more responses'));
  });
  const onSessionExpired = vi.fn();
  const api = new ApiClient({
    fetchImpl: fetchImpl as unknown as typeof fetch,
    readCookies: () => cookies,
    onSessionExpired,
  });
  return { api, fetchImpl, onSessionExpired };
}

function headersOf(call: unknown[]): Headers {
  return (call[1] as RequestInit).headers as Headers;
}

describe('ApiClient', () => {
  it('validates successful responses against their contract', async () => {
    const { api, fetchImpl } = client([json(200, { data: { message: 'hello' } })]);
    await expect(api.get('/greeting', greeting)).resolves.toEqual({ data: { message: 'hello' } });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('/api/v1/greeting');
    expect(headersOf(fetchImpl.mock.calls[0] ?? []).get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sends the CSRF token on state-changing requests only', async () => {
    const { api, fetchImpl } = client([
      json(200, { data: { message: 'a' } }),
      json(200, { data: { message: 'b' } }),
    ]);
    await api.get('/greeting', greeting);
    await api.post('/greeting', greeting, { body: { name: 'x' }, idempotencyKey: 'key-1' });
    expect(headersOf(fetchImpl.mock.calls[0] ?? []).get('X-CSRF-Token')).toBeNull();
    const postHeaders = headersOf(fetchImpl.mock.calls[1] ?? []);
    expect(postHeaders.get('X-CSRF-Token')).toBe('abc123');
    expect(postHeaders.get('Idempotency-Key')).toBe('key-1');
    expect((fetchImpl.mock.calls[1]?.[1] as RequestInit).body).toBe('{"name":"x"}');
  });

  it('turns the error envelope into an ApiError with code and trace id', async () => {
    const { api } = client([
      json(403, { error: { code: 'FORBIDDEN', message: 'No', traceId: 'trace-9' } }),
    ]);
    const error = (await api.get('/secret', greeting).catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: 'FORBIDDEN', traceId: 'trace-9' });
  });

  it('reports responses that break the contract', async () => {
    const { api } = client([json(200, { data: { wrong: true } }, { 'X-Request-Id': 'trace-1' })]);
    await expect(api.get('/greeting', greeting)).rejects.toMatchObject({
      code: 'CONTRACT_MISMATCH',
      traceId: 'trace-1',
    });
  });

  it('refreshes an expired session once, shared by concurrent requests, then retries', async () => {
    const expired = () =>
      json(401, { error: { code: 'UNAUTHENTICATED', message: 'x', traceId: 't' } });
    const { api, fetchImpl } = client([
      expired(),
      expired(),
      json(200, { data: {} }),
      json(200, { data: { message: 'one' } }),
      json(200, { data: { message: 'two' } }),
    ]);
    const results = await Promise.all([api.get('/a', greeting), api.get('/b', greeting)]);
    expect(results.map((r) => r.data.message).sort()).toEqual(['one', 'two']);
    const refreshCalls = fetchImpl.mock.calls.filter((call) =>
      (call[0] as string).endsWith('/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('gives up and signals session expiry when the refresh fails', async () => {
    const { api, onSessionExpired } = client([
      json(401, { error: { code: 'UNAUTHENTICATED', message: 'x', traceId: 't' } }),
      json(401, { error: { code: 'SESSION_EXPIRED', message: 'x', traceId: 't' } }),
    ]);
    await expect(api.get('/a', greeting)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(onSessionExpired).toHaveBeenCalledOnce();
  });

  it('does not try to refresh in a browser that never started a session', async () => {
    const unauthenticated = json(401, {
      error: { code: 'UNAUTHENTICATED', message: 'no session', traceId: 't1' },
    });
    const { api, fetchImpl } = client([unauthenticated], '');
    await expect(api.get('/auth/me', greeting)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports network failures without a trace id', async () => {
    const { api } = client([]);
    await expect(api.get('/a', greeting)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      traceId: null,
    });
  });
});
