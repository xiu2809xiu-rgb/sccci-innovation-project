/** HQ's success envelope for a single object. */
export function ok<T>(data: T): { 返回码: '0'; 消息: '成功'; 数据: T } {
  return { 返回码: '0', 消息: '成功', 数据: data };
}

/** HQ's success envelope for a list page, sliced with OData `$top` and `$skip`. */
export function page<T>(
  items: readonly T[],
  top: number,
  skip: number,
): { 返回码: '0'; 消息: '成功'; 数据: { 总数: number; 列表: T[] } } {
  return ok({ 总数: items.length, 列表: items.slice(skip, skip + top) });
}
