import type { Locale, Permission, Role, SessionUser } from '@huitong/shared';
import { render, type RenderResult } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { usePreferences } from '@/app/preferences/preferences-store';
import { AppProviders } from '@/app/providers/app-providers';
import type { AppDependencies } from '@/app/providers/dependencies-context';
import { createAppRoutes } from '@/app/router';
import { createI18n } from '@/i18n/create-i18n';
import { AnalyticsTracker } from '@/lib/analytics-tracker';
import { ApiClient } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';
import { RealtimeClient } from '@/lib/realtime-client';

/** A fake API: maps `METHOD /path` (without the /api/v1 prefix) to a JSON body and status. */
export type FakeRoutes = Record<string, { status?: number; body?: unknown }>;

export function sessionFor(role: Role, permissions: Permission[]): SessionUser {
  return {
    id: '0199f0a0-0000-7000-8000-000000000001',
    email: 'meiling.tan@orge.example',
    displayName: 'Tan Mei Ling',
    displayNameZh: '谭美玲',
    role,
    homeEntityCode: 'SG01',
    employeeNo: 'E100003',
    locale: 'en',
    permissions,
  };
}

function fakeFetch(routes: FakeRoutes): typeof fetch {
  return (input, init) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      'http://localhost',
    );
    const key = `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/api\/v1/, '')}`;
    const route = routes[key] ?? {
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: key, traceId: 'test-trace' } },
    };
    const status = route.status ?? 200;
    return Promise.resolve(
      new Response(status === 204 ? null : JSON.stringify(route.body ?? {}), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  };
}

/** Mounts the real route tree at `path` with a fake API, for page and routing tests. */
export function renderApp(
  path: string,
  routes: FakeRoutes = {},
  language: Locale = 'en',
): RenderResult & { dependencies: AppDependencies } {
  // AppProviders keeps i18n in step with the preferences store, as the real app does.
  usePreferences.setState({ language });
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } });
  const dependencies: AppDependencies = {
    api: new ApiClient({ fetchImpl: fakeFetch(routes), readCookies: () => 'ht_csrf=test-csrf' }),
    queryClient,
    analytics: new AnalyticsTracker({ hasConsent: () => false }),
    realtime: new RealtimeClient({ createSource: null }),
    i18n: createI18n(language),
  };
  const router = createMemoryRouter(createAppRoutes(dependencies), { initialEntries: [path] });
  const result = render(
    <AppProviders dependencies={dependencies}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...result, dependencies };
}
