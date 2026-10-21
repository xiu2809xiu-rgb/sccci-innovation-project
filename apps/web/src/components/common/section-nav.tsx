import { NavLink } from 'react-router';

import { cn } from '@/lib/utils';

export interface SectionNavItem {
  to: string;
  /** Already translated. */
  label: string;
  /** True for a section index, so it is not also active on its siblings' paths. */
  end?: boolean;
}

/**
 * The pages of one area, one step from each other (recognition over recall).
 * Links, not tabs: each page has its own address, breadcrumb and route pattern.
 */
export function SectionNav({ label, items }: { label: string; items: readonly SectionNavItem[] }) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
