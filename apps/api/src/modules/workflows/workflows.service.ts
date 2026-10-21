import { Injectable } from '@nestjs/common';
import type {
  CompleteWorkflowTask,
  WorkflowBoard,
  WorkflowBoardQuery,
  WorkflowInstanceDetail,
  WorkflowInstanceListQuery,
  WorkflowInstanceSummary,
  WorkflowTaskListQuery,
  WorkflowTaskView,
} from '@huitong/shared';

import {
  ForbiddenError,
  NotFoundError,
  NotImplementedError,
} from '../../common/errors/app-error.js';
import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import type { RequestMeta } from '../../common/http/request-meta.js';
import { AccessPolicyService } from '../access/access-policy.service.js';
import { WorkflowsRepository, type Page } from './workflows.repository.js';

/**
 * Workflow use cases. The reads are complete against the read-model contract;
 * the commands are area 2's to implement with the state machine.
 */
@Injectable()
export class WorkflowsService {
  constructor(
    private readonly repository: WorkflowsRepository,
    private readonly access: AccessPolicyService,
  ) {}

  board(query: WorkflowBoardQuery): Promise<WorkflowBoard> {
    return this.repository.board(query);
  }

  instances(query: WorkflowInstanceListQuery): Promise<Page<WorkflowInstanceSummary>> {
    return this.repository.instances(query);
  }

  async instance(id: string): Promise<WorkflowInstanceDetail> {
    const instance = await this.repository.instance(id);
    if (!instance) throw new NotFoundError('The workflow instance');
    return instance;
  }

  /** `mine` lists the caller's role's tasks; `all` is for roles that manage workflows. */
  tasks(query: WorkflowTaskListQuery, viewer: AuthenticatedUser): Promise<Page<WorkflowTaskView>> {
    const { scope, ...filter } = query;
    if (scope === 'mine') {
      return this.repository.tasks({ ...filter, assigneeRole: viewer.role });
    }
    if (!this.access.hasPermission(viewer.role, 'workflows:manage')) {
      throw new ForbiddenError('Only roles that manage workflows can list every task');
    }
    return this.repository.tasks(filter);
  }

  /**
   * Completes a task and moves its instance on (story C-6). Area 2 implements
   * it with the state machine: refuse an illegal transition, start the next
   * step, write the audit event and publish the lifecycle event.
   */
  completeTask(
    _taskId: string,
    _body: CompleteWorkflowTask,
    _meta: RequestMeta,
  ): Promise<WorkflowTaskView> {
    return Promise.reject(new NotImplementedError('Completing a workflow task', 'area 2 (C-6)'));
  }
}
