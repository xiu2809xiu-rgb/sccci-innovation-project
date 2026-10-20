import { describe, expect, it } from 'vitest';

import { employeeAsSeenBy } from './drift.js';
import { generateWorkforce } from './workforce.js';

const workforce = generateWorkforce();
const { employees, drift } = workforce;
const byNo = new Map(employees.map((e) => [e.employeeNo, e]));

describe('generateWorkforce', () => {
  it('is deterministic for a seed and changes with the seed', () => {
    expect(generateWorkforce()).toEqual(workforce);
    expect(generateWorkforce(1)).not.toEqual(workforce);
  });

  it('creates 120 employees: 50 in SG01 and 70 in CN01', () => {
    expect(employees).toHaveLength(120);
    expect(employees.filter((e) => e.entityCode === 'SG01')).toHaveLength(50);
    expect(employees.filter((e) => e.entityCode === 'CN01')).toHaveLength(70);
  });

  it('includes the fixed demo people with their exact emails', () => {
    const expected: Record<string, string> = {
      E100001: 'guoqiang.li@orge.example',
      E100003: 'meiling.tan@orge.example',
      E100005: 'xinyi.zhou@orge.example',
      E100006: 'arjun.menon@orge.example',
      E100007: 'aisyah.nur@orge.example',
      E100008: 'farhan.ismail@orge.example',
      E100009: 'grace.lim@orge.example',
    };
    for (const [employeeNo, email] of Object.entries(expected)) {
      expect(byNo.get(employeeNo)?.workEmail).toBe(email);
    }
    expect(byNo.get('E100005')?.nameZh).toBe('周欣怡');
    expect(byNo.get('E100003')?.managerEmployeeNo).toBe('E100004');
  });

  it('uses unique employee numbers, emails and phones', () => {
    for (const key of ['employeeNo', 'workEmail', 'workPhone'] as const) {
      expect(new Set(employees.map((e) => e[key])).size).toBe(120);
    }
  });

  it('keeps reporting lines valid, inside one entity and free of cycles', () => {
    const tops = employees.filter((e) => e.managerEmployeeNo === null).map((e) => e.employeeNo);
    expect(tops.sort()).toEqual(['E100001', 'E100002']);
    for (const employee of employees) {
      let current = employee;
      const seen = new Set<string>();
      while (current.managerEmployeeNo !== null) {
        expect(seen.has(current.employeeNo)).toBe(false);
        seen.add(current.employeeNo);
        const manager = byNo.get(current.managerEmployeeNo);
        expect(manager).toBeDefined();
        if (!manager) {
          break;
        }
        expect(manager.entityCode).toBe(employee.entityCode);
        current = manager;
      }
    }
  });

  it('sets a termination date exactly for terminated employees', () => {
    for (const employee of employees) {
      expect(employee.terminationDate !== null).toBe(employee.employmentStatus === 'TERMINATED');
      if (employee.terminationDate) {
        expect(employee.terminationDate > employee.hireDate).toBe(true);
      }
    }
    expect(employees.filter((e) => e.employmentStatus === 'TERMINATED')).toHaveLength(3);
    expect(employees.filter((e) => e.employmentStatus === 'PROBATION')).toHaveLength(4);
    expect(employees.filter((e) => e.employmentStatus === 'ON_LEAVE')).toHaveLength(2);
  });

  it('formats contact data and money consistently per entity', () => {
    for (const employee of employees) {
      const sg = employee.entityCode === 'SG01';
      expect(employee.workPhone).toMatch(sg ? /^\+65[89]\d{7}$/ : /^\+861[35789]\d{9}$/);
      expect(employee.baseSalary.currency).toBe(sg ? 'SGD' : 'CNY');
      expect(employee.workEmail).toMatch(/^[a-z]+\.[a-z]+\d*@orge\.example$/);
      expect(employee.costCenter).toMatch(/^\d{4}$/);
    }
  });

  it('defines eight drift entries on eight different Singapore employees', () => {
    expect(drift).toHaveLength(8);
    expect(new Set(drift.map((d) => d.employeeNo)).size).toBe(8);
    for (const entry of drift) {
      const employee = byNo.get(entry.employeeNo);
      expect(employee?.entityCode).toBe('SG01');
      expect(entry.note.length).toBeGreaterThan(20);
    }
    const fields = drift.map((d) => d.field).sort();
    expect(fields).toEqual(
      [
        'departmentCode',
        'employmentStatus',
        'familyName',
        'hireDate',
        'jobTitleEn',
        'managerEmployeeNo',
        'workEmail',
        'workPhone',
      ].sort(),
    );
  });

  it('makes every drift value differ from the ground truth', () => {
    for (const entry of drift) {
      const employee = byNo.get(entry.employeeNo);
      expect(employee?.[entry.field]).not.toBe(entry.value);
    }
  });

  it('never produces anything shaped like a national ID number', () => {
    const text = JSON.stringify(workforce);
    expect(text).not.toMatch(/\b[STFGM]\d{7}[A-Z]\b/);
    expect(text).not.toMatch(/\b\d{17}[\dX]\b/);
    expect(text).not.toMatch(/nric|身份证/i);
  });
});

describe('employeeAsSeenBy', () => {
  it('shows each drift value only in its own system', () => {
    for (const entry of drift) {
      const truth = byNo.get(entry.employeeNo);
      if (!truth) {
        continue;
      }
      const other = entry.system === 'sg-hr' ? 'cn-hq' : 'sg-hr';
      expect(employeeAsSeenBy(truth, drift, entry.system)[entry.field]).toBe(entry.value);
      expect(employeeAsSeenBy(truth, drift, other)[entry.field]).toBe(truth[entry.field]);
    }
  });

  it('keeps a stale record internally consistent', () => {
    const leaverDrift = drift.find((d) => d.field === 'employmentStatus');
    const leaver = leaverDrift ? byNo.get(leaverDrift.employeeNo) : undefined;
    expect(leaver?.terminationDate).not.toBeNull();
    if (leaver) {
      expect(employeeAsSeenBy(leaver, drift, 'cn-hq').terminationDate).toBeNull();
    }
  });
});
