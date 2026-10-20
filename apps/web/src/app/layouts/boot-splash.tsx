import { BrandMark } from '@/components/common/brand-mark';
import { Spinner } from '@/components/ui/spinner';

/**
 * Shown on the very first load while the router checks the session (React
 * Router's hydrate fallback). Kept free of translated text: i18n is ready,
 * but this screen lasts a moment and should not flash a language.
 */
export function BootSplash() {
  return (
    <div className="grid min-h-svh place-items-center bg-background" aria-busy="true">
      <div className="flex flex-col items-center gap-4">
        <BrandMark />
        <Spinner className="text-muted-foreground" />
      </div>
    </div>
  );
}
