import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Sets `document.title` to "<page> · HuiTong 汇通" (or just the app name). */
export function useDocumentTitle(page: string | undefined): void {
  const { t } = useTranslation();
  const appName = t('app.fullName');
  useEffect(() => {
    document.title = page ? `${page} · ${appName}` : appName;
  }, [page, appName]);
}
