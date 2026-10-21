import type {
  ConsolidationException,
  ConsolidationRunDetail,
  EntityCode,
  LeaveCategory,
  TemplatePreviewRow,
} from '@huitong/shared';

/**
 * Typed sample data for area 3's head start, as of 21 Oct 2026. The figures
 * were computed from the synthetic attendance and leave that mock-sg-hr and
 * mock-cn-hq serve (their records, employee numbers and leave ids), with the
 * seeded category rules, so the screens tell the same story as the mocks.
 * Synthetic demo data only.
 */
type Exception = Omit<ConsolidationException, 'id'>;

const homeLeave = (daysInPeriod: number, resolution: string | null): Exception => ({
  type: 'NO_TEMPLATE_COLUMN',
  employeeNo: 'E100052',
  employeeName: 'Wang Haoran',
  entityCode: 'CN01',
  details: {
    connectorId: 'cn-hq',
    sourceRecordId: 'QJ2026080019',
    sourceCategory: 'TQJ',
    startDate: '2026-08-26',
    endDate: '2026-09-22',
    daysInPeriod,
  },
  resolved: resolution !== null,
  resolution,
});

const pending = (
  employeeNo: string,
  employeeName: string,
  entityCode: EntityCode,
  record: [connectorId: string, id: string, category: string],
  dates: [start: string, end: string, days: number],
): Exception => ({
  type: 'LEAVE_PENDING',
  employeeNo,
  employeeName,
  entityCode,
  details: {
    connectorId: record[0],
    sourceRecordId: record[1],
    sourceCategory: record[2],
    startDate: dates[0],
    endDate: dates[1],
    daysInPeriod: dates[2],
  },
  resolved: false,
  resolution: null,
});

type MockRun = Omit<ConsolidationRunDetail, 'exceptions' | 'withheldExceptionCount'> & {
  exceptions: Exception[];
};

/** Newest first: September needs review, its first attempt failed, August is exported. */
export const MOCK_RUNS: readonly MockRun[] = [
  {
    id: '0199a3b1-0c40-7e21-9f3a-2c4d6e8f0a91',
    period: '2026-09',
    entityCodes: ['SG01', 'CN01'],
    status: 'NEEDS_REVIEW',
    employeeCount: 117,
    recordCount: 2617,
    exceptionCount: 5,
    openExceptionCount: 5,
    triggeredBy: 'Tan Mei Ling',
    startedAt: '2026-10-02T01:00:00Z',
    finishedAt: '2026-10-02T01:02:40Z',
    exportable: false,
    sources: [
      { connectorId: 'sg-hr', entityCode: 'SG01', attendanceRows: 1074, leaveRecords: 21 },
      { connectorId: 'cn-hq', entityCode: 'CN01', attendanceRows: 1496, leaveRecords: 26 },
    ],
    exceptions: [
      homeLeave(16, null),
      pending(
        'E100061',
        'Koh Wen Tao',
        'SG01',
        ['sg-hr', 'LV-SG-000055', 'AL'],
        ['2026-09-24', '2026-09-28', 3],
      ),
      pending(
        'E100069',
        'Lim Shi Han',
        'SG01',
        ['sg-hr', 'LV-SG-000057', 'AL'],
        ['2026-09-29', '2026-09-30', 2],
      ),
      pending(
        'E100003',
        'Tan Mei Ling',
        'SG01',
        ['sg-hr', 'LV-SG-000059', 'AL'],
        ['2026-09-30', '2026-09-30', 1],
      ),
      pending(
        'E100060',
        'Su Mengqi',
        'CN01',
        ['cn-hq', 'QJ2026090021', 'NJ'],
        ['2026-09-29', '2026-09-30', 2],
      ),
    ],
  },
  {
    id: '0199a3b1-0c40-7e21-9f3a-11d2c3b4a5e6',
    period: '2026-09',
    entityCodes: ['SG01', 'CN01'],
    status: 'FAILED',
    employeeCount: 0,
    recordCount: 0,
    exceptionCount: 0,
    openExceptionCount: 0,
    triggeredBy: 'Tan Mei Ling',
    startedAt: '2026-10-01T01:00:00Z',
    finishedAt: '2026-10-01T01:04:10Z',
    exportable: false,
    sources: [],
    exceptions: [],
  },
  {
    id: '01990f6e-4a20-7d35-8c1b-7e9f0a2b4c62',
    period: '2026-08',
    entityCodes: ['SG01', 'CN01'],
    status: 'SUCCEEDED',
    employeeCount: 117,
    recordCount: 2505,
    exceptionCount: 1,
    openExceptionCount: 0,
    triggeredBy: 'Tan Mei Ling',
    startedAt: '2026-09-02T01:00:00Z',
    finishedAt: '2026-09-02T01:02:15Z',
    exportable: true,
    sources: [
      { connectorId: 'sg-hr', entityCode: 'SG01', attendanceRows: 1029, leaveRecords: 21 },
      { connectorId: 'cn-hq', entityCode: 'CN01', attendanceRows: 1428, leaveRecords: 27 },
    ],
    exceptions: [homeLeave(4, 'Reported under Other leave, as agreed with HQ HR')],
  },
];

