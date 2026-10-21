import {
  AI_FEATURES,
  type AiFeature,
  type AiUsageDashboard,
  type ClickstreamDashboard,
  type FunnelStep,
  type ObservabilityDashboard,
  type Role,
  type ServiceState,
} from '@huitong/shared';

import { windowDates, type DashboardWindow } from '../dashboard-window.js';

/**
 * Typed sample data for the monitoring dashboards, a stable function of the
 * date: a day always shows the same figures, and the 7-day window is the end
 * of the 30-day one. Aggregates only; the names are the seeded demo users.
 * Synthetic demo data only.
 */

/**
 * A number in [0, 1) for a series on a date, so the sample does not change on
 * reload: FNV-1a, then MurmurHash3's finaliser, without which neighbouring
 * dates (which differ in one character) hash to nearly the same value.
 */
function noise(series: string, date: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${series}:${date}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return ((hash ^ (hash >>> 16)) >>> 0) / 2 ** 32;
}

const isWeekend = (date: string): boolean => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

/** A whole number between `low` and `high` for the date; a tenth of it at weekends, when HR is off. */
function daily(series: string, date: string, low: number, high: number): number {
  const value = low + noise(series, date) * (high - low);
  return Math.round(isWeekend(date) ? value / 10 : value);
}

const roundUsd = (value: number): number => Math.round(value * 10_000) / 10_000;

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

/** Splits a whole total by shares; the last part takes the rounding, so the parts add up. */
function split(total: number, shares: readonly number[]): number[] {
  const parts = shares.slice(0, -1).map((share) => Math.round(total * share));
  return [...parts, total - sum(parts)];
}

/** A-52's reference prices, the defaults in `.env.example`, as AiUsageTracker estimates them. */
const PRICE_INPUT_PER_1K_USD = 0.003;
const PRICE_OUTPUT_PER_1K_USD = 0.015;

const costOf = (input: number, output: number): number =>
  (input / 1000) * PRICE_INPUT_PER_1K_USD + (output / 1000) * PRICE_OUTPUT_PER_1K_USD;

/** Calls on a weekday, and the tokens of a typical call, per feature. */
const FEATURE_PROFILE: Readonly<
  Record<AiFeature, { calls: [number, number]; input: number; output: number }>
> = {
  'schema-mapping': { calls: [4, 12], input: 1_650, output: 540 },
  'discrepancy-explainer': { calls: [8, 22], input: 820, output: 230 },
};

/**
 * The seeded demo users who use the AI features, and their share of the
 * calls. Only HR may call them (`mappings:propose`, `conflicts:resolve`), so a
 * system administrator never appears here (separation of duties).
 */
const AI_USERS: readonly { name: string; role: Role; share: number }[] = [
  { name: 'Tan Mei Ling', role: 'HR_SG', share: 0.55 },
  { name: 'Zhou Xinyi', role: 'HR_HQ', share: 0.45 },
];

/** The demo stack's only provider: deterministic and free, but costed at the reference prices. */
const MOCK_MODEL = 'huitong-mock-1';

export function sampleAiUsage(window: DashboardWindow): AiUsageDashboard {
  const dates = windowDates(window);
  const days = dates.map((date) => {
    const features = AI_FEATURES.map((feature) => {
      const profile = FEATURE_PROFILE[feature];
      const calls = daily(`ai:${feature}:calls`, date, ...profile.calls);
      const input =
        calls * Math.round(profile.input * (0.85 + 0.3 * noise(`ai:${feature}:in`, date)));
      const output =
        calls * Math.round(profile.output * (0.85 + 0.3 * noise(`ai:${feature}:out`, date)));
      return { feature, calls, input, output };
    });
    return { date, features };
  });

  const byFeature = AI_FEATURES.map((feature) => {
    const rows = days.flatMap((day) => day.features.filter((row) => row.feature === feature));
    const input = sum(rows.map((row) => row.input));
    const output = sum(rows.map((row) => row.output));
    return { feature, calls: sum(rows.map((row) => row.calls)), input, output };
  });
  const calls = sum(byFeature.map((row) => row.calls));
  const inputTokens = sum(byFeature.map((row) => row.input));
  const outputTokens = sum(byFeature.map((row) => row.output));
  const costUsd = roundUsd(costOf(inputTokens, outputTokens));

  // Only mapping proposals go to HR for approval, so only they can be rejected.
  const mappingCalls = byFeature.find((row) => row.feature === 'schema-mapping')?.calls ?? 0;
  const rejected = Math.round(mappingCalls * 0.09);
  const invalid = Math.round(calls * 0.025);
  const errors = Math.round(calls * 0.008);

  const shares = AI_USERS.map((user) => user.share);
  const userCalls = split(calls, shares);
  const userTokens = split(inputTokens + outputTokens, shares);

  return {
    days: window.days,
    totals: {
      calls,
      inputTokens,
      outputTokens,
      costUsd,
      errorRate: calls === 0 ? 0 : (errors + invalid) / calls,
      medianLatencyMs: 38 + Math.round(14 * noise('ai:latency', dates.at(-1) ?? '')),
    },
    byFeature: byFeature.map((row) => ({
      feature: row.feature,
      calls: row.calls,
      tokens: row.input + row.output,
      costUsd: roundUsd(costOf(row.input, row.output)),
    })),
    byUser: AI_USERS.map((user, index) => ({
      name: user.name,
      role: user.role,
      calls: userCalls[index] ?? 0,
      tokens: userTokens[index] ?? 0,
      costUsd: roundUsd(costUsd * user.share),
    })).sort((a, b) => b.tokens - a.tokens),
    byModel: [
      { provider: 'MOCK', model: MOCK_MODEL, calls, tokens: inputTokens + outputTokens, costUsd },
    ],
    byDay: days.map((day) => {
      const input = sum(day.features.map((row) => row.input));
      const output = sum(day.features.map((row) => row.output));
      return {
        date: day.date,
        inputTokens: input,
        outputTokens: output,
        costUsd: roundUsd(costOf(input, output)),
      };
    }),
    outcomes: [
      { outcome: 'SUCCESS', calls: calls - rejected - invalid - errors },
      { outcome: 'REJECTED', calls: rejected },
      { outcome: 'INVALID_OUTPUT', calls: invalid },
      { outcome: 'ERROR', calls: errors },
    ],
  };
}

