import { describe, expect, it } from 'vitest';

import { activeNavItem, NAV_GROUPS, SETTINGS_NAV_ITEM } from './navigation';

const items = [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_NAV_ITEM];
const active = (pathname: string) => activeNavItem(pathname, items)?.key;

describe('activeNavItem', () => {
  it('marks the most specific item, so a page with its own entry is not also its parent', () => {
    expect(active('/governance/audit')).toBe('audit');
    expect(active('/workflows/tasks')).toBe('tasks');
  });

  it('keeps the parent current on its other pages', () => {
    expect(active('/governance/transfers')).toBe('governance');
    expect(active('/workflows/0198d6e2-1b40-7f63-9d15-6a2e4c8b7f02')).toBe('workflows');
    expect(active('/analytics/ai-usage')).toBe('analytics');
  });

  it('matches whole path segments only', () => {
    expect(active('/governance-archive')).toBeUndefined();
    expect(active('/settings')).toBe('settings');
  });
});
