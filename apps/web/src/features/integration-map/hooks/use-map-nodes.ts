import { REALTIME_EVENTS, syncProgressEventSchema, type SyncRunStatus } from '@huitong/shared';
import { useMemo, useState } from 'react';

import { useRealtimeEvents } from '@/app/providers/dependencies-context';
import { useConnectors, useLiveConnectors } from '@/features/connectors/api/connector-queries';

import { mapNodes } from '../map-model';

/** A run's status from a progress event, and when the event arrived (this browser's clock). */
interface LiveRun {
  status: SyncRunStatus;
  receivedAt: number;
}

/**
 * The map's nodes: the connectors, by region, with each one's state kept
 * live. A sync's progress events light its node at once; the list is
 * refetched when the run finishes, and from then on the stored state wins,
 * so an event missed while offline never leaves a node stuck.
 */
export function useMapNodes() {
  const connectors = useConnectors();
  useLiveConnectors();
  const [live, setLive] = useState<ReadonlyMap<string, LiveRun>>(new Map());

  useRealtimeEvents((event) => {
    if (event.type !== REALTIME_EVENTS.syncProgress) return;
    const progress = syncProgressEventSchema.safeParse(event.data);
    if (!progress.success) return;
    const run = { status: progress.data.status, receivedAt: Date.now() };
    setLive((current) => new Map(current).set(progress.data.connectorId, run));
  });

  const { data, dataUpdatedAt } = connectors;
  const nodes = useMemo(() => {
    if (!data) return [];
    const newer = new Map<string, SyncRunStatus>();
    for (const [connectorId, run] of live) {
      if (run.receivedAt >= dataUpdatedAt) newer.set(connectorId, run.status);
    }
    return mapNodes(data, newer);
  }, [data, dataUpdatedAt, live]);
  return { query: connectors, nodes };
}
