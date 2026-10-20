import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { useBreadcrumbs } from '../route-handle';

/** Where am I: the matched routes' crumbs, the last one being the current page. */
export function AppBreadcrumbs() {
  const { t } = useTranslation();
  const crumbs = useBreadcrumbs();
  if (crumbs.length === 0) {
    return null;
  }
  return (
    <Breadcrumb aria-label={t('shell.breadcrumb')}>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const label = t(`nav.${crumb.key}`);
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.pathname}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.pathname}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
