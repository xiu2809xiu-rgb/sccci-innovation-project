import {
  DEFAULT_CLEARANCE_RULES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  ROLES,
  type AccessMatrix,
  type AuditEventView,
  type ClassificationEntry,
  type RetentionPolicy,
  type Role,
  type TransferEntry,
} from '@huitong/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

const MATRIX: AccessMatrix = {
  permissions: [...PERMISSIONS],
  roles: ROLES.map((role) => ({
    role,
    permissions: [...DEFAULT_ROLE_PERMISSIONS[role]],
    clearance: DEFAULT_CLEARANCE_RULES.filter((rule) => rule.role === role).map((rule) => ({
      entityCode: rule.entityCode,
      maxLevel: rule.maxLevel,
    })),
  })),
};

const SALARY: ClassificationEntry = {
  id: '0199a3b1-0c40-7e21-9f3a-00000000000a',
  entityType: 'Employee',
  field: 'baseSalary',
  level: 'RESTRICTED',
  description: 'Pay is restricted to the HR of the employee’s own entity.',
  descriptionZh: '薪酬仅限员工所属实体的人力资源查看。',
  isPersonalData: true,
  isSensitive: true,
  updatedAt: '2026-10-20T00:00:00Z',
};

const MASTER: TransferEntry = {
  id: '0199a3b1-0c40-7e21-9f3a-00000000000b',
  name: 'SG01 employee master to Group HQ',
  nameZh: 'SG01 员工主数据至集团总部',
  fromEntityCode: 'SG01',
  toEntityCode: 'CN01',
  fromCountry: 'SG',
  toCountry: 'CN',
  dataCategories: ['identity', 'jobGrade'],
  fieldsCovered: ['employeeNo', 'familyName', 'jobGrade'],
  purpose: 'Group headcount reporting',
  legalBasis: 'PDPA Transfer Limitation Obligation; PIPL Article 38',
  mechanism: 'Intra-group agreement',
  status: 'ACTIVE',
  version: 2,
  approvedAt: '2026-09-01T00:00:00Z',
  reviewDueAt: '2027-09-01T00:00:00Z',
  notes: null,
  updatedAt: '2026-10-20T00:00:00Z',
};

const COMPENSATION: TransferEntry = {
  ...MASTER,
  id: '0199a3b1-0c40-7e21-9f3a-00000000000d',
  name: 'SG01 compensation data to Group HQ',
  nameZh: null,
  dataCategories: ['baseSalary'],
  fieldsCovered: ['baseSalary'],
  legalBasis: 'Not yet established',
  status: 'PENDING_REVIEW',
  version: 1,
  approvedAt: null,
  reviewDueAt: null,
};

const RETENTION: RetentionPolicy = {
  id: '0199a3b1-0c40-7e21-9f3a-00000000000c',
  dataCategory: 'audit_events',
  entityCode: null,
  retentionMonths: 84,
  action: 'ARCHIVE',
  legalReference: 'Companies Act record keeping',
  lastAppliedAt: null,
  updatedAt: '2026-10-20T00:00:00Z',
};

const EVENTS: AuditEventView[] = [
  {
    id: '41',
    occurredAt: '2026-10-21T01:00:00Z',
    action: 'employee.updated',
    actorUserId: '0199f0a0-0000-7000-8000-000000000001',
    actorName: 'Tan Mei Ling',
    actorRole: 'HR_SG',
    entityType: 'Employee',
    entityId: 'E100030',
    entityIdWithheld: false,
    changedFields: ['jobTitle', 'departmentCode', 'workLocation', 'costCenter'],
    traceId: 'trace-0123456789',
  },
  {
    id: '40',
    occurredAt: '2026-10-20T01:00:00Z',
    action: 'employee.updated',
    actorUserId: null,
    actorName: null,
    actorRole: null,
    entityType: 'Employee',
    entityId: null,
    entityIdWithheld: true,
    changedFields: ['jobTitle'],
    traceId: null,
  },
];

const page = (data: unknown[], pageSize = 50) => ({
  body: { data, meta: { page: 1, pageSize, total: data.length } },
});

function routesFor(role: Role, extra: FakeRoutes = {}): FakeRoutes {
  return {
    'GET /auth/me': { body: { data: sessionFor(role, [...DEFAULT_ROLE_PERMISSIONS[role]]) } },
    'GET /governance/access': { body: { data: MATRIX } },
    'GET /governance/classifications': page([SALARY]),
    'GET /governance/transfers': page([MASTER, COMPENSATION], 20),
    'PUT /governance/transfers/0199a3b1-0c40-7e21-9f3a-00000000000b/status': {
      status: 501,
      body: { error: { code: 'NOT_IMPLEMENTED', message: 'not yet', traceId: 'trace-1' } },
    },
    'GET /governance/retention': page([RETENTION]),
    'GET /audit/events': page(EVENTS, 25),
    'GET /audit/verify': {
      body: {
        data: { valid: true, checked: 3, firstBrokenId: null, checkedAt: new Date().toISOString() },
      },
    },
    ...extra,
  };
}

