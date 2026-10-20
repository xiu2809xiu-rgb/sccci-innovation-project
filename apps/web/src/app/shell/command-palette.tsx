import { LogOut, Monitor, Moon, Search, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { usePreferences, type ThemePreference } from '@/app/preferences/preferences-store';
import { useSignOut } from '@/app/session/session-mutations';
import { useSession } from '@/app/session/use-session';

import { SETTINGS_NAV_ITEM, visibleNavGroups } from '../navigation';

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

/**
 * ⌘K / Ctrl+K: jump to any page the role may open, or change a preference,
 * without the mouse (recognition over recall; an accelerator for experts).
 */
export function CommandPalette() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const session = useSession();
  const signOut = useSignOut();
  const setTheme = usePreferences((state) => state.setTheme);
  const setLanguage = usePreferences((state) => state.setLanguage);
  const items = [
    ...visibleNavGroups(session.permissions).flatMap((group) => group.items),
    SETTINGS_NAV_ITEM,
  ];
  const otherLanguage = i18n.language === 'zh-CN' ? 'en' : 'zh-CN';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden w-56 justify-start gap-2 text-muted-foreground md:inline-flex"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Search aria-hidden="true" data-icon="inline-start" />
        <span className="flex-1 text-left">{t('shell.search')}</span>
        <Kbd>⌘K</Kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={t('shell.search')}
        onClick={() => {
          setOpen(true);
        }}
      >
        <Search aria-hidden="true" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('shell.commandPalette.title')}
        description={t('shell.commandPalette.description')}
      >
        {/* cmdk keeps its search state in <Command>; the dialog no longer adds it. */}
        <Command>
          <CommandInput placeholder={t('shell.commandPalette.placeholder')} />
          <CommandList>
            <CommandEmpty>{t('shell.commandPalette.empty')}</CommandEmpty>
            <CommandGroup heading={t('shell.commandPalette.groups.navigate')}>
              {items.map((item) => (
                <CommandItem
                  key={item.key}
                  value={`${t(`nav.${item.key}`)} ${item.to}`}
                  onSelect={() => {
                    run(() => void navigate(item.to));
                  }}
                >
                  <item.icon aria-hidden="true" />
                  {t(`nav.${item.key}`)}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading={t('shell.commandPalette.groups.preferences')}>
              <CommandItem
                onSelect={() => {
                  run(() => {
                    setLanguage(otherLanguage);
                  });
                }}
              >
                {t('shell.commandPalette.switchLanguage', {
                  language: t(`shell.language.${otherLanguage}`),
                })}
              </CommandItem>
              {(['light', 'dark', 'system'] as ThemePreference[]).map((theme) => {
                const Icon = THEME_ICONS[theme];
                return (
                  <CommandItem
                    key={theme}
                    onSelect={() => {
                      run(() => {
                        setTheme(theme);
                      });
                    }}
                  >
                    <Icon aria-hidden="true" />
                    {t('shell.commandPalette.switchTheme', { theme: t(`shell.theme.${theme}`) })}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading={t('shell.commandPalette.groups.session')}>
              <CommandItem
                onSelect={() => {
                  run(() => {
                    signOut.mutate(undefined, {
                      onSettled: () => {
                        void navigate('/login');
                      },
                    });
                  });
                }}
              >
                <LogOut aria-hidden="true" />
                {t('shell.commandPalette.signOut')}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
