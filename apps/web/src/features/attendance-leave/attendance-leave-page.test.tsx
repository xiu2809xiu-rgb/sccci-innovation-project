import {
  COMPANY_MONTHLY_TEMPLATE,
  DEFAULT_ROLE_PERMISSIONS,
  type ConsolidationRunDetail,
  type LeaveCategoryMapping,
  type ManagementReport,
  type Role,
  type TemplatePreview,
} from '@huitong/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

// A fixed "now", so the months on offer are always the same; timers and animations stay real.
vi.mock('@/hooks/use-now', () => ({ useNow: () => new Date('2026-10-21T02:00:00Z') }));

const SAMPLE = { mock: true } as const;

const SEPTEMBER: ConsolidationRunDetail = {
  id: 'run-september',
  period: '2026-09',
  entityCodes: ['SG01', 'CN01'],
  status: 'NEEDS_REVIEW',
  employeeCount: 117,
  recordCount: 2617,
  exceptionCount: 5,
  openExceptionCount: 5,
  triggeredBy: 'Tan Mei Ling',
  startedAt: '2026-10-02T01:00:00Z',
  finishedAt: '2026-10-02T01:02:40Z',
  exportable: false,
  sources: [{ connectorId: 'sg-hr', entityCode: 'SG01', attendanceRows: 1074, leaveRecords: 21 }],
  exceptions: [
    {
      id: 'exception-1',
      type: 'LEAVE_PENDING',
      employeeNo: 'E100061',
      employeeName: 'Koh Wen Tao',
      entityCode: 'SG01',
      details: {
        connectorId: 'sg-hr',
        sourceRecordId: 'LV-SG-000055',
        sourceCategory: 'AL',
        sourceLabel: 'Annual Leave',
        startDate: '2026-09-24',
        endDate: '2026-09-28',
        daysInPeriod: 3,
      },
      resolved: false,
      resolution: null,
    },
  ],
  withheldExceptionCount: 2,
};

const RULE: LeaveCategoryMapping = {
  id: '0199a3b1-0c40-7e21-9f3a-000000000001',
  connectorId: 'cn-hq',
  sourceCategory: 'NJ',
  sourceLabel: '年假',
  canonicalCategory: 'ANNUAL',
  templateColumn: 'Annual leave (days)',
  status: 'ACTIVE',
  version: 1,
  updatedAt: '2026-10-20T00:00:00Z',
};

const PREVIEW: TemplatePreview = {
  template: COMPANY_MONTHLY_TEMPLATE,
  period: '2026-09',
  entityCode: 'SG01',
  rows: [
    {
      employeeNo: 'E100006',
      values: {
        employeeNo: 'E100006',
        name: 'Arjun Menon',
        entity: 'SG01',
        department: 'WM',
        ANNUAL: 4,
      },
      exceptionCount: 0,
    },
    {
      employeeNo: 'E100061',
      values: { employeeNo: 'E100061', name: 'Koh Wen Tao', entity: 'SG01', department: 'RISK' },
      exceptionCount: 1,
    },
  ],
  total: 2,
};

const REPORT: ManagementReport = {
  period: '2026-09',
  generatedAt: '2026-10-02T01:02:40Z',
  entities: [
    {
      entityCode: 'SG01',
      headcount: { value: 49, sources: ['sg-hr'] },
      workingDays: 22,
      attendanceRate: { value: 99.1, sources: ['sg-hr'] },
      overtimeHours: { value: 460.3, sources: ['sg-hr'] },
      leaveDays: [{ category: 'ANNUAL', days: 17, sources: ['sg-hr'] }],
    },
  ],
};

function routesFor(role: Role, extra: FakeRoutes = {}): FakeRoutes {
  const { exceptions, sources, withheldExceptionCount, ...summary } = SEPTEMBER;
  return {
    'GET /auth/me': { body: { data: sessionFor(role, [...DEFAULT_ROLE_PERMISSIONS[role]]) } },
    'GET /attendance-leave/runs': {
      body: { data: [summary], meta: { page: 1, pageSize: 25, total: 1, ...SAMPLE } },
    },
    'GET /attendance-leave/runs/run-september': { body: { data: SEPTEMBER, meta: SAMPLE } },
    'GET /attendance-leave/category-mappings': {
      body: { data: [RULE], meta: { page: 1, pageSize: 50, total: 1 } },
    },
    'PUT /attendance-leave/category-mappings/0199a3b1-0c40-7e21-9f3a-000000000001': {
      status: 501,
      body: { error: { code: 'NOT_IMPLEMENTED', message: 'not yet', traceId: 'trace-1' } },
    },
    'GET /attendance-leave/template/preview': { body: { data: PREVIEW, meta: SAMPLE } },
    'GET /reports/management': { body: { data: REPORT, meta: SAMPLE } },
    ...extra,
  };
}

