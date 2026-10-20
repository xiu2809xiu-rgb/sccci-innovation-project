import {
  conflictExplanationSchema,
  conflictSchema,
  dataEnvelopeSchema,
  type Locale,
  type ResolveConflictRequest,
} from '@huitong/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/app/providers/dependencies-context';

import { EMPLOYEE_MASTER_KEY } from './employee-queries';

const conflictEnvelope = dataEnvelopeSchema(conflictSchema);
const explanationEnvelope = dataEnvelopeSchema(conflictExplanationSchema);

/** HR's decision on a conflict. The API audits it; the master and its views refetch afterwards. */
export function useResolveConflict() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conflictId,
      request,
    }: {
      conflictId: string;
      request: ResolveConflictRequest;
    }) =>
      (await api.post(`/conflicts/${conflictId}/resolve`, conflictEnvelope, { body: request }))
        .data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EMPLOYEE_MASTER_KEY }),
  });
}

/** The AI discrepancy explainer: advice for HR, never applied to a record. */
export function useExplainConflict() {
  const api = useApiClient();
  return useMutation({
    mutationFn: async ({ conflictId, language }: { conflictId: string; language: Locale }) =>
      (
        await api.post(`/conflicts/${conflictId}/explain`, explanationEnvelope, {
          body: { language },
        })
      ).data,
  });
}
