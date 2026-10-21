import type {
  AiUsageDashboard,
  ClickstreamDashboard,
  ObservabilityDashboard,
} from '@huitong/shared';

import type { DashboardWindow } from './dashboard-window.js';

/**
 * The three monitoring dashboards' figures for a window. The head start binds
 * MockAnalyticsDashboardsRepository (typed sample data); area 4 replaces it
 * with aggregations over `ai_usage_records` (G-3) and `clickstream_events`
 * (G-2), and with the metrics and health the API exposes (G-1), then removes
 * @ServesMockData() from the controller.
 */
export abstract class AnalyticsDashboardsRepository {
  abstract aiUsage(window: DashboardWindow): Promise<AiUsageDashboard>;

  abstract clickstream(window: DashboardWindow): Promise<ClickstreamDashboard>;

  abstract observability(window: DashboardWindow): Promise<ObservabilityDashboard>;
}
