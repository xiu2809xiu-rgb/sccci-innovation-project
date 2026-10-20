import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { StatusBadge } from './status-badge';

/** The always-visible "Synthetic demo data" label (CLAUDE.md data rules). */
export function SyntheticDataBadge() {
  const { t } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="rounded-full">
          <StatusBadge tone="warning" icon={<FlaskConical aria-hidden="true" />}>
            {t('app.syntheticData')}
          </StatusBadge>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{t('app.syntheticDataHint')}</TooltipContent>
    </Tooltip>
  );
}
