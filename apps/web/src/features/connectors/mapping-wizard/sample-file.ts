import type { EntityCode } from '@huitong/shared';

/** The API refuses larger samples; a sample needs only a handful of rows. */
const MAX_BYTES = 1_000_000;

/** The bundled synthetic export, for trying the assistant without a file of one's own. */
export const SAMPLE = {
  url: '/samples/organisation-e-malaysia-hr-export.csv',
  file: 'organisation-e-malaysia-hr-export.csv',
  system: 'Organisation E Malaysia HR',
  entity: 'MY01' as EntityCode,
};

export type FileProblem = 'missing' | 'type' | 'size';

/** What stops a file from being sent, checked before upload so the user hears at once. */
export function fileProblem(file: File | null): FileProblem | null {
  if (!file) return 'missing';
  if (!/\.(csv|xlsx)$/i.test(file.name)) return 'type';
  return file.size > MAX_BYTES ? 'size' : null;
}
