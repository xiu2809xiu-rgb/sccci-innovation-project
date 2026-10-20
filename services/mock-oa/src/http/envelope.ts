/** OA's success envelope. */
export function ok<T>(data: T): { code: 0; msg: 'ok'; data: T } {
  return { code: 0, msg: 'ok', data };
}

/** OA's list envelope: `data = { total, items }`, paged with `page` and `size`. */
export function page<T>(items: readonly T[], pageNo: number, size: number) {
  const start = (pageNo - 1) * size;
  return ok({ total: items.length, items: items.slice(start, start + size) });
}
