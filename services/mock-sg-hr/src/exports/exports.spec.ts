import { parse } from 'csv-parse/sync';
import { pino } from 'pino';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { buildSgHrDataset, SgHrStore, type SgHrDataset } from '../data/store.js';
import type { SgAttendance, SgEmployee, SgLeave } from '../schemas/sg-records.js';
import { toCsv } from './csv.js';
import { sgDate } from './infotech-exports.js';

const API_KEY = 'test-api-key-123';
const FIXED_NOW = new Date('2026-10-20T04:00:00.000Z');

type Row = Record<string, string>;

/** The expected day-first date, worked out apart from the code under test. */
const dayFirst = (iso: string | null): string =>
  iso === null ? '' : iso.split('-').reverse().join('/');

/** Singapore keeps UTC+8 all year, so its calendar day is the UTC day eight hours on. */
const singaporeDayOf = (instant: string): string =>
  dayFirst(new Date(Date.parse(instant) + 8 * 3_600_000).toISOString().slice(0, 10));

function build(dataset?: () => SgHrDataset) {
  return createApp({
    config: { port: 0, apiKey: API_KEY },
    store: new SgHrStore(dataset, () => FIXED_NOW),
    logger: pino({ level: 'silent' }),
  });
}

/** Reads an export the way HuiTong's mapping wizard reads a sample: csv-parse, byte-order mark allowed. */
function rowsOf(csv: string): { headers: string[]; rows: Row[] } {
  const records: string[][] = parse(csv, { bom: true });
  const [headers = [], ...cells] = records;
  return {
    headers,
    rows: cells.map((line) => Object.fromEntries(headers.map((h, i) => [h, line[i] ?? '']))),
  };
}

function client(app: ReturnType<typeof build>) {
  const get = (path: string) => request(app).get(path).set('X-API-Key', API_KEY);
  return {
    get,
    csv: async (path: string) => {
      const response = await get(path).expect(200);
      return { response, ...rowsOf(response.text) };
    },
    json: async <T>(path: string): Promise<T> => (await get(path).expect(200)).body as T,
  };
}

