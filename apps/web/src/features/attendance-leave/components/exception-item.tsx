import type { ConsolidationException } from '@huitong/shared';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { StatusBadge } from '@/components/common/status-badge';
import { useFormatters } from '@/hooks/use-formatters';

import { useConnectorName } from '../hooks/use-connector-name';

/** One thing a run flagged: what is wrong, where it came from, and who it is about. */
export function ExceptionItem({ exception }: { exception: ConsolidationException }) {
  const { t } = useTranslation('attendanceLeave');
  const connectorName = useConnectorName();
  const format = useFormatters();
  const { details } = exception;
  const code = details.sourceLabel
    ? `${details.sourceLabel} (${details.sourceCategory ?? ''})`
    : (details.sourceCategory ?? '');

  return (
    <li className="flex items-start gap-3 py-3">
      {exception.resolved ? (
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
      ) : (
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={exception.resolved ? 'success' : 'warning'}>
            {t(`exceptionType.${exception.type}`)}
          </StatusBadge>
          {exception.employeeNo && exception.employeeName ? (
            <Link
              to={`/employees?employee=${exception.employeeNo}`}
              className="rounded-sm text-sm font-medium text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {exception.employeeName} · {exception.employeeNo}
            </Link>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {t(`exception.${exception.type}`, {
            code,
            connector: connectorName(details.connectorId),
            days: details.daysInPeriod ?? 0,
            start: details.startDate ? format.date(details.startDate) : '—',
            end: details.endDate ? format.date(details.endDate) : '—',
          })}
        </p>
        {exception.resolution ? (
          <p className="text-xs text-muted-foreground">
            {t('run.resolved', { resolution: exception.resolution })}
          </p>
        ) : null}
      </div>
    </li>
  );
}
