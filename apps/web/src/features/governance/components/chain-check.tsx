import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CopyButton } from '@/components/common/copy-button';
import { SectionCard } from '@/components/common/section-card';
import { StatusMark, type StatusMarkStatus } from '@/components/reactbits/status-mark';
import { Button } from '@/components/ui/button';
import { useFormatters } from '@/hooks/use-formatters';

import { useVerifyChain } from '../api/governance-queries';

/**
 * Recomputes the audit log's hash chain on request and says plainly whether
 * it is intact, or where it breaks (story F-2).
 */
export function ChainCheck() {
  const { t } = useTranslation('governance');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const verify = useVerifyChain();
  const result = verify.data;

  let status: StatusMarkStatus = 'pending';
  let message = t('audit.chain.notChecked');
  if (verify.isPending) {
    status = 'running';
    message = t('audit.chain.checking');
  } else if (verify.error) {
    status = 'failed';
    message = tCommon(`errors.${verify.error.code}`);
  } else if (result?.valid === true) {
    status = 'done';
    message = t('audit.chain.valid', {
      count: result.checked,
      time: format.relativeTime(result.checkedAt),
    });
  } else if (result) {
    status = 'failed';
    message = t('audit.chain.broken', { id: result.firstBrokenId ?? '?' });
  }

  return (
    <SectionCard
      title={t('audit.chain.title')}
      description={t('audit.chain.description')}
      action={
        <Button
          type="button"
          onClick={() => {
            verify.mutate();
          }}
          disabled={verify.isPending}
        >
          <ShieldCheck aria-hidden="true" data-icon="inline-start" />
          {t('audit.chain.check')}
        </Button>
      }
    >
      <p role="status" className="flex items-center gap-2 text-sm text-foreground">
        <StatusMark status={status} statusText={message} size={18} />
        <span>{message}</span>
      </p>
      {verify.error?.traceId ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {tCommon('states.error.traceId')}
          <code className="font-mono">{verify.error.traceId}</code>
          <CopyButton value={verify.error.traceId} label={tCommon('states.error.copyTraceId')} />
        </p>
      ) : null}
    </SectionCard>
  );
}
