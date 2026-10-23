import { CheckCircle2, Eye, GitCompareArrows, RotateCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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

import { CONNECTORS_KEY, useConnectors } from '../../api/connector-queries';
import { isFinished, useStartSync, useSyncRun } from '../../api/sync-runs';
import { useSyncErrorText } from '../../hooks/use-sync-error-text';
import { ChooseSystem } from './choose-system';
import { descriptionOf, outcomeOf, recordErrorsOf, type SyncStage } from './sync-outcome';
import { SyncPreview } from './sync-preview';
import { SyncRecordErrors } from './sync-record-errors';
import { SyncRunStatus } from './sync-run-status';

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
  const queryClient = useQueryClient();
  const connectors = useConnectors();
  const start = useStartSync();
  // The control that opened the dialog, where focus returns when it closes, if it is still there.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const [chosen, setChosen] = useState(connectorId ?? '');
  const [stage, setStage] = useState<SyncStage>({ kind: 'choose' });
  const run = useSyncRun(stage.kind === 'choose' ? null : stage.runId).data;
  // Any connector, not only syncable ones: a file connector stops being syncable once its file is applied.
  const picked = (connectors.data ?? []).find((connector) => connector.id === chosen);
  const name = picked ? (i18n.language === 'zh-CN' ? picked.nameZh : picked.name) : chosen;
  const outcome = outcomeOf(stage, run);
  const finished = run !== undefined && isFinished(run.status);
  const readyToApply = stage.kind === 'preview' && finished && outcome === 'preview';
  const failed = outcome === 'previewFailed' || outcome === 'applyFailed';
  // A file connector would read the same file again: its file has to be corrected first.
  const canPreviewAgain =
    failed || (outcome === 'allRecordsFailed' && picked?.type !== 'FILE_IMPORT');
  const recordErrors = run && finished ? recordErrorsOf(run) : [];

  // A finished run changes the connector (its last sync, a file used up, a draft activated),
  // and live updates may not reach this browser, so the pages ask again.
  const finishedRun = finished ? run.id : null;
  useEffect(() => {
    if (finishedRun !== null) void queryClient.invalidateQueries({ queryKey: CONNECTORS_KEY });
  }, [finishedRun, queryClient]);

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
    <DialogContent
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
      onCloseAutoFocus={(event) => {
        if (opener?.isConnected) return;
        // The opener went with the sync (nothing left to sync): focus the page, not the body.
        event.preventDefault();
        document.getElementById('main')?.focus();
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {stage.kind === 'choose' ? t('sync.title') : t(`sync.titles.${stage.kind}`, { name })}
        </DialogTitle>
        <DialogDescription>
          {t(`sync.descriptions.${descriptionOf(outcome, picked?.type)}`)}
        </DialogDescription>
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
      {run && recordErrors.length > 0 ? (
        <SyncRecordErrors errors={recordErrors} total={run.counts.errors} mode={run.mode} />
      ) : null}
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
        {stage.kind !== 'choose' && canPreviewAgain ? (
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
