import type { FieldMapping, MappingProposal } from '@huitong/shared';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useHasPermission } from '@/app/session/use-session';

import { useApproveProposal } from '../api/mapping-proposals';
import { ConnectorChoice } from './connector-choice';
import { connectorDraftFor, connectorFromDraft } from './connector-draft';
import { RejectPanel } from './reject-panel';

export interface ApproveStepProps {
  proposal: MappingProposal;
  mappings: FieldMapping[];
  edits: number;
  onBack: () => void;
  onApproved: (proposal: MappingProposal) => void;
  onRejected: () => void;
}

/**
 * Step 3, the explicit approval: HR names the connector the mapping is for,
 * confirms the review and approves. Only then is a new mapping version saved.
 */
export function ApproveStep({
  proposal,
  mappings,
  edits,
  onBack,
  onApproved,
  onRejected,
}: ApproveStepProps) {
  const { t } = useTranslation('connectors');
  const canApprove = useHasPermission('mappings:approve');
  const ids = { note: useId(), confirm: useId() };
  const approve = useApproveProposal();
  const [choice, setChoice] = useState(() => connectorDraftFor(proposal));
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const connector = connectorFromDraft(choice);
  const ready = connector !== null && confirmed && !approve.isPending;

  const submit = () => {
    if (!connector) return;
    approve.mutate(
      {
        proposalId: proposal.id,
        request: { mappings, connector, ...(note.trim() ? { note: note.trim() } : {}) },
      },
      { onSuccess: onApproved },
    );
  };

  const back = (
    <Button type="button" variant="outline" onClick={onBack}>
      <ArrowLeft aria-hidden="true" data-icon="inline-start" />
      {t('wizard.review.back')}
    </Button>
  );

  // Separation of duties: proposing and approving are separate permissions.
  if (!canApprove) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-foreground">
          {t('wizard.approve.summary', { count: mappings.length, edits })}
        </p>
        <p className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          {t('wizard.approve.needsApprover')}
        </p>
        {back}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground">
        {t('wizard.approve.summary', { count: mappings.length, edits })}
      </p>

      <ConnectorChoice proposal={proposal} value={choice} onChange={setChoice} />

      <div className="space-y-1.5">
        <Label htmlFor={ids.note}>{t('wizard.approve.note')}</Label>
        <Textarea
          id={ids.note}
          rows={2}
          maxLength={500}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
          }}
        />
      </div>

      <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
        <Checkbox
          id={ids.confirm}
          checked={confirmed}
          onCheckedChange={(checked) => {
            setConfirmed(checked === true);
          }}
          className="mt-0.5"
        />
        <Label htmlFor={ids.confirm} className="font-normal">
          {t('wizard.approve.confirm')}
        </Label>
      </div>

      {approve.isError ? <ErrorState error={approve.error} /> : null}

      {rejecting ? (
        <RejectPanel
          proposalId={proposal.id}
          onCancel={() => {
            setRejecting(false);
          }}
          onRejected={onRejected}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {back}
        <div className="flex flex-wrap gap-2">
          {!rejecting ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setRejecting(true);
              }}
            >
              {t('wizard.approve.reject')}
            </Button>
          ) : null}
          <Button type="button" disabled={!ready} onClick={submit}>
            <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
            {t('wizard.approve.submit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
