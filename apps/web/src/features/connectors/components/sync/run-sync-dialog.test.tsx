import {
  DEFAULT_ROLE_PERMISSIONS,
  type ConnectorSummary,
  type SyncRunDetail,
} from '@huitong/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

const NOW = '2026-10-20T08:00:00.000Z';
const RUN_ID = '0199f0a0-0000-7000-8000-00000000e001';
const APPLY_RUN_ID = '0199f0a0-0000-7000-8000-00000000e002';

const SYNCABLE: ConnectorSummary[] = [
  {
    id: 'sg-hr',
    name: 'Singapore HR',
    nameZh: '新加坡人力资源系统',
    type: 'SG_HR_REST',
    region: 'SG',
    entityCode: 'SG01',
    status: 'ACTIVE',
    isMock: true,
    capabilities: ['employees.read'],
    syncable: true,
    lastSyncAt: null,
    lastHealthCheckAt: null,
    lastHealthStatus: null,
    activeMappingVersion: 2,
    latestRun: null,
  },
];

function run(overrides: Partial<SyncRunDetail> = {}): SyncRunDetail {
  return {
    id: RUN_ID,
    connectorId: 'sg-hr',
    trigger: 'MANUAL',
    mode: 'PREVIEW',
    status: 'SUCCEEDED',
    stage: null,
    progress: 100,
    counts: { fetched: 12, created: 0, updated: 0, unchanged: 12, conflicts: 0, errors: 0 },
    attempt: 1,
    triggeredBy: null,
    mappingVersion: 2,
    queuedAt: NOW,
    startedAt: NOW,
    finishedAt: NOW,
    errors: [],
    previewItems: [],
    previewTruncated: false,
    ...overrides,
  };
}

function routesFor(result: SyncRunDetail): FakeRoutes {
  return {
    'GET /auth/me': { body: { data: sessionFor('HR_SG', [...DEFAULT_ROLE_PERMISSIONS.HR_SG]) } },
    'GET /employees': { body: { data: [], meta: { page: 1, pageSize: 25, total: 0 } } },
    'GET /connectors': { body: { data: SYNCABLE } },
    // Preview and apply both answer with RUN_ID; the dialog reads its outcome from the run.
    'POST /connectors/sg-hr/sync': { status: 202, body: { data: run({ status: 'QUEUED' }) } },
    [`GET /sync-runs/${RUN_ID}`]: { body: { data: result } },
  };
}

/** Opens Run sync from the employee master and previews Singapore HR. */
async function previewSingaporeHr(result: SyncRunDetail) {
  const user = userEvent.setup();
  const routes = routesFor(result);
  renderApp('/employees', routes);
  const [headerAction] = await screen.findAllByRole('button', { name: 'Run sync' });
  await user.click(headerAction as HTMLElement);
  const dialog = await screen.findByRole('dialog', { name: 'Choose a system to sync' });
  await user.click(await within(dialog).findByRole('radio', { name: /Singapore HR/ }));
  await user.click(within(dialog).getByRole('button', { name: 'Preview changes' }));
  return { user, dialog, routes };
}

