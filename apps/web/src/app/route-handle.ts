import type { Permission } from '@huitong/shared';
import { useMatches, type UIMatch } from 'react-router';

import type { NavKey } from './navigation';

/** Metadata attached to a route with `handle`: breadcrumb label and the permission the page needs. */
export interface RouteHandle {
  crumb?: NavKey;
  requires?: Permission;
}

function handleOf(match: UIMatch): RouteHandle | undefined {
  const handle: unknown = match.handle;
  return handle !== null && typeof handle === 'object' ? handle : undefined;
}

/** Breadcrumb trail for the current location, outermost first. */
export function useBreadcrumbs(): { key: NavKey; pathname: string }[] {
  return useMatches().flatMap((match) => {
    const crumb = handleOf(match)?.crumb;
    return crumb ? [{ key: crumb, pathname: match.pathname }] : [];
  });
}

/** The permission the deepest matched route requires, if any. */
export function useRequiredPermission(): Permission | undefined {
  return useMatches()
    .map((match) => handleOf(match)?.requires)
    .filter((permission) => permission !== undefined)
    .at(-1);
}

/**
 * The matched route's pattern (route ids are their patterns, e.g.
 * `connectors/:connectorId`), which analytics records instead of the raw URL.
 */
export function useRoutePattern(): string {
  const id = useMatches().at(-1)?.id ?? 'unknown';
  return id.startsWith('/') ? id : `/${id}`;
}
