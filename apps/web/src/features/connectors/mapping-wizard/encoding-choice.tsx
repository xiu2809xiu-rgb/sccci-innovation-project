import {
  sampleEncodingSchema,
  type SampleEncoding,
  type SampleEncodingReadings,
} from '@huitong/shared';
import { Languages } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface EncodingChoiceProps {
  readings: SampleEncodingReadings['readings'];
  disabled: boolean;
  onChoose: (encoding: SampleEncoding) => void;
  /** What reads the file once HR chooses: the assistant reads a sample, HuiTong a whole export. */
  description: string;
}

/**
 * The file's bytes make sense in more than one encoding, so HR picks the
 * reading whose headers look right before the file is read further. Nothing
 * is guessed (error prevention, recognition over recall).
 */
export function EncodingChoice({ readings, disabled, onChoose, description }: EncodingChoiceProps) {
  const { t } = useTranslation('connectors');
  const id = useId();
  const [choice, setChoice] = useState<SampleEncoding | null>(null);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="space-y-3 rounded-lg border border-warning-border bg-warning-subtle p-4"
    >
      <div className="space-y-1">
        <h3
          id={`${id}-title`}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <Languages className="size-4 text-warning" aria-hidden="true" />
          {t('wizard.upload.encoding.title')}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <RadioGroup
        value={choice ?? ''}
        onValueChange={(next) => {
          // A form reset clears the group with an empty value, which is no choice.
          const parsed = sampleEncodingSchema.safeParse(next);
          setChoice(parsed.success ? parsed.data : null);
        }}
        aria-labelledby={`${id}-title`}
        className="gap-2"
      >
        {readings.map((reading) => (
          <div
            key={reading.encoding}
            className="flex items-start gap-3 rounded-md border border-border bg-card p-3 has-data-checked:border-primary"
          >
            <RadioGroupItem
              id={`${id}-${reading.encoding}`}
              value={reading.encoding}
              className="mt-0.5"
            />
            <Label
              htmlFor={`${id}-${reading.encoding}`}
              className="flex flex-col items-start gap-1"
            >
              <span className="font-medium">
                {t(`wizard.upload.encoding.names.${reading.encoding}`)}
              </span>
              <span className="font-normal text-muted-foreground">
                {reading.headers.length > 0
                  ? reading.headers.join(t('wizard.upload.encoding.separator'))
                  : t('wizard.upload.encoding.noHeaders')}
              </span>
            </Label>
          </div>
        ))}
      </RadioGroup>
      <Button
        type="button"
        variant="outline"
        disabled={choice === null || disabled}
        onClick={() => {
          if (choice) onChoose(choice);
        }}
      >
        {t('wizard.upload.encoding.use')}
      </Button>
    </section>
  );
}
