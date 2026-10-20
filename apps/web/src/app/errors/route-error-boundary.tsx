import { Bug } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';

import { useAnalytics } from '../providers/dependencies-context';
import { useRoutePattern } from '../route-handle';
import { NotFoundPage } from './not-found-page';

/** Catches render and loader errors for a route so the rest of the app keeps working. */
export function RouteErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError();
  const analytics = useAnalytics();
  const pattern = useRoutePattern();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  useEffect(() => {
    if (!notFound) {
      // Only the route pattern and error class name leave the browser, never the message.
      analytics.error('route.crash', pattern, {
        kind: error instanceof Error ? error.name : 'unknown',
      });
    }
  }, [analytics, error, notFound, pattern]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="p-6">
      <EmptyState
        icon={Bug}
        title={t('states.crash.title')}
        description={t('states.crash.description')}
        action={
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
            >
              {t('actions.refresh')}
            </Button>
            <Button asChild variant="outline">
              <Link to="/overview">{t('actions.goToOverview')}</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
