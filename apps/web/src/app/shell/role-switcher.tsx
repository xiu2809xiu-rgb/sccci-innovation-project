import { ROLES, roleSchema } from '@huitong/shared';
import { UserRoundCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDemoSignIn } from '@/app/session/session-mutations';
import { useAuthOptions } from '@/app/session/use-auth-options';
import { useSession } from '@/app/session/use-session';

/**
 * Demo mode only: sign in as another role's seeded user to see the same
 * screens through that role's permissions and masking. Hidden otherwise.
 */
export function RoleSwitcher() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const options = useAuthOptions();
  const demoSignIn = useDemoSignIn();

  if (options?.demoMode !== true) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${t('shell.roleSwitcher.label')}: ${t(`roles.${session.role}`)}`}
        >
          <UserRoundCog aria-hidden="true" data-icon="inline-start" />
          <span className="hidden max-w-36 truncate lg:inline">{t(`roles.${session.role}`)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <span className="block">{t('shell.roleSwitcher.label')}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {t('shell.roleSwitcher.description')}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={session.role}
          onValueChange={(value) => {
            const role = roleSchema.safeParse(value);
            if (!role.success || role.data === session.role) return;
            demoSignIn.mutate(role.data, {
              onSuccess: (user) => {
                const name =
                  i18n.language === 'zh-CN' && user.displayNameZh
                    ? user.displayNameZh
                    : user.displayName;
                toast.success(
                  t('shell.roleSwitcher.switched', { name, role: t(`roles.${user.role}`) }),
                );
              },
              onError: () => {
                toast.error(t('shell.roleSwitcher.failed'));
              },
            });
          }}
        >
          {ROLES.map((role) => (
            <DropdownMenuRadioItem key={role} value={role} disabled={demoSignIn.isPending}>
              {t(`roles.${role}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
