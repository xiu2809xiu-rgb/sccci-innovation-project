import {
  dataEnvelopeSchema,
  listEnvelopeSchema,
  mappingProposalSchema,
  type ApproveProposalRequest,
  type EntityCode,
  type Locale,
  type MappingProposalStatus,
  type SampleEncoding,
} from '@huitong/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/app/providers/dependencies-context';
import { toQueryString } from '@/lib/query-string';

import { CONNECTORS_KEY } from './connector-queries';

export const MAPPING_PROPOSALS_KEY = ['mapping-proposals'] as const;

const proposalEnvelope = dataEnvelopeSchema(mappingProposalSchema);
const proposalList = listEnvelopeSchema(mappingProposalSchema);

export interface ProposeMappingInput {
  file: File;
  sourceSystemName: string;
  entityCode?: EntityCode | undefined;
  connectorId?: string | undefined;
  language: Locale;
  /** Only after HR chose a reading of a file whose encoding was uncertain. */
  encoding?: SampleEncoding | undefined;
}

export function useMappingProposals(status?: MappingProposalStatus) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...MAPPING_PROPOSALS_KEY, 'list', status ?? 'all'],
    queryFn: ({ signal }) =>
      api.get(`/mapping-proposals${toQueryString({ status, pageSize: 20 })}`, proposalList, {
        signal,
      }),
  });
}

export function useMappingProposal(proposalId: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...MAPPING_PROPOSALS_KEY, 'detail', proposalId],
    queryFn: async ({ signal }) =>
      (await api.get(`/mapping-proposals/${proposalId ?? ''}`, proposalEnvelope, { signal })).data,
    enabled: proposalId !== null,
  });
}

/** Uploads the sample for an AI proposal. Nothing is saved as a mapping until someone approves it. */
export function useProposeMapping() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProposeMappingInput) => {
      const form = new FormData();
      form.append('sourceSystemName', input.sourceSystemName);
      form.append('language', input.language);
      if (input.entityCode) form.append('entityCode', input.entityCode);
      if (input.connectorId) form.append('connectorId', input.connectorId);
      if (input.encoding) form.append('encoding', input.encoding);
      form.append('file', input.file, input.file.name);
      return (await api.post('/mapping-proposals', proposalEnvelope, { body: form })).data;
    },
    onSuccess: (proposal) => {
      queryClient.setQueryData([...MAPPING_PROPOSALS_KEY, 'detail', proposal.id], proposal);
      void queryClient.invalidateQueries({ queryKey: [...MAPPING_PROPOSALS_KEY, 'list'] });
    },
  });
}

export function useApproveProposal() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proposalId,
      request,
    }: {
      proposalId: string;
      request: ApproveProposalRequest;
    }) =>
      (
        await api.post(`/mapping-proposals/${proposalId}/approve`, proposalEnvelope, {
          body: request,
        })
      ).data,
    onSuccess: async (proposal) => {
      // The reviewed proposal shows its outcome at once, before the lists refetch.
      queryClient.setQueryData([...MAPPING_PROPOSALS_KEY, 'detail', proposal.id], proposal);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...MAPPING_PROPOSALS_KEY, 'list'] }),
        queryClient.invalidateQueries({ queryKey: CONNECTORS_KEY }),
      ]);
    },
  });
}

export function useRejectProposal() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ proposalId, note }: { proposalId: string; note: string }) =>
      (
        await api.post(`/mapping-proposals/${proposalId}/reject`, proposalEnvelope, {
          body: { note },
        })
      ).data,
    onSuccess: (proposal) => {
      queryClient.setQueryData([...MAPPING_PROPOSALS_KEY, 'detail', proposal.id], proposal);
      return queryClient.invalidateQueries({ queryKey: [...MAPPING_PROPOSALS_KEY, 'list'] });
    },
  });
}
