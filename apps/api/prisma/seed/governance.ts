import { EMPLOYEE_FIELD_CLASSIFICATION, type EmployeeField } from '@huitong/shared';

import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { RetentionAction, TransferStatus } from '../../src/generated/prisma/client.js';

const FIELD_DESCRIPTIONS: Readonly<Record<EmployeeField, [string, string]>> = {
  employeeNo: ['Global employee number assigned by HQ', '集团统一员工编号'],
  entityCode: ['Employing legal entity', '用工法人实体'],
  familyName: ['Family name', '姓'],
  givenName: ['Given name', '名'],
  fullNameLatin: ['Full name in Latin script', '拉丁字母全名'],
  fullNameLocal: ['Full name in Chinese characters', '中文姓名'],
  preferredName: ['Preferred working name', '常用名'],
  workEmail: ['Work email address', '工作邮箱'],
  workPhone: ['Work mobile number', '工作手机'],
  departmentCode: ['Department', '部门'],
  jobTitle: ['Job title (English)', '职位（英文）'],
  jobTitleZh: ['Job title (Chinese)', '职位（中文）'],
  jobGrade: ['Job grade', '职级'],
  managerEmployeeNo: ['Line manager', '直属上级'],
  employmentType: ['Employment type', '用工类型'],
  employmentStatus: ['Employment status', '雇佣状态'],
  hireDate: ['Hire date', '入职日期'],
  terminationDate: ['Termination date', '离职日期'],
  workLocation: ['Work location', '工作地点'],
  costCenter: ['Cost centre', '成本中心'],
  dateOfBirth: ['Date of birth', '出生日期'],
  baseSalary: ['Monthly base salary', '月基本工资'],
  bankName: ['Salary bank', '工资开户银行'],
  bankAccountLast4: ['Last four digits of the salary account', '工资账号后四位'],
};

/** PIPL Art. 28 lists financial accounts as sensitive personal information. */
const SENSITIVE_FIELDS: readonly EmployeeField[] = ['bankName', 'bankAccountLast4'];

async function seedClassifications(prisma: PrismaClient): Promise<number> {
  const fields = Object.entries(EMPLOYEE_FIELD_CLASSIFICATION) as [
    EmployeeField,
    (typeof EMPLOYEE_FIELD_CLASSIFICATION)[EmployeeField],
  ][];
  for (const [field, level] of fields) {
    const [description, descriptionZh] = FIELD_DESCRIPTIONS[field];
    const data = {
      level,
      description,
      descriptionZh,
      isPersonalData: true,
      isSensitive: SENSITIVE_FIELDS.includes(field),
    };
    await prisma.dataClassification.upsert({
      where: { entityType_field: { entityType: 'employee', field } },
      create: { entityType: 'employee', field, ...data },
      update: data,
    });
  }
  return fields.length;
}

const TRANSFERS = [
  {
    name: 'SG01 employee master to Group HQ',
    nameZh: '新加坡员工主数据传输至集团总部',
    fromEntityCode: 'SG01',
    toEntityCode: 'CN01',
    fromCountry: 'SG',
    toCountry: 'CN',
    // No dateOfBirth: HQ does not need it for these purposes (data minimisation, Q-08).
    dataCategories: ['identity', 'job-and-organisation', 'work-contact', 'jobGrade', 'costCenter'],
    purpose: 'Group HR management and consolidated headcount reporting',
    legalBasis:
      'PDPA s.26 Transfer Limitation Obligation: recipient bound by an intra-group data transfer agreement (assumed, A-25)',
    mechanism: 'Intra-group agreement giving PDPA-comparable protection',
    status: TransferStatus.ACTIVE,
    approvedAt: new Date('2026-09-15T02:00:00Z'),
    reviewDueAt: new Date('2027-03-15T00:00:00Z'),
    notes:
      'Covers identity, job and organisation, work contact, job grade and cost centre; dates of birth stay in Singapore. Approved by the SG01 DPO (synthetic).',
  },
  {
    name: 'SG01 compensation data to Group HQ',
    nameZh: '新加坡薪酬数据传输至集团总部',
    fromEntityCode: 'SG01',
    toEntityCode: 'CN01',
    fromCountry: 'SG',
    toCountry: 'CN',
    dataCategories: ['baseSalary', 'bankName', 'bankAccountLast4'],
    purpose: 'Group compensation benchmarking',
    legalBasis: 'Not yet established',
    mechanism: 'To be agreed with the SG01 DPO',
    status: TransferStatus.PENDING_REVIEW,
    approvedAt: null,
    reviewDueAt: null,
    notes: 'Until this entry is approved, HR_HQ sees these SG01 fields masked.',
  },
  {
    name: 'CN01 organisation data for Singapore management',
    nameZh: '集团总部组织数据提供给新加坡管理层',
    fromEntityCode: 'CN01',
    toEntityCode: 'SG01',
    fromCountry: 'CN',
    toCountry: 'SG',
    dataCategories: ['identity', 'job-and-organisation', 'work-contact'],
    purpose: 'Cross-entity collaboration and reporting lines',
    legalBasis:
      'PIPL Art. 13(2) HR management; cross-border HR-management exemption under the CAC Provisions (March 2024), to be confirmed (A-26)',
    mechanism: 'CAC exemption for necessary cross-border HR management (to be confirmed)',
    status: TransferStatus.ACTIVE,
    approvedAt: new Date('2026-09-20T02:00:00Z'),
    reviewDueAt: new Date('2027-03-20T00:00:00Z'),
    notes: 'Identity, job and organisation, and work contact.',
  },
];

