import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { SpotlightCard } from '@/components/reactbits/spotlight-card';

export interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  value: ReactNode;
  hint?: ReactNode;
  footer?: ReactNode;
}

/** One headline figure with its meaning underneath (tabular numerals; a soft light follows the pointer). */
export function KpiCard({ label, icon: Icon, value, hint, footer }: KpiCardProps) {
  return (
    <SpotlightCard className="flex min-h-32 flex-col gap-2 p-5" intensity={0.12} proximity={40}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
      </div>
      <p className="text-xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {footer ? <div className="mt-auto pt-1">{footer}</div> : null}
    </SpotlightCard>
  );
}
