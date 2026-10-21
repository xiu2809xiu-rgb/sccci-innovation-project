import { EMPLOYEE_FIELDS, type EmployeeField } from '@huitong/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const isEmployeeField = (field: string): field is EmployeeField =>
  (EMPLOYEE_FIELDS as readonly string[]).includes(field);

/** A canonical field's label in the reader's language; any other name is shown as it is. */
export function useFieldLabel(): (field: string) => string {
  const { t } = useTranslation('employees');
  return useCallback((field) => (isEmployeeField(field) ? t(`fields.${field}`) : field), [t]);
}
