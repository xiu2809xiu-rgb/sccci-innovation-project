import { describe, expect, it } from 'vitest';

import { generateApprovals, planApprovalChain } from './approvals.js';
import { generateAttendance } from './attendance.js';
import { isWeekend } from './dates.js';
import { generateLeave } from './leave.js';
import { DATASET_PERIOD, PUBLIC_HOLIDAYS } from './reference-data.js';
import { generateWorkforce, isEmployedOn } from './workforce.js';

const workforce = generateWorkforce();
const leave = generateLeave(workforce);
const attendance = generateAttendance(workforce, DATASET_PERIOD, leave);
const approvals = generateApprovals(workforce);
const byNo = new Map(workforce.employees.map((e) => [e.employeeNo, e]));

describe('generateAttendance', () => {
  it('is deterministic', () => {
    expect(generateAttendance(workforce)).toEqual(attendance);
  });

  it('records weekdays only, inside each employee’s employment', () => {
    expect(attendance.length).toBeGreaterThan(7000);
    for (const record of attendance) {
      expect(isWeekend(record.date)).toBe(false);
      const employee = byNo.get(record.employeeNo);
      expect(employee && isEmployedOn(employee, record.date)).toBe(true);
    }
  });

  it('marks each entity’s own public holidays without clock times', () => {
    for (const record of attendance) {
      const holiday = PUBLIC_HOLIDAYS[record.entityCode].includes(record.date);
      expect(record.status === 'PUBLIC_HOLIDAY').toBe(holiday);
      if (holiday) {
        expect(record.clockIn).toBeNull();
      }
    }
  });

  it('shows full days of approved leave as ON_LEAVE', () => {
    const onLeave = attendance.filter((r) => r.status === 'ON_LEAVE');
    expect(onLeave.length).toBeGreaterThan(100);
    expect(onLeave.every((r) => r.clockIn === null && r.overtimeMinutes === 0)).toBe(true);
  });
});

describe('generateLeave', () => {
  it('uses each entity’s own category codes', () => {
    const sgCodes = ['AL', 'SL', 'HL', 'CCL', 'ML', 'PL', 'CL', 'TOIL', 'NPL'];
    for (const record of leave) {
      expect(sgCodes.includes(record.sourceCode)).toBe(record.entityCode === 'SG01');
    }
  });

  it('includes the categories the consolidation must handle', () => {
    const codes = new Set(leave.map((l) => l.sourceCode));
    for (const code of ['AL', 'SL', 'PL', 'ML', 'NJ', 'BJ', 'TX', 'HJ', 'TQJ', 'CJ']) {
      expect(codes.has(code as never)).toBe(true);
    }
    expect(leave.some((l) => l.halfDay !== null && l.days === 0.5)).toBe(true);
  });

  it('starts every record inside the period and never overlaps for one person', () => {
    const byEmployee = new Map<string, string[]>();
    for (const record of leave) {
      expect(record.startDate >= DATASET_PERIOD.from && record.startDate <= DATASET_PERIOD.to).toBe(
        true,
      );
      expect(record.endDate >= record.startDate).toBe(true);
      byEmployee.set(record.employeeNo, [
        ...(byEmployee.get(record.employeeNo) ?? []),
        `${record.startDate}|${record.endDate}`,
      ]);
    }
    for (const ranges of byEmployee.values()) {
      const sorted = ranges
        .map((r) => r.split('|') as [string, string])
        .sort((a, b) => a[0].localeCompare(b[0]));
      for (let i = 1; i < sorted.length; i += 1) {
        expect((sorted[i] as [string, string])[0] > (sorted[i - 1] as [string, string])[1]).toBe(
          true,
        );
      }
    }
  });

  it('gives maternity leave to the two employees on long leave', () => {
    const onLeave = workforce.employees.filter((e) => e.employmentStatus === 'ON_LEAVE');
    for (const employee of onLeave) {
      const codes = leave
        .filter((l) => l.employeeNo === employee.employeeNo)
        .map((l) => l.sourceCode);
      expect(codes).toContain(employee.entityCode === 'SG01' ? 'ML' : 'CJ');
    }
  });
});

describe('generateApprovals', () => {
  it('creates 25 requests across every type, with the statuses the demo needs', () => {
    expect(approvals).toHaveLength(25);
    expect(new Set(approvals.map((a) => a.type)).size).toBe(5);
    const manpower = approvals.filter((a) => a.type === 'MANPOWER_REQUEST');
    expect(manpower.filter((a) => a.status === 'APPROVED').length).toBeGreaterThanOrEqual(3);
    expect(manpower.filter((a) => a.status === 'PENDING').length).toBeGreaterThanOrEqual(2);
    expect(manpower.some((a) => a.status === 'REJECTED')).toBe(true);
    const pendingAtHr = manpower.find(
      (a) => a.chain.find((step) => step.action === 'PENDING')?.node === 'HR审核',
    );
    expect(pendingAtHr).toBeDefined();
  });

  it('references real employees and completes exactly the decided requests', () => {
    for (const approval of approvals) {
      expect(byNo.has(approval.applicantEmployeeNo)).toBe(true);
      for (const step of approval.chain) {
        expect(byNo.has(step.approverEmployeeNo)).toBe(true);
      }
      expect(approval.completedAt === null).toBe(approval.status === 'PENDING');
    }
  });
});

describe('planApprovalChain', () => {
  it('plans a pending chain for a new request with real approvers', () => {
    const chain = planApprovalChain(
      workforce,
      'MANPOWER_REQUEST',
      'E100006',
      '2026-10-20T02:00:00Z',
    );
    expect(chain.map((step) => step.node)).toEqual([
      '发起申请',
      '部门负责人审批',
      'HR审核',
      '总部审批',
    ]);
    expect(chain[0]?.action).toBe('SUBMIT');
    expect(chain.slice(1).every((step) => step.action === 'PENDING' && step.at === null)).toBe(
      true,
    );
    expect(chain[2]?.approverEmployeeNo).toBe('E100003');
  });
});
