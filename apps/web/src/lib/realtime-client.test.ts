import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RealtimeClient } from './realtime-client';

/** The parts of EventSource the client uses, driven by the test. */
class FakeSource {
  static created: FakeSource[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((message: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeSource.created.push(this);
  }

  close(): void {
    this.closed = true;
  }

  emit(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }
}

function client(beforeReconnect = vi.fn(() => Promise.resolve())) {
  return new RealtimeClient({
    createSource: (url) => new FakeSource(url) as unknown as EventSource,
    beforeReconnect,
  });
}

const event = {
  id: 'e1',
  type: 'sync.progress',
  occurredAt: '2026-10-20T08:00:00.000Z',
  data: { progress: 40 },
};

describe('RealtimeClient', () => {
  beforeEach(() => {
    FakeSource.created = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens one shared connection for any number of subscribers', () => {
    const realtime = client();
    realtime.subscribe(vi.fn());
    realtime.subscribe(vi.fn());
    expect(FakeSource.created).toHaveLength(1);
    expect(FakeSource.created[0]?.url).toBe('/api/v1/events');
  });

  it('delivers valid events and drops anything that breaks the contract', () => {
    const realtime = client();
    const listener = vi.fn();
    realtime.subscribe(listener);
    const source = FakeSource.created[0];
    source?.emit(event);
    source?.emit({ type: 'Not A Dotted Type' });
    source?.onmessage?.({ data: 'not json' } as MessageEvent<string>);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);
  });

  it('closes the connection when the last subscriber leaves', () => {
    const realtime = client();
    const leave = realtime.subscribe(vi.fn());
    leave();
    expect(FakeSource.created[0]?.closed).toBe(true);
  });

  it('refreshes the session, then reconnects with growing delays after an error', async () => {
    const beforeReconnect = vi.fn(() => Promise.resolve());
    const realtime = client(beforeReconnect);
    const states: string[] = [];
    realtime.onStateChange((state) => states.push(state));
    realtime.subscribe(vi.fn());

    FakeSource.created[0]?.onerror?.();
    await vi.advanceTimersByTimeAsync(999);
    expect(FakeSource.created).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(beforeReconnect).toHaveBeenCalledTimes(1);
    expect(FakeSource.created).toHaveLength(2);

    FakeSource.created[1]?.onerror?.();
    await vi.advanceTimersByTimeAsync(1999);
    expect(FakeSource.created).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeSource.created).toHaveLength(3);
    expect(states).toContain('reconnecting');
  });

  it('does nothing where EventSource is unavailable', () => {
    const realtime = new RealtimeClient({ createSource: null });
    expect(() => realtime.subscribe(vi.fn())).not.toThrow();
  });
});
