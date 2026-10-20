import {
  EMPLOYEE_FIELDS,
  IDENTITY_FIELDS,
  type EmployeeField,
  type FieldMapping,
} from '@huitong/shared';

import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { CN_HQ_BASELINE_MAPPING, SG_HR_BASELINE_MAPPING } from './baseline-mappings.js';

const MERGED_FIELDS = EMPLOYEE_FIELDS.filter(
  (field) => !(IDENTITY_FIELDS as readonly string[]).includes(field),
);

/**
 * Per-field source of truth (facts sheet section 6, A-06). For SG01, SG HR
 * owns identity, personal and payroll data and HQ owns its grading and cost
 * centres; job title, department, work email and hire date have no single
 * owner, so a disagreement becomes a conflict for HR. HQ owns every CN01 field.
 */
const SG01_OWNERS: Record<EmployeeField, string | null> = {
  employeeNo: null,
  entityCode: null,
  familyName: 'sg-hr',
  givenName: 'sg-hr',
  fullNameLatin: 'sg-hr',
  fullNameLocal: 'cn-hq',
  preferredName: 'sg-hr',
  workEmail: null,
  workPhone: 'sg-hr',
  departmentCode: null,
  jobTitle: null,
  jobTitleZh: 'cn-hq',
  jobGrade: 'cn-hq',
  managerEmployeeNo: 'sg-hr',
  employmentType: 'sg-hr',
  employmentStatus: 'sg-hr',
  hireDate: null,
  terminationDate: 'sg-hr',
  workLocation: 'sg-hr',
  costCenter: 'cn-hq',
  dateOfBirth: 'sg-hr',
  baseSalary: 'sg-hr',
  bankName: 'sg-hr',
  bankAccountLast4: 'sg-hr',
};

async function seedPolicies(prisma: PrismaClient): Promise<number> {
  const rows = [
    ...MERGED_FIELDS.map((field) => ({
      entityCode: 'SG01',
      field,
      connectorId: SG01_OWNERS[field],
    })),
    ...MERGED_FIELDS.map((field) => ({ entityCode: 'CN01', field, connectorId: 'cn-hq' })),
  ];
  for (const row of rows) {
    await prisma.fieldSourcePolicy.upsert({
      where: { entityCode_field: { entityCode: row.entityCode, field: row.field } },
      create: row,
      update: { connectorId: row.connectorId },
    });
  }
  return rows.length;
}

/** Version 1 of each HR system's mapping, approved by the HR lead who owns that system. */
async function seedMapping(
  prisma: PrismaClient,
  connectorId: string,
  mappings: readonly FieldMapping[],
  approverEmail: string,
): Promise<void> {
  const approver = await prisma.user.findUnique({
    where: { email: approverEmail },
    select: { id: true },
  });
  const existing = await prisma.mappingConfig.findUnique({
    where: { connectorId_version: { connectorId, version: 1 } },
    select: { id: true },
  });
  // Seeded once: later versions come from HR, and a reseed must not undo them.
  if (existing) return;
  await prisma.mappingConfig.create({
    data: {
      connectorId,
      version: 1,
      status: 'ACTIVE',
      mappings: JSON.parse(JSON.stringify(mappings)) as object,
      notes: 'Baseline mapping set up with the platform',
      createdByUserId: approver?.id ?? null,
      approvedByUserId: approver?.id ?? null,
      approvedAt: new Date(),
    },
  });
}

export async function seedIntegration(prisma: PrismaClient): Promise<string> {
  const policies = await seedPolicies(prisma);
  await seedMapping(prisma, 'sg-hr', SG_HR_BASELINE_MAPPING, 'meiling.tan@orge.example');
  await seedMapping(prisma, 'cn-hq', CN_HQ_BASELINE_MAPPING, 'xinyi.zhou@orge.example');
  return `${String(policies)} field source policies, 2 baseline mappings`;
}
