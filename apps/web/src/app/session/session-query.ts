import { dataEnvelopeSchema, sessionUserSchema, type SessionUser } from '@huitong/shared';
import { queryOptions } from '@tanstack/react-query';

import type { ApiClient } from '@/lib/api-client';

export const SESSION_QUERY_KEY = ['session'] as const;

const sessionEnvelopeSchema = dataEnvelopeSchema(sessionUserSchema);

/** The signed-in user (`GET /auth/me`). A 401 means "not signed in", so it is never retried. */
export function sessionQueryOptions(api: ApiClient) {
  return queryOptions<SessionUser>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async ({ signal }) =>
      (await api.get('/auth/me', sessionEnvelopeSchema, { signal })).data,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export { sessionEnvelopeSchema };
