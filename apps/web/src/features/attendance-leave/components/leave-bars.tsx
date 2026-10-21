import type { EntityMonth } from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { useFormatters } from '@/hooks/use-formatters';

/**
 * Leave days by category as horizontal bars: one series, so one colour and no
 * legend. It is a real table, so the values are its table view; the bars are
 * decoration beside each labelled value. `max` is shared across entities so
 * their bars compare on one scale.
 */
export function LeaveBars({
  month,
  max,
  caption,
}: {
  month: EntityMonth;
  max: number;
  caption: string;
}) {
  const { t } = useTranslation('reports');
  const { t: tLeave } = useTranslation('attendanceLeave');
  const format = useFormatters();

  if (month.leaveDays.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('noLeave')}</p>;
  }
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{t('category')}</th>
          <th scope="col">{t('days')}</th>
        </tr>
      </thead>
      <tbody>
        {month.leaveDays.map((item) => (
          <tr key={item.category} className="group">
            <th
              scope="row"
              className="w-2/5 py-1.5 pr-3 text-left font-normal text-muted-foreground"
            >
              {tLeave(`category.${item.category}`)}
            </th>
            <td className="py-1.5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-3 rounded-e-sm bg-chart-1 transition-opacity group-hover:opacity-80"
                  style={{ width: `${String(Math.max((item.days / max) * 100, 1))}%` }}
                />
                <span className="text-foreground tabular-nums">
                  {format.number(item.days, { maximumFractionDigits: 1 })}
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
