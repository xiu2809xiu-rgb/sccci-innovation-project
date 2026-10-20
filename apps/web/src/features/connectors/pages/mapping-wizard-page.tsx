import type { MappingProposal } from '@huitong/shared';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { z } from 'zod';

import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { Step, Stepper } from '@/components/reactbits/stepper';
import { Skeleton } from '@/components/ui/skeleton';

import { useMappingProposal } from '../api/mapping-proposals';
import { ApproveStep } from '../mapping-wizard/approve-step';
import {
  draftFromProposal,
  draftProblems,
  mappingsFromDraft,
  retargetedColumns,
  type MappingDraft,
} from '../mapping-wizard/mapping-draft';
import { ReviewStep } from '../mapping-wizard/review-step';
import { UploadStep } from '../mapping-wizard/upload-step';
import { WizardOutcome } from '../mapping-wizard/wizard-outcome';

const proposalIdSchema = z.uuid();

/** Columns whose final target differs from the AI's suggestion, plus dropped fixed values. */
function editCount(proposal: MappingProposal, draft: MappingDraft): number {
  const columns = proposal.columns.filter(
    (column) =>
      (draft.columns[column.sourceColumn] ?? null) !== (column.transform ? column.target : null),
  ).length;
  const constants = proposal.fixedValues.filter(
    (fixed) => draft.constants[fixed.target] !== true,
  ).length;
  return columns + constants;
}

/**
 * The AI mapping wizard: upload a sample, review the AI's proposal, approve it.
 * The proposal id lives in the URL, so a review can be resumed or shared.
 */
export function MappingWizardPage() {
  const { t } = useTranslation('connectors');
  const [params, setParams] = useSearchParams();
  const parsedId = proposalIdSchema.safeParse(params.get('proposal'));
  const proposalId = parsedId.success ? parsedId.data : null;
  const proposalQuery = useMappingProposal(proposalId);
  const proposal = proposalQuery.data;
  const [step, setStep] = useState(proposalId ? 2 : 1);
  const [draft, setDraft] = useState<{ id: string; value: MappingDraft } | null>(null);

  // A newly loaded proposal starts from the AI's suggestion as it stands.
  if (proposal && draft?.id !== proposal.id) {
    setDraft({ id: proposal.id, value: draftFromProposal(proposal) });
  }
  const finished = proposal !== undefined && proposal.status !== 'PENDING_REVIEW';
  const current = finished ? 4 : step;
  const mappings = proposal && draft ? mappingsFromDraft(proposal, draft.value) : [];

  const showProposal = (next: MappingProposal) => {
    setParams({ proposal: next.id }, { replace: false });
    setStep(2);
  };

  const body = (content: (ready: MappingProposal, value: MappingDraft) => ReactNode) => {
    if (proposalQuery.status === 'error') {
      return (
        <ErrorState
          error={proposalQuery.error}
          onRetry={() => {
            void proposalQuery.refetch();
          }}
        />
      );
    }
    if (!proposal || !draft) return <Skeleton className="h-96" />;
    return content(proposal, draft.value);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('wizard.title')}
        description={t('wizard.description')}
        meta={<SyntheticDataBadge />}
      />
      <Stepper
        step={current}
        onStepChange={setStep}
        aria-label={t('wizard.steps.label')}
        stepLabel={(number, total, title) => t('wizard.steps.indicator', { number, total, title })}
        disableStepIndicators={finished}
        completedContent={proposal ? <WizardOutcome proposal={proposal} /> : null}
      >
        <Step title={t('wizard.steps.upload')}>
          <UploadStep onProposed={showProposal} />
        </Step>
        <Step title={t('wizard.steps.review')}>
          {body((ready, value) => (
            <ReviewStep
              proposal={ready}
              draft={value}
              retargeted={retargetedColumns(ready, value)}
              problems={draftProblems(mappingsFromDraft(ready, value))}
              onDraftChange={(next) => {
                setDraft({ id: ready.id, value: next });
              }}
              onBack={() => {
                setStep(1);
              }}
              onContinue={() => {
                setStep(3);
              }}
            />
          ))}
        </Step>
        <Step title={t('wizard.steps.approve')}>
          {body((ready, value) => (
            <ApproveStep
              proposal={ready}
              mappings={mappings}
              edits={editCount(ready, value)}
              onBack={() => {
                setStep(2);
              }}
              onApproved={() => {
                setStep(4);
              }}
              onRejected={() => {
                setStep(4);
              }}
            />
          ))}
        </Step>
      </Stepper>
    </div>
  );
}
