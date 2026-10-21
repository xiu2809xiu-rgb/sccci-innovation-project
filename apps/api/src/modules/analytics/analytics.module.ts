import { Module } from '@nestjs/common';

import { ClickstreamIngestController } from './clickstream-ingest.controller.js';
import { ClickstreamRepository } from './clickstream.repository.js';
import { AnalyticsDashboardsController } from './dashboards/analytics-dashboards.controller.js';
import { AnalyticsDashboardsRepository } from './dashboards/analytics-dashboards.repository.js';
import { AnalyticsDashboardsService } from './dashboards/analytics-dashboards.service.js';
import { MockAnalyticsDashboardsRepository } from './dashboards/mock/mock-analytics-dashboards.repository.js';

/**
 * Clickstream ingestion (area 1) and the monitoring dashboards (area 4). The
 * head start binds the dashboards to typed sample data; area 4 binds the
 * aggregations over the stored events, AI usage and metrics.
 */
@Module({
  controllers: [ClickstreamIngestController, AnalyticsDashboardsController],
  providers: [
    ClickstreamRepository,
    AnalyticsDashboardsService,
    { provide: AnalyticsDashboardsRepository, useClass: MockAnalyticsDashboardsRepository },
  ],
})
export class AnalyticsModule {}
