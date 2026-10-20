import type { MappingProposal } from '@huitong/shared';
import { CheckCircle2, CircleSlash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';

/** How the wizard ended: a saved mapping version, or a rejected proposal with nothing saved. */
export function WizardOutcome({ proposal }: { proposal: MappingProposal }) {
  const { t } = useTranslation('connectors');
  if (proposal.status === 'APPROVED' && proposal.mappingConfig) {
    const { connectorId, version } = proposal.mappingConfig;
    return (
      <EmptyState
        icon={CheckCircle2}
        title={t('wizard.outcome.approvedTitle', { version })}
        description={t('wizard.outcome.approvedDescription', { system: proposal.sourceSystemName })}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/connectors">{t('wizard.outcome.backToConnectors')}</Link>
            </Button>
            <Button asChild>
              <Link to={`/connectors/${connectorId}`}>{t('wizard.outcome.openConnector')}</Link>
            </Button>
          </div>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={CircleSlash}
      title={t('wizard.outcome.rejectedTitle')}
      description={t('wizard.outcome.rejectedDescription')}
      action={
        <Button asChild variant="outline">
          <Link to="/connectors">{t('wizard.outcome.backToConnectors')}</Link>
        </Button>
      }
    />
  );
}
