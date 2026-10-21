import {
  aiUsageDashboardSchema,
  clickstreamDashboardSchema,
  FUNNEL_STEPS,
  observabilityDashboardSchema,
} from '@huitong/shared';

import { dashboardWindow } from '../dashboard-window.js';
import { MockAnalyticsDashboardsRepository } from './mock-analytics-dashboards.repository.js';

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

describe('MockAnalyticsDashboardsRepository', () => {
  const repository = new MockAnalyticsDashboardsRepository();
  const now = new Date('2026-10-21T09:00:00Z');
  const month = dashboardWindow(30, now);
  const week = dashboardWindow(7, now);

  it('serves AI usage that matches the contract and adds up', async () => {
    const usage = aiUsageDashboardSchema.parse(await repository.aiUsage(month));
    const { calls, inputTokens, outputTokens } = usage.totals;
    expect(usage.byDay).toHaveLength(30);
    expect(sum(usage.byFeature.map((row) => row.calls))).toBe(calls);
    expect(sum(usage.byUser.map((row) => row.calls))).toBe(calls);
    expect(sum(usage.outcomes.map((row) => row.calls))).toBe(calls);
    expect(sum(usage.byModel.map((row) => row.calls))).toBe(calls);
    expect(sum(usage.byFeature.map((row) => row.tokens))).toBe(inputTokens + outputTokens);
    expect(sum(usage.byUser.map((row) => row.tokens))).toBe(inputTokens + outputTokens);
    expect(sum(usage.byDay.map((day) => day.inputTokens))).toBe(inputTokens);
    expect(sum(usage.byDay.map((day) => day.costUsd))).toBeCloseTo(usage.totals.costUsd, 2);
    expect(usage.byUser.map((row) => row.tokens)).toEqual(
      [...usage.byUser.map((row) => row.tokens)].sort((a, b) => b - a),
    );
  });

  it('shows the same figures for a day whatever the window, so nothing jumps on reload', async () => {
    const [monthly, weekly] = await Promise.all([
      repository.aiUsage(month),
      repository.aiUsage(week),
    ]);
    expect(weekly.byDay).toEqual(monthly.byDay.slice(-7));
    expect(await repository.aiUsage(month)).toEqual(monthly);

    const [monthlyRequests, weeklyRequests] = await Promise.all([
      repository.observability(month),
      repository.observability(week),
    ]);
    expect(weeklyRequests.requests).toEqual(monthlyRequests.requests.slice(-7));
  });

  it('counts only mapping proposals as rejected, and errors apart from rejections', async () => {
    const usage = await repository.aiUsage(month);
    const rejected = usage.outcomes.find((row) => row.outcome === 'REJECTED')?.calls ?? 0;
    const mapping = usage.byFeature.find((row) => row.feature === 'schema-mapping')?.calls ?? 0;
    expect(rejected).toBeGreaterThan(0);
    expect(rejected).toBeLessThan(mapping);
    const failed = usage.outcomes
      .filter((row) => row.outcome === 'ERROR' || row.outcome === 'INVALID_OUTPUT')
      .map((row) => row.calls);
    expect(usage.totals.errorRate).toBeCloseTo(sum(failed) / usage.totals.calls, 10);
  });

  it('serves clickstream by route pattern, with a funnel that only narrows', async () => {
    const clicks = clickstreamDashboardSchema.parse(await repository.clickstream(month));
    expect(clicks.pageViews).toBe(sum(clicks.pages.map((page) => page.views)));
    expect(clicks.pages.every((page) => page.route.startsWith('/') && !/\d/.test(page.route))).toBe(
      true,
    );
    expect(clicks.funnel.map((row) => row.step)).toEqual([...FUNNEL_STEPS]);
    const reached = clicks.funnel.map((row) => row.sessions);
    expect(reached).toEqual([...reached].sort((a, b) => b - a));
    expect(reached[0]).toBeLessThanOrEqual(clicks.sessions);
    expect(sum(clicks.locales.map((row) => row.sessions))).toBe(clicks.sessions);
  });

  it('serves the services and a day of requests for each day of the window', async () => {
    const health = observabilityDashboardSchema.parse(await repository.observability(week));
    expect(health.services.map((service) => service.id)).toContain('api');
    expect(health.requests.map((day) => day.date).at(-1)).toBe('2026-10-21');
    expect(health.requests.every((day) => day.errors < day.requests)).toBe(true);
  });
});
