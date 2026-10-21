import type { ObservabilityDashboard, ServiceState } from '@huitong/shared';
import { CircleAlert, CircleCheck, CircleX, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { StatusBadge, type StatusTone } from '@/components/common/status-badge';
import { useFormatters } from '@/hooks/use-formatters';

const STATE_STYLE: Readonly<Record<ServiceState, { tone: StatusTone; icon: LucideIcon }>> = {
  UP: { tone: 'success', icon: CircleCheck },
  DEGRADED: { tone: 'warning', icon: CircleAlert },
  DOWN: { tone: 'danger', icon: CircleX },
};

/** Each dependency with its state (icon and word, never colour alone) and how fast it answers. */
export function ServiceHealth({ services }: { services: ObservabilityDashboard['services'] }) {
  const { t } = useTranslation('analytics');
  const format = useFormatters();
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {services.map((service) => {
        const { tone, icon: Icon } = STATE_STYLE[service.state];
        return (
          <li
            key={service.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
          >
            <span className="flex flex-col">
              <code className="font-mono text-sm text-foreground">{service.id}</code>
              <span className="text-xs text-muted-foreground">
                {t('observability.latency', { value: format.elapsed(service.latencyMs) })}
              </span>
            </span>
            <StatusBadge tone={tone} icon={<Icon aria-hidden="true" />}>
              {t(`observability.state.${service.state}`)}
            </StatusBadge>
          </li>
        );
      })}
    </ul>
  );
}
