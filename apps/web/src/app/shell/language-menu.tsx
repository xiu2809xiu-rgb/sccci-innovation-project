import { localeSchema, SUPPORTED_LOCALES } from '@huitong/shared';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePreferences } from '@/app/preferences/preferences-store';

/** EN / 中文 switch. Each language is named in itself so either reader can find their own. */
export function LanguageMenu() {
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const setLanguage = usePreferences((state) => state.setLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${t('shell.language.label')}: ${t(`shell.language.${language}`)}`}
        >
          <Languages aria-hidden="true" data-icon="inline-start" />
          <span aria-hidden="true">{language === 'zh-CN' ? '中' : 'EN'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t('shell.language.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={language}
          onValueChange={(value) => {
            const parsed = localeSchema.safeParse(value);
            if (parsed.success) setLanguage(parsed.data);
          }}
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale} lang={locale}>
              {t(`shell.language.${locale}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
