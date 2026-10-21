import type { SlaState } from '@huitong/shared';
import { AlarmClock, CircleCheck, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@/components/common/status-badge';

import { SLA_TONE } from '../workflow-status';

const ICONS = { ON_TRACK: CircleCheck, DUE_SOON: AlarmClock, OVERDUE: TriangleAlert } as const;

/** Where open work stands against its SLA, with an icon so colour is not the only cue. */
export function SlaBadge({ sla }: { sla: SlaState }) {
  const { t } = useTranslation('workflows');
  const Icon = ICONS[sla];
  return (
    <StatusBadge tone={SLA_TONE[sla]} icon={<Icon aria-hidden="true" />}>
      {t(`sla.${sla}`)}
    </StatusBadge>
  );
}
