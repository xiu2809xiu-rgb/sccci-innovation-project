import {
  DEFAULT_ROLE_PERMISSIONS,
  type Conflict,
  type EmployeeDetail,
  type EmployeeSummary,
} from '@huitong/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

const NOW = '2026-10-20T08:00:00.000Z';
const CONFLICT_ID = '0199f0a0-0000-7000-8000-00000000c001';
const HIDDEN = { masked: true, classification: 'RESTRICTED', reason: 'ENTITY_SCOPE' } as const;

const EMPLOYEES: EmployeeSummary[] = [
  {
    employeeNo: 'E100021',
    entityCode: 'SG01',
    fullNameLatin: 'Lim Wei Jie',
    fullNameLocal: null,
    preferredName: null,
    workEmail: 'weijie.lim@orge.example',
    departmentCode: 'HR',
    jobTitle: 'HR Executive',
    jobTitleZh: null,
    employmentStatus: 'ACTIVE',
    workLocation: 'SG-SIN',
    openConflictCount: 0,
    sources: ['sg-hr'],
    updatedAt: NOW,
  },
  {
    employeeNo: 'E200014',
    entityCode: 'CN01',
    fullNameLatin: 'Wang Fang',
    fullNameLocal: '王芳',
    preferredName: null,
    workEmail: 'fang.wang@orge.example',
    departmentCode: 'FIN',
    jobTitle: 'Finance Manager',
    jobTitleZh: '财务经理',
    employmentStatus: 'PROBATION',
    workLocation: 'CN-SHA',
    openConflictCount: 1,
    sources: ['cn-hq', 'sg-hr'],
    updatedAt: NOW,
  },
];

const CONFLICT: Conflict = {
  id: CONFLICT_ID,
  employeeNo: 'E200014',
  employeeName: 'Wang Fang',
  employeeNameLocal: '王芳',
  entityCode: 'CN01',
  field: 'jobTitle',
  classification: 'INTERNAL',
  status: 'OPEN',
  candidates: [
    { connectorId: 'cn-hq', value: 'Finance Manager', observedAt: NOW },
    { connectorId: 'sg-hr', value: 'Senior Accountant', observedAt: NOW },
  ],
  detectedAt: NOW,
  resolution: null,
  chosenConnectorId: null,
  resolvedValue: null,
  resolutionNote: null,
  resolvedBy: null,
  resolvedAt: null,
};

const DETAIL: EmployeeDetail = {
  employeeNo: 'E200014',
  entityCode: 'CN01',
  fullNameLatin: 'Wang Fang',
  fullNameLocal: '王芳',
  version: 3,
  createdAt: NOW,
  updatedAt: NOW,
  fields: [
    {
      field: 'jobTitle',
      classification: 'INTERNAL',
      value: 'Finance Manager',
      sourceOfTruth: { kind: 'NONE', connectorId: null },
      sources: [
        { connectorId: 'cn-hq', value: 'Finance Manager', observedAt: NOW, agrees: true },
        { connectorId: 'sg-hr', value: 'Senior Accountant', observedAt: NOW, agrees: false },
      ],
      openConflictId: CONFLICT_ID,
    },
    {
      field: 'baseSalary',
      classification: 'RESTRICTED',
      value: HIDDEN,
      sourceOfTruth: { kind: 'POLICY', connectorId: 'cn-hq' },
      sources: [{ connectorId: 'cn-hq', value: HIDDEN, observedAt: NOW, agrees: true }],
      openConflictId: null,
    },
  ],
  conflicts: [CONFLICT],
  history: [],
};

function routesFor(employees: EmployeeSummary[] = EMPLOYEES): FakeRoutes {
  return {
    'GET /auth/me': { body: { data: sessionFor('HR_SG', [...DEFAULT_ROLE_PERMISSIONS.HR_SG]) } },
    'GET /employees': {
      body: { data: employees, meta: { page: 1, pageSize: 25, total: employees.length } },
    },
    'GET /employees/E200014': { body: { data: DETAIL } },
    'GET /conflicts': { body: { data: [CONFLICT], meta: { page: 1, pageSize: 50, total: 1 } } },
    [`POST /conflicts/${CONFLICT_ID}/resolve`]: {
      body: {
        data: {
          ...CONFLICT,
          status: 'RESOLVED',
          resolution: 'SOURCE_SELECTED',
          chosenConnectorId: 'cn-hq',
          resolvedValue: 'Finance Manager',
          resolvedBy: { id: '0199f0a0-0000-7000-8000-000000000001', displayName: 'Tan Mei Ling' },
          resolvedAt: NOW,
        },
      },
    },
  };
}

describe('EmployeesPage', () => {
  it('opens a record beside what each system holds, starting at its title', async () => {
    const user = userEvent.setup();
    renderApp('/employees', routesFor());
    expect(await screen.findByText('2 employees')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open the record of Wang Fang' }));
    const drawer = await screen.findByRole('dialog');
    const title = await within(drawer).findByRole('heading', { name: /Wang Fang/ });
    await waitFor(() => {
      expect(title).toHaveFocus();
    });
    // Focus no longer lands on the synthetic data badge, which opened its tooltip.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(within(drawer).getByText('E200014 · China HQ · version 3')).toBeInTheDocument();
    expect(within(drawer).getByText('Senior Accountant')).toBeInTheDocument();
    expect(
      within(drawer).getAllByRole('button', { name: /only for your own entity/ }).length,
    ).toBeGreaterThan(0);
  });

  it('offers each entity by code and name', async () => {
    const user = userEvent.setup();
    renderApp('/employees', routesFor());
    await user.click(await screen.findByRole('combobox', { name: 'Entity' }));
    expect(await screen.findByRole('option', { name: 'MY01 · Malaysia' })).toBeInTheDocument();
  });

  it('shows the empty master with a way to fill it', async () => {
    renderApp('/employees', routesFor([]));
    expect(await screen.findByText('No employees yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Run sync' })).toHaveLength(2);
  });

  it('names a typed-in value and says why its note is needed', async () => {
    const user = userEvent.setup();
    renderApp('/employees?view=conflicts', routesFor());
    await user.click(await screen.findByRole('button', { name: 'Resolve' }));
    const dialog = await screen.findByRole('dialog', { name: 'Resolve: Job title' });
    await user.click(within(dialog).getByRole('radio', { name: 'Enter the correct value' }));
    expect(
      within(dialog).getByRole('textbox', { name: 'Enter the correct value' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Note' })).toHaveAccessibleDescription(
      'Say where the value comes from, in at least 3 characters.',
    );
  });

  it('resolves a conflict only after a deliberate hold', async () => {
    const user = userEvent.setup();
    renderApp('/employees?view=conflicts', routesFor());
    await user.click(await screen.findByRole('button', { name: 'Resolve' }));
    const dialog = await screen.findByRole('dialog', { name: 'Resolve: Job title' });
    const hold = within(dialog).getByRole('button', { name: 'Hold to confirm' });
    expect(hold).toBeDisabled();

    await user.click(within(dialog).getByRole('radio', { name: /Keep the value from CN HQ/ }));
    expect(hold).toBeEnabled();
    fireEvent.keyDown(hold, { key: ' ' });
    expect(
      await screen.findByText('Conflict resolved. The decision is in the audit log.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
