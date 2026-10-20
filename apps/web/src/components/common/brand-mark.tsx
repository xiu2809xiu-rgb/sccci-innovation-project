import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/** The 汇 monogram with the product name; `nameClassName` lets the collapsed sidebar hide the name. */
export function BrandMark({
  className,
  nameClassName,
}: {
  className?: string;
  nameClassName?: string;
}) {
  const { t } = useTranslation();
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span
        className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
        aria-hidden="true"
      >
        汇
      </span>
      <span className={cn('truncate text-base font-semibold text-foreground', nameClassName)}>
        {t('app.fullName')}
      </span>
    </span>
  );
}
