import {
  DEFAULT_ROLE_PERMISSIONS,
  type ConnectorDetail,
  type ConnectorSummary,
  type SyncRun,
  type SyncRunStatus,
} from '@huitong/shared';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as Motion from 'motion/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { RealtimeClient } from '@/lib/realtime-client';
import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

import type { ConstellationSceneProps } from './components/scene/constellation-scene';

const browser = vi.hoisted(() => ({ webGl: false, reduceMotion: false, sceneFails: false }));

vi.mock('@/lib/webgl', () => ({ supportsWebGl: () => browser.webGl }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => browser.reduceMotion,
}));
// jsdom cannot draw WebGL, so the scene stands in as a line saying what it was given, or throws
// as a scene whose WebGL context cannot start does.
vi.mock('./components/scene/constellation-scene', () => ({
  ConstellationScene: ({ nodes, running, onOpen }: ConstellationSceneProps) => {
    if (browser.sceneFails) throw new Error('Error creating WebGL context.');
    return (
      <div>
        <p data-testid="scene">
          {running ? 'running' : 'still'}:{' '}
          {nodes.map((node) => `${node.id} ${node.state}`).join(', ')}
        </p>
        <button
          type="button"
          data-testid="pod"
          onClick={() => {
            onOpen('sg-hr');
          }}
        />
      </div>
    );
  },
}));

/** Reports every element as on screen, as a browser does for a scene in view. */
class OnScreenObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element): void {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve(): void {
    // Nothing is tracked.
  }
  disconnect(): void {
    // Nothing is tracked.
  }
}

/** An event stream the test writes to. */
class FakeSource {
  onopen: (() => void) | null = null;
  onmessage: ((message: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  close(): void {
    // Nothing to close.
  }
  emit(event: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(event) }));
  }
}

const SYNCED_AT = '2026-10-20T07:30:09.000Z';
const NO_COUNTS = { fetched: 0, created: 0, updated: 0, unchanged: 0, conflicts: 0, errors: 0 };

function run(connectorId: string, status: SyncRunStatus): SyncRun {
  return {
    id: '0199f0a0-0000-7000-8000-0000000000a1',
    connectorId,
    trigger: 'SCHEDULED',
    mode: 'APPLY',
    status,
    stage: null,
    progress: 100,
    counts: NO_COUNTS,
    attempt: 1,
    triggeredBy: null,
    mappingVersion: 1,
    queuedAt: '2026-10-20T07:30:00.000Z',
    startedAt: '2026-10-20T07:30:01.000Z',
    finishedAt: SYNCED_AT,
  };
}

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
    ...base,
  };
}

const SG_HR = connector({
  id: 'sg-hr',
  name: 'Singapore HR',
  nameZh: '新加坡人力资源系统',
  type: 'SG_HR_REST',
  syncable: true,
  activeMappingVersion: 2,
  lastSyncAt: SYNCED_AT,
  latestRun: run('sg-hr', 'SUCCEEDED'),
});

const CONNECTORS = [
  connector({
    id: 'excel-master',
    name: 'Legacy Excel employee master',
    nameZh: '旧版 Excel 员工主数据',
    type: 'FILE_IMPORT',
    status: 'DEPRECATED',
    isMock: false,
  }),
  SG_HR,
  connector({
    id: 'cn-hq',
    name: 'China HQ SAP HCM',
    nameZh: '集团总部 SAP 人力资源系统',
    type: 'CN_HQ_SAP',
    region: 'CN',
    entityCode: 'CN01',
    status: 'DEGRADED',
    syncable: true,
  }),
  connector({
    id: 'oa',
    name: 'OA approvals platform',
    nameZh: 'OA 审批平台',
    type: 'OA_WEBHOOK',
    region: 'CN',
    entityCode: null,
    status: 'ERROR',
  }),
  connector({
    id: 'dingtalk',
    name: 'DingTalk',
    nameZh: '钉钉',
    type: 'NOTIFICATION',
    region: 'CN',
    entityCode: 'CN01',
    status: 'DRAFT',
  }),
];

const SG_HR_DETAIL: ConnectorDetail = {
  ...SG_HR,
  baseUrl: 'http://localhost:4101',
  config: { pageSize: 100 },
  credentialsRef: 'SG_HR_API_KEY',
  mappingConfigs: [],
};

