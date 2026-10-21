import { Bot, Drama, FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { StatusBadge } from './status-badge';

const KINDS = {
  system: { icon: Drama, label: 'mock.system', hint: 'mock.systemHint' },
  ai: { icon: Bot, label: 'mock.ai', hint: 'mock.aiHint' },
  data: { icon: FlaskConical, label: 'mock.data', hint: 'mock.dataHint' },
} as const;

/**
 * Honesty label: a system simulated by a HuiTong mock, output from the
 * deterministic mock AI, or a head-start route's typed sample data (`meta.mock`
 * in the response). A mock is never shown as if it were live.
 */
export function MockBadge({ kind }: { kind: keyof typeof KINDS }) {
  const { t } = useTranslation();
  const { icon: Icon, label, hint } = KINDS[kind];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="rounded-full">
          <StatusBadge tone="neutral" icon={<Icon aria-hidden="true" />}>
            {t(label)}
          </StatusBadge>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{t(hint)}</TooltipContent>
    </Tooltip>
  );
}