describe('Attendance and leave', () => {
  it("opens the newest run with the caller's exceptions, and says how many are withheld", async () => {
    renderApp('/attendance-leave', routesFor('HR_SG'));
    expect(await screen.findByRole('link', { name: 'September 2026' })).toBeInTheDocument();
    const exceptions = await screen.findByRole('region', { name: 'Exceptions' });
    expect(within(exceptions).getByRole('link', { name: /Koh Wen Tao/ })).toBeInTheDocument();
    expect(
      within(exceptions).getByText(/Annual Leave \(AL\).*waiting for approval/),
    ).toBeInTheDocument();
    expect(
      within(exceptions).getByText(/2 exceptions for another entity are not shown/),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sample data' })).toBeInTheDocument();
  });

  it('explains why a run cannot be started or exported on sample data', async () => {
    renderApp('/attendance-leave', routesFor('HR_SG'));
    expect(await screen.findByRole('button', { name: 'Run consolidation' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(await screen.findByRole('button', { name: 'Export .xlsx' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('reports the server’s answer when a real run cannot start yet', async () => {
    const user = userEvent.setup();
    const { exceptions, sources, withheldExceptionCount, ...summary } = SEPTEMBER;
    renderApp(
      '/attendance-leave',
      routesFor('HR_SG', {
        'GET /attendance-leave/runs': {
          body: { data: [summary], meta: { page: 1, pageSize: 25, total: 1 } },
        },
        'POST /attendance-leave/runs': {
          status: 501,
          body: { error: { code: 'NOT_IMPLEMENTED', message: 'not yet', traceId: 'trace-2' } },
        },
      }),
    );
    await user.click(await screen.findByRole('button', { name: 'Run consolidation' }));
    const dialog = await screen.findByRole('dialog', { name: 'Run a consolidation' });
    await user.click(within(dialog).getByRole('button', { name: 'Run consolidation' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('not built yet');
  });

  it('lists the real category rules in the reader’s language, and proposes a change', async () => {
    const user = userEvent.setup();
    renderApp('/attendance-leave/mappings', routesFor('HR_SG'));
    const table = await screen.findByRole('table', { name: 'Leave-category rules' });
    expect(await within(table).findByText('年假')).toBeInTheDocument();
    expect(within(table).getByText('Annual leave')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sample data' })).not.toBeInTheDocument();

    await user.click(within(table).getByRole('button', { name: 'Propose a change to NJ' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByLabelText('Why it changes'),
      'HQ counts it as annual leave',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Propose change' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('not built yet');
  });

  it('keeps the rules read-only for management', async () => {
    renderApp('/attendance-leave/mappings', routesFor('MANAGEMENT'));
    const table = await screen.findByRole('table', { name: 'Leave-category rules' });
    await within(table).findByText('年假');
    expect(
      within(table).queryByRole('button', { name: /Propose a change/ }),
    ).not.toBeInTheDocument();
  });

  it("previews the month in the template, the caller's entity only, with its exceptions marked", async () => {
    renderApp('/attendance-leave/template?period=2026-09', routesFor('HR_SG'));
    const table = await screen.findByRole('table', {
      name: 'Monthly attendance and leave, September 2026',
    });
    expect(within(table).getByRole('columnheader', { name: 'Annual leave (days)' })).toBeVisible();
    expect(within(table).getByRole('cell', { name: 'Wealth Management' })).toBeVisible();
    expect(within(table).getByText('1 open exception on this row')).toBeInTheDocument();
    expect(screen.getByText(/Showing Singapore, your entity/)).toBeVisible();
  });

  it('offers the way to consolidation when a month has nothing to preview', async () => {
    renderApp(
      '/attendance-leave/template',
      routesFor('HR_SG', {
        'GET /attendance-leave/template/preview': {
          body: { data: { ...PREVIEW, rows: [], total: 0 }, meta: SAMPLE },
        },
      }),
    );
    expect(await screen.findByText('Nothing consolidated for this month')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to consolidation' })).toHaveAttribute(
      'href',
      '/attendance-leave',
    );
  });

  it('is refused to roles without attendance:read', async () => {
    renderApp('/attendance-leave', routesFor('ADMIN_OPS'));
    expect(await screen.findByText('You do not have access to this page')).toBeVisible();
  });
});

describe('Management reports', () => {
  it('shows each entity’s figures with their sources, and leave as a table', async () => {
    renderApp('/reports', routesFor('MANAGEMENT'));
    const singapore = await screen.findByRole('region', { name: 'Singapore' });
    expect(within(singapore).getAllByText('From SG HR')).toHaveLength(3);
    const leave = within(singapore).getByRole('table', {
      name: 'Leave days by category for Singapore',
    });
    expect(within(leave).getByRole('rowheader', { name: 'Annual leave' })).toBeVisible();
    expect(within(leave).getByRole('cell', { name: '17' })).toBeVisible();
    expect(screen.getByText('Read only')).toBeVisible();
  });

  it('says when a month has no report yet', async () => {
    renderApp(
      '/reports',
      routesFor('MANAGEMENT', {
        'GET /reports/management': {
          status: 404,
          body: { error: { code: 'NOT_FOUND', message: 'none', traceId: 'trace-3' } },
        },
      }),
    );
    expect(await screen.findByText('No report for this month yet')).toBeVisible();
  });

  it('reads the figures in Chinese', async () => {
    renderApp('/reports', routesFor('MANAGEMENT'), 'zh-CN');
    await waitFor(() => {
      expect(screen.getByRole('region', { name: '新加坡' })).toBeInTheDocument();
    });
    expect(screen.getByText('年假')).toBeVisible();
  });
});
