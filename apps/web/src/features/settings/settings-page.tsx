import { localeSchema, SUPPORTED_LOCALES } from '@huitong/shared';
import { useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { RubberSegment } from '@/components/reactbits/rubber-segment';
import { SquishSwitch } from '@/components/reactbits/squish-switch';
import { usePreferences, type ThemePreference } from '@/app/preferences/preferences-store';
import { useSession } from '@/app/session/use-session';

const THEMES: ThemePreference[] = ['light', 'dark', 'system'];

function isTheme(value: string): value is ThemePreference {
  return (THEMES as string[]).includes(value);
}

/** Browsers that send Global Privacy Control have opted out; the tracker honours it regardless. */
function sendsGlobalPrivacyControl(): boolean {
  return (
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

/** Per-viewer preferences: language, appearance, analytics consent; plus who is signed in. */
export function SettingsPage() {
  const { t, i18n } = useTranslation('settings');
  const { t: tCommon } = useTranslation();
  const session = useSession();
  const reduce = useReducedMotion() === true;
  const { theme, language, analyticsConsent, setTheme, setLanguage, setAnalyticsConsent } =
    usePreferences();
  const gpc = sendsGlobalPrivacyControl();
  const name =
    i18n.language === 'zh-CN' && session.displayNameZh
      ? session.displayNameZh
      : session.displayName;

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t('language.title')} description={t('language.description')}>
          <RubberSegment
            aria-label={t('language.title')}
            value={language}
            onChange={(value) => {
              const parsed = localeSchema.safeParse(value);
              if (parsed.success) setLanguage(parsed.data);
            }}
            items={SUPPORTED_LOCALES.map((locale) => ({
              value: locale,
              label: <span lang={locale}>{tCommon(`shell.language.${locale}`)}</span>,
            }))}
          />
        </SectionCard>
        <SectionCard title={t('theme.title')} description={t('theme.description')}>
          <RubberSegment
            aria-label={t('theme.title')}
            value={theme}
            onChange={(value) => {
              if (isTheme(value)) setTheme(value);
            }}
            items={THEMES.map((value) => ({ value, label: tCommon(`shell.theme.${value}`) }))}
          />
        </SectionCard>
        <SectionCard title={t('privacy.title')} description={t('privacy.description')}>
          <div className="space-y-3">
            <SquishSwitch
              label={t('privacy.consent')}
              checked={analyticsConsent && !gpc}
              disabled={gpc}
              onChange={(granted) => {
                setAnalyticsConsent(granted);
                toast.success(t('privacy.saved'));
              }}
            />
            {gpc ? <p className="text-sm text-muted-foreground">{t('privacy.gpc')}</p> : null}
          </div>
        </SectionCard>
        <SectionCard title={t('motion.title')} description={t('motion.description')}>
          <p className="text-sm text-foreground">
            {reduce ? t('motion.reduced') : t('motion.full')}
          </p>
        </SectionCard>
        <SectionCard title={t('account.title')} className="lg:col-span-2">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              [t('account.name'), name],
              [t('account.email'), session.email],
              [t('account.role'), tCommon(`roles.${session.role}`)],
              [t('account.entity'), tCommon(`entities.${session.homeEntityCode}`)],
            ].map(([term, value]) => (
              <div key={term} className="space-y-0.5">
                <dt className="text-xs text-muted-foreground">{term}</dt>
                <dd className="truncate font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}
