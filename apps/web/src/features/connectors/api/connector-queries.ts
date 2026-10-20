import {
  connectorDetailSchema,
  connectorSummarySchema,
  dataEnvelopeSchema,
  healthCheckResultSchema,
  listEnvelopeSchema,
  REALTIME_EVENTS,
  syncRunSchema,
  type HealthCheckResult,
} from '@huitong/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import { useApiClient, useRealtimeEvents } from '@/app/providers/dependencies-context';
import type { ApiError } from '@/lib/api-error';
import { toQueryString } from '@/lib/query-string';

/** Every connector query lives under this key. */
export const CONNECTORS_KEY = ['connectors'] as const;

const listSchema = dataEnvelopeSchema(connectorSummarySchema.array());
const detailSchema = dataEnvelopeSchema(connectorDetailSchema);
const runsSchema = listEnvelopeSchema(syncRunSchema);
const healthSchema = dataEnvelopeSchema(healthCheckResultSchema);

const CONNECTOR_EVENTS: ReadonlySet<string> = new Set([
  REALTIME_EVENTS.syncCompleted,
  REALTIME_EVENTS.syncFailed,
  REALTIME_EVENTS.mappingApproved,
]);

/** Refetches connector status while mounted when a run finishes or a mapping version is approved. */
export function useLiveConnectors(): void {
  const queryClient = useQueryClient();
  useRealtimeEvents((event) => {
    if (CONNECTOR_EVENTS.has(event.type)) {
      void queryClient.invalidateQueries({ queryKey: CONNECTORS_KEY });
    }
  });
}

export function useConnectors() {
  const api = useApiClient();
  return useQuery({
    queryKey: [...CONNECTORS_KEY, 'list'],
    queryFn: async ({ signal }) => (await api.get('/connectors', listSchema, { signal })).data,
  });
}

/** Non-secret settings, the credential reference and every mapping version. */
export function useConnector(connectorId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...CONNECTORS_KEY, 'detail', connectorId],
    queryFn: async ({ signal }) =>
      (await api.get(`/connectors/${connectorId}`, detailSchema, { signal })).data,
  });
}

export function useConnectorRuns(connectorId: string, page: number, pageSize = 10) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...CONNECTORS_KEY, 'runs', connectorId, page, pageSize],
    queryFn: ({ signal }) =>
      api.get(
        `/connectors/${connectorId}/sync-runs${toQueryString({ page, pageSize })}`,
        runsSchema,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

/** Asks the system whether it responds; the result is audited and shown on the connector. */
export function useHealthCheck(): UseMutationResult<HealthCheckResult, ApiError, string> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (connectorId: string) =>
      (await api.post(`/connectors/${connectorId}/health-check`, healthSchema)).data,
    onSettled: () => queryClient.invalidateQueries({ queryKey: CONNECTORS_KEY }),
  });
}
