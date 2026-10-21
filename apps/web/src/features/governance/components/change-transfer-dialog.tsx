import { zodResolver } from '@hookform/resolvers/zod';
import {
  changeTransferStatusSchema,
  TRANSFER_STATUSES,
  type ChangeTransferStatus,
  type TransferEntry,
  type TransferStatus,
} from '@huitong/shared';
import { useId } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

import { useChangeTransferStatus } from '../api/governance-queries';
import { TransferChangePreview } from './transfer-change-preview';

/**
 * Approves, suspends or expires a register entry. Nothing is preselected: the
 * person chooses the new status, sees which fields start or stop reaching the
 * destination before confirming (error prevention), and gives the reason the
 * audit log records.
 */
export function ChangeTransferDialog({
  entry,
  onClose,
}: {
  entry: TransferEntry;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('governance');
  const { t: tCommon } = useTranslation();
  const change = useChangeTransferStatus();
  const id = useId();
  const name = i18n.language === 'zh-CN' && entry.nameZh ? entry.nameZh : entry.name;
  const choices = TRANSFER_STATUSES.filter((status) => status !== entry.status);
  const { control, register, handleSubmit, formState } = useForm<ChangeTransferStatus>({
    resolver: zodResolver(changeTransferStatusSchema),
    defaultValues: { reason: '' },
  });
  // Undefined until the person chooses: the form types it as set, but nothing is preselected.
  const next = useWatch({ control, name: 'status' }) as TransferStatus | undefined;

  const submit = handleSubmit((body) => {
    change.mutate(
      { transferId: entry.id, body },
      {
        onSuccess: () => {
          toast.success(t('changeDialog.changed'));
          onClose();
        },
      },
    );
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('changeDialog.title', { name })}</DialogTitle>
          <DialogDescription>{t('changeDialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} noValidate className="space-y-5">
          <FieldGroup>
            <Field data-invalid={formState.errors.status !== undefined}>
              <FieldLabel htmlFor={`${id}-status`}>{t('changeDialog.status')}</FieldLabel>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={next ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger
                      id={`${id}-status`}
                      className="w-full"
                      aria-invalid={formState.errors.status !== undefined}
                    >
                      <SelectValue placeholder={t('changeDialog.chooseStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      {choices.map((status) => (
                        <SelectItem key={status} value={status}>
                          {t(`transfers.status.${status}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {formState.errors.status ? (
                <FieldError>{t('changeDialog.statusRequired')}</FieldError>
              ) : null}
            </Field>
            <div aria-live="polite">
              {next ? <TransferChangePreview entry={entry} next={next} /> : null}
            </div>
            <Field data-invalid={formState.errors.reason !== undefined}>
              <FieldLabel htmlFor={`${id}-reason`}>{t('changeDialog.reason')}</FieldLabel>
              <Textarea
                id={`${id}-reason`}
                aria-invalid={formState.errors.reason !== undefined}
                aria-describedby={`${id}-reason-hint`}
                {...register('reason')}
              />
              <FieldDescription id={`${id}-reason-hint`}>
                {t('changeDialog.reasonHint')}
              </FieldDescription>
              {formState.errors.reason ? (
                <FieldError>{t('changeDialog.reasonRequired')}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          {change.error ? (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {tCommon(`errors.${change.error.code}`)}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? <Spinner /> : null}
              {change.isPending ? t('changeDialog.submitting') : t('changeDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
