import type { Locale } from '@huitong/shared';
import { create } from 'zustand';

import { detectLanguage, LANGUAGE_STORAGE_KEY } from '@/i18n/detect-language';

export type ThemePreference = 'light' | 'dark' | 'system';

/** Read by public/theme-init.js before first paint, so keep the key and values in step with it. */
const THEME_STORAGE_KEY = 'huitong.theme';
const CONSENT_STORAGE_KEY = 'huitong.analytics-consent';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage is blocked (private mode, policy): the choice lasts for this visit only.
  }
}

function savedTheme(): ThemePreference {
  const value = read(THEME_STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export interface PreferencesState {
  theme: ThemePreference;
  language: Locale;
  /** Clickstream analytics is opt-in; Global Privacy Control overrides a yes. */
  analyticsConsent: boolean;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: Locale) => void;
  setAnalyticsConsent: (granted: boolean) => void;
}

/** Per-viewer preferences, kept in local storage. The only client state outside the server cache. */
export const usePreferences = create<PreferencesState>()((set) => ({
  theme: savedTheme(),
  language: detectLanguage(),
  analyticsConsent: read(CONSENT_STORAGE_KEY) === 'granted',
  setTheme: (theme) => {
    write(THEME_STORAGE_KEY, theme);
    set({ theme });
  },
  setLanguage: (language) => {
    write(LANGUAGE_STORAGE_KEY, language);
    set({ language });
  },
  setAnalyticsConsent: (granted) => {
    write(CONSENT_STORAGE_KEY, granted ? 'granted' : 'denied');
    set({ analyticsConsent: granted });
  },
}));
