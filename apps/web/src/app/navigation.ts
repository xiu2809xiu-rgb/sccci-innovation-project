import type { Permission } from '@huitong/shared';
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  Network,
  PlugZap,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

/** Keys under `nav.` in the common namespace. */
export type NavKey =
  | 'overview'
  | 'employees'
  | 'connectors'
  | 'newMapping'
  | 'connectorDetail'
  | 'integrationMap'
  | 'workflows'
  | 'tasks'
  | 'workflowInstance'
  | 'attendanceLeave'
  | 'leaveMappings'
  | 'reportTemplate'
  | 'reports'
  | 'governance'
  | 'audit'
  | 'analytics'
  | 'settings';

export interface NavItem {
  key: NavKey;
  to: string;
  icon: LucideIcon;
  /** Hidden from roles without it; the page itself also checks. */
  requires?: Permission;
}

export interface NavGroup {
  key: 'workspace' | 'automation' | 'governance';
  items: NavItem[];
}

/**
 * The sidebar, the command palette and the breadcrumbs all read this list,
 * so a page is added in one place. Order follows the HR user's day: status
 * first, then the work, then oversight (Hick's law: three short groups).
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    key: 'workspace',
    items: [
      { key: 'overview', to: '/overview', icon: LayoutDashboard },
      { key: 'employees', to: '/employees', icon: Users, requires: 'employees:read' },
      { key: 'connectors', to: '/connectors', icon: PlugZap, requires: 'connectors:read' },
      { key: 'integrationMap', to: '/integration-map', icon: Network, requires: 'connectors:read' },
    ],
  },
  {
    key: 'automation',
    items: [
      { key: 'workflows', to: '/workflows', icon: Workflow, requires: 'workflows:read' },
      { key: 'tasks', to: '/workflows/tasks', icon: ClipboardList, requires: 'workflows:tasks' },
      {
        key: 'attendanceLeave',
        to: '/attendance-leave',
        icon: CalendarClock,
        requires: 'attendance:read',
      },
      { key: 'reports', to: '/reports', icon: FileSpreadsheet, requires: 'reports:read' },
    ],
  },
  {
    key: 'governance',
    items: [
      { key: 'governance', to: '/governance', icon: ShieldCheck, requires: 'governance:read' },
      { key: 'audit', to: '/governance/audit', icon: ScrollText, requires: 'audit:read' },
      { key: 'analytics', to: '/analytics', icon: BarChart3, requires: 'analytics:read' },
    ],
  },
];

export const SETTINGS_NAV_ITEM: NavItem = { key: 'settings', to: '/settings', icon: Settings };

/** The groups with only the items the given permissions allow; empty groups are dropped. */
export function visibleNavGroups(permissions: readonly Permission[]): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.requires || permissions.includes(item.requires)),
  })).filter((group) => group.items.length > 0);
}
