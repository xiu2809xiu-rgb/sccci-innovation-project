/** One page of a list, with the total across every page (the `{ data, meta }` envelope's source). */
export interface Page<T> {
  items: T[];
  total: number;
}
