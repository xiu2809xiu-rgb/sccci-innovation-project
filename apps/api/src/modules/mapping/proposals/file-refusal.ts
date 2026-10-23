import type { ImportProblem } from '@huitong/shared';

import { ValidationFailedError } from '../../../common/errors/app-error.js';

/**
 * Refuses a whole uploaded file. The English message is for the logs and the
 * API; the problem rides in the details, so the UI can word it in either
 * language and name the column or the limit.
 */
export function refuseFile(problem: ImportProblem, message: string): never {
  throw new ValidationFailedError([{ path: 'file', message, ...problem }], message);
}
