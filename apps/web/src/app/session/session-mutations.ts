import type { LoginRequest, Role, SessionUser } from '@huitong/shared';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { z } from 'zod';

import { useApiClient } from '@/app/providers/dependencies-context';
import type { ApiError } from '@/lib/api-error';

import { SESSION_QUERY_KEY, sessionEnvelopeSchema } from './session-query';

/** Signs in with email and password; the API sets httpOnly session cookies. */
export function useSignIn(): UseMutationResult<SessionUser, ApiError, LoginRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      await api.ensureCsrf();
      return (await api.post('/auth/login', sessionEnvelopeSchema, { body })).data;
    },
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

/** Demo mode only: signs in as the seeded user of a role (the role switcher and the demo picker). */
export function useDemoSignIn(): UseMutationResult<SessionUser, ApiError, Role> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (role: Role) => {
      await api.ensureCsrf();
      return (await api.post('/auth/demo-login', sessionEnvelopeSchema, { body: { role } })).data;
    },
    onSuccess: (user) => {
      // Everything cached belonged to the previous role and may be masked differently.
      queryClient.clear();
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

/** Signs out (revoking the refresh-token family) and drops every cached response. */
export function useSignOut(): UseMutationResult<undefined, ApiError, void> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout', z.undefined()),
    onSettled: () => {
      queryClient.clear();
    },
  });
}
