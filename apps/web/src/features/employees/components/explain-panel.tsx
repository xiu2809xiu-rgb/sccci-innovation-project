import { localeSchema } from '@huitong/shared';
import { Sparkles } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/common/error-state';
import { StatusBadge } from '@/components/common/status-badge';
import { ThoughtLine } from '@/components/reactbits/thought-line';
import { Button } from '@/components/ui/button';
import { useFormatters } from '@/hooks/use-formatters';

import { useExplainConflict } from '../api/conflict-mutations';

/**
 * Asks the AI discrepancy explainer about a conflict, in the UI language.
 * The answer is labelled as advice that needs HR's decision; nothing is
 * changed from it (CLAUDE.md section 8, GRS visible in the UI).
 */
export function ExplainPanel({ conflictId }: { conflictId: string }) {
  const { t, i18n } = useTranslation('employees');
  const format = useFormatters();
  const explain = useExplainConflict();
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined);
  // Stable, so the ticking timer in ThoughtLine does not restart on every render.
  const formatElapsed = useCallback((ms: number) => format.elapsed(ms), [format]);
  const language = localeSchema.catch('en').parse(i18n.language);

  const ask = () => {
    const startedAt = performance.now();
    setDurationMs(undefined);
    explain.mutate(
      { conflictId, language },
      {
        onSettled: () => {
          setDurationMs(performance.now() - startedAt);
        },
      },
    );
  };

  if (explain.isIdle) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={ask}>
        <Sparkles aria-hidden="true" data-icon="inline-start" />
        {t('explain.action')}
      </Button>
    );
  }
  if (explain.isError) {
    return <ErrorState error={explain.error} onRetry={ask} />;
  }

  return (
    <section
      aria-label={t('explain.label')}
      className="space-y-2 rounded-lg border border-border bg-muted/40 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ThoughtLine
          label={t('explain.working')}
          doneLabel={t('explain.done')}
          working={explain.isPending}
          formatElapsed={formatElapsed}
          {...(durationMs === undefined ? {} : { elapsedMs: durationMs })}
        />
        <StatusBadge tone="info">{t('explain.requiresDecision')}</StatusBadge>
      </div>
      {explain.data ? (
        <p
          className="max-w-prose text-sm leading-relaxed text-foreground"
          lang={explain.data.language}
        >
          {explain.data.text}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {t('explain.adviceOnly')}
        {explain.data
          ? ` ${t('explain.model', {
              provider: t(`explain.providers.${explain.data.provider}`),
              model: explain.data.model,
            })}`
          : null}
      </p>
    </section>
  );
}
