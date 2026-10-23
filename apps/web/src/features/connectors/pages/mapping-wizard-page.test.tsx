import {
  DEFAULT_ROLE_PERMISSIONS,
  type ConnectorSummary,
  type MappingProposal,
  type Permission,
} from '@huitong/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

const NOW = '2026-10-20T08:00:00.000Z';
const PROPOSAL_ID = '0199f0a0-0000-7000-8000-0000000000a1';
const HR = [...DEFAULT_ROLE_PERMISSIONS.HR_SG];

function proposal(overrides: Partial<MappingProposal> = {}): MappingProposal {
  return {
    id: PROPOSAL_ID,
    sourceSystemName: 'Organisation E Malaysia HR',
    entityCode: 'MY01',
    connectorId: null,
    fileName: 'my-payroll-sample.csv',
    headers: ['员工编号', '入职日期', '身份证号码', '性别'],
    sampleRowCount: 12,
    columns: [
      {
        sourceColumn: '员工编号',
        sampleShape: 'E######',
        target: 'employeeNo',
        transform: { kind: 'copy' },
        confidence: 0.98,
        rationale: 'The header means employee number.',
        flags: [],
      },
      {
        sourceColumn: '入职日期',
        sampleShape: 'YYYY/MM/DD',
        target: 'hireDate',
        transform: { kind: 'date', format: 'YYYY/MM/DD' },
        confidence: 0.95,
        rationale: 'The header means hire date.',
        flags: [],
      },
      {
        sourceColumn: '身份证号码',
        sampleShape: '18 digits',
        target: null,
        transform: null,
        confidence: 0,
        rationale: 'Withheld: a national ID number.',
        flags: ['PROHIBITED_FIELD'],
      },
      {
        sourceColumn: '性别',
        sampleShape: 'withheld',
        target: null,
        transform: null,
        confidence: 1,
        rationale: 'This column holds gender. HuiTong never stores it, so it stays unmapped.',
        flags: ['PROHIBITED_FIELD'],
        prohibitedKind: 'GENDER',
      },
    ],
    fixedValues: [{ target: 'entityCode', value: 'MY01', rationale: 'Every row is MY01.' }],
    status: 'PENDING_REVIEW',
    language: 'en',
    provider: 'MOCK',
    model: 'mock-mapping-v1',
    createdBy: { id: '0199f0a0-0000-7000-8000-000000000001', displayName: 'Tan Mei Ling' },
    createdAt: NOW,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    mappingConfig: null,
    ...overrides,
  };
}

function routesFor(permissions: readonly Permission[]): FakeRoutes {
  return {
    'GET /auth/me': { body: { data: sessionFor('HR_SG', [...permissions]) } },
    'GET /connectors': { body: { data: [] } },
    'POST /mapping-proposals': { status: 201, body: { data: proposal() } },
    [`GET /mapping-proposals/${PROPOSAL_ID}`]: { body: { data: proposal() } },
    [`POST /mapping-proposals/${PROPOSAL_ID}/approve`]: {
      body: {
        data: proposal({
          status: 'APPROVED',
          mappingConfig: {
            id: '0199f0a0-0000-7000-8000-0000000000b1',
            connectorId: 'organisation-e-malaysia-hr',
            version: 1,
          },
          reviewedBy: { id: '0199f0a0-0000-7000-8000-000000000001', displayName: 'Tan Mei Ling' },
          reviewedAt: NOW,
        }),
      },
    },
  };
}

