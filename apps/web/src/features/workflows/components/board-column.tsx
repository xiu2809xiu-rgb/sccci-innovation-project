import type { WorkflowBoardColumn } from '@huitong/shared';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocalizedTitle } from '../hooks/use-localized-title';
import { InstanceCard } from './instance-card';

/** One step of the pipeline: its owner, how many requests wait there, and their cards. */
export function BoardColumn({ column }: { column: WorkflowBoardColumn }) {
  const { t } = useTranslation('workflows');
  const { t: tCommon } = useTranslation();
  const localized = useLocalizedTitle();
  const headingId = useId();
  const hidden = column.total - column.instances.length;

  return (
    <section
      aria-labelledby={headingId}
      className="flex w-72 shrink-0 flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3"
    >
      <header className="space-y-0.5 px-1">
        <h2 id={headingId} className="text-sm font-semibold text-foreground">
          {localized(column.step)}
        </h2>
        <p className="text-xs text-muted-foreground">
          {tCommon(`roles.${column.step.assigneeRole}`)} ·{' '}
          <span className="tabular-nums">{t('board.count', { count: column.total })}</span>
        </p>
      </header>
      {column.instances.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-subtle-foreground">
          {t('board.columnEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {column.instances.map((instance) => (
            <li key={instance.id}>
              <InstanceCard instance={instance} />
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 ? (
        <p className="px-1 text-xs text-muted-foreground">{t('board.more', { count: hidden })}</p>
      ) : null}
    </section>
  );
}
