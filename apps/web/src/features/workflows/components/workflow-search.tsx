import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

const SEARCH_DELAY_MS = 300;

/** Searches requests by title or OA id; typing waits for a pause before it queries. */
export function WorkflowSearch({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (q: string | null) => void;
}) {
  const { t } = useTranslation('workflows');
  const [search, setSearch] = useState(value ?? '');
  const [applied, setApplied] = useState(value);

  // A change from outside, such as "Clear the search" or going back, replaces what is typed.
  if (value !== applied) {
    setApplied(value);
    if ((value ?? '') !== search.trim()) setSearch(value ?? '');
  }

  useEffect(() => {
    if (search === (value ?? '')) return undefined;
    const timer = window.setTimeout(() => {
      onChange(search.trim() || null);
    }, SEARCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [search, value, onChange]);

  return (
    <div role="search" aria-label={t('search.label')} className="w-full max-w-xs">
      <InputGroup>
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={search}
          aria-label={t('search.label')}
          placeholder={t('search.placeholder')}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
      </InputGroup>
    </div>
  );
}
