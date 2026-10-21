import { COMPANY_MONTHLY_TEMPLATE, TEMPLATE_LEAVE_COLUMNS } from '@huitong/shared';

import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { LeaveCategory } from '../../src/generated/prisma/client.js';

/** Approved leave-category rules: each source system's categories mapped to the canonical set. */
const MAPPINGS: {
  connectorId: string;
  sourceCategory: string;
  sourceLabel: string;
  canonicalCategory: LeaveCategory;
}[] = [
  {
    connectorId: 'sg-hr',
    sourceCategory: 'AL',
    sourceLabel: 'Annual Leave',
    canonicalCategory: LeaveCategory.ANNUAL,
  },
  {
    connectorId: 'sg-hr',
    sourceCategory: 'SL',
    sourceLabel: 'Sick Leave (Outpatient)',
    canonicalCategory: LeaveCategory.SICK,
  },
  {
    connectorId: 'sg-hr',
    sourceCategory: 'HL',
    sourceLabel: 'Hospitalisation Leave',
    canonicalCategory: LeaveCategory.HOSPITALISATION,
  },
  {
    connectorId: 'sg-hr',
    sourceCategory: 'CCL',
    sourceLabel: 'Childcare Leave',
    canonicalCategory: LeaveCategory.CHILDCARE,
  },
  {
    connectorId: 'sg-hr',
    sourceCategory: 'ML',
    sourceLabel: 'Maternity Leave',
    canonicalCategory: LeaveCategory.MATERNITY,
  },
  {
    connectorId: 'sg-hr',
    sourceCategory: 'PL',
    sourceLabel: 'Paternity Leave',
    canonicalCategory: LeaveCategory.PATERNITY,
  },
  {
    connectorId: 'sg-hr',
    sourceCategory: 'CL',
    sourceLabel: 'Compassionate Leave',
    canonicalCategory: LeaveCategory.COMPASSIONATE,
  },
  {
    connectorId: 'sg-hr',
    sourceCategory: 'TOIL',
    sourceLabel: 'Time-off in Lieu',
    canonicalCategory: LeaveCategory.TIME_OFF_IN_LIEU,
  },
  {
    connectorId: 'sg-hr',
    sourceCategory: 'NPL',
    sourceLabel: 'No-pay Leave',
    canonicalCategory: LeaveCategory.UNPAID,
  },
  {
    connectorId: 'cn-hq',
    sourceCategory: 'NJ',
    sourceLabel: '年假',
    canonicalCategory: LeaveCategory.ANNUAL,
  },
  {
    connectorId: 'cn-hq',
    sourceCategory: 'BJ',
    sourceLabel: '病假',
    canonicalCategory: LeaveCategory.SICK,
  },
  {
    connectorId: 'cn-hq',
    sourceCategory: 'SJ',
    sourceLabel: '事假',
    canonicalCategory: LeaveCategory.UNPAID,
  },
  {
    connectorId: 'cn-hq',
    sourceCategory: 'TX',
    sourceLabel: '调休',
    canonicalCategory: LeaveCategory.TIME_OFF_IN_LIEU,
  },
  {
    connectorId: 'cn-hq',
    sourceCategory: 'HJ',
    sourceLabel: '婚假',
    canonicalCategory: LeaveCategory.MARRIAGE,
  },
  {
    connectorId: 'cn-hq',
    sourceCategory: 'CJ',
    sourceLabel: '产假',
    canonicalCategory: LeaveCategory.MATERNITY,
  },
  {
    connectorId: 'cn-hq',
    sourceCategory: 'PCJ',
    sourceLabel: '陪产假',
    canonicalCategory: LeaveCategory.PATERNITY,
  },
  {
    connectorId: 'cn-hq',
    sourceCategory: 'SANG',
    sourceLabel: '丧假',
    canonicalCategory: LeaveCategory.COMPASSIONATE,
  },
  {
    connectorId: 'cn-hq',
    sourceCategory: 'YEJ',
    sourceLabel: '育儿假',
    canonicalCategory: LeaveCategory.CHILDCARE,
  },
  // Home leave has no column in the company template, so consolidation reports it as an exception (A-09).
  {
    connectorId: 'cn-hq',
    sourceCategory: 'TQJ',
    sourceLabel: '探亲假',
    canonicalCategory: LeaveCategory.HOME_LEAVE,
  },
];

export async function seedAttendanceLeave(prisma: PrismaClient): Promise<string> {
  // A rule names the template column by its English label.
  const columnFor = (category: LeaveCategory) =>
    TEMPLATE_LEAVE_COLUMNS.find((column) => column.key === category)?.label ?? null;
  for (const mapping of MAPPINGS) {
    const data = { ...mapping, templateColumn: columnFor(mapping.canonicalCategory) };
    await prisma.leaveCategoryMapping.upsert({
      where: {
        connectorId_sourceCategory_version: {
          connectorId: mapping.connectorId,
          sourceCategory: mapping.sourceCategory,
          version: 1,
        },
      },
      create: data,
      update: data,
    });
  }
  // The template's structure lives in @huitong/shared, so the API's sample rows follow it.
  const { key, version, ...template } = COMPANY_MONTHLY_TEMPLATE;
  await prisma.reportTemplate.upsert({
    where: { key_version: { key, version } },
    create: { key, version, ...template },
    update: template,
  });
  return `${String(MAPPINGS.length)} leave-category rules, 1 report template`;
}
