import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-error';

/** Client errors (4xx) will not fix themselves, so only network and server failures are retried. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

/** The server-state cache shared by every feature (TanStack Query). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
