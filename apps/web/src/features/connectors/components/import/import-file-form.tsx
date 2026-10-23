import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  sampleEncodingReadingsSchema,
  type SampleEncoding,
} from '@huitong/shared';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useFormatters } from '@/hooks/use-formatters';
import { ApiError } from '@/lib/api-error';

import { useStageImport } from '../../api/file-import';
import { EncodingChoice } from '../../mapping-wizard/encoding-choice';
import { fileProblem } from '../../mapping-wizard/sample-file';
import { ImportProblemMessage } from './import-problem';
import { fileRefused, importProblemOf } from './import-problem-of';

export interface ImportFileFormProps {
  connectorId: string;
  /** The file input's id, so the card can move focus to it. */
  inputId: string;
  /** A file is staged already, so a new one replaces it. */
  replacing: boolean;
  /** False once a usable file is staged: Sync now in the page header is then the primary action. */
  primary: boolean;
}

/** Chooses the whole export and stages it; the API reads it through the approved mapping. */
export function ImportFileForm({ connectorId, inputId, replacing, primary }: ImportFileFormProps) {
  const { t } = useTranslation('connectors');
  const format = useFormatters();
  const stage = useStageImport(connectorId);
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);
  const problem = touched ? fileProblem(file, MAX_IMPORT_BYTES) : null;
  const megabytes = format.number(MAX_IMPORT_BYTES / 1_000_000);

  // Clears only the file picker: resetting the form would reset other controls in it too.
  const clearPicker = () => {
    if (input.current) input.current.value = '';
    setFile(null);
    setTouched(false);
  };

  const send = (encoding?: SampleEncoding) => {
    if (!file || fileProblem(file, MAX_IMPORT_BYTES) !== null) return;
    stage.mutate(
      { file, encoding },
      {
        onSuccess: (staged) => {
          clearPicker();
          toast.success(t('detail.import.stagedToast', { count: staged.rowCount }));
        },
        onError: (error) => {
          // A refused file wants a corrected one, which the browser announces only once the
          // picker no longer holds the old one. Any other failure leaves the file to send again.
          if (fileRefused(error)) clearPicker();
        },
      },
    );
  };

  // The file reads sensibly in two encodings: HR chooses instead of seeing an error.
  const readings =
    stage.error instanceof ApiError && stage.error.code === 'SAMPLE_ENCODING_UNCERTAIN'
      ? sampleEncodingReadingsSchema.safeParse(stage.error.details)
      : null;
  const refused = importProblemOf(stage.error);

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        send();
      }}
    >
      <Field data-invalid={problem !== null}>
        <FieldLabel htmlFor={inputId}>
          {replacing ? t('detail.import.replace') : t('detail.import.file')}
        </FieldLabel>
        <Input
          ref={input}
          id={inputId}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-invalid={problem !== null}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setTouched(true);
            // A new file needs its own checks, not the last file's answer.
            stage.reset();
          }}
        />
        {file ? (
          <p className="flex items-center gap-1.5 text-sm text-foreground">
            <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('detail.import.chosen', {
              name: file.name,
              size: format.number(file.size / 1000, { maximumFractionDigits: 1 }),
            })}
          </p>
        ) : null}
        {problem !== null ? (
          <FieldError>{t(`detail.import.fileProblem.${problem}`, { megabytes })}</FieldError>
        ) : (
          <FieldDescription>
            {t('detail.import.fileHint', { megabytes, rows: format.number(MAX_IMPORT_ROWS) })}
          </FieldDescription>
        )}
      </Field>
      {readings?.success ? (
        <EncodingChoice
          readings={readings.data.readings}
          disabled={stage.isPending}
          description={t('detail.import.encodingDescription')}
          onChoose={(encoding) => {
            send(encoding);
          }}
        />
      ) : refused ? (
        <ImportProblemMessage problem={refused} />
      ) : stage.isError ? (
        <ErrorState error={stage.error} />
      ) : null}
      <Button type="submit" variant={primary ? 'default' : 'outline'} disabled={stage.isPending}>
        {stage.isPending ? <Spinner /> : <Upload aria-hidden="true" data-icon="inline-start" />}
        {stage.isPending ? t('detail.import.staging') : t('detail.import.stage')}
      </Button>
    </form>
  );
}
