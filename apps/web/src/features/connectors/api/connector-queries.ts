import { connectorSummarySchema, dataEnvelopeSchema } from '@huitong/shared';
import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/app/providers/dependencies-context';

/** Every connector query lives under this key. */
export const CONNECTORS_KEY = ['connectors'] as const;

const listSchema = dataEnvelopeSchema(connectorSummarySchema.array());

export function useConnectors() {
  const api = useApiClient();
  return useQuery({
    queryKey: [...CONNECTORS_KEY, 'list'],
    queryFn: async ({ signal }) => (await api.get('/connectors', listSchema, { signal })).data,
  });
}
