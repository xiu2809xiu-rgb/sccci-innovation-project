import type { ConnectorSummary } from '@huitong/shared';
import { describe, expect, it } from 'vitest';

import {
  arcMidpoint,
  CLUSTER_CENTRES,
  layoutClusters,
  mapNodes,
  nodeState,
  PODS_PER_CLUSTER,
} from './map-model';

function connector(overrides: Partial<ConnectorSummary> & { id: string }): ConnectorSummary {
  return {
    name: overrides.id,
    nameZh: overrides.id,
    type: 'SG_HR_REST',
    region: 'SG',
    entityCode: 'SG01',
    status: 'ACTIVE',
    isMock: true,
    capabilities: [],
    syncable: true,
    lastSyncAt: null,
    lastHealthCheckAt: null,
    lastHealthStatus: null,
    activeMappingVersion: 1,
    latestRun: null,
    ...overrides,
  };
}

const run = (status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'PARTIAL' | 'FAILED') =>
  ({ status }) as unknown as ConnectorSummary['latestRun'];

describe('nodeState', () => {
  it('shows a deprecated system as retiring, whatever its runs say', () => {
    expect(
      nodeState(connector({ id: 'excel', status: 'DEPRECATED', latestRun: run('FAILED') })),
    ).toBe('retiring');
  });

  it('shows a draft or disabled system as idle', () => {
    expect(nodeState(connector({ id: 'a', status: 'DRAFT' }))).toBe('idle');
    expect(nodeState(connector({ id: 'b', status: 'DISABLED' }))).toBe('idle');
  });

  it('shows a run that has not finished as syncing, and a live event over the stored run', () => {
    expect(nodeState(connector({ id: 'a', latestRun: run('RUNNING') }))).toBe('syncing');
    expect(nodeState(connector({ id: 'a', latestRun: run('SUCCEEDED') }), 'QUEUED')).toBe(
      'syncing',
    );
    expect(nodeState(connector({ id: 'a', latestRun: run('RUNNING') }), 'SUCCEEDED')).toBe(
      'connected',
    );
  });

  it('shows a failure from the run, the connector or its health check as an error', () => {
    expect(nodeState(connector({ id: 'a', latestRun: run('FAILED') }))).toBe('error');
    expect(nodeState(connector({ id: 'b', status: 'ERROR' }))).toBe('error');
    expect(nodeState(connector({ id: 'c', lastHealthStatus: 'FAILED' }))).toBe('error');
  });

  it('shows a degraded system or a partial run as degraded, and a failure over both', () => {
    expect(nodeState(connector({ id: 'a', status: 'DEGRADED' }))).toBe('degraded');
    expect(nodeState(connector({ id: 'b', latestRun: run('PARTIAL') }))).toBe('degraded');
    expect(nodeState(connector({ id: 'c', status: 'DEGRADED', lastHealthStatus: 'FAILED' }))).toBe(
      'error',
    );
    expect(nodeState(connector({ id: 'd', status: 'DEGRADED' }), 'RUNNING')).toBe('syncing');
  });

  it('shows a healthy system whose last run succeeded, or that has not run, as connected', () => {
    expect(nodeState(connector({ id: 'a', latestRun: run('SUCCEEDED') }))).toBe('connected');
    expect(nodeState(connector({ id: 'b' }))).toBe('connected');
  });
});

describe('mapNodes', () => {
  const systems = [
    connector({ id: 'sg-hr', region: 'SG' }),
    connector({ id: 'oa', region: 'CN' }),
    connector({ id: 'cn-hq', region: 'CN' }),
    connector({ id: 'my-hr', region: 'MY' }),
  ];

  it('orders systems by cluster and then id, with any other region in a third cluster', () => {
    expect(mapNodes(systems).map((node) => [node.id, node.cluster])).toEqual([
      ['sg-hr', 'SG'],
      ['cn-hq', 'CN'],
      ['oa', 'CN'],
      ['my-hr', 'OTHER'],
    ]);
  });

  it('applies live run states', () => {
    const [singapore] = mapNodes(systems, new Map([['sg-hr', 'RUNNING']]));
    expect(singapore?.state).toBe('syncing');
  });
});

describe('layoutClusters', () => {
  const systems = mapNodes([
    connector({ id: 'sg-hr', region: 'SG' }),
    connector({ id: 'cn-hq', region: 'CN' }),
    connector({ id: 'oa', region: 'CN' }),
  ]);

  it('draws a platform only for a cluster that has systems', () => {
    expect(layoutClusters(systems).map((layout) => layout.cluster)).toEqual(['SG', 'CN']);
  });

  it('puts the same systems in the same places, whatever order they arrive in', () => {
    expect(layoutClusters([...systems].reverse())).toEqual(layoutClusters(systems));
  });

  it('stands a lone pod at its cluster centre and spreads two around it', () => {
    const [singapore, china] = layoutClusters(systems);
    const [lone] = singapore?.pods ?? [];
    expect(lone?.position[0]).toBeCloseTo(CLUSTER_CENTRES.SG[0]);
    expect(lone?.position[2]).toBeCloseTo(CLUSTER_CENTRES.SG[2]);
    const [cx, , cz] = CLUSTER_CENTRES.CN;
    const pods = china?.pods ?? [];
    for (const pod of pods) {
      const [x, , z] = pod.position;
      expect(Math.hypot(x - cx, z - cz)).toBeCloseTo(1.05);
    }
    expect(pods[0]?.position).not.toEqual(pods[1]?.position);
  });

  it("gives a crowded platform's pods to the systems with problems first, and counts the rest", () => {
    const crowd = mapNodes([
      ...Array.from({ length: PODS_PER_CLUSTER + 2 }, (_, index) =>
        connector({ id: `draft-${String(index)}`, region: 'MY', status: 'DRAFT' }),
      ),
      connector({ id: 'zz-failing', region: 'MY', status: 'ERROR' }),
    ]);
    const [other] = layoutClusters(crowd);
    expect(other?.pods).toHaveLength(PODS_PER_CLUSTER);
    expect(other?.hidden).toBe(3);
    expect(other?.pods.map((pod) => pod.id)).toContain('zz-failing');
  });
});

describe('arcMidpoint', () => {
  it('rises above both ends, halfway between them', () => {
    const [x, y, z] = arcMidpoint([-4, 0.35, 0], [0, 0, 0]);
    expect(x).toBeCloseTo(-2);
    expect(y).toBeCloseTo(1.95);
    expect(z).toBeCloseTo(0);
  });
});
