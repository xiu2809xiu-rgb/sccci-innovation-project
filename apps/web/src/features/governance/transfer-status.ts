import type { TransferStatus } from '@huitong/shared';
import { CalendarX2, CircleCheck, CirclePause, Clock3, type LucideIcon } from 'lucide-react';

import type { StatusTone } from '@/components/common/status-badge';

/** Each register status's tone and icon, so the state never rests on colour alone. */
export const TRANSFER_STATUS_STYLE: Readonly<
  Record<TransferStatus, { tone: StatusTone; icon: LucideIcon }>
> = {
  ACTIVE: { tone: 'success', icon: CircleCheck },
  PENDING_REVIEW: { tone: 'warning', icon: Clock3 },
  SUSPENDED: { tone: 'danger', icon: CirclePause },
  EXPIRED: { tone: 'neutral', icon: CalendarX2 },
};
