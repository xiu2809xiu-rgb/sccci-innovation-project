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
