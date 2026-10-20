import {
  DATASET_PERIOD,
  generateAttendance,
  generateLeave,
  generateWorkforce,
} from '@huitong/synthetic-data';

import { HttpError } from '../http/errors.js';
import type { SgAttendance, SgEmployee, SgLeave } from '../schemas/sg-records.js';
import { renderSgAttendance, renderSgEmployee, renderSgLeave } from './render.js';

export interface SgHrDataset {
  employees: readonly SgEmployee[];
  attendance: readonly SgAttendance[];
  leave: readonly SgLeave[];
}

let cachedDataset: SgHrDataset | undefined;

/** Singapore's slice of the synthetic dataset in SG HR's schema (built once, then reused). */
export function buildSgHrDataset(): SgHrDataset {
  if (!cachedDataset) {
    const workforce = generateWorkforce();
    const leave = generateLeave(workforce);
    const attendance = generateAttendance(workforce, DATASET_PERIOD, leave);
    cachedDataset = {
      employees: workforce.employees
        .filter((e) => e.entityCode === 'SG01')
        .map((e) => renderSgEmployee(e, workforce.drift)),
      attendance: attendance.filter((a) => a.entityCode === 'SG01').map(renderSgAttendance),
      leave: leave.filter((l) => l.entityCode === 'SG01').map(renderSgLeave),
    };
  }
  return cachedDataset;
}

/**
 * In-memory SG HR records. Employees can be created and changed (to simulate
 * edits made directly in SG HR); attendance and leave are read-only. `reset`
 * restores the generated dataset.
 */
export class SgHrStore {
  private employees = new Map<string, SgEmployee>();

  constructor(
    private readonly dataset: () => SgHrDataset = buildSgHrDataset,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.reset();
  }

  reset(): void {
    this.employees = new Map(this.dataset().employees.map((e) => [e.employeeNo, { ...e }]));
  }

  /** Employees sorted by number, optionally only those changed at or after `updatedSince`. */
  listEmployees(updatedSince?: string): SgEmployee[] {
    return [...this.employees.values()]
      .filter((e) => updatedSince === undefined || e.lastModified >= updatedSince)
      .sort((a, b) => a.employeeNo.localeCompare(b.employeeNo));
  }

  getEmployee(employeeNo: string): SgEmployee | undefined {
    return this.employees.get(employeeNo);
  }

  createEmployee(input: Omit<SgEmployee, 'lastModified'>): SgEmployee {
    if (this.employees.has(input.employeeNo)) {
      throw new HttpError(409, 'conflict', `Employee ${input.employeeNo} already exists`);
    }
    const created = { ...input, lastModified: this.now() };
    this.employees.set(created.employeeNo, created);
    return created;
  }

  updateEmployee(
    employeeNo: string,
    patch: Partial<Omit<SgEmployee, 'employeeNo' | 'lastModified'>>,
  ): SgEmployee {
    const existing = this.employees.get(employeeNo);
    if (!existing) {
      throw new HttpError(404, 'not_found', `Employee ${employeeNo} not found`);
    }
    const updated = { ...existing, ...patch, lastModified: this.now() };
    this.employees.set(employeeNo, updated);
    return updated;
  }

  attendanceBetween(from: string, to: string): SgAttendance[] {
    return this.dataset().attendance.filter((a) => a.date >= from && a.date <= to);
  }

  /** Leave that overlaps the range at all, not only leave that starts inside it. */
  leaveBetween(from: string, to: string): SgLeave[] {
    return this.dataset().leave.filter((l) => l.startDate <= to && l.endDate >= from);
  }

  private now(): string {
    return this.clock()
      .toISOString()
      .replace(/\.\d{3}Z$/, 'Z');
  }
}
