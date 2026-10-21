import {
  aiUsageDashboardSchema,
  clickstreamDashboardSchema,
  dataEnvelopeSchema,
  observabilityDashboardSchema,
  type DashboardQuery,
} from '@huitong/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/app/providers/dependencies-context';
import { toQueryString } from '@/lib/query-string';

/** Every monitoring dashboard query lives under this key. */
export const ANALYTICS_KEY = ['analytics'] as const;

type Days = DashboardQuery['days'];

const observabilitySchema = dataEnvelopeSchema(observabilityDashboardSchema);
const clickstreamSchema = dataEnvelopeSchema(clickstreamDashboardSchema);
const aiUsageSchema = dataEnvelopeSchema(aiUsageDashboardSchema);

/**
 * Whole envelopes, so each page can tell typed sample data (`meta.mock`) from
 * the real thing. A new window keeps the previous figures on screen until the
 * new ones arrive, so nothing jumps.
 */
export function useObservability(days: Days) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'observability', days],
    queryFn: ({ signal }) =>
      api.get(`/analytics/observability${toQueryString({ days })}`, observabilitySchema, {
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useClickstream(days: Days) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'clickstream', days],
    queryFn: ({ signal }) =>
      api.get(`/analytics/clickstream${toQueryString({ days })}`, clickstreamSchema, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useAiUsage(days: Days) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'ai-usage', days],
    queryFn: ({ signal }) =>
      api.get(`/analytics/ai-usage${toQueryString({ days })}`, aiUsageSchema, { signal }),
    placeholderData: keepPreviousData,
  });
}
