import { DatabaseZap, ShieldCheck, Workflow, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { BlurText } from '@/components/reactbits/blur-text';
import { ShinyText } from '@/components/reactbits/shiny-text';

import { IntegrationTeaser } from './integration-teaser';

const POINTS: { key: 'master' | 'automation' | 'governance'; icon: LucideIcon }[] = [
  { key: 'master', icon: DatabaseZap },
  { key: 'automation', icon: Workflow },
  { key: 'governance', icon: ShieldCheck },
];

/** What HuiTong is, in one sentence and three proofs, with a preview of the integration map. */
export function LandingHero() {
  const { t, i18n } = useTranslation('auth');
  return (
    <div className="flex flex-col gap-10">
      <div className="space-y-5">
        <ShinyText
          text={t('landing.eyebrow')}
          className="text-xs font-semibold tracking-[0.08em] uppercase"
        />
        <BlurText
          key={i18n.language}
          as="h1"
          text={t('landing.headline')}
          animateBy={i18n.language === 'zh-CN' ? 'letters' : 'words'}
          delay={i18n.language === 'zh-CN' ? 45 : 120}
          className="max-w-2xl text-display font-semibold tracking-tight text-foreground"
        />
        <p className="max-w-xl text-md text-muted-foreground">{t('landing.lead')}</p>
      </div>
      <ul className="grid gap-6 sm:grid-cols-3">
        {POINTS.map(({ key, icon: Icon }) => (
          <li key={key} className="space-y-2">
            <span className="grid size-9 place-items-center rounded-md bg-primary-subtle text-primary-subtle-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-foreground">
              {t(`landing.points.${key}.title`)}
            </h2>
            <p className="text-sm text-muted-foreground">{t(`landing.points.${key}.body`)}</p>
          </li>
        ))}
      </ul>
      <IntegrationTeaser />
    </div>
  );
}
