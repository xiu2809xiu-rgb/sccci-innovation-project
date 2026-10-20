import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useFormatters } from '@/hooks/use-formatters';

import type { DataTablePage } from './data-table-types';

/** Previous/next paging with the visible range ("26–50 of 120"). Server-side pages only. */
export function DataTablePagination({ page, pageSize, total, onPageChange }: DataTablePage) {
  const { t } = useTranslation();
  const format = useFormatters();
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav
      aria-label={t('pagination.label')}
      className="flex items-center justify-between gap-4 border-t border-border px-4 py-3"
    >
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {t('pagination.range', {
          from: format.integer(from),
          to: format.integer(to),
          total: format.integer(total),
        })}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={t('pagination.previous')}
          disabled={page <= 1}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={t('pagination.next')}
          disabled={page >= lastPage}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
