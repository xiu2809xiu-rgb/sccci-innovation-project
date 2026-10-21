import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  dataEnvelopeSchema,
  managementReportQuerySchema,
  managementReportSchema,
  type DataEnvelope,
  type ManagementReport,
  type ManagementReportQuery,
} from '@huitong/shared';

import { RequirePermissions, ServesMockData } from '../../common/decorators/route-metadata.js';
import { ReportsService } from './reports.service.js';

/** Management reports across both entities (area 3; typed sample data for now). */
@ApiTags('reports')
@ServesMockData()
@Controller('reports')
export class ManagementReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('management')
  @RequirePermissions(['reports:read'])
  @ApiOperation({
    summary:
      'Headcount, attendance, overtime and leave for a month by entity, each figure with the systems it came from',
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(managementReportSchema) })
  async management(
    @Query({ schema: managementReportQuerySchema }) { period }: ManagementReportQuery,
  ): Promise<DataEnvelope<ManagementReport>> {
    return { data: await this.reports.management(period) };
  }
}
