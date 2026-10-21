import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** The `page` search parameter, at least 1, and a setter that keeps the other parameters. */
export function usePageParam(): [number, (page: number) => void] {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const setPage = useCallback(
    (next: number) => {
      setParams((current) => {
        const updated = new URLSearchParams(current);
        updated.set('page', String(next));
        return updated;
      });
    },
    [setParams],
  );
  return [page, setPage];
}
