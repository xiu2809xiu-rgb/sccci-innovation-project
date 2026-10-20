import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { FuzzyText } from '@/components/reactbits/fuzzy-text';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/use-document-title';

/** Unknown URL inside the app: a decorative 404 that fuzzes under the pointer, and the way back. */
export function NotFoundPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('states.notFound.title'));
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <FuzzyText
        fontSize="clamp(4rem, 12vw, 7rem)"
        baseIntensity={0.12}
        hoverIntensity={0.4}
        color="var(--muted-foreground)"
      >
        404
      </FuzzyText>
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t('states.notFound.title')}
        </h1>
        <p className="text-base text-muted-foreground">{t('states.notFound.description')}</p>
      </div>
      <Button asChild>
        <Link to="/overview">{t('actions.goToOverview')}</Link>
      </Button>
    </div>
  );
}