const RETENTION = [
  {
    dataCategory: 'audit_events',
    entityCode: null,
    retentionMonths: 84,
    action: RetentionAction.ARCHIVE,
    legalReference:
      'Seven years to support audits; financial-sector record-keeping expectations to be confirmed',
  },
  {
    dataCategory: 'clickstream_events',
    entityCode: null,
    retentionMonths: 13,
    action: RetentionAction.DELETE,
    legalReference: 'Product analytics only; no statutory requirement',
  },
  {
    dataCategory: 'source_records',
    entityCode: null,
    retentionMonths: 24,
    action: RetentionAction.DELETE,
    legalReference: 'Copies only; systems of record keep the statutory records (A-29)',
  },
  {
    dataCategory: 'terminated_employees',
    entityCode: 'SG01',
    retentionMonths: 24,
    action: RetentionAction.ANONYMISE,
    legalReference: 'PDPA s.25 retention limitation; statutory employment records stay in SG HR',
  },
  {
    dataCategory: 'terminated_employees',
    entityCode: 'CN01',
    retentionMonths: 24,
    action: RetentionAction.ANONYMISE,
    legalReference: 'PIPL Arts. 19 and 47; statutory records stay in the HQ system',
  },
  {
    dataCategory: 'ai_usage_records',
    entityCode: null,
    retentionMonths: 24,
    action: RetentionAction.DELETE,
    legalReference: 'Cost and usage analytics',
  },
  {
    dataCategory: 'refresh_tokens',
    entityCode: null,
    retentionMonths: 1,
    action: RetentionAction.DELETE,
    legalReference: 'Session security',
  },
];

/** Classification of every employee field, the cross-border transfer register and retention defaults. */
export async function seedGovernance(prisma: PrismaClient): Promise<string> {
  const classified = await seedClassifications(prisma);
  for (const transfer of TRANSFERS) {
    const existing = await prisma.crossBorderTransfer.findFirst({
      where: { name: transfer.name },
      select: { id: true, dataCategories: true },
    });
    if (existing) {
      // What a transfer covers is policy: a change in coverage is a new version.
      const changed =
        [...existing.dataCategories].sort().join() !== [...transfer.dataCategories].sort().join();
      await prisma.crossBorderTransfer.update({
        where: { id: existing.id },
        data: { ...transfer, ...(changed ? { version: { increment: 1 } } : {}) },
      });
    } else {
      await prisma.crossBorderTransfer.create({ data: transfer });
    }
  }
  for (const policy of RETENTION) {
    const existing = await prisma.retentionPolicy.findFirst({
      where: { dataCategory: policy.dataCategory, entityCode: policy.entityCode },
      select: { id: true },
    });
    if (existing) {
      await prisma.retentionPolicy.update({ where: { id: existing.id }, data: policy });
    } else {
      await prisma.retentionPolicy.create({ data: policy });
    }
  }
  return `${String(classified)} field classifications, ${String(TRANSFERS.length)} transfers, ${String(RETENTION.length)} retention policies`;
}
