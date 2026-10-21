import { Module } from '@nestjs/common';

import { MockWorkflowsRepository } from './mock/mock-workflows.repository.js';
import { WorkflowTasksController } from './workflow-tasks.controller.js';
import { WorkflowsController } from './workflows.controller.js';
import { WorkflowsRepository } from './workflows.repository.js';
import { WorkflowsService } from './workflows.service.js';

/**
 * Workflow automation (area 2). The head start binds the read model to typed
 * sample data; area 2 binds its Prisma repository here, and adds the state
 * machine, the `oa.approval.completed` handler and the SLA jobs.
 */
@Module({
  controllers: [WorkflowsController, WorkflowTasksController],
  providers: [
    WorkflowsService,
    { provide: WorkflowsRepository, useClass: MockWorkflowsRepository },
  ],
})
export class WorkflowsModule {}
