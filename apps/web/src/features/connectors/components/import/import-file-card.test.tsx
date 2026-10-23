import {
  DEFAULT_ROLE_PERMISSIONS,
  type ConnectorDetail,
  type Role,
  type StagedImport,
  type SyncRunDetail,
} from '@huitong/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

const NOW = '2026-10-20T08:00:00.000Z';

const STAGED: StagedImport = {
  connectorId: 'my-hr',
  fileName: 'my-hr-export.csv',
  rowCount: 12,
  rejectedCount: 1,
  rejectedRows: [{ line: 7, reason: 'NO_EMPLOYEE_NUMBER' }],
  droppedColumns: [
    { header: 'IC Number', reason: 'PROHIBITED' },
    { header: 'Remarks', reason: 'NOT_MAPPED' },
  ],
  mappingVersion: 1,
  stagedAt: NOW,
  expiresAt: '2026-10-20T09:00:00.000Z',
};

function fileConnector(overrides: Partial<ConnectorDetail> = {}): ConnectorDetail {
  return {
    id: 'my-hr',
    name: 'Malaysia HR export',
    nameZh: '马来西亚人力资源导出',
    type: 'FILE_IMPORT',
    region: 'MY',
    entityCode: 'MY01',
    status: 'DRAFT',
    isMock: false,
    capabilities: ['employees.read'],
    syncable: false,
    stagedImport: null,
    lastSyncAt: null,
    lastHealthCheckAt: null,
    lastHealthStatus: null,
    activeMappingVersion: 1,
    latestRun: null,
    baseUrl: null,
    config: {},
    credentialsRef: null,
    mappingConfigs: [],
    ...overrides,
  };
}

const STAGED_CONNECTOR = fileConnector({ stagedImport: STAGED, syncable: true });

const RUN_ID = '0199f0a0-0000-7000-8000-00000000f001';
const PREVIEW_RUN: SyncRunDetail = {
  id: RUN_ID,
  connectorId: 'my-hr',
  trigger: 'MANUAL',
  mode: 'PREVIEW',
  status: 'SUCCEEDED',
  stage: null,
  progress: 100,
  counts: { fetched: 12, created: 12, updated: 0, unchanged: 0, conflicts: 0, errors: 0 },
  attempt: 1,
  triggeredBy: null,
  mappingVersion: 1,
  queuedAt: NOW,
  startedAt: NOW,
  finishedAt: NOW,
  errors: [],
  previewItems: [
    {
      employeeNo: 'E200101',
      entityCode: 'MY01',
      kind: 'CREATE',
      field: null,
      before: null,
      after: null,
    },
  ],
  previewTruncated: false,
};

function routesFor(detail: ConnectorDetail, role: Role = 'HR_SG'): FakeRoutes {
  return {
    'GET /auth/me': { body: { data: sessionFor(role, [...DEFAULT_ROLE_PERMISSIONS[role]]) } },
    'GET /connectors': { body: { data: [detail] } },
    'GET /connectors/my-hr': { body: { data: detail } },
    'GET /connectors/my-hr/sync-runs': {
      body: { data: [], meta: { page: 1, pageSize: 10, total: 0 } },
    },
  };
}

function refusal(status: number, code: string, details: unknown) {
  return {
    status,
    body: { error: { code, message: 'The file was refused', traceId: 'test-trace', details } },
  };
}

const exportFile = () => new File(['Employee No\r\n'], 'my-hr-export.csv', { type: 'text/csv' });

