import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  dataEnvelopeSchema,
  listEnvelopeSchema,
  workflowBoardQuerySchema,
  workflowBoardSchema,
  workflowInstanceDetailSchema,
  workflowInstanceListQuerySchema,
  workflowInstanceSummarySchema,
  type DataEnvelope,
  type ListEnvelope,
  type WorkflowBoard,
  type WorkflowBoardQuery,
  type WorkflowInstanceDetail,
  type WorkflowInstanceListQuery,
  type WorkflowInstanceSummary,
} from '@huitong/shared';
import { z } from 'zod';

import { RequirePermissions, ServesMockData } from '../../common/decorators/route-metadata.js';
import { WorkflowsService } from './workflows.service.js';

const instanceParams = z.object({ instanceId: z.string().trim().min(1).max(64) });

/** The pipeline board, the instance list and one instance (area 2; typed sample data for now). */
@ApiTags('workflows')
@ServesMockData()
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get('board')
  @RequirePermissions(['workflows:read'])
  @ApiOperation({
    summary: 'The pipeline board: running instances by current step, the most urgent first',
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(workflowBoardSchema) })
  async board(
    @Query({ schema: workflowBoardQuerySchema }) query: WorkflowBoardQuery,
  ): Promise<DataEnvelope<WorkflowBoard>> {
    return { data: await this.workflows.board(query) };
  }

  @Get('instances')
  @RequirePermissions(['workflows:read'])
  @ApiOperation({ summary: 'Workflow instances, newest first, filtered and paginated' })
  @ApiOkResponse({ standardSchema: listEnvelopeSchema(workflowInstanceSummarySchema) })
  async instances(
    @Query({ schema: workflowInstanceListQuerySchema }) query: WorkflowInstanceListQuery,
  ): Promise<ListEnvelope<WorkflowInstanceSummary>> {
    const { items, total } = await this.workflows.instances(query);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  @Get('instances/:instanceId')
  @RequirePermissions(['workflows:read'])
  @ApiOperation({
    summary:
      'One instance: its steps and tasks, the OA approval chain, the draft record and the timeline',
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(workflowInstanceDetailSchema) })
  async instance(
    @Param({ schema: instanceParams }) { instanceId }: z.infer<typeof instanceParams>,
  ): Promise<DataEnvelope<WorkflowInstanceDetail>> {
    return { data: await this.workflows.instance(instanceId) };
  }
}
