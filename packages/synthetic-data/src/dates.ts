/** Date-only helpers on ISO `YYYY-MM-DD` strings, computed in UTC so time zones never shift a day. */

const DAY_MS = 86_400_000;

function toUtc(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

/** Formats a UTC timestamp as `YYYY-MM-DD`. */
export function isoDateFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Adds whole days to an ISO date. */
export function addDays(iso: string, days: number): string {
  return isoDateFromMs(toUtc(iso) + days * DAY_MS);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** Every date from `from` to `to`, inclusive. */
export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

/** True for Saturday and Sunday. */
export function isWeekend(iso: string): boolean {
  const weekday = new Date(toUtc(iso)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/** Formats minutes after midnight as `HH:mm`. */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
