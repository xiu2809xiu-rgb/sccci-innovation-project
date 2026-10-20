import { AnalyticsTracker } from '@/lib/analytics-tracker';
import { ApiClient } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';
import { RealtimeClient } from '@/lib/realtime-client';
import { createI18n } from '@/i18n/create-i18n';

import { usePreferences } from './preferences/preferences-store';
import type { AppDependencies } from './providers/dependencies-context';
import { createAppRouter } from './router';
import { SESSION_QUERY_KEY, sessionEnvelopeSchema } from './session/session-query';

/**
 * Builds the app's services and router once. The API client reports an expired
 * session through a callback that is wired to the router after both exist.
 */
export function bootstrap(): {
  dependencies: AppDependencies;
  router: ReturnType<typeof createAppRouter>;
} {
  const queryClient = createQueryClient();
  const preferences = usePreferences.getState();
  let onSessionExpired: () => void = () => undefined;

  const api = new ApiClient({
    onSessionExpired: () => {
      onSessionExpired();
    },
  });
  const analytics = new AnalyticsTracker({
    hasConsent: () => usePreferences.getState().analyticsConsent,
    context: () => ({
      locale: usePreferences.getState().language,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    }),
  });
  // A dropped stream is often an expired access cookie: touching the API refreshes it first.
  const realtime = new RealtimeClient({
    beforeReconnect: () => api.get('/auth/me', sessionEnvelopeSchema),
  });
  const i18n = createI18n(preferences.language);
  const dependencies: AppDependencies = { api, queryClient, analytics, realtime, i18n };
  const router = createAppRouter(dependencies);

  onSessionExpired = () => {
    // Only a session that existed can expire; anonymous visitors are handled by the route loaders.
    if (queryClient.getQueryData(SESSION_QUERY_KEY) !== undefined) {
      queryClient.clear();
      void router.navigate('/login?reason=expired');
    }
  };

  analytics.start();
  return { dependencies, router };
}
