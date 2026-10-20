import type { i18n } from 'i18next';
import { useEffect } from 'react';

import { usePreferences } from './preferences-store';

/** Keeps `<html>` in step with the saved theme and language, following the OS when the theme is "system". */
export function useApplyPreferences(instance: i18n): void {
  const theme = usePreferences((state) => state.theme);
  const language = usePreferences((state) => state.language);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    if (theme !== 'system') {
      return undefined;
    }
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
    };
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    void instance.changeLanguage(language);
  }, [instance, language]);
}
