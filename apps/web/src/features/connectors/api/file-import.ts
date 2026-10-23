import { dataEnvelopeSchema, stagedImportSchema, type SampleEncoding } from '@huitong/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApiClient } from '@/app/providers/dependencies-context';

import { CONNECTORS_KEY } from './connector-queries';

const stagedEnvelope = dataEnvelopeSchema(stagedImportSchema);

export interface StageImportInput {
  file: File;
  /** Only after HR chose a reading of a file whose encoding was uncertain. */
  encoding?: SampleEncoding | undefined;
}

/**
 * Stages a whole export for a file connector, read through its approved
 * mapping. Nothing reaches the master until a sync previews and applies it.
 */
export function useStageImport(connectorId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StageImportInput) => {
      const form = new FormData();
      if (input.encoding) form.append('encoding', input.encoding);
      form.append('file', input.file, input.file.name);
      return (
        await api.post(`/connectors/${connectorId}/import-file`, stagedEnvelope, { body: form })
      ).data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONNECTORS_KEY });
    },
  });
}

/** Discards the staged file, so nothing waits for a preview. */
export function useDiscardImport(connectorId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/connectors/${connectorId}/import-file`, z.undefined()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONNECTORS_KEY });
    },
  });
}
