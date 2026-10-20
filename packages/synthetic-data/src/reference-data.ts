import type { Department, Entity, WorkLocation } from './types.js';

export const SYNTHETIC_SEED = 20261020;

export const SYNTHETIC_DATA_LABEL = 'Synthetic demo data';

/** "Today" for the dataset: statuses, probation and termination are relative to this date. */
export const DATASET_REFERENCE_DATE = '2026-10-15';

/** Attendance and leave cover Q3 2026. */
export const DATASET_PERIOD = { from: '2026-07-01', to: '2026-09-30' } as const;

export const ENTITIES: readonly Entity[] = [
  {
    code: 'SG01',
    name: 'Organisation E Singapore Pte. Ltd.',
    nameZh: 'E机构新加坡私人有限公司',
    country: 'SG',
    currency: 'SGD',
    timezone: 'Asia/Singapore',
  },
  {
    code: 'CN01',
    name: 'Organisation E Group HQ',
    nameZh: 'E机构集团总部',
    country: 'CN',
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
  },
];

export const DEPARTMENTS: readonly Department[] = [
  {
    code: 'EXEC',
    nameEn: 'Executive Office',
    nameZh: '总经理办公室',
    sgCode: 'SG-EXEC',
    sapOrgUnit: '50001000',
    order: 0,
  },
  {
    code: 'FIN',
    nameEn: 'Finance',
    nameZh: '财务部',
    sgCode: 'SG-FIN',
    sapOrgUnit: '50001010',
    order: 1,
  },
  {
    code: 'HR',
    nameEn: 'Human Resources',
    nameZh: '人力资源部',
    sgCode: 'SG-HR',
    sapOrgUnit: '50001030',
    order: 3,
  },
  {
    code: 'COMP',
    nameEn: 'Compliance',
    nameZh: '合规部',
    sgCode: 'SG-COMP',
    sapOrgUnit: '50001040',
    order: 4,
  },
  {
    code: 'RISK',
    nameEn: 'Risk Management',
    nameZh: '风险管理部',
    sgCode: 'SG-RISK',
    sapOrgUnit: '50001050',
    order: 5,
  },
  {
    code: 'IT',
    nameEn: 'Information Technology',
    nameZh: '信息技术部',
    sgCode: 'SG-IT',
    sapOrgUnit: '50001060',
    order: 6,
  },
  {
    code: 'OPS',
    nameEn: 'Operations',
    nameZh: '运营部',
    sgCode: 'SG-OPS',
    sapOrgUnit: '50001070',
    order: 7,
  },
  {
    code: 'WM',
    nameEn: 'Wealth Management',
    nameZh: '财富管理部',
    sgCode: 'SG-WM',
    sapOrgUnit: '50001080',
    order: 8,
  },
  {
    code: 'CB',
    nameEn: 'Corporate Banking',
    nameZh: '公司金融部',
    sgCode: null,
    sapOrgUnit: '50001090',
    order: 9,
  },
  {
    code: 'ADMIN',
    nameEn: 'Administration',
    nameZh: '行政部',
    sgCode: 'SG-ADMIN',
    sapOrgUnit: '50001100',
    order: 10,
  },
  {
    code: 'LEGAL',
    nameEn: 'Legal',
    nameZh: '法务部',
    sgCode: null,
    sapOrgUnit: '50001110',
    order: 11,
  },
];

export const WORK_LOCATIONS: readonly WorkLocation[] = [
  { code: 'SG-SIN', nameEn: 'Singapore', nameZh: '新加坡' },
  { code: 'CN-SHA', nameEn: 'Shanghai', nameZh: '上海' },
  { code: 'CN-PEK', nameEn: 'Beijing', nameZh: '北京' },
  { code: 'CN-SZX', nameEn: 'Shenzhen', nameZh: '深圳' },
];

/** Synthetic public holidays inside the dataset period, per entity. */
export const PUBLIC_HOLIDAYS: Readonly<Record<'SG01' | 'CN01', readonly string[]>> = {
  SG01: ['2026-08-10'],
  CN01: ['2026-09-25'],
};

/** Looks up a department by code. */
export function departmentByCode(code: Department['code']): Department {
  const department = DEPARTMENTS.find((candidate) => candidate.code === code);
  if (!department) {
    throw new Error(`Unknown department ${code}`);
  }
  return department;
}

/** Looks up a work location by code. */
export function workLocationByCode(code: WorkLocation['code']): WorkLocation {
  const location = WORK_LOCATIONS.find((candidate) => candidate.code === code);
  if (!location) {
    throw new Error(`Unknown work location ${code}`);
  }
  return location;
}
