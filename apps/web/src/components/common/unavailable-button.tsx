import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface UnavailableButtonProps {
  label: string;
  /** Why the action cannot run, shown on hover and on keyboard focus. */
  reason: string;
  /** The accessible name when it should say more than the label, e.g. which row. */
  ariaLabel?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm';
}

/**
 * An action that cannot run yet, such as a command a head start leaves to an
 * area's owner. It stays focusable and says why, instead of a silent disabled
 * control (Nielsen: visibility of system status; help users recognise why).
 */
export function UnavailableButton({
  label,
  reason,
  ariaLabel,
  icon: Icon,
  variant = 'outline',
  size = 'default',
}: UnavailableButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          aria-disabled="true"
          aria-label={ariaLabel}
          className="cursor-not-allowed opacity-60"
        >
          {Icon ? <Icon aria-hidden="true" data-icon="inline-start" /> : null}
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{reason}</TooltipContent>
    </Tooltip>
  );
}
