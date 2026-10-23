import { importProblemSchema, type ImportProblem } from '@huitong/shared';

import { ApiError } from '@/lib/api-error';

/** Why the API refused a whole file, when it said so in the error's details; otherwise null. */
export function importProblemOf(error: unknown): ImportProblem | null {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_FAILED') return null;
  const details: unknown[] = Array.isArray(error.details) ? error.details : [];
  for (const detail of details) {
    const parsed = importProblemSchema.safeParse(detail);
    if (parsed.success) return parsed.data;
  }
  return null;
}

/**
 * Whether the file itself was refused, so HR has to pick a corrected one. A
 * sync running, a lost connection or a server fault leaves the file as it was.
 */
export function fileRefused(error: unknown): boolean {
  if (importProblemOf(error) !== null) return true;
  return (
    error instanceof ApiError &&
    (error.code === 'SAMPLE_ENCODING_UNSUPPORTED' || error.code === 'PAYLOAD_TOO_LARGE')
  );
}
