import { z } from 'zod';

import { aiFeatureSchema, aiOutcomeSchema, aiProviderSchema } from '../ai/usage.js';
import { roleSchema } from '../auth/roles.js';
import { localeSchema } from '../auth/session.js';

/** The window a dashboard covers, in days. */
export const DASHBOARD_WINDOWS = ['7', '30', '90'] as const;

export const dashboardQuerySchema = z.object({
  days: z.enum(DASHBOARD_WINDOWS).default('30'),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

const count = z.number().int().min(0);
const usd = z.number().min(0);

/**
 * AI calls recorded by AiUsageTracker, summarised for the window (story G-3).
 * Costs are estimates at the configured reference prices (A-52), not an invoice.
 */
export const aiUsageDashboardSchema = z.object({
  days: z.number().int().min(1),
  totals: z.object({
    calls: count,
    inputTokens: count,
    outputTokens: count,
    costUsd: usd,
    /**
     * Calls that failed or returned output that failed validation, as a share
     * of all calls, 0 to 1. A proposal HR rejected is not an error.
     */
    errorRate: z.number().min(0).max(1),
    medianLatencyMs: count,
  }),
  byFeature: z.array(
    z.object({ feature: aiFeatureSchema, calls: count, tokens: count, costUsd: usd }),
  ),
  /** Most tokens first. A null name and role are calls a background job made. */
  byUser: z.array(
    z.object({
      name: z.string().nullable(),
      role: roleSchema.nullable(),
      calls: count,
      tokens: count,
      costUsd: usd,
    }),
  ),
  byModel: z.array(
    z.object({
      provider: aiProviderSchema,
      model: z.string(),
      calls: count,
      tokens: count,
      costUsd: usd,
    }),
  ),
  /** Oldest first, one entry per day. */
  byDay: z.array(
    z.object({ date: z.iso.date(), inputTokens: count, outputTokens: count, costUsd: usd }),
  ),
  outcomes: z.array(z.object({ outcome: aiOutcomeSchema, calls: count })),
});

export type AiUsageDashboard = z.infer<typeof aiUsageDashboardSchema>;

/** The e2e smoke's journey, in order: sign in, the overview, the master, an AI mapping, a consolidation. */
export const FUNNEL_STEPS = [
  'sign-in',
  'overview',
  'employees',
  'new-mapping',
  'consolidation',
] as const;

export const funnelStepSchema = z.enum(FUNNEL_STEPS);

export type FunnelStep = z.infer<typeof funnelStepSchema>;

/**
 * First-party clickstream for the window: route patterns and anonymous
 * sessions, never people (story G-2). Sessions without consent send nothing,
 * so they are not counted anywhere.
 */
export const clickstreamDashboardSchema = z.object({
  days: z.number().int().min(1),
  sessions: count,
  pageViews: count,
  /** Most viewed first. */
  pages: z.array(z.object({ route: z.string(), views: count, sessions: count })),
  /** Sessions that reached each step, having passed the steps before it. */
  funnel: z.array(z.object({ step: funnelStepSchema, route: z.string(), sessions: count })),
  /** Sessions by interface language, which shows how much each version is used. */
  locales: z.array(z.object({ locale: localeSchema, sessions: count })),
});

export type ClickstreamDashboard = z.infer<typeof clickstreamDashboardSchema>;

export const SERVICE_STATES = ['UP', 'DEGRADED', 'DOWN'] as const;

export const serviceStateSchema = z.enum(SERVICE_STATES);

export type ServiceState = z.infer<typeof serviceStateSchema>;

/** Health and request metrics for the window (story G-1). */
export const observabilityDashboardSchema = z.object({
  days: z.number().int().min(1),
  services: z.array(
    z.object({
      id: z.string(),
      state: serviceStateSchema,
      latencyMs: count,
    }),
  ),
  /** Oldest first, one entry per day: requests, errors and the 95th-percentile latency. */
  requests: z.array(z.object({ date: z.iso.date(), requests: count, errors: count, p95Ms: count })),
});

export type ObservabilityDashboard = z.infer<typeof observabilityDashboardSchema>;
