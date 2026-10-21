import {
  dataEnvelopeSchema,
  listEnvelopeSchema,
  workflowBoardSchema,
  workflowInstanceDetailSchema,
  workflowTaskViewSchema,
  type CompleteWorkflowTask,
  type SlaState,
  type WorkflowTaskScope,
  type WorkflowTaskState,
} from '@huitong/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/app/providers/dependencies-context';
import { toQueryString } from '@/lib/query-string';

/** Every workflow query lives under this key. */
export const WORKFLOWS_KEY = ['workflows'] as const;

const boardSchema = dataEnvelopeSchema(workflowBoardSchema);
const instanceSchema = dataEnvelopeSchema(workflowInstanceDetailSchema);
const tasksSchema = listEnvelopeSchema(workflowTaskViewSchema);
const taskSchema = dataEnvelopeSchema(workflowTaskViewSchema);

/** The whole envelope, so a page can tell typed sample data (`meta.mock`) from the real thing. */
export function useWorkflowBoard(q: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...WORKFLOWS_KEY, 'board', q ?? ''],
    queryFn: ({ signal }) =>
      api.get(`/workflows/board${toQueryString({ q })}`, boardSchema, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useWorkflowInstance(instanceId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...WORKFLOWS_KEY, 'instance', instanceId],
    queryFn: ({ signal }) =>
      api.get(`/workflows/instances/${encodeURIComponent(instanceId)}`, instanceSchema, { signal }),
  });
}

export interface TaskListParams {
  scope: WorkflowTaskScope;
  state: WorkflowTaskState;
  sla?: SlaState;
  page: number;
  pageSize: number;
}

export function useWorkflowTasks(params: TaskListParams) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...WORKFLOWS_KEY, 'tasks', params],
    queryFn: ({ signal }) =>
      api.get(`/workflows/tasks${toQueryString({ ...params })}`, tasksSchema, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** Completes a task; the board, the instance and the lists refetch afterwards. */
export function useCompleteTask() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, body }: { taskId: string; body: CompleteWorkflowTask }) =>
      (
        await api.post(`/workflows/tasks/${encodeURIComponent(taskId)}/complete`, taskSchema, {
          body,
        })
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}
