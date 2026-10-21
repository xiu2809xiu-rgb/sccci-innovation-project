import type { WorkflowBoard } from '@huitong/shared';
import { ListChecks, Workflow } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/empty-state';
import { MockBadge } from '@/components/common/mock-badge';
import { PageHeader } from '@/components/common/page-header';
import { QueryView } from '@/components/common/query-view';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHasPermission } from '@/app/session/use-session';

import { useWorkflowBoard } from '../api/workflow-queries';
import { BoardView } from '../components/board-view';
import { TimelineView } from '../components/timeline-view';
import { WorkflowSearch } from '../components/workflow-search';

type View = 'board' | 'timeline';

function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-80 w-72 shrink-0" />
      ))}
    </div>
  );
}

function openInstances(board: WorkflowBoard) {
  return board.columns.flatMap((column) => column.instances);
}

/** Every approved manpower request by step (the board) or by date (the timeline). */
export function WorkflowBoardPage() {
  const { t } = useTranslation('workflows');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? undefined;
  const view: View = params.get('view') === 'timeline' ? 'timeline' : 'board';
  const board = useWorkflowBoard(q);
  const canSeeTasks = useHasPermission('workflows:tasks');

  const update = useCallback(
    (key: 'q' | 'view', value: string | null) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value === null) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const onSearch = useCallback(
    (value: string | null) => {
      update('q', value);
    },
    [update],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        meta={
          <>
            <SyntheticDataBadge />
            {board.data?.meta?.mock ? <MockBadge kind="data" /> : null}
          </>
        }
        actions={
          canSeeTasks ? (
            <Button asChild variant="outline">
              <Link to="/workflows/tasks">
                <ListChecks aria-hidden="true" data-icon="inline-start" />
                {t('actions.myTasks')}
              </Link>
            </Button>
          ) : null
        }
      />
      <Tabs
        value={view}
        onValueChange={(next) => {
          update('view', next === 'timeline' ? 'timeline' : null);
        }}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <WorkflowSearch value={q} onChange={onSearch} />
          <TabsList aria-label={t('views.label')}>
            <TabsTrigger value="board">{t('views.board')}</TabsTrigger>
            <TabsTrigger value="timeline">{t('views.timeline')}</TabsTrigger>
          </TabsList>
        </div>
        <FadeContent trigger="mount">
          <QueryView
            query={board}
            skeleton={<BoardSkeleton />}
            isEmpty={({ data }) => openInstances(data).length + data.recentlyCompleted.length === 0}
            empty={
              <EmptyState
                icon={Workflow}
                title={q ? t('empty.noResults') : t('empty.title')}
                description={q ? undefined : t('empty.description')}
                action={
                  q ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onSearch(null);
                      }}
                    >
                      {t('empty.clearSearch')}
                    </Button>
                  ) : undefined
                }
              />
            }
          >
            {({ data }) => (
              <>
                <TabsContent value="board">
                  <BoardView board={data} />
                </TabsContent>
                <TabsContent value="timeline">
                  <TimelineView instances={openInstances(data)} />
                </TabsContent>
              </>
            )}
          </QueryView>
        </FadeContent>
      </Tabs>
    </div>
  );
}
