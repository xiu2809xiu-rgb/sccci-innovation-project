import {
  DATASET_PERIOD,
  generateAttendance,
  generateLeave,
  generateWorkforce,
} from '@huitong/synthetic-data';

import { HttpError } from '../http/errors.js';
import type { CnAttendance, CnEmployee, CnLeave } from '../schemas/cn-records.js';
import { renderCnAttendance, renderCnEmployee, renderCnLeave } from './render.js';

export interface CnHqDataset {
  employees: readonly CnEmployee[];
  attendance: readonly CnAttendance[];
  leave: readonly CnLeave[];
}

let cachedDataset: CnHqDataset | undefined;

/**
 * HQ's view of the synthetic dataset: every employee (CN01 and SG01 overseas
 * staff), but attendance and leave for CN01 only (SG time records live in SG HR).
 */
export function buildCnHqDataset(): CnHqDataset {
  if (!cachedDataset) {
    const workforce = generateWorkforce();
    const leave = generateLeave(workforce);
    const attendance = generateAttendance(workforce, DATASET_PERIOD, leave);
    cachedDataset = {
      employees: workforce.employees.map((e) => renderCnEmployee(e, workforce.drift)),
      attendance: attendance.filter((a) => a.entityCode === 'CN01').map(renderCnAttendance),
      leave: leave.filter((l) => l.entityCode === 'CN01').map(renderCnLeave),
    };
  }
  return cachedDataset;
}

/** `2026/07/01` -> `2026-07-01`, so ISO ranges compare correctly. */
function iso(slashDate: string): string {
  return slashDate.replaceAll('/', '-');
}

/** In-memory HQ records; employees can be changed through the admin endpoint and reset. */
export class CnHqStore {
  private employees = new Map<string, CnEmployee>();

  constructor(
    private readonly dataset: () => CnHqDataset = buildCnHqDataset,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.reset();
  }

  reset(): void {
    this.employees = new Map(this.dataset().employees.map((e) => [e.员工编号, { ...e }]));
  }

  listEmployees(): CnEmployee[] {
    return [...this.employees.values()].sort((a, b) => a.员工编号.localeCompare(b.员工编号));
  }

  getEmployee(employeeNo: string): CnEmployee | undefined {
    return this.employees.get(employeeNo);
  }

  updateEmployee(
    employeeNo: string,
    patch: Partial<Omit<CnEmployee, '员工编号' | '最后修改时间'>>,
  ): CnEmployee {
    const existing = this.employees.get(employeeNo);
    if (!existing) {
      throw new HttpError(404, 'E404', '员工不存在');
    }
    const updated = { ...existing, ...patch, 最后修改时间: this.chinaTime() };
    this.employees.set(employeeNo, updated);
    return updated;
  }

  attendanceBetween(from: string, to: string): CnAttendance[] {
    return this.dataset().attendance.filter((a) => iso(a.日期) >= from && iso(a.日期) <= to);
  }

  /** Leave that overlaps the range at all. */
  leaveBetween(from: string, to: string): CnLeave[] {
    return this.dataset().leave.filter((l) => iso(l.开始日期) <= to && iso(l.结束日期) >= from);
  }

  /** `YYYY/MM/DD HH:mm:ss` in China Standard Time (UTC+8, no daylight saving). */
  private chinaTime(): string {
    const shifted = new Date(this.clock().getTime() + 8 * 3_600_000).toISOString();
    return `${shifted.slice(0, 10).replaceAll('-', '/')} ${shifted.slice(11, 19)}`;
  }
}
