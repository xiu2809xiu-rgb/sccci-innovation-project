import type { PossibleMatch } from '@huitong/shared';
import { UserSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/**
 * Existing employees a new record may duplicate. HR checks them before
 * applying; the sync still creates the record on its own, because a
 * look-alike name never merges two people (story B-5).
 */
export function PossibleMatchList({ matches }: { matches: readonly PossibleMatch[] }) {
  const { t } = useTranslation('connectors');
  return (
    <div className="mt-1.5 space-y-1 rounded-md border border-warning-border bg-warning-subtle px-2.5 py-2 text-xs">
      <p className="flex items-center gap-1.5 font-medium text-warning">
        <UserSearch className="size-3.5" aria-hidden="true" />
        {t('sync.preview.possibleMatch.title', { count: matches.length })}
      </p>
      <ul className="space-y-0.5 text-foreground">
        {matches.map((match) => (
          <li key={match.employeeNo}>
            <Link
              to={`/employees?employee=${match.employeeNo}`}
              target="_blank"
              rel="noopener"
              className="font-mono tabular-nums underline underline-offset-2"
            >
              {match.employeeNo}
              <span className="sr-only"> {t('sync.preview.possibleMatch.newTab')}</span>
            </Link>
            {' · '}
            {match.reasons
              .map((reason) => t(`sync.preview.possibleMatch.reason.${reason}`))
              .join(t('sync.preview.possibleMatch.separator'))}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">{t('sync.preview.possibleMatch.note')}</p>
    </div>
  );
}
