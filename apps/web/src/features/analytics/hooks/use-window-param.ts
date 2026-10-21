import { DASHBOARD_WINDOWS, type DashboardQuery } from '@huitong/shared';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

type Days = DashboardQuery['days'];

const isWindow = (value: string | null): value is Days =>
  (DASHBOARD_WINDOWS as readonly (string | null)[]).includes(value);

/** The dashboards' time window from `?days=`, 30 by default, shared by every analytics page. */
export function useWindowParam(): [Days, (days: Days) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('days');
  const days = isWindow(raw) ? raw : '30';
  const setDays = useCallback(
    (next: Days) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          updated.set('days', next);
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return [days, setDays];
}
