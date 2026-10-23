import { describe, expect, it, vi } from 'vitest';

import {
  ImportFileMissingError,
  UpstreamUnavailableError,
} from '../../../common/errors/app-error.js';
import { retryCanHelp, withRetries } from './retry-policy.js';
import { SourceChangedError } from './sync-pipeline.js';

describe('retryCanHelp', () => {
  it('lets a passing fault be tried again, but not one only HR can fix', () => {
    expect(retryCanHelp(new UpstreamUnavailableError('SG HR'))).toBe(true);
    expect(retryCanHelp(new Error('connection reset'))).toBe(true);
    expect(retryCanHelp(new SourceChangedError())).toBe(false);
    expect(retryCanHelp(new ImportFileMissingError('my-hr'))).toBe(false);
  });
});

describe('withRetries', () => {
  it('tries again after a failure, and gives up after the last attempt', async () => {
    const flaky = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('blip'))
      .mockResolvedValueOnce('recorded');
    await expect(withRetries(flaky, 2)).resolves.toBe('recorded');
    expect(flaky).toHaveBeenCalledTimes(2);

    const broken = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('down'));
    await expect(withRetries(broken, 2)).rejects.toThrow('down');
    expect(broken).toHaveBeenCalledTimes(2);
  });
});