describe('Run sync', () => {
  it('says so when everything is already in sync, and offers Close', async () => {
    const { user, dialog } = await previewSingaporeHr(run());
    expect(
      await within(dialog).findByText('Everything is already in sync: there is nothing to apply.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('The preview compared every record with the employee master.'),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('slider')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    // The dialog's corner button and the footer's both close it.
    const close = within(dialog).getAllByRole('button', { name: 'Close' });
    expect(close).toHaveLength(2);
    await user.click(close[1] as HTMLElement);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('explains a failed preview in the UI language and offers to preview again', async () => {
    const { dialog } = await previewSingaporeHr(
      run({
        status: 'FAILED',
        counts: { fetched: 0, created: 0, updated: 0, unchanged: 0, conflicts: 0, errors: 1 },
        errors: [
          {
            externalId: null,
            stage: 'EXTRACT',
            code: 'UPSTREAM_UNAVAILABLE',
            message: 'Attempt 3: SG HR did not respond as expected',
          },
        ],
      }),
    );
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The connected system did not respond.',
    );
    expect(within(dialog).queryByText(/Attempt 3/)).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'The preview stopped, so nothing was written. You can preview again.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Preview again' })).toBeEnabled();
  });

  it('shows what would change and applies it only from the slider', async () => {
    const { user, dialog } = await previewSingaporeHr(
      run({
        counts: { fetched: 12, created: 1, updated: 1, unchanged: 9, conflicts: 1, errors: 0 },
        previewItems: [
          {
            employeeNo: 'E100021',
            entityCode: 'SG01',
            kind: 'UPDATE',
            field: 'jobTitle',
            before: 'HR Executive',
            after: 'Senior HR Executive',
          },
          {
            employeeNo: 'E100099',
            entityCode: 'SG01',
            kind: 'CREATE',
            field: null,
            before: null,
            after: null,
          },
        ],
      }),
    );
    const preview = await within(dialog).findByRole('table', {
      name: 'Changes the sync would make',
    });
    expect(within(preview).getByText('Senior HR Executive')).toBeInTheDocument();
    expect(within(preview).getByText('Added to the master')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    const slider = within(dialog).getByRole('slider', { name: 'Slide to apply these changes' });
    slider.focus();
    await user.keyboard('{Enter}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Tap again to apply');
    await user.keyboard('{Enter}');

    expect(
      await within(dialog).findByText(
        'The previewed changes are in the employee master, and each one is in the audit log.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('1 new conflict needs a decision.')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Review conflicts' })).toHaveAttribute(
      'href',
      '/employees?view=conflicts',
    );
  });

  it('lists what each system says for a conflict, not the raw candidates', async () => {
    const { dialog } = await previewSingaporeHr(
      run({
        counts: { fetched: 12, created: 0, updated: 0, unchanged: 11, conflicts: 1, errors: 0 },
        previewItems: [
          {
            employeeNo: 'E100006',
            entityCode: 'SG01',
            kind: 'CONFLICT',
            field: 'jobTitle',
            before: 'Head of Wealth Management',
            after: [
              { connectorId: 'cn-hq', value: 'Head of Wealth Management' },
              { connectorId: 'sg-hr', value: 'Managing Director, Wealth Management' },
            ],
          },
        ],
      }),
    );
    const preview = await within(dialog).findByRole('table', {
      name: 'Changes the sync would make',
    });
    expect(within(preview).getByText('SG HR:')).toBeInTheDocument();
    expect(within(preview).getByText('Managing Director, Wealth Management')).toBeInTheDocument();
    expect(within(preview).getByText('CN HQ:')).toBeInTheDocument();
    expect(within(preview).getByText('Head of Wealth Management')).toBeInTheDocument();
    expect(within(preview).queryByText(/connectorId/)).not.toBeInTheDocument();
  });

  it('explains an apply refused because the source changed after the preview', async () => {
    const { user, dialog, routes } = await previewSingaporeHr(
      run({
        counts: { fetched: 12, created: 0, updated: 1, unchanged: 11, conflicts: 0, errors: 0 },
        previewItems: [
          {
            employeeNo: 'E100021',
            entityCode: 'SG01',
            kind: 'UPDATE',
            field: 'jobTitle',
            before: 'HR Executive',
            after: 'Senior HR Executive',
          },
        ],
      }),
    );
    await within(dialog).findByRole('table', { name: 'Changes the sync would make' });

    // The apply is its own run, which finds that SG HR changed after the preview.
    routes['POST /connectors/sg-hr/sync'] = {
      status: 202,
      body: { data: run({ id: APPLY_RUN_ID, mode: 'APPLY', status: 'QUEUED' }) },
    };
    routes[`GET /sync-runs/${APPLY_RUN_ID}`] = {
      body: {
        data: run({
          id: APPLY_RUN_ID,
          mode: 'APPLY',
          status: 'FAILED',
          counts: { fetched: 12, created: 0, updated: 0, unchanged: 0, conflicts: 0, errors: 1 },
          errors: [
            {
              externalId: null,
              stage: 'LOAD',
              code: 'SOURCE_CHANGED',
              message: 'Attempt 1: The source changed after the preview, so nothing was written',
            },
          ],
        }),
      },
    };
    const slider = within(dialog).getByRole('slider', { name: 'Slide to apply these changes' });
    slider.focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The source system changed after the preview, so nothing was written.',
    );
    expect(within(dialog).queryByText(/Attempt 1/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Preview again' })).toBeEnabled();
  });
});
