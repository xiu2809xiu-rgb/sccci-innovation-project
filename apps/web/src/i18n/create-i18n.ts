import type { Locale } from '@huitong/shared';
import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { BUNDLED_NAMESPACES, bundledResources } from './bundled-resources';
import { lazyNamespaceBackend } from './lazy-namespaces';

/**
 * Creates the app's i18next instance. The shell's and area 1's namespaces are
 * bundled, so the first render already has its strings; areas 2 to 4's load
 * through the lazy backend when a page first asks for them, and again for the
 * new language when it changes.
 */
export function createI18n(language: Locale): i18n {
  const instance = i18next.createInstance();
  void instance
    .use(lazyNamespaceBackend)
    .use(initReactI18next)
    .init({
      resources: bundledResources,
      partialBundledLanguages: true,
      lng: language,
      fallbackLng: 'en',
      supportedLngs: ['en', 'zh-CN'],
      ns: BUNDLED_NAMESPACES,
      defaultNS: 'common',
      initAsync: false,
      returnNull: false,
      // React already escapes rendered text.
      interpolation: { escapeValue: false },
    });
  return instance;
}
