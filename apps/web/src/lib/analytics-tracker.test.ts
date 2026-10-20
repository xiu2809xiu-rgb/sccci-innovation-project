import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsTracker } from './analytics-tracker';

const NOW = new Date('2026-10-20T04:00:00.000Z');

function tracker(options: { consent?: boolean; maxQueue?: number } = {}) {
  const sent: string[] = [];
  const beacons: string[] = [];
  const instance = new AnalyticsTracker({
    hasConsent: () => options.consent ?? true,
    maxQueue: options.maxQueue ?? 20,
    send: (_endpoint, body) => {
      sent.push(body);
      return Promise.resolve();
    },
    beacon: (_endpoint, body) => {
      beacons.push(body);
      return true;
    },
    now: () => NOW,
    newSessionId: () => '0b8e4a43-9c1f-4f6a-8d0b-5d4b1c2a3e7f',
    context: () => ({ locale: 'en', theme: 'dark' }),
  });
  const events = () =>
    sent.flatMap((body) => (JSON.parse(body) as { events: Record<string, unknown>[] }).events);
  return { instance, sent, beacons, events };
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'globalPrivacyControl');
});

describe('AnalyticsTracker', () => {
  it('batches route-pattern events with context and sends them on flush', () => {
    const { instance, events } = tracker();
    instance.pageView('/employees/:employeeNo');
    instance.click('employees.sync.start', '/employees', { connector: 'sg-hr' });
    instance.flush();
    expect(events()).toEqual([
      expect.objectContaining({
        type: 'page_view',
        name: 'page.view',
        route: '/employees/:employeeNo',
        locale: 'en',
        theme: 'dark',
        occurredAt: NOW.toISOString(),
      }),
      expect.objectContaining({
        type: 'click',
        name: 'employees.sync.start',
        properties: { connector: 'sg-hr' },
      }),
    ]);
  });

  it('collects nothing without consent', () => {
    const { instance, sent } = tracker({ consent: false });
    instance.pageView('/overview');
    instance.flush();
    expect(sent).toHaveLength(0);
  });

  it('honours Global Privacy Control', () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    const { instance, sent } = tracker();
    expect(instance.isEnabled()).toBe(false);
    instance.pageView('/overview');
    instance.flush();
    expect(sent).toHaveLength(0);
  });

  it('drops property values that look like personal data', () => {
    const { instance, events } = tracker();
    instance.featureUse('employees.search', '/employees', {
      email: 'meiling.tan@orge.example',
      phone: '+65 9123 4567',
      employee: 'E100023',
      resultCount: 12,
      filter: 'department',
    });
    instance.flush();
    expect(events()[0]?.properties).toEqual({ resultCount: 12, filter: 'department' });
  });

  it('refuses event names that are not dotted identifiers', () => {
    const { instance, sent } = tracker();
    instance.click('Mei Ling opened a record', '/employees');
    instance.flush();
    expect(sent).toHaveLength(0);
  });

  it('flushes early when the queue is full and uses sendBeacon when the page hides', () => {
    const { instance, sent, beacons } = tracker({ maxQueue: 2 });
    instance.pageView('/a');
    instance.pageView('/b');
    expect(sent).toHaveLength(1);
    instance.pageView('/c');
    instance.flush(true);
    expect(beacons).toHaveLength(1);
  });

  it('flushes with a beacon when stopped', () => {
    vi.useFakeTimers();
    const { instance, beacons } = tracker();
    instance.start();
    instance.pageView('/overview');
    instance.stop();
    expect(beacons).toHaveLength(1);
    vi.useRealTimers();
  });
});
