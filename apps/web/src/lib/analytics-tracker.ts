import {
  clickstreamEventSchema,
  MAX_CLICKSTREAM_BATCH,
  type ClickstreamEvent,
  type Locale,
} from '@huitong/shared';

type EventType = ClickstreamEvent['type'];
type Properties = NonNullable<ClickstreamEvent['properties']>;

export interface AnalyticsTrackerOptions {
  endpoint?: string;
  flushIntervalMs?: number;
  /** Events queued before an early flush. */
  maxQueue?: number;
  /** True only while the user has opted in. */
  hasConsent: () => boolean;
  /** Context added to every event. */
  context?: () => { locale?: Locale; theme?: 'light' | 'dark' };
  /** Network senders; injectable for tests. */
  send?: (endpoint: string, body: string) => Promise<void>;
  beacon?: (endpoint: string, body: string) => boolean;
  now?: () => Date;
  newSessionId?: () => string;
}

/** Values that look like personal data are dropped even if a caller passes them by mistake. */
const PERSONAL_DATA = [
  /[^\s@]+@[^\s@]+\.[^\s@]+/, // email address
  /\+?\d[\d\s-]{7,}\d/, // phone or long number
  /\bE\d{6}\b/, // employee number
];

function looksPersonal(value: string): boolean {
  return PERSONAL_DATA.some((pattern) => pattern.test(value));
}

function viewport(): ClickstreamEvent['viewport'] {
  const width = window.innerWidth;
  return width < 768 ? 'mobile' : width < 1280 ? 'tablet' : 'desktop';
}

/**
 * First-party clickstream tracker. It batches events and sends route
 * patterns, never URLs, input values or personal data. Nothing is collected
 * without consent, or when the browser sends Global Privacy Control.
 * Queued events are flushed on an interval and with `sendBeacon` when the page is hidden.
 */
export class AnalyticsTracker {
  private queue: ClickstreamEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly sessionId: string;
  private readonly endpoint: string;
  private readonly maxQueue: number;
  private readonly send: (endpoint: string, body: string) => Promise<void>;
  private readonly beacon: (endpoint: string, body: string) => boolean;
  private readonly now: () => Date;
  private readonly onHidden = () => {
    if (document.visibilityState === 'hidden') {
      this.flush(true);
    }
  };

  constructor(private readonly options: AnalyticsTrackerOptions) {
    this.endpoint = options.endpoint ?? '/api/v1/analytics/events';
    this.maxQueue = options.maxQueue ?? 20;
    this.now = options.now ?? (() => new Date());
    this.sessionId = (options.newSessionId ?? (() => crypto.randomUUID()))();
    this.send =
      options.send ??
      (async (endpoint, body) => {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        });
      });
    this.beacon =
      options.beacon ??
      ((endpoint, body) =>
        navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' })));
  }

  start(): void {
    if (this.timer !== null) {
      return;
    }
    this.timer = setInterval(() => {
      this.flush();
    }, this.options.flushIntervalMs ?? 5000);
    document.addEventListener('visibilitychange', this.onHidden);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    document.removeEventListener('visibilitychange', this.onHidden);
    this.flush(true);
  }

  pageView(route: string): void {
    this.track('page_view', 'page.view', route);
  }

  click(name: string, route: string, properties?: Properties): void {
    this.track('click', name, route, properties);
  }

  featureUse(name: string, route: string, properties?: Properties): void {
    this.track('feature_use', name, route, properties);
  }

  error(name: string, route: string, properties?: Properties): void {
    this.track('error', name, route, properties);
  }

  /** Whether the tracker may collect anything right now. */
  isEnabled(): boolean {
    const gpc =
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
    return !gpc && this.options.hasConsent();
  }

  /** Sends queued events now; `useBeacon` when the page may be unloading. */
  flush(useBeacon = false): void {
    if (!this.isEnabled()) {
      this.queue = [];
      return;
    }
    while (this.queue.length > 0) {
      const body = JSON.stringify({ events: this.queue.splice(0, MAX_CLICKSTREAM_BATCH) });
      if (useBeacon && this.beacon(this.endpoint, body)) {
        continue;
      }
      // Analytics must never break the app: delivery failures are dropped.
      this.send(this.endpoint, body).catch(() => undefined);
    }
  }

  private track(type: EventType, name: string, route: string, properties?: Properties): void {
    if (!this.isEnabled()) {
      return;
    }
    const safeProperties = properties
      ? Object.fromEntries(
          Object.entries(properties).filter(
            ([, value]) => typeof value !== 'string' || !looksPersonal(value),
          ),
        )
      : undefined;
    const candidate = {
      type,
      name,
      route,
      occurredAt: this.now().toISOString(),
      sessionId: this.sessionId,
      viewport: viewport(),
      ...this.options.context?.(),
      ...(safeProperties && Object.keys(safeProperties).length > 0
        ? { properties: safeProperties }
        : {}),
    };
    const parsed = clickstreamEventSchema.safeParse(candidate);
    if (!parsed.success) {
      return;
    }
    this.queue.push(parsed.data);
    if (this.queue.length >= this.maxQueue) {
      this.flush();
    }
  }
}
