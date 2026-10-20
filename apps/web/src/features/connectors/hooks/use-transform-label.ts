import type { TransformSpec } from '@huitong/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/** A transform in a few words for review screens: "Date (DD/MM/YYYY)", "Value map, 8 values". */
export function useTransformLabel(): (spec: TransformSpec) => string {
  const { t } = useTranslation('connectors');
  return useCallback(
    (spec: TransformSpec) => {
      switch (spec.kind) {
        case 'copy':
        case 'number':
        case 'last-four-digits':
        case 'lowercase':
          return t(`transform.${spec.kind}`);
        case 'date':
          return t('transform.date', { format: spec.format });
        case 'value-map':
          return t('transform.value-map', { count: Object.keys(spec.values).length });
        case 'name-part':
          return t(`transform.name-part.${spec.part}`);
        case 'name-full':
          return t(`transform.name-full.${spec.order}`);
        case 'phone':
          return t('transform.phone', { code: spec.defaultCountryCode });
        case 'contains-script':
          return t('transform.contains-script');
        case 'constant':
          return t('transform.constant', { value: spec.value });
        case 'rules':
          return t('transform.rules', { count: spec.rules.length });
      }
    },
    [t],
  );
}
