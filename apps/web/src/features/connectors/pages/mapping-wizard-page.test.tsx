import { DEFAULT_ROLE_PERMISSIONS, type MappingProposal, type Permission } from '@huitong/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

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
});
