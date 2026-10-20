/** SG HR's list envelope. */
export interface SgPage<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Slices one page out of an already sorted list. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): SgPage<T> {
  const start = (page - 1) * pageSize;
  return { data: items.slice(start, start + pageSize), page, pageSize, total: items.length };
}
