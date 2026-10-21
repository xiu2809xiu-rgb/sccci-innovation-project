import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  completeWorkflowTaskSchema,
  dataEnvelopeSchema,
  listEnvelopeSchema,
  workflowTaskListQuerySchema,
  workflowTaskViewSchema,
  type CompleteWorkflowTask,
  type DataEnvelope,
  type ListEnvelope,
  type WorkflowTaskListQuery,
  type WorkflowTaskView,
} from '@huitong/shared';
import type { Request } from 'express';
import { z } from 'zod';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions, ServesMockData } from '../../common/decorators/route-metadata.js';
import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import { requestMeta } from '../../common/http/request-meta.js';
import { WorkflowsService } from './workflows.service.js';

const taskParams = z.object({ taskId: z.string().trim().min(1).max(64) });

/** Tasks for the caller's role, and completing one (area 2; typed sample data for now). */
@ApiTags('workflows')
@ServesMockData()
@Controller('workflows/tasks')
export class WorkflowTasksController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get()
  @RequirePermissions(['workflows:tasks'])
  @ApiOperation({
    summary:
      "Tasks for the caller's role (scope=mine), or every task for roles that manage workflows",
  })
  @ApiOkResponse({ standardSchema: listEnvelopeSchema(workflowTaskViewSchema) })
  async list(
    @Query({ schema: workflowTaskListQuerySchema }) query: WorkflowTaskListQuery,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListEnvelope<WorkflowTaskView>> {
    const { items, total } = await this.workflows.tasks(query, user);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  @Post(':taskId/complete')
  @HttpCode(200)
  @RequirePermissions(['workflows:tasks'])
  @ApiOperation({
    summary:
      'Complete a task and move its workflow on, audited. Answers 501 NOT_IMPLEMENTED until area 2 builds the state machine',
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(workflowTaskViewSchema) })
  async complete(
    @Param({ schema: taskParams }) { taskId }: z.infer<typeof taskParams>,
    @Body({ schema: completeWorkflowTaskSchema }) body: CompleteWorkflowTask,
    @Req() req: Request,
  ): Promise<DataEnvelope<WorkflowTaskView>> {
    return { data: await this.workflows.completeTask(taskId, body, requestMeta(req)) };
  }
}
