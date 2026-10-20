import { localeSchema, type Locale } from '@huitong/shared';

export const LANGUAGE_STORAGE_KEY = 'huitong.language';

/** Reads a saved preference; storage can be blocked (private mode, policy), so failures mean "none". */
function savedLanguage(): Locale | null {
  try {
    const parsed = localeSchema.safeParse(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The saved language, else the browser's first Chinese or English preference, else English. */
export function detectLanguage(languages: readonly string[] = navigator.languages): Locale {
  const saved = savedLanguage();
  if (saved) {
    return saved;
  }
  for (const language of languages) {
    const lower = language.toLowerCase();
    if (lower.startsWith('zh')) {
      return 'zh-CN';
    }
    if (lower.startsWith('en')) {
      return 'en';
    }
  }
  return 'en';
}
