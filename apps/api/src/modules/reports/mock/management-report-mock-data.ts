import {
  LEAVE_CATEGORIES,
  type EntityCode,
  type EntityMonth,
  type LeaveCategory,
  type ManagementReport,
} from '@huitong/shared';

/**
 * Typed sample data for the management report, computed from the synthetic
 * attendance and leave that mock-sg-hr and mock-cn-hq serve, with the seeded
 * category rules. Aggregates only, so no person is identified. Synthetic demo
 * data only.
 */
type SampleEntity = Extract<EntityCode, 'SG01' | 'CN01'>;

/** The connector each entity's attendance and leave come from. */
const SOURCE: Readonly<Record<SampleEntity, string>> = { SG01: 'sg-hr', CN01: 'cn-hq' };

function month(
  entityCode: SampleEntity,
  [headcount, workingDays, attendanceRate, overtimeHours]: [number, number, number, number],
  leaveDays: Partial<Record<LeaveCategory, number>>,
): EntityMonth {
  const sources = [SOURCE[entityCode]];
  return {
    entityCode,
    headcount: { value: headcount, sources },
    workingDays,
    attendanceRate: { value: attendanceRate, sources },
    overtimeHours: { value: overtimeHours, sources },
    // In the canonical order, so every month and entity reads the same way.
    leaveDays: LEAVE_CATEGORIES.filter((category) => leaveDays[category] !== undefined).map(
      (category) => ({ category, days: leaveDays[category] ?? 0, sources }),
    ),
  };
}

export const MOCK_MANAGEMENT_REPORTS: readonly ManagementReport[] = [
  {
    period: '2026-09',
    generatedAt: '2026-10-02T01:02:40Z',
    entities: [
      month('SG01', [49, 22, 99.1, 460.3], {
        ANNUAL: 17,
        SICK: 5,
        CHILDCARE: 1.5,
        MATERNITY: 22,
        PATERNITY: 10,
        UNPAID: 1,
      }),
      month('CN01', [68, 21, 99, 634.3], {
        ANNUAL: 14.5,
        SICK: 8,
        CHILDCARE: 5,
        MATERNITY: 21,
        PATERNITY: 10,
        COMPASSIONATE: 3,
        TIME_OFF_IN_LIEU: 2.5,
        UNPAID: 1,
        HOME_LEAVE: 16,
      }),
    ],
  },
  {
    period: '2026-08',
    generatedAt: '2026-09-02T01:02:15Z',
    entities: [
      month('SG01', [49, 20, 99.4, 382.5], {
        ANNUAL: 21,
        SICK: 9,
        CHILDCARE: 0.5,
        MATERNITY: 20,
        TIME_OFF_IN_LIEU: 2,
      }),
      month('CN01', [68, 21, 98.9, 630.3], {
        ANNUAL: 18,
        SICK: 8,
        MATERNITY: 21,
        MARRIAGE: 4,
        TIME_OFF_IN_LIEU: 4.5,
        UNPAID: 2,
        HOME_LEAVE: 4,
      }),
    ],
  },
];
