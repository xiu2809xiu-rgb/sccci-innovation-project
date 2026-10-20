import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, ScrollRestoration } from 'react-router';

import { useDocumentTitle } from '@/hooks/use-document-title';

import { useAnalytics } from './providers/dependencies-context';
import { useBreadcrumbs, useRoutePattern } from './route-handle';

/** Wraps every route: page-view analytics by route pattern, document title, scroll restoration. */
export function RootRoute() {
  const { t } = useTranslation();
  const analytics = useAnalytics();
  const pattern = useRoutePattern();
  const crumb = useBreadcrumbs().at(-1)?.key;

  useDocumentTitle(crumb ? t(`nav.${crumb}`) : undefined);

  useEffect(() => {
    analytics.pageView(pattern);
  }, [analytics, pattern]);

  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
