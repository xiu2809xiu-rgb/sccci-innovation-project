import { realtimeEventSchema, type RealtimeEvent } from '@huitong/shared';

export type RealtimeListener = (event: RealtimeEvent) => void;
export type RealtimeState = 'idle' | 'connecting' | 'open' | 'reconnecting';

export interface RealtimeClientOptions {
  url?: string;
  /** Creates the EventSource; injectable for tests. Absent (no EventSource) means live updates are off. */
  createSource?: ((url: string) => EventSource) | null;
  /** Runs before each reconnect, e.g. to refresh an expired session cookie. */
  beforeReconnect?: () => Promise<unknown>;
}

const MAX_BACKOFF_MS = 30_000;

/**
 * One shared Server-Sent Events connection to `/api/v1/events`. It opens with
 * the first subscriber, closes with the last, validates every event against
 * the shared contract and reconnects with capped exponential backoff.
 */
export class RealtimeClient {
  private source: EventSource | null = null;
  private retries = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private state: RealtimeState = 'idle';
  private readonly listeners = new Set<RealtimeListener>();
  private readonly stateListeners = new Set<(state: RealtimeState) => void>();
  private readonly url: string;
  private readonly createSource: ((url: string) => EventSource) | null;
  private readonly beforeReconnect: () => Promise<unknown>;

  constructor(options: RealtimeClientOptions = {}) {
    this.url = options.url ?? '/api/v1/events';
    this.createSource =
      options.createSource !== undefined
        ? options.createSource
        : typeof EventSource === 'undefined'
          ? null
          : (url) => new EventSource(url, { withCredentials: true });
    this.beforeReconnect = options.beforeReconnect ?? (() => Promise.resolve());
  }

  /** Receives every event until the returned function is called. */
  subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    this.open();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.close();
      }
    };
  }

  /** The current connection state. */
  get currentState(): RealtimeState {
    return this.state;
  }

  /** Follows the connection state (for a "live updates" indicator). */
  onStateChange(listener: (state: RealtimeState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private setState(state: RealtimeState): void {
    this.state = state;
    for (const listener of this.stateListeners) listener(state);
  }

  private open(): void {
    if (this.source || !this.createSource || this.timer !== undefined) {
      return;
    }
    this.setState(this.retries === 0 ? 'connecting' : 'reconnecting');
    const source = this.createSource(this.url);
    this.source = source;
    source.onopen = () => {
      this.retries = 0;
      this.setState('open');
    };
    source.onmessage = (message: MessageEvent<string>) => {
      let payload: unknown;
      try {
        payload = JSON.parse(message.data);
      } catch {
        return;
      }
      const parsed = realtimeEventSchema.safeParse(payload);
      if (parsed.success) {
        for (const listener of this.listeners) listener(parsed.data);
      }
    };
    source.onerror = () => {
      source.close();
      this.source = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.listeners.size === 0) {
      this.setState('idle');
      return;
    }
    this.setState('reconnecting');
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.retries);
    this.retries += 1;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.beforeReconnect()
        .catch(() => undefined)
        .then(() => {
          if (this.listeners.size > 0) this.open();
        });
    }, delay);
  }

  private close(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.source?.close();
    this.source = null;
    this.retries = 0;
    this.setState('idle');
  }
}
