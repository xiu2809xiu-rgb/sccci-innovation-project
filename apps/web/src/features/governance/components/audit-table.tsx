import type { AuditEventView, ListEnvelope } from '@huitong/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { CopyButton } from '@/components/common/copy-button';
import { DataTable } from '@/components/common/data-table/data-table';
import type { DataTableColumn } from '@/components/common/data-table/data-table-types';
import { EmptyState } from '@/components/common/empty-state';
import { MaskedValue } from '@/components/common/masked-value';
import { RelativeTime } from '@/components/common/relative-time';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFormatters } from '@/hooks/use-formatters';

import { isAuditEntityType } from '../audit-filter-params';
import { useFieldLabel } from '../hooks/use-field-label';

const SHOWN_FIELDS = 3;

/** An employee's number is internal data; the event names it only where the register allows. */
const WITHHELD_EMPLOYEE = {
  masked: true,
  classification: 'INTERNAL',
  reason: 'CROSS_BORDER_NOT_APPROVED',
} as const;

export interface AuditTableProps {
  query: UseQueryResult<ListEnvelope<AuditEventView>>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPerson: (actorUserId: string) => void;
  /** Shown in the empty state, e.g. a way to clear the filters. */
  emptyAction?: ReactNode;
}

/** The log, newest first: when, who, what, to which record, and the names of the fields it changed. */
export function AuditTable({
  query,
  page,
  pageSize,
  onPageChange,
  onPerson,
  emptyAction,
}: AuditTableProps) {
  const { t } = useTranslation('governance');
  const { t: tCommon } = useTranslation();
  const fieldLabel = useFieldLabel();
  const format = useFormatters();

  const record = (event: AuditEventView) => {
    const type = isAuditEntityType(event.entityType)
      ? t(`audit.entityType.${event.entityType}`)
      : event.entityType;
    let id: ReactNode = null;
    if (event.entityIdWithheld) id = <MaskedValue value={WITHHELD_EMPLOYEE} />;
    else if (event.entityType === 'Employee' && event.entityId) {
      id = (
        <Link
          to={`/employees?employee=${encodeURIComponent(event.entityId)}`}
          className="font-mono text-xs text-primary underline-offset-4 hover:underline"
        >
          {event.entityId}
        </Link>
      );
    } else if (event.entityId) {
      id = <code className="font-mono text-xs text-muted-foreground">{event.entityId}</code>;
    }
    return (
      <span className="flex flex-col items-start">
        <span className="text-foreground">{type}</span>
        {id}
      </span>
    );
  };

  const fields = (event: AuditEventView) => {
    if (event.changedFields.length === 0) {
      return <span className="text-muted-foreground">{t('audit.noFields')}</span>;
    }
    const labels = event.changedFields.map(fieldLabel);
    const rest = labels.slice(SHOWN_FIELDS);
    return (
      <span className="flex flex-wrap items-center gap-1">
        {labels.slice(0, SHOWN_FIELDS).map((label) => (
          <span key={label} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground">
            {label}
          </span>
        ))}
        {rest.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="rounded-md px-1 text-xs text-muted-foreground">
                {t('audit.moreFields', { count: rest.length })}
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{format.list(rest)}</TooltipContent>
          </Tooltip>
        ) : null}
      </span>
    );
  };

  const columns: DataTableColumn<AuditEventView>[] = [
    {
      id: 'when',
      header: t('audit.table.when'),
      cell: (event) => <RelativeTime value={event.occurredAt} className="whitespace-nowrap" />,
    },
    {
      id: 'who',
      header: t('audit.table.who'),
      cell: (event) => (
        <span className="flex flex-col items-start">
          {event.actorUserId && event.actorName ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0"
              aria-label={t('audit.byPerson', { name: event.actorName })}
              onClick={() => {
                if (event.actorUserId) onPerson(event.actorUserId);
              }}
            >
              {event.actorName}
            </Button>
          ) : (
            <span className="text-muted-foreground">{t('audit.system')}</span>
          )}
          {event.actorRole ? (
            <span className="text-xs text-muted-foreground">
              {tCommon(`roles.${event.actorRole}`)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'action',
      header: t('audit.table.action'),
      cell: (event) => <code className="font-mono text-xs text-foreground">{event.action}</code>,
    },
    { id: 'record', header: t('audit.table.record'), cell: record },
    {
      id: 'changed',
      header: t('audit.table.changed'),
      className: 'min-w-48 whitespace-normal',
      cell: fields,
    },
    {
      id: 'trace',
      header: t('audit.table.trace'),
      cell: (event) =>
        event.traceId ? (
          <span className="inline-flex items-center gap-1">
            <code className="font-mono text-xs text-muted-foreground">
              {event.traceId.slice(0, 8)}
            </code>
            <CopyButton
              value={event.traceId}
              label={t('audit.copyTrace', { traceId: event.traceId })}
            />
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <DataTable
      caption={t('audit.table.caption')}
      columns={columns}
      rows={query.data?.data}
      getRowId={(event) => event.id}
      status={query.status}
      error={query.error}
      onRetry={() => void query.refetch()}
      empty={
        <EmptyState
          icon={ScrollText}
          title={t('audit.empty.title')}
          description={t('audit.empty.description')}
          action={emptyAction}
        />
      }
      pagination={
        query.data ? { page, pageSize, total: query.data.meta.total, onPageChange } : undefined
      }
    />
  );
}