describe('Import a file', () => {
  it('asks for an approved mapping before a file can be imported', async () => {
    renderApp('/connectors/my-hr', routesFor(fileConnector({ activeMappingVersion: null })));
    expect(
      await screen.findByText(
        'Approve a field mapping for this system first: the import reads the file through it.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the mapping wizard' })).toHaveAttribute(
      'href',
      '/connectors/new-mapping',
    );
    expect(screen.queryByLabelText('Export file')).not.toBeInTheDocument();
  });

  it('tells a viewer who cannot propose mappings that HR approves one, with no wizard link', async () => {
    renderApp(
      '/connectors/my-hr',
      routesFor(fileConnector({ activeMappingVersion: null }), 'MANAGEMENT'),
    );
    expect(
      await screen.findByText(
        'No field mapping has been approved for this system yet. HR approves one in the mapping wizard, and then the import reads the file through it.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open the mapping wizard' })).not.toBeInTheDocument();
  });

  it('takes no file for a system being retired', async () => {
    renderApp('/connectors/my-hr', routesFor(fileConnector({ status: 'DEPRECATED' })));
    expect(
      await screen.findByText('This system is being retired, so it takes no file to import.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Export file')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open the mapping wizard' })).not.toBeInTheDocument();
  });

  it('checks the file before it is sent, and sends nothing while it is wrong', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const appended = vi.spyOn(FormData.prototype, 'append');
    renderApp('/connectors/my-hr', routesFor(fileConnector()));
    const stageButton = await screen.findByRole('button', { name: 'Stage the file' });
    await user.click(stageButton);
    expect(screen.getByText('Choose the export file to import.')).toBeInTheDocument();

    await user.upload(
      screen.getByLabelText('Export file'),
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
    );
    expect(screen.getByText('Only .csv and .xlsx files can be read.')).toBeInTheDocument();
    await user.click(stageButton);

    const large = exportFile();
    Object.defineProperty(large, 'size', { value: 5_000_001 });
    await user.upload(screen.getByLabelText('Export file'), large);
    expect(screen.getByText('The file is larger than 5 MB.')).toBeInTheDocument();
    await user.click(stageButton);

    expect(appended).not.toHaveBeenCalled();
    appended.mockRestore();
  });

  it('stages the whole export, then shows what was kept and what was left out', async () => {
    const user = userEvent.setup();
    const appended = vi.spyOn(FormData.prototype, 'append');
    const routes = routesFor(fileConnector());
    renderApp('/connectors/my-hr', routes);
    await user.upload(await screen.findByLabelText('Export file'), exportFile());
    expect(screen.getByText(/^my-hr-export\.csv \(/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument();

    routes['POST /connectors/my-hr/import-file'] = { status: 201, body: { data: STAGED } };
    routes['GET /connectors/my-hr'] = { body: { data: STAGED_CONNECTOR } };
    await user.click(screen.getByRole('button', { name: 'Stage the file' }));

    expect(
      await screen.findByText('12 rows are staged. Sync now previews them.'),
    ).toBeInTheDocument();
    expect(appended).toHaveBeenCalledWith('file', expect.any(File), 'my-hr-export.csv');
    appended.mockRestore();

    const summary = await screen.findByRole('region', { name: 'Staged file' });
    expect(within(summary).getByText('my-hr-export.csv')).toBeInTheDocument();
    expect(within(summary).getByText('12')).toBeInTheDocument();
    expect(within(summary).getByText('Mapping version 1')).toBeInTheDocument();
    expect(within(summary).getByText('1 row was left out:')).toBeInTheDocument();
    expect(within(summary).getByText('Line 7: no employee number')).toBeInTheDocument();
    expect(
      within(summary).getByText(
        'Never kept: “IC Number”. HuiTong does not store national ID numbers or gender.',
      ),
    ).toBeInTheDocument();
    expect(
      within(summary).getByText('Not read by the mapping, so not kept: “Remarks”.'),
    ).toBeInTheDocument();
    // The staged file is ready: Sync now in the header previews it.
    expect(await screen.findByRole('button', { name: 'Sync now' })).toBeInTheDocument();
    expect(screen.getByLabelText('Replace it with another file')).toHaveValue('');
  });

  it('names the columns a refused file is missing, in HR language', async () => {
    const user = userEvent.setup();
    const routes = routesFor(fileConnector());
    routes['POST /connectors/my-hr/import-file'] = refusal(400, 'VALIDATION_FAILED', [
      {
        path: 'file',
        message: 'The file is missing columns',
        problem: 'COLUMNS_MISSING',
        columns: ['Employee No', 'Join Date'],
      },
    ]);
    renderApp('/connectors/my-hr', routes);
    await user.upload(await screen.findByLabelText('Export file'), exportFile());
    await user.click(screen.getByRole('button', { name: 'Stage the file' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The file was not staged');
    expect(alert).toHaveTextContent(
      'The approved mapping reads columns this file does not have: “Employee No” and “Join Date”.',
    );
    expect(screen.queryByText('The file was refused')).not.toBeInTheDocument();

    // The refusal left the picker empty, so picking the corrected file again sends it.
    expect(screen.getByLabelText('Export file')).toHaveValue('');
    routes['POST /connectors/my-hr/import-file'] = { status: 201, body: { data: STAGED } };
    await user.upload(screen.getByLabelText('Export file'), exportFile());
    expect(screen.queryByText('The file was not staged')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stage the file' }));
    expect(
      await screen.findByText('12 rows are staged. Sync now previews them.'),
    ).toBeInTheDocument();
  });

  it('names the limit when an export has too many rows', async () => {
    const user = userEvent.setup();
    const routes = routesFor(fileConnector());
    routes['POST /connectors/my-hr/import-file'] = refusal(400, 'VALIDATION_FAILED', [
      {
        path: 'file',
        message: 'The file has more than 20,000 rows',
        problem: 'TOO_MANY_ROWS',
        limit: 20_000,
      },
    ]);
    renderApp('/connectors/my-hr', routes);
    await user.upload(await screen.findByLabelText('Export file'), exportFile());
    await user.click(screen.getByRole('button', { name: 'Stage the file' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The file has more than 20,000 rows. Split it into smaller files and import each one.',
    );
  });

  it('asks which encoding reads the file correctly, then stages it that way', async () => {
    const user = userEvent.setup();
    const appended = vi.spyOn(FormData.prototype, 'append');
    const routes = routesFor(fileConnector());
    routes['POST /connectors/my-hr/import-file'] = refusal(422, 'SAMPLE_ENCODING_UNCERTAIN', {
      readings: [
        { encoding: 'gb18030', headers: ['员工编号', '姓名'] },
        { encoding: 'utf-8', headers: ['Ô±¹¤±àºÅ', 'ÐÕÃû'] },
      ],
    });
    renderApp('/connectors/my-hr', routes);
    await user.upload(await screen.findByLabelText('Export file'), exportFile());
    await user.click(screen.getByRole('button', { name: 'Stage the file' }));

    const question = await screen.findByRole('region', {
      name: 'Which reading of the file looks right?',
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // No assistant reads an import: the question says HuiTong reads the whole file.
    expect(
      within(question).getByText(
        'This file can be read in two text encodings. Choose the one whose column headers look correct; HuiTong then reads the whole file that way.',
      ),
    ).toBeInTheDocument();
    expect(within(question).queryByText(/assistant/)).not.toBeInTheDocument();
    await user.click(
      within(question).getByRole('radio', { name: /GB18030 or GBK.*员工编号 · 姓名/ }),
    );
    routes['POST /connectors/my-hr/import-file'] = { status: 201, body: { data: STAGED } };
    await user.click(within(question).getByRole('button', { name: 'Read the file this way' }));

    expect(
      await screen.findByText('12 rows are staged. Sync now previews them.'),
    ).toBeInTheDocument();
    expect(appended).toHaveBeenCalledWith('encoding', 'gb18030');
    appended.mockRestore();
  });

  it('discards the staged file, so nothing waits for a preview', async () => {
    const user = userEvent.setup();
    const routes = routesFor(STAGED_CONNECTOR);
    renderApp('/connectors/my-hr', routes);
    await screen.findByRole('region', { name: 'Staged file' });
    expect(
      screen.getByText(
        'Next: Sync now previews what the file would change. Nothing is written until you apply the preview.',
      ),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Sync now' })).toBeInTheDocument();

    routes['DELETE /connectors/my-hr/import-file'] = { status: 204 };
    routes['GET /connectors/my-hr'] = { body: { data: fileConnector() } };
    await user.click(screen.getByRole('button', { name: 'Discard the staged file' }));

    expect(
      await screen.findByText('The staged file was discarded. Nothing was imported from it.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Staged file' })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument();
    // The button went with the summary; focus stayed in the card, on the file picker.
    expect(screen.getByLabelText('Export file')).toHaveFocus();
  });

  it('shows why a discard failed, with the trace ID to quote', async () => {
    const user = userEvent.setup();
    const routes = routesFor(STAGED_CONNECTOR);
    routes['DELETE /connectors/my-hr/import-file'] = refusal(500, 'INTERNAL', undefined);
    renderApp('/connectors/my-hr', routes);
    await user.click(await screen.findByRole('button', { name: 'Discard the staged file' }));
    expect(await screen.findByText('Something went wrong on our side.')).toBeInTheDocument();
    expect(screen.getByText('test-trace')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Staged file' })).toBeInTheDocument();
  });

  it('drops the staged file from the page once it expires, and says so', async () => {
    const soon = new Date(Date.now() + 200).toISOString();
    const routes = routesFor(
      fileConnector({ syncable: true, stagedImport: { ...STAGED, expiresAt: soon } }),
    );
    renderApp('/connectors/my-hr', routes);
    await screen.findByRole('region', { name: 'Staged file' });
    routes['GET /connectors/my-hr'] = { body: { data: fileConnector() } };
    expect(
      await screen.findByText(
        'The staged file was kept for 60 minutes and has been deleted. Stage it again to import it.',
        undefined,
        { timeout: 4_000 },
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Staged file' })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument();
  });

  it('drops Sync now and the staged file once the import is applied, with focus kept on the page', async () => {
    const user = userEvent.setup();
    const routes = routesFor(STAGED_CONNECTOR);
    routes['POST /connectors/my-hr/sync'] = {
      status: 202,
      body: { data: { ...PREVIEW_RUN, status: 'QUEUED' } },
    };
    routes[`GET /sync-runs/${RUN_ID}`] = { body: { data: PREVIEW_RUN } };
    renderApp('/connectors/my-hr', routes);
    await user.click(await screen.findByRole('button', { name: 'Sync now' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Preview changes' }));
    const slider = await within(dialog).findByRole('slider', {
      name: 'Slide to apply these changes',
    });

    // The apply uses up the file and makes the draft connector active.
    const applied = fileConnector({ status: 'ACTIVE' });
    routes['GET /connectors/my-hr'] = { body: { data: applied } };
    routes['GET /connectors'] = { body: { data: [applied] } };
    slider.focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');
    expect(
      await within(dialog).findByText(
        'The previewed changes are in the employee master, and each one is in the audit log.',
      ),
    ).toBeInTheDocument();
    const [, footerClose] = within(dialog).getAllByRole('button', { name: 'Close' });
    await user.click(footerClose as HTMLElement);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // No live updates in this test: the page asked again when the run finished.
    expect(screen.queryByRole('region', { name: 'Staged file' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    // Sync now went away with the file, so focus moved to the page, not the document body.
    expect(document.getElementById('main')).toHaveFocus();
  });

  it('asks for the file again when the mapping changed after it was staged', async () => {
    renderApp(
      '/connectors/my-hr',
      routesFor(fileConnector({ activeMappingVersion: 2, stagedImport: STAGED })),
    );
    expect(
      await screen.findByText(
        'Mapping version 1 read this file, but a newer version is active now. Stage the file again to import it.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Next: Sync now previews/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stage the file' })).toBeEnabled();
  });

  it('shows the staged file, without import controls, to a viewer who may not sync', async () => {
    renderApp('/connectors/my-hr', routesFor(STAGED_CONNECTOR, 'MANAGEMENT'));
    await screen.findByRole('region', { name: 'Staged file' });
    expect(
      screen.getByText('Only people with permission to sync employees can import a file.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Replace it with another file')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Discard the staged file' }),
    ).not.toBeInTheDocument();
  });

  it('summarises the staged file in Chinese', async () => {
    renderApp('/connectors/my-hr', routesFor(STAGED_CONNECTOR), 'zh-CN');
    const summary = await screen.findByRole('region', { name: '暂存的文件' });
    expect(within(summary).getByText('待预览的行')).toBeInTheDocument();
    expect(within(summary).getByText('映射第 1 版')).toBeInTheDocument();
    expect(within(summary).getByText('有 1 行未被采用：')).toBeInTheDocument();
    expect(within(summary).getByText('第 7 行：没有员工编号')).toBeInTheDocument();
    expect(
      within(summary).getByText('一律不保留：“IC Number”。汇通不存储身份证件号码或性别。'),
    ).toBeInTheDocument();
  });

  it('says why no row of a file could be kept, by reason with its first line', async () => {
    const user = userEvent.setup();
    const routes = routesFor(fileConnector());
    routes['POST /connectors/my-hr/import-file'] = refusal(400, 'VALIDATION_FAILED', [
      {
        path: 'file',
        message: 'No row of the file can be imported',
        problem: 'NO_ROWS_KEPT',
        reasons: [
          { reason: 'INVALID_EMPLOYEE_NUMBER', count: 12, firstLine: 2 },
          { reason: 'MISSING_CELLS', count: 1, firstLine: 9 },
        ],
      },
    ]);
    renderApp('/connectors/my-hr', routes);
    await user.upload(await screen.findByLabelText('Export file'), exportFile());
    await user.click(screen.getByRole('button', { name: 'Stage the file' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'No row of the file can be imported. Correct these rows and stage the file again:',
    );
    expect(alert).toHaveTextContent(
      'Line 2: the employee number is not in the form E123456 (and 11 more rows like it)',
    );
    expect(alert).toHaveTextContent(
      'Line 9: fewer values than headers, so its cells may have shifted',
    );
  });

  it('keeps the chosen file when staging fails for a reason that is not the file', async () => {
    const user = userEvent.setup();
    const appended = vi.spyOn(FormData.prototype, 'append');
    const routes = routesFor(fileConnector());
    routes['POST /connectors/my-hr/import-file'] = refusal(409, 'SYNC_IN_PROGRESS', undefined);
    renderApp('/connectors/my-hr', routes);
    await user.upload(await screen.findByLabelText('Export file'), exportFile());
    await user.click(screen.getByRole('button', { name: 'Stage the file' }));
    expect(
      await screen.findByText(
        'A sync of this system is already running. Wait for it to finish, then try again.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Export file')).not.toHaveValue('');

    routes['POST /connectors/my-hr/import-file'] = { status: 201, body: { data: STAGED } };
    await user.click(screen.getByRole('button', { name: 'Stage the file' }));
    expect(
      await screen.findByText('12 rows are staged. Sync now previews them.'),
    ).toBeInTheDocument();
    expect(appended.mock.calls.filter(([name]) => name === 'file')).toHaveLength(2);
    appended.mockRestore();
  });

  it('tells HR to correct and stage the file again when its preview can apply nothing', async () => {
    const user = userEvent.setup();
    const routes = routesFor(STAGED_CONNECTOR);
    const failedRun: SyncRunDetail = {
      ...PREVIEW_RUN,
      status: 'FAILED',
      counts: { fetched: 2, created: 0, updated: 0, unchanged: 0, conflicts: 0, errors: 2 },
      previewItems: [],
      errors: ['E200101', 'E200102'].map((externalId) => ({
        externalId,
        stage: 'VALIDATE' as const,
        code: 'VALIDATION_FAILED',
        message: 'jobTitle: Invalid input',
      })),
    };
    routes['POST /connectors/my-hr/sync'] = {
      status: 202,
      body: { data: { ...failedRun, status: 'QUEUED' } },
    };
    routes[`GET /sync-runs/${RUN_ID}`] = { body: { data: failedRun } };
    renderApp('/connectors/my-hr', routes);
    await user.click(await screen.findByRole('button', { name: 'Sync now' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Preview changes' }));
    expect(
      await within(dialog).findByText(
        "Every row has an error, so nothing can be applied. Correct the export, stage it again on the connector's page, then preview.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('region', { name: 'Records with errors' })).toHaveTextContent(
      'E200101 and E200102',
    );
    // Previewing again would read the same file: the file has to be corrected first.
    expect(within(dialog).queryByRole('button', { name: 'Preview again' })).not.toBeInTheDocument();
  });

  it('says a file preview with only errors left can apply nothing, in file terms', async () => {
    const user = userEvent.setup();
    const routes = routesFor(STAGED_CONNECTOR);
    const partRun: SyncRunDetail = {
      ...PREVIEW_RUN,
      status: 'PARTIAL',
      counts: { fetched: 12, created: 0, updated: 0, unchanged: 11, conflicts: 0, errors: 1 },
      previewItems: [],
      errors: [
        {
          externalId: 'E200105',
          stage: 'VALIDATE',
          code: 'VALIDATION_FAILED',
          message: 'jobTitle: Invalid input',
        },
      ],
    };
    routes['POST /connectors/my-hr/sync'] = {
      status: 202,
      body: { data: { ...partRun, status: 'QUEUED' } },
    };
    routes[`GET /sync-runs/${RUN_ID}`] = { body: { data: partRun } };
    renderApp('/connectors/my-hr', routes);
    await user.click(await screen.findByRole('button', { name: 'Sync now' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Preview changes' }));
    expect(
      await within(dialog).findByText(
        'Nothing can be applied: the other rows match the employee master. Correct the rows with errors in the export, stage it again, then preview.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('slider')).not.toBeInTheDocument();
  });
});
