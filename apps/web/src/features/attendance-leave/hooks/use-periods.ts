import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useNow } from '@/hooks/use-now';

const MONTHS_OFFERED = 6;

/** `YYYY-MM` for the month `offset` months before the given date's, in UTC. */
function monthBefore(date: Date, offset: number): string {
  const month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - offset, 1));
  return `${String(month.getUTCFullYear())}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * The months a person can report on: the last six complete months, newest
 * first (the current month is never complete), and each month's name in the
 * reader's language.
 */
export function usePeriods() {
  const { i18n } = useTranslation();
  const now = useNow();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const periods = useMemo(() => {
    const today = new Date(Date.UTC(year, month, 1));
    return Array.from({ length: MONTHS_OFFERED }, (_, index) => monthBefore(today, index + 1));
  }, [year, month]);
  const label = useCallback(
    (period: string) => {
      const [y, m] = period.split('-').map(Number);
      return new Intl.DateTimeFormat(i18n.language, {
        year: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, 1)));
    },
    [i18n.language],
  );
  return { periods, latest: periods[0] ?? monthBefore(now, 1), label };
}
