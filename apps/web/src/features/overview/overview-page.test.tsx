import { DEFAULT_ROLE_PERMISSIONS, type Overview, type Role } from '@huitong/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

const NOW = '2026-10-20T08:00:00.000Z';

function overview(overrides: Partial<Overview> = {}): Overview {
  return {
    generatedAt: NOW,
    kpis: {
      employees: { total: 0, byEntity: [] },
      consistencyRate: null,
      openConflicts: 0,
      connectors: { healthy: 2, total: 2 },
    },
    connectors: [
      {
        id: 'sg-hr',
        name: 'Singapore HR',
        nameZh: '新加坡人事系统',
        type: 'SG_HR_REST',
        status: 'ACTIVE',
        region: 'SG',
        lastSyncAt: null,
        recentRuns: [],
      },
      {
        id: 'excel-master',
        name: 'Excel employee master',
        nameZh: 'Excel 员工主数据',
        type: 'FILE_IMPORT',
        status: 'DEPRECATED',
        region: 'SG',
        lastSyncAt: null,
        recentRuns: [],
      },
    ],
    pendingApprovals: {
      mappingProposals: 0,
      conflicts: 0,
      crossBorderTransfers: null,
      workflowTasks: 0,
    },
    recentConflicts: [],
    activity: [],
    ...overrides,
  };
}

function routesFor(role: Role, data: Overview | null): FakeRoutes {
  return {
    'GET /auth/me': { body: { data: sessionFor(role, [...DEFAULT_ROLE_PERMISSIONS[role]]) } },
    'GET /overview':
      data === null
        ? {
            status: 500,
            body: { error: { code: 'INTERNAL', message: 'boom', traceId: 'trace-123' } },
          }
        : { body: { data } },
  };
}

describe('OverviewPage', () => {
  it('guides a first-time user to run the first sync', async () => {
    renderApp('/overview', routesFor('HR_SG', overview()));
    expect(
      await screen.findByRole('heading', { name: 'The employee master is empty' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to connectors' })).toHaveAttribute(
      'href',
      '/connectors',
    );
    expect(screen.getByText('Measured after the first sync')).toBeInTheDocument();
    expect(screen.getByText('Nothing is waiting for you.')).toBeInTheDocument();
    expect(screen.getByText('No open conflicts. Every synced field agrees.')).toBeInTheDocument();
  });

  it('shows queues, conflicts, sync health and activity once data has synced', async () => {
    const data = overview({
      kpis: {
        employees: {
          total: 120,
          byEntity: [
            { entityCode: 'SG01', count: 50 },
            { entityCode: 'CN01', count: 70 },
          ],
        },
        consistencyRate: 0.95,
        openConflicts: 4,
        connectors: { healthy: 0, total: 1 },
      },
      connectors: [
        {
          id: 'sg-hr',
          name: 'Singapore HR',
          nameZh: '新加坡人事系统',
          type: 'SG_HR_REST',
          status: 'ACTIVE',
          region: 'SG',
          lastSyncAt: NOW,
          recentRuns: [
            {
              id: 'run-2',
              status: 'FAILED',
              trigger: 'MANUAL',
              queuedAt: NOW,
              finishedAt: NOW,
              conflictCount: 0,
              errorCount: 3,
            },
          ],
        },
      ],
      pendingApprovals: {
        mappingProposals: 1,
        conflicts: 4,
        crossBorderTransfers: null,
        workflowTasks: 0,
      },
      recentConflicts: [
        {
          id: 'c1',
          employeeNo: 'E100030',
          employeeName: 'Rachel Koh',
          employeeNameLocal: null,
          entityCode: 'SG01',
          field: 'jobTitle',
          detectedAt: NOW,
        },
      ],
      activity: [
        {
          id: '42',
          occurredAt: NOW,
          action: 'conflict.detected',
          actorName: null,
          actorRole: null,
          entityType: 'employee',
          entityId: 'E100030',
        },
      ],
    });
    renderApp('/overview', routesFor('HR_SG', data));

    expect(await screen.findByText('Rachel Koh')).toBeInTheDocument();
    expect(screen.getByText('E100030 · Job title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Data conflicts to resolve/ })).toHaveAttribute(
      'href',
      '/employees?view=conflicts',
    );
    expect(
      screen.getByRole('list', { name: 'Recent sync runs for Singapore HR' }),
    ).toHaveTextContent('Failed');
    expect(screen.getByRole('status')).toHaveTextContent('1 connected system needs attention');
    expect(
      within(screen.getByRole('list', { name: 'Recent activity' })).getByText('Conflict detected'),
    ).toBeInTheDocument();
    expect(screen.queryByText('The employee master is empty')).not.toBeInTheDocument();
  });

  it('offers a retry and the trace ID when the overview cannot load', async () => {
    const user = userEvent.setup();
    renderApp('/overview', routesFor('AUDITOR', null));
    expect(await screen.findByText('We could not load this')).toBeInTheDocument();
    expect(screen.getByText('trace-123')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('We could not load this')).toBeInTheDocument();
  });

  it('speaks Chinese, including connector names', async () => {
    renderApp('/overview', routesFor('HR_HQ', overview()), 'zh-CN');
    expect(await screen.findByRole('heading', { level: 1, name: '概览' })).toBeInTheDocument();
    expect(await screen.findByText('新加坡人事系统')).toBeInTheDocument();
    expect(screen.getByText('正在停用')).toBeInTheDocument();
  });
});