/** Leave days in the month by canonical category; missing categories are zero. */
type LeaveDays = Partial<Record<LeaveCategory, number>>;

function row(
  [employeeNo, name, entity, department]: [string, string, EntityCode, string],
  [workingDays, daysPresent, lateCount, absentDays, overtimeHours]: number[],
  leaveDays: LeaveDays,
  exceptionCount = 0,
): TemplatePreviewRow {
  return {
    employeeNo,
    values: {
      employeeNo,
      name,
      entity,
      department,
      workingDays: workingDays ?? 0,
      daysPresent: daysPresent ?? 0,
      lateCount: lateCount ?? 0,
      absentDays: absentDays ?? 0,
      overtimeHours: overtimeHours ?? 0,
      ...leaveDays,
    },
    exceptionCount,
  };
}

/** September's template rows: the first employees of each entity and everyone with an exception. */
const SEPTEMBER: TemplatePreviewRow[] = [
  row(['E100002', 'Lim Wei Jie', 'SG01', 'EXEC'], [22, 22, 1, 0, 11.3], {}),
  row(['E100003', 'Tan Mei Ling', 'SG01', 'HR'], [22, 22, 1, 0, 11.5], {}, 1),
  row(['E100004', 'Siti Rahmah', 'SG01', 'HR'], [22, 22, 3, 0, 11.5], { CHILDCARE: 0.5 }),
  row(['E100006', 'Arjun Menon', 'SG01', 'WM'], [22, 18, 3, 0, 5.3], { ANNUAL: 4 }),
  row(['E100007', 'Nur Aisyah', 'SG01', 'ADMIN'], [22, 22, 1, 0, 12], {}),
  row(['E100008', 'Farhan Ismail', 'SG01', 'IT'], [22, 22, 3, 0, 14.8], {}),
  row(['E100009', 'Grace Lim', 'SG01', 'COMP'], [22, 21, 3, 0, 13], { ANNUAL: 1 }),
  row(['E100010', 'Karthik Sundaram', 'SG01', 'ADMIN'], [22, 22, 1, 0, 8.5], {}),
  row(['E100061', 'Koh Wen Tao', 'SG01', 'RISK'], [22, 22, 1, 0, 7.5], {}, 1),
  row(['E100069', 'Lim Shi Han', 'SG01', 'WM'], [22, 21, 2, 1, 7.3], {}, 1),
  row(['E100001', 'Li Guoqiang', 'CN01', 'EXEC'], [21, 21, 0, 0, 12.3], { ANNUAL: 0.5 }),
  row(['E100005', 'Zhou Xinyi', 'CN01', 'HR'], [21, 21, 1, 0, 4.5], {}),
  row(['E100011', 'He Shufen', 'CN01', 'HR'], [21, 20, 1, 1, 6.5], {}),
  row(['E100013', 'Liao Shihan', 'CN01', 'COMP'], [21, 21, 4, 0, 13.5], { TIME_OFF_IN_LIEU: 0.5 }),
  row(['E100014', 'Gao Wentao', 'CN01', 'FIN'], [21, 18, 0, 1, 6.5], { ANNUAL: 2 }),
  row(['E100015', 'Feng Chengze', 'CN01', 'FIN'], [21, 21, 4, 0, 9.8], {}),
  row(['E100016', 'Fu Xiaowen', 'CN01', 'OPS'], [21, 19, 0, 0, 5.8], { SICK: 2 }),
  row(['E100017', 'Dai Mingzhe', 'CN01', 'OPS'], [21, 21, 2, 0, 12.3], {}),
  row(['E100052', 'Wang Haoran', 'CN01', 'CB'], [21, 5, 0, 0, 2.8], {}, 1),
  row(['E100060', 'Su Mengqi', 'CN01', 'WM'], [21, 21, 1, 0, 9.3], {}, 1),
];

