import { STAGED_IMPORT_TTL_MINUTES, statusAllowsSync, type ConnectorDetail } from '@huitong/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/error-state';
import { SectionCard } from '@/components/common/section-card';
import { Button } from '@/components/ui/button';
import { useHasPermission } from '@/app/session/use-session';

import { CONNECTORS_KEY } from '../../api/connector-queries';
import { useDiscardImport } from '../../api/file-import';
import { ImportFileForm } from './import-file-form';
import { StagedImportSummary } from './staged-import-summary';

/** How long to wait before asking again when the file is still there at its expiry time. */
const RECHECK_MS = 15_000;

/**
 * Asks for the connector again once its staged file should have expired, and
 * says so when the file has indeed gone. The browser's clock may run ahead of
 * the server's, so a file still there is checked again until it goes.
 */
function useExpiry(expiresAt: string | null) {
  const { t } = useTranslation('connectors');
  const queryClient = useQueryClient();
  const [round, setRound] = useState(0);
  const waiting = useRef(false);

  useEffect(() => {
    if (expiresAt !== null || !waiting.current) return;
    waiting.current = false;
    toast.info(t('detail.import.expiredToast', { minutes: STAGED_IMPORT_TTL_MINUTES }));
  }, [expiresAt, t]);

  useEffect(() => {
    if (expiresAt === null) return undefined;
    // A second's margin, so the file is gone from Redis when the page asks.
    const due = new Date(expiresAt).getTime() - Date.now() + 1_000;
    const timer = setTimeout(
      () => {
        waiting.current = true;
        void queryClient.invalidateQueries({ queryKey: CONNECTORS_KEY });
        setRound((count) => count + 1);
      },
      round === 0 ? Math.max(due, 0) : RECHECK_MS,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [expiresAt, round, queryClient]);
}

/**
 * A file connector's import. HR stages the whole export, which HuiTong reads
 * through the approved mapping and minimises; Sync now then previews and
 * applies it like any other source, so nothing reaches the master unseen.
 */
export function ImportFileCard({ connector }: { connector: ConnectorDetail }) {
  const { t } = useTranslation('connectors');
  const canImport = useHasPermission('employees:sync');
  const canPropose = useHasPermission('mappings:propose');
  const discard = useDiscardImport(connector.id);
  const inputId = useId();
  const version = connector.activeMappingVersion;
  const staged = connector.stagedImport;
  useExpiry(staged?.expiresAt ?? null);

  // A system being retired or turned off takes no file, as the API also refuses.
  if (!statusAllowsSync(connector.type, connector.status)) {
    return (
      <SectionCard title={t('detail.import.title')}>
        <p className="text-sm text-muted-foreground">
          {connector.status === 'DISABLED'
            ? t('detail.import.retired.DISABLED')
            : t('detail.import.retired.DEPRECATED')}
        </p>
      </SectionCard>
    );
  }

  if (version === null) {
    return (
      <SectionCard title={t('detail.import.title')}>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {canPropose ? t('detail.import.noMapping') : t('detail.import.noMappingReadOnly')}
          </p>
          {canPropose ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/connectors/new-mapping">{t('detail.import.openWizard')}</Link>
            </Button>
          ) : null}
        </div>
      </SectionCard>
    );
  }

  // A file read by an older mapping version cannot be synced: the API refuses it too.
  const usable = staged !== null && staged.mappingVersion === version;
  // Discarding needs no confirmation: nothing was imported, and the file can be staged again.
  const onDiscard = () => {
    discard.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('detail.import.discardedToast'));
        // The summary and its button go; focus stays in the card, on the file picker.
        document.getElementById(inputId)?.focus();
      },
    });
  };

  return (
    <SectionCard
      title={t('detail.import.title')}
      description={t('detail.import.description', { version })}
    >
      <div className="space-y-5">
        {staged ? (
          <StagedImportSummary
            staged={staged}
            stale={!usable}
            discarding={discard.isPending}
            {...(canImport ? { onDiscard } : {})}
          />
        ) : null}
        {discard.isError ? <ErrorState error={discard.error} /> : null}
        {canImport ? (
          <>
            {usable ? (
              <p className="text-sm text-muted-foreground">{t('detail.import.next')}</p>
            ) : null}
            <ImportFileForm
              connectorId={connector.id}
              inputId={inputId}
              replacing={staged !== null}
              primary={!usable}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('detail.import.noPermission')}</p>
        )}
      </div>
    </SectionCard>
  );
}
