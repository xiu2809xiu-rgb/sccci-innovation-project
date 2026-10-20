import { FileSpreadsheet, Upload } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useFormatters } from '@/hooks/use-formatters';

import { fileProblem } from './sample-file';

export interface SampleFileFieldProps {
  file: File | null;
  /** Show what is wrong with the file, once the user has chosen one or tried to submit. */
  showProblem: boolean;
  onChange: (file: File | null) => void;
  onUseSample: () => void;
}

/** The sample export: CSV or Excel, or the bundled synthetic one. */
export function SampleFileField({
  file,
  showProblem,
  onChange,
  onUseSample,
}: SampleFileFieldProps) {
  const { t } = useTranslation('connectors');
  const format = useFormatters();
  const id = useId();
  const problem = showProblem ? fileProblem(file) : null;

  return (
    <Field data-invalid={problem !== null}>
      <FieldLabel htmlFor={id}>{t('wizard.upload.file')}</FieldLabel>
      <Input
        id={id}
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-invalid={problem !== null}
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null);
        }}
      />
      {file ? (
        <p className="flex items-center gap-1.5 text-sm text-foreground">
          <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden="true" />
          {t('wizard.upload.chosen', {
            name: file.name,
            size: format.number(file.size / 1000, { maximumFractionDigits: 1 }),
          })}
        </p>
      ) : null}
      {problem !== null ? (
        <FieldError>{t(`wizard.upload.fileProblem.${problem}`)}</FieldError>
      ) : (
        <FieldDescription>{t('wizard.upload.fileHint')}</FieldDescription>
      )}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto justify-start p-0"
        onClick={onUseSample}
      >
        <Upload aria-hidden="true" data-icon="inline-start" />
        {t('wizard.upload.useSample')}
      </Button>
    </Field>
  );
}
