import type { SessionUser } from '@huitong/shared';
import { redirect, type LoaderFunctionArgs } from 'react-router';

import type { AppDependencies } from '@/app/providers/dependencies-context';
import { ApiError } from '@/lib/api-error';

import { sessionQueryOptions } from './session-query';

/** Only same-app paths are accepted as a post-sign-in destination (no open redirects). */
export function safeNextPath(value: string | null): string {
  return value?.startsWith('/') === true && !value.startsWith('//') ? value : '/overview';
}

/**
 * Loader for the signed-in area: no session means a redirect to sign-in before
 * anything renders. The cached session is re-checked once it is five minutes old.
 */
export function requireSession({ api, queryClient }: Pick<AppDependencies, 'api' | 'queryClient'>) {
  return async ({ request }: LoaderFunctionArgs): Promise<SessionUser | Response> => {
    try {
      return await queryClient.query(sessionQueryOptions(api));
    } catch (error) {
      if (error instanceof ApiError && error.isAuthError) {
        const url = new URL(request.url);
        return redirect(`/login?next=${encodeURIComponent(url.pathname + url.search)}`);
      }
      throw error;
    }
  };
}

/** Loader for the sign-in page: someone already signed in goes straight to where they were heading. */
export function redirectIfSignedIn({
  api,
  queryClient,
}: Pick<AppDependencies, 'api' | 'queryClient'>) {
  return async ({ request }: LoaderFunctionArgs): Promise<Response | null> => {
    try {
      await queryClient.query(sessionQueryOptions(api));
    } catch {
      return null;
    }
    return redirect(safeNextPath(new URL(request.url).searchParams.get('next')));
  };
}
