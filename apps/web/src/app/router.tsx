import type { ComponentType } from 'react';
import { createBrowserRouter, redirect, type RouteObject } from 'react-router';

import { NotFoundPage } from './errors/not-found-page';
import { BootSplash } from './layouts/boot-splash';
import { RouteErrorBoundary } from './errors/route-error-boundary';
import type { AppDependencies } from './providers/dependencies-context';
import { RootRoute } from './root-route';
import type { RouteHandle } from './route-handle';
import { redirectIfSignedIn, requireSession } from './session/route-guards';

type LazyPage = () => Promise<{ Component: ComponentType }>;

/** Lazy route module: each page is its own chunk (route-level code splitting, CLAUDE.md section 7). */
function page<Module extends Record<string, unknown>>(
  load: () => Promise<Module>,
  name: keyof Module,
): LazyPage {
  return async () => ({ Component: (await load())[name] as ComponentType });
}

/**
 * A page route. `id` is the full URL pattern (e.g. `connectors/:connectorId`):
 * analytics records the pattern, never the concrete URL.
 */
function child(
  id: string,
  path: string | undefined,
  handle: RouteHandle,
  lazy: LazyPage,
): RouteObject {
  return path === undefined ? { id, index: true, handle, lazy } : { id, path, handle, lazy };
}

const overview = page(() => import('@/features/overview/overview-page'), 'OverviewPage');
const employees = page(() => import('@/features/employees/employees-page'), 'EmployeesPage');
const connectors = page(() => import('@/features/connectors/connectors-page'), 'ConnectorsPage');
const integrationMap = page(
  () => import('@/features/integration-map/integration-map-page'),
  'IntegrationMapPage',
);
const workflows = page(() => import('@/features/workflows/workflows-page'), 'WorkflowsPage');
const attendanceLeave = page(
  () => import('@/features/attendance-leave/attendance-leave-page'),
  'AttendanceLeavePage',
);
const reports = page(() => import('@/features/attendance-leave/reports-page'), 'ReportsPage');
const governance = page(() => import('@/features/governance/governance-page'), 'GovernancePage');
const analytics = page(() => import('@/features/analytics/analytics-page'), 'AnalyticsPage');
const settings = page(() => import('@/features/settings/settings-page'), 'SettingsPage');
const login = page(() => import('@/features/auth/login-page'), 'LoginPage');

/** The full route tree (facts sheet section 9). Tests mount it in a memory router. */
export function createAppRoutes(
  dependencies: Pick<AppDependencies, 'api' | 'queryClient'>,
): RouteObject[] {
  const pages: RouteObject[] = [
    child('overview', 'overview', { crumb: 'overview' }, overview),
    child('employees', 'employees', { crumb: 'employees', requires: 'employees:read' }, employees),
    {
      path: 'connectors',
      handle: { crumb: 'connectors', requires: 'connectors:read' } satisfies RouteHandle,
      children: [
        child('connectors', undefined, {}, connectors),
        child(
          'connectors/new-mapping',
          'new-mapping',
          { crumb: 'newMapping', requires: 'mappings:propose' },
          connectors,
        ),
        child('connectors/:connectorId', ':connectorId', { crumb: 'connectorDetail' }, connectors),
      ],
    },
    child(
      'integration-map',
      'integration-map',
      { crumb: 'integrationMap', requires: 'connectors:read' },
      integrationMap,
    ),
    {
      path: 'workflows',
      handle: { crumb: 'workflows', requires: 'workflows:read' } satisfies RouteHandle,
      children: [
        child('workflows', undefined, {}, workflows),
        child(
          'workflows/tasks',
          'tasks',
          { crumb: 'tasks', requires: 'workflows:tasks' },
          workflows,
        ),
        child('workflows/:instanceId', ':instanceId', { crumb: 'workflowInstance' }, workflows),
      ],
    },
    {
      path: 'attendance-leave',
      handle: { crumb: 'attendanceLeave', requires: 'attendance:read' } satisfies RouteHandle,
      children: [
        child('attendance-leave', undefined, {}, attendanceLeave),
        child('attendance-leave/mappings', 'mappings', { crumb: 'leaveMappings' }, attendanceLeave),
        child(
          'attendance-leave/template',
          'template',
          { crumb: 'reportTemplate' },
          attendanceLeave,
        ),
      ],
    },
    child('reports', 'reports', { crumb: 'reports', requires: 'reports:read' }, reports),
    {
      path: 'governance',
      handle: { crumb: 'governance', requires: 'governance:read' } satisfies RouteHandle,
      children: [
        child('governance', undefined, {}, governance),
        child(
          'governance/classification',
          'classification',
          { crumb: 'classification' },
          governance,
        ),
        child('governance/transfers', 'transfers', { crumb: 'transfers' }, governance),
        child('governance/retention', 'retention', { crumb: 'retention' }, governance),
        child('governance/audit', 'audit', { crumb: 'audit', requires: 'audit:read' }, governance),
      ],
    },
    {
      path: 'analytics',
      handle: { crumb: 'analytics', requires: 'analytics:read' } satisfies RouteHandle,
      children: [
        child('analytics', undefined, {}, analytics),
        child('analytics/clickstream', 'clickstream', { crumb: 'clickstream' }, analytics),
        child(
          'analytics/ai-usage',
          'ai-usage',
          { crumb: 'aiUsage', requires: 'ai-usage:read' },
          analytics,
        ),
      ],
    },
    child('settings', 'settings', { crumb: 'settings' }, settings),
    { id: '*', path: '*', Component: NotFoundPage },
  ];

  return [
    {
      id: 'root',
      Component: RootRoute,
      errorElement: <RouteErrorBoundary />,
      hydrateFallbackElement: <BootSplash />,
      children: [
        { id: 'login', path: 'login', loader: redirectIfSignedIn(dependencies), lazy: login },
        {
          id: 'app',
          path: '/',
          loader: requireSession(dependencies),
          // The signed-in shell is its own chunk, so the landing page does not download it.
          lazy: page(() => import('./layouts/app-layout'), 'AppLayout'),
          children: [
            { index: true, loader: () => redirect('/overview') },
            // Errors inside a page keep the sidebar and top bar on screen.
            { id: 'pages', errorElement: <RouteErrorBoundary />, children: pages },
          ],
        },
      ],
    },
  ];
}

/** The browser router the app runs on. */
export function createAppRouter(dependencies: Pick<AppDependencies, 'api' | 'queryClient'>) {
  return createBrowserRouter(createAppRoutes(dependencies));
}
