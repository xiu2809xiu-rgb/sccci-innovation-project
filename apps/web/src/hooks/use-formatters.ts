import { localeSchema } from '@huitong/shared';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Formatters } from '@/lib/formatters';

/** {@link Formatters} for the current UI language. */
export function useFormatters(): Formatters {
  const { i18n } = useTranslation();
  const locale = localeSchema.catch('en').parse(i18n.language);
  return useMemo(() => new Formatters(locale), [locale]);
}
