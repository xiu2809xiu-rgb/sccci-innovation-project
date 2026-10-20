import type { Permission, SessionUser } from '@huitong/shared';
import { useSuspenseQuery } from '@tanstack/react-query';

import { useApiClient } from '@/app/providers/dependencies-context';

import { sessionQueryOptions } from './session-query';

/**
 * The signed-in user. Only call it below the app layout, whose loader has
 * already made sure a session exists (so this never suspends there).
 */
export function useSession(): SessionUser {
  return useSuspenseQuery(sessionQueryOptions(useApiClient())).data;
}

/** True when the signed-in user's role holds `permission`. */
export function useHasPermission(permission: Permission): boolean {
  return useSession().permissions.includes(permission);
}
