import {
  dataEnvelopeSchema,
  REALTIME_EVENTS,
  syncProgressEventSchema,
  syncRunDetailSchema,
  syncRunSchema,
  type StartSyncRequest,
  type SyncRunDetail,
  type SyncRunStatus,
} from '@huitong/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  useApiClient,
  useRealtimeEvents,
  useRealtimeState,
} from '@/app/providers/dependencies-context';

import { CONNECTORS_KEY } from './connector-queries';

const runEnvelope = dataEnvelopeSchema(syncRunSchema);
const detailEnvelope = dataEnvelopeSchema(syncRunDetailSchema);

const TERMINAL: ReadonlySet<SyncRunStatus> = new Set(['SUCCEEDED', 'PARTIAL', 'FAILED']);

export function isFinished(status: SyncRunStatus): boolean {
  return TERMINAL.has(status);
}

const runKey = (syncRunId: string) => ['sync-run', syncRunId] as const;

/**
 * Queues a sync. Each call gets its own idempotency key, so the client's
 * one automatic retry (after a session refresh) can never start a second run.
 */
export function useStartSync() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      connectorId,
      request,
    }: {
      connectorId: string;
      request: StartSyncRequest;
    }) =>
      (
        await api.post(`/connectors/${connectorId}/sync`, runEnvelope, {
          body: request,
          idempotencyKey: crypto.randomUUID(),
        })
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONNECTORS_KEY }),
  });
}

/**
 * One run, kept current while it works: live progress events update the
 * cached run in place (ids, stage and counts only), and its preview and
 * errors are fetched once it finishes. Without live updates it polls.
 */
export function useSyncRun(syncRunId: string | null) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const live = useRealtimeState() === 'open';

  useRealtimeEvents((event) => {
    if (syncRunId === null || !event.type.startsWith('sync.')) return;
    const parsed = syncProgressEventSchema.safeParse(event.data);
    if (!parsed.success || parsed.data.syncRunId !== syncRunId) return;
    const { status, stage, progress, counts } = parsed.data;
    if (event.type === REALTIME_EVENTS.syncProgress && !isFinished(status)) {
      queryClient.setQueryData<SyncRunDetail>(runKey(syncRunId), (run) =>
        run && !isFinished(run.status) ? { ...run, status, stage, progress, counts } : run,
      );
    } else {
      // Finished: fetch the preview and errors, which live events never carry.
      void queryClient.invalidateQueries({ queryKey: runKey(syncRunId) });
    }
  });

  return useQuery({
    queryKey: runKey(syncRunId ?? 'none'),
    queryFn: async ({ signal }) =>
      (await api.get(`/sync-runs/${syncRunId ?? ''}`, detailEnvelope, { signal })).data,
    enabled: syncRunId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && isFinished(status)) return false;
      return live ? 5000 : 1000;
    },
  });
}
