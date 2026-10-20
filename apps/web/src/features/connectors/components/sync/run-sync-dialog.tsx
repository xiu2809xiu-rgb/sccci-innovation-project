import type { ConnectorSummary, SyncRunDetail } from '@huitong/shared';
import { CheckCircle2, Eye, GitCompareArrows, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ErrorState } from '@/components/common/error-state';
import { SlideCommit } from '@/components/reactbits/slide-commit';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useConnectors } from '../../api/connector-queries';
import { isFinished, useStartSync, useSyncRun } from '../../api/sync-runs';
import { useSyncErrorText } from '../../hooks/use-sync-error-text';
import { ChooseSystem } from './choose-system';
import { SyncPreview } from './sync-preview';
import { SyncRunStatus } from './sync-run-status';

type Stage =
  | { kind: 'choose' }
  | { kind: 'preview'; connectorId: string; runId: string }
  | { kind: 'apply'; connectorId: string; runId: string };

/** Where the flow stands once a run settles, so the dialog never describes a step already past. */
type Outcome = Stage['kind'] | 'inSync' | 'applied' | 'partial' | 'previewFailed' | 'applyFailed';

const hasChanges = (run: SyncRunDetail) =>
  run.counts.created + run.counts.updated + run.counts.conflicts > 0;

function outcomeOf(stage: Stage, run: SyncRunDetail | undefined): Outcome {
  if (stage.kind === 'choose' || !run || !isFinished(run.status)) return stage.kind;
  if (run.status === 'FAILED') return stage.kind === 'preview' ? 'previewFailed' : 'applyFailed';
  if (stage.kind === 'apply') return run.status === 'PARTIAL' ? 'partial' : 'applied';
  return hasChanges(run) ? 'preview' : 'inSync';
}

/**
 * Run sync: preview first, then apply exactly what was previewed (CLAUDE.md
 * section 8, "show a preview before any sync writes data"). The server
 * refuses an apply that does not name a recent preview, whatever the UI does.
 */
export function RunSyncDialog({
  open,
  onOpenChange,
  connectorId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselects a system and skips the choice (from a connector's own page). */
  connectorId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SyncFlow
          {...(connectorId ? { connectorId } : {})}
          onClose={() => {
            onOpenChange(false);
          }}
        />
      ) : null}
    </Dialog>
  );
}

function SyncFlow({ connectorId, onClose }: { connectorId?: string; onClose: () => void }) {
  const { t, i18n } = useTranslation('connectors');
  const { t: tCommon } = useTranslation();
  const errorText = useSyncErrorText();
  const connectors = useConnectors();
  const start = useStartSync();
  const [chosen, setChosen] = useState(connectorId ?? '');
  const [stage, setStage] = useState<Stage>({ kind: 'choose' });
  const run = useSyncRun(stage.kind === 'choose' ? null : stage.runId).data;
  const syncable = (connectors.data ?? []).filter(
    (connector: ConnectorSummary) => connector.syncable,
  );
  const picked = syncable.find((connector) => connector.id === chosen);
  const name = picked ? (i18n.language === 'zh-CN' ? picked.nameZh : picked.name) : chosen;
  const outcome = outcomeOf(stage, run);
  const finished = run !== undefined && isFinished(run.status);
  const readyToApply = stage.kind === 'preview' && finished && outcome === 'preview';
  const failed = outcome === 'previewFailed' || outcome === 'applyFailed';

  const preview = (id: string) => {
    start.mutate(
      { connectorId: id, request: { mode: 'PREVIEW' } },
      {
        onSuccess: (created) => {
          setStage({ kind: 'preview', connectorId: id, runId: created.id });
        },
      },
    );
  };

  const apply = async () => {
    if (stage.kind !== 'preview') return;
    const created = await start.mutateAsync({
      connectorId: stage.connectorId,
      request: { mode: 'APPLY', previewRunId: stage.runId },
    });
    setStage({ kind: 'apply', connectorId: stage.connectorId, runId: created.id });
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {stage.kind === 'choose' ? t('sync.title') : t(`sync.titles.${stage.kind}`, { name })}
        </DialogTitle>
        <DialogDescription>{t(`sync.descriptions.${outcome}`)}</DialogDescription>
      </DialogHeader>

      {stage.kind === 'choose' ? (
        <ChooseSystem
          connectors={connectors}
          value={chosen}
          onChange={setChosen}
          locked={connectorId !== undefined}
        />
      ) : null}

      {stage.kind !== 'choose' && run ? <SyncRunStatus run={run} /> : null}
      {failed && run ? (
        <p role="alert" className="text-sm text-danger">
          {errorText(run.errors.at(-1))}
        </p>
      ) : null}
      {readyToApply ? <SyncPreview run={run} /> : null}
      {outcome === 'inSync' ? (
        <p className="flex items-center gap-2 text-sm text-success" role="status">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {t('sync.inSync')}
        </p>
      ) : null}
      {stage.kind === 'apply' && run && finished && run.counts.conflicts > 0 ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-warning">
          <GitCompareArrows className="size-4" aria-hidden="true" />
          {t('sync.conflictsFound', { count: run.counts.conflicts })}
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link to="/employees?view=conflicts" onClick={onClose}>
              {t('sync.reviewConflicts')}
            </Link>
          </Button>
        </p>
      ) : null}
      {start.isError ? <ErrorState error={start.error} /> : null}

      <DialogFooter className="items-center">
        {readyToApply ? (
          <div className="mr-auto w-full sm:w-80">
            <SlideCommit
              label={t('sync.slide')}
              armedLabel={t('sync.slideArmed')}
              workingLabel={t('sync.applying')}
              doneLabel={t('sync.applied')}
              errorLabel={t('sync.applyFailed')}
              onConfirm={apply}
            />
          </div>
        ) : null}
        <Button type="button" variant="outline" onClick={onClose}>
          {finished && !readyToApply ? tCommon('actions.close') : tCommon('actions.cancel')}
        </Button>
        {stage.kind === 'choose' ? (
          <Button
            type="button"
            disabled={chosen === '' || start.isPending}
            onClick={() => {
              preview(chosen);
            }}
          >
            <Eye aria-hidden="true" data-icon="inline-start" />
            {t('sync.preview.action')}
          </Button>
        ) : null}
        {stage.kind !== 'choose' && failed ? (
          <Button
            type="button"
            disabled={start.isPending}
            onClick={() => {
              preview(stage.connectorId);
            }}
          >
            <RotateCw aria-hidden="true" data-icon="inline-start" />
            {t('sync.previewAgain')}
          </Button>
        ) : null}
      </DialogFooter>
    </DialogContent>
  );
}
