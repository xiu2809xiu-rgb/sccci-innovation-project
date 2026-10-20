import { dataEnvelopeSchema, overviewSchema, type Overview } from '@huitong/shared';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { useApiClient, useRealtimeEvents } from '@/app/providers/dependencies-context';

export const OVERVIEW_QUERY_KEY = ['overview'] as const;

const overviewEnvelopeSchema = dataEnvelopeSchema(overviewSchema);

/**
 * The overview read model (`GET /overview`), refreshed whenever a business
 * event arrives on the live stream. Progress ticks are ignored: they arrive
 * several times a second during a sync and would refetch constantly.
 */
export function useOverview(): UseQueryResult<Overview> {
  const api = useApiClient();
  const queryClient = useQueryClient();

  useRealtimeEvents((event) => {
    if (!event.type.endsWith('.progress')) {
      void queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
    }
  });

  return useQuery({
    queryKey: OVERVIEW_QUERY_KEY,
    queryFn: async ({ signal }) =>
      (await api.get('/overview', overviewEnvelopeSchema, { signal })).data,
  });
}
