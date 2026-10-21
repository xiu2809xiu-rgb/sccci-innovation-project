import type { WorkflowDefinitionView } from './workflow-definition.js';

/**
 * The manpower-request-to-onboarding definition, seeded into the database.
 * Area 2's state machine runs it; SLA hours drive reminders and escalations.
 */
export const MANPOWER_TO_ONBOARDING: WorkflowDefinitionView = {
  key: 'manpower-to-onboarding',
  version: 1,
  name: 'Manpower request to day-1 onboarding',
  nameZh: '人员需求至入职首日',
  steps: [
    {
      key: 'requisition',
      title: 'Open the recruitment requisition',
      titleZh: '创建招聘需求',
      assigneeRole: 'HR_SG',
      slaHours: 24,
    },
    {
      key: 'recruit',
      title: 'Recruit and select a candidate',
      titleZh: '招聘与甄选',
      assigneeRole: 'HIRING_MANAGER',
      slaHours: 720,
    },
    {
      key: 'offer',
      title: 'Record the accepted offer',
      titleZh: '登记录用信息',
      assigneeRole: 'HR_SG',
      slaHours: 48,
    },
    {
      key: 'employee-record',
      title: 'Create the employee record (master and SG HR)',
      titleZh: '创建员工档案（主数据与新加坡人力系统）',
      assigneeRole: 'HR_SG',
      slaHours: 24,
    },
    {
      key: 'laptop',
      title: 'Prepare the laptop and accessories',
      titleZh: '准备笔记本电脑及配件',
      assigneeRole: 'ADMIN_OPS',
      slaHours: 72,
    },
    {
      key: 'desk',
      title: 'Assign a desk and access card',
      titleZh: '安排工位与门禁卡',
      assigneeRole: 'ADMIN_OPS',
      slaHours: 72,
    },
    {
      key: 'accounts',
      title: 'Create system accounts',
      titleZh: '开通系统账号',
      assigneeRole: 'SYSTEM_ADMIN',
      slaHours: 48,
    },
    {
      key: 'welcome',
      title: 'Send the day-1 welcome and notify the team',
      titleZh: '发送入职欢迎并通知团队',
      assigneeRole: 'HR_SG',
      slaHours: 24,
    },
  ],
};
