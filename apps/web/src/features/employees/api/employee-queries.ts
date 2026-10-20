import {
  conflictSchema,
  dataEnvelopeSchema,
  employeeDetailSchema,
  employeeSummarySchema,
  listEnvelopeSchema,
  REALTIME_EVENTS,
  type EmployeeListQuery,
} from '@huitong/shared';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient, useRealtimeEvents } from '@/app/providers/dependencies-context';
import { toQueryString } from '@/lib/query-string';

/** Every employee-master query lives under this key, so one invalidation refreshes them all. */
export const EMPLOYEE_MASTER_KEY = ['employee-master'] as const;

const listSchema = listEnvelopeSchema(employeeSummarySchema);
const detailSchema = dataEnvelopeSchema(employeeDetailSchema);
const conflictListSchema = listEnvelopeSchema(conflictSchema);

/** Live events after which the master may differ. They carry ids only; data is refetched masked. */
const MASTER_EVENTS: ReadonlySet<string> = new Set([
  REALTIME_EVENTS.syncCompleted,
  REALTIME_EVENTS.conflictDetected,
  REALTIME_EVENTS.conflictResolved,
]);

/** Refetches the employee master while mounted whenever a sync or a conflict decision changes it. */
export function useLiveEmployeeMaster(): void {
  const queryClient = useQueryClient();
  useRealtimeEvents((event) => {
    if (MASTER_EVENTS.has(event.type)) {
      void queryClient.invalidateQueries({ queryKey: EMPLOYEE_MASTER_KEY });
    }
  });
}

/** One page of the employee list. The previous page stays on screen while the next loads. */
export function useEmployees(query: EmployeeListQuery) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...EMPLOYEE_MASTER_KEY, 'list', query],
    queryFn: ({ signal }) =>
      api.get(`/employees${toQueryString({ ...query })}`, listSchema, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** One record with every source, its conflicts and its history, masked for the caller's role. */
export function useEmployee(employeeNo: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...EMPLOYEE_MASTER_KEY, 'detail', employeeNo],
    queryFn: async ({ signal }) =>
      (await api.get(`/employees/${employeeNo ?? ''}`, detailSchema, { signal })).data,
    enabled: employeeNo !== null,
  });
}

/** Open conflicts across the master, newest first. */
export function useOpenConflicts(pageSize = 50) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...EMPLOYEE_MASTER_KEY, 'conflicts', pageSize],
    queryFn: ({ signal }) =>
      api.get(`/conflicts${toQueryString({ status: 'OPEN', pageSize })}`, conflictListSchema, {
        signal,
      }),
  });
}
