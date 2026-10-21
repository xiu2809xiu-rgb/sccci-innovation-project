import type { WorkflowBoard } from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/common/section-card';

import { BoardColumn } from './board-column';
import { InstanceCard } from './instance-card';

/**
 * The pipeline, one column per step. The row scrolls sideways at narrow
 * widths; every card holds a link, so tabbing through them scrolls each
 * column into view.
 */
export function BoardView({ board }: { board: WorkflowBoard }) {
  const { t } = useTranslation('workflows');
  return (
    <div className="space-y-6">
      <div role="region" aria-label={t('board.label')} className="overflow-x-auto pb-2">
        <div className="flex w-max gap-3">
          {board.columns.map((column) => (
            <BoardColumn key={column.step.key} column={column} />
          ))}
        </div>
      </div>
      <SectionCard title={t('board.recentlyCompleted')}>
        {board.recentlyCompleted.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('board.noneCompleted')}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {board.recentlyCompleted.map((instance) => (
              <li key={instance.id}>
                <InstanceCard instance={instance} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
