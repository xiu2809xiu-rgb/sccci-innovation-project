import { authOptionsSchema, dataEnvelopeSchema, type AuthOptions } from '@huitong/shared';
import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/app/providers/dependencies-context';

const authOptionsEnvelopeSchema = dataEnvelopeSchema(authOptionsSchema);

/** Public sign-in options. Demo sign-in controls stay hidden until the server confirms demo mode. */
export function useAuthOptions(): AuthOptions | undefined {
  const api = useApiClient();
  return useQuery({
    queryKey: ['auth-options'],
    queryFn: async ({ signal }) =>
      (await api.get('/auth/options', authOptionsEnvelopeSchema, { signal })).data,
    staleTime: Number.POSITIVE_INFINITY,
  }).data;
}
