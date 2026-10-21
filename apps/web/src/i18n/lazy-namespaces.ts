import type { Locale } from '@huitong/shared';
import type { BackendModule, ResourceKey } from 'i18next';

type Loader = () => Promise<{ default: ResourceKey }>;

/**
 * Areas 2 to 4's namespaces, each loaded with the first page that needs it,
 * so their strings stay out of the entry bundle (the 250 KB budget, CLAUDE.md
 * section 7). The explicit imports let Vite split one chunk per file.
 */
export const LAZY_NAMESPACES = {
  workflows: {
    en: () => import('./locales/en/workflows.json'),
    'zh-CN': () => import('./locales/zh-CN/workflows.json'),
  },
  attendanceLeave: {
    en: () => import('./locales/en/attendance-leave.json'),
    'zh-CN': () => import('./locales/zh-CN/attendance-leave.json'),
  },
  reports: {
    en: () => import('./locales/en/reports.json'),
    'zh-CN': () => import('./locales/zh-CN/reports.json'),
  },
  governance: {
    en: () => import('./locales/en/governance.json'),
    'zh-CN': () => import('./locales/zh-CN/governance.json'),
  },
  analytics: {
    en: () => import('./locales/en/analytics.json'),
    'zh-CN': () => import('./locales/zh-CN/analytics.json'),
  },
} as const satisfies Record<string, Record<Locale, Loader>>;

export type LazyNamespace = keyof typeof LAZY_NAMESPACES;

function isLazy(namespace: string): namespace is LazyNamespace {
  return Object.hasOwn(LAZY_NAMESPACES, namespace);
}

function isLocale(language: string): language is Locale {
  return language === 'en' || language === 'zh-CN';
}

/**
 * The i18next backend for the lazy namespaces. A component that asks for one
 * suspends until it arrives, inside the route's Suspense boundary; bundled
 * namespaces never reach this backend.
 */
export const lazyNamespaceBackend: BackendModule = {
  type: 'backend',
  init: () => undefined,
  read(language, namespace, callback) {
    if (!isLazy(namespace) || !isLocale(language)) {
      callback(null, {});
      return;
    }
    LAZY_NAMESPACES[namespace][language]().then(
      (module) => {
        callback(null, module.default);
      },
      (error: unknown) => {
        callback(error instanceof Error ? error.message : String(error), false);
      },
    );
  },
};
