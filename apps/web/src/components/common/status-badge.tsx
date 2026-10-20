import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  primary: 'border-transparent bg-primary-subtle text-primary-subtle-foreground',
  success: 'border-success-border bg-success-subtle text-success',
  warning: 'border-warning-border bg-warning-subtle text-warning',
  danger: 'border-danger-border bg-danger-subtle text-danger',
  info: 'border-info-border bg-info-subtle text-info',
};

const DOT_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

export interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
  /** An icon conveys the state without relying on colour alone (WCAG 1.4.1); otherwise a dot is shown. */
  icon?: ReactNode;
  className?: string;
}

/** Small labelled status pill: sync results, connector health, approval states. */
export function StatusBadge({ tone, children, icon, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full border px-2 text-xs font-medium whitespace-nowrap [&>svg]:size-3',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon ?? (
        <span className={cn('size-1.5 rounded-full', DOT_CLASSES[tone])} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
