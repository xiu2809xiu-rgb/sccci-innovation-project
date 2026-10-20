import { useTranslation } from 'react-i18next';

/** Context and the data promise, in the footer of the signed-out page. */
export function LandingFooter() {
  const { t } = useTranslation('auth');
  return (
    <footer className="relative z-10 border-t border-border">
      <div className="mx-auto flex w-full max-w-(--content-max-width) flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between md:px-8">
        <p>{t('landing.footer.challenge')}</p>
        <p>{t('landing.footer.data')}</p>
      </div>
    </footer>
  );
}
