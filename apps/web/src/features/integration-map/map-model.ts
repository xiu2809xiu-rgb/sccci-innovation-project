import type { ConnectorSummary, SyncRunStatus } from '@huitong/shared';

/**
 * What a system node shows: connected and working, a sync running, working
 * with problems, a failure, nothing live, or on its way out.
 */
export const NODE_STATES = [
  'connected',
  'syncing',
  'degraded',
  'error',
  'idle',
  'retiring',
] as const;

export type NodeState = (typeof NODE_STATES)[number];

/** The two regional clusters; anything else (a new subsidiary's system) joins a third. */
export const CLUSTERS = ['SG', 'CN', 'OTHER'] as const;

export type Cluster = (typeof CLUSTERS)[number];

export type Vec3 = readonly [number, number, number];

/** One system on the map: its connector, its region's cluster and its state. */
export interface MapNode {
  id: string;
  connector: ConnectorSummary;
  cluster: Cluster;
  state: NodeState;
}

/** A system the scene draws a pod for, and where the pod stands. */
export interface PlacedNode extends MapNode {
  position: Vec3;
}

/** A cluster as the scene draws it: the pods on its platform, and how many systems only the list shows. */
export interface ClusterLayout {
  cluster: Cluster;
  centre: Vec3;
  pods: PlacedNode[];
  hidden: number;
}

/** A sync run that has not finished yet. */
const RUNNING: readonly SyncRunStatus[] = ['QUEUED', 'RUNNING'];

/**
 * A node's state from its connector and, when a live event has arrived, the
 * latest run status it reported. A deprecated system (the Excel master) is
 * retiring whatever its runs say; a failure outranks a partial run, and both
 * outrank an earlier success.
 */
export function nodeState(connector: ConnectorSummary, liveRun?: SyncRunStatus): NodeState {
  if (connector.status === 'DEPRECATED') return 'retiring';
  if (connector.status === 'DRAFT' || connector.status === 'DISABLED') return 'idle';
  const run = liveRun ?? connector.latestRun?.status;
  if (run !== undefined && RUNNING.includes(run)) return 'syncing';
  if (connector.status === 'ERROR' || run === 'FAILED' || connector.lastHealthStatus === 'FAILED') {
    return 'error';
  }
  if (connector.status === 'DEGRADED' || run === 'PARTIAL') return 'degraded';
  return 'connected';
}

function clusterOf(connector: ConnectorSummary): Cluster {
  return connector.region === 'SG' || connector.region === 'CN' ? connector.region : 'OTHER';
}

/** Every system with its cluster and state, by cluster and then id: the order the list shows. */
export function mapNodes(
  connectors: readonly ConnectorSummary[],
  live: ReadonlyMap<string, SyncRunStatus> = new Map(),
): MapNode[] {
  return connectors
    .map((connector) => ({
      id: connector.id,
      connector,
      cluster: clusterOf(connector),
      state: nodeState(connector, live.get(connector.id)),
    }))
    .sort(
      (a, b) =>
        CLUSTERS.indexOf(a.cluster) - CLUSTERS.indexOf(b.cluster) || a.id.localeCompare(b.id),
    );
}

/**
 * Each cluster's centre: Singapore to the left of the core, China HQ to the
 * right, others behind it, raised and set back so the core does not hide them.
 */
export const CLUSTER_CENTRES: Readonly<Record<Cluster, Vec3>> = {
  SG: [-3.4, 0, 0.4],
  CN: [3.4, 0, 0.4],
  OTHER: [0, 1.1, -5.2],
};

/** How far a cluster's pods stand from its centre. */
const CLUSTER_RADIUS = 1.05;

/** The pods one platform holds; the list beside the scene has every system. */
export const PODS_PER_CLUSTER = 6;

/** Which systems get the pods when a cluster has more than fit: problems first, so none is hidden. */
const PRIORITY: Readonly<Record<NodeState, number>> = {
  error: 0,
  degraded: 1,
  syncing: 2,
  connected: 3,
  idle: 4,
  retiring: 5,
};

const byId = (a: MapNode, b: MapNode) => a.id.localeCompare(b.id);

/**
 * Places each cluster's pods on a circle around its centre, in id order, so
 * the same systems always land in the same places.
 */
export function layoutClusters(nodes: readonly MapNode[]): ClusterLayout[] {
  return CLUSTERS.flatMap((cluster) => {
    const members = nodes.filter((node) => node.cluster === cluster);
    if (members.length === 0) return [];
    const shown = [...members]
      .sort((a, b) => PRIORITY[a.state] - PRIORITY[b.state] || byId(a, b))
      .slice(0, PODS_PER_CLUSTER)
      .sort(byId);
    const centre = CLUSTER_CENTRES[cluster];
    const [cx, cy, cz] = centre;
    // A lone pod stands at the centre; two or more share the circle evenly, the first at the front.
    const radius = shown.length === 1 ? 0 : CLUSTER_RADIUS;
    const pods = shown.map((node, index) => {
      const angle = (index / shown.length) * Math.PI * 2 + Math.PI / 2;
      const position: Vec3 = [
        cx + Math.cos(angle) * radius,
        cy + 0.35,
        cz + Math.sin(angle) * radius,
      ];
      return { ...node, position };
    });
    return [{ cluster, centre, pods, hidden: members.length - shown.length }];
  });
}

/** The arc from a pod to the core: a quadratic curve that rises between them. */
export function arcMidpoint(from: Vec3, to: Vec3 = [0, 0, 0], lift = 1.6): Vec3 {
  return [(from[0] + to[0]) / 2, Math.max(from[1], to[1]) + lift, (from[2] + to[2]) / 2];
}