function routesFor(extra: FakeRoutes = {}): FakeRoutes {
  return {
    'GET /auth/me': { body: { data: sessionFor('HR_SG', [...DEFAULT_ROLE_PERMISSIONS.HR_SG]) } },
    'GET /connectors': { body: { data: CONNECTORS } },
    'GET /connectors/sg-hr': { body: { data: SG_HR_DETAIL } },
    'GET /connectors/sg-hr/sync-runs': {
      body: { data: [], meta: { page: 1, pageSize: 10, total: 0 } },
    },
    'GET /mapping-proposals': { body: { data: [], meta: { page: 1, pageSize: 20, total: 0 } } },
    ...extra,
  };
}

/** The list row for the system with this name. */
function rowOf(name: string): HTMLElement {
  const row = screen.getByRole('link', { name }).closest('li');
  if (!row) throw new Error(`no row for ${name}`);
  return row;
}

// Loading the lazy page once up front keeps a cold run inside the query timeouts.
beforeAll(async () => {
  await import('./integration-map-page');
}, 30_000);

beforeEach(() => {
  browser.webGl = false;
  browser.reduceMotion = false;
  browser.sceneFails = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Integration map list', () => {
  it('lists every system by region, with its state in words and a link to its connector', async () => {
    renderApp('/integration-map', routesFor());
    const singapore = await screen.findByRole('region', { name: 'Singapore' });
    const china = screen.getByRole('region', { name: 'China HQ' });
    expect(
      within(singapore)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Legacy Excel employee master', 'Singapore HR']);
    expect(
      within(china)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['China HQ SAP HCM', 'DingTalk', 'OA approvals platform']);
    expect(screen.getByRole('link', { name: 'Singapore HR' })).toHaveAttribute(
      'href',
      '/connectors/sg-hr',
    );
    for (const [name, state] of [
      ['Singapore HR', 'Connected'],
      ['China HQ SAP HCM', 'Degraded'],
      ['OA approvals platform', 'Error'],
      ['DingTalk', 'Not live'],
      ['Legacy Excel employee master', 'Being retired'],
    ] as const) {
      expect(within(rowOf(name)).getByText(state)).toBeInTheDocument();
    }
  });

  it('names each system type, and when the ones that bring employee data last synced', async () => {
    renderApp('/integration-map', routesFor());
    await screen.findByRole('region', { name: 'Singapore' });
    const singapore = rowOf('Singapore HR');
    expect(singapore).toHaveTextContent('Singapore HR · Last sync');
    expect(within(singapore).getByText(/^Last sync/)).toHaveAttribute('datetime', SYNCED_AT);
    expect(rowOf('China HQ SAP HCM')).toHaveTextContent('China HQ SAP · Not synced yet');
    for (const name of ['OA approvals platform', 'DingTalk']) {
      expect(rowOf(name)).not.toHaveTextContent(/sync/i);
    }
  });

  it('labels the systems a mock stands in for, and only those', async () => {
    renderApp('/integration-map', routesFor());
    await screen.findByRole('region', { name: 'Singapore' });
    expect(within(rowOf('Singapore HR')).getByText('Mock')).toBeInTheDocument();
    expect(
      within(rowOf('Legacy Excel employee master')).queryByText('Mock'),
    ).not.toBeInTheDocument();
  });

  it('tells a screen-reader user what the map shows and where the details are', async () => {
    renderApp('/integration-map', routesFor());
    expect(
      await screen.findByText(
        '5 systems are connected to HuiTong. The list of systems names each one and its state.',
      ),
    ).toBeInTheDocument();
  });

  it('lights a node up as soon as its sync reports progress, in the list and the scene', async () => {
    browser.webGl = true;
    vi.stubGlobal('IntersectionObserver', OnScreenObserver);
    const source = new FakeSource();
    const realtime = new RealtimeClient({ createSource: () => source as unknown as EventSource });
    renderApp('/integration-map', routesFor(), 'en', { realtime });
    await screen.findByRole('region', { name: 'Singapore' });
    expect(await screen.findByTestId('scene')).toHaveTextContent('sg-hr connected');

    act(() => {
      source.emit({
        id: 'event-1',
        type: 'sync.progress',
        occurredAt: '2026-10-20T08:00:00.000Z',
        data: {
          syncRunId: '0199f0a0-0000-7000-8000-0000000000b2',
          connectorId: 'sg-hr',
          mode: 'APPLY',
          status: 'RUNNING',
          stage: 'EXTRACT',
          progress: 10,
          counts: NO_COUNTS,
        },
      });
    });

    expect(within(rowOf('Singapore HR')).getByText('Syncing')).toBeInTheDocument();
    expect(screen.getByTestId('scene')).toHaveTextContent('sg-hr syncing');
  });
});

describe('Integration map scene', () => {
  it('shows the still, and says why, where the browser cannot draw 3D', async () => {
    renderApp('/integration-map', routesFor());
    expect(
      await screen.findByRole('img', { name: /^A still of the integration map/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This browser cannot draw 3D, so a still is shown. The list has the live state of every system.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause motion' })).not.toBeInTheDocument();
  });

  it('runs the scene while it is in view, and pauses it on request', async () => {
    browser.webGl = true;
    vi.stubGlobal('IntersectionObserver', OnScreenObserver);
    const user = userEvent.setup();
    renderApp('/integration-map', routesFor());
    expect(await screen.findByTestId('scene')).toHaveTextContent(/^running:/);

    await user.click(screen.getByRole('button', { name: 'Pause motion' }));
    expect(screen.getByTestId('scene')).toHaveTextContent(/^still:/);
    await user.click(screen.getByRole('button', { name: 'Play motion' }));
    expect(screen.getByTestId('scene')).toHaveTextContent(/^running:/);
  });

  it('shows the still, with nothing to pause, when the scene cannot start', async () => {
    browser.webGl = true;
    browser.sceneFails = true;
    // React reports the error the boundary catches.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderApp('/integration-map', routesFor());
    expect(
      await screen.findByRole('img', { name: /^A still of the integration map/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause motion' })).not.toBeInTheDocument();
  });

  it('keeps the scene still while it is off screen', async () => {
    browser.webGl = true;
    renderApp('/integration-map', routesFor());
    expect(await screen.findByTestId('scene')).toHaveTextContent(/^still:/);
  });

  it('shows a still frame, and says so, when the system asks for reduced motion', async () => {
    browser.webGl = true;
    browser.reduceMotion = true;
    vi.stubGlobal('IntersectionObserver', OnScreenObserver);
    renderApp('/integration-map', routesFor());
    expect(await screen.findByTestId('scene')).toHaveTextContent(/^still:/);
    expect(
      screen.getByText('A still frame: your system asks for reduced motion.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause motion' })).not.toBeInTheDocument();
  });

  it("opens a system's connector when its pod is clicked", async () => {
    browser.webGl = true;
    const user = userEvent.setup();
    renderApp('/integration-map', routesFor());
    await user.click(await screen.findByTestId('pod'));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Singapore HR' }),
    ).toBeInTheDocument();
  });
});

describe('Integration map states', () => {
  it('offers the way to connect a system when none is connected', async () => {
    renderApp('/integration-map', routesFor({ 'GET /connectors': { body: { data: [] } } }));
    expect(await screen.findByText('No system is connected yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to connectors' })).toHaveAttribute(
      'href',
      '/connectors',
    );
  });

  it('reports a failed load with its trace ID and a retry', async () => {
    renderApp(
      '/integration-map',
      routesFor({
        'GET /connectors': {
          status: 503,
          body: {
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Down', traceId: 'trace-map-1' },
          },
        },
      }),
    );
    expect(await screen.findByText('We could not load this')).toBeInTheDocument();
    expect(screen.getByText('trace-map-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('turns away a role that cannot read connectors', async () => {
    renderApp(
      '/integration-map',
      routesFor({
        'GET /auth/me': {
          body: {
            data: sessionFor('HIRING_MANAGER', [...DEFAULT_ROLE_PERMISSIONS.HIRING_MANAGER]),
          },
        },
      }),
    );
    expect(await screen.findByText('You do not have access to this page')).toBeVisible();
  });

  it('names the regions, systems and states in Chinese', async () => {
    renderApp('/integration-map', routesFor(), 'zh-CN');
    const china = await screen.findByRole('region', { name: '中国总部' });
    expect(screen.getByRole('region', { name: '新加坡' })).toBeInTheDocument();
    await waitFor(() => {
      expect(within(rowOf('新加坡人力资源系统')).getByText('已连接')).toBeInTheDocument();
    });
    expect(within(china).getByText('部分异常')).toBeInTheDocument();
    expect(within(china).getByText('错误')).toBeInTheDocument();
    expect(within(rowOf('旧版 Excel 员工主数据')).getByText('正在停用')).toBeInTheDocument();
  });
});
