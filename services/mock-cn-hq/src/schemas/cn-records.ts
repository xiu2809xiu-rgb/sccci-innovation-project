import { z } from 'zod';

/** `YYYY/MM/DD`, the date format China HQ's system stores. */
const slashDate = z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/);
const slashDateOrEmpty = z.union([slashDate, z.literal('')]);
const yesNo = z.enum(['是', '否']);

/**
 * An employee as China HQ's SAP-like system returns it: Chinese keys, every
 * value a string, `YYYY/MM/DD` dates and SAP codes. An empty string means no value.
 */
export const cnEmployeeSchema = z.strictObject({
  员工编号: z.string().regex(/^E\d{6}$/),
  姓名: z.string().min(1),
  英文名: z.string().min(1),
  法人公司: z.enum(['SG01', 'CN01']),
  组织单位: z.string().regex(/^\d{8}$/),
  部门名称: z.string().min(1),
  职位: z.string().min(1),
  英文职位: z.string().min(1),
  职级: z.string().regex(/^[PM]\d$/),
  /** 01 permanent, 02 contract, 03 intern, 04 part-time. */
  用工类型: z.enum(['01', '02', '03', '04']),
  /** SAP STAT2: 3 active (including probation and leave), 0 withdrawn. */
  雇佣状态: z.enum(['3', '0']),
  试用期: yesNo,
  休假中: yesNo,
  入职日期: slashDate,
  离职日期: slashDateOrEmpty,
  出生日期: slashDate,
  手机号码: z.string().regex(/^\+\d{10,13}$/),
  电子邮箱: z.email(),
  工作地点: z.enum(['新加坡', '上海', '北京', '深圳']),
  成本中心: z.string().regex(/^\d{4}$/),
  直属上级: z.union([z.string().regex(/^E\d{6}$/), z.literal('')]),
  基本工资: z.string().regex(/^\d+\.\d{2}$/),
  币种: z.enum(['SGD', 'CNY']),
  开户银行: z.string().min(1),
  银行账号: z.string().regex(/^\d+$/),
  最后修改时间: z.string().regex(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/),
});

export type CnEmployee = z.infer<typeof cnEmployeeSchema>;

/** Body of the admin update endpoint: any subset except the employee number. */
export const cnEmployeePatchSchema = cnEmployeeSchema
  .omit({ 员工编号: true, 最后修改时间: true })
  .partial();

export const cnOrgUnitSchema = z.strictObject({
  组织单位: z.string().regex(/^\d{8}$/),
  名称: z.string(),
  英文名称: z.string(),
  上级组织: z.union([z.string().regex(/^\d{8}$/), z.literal('')]),
});

export type CnOrgUnit = z.infer<typeof cnOrgUnitSchema>;

export const cnAttendanceSchema = z.strictObject({
  员工编号: z.string(),
  日期: slashDate,
  上班打卡: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal('')]),
  下班打卡: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal('')]),
  考勤状态: z.enum(['正常', '迟到', '早退', '缺勤', '请假', '外勤', '节假日']),
  加班时长: z.string().regex(/^\d+\.\d$/),
});

export type CnAttendance = z.infer<typeof cnAttendanceSchema>;

export const cnLeaveSchema = z.strictObject({
  请假单号: z.string().regex(/^QJ\d{10}$/),
  员工编号: z.string(),
  假期类型: z.string(),
  假期代码: z.string(),
  开始日期: slashDate,
  结束日期: slashDate,
  天数: z.string().regex(/^\d+\.\d$/),
  半天: z.enum(['上午', '下午', '']),
  审批状态: z.enum(['已批准', '审批中', '已撤销']),
});

export type CnLeave = z.infer<typeof cnLeaveSchema>;

export const CN_LEAVE_TYPES = [
  { 代码: 'NJ', 名称: '年假' },
  { 代码: 'BJ', 名称: '病假' },
  { 代码: 'SJ', 名称: '事假' },
  { 代码: 'TX', 名称: '调休' },
  { 代码: 'HJ', 名称: '婚假' },
  { 代码: 'CJ', 名称: '产假' },
  { 代码: 'PCJ', 名称: '陪产假' },
  { 代码: 'SANG', 名称: '丧假' },
  { 代码: 'YEJ', 名称: '育儿假' },
  { 代码: 'TQJ', 名称: '探亲假' },
] as const;
