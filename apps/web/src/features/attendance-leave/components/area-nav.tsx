import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { cn } from '@/lib/utils';

const SECTIONS = [
  { to: '/attendance-leave', key: 'runs', end: true },
  { to: '/attendance-leave/mappings', key: 'rules', end: false },
  { to: '/attendance-leave/template', key: 'template', end: false },
] as const;

/** The three attendance and leave pages, one step from each other (recognition over recall). */
export function AreaNav() {
  const { t } = useTranslation('attendanceLeave');
  return (
    <nav aria-label={t('nav.label')}>
      <ul className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {SECTIONS.map((section) => (
          <li key={section.key}>
            <NavLink
              to={section.to}
              end={section.end}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {t(`nav.${section.key}`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
