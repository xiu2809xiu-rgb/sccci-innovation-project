import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from './error-state';

export interface QueryViewProps<T> {
  query: UseQueryResult<T>;
  /** Shown while loading; shaped like the content so nothing jumps when it arrives. */
  skeleton: ReactNode;
  isEmpty?: (data: T) => boolean;
  /** Shown when `isEmpty` returns true; should offer a next step. */
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}

/**
 * Renders a query's loading, error, empty and success states the same way
 * everywhere, so no data view forgets one (CLAUDE.md section 8, "States").
 */
export function QueryView<T>({ query, skeleton, isEmpty, empty, children }: QueryViewProps<T>) {
  const { t } = useTranslation();

  if (query.status === 'pending') {
    return (
      <div aria-busy="true">
        {skeleton}
        <span className="sr-only" role="status">
          {t('states.loading')}
        </span>
      </div>
    );
  }
  if (query.status === 'error') {
    return (
      <ErrorState
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  if (empty !== undefined && isEmpty?.(query.data) === true) {
    return empty;
  }
  return children(query.data);
}
