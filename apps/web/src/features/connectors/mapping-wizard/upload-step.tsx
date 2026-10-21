import { zodResolver } from '@hookform/resolvers/zod';
import {
  ENTITY_CODES,
  entityCodeSchema,
  localeSchema,
  sampleEncodingReadingsSchema,
  type Locale,
  type MappingProposal,
  type SampleEncoding,
} from '@huitong/shared';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

import { ErrorState } from '@/components/common/error-state';
import { CallChip, type CallChipStatus } from '@/components/reactbits/call-chip';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmployeeLabels } from '@/features/employees/hooks/use-employee-labels';
import { useFormatters } from '@/hooks/use-formatters';
import { ApiError } from '@/lib/api-error';

import { useProposeMapping } from '../api/mapping-proposals';
import { EncodingChoice } from './encoding-choice';
import { fileProblem, SAMPLE } from './sample-file';
import { SampleFileField } from './sample-file-field';

const formSchema = z.object({
  sourceSystemName: z.string().trim().min(2).max(100),
  entityCode: entityCodeSchema.optional(),
  language: localeSchema,
});

type UploadForm = z.infer<typeof formSchema>;

/** Step 1: a sample export from the new system goes to the AI mapping assistant. */
export function UploadStep({ onProposed }: { onProposed: (proposal: MappingProposal) => void }) {
  const { t, i18n } = useTranslation('connectors');
  const format = useFormatters();
  const labels = useEmployeeLabels();
  const ids = { name: useId(), entity: useId(), language: useId() };
  const propose = useProposeMapping();
  const [file, setFile] = useState<File | null>(null);
  const [fileTouched, setFileTouched] = useState(false);
  const formatElapsed = useCallback((ms: number) => format.elapsed(ms), [format]);
  const form = useForm<UploadForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceSystemName: '',
      language: localeSchema.catch('en').parse(i18n.language),
    },
  });

  const chooseFile = (next: File | null) => {
    setFile(next);
    setFileTouched(true);
    // A new file needs its own encoding check, not the last file's question.
    propose.reset();
  };

  const loadSample = async () => {
    const response = await fetch(SAMPLE.url);
    if (!response.ok) {
      toast.error(t('wizard.upload.sampleFailed'));
      return;
    }
    const blob = await response.blob();
    chooseFile(new File([blob], SAMPLE.file, { type: 'text/csv' }));
    if (form.getValues('sourceSystemName') === '') form.setValue('sourceSystemName', SAMPLE.system);
    if (form.getValues('entityCode') === undefined) form.setValue('entityCode', SAMPLE.entity);
  };

  const send = (values: UploadForm, encoding?: SampleEncoding) => {
    if (fileProblem(file) !== null || !file) return;
    propose.mutate({ ...values, file, encoding }, { onSuccess: onProposed });
  };

  const submit = form.handleSubmit((values) => {
    setFileTouched(true);
    send(values);
  });

  // The file reads sensibly in two encodings: HR chooses instead of seeing an error.
  const readings =
    propose.error instanceof ApiError && propose.error.code === 'SAMPLE_ENCODING_UNCERTAIN'
      ? sampleEncodingReadingsSchema.safeParse(propose.error.details)
      : null;

  // A question about the encoding is not a failed call: the chooser takes its place.
  const chip: CallChipStatus = propose.isPending
    ? 'running'
    : propose.isSuccess
      ? 'done'
      : propose.isError && !readings?.success
        ? 'error'
        : 'idle';
  const languageLabel = (locale: Locale) => t(`wizard.upload.languages.${locale}`);

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-6">
      <FieldGroup>
        <Field data-invalid={form.formState.errors.sourceSystemName !== undefined}>
          <FieldLabel htmlFor={ids.name}>{t('wizard.upload.systemName')}</FieldLabel>
          <Input
            id={ids.name}
            aria-invalid={form.formState.errors.sourceSystemName !== undefined}
            {...form.register('sourceSystemName')}
          />
          {form.formState.errors.sourceSystemName ? (
            <FieldError>{t('wizard.upload.systemNameInvalid')}</FieldError>
          ) : (
            <FieldDescription>{t('wizard.upload.systemNameHint')}</FieldDescription>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={ids.entity}>{t('wizard.upload.entity')}</FieldLabel>
            <Controller
              control={form.control}
              name="entityCode"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id={ids.entity} className="w-full">
                    <SelectValue placeholder={t('wizard.upload.entityPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_CODES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {labels.entityChoice(code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>{t('wizard.upload.entityHint')}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={ids.language}>{t('wizard.upload.language')}</FieldLabel>
            <Controller
              control={form.control}
              name="language"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={ids.language} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{languageLabel('en')}</SelectItem>
                    <SelectItem value="zh-CN">{languageLabel('zh-CN')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>{t('wizard.upload.languageHint')}</FieldDescription>
          </Field>
        </div>
        <SampleFileField
          file={file}
          showProblem={fileTouched}
          onChange={chooseFile}
          onUseSample={() => void loadSample()}
        />
      </FieldGroup>

      <p className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 flex-none text-success" aria-hidden="true" />
        {t('wizard.upload.privacy')}
      </p>

      {readings?.success ? (
        <EncodingChoice
          readings={readings.data.readings}
          disabled={propose.isPending}
          onChoose={(encoding) => {
            send(form.getValues(), encoding);
          }}
        />
      ) : propose.isError ? (
        <ErrorState error={propose.error} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {chip === 'idle' ? (
          <span />
        ) : (
          <CallChip
            icon={<Sparkles aria-hidden="true" />}
            name={t('wizard.upload.assistant')}
            status={chip}
            expectedMs={1500}
            statusText={{
              idle: t('wizard.upload.call.idle'),
              running: t('wizard.upload.call.running'),
              done: t('wizard.upload.call.done'),
              error: t('wizard.upload.call.error'),
            }}
            formatElapsed={formatElapsed}
            retryLabel={t('wizard.upload.call.retry')}
            onRetry={() => void submit()}
          />
        )}
        <Button type="submit" disabled={propose.isPending}>
          <Sparkles aria-hidden="true" data-icon="inline-start" />
          {t('wizard.upload.submit')}
        </Button>
      </div>
    </form>
  );
}
