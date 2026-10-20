import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { ErrorState } from '../error-state';
import { DataTablePagination } from './data-table-pagination';
import type { DataTableColumn, DataTablePage, SortState } from './data-table-types';

export interface DataTableProps<Row> {
  /** Accessible name of the table (visually hidden caption). */
  caption: string;
  columns: DataTableColumn<Row>[];
  rows: Row[] | undefined;
  getRowId: (row: Row) => string;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry?: () => void;
  /** Rendered across the table when there are no rows; should offer a next step. */
  empty: ReactNode;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  pagination?: DataTablePage;
  skeletonRows?: number;
}

/**
 * The one table for server-paginated lists: sortable headers with `aria-sort`,
 * skeleton rows while loading, and the shared error and empty states. Rows
 * never animate while the user works in them (CLAUDE.md section 8, motion).
 */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowId,
  status,
  error,
  onRetry,
  empty,
  sort,
  onSortChange,
  pagination,
  skeletonRows = 8,
}: DataTableProps<Row>) {
  const { t } = useTranslation();

  const toggleSort = (columnId: string) => {
    const direction = sort?.columnId === columnId && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange?.({ columnId, direction });
  };

  if (status === 'error') {
    return <ErrorState error={error} {...(onRetry ? { onRetry } : {})} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table aria-busy={status === 'pending'}>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow>
            {columns.map((column) => {
              const active = sort?.columnId === column.id ? sort.direction : undefined;
              return (
                <TableHead
                  key={column.id}
                  scope="col"
                  aria-sort={
                    active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : undefined
                  }
                  className={cn(column.align === 'end' && 'text-right', column.className)}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md hover:text-foreground"
                      onClick={() => {
                        toggleSort(column.id);
                      }}
                    >
                      {column.header}
                      {active === 'asc' ? (
                        <ArrowUp className="size-3.5" aria-label={t('table.sortedAscending')} />
                      ) : active === 'desc' ? (
                        <ArrowDown className="size-3.5" aria-label={t('table.sortedDescending')} />
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-50" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {status === 'pending'
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <TableRow key={`skeleton-${String(index)}`}>
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
          {status === 'success' && rows?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-6">
                {empty}
              </TableCell>
            </TableRow>
          ) : null}
          {status === 'success'
            ? rows?.map((row) => (
                <TableRow key={getRowId(row)}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        column.align === 'end' && 'text-right tabular-nums',
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
        </TableBody>
      </Table>
      {pagination && status === 'success' ? <DataTablePagination {...pagination} /> : null}
    </div>
  );
}
