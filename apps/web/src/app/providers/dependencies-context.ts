import type { RealtimeEvent } from '@huitong/shared';
import type { QueryClient } from '@tanstack/react-query';
import type { i18n } from 'i18next';
import { createContext, useContext, useEffect, useEffectEvent, useSyncExternalStore } from 'react';

import type { AnalyticsTracker } from '@/lib/analytics-tracker';
import type { ApiClient } from '@/lib/api-client';
import type { RealtimeClient, RealtimeState } from '@/lib/realtime-client';

/** The long-lived services the app is built from, created once in bootstrap.ts and passed down. */
export interface AppDependencies {
  api: ApiClient;
  queryClient: QueryClient;
  analytics: AnalyticsTracker;
  realtime: RealtimeClient;
  i18n: i18n;
}

export const DependenciesContext = createContext<AppDependencies | null>(null);

function useDependencies(): AppDependencies {
  const dependencies = useContext(DependenciesContext);
  if (!dependencies) {
    throw new Error('This component must be rendered inside <AppProviders>.');
  }
  return dependencies;
}

/** The API client: the only way features call the server. */
export function useApiClient(): ApiClient {
  return useDependencies().api;
}

/** The first-party clickstream tracker (collects nothing without consent). */
export function useAnalytics(): AnalyticsTracker {
  return useDependencies().analytics;
}

/** The shared live-event connection. */
export function useRealtime(): RealtimeClient {
  return useDependencies().realtime;
}

/** The live connection's state, for indicators and for polling when live updates are down. */
export function useRealtimeState(): RealtimeState {
  const realtime = useRealtime();
  return useSyncExternalStore(
    (onChange) => realtime.onStateChange(onChange),
    () => realtime.currentState,
  );
}

/** Calls `listener` for every live event while the component is mounted (one shared connection). */
export function useRealtimeEvents(listener: (event: RealtimeEvent) => void): void {
  const realtime = useRealtime();
  const onEvent = useEffectEvent(listener);
  useEffect(
    () =>
      realtime.subscribe((event) => {
        onEvent(event);
      }),
    [realtime],
  );
}