/** Each route pattern's share of page views, most viewed first. */
const PAGE_SHARES: readonly (readonly [string, number])[] = [
  ['/overview', 0.22],
  ['/employees', 0.17],
  ['/login', 0.1],
  ['/connectors', 0.08],
  ['/workflows', 0.07],
  ['/attendance-leave', 0.07],
  ['/connectors/:connectorId', 0.06],
  ['/workflows/tasks', 0.05],
  ['/connectors/new-mapping', 0.04],
  ['/reports', 0.04],
  ['/governance', 0.03],
  ['/analytics', 0.02],
  ['/governance/audit', 0.02],
  ['/integration-map', 0.02],
  ['/settings', 0.01],
];

/**
 * The e2e smoke's journey, with the share of the sessions at the step before
 * that reach each step (of all sessions for the first: a few resume without
 * signing in again).
 */
const FUNNEL: readonly { step: FunnelStep; route: string; share: number }[] = [
  { step: 'sign-in', route: '/login', share: 0.93 },
  { step: 'overview', route: '/overview', share: 0.97 },
  { step: 'employees', route: '/employees', share: 0.64 },
  { step: 'new-mapping', route: '/connectors/new-mapping', share: 0.21 },
  { step: 'consolidation', route: '/attendance-leave', share: 0.55 },
];

export function sampleClickstream(window: DashboardWindow): ClickstreamDashboard {
  const days = windowDates(window).map((date) => {
    const sessions = daily('clicks:sessions', date, 14, 26);
    return { sessions, views: Math.round(sessions * (5.5 + 2 * noise('clicks:depth', date))) };
  });
  const sessions = sum(days.map((day) => day.sessions));
  const views = sum(days.map((day) => day.views));

  const pages = PAGE_SHARES.map(([route, share]) => {
    const pageViews = Math.round(views * share);
    const perSession = 1.2 + 0.6 * noise(`clicks:page:${route}`, 'repeat');
    return {
      route,
      views: pageViews,
      sessions: Math.min(sessions, Math.round(pageViews / perSession)),
    };
  });

  let reached = sessions;
  const funnel = FUNNEL.map(({ step, route, share }) => {
    reached = Math.round(reached * share);
    return { step, route, sessions: reached };
  });

  const [english = 0, chinese = 0] = split(sessions, [0.68, 0.32]);

  return {
    days: window.days,
    sessions,
    pageViews: sum(pages.map((page) => page.views)),
    pages,
    funnel,
    locales: [
      { locale: 'en', sessions: english },
      { locale: 'zh-CN', sessions: chinese },
    ],
  };
}

/** The compose stack's services as the health checks would see them; one degraded, to show the state. */
const SERVICES: readonly { id: string; state: ServiceState; latencyMs: number }[] = [
  { id: 'api', state: 'UP', latencyMs: 14 },
  { id: 'postgres', state: 'UP', latencyMs: 3 },
  { id: 'redis', state: 'UP', latencyMs: 1 },
  { id: 'mock-sg-hr', state: 'UP', latencyMs: 22 },
  { id: 'mock-cn-hq', state: 'DEGRADED', latencyMs: 860 },
  { id: 'mock-oa', state: 'UP', latencyMs: 19 },
];

export function sampleObservability(window: DashboardWindow): ObservabilityDashboard {
  return {
    days: window.days,
    services: SERVICES.map((service) => ({ ...service })),
    requests: windowDates(window).map((date) => {
      const requests = daily('obs:requests', date, 3_200, 5_400);
      return {
        date,
        requests,
        errors: Math.round(requests * (0.001 + 0.004 * noise('obs:errors', date))),
        p95Ms: Math.round(170 + 110 * noise('obs:p95', date)),
      };
    }),
  };
}
