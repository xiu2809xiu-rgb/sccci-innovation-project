import { useMatch } from 'react-router';

import { AiUsagePage } from './pages/ai-usage-page';
import { ClickstreamPage } from './pages/clickstream-page';
import { ObservabilityPage } from './pages/observability-page';

/**
 * The monitoring dashboards (area 4): observability, clickstream and AI usage.
 * One lazy route module, so Recharts loads only with these pages. The figures
 * are typed sample data until area 4 builds the aggregations, and say so.
 */
export function AnalyticsPage() {
  const clickstream = useMatch('/analytics/clickstream');
  const aiUsage = useMatch('/analytics/ai-usage');
  if (clickstream) return <ClickstreamPage />;
  if (aiUsage) return <AiUsagePage />;
  return <ObservabilityPage />;
}
