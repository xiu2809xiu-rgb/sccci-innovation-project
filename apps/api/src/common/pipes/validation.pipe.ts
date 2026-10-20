import { StandardSchemaValidationPipe } from '@nestjs/common';

import { ValidationFailedError } from '../errors/app-error.js';

export interface ValidationIssue {
  path: string;
  message: string;
}

/**
 * Validates every `@Body({ schema })`, `@Query({ schema })` and
 * `@Param({ schema })` against its zod schema from `@huitong/shared`, and
 * reports failures in the error envelope as `{ path, message }` pairs.
 */
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) =>
      new ValidationFailedError(
        issues.map((issue): ValidationIssue => ({
          path: (issue.path ?? [])
            .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
            .join('.'),
          message: issue.message,
        })),
      ),
  });
}
