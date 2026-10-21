import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  aiUsageDashboardSchema,
  clickstreamDashboardSchema,
  dashboardQuerySchema,
  dataEnvelopeSchema,
  observabilityDashboardSchema,
  type AiUsageDashboard,
  type ClickstreamDashboard,
  type DashboardQuery,
  type DataEnvelope,
  type ObservabilityDashboard,
} from '@huitong/shared';

import { RequirePermissions, ServesMockData } from '../../../common/decorators/route-metadata.js';
import { AnalyticsDashboardsService } from './analytics-dashboards.service.js';

/** AI usage, clickstream and observability dashboards (area 4; typed sample data for now). */
@ApiTags('analytics')
@ServesMockData()
@Controller('analytics')
export class AnalyticsDashboardsController {
  constructor(private readonly dashboards: AnalyticsDashboardsService) {}

  @Get('ai-usage')
  @RequirePermissions(['ai-usage:read'])
  @ApiOperation({
    summary: 'AI calls, tokens, estimated cost and outcomes by feature, user, model and day',
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(aiUsageDashboardSchema) })
  async aiUsage(
    @Query({ schema: dashboardQuerySchema }) query: DashboardQuery,
  ): Promise<DataEnvelope<AiUsageDashboard>> {
    return { data: await this.dashboards.aiUsage(query) };
  }

  @Get('clickstream')
  @RequirePermissions(['analytics:read'])
  @ApiOperation({
    summary: 'Consented, anonymous use: page views by route pattern, the journey funnel, languages',
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(clickstreamDashboardSchema) })
  async clickstream(
    @Query({ schema: dashboardQuerySchema }) query: DashboardQuery,
  ): Promise<DataEnvelope<ClickstreamDashboard>> {
    return { data: await this.dashboards.clickstream(query) };
  }

  @Get('observability')
  @RequirePermissions(['analytics:read'])
  @ApiOperation({ summary: 'Service health, and requests, errors and p95 latency by day' })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(observabilityDashboardSchema) })
  async observability(
    @Query({ schema: dashboardQuerySchema }) query: DashboardQuery,
  ): Promise<DataEnvelope<ObservabilityDashboard>> {
    return { data: await this.dashboards.observability(query) };
  }
}
