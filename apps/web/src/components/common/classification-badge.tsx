import type { ClassificationLevel } from '@huitong/shared';
import { Building2, Globe, Lock, ShieldAlert, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { StatusBadge, type StatusTone } from './status-badge';

const LEVEL_STYLE: Record<ClassificationLevel, { tone: StatusTone; icon: LucideIcon }> = {
  PUBLIC: { tone: 'neutral', icon: Globe },
  INTERNAL: { tone: 'info', icon: Building2 },
  CONFIDENTIAL: { tone: 'warning', icon: Lock },
  RESTRICTED: { tone: 'danger', icon: ShieldAlert },
};

/** Data-classification tag with an explanatory tooltip (GRS made visible, CLAUDE.md section 8). */
export function ClassificationBadge({ level }: { level: ClassificationLevel }) {
  const { t } = useTranslation();
  const { tone, icon: Icon } = LEVEL_STYLE[level];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded-full"
          aria-label={`${t('classification.label')}: ${t(`classification.${level}`)}`}
        >
          <StatusBadge tone={tone} icon={<Icon aria-hidden="true" />}>
            {t(`classification.${level}`)}
          </StatusBadge>
        </button>
      </TooltipTrigger>
      <TooltipContent>{t(`classification.description.${level}`)}</TooltipContent>
    </Tooltip>
  );
}
