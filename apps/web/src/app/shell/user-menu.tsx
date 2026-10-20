import { LogOut, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSignOut } from '@/app/session/session-mutations';
import { useSession } from '@/app/session/use-session';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    parts.length > 1 ? `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}` : name.slice(0, 2)
  ).toUpperCase();
}

/** The signed-in person, their role, and sign-out. */
export function UserMenu() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const name =
    i18n.language === 'zh-CN' && session.displayNameZh
      ? session.displayNameZh
      : session.displayName;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* The visible initials start the accessible name, so speech users can say them (WCAG 2.5.3). */}
        <Button variant="ghost" size="icon">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{initials(session.displayName)}</AvatarFallback>
          </Avatar>{' '}
          <span className="sr-only">{`${t('shell.userMenu.label')}: ${name}`}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <span className="block text-xs font-normal text-muted-foreground">
            {t('shell.userMenu.signedInAs')}
          </span>
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {t(`roles.${session.role}`)} · {t(`entities.${session.homeEntityCode}`)}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings aria-hidden="true" />
            {t('shell.userMenu.settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            signOut.mutate(undefined, {
              onSettled: () => {
                void navigate('/login');
              },
            });
          }}
        >
          <LogOut aria-hidden="true" />
          {t('shell.userMenu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
