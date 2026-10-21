import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CircleX,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';

import type { StatusTone } from '@/components/common/status-badge';

import type { NodeState } from './map-model';

/**
 * Each node state's badge (tone and icon, so the state never rests on colour
 * alone), the colour token the 3D scene draws it in, and its text colour class.
 * The tones and icons match the connectors page and the service-health panel.
 */
export const NODE_STATE_STYLE: Readonly<
  Record<NodeState, { tone: StatusTone; icon: LucideIcon; token: `--${string}`; text: string }>
> = {
  connected: { tone: 'success', icon: CircleCheck, token: '--success', text: 'text-success' },
  syncing: { tone: 'info', icon: RefreshCw, token: '--info', text: 'text-info' },
  degraded: { tone: 'warning', icon: CircleAlert, token: '--warning', text: 'text-warning' },
  error: { tone: 'danger', icon: CircleX, token: '--danger', text: 'text-danger' },
  idle: {
    tone: 'neutral',
    icon: CircleDashed,
    token: '--muted-foreground',
    text: 'text-muted-foreground',
  },
  retiring: {
    tone: 'neutral',
    icon: CircleMinus,
    token: '--muted-foreground',
    text: 'text-muted-foreground',
  },
};
