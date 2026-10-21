import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  changeLeaveCategoryMappingSchema,
  dataEnvelopeSchema,
  leaveCategoryMappingListQuerySchema,
  leaveCategoryMappingSchema,
  listEnvelopeSchema,
  type ChangeLeaveCategoryMapping,
  type DataEnvelope,
  type LeaveCategoryMapping,
  type LeaveCategoryMappingListQuery,
  type ListEnvelope,
} from '@huitong/shared';
import type { Request } from 'express';
import { z } from 'zod';

import { RequirePermissions } from '../../common/decorators/route-metadata.js';
import { requestMeta } from '../../common/http/request-meta.js';
import { AttendanceLeaveService } from './attendance-leave.service.js';

const mappingParams = z.object({ mappingId: z.uuid() });

/** The approved leave-category rules, read from the database (area 3). */
@ApiTags('attendance-leave')
@Controller('attendance-leave/category-mappings')
export class LeaveCategoryMappingsController {
  constructor(private readonly attendanceLeave: AttendanceLeaveService) {}

  @Get()
  @RequirePermissions(['attendance:read'])
  @ApiOperation({
    summary: "Each source system's leave codes and the canonical category they count as",
  })
  @ApiOkResponse({ standardSchema: listEnvelopeSchema(leaveCategoryMappingSchema) })
  async list(
    @Query({ schema: leaveCategoryMappingListQuerySchema }) query: LeaveCategoryMappingListQuery,
  ): Promise<ListEnvelope<LeaveCategoryMapping>> {
    const { items, total } = await this.attendanceLeave.mappingRules(query);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  @Put(':mappingId')
  @RequirePermissions(['leave-mappings:manage'])
  @ApiOperation({
    summary:
      'Propose a changed rule, applied once approved and audited. Answers 501 NOT_IMPLEMENTED until area 3 builds the approval',
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(leaveCategoryMappingSchema) })
  async change(
    @Param({ schema: mappingParams }) { mappingId }: z.infer<typeof mappingParams>,
    @Body({ schema: changeLeaveCategoryMappingSchema }) body: ChangeLeaveCategoryMapping,
    @Req() req: Request,
  ): Promise<DataEnvelope<LeaveCategoryMapping>> {
    return { data: await this.attendanceLeave.changeMapping(mappingId, body, requestMeta(req)) };
  }
}
