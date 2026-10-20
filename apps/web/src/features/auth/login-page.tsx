import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { SplitAuthLayout } from '@/components/reactbits/split-auth-layout';
import { safeNextPath } from '@/app/session/route-guards';
import { useDocumentTitle } from '@/hooks/use-document-title';

import { LandingAside } from './components/landing-aside';
import { LandingFooter } from './components/landing-footer';
import { PublicHeader } from './components/public-header';
import { SignInPanel } from './components/sign-in-panel';

/** The signed-out landing page: sign-in on one side, what HuiTong is on the other. */
export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useDocumentTitle(t('title'));

  const goOn = () => {
    void navigate(safeNextPath(searchParams.get('next')), { replace: true });
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PublicHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-(--content-max-width) flex-1 px-4 pt-2 pb-12 md:px-8 lg:pt-4"
      >
        <SplitAuthLayout
          heading={
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {t('form.heading')}
              </h1>
              <p className="text-sm text-muted-foreground">{t('form.lead')}</p>
            </div>
          }
          footnote={
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
              {t('form.footnote')}
            </p>
          }
          aside={<LandingAside />}
        >
          <SignInPanel expired={searchParams.get('reason') === 'expired'} onSignedIn={goOn} />
        </SplitAuthLayout>
      </main>
      <LandingFooter />
    </div>
  );
}
