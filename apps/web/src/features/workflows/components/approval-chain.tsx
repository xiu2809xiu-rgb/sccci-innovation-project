import type { ApprovalDecision } from '@huitong/shared';
import { CircleCheck, CircleX, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/common/section-card';
import { useFormatters } from '@/hooks/use-formatters';

const ICONS = { SUBMIT: Send, APPROVE: CircleCheck, REJECT: CircleX } as const;

/** The approval steps the request passed in OA, shown explicitly (CLAUDE.md section 8, GRS in the UI). */
export function ApprovalChain({ decisions }: { decisions: readonly ApprovalDecision[] }) {
  const { t } = useTranslation('workflows');
  const format = useFormatters();

  return (
    <SectionCard title={t('instance.approval')} description={t('instance.approvalDescription')}>
      <ol className="space-y-3">
        {decisions.map((decision) => {
          const Icon = ICONS[decision.action];
          return (
            <li key={`${decision.node}-${decision.at}`} className="flex items-start gap-3">
              <Icon
                aria-hidden="true"
                className={
                  decision.action === 'REJECT'
                    ? 'mt-0.5 size-4 shrink-0 text-danger'
                    : 'mt-0.5 size-4 shrink-0 text-success'
                }
              />
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{decision.node}</span> ·{' '}
                  {t(`instance.approvalAction.${decision.action}`)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {decision.approverName} · {format.dateTime(decision.at)}
                  {decision.comment ? ` · “${decision.comment}”` : null}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}
