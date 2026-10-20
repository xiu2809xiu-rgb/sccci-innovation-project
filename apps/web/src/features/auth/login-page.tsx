import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { Aurora } from '@/components/reactbits/aurora';
import { safeNextPath } from '@/app/session/route-guards';
import { useDocumentTitle } from '@/hooks/use-document-title';

import { LandingFooter } from './components/landing-footer';
import { LandingHero } from './components/landing-hero';
import { PublicHeader } from './components/public-header';
import { SignInPanel } from './components/sign-in-panel';

/** The signed-out landing page: what HuiTong is on the left, sign-in on the right. */
export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useDocumentTitle(t('title'));

  const goOn = () => {
    void navigate(safeNextPath(searchParams.get('next')), { replace: true });
  };

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      {/* One ambient effect for the whole page, kept faint so text contrast is unaffected. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] opacity-50"
        aria-hidden="true"
      >
        <Aurora amplitude={0.8} speed={0.6} />
      </div>
      <PublicHeader />
      <main
        id="main"
        className="relative z-10 mx-auto grid w-full max-w-(--content-max-width) flex-1 gap-10 px-4 pt-6 pb-16 md:px-8 lg:grid-cols-12 lg:gap-12 lg:pt-12"
      >
        <div className="lg:col-span-7">
          <LandingHero />
        </div>
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-8">
            <SignInPanel expired={searchParams.get('reason') === 'expired'} onSignedIn={goOn} />
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
