import type { SyncError } from '@huitong/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The codes a sync run records. The server keeps its messages in English for
 * the logs, so the UI shows these translations instead; a code added later
 * reads as the generic failure until it is translated here.
 */
const TRANSLATED_CODES = [
  'MAPPING_FAILED',
  'VALIDATION_FAILED',
  'MISSING_EMPLOYEE_NO',
  'INCOMPLETE_RECORD',
  'ENTITY_MISMATCH',
  'INTERRUPTED',
  'UPSTREAM_UNAVAILABLE',
  'SOURCE_CHANGED',
] as const;

type TranslatedCode = (typeof TRANSLATED_CODES)[number];

const isTranslated = (code: string): code is TranslatedCode =>
  (TRANSLATED_CODES as readonly string[]).includes(code);

/** Why a run failed, in the UI language. */
export function useSyncErrorText(): (error: SyncError | undefined) => string {
  const { t } = useTranslation('connectors');
  return useCallback(
    (error: SyncError | undefined) =>
      error && isTranslated(error.code) ? t(`sync.errors.${error.code}`) : t('sync.failed'),
    [t],
  );
}
