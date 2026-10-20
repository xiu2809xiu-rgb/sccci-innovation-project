import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/ui/skeleton';

/** Shown while a lazily loaded page's code arrives: the page anatomy in skeleton form. */
export function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only" role="status">
        {t('states.loading')}
      </span>
      <div className="space-y-2 border-b border-border pb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
