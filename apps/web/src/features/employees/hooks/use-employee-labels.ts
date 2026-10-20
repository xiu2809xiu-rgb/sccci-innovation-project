import {
  DEPARTMENTS,
  type EmployeeField,
  type EmploymentStatus,
  type EmploymentType,
  type EntityCode,
  type MappingTarget,
  type WorkLocation,
} from '@huitong/shared';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** Display labels for employee data in the UI language: fields, sources, departments and codes. */
export interface EmployeeLabels {
  field: (field: EmployeeField | MappingTarget) => string;
  /** A connector's short name; unknown connectors (new file imports) show their id. */
  source: (connectorId: string) => string;
  department: (code: string) => string;
  entity: (code: EntityCode) => string;
  /** "MY01 · Malaysia": choices show the code HR also sees on connectors and exports. */
  entityChoice: (code: EntityCode) => string;
  employmentType: (type: EmploymentType) => string;
  employmentStatus: (status: EmploymentStatus) => string;
  workLocation: (code: WorkLocation) => string;
}

export function useEmployeeLabels(): EmployeeLabels {
  const { t, i18n } = useTranslation('employees');
  const { t: tCommon } = useTranslation();
  const chinese = i18n.language === 'zh-CN';
  return useMemo(
    () => ({
      // The salary parts are mapping targets, not nested keys.
      field: (field) =>
        field === 'baseSalary.amount'
          ? t('fields.baseSalaryAmount')
          : field === 'baseSalary.currency'
            ? t('fields.baseSalaryCurrency')
            : t(`fields.${field}`),
      source: (connectorId) => t(`sources.${connectorId}`, { defaultValue: connectorId }),
      department: (code) => {
        const department = DEPARTMENTS.find((candidate) => candidate.code === code);
        if (!department) return code;
        return chinese ? department.nameZh : department.nameEn;
      },
      entity: (code) => tCommon(`entities.${code}`),
      entityChoice: (code) => `${code} · ${tCommon(`entities.${code}`)}`,
      employmentType: (type) => t(`employmentType.${type}`),
      employmentStatus: (status) => t(`employmentStatus.${status}`),
      workLocation: (code) => t(`workLocation.${code}`),
    }),
    [t, tCommon, chinese],
  );
}
