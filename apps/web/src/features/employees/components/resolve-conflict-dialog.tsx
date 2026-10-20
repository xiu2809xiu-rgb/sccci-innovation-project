import { isMasked, type Conflict } from '@huitong/shared';
import { Check, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/error-state';
import { HoldButton } from '@/components/reactbits/hold-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useResolveConflict } from '../api/conflict-mutations';
import { useEmployeeLabels } from '../hooks/use-employee-labels';
import { ExplainPanel } from './explain-panel';
import { ResolveOptions } from './resolve-options';
import { MANUAL, requestOf } from './resolve-request';

const HOLD_MS = 1200;

/**
 * HR settles a conflict: keep one system's value (it becomes the source of
 * truth for this field on this record) or type the right one with a note.
 * Confirming takes a deliberate press and hold (error prevention).
 */
export function ResolveConflictDialog({
  conflict,
  onClose,
}: {
  conflict: Conflict | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={conflict !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {conflict ? <ResolveForm key={conflict.id} conflict={conflict} onClose={onClose} /> : null}
    </Dialog>
  );
}

function ResolveForm({ conflict, onClose }: { conflict: Conflict; onClose: () => void }) {
  const { t } = useTranslation('employees');
  const { t: tCommon } = useTranslation();
  const labels = useEmployeeLabels();
  const resolve = useResolveConflict();
  const [choice, setChoice] = useState('');
  const [manual, setManual] = useState('');
  const [note, setNote] = useState('');
  const [tapped, setTapped] = useState(false);
  const ids = { note: useId(), noteHint: useId() };
  const field = labels.field(conflict.field);
  const hidden = conflict.candidates.some((candidate) => isMasked(candidate.value));
  const request = requestOf(choice, manual, note);
  const source = choice !== MANUAL && choice !== '' ? labels.source(choice) : '';

  const submit = () => {
    if (!request) return;
    resolve.mutate(
      { conflictId: conflict.id, request },
      {
        onSuccess: () => {
          toast.success(t('resolve.success'));
          onClose();
        },
      },
    );
  };

  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{t('resolve.title', { field })}</DialogTitle>
        <DialogDescription>
          {t('resolve.description', { name: conflict.employeeName, field })}
        </DialogDescription>
      </DialogHeader>

      {hidden ? (
        <p className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm">
          <EyeOff className="mt-0.5 size-4 flex-none text-muted-foreground" aria-hidden="true" />
          {t('resolve.hidden')}
        </p>
      ) : (
        <ResolveOptions
          conflict={conflict}
          choice={choice}
          onChoiceChange={setChoice}
          manual={manual}
          onManualChange={setManual}
        />
      )}

      {!hidden ? (
        <div className="space-y-1.5">
          <Label htmlFor={ids.note}>
            {choice === MANUAL ? t('resolve.note') : t('resolve.noteOptional')}
          </Label>
          <Textarea
            id={ids.note}
            value={note}
            rows={2}
            maxLength={500}
            aria-describedby={choice === MANUAL ? ids.noteHint : undefined}
            onChange={(event) => {
              setNote(event.target.value);
            }}
          />
          {choice === MANUAL ? (
            <p id={ids.noteHint} className="text-xs text-muted-foreground">
              {t('resolve.noteRequired')}
            </p>
          ) : null}
        </div>
      ) : null}

      {choice !== '' ? (
        <p className="text-sm text-muted-foreground">
          {choice === MANUAL
            ? t('resolve.consequence.manual')
            : t('resolve.consequence.source', { source })}
        </p>
      ) : null}

      <ExplainPanel conflictId={conflict.id} />
      {resolve.isError ? <ErrorState error={resolve.error} /> : null}

      <DialogFooter>
        {tapped ? (
          <p role="status" className="mr-auto self-center text-xs text-muted-foreground">
            {t('resolve.keepHolding')}
          </p>
        ) : null}
        <Button type="button" variant="outline" onClick={onClose}>
          {tCommon('actions.cancel')}
        </Button>
        <HoldButton
          // A failed save remounts the button, so it never shows "saved" for a decision that was not.
          key={resolve.failureCount}
          holdTime={HOLD_MS}
          holdHint={t('resolve.holdHint', { seconds: HOLD_MS / 1000 })}
          disabled={hidden || !request || resolve.isPending}
          doneIcon={<Check aria-hidden="true" />}
          doneLabel={t('resolve.confirmed')}
          onTap={() => {
            setTapped(true);
          }}
          onHold={submit}
        >
          {t('resolve.confirm')}
        </HoldButton>
      </DialogFooter>
    </DialogContent>
  );
}
