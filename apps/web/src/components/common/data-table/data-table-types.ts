import type { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export interface DataTableColumn<Row> {
  id: string;
  /** Already translated. */
  header: string;
  /**
   * Cell content. Put a real button or link in the primary column when a row
   * opens a detail view, so keyboard and screen-reader users can reach it.
   */
  cell: (row: Row) => ReactNode;
  sortable?: boolean;
  align?: 'start' | 'end';
  className?: string;
}

export interface DataTablePage {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}
