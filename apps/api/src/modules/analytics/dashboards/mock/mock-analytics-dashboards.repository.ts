import { Injectable } from '@nestjs/common';
import type {
  AiUsageDashboard,
  ClickstreamDashboard,
  ObservabilityDashboard,
} from '@huitong/shared';

import { AnalyticsDashboardsRepository } from '../analytics-dashboards.repository.js';
import type { DashboardWindow } from '../dashboard-window.js';
import { sampleAiUsage, sampleClickstream, sampleObservability } from './dashboard-mock-data.js';

/** Serves the typed sample in dashboard-mock-data.ts; area 4's repository replaces it. */
@Injectable()
export class MockAnalyticsDashboardsRepository extends AnalyticsDashboardsRepository {
  aiUsage(window: DashboardWindow): Promise<AiUsageDashboard> {
    return Promise.resolve(sampleAiUsage(window));
  }

  clickstream(window: DashboardWindow): Promise<ClickstreamDashboard> {
    return Promise.resolve(sampleClickstream(window));
  }

  observability(window: DashboardWindow): Promise<ObservabilityDashboard> {
    return Promise.resolve(sampleObservability(window));
  }
}
