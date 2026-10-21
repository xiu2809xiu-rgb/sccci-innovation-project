import { Injectable } from '@nestjs/common';
import {
  MANPOWER_TO_ONBOARDING,
  WORKFLOW_BOARD_COLUMN_LIMIT,
  type PaginationQuery,
  type SlaState,
  type WorkflowBoard,
  type WorkflowBoardQuery,
  type WorkflowInstanceDetail,
  type WorkflowInstanceListQuery,
  type WorkflowInstanceStep,
  type WorkflowInstanceSummary,
  type WorkflowTaskStatus,
  type WorkflowTaskView,
} from '@huitong/shared';

import {
  WorkflowsRepository,
  type Page,
  type WorkflowTaskFilter,
} from '../workflows.repository.js';
import { MOCK_WORKFLOW_INSTANCES, type MockInstance } from './workflow-mock-data.js';

const URGENCY: Readonly<Record<SlaState, number>> = { OVERDUE: 0, DUE_SOON: 1, ON_TRACK: 2 };
const OPEN: ReadonlySet<WorkflowTaskStatus> = new Set(['PENDING', 'IN_PROGRESS', 'BLOCKED']);
const FINISHED: ReadonlySet<WorkflowTaskStatus> = new Set(['DONE', 'SKIPPED']);

/** Ids that share their instance's UUID prefix, so related records read as related. */
function relatedId(instanceId: string, n: number): string {
  return `${instanceId.slice(0, 24)}${n.toString(16).padStart(12, '0')}`;
}

function paginate<T>(items: readonly T[], { page, pageSize }: PaginationQuery): Page<T> {
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length };
}

function matchesSearch(
  instance: WorkflowInstanceSummary,
  { q, entityCode }: WorkflowBoardQuery,
): boolean {
  if (entityCode && instance.entityCode !== entityCode) return false;
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    instance.title.toLowerCase().includes(needle) ||
    instance.source.requestId.toLowerCase().includes(needle)
  );
}

function byUrgency(a: WorkflowInstanceSummary, b: WorkflowInstanceSummary): number {
  return (
    URGENCY[a.sla] - URGENCY[b.sla] ||
    (a.nextAction?.dueAt ?? '').localeCompare(b.nextAction?.dueAt ?? '')
  );
}

function toDetail(instance: MockInstance): WorkflowInstanceDetail {
  const { steps: definitionSteps, ...definition } = MANPOWER_TO_ONBOARDING;
  const steps: WorkflowInstanceStep[] = definitionSteps.map((step, index) => {
    const record = instance.steps[step.key];
    return {
      ...step,
      taskId: record ? relatedId(instance.id, index + 1) : null,
      status: record?.status ?? null,
      dueAt: record?.dueAt ?? null,
      completedAt: record?.completedAt ?? null,
      completedBy: record?.completedBy ?? null,
    };
  });
  const current = steps.find((step) => step.status !== null && !FINISHED.has(step.status));
  return {
    id: instance.id,
    definitionKey: definition.key,
    title: instance.title,
    entityCode: instance.entityCode,
    status: instance.status,
    currentStepKey: current?.key ?? null,
    source: instance.source,
    requestedBy: instance.requestedBy,
    headcount: instance.headcount,
    expectedStartDate: instance.expectedStartDate,
    startedAt: instance.startedAt,
    completedAt: instance.completedAt,
    stepsDone: steps.filter((step) => step.status !== null && FINISHED.has(step.status)).length,
    stepsTotal: steps.length,
    sla: (current && instance.steps[current.key]?.sla) ?? 'ON_TRACK',
    nextAction: current
      ? {
          stepKey: current.key,
          title: current.title,
          titleZh: current.titleZh,
          assigneeRole: current.assigneeRole,
          dueAt: current.dueAt,
        }
      : null,
    definition,
    steps,
    approvalChain: instance.approvalChain,
    draftRecord: instance.draftRecord,
    timeline: instance.timeline.map((item, index) => ({
      id: relatedId(instance.id, 0x100 + index),
      ...item,
    })),
  };
}

function toSummary(detail: WorkflowInstanceDetail): WorkflowInstanceSummary {
  const { definition, steps, approvalChain, draftRecord, timeline, ...summary } = detail;
  return summary;
}

function toTasks(detail: WorkflowInstanceDetail, instance: MockInstance): WorkflowTaskView[] {
  return detail.steps.flatMap((step) => {
    const record = instance.steps[step.key];
    if (!record || step.taskId === null) return [];
    return [
      {
        id: step.taskId,
        instanceId: detail.id,
        instanceTitle: detail.title,
        entityCode: detail.entityCode,
        stepKey: step.key,
        title: step.title,
        titleZh: step.titleZh,
        assigneeRole: step.assigneeRole,
        assignee: record.assignee ?? record.completedBy ?? null,
        status: record.status,
        dueAt: record.dueAt,
        completedAt: record.completedAt ?? null,
        sla: record.sla,
      },
    ];
  });
}

/**
 * Serves the typed sample in workflow-mock-data.ts through the read-model
 * contract. Filtering and paging happen in memory; nothing is stored, so area
 * 2's Prisma repository replaces this class rather than extending it.
 */
@Injectable()
export class MockWorkflowsRepository extends WorkflowsRepository {
  private readonly details = MOCK_WORKFLOW_INSTANCES.map(toDetail);

  private readonly allTasks = MOCK_WORKFLOW_INSTANCES.flatMap((instance, index) => {
    const detail = this.details[index];
    return detail ? toTasks(detail, instance) : [];
  });

  board(query: WorkflowBoardQuery): Promise<WorkflowBoard> {
    const { steps, ...definition } = MANPOWER_TO_ONBOARDING;
    const matching = this.details.map(toSummary).filter((item) => matchesSearch(item, query));
    const open = matching.filter((item) => item.status === 'RUNNING' || item.status === 'WAITING');
    return Promise.resolve({
      definition,
      columns: steps.map((step) => {
        const inColumn = open.filter((item) => item.currentStepKey === step.key).sort(byUrgency);
        return {
          step,
          total: inColumn.length,
          instances: inColumn.slice(0, WORKFLOW_BOARD_COLUMN_LIMIT),
        };
      }),
      recentlyCompleted: matching
        .filter((item) => item.status === 'COMPLETED')
        .slice(0, WORKFLOW_BOARD_COLUMN_LIMIT),
    });
  }

  instances(query: WorkflowInstanceListQuery): Promise<Page<WorkflowInstanceSummary>> {
    const matching = this.details
      .map(toSummary)
      .filter(
        (item) =>
          matchesSearch(item, query) &&
          (!query.status || item.status === query.status) &&
          (!query.stepKey || item.currentStepKey === query.stepKey),
      );
    return Promise.resolve(paginate(matching, query));
  }

  instance(id: string): Promise<WorkflowInstanceDetail | null> {
    return Promise.resolve(this.details.find((detail) => detail.id === id) ?? null);
  }

  tasks(filter: WorkflowTaskFilter): Promise<Page<WorkflowTaskView>> {
    const matching = this.allTasks
      .filter(
        (task) =>
          (!filter.assigneeRole || task.assigneeRole === filter.assigneeRole) &&
          (filter.state === 'all' || (filter.state === 'open') === OPEN.has(task.status)) &&
          (!filter.sla || task.sla === filter.sla),
      )
      .sort(
        (a, b) =>
          Number(FINISHED.has(a.status)) - Number(FINISHED.has(b.status)) ||
          (a.dueAt ?? '').localeCompare(b.dueAt ?? ''),
      );
    return Promise.resolve(paginate(matching, filter));
  }
}
