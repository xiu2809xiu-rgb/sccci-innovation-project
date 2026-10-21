import { Injectable } from '@nestjs/common';
import type {
  AiUsageDashboard,
  ClickstreamDashboard,
  DashboardQuery,
  ObservabilityDashboard,
} from '@huitong/shared';

import { AnalyticsDashboardsRepository } from './analytics-dashboards.repository.js';
import { dashboardWindow } from './dashboard-window.js';

/** The monitoring dashboards (area 4): each one for the last 7, 30 or 90 days. */
@Injectable()
export class AnalyticsDashboardsService {
  constructor(private readonly dashboards: AnalyticsDashboardsRepository) {}

  aiUsage(query: DashboardQuery, now = new Date()): Promise<AiUsageDashboard> {
    return this.dashboards.aiUsage(dashboardWindow(Number(query.days), now));
  }

  clickstream(query: DashboardQuery, now = new Date()): Promise<ClickstreamDashboard> {
    return this.dashboards.clickstream(dashboardWindow(Number(query.days), now));
  }

  observability(query: DashboardQuery, now = new Date()): Promise<ObservabilityDashboard> {
    return this.dashboards.observability(dashboardWindow(Number(query.days), now));
  }
}
