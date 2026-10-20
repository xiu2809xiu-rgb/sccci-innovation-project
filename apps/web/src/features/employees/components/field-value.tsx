import {
  employmentStatusSchema,
  employmentTypeSchema,
  entityCodeSchema,
  isMasked,
  workLocationSchema,
  type EmployeeField,
} from '@huitong/shared';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { MaskedValue } from '@/components/common/masked-value';
import { useFormatters } from '@/hooks/use-formatters';

import { useEmployeeLabels } from '../hooks/use-employee-labels';

const moneySchema = z.object({ amount: z.number(), currency: z.string() });
const DATE_FIELDS: ReadonlySet<EmployeeField> = new Set([
  'hireDate',
  'terminationDate',
  'dateOfBirth',
]);

/**
 * One canonical field's value as people read it: dates and money in the UI
 * locale, codes as names, masked values with their reason, and an explicit
 * "not recorded" rather than a blank.
 */
export function FieldValue({ field, value }: { field: EmployeeField; value: unknown }) {
  const { t } = useTranslation('employees');
  const format = useFormatters();
  const labels = useEmployeeLabels();

  if (value === null || value === undefined || value === '') {
    return (
      <span className="text-subtle-foreground">
        <span aria-hidden="true">—</span>
        <span className="sr-only">{t('value.empty')}</span>
      </span>
    );
  }
  if (isMasked(value)) return <MaskedValue value={value} />;

  const text = (() => {
    if (field === 'baseSalary') {
      const money = moneySchema.safeParse(value);
      return money.success ? format.money(money.data.amount, money.data.currency) : null;
    }
    if (typeof value !== 'string') return typeof value === 'number' ? format.number(value) : null;
    if (DATE_FIELDS.has(field)) return format.date(value);
    if (field === 'departmentCode') return `${labels.department(value)} (${value})`;
    if (field === 'bankAccountLast4') return t('value.accountEnding', { digits: value });
    const status = employmentStatusSchema.safeParse(value);
    if (field === 'employmentStatus' && status.success) return labels.employmentStatus(status.data);
    const type = employmentTypeSchema.safeParse(value);
    if (field === 'employmentType' && type.success) return labels.employmentType(type.data);
    const location = workLocationSchema.safeParse(value);
    if (field === 'workLocation' && location.success) return labels.workLocation(location.data);
    const entity = entityCodeSchema.safeParse(value);
    if (field === 'entityCode' && entity.success) return labels.entity(entity.data);
    return value;
  })();

  return text === null ? (
    <code className="font-mono text-xs">{JSON.stringify(value)}</code>
  ) : (
    <span className="break-words">{text}</span>
  );
}
