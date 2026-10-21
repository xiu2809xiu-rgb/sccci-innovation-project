import {
  accessMatrixSchema,
  auditEventViewSchema,
  chainVerificationSchema,
  classificationEntrySchema,
  dataEnvelopeSchema,
  listEnvelopeSchema,
  retentionPolicySchema,
  transferEntrySchema,
  type ChainVerificationView,
  type ChangeTransferStatus,
  type TransferEntry,
} from '@huitong/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/app/providers/dependencies-context';
import type { ApiError } from '@/lib/api-error';
import { toQueryString } from '@/lib/query-string';

/** Every governance and audit query lives under this key. */
export const GOVERNANCE_KEY = ['governance'] as const;

const matrixSchema = dataEnvelopeSchema(accessMatrixSchema);
const classificationsSchema = listEnvelopeSchema(classificationEntrySchema);
const transfersSchema = listEnvelopeSchema(transferEntrySchema);
const transferSchema = dataEnvelopeSchema(transferEntrySchema);
const retentionSchema = listEnvelopeSchema(retentionPolicySchema);
const eventsSchema = listEnvelopeSchema(auditEventViewSchema);
const verificationSchema = dataEnvelopeSchema(chainVerificationSchema);

/** The live access policy, as the guard enforces it. */
export function useAccessMatrix() {
  const api = useApiClient();
  return useQuery({
    queryKey: [...GOVERNANCE_KEY, 'access'],
    queryFn: ({ signal }) => api.get('/governance/access', matrixSchema, { signal }),
  });
}

export function useClassifications(page: number, pageSize = 50) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...GOVERNANCE_KEY, 'classifications', page, pageSize],
    queryFn: ({ signal }) =>
      api.get(
        `/governance/classifications${toQueryString({ page, pageSize })}`,
        classificationsSchema,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useTransfers(page: number, pageSize = 25) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...GOVERNANCE_KEY, 'transfers', page, pageSize],
    queryFn: ({ signal }) =>
      api.get(`/governance/transfers${toQueryString({ page, pageSize })}`, transfersSchema, {
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

/** Approves, suspends or expires an entry; area 4's service answers it (F-4). */
export function useChangeTransferStatus() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<TransferEntry, ApiError, { transferId: string; body: ChangeTransferStatus }>({
    mutationFn: async ({ transferId, body }) =>
      (
        await api.put(
          `/governance/transfers/${encodeURIComponent(transferId)}/status`,
          transferSchema,
          { body },
        )
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY }),
  });
}

export function useRetention(page: number, pageSize = 50) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...GOVERNANCE_KEY, 'retention', page, pageSize],
    queryFn: ({ signal }) =>
      api.get(`/governance/retention${toQueryString({ page, pageSize })}`, retentionSchema, {
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

/** The audit viewer's filters as the API takes them: `from` and `to` are instants. */
export interface AuditEventFilters {
  entityType?: string | undefined;
  entityId?: string | undefined;
  actorUserId?: string | undefined;
  action?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export function useAuditEvents(filters: AuditEventFilters, page: number, pageSize = 25) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...GOVERNANCE_KEY, 'audit', filters, page, pageSize],
    queryFn: ({ signal }) =>
      api.get(`/audit/events${toQueryString({ ...filters, page, pageSize })}`, eventsSchema, {
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

/** Recomputes the hash chain on request; it reads the whole log, so it never runs by itself. */
export function useVerifyChain() {
  const api = useApiClient();
  return useMutation<ChainVerificationView, ApiError>({
    mutationFn: async () => (await api.get('/audit/verify', verificationSchema)).data,
  });
}
