import {
  DEPARTMENT_CODES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  ENTITY_CODES,
  WORK_LOCATION_CODES,
  type EmployeeField,
} from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useEmployeeLabels, type EmployeeLabels } from '../hooks/use-employee-labels';

const DATE_FIELDS: ReadonlySet<EmployeeField> = new Set([
  'hireDate',
  'terminationDate',
  'dateOfBirth',
]);

interface Option {
  value: string;
  label: string;
}

/** Fields with a fixed set of values get a picker, so HR cannot type a code the master rejects. */
const PICKERS: Partial<Record<EmployeeField, (labels: EmployeeLabels) => Option[]>> = {
  departmentCode: (labels) =>
    DEPARTMENT_CODES.map((code) => ({
      value: code,
      label: `${labels.department(code)} (${code})`,
    })),
  employmentStatus: (labels) =>
    EMPLOYMENT_STATUSES.map((value) => ({ value, label: labels.employmentStatus(value) })),
  employmentType: (labels) =>
    EMPLOYMENT_TYPES.map((value) => ({ value, label: labels.employmentType(value) })),
  workLocation: (labels) =>
    WORK_LOCATION_CODES.map((value) => ({ value, label: labels.workLocation(value) })),
  entityCode: (labels) =>
    ENTITY_CODES.map((value) => ({ value, label: labels.entityChoice(value) })),
};

/** The input for a typed-in value, shaped by the field: a date, a picker or plain text. */
export function ManualValueInput({
  id,
  field,
  value,
  onChange,
  labelledBy,
}: {
  id: string;
  field: EmployeeField;
  value: string;
  onChange: (value: string) => void;
  /** The id of the visible text that names the input. */
  labelledBy: string;
}) {
  const { t } = useTranslation('employees');
  const labels = useEmployeeLabels();
  const options = PICKERS[field]?.(labels) ?? null;

  if (options) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full" aria-labelledby={labelledBy}>
          <SelectValue placeholder={t('resolve.choose')} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      id={id}
      type={DATE_FIELDS.has(field) ? 'date' : 'text'}
      value={value}
      aria-labelledby={labelledBy}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}
