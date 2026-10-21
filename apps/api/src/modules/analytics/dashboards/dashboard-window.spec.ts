import { dashboardWindow, windowDates } from './dashboard-window.js';

describe('dashboardWindow', () => {
  const now = new Date('2026-10-21T13:45:00Z');

  it('covers whole UTC days, today included and counted so far', () => {
    const window = dashboardWindow(7, now);
    expect(window.from.toISOString()).toBe('2026-10-15T00:00:00.000Z');
    expect(window.to).toBe(now);
    expect(windowDates(window)).toEqual([
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
    ]);
  });

  it('crosses months and years', () => {
    const dates = windowDates(dashboardWindow(90, new Date('2026-01-02T00:30:00Z')));
    expect(dates).toHaveLength(90);
    expect(dates[0]).toBe('2025-10-05');
    expect(dates.at(-1)).toBe('2026-01-02');
  });
});
