import { zodResolver } from '@hookform/resolvers/zod';
import {
  startConsolidationSchema,
  type EntityCode,
  type StartConsolidation,
} from '@huitong/shared';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

import { useStartConsolidation } from '../api/attendance-queries';
import { usePeriods } from '../hooks/use-periods';

const ENTITIES: readonly EntityCode[] = ['SG01', 'CN01'];

/** Starts a month's consolidation. Nothing is exported until HR has seen the preview. */
export function StartRunDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('attendanceLeave');
  const { t: tCommon } = useTranslation();
  const { periods, latest, label } = usePeriods();
  const start = useStartConsolidation();
  const monthId = useId();
  const { control, handleSubmit, formState } = useForm<StartConsolidation>({
    resolver: zodResolver(startConsolidationSchema),
    defaultValues: { period: latest, entityCodes: [...ENTITIES] },
  });

  const submit = handleSubmit((values) => {
    start.mutate(values, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(t('startDialog.queued', { period: label(values.period) }));
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('startDialog.title')}</DialogTitle>
          <DialogDescription>{t('startDialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} noValidate className="space-y-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={monthId}>{t('startDialog.month')}</FieldLabel>
              <Controller
                control={control}
                name="period"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={monthId} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((period) => (
                        <SelectItem key={period} value={period}>
                          {label(period)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field data-invalid={formState.errors.entityCodes !== undefined}>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t('startDialog.entities')}</legend>
                <Controller
                  control={control}
                  name="entityCodes"
                  render={({ field }) => (
                    <>
                      {ENTITIES.map((entity) => (
                        <div key={entity} className="flex items-center gap-2">
                          <Checkbox
                            id={`${monthId}-${entity}`}
                            checked={field.value.includes(entity)}
                            onCheckedChange={(checked) => {
                              field.onChange(
                                checked === true
                                  ? [...field.value, entity]
                                  : field.value.filter((code) => code !== entity),
                              );
                            }}
                          />
                          <Label htmlFor={`${monthId}-${entity}`}>
                            {tCommon(`entities.${entity}`)}
                          </Label>
                        </div>
                      ))}
                    </>
                  )}
                />
              </fieldset>
              {formState.errors.entityCodes ? (
                <FieldError>{t('startDialog.entitiesRequired')}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          {start.error ? (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {tCommon(`errors.${start.error.code}`)}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" disabled={start.isPending}>
              {start.isPending ? <Spinner /> : null}
              {start.isPending ? t('startDialog.submitting') : t('startDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
