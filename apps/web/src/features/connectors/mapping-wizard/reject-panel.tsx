import { XCircle } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useRejectProposal } from '../api/mapping-proposals';

export interface RejectPanelProps {
  proposalId: string;
  onCancel: () => void;
  onRejected: () => void;
}

/** Rejecting a proposal asks for the reason, which is kept with the decision. */
export function RejectPanel({ proposalId, onCancel, onRejected }: RejectPanelProps) {
  const { t } = useTranslation('connectors');
  const id = useId();
  const reject = useRejectProposal();
  const [note, setNote] = useState('');

  return (
    <div className="space-y-2 rounded-md border border-danger-border p-3">
      <Label htmlFor={id}>{t('wizard.approve.rejectNote')}</Label>
      <Textarea
        id={id}
        rows={2}
        maxLength={500}
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
        }}
      />
      {reject.isError ? <ErrorState error={reject.error} /> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('wizard.approve.keepReviewing')}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={note.trim().length < 3 || reject.isPending}
          onClick={() => {
            reject.mutate({ proposalId, note: note.trim() }, { onSuccess: onRejected });
          }}
        >
          <XCircle aria-hidden="true" data-icon="inline-start" />
          {t('wizard.approve.confirmReject')}
        </Button>
      </div>
    </div>
  );
}
