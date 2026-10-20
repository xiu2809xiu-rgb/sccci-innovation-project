import { AlertTriangle, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/utils';

import { CopyButton } from './copy-button';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

/**
 * A failed load: what went wrong in plain words, a retry, and the trace ID
 * support can look up in the logs (Nielsen: help users recover from errors).
 */
export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation();
  const apiError = error instanceof ApiError ? error : null;
  const message = apiError ? t(`errors.${apiError.code}`) : t('states.error.description');

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-lg border border-danger-border bg-danger-subtle p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">{t('states.error.title')}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
          {apiError?.traceId ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{t('states.error.traceId')}:</span>
              <code className="font-mono">{apiError.traceId}</code>
              <CopyButton value={apiError.traceId} label={t('states.error.copyTraceId')} />
            </p>
          ) : null}
        </div>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" data-icon="inline-start" />
          {t('actions.retry')}
        </Button>
      ) : null}
    </div>
  );
}
