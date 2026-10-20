import { describe, expect, it } from 'vitest';

import { Formatters } from './formatters';

const en = new Formatters('en');
const zh = new Formatters('zh-CN');

describe('Formatters', () => {
  it('shows short durations in milliseconds and longer ones in seconds', () => {
    expect(en.elapsed(38.4)).toBe('38ms');
    expect(en.elapsed(12_340)).toBe('12.3s');
    expect(zh.elapsed(12_340)).toBe('12.3秒');
  });

  it('switches to seconds when the milliseconds would round up to ten seconds', () => {
    expect(en.elapsed(9_999.6)).toBe('10.0s');
  });

  it('formats money in its own currency', () => {
    expect(en.money(6700, 'SGD')).toMatch(/^SGD\s6,700\.00$/);
    expect(en.money(6700, 'CNY')).toBe('CN¥6,700.00');
    expect(zh.money(6700, 'CNY')).toBe('¥6,700.00');
  });

  it('keeps a date-only value on its calendar day in any time zone', () => {
    expect(en.date('2026-01-05')).toBe('Jan 5, 2026');
    expect(zh.date('2026-01-05')).toBe('2026年1月5日');
  });

  it('says how long ago something happened', () => {
    const now = new Date('2026-10-20T08:00:00.000Z');
    expect(en.relativeTime('2026-10-20T07:57:00.000Z', now)).toBe('3 minutes ago');
    expect(zh.relativeTime('2026-10-20T07:57:00.000Z', now)).toBe('3分钟前');
    expect(en.relativeTime('2026-10-18T08:00:00.000Z', now)).toBe('2 days ago');
  });
});
