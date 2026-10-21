import { zodResolver } from '@hookform/resolvers/zod';
import {
  changeLeaveCategoryMappingSchema,
  LEAVE_CATEGORIES,
  TEMPLATE_LEAVE_COLUMNS,
  type ChangeLeaveCategoryMapping,
  type LeaveCategoryMapping,
} from '@huitong/shared';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
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

import { useChangeLeaveRule } from '../api/attendance-queries';

const NO_COLUMN = 'none';

/** Proposes a changed rule. It waits for approval, and both steps are audited. */
export function ChangeRuleDialog({
  rule,
  onClose,
}: {
  rule: LeaveCategoryMapping;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('attendanceLeave');
  const { t: tCommon } = useTranslation();
  const change = useChangeLeaveRule();
  const id = useId();
  const chinese = i18n.language === 'zh-CN';
  const { control, register, handleSubmit, formState } = useForm<ChangeLeaveCategoryMapping>({
    resolver: zodResolver(changeLeaveCategoryMappingSchema),
    defaultValues: {
      canonicalCategory: rule.canonicalCategory,
      templateColumn: rule.templateColumn,
      reason: '',
    },
  });

  const submit = handleSubmit((body) => {
    change.mutate(
      { mappingId: rule.id, body },
      {
        onSuccess: () => {
          toast.success(t('changeDialog.proposed'));
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
          <DialogTitle>
            {t('changeDialog.title', { code: `${rule.sourceLabel} (${rule.sourceCategory})` })}
          </DialogTitle>
          <DialogDescription>{t('changeDialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} noValidate className="space-y-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-category`}>{t('changeDialog.category')}</FieldLabel>
              <Controller
                control={control}
                name="canonicalCategory"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={`${id}-category`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {t(`category.${category}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-column`}>{t('changeDialog.column')}</FieldLabel>
              <Controller
                control={control}
                name="templateColumn"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NO_COLUMN}
                    onValueChange={(value) => {
                      field.onChange(value === NO_COLUMN ? null : value);
                    }}
                  >
                    <SelectTrigger id={`${id}-column`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_COLUMN}>{t('changeDialog.noColumn')}</SelectItem>
                      {TEMPLATE_LEAVE_COLUMNS.map((column) => (
                        <SelectItem key={column.key} value={column.label}>
                          {chinese ? column.labelZh : column.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
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
