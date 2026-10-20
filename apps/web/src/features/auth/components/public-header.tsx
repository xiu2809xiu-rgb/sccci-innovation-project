import { BrandMark } from '@/components/common/brand-mark';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { LanguageMenu } from '@/app/shell/language-menu';
import { ThemeMenu } from '@/app/shell/theme-menu';

/** The signed-out header: brand, the synthetic-data label and the two preferences. */
export function PublicHeader() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-(--content-max-width) items-center gap-3 px-4 py-4 md:px-8">
      <BrandMark />
      <span className="flex-1" />
      <span className="hidden sm:inline-flex">
        <SyntheticDataBadge />
      </span>
      <LanguageMenu />
      <ThemeMenu />
    </header>
  );
}
