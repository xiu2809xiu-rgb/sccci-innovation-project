import { DASHBOARD_WINDOWS } from '@huitong/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { MockBadge } from '@/components/common/mock-badge';
import { PageHeader } from '@/components/common/page-header';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { RubberSegment } from '@/components/reactbits/rubber-segment';

import { useWindowParam } from '../hooks/use-window-param';
import { AnalyticsNav } from './analytics-nav';

const isWindow = (value: string): value is (typeof DASHBOARD_WINDOWS)[number] =>
  (DASHBOARD_WINDOWS as readonly string[]).includes(value);

/**
 * The anatomy every dashboard shares: header, the three dashboards, then the
 * time window in one row above everything it scopes, so the figures agree.
 */
export function AnalyticsShell({
  title,
  description,
  sample,
  children,
}: {
  title: string;
  description: string;
  /** True when the API labels the figures as typed sample data. */
  sample: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation('analytics');
  const [days, setDays] = useWindowParam();

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        meta={
          <>
            <SyntheticDataBadge />
            {sample ? <MockBadge kind="data" /> : null}
          </>
        }
      />
      <AnalyticsNav />
      <RubberSegment
        aria-label={t('window.label')}
        size="sm"
        value={days}
        items={DASHBOARD_WINDOWS.map((window) => ({ value: window, label: t(`window.${window}`) }))}
        onChange={(value) => {
          if (isWindow(value)) setDays(value);
        }}
      />
      {children}
    </div>
  );
}