describe('toCsv', () => {
  const columns = [
    { header: 'Name', value: (row: { name: string | null }) => row.name },
    { header: 'Count, total', value: () => 2 },
  ];

  it('starts with a byte-order mark and ends every line with CRLF', () => {
    const csv = toCsv(columns, [{ name: 'A' }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('Name,"Count, total"\r\nA,2\r\n');
  });

  it('quotes commas, quotes, line breaks and surrounding spaces, and leaves null empty', () => {
    const csv = toCsv(columns, [
      { name: 'Tan, Mei Ling' },
      { name: 'say "hi"' },
      { name: 'two\nlines' },
      { name: ' padded' },
      { name: null },
    ]);
    expect(csv.slice(1).split('\r\n').slice(1, 6)).toEqual([
      '"Tan, Mei Ling",2',
      '"say ""hi""",2',
      '"two\nlines",2',
      '" padded",2',
      ',2',
    ]);
    expect(rowsOf(csv).rows.map((row) => row.Name)).toEqual([
      'Tan, Mei Ling',
      'say "hi"',
      'two\nlines',
      ' padded',
      '',
    ]);
  });
});

describe('sgDate', () => {
  it('turns an ISO date into the day-first Singapore layout', () => {
    expect(sgDate('2026-07-01')).toBe('01/07/2026');
    expect(sgDate(null)).toBeNull();
  });
});

describe("INFO-TECH-style exports of the mock's dataset", () => {
  let api: ReturnType<typeof client>;

  beforeEach(() => {
    api = client(build());
  });

  it('needs the API key, like the rest of the API', async () => {
    await request(build()).get('/api/exports/employees.csv').expect(401);
  });

  it('downloads the employee master as a CSV attachment with English headers', async () => {
    const { response, headers, rows } = await api.csv('/api/exports/employees.csv');
    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(response.headers['content-disposition']).toBe('attachment; filename=employees.csv');
    expect(response.text.charCodeAt(0)).toBe(0xfeff);
    expect(headers).toEqual([
      'Employee No',
      'Employee Name',
      'Surname',
      'Given Name',
      'Preferred Name',
      'Department Code',
      'Department',
      'Designation',
      'Employment Type',
      'Employee Status',
      'Date Joined',
      'Date Left',
      'Date of Birth',
      'Email',
      'Mobile No',
      'Reporting Officer',
      'Work Location',
    ]);
    expect(rows).toHaveLength(50);
  });

  it('carries no national ID, pay or bank column in the employee master', async () => {
    const { headers } = await api.csv('/api/exports/employees.csv');
    expect(
      headers.filter((h) => /nric|fin\b|passport|national|identity|salary|pay|bank/i.test(h)),
    ).toEqual([]);
  });

  it('matches the API in every column of every employee', async () => {
    const { rows } = await api.csv('/api/exports/employees.csv');
    const employees = await api.json<{ data: SgEmployee[] }>('/api/employees?pageSize=100');
    expect(rows).toEqual(
      employees.data.map((e) => ({
        'Employee No': e.employeeNo,
        'Employee Name': e.fullName,
        Surname: e.lastName,
        'Given Name': e.firstName,
        'Preferred Name': e.preferredName ?? '',
        'Department Code': e.departmentCode,
        Department: e.department,
        Designation: e.jobTitle,
        'Employment Type': e.employmentType,
        'Employee Status': e.status,
        'Date Joined': dayFirst(e.hireDate),
        'Date Left': dayFirst(e.resignationDate),
        'Date of Birth': dayFirst(e.dateOfBirth),
        Email: e.email,
        'Mobile No': e.mobile,
        'Reporting Officer': e.reportsTo ?? '',
        'Work Location': e.workLocation,
      })),
    );
  });

  it('matches the API in every column of every leave in the range', async () => {
    const { response, rows } = await api.csv(
      '/api/exports/leave.csv?from=2026-08-01&to=2026-08-31',
    );
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename=leave_2026-08-01_2026-08-31.csv',
    );
    const leave = await api.json<{ data: SgLeave[] }>(
      '/api/leave?from=2026-08-01&to=2026-08-31&pageSize=500',
    );
    const employees = await api.json<{ data: SgEmployee[] }>('/api/employees?pageSize=100');
    const names = new Map(employees.data.map((e) => [e.employeeNo, e.fullName]));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows).toEqual(
      leave.data.map((l) => ({
        'Leave ID': l.leaveId,
        'Employee No': l.employeeNo,
        'Employee Name': names.get(l.employeeNo) ?? '',
        'Leave Code': l.leaveType,
        'Leave Type': l.leaveTypeName,
        'Date From': dayFirst(l.startDate),
        'Date To': dayFirst(l.endDate),
        'No. of Days': String(l.days),
        'Half Day': l.halfDay ?? '',
        Status: l.status,
        'Applied On': singaporeDayOf(l.appliedAt),
      })),
    );
  });

  it('refuses a leave range that is missing or backwards', async () => {
    await api.get('/api/exports/leave.csv').expect(400);
    await api.get('/api/exports/leave.csv?from=2026-09-30&to=2026-09-01').expect(400);
  });

  it('matches the API in the payroll month, with overtime summed from its attendance', async () => {
    const { response, rows } = await api.csv('/api/exports/payroll.csv?month=2026-09');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename=payroll_2026-09.csv',
    );
    const employees = await api.json<{ data: SgEmployee[] }>('/api/employees?pageSize=100');
    const attendance: SgAttendance[] = [];
    for (let page = 1; ; page += 1) {
      const batch = await api.json<{ data: SgAttendance[]; total: number }>(
        `/api/attendance?from=2026-09-01&to=2026-09-30&pageSize=500&page=${String(page)}`,
      );
      attendance.push(...batch.data);
      if (attendance.length >= batch.total) {
        break;
      }
    }
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const employee = employees.data.find((e) => e.employeeNo === row['Employee No']);
      const overtime = attendance
        .filter((a) => a.employeeNo === row['Employee No'])
        .reduce((sum, a) => sum + a.otHours, 0);
      expect(row).toMatchObject({
        'Pay Period': '09/2026',
        'Employee Name': employee?.fullName,
        'Department Code': employee?.departmentCode,
        'Basic Salary': employee?.basicSalary.toFixed(2),
        Currency: 'SGD',
        'Bank Name': employee?.bankName,
        'Bank Account No': employee?.bankAccountNo,
      });
      expect(Number(row['OT Hours'])).toBeCloseTo(overtime, 2);
    }
  });

  it('pays a joiner from their first month and a leaver until their last', async () => {
    const employees = await api.json<{ data: SgEmployee[] }>('/api/employees?pageSize=100');
    const leaver = employees.data.find((e) => e.resignationDate?.startsWith('2026-08'));
    const joiner = employees.data.find((e) => e.hireDate.startsWith('2026-09'));
    expect(leaver).toBeDefined();
    expect(joiner).toBeDefined();
    const numbers = async (month: string) =>
      (await api.csv(`/api/exports/payroll.csv?month=${month}`)).rows.map((r) => r['Employee No']);
    const august = await numbers('2026-08');
    const september = await numbers('2026-09');
    expect(august).toContain(leaver?.employeeNo);
    expect(september).not.toContain(leaver?.employeeNo);
    expect(august).not.toContain(joiner?.employeeNo);
    expect(september).toContain(joiner?.employeeNo);
  });

  it('refuses a payroll month that is missing or not YYYY-MM', async () => {
    await api.get('/api/exports/payroll.csv').expect(400);
    await api.get('/api/exports/payroll.csv?month=2026-13').expect(400);
    await api.get('/api/exports/payroll.csv?month=2026/09').expect(400);
  });
});

