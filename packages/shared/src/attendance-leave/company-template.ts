import type { LeaveCategory } from './leave-category.js';
import type { ReportTemplate, ReportTemplateColumn } from './report-template.js';

/**
 * The leave columns of the company template, keyed by canonical category.
 * Home leave has none, so consolidation reports it as an exception (A-09).
 */
export const TEMPLATE_LEAVE_COLUMNS: readonly (ReportTemplateColumn & { key: LeaveCategory })[] = [
  { key: 'ANNUAL', label: 'Annual leave (days)', labelZh: '年假（天）' },
  { key: 'SICK', label: 'Sick leave (days)', labelZh: '病假（天）' },
  { key: 'HOSPITALISATION', label: 'Hospitalisation leave (days)', labelZh: '住院假（天）' },
  { key: 'CHILDCARE', label: 'Childcare leave (days)', labelZh: '育儿假（天）' },
  { key: 'MATERNITY', label: 'Maternity leave (days)', labelZh: '产假（天）' },
  { key: 'PATERNITY', label: 'Paternity leave (days)', labelZh: '陪产假（天）' },
  { key: 'COMPASSIONATE', label: 'Compassionate leave (days)', labelZh: '丧假（天）' },
  { key: 'MARRIAGE', label: 'Marriage leave (days)', labelZh: '婚假（天）' },
  { key: 'TIME_OFF_IN_LIEU', label: 'Time-off in lieu (days)', labelZh: '调休（天）' },
  { key: 'UNPAID', label: 'Unpaid leave (days)', labelZh: '无薪假（天）' },
  { key: 'OTHER', label: 'Other leave (days)', labelZh: '其他假期（天）' },
];

/**
 * The company's monthly attendance and leave template, seeded into the
 * database. Its structure is assumed until the client shares theirs (A-09).
 */
export const COMPANY_MONTHLY_TEMPLATE: ReportTemplate = {
  key: 'company-monthly-attendance-leave',
  version: 1,
  name: 'Monthly attendance and leave',
  nameZh: '月度考勤与休假报表',
  columns: [
    { key: 'employeeNo', label: 'Employee No.', labelZh: '员工编号' },
    { key: 'name', label: 'Name', labelZh: '姓名' },
    { key: 'entity', label: 'Entity', labelZh: '法人实体' },
    { key: 'department', label: 'Department', labelZh: '部门' },
    { key: 'workingDays', label: 'Working days', labelZh: '应出勤天数' },
    { key: 'daysPresent', label: 'Days present', labelZh: '实际出勤天数' },
    { key: 'lateCount', label: 'Late arrivals', labelZh: '迟到次数' },
    { key: 'absentDays', label: 'Absent days', labelZh: '缺勤天数' },
    { key: 'overtimeHours', label: 'Overtime hours', labelZh: '加班时长' },
    ...TEMPLATE_LEAVE_COLUMNS,
  ],
};
