import {
  DEPARTMENT_CODES,
  EMPLOYMENT_STATUSES,
  ENTITY_CODES,
  type EmployeeListQuery,
} from '@huitong/shared';
import { Search, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useEmployeeLabels } from '../hooks/use-employee-labels';
import type { UrlChanges } from '../hooks/use-employee-url-state';

const ALL = 'all';
const SEARCH_DELAY_MS = 300;

interface FilterSelectProps {
  label: string;
  allLabel: string;
  value: string | undefined;
  options: readonly { value: string; label: string }[];
  onChange: (value: string | null) => void;
}

function FilterSelect({ label, allLabel, value, options, onChange }: FilterSelectProps) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(next) => {
        onChange(next === ALL ? null : next);
      }}
    >
      <SelectTrigger aria-label={label} className="min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Search and filters for the employee list; every change resets to the first page. */
export function EmployeeFilters({
  query,
  onChange,
}: {
  query: EmployeeListQuery;
  onChange: (changes: UrlChanges) => void;
}) {
  const { t } = useTranslation('employees');
  const labels = useEmployeeLabels();
  const conflictsId = useId();
  const [search, setSearch] = useState(query.q ?? '');

  // Typing waits for a pause before it queries, so each keystroke is not a request.
  useEffect(() => {
    if (search === (query.q ?? '')) return undefined;
    const timer = window.setTimeout(() => {
      onChange({ q: search.trim() || null, page: null });
    }, SEARCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [search, query.q, onChange]);

  const filtered =
    query.q !== undefined ||
    query.entityCode !== undefined ||
    query.departmentCode !== undefined ||
    query.employmentStatus !== undefined ||
    query.conflicts !== undefined;

  return (
    <div
      role="search"
      aria-label={t('filters.label')}
      className="flex flex-wrap items-center gap-3"
    >
      <InputGroup className="w-full max-w-xs">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={search}
          aria-label={t('filters.search')}
          placeholder={t('filters.search')}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
      </InputGroup>
      <FilterSelect
        label={t('filters.entity')}
        allLabel={t('filters.allEntities')}
        value={query.entityCode}
        options={ENTITY_CODES.map((code) => ({ value: code, label: labels.entityChoice(code) }))}
        onChange={(value) => {
          onChange({ entityCode: value, page: null });
        }}
      />
      <FilterSelect
        label={t('filters.department')}
        allLabel={t('filters.allDepartments')}
        value={query.departmentCode}
        options={DEPARTMENT_CODES.map((code) => ({ value: code, label: labels.department(code) }))}
        onChange={(value) => {
          onChange({ departmentCode: value, page: null });
        }}
      />
      <FilterSelect
        label={t('filters.status')}
        allLabel={t('filters.allStatuses')}
        value={query.employmentStatus}
        options={EMPLOYMENT_STATUSES.map((status) => ({
          value: status,
          label: labels.employmentStatus(status),
        }))}
        onChange={(value) => {
          onChange({ employmentStatus: value, page: null });
        }}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          id={conflictsId}
          checked={query.conflicts === 'open'}
          onCheckedChange={(checked) => {
            onChange({ conflicts: checked === true ? 'open' : null, page: null });
          }}
        />
        <Label htmlFor={conflictsId} className="text-sm font-normal">
          {t('filters.conflictsOnly')}
        </Label>
      </div>
      {filtered ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch('');
            onChange({
              q: null,
              entityCode: null,
              departmentCode: null,
              employmentStatus: null,
              conflicts: null,
              page: null,
            });
          }}
        >
          <X aria-hidden="true" data-icon="inline-start" />
          {t('filters.clear')}
        </Button>
      ) : null}
    </div>
  );
}
