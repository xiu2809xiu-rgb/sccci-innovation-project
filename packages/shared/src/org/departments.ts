import { z } from 'zod';

/** Canonical department codes used by the employee master and every report. */
export const DEPARTMENT_CODES = [
  'EXEC',
  'FIN',
  'HR',
  'COMP',
  'RISK',
  'IT',
  'OPS',
  'WM',
  'CB',
  'ADMIN',
  'LEGAL',
] as const;

export const departmentCodeSchema = z.enum(DEPARTMENT_CODES);

export type DepartmentCode = z.infer<typeof departmentCodeSchema>;

export interface DepartmentInfo {
  code: DepartmentCode;
  nameEn: string;
  nameZh: string;
}

export const DEPARTMENTS: readonly DepartmentInfo[] = [
  { code: 'EXEC', nameEn: 'Executive Office', nameZh: '总经理办公室' },
  { code: 'FIN', nameEn: 'Finance', nameZh: '财务部' },
  { code: 'HR', nameEn: 'Human Resources', nameZh: '人力资源部' },
  { code: 'COMP', nameEn: 'Compliance', nameZh: '合规部' },
  { code: 'RISK', nameEn: 'Risk Management', nameZh: '风险管理部' },
  { code: 'IT', nameEn: 'Information Technology', nameZh: '信息技术部' },
  { code: 'OPS', nameEn: 'Operations', nameZh: '运营部' },
  { code: 'WM', nameEn: 'Wealth Management', nameZh: '财富管理部' },
  { code: 'CB', nameEn: 'Corporate Banking', nameZh: '公司金融部' },
  { code: 'ADMIN', nameEn: 'Administration', nameZh: '行政部' },
  { code: 'LEGAL', nameEn: 'Legal', nameZh: '法务部' },
];
