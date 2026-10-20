// Sprint calendar: one-week sprints, sprint n = module week n, from Monday 19 Oct 2026.

const FIRST_MONDAY = Date.UTC(2026, 9, 19);
const DAY = 86_400_000;
const FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Start (Monday) and end (Sunday) of sprint `number`, and its milestone due time (Sunday 23:59 SGT). */
export function sprintDates(number) {
  const start = new Date(FIRST_MONDAY + (number - 1) * 7 * DAY);
  const end = new Date(start.getTime() + 6 * DAY);
  // 23:59:59 in Singapore (UTC+8) on the Sunday.
  const due = new Date(end.getTime() + (15 * 60 + 59) * 60_000 + 59_000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    due: due.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    label: `${FORMAT.format(start)} – ${FORMAT.format(end)}`,
  };
}

/** The milestone title of sprint `number`, sortable by name. */
export function sprintTitle(number) {
  return `Sprint ${String(number).padStart(2, '0')} (W${String(number)})`;
}
