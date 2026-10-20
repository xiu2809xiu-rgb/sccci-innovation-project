import { employeeListQuerySchema, employeeNoSchema, type EmployeeListQuery } from '@huitong/shared';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export type EmployeesView = 'all' | 'conflicts';
export type DrawerTab = 'record' | 'conflicts' | 'history';

const DRAWER_TABS: readonly DrawerTab[] = ['record', 'conflicts', 'history'];

/** URL parameter for each list filter; values that do not parse are ignored, never an error. */
const PARAMS = {
  q: 'q',
  entityCode: 'entity',
  departmentCode: 'department',
  employmentStatus: 'status',
  conflicts: 'conflicts',
  sort: 'sort',
  direction: 'dir',
  page: 'page',
} as const satisfies Partial<Record<keyof EmployeeListQuery, string>>;

function parseQuery(params: URLSearchParams): EmployeeListQuery {
  const shape = employeeListQuerySchema.shape;
  const read = (key: keyof typeof PARAMS): unknown => {
    const parsed = shape[key].safeParse(params.get(PARAMS[key]) ?? undefined);
    return parsed.success ? parsed.data : undefined;
  };
  return employeeListQuerySchema.parse({
    q: read('q'),
    entityCode: read('entityCode'),
    departmentCode: read('departmentCode'),
    employmentStatus: read('employmentStatus'),
    conflicts: read('conflicts'),
    sort: read('sort'),
    direction: read('direction'),
    page: read('page'),
  });
}

export type UrlChanges = Partial<
  Record<keyof typeof PARAMS | 'view' | 'employee' | 'tab', string | null>
>;

const URL_KEYS: Record<keyof UrlChanges, string> = {
  ...PARAMS,
  view: 'view',
  employee: 'employee',
  tab: 'tab',
};

/**
 * The Employees page keeps its state in the URL: a filtered list or an open
 * record can be shared, bookmarked and survives a reload (recognition over recall).
 */
export function useEmployeeUrlState() {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseQuery(params), [params]);
  const view: EmployeesView = params.get('view') === 'conflicts' ? 'conflicts' : 'all';
  const employee = employeeNoSchema.safeParse(params.get('employee'));
  const tabParam = params.get('tab');
  const tab = DRAWER_TABS.find((candidate) => candidate === tabParam) ?? 'record';

  const update = useCallback(
    (changes: UrlChanges) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes) as [
            keyof UrlChanges,
            string | null,
          ][]) {
            if (value === null || value === '') next.delete(URL_KEYS[key]);
            else next.set(URL_KEYS[key], value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { query, view, employeeNo: employee.success ? employee.data : null, tab, update };
}