describe('Mapping wizard', () => {
  it('sends a sample, shows the AI proposal for review and saves it only on approval', async () => {
    const user = userEvent.setup();
    renderApp('/connectors/new-mapping', routesFor(HR));
    await user.type(
      await screen.findByLabelText('Source system name'),
      'Organisation E Malaysia HR',
    );
    await user.upload(
      screen.getByLabelText('Sample file'),
      new File(['员工编号,入职日期\nE100001,2026/01/05\n'], 'my-payroll-sample.csv', {
        type: 'text/csv',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Get the AI proposal' }));

    const review = await screen.findByRole('table', {
      name: 'Proposed mapping for my-payroll-sample.csv',
    });
    expect(within(review).getByText('Never mapped: national ID numbers')).toBeInTheDocument();
    expect(within(review).getByText('Never mapped: gender')).toBeInTheDocument();
    expect(within(review).getByText('98%')).toBeInTheDocument();
    expect(screen.getByText('Requires approval')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mock AI' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue to approval' }));

    const approve = screen.getByRole('button', { name: 'Approve and save' });
    expect(approve).toBeDisabled();
    await user.type(screen.getByLabelText('Name in Chinese'), '马来西亚人力资源系统');
    await user.click(screen.getByLabelText(/I have reviewed every mapping/));
    expect(approve).toBeEnabled();
    await user.click(approve);
    expect(await screen.findByText('Mapping version 1 saved')).toBeInTheDocument();
  });

  it('asks which encoding reads the file correctly, then sends that choice', async () => {
    const user = userEvent.setup();
    const appended = vi.spyOn(FormData.prototype, 'append');
    const routes: FakeRoutes = {
      ...routesFor(HR),
      'POST /mapping-proposals': {
        status: 422,
        body: {
          error: {
            code: 'SAMPLE_ENCODING_UNCERTAIN',
            message: 'The file could be read in more than one encoding',
            traceId: 'test-trace',
            details: {
              readings: [
                { encoding: 'gb18030', headers: ['员工编号', '姓名'] },
                { encoding: 'utf-8', headers: ['Ô±¹¤±àºÅ', 'ÐÕÃû'] },
              ],
            },
          },
        },
      },
    };
    renderApp('/connectors/new-mapping', routes);
    await user.type(await screen.findByLabelText('Source system name'), 'HQ payroll export');
    await user.upload(
      screen.getByLabelText('Sample file'),
      new File(['x'], 'hq-export.csv', { type: 'text/csv' }),
    );
    await user.click(screen.getByRole('button', { name: 'Get the AI proposal' }));

    const question = await screen.findByRole('region', {
      name: 'Which reading of the file looks right?',
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const read = within(question).getByRole('button', { name: 'Read the file this way' });
    expect(read).toBeDisabled();
    await user.click(
      within(question).getByRole('radio', { name: /GB18030 or GBK.*员工编号 · 姓名/ }),
    );

    routes['POST /mapping-proposals'] = { status: 201, body: { data: proposal() } };
    await user.click(read);
    expect(
      await screen.findByRole('table', { name: 'Proposed mapping for my-payroll-sample.csv' }),
    ).toBeInTheDocument();
    expect(appended).toHaveBeenCalledWith('encoding', 'gb18030');
    appended.mockRestore();
  });

  it('does not label a proposal from a real model as mock AI', async () => {
    renderApp(`/connectors/new-mapping?proposal=${PROPOSAL_ID}`, {
      ...routesFor(HR),
      [`GET /mapping-proposals/${PROPOSAL_ID}`]: {
        body: { data: proposal({ provider: 'BEDROCK', model: 'anthropic.claude-sonnet' }) },
      },
    });
    expect(await screen.findByText('Requires approval')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mock AI' })).not.toBeInTheDocument();
  });

  it('blocks approval while two columns fill the same field', async () => {
    const user = userEvent.setup();
    renderApp(`/connectors/new-mapping?proposal=${PROPOSAL_ID}`, routesFor(HR));
    await user.click(
      await screen.findByRole('combobox', { name: 'Master field for the column 入职日期' }),
    );
    await user.click(await screen.findByRole('option', { name: 'Employee number' }));
    expect(
      screen.getByText('Employee number is filled from more than one column.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to approval' })).toBeDisabled();
  });

  it('lets a role without approval rights review a proposal, not approve it', async () => {
    const user = userEvent.setup();
    renderApp(
      `/connectors/new-mapping?proposal=${PROPOSAL_ID}`,
      routesFor(HR.filter((permission) => permission !== 'mappings:approve')),
    );
    await user.click(await screen.findByRole('button', { name: 'Continue to approval' }));
    expect(
      screen.getByText(/Your role can review this proposal but not approve it/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve and save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('offers only file connectors that may still take a mapping as an existing target', async () => {
    const user = userEvent.setup();
    const fileConnector = (id: string, name: string, status: ConnectorSummary['status']) => ({
      id,
      name,
      nameZh: name,
      type: 'FILE_IMPORT' as const,
      region: 'MY',
      entityCode: 'MY01' as const,
      status,
      isMock: false,
      capabilities: ['employees.read'],
      syncable: false,
      stagedImport: null,
      lastSyncAt: null,
      lastHealthCheckAt: null,
      lastHealthStatus: null,
      activeMappingVersion: 1,
      latestRun: null,
    });
    const routes = routesFor(HR);
    routes['GET /connectors'] = {
      body: {
        data: [
          fileConnector('malaysia-hr', 'Malaysia HR export', 'ACTIVE'),
          fileConnector('excel-master', 'Legacy Excel employee master', 'DEPRECATED'),
        ],
      },
    };
    renderApp(`/connectors/new-mapping?proposal=${PROPOSAL_ID}`, routes);
    await user.click(await screen.findByRole('button', { name: 'Continue to approval' }));
    await user.click(
      screen.getByRole('radio', { name: 'A new version for an existing file connector' }),
    );
    await user.click(
      screen.getByRole('combobox', { name: 'A new version for an existing file connector' }),
    );
    expect(
      await screen.findByRole('option', { name: 'Malaysia HR export (now version 1)' }),
    ).toBeInTheDocument();
    // Being retired, it takes no new mapping: the API refuses it too.
    expect(
      screen.queryByRole('option', { name: /Legacy Excel employee master/ }),
    ).not.toBeInTheDocument();
  });
});
