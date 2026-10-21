import {
  consolidationRunDetailSchema,
  consolidationRunSummarySchema,
  dataEnvelopeSchema,
  leaveCategoryMappingSchema,
  listEnvelopeSchema,
  managementReportSchema,
  reportTemplateSchema,
  templatePreviewSchema,
  type ChangeLeaveCategoryMapping,
  type ConsolidationRunSummary,
  type LeaveCategoryMapping,
  type StartConsolidation,
} from '@huitong/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApiClient } from '@/app/providers/dependencies-context';
import type { ApiError } from '@/lib/api-error';
import { toQueryString } from '@/lib/query-string';

/** Every attendance, leave and report query lives under this key. */
export const ATTENDANCE_KEY = ['attendance-leave'] as const;

const runsSchema = listEnvelopeSchema(consolidationRunSummarySchema);
const runSchema = dataEnvelopeSchema(consolidationRunDetailSchema);
const runSummarySchema = dataEnvelopeSchema(consolidationRunSummarySchema);
const rulesSchema = listEnvelopeSchema(leaveCategoryMappingSchema);
const ruleSchema = dataEnvelopeSchema(leaveCategoryMappingSchema);
const templateSchema = dataEnvelopeSchema(reportTemplateSchema);
const previewSchema = dataEnvelopeSchema(templatePreviewSchema);
const reportSchema = dataEnvelopeSchema(managementReportSchema);
const nothing = z.unknown();

/** Whole envelopes, so each page can tell typed sample data (`meta.mock`) from the real thing. */
export function useConsolidationRuns(page: number, pageSize = 25) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'runs', page, pageSize],
    queryFn: ({ signal }) =>
      api.get(`/attendance-leave/runs${toQueryString({ page, pageSize })}`, runsSchema, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useConsolidationRun(runId: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'run', runId],
    queryFn: ({ signal }) =>
      api.get(`/attendance-leave/runs/${encodeURIComponent(runId ?? '')}`, runSchema, { signal }),
    enabled: runId !== null,
  });
}

export function useStartConsolidation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<ConsolidationRunSummary, ApiError, StartConsolidation>({
    mutationFn: async (body) =>
      (await api.post('/attendance-leave/runs', runSummarySchema, { body })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY }),
  });
}

/** Asks for the month's .xlsx; area 3's renderer answers with the file. */
export function useExportRun() {
  const api = useApiClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: (runId) =>
      api.post(`/attendance-leave/runs/${encodeURIComponent(runId)}/export`, nothing),
  });
}

export function useLeaveRules(connectorId: string | undefined, page: number, pageSize = 50) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'rules', connectorId ?? 'all', page, pageSize],
    queryFn: ({ signal }) =>
      api.get(
        `/attendance-leave/category-mappings${toQueryString({ connectorId, page, pageSize })}`,
        rulesSchema,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useChangeLeaveRule() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<
    LeaveCategoryMapping,
    ApiError,
    { mappingId: string; body: ChangeLeaveCategoryMapping }
  >({
    mutationFn: async ({ mappingId, body }) =>
      (
        await api.put(
          `/attendance-leave/category-mappings/${encodeURIComponent(mappingId)}`,
          ruleSchema,
          { body },
        )
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...ATTENDANCE_KEY, 'rules'] }),
  });
}

export function useReportTemplate() {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'template'],
    queryFn: async ({ signal }) =>
      (await api.get('/attendance-leave/template', templateSchema, { signal })).data,
  });
}

export function useTemplatePreview(period: string, page: number, pageSize = 50) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'preview', period, page, pageSize],
    queryFn: ({ signal }) =>
      api.get(
        `/attendance-leave/template/preview${toQueryString({ period, page, pageSize })}`,
        previewSchema,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useManagementReport(period: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, 'management-report', period],
    queryFn: ({ signal }) =>
      api.get(`/reports/management${toQueryString({ period })}`, reportSchema, { signal }),
  });
}
