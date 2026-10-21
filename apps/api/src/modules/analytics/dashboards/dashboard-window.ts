const DAY_MS = 24 * 60 * 60 * 1000;

/** The days a dashboard covers: whole UTC days, the last of them today. */
export interface DashboardWindow {
  days: number;
  /** The start of the first day. */
  from: Date;
  /** Now: today is counted so far. */
  to: Date;
}

export function dashboardWindow(days: number, now: Date): DashboardWindow {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { days, from: new Date(today - (days - 1) * DAY_MS), to: now };
}

/** Each day of the window as an ISO date, oldest first. */
export function windowDates({ days, from }: DashboardWindow): string[] {
  return Array.from({ length: days }, (_, index) =>
    new Date(from.getTime() + index * DAY_MS).toISOString().slice(0, 10),
  );
}
