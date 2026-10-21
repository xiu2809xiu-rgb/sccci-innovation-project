import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface Titled {
  title: string;
  titleZh: string;
}

/** Picks a step's or a task's title in the reader's language (both come from the definition). */
export function useLocalizedTitle(): (item: Titled) => string {
  const { i18n } = useTranslation();
  const chinese = i18n.language === 'zh-CN';
  return useCallback((item: Titled) => (chinese ? item.titleZh : item.title), [chinese]);
}
