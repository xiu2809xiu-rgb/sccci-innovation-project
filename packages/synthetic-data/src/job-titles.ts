import type { DepartmentCode } from './types.js';

export interface JobTitle {
  en: string;
  zh: string;
  grade: string;
}

interface DepartmentTitles {
  head: JobTitle;
  staff: readonly JobTitle[];
}

/** Titles per department: one head of department and a ladder of staff roles. */
export const DEPARTMENT_TITLES: Readonly<Record<DepartmentCode, DepartmentTitles>> = {
  EXEC: {
    head: { en: 'Chief of Staff', zh: '办公室主任', grade: 'M3' },
    staff: [
      { en: 'Executive Assistant', zh: '行政助理', grade: 'P4' },
      { en: 'Strategy Analyst', zh: '战略分析师', grade: 'P5' },
    ],
  },
  FIN: {
    head: { en: 'Head of Finance', zh: '财务总监', grade: 'M3' },
    staff: [
      { en: 'Finance Manager', zh: '财务经理', grade: 'M1' },
      { en: 'Senior Accountant', zh: '高级会计师', grade: 'P6' },
      { en: 'Financial Analyst', zh: '财务分析师', grade: 'P5' },
      { en: 'Treasury Analyst', zh: '资金分析师', grade: 'P5' },
      { en: 'Accountant', zh: '会计', grade: 'P4' },
    ],
  },
  HR: {
    head: { en: 'Head of Human Resources', zh: '人力资源总监', grade: 'M3' },
    staff: [
      { en: 'HR Business Partner', zh: '人力资源业务伙伴', grade: 'P6' },
      { en: 'Payroll Specialist', zh: '薪酬专员', grade: 'P4' },
      { en: 'Talent Acquisition Specialist', zh: '招聘专员', grade: 'P4' },
      { en: 'Learning and Development Specialist', zh: '培训发展专员', grade: 'P5' },
    ],
  },
  COMP: {
    head: { en: 'Head of Compliance', zh: '合规总监', grade: 'M3' },
    staff: [
      { en: 'Compliance Manager', zh: '合规经理', grade: 'M1' },
      { en: 'Compliance Officer', zh: '合规专员', grade: 'P5' },
      { en: 'AML Analyst', zh: '反洗钱分析师', grade: 'P4' },
    ],
  },
  RISK: {
    head: { en: 'Head of Risk Management', zh: '风险管理总监', grade: 'M3' },
    staff: [
      { en: 'Risk Manager', zh: '风险经理', grade: 'M1' },
      { en: 'Credit Risk Analyst', zh: '信用风险分析师', grade: 'P5' },
      { en: 'Market Risk Analyst', zh: '市场风险分析师', grade: 'P5' },
    ],
  },
  IT: {
    head: { en: 'Head of Technology', zh: '信息技术总监', grade: 'M3' },
    staff: [
      { en: 'IT Manager', zh: '信息技术经理', grade: 'M1' },
      { en: 'Senior Software Engineer', zh: '高级软件工程师', grade: 'P6' },
      { en: 'Software Engineer', zh: '软件工程师', grade: 'P5' },
      { en: 'Data Engineer', zh: '数据工程师', grade: 'P5' },
      { en: 'Information Security Analyst', zh: '信息安全分析师', grade: 'P5' },
      { en: 'IT Support Engineer', zh: '技术支持工程师', grade: 'P3' },
    ],
  },
  OPS: {
    head: { en: 'Head of Operations', zh: '运营总监', grade: 'M3' },
    staff: [
      { en: 'Operations Manager', zh: '运营经理', grade: 'M1' },
      { en: 'Settlements Analyst', zh: '清算分析师', grade: 'P4' },
      { en: 'Operations Executive', zh: '运营专员', grade: 'P4' },
      { en: 'Client Service Associate', zh: '客户服务专员', grade: 'P3' },
    ],
  },
  WM: {
    head: { en: 'Head of Wealth Management', zh: '财富管理部负责人', grade: 'M3' },
    staff: [
      { en: 'Senior Relationship Manager', zh: '高级客户经理', grade: 'P7' },
      { en: 'Relationship Manager', zh: '客户经理', grade: 'P6' },
      { en: 'Investment Analyst', zh: '投资分析师', grade: 'P5' },
      { en: 'Product Specialist', zh: '产品专员', grade: 'P5' },
      { en: 'Client Associate', zh: '客户助理', grade: 'P3' },
    ],
  },
  CB: {
    head: { en: 'Head of Corporate Banking', zh: '公司金融部总监', grade: 'M3' },
    staff: [
      { en: 'Corporate Banking Manager', zh: '公司金融经理', grade: 'M1' },
      { en: 'Corporate Relationship Manager', zh: '公司客户经理', grade: 'P6' },
      { en: 'Credit Analyst', zh: '信贷分析师', grade: 'P5' },
    ],
  },
  ADMIN: {
    head: { en: 'Administration Manager', zh: '行政经理', grade: 'M2' },
    staff: [
      { en: 'Facilities Executive', zh: '后勤专员', grade: 'P4' },
      { en: 'Office Coordinator', zh: '办公室协调员', grade: 'P3' },
    ],
  },
  LEGAL: {
    head: { en: 'Head of Legal', zh: '法务总监', grade: 'M3' },
    staff: [
      { en: 'Legal Counsel', zh: '法律顾问', grade: 'P6' },
      { en: 'Paralegal', zh: '律师助理', grade: 'P4' },
    ],
  },
};

/** Monthly base salary bands per grade (inclusive), in each entity's currency. */
export const SALARY_BANDS: Readonly<
  Record<string, { SGD: [number, number]; CNY: [number, number] }>
> = {
  P3: { SGD: [3800, 4600], CNY: [9000, 12000] },
  P4: { SGD: [4500, 5800], CNY: [11000, 15000] },
  P5: { SGD: [5600, 7500], CNY: [14000, 20000] },
  P6: { SGD: [7200, 9500], CNY: [19000, 27000] },
  P7: { SGD: [9000, 12000], CNY: [26000, 35000] },
  M1: { SGD: [8000, 10000], CNY: [22000, 28000] },
  M2: { SGD: [9500, 13000], CNY: [26000, 36000] },
  M3: { SGD: [13000, 18000], CNY: [36000, 50000] },
  M5: { SGD: [25000, 32000], CNY: [70000, 90000] },
};
