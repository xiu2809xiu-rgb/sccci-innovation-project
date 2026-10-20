import {
  DEPARTMENTS,
  departmentByCode,
  employeeAsSeenBy,
  type CrossSystemDrift,
  type SyntheticAttendance,
  type SyntheticEmployee,
  type SyntheticLeave,
  type WorkLocationCode,
} from '@huitong/synthetic-data';

import {
  CN_LEAVE_TYPES,
  type CnAttendance,
  type CnEmployee,
  type CnLeave,
  type CnOrgUnit,
} from '../schemas/cn-records.js';

const EMPLOYMENT_TYPES: Record<SyntheticEmployee['employmentType'], CnEmployee['用工类型']> = {
  FULL_TIME: '01',
  CONTRACT: '02',
  INTERN: '03',
  PART_TIME: '04',
};

const ATTENDANCE_STATUSES: Record<SyntheticAttendance['status'], CnAttendance['考勤状态']> = {
  PRESENT: '正常',
  LATE: '迟到',
  EARLY_LEAVE: '早退',
  ABSENT: '缺勤',
  ON_LEAVE: '请假',
  REMOTE: '外勤',
  PUBLIC_HOLIDAY: '节假日',
};

const LEAVE_STATUSES: Record<SyntheticLeave['status'], CnLeave['审批状态']> = {
  APPROVED: '已批准',
  PENDING: '审批中',
  CANCELLED: '已撤销',
};

/** HQ records Singapore banks under their Chinese names. */
const BANK_NAMES_ZH: Readonly<Record<string, string>> = {
  'DBS Bank': '星展银行',
  'OCBC Bank': '华侨银行',
  UOB: '大华银行',
};

const LOCATIONS_ZH: Record<WorkLocationCode, CnEmployee['工作地点']> = {
  'SG-SIN': '新加坡',
  'CN-SHA': '上海',
  'CN-PEK': '北京',
  'CN-SZX': '深圳',
};

const ROOT_ORG_UNIT = departmentByCode('EXEC').sapOrgUnit;

/** `2026-07-01` -> `2026/07/01`. */
export function slashDate(iso: string): string {
  return iso.replaceAll('-', '/');
}

/**
 * Renders ground truth into HQ's schema, applying the drift entries that
 * belong to CN HQ. Stale records carry an older modification time.
 */
export function renderCnEmployee(
  truth: SyntheticEmployee,
  drift: readonly CrossSystemDrift[],
): CnEmployee {
  const employee = employeeAsSeenBy(truth, drift, 'cn-hq');
  const department = departmentByCode(employee.departmentCode);
  const stale = drift.some((d) => d.employeeNo === truth.employeeNo && d.system === 'cn-hq');
  const changed = employee.hireDate > '2026-01-05' ? employee.hireDate : '2026-01-05';
  return {
    员工编号: employee.employeeNo,
    姓名: employee.nameZh ?? `${employee.familyName} ${employee.givenName}`,
    英文名: `${employee.familyName.toUpperCase()} ${employee.givenName}`,
    法人公司: employee.entityCode,
    组织单位: department.sapOrgUnit,
    部门名称: department.nameZh,
    职位: employee.jobTitleZh,
    英文职位: employee.jobTitleEn,
    职级: employee.jobGrade,
    用工类型: EMPLOYMENT_TYPES[employee.employmentType],
    雇佣状态: employee.employmentStatus === 'TERMINATED' ? '0' : '3',
    试用期: employee.employmentStatus === 'PROBATION' ? '是' : '否',
    休假中: employee.employmentStatus === 'ON_LEAVE' ? '是' : '否',
    入职日期: slashDate(employee.hireDate),
    离职日期: employee.terminationDate ? slashDate(employee.terminationDate) : '',
    出生日期: slashDate(employee.dateOfBirth),
    手机号码: employee.workPhone,
    电子邮箱: employee.workEmail,
    工作地点: LOCATIONS_ZH[employee.workLocation],
    成本中心: employee.costCenter,
    直属上级: employee.managerEmployeeNo ?? '',
    基本工资: employee.baseSalary.amount.toFixed(2),
    币种: employee.baseSalary.currency,
    开户银行: BANK_NAMES_ZH[employee.bankName] ?? employee.bankName,
    银行账号: employee.bankAccountNumber,
    最后修改时间: stale ? '2026/06/30 17:20:00' : `${slashDate(changed)} 09:00:00`,
  };
}

/** SAP-like organisational units: the executive office is the root of every other unit. */
export function renderOrgUnits(): CnOrgUnit[] {
  return DEPARTMENTS.map((department) => ({
    组织单位: department.sapOrgUnit,
    名称: department.nameZh,
    英文名称: department.nameEn,
    上级组织: department.sapOrgUnit === ROOT_ORG_UNIT ? '' : ROOT_ORG_UNIT,
  }));
}

export function renderCnAttendance(record: SyntheticAttendance): CnAttendance {
  return {
    员工编号: record.employeeNo,
    日期: slashDate(record.date),
    上班打卡: record.clockIn ?? '',
    下班打卡: record.clockOut ?? '',
    考勤状态: ATTENDANCE_STATUSES[record.status],
    加班时长: (record.overtimeMinutes / 60).toFixed(1),
  };
}

export function renderCnLeave(record: SyntheticLeave): CnLeave {
  const type = CN_LEAVE_TYPES.find((t) => t.代码 === record.sourceCode);
  if (!type) {
    throw new Error(`Leave ${record.leaveId} is not a CN HQ category`);
  }
  return {
    请假单号: record.leaveId,
    员工编号: record.employeeNo,
    假期类型: type.名称,
    假期代码: type.代码,
    开始日期: slashDate(record.startDate),
    结束日期: slashDate(record.endDate),
    天数: record.days.toFixed(1),
    半天: record.halfDay === 'AM' ? '上午' : record.halfDay === 'PM' ? '下午' : '',
    审批状态: LEAVE_STATUSES[record.status],
  };
}
