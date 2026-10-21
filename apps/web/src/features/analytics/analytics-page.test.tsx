import {
  DEFAULT_ROLE_PERMISSIONS,
  type AiUsageDashboard,
  type ClickstreamDashboard,
  type ObservabilityDashboard,
  type Role,
} from '@huitong/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

const SAMPLE = { mock: true } as const;

const OBSERVABILITY: ObservabilityDashboard = {
  days: 30,
  services: [
    { id: 'api', state: 'UP', latencyMs: 14 },
    { id: 'mock-cn-hq', state: 'DEGRADED', latencyMs: 860 },
  ],
  requests: [
    { date: '2026-10-20', requests: 4200, errors: 9, p95Ms: 210 },
    { date: '2026-10-21', requests: 3800, errors: 7, p95Ms: 190 },
  ],
};

const CLICKSTREAM: ClickstreamDashboard = {
  days: 30,
  sessions: 400,
  pageViews: 2600,
  pages: [
    { route: '/overview', views: 600, sessions: 380 },
    { route: '/connectors/:connectorId', views: 160, sessions: 90 },
  ],
  funnel: [
    { step: 'sign-in', route: '/login', sessions: 372 },
    { step: 'overview', route: '/overview', sessions: 361 },
    { step: 'employees', route: '/employees', sessions: 231 },
    { step: 'new-mapping', route: '/connectors/new-mapping', sessions: 49 },
    { step: 'consolidation', route: '/attendance-leave', sessions: 27 },
  ],
  locales: [
    { locale: 'en', sessions: 272 },
    { locale: 'zh-CN', sessions: 128 },
  ],
};

const AI_USAGE: AiUsageDashboard = {
  days: 30,
  totals: {
    calls: 420,
    inputTokens: 510_000,
    outputTokens: 160_000,
    costUsd: 3.93,
    errorRate: 0.033,
    medianLatencyMs: 44,
  },
  byFeature: [
    { feature: 'schema-mapping', calls: 160, tokens: 350_000, costUsd: 2.1 },
    { feature: 'discrepancy-explainer', calls: 260, tokens: 320_000, costUsd: 1.83 },
  ],
  byUser: [{ name: 'Tan Mei Ling', role: 'HR_SG', calls: 193, tokens: 308_200, costUsd: 1.81 }],
  byModel: [
    { provider: 'MOCK', model: 'huitong-mock-1', calls: 420, tokens: 670_000, costUsd: 3.93 },
  ],
  byDay: [{ date: '2026-10-21', inputTokens: 17_000, outputTokens: 5_300, costUsd: 0.13 }],
  outcomes: [
    { outcome: 'SUCCESS', calls: 392 },
    { outcome: 'REJECTED', calls: 14 },
    { outcome: 'INVALID_OUTPUT', calls: 11 },
    { outcome: 'ERROR', calls: 3 },
  ],
};

function routesFor(role: Role, extra: FakeRoutes = {}): FakeRoutes {
  return {
    'GET /auth/me': { body: { data: sessionFor(role, [...DEFAULT_ROLE_PERMISSIONS[role]]) } },
    'GET /analytics/observability': { body: { data: OBSERVABILITY, meta: SAMPLE } },
    'GET /analytics/clickstream': { body: { data: CLICKSTREAM, meta: SAMPLE } },
    'GET /analytics/ai-usage': { body: { data: AI_USAGE, meta: SAMPLE } },
    ...extra,
  };
}

describe('Analytics', () => {
  // Recharts is large: loading the lazy page once up front keeps a cold run inside the query timeouts.
  beforeAll(async () => {
    await import('./analytics-page');
  }, 30_000);

  it('shows service health with words, not colour alone, and the requests as a table too', async () => {
    const user = userEvent.setup();
    renderApp('/analytics', routesFor('MANAGEMENT'));
    const services = await screen.findByRole('region', { name: 'Services' });
    const cnHq = within(services).getByText('mock-cn-hq').closest('li');
    expect(cnHq).not.toBeNull();
    expect(within(cnHq as HTMLElement).getByText('Degraded')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sample data' })).toBeInTheDocument();
    expect(screen.getByText('8,000')).toBeVisible();

    await user.click(screen.getAllByText('Show as a table')[0] as HTMLElement);
    const table = screen.getByRole('table', { name: 'Requests and errors per day' });
    expect(within(table).getByRole('row', { name: /4,200 9/ })).toBeVisible();
  });

  it('keeps the chosen window across the dashboards', async () => {
    const user = userEvent.setup();
    renderApp('/analytics', routesFor('AUDITOR'));
    const window = await screen.findByRole('radiogroup', { name: 'Time window' });
    await user.click(within(window).getByRole('radio', { name: 'Last 7 days' }));
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Clickstream' })).toHaveAttribute(
        'href',
        '/analytics/clickstream?days=7',
      );
    });
  });

  it('shows the journey funnel, pages by route pattern and the interface languages', async () => {
    renderApp('/analytics/clickstream', routesFor('MANAGEMENT'));
    const funnel = await screen.findByRole('table', {
      name: 'Sessions at each step of the demo journey',
    });
    const signIn = within(funnel).getByRole('row', { name: /Sign in/ });
    expect(within(signIn).getByText('100%')).toBeVisible();
    const pages = screen.getByRole('table', { name: 'Page views and sessions by route pattern' });
    expect(within(pages).getByText('/connectors/:connectorId')).toBeVisible();
    expect(within(pages).getByText('Connector')).toBeVisible();
    expect(screen.getByRole('rowheader', { name: 'Simplified Chinese' })).toBeVisible();
  });

  it('breaks AI use down by feature, person, model and outcome, with rejections apart', async () => {
    renderApp('/analytics/ai-usage', routesFor('AUDITOR'));
    const features = await screen.findByRole('table', {
      name: 'Calls, tokens and cost by feature',
    });
    expect(
      within(features).getByRole('rowheader', { name: 'Schema-mapping assistant' }),
    ).toBeVisible();
    const outcomes = screen.getByRole('table', { name: 'Calls by outcome' });
    expect(within(outcomes).getByRole('row', { name: /Rejected by HR/ })).toHaveTextContent('14');
    const models = screen.getByRole('table', {
      name: 'Calls, tokens and cost by provider and model',
    });
    expect(within(models).getByText(/no data leaves HuiTong/)).toBeVisible();
    expect(screen.getByText(/not an invoice/)).toBeVisible();
  });

  it('says when no AI call was made in the window', async () => {
    const empty: AiUsageDashboard = {
      ...AI_USAGE,
      totals: { ...AI_USAGE.totals, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
      byFeature: [],
      byUser: [],
      byModel: [],
      byDay: [],
      outcomes: [],
    };
    renderApp(
      '/analytics/ai-usage',
      routesFor('AUDITOR', { 'GET /analytics/ai-usage': { body: { data: empty, meta: SAMPLE } } }),
    );
    expect(await screen.findByText('No AI call was recorded in this window.')).toBeVisible();
  });

  it('hides AI usage from management, and refuses analytics to HR', async () => {
    renderApp('/analytics', routesFor('MANAGEMENT'));
    const nav = await screen.findByRole('navigation', { name: 'Analytics sections' });
    expect(within(nav).queryByRole('link', { name: 'AI usage' })).not.toBeInTheDocument();

    renderApp('/analytics', routesFor('HR_SG'));
    expect(await screen.findByText('You do not have access to this page')).toBeVisible();
  });
});
