import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { AppBreadcrumbs } from './app-breadcrumbs';
import { CommandPalette } from './command-palette';
import { LanguageMenu } from './language-menu';
import { NotificationsMenu } from './notifications-menu';
import { RoleSwitcher } from './role-switcher';
import { ThemeMenu } from './theme-menu';
import { UserMenu } from './user-menu';

/**
 * The bar above every page: navigation toggle and breadcrumbs on the left,
 * search, demo role, preferences, notifications and account on the right.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-1 data-vertical:h-4 data-vertical:self-center"
      />
      <div className="min-w-0 flex-1">
        <AppBreadcrumbs />
      </div>
      <CommandPalette />
      <div className="flex items-center gap-0.5">
        <span className="hidden xl:inline-flex">
          <SyntheticDataBadge />
        </span>
        <RoleSwitcher />
        <LanguageMenu />
        <ThemeMenu />
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