describe('INFO-TECH-style exports of a dataset built for the edge cases', () => {
  const template = buildSgHrDataset().employees[0];
  if (!template) {
    throw new Error('the generated dataset has no Singapore employee');
  }
  const person = (employeeNo: string, overrides: Partial<SgEmployee>): SgEmployee => ({
    ...template,
    employeeNo,
    email: `${employeeNo.toLowerCase()}@orge.example`,
    reportsTo: null,
    resignationDate: null,
    status: 'Active',
    ...overrides,
  });
  const day = (employeeNo: string, date: string, otHours: number): SgAttendance => ({
    employeeNo,
    date,
    clockIn: '09:00',
    clockOut: '19:00',
    status: 'Present',
    otHours,
  });
  const leave = (
    leaveId: string,
    overrides: Pick<SgLeave, 'leaveType' | 'leaveTypeName' | 'startDate' | 'endDate' | 'days'> &
      Partial<SgLeave>,
  ): SgLeave => ({
    leaveId,
    employeeNo: 'E900001',
    halfDay: null,
    status: 'Approved',
    appliedAt: '2026-08-14T02:00:00Z',
    ...overrides,
  });
  const NPL = { leaveType: 'NPL', leaveTypeName: 'No-pay Leave' } as const;
  const dataset: SgHrDataset = {
    employees: [
      person('E900001', { hireDate: '2020-01-06' }),
      person('E900002', { hireDate: '2026-09-07' }),
      person('E900003', {
        hireDate: '2019-03-04',
        resignationDate: '2026-08-31',
        status: 'Resigned',
      }),
    ],
    attendance: [
      day('E900001', '2026-08-28', 2),
      day('E900001', '2026-09-02', 1.25),
      day('E900001', '2026-09-03', 0.5),
    ],
    leave: [
      leave('LV-SG-900001', { ...NPL, startDate: '2026-09-21', endDate: '2026-09-21', days: 1 }),
      leave('LV-SG-900002', {
        ...NPL,
        startDate: '2026-09-22',
        endDate: '2026-09-22',
        days: 1,
        status: 'Pending',
      }),
      leave('LV-SG-900003', {
        ...NPL,
        startDate: '2026-09-23',
        endDate: '2026-09-23',
        days: 1,
        status: 'Cancelled',
      }),
      // Monday 31 August to Tuesday 1 September: one working day in each month.
      leave('LV-SG-900004', { ...NPL, startDate: '2026-08-31', endDate: '2026-09-01', days: 2 }),
      leave('LV-SG-900005', {
        ...NPL,
        startDate: '2026-09-25',
        endDate: '2026-09-25',
        days: 0.5,
        halfDay: 'AM',
      }),
      leave('LV-SG-900006', {
        leaveType: 'AL',
        leaveTypeName: 'Annual Leave',
        startDate: '2026-09-24',
        endDate: '2026-09-24',
        days: 1,
        appliedAt: '2026-08-03T17:30:00Z',
      }),
    ],
  };

  let api: ReturnType<typeof client>;

  beforeEach(() => {
    api = client(build(() => dataset));
  });

  it("writes Applied On as the day in Singapore, which can be the day after UTC's", async () => {
    const { rows } = await api.csv('/api/exports/leave.csv?from=2026-09-24&to=2026-09-24');
    expect(rows.find((r) => r['Leave ID'] === 'LV-SG-900006')?.['Applied On']).toBe('04/08/2026');
  });

  it('counts approved no-pay leave only, half days included and split at the month end', async () => {
    const september = await api.csv('/api/exports/payroll.csv?month=2026-09');
    expect(september.rows.find((r) => r['Employee No'] === 'E900001')).toEqual({
      'Pay Period': '09/2026',
      'Employee No': 'E900001',
      'Employee Name': template.fullName,
      'Department Code': template.departmentCode,
      'Basic Salary': template.basicSalary.toFixed(2),
      'OT Hours': '1.75',
      'No-pay Leave Days': '2.5',
      Currency: 'SGD',
      'Bank Name': template.bankName,
      'Bank Account No': template.bankAccountNo,
    });
    const august = await api.csv('/api/exports/payroll.csv?month=2026-08');
    expect(august.rows.find((r) => r['Employee No'] === 'E900001')).toMatchObject({
      'Pay Period': '08/2026',
      'OT Hours': '2',
      'No-pay Leave Days': '1',
    });
  });

  it('pays a joiner from the month they join and a leaver until the month they leave', async () => {
    const numbers = async (month: string) =>
      (await api.csv(`/api/exports/payroll.csv?month=${month}`)).rows.map((r) => r['Employee No']);
    expect(await numbers('2026-08')).toEqual(['E900001', 'E900003']);
    expect(await numbers('2026-09')).toEqual(['E900001', 'E900002']);
  });
});
