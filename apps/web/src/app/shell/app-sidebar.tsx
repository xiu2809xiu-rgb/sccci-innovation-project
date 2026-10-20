import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

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

import { SETTINGS_NAV_ITEM, visibleNavGroups, type NavItem } from '../navigation';

function NavEntry({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const label = t(`nav.${item.key}`);
  return (
    <SidebarMenuItem>
      <NavLink to={item.to} end={item.to === '/workflows'}>
        {({ isActive }) => (
          <SidebarMenuButton isActive={isActive} tooltip={label} asChild>
            <span>
              <item.icon aria-hidden="true" />
              <span>{label}</span>
            </span>
          </SidebarMenuButton>
        )}
      </NavLink>
    </SidebarMenuItem>
  );
}

/** Primary navigation: three short groups filtered by the signed-in role's permissions. */
export function AppSidebar() {
  const { t } = useTranslation();
  const session = useSession();
  const groups = visibleNavGroups(session.permissions);

  return (
    <Sidebar collapsible="icon" aria-label={t('nav.label')}>
      <SidebarHeader>
        <BrandMark className="h-10 px-1" nameClassName="group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.key}>
            <SidebarGroupLabel>{t(`nav.groups.${group.key}`)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavEntry key={item.key} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <NavEntry item={SETTINGS_NAV_ITEM} />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
