import {
  DEFAULT_ROLE_PERMISSIONS,
  type ConnectorDetail,
  type ConnectorSummary,
} from '@huitong/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

const NOW = '2026-10-20T08:00:00.000Z';

function connector(
  base: Pick<ConnectorSummary, 'id' | 'name' | 'nameZh' | 'type'> & Partial<ConnectorSummary>,
): ConnectorSummary {
  return {
    region: 'SG',
    entityCode: 'SG01',
    status: 'ACTIVE',
    isMock: true,
    capabilities: [],
    syncable: false,
    lastSyncAt: null,
    lastHealthCheckAt: null,
    lastHealthStatus: null,
    activeMappingVersion: null,
    latestRun: null,
    stagedImport: null,
    ...base,
  };
}

// In the API's order (region, then id), which puts the retired Excel master first.
const CONNECTORS = [
  connector({
    id: 'excel-master',
    name: 'Legacy Excel employee master',
    nameZh: '旧版 Excel 员工主数据',
    type: 'FILE_IMPORT',
    status: 'DEPRECATED',
    isMock: false,
    activeMappingVersion: 1,
  }),
  connector({
    id: 'sg-hr',
    name: 'Singapore HR',
    nameZh: '新加坡人力资源系统',
    type: 'SG_HR_REST',
    syncable: true,
    activeMappingVersion: 2,
  }),
  connector({ id: 'teams', name: 'Microsoft Teams', nameZh: '微软 Teams', type: 'NOTIFICATION' }),
  connector({
    id: 'cn-hq',
    name: 'China HQ SAP HCM',
    nameZh: '集团总部 SAP 人力资源系统',
    type: 'CN_HQ_SAP',
    region: 'CN',
    entityCode: 'CN01',
    status: 'DEGRADED',
    syncable: true,
    activeMappingVersion: 1,
  }),
  connector({
    id: 'oa',
    name: 'OA approvals platform',
    nameZh: 'OA 审批平台',
    type: 'OA_WEBHOOK',
    region: 'CN',
    entityCode: null,
  }),
];

const SG_HR: ConnectorDetail = {
  ...connector({
    id: 'sg-hr',
    name: 'Singapore HR',
    nameZh: '新加坡人力资源系统',
    type: 'SG_HR_REST',
    syncable: true,
  }),
  baseUrl: 'http://localhost:4101',
  config: { pageSize: 100 },
  credentialsRef: 'SG_HR_API_KEY',
  mappingConfigs: [],
};

function routesFor(extra: FakeRoutes = {}): FakeRoutes {
  return {
    'GET /auth/me': { body: { data: sessionFor('HR_SG', [...DEFAULT_ROLE_PERMISSIONS.HR_SG]) } },
    'GET /connectors': { body: { data: CONNECTORS } },
    'GET /mapping-proposals': { body: { data: [], meta: { page: 1, pageSize: 20, total: 0 } } },
    'GET /connectors/sg-hr': { body: { data: SG_HR } },
    'GET /connectors/sg-hr/sync-runs': {
      body: { data: [], meta: { page: 1, pageSize: 10, total: 0 } },
    },
    ...extra,
  };
}

function cardOf(name: string): HTMLElement {
  const card = screen.getByRole('heading', { name }).closest('li');
  if (!card) throw new Error(`no card for ${name}`);
  return card;
}

describe('Connector list', () => {
  it('puts live systems first and the system being retired last', async () => {
    renderApp('/connectors', routesFor());
    const list = await screen.findByRole('region', { name: 'Connected systems' });
    const names = within(list)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(names).toEqual([
      'Singapore HR',
      'China HQ SAP HCM',
      'OA approvals platform',
      'Microsoft Teams',
      'Legacy Excel employee master',
    ]);
  });

  it('shows sync and mapping details only where employee data comes in', async () => {
    renderApp('/connectors', routesFor());
    await screen.findByRole('region', { name: 'Connected systems' });
    expect(within(cardOf('Singapore HR')).getByText('Version 2')).toBeInTheDocument();
    expect(within(cardOf('Microsoft Teams')).queryByText('Field mapping')).not.toBeInTheDocument();
    expect(
      within(cardOf('OA approvals platform')).queryByText('Last sync'),
    ).not.toBeInTheDocument();
  });

  it('labels every system a mock stands in for, and only those', async () => {
    renderApp('/connectors', routesFor());
    await screen.findByRole('region', { name: 'Connected systems' });
    for (const name of [
      'Singapore HR',
      'China HQ SAP HCM',
      'OA approvals platform',
      'Microsoft Teams',
    ]) {
      expect(within(cardOf(name)).getByText('Mock')).toBeInTheDocument();
    }
    expect(
      within(cardOf('Legacy Excel employee master')).queryByText('Mock'),
    ).not.toBeInTheDocument();
  });

  it('reports a health check in the UI language, not the server message', async () => {
    const user = userEvent.setup();
    renderApp(
      '/connectors',
      routesFor({
        'POST /connectors/cn-hq/health-check': {
          body: {
            data: {
              status: 'FAILED',
              latencyMs: 5000,
              checkedAt: NOW,
              message: 'Did not respond as expected',
            },
          },
        },
      }),
      'zh-CN',
    );
    const card = await waitFor(() => cardOf('集团总部 SAP 人力资源系统'));
    await user.click(within(card).getByRole('button', { name: '立即检查' }));
    expect(await screen.findByText('集团总部 SAP 人力资源系统没有响应。')).toBeInTheDocument();
    expect(
      screen.getByText('该系统未按预期响应。请确认系统正在运行，然后重试。'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Did not respond as expected')).not.toBeInTheDocument();
  });
});

describe('Connector detail', () => {
  it('opens Run sync with this system already chosen', async () => {
    const user = userEvent.setup();
    renderApp('/connectors/sg-hr', routesFor());
    await user.click(await screen.findByRole('button', { name: 'Sync now' }));
    const dialog = await screen.findByRole('dialog', { name: 'Choose a system to sync' });
    expect(await within(dialog).findByRole('radio', { name: /Singapore HR/ })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: /China HQ SAP HCM/ })).toBeDisabled();
  });

  it('leaves out sync history and mappings for a system that brings no employee data', async () => {
    renderApp(
      '/connectors/teams',
      routesFor({
        'GET /connectors/teams': {
          body: {
            data: {
              ...connector({
                id: 'teams',
                name: 'Microsoft Teams',
                nameZh: '微软 Teams',
                type: 'NOTIFICATION',
              }),
              baseUrl: null,
              config: {},
              credentialsRef: null,
              mappingConfigs: [],
            },
          },
        },
      }),
    );
    expect(await screen.findByText('Connection settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mock' })).toBeInTheDocument();
    expect(screen.queryByText('Sync history')).not.toBeInTheDocument();
    expect(screen.queryByText('Field mapping versions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument();
  });
});