describe('Governance', () => {
  it("shows the policy the API enforces: each role's permissions and its clearance", async () => {
    renderApp('/governance', routesFor('AUDITOR'));
    const matrix = await screen.findByRole('table', { name: 'Permissions each role holds' });
    const conflicts = within(matrix).getByRole('row', { name: /Resolve data conflicts/ });
    const [admin, hrSingapore] = within(conflicts).getAllByRole('cell');
    expect(admin).toHaveTextContent('Not allowed');
    expect(hrSingapore).toHaveTextContent('Allowed');

    const clearance = screen.getByRole('table', { name: /Highest classification each role/ });
    const hq = within(clearance).getByRole('row', { name: /HR, China HQ/ });
    expect(
      within(hq)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['Confidential', 'Restricted', 'Confidential']);
  });

  it('lists each classified field with its level, why, and the roles that may see it', async () => {
    renderApp('/governance/classification', routesFor('HR_SG'));
    const table = await screen.findByRole('table', { name: 'Classified fields' });
    const salary = await within(table).findByRole('row', { name: /Base salary/ });
    expect(within(salary).getByText('Restricted')).toBeVisible();
    const cleared = await within(salary).findByRole('list');
    expect(
      within(cleared)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['HR, Singapore: Singapore only', 'HR, China HQ: China HQ only']);
    expect(screen.getByText(/also needs an active transfer entry/)).toBeVisible();
  });

  it('says who may see a field is not available when the access policy fails to load', async () => {
    renderApp(
      '/governance/classification',
      routesFor('AUDITOR', {
        'GET /governance/access': {
          status: 500,
          body: { error: { code: 'INTERNAL', message: 'down', traceId: 'trace-a' } },
        },
      }),
    );
    const table = await screen.findByRole('table', { name: 'Classified fields' });
    const salary = await within(table).findByRole('row', { name: /Base salary/ });
    expect(
      await within(salary).findByText('Not available: the access policy did not load'),
    ).toBeVisible();
  });

  it('shows what a transfer shares, and explains that changing it is not built yet', async () => {
    const user = userEvent.setup();
    renderApp('/governance/transfers', routesFor('SYSTEM_ADMIN'));
    expect(
      await screen.findByRole('heading', { name: 'SG01 employee master to Group HQ' }),
    ).toBeVisible();
    expect(screen.getByText('Active')).toBeVisible();
    expect(screen.getByText('Fields it shares')).toBeVisible();
    expect(screen.getByText('Employee number')).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: 'Change status of SG01 employee master to Group HQ' }),
    );
    const dialog = await screen.findByRole('dialog');
    // Nothing is chosen for the person: submitting at once asks for both answers.
    await user.click(within(dialog).getByRole('button', { name: 'Change status' }));
    expect(await within(dialog).findByText('Choose the new status.')).toBeVisible();
    expect(within(dialog).getByText('Give a reason for the change.')).toBeVisible();

    await user.click(within(dialog).getByRole('combobox', { name: 'New status' }));
    await user.click(await screen.findByRole('option', { name: 'Pending review' }));
    expect(
      await within(dialog).findByText('China HQ stops receiving these fields at once:'),
    ).toBeVisible();
    expect(within(dialog).getByText('Employee number')).toBeVisible();
    await user.type(within(dialog).getByLabelText('Reason'), 'Annual review found a gap');
    await user.click(within(dialog).getByRole('button', { name: 'Change status' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('not built yet');
  });

  it('names the fields an approval would send, and its legal basis, before it is made', async () => {
    const user = userEvent.setup();
    renderApp('/governance/transfers', routesFor('SYSTEM_ADMIN'));
    await user.click(
      await screen.findByRole('button', {
        name: 'Change status of SG01 compensation data to Group HQ',
      }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('combobox', { name: 'New status' }));
    expect(screen.queryByRole('option', { name: 'Pending review' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Active' }));
    expect(
      await within(dialog).findByText('China HQ will receive these fields on its next request:'),
    ).toBeVisible();
    expect(within(dialog).getByText('Base salary')).toBeVisible();
    expect(within(dialog).getByText('Legal basis: Not yet established')).toBeVisible();
  });

  it('keeps the register read-only for roles without governance:manage, in Chinese too', async () => {
    renderApp('/governance/transfers', routesFor('HR_HQ'), 'zh-CN');
    expect(await screen.findByRole('heading', { name: 'SG01 员工主数据至集团总部' })).toBeVisible();
    expect(screen.getByText('生效')).toBeVisible();
    expect(screen.queryByRole('button', { name: /更改/ })).not.toBeInTheDocument();
  });

  it('lists retention in years, for the whole group, never yet applied', async () => {
    renderApp('/governance/retention', routesFor('AUDITOR'));
    const table = await screen.findByRole('table', { name: 'Retention rules' });
    const audit = await within(table).findByRole('row', { name: /Audit log/ });
    expect(within(audit).getByText('7 years')).toBeVisible();
    expect(within(audit).getByText('The whole group')).toBeVisible();
    expect(within(audit).getByText('Never')).toBeVisible();
    expect(screen.getByText(/Nothing is purged yet/)).toBeVisible();
  });

  it('drops the nothing-purged note once a rule has run', async () => {
    renderApp(
      '/governance/retention',
      routesFor('AUDITOR', {
        'GET /governance/retention': page([
          { ...RETENTION, lastAppliedAt: '2026-10-20T16:00:00Z' },
        ]),
      }),
    );
    const table = await screen.findByRole('table', { name: 'Retention rules' });
    await within(table).findByRole('row', { name: /Audit log/ });
    expect(screen.queryByText(/Nothing is purged yet/)).not.toBeInTheDocument();
  });

  it('offers a retry with the trace ID when a register cannot load', async () => {
    renderApp(
      '/governance/classification',
      routesFor('AUDITOR', {
        'GET /governance/classifications': {
          status: 500,
          body: { error: { code: 'INTERNAL', message: 'down', traceId: 'trace-500' } },
        },
      }),
    );
    expect(await screen.findByText('We could not load this')).toBeVisible();
    expect(screen.getByText('trace-500')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});

describe('Audit log', () => {
  it("opens on a record's trail, naming changed fields and withholding another entity's employee", async () => {
    renderApp('/governance/audit?entityType=Employee&entityId=E100030', routesFor('AUDITOR'));
    const table = await screen.findByRole('table', { name: 'Audit events' });
    expect(screen.getByLabelText('Record ID')).toHaveValue('E100030');
    expect(await within(table).findByRole('link', { name: 'E100030' })).toBeVisible();
    const [, updated, withheld] = within(table).getAllByRole('row');
    if (!updated || !withheld) throw new Error('expected the two sample events');
    expect(within(updated).getByText('Job title')).toBeVisible();
    expect(within(updated).getByRole('button', { name: '+1 more' })).toBeVisible();
    expect(within(withheld).getByRole('button', { name: /Why is this hidden/ })).toBeVisible();
    expect(within(withheld).getByText('System or anonymous')).toBeVisible();
  });

  it('filters by the person who acted, and shows the filter until it is removed', async () => {
    const user = userEvent.setup();
    renderApp('/governance/audit', routesFor('AUDITOR'));
    await user.click(
      await screen.findByRole('button', { name: 'Show only events by Tan Mei Ling' }),
    );
    // The visible label starts the accessible name (WCAG 2.5.3).
    const chip = await screen.findByRole('button', {
      name: 'Person: Tan Mei Ling (remove this filter)',
    });
    await user.click(chip);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Person:/ })).not.toBeInTheDocument();
    });
  });

  it('refuses a date range that ends before it starts', async () => {
    renderApp('/governance/audit', routesFor('AUDITOR'));
    // jsdom cannot type into a date input, so the values are set as the picker would set them.
    fireEvent.change(await screen.findByLabelText('From'), { target: { value: '2026-10-21' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } });
    expect(screen.getByText('The end date must be on or after the start date.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Apply filters' })).toBeDisabled();
  });

  it('checks the hash chain on request and says whether it is intact or where it breaks', async () => {
    const user = userEvent.setup();
    renderApp('/governance/audit', routesFor('AUDITOR'));
    await user.click(await screen.findByRole('button', { name: 'Check the chain' }));
    expect(await screen.findByText(/Intact: 3 events checked/)).toBeVisible();
  });

  it('shows the trace ID when the chain cannot be checked', async () => {
    const user = userEvent.setup();
    renderApp(
      '/governance/audit',
      routesFor('AUDITOR', {
        'GET /audit/verify': {
          status: 503,
          body: { error: { code: 'INTERNAL', message: 'busy', traceId: 'trace-verify' } },
        },
      }),
    );
    await user.click(await screen.findByRole('button', { name: 'Check the chain' }));
    expect(await screen.findByText('trace-verify')).toBeVisible();
  });

  it('reports a broken chain with the first event that does not match', async () => {
    const user = userEvent.setup();
    renderApp(
      '/governance/audit',
      routesFor('AUDITOR', {
        'GET /audit/verify': {
          body: {
            data: {
              valid: false,
              checked: 3,
              firstBrokenId: '42',
              checkedAt: new Date().toISOString(),
            },
          },
        },
      }),
    );
    await user.click(await screen.findByRole('button', { name: 'Check the chain' }));
    expect(await screen.findByText(/Broken at event 42/)).toBeVisible();
  });

  it('is hidden from, and refused to, roles without audit:read', async () => {
    renderApp('/governance', routesFor('HR_SG'));
    const nav = await screen.findByRole('navigation', { name: 'Governance sections' });
    expect(within(nav).queryByRole('link', { name: 'Audit log' })).not.toBeInTheDocument();

    renderApp('/governance/audit', routesFor('HR_SG'));
    expect(await screen.findByText('You do not have access to this page')).toBeVisible();
  });
});
