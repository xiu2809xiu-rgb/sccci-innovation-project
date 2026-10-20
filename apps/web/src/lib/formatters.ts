import type { Locale } from '@huitong/shared';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
];

/**
 * Locale-aware formatting for numbers, dates and relative times. Date-only
 * values (hire dates, leave days) are formatted in UTC so they never shift a
 * day between Singapore and Shanghai browsers.
 */
export class Formatters {
  private readonly integerFormat: Intl.NumberFormat;
  private readonly relativeFormat: Intl.RelativeTimeFormat;

  constructor(readonly locale: Locale) {
    this.integerFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    this.relativeFormat = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  }

  integer(value: number): string {
    return this.integerFormat.format(value);
  }

  number(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale, options).format(value);
  }

  /** An amount in its own currency, e.g. SGD 6,700.00 or CN¥6,700.00. */
  money(amount: number, currency: string): string {
    return new Intl.NumberFormat(this.locale, { style: 'currency', currency }).format(amount);
  }

  /** A duration in seconds with one decimal: 0.6 s or 0.6秒. */
  seconds(value: number): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'narrow',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  }

  /** A short elapsed time: whole milliseconds under ten seconds, then seconds. */
  elapsed(milliseconds: number): string {
    const whole = Math.round(milliseconds);
    return whole < 10_000
      ? new Intl.NumberFormat(this.locale, {
          style: 'unit',
          unit: 'millisecond',
          unitDisplay: 'narrow',
        }).format(whole)
      : this.seconds(milliseconds / 1000);
  }

  /** `ratio` between 0 and 1. */
  percent(ratio: number, maximumFractionDigits = 1): string {
    return new Intl.NumberFormat(this.locale, { style: 'percent', maximumFractionDigits }).format(
      ratio,
    );
  }

  date(value: string | Date): string {
    const dateOnly = typeof value === 'string' && DATE_ONLY.test(value);
    return new Intl.DateTimeFormat(this.locale, {
      dateStyle: 'medium',
      ...(dateOnly ? { timeZone: 'UTC' } : {}),
    }).format(new Date(value));
  }

  dateTime(value: string | Date): string {
    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    );
  }

  /** "3 minutes ago" / "3 分钟前". */
  relativeTime(value: string | Date, now: Date = new Date()): string {
    let amount = (new Date(value).getTime() - now.getTime()) / 1000;
    for (const [unit, size] of RELATIVE_STEPS) {
      if (Math.abs(amount) < size) {
        return this.relativeFormat.format(Math.round(amount), unit);
      }
      amount /= size;
    }
    return this.relativeFormat.format(Math.round(amount), 'year');
  }
}
