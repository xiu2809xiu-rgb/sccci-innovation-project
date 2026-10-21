import type {
  Role,
  WorkflowBoard,
  WorkflowBoardQuery,
  WorkflowInstanceDetail,
  WorkflowInstanceListQuery,
  WorkflowInstanceSummary,
  WorkflowTaskListQuery,
  WorkflowTaskView,
} from '@huitong/shared';

export interface Page<T> {
  items: T[];
  total: number;
}

/** The task list's filters once the caller's scope is resolved to a role. */
export interface WorkflowTaskFilter extends Omit<WorkflowTaskListQuery, 'scope'> {
  /** Only tasks for this role; undefined for every role. */
  assigneeRole?: Role;
}

/**
 * The workflow read model the controllers depend on. The head start binds
 * MockWorkflowsRepository (typed sample data). Area 2 replaces it with a
 * Prisma-backed repository, binds that in WorkflowsModule, and removes
 * @ServesMockData() from the controllers.
 */
export abstract class WorkflowsRepository {
  abstract board(query: WorkflowBoardQuery): Promise<WorkflowBoard>;

  abstract instances(query: WorkflowInstanceListQuery): Promise<Page<WorkflowInstanceSummary>>;

  /** Null when no instance has this id. */
  abstract instance(id: string): Promise<WorkflowInstanceDetail | null>;

  abstract tasks(filter: WorkflowTaskFilter): Promise<Page<WorkflowTaskView>>;
}
