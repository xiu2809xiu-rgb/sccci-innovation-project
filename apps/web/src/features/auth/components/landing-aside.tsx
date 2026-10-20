import {
  DatabaseZap,
  FileClock,
  ShieldCheck,
  UserCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { BlurText } from '@/components/reactbits/blur-text';
import { ShinyText } from '@/components/reactbits/shiny-text';
import { TrustOrbit } from '@/components/reactbits/trust-orbit';

import { IntegrationTeaser } from './integration-teaser';

const TRUST: { key: 'rbac' | 'audit' | 'approval'; icon: LucideIcon }[] = [
  { key: 'rbac', icon: ShieldCheck },
  { key: 'audit', icon: FileClock },
  { key: 'approval', icon: UserCheck },
];

const POINTS: { key: 'master' | 'automation' | 'governance'; icon: LucideIcon }[] = [
  { key: 'master', icon: DatabaseZap },
  { key: 'automation', icon: Workflow },
  { key: 'governance', icon: ShieldCheck },
];

/**
 * The sign-in page's product story: the integration map orbiting HuiTong, ringed by its governance
 * promises, then what HuiTong does in one sentence and three proofs.
 */
export function LandingAside() {
  const { t, i18n } = useTranslation('auth');
  const chips = TRUST.map(({ key, icon: Icon }) => ({
    id: key,
    label: t(`landing.trust.${key}`),
    icon: <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />,
  }));

  return (
    <div className="flex flex-1 flex-col gap-10 px-6 py-10 sm:px-10 lg:px-14">
      <figure className="flex flex-1 flex-col justify-center gap-4">
        <TrustOrbit
          className="mx-auto max-w-104"
          centre={<IntegrationTeaser className="size-full" />}
          chips={chips}
        />
        <figcaption className="max-w-md space-y-1 text-sm">
          <p className="font-semibold text-foreground">{t('landing.teaser.title')}</p>
          <p className="text-muted-foreground">{t('landing.teaser.caption')}</p>
        </figcaption>
      </figure>
      <div className="space-y-6">
        <div className="space-y-3">
          <ShinyText
            text={t('landing.eyebrow')}
            trigger="view"
            className="text-xs font-semibold tracking-[0.08em] uppercase"
          />
          <BlurText
            key={i18n.language}
            as="h2"
            text={t('landing.headline')}
            trigger="view"
            animateBy={i18n.language === 'zh-CN' ? 'letters' : 'words'}
            delay={i18n.language === 'zh-CN' ? 45 : 120}
            className="text-lg font-semibold tracking-tight text-foreground"
          />
          <p className="max-w-md text-sm text-muted-foreground">{t('landing.lead')}</p>
        </div>
        <ul className="grid gap-6 xl:grid-cols-3">
          {POINTS.map(({ key, icon: Icon }) => (
            <li key={key} className="flex gap-3 xl:flex-col">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-subtle text-primary-subtle-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="max-w-md space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {t(`landing.points.${key}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground">{t(`landing.points.${key}.body`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
