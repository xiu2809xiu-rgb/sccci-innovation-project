import { ImportFileMissingError } from '../../../common/errors/app-error.js';
import { SourceChangedError } from './sync-pipeline.js';

/**
 * Whether running a failed sync again could help. A source that changed after
 * its preview, or a staged file that is gone, needs HR: a retry would only
 * fail again, and keep the connector blocked while it waits.
 */
export function retryCanHelp(error: unknown): boolean {
  return !(error instanceof SourceChangedError || error instanceof ImportFileMissingError);
}

/**
 * Runs `action`, trying again after a short pause when it throws, up to
 * `attempts` times: for bookkeeping that must not be skipped once the work it
 * records is done.
 */
export async function withRetries<T>(action: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
}
