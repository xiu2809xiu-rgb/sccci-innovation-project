import type { MaskedValue as MaskedValueData } from '@huitong/shared';
import { EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Stands in for a field the API withheld from this role. The tooltip answers
 * "why is this hidden" with the reason the server gave (CLAUDE.md section 8).
 */
export function MaskedValue({ value }: { value: MaskedValueData }) {
  const { t } = useTranslation();
  const classification = t(`classification.${value.classification}`);
  const reason = t(`masking.reason.${value.reason}`, { classification });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1 text-sm text-subtle-foreground"
          aria-label={`${t('masking.hidden')}. ${t('masking.whyHidden')} ${reason}`}
        >
          <EyeOff className="size-3.5" aria-hidden="true" />
          <span aria-hidden="true">••••••</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-medium">{t('masking.whyHidden')}</p>
        <p>{reason}</p>
      </TooltipContent>
    </Tooltip>
  );
}
