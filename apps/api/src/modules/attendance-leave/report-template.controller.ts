import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  dataEnvelopeSchema,
  reportTemplateSchema,
  templatePreviewQuerySchema,
  templatePreviewSchema,
  type DataEnvelope,
  type ReportTemplate,
  type TemplatePreview,
  type TemplatePreviewQuery,
} from '@huitong/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions, ServesMockData } from '../../common/decorators/route-metadata.js';
import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import { AttendanceLeaveService } from './attendance-leave.service.js';

/** The company reporting template (real) and a month rendered in it (area 3; sample rows for now). */
@ApiTags('attendance-leave')
@Controller('attendance-leave/template')
export class ReportTemplateController {
  constructor(private readonly attendanceLeave: AttendanceLeaveService) {}

  @Get()
  @RequirePermissions(['attendance:read'])
  @ApiOperation({
    summary: "The active version of the company's monthly attendance and leave template",
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(reportTemplateSchema) })
  async template(): Promise<DataEnvelope<ReportTemplate>> {
    return { data: await this.attendanceLeave.template() };
  }

  @Get('preview')
  @ServesMockData()
  @RequirePermissions(['attendance:read'])
  @ApiOperation({
    summary: "A month in the template, the caller's entity's rows, before any export",
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(templatePreviewSchema) })
  async preview(
    @Query({ schema: templatePreviewQuerySchema }) query: TemplatePreviewQuery,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DataEnvelope<TemplatePreview>> {
    return { data: await this.attendanceLeave.preview(query, user) };
  }
}
