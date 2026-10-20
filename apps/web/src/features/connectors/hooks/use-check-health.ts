import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useFormatters } from '@/hooks/use-formatters';

import { useHealthCheck } from '../api/connector-queries';

/**
 * Check now, as the card and the detail page offer it: the result arrives as a
 * toast in the UI language. The result's own message is English only, so the
 * toast says it in its own words instead.
 */
export function useCheckHealth() {
  const { t } = useTranslation('connectors');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const health = useHealthCheck();

  const check = (connectorId: string, name: string) => {
    health.mutate(connectorId, {
      onSuccess: (result) => {
        if (result.status === 'OK') {
          toast.success(t('card.healthy', { name }), {
            description: t('card.respondedIn', { time: format.elapsed(result.latencyMs) }),
          });
        } else {
          toast.error(t('card.unhealthy', { name }), { description: t('card.unhealthyHint') });
        }
      },
      onError: (error) => {
        toast.error(t('card.checkFailed', { name }), {
          description: tCommon(`errors.${error.code}`),
        });
      },
    });
  };

  return {
    check,
    /** True while this connector's check is in flight. */
    isChecking: (connectorId: string) => health.isPending && health.variables === connectorId,
  };
}
