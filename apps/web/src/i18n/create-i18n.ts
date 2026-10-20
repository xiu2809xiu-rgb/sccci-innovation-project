import type { Locale } from '@huitong/shared';
import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { NAMESPACES, resources } from './resources';

/**
 * Creates the app's i18next instance with every namespace bundled, so the
 * first render already has its strings (no loading flash, no extra requests).
 */
export function createI18n(language: Locale): i18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-CN'],
    ns: NAMESPACES,
    defaultNS: 'common',
    initAsync: false,
    returnNull: false,
    // React already escapes rendered text.
    interpolation: { escapeValue: false },
  });
  return instance;
}
