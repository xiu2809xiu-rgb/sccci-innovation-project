import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  consolidationRunDetailSchema,
  consolidationRunListQuerySchema,
  consolidationRunSummarySchema,
  dataEnvelopeSchema,
  listEnvelopeSchema,
  startConsolidationSchema,
  type ConsolidationRunDetail,
  type ConsolidationRunListQuery,
  type ConsolidationRunSummary,
  type DataEnvelope,
  type ListEnvelope,
  type StartConsolidation,
} from '@huitong/shared';
import type { Request } from 'express';
import { z } from 'zod';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions, ServesMockData } from '../../common/decorators/route-metadata.js';
import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import { requestMeta } from '../../common/http/request-meta.js';
import { AttendanceLeaveService } from './attendance-leave.service.js';

const runParams = z.object({ runId: z.string().trim().min(1).max(64) });

/** Monthly consolidation runs and their exceptions (area 3; typed sample data for now). */
@ApiTags('attendance-leave')
@ServesMockData()
@Controller('attendance-leave/runs')
export class ConsolidationRunsController {
  constructor(private readonly attendanceLeave: AttendanceLeaveService) {}

  @Get()
  @RequirePermissions(['attendance:read'])
  @ApiOperation({ summary: 'Consolidation runs, newest first, with their exception counts' })
  @ApiOkResponse({ standardSchema: listEnvelopeSchema(consolidationRunSummarySchema) })
  async list(
    @Query({ schema: consolidationRunListQuerySchema }) query: ConsolidationRunListQuery,
  ): Promise<ListEnvelope<ConsolidationRunSummary>> {
    const { items, total } = await this.attendanceLeave.runs(query);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  @Get(':runId')
  @RequirePermissions(['attendance:read'])
  @ApiOperation({
    summary:
      "One run: its sources and the exceptions of the caller's entity, with a count of the rest",
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(consolidationRunDetailSchema) })
  async detail(
    @Param({ schema: runParams }) { runId }: z.infer<typeof runParams>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DataEnvelope<ConsolidationRunDetail>> {
    return { data: await this.attendanceLeave.run(runId, user) };
  }

  @Post()
  @RequirePermissions(['attendance:consolidate'])
  @ApiOperation({
    summary:
      'Consolidate a month from SG HR and CN HQ. Answers 501 NOT_IMPLEMENTED until area 3 builds the engine',
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(consolidationRunSummarySchema) })
  async start(
    @Body({ schema: startConsolidationSchema }) body: StartConsolidation,
    @Req() req: Request,
  ): Promise<DataEnvelope<ConsolidationRunSummary>> {
    return { data: await this.attendanceLeave.startRun(body, requestMeta(req)) };
  }

  @Post(':runId/export')
  @HttpCode(200)
  @RequirePermissions(['reports:export'])
  @ApiOperation({
    summary:
      'The month in the company template as .xlsx, audited and without withheld fields. Answers 501 NOT_IMPLEMENTED until area 3 builds the renderer',
  })
  async export(
    @Param({ schema: runParams }) { runId }: z.infer<typeof runParams>,
    @Req() req: Request,
  ): Promise<never> {
    return this.attendanceLeave.exportRun(runId, requestMeta(req));
  }
}
