import { DatabaseZap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

/** Shown until the first sync fills the employee master: what is missing and the one step to fix it. */
export function FirstRunCallout({ canOpenConnectors }: { canOpenConnectors: boolean }) {
  const { t } = useTranslation('overview');
  return (
    <section
      aria-labelledby="first-run-title"
      className="flex flex-col gap-4 rounded-lg border border-info-border bg-info-subtle p-5 sm:flex-row sm:items-center"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-info">
        <DatabaseZap className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 id="first-run-title" className="text-md font-semibold text-foreground">
          {t('firstRun.title')}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">{t('firstRun.description')}</p>
      </div>
      {canOpenConnectors ? (
        <Button asChild>
          <Link to="/connectors">{t('firstRun.action')}</Link>
        </Button>
      ) : null}
    </section>
  );
}
