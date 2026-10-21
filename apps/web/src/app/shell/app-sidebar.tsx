import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { BrandMark } from '@/components/common/brand-mark';
import { useSession } from '@/app/session/use-session';

import { activeNavItem, SETTINGS_NAV_ITEM, visibleNavGroups, type NavItem } from '../navigation';

function NavEntry({ item, active }: { item: NavItem; active: boolean }) {
  const { t } = useTranslation();
  const label = t(`nav.${item.key}`);
  return (
    <SidebarMenuItem>
      <Link to={item.to} aria-current={active ? 'page' : undefined}>
        <SidebarMenuButton isActive={active} tooltip={label} asChild>
          <span>
            <item.icon aria-hidden="true" />
            <span>{label}</span>
          </span>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
}

/** Primary navigation: three short groups filtered by the signed-in role's permissions. */
export function AppSidebar() {
  const { t } = useTranslation();
  const session = useSession();
  const groups = visibleNavGroups(session.permissions);
  // One item is current: a page inside another item's path, such as the audit log, is its own.
  const active = activeNavItem(useLocation().pathname, [
    ...groups.flatMap((group) => group.items),
    SETTINGS_NAV_ITEM,
  ]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <BrandMark className="h-10 px-1" nameClassName="group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      {/* One navigation landmark for the menu and Settings; `contents` keeps the sidebar's flex layout. */}
      <nav aria-label={t('nav.label')} className="contents">
        <SidebarContent>
          {groups.map((group) => (
            <SidebarGroup key={group.key}>
              <SidebarGroupLabel>{t(`nav.groups.${group.key}`)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <NavEntry key={item.key} item={item} active={item.key === active?.key} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <NavEntry item={SETTINGS_NAV_ITEM} active={active?.key === 'settings'} />
          </SidebarMenu>
        </SidebarFooter>
      </nav>
      <SidebarRail />
    </Sidebar>
  );
}