/** August's rows. HR settled the home-leave exception by reporting it under Other leave. */
const AUGUST: TemplatePreviewRow[] = [
  row(['E100002', 'Lim Wei Jie', 'SG01', 'EXEC'], [20, 20, 3, 0, 5.8], {}),
  row(['E100003', 'Tan Mei Ling', 'SG01', 'HR'], [20, 20, 1, 0, 10.3], { ANNUAL: 0.5 }),
  row(['E100004', 'Siti Rahmah', 'SG01', 'HR'], [20, 20, 1, 0, 6.3], {}),
  row(['E100006', 'Arjun Menon', 'SG01', 'WM'], [20, 19, 1, 0, 8.3], { TIME_OFF_IN_LIEU: 1 }),
  row(['E100007', 'Nur Aisyah', 'SG01', 'ADMIN'], [20, 20, 6, 0, 9.3], {}),
  row(['E100008', 'Farhan Ismail', 'SG01', 'IT'], [20, 19, 0, 0, 6], {
    SICK: 1,
    TIME_OFF_IN_LIEU: 0.5,
  }),
  row(['E100009', 'Grace Lim', 'SG01', 'COMP'], [20, 20, 0, 0, 9.5], {}),
  row(['E100010', 'Karthik Sundaram', 'SG01', 'ADMIN'], [20, 19, 2, 0, 8.8], { SICK: 1 }),
  row(['E100001', 'Li Guoqiang', 'CN01', 'EXEC'], [21, 20, 1, 1, 7.5], {}),
  row(['E100005', 'Zhou Xinyi', 'CN01', 'HR'], [21, 19, 2, 2, 11.5], {}),
  row(['E100011', 'He Shufen', 'CN01', 'HR'], [21, 20, 0, 0, 6], { ANNUAL: 1 }),
  row(['E100013', 'Liao Shihan', 'CN01', 'COMP'], [21, 21, 2, 0, 9], {}),
  row(['E100014', 'Gao Wentao', 'CN01', 'FIN'], [21, 21, 0, 0, 10], {}),
  row(['E100015', 'Feng Chengze', 'CN01', 'FIN'], [21, 20, 2, 0, 10.3], { SICK: 1 }),
  row(['E100016', 'Fu Xiaowen', 'CN01', 'OPS'], [21, 21, 1, 0, 5.5], {}),
  row(['E100017', 'Dai Mingzhe', 'CN01', 'OPS'], [21, 21, 0, 0, 7.3], {}),
  row(['E100052', 'Wang Haoran', 'CN01', 'CB'], [21, 17, 0, 0, 8.3], { ANNUAL: 0.5, OTHER: 4 }),
];

/** Template rows by period. A month with no consolidated data has no rows. */
export const MOCK_PREVIEW_ROWS: Readonly<Record<string, readonly TemplatePreviewRow[]>> = {
  '2026-08': AUGUST,
  '2026-09': SEPTEMBER,
};
